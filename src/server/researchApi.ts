import {batteryProtocolOperations} from '../studies/batteryProtocol';
import {intervalCalibrationOperations} from '../studies/intervalCalibration';
import {couplingOperations} from '../studies/pvtPemCoupling';
import {materialInventoryOperations} from '../studies/materialInventory';
import {incoherentOperations} from '../studies/incoherentOptics';
import {spatialOperations} from '../studies/spatialResearch';
import {appliedOperations} from '../studies/appliedResearch';
import {referenceOperations} from '../studies/referenceModels';
import {scienceCOperations} from '../studies/scienceC';
import {scienceDOperations} from '../studies/scienceD';
import {scienceBOperations} from '../studies/scienceB';
import {survivalOperations} from '../studies/portfolioSurvival';
import {advancedOperations} from '../studies/portfolioAdvanced';
import {portfolioOperations} from '../studies/portfolioAnalytics';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {capabilityManifest} from '../capabilities/manifest';
import {parseStudyJson} from '../studies/strictStudyJson';
import {reviewExternalSeries} from '../studies/externalSeries';
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
  const reference=([...referenceOperations,...incoherentOperations,...materialInventoryOperations] as readonly string[]).includes(request.operation);
  if(reference&&!this.options.python&&!process.env.PVLIB_REFERENCE_PYTHON)throw new StudyError('REFERENCE_RUNTIME_NOT_CONFIGURED',503,'Optional reference runtime required; no fallback');
  if(this.active)throw new StudyError('BUSY',429,'Research capacity reached');
  this.active++;
  try{return await new Promise((resolve,reject)=>{
   const env:NodeJS.ProcessEnv={PYTHONNOUSERSITE:'1',PYTHONDONTWRITEBYTECODE:'1',OPENBLAS_NUM_THREADS:'1',OMP_NUM_THREADS:'1',MKL_NUM_THREADS:'1'};
   for(const k of ['PATH','SYSTEMROOT','SystemRoot','WINDIR','TEMP','TMP','HOME'])if(process.env[k])env[k]=process.env[k];
   const child=spawn(this.options.python??(reference?process.env.PVLIB_REFERENCE_PYTHON:process.env.PVLIB_PYTHON)??(process.platform==='win32'?'python':'python3'),['-I','-B',this.options.script??path.resolve('services/pvlib_research/api_worker.py')],{env,detached:process.platform!=='win32',shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});
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
 router.get('/capability-audit',(_req,res)=>{const manifest=capabilityManifest(process.env.CAPABILITY_AUDIT_ENABLED==='true');return manifest?res.json(manifest):res.status(503).json({code:'DISABLED'});});
 router.post('/data/review',(req,res,next)=>{
  if(process.env.EXTERNAL_DATA_ENABLED!=='true')return res.status(503).json({code:'DISABLED'});
  if(!process.env.JWT_SECRET&&!process.env.INTERNAL_GATEWAY_SECRET)return res.status(503).json({code:'AUTH_NOT_CONFIGURED'});
  const identity=options.resolveIdentity(req);if(identity.authError||!identity.userId)return res.status(401).json({code:'AUTH_REQUIRED'});next();
 },createClientRateLimiter({windowMs:60000,maxRequests:6}),express.text({limit:'4mb',type:'application/json'}), (req,res)=>{
  try{const body=parseStudyJson(req.body,4*1024*1024,'External review') as {series:unknown;target:unknown};
   if(!body||typeof body!=='object'||Object.keys(body).sort().join(',')!=='series,target')throw new Error('shape');
   return res.json(reviewExternalSeries(body.series,body.target,true));}catch{return res.status(400).json({code:'INVALID_INPUT'});}
 });
 router.get('/capabilities',(_req,res)=>res.json({enabled:process.env.PVLIB_RESEARCH_ENABLED==='true',runtimeStatus:'not_probed',batteryProtocolEnabled:process.env.BATTERY_PROTOCOL_ENABLED==='true',intervalCalibrationEnabled:process.env.INTERVAL_CALIBRATION_ENABLED==='true',pvtPemCouplingEnabled:process.env.PVT_PEM_COUPLING_ENABLED==='true',materialInventoryEnabled:process.env.MATERIAL_INVENTORY_ENABLED==='true'&&process.env.REFERENCE_MODELS_ENABLED==='true',incoherentOpticsEnabled:process.env.INCOHERENT_OPTICS_ENABLED==='true'&&process.env.REFERENCE_MODELS_ENABLED==='true',spatialResearchEnabled:process.env.SPATIAL_RESEARCH_ENABLED==='true',appliedResearchEnabled:process.env.APPLIED_RESEARCH_ENABLED==='true',referenceModelsEnabled:process.env.REFERENCE_MODELS_ENABLED==='true',scienceCEnabled:process.env.SCIENCE_C_ENABLED==='true',scienceDEnabled:process.env.SCIENCE_D_ENABLED==='true',scienceBEnabled:process.env.SCIENCE_B_ENABLED==='true',operations:['integrated','thermal_two_node','diode_network','dc_coupled','electrochemical_spm','dq_protection_control',...(process.env.PORTFOLIO_ANALYTICS_ENABLED==='true'?[...portfolioOperations,...advancedOperations,...survivalOperations]:[]),...(process.env.SCIENCE_B_ENABLED==='true'?scienceBOperations:[]),...(process.env.SCIENCE_D_ENABLED==='true'?scienceDOperations:[]),...(process.env.SCIENCE_C_ENABLED==='true'?scienceCOperations:[]),...(process.env.REFERENCE_MODELS_ENABLED==='true'?referenceOperations:[]),...(process.env.APPLIED_RESEARCH_ENABLED==='true'?appliedOperations:[]),...(process.env.SPATIAL_RESEARCH_ENABLED==='true'?spatialOperations:[]),...(process.env.INCOHERENT_OPTICS_ENABLED==='true'&&process.env.REFERENCE_MODELS_ENABLED==='true'?incoherentOperations:[]),...(process.env.MATERIAL_INVENTORY_ENABLED==='true'&&process.env.REFERENCE_MODELS_ENABLED==='true'?materialInventoryOperations:[]),...(process.env.PVT_PEM_COUPLING_ENABLED==='true'?couplingOperations:[]),...(process.env.INTERVAL_CALIBRATION_ENABLED==='true'?intervalCalibrationOperations:[]),...(process.env.BATTERY_PROTOCOL_ENABLED==='true'?batteryProtocolOperations:[])],portfolioAnalyticsEnabled:process.env.PORTFOLIO_ANALYTICS_ENABLED==='true',validationStatus:'not_field_validated',requiresAuthentication:true,externalDataEnabled:process.env.EXTERNAL_DATA_ENABLED==='true',jobPolicy:{identity:'ephemeral_request',cancel:'disconnect_or_abort',timeoutMs:120000,maxInputBytes:8388608,maxOutputBytes:33554432,maxConcurrent:1,persistence:false,automaticRetry:false}}));
 router.post('/run',(req,res,next)=>{
  if(process.env.PVLIB_RESEARCH_ENABLED!=='true')return res.status(503).json({code:'DISABLED'});
  if(!process.env.JWT_SECRET&&!process.env.INTERNAL_GATEWAY_SECRET)return res.status(503).json({code:'AUTH_NOT_CONFIGURED'});
  const identity=options.resolveIdentity(req);if(identity.authError||!identity.userId)return res.status(401).json({code:'AUTH_REQUIRED'});next();
 },createClientRateLimiter({windowMs:60000,maxRequests:6}),express.json({limit:'8mb',strict:true}),async(req,res)=>{
  const parsed=ResearchRequestSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({code:'INVALID_INPUT',issues:parsed.error.issues.slice(0,20)});
  if((batteryProtocolOperations as readonly string[]).includes(parsed.data.operation)&&process.env.BATTERY_PROTOCOL_ENABLED!=='true')return res.status(503).json({code:'BATTERY_PROTOCOL_DISABLED'});
  if((intervalCalibrationOperations as readonly string[]).includes(parsed.data.operation)&&process.env.INTERVAL_CALIBRATION_ENABLED!=='true')return res.status(503).json({code:'INTERVAL_CALIBRATION_DISABLED'});
  if((couplingOperations as readonly string[]).includes(parsed.data.operation)&&process.env.PVT_PEM_COUPLING_ENABLED!=='true')return res.status(503).json({code:'PVT_PEM_COUPLING_DISABLED'});
  if((materialInventoryOperations as readonly string[]).includes(parsed.data.operation)&&(process.env.MATERIAL_INVENTORY_ENABLED!=='true'||process.env.REFERENCE_MODELS_ENABLED!=='true'))return res.status(503).json({code:'MATERIAL_INVENTORY_DISABLED'});
  if((incoherentOperations as readonly string[]).includes(parsed.data.operation)&&(process.env.INCOHERENT_OPTICS_ENABLED!=='true'||process.env.REFERENCE_MODELS_ENABLED!=='true'))return res.status(503).json({code:'INCOHERENT_OPTICS_DISABLED'});
  if((spatialOperations as readonly string[]).includes(parsed.data.operation)&&process.env.SPATIAL_RESEARCH_ENABLED!=='true')return res.status(503).json({code:'SPATIAL_RESEARCH_DISABLED'});
  if((appliedOperations as readonly string[]).includes(parsed.data.operation)&&process.env.APPLIED_RESEARCH_ENABLED!=='true')return res.status(503).json({code:'APPLIED_RESEARCH_DISABLED'});
  if((referenceOperations as readonly string[]).includes(parsed.data.operation)&&process.env.REFERENCE_MODELS_ENABLED!=='true')return res.status(503).json({code:'REFERENCE_MODELS_DISABLED'});
  if((scienceCOperations as readonly string[]).includes(parsed.data.operation)&&process.env.SCIENCE_C_ENABLED!=='true')return res.status(503).json({code:'SCIENCE_C_DISABLED'});
  if((scienceDOperations as readonly string[]).includes(parsed.data.operation)&&process.env.SCIENCE_D_ENABLED!=='true')return res.status(503).json({code:'SCIENCE_D_DISABLED'});
  if((scienceBOperations as readonly string[]).includes(parsed.data.operation)&&process.env.SCIENCE_B_ENABLED!=='true')return res.status(503).json({code:'SCIENCE_B_DISABLED'});
  if(([...portfolioOperations,...advancedOperations,...survivalOperations] as readonly string[]).includes(parsed.data.operation)&&process.env.PORTFOLIO_ANALYTICS_ENABLED!=='true')return res.status(503).json({code:'PORTFOLIO_DISABLED'});
  // Ephemeral per-request identity; no plan, token or result is logged or persisted.
  res.setHeader('X-SolarPV-Job-Id',randomUUID());
  const controller=new AbortController();const close=()=>{if(!res.writableEnded)controller.abort();};res.once('close',close);
  try{const result=await executor.run(parsed.data,controller.signal);if(!res.destroyed)res.json(result);}
  catch(e){if(!res.destroyed){const error=e instanceof StudyError?e:new StudyError('FAILED',500,'Research failed');if(error.status===429)res.setHeader('Retry-After','2');res.status(error.status).json({code:error.code,message:error.message});}}
  finally{res.off('close',close);}
 });
 router.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status((err as {status?:number})?.status===413?413:400).json({code:'INVALID_JSON_OR_SIZE'}));
 return router;
}
