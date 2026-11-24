import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {once} from 'node:events';
import express from 'express';
import {ResearchExecutor,createResearchRouter} from '../src/server/researchApi';
import {ResearchRequestSchema,validateResearchResponse} from '../src/studies/researchApi';
const request=ResearchRequestSchema.parse(JSON.parse(readFileSync('docs/examples/portfolio/survival.synthetic.json','utf8')));
assert.equal(request.operation,'cohort_survival');if(request.operation!=='cohort_survival')throw Error();
const before=JSON.stringify(request),envelope=await new ResearchExecutor().run(request);validateResearchResponse(envelope,request);assert.equal(JSON.stringify(request),before);
for(const confidence of [.8,.9,.99]){const varied=structuredClone(request);varied.plan.confidenceLevel=confidence;validateResearchResponse(await new ResearchExecutor().run(varied),varied);}
const unsupported=structuredClone(request);unsupported.plan.remainingHorizonDays=20;unsupported.plan.scoreHorizonDays=20;validateResearchResponse(await new ResearchExecutor().run(unsupported),unsupported);
type Result={result:{status:string;projectApproval:string;output:{curve:{survival:number;atRisk:number;ciLower:number}[];conditional:{restrictedMeanRemainingDays:number|null;status:string};evaluation:{ipcwBrier:number|null};fieldGate:string}}};
const mutations:((r:Result)=>void)[]=[r=>{r.result.output.curve[0].survival=.9;},r=>{r.result.output.curve[0].atRisk++;},r=>{r.result.output.curve[0].ciLower=.99;},r=>{r.result.output.curve[0].ciLower=0;},r=>{r.result.output.conditional.restrictedMeanRemainingDays=10;},r=>{r.result.output.conditional.status='insufficient_support';},r=>{r.result.output.evaluation.ipcwBrier=0;},r=>{r.result.output.fieldGate='passed';},r=>{r.result.projectApproval='approved';},r=>{r.result.status='completed';}];
for(const mutate of mutations){const bad=structuredClone(envelope) as Result;mutate(bad);assert.throws(()=>validateResearchResponse(bad,request));}
for(const mutate of [(p:typeof request.plan)=>{p.records.push({...p.records[0]});},(p:typeof request.plan)=>{p.evaluationSites=p.trainSites;},(p:typeof request.plan)=>{p.records[0].observedUntilUtc='2025-01-01T00:00:00Z';}]){const bad=structuredClone(request);mutate(bad.plan);assert.throws(()=>ResearchRequestSchema.parse(bad));}
process.env.JWT_SECRET='survival-test-only';process.env.PVLIB_RESEARCH_ENABLED='true';delete process.env.PORTFOLIO_ANALYTICS_ENABLED;
const app=express();app.use('/api/v1/research',createResearchRouter({resolveIdentity:req=>req.headers.authorization==='Bearer survival-test'?{userId:'survival-test'}:{}}));const server=app.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert.ok(address&&typeof address==='object');const origin=`http://127.0.0.1:${address.port}`;
try{
 const run=(body:unknown,auth=true)=>fetch(origin+'/api/v1/research/run',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer survival-test'}:{})},body:JSON.stringify(body)});
 assert.equal((await run(request,false)).status,401);assert.equal((await run(request)).status,503);
 const caps=()=>fetch(origin+'/api/v1/research/capabilities').then(r=>r.json());assert.ok(!(await caps()).operations.includes('cohort_survival'));
 process.env.PORTFOLIO_ANALYTICS_ENABLED='true';assert.ok((await caps()).operations.includes('cohort_survival'));
 const response=await run(request);assert.equal(response.status,200);validateResearchResponse(await response.json(),request);
 assert.equal((await run({...request,plan:{...request.plan,extra:1}})).status,400);
 const sdk=await promisify(execFile)(process.env.PVLIB_PYTHON??'python3',['-c',`import json,sys
sys.path.insert(0,'sdk')
from solarpv_sdk import Client
r=Client(sys.argv[1],'survival-test',enabled=True).run(json.load(open('docs/examples/portfolio/survival.synthetic.json')))
o=r['envelope']['result']['output']
assert abs(o['conditional']['restrictedMeanRemainingDays']-8/3)<1e-10
assert not r['energyAdoption'] and not r['financeMutation']
print('PASS survival SDK actual HTTP')`,origin],{timeout:30000});console.log(sdk.stdout.trim());
 delete process.env.PORTFOLIO_ANALYTICS_ENABLED;assert.equal((await run(request)).status,503);
}finally{server.close();await once(server,'close');}
console.log('PASS cohort survival: actual Python, independent result/tamper checks, HTTP auth/flags/rollback, SDK, immutable research boundary');
