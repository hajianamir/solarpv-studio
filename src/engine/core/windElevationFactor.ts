/** Ground-elevation component only. NCSEA Wind Engineering Committee 2024
 * school examples and Bentley STAAD.Pro 2025 ASCE 7-22 verification use
 * Ke = exp(-0.0000362 * elevation in FEET). SI conversion uses exact 0.3048 m/ft.
 * This does not validate the caller's exposure table, pressure chain or site/code.
 * Legacy below-sea-level policy remains no reduction (Ke=1), not a density claim.
 */
export function calculateWindElevationFactor(elevationM: number): number {
  if (!Number.isFinite(elevationM)) throw new RangeError('Elevation must be finite metres');
  return elevationM > 0 ? Math.exp(-0.0000362 * (elevationM / 0.3048)) : 1;
}
