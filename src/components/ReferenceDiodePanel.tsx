import React,{useState} from 'react';
import {evaluateReferenceDiode} from '../engine/singleDiodeModel';
import type {ReferenceDiodeResult} from '../contracts/referenceDiode';

/** Temporary explicit consumer, never an adapter from nameplate or catalog data. */
export function ReferenceDiodePanel({lang='fa'}:{lang?:'en'|'fa'}) {
 const en=lang==='en';
 const [draft,setDraft]=useState('');
 const [result,setResult]=useState<ReferenceDiodeResult|null>(null);
 const [parseError,setParseError]=useState(false);
 const evaluate=()=>{
  setResult(null);setParseError(false);
  if(draft.length>32768){setParseError(true);return;}
  try{setResult(evaluateReferenceDiode(JSON.parse(draft)));}catch{setParseError(true);}
 };
 return <section className="studio-card space-y-3" data-testid="reference-diode-panel">
  <h2 className="font-bold">{en?'Explicit reference-parameter metrics (not a fitted curve)':'شاخص‌های پارامتر مرجع صریح (نه منحنی برازش‌شده)'}</h2>
  <p data-testid="reference-diode-policy" className="text-xs">desoto_reference_bounded_v1 · financialAdoptionEligible: false</p>
  <p data-testid="reference-diode-disclosure" className="text-xs">{en
   ?'Supply complete per-module STC reference parameters, conditions and provenance JSON. No values are copied from the legacy screen or catalog; no nameplate fitting or fallback. Source/record attribution is user supplied, unmatched and unauthenticated. Inputs/results are temporary, reset when leaving this view, and are not saved to projects or adopted into annual energy, finance or equipment selection. Supported conditions: 0 (dark) or 50–1400 W/m², −20 to 85°C, 1–100 series modules; these are implementation limits, not applicability approval.'
   :'JSON کامل پارامترهای مرجع STC هر ماژول، شرایط و منشأ را وارد کنید. هیچ مقداری از مدل قدیمی یا کاتالوگ کپی نمی‌شود؛ برازش نامی یا جایگزینی پنهان ندارد. منشأ و شناسه رکورد، ادعای کاربر و بدون تطبیق یا احراز اصالت‌اند. ورودی و نتیجه موقت‌اند و با خروج از این نما پاک می‌شوند؛ در پروژه ذخیره یا به انرژی سالانه، مالی و انتخاب تجهیزات منتقل نمی‌شوند. دامنه پشتیبانی: صفر (تاریکی) یا ۵۰ تا ۱۴۰۰ وات بر مترمربع، منفی۲۰ تا۸۵ درجه و۱ تا۱۰۰ ماژول سری؛ این حدود پیاده‌سازی است، نه تأیید انطباق.'}</p>
  <label htmlFor="reference-diode-request" className="block text-xs">{en?'Complete reference request JSON (maximum 32768 characters)':'درخواست کامل JSON مرجع (حداکثر۳۲۷۶۸ نویسه)'}</label>
  <textarea id="reference-diode-request" className="studio-input w-full font-mono text-xs" dir="ltr" rows={10} maxLength={32768} value={draft} onChange={e=>{setDraft(e.target.value);setResult(null);setParseError(false);}}/>
  <button type="button" className="studio-button" data-testid="reference-diode-evaluate" onClick={evaluate}>{en?'Evaluate explicit reference':'ارزیابی مرجع صریح'}</button>
  <button type="button" className="studio-button" onClick={()=>{setDraft('');setResult(null);setParseError(false);}}>{en?'Clear reference':'پاک‌کردن مرجع'}</button>
  {(parseError||result?.status==='unavailable')&&<p role="alert" data-testid="reference-diode-unavailable" data-reason={parseError?'invalid_json_or_size':result?.status==='unavailable'?result.reason:undefined}>{en?'Reference unavailable; check JSON/schema, supported numerical domain and root convergence. No legacy fallback.':'مرجع در دسترس نیست؛ JSON، طرح ورودی، دامنه عددی و همگرایی ریشه را بررسی کنید. جایگزینی با مدل قدیمی انجام نمی‌شود.'}</p>}
  {result&&(result.status==='available'||result.status==='dark')&&<div data-testid="reference-diode-result" data-status={result.status} className="space-y-2 text-xs">
   <p>{result.status==='dark'?(en?'Dark: zero generation, not a solver failure.':'تاریکی: تولید صفر، نه خطای حل‌گر.'):(en?'Bounded reference metrics; no independent module applicability approval.':'شاخص‌های مرجع با حل محدود؛ انطباق مستقل با ماژول تأیید نشده است.')}</p>
   <dl className="grid grid-cols-2 gap-2">{(['voc','isc','vmp','imp','pmp'] as const).map(key=><div key={key}><dt>{key} ({key==='pmp'?'W':key==='voc'||key==='vmp'?'V':'A'})</dt><dd data-testid={`reference-diode-${key}`} data-raw={result[key]}>{result[key].toFixed(6)}</dd></div>)}</dl>
   <p>{en?'User attribution (not authenticated): ':'انتساب کاربر (بدون احراز اصالت): '}{result.input.reference.provenance.source} · {result.input.reference.provenance.recordId}</p>
   <p data-testid="reference-diode-conditions">{result.input.conditions.effectiveIrradianceWm2} W/m² · {result.input.conditions.cellTempC} °C · {result.input.conditions.seriesModules} {en?'series modules':'ماژول سری'}</p>
   {result.status==='available'&&<p data-testid="reference-diode-residuals">{en?'Residuals: ':'باقیمانده‌ها: '}Voc {result.residuals.openCircuitAmps.toExponential(3)} A · Isc {result.residuals.shortCircuitVolts.toExponential(3)} V · MPP {result.residuals.mppDerivativeAmps.toExponential(3)} A</p>}
  </div>}
 </section>;
}
