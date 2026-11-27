import {requireSignedThermalLoss} from '../../contracts/signedThermalLoss';

/** Convert the signed thermal loss definition to a signed waterfall stage.
 * PVWatts DC: P/P_ref = 1 + gamma*(T_cell - 25); loss = 100*(1-P/P_ref).
 * Thus a cold-weather negative loss must yield a positive stage percentage.
 * This does not validate the temperature/irradiance inputs or mounting offsets.
 */
export function thermalStagePercentage(signedLossPct: number): number {
  requireSignedThermalLoss(signedLossPct);
  return -signedLossPct;
}

/** Inverse metadata convention: stage gain is positive, signed loss is negative.
 * Does not establish the provenance/applicability of the supplied annual temperature.
 */
export function signedThermalLossFromStage(stagePct?: number): number {
  const stage = stagePct ?? 0;
  if (!Number.isFinite(stage)) throw new RangeError('Thermal stage percentage must be finite.');
  return -stage;
}
