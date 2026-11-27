import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {sampleBivariateCopula,runFinancialUncertaintyPropagation,type FinancialUqRunInput,type CopulaFamily} from '../src/engine/core/uncertaintyPropagation';
import {makeFinancialUqArchive,readFinancialUqArchive,financialUqArchiveReplayStatus,uqHash,uqDeterministicResultHash} from '../src/studies/financialUqArchive';
import {FINANCIAL_UQ_EXECUTION_POLICY} from '../src/contracts/financialUqExecutionPolicy';
import {FinancialUqArchivePanel} from '../src/components/FinancialUqArchivePanel';
import {startFinancialUq} from '../src/studies/financialUqRunner';
const fixture=JSON.parse(readFileSync('scripts/fixtures/financial-uq-retirement.json','utf8'));
const input=fixture.input as FinancialUqRunInput;
const before=JSON.stringify(fixture.legacyStudentTArchive);
const legacy=readFinancialUqArchive(before);
assert.equal(legacy.schemaVersion,'financial-uq-archive-v1');
assert.equal(legacy.request.copulaFamily,'students_t_copula');
assert.equal(JSON.stringify(legacy),before,'Historical payload and hashes must not be migrated/reinterpreted');
assert.equal(financialUqArchiveReplayStatus(legacy,legacy.source),'legacy_read_only','Even matching code cannot authorize a retired archive');
assert.throws(()=>runFinancialUncertaintyPropagation(legacy.request),/STUDENT_T_RETIRED/);
assert.throws(()=>sampleBivariateCopula('students_t_copula',0,20,5,42),/STUDENT_T_RETIRED/);
assert.throws(()=>sampleBivariateCopula('unknown' as CopulaFamily,0,20),/UNSUPPORTED_COPULA/);
let allocations=0;
await assert.rejects(startFinancialUq(legacy.request,{workerFactory:()=>{allocations++;throw new Error('should never allocate');}}).promise,/COPULA_EXECUTION_BLOCKED/);
assert.equal(allocations,0);
for(const mode of ['powerplant','ongrid','offgrid'] as const) {
 const result=runFinancialUncertaintyPropagation({...input,systemMode:mode});
 assert.equal(uqDeterministicResultHash(result),fixture.gaussianDeterministicHashes[mode],'Gaussian numerical result changed from actual base execution');
 const archive=makeFinancialUqArchive({...input,systemMode:mode},result,'SYNTHETIC context',legacy.source);
 assert.equal(archive.schemaVersion,'financial-uq-archive-v2');assert.equal(archive.executionPolicy,FINANCIAL_UQ_EXECUTION_POLICY);
 assert.deepEqual(readFinancialUqArchive(JSON.stringify(archive)),archive);
 assert.equal(financialUqArchiveReplayStatus(archive,legacy.source),'eligible');
 assert.equal(financialUqArchiveReplayStatus(archive,null),'code_mismatch');
 assert.equal(financialUqArchiveReplayStatus(archive,{...legacy.source,bundleSha256:'0'.repeat(64)}),'code_mismatch');
 const oldGaussian={...archive,schemaVersion:'financial-uq-archive-v1'} as Record<string,unknown>;
 delete oldGaussian.executionPolicy;delete oldGaussian.archiveSha256;oldGaussian.archiveSha256=uqHash(oldGaussian);
 assert.equal(financialUqArchiveReplayStatus(readFinancialUqArchive(JSON.stringify(oldGaussian)),legacy.source),'legacy_read_only');
 assert.throws(()=>makeFinancialUqArchive(legacy.request,legacy.legacyResult,'test',legacy.source),/STUDENT_T_RETIRED/);
 assert.throws(()=>makeFinancialUqArchive(input,legacy.legacyResult,'test',legacy.source),/STUDENT_T_RETIRED/);
 for(const modification of [{executionPolicy:'silently-fixed-t-v2'},{schemaVersion:'financial-uq-archive-v3'},{request:{...archive.request,copulaFamily:'students_t_copula'}}]) {
  const forged={...archive,...modification} as Record<string,unknown>;
  delete forged.archiveSha256;forged.archiveSha256=uqHash(forged);
  assert.throws(()=>readFinancialUqArchive(JSON.stringify(forged)),'Rehashing cannot authorize unsupported policy/family/version');
 }
 for(const lang of ['en','fa'] as const) {
  const html=renderToStaticMarkup(React.createElement(FinancialUqArchivePanel,{input,result,panelContext:'test',lang}));
  assert.match(html,/data-testid="uq-execution-policy"/);
  assert.match(html,lang==='en'?/V1 archives remain readable/:/آرشیو v1 فقط خواندنی/);
 }
}
console.log('PASS UQ retirement: genuine historical archive intact/read-only, explicit v2 policy, no retired execution/fallback/worker allocation, exact Gaussian baseline hashes in three modes, tamper/unknown-policy rejection and bilingual disclosure');
