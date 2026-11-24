import React, { useState, useEffect, useRef } from 'react';
import { type MetricDistributionOutput } from '../engine/core/uncertaintyPropagation';
import { financialEnergyQuantileView, financialEnergyQuantileSections } from '../studies/financialEnergyQuantileView';
import { downloadBlob } from '../browser/download';

/** Local, non-persisted opt-in flag. No setters for finance, project, or operational energy. */
export function FinancialEnergyQuantiles({ energy, traceId, lang = 'fa', initialExplicit = true }: {
  energy: MetricDistributionOutput; traceId: string; lang?: 'fa' | 'en'; initialExplicit?: boolean;
}) {
  const [enabled, setEnabled] = useState(initialExplicit);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const exportToken = useRef({ value: 0 });
  useEffect(() => {
    const epoch = exportToken.current;
    epoch.value++;
    setExporting(false); setExportError(false);
    return () => { epoch.value++; };
  }, [energy, traceId]);
  let view: ReturnType<typeof financialEnergyQuantileView> | undefined;
  let invalid = false;
  if (enabled) {
    try { view = financialEnergyQuantileView(energy, traceId); } catch { invalid = true; }
  }
  async function exportPdf() {
    const token = ++exportToken.current.value;
    setExporting(true); setExportError(false);
    try {
      const sections = financialEnergyQuantileSections(energy, traceId);
      const { createReportPdf } = await import('../studies/reportPdf');
      const blob = await createReportPdf('Conditional financial energy quantiles', sections);
      if (token === exportToken.current.value) downloadBlob(blob, 'financial-energy-quantiles.pdf');
    } catch { if (token === exportToken.current.value) setExportError(true); }
    finally { if (token === exportToken.current.value) setExporting(false); }
  }
  return <div className="p-3 bg-industrial-surface border border-industrial-border rounded-lg" data-testid="financial-energy-quantiles">
    <label className="text-xs block">
      <input type="checkbox" checked={enabled} onChange={event => { exportToken.current.value++; setExporting(false); setEnabled(event.target.checked); setExportError(false); }} data-testid="uq-explicit-flag" />
      {' '}{lang === 'fa' ? 'نمایش صریح احتمال تجاوز انرژی (آزمایشی)' : 'Explicit energy exceedance display (experimental)'}
    </label>
    {!enabled ? <>
      <div className="text-[11px] text-slate-400">{lang === 'fa' ? 'تولید سالانه (MWh) - P10/P50/P90' : 'Annual Yield (MWh) - P10/P50/P90'}</div>
      <div className="text-base font-bold font-mono text-sky-400 mt-1">{energy.p50} <span className="text-xs font-normal text-slate-300">MWh</span></div>
      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">P10: {energy.p10} | P90: {energy.p90} (±{energy.relativeSpreadPercent}%)</div>
    </> : invalid ? <p role="alert">{lang === 'fa' ? 'صدک یا منشأ نامعتبر؛ نمایش جدید و خروجی مسدود است.' : 'Invalid quantiles or provenance; explicit display and export blocked.'}</p> : view?.status === 'available' ? <div data-testid="uq-explicit-result">
      <p>{lang === 'fa' ? 'احتمال تجاوز انرژی — نه فاصلهٔ اطمینان' : 'Energy exceedance — not a confidence interval'}</p>
      <p dir="ltr">P10: {view.energyExceedance.p10} | P50: {view.energyExceedance.p50} | P90: {view.energyExceedance.p90} {view.unit}</p>
      <p dir="ltr">CDF q10: {view.cdf.q10} | q50: {view.cdf.q50} | q90: {view.cdf.q90}</p>
      <p>{lang === 'fa' ? 'P90 = q10؛ P50 میانه است، نه لزوماً میانگین. اعتبارسنجی میدانی نشده؛ فقط تغییر نمایش، بدون محاسبهٔ مجدد مالی یا پذیرش انرژی.' : 'P90 = q10; P50 is median, not necessarily mean. Not field validated; display only, no financial recalculation or energy adoption.'}</p>
      <p className="text-xs">{view.source} | {view.provenance} | {view.schemaVersion}</p>
      <button type="button" disabled={exporting} onClick={exportPdf}>{exporting ? (lang === 'fa' ? 'در حال ساخت…' : 'Exporting…') : (lang === 'fa' ? 'PDF مستقل صدک انرژی' : 'Standalone energy quantiles PDF')}</button>
    </div> : null}
    {enabled && exportError && <p role="alert">{lang === 'fa' ? 'ساخت PDF ناموفق بود؛ می‌توانید دوباره تلاش کنید.' : 'PDF export failed; retry is available.'}</p>}
  </div>;
}
