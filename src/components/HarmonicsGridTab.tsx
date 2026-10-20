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
  HarmonicsAnalysisResult,
  UpstreamGridAnalysisResult,
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
        <h1 className="text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-400" />
          {lang === 'fa'
            ? 'تحلیل هارمونیک، کیفیت توان و شرایط شبکه بالادست (Harmonics & Upstream Grid PCC)'
            : 'Harmonics Analysis, Power Quality & Upstream Grid Interconnection (PCC)'}
        </h1>
        <p className="text-slate-400 text-xs">
          {lang === 'fa'
            ? 'ارزیابی کیفیت توان طبق استاندارد IEEE 519:2022، تغییرات ولتاژ در نقطه اتصال مشترک (PCC)، نسبت اتصال کوتاه (SCR)، فلیکر و تطابق با کدهای دیسپاچینگ توانیر'
            : 'Power quality evaluation per IEEE 519:2022, Point of Common Coupling (PCC) voltage rise, Short-Circuit Ratio (SCR), flicker, and Tavanir Grid Code compliance.'}
        </p>
      </div>

      {/* Grid Inputs Card */}
      <div className="studio-card">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-400" />
          {lang === 'fa' ? 'پارامترهای فنی شبکه بالادست و اینورترهای نیروگاه:' : 'Upstream Grid & Inverter Electrical Parameters:'}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'ظرفیت کل نامی نیروگاه (MW):' : 'Plant AC Capacity (MW):'}
            </label>
            <input
              type="number"
              step="0.5"
              min="0.1"
              value={capacityMw}
              onChange={(e) => setCapacityMw(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'ولتاژ خط اتصال به شبکه (kV):' : 'Interconnection Voltage (kV):'}
            </label>
            <select
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
            <label className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'ظرفیت اتصال کوتاه بالادست (MVA):' : 'Upstream S_sc (MVA):'}
            </label>
            <input
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
            <label className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'نسبت راکتانس به مقاومت (X/R):' : 'Grid X/R Ratio:'}
            </label>
            <input
              type="number"
              step="0.5"
              min="1"
              value={gridXrRatio}
              onChange={(e) => setGridXrRatio(parseFloat(e.target.value) || 5)}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'ضریب توان اینورترها (cos φ):' : 'Power Factor (cos φ):'}
            </label>
            <div className="flex gap-1">
              <input
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
                  isPowerFactorLagging ? 'bg-amber-900/60 border-amber-600 text-amber-300' : 'bg-cyan-900/60 border-cyan-600 text-cyan-300'
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
        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {lang === 'fa' ? 'نسبت اتصال کوتاه (SCR)' : 'Short-Circuit Ratio (SCR)'}
          </div>
          <div className="text-xl font-bold font-mono mt-1 text-sky-400">
            {gridResult.shortCircuitRatioScr}
          </div>
          <div className="mt-1">
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                gridResult.gridStrengthCategory === 'strong'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : gridResult.gridStrengthCategory === 'moderate'
                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                  : 'bg-red-950 text-red-400 border border-red-800'
              }`}
            >
              {lang === 'fa' ? gridResult.gridStrengthDescriptionFa.split('—')[0] : gridResult.gridStrengthDescriptionEn.split('—')[0]}
            </span>
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {lang === 'fa' ? 'تغییرات ولتاژ در نقطه اتصال (ΔV)' : 'PCC Voltage Rise (ΔV)'}
          </div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              gridResult.pccVoltageRiseCompliant ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {gridResult.pccVoltageRisePct}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            {gridResult.pccVoltageRiseCompliant ? (
              <span className="text-emerald-400 flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> مجاز (حداکثر ±۳٪)
              </span>
            ) : (
              <span className="text-red-400 flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" /> فراتر از سقف مجاز
              </span>
            )}
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {lang === 'fa' ? 'جریان اتصال کوتاه بالادست' : 'Upstream Short-Circuit Current'}
          </div>
          <div className="text-xl font-bold font-mono mt-1 text-amber-400">
            {gridResult.upstreamShortCircuitCurrentKa} <span className="text-xs font-normal">kA</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            مبنای قدرت قطع کلیدهای بریکر MV
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {lang === 'fa' ? 'سقف ظرفیت مجاز اتصال' : 'Max Grid Injectable Capacity'}
          </div>
          <div className="text-xl font-bold font-mono mt-1 text-purple-400">
            {gridResult.maxAllowablePlantCapacityMw} <span className="text-xs font-normal">MW</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            بدون نیاز به تقویت خطوط فوق توزیع
          </div>
        </div>
      </div>

      {/* Grid Thevenin & Interconnection Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Box 1: Thevenin Equivalent & Flicker */}
        <div className="studio-card">
          <h3 className="text-sm font-bold text-sky-400 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            {lang === 'fa' ? 'مدل معادل تونن شبکه و شاخص‌های فلیکر:' : 'Thevenin Grid Model & Voltage Quality:'}
          </h3>
          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">امپدانس تونن شبکه (Z_grid):</span>
              <span className="font-mono font-bold text-white">{gridResult.theveninImpedanceZgOhm} Ω</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">مقاومت تونن (R_grid) و راکتانس (X_grid):</span>
              <span className="font-mono text-sky-300">
                R={gridResult.theveninResistanceRgOhm} Ω | X={gridResult.theveninReactanceXgOhm} Ω
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">بازه تزریق/جذب توان راکتیو Q (Mvar):</span>
              <span className="font-mono text-emerald-400">
                ±{gridResult.reactivePowerRangeMvar.maxInjectingCapacitiveMvar} Mvar (بازه ۴۴٪ توان نامی)
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">شاخص‌های فلیکر ولتاژ (Pst / Plt):</span>
              <span className="font-mono text-amber-300">
                Pst: {gridResult.flickerShortTermPst} (مجاز ≤ ۱.۰) | Plt: {gridResult.flickerLongTermPlt} (مجاز ≤ ۰.۸)
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-400">قابلیت عبور از افت ولتاژ (LVRT / FRT):</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {gridResult.lvrtCompliance.zeroVoltageRideThroughMs} میلی‌ثانیه افت کامل ولتاژ
              </span>
            </div>
          </div>
        </div>

        {/* Box 2: Harmonics Summary & IEEE 519 */}
        <div className="studio-card">
          <h3 className="text-sm font-bold text-sky-400 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            {lang === 'fa' ? 'خلاصه اعوجاج هارمونیکی کل (THD) طبق IEEE 519:' : 'Total Harmonic Distortion (THD) per IEEE 519:'}
          </h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-900 rounded border border-slate-800">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-300 font-semibold">اعوجاج هارمونیکی جریان (THD_i):</span>
                <span className="font-mono font-bold text-amber-400 text-sm">{harmonicsResult.thdCurrentPct}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full ${harmonicsResult.thdCurrentPct <= harmonicsResult.thdCurrentLimitPct ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, (harmonicsResult.thdCurrentPct / harmonicsResult.thdCurrentLimitPct) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>سقف مجاز استاندارد IEEE 519 برای این سطح SCR:</span>
                <strong className="text-white font-mono">{harmonicsResult.thdCurrentLimitPct}%</strong>
              </div>
            </div>

            <div className="p-3 bg-slate-900 rounded border border-slate-800">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-300 font-semibold">اعوجاج هارمونیکی ولتاژ در نقطه PCC (THD_v):</span>
                <span className="font-mono font-bold text-sky-400 text-sm">{harmonicsResult.thdVoltagePct}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full ${harmonicsResult.thdVoltagePct <= harmonicsResult.thdVoltageLimitPct ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, (harmonicsResult.thdVoltagePct / harmonicsResult.thdVoltageLimitPct) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>سقف مجاز اعوجاج ولتاژ در شبکه فشار متوسط:</span>
                <strong className="text-white font-mono">{harmonicsResult.thdVoltageLimitPct}%</strong>
              </div>
            </div>

            <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800 text-slate-300 flex items-center justify-between text-[11px]">
              <span>فیلتر هارمونیکی پیشنهادی:</span>
              <strong className="text-emerald-400 font-bold">
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
        <h3 className="text-sm font-bold text-sky-400 mb-2 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          {lang === 'fa'
            ? 'طیف فرکانسی هارمونیک‌های فرد مرتبه ۳ تا ۲۵ و مقایسه با حدود استاندارد IEEE 519:'
            : 'Odd Harmonic Spectrum (Orders 3 to 25) vs IEEE 519 Permissible Limits:'}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border border-slate-800">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-2">مرتبه هارمونیک</th>
                <th className="p-2">فرکانس (Hz)</th>
                <th className="p-2">جریان تولیدی (% In)</th>
                <th className="p-2">جریان موثر (Amps)</th>
                <th className="p-2">اعوجاج ولتاژ PCC (%)</th>
                <th className="p-2">سقف استاندارد IEEE 519</th>
                <th className="p-2 text-center">وضعیت تطابق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
              {harmonicsResult.individualHarmonics.map((h) => (
                <tr key={h.order} className="hover:bg-slate-850/60">
                  <td className="p-2 font-bold text-white">مرتبه {h.order}</td>
                  <td className="p-2">{h.freqHz} Hz</td>
                  <td className="p-2 text-amber-400">{h.currentPct}%</td>
                  <td className="p-2 text-sky-300">{h.currentAmps} A</td>
                  <td className="p-2 text-slate-400">{h.voltagePct}%</td>
                  <td className="p-2 text-slate-400">≤ {h.ieeeLimitPct}%</td>
                  <td className="p-2 text-center font-sans">
                    {h.compliant ? (
                      <span className="text-emerald-400 flex items-center justify-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> منطبق
                      </span>
                    ) : (
                      <span className="text-red-400 flex items-center justify-center gap-1 text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5" /> فراتر از سقف
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
