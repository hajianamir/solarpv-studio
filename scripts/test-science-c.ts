import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {once} from 'node:events';
import express from 'express';
import {ResearchExecutor,createResearchRouter} from '../src/server/researchApi';
import {ResearchRequestSchema,validateResearchResponse} from '../src/studies/researchApi';
const requests=['grid','agri','fpv','pem','pcm'].map(name=>ResearchRequestSchema.parse(JSON.parse(readFileSync(`docs/examples/science-c/${name}.request.json`,'utf8'))));
for(const request of requests){
 const before=JSON.stringify(request),envelope=await new ResearchExecutor().run(request);validateResearchResponse(envelope,request);assert.equal(JSON.stringify(request),before);
 const mutate=(fn:(o:Record<string,unknown>)=>void)=>{const bad=structuredClone(envelope) as {result:{output:Record<string,unknown>}};fn(bad.result.output);assert.throws(()=>validateResearchResponse(bad,request));};
 if(request.operation==='grid_support'){
  mutate(o=>{(o.trace as {pKw:number}[])[0].pKw+=1;});mutate(o=>{o.certificate=true;});mutate(o=>{o.antiIslanding='pass';});
 }else if(request.operation==='agri_water'){
  mutate(o=>{(o.shaded as {trace:{endWaterMm:number}[]}).trace[0].endWaterMm+=1;});mutate(o=>{o.landEquivalentRatio=99;});
 }else if(request.operation==='fpv_balance'){
  mutate(o=>{(o.covered as {trace:{temperatureC:number}[]}).trace[0].temperatureC+=1;});mutate(o=>{o.numericalGate='failed_refinement';});
 }else if(request.operation==='pem_dispatch'){
  mutate(o=>{(o.trace as {hydrogenKg:number}[])[0].hydrogenKg+=1;});mutate(o=>{(o.trace as {currentA:number}[])[0].currentA+=1;});
 }else{
  mutate(o=>{(o.fine as {trace:{enthalpyJm2:number}[]}).trace[0].enthalpyJm2+=1;});mutate(o=>{o.numericalGate='failed_refinement';});
 }
 const bad=structuredClone(envelope) as {result:{projectApproval:string}};bad.result.projectApproval='approved';assert.throws(()=>validateResearchResponse(bad,request));
 assert.throws(()=>ResearchRequestSchema.parse({...request,plan:{...request.plan,extra:1}}));
}
// Independent nontrivial witnesses: control boundaries, phase crossings, startup and flow steps.
const variants:unknown[]=[];
for(const request of requests){
 const v=structuredClone(request);
 if(v.operation==='grid_support'){
  v.plan.rulepack={id:'synthetic',version:'1',source:'Synthetic declared test band',documentSha256:'e'.repeat(64),contextSha256:v.plan.contextSha256,voltageMinPu:.95,voltageMaxPu:1.05,frequencyMinHz:49,frequencyMaxHz:51,tripDeadlineS:2};
  v.plan.records=[.9,.9,.9,1,.2].map((voltagePu,i)=>({timestamp:new Date(Date.UTC(2026,0,1,0,0,i)).toISOString(),voltagePu,frequencyHz:50,availableKw:8,connected:i===1?null:i!==2}));
 }else if(v.operation==='agri_water'){
  v.plan.initialWaterMm=0;v.plan.records=[0,200,0].map((rainMm,i)=>({...v.plan.records[0],timestamp:new Date(Date.UTC(2026,0,i+1)).toISOString(),rainMm}));
 }else if(v.operation==='fpv_balance'){
  v.plan.records=[0,500,0].map((solarWm2,i)=>({...v.plan.records[0],timestamp:new Date(Date.UTC(2026,0,1,i)).toISOString(),solarWm2}));
 }else if(v.operation==='pem_dispatch'){
  v.plan.startupS=15;v.plan.startupW=100;v.plan.activationV=.1;v.plan.resistanceOhm=.01;v.plan.rampAPerS=1;
  v.plan.records=[800,800,800,900,200,0,800].map((availableW,i)=>({timestamp:new Date(Date.UTC(2026,0,1,0,0,i*10)).toISOString(),availableW}));
 }else if(v.operation==='pvt_pcm'){
  v.plan.efficiencyRef=.2;v.plan.gammaPerK=-.004;v.plan.ambientLossWm2K=5;v.plan.fluidUaWm2K=10;
  v.plan.records=[0,50,10,0].map((flowHeatCapacityWm2K,i)=>({...v.plan.records[0],timestamp:new Date(Date.UTC(2026,0,1,0,0,i*100)).toISOString(),solarWm2:500,inletC:20,airC:20,flowHeatCapacityWm2K}));
 }
 variants.push(v);
}
for(const v of variants){const request=ResearchRequestSchema.parse(v),envelope=await new ResearchExecutor().run(request);validateResearchResponse(envelope,request);}
process.env.JWT_SECRET='science-c-test-only';process.env.PVLIB_RESEARCH_ENABLED='true';delete process.env.SCIENCE_C_ENABLED;delete process.env.PORTFOLIO_ANALYTICS_ENABLED;delete process.env.SCIENCE_B_ENABLED;delete process.env.SCIENCE_D_ENABLED;
const app=express();app.use('/api/v1/research',createResearchRouter({resolveIdentity:req=>req.headers.authorization==='Bearer science-test'?{userId:'science-test'}:{}}));const server=app.listen(0,'127.0.0.1');await once(server,'listening');const a=server.address();assert.ok(a&&typeof a==='object');const origin=`http://127.0.0.1:${a.port}`;
try{
 const run=(request:unknown,auth=true)=>fetch(origin+'/api/v1/research/run',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer science-test'}:{})},body:JSON.stringify(request)});
 assert.equal((await run(requests[0],false)).status,401);assert.equal((await run(requests[0])).status,503);
 let capabilities=await(await fetch(origin+'/api/v1/research/capabilities')).json();assert.equal(capabilities.scienceCEnabled,false);assert.ok(!capabilities.operations.includes('pem_dispatch'));
 process.env.SCIENCE_C_ENABLED='true';capabilities=await(await fetch(origin+'/api/v1/research/capabilities')).json();assert.equal(capabilities.scienceCEnabled,true);assert.ok(capabilities.operations.includes('pvt_pcm'));assert.ok(!capabilities.operations.includes('hybrid_design'));assert.ok(!capabilities.operations.includes('tandem_spectrum'));assert.equal(capabilities.scienceBEnabled,false);
 for(const request of requests){const response=await run(request);assert.equal(response.status,200);validateResearchResponse(await response.json(),request);}
 const sdkApp=express();sdkApp.use('/api/v1/research',createResearchRouter({resolveIdentity:()=>({userId:'sdk-test'})}));const sdkServer=sdkApp.listen(0,'127.0.0.1');await once(sdkServer,'listening');try{const addr=sdkServer.address();assert.ok(addr&&typeof addr==='object');
 const sdk=await promisify(execFile)(process.env.PVLIB_PYTHON??'python3',['-c',`import json,sys
sys.path.insert(0,'sdk')
from solarpv_sdk import Client
for name in ['grid','agri','fpv','pem','pcm']:
 r=Client(sys.argv[1],'science-test',enabled=True).run(json.load(open('docs/examples/science-c/'+name+'.request.json')))
 assert r['envelope']['result']['projectApproval']=='blocked'
 assert not r['energyAdoption'] and not r['financeMutation']
print('PASS five C operations SDK real HTTP')`,`http://127.0.0.1:${addr.port}`],{timeout:30000});console.log(sdk.stdout.trim());
 }finally{sdkServer.close();await once(sdkServer,'close');}
 delete process.env.SCIENCE_C_ENABLED;const rollbackApp=express();rollbackApp.use('/api/v1/research',createResearchRouter({resolveIdentity:()=>({userId:'rollback-test'})}));const rollback=rollbackApp.listen(0,'127.0.0.1');await once(rollback,'listening');try{const address=rollback.address();assert.ok(address&&typeof address==='object');assert.equal((await fetch(`http://127.0.0.1:${address.port}/api/v1/research/run`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(requests[0])})).status,503);}finally{rollback.close();await once(rollback,'close');}
}finally{server.close();await once(server,'close');}
console.log('PASS C1/C2/C3 actual Python/API, independent ledger/tamper, auth, separate flags/rollback, immutable plans and SDK research boundary');
