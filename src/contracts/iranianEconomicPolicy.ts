import {z} from 'zod';

// Percent/year, not fractions. Upper bound is a numerical screening envelope,
// not an economic law; no required relationship to loan interest is imposed.
const rate=z.number().finite().gt(-100).max(1000);
export const IranianEconomicPolicySchema=z.object({
  modelPolicy:z.literal('iranian_screen_economics_v1'),
  currency:z.literal('TOMAN'),
  rateBasis:z.literal('nominal'),
  discountRatePct:rate,
  tariffEscalationPct:rate,
  opexEscalationPct:rate,
}).strict();
export type IranianEconomicPolicy=z.infer<typeof IranianEconomicPolicySchema>;
export const DEFAULT_IRANIAN_ECONOMIC_POLICY:Readonly<IranianEconomicPolicy>=Object.freeze({modelPolicy:'iranian_screen_economics_v1',currency:'TOMAN',rateBasis:'nominal',discountRatePct:20,tariffEscalationPct:12,opexEscalationPct:15});
export const IranianScreenSettingsSchema=z.object({
  framework:z.enum(['article_16','green_exchange','satba_fit_ppa','self_generation']),
  customTariffToman:z.number().finite().nonnegative(),
  loanSharePct:z.number().finite().min(0).max(100),
  loanInterestPct:z.number().finite().nonnegative(),
  loanTermYears:z.number().int().min(1).max(25),
  economicPolicy:IranianEconomicPolicySchema,
}).strict();
export type IranianScreenSettings=z.infer<typeof IranianScreenSettingsSchema>;
export function createDefaultIranianScreenSettings():IranianScreenSettings {
  return {framework:'article_16',customTariffToman:4500,loanSharePct:70,loanInterestPct:23,loanTermYears:5,economicPolicy:{...DEFAULT_IRANIAN_ECONOMIC_POLICY}};
}
export const IranianScreenBaseSchema=z.object({
  capacityKwp:z.number().finite().nonnegative(),
  annualGenerationMwh:z.number().finite().nonnegative(),
  framework:IranianScreenSettingsSchema.shape.framework,
  customTariffTomanPerKwh:z.number().finite().nonnegative(),
}).strict();
/** A nonfinite ledger is unavailable, never a displayed financial success. */
export function assertFiniteIranianResult(value:unknown):void {
  if(typeof value==='number'&&!Number.isFinite(value))throw new RangeError('Iranian financial screen produced nonfinite arithmetic');
  if(value&&typeof value==='object')for(const child of Object.values(value))assertFiniteIranianResult(child);
}
