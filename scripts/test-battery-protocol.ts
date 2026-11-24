import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {once} from 'node:events';
import express from 'express';
import {ResearchExecutor,createResearchRouter} from '../src/server/researchApi';
import {ResearchRequestSchema,validateResearchResponse} from '../src/studies/researchApi';
import {BatteryProtocolRequestSchema} from '../src/studies/batteryProtocol';
const request=BatteryProtocolRequestSchema.parse(JSON.parse(readFileSync('docs/examples/science-b/protocol.synthetic.json','utf8'))),before=JSON.stringify(request),e=validateResearchResponse(await new ResearchExecutor().run(request),request);assert.equal(JSON.stringify(request),before);
type Output={runs:{meshPoints:number;maxTimeStepS:number;segments:{trace:{capacityAh:number;temperatureK:number;currentA:number;timeS:number;totalHeatingWm3:number}[]}[]}[];capacityLedgerErrorAh:number;timeDelta:{voltageV:number};netDischargeAh:number;referenceHashes:unknown;numericalGate:string};
const mutate=(fn:(o:Output)=>void)=>{const bad=structuredClone(e) as unknown as {result:{output:Output}};fn(bad.result.output);assert.throws(()=>validateResearchResponse(bad,request));};
mutate(o=>{o.runs[0].segments[1].trace[0].capacityAh+=1;});mutate(o=>{o.runs[0].segments[0].trace[1].totalHeatingWm3+=1;});mutate(o=>{o.runs[0].segments[0].trace[1].currentA=0;});mutate(o=>{o.runs[3].maxTimeStepS*=2;});mutate(o=>{o.runs[1].meshPoints++;});mutate(o=>{o.runs[0].segments[0].trace[1].timeS++;});mutate(o=>{o.timeDelta.voltageV++;});mutate(o=>{o.netDischargeAh++;});mutate(o=>{o.referenceHashes={};});mutate(o=>{o.numericalGate='failed_convergence';});
for(const update of [{extra:1},{steps:[]},{sei:true},{steps:[{currentA:11,durationS:30}]},{steps:[{currentA:1,durationS:600},{currentA:1,durationS:600},{currentA:1,durationS:600},{currentA:1,durationS:600}]}])assert.throws(()=>ResearchRequestSchema.parse({...request,plan:{...request.plan,...update}}));
process.env.JWT_SECRET='battery-protocol-test-only';process.env.PVLIB_RESEARCH_ENABLED='true';delete process.env.BATTERY_PROTOCOL_ENABLED;process.env.SCIENCE_B_ENABLED='true';
const app=express();app.use('/api/v1/research',createResearchRouter({resolveIdentity:req=>req.headers.authorization==='Bearer battery-protocol-test'?{userId:'battery-protocol-test'}:{}}));const server=app.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert.ok(address&&typeof address==='object');const origin=`http://127.0.0.1:${address.port}`;
try{
 const run=(r:unknown,auth=true)=>fetch(origin+'/api/v1/research/run',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer battery-protocol-test'}:{})},body:JSON.stringify(r)});
 assert.equal((await run(request,false)).status,401);assert.equal((await run(request)).status,503);let c=await(await fetch(origin+'/api/v1/research/capabilities')).json();assert.equal(c.batteryProtocolEnabled,false);assert.ok(!c.operations.includes('battery_protocol'));
 process.env.BATTERY_PROTOCOL_ENABLED='true';delete process.env.SCIENCE_B_ENABLED;c=await(await fetch(origin+'/api/v1/research/capabilities')).json();assert.equal(c.batteryProtocolEnabled,true);const response=await run(request);assert.equal(response.status,200);validateResearchResponse(await response.json(),request);
 const sdk=await promisify(execFile)(process.env.PVLIB_PYTHON??'python3',['-c',`import json,sys
sys.path.insert(0,'sdk')
from solarpv_sdk import Client
r=Client(sys.argv[1],'battery-protocol-test',enabled=True).run(json.load(open('docs/examples/science-b/protocol.synthetic.json')))
assert r['envelope']['result']['operation']=='battery_protocol'
assert not r['energyAdoption'] and not r['financeMutation']
print('PASS battery protocol SDK real HTTP')`,origin],{timeout:90000});console.log(sdk.stdout.trim());
 delete process.env.BATTERY_PROTOCOL_ENABLED;assert.equal((await run(request)).status,503);
}finally{server.close();await once(server,'close');}
console.log('PASS battery protocol actual kernels, independent ledgers, tamper rejection, authentication, independent flag rollback, SDK');
