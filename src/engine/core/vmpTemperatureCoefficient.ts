/**
 * Linear temperature-window screening, referenced to 25 °C.
 * Pmp = Vmp * Imp implies gamma_Pmp = beta_Vmp + alpha_Imp locally.
 * Isc is NOT Imp: subtracting alpha_Isc is only a proxy, not an IEC conformity proof.
 * Missing measured Vmp data has no guaranteed conservative bias at either window.
 */
export function resolveVmpTemperatureCoefficient(
  measuredPct: number | undefined,
  powerPct: number,
  iscPct?: number,
): { coefficientPct: number; warning?: string } {
  if (measuredPct !== undefined) {
    if (!Number.isFinite(measuredPct) || measuredPct >= 0) {
      throw new RangeError('Vmp temperature coefficient must be finite and negative');
    }
    return { coefficientPct: measuredPct };
  }
  const coefficientPct = iscPct === undefined ? powerPct : powerPct - iscPct;
  if (!Number.isFinite(coefficientPct) || coefficientPct >= 0) {
    throw new RangeError('Approximated Vmp temperature coefficient must be finite and negative');
  }
  return {
    coefficientPct,
    warning: 'Vmp temperature coefficient is approximated from Pmp/Voc' +
      (iscPct === undefined ? '' : ' with an Isc (not Imp) current-coefficient proxy') +
      '; not guaranteed conservative for hot or cold MPPT limits. Verify manufacturer Vmp data; this is screening, not conformity assessment.',
  };
}
