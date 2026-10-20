import React, { useState, useMemo } from 'react';
import {
  Layers,
  Wind,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Boxes,
  Hammer,
  Truck,
  Weight,
  Maximize2,
} from 'lucide-react';
import {
  calculateStructuralAndFoundations,
  FoundationType,
  SoilType,
  StructuralAnalysisResult,
} from '../engine/structuralEngine';

interface StructuralFoundationTabProps {
  totalModulesCount?: number;
  arrayTiltDeg?: number;
  lang?: 'fa' | 'en';
}

export const StructuralFoundationTab: React.FC<StructuralFoundationTabProps> = ({
  totalModulesCount = 140,
  arrayTiltDeg = 28,
  lang = 'fa',
}) => {
  const [modulesCount, setModulesCount] = useState<number>(totalModulesCount || 140);
  const [tiltDeg, setTiltDeg] = useState<number>(arrayTiltDeg || 28);
  const [modulesPerTable, setModulesPerTable] = useState<number>(28); // Standard 2P14 table
  const [basicWindSpeedKmh, setBasicWindSpeedKmh] = useState<number>(120); // 120 km/h standard in Iran
  const [groundSnowLoadKgM2, setGroundSnowLoadKgM2] = useState<number>(50); // 50 kg/m²
  const [groundClearanceM, setGroundClearanceM] = useState<number>(0.9); // 90 cm bottom clearance
  const [foundationType, setFoundationType] = useState<FoundationType>('rammed_steel_pile');
  const [soilType, setSoilType] = useState<SoilType>('dense_sand_gravel');

  const structResult: StructuralAnalysisResult = useMemo(() => {
    return calculateStructuralAndFoundations({
      totalModulesCount: modulesCount,
      moduleLengthM: 2.278,
      moduleWidthM: 1.134,
      moduleWeightKg: 28.5,
      tablesCount: Math.ceil(modulesCount / modulesPerTable),
      modulesPerTable,
      arrayTiltDeg: tiltDeg,
      groundClearanceM,
      basicWindSpeedKmh,
      groundSnowLoadKgM2,
      foundationType,
      soilType,
    });
  }, [
    modulesCount,
    tiltDeg,
    modulesPerTable,
    basicWindSpeedKmh,
    groundSnowLoadKgM2,
    groundClearanceM,
    foundationType,
    soilType,
  ]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-400" />
          {lang === 'fa'
            ? 'مهندسی سازه، بار باد، برف و محاسبات فونداسیون (Structural & Civil Foundations)'
            : 'Structural Engineering, Wind/Snow Loads & Civil Foundations Sizing'}
        </h1>
        <p className="text-slate-400 text-xs">
          {lang === 'fa'
            ? 'طراحی سازه بر اساس مبحث ششم مقررات ملی ساختمان و ASCE 7-22، محاسبه نیروی مکش باد، لنگر واژگونی، سایزینگ پایه‌های کوبشی فولادی و فونداسیون‌های بتنی'
            : 'Structural analysis per Iranian National Building Code Part 6 & ASCE 7-22: Wind uplift, overturning moments, rammed steel piles, and concrete pier sizing.'}
        </p>
      </div>

      {/* Control Parameters */}
      <div className="studio-card">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Hammer className="w-4 h-4 text-sky-400" />
          {lang === 'fa' ? 'مشخصات ژئوتکنیک، اقلیم باد و آرایش استراکچر:' : 'Geotechnical, Wind Speed & Structure Configuration:'}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'نوع فونداسیون سازه:' : 'Foundation Type:'}
            </label>
            <select
              value={foundationType}
              onChange={(e) => setFoundationType(e.target.value as FoundationType)}
              className="studio-input text-xs"
            >
              <option value="rammed_steel_pile">پایه‌های کوبشی فولادی C شکل (نیروگاه مگاواتی)</option>
              <option value="concrete_pier">فونداسیون استوانه‌ای بتن درجا (خاک سنگی/سخت)</option>
              <option value="ground_screw">شمع‌های پیچشی فولادی (Ground Screws)</option>
              <option value="rooftop_ballasted_block">بلوک‌های بتنی وزنی پشت‌بام (بدون سوراخ‌کاری)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'نوع خاک و مقاومت ژئوتکنیکی:' : 'Soil & Geotechnical Condition:'}
            </label>
            <select
              value={soilType}
              onChange={(e) => setSoilType(e.target.value as SoilType)}
              className="studio-input text-xs"
            >
              <option value="dense_sand_gravel">شن و ماسه متراکم (اصطکاک بالا)</option>
              <option value="medium_clay">خاک رسی متوسط تا سخت</option>
              <option value="loose_sand">ماسه سست و دشت‌های کویری</option>
              <option value="rocky_limestone">بستر سنگی و صخره‌ای</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'سرعت مبنای باد منطقه (km/h):' : 'Basic Wind Speed (km/h):'}
            </label>
            <select
              value={basicWindSpeedKmh}
              onChange={(e) => setBasicWindSpeedKmh(parseInt(e.target.value) || 120)}
              className="studio-input text-xs"
            >
              <option value="100">۱۰۰ کیلومتر بر ساعت (مناطق کم‌باد مرکزی)</option>
              <option value="120">۱۲۰ کیلومتر بر ساعت (استاندارد مبحث ۶ در فلات ایران)</option>
              <option value="140">۱۴۰ کیلومتر بر ساعت (بادهای شدید و کویری)</option>
              <option value="160">۱۶۰ کیلومتر بر ساعت (مناطق طوفانی مانند منجیل و خواف)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'بار برف مبنای زمین (kg/m²):' : 'Ground Snow Load (kg/m²):'}
            </label>
            <select
              value={groundSnowLoadKgM2}
              onChange={(e) => setGroundSnowLoadKgM2(parseInt(e.target.value) || 50)}
              className="studio-input text-xs"
            >
              <option value="0">۰ کیلوگرم بر مترمربع (مناطق گرمسیری جنوب)</option>
              <option value="30">۳۰ کیلوگرم بر مترمربع (مناطق نیمه‌خشک مرکزی)</option>
              <option value="50">۵۰ کیلوگرم بر مترمربع (استاندارد تهران، اصفهان، یزد)</option>
              <option value="100">۱۰۰ کیلوگرم بر مترمربع (مناطق سردسیر تبریز و مشهد)</option>
              <option value="150">۱۵۰ کیلوگرم بر مترمربع (مناطق کوهستانی پربرف)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'تعداد کل پنل‌ها:' : 'Total Module Units:'}
            </label>
            <input
              type="number"
              step="10"
              value={modulesCount}
              onChange={(e) => setModulesCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'تعداد پنل در هر میز سازه (Table):' : 'Modules per Table (2P):'}
            </label>
            <select
              value={modulesPerTable}
              onChange={(e) => setModulesPerTable(parseInt(e.target.value) || 28)}
              className="studio-input text-xs"
            >
              <option value="14">۱۴ پنل (۲ ردیف عمودی ۷ تایی)</option>
              <option value="20">۲۰ پنل (۲ ردیف عمودی ۱۰ تایی)</option>
              <option value="28">۲۸ پنل (۲ ردیف عمودی ۱۴ تایی - استاندارد استرینگ)</option>
              <option value="56">۵۶ پنل (میز دوبل ۴ ردیفه)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'زاویه شیب استراکچر (درجه):' : 'Array Tilt Angle (deg):'}
            </label>
            <input
              type="number"
              min="10"
              max="50"
              value={tiltDeg}
              onChange={(e) => setTiltDeg(parseFloat(e.target.value) || 25)}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'فاصله زیر پنل از زمین (Ground Clearance):' : 'Bottom Clearance (m):'}
            </label>
            <input
              type="number"
              step="0.1"
              min="0.4"
              max="2.5"
              value={groundClearanceM}
              onChange={(e) => setGroundClearanceM(parseFloat(e.target.value) || 0.8)}
              className="studio-input font-mono"
            />
          </div>
        </div>
      </div>

      {/* Structural Force Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">فشار سرعتی باد (q_z)</div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
            {structResult.velocityWindPressureQzN_M2} <span className="text-xs font-normal">N/m²</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            فشار طراحی باد طبق مبحث ۶
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">نیروی مکش باد بر هر میز (Uplift)</div>
          <div className="text-xl font-bold font-mono text-red-400 mt-1">
            {structResult.windUpliftForceKn} <span className="text-xs font-normal">kN</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            بحرانی‌ترین بار برای فونداسیون
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">نیروی کشش هر پایه (Per Post)</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {structResult.upliftPerPostKn} <span className="text-xs font-normal">kN</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            مقاومت بیرون‌کشیدگی مورد نیاز
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">ضریب اطمینان واژگونی (FoS)</div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              structResult.isStructurallySafe ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {structResult.fosOverturning}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            {structResult.isStructurallySafe ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> مجاز (حداقل ۱.۵)
              </span>
            ) : (
              <span className="text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> ناپایدار
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Structural Engineering & Civil BOM Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Box 1: Foundation Technical Specifications */}
        <div className="studio-card">
          <h3 className="text-sm font-bold text-sky-400 mb-3 flex items-center gap-2">
            <Boxes className="w-4 h-4 text-emerald-400" />
            {lang === 'fa' ? 'مشخصات ژئوتکنیکی و ابعاد فونداسیون:' : 'Foundation & Geotechnical Sizing:'}
          </h3>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">نوع فونداسیون منتخب:</span>
              <strong className="text-white">{structResult.foundationNameFa}</strong>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">ابعاد و عمق نفوذ در خاک:</span>
              <span className="font-mono text-amber-300">{structResult.foundationDimensionsDesc}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">تعداد کل میزهای سازه (Tables):</span>
              <span className="font-mono text-sky-300">
                {structResult.totalTablesCount} میز ({structResult.postsPerTable} پایه در هر میز)
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">تعداد کل پایه‌ها / شمع‌های کوبشی:</span>
              <strong className="font-mono text-emerald-400">{structResult.totalPostsCount} پایه</strong>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">نیروی فشاری روی هر پایه (Compression):</span>
              <span className="font-mono text-slate-200">{structResult.compressionPerPostKn} kN</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-400">نیروی برشی جانبی هر پایه (Lateral Shear):</span>
              <span className="font-mono text-slate-200">{structResult.lateralShearPerPostKn} kN</span>
            </div>
          </div>
        </div>

        {/* Box 2: Civil Works Bill of Materials (BOM) */}
        <div className="studio-card">
          <h3 className="text-sm font-bold text-sky-400 mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-purple-400" />
            {lang === 'fa' ? 'احجام عملیات عمرانی و متره مواد مصرفی (Civil BOM):' : 'Civil Bill of Materials (BOM):'}
          </h3>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">حجم کل بتن‌ریزی فونداسیون:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {structResult.concreteVolumeTotalM3} m³ {structResult.concreteVolumeTotalM3 === 0 && '(صفر در روش پایه‌های کوبشی)'}
              </span>
            </div>
            {structResult.concreteVolumeTotalM3 > 0 && (
              <>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">تعداد کیسه سیمان مورد نیاز (C25):</span>
                  <span className="font-mono text-sky-300">~{structResult.cementBagsCount} کیسه ۵۰ کیلویی</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">شن و ماسه شسته:</span>
                  <span className="font-mono text-slate-200">{structResult.sandGravelTon} تن</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">وزن کل آرماتور و میلگرد مسلح:</span>
                  <span className="font-mono text-amber-300">{structResult.steelRebarWeightTotalKg} kg</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">وزن کل استراکچر فولادی گالوانیزه:</span>
              <span className="font-mono font-bold text-white">
                {(structResult.structuralSteelRackingWeightKg / 1000).toFixed(1)} تن فولاد گالوانیزه گرم
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-400">مساحت ناخالص اشغال‌شده سازه‌ها:</span>
              <span className="font-mono text-slate-200">{structResult.totalArrayAreaM2.toLocaleString()} m²</span>
            </div>
          </div>
        </div>
      </div>

      {/* Engineering Signoff Banner */}
      <div className="studio-card bg-slate-900/90 border border-slate-800">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400 mt-0.5">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white mb-1">
              {lang === 'fa' ? 'تطابق با آیین‌نامه‌های طراحی سازه و فونداسیون:' : 'Design Codes & Standards Compliance:'}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-2">
              {structResult.engineeringRemarksFa}
            </p>
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 font-mono">
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">مبحث ۶ مقررات ملی ساختمان</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">ASCE 7-22 Wind Criteria</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">ACI 318 Concrete Piers</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">ASTM A123 Hot-Dip Galvanizing</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
