import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {StudyRequestSchema} from '../src/studies/studyContract';
import {parseAuxiliaryCsv,validateResult,validateSnapshot,studyReport} from '../src/studies/studyWorkflow';
import {makeStudyBundle,validateStudyBundle,cloneStudyInputs} from '../src/studies/studyExchange';
import {sourceLedger} from '../src/studies/studyInsights';
import {exploreStudy} from '../src/studies/studyExplorer';
const raw=JSON.parse(readFileSync('services/pvlib_study/tests/synthetic-study.json','utf8'));
const powers=[0,20,100,0,50,300];
const csv=['timestamp,powerW',...raw.weather.records.map((r:{timestamp:string},i:number)=>`${r.timestamp},${powers[i]}`)].join('\n');
raw.system.auxiliarySchedule={source:'SYNTHETIC auxiliary interval test only',quality:'assumed',records:parseAuxiliaryCsv(csv)};
const request=StudyRequestSchema.parse(raw);
function run(req:typeof request){const p=spawnSync(process.env.PVLIB_PYTHON??'python',['-I','-B','services/pvlib_study/worker.py'],{input:JSON.stringify(req),encoding:'utf8',maxBuffer:16*1024*1024});assert.equal(p.status,0,p.stderr);return validateResult(JSON.parse(p.stdout));}
for(const bad of [csv.replace(',powerW',',watts'),csv.replace(',20',','),csv.replace(',20',',NaN'),csv.replace(',20',',-1'),csv.replace(',20',',1e10'),csv.replace(',20',',"20"'),csv+'\n\n'])assert.throws(()=>parseAuxiliaryCsv(bad));
assert.deepEqual(parseAuxiliaryCsv('\uFEFF'+csv.replaceAll('\n','\r\n')+'\r\n'),request.system.auxiliarySchedule!.records);
for(const alter of [ (r:typeof request)=>{r.system.auxiliaryPowerW=0;},(r:typeof request)=>{r.system.auxiliarySchedule!.source=' ';},(r:typeof request)=>{r.system.auxiliarySchedule!.records.pop();},(r:typeof request)=>{r.system.auxiliarySchedule!.records.reverse();},(r:typeof request)=>{r.system.auxiliarySchedule!.records[0].timestamp=r.system.auxiliarySchedule!.records[1].timestamp;}]){const bad=structuredClone(request);alter(bad);assert.equal(StudyRequestSchema.safeParse(bad).success,false);}
const offset=structuredClone(request);offset.system.auxiliarySchedule!.records.forEach(r=>{r.timestamp=new Date(Date.parse(r.timestamp)-5*3600000).toISOString().replace('Z','-05:00');});assert.equal(StudyRequestSchema.safeParse(offset).success,true);
const extra=structuredClone(request);extra.system.auxiliarySchedule!.records[0].timestamp='2024-01-01T00:00:00';assert.equal(StudyRequestSchema.safeParse(extra).success,false);
const blocks=structuredClone(raw);blocks.system.inverterBlocks=JSON.parse(readFileSync('docs/examples/inverter-blocks.synthetic.json','utf8'));blocks.system.additionalDcLossPct=0;blocks.system.arrayPdc0W=17600;blocks.system.inverterPdc0W=blocks.system.inverterBlocks.reduce((n:number,b:{system:{inverterPdc0W:number}})=>n+b.system.inverterPdc0W,0);blocks.system.inverterBlocks[0].system.auxiliarySchedule=raw.system.auxiliarySchedule;assert.equal(StudyRequestSchema.safeParse(blocks).success,false);
const out=run(request);assert.equal(out.manifest.engineVersion,'1.15.0');assert.deepEqual(out.samples.map(r=>r.auxiliaryConsumptionW),powers);assert.equal(out.summary.auxiliaryConsumptionWh,470);
assert.equal(exploreStudy(out).totalsWhOrWhm2!.auxiliaryConsumptionWh,470);assert.ok(sourceLedger(request,out).entries.some(e=>e.component==='auxiliarySchedule'&&e.source===request.system.auxiliarySchedule!.source));assert.ok(studyReport(out).includes('explicit interval-average LV auxiliary schedule'));
for(const alter of [(r:typeof out)=>{r.samples[0].auxiliaryConsumptionW=1;},(r:typeof out)=>{r.summary.auxiliaryConsumptionWh!+=1;},(r:typeof out)=>{r.monthly[0].auxiliaryConsumptionWh!+=1;},(r:typeof out)=>{delete r.samples[0].gridImportW;},(r:typeof out)=>{r.request.system.auxiliarySchedule!.records[1].powerW+=1;}]){const bad=structuredClone(out);alter(bad);assert.throws(()=>validateResult(bad));assert.throws(()=>validateSnapshot({version:1,id:'00000000-0000-4000-8000-000000000039',savedAt:'2026-11-03T00:00:00Z',request:bad.request,result:bad}));}
const snapshot=validateSnapshot({version:1,id:'00000000-0000-4000-8000-000000000039',savedAt:'2026-11-03T00:00:00Z',request,result:out});assert.deepEqual((await validateStudyBundle(JSON.parse(JSON.stringify(await makeStudyBundle([snapshot]))))).snapshots[0],snapshot);assert.deepEqual(cloneStudyInputs(snapshot,'Schedule clone','00000000-0000-4000-8000-000000000040',snapshot.savedAt).request.system.auxiliarySchedule,request.system.auxiliarySchedule);
const legacy=structuredClone(request);delete legacy.system.auxiliarySchedule;legacy.system.auxiliaryPowerW=40;const constant=structuredClone(request);constant.system.auxiliarySchedule!.records.forEach(r=>r.powerW=40);const a=run(legacy),b=run(constant);for(const key of ['samples','summary','monthly'] as const)assert.deepEqual(a[key],b[key]);
console.log('Auxiliary schedule PASS: actual Python, strict CSV/contract, interval W and integrated Wh, tamper/archive guards, source ledger/explorer/report, portable bundle/clone and constant-mode equivalence. Synthetic tests only.');
