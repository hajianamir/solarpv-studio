import {z} from 'zod';
import {studyTimestamp} from './studyTime';
import {parseStudyJson} from './strictStudyJson';
import {uqHash} from './financialUqArchive';
const text=z.string().trim().min(1).max(200);
const hash=z.string().regex(/^[a-f0-9]{64}$/);
export const ExternalContextSchema=z.object({projectId:text,assetId:text,projectRevisionSha256:hash,latitude:z.number().finite().min(-90).max(90),longitude:z.number().finite().min(-180).max(180),boundary:z.enum(['array_dc','inverter_ac','poi'])}).strict();
export const ExternalSeriesSchema=z.object({schemaVersion:z.literal('external-series-v1'),kind:z.enum(['external_generation','scada']),origin:z.enum(['pv','wind','grid','hybrid','meter']),source:text,sourceVersion:text,quality:z.enum(['measured','assumed','user_configured']),context:ExternalContextSchema,timezone:z.string().min(1).max(100),intervalMinutes:z.number().int().min(1).max(60),timestampConvention:z.literal('interval_end'),statistic:z.literal('interval_mean'),unit:z.enum(['W','kW']),powerConvention:z.literal('positive_export_negative_import'),records:z.array(z.object({timestamp:studyTimestamp,value:z.number().finite().min(-1e9).max(1e9).nullable(),quality:z.enum(['valid','missing','excluded']),reason:text.optional()}).strict()).min(1).max(17568)}).strict().superRefine((d,c)=>{
 const fail=(message:string)=>c.addIssue({code:'custom',message});
 try{new Intl.DateTimeFormat('en',{timeZone:d.timezone});}catch{fail('Unknown IANA timezone');}
 if(d.kind==='external_generation'&&(d.origin==='meter'||d.origin==='grid'))fail('Grid import is SCADA, not generated renewable energy');
 const step=d.intervalMinutes*60000,times=d.records.map(r=>Date.parse(r.timestamp));
 if(times.slice(1).some((t,i)=>t<=times[i]||(t-times[i])%step!==0))fail('Ordered unique instants on one interval grid required');
 if(times.at(-1)!-times[0]+step>366*86400000)fail('Maximum 366 days');
 const formatter=new Intl.DateTimeFormat('sv-SE',{timeZone:(()=>{try{new Intl.DateTimeFormat('en',{timeZone:d.timezone});return d.timezone;}catch{return 'UTC';}})(),year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 for(const [i,r] of d.records.entries()){
  if((r.quality==='missing')!==(r.value===null)||r.quality!=='valid'&&!r.reason)fail('Explicit missing/excluded reason required; missing is not zero');
  if(r.value!==null&&(Math.abs(r.value*(d.unit==='kW'?1000:1))>1e9||d.kind==='external_generation'&&r.value<0))fail('Power domain exceeded');
  // Offset must agree with declared timezone at that instant; no implicit DST repair.
   if(!Number.isFinite(times[i])){fail('Invalid timestamp instant');continue;}
  const parts=Object.fromEntries(formatter.formatToParts(new Date(times[i])).map(p=>[p.type,p.value]));
  const local=`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
  if(local!==r.timestamp.slice(0,19))fail('Timestamp offset disagrees with declared timezone');
 }
});
export const ExternalTargetSchema=z.object({context:ExternalContextSchema,startUtc:studyTimestamp,endUtc:studyTimestamp,intervalMinutes:z.number().int().min(1).max(60)}).strict().superRefine((t,c)=>{const duration=Date.parse(t.endUtc)-Date.parse(t.startUtc),step=t.intervalMinutes*60000;if(duration<=0||duration>366*86400000||duration%step!==0||duration/step>17568)c.addIssue({code:'custom',message:'Bounded exact target interval grid required'});});
export type ExternalSeries=z.infer<typeof ExternalSeriesSchema>;
export type ExternalTarget=z.infer<typeof ExternalTargetSchema>;
export const MAX_EXTERNAL_BYTES=4*1024*1024;
export function readExternalSeries(text:string){return ExternalSeriesSchema.parse(parseStudyJson(text,MAX_EXTERNAL_BYTES,'External series'));}
/** Verification only. No conversion to operational energy, no project/finance setters. */
export function reviewExternalSeries(input:unknown,targetInput:unknown,enabled=false){
 if(!enabled)throw new Error('EXTERNAL_DATA_DISABLED');
 const d=ExternalSeriesSchema.parse(input),target=ExternalTargetSchema.parse(targetInput);
 const step=target.intervalMinutes*60000,start=Date.parse(target.startUtc),end=Date.parse(target.endUtc);
 const contextMatches=uqHash(d.context)===uqHash(target.context),intervalMatches=d.intervalMinutes===target.intervalMinutes;
 const map=new Map(d.records.map(r=>[Date.parse(r.timestamp),r]));
 let valid=0,missing=0,excluded=0,absent=0,energyWh=0;
 for(let t=start+step;t<=end;t+=step){const r=map.get(t);if(!r){absent++;continue;}if(r.quality==='missing'){missing++;continue;}if(r.quality==='excluded'){excluded++;continue;}valid++;energyWh+=r.value!*(d.unit==='kW'?1000:1)*target.intervalMinutes/60;}
 const outside=d.records.filter(r=>Date.parse(r.timestamp)<=start||Date.parse(r.timestamp)>end).length;
 const complete=contextMatches&&intervalMatches&&!missing&&!excluded&&!absent&&!outside;
 return {schemaVersion:'external-series-review-v1' as const,inputSha256:uqHash(d),targetSha256:uqHash(target),status:!contextMatches?'context_mismatch':!intervalMatches?'interval_mismatch':complete?'verified_for_comparison':'incomplete_coverage',coverage:{valid,missing,excluded,absent,outside,expected:(end-start)/step},comparisonEnergyWh:complete?energyWh:null,precision:'Interval-mean rectangle integration only; no interpolation, calibration or inferred accuracy.',provenance:{source:d.source,sourceVersion:d.sourceVersion,quality:d.quality,origin:d.origin,timezone:d.timezone},researchGate:{status:'blocked' as const,reason:'Data verification is not a registered research-to-energy adoption gate'},financeMutation:false,energyAdoption:false,validationStatus:'not_field_validated' as const};
}
