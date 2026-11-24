import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {measurementComparison} from '../src/studies/measurementComparison';
import {StudyRequestSchema} from '../src/studies/studyContract';
import {importMeasurementCsv} from '../src/studies/measurementContract';
import {validateResult,validateSnapshot,studyReport} from '../src/studies/studyWorkflow';
import {makeStudyBundle,validateStudyBundle,cloneStudyInputs} from '../src/studies/studyExchange';
const base=JSON.parse(readFileSync('services/pvlib_study/tests/synthetic-study.json','utf8'));
const dataset=importMeasurementCsv(JSON.parse(readFileSync('docs/examples/measurement-manifest.synthetic.json','utf8')),readFileSync('docs/examples/measurement-observations.synthetic.csv','utf8'));
const request=StudyRequestSchema.parse({...base,measurements:[dataset]});
function run(req:unknown){const p=spawnSync(process.env.PVLIB_PYTHON??'python',['-I','-B','services/pvlib_study/worker.py'],{input:JSON.stringify(req),encoding:'utf8',maxBuffer:16*1024*1024});assert.equal(p.status,0,p.stderr+p.stdout);return validateResult(JSON.parse(p.stdout));}
const actual=run(request),plain=run(base),untouched=JSON.stringify(actual);
for(const key of ['samples','summary','monthly'] as const)assert.deepEqual(actual[key],plain[key]);
const analysis=measurementComparison(actual),d=analysis.datasets[0];
assert.equal(analysis.inputSha256,actual.manifest.inputSha256);assert.equal(analysis.validationStatus,'not_field_validated');
assert.deepEqual(d.coverage.statusCounts,{paired:2,missing:1,excluded:1,outside_model_period:1,model_point_unavailable:0});
assert.equal(d.coverage.modelIntervalsWithoutObservationRecord,2);assert.equal(d.coverage.validRecords,3);assert.equal(d.coverage.pairedHours,2);assert.equal(d.coverage.pairedPercentOfModelIntervals,100*2/6);assert.equal(d.coverage.pairedPercentOfValidRecords,100*2/3);
assert.deepEqual(d.rows.map(r=>r.residual),[Number(actual.samples[0].acW),Number(actual.samples[1].acW)-1200,null,null,null]);
assert.equal(JSON.stringify(actual),untouched);assert.deepEqual(measurementComparison(plain).datasets,[]);

// Deliberately synthetic arithmetic witnesses, not validated physical simulation results.
function witness(observed:number[],modeled:number[],point:'plant_net_grid'|'reference_cell_temperature'='plant_net_grid',unit:'W'|'kW'|'degC'='W'){
 const r=structuredClone(actual),ds=r.request.measurements![0];delete ds.importTrace;ds.modelPoint=point;ds.unit=unit;
 r.samples=r.samples.slice(0,observed.length);ds.records=observed.map((value,i)=>({timestamp:String(r.samples[i].timestamp),value,qualityFlag:'valid'}));
 r.samples.forEach((row,i)=>{row.gridImportW=0;row.acW=modeled[i];row.cellTemperatureC=modeled[i];});
 return r;
}
const published=witness([3,-0.5,2,7],[2.5,0,2,8]);
let a=measurementComparison(published).datasets[0];
assert.deepEqual(a.metrics,{mbe:0.25,mae:0.5,rmse:Math.sqrt(0.375),observedMean:2.875,modeledMean:3.125});
assert.deepEqual(a.matchedEnergyWh,{observed:11.5,modeled:12.5,residual:1});
assert.deepEqual(measurementComparison(witness([0,0],[0,0])).datasets[0].metrics,{mbe:0,mae:0,rmse:0,observedMean:0,modeledMean:0});
a=measurementComparison(witness([1,2,3],[3,4,5])).datasets[0];assert.equal(a.metrics!.mbe,2);assert.equal(a.metrics!.mae,2);assert.equal(a.metrics!.rmse,2);
a=measurementComparison(witness([10,10],[8,12])).datasets[0];assert.equal(a.metrics!.mbe,0);assert.equal(a.metrics!.mae,2);assert.equal(a.metrics!.rmse,2);
a=measurementComparison(witness([-10,0,10],[-11,0,11],'reference_cell_temperature','degC')).datasets[0];assert.equal(a.unit,'degC');assert.equal(a.matchedEnergyWh,null);assert.equal(a.metrics!.mbe,0);assert.equal(a.metrics!.mae,2/3);
a=measurementComparison(witness([0.001,0.002],[2,4],'plant_net_grid','kW')).datasets[0];assert.equal(a.unit,'W');assert.equal(a.metrics!.mbe,1.5);
a=measurementComparison(witness([0],[1])).datasets[0];assert.equal(a.metrics!.rmse,1);assert.ok(a.reason.includes('One pair'));
const quarter=structuredClone(published);quarter.request.measurements![0].intervalMinutes=15;assert.deepEqual(measurementComparison(quarter).datasets[0].matchedEnergyWh,{observed:2.875,modeled:3.125,residual:0.25});
const filtered=structuredClone(published);filtered.request.measurements![0].records[0].qualityFlag='excluded';filtered.request.measurements![0].records[0].reason='synthetic fault';filtered.request.measurements![0].records[0].value=999999;assert.equal(measurementComparison(filtered).datasets[0].coverage.statusCounts.excluded,1);assert.equal(measurementComparison(filtered).datasets[0].metrics!.mae,0.5);
const offset=structuredClone(published);offset.request.measurements![0].records[0].timestamp='2017-04-01T10:00:00-07:00';assert.deepEqual(measurementComparison(offset).datasets[0].metrics,measurementComparison(published).datasets[0].metrics);
const sparse=structuredClone(published);sparse.request.measurements![0].records.splice(1,2);a=measurementComparison(sparse).datasets[0];assert.equal(a.coverage.pairedHours,2);assert.equal(a.coverage.modelIntervalsWithoutObservationRecord,2);assert.equal(a.coverage.firstPairedIntervalEndUtc,'2017-04-01T17:00:00.000Z');assert.equal(a.coverage.lastPairedIntervalEndUtc,'2017-04-01T20:00:00.000Z');
const none=structuredClone(actual);none.request.measurements![0].records.forEach(row=>{row.qualityFlag='missing';row.value=null;row.reason='SYNTHETIC missing';});a=measurementComparison(none).datasets[0];assert.equal(a.metrics,null);assert.equal(a.matchedEnergyWh,null);assert.equal(a.coverage.pairedPercentOfValidRecords,null);assert.equal(a.coverage.pairedPercentOfModelIntervals,0);assert.equal(a.status,'no_valid_pairs');
const unavailable=structuredClone(actual);unavailable.request.measurements![0].modelPoint='plant_import';a=measurementComparison(unavailable).datasets[0];assert.equal(a.metrics,null);assert.equal(a.coverage.statusCounts.model_point_unavailable,2);assert.equal(a.coverage.statusCounts.outside_model_period,1);
const multiple=structuredClone(actual);multiple.request.measurements!.push({...structuredClone(dataset),id:'another',modelPoint:'plant_import'});assert.equal(measurementComparison(multiple).datasets[1].metrics,null);assert.deepEqual(measurementComparison(multiple).datasets[0],d);
// Independent stdlib Python oracle across deterministic signed data, no new dependency.
const observed=[-10,0,3,4.5,0.001,100],modeled=[-9,2,1,4.5,0.002,99];
const oracle=spawnSync(process.env.PVLIB_PYTHON??'python',['-I','-c','import json,sys,math,statistics; o,m=json.load(sys.stdin); e=[b-a for a,b in zip(o,m)]; print(json.dumps([statistics.mean(e),statistics.mean(map(abs,e)),math.sqrt(statistics.mean(x*x for x in e))]))'],{input:JSON.stringify([observed,modeled]),encoding:'utf8'});assert.equal(oracle.status,0,oracle.stderr);
a=measurementComparison(witness(observed,modeled)).datasets[0];for(const [i,value] of [a.metrics!.mbe,a.metrics!.mae,a.metrics!.rmse].entries())assert.ok(Math.abs(value-JSON.parse(oracle.stdout)[i])<1e-12);
const snap=validateSnapshot({version:1,id:'00000000-0000-4000-8000-000000000042',savedAt:'2026-11-03T00:00:00Z',request,result:actual});
const restored=(await validateStudyBundle(JSON.parse(JSON.stringify(await makeStudyBundle([snap]))))).snapshots[0];assert.deepEqual(measurementComparison(restored.result!),analysis);assert.deepEqual(cloneStudyInputs(snap,'Stats clone','00000000-0000-4000-8000-000000000043',snap.savedAt).request.measurements,request.measurements);
assert.ok(studyReport(actual).includes('study-measurement-comparison-v1'));assert.ok(studyReport(actual).includes('pairedPercentOfModelIntervals'));
const escaped=structuredClone(actual);escaped.request.measurements![0].source='<script>bad</script>';assert.ok(!studyReport(escaped).includes('<script>bad</script>'));
console.log('Step 42 PASS: hand and published RMSE witnesses + independent Python arithmetic; bias sign/cancellation/zeros/signed/units/temperature/sparse/flags/offset/no-pair/singleton/multiple sensors; actual worker unchanged, immutable derived diagnostics, escaped report and bundle/clone. Not field validation.');
