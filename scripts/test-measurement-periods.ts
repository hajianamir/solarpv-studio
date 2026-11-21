import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {measurementPeriods,measurementPeriodSummaryCsv,measurementResidualCsv} from '../src/studies/measurementPeriods';
import {measurementComparison} from '../src/studies/measurementComparison';
import {StudyRequestSchema} from '../src/studies/studyContract';
import {importMeasurementCsv} from '../src/studies/measurementContract';
import {validateResult,validateSnapshot,studyReport} from '../src/studies/studyWorkflow';
import {makeStudyBundle,validateStudyBundle,cloneStudyInputs} from '../src/studies/studyExchange';
const base=JSON.parse(readFileSync('services/pvlib_study/tests/synthetic-study.json','utf8'));
const dataset=importMeasurementCsv(JSON.parse(readFileSync('docs/examples/measurement-manifest.synthetic.json','utf8')),readFileSync('docs/examples/measurement-observations.synthetic.csv','utf8'));
const request=StudyRequestSchema.parse({...base,measurements:[dataset]});
const p=spawnSync(process.env.PVLIB_PYTHON??'python',['-I','-B','services/pvlib_study/worker.py'],{input:JSON.stringify(request),encoding:'utf8',maxBuffer:16*1024*1024});assert.equal(p.status,0,p.stderr+p.stdout);
const actual=validateResult(JSON.parse(p.stdout)),before=JSON.stringify(actual),full=measurementPeriods(actual),old=measurementComparison(actual).datasets[0];
assert.deepEqual(full.datasets[0].total,{coverage:old.coverage,metrics:old.metrics,matchedEnergyWh:old.matchedEnergyWh});assert.deepEqual(full.datasets[0].rows,old.rows);assert.equal(JSON.stringify(actual),before);
assert.equal(full.datasets[0].daily.length,1);assert.equal(full.datasets[0].monthly.length,1);
for(const range of [{startUtc:'2017-04-01T00:00:00',endUtc:'2017-04-02T00:00:00Z'},{startUtc:'2017-02-30T00:00:00Z',endUtc:'2017-04-02T00:00:00Z'},{startUtc:'2017-04-02T00:00:00Z',endUtc:'2017-04-02T00:00:00Z'},{startUtc:'2017-04-03T00:00:00Z',endUtc:'2017-04-02T00:00:00Z'}])assert.throws(()=>measurementPeriods(actual,range));
const selection={startUtc:'2017-04-01T16:30:00Z',endUtc:'2017-04-01T17:30:00Z'};
let selected=measurementPeriods(actual,selection).datasets[0];assert.equal(selected.total.coverage.statusCounts.paired,1);assert.equal(selected.rows[0].timestamp,actual.samples[0].timestamp);assert.equal(selected.total.coverage.modelIntervals,1);
assert.deepEqual(measurementPeriods(actual,{startUtc:'2017-04-01T09:30:00-07:00',endUtc:'2017-04-01T10:30:00-07:00'}),measurementPeriods(actual,selection));
const empty=measurementPeriods(actual,{startUtc:'2020-01-01T00:00:00Z',endUtc:'2020-01-02T00:00:00Z'}).datasets[0];assert.equal(empty.total.metrics,null);assert.equal(empty.total.coverage.pairedPercentOfModelIntervals,null);assert.equal(empty.total.matchedEnergyWh,null);assert.deepEqual(empty.daily,[]);
// Synthetic arithmetic witness only: sparse dates at midnight/month/year/leap/DST boundaries.
const witness=structuredClone(actual),ds=witness.request.measurements![0];delete ds.importTrace;
const timestamps=['2023-12-31T23:00:00Z','2024-01-01T00:00:00Z','2024-01-01T01:00:00Z','2024-03-01T00:00:00Z','2024-03-10T03:00:00-04:00','2024-03-11T00:00:00Z'];
witness.samples.forEach((row,i)=>{row.timestamp=timestamps[i];row.acW=[1,3,6,4,10,20][i];});ds.records=timestamps.map(timestamp=>({timestamp,value:0,qualityFlag:'valid' as const}));
let a=measurementPeriods(witness).datasets[0];assert.deepEqual(a.monthly.map(b=>b.period),['2023-12','2024-01','2024-02','2024-03']);assert.deepEqual(a.daily.map(b=>b.period),['2023-12-31','2024-01-01','2024-02-29','2024-03-10']);assert.equal(a.daily[0].coverage.statusCounts.paired,2);assert.equal(a.daily[0].metrics!.rmse,Math.sqrt(5));assert.equal(a.total.metrics!.rmse,Math.sqrt((1+9+36+16+100+400)/6));assert.equal(a.total.matchedEnergyWh!.modeled,44);
// Independent Python grouping oracle: UTC midpoint and population RMSE.
const oracle=spawnSync(process.env.PVLIB_PYTHON??'python',['-I','-c',`import sys,json,datetime,math,collections
r=json.load(sys.stdin); groups=collections.defaultdict(list)
for t,e in r:
 d=datetime.datetime.fromisoformat(t.replace('Z','+00:00')).astimezone(datetime.timezone.utc)-datetime.timedelta(minutes=30)
 groups[d.strftime('%Y-%m-%d')].append(e)
print(json.dumps({k:math.sqrt(sum(x*x for x in v)/len(v)) for k,v in groups.items()}))`],{input:JSON.stringify(timestamps.map((t,i)=>[t,[1,3,6,4,10,20][i]])),encoding:'utf8'});assert.equal(oracle.status,0,oracle.stderr);for(const b of a.daily)assert.equal(b.metrics!.rmse,JSON.parse(oracle.stdout)[b.period]);
ds.records[0].qualityFlag='excluded';ds.records[0].reason='SYNTHETIC fault';ds.records[0].value=-999;ds.records[1].qualityFlag='missing';ds.records[1].value=null;ds.records[1].reason='offline';a=measurementPeriods(witness).datasets[0];assert.equal(a.daily[0].metrics,null);assert.equal(a.daily[0].coverage.statusCounts.excluded,1);assert.equal(a.daily[0].coverage.statusCounts.missing,1);
ds.records.splice(2,1);a=measurementPeriods(witness).datasets[0];assert.equal(a.daily[1].coverage.modelIntervalsWithoutObservationRecord,1);assert.equal(a.daily[1].metrics,null);
ds.modelPoint='plant_import';a=measurementPeriods(witness).datasets[0];assert.equal(a.total.metrics,null);assert.equal(a.total.coverage.statusCounts.model_point_unavailable,3);
const thermal=structuredClone(actual);thermal.request.measurements![0].unit='degC';thermal.request.measurements![0].modelPoint='reference_cell_temperature';assert.equal(measurementPeriods(thermal).datasets[0].total.matchedEnergyWh,null);
const quarter=structuredClone(actual);quarter.request.weather.intervalMinutes=15;quarter.request.measurements![0].intervalMinutes=15;assert.equal(measurementPeriods(quarter).datasets[0].total.matchedEnergyWh!.residual,old.matchedEnergyWh!.residual/4);
const multi=structuredClone(actual);multi.request.measurements!.push({...structuredClone(dataset),id:'other',modelPoint:'plant_import'});assert.equal(measurementPeriods(multi).datasets.length,2);assert.deepEqual(measurementPeriods(multi).datasets[0],full.datasets[0]);assert.equal(measurementPeriods(multi).datasets[1].total.metrics,null);
const unsafe=structuredClone(actual);unsafe.request.measurements![0].source='=HYPERLINK("bad")';unsafe.request.measurements![0].records[2].reason='@SUM(1)';const exported=measurementPeriods(unsafe);const summary=measurementPeriodSummaryCsv(exported),residual=measurementResidualCsv(exported);assert.ok(summary.includes("'=HYPERLINK"));assert.ok(summary.includes('""bad""'));assert.ok(residual.includes("'@SUM(1)"));assert.ok(residual.includes('"missing"'));assert.ok(residual.includes('"","",""'));assert.ok(summary.includes('\r\n'));assert.equal(summary.split('\r\n').length,4);assert.equal(residual.split('\r\n').length,6);
const snap=validateSnapshot({version:1,id:'00000000-0000-4000-8000-000000000043',savedAt:'2026-11-03T00:00:00Z',request,result:actual});const restored=(await validateStudyBundle(JSON.parse(JSON.stringify(await makeStudyBundle([snap]))))).snapshots[0];assert.deepEqual(measurementPeriods(restored.result!,selection),measurementPeriods(actual,selection));assert.deepEqual(cloneStudyInputs(snap,'Period clone','00000000-0000-4000-8000-000000000044',snap.savedAt).request.measurements,request.measurements);assert.ok(studyReport(actual).includes('study-measurement-period-analysis-v1'));assert.equal(JSON.stringify(actual),before);
console.log('Step 43 PASS: full/selected UTC midpoint half-open groups, leap/month/year/DST and independent Python oracle, pair-weighted RMSE, sparse/empty/flags/unavailable/units/energy, safe summary+residual CSV, immutable actual-worker results, report/bundle/clone. Synthetic only.');
