import React, { useState } from 'react';
import { Droplet, Sun, Zap, Gauge, Compass, Activity, CheckCircle2 } from 'lucide-react';
import { calculateSolarPump, SolarPumpInput, SolarPumpResult } from '../engine/solarPumpEngine';

interface SolarPumpingTabProps {
  peakSunHours: number;
  lang?: 'fa' | 'en';
}

export const SolarPumpingTab: React.FC<SolarPumpingTabProps> = ({ peakSunHours, lang = 'fa' }) => {
  const isFa = lang === 'fa';
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

  const monthNamesEn = [
    'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
    'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'
  ];

  const maxMonthlyWater = Math.max(...pumpResult.monthlyWaterDeliveryM3);

  const [isEnabled, setIsEnabled] = useState<boolean>(true);

  return (
    <div className="space-y-6">
      {/* Title & Optional Activation Toggle */}
      <div className="studio-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
              <Droplet className="w-5 h-5 text-cyan-400 shrink-0" />
              {isFa
                ? 'ایستگاه پمپاژ خورشیدی کشاورزی و چاه‌های عمیق (Optional Solar Pumping)'
                : 'Agricultural Solar Water Pumping & Deep Wells (Optional Feature)'}
            </h1>
            <p className="text-slate-400 text-xs">
              {isFa
                ? 'قابلیت مهندسی اختیاری: محاسبه دقیق هد دینامیکی کل (TDH)، دبی آب، توان الکتروموتور شناور و درایو خورشیدی VFD بدون نیاز به باتری'
                : 'Optional engineering module: Total Dynamic Head (TDH), flow rate, submersible pump HP, and battery-less direct MPPT VFD inverter sizing.'}
            </p>
          </div>

          <label className="flex items-center gap-2.5 p-2 px-3 rounded-lg bg-slate-950 border border-slate-700 cursor-pointer text-xs font-bold text-cyan-300 shrink-0 self-start sm:self-auto">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-500"
            />
            {isEnabled
              ? (isFa ? 'ماژول پمپاژ فعال است' : 'Pumping Module Active')
              : (isFa ? 'فعال‌سازی ماژول پمپاژ آب' : 'Enable Solar Pumping')}
          </label>
        </div>
      </div>

      {!isEnabled && (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl">
          <Droplet className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-300 mb-1">
            {isFa ? 'سیستم پمپاژ خورشیدی آب غیرفعال است' : 'Solar Water Pumping Module is Disabled'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            {isFa
              ? 'این قابلیت برای پروژه‌های آبرسانی، کشاورزی و استخرهای ذخیره آب کاربرد دارد و مستقل از بخش مالی نیروگاه عمل می‌کند.'
              : 'Designed for agricultural irrigation, deep-well pumping, and reservoir storage without affecting commercial utility financial cash flows.'}
          </p>
          <button
            onClick={() => setIsEnabled(true)}
            className="studio-btn-primary text-xs py-2 px-4 rounded-lg font-bold"
          >
            {isFa ? 'فعال‌سازی محاسبات پمپاژ خورشیدی' : 'Enable Solar Pumping Calculations'}
          </button>
        </div>
      )}

      {isEnabled && (
        <>
          {/* Hydraulic Parameter Inputs */}
          <div className="studio-card">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {isFa ? 'عمق چاه آب (m):' : 'Well Depth (m):'}
                </label>
                <input
                  type="number"
                  step="5"
                  value={wellDepthM}
                  onChange={(e) => setWellDepthM(parseFloat(e.target.value) || 0)}
                  className="studio-input font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {isFa ? 'ارتفاع تا مخزن/استخر (m):' : 'Tank Height (m):'}
                </label>
                <input
                  type="number"
                  step="2"
                  value={tankHeightM}
                  onChange={(e) => setTankHeightM(parseFloat(e.target.value) || 0)}
                  className="studio-input font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {isFa ? 'طول خط انتقال لوله (m):' : 'Pipeline Length (m):'}
                </label>
                <input
                  type="number"
                  step="10"
                  value={pipeLengthM}
                  onChange={(e) => setPipeLengthM(parseFloat(e.target.value) || 0)}
                  className="studio-input font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {isFa ? 'قطر لوله پلی‌اتیلن (mm):' : 'Pipe Diameter (mm):'}
                </label>
                <select
                  value={pipeDiameterMm}
                  onChange={(e) => setPipeDiameterMm(parseInt(e.target.value) || 63)}
                  className="studio-input text-xs"
                >
                  <option value="50">50 mm (1.5")</option>
                  <option value="63">63 mm (2")</option>
                  <option value="75">75 mm (2.5")</option>
                  <option value="90">90 mm (3")</option>
                  <option value="110">110 mm (4")</option>
                  <option value="125">125 mm (5")</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {isFa ? 'دبی آب مورد نیاز (m³/day):' : 'Daily Water Demand (m³/d):'}
                </label>
                <input
                  type="number"
                  step="10"
                  value={dailyWaterRequirementM3}
                  onChange={(e) => setDailyWaterRequirementM3(parseFloat(e.target.value) || 10)}
                  className="studio-input font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {isFa ? 'روش آبیاری مزرعه:' : 'Irrigation Method:'}
                </label>
                <select
                  value={irrigationType}
                  onChange={(e) => setIrrigationType(e.target.value as any)}
                  className="studio-input text-xs"
                >
                  <option value="drip">{isFa ? 'قطره‌ای (۱.۵ بار فشار)' : 'Drip (1.5 bar pressure)'}</option>
                  <option value="sprinkler">{isFa ? 'بارانی (۲.۵ بار فشار)' : 'Sprinkler (2.5 bar pressure)'}</option>
                  <option value="flooding_storage">{isFa ? 'تخلیه آزاد در استخر / غرقابی' : 'Free Discharge / Storage Pool'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Hydraulic Sizing KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
              <div className="text-xs text-slate-400">
                {isFa ? 'هد دینامیکی کل (TDH)' : 'Total Dynamic Head (TDH)'}
              </div>
              <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                {pumpResult.totalDynamicHeadTdhM} <span className="text-xs font-normal text-slate-300">m</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {isFa
                  ? `استاتیک: ${pumpResult.staticHeadM}m + اصطکاک: ${pumpResult.frictionHeadM}m`
                  : `Static: ${pumpResult.staticHeadM}m + Friction: ${pumpResult.frictionHeadM}m`}
              </div>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
              <div className="text-xs text-slate-400">
                {isFa ? 'دبی خروجی پمپ (Flow Rate)' : 'Pump Flow Rate (Q)'}
              </div>
              <div className="text-xl font-bold font-mono text-sky-400 mt-1">
                {pumpResult.flowRateM3PerHour} <span className="text-xs font-normal text-slate-300">m³/h</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {isFa
                  ? `معادل ${pumpResult.flowRateLitersPerSecond} لیتر بر ثانیه`
                  : `Equivalent to ${pumpResult.flowRateLitersPerSecond} L/s`}
              </div>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
              <div className="text-xs text-slate-400">
                {isFa ? 'قدرت الکتروموتور شناور' : 'Motor Power Rating'}
              </div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {pumpResult.recommendedMotorPowerHp} <span className="text-xs font-normal text-slate-300">HP</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {isFa ? 'توان نامی:' : 'Rated power:'} {pumpResult.recommendedMotorPowerKw} kW
              </div>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
              <div className="text-xs text-slate-400">
                {isFa ? 'ظرفیت آرایه خورشیدی (PV)' : 'Recommended PV Capacity'}
              </div>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                {pumpResult.recommendedPvArrayKwp} <span className="text-xs font-normal text-slate-300">kWp</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {isFa ? 'اینورتر پمپ VFD:' : 'VFD Drive:'} {pumpResult.recommendedVfdDriveKw} kW
              </div>
            </div>
          </div>

          {/* 12-Month Water Delivery Volume Chart */}
          <div className="studio-card">
            <h3 className="font-bold text-sky-400 text-sm mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
              {isFa
                ? 'برآورد حجم آبدهی ماهانه چاه کشاورزی (۱۲ ماه سال - متر مکعب در ماه)'
                : '12-Month Estimated Agricultural Water Delivery Profile (m³/month)'}
            </h3>

            <div className="overflow-x-auto bg-slate-950 p-4 rounded-lg border border-slate-800 -mx-3 sm:mx-0">
              <div className="flex items-end justify-between gap-2 h-44 min-w-[550px] pt-4">
                {pumpResult.monthlyWaterDeliveryM3.map((vol, idx) => {
                  const heightPct = Math.round((vol / maxMonthlyWater) * 100);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <span className="font-mono text-[10px] text-cyan-300 font-bold">{vol.toLocaleString()}</span>
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full max-w-[36px] bg-gradient-to-t from-cyan-600 to-sky-400 rounded-t-md transition-all hover:opacity-80"
                      />
                      <span className="text-[10.5px] text-slate-400 whitespace-nowrap mt-1">
                        {isFa ? monthNamesFa[idx] : monthNamesEn[idx]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 space-y-1 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-700/60">
              {(isFa ? pumpResult.notesFa : pumpResult.notesFa.map((_, i) => [
                'Hydraulic TDH calculated based on static lift + friction losses in polyethylene piping.',
                'Direct solar drive operates via MPPT variable frequency drive (VFD) without chemical storage batteries.',
                'Submersible motor sized with a safety service factor of 1.25x for prolonged duty cycles.',
                'Water storage in ground reservoirs during high-irradiance midday hours acts as hydraulic battery storage.'
              ][i] || '')).map((note, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
