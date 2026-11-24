import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {runStudyValidation,studyValidationHtml} from '../src/studies/studyValidation';
import {FIELD_DOCUMENT_CATEGORIES,fieldEvidenceReview,fieldEvidenceCriteriaCsv,fieldEvidenceRowsCsv,fieldEvidenceReviewHtml,type FieldDocumentRegister} from '../src/studies/fieldEvidenceReview';
import {importMeasurementCsv} from '../src/studies/measurementContract';
import {validateResult,validateSnapshot} from '../src/studies/studyWorkflow';
import {makeStudyBundle,validateStudyBundle} from '../src/studies/studyExchange';
const python=process.env.PVLIB_PYTHON??'python';
const base=JSON.parse(readFileSync('services/pvlib_study/tests/synthetic-study.json','utf8'));
const manifest=JSON.parse(readFileSync('docs/examples/measurement-manifest.synthetic.json','utf8'));
function run(request:unknown){const p=spawnSync(python,['-I','-B','services/pvlib_study/worker.py'],{input:JSON.stringify(request),encoding:'utf8',maxBuffer:16*1024*1024});assert.equal(p.status,0,p.stdout+p.stderr);return validateResult(JSON.parse(p.stdout));}
const baseline=run(base);
// Independent target construction: real worker output scaled by known factor 1.1.
const csv=['timestamp,value,qualityFlag,reason',...baseline.samples.map(r=>`${r.timestamp},${Number(r.acW)*1.1/1000},valid,`)].join('\n');
const request={...base,measurements:[importMeasurementCsv(manifest,csv)]};const result=run(request),before=JSON.stringify(result);
const field={schemaVersion:'study-validation-plan-v1',studyInputSha256:result.manifest.inputSha256,source:'SYNTHETIC',sourceVersion:'v1',purpose:'synthetic_software_test',tool:'field_evidence' as const,datasetId:manifest.id,evaluation:{startUtc:'2017-04-01T16:30:00Z',endUtc:'2017-04-01T22:00:00Z'},evidence:{sensorCalibrationCertificate:'SYNTHETIC certificate ref',timeSynchronization:'SYNTHETIC sync ref',siteAndMeterBoundary:'SYNTHETIC boundary ref',independentReview:'SYNTHETIC reviewer ref'},criteria:{source:'SYNTHETIC test criteria, not a standard',minPairs:2,minPairedHours:2,minModelCoveragePct:90,maxAbsMbe:1000,maxRmse:1000}};

const blocked=fieldEvidenceReview(result,field);assert.equal(blocked.dossierStatus,'blocked');
const declared=run({...base,measurements:[importMeasurementCsv({...manifest,quality:'measured'},csv)]});
const plan={...field,purpose:'operational_declared',studyInputSha256:declared.manifest.inputSha256};
const review=fieldEvidenceReview(declared,plan);assert.equal(review.dossierStatus,'evidence_review_required');assert.equal(review.documentReadiness,'references_only');
assert.deepEqual(review.report,runStudyValidation(declared,plan));assert.deepEqual(review.evaluation.raw,review.evaluation.evaluated);
const span=review.usedIntervalSpans.evaluation!;
const register:FieldDocumentRegister={schemaVersion:'study-field-document-register-v1',studyInputSha256:review.report.inputSha256,planSha256:review.report.planSha256,datasetId:plan.datasetId,source:'SYNTHETIC declarations only',sourceVersion:'v1',documents:FIELD_DOCUMENT_CATEGORIES.map(category=>({category,reference:plan.evidence[category],documentSha256:'a'.repeat(64),reviewedBy:'SYNTHETIC reviewer',reviewedAt:span.endUtc,applicabilityStartUtc:span.startUtc,applicabilityEndUtc:span.endUtc}))};
const ready=fieldEvidenceReview(declared,plan,register);assert.equal(ready.dossierStatus,'declared_dossier_complete');assert.equal(ready.validationStatus,'not_field_validated');
for(const patch of [{planSha256:'0'.repeat(64)},{studyInputSha256:'0'.repeat(64)},{datasetId:'other'},{extra:1},{source:' '},{documents:[register.documents[0],register.documents[0]]},{documents:[{...register.documents[0],reference:'other'}]},{documents:[{...register.documents[0],reviewedAt:'2017-01-01T00:00:00'}]},{source:'x'.repeat(65000)}])assert.throws(()=>fieldEvidenceReview(declared,plan,{...register,...patch}));
for(const documents of [register.documents.slice(1),register.documents.map(d=>({...d,applicabilityStartUtc:plan.evaluation.startUtc})),register.documents.map(d=>d.category==='independentReview'?{...d,reviewedAt:span.startUtc}:d)])assert.equal(fieldEvidenceReview(declared,plan,{...register,documents}).dossierStatus,'evidence_review_required');
assert.equal(fieldEvidenceReview(declared,{...plan,criteria:{...plan.criteria,maxRmse:0}}).dossierStatus,'criteria_not_met');
const held={...plan,evaluation:{startUtc:'2017-04-01T19:30:00Z',endUtc:'2017-04-01T22:30:00Z'},calibration:{datasetId:manifest.id,train:{startUtc:'2017-04-01T16:30:00Z',endUtc:'2017-04-01T19:30:00Z'},test:{startUtc:'2017-04-01T19:30:00Z',endUtc:'2017-04-01T22:30:00Z'},minGain:.8,maxGain:1.2}};
const corrected=fieldEvidenceReview(declared,held);assert.ok(Math.abs(corrected.evaluation.gain-1.1)<1e-12);assert.ok(corrected.evaluation.evaluated.metrics!.rmse<1e-9);assert.ok(corrected.evaluation.raw.metrics!.rmse>0);
const oracle=spawnSync(python,['-I','-c','import sys,json,math; r=json.load(sys.stdin); e=[x[0]-x[1] for x in r]; print(json.dumps([sum(e)/len(e),math.sqrt(sum(x*x for x in e)/len(e))]))'],{input:JSON.stringify(review.rows.filter(r=>r.status==='paired').map(r=>[r.modeledValue,r.canonicalValue])),encoding:'utf8'});assert.equal(oracle.status,0,oracle.stderr);const [mbe,rmse]=JSON.parse(oracle.stdout);assert.ok(Math.abs(mbe-review.evaluation.raw.metrics!.mbe)<1e-9);assert.ok(Math.abs(rmse-review.evaluation.raw.metrics!.rmse)<1e-9);
assert.equal(fieldEvidenceCriteriaCsv(review).split('\r\n').length,6);assert.equal(fieldEvidenceRowsCsv(review).split('\r\n').length,review.rows.length+1);
const unsafe=fieldEvidenceReview(declared,{...plan,criteria:{...plan.criteria,source:'=SUM(1)<script>bad</script>'}});assert.ok(fieldEvidenceCriteriaCsv(unsafe).includes("'=SUM(1)"));assert.ok(!fieldEvidenceReviewHtml(unsafe).includes('<script>bad</script>'));
const heldSpan=corrected.usedIntervalSpans.evaluation!;
const heldRegister={...register,planSha256:corrected.report.planSha256,documents:register.documents.map(d=>({...d,applicabilityStartUtc:heldSpan.startUtc,applicabilityEndUtc:heldSpan.endUtc,reviewedAt:heldSpan.endUtc}))};
assert.equal(fieldEvidenceReview(declared,held,heldRegister).documentReadiness,'document_review_required');
const sparseCsv=['timestamp,value,qualityFlag,reason',...baseline.samples.map((r,i)=>i===0?`${r.timestamp},,missing,SYNTHETIC missing`:i===1?`${r.timestamp},1,excluded,SYNTHETIC excluded`:`${r.timestamp},${Number(r.acW)/1000},valid,`)].join('\n');
const sparse=run({...base,measurements:[importMeasurementCsv(manifest,sparseCsv)]});const sparseReview=fieldEvidenceReview(sparse,{...field,studyInputSha256:sparse.manifest.inputSha256});
for(const row of sparseReview.rows.filter(r=>r.status!=='paired')){assert.equal(row.evaluatedModeledValue,null);assert.equal(row.evaluatedResidual,null);}
assert.equal(sparseReview.evaluation.raw.coverage.statusCounts.missing,1);assert.equal(sparseReview.evaluation.raw.coverage.statusCounts.excluded,1);
const temperature=run({...base,measurements:[importMeasurementCsv({...manifest,modelPoint:'reference_cell_temperature',unit:'degC'},['timestamp,value,qualityFlag,reason',...baseline.samples.map(r=>`${r.timestamp},25,valid,`)].join('\n'))]});
assert.equal(fieldEvidenceReview(temperature,{...field,studyInputSha256:temperature.manifest.inputSha256}).evaluation.evaluated.matchedEnergyWh,null);
const snap=validateSnapshot({version:1,id:'00000000-0000-4000-8000-000000000047',savedAt:'2026-11-03T00:00:00Z',request:declared.request,result:declared});const restored=(await validateStudyBundle(JSON.parse(JSON.stringify(await makeStudyBundle([snap]))))).snapshots[0];assert.deepEqual(fieldEvidenceReview(restored.result,plan,register),ready);
assert.equal(JSON.stringify(result),before);
console.log('Step47 PASS: actual worker, independent Python error oracle, raw/held-out correction, binding/strict document schema/full interval applicability/late review gates, status precedence, export safety, old report compatibility and immutability. Synthetic only, never field validated.');
