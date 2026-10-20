import React, { useState } from 'react';
import {
  Battery as BatteryIcon,
  Shield,
  RefreshCw,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Award,
  Clock,
  Layers,
  Boxes,
  Weight,
  Maximize2,
  Sliders,
} from 'lucide-react';
import {
  BatteryChemistry,
  BATTERY_CHEMISTRIES,
  BatteryBankSizingResult,
} from '../engine/batteryEngine';

interface BessTabProps {
  selectedChemistry: BatteryChemistry;
  onChemistryChange: (chem: BatteryChemistry) => void;
  autonomyDays: number;
  onAutonomyDaysChange: (days: number) => void;
  batterySizing: BatteryBankSizingResult;
  systemTopology?: 'on_grid' | 'off_grid' | 'hybrid';
  onTopologyChange?: (topology: 'on_grid' | 'off_grid' | 'hybrid') => void;
  lang?: 'fa' | 'en';
}

export const BessTab: React.FC<BessTabProps> = ({
  selectedChemistry,
  onChemistryChange,
  autonomyDays,
  onAutonomyDaysChange,
  batterySizing,
  systemTopology = 'off_grid',
  onTopologyChange,
  lang = 'fa',
}) => {
  // Customizable unit battery model selection
  const [unitVoltageV, setUnitVoltageV] = useState<number>(
    selectedChemistry === 'lifepo4' && batterySizing.systemVoltageVdc === 48 ? 48 : 12
  );
  const [unitCapacityAh, setUnitCapacityAh] = useState<number>(100);
  const [unitWeightKg, setUnitWeightKg] = useState<number>(32);

  // Recalculate series & parallel with chosen unit
  const calculatedSeries = Math.max(1, Math.round(batterySizing.systemVoltageVdc / unitVoltageV));
  const calculatedParallel = Math.max(1, Math.ceil(batterySizing.totalCapacityAh / unitCapacityAh));
  const calculatedTotalUnits = calculatedSeries * calculatedParallel;
  const totalWeightKg = calculatedTotalUnits * unitWeightKg;
  const totalFootprintM2 = Number((calculatedTotalUnits * 0.18).toFixed(2)); // approx 0.18m² per unit with rack clearance

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
          <BatteryIcon className="w-5 h-5 text-indigo-400" />
          {lang === 'fa'
            ? 'سیستم ذخیره‌ساز انرژی باتری، انتخاب سایز و تعداد واحدها (BESS Sizing & Architecture)'
            : 'Battery Energy Storage System (BESS) Sizing, Unit Quantity & Physical Layout'}
        </h1>
        <p className="text-slate-400 text-xs">
          {lang === 'fa'
            ? 'محاسبه دقیق ظرفیت بانک باتری (Ah & kWh)، تعداد باتری سری و موازی، نرخ دشارژ C-Rate، وزن و فضای فیزیکی مورد نیاز در اتاق باتری'
            : 'Precise battery bank sizing (Ah & kWh), series & parallel unit calculations, C-Rate discharge safety, and physical footprint.'}
        </p>
      </div>

      {/* On-Grid / Powerplant Notice */}
      {systemTopology === 'on_grid' && (
        <div className="p-4 bg-amber-950/40 border border-amber-600/50 rounded-lg text-xs text-amber-200 flex items-start justify-between gap-3 shadow-md">
          <div className="flex items-start gap-2.5">
            <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white text-sm block mb-0.5">
                {lang === 'fa'
                  ? 'وضعیت اتصال به شبکه: نیروگاه خورشیدی آن‌گرید (On-Grid Utility Mode)'
                  : 'System Configuration: Grid-Tied On-Grid Mode'}
              </strong>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {lang === 'fa'
                  ? 'در نیروگاه‌های متصل به شبکه (On-Grid)، به طور استاندارد نیازی به محاسبه و نصب باتری نیست و برق خورشیدی مستقیماً به شبکه سراسری تزریق می‌شود. در صورتی که تمایل به سیستم هیبرید با پشتیبان اضطراری قطعی برق یا سیستم آربیتراژ انرژی دارید، می‌توانید سیستم را به Hybrid تغییر دهید.'
                  : 'In standard grid-tied utility powerplants, no battery storage is required. If you desire backup power for summer outages or time-of-use arbitrage, switch system topology to Hybrid.'}
              </p>
            </div>
          </div>
          {onTopologyChange && (
            <button
              onClick={() => onTopologyChange('hybrid')}
              className="studio-btn-primary text-xs py-1.5 px-3 whitespace-nowrap shrink-0"
            >
              {lang === 'fa' ? 'تغییر به سیستم هیبرید (با باتری)' : 'Switch to Hybrid System'}
            </button>
          )}
        </div>
      )}

      {/* Chemistry Selector Cards */}
      <div className="studio-card">
        <label className="block text-xs font-semibold text-slate-300 mb-2">
          {lang === 'fa' ? 'انتخاب فناوری شیمیایی باتری:' : 'Select Battery Chemistry:'}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(BATTERY_CHEMISTRIES).map(([chemKey, profile]) => {
            const isSelected = selectedChemistry === chemKey;
            return (
              <div
                key={chemKey}
                onClick={() => onChemistryChange(chemKey as BatteryChemistry)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-indigo-950/60 border-indigo-400 shadow-md ring-1 ring-indigo-400'
                    : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-white">{profile.nameFa}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                </div>
                <div className="space-y-0.5 text-[10.5px] text-slate-300">
                  <div>عمق دشارژ مجاز (DoD): <strong className="text-sky-300">{profile.recommendedDoDPct}%</strong></div>
                  <div>طول عمر سیکلی: <strong className="text-emerald-300">{profile.standardCycleLifeAt80DoD} سیکل</strong></div>
                  <div>حداکثر دشارژ پیوسته: <strong className="text-amber-300">{profile.maxContinuousCRate}C</strong></div>
                  <div>طول عمر معمول: <strong className="text-purple-300">{profile.typicalLifespanYears} سال</strong></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Autonomy Days Control & Unit Sizing */}
      <div className="studio-card">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-400" />
          {lang === 'fa' ? 'تنظیم روزهای خودمختاری و مشخصات هر واحد باتری:' : 'Autonomy Days & Single Unit Battery Specifications:'}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'روزهای خودمختاری (Autonomy Days):' : 'Days of Autonomy:'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.5"
                value={autonomyDays}
                onChange={(e) => onAutonomyDaysChange(parseFloat(e.target.value) || 1)}
                className="w-full accent-indigo-400"
              />
              <span className="font-mono text-sm font-bold text-indigo-400 w-16">
                {autonomyDays} روز
              </span>
            </div>
            <span className="text-[10px] text-slate-400">تعداد روزهای بدون تابش تحت بار شب</span>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'ولتاژ نامی هر واحد باتری:' : 'Nominal Voltage per Unit:'}
            </label>
            <select
              value={unitVoltageV}
              onChange={(e) => setUnitVoltageV(parseInt(e.target.value) || 12)}
              className="studio-input text-xs font-mono"
            >
              <option value="12">۱۲ ولت (استاندارد سیلد لید/ژل/لیتیوم)</option>
              <option value="24">۲۴ ولت (بلوک‌های صنعتی)</option>
              <option value="48">۴۸ ولت (ماژول‌های رکمونت مخابراتی)</option>
              <option value="51.2">۵۱.۲ ولت (ماژول‌های ۱۶ سلولی LiFePO4)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'ظرفیت هر واحد باتری (Ah):' : 'Unit Nominal Capacity (Ah):'}
            </label>
            <select
              value={unitCapacityAh}
              onChange={(e) => setUnitCapacityAh(parseInt(e.target.value) || 100)}
              className="studio-input text-xs font-mono"
            >
              <option value="50">۵۰ آمپر ساعت (50 Ah)</option>
              <option value="100">۱۰۰ آمپر ساعت (100 Ah - رایج‌ترین)</option>
              <option value="150">۱۵۰ آمپر ساعت (150 Ah)</option>
              <option value="200">۲۰۰ آمپر ساعت (200 Ah - ژل خورشیدی)</option>
              <option value="280">۲۸۰ آمپر ساعت (280 Ah - سلول بزرگ EVE)</option>
              <option value="300">۳۰۰ آمپر ساعت (300 Ah)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'وزن تقریبی هر واحد (کیلوگرم):' : 'Weight per Unit (kg):'}
            </label>
            <input
              type="number"
              min="5"
              max="150"
              value={unitWeightKg}
              onChange={(e) => setUnitWeightKg(parseFloat(e.target.value) || 30)}
              className="studio-input font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* Battery Sizing & Unit Quantity Matrix */}
      <div className="studio-card">
        <h3 className="font-bold text-sky-400 text-sm mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          {lang === 'fa'
            ? 'ماتریس محاسباتی تعداد و ابعاد فیزیکی بانک باتری:'
            : 'Battery Sizing Matrix & Physical Quantity:'}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
          <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
            <span className="text-slate-400 block mb-0.5">ظرفیت کل ناخالص</span>
            <span className="text-lg font-bold font-mono text-indigo-400">
              {batterySizing.grossCapacityKwh.toFixed(1)} kWh
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
              {batterySizing.totalCapacityAh} Ah در ولتاژ {batterySizing.systemVoltageVdc}V DC
            </span>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
            <span className="text-slate-400 block mb-0.5">ظرفیت قابل استفاده (Net Usable)</span>
            <span className="text-lg font-bold font-mono text-emerald-400">
              {batterySizing.usableCapacityKwh.toFixed(1)} kWh
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              با DoD مجاز {batterySizing.chemistry.recommendedDoDPct}%
            </span>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
            <span className="text-slate-400 block mb-0.5">تعداد کل باتری‌های مورد نیاز</span>
            <span className="text-lg font-bold font-mono text-sky-400">
              {calculatedTotalUnits} عدد باتری
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {calculatedParallel} استرینگ موازی × {calculatedSeries} باتری سری
            </span>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
            <span className="text-slate-400 block mb-0.5">وزن و مساحت اتاق باتری</span>
            <span className="text-lg font-bold font-mono text-purple-400">
              {totalWeightKg.toLocaleString()} kg
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              مساحت اشغال رک: ~{totalFootprintM2} m²
            </span>
          </div>
        </div>

        {/* Physical Rack Arrangement Box */}
        <div className="p-3 bg-slate-900 rounded border border-slate-800 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Boxes className="w-6 h-6 text-indigo-400" />
            <div>
              <span className="font-bold text-white block">
                {lang === 'fa' ? 'پیشنهاد جانمایی و استراکچر رک باتری:' : 'Battery Rack Layout Recommendation:'}
              </span>
              <span className="text-slate-400 text-[11px]">
                {calculatedSeries === 1
                  ? `۱ رک استاندارد با ${calculatedParallel} ماژول موازی`
                  : `${Math.ceil(calculatedTotalUnits / 8)} رک باتری صنعتی ۴ طبقه با کابل‌های رابط مسی منعطف`}
              </span>
            </div>
          </div>
          <div className="font-mono text-sky-300 text-xs">
            پیکربندی باس‌بار: {calculatedSeries}S {calculatedParallel}P ({batterySizing.systemVoltageVdc}V DC)
          </div>
        </div>

        {/* C-Rate & Current Limits */}
        <div className="mt-3 p-3 bg-slate-900/60 rounded-lg border border-slate-700/60 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <span className="text-slate-400 block">جریان دشارژ پیوسته دائم:</span>
            <span className="text-white font-mono font-bold text-sm">
              {batterySizing.continuousDischargeCurrentAmps.toFixed(1)} آمپر
            </span>
            <span className="text-[10px] text-slate-400 block">
              نرخ دشارژ واقعی: {batterySizing.actualContinuousCRate.toFixed(2)}C
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">جریان دشارژ لحظه‌ای هجومی (Peak Surge):</span>
            <span className="text-red-400 font-mono font-bold text-sm">
              {batterySizing.peakSurgeDischargeCurrentAmps.toFixed(1)} آمپر
            </span>
            <span className="text-[10px] text-slate-400 block">جهت استارت بارهای موتوری</span>
          </div>
          <div>
            <span className="text-slate-400 block">تخمین طول عمر مفید و سیکل:</span>
            <span className="text-emerald-400 font-mono font-bold text-sm">
              ~{batterySizing.estimatedLifespanYears} سال
            </span>
            <span className="text-[10px] text-slate-400 block">
              معادل {batterySizing.expectedTotalCycles.toLocaleString()} سیکل شارژ
            </span>
          </div>
        </div>

        {/* Warnings */}
        {batterySizing.warnings.length > 0 && (
          <div className="mt-3 p-2.5 bg-red-950/40 border border-red-600/50 rounded-lg text-xs text-red-200 space-y-1">
            {batterySizing.warnings.map((w, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
