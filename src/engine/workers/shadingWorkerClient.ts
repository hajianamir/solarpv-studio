import {
  simulateAnnual3dShadingCooperative,
  type Scene3DState,
  type ShadingSimulationOptions,
  type AnnualShading3dResult,
} from '../roof3dShadingEngine';
import type { WorkerShadingResponse } from './shadingWorker';

export interface AsyncShadingSimulationOptions extends ShadingSimulationOptions {
  abortSignal?: AbortSignal;
  onProgress?: (progressPct: number, currentDay: number, totalDays: number) => void;
}
let activeJobs=0;
const MAX_JOBS=2;
/** Each accepted job owns its Worker. Hard cancellation cannot strand another
 * job's Promise. Unsupported environments use the same numerical generator
 * cooperatively; this fallback is responsive but is not CPU offloading.
 */
export async function runAnnualShadingSimulationAsync(
  scene: Scene3DState, peakSunHours=5.2, ambientTempMaxC=40,
  options?: AsyncShadingSimulationOptions,
): Promise<AnnualShading3dResult> {
  if(options?.abortSignal?.aborted)throw new Error('Simulation cancelled by user');
  if(activeJobs>=MAX_JOBS)throw new Error('Shading simulation capacity reached; retry after a running job finishes');
  activeJobs++;
  let worker:Worker|null=null;
  try {
    if(typeof window!=='undefined'&&typeof Worker!=='undefined'){
      try{worker=new Worker(new URL('./shadingWorker.ts',import.meta.url),{type:'module'});}catch{/* Cooperative fallback below. */}
    }
    if(!worker)return await simulateAnnual3dShadingCooperative(scene,peakSunHours,ambientTempMaxC,options);
    const owned=worker;
    const id=`job_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    return await new Promise<AnnualShading3dResult>((resolve,reject)=>{
      let settled=false;
      const cleanup=()=>{
        options?.abortSignal?.removeEventListener('abort',onAbort);
        owned.removeEventListener('message',onMessage);
        owned.removeEventListener('error',onError);
        owned.removeEventListener('messageerror',onMessageError);
      };
      const finish=(error?:Error,result?:AnnualShading3dResult)=>{
        if(settled)return;settled=true;cleanup();
        if(error)reject(error);else resolve(result!);
      };
      const onAbort=()=>finish(new Error('Simulation cancelled by user'));
      const onError=()=>finish(new Error('Shading Worker failed'));
      const onMessageError=()=>finish(new Error('Shading Worker response could not be decoded'));
      const onMessage=(event:MessageEvent<WorkerShadingResponse>)=>{
        const msg=event.data;if(!msg||msg.id!==id)return;
        try {
          if(msg.type==='progress')options?.onProgress?.(msg.progressPct,msg.currentDay,msg.totalDays);
          else if(msg.type==='complete')finish(undefined,msg.result);
          else if(msg.type==='aborted')onAbort();
          else if(msg.type==='error')finish(new Error(msg.error));
        }catch(error){finish(error instanceof Error?error:new Error(String(error)));}
      };
      owned.addEventListener('message',onMessage);
      owned.addEventListener('error',onError);
      owned.addEventListener('messageerror',onMessageError);
      options?.abortSignal?.addEventListener('abort',onAbort,{once:true});
      if(options?.abortSignal?.aborted){onAbort();return;}
      try{owned.postMessage({id,type:'simulate',scene,peakSunHours,ambientTempMaxC,
        options:{simulationMode:options?.simulationMode,stepDays:options?.stepDays,albedo:options?.albedo}});}
      catch(error){finish(error instanceof Error?error:new Error(String(error)));}
    });
  } finally {
    try{worker?.terminate();}finally{activeJobs--;}
  }
}
