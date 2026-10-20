import React, { useState } from 'react';
import { Layers, ArrowDownRight, Award, Info, CheckCircle2, TrendingDown } from 'lucide-react';
import { computeWaterfallLosses, WaterfallLossReport } from '../engine/waterfallLossEngine';

interface WaterfallLossTabProps {
  installedCapacityKwp: number;
  peakSunHours: number;
  ambientTempMaxC: number;
  soilingLossPct: number;
  dcAcRatio: number;
}

export const WaterfallLossTab: React.FC<WaterfallLossTabProps> = ({
  installedCapacityKwp,
  peakSunHours,
  ambientTempMaxC,
  soilingLossPct,
  dcAcRatio,
}) => {
  const [hasTracker, setHasTracker] = useState(false);

  const report: WaterfallLossReport = computeWaterfallLosses(
    installedCapacityKwp,
    peakSunHours,
    ambientTempMaxC,
    soilingLossPct,
    dcAcRatio,
    hasTracker
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-400" />
          درخت تفصیلی تلفات انرژی و ضریب عملکرد (PVsyst-Grade Loss Waterfall & PR)
        </h1>
        <p className="text-slate-400 text-xs">
          تحلیل ۱۴ مرحله‌ای زنجیره اتلاف انرژی از تشعشع خام اتمسفری تا تزریق خالص به شبکه و محاسبه ضریب عملکرد نیروگاه (Performance Ratio)
        </p>
      </div>

      {/* Mode Controls */}
      <div className="studio-card">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-300">سیستم ترکینگ خورشیدی:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="tracker"
                checked={!hasTracker}
                onChange={() => setHasTracker(false)}
                className="accent-sky-400"
              />
              <span>استراکچر با شیب بهینه ثابت (Fixed-Tilt)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="tracker"
                checked={hasTracker}
                onChange={() => setHasTracker(true)}
                className="accent-amber-400"
              />
              <span className="text-amber-400 font-bold">ترکر تک‌محوره هوشمند (Single-Axis 1P)</span>
            </label>
          </div>

          <div className="text-[11px] text-slate-400">
            ضریب ترانسپوزیشن: <strong className="text-emerald-400 font-mono">{hasTracker ? '+26.5%' : '+16.8%'}</strong> افزایش تشعشع در سطح آرایه
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">انرژی خالص سالانه تزریق به شبکه</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {report.netAnnualEnergyExportMwh.toLocaleString()} <span className="text-xs font-normal text-slate-300">MWh/year</span>
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">تولید ویژه (Specific Annual Yield)</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {report.specificAnnualYieldKwhPerKwp} <span className="text-xs font-normal text-slate-300">kWh/kWp/yr</span>
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">ضریب عملکرد نیروگاه (PR %)</div>
          <div className="text-xl font-bold font-mono text-sky-400 mt-1">
            {report.performanceRatioPct}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">استاندارد جهانی: ۷۸٪ تا ۸۴٪</div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">تشعشع کل سطح آرایه (POA)</div>
          <div className="text-xl font-bold font-mono text-purple-400 mt-1">
            {Math.round(report.effectivePoaEnergyKwh / 1000).toLocaleString()} <span className="text-xs font-normal text-slate-300">MWh</span>
          </div>
        </div>
      </div>

      {/* Loss Waterfall List Table */}
      <div className="studio-card overflow-hidden">
        <h3 className="font-bold text-sky-400 text-sm mb-3">
          جدول مراحل زنجیره تبدیل انرژی و تحلیل ضرایب اتلاف (Energy Balance Stages)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700">
              <tr>
                <th className="p-2.5">ردیف</th>
                <th className="p-2.5">شرح مرحله زنجیره اتلاف / بهره</th>
                <th className="p-2.5">توضیحات فیزیکی استاندارد</th>
                <th className="p-2.5">درصد اتلاف / بهره</th>
                <th className="p-2.5">انرژی باقیمانده (MWh)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr className="bg-slate-900/60 font-semibold text-white">
                <td className="p-2.5 font-mono">0</td>
                <td className="p-2.5 text-amber-300">تشعشع کل افقی اولیه خورشید (GHI)</td>
                <td className="p-2.5 text-slate-400">پتانسیل تشعشعی اقلیم بدون زاویه شیب</td>
                <td className="p-2.5 font-mono text-slate-400">100.0%</td>
                <td className="p-2.5 font-mono font-bold text-amber-300">
                  {Math.round(report.rawGhiEnergyKwh / 1000).toLocaleString()} MWh
                </td>
              </tr>
              <tr className="bg-slate-900/40 font-semibold text-white">
                <td className="p-2.5 font-mono">1</td>
                <td className="p-2.5 text-sky-300">بهره انحراف زاویه شیب آرایه (Transposition POA)</td>
                <td className="p-2.5 text-slate-400">افزایش دریافت پرتوها به دلیل شیب بهینه یا ترکر</td>
                <td className="p-2.5 font-mono text-emerald-400">
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
                    {stage.nameFa}
                    <div className="text-[10px] text-slate-400 font-normal">{stage.nameEn}</div>
                  </td>
                  <td className="p-2.5 text-slate-300">{stage.descriptionFa}</td>
                  <td className="p-2.5 font-mono font-bold">
                    <span className={stage.percentageLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {stage.percentageLoss > 0 ? `+${stage.percentageLoss}%` : `${stage.percentageLoss}%`}
                    </span>
                  </td>
                  <td className="p-2.5 font-mono font-bold text-white">
                    {Math.round(stage.stageOutputKwh / 1000).toLocaleString()} MWh
                  </td>
                </tr>
              ))}

              <tr className="bg-slate-900 font-bold border-t-2 border-emerald-500">
                <td className="p-2.5 text-emerald-400">✓</td>
                <td className="p-2.5 text-emerald-400 text-sm">انرژی خالص نهایی تحویلی به شبکه (Net E_Grid)</td>
                <td className="p-2.5 text-slate-300">انرژی اندازه‌گیری‌شده در کنتور نقطه تحویل پست</td>
                <td className="p-2.5 font-mono text-emerald-400 text-sm">PR = {report.performanceRatioPct}%</td>
                <td className="p-2.5 font-mono font-bold text-emerald-400 text-base">
                  {report.netAnnualEnergyExportMwh.toLocaleString()} MWh/سال
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
