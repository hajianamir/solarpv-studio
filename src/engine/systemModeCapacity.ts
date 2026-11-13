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
  // Preserve the existing `value || 20` fallback and Math.max behavior exactly;
  // load and outage sizing semantics are intentionally not tightened here.
  const dailyLoad = totalDailyLoadKwh || 20;
  if (systemMode === 'ongrid') {
    return Math.max(1, (dailyLoad / 24) * outageHours);
  }
  return Math.max(1, dailyLoad);
}
