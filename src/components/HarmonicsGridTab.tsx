import React, { useState, useMemo } from 'react';
import {
  Activity,
  Zap,
  Shield,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  TrendingUp,
  Cpu,
  BarChart3,
  Info,
} from 'lucide-react';
import {
  analyzePowerplantHarmonics,
  analyzeUpstreamGridConditions,
  type HarmonicsAnalysisResult,
  type UpstreamGridAnalysisResult,
} from '../engine/harmonicsEngine';

interface HarmonicsGridTabProps {
  plantCapacityMw?: number;
  lang?: 'fa' | 'en';
}

export const HarmonicsGridTab: React.FC<HarmonicsGridTabProps> = ({
  plantCapacityMw = 5.0,
  lang = 'fa',
}) => {
  // Upstream Grid Inputs
  const [capacityMw, setCapacityMw] = useState<number>(plantCapacityMw || 5.0);
  const [gridVoltageKv, setGridVoltageKv] = useState<number>(20); // 20 kV standard MV in Iran
  const [gridShortCircuitMva, setGridShortCircuitMva] = useState<number>(350); // MVA at substation
  const [gridXrRatio, setGridXrRatio] = useState<number>(8.0);
  const [inverterPowerFactor, setInverterPowerFactor] = useState<number>(1.0);
  const [isPowerFactorLagging, setIsPowerFactorLagging] = useState<boolean>(true);

  // Compute Upstream Grid Conditions
  const gridResult: UpstreamGridAnalysisResult = useMemo(() => {
    return analyzeUpstreamGridConditions({
      plantCapacityMw: capacityMw,
      gridVoltageKv,
      gridShortCircuitMva,
      gridXrRatio,
      inverterPowerFactor,
      isPowerFactorLagging,
    });
  }, [capacityMw, gridVoltageKv, gridShortCircuitMva, gridXrRatio, inverterPowerFactor, isPowerFactorLagging]);

  // Compute Harmonics
  const harmonicsResult: HarmonicsAnalysisResult = useMemo(() => {
    return analyzePowerplantHarmonics(capacityMw, gridVoltageKv, gridResult.shortCircuitRatioScr);
  }, [capacityMw, gridVoltageKv, gridResult.shortCircuitRatioScr]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-xl font-bold text-industrial-accent mb-1 flex items-center gap-2">
          <Activity className="w-5 h-5 text-industrial-warning" />
          {lang === 'fa'
            ? 'تحلیل هارمونیک، کیفیت توان و شرایط شبکه بالادست (Harmonics & Upstream Grid PCC)'
            : 'Harmonics Analysis, Power Quality & Upstream Grid Interconnection (PCC)'}
        </h1>
        <p className="text-slate-400 text-xs">
          {lang === 'fa'
            ? 'برآورد مقدماتی/غربالگری با طیف نمونه و مدل ساده؛ این صفحه مطالعه اتصال، ارزیابی اندازه‌گیری‌شده یا تأیید انطباق IEEE 519/کد شبکه نیست. برای تصمیم طراحی، داده واقعی اینورتر و مطالعه متخصص لازم است.'
            : 'Preliminary screening using illustrative spectra and simplified models only—not a measured interconnection study or IEEE 519/grid-code compliance determination. Design decisions require actual inverter data and qualified review.'}
        </p>
      </div>

      {/* Grid Inputs Card */}
      <div className="studio-card">
        <h3 className="text-sm font-bold text-theme-strong mb-3 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-industrial-accent" />
          {lang === 'fa' ? 'پارامترهای فنی شبکه بالادست و اینورترهای نیروگاه:' : 'Upstream Grid & Inverter Electrical Parameters:'}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label htmlFor="harmonics-capacity-mw" className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'ظرفیت کل نامی نیروگاه (MW):' : 'Plant AC Capacity (MW):'}
            </label>
            <input
              id="harmonics-capacity-mw"
              type="number"
              step="0.5"
              min="0.1"
              value={capacityMw}
              onChange={(e) => setCapacityMw(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label htmlFor="harmonics-grid-voltage-kv" className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'ولتاژ خط اتصال به شبکه (kV):' : 'Interconnection Voltage (kV):'}
            </label>
            <select
              id="harmonics-grid-voltage-kv"
              value={gridVoltageKv}
              onChange={(e) => setGridVoltageKv(parseInt(e.target.value) || 20)}
              className="studio-input text-xs"
            >
              <option value="20">۲۰ کیلوولت (فشار متوسط شهری/صنعتی)</option>
              <option value="33">۳۳ کیلوولت (فشار متوسط اختصاصی صنایع سنگین)</option>
              <option value="63">۶۳ کیلوولت (فوق توزیع منطقه‌ای)</option>
              <option value="132">۱۳۲ کیلوولت (انتقال نیرو)</option>
            </select>
          </div>

          <div>
            <label htmlFor="harmonics-short-circuit-mva" className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'ظرفیت اتصال کوتاه بالادست (MVA):' : 'Upstream S_sc (MVA):'}
            </label>
            <input
              id="harmonics-short-circuit-mva"
              type="number"
              step="50"
              min="50"
              value={gridShortCircuitMva}
              onChange={(e) => setGridShortCircuitMva(parseFloat(e.target.value) || 100)}
              className="studio-input font-mono"
            />
            <span className="text-[10px] text-slate-400">معمولاً ۲۰۰ تا ۱۰۰۰ MVA</span>
          </div>

          <div>
            <label htmlFor="harmonics-grid-xr-ratio" className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'نسبت راکتانس به مقاومت (X/R):' : 'Grid X/R Ratio:'}
            </label>
            <input
              id="harmonics-grid-xr-ratio"
              type="number"
              step="0.5"
              min="1"
              value={gridXrRatio}
              onChange={(e) => setGridXrRatio(parseFloat(e.target.value) || 5)}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label htmlFor="harmonics-power-factor" className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'ضریب توان اینورترها (cos φ):' : 'Power Factor (cos φ):'}
            </label>
            <div className="flex gap-1">
              <input
                id="harmonics-power-factor"
                type="number"
                step="0.01"
                min="0.85"
                max="1.0"
                value={inverterPowerFactor}
                onChange={(e) => setInverterPowerFactor(parseFloat(e.target.value) || 1.0)}
                className="studio-input font-mono w-20"
              />
              <button
                type="button"
                onClick={() => setIsPowerFactorLagging(!isPowerFactorLagging)}
                className={`text-[10px] px-2 py-1 rounded font-bold border transition-all ${
                  isPowerFactorLagging ? 'bg-industrial-warning/40 border-industrial-warning text-industrial-warning' : 'bg-industrial-accent/60 border-industrial-accent text-industrial-accent'
                }`}
              >
                {isPowerFactorLagging ? 'پس‌فاز (سلفی)' : 'پیش‌فاز (خازنی)'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Assessment Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {lang === 'fa' ? 'نسبت اتصال کوتاه (SCR)' : 'Short-Circuit Ratio (SCR)'}
          </div>
          <div className="text-xl font-bold font-mono mt-1 text-industrial-accent">
            {gridResult.shortCircuitRatioScr}
          </div>
          <div className="mt-1">
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                gridResult.gridStrengthCategory === 'strong'
                  ? 'bg-industrial-success text-industrial-success border border-industrial-success'
                  : gridResult.gridStrengthCategory === 'moderate'
                  ? 'bg-industrial-warning text-industrial-warning border border-industrial-warning'
                  : 'bg-red-950 text-industrial-error border border-red-800'
              }`}
            >
              {lang === 'fa' ? gridResult.gridStrengthDescriptionFa.split('—')[0] : gridResult.gridStrengthDescriptionEn.split('—')[0]}
            </span>
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {lang === 'fa' ? 'تغییرات ولتاژ PCC — غربالگری (ΔV)' : 'PCC Voltage Rise Screening (ΔV)'}
          </div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              gridResult.pccVoltageRiseScreenPassed ? 'text-industrial-success' : 'text-industrial-error'
            }`}
          >
            {gridResult.pccVoltageRisePct}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            {gridResult.pccVoltageRiseScreenPassed ? (
              <span className="text-industrial-success flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> درون target داخلی (نه تأیید انطباق)
              </span>
            ) : (
              <span className="text-industrial-error flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" /> فراتر از target غربالگری داخلی
              </span>
            )}
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {lang === 'fa' ? 'جریان اتصال کوتاه بالادست' : 'Upstream Short-Circuit Current'}
          </div>
          <div className="text-xl font-bold font-mono mt-1 text-industrial-warning">
            {gridResult.upstreamShortCircuitCurrentKa} <span className="text-xs font-normal">kA</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            مبنای قدرت قطع کلیدهای بریکر MV
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {lang === 'fa' ? 'ظرفیت برآوردی مدل (نیازمند تأیید شبکه)' : 'Model Capacity Estimate (utility approval required)'}
          </div>
          <div className="text-xl font-bold font-mono mt-1 text-purple-400">
            {gridResult.maxAllowablePlantCapacityMw} <span className="text-xs font-normal">MW</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            برآورد مدل ساده؛ مطالعه اتصال و تأیید شرکت برق لازم است
          </div>
        </div>
      </div>

      {/* Grid Thevenin & Interconnection Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Box 1: Thevenin Equivalent & Flicker */}
        <div className="studio-card">
          <h3 className="text-sm font-bold text-industrial-accent mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-industrial-warning" />
            {lang === 'fa' ? 'مدل معادل تونن شبکه و شاخص‌های فلیکر:' : 'Thevenin Grid Model & Voltage Quality:'}
          </h3>
          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex justify-between items-center py-1.5 border-b border-industrial-border">
              <span className="text-slate-400">امپدانس تونن شبکه (Z_grid):</span>
              <span className="font-mono font-bold text-theme-strong">{gridResult.theveninImpedanceZgOhm} Ω</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-industrial-border">
              <span className="text-slate-400">مقاومت تونن (R_grid) و راکتانس (X_grid):</span>
              <span className="font-mono text-sky-300">
                R={gridResult.theveninResistanceRgOhm} Ω | X={gridResult.theveninReactanceXgOhm} Ω
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-industrial-border">
              <span className="text-slate-400">بازه تزریق/جذب توان راکتیو Q (Mvar):</span>
              <span className="font-mono text-industrial-success">
                ±{gridResult.reactivePowerRangeMvar.maxInjectingCapacitiveMvar} Mvar (بازه ۴۴٪ توان نامی)
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-industrial-border">
              <span className="text-slate-400">شاخص‌های فلیکر ولتاژ (Pst / Plt):</span>
              <span className="font-mono text-industrial-warning">
                Pst: {gridResult.flickerShortTermPst} (حد مرجع غربالگری ≤ ۱.۰) | Plt: {gridResult.flickerLongTermPlt} (حد مرجع غربالگری ≤ ۰.۸)
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-400">نمایش غربالگری عبور از افت ولتاژ (LVRT / FRT):</span>
              <span className="text-amber-300 font-bold flex items-center gap-1">
                {gridResult.lvrtCompliance.zeroVoltageRideThroughMs} میلی‌ثانیه — غربالگری مقدماتی؛ {gridResult.lvrtCompliance.statusFa}
              </span>
            </div>
          </div>
        </div>

        {/* Box 2: Harmonics Summary & IEEE 519 */}
        <div className="studio-card">
          <h3 className="text-sm font-bold text-industrial-accent mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-industrial-success" />
            {lang === 'fa' ? 'برآورد غربالگری THD (غیرحاکم، بدون ادعای انطباق):' : 'THD Screening Estimate (non-authoritative; no compliance claim):'}
          </h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-industrial-surface rounded border border-industrial-border">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-300 font-semibold">اعوجاج هارمونیکی جریان (THD_i):</span>
                <span className="font-mono font-bold text-industrial-warning text-sm">{harmonicsResult.thdCurrentPct}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-md overflow-hidden">
                <div
                  className={`h-full ${harmonicsResult.thdCurrentPct <= harmonicsResult.thdCurrentLimitPct ? 'bg-industrial-success' : 'bg-industrial-error'}`}
                  style={{ width: `${Math.min(100, (harmonicsResult.thdCurrentPct / harmonicsResult.thdCurrentLimitPct) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>حد مرجع غربالگری (انطباق استاندارد تأیید نمی‌شود):</span>
                <strong className="text-theme-strong font-mono">{harmonicsResult.thdCurrentLimitPct}%</strong>
              </div>
            </div>

            <div className="p-3 bg-industrial-surface rounded border border-industrial-border">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-300 font-semibold">اعوجاج هارمونیکی ولتاژ در نقطه PCC (THD_v):</span>
                <span className="font-mono font-bold text-industrial-accent text-sm">{harmonicsResult.thdVoltagePct}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-md overflow-hidden">
                <div
                  className={`h-full ${harmonicsResult.thdVoltagePct <= harmonicsResult.thdVoltageLimitPct ? 'bg-industrial-success' : 'bg-industrial-error'}`}
                  style={{ width: `${Math.min(100, (harmonicsResult.thdVoltagePct / harmonicsResult.thdVoltageLimitPct) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>حد مرجع غربالگری اعوجاج ولتاژ (بدون تعیین انطباق):</span>
                <strong className="text-theme-strong font-mono">{harmonicsResult.thdVoltageLimitPct}%</strong>
              </div>
            </div>

            <div className="p-2.5 bg-industrial-surface/80 rounded border border-industrial-border text-slate-300 flex items-center justify-between text-[11px]">
              <span>فیلتر هارمونیکی پیشنهادی:</span>
              <strong className="text-industrial-success font-bold">
                {harmonicsResult.recommendedFilterType === 'none'
                  ? 'فیلتر داخلی اینورتر کافی است (بدون نیاز به AHF)'
                  : harmonicsResult.recommendedFilterType === 'lcl_trap'
                  ? 'فیلتر پسیو LCL ورودی ترانسفورماتور'
                  : `فیلتر اکتیو هارمونیک (AHF) با جریان ${harmonicsResult.recommendedAhfCurrentAmps} آمپر`}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* SVG Spectrum Bar Chart for Individual Harmonic Orders */}
      <div className="studio-card">
        <h3 className="text-sm font-bold text-industrial-accent mb-2 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-industrial-accent" />
          {lang === 'fa'
            ? 'طیف هارمونیک نمونه (مرتبه ۳ تا ۲۵) در برابر حدود مرجع تقریبی — نه داده اندازه‌گیری‌شده:'
            : 'Illustrative Harmonic Spectrum (Orders 3–25) vs Approximate Reference Limits—not measured data:'}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border border-industrial-border">
            <thead className="bg-industrial-surface text-slate-400">
              <tr>
                <th className="p-2">مرتبه هارمونیک</th>
                <th className="p-2">فرکانس (Hz)</th>
                <th className="p-2">جریان تولیدی (% In)</th>
                <th className="p-2">جریان موثر (Amps)</th>
                <th className="p-2">اعوجاج ولتاژ PCC (%)</th>
                <th className="p-2">حد مرجع تقریبی</th>
                <th className="p-2 text-center">غربالگری</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
              {harmonicsResult.individualHarmonics.map((h) => (
                <tr key={h.order} className="hover:bg-slate-850/60">
                  <td className="p-2 font-bold text-theme-strong">مرتبه {h.order}</td>
                  <td className="p-2">{h.freqHz} Hz</td>
                  <td className="p-2 text-industrial-warning">{h.currentPct}%</td>
                  <td className="p-2 text-sky-300">{h.currentAmps} A</td>
                  <td className="p-2 text-slate-400">{h.voltagePct}%</td>
                  <td className="p-2 text-slate-400">≤ {h.ieeeLimitPct}%</td>
                  <td className="p-2 text-center font-sans">
                    {h.withinReferenceLimit ? (
                      <span className="text-industrial-success flex items-center justify-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> درون حد غربالگری
                      </span>
                    ) : (
                      <span className="text-industrial-error flex items-center justify-center gap-1 text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5" /> فراتر از حد مرجع غربالگری
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
