import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {once} from 'node:events';
import express from 'express';
import {ResearchExecutor,createResearchRouter} from '../src/server/researchApi';
import {ResearchRequestSchema,validateResearchResponse} from '../src/studies/researchApi';
const requests=['oet','battery','tandem'].map(name=>ResearchRequestSchema.parse(JSON.parse(readFileSync(`docs/examples/science-b/${name}.synthetic.json`,'utf8'))));
for(const request of requests){
 const before=JSON.stringify(request),envelope=await new ResearchExecutor().run(request);validateResearchResponse(envelope,request);assert.equal(JSON.stringify(request),before);
 const mutate=(fn:(o:Record<string,unknown>)=>void)=>{const bad=structuredClone(envelope) as {result:{output:Record<string,unknown>}};fn(bad.result.output);assert.throws(()=>validateResearchResponse(bad,request));};
 if(request.operation==='oet_patch'){
  mutate(o=>{const fine=o.fine as {patches:{temperatureC:number}[]};fine.patches[0].temperatureC+=1;});
  mutate(o=>{o.numericalGate='failed_refinement';});
  mutate(o=>{(o.fine as {powerW:number}).powerW+=1;});
 }else if(request.operation==='battery_pybamm'){
  mutate(o=>{const runs=o.runs as {trace:{capacityAh:number}[]}[];runs[2].trace[1].capacityAh+=1;});
  mutate(o=>{o.numericalGate='failed_convergence';});
  mutate(o=>{const runs=o.runs as {trace:{totalHeatingWm3:number}[]}[];runs[2].trace[0].totalHeatingWm3+=100;});
  mutate(o=>{(o.runtime as {pybamm:string}).pybamm='latest';});
 }else if(request.operation==='tandem_spectrum'){
  mutate(o=>{(o.photocurrentAm2 as number[])[0]+=1;});
  mutate(o=>{(o.fourTerminal as {powerWm2:number}).powerWm2+=1;});
  mutate(o=>{(o.twoTerminal as {currentAm2:number}).currentAm2*=.8;});
 }
 const bad=structuredClone(envelope) as {result:{projectApproval:string}};bad.result.projectApproval='approved';assert.throws(()=>validateResearchResponse(bad,request));
 assert.throws(()=>ResearchRequestSchema.parse({...request,plan:{...request.plan,extra:1}}));
}
process.env.JWT_SECRET='science-b-test-only';process.env.PVLIB_RESEARCH_ENABLED='true';delete process.env.SCIENCE_B_ENABLED;delete process.env.PORTFOLIO_ANALYTICS_ENABLED;
const app=express();app.use('/api/v1/research',createResearchRouter({resolveIdentity:req=>req.headers.authorization==='Bearer science-test'?{userId:'science-test'}:{}}));const server=app.listen(0,'127.0.0.1');await once(server,'listening');const a=server.address();assert.ok(a&&typeof a==='object');const origin=`http://127.0.0.1:${a.port}`;
try{
 const run=(request:unknown,auth=true)=>fetch(origin+'/api/v1/research/run',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer science-test'}:{})},body:JSON.stringify(request)});
 assert.equal((await run(requests[0],false)).status,401);assert.equal((await run(requests[0])).status,503);
 let capabilities=await(await fetch(origin+'/api/v1/research/capabilities')).json();assert.equal(capabilities.scienceBEnabled,false);assert.ok(!capabilities.operations.includes('battery_pybamm'));
 process.env.SCIENCE_B_ENABLED='true';capabilities=await(await fetch(origin+'/api/v1/research/capabilities')).json();assert.equal(capabilities.scienceBEnabled,true);assert.ok(capabilities.operations.includes('tandem_spectrum'));assert.ok(!capabilities.operations.includes('hybrid_design'));
 for(const request of requests){const response=await run(request);assert.equal(response.status,200);validateResearchResponse(await response.json(),request);}
 const sdk=await promisify(execFile)(process.env.PVLIB_PYTHON??'python3',['-c',`import json,sys
sys.path.insert(0,'sdk')
from solarpv_sdk import Client
r=Client(sys.argv[1],'science-test',enabled=True).run(json.load(open('docs/examples/science-b/tandem.synthetic.json')))
assert r['envelope']['result']['output']['twoTerminal']['powerWm2']>0
assert not r['energyAdoption'] and not r['financeMutation']
print('PASS B3 SDK real HTTP')`,origin],{timeout:30000});console.log(sdk.stdout.trim());
 delete process.env.SCIENCE_B_ENABLED;assert.equal((await run(requests[0])).status,503);
}finally{server.close();await once(server,'close');}
console.log('PASS B1/B2/B3 actual Python/API, independent ledger/tamper, auth, separate flags/rollback, immutable plans and SDK research boundary');
