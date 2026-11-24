import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {once} from 'node:events';
import express from 'express';
import {ResearchExecutor,createResearchRouter} from '../src/server/researchApi';
import {ResearchRequestSchema,validateResearchResponse} from '../src/studies/researchApi';
const requests=['local','pv'].map(n=>ResearchRequestSchema.parse(JSON.parse(readFileSync(`docs/examples/applied/${n}.json`,'utf8'))));
for(const request of requests){
 const before=JSON.stringify(request),e=await new ResearchExecutor().run(request);validateResearchResponse(e,request);assert.equal(JSON.stringify(request),before);
 const bad=structuredClone(e) as {result:{output:Record<string,unknown>}};
 if(request.operation==='bill_local_ensemble'){
  const o=bad.result.output as {members:{records:{energyKwh:number;offsetMinutes:number}[]}[]};o.members[0].records[0].energyKwh+=1;assert.throws(()=>validateResearchResponse(bad,request));o.members[0].records[0].energyKwh-=1;o.members[0].records[0].offsetMinutes+=60;
 }else{const o=bad.result.output as {scenarios:{lcoe:number}[]};o.scenarios[0].lcoe+=1;}
 assert.throws(()=>validateResearchResponse(bad,request));assert.throws(()=>ResearchRequestSchema.parse({...request,plan:{...request.plan,extra:1}}));
}
process.env.JWT_SECRET='applied-test-only';process.env.PVLIB_RESEARCH_ENABLED='true';delete process.env.APPLIED_RESEARCH_ENABLED;
const app=express();app.use('/api/v1/research',createResearchRouter({resolveIdentity:req=>req.headers.authorization==='Bearer applied-test'?{userId:'applied-test'}:{}}));const server=app.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert.ok(address&&typeof address==='object');const origin=`http://127.0.0.1:${address.port}`;
try{
 const run=(r:unknown,auth=true)=>fetch(origin+'/api/v1/research/run',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer applied-test'}:{})},body:JSON.stringify(r)});
 assert.equal((await run(requests[0],false)).status,401);assert.equal((await run(requests[0])).status,503);
 let c=await(await fetch(origin+'/api/v1/research/capabilities')).json();assert.equal(c.appliedResearchEnabled,false);assert.ok(!c.operations.includes('pv_lcoe_scenarios'));
 process.env.APPLIED_RESEARCH_ENABLED='true';c=await(await fetch(origin+'/api/v1/research/capabilities')).json();assert.equal(c.appliedResearchEnabled,true);
 for(const r of requests){const response=await run(r);assert.equal(response.status,200);validateResearchResponse(await response.json(),r);}
 const sdk=await promisify(execFile)(process.env.PVLIB_PYTHON??'python3',['-c',`import json,sys
sys.path.insert(0,'sdk')
from solarpv_sdk import Client
r=Client(sys.argv[1],'applied-test',enabled=True).run(json.load(open('docs/examples/applied/pv.json')))
assert r['envelope']['result']['operation']=='pv_lcoe_scenarios'
assert not r['energyAdoption'] and not r['financeMutation']
print('PASS applied SDK real HTTP')`,origin],{timeout:30000});console.log(sdk.stdout.trim());
 delete process.env.APPLIED_RESEARCH_ENABLED;assert.equal((await run(requests[0])).status,503);
}finally{server.close();await once(server,'close');}
console.log('PASS applied actual Python, independent witnesses/tamper, authenticated API, flag/rollback and SDK');
