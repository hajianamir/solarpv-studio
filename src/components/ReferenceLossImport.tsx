import React, {useState} from 'react';
import type { ClimateCity } from '../engine/climaticData';
import {evaluateAnnualReferenceLosses} from '../engine/reference/annualReferenceLosses';
import type {AnnualReferenceInput,ReferenceContext} from '../referenceModels/annualReferenceInput';
import {ReferenceLossStatus} from './ReferenceLossStatus';
/** Explicit file import only: never substitutes annual climatology for time-series weather. */
export function ReferenceLossImport({city,onChange,lang,context}:{context?:ReferenceContext;city:ClimateCity;onChange:(city:ClimateCity)=>void;lang:'fa'|'en'}) {
  const [error,setError]=useState('');
  const en=lang==='en';
  const active=React.useRef({city,context});active.current={city,context};
  const evaluation=React.useMemo(()=>city.annualReferenceLosses?evaluateAnnualReferenceLosses(city.annualReferenceLosses,city,context):undefined,[city,context]);
  return <section className="studio-card space-y-3" aria-label="Reference time series import">
    <h3>{en?'Opt-in reference snow / soiling (pvlib 0.13.1)':'انتخاب اختیاری برف / غبار مرجع (pvlib 0.13.1)'}</h3>
    <p className="text-xs text-slate-400">{en?'Import a JSON AnnualReferenceInput: schemaVersion=1, year, exact site coordinates, energyQuality, energySource, energy[{timestamp,cleanDcEnergyWh}], and soiling (KimberRequest) and/or snow (SnowRequest). Require a full UTC calendar year, matching interval-end timestamps, explicit weather and parameters. Not field validated. Other hourly loss interactions remain approximate.':'ورود JSON با قرارداد AnnualReferenceInput: نسخه schemaVersion=1، year، مختصات دقیق site، energyQuality، energySource، سری energy[{timestamp,cleanDcEnergyWh}] و soiling (KimberRequest) و/یا snow (SnowRequest). سال کامل UTC، پایان بازه‌های منطبق و پارامترهای صریح لازم است. اعتبارسنجی میدانی نشده و تعامل سایر افت‌های ساعتی تقریبی است.'}</p>
    <p className="text-xs">{en?'Parameter schemas and example structure: docs/REFERENCE-TIMESERIES-IMPORT.md. No defaults or weather are generated. Active-site coordinates must match; roof/reference snow variant only.':'قرارداد پارامترها و ساختار نمونه: docs/REFERENCE-TIMESERIES-IMPORT.md. داده هواشناسی یا پیش‌فرض تولید نمی‌شود. مختصات باید با سایت فعال یکسان باشد؛ برف فقط variant سقف/مرجع است.'}</p>
    <label className="block text-sm">{en?'Import reference annual JSON':'ورود JSON سالانه مرجع'}<input aria-label="Import reference annual JSON" type="file" accept=".json,application/json" onChange={async e=>{
      const file=e.target.files?.[0];e.target.value='';if(!file)return;
      try{
        if(file.size>20000000)throw new Error('JSON exceeds 20 MB');
        const text=await file.text();
        if(active.current.city!==city || JSON.stringify(active.current.context)!==JSON.stringify(context))throw new Error('Site/context changed during import; please retry');
        const input=JSON.parse(text) as AnnualReferenceInput;
        const checked=evaluateAnnualReferenceLosses(input,city,context);
        if(checked.status!=='computed')throw new Error(checked.reason);
        onChange({...city,annualReferenceLosses:input});setError('');
      }catch(err){setError(err instanceof Error?err.message:String(err));}
    }}/></label>
    {error&&<p role="alert" className="text-red-400">{error} — {en?'Import rejected; current inputs unchanged.':'ورود رد شد؛ ورودی جاری تغییر نکرد.'}</p>}
    {city.annualReferenceLosses&&<button type="button" onClick={()=>{const next={...city};delete next.annualReferenceLosses;onChange(next);setError('');}}>{en?'Disable reference models; restore screening inputs':'غیرفعال‌سازی مدل مرجع؛ بازگشت به ورودی screening'}</button>}
    <ReferenceLossStatus evaluation={evaluation} lang={lang}/>
  </section>;
}
