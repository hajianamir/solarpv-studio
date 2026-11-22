import {validateResult} from './studyWorkflow';
import {runStudyValidation} from './studyValidation';
import {measurementPeriods} from './measurementPeriods';
import {summarizeMeasurementRows} from './measurementComparison';
import {canonicalBundleJson} from './studyExchange';
import {weatherSha256} from './declaredWeatherAdapter';
/** Additive review of the existing bounded fit. Never changes a legacy report, result or protocol. */
export function outputCalibrationReview(rawResult:unknown,rawPlan:unknown){
 const result=validateResult(rawResult),report=runStudyValidation(result,rawPlan),plan=report.plan;
 if(plan.tool!=='output_calibration'||!('gain' in report.result))throw new Error('Output calibration plan and successful fit required');
 const fit=report.result,config=plan.calibration;
 const dataset=result.request.measurements!.find(d=>d.id===config.datasetId)!;
 const partitions=(['train','test'] as const).map(partition=>{
  const range=config[partition],analysis=measurementPeriods(result,range),d=analysis.datasets.find(d=>d.id===config.datasetId)!;
  const rows=d.rows.map(row=>({...row,partition,midpointUtc:new Date(Date.parse(row.timestamp)-d.intervalMinutes*30000).toISOString(),adjustedModeledValue:row.modeledValue===null?null:fit.gain*row.modeledValue,adjustedResidual:row.modeledValue===null?null:fit.gain*row.modeledValue-row.canonicalValue!}));
  const adjustedRows=rows.map(row=>({...row,modeledValue:row.adjustedModeledValue,residual:row.adjustedResidual}));
  const modelTimestamps=result.samples.filter(row=>{const mid=Date.parse(String(row.timestamp))-d.intervalMinutes*30000;return mid>=Date.parse(range.startUtc)&&mid<Date.parse(range.endUtc);}).map(row=>String(row.timestamp));
  const adjusted=summarizeMeasurementRows(adjustedRows,modelTimestamps,d.intervalMinutes,d.unit);
  return {partition,range,raw:d.total,adjusted,rows};
 });
 const delta=fit.test.raw.metrics!.rmse-fit.test.adjustedMetrics!.rmse;
 return {schemaVersion:'study-output-calibration-review-v1',analyticsVersion:'1.0.0',validationStatus:'not_field_validated',resultSha256:weatherSha256(canonicalBundleJson(result)),report,dataset:{id:dataset.id,source:dataset.source,sourceVersion:dataset.sourceVersion,quality:dataset.quality,sensorId:dataset.sensorId,modelPoint:dataset.modelPoint,rawUnit:dataset.unit,canonicalUnit:'W',intervalMinutes:dataset.intervalMinutes,rawCsvSha256:dataset.importTrace?.rawCsvSha256??null},holdout:{rmseReductionW:delta,outcome:delta>0?'improved':delta<0?'degraded':'unchanged',automaticAcceptance:false},policy:{time:'UTC interval midpoint, [start,end), disjoint chronological train/test',residual:'modeled minus observed; corrected model = gain times raw modeled power',selection:'Only exact valid pairs; zeros and nights kept, no automatic filtering or gap fill',energy:'Only matched pairs in each window; Wh, no extrapolation or annualization',physicalLimits:'Empirical corrected output is NOT re-clipped or re-simulated; may exceed inverter/export limits. Not a physical model result.',limitations:'No sensor/physical parameter calibration, acceptance certification, automatic model/finance/P50/P90 update or proof of untouched test history. Two-pair minimum is a software guard, not scientific sufficiency.'},partitions};
}
export type OutputCalibrationReview=ReturnType<typeof outputCalibrationReview>;
const cell=(v:unknown)=>{if(v===null||v===undefined)return '""';let s=String(v);if(typeof v==='string'&&/^\s*[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
export function outputCalibrationRowsCsv(review:OutputCalibrationReview){
 const rows:unknown[][]=[['schemaVersion','resultSha256','inputSha256','planSha256','datasetId','modelPoint','canonicalUnit','gain','partition','windowStart','windowEnd','intervalEndUtc','midpointUtc','rawValue','rawUnit','qualityFlag','status','reason','observedW','rawModeledW','adjustedModeledW','rawResidualW','adjustedResidualW']];
 for(const p of review.partitions)for(const r of p.rows)rows.push([review.schemaVersion,review.resultSha256,review.report.inputSha256,review.report.planSha256,review.dataset.id,review.dataset.modelPoint,'W','gain' in review.report.result?review.report.result.gain:null,p.partition,p.range.startUtc,p.range.endUtc,r.intervalEndUtc,r.midpointUtc,r.rawValue,r.rawUnit,r.qualityFlag,r.status,r.reason,r.canonicalValue,r.modeledValue,r.adjustedModeledValue,r.residual,r.adjustedResidual]);
 return rows.map(row=>row.map(cell).join(',')).join('\r\n');
}
export function outputCalibrationReviewHtml(review:OutputCalibrationReview){const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));return `<!doctype html><html lang="en"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Empirical output calibration review</title><h1>Empirical output gain — not a physical model or field validation</h1><p>Train-only bounded fit, separate held-out evaluation. No automatic application or clipping. Keep original study JSON and plan/protocol. This is not a signed certificate.</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${escape(JSON.stringify(review,null,2))}</pre></html>`;}
