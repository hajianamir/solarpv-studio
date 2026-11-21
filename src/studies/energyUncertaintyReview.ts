import {validateResult} from './studyWorkflow';
import {runStudyValidation} from './studyValidation';
import {canonicalBundleJson} from './studyExchange';
import {weatherSha256} from './declaredWeatherAdapter';
/** Additive budget review of the existing conditional lognormal model, not a new yield simulation. */
export function energyUncertaintyReview(rawResult:unknown,rawPlan:unknown){
 const result=validateResult(rawResult),report=runStudyValidation(result,rawPlan),plan=report.plan;
 if(plan.tool!=='energy_uncertainty'||!('p90Wh' in report.result))throw new Error('Successful energy uncertainty plan required');
 const model=report.result;
 const components=plan.components.map(c=>({...c,logStandardDeviation:Math.sqrt(Math.log1p(c.coefficientOfVariation**2)),diagonalLogVariance:Math.log1p(c.coefficientOfVariation**2)}));
 const crossTerms=components.flatMap((a,i)=>components.slice(i+1).map((b,k)=>{const j=i+1+k;return {first:a.id,second:b.id,logSpaceCorrelation:plan.logSpaceCorrelation[i][j],signedLogVariance:2*plan.logSpaceCorrelation[i][j]*a.logStandardDeviation*b.logStandardDeviation};}));
 const diagonalSum=components.reduce((s,c)=>s+c.diagonalLogVariance,0),crossSum=crossTerms.reduce((s,c)=>s+c.signedLogVariance,0),varianceUsed=model.logStandardDeviation**2;
 const warnings=['All CVs, sources, correlation and baseline-as-median interpretation are caller declarations, not verified site estimates.','No automatic overlap/double-count detection, calibration/RMSE propagation, multi-year averaging, weather ensemble or acceptance certification.'];
 if(plan.purpose==='synthetic_software_test')warnings.push('SYNTHETIC software-test budget, not project uncertainty.');
 if(plan.horizon==='study_period')warnings.push('Study-period exceedance only, not annual energy; no annualization.');
 if(crossTerms.some(c=>c.signedLogVariance<0))warnings.push('Negative cross terms reduce variance only under the declared log-space correlation model; not physical removal of uncertainty.');
 if(varianceUsed===0)warnings.push('Zero combined variance is a declared degenerate/cancellation assumption, not evidence of real-world certainty.');
 return {schemaVersion:'study-energy-uncertainty-review-v1',analyticsVersion:'1.0.0',validationStatus:'not_field_validated',resultSha256:weatherSha256(canonicalBundleJson(result)),report,period:{...result.manifest.period},energyPoint:'AC export',energyUnit:'Wh',components,crossTerms,budget:{diagonalLogVariance:diagonalSum,signedCrossLogVariance:crossSum,sumLogVariance:diagonalSum+crossSum,usedLogVariance:varianceUsed,reconciliationDifference:diagonalSum+crossSum-varianceUsed},quantiles:[{label:'P50',exceedanceProbability:0.5,cdfProbability:0.5,energyWh:model.p50Wh},{label:'P90',exceedanceProbability:0.9,cdfProbability:0.1,energyWh:model.p90Wh}],meanWh:model.meanWh,policy:{distribution:'Multiplicative lognormal factors, jointly normal logs',centralEstimate:'Study AC export explicitly declared median, not arithmetic mean',correlation:'Matrix is in log space; no default independence. Diagonal variance plus 2*rho*sigma_i*sigma_j for each unordered pair.',budget:'Signed variance terms, not additive energy losses or percentages; reconciliation difference can reflect floating-point rounding.',scope:'Only the declared horizon. Single-calendar-year requires complete UTC calendar-year data; no extrapolation or multi-year scaling.',exceedance:'P90 is the 10th CDF percentile: 90 percent exceedance under assumptions, not a confidence interval of the mean.',compatibility:'Original report/protocol unchanged; no modifications to physics, finance or empirical gain.'},warnings};
}
export type EnergyUncertaintyReview=ReturnType<typeof energyUncertaintyReview>;
const cell=(v:unknown)=>{if(v===null||v===undefined)return '""';let s=String(v);if(typeof v==='string'&&/^\s*[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
export function energyUncertaintyBudgetCsv(review:EnergyUncertaintyReview){
 const rows:unknown[][]=[['schemaVersion','resultSha256','inputSha256','planSha256','horizon','unit','kind','componentOrQuantile','secondComponent','source','sourceVersion','coefficientOfVariation','logSigma','logSpaceCorrelation','signedLogVariance','energyWh','exceedanceProbability','cdfProbability']];
 const prefix=[review.schemaVersion,review.resultSha256,review.report.inputSha256,review.report.planSha256,'horizon' in review.report.result?review.report.result.horizon:'','Wh'];
 for(const q of review.quantiles)rows.push([...prefix,'quantile',q.label,null,review.report.plan.source,review.report.plan.sourceVersion,null,null,null,null,q.energyWh,q.exceedanceProbability,q.cdfProbability]);
 rows.push([...prefix,'mean','arithmetic_mean',null,null,null,null,null,null,null,review.meanWh,null,null]);
 for(const c of review.components)rows.push([...prefix,'diagonal',c.id,null,c.source,c.sourceVersion,c.coefficientOfVariation,c.logStandardDeviation,1,c.diagonalLogVariance,null,null,null]);
 for(const c of review.crossTerms)rows.push([...prefix,'cross',c.first,c.second,null,null,null,null,c.logSpaceCorrelation,c.signedLogVariance,null,null,null]);
 rows.push([...prefix,'combined','used_log_variance',null,null,null,null,null,null,review.budget.usedLogVariance,null,null,null]);
 return rows.map(row=>row.map(cell).join(',')).join('\r\n');
}
export function energyUncertaintyReviewHtml(review:EnergyUncertaintyReview){const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));return `<!doctype html><html lang="en"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Conditional energy uncertainty budget</title><h1>Conditional P50/P90 — not verified project uncertainty</h1><p>Not field validated or bankable. P90 is 90 percent exceedance under declared assumptions, not a confidence interval. Keep exact study JSON and original plan/protocol.</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${escape(JSON.stringify(review,null,2))}</pre></html>`;}
