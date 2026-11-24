import {z} from 'zod';
import {studyTimestamp} from './studyTime';
import {stable} from './studyComparisonGate';
const n=z.number().finite(),pos=n.positive(),nn=n.nonnegative(),text=z.string().trim().min(10).max(1000),hash=z.string().regex(/^[a-f0-9]{64}$/);
export const portfolioOperations=['project_uq','hybrid_sizing','batch_twin'] as const;
const uq=z.object({schemaVersion:z.literal('project-uq-v1'),source:text,baselineKwh:pos.max(1e12),referenceCapacityKwp:pos.max(1e9),epistemicCv:n.min(0).max(.5),aleatoryCv:n.min(0).max(.5),outer:z.number().int().min(100).max(1000),inner:z.number().int().min(100).max(1000),seed:z.number().int().min(0).max(4294967295),relativeCiTolerance:n.min(.001).max(.2),referenceId:z.enum(['bolzano-iea2020','alice-springs-iea2020','golden-nrel2023']),inputBasis:z.enum(['literature_benchmark','caller_assumed']),gsaSamples:z.number().int().min(1024).max(32768),correlatedGaussianLinear:z.object({coefficients:z.array(n.min(-100).max(100)).min(2).max(6),correlation:z.array(z.array(n.min(-1).max(1)).min(2).max(6)).min(2).max(6)}).strict()}).strict().superRefine((p,c)=>{const a=p.correlatedGaussianLinear.correlation,d=p.correlatedGaussianLinear.coefficients.length;if(a.length!==d||a.some((r,i)=>r.length!==d||r[i]!==1||r.some((v,j)=>a[j]?.[i]!==v)))c.addIssue({code:'custom',message:'Symmetric unit-diagonal correlation shape required'});});
const candidate=z.object({id:z.string().regex(/^[\w-]{1,40}$/),pvKwp:nn.max(1e6),inverterKw:nn.max(1e6),batteryKwh:nn.max(1e6),batteryKw:nn.max(1e6),periodCapex:nn.max(1e12)}).strict();
const hybrid=z.object({schemaVersion:z.literal('hybrid-sizing-v1'),source:text,contextSha256:hash,intervalHours:pos.max(1),initialSoc:n.min(0).max(1),minimumSoc:n.min(0).max(1),chargeEfficiency:n.min(.8).max(.99),dischargeEfficiency:n.min(.8).max(.99),wearPerKwh:pos.max(1e6),minimumDeliveredKwh:nn.max(1e9),allowGridCharging:z.boolean(),standbyW:nn.max(1e6),pumpW:nn.max(1e6),hvacWPerKwhC:nn.max(1000),hvacSetpointC:n.min(-20).max(60),candidates:z.array(candidate).min(1).max(30),records:z.array(z.object({timestamp:studyTimestamp,pvKwhPerKwp:nn.max(2),externalGenerationKwh:nn.max(1e6),externalOrigin:z.enum(['pv','wind','hybrid','none']),loadKwh:nn.max(1e6),ambientC:n.min(-60).max(70),importPrice:pos.max(1e6),exportPrice:nn.max(1e6),importLimitKw:nn.max(1e6),exportLimitKw:nn.max(1e6)}).strict()).min(1).max(168)}).strict().superRefine((p,c)=>{
 if(p.minimumSoc>p.initialSoc)c.addIssue({code:'custom',message:'SOC order'});
 if(new Set(p.candidates.map(x=>x.id)).size!==p.candidates.length)c.addIssue({code:'custom',message:'Unique candidate ids required'});
 for(const [i,r] of p.records.entries()){if(r.importPrice<=r.exportPrice)c.addIssue({code:'custom',message:'Import price must exceed export price'});if(i&&Date.parse(r.timestamp)-Date.parse(p.records[i-1].timestamp)!==p.intervalHours*3600000)c.addIssue({code:'custom',message:'Exact contiguous intervals required'});if(r.externalOrigin==='none'&&r.externalGenerationKwh!==0)c.addIssue({code:'custom',message:'External generation origin required'});}
});
const twin=z.object({schemaVersion:z.literal('batch-twin-v1'),source:text,projectContextSha256:hash,baselineContextSha256:hash,baselineSha256:hash,baselineSource:text,thresholdFraction:n.min(.01).max(.9),minimumExpectedW:pos.max(1e9),minimumEvaluationPairs:z.number().int().min(2).max(10000),trainEndUtc:studyTimestamp,intervalMinutes:z.number().int().min(1).max(60),records:z.array(z.object({assetId:z.string().regex(/^[\w-]{1,40}$/),timestamp:studyTimestamp,expectedW:nn.max(1e9),measuredW:nn.max(1e9).nullable(),quality:z.enum(['valid','missing','excluded']),event:z.enum(['none','outage','curtailment']),knownHealthy:z.boolean().nullable()}).strict()).min(4).max(10000)}).strict().superRefine((p,c)=>{
 const last=new Map<string,number>();for(const r of p.records){const t=Date.parse(r.timestamp),prev=last.get(r.assetId);if(prev!==undefined&&t-prev!==p.intervalMinutes*60000)c.addIssue({code:'custom',message:'Each asset requires contiguous unique instants'});last.set(r.assetId,t);if((r.quality==='missing')!==(r.measuredW===null))c.addIssue({code:'custom',message:'Missing is null only'});}
});
export const PortfolioRequestSchema=z.discriminatedUnion('operation',[
 z.object({operation:z.literal('project_uq'),plan:uq}).strict(),z.object({operation:z.literal('hybrid_sizing'),plan:hybrid}).strict(),z.object({operation:z.literal('batch_twin'),plan:twin}).strict(),
]);
export type PortfolioRequest=z.infer<typeof PortfolioRequestSchema>;
/** Numerical verification is not field validation or energy adoption. */
export function validatePortfolioResult(value:unknown,request:PortfolioRequest){
 const r=z.object({schemaVersion:z.literal('portfolio-result-v1'),algorithmVersion:z.literal('1.0.0'),plan:z.unknown(),planSha256:hash,validationStatus:z.literal('not_field_validated'),projectApproval:z.literal('blocked'),safetyApproval:z.literal('not_assessed'),limitations:z.array(z.string()).min(1),operation:z.enum(portfolioOperations),status:z.enum(['completed','insufficient_evidence','infeasible']),output:z.record(z.string(),z.unknown())}).strict().parse(value);
 if(r.operation!==request.operation||stable(r.plan)!==stable(request.plan))throw new Error('Portfolio input binding mismatch');
 const visit=(v:unknown):void=>{if(typeof v==='number'&&!Number.isFinite(v))throw new Error('Nonfinite result');if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')Object.values(v).forEach(visit);};visit(r);
 if(request.operation==='hybrid_sizing'){
  const output=z.object({candidates:z.array(z.object({id:z.string(),status:z.enum(['feasible','infeasible']),objective:n.optional(),trace:z.array(z.object({timestamp:studyTimestamp,generationKwh:nn,auxiliaryKwh:nn,loadKwh:nn,chargeKwh:nn,dischargeKwh:nn,importKwh:nn,exportKwh:nn,curtailedKwh:nn,storedKwh:nn}).strict()).optional()}).passthrough()),bestCandidateId:z.string().nullable(),continuousSizingGap:z.null()}).passthrough().parse(r.output);
  const near=(a:number,b:number)=>{if(Math.abs(a-b)>1e-6*Math.max(1,Math.abs(a),Math.abs(b)))throw new Error('Hybrid balance mismatch');};
  if(output.candidates.length!==request.plan.candidates.length||new Set(output.candidates.map(c=>c.id)).size!==output.candidates.length)throw new Error('Candidate coverage');
  for(const row of output.candidates){const c=request.plan.candidates.find(c=>c.id===row.id);if(!c)throw new Error('Unknown candidate');if(row.status==='infeasible')continue;
   const p=request.plan;if(!row.trace||row.trace.length!==p.records.length||row.objective===undefined)throw new Error('Trace count');let stored=c.batteryKwh*p.initialSoc,cost=c.periodCapex,delivered=0;
   row.trace.forEach((t,i)=>{const x=p.records[i],dt=p.intervalHours;const aux=c.batteryKwh>0?(p.standbyW+p.pumpW+p.hvacWPerKwhC*c.batteryKwh*Math.max(0,x.ambientC-p.hvacSetpointC))*dt/1000:0;
    near(t.generationKwh,Math.min(c.pvKwp*x.pvKwhPerKwp,c.inverterKw*dt)+x.externalGenerationKwh);near(t.auxiliaryKwh,aux);near(t.loadKwh,x.loadKwh);if(t.timestamp!==x.timestamp)throw new Error('Time mismatch');
    near(t.generationKwh+t.dischargeKwh+t.importKwh,t.loadKwh+t.auxiliaryKwh+t.chargeKwh+t.exportKwh+t.curtailedKwh);
    stored+=t.chargeKwh*p.chargeEfficiency-t.dischargeKwh/p.dischargeEfficiency;near(t.storedKwh,stored);
    if(stored<c.batteryKwh*p.minimumSoc-1e-6||stored>c.batteryKwh+1e-6||Math.max(t.chargeKwh,t.dischargeKwh)>c.batteryKw*dt+1e-6||t.importKwh>x.importLimitKw*dt+1e-6||t.exportKwh>x.exportLimitKw*dt+1e-6||t.chargeKwh*t.dischargeKwh>1e-6||t.importKwh*t.exportKwh>1e-6||!p.allowGridCharging&&t.chargeKwh>Math.max(0,t.generationKwh-t.loadKwh-t.auxiliaryKwh)+1e-6)throw new Error('Hybrid constraint');
    cost+=x.importPrice*t.importKwh-x.exportPrice*t.exportKwh+p.wearPerKwh*(t.chargeKwh+t.dischargeKwh);delivered+=t.exportKwh-t.importKwh;
   });near(stored,c.batteryKwh*p.initialSoc);near(cost,row.objective);if(p.minimumDeliveredKwh>0&&delivered+1e-6<p.minimumDeliveredKwh)throw new Error('Delivery constraint');
  }
  const feasible=output.candidates.filter(c=>c.status==='feasible').sort((a,b)=>a.objective!-b.objective!||(a.id<b.id?-1:a.id>b.id?1:0));if(output.bestCandidateId!==(feasible[0]?.id??null))throw new Error('Best candidate binding');
 }else if(request.operation==='project_uq'){
  const o=z.object({nested:z.object({withinKwh2:nn,betweenKwh2:nn,totalKwh2:nn,reconciliationKwh2:n}).passthrough(),quantileRuns:z.array(z.array(z.object({label:z.enum(['P50','P75','P90','P99']),cdfProbability:n,estimateKwh:pos,ciLowerKwh:pos,ciUpperKwh:pos,rankSupported:z.boolean(),relativeWidth:nn,withinTolerance:z.boolean()}).strict()).length(4)).length(2),calibrationGate:z.literal('blocked_literature_or_assumed_not_project_calibration')}).passthrough().parse(r.output);
  if(r.status!=='insufficient_evidence'||Math.abs(o.nested.totalKwh2-o.nested.withinKwh2-o.nested.betweenKwh2)>1e-6*Math.max(1,o.nested.totalKwh2))throw new Error('UQ variance/gate');
  for(const run of o.quantileRuns)for(const [i,q] of run.entries()){if(q.label!==['P50','P75','P90','P99'][i]||q.cdfProbability!==[.5,.25,.1,.01][i]||q.ciLowerKwh>q.estimateKwh||q.ciUpperKwh<q.estimateKwh||i&&q.estimateKwh>run[i-1].estimateKwh||q.withinTolerance&&(!q.rankSupported||q.relativeWidth>request.plan.relativeCiTolerance))throw new Error('UQ quantile contract');}
 }else{
  if(r.status!=='insufficient_evidence')throw new Error('Twin cannot be field approved');
  if(r.output.reason!=='context_mismatch'){
   const output=z.object({baselineFrozen:z.literal(true),baselineSha256:hash,fieldGate:z.literal('blocked_independent_site_and_time_validation_required'),assets:z.array(z.object({assetId:z.string(),status:z.enum(['research_only','insufficient_pairs']),healthIndex:n.min(0).max(1).optional()}).passthrough())}).passthrough().parse(r.output);
   if(output.baselineSha256!==request.plan.baselineSha256||output.assets.length!==new Set(request.plan.records.map(x=>x.assetId)).size)throw new Error('Twin baseline/asset binding');
  }else if(request.plan.baselineContextSha256===request.plan.projectContextSha256)throw new Error('False context mismatch');
 }
 return r;
}
