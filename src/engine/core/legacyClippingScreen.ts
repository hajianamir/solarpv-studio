/** One owner for the inherited ILR-only clipping heuristic.
 * NOT a physical inverter model: no irradiance distribution, voltage, efficiency
 * curve or time series enters it. Bounds and coefficients are local legacy
 * policy, not independently validated physical limits. Callers retain their
 * existing input normalization and display rounding around this raw screen.
 */
export function legacyClippingScreen(dcAcRatio: number): {rawClippingPct: number; clippingPct: number} {
  const rawClippingPct = -0.2 - 6.5 * Math.max(0, dcAcRatio - 1.3);
  return {rawClippingPct, clippingPct: Math.max(-85.0, Math.min(-0.2, rawClippingPct))};
}
