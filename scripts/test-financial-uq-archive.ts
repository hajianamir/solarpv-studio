import assert from 'node:assert/strict';
import {makeFinancialUqArchive,readFinancialUqArchive,uqHash,uqDeterministicResultHash,MAX_UQ_ARCHIVE_BYTES} from '../src/studies/financialUqArchive';
import {runFinancialUncertaintyPropagation} from '../src/engine/core/uncertaintyPropagation';
import {DEFAULT_FINANCIAL_PRICING} from '../src/engine/financialEngine';
const files={'src/engine/financialEngine.ts':'a'.repeat(64)};const source={files,bundleSha256:uqHash(files)};
const request={plantCapacityKwp:1000,inverterCapacityKw:1000,baseAnnualYieldKwh:1800000,basePricing:DEFAULT_FINANCIAL_PRICING,sampleSize:60,seed:42};
const result=runFinancialUncertaintyPropagation(request);const before=JSON.stringify({request,result});
const archive=makeFinancialUqArchive(request,result,'SYNTHETIC financial panel context',source);
assert.deepEqual(readFinancialUqArchive(JSON.stringify(archive)),archive);
assert.equal(archive.canonicalQuantiles.energy.status,'available');
if(archive.canonicalQuantiles.energy.status==='available')assert.equal(archive.canonicalQuantiles.energy.energyExceedance.p90,result.annualGenerationMwh.p10);
assert.equal(archive.canonicalQuantiles.lcoe.cdf.q90,result.lcoeUsdPerMwh.p10);
assert.equal(archive.canonicalQuantiles.npv.cdf.q10,result.npvUsd.p10);
assert.equal(uqDeterministicResultHash(runFinancialUncertaintyPropagation(archive.request)),archive.deterministicResultSha256);
assert.equal(JSON.stringify({request,result}),before);
assert.equal(uqHash({b:1,a:2}),uqHash({a:2,b:1}));
for(const key of ['seed','source','result','canonical','context'] as const){
 const a=structuredClone(archive);
 if(key==='seed')a.request.seed=43;
 if(key==='source')a.source.files['src/engine/financialEngine.ts']='b'.repeat(64);
 if(key==='result')a.legacyResult.npvUsd.p50++;
 if(key==='canonical')a.canonicalQuantiles.npv={...a.canonicalQuantiles.npv,cdf:{...a.canonicalQuantiles.npv.cdf,q10:a.canonicalQuantiles.npv.cdf.q10+1}};
 if(key==='context')a.panelContextSha256='c'.repeat(64);
 assert.throws(()=>readFinancialUqArchive(JSON.stringify(a)));
}
// Even recomputing the outer checksum cannot conceal inconsistent semantic mapping or input digest.
const forged=structuredClone(archive);forged.canonicalQuantiles.npv={...forged.canonicalQuantiles.npv,cdf:{...forged.canonicalQuantiles.npv.cdf,q10:forged.canonicalQuantiles.npv.cdf.q10+1}};const {archiveSha256:_,...payload}=forged;forged.archiveSha256=uqHash(payload);
assert.throws(()=>readFinancialUqArchive(JSON.stringify(forged)),/INTEGRITY/);
assert.throws(()=>readFinancialUqArchive(JSON.stringify(archive).replace('"schemaVersion":','"schemaVersion":"bad","schemaVersion":')),/duplicate/);
assert.throws(()=>readFinancialUqArchive(' '.repeat(MAX_UQ_ARCHIVE_BYTES+1)),/limit/);
assert.throws(()=>makeFinancialUqArchive(request,result,'test',null),/UNAVAILABLE/);
assert.throws(()=>makeFinancialUqArchive({...request,seed:NaN},result,'test',source));
assert.throws(()=>readFinancialUqArchive(JSON.stringify({...archive,schemaVersion:'unknown-v2'})));
assert.throws(()=>uqHash({x:Infinity}));
console.log('PASS UQ archive: canonical versioned migration, exact replay, input/result/code/context hashes, immutable roundtrip, tamper/duplicate/size/nonfinite/unknown-schema rejection');
