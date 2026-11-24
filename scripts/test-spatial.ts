import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {once} from 'node:events';
import express from 'express';
import {ResearchExecutor,createResearchRouter} from '../src/server/researchApi';
import {ResearchRequestSchema,validateResearchResponse} from '../src/studies/researchApi';
import {SpatialRequestSchema,validateSpatialResult} from '../src/studies/spatialResearch';
const request=SpatialRequestSchema.parse(JSON.parse(readFileSync('docs/examples/stefan/request.json','utf8')));
const before=JSON.stringify(request),e=validateResearchResponse(await new ResearchExecutor().run(request),request);assert.equal(JSON.stringify(request),before);
const mutate=(fn:(o:Record<string,unknown>)=>void)=>{const bad=structuredClone(e) as {result:{output:Record<string,unknown>}};fn(bad.result.output);assert.throws(()=>validateResearchResponse(bad,request));};
for(const key of ['equivalentMeltDepthM','storedJm2','boundaryInputJm2','residualJm2','dxM','steps','stepS'])mutate(o=>{o[key]=Number(o[key])+1;});
for(const key of ['xM','temperatureK','specificEnthalpyJkg','liquidFraction']){mutate(o=>{(o[key] as number[])[0]+=1;});mutate(o=>{(o[key] as number[]).pop();});}
mutate(o=>{o.semiInfiniteComparisonEligible=false;});mutate(o=>{o.rightBoundary='open';});mutate(o=>{o.extra=1;});
for(const [key,value] of [['extra',1],['cells',513],['cells',true],['fourier',.34],['wallK',312],['durationS',Infinity],['contextSha256','bad']])assert.throws(()=>ResearchRequestSchema.parse({...request,plan:{...request.plan,[key as string]:value}}));
assert.throws(()=>ResearchRequestSchema.parse({...request,plan:{...request.plan,cells:512,lengthM:.001,durationS:1e7}}));
const tamperApproval=structuredClone(e) as {result:{projectApproval:string}};tamperApproval.result.projectApproval='approved';assert.throws(()=>validateResearchResponse(tamperApproval,request));
const changed=structuredClone(request);changed.plan.wallK=351;assert.throws(()=>validateSpatialResult(e.result,changed));
for(const [durationS,cells,lengthM] of [[0,8,.28],[10800,80,.28],[10000,32,.01]]){const r=SpatialRequestSchema.parse({...request,plan:{...request.plan,durationS,cells,lengthM}});validateResearchResponse(await new ResearchExecutor().run(r),r);}
process.env.JWT_SECRET='spatial-test-only';process.env.PVLIB_RESEARCH_ENABLED='true';delete process.env.SPATIAL_RESEARCH_ENABLED;process.env.SCIENCE_C_ENABLED='true';process.env.APPLIED_RESEARCH_ENABLED='true';
const app=express();app.use('/api/v1/research',createResearchRouter({resolveIdentity:req=>req.headers.authorization==='Bearer spatial-test'?{userId:'spatial-test'}:{}}));const server=app.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert.ok(address&&typeof address==='object');const origin=`http://127.0.0.1:${address.port}`;
try{
 const run=(r:unknown,auth=true)=>fetch(origin+'/api/v1/research/run',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer spatial-test'}:{})},body:JSON.stringify(r)});
 assert.equal((await run(request,false)).status,401);assert.equal((await run(request)).status,503);
 let c=await(await fetch(origin+'/api/v1/research/capabilities')).json();assert.equal(c.spatialResearchEnabled,false);assert.ok(!c.operations.includes('stefan_spatial'));
 process.env.SPATIAL_RESEARCH_ENABLED='true';delete process.env.SCIENCE_C_ENABLED;delete process.env.APPLIED_RESEARCH_ENABLED;c=await(await fetch(origin+'/api/v1/research/capabilities')).json();assert.equal(c.spatialResearchEnabled,true);assert.ok(c.operations.includes('stefan_spatial'));assert.ok(!c.operations.includes('pvt_pcm'));
 const response=await run(request);assert.equal(response.status,200);validateResearchResponse(await response.json(),request);
 const sdk=await promisify(execFile)(process.env.PVLIB_PYTHON??'python3',['-c',`import json,sys
sys.path.insert(0,'sdk')
from solarpv_sdk import Client
r=Client(sys.argv[1],'spatial-test',enabled=True).run(json.load(open('docs/examples/stefan/request.json')))
assert r['envelope']['result']['operation']=='stefan_spatial'
assert not r['energyAdoption'] and not r['financeMutation']
print('PASS spatial SDK real HTTP')`,origin],{timeout:30000});console.log(sdk.stdout.trim());
 delete process.env.SPATIAL_RESEARCH_ENABLED;assert.equal((await run(request)).status,503);
}finally{server.close();await once(server,'close');}
console.log('PASS spatial actual Python, O(cells) independent witnesses/tamper, auth, independent flags and rollback, SDK');
