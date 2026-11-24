import {ExternalSeriesSchema,ExternalTargetSchema,reviewExternalSeries} from './externalSeries';
import {PortfolioRequestSchema,type PortfolioRequest} from './portfolioAnalytics';
import {uqHash} from './financialUqArchive';
/** Explicit comparison adapter only, never attaches to OperationalEnergy or finance. */
export function attachExternalGeneration(request:Extract<PortfolioRequest,{operation:'hybrid_sizing'}>,raw:unknown,targetRaw:unknown,enabled=false){
 const d=ExternalSeriesSchema.parse(raw),target=ExternalTargetSchema.parse(targetRaw),review=reviewExternalSeries(d,target,enabled);
 if(review.status!=='verified_for_comparison'||d.kind!=='external_generation'||d.context.boundary!=='inverter_ac'||!['pv','wind','hybrid'].includes(d.origin)||request.plan.contextSha256!==uqHash(target.context)||request.plan.intervalHours!==d.intervalMinutes/60||request.plan.records.length!==d.records.length)throw new Error('External generation context/boundary/coverage mismatch');
 return PortfolioRequestSchema.parse({...request,plan:{...request.plan,records:request.plan.records.map((r,i)=>{if(Date.parse(r.timestamp)!==Date.parse(d.records[i].timestamp))throw new Error('External interval mismatch');return {...r,externalGenerationKwh:d.records[i].value!*(d.unit==='kW'?1:.001)*d.intervalMinutes/60,externalOrigin:d.origin};})}});
}
export function twinFromExternal(rawObserved:unknown,rawBaseline:unknown,targetRaw:unknown,settings:{source:string;baselineSource:string;trainEndUtc:string;thresholdFraction:number;minimumExpectedW:number;minimumEvaluationPairs:number;annotations:{event:'none'|'outage'|'curtailment';knownHealthy:boolean|null}[]},enabled=false){
 const observed=ExternalSeriesSchema.parse(rawObserved),baseline=ExternalSeriesSchema.parse(rawBaseline),target=ExternalTargetSchema.parse(targetRaw);
 for(const d of [observed,baseline])if(reviewExternalSeries(d,target,enabled).status!=='verified_for_comparison'||d.context.boundary!=='poi')throw new Error('Complete context-matched POI evidence required');
 if(settings.annotations.length!==observed.records.length)throw new Error('Explicit event annotations required; do not assume absent event labels are healthy');
 const watts=(d:typeof observed,i:number)=>d.records[i].value!*(d.unit==='kW'?1000:1);
 return PortfolioRequestSchema.parse({operation:'batch_twin',plan:{schemaVersion:'batch-twin-v1',source:settings.source,projectContextSha256:uqHash(target.context),baselineContextSha256:uqHash(baseline.context),baselineSha256:uqHash(baseline),baselineSource:settings.baselineSource,thresholdFraction:settings.thresholdFraction,minimumExpectedW:settings.minimumExpectedW,minimumEvaluationPairs:settings.minimumEvaluationPairs,trainEndUtc:settings.trainEndUtc,intervalMinutes:target.intervalMinutes,records:observed.records.map((r,i)=>({assetId:observed.context.assetId,timestamp:r.timestamp,expectedW:watts(baseline,i),measuredW:watts(observed,i),quality:'valid',...settings.annotations[i]}))}});
}
