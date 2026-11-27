import {SimpleLcoeInputSchema,classifyLcoeTotals,type SimpleLcoeInput,type SimpleLcoeAssessment} from '../../contracts/simpleLcoe';
export type {SimpleLcoeInput,SimpleLcoeAssessment};

/** Sum end-of-year discounted costs/energy; CAPEX is year zero. See ADR-018.
 * Inputs use a single declared currency unit, kWh, and fractional discount rate.
 * This is a simple pre-tax specialization, NOT the complete SAM cashflow model.
 */
export function calculateDiscountedLcoe(input:SimpleLcoeInput):{discountedCosts:number;discountedEnergyKwh:number;lcoeValue:number} {
  SimpleLcoeInputSchema.parse(input);
  let discountedCosts=input.capex;
  let discountedEnergyKwh=0;
  // Fixed-size iterator keeps execution bounded, including operator-mutation probes.
  for(const index of new Array(input.lifetimeYears).keys()) {
    const year=index+1;
    const discountDivisor=Math.pow(1+input.discountRate,year);
    discountedCosts+=input.opexAnnual/discountDivisor;
    discountedEnergyKwh+=(input.energyAnnual*Math.pow(1-input.degradationPct/100,year-1))/discountDivisor;
  }
  return {discountedCosts,discountedEnergyKwh,lcoeValue:discountedCosts/discountedEnergyKwh};
}

/** Strict active boundary: unavailable/null is distinct from a true zero cost. */
export function assessSimpleLcoe(input:unknown):SimpleLcoeAssessment {
  const parsed=SimpleLcoeInputSchema.safeParse(input);
  if(!parsed.success)return {status:'unavailable',lcoeValue:null,reason:'invalid_input',issues:parsed.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`)};
  return classifyLcoeTotals(parsed.data,calculateDiscountedLcoe(parsed.data));
}
