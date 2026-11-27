import { runFinancialUncertaintyPropagation, type FinancialUqRunInput } from '../engine/core/uncertaintyPropagation';
import { uqDeterministicResultHash, uqHash } from './financialUqArchive';
import { assertFinancialUqResult } from './financialUqResultValidation';

/** Opt-in offline diagnostic, not an annual/finance adoption route or confidence interval. */
export function financialUqConvergence(input: FinancialUqRunInput, budgets: number[], seeds: number[]) {
  if (input.copulaFamily && input.copulaFamily !== 'gaussian_copula') {
    // Legacy t latents use a normal CDF; do not certify them as a t-copula.
    throw new Error('UQ_CONVERGENCE_UNVALIDATED_COPULA');
  }
  if (![input.plantCapacityKwp, input.inverterCapacityKw, input.baseAnnualYieldKwh].every(n => Number.isFinite(n) && n > 0)
    || (input.spearmanRhoGhiSoiling !== undefined && (!Number.isFinite(input.spearmanRhoGhiSoiling) || Math.abs(input.spearmanRhoGhiSoiling) > 1))) {
    throw new Error('UQ_CONVERGENCE_INVALID_SCENARIO');
  }
  if (budgets.length < 2 || budgets.length > 4 || seeds.length < 3 || seeds.length > 8
    || new Set(budgets).size !== budgets.length || new Set(seeds).size !== seeds.length
    || budgets.some((n, i) => !Number.isInteger(n) || n < 20 || n > 2000 || (i > 0 && n <= budgets[i - 1]))
    || seeds.some(n => !Number.isInteger(n) || n < 0 || n > 4294967295)) {
    throw new Error('UQ_CONVERGENCE_INVALID_DESIGN');
  }
  const rows = budgets.map(sampleSize => {
    const runs = seeds.map(seed => {
      const result = runFinancialUncertaintyPropagation({ ...input, sampleSize, seed });
      assertFinancialUqResult(result, sampleSize);
      return { seed, deterministicResultSha256: uqDeterministicResultHash(result),
        energyCdf: [result.annualGenerationMwh.p10, result.annualGenerationMwh.p50, result.annualGenerationMwh.p90],
        npvCdf: [result.npvUsd.p10, result.npvUsd.p50, result.npvUsd.p90],
        // Legacy LCOE p labels are reversed; explicitly return ascending CDF.
        lcoeCdf: [result.lcoeUsdPerMwh.p90, result.lcoeUsdPerMwh.p50, result.lcoeUsdPerMwh.p10] };
    });
    const envelope = (key: 'energyCdf' | 'npvCdf' | 'lcoeCdf') => [0, 1, 2].map(i => {
      const values = runs.map(r => r[key][i]);
      return { minimum: Math.min(...values), maximum: Math.max(...values), range: Math.max(...values) - Math.min(...values) };
    });
    return { sampleSize, runs, energyMwh: envelope('energyCdf'), npvUsd: envelope('npvCdf'), lcoeUsdPerMwh: envelope('lcoeCdf') };
  });
  const { seed, sampleSize, ...scenario } = input; void seed; void sampleSize;
  return { schemaVersion: 'financial-uq-convergence-v1' as const, scenarioSha256: uqHash(scenario),
    quantileOrder: ['CDF10', 'CDF50', 'CDF90'], rows,
    policy: { automaticAdoption: false, confidenceInterval: false, convergenceGuaranteed: false,
      assumptions: 'Observed min/max across selected seeds only. Production Gaussian GHI/soiling copula and independent LHS pricing/albedo; rounded legacy output. Not IID order-statistic intervals, additive variance attribution, calibrated project uncertainty, or an N=100 guarantee. Zero latent correlation does not make all financial outputs independent.' } };
}
