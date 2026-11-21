import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {StudyRequestSchema} from '../src/studies/studyContract';
import {validateResult,validateSnapshot,studyReport} from '../src/studies/studyWorkflow';
import {makeStudyBundle,validateStudyBundle,cloneStudyInputs} from '../src/studies/studyExchange';
import {sourceLedger,compareStudies} from '../src/studies/studyInsights';
import {exploreStudy,dailyExplorerCsv,scenarioInputDiff} from '../src/studies/studyExplorer';
const read=(p:string)=>JSON.parse(readFileSync(`services/pvlib_study/tests/${p}.json`,'utf8'));
const raw=read('synthetic-study');raw.system.arrayPdc0W=8800;raw.system.additionalDcLossPct=0;
raw.system.electrical=read('desoto-reference-parameters');raw.system.electrical.dcCable={source:'SYNTHETIC test-only fixed design-temperature loop resistance',quality:'assumed',topology:'uniform_strings_shared_home_run',stringLoopResistanceOhm:1.2,sharedLoopResistanceOhm:.3};
const request=StudyRequestSchema.parse(raw);
for(const patch of [{topology:'one_way'},{source:''},{quality:'verified'},{stringLoopResistanceOhm:-1},{sharedLoopResistanceOhm:NaN},{extra:true}]){const r=structuredClone(raw);Object.assign(r.system.electrical.dcCable,patch);assert.equal(StudyRequestSchema.safeParse(r).success,false);}
const double=structuredClone(raw);double.system.additionalDcLossPct=1;assert.equal(StudyRequestSchema.safeParse(double).success,false);
function run(req:typeof request){const out=spawnSync(process.env.PVLIB_PYTHON??'python',['-I','-B','services/pvlib_study/worker.py'],{input:JSON.stringify(req),encoding:'utf8',maxBuffer:16*1024*1024});assert.equal(out.status,0,out.stderr);return validateResult(JSON.parse(out.stdout));}
const out=run(request);assert.equal(out.manifest.engineVersion,'1.11.0');assert.ok(out.summary.dcCableLossWh!>0);
const explored=exploreStudy(out);assert.ok(Math.abs(explored.totalsWhOrWhm2!.dcCableLossWh-out.summary.dcCableLossWh!)<1e-7);assert.ok(dailyExplorerCsv(out).includes('dcCableLossWh'));
assert.equal(sourceLedger(request,out).entries.find(v=>v.component==='dcCable')!.source,request.system.electrical!.dcCable!.source);
const snapshot=validateSnapshot({version:1,id:'00000000-0000-4000-8000-000000000035',savedAt:'2026-11-03T00:00:00Z',request,result:out});
const bundle=await makeStudyBundle([snapshot]);const restored=await validateStudyBundle(JSON.parse(JSON.stringify(bundle)));assert.deepEqual(restored.snapshots[0],snapshot);
assert.deepEqual(cloneStudyInputs(snapshot,'Cable clone','00000000-0000-4000-8000-000000000036',snapshot.savedAt).request.system.electrical!.dcCable,request.system.electrical!.dcCable);
assert.ok(studyReport(out).includes('DC cable loss:'));assert.ok(studyReport(out).includes('do not subtract again'));
for(const key of ['dcCableLossW','dcCableVoltageDropV','arrayOperatingVoltageV','arrayOperatingPowerW','operatingVoltageV']){const bad=structuredClone(out);bad.samples[0][key]=Number(bad.samples[0][key])+10;assert.throws(()=>validateResult(bad));const missing=structuredClone(out);delete missing.samples[0][key];assert.throws(()=>validateResult(missing));}
for(const bucket of ['summary','monthly'] as const){const bad=structuredClone(out);if(bucket==='summary')bad.summary.dcCableLossWh!+=10;else bad.monthly[0].dcCableLossWh!+=10;assert.throws(()=>validateResult(bad),/cable energy/);}
const second=structuredClone(request);second.system.electrical!.dcCable!.sharedLoopResistanceOhm=1;const changed=run(second);assert.ok(changed.summary.dcWh<out.summary.dcWh);assert.ok(JSON.stringify(scenarioInputDiff(out,changed)).includes('sharedLoopResistanceOhm'));assert.ok(JSON.stringify(compareStudies(out,changed)).includes('dcCableLossWh'));
console.log('DC cable workflow PASS: strict contracts, real worker, arithmetic/tamper guards, explorer, source ledger, portable bundle/restore/clone, report and comparison.');
