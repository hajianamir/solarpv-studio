import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {once} from 'node:events';
import express from 'express';
import {ResearchExecutor,createResearchRouter} from '../src/server/researchApi';
import {ResearchRequestSchema,validateResearchResponse} from '../src/studies/researchApi';
import {IncoherentRequestSchema} from '../src/studies/incoherentOptics';
const request=IncoherentRequestSchema.parse(JSON.parse(readFileSync('docs/examples/references/incoherent.json','utf8'))),before=JSON.stringify(request),e=validateResearchResponse(await new ResearchExecutor().run(request),request);assert.equal(JSON.stringify(request),before);
const mutate=(fn:(o:Record<string,unknown>)=>void)=>{const bad=structuredClone(e) as {result:{output:Record<string,unknown>}};fn(bad.result.output);assert.throws(()=>validateResearchResponse(bad,request));};
for(const k of ['incidentWm2','reflectedWm2','transmittedWm2','absorbedWm2','residualWm2'])mutate(o=>{o[k]=Number(o[k])+1;});
mutate(o=>{const row=(o.trace as {reflectance:number;transmittance:number}[])[0];row.reflectance+=.01;row.transmittance-=.01;});mutate(o=>{o.referenceHashes={};});mutate(o=>{(o.runtime as {version:string}).version='latest';});
for(const mutate of [(p:typeof request.plan)=>{p.layers[1].n.pop();},(p:typeof request.plan)=>{p.layers[1].thicknessNm=500;},(p:typeof request.plan)=>{p.layers[1].thicknessNm=1e9;},(p:typeof request.plan)=>{p.layers[0].k[0]=.1;}]){const p=structuredClone(request.plan);mutate(p);assert.throws(()=>ResearchRequestSchema.parse({...request,plan:p}));}
assert.throws(()=>ResearchRequestSchema.parse({...request,plan:{...request.plan,path:'/etc/passwd'}}));
for(const count of [1,2,4]){const r=structuredClone(request);r.plan.layers.splice(1,1,...Array.from({length:count},(_,i)=>({...structuredClone(request.plan.layers[1]),n:[1.5+i*.2,1.6+i*.2,1.7+i*.2]})));validateResearchResponse(await new ResearchExecutor().run(r),r);}
const configured=process.env.PVLIB_REFERENCE_PYTHON;assert.ok(configured);delete process.env.PVLIB_REFERENCE_PYTHON;await assert.rejects(()=>new ResearchExecutor().run(request),/Optional reference runtime/);process.env.PVLIB_REFERENCE_PYTHON=configured;
process.env.JWT_SECRET='incoherent-test-only';process.env.PVLIB_RESEARCH_ENABLED='true';delete process.env.INCOHERENT_OPTICS_ENABLED;process.env.REFERENCE_MODELS_ENABLED='true';
const app=express();app.use('/api/v1/research',createResearchRouter({resolveIdentity:req=>req.headers.authorization==='Bearer incoherent-test'?{userId:'incoherent-test'}:{}}));const server=app.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert.ok(address&&typeof address==='object');const origin=`http://127.0.0.1:${address.port}`;
try{
 const run=(r:unknown,auth=true)=>fetch(origin+'/api/v1/research/run',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer incoherent-test'}:{})},body:JSON.stringify(r)});
 assert.equal((await run(request,false)).status,401);assert.equal((await run(request)).status,503);let c=await(await fetch(origin+'/api/v1/research/capabilities')).json();assert.equal(c.incoherentOpticsEnabled,false);assert.ok(!c.operations.includes('incoherent_optics'));
 process.env.INCOHERENT_OPTICS_ENABLED='true';delete process.env.REFERENCE_MODELS_ENABLED;assert.equal((await run(request)).status,503);process.env.REFERENCE_MODELS_ENABLED='true';c=await(await fetch(origin+'/api/v1/research/capabilities')).json();assert.equal(c.incoherentOpticsEnabled,true);
 const response=await run(request);assert.equal(response.status,200);validateResearchResponse(await response.json(),request);
 const sdk=await promisify(execFile)(process.env.PVLIB_PYTHON??'python3',['-c',`import json,sys
sys.path.insert(0,'sdk')
from solarpv_sdk import Client
r=Client(sys.argv[1],'incoherent-test',enabled=True).run(json.load(open('docs/examples/references/incoherent.json')))
assert r['envelope']['result']['operation']=='incoherent_optics'
assert not r['energyAdoption'] and not r['financeMutation']
print('PASS incoherent SDK real HTTP')`,origin],{timeout:30000});console.log(sdk.stdout.trim());
 delete process.env.INCOHERENT_OPTICS_ENABLED;assert.equal((await run(request)).status,503);
}finally{server.close();await once(server,'close');}
console.log('PASS incoherent actual engine, independent geometric-series/tamper, separate runtime, auth, dual flags/rollback and SDK');
