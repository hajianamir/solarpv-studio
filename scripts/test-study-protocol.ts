import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {makeStudyProtocol,validateStudyProtocol,readStudyProtocol,studyProtocolHtml,MAX_PROTOCOL_BYTES} from '../src/studies/studyProtocol';
import {runStudyValidation} from '../src/studies/studyValidation';
import {validationPlanExample} from '../src/components/StudyValidationTools';
import {canonicalBundleJson,makeStudyBundle,validateStudyBundle} from '../src/studies/studyExchange';
import {validateResult,validateSnapshot} from '../src/studies/studyWorkflow';
const request=JSON.parse(readFileSync('services/pvlib_study/tests/synthetic-study.json','utf8'));
const p=spawnSync(process.env.PVLIB_PYTHON??'python',['-I','-B','services/pvlib_study/worker.py'],{input:JSON.stringify(request),encoding:'utf8',maxBuffer:16*1024*1024});assert.equal(p.status,0,p.stderr+p.stdout);const result=validateResult(JSON.parse(p.stdout)),before=JSON.stringify(result);
const plan=validationPlanExample(result,'energy_uncertainty'),metadata={protocolId:'test_44',reviewer:'SYNTHETIC reviewer',revision:1,createdAt:'2026-11-03T12:00:00Z',changeReason:'SYNTHETIC reproducibility witness'};
const pkg=makeStudyProtocol(result,plan,metadata);
assert.throws(()=>readStudyProtocol(result,JSON.stringify(pkg).replace('"schemaVersion":"study-protocol-package-v1"','"schemaVersion":"incorrect","schemaVersion":"study-protocol-package-v1"')),/duplicate/);
assert.deepEqual(validateStudyProtocol(result,JSON.parse(JSON.stringify(pkg))),pkg);assert.deepEqual(readStudyProtocol(result,JSON.stringify(pkg,null,2)),pkg);assert.deepEqual(pkg.report,runStudyValidation(result,plan));
const digest=(value:unknown)=>createHash('sha256').update(canonicalBundleJson(value)).digest('hex');const {packageSha256,...payload}=pkg;assert.equal(packageSha256,digest(payload));assert.equal(pkg.reportSha256,digest(pkg.report));assert.equal(pkg.resultSha256,digest(result));
function reorder(value:unknown):unknown{if(Array.isArray(value))return value.map(reorder);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reorder(v)]));return value;}
assert.deepEqual(validateStudyProtocol(result,reorder(pkg)),pkg);
for(const patch of [{reviewer:' '},{revision:0},{revision:2},{createdAt:'2026-02-30T00:00:00Z'},{createdAt:'2026-11-03T12:00:00'},{extra:true},{previousPackageSha256:pkg.packageSha256}])assert.throws(()=>makeStudyProtocol(result,plan,{...metadata,...patch}));
const revised=makeStudyProtocol(result,plan,{...metadata,revision:2,previousPackageSha256:pkg.packageSha256,changeReason:'Declared revision; history not authenticated'});assert.notEqual(revised.packageSha256,pkg.packageSha256);assert.deepEqual(validateStudyProtocol(result,revised),revised);
for(const field of ['reportSha256','resultSha256','packageSha256'] as const){const bad=structuredClone(pkg);bad[field]='0'.repeat(64);assert.throws(()=>validateStudyProtocol(result,bad));}
const tampered=structuredClone(pkg);Object.assign(tampered.report.result,{untrustedValue:1});tampered.reportSha256=digest(tampered.report);const {packageSha256:_,...corruptPayload}=tampered;tampered.packageSha256=digest(corruptPayload);assert.throws(()=>validateStudyProtocol(result,tampered),/recomputed/);
const differentWorker=structuredClone(result);differentWorker.manifest.workerSha256='a'.repeat(64);validateResult(differentWorker);assert.throws(()=>validateStudyProtocol(differentWorker,pkg),/different exact/);
const differentEngine=structuredClone(result);differentEngine.manifest.engineVersion='1.16.1';validateResult(differentEngine);assert.throws(()=>validateStudyProtocol(differentEngine,pkg),/different exact/);
assert.throws(()=>validateStudyProtocol(result,{...pkg,unknown:true}));assert.throws(()=>readStudyProtocol(result,'{'));assert.throws(()=>readStudyProtocol(result,' '.repeat(MAX_PROTOCOL_BYTES+1)));assert.throws(()=>readStudyProtocol(result,'é'.repeat(MAX_PROTOCOL_BYTES/2+1)));
const html=studyProtocolHtml(makeStudyProtocol(result,plan,{...metadata,reviewer:'<script>bad</script>'}));assert.ok(!html.includes('<script>bad</script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('No authenticated reviewer'));
const snap=validateSnapshot({version:1,id:'00000000-0000-4000-8000-000000000044',savedAt:metadata.createdAt,request:result.request,result});const restored=(await validateStudyBundle(JSON.parse(JSON.stringify(await makeStudyBundle([snap]))))).snapshots[0];assert.deepEqual(validateStudyProtocol(restored.result,pkg),pkg);assert.equal(JSON.stringify(result),before);
console.log('Step 44 PASS: exact result/engine/worker binding, independent Node SHA oracle, canonical key-order portability, package/report tamper + rehash rejected by recompute, metadata/revision/UTC/size guards, old-plan compatibility, safe HTML and immutable bundle restore. No signature or preregistration claim.');
