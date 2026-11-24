import type { MetricDistributionOutput } from '../engine/core/uncertaintyPropagation';
export type FinancialQuantileMetric = 'lcoe' | 'npv';
/** Presentation adapter for the inspected legacy financial engine only, not arbitrary P-values. */
export function financialMetricQuantiles(metric: FinancialQuantileMetric, value: MetricDistributionOutput, traceId: string) {
  if (metric !== 'lcoe' && metric !== 'npv') throw new Error('UQ_UNSUPPORTED_METRIC');
  if (typeof traceId !== 'string' || !traceId.trim()) throw new Error('UQ_PROVENANCE_REQUIRED');
  const {p10, p50, p90, unit} = value;
  if (![p10, p50, p90].every(x => typeof x === 'number' && Number.isFinite(x))) throw new Error('UQ_INVALID_QUANTILES');
  if (unit !== (metric === 'lcoe' ? '$/MWh' : 'USD')) throw new Error('UQ_UNSUPPORTED_METRIC_UNIT');
  // Legacy computeStats(..., isCostMetric=true) swaps cost p10/p90; NPV is ordinary CDF.
  const q10 = metric === 'lcoe' ? p90 : p10;
  const q90 = metric === 'lcoe' ? p10 : p90;
  if (q10 > p50 || p50 > q90 || (metric === 'lcoe' && q10 < 0)) throw new Error('UQ_UNORDERED_QUANTILES');
  return {
    schemaVersion: 'financial-metric-quantiles-v1', source: 'legacy_financial_compute_stats_v1', metric,
    provenance: traceId.trim(), unit, cdf: {q10, q50: p50, q90},
    adverseTail: {cdfProbability: metric === 'lcoe' ? 0.9 : 0.1, value: metric === 'lcoe' ? q90 : q10, direction: metric === 'lcoe' ? 'higher_cost' : 'lower_npv'},
    validationStatus: 'not_field_validated',
    precision: 'Rounded legacy values preserved; no additional accuracy claimed.',
    limitations: 'CDF quantiles, not confidence intervals. Conditional exploratory UQ, not bankability certification. No loss probability or expected shortfall inferred.',
    financeMutation: false, researchEnergyAdoption: false,
  } as const;
}
export function financialMetricQuantileSections(metric: FinancialQuantileMetric, value: MetricDistributionOutput, traceId: string) {
  const view = financialMetricQuantiles(metric, value, traceId);
  return [{title: `${metric.toUpperCase()} CDF quantiles`, rows: [
    ['Schema', view.schemaVersion], ['Source', view.source], ['Provenance', view.provenance], ['Unit', view.unit],
    ['CDF q10', view.cdf.q10], ['CDF q50 (median)', view.cdf.q50], ['CDF q90', view.cdf.q90],
    ['Adverse direction', view.adverseTail.direction], ['Adverse tail value', view.adverseTail.value],
    ['Adverse CDF probability', view.adverseTail.cdfProbability], ['Validation', view.validationStatus],
    ['Precision', view.precision], ['Limitations', view.limitations],
    ['Isolation', 'No financial recalculation or research energy adoption.'],
  ]}];
}
