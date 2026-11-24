import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {ResearchRequestSchema,validateResearchResponse} from '../src/studies/researchApi';
import {ResearchExecutor} from '../src/server/researchApi';
import {StudyError} from '../src/server/pvlibStudy';
const names=['dc_coupled','electrochemical_spm','dq_protection_control'];
const examples=names.map(name=>JSON.parse(readFileSync(`docs/examples/physical-models/${name}.json`,'utf8')));
const invalid:typeof examples=[];
for(const example of examples){
 for(const stamp of ['2026-01-01T00:00:00','2026-02-30T00:00:00Z','2026-01-01 00:00:00+00:00']){const p=structuredClone(example);p.plan.intervals[0].start=stamp;invalid.push(p);}
 for(const value of [true,0,-1]){const p=structuredClone(example);p.plan.intervals[0].durationS=value;invalid.push(p);}
 const p=structuredClone(example);p.plan.extra=true;invalid.push(p);
}
const cases=[...examples,...invalid];
const py=spawnSync(process.env.PVLIB_PYTHON??'python',['-c',`import json,sys
from services.power_dynamics import dc_coupled,electrochemistry,control
f={'dc_coupled':dc_coupled.simulate,'electrochemical_spm':electrochemistry.simulate,'dq_protection_control':control.simulate}
out=[]
for req in json.load(sys.stdin):
 try:f[req['operation']](req['plan']);out.append(True)
 except (ValueError,KeyError,TypeError):out.append(False)
print(json.dumps(out))`],{encoding:'utf8',input:JSON.stringify(cases)});
assert.equal(py.status,0,py.stderr);
assert.deepEqual(JSON.parse(py.stdout),cases.map(p=>ResearchRequestSchema.safeParse(p).success));
assert.deepEqual(JSON.parse(py.stdout),[true,true,true,...invalid.map(()=>false)]);
for(const example of examples){
 const request=ResearchRequestSchema.parse(example),executor=new ResearchExecutor();
 const data=await executor.run(request);validateResearchResponse(data,request);assert.equal(executor.activeCount,0);
 const wrong=structuredClone(data) as {result:{plan:{source:string}}};wrong.result.plan.source+='tamper';assert.throws(()=>validateResearchResponse(wrong,request));
 const corrupt=structuredClone(data) as {result:{trace:Record<string,unknown>[]}};
 const field=request.operation==='dc_coupled'?'finalStoredKwh':request.operation==='electrochemical_spm'?'cellLithiumResidualMol':'magneticEnergyJ';
 corrupt.result.trace[0][field]=100000;assert.throws(()=>validateResearchResponse(corrupt,request));
 const nonfinite=structuredClone(data) as {result:{bad:number}};nonfinite.result.bad=Infinity;assert.throws(()=>validateResearchResponse(nonfinite,request));
 const cancelled=new AbortController();cancelled.abort();await assert.rejects(()=>executor.run(request,cancelled.signal),(e:unknown)=>e instanceof StudyError&&e.code==='CANCELLED');
 console.log(`PASS isolated actual ${request.operation}: binding, physical residuals, tamper, nonfinite, cancellation`);
}
// Verify offset-equivalent continuity in Python and TS, including fractional-hour zones.
const dc=structuredClone(examples[0]);dc.plan.intervals[0].start='2026-01-01T06:30:00+06:30';dc.plan.intervals[1].start='2026-01-01T15:00:00+14:00';
const req=ResearchRequestSchema.parse(dc);validateResearchResponse(await new ResearchExecutor().run(req),req);
// Strict worker must reject duplicate JSON keys even for direct stdin usage.
const duplicate=spawnSync(process.env.PVLIB_PYTHON??'python',['-I','-B','services/pvlib_research/api_worker.py'],{encoding:'utf8',input:'{"operation":"dc_coupled","operation":"diode_network","plan":{}}'});
assert.equal(duplicate.status,2,duplicate.stderr);
console.log('PASS Python/TS strict input matrix, explicit-offset continuity, direct-worker duplicate-key guard');
