import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync} from 'node:fs';
import express from 'express';
import {once} from 'node:events';
import {ResearchExecutor,createResearchRouter} from '../src/server/researchApi';
import {ResearchRequestSchema,validateResearchResponse} from '../src/studies/researchApi';
import {PortfolioRequestSchema,validatePortfolioResult} from '../src/studies/portfolioAnalytics';
import {attachExternalGeneration,twinFromExternal} from '../src/studies/portfolioDataAdapters';
import {uqHash} from '../src/studies/financialUqArchive';
const requests=['uq','hybrid','twin','convergence','design','holdout'].map(n=>ResearchRequestSchema.parse(JSON.parse(readFileSync(`docs/examples/portfolio/${n}.synthetic.json`,'utf8'))));
for(const request of requests){
 const before=JSON.stringify(request);const result=await new ResearchExecutor().run(request);validateResearchResponse(result,request);assert.equal(JSON.stringify(request),before);
 const e=result as {result:{projectApproval:string;output:Record<string,unknown>}};assert.equal(e.result.projectApproval,'blocked');
 const bad=structuredClone(e);bad.result.projectApproval='approved';assert.throws(()=>validateResearchResponse(bad,request));
 const corrupt=structuredClone(result) as {result:{output:Record<string,unknown>}};
 if(request.operation==='hybrid_sizing'){
  const candidates=corrupt.result.output.candidates as {status:string;trace?:{storedKwh:number}[]}[];candidates.find(x=>x.status==='feasible')!.trace![0].storedKwh+=1;
 }else if(request.operation==='project_uq')corrupt.result.output.calibrationGate='passed';else if(request.operation==='batch_twin')corrupt.result.output.baselineSha256='c'.repeat(64);else if(request.operation==='hybrid_design')(corrupt.result.output.design as {pvKwp:number}).pvKwp+=1;else if(request.operation==='uq_convergence')corrupt.result.output.calibrationGate='passed';else corrupt.result.output.fieldGate='passed';
 assert.throws(()=>validateResearchResponse(corrupt,request));
 if(request.operation==='hybrid_design'){
  for(const mutate of [
   (o:Record<string,unknown>)=>{o.design=null;o.objective=null;o.dualBound=null;o.relativeGap=null;o.trace=[];o.qualified=false;},
   (o:Record<string,unknown>)=>{o.dualBound=0;},
   (o:Record<string,unknown>)=>{o.dualBound=null;},
   (o:Record<string,unknown>)=>{o.solverStatus=1;},
   (o:Record<string,unknown>)=>{o.qualified=false;},
  ]){const tampered=structuredClone(result) as {result:{output:Record<string,unknown>}};mutate(tampered.result.output);assert.throws(()=>validateResearchResponse(tampered,request));}
 }
 if(request.operation==='twin_site_holdout'){
  const tampered=structuredClone(result) as {result:{output:Record<string,unknown>}};tampered.result.output.excludedPairs=100;assert.throws(()=>validateResearchResponse(tampered,request));
 }
 assert.throws(()=>ResearchRequestSchema.parse({...request,plan:{...request.plan,extra:true}}));
}
const context={projectId:'SYNTHETIC',assetId:'meter',projectRevisionSha256:'a'.repeat(64),latitude:40,longitude:-74,boundary:'inverter_ac'};
const target={context,startUtc:'2024-01-01T00:00:00Z',endUtc:'2024-01-01T02:00:00Z',intervalMinutes:60};
const series={schemaVersion:'external-series-v1',kind:'external_generation',origin:'wind',source:'SYNTHETIC adapter only',sourceVersion:'1',quality:'assumed',context,timezone:'UTC',intervalMinutes:60,timestampConvention:'interval_end',statistic:'interval_mean',unit:'kW',powerConvention:'positive_export_negative_import',records:[{timestamp:'2024-01-01T01:00:00Z',value:1,quality:'valid'},{timestamp:'2024-01-01T02:00:00Z',value:2,quality:'valid'}]};
const hybrid=PortfolioRequestSchema.parse(requests[1]);assert.equal(hybrid.operation,'hybrid_sizing');if(hybrid.operation!=='hybrid_sizing')throw Error();hybrid.plan.contextSha256=uqHash(context);
assert.throws(()=>attachExternalGeneration(hybrid,series,target));
const adapted=attachExternalGeneration(hybrid,series,target,true);assert.equal(adapted.operation,'hybrid_sizing');if(adapted.operation==='hybrid_sizing')assert.equal(adapted.plan.records[1].externalGenerationKwh,2);
assert.throws(()=>attachExternalGeneration(hybrid,{...series,context:{...context,assetId:'other'}},target,true));
const tc={...context,boundary:'poi'},tt={...target,context:tc,endUtc:'2024-01-01T04:00:00Z'};
const obs={...series,context:tc,kind:'scada',origin:'meter',records:Array.from({length:4},(_,i)=>({timestamp:`2024-01-01T0${i+1}:00:00Z`,value:1,quality:'valid'}))};
const twin=twinFromExternal(obs,obs,tt,{source:'SYNTHETIC adapter test only',baselineSource:'SYNTHETIC same series; NOT independent evidence',trainEndUtc:'2024-01-01T02:00:00Z',thresholdFraction:.1,minimumExpectedW:1,minimumEvaluationPairs:2,annotations:obs.records.map(()=>({event:'none',knownHealthy:null}))},true);assert.equal(twin.operation,'batch_twin');
const twinResult=await new ResearchExecutor().run(twin);validateResearchResponse(twinResult,twin);
process.env.JWT_SECRET='synthetic-only';process.env.PVLIB_RESEARCH_ENABLED='true';delete process.env.PORTFOLIO_ANALYTICS_ENABLED;
const app=express();app.use('/advanced/api/v1/research',createResearchRouter({resolveIdentity:req=>req.headers.authorization==='Bearer synthetic'?{userId:'test'}:{}}));app.use('/api/v1/research',createResearchRouter({resolveIdentity:req=>req.headers.authorization==='Bearer synthetic'?{userId:'test'}:{}}));const server=app.listen(0,'127.0.0.1');await once(server,'listening');const a=server.address();assert.ok(a&&typeof a==='object');const origin=`http://127.0.0.1:${a.port}/api/v1/research`;
try{
 const run=(x:unknown,auth=true)=>fetch((typeof x==='object'&&x!==null&&['uq_convergence','hybrid_design','twin_site_holdout'].includes((x as {operation:string}).operation)?origin.replace('/api/','/advanced/api/'):origin)+'/run',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer synthetic'}:{})},body:JSON.stringify(x)});
 assert.equal((await run(requests[0],false)).status,401);
 for(const request of [requests[0],...requests.slice(3)])assert.equal((await run(request)).status,503);process.env.PORTFOLIO_ANALYTICS_ENABLED='true';
 const cap=await(await fetch(origin+'/capabilities')).json();assert.ok(cap.operations.includes('hybrid_sizing'));
 for(const request of requests){const response=await run(request);assert.equal(response.status,200);validateResearchResponse(await response.json(),request);}
 const invalid=structuredClone(requests[1]);if(invalid.operation==='hybrid_sizing')invalid.plan.records[1].timestamp=invalid.plan.records[0].timestamp;assert.equal((await run(invalid)).status,400);
 const sdk=await promisify(execFile)(process.env.PVLIB_PYTHON??'python3',['-c',`import json,sys
sys.path.insert(0,'sdk')
from solarpv_sdk import Client
r=Client(sys.argv[1],'synthetic',enabled=True).run(json.load(open('docs/examples/portfolio/hybrid.synthetic.json')))
assert r['envelope']['result']['output']['bestCandidateId']=='pv-bess' and not r['energyAdoption']
print('PASS SDK real hybrid sizing job')`,origin.replace('/api/v1/research','')],{timeout:30000});console.log(sdk.stdout.trim());
}finally{server.close();await once(server,'close');}
console.log('PASS A1–A3 actual Python/API: strict request/result/tamper validation, flags/auth, immutable requests, F1 context/coverage/boundary adapters and blocked research adoption');
