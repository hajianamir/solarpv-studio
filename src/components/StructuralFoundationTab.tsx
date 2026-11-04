import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Layers,
  Wind,
  ShieldAlert,
  ShieldCheck,
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
  FileText,
  Droplets,
  Waves,
  Sliders,
  Wrench,
  Sparkles,
  ArrowUpRight,
  Info,
  Settings2,
} from 'lucide-react';
import {
  calculateStructuralAndFoundations,
  type FoundationType,
  type SoilType,
  type StructuralAnalysisResult,
} from '../engine/structuralEngine';
import { type ClimateCity, type SiteGeotechnicalOverrides, type SiteDrainageCondition } from '../engine/climaticData';
import {
  recommendFoundation,
  type FoundationRecommendationResult,
} from '../engine/structureRecommendationEngine';
import {
  assessSaltCorrosion,
  type SaltCorrosionOutput,
  type Iso9223Category,
  CATEGORY_META,
} from '../engine/corrosion/saltCorrosionEngine';

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
  const [foundationType, setFoundationType] = useState<FoundationType>(
    (siteOverrides?.foundationType as FoundationType) || 'rammed_steel_pile'
  );
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [corrosion, setCorrosion] = useState<SaltCorrosionOutput | null>(null);

  // User structural adjustment overrides (when FoS needs remediation or customization)
  const [customEmbedmentDepthM, setCustomEmbedmentDepthM] = useState<number | null>(null);
  const [customPostsPerTable, setCustomPostsPerTable] = useState<number | null>(null);
  const [isManualDepth, setIsManualDepth] = useState<boolean>(false);
  const [showRemedialDetails, setShowRemedialDetails] = useState<boolean>(true);

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
  const [distanceToSeaKm, setDistanceToSeaKm] = useState<number | undefined>(
    siteOverrides?.distanceToCoastKm ?? city.distanceToCoastKm
  );
  const [drainageCondition, setDrainageCondition] = useState<SiteDrainageCondition>(
    siteOverrides?.drainageCondition ?? city.drainageCondition ?? 'well_drained'
  );
  const [groundwaterDepthM, setGroundwaterDepthM] = useState<number>(
    siteOverrides?.groundwaterDepthM ?? city.groundwaterDepthM ?? 5.0
  );
  const [manualCorrosionCategory, setManualCorrosionCategory] = useState<Iso9223Category | 'auto'>('auto');

  // Location tracking ref to detect map selection / city changes
  const lastLocationRef = useRef<{ id: string; lat: number; lng: number }>({
    id: city.id,
    lat: city.latitude,
    lng: city.longitude,
  });

  // Sync when city or map location changes
  useEffect(() => {
    const isNewLocation =
      lastLocationRef.current.id !== city.id ||
      Math.abs(lastLocationRef.current.lat - city.latitude) > 0.0001 ||
      Math.abs(lastLocationRef.current.lng - city.longitude) > 0.0001;

    if (isNewLocation) {
      lastLocationRef.current = { id: city.id, lat: city.latitude, lng: city.longitude };
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
      setDistanceToSeaKm(city.distanceToCoastKm);
      setDrainageCondition(city.drainageCondition ?? 'well_drained');
      setGroundwaterDepthM(city.groundwaterDepthM ?? 5.0);
      setManualCorrosionCategory('auto');
      setCustomEmbedmentDepthM(null);
      setCustomPostsPerTable(null);
      setIsManualDepth(false);
      onUpdateSiteOverrides?.({});
    } else if (siteOverrides && Object.keys(siteOverrides).length > 0) {
      if (siteOverrides.basicWindSpeedKmh !== undefined) setBasicWindSpeedKmh(siteOverrides.basicWindSpeedKmh);
      if (siteOverrides.groundSnowLoadKgM2 !== undefined) setGroundSnowLoadKgM2(siteOverrides.groundSnowLoadKgM2);
      if (siteOverrides.annualRainfallMm !== undefined) setAnnualRainfallMm(siteOverrides.annualRainfallMm);
      if (siteOverrides.soilType !== undefined) setSoilType(siteOverrides.soilType as SoilType);
      if (siteOverrides.soilBearingCapacityKpa !== undefined) setSoilBearingCapacityKpa(siteOverrides.soilBearingCapacityKpa);
      if (siteOverrides.soilInternalFrictionAngleDeg !== undefined) setSoilFrictionAngleDeg(siteOverrides.soilInternalFrictionAngleDeg);
      if (siteOverrides.soilCohesionKpa !== undefined) setSoilCohesionKpa(siteOverrides.soilCohesionKpa);
      if (siteOverrides.soilDensityKnM3 !== undefined) setSoilDensityKnM3(siteOverrides.soilDensityKnM3);
      if (siteOverrides.frostDepthCm !== undefined) setFrostDepthCm(siteOverrides.frostDepthCm);
      if (siteOverrides.seismicZoneCoefficientA !== undefined) setSeismicZoneA(siteOverrides.seismicZoneCoefficientA);
      if (siteOverrides.distanceToCoastKm !== undefined) setDistanceToSeaKm(siteOverrides.distanceToCoastKm);
      if (siteOverrides.drainageCondition !== undefined) setDrainageCondition(siteOverrides.drainageCondition);
      if (siteOverrides.groundwaterDepthM !== undefined) setGroundwaterDepthM(siteOverrides.groundwaterDepthM);
      if (siteOverrides.foundationType !== undefined) setFoundationType(siteOverrides.foundationType as FoundationType);
    }
  }, [city, siteOverrides, onUpdateSiteOverrides]);

  // Salt corrosion / ISO 9223 & Drainage categorization
  useEffect(() => {
    let mounted = true;
    const effectiveDistance = distanceToSeaKm ?? siteOverrides?.distanceToCoastKm ?? city.distanceToCoastKm;

    assessSaltCorrosion({
      latitude: city.latitude,
      longitude: city.longitude,
      distanceToSeaKm: effectiveDistance,
      resolveDistance: true,
      drainageCondition,
      groundwaterDepthM,
      soilClassification: soilType,
      annualRainfallMm,
    })
      .then((res) => {
        if (mounted) {
          if (manualCorrosionCategory !== 'auto') {
            const meta = CATEGORY_META[manualCorrosionCategory];
            setCorrosion({
              ...res,
              iso9223Category: manualCorrosionCategory,
              categoryLabel: meta.label,
              categoryLabelFa: meta.labelFa,
              corrosionRisk: meta.risk,
              corrosionRiskFa: meta.riskFa,
              moduleDeratePct: meta.module,
              inverterDeratePct: meta.inverter,
              structureDeratePct: meta.structure,
              maintenanceOpexAdderPct: meta.maintenance,
              durabilityNote: meta.note,
              durabilityNoteFa: meta.noteFa,
              coatingRecommendation: meta.coating,
            });
          } else {
            setCorrosion(res);
          }
        }
      })
      .catch(() => {
        if (mounted) setCorrosion(null);
      });

    return () => {
      mounted = false;
    };
  }, [
    city.latitude,
    city.longitude,
    city.distanceToCoastKm,
    distanceToSeaKm,
    siteOverrides?.distanceToCoastKm,
    manualCorrosionCategory,
    drainageCondition,
    groundwaterDepthM,
    soilType,
    annualRainfallMm,
  ]);

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
      distanceToCoastKm: distanceToSeaKm,
      drainageCondition,
      groundwaterDepthM,
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
    setDistanceToSeaKm(city.distanceToCoastKm);
    setDrainageCondition(city.drainageCondition ?? 'well_drained');
    setGroundwaterDepthM(city.groundwaterDepthM ?? 5.0);
    setManualCorrosionCategory('auto');
    setCustomEmbedmentDepthM(null);
    setCustomPostsPerTable(null);
    setIsManualDepth(false);
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
      customEmbedmentDepthM: isManualDepth && customEmbedmentDepthM !== null ? customEmbedmentDepthM : undefined,
      customPostsPerTable: customPostsPerTable !== null ? customPostsPerTable : undefined,
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
    isManualDepth,
    customEmbedmentDepthM,
    customPostsPerTable,
  ]);

  const recResult: FoundationRecommendationResult = useMemo(() => {
    return recommendFoundation({
      siteName: isEn ? city.nameEn : city.nameFa,
      latitude: city.latitude,
      longitude: city.longitude,
      soilClassification: soilType,
      soilBearingCapacityKpa,
      soilInternalFrictionAngleDeg: soilFrictionAngleDeg,
      soilCohesionKpa,
      soilDensityKnM3,
      frostDepthCm,
      basicWindSpeedKmh,
      groundSnowLoadKgM2,
      tableAreaM2: structResult.tableAreaM2,
      arrayTiltDeg: tiltDeg,
      postsPerTable: structResult.postsPerTable,
      clearanceHeightM: groundClearanceM,
      slopeDeg: 2.0,
    });
  }, [
    city,
    soilType,
    soilBearingCapacityKpa,
    soilFrictionAngleDeg,
    soilCohesionKpa,
    soilDensityKnM3,
    frostDepthCm,
    basicWindSpeedKmh,
    groundSnowLoadKgM2,
    tiltDeg,
    groundClearanceM,
    isEn,
    structResult.tableAreaM2,
    structResult.postsPerTable,
  ]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-xl font-bold text-industrial-accent mb-1 flex items-center gap-2">
          <Layers className="w-5 h-5 text-industrial-warning" />
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
      <div className="studio-card border border-sky-800/40 bg-industrial-surface/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-industrial-border/80 gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-industrial-accent/10 border border-industrial-accent/30 rounded text-industrial-accent">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{isEn ? 'Site Geotechnical, Soil & Climatic Parameters' : 'اطلاعات ژئوتکنیک، خاک و اقلیم سایت پروژه:'}</span>
                <span className="text-xs font-normal text-industrial-accent flex items-center gap-1 font-mono">
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
                  {isEn ? 'Retrieved:' : 'تاریخ دریافت:'} <span className="font-mono text-industrial-warning">{city.dataRetrievalDate}</span>
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={handleResetToDefaults}
            className="text-xs px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-industrial-border flex items-center gap-1.5 self-start sm:self-auto"
            title={isEn ? 'Reset to official weather station defaults' : 'بازنشانی مقادیر به داده‌های رسمی ایستگاه'}
          >
            <RotateCcw className="w-3.5 h-3.5 text-industrial-accent" />
            <span>{isEn ? 'Reset to Climate Defaults' : 'بازنشانی به پیش‌فرض اقلیم'}</span>
          </button>
        </div>

        {/* 9 Geotechnical & Climatic Editable Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {/* Wind Speed */}
          <div className="p-2.5 bg-slate-800/80 rounded-lg border border-industrial-border">
            <label className="text-[11px] text-slate-300 font-semibold block mb-1 flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-industrial-accent" />
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
                className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-xs text-white font-mono font-bold"
              />
              <span className="text-slate-400 text-[10px]">km/h</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block font-mono">
              = {(basicWindSpeedKmh / 3.6).toFixed(1)} m/s
            </span>
          </div>

          {/* Ground Snow Load */}
          <div className="p-2.5 bg-slate-800/80 rounded-lg border border-industrial-border">
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
                className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-xs text-white font-mono font-bold"
              />
              <span className="text-slate-400 text-[10px]">kg/m²</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block font-mono">
              = {((groundSnowLoadKgM2 * 9.81) / 1000).toFixed(2)} kN/m²
            </span>
          </div>

          {/* Soil Bearing Capacity */}
          <div className="p-2.5 bg-slate-800/80 rounded-lg border border-industrial-border">
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
                className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-xs text-industrial-success font-mono font-bold"
              />
              <span className="text-slate-400 text-[10px]">kPa</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {isEn ? 'From geotechnical test' : 'بر اساس آزمایش مکانیک خاک'}
            </span>
          </div>

          {/* Soil Friction Angle */}
          <div className="p-2.5 bg-slate-800/80 rounded-lg border border-industrial-border">
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
                className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-xs text-white font-mono font-bold"
              />
              <span className="text-slate-400 text-[10px]">deg</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {isEn ? 'Lateral resistance' : 'مقاومت جانبی کوبش'}
            </span>
          </div>

          {/* Frost Depth */}
          <div className="p-2.5 bg-slate-800/80 rounded-lg border border-industrial-border">
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
                className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-xs text-white font-mono font-bold"
              />
              <span className="text-slate-400 text-[10px]">cm</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block font-mono">
              Embedment &gt; {frostDepthCm} cm
            </span>
          </div>

          {/* Soil Cohesion */}
          <div className="p-2.5 bg-slate-800/80 rounded-lg border border-industrial-border">
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
                className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-xs text-white font-mono font-bold"
              />
              <span className="text-slate-400 text-[10px]">kPa</span>
            </div>
          </div>

          {/* Soil Unit Weight */}
          <div className="p-2.5 bg-slate-800/80 rounded-lg border border-industrial-border">
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
                className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-xs text-white font-mono font-bold"
              />
              <span className="text-slate-400 text-[10px]">kN/m³</span>
            </div>
          </div>

          {/* Annual Rainfall */}
          <div className="p-2.5 bg-slate-800/80 rounded-lg border border-industrial-border">
            <label className="text-[11px] text-slate-300 font-semibold block mb-1 flex items-center gap-1">
              <CloudRain className="w-3.5 h-3.5 text-industrial-primary" />
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
                className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-xs text-white font-mono font-bold"
              />
              <span className="text-slate-400 text-[10px]">mm/yr</span>
            </div>
          </div>

          {/* Seismic Zone Coefficient */}
          <div className="p-2.5 bg-slate-800/80 rounded-lg border border-industrial-border">
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
                className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-xs text-white font-mono font-bold"
              />
              <span className="text-slate-400 text-[10px]">g</span>
            </div>
          </div>

          {/* Soil Classification Selector */}
          <div className="p-2.5 bg-slate-800/80 rounded-lg border border-industrial-border">
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
              className="w-full bg-industrial-surface border border-industrial-border rounded px-1.5 py-1 text-xs text-white"
            >
              <option value="dense_sand_gravel">{isEn ? 'Dense Sand/Gravel' : 'شن و ماسه متراکم'}</option>
              <option value="medium_clay">{isEn ? 'Medium-Stiff Clay' : 'خاک رس متوسط تا سخت'}</option>
              <option value="loose_sand">{isEn ? 'Loose Desert Sand' : 'ماسه سست کویری'}</option>
              <option value="rocky_limestone">{isEn ? 'Limestone / Rocky' : 'بستر صخره‌ای/سنگی'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Salt Corrosion & Site Drainage Card (ISO 9223 / ASTM G57) */}
      <div className="studio-card border border-industrial-border p-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-industrial-border/80 gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-industrial-accent/10 border border-industrial-accent/30 rounded text-industrial-accent">
              <ShieldAlert className="w-4 h-4 text-industrial-warning" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  {isEn
                    ? 'Atmospheric Corrosion, Coastal Salinity & Site Drainage Analysis'
                    : 'تحلیل خوردگی اتمسفری، شوری ساحلی و شرایط زهکشی ساختگاه'}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-900/40 text-sky-300 border border-sky-500/40">
                  ISO 9223:2012 & ASTM G57
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isEn
                  ? 'Geodesic shoreline proximity, ISO 9223 corrosivity band, HDG galvanizing specs, and subterranean drainage hydrology.'
                  : 'محاسبه فاصله ژئودزیک تا خط ساحلی دریا، رده‌بندی خوردگی ISO 9223، مشخصات پوشش گالوانیزه گرم و هیدرولوژی زهکشی ساختگاه.'}
              </p>
            </div>
          </div>
        </div>

        {/* 4 Interactive Controls (Distance, ISO Category override, Drainage, Groundwater) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs bg-industrial-surface/50 p-3 rounded-lg border border-industrial-border/60">
          {/* Distance to Sea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-slate-300 font-semibold flex items-center gap-1">
                <Waves className="w-3.5 h-3.5 text-sky-400" />
                <span>{isEn ? 'Distance to Coastline:' : 'فاصله تا ساحل دریا:'}</span>
              </label>
              <span className="text-[9px] text-slate-400 font-mono">
                {corrosion?.source === 'user_entry' ? (isEn ? 'Manual' : 'دستی') : (isEn ? 'Auto Geodesic' : 'محاسبه مکانی')}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.5"
                min="0"
                max="2500"
                value={distanceToSeaKm !== undefined ? distanceToSeaKm : (corrosion?.distanceToSeaKm ?? 50)}
                onChange={(e) => {
                  const val = Math.max(0, parseFloat(e.target.value) || 0);
                  setDistanceToSeaKm(val);
                  handleUpdateParam({ distanceToCoastKm: val });
                }}
                className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-xs text-sky-300 font-mono font-bold"
              />
              <span className="text-slate-400 text-[10px]">km</span>
            </div>
            <div className="flex gap-1 mt-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setDistanceToSeaKm(0.0);
                  handleUpdateParam({ distanceToCoastKm: 0.0 });
                }}
                className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                {isEn ? 'Coast (0km)' : 'ساحل (۰km)'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDistanceToSeaKm(2.5);
                  handleUpdateParam({ distanceToCoastKm: 2.5 });
                }}
                className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                {isEn ? 'Near (2.5km)' : 'نزدیک (۲.۵km)'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDistanceToSeaKm(25.0);
                  handleUpdateParam({ distanceToCoastKm: 25.0 });
                }}
                className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                {isEn ? 'Coastal (25km)' : 'حاشیه (۲۵km)'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDistanceToSeaKm(100.0);
                  handleUpdateParam({ distanceToCoastKm: 100.0 });
                }}
                className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                {isEn ? 'Inland (100km)' : 'خشکی (۱۰۰km)'}
              </button>
            </div>
          </div>

          {/* ISO 9223 Corrosivity Category */}
          <div>
            <label className="text-[11px] text-slate-300 font-semibold block mb-1 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-industrial-warning" />
              <span>{isEn ? 'ISO 9223 Category Mode:' : 'رده خوردگی ISO 9223:'}</span>
            </label>
            <select
              value={manualCorrosionCategory}
              onChange={(e) => setManualCorrosionCategory(e.target.value as Iso9223Category | 'auto')}
              className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-xs text-white"
            >
              <option value="auto">{isEn ? 'Auto (from distance to sea)' : 'محاسبه خودکار از فاصله ساحلی'}</option>
              <option value="C1">{isEn ? 'C1 - Very Low (Inland desert)' : 'C1 - بسیار کم (خشک / بیابانی)'}</option>
              <option value="C2">{isEn ? 'C2 - Low (Inland rural/urban)' : 'C2 - کم (روستایی / کم‌رطوبت)'}</option>
              <option value="C3">{isEn ? 'C3 - Moderate (Urban/coastal fringe)' : 'C3 - متوسط (شهری / نفوذ رطوبت)'}</option>
              <option value="C4">{isEn ? 'C4 - High (Coastal marine air)' : 'C4 - بالا (حاشیه سواحل و صنایع)'}</option>
              <option value="C5">{isEn ? 'C5 - Very High (Marine splash/gulf)' : 'C5 - بسیار بالا (ساحل خلیج فارس/عمان)'}</option>
            </select>
            <span className="text-[9px] text-slate-500 block mt-1">
              {isEn ? 'Override if local salinity / salt lake warrants' : 'امکان تعیین دستی برای مجاورت دریاچه نمک یا صنایع'}
            </span>
          </div>

          {/* Site Surface Drainage */}
          <div>
            <label className="text-[11px] text-slate-300 font-semibold block mb-1 flex items-center gap-1">
              <CloudRain className="w-3.5 h-3.5 text-industrial-primary" />
              <span>{isEn ? 'Site Surface Drainage:' : 'وضعیت زهکشی سطحی و رواناب:'}</span>
            </label>
            <select
              value={drainageCondition}
              onChange={(e) => {
                const val = e.target.value as SiteDrainageCondition;
                setDrainageCondition(val);
                handleUpdateParam({ drainageCondition: val });
              }}
              className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-xs text-white"
            >
              <option value="well_drained">{isEn ? 'Well-Drained (Natural Runoff)' : 'زهکشی عالی و رواناب طبیعی (بدون مانداب)'}</option>
              <option value="moderate">{isEn ? 'Moderate (Typical Flat Runoff)' : 'زهکشی متوسط (رواناب فصلی ملایم)'}</option>
              <option value="poor_flood_prone">{isEn ? 'Poor / Flood Prone (Ditching needed)' : 'زهکشی ضعیف / مستعد آب‌گرفتگی'}</option>
            </select>
            <span className="text-[9px] text-slate-500 block mt-1">
              {isEn ? 'Affects stormwater swales & clearance' : 'تعیین لزوم احداث کانال‌های زهکشی سطحی'}
            </span>
          </div>

          {/* Groundwater Table Depth */}
          <div>
            <label className="text-[11px] text-slate-300 font-semibold block mb-1 flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isEn ? 'Groundwater Table Depth (GWL):' : 'تراز عمق آب زیرزمینی (GWL):'}</span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.5"
                min="0.3"
                max="30"
                value={groundwaterDepthM}
                onChange={(e) => {
                  const val = Math.max(0.3, parseFloat(e.target.value) || 1.0);
                  setGroundwaterDepthM(val);
                  handleUpdateParam({ groundwaterDepthM: val });
                }}
                className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-xs text-cyan-300 font-mono font-bold"
              />
              <span className="text-slate-400 text-[10px]">m</span>
            </div>
            <span className="text-[9px] text-slate-500 block mt-1">
              {groundwaterDepthM <= 2.0
                ? (isEn ? '⚠ Shallow water table (<2m) — buoyancy risk' : '⚠ تراز آب بالا (<۲ متر) — خطر شناوری شمع')
                : (isEn ? 'Deep water table — safe for driven piles' : 'تراز آب عمیق — ایمن برای کوبش شمع')}
            </span>
          </div>
        </div>

        {/* Telemetry & Engineering Impact Grid */}
        {corrosion ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-industrial-surface/80 rounded-lg border border-industrial-border">
                <span className="text-slate-400 block text-[10px]">{isEn ? 'ISO 9223 Category:' : 'رده خوردگی ISO 9223:'}</span>
                <span className={`font-mono font-bold text-sm ${corrosion.iso9223Category === 'C5' ? 'text-industrial-error' : corrosion.iso9223Category === 'C4' ? 'text-industrial-warning' : 'text-industrial-success'}`}>
                  {isEn ? corrosion.categoryLabel : corrosion.categoryLabelFa}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">{isEn ? corrosion.corrosionRisk : corrosion.corrosionRiskFa}</span>
              </div>

              <div className="p-2.5 bg-industrial-surface/80 rounded-lg border border-industrial-border">
                <span className="text-slate-400 block text-[10px]">{isEn ? 'Distance to Coastline:' : 'فاصله تا ساحل دریا:'}</span>
                <span className="font-mono font-bold text-sm text-sky-300">{corrosion.distanceToSeaKm} km</span>
                <span className="text-[9px] text-slate-500 block mt-0.5">
                  {corrosion.source === 'user_entry' ? (isEn ? 'Manual User Entry' : 'ورودی دستی کاربر') : (isEn ? 'Geodesic Model' : 'مدل ژئودزیک مکانی')}
                </span>
              </div>

              <div className="p-2.5 bg-industrial-surface/80 rounded-lg border border-industrial-border">
                <span className="text-slate-400 block text-[10px]">{isEn ? 'Salinity Deratings:' : 'افت راندمان ناشی از شوری:'}</span>
                <span className="font-mono font-bold text-sm text-industrial-warning">
                  {isEn ? 'Module:' : 'ماژول:'} -{corrosion.moduleDeratePct}%
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">
                  {isEn ? 'Inverter:' : 'اینورتر:'} -{corrosion.inverterDeratePct}% | {isEn ? 'Structure:' : 'سازه:'} -{corrosion.structureDeratePct}%
                </span>
              </div>

              <div className="p-2.5 bg-industrial-surface/80 rounded-lg border border-industrial-border">
                <span className="text-slate-400 block text-[10px]">{isEn ? 'Maintenance OPEX Adder:' : 'افزایش هزینه سالانه نگهداری:'}</span>
                <span className="font-mono font-bold text-sm text-slate-200">+{corrosion.maintenanceOpexAdderPct}%</span>
                <span className="text-[9px] text-slate-500 block mt-0.5 font-mono">{corrosion.traceId}</span>
              </div>
            </div>

            {/* Protective Coating & Drainage Guidance Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Box 1: Protective Coating Specs */}
              <div className="p-3 bg-industrial-bg border border-industrial-border rounded-lg space-y-1.5">
                <div className="flex items-center gap-2 pb-1 border-b border-industrial-border/60">
                  <ShieldCheck className="w-4 h-4 text-industrial-success" />
                  <strong className="text-slate-200 text-xs">
                    {isEn ? 'Protective Coating & Fasteners Specification:' : 'مشخصات پوشش حفاظتی سازه و اتصالات:'}
                  </strong>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px]">{isEn ? 'HDG Galvanizing Thickness:' : 'حداقل ضخامت گالوانیزه گرم:'}</span>
                    <strong className="text-industrial-accent font-mono">≥ {corrosion.coatingRecommendation.hdgThicknessMicrons} µm</strong>
                    <span className="text-[9px] text-slate-500 block font-mono">{corrosion.coatingRecommendation.hdgStandard}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">{isEn ? 'Fasteners & Bolts Grade:' : 'متریال پیچ و مهره‌ها:'}</span>
                    <strong className="text-slate-200">{isEn ? corrosion.coatingRecommendation.fastenersGradeEn : corrosion.coatingRecommendation.fastenersGradeFa}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">{isEn ? 'Coating System:' : 'سیستم پوشش سطح:'}</span>
                    <span className="text-slate-300">{isEn ? corrosion.coatingRecommendation.coatingSystemEn : corrosion.coatingRecommendation.coatingSystemFa}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">{isEn ? 'Enclosure / Inspection:' : 'درجه حفاظت تابلو / بازرسی:'}</span>
                    <span className="text-slate-300 font-mono">{corrosion.coatingRecommendation.enclosureRating}</span>
                    <span className="text-[9px] text-slate-500 block">{isEn ? `Every ${corrosion.coatingRecommendation.inspectionIntervalMonths} months` : `هر ${corrosion.coatingRecommendation.inspectionIntervalMonths} ماه`}</span>
                  </div>
                </div>
              </div>

              {/* Box 2: Drainage & Groundwater Hydrology */}
              <div className="p-3 bg-industrial-bg border border-industrial-border rounded-lg space-y-1.5">
                <div className="flex items-center gap-2 pb-1 border-b border-industrial-border/60">
                  <Droplets className="w-4 h-4 text-cyan-400" />
                  <strong className="text-slate-200 text-xs">
                    {isEn ? 'Site Drainage & Groundwater Hydrology:' : 'هیدرولوژی زهکشی و ارزیابی آب زیرزمینی:'}
                  </strong>
                </div>
                <div className="text-[11px] space-y-1 pt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">{isEn ? 'Drainage Classification:' : 'رده زهکشی ساختگاه:'}</span>
                    <span className="text-slate-200 font-medium">{isEn ? corrosion.drainageAssessment.drainageConditionLabelEn : corrosion.drainageAssessment.drainageConditionLabelFa}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">{isEn ? 'Groundwater Table (GWL):' : 'تراز عمق آب زیرزمینی:'}</span>
                    <span className={`font-mono font-bold ${corrosion.drainageAssessment.waterTableRisk === 'high' ? 'text-rose-400' : corrosion.drainageAssessment.waterTableRisk === 'moderate' ? 'text-industrial-warning' : 'text-industrial-success'}`}>
                      {corrosion.drainageAssessment.groundwaterDepthM.toFixed(1)} m ({isEn ? corrosion.drainageAssessment.waterTableRiskLabelEn : corrosion.drainageAssessment.waterTableRiskLabelFa})
                    </span>
                  </div>
                  <div className="border-t border-industrial-border/60 pt-1.5 mt-1.5 text-[10px] text-slate-300 space-y-1">
                    {(isEn ? corrosion.drainageAssessment.engineeringRecommendationsEn : corrosion.drainageAssessment.engineeringRecommendationsFa).map((rec, idx) => (
                      <p key={idx} className="flex items-start gap-1">
                        <span className="text-industrial-accent">▪</span>
                        <span>{rec}</span>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-2.5 text-slate-500 text-xs italic">{isEn ? 'Evaluating coastal salinity and drainage parameters...' : 'در حال محاسبه فاصله ساحلی، رده خوردگی و زهکشی ساختگاه...'}</div>
        )}
      </div>

      {/* Automated Foundation Recommendation Engine Card (PR-2a-6) */}
      <div className="studio-card border border-emerald-500/40 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-industrial-border gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-industrial-success/10 border border-industrial-success/30 rounded-lg text-industrial-success">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  {isEn ? 'Automated Foundation Recommendation Engine' : 'پیشنهاد هوشمند نوع فونداسیون و سایزینگ برومز'}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-industrial-success/20 text-industrial-success border border-emerald-500/40">
                  ASCE 7-22 & Eurocode 7
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isEn
                  ? 'Decision tree multi-criteria analysis + Broms lateral capacity & frost heave depth calculation.'
                  : 'تحلیل چندمعیاره درخت تصمیم، ظرفیت باربری جانبی برومز و بررسی عمق یخبندان.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReportModal(true)}
              className="text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-industrial-border flex items-center gap-1.5 transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isEn ? 'View 6-Section Report' : 'گزارش ۶ بخشی مهندسی'}</span>
            </button>
            <button
              onClick={() => setFoundationType(recResult.primaryRecommendation)}
              className="text-xs px-3.5 py-1.5 rounded-md bg-industrial-success hover:bg-industrial-success text-white font-bold flex items-center gap-1.5 transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isEn ? '1-Click Apply Recommendation' : 'اعمال فونداسیون پیشنهادی (۱-کلیک)'}</span>
            </button>
          </div>
        </div>

        {/* Top 3 Foundation Options Ranking */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {recResult.allRankedOptions.slice(0, 3).map((opt) => (
            <div
              key={opt.type}
              className={`p-3 rounded-lg border transition ${
                foundationType === opt.type
                  ? 'bg-industrial-success/30 border-industrial-success/60 ring-1 ring-industrial-success'
                  : 'bg-industrial-surface/60 border-industrial-border hover:border-industrial-border'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  Rank #{opt.rank}
                </span>
                <span className="font-mono font-bold text-industrial-success text-xs">
                  {opt.suitabilityScore}/100
                </span>
              </div>
              <strong className="text-white block text-xs mt-1">
                {isEn ? opt.nameEn : opt.nameFa}
              </strong>
              <div className="text-[10px] text-slate-400 mt-2 space-y-1">
                <div className="flex justify-between">
                  <span>{isEn ? 'Est. CAPEX:' : 'هزینه برآوردی:'}</span>
                  <span className="text-slate-200 font-mono">${opt.estimatedCapexUsdPerKw.toFixed(2)}/kW</span>
                </div>
                <div className="flex justify-between">
                  <span>{isEn ? 'Install Speed:' : 'سرعت اجرا:'}</span>
                  <span className="text-slate-200 font-mono">{opt.installSpeedMwPerWeek} MW/wk</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 italic border-t border-industrial-border/80 pt-1">
                {opt.pros[0]}
              </p>
            </div>
          ))}
        </div>

        {/* Broms Pile Sizing & Frost Compliance Bar */}
        <div className="p-3 bg-industrial-bg/70 border border-industrial-border rounded-lg text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <span className="text-slate-400 block text-[10px]">{isEn ? 'Broms Steel Profile:' : 'پروفیل شمع کوبشی:'}</span>
            <span className="font-mono font-bold text-industrial-warning text-sm">{recResult.recommendedPileSizing.pileSection}</span>
            <span className="text-[9px] text-slate-400 block mt-0.5">Fy = 345 MPa</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px]">{isEn ? 'Required Embedment (L):' : 'عمق کوبش الزامی (L):'}</span>
            <span className="font-mono font-bold text-sky-300 text-sm">{recResult.recommendedPileSizing.embedmentDepthM} m</span>
            <span className="text-[9px] text-industrial-success block mt-0.5">
              &gt; Frost depth + 1.0m ({recResult.recommendedPileSizing.minDepthForFrostM}m)
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px]">{isEn ? 'Lateral Factor of Safety:' : 'ضریب اطمینان جانبی (FoS):'}</span>
            <span className="font-mono font-bold text-industrial-success text-sm">{recResult.recommendedPileSizing.fosLateral}</span>
            <span className="text-[9px] text-slate-400 block mt-0.5">
              Hu={recResult.recommendedPileSizing.appliedLateralShearKn}kN vs Cap={recResult.recommendedPileSizing.lateralCapacityKn}kN
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px]">{isEn ? '+20% Wind Gust Adequacy:' : 'مقاومت در باد تندباد (+20%):'}</span>
            <span className={`font-mono font-bold text-sm ${recResult.sensitivityPlus20Wind.pileAdequate ? 'text-industrial-success' : 'text-industrial-warning'}`}>
              {recResult.sensitivityPlus20Wind.pileAdequate ? 'ADEQUATE' : 'UPGRADE PROFILE'}
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5">
              FoS = {recResult.sensitivityPlus20Wind.fosLateral} @ {recResult.sensitivityPlus20Wind.windSpeedKmh} km/h
            </span>
          </div>
        </div>
      </div>

      {/* 6-Section Engineering Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-industrial-surface border border-industrial-border rounded-lg flex flex-col overflow-hidden text-slate-100">
            <div className="px-5 py-3.5 bg-industrial-bg border-b border-industrial-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-industrial-accent" />
                <h3 className="font-bold text-sm text-white">{isEn ? 'Civil Foundation Engineering Sizing Report' : 'گزارش محاسبات ژئوتکنیک و سایزینگ فونداسیون'}</h3>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
              >
                ✕ {isEn ? 'Close' : 'بستن'}
              </button>
            </div>
            <div className="p-5 overflow-y-auto font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
              {recResult.reportMarkdown}
            </div>
          </div>
        </div>
      )}

      {/* SHALLOW BEDROCK & PILE REFUSAL MITIGATION ENGINEERING PANEL */}
      <div className="studio-card border border-amber-500/50 bg-gradient-to-b from-[#141C2E] to-[#0E1422] p-4 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-amber-500/30 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-amber-200">
                  {isEn
                    ? 'Difficult Soil & Shallow Bedrock Mitigation: High Embedment Alternatives'
                    : 'راهکارهای مهندسی خاک‌های دشوار: جایگزین‌های عمق کوبش زیاد و پس‌زدگی در سنگ بستر'}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  FHWA-NHI-05-039 · Eurocode 7 · ASCE 7-22
                </span>
              </div>
              <p className="text-[11px] text-slate-300/80 mt-0.5">
                {isEn
                  ? 'In shallow bedrock, cemented caliche, or boulder terrain, direct ramming (>1.8m) hits pile refusal or causes profile buckling. Evaluate and apply rock-socket micropiles or ground surface ballast.'
                  : 'در سایت‌های دارای سنگ بستر کم‌عمق، لایه‌های کالیچی سخت یا قلوه‌سنگ، کوبش عمیق شمع‌ها (>۱.۸m) با امتناع کوبش (Refusal) و لهیدگی مقطع مواجه می‌شود. دو راهکار استاندارد زیر عمق نفوذ را به شدت کاهش داده یا صفر می‌کنند:'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-[10px] font-mono text-amber-300 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
              {isEn ? 'Refusal Mitigation Matrix' : 'ماتریس مهار امتناع کوبش'}
            </span>
          </div>
        </div>

        {/* 3-Way Comparative Strategy Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Option 1: Direct Driven Pile */}
          <div
            className={`p-3.5 rounded-lg border transition flex flex-col justify-between ${
              foundationType === 'rammed_steel_pile'
                ? 'bg-sky-950/40 border-sky-500/70 ring-1 ring-sky-500'
                : 'bg-slate-900/60 border-industrial-border hover:border-slate-600'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {isEn ? 'Standard Method' : 'روش کوبشی متداول'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {isEn ? 'Depth: ~1.85m' : 'عمق: ~۱.۸۵ متر'}
                </span>
              </div>
              <strong className="text-white block text-xs mb-1.5">
                {isEn ? 'Direct Rammed Steel C-Pile' : 'شمع کوبشی مستقیم در خاک'}
              </strong>
              <p className="text-[11px] text-slate-400 mb-2.5 leading-relaxed">
                {isEn
                  ? 'Fast and economical in soft/medium soils, but prone to penetrative refusal at 0.6–0.9m in rock or caliche, risking pile damage and insufficient uplift resistance.'
                  : 'در خاک‌های رسی و ماسه‌ای سریع و اقتصادی است؛ اما در سنگ بستر یا کالیچ در عمق ۰.۶ الی ۰.۹ متر دچار امتناع کوبش و لهیدگی سر شمع می‌شود.'}
              </p>
              <div className="space-y-1 text-[10px] text-slate-300 border-t border-industrial-border/60 pt-2 mb-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">{isEn ? 'Refusal Risk:' : 'ریسک پس‌زدگی سنگ:'}</span>
                  <span className="text-rose-400 font-bold">{isEn ? 'HIGH (in rock/caliche)' : 'بسیار بالا (در سنگ/کالیچ)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isEn ? 'Uplift Mechanism:' : 'مکانیزم مهار کشش:'}</span>
                  <span className="text-slate-200">{isEn ? 'Soil skin friction' : 'اصطکاک جدار خاک'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isEn ? 'Embedment Req:' : 'عمق الزامی کوبش:'}</span>
                  <span className="text-industrial-warning font-mono">1.60 – 2.20 m</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFoundationType('rammed_steel_pile');
                setIsManualDepth(false);
                setCustomEmbedmentDepthM(null);
                onUpdateSiteOverrides?.({ ...siteOverrides, foundationType: 'rammed_steel_pile' });
              }}
              className={`w-full py-1.5 px-2 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                foundationType === 'rammed_steel_pile'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              {foundationType === 'rammed_steel_pile' ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
              <span>{isEn ? (foundationType === 'rammed_steel_pile' ? 'Active Selection' : 'Select Direct Ramming') : (foundationType === 'rammed_steel_pile' ? 'روش فعال' : 'انتخاب کوبش مستقیم')}</span>
            </button>
          </div>

          {/* Option 2: Pre-Drilled Rock-Socket Grouted Pile */}
          <div
            className={`p-3.5 rounded-lg border transition flex flex-col justify-between ${
              foundationType === 'pre_drilled_grouted_pile'
                ? 'bg-emerald-950/40 border-emerald-500/70 ring-1 ring-emerald-500'
                : 'bg-slate-900/60 border-industrial-border hover:border-slate-600'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  {isEn ? '★ Depth Reduced 55%' : '★ کاهش ۵۵٪ عمق کوبش'}
                </span>
                <span className="text-[10px] font-mono text-emerald-300 font-bold">
                  {isEn ? 'Depth: 0.75–0.95m' : 'عمق: ۰.۷۵ الی ۰.۹۵ متر'}
                </span>
              </div>
              <strong className="text-white block text-xs mb-1.5">
                {isEn ? 'Pre-Drilled Rock-Socket Grouted Pile' : 'شمع در گمانه پیش‌حفاری با تزریق گروت پرمقاومت'}
              </strong>
              <p className="text-[11px] text-slate-300 mb-2.5 leading-relaxed">
                {isEn
                  ? 'Down-The-Hole (DTH) pneumatic rock drill creates a 120mm socket only 0.85m deep. Encasing the post in 35MPa non-shrink grout mobilizes huge rock bond shear (τ_bond ≥ 1.5 MPa), completely bypassing pile refusal.'
                  : 'حفاری گمانه ۱۲۰mm به عمق تنها ۰.۸۵ متر در سنگ بستر + تزریق گروت ۳۵ مگاپاسکال. چسبندگی عالی گروت به سنگ (τ_bond ≥ ۱.۵ MPa) امتناع کوبش را کاملاً رفع کرده و عمق را ۵۵٪ کاهش می‌دهد.'}
              </p>
              <div className="space-y-1 text-[10px] text-slate-300 border-t border-industrial-border/60 pt-2 mb-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">{isEn ? 'Refusal Risk:' : 'ریسک پس‌زدگی سنگ:'}</span>
                  <span className="text-emerald-400 font-bold">{isEn ? 'ZERO (pre-drilled socket)' : 'صفر (حفاری مکانیکی)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isEn ? 'Uplift Mechanism:' : 'مکانیزم مهار کشش:'}</span>
                  <span className="text-emerald-300">{isEn ? 'Grout-Rock Bond (τ ≥ 1.5 MPa)' : 'چسبندگی برشی گروت-سنگ'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isEn ? 'Grout Volume / Post:' : 'مصرف گروت هر پایه:'}</span>
                  <span className="text-emerald-400 font-mono">~9.6 Liters (0.0096 m³)</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFoundationType('pre_drilled_grouted_pile');
                setIsManualDepth(false);
                setCustomEmbedmentDepthM(null);
                onUpdateSiteOverrides?.({ ...siteOverrides, foundationType: 'pre_drilled_grouted_pile' });
              }}
              className={`w-full py-1.5 px-2 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                foundationType === 'pre_drilled_grouted_pile'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-500/50'
              }`}
            >
              {foundationType === 'pre_drilled_grouted_pile' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5 text-emerald-300" />}
              <span>{isEn ? (foundationType === 'pre_drilled_grouted_pile' ? 'Active Selection' : '1-Click Apply Grouted Socket') : (foundationType === 'pre_drilled_grouted_pile' ? 'روش فعال' : 'اعمال راهکار شمع پیش‌حفاری (۱-کلیک)')}</span>
            </button>
          </div>

          {/* Option 3: Ground Surface Precast Ballast Blocks */}
          <div
            className={`p-3.5 rounded-lg border transition flex flex-col justify-between ${
              foundationType === 'surface_ballasted_block'
                ? 'bg-purple-950/40 border-purple-500/70 ring-1 ring-purple-500'
                : 'bg-slate-900/60 border-industrial-border hover:border-slate-600'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                  {isEn ? '0.0m Penetration' : 'بدون نفوذ (عمق ۰.۰ متر)'}
                </span>
                <span className="text-[10px] font-mono text-purple-300 font-bold">
                  {isEn ? 'Surface Mount' : 'نصب سطحی زمینی'}
                </span>
              </div>
              <strong className="text-white block text-xs mb-1.5">
                {isEn ? 'Ground Surface Precast Ballast Blocks' : 'بلوک‌های بتنی مسلح سطحی زمینی'}
              </strong>
              <p className="text-[11px] text-slate-300 mb-2.5 leading-relaxed">
                {isEn
                  ? 'Zero penetration into the ground. Heavy precast reinforced concrete blocks rest on compacted crushed stone pads (μ ≥ 0.50). Ideal when drilling is prohibited, or for capped landfills and underground utilities.'
                  : 'بدون هیچ‌گونه نفوذ یا حفاری در زمین. بلوک‌های بتنی مسلح روی پد سنگ‌شکسته کوبیده (μ ≥ ۰.۵۰) قرار می‌گیرند. ایده‌آل برای اراضی سنگی بدون امکان حفاری، مدفن‌ها یا حریم کابل/لوله.'}
              </p>
              <div className="space-y-1 text-[10px] text-slate-300 border-t border-industrial-border/60 pt-2 mb-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">{isEn ? 'Refusal Risk:' : 'ریسک پس‌زدگی سنگ:'}</span>
                  <span className="text-emerald-400 font-bold">{isEn ? 'ZERO (no penetration)' : 'صفر مطلق (سطحی)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isEn ? 'Uplift Mechanism:' : 'مکانیزم مهار کشش:'}</span>
                  <span className="text-purple-300">{isEn ? 'Gravity Self-Weight + Pad Friction' : 'وزن بتن + اصطکاک بستر'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isEn ? 'Base Friction Pad:' : 'ضریب اصطکاک پد:'}</span>
                  <span className="text-purple-400 font-mono">μ = 0.50 (Crushed stone)</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFoundationType('surface_ballasted_block');
                setIsManualDepth(false);
                setCustomEmbedmentDepthM(null);
                onUpdateSiteOverrides?.({ ...siteOverrides, foundationType: 'surface_ballasted_block' });
              }}
              className={`w-full py-1.5 px-2 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                foundationType === 'surface_ballasted_block'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-500/50'
              }`}
            >
              {foundationType === 'surface_ballasted_block' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5 text-purple-300" />}
              <span>{isEn ? (foundationType === 'surface_ballasted_block' ? 'Active Selection' : '1-Click Apply Surface Ballast') : (foundationType === 'surface_ballasted_block' ? 'روش فعال' : 'اعمال بلوک سطحی (۱-کلیک)')}</span>
            </button>
          </div>
        </div>

        {/* Detailed Technical Callout for the Active Difficult-Soil Typology */}
        {foundationType === 'pre_drilled_grouted_pile' && (
          <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-lg text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-300 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{isEn ? 'Active Mitigation Details: Pre-Drilled Rock-Socket Grouted Micro-Pile' : 'مشخصات فنی و محاسباتی راهکار شمع در گمانه پیش‌حفاری با تزریق گروت:'}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300">
              <div className="p-2 bg-slate-900/70 rounded border border-emerald-500/20">
                <span className="text-slate-400 block text-[10px]">{isEn ? 'Rock Socket Depth:' : 'عمق گمانه در سنگ بستر:'}</span>
                <span className="font-mono text-emerald-300 font-bold text-sm">{structResult.recommendedDepthM} m</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">{isEn ? 'vs 1.9m for driven pile' : '۵۵٪ کاهش نسبت به شمع کوبشی'}</span>
              </div>
              <div className="p-2 bg-slate-900/70 rounded border border-emerald-500/20">
                <span className="text-slate-400 block text-[10px]">{isEn ? 'Borehole Diameter:' : 'قطر گمانه حفاری:'}</span>
                <span className="font-mono text-sky-300 font-bold text-sm">120 mm (DTH)</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">{isEn ? 'Pneumatic down-hole hammer' : 'چکش بادی درون چاهی'}</span>
              </div>
              <div className="p-2 bg-slate-900/70 rounded border border-emerald-500/20">
                <span className="text-slate-400 block text-[10px]">{isEn ? 'Grout Bond Strength:' : 'تنش چسبندگی گروت-سنگ:'}</span>
                <span className="font-mono text-emerald-300 font-bold text-sm">τ_bond ≥ 1.50 MPa</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">{isEn ? 'FHWA-NHI-05-039 / EC7' : 'استاندارد میکروپایل FHWA'}</span>
              </div>
              <div className="p-2 bg-slate-900/70 rounded border border-emerald-500/20">
                <span className="text-slate-400 block text-[10px]">{isEn ? 'Total Grout Volume:' : 'حجم کل تزریق گروت ۳۵MPa:'}</span>
                <span className="font-mono text-purple-300 font-bold text-sm">{structResult.concreteVolumeTotalM3} m³</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">~{structResult.cementBagsCount} {isEn ? 'bags (50kg)' : 'کیسه ۵۰kg گروت'}</span>
              </div>
            </div>
          </div>
        )}

        {foundationType === 'surface_ballasted_block' && (
          <div className="p-3 bg-purple-950/30 border border-purple-500/40 rounded-lg text-xs space-y-2">
            <div className="flex items-center gap-2 text-purple-300 font-bold">
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
              <span>{isEn ? 'Active Mitigation Details: Ground Surface Precast Ballast Blocks' : 'مشخصات فنی و محاسباتی راهکار بلوک بتنی مسلح سطحی زمینی:'}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300">
              <div className="p-2 bg-slate-900/70 rounded border border-purple-500/20">
                <span className="text-slate-400 block text-[10px]">{isEn ? 'Ground Penetration:' : 'عمق نفوذ در خاک:'}</span>
                <span className="font-mono text-emerald-300 font-bold text-sm">0.00 m</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">{isEn ? '100% surface mounting' : '۱۰۰٪ نصب سطحی بدون حفاری'}</span>
              </div>
              <div className="p-2 bg-slate-900/70 rounded border border-purple-500/20">
                <span className="text-slate-400 block text-[10px]">{isEn ? 'Ballast Weight / Table:' : 'وزن بالاست هر میز:'}</span>
                <span className="font-mono text-purple-300 font-bold text-sm">{Math.round((structResult.concreteVolumeTotalM3 / Math.max(1, structResult.totalTablesCount)) * 2400)} kg</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">{Math.round((structResult.concreteVolumeTotalM3 / Math.max(1, structResult.totalPostsCount)) * 2400)} kg/{isEn ? 'post' : 'پایه'}</span>
              </div>
              <div className="p-2 bg-slate-900/70 rounded border border-purple-500/20">
                <span className="text-slate-400 block text-[10px]">{isEn ? 'Sliding Safety Factor:' : 'ضریب اطمینان لغزش (FoS):'}</span>
                <span className="font-mono text-emerald-300 font-bold text-sm">{structResult.fosSliding}</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">μ = 0.50 (FoS ≥ 1.40)</span>
              </div>
              <div className="p-2 bg-slate-900/70 rounded border border-purple-500/20">
                <span className="text-slate-400 block text-[10px]">{isEn ? 'Overturning FoS:' : 'ضریب اطمینان واژگونی:'}</span>
                <span className="font-mono text-emerald-300 font-bold text-sm">{structResult.fosOverturning}</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">{isEn ? 'Required ≥ 1.50' : 'حداقل مجاز ≥ ۱.۵۰'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Structure & Foundation Configuration Controls */}
      <div className="studio-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-industrial-border/80 gap-2 mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Hammer className="w-4 h-4 text-industrial-accent" />
            <span>{isEn ? 'Mounting Table & Foundation Configuration:' : 'پیکربندی میز سازه و نوع فونداسیون:'}</span>
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">{isEn ? 'Embedment Mode:' : 'حالت عمق کوبش:'}</span>
            <button
              type="button"
              onClick={() => {
                setIsManualDepth(!isManualDepth);
                if (isManualDepth) {
                  setCustomEmbedmentDepthM(null);
                } else {
                  setCustomEmbedmentDepthM(structResult.recommendedDepthM);
                }
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition border ${
                isManualDepth
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              }`}
            >
              {isManualDepth
                ? (isEn ? 'Manual Override Active' : 'تنظیم دستی کاربر')
                : (isEn ? 'Auto Broms Analysis' : 'محاسبه خودکار برمز')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {isEn ? 'Foundation Type:' : 'نوع فونداسیون سازه:'}
            </label>
            <select
              value={foundationType}
              onChange={(e) => {
                const val = e.target.value as FoundationType;
                setFoundationType(val);
                onUpdateSiteOverrides?.({ ...siteOverrides, foundationType: val });
              }}
              className="studio-input text-xs"
            >
              <option value="rammed_steel_pile">
                {isEn ? 'Rammed Steel C-Piles (Direct Soil Driving)' : 'پایه‌های کوبشی فولادی C شکل (کوبش مستقیم در خاک)'}
              </option>
              <option value="pre_drilled_grouted_pile">
                {isEn ? 'Pre-Drilled Grouted Micro-Piles (Refusal & Shallow Bedrock)' : 'شمع در گمانه پیش‌حفاری با گروت (راهکار حذف پس‌زدگی سنگ بستر)'}
              </option>
              <option value="surface_ballasted_block">
                {isEn ? 'Ground Surface Ballast Blocks (Zero Penetration)' : 'بلوک‌های بتنی مسلح سطحی زمینی (بدون نفوذ در خاک)'}
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

        {/* Advanced Interactive Tuning (Depth, Posts per Table, Ground Clearance) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-industrial-border/60 text-xs">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-300 font-semibold">
                {isEn ? 'Pile Embedment Depth:' : 'عمق کوبش شمع در خاک:'}
              </label>
              <span className="font-mono text-industrial-warning font-bold">
                {structResult.recommendedDepthM} m
                {!isManualDepth && <span className="text-[10px] text-slate-400 font-normal"> (Auto)</span>}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.8"
                max="3.5"
                step="0.1"
                value={isManualDepth && customEmbedmentDepthM !== null ? customEmbedmentDepthM : structResult.recommendedDepthM}
                onChange={(e) => {
                  setIsManualDepth(true);
                  setCustomEmbedmentDepthM(parseFloat(e.target.value));
                }}
                className="w-full accent-industrial-accent"
              />
              <input
                type="number"
                min="0.8"
                max="3.5"
                step="0.1"
                value={isManualDepth && customEmbedmentDepthM !== null ? customEmbedmentDepthM : structResult.recommendedDepthM}
                onChange={(e) => {
                  setIsManualDepth(true);
                  setCustomEmbedmentDepthM(parseFloat(e.target.value) || 1.5);
                }}
                className="w-16 bg-slate-900 border border-industrial-border rounded px-1.5 py-0.5 text-center font-mono text-white text-xs"
              />
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {isEn
                ? `Min frost heave depth: ${(structResult.frostDepthCm / 100 + 1.0).toFixed(2)} m (ASCE 7-22)`
                : `حداقل عمق یخبندان خاک: ${(structResult.frostDepthCm / 100 + 1.0).toFixed(2)} متر (مبحث ۶)`}
            </span>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-300 font-semibold">
                {isEn ? 'Posts per Table:' : 'تعداد پایه‌ها در هر میز:'}
              </label>
              <span className="font-mono text-sky-300 font-bold">
                {structResult.postsPerTable} {isEn ? 'posts' : 'پایه'}
              </span>
            </div>
            <select
              value={customPostsPerTable ?? 'auto'}
              onChange={(e) => {
                const val = e.target.value;
                setCustomPostsPerTable(val === 'auto' ? null : parseInt(val));
              }}
              className="studio-input text-xs"
            >
              <option value="auto">{isEn ? 'Auto (Size-Based)' : 'خودکار (بر اساس ابعاد میز)'}</option>
              <option value="2">{isEn ? '2 Posts per Table (Lightweight)' : '۲ پایه در هر میز'}</option>
              <option value="4">{isEn ? '4 Posts per Table (Standard 2P14)' : '۴ پایه در هر میز (استاندارد ۲ ردیفه)'}</option>
              <option value="6">{isEn ? '6 Posts per Table (High-Wind Heavy Duty)' : '۶ پایه در هر میز (باد شدید و ایمن)'}</option>
              <option value="8">{isEn ? '8 Posts per Table (Severe Exposure)' : '۸ پایه در هر میز (سایت‌های بحرانی)'}</option>
            </select>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {isEn ? 'Increases posts to divide wind uplift per pile' : 'افزایش پایه، نیروی مکش هر شمع را تا ۵۰٪ کاهش می‌دهد'}
            </span>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-300 font-semibold">
                {isEn ? 'Ground Clearance Height:' : 'ارتفاع آزاد زیر پنل (Clearance):'}
              </label>
              <span className="font-mono text-purple-300 font-bold">{groundClearanceM} m</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={groundClearanceM}
                onChange={(e) => setGroundClearanceM(parseFloat(e.target.value))}
                className="w-full accent-purple-400"
              />
              <span className="w-12 text-center font-mono text-white text-xs">{groundClearanceM}m</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {isEn ? 'Lower clearance reduces overturning moment arm' : 'کاهش ارتفاع آزاد بازوی لنگر واژگونی را کوتاه می‌کند'}
            </span>
          </div>
        </div>
      </div>

      {/* Structural Force Badges & Geotechnical Safety Checks */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">{isEn ? 'Velocity Wind Pressure (q_z)' : 'فشار سرعتی باد (q_z)'}</div>
          <div className="text-xl font-bold font-mono text-industrial-accent mt-1">
            {structResult.velocityWindPressureQzN_M2} <span className="text-xs font-normal">N/m²</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {isEn ? 'Design wind pressure per INBC 6 / ASCE 7' : 'فشار طراحی باد طبق مبحث ۶ و ASCE 7'}
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">{isEn ? 'Table Wind Uplift Force' : 'نیروی مکش باد بر هر میز (Uplift)'}</div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-1">
            {structResult.windUpliftForceKn} <span className="text-xs font-normal">kN</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {isEn
              ? `Uplift demand: ${structResult.upliftPerPostKn} kN/post`
              : `کشش باد روی هر پایه: ${structResult.upliftPerPostKn} kN`}
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">{isEn ? 'Post Bearing Pressure' : 'تنش باربری اعمالی به خاک'}</div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              structResult.isBearingCapacitySafe ? 'text-industrial-success' : 'text-rose-400'
            }`}
          >
            {structResult.appliedPostBearingPressureKpa} <span className="text-xs font-normal">kPa</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {isEn ? 'Allowable:' : 'مجاز:'} {structResult.allowableSoilBearingKpa} kPa (
            {structResult.isBearingCapacitySafe ? (isEn ? '✓ OK' : '✓ ایمن') : (isEn ? '✗ Exceeded' : '✗ اضافه تنش')})
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {foundationType === 'rooftop_ballasted_block' || foundationType === 'surface_ballasted_block'
              ? (isEn ? 'Overturning Safety Factor (FoS)' : 'ضریب اطمینان واژگونی (FoS)')
              : foundationType === 'pre_drilled_grouted_pile'
              ? (isEn ? 'Rock-Socket Grout Bond FoS' : 'ضریب اطمینان چسبندگی گروت در سنگ')
              : (isEn ? 'Pile Tension Uplift FoS' : 'ضریب اطمینان کشش شمع (FoS)')}
          </div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              structResult.isStructurallySafe ? 'text-industrial-success' : 'text-rose-400'
            }`}
          >
            {foundationType === 'rooftop_ballasted_block' || foundationType === 'surface_ballasted_block' ? (
              <>
                {structResult.fosOverturning}
              </>
            ) : (
              <>
                {structResult.fosUplift}
              </>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {foundationType === 'rooftop_ballasted_block' || foundationType === 'surface_ballasted_block'
              ? (isEn ? 'Required ≥ 1.5 (self-weight overturning)' : 'حداقل ۱.۵ (واژگونی وزن خود)')
              : foundationType === 'pre_drilled_grouted_pile'
              ? (isEn ? `Eurocode 7 ≥ 2.0 (τ_bond ≥ 1.5 MPa, T_ult = ${structResult.upliftCapacityPerPostKn.toFixed(1)} kN)`
                     : `یوروکد ۷ حداقل ۲.۰ (چسبندگی ۱.۵MPa، ظرفیت ${structResult.upliftCapacityPerPostKn.toFixed(1)} kN)`)
              : (isEn ? `Eurocode 7 ≥ 2.0 (T_ult = ${structResult.upliftCapacityPerPostKn.toFixed(1)} kN/post)`
                     : `یوروکد ۷ حداقل ۲.۰ (T_ult = ${structResult.upliftCapacityPerPostKn.toFixed(1)} kN)`)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {foundationType === 'rooftop_ballasted_block' || foundationType === 'surface_ballasted_block' ? (
              <span>
                {isEn ? 'Sliding FoS:' : 'ضریب لغزش:'}{' '}
                <span className="font-mono text-industrial-success">{structResult.fosSliding}</span> (≥ 1.4)
              </span>
            ) : (
              <span>
                {isEn ? 'Broms Lateral FoS:' : 'ضریب جانبی برمز:'}{' '}
                <span className={`font-mono ${structResult.fosLateral >= 1.5 ? 'text-industrial-success' : 'text-amber-400'}`}>
                  {structResult.fosLateral}
                </span> (≥ 1.5)
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            {structResult.isStructurallySafe ? (
              <span className="text-industrial-success flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {isEn ? 'Stable (Design Compliant)' : 'مجاز و ایمن (مطابق استاندارد)'}
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1 font-semibold">
                <AlertTriangle className="w-3 h-3" /> {isEn ? 'Unstable (Remediation Needed)' : 'ناپایدار (نیازمند اصلاح)'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ACTIONABLE FOS OPTIMIZATION & REMEDIAL ENGINEERING GUIDANCE */}
      {structResult.remedialGuidance.isWarning && (
        <div className="studio-card border-2 border-amber-500/50 bg-amber-950/20 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-amber-500/30 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-400">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                  <span>{isEn ? 'Actionable FoS Optimization & Remedial Engineering Guidance' : 'راهکارهای مهندسی اصلاح و ارتقای ضریب اطمینان (FoS):'}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/30 text-rose-300 border border-rose-500/50">
                    {isEn ? 'ACTION REQUIRED' : 'نیازمند اقدام اصلاحی'}
                  </span>
                </h3>
                <p className="text-[11px] text-amber-200/80 mt-0.5">
                  {isEn
                    ? 'The current structural or geotechnical safety factor is below regulatory code thresholds. Adjust the parameters below or apply the one-click auto-stabilize.'
                    : 'ضریب اطمینان سازه یا فونداسیون از حدود مجاز آیین‌نامه کمتر است. پارامترهای زیر را تنظیم نمایید یا از کلید اصلاح خودکار استفاده فرمایید.'}
                </p>
              </div>
            </div>

            {/* One-Click Auto-Stabilize Button */}
            <button
              type="button"
              onClick={() => {
                setIsManualDepth(true);
                setCustomEmbedmentDepthM(structResult.remedialGuidance.targetEmbedmentDepthM);
                setCustomPostsPerTable(structResult.remedialGuidance.targetPostsPerTable);
              }}
              className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition self-start sm:self-center"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>{isEn ? 'One-Click Auto-Stabilize' : 'اعمال تنظیمات بهینه خودکار'}</span>
            </button>
          </div>

          {/* Diagnostic Failure Mode & Target Requirements */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-3 text-xs">
            <div className="p-2.5 bg-slate-900/80 border border-industrial-border rounded">
              <span className="text-slate-400 block text-[10px]">{isEn ? 'Governing Constraint:' : 'محدودیت بحرانی حاکم:'}</span>
              <strong className="text-rose-300 font-mono text-sm block mt-0.5">
                {structResult.remedialGuidance.governingFailureMode === 'uplift_tension'
                  ? (isEn ? 'Pile Uplift Tension Pullout' : 'کشش و برآمدگی شمع (Tension Pullout)')
                  : structResult.remedialGuidance.governingFailureMode === 'overturning_moment'
                  ? (isEn ? 'Overturning Moment' : 'لنگر واژگونی استراکچر')
                  : structResult.remedialGuidance.governingFailureMode === 'sliding'
                  ? (isEn ? 'Lateral Sliding / Shear' : 'لغزش و برش جانبی خاک')
                  : (isEn ? 'Soil Bearing Capacity' : 'تنش باربری مجاز خاک')}
              </strong>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {isEn ? 'Current FoS:' : 'ضریب فعلی:'} <span className="text-rose-400 font-bold">{structResult.remedialGuidance.governingFos}</span> (
                {isEn ? 'Required ≥' : 'حداقل مجاز:'} {structResult.remedialGuidance.requiredFos})
              </span>
            </div>

            <div className="p-2.5 bg-slate-900/80 border border-industrial-border rounded">
              <span className="text-slate-400 block text-[10px]">{isEn ? 'Target Embedment Depth:' : 'عمق کوبش هدف برای پایداری:'}</span>
              <strong className="text-emerald-400 font-mono text-sm block mt-0.5">
                {structResult.remedialGuidance.targetEmbedmentDepthM} m
              </strong>
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsManualDepth(true);
                    setCustomEmbedmentDepthM(structResult.remedialGuidance.targetEmbedmentDepthM);
                  }}
                  className="text-[10px] text-sky-300 hover:text-white underline flex items-center gap-0.5"
                >
                  <ArrowUpRight className="w-3 h-3" />
                  {isEn ? `Apply ${structResult.remedialGuidance.targetEmbedmentDepthM}m` : `تنظیم روی ${structResult.remedialGuidance.targetEmbedmentDepthM} متر`}
                </button>
              </div>
            </div>

            <div className="p-2.5 bg-slate-900/80 border border-industrial-border rounded">
              <span className="text-slate-400 block text-[10px]">{isEn ? 'Target Posts per Table:' : 'تعداد پایه پیشنهادی در هر میز:'}</span>
              <strong className="text-sky-300 font-mono text-sm block mt-0.5">
                {structResult.remedialGuidance.targetPostsPerTable} {isEn ? 'posts' : 'پایه'}
              </strong>
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCustomPostsPerTable(structResult.remedialGuidance.targetPostsPerTable)}
                  className="text-[10px] text-sky-300 hover:text-white underline flex items-center gap-0.5"
                >
                  <ArrowUpRight className="w-3 h-3" />
                  {isEn ? `Apply ${structResult.remedialGuidance.targetPostsPerTable} posts` : `تنظیم روی ${structResult.remedialGuidance.targetPostsPerTable} پایه`}
                </button>
              </div>
            </div>
          </div>

          {/* Remedial Engineering Recommendations Checklist */}
          <div className="space-y-1.5 pt-2 border-t border-amber-500/20 text-xs">
            <span className="text-amber-300 font-bold block mb-1">
              {isEn ? 'Recommended Engineering Corrective Actions:' : 'دستورالعمل‌ها و راهکارهای اصلاحی مهندسی:'}
            </span>
            <ul className="space-y-1 text-slate-300 text-[11px]">
              {(isEn ? structResult.remedialGuidance.actionsEn : structResult.remedialGuidance.actionsFa).map((act, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-slate-900/50 p-2 rounded border border-industrial-border/60">
                  <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Structural Engineering & Civil BOM Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Box 1: Foundation Technical Specifications */}
        <div className="studio-card">
          <h3 className="text-sm font-bold text-industrial-accent mb-3 flex items-center gap-2">
            <Boxes className="w-4 h-4 text-industrial-success" />
            {isEn ? 'Foundation & Geotechnical Dimensions:' : 'مشخصات ژئوتکنیکی و ابعاد فونداسیون:'}
          </h3>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex justify-between items-center py-1.5 border-b border-industrial-border">
              <span className="text-slate-400">{isEn ? 'Selected Foundation:' : 'نوع فونداسیون منتخب:'}</span>
              <strong className="text-white">
                {isEn ? structResult.foundationNameEn : structResult.foundationNameFa}
              </strong>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-industrial-border">
              <span className="text-slate-400">{isEn ? 'Dimensions & Depth:' : 'ابعاد و عمق نفوذ در خاک:'}</span>
              <span className="font-mono text-industrial-warning">
                {isEn ? structResult.foundationDimensionsDescEn : structResult.foundationDimensionsDesc}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-industrial-border">
              <span className="text-slate-400">{isEn ? 'Frost Penetration Depth Check:' : 'کنترل عمق یخبندان:'}</span>
              <span className={`font-mono ${structResult.isFrostDepthRespected ? 'text-industrial-success' : 'text-rose-400'}`}>
                {structResult.recommendedDepthM * 100} cm &gt; {structResult.frostDepthCm} cm (
                {structResult.isFrostDepthRespected ? (isEn ? '✓ Pass' : '✓ تأیید') : (isEn ? '✗ Too Shallow' : '✗ کم‌عمق')})
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-industrial-border">
              <span className="text-slate-400">{isEn ? 'Total Tables Count:' : 'تعداد کل میزهای سازه (Tables):'}</span>
              <span className="font-mono text-sky-300">
                {structResult.totalTablesCount} {isEn ? 'tables' : 'میز'} ({structResult.postsPerTable} {isEn ? 'posts/table' : 'پایه در هر میز'})
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-industrial-border">
              <span className="text-slate-400">{isEn ? 'Total Piles / Posts:' : 'تعداد کل پایه‌ها / شمع‌های کوبشی:'}</span>
              <strong className="font-mono text-industrial-success">{structResult.totalPostsCount} {isEn ? 'posts' : 'پایه'}</strong>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-industrial-border">
              <span className="text-slate-400">{isEn ? 'Compression Load per Post:' : 'نیروی فشاری روی هر پایه (Compression):'}</span>
              <span className="font-mono text-slate-200">{structResult.compressionPerPostKn} kN</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-industrial-border">
              <span className="text-slate-400">{isEn ? 'Lateral Shear Load per Post:' : 'نیروی برشی جانبی هر پایه (Lateral Shear):'}</span>
              <span className="font-mono text-slate-200">{structResult.lateralShearPerPostKn} kN</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-industrial-border">
              <span className="text-slate-400">{isEn ? 'Broms Pile Section & Lateral FoS:' : 'مقطع فولادی برمز و ضریب جانبی:'}</span>
              <span className="font-mono text-industrial-accent">
                {structResult.bromsPileSection} (FoS = {structResult.fosLateral})
              </span>
            </div>
            {foundationType === 'pre_drilled_grouted_pile' && (
              <div className="flex justify-between items-center py-1.5 border-b border-industrial-border">
                <span className="text-slate-400">{isEn ? 'Rock-Socket Grout Bond Strength:' : 'تنش چسبندگی پیوند سنگ-گروت (τ_bond):'}</span>
                <span className="font-mono text-emerald-300 font-bold">1500 kPa (1.50 MPa)</span>
              </div>
            )}
            {foundationType === 'surface_ballasted_block' && (
              <div className="flex justify-between items-center py-1.5 border-b border-industrial-border">
                <span className="text-slate-400">{isEn ? 'Bedding Pad Friction Coefficient (μ):' : 'ضریب اصطکاک پد سنگ‌شکسته (μ):'}</span>
                <span className="font-mono text-purple-300 font-bold">0.50 (Crushed stone)</span>
              </div>
            )}
            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-400">{isEn ? 'Ultimate Skin-Friction Uplift (T_ult):' : 'ظرفیت کشش نهایی جدار خاک (T_ult):'}</span>
              <span className="font-mono text-industrial-success">
                {structResult.upliftCapacityPerPostKn.toFixed(1)} kN/post (FoS = {structResult.fosUplift})
              </span>
            </div>
          </div>
        </div>

        {/* Box 2: Civil Works Bill of Materials (BOM) */}
        <div className="studio-card">
          <h3 className="text-sm font-bold text-industrial-accent mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-purple-400" />
            {isEn ? 'Civil Works Bill of Materials (BOM):' : 'احجام عملیات عمرانی و متره مواد مصرفی (Civil BOM):'}
          </h3>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex justify-between items-center py-1.5 border-b border-industrial-border">
              <span className="text-slate-400">
                {foundationType === 'pre_drilled_grouted_pile'
                  ? (isEn ? 'Total 35MPa Grout Volume:' : 'حجم کل تزریق گروت پرمقاومت ۳۵MPa:')
                  : foundationType === 'surface_ballasted_block'
                  ? (isEn ? 'Precast Surface Concrete Volume:' : 'حجم کل بتن مسلح بلوک‌های سطحی:')
                  : (isEn ? 'Total Foundation Concrete:' : 'حجم کل بتن‌ریزی فونداسیون:')
                }
              </span>
              <span className="font-mono font-bold text-industrial-success text-sm">
                {structResult.concreteVolumeTotalM3} m³ {structResult.concreteVolumeTotalM3 === 0 && (isEn ? '(Zero for Rammed Steel Piles)' : '(صفر در روش پایه‌های کوبشی)')}
              </span>
            </div>
            {structResult.concreteVolumeTotalM3 > 0 && (
              <>
                <div className="flex justify-between items-center py-1.5 border-b border-industrial-border">
                  <span className="text-slate-400">
                    {foundationType === 'pre_drilled_grouted_pile'
                      ? (isEn ? 'Non-Shrink Grout Bags Required (50kg):' : 'تعداد کیسه گروت بدون انقباض (۵۰kg):')
                      : (isEn ? 'C25 Cement Bags Required:' : 'تعداد کیسه سیمان مورد نیاز (C25):')
                    }
                  </span>
                  <span className="font-mono text-sky-300">
                    ~{structResult.cementBagsCount} {isEn ? 'bags (50kg)' : 'کیسه ۵۰ کیلویی'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-industrial-border">
                  <span className="text-slate-400">
                    {foundationType === 'pre_drilled_grouted_pile'
                      ? (isEn ? 'Graded Silica Sand for Grout:' : 'ماسه سیلیسی دانه‌بندی شده:')
                      : (isEn ? 'Sand & Washed Gravel:' : 'شن و ماسه شسته:')
                    }
                  </span>
                  <span className="font-mono text-slate-200">{structResult.sandGravelTon} {isEn ? 'tons' : 'تن'}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-industrial-border">
                  <span className="text-slate-400">
                    {foundationType === 'pre_drilled_grouted_pile'
                      ? (isEn ? 'Centralizers & Anchor Hardware:' : 'اسپیسر، سنترالایزر و متعلقات مهار:')
                      : (isEn ? 'Total Steel Rebar Cages:' : 'وزن کل آرماتور و میلگرد مسلح:')
                    }
                  </span>
                  <span className="font-mono text-industrial-warning">{structResult.steelRebarWeightTotalKg} kg</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center py-1.5 border-b border-industrial-border">
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
      <div className="studio-card bg-industrial-surface/90 border border-industrial-border">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded bg-industrial-accent/10 border border-industrial-accent/30 text-industrial-accent mt-0.5">
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
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-industrial-border">INBC Part 6 (مبحث ۶ مقررات ملی)</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-industrial-border">ASCE 7-22 Wind Criteria</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-industrial-border">ACI 318 Concrete Piers</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-industrial-border">ASTM A123 Hot-Dip Galvanizing</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-industrial-border">Iranian Standard 2800 (Seismic)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
