import {multiMpptEnergy} from "../src/studies/multiMpptEvidence";
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {StudyRequestSchema} from '../src/studies/studyContract';
import {validateResult,validateSnapshot,studyReport} from '../src/studies/studyWorkflow';
import {makeStudyBundle,validateStudyBundle,cloneStudyInputs} from '../src/studies/studyExchange';
import {sourceLedger,compareStudies} from '../src/studies/studyInsights';
import {exploreStudy,dailyExplorerCsv,scenarioInputDiff} from '../src/studies/studyExplorer';
const read=(p:string)=>JSON.parse(readFileSync(`services/pvlib_study/tests/${p}.json`,'utf8'));
const raw=read('synthetic-study');raw.system.arrayPdc0W=15840;raw.system.additionalDcLossPct=0;raw.system.inverterPdc0W=10000;
raw.system.mpptInputs=[0,1].map(index=>({id:`input${index}`,source:'SYNTHETIC numerical subarray test only',quality:'assumed',arrayPdc0W:index?7040:8800,surfaceTiltDeg:30,surfaceAzimuthDeg:index?270:90,electrical:{...read('desoto-reference-parameters'),modulesPerString:index?8:10,dcCable:{source:'SYNTHETIC fixed design-condition loop resistance',quality:'assumed',topology:'uniform_strings_shared_home_run',stringLoopResistanceOhm:1.2,sharedLoopResistanceOhm:.3}}}));
const request=StudyRequestSchema.parse(raw);
const documented=JSON.parse(readFileSync('docs/examples/mppt-inputs.synthetic.json','utf8'));assert.ok(StudyRequestSchema.safeParse({...raw,system:{...raw.system,mpptInputs:documented}}).success);
for(const patch of [{arrayPdc0W:8800},{additionalDcLossPct:1},{sandia:read('sandia-reference-parameters')},{tracking:read('synthetic-study').system.tracking??{}},{electrical:read('desoto-reference-parameters')},{mpptInputs:[raw.system.mpptInputs[0]]},{mpptInputs:[raw.system.mpptInputs[0],raw.system.mpptInputs[0]]}])assert.equal(StudyRequestSchema.safeParse({...raw,system:{...raw.system,...patch}}).success,false);
function run(req:typeof request){const result=spawnSync(process.env.PVLIB_PYTHON??'python',['-I','-B','services/pvlib_study/worker.py'],{input:JSON.stringify(req),encoding:'utf8',maxBuffer:16*1024*1024});assert.equal(result.status,0,result.stderr);return validateResult(JSON.parse(result.stdout));}
const out=run(request);assert.equal(out.manifest.engineVersion,'1.11.0');assert.ok(out.samples.some(row=>Math.abs(Number(row.m0_operatingVoltageV)-Number(row.m1_operatingVoltageV))>20));assert.equal('operatingVoltageV' in out.samples[0],false);
const ledger=multiMpptEnergy(out);assert.equal(ledger.length,2);assert.ok(Math.abs(ledger.reduce((a,b)=>a+b.dcWh,0)-out.summary.dcWh)<1e-7);assert.equal(ledger[0].id,'input0');assert.ok(Math.abs(ledger[0].monthly.reduce((sum,m)=>sum+m.dcWh,0)-ledger[0].dcWh)<1e-7);
const explorer=exploreStudy(out);assert.equal(explorer.mppt.status,'independent_inputs_no_aggregate_state');assert.equal(explorer.independentMppt.inputs.length,2);assert.ok(explorer.independentMppt.states.every(input=>input.states.reduce((sum,state)=>sum+state.intervals,0)===6));
const total=explorer.totalsWhOrWhm2!;for(const key of ['dcWh','availableMppWh','dcCableLossWh','mpptConstraintLossWh'] as const)assert.ok(Math.abs(total[key]-out.summary[key]!)<1e-6,key);assert.ok(dailyExplorerCsv(out).includes('dcCableLossWh'));
assert.equal(sourceLedger(request,out).entries.filter(row=>row.component.startsWith('mppt:')).length,2);
const snapshot=validateSnapshot({version:1,id:'00000000-0000-4000-8000-000000000036',savedAt:'2026-11-03T00:00:00Z',request,result:out});
assert.deepEqual((await validateStudyBundle(JSON.parse(JSON.stringify(await makeStudyBundle([snapshot]))))).snapshots[0],snapshot);
assert.deepEqual(cloneStudyInputs(snapshot,'Independent clone','00000000-0000-4000-8000-000000000037',snapshot.savedAt).request.system.mpptInputs,request.system.mpptInputs);
assert.ok(studyReport(out).includes('Independent MPPT subarrays'));assert.ok(studyReport(out).includes('no shared voltage'));
for(const key of ['m0_dcW','m0_operatingVoltageV','m0_dcCableLossW','m1_cellTemperatureC','m1_arrayOperatingVoltageV','arrayMppW','dcCableLossW','dcW']){const bad=structuredClone(out);bad.samples[0][key]=Number(bad.samples[0][key])+10;assert.throws(()=>validateResult(bad),/MPPT/);}
const missing=structuredClone(out);delete missing.samples[0].m1_operatingCurrentA;assert.throws(()=>validateResult(missing),/MPPT/);
const shared=structuredClone(out);shared.samples[0].operatingVoltageV=400;assert.throws(()=>validateResult(shared),/MPPT/);
for(const key of ['dcCableLossWh','dcWh','acWh','availableMppWh','mpptConstraintLossWh'] as const){const badEnergy=structuredClone(out);badEnergy.summary[key]!+=10;assert.throws(()=>validateResult(badEnergy),/MPPT/);}
const modified=structuredClone(request);modified.system.mpptInputs![0].electrical.maxInputCurrentA=5;const changed=run(modified);assert.ok(changed.summary.dcWh<out.summary.dcWh);assert.ok(JSON.stringify(scenarioInputDiff(out,changed)).includes('maxInputCurrentA'));assert.ok(JSON.stringify(compareStudies(out,changed)).includes('dcCableLossWh'));
// Modeled thermal/optical variants retained per input, no reference-plane substitution.
for(const model of ['faiman','pvsyst'] as const){const r=structuredClone(request);if(model==='faiman')r.system.faiman={u0:30,u1:5,windHeightM:10};else r.system.pvsystTemperature={source:'SYNTHETIC explicit fit',quality:'assumed',uc:29,uv:2,moduleEfficiency:.2,alphaAbsorption:.9,windHeightM:10};assert.ok(run(r).summary.dcWh>0);}
console.log('Independent MPPT workflow PASS: distinct input voltages and constraints, aggregate accounting, real Python, tamper guards, thermal routing, bundle/clone/restore, source ledger, explorer/report and comparison.');
