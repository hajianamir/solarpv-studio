import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {once} from 'node:events';
import express from 'express';
import {ResearchExecutor,createResearchRouter} from '../src/server/researchApi';
import {ResearchRequestSchema,validateResearchResponse} from '../src/studies/researchApi';
import {IntervalCalibrationRequestSchema,conformalRank} from '../src/studies/intervalCalibration';
const request=IntervalCalibrationRequestSchema.parse(JSON.parse(readFileSync('docs/examples/references/calibration.json','utf8'))),before=JSON.stringify(request),e=validateResearchResponse(await new ResearchExecutor().run(request),request);assert.equal(JSON.stringify(request),before);
assert.equal(conformalRank(99,.07),93);assert.equal(conformalRank(9,.1),9);
const mutate=(fn:(o:Record<string,unknown>)=>void)=>{const bad=structuredClone(e) as {result:{output:Record<string,unknown>}};fn(bad.result.output);assert.throws(()=>validateResearchResponse(bad,request));};
for(const k of ['rank','radiusKwh','nominalCoverage'])mutate(o=>{o[k]=Number(o[k])+1;});mutate(o=>{(o.metrics as {empiricalCoverage:number}).empiricalCoverage=1;});mutate(o=>{(o.evaluation as {lowerKwh:number}[])[0].lowerKwh+=1;});mutate(o=>{o.guaranteeStatus='verified';});mutate(o=>{o.referenceHashes={};});
const leaking=structuredClone(request);leaking.plan.evaluation[0].siteId=leaking.plan.calibration[0].siteId;assert.throws(()=>ResearchRequestSchema.parse(leaking));assert.throws(()=>ResearchRequestSchema.parse({...request,plan:{...request.plan,extra:1}}));
const unbounded=structuredClone(request);unbounded.plan.calibration=unbounded.plan.calibration.slice(0,4);const response=validateResearchResponse(await new ResearchExecutor().run(unbounded),unbounded);assert.equal((response.result as {output:{radiusKwh:unknown}}).output.radiusKwh,null);
const negative=structuredClone(request);negative.plan.evaluation[0].predictionKwh=1;validateResearchResponse(await new ResearchExecutor().run(negative),negative);
const configured=process.env.PVLIB_REFERENCE_PYTHON;delete process.env.PVLIB_REFERENCE_PYTHON;validateResearchResponse(await new ResearchExecutor().run(request),request);if(configured)process.env.PVLIB_REFERENCE_PYTHON=configured;
process.env.JWT_SECRET='calibration-test-only';process.env.PVLIB_RESEARCH_ENABLED='true';delete process.env.INTERVAL_CALIBRATION_ENABLED;process.env.SCIENCE_C_ENABLED='true';
const app=express();app.use('/api/v1/research',createResearchRouter({resolveIdentity:req=>req.headers.authorization==='Bearer calibration-test'?{userId:'calibration-test'}:{}}));const server=app.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert.ok(address&&typeof address==='object');const origin=`http://127.0.0.1:${address.port}`;
try{
 const run=(r:unknown,auth=true)=>fetch(origin+'/api/v1/research/run',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer calibration-test'}:{})},body:JSON.stringify(r)});
 assert.equal((await run(request,false)).status,401);assert.equal((await run(request)).status,503);let c=await(await fetch(origin+'/api/v1/research/capabilities')).json();assert.equal(c.intervalCalibrationEnabled,false);assert.ok(!c.operations.includes('interval_calibration'));
 process.env.INTERVAL_CALIBRATION_ENABLED='true';delete process.env.SCIENCE_C_ENABLED;c=await(await fetch(origin+'/api/v1/research/capabilities')).json();assert.equal(c.intervalCalibrationEnabled,true);const response=await run(request);assert.equal(response.status,200);validateResearchResponse(await response.json(),request);
 const sdk=await promisify(execFile)(process.env.PVLIB_PYTHON??'python3',['-c',`import json,sys
sys.path.insert(0,'sdk')
from solarpv_sdk import Client
r=Client(sys.argv[1],'calibration-test',enabled=True).run(json.load(open('docs/examples/references/calibration.json')))
assert r['envelope']['result']['operation']=='interval_calibration'
assert not r['energyAdoption'] and not r['financeMutation']
print('PASS calibration SDK real HTTP')`,origin],{timeout:30000});console.log(sdk.stdout.trim());
 delete process.env.INTERVAL_CALIBRATION_ENABLED;assert.equal((await run(request)).status,503);
}finally{server.close();await once(server,'close');}
console.log('PASS calibration actual kernels, independent rank/holdout witnesses, auth and independent flag rollback, SDK');
