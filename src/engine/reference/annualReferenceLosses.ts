import { calculateKimberSeries } from './kimberSeries';
import { calculateSnowSeries } from './snowSeries';
import { checkAnnualReferenceInput, type AnnualReferenceInput, type ReferenceContext } from '../../referenceModels/annualReferenceInput';
export type { AnnualReferenceInput } from '../../referenceModels/annualReferenceInput';

/** Annual UTC interval-end contract. No climatology expansion, weather inference or calibration. */
export function evaluateAnnualReferenceLosses(input: AnnualReferenceInput, site?: {latitude: number; longitude: number}, context?: ReferenceContext) {
  const unavailable = (reason: string) => ({status:'missing_or_unsupported' as const, reason, soilingLossPct:null, snowLossPct:null, combinedLossPct:null, metadata:null});
  const checked=checkAnnualReferenceInput(input,site,context);
  if(!checked.ok)return unavailable(checked.reason);
  const {energy,dt}=checked;
  const soil=input.soiling?calculateKimberSeries({...input.soiling,steps:input.soiling.steps.map((s,i)=>({...s,unsoiledEnergyWh:energy[i].cleanDcEnergyWh}))}):null;
  const snow=input.snow?calculateSnowSeries(input.snow):null;
  // Atomic application: a requested but invalid model cannot silently fall back while the other applies.
  if (soil && soil.status!=='computed') return unavailable(`Soiling: ${soil.reason}`);
  if (snow && snow.status!=='computed') return unavailable(`Snow: ${snow.reason}`);
  let clean=0, afterSoil=0, snowLost=0;
  for(const [i,e] of energy.entries()) {
    const weight=e.cleanDcEnergyWh!;
    const soilLoss=soil?.samples?.[i].lossFraction??0;
    const snowLoss=snow?.samples?.[i].dcCapacityLossFraction??0;
    clean+=weight;
    const remaining=weight*(1-soilLoss);
    afterSoil+=remaining;
    snowLost+=remaining*snowLoss;
  }
  if (clean<=0 || (snow && afterSoil<=0)) return unavailable('No positive energy denominator for requested annual loss');
  return {status:'computed' as const,reason:null,
    soilingLossPct:soil?soil.energyWeightedLossFraction!*100:null,
    snowLossPct:snow?snowLost/afterSoil*100:null,
    combinedLossPct:(clean-afterSoil+snowLost)/clean*100,
    metadata:{cleanEnergyWh:clean,afterSoilingEnergyWh:afterSoil,snowLostEnergyWh:snowLost,year:input.year,site:input.site,energyQuality:input.energyQuality,energySource:input.energySource,
      periodStartUtc:new Date(Date.UTC(input.year,0,1)).toISOString(),periodEndUtc:new Date(Date.UTC(input.year+1,0,1)).toISOString(),
      intervalCount:energy.length,intervalHours:dt/3600000,coverage:'complete_utc_calendar_year',
      aggregation:'Soiling weighted by clean DC energy; snow weighted by post-soiling DC energy. Each replaces one waterfall loss stage. Other hourly loss interactions are not resolved.',
      validationStatus:'not_field_validated',
      soiling:soil?{modelId:soil.modelId,modelVersion:soil.modelVersion,quality:soil.quality,parameterQuality:soil.parameterQuality,timezone:soil.timezone,manualWashTimestamps:input.soiling!.manualWashTimestamps,parameters:soil.appliedParameters,units:soil.units,limitations:soil.limitations}:null,
      snow:snow?{modelId:snow.modelId,modelVersion:snow.modelVersion,quality:snow.quality,parameterQuality:snow.parameterQuality,timezone:snow.timezone,parameters:snow.appliedParameters,units:snow.units,limitations:snow.limitations}:null}};
}
export type AnnualReferenceEvaluation = ReturnType<typeof evaluateAnnualReferenceLosses>;

/** Multiplicative environmental retained-energy equivalent for sizing only. */
export function combineEnvironmentalLossPct(soilingPct:number,snowPct:number) {
  return (1-(1-soilingPct/100)*(1-snowPct/100))*100;
}
