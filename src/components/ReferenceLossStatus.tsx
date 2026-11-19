import React from 'react';
import type { AnnualReferenceEvaluation } from '../engine/waterfallArgs';
export function ReferenceLossStatus({evaluation,lang='fa'}:{evaluation?:AnnualReferenceEvaluation;lang?:'fa'|'en'}) {
  const en=lang==='en';
  if (!evaluation) return <p className="text-xs text-slate-400">{en?'Snow/soiling: original screening/manual inputs; no reference time series selected.':'برف/غبار: ورودی screening/دستی قبلی؛ سری زمانی مرجع انتخاب نشده است.'}</p>;
  return <section className="studio-card text-xs space-y-2" aria-label="Reference loss status">
    <h3>{en?'Reference snow / soiling — not field validated':'برف / غبار مرجع — بدون اعتبارسنجی میدانی'}</h3>
    <p>{evaluation.status}: {evaluation.reason ?? (en?'Applied once as replacements, not additional losses.':'اعمال یک‌باره به‌صورت جایگزین، نه افت اضافی.')}</p>
    <p>{en?'Soiling / Snow loss (%)':'افت غبار / برف (درصد)'}: {evaluation.soilingLossPct ?? 'screening'} / {evaluation.snowLossPct ?? 'screening'}</p>
    {evaluation.metadata && <details><summary>{en?'Model, provenance, period, units, parameters and limitations':'مدل، منشأ، دوره، واحد، پارامترها و محدودیت‌ها'}</summary><pre dir="ltr" className="whitespace-pre-wrap break-all max-h-80 overflow-auto">{JSON.stringify(evaluation.metadata,null,2)}</pre></details>}
  </section>;
}
