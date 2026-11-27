import {z} from 'zod';

/** Constant-OPEX, pre-tax, unlevered screening specialization. Rates are fractions
 * except degradationPct (% per year). One currency unit for all cost inputs;
 * energyAnnual is first-year kWh under the declared energy basis. Horizon is bounded for resource use.
 */
export const SimpleLcoeInputSchema=z.object({
  capex:z.number().finite().nonnegative(),
  opexAnnual:z.number().finite().nonnegative(),
  energyAnnual:z.number().finite().positive(),
  discountRate:z.number().finite().gt(-1),
  lifetimeYears:z.number().int().min(1).max(100),
  degradationPct:z.number().finite().min(0).max(100),
  energyBasis:z.enum(['delivered','generation_proxy','unspecified']),
  currency:z.enum(['USD','TOMAN','unspecified']),
  rateBasis:z.enum(['real','nominal','unspecified']),
}).strict();
export type SimpleLcoeInput=z.infer<typeof SimpleLcoeInputSchema>;
export type SimpleLcoeAssessment=
 | {status:'available';lcoeValue:number;discountedCosts:number;discountedEnergyKwh:number;currency:SimpleLcoeInput['currency'];rateBasis:SimpleLcoeInput['rateBasis'];modelPolicy:'simple_discounted_lcoe_v1';financialAdoptionEligible:false;inputs:SimpleLcoeInput;limitations:string[]}
 | {status:'unavailable';lcoeValue:null;reason:'invalid_input'|'numerical_failure';issues:string[]};

export function classifyLcoeTotals(input:SimpleLcoeInput,totals:{discountedCosts:number;discountedEnergyKwh:number;lcoeValue:number}):SimpleLcoeAssessment {
  if(!Number.isFinite(totals.discountedCosts)||totals.discountedCosts<0||!Number.isFinite(totals.discountedEnergyKwh)||totals.discountedEnergyKwh<=0||!Number.isFinite(totals.lcoeValue)||totals.lcoeValue<0||((input.capex>0||input.opexAnnual>0)&&totals.lcoeValue===0)) {
    return {status:'unavailable',lcoeValue:null,reason:'numerical_failure',issues:['Discounted costs, energy or ratio overflowed/underflowed or are not finite and valid.']};
  }
  const limitations=['Pre-tax unlevered screen: constant annual OPEX, first-year energy under the declared basis with geometric degradation; no taxes, debt, escalation, replacement or salvage schedules.','Numerical arithmetic verification is not validation of project assumptions or financial eligibility.'];
  if(input.energyBasis!=='delivered')limitations.push('Energy delivery boundary is not established; generation-proxy or unspecified energy is not an assessed delivered-cost basis.');
  if(input.currency==='unspecified')limitations.push('Currency unit unspecified; do not compare to a currency-denominated tariff.');
  if(input.rateBasis==='unspecified')limitations.push('Real/nominal valuation basis unspecified; do not compare mixed-basis alternatives.');
  return {status:'available',...totals,currency:input.currency,rateBasis:input.rateBasis,modelPolicy:'simple_discounted_lcoe_v1',financialAdoptionEligible:false,inputs:input,limitations};
}
