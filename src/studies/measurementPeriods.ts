import type {StudyResult} from './studyContract';
import {studyTimestamp} from './studyTime';
import {measurementComparison,summarizeMeasurementRows} from './measurementComparison';
export interface MeasurementRange {startUtc:string;endUtc:string}
/** Half-open UTC selection and buckets use interval MIDPOINT, never local wall time. */
export function measurementPeriods(result:StudyResult,range?:MeasurementRange){
 let start=-Infinity,end=Infinity;
 if(range){start=Date.parse(studyTimestamp.parse(range.startUtc));end=Date.parse(studyTimestamp.parse(range.endUtc));if(start>=end)throw new Error('Range start must precede end');}
 const comparison=measurementComparison(result);
 const step=result.request.weather.intervalMinutes*60000;
 const midpoint=(timestamp:string)=>Date.parse(timestamp)-step/2;
 const selected=(timestamp:string)=>midpoint(timestamp)>=start&&midpoint(timestamp)<end;
 const model=result.samples.map(row=>String(row.timestamp)).filter(selected);
 return {
  schemaVersion:'study-measurement-period-analysis-v1',analyticsVersion:'1.0.0',validationStatus:comparison.validationStatus,
  inputSha256:comparison.inputSha256,engineVersion:comparison.engineVersion,site:comparison.site,modelPeriod:comparison.modelPeriod,
  selection:range?{startUtc:new Date(start).toISOString(),endUtc:new Date(end).toISOString()}:null,
  policy:{...comparison.policy,time:'UTC interval midpoint; selection [start,end); daily YYYY-MM-DD / monthly YYYY-MM; no resampling, no synthetic empty buckets',aggregation:'Each bucket recomputes errors from its pairs; never average daily RMSE. Model and observation denominators are selected within the same bucket.'},
  datasets:comparison.datasets.map(dataset=>{
   const {rows:allRows,coverage:_,metrics:__,matchedEnergyWh:___,status:____,reason:_____,...metadata}=dataset;
   const rows=allRows.filter(row=>selected(row.timestamp));
   const group=(width:7|10)=>{
    const buckets=new Map<string,{rows:typeof rows;model:string[]}>();
    const bucket=(timestamp:string)=>{const key=new Date(midpoint(timestamp)).toISOString().slice(0,width);let b=buckets.get(key);if(!b){b={rows:[],model:[]};buckets.set(key,b);}return b;};
    for(const timestamp of model)bucket(timestamp).model.push(timestamp);
    for(const row of rows)bucket(row.timestamp).rows.push(row);
    return [...buckets].sort(([a],[b])=>a.localeCompare(b)).map(([period,b])=>({period,...summarizeMeasurementRows(b.rows,b.model,dataset.intervalMinutes,dataset.unit)}));
   };
   return {...metadata,total:summarizeMeasurementRows(rows,model,dataset.intervalMinutes,dataset.unit),daily:group(10),monthly:group(7),rows};
  }),
 };
}
export type MeasurementPeriodAnalysis=ReturnType<typeof measurementPeriods>;
const cell=(value:unknown)=>{if(value===null||value===undefined)return '""';let text=String(value);if(typeof value==='string'&&/^\s*[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
const csv=(rows:unknown[][])=>rows.map(row=>row.map(cell).join(',')).join('\r\n');
export function measurementPeriodSummaryCsv(analysis:MeasurementPeriodAnalysis){
 const rows:unknown[][]=[['schemaVersion','inputSha256','startUtc','endUtc','timeBasis','datasetId','source','sensorId','modelPoint','unit','group','period','modelIntervals','observationRecords','paired','missing','excluded','outsideModelPeriod','modelPointUnavailable','modelIntervalsWithoutObservation','pairedHours','pairedPercentOfModelIntervals','pairedPercentOfValidRecords','mbe','mae','rmse','observedMean','modeledMean','observedWh','modeledWh','residualWh']];
 for(const d of analysis.datasets)for(const [group,buckets] of [['total',[{period:'selected',...d.total}]],['daily',d.daily],['monthly',d.monthly]] as const)for(const b of buckets){const c=b.coverage,n=c.statusCounts;rows.push([analysis.schemaVersion,analysis.inputSha256,analysis.selection?.startUtc,analysis.selection?.endUtc,'UTC interval midpoint',d.id,d.source,d.sensorId,d.modelPoint,d.unit,group,b.period,c.modelIntervals,c.observationRecords,n.paired,n.missing,n.excluded,n.outside_model_period,n.model_point_unavailable,c.modelIntervalsWithoutObservationRecord,c.pairedHours,c.pairedPercentOfModelIntervals,c.pairedPercentOfValidRecords,b.metrics?.mbe,b.metrics?.mae,b.metrics?.rmse,b.metrics?.observedMean,b.metrics?.modeledMean,b.matchedEnergyWh?.observed,b.matchedEnergyWh?.modeled,b.matchedEnergyWh?.residual]);}
 return csv(rows);
}
export function measurementResidualCsv(analysis:MeasurementPeriodAnalysis){
 return csv([['schemaVersion','inputSha256','startUtc','endUtc','datasetId','modelPoint','unit','intervalEndUtc','midpointUtc','qualityFlag','status','reason','observed','modeled','residual'],...analysis.datasets.flatMap(d=>d.rows.map(row=>[analysis.schemaVersion,analysis.inputSha256,analysis.selection?.startUtc,analysis.selection?.endUtc,d.id,d.modelPoint,d.unit,row.intervalEndUtc,new Date(Date.parse(row.timestamp)-d.intervalMinutes*30000).toISOString(),row.qualityFlag,row.status,row.reason,row.canonicalValue,row.modeledValue,row.residual]))]);
}
