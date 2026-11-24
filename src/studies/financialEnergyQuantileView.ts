import { explicitEnergyQuantiles, type LegacyEnergyQuantiles } from './uqQuantileContract';

/** Presentation only. Caller is the legacy financial UQ panel; no research or adoption path. */
export function financialEnergyQuantileView(energy: LegacyEnergyQuantiles, traceId: string) {
  return explicitEnergyQuantiles({ enabled: true, source: 'legacy_financial_cdf_v1', provenance: traceId, energy });
}
export function financialEnergyQuantileSections(energy: LegacyEnergyQuantiles, traceId: string) {
  const view = financialEnergyQuantileView(energy, traceId);
  if (view.status !== 'available') throw new Error('UQ_VIEW_UNAVAILABLE');
  return [{ title: 'Energy quantiles / صدک انرژی', rows: [
    ['Schema', view.schemaVersion], ['Source', view.source], ['Provenance / trace ID', view.provenance],
    ['Validation', view.validationStatus], ['Unit', view.unit],
    ['Energy exceedance P10 (CDF q90)', view.energyExceedance.p10],
    ['Energy exceedance P50 (CDF q50)', view.energyExceedance.p50],
    ['Energy exceedance P90 (CDF q10)', view.energyExceedance.p90],
    ['CDF q10', view.cdf.q10], ['CDF q50', view.cdf.q50], ['CDF q90', view.cdf.q90],
    ['Semantics', view.policy.semantics], ['Precision', view.policy.precision],
    ['Limitations', view.policy.limitations],
    ['Scope', 'Standalone legacy financial UQ snapshot; not the project engineering report.'],
    ['Annual energy', 'Annual coverage is not verified by this display adapter.'],
    ['Isolation', 'No research energy adoption or financial recalculation.'],
  ] }];
}
