import React from 'react';

export function ResearchPlanFields({plan,onChange,en}:{plan:unknown;onChange:(value:unknown)=>void;en:boolean}) {
  let count=0;
  const field=(value:unknown,path:string[],update:(v:unknown)=>void):React.ReactNode=>{
    if (++count>160) return null;
    const label=path.join(' / ');
    if (Array.isArray(value)) return <details key={label} className="rounded border border-industrial-border p-2"><summary>{path.at(-1)} ({value.length})</summary>{value.length<=24?value.map((v,i)=>field(v,[...path,String(i)],next=>update(value.map((old,j)=>i===j?next:old)))):<p>{en?'Large series: use advanced JSON import/edit. Values are preserved.':'سری بزرگ: ویرایش/ورود از JSON پیشرفته؛ مقادیر بدون تغییر حفظ می‌شوند.'}</p>}</details>;
    if(value!==null&&typeof value==='object') return <fieldset key={label} className="space-y-2 rounded border border-industrial-border p-3"><legend>{path.at(-1)??(en?'Study parameters':'پارامترهای مطالعه')}</legend>{Object.entries(value).filter(([k])=>k!=='schemaVersion').map(([k,v])=>field(v,[...path,k],next=>update({...value,[k]:next})))}</fieldset>;
    if(value===null) return <p key={label}>{label}: null</p>;
    return <label key={label} className="block text-xs text-theme-muted">{label}<input aria-label={`Study parameter ${label}`} className="studio-input block w-full mt-1" type={typeof value==='boolean'?'checkbox':typeof value==='number'?'number':'text'} step={typeof value==='number'?'any':undefined} checked={typeof value==='boolean'?value:undefined} value={typeof value==='boolean'?undefined:String(value)} onChange={e=>{if(typeof value==='boolean')update(e.target.checked);else if(typeof value==='number'){if(e.target.value!==''&&Number.isFinite(Number(e.target.value)))update(Number(e.target.value));}else update(e.target.value);}}/></label>;
  };
  return <div data-testid="research-plan-form" className="space-y-3"><p className="text-xs text-theme-muted">{en?'Values and units are those declared by this model. Examples are synthetic/literature inputs, not project measurements. Up to 160 fields are shown. Large arrays and schema changes are available in advanced JSON.':'مقادیر و واحدها طبق قرارداد همین مدل‌اند. نمونه‌ها فرضی/مرجع هستند، نه اندازه‌گیری پروژه. حداکثر ۱۶۰ فیلد نمایش داده می‌شود؛ آرایه‌های بزرگ و تغییر ساختار در JSON پیشرفته قابل ویرایش‌اند.'}</p>{field(plan,[],onChange)}</div>;
}

export function ResearchResultView({value,en}:{value:unknown;en:boolean}) {
 const rows:{path:string;value:string}[]=[];
 const visit=(v:unknown,path:string)=>{
  if(rows.length>=120)return;
  if(v!==null&&typeof v==='object'){
   if(Array.isArray(v)&&v.length>20)rows.push({path,value:en?`${v.length} records; first 20 shown; complete data in download`:`${v.length} رکورد؛ نمایش ۲۰ مورد اول؛ دادهٔ کامل در دانلود`});
   Object.entries(v).slice(0,Array.isArray(v)?20:120).forEach(([k,x])=>visit(x,path?`${path} / ${k}`:k));
  }else rows.push({path,value:String(v)});
 };
 visit(value,'');
 return <section data-testid="research-study-output" className="rounded-xl border border-emerald-600 p-4 space-y-3"><h3 className="font-bold">{en?'Study completed — server-calculated results':'مطالعه انجام شد — نتایج محاسبه‌شده در سرور'}</h3><p className="text-xs">{en?'Research only; not field validated. View limited to 120 entries; download contains the complete result, units and provenance.':'صرفاً پژوهشی؛ اعتبارسنجی میدانی نشده. نمایش حداکثر ۱۲۰ مورد؛ فایل دانلود شامل نتیجه، واحدها و منشأ کامل است.'}</p><div className="overflow-auto max-h-96"><table className="w-full text-xs text-start"><thead><tr><th>{en?'Model output / declared unit':'خروجی مدل / واحد اعلام‌شده'}</th><th>{en?'Value':'مقدار'}</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i} className="border-t border-industrial-border"><td className="p-2 break-all" dir="ltr">{r.path}</td><td className="p-2 break-all" dir="auto">{r.value}</td></tr>)}</tbody></table></div></section>;
}
