import {IranianBenefitIndicatorsInputSchema,type IranianBenefitIndicatorsInput} from '../../contracts/iranianBenefitIndicators';
import {assertFiniteIranianResult} from '../../contracts/iranianEconomicPolicy';

/**
 * Explicit screening proxies, not additional cash-flow revenue or realized savings.
 * MWh * 1000 kWh/MWh * Toman/kWh / 1e6 Toman/million = MWh * rate / 1000.
 * kWp * (million Toman/kWp) = million Toman. Never round before presentation.
 */
export function evaluateIranianBenefitIndicators(input:IranianBenefitIndicatorsInput) {
  const normalized=IranianBenefitIndicatorsInputSchema.parse(input);
  const article16PenaltyAvoidanceProxyMillionToman=normalized.annualGenerationMwh * (normalized.penaltyRateTomanPerKwh / 1000);
  const outageLossProxyMillionToman=normalized.capacityKwp * normalized.outageLossMillionTomanPerKwp;
  const result={modelPolicy:normalized.modelPolicy,input:normalized,
    article16PenaltyAvoidanceProxyMillionToman,outageLossProxyMillionToman,
    unit:'MILLION_TOMAN' as const,
    assumptionBasis:'illustrative_rates_not_verified_statutory_or_realized_savings' as const,
    financialAdoptionEligible:false as const};
  assertFiniteIranianResult(result);
  return result;
}
