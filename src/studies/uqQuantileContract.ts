/** Opt-in presentation contract only. Never adopts energy or changes financial calculations. */
export const UQ_QUANTILE_CONTRACT_VERSION = 'uq-quantiles-v1' as const;
export const UQ_QUANTILE_FEATURE = 'uq_explicit_quantiles_v1' as const;
export interface LegacyEnergyQuantiles {
  /** Legacy financial engine names: CDF percentiles, NOT exceedance P-values. */
  p10: number;
  p50: number;
  p90: number;
  unit: string;
}
export type UqQuantileRequest = {
  enabled: boolean;
  source: 'legacy_financial_cdf_v1';
  provenance: string;
  energy: LegacyEnergyQuantiles;
};

/** No mean inference, distribution fitting, interpolation, annualization or tail extrapolation. */
export function explicitEnergyQuantiles(request: UqQuantileRequest) {
  if (request.enabled !== true) {
    return { status: 'disabled', feature: UQ_QUANTILE_FEATURE } as const;
  }
  if (request.source !== 'legacy_financial_cdf_v1') throw new Error('UQ_UNSUPPORTED_SOURCE');
  if (typeof request.provenance !== 'string' || !request.provenance.trim()) throw new Error('UQ_PROVENANCE_REQUIRED');
  const { p10, p50, p90, unit } = request.energy;
  if (![p10, p50, p90].every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0)) {
    throw new Error('UQ_INVALID_ENERGY_QUANTILES');
  }
  if (p10 > p50 || p50 > p90) throw new Error('UQ_UNORDERED_QUANTILES');
  // The legacy financial engine emits MWh/year. Preserve its declared period; do not annualize.
  if (!['Wh', 'kWh', 'MWh', 'MWh/year'].includes(unit)) throw new Error('UQ_UNSUPPORTED_ENERGY_UNIT');
  return {
    status: 'available',
    feature: UQ_QUANTILE_FEATURE,
    schemaVersion: UQ_QUANTILE_CONTRACT_VERSION,
    source: request.source,
    provenance: request.provenance.trim(),
    unit,
    cdf: { q10: p10, q50: p50, q90: p90 },
    energyExceedance: { p10: p90, p50, p90: p10 },
    validationStatus: 'not_field_validated',
    policy: {
      financeMutation: false,
      researchEnergyAdoption: false,
      precision: 'Values preserved exactly from source; no additional numerical accuracy claimed.',
      limitations: 'Presentation mapping only. No P75/P99, mean, fitted distribution, calibration, horizon verification or bankability certification.',
      semantics: 'Energy exceedance P90 = CDF q10; P50 is median, not necessarily mean.',
    },
  } as const;
}
