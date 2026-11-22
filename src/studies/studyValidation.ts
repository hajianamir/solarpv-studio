import {z} from 'zod';
import type {StudyResult} from './studyContract';
import {validateResult} from './studyWorkflow';
import {studyTimestamp} from './studyTime';
import {measurementPeriods} from './measurementPeriods';
import {summarizeMeasurementRows} from './measurementComparison';
import {weatherSha256} from './declaredWeatherAdapter';
import {stable} from './studyComparisonGate';
const text=z.string().min(1).max(500).refine(s=>!!s.trim(),'Nonblank source/reference required');
const range=z.object({startUtc:studyTimestamp,endUtc:studyTimestamp}).strict().refine(r=>Date.parse(r.startUtc)<Date.parse(r.endUtc),'Start must precede end');
const calibration=z.object({datasetId:text,train:range,test:range,minGain:z.number().finite().min(0.5).max(1.5),maxGain:z.number().finite().min(0.5).max(1.5)}).strict().superRefine((p,ctx)=>{if(p.minGain>=p.maxGain||Date.parse(p.train.endUtc)>Date.parse(p.test.startUtc))ctx.addIssue({code:'custom',message:'Ordered gain bounds and train strictly before nonoverlapping test required'});});
const common={schemaVersion:z.literal('study-validation-plan-v1'),studyInputSha256:z.string().regex(/^[a-f0-9]{64}$/),source:text,sourceVersion:text,purpose:z.enum(['synthetic_software_test','operational_declared'])};
export const StudyValidationPlanSchema=z.discriminatedUnion('tool',[
 z.object({...common,tool:z.literal('output_calibration'),calibration}).strict(),
 z.object({...common,tool:z.literal('energy_uncertainty'),horizon:z.enum(['study_period','single_calendar_year']),centralEstimate:z.literal('study_ac_export_as_median'),components:z.array(z.object({id:z.string().regex(/^[A-Za-z0-9_-]{1,40}$/),source:text,sourceVersion:text,coefficientOfVariation:z.number().finite().min(0).max(1)}).strict()).min(1).max(8),logSpaceCorrelation:z.array(z.array(z.number().finite().min(-1).max(1)).min(1).max(8)).min(1).max(8)}).strict(),
 z.object({...common,tool:z.literal('field_evidence'),datasetId:text,evaluation:range,calibration:calibration.optional(),evidence:z.object({sensorCalibrationCertificate:text,timeSynchronization:text,siteAndMeterBoundary:text,independentReview:text}).strict(),criteria:z.object({source:text,minPairs:z.number().int().min(2).max(17568),minPairedHours:z.number().finite().positive().max(8784),minModelCoveragePct:z.number().finite().positive().max(100),maxAbsMbe:z.number().finite().nonnegative().max(1e9),maxRmse:z.number().finite().nonnegative().max(1e9)}).strict()}).strict(),
]);
export type StudyValidationPlan=z.infer<typeof StudyValidationPlanSchema>;
type CalibrationPlan=z.infer<typeof calibration>;
function select(result:StudyResult,id:string,window:z.infer<typeof range>){const a=measurementPeriods(result,window);const d=a.datasets.find(d=>d.id===id);if(!d)throw new Error('Observation dataset not found');return d;}
function calibrate(result:StudyResult,p:CalibrationPlan){
 const dataset=result.request.measurements?.find(d=>d.id===p.datasetId);
 if(!dataset||!['plant_export','plant_import','array_dc_terminal'].includes(dataset.modelPoint))throw new Error('Output gain supports nonnegative power points only; not temperature or signed net');
 const train=select(result,p.datasetId,p.train),test=select(result,p.datasetId,p.test);
 const pairs=train.rows.filter(r=>r.status==='paired');
 if(pairs.length<2||test.total.coverage.statusCounts.paired<2)throw new Error('At least two valid train pairs and two held-out test pairs required');
 const lastTrain=train.rows.at(-1),firstTest=test.rows[0];
 if(lastTrain&&firstTest&&Date.parse(firstTest.timestamp)-Date.parse(lastTrain.timestamp)<dataset.intervalMinutes*60000)throw new Error('Training and test interval spans overlap');
 const denominator=pairs.reduce((s,r)=>s+r.modeledValue!**2,0);
 if(denominator<=0)throw new Error('Unidentifiable output gain: training modeled power is all zero');
 const unconstrainedGain=pairs.reduce((s,r)=>s+r.modeledValue!*r.canonicalValue!,0)/denominator;
 const gain=Math.max(p.minGain,Math.min(p.maxGain,unconstrainedGain));
 const adjusted=(d:typeof train)=>{const rows=d.rows.map(r=>({...r,modeledValue:r.modeledValue===null?null:r.modeledValue*gain,residual:r.residual===null?null:r.modeledValue!*gain-r.canonicalValue!}));return summarizeMeasurementRows(rows,rows.filter(r=>r.status==='paired').map(r=>r.timestamp),d.intervalMinutes,d.unit).metrics;};
 return {method:'bounded through-origin output gain, least squares on training pairs only',datasetId:p.datasetId,unit:train.unit,gain,unconstrainedGain,boundActive:gain!==unconstrainedGain,train:{raw:train.total,adjustedMetrics:adjusted(train)},test:{raw:test.total,adjustedMetrics:adjusted(test)},holdoutRmseImproved:adjusted(test)!.rmse<test.total.metrics!.rmse,limitations:'Empirical output correction only; no physical parameter fitting, sensor calibration or automatic baseline/P50/P90 update. Test data never selects gain; repeated test tuning is leakage.'};
}
function uncertainty(result:StudyResult,p:Extract<StudyValidationPlan,{tool:'energy_uncertainty'}>){
 if(p.horizon==='single_calendar_year'&&!result.manifest.period.completeUtcCalendarYear)throw new Error('Single-year P50/P90 requires a complete UTC calendar-year study; no annualization');
 if(!(result.summary.acWh>0))throw new Error('Positive study AC export energy required');
 const n=p.components.length,r=p.logSpaceCorrelation;
 if(new Set(p.components.map(c=>c.id)).size!==n||r.length!==n||r.some(row=>row.length!==n))throw new Error('Unique component ids and explicit square correlation matrix required');
 const l=Array.from({length:n},()=>Array<number>(n).fill(0));
 for(let i=0;i<n;i++)for(let j=0;j<=i;j++){
  if(Math.abs(r[i][j]-r[j][i])>1e-12||Math.abs(r[i][i]-1)>1e-12)throw new Error('Correlation must be symmetric with unit diagonal');
  const v=r[i][j]-l[i].slice(0,j).reduce((s,x,k)=>s+x*l[j][k],0);
  if(i===j){if(v< -1e-12)throw new Error('Correlation is not positive semidefinite');l[i][j]=Math.sqrt(Math.max(0,v));}
  else if(l[j][j]>1e-12)l[i][j]=v/l[j][j];else if(Math.abs(v)>1e-10)throw new Error('Correlation is not positive semidefinite');
 }
 const sigmas=p.components.map(c=>Math.sqrt(Math.log1p(c.coefficientOfVariation**2)));
 const variance=sigmas.reduce((s,x,i)=>s+sigmas.reduce((a,y,j)=>a+x*r[i][j]*y,0),0);
 const sigma=Math.sqrt(Math.max(0,variance)),p50Wh=result.summary.acWh,p90Wh=p50Wh*Math.exp(-1.2815515655446004*sigma);
 return {distribution:'lognormal multiplicative factors with declared joint normal log-space correlation',horizon:p.horizon,energyPoint:'study AC export',centralEstimate:'baseline explicitly declared median, not mean',p50Wh,p90Wh,logStandardDeviation:sigma,meanWh:p50Wh*Math.exp(variance/2),p90Definition:'10th percentile; 90 percent exceedance under declared assumptions, not a 90 percent confidence interval',limitations:'No uncertainty inferred from residuals, no automatic calibration, weather ensemble, multi-year averaging, independence assumption or annualization. CV inputs describe exactly the selected horizon. Caller distribution and sources are not verified; not bankable.'};
}
function fieldEvidence(result:StudyResult,p:Extract<StudyValidationPlan,{tool:'field_evidence'}>){
 const d=select(result,p.datasetId,p.evaluation),dataset=result.request.measurements!.find(d=>d.id===p.datasetId)!;
 let correction:ReturnType<typeof calibrate>|null=null;
 if(p.calibration){if(p.calibration.datasetId!==p.datasetId||Date.parse(p.calibration.test.startUtc)!==Date.parse(p.evaluation.startUtc)||Date.parse(p.calibration.test.endUtc)!==Date.parse(p.evaluation.endUtc))throw new Error('Field evaluation must equal the untouched calibration test window on the same dataset');correction=calibrate(result,p.calibration);}
 const metrics=correction?.test.adjustedMetrics??d.total.metrics,c=p.criteria;
 const checks={sufficientPairs:d.total.coverage.statusCounts.paired>=c.minPairs,sufficientPairedHours:d.total.coverage.pairedHours>=c.minPairedHours,sufficientModelCoverage:(d.total.coverage.pairedPercentOfModelIntervals??0)>=c.minModelCoveragePct,biasWithinLimit:metrics!==null&&Math.abs(metrics.mbe)<=c.maxAbsMbe,rmseWithinLimit:metrics!==null&&metrics.rmse<=c.maxRmse};
 const blockers:string[]=[];
 if(p.purpose!=='operational_declared')blockers.push('Synthetic software-test protocol cannot establish field evidence');
 if(dataset.quality!=='measured')blockers.push('Observation quality is not caller-declared measured');
 if(!dataset.importTrace)blockers.push('Raw observation receipt required for a traceable field dossier');
 if(dataset.unit!=='degC'&&!d.rows.some(r=>r.status==='paired'&&r.modeledValue!==0))blockers.push('No energized modeled power pairs; zero-only observations cannot evaluate power performance');
 if(Date.parse(p.evaluation.startUtc)<Date.parse(result.manifest.period.startUtc)||Date.parse(p.evaluation.endUtc)>Date.parse(result.manifest.period.endUtc))blockers.push('Evaluation window extends outside modeled study coverage');
 if(d.total.coverage.modelIntervals===0||metrics===null)blockers.push('No evaluable modeled/observed pairs');
 return {status:blockers.length?'blocked':Object.values(checks).every(Boolean)?'declared_criteria_met':'criteria_not_met',blockers,checks,unit:d.unit,evaluation:d.total,evaluatedMetrics:metrics,correction,evidence:p.evidence,limitations:'Evidence references and measured labels are caller declarations, not authenticated certificates or independent approval. Criteria are user-defined, not IEC compliance. Software never marks a site/model field_validated; operational campaign and qualified review remain required.'};
}
/** Validates the result and config at the public analysis boundary, including exact study binding. */
export function runStudyValidation(rawResult:unknown,rawPlan:unknown){
 if(new TextEncoder().encode(JSON.stringify(rawPlan)).length>64000)throw new Error('Validation plan exceeds 64 KiB');
 const result=validateResult(rawResult),plan=StudyValidationPlanSchema.parse(rawPlan);
 if(plan.studyInputSha256!==result.manifest.inputSha256)throw new Error('Plan is bound to a different study input hash');
 return {schemaVersion:'study-validation-report-v1',analyticsVersion:'1.0.0',validationStatus:'not_field_validated',inputSha256:result.manifest.inputSha256,engineVersion:result.manifest.engineVersion,planSha256:weatherSha256(stable(plan)),plan,result:plan.tool==='output_calibration'?calibrate(result,plan.calibration):plan.tool==='energy_uncertainty'?uncertainty(result,plan):fieldEvidence(result,plan)};
}
export function studyValidationHtml(report:ReturnType<typeof runStudyValidation>){const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));return `<!doctype html><html lang="en"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Study validation tools</title><h1>Conditional analysis — not field validated</h1><p>Caller-declared uncertainty and evidence. Empirical output correction is not physical model or sensor calibration. No automatic changes to study or finance.</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${escape(JSON.stringify(report,null,2))}</pre></html>`;}
