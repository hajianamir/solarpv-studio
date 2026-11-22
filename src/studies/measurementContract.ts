import {z} from 'zod';
import {studyTimestamp} from './studyTime';
import {weatherSha256} from './declaredWeatherAdapter';
const text=z.string().min(1).max(500).refine(s=>!!s.trim(),'Nonblank text required');
export const MeasurementRecordSchema=z.object({timestamp:studyTimestamp,value:z.number().finite().nullable(),qualityFlag:z.enum(['valid','excluded','missing']),reason:text.optional()}).strict().superRefine((r,ctx)=>{
 if((r.qualityFlag==='missing')!==(r.value===null))ctx.addIssue({code:'custom',message:'Only missing records have null values; missing is not zero'});
 if(r.qualityFlag!=='valid'&&!r.reason)ctx.addIssue({code:'custom',message:'Excluded/missing records require an explicit reason'});
});
export const MeasurementManifestSchema=z.object({schemaVersion:z.literal('study-measurements-v1'),id:z.string().regex(/^[A-Za-z0-9_-]{1,40}$/),source:text,sourceVersion:text,quality:z.enum(['measured','user_configured','assumed']),sensorId:z.string().min(1).max(100).refine(s=>!!s.trim()),siteLatitude:z.number().finite().min(-90).max(90),siteLongitude:z.number().finite().min(-180).max(180),modelPoint:z.enum(['plant_export','plant_import','plant_net_grid','array_dc_terminal','reference_cell_temperature']),unit:z.enum(['W','kW','degC']),intervalMinutes:z.number().int().min(1).max(60),timestampConvention:z.literal('interval_end'),statistic:z.literal('interval_mean')}).strict();
export function parseMeasurementCsv(rawCsv:string):z.infer<typeof MeasurementRecordSchema>[] {
 if(new TextEncoder().encode(rawCsv).length>2*1024*1024)throw new Error('Measurement CSV exceeds 2 MiB');
 const lines=rawCsv.replace(/^\uFEFF/,'').split(/\r?\n/);if(lines.at(-1)==='')lines.pop();
 if(lines[0]!=='timestamp,value,qualityFlag,reason'||lines.length<2||lines.length>17569)throw new Error('Measurement CSV requires timestamp,value,qualityFlag,reason and 1..17568 rows');
 return lines.slice(1).map(line=>{
  const c=line.split(',');if(c.length!==4)throw new Error('Measurement CSV is plain unquoted four-column data');
  if(c[1]!==''&&!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(c[1].trim()))throw new Error('Explicit finite measurement value required; blanks only for missing');
  return MeasurementRecordSchema.parse({timestamp:c[0],value:c[1]===''?null:Number(c[1]),qualityFlag:c[2],...(c[3]!==''?{reason:c[3]}:{})});
 });
}
export const MeasurementDatasetSchema=MeasurementManifestSchema.extend({records:z.array(MeasurementRecordSchema).min(1).max(17568),importTrace:z.object({schemaVersion:z.literal('measurement-csv-receipt-v1'),rawCsv:z.string().max(2*1024*1024),rawCsvSha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict().optional()}).superRefine((d,ctx)=>{
 const fail=(message:string)=>ctx.addIssue({code:'custom',message});
 const temperature=d.modelPoint==='reference_cell_temperature';
 if(temperature ? d.unit!=='degC' : d.unit==='degC')fail('Model point and unit differ; only W/kW power or degC cell temperature');
 const times=d.records.map(r=>Date.parse(r.timestamp)),step=d.intervalMinutes*60000;
 if(times.slice(1).some((t,i)=>t<=times[i]||(t-times[i])%step!==0))fail('Measurements require ordered unique timestamps on one interval grid; no fill');
 if(times.at(-1)!-times[0]+step>366*86400000||new Date(times[0]-step).getUTCFullYear()<1900||new Date(times.at(-1)!).getUTCFullYear()>2200)fail('Supported measurement period: 1900..2200, at most 366 days');
 for(const r of d.records)if(r.value!==null){const n=r.value*(d.unit==='kW'?1000:1);if(Math.abs(n)>1e9||(r.qualityFlag==='valid'&&(temperature ? n< -100||n>150 : d.modelPoint!=='plant_net_grid'&&n<0)))fail('Measurement value outside declared point/unit domain');}
 if(d.importTrace){try{
  if(d.importTrace.rawCsvSha256!==weatherSha256(d.importTrace.rawCsv))throw new Error('Measurement CSV SHA256 mismatch');
  const parsed=parseMeasurementCsv(d.importTrace.rawCsv);
  if(parsed.length!==d.records.length||parsed.some((r,i)=>r.timestamp!==d.records[i].timestamp||r.value!==d.records[i].value||r.qualityFlag!==d.records[i].qualityFlag||r.reason!==d.records[i].reason))throw new Error('Measurement CSV receipt differs from records');
 }catch(e){fail(String(e));}}
});
export type MeasurementDataset=z.infer<typeof MeasurementDatasetSchema>;
export function importMeasurementCsv(manifest:unknown,rawCsv:string):MeasurementDataset{
 return MeasurementDatasetSchema.parse({...MeasurementManifestSchema.parse(manifest),records:parseMeasurementCsv(rawCsv),importTrace:{schemaVersion:'measurement-csv-receipt-v1',rawCsv,rawCsvSha256:weatherSha256(rawCsv)}});
}
export function validateMeasurementContext(datasets:MeasurementDataset[]|undefined,site:{latitude:number;longitude:number},weather:{intervalMinutes:number;records:{timestamp:string}[]}):void{
 if(!datasets||!datasets.length)return;
 if(!weather.records.length||!Number.isInteger(weather.intervalMinutes)||weather.intervalMinutes<1||weather.intervalMinutes>60)throw new Error("Load interval weather before measurement import");
 if(new Set(datasets.map(d=>d.id)).size!==datasets.length)throw new Error('Measurement ids must be unique; no implicit overwrite');
 if(datasets.reduce((n,d)=>n+d.records.length,0)>17568)throw new Error('At most 17568 measurement records total');
 const anchor=Date.parse(weather.records[0].timestamp),step=weather.intervalMinutes*60000;
 for(const d of datasets){
  if(d.siteLatitude!==site.latitude||d.siteLongitude!==site.longitude)throw new Error('Measurement site differs from active study');
  if(d.intervalMinutes!==weather.intervalMinutes||d.records.some(r=>(Date.parse(r.timestamp)-anchor)%step!==0))throw new Error('Measurement interval/grid differs from weather; no shift/resampling');
 }
}
