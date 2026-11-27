import type {UnifiedWindPressureInput} from '../engine/core/structuralContract';
/** Input validity does not establish applicability of the legacy exposure table. */
export function validateWindScreenHeight(exposure: string, height: number | undefined): void {
 if(!['B','C','D'].includes(exposure))throw new RangeError('Unknown wind exposure category');
 if(height!==undefined&&(!Number.isFinite(height)||height<0))throw new RangeError('Wind height must be finite nonnegative metres');
}
export function validateWindScreenInput(input: UnifiedWindPressureInput): void {
 validateWindScreenHeight(input.exposureCategory??'C',input.structureHeightM);
 if(input.topographicFactorKzt!==undefined&&(!Number.isFinite(input.topographicFactorKzt)||input.topographicFactorKzt<=0))throw new RangeError('Kzt must be finite and positive');
 if(input.windDirectionalityKd!==undefined&&(!Number.isFinite(input.windDirectionalityKd)||input.windDirectionalityKd<=0||input.windDirectionalityKd>1))throw new RangeError('Kd must be finite, positive and at most one');
}
