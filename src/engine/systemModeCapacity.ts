import type { FinancialSystemMode } from './financialEngine';

/** Upstream-grid and harmonics screening requires a utility connection. */
export function isUpstreamGridAnalysisAvailable(systemMode: FinancialSystemMode): boolean {
  return systemMode !== 'offgrid';
}

/**
 * AC reference for the PV array's displayed DC/AC ratio. Utility plants use
 * their explicit AC target; customer systems use the inverter capacity that
 * was actually sized from their load profile. No reference means N/A.
 */
export function resolveArrayAcReferenceKw(
  systemMode: FinancialSystemMode,
  targetPowerplantCapacityKw: number,
  designedInverterCapacityKw: number
): number | null {
  const candidate = systemMode === 'powerplant'
    ? targetPowerplantCapacityKw
    : designedInverterCapacityKw;
  return Number.isFinite(candidate) && candidate > 0 ? candidate : null;
}

/**
 * Load-driven daily PV energy target for customer modes. Plant sizing is
 * deliberately excluded and remains based on the powerplant yield workflow.
 */
export function calculateLoadModeDailySizingTargetKwh(
  systemMode: FinancialSystemMode,
  totalDailyLoadKwh: number,
  outageHours: number
): number | null {
  if (systemMode === 'powerplant') return null;
  // Zero is a real load, not an absent observation. No synthetic 20 kWh/day.
  if (!Number.isFinite(totalDailyLoadKwh) || totalDailyLoadKwh < 0 || !Number.isFinite(outageHours) || outageHours < 0) {
    throw new RangeError('Load and outage hours must be finite and non-negative');
  }
  if (systemMode === 'ongrid') return (totalDailyLoadKwh / 24) * outageHours;
  return totalDailyLoadKwh;
}
