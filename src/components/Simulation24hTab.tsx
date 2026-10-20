import React, { useState } from 'react';
import { Clock, Sun, Battery as BatteryIcon, Zap, Fuel, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  simulate24hEnergyBalance,
  sizeDieselGenerator,
  Simulation24hResult,
  GeneratorSizingResult,
} from '../engine/simulation24hEngine';

interface Simulation24hTabProps {
  simulationResult: Simulation24hResult;
  generatorSizing: GeneratorSizingResult;
  outageHours: number;
  onOutageHoursChange: (hours: number) => void;
}

export const Simulation24hTab: React.FC<Simulation24hTabProps> = ({
  simulationResult,
  generatorSizing,
  outageHours,
  onOutageHoursChange,
}) => {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  // Maximum value for SVG scaling
  const maxVal = Math.max(
    ...simulationResult.hourlySteps.map((s) => Math.max(s.solarGenKwh, s.loadDemandKwh)),
    1.0
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-400" />
          شبیه‌سازی ۲۴ ساعته تراز انرژی و دیزل ژنراتور هیبرید (24h Simulation & Genset)
        </h1>
        <p className="text-slate-400 text-xs">
          شبیه‌سازی دینامیک ساعت‌به‌ساعت (از ۰۰:۰۰ الی ۲۳:۰۰)، پایش سطح شارژ باتری (SoC)، مازاد تولید و محاسبه سایز دیزل ژنراتور اضطراری
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">تولید ۲۴ ساعته خورشیدی</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {simulationResult.totalGeneration24hKwh} <span className="text-xs font-normal text-slate-300">kWh</span>
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">مصرف کل بار ۲۴ ساعته</div>
          <div className="text-xl font-bold font-mono text-sky-400 mt-1">
            {simulationResult.totalConsumption24hKwh} <span className="text-xs font-normal text-slate-300">kWh</span>
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">مازاد انرژی تزریق/اتلاف</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {simulationResult.totalSurplus24hKwh} <span className="text-xs font-normal text-slate-300">kWh</span>
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">کسری انرژی (Deficit)</div>
          <div className="text-xl font-bold font-mono text-red-400 mt-1">
            {simulationResult.totalDeficit24hKwh} <span className="text-xs font-normal text-slate-300">kWh</span>
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">حداقل سطح شارژ باتری (Min SoC)</div>
          <div className="text-xl font-bold font-mono text-purple-400 mt-1">
            {simulationResult.minBatterySocPct}%
          </div>
        </div>
      </div>

      {/* 24-Hour Visual Hourly Energy Chart */}
      <div className="studio-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sky-400 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            نمودار ۲۴ ساعته تراز تولید خورشیدی، مصرف بار و سطح شارژ باتری (SoC %)
          </h3>
          <div className="flex items-center gap-3 text-xs text-slate-300">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-amber-400 rounded-sm"></span> تولید خورشیدی
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-sky-400 rounded-sm"></span> مصرف بار
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-1 bg-purple-400"></span> سطح شارژ باتری (%)
            </span>
          </div>
        </div>

        {/* SVG Bar & Line Chart */}
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 overflow-x-auto">
          <svg width="100%" height="220" viewBox="0 0 960 220" className="select-none font-sans min-w-[700px]">
            {/* Horizontal Grid lines */}
            {[0, 50, 100, 150].map((y, idx) => (
              <line key={idx} x1="40" y1={y + 20} x2="940" y2={y + 20} stroke="#1e293b" strokeWidth="1" />
            ))}

            {/* Render 24 Hours Bars & SoC Points */}
            {simulationResult.hourlySteps.map((step, idx) => {
              const xCenter = 50 + idx * 37;
              const barWidth = 14;

              // Solar Gen Bar (Yellow)
              const solarHeight = (step.solarGenKwh / maxVal) * 140;
              const solarY = 170 - solarHeight;

              // Load Bar (Sky blue)
              const loadHeight = (step.loadDemandKwh / maxVal) * 140;
              const loadY = 170 - loadHeight;

              // Battery SoC Line Coordinate (0% = y: 170, 100% = y: 30)
              const socY = 170 - (step.batterySocPct / 100) * 140;

              const isHovered = selectedHour === step.hour;

              return (
                <g
                  key={idx}
                  className="cursor-pointer"
                  onMouseEnter={() => setSelectedHour(step.hour)}
                  onMouseLeave={() => setSelectedHour(null)}
                >
                  {/* Solar bar */}
                  <rect
                    x={xCenter - barWidth}
                    y={solarY}
                    width={barWidth - 1}
                    height={solarHeight}
                    fill={isHovered ? '#f59e0b' : '#fbbf24'}
                    rx="2"
                    opacity={0.85}
                  />

                  {/* Load bar */}
                  <rect
                    x={xCenter}
                    y={loadY}
                    width={barWidth - 1}
                    height={loadHeight}
                    fill={isHovered ? '#0284c7' : '#38bdf8'}
                    rx="2"
                    opacity={0.85}
                  />

                  {/* SoC Circle marker */}
                  <circle cx={xCenter} cy={socY} r="3.5" fill="#c084fc" stroke="#581c87" strokeWidth="1" />

                  {/* Hour label */}
                  {idx % 2 === 0 && (
                    <text x={xCenter} y="195" textAnchor="middle" fill="#64748b" fontSize="9 font-mono">
                      {step.timeLabel}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Connect Battery SoC with Polyline */}
            <polyline
              fill="none"
              stroke="#c084fc"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={simulationResult.hourlySteps
                .map((step, idx) => `${50 + idx * 37},${170 - (step.batterySocPct / 100) * 140}`)
                .join(' ')}
            />
          </svg>
        </div>

        {selectedHour !== null && (
          <div className="mt-3 p-2 bg-slate-900 rounded border border-slate-700/80 text-xs flex items-center justify-between font-mono animate-fadeIn">
            <span className="font-bold text-white">ساعت {selectedHour.toString().padStart(2, '0')}:00:</span>
            <span className="text-amber-400">
              تولید: {simulationResult.hourlySteps[selectedHour].solarGenKwh} kWh
            </span>
            <span className="text-sky-400">
              مصرف: {simulationResult.hourlySteps[selectedHour].loadDemandKwh} kWh
            </span>
            <span className="text-purple-400">
              سطح شارژ باتری: {simulationResult.hourlySteps[selectedHour].batterySocPct}%
            </span>
            <span className="text-emerald-400">
              شارژ باتری: {simulationResult.hourlySteps[selectedHour].batteryChargeKwh} kWh
            </span>
            <span className="text-indigo-400">
              دشارژ باتری: {simulationResult.hourlySteps[selectedHour].batteryDischargeKwh} kWh
            </span>
          </div>
        )}
      </div>

      {/* Auxiliary Diesel Generator Sizer */}
      <div className="studio-card">
        <h3 className="font-bold text-sky-400 text-sm mb-3 flex items-center gap-2">
          <Fuel className="w-4 h-4 text-amber-400" />
          ماژول سایزینگ دیزل ژنراتور اضطراری / کمکی (Auxiliary Generator Sizer)
        </h3>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            ساعات قطعی مداوم شبکه جهت برآورد حجم مخزن سوخت:
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="6"
              max="72"
              step="6"
              value={outageHours}
              onChange={(e) => onOutageHoursChange(parseInt(e.target.value) || 24)}
              className="w-48 accent-amber-400"
            />
            <span className="font-mono text-sm font-bold text-amber-400">{outageHours} ساعت مداوم</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
          <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
            <span className="text-slate-400 block mb-0.5">ظرفیت ژنراتور پیشنهادی (kVA)</span>
            <span className="text-lg font-bold font-mono text-amber-400">
              {generatorSizing.recommendedCapacityKva} kVA
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">ضریب توان: cosφ = 0.8</span>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
            <span className="text-slate-400 block mb-0.5">توان اکتیو خروجی (kW)</span>
            <span className="text-lg font-bold font-mono text-emerald-400">
              {generatorSizing.recommendedCapacityKw.toFixed(1)} kW
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">توان پرایم پیوسته</span>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
            <span className="text-slate-400 block mb-0.5">نرخ مصرف سوخت گازوئیل</span>
            <span className="text-lg font-bold font-mono text-red-400">
              {generatorSizing.fuelConsumptionLitersPerHour} L/h
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">در بار میانگین ۸۵٪</span>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
            <span className="text-slate-400 block mb-0.5">حداقل حجم باک سوخت</span>
            <span className="text-lg font-bold font-mono text-sky-400">
              {generatorSizing.minFuelTankSizeLiters} لیتر
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">برای {outageHours} ساعت کار مداوم</span>
          </div>
        </div>

        <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/60 text-xs text-slate-300">
          {generatorSizing.notesFa}
        </div>
      </div>
    </div>
  );
};
