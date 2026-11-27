/**
 * Named inherited scalar GHI-to-POA screen, NOT a physical irradiance model.
 * Source: repository base 0d41fd38c8038fb5a2c4f1da8082dc2fbcd2f8fb.
 * No independent empirical validation supports its coefficients/quantization.
 * Inputs: degrees; output: percent over horizontal GHI. Absence, nonfinite and
 * out-of-domain legacy behavior is preserved, not newly endorsed.
 */
export const SCALAR_TRANSPOSITION_POLICY = 'legacy_latitude_tilt_screen_v1' as const;
export const SCALAR_TRANSPOSITION_DISCLOSURE = {
  en: 'POA policy: legacy_latitude_tilt_screen_v1. Unvalidated latitude/tilt screen; tracker uses clear-sky relative gain anchored at 1.168. Not weather-driven transposition.',
  fa: 'سیاست POA: legacy_latitude_tilt_screen_v1. غربالگری تأییدنشده عرض/شیب؛ ردیاب از بهره نسبی آسمان صاف با مبنای ۱٫۱۶۸ استفاده می‌کند. مدل مبتنی بر هواشناسی نیست.',
} as const;

export function calculateFixedTiltTranspositionGain(
  tiltDeg?: number,
  latitudeDeg?: number
): number {
  if (tiltDeg === undefined) return 16.8; // Baseline optimal tilt default
  if (tiltDeg <= 0) return 0.0;
  const absLat = Math.abs(latitudeDeg ?? 35.69);
  const optTilt = Math.max(8, Math.min(60, absLat * 0.88));
  const maxGain = 12.0 + Math.min(6.0, absLat * 0.15);
  const tiltRatio = Math.min(1.0, tiltDeg / optTilt);
  const factor = Math.sin((Math.PI / 2.0) * tiltRatio);
  const angleDelta = Math.max(0, tiltDeg - optTilt);
  const excessDrop = Math.cos((angleDelta * Math.PI) / 180.0);
  return Number((maxGain * factor * excessDrop).toFixed(1));
}
