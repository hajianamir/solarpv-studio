import {z} from 'zod';
const finite = (min:number,max:number) => z.number().finite().min(min).max(max);
const provenance = z.object({source:z.string().min(1).max(500).refine(value=>Boolean(value.trim()),'Nonblank source required'),quality:z.enum(['measured','weather_provider','user_configured','assumed'])}).strict();
const timestamp = z.string().regex(/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/).refine(value=>{
  const day = new Date(`${value.slice(0,10)}T00:00:00Z`);
  return Number.isFinite(Date.parse(value)) && Number.isFinite(day.getTime()) && day.toISOString().slice(0,10)===value.slice(0,10);
},'Valid calendar timestamp and explicit UTC offset required');
export const StudyRequestSchema = z.object({
  schemaVersion:z.literal('pvlib-study-v1'),label:z.string().min(1).max(200).refine(value=>Boolean(value.trim()),'Nonblank label required'),
  site:z.object({latitude:finite(-90,90),longitude:finite(-180,180),altitudeM:finite(-500,9000),timezone:z.string().min(1).max(100).refine(value=>{try{new Intl.DateTimeFormat('en',{timeZone:value});return true;}catch{return false;}},'IANA timezone required')}).strict(),
  system:z.object({surfaceTiltDeg:finite(0,90),surfaceAzimuthDeg:finite(0,360),albedo:finite(0,1),arrayPdc0W:finite(1,1e9),gammaPdcPerC:finite(-.01,0),inverterPdc0W:finite(1,1e9),inverterEtaNom:finite(.8,.995),inverterEtaRef:z.literal(.9637),iamB:finite(0,1),additionalDcLossPct:finite(0,100),temperature:z.object({a:finite(-10,0),b:finite(-1,0),deltaT:finite(0,20)}).strict()}).strict(),
  weather:provenance.extend({windHeightM:z.literal(10),timestampConvention:z.literal('interval_end'),intervalMinutes:z.number().int().min(1).max(60),records:z.array(z.object({timestamp,ghiWm2:finite(0,2000),dniWm2:finite(0,2000),dhiWm2:finite(0,2000),tempAirC:finite(-90,70),windSpeedMs:finite(0,75)}).strict()).min(2).max(17568)}).strict(),
  parameterProvenance:provenance,
}).strict().superRefine((request,ctx)=>{
  if(request.system.arrayPdc0W/request.system.inverterPdc0W>2)ctx.addIssue({code:'custom',path:['system','inverterPdc0W'],message:'Supported array DC / inverter DC limit ratio <= 2'});
  const times=request.weather.records.map(row=>Date.parse(row.timestamp));
  if(times.slice(1).some((time,i)=>time-times[i]!==request.weather.intervalMinutes*60000))ctx.addIssue({code:'custom',path:['weather','records'],message:'Regular ordered timestamps without gaps required'});
  if(new Date(times[0]-request.weather.intervalMinutes*60000).getUTCFullYear()<1900 || new Date(times.at(-1)!).getUTCFullYear()>2200 || times.at(-1)!-times[0]+request.weather.intervalMinutes*60000>366*86400000)ctx.addIssue({code:'custom',path:['weather','records'],message:'Supported period 1900..2200, at most 366 days'});
});
export type StudyRequest = z.infer<typeof StudyRequestSchema>;
export interface StudyResult {
  schemaVersion:'pvlib-study-result-v1';status:'completed';engine:'pvlib-python-direct';
  manifest:{engineVersion:string;models:Record<string,string>;validationStatus:'not_field_validated';inputSha256:string;workerSha256:string;requirementsSha256:string;python:string;platform:string;dependencies:Record<string,string>;period:{startUtc:string;endUtc:string;intervalMinutes:number;intervalCount:number;completeUtcCalendarYear:boolean;monthlyAllocation:string};units:Record<string,string>;limitations:string[];warnings:string[]};
  request:StudyRequest;summary:{dcBeforeAdditionalLossWh:number;dcWh:number;acWh:number};
  monthly:{month:string;dcBeforeAdditionalLossWh:number;dcWh:number;acWh:number}[];
  samples:({timestamp:string;midpointUtc:string}&Record<string,string|number>)[];
  execution?:{runId:string;startedAt:string;finishedAt:string};
}
