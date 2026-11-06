// First-Order Screening Proxy for Bifacial Rear Irradiance Gain
//
// DISCLAIMER / METHODOLOGY LIMITATION:
// This is a first-order empirical screening proxy (bf * gcr * albedo * 0.45, clamped [0, 0.15]),
// intended for rapid preliminary techno-economic appraisal of Iranian C&I and utility PV plants.
// It is NOT a rigorous 2D/2.5D view-factor model, infinite-shed integral, or ray-traced rear irradiance
// distribution engine. It assumes standard ground clearance (~0.9 - 1.2 m), uniform ground albedo,
// and negligible structural shading from torque tubes or purlins. Detailed bankable design requires
// dedicated 2D view-factor or ray-tracing simulation with local terrain albedo surveys.

export interface BifacialGainInput {
  isBifacial?: boolean;
  bifacialityFactor: number;
  groundCoverRatio: number;
  albedo: number;
}

/**
 * Calculates the first-order rear irradiance gain fraction.
 * Formula: bf * gcr * albedo * 0.45, clamped to [0, 0.15].
 *
 * @param input Bifacial parameters (bifacialityFactor [0..1], groundCoverRatio [0..1], albedo [0..1])
 * @returns Dimensionless gain fraction in range [0, 0.15]
 */
export function rearGainFraction(input: BifacialGainInput): number {
  if (input.isBifacial === false) return 0.0;
  const bf = Math.max(0, input.bifacialityFactor ?? 0);
  if (bf <= 0) return 0.0;

  const gcr = Math.max(0, input.groundCoverRatio ?? 0.38);
  const albedo = Math.max(0, input.albedo ?? 0.22);

  const raw = bf * gcr * albedo * 0.45;
  return Math.min(0.15, Math.max(0.0, raw));
}

/**
 * Calculates the first-order rear irradiance gain percentage.
 *
 * @param input Bifacial parameters
 * @returns Gain percentage in range [0, 15.0]
 */
export function rearGainPercent(input: BifacialGainInput): number {
  return Number((rearGainFraction(input) * 100.0).toFixed(2));
}

/**
 * Direct alias for rearGainFraction for screening appraisal.
 */
export const computeBifacialRearGain = rearGainFraction;
