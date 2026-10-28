import React, { useState } from 'react';
import { Clock, Sun, Battery as BatteryIcon, Zap, Fuel, Activity, CheckCircle2, AlertCircle, Power } from 'lucide-react';
import {
  Simulation24hResult,
  GeneratorSizingResult,
} from '../engine/simulation24hEngine';

interface Simulation24hTabProps {
  simulationResult: Simulation24hResult;
  generatorSizing: GeneratorSizingResult;
  outageHours: number;
  onOutageHoursChange: (hours: number) => void;
  enableDieselGenerator?: boolean;
  onToggleDieselGenerator?: (enabled: boolean) => void;
  systemMode?: 'powerplant' | 'ongrid' | 'offgrid';
  lang?: 'fa' | 'en';
}

export const Simulation24hTab: React.FC<Simulation24hTabProps> = ({
  simulationResult,
  generatorSizing,
  outageHours,
  onOutageHoursChange,
  enableDieselGenerator = false,
  onToggleDieselGenerator,
  systemMode = 'powerplant',
  lang = 'fa',
}) => {
  const isEn = lang === 'en';
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
          {isEn
            ? '24-Hour Energy Balance Simulation & Backup Genset'
            : 'شبیه‌سازی ۲۴ ساعته تراز انرژی و دیزل ژنراتور هیبرید (24h Simulation & Genset)'}
        </h1>
        <p className="text-slate-400 text-xs">
          {isEn
            ? 'Hour-by-hour dynamic energy flow simulation (00:00 to 23:00), battery state of charge (SoC) tracking, surplus/deficit analytics, and optional auxiliary backup diesel generator sizing.'
            : 'شبیه‌سازی دینامیک ساعت‌به‌ساعت (از ۰۰:۰۰ الی ۲۳:۰۰)، پایش سطح شارژ باتری (SoC)، مازاد تولید و محاسبه سایز دیزل ژنراتور اضطراری'}
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">{isEn ? '24h Solar Generation' : 'تولید ۲۴ ساعته خورشیدی'}</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {simulationResult.totalGeneration24hKwh} <span className="text-xs font-normal text-slate-300">kWh</span>
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">{isEn ? '24h Total Demand' : 'مصرف کل بار ۲۴ ساعته'}</div>
          <div className="text-xl font-bold font-mono text-sky-400 mt-1">
            {simulationResult.totalConsumption24hKwh} <span className="text-xs font-normal text-slate-300">kWh</span>
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">{isEn ? '24h Energy Surplus' : 'مازاد انرژی تزریق/اتلاف'}</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {simulationResult.totalSurplus24hKwh} <span className="text-xs font-normal text-slate-300">kWh</span>
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">{isEn ? '24h Energy Deficit' : 'کسری انرژی (Deficit)'}</div>
          <div className="text-xl font-bold font-mono text-red-400 mt-1">
            {simulationResult.totalDeficit24hKwh} <span className="text-xs font-normal text-slate-300">kWh</span>
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">{isEn ? 'Min Battery SoC' : 'حداقل سطح شارژ باتری (Min SoC)'}</div>
          <div className="text-xl font-bold font-mono text-purple-400 mt-1">
            {simulationResult.minBatterySocPct}%
          </div>
        </div>
      </div>

      {/* 24-Hour Visual Hourly Energy Chart */}
      <div className="studio-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="font-bold text-sky-400 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            {isEn
              ? '24-Hour Solar Production, Load Demand & Battery SoC (%) Profile'
              : 'نمودار ۲۴ ساعته تراز تولید خورشیدی، مصرف بار و سطح شارژ باتری (SoC %)'}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-amber-400 rounded-sm"></span> {isEn ? 'Solar PV' : 'تولید خورشیدی'}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-sky-400 rounded-sm"></span> {isEn ? 'Load' : 'مصرف بار'}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-1 bg-purple-400"></span> {isEn ? 'Battery SoC (%)' : 'سطح شارژ باتری (%)'}
            </span>
          </div>
        </div>

        {/* SVG Bar & Line Chart with Touch-Friendly Horizontal Scroll */}
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

                  {/* Hour text label */}
                  <text
                    x={xCenter}
                    y="190"
                    fill="#64748b"
                    fontSize="9"
                    textAnchor="middle"
                    className="font-mono"
                  >
                    {step.hour.toString().padStart(2, '0')}:00
                  </text>
                </g>
              );
            })}

            {/* SoC Curve connecting line */}
            <path
              d={simulationResult.hourlySteps
                .map((step, idx) => {
                  const x = 50 + idx * 37;
                  const y = 170 - (step.batterySocPct / 100) * 140;
                  return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                })
                .join(' ')}
              fill="none"
              stroke="#a855f7"
              strokeWidth="2.5"
            />

            {/* SoC Points */}
            {simulationResult.hourlySteps.map((step, idx) => {
              const x = 50 + idx * 37;
              const y = 170 - (step.batterySocPct / 100) * 140;
              return (
                <circle
                  key={`dot-${idx}`}
                  cx={x}
                  cy={y}
                  r={selectedHour === step.hour ? '5' : '3'}
                  fill={selectedHour === step.hour ? '#ffffff' : '#c084fc'}
                  stroke="#a855f7"
                  strokeWidth="1.5"
                />
              );
            })}
          </svg>
        </div>

        {/* Selected Hour Details Box */}
        {selectedHour !== null && (
          <div className="mt-3 p-3 bg-slate-900/90 rounded-lg border border-slate-700 flex flex-wrap items-center justify-between text-xs font-mono">
            <span className="text-white font-bold">
              {isEn ? 'Hour:' : 'ساعت:'} {selectedHour}:00
            </span>
            <span className="text-amber-400">
              {isEn ? 'Solar:' : 'تولید خورشیدی:'} {simulationResult.hourlySteps[selectedHour].solarGenKwh} kWh
            </span>
            <span className="text-sky-400">
              {isEn ? 'Demand:' : 'مصرف:'} {simulationResult.hourlySteps[selectedHour].loadDemandKwh} kWh
            </span>
            <span className="text-purple-400">
              {isEn ? 'Battery SoC:' : 'سطح شارژ باتری:'} {simulationResult.hourlySteps[selectedHour].batterySocPct}%
            </span>
            <span className="text-emerald-400">
              {isEn ? 'Charge:' : 'شارژ باتری:'} {simulationResult.hourlySteps[selectedHour].batteryChargeKwh} kWh
            </span>
            <span className="text-indigo-400">
              {isEn ? 'Discharge:' : 'دشارژ باتری:'} {simulationResult.hourlySteps[selectedHour].batteryDischargeKwh} kWh
            </span>
          </div>
        )}
      </div>

      {/* AUXILIARY DIESEL GENERATOR SIZER (RULE: Optional by user choice, active for powerplant) */}
      <div className="studio-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sky-400 text-sm">
                {isEn
                  ? 'Emergency Backup Diesel Generator Sizing (Substation & Auxiliaries)'
                  : 'ماژول سایزینگ دیزل ژنراتور اضطراری مصارف داخلی نیروگاه / پست'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isEn
                  ? 'Optional auxiliary sizing for substation MV switchgear trip coils, SCADA, tracker drives, and black-start capability.'
                  : 'برآورد ژنراتور دیزلی اضطراری جهت تأمین مصارف داخلی پست فشار متوسط، مدارات فرمان، ترکرها و بازیابی شبکه (Black-Start)'}
              </p>
            </div>
          </div>

          {/* User Activation Toggle Checkbox (User Request #4) */}
          <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-amber-500/60 transition">
            <input
              type="checkbox"
              checked={enableDieselGenerator}
              onChange={(e) => onToggleDieselGenerator && onToggleDieselGenerator(e.target.checked)}
              className="accent-amber-500 w-4 h-4 cursor-pointer"
            />
            <span className="text-xs font-semibold text-white">
              {enableDieselGenerator
                ? isEn
                  ? '✓ Generator Sizing Enabled'
                  : '✓ سایزینگ ژنراتور فعال است'
                : isEn
                ? 'Enable Generator Sizing (Optional)'
                : 'فعال‌سازی سایزینگ ژنراتور (اختیاری)'}
            </span>
          </label>
        </div>

        {enableDieselGenerator ? (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isEn
                  ? 'Target Continuous Outage Duration for Fuel Storage Calculation:'
                  : 'ساعات قطعی مداوم شبکه جهت برآورد حجم مخزن سوخت:'}
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
                <span className="font-mono text-sm font-bold text-amber-400">
                  {outageHours} {isEn ? 'Continuous Hours' : 'ساعت مداوم'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
                <span className="text-slate-400 block mb-0.5">
                  {isEn ? 'Recommended Rating (kVA)' : 'ظرفیت ژنراتور پیشنهادی (kVA)'}
                </span>
                <span className="text-lg font-bold font-mono text-amber-400">
                  {generatorSizing.recommendedCapacityKva} kVA
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {isEn ? 'Power Factor: cosφ = 0.8' : 'ضریب توان: cosφ = 0.8'}
                </span>
              </div>

              <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
                <span className="text-slate-400 block mb-0.5">
                  {isEn ? 'Active Output (kW)' : 'توان اکتیو خروجی (kW)'}
                </span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {generatorSizing.recommendedCapacityKw.toFixed(1)} kW
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {isEn ? 'Prime Continuous Rating' : 'توان پرایم پیوسته'}
                </span>
              </div>

              <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
                <span className="text-slate-400 block mb-0.5">
                  {isEn ? 'Fuel Consumption Rate' : 'نرخ مصرف سوخت گازوئیل'}
                </span>
                <span className="text-lg font-bold font-mono text-red-400">
                  {generatorSizing.fuelConsumptionLitersPerHour} L/h
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {isEn ? 'At 85% average load' : 'در بار میانگین ۸۵٪'}
                </span>
              </div>

              <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
                <span className="text-slate-400 block mb-0.5">
                  {isEn ? 'Min Fuel Tank Size' : 'حداقل حجم باک سوخت'}
                </span>
                <span className="text-lg font-bold font-mono text-sky-400">
                  {generatorSizing.minFuelTankSizeLiters} {isEn ? 'Liters' : 'لیتر'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {isEn ? `For ${outageHours}h autonomy` : `برای ${outageHours} ساعت کار مداوم`}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/60 text-xs text-slate-300">
              {isEn ? generatorSizing.notesEn : generatorSizing.notesFa}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-900/40 rounded-lg border border-slate-800 text-center text-xs text-slate-400 space-y-2">
            <Power className="w-6 h-6 text-slate-500 mx-auto" />
            <p>
              {isEn
                ? 'Diesel generator sizing is currently disabled. Check the toggle above to activate auxiliary genset sizing for substation & black-start power.'
                : 'ماژول دیزل ژنراتور اضطراری در حال حاضر غیرفعال است. با علامت زدن گزینه بالا، سایزینگ ژنراتور اضطراری برای مصارف داخلی پست و بلک‌استارت فعال می‌گردد.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
export default Simulation24hTab;
