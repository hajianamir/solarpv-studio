import React, { useState, useMemo } from 'react';
import {
  Shield,
  ShieldAlert,
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
  Thermometer,
  Flame,
  Check,
} from 'lucide-react';
import {
  type CableRunConfig,
  type CableRunResult,
  calculateAdvancedCableRun,
  calculateEarthingSystem,
  calculateLightningProtection,
  type ConductorMaterial,
  type InsulationType,
  type InstallationMethod,
  type UpstreamGroundingSystem,
  type ProtectionBomItem,
} from '../engine/protectionBomEngine';
import type { InstallationEnvironment } from '../engine/types/climateTypes';

interface ProtectionBomTabProps {
  systemCapacityKw?: number;
  isUtilityPowerplant?: boolean;
  stringVocMaxVolts?: number;
  stringIscAmps?: number;
  parallelStringsCount?: number;
  inverterDcContinuousCurrentAmps?: number;
  systemDcVoltage?: number;
  isThreePhase?: boolean;
  ambientTempC?: number;
  installationEnvironment?: InstallationEnvironment;
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
  ambientTempC = 42,
  installationEnvironment = 'ground_mount',
  lang = 'fa',
}) => {
  // Cable Run User Inputs
  const [ambientTemp, setAmbientTemp] = useState<number>(ambientTempC);
  const [installationMethod, setInstallationMethod] = useState<InstallationMethod>('cable_tray');
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
  const [applyBentonite, setApplyBentonite] = useState<boolean>(false);

  // Active view tab
  const [activeSubTab, setActiveSubTab] = useState<'cables' | 'earthing' | 'lightning' | 'bom'>('cables');

  // 1. Calculate Cable Runs with IEC 60364-5-52 Multi-Constraint Verification
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
        ambientTempC: ambientTemp,
        installationMethod,
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
        ambientTempC: ambientTemp,
        installationMethod,
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
        ambientTempC: ambientTemp,
        installationMethod,
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
        ambientTempC: Math.min(35, ambientTemp), // Battery rooms are temperature controlled
        installationMethod,
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
    ambientTemp,
    installationMethod,
  ]);

  // 2. Earthing Analysis (IEEE 80 Sverak + Touch/Step verification)
  const earthingResult = useMemo(() => {
    return calculateEarthingSystem(
      systemCapacityKw,
      soilResistivity,
      upstreamGrounding,
      isUtilityPowerplant,
      applyBentonite
    );
  }, [systemCapacityKw, soilResistivity, upstreamGrounding, isUtilityPowerplant, applyBentonite]);

  // 3. Lightning Protection Analysis (IEC 62305 Risk & Separation Distance)
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
        locationFa: 'تابلوی تجمیع استرینگ DC (قطب مثبت و منفی)',
      },
      {
        id: 'bom-2',
        category: 'spd',
        deviceFa: 'سرج ارستر صاعقه‌گیر ترکیبی Type 1+2 DC فتوولتائیک',
        deviceEn: 'Type 1+2 DC Surge Protection Device (SPD)',
        specificationFa: lightningResult.dcSpdSpec,
        rating: '1500V DC / Iimp: 12.5kA',
        quantity: isUtilityPowerplant ? Math.max(2, Math.ceil(parallelStringsCount / 12)) : 1,
        locationFa: 'ورودی DC اینورتر و تابلوهای کامباینرباکس',
      },
      {
        id: 'bom-3',
        category: 'isolator',
        deviceFa: 'کلید قطع زیر بار DC بریکر موتوری / ایزولاتور (DC Disconnector)',
        deviceEn: 'DC Load Break Switch / Disconnector',
        specificationFa: 'IEC 60947-3 (DC-PV2 Category 1500V)',
        rating: `${Math.ceil((stringIscAmps * parallelStringsCount * 1.25) / 50) * 50}A 1500VDC`,
        quantity: isUtilityPowerplant ? Math.max(1, Math.ceil(parallelStringsCount / 20)) : 1,
        locationFa: 'قبل از ورودی به شینه‌های اینورتر مرکزی',
      },
      {
        id: 'bom-4',
        category: 'breaker',
        deviceFa: 'کلید اتوماتیک کمپکت خروجی AC اینورتر (MCCB / ACB)',
        deviceEn: 'Molded Case Circuit Breaker (MCCB)',
        specificationFa: 'IEC 60947-2 با رله الکترونیکی LSI قابل تنظیم',
        rating: `${Math.ceil((cableRuns[2]?.config.designCurrentAmps || 200) / 50) * 50}A / 50kA`,
        quantity: isUtilityPowerplant ? Math.max(2, Math.ceil(systemCapacityKw / 300)) : 1,
        locationFa: 'خروجی AC اینورتر در تابلوی اصلی توزیع',
      },
      {
        id: 'bom-5',
        category: 'spd',
        deviceFa: 'سرج ارستر AC کلاس Type 1+2 تابلوی اصلی',
        deviceEn: 'Type 1+2 AC Surge Protection Device',
        specificationFa: lightningResult.acSpdSpec,
        rating: 'Iimp: 12.5kA / In: 20kA',
        quantity: 1,
        locationFa: 'تابلوی اصلی توزیع فشار ضعیف LV',
      },
      {
        id: 'bom-6',
        category: 'earthing',
        deviceFa: 'الکترود میله‌ای ارت مسی با مغزی فولادی و بست ارت',
        deviceEn: 'Copper-Bonded Steel Ground Rod (3m x 16mm)',
        specificationFa: 'پوشش مس ۲۵۴ میکرون استاندارد IEC 62561-2',
        rating: '3m / Ø16mm',
        quantity: earthingResult.groundRodsCount,
        locationFa: 'چاه ارت و رینگ پیرامونی محوطه نیروگاه',
      },
      {
        id: 'bom-7',
        category: 'earthing',
        deviceFa: 'تسمه / سیم لخت مسی دفنی رینگ هم‌بندی',
        deviceEn: 'Bare Stranded Copper Conductor for Ground Ring',
        specificationFa: `${earthingResult.buriedConductorCrossSectionMm2} mm² Soft Drawn Copper`,
        rating: `${earthingResult.buriedConductorCrossSectionMm2} mm²`,
        quantity: earthingResult.buriedBareConductorLengthM,
        locationFa: 'کانال پیرامونی محوطه سازه‌ها و پست برق',
      },
    ];

    if (isUtilityPowerplant) {
      bom.push({
        id: 'bom-8',
        category: 'spd',
        deviceFa: 'برق‌گیر فشار متوسط اکسید روی پلیمری ایستگاهی (MV Surge Arrester)',
        deviceEn: 'Medium-Voltage Metal-Oxide Surge Arrester (Station Class)',
        specificationFa: lightningResult.mvArresterSpec,
        rating: '24kV / 10kA Class 1',
        quantity: 3,
        locationFa: 'سرخط ورودی خط ۲۰ کیلوولت در پست برق',
      });
    }

    return bom;
  }, [
    stringIscAmps,
    parallelStringsCount,
    lightningResult,
    isUtilityPowerplant,
    systemCapacityKw,
    cableRuns,
    earthingResult,
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="studio-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-industrial-accent flex items-center gap-2">
              <Shield className="w-5 h-5 text-industrial-warning shrink-0" />
              {lang === 'fa'
                ? 'مهندسی کابل‌کشی، سیستم زمین (IEEE 80) و حفاظت صاعقه (IEC 62305)'
                : 'Cable Sizing, IEEE 80 Earthing & IEC 62305 Lightning Protection'}
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              {lang === 'fa'
                ? 'محاسبات جامع سه‌گانه کابل (جریان مجاز پیوسته، افت ولتاژ، تحمل اتصال کوتاه)، مش زمین IEEE 80 با کنترل ولتاژ گام و لمس، و حریم صاعقه'
                : 'Triple-constraint cable sizing (ampacity, drop, short-circuit), IEEE 80 earth grid with step/touch verification, and IEC 62305 lightning.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2.5 py-1 rounded bg-industrial-surface border border-industrial-border text-slate-300 font-mono">
              {isUtilityPowerplant ? 'Utility Powerplant (MV)' : 'Commercial / Industrial'}
            </span>
            <span className="text-[11px] px-2.5 py-1 rounded bg-sky-950/60 border border-sky-800 text-sky-300">
              {installationEnvironment === 'industrial_shed'
                ? (lang === 'fa' ? 'سقف سوله' : 'Shed Roof')
                : installationEnvironment === 'rooftop_flat_concrete'
                ? (lang === 'fa' ? 'پشت‌بام بتنی' : 'Concrete Rooftop')
                : (lang === 'fa' ? 'مزرعه زمینی' : 'Ground Mount')}
            </span>
          </div>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-industrial-border">
          <button
            onClick={() => setActiveSubTab('cables')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'cables'
                ? 'bg-industrial-primary text-white shadow-md'
                : 'bg-industrial-surface text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            {lang === 'fa' ? 'سایزینگ کابل و افت ولتاژ' : 'Cable Sizing & Drops'}
          </button>
          <button
            onClick={() => setActiveSubTab('earthing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'earthing'
                ? 'bg-industrial-primary text-white shadow-md'
                : 'bg-industrial-surface text-slate-400 hover:text-white'
            }`}
          >
            <Anchor className="w-3.5 h-3.5" />
            {lang === 'fa' ? 'سیستم زمین و پتانسیل گام/لمس (IEEE 80)' : 'Earthing (IEEE 80)'}
          </button>
          <button
            onClick={() => setActiveSubTab('lightning')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'lightning'
                ? 'bg-industrial-primary text-white shadow-md'
                : 'bg-industrial-surface text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            {lang === 'fa' ? 'حفاظت صاعقه و سرج (IEC 62305)' : 'Lightning (IEC 62305)'}
          </button>
          <button
            onClick={() => setActiveSubTab('bom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'bom'
                ? 'bg-industrial-primary text-white shadow-md'
                : 'bg-industrial-surface text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {lang === 'fa' ? 'فهرست ادوات حفاظتی (Protection BOM)' : 'Protection BOM'}
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: CABLES */}
      {activeSubTab === 'cables' && (
        <div className="space-y-6">
          {/* User Parameters Configuration Card */}
          <div className="studio-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-bold text-industrial-accent flex items-center gap-2">
                <Sliders className="w-4 h-4 text-industrial-warning" />
                {lang === 'fa' ? 'تنظیمات کابل‌کشی و دمای محیطی' : 'Cable Distance, Material & Environmental Settings'}
              </h3>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5 text-xs bg-industrial-surface px-2.5 py-1 rounded-lg border border-industrial-border">
                  <Sliders className="w-3.5 h-3.5 text-industrial-accent" />
                  <span className="text-slate-400">{lang === 'fa' ? 'روش نصب:' : 'Method:'}</span>
                  <select
                    value={installationMethod}
                    onChange={(e) => setInstallationMethod(e.target.value as InstallationMethod)}
                    className="studio-input text-xs py-0.5 px-1.5 bg-industrial-bg"
                  >
                    <option value="cable_tray">{lang === 'fa' ? 'سینی کابل (kg=0.82)' : 'Tray (0.82)'}</option>
                    <option value="in_conduit">{lang === 'fa' ? 'داخل داکت/لوله (kg=0.75)' : 'Conduit (0.75)'}</option>
                    <option value="direct_buried">{lang === 'fa' ? 'دفنی خاک (kg=0.70)' : 'Buried (0.70)'}</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs bg-industrial-surface px-3 py-1 rounded-lg border border-industrial-border">
                  <Thermometer className="w-3.5 h-3.5 text-industrial-warning" />
                  <span className="text-slate-400">{lang === 'fa' ? 'دمای طراحی:' : 'Design Temp:'}</span>
                  <input
                    type="number"
                    min="25"
                    max="55"
                    value={ambientTemp}
                    onChange={(e) => setAmbientTemp(Number(e.target.value) || 40)}
                    className="w-14 studio-input text-xs py-0.5 px-1 font-mono text-center"
                  />
                  <span className="text-slate-300 font-mono">°C</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* DC String */}
              <div className="p-3 bg-industrial-bg/60 border border-industrial-border rounded-lg space-y-2">
                <span className="font-bold text-industrial-warning block">
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
              <div className="p-3 bg-industrial-bg/60 border border-industrial-border rounded-lg space-y-2">
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
              <div className="p-3 bg-industrial-bg/60 border border-industrial-border rounded-lg space-y-2">
                <span className="font-bold text-industrial-success block">
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

          {/* Sizing & Multi-Constraint Verification Table */}
          <div className="studio-card">
            <h3 className="font-bold text-industrial-accent text-sm mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-industrial-warning" />
                {lang === 'fa'
                  ? 'سایزینگ چندمعیاره کابل‌ها (جریان مجاز پیوسته، افت ولتاژ، اتصال کوتاه و تلفات ژول)'
                  : 'Multi-Constraint Cable Sizing & Losses (IEC 60364-5-52 / IEC 60287)'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {lang === 'fa' ? `دمای محیط: ${ambientTemp}°C` : `Ambient: ${ambientTemp}°C`}
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-slate-300">
                <thead className="bg-industrial-surface/90 text-slate-400 border-b border-industrial-border">
                  <tr>
                    <th className="p-2.5">{lang === 'fa' ? 'بخش مدار' : 'Circuit Section'}</th>
                    <th className="p-2.5">{lang === 'fa' ? 'طول' : 'Length'}</th>
                    <th className="p-2.5">{lang === 'fa' ? 'جریان طراحی (Ib)' : 'Design Current'}</th>
                    <th className="p-2.5">{lang === 'fa' ? 'جریان مجاز (Iz)' : 'De-rated Ampacity'}</th>
                    <th className="p-2.5">{lang === 'fa' ? 'کابل و رشته‌های موازی' : 'Selected Parallel Spec'}</th>
                    <th className="p-2.5">{lang === 'fa' ? 'افت ولتاژ' : 'Voltage Drop'}</th>
                    <th className="p-2.5">{lang === 'fa' ? 'اتصال کوتاه (IEC 60364)' : 'SC Withstand'}</th>
                    <th className="p-2.5">{lang === 'fa' ? 'خازن و جریان شارژ' : 'Charging / Cap'}</th>
                    <th className="p-2.5">{lang === 'fa' ? 'تلفات ژول' : 'Joule Loss'}</th>
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
                      <td className="p-2.5 font-mono text-industrial-success font-bold">
                        {run.config.designCurrentAmps.toFixed(1)} A
                      </td>
                      <td className="p-2.5 font-mono">
                        <span className={run.isAmpacityCompliant ? 'text-teal-300' : 'text-industrial-error font-bold'}>
                          {run.totalThermalAmpacityAmps} A
                        </span>
                        <span className="block text-[9px] text-slate-400">
                          kt={run.temperatureDeratingFactorKt} kg={run.groupingDeratingFactorKg}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono font-bold text-industrial-warning text-xs">
                        {lang === 'fa' ? run.cableDesignationFa : run.cableDesignationEn}
                        {run.parallelRunsCount > 1 && (
                          <span className="block text-[10px] text-industrial-accent font-sans">
                            {lang === 'fa'
                              ? `(${run.parallelRunsCount} رشته موازی × ${run.perRunCrossSectionMm2} mm²)`
                              : `(${run.parallelRunsCount} parallel runs per phase)`}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-mono font-bold">
                        <span className={run.actualVoltageDropPct <= run.config.allowableDropPct ? 'text-industrial-success' : 'text-industrial-error'}>
                          {run.actualVoltageDropPct}% ({run.actualVoltageDropVolts}V)
                        </span>
                        <span className="block text-[9px] text-slate-400">
                          {lang === 'fa' ? `مجاز: ≤${run.config.allowableDropPct}٪` : `Max: ${run.config.allowableDropPct}%`}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-xs">
                        <span className={run.isShortCircuitCompliant ? 'text-teal-300 font-bold' : 'text-industrial-error font-bold'}>
                          {run.totalEffectiveCrossSectionMm2} mm²
                        </span>
                        <span className="block text-[9px] text-slate-400">
                          {lang === 'fa' ? `نیاز: ${run.shortCircuitWithstandMinMm2} mm²` : `Min: ${run.shortCircuitWithstandMinMm2} mm²`}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-xs">
                        {run.config.isDc ? (
                          <>
                            <span className="text-slate-400 font-bold">0.0 A (DC)</span>
                            <span className="block text-[9px] text-slate-500">{run.totalCapacitanceUf} µF (est)</span>
                          </>
                        ) : (
                          <>
                            <span className="text-sky-300 font-bold">{run.chargingCurrentAmps} A</span>
                            <span className="block text-[9px] text-slate-400">{run.totalCapacitanceUf} µF (est)</span>
                          </>
                        )}
                      </td>
                      <td className="p-2.5 font-mono">
                        <span className="text-industrial-warning">{run.powerLossWatts} W</span>
                        <span className="block text-[9px] text-slate-400">({run.powerLossPct}%)</span>
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            run.isCompliant
                              ? 'bg-industrial-success/20 text-industrial-success border border-industrial-success/40'
                              : 'bg-red-950 text-industrial-error border border-red-800'
                          }`}
                        >
                          {run.isCompliant ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> {lang === 'fa' ? 'تایید استاندارد' : 'Compliant'}
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3" /> {lang === 'fa' ? 'عدم تطابق' : 'Exceeds limit'}
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Troubleshooting Resolution Cards */}
            {cableRuns.some((r) => !r.isCompliant) && (
              <div className="mt-4 space-y-2">
                {cableRuns
                  .filter((r) => !r.isCompliant)
                  .map((r, i) => (
                    <div key={i} className="p-3 bg-red-950/40 border border-red-800/80 rounded-lg text-xs text-red-200 flex items-start gap-2.5">
                      <Wrench className="w-4 h-4 text-industrial-warning shrink-0 mt-0.5" />
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
            <h3 className="text-sm font-bold text-industrial-accent mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Anchor className="w-4 h-4 text-industrial-success" />
                {lang === 'fa'
                  ? 'محاسبات سیستم ارتینگ، هم‌بندی و پتانسیل گام و لمس (IEEE 80 / IEC 60364-5-54)'
                  : 'Earthing System Design & Touch/Step Potential (IEEE 80)'}
              </span>
              <label className="flex items-center gap-2 cursor-pointer bg-industrial-surface px-2.5 py-1 rounded border border-industrial-border text-xs">
                <input
                  type="checkbox"
                  checked={applyBentonite}
                  onChange={(e) => setApplyBentonite(e.target.checked)}
                  className="rounded text-industrial-primary"
                />
                <span className="text-slate-300">
                  {lang === 'fa' ? 'تزریق بنتونیت/مواد کاهنده مقاومت (GEM)' : 'Apply Bentonite / GEM'}
                </span>
              </label>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-industrial-bg/60 border border-industrial-border rounded-lg space-y-2 text-xs">
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

              <div className="p-3 bg-industrial-bg/60 border border-industrial-border rounded-lg space-y-2 text-xs">
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

            {/* Integrated Earthing Compliance Notice */}
            <div className={`p-3 rounded-lg border text-xs mb-4 flex items-center justify-between ${
              earthingResult.isEarthingSafe
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                : 'bg-red-950/40 border-red-800 text-red-200'
            }`}>
              <div className="flex items-center gap-2.5">
                {earthingResult.isEarthingSafe ? (
                  <CheckCircle2 className="w-5 h-5 text-industrial-success shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-industrial-error shrink-0" />
                )}
                <div>
                  <strong className="block font-bold">
                    {lang === 'fa'
                      ? earthingResult.isEarthingSafe
                        ? 'انطباق جامع سیستم ارتینگ (مقاومت الکتریکی، ولتاژ گام و ولتاژ لمس)'
                        : 'عدم انطباق جامع سیستم ارتینگ (خطر پتانسیل گام/لمس یا مقاومت بیش از حد)'
                      : earthingResult.isEarthingSafe
                      ? 'Comprehensive Earthing Compliance (Resistance, Step & Touch Potentials)'
                      : 'Earthing Non-Compliance (Hazardous Step/Touch Potential or Excessive Resistance)'}
                  </strong>
                  <span className="text-[11px] text-slate-300 block mt-0.5">
                    {lang === 'fa' ? earthingResult.disclaimerFa : earthingResult.disclaimerEn}
                  </span>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
              <div className="p-3 bg-industrial-bg rounded-lg border border-industrial-border text-center">
                <span className="text-slate-400 block text-[11px] mb-1">{lang === 'fa' ? 'مقاومت هدف زمین' : 'Target Rg'}</span>
                <span className="text-lg font-bold font-mono text-industrial-accent">{earthingResult.targetGroundResistanceOhms} Ω</span>
              </div>
              <div className="p-3 bg-industrial-bg rounded-lg border border-industrial-border text-center">
                <span className="text-slate-400 block text-[11px] mb-1">{lang === 'fa' ? 'مقاومت محاسبه‌شده' : 'Calculated Rg'}</span>
                <span className={`text-lg font-bold font-mono ${earthingResult.isResistanceCompliant ? 'text-industrial-success' : 'text-industrial-error'}`}>
                  {earthingResult.calculatedGroundResistanceOhms} Ω
                </span>
                {applyBentonite && (
                  <span className="block text-[9px] text-teal-300 mt-0.5">
                    {lang === 'fa' ? 'بهسازی با بنتونیت فعال' : 'Bentonite enhanced'}
                  </span>
                )}
              </div>
              <div className="p-3 bg-industrial-bg rounded-lg border border-industrial-border text-center">
                <span className="text-slate-400 block text-[11px] mb-1">{lang === 'fa' ? 'تعداد رادهای ارت' : 'Ground Rods'}</span>
                <span className="text-lg font-bold font-mono text-industrial-warning">{earthingResult.groundRodsCount} عدد (۳m)</span>
              </div>
              <div className="p-3 bg-industrial-bg rounded-lg border border-industrial-border text-center">
                <span className="text-slate-400 block text-[11px] mb-1">{lang === 'fa' ? 'هادی دفنی لخت' : 'Buried Conductor'}</span>
                <span className="text-lg font-bold font-mono text-purple-400">{earthingResult.buriedBareConductorLengthM} متر ({earthingResult.buriedConductorCrossSectionMm2}mm²)</span>
              </div>
            </div>

            {/* IEEE 80 Touch & Step Safety Verification Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-industrial-surface border border-industrial-border text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sky-300">
                    {lang === 'fa' ? 'کنترل ولتاژ لمس مش (Touch Voltage - Em):' : 'Mesh Touch Voltage (Em):'}
                  </span>
                  <span className={`font-mono px-2 py-0.5 rounded text-[10px] font-bold ${
                    earthingResult.isTouchVoltageSafe ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-red-950 text-red-300 border border-red-700'
                  }`}>
                    {earthingResult.isTouchVoltageSafe ? (lang === 'fa' ? '✓ ایمن' : '✓ Safe') : (lang === 'fa' ? '✗ ناایمن' : '✗ Danger')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300 font-mono">
                  <span>{lang === 'fa' ? 'ولتاژ تماس محاسبه‌شده:' : 'Actual Em:'} <strong>{earthingResult.actualMeshVoltageVolts} V</strong></span>
                  <span>{lang === 'fa' ? 'حد مجاز حاکم:' : 'Governing limit:'} <strong>{earthingResult.maxTouchVoltageVolts} V</strong></span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {lang === 'fa' ? 'وزن بدن ۵۰kg با لایه سنگ‌ریزه ۱۰cm در زمان خطای ۰.۲ ثانیه طبق IEEE 80 / IEC 60364-4-41' : 'IEEE 80 / IEC 60364-4-41 touch potential limit'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-industrial-surface border border-industrial-border text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-purple-300">
                    {lang === 'fa' ? 'کنترل ولتاژ گام محوطه (Step Voltage - Es):' : 'Step Voltage (Es):'}
                  </span>
                  <span className={`font-mono px-2 py-0.5 rounded text-[10px] font-bold ${
                    earthingResult.isStepVoltageSafe ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-red-950 text-red-300 border border-red-700'
                  }`}>
                    {earthingResult.isStepVoltageSafe ? (lang === 'fa' ? '✓ ایمن' : '✓ Safe') : (lang === 'fa' ? '✗ ناایمن' : '✗ Danger')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300 font-mono">
                  <span>{lang === 'fa' ? 'ولتاژ گام محاسبه‌شده:' : 'Actual Es:'} <strong>{earthingResult.actualStepVoltageVolts} V</strong></span>
                  <span>{lang === 'fa' ? 'حد مجاز حاکم:' : 'Governing limit:'} <strong>{earthingResult.maxStepVoltageVolts} V</strong></span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {lang === 'fa' ? 'تضمین عدم برق‌گرفتگی اپراتور در حین راه‌رفتن در محوطه نیروگاه هنگام وقوع فالت زمین' : 'Guarantees operator safety against step potential during ground faults'}
                </span>
              </div>
            </div>

            {/* Execution Steps */}
            <div className="mt-4 p-4 rounded-xl bg-industrial-bg/80 border border-industrial-border">
              <h4 className="text-xs font-bold text-industrial-warning mb-2 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" />
                {lang === 'fa' ? 'دستورالعمل اجرایی و الزامات نصب ارتینگ در کارگاه:' : 'Practical Field Earthing Execution Steps:'}
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                {(lang === 'fa' ? earthingResult.earthingExecutionStepsFa : earthingResult.earthingExecutionStepsEn).map(
                  (step, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-industrial-success shrink-0 mt-0.5" />
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
            <h3 className="text-sm font-bold text-industrial-accent mb-3 flex items-center gap-2">
              <Radio className="w-4 h-4 text-industrial-warning" />
              {lang === 'fa'
                ? 'حفاظت در برابر برخورد مستقیم و اضافه ولتاژ صاعقه (IEC 62305 / IEC 62548)'
                : 'Direct Strike & Surge Lightning Protection (IEC 62305)'}
            </h3>

            {/* Lightning Disclaimer Notice */}
            <div className="p-3 bg-sky-950/40 border border-sky-800/80 rounded-lg text-xs text-sky-200 mb-4 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold mb-0.5">
                  {lang === 'fa' ? 'طبیعت ارزیابی صاعقه (Preliminary Screening):' : 'Preliminary Risk Screening:'}
                </strong>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {lang === 'fa' ? lightningResult.notesFa[0] : lightningResult.notesEn[0]}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
              <div className="p-3 bg-industrial-bg rounded-lg border border-industrial-border text-center">
                <span className="text-slate-400 block text-[11px] mb-1">{lang === 'fa' ? 'کلاس حفاظت LPS' : 'LPS Class'}</span>
                <span className="text-lg font-bold font-mono text-industrial-warning">{lightningResult.lpsClass}</span>
              </div>
              <div className="p-3 bg-industrial-bg rounded-lg border border-industrial-border text-center">
                <span className="text-slate-400 block text-[11px] mb-1">{lang === 'fa' ? 'شعاع گوی غلتان' : 'Rolling Sphere Radius'}</span>
                <span className="text-lg font-bold font-mono text-industrial-accent">{lightningResult.rollingSphereRadiusM} متر</span>
              </div>
              <div className="p-3 bg-industrial-bg rounded-lg border border-industrial-border text-center">
                <span className="text-slate-400 block text-[11px] mb-1">{lang === 'fa' ? 'دکل‌های صاعقه‌گیر' : 'Air Terminal Masts'}</span>
                <span className="text-lg font-bold font-mono text-industrial-success">{lightningResult.airTerminalsCount} عدد ({lightningResult.airTerminalHeightM}m)</span>
              </div>
              <div className="p-3 bg-industrial-bg rounded-lg border border-industrial-border text-center">
                <span className="text-slate-400 block text-[11px] mb-1">{lang === 'fa' ? 'فاصله جداسازی ایمن (s)' : 'Separation Distance'}</span>
                <span className="text-lg font-bold font-mono text-purple-400">{lightningResult.separationDistanceCm} cm</span>
              </div>
            </div>

            {/* IEC 62305 Risk Assessment KPI */}
            <div className="p-3 bg-industrial-surface rounded-lg border border-industrial-border text-xs mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-slate-400 block text-[10px]">{lang === 'fa' ? 'مساحت مؤثر جمع‌آوری صاعقه (Ad):' : 'Collection Area (Ad):'}</span>
                <strong className="text-white font-mono">{lightningResult.collectionAreaM2.toLocaleString()} m²</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">{lang === 'fa' ? 'نرخ برخورد صاعقه موردانتظار (Nd):' : 'Expected Strike Rate (Nd):'}</span>
                <strong className="text-industrial-warning font-mono">{lightningResult.annualExpectedStrikesNd} {lang === 'fa' ? 'برخورد در سال' : 'strikes/yr'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">{lang === 'fa' ? 'راندمان حفاظتی الزامی:' : 'Required Efficiency:'}</span>
                <strong className="text-industrial-success font-mono">{lightningResult.requiredEfficiencyPct}%</strong>
              </div>
            </div>

            {/* SPD Specifications */}
            <div className="p-3 bg-industrial-bg border border-industrial-border rounded-lg text-xs space-y-2 mb-4">
              <span className="font-bold text-industrial-warning block">{lang === 'fa' ? 'مشخصات سرج ارسترهای مورد نیاز:' : 'Required SPD Specifications:'}</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                <div className="p-2 bg-industrial-surface rounded border border-industrial-border">
                  <strong className="text-industrial-accent block">DC SPD (Array Input):</strong>
                  <span className="text-slate-300">{lightningResult.dcSpdSpec}</span>
                </div>
                <div className="p-2 bg-industrial-surface rounded border border-industrial-border">
                  <strong className="text-industrial-success block">AC SPD (Inverter Output):</strong>
                  <span className="text-slate-300">{lightningResult.acSpdSpec}</span>
                </div>
                <div className="p-2 bg-industrial-surface rounded border border-industrial-border">
                  <strong className="text-purple-400 block">MV Surge Arrester:</strong>
                  <span className="text-slate-300">{lightningResult.mvArresterSpec}</span>
                </div>
              </div>
            </div>

            {/* Guidelines */}
            <div className="p-4 rounded-xl bg-industrial-bg/80 border border-industrial-border">
              <h4 className="text-xs font-bold text-industrial-warning mb-2">
                {lang === 'fa' ? 'اصول طراحی و اجرای سیستم صاعقه‌گیر در مزارع خورشیدی و سقف‌ها:' : 'Solar Farm & Rooftop Lightning Protection Design Principles:'}
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {lightningResult.installationGuidelinesFa.map((g, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <ArrowRight className="w-3.5 h-3.5 text-industrial-accent shrink-0 mt-0.5" />
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
          <h3 className="font-bold text-industrial-accent text-sm mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-industrial-success" />
            {lang === 'fa' ? 'فهرست کامل ادوات حفاظتی و صاعقه (Protection Bill of Materials)' : 'Protection Bill of Materials'}
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-industrial-surface/90 text-slate-400 border-b border-industrial-border">
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
                    <td className="p-2.5 font-mono font-bold text-industrial-warning">{item.rating}</td>
                    <td className="p-2.5 font-mono text-industrial-success font-bold">{item.quantity}</td>
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

export default ProtectionBomTab;
