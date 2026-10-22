import React, { useState, useMemo, useEffect } from 'react';
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
  Database,
  Calendar,
  RotateCcw,
  ThermometerSnowflake,
  CloudRain,
  MapPin,
} from 'lucide-react';
import {
  calculateStructuralAndFoundations,
  FoundationType,
  SoilType,
  StructuralAnalysisResult,
} from '../engine/structuralEngine';
import { ClimateCity, SiteGeotechnicalOverrides } from '../engine/climaticData';

interface StructuralFoundationTabProps {
  totalModulesCount?: number;
  arrayTiltDeg?: number;
  city?: ClimateCity;
  siteOverrides?: SiteGeotechnicalOverrides;
  onUpdateSiteOverrides?: (overrides: SiteGeotechnicalOverrides) => void;
  lang?: 'fa' | 'en';
}

export const StructuralFoundationTab: React.FC<StructuralFoundationTabProps> = ({
  totalModulesCount = 140,
  arrayTiltDeg = 28,
  city = {
    id: 'tehran',
    nameFa: 'تهران',
    nameEn: 'Tehran',
    provinceFa: 'تهران',
    provinceEn: 'Tehran',
    latitude: 35.6892,
    longitude: 51.389,
    elevationM: 1190,
    peakSunHours: 5.35,
    tempMinC: -10,
    tempMaxC: 42,
    albedo: 0.2,
    soilingLossPct: 4.5,
    optimalTiltAnnualDeg: 32,
    optimalTiltWinterDeg: 47,
    optimalTiltSummerDeg: 17,
    descriptionFa: '',
    descriptionEn: '',
    basicWindSpeedKmh: 130,
    groundSnowLoadKgM2: 100,
    annualRainfallMm: 230,
    soilType: 'dense_sand_gravel',
    soilBearingCapacityKpa: 250,
    soilInternalFrictionAngleDeg: 34,
    soilCohesionKpa: 15,
    soilDensityKnM3: 18.5,
    frostDepthCm: 40,
    seismicZoneCoefficientA: 0.35,
    dataSourceFa: 'مبحث ۶ مقررات ملی ساختمان و مرکز تحقیقات راه، مسکن و شهرسازی',
    dataSourceEn: 'INBC Part 6 & Road, Housing and Urban Dev. Research Center (BHRC)',
    dataRetrievalDate: '2024-06-15',
  },
  siteOverrides,
  onUpdateSiteOverrides,
  lang = 'fa',
}) => {
  const isEn = lang === 'en';

  // Geometry parameters
  const [modulesCount, setModulesCount] = useState<number>(totalModulesCount || 140);
  const [tiltDeg, setTiltDeg] = useState<number>(arrayTiltDeg || 28);
  const [modulesPerTable, setModulesPerTable] = useState<number>(28);
  const [groundClearanceM, setGroundClearanceM] = useState<number>(0.9);
  const [foundationType, setFoundationType] = useState<FoundationType>('rammed_steel_pile');

  // Geotechnical and climate parameters (initialized from city / overrides)
  const [basicWindSpeedKmh, setBasicWindSpeedKmh] = useState<number>(
    siteOverrides?.basicWindSpeedKmh ?? city.basicWindSpeedKmh ?? 120
  );
  const [groundSnowLoadKgM2, setGroundSnowLoadKgM2] = useState<number>(
    siteOverrides?.groundSnowLoadKgM2 ?? city.groundSnowLoadKgM2 ?? 50
  );
  const [annualRainfallMm, setAnnualRainfallMm] = useState<number>(
    siteOverrides?.annualRainfallMm ?? city.annualRainfallMm ?? 200
  );
  const [soilType, setSoilType] = useState<SoilType>(
    (siteOverrides?.soilType ?? city.soilType ?? 'dense_sand_gravel') as SoilType
  );
  const [soilBearingCapacityKpa, setSoilBearingCapacityKpa] = useState<number>(
    siteOverrides?.soilBearingCapacityKpa ?? city.soilBearingCapacityKpa ?? 220
  );
  const [soilFrictionAngleDeg, setSoilFrictionAngleDeg] = useState<number>(
    siteOverrides?.soilInternalFrictionAngleDeg ?? city.soilInternalFrictionAngleDeg ?? 32
  );
  const [soilCohesionKpa, setSoilCohesionKpa] = useState<number>(
    siteOverrides?.soilCohesionKpa ?? city.soilCohesionKpa ?? 15
  );
  const [soilDensityKnM3, setSoilDensityKnM3] = useState<number>(
    siteOverrides?.soilDensityKnM3 ?? city.soilDensityKnM3 ?? 18.0
  );
  const [frostDepthCm, setFrostDepthCm] = useState<number>(
    siteOverrides?.frostDepthCm ?? city.frostDepthCm ?? 30
  );
  const [seismicZoneA, setSeismicZoneA] = useState<number>(
    siteOverrides?.seismicZoneCoefficientA ?? city.seismicZoneCoefficientA ?? 0.30
  );

  // Sync when city changes
  useEffect(() => {
    if (!siteOverrides) {
      setBasicWindSpeedKmh(city.basicWindSpeedKmh ?? 120);
      setGroundSnowLoadKgM2(city.groundSnowLoadKgM2 ?? 50);
      setAnnualRainfallMm(city.annualRainfallMm ?? 200);
      setSoilType((city.soilType ?? 'dense_sand_gravel') as SoilType);
      setSoilBearingCapacityKpa(city.soilBearingCapacityKpa ?? 220);
      setSoilFrictionAngleDeg(city.soilInternalFrictionAngleDeg ?? 32);
      setSoilCohesionKpa(city.soilCohesionKpa ?? 15);
      setSoilDensityKnM3(city.soilDensityKnM3 ?? 18.0);
      setFrostDepthCm(city.frostDepthCm ?? 30);
      setSeismicZoneA(city.seismicZoneCoefficientA ?? 0.30);
    }
  }, [city.id]);

  const handleUpdateParam = (updated: Partial<SiteGeotechnicalOverrides>) => {
    const newOverrides: SiteGeotechnicalOverrides = {
      basicWindSpeedKmh,
      groundSnowLoadKgM2,
      annualRainfallMm,
      soilType,
      soilBearingCapacityKpa,
      soilInternalFrictionAngleDeg: soilFrictionAngleDeg,
      soilCohesionKpa,
      soilDensityKnM3,
      frostDepthCm,
      seismicZoneCoefficientA: seismicZoneA,
      ...updated,
    };
    if (onUpdateSiteOverrides) {
      onUpdateSiteOverrides(newOverrides);
    }
  };

  const handleResetToDefaults = () => {
    setBasicWindSpeedKmh(city.basicWindSpeedKmh ?? 120);
    setGroundSnowLoadKgM2(city.groundSnowLoadKgM2 ?? 50);
    setAnnualRainfallMm(city.annualRainfallMm ?? 200);
    setSoilType((city.soilType ?? 'dense_sand_gravel') as SoilType);
    setSoilBearingCapacityKpa(city.soilBearingCapacityKpa ?? 220);
    setSoilFrictionAngleDeg(city.soilInternalFrictionAngleDeg ?? 32);
    setSoilCohesionKpa(city.soilCohesionKpa ?? 15);
    setSoilDensityKnM3(city.soilDensityKnM3 ?? 18.0);
    setFrostDepthCm(city.frostDepthCm ?? 30);
    setSeismicZoneA(city.seismicZoneCoefficientA ?? 0.30);
    if (onUpdateSiteOverrides) {
      onUpdateSiteOverrides({});
    }
  };

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
      soilBearingCapacityKpa,
      soilInternalFrictionAngleDeg: soilFrictionAngleDeg,
      soilCohesionKpa,
      soilDensityKnM3,
      annualRainfallMm,
      frostDepthCm,
      seismicZoneCoefficientA: seismicZoneA,
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
    soilBearingCapacityKpa,
    soilFrictionAngleDeg,
    soilCohesionKpa,
    soilDensityKnM3,
    annualRainfallMm,
    frostDepthCm,
    seismicZoneA,
  ]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-400" />
          {isEn
            ? 'Structural Engineering, Geotechnical Soil & Civil Foundations Sizing'
            : 'مهندسی سازه، داده‌های خاک، باد، برف و محاسبات فونداسیون'}
        </h1>
        <p className="text-slate-400 text-xs">
          {isEn
            ? 'Design conforming to INBC Part 6 & ASCE 7-22: Wind uplift forces, overturning moments, soil bearing capacity verification, rammed steel C-piles, and cast-in-place concrete piers.'
            : 'طراحی سازه بر اساس مبحث ششم مقررات ملی ساختمان و ASCE 7-22، محاسبه نیروی مکش باد، لنگر واژگونی، تنش باربری مجاز خاک، سایزینگ پایه‌های کوبشی فولادی و فونداسیون‌های بتنی.'}
        </p>
      </div>

      {/* Geotechnical & Climatic Site Data Card (Automated with Manual Override) */}
      <div className="studio-card border border-sky-800/40 bg-slate-900/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-700/80 gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-sky-500/10 border border-sky-500/30 rounded text-sky-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{isEn ? 'Site Geotechnical, Soil & Climatic Parameters' : 'اطلاعات ژئوتکنیک، خاک و اقلیم سایت پروژه:'}</span>
                <span className="text-xs font-normal text-sky-400 flex items-center gap-1 font-mono">
                  <MapPin className="w-3 h-3" />
                  {isEn ? city.nameEn : city.nameFa}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap mt-0.5">
                <span>
                  {isEn ? 'Source:' : 'مرجع داده:'} <strong className="text-slate-300">{isEn ? city.dataSourceEn : city.dataSourceFa}</strong>
                </span>
                <span>•</span>
                <span>
                  {isEn ? 'Retrieved:' : 'تاریخ دریافت:'} <span className="font-mono text-amber-400">{city.dataRetrievalDate}</span>
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={handleResetToDefaults}
            className="text-xs px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 self-start sm:self-auto"
            title={isEn ? 'Reset to official weather station defaults' : 'بازنشانی مقادیر به داده‌های رسمی ایستگاه'}
          >
            <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
            <span>{isEn ? 'Reset to Climate Defaults' : 'بازنشانی به پیش‌فرض اقلیم'}</span>
          </button>
        </div>

        {/* 9 Geotechnical & Climatic Editable Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {/* Wind Speed */}
          <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700">
            <label className="text-[11px] text-slate-300 font-semibold block mb-1 flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isEn ? 'Basic Wind Speed:' : 'سرعت مبنای باد (V_b):'}</span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="5"
                min="80"
                max="200"
                value={basicWindSpeedKmh}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 120;
                  setBasicWindSpeedKmh(val);
                  handleUpdateParam({ basicWindSpeedKmh: val });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono font-bold"
              />
              <span className="text-slate-400 text-[10px]">km/h</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block font-mono">
              = {(basicWindSpeedKmh / 3.6).toFixed(1)} m/s
            </span>
          </div>

          {/* Ground Snow Load */}
          <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700">
            <label className="text-[11px] text-slate-300 font-semibold block mb-1 flex items-center gap-1">
              <ThermometerSnowflake className="w-3.5 h-3.5 text-sky-300" />
              <span>{isEn ? 'Ground Snow (S_k):' : 'بار برف مبنای زمین:'}</span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="10"
                min="0"
                max="300"
                value={groundSnowLoadKgM2}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setGroundSnowLoadKgM2(val);
                  handleUpdateParam({ groundSnowLoadKgM2: val });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono font-bold"
              />
              <span className="text-slate-400 text-[10px]">kg/m²</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block font-mono">
              = {((groundSnowLoadKgM2 * 9.81) / 1000).toFixed(2)} kN/m²
            </span>
          </div>

          {/* Soil Bearing Capacity */}
          <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700">
            <label className="text-[11px] text-slate-300 font-semibold block mb-1">
              {isEn ? 'Allowable Bearing (q_a):' : 'ظرفیت باربری خاک (q_a):'}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="10"
                min="80"
                max="600"
                value={soilBearingCapacityKpa}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 200;
                  setSoilBearingCapacityKpa(val);
                  handleUpdateParam({ soilBearingCapacityKpa: val });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-emerald-400 font-mono font-bold"
              />
              <span className="text-slate-400 text-[10px]">kPa</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {isEn ? 'From geotechnical test' : 'بر اساس آزمایش مکانیک خاک'}
            </span>
          </div>

          {/* Soil Friction Angle */}
          <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700">
            <label className="text-[11px] text-slate-300 font-semibold block mb-1">
              {isEn ? 'Friction Angle (φ):' : 'زاویه اصطکاک داخلی (φ):'}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="1"
                min="15"
                max="45"
                value={soilFrictionAngleDeg}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 30;
                  setSoilFrictionAngleDeg(val);
                  handleUpdateParam({ soilInternalFrictionAngleDeg: val });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono font-bold"
              />
              <span className="text-slate-400 text-[10px]">deg</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {isEn ? 'Lateral resistance' : 'مقاومت جانبی کوبش'}
            </span>
          </div>

          {/* Frost Depth */}
          <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700">
            <label className="text-[11px] text-slate-300 font-semibold block mb-1">
              {isEn ? 'Frost Penetration Depth:' : 'عمق یخبندان منطقه:'}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="5"
                min="0"
                max="150"
                value={frostDepthCm}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setFrostDepthCm(val);
                  handleUpdateParam({ frostDepthCm: val });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono font-bold"
              />
              <span className="text-slate-400 text-[10px]">cm</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block font-mono">
              Embedment &gt; {frostDepthCm} cm
            </span>
          </div>

          {/* Soil Cohesion */}
          <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700">
            <label className="text-[11px] text-slate-300 font-semibold block mb-1">
              {isEn ? 'Soil Cohesion (c):' : 'چسبندگی خاک (c):'}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="5"
                min="0"
                max="100"
                value={soilCohesionKpa}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setSoilCohesionKpa(val);
                  handleUpdateParam({ soilCohesionKpa: val });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono font-bold"
              />
              <span className="text-slate-400 text-[10px]">kPa</span>
            </div>
          </div>

          {/* Soil Unit Weight */}
          <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700">
            <label className="text-[11px] text-slate-300 font-semibold block mb-1">
              {isEn ? 'Soil Unit Weight (γ):' : 'وزن مخصوص خاک (γ):'}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.5"
                min="14"
                max="24"
                value={soilDensityKnM3}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 18;
                  setSoilDensityKnM3(val);
                  handleUpdateParam({ soilDensityKnM3: val });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono font-bold"
              />
              <span className="text-slate-400 text-[10px]">kN/m³</span>
            </div>
          </div>

          {/* Annual Rainfall */}
          <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700">
            <label className="text-[11px] text-slate-300 font-semibold block mb-1 flex items-center gap-1">
              <CloudRain className="w-3.5 h-3.5 text-blue-400" />
              <span>{isEn ? 'Annual Rainfall:' : 'بارش سالانه:'}</span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="10"
                min="10"
                max="2000"
                value={annualRainfallMm}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 100;
                  setAnnualRainfallMm(val);
                  handleUpdateParam({ annualRainfallMm: val });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono font-bold"
              />
              <span className="text-slate-400 text-[10px]">mm/yr</span>
            </div>
          </div>

          {/* Seismic Zone Coefficient */}
          <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700">
            <label className="text-[11px] text-slate-300 font-semibold block mb-1">
              {isEn ? 'Seismic Coeff (A - Std 2800):' : 'شتاب مبنا زلزله (استاندارد ۲۸۰۰):'}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.05"
                min="0.15"
                max="0.45"
                value={seismicZoneA}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0.3;
                  setSeismicZoneA(val);
                  handleUpdateParam({ seismicZoneCoefficientA: val });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono font-bold"
              />
              <span className="text-slate-400 text-[10px]">g</span>
            </div>
          </div>

          {/* Soil Classification Selector */}
          <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700">
            <label className="text-[11px] text-slate-300 font-semibold block mb-1">
              {isEn ? 'Geotech Category:' : 'تیپ خاک ژئوتکنیکی:'}
            </label>
            <select
              value={soilType}
              onChange={(e) => {
                const val = e.target.value as SoilType;
                setSoilType(val);
                handleUpdateParam({ soilType: val });
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
            >
              <option value="dense_sand_gravel">{isEn ? 'Dense Sand/Gravel' : 'شن و ماسه متراکم'}</option>
              <option value="medium_clay">{isEn ? 'Medium-Stiff Clay' : 'خاک رس متوسط تا سخت'}</option>
              <option value="loose_sand">{isEn ? 'Loose Desert Sand' : 'ماسه سست کویری'}</option>
              <option value="rocky_limestone">{isEn ? 'Limestone / Rocky' : 'بستر صخره‌ای/سنگی'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Structure & Foundation Configuration Controls */}
      <div className="studio-card">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Hammer className="w-4 h-4 text-sky-400" />
          {isEn ? 'Mounting Table & Foundation Configuration:' : 'پیکربندی میز سازه و نوع فونداسیون:'}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {isEn ? 'Foundation Type:' : 'نوع فونداسیون سازه:'}
            </label>
            <select
              value={foundationType}
              onChange={(e) => setFoundationType(e.target.value as FoundationType)}
              className="studio-input text-xs"
            >
              <option value="rammed_steel_pile">
                {isEn ? 'Rammed Steel C-Piles (Utility MW scale)' : 'پایه‌های کوبشی فولادی C شکل (نیروگاه مگاواتی)'}
              </option>
              <option value="concrete_pier">
                {isEn ? 'Cast-in-Place Concrete Piers (Hard/Rocky)' : 'فونداسیون استوانه‌ای بتن درجا (خاک سنگی/سخت)'}
              </option>
              <option value="ground_screw">
                {isEn ? 'Galvanized Continuous Ground Screws' : 'شمع‌های پیچشی فولادی (Ground Screws)'}
              </option>
              <option value="rooftop_ballasted_block">
                {isEn ? 'Rooftop Ballasted Blocks (Non-Penetrating)' : 'بلوک‌های بتنی وزنی پشت‌بام (بدون سوراخ‌کاری)'}
              </option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {isEn ? 'Total PV Modules Count:' : 'تعداد کل پنل‌ها:'}
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
              {isEn ? 'Modules per Table (2P):' : 'تعداد پنل در هر میز سازه (Table):'}
            </label>
            <select
              value={modulesPerTable}
              onChange={(e) => setModulesPerTable(parseInt(e.target.value) || 28)}
              className="studio-input text-xs"
            >
              <option value="14">{isEn ? '14 Modules (2P7 config)' : '۱۴ پنل (۲ ردیف عمودی ۷ تایی)'}</option>
              <option value="20">{isEn ? '20 Modules (2P10 config)' : '۲۰ پنل (۲ ردیف عمودی ۱۰ تایی)'}</option>
              <option value="28">{isEn ? '28 Modules (2P14 string std)' : '۲۸ پنل (۲ ردیف عمودی ۱۴ تایی - استاندارد استرینگ)'}</option>
              <option value="56">{isEn ? '56 Modules (Double 4P table)' : '۵۶ پنل (میز دوبل ۴ ردیفه)'}</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {isEn ? 'Array Tilt Angle (deg):' : 'زاویه شیب استراکچر (درجه):'}
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
        </div>
      </div>

      {/* Structural Force Badges & Geotechnical Safety Checks */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">{isEn ? 'Velocity Wind Pressure (q_z)' : 'فشار سرعتی باد (q_z)'}</div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
            {structResult.velocityWindPressureQzN_M2} <span className="text-xs font-normal">N/m²</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {isEn ? 'Design wind pressure per INBC 6' : 'فشار طراحی باد طبق مبحث ۶'}
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">{isEn ? 'Table Wind Uplift Force' : 'نیروی مکش باد بر هر میز (Uplift)'}</div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-1">
            {structResult.windUpliftForceKn} <span className="text-xs font-normal">kN</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {isEn ? 'Governing foundation tension load' : 'بحرانی‌ترین بار برای فونداسیون'}
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">{isEn ? 'Post Bearing Pressure' : 'تنش باربری اعمالی به خاک'}</div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              structResult.isBearingCapacitySafe ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {structResult.appliedPostBearingPressureKpa} <span className="text-xs font-normal">kPa</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {isEn ? 'Allowable:' : 'مجاز:'} {structResult.allowableSoilBearingKpa} kPa (
            {structResult.isBearingCapacitySafe ? (isEn ? '✓ OK' : '✓ ایمن') : (isEn ? '✗ Exceeded' : '✗ اضافه تنش')})
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">{isEn ? 'Overturning Safety Factor (FoS)' : 'ضریب اطمینان واژگونی (FoS)'}</div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              structResult.isStructurallySafe ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {structResult.fosOverturning}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            {structResult.isStructurallySafe ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {isEn ? 'Stable (FoS ≥ 1.5)' : 'مجاز (حداقل ۱.۵)'}
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {isEn ? 'Unstable' : 'ناپایدار'}
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
            {isEn ? 'Foundation & Geotechnical Dimensions:' : 'مشخصات ژئوتکنیکی و ابعاد فونداسیون:'}
          </h3>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">{isEn ? 'Selected Foundation:' : 'نوع فونداسیون منتخب:'}</span>
              <strong className="text-white">
                {isEn ? structResult.foundationNameEn : structResult.foundationNameFa}
              </strong>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">{isEn ? 'Dimensions & Depth:' : 'ابعاد و عمق نفوذ در خاک:'}</span>
              <span className="font-mono text-amber-300">
                {isEn ? structResult.foundationDimensionsDescEn : structResult.foundationDimensionsDesc}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">{isEn ? 'Frost Penetration Depth Check:' : 'کنترل عمق یخبندان:'}</span>
              <span className={`font-mono ${structResult.isFrostDepthRespected ? 'text-emerald-400' : 'text-rose-400'}`}>
                {structResult.recommendedDepthM * 100} cm &gt; {structResult.frostDepthCm} cm (
                {structResult.isFrostDepthRespected ? (isEn ? '✓ Pass' : '✓ تأیید') : (isEn ? '✗ Too Shallow' : '✗ کم‌عمق')})
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">{isEn ? 'Total Tables Count:' : 'تعداد کل میزهای سازه (Tables):'}</span>
              <span className="font-mono text-sky-300">
                {structResult.totalTablesCount} {isEn ? 'tables' : 'میز'} ({structResult.postsPerTable} {isEn ? 'posts/table' : 'پایه در هر میز'})
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">{isEn ? 'Total Piles / Posts:' : 'تعداد کل پایه‌ها / شمع‌های کوبشی:'}</span>
              <strong className="font-mono text-emerald-400">{structResult.totalPostsCount} {isEn ? 'posts' : 'پایه'}</strong>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">{isEn ? 'Compression Load per Post:' : 'نیروی فشاری روی هر پایه (Compression):'}</span>
              <span className="font-mono text-slate-200">{structResult.compressionPerPostKn} kN</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-400">{isEn ? 'Lateral Shear Load per Post:' : 'نیروی برشی جانبی هر پایه (Lateral Shear):'}</span>
              <span className="font-mono text-slate-200">{structResult.lateralShearPerPostKn} kN</span>
            </div>
          </div>
        </div>

        {/* Box 2: Civil Works Bill of Materials (BOM) */}
        <div className="studio-card">
          <h3 className="text-sm font-bold text-sky-400 mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-purple-400" />
            {isEn ? 'Civil Works Bill of Materials (BOM):' : 'احجام عملیات عمرانی و متره مواد مصرفی (Civil BOM):'}
          </h3>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">{isEn ? 'Total Foundation Concrete:' : 'حجم کل بتن‌ریزی فونداسیون:'}</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {structResult.concreteVolumeTotalM3} m³ {structResult.concreteVolumeTotalM3 === 0 && (isEn ? '(Zero for Rammed Steel Piles)' : '(صفر در روش پایه‌های کوبشی)')}
              </span>
            </div>
            {structResult.concreteVolumeTotalM3 > 0 && (
              <>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">{isEn ? 'C25 Cement Bags Required:' : 'تعداد کیسه سیمان مورد نیاز (C25):'}</span>
                  <span className="font-mono text-sky-300">
                    ~{structResult.cementBagsCount} {isEn ? 'bags (50kg)' : 'کیسه ۵۰ کیلویی'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">{isEn ? 'Sand & Washed Gravel:' : 'شن و ماسه شسته:'}</span>
                  <span className="font-mono text-slate-200">{structResult.sandGravelTon} {isEn ? 'tons' : 'تن'}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">{isEn ? 'Total Steel Rebar Cages:' : 'وزن کل آرماتور و میلگرد مسلح:'}</span>
                  <span className="font-mono text-amber-300">{structResult.steelRebarWeightTotalKg} kg</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">{isEn ? 'Galvanized Racking Weight:' : 'وزن کل استراکچر فولادی گالوانیزه:'}</span>
              <span className="font-mono font-bold text-white">
                {(structResult.structuralSteelRackingWeightKg / 1000).toFixed(1)} {isEn ? 'tons HDG Steel' : 'تن فولاد گالوانیزه گرم'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-400">{isEn ? 'Gross Array Land Footprint:' : 'مساحت ناخالص اشغال‌شده سازه‌ها:'}</span>
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
              {isEn ? 'Design Codes & Engineering Standards Compliance:' : 'تطابق با آیین‌نامه‌های طراحی سازه و فونداسیون:'}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-2">
              {isEn ? structResult.engineeringRemarksEn : structResult.engineeringRemarksFa}
            </p>
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 font-mono">
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">INBC Part 6 (مبحث ۶ مقررات ملی)</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">ASCE 7-22 Wind Criteria</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">ACI 318 Concrete Piers</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">ASTM A123 Hot-Dip Galvanizing</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Iranian Standard 2800 (Seismic)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
