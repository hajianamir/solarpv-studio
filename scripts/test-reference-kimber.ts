import assert from 'node:assert/strict';
import fs from 'node:fs';
import { calculateKimberSeries, type KimberRequest } from '../src/engine/reference/kimberSeries';
function request(rain: (number|null)[], hours=24): KimberRequest {
  return { timezone: 'UTC', weatherQuality: 'measured', parameterQuality: 'user_configured',
    parameters: {cleaningThresholdMm:6,lossRatePerDay:0.01,gracePeriodDays:2,maxLossFraction:0.3,initialLossFraction:0.02,rainAccumulationHours:24},
    manualWashTimestamps:[],steps:rain.map((rainfallMm,i)=>({timestamp:new Date(Date.UTC(2024,0,1)+i*hours*3600000).toISOString(),rainfallMm,unsoiledEnergyWh:100})) };
}
function losses(r:KimberRequest){const out=calculateKimberSeries(r);assert.equal(out.status,'computed');assert.ok(out.samples);return out.samples.map(s=>s.lossFraction);}
function close(actual:number[],expected:number[]){assert.equal(actual.length,expected.length);actual.forEach((n,i)=>assert.ok(Math.abs(n-expected[i])<1e-12, `${i}: ${n} vs ${expected[i]}`));}
close(losses(request([0,0,0])),[0.02,0.03,0.04]);
close(losses(request([0,6,0])),[0.02,0.03,0.04]); // equality is not cleaning
close(losses(request([0,5.999,0])),[0.02,0.03,0.04]);
close(losses(request([0,6.001,0,0,0])),[0.02,0,0,0.01,0.02]); // event at day 1; day 3 excluded from grace
close(losses(request([0,3,4,0,0],12)),[0.02,0.025,0,0,0]);
const wash=request([0,0,0,0]);wash.manualWashTimestamps=[wash.steps[1].timestamp];
close(losses(wash),[0.02,0,0.01,0.02]); // manual wash has no rain grace
const cap=request([0,0,0,0]);cap.parameters.maxLossFraction=0.035;
close(losses(cap),[0.02,0.03,0.035,0.035]);
const weighted=request([0,0]);weighted.steps[0].unsoiledEnergyWh=1;weighted.steps[1].unsoiledEnergyWh=3;
assert.ok(Math.abs(calculateKimberSeries(weighted).energyWeightedLossFraction!-0.0275)<1e-12);
for(const value of [null,undefined]){const r=request([0,0]);r.steps[0].unsoiledEnergyWh=value;assert.equal(calculateKimberSeries(r).energyWeightedLossFraction,null);}
const zero=request([0,0]);zero.steps.forEach(s=>{s.unsoiledEnergyWh=0;});assert.equal(calculateKimberSeries(zero).energyWeightedLossFraction,null);
for(const rainfall of [null,NaN,-1])assert.equal(calculateKimberSeries(request([0,rainfall])).status,'missing_or_unsupported');
for(const mutate of [
 (r:KimberRequest)=>{r.steps[1].timestamp=r.steps[0].timestamp;},
 (r:KimberRequest)=>{r.steps.reverse();},
 (r:KimberRequest)=>{r.steps[2].timestamp='2024-01-05T00:00:00.000Z';},
 (r:KimberRequest)=>{r.steps[0].timestamp='2024-02-30T00:00:00.000Z';},
 (r:KimberRequest)=>{r.steps[0].timestamp='2024-01-01T00:00:00';},
 (r:KimberRequest)=>{r.parameters.lossRatePerDay=NaN;},
 (r:KimberRequest)=>{r.parameters.gracePeriodDays=0;},
 (r:KimberRequest)=>{r.timezone='invalid';},
 (r:KimberRequest)=>{r.manualWashTimestamps=['2024-01-01T12:00:00Z'];},
]){const r=request([0,0,0]);mutate(r);assert.equal(calculateKimberSeries(r).status,'missing_or_unsupported');}
// Execute all independently generated pvlib outputs without trusting fixture labels.
let fixtures=0;
for(const path of fs.readdirSync('scripts/fixtures/physics').filter(f=>/^kimber-0131-.*\.json$/.test(f))){
 const fixture=JSON.parse(fs.readFileSync(`scripts/fixtures/physics/${path}`,'utf8'));
 const actual=calculateKimberSeries(fixture.inputs[0]);assert.equal(actual.status,'computed');
 close(actual.samples!.map(s=>s.lossFraction),fixture.expected.samples.map((s:{lossFraction:number})=>s.lossFraction));
 if(fixture.expected.energyWeightedLossFraction===null)assert.equal(actual.energyWeightedLossFraction,null);
 else assert.ok(Math.abs(actual.energyWeightedLossFraction!-fixture.expected.energyWeightedLossFraction)<1e-10);
 fixtures++;
}
assert.ok(fixtures>0);
console.log(`Reference Kimber: boundary/missing-data contracts and ${fixtures} pvlib 0.13.1 fixtures PASS (not field validation).`);
