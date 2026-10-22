import React, { useState, useMemo } from 'react';
import {
  Shield,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Wrench,
  HelpCircle,
  Compass,
  ArrowRight,
  Anchor,
  Radio,
  Sliders,
} from 'lucide-react';
import {
  CableRunConfig,
  CableRunResult,
  calculateAdvancedCableRun,
  calculateEarthingSystem,
  calculateLightningProtection,
  ConductorMaterial,
  InsulationType,
  UpstreamGroundingSystem,
  ProtectionBomItem,
} from '../engine/protectionBomEngine';

interface ProtectionBomTabProps {
  systemCapacityKw?: number;
  isUtilityPowerplant?: boolean;
  stringVocMaxVolts?: number;
  stringIscAmps?: number;
  parallelStringsCount?: number;
  inverterDcContinuousCurrentAmps?: number;
  systemDcVoltage?: number;
  isThreePhase?: boolean;
  lang?: 'fa' | 'en';
}

export const ProtectionBomTab: React.FC<ProtectionBomTabProps> = ({
  systemCapacityKw = 1000,
  isUtilityPowerplant = true,
  stringVocMaxVolts = 1100,
  stringIscAmps = 14.5,
  parallelStringsCount = 20,
  inverterDcContinuousCurrentAmps = 250,
  systemDcVoltage = 48,
  isThreePhase = true,
  lang = 'fa',
}) => {
  // Cable Run User Inputs
  const [dcStringLengthM, setDcStringLengthM] = useState<number>(35);
  const [dcStringMaterial, setDcStringMaterial] = useState<ConductorMaterial>('copper');
  const [dcStringInsulation, setDcStringInsulation] = useState<InsulationType>('xlpe');

  const [dcMainBusbarLengthM, setDcMainBusbarLengthM] = useState<number>(isUtilityPowerplant ? 80 : 15);
  const [dcMainMaterial, setDcMainMaterial] = useState<ConductorMaterial>(isUtilityPowerplant ? 'aluminum' : 'copper');
  const [dcMainInsulation, setDcMainInsulation] = useState<InsulationType>('xlpe');

  const [acOutputLengthM, setAcOutputLengthM] = useState<number>(isUtilityPowerplant ? 120 : 25);
  const [acMaterial, setAcMaterial] = useState<ConductorMaterial>(isUtilityPowerplant ? 'aluminum' : 'copper');
  const [acInsulation, setAcInsulation] = useState<InsulationType>('xlpe');

  const [batteryCableLengthM, setBatteryCableLengthM] = useState<number>(3);
  const [batteryMaterial, setBatteryMaterial] = useState<ConductorMaterial>('copper');

  // Earthing Inputs
  const [soilResistivity, setSoilResistivity] = useState<number>(100);
  const [upstreamGrounding, setUpstreamGrounding] = useState<UpstreamGroundingSystem>('solidly_grounded');

  // Active view tab
  const [activeSubTab, setActiveSubTab] = useState<'cables' | 'earthing' | 'lightning' | 'bom'>('cables');

  // 1. Calculate Cable Runs
  const cableRuns: CableRunResult[] = useMemo(() => {
    const runs: CableRunConfig[] = [
      {
        id: 'dc-string',
        sectionNameFa: 'کابل DC استرینگ خورشیدی تا تابلوی تجمیع/اینورتر',
        sectionNameEn: 'PV DC String to Inverter / Combiner Box',
        oneWayLengthM: dcStringLengthM,
        designCurrentAmps: stringIscAmps * 1.25,
        nominalVoltageVolts: stringVocMaxVolts * 0.85,
        conductorMaterial: dcStringMaterial,
        insulationType: dcStringInsulation,
        allowableDropPct: 1.5,
        isDc: true,
      },
      {
        id: 'dc-main',
        sectionNameFa: 'کابل باسبار اصلی DC آرایه به اینورتر مرکزی/پست',
        sectionNameEn: 'Main DC Feeder Busbar to Inverter Skid',
        oneWayLengthM: dcMainBusbarLengthM,
        designCurrentAmps: stringIscAmps * parallelStringsCount * 1.25,
        nominalVoltageVolts: stringVocMaxVolts * 0.85,
        conductorMaterial: dcMainMaterial,
        insulationType: dcMainInsulation,
        allowableDropPct: 1.5,
        isDc: true,
      },
      {
        id: 'ac-output',
        sectionNameFa: 'کابل AC خروجی اینورتر به ترانسفورماتور یا تابلوی اصلی',
        sectionNameEn: 'Inverter AC Output to Transformer / Main Board',
        oneWayLengthM: acOutputLengthM,
        designCurrentAmps: isThreePhase
          ? (systemCapacityKw * 1000.0) / (Math.sqrt(3) * (isUtilityPowerplant ? 800 : 400) * 0.95)
          : (systemCapacityKw * 1000.0) / (230.0 * 0.95),
        nominalVoltageVolts: isThreePhase ? (isUtilityPowerplant ? 800 : 400) : 230,
        conductorMaterial: acMaterial,
        insulationType: acInsulation,
        allowableDropPct: 1.0,
        isDc: false,
        isThreePhase,
      },
    ];

    if (!isUtilityPowerplant) {
      runs.push({
        id: 'dc-battery',
        sectionNameFa: 'کابل قدرت باتری به اینورتر (Heavy DC Battery Run)',
        sectionNameEn: 'Battery Bank to Inverter DC Bus',
        oneWayLengthM: batteryCableLengthM,
        designCurrentAmps: inverterDcContinuousCurrentAmps * 1.25,
        nominalVoltageVolts: systemDcVoltage,
        conductorMaterial: batteryMaterial,
        insulationType: 'xlpe',
        allowableDropPct: 0.8,
        isDc: true,
      });
    }

    return runs.map(calculateAdvancedCableRun);
  }, [
    dcStringLengthM,
    dcStringMaterial,
    dcStringInsulation,
    dcMainBusbarLengthM,
    dcMainMaterial,
    dcMainInsulation,
    acOutputLengthM,
    acMaterial,
    acInsulation,
    batteryCableLengthM,
    batteryMaterial,
    stringIscAmps,
    stringVocMaxVolts,
    parallelStringsCount,
    systemCapacityKw,
    isThreePhase,
    isUtilityPowerplant,
    inverterDcContinuousCurrentAmps,
    systemDcVoltage,
  ]);

  // 2. Earthing Analysis
  const earthingResult = useMemo(() => {
    return calculateEarthingSystem(
      systemCapacityKw,
      soilResistivity,
      upstreamGrounding,
      isUtilityPowerplant
    );
  }, [systemCapacityKw, soilResistivity, upstreamGrounding, isUtilityPowerplant]);

  // 3. Lightning Protection Analysis
  const lightningResult = useMemo(() => {
    return calculateLightningProtection(systemCapacityKw, isUtilityPowerplant);
  }, [systemCapacityKw, isUtilityPowerplant]);

  // 4. Protection BOM
  const protectionBom: ProtectionBomItem[] = useMemo(() => {
    const bom: ProtectionBomItem[] = [
      {
        id: 'bom-1',
        category: 'fuse',
        deviceFa: 'فیوز فتوولتائیک gPV سیلندری ۱۰×۳۸ به همراه پایه فیوز ریلی',
        deviceEn: 'gPV DC String Fuse with DIN Rail Fuse Holder',
        specificationFa: `${Math.max(15, Math.ceil((stringIscAmps * 1.5) / 5) * 5)}A / 1000-1500V DC (IEC 60269-6)`,
        rating: `${Math.max(15, Math.ceil((stringIscAmps * 1.5) / 5) * 5)}A 1500VDC`,
        quantity: parallelStringsCount * 2,
        locationFa: 'تابلوهای کمباینر DC آرایه‌ها',
      },
      {
        id: 'bom-2',
        category: 'spd',
        deviceFa: 'سرج ارستر صاعقه‌گیر ترکیبی Type 1+2 DC خورشیدی',
        deviceEn: 'Type 1+2 DC Surge Protective Device (SPD)',
        specificationFa: 'Ucpv: 1500V DC, Iimp: 12.5kA, In: 20kA, Imax: 40kA (IEC 61643-32)',
        rating: '1500VDC / 40kA',
        quantity: Math.max(1, Math.ceil(parallelStringsCount / 10)),
        locationFa: 'ورودی تابلوی تجمیع و اینورتر',
      },
      {
        id: 'bom-3',
        category: 'spd',
        deviceFa: 'سرج ارستر AC کلاس Type 1+2 تابلویی',
        deviceEn: 'Type 1+2 AC Surge Protective Device',
        specificationFa: `Uc: ${isUtilityPowerplant ? '800V' : '440V'} AC, Iimp: 12.5kA, In: 20kA`,
        rating: `${isUtilityPowerplant ? '800V' : '400V'} AC 40kA`,
        quantity: isUtilityPowerplant ? 4 : 1,
        locationFa: 'تابلوی توزیع AC و خروجی اینورترها',
      },
      {
        id: 'bom-4',
        category: 'earthing',
        deviceFa: 'الکترود میله‌ای ارت تمام مس یا فولاد با روکش مس ضخیم ۳ متری',
        deviceEn: 'Copper-Bonded Earth Rod (3m x 16mm)',
        specificationFa: 'طول ۳ متر، قطر ۱۶ میلی‌متر، استاندارد UL 467 / IEEE 80',
        rating: '3m x 16mm',
        quantity: earthingResult.groundRodsCount,
        locationFa: 'رینگ پیرامونی چاه‌های ارت و دکل‌های صاعقه‌گیر',
      },
      {
        id: 'bom-5',
        category: 'earthing',
        deviceFa: 'تسمه / سیم لخت مسی رینگ دفنی ارت محوطه',
        deviceEn: 'Bare Copper Grounding Tape / Conductor',
        specificationFa: `${earthingResult.buriedConductorCrossSectionMm2} mm² مس نرم آنیل‌شده خالص`,
        rating: `${earthingResult.buriedConductorCrossSectionMm2} mm²`,
        quantity: earthingResult.buriedBareConductorLengthM,
        locationFa: 'کانال دفنی پیرامونی به عمق ۸۰ سانتی‌متر',
      },
    ];

    if (isUtilityPowerplant) {
      bom.push({
        id: 'bom-6',
        category: 'spd',
        deviceFa: 'برقگیر اکسید روی رده ایستگاهی فشار متوسط (MV Surge Arrester)',
        deviceEn: 'Station Class MV Metal-Oxide Surge Arrester',
        specificationFa: '24kV / 10kA Class 1 (IEC 60099-4) به همراه شمارنده صاعقه',
        rating: '24kV 10kA',
        quantity: 3,
        locationFa: 'سرخط ورودی پست فشار متوسط ۲۰ کیلوولت',
      });
    }

    return bom;
  }, [parallelStringsCount, stringIscAmps, earthingResult, isUtilityPowerplant]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          {lang === 'fa'
            ? 'سایزینگ پیشرفته کابل‌ها، کابل‌های موازی، سیستم ارتینگ و حفاظت صاعقه'
            : 'Advanced Cable Sizing, Parallel Runs, Earthing (IEEE 80) & Lightning Protection'}
        </h1>
        <p className="text-slate-400 text-xs leading-relaxed">
          {lang === 'fa'
            ? 'محاسبه سطح مقطع کابل با طول دلخواه، انتخاب جنس مس/آلومینیوم و عایق XLPE/PVC، کابل‌های چندگانه موازی، محاسبات ارتینگ جامع طبق IEEE 80، انطباق با شبکه بالادست، و راهنمای گام‌به‌گام رفع خطاها.'
            : 'User-specified run lengths, Copper/Aluminum and XLPE/PVC options, automatic multi-conductor parallel runs, IEEE 80 grounding design, and actionable troubleshooting guidance.'}
        </p>

        {/* Sub-tabs selector */}
        <div className="flex items-center gap-2 mt-4 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveSubTab('cables')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'cables'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            {lang === 'fa' ? 'سایزینگ کابل و رشته‌های موازی' : 'Cable Sizing & Parallel Runs'}
          </button>
          <button
            onClick={() => setActiveSubTab('earthing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'earthing'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Anchor className="w-3.5 h-3.5" />
            {lang === 'fa' ? 'سیستم ارتینگ و هم‌بندی (IEEE 80)' : 'Earthing System (IEEE 80)'}
          </button>
          <button
            onClick={() => setActiveSubTab('lightning')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'lightning'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            {lang === 'fa' ? 'حفاظت در برابر صاعقه (LPS / IEC 62305)' : 'Lightning Protection (IEC 62305)'}
          </button>
          <button
            onClick={() => setActiveSubTab('bom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'bom'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {lang === 'fa' ? 'لیست تجهیزات حفاظتی (BOM)' : 'Protection Bill of Quantities'}
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: CABLE SIZING */}
      {activeSubTab === 'cables' && (
        <div className="space-y-6">
          {/* User Parameters Configuration Card */}
          <div className="studio-card">
            <h3 className="text-sm font-bold text-sky-400 mb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              {lang === 'fa' ? 'تنظیم طول فواصل، جنس هادی و نوع عایق کابل‌ها' : 'Cable Distance, Material & Insulation Settings'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* DC String */}
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
                <span className="font-bold text-amber-300 block">
                  {lang === 'fa' ? 'کابل DC استرینگ خورشیدی' : 'DC Solar String Cable'}
                </span>
                <div>
                  <label className="text-slate-400 block mb-1">
                    {lang === 'fa' ? 'طول مسیر رفت (متر):' : 'One-way Length (m):'}
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="500"
                    value={dcStringLengthM}
                    onChange={(e) => setDcStringLengthM(Math.max(1, Number(e.target.value)))}
                    className="studio-input w-full text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">{lang === 'fa' ? 'جنس هادی:' : 'Conductor:'}</label>
                    <select
                      value={dcStringMaterial}
                      onChange={(e) => setDcStringMaterial(e.target.value as ConductorMaterial)}
                      className="studio-input w-full text-xs"
                    >
                      <option value="copper">{lang === 'fa' ? 'مس (Cu)' : 'Copper'}</option>
                      <option value="aluminum">{lang === 'fa' ? 'آلومینیوم (Al)' : 'Aluminum'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">{lang === 'fa' ? 'عایق:' : 'Insulation:'}</label>
                    <select
                      value={dcStringInsulation}
                      onChange={(e) => setDcStringInsulation(e.target.value as InsulationType)}
                      className="studio-input w-full text-xs"
                    >
                      <option value="xlpe">XLPE (90°C)</option>
                      <option value="pvc">PVC (70°C)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* DC Main Feeder */}
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
                <span className="font-bold text-sky-300 block">
                  {lang === 'fa' ? 'کابل باسبار اصلی DC آرایه' : 'Main DC Array Feeder'}
                </span>
                <div>
                  <label className="text-slate-400 block mb-1">
                    {lang === 'fa' ? 'طول مسیر رفت (متر):' : 'One-way Length (m):'}
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="1000"
                    value={dcMainBusbarLengthM}
                    onChange={(e) => setDcMainBusbarLengthM(Math.max(1, Number(e.target.value)))}
                    className="studio-input w-full text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">{lang === 'fa' ? 'جنس هادی:' : 'Conductor:'}</label>
                    <select
                      value={dcMainMaterial}
                      onChange={(e) => setDcMainMaterial(e.target.value as ConductorMaterial)}
                      className="studio-input w-full text-xs"
                    >
                      <option value="aluminum">{lang === 'fa' ? 'آلومینیوم (Al)' : 'Aluminum'}</option>
                      <option value="copper">{lang === 'fa' ? 'مس (Cu)' : 'Copper'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">{lang === 'fa' ? 'عایق:' : 'Insulation:'}</label>
                    <select
                      value={dcMainInsulation}
                      onChange={(e) => setDcMainInsulation(e.target.value as InsulationType)}
                      className="studio-input w-full text-xs"
                    >
                      <option value="xlpe">XLPE (90°C)</option>
                      <option value="pvc">PVC (70°C)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* AC Output */}
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
                <span className="font-bold text-emerald-300 block">
                  {lang === 'fa' ? 'کابل AC خروجی اینورتر' : 'Inverter AC Output Cable'}
                </span>
                <div>
                  <label className="text-slate-400 block mb-1">
                    {lang === 'fa' ? 'طول مسیر رفت (متر):' : 'One-way Length (m):'}
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="2000"
                    value={acOutputLengthM}
                    onChange={(e) => setAcOutputLengthM(Math.max(1, Number(e.target.value)))}
                    className="studio-input w-full text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">{lang === 'fa' ? 'جنس هادی:' : 'Conductor:'}</label>
                    <select
                      value={acMaterial}
                      onChange={(e) => setAcMaterial(e.target.value as ConductorMaterial)}
                      className="studio-input w-full text-xs"
                    >
                      <option value="aluminum">{lang === 'fa' ? 'آلومینیوم (Al)' : 'Aluminum'}</option>
                      <option value="copper">{lang === 'fa' ? 'مس (Cu)' : 'Copper'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">{lang === 'fa' ? 'عایق:' : 'Insulation:'}</label>
                    <select
                      value={acInsulation}
                      onChange={(e) => setAcInsulation(e.target.value as InsulationType)}
                      className="studio-input w-full text-xs"
                    >
                      <option value="xlpe">XLPE (90°C)</option>
                      <option value="pvc">PVC (70°C)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sizing & Parallel Runs Results Table */}
          <div className="studio-card">
            <h3 className="font-bold text-sky-400 text-sm mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              {lang === 'fa' ? 'نتایج سایزینگ کابل، کابل‌های موازی و افت ولتاژ' : 'Cable Sizing & Parallel Run Verification'}
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="p-2.5">{lang === 'fa' ? 'بخش مدار' : 'Circuit Section'}</th>
                    <th className="p-2.5">{lang === 'fa' ? 'طول' : 'Length'}</th>
                    <th className="p-2.5">{lang === 'fa' ? 'جریان طراحی' : 'Design Current'}</th>
                    <th className="p-2.5">{lang === 'fa' ? 'ولتاژ' : 'Voltage'}</th>
                    <th className="p-2.5">{lang === 'fa' ? 'مقطع تئوری' : 'Theoretical'}</th>
                    <th className="p-2.5">{lang === 'fa' ? 'کابل و رشته‌های موازی' : 'Selected Parallel Spec'}</th>
                    <th className="p-2.5">{lang === 'fa' ? 'افت ولتاژ' : 'Voltage Drop'}</th>
                    <th className="p-2.5 text-center">{lang === 'fa' ? 'وضعیت' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {cableRuns.map((run, idx) => (
                    <tr key={idx} className="hover:bg-slate-850/60">
                      <td className="p-2.5 font-semibold text-white">
                        {lang === 'fa' ? run.config.sectionNameFa : run.config.sectionNameEn}
                      </td>
                      <td className="p-2.5 font-mono">{run.config.oneWayLengthM} m</td>
                      <td className="p-2.5 font-mono text-emerald-400 font-bold">
                        {run.config.designCurrentAmps.toFixed(1)} A
                      </td>
                      <td className="p-2.5 font-mono text-sky-400">{run.config.nominalVoltageVolts.toFixed(0)} V</td>
                      <td className="p-2.5 font-mono text-slate-300">
                        {run.calculatedTheoreticalCrossSectionMm2} mm²
                      </td>
                      <td className="p-2.5 font-mono font-bold text-amber-300 text-sm">
                        {lang === 'fa' ? run.cableDesignationFa : run.cableDesignationEn}
                        {run.parallelRunsCount > 1 && (
                          <span className="block text-[10px] text-sky-400 font-sans">
                            {lang === 'fa'
                              ? `(${run.parallelRunsCount} رشته موازی × ${run.perRunCrossSectionMm2} mm²)`
                              : `(${run.parallelRunsCount} parallel runs per phase)`}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-mono font-bold">
                        <span className={run.isCompliant ? 'text-emerald-400' : 'text-red-400'}>
                          {run.actualVoltageDropPct}% ({run.actualVoltageDropVolts}V)
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            run.isCompliant
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-red-950 text-red-400 border border-red-800'
                          }`}
                        >
                          {run.isCompliant ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> {lang === 'fa' ? `مجاز (≤${run.config.allowableDropPct}%)` : 'Compliant'}
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3" /> {lang === 'fa' ? 'بیش از حد مجاز' : 'Exceeds limit'}
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Troubleshooting Resolution Cards if any run is non-compliant */}
            {cableRuns.some((r) => !r.isCompliant) && (
              <div className="mt-4 space-y-2">
                {cableRuns
                  .filter((r) => !r.isCompliant)
                  .map((r, i) => (
                    <div key={i} className="p-3 bg-red-950/40 border border-red-800/80 rounded-lg text-xs text-red-200 flex items-start gap-2.5 shadow-md">
                      <Wrench className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block font-bold mb-1">
                          {lang === 'fa' ? r.config.sectionNameFa : r.config.sectionNameEn}:
                        </strong>
                        <p className="leading-relaxed">
                          {lang === 'fa' ? r.troubleshootingGuideFa : r.troubleshootingGuideEn}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: EARTHING (IEEE 80) */}
      {activeSubTab === 'earthing' && (
        <div className="space-y-6">
          <div className="studio-card">
            <h3 className="text-sm font-bold text-sky-400 mb-3 flex items-center gap-2">
              <Anchor className="w-4 h-4 text-emerald-400" />
              {lang === 'fa'
                ? 'محاسبات سیستم ارتینگ، هم‌بندی و پتانسیل گام و لمس (IEEE 80 / IEC 60364-5-54)'
                : 'Earthing System Design & Touch/Step Potential (IEEE 80)'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2 text-xs">
                <label className="text-slate-300 font-semibold block">
                  {lang === 'fa' ? 'مقاومت ویژه خاک محوطه (Ω·m / Soil Resistivity):' : 'Soil Resistivity (Ω·m):'}
                </label>
                <input
                  type="number"
                  min="20"
                  max="2000"
                  value={soilResistivity}
                  onChange={(e) => setSoilResistivity(Math.max(10, Number(e.target.value)))}
                  className="studio-input w-full"
                />
                <span className="text-[10px] text-slate-400 block">
                  {lang === 'fa' ? 'خاک رس مرطوب = ۳۰ الی ۵۰، دشت‌های مرکزی ایران = ۱۰۰ الی ۱۵۰، اراضی کویری خشک = ۲۰۰+' : 'Moist clay ~30-50, Central Iran plateau ~100-150, Dry desert ~200+'}
                </span>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2 text-xs">
                <label className="text-slate-300 font-semibold block">
                  {lang === 'fa' ? 'سیستم زمین و اتصال به شبکه بالادست:' : 'Upstream Grid Earthing Scheme:'}
                </label>
                <select
                  value={upstreamGrounding}
                  onChange={(e) => setUpstreamGrounding(e.target.value as UpstreamGroundingSystem)}
                  className="studio-input w-full"
                >
                  <option value="solidly_grounded">
                    {lang === 'fa' ? 'زمین مستقیم (Solidly Grounded / TN-S)' : 'Solidly Grounded (TN-S)'}
                  </option>
                  <option value="impedance_grounded">
                    {lang === 'fa' ? 'زمین با مقاومت NGR (Impedance Grounded)' : 'Impedance Grounded (NGR)'}
                  </option>
                  <option value="isolated_it">
                    {lang === 'fa' ? 'ایزوله بدون اتصال زمین (Isolated IT System)' : 'Isolated IT System'}
                  </option>
                </select>
                <span className="text-[10px] text-slate-400 block">
                  {lang === 'fa' ? 'تعیین‌کننده جریان خطای اتصال زمین و ولتاژ لمس مجاز طبق استانداردهای توانیر' : 'Defines fault clearance time & allowable step/touch potentials'}
                </span>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
                <span className="text-slate-400 block text-[11px] mb-1">{lang === 'fa' ? 'مقاومت هدف زمین' : 'Target Rg'}</span>
                <span className="text-lg font-bold font-mono text-sky-400">{earthingResult.targetGroundResistanceOhms} Ω</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
                <span className="text-slate-400 block text-[11px] mb-1">{lang === 'fa' ? 'مقاومت محاسبه‌شده' : 'Calculated Rg'}</span>
                <span className={`text-lg font-bold font-mono ${earthingResult.isResistanceCompliant ? 'text-emerald-400' : 'text-red-400'}`}>
                  {earthingResult.calculatedGroundResistanceOhms} Ω
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
                <span className="text-slate-400 block text-[11px] mb-1">{lang === 'fa' ? 'تعداد رادهای ارت' : 'Ground Rods'}</span>
                <span className="text-lg font-bold font-mono text-amber-400">{earthingResult.groundRodsCount} عدد (۳m)</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
                <span className="text-slate-400 block text-[11px] mb-1">{lang === 'fa' ? 'هادی دفنی لخت' : 'Buried Conductor'}</span>
                <span className="text-lg font-bold font-mono text-purple-400">{earthingResult.buriedBareConductorLengthM} متر ({earthingResult.buriedConductorCrossSectionMm2}mm²)</span>
              </div>
            </div>

            {/* Execution Steps */}
            <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <h4 className="text-xs font-bold text-amber-300 mb-2 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" />
                {lang === 'fa' ? 'دستورالعمل اجرایی و الزامات نصب ارتینگ در کارگاه:' : 'Practical Field Earthing Execution Steps:'}
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                {(lang === 'fa' ? earthingResult.earthingExecutionStepsFa : earthingResult.earthingExecutionStepsEn).map(
                  (step, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: LIGHTNING PROTECTION (IEC 62305) */}
      {activeSubTab === 'lightning' && (
        <div className="space-y-6">
          <div className="studio-card">
            <h3 className="text-sm font-bold text-sky-400 mb-3 flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-400" />
              {lang === 'fa'
                ? 'حفاظت در برابر برخورد مستقیم و اضافه ولتاژ صاعقه (IEC 62305 / IEC 62548)'
                : 'Direct Strike & Surge Lightning Protection (IEC 62305)'}
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
                <span className="text-slate-400 block text-[11px] mb-1">{lang === 'fa' ? 'کلاس حفاظت LPS' : 'LPS Class'}</span>
                <span className="text-lg font-bold font-mono text-amber-400">{lightningResult.lpsClass}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
                <span className="text-slate-400 block text-[11px] mb-1">{lang === 'fa' ? 'شعاع گوی غلتان' : 'Rolling Sphere Radius'}</span>
                <span className="text-lg font-bold font-mono text-sky-400">{lightningResult.rollingSphereRadiusM} متر</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
                <span className="text-slate-400 block text-[11px] mb-1">{lang === 'fa' ? 'دکل‌های صاعقه‌گیر' : 'Air Terminal Masts'}</span>
                <span className="text-lg font-bold font-mono text-emerald-400">{lightningResult.airTerminalsCount} عدد ({lightningResult.airTerminalHeightM}m)</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
                <span className="text-slate-400 block text-[11px] mb-1">{lang === 'fa' ? 'هادی‌های نزولی' : 'Down Conductors'}</span>
                <span className="text-lg font-bold font-mono text-purple-400">{lightningResult.downConductorsCount} مسیر (۵۰mm²)</span>
              </div>
            </div>

            {/* SPD Specifications */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-2 mb-4">
              <span className="font-bold text-amber-300 block">{lang === 'fa' ? 'مشخصات سرج ارسترهای مورد نیاز:' : 'Required SPD Specifications:'}</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <strong className="text-sky-400 block">DC SPD (Array Input):</strong>
                  <span className="text-slate-300">{lightningResult.dcSpdSpec}</span>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <strong className="text-emerald-400 block">AC SPD (Inverter Output):</strong>
                  <span className="text-slate-300">{lightningResult.acSpdSpec}</span>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <strong className="text-purple-400 block">MV Surge Arrester:</strong>
                  <span className="text-slate-300">{lightningResult.mvArresterSpec}</span>
                </div>
              </div>
            </div>

            {/* Guidelines */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <h4 className="text-xs font-bold text-amber-300 mb-2">
                {lang === 'fa' ? 'اصول طراحی و اجرای سیستم صاعقه‌گیر در مزارع خورشیدی:' : 'Solar Farm Lightning Protection Design Principles:'}
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {lightningResult.installationGuidelinesFa.map((g, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <ArrowRight className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: BOM TABLE */}
      {activeSubTab === 'bom' && (
        <div className="studio-card">
          <h3 className="font-bold text-sky-400 text-sm mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            {lang === 'fa' ? 'فهرست کامل ادوات حفاظتی و صاعقه (Protection Bill of Materials)' : 'Protection Bill of Materials'}
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="p-2.5">{lang === 'fa' ? 'نام و مدل تجهیز' : 'Equipment Name'}</th>
                  <th className="p-2.5">{lang === 'fa' ? 'مشخصات فنی و استاندارد' : 'Specification & Standard'}</th>
                  <th className="p-2.5">{lang === 'fa' ? 'رنج نامی' : 'Rating'}</th>
                  <th className="p-2.5">{lang === 'fa' ? 'تعداد' : 'Qty'}</th>
                  <th className="p-2.5">{lang === 'fa' ? 'محل نصب' : 'Location'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {protectionBom.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-850/60">
                    <td className="p-2.5 font-bold text-white">
                      {lang === 'fa' ? item.deviceFa : item.deviceEn}
                    </td>
                    <td className="p-2.5 text-slate-300">{item.specificationFa}</td>
                    <td className="p-2.5 font-mono font-bold text-amber-300">{item.rating}</td>
                    <td className="p-2.5 font-mono text-emerald-400 font-bold">{item.quantity}</td>
                    <td className="p-2.5 text-slate-400">{item.locationFa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
