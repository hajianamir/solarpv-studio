import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import express, {type Request} from 'express';
import {StudyRequestSchema, type StudyRequest, type StudyResult} from '../studies/studyContract';
import {createClientRateLimiter} from './clientRateLimit';

export class StudyError extends Error {
  constructor(public readonly code:string,public readonly status:number,message:string){super(message);}
}
interface ExecutorOptions {python?:string;script?:string;timeoutMs?:number;maxConcurrent?:number;maxOutputBytes?:number}
/** Bounded per-process execution, no shell, no dynamic script or dependency installation. */
export class StudyExecutor {
  private active=0;
  constructor(private options:ExecutorOptions={}){}
  get activeCount(){return this.active;}
  async run(request:StudyRequest,signal?:AbortSignal):Promise<StudyResult> {
    if(signal?.aborted)throw new StudyError('CANCELLED',499,'Study cancelled');
    if(this.active >= (this.options.maxConcurrent??1))throw new StudyError('BUSY',429,'Study capacity reached; retry later');
    this.active++;
    const startedAt=new Date().toISOString();
    const runId=randomUUID();
    try {
      return await new Promise<StudyResult>((resolve,reject)=>{
        const script=this.options.script??path.resolve('services/pvlib_study/worker.py');
        const env:NodeJS.ProcessEnv={PYTHONNOUSERSITE:'1',PYTHONDONTWRITEBYTECODE:'1',OPENBLAS_NUM_THREADS:'1',OMP_NUM_THREADS:'1',MKL_NUM_THREADS:'1'};
        for(const key of ['PATH','SYSTEMROOT','SystemRoot','WINDIR','TEMP','TMP','HOME'])if(process.env[key])env[key]=process.env[key];
        const child=spawn(this.options.python??process.env.PVLIB_PYTHON??(process.platform==='win32'?'python':'python3'),['-I','-B',script],{env,windowsHide:true,stdio:['pipe','pipe','pipe']});
        let output=Buffer.alloc(0),failure:StudyError|undefined,settled=false;
        const stop=(error:StudyError)=>{failure??=error;child.kill('SIGKILL');};
        const abort=()=>stop(new StudyError('CANCELLED',499,'Study cancelled; no fallback applied'));
        const timer=setTimeout(()=>stop(new StudyError('TIMEOUT',504,'Study time limit exceeded; no fallback applied')),this.options.timeoutMs??45000);
        const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);};
        signal?.addEventListener('abort',abort,{once:true});
        if(signal?.aborted)abort();
        child.stdin.on('error',()=>{}); // EPIPE on failed start/termination is handled by close/error below.
        child.stderr.on('data',()=>{}); // Drain, never expose environment paths or retain unbounded stderr.
        child.stdout.on('data',(chunk:Buffer)=>{
          if(failure)return;
          if(output.length+chunk.length>(this.options.maxOutputBytes??16*1024*1024))return stop(new StudyError('OUTPUT_LIMIT',502,'Study output limit exceeded'));
          output=Buffer.concat([output,chunk]);
        });
        child.once('error',()=>{if(settled)return;settled=true;cleanup();reject(new StudyError('UNAVAILABLE',503,'Python study runtime unavailable; install pinned requirements and configure PVLIB_PYTHON'));});
        child.once('close',(code)=>{
          if(settled)return;settled=true;cleanup();
          if(failure)return reject(failure);
          try{
            const parsed=JSON.parse(output.toString('utf8')) as StudyResult&{message?:string};
            if(code===2)return reject(new StudyError('INVALID_INPUT',422,parsed.message??'Study input rejected'));
            if(code===3)return reject(new StudyError('UNAVAILABLE',503,'Pinned Python study dependencies unavailable or incompatible'));
            if(code!==0||parsed.status!=='completed'||parsed.engine!=='pvlib-python-direct'||parsed.schemaVersion!=='pvlib-study-result-v1')throw new Error('Invalid worker output');
            parsed.execution={runId,startedAt,finishedAt:new Date().toISOString()};
            resolve(parsed);
          }catch{reject(new StudyError('WORKER_FAILED',502,'Python study failed; no screening fallback applied'));}
        });
        child.stdin.end(JSON.stringify(request));
      });
    } finally {this.active--;}
  }
}

interface Identity {userId?:string;authError?:string}
export function createStudyRouter(options:{resolveIdentity:(req:Request)=>Identity;production:()=>boolean;configuredAuth:()=>boolean;executor?:StudyExecutor}) {
  const router=express.Router();
  const executor=options.executor??new StudyExecutor();
  router.get('/capabilities',(_req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.json({engine:'pvlib-python-direct',schemaVersion:'pvlib-study-v1',enabled:process.env.PVLIB_STUDY_ENABLED==='true',runtimeStatus:'not_probed',pvlibVersion:'0.13.1',maxRecords:17568,maxBytes:8*1024*1024,mode:'fixed_tilt_or_single_axis',defaultMode:'fixed_tilt_monofacial',supportedModes:['fixed_tilt_monofacial','single_axis_monofacial','fixed_tilt_row_optics','single_axis_row_optics'],engineVersion:'1.10.0',dcCableCapabilities:['uniform_strings_shared_home_run_explicit_loop_ohms'],maxThermalRecords:8784,thermalCapabilities:['sapm','faiman','pvsyst_explicit_10m_coefficients','explicit_cell_temperature_schedule'],environmentCapabilities:['beam_only_horizon_isolated_plane','explicit_front_rear_soiling','interval_albedo'],maxEnvironmentRecords:8784,acPlantCapabilities:['quadratic_transformer','constant_lv_auxiliary','explicit_interval_availability'],maxAcPlantRecords:8784,supportedSkyDiffuseModels:['haydavies','perez_isolated_plane_only'],supportedBeamIamModels:['ashrae','physical_single_glazing'],supportedSpectralModels:['unity','sapm_airmass'],maxSpectralRecords:8784,supportedAcModels:['pvwatts','sandia_voltage_dependent'],supportedTemperatureModels:['sapm_cell','faiman','pvsyst_cell_explicit_10m','explicit_cell_temperature_schedule'],supportsConstantAcExportLimit:true,supportedDcModels:['pvwatts_dc','desoto_singlediode'],maxDetailedElectricalRecords:8784,supportedOptics:['isolated_plane','infinite_sheds_haydavies'],maxRowRecords:8784,validationStatus:'not_field_validated'});
  });
  router.post('/run',createClientRateLimiter({windowMs:60000,maxRequests:6}), (req,res,next)=>{
    res.setHeader('Cache-Control','no-store');
    if(process.env.PVLIB_STUDY_ENABLED!=='true')return res.status(503).json({code:'DISABLED',message:'Direct pvlib study engine is disabled; screening remains separate'});
    const identity=options.resolveIdentity(req);
    if(identity.authError||((options.production()||options.configuredAuth())&&!identity.userId))return res.status(401).json({code:'AUTH_REQUIRED',message:'Authenticated study access required'});
    next();
  },express.json({limit:'8mb',strict:true}),async(req,res)=>{
    const checked=StudyRequestSchema.safeParse(req.body);
    if(!checked.success)return res.status(400).json({code:'INVALID_INPUT',message:'Study contract rejected; no fallback applied',issues:checked.error.issues.slice(0,20).map(issue=>({path:issue.path,message:issue.message}))});
    const controller=new AbortController();
    const disconnected=()=>{if(!res.writableEnded)controller.abort();};
    res.once('close',disconnected);
    try{const result=await executor.run(checked.data,controller.signal);if(!res.destroyed)res.json(result);}
    catch(error){if(!res.destroyed){const known=error instanceof StudyError?error:new StudyError('FAILED',500,'Study failed');if(known.status===429)res.setHeader('Retry-After','2');res.status(known.status).json({code:known.code,message:known.message});}}
    finally{res.off('close',disconnected);}
  });
  router.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
    const status=(error as {status?:number})?.status;
    res.status(status===413?413:400).json({code:status===413?'PAYLOAD_TOO_LARGE':'INVALID_JSON',message:'Study request body rejected'});
  });
  return router;
}
