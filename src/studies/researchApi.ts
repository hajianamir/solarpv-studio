import {z} from 'zod';
import {IntegratedPlanSchema,validateIntegratedResult} from './integratedStudy';
import {studyTimestamp} from './studyTime';
import {stable} from './studyComparisonGate';
import {parseStudyJson} from './strictStudyJson';
import {weatherSha256} from './declaredWeatherAdapter';
const f=(lo:number,hi:number)=>z.number().finite().min(lo).max(hi);
const text=z.string().min(1).max(500).refine(s=>!!s.trim());
const thermalRow=z.object({start:studyTimestamp,durationS:f(.001,600),absorbedCellWm2:f(0,2000),electricalExtractedWm2:f(0,2000),airC:f(-80,80),skyC:f(-100,100),groundC:f(-80,150),windMps:f(0,75),observedEndCellC:f(-100,180).optional(),observedEndBackC:f(-100,180).optional()}).strict();
export const TwoNodePlanSchema=z.object({schemaVersion:z.literal('two-node-thermal-plan-v1'),source:text,
 parameters:z.object({cellCapacityJm2K:f(100,1e6),backCapacityJm2K:f(100,1e6),couplingWm2K:f(0,1000),frontH0:f(.01,300),frontHWind:f(0,50),backH0:f(.01,300),backHWind:f(0,50),frontEmissivity:f(0,1),backEmissivity:f(0,1),windHeightM:f(.1,200),coefficientWindHeightM:f(.1,200)}).strict(),
 domain:z.object({nodeMinC:f(-100,180),nodeMaxC:f(-100,180),airMinC:f(-80,80),airMaxC:f(-80,80),windMaxMps:f(0,75)}).strict(),initial:z.object({cellC:f(-100,180),backC:f(-100,180)}).strict(),intervals:z.array(thermalRow).min(1).max(1000),stepS:f(.001,10),maxSteps:z.number().int().min(1).max(200000),
}).strict().superRefine((p,ctx)=>{
 const fail=(message:string)=>ctx.addIssue({code:'custom',message});const d=p.domain,a=p.parameters;
 if(d.nodeMinC>=d.nodeMaxC||d.airMinC>=d.airMaxC)fail('Invalid thermal domain');
 if(a.windHeightM!==a.coefficientWindHeightM)fail('Wind heights must match');
 const rad=4*5.670374419e-8*(d.nodeMaxC+273.15)**3;
 const limit=Math.min(a.cellCapacityJm2K/(a.couplingWm2K+a.frontH0+a.frontHWind*d.windMaxMps+a.frontEmissivity*rad),a.backCapacityJm2K/(a.couplingWm2K+a.backH0+a.backHWind*d.windMaxMps+a.backEmissivity*rad))/10;
 if(p.stepS>limit)fail('Thermal step stability bound');
 if(Object.values(p.initial).some(t=>t<d.nodeMinC||t>d.nodeMaxC))fail('Initial node outside domain');
 let end:number|undefined,total=0;
 for(const r of p.intervals){const start=Date.parse(r.start);if(end!==undefined&&Math.abs(start-end)>.001)fail('Gap/overlap');end=start+r.durationS*1000;total+=Math.ceil(r.durationS/p.stepS);
  if(r.airC<d.airMinC||r.airC>d.airMaxC||r.windMps>d.windMaxMps||r.electricalExtractedWm2>r.absorbedCellWm2)fail('Forcing outside domain');
  for(const t of [r.observedEndCellC,r.observedEndBackC])if(t!==undefined&&(t<d.nodeMinC||t>d.nodeMaxC))fail('Observation outside domain');
 }if(total>p.maxSteps)fail('Thermal step budget');
});
export const DiodeNetworkPlanSchema=z.object({schemaVersion:z.literal('diode-network-plan-v1'),source:text,substrings:z.array(z.object({id:z.string().min(1).max(40).refine(s=>!!s.trim()),photocurrentA:f(0,30),saturationCurrentA:f(1e-15,.001),seriesOhm:f(0,10),shuntOhm:f(1,1e6),nNsVthV:f(.01,10),bypassDropV:f(0,2)}).strict()).min(1).max(12),strings:z.array(z.array(z.string()).min(1).max(12)).min(1).max(4),voltageToleranceV:f(1e-8,.001),currentToleranceA:f(1e-10,1e-5),maxEvaluations:z.number().int().min(500).max(200000)}).strict().superRefine((p,ctx)=>{
 const names=p.substrings.map(s=>s.id),ids=p.strings.flat();
 if(new Set(names).size!==names.length||ids.length!==names.length||new Set(ids).size!==ids.length||ids.some(s=>!names.includes(s)))ctx.addIssue({code:'custom',message:'Every substring exactly once in wiring'});
});
export const ResearchRequestSchema=z.discriminatedUnion('operation',[
 z.object({operation:z.literal('integrated'),plan:IntegratedPlanSchema}).strict(),
 z.object({operation:z.literal('thermal_two_node'),plan:TwoNodePlanSchema}).strict(),
 z.object({operation:z.literal('diode_network'),plan:DiodeNetworkPlanSchema}).strict(),
]);
export type ResearchRequest=z.infer<typeof ResearchRequestSchema>;
const numeric=z.number().finite();const hash=z.string().regex(/^[a-f0-9]{64}$/);
const generic=z.object({schemaVersion:z.string(),algorithmVersion:z.literal('1.0.0'),plan:z.unknown(),planSha256:hash,validationStatus:z.literal('not_field_validated'),projectApproval:z.literal('blocked')}).passthrough();
export function validateResearchResponse(value:unknown,request:ResearchRequest){
 const envelope=z.object({schemaVersion:z.literal('research-api-result-v1'),operation:z.enum(['integrated','thermal_two_node','diode_network']),requestCanonicalJson:z.string(),requestSha256:hash,result:z.unknown(),runtime:z.object({python:z.string(),pvlib:z.literal('0.13.1'),numpy:z.string(),scipy:z.string(),codeSha256:hash}).strict()}).strict().parse(value);
 if(envelope.operation!==request.operation||weatherSha256(envelope.requestCanonicalJson)!==envelope.requestSha256||stable(parseStudyJson(envelope.requestCanonicalJson,8*1024*1024))!==stable(request))throw new Error('Research response input binding mismatch');
 if(request.operation==='integrated'){const r=validateIntegratedResult(envelope.result);if(stable(r.plan)!==stable(request.plan))throw new Error('Integrated response plan mismatch');}
 else{
  const r=generic.parse(envelope.result);if(stable(r.plan)!==stable(request.plan))throw new Error('Research plan mismatch');
  if(request.operation==='thermal_two_node'){
   if(r.schemaVersion!=='two-node-thermal-result-v1')throw new Error('Wrong thermal result');
   const rows=z.array(z.object({startUTC:studyTimestamp,durationS:numeric,cellC:numeric,backC:numeric,cellResidualJm2:numeric,backResidualJm2:numeric,totalResidualJm2:numeric,absorbedJm2:numeric,extractedJm2:numeric,couplingJm2:numeric,convectionFrontJm2:numeric,convectionBackJm2:numeric,radiationFrontJm2:numeric,radiationBackJm2:numeric}).strict()).parse(r.trace);
   if(rows.length!==request.plan.intervals.length||rows.some(x=>Math.abs(x.totalResidualJm2)>1e-3||Math.abs(x.cellResidualJm2)>1e-3||Math.abs(x.backResidualJm2)>1e-3))throw new Error('Thermal residual/length gate');
     let cell=request.plan.initial.cellC,back=request.plan.initial.backC;
   rows.forEach((x,i)=>{const a=request.plan.parameters,d=request.plan.domain,input=request.plan.intervals[i];
    const rc=a.cellCapacityJm2K*(x.cellC-cell)-x.absorbedJm2+x.extractedJm2+x.couplingJm2+x.convectionFrontJm2+x.radiationFrontJm2;
    const rb=a.backCapacityJm2K*(x.backC-back)-x.couplingJm2+x.convectionBackJm2+x.radiationBackJm2;
    if([x.cellC,x.backC].some(t=>t<d.nodeMinC||t>d.nodeMaxC)||Math.abs(rc)>1e-3||Math.abs(rb)>1e-3||Math.abs(rc-x.cellResidualJm2)>1e-5||Math.abs(rb-x.backResidualJm2)>1e-5||Date.parse(x.startUTC)!==Date.parse(input.start)||x.durationS!==input.durationS||Math.abs(x.absorbedJm2-input.absorbedCellWm2*input.durationS)>1e-5||Math.abs(x.extractedJm2-input.electricalExtractedWm2*input.durationS)>1e-5)throw new Error('Independent thermal balance/domain check');
    cell=x.cellC;back=x.backC;
   });
  }else{
   if(r.schemaVersion!=='diode-network-result-v1')throw new Error('Wrong circuit result');
   const circuit=z.object({mppW:numeric.nonnegative(),mppV:numeric.nonnegative(),mppA:numeric.nonnegative(),powerResidualW:numeric}).passthrough().parse(r);
   if(Math.abs(circuit.mppW-circuit.mppV*circuit.mppA)>Math.max(1e-5,circuit.mppW*1e-7)||Math.abs(circuit.powerResidualW)>1e-4)throw new Error('Circuit power balance gate');
   const points=z.array(z.object({id:z.string(),currentA:numeric.nonnegative(),voltageV:numeric,powerW:numeric,bypassActive:z.boolean(),bypassDissipationW:numeric.nonnegative()}).strict()).parse(r.substrings);
   if(points.length!==request.plan.substrings.length||new Set(points.map(p=>p.id)).size!==points.length)throw new Error('Circuit node count');
   for(const point of points){const p=request.plan.substrings.find(p=>p.id===point.id);if(!p)throw new Error('Unknown node');
    if(Math.abs(point.powerW-point.currentA*point.voltageV)>1e-5||point.voltageV < -p.bypassDropV-1e-6)throw new Error('Node balance');
    if(!point.bypassActive){const vd=point.voltageV+point.currentA*p.seriesOhm;const current=p.photocurrentA-p.saturationCurrentA*Math.expm1(vd/p.nNsVthV)-vd/p.shuntOhm;if(!Number.isFinite(current)||Math.abs(point.currentA-current)>1e-4)throw new Error('Independent implicit diode equation');}
   }
   if(Math.abs(points.reduce((s,p)=>s+p.powerW,0)-circuit.mppW)>Math.max(1e-5,circuit.mppW*1e-7))throw new Error('Circuit node sum');
  }
 }
 return envelope;
}
