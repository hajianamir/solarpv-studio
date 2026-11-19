import type { ModelInputQuality } from './kimberInput';
export interface SnowRequest {
  timezone: string;
  weatherQuality: ModelInputQuality;
  parameterQuality: ModelInputQuality;
  /** Only the pinned roof/reference configuration is supported initially. */
  mounting: 'roof';
  parameters: {
    tiltDeg: number;
    rowSlantHeightM: number;
    parallelStringsAlongSlant: number;
    initialCoverageFraction: number;
    snowfallThresholdCmPerHour: number;
    groundDepthThresholdCm: number;
    canSlideCoefficientWm2PerC: number;
    slideAmountCoefficientPerHour: number;
  };
  steps: { timestamp: string; snowfallCm: number | null; groundSnowDepthCm: number | null; poaWm2: number | null; ambientTempC: number | null }[];
}
export function checkSnowInput(input: SnowRequest): {ok:false;reason:string} | {ok:true;stepHours:number} {
  if (!input || !Array.isArray(input.steps) || input.steps.length < 3) return {ok:false,reason:'At least three regular timestamped samples are required'};
  try {if(!input.timezone) throw new Error();new Intl.DateTimeFormat('en',{timeZone:input.timezone}).format();}
  catch {return {ok:false,reason:'Explicit valid IANA timezone required'};}
  const quality=['measured','weather_provider','user_configured','assumed'];
  if(!quality.includes(input.weatherQuality)||!quality.includes(input.parameterQuality))return {ok:false,reason:'Explicit input provenance required'};
  const p=input.parameters;
  if(!p||!['tiltDeg','rowSlantHeightM','parallelStringsAlongSlant','initialCoverageFraction','snowfallThresholdCmPerHour','groundDepthThresholdCm','canSlideCoefficientWm2PerC','slideAmountCoefficientPerHour'].every(k=>Number.isFinite(p[k as keyof typeof p])) ||
    p.tiltDeg<0||p.tiltDeg>90||p.rowSlantHeightM<=0||!Number.isInteger(p.parallelStringsAlongSlant)||p.parallelStringsAlongSlant<=0||
    p.initialCoverageFraction<0||p.initialCoverageFraction>1||p.snowfallThresholdCmPerHour<0||p.groundDepthThresholdCm<=0) return {ok:false,reason:'Explicit finite physical geometry/parameters required'};
  if(input.mounting!=='roof'||p.canSlideCoefficientWm2PerC!==-80||p.slideAmountCoefficientPerHour!==0.197)return {ok:false,reason:'Only pinned pvlib roof/reference coefficients (-80, 0.197 fraction/hour) are supported; no ground-mount extrapolation'};
  const times:number[]=[];
  for(const s of input.steps){
    if(!s||typeof s.timestamp!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(Z|[+-]\d{2}:\d{2})$/.test(s.timestamp)||!Number.isFinite(Date.parse(s.timestamp)))return {ok:false,reason:'Invalid timestamp or missing UTC offset'};
    const year=Number(s.timestamp.slice(0,4)),month=Number(s.timestamp.slice(5,7)),day=Number(s.timestamp.slice(8,10));
    if(month<1||month>12||day<1||day>new Date(Date.UTC(year,month,0)).getUTCDate()||Number(s.timestamp.slice(11,13))>23)return {ok:false,reason:'Invalid calendar timestamp'};
    if(![s.snowfallCm,s.groundSnowDepthCm,s.poaWm2,s.ambientTempC].every(v=>typeof v==='number'&&Number.isFinite(v))||s.snowfallCm!<0||s.groundSnowDepthCm!<0||s.poaWm2!<0)return {ok:false,reason:'Missing/invalid snow, depth, POA or temperature; no zero substitution'};
    times.push(Date.parse(s.timestamp));
  }
  const dt=times[1]-times[0];
  if(dt<=0||dt>3600000||!times.slice(1).every((t,i)=>t-times[i]===dt))return {ok:false,reason:'Require regular hourly or sub-hourly samples; gaps and unordered times unsupported'};
  return {ok:true,stepHours:dt/3600000};
}
