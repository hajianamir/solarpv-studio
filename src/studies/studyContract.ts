import {z} from 'zod';
const finite = (min:number,max:number) => z.number().finite().min(min).max(max);
const provenance = z.object({source:z.string().min(1).max(500).refine(value=>Boolean(value.trim()),'Nonblank source required'),quality:z.enum(['measured','weather_provider','user_configured','assumed'])}).strict();
const timestamp = z.string().regex(/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/).refine(value=>{
  const day = new Date(`${value.slice(0,10)}T00:00:00Z`);
  return Number.isFinite(Date.parse(value)) && Number.isFinite(day.getTime()) && day.toISOString().slice(0,10)===value.slice(0,10);
},'Valid calendar timestamp and explicit UTC offset required');
const electricalSchema=z.object({
 alphaScAperC:finite(-.05,.05),aRefV:finite(.1,10),iLRefA:finite(.01,30),iORefA:finite(1e-15,.01),rShRefOhm:finite(1,1e6),rSOhm:finite(0,10),egRefEv:finite(.5,2.5),dEgdTPerK:finite(-.002,0),
 modulesPerString:z.number().int().min(1).max(1000),stringsInParallel:z.number().int().min(1).max(100000),mpptMinV:finite(1,3000),mpptMaxV:finite(1,3000),maxDcV:finite(1,3000),maxInputCurrentA:finite(.1,1e7),designMinCellTemperatureC:finite(-90,25),designMaxEffectiveIrradianceWm2:finite(1000,2500)
}).strict();
export const StudyRequestSchema = z.object({
  schemaVersion:z.literal('pvlib-study-v1'),label:z.string().min(1).max(200).refine(value=>Boolean(value.trim()),'Nonblank label required'),
  site:z.object({latitude:finite(-90,90),longitude:finite(-180,180),altitudeM:finite(-500,9000),timezone:z.string().min(1).max(100).refine(value=>{try{new Intl.DateTimeFormat('en',{timeZone:value});return true;}catch{return false;}},'IANA timezone required')}).strict(),
  system:z.object({surfaceTiltDeg:finite(0,90),surfaceAzimuthDeg:finite(0,360),albedo:finite(0,1),arrayPdc0W:finite(1,1e9),gammaPdcPerC:finite(-.01,0),inverterPdc0W:finite(1,1e9),inverterEtaNom:finite(.8,.995),inverterEtaRef:z.literal(.9637),iamB:finite(0,1),additionalDcLossPct:finite(0,100),temperature:z.object({a:finite(-10,0),b:finite(-1,0),deltaT:finite(0,20)}).strict(),tracking:z.object({axisTiltDeg:finite(0,90),axisAzimuthDeg:finite(0,360),maxAngleDeg:finite(0,90),backtrack:z.boolean(),gcr:finite(.01,1),crossAxisTiltDeg:finite(-30,30)}).strict().optional(),rowIrradiance:z.object({gcr:finite(.01,1),heightM:finite(.1,100),pitchM:finite(.1,100),bifaciality:finite(0,1),rearShadeLossPct:finite(0,100),rearTransmissionLossPct:finite(0,100),rearIamB:finite(0,1),temperatureIrradiance:z.enum(['front_only','front_plus_rear'])}).strict().optional(),faiman:z.object({u0:finite(.1,200),u1:finite(0,100),windHeightM:z.literal(10)}).strict().optional(),acExportLimitW:finite(0,1e9).optional(),sandia:z.object({Paco:finite(1,1e9),Pdco:finite(1,1e9),Vdco:finite(1,3000),Pso:finite(.001,1e8),C0:finite(-1,1),C1:finite(-.1,.1),C2:finite(-.1,.1),C3:finite(-.1,.1),Pnt:finite(0,1e7),modelMinDcV:finite(1,3000),modelMaxDcV:finite(1,3000),modelMaxDcPowerW:finite(1,1e9)}).strict().optional(),electrical:electricalSchema.optional()}).strict(),
  weather:provenance.extend({windHeightM:z.literal(10),timestampConvention:z.literal('interval_end'),intervalMinutes:z.number().int().min(1).max(60),records:z.array(z.object({timestamp,ghiWm2:finite(0,2000),dniWm2:finite(0,2000),dhiWm2:finite(0,2000),tempAirC:finite(-90,70),windSpeedMs:finite(0,75)}).strict()).min(2).max(17568)}).strict(),
  parameterProvenance:provenance,
}).strict().superRefine((request,ctx)=>{
  if(request.system.arrayPdc0W/request.system.inverterPdc0W>2)ctx.addIssue({code:'custom',path:['system','inverterPdc0W'],message:'Supported array DC / inverter DC limit ratio <= 2'});
  const inv=request.system.sandia,sys=request.system;
  if(inv){
    const issue=(message:string)=>ctx.addIssue({code:'custom',path:['system','sandia'],message});
    if(!sys.electrical||sys.additionalDcLossPct!==0)issue('Sandia requires electrical and additionalDcLossPct=0');
    if(inv.Pdco!==sys.inverterPdc0W||inv.Pdco<inv.Paco||inv.Pdco<=inv.Pso||inv.modelMaxDcPowerW<inv.Pdco)issue('Require inverterPdc0W=Pdco>=Paco, Pdco>Pso and modelMaxDcPowerW>=Pdco');
    if(!(inv.modelMinDcV<=inv.Vdco&&inv.Vdco<=inv.modelMaxDcV)|| (sys.electrical&&!(inv.modelMinDcV<=sys.electrical.mpptMinV&&sys.electrical.mpptMaxV<=inv.modelMaxDcV)))issue('Sandia reference/MPPT outside fitted voltage domain');
    for(const v of [inv.modelMinDcV,inv.modelMaxDcV]){const a=inv.Pdco*(1+inv.C1*(v-inv.Vdco)),b=inv.Pso*(1+inv.C2*(v-inv.Vdco));if(b<0||a-b<=1e-6)issue('Sandia requires A>B>=0 over voltage domain');}
  }
  const electrical=request.system.electrical;
  if(electrical){
    if(!(electrical.mpptMinV<electrical.mpptMaxV&&electrical.mpptMaxV<=electrical.maxDcV))ctx.addIssue({code:'custom',path:['system','electrical'],message:'Require mpptMinV < mpptMaxV <= maxDcV'});
    if(request.weather.records.length>8784)ctx.addIssue({code:'custom',path:['weather','records'],message:'Detailed electrical mode supports at most 8784 records'});
  }
  const rows=request.system.rowIrradiance,tracking=request.system.tracking;
  if(rows){
    const issue=(message:string)=>ctx.addIssue({code:'custom',path:['system','rowIrradiance'],message});
    if(rows.heightM/rows.pitchM>2)issue('Row center height/pitch must be <=2 for bounded computation');
    if(tracking&&(tracking.axisTiltDeg!==0||tracking.crossAxisTiltDeg!==0))issue('Infinite sheds requires horizontal axes on level terrain');
    if(tracking&&Math.abs(tracking.gcr-rows.gcr)>1e-9)issue('Tracker and row irradiance GCR must match');
    const maximumTilt=tracking?tracking.maxAngleDeg:request.system.surfaceTiltDeg;
    if(rows.heightM<=.5*rows.gcr*rows.pitchM*Math.sin(maximumTilt*Math.PI/180))issue('Row edge would touch/intersect ground at supported tilt');
    if(request.weather.records.length>8784)issue('Row irradiance mode supports at most 8784 records');
  }
  const times=request.weather.records.map(row=>Date.parse(row.timestamp));
  if(times.slice(1).some((time,i)=>time-times[i]!==request.weather.intervalMinutes*60000))ctx.addIssue({code:'custom',path:['weather','records'],message:'Regular ordered timestamps without gaps required'});
  if(new Date(times[0]-request.weather.intervalMinutes*60000).getUTCFullYear()<1900 || new Date(times.at(-1)!).getUTCFullYear()>2200 || times.at(-1)!-times[0]+request.weather.intervalMinutes*60000>366*86400000)ctx.addIssue({code:'custom',path:['weather','records'],message:'Supported period 1900..2200, at most 366 days'});
});
export type StudyRequest = z.infer<typeof StudyRequestSchema>;
export interface StudyResult {
  schemaVersion:'pvlib-study-result-v1';status:'completed';engine:'pvlib-python-direct';
  manifest:{electricalChecks?:Record<string,number>;engineVersion:string;models:Record<string,string>;validationStatus:'not_field_validated';inputSha256:string;workerSha256:string;requirementsSha256:string;python:string;platform:string;dependencies:Record<string,string>;period:{startUtc:string;endUtc:string;intervalMinutes:number;intervalCount:number;completeUtcCalendarYear:boolean;monthlyAllocation:string};units:Record<string,string>;limitations:string[];warnings:string[]};
  request:StudyRequest;summary:{dcBeforeAdditionalLossWh:number;dcWh:number;acWh:number;inverterSelfConsumptionWh?:number;netGridWh?:number;acBeforeExportLimitWh?:number;acExportLimitLossWh?:number;frontIncidentWhm2?:number;rearIncidentWhm2?:number;rearEffectiveWhm2?:number;availableMppWh?:number;mpptConstraintLossWh?:number};
  monthly:{month:string;dcBeforeAdditionalLossWh:number;dcWh:number;acWh:number;inverterSelfConsumptionWh?:number;netGridWh?:number;acBeforeExportLimitWh?:number;acExportLimitLossWh?:number;frontIncidentWhm2?:number;rearIncidentWhm2?:number;rearEffectiveWhm2?:number;availableMppWh?:number;mpptConstraintLossWh?:number}[];
  samples:({timestamp:string;midpointUtc:string}&Record<string,string|number>)[];
  execution?:{runId:string;startedAt:string;finishedAt:string};
}
