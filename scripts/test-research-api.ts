import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import express from 'express';
import {once} from 'node:events';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHmac} from 'node:crypto';
import {ResearchExecutor,createResearchRouter} from '../src/server/researchApi';
import {ResearchRequestSchema,validateResearchResponse} from '../src/studies/researchApi';
import {thermalExample,circuitExample} from '../src/studies/researchExamples';
import {StudyError} from '../src/server/pvlibStudy';
const thermal=ResearchRequestSchema.parse(thermalExample),circuit=ResearchRequestSchema.parse(circuitExample);
const badThermal=[
 {...thermalExample,plan:{...thermalExample.plan,source:' '}},
 {...thermalExample,plan:{...thermalExample.plan,maxSteps:1}},
 {...thermalExample,plan:{...thermalExample.plan,stepS:10}},
 {...thermalExample,plan:{...thermalExample.plan,initial:{cellC:200,backC:25}}},
 {...thermalExample,plan:{...thermalExample.plan,parameters:{...thermalExample.plan.parameters,windHeightM:10}}},
 ...['2026-01-01T12:00:00','2026-02-30T12:00:00Z','2026-01-01 12:00:00+00:00'].map(start=>({...thermalExample,plan:{...thermalExample.plan,intervals:[{...thermalExample.plan.intervals[0],start}]}})),
 {...thermalExample,plan:{...thermalExample.plan,intervals:[{...thermalExample.plan.intervals[0],windMps:25}]}},
 {...thermalExample,plan:{...thermalExample.plan,unexpected:true}},
];
const badCircuit=[
 {...circuitExample,plan:{...circuitExample.plan,strings:[['bright','bright']]}},
 {...circuitExample,plan:{...circuitExample.plan,strings:[['bright']]}},
 {...circuitExample,plan:{...circuitExample.plan,substrings:[]}},
 {...circuitExample,plan:{...circuitExample.plan,substrings:[{...circuitExample.plan.substrings[0],saturationCurrentA:0}]}},
 {...circuitExample,plan:{...circuitExample.plan,currentToleranceA:0}},
 {...circuitExample,plan:{...circuitExample.plan,maxEvaluations:1}},
];
const cases=[thermalExample,circuitExample,...badThermal,...badCircuit];
const py=spawnSync(process.env.PVLIB_PYTHON??'python',['-c',`import json,sys
from services.pvlib_research.advanced_thermal import validate as thermal
from services.pvlib_research.diode_network import validate as circuit
out=[]
for r in json.load(sys.stdin):
 try:
  (thermal if r['operation']=='thermal_two_node' else circuit)(r['plan']);out.append(True)
 except (ValueError,TypeError,KeyError):out.append(False)
print(json.dumps(out))`],{input:JSON.stringify(cases),encoding:'utf8'});
assert.equal(py.status,0,py.stderr);assert.deepEqual(JSON.parse(py.stdout),cases.map(r=>ResearchRequestSchema.safeParse(r).success));assert.deepEqual(JSON.parse(py.stdout),[true,true,...Array(16).fill(false)]);

for(const req of [thermal,circuit]){const data=await new ResearchExecutor().run(req);validateResearchResponse(data,req);if(req.operation==='thermal_two_node'){const corrupt=structuredClone(data) as {result:{trace:{cellC:number}[]}};corrupt.result.trace[0].cellC+=1;assert.throws(()=>validateResearchResponse(corrupt,req));}
 const bad=structuredClone(data) as {requestSha256:string};bad.requestSha256='0'.repeat(64);assert.throws(()=>validateResearchResponse(bad,req));}
const integrated=ResearchRequestSchema.parse({operation:'integrated',plan:JSON.parse(readFileSync('docs/examples/research/integrated-synthetic-plan.json','utf8'))});
validateResearchResponse(await new ResearchExecutor().run(integrated),integrated);
process.env.NODE_ENV='production';process.env.PVLIB_RESEARCH_ENABLED='true';process.env.JWT_SECRET='research-test-only';process.env.JWT_ISSUER='research';process.env.JWT_AUDIENCE='research';
const {app}=await import('../server');const server=app.listen(0,'127.0.0.1');await once(server,'listening');const addr=server.address();assert.ok(addr&&typeof addr==='object');const url=`http://127.0.0.1:${addr.port}/api/v1/research/run`;
const header=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),claims=Buffer.from(JSON.stringify({sub:'research-user',iss:'research',aud:'research',exp:Math.floor(Date.now()/1000)+300})).toString('base64url');
const token=`${header}.${claims}.${createHmac('sha256',process.env.JWT_SECRET).update(`${header}.${claims}`).digest('base64url')}`;
const send=(raw:string,auth=false)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${token}`}:{'x-user-id':'forgery'})},body:raw});
try{
 process.env.PVLIB_RESEARCH_ENABLED='false';assert.equal((await send('{')).status,503);process.env.PVLIB_RESEARCH_ENABLED='true';
 const savedSecret=process.env.JWT_SECRET;delete process.env.JWT_SECRET;assert.equal((await send('{')).status,503);process.env.JWT_SECRET=savedSecret;
 assert.equal((await send('{')).status,401);assert.equal((await send('{',true)).status,400);
 assert.equal((await send(JSON.stringify({}),true)).status,400);
 const good=await send(JSON.stringify(thermal),true);assert.equal(good.status,200,await good.clone().text());assert.equal(good.headers.get('cache-control'),'no-store');validateResearchResponse(await good.json(),thermal);
 assert.equal((await send(JSON.stringify({large:'x'.repeat(8*1024*1024)}),true)).status,413);
}finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
const temp=mkdtempSync(path.join(os.tmpdir(),'research-api-'));
try{
 const script=path.join(temp,'sleep.py');writeFileSync(script,'import time\ntime.sleep(60)\n');
 const controller=new AbortController(),executor=new ResearchExecutor({script,timeoutMs:10000});const running=executor.run(thermal,controller.signal);
 await assert.rejects(executor.run(thermal),(e:unknown)=>e instanceof StudyError&&e.code==='BUSY');controller.abort();await assert.rejects(running,(e:unknown)=>e instanceof StudyError&&e.code==='CANCELLED');assert.equal(executor.activeCount,0);
 await assert.rejects(new ResearchExecutor({script,timeoutMs:50}).run(thermal),(e:unknown)=>e instanceof StudyError&&e.code==='TIMEOUT');
 writeFileSync(script,"print('x'*10000)\n");await assert.rejects(new ResearchExecutor({script,maxOutputBytes:100}).run(thermal),(e:unknown)=>e instanceof StudyError&&e.code==='OUTPUT_LIMIT');
 writeFileSync(script,"print('{}')\n");await assert.rejects(new ResearchExecutor({script}).run(thermal),(e:unknown)=>e instanceof StudyError&&e.code==='INVALID_RESULT');
 // Process-tree timeout: descendant inherits process group, but redirects pipes.
 if(process.platform!=='win32'){
  const pidfile=path.join(temp,'pid');writeFileSync(script,`import subprocess,time\np=subprocess.Popen(['${process.env.PVLIB_PYTHON??'python3'}','-c','import time;time.sleep(60)'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)\nopen(${JSON.stringify(pidfile)},'w').write(str(p.pid))\ntime.sleep(60)\n`);
  await assert.rejects(new ResearchExecutor({script,timeoutMs:1500}).run(thermal));const pid=Number(readFileSync(pidfile,'utf8'));
  let alive=false;try{process.kill(pid,0);alive=true;}catch{}
  if(alive){const state=readFileSync(`/proc/${pid}/stat`,'utf8').split(' ')[2];assert.equal(state,'Z','Descendant must not be executing');}
 }
}finally{rmSync(temp,{recursive:true,force:true});}
const limited=express();limited.use(createResearchRouter({resolveIdentity:()=>({userId:'test'})}));const s=limited.listen(0,'127.0.0.1');await once(s,'listening');try{const a=s.address();assert.ok(a&&typeof a==='object');for(let i=0;i<7;i++){const r:Response=await fetch(`http://127.0.0.1:${a.port}/run`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,i===6?429:400);}}finally{s.closeAllConnections();s.close();}
console.log('PASS research: three actual models, binding/tamper, real JWT/auth-before-parser, disabled/body/rate/capacity/cancel/timeout/output/process-tree');
