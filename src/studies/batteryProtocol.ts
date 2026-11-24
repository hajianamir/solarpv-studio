import {z} from 'zod';
import {stable} from './studyComparisonGate';
import manifest from '../../docs/reference-data/manifest.json';
const f=(a:number,b:number)=>z.number().finite().min(a).max(b),n=z.number().finite(),hash=z.string().regex(/^[a-f0-9]{64}$/);
export const batteryProtocolOperations=['battery_protocol'] as const;
const plan=z.object({schemaVersion:z.literal('battery-protocol-v1'),source:z.string().trim().min(10).max(1000),contextSha256:hash,model:z.enum(['SPM','SPMe','DFN']),parameterSet:z.enum(['Chen2020','OKane2022']),sei:z.boolean(),initialSoc:f(.1,.9),temperatureK:f(283.15,313.15),samplesPerStep:f(3,21).int(),meshPoints:f(4,12).int(),relativeTolerance:f(1e-8,1e-4),maxTimeStepS:f(1,60),voltageToleranceV:f(1e-6,.1),temperatureToleranceK:f(1e-5,2),capacityToleranceAh:f(1e-8,.01),steps:z.array(z.object({currentA:f(-10,10),durationS:f(1,600)}).strict()).min(1).max(12)}).strict().superRefine((p,c)=>{if(p.steps.reduce((s,x)=>s+x.durationS,0)>1800||p.sei&&p.parameterSet!=='OKane2022')c.addIssue({code:'custom',message:'Protocol horizon or SEI parameter contract'});});
export const BatteryProtocolRequestSchema=z.discriminatedUnion('operation',[z.object({operation:z.literal('battery_protocol'),plan}).strict()]);
export type BatteryProtocolRequest=z.infer<typeof BatteryProtocolRequestSchema>;
const near=(a:number,b:number,t=1e-8)=>{if(Math.abs(a-b)>t*Math.max(1,Math.abs(b)))throw new Error('Battery protocol independent ledger/binding witness');};
const row=z.object({timeS:n,stepTimeS:n,voltageV:n,temperatureK:n,capacityAh:n,totalHeatingWm3:n,irreversibleHeatingWm3:n,reversibleHeatingWm3:n,ohmicHeatingWm3:n,seiLossAh:n,currentA:n}).strict(),delta=z.object({voltageV:n.nonnegative(),temperatureK:n.nonnegative(),capacityAh:n.nonnegative()}).strict();
export function validateBatteryProtocolResult(value:unknown,request:BatteryProtocolRequest){
 const r=z.object({schemaVersion:z.literal('portfolio-result-v1'),algorithmVersion:z.literal('1.0.0'),plan:z.unknown(),planSha256:hash,operation:z.literal('battery_protocol'),status:z.literal('insufficient_evidence'),validationStatus:z.literal('not_field_validated'),projectApproval:z.literal('blocked'),safetyApproval:z.literal('not_assessed'),limitations:z.array(z.string()).min(1),output:z.unknown()}).strict().parse(value);if(stable(r.plan)!==stable(request.plan))throw new Error('Protocol input binding');
 const p=request.plan,o=z.object({runtime:z.object({pybamm:z.literal('25.10.2'),casadi:z.literal('3.6.7'),parameterSourceSha256:hash}).strict(),referenceHashes:z.record(z.string(),hash),runs:z.array(z.object({meshPoints:n.int(),relativeTolerance:n,maxTimeStepS:n,segments:z.array(z.object({stepIndex:n.int(),trace:z.array(row).length(p.samplesPerStep)}).strict()).length(p.steps.length)}).strict()).length(4),meshDelta:delta,solverDelta:delta,timeDelta:delta,capacityLedgerErrorAh:n.nonnegative().max(1e-6),heatingLedgerErrorWm3:n.nonnegative().max(1e-5),netDischargeAh:n,numericalGate:z.enum(['passed','failed_convergence']),scope:z.string().min(40)}).strict().parse(r.output);
 let capacityError=0,heatError=0;
 o.runs.forEach((run,j)=>{
  near(run.meshPoints,p.meshPoints*(j?2:1));near(run.relativeTolerance,p.relativeTolerance/(j>=2?10:1),1e-14);near(run.maxTimeStepS,p.maxTimeStepS/(j===3?2:1));let elapsed=0,net=0;
  run.segments.forEach((segment,i)=>{const step=p.steps[i];near(segment.stepIndex,i);segment.trace.forEach((x,k)=>{
   const t=step.durationS*k/(p.samplesPerStep-1);near(x.stepTimeS,t);near(x.timeS,elapsed+t);near(x.currentA,step.currentA,1e-9);
   capacityError=Math.max(capacityError,Math.abs(x.capacityAh-net-step.currentA*t/3600));heatError=Math.max(heatError,Math.abs(x.totalHeatingWm3-x.irreversibleHeatingWm3-x.reversibleHeatingWm3-x.ohmicHeatingWm3));
   if(capacityError>1e-6||heatError>1e-5)throw new Error('Protocol physical ledger');
   if(!p.sei)near(x.seiLossAh,0);
   if(k===0&&i){const previous=run.segments[i-1].trace.at(-1)!;near(x.capacityAh,previous.capacityAh,1e-8);near(x.temperatureK,previous.temperatureK,1e-8);}
  });elapsed+=step.durationS;net+=step.currentA*step.durationS/3600;});near(o.netDischargeAh,net);
 });
 near(o.capacityLedgerErrorAh,capacityError,1e-12);near(o.heatingLedgerErrorWm3,heatError,1e-9);
 const pairs=[[0,1,o.meshDelta],[1,2,o.solverDelta],[2,3,o.timeDelta]] as const,limits={voltageV:p.voltageToleranceV,temperatureK:p.temperatureToleranceK,capacityAh:p.capacityToleranceAh};let passed=true;
 for(const [a,b,d] of pairs)for(const k of ['voltageV','temperatureK','capacityAh'] as const){let actual=0;o.runs[a].segments.forEach((s,i)=>s.trace.forEach((x,j)=>{actual=Math.max(actual,Math.abs(x[k]-o.runs[b].segments[i].trace[j][k]));}));near(d[k],actual,1e-12);if(actual>limits[k])passed=false;}
 if(o.numericalGate!==(passed?'passed':'failed_convergence'))throw new Error('Protocol refinement gate');
 const hashes=Object.fromEntries([p.parameterSet+'.txt','simulation-tests.txt','LICENSE.txt'].map(name=>{const path='docs/reference-data/pybamm/'+name,entry=manifest.files.find(x=>x.path===path);if(!entry)throw new Error('Unregistered battery source');return [path,entry.sha256];}));if(stable(hashes)!==stable(o.referenceHashes)||o.runtime.parameterSourceSha256!==hashes['docs/reference-data/pybamm/'+p.parameterSet+'.txt'])throw new Error('Protocol pinned provenance');return r;
}
