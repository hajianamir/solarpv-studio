/** Signed annual loss: negative values are gains, not missing/invalid data.
 * This validates a loss budget, not the climatic applicability of its source.
 */
export function requireSignedThermalLoss(lossPct: number): void {
  if (!Number.isFinite(lossPct) || lossPct > 100) {
    throw new RangeError('Annual thermal loss must be finite and at most 100%; negative loss denotes gain.');
  }
}
