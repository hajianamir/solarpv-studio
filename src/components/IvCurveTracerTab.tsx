import React, { useState, useMemo } from 'react';
import { Activity, Sun, Thermometer, Layers, AlertCircle, RefreshCw } from 'lucide-react';
import { calculateSingleDiodeCurve, IvCurveResult } from '../engine/singleDiodeModel';

interface IvCurveTracerTabProps {
  lang?: 'fa' | 'en';
}

export const IvCurveTracerTab: React.FC<IvCurveTracerTabProps> = ({ lang = 'fa' }) => {
  const isEn = lang === 'en';
  const [irradiance, setIrradiance] = useState<number>(1000);
  const [cellTempC, setCellTempC] = useState<number>(25);
  const [seriesModules, setSeriesModules] = useState<number>(18);
  const [hasPartialShading, setHasPartialShading] = useState<boolean>(false);

  // Single module reference specs (e.g. 580W TOPCon)
  const stcVoc = 51.2;
  const stcIsc = 14.37;
  const stcVmp = 42.65;
  const stcImp = 13.6;
  const stcPmp = 580.0;

  const curveResult: IvCurveResult = useMemo(() => {
    return calculateSingleDiodeCurve(
      stcVoc,
      stcIsc,
      stcVmp,
      stcImp,
      stcPmp,
      -0.25,
      0.045,
      -0.29,
      irradiance,
      cellTempC,
      seriesModules
    );
  }, [irradiance, cellTempC, seriesModules]);

  // Max bounds for SVG plot
  const maxV = Math.max(10, curveResult.voc * 1.08);
  const maxI = Math.max(1, curveResult.isc * 1.15);
  const maxP = Math.max(10, curveResult.pmp * 1.15);

  const svgWidth = 720;
  const svgHeight = 320;
  const padLeft = 55;
  const padBottom = 40;
  const padTop = 20;
  const padRight = 55;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  // Generate SVG path for I-V curve
  const ivPath = curveResult.points
    .map((pt, idx) => {
      let currentI = pt.i;
      if (hasPartialShading && pt.v > curveResult.vmp * 0.65) {
        currentI = Math.min(currentI, curveResult.isc * 0.65);
      }
      const x = padLeft + (pt.v / maxV) * plotW;
      const y = padTop + plotH - (currentI / maxI) * plotH;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  // Generate SVG path for P-V curve
  const pvPath = curveResult.points
    .map((pt, idx) => {
      let currentP = pt.p;
      if (hasPartialShading && pt.v > curveResult.vmp * 0.65) {
        currentP = pt.v * Math.min(pt.i, curveResult.isc * 0.65);
      }
      const x = padLeft + (pt.v / maxV) * plotW;
      const y = padTop + plotH - (currentP / maxP) * plotH;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  // MPP Coordinates
  const mppX = padLeft + (curveResult.vmp / maxV) * plotW;
  const mppY_I = padTop + plotH - (curveResult.imp / maxI) * plotH;
  const mppY_P = padTop + plotH - (curveResult.pmp / maxP) * plotH;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
          <Activity className="w-5 h-5 text-sky-400" />
          {isEn
            ? 'I-V & P-V Characteristic Curve Tracer (Single-Diode Model)'
            : 'تحلیلگر مشخصه جریان-ولتاژ و توان-ولتاژ (I-V & P-V Curve Tracer)'}
        </h1>
        <p className="text-slate-400 text-xs">
          {isEn
            ? '5-parameter single-diode solar cell modeling with Newton-Raphson solver, irradiance/temperature sweeps, and bypass diode multi-peak simulation.'
            : 'شبیه‌سازی مدل پنج‌پارامتری تک‌دیودی سلول خورشیدی (Single-Diode Model) با حلگر نیوتن-رافسون و پایش فعال شدن دیودهای بای‌پس'}
        </p>
      </div>

      {/* Interactive Controls */}
      <div className="studio-card">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs mb-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-300 font-semibold flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-amber-400" /> {isEn ? 'Solar Irradiance (G):' : 'شدت تابش (Irradiance G):'}
              </span>
              <span className="font-mono text-amber-400 font-bold">{irradiance} W/m²</span>
            </div>
            <input
              type="range"
              min="200"
              max="1200"
              step="50"
              value={irradiance}
              onChange={(e) => setIrradiance(parseInt(e.target.value) || 1000)}
              className="w-full accent-amber-400"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-300 font-semibold flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-red-400" /> {isEn ? 'Cell Temperature (T):' : 'دمای سلول (Cell Temp T):'}
              </span>
              <span className="font-mono text-cyan-400 font-bold">{cellTempC}°C</span>
            </div>
            <input
              type="range"
              min="-15"
              max="75"
              step="5"
              value={cellTempC}
              onChange={(e) => setCellTempC(parseInt(e.target.value) || 25)}
              className="w-full accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-300 font-semibold flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-sky-400" /> {isEn ? 'Series Modules in String:' : 'تعداد پنل سری در استرینگ:'}
              </span>
              <span className="font-mono text-sky-400 font-bold">
                {seriesModules} {isEn ? 'Modules' : 'ماژول'}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={seriesModules}
              onChange={(e) => setSeriesModules(parseInt(e.target.value) || 1)}
              className="w-full accent-sky-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
            <input
              type="checkbox"
              checked={hasPartialShading}
              onChange={(e) => setHasPartialShading(e.target.checked)}
              className="accent-amber-500 rounded"
            />
            <span className="font-semibold">
              {isEn
                ? 'Simulate Partial Shading & Bypass Diode Activation (Multi-Peak Curve)'
                : 'شبیه‌سازی سایه‌اندازی جزئی و پله دیود بای‌پس (Partial Shading Multi-Peak)'}
            </span>
          </label>
        </div>
      </div>

      {/* KPI Specs Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
        <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg">
          <span className="text-slate-400 block mb-0.5">{isEn ? 'Max Power (Pmp)' : 'توان ماکزیمم (Pmp)'}</span>
          <span className="text-base font-bold font-mono text-emerald-400">
            {curveResult.pmp >= 1000 ? `${(curveResult.pmp / 1000).toFixed(2)} kW` : `${curveResult.pmp} W`}
          </span>
        </div>

        <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg">
          <span className="text-slate-400 block mb-0.5">{isEn ? 'Voltage at MPP (Vmp)' : 'ولتاژ نقطه کار (Vmp)'}</span>
          <span className="text-base font-bold font-mono text-sky-400">{curveResult.vmp} V</span>
        </div>

        <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg">
          <span className="text-slate-400 block mb-0.5">{isEn ? 'Current at MPP (Imp)' : 'جریان نقطه کار (Imp)'}</span>
          <span className="text-base font-bold font-mono text-sky-400">{curveResult.imp} A</span>
        </div>

        <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg">
          <span className="text-slate-400 block mb-0.5">{isEn ? 'Open-Circuit Voc' : 'ولتاژ مدار باز (Voc)'}</span>
          <span className="text-base font-bold font-mono text-cyan-400">{curveResult.voc} V</span>
        </div>

        <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg">
          <span className="text-slate-400 block mb-0.5">{isEn ? 'Short-Circuit Isc' : 'جریان اتصال کوتاه (Isc)'}</span>
          <span className="text-base font-bold font-mono text-amber-400">{curveResult.isc} A</span>
        </div>

        <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg">
          <span className="text-slate-400 block mb-0.5">{isEn ? 'Fill Factor (FF)' : 'ضریب پرشدگی (FF)'}</span>
          <span className="text-base font-bold font-mono text-purple-400">{(curveResult.fillFactor * 100).toFixed(1)}%</span>
        </div>
      </div>

      {/* Interactive SVG Plot */}
      <div className="studio-card">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 className="font-bold text-sky-400 text-sm">
            {isEn ? 'I-V (Current-Voltage) and P-V (Power-Voltage) Curves' : 'منحنی‌های ولتاژ-جریان (I-V) و ولتاژ-توان (P-V)'}
          </h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 font-semibold text-sky-400">
              <span className="w-3 h-0.5 bg-sky-400"></span> {isEn ? 'I-V Curve' : 'منحنی جریان (I-V)'}
            </span>
            <span className="flex items-center gap-1 font-semibold text-emerald-400">
              <span className="w-3 h-0.5 bg-emerald-400"></span> {isEn ? 'P-V Curve' : 'منحنی توان (P-V)'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-center">
          <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="select-none font-sans min-w-[600px]">
            {/* Axis Lines */}
            <line x1={padLeft} y1={padTop + plotH} x2={padLeft + plotW} y2={padTop + plotH} stroke="#475569" strokeWidth="1.5" />
            <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + plotH} stroke="#475569" strokeWidth="1.5" />
            <line x1={padLeft + plotW} y1={padTop} x2={padLeft + plotW} y2={padTop + plotH} stroke="#475569" strokeWidth="1.5" />

            {/* Horizontal Grid lines */}
            {[0.25, 0.5, 0.75].map((frac, idx) => (
              <line
                key={idx}
                x1={padLeft}
                y1={padTop + plotH * frac}
                x2={padLeft + plotW}
                y2={padTop + plotH * frac}
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            ))}

            {/* I-V Curve (Sky Blue) */}
            <path d={ivPath} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />

            {/* P-V Curve (Emerald Green) */}
            <path d={pvPath} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 3" />

            {/* MPP marker on I-V curve */}
            <circle cx={mppX} cy={mppY_I} r="5" fill="#38bdf8" stroke="#0f172a" strokeWidth="2" />
            <circle cx={mppX} cy={mppY_P} r="5" fill="#34d399" stroke="#0f172a" strokeWidth="2" />

            {/* Vertical line through MPP */}
            <line x1={mppX} y1={padTop} x2={mppX} y2={padTop + plotH} stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" />
            <text x={mppX} y={padTop - 5} textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold">
              MPP ({curveResult.vmp}V, {curveResult.imp}A)
            </text>

            {/* X-Axis labels (Voltage) */}
            <text x={padLeft} y={padTop + plotH + 20} textAnchor="middle" fill="#94a3b8" fontSize="10 font-mono">0V</text>
            <text x={padLeft + plotW / 2} y={padTop + plotH + 20} textAnchor="middle" fill="#94a3b8" fontSize="10 font-mono">
              {(maxV / 2).toFixed(0)}V
            </text>
            <text x={padLeft + plotW} y={padTop + plotH + 20} textAnchor="middle" fill="#94a3b8" fontSize="10 font-mono">
              {maxV.toFixed(0)}V
            </text>
            <text x={padLeft + plotW / 2} y={padTop + plotH + 34} textAnchor="middle" fill="#cbd5e1" fontSize="11" fontWeight="bold">
              {isEn ? 'Array String Voltage (V)' : 'ولتاژ رشته فتوولتائیک Voltage (V)'}
            </text>

            {/* Y-Axis Left (Current A) */}
            <text x={padLeft - 10} y={padTop + 10} textAnchor="end" fill="#38bdf8" fontSize="10 font-mono">{maxI.toFixed(1)}A</text>
            <text x={padLeft - 10} y={padTop + plotH} textAnchor="end" fill="#38bdf8" fontSize="10 font-mono">0A</text>
            <text
              x={-(padTop + plotH / 2)}
              y={padLeft - 30}
              transform="rotate(-90)"
              textAnchor="middle"
              fill="#38bdf8"
              fontSize="11"
              fontWeight="bold"
            >
              {isEn ? 'Current (A)' : 'جریان Current (A)'}
            </text>

            {/* Y-Axis Right (Power W) */}
            <text x={padLeft + plotW + 10} y={padTop + 10} textAnchor="start" fill="#34d399" fontSize="10 font-mono">{Math.round(maxP)}W</text>
            <text x={padLeft + plotW + 10} y={padTop + plotH} textAnchor="start" fill="#34d399" fontSize="10 font-mono">0W</text>
            <text
              x={padTop + plotH / 2}
              y={-(padLeft + plotW + 35)}
              transform="rotate(90)"
              textAnchor="middle"
              fill="#34d399"
              fontSize="11"
              fontWeight="bold"
            >
              {isEn ? 'Power (W)' : 'توان Power (W)'}
            </text>
          </svg>
        </div>

        {hasPartialShading && (
          <div className="mt-2 text-xs text-amber-300 bg-amber-950/40 p-2.5 rounded border border-amber-600/50 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {isEn
                ? 'Partial Shading Phenomenon: Bypass diodes conduct when cell groups are shaded, creating a characteristic multi-peak knee in the I-V curve. Modern inverters with Global MPPT Scanning locate the true global peak.'
                : 'پدیده سایه‌اندازی جزئی: دیودهای بای‌پاس در ولتاژ بالاتر از ۷۰٪ فعال شده و شکل مشخصه I-V پله‌ای می‌شود؛ اینورترهای مجهز به Global MPPT Scan نقطه توان ماکزیمم سراسری را بدون گیر افتادن در قله‌های فرعی پیدا می‌کنند.'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
export default IvCurveTracerTab;
