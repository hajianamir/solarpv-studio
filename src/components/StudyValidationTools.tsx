import React,{useEffect,useState} from 'react';
import type {StudyResult} from '../studies/studyContract';
import {runStudyValidation,studyValidationHtml,type StudyValidationPlan} from '../studies/studyValidation';
export function validationPlanExample(result:StudyResult,tool:StudyValidationPlan['tool']){
 const times=result.samples.map(r=>Date.parse(String(r.timestamp))-result.request.weather.intervalMinutes*30000),step=result.request.weather.intervalMinutes*60000;
 const iso=(n:number)=>new Date(n).toISOString(),split=times[Math.floor(times.length/2)];
 const datasetId=result.request.measurements?.[0]?.id??'IMPORT_OBSERVATIONS_FIRST';
 const calibration={datasetId,train:{startUtc:iso(times[0]),endUtc:iso(split)},test:{startUtc:iso(split),endUtc:iso(times.at(-1)!+step)},minGain:0.8,maxGain:1.2};
 const common={schemaVersion:'study-validation-plan-v1',studyInputSha256:result.manifest.inputSha256,source:'SYNTHETIC example only; replace with your documented protocol',sourceVersion:'example-v1',purpose:'synthetic_software_test',tool};
 if(tool==='output_calibration')return {...common,calibration};
 if(tool==='energy_uncertainty')return {...common,horizon:'study_period',centralEstimate:'study_ac_export_as_median',components:[{id:'example_uncertainty',source:'SYNTHETIC assumption, not a site estimate',sourceVersion:'example-v1',coefficientOfVariation:0.05}],logSpaceCorrelation:[[1]]};
 return {...common,datasetId,evaluation:{startUtc:iso(times[0]-step/2),endUtc:iso(times.at(-1)!+step/2)},criteria:{source:'SYNTHETIC example thresholds, not a standard',minPairs:2,minPairedHours:1,minModelCoveragePct:50,maxAbsMbe:100,maxRmse:200},evidence:{sensorCalibrationCertificate:'SYNTHETIC placeholder; not a certificate',timeSynchronization:'SYNTHETIC placeholder',siteAndMeterBoundary:'SYNTHETIC placeholder',independentReview:'SYNTHETIC placeholder; no independent approval'}};
}
function download(name:string,text:string,type:string){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function StudyValidationTools({result}:{result:StudyResult}){
 const [raw,setRaw]=useState(''),[confirmed,setConfirmed]=useState(false),[report,setReport]=useState<ReturnType<typeof runStudyValidation>|null>(null),[error,setError]=useState('');
 const clear=()=>{setReport(null);setConfirmed(false);setError('');};
 useEffect(()=>{setRaw('');setReport(null);setConfirmed(false);setError('');},[result]);
 return <details data-testid="study-validation-tools"><summary>Calibration, P50/P90 and field evidence / کالیبراسیون و عدم‌قطعیت</summary>
 <p>Tools only, not proof of field validation. Output gain is an empirical correction, NOT physical equipment fitting or sensor calibration; it never modifies study/finance. Training/test must be separate. P50/P90 needs explicit sourced CV/correlation and a declared median, not RMSE. Period estimates are not annual estimates. Field references require qualified independent review outside this app.</p>
 <p>Examples are SYNTHETIC and blocked from establishing field evidence. Replace assumptions and references, never present examples as site data. Output gain needs at least two valid pairs in EACH window.</p>
 {(['output_calibration','energy_uncertainty','field_evidence'] as const).map(tool=><button type="button" key={tool} data-testid={`example-${tool}`} onClick={()=>{clear();setRaw(JSON.stringify(validationPlanExample(result,tool),null,2));}}>Synthetic example: {tool}</button>)}
 <label>Explicit analysis plan JSON<textarea aria-label="Study validation plan" rows={12} className="block w-full bg-slate-900" value={raw} onChange={e=>{clear();setRaw(e.target.value);}}/></label>
 <label>Recompute from saved plan JSON<input aria-label="Load study validation plan" type="file" accept="application/json,.json" onChange={async e=>{const file=e.target.files?.[0];clear();if(!file)return;if(file.size>64000){setError('Plan exceeds 64 KiB');return;}try{setRaw(await file.text());}catch(cause){setError(String(cause));}e.target.value='';}}/></label>
 <label><input type="checkbox" aria-label="Confirm study validation assumptions" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I reviewed the protocol, disjoint windows, source assumptions and limitations. No field certification is implied.</label>
 <button type="button" data-testid="run-study-validation" disabled={!confirmed} onClick={()=>{setReport(null);try{setReport(runStudyValidation(result,JSON.parse(raw)));setError('');}catch(cause){setError(String(cause));}}}>Compute explicit analysis</button>
 {error&&<p role="alert">{error}</p>}
 {report&&<div data-testid="study-validation-report"><pre dir="ltr" className="overflow-auto">{JSON.stringify(report,null,2)}</pre><button type="button" data-testid="download-study-validation-json" onClick={()=>download('study-validation-report.json',JSON.stringify(report,null,2),'application/json')}>Report JSON + plan</button><button type="button" data-testid="download-study-validation-html" onClick={()=>download('study-validation-report.html',studyValidationHtml(report),'text/html;charset=utf-8')}>Report HTML</button><button type="button" data-testid="download-study-validation-plan" onClick={()=>download('study-validation-plan.json',JSON.stringify(report.plan,null,2),'application/json')}>Recomputable plan JSON</button></div>}
 </details>;
}
