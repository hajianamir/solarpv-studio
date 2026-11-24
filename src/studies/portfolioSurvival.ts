import {z} from 'zod';
import {studyTimestamp} from './studyTime';
import {stable} from './studyComparisonGate';
const n=z.number().finite(),id=z.string().regex(/^[A-Za-z0-9_-]{1,40}$/),text=z.string().trim().min(10).max(1000);
export const survivalOperations=['cohort_survival'] as const;
export const SurvivalPlanSchema=z.object({schemaVersion:z.literal('cohort-survival-v1'),source:text,eventDefinition:text,censoringAssumptionSource:text,trainSites:z.array(id).min(1).max(50),evaluationSites:z.array(id).min(1).max(50),trainEndUtc:studyTimestamp,evaluationStartUtc:studyTimestamp,confidenceLevel:n.min(.8).max(.99),minimumAtRisk:z.number().int().min(2).max(10000),ageDays:n.min(0).max(36500),remainingHorizonDays:n.min(1e-6).max(36500),scoreHorizonDays:n.min(1e-6).max(36500),minimumCensorSurvival:n.min(.01).max(.5),records:z.array(z.object({siteId:id,assetId:id,installedUtc:studyTimestamp,observedUntilUtc:studyTimestamp,failed:z.boolean()}).strict()).min(4).max(10000)}).strict().superRefine((p,c)=>{
 const fail=(message:string)=>c.addIssue({code:'custom',message});
 if(new Set(p.trainSites).size!==p.trainSites.length||new Set(p.evaluationSites).size!==p.evaluationSites.length||p.trainSites.some(x=>p.evaluationSites.includes(x))||Date.parse(p.trainEndUtc)>=Date.parse(p.evaluationStartUtc))fail('Disjoint site and future cohort required');
 const seen=new Set<string>();let train=0,evaluation=0;
 for(const row of p.records){const key=row.assetId,start=Date.parse(row.installedUtc),end=Date.parse(row.observedUntilUtc),days=(end-start)/86400000;if(seen.has(key)||days<=0||days>36500)fail('One outcome per asset and positive bounded follow-up required');seen.add(key);
  if(p.trainSites.includes(row.siteId)){train++;if(end>Date.parse(p.trainEndUtc))fail('Future training outcome');}else if(p.evaluationSites.includes(row.siteId)){evaluation++;if(start<Date.parse(p.evaluationStartUtc))fail('Evaluation installation precedes split');}else fail('Unknown site');
 }if(train<2||evaluation<2)fail('Two assets per split required');
});
export const SurvivalRequestSchema=z.object({operation:z.literal('cohort_survival'),plan:SurvivalPlanSchema}).strict();
type Plan=z.infer<typeof SurvivalPlanSchema>;
type Outcome={days:number;failed:boolean};
/** Separate deterministic verification of risk sets, product-limit estimator and scores. */
function productLimit(rows:Outcome[],reverse=false){
 const times=new Map<number,{failures:number;censored:number}>();for(const row of rows){const counts=times.get(row.days)??{failures:0,censored:0};counts[row.failed?'failures':'censored']++;times.set(row.days,counts);}
 let risk=rows.length,survival=1;return [...times].sort((a,b)=>a[0]-b[0]).map(([days,c])=>{const atRisk=risk;if(reverse){const denominator=risk-c.failures;if(c.censored)survival*=1-c.censored/denominator;}else survival*=1-c.failures/risk;risk-=c.failures+c.censored;return {days,atRisk,...c,survival};});
}
function lookup(points:{days:number;survival:number}[],t:number,left=false){let lo=0,hi=points.length;while(lo<hi){const mid=(lo+hi)>>>1;if(left?points[mid].days<t:points[mid].days<=t)lo=mid+1;else hi=mid;}return lo?points[lo-1].survival:1;}
// Acklam inverse-normal rational approximation; absolute z error < 1e-8
// on the supported upper-tail probabilities [.9,.995]. Validator only.
function confidenceZ(confidence:number){
 const p=(1+confidence)/2;
 if(p>1-.02425){const q=Math.sqrt(-2*Math.log(1-p));return -(((((-.007784894002430293*q-.3223964580411365)*q-2.400758277161838)*q-2.549732539343734)*q+4.374664141464968)*q+2.938163982698783)/((((.007784695709041462*q+.3224671290700398)*q+2.445134137142996)*q+3.754408661907416)*q+1);}
 const q=p-.5,r=q*q;return (((((-39.69683028665376*r+220.9460984245205)*r-275.9285104469687)*r+138.357751867269)*r-30.66479806614716)*r+2.506628277459239)*q/(((((-54.47609879822406*r+161.5858368580409)*r-155.6989798598866)*r+66.80131188771972)*r-13.28068155288572)*r+1);
}
export function validateSurvivalResult(value:unknown,p:Plan){
 const probability=n.min(0).max(1),count=z.number().int().nonnegative();
 const r=z.object({schemaVersion:z.literal('portfolio-result-v1'),algorithmVersion:z.literal('1.0.0'),plan:z.unknown(),planSha256:z.string().regex(/^[a-f0-9]{64}$/),operation:z.literal('cohort_survival'),status:z.literal('insufficient_evidence'),validationStatus:z.literal('not_field_validated'),projectApproval:z.literal('blocked'),safetyApproval:z.literal('not_assessed'),limitations:z.array(z.string()).min(3),output:z.object({curve:z.array(z.object({days:n.positive(),atRisk:count,failures:count,censored:count,survival:probability,ciLower:probability,ciUpper:probability}).strict()),trainingAssets:count,trainingFailures:count,evaluationAssets:count,maximumFollowupDays:n.positive(),medianLifetimeDays:n.positive().nullable(),conditional:z.object({ageDays:n.nonnegative(),horizonDays:n.positive(),atRiskAtAge:count,atRiskAtHorizon:count,status:z.enum(['supported','insufficient_support']),survivalProbability:probability.nullable(),restrictedMeanRemainingDays:n.nonnegative().nullable()}).strict(),evaluation:z.object({horizonDays:n.positive(),predictedSurvival:probability,censorSurvival:probability,earlyCensoredAssets:count,scoredAssets:count,status:z.enum(['supported','insufficient_support']),ipcwBrier:n.nonnegative().nullable()}).strict(),fieldGate:z.literal('blocked_missing_independent_lifetime_evidence'),ciMethod:z.string(),estimand:z.string()}).strict()}).strict().parse(value);
 if(stable(r.plan)!==stable(p))throw new Error('Survival input binding');
 const outcome=(row:Plan['records'][number]):Outcome=>({days:(Date.parse(row.observedUntilUtc)-Date.parse(row.installedUtc))/86400000,failed:row.failed});
 const train=p.records.filter(x=>p.trainSites.includes(x.siteId)).map(outcome),evaluation=p.records.filter(x=>p.evaluationSites.includes(x.siteId)).map(outcome),curve=productLimit(train),censor=productLimit(train,true),o=r.output;
 const near=(a:number|null,b:number|null)=>{if(a===null||b===null){if(a!==b)throw new Error('Survival null support');}else if(Math.abs(a-b)>1e-9*Math.max(1,Math.abs(b)))throw new Error('Survival numerical reference');};
 if(o.curve.length!==curve.length||o.trainingAssets!==train.length||o.evaluationAssets!==evaluation.length||o.trainingFailures!==train.filter(x=>x.failed).length)throw new Error('Survival coverage');
 let greenwood=0;const zscore=confidenceZ(p.confidenceLevel);
 o.curve.forEach((x,i)=>{const expected=curve[i];for(const k of ['days','atRisk','failures','censored','survival'] as const)near(x[k],expected[k]);if(x.ciLower>x.survival||x.ciUpper<x.survival||(x.survival===0||x.survival===1)&&(x.ciLower!==x.survival||x.ciUpper!==x.survival))throw new Error('Survival CI bounds');
  if(expected.failures&&expected.atRisk>expected.failures)greenwood+=expected.failures/(expected.atRisk*(expected.atRisk-expected.failures));
  if(x.survival>0&&x.survival<1){const center=Math.log(-Math.log(x.survival)),se=Math.sqrt(greenwood)/Math.abs(Math.log(x.survival));near(x.ciLower,Math.exp(-Math.exp(Math.min(700,center+zscore*se))));near(x.ciUpper,Math.exp(-Math.exp(Math.max(-700,center-zscore*se))));}
 });
 const max=curve[curve.length-1].days,age=p.ageDays,end=age+p.remainingHorizonDays,sAge=lookup(curve,age),risk=train.filter(x=>x.days>=end).length,supported=end<=max&&risk>=p.minimumAtRisk&&sAge>0;
 near(o.maximumFollowupDays,max);near(o.medianLifetimeDays,curve.find(x=>x.survival<=.5)?.days??null);near(o.conditional.ageDays,age);near(o.conditional.horizonDays,p.remainingHorizonDays);near(o.conditional.atRiskAtAge,train.filter(x=>x.days>=age).length);near(o.conditional.atRiskAtHorizon,risk);
 const cuts=[age,...curve.filter(x=>x.days>age&&x.days<end).map(x=>x.days),end];const area=supported?cuts.slice(1).reduce((sum,right,i)=>sum+(right-cuts[i])*lookup(curve,cuts[i])/sAge,0):null;
 if(o.conditional.status!==(supported?'supported':'insufficient_support'))throw new Error('Survival horizon support');near(o.conditional.survivalProbability,supported?lookup(curve,end)/sAge:null);near(o.conditional.restrictedMeanRemainingDays,area);
 const h=p.scoreHorizonDays,g=lookup(censor,h),prediction=lookup(curve,h);let scoreSupported=h<=max&&train.filter(x=>x.days>=h).length>=p.minimumAtRisk&&g>=p.minimumCensorSurvival,weighted=0,early=0;
 for(const x of evaluation){if(x.failed&&x.days<=h){const denominator=lookup(censor,x.days,true);if(denominator<p.minimumCensorSurvival)scoreSupported=false;else weighted+=prediction**2/denominator;}else if(x.days>h){if(g>=p.minimumCensorSurvival)weighted+=(1-prediction)**2/g;}else early++;}
 scoreSupported=scoreSupported&&evaluation.length-early>=2;
 near(o.evaluation.scoredAssets,evaluation.length-early);near(o.evaluation.horizonDays,h);near(o.evaluation.predictedSurvival,prediction);near(o.evaluation.censorSurvival,g);near(o.evaluation.earlyCensoredAssets,early);near(o.evaluation.ipcwBrier,scoreSupported?weighted/evaluation.length:null);if(o.evaluation.status!==(scoreSupported?'supported':'insufficient_support'))throw new Error('Survival score support');
 return r;
}
