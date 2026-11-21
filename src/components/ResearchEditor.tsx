import React,{useEffect,useRef,useState} from 'react';
import {z} from 'zod';
import integratedExample from '../../docs/examples/research/integrated-synthetic-plan.json';
import {ResearchRequestSchema,validateResearchResponse} from '../studies/researchApi';
import {parseStudyJson} from '../studies/strictStudyJson';
import {thermalExample,circuitExample} from '../studies/researchExamples';
const archive=z.object({schemaVersion:z.literal('research-editor-archive-v1'),request:z.unknown(),response:z.unknown().nullable()}).strict();
export function ResearchEditor({latitude,longitude,lang}:{latitude:number;longitude:number;lang:'fa'|'en'}){
 const [text,setText]=useState(JSON.stringify(thermalExample,null,2)),[result,setResult]=useState<unknown>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[enabled,setEnabled]=useState(false),[token,setToken]=useState('');
 const revision=useRef(0),abort=useRef<AbortController|null>(null);const en=lang==='en';
 const invalidate=()=>{revision.current++;abort.current?.abort();setBusy(false);setResult(null);setError('');};
 useEffect(()=>{invalidate();},[latitude,longitude]);
 useEffect(()=>{const c=new AbortController();fetch('/api/v1/research/capabilities',{signal:c.signal,cache:'no-store'}).then(r=>r.json()).then(c=>setEnabled(c.enabled===true)).catch(()=>{});return()=>{c.abort();abort.current?.abort();};},[]);
 let preview='';let valid=false;
 try{const r=ResearchRequestSchema.parse(parseStudyJson(text,8*1024*1024));valid=true;preview=`${r.operation} · ${r.plan.schemaVersion} · not_field_validated`;}catch(e){preview=e instanceof Error?e.message:'Invalid input';}
 const edit=(value:string)=>{invalidate();setText(value);};
 const run=async()=>{invalidate();const version=revision.current,c=new AbortController();abort.current=c;setBusy(true);
  try{const request=ResearchRequestSchema.parse(parseStudyJson(text,8*1024*1024));const response=await fetch('/api/v1/research/run',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(request),signal:c.signal,cache:'no-store'});
   if(!response.ok)throw new Error(`Research HTTP ${response.status}: ${(await response.text()).slice(0,500)}`);
   const data=validateResearchResponse(await response.json(),request);if(version===revision.current)setResult(data);
  }catch(e){if(version===revision.current)setError(e instanceof Error?e.message:'Research failed');}finally{if(version===revision.current)setBusy(false);}
 };
 const download=(name:string,data:unknown)=>{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const load=async(file:File)=>{invalidate();const version=revision.current;try{if(file.size>40*1024*1024)throw new Error('Archive too large');const data=parseStudyJson(await file.text(),40*1024*1024);const a=archive.safeParse(data);const request=ResearchRequestSchema.parse(a.success?a.data.request:data);if(a.success&&a.data.response!==null)validateResearchResponse(a.data.response,request);if(version===revision.current)setText(JSON.stringify(request,null,2));/* restored results are never treated as a fresh execution */}catch(e){if(version===revision.current)setError(String(e));}};
 return <section data-testid="research-editor" className="rounded-xl border p-4 space-y-3" dir={en?'ltr':'rtl'}>
  <h3>{en?'Research editor / API':'ویرایشگر و API پژوهشی'}</h3><p>{en?'Separate research only; no production/finance attachment. Explicit operating parameters required.':'صرفاً پژوهشی؛ جدا از تولید و مالی. پارامترهای عملیاتی با منبع صریح الزامی است.'} not_field_validated — {enabled?'API enabled':'API disabled / unavailable'}</p>
  <button onClick={()=>edit(JSON.stringify(thermalExample,null,2))}>Two-node synthetic example</button>{' '}<button onClick={()=>edit(JSON.stringify(circuitExample,null,2))}>Diode synthetic example</button>{' '}<button onClick={()=>edit(JSON.stringify({operation:'integrated',plan:integratedExample},null,2))}>Integrated synthetic example</button>
  <label>Import plan / archive <input aria-label="Import research" type="file" accept=".json,application/json" onChange={e=>{const f=e.target.files?.[0];if(f)void load(f);e.target.value='';}}/></label>
  <textarea aria-label="Research JSON" dir="ltr" className="w-full font-mono text-xs border p-2" rows={16} value={text} onChange={e=>edit(e.target.value)}/>
  <pre className="text-xs whitespace-pre-wrap" data-testid="research-preview">{preview}</pre>
  <label>Bearer token (memory only, optional with authenticated gateway) <input type="password" autoComplete="off" value={token} onChange={e=>{invalidate();setToken(e.target.value);}}/></label>
  <div><button disabled={!valid||busy||!enabled} onClick={()=>void run()}>Run research</button>{' '}<button disabled={!busy} onClick={invalidate}>Cancel research</button>{' '}<button disabled={!valid} onClick={()=>download('research-archive.json',{schemaVersion:'research-editor-archive-v1',request:ResearchRequestSchema.parse(parseStudyJson(text,8*1024*1024)),response:result})}>Download research archive</button>{' '}<button disabled={!result} onClick={()=>download('research-result.json',result)}>Download research result</button></div>
  {error&&<p role="alert">{error}</p>}{result!==null&&<pre data-testid="research-result" dir="ltr" className="text-xs overflow-auto max-h-80">{JSON.stringify(result,null,2)}</pre>}
 </section>;
}
