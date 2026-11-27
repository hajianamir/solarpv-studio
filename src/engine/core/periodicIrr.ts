import {PeriodicIrrInputSchema,type PeriodicIrrUnavailableReason,type PeriodicIrrInput} from '../../contracts/periodicIrr';

/** Periodic NPV polynomial in discount factor; pure and normalized by caller.
 * Separate export supports direct independent polynomial/reference execution.
 */
export function evaluatePeriodicNpv(cashFlows:number[],rate:number):number {
  const x=1/(1+rate);
  let sum=0;
  for(const value of cashFlows.slice().reverse())sum=sum*x+value;
  return sum;
}

/** One sign change only: no first-guess selection or claim to enumerate all IRRs.
 * Domain [-90%,1000%] is explicit numerical policy, not a universal IRR bound.
 */
export function assessPeriodicIrr(input:PeriodicIrrInput) {
  const parsed=PeriodicIrrInputSchema.safeParse(input);
  const unavailable=(reason:PeriodicIrrUnavailableReason)=>({status:'unavailable' as const,rate:null,irrPct:null,reason,financialAdoptionEligible:false as const});
  if(!parsed.success)return unavailable('invalid_input');
  const normalized=parsed.data;
  const nonzero=normalized.cashFlows.filter(v=>v!==0);
  if(!nonzero.some(v=>v<0)||!nonzero.some(v=>v>0))return unavailable('no_sign_change');
  // Conventional investment permits initial negative periods followed by receipts,
  // but refuses later reinvestment/reversal (which can create multiple roots).
  let positiveSeen=false;
  for(const value of nonzero) {
    if(value>0)positiveSeen=true;
    else if(positiveSeen)return unavailable('unsupported_cash_flow_pattern');
  }
  if(normalized.cashFlows[0]>=0)return unavailable('unsupported_cash_flow_pattern');
  const scale=Math.max(...normalized.cashFlows.map(v=>Math.abs(v)));
  const flows=normalized.cashFlows.map(v=>v/scale);
  // If normalization erases an actual nonzero input, do not silently change its polynomial.
  if(flows.some((v,i)=>v===0&&normalized.cashFlows[i]!==0))return unavailable('numerical_failure');
  let low=-0.9;let high=10;
  const lowValue=evaluatePeriodicNpv(flows,low);
  const highValue=evaluatePeriodicNpv(flows,high);
  if(!Number.isFinite(lowValue)||!Number.isFinite(highValue))return unavailable('numerical_failure');
  if(lowValue<0||highValue>0)return unavailable('outside_policy_domain');
  let rate=lowValue===0?low:high;
  if(lowValue!==0&&highValue!==0) {
    for(const _iteration of new Array(96).keys()) {
      void _iteration;
      rate=low+(high-low)/2;
      const value=evaluatePeriodicNpv(flows,rate);
      if(value>0)low=rate;else high=rate;
    }
  }
  const normalizedNpvResidual=evaluatePeriodicNpv(flows,rate);
  if(!Number.isFinite(normalizedNpvResidual)||Math.abs(normalizedNpvResidual)>1e-10)return unavailable('numerical_failure');
  return {status:'available' as const,rate,irrPct:rate*100,normalizedNpvResidual,
    input:normalized,modelPolicy:normalized.modelPolicy,rateDomain:[-0.9,10],
    financialAdoptionEligible:false as const};
}
