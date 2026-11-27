import {requireMpptCurrentComparison} from '../../contracts/mpptCurrentComparison';

/** Compare the unrounded current. Display rounding must never grant capacity.
 * Applies to a physical channel allocation, not an average across a fleet.
 */
export function exceedsMpptOperatingLimit(strings:number,moduleImpAmps:number,ratingAmps:number):boolean {
  requireMpptCurrentComparison(strings,moduleImpAmps,ratingAmps);
  return strings*moduleImpAmps>ratingAmps;
}

/** Retained legacy 1.25×Isc screen only, NOT a generic manufacturer conversion.
 * Evidence for applicability stays independently required by electricalReadiness.
 * No conductor/OCPD or operating-current multiplier is inferred from this rule.
 */
export function exceedsLegacyMpptShortCircuitLimit(strings:number,moduleIscAmps:number,ratingAmps:number):boolean {
  requireMpptCurrentComparison(strings,moduleIscAmps,ratingAmps);
  return strings*moduleIscAmps*1.25>ratingAmps;
}
