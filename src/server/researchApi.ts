import {spawn} from 'node:child_process';
import {terminateProcessTree} from './terminateProcessTree';
import path from 'node:path';
import express,{type Request} from 'express';
import {ResearchRequestSchema,validateResearchResponse,type ResearchRequest} from '../studies/researchApi';
import {StudyError} from './pvlibStudy';
import {createClientRateLimiter} from './clientRateLimit';
export class ResearchExecutor{
 private active=0;
 constructor(private options:{python?:string;script?:string;timeoutMs?:number;maxOutputBytes?:number}={}){}
 get activeCount(){return this.active;}
 async run(request:ResearchRequest,signal?:AbortSignal):Promise<unknown>{
  if(signal?.aborted)throw new StudyError('CANCELLED',499,'Research cancelled');
  if(this.active)throw new StudyError('BUSY',429,'Research capacity reached');
  this.active++;
  try{return await new Promise((resolve,reject)=>{
   const env:NodeJS.ProcessEnv={PYTHONNOUSERSITE:'1',PYTHONDONTWRITEBYTECODE:'1',OPENBLAS_NUM_THREADS:'1',OMP_NUM_THREADS:'1',MKL_NUM_THREADS:'1'};
   for(const k of ['PATH','SYSTEMROOT','SystemRoot','WINDIR','TEMP','TMP','HOME'])if(process.env[k])env[k]=process.env[k];
   const child=spawn(this.options.python??process.env.PVLIB_PYTHON??(process.platform==='win32'?'python':'python3'),['-I','-B',this.options.script??path.resolve('services/pvlib_research/api_worker.py')],{env,detached:process.platform!=='win32',shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});
   let failure:StudyError|undefined,output=Buffer.alloc(0);
   const stop=(e:StudyError)=>{if(failure)return;failure=e;
    terminateProcessTree(child);
   };
   const abort=()=>stop(new StudyError('CANCELLED',499,'Research cancelled; no fallback'));
   const timer=setTimeout(()=>stop(new StudyError('TIMEOUT',504,'Research time budget exceeded')),this.options.timeoutMs??120000);
   signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
   const clean=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);};
   child.stdin.on('error',()=>{});child.stderr.on('data',()=>{});
   child.stdout.on('data',(chunk:Buffer)=>{if(failure)return;if(output.length+chunk.length>(this.options.maxOutputBytes??32*1024*1024))return stop(new StudyError('OUTPUT_LIMIT',502,'Research output budget exceeded'));output=Buffer.concat([output,chunk]);});
   child.once('error',()=>{clean();reject(new StudyError('UNAVAILABLE',503,'Research runtime unavailable'));});
   child.once('close',code=>{clean();if(failure)return reject(failure);if(code===2)return reject(new StudyError('INVALID_INPUT',422,'Research domain rejected'));
    if(code!==0)return reject(new StudyError('WORKER_FAILED',502,'Research failed; no fallback'));
    try{resolve(validateResearchResponse(JSON.parse(output.toString('utf8')),request));}catch{reject(new StudyError('INVALID_RESULT',502,'Research result contract rejected'));}
   });
   child.stdin.end(JSON.stringify(request));
  });}finally{this.active--;}
 }
}
export function createResearchRouter(options:{resolveIdentity:(req:Request)=>{userId?:string;authError?:string};executor?:ResearchExecutor}){
 const router=express.Router(),executor=options.executor??new ResearchExecutor();
 router.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
 router.get('/capabilities',(_req,res)=>res.json({enabled:process.env.PVLIB_RESEARCH_ENABLED==='true',runtimeStatus:'not_probed',operations:['integrated','thermal_two_node','diode_network','dc_coupled','electrochemical_spm','dq_protection_control'],validationStatus:'not_field_validated',requiresAuthentication:true}));
 router.post('/run',(req,res,next)=>{
  if(process.env.PVLIB_RESEARCH_ENABLED!=='true')return res.status(503).json({code:'DISABLED'});
  if(!process.env.JWT_SECRET&&!process.env.INTERNAL_GATEWAY_SECRET)return res.status(503).json({code:'AUTH_NOT_CONFIGURED'});
  const identity=options.resolveIdentity(req);if(identity.authError||!identity.userId)return res.status(401).json({code:'AUTH_REQUIRED'});next();
 },createClientRateLimiter({windowMs:60000,maxRequests:6}),express.json({limit:'8mb',strict:true}),async(req,res)=>{
  const parsed=ResearchRequestSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({code:'INVALID_INPUT',issues:parsed.error.issues.slice(0,20)});
  const controller=new AbortController();const close=()=>{if(!res.writableEnded)controller.abort();};res.once('close',close);
  try{const result=await executor.run(parsed.data,controller.signal);if(!res.destroyed)res.json(result);}
  catch(e){if(!res.destroyed){const error=e instanceof StudyError?e:new StudyError('FAILED',500,'Research failed');if(error.status===429)res.setHeader('Retry-After','2');res.status(error.status).json({code:error.code,message:error.message});}}
  finally{res.off('close',close);}
 });
 router.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status((err as {status?:number})?.status===413?413:400).json({code:'INVALID_JSON_OR_SIZE'}));
 return router;
}
