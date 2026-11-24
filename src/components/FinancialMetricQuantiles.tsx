import React, { useEffect, useRef, useState } from 'react';
import type { MetricDistributionOutput } from '../engine/core/uncertaintyPropagation';
import { financialMetricQuantiles, financialMetricQuantileSections, type FinancialQuantileMetric } from '../studies/financialMetricQuantiles';
import { downloadBlob } from '../browser/download';

export function FinancialMetricQuantiles({ metric, value, traceId, lang, children, initialExplicit = true }: {
  metric: FinancialQuantileMetric; value: MetricDistributionOutput; traceId: string; lang: 'fa' | 'en'; children: React.ReactNode; initialExplicit?: boolean;
}) {
  const [enabled, setEnabled] = useState(initialExplicit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const token = useRef({ value: 0 });
  useEffect(() => {
    const epoch = token.current;
    epoch.value++;
    setBusy(false); setError(false);
    return () => { epoch.value++; };
  }, [metric, value, traceId]);
  let view: ReturnType<typeof financialMetricQuantiles> | undefined;
  if (enabled) { try { view = financialMetricQuantiles(metric, value, traceId); } catch { /* Fail closed below. */ } }
  async function exportPdf() {
    const current = ++token.current.value; setBusy(true); setError(false);
    try {
      const sections = financialMetricQuantileSections(metric, value, traceId);
      const { createReportPdf } = await import('../studies/reportPdf');
      const blob = await createReportPdf(`Conditional ${metric.toUpperCase()} quantiles`, sections);
      if (current === token.current.value) downloadBlob(blob, `financial-${metric}-quantiles.pdf`);
    } catch { if (current === token.current.value) setError(true); }
    finally { if (current === token.current.value) setBusy(false); }
  }
  return <div className="p-3 bg-industrial-surface border border-industrial-border rounded-lg" data-testid={`financial-${metric}-quantiles`}>
    <label className="text-xs block"><input type="checkbox" checked={enabled} data-testid={`uq-${metric}-flag`} onChange={event => { token.current.value++; setBusy(false); setError(false); setEnabled(event.target.checked); }} />{' '}
      {lang === 'fa' ? 'صدک صریح و دنبالهٔ نامطلوب (آزمایشی)' : 'Explicit CDF and adverse tail (experimental)'}
    </label>
    {!enabled ? children : !view ? <p role="alert">{lang === 'fa' ? 'داده یا منشأ نامعتبر؛ خروجی مسدود است.' : 'Invalid data or provenance; export blocked.'}</p> : <div data-testid={`uq-${metric}-result`}>
      <p dir="ltr">{metric.toUpperCase()} ({view.unit}) — CDF q10: {view.cdf.q10} | q50: {view.cdf.q50} | q90: {view.cdf.q90}</p>
      <p>{lang === 'fa' ? (metric === 'lcoe' ? 'دنبالهٔ نامطلوب: هزینهٔ بالا، q90' : 'دنبالهٔ نامطلوب: NPV پایین، q10') : (metric === 'lcoe' ? 'Adverse: higher cost, q90' : 'Adverse: lower NPV, q10')}: {view.adverseTail.value}</p>
      <p>{lang === 'fa' ? 'صدک CDF، نه فاصلهٔ اطمینان؛ میانه لزوماً میانگین نیست. اعتبارسنجی میدانی نشده و گواه بانک‌پذیری نیست. بدون محاسبهٔ مجدد مالی یا پذیرش انرژی.' : 'CDF quantiles, not confidence intervals; median is not necessarily mean. Not field validated or bankability certified. No financial recalculation or energy adoption.'}</p>
      <p className="text-xs">{view.source} | {view.provenance} | {view.schemaVersion}</p>
      <button type="button" disabled={busy} onClick={exportPdf}>{busy ? '…' : (lang === 'fa' ? 'PDF مستقل صدک مالی' : 'Standalone metric quantiles PDF')}</button>
    </div>}
    {enabled && error && <p role="alert">{lang === 'fa' ? 'ساخت PDF ناموفق؛ دوباره تلاش کنید.' : 'PDF export failed; retry is available.'}</p>}
  </div>;
}
