import React, {Suspense, useState} from 'react';
import type {OperationalContext} from '../studies/operationalEnergy';
const Editor=React.lazy(()=>import('./ResearchEditor').then(m=>({default:m.ResearchEditor})));
const Studies=React.lazy(()=>import('./PvlibStudyPanel').then(m=>({default:m.PvlibStudyPanel})));
const Dispatch=React.lazy(()=>import('./AdvancedDispatchPanel').then(m=>({default:m.AdvancedDispatchPanel})));
const External=React.lazy(()=>import('./ExternalDataReview').then(m=>({default:m.ExternalDataReview})));

export const researchSections=[
 {id:'models',fa:'مدل‌ها و آزمایش‌ها',en:'Models & experiments'},
 {id:'studies',fa:'مطالعات مستقل PVlib',en:'Independent PVlib studies'},
 {id:'dispatch',fa:'دیسپاچ و آزمایش بهره‌برداری',en:'Dispatch & operating experiments'},
 {id:'data',fa:'مقایسهٔ داده‌های خارجی',en:'External data comparison'},
] as const;
export function ResearchTabs({tabs,active,onChange,lang,prefix}:{tabs:readonly {id:string;fa:string;en:string}[];active:string;onChange:(id:string)=>void;lang:'fa'|'en';prefix:string}){
 return <nav role="tablist" aria-label={lang==='fa'?'زیرتب‌های پژوهش':'Research sections'} className="flex sm:flex-wrap gap-2 max-w-full overflow-x-auto border-b border-industrial-border pb-3">{tabs.map((t,i)=><button key={t.id} id={`${prefix}-${t.id}`} data-testid={`${prefix}-${t.id}`} role="tab" aria-selected={active===t.id} aria-controls={`${prefix}-panel`} tabIndex={active===t.id?0:-1} onClick={()=>onChange(t.id)} onKeyDown={e=>{const offset=(e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0)*(lang==='fa'?-1:1);const index=e.key==='Home'?0:e.key==='End'?tabs.length-1:offset?(i+offset+tabs.length)%tabs.length:-1;if(index>=0){e.preventDefault();onChange(tabs[index].id);document.getElementById(`${prefix}-${tabs[index].id}`)?.focus();}}} className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-bold transition border ${active===t.id?'bg-violet-500/15 border-violet-400 text-violet-300':'border-industrial-border text-theme-muted hover:text-theme-strong'}`}>{t[lang]}</button>)}</nav>;
}
export default function ResearchWorkspace({latitude,longitude,lang,context}:{latitude:number;longitude:number;lang:'fa'|'en';context:OperationalContext|null}){
 const [active,setActive]=useState<string>('models'),[token,setToken]=useState('');
 return <section data-testid="research-workspace" dir={lang==='fa'?'rtl':'ltr'} className="space-y-5">
  <header className="studio-card border-t-4 border-violet-500 space-y-3"><span className="text-violet-300 text-xs font-bold uppercase tracking-wide">Research laboratory · not_field_validated</span><h1 className="font-bold text-2xl text-theme-strong">{lang==='fa'?'پژوهش و آزمایشگاه مستقل':'Independent research laboratory'}</h1><p className="text-sm text-theme-muted">{lang==='fa'?'مدل، داده و نتیجهٔ آزمایش را در محیطی مستقل بررسی کنید. این خروجی‌ها خودکار وارد طراحی، انرژی سالانه یا محاسبات مالی نمی‌شوند.':'Explore models, data and experiments separately. Results never automatically enter design, annual energy or finance.'}</p></header>
  <div className="studio-card space-y-5"><ResearchTabs tabs={researchSections} active={active} onChange={setActive} lang={lang} prefix="research-section"/>
   <div id="research-section-panel" role="tabpanel" aria-labelledby={`research-section-${active}`}><Suspense fallback={<p role="status">{lang==='fa'?'در حال بارگذاری ابزار پژوهش…':'Loading research tools…'}</p>}>
    {active==='models'&&<Editor latitude={latitude} longitude={longitude} lang={lang}/>}
    {active==='studies'&&<Studies latitude={latitude} longitude={longitude} lang={lang}/>}
    {active==='dispatch'&&<Dispatch context={context}/>}
    {active==='data'&&<div className="space-y-4"><label className="block text-sm text-theme-muted">{lang==='fa'?'توکن دسترسی (فقط در حافظه)':'Bearer token (memory only)'}<input aria-label="External data token" type="password" autoComplete="off" className="studio-input block mt-2 w-full" value={token} onChange={e=>setToken(e.target.value)}/></label><External token={token} latitude={latitude} longitude={longitude} lang={lang}/></div>}
   </Suspense></div>
  </div>
 </section>;
}
