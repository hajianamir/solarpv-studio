/**
 * Human-facing formatter for energy values expressed in kWh.
 *
 * The simulation keeps full-precision Number values. This helper is only for
 * presentation: it interprets Number#toString's shortest round-tripping decimal
 * as the published decimal value and rounds that decimal to 0.01 kWh, nearest
 * with ties away from zero. It never changes simulation inputs or results.
 */
export function formatEnergyKwh(value: number): string {
  if (!Number.isFinite(value)) return '—';

  const decimal = value.toString();
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(decimal);
  if (!match) return '—';

  const [, sign, whole, fraction = '', exponentText = '0'] = match;
  const exponent = Number(exponentText);
  const digits = BigInt(`${whole}${fraction}`);
  const decimalScale = fraction.length - exponent;
  let numerator = digits * 100n;
  let denominator = 1n;

  if (decimalScale > 0) {
    denominator = 10n ** BigInt(decimalScale);
  } else if (decimalScale < 0) {
    numerator *= 10n ** BigInt(-decimalScale);
  }

  let cents = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder * 2n >= denominator) cents += 1n;

  const formatted = `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
  return sign && cents !== 0n ? `-${formatted}` : formatted;
}
