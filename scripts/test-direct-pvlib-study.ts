import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {createHmac} from 'node:crypto';
import express from 'express';
import {StudyExecutor,StudyError,createStudyRouter} from '../src/server/pvlibStudy';
import {StudyRequestSchema,type StudyResult} from '../src/studies/studyContract';
process.env.NODE_ENV='test';process.env.PVLIB_STUDY_ENABLED='true';
const python=process.env.PVLIB_PYTHON??(process.platform==='win32'?'python':'python3');
const request=StudyRequestSchema.parse(JSON.parse(readFileSync('services/pvlib_study/tests/synthetic-study.json','utf8')));
for(const change of [
 (r:typeof request)=>{r.weather.records[0].timestamp='2017-04-01T17:00:00';},
 (r:typeof request)=>{r.weather.records[0].timestamp='2017-02-30T17:00:00Z';},
 (r:typeof request)=>{r.weather.records[0].ghiWm2=NaN;},
 (r:typeof request)=>{r.weather.records.reverse();},
 (r:typeof request)=>{r.system.inverterPdc0W=1;},
]){const bad=structuredClone(request);change(bad);assert.equal(StudyRequestSchema.safeParse(bad).success,false);}
const {app}=await import('../server');
const server=app.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert.ok(address&&typeof address==='object');
const base=`http://127.0.0.1:${address.port}`;
const send=(body:unknown=request,headers:Record<string,string>={})=>fetch(`${base}/api/v1/studies/run`,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
const temp=mkdtempSync(path.join(os.tmpdir(),'pvlib-study-'));
try{
  const cap=await (await fetch(`${base}/api/v1/studies/capabilities`)).json();assert.equal(cap.runtimeStatus,'not_probed');assert.equal(cap.enabled,true);assert.ok(cap.thermalCapabilities.includes('pvsyst_explicit_10m_coefficients'));assert.ok(cap.supportedTemperatureModels.includes('explicit_cell_temperature_schedule'));assert.ok(cap.supportedModes.includes('single_axis_monofacial'));
  process.env.PVLIB_STUDY_ENABLED='false';assert.equal((await send()).status,503);
  process.env.PVLIB_STUDY_ENABLED='true';
  // Real existing production identity path, not a test replacement.
  process.env.NODE_ENV='production';process.env.JWT_SECRET='study-test-secret';process.env.JWT_ISSUER='study-test';process.env.JWT_AUDIENCE='study-api';
  assert.equal((await send()).status,401);
  assert.equal((await send(request,{'x-user-id':'forged'})).status,401);
  const header=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
  const claims=Buffer.from(JSON.stringify({sub:'test-user',iss:'study-test',aud:'study-api',exp:Math.floor(Date.now()/1000)+300})).toString('base64url');
  const token=`${header}.${claims}.${createHmac('sha256',process.env.JWT_SECRET).update(`${header}.${claims}`).digest('base64url')}`;
  const run=await send(request,{Authorization:`Bearer ${token}`});assert.equal(run.status,200,await run.clone().text());
  const result=await run.json() as StudyResult;assert.equal(result.engine,'pvlib-python-direct');assert.equal(result.manifest.dependencies.pvlib,'0.13.1');assert.ok(result.execution?.runId);assert.deepEqual(result.request,request);assert.ok(result.summary.acWh>0);assert.equal(run.headers.get('cache-control'),'no-store');
  delete process.env.JWT_SECRET;delete process.env.JWT_ISSUER;delete process.env.JWT_AUDIENCE;process.env.NODE_ENV='test';
  assert.equal((await send({})).status,400);
  assert.equal((await send()).status,200);
  const overloaded=await send();assert.equal(overloaded.status,429);assert.equal(overloaded.headers.get('retry-after')!==null,true); // seventh attempt exceeds the per-client allowance
  // Separate router with a fresh limiter: malformed JSON and parser byte limits before spawning.
  const fresh=express();fresh.use('/studies',createStudyRouter({resolveIdentity:()=>({userId:'test'}),production:()=>true,configuredAuth:()=>true}));
  const freshServer=fresh.listen(0,'127.0.0.1');await once(freshServer,'listening');
  try{
    const a=freshServer.address();assert.ok(a&&typeof a==='object');const url=`http://127.0.0.1:${a.port}/studies/run`;
    assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:'{'})).status,400);
    assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({large:'x'.repeat(8*1024*1024)})})).status,413);
    const unsupported=structuredClone(request);unsupported.weather.records.forEach((row,i)=>{row.timestamp=`2017-04-01T${String(7+i).padStart(2,'0')}:00:00Z`;});
    const domain=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(unsupported)});assert.equal(domain.status,422);assert.equal((await domain.json()).code,'INVALID_INPUT');
    const tracked=structuredClone(request);tracked.system.tracking={axisTiltDeg:0,axisAzimuthDeg:180,maxAngleDeg:60,backtrack:true,gcr:.4,crossAxisTiltDeg:0};
    Object.assign(tracked.system,JSON.parse(readFileSync('services/pvlib_study/tests/optical-reference-parameters.json','utf8')));tracked.system.skyDiffuseModel='perez';
    Object.assign(tracked.system,JSON.parse(readFileSync('services/pvlib_study/tests/environment-reference-parameters.json','utf8')));
    const invalidTracker=structuredClone(tracked);invalidTracker.system.tracking!.gcr=0;
    assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(invalidTracker)})).status,400);
    const trackingRun=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(tracked)});assert.equal(trackingRun.status,200,await trackingRun.clone().text());
    const trackingResult=await trackingRun.json();assert.deepEqual(trackingResult.request,tracked);assert.equal(trackingResult.manifest.engineVersion,'1.16.0');assert.ok(trackingResult.manifest.models.transposition.startsWith("perez"));assert.ok(trackingResult.samples.every((r:{spectralFactor:number;spectralActive:number})=>r.spectralActive===0?r.spectralFactor===0:r.spectralFactor>0));assert.ok(trackingResult.samples.some((row:{trackerThetaDeg:number})=>Math.abs(row.trackerThetaDeg)>1));
    const rows=structuredClone(tracked);delete rows.system.skyDiffuseModel;delete rows.system.horizonProfile;rows.system.rowIrradiance={gcr:.4,heightM:2,pitchM:5,bifaciality:.7,rearShadeLossPct:2,rearTransmissionLossPct:0,rearIamB:.05,temperatureIrradiance:'front_plus_rear'};
    rows.system.arrayPdc0W=8800;rows.system.electrical=JSON.parse(readFileSync('services/pvlib_study/tests/desoto-reference-parameters.json','utf8'));
    rows.system.faiman={u0:30,u1:5,windHeightM:10};rows.system.acExportLimitW=100;
    rows.system.sandia=JSON.parse(readFileSync('services/pvlib_study/tests/sandia-reference-parameters.json','utf8'));rows.system.inverterPdc0W=rows.system.sandia!.Pdco;rows.system.additionalDcLossPct=0;
    Object.assign(rows.system,JSON.parse(readFileSync('services/pvlib_study/tests/ac-plant-reference-parameters.json','utf8')));
    const rowRun=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(rows)});assert.equal(rowRun.status,200,await rowRun.clone().text());
    const rowResult=await rowRun.json();assert.deepEqual(rowResult.request,rows);assert.ok(rowResult.summary.gridImportWh>0);assert.ok(rowResult.summary.transformerLossWh>0);assert.ok(rowResult.manifest.models.ac.startsWith("sandia voltage-dependent"));assert.ok(Number.isFinite(rowResult.summary.netGridWh));assert.ok(rowResult.summary.acExportLimitLossWh>0);assert.ok(rowResult.samples.every((s:{acW:number})=>s.acW<=100));assert.ok(rowResult.summary.rearIncidentWhm2>0);assert.ok(rowResult.summary.availableMppWh>0);assert.ok(rowResult.manifest.electricalChecks.specifiedDesignStringVocV<rows.system.electrical!.maxDcV);assert.ok(rowResult.summary.rearEffectiveWhm2>0);assert.ok(rowResult.samples.every((sample:{frontShadedFraction:number})=>Number.isFinite(sample.frontShadedFraction)));
  }finally{freshServer.closeAllConnections();await new Promise<void>(resolve=>freshServer.close(()=>resolve()));}
  const missing=new StudyExecutor({python:path.join(temp,'not-a-python')});await assert.rejects(()=>missing.run(request),(e:unknown)=>e instanceof StudyError&&e.code==='UNAVAILABLE');assert.equal(missing.activeCount,0);
  const slow=path.join(temp,'slow.py');writeFileSync(slow,'import time\ntime.sleep(10)\n');
  const bounded=new StudyExecutor({python,script:slow,timeoutMs:500});
  const waiting=bounded.run(request);await assert.rejects(()=>bounded.run(request),(e:unknown)=>e instanceof StudyError&&e.code==='BUSY');await assert.rejects(()=>waiting,(e:unknown)=>e instanceof StudyError&&e.code==='TIMEOUT');assert.equal(bounded.activeCount,0);
  const abort=new AbortController();const cancelled=new StudyExecutor({python,script:slow,timeoutMs:10000});const promise=cancelled.run(request,abort.signal);abort.abort();await assert.rejects(()=>promise,(e:unknown)=>e instanceof StudyError&&e.code==='CANCELLED');assert.equal(cancelled.activeCount,0);
  const loud=path.join(temp,'loud.py');writeFileSync(loud,'print("x"*100000)\n');await assert.rejects(()=>new StudyExecutor({python,script:loud,maxOutputBytes:100}).run(request),(e:unknown)=>e instanceof StudyError&&e.code==='OUTPUT_LIMIT');
  console.log('Direct pvlib study HTTP/process PASS: real Python execution, production JWT and forged identity, disabled, contract, body cap, rate/capacity, timeout/kill, abort, missing runtime and output bounds. Not field validation.');
}finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));rmSync(temp,{recursive:true,force:true});}
