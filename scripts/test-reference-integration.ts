import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {evaluateAnnualReferenceLosses,combineEnvironmentalLossPct,type AnnualReferenceInput} from '../src/engine/reference/annualReferenceLosses';
import {buildWaterfallArgs,computeConfiguredWaterfall,withReferenceLossMetadata} from '../src/engine/waterfallArgs';
import {computeWaterfallLosses} from '../src/engine/waterfallLossEngine';
import {computeCanonicalAnnualYield} from '../src/engine/core/annualYieldEngine';
import {ClimateCitySchema} from '../src/engine/core/projectMigration';
import {getDefaultClimateCity} from '../src/engine/climaticData';
import {checkAnnualReferenceInput} from '../src/referenceModels/annualReferenceInput';
const records=JSON.parse(fs.readFileSync('scripts/physics-reference-evidence.json','utf8')).fixtures.filter((r:{fixtureFile:string})=>r.fixtureFile.includes('annual-reference-'));
const functions:Record<string,(...args:any[])=>unknown>={evaluateAnnualReferenceLosses,combineEnvironmentalLossPct,buildWaterfallArgs,computeConfiguredWaterfall,withReferenceLossMetadata};
function close(a:unknown,b:unknown){if(typeof b==='number'){assert.ok(typeof a==='number'&&Math.abs(a-b)<1e-7,`${a} vs ${b}`);}else if(Array.isArray(b)){assert.ok(Array.isArray(a));assert.equal(a.length,b.length);b.forEach((v,i)=>close(a[i],v));}else if(b&&typeof b==='object'){assert.ok(a&&typeof a==='object');assert.deepEqual(Object.keys(a).sort(),Object.keys(b).sort());for(const [k,v] of Object.entries(b))close((a as Record<string,unknown>)[k],v);}else assert.equal(a,b);}
let request:AnnualReferenceInput|undefined,snowOnly:AnnualReferenceInput|undefined,both:AnnualReferenceInput|undefined;
for(const record of records){const f=JSON.parse(fs.readFileSync(record.fixtureFile,'utf8'));close(functions[f.productionExport](...f.inputs),f.expected);if(f.productionExport==='evaluateAnnualReferenceLosses'){const r=f.inputs[0];if(r.soiling&&!r.snow)request??=r;if(r.snow&&!r.soiling)snowOnly??=r;if(r.snow&&r.soiling)both??=r;}}
assert.ok(request&&snowOnly);
// Build a joint case even if sensitivity selection needed only single-model cases.
both??={...structuredClone(snowOnly),soiling:{...structuredClone(request.soiling!),steps:snowOnly.energy.map(e=>({timestamp:e.timestamp,rainfallMm:0}))}};
const input={installedCapacityKwp:100,peakSunHours:5,soilingLossPct:12,snowLossPct:9,annualThermalDerateOverridePct:0,annualReferenceLosses:request,referenceSite:request.site};
const reference=evaluateAnnualReferenceLosses(request);assert.equal(reference.status,'computed');
// Energy validation must reject ambiguous timestamps itself, before weather alignment/model checks.
// This block is also run under UTC, America/New_York and Asia/Tehran in review verification.
for (const timestamp of [
  request.energy[0].timestamp.replace(/Z$/, ''), // local datetime: must never depend on process TZ
  '2023-01-02', '2023-01-02 00:00:00Z',
  '2023-02-29T00:00:00Z', '2023-02-30T00:00:00Z',
  '2023-01-01T24:00:00Z', '2023-01-02T00:60:00Z', '2023-01-02T00:00:60Z',
  '2023-01-02T00:00:00+24:00', '2023-01-02T00:00:00+03:60',
]) {
  const invalid = structuredClone(request);
  invalid.energy[0].timestamp = timestamp;
  const checked = checkAnnualReferenceInput(invalid);
  assert.equal(checked.ok, false);
  if (!checked.ok) assert.match(checked.reason, /energy timestamp.*explicit Z or UTC offset/);
}
const naive = structuredClone(request);
naive.energy.forEach(e => { e.timestamp = e.timestamp.replace(/Z$/, ''); });
naive.soiling!.steps.forEach(s => { s.timestamp = s.timestamp.replace(/Z$/, ''); });
assert.equal(evaluateAnnualReferenceLosses(naive).status, 'missing_or_unsupported');
const naiveReport = computeConfiguredWaterfall({...input, annualReferenceLosses: naive});
assert.equal(naiveReport.annualReference?.status, 'missing_or_unsupported');
assert.equal(naiveReport.finalEnergyKwh, computeConfiguredWaterfall({...input, annualReferenceLosses: undefined}).finalEnergyKwh);

// Written local dates can cross UTC-year boundaries; only the converted instants set the period.
for (const offsetMinutes of [0, 210, -300]) {
  const shifted: AnnualReferenceInput = structuredClone(request);
  const offset = offsetMinutes < 0 ? '-05:00' : offsetMinutes > 0 ? '+03:30' : '+00:00';
  const convert = (timestamp: string) => new Date(Date.parse(timestamp) + offsetMinutes * 60000).toISOString().replace(/Z$/, offset);
  shifted.energy.forEach(e => { e.timestamp = convert(e.timestamp); });
  shifted.soiling!.steps.forEach(s => { s.timestamp = convert(s.timestamp); });
  shifted.soiling!.manualWashTimestamps = shifted.soiling!.manualWashTimestamps.map(convert);
  assert.equal(checkAnnualReferenceInput(shifted).ok, true);
  const result = evaluateAnnualReferenceLosses(shifted);
  assert.equal(result.status, 'computed');
  close(result, reference); // same numerical output AND UTC period metadata as the Z series
}
// The documented exact-string cross-series contract remains conservative, even for equal instants.
const differentNotation = structuredClone(request);
differentNotation.energy[0].timestamp = differentNotation.energy[0].timestamp.replace(/Z$/, '+00:00');
const mismatch = checkAnnualReferenceInput(differentNotation);
assert.equal(mismatch.ok, false);
if (!mismatch.ok) assert.match(mismatch.reason, /timestamps must match exactly/);
console.log(`Explicit energy offset / UTC normalization / fallback PASS (process TZ=${process.env.TZ ?? 'default'}).`);
const report=computeConfiguredWaterfall(input);const soil=report.stages.find(s=>s.id==='soiling')!,snow=report.stages.find(s=>s.id==='snow')!;
assert.equal(soil.percentageLossRaw,-reference.soilingLossPct!);assert.equal(snow.percentageLossRaw,-9);assert.equal(report.stages.filter(s=>s.id==='soiling').length,1);assert.equal(report.stages.filter(s=>s.id==='snow').length,1);
assert.match(soil.descriptionEn,/not field validated/);assert.match(soil.nameEn,/pvlib/);assert.ok(report.annualReference?.metadata?.soiling);
// Final energy exactly matches a legacy waterfall given ONLY the resolved percentages (no extra multiplication).
const tuple=buildWaterfallArgs({...input,annualReferenceLosses:undefined,soilingLossPct:reference.soilingLossPct!});
assert.equal(report.finalEnergyKwh,computeWaterfallLosses(...tuple).finalEnergyKwh);
const base=computeConfiguredWaterfall({...input,annualReferenceLosses:undefined});
for(const mutate of [
 (r:AnnualReferenceInput)=>{r.energy.pop();},(r:AnnualReferenceInput)=>{r.energy[0].cleanDcEnergyWh=null;},
 (r:AnnualReferenceInput)=>{r.energy[0].cleanDcEnergyWh=-1;},(r:AnnualReferenceInput)=>{r.energy.forEach(e=>e.cleanDcEnergyWh=0);},
 (r:AnnualReferenceInput)=>{r.soiling!.steps[0].rainfallMm=null;},(r:AnnualReferenceInput)=>{r.energySource='';},
 (r:AnnualReferenceInput)=>{r.site.latitude++;},(r:AnnualReferenceInput)=>{r.energy.reverse();},
 (r:AnnualReferenceInput)=>{r.year=2024;},(r:AnnualReferenceInput)=>{r.soiling!.steps[0].timestamp='2023-01-01T00:00:00Z';},
]){const r=structuredClone(request);mutate(r);const result=computeConfiguredWaterfall({...input,annualReferenceLosses:r});assert.equal(result.annualReference?.status,'missing_or_unsupported');assert.equal(result.finalEnergyKwh,base.finalEnergyKwh);assert.match(result.stages.find(s=>s.id==='soiling')!.descriptionEn,/Reference not applied/);}
const leap=structuredClone(request);leap.year=2024;leap.energy=Array.from({length:366},(_,i)=>({timestamp:new Date(Date.UTC(2024,0,i+2)).toISOString(),cleanDcEnergyWh:100}));leap.soiling!.steps=leap.energy.map(e=>({timestamp:e.timestamp,rainfallMm:0}));leap.soiling!.manualWashTimestamps=[];assert.equal(evaluateAnnualReferenceLosses(leap).status,'computed');leap.energy.pop();assert.equal(evaluateAnnualReferenceLosses(leap).status,'missing_or_unsupported');
const joint=evaluateAnnualReferenceLosses(both);assert.equal(joint.status,'computed');close(combineEnvironmentalLossPct(joint.soilingLossPct!,joint.snowLossPct!),joint.combinedLossPct);
// Atomic missing, roof/tilt mismatch, unselected screening, and no-data fallback.
const badJoint=structuredClone(both);badJoint.snow!.steps[1].poaWm2=null;assert.equal(evaluateAnnualReferenceLosses(badJoint).status,'missing_or_unsupported');
assert.equal(evaluateAnnualReferenceLosses(snowOnly,snowOnly.site,{installationEnvironment:'ground_mount'}).status,'missing_or_unsupported');
assert.equal(evaluateAnnualReferenceLosses(snowOnly,snowOnly.site,{hasTracker:true}).status,'missing_or_unsupported');
const totalSoil=structuredClone(both);Object.assign(totalSoil.soiling!.parameters,{initialLossFraction:1,maxLossFraction:1,lossRatePerDay:0});totalSoil.soiling!.steps.forEach(s=>s.rainfallMm=0);totalSoil.soiling!.manualWashTimestamps=[];assert.equal(evaluateAnnualReferenceLosses(totalSoil).status,'missing_or_unsupported');
assert.equal(evaluateAnnualReferenceLosses(snowOnly,snowOnly.site,{tiltDeg:91}).status,'missing_or_unsupported');
assert.equal(evaluateAnnualReferenceLosses(snowOnly,snowOnly.site,{tiltDeg:snowOnly.snow!.parameters.tiltDeg,installationEnvironment:'industrial_shed'}).status,'computed');
const snowReport = computeConfiguredWaterfall({...input, annualReferenceLosses:snowOnly, referenceSite:snowOnly.site, installationEnvironment:'industrial_shed', tiltDeg:snowOnly.snow!.parameters.tiltDeg});
assert.equal(snowReport.annualReference?.status, 'computed');
assert.match(snowReport.stages.find(s=>s.id==='snow')!.descriptionEn, /String-configuration-dependent.*partly covered.*not linked to or verified against the actual array layout/);
assert.match(snowReport.stages.find(s=>s.id==='snow')!.descriptionFa, /layout واقعی آرایه متصل یا با آن تطبیق داده نشده/);
const canonical=computeCanonicalAnnualYield({installedCapacityKwp:100,peakSunHours:5,ambientTempMaxC:35,annualReferenceLosses:request,referenceSite:request.site});assert.equal(canonical.waterfallReport.annualReference?.status,'computed');assert.equal(canonical.waterfallReport.stages.find(s=>s.id==='soiling')?.percentageLossRaw,-reference.soilingLossPct!);
// Pure metadata attachment must not mutate the caller's report.
const untouched={...base,stages:base.stages.map(s=>({...s}))};withReferenceLossMetadata(base,input);assert.deepEqual(base,untouched);
// Restorable project payload keeps exact raw inputs; serialized report retains metadata but no weather arrays.
const restored=ClimateCitySchema.parse({...getDefaultClimateCity(),annualReferenceLosses:request});assert.deepEqual(restored.annualReferenceLosses,request);
const roundtrip=JSON.parse(JSON.stringify(report));assert.equal(roundtrip.annualReference.metadata.soiling.modelId,'soiling_kimber_pvlib_0131');assert.equal(roundtrip.annualReference.metadata.coverage,'complete_utc_calendar_year');assert.equal(roundtrip.annualReference.metadata.soiling.samples,undefined);
// Exercise the same accepted/rejected inputs in fresh processes so host TZ cannot mask regressions.
if (process.env.REFERENCE_ENERGY_TZ_CHILD !== '1') {
  for (const zone of ['UTC', 'America/New_York', 'Asia/Tehran']) {
    const output = execFileSync(process.execPath, ['--import', 'tsx', 'scripts/test-reference-integration.ts'], {
      env: {...process.env, TZ:zone, REFERENCE_ENERGY_TZ_CHILD:'1'},
      encoding:'utf8', timeout:120000,
    });
    assert.match(output, /Explicit energy offset \/ UTC normalization \/ fallback PASS/);
    console.log(`Reference timestamp subprocess PASS: ${zone}`);
  }
}
console.log(`Reference integration PASS: ${records.length} independent fixtures; replacement/sign/no-double-count, annual/missing/site/geometry fallback, canonical yield and serialization (not field validation).`);
