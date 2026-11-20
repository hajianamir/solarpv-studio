import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { StudyRequestSchema } from "../src/studies/studyContract";
import {
  parseWeatherCsv,
  WEATHER_COLUMNS,
  weatherReview,
  validateResult,
  validateSnapshot,
  comparisonReason,
  studyReport,
  stable,
} from "../src/studies/studyWorkflow";
const request = JSON.parse(
  readFileSync("services/pvlib_study/tests/synthetic-study.json", "utf8"),
);
const header = WEATHER_COLUMNS.join(",");
const rows = request.weather.records
  .map((r: Record<string, unknown>) =>
    WEATHER_COLUMNS.map((k) => `"${r[k]}"`).join(","),
  )
  .join("\r\n");
assert.deepEqual(
  parseWeatherCsv(`\uFEFF${header}\r\n${rows}\r\n`),
  request.weather.records,
);
assert.equal(weatherReview(request)[0].min, 600);
for (const csv of [
  header,
  `${header}\n${rows.replace('"600"', '""')}`,
  `${header}\n${rows.replace('"600"', '"NaN"')}`,
  `${header}\n${rows.replace('"600"', '"0x12"')}`,
  `${header}\n\n${rows}`,
  `${header}\n${rows.replace('"600"', '"600"extra')}`,
  `${header}\n${rows}\n\n`,
])
  assert.throws(() => parseWeatherCsv(csv));
assert.throws(() => parseWeatherCsv("x".repeat(8 * 1024 * 1024 + 1)), /8 MiB/);
for (const mutate of [
  (r: typeof request) => {
    r.weather.records[0].timestamp = "2017-04-01T17:00:00";
  },
  (r: typeof request) => {
    r.weather.records[1].timestamp = r.weather.records[0].timestamp;
  },
  (r: typeof request) => {
    r.weather.records[0].tempAirC = null;
  },
]) {
  const r = structuredClone(request);
  mutate(r);
  assert.equal(StudyRequestSchema.safeParse(r).success, false);
}
const run = spawnSync(
  process.env.PVLIB_PYTHON ?? "python",
  ["-I", "-B", "services/pvlib_study/worker.py"],
  {
    input: JSON.stringify(request),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  },
);
assert.equal(run.status, 0, run.stderr);
const result = validateResult(JSON.parse(run.stdout));
const snapshot = {
  version: 1,
  id: "test",
  savedAt: new Date().toISOString(),
  request,
  result,
};
assert.deepEqual(validateSnapshot(snapshot), snapshot);
const mismatch = structuredClone(snapshot);
mismatch.request.label = "changed";
assert.throws(() => validateSnapshot(mismatch), /does not match/);
const bad = structuredClone(result);
bad.summary.acWh = Infinity;
assert.throws(() => validateResult(bad));
const truncated = structuredClone(result);
truncated.samples.pop();
assert.throws(() => validateResult(truncated), /mismatch/);
const other = structuredClone(result);
other.request.label = "other";
other.request.system.arrayPdc0W = 11000;
assert.equal(comparisonReason(result, other), null);
other.request.weather.records[0].ghiWm2++;
assert.match(comparisonReason(result, other)!, /weather/);
assert.throws(() => studyReport(result, other), /weather/);
other.request = structuredClone(result.request);
other.manifest.workerSha256 = "a".repeat(64);
assert.match(comparisonReason(result, other)!, /engine/);
const unsafe = structuredClone(result);
unsafe.request.label = "<script>alert(1)</script>";
const report = studyReport(unsafe);
assert.ok(!report.includes("<script>"));
assert.ok(report.includes("&lt;script&gt;"));
assert.ok(report.includes(result.manifest.inputSha256));
assert.equal(stable({ b: 2, a: 1 }), stable({ a: 1, b: 2 }));
console.log(
  "Study workflow PASS: strict CSV/missing/size, timestamp contract, actual Python result/archive binding, comparison guards and report escaping.",
);

assert.equal(validateSnapshot({...snapshot,result:null}).result,null);

// Tracker is a scenario input, not a reason to relax any other model/version check.
const tracked=structuredClone(request);
tracked.system.tracking={axisTiltDeg:0,axisAzimuthDeg:180,maxAngleDeg:60,backtrack:true,gcr:.4,crossAxisTiltDeg:0};
assert.equal(StudyRequestSchema.safeParse(tracked).success,true);
for(const patch of [{gcr:0},{axisTiltDeg:-1},{maxAngleDeg:91},{crossAxisTiltDeg:31},{backtrack:1},{unexpected:1}]){
  const bad=structuredClone(tracked);Object.assign(bad.system.tracking,patch);assert.equal(StudyRequestSchema.safeParse(bad).success,false);
}
for(const key of Object.keys(tracked.system.tracking)){
  const bad=structuredClone(tracked);delete bad.system.tracking[key];assert.equal(StudyRequestSchema.safeParse(bad).success,false);
}
const trackingRun=spawnSync(process.env.PVLIB_PYTHON??'python',['-I','-B','services/pvlib_study/worker.py'],{input:JSON.stringify(tracked),encoding:'utf8',maxBuffer:16*1024*1024});
assert.equal(trackingRun.status,0,trackingRun.stderr);
const trackingResult=validateResult(JSON.parse(trackingRun.stdout));
assert.equal(comparisonReason(result,trackingResult),null);
assert.ok(trackingResult.samples.some(row=>Number(row.trackerThetaDeg)!==0));
assert.ok(studyReport(result,trackingResult).includes('single-axis tracker'));
assert.deepEqual(validateSnapshot({...snapshot,request:tracked,result:trackingResult}).request,tracked);
const missingGeometry=structuredClone(trackingResult);delete missingGeometry.samples[0].trackerThetaDeg;
assert.throws(()=>validateResult(missingGeometry),/geometry/);
const wrongModel=structuredClone(trackingResult);wrongModel.manifest.models.transposition='different';
assert.match(comparisonReason(result,wrongModel)!,/engine/);
console.log('Tracker workflow PASS: explicit strict contract, actual Python geometry, fixed/tracker comparison whitelist, archives and report.');

const rowScenario=structuredClone(tracked);
rowScenario.system.rowIrradiance={gcr:.4,heightM:2,pitchM:5,bifaciality:.7,rearShadeLossPct:2,rearTransmissionLossPct:0,rearIamB:.05,temperatureIrradiance:'front_plus_rear'};
assert.equal(StudyRequestSchema.safeParse(rowScenario).success,true);
for(const patch of [{gcr:0},{heightM:.1},{heightM:100},{bifaciality:2},{rearShadeLossPct:-1},{rearTransmissionLossPct:101},{temperatureIrradiance:'auto'},{extra:1}]){
  const bad=structuredClone(rowScenario);Object.assign(bad.system.rowIrradiance,patch);assert.equal(StudyRequestSchema.safeParse(bad).success,false);
}
for(const key of Object.keys(rowScenario.system.rowIrradiance)){
  const bad=structuredClone(rowScenario);delete bad.system.rowIrradiance[key];assert.equal(StudyRequestSchema.safeParse(bad).success,false);
}
for(const patch of [{axisTiltDeg:1},{crossAxisTiltDeg:1},{gcr:.5}]){
  const bad=structuredClone(rowScenario);Object.assign(bad.system.tracking,patch);assert.equal(StudyRequestSchema.safeParse(bad).success,false);
}
const rowRun=spawnSync(process.env.PVLIB_PYTHON??'python',['-I','-B','services/pvlib_study/worker.py'],{input:JSON.stringify(rowScenario),encoding:'utf8',maxBuffer:16*1024*1024});
assert.equal(rowRun.status,0,rowRun.stderr);
const rowResult=validateResult(JSON.parse(rowRun.stdout));
assert.equal(comparisonReason(result,rowResult),null);
assert.ok(rowResult.summary.rearIncidentWhm2!>0);assert.ok(rowResult.summary.rearEffectiveWhm2!>0);
assert.ok(studyReport(result,rowResult).includes('infinite sheds'));
assert.deepEqual(validateSnapshot({...snapshot,request:rowScenario,result:rowResult}).result,rowResult);
const absentRear=structuredClone(rowResult);delete absentRear.samples[0].rearIncidentWm2;assert.throws(()=>validateResult(absentRear),/components/);
const differentElectrical=structuredClone(rowResult);differentElectrical.manifest.models.dc='different';assert.match(comparisonReason(result,differentElectrical)!,/engine/);
console.log('Row workflow PASS: shared strict geometry/thermal contract, actual Python row result, archive metrics and scenario-comparison whitelist.');

const detailed=structuredClone(rowScenario);detailed.system.arrayPdc0W=8800;
detailed.system.electrical=JSON.parse(readFileSync('services/pvlib_study/tests/desoto-reference-parameters.json','utf8'));
assert.equal(StudyRequestSchema.safeParse(detailed).success,true);
for(const patch of [{modulesPerString:1.5},{stringsInParallel:true},{iORefA:0},{mpptMaxV:100},{mpptMaxV:2000},{dEgdTPerK:.001},{extra:1}]){
 const bad=structuredClone(detailed);Object.assign(bad.system.electrical,patch);assert.equal(StudyRequestSchema.safeParse(bad).success,false);
}
for(const key of Object.keys(detailed.system.electrical)){const bad=structuredClone(detailed);delete bad.system.electrical[key];assert.equal(StudyRequestSchema.safeParse(bad).success,false);}
const detailedRun=spawnSync(process.env.PVLIB_PYTHON??'python',['-I','-B','services/pvlib_study/worker.py'],{input:JSON.stringify(detailed),encoding:'utf8',maxBuffer:16*1024*1024});
assert.equal(detailedRun.status,0,detailedRun.stderr);
const detailedResult=validateResult(JSON.parse(detailedRun.stdout));assert.ok(detailedResult.summary.availableMppWh!>0);
assert.match(comparisonReason(result,detailedResult)!,/engine/,'different DC model must not be automatically comparable');
assert.equal(comparisonReason(detailedResult,structuredClone(detailedResult)),null);
assert.deepEqual(validateSnapshot({...snapshot,request:detailed,result:detailedResult}).result,detailedResult);
const missingPoint=structuredClone(detailedResult);delete missingPoint.samples[0].operatingCurrentA;assert.throws(()=>validateResult(missingPoint),/electrical/);
assert.ok(studyReport(detailedResult).includes('De Soto single diode'));
console.log('Detailed electrical workflow PASS: strict module/string/MPPT contract, actual Python, result/archive validation, DC-model comparison barrier and report.');

const thermalExport=structuredClone(detailed);
thermalExport.system.faiman={u0:30,u1:5,windHeightM:10};thermalExport.system.acExportLimitW=100;
assert.equal(StudyRequestSchema.safeParse(thermalExport).success,true);
for(const f of [{u0:0,u1:5,windHeightM:10},{u0:30,u1:-1,windHeightM:10},{u0:30,u1:5,windHeightM:2},{u0:30,u1:5,windHeightM:10,extra:1}]){
 const bad=structuredClone(thermalExport);bad.system.faiman=f as typeof bad.system.faiman;assert.equal(StudyRequestSchema.safeParse(bad).success,false);
}
for(const cap of [-1,true,NaN]){const bad=structuredClone(thermalExport);bad.system.acExportLimitW=cap as number;assert.equal(StudyRequestSchema.safeParse(bad).success,false);}
const thermalRun=spawnSync(process.env.PVLIB_PYTHON??'python',['-I','-B','services/pvlib_study/worker.py'],{input:JSON.stringify(thermalExport),encoding:'utf8',maxBuffer:16*1024*1024});
assert.equal(thermalRun.status,0,thermalRun.stderr);
const thermalResult=validateResult(JSON.parse(thermalRun.stdout));
assert.ok(thermalResult.summary.acExportLimitLossWh!>0);
assert.deepEqual(validateSnapshot({...snapshot,request:thermalExport,result:thermalResult}).result,thermalResult);
assert.match(comparisonReason(detailedResult,thermalResult)!,/engine/);
assert.equal(comparisonReason(thermalResult,structuredClone(thermalResult)),null);
assert.ok(studyReport(thermalResult).includes('AC export cap: 100 W'));
assert.ok(studyReport(thermalResult).includes('faiman;'));
for(const key of ['acBeforeExportLimitW','acExportLimitLossW']){const bad=structuredClone(thermalResult);delete bad.samples[0][key];assert.throws(()=>validateResult(bad),/export cap/);}
const badEnergy=structuredClone(thermalResult);badEnergy.summary.acExportLimitLossWh=1e12;assert.throws(()=>validateResult(badEnergy),/export cap/);
const badModel=structuredClone(thermalResult);badModel.manifest.models.temperature='sapm_cell';assert.throws(()=>validateResult(badModel),/Faiman/);
console.log('Faiman + AC export workflow PASS: strict inputs, real Python, archive, model comparison barrier, report and rejected corrupted accounting.');
