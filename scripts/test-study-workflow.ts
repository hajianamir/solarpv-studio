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
