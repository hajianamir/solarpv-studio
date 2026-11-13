import React from 'react';
import { Layers, ArrowDownRight, Award, Info, CheckCircle2, TrendingDown, Sparkles } from 'lucide-react';
import { computeWaterfallLosses, type WaterfallLossReport } from '../engine/waterfallLossEngine';
import { buildWaterfallArgs } from '../engine/waterfallArgs';
import { type AppliedShading3dRecord } from '../engine/shadingLifecycle';
import { type TrackerConfig } from '../engine/tracker/backtrackingEngine';

interface WaterfallLossTabProps {
  report?: WaterfallLossReport;
  installedCapacityKwp?: number;
  peakSunHours?: number;
  ambientTempMaxC?: number;
  soilingLossPct?: number;
  dcAcRatio?: number;
  noctC?: number;
  tempCoeffPmpPct?: number;
  trackerConfig?: TrackerConfig | null;
  bifacialGainPct?: number;
  shadingProvenance?: AppliedShading3dRecord | null;
  isShadingStale?: boolean;
  onClearShading?: () => void;
  lang?: 'fa' | 'en';
}

export const WaterfallLossTab: React.FC<WaterfallLossTabProps> = ({
  report: externalReport,
  installedCapacityKwp = 1000,
  peakSunHours = 5.0,
  ambientTempMaxC = 35.0,
  soilingLossPct = 4.5,
  dcAcRatio = 1.25,
  noctC = 45.0,
  tempCoeffPmpPct = -0.30,
  trackerConfig = null,
  bifacialGainPct,
  shadingProvenance,
  isShadingStale = false,
  onClearShading,
  lang = 'fa',
}) => {
  // PR-2a-7-FOLLOWUP-2 (BUG-3): `hasTracker` local state removed.
  // Tracker control lives exclusively in PvArrayEngineeringTab.
  // This tab renders the tracker state passed via the `trackerConfig` prop.
  const activeTrackerConfig: TrackerConfig | undefined = trackerConfig ?? undefined;
  const isFa = lang === 'fa';

  const report: WaterfallLossReport = externalReport ?? computeWaterfallLosses(
    ...buildWaterfallArgs({
      installedCapacityKwp,
      peakSunHours,
      ambientTempMaxC,
      soilingLossPct,
      dcAcRatio,
      hasTracker: Boolean(activeTrackerConfig),
      snowLossPct: 0.0,
      iamLossPct: -2.2,
      noctC,
      tempCoeffPmpPct,
      trackerConfig: activeTrackerConfig,
    })
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-lg sm:text-xl font-bold text-industrial-accent mb-1 flex items-center gap-2">
          <Layers className="w-5 h-5 text-industrial-success shrink-0" />
          {isFa
            ? 'درخت تفصیلی تلفات انرژی و ضریب عملکرد (PVsyst-Grade Loss Waterfall & PR)'
            : 'PVsyst-Grade Loss Waterfall Tree & Performance Ratio (PR)'}
        </h1>
        <p className="text-slate-400 text-xs">
          {isFa
            ? 'تحلیل ۱۴ مرحله‌ای زنجیره اتلاف انرژی از تشعشع خام اتمسفری تا تزریق خالص به شبکه و محاسبه ضریب عملکرد نیروگاه (Performance Ratio)'
            : '14-stage optical and electrical energy balance modeling from extraterrestrial horizontal irradiance to net grid export with IEC 61724 PR.'}
        </p>
      </div>

      {/* Tracker info strip — read-only (BUG-3: control lives in PvArrayEngineeringTab) */}
      <div className="studio-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-300">
              {isFa ? 'معماری tracker (کنترل از تب مهندسی آرایه):' : 'Tracker Architecture (controlled from PV Array Engineering tab):'}
            </span>
            <span className={`font-mono font-bold ${activeTrackerConfig ? 'text-industrial-warning' : 'text-sky-300'}`}>
              {activeTrackerConfig
                ? (isFa ? 'ترکر تک‌محوره + Backtracking' : '1-Axis Tracker + Backtracking')
                : (isFa ? 'شیب ثابت' : 'Fixed Tilt')}
            </span>
            <span className="text-[11px] text-slate-500">
              {isFa ? 'برای تغییر، به تب مهندسی آرایه بروید' : 'Change in PV Array Engineering tab'}
            </span>
          </div>

          <div className="text-[11px] text-slate-400">
            {isFa ? 'ضریب ترانسپوزیشن:' : 'Transposition Factor:'}{' '}
            <strong className="text-industrial-success font-mono">
              {report.trackerDetails
                ? `+${report.trackerDetails.annualTranspositionGainPct.toFixed(1)}%`
                : '+16.8%'}
            </strong>{' '}
            {isFa ? 'افزایش تشعشع در سطح آرایه' : 'irradiation gain on POA plane'}
          </div>
        </div>
      </div>

      {/* 3D Shading Provenance Banner */}
      {shadingProvenance && (
        <div className="p-3 bg-industrial-surface border border-sky-500/40 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sky-300">
              {isFa ? 'سایه‌اندازی سه‌بعدی فعال:' : 'Active 3D Shading Input:'}
            </span>
            <span className="font-mono font-bold text-amber-300">
              -{shadingProvenance.lossPct}%
            </span>
            <span className="text-[11px] text-slate-400">
              ({isFa ? 'اعمال‌شده در' : 'Applied at'}{' '}
              {new Date(shadingProvenance.appliedAtIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
            </span>
            {isShadingStale && (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                {isFa ? '⚠️ قدیمی: تغییر ظرفیت پروژه' : '⚠️ Stale: Capacity changed'}
              </span>
            )}
          </div>
          {onClearShading && (
            <button
              onClick={onClearShading}
              className="text-xs text-amber-400 hover:text-amber-300 underline cursor-pointer"
            >
              {isFa ? 'بازگشت به مقدار پیش‌فرض (-۲.۴٪)' : 'Revert to default (-2.4%)'}
            </button>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'انرژی خالص سالانه تزریق به شبکه' : 'Net Annual Grid Export (E_Grid)'}
          </div>
          <div className="text-xl font-bold font-mono text-industrial-success mt-1">
            {report.netAnnualEnergyExportMwh.toLocaleString()} <span className="text-xs font-normal text-slate-300">MWh/yr</span>
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'تولید ویژه سالانه (Specific Yield)' : 'Specific Annual Yield'}
          </div>
          <div className="text-xl font-bold font-mono text-industrial-warning mt-1">
            {report.specificAnnualYieldKwhPerKwp} <span className="text-xs font-normal text-slate-300">kWh/kWp/yr</span>
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'ضریب عملکرد نیروگاه (PR %)' : 'Performance Ratio (PR %)'}
          </div>
          <div className="text-xl font-bold font-mono text-industrial-accent mt-1">
            {report.performanceRatioPct}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {isFa ? 'استاندارد جهانی: ۷۸٪ تا ۸۴٪' : 'Tier-1 Benchmark: 78% - 84%'}
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'تشعشع کل سطح آرایه (POA)' : 'Effective Plane-of-Array (POA)'}
          </div>
          <div className="text-xl font-bold font-mono text-purple-400 mt-1">
            {Math.round(report.effectivePoaEnergyKwh / 1000).toLocaleString()} <span className="text-xs font-normal text-slate-300">MWh</span>
          </div>
        </div>
      </div>

      {/* Gain & Loss Sign Convention Legend */}
      <div className="p-3 bg-industrial-surface border border-industrial-border/70 rounded-lg text-xs flex items-start gap-2.5">
        <Info className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
        <div className="text-slate-300 leading-relaxed">
          <span className="font-semibold text-theme-strong">
            {isFa ? 'قرارداد علامت مراحل زنجیره انرژی:' : 'Energy Chain Sign Convention:'}
          </span>{' '}
          {isFa ? (
            <>
              مراحل مثبت (<span className="text-emerald-400 font-mono font-bold">+</span>) نمایانگر بهره‌های تشعشعی ضربی مانند بهره دوطرفگی پشت پنل (ضرب در ۱ + Gain٪) و مراحل منفی (<span className="text-rose-400 font-mono font-bold">-</span>) نمایانگر ضرایب اتلاف متوالی (ضرب در ۱ - Loss٪) هستند. درصدها جمع حسابی نمی‌شوند، بلکه به صورت ضرب زنجیره‌ای بر خروجی مرحله قبل اعمال می‌گردند.
            </>
          ) : (
            <>
              Positive (<span className="text-emerald-400 font-mono font-bold">+</span>) stages represent multiplicative irradiance gains such as bifacial rear reflection (× (1 + Gain%)), whereas negative (<span className="text-rose-400 font-mono font-bold">-</span>) stages represent sequential derating losses (× (1 - Loss%)). Percentages are compounded multiplicatively, not summed arithmetically.
            </>
          )}
        </div>
      </div>

      {/* Loss Waterfall List Table */}
      <div className="studio-card overflow-hidden">
        <h3 className="font-bold text-industrial-accent text-sm mb-3">
          {isFa
            ? 'جدول مراحل زنجیره تبدیل انرژی و تحلیل ضرایب اتلاف (Energy Balance Stages)'
            : 'Energy Conversion Balance Stages & Detailed Loss Factor Waterfall'}
        </h3>

        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <table className={`w-full text-xs text-slate-300 min-w-[620px] ${isFa ? 'text-right' : 'text-left'}`}>
            <thead className="bg-industrial-surface/90 text-slate-400 border-b border-industrial-border">
              <tr>
                <th className="p-2.5">{isFa ? 'ردیف' : '#'}</th>
                <th className="p-2.5">{isFa ? 'شرح مرحله زنجیره اتلاف / بهره' : 'Stage / Energy Factor Description'}</th>
                <th className="p-2.5">{isFa ? 'توضیحات فیزیکی استاندارد' : 'Engineering Principle & Standard'}</th>
                <th className="p-2.5">{isFa ? 'درصد اتلاف / بهره' : 'Loss / Gain (%)'}</th>
                <th className="p-2.5">{isFa ? 'انرژی باقیمانده (MWh)' : 'Stage Energy (MWh)'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr className="bg-industrial-surface/60 font-semibold text-theme-strong">
                <td className="p-2.5 font-mono">0</td>
                <td className="p-2.5 text-industrial-warning">
                  {isFa ? 'تشعشع کل افقی اولیه خورشید (GHI)' : 'Global Horizontal Irradiance (GHI Raw)'}
                </td>
                <td className="p-2.5 text-slate-400">
                  {isFa ? 'پتانسیل تشعشعی اقلیم بدون زاویه شیب' : 'Raw solar resource on horizontal plane'}
                </td>
                <td className="p-2.5 font-mono text-slate-400">100.0%</td>
                <td className="p-2.5 font-mono font-bold text-industrial-warning">
                  {Math.round(report.rawGhiEnergyKwh / 1000).toLocaleString()} MWh
                </td>
              </tr>
              <tr className="bg-industrial-surface/40 font-semibold text-theme-strong">
                <td className="p-2.5 font-mono">1</td>
                <td className="p-2.5 text-sky-300">
                  {isFa ? 'بهره انحراف زاویه شیب آرایه (Transposition POA)' : 'Transposition Gain to Plane-of-Array (POA)'}
                </td>
                <td className="p-2.5 text-slate-400">
                  {isFa ? 'افزایش دریافت پرتوها به دلیل شیب بهینه یا ترکر' : 'Irradiance gain via optimal tilt or solar tracking'}
                </td>
                <td className="p-2.5 font-mono text-industrial-success">
                  {report.trackerDetails
                    ? `+${report.trackerDetails.annualTranspositionGainPct.toFixed(1)}%`
                    : '+16.8%'}
                </td>
                <td className="p-2.5 font-mono font-bold text-sky-300">
                  {Math.round(report.effectivePoaEnergyKwh / 1000).toLocaleString()} MWh
                </td>
              </tr>

              {report.stages.map((stage, idx) => (
                <tr
                  key={stage.id}
                  className={
                    stage.id === 'bifacial_gain'
                      ? 'bg-emerald-950/20 hover:bg-emerald-950/30 border-l-2 border-emerald-400'
                      : 'hover:bg-slate-850/60'
                  }
                >
                  <td className="p-2.5 font-mono text-slate-400">{idx + 2}</td>
                  <td className="p-2.5 font-medium text-theme-strong">
                    <div className="flex items-center gap-1.5">
                      {stage.id === 'bifacial_gain' && (
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                      <div>
                        <span className={stage.id === 'bifacial_gain' ? 'text-emerald-300 font-bold' : ''}>
                          {isFa ? stage.nameFa : stage.nameEn}
                        </span>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {isFa ? stage.nameEn : stage.nameFa}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-2.5 text-slate-300">
                    {isFa ? stage.descriptionFa : stage.descriptionEn || stage.nameEn}
                  </td>
                  <td className="p-2.5 font-mono font-bold">
                    <span className={stage.percentageLoss >= 0 ? 'text-industrial-success font-extrabold' : 'text-industrial-error'}>
                      {stage.percentageLoss > 0 ? `+${stage.percentageLoss}%` : `${stage.percentageLoss}%`}
                    </span>
                    <div className="text-[10px] text-slate-500 font-normal">
                      {isFa
                        ? `مقدار دقیق: ${stage.percentageLossRaw?.toFixed(3)}% (نمایش گرد شده)`
                        : `Exact: ${stage.percentageLossRaw?.toFixed(3)}% (display rounded)`}
                    </div>
                  </td>
                  <td className="p-2.5 font-mono font-bold text-theme-strong">
                    {Math.round(stage.stageOutputKwh / 1000).toLocaleString()} MWh
                  </td>
                </tr>
              ))}

              <tr className="bg-industrial-surface font-bold border-t-2 border-emerald-500">
                <td className="p-2.5 text-industrial-success">✓</td>
                <td className="p-2.5 text-industrial-success text-sm">
                  {isFa ? 'انرژی خالص نهایی تحویلی به شبکه (Net E_Grid)' : 'Final Net Export to Grid (E_Grid)'}
                </td>
                <td className="p-2.5 text-slate-300">
                  {isFa ? 'انرژی اندازه‌گیری‌شده در کنتور نقطه تحویل پست' : 'Fiscal revenue meter at Point of Interconnection (POI)'}
                </td>
                <td className="p-2.5 font-mono text-industrial-success text-sm">PR = {report.performanceRatioPct}%</td>
                <td className="p-2.5 font-mono font-bold text-industrial-success text-base">
                  {report.netAnnualEnergyExportMwh.toLocaleString()} {isFa ? 'MWh/سال' : 'MWh/yr'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
