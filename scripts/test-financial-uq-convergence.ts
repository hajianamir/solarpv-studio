import assert from 'node:assert/strict';
import { financialUqConvergence } from '../src/studies/financialUqConvergence';
import { runFinancialUncertaintyPropagation } from '../src/engine/core/uncertaintyPropagation';
import { uqDeterministicResultHash } from '../src/studies/financialUqArchive';
import { DEFAULT_FINANCIAL_PRICING } from '../src/engine/financialEngine';
const base = { plantCapacityKwp: 1000, inverterCapacityKw: 1000, baseAnnualYieldKwh: 1800000, basePricing: DEFAULT_FINANCIAL_PRICING };
for (const rho of [0, -.6]) {
  const input = { ...base, spearmanRhoGhiSoiling: rho };
  const before = JSON.stringify(input);
  const report = financialUqConvergence(input, [20, 100, 400], [7, 42, 1337]);
  assert.deepEqual(report, financialUqConvergence(input, [20, 100, 400], [7, 42, 1337]));
  assert.equal(JSON.stringify(input), before);
  for (const row of report.rows) {
    for (const run of row.runs) {
      const direct = runFinancialUncertaintyPropagation({ ...input, sampleSize: row.sampleSize, seed: run.seed });
      assert.equal(run.deterministicResultSha256, uqDeterministicResultHash(direct));
      assert.deepEqual(run.energyCdf, [direct.annualGenerationMwh.p10, direct.annualGenerationMwh.p50, direct.annualGenerationMwh.p90]);
      assert.deepEqual(run.lcoeCdf, [direct.lcoeUsdPerMwh.p90, direct.lcoeUsdPerMwh.p50, direct.lcoeUsdPerMwh.p10]);
    }
    for (const [key, envelope] of [['energyCdf', row.energyMwh], ['npvCdf', row.npvUsd], ['lcoeCdf', row.lcoeUsdPerMwh]] as const) {
      envelope.forEach((e, i) => {
        const sorted = row.runs.map(r => r[key][i]).sort((a,b) => a-b);
        assert.equal(e.minimum, sorted[0]); assert.equal(e.maximum, sorted[sorted.length-1]);
        assert.equal(e.range, sorted[sorted.length-1]-sorted[0]);
      });
    }
  }
  assert.equal(report.policy.confidenceInterval, false);
  assert.equal(report.policy.automaticAdoption, false);
}
for (const change of [{plantCapacityKwp:0}, {inverterCapacityKw:NaN}, {baseAnnualYieldKwh:-1}, {spearmanRhoGhiSoiling:1.1}, {spearmanRhoGhiSoiling:Infinity}]) assert.throws(() => financialUqConvergence({...base,...change},[20,40],[1,2,3]), /INVALID_SCENARIO/);
for (const budgets of [[20], [20,20], [100,20], [19,100], [20,2001], [20,NaN]]) assert.throws(() => financialUqConvergence(base, budgets, [1,2,3]), /INVALID_DESIGN/);
for (const seeds of [[1,2], [1,1,2], [-1,2,3], [1,2,Infinity]]) assert.throws(() => financialUqConvergence(base,[20,40],seeds), /INVALID_DESIGN/);
for (const copulaFamily of ['students_t_copula','clayton_copula','gumbel_copula'] as const) assert.throws(() => financialUqConvergence({...base,copulaFamily},[20,40],[1,2,3]), /UNVALIDATED_COPULA/);
console.log('PASS production UQ convergence: repeated seed/budget replay, direct result hashes, independently sorted envelopes, correlation scenarios and fail-closed design');
