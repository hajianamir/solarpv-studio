import type {StudyResult} from './studyContract';
import {measurementRows} from './studyMeasurements';

/** Read-only diagnostics from a validated StudyResult; never changes the model or fits parameters. */
export function measurementComparison(result:StudyResult){
 return {
  schemaVersion:'study-measurement-comparison-v1',analyticsVersion:'1.0.0',validationStatus:'not_field_validated',
  inputSha256:result.manifest.inputSha256,engineVersion:result.manifest.engineVersion,
  site:{...result.request.site},modelPeriod:{...result.manifest.period},
  policy:{residual:'modeled minus observed',selection:'all exact UTC valid pairs, including zeros and night; no automatic filtering',weighting:'equal interval weights; divisor N, not N-1',coverage:'paired/model intervals and paired/valid observation records; not continuous span coverage',energy:'matched power pairs only; no extrapolation or annualization',limitations:'Caller-declared observations, not source certification, calibration or proof of model accuracy. Reference cell temperature is not a block/array average. No normalized errors, MAPE, R2 or acceptance threshold.'},
  datasets:(result.request.measurements??[]).map(dataset=>{
   const rows=measurementRows(result,dataset).map(row=>({...row,residual:row.status==='paired'?row.modeledValue!-row.canonicalValue!:null}));
   const pairs=rows.filter(row=>row.status==='paired');
   const count=pairs.length,dt=dataset.intervalMinutes/60;
   const counts={paired:0,missing:0,excluded:0,outside_model_period:0,model_point_unavailable:0};
   for(const row of rows)counts[row.status as keyof typeof counts]++;
   const validRecords=rows.filter(row=>row.qualityFlag==='valid').length;
   const observationTimes=new Set(rows.map(row=>Date.parse(row.timestamp)));
   const absentModelIntervals=result.samples.filter(row=>!observationTimes.has(Date.parse(String(row.timestamp)))).length;
   const observedSum=pairs.reduce((sum,row)=>sum+row.canonicalValue!,0),modeledSum=pairs.reduce((sum,row)=>sum+row.modeledValue!,0);
   const residualSum=pairs.reduce((sum,row)=>sum+row.residual!,0);
   const metrics=count?{mbe:residualSum/count,mae:pairs.reduce((sum,row)=>sum+Math.abs(row.residual!),0)/count,rmse:Math.sqrt(pairs.reduce((sum,row)=>sum+row.residual!**2,0)/count),observedMean:observedSum/count,modeledMean:modeledSum/count}:null;
   return {
    id:dataset.id,rawCsvSha256:dataset.importTrace?.rawCsvSha256??null,source:dataset.source,sourceVersion:dataset.sourceVersion,quality:dataset.quality,sensorId:dataset.sensorId,modelPoint:dataset.modelPoint,
    unit:dataset.unit==='degC'?'degC':'W',intervalMinutes:dataset.intervalMinutes,
    status:count?'paired_data_available':'no_valid_pairs',reason:count===0?'No valid exact UTC pairs with an available modeled point.':count===1?'One pair only; no representativeness or statistical confidence implied.':'Partial/sparse or full overlap is descriptive only; no representativeness or statistical confidence implied.',
    coverage:{modelIntervals:result.samples.length,observationRecords:rows.length,validRecords,statusCounts:counts,modelIntervalsWithoutObservationRecord:absentModelIntervals,pairedHours:count*dt,pairedPercentOfModelIntervals:result.samples.length?100*count/result.samples.length:null,pairedPercentOfValidRecords:validRecords?100*count/validRecords:null,firstPairedIntervalEndUtc:pairs[0]?.intervalEndUtc??null,lastPairedIntervalEndUtc:pairs.at(-1)?.intervalEndUtc??null},
    metrics,
    matchedEnergyWh:count&&dataset.unit!=='degC'?{observed:observedSum*dt,modeled:modeledSum*dt,residual:residualSum*dt}:null,
    rows,
   };
  }),
 };
}
