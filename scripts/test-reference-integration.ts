import assert from 'node:assert/strict';
import fs from 'node:fs';
import {evaluateAnnualReferenceLosses,combineEnvironmentalLossPct,type AnnualReferenceInput} from '../src/engine/reference/annualReferenceLosses';
import {buildWaterfallArgs,computeConfiguredWaterfall,withReferenceLossMetadata} from '../src/engine/waterfallArgs';
import {computeWaterfallLosses} from '../src/engine/waterfallLossEngine';
import {computeCanonicalAnnualYield} from '../src/engine/core/annualYieldEngine';
import {ClimateCitySchema} from '../src/engine/core/projectMigration';
import {getDefaultClimateCity} from '../src/engine/climaticData';
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
const canonical=computeCanonicalAnnualYield({installedCapacityKwp:100,peakSunHours:5,ambientTempMaxC:35,annualReferenceLosses:request,referenceSite:request.site});assert.equal(canonical.waterfallReport.annualReference?.status,'computed');assert.equal(canonical.waterfallReport.stages.find(s=>s.id==='soiling')?.percentageLossRaw,-reference.soilingLossPct!);
// Pure metadata attachment must not mutate the caller's report.
const untouched={...base,stages:base.stages.map(s=>({...s}))};withReferenceLossMetadata(base,input);assert.deepEqual(base,untouched);
// Restorable project payload keeps exact raw inputs; serialized report retains metadata but no weather arrays.
const restored=ClimateCitySchema.parse({...getDefaultClimateCity(),annualReferenceLosses:request});assert.deepEqual(restored.annualReferenceLosses,request);
const roundtrip=JSON.parse(JSON.stringify(report));assert.equal(roundtrip.annualReference.metadata.soiling.modelId,'soiling_kimber_pvlib_0131');assert.equal(roundtrip.annualReference.metadata.coverage,'complete_utc_calendar_year');assert.equal(roundtrip.annualReference.metadata.soiling.samples,undefined);
console.log(`Reference integration PASS: ${records.length} independent fixtures; replacement/sign/no-double-count, annual/missing/site/geometry fallback, canonical yield and serialization (not field validation).`);
