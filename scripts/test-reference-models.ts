import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {once} from 'node:events';
import express from 'express';
import {ResearchExecutor,createResearchRouter} from '../src/server/researchApi';
import {ResearchRequestSchema,validateResearchResponse} from '../src/studies/researchApi';
const requests=['pvdeg','pvice','optics'].map(name=>ResearchRequestSchema.parse(JSON.parse(readFileSync(`docs/examples/references/${name}.json`,'utf8'))));
for(const request of requests){
 const before=JSON.stringify(request),envelope=await new ResearchExecutor().run(request);validateResearchResponse(envelope,request);assert.equal(JSON.stringify(request),before);
 const mutate=(fn:(o:Record<string,unknown>)=>void)=>{const bad=structuredClone(envelope) as {result:{output:Record<string,unknown>}};fn(bad.result.output);assert.throws(()=>validateResearchResponse(bad,request));};
 if(request.operation==='pvdeg_acceleration'){
  mutate(o=>{o.accelerationFactor=Number(o.accelerationFactor)+1;});mutate(o=>{o.meanFieldRate=Number(o.meanFieldRate)*2;});
 }else if(request.operation==='pvice_massflow'){
  mutate(o=>{(o.trace as {areaM2:number}[])[0].areaM2+=1;});mutate(o=>{(o.trace as {manufacturingInputKg:number}[])[0].manufacturingInputKg+=1;});mutate(o=>{(o.totals as {landfillKg:number}).landfillKg+=1;});
 }else{
  mutate(o=>{(o.trace as {reflectance:number;transmittance:number}[])[0].reflectance+=.01;(o.trace as {transmittance:number}[])[0].transmittance-=.01;});mutate(o=>{o.absorbedWm2=Number(o.absorbedWm2)+1;});
 }
 mutate(o=>{(o.runtime as {version:string}).version='latest';});mutate(o=>{o.referenceHashes={};});
 const bad=structuredClone(envelope) as {result:{projectApproval:string}};bad.result.projectApproval='approved';assert.throws(()=>validateResearchResponse(bad,request));
 assert.throws(()=>ResearchRequestSchema.parse({...request,plan:{...request.plan,extra:1}}));
}
for(const malformed of [{...requests[1],plan:{...requests[1].plan,path:'/etc/passwd'}},{...requests[0],plan:{...requests[0].plan,alreadyAppliedMechanisms:['aging']}},{...requests[2],plan:{...requests[2].plan,polarization:'unknown'}}])assert.throws(()=>ResearchRequestSchema.parse(malformed));
for(const angle of [0,30,60,80])for(const pol of ['s','p','unpolarized']){const raw=structuredClone(requests[2]);assert.equal(raw.operation,'coherent_optics');if(raw.operation!=='coherent_optics')throw new Error('fixture');raw.plan.angleDeg=angle;raw.plan.polarization=pol as 's'|'p'|'unpolarized';const request=ResearchRequestSchema.parse(raw);validateResearchResponse(await new ResearchExecutor().run(request),request);}
const silicon=ResearchRequestSchema.parse(JSON.parse(readFileSync('docs/examples/references/silicon.json','utf8')));validateResearchResponse(await new ResearchExecutor().run(silicon),silicon);
const configured=process.env.PVLIB_REFERENCE_PYTHON;assert.ok(configured,'Set separate PVLIB_REFERENCE_PYTHON');delete process.env.PVLIB_REFERENCE_PYTHON;await assert.rejects(()=>new ResearchExecutor().run(requests[0]),/Optional reference runtime/);process.env.PVLIB_REFERENCE_PYTHON=configured;
process.env.JWT_SECRET='reference-models-test-only';process.env.PVLIB_RESEARCH_ENABLED='true';delete process.env.REFERENCE_MODELS_ENABLED;delete process.env.PORTFOLIO_ANALYTICS_ENABLED;delete process.env.SCIENCE_B_ENABLED;delete process.env.SCIENCE_C_ENABLED;delete process.env.SCIENCE_D_ENABLED;
const app=express();app.use('/api/v1/research',createResearchRouter({resolveIdentity:req=>req.headers.authorization==='Bearer science-test'?{userId:'science-test'}:{}}));const server=app.listen(0,'127.0.0.1');await once(server,'listening');const a=server.address();assert.ok(a&&typeof a==='object');const origin=`http://127.0.0.1:${a.port}`;
try{
 const run=(request:unknown,auth=true)=>fetch(origin+'/api/v1/research/run',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer science-test'}:{})},body:JSON.stringify(request)});
 assert.equal((await run(requests[0],false)).status,401);assert.equal((await run(requests[0])).status,503);
 let capabilities=await(await fetch(origin+'/api/v1/research/capabilities')).json();assert.equal(capabilities.referenceModelsEnabled,false);assert.ok(!capabilities.operations.includes('pvdeg_acceleration'));
 process.env.REFERENCE_MODELS_ENABLED='true';capabilities=await(await fetch(origin+'/api/v1/research/capabilities')).json();assert.equal(capabilities.referenceModelsEnabled,true);assert.ok(capabilities.operations.includes('coherent_optics'));assert.ok(!capabilities.operations.includes('hybrid_design'));assert.ok(!capabilities.operations.includes('tandem_spectrum'));assert.equal(capabilities.scienceBEnabled,false);
 for(const request of requests){const response=await run(request);assert.equal(response.status,200);validateResearchResponse(await response.json(),request);}
 const sdk=await promisify(execFile)(process.env.PVLIB_PYTHON??'python3',['-c',`import json,sys
sys.path.insert(0,'sdk')
from solarpv_sdk import Client
r=Client(sys.argv[1],'science-test',enabled=True).run(json.load(open('docs/examples/references/optics.json')))
assert r['envelope']['result']['output']['runtime']['package']=='tmm'
assert not r['energyAdoption'] and not r['financeMutation']
print('PASS reference SDK real HTTP')`,origin],{timeout:30000});console.log(sdk.stdout.trim());
 delete process.env.REFERENCE_MODELS_ENABLED;const rollbackApp=express();rollbackApp.use('/api/v1/research',createResearchRouter({resolveIdentity:()=>({userId:'rollback-test'})}));const rollback=rollbackApp.listen(0,'127.0.0.1');await once(rollback,'listening');try{const address=rollback.address();assert.ok(address&&typeof address==='object');assert.equal((await fetch(`http://127.0.0.1:${address.port}/api/v1/research/run`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(requests[0])})).status,503);}finally{rollback.close();await once(rollback,'close');}
}finally{server.close();await once(server,'close');}
console.log('PASS reference adapters actual Python/API, independent ledger/tamper, auth, separate flags/rollback, immutable plans and SDK research boundary');
