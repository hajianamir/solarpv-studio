import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {once} from 'node:events';
import express from 'express';
import {ResearchExecutor,createResearchRouter} from '../src/server/researchApi';
import {ResearchRequestSchema,validateResearchResponse} from '../src/studies/researchApi';
import {CouplingRequestSchema} from '../src/studies/pvtPemCoupling';
const request=CouplingRequestSchema.parse(JSON.parse(readFileSync('docs/examples/science-c/coupled.request.json','utf8'))),before=JSON.stringify(request),e=validateResearchResponse(await new ResearchExecutor().run(request),request);assert.equal(JSON.stringify(request),before);
const mutate=(fn:(o:Record<string,unknown>)=>void)=>{const bad=structuredClone(e) as {result:{output:Record<string,unknown>}};fn(bad.result.output);assert.throws(()=>validateResearchResponse(bad,request));};
mutate(o=>{(o.trace as {transferredJ:number}[])[0].transferredJ+=1;});mutate(o=>{(o.totals as {combinedResidualJ:number}).combinedResidualJ+=1;});mutate(o=>{o.thermalFeedback=true;});mutate(o=>{o.hydrogenDeltaKg=1;});mutate(o=>{o.numericalGate='failed_refinement';});
mutate(o=>{const r=o.finePemResult as {plan:{records:{availableW:number}[]}};r.plan.records[0].availableW+=1;});mutate(o=>{const r=o.collectorResult as {output:{fine:{trace:{electricalJm2:number}[]}}};r.output.fine.trace[0].electricalJm2+=1;});
assert.throws(()=>ResearchRequestSchema.parse({...request,plan:{...request.plan,electrolyzer:{...request.plan.electrolyzer,records:[]}}}));assert.throws(()=>ResearchRequestSchema.parse({...request,plan:{...request.plan,areaM2:0}}));const bad=structuredClone(request);bad.plan.electrolyzer.contextSha256='a'.repeat(64);assert.throws(()=>ResearchRequestSchema.parse(bad));
for(const efficiency of [0,1]){const r=structuredClone(request);r.plan.transferEfficiency=efficiency;validateResearchResponse(await new ResearchExecutor().run(r),r);}
const refined=structuredClone(request);Object.assign(refined.plan.collector,{gammaPerK:-.004,initialC:25,massKgM2:10,stepS:100,temperatureToleranceC:2,ambientLossWm2K:20});refined.plan.collector.records[0].solarWm2=1000;refined.plan.electrolyzer.maximumCurrentA=1000;refined.plan.hydrogenToleranceKg=1e-12;validateResearchResponse(await new ResearchExecutor().run(refined),refined);
const configured=process.env.PVLIB_REFERENCE_PYTHON;delete process.env.PVLIB_REFERENCE_PYTHON;validateResearchResponse(await new ResearchExecutor().run(request),request);if(configured)process.env.PVLIB_REFERENCE_PYTHON=configured;
process.env.JWT_SECRET='coupling-test-only';process.env.PVLIB_RESEARCH_ENABLED='true';delete process.env.PVT_PEM_COUPLING_ENABLED;process.env.SCIENCE_C_ENABLED='true';
const app=express();app.use('/api/v1/research',createResearchRouter({resolveIdentity:req=>req.headers.authorization==='Bearer coupling-test'?{userId:'coupling-test'}:{}}));const server=app.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert.ok(address&&typeof address==='object');const origin=`http://127.0.0.1:${address.port}`;
try{
 const run=(r:unknown,auth=true)=>fetch(origin+'/api/v1/research/run',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer coupling-test'}:{})},body:JSON.stringify(r)});
 assert.equal((await run(request,false)).status,401);assert.equal((await run(request)).status,503);let c=await(await fetch(origin+'/api/v1/research/capabilities')).json();assert.equal(c.pvtPemCouplingEnabled,false);assert.ok(!c.operations.includes('pvt_pem_coupled'));
 process.env.PVT_PEM_COUPLING_ENABLED='true';delete process.env.SCIENCE_C_ENABLED;c=await(await fetch(origin+'/api/v1/research/capabilities')).json();assert.equal(c.pvtPemCouplingEnabled,true);const response=await run(request);assert.equal(response.status,200);validateResearchResponse(await response.json(),request);
 const sdk=await promisify(execFile)(process.env.PVLIB_PYTHON??'python3',['-c',`import json,sys
sys.path.insert(0,'sdk')
from solarpv_sdk import Client
r=Client(sys.argv[1],'coupling-test',enabled=True).run(json.load(open('docs/examples/science-c/coupled.request.json')))
assert r['envelope']['result']['operation']=='pvt_pem_coupled'
assert not r['energyAdoption'] and not r['financeMutation']
print('PASS coupling SDK real HTTP')`,origin],{timeout:30000});console.log(sdk.stdout.trim());
 delete process.env.PVT_PEM_COUPLING_ENABLED;assert.equal((await run(request)).status,503);
}finally{server.close();await once(server,'close');}
console.log('PASS coupling actual kernels, independent transfer/Faraday/energy witnesses, failed-refinement, auth and independent flag rollback, SDK');
