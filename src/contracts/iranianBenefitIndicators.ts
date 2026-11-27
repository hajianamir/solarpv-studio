import {z} from 'zod';
/** Rates are explicit screening assumptions, not verified statutory/avoided-loss evidence. */
export const IranianBenefitIndicatorsInputSchema=z.object({
  modelPolicy:z.literal('iranian_benefit_indicators_full_precision_v1'),
  capacityKwp:z.number().finite().nonnegative(),
  annualGenerationMwh:z.number().finite().nonnegative(),
  penaltyRateTomanPerKwh:z.number().finite().nonnegative(),
  outageLossMillionTomanPerKwp:z.number().finite().nonnegative(),
}).strict();
export type IranianBenefitIndicatorsInput=z.infer<typeof IranianBenefitIndicatorsInputSchema>;
