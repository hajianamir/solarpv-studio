import React, { useState } from 'react';
import { Layers, ArrowDownRight, Award, Info, CheckCircle2, TrendingDown } from 'lucide-react';
import { computeWaterfallLosses, WaterfallLossReport } from '../engine/waterfallLossEngine';

interface WaterfallLossTabProps {
  installedCapacityKwp: number;
  peakSunHours: number;
  ambientTempMaxC: number;
  soilingLossPct: number;
  dcAcRatio: number;
  noctC?: number;
  tempCoeffPmpPct?: number;
  lang?: 'fa' | 'en';
}

export const WaterfallLossTab: React.FC<WaterfallLossTabProps> = ({
  installedCapacityKwp,
  peakSunHours,
  ambientTempMaxC,
  soilingLossPct,
  dcAcRatio,
  noctC = 45.0,
  tempCoeffPmpPct = -0.30,
  lang = 'fa',
}) => {
  const [hasTracker, setHasTracker] = useState(false);
  const isFa = lang === 'fa';

  const report: WaterfallLossReport = computeWaterfallLosses(
    installedCapacityKwp,
    peakSunHours,
    ambientTempMaxC,
    soilingLossPct,
    dcAcRatio,
    hasTracker,
    0.0,
    -2.2,
    noctC,
    tempCoeffPmpPct
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

      {/* Mode Controls */}
      <div className="studio-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-300">
              {isFa ? 'سیستم ترکینگ خورشیدی:' : 'Solar Tracking Architecture:'}
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="tracker"
                checked={!hasTracker}
                onChange={() => setHasTracker(false)}
                className="accent-sky-400"
              />
              <span>{isFa ? 'استراکچر با شیب بهینه ثابت (Fixed-Tilt)' : 'Optimal Fixed-Tilt Structure'}</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="tracker"
                checked={hasTracker}
                onChange={() => setHasTracker(true)}
                className="accent-amber-400"
              />
              <span className="text-industrial-warning font-bold">
                {isFa ? 'ترکر تک‌محوره هوشمند (Single-Axis 1P)' : 'Smart 1-Axis Horizontal Tracker (1P)'}
              </span>
            </label>
          </div>

          <div className="text-[11px] text-slate-400">
            {isFa ? 'ضریب ترانسپوزیشن:' : 'Transposition Factor:'}{' '}
            <strong className="text-industrial-success font-mono">{hasTracker ? '+26.5%' : '+16.8%'}</strong>{' '}
            {isFa ? 'افزایش تشعشع در سطح آرایه' : 'irradiation gain on POA plane'}
          </div>
        </div>
      </div>

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
              <tr className="bg-industrial-surface/60 font-semibold text-white">
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
              <tr className="bg-industrial-surface/40 font-semibold text-white">
                <td className="p-2.5 font-mono">1</td>
                <td className="p-2.5 text-sky-300">
                  {isFa ? 'بهره انحراف زاویه شیب آرایه (Transposition POA)' : 'Transposition Gain to Plane-of-Array (POA)'}
                </td>
                <td className="p-2.5 text-slate-400">
                  {isFa ? 'افزایش دریافت پرتوها به دلیل شیب بهینه یا ترکر' : 'Irradiance gain via optimal tilt or solar tracking'}
                </td>
                <td className="p-2.5 font-mono text-industrial-success">
                  +{hasTracker ? '26.5' : '16.8'}%
                </td>
                <td className="p-2.5 font-mono font-bold text-sky-300">
                  {Math.round(report.effectivePoaEnergyKwh / 1000).toLocaleString()} MWh
                </td>
              </tr>

              {report.stages.map((stage, idx) => (
                <tr key={stage.id} className="hover:bg-slate-850/60">
                  <td className="p-2.5 font-mono text-slate-400">{idx + 2}</td>
                  <td className="p-2.5 font-medium text-white">
                    {isFa ? stage.nameFa : stage.nameEn}
                    <div className="text-[10px] text-slate-400 font-normal">
                      {isFa ? stage.nameEn : stage.nameFa}
                    </div>
                  </td>
                  <td className="p-2.5 text-slate-300">
                    {isFa ? stage.descriptionFa : stage.descriptionEn || stage.nameEn}
                  </td>
                  <td className="p-2.5 font-mono font-bold">
                    <span className={stage.percentageLoss >= 0 ? 'text-industrial-success' : 'text-industrial-error'}>
                      {stage.percentageLoss > 0 ? `+${stage.percentageLoss}%` : `${stage.percentageLoss}%`}
                    </span>
                    <div className="text-[10px] text-slate-500 font-normal">
                      {isFa
                        ? `مقدار دقیق: ${stage.percentageLossRaw?.toFixed(3)}% (نمایش گرد شده)`
                        : `Exact: ${stage.percentageLossRaw?.toFixed(3)}% (display rounded)`}
                    </div>
                  </td>
                  <td className="p-2.5 font-mono font-bold text-white">
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
