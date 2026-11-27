import {ReferenceDiodeInputSchema,DiodeConditionParametersSchema,type ReferenceDiodeInput,type DiodeConditionParameters,type DiodeRootTarget,type ReferenceDiodeResult} from '../../contracts/referenceDiode';

/** Explicit reference translation, pvlib0.13.1 calcparams_desoto specialization.
 * Reference basis is per-module STC; outputs are aggregate string at conditions.
 * Internal numerical leaf: public requests must enter evaluateReferenceDiode.
 */
export function translateReferenceDiode(input:ReferenceDiodeInput):DiodeConditionParameters {
  const r=input.reference,c=input.conditions;
  const temperatureK=c.cellTempC+273.15;
  const referenceK=r.referenceCellTempC+273.15;
  const deltaT=c.cellTempC-r.referenceCellTempC;
  const ratio=c.effectiveIrradianceWm2/r.referenceIrradianceWm2;
  const bandgap=r.bandgapEv*(1+r.bandgapTemperatureCoefficientPerK*deltaT);
  const iph=ratio*(r.photocurrentA+r.alphaScAperC*deltaT);
  const i0=r.saturationCurrentA*Math.pow(temperatureK/referenceK,3)*Math.exp(r.bandgapEv/(8.617333262145e-5*referenceK)-bandgap/(8.617333262145e-5*temperatureK));
  const rs=r.seriesResistanceOhm*c.seriesModules;
  const rsh=r.shuntResistanceOhm/ratio*c.seriesModules;
  const a=r.diodeFactorV*(temperatureK/referenceK)*c.seriesModules;
  return {iph,i0,rs,rsh,a};
}

/** Diode-voltage parameterization x=V+I Rs. No exponential clipping: overflow
 * remains nonfinite and is rejected by the bounded solver, never a fake root.
 * @internal p must satisfy DiodeConditionParametersSchema.
 */
export function evaluateDiodeState(p:DiodeConditionParameters,x:number) {
  const current=p.iph-p.i0*Math.expm1(x/p.a)-x/p.rsh;
  const voltage=x-p.rs*current;
  const power=voltage*current;
  const currentDerivative=-p.i0*Math.exp(x/p.a)/p.a-1/p.rsh;
  const powerDerivative=current+(x-2*p.rs*current)*currentDerivative;
  return {current,voltage,power,powerDerivative};
}

/** Monotonic generating-quadrant roots on the ideal-Voc bracket. Returns null
 * on invalid domain, failed bracket, nonfinite arithmetic or exhausted budget.
 * Residual units: A (Voc), V (Isc), A=W/V (MPP derivative).
 */
export function solveBoundedDiodeRoot(p:DiodeConditionParameters,target:DiodeRootTarget,iterationLimit:number):number|null {
  if(!DiodeConditionParametersSchema.safeParse(p).success||!['voc','isc','mpp'].includes(target)||!Number.isInteger(iterationLimit)||iterationLimit<1||iterationLimit>128)return null;
  let lower=0;
  let upper=p.a*Math.log1p(p.iph/p.i0);
  if(!Number.isFinite(upper)||upper<=0)return null;
  const lowState=evaluateDiodeState(p,lower),highState=evaluateDiodeState(p,upper);
  let lowValue=target==='voc'?lowState.current:target==='isc'?lowState.voltage:lowState.powerDerivative;
  const highValue=target==='voc'?highState.current:target==='isc'?highState.voltage:highState.powerDerivative;
  if(!Number.isFinite(lowValue)||!Number.isFinite(highValue))return null;
  const scale=target==='isc'?upper:p.iph;
  const tolerance=1e-10+1e-12*scale;
  if(Math.abs(lowValue)<=tolerance)return lower;
  if(Math.abs(highValue)<=tolerance)return upper;
  if(Math.sign(lowValue)===Math.sign(highValue))return null;
  for(let iteration=0;iteration<iterationLimit;iteration++){
    const middle=lower+(upper-lower)/2;
    const state=evaluateDiodeState(p,middle);
    const value=target==='voc'?state.current:target==='isc'?state.voltage:state.powerDerivative;
    if(!Number.isFinite(value))return null;
    if(Math.abs(value)<=tolerance)return middle;
    if(Math.sign(value)===Math.sign(lowValue)){lower=middle;lowValue=value;}
    else upper=middle;
  }
  return null;
}

/** Public opt-in numerical API. No legacy fit/fallback, persistence mutation or
 * automatic energy/financial adoption. Invalid and unconverged are not zeros.
 */
export function evaluateReferenceDiode(raw:unknown):ReferenceDiodeResult {
  const identity={modelPolicy:'desoto_reference_bounded_v1',financialAdoptionEligible:false} as const;
  const parsed=ReferenceDiodeInputSchema.safeParse(raw);
  if(!parsed.success)return {...identity,status:'unavailable',reason:'invalid_input'};
  const input=parsed.data;
  if(input.conditions.effectiveIrradianceWm2===0)return {...identity,status:'dark',input,voc:0,isc:0,vmp:0,imp:0,pmp:0};
  const parameters=translateReferenceDiode(input);
  if(!DiodeConditionParametersSchema.safeParse(parameters).success)return {...identity,status:'unavailable',reason:'numerical_domain'};
  const vocX=solveBoundedDiodeRoot(parameters,'voc',input.iterationLimit);
  const iscX=solveBoundedDiodeRoot(parameters,'isc',input.iterationLimit);
  const mppX=solveBoundedDiodeRoot(parameters,'mpp',input.iterationLimit);
  if(vocX===null||iscX===null||mppX===null)return {...identity,status:'unavailable',reason:'not_converged'};
  const open=evaluateDiodeState(parameters,vocX),short=evaluateDiodeState(parameters,iscX),mpp=evaluateDiodeState(parameters,mppX);
  if(![open.voltage,short.current,mpp.voltage,mpp.current,mpp.power].every(Number.isFinite)||open.voltage<=0||short.current<=0||mpp.voltage<0||mpp.current<0||mpp.power<0||mpp.voltage>open.voltage||mpp.current>short.current)return {...identity,status:'unavailable',reason:'numerical_domain'};
  return {...identity,status:'available',input,parameters,voc:open.voltage,isc:short.current,vmp:mpp.voltage,imp:mpp.current,pmp:mpp.power,residuals:{openCircuitAmps:open.current,shortCircuitVolts:short.voltage,mppDerivativeAmps:mpp.powerDerivative}};
}
