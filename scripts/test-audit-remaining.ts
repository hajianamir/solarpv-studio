import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {historicalSource} from './historical-source';
import {calculateAshraeIam} from '../src/engine/optical/iamEngine';
import {evaluateMpptCompatibility,type MpptCheckInput} from '../src/engine/core/electricalSizingContract';
import {calculateSolarPosition} from '../src/engine/solarPvEngine';
import {calculateKimberSeries,type KimberRequest} from '../src/engine/reference/kimberSeries';
import {dispatchOperatingEnergy,type OperatingPlan} from '../src/studies/operatingDispatch';
import {assessSaltCorrosion} from '../src/engine/corrosion/saltCorrosionEngine';
import {evaluateAnnualReferenceLosses} from '../src/engine/reference/annualReferenceLosses';
import {SCALAR_TRANSPOSITION_DISCLOSURE} from '../src/engine/core/scalarTransposition';
const close=(a:number,b:number,t=1e-9)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=t,`${a} vs ${b}`);
// Independent analytical ASHRAE vectors, not weather-driven annual validation.
for(const angle of [0,30,60,84.999,85,86,87,88,89,90,95])for(const b0 of [.01,.02,.05]){
 const expected=angle>=90?0:Math.max(0,1-b0*(1/Math.cos(angle*Math.PI/180)-1));
 close(calculateAshraeIam(angle,b0),expected,5.01e-7);
}
assert.ok(calculateAshraeIam(86,.02)>.7,'Former cutoff witness');
const base:MpptCheckInput={moduleVoc:50,moduleVmp:40,moduleIsc:10,moduleImp:9,modulePmp:360,tempCoeffVocPct:0,tempCoeffVmpPct:-.3,modulesPerString:10,parallelStrings:1,inverterVdcMax:500,inverterVmpptMin:400,inverterVmpptMax:450,inverterImppMaxPerMppt:20,inverterIscMaxPerMppt:20,inverterMpptChannels:1,inverterPnomAcKw:5,ambientTempMinC:25,ambientTempMaxC:25,cellTempHotC:25};
assert.equal(evaluateMpptCompatibility(base).isVoltageFeasible,true);
for(const patch of [{moduleVoc:50.0004},{moduleVmp:39.9996},{moduleVmp:45.0004,inverterVmpptMin:300}]){
 const r=evaluateMpptCompatibility({...base,...patch});assert.equal(r.isVoltageFeasible,false);assert.equal(r.isCompliant,false);assert.ok(r.blockingErrors.length>0);
}
// At-pole and near-pole direction must vary over UTC day, not constant180.
for(const lat of [89.999999,-89.999999,90,-90]){
 const az=[0,6,12,18].map(h=>calculateSolarPosition(lat,0,Date.UTC(2025,5,21,h)/1000).azimuthDeg);
 assert.ok(az.every(Number.isFinite));assert.ok(new Set(az.map(a=>Math.round(a))).size===4);
}
// Compare production against independent externally generated pvlib solar and IAM vectors.
const oracle=JSON.parse(readFileSync('scripts/fixtures/physics/audit-remaining-pvlib.json','utf8'));
for(const c of oracle.solar){const r=calculateSolarPosition(...c.input as [number,number,number]);const delta=((r.azimuthDeg-c.azimuthDeg+540)%360)-180;close(delta,0,.1);close(r.zenithDeg,c.zenithDeg,.1);}
for(const c of oracle.iam)close(calculateAshraeIam(c.angle,c.b0),c.expected,5.01e-7);
const corrosion=await assessSaltCorrosion({latitude:35,longitude:51,distanceToSeaKm:.5});assert.equal(corrosion.iso9223Category,'C5');assert.equal(corrosion.iso9223Assessment,'not_assessed');assert.match(corrosion.categoryLabel,/Internal/);
assert.match(SCALAR_TRANSPOSITION_DISCLOSURE.en,/Not weather-driven/);
// Historical prerequisite failure is actionable in an actual shallow clone; no skip/fetch.
const scratch=mkdtempSync(join(tmpdir(),'solar-history-'));
try{execFileSync('git',['clone','--quiet','--depth','1','--no-local',pathToFileURL(process.cwd()).href,scratch]);assert.throws(()=>historicalSource('c171538de7eade1a4090531820adb97306251105:src/engine/waterfallLossEngine.ts',scratch),/HISTORY_PREREQUISITE.*shallow=true.*git fetch --unshallow/);}finally{rmSync(scratch,{recursive:true,force:true});}
// FIFO source attribution, exact hand budgets including conversion and aux losses.
const plan:OperatingPlan={schemaVersion:'operating-dispatch-v1',mode:'ongrid',source:'Synthetic attribution hand checks',intervalMinutes:60,battery:{capacityKwh:10,initialSocFraction:1,minSocFraction:0,maxChargeKw:10,maxDischargeKw:0,chargeEfficiency:.8,dischargeEfficiency:.5},records:[{timestamp:'2025-01-01T01:00:00Z',loadW:5000,gridAvailable:true,exportLimitW:10000}]};
let r=dispatchOperatingEnergy(plan,[{timestamp:plan.records[0].timestamp,exportW:5000,importW:0}]);close(r.pvOriginSelfConsumedKwh,5);close(r.initialOriginSelfConsumedKwh,0);close(r.initialOriginFinalStoredKwh,10);
r=dispatchOperatingEnergy({...plan,battery:{...plan.battery,maxDischargeKw:2}},[{timestamp:plan.records[0].timestamp,exportW:3000,importW:1000}]);close(r.initialOriginDischargeKwh,2);close(r.initialOriginSelfConsumedKwh,2);close(r.pvOriginSelfConsumedKwh,2);close(r.initialOriginFinalStoredKwh,6);
const mixed={...plan,battery:{...plan.battery,initialSocFraction:.2,maxDischargeKw:10},records:[0,1,2].map(i=>({...plan.records[0],timestamp:`2025-01-01T0${i+1}:00:00Z`,loadW:i===0?0:4000}))};
r=dispatchOperatingEnergy(mixed,mixed.records.map((s,i)=>({timestamp:s.timestamp,exportW:i===0?10000:0,importW:0})));close(r.initialOriginSelfConsumedKwh,1);close(r.pvOriginSelfConsumedKwh,4);close(r.initialOriginFinalStoredKwh,0);close(r.selfConsumedKwh,5);
// Independent quadratic characterization for rain-window/grace/threshold/wash edges.
function quadratic(input:KimberRequest){let loss=input.parameters.initialLossFraction,last:number|null=null;return input.steps.map((s,i)=>{const t=Date.parse(s.timestamp)/3600000,p=input.parameters,rain=input.steps.reduce((n,x)=>{const u=Date.parse(x.timestamp)/3600000;return n+(u>t-p.rainAccumulationHours&&u<=t?x.rainfallMm!:0);},0);if(i)loss+=p.lossRatePerDay*(Date.parse(s.timestamp)-Date.parse(input.steps[i-1].timestamp))/86400000;if(rain>p.cleaningThresholdMm)last=t;if((last!==null&&t-last<p.gracePeriodDays*24)||input.manualWashTimestamps.includes(s.timestamp))loss=0;return Math.min(loss,p.maxLossFraction);});}
let vectors=0;
for(const cadence of [.25,1,24])for(const window of [.1,1,24,48])for(const threshold of [0,1,3]){
 const req:KimberRequest={timezone:'UTC',weatherQuality:'assumed',parameterQuality:'assumed',parameters:{cleaningThresholdMm:threshold,lossRatePerDay:.01,gracePeriodDays:2,maxLossFraction:.4,initialLossFraction:.1,rainAccumulationHours:window},steps:Array.from({length:160},(_,i)=>({timestamp:new Date(Date.UTC(2025,0,1)+(i+1)*cadence*3600000).toISOString(),rainfallMm:i%17===0?1:0,unsoiledEnergyWh:i%3?10:0})),manualWashTimestamps:[]};req.manualWashTimestamps=[req.steps[45].timestamp];const out=calculateKimberSeries(req);assert.equal(out.status,'computed');const expected=quadratic(req);out.samples!.forEach((s,i)=>close(s.lossFraction,expected[i],1e-12));vectors++;
}
const annual:KimberRequest={timezone:'UTC',weatherQuality:'assumed',parameterQuality:'assumed',parameters:{cleaningThresholdMm:3,lossRatePerDay:.0015,gracePeriodDays:14,maxLossFraction:.3,initialLossFraction:0,rainAccumulationHours:24},steps:Array.from({length:35040},(_,i)=>({timestamp:new Date(Date.UTC(2025,0,1)+(i+1)*900000).toISOString(),rainfallMm:i%333===0?4:0,unsoiledEnergyWh:1})),manualWashTimestamps:[]};annual.manualWashTimestamps=annual.steps.filter((_,i)=>i%50===0).map(s=>s.timestamp);const started=performance.now();const out=calculateKimberSeries(annual);const elapsed=performance.now()-started;assert.equal(out.status,'computed');assert.equal(out.samples?.length,35040);assert.ok(elapsed<2000,`35040quarter-hour Kimber + washes budget2s, observed${elapsed}ms`);
const importStarted=performance.now();
const applied=evaluateAnnualReferenceLosses({schemaVersion:1,year:2025,site:{latitude:35,longitude:51},energyQuality:'assumed',energySource:'Synthetic35040interval import budget only',energy:annual.steps.map(s=>({timestamp:s.timestamp,cleanDcEnergyWh:1})),soiling:annual});
assert.equal(applied.status,'computed');assert.equal(applied.metadata?.intervalCount,35040);assert.ok(performance.now()-importStarted<2000,'Full annual-reference validation/evaluation budget2s');
console.log(`PASS remaining audit: ASHRAE/MPPT raw boundaries/polar pvlib/claim metadata/shallow history/FIFO attribution; ${vectors} quadratic Kimber comparisons,35040intervals in ${elapsed.toFixed(1)}ms. Synthetic and independent-component evidence, not field validation.`);
