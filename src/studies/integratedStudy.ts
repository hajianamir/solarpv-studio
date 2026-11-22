// Opt-in stage-55 contract; never widens legacy StudyResult or enables finance.
import {z} from 'zod';
import {StudyRequestSchema, type StudyRequest} from './studyContract';
import {stable} from './studyComparisonGate';
import {validateResult} from './studyWorkflow';
import {weatherSha256} from './declaredWeatherAdapter';
import {parseStudyJson} from './strictStudyJson';
import {canonicalBundleJson} from './studyExchange';
const forbidden=['mpptInputs','inverterBlocks','sandia','acCable','transformer','auxiliaryPowerW','auxiliarySchedule','acAvailability','acExportLimitW','acExportLimitSchedule'] as const;
const hash=z.string().regex(/^[a-f0-9]{64}$/);
const finite=z.number().finite();
const inverterSchema=StudyRequestSchema.shape.system.shape.sandia.unwrap();
export const IntegratedPlanSchema=z.object({schemaVersion:z.literal('integrated-mppt-plan-v1'),source:z.string().min(1).max(500).refine(s=>!!s.trim()),inverter:inverterSchema,
  inputs:z.array(z.object({id:z.string().regex(/^[A-Za-z0-9_-]{1,40}$/),request:StudyRequestSchema}).strict()).min(2).max(4),
}).strict().superRefine((p,ctx)=>{
  const issue=(message:string)=>ctx.addIssue({code:'custom',message});
  // Zod may continue refinements after array-size issues. Do not dereference an empty array.
  if(p.inputs.length<2||p.inputs.length>4)return;
  if(new TextEncoder().encode(JSON.stringify(p)).length>8*1024*1024)issue('Integrated input exceeds 8 MiB');
  if(new Set(p.inputs.map(e=>e.id)).size!==p.inputs.length)issue('Duplicate input id');
  if(p.inputs.reduce((n,e)=>n+e.request.weather.records.length,0)>8784)issue('Integrated budget exceeds 8784 input-intervals');
  const shared=stable({site:p.inputs[0].request.site,weather:p.inputs[0].request.weather});
  for(const {request:r} of p.inputs){
    if(r.measurements||!r.system.electrical||forbidden.some(k=>k in r.system)||r.system.additionalDcLossPct!==0)issue('No nested inverter/plant/measurements/additional DC loss');
    if(stable({site:r.site,weather:r.weather})!==shared)issue('Exact shared site/weather required');
    const check=StudyRequestSchema.safeParse({...r,system:{...r.system,sandia:p.inverter,inverterPdc0W:p.inverter.Pdco}});
    if(!check.success)issue('Invalid input / shared inverter fit window');
  }
});
export type IntegratedPlan=z.infer<typeof IntegratedPlanSchema>;

export function migrateLegacyMppt(value:unknown,inverter:unknown,source:string):IntegratedPlan{
  const r=StudyRequestSchema.parse(value);
  if(!r.system.mpptInputs||r.measurements||forbidden.some(k=>k!=='mpptInputs'&&k in r.system))throw new Error('Migration would discard plant or measurement data');
  return IntegratedPlanSchema.parse({schemaVersion:'integrated-mppt-plan-v1',source,inverter,
    inputs:r.system.mpptInputs.map(entry=>{
      const request:StudyRequest=structuredClone(r);delete request.system.mpptInputs;
      Object.assign(request.system,{surfaceTiltDeg:entry.surfaceTiltDeg,surfaceAzimuthDeg:entry.surfaceAzimuthDeg,arrayPdc0W:entry.arrayPdc0W,electrical:entry.electrical});
      request.parameterProvenance={source:entry.source,quality:entry.quality};
      return {id:entry.id,request};
    })});
}
const Sample=z.object({timestamp:z.string(),dcW:finite.nonnegative(),inverterNetAcW:finite,exportW:finite.nonnegative(),importW:finite.nonnegative()}).strict();
const ResultSchema=z.object({schemaVersion:z.literal('integrated-mppt-result-v1'),algorithmVersion:z.literal('1.0.0'),status:z.literal('completed'),validationStatus:z.literal('not_field_validated'),projectApproval:z.literal('blocked'),
  plan:IntegratedPlanSchema,planCanonicalJson:z.string(),planSha256:hash,workerSha256:hash,requirementsSha256:hash,pvlibVersion:z.literal('0.13.1'),
  budget:z.object({inputIntervals:z.number().int(),childSolves:z.number().int()}).strict(),
  children:z.array(z.object({id:z.string(),result:z.unknown()}).strict()).min(2).max(4),samples:z.array(Sample).min(2).max(4392),
  summary:z.object({dcWh:finite.nonnegative(),exportWh:finite.nonnegative(),importWh:finite.nonnegative(),netWh:finite}).strict(),limitations:z.array(z.string()).min(1),
}).strict();
function numeric(value:unknown):number{if(typeof value!=='number'||!Number.isFinite(value))throw new Error('Finite integrated point required');return value;}
function close(a:number,b:number){if(Math.abs(a-b)>Math.max(1e-5,Math.abs(b)*1e-7))throw new Error('Integrated numerical evidence mismatch');}

export function validateIntegratedResult(value:unknown){
  if(new TextEncoder().encode(JSON.stringify(value)).length>32*1024*1024)throw new Error('Integrated result exceeds 32 MiB');
  const r=ResultSchema.parse(value),p=r.plan;
  if(weatherSha256(r.planCanonicalJson)!==r.planSha256||stable(parseStudyJson(r.planCanonicalJson,8*1024*1024))!==stable(p))throw new Error('Integrated plan receipt mismatch');
  if(r.children.length!==p.inputs.length||r.samples.length!==p.inputs[0].request.weather.records.length)throw new Error('Integrated length mismatch');
  const children=r.children.map((c,i)=>{
    const child=validateResult(c.result);
    if(c.id!==p.inputs[i].id||stable(child.request)!==stable(p.inputs[i].request)||child.manifest.workerSha256!==r.workerSha256||child.manifest.requirementsSha256!==r.requirementsSha256)throw new Error('Integrated child binding mismatch');
    return child;
  });
  if(r.budget.inputIntervals!==r.samples.length*children.length||r.budget.childSolves!==children.length)throw new Error('Integrated budget receipt mismatch');
  const inv=p.inverter;let dcWh=0,exportWh=0,importWh=0;const dt=p.inputs[0].request.weather.intervalMinutes/60;
  r.samples.forEach((s,i)=>{
    if(s.timestamp!==p.inputs[0].request.weather.records[i].timestamp)throw new Error('Integrated timestamp mismatch');
    const points=children.map(c=>({p:numeric(c.samples[i].dcW),v:numeric(c.samples[i].operatingVoltageV)}));
    for(const x of points)if(x.p>0&&(x.v<inv.modelMinDcV-1e-7||x.v>inv.modelMaxDcV+1e-7))throw new Error('Integrated voltage outside fitted domain');
    const total=points.reduce((n,x)=>n+x.p,0);close(s.dcW,total);
    if(total>inv.modelMaxDcPowerW)throw new Error('Integrated power outside fitted domain');
    let net=-inv.Pnt;
    if(total>=inv.Pso){
      net=0;
      for(const x of points){
        if(x.p===0)continue;
        if(!Number.isFinite(x.v)||x.v<inv.modelMinDcV-1e-7||x.v>inv.modelMaxDcV+1e-7)throw new Error('Integrated voltage outside fitted domain');
        // Independent JS expression of the published power-weighted extension.
        const delta=x.v-inv.Vdco,A=inv.Pdco*(1+inv.C1*delta),B=inv.Pso*(1+inv.C2*delta),C=inv.C0*(1+inv.C3*delta);
        net+=x.p/total*((inv.Paco/(A-B)-C*(A-B))*(total-B)+C*(total-B)**2);
      }
      net=Math.min(inv.Paco,net);
    }
    if(!Number.isFinite(net)||net>total+Math.max(1e-6,total*1e-7))throw new Error('Integrated nonphysical AC');
    close(s.inverterNetAcW,net);close(s.exportW,Math.max(0,net));close(s.importW,Math.max(0,-net));
    dcWh+=total*dt;exportWh+=Math.max(0,net)*dt;importWh+=Math.max(0,-net)*dt;
  });
  close(r.summary.dcWh,dcWh);close(r.summary.exportWh,exportWh);close(r.summary.importWh,importWh);close(r.summary.netWh,exportWh-importWh);
  return r;
}

const ArchiveSchema=z.object({schemaVersion:z.literal('integrated-mppt-archive-v1'),checksumFormat:z.literal('sorted-key-json-sha256-v1'),resultSha256:hash,result:z.unknown()}).strict();
export function makeIntegratedArchive(value:unknown){
  const result=validateIntegratedResult(value);
  const archive={schemaVersion:'integrated-mppt-archive-v1' as const,checksumFormat:'sorted-key-json-sha256-v1' as const,resultSha256:weatherSha256(canonicalBundleJson(result)),result};
  if(new TextEncoder().encode(JSON.stringify(archive)).length>32*1024*1024)throw new Error('Integrated archive exceeds 32 MiB');
  return archive;
}
export function restoreIntegratedArchive(raw:string){
  const archive=ArchiveSchema.parse(parseStudyJson(raw,32*1024*1024,'Integrated archive'));
  if(weatherSha256(canonicalBundleJson(archive.result))!==archive.resultSha256)throw new Error('Integrated archive checksum mismatch');
  return validateIntegratedResult(archive.result);
}
