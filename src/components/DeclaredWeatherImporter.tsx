import React,{useEffect,useState} from 'react';
import {convertDeclaredWeather} from '../studies/declaredWeatherAdapter';
type Converted=ReturnType<typeof convertDeclaredWeather>;
export function DeclaredWeatherImporter({site,onApply,onDirty}:{site:{latitude:number;longitude:number;altitudeM:number;timezone:string};onApply:(weather:Converted['weather'])=>void;onDirty:()=>void}){
 const [manifest,setManifest]=useState(''),[csv,setCsv]=useState(''),[preview,setPreview]=useState<Converted|null>(null),[confirmed,setConfirmed]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setPreview(null);setConfirmed(false);},[site.latitude,site.longitude,site.altitudeM,site.timezone]);
 const invalidate=()=>{setPreview(null);setConfirmed(false);setError('');onDirty();};
 return <details data-testid="declared-weather-importer"><summary>Declared interval weather adapter / مبدل صریح واحد هواشناسی</summary>
 <p>Explicit manifest + plain CSV: timestamp,ghi,dni,dhi,tempAir,windSpeed. No provider detection, timezone guessing, fill, resampling or wind-height conversion. Mean interval-end data, 10 m wind. Preview does not apply. SHA256 is integrity, not authenticity.</p>
 <label>Manifest JSON<textarea aria-label="Declared weather manifest" value={manifest} onChange={e=>{invalidate();setManifest(e.target.value);}} className="block w-full bg-slate-900" rows={5}/></label>
 <label>Source CSV<textarea aria-label="Declared weather source CSV" value={csv} onChange={e=>{invalidate();setCsv(e.target.value);}} className="block w-full bg-slate-900" rows={5}/></label>
 <button type="button" data-testid="preview-declared-weather" onClick={()=>{setPreview(null);setConfirmed(false);try{setPreview(convertDeclaredWeather(manifest,csv,site));setError('');}catch(e){setError(String(e));}}}>Preview conversion / پیش‌نمایش تبدیل</button>
 {error&&<p role="alert">{error}</p>}
 {preview&&<div data-testid="declared-weather-preview"><p>{preview.weather.records.length} intervals · {preview.manifest.source} · {preview.manifest.quality} · {preview.manifest.sourceVersion} · {preview.receipt.canonicalWeatherSha256}</p><pre>{JSON.stringify(preview.weather.records.slice(0,2),null,2)}</pre><label><input type="checkbox" aria-label="Confirm declared weather conversion" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I confirm declared units, interval means, site and 10 m wind; not independently verified / تأیید مفروضات اعلام‌شده</label>
 <button type="button" data-testid="apply-declared-weather" disabled={!confirmed} onClick={()=>{onApply(preview.weather);}}>Use converted weather in builder / استفاده در فرم</button>
 <button type="button" data-testid="download-weather-receipt" onClick={()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(preview.receipt,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='declared-weather-receipt.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Download receipt + raw package</button></div>}
 </details>;
}
