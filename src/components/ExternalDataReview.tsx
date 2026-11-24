import React,{useEffect,useRef,useState} from 'react';
import {parseStudyJson} from '../studies/strictStudyJson';
import {downloadBlob} from '../browser/download';
/** A comparison inbox, not an energy source or project importer. */
export function ExternalDataReview({token,latitude,longitude,lang}:{token:string;latitude:number;longitude:number;lang:'fa'|'en'}){
 const [enabled,setEnabled]=useState(false),[body,setBody]=useState(''),[status,setStatus]=useState('idle'),[result,setResult]=useState<unknown>(null);
 const epoch=useRef({value:0}),controller=useRef<AbortController|null>(null);const en=lang==='en';
 const invalidate=()=>{epoch.current.value++;controller.current?.abort();setResult(null);setStatus('idle');};
 useEffect(()=>{const c=new AbortController();fetch('/api/v1/research/capabilities',{signal:c.signal,cache:'no-store'}).then(r=>r.json()).then(r=>setEnabled(r.externalDataEnabled===true)).catch(()=>{});const e=epoch.current;return()=>{c.abort();e.value++;controller.current?.abort();};},[]);
 useEffect(()=>{invalidate();setBody('');},[token,latitude,longitude]);
 async function load(file?:File){invalidate();setBody('');setStatus('loading');const n=epoch.current.value;try{if(!file||file.size>4*1024*1024)throw new Error();const text=await file.text();const value=parseStudyJson(text,4*1024*1024) as {target?:{context?:{latitude?:number;longitude?:number}}};if(value?.target?.context?.latitude!==latitude||value?.target?.context?.longitude!==longitude)throw new Error();if(n===epoch.current.value){setBody(text);setStatus('loaded');}}catch{if(n===epoch.current.value){setBody('');setStatus('invalid_or_site_mismatch');}}}
 async function run(){invalidate();const n=epoch.current.value,c=new AbortController();controller.current=c;setStatus('running');const timer=setTimeout(()=>c.abort(),15000);try{const r=await fetch('/api/v1/research/data/review',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body,signal:c.signal,cache:'no-store'});if(!r.ok)throw new Error();const value=await r.json();if(value?.schemaVersion!=='external-series-review-v1'||value.energyAdoption!==false||value.financeMutation!==false||value.researchGate?.status!=='blocked')throw new Error();if(n===epoch.current.value){setResult(value);setStatus(value.status);}}catch{if(n===epoch.current.value)setStatus('failed_or_cancelled');}finally{clearTimeout(timer);}}
 return <section data-testid="external-data-review" className="border rounded p-3 space-y-2">
 <h4>{en?'External generation / SCADA comparison inbox':'ورودی مقایسهٔ تولید خارجی و SCADA'}</h4>
 <p>{en?'Declared project/asset context only, not independently attested. No gap fill, resampling, finance changes or energy adoption. Research gate remains blocked.':'مشخصات پروژه/دارایی اظهارشده‌اند، نه تأیید مستقل. بدون پرکردن شکاف، بازنمونه‌گیری، تغییر مالی یا پذیرش انرژی؛ گیت پژوهشی مسدود می‌ماند.'}</p>
 <p>{enabled?'API enabled':'API disabled'} · {latitude}, {longitude}</p>
 <input aria-label="Import external comparison" type="file" accept="application/json,.json" onChange={e=>{void load(e.target.files?.[0]);e.target.value='';}}/>
 <button type="button" disabled={!enabled||!body||status==='running'} onClick={()=>void run()}>{en?'Verify comparison data':'بررسی دادهٔ مقایسه'}</button>
 <button type="button" disabled={status!=='running'} onClick={invalidate}>{en?'Cancel data review':'لغو بررسی داده'}</button>
 <button type="button" disabled={!result} onClick={()=>downloadBlob(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}),'external-data-review.json')}>{en?'Download comparison receipt':'دانلود رسید مقایسه'}</button>
 <p role="status" data-testid="external-data-status">{status}</p>
 {result!==null&&<pre dir="ltr" className="text-xs overflow-auto max-h-60">{JSON.stringify(result,null,2)}</pre>}
 </section>;
}
