import type {StudyResult} from './studyContract';
import type {MeasurementDataset} from './measurementContract';
const canonicalUnit=(d:MeasurementDataset)=>d.unit==='degC'?'degC':'W';
/** Imported observations never feed the model. No residual/error/overlap statistics in stage 41. */
export function measurementRows(result:StudyResult,dataset:MeasurementDataset){
 const samples=new Map(result.samples.map(row=>[Date.parse(String(row.timestamp)),row]));
 return dataset.records.map(record=>{
  const row=samples.get(Date.parse(record.timestamp));
  let modeled:number|null=null;
  if(row){
   const imported=typeof row.gridImportW==='number'?row.gridImportW:result.request.system.sandia&&typeof row.inverterSelfConsumptionW==='number'?row.inverterSelfConsumptionW:null;
   const candidate=dataset.modelPoint==='plant_export'?row.acW:dataset.modelPoint==='plant_import'?imported:dataset.modelPoint==='plant_net_grid'?imported===null?null:Number(row.acW)-imported:dataset.modelPoint==='array_dc_terminal'?row.dcW:row.cellTemperatureC;
   if(typeof candidate==='number'&&Number.isFinite(candidate))modeled=candidate;
  }
  const status=record.qualityFlag==='missing'?'missing':record.qualityFlag==='excluded'?'excluded':!row?'outside_model_period':modeled===null?'model_point_unavailable':'paired';
  return {timestamp:record.timestamp,intervalEndUtc:new Date(Date.parse(record.timestamp)).toISOString(),rawValue:record.value,rawUnit:dataset.unit,qualityFlag:record.qualityFlag,reason:record.reason??null,canonicalValue:record.value===null?null:record.value*(dataset.unit==='kW'?1000:1),canonicalUnit:canonicalUnit(dataset),status,modeledValue:status==='paired'?modeled:null};
 });
}
export function measurementView(result:StudyResult){return {schemaVersion:'study-measurement-view-v1',validationStatus:'not_field_validated',note:'Declared interval observations; exact UTC pairing only. No fill, calibration, residual or overlap statistics. Reference cell temperature is not an array/block average.',datasets:(result.request.measurements??[]).map(d=>({id:d.id,source:d.source,sourceVersion:d.sourceVersion,quality:d.quality,sensorId:d.sensorId,modelPoint:d.modelPoint,unit:d.unit,intervalMinutes:d.intervalMinutes,rows:measurementRows(result,d)}))};}
const csvCell=(v:unknown)=>{if(v===null||v===undefined)return '""';let t=String(v);if(typeof v==='string'&&/^\s*[=+\-@\t\r]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"';};
export function measurementPairsCsv(result:StudyResult,dataset:MeasurementDataset){
 const rows=measurementRows(result,dataset);
 const keys=['timestamp','intervalEndUtc','rawValue','rawUnit','qualityFlag','reason','canonicalValue','canonicalUnit','status','modeledValue'] as const;
 return [['datasetId','modelPoint','inputSha256',...keys],...rows.map(row=>[dataset.id,dataset.modelPoint,result.manifest.inputSha256,...keys.map(k=>row[k])])].map(row=>row.map(csvCell).join(',')).join('\r\n');
}
