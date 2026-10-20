import React, { useState } from 'react';
import { Droplet, Sun, Zap, Gauge, Compass, Activity, CheckCircle2 } from 'lucide-react';
import { calculateSolarPump, SolarPumpInput, SolarPumpResult } from '../engine/solarPumpEngine';

interface SolarPumpingTabProps {
  peakSunHours: number;
}

export const SolarPumpingTab: React.FC<SolarPumpingTabProps> = ({ peakSunHours }) => {
  const [wellDepthM, setWellDepthM] = useState<number>(60);
  const [tankHeightM, setTankHeightM] = useState<number>(10);
  const [pipeLengthM, setPipeLengthM] = useState<number>(150);
  const [pipeDiameterMm, setPipeDiameterMm] = useState<number>(90);
  const [dailyWaterRequirementM3, setDailyWaterRequirementM3] = useState<number>(120);
  const [irrigationType, setIrrigationType] = useState<'drip' | 'sprinkler' | 'flooding_storage'>('drip');

  const pumpResult: SolarPumpResult = calculateSolarPump({
    wellDepthM,
    tankHeightM,
    pipeLengthM,
    pipeDiameterMm,
    dailyWaterRequirementM3,
    irrigationType,
    peakSunHours,
  });

  const monthNamesFa = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];

  const maxMonthlyWater = Math.max(...pumpResult.monthlyWaterDeliveryM3);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
          <Droplet className="w-5 h-5 text-cyan-400" />
          ایستگاه پمپاژ خورشیدی کشاورزی و چاه‌های عمیق (Solar Agricultural Pumping)
        </h1>
        <p className="text-slate-400 text-xs">
          محاسبه دقیق هد دینامیکی کل (TDH)، افت اصطکاک لوله‌ها، توان الکتروموتور شناور، درایو VFD اینورتر پمپ و آرایه خورشیدی مستقیم بدون نیاز به باتری
        </p>
      </div>

      {/* Hydraulic Parameter Inputs */}
      <div className="studio-card">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">عمق چاه آب (m):</label>
            <input
              type="number"
              step="5"
              value={wellDepthM}
              onChange={(e) => setWellDepthM(parseFloat(e.target.value) || 0)}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">ارتفاع تا مخزن/استخر (m):</label>
            <input
              type="number"
              step="2"
              value={tankHeightM}
              onChange={(e) => setTankHeightM(parseFloat(e.target.value) || 0)}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">طول خط انتقال لوله (m):</label>
            <input
              type="number"
              step="10"
              value={pipeLengthM}
              onChange={(e) => setPipeLengthM(parseFloat(e.target.value) || 0)}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">قطر لوله پلی‌اتیلن (mm):</label>
            <select
              value={pipeDiameterMm}
              onChange={(e) => setPipeDiameterMm(parseInt(e.target.value) || 63)}
              className="studio-input text-xs"
            >
              <option value="50">۵۰ میلی‌متر (۱.۵ اینچ)</option>
              <option value="63">۶۳ میلی‌متر (۲ اینچ)</option>
              <option value="75">۷۵ میلی‌متر (۲.۵ اینچ)</option>
              <option value="90">۹۰ میلی‌متر (۳ اینچ)</option>
              <option value="110">۱۱۰ میلی‌متر (۴ اینچ)</option>
              <option value="125">۱۲۵ میلی‌متر (۵ اینچ)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">دبی آب مورد نیاز (m³/day):</label>
            <input
              type="number"
              step="10"
              value={dailyWaterRequirementM3}
              onChange={(e) => setDailyWaterRequirementM3(parseFloat(e.target.value) || 10)}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">روش آبیاری مزرعه:</label>
            <select
              value={irrigationType}
              onChange={(e) => setIrrigationType(e.target.value as any)}
              className="studio-input text-xs"
            >
              <option value="drip">قطره‌ای (۱.۵ بار فشار)</option>
              <option value="sprinkler">بارانی (۲.۵ بار فشار)</option>
              <option value="flooding_storage">تخلیه آزاد در استخر / غرقابی</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hydraulic Sizing KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">هد دینامیکی کل (TDH)</div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
            {pumpResult.totalDynamicHeadTdhM} <span className="text-xs font-normal text-slate-300">متر</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            استاتیک: {pumpResult.staticHeadM}m + اصطکاک: {pumpResult.frictionHeadM}m
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">دبی خروجی پمپ (Flow Rate)</div>
          <div className="text-xl font-bold font-mono text-sky-400 mt-1">
            {pumpResult.flowRateM3PerHour} <span className="text-xs font-normal text-slate-300">m³/h</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            معادل {pumpResult.flowRateLitersPerSecond} لیتر بر ثانیه
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">قدرت الکتروموتور شناور</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {pumpResult.recommendedMotorPowerHp} <span className="text-xs font-normal text-slate-300">HP</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            توان نامی: {pumpResult.recommendedMotorPowerKw} kW
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">ظرفیت آرایه خورشیدی (PV)</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {pumpResult.recommendedPvArrayKwp} <span className="text-xs font-normal text-slate-300">kWp</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            اینورتر پمپ VFD: {pumpResult.recommendedVfdDriveKw} kW
          </div>
        </div>
      </div>

      {/* 12-Month Water Delivery Volume Chart */}
      <div className="studio-card">
        <h3 className="font-bold text-sky-400 text-sm mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          برآورد حجم آبدهی ماهانه چاه کشاورزی (۱۲ ماه سال - متر مکعب در ماه)
        </h3>

        <div className="overflow-x-auto bg-slate-950 p-4 rounded-lg border border-slate-800">
          <div className="flex items-end justify-between gap-2 h-44 min-w-[650px] pt-4">
            {pumpResult.monthlyWaterDeliveryM3.map((vol, idx) => {
              const heightPct = Math.round((vol / maxMonthlyWater) * 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="font-mono text-[10px] text-cyan-300 font-bold">{vol.toLocaleString()}</span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[36px] bg-gradient-to-t from-cyan-600 to-sky-400 rounded-t-md transition-all hover:opacity-80"
                  />
                  <span className="text-[10.5px] text-slate-400 whitespace-nowrap mt-1">{monthNamesFa[idx]}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 space-y-1 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-700/60">
          {pumpResult.notesFa.map((note, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <span>{note}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
