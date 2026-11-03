import React, { useState, useMemo, useEffect } from 'react';
import { Sun, Cpu, AlertTriangle, CheckCircle2, Layers, Zap, Eye, Search, Filter } from 'lucide-react';
import { PvArrayDesignResult, ModuleSpecs, InverterSpecs } from '../engine/pvEngineAdvanced';
import { InverterClusteringResult } from '../engine/inverterClustering';
import { CATALOG_MODULES, CATALOG_INVERTERS, CatalogInverter } from '../engine/equipmentCatalogData';
import { ClimateCity } from '../engine/climaticData';
import { ShadingAnalysisSubTab } from './ShadingAnalysisSubTab';
import { assessSaltCorrosion, SaltCorrosionOutput } from '../engine/corrosion/saltCorrosionEngine';
import { TrackerConfig, computeTrackerState } from '../engine/tracker/backtrackingEngine';

interface PvArrayEngineeringTabProps {
  selectedModule: ModuleSpecs;
  onModuleChange: (mod: ModuleSpecs) => void;
  selectedInverter: InverterSpecs;
  onInverterChange: (inv: InverterSpecs) => void;
  arrayDesign: PvArrayDesignResult;
  inverterClustering: InverterClusteringResult;
  city?: ClimateCity;
  systemMode?: 'powerplant' | 'ongrid' | 'offgrid';
  targetPowerplantCapacityKw?: number;
  annualYieldMwh?: number;
  trackerConfig?: TrackerConfig | null;
  onTrackerConfigChange?: (cfg: TrackerConfig | null) => void;
  cityLatitude?: number;
  lang?: 'fa' | 'en';
}

export const PvArrayEngineeringTab: React.FC<PvArrayEngineeringTabProps> = ({
  selectedModule,
  onModuleChange,
  selectedInverter,
  onInverterChange,
  arrayDesign,
  inverterClustering,
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
    dataSourceFa: '',
    dataSourceEn: '',
    dataRetrievalDate: '2024-06-15',
  },
  systemMode = 'powerplant',
  targetPowerplantCapacityKw = 1000,
  annualYieldMwh,
  trackerConfig = null,
  onTrackerConfigChange,
  cityLatitude = 35.69,
  lang = 'fa',
}) => {
  const [gcrInput, setGcrInput] = useState(0.33);
  const [axisTiltInput, setAxisTiltInput] = useState(0);
  const [maxRotInput, setMaxRotInput] = useState(60);
  const isEn = lang === 'en';
  const [activeSubTab, setActiveSubTab] = useState<'sizing' | 'shading'>('sizing');

  // Search & Filter state
  const [moduleSearch, setModuleSearch] = useState('');
  const [inverterSearch, setInverterSearch] = useState('');
  const [inverterCategory, setInverterCategory] = useState<'all' | 'string' | 'turnkey' | 'hybrid'>('all');
  const [corrosion, setCorrosion] = useState<SaltCorrosionOutput | null>(null);

  // Salt corrosion / ISO 9223 inverter derating (resolved via OSM Nominatim shoreline distance)
  useEffect(() => {
    let mounted = true;
    if (!city) { setCorrosion(null); return; }
    assessSaltCorrosion({ latitude: city.latitude, longitude: city.longitude, resolveDistance: true })
      .then((res) => { if (mounted) setCorrosion(res); })
      .catch(() => { if (mounted) setCorrosion(null); });
    return () => { mounted = false; };
  }, [city]);

  // Filtered Modules
  const filteredModules = useMemo(() => {
    return CATALOG_MODULES.filter((m) => {
      const q = moduleSearch.toLowerCase();
      return (
        m.manufacturer.toLowerCase().includes(q) ||
        m.modelName.toLowerCase().includes(q) ||
        m.pmpWatts.toString().includes(q) ||
        m.cellType.toLowerCase().includes(q)
      );
    });
  }, [moduleSearch]);

  // Filtered Inverters:
  // RULE (Item 5): MV Turnkey stations (MW capacity) MUST ONLY be active/selectable in Powerplant mode!
  const filteredInverters = useMemo(() => {
    return CATALOG_INVERTERS.filter((inv) => {
      // If not powerplant, exclude mv_turnkey
      if (systemMode !== 'powerplant' && inv.technology === 'mv_turnkey') {
        return false;
      }

      // Filter by category pill if chosen
      if (inverterCategory === 'string' && inv.technology !== 'string_inverter') return false;
      if (inverterCategory === 'turnkey' && inv.technology !== 'mv_turnkey') return false;
      if (inverterCategory === 'hybrid' && inv.technology !== 'hybrid_offgrid') return false;

      const q = inverterSearch.toLowerCase();
      return (
        inv.manufacturer.toLowerCase().includes(q) ||
        inv.modelName.toLowerCase().includes(q) ||
        inv.pnomKw.toString().includes(q)
      );
    });
  }, [systemMode, inverterCategory, inverterSearch]);

  return (
    <div className="space-y-6">
      {/* PR-2a-7-P0-FOLLOWUP (ISSUE-2b): Target vs Designed vs Expected — two-step sizing visibility */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3 bg-industrial-surface border border-industrial-border rounded-lg">
          <div className="text-xs text-slate-400">
            {lang === 'fa' ? 'ظرفیت هدف (AC اسمی)' : 'Target Capacity (AC nameplate)'}
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {targetPowerplantCapacityKw} <span className="text-xs">kW AC</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {lang === 'fa' ? 'ورودی کاربر' : 'User input'}
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border rounded-lg">
          <div className="text-xs text-slate-400">
            {lang === 'fa' ? 'ظرفیت طراحی‌شده (DC)' : 'Designed Array (DC)'}
          </div>
          <div className="text-xl font-bold font-mono text-industrial-accent mt-1">
            {arrayDesign.totalPvCapacityKwp.toFixed(1)} <span className="text-xs">kWp DC</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            DC/AC = {(arrayDesign.totalPvCapacityKwp / Math.max(0.1, targetPowerplantCapacityKw)).toFixed(2)}
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border rounded-lg">
          <div className="text-xs text-slate-400">
            {lang === 'fa' ? 'تولید سالانه پیش‌بینی‌شده' : 'Expected Annual Yield'}
          </div>
          <div className="text-xl font-bold font-mono text-industrial-success mt-1">
            {(annualYieldMwh ?? 0).toLocaleString()} <span className="text-xs">MWh/yr</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {lang === 'fa' ? 'بر اساس ۱۴ مرحله waterfall' : 'From 14-stage waterfall'}
          </div>
        </div>
      </div>

      {/* PR-2a-7: Single-axis tracker with slope-aware backtracking */}
      <div className="studio-card">
        <div className="flex flex-wrap items-center gap-3 text-xs mb-3">
          <span className="font-semibold text-slate-300">
            {lang === 'fa' ? 'معماری tracker:' : 'Tracker Architecture:'}
          </span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="trackerMode"
              checked={trackerConfig === null}
              onChange={() => onTrackerConfigChange?.(null)}
              className="accent-sky-400"
            />
            <span>{lang === 'fa' ? 'شیب ثابت (Fixed Tilt)' : 'Fixed Tilt'}</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="trackerMode"
              checked={trackerConfig !== null}
              onChange={() => onTrackerConfigChange?.({ gcr: gcrInput, axisTiltDeg: axisTiltInput, maxRotationDeg: maxRotInput, enableBacktracking: true, albedo: 0.2, latitudeDeg: cityLatitude })}
              className="accent-amber-400"
            />
            <span className="text-industrial-warning font-bold">
              {lang === 'fa' ? 'ترکر تک‌محوره با Backtracking' : '1-Axis Tracker (with Backtracking)'}
            </span>
          </label>
        </div>
        {trackerConfig !== null && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">GCR (0.30-0.45):</label>
              <input type="number" step="0.01" min="0.1" max="0.9" value={gcrInput}
                onChange={(e) => { const v = Math.min(0.9, Math.max(0.1, parseFloat(e.target.value) || 0.33)); setGcrInput(v); onTrackerConfigChange?.({ ...trackerConfig, gcr: v }); }}
                className="studio-input w-full font-mono" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">{lang === 'fa' ? 'شیب محور (درجه)' : 'Axis tilt (deg)'}:</label>
              <input type="number" step="1" min="-30" max="30" value={axisTiltInput}
                onChange={(e) => { const v = Math.min(30, Math.max(-30, parseFloat(e.target.value) || 0)); setAxisTiltInput(v); onTrackerConfigChange?.({ ...trackerConfig, axisTiltDeg: v }); }}
                className="studio-input w-full font-mono" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">{lang === 'fa' ? 'حداکثر چرخش (درجه)' : 'Max rotation (deg)'}:</label>
              <input type="number" step="5" min="15" max="90" value={maxRotInput}
                onChange={(e) => { const v = Math.min(90, Math.max(15, parseFloat(e.target.value) || 60)); setMaxRotInput(v); onTrackerConfigChange?.({ ...trackerConfig, maxRotationDeg: v }); }}
                className="studio-input w-full font-mono" />
            </div>
          </div>
        )}
        {trackerConfig !== null && (() => {
          // Live sample: winter solstice noon at site latitude
          let st: ReturnType<typeof computeTrackerState> | null = null;
          let trackerWarning = false;
          try {
            const lat = cityLatitude * (Math.PI / 180);
            const decl = -23.45 * (Math.PI / 180);
            const sinElev = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl);
            const zenithRad = Math.PI / 2 - Math.asin(sinElev);
            // BUG-10: clamp inputs to physical ranges (GCR, max rotation, axis tilt)
            const safeConfig: TrackerConfig = {
              ...trackerConfig,
              gcr: Math.min(0.9, Math.max(0.1, trackerConfig.gcr)) || 0.33,
              maxRotationDeg: Math.min(90, Math.max(15, trackerConfig.maxRotationDeg)) || 60,
              axisTiltDeg: Math.min(30, Math.max(-30, trackerConfig.axisTiltDeg)) || 0,
            };
            st = computeTrackerState({ zenithRad, azimuthRad: Math.PI }, safeConfig);
          } catch {
            trackerWarning = true;
          }
          if (trackerWarning || st === null) {
            return (
              <div className="mt-3 text-[11px] font-mono text-amber-400">
                {lang === 'fa'
                  ? 'هشدار: محاسبه وضعیت ردیاب با این تنظیمات ممکن نیست — مقادیر GCR، بیشینه چرخش و شیب محور را بررسی کنید.'
                  : 'Warning: tracker state could not be computed with these inputs — check GCR, max rotation, and axis tilt ranges.'}
              </div>
            );
          }
          return (
            <div className="mt-3 text-[11px] font-mono text-industrial-accent">
              {lang === 'fa'
                ? `زاویه چرخش نمونه (noon انقلاب زمستانی): ${st.rotationDeg.toFixed(2)}° | true-tracking: ${st.trueTrackingDeg.toFixed(2)}° | AOI: ${st.aoiDeg.toFixed(2)}°`
                : `Sample rotation (winter-solstice noon): ${st.rotationDeg.toFixed(2)} deg | true-tracking: ${st.trueTrackingDeg.toFixed(2)} deg | AOI: ${st.aoiDeg.toFixed(2)} deg`}
            </div>
          );
        })()}
      </div>

      {/* Sub-Tab Navigation Header */}
      <div className="flex border-b border-industrial-border pb-2 gap-2">
        <button
          onClick={() => setActiveSubTab('sizing')}
          className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-colors ${
            activeSubTab === 'sizing'
              ? 'bg-sky-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{isEn ? 'Array & Inverter Sizing' : 'پیکربندی استرینگ‌ها و اینورتر'}</span>
        </button>
        <button
          onClick={() => setActiveSubTab('shading')}
          className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-colors ${
            activeSubTab === 'shading'
              ? 'bg-sky-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Eye className="w-4 h-4 text-industrial-warning" />
          <span>{isEn ? '3D Shading & Sun Path Analysis' : 'تحلیل سه‌بعدی سایه‌اندازی و مسیر خورشید'}</span>
        </button>
      </div>

      {activeSubTab === 'shading' ? (
        <ShadingAnalysisSubTab
          city={city}
          tiltAngleDeg={city.optimalTiltAnnualDeg || 28}
          lang={lang}
        />
      ) : (
        <div className="space-y-6">
          {/* Title Card */}
          <div className="studio-card">
            <h1 className="text-xl font-bold text-industrial-accent mb-1 flex items-center gap-2">
              <Sun className="w-5 h-5 text-industrial-warning" />
              {isEn
                ? 'PV Array Sizing & Inverter Clustering (IEC 62548)'
                : 'مهندسی آرایه فتوولتائیک و کلاسترینگ اینورتر (PV Array & Inverter Engineering)'}
            </h1>
            <p className="text-slate-400 text-xs">
              {isEn
                ? 'String voltage optimization based on winter extreme Voc (NEC 690.7), NOCT thermal loss factor, and intelligent inverter matching.'
                : 'پیکربندی استرینگ‌ها بر اساس ولتاژ MPPT و سرمای زمستان (NEC 690.7)، ضریب افت حرارتی NOCT، و کلاسترینگ هوشمند اینورترها'}
            </p>
          </div>

          {/* Hardware Selectors with Search & Filtering */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Module Picker */}
            <div className="studio-card">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300">
                  {isEn ? 'Select PV Module Model:' : 'انتخاب مدل پنل فتوولتائیک:'}
                </label>
                <span className="text-industrial-warning font-mono font-bold text-xs">{selectedModule.pmpWatts}W TOPCon</span>
              </div>

              {/* Module Search Bar */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={isEn ? 'Search modules (e.g., Jinko, 585W, TOPCon)...' : 'جستجوی پنل (جینکو، ۵۸۵، تاپ‌کان)...'}
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                  className="studio-input text-xs pr-8 py-1.5 w-full"
                />
              </div>

              <select
                value={selectedModule.modelName}
                onChange={(e) => {
                  const found = CATALOG_MODULES.find((m) => m.modelName === e.target.value);
                  if (found) {
                    onModuleChange({
                      manufacturer: found.manufacturer,
                      modelName: found.modelName,
                      pmpWatts: found.pmpWatts,
                      vocVolts: found.vocVolts,
                      vmpVolts: found.vmpVolts,
                      iscAmps: found.iscAmps,
                      impAmps: found.impAmps,
                      tempCoeffVocPct: found.tempCoeffVocPct,
                      tempCoeffPmpPct: found.tempCoeffPmpPct,
                      noctC: 45.0,
                      lengthM: found.lengthMm / 1000.0,
                      widthM: found.widthMm / 1000.0,
                    });
                  }
                }}
                className="studio-input text-xs w-full"
              >
                {filteredModules.map((m) => (
                  <option key={m.id} value={m.modelName}>
                    {m.manufacturer} {m.modelName} ({m.pmpWatts}W - {m.cellType})
                  </option>
                ))}
              </select>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-300 bg-industrial-surface/60 p-2.5 rounded border border-industrial-border/60">
                <div>Voc: <strong className="font-mono text-industrial-accent">{selectedModule.vocVolts}V</strong></div>
                <div>Vmp: <strong className="font-mono text-industrial-accent">{selectedModule.vmpVolts}V</strong></div>
                <div>Isc: <strong className="font-mono text-industrial-success">{selectedModule.iscAmps}A</strong></div>
                <div>{isEn ? 'Voc Temp Coeff:' : 'ضریب دما Voc:'} <span className="font-mono">{selectedModule.tempCoeffVocPct}%/°C</span></div>
                <div>{isEn ? 'Pmp Temp Coeff:' : 'ضریب دما Pmp:'} <span className="font-mono">{selectedModule.tempCoeffPmpPct}%/°C</span></div>
                <div>{isEn ? 'Dimensions:' : 'ابعاد:'} <span className="font-mono">{selectedModule.lengthM.toFixed(2)}×{selectedModule.widthM.toFixed(2)}m</span></div>
              </div>
            </div>

            {/* 2. Inverter Picker with Powerplant/Turnkey Enforcement */}
            <div className="studio-card">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300">
                  {isEn ? 'Select Solar Inverter Model:' : 'انتخاب مدل اینورتر خورشیدی:'}
                </label>
                <span className="text-industrial-accent font-mono font-bold text-xs">{selectedInverter.pnomAcKw} kW AC</span>
              </div>

              {/* Inverter Quick Category Tabs */}
              <div className="flex flex-wrap items-center gap-1 mb-2">
                <button
                  type="button"
                  onClick={() => setInverterCategory('all')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                    inverterCategory === 'all' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {isEn ? 'All' : 'همه'}
                </button>
                <button
                  type="button"
                  onClick={() => setInverterCategory('string')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                    inverterCategory === 'string' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {isEn ? 'String Inverters' : 'اینورترهای رشته‌ای (String)'}
                </button>
                {systemMode === 'powerplant' && (
                  <button
                    type="button"
                    onClick={() => setInverterCategory('turnkey')}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                      inverterCategory === 'turnkey' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-purple-300 hover:text-white'
                    }`}
                  >
                    {isEn ? 'MV Turnkey Stations' : 'پست‌های Turnkey کانتینری'}
                  </button>
                )}
                {systemMode !== 'powerplant' && (
                  <button
                    type="button"
                    onClick={() => setInverterCategory('hybrid')}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                      inverterCategory === 'hybrid' ? 'bg-industrial-success text-white' : 'bg-slate-800 text-industrial-success hover:text-white'
                    }`}
                  >
                    {isEn ? 'Hybrid / Off-Grid' : 'هیبرید و آفگرید'}
                  </button>
                )}
              </div>

              {/* Inverter Search Bar */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={
                    isEn
                      ? systemMode === 'powerplant'
                        ? 'Search inverters (Huawei 330kW, Sungrow 3.125MW, Solis)...'
                        : 'Search string & hybrid inverters (Deye, Growatt, SMA)...'
                      : 'جستجوی مدل اینورتر...'
                  }
                  value={inverterSearch}
                  onChange={(e) => setInverterSearch(e.target.value)}
                  className="studio-input text-xs pr-8 py-1.5 w-full"
                />
              </div>

              <select
                value={selectedInverter.modelName}
                onChange={(e) => {
                  const found = CATALOG_INVERTERS.find((i) => i.modelName === e.target.value);
                  if (found) {
                    onInverterChange({
                      manufacturer: found.manufacturer,
                      modelName: found.modelName,
                      pnomAcKw: found.pnomKw,
                      vdcMaxVolts: found.vdcMaxVolts,
                      vmpptMinVolts: found.vmpptMinVolts,
                      vmpptMaxVolts: found.vmpptMaxVolts,
                      iscMaxAmpsPerMppt: found.technology === 'mv_turnkey' ? 120.0 : 26.0,
                      imppMaxAmpsPerMppt: found.technology === 'mv_turnkey' ? 100.0 : 22.0,
                      mpptChannelsCount: found.mpptCount,
                      efficiencyMaxPct: found.efficiencyMaxPct,
                      isThreePhase: found.isThreePhase,
                    });
                  }
                }}
                className="studio-input text-xs w-full"
              >
                {filteredInverters.map((i) => (
                  <option key={i.id} value={i.modelName}>
                    {i.technology === 'mv_turnkey' ? '⚡ [MV Turnkey] ' : ''}
                    {i.manufacturer} {i.modelName} ({i.pnomKw >= 1000 ? `${(i.pnomKw / 1000).toFixed(2)}MW` : `${i.pnomKw}kW`} - {i.isThreePhase ? '3P' : '1P'})
                  </option>
                ))}
              </select>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-300 bg-industrial-surface/60 p-2.5 rounded border border-industrial-border/60">
                <div>Vdc Max: <strong className="font-mono text-industrial-error">{selectedInverter.vdcMaxVolts}V</strong></div>
                <div>MPPT Min: <strong className="font-mono text-industrial-accent">{selectedInverter.vmpptMinVolts}V</strong></div>
                <div>MPPT Max: <strong className="font-mono text-industrial-accent">{selectedInverter.vmpptMaxVolts}V</strong></div>
                <div>{isEn ? 'MPPT Channels:' : 'تعداد MPPT:'} <span className="font-mono font-bold">{selectedInverter.mpptChannelsCount} {isEn ? 'Ch' : 'کانال'}</span></div>
                <div>{isEn ? 'Phases:' : 'سیستم فاز:'} <span>{selectedInverter.isThreePhase ? (isEn ? 'Three-Phase 400/800V' : 'سه فاز') : (isEn ? 'Single-Phase 230V' : 'تکفاز')}</span></div>
                <div>{isEn ? 'Efficiency:' : 'راندمان:'} <span className="font-mono text-industrial-success">{selectedInverter.efficiencyMaxPct}%</span></div>
                {corrosion && (
                  <div>{isEn ? 'Salt Corrosion Derate:' : 'تأثیر شوری:'} <span className={`font-mono font-bold text-xs ${corrosion.inverterDeratePct > 0 ? 'text-industrial-error' : 'text-industrial-success'}`}>-{corrosion.inverterDeratePct}% → MTBF ×${(1 - corrosion.inverterDeratePct / 100).toFixed(2)}</span></div>
                )}
              </div>
            </div>
          </div>

          {/* Sizing & String Configuration Results */}
          <div className="studio-card">
            <h3 className="font-bold text-industrial-accent text-sm mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-industrial-accent" />
              {isEn ? 'Array String Configuration & MPPT Verification' : 'پیکربندی استرینگ‌ها و آرایه خورشیدی (String Configuration)'}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
              <div className="p-3 bg-industrial-surface/80 border border-industrial-border rounded-lg">
                <span className="text-slate-400 block mb-0.5">{isEn ? 'Total Array DC Peak' : 'توان کل آرایه DC'}</span>
                <span className="text-lg font-bold font-mono text-industrial-warning">
                  {arrayDesign.totalPvCapacityKwp.toFixed(2)} kWp
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{arrayDesign.totalModulesCount} {isEn ? 'Modules' : 'عدد پنل'}</span>
              </div>

              <div className="p-3 bg-industrial-surface/80 border border-industrial-border rounded-lg">
                <span className="text-slate-400 block mb-0.5">{isEn ? 'String Architecture' : 'پیکربندی رشته‌ها'}</span>
                <span className="text-lg font-bold font-mono text-industrial-accent">
                  {arrayDesign.parallelStringsCount}P × {arrayDesign.modulesPerString}S
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {isEn
                    ? `Allowed: ${arrayDesign.minModulesPerStringAllowed} to ${arrayDesign.maxModulesPerStringAllowed} mod/str`
                    : `مجاز: ${arrayDesign.minModulesPerStringAllowed} تا ${arrayDesign.maxModulesPerStringAllowed} در استرینگ`}
                </span>
              </div>

              <div className="p-3 bg-industrial-surface/80 border border-industrial-border rounded-lg">
                <span className="text-slate-400 block mb-0.5">{isEn ? 'Coldest Day Voc,max' : 'ولتاژ سردترین روز (Voc,max)'}</span>
                <span className="text-lg font-bold font-mono text-industrial-accent">
                  {arrayDesign.stringVocMaxColdVolts.toFixed(1)} V
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {isEn ? 'Inverter Max:' : 'سقف اینورتر:'} {selectedInverter.vdcMaxVolts}V (
                  {arrayDesign.stringVocMaxColdVolts <= selectedInverter.vdcMaxVolts ? (isEn ? '✓ Safe' : '✓ ایمن') : (isEn ? '✗ High' : '✗ خطر')})
                </span>
              </div>

              <div className="p-3 bg-industrial-surface/80 border border-industrial-border rounded-lg">
                <span className="text-slate-400 block mb-0.5">{isEn ? 'DC-to-AC Ratio (ILR)' : 'نسبت DC به AC'}</span>
                <span className="text-lg font-bold font-mono text-industrial-success">
                  {arrayDesign.dcAcRatio.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {arrayDesign.dcAcRatio <= 1.35 ? (isEn ? 'Optimal (No Clipping)' : 'بهینه بدون Clipping') : (isEn ? 'Potential Inverter Clipping' : 'ممکن است افت برش داشته باشد')}
                </span>
              </div>
            </div>

            {/* Area and Inter-row shading */}
            <div className="p-3 bg-industrial-surface/60 rounded-lg border border-industrial-border/60 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-slate-400 block">{isEn ? 'Net Module Active Area:' : 'مساحت خالص پنل‌ها:'}</span>
                <span className="text-white font-mono font-bold text-sm">
                  {Math.round(arrayDesign.netArrayAreaM2)} {isEn ? 'm²' : 'متر مربع'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">{isEn ? 'Required Row Pitch Spacing:' : 'فاصله ردیف‌ها جهت عدم سایه‌اندازی (Pitch):'}</span>
                <span className="text-sky-300 font-mono font-bold text-sm">
                  {arrayDesign.interRowSpacingM.toFixed(2)} {isEn ? 'm' : 'متر'}
                </span>
                <span className="text-[10px] text-slate-400 block">{isEn ? 'Winter Solstice Noon Criterion' : 'بر مبنای ظهر انقلاب زمستانی'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{isEn ? 'Gross Land Footprint Area:' : 'مساحت ناخالص عرصه مورد نیاز:'}</span>
                <span className="text-industrial-success font-mono font-bold text-sm">
                  {Math.round(arrayDesign.grossRequiredLandAreaM2)} {isEn ? 'm²' : 'متر مربع'}
                </span>
                <span className="text-[10px] text-slate-400 block">{isEn ? 'Includes access aisles & buffer' : 'شامل راهروهای دسترسی و نگهداری'}</span>
              </div>
            </div>

            {/* Warnings */}
            {arrayDesign.warnings.length > 0 && (
              <div className="mt-3 p-2.5 bg-industrial-warning/20 border border-industrial-warning/50 rounded-lg text-xs text-industrial-warning space-y-1">
                {arrayDesign.warnings.map((w, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-industrial-warning shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inverter Clustering & Auto Voltage Stepping */}
          <div className="studio-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-industrial-accent text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-industrial-success" />
                {isEn ? 'Auto-Stepping & Inverter Paralleling Architecture' : 'سیستم تطبیق خودکار و کلاسترینگ اینورترها (Auto-Stepping & Paralleling)'}
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-800 text-sky-300 border border-industrial-border">
                {isEn ? 'Class:' : 'کلاس:'} {isEn ? inverterClustering.engineeringClass.titleEn : inverterClustering.engineeringClass.titleFa}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs mb-4">
              <div className="p-3 bg-industrial-surface/80 border border-industrial-border rounded-lg">
                <span className="text-slate-400 block mb-0.5">{isEn ? 'Inverter DC Bus Nominal Voltage' : 'ولتاژ نامی باس اینورتر (DC)'}</span>
                <span className="text-xl font-bold font-mono text-purple-400">
                  {inverterClustering.inverterDcBusNominalV} V DC
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {isEn ? 'Operating midpoint of inverter MPPT window' : 'نقطه میانی پنجره MPPT اینورتر'}
                </span>
              </div>

              <div className="p-3 bg-industrial-surface/80 border border-industrial-border rounded-lg">
                <span className="text-slate-400 block mb-0.5">{isEn ? 'Battery DC Bus Voltage (BESS)' : 'ولتاژ باس باتری (BESS)'}</span>
                <span className="text-xl font-bold font-mono text-purple-400">
                  {inverterClustering.batteryDcBusNominalV} V DC
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {isEn ? 'Optimized for string voltage and safety' : inverterClustering.autoSteppingReasonFa}
                </span>
              </div>

              <div className="p-3 bg-industrial-surface/80 border border-industrial-border rounded-lg">
                <span className="text-slate-400 block mb-0.5">{isEn ? 'Required Inverter Units' : 'تعداد اینورترهای پارالل مورد نیاز'}</span>
                <span className="text-xl font-bold font-mono text-industrial-accent">
                  {inverterClustering.parallelUnitsCount} {isEn ? 'Units' : 'دستگاه'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {isEn ? 'Total AC Rating:' : 'مجموع ظرفیت:'} {inverterClustering.totalInverterCapacityKw} kW AC
                </span>
              </div>

              <div className="p-3 bg-industrial-surface/80 border border-industrial-border rounded-lg">
                <span className="text-slate-400 block mb-0.5">{isEn ? 'Continuous / Surge DC Bus Current' : 'جریان پیوسته / هجومی باسبار DC'}</span>
                <div className="font-mono text-slate-200 mt-1">
                  {isEn ? 'Continuous:' : 'پیوسته:'} <strong className="text-industrial-success">{inverterClustering.inverterDcContinuousCurrentAmps.toFixed(1)}A</strong>
                </div>
                <div className="font-mono text-slate-200">
                  {isEn ? 'Surge Peak:' : 'هجومی:'} <strong className="text-industrial-error">{inverterClustering.inverterDcSurgeCurrentAmps.toFixed(1)}A</strong>
                </div>
              </div>
            </div>

            {/* Health status badge */}
            <div className="p-3 bg-industrial-surface/60 rounded-lg border border-industrial-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                {inverterClustering.healthStatus === 'compatible' ? (
                  <CheckCircle2 className="w-4 h-4 text-industrial-success shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-industrial-warning shrink-0" />
                )}
                <span className="font-semibold text-white">
                  {isEn
                    ? inverterClustering.healthStatus === 'compatible'
                      ? 'Compatible Clustering'
                      : 'Upgrade Advised'
                    : inverterClustering.healthStatusTextFa}:
                </span>
                <span className="text-slate-300">
                  {isEn
                    ? inverterClustering.healthStatus === 'compatible'
                      ? 'Inverter capacity matches array Peak DC rating efficiently.'
                      : 'Consider adding an additional parallel inverter.'
                    : inverterClustering.recommendationFa}
                </span>
              </div>
            </div>

            {/* Climatic & Altitude Inverter Derating (IEC 62109-1 / PR-2a-6) */}
            {(() => {
              const thermalDerate = Math.max(0, (city.tempMaxC - 45) * 1.5);
              const altitudeDerate = Math.max(0, ((city.elevationM - 2000) / 100) * 1.0);
              const combinedFactor = (1 - thermalDerate / 100) * (1 - altitudeDerate / 100);
              const totalDeratePct = Number(((1 - combinedFactor) * 100).toFixed(1));
              const deratedUnitKw = Number((selectedInverter.pnomAcKw * combinedFactor).toFixed(1));
              const totalEffectiveKw = Number((inverterClustering.totalInverterCapacityKw * combinedFactor).toFixed(1));

              return (
                <div className="mt-3 p-3 bg-industrial-bg/80 border border-industrial-border/70 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-industrial-warning" />
                      {isEn
                        ? 'Climatic & Elevation Inverter Derating (IEC 62109-1)'
                        : 'افت حرارتی و ارتفاعی اینورتر بر مبنای استاندارد IEC 62109-1'}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      totalDeratePct > 0 ? 'bg-industrial-warning/20 text-industrial-warning border border-industrial-warning/40' : 'bg-industrial-success/20 text-industrial-success border border-emerald-500/40'
                    }`}>
                      {totalDeratePct > 0 ? `-${totalDeratePct}% Derating Applied` : '0% Full Nominal Power'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 bg-industrial-surface/60 rounded border border-industrial-border">
                      <span className="text-slate-400 block text-[10px]">{isEn ? 'Max Ambient Temp:' : 'دمای حداکثر محیط:'}</span>
                      <span className="font-mono font-bold text-slate-200">{city.tempMaxC}°C</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        {city.tempMaxC > 45 ? `>${45}°C: -${thermalDerate.toFixed(1)}%` : 'No thermal derating (<=45°C)'}
                      </span>
                    </div>

                    <div className="p-2 bg-industrial-surface/60 rounded border border-industrial-border">
                      <span className="text-slate-400 block text-[10px]">{isEn ? 'Site Elevation:' : 'ارتفاع از سطح دریا:'}</span>
                      <span className="font-mono font-bold text-slate-200">{city.elevationM} m</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        {city.elevationM > 2000 ? `>2000m: -${altitudeDerate.toFixed(1)}% (1%/100m)` : 'Sea level to 2000m (0% derate)'}
                      </span>
                    </div>

                    <div className="p-2 bg-industrial-surface/60 rounded border border-industrial-border">
                      <span className="text-slate-400 block text-[10px]">{isEn ? 'Derated Unit AC Rating:' : 'توان موثر هر دستگاه:'}</span>
                      <span className="font-mono font-bold text-industrial-warning">{deratedUnitKw} kW</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        Nominal: {selectedInverter.pnomAcKw} kW
                      </span>
                    </div>

                    <div className="p-2 bg-industrial-surface/60 rounded border border-industrial-border">
                      <span className="text-slate-400 block text-[10px]">{isEn ? 'Effective Plant AC Output:' : 'خروجی خالص موثر کل:'}</span>
                      <span className="font-mono font-bold text-industrial-success">{totalEffectiveKw} kW</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        {inverterClustering.parallelUnitsCount} units in parallel
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default PvArrayEngineeringTab;
