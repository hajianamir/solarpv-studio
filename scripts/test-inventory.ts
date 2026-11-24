import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {once} from 'node:events';
import express from 'express';
import {ResearchExecutor,createResearchRouter} from '../src/server/researchApi';
import {ResearchRequestSchema,validateResearchResponse} from '../src/studies/researchApi';
import {MaterialInventoryRequestSchema} from '../src/studies/materialInventory';
const request=MaterialInventoryRequestSchema.parse(JSON.parse(readFileSync('docs/examples/references/inventory.json','utf8'))),before=JSON.stringify(request),e=validateResearchResponse(await new ResearchExecutor().run(request),request);assert.equal(JSON.stringify(request),before);
const mutate=(fn:(o:Record<string,unknown>)=>void)=>{const bad=structuredClone(e) as {result:{output:Record<string,unknown>}};fn(bad.result.output);assert.throws(()=>validateResearchResponse(bad,request));};
mutate(o=>{const m=(o.materials as {trace:{usedInModulesKg:number}[]}[])[0];m.trace[0].usedInModulesKg+=1;});
mutate(o=>{(o.selectedMaterialTotals as {landfillKg:number}).landfillKg+=1;});
mutate(o=>{(o.reconciliation as {status:string}).status='outside_declared_tolerance';});
mutate(o=>{(o.reconciliation as {comparisons:{residualKg:number}[]}).comparisons[0].residualKg+=1;});
mutate(o=>{o.referenceHashes={};});mutate(o=>{(o.runtime as {version:string}).version='latest';});
assert.throws(()=>ResearchRequestSchema.parse({...request,plan:{...request.plan,path:'/etc/passwd'}}));
assert.throws(()=>ResearchRequestSchema.parse({...request,plan:{...request.plan,materials:['glass','glass']}}));
for(const context of ['b'.repeat(64),null]){const r=structuredClone(request);if(context===null)r.plan.inventory=null;else r.plan.inventory!.contextSha256=context;validateResearchResponse(await new ResearchExecutor().run(r),r);}
const configured=process.env.PVLIB_REFERENCE_PYTHON;assert.ok(configured);delete process.env.PVLIB_REFERENCE_PYTHON;await assert.rejects(()=>new ResearchExecutor().run(request),/Optional reference runtime/);process.env.PVLIB_REFERENCE_PYTHON=configured;
process.env.JWT_SECRET='inventory-test-only';process.env.PVLIB_RESEARCH_ENABLED='true';delete process.env.MATERIAL_INVENTORY_ENABLED;process.env.REFERENCE_MODELS_ENABLED='true';
const app=express();app.use('/api/v1/research',createResearchRouter({resolveIdentity:req=>req.headers.authorization==='Bearer inventory-test'?{userId:'inventory-test'}:{}}));const server=app.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert.ok(address&&typeof address==='object');const origin=`http://127.0.0.1:${address.port}`;
try{
 const run=(r:unknown,auth=true)=>fetch(origin+'/api/v1/research/run',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer inventory-test'}:{})},body:JSON.stringify(r)});
 assert.equal((await run(request,false)).status,401);assert.equal((await run(request)).status,503);let c=await(await fetch(origin+'/api/v1/research/capabilities')).json();assert.equal(c.materialInventoryEnabled,false);assert.ok(!c.operations.includes('pvice_inventory'));
 process.env.MATERIAL_INVENTORY_ENABLED='true';delete process.env.REFERENCE_MODELS_ENABLED;assert.equal((await run(request)).status,503);process.env.REFERENCE_MODELS_ENABLED='true';c=await(await fetch(origin+'/api/v1/research/capabilities')).json();assert.equal(c.materialInventoryEnabled,true);
 const response=await run(request);assert.equal(response.status,200);validateResearchResponse(await response.json(),request);
 const sdk=await promisify(execFile)(process.env.PVLIB_PYTHON??'python3',['-c',`import json,sys
sys.path.insert(0,'sdk')
from solarpv_sdk import Client
r=Client(sys.argv[1],'inventory-test',enabled=True).run(json.load(open('docs/examples/references/inventory.json')))
assert r['envelope']['result']['operation']=='pvice_inventory'
assert not r['energyAdoption'] and not r['financeMutation']
print('PASS inventory SDK real HTTP')`,origin],{timeout:30000});console.log(sdk.stdout.trim());
 delete process.env.MATERIAL_INVENTORY_ENABLED;assert.equal((await run(request)).status,503);
}finally{server.close();await once(server,'close');}
console.log('PASS inventory actual engine, independent material-ledger/tamper, separate runtime, auth, dual flags/rollback and SDK');
