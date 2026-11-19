import assert from 'node:assert/strict';
import fs from 'node:fs';
import { calculateSnowSeries, type SnowRequest } from '../src/engine/reference/snowSeries';
import { calculateKimberSeries } from '../src/engine/reference/kimberSeries';
function request(dt=1):SnowRequest {
 return {timezone:'UTC',weatherQuality:'measured',parameterQuality:'user_configured',mounting:'roof',
 parameters:{tiltDeg:30,rowSlantHeightM:2,parallelStringsAlongSlant:3,initialCoverageFraction:0.7,snowfallThresholdCmPerHour:1,groundDepthThresholdCm:1,canSlideCoefficientWm2PerC:-80,slideAmountCoefficientPerHour:0.197},
 steps:Array.from({length:5},(_,i)=>({timestamp:new Date(Date.UTC(2024,0,1)+i*dt*3600000).toISOString(),snowfallCm:0,groundSnowDepthCm:10,poaWm2:400,ambientTempC:2}))};
}
function samples(r:SnowRequest){const out=calculateSnowSeries(r);assert.equal(out.status,'computed');assert.ok(out.samples);return out.samples;}
assert.equal(samples(request())[0].coverageFraction,0.7);
assert.ok(Math.abs(samples(request())[1].coverageFraction-(0.7-0.197*0.5))<1e-12);
assert.ok(Math.abs(samples(request())[2].coverageFraction-samples(request(.5))[4].coverageFraction)<1e-12);
const flat=request();flat.parameters.tiltDeg=0;assert.equal(samples(flat)[4].coverageFraction,0.7);
flat.steps[0].groundSnowDepthCm=0;assert.equal(samples(flat)[0].coverageFraction,0); // reset overrides first step and flat geometry
const cold=request();cold.steps.forEach(s=>{s.ambientTempC=-5;});assert.equal(samples(cold)[4].coverageFraction,0.7); // strict temperature > POA/-80
const event=request();event.steps[0].snowfallCm=1;assert.equal(samples(event)[0].coverageFraction,0.7);
event.steps[0].snowfallCm=1.001;assert.equal(samples(event)[0].coverageFraction,1);
event.steps[1].snowfallCm=2;assert.equal(samples(event)[1].coverageFraction,1); // no sliding during new snowfall
const zero=request();zero.parameters.initialCoverageFraction=0;zero.steps.forEach(s=>{s.groundSnowDepthCm=0;});assert.ok(samples(zero).every(s=>s.coverageFraction===0));
for(const bad of [null,NaN,-1]) {const r=request();r.steps[1].snowfallCm=bad;assert.equal(calculateSnowSeries(r).status,'missing_or_unsupported');}
for(const field of ['groundSnowDepthCm','poaWm2','ambientTempC'] as const){const r=request();r.steps[0][field]=null;assert.equal(calculateSnowSeries(r).status,'missing_or_unsupported');}
for(const mutate of [
 (r:SnowRequest)=>{r.steps.reverse();},(r:SnowRequest)=>{r.steps[1].timestamp=r.steps[0].timestamp;},
 (r:SnowRequest)=>{r.steps[2].timestamp='2024-01-01T02:30:00Z';},
 (r:SnowRequest)=>{r.parameters.tiltDeg=91;},(r:SnowRequest)=>{r.parameters.parallelStringsAlongSlant=0;},
 (r:SnowRequest)=>{r.parameters.canSlideCoefficientWm2PerC=0;},
 (r:SnowRequest)=>{r.steps[0].timestamp='2024-02-30T00:00:00Z';},
]){const r=request();mutate(r);assert.equal(calculateSnowSeries(r).status,'missing_or_unsupported');}
let count=0;
function close(actual:unknown,expected:unknown){
 if(typeof expected==='number'){assert.ok(typeof actual==='number'&&Number.isFinite(actual)&&Math.abs(actual-expected)<1e-10);}
 else if(Array.isArray(expected)){assert.ok(Array.isArray(actual));assert.equal(actual.length,expected.length);expected.forEach((v,i)=>close(actual[i],v));}
 else if(expected&&typeof expected==='object'){assert.ok(actual&&typeof actual==='object');for(const [k,v] of Object.entries(expected))close((actual as Record<string,unknown>)[k],v);}
 else assert.equal(actual,expected);
}
for(const path of fs.readdirSync('scripts/fixtures/physics').filter(f=>/^snow-0131-.*\.json$/.test(f))){
 const f=JSON.parse(fs.readFileSync(`scripts/fixtures/physics/${path}`,'utf8'));close(calculateSnowSeries(f.inputs[0]),f.expected);count++;
}
const reference=JSON.parse(fs.readFileSync('scripts/fixtures/physics/reference-timeseries-pvlib-0131.json','utf8'));
for(const c of reference.cases){close(c.kind==='snow'?calculateSnowSeries(c.input):calculateKimberSeries(c.input),c.expected);}
assert.ok(count>0);
console.log(`Reference snow: boundary/missing contracts, ${count} pinned pvlib fixtures, and hourly/sub-hourly snow/soiling comparisons PASS (not field validation).`);
