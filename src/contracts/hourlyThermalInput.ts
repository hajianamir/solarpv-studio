/** Synthetic screening-domain validation, not manufacturer or climate applicability.
 * Temperatures are degrees C; PSH is kWh/m²/day; gamma is percent per degree C.
 * Limits prevent nonsensical screen inputs, not an assurance of validity throughout them.
 */
export function requireHourlyThermalInput(input: {
  latitudeDeg: number; peakSunHours: number; ambientTempMinC: number; ambientTempMaxC: number;
  ambientTempMeanC?: number; noctC: number; tempCoeffPmpPct: number; ambientBiasSensitivityC?: number; installationEnvironment?: string;
}): void {
  if (!Number.isFinite(input.latitudeDeg) || Math.abs(input.latitudeDeg) > 90) throw new RangeError('Latitude must be finite within [-90, 90] degrees.');
  if (!Number.isFinite(input.peakSunHours) || input.peakSunHours < 0) throw new RangeError('Daily peak sun hours must be finite and nonnegative.');
  if (!Number.isFinite(input.ambientTempMinC) || !Number.isFinite(input.ambientTempMaxC)) throw new RangeError('Finite minimum and maximum ambient temperatures are required.');
  if (input.installationEnvironment !== undefined && !['ground_mount', 'industrial_shed', 'rooftop_flat_concrete'].includes(input.installationEnvironment)) throw new RangeError('Unknown installation environment.');
  for (const value of [input.ambientTempMinC, input.ambientTempMaxC, input.ambientTempMeanC]) {
    if (value !== undefined && (!Number.isFinite(value) || value <= -273.15)) throw new RangeError('Ambient temperatures must be finite and above absolute zero.');
  }
  if (input.ambientTempMinC > input.ambientTempMaxC) throw new RangeError('Minimum ambient temperature exceeds maximum.');
  if (input.ambientTempMeanC !== undefined && (input.ambientTempMeanC < input.ambientTempMinC || input.ambientTempMeanC > input.ambientTempMaxC)) throw new RangeError('Annual mean must lie within the supplied design extremes.');
  if (!Number.isFinite(input.noctC) || input.noctC <= -273.15) throw new RangeError('Simple NOCT screen requires finite NOCT above absolute zero.');
  if (!Number.isFinite(input.tempCoeffPmpPct)) throw new RangeError('Power temperature coefficient must be finite.');
  if (input.ambientBiasSensitivityC !== undefined && (!Number.isFinite(input.ambientBiasSensitivityC) || input.ambientBiasSensitivityC < 0)) throw new RangeError('Temperature sensitivity allowance must be finite and nonnegative.');
}

/** Validate direct component arguments before evaluating the hourly loop. */
export function requireThermalEvaluationArgs(biasC: number, meanC: number): void {
  if (!Number.isFinite(biasC) || !Number.isFinite(meanC) || meanC <= -273.15) throw new RangeError('Thermal component requires finite bias and a finite mean above absolute zero.');
}
