import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {StudyRequestSchema} from '../src/studies/studyContract';
import {validateResult,validateSnapshot,studyReport} from '../src/studies/studyWorkflow';
import {makeStudyBundle,validateStudyBundle,cloneStudyInputs} from '../src/studies/studyExchange';
import {sourceLedger,compareStudies} from '../src/studies/studyInsights';
import {exploreStudy} from '../src/studies/studyExplorer';
const raw=JSON.parse(readFileSync('services/pvlib_study/tests/synthetic-study.json','utf8'));
raw.system.inverterBlocks=JSON.parse(readFileSync('docs/examples/inverter-blocks.synthetic.json','utf8'));
raw.system.additionalDcLossPct=0;raw.system.arrayPdc0W=raw.system.inverterBlocks.reduce((n:number,b:{system:{arrayPdc0W:number}})=>n+b.system.arrayPdc0W,0);raw.system.inverterPdc0W=raw.system.inverterBlocks.reduce((n:number,b:{system:{inverterPdc0W:number}})=>n+b.system.inverterPdc0W,0);
const request=StudyRequestSchema.parse(raw);
function run(req:typeof request){const result=spawnSync(process.env.PVLIB_PYTHON??'python',['-I','-B','services/pvlib_study/worker.py'],{input:JSON.stringify(req),encoding:'utf8',maxBuffer:16*1024*1024});assert.equal(result.status,0,result.stderr);return validateResult(JSON.parse(result.stdout));}
const out=run(request);assert.equal(out.blockResults!.length,2);assert.equal(out.manifest.engineVersion,'1.13.0');assert.equal('operatingVoltageV' in out.samples[0],false);
assert.ok(Math.abs(exploreStudy(out).totalsWhOrWhm2!.acWh-out.summary.acWh)<1e-7);assert.equal(sourceLedger(request,out).entries.filter(e=>e.component.startsWith('inverterBlock:')).length,2);
const snapshot=validateSnapshot({version:1,id:'00000000-0000-4000-8000-000000000037',savedAt:'2026-11-03T00:00:00Z',request,result:out});assert.deepEqual((await validateStudyBundle(JSON.parse(JSON.stringify(await makeStudyBundle([snapshot]))))).snapshots[0],snapshot);
assert.deepEqual(cloneStudyInputs(snapshot,'Block clone','00000000-0000-4000-8000-000000000038',snapshot.savedAt).request.system.inverterBlocks,request.system.inverterBlocks);
assert.ok(studyReport(out).includes('Independent inverter block results'));
for(const key of ['dcW','inverterNetAcW','inverterGrossGenerationW','inverterSelfConsumptionW','acPlantInputW']){const bad=structuredClone(out);bad.samples[0][key]=Number(bad.samples[0][key])+10;assert.throws(()=>validateResult(bad),/block evidence/);}
const corrupted=structuredClone(out);corrupted.blockResults![0].summary.acWh+=10;assert.throws(()=>validateResult(corrupted),/energy integration/);
const requestMismatch=structuredClone(out);requestMismatch.blockResults![0].request.label='wrong block';assert.throws(()=>validateResult(requestMismatch),/block evidence/);
const nested=structuredClone(out);nested.blockResults![0].blockResults=[out.blockResults![0],out.blockResults![1]];assert.throws(()=>validateResult(nested),/Unexpected/);
for(const patch of [{arrayPdc0W:8800},{additionalDcLossPct:1},{inverterBlocks:[raw.system.inverterBlocks[0]]},{inverterBlocks:[raw.system.inverterBlocks[0],raw.system.inverterBlocks[0]]}])assert.equal(StudyRequestSchema.safeParse({...raw,system:{...raw.system,...patch}}).success,false);
const invalid=structuredClone(raw);invalid.system.inverterBlocks[0].system.auxiliaryPowerW=0;assert.equal(StudyRequestSchema.safeParse(invalid).success,false);
const mixed=structuredClone(request);mixed.system.inverterBlocks![1].system.electrical!.maxInputCurrentA=.1;mixed.system.inverterBlocks![1].system.electrical!.mpptMaxV=220;const operating=run(mixed);assert.ok(operating.summary.inverterSelfConsumptionWh!>0);assert.ok(operating.summary.acWh>0);
mixed.system.auxiliaryPowerW=40;mixed.system.acAvailability={source:'SYNTHETIC zero common availability',quality:'assumed',records:mixed.weather.records.map(row=>({timestamp:row.timestamp,availableFraction:0}))};const zero=run(mixed);assert.equal(zero.summary.acWh,0);assert.ok(Math.abs(zero.summary.gridImportWh!-6*(40+2.4))<1e-7);assert.ok(Math.abs(zero.summary.netGridWh!+zero.summary.gridImportWh!)<1e-7);
const other=structuredClone(request);other.system.inverterBlocks![0].system.surfaceTiltDeg=10;const changed=run(other);assert.ok(JSON.stringify(compareStudies(out,changed)).includes('acWh'));
console.log('Independent inverter blocks PASS: clipping before signed aggregation, gross internal demand/net import distinction, zero availability preserves standby, child result guards, contracts, portable restore/clone, source ledger, explorer/report and comparison.');
