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
  type CableFeederInputMap,
  type CableFeederInputs,
  type MotorStartingMethod,
  calculateAdvancedCableRun,
  createUnassessedCableRun,
  calculateEarthingSystem,
  calculateLightningProtection,
  type ConductorMaterial,
  type InsulationType,
  type InstallationMethod,
  type UpstreamGroundingSystem,
  type ProtectionBomItem,
  type DcSystemEarthingType,
} from '../engine/protectionBomEngine';
import type { InstallationEnvironment } from '../engine/types/climateTypes';
import type { AcConnectionRequirement } from '../engine/acRequirements';

interface ProtectionBomTabProps {
  systemCapacityKw?: number;
  isUtilityPowerplant?: boolean;
  stringVocMaxVolts?: number;
  stringIscAmps?: number;
  parallelStringsCount?: number;
  inverterDcContinuousCurrentAmps?: number;
  systemDcVoltage?: number;
  isThreePhase?: boolean;
  acOutputRequirement?: AcConnectionRequirement | null;
  inverterAcVoltageVac?: number;
  inverterNameplateAttested?: boolean;
  ambientTempC?: number;
  totalModulesCount?: number;
  dcSystemEarthing?: DcSystemEarthingType;
  onDcSystemEarthingChange?: (earthing: DcSystemEarthingType) => void;
  feederInputs?: CableFeederInputMap;
  onFeederInputsChange?: (inputs: CableFeederInputMap) => void;
  installationEnvironment?: InstallationEnvironment;
  lang?: 'fa' | 'en';
}

const CableFeederInputEditor: React.FC<{
  id: string; title: string; isDc: boolean; input: CableFeederInputs; lang: 'fa' | 'en';
  onChange: (field: keyof CableFeederInputs, value: CableFeederInputs[keyof CableFeederInputs] | undefined) => void;
}> = ({ id, title, isDc, input, lang, onChange }) => {
  const fa = lang === 'fa';
  const numericFields: Array<{ key: keyof CableFeederInputs; label: string; step?: number; min?: number; max?: number }> = [
    { key: 'oneWayLengthM', label: fa ? 'طول یک‌طرفه مسیر (m)' : 'One-way route length (m)', step: 0.1, min: 0.1 },
    { key: 'designCurrentAmps', label: fa ? 'جریان طراحی پیش از هم‌زمانی (A)' : 'Pre-coincidence design current (A)', step: 0.1, min: 0.1 },
    { key: 'nominalVoltageVolts', label: fa ? 'ولتاژ نامی فیدر (V)' : 'Feeder nominal voltage (V)', step: 1, min: 1 },
    { key: 'coincidenceFactor', label: fa ? 'ضریب هم‌زمانی (۰…۱)' : 'Coincidence factor (0…1)', step: 0.01, min: 0.01, max: 1 },
    { key: 'ambientTempC', label: fa ? 'دمای محیط (°C)' : 'Ambient temperature (°C)', step: 1, min: -40, max: 90 },
    { key: 'groupedCircuitsCount', label: fa ? 'تعداد مدارهای گروه‌شده' : 'Grouped circuit count', step: 1, min: 1, max: 50 },
    { key: 'allowableDropPct', label: fa ? 'افت مجاز (%)' : 'Allowable drop (%)', step: 0.1, min: 0.1, max: 15 },
    { key: 'protectiveDeviceRatingAmps', label: fa ? 'جریان نامی حفاظت (A)' : 'Protective device rating (A)', step: 1, min: 1 },
    { key: 'protectiveDeviceBreakingCapacityKa', label: fa ? 'قدرت قطع حفاظت (kA)' : 'Protective breaking capacity (kA)', step: 0.1, min: 0.1 },
    { key: 'expectedIscKa', label: fa ? 'جریان اتصال کوتاه موجود (kA)' : 'Prospective fault current (kA)', step: 0.1, min: 0.1 },
    { key: 'faultClearingTimeSec', label: fa ? 'زمان قطع خطا (s)' : 'Fault clearing time (s)', step: 0.01, min: 0.001 },
    ...(isDc ? [] : [{ key: 'powerFactor' as const, label: fa ? 'ضریب توان' : 'Power factor', step: 0.01, min: 0.01, max: 1 }]),
  ];
  return <div className="rounded-lg border border-industrial-border bg-industrial-bg/50 p-3 space-y-2" data-testid={`feeder-editor-${id}`}>
    <h4 className="text-xs font-bold text-sky-300">{title} <span className="text-slate-500">({isDc ? 'DC' : 'AC'})</span></h4>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
      {numericFields.map(({ key, label, step, min, max }) => (
        <label key={key} className="text-[10px] text-slate-400">{label}
          <input data-testid={`feeder-${id}-${String(key)}`} type="number" step={step} min={min} max={max} value={typeof input[key] === 'number' ? input[key] as number : ''}
            onChange={(e) => onChange(key, e.target.value === '' ? undefined : Number(e.target.value))}
            className="studio-input w-full mt-0.5 text-xs" />
        </label>
      ))}
      <label className="text-[10px] text-slate-400">{fa ? 'هادی' : 'Conductor'}
        <select value={input.conductorMaterial ?? ''} onChange={(e) => onChange('conductorMaterial', e.target.value ? e.target.value as ConductorMaterial : undefined)} className="studio-input w-full mt-0.5 text-xs">
          <option value="">{fa ? 'انتخاب شود' : 'Select'}</option><option value="copper">Cu</option><option value="aluminum">Al</option>
        </select>
      </label>
      <label className="text-[10px] text-slate-400">{fa ? 'عایق' : 'Insulation'}
        <select value={input.insulationType ?? ''} onChange={(e) => onChange('insulationType', e.target.value ? e.target.value as InsulationType : undefined)} className="studio-input w-full mt-0.5 text-xs">
          <option value="">{fa ? 'انتخاب شود' : 'Select'}</option><option value="xlpe">XLPE</option><option value="pvc">PVC</option>
        </select>
      </label>
      <label className="text-[10px] text-slate-400">{fa ? 'روش نصب' : 'Installation method'}
        <select value={input.installationMethod ?? ''} onChange={(e) => onChange('installationMethod', e.target.value ? e.target.value as InstallationMethod : undefined)} className="studio-input w-full mt-0.5 text-xs">
          <option value="">{fa ? 'انتخاب شود' : 'Select'}</option><option value="cable_tray">{fa ? 'سینی کابل' : 'Cable tray'}</option><option value="in_conduit">{fa ? 'لوله/داکت' : 'Conduit'}</option><option value="direct_buried">{fa ? 'دفنی' : 'Direct buried'}</option>
        </select>
      </label>
      {!isDc && <label className="text-[10px] text-slate-400">{fa ? 'فاز' : 'Phase'}
        <select value={input.isThreePhase === undefined ? '' : String(input.isThreePhase)} onChange={(e) => onChange('isThreePhase', e.target.value === '' ? undefined : e.target.value === 'true')} className="studio-input w-full mt-0.5 text-xs">
          <option value="">{fa ? 'انتخاب شود' : 'Select'}</option><option value="false">{fa ? 'تک‌فاز' : 'Single-phase'}</option><option value="true">{fa ? 'سه‌فاز' : 'Three-phase'}</option>
        </select>
      </label>}
      <label className="text-[10px] text-slate-400">{fa ? 'روش راه‌اندازی موتور' : 'Motor starting method'}
        <select value={input.motorStartingMethod ?? ''} onChange={(e) => onChange('motorStartingMethod', e.target.value ? e.target.value as MotorStartingMethod : undefined)} className="studio-input w-full mt-0.5 text-xs">
          <option value="">{fa ? 'انتخاب/تأیید شود' : 'Select/confirm'}</option><option value="not_applicable">{fa ? 'قابل‌اعمال نیست' : 'Not applicable'}</option><option value="direct_on_line">DOL</option><option value="star_delta">Star-delta</option><option value="soft_starter">Soft starter</option><option value="vfd">VFD</option>
        </select>
      </label>
      {input.motorStartingMethod && input.motorStartingMethod !== 'not_applicable' && <label className="text-[10px] text-slate-400">{fa ? 'ضریب جریان راه‌اندازی' : 'Starting current multiplier'}
        <input type="number" min="1" max="12" step="0.1" value={input.motorStartingMultiplier ?? ''} onChange={(e) => onChange('motorStartingMultiplier', e.target.value === '' ? undefined : Number(e.target.value))} className="studio-input w-full mt-0.5 text-xs" />
      </label>}
      <label className="text-[10px] text-slate-400 col-span-2">{fa ? 'مرجع/مدل حفاظت (برچسب تجهیزات؛ تأیید مستقل نشده)' : 'Protective device reference/model (user-entered, not independently verified)'}
        <input type="text" value={input.protectiveDeviceReference ?? ''} onChange={(e) => onChange('protectiveDeviceReference', e.target.value || undefined)} className="studio-input w-full mt-0.5 text-xs" />
      </label>
    </div>
    <p className="text-[10px] text-amber-300/80">{fa ? 'نتیجه تا تکمیل همه ورودی‌ها مقدماتی/بررسی‌نشده است؛ هماهنگی منحنی قطع، روش نصب واقعی و کد محلی باید توسط مهندس مسئول کنترل شود.' : 'Until every field is supplied, the feeder remains unassessed. Verify trip curves, actual installation and local code with the responsible engineer.'}</p>
  </div>;
};

export const ProtectionBomTab: React.FC<ProtectionBomTabProps> = ({
  systemCapacityKw = 1000,
  isUtilityPowerplant = true,
  stringVocMaxVolts = 1100,
  stringIscAmps = 14.5,
  parallelStringsCount = 20,
  inverterDcContinuousCurrentAmps = 250,
  systemDcVoltage = 48,
  isThreePhase = true,
  acOutputRequirement = null,
  inverterAcVoltageVac,
  inverterNameplateAttested = false,
  ambientTempC = 42,
  totalModulesCount = 100,
  dcSystemEarthing = 'floating',
  onDcSystemEarthingChange,
  feederInputs: persistedFeederInputs,
  onFeederInputsChange,
  installationEnvironment = 'ground_mount',
  lang = 'fa',
}) => {
  // Feeder inputs are explicit, persist through the project snapshot, and are never inferred.
  const [localFeederInputs, setLocalFeederInputs] = useState<CableFeederInputMap>({});
  const feederInputs = persistedFeederInputs ?? localFeederInputs;
  const updateFeederInput = (id: string, field: keyof CableFeederInputs, value: CableFeederInputs[keyof CableFeederInputs] | undefined) => {
    const next = { ...feederInputs, [id]: { ...(feederInputs[id] ?? {}), [field]: value } };
    setLocalFeederInputs(next);
    onFeederInputsChange?.(next);
  };

  // Earthing & DC Grounding Inputs
  const [soilResistivity, setSoilResistivity] = useState<number | null>(null);
  const [upstreamGrounding, setUpstreamGrounding] = useState<UpstreamGroundingSystem>('solidly_grounded');
  // The current engine uses generic 2.5/6 kA faults and a fixed 0.2 s clearing time.
  // No project-specific fault study is captured, so never surface its safety verdict.
  const earthingInputsAssessed = false;
  const [applyBentonite, setApplyBentonite] = useState<boolean>(false);
  const [internalDcEarthing, setInternalDcEarthing] = useState<DcSystemEarthingType>(dcSystemEarthing);
  const currentDcEarthing = dcSystemEarthing ?? internalDcEarthing;

  const handleDcEarthingChange = (mode: DcSystemEarthingType) => {
    setInternalDcEarthing(mode);
    onDcSystemEarthingChange?.(mode);
  };

  // Active view tab
  const [activeSubTab, setActiveSubTab] = useState<'cables' | 'earthing' | 'lightning' | 'bom'>('cables');

  // 1. Calculate Cable Runs with IEC 60364-5-52 Multi-Constraint Verification
  const cableRuns: CableRunResult[] = useMemo(() => {
    const runs: CableRunConfig[] = [
      {
        id: 'dc-string', sectionNameFa: 'کابل DC استرینگ خورشیدی تا تابلوی تجمیع/اینورتر',
        sectionNameEn: 'PV DC String to Inverter / Combiner Box', oneWayLengthM: 0,
        designCurrentAmps: 0, nominalVoltageVolts: 0, conductorMaterial: 'copper',
        insulationType: 'xlpe', allowableDropPct: 0, isDc: true,
      },
      {
        id: 'dc-main', sectionNameFa: 'کابل باسبار اصلی DC آرایه به اینورتر مرکزی/پست',
        sectionNameEn: 'Main DC Feeder Busbar to Inverter Skid', oneWayLengthM: 0,
        designCurrentAmps: 0, nominalVoltageVolts: 0, conductorMaterial: 'copper',
        insulationType: 'xlpe', allowableDropPct: 0, isDc: true,
      },
    ];
    if (!isUtilityPowerplant) runs.push({
      id: 'dc-battery', sectionNameFa: 'کابل قدرت باتری به اینورتر',
      sectionNameEn: 'Battery Bank to Inverter DC Bus', oneWayLengthM: 0,
      designCurrentAmps: 0, nominalVoltageVolts: 0, conductorMaterial: 'copper',
      insulationType: 'xlpe', allowableDropPct: 0, isDc: true,
    });

    const assessFeeder = (base: CableRunConfig): CableRunResult => {
      const input = feederInputs[base.id] ?? {};
      const required: Array<[keyof CableFeederInputs, string]> = [
        ['oneWayLengthM', 'measured one-way route length'], ['designCurrentAmps', 'design current'],
        ['nominalVoltageVolts', 'nominal voltage'], ['conductorMaterial', 'conductor material'],
        ['insulationType', 'insulation'], ['allowableDropPct', 'permitted voltage drop'],
        ['ambientTempC', 'ambient temperature'], ['installationMethod', 'installation method'],
        ['groupedCircuitsCount', 'grouping/circuit count'], ['coincidenceFactor', 'coincidence factor'],
        ['protectiveDeviceRatingAmps', 'protective-device current rating'],
        ['protectiveDeviceBreakingCapacityKa', 'protective-device breaking capacity'],
        ['protectiveDeviceReference', 'protective-device nameplate/model reference'],
        ['expectedIscKa', 'prospective fault current'], ['faultClearingTimeSec', 'fault-clearing time'],
      ];
      if (!base.isDc) required.push(['isThreePhase', 'feeder phase'], ['powerFactor', 'power factor']);
      const missing = required.filter(([key]) => {
        const value = input[key];
        if (value === undefined || value === null) return true;
        if (typeof value === 'number') {
          if (!Number.isFinite(value)) return true;
          if (key !== 'ambientTempC' && value <= 0) return true;
          if ((key === 'powerFactor' || key === 'coincidenceFactor') && value > 1) return true;
        }
        if (typeof value === 'string' && !value.trim()) return true;
        return false;
      }).map(([, label]) => label);
      if (input.isDc !== undefined && input.isDc !== base.isDc) missing.push('matching feeder AC/DC selection');
      if (input.motorStartingMethod === undefined) missing.push('motor starting method (or explicitly not applicable)');
      if (input.motorStartingMethod && input.motorStartingMethod !== 'not_applicable' && !input.motorStartingMultiplier) missing.push('motor starting current multiplier');
      const config: CableRunConfig = {
        ...base,
        oneWayLengthM: input.oneWayLengthM ?? 0,
        designCurrentAmps: (input.designCurrentAmps ?? 0) * (input.coincidenceFactor ?? 1),
        nominalVoltageVolts: input.nominalVoltageVolts ?? 0,
        conductorMaterial: input.conductorMaterial ?? 'copper',
        insulationType: input.insulationType ?? 'xlpe',
        allowableDropPct: input.allowableDropPct ?? 0,
        isDc: base.isDc,
        isThreePhase: input.isThreePhase ?? base.isThreePhase,
        powerFactor: input.powerFactor,
        ambientTempC: input.ambientTempC,
        installationMethod: input.installationMethod,
        groupedCircuitsCount: input.groupedCircuitsCount,
        protectiveDeviceRatingAmps: input.protectiveDeviceRatingAmps,
        protectiveDeviceBreakingCapacityKa: input.protectiveDeviceBreakingCapacityKa,
        protectiveDeviceReference: input.protectiveDeviceReference,
        expectedIscKa: input.expectedIscKa,
        faultClearingTimeSec: input.faultClearingTimeSec,
        coincidenceFactor: input.coincidenceFactor,
        motorStartingMethod: input.motorStartingMethod,
        motorStartingMultiplier: input.motorStartingMultiplier,
      };
      if (missing.length) {
        return createUnassessedCableRun(config, `Incomplete feeder inputs: ${missing.join(', ')}. No final/compliant cable result is issued.`);
      }
      const result = calculateAdvancedCableRun(config);
      if (!base.isDc && input.motorStartingMethod !== 'not_applicable' && result.motorStartingVoltageDropPct === null) {
        return {
          ...result,
          isCompliant: false,
          isAssessed: false,
          assessmentNote: 'Motor-start voltage drop is NOT ASSESSED: starting PF, source impedance, motor/drive dynamic data and the project acceptance limit are not modeled. The multiplier gives only a starting-current estimate.',
        };
      }
      return result;
    };
    const calculatedNonAcRuns = runs.map((run) => assessFeeder(run));
    const ac = acOutputRequirement;
    const acInput = feederInputs['ac-output'] ?? {};
    const acVoltage = acInput.isThreePhase ? ac?.lineToLineVolts : (ac?.lineToNeutralVolts ?? ac?.lineToLineVolts);
    const phaseMatches = ac?.phase === (acInput.isThreePhase ? 'three' : 'single');
    const acInputsConfirmed = Boolean(ac?.confirmed && phaseMatches && acVoltage && acVoltage > 0
      && ac.frequencyHz && ac.frequencyHz > 0
      && ac.powerFactor && ac.powerFactor > 0 && ac.powerFactor <= 1
      && ac.availableFaultCurrentKa && ac.availableFaultCurrentKa > 0
      && ac.faultClearingTimeSec && ac.faultClearingTimeSec > 0
      && inverterNameplateAttested
      && !(inverterAcVoltageVac !== undefined && ac.lineToLineVolts !== null
        && Math.abs(inverterAcVoltageVac - ac.lineToLineVolts) > Math.max(1, ac.lineToLineVolts * 0.01))
      && acInput.nominalVoltageVolts !== undefined && Math.abs(acInput.nominalVoltageVolts - acVoltage) <= Math.max(1, acVoltage * 0.01)
      && acInput.powerFactor === ac.powerFactor
      && acInput.expectedIscKa === ac.availableFaultCurrentKa
      && acInput.faultClearingTimeSec === ac.faultClearingTimeSec);
    const acBase: CableRunConfig = {
      id: 'ac-output', sectionNameFa: 'کابل AC خروجی اینورتر به ترانسفورماتور یا تابلوی اصلی',
      sectionNameEn: 'Inverter AC Output to Transformer / Main Board', oneWayLengthM: 0,
      designCurrentAmps: 0, nominalVoltageVolts: 0, conductorMaterial: 'copper', insulationType: 'xlpe',
      allowableDropPct: 0, isDc: false, isThreePhase,
    };
    const acRun = acInputsConfirmed
      ? assessFeeder(acBase)
      : createUnassessedCableRun(acBase,
          !ac?.confirmed ? 'AC connection requirements are not confirmed.'
            : !phaseMatches ? 'Feeder phase does not match the confirmed AC interface.'
              : !inverterNameplateAttested ? 'Exact inverter nameplate evidence is not attested.'
                : 'Confirm interface voltage, PF, fault data and match them to the saved per-feeder input before assessment.');
    return [calculatedNonAcRuns[0], calculatedNonAcRuns[1], acRun, ...calculatedNonAcRuns.slice(2)];
  }, [feederInputs, isThreePhase, acOutputRequirement, inverterAcVoltageVac, inverterNameplateAttested, isUtilityPowerplant]);

  // 2. Earthing Analysis (IEEE 80 Sverak + Touch/Step verification + DC Earthing Architecture)
  const earthingResult = useMemo(() => {
    return calculateEarthingSystem(
      systemCapacityKw,
      soilResistivity ?? 100,
      upstreamGrounding,
      isUtilityPowerplant,
      applyBentonite,
      currentDcEarthing
    );
  }, [systemCapacityKw, soilResistivity, upstreamGrounding, isUtilityPowerplant, applyBentonite, currentDcEarthing]);

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
        rating: cableRuns[2]?.isAssessed === false ? (lang === 'fa' ? 'نیازمند الزام تأییدشده AC؛ انتخاب کلید انجام نشده' : 'Requires confirmed AC requirement; breaker not selected') : `${Math.ceil((cableRuns[2]?.config.designCurrentAmps ?? 0) / 50) * 50}A / 50kA`,
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
        deviceFa: 'تسمه / سیم لخت مسی دفنی رینگ هم‌بندی پیرامونی',
        deviceEn: 'Bare Stranded Copper Conductor for Ground Ring',
        specificationFa: `${earthingResult.buriedConductorCrossSectionMm2} mm² Soft Drawn Copper`,
        rating: `${earthingResult.buriedConductorCrossSectionMm2} mm²`,
        quantity: earthingResult.buriedBareConductorLengthM,
        locationFa: 'کانال پیرامونی محوطه سازه‌ها و پست برق',
      },
      // Section B: Equipotential bonding and DC grounding BOM items per IEC 62548 / IEC 60364-5-54 / IEC 62485-2
      {
        id: 'bom-pe-clips',
        category: 'earthing',
        deviceFa: 'گیره و لَگ ارت دندانه‌دار فریم ماژول‌های خورشیدی',
        deviceEn: 'Module Frame Serrated Grounding Clips / Lugs',
        specificationFa: 'استاندارد IEC 62548 و UL 2703 با دندانه‌های نافذ در لایه اکسید آلومینیوم',
        rating: 'Stainless Steel / Copper Lug',
        quantity: Math.max(1, totalModulesCount),
        locationFa: 'فریم آلومینیومی کلیه ماژول‌های خورشیدی و اتصال به ریل',
      },
      {
        id: 'bom-pe-structure',
        category: 'earthing',
        deviceFa: 'هادی هم‌بندی پایه‌ها و شاسی فلزی استراکچر خورشیدی',
        deviceEn: 'PV Array Structure Equipotential Bonding Conductor',
        specificationFa: earthingResult.pvFrameStructureBondingBasisFa,
        rating: `${earthingResult.pvFrameStructureBondingMm2} mm² Cu`,
        quantity: isUtilityPowerplant ? Math.max(25, Math.ceil(parallelStringsCount * 2)) : 10,
        locationFa: 'پایه‌های فلزی استراکچر تا شینه رینگ ارت پیرامونی',
      },
      {
        id: 'bom-pe-bess',
        category: 'earthing',
        deviceFa: 'هادی هم‌بندی حفاظتی رک و کابینت فلزی بانک باتری (BESS)',
        deviceEn: 'BESS Battery Metal Rack & Cabinet Protective Bonding Conductor',
        specificationFa: earthingResult.batteryRackBondingBasisFa,
        rating: `${earthingResult.batteryRackBondingConductorMm2} mm² Cu`,
        quantity: isUtilityPowerplant ? 15 : 6,
        locationFa: 'شاسی و بدنه فلزی رک باتری تا شینه اصلی ارت (MET)',
      },
    ];

    // DC Earthing / Monitoring BOM Item
    if (earthingResult.requiresInsulationMonitoring) {
      bom.push({
        id: 'bom-imd',
        category: 'earthing',
        deviceFa: 'دستگاه پایش پیوسته مقاومت عایقی مدار DC (Insulation Monitoring Device - IMD)',
        deviceEn: 'DC Continuous Insulation Monitoring Device (IMD)',
        specificationFa: 'استاندارد IEC 61557-8 جهت پایش آنلاین مدار DC شناور IT',
        rating: '0-1000 kΩ / 1500VDC',
        quantity: 1,
        locationFa: 'تابلوی کنترل مانیتورینگ DC و ورودی اینورتر',
      });
    } else {
      bom.push({
        id: 'bom-gfdi',
        category: 'earthing',
        deviceFa: 'رله و سنسور آشکارسازی و قطع خطای زمین DC (GFDI / RCMU)',
        deviceEn: 'DC Ground Fault Detector Interrupter (GFDI / RCMU)',
        specificationFa: 'استاندارد IEC 62109-2 جهت قطع خودکار ارت عملکردی در صورت خطای زمین',
        rating: '30mA - 300mA / 1500VDC',
        quantity: 1,
        locationFa: 'مسیر هادی اتصال زمین قطب DC در ورودی اینورتر',
      });
    }

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
    lang,
    earthingResult,
    totalModulesCount,
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
                ? 'غربالگری کابل، ارتینگ و حفاظت صاعقه'
                : 'Cable Sizing, Preliminary Earthing & Lightning Screening'}
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              {lang === 'fa'
                ? 'محاسبات غربالگری کابل، تخمین مقدماتی ارتینگ و حریم صاعقه؛ این صفحه تأیید انطباق یا ایمنی ساختگاه صادر نمی‌کند.'
                : 'Preliminary cable sizing, grounding and lightning screening only; this page does not determine site safety or standards compliance.'}
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
                ? 'bg-industrial-primary text-theme-strong shadow-md'
                : 'bg-industrial-surface text-slate-400 hover:text-theme-strong'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            {lang === 'fa' ? 'سایزینگ کابل و افت ولتاژ' : 'Cable Sizing & Drops'}
          </button>
          <button
            onClick={() => setActiveSubTab('earthing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'earthing'
                ? 'bg-industrial-primary text-theme-strong shadow-md'
                : 'bg-industrial-surface text-slate-400 hover:text-theme-strong'
            }`}
          >
            <Anchor className="w-3.5 h-3.5" />
            {lang === 'fa' ? 'غربالگری مقدماتی سیستم زمین' : 'Preliminary Grounding Screen'}
          </button>
          <button
            onClick={() => setActiveSubTab('lightning')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'lightning'
                ? 'bg-industrial-primary text-theme-strong shadow-md'
                : 'bg-industrial-surface text-slate-400 hover:text-theme-strong'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            {lang === 'fa' ? 'حفاظت صاعقه و سرج (IEC 62305)' : 'Lightning (IEC 62305)'}
          </button>
          <button
            onClick={() => setActiveSubTab('bom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'bom'
                ? 'bg-industrial-primary text-theme-strong shadow-md'
                : 'bg-industrial-surface text-slate-400 hover:text-theme-strong'
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
          <div className="studio-card space-y-3">
            <div>
              <h3 className="text-sm font-bold text-sky-300">{lang === 'fa' ? 'ورودی‌های مستقل و ذخیره‌شوندهٔ هر فیدر' : 'Independent, project-persisted feeder design inputs'}</h3>
              <p className="text-[11px] text-amber-200/80 mt-1">{lang === 'fa' ? 'مقادیر تجمیعی قدیمی به‌تنهایی مبنای نتیجه نیستند. هر مسیر تا ثبت طول، بار/هم‌زمانی، مشخصات نصب، حفاظت و داده خطا بررسی‌نشده می‌ماند.' : 'Legacy aggregate settings alone do not produce a result. Each route remains unassessed until its length, load/coincidence, installation, protection and fault data are entered.'}</p>
            </div>
            {([
              { id: 'dc-string', title: lang === 'fa' ? 'فیدر DC استرینگ' : 'PV string DC feeder', isDc: true },
              { id: 'dc-main', title: lang === 'fa' ? 'فیدر اصلی DC آرایه' : 'Array main DC feeder', isDc: true },
              ...(!isUtilityPowerplant ? [{ id: 'dc-battery', title: lang === 'fa' ? 'فیدر DC باتری' : 'Battery DC feeder', isDc: true }] : []),
              { id: 'ac-output', title: lang === 'fa' ? 'فیدر خروجی AC اینورتر' : 'Inverter AC output feeder', isDc: false },
            ] as const).map((run) => (
              <CableFeederInputEditor key={run.id} id={run.id} title={run.title} isDc={run.isDc} lang={lang}
                input={feederInputs[run.id] ?? {}}
                onChange={(field, value) => updateFeederInput(run.id, field, value)} />
            ))}
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
                {lang === 'fa' ? 'پیش‌غربالگری؛ ورودی‌های دما/نصب/حفاظت مستقل برای هر فیدر اعمال می‌شوند' : 'Preliminary screen; each feeder uses its own explicit temperature, installation and protection inputs'}
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
                    <th className="p-2.5">{lang === 'fa' ? 'حفاظت / وضعیت راه‌اندازی' : 'Protection / start assessment'}</th>
                    <th className="p-2.5" title={lang === 'fa' ? 'جریان شارژ خازنی و ظرفیت خطی بر پایه مدل هم‌محور شیلددار فرضی (IEC 60287-1-1)' : 'Capacitive charging current and line capacitance under idealized coaxial screened model (IEC 60287-1-1)'}>
                      {lang === 'fa' ? 'جریان شارژ / خازن (مدل هم‌محور)' : 'Charging / Cap (Coax Model)'}
                    </th>
                    <th className="p-2.5">{lang === 'fa' ? 'تلفات ژول' : 'Joule Loss'}</th>
                    <th className="p-2.5 text-center">{lang === 'fa' ? 'وضعیت' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {cableRuns.map((run, idx) => run.isAssessed === false ? (
                    <tr key={idx} data-testid="cable-run-unassessed" className="bg-amber-950/20">
                      <td className="p-2.5 font-semibold text-theme-strong">{lang === 'fa' ? run.config.sectionNameFa : run.config.sectionNameEn}</td>
                      <td colSpan={9} className="p-2.5 text-amber-700">{lang === 'fa' ? 'محاسبه/تأیید انجام نشد' : 'Not calculated / not approved'} — {run.assessmentNote}</td>
                      <td className="p-2.5 text-center text-amber-700 font-bold">{lang === 'fa' ? 'نیازمند داده' : 'Data required'}</td>
                    </tr>
                  ) : (
                    <tr key={idx} className="hover:bg-slate-850/60">
                      <td className="p-2.5 font-semibold text-theme-strong">
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
                        <span className={run.isVoltageDropCompliant ? 'text-industrial-success' : 'text-industrial-error'}>
                          {run.actualVoltageDropPct}% ({run.actualVoltageDropVolts}V)
                        </span>
                        <span className="block text-[9px] text-slate-400">
                          {lang === 'fa' ? `مجاز: ≤${run.config.allowableDropPct}٪` : `Max: ${run.config.allowableDropPct}%`}
                        </span>
                        <span className="block text-[8px] text-amber-300" title={run.conductorResistanceModelNote}>
                          {lang === 'fa' ? `مقاومت هادی در ${run.conductorResistanceTempC ?? '—'}°C (فرض محافظه‌کارانه)` : `R at ${run.conductorResistanceTempC ?? '—'}°C (conservative)`}
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
                      <td className="p-2.5 text-[10px]">
                        <div>{run.config.protectiveDeviceReference} ({run.config.protectiveDeviceRatingAmps}A/{run.config.protectiveDeviceBreakingCapacityKa}kA)</div>
                        <div>Isc {run.config.expectedIscKa}kA / {run.config.faultClearingTimeSec}s — {run.isProtectionCoordinationCompliant ? 'screen pass' : 'screen fail'}</div>
                        <div>{run.config.motorStartingMethod ?? (lang === 'fa' ? 'راه‌اندازی نامشخص' : 'start method unknown')} ×{run.config.motorStartingMultiplier ?? '—'}; {lang === 'fa' ? 'جریان شروع (برآورد)' : 'start current estimate'}: {run.motorStartingCurrentAmps ?? '—'} A</div>
                        <div className="text-amber-300">{run.isMotorStartingAssessed ? (lang === 'fa' ? 'افت راه‌اندازی: کاربرد ندارد' : 'Start voltage drop: not applicable') : (lang === 'fa' ? 'افت راه‌اندازی: بررسی‌نشده؛ مدل دینامیکی/حد پذیرش لازم است' : 'Start voltage drop: NOT ASSESSED; dynamic model/acceptance limit required')}</div>
                      </td>
                      <td className="p-2.5 font-mono text-xs">
                        {run.config.isDc ? (
                          <>
                            <span className="text-slate-400 font-bold">0.0 A (DC)</span>
                            <span className="block text-[9px] text-slate-500 font-sans" title={run.capacitanceModelNote}>
                              {run.totalCapacitanceUf} µF (coax)
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-sky-300 font-bold">{run.chargingCurrentAmps} A</span>
                            <span className="block text-[9px] text-slate-400 font-sans" title={run.capacitanceModelNote}>
                              {run.totalCapacitanceUf} µF (coax)
                            </span>
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
                              <CheckCircle2 className="w-3 h-3" /> {lang === 'fa' ? 'غربالگری داخلی قبول' : 'Internal screen pass'}
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
            {cableRuns.some((r) => r.isAssessed !== false && !r.isCompliant) && (
              <div className="mt-4 space-y-2">
                {cableRuns
                  .filter((r) => r.isAssessed !== false && !r.isCompliant)
                  .map((r, i) => (
                    <div key={i} className="p-3 bg-red-950/40 border border-red-800/80 rounded-lg text-xs text-red-200 flex items-start gap-2.5">
                      <Wrench className="w-4 h-4 text-industrial-warning shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-theme-strong block font-bold mb-1">
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

            {/* Engineering Note on Coaxial Capacitance Screening */}
            <div className="text-[10px] text-slate-400 bg-slate-800/30 p-2.5 rounded border border-industrial-border/40 mt-3">
              <span className="text-industrial-accent font-semibold">
                {lang === 'fa' ? 'یادداشت مهندسی ظرفیت خازنی:' : 'Capacitance Engineering Note:'}
              </span>{' '}
              {lang === 'fa'
                ? 'مقادیر ظرفیت خازنی و جریان شارژ بر پایه فرضیه هندسه تحلیلی هم‌محور شیلددار (IEC 60287-1-1 فرمول ۲.۲ با ضخامت اسمی عایق رده 0.6/1kV و EN 50618) محاسبه شده است. در کابل‌های استرینگ DC خورشیدی که معمولاً بدون شیلد هستند یا در کابل‌های چندرشته AC، ظرفیت خازنی واقعی وابسته به نحوه آرایش کابل‌ها در سینی/کانال و مشخصات مندرج در دیتاشیت کارخانه سازنده است.'
                : 'Cable capacitance and charging currents are estimated using an idealized coaxial screened geometry model (IEC 60287-1-1 Eq. 2.2 with generic nominal insulation thickness ladders per IEC 60502-1 / EN 50618). For typical unshielded PV DC string cables or multi-conductor LV circuits, actual in-situ capacitance depends on installation geometry, ground/tray proximity, and certified manufacturer datasheets.'}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PRELIMINARY EARTHING SCREENING */}
      {activeSubTab === 'earthing' && (
        <div className="space-y-6">
          <div className="studio-card">
            <h3 className="text-sm font-bold text-industrial-accent mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Anchor className="w-4 h-4 text-industrial-success" />
                {lang === 'fa'
                  ? 'غربالگری مقدماتی ارتینگ و پتانسیل گام/لمس (بدون تعیین انطباق)'
                  : 'Preliminary Grounding & Touch/Step Screening'}
              </span>
              <label htmlFor="protection-bentonite-checkbox" className="flex items-center gap-2 cursor-pointer bg-industrial-surface px-2.5 py-1 rounded border border-industrial-border text-xs">
                <input
                  id="protection-bentonite-checkbox"
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="p-3 bg-industrial-bg/60 border border-industrial-border rounded-lg space-y-2 text-xs">
                <label htmlFor="protection-soil-resistivity" className="text-slate-300 font-semibold block">
                  {lang === 'fa' ? 'مقاومت ویژه خاک محوطه (Ω·m / Soil Resistivity):' : 'Soil Resistivity (Ω·m):'}
                </label>
                <input
                  id="protection-soil-resistivity"
                  type="number"
                  min="20"
                  max="2000"
                  value={soilResistivity ?? ''}
                  onChange={(e) => setSoilResistivity(e.target.value === '' ? null : Number(e.target.value))}
                  className="studio-input w-full"
                />
                <span className="text-[10px] text-slate-400 block">
                  {lang === 'fa' ? 'خاک رس مرطوب = ۳۰ الی ۵۰، دشت‌های مرکزی ایران = ۱۰۰ الی ۱۵۰، اراضی کویری خشک = ۲۰۰+' : 'Moist clay ~30-50, Central Iran plateau ~100-150, Dry desert ~200+'}
                </span>
              </div>

              <div className="p-3 bg-industrial-bg/60 border border-industrial-border rounded-lg space-y-2 text-xs">
                <label htmlFor="protection-upstream-grounding" className="text-slate-300 font-semibold block">
                  {lang === 'fa' ? 'سیستم زمین و اتصال به شبکه بالادست:' : 'Upstream Grid Earthing Scheme:'}
                </label>
                <select
                  id="protection-upstream-grounding"
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

              <div className="p-3 bg-industrial-bg/60 border border-industrial-border rounded-lg space-y-2 text-xs">
                <label htmlFor="protection-dc-system-earthing" className="text-slate-300 font-semibold block">
                  {lang === 'fa' ? 'رژیم زمین سمت DC (پنل و باتری):' : 'DC System Earthing Architecture:'}
                </label>
                <select
                  id="protection-dc-system-earthing"
                  value={currentDcEarthing}
                  onChange={(e) => handleDcEarthingChange(e.target.value as DcSystemEarthingType)}
                  className="studio-input w-full"
                >
                  <option value="floating">
                    {lang === 'fa' ? '۱. قطب‌های شناور (Floating / پیش‌فرض استاندارد)' : '1. Floating DC Poles (Standard Default - IT)'}
                  </option>
                  <option value="functional_negative">
                    {lang === 'fa' ? '۲. ارت عملکردی قطب منفی (با الزام سازنده)' : '2. Functional Negative Earthing (Mandated)'}
                  </option>
                  <option value="functional_positive">
                    {lang === 'fa' ? '۳. ارت عملکردی قطب مثبت (با الزام سازنده)' : '3. Functional Positive Earthing (Mandated)'}
                  </option>
                </select>
                <span className="text-[10px] text-slate-400 block">
                  {currentDcEarthing === 'floating'
                    ? (lang === 'fa' ? '✓ قطب‌های DC شناور؛ پایش آنلاین مقاومت عایقی با دستگاه IMD الزامی است.' : '✓ DC poles floating; continuous IMD insulation monitoring active.')
                    : (lang === 'fa' ? '⚠ هشدار: ارت عملکردی فقط با الزام سازنده مجاز است و نیازمند حفاظت GFDI/RCMU می‌باشد.' : '⚠ Warning: Functional earthing requires written manufacturer authorization & GFDI.')}
                </span>
              </div>
            </div>
            {/* Single Unified Earthing Principle Box */}
            <div className="p-3 bg-sky-950/40 border border-sky-800/80 rounded-lg text-xs space-y-1 mb-4">
              <div className="flex items-center gap-2 font-bold text-sky-300">
                <Shield className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{lang === 'fa' ? 'حکم مهندسی هم‌بندی و سیستم ارت یکپارچه (Single Unified Earth Grid):' : 'Unified Protective Bonding & Single Earthing Grid Mandate:'}</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {lang === 'fa'
                  ? '۱) هم‌بندی حفاظتی فریم ماژول‌ها، استراکچر فلزی، بدنه اینورتر و رک باتری الزامی بوده و همه به «یک» شینه اصلی ارت (MET) متصل می‌شوند. ۲) توپولوژی هم‌بندی/زمین‌کردن DC باید با سازنده، کد نافذ و طراحی حفاظت پروژه هماهنگ شود؛ الکترود مستقل را بدون مطالعه فرض نکنید. ۳) قطب‌های حامل جریان DC به‌صورت پیش‌فرض شناورند و نباید زمین شوند؛ مانیتورینگ پیوسته عایقی با IMD انجام می‌شود.'
                  : '1) Protective equipotential bonding of PV frames, racking, inverter enclosures, and BESS battery racks to a single Main Earthing Terminal (MET) is mandatory. 2) Confirm DC grounding/bonding topology with the manufacturer, adopted code and project protection design; do not assume a separate electrode is suitable. 3) DC poles remain floating by default; continuous insulation monitoring (IMD) is active.'}
              </p>
            </div>

            {earthingInputsAssessed ? (
              <>
            {/* Equipotential Bonding Schedule Cards */}
            <div className="p-3 rounded-lg border border-industrial-border bg-industrial-surface mb-4">
              <h4 className="text-xs font-bold text-industrial-accent mb-2.5 flex items-center gap-2">
                <Zap className="w-4 h-4 text-industrial-warning" />
                {lang === 'fa' ? 'جدول هادی‌های هم‌بندی حفاظتی و سیستم زمین (Equipotential Bonding Schedule):' : 'Protective Equipotential Bonding Conductor Schedule:'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 bg-industrial-bg rounded-lg border border-industrial-border space-y-1">
                  <span className="text-slate-400 block text-[11px]">{lang === 'fa' ? 'هم‌بندی فریم و سازه ماژول‌ها' : 'PV Frame & Structure Bonding'}</span>
                  <span className="text-base font-bold font-mono text-emerald-400">{earthingResult.pvFrameStructureBondingMm2} mm² Cu</span>
                  <span className="text-[10px] text-slate-400 block">{lang === 'fa' ? earthingResult.pvFrameStructureBondingBasisFa : earthingResult.pvFrameStructureBondingBasisEn}</span>
                </div>
                <div className="p-2.5 bg-industrial-bg rounded-lg border border-industrial-border space-y-1">
                  <span className="text-slate-400 block text-[11px]">{lang === 'fa' ? 'هم‌بندی رک و کابینت باتری BESS' : 'BESS Battery Rack Bonding'}</span>
                  <span className="text-base font-bold font-mono text-indigo-400">{earthingResult.batteryRackBondingConductorMm2} mm² Cu</span>
                  <span className="text-[10px] text-slate-400 block">{lang === 'fa' ? earthingResult.batteryRackBondingBasisFa : earthingResult.batteryRackBondingBasisEn}</span>
                </div>
                <div className="p-2.5 bg-industrial-bg rounded-lg border border-industrial-border space-y-1">
                  <span className="text-slate-400 block text-[11px]">{lang === 'fa' ? 'هم‌بندی بدنه اینورتر' : 'Inverter Chassis Bonding'}</span>
                  <span className="text-base font-bold font-mono text-sky-400">{earthingResult.inverterEnclosureBondingMm2} mm² Cu</span>
                  <span className="text-[10px] text-slate-400 block">{lang === 'fa' ? earthingResult.inverterEnclosureBondingBasisFa : earthingResult.inverterEnclosureBondingBasisEn}</span>
                </div>
              </div>
            </div>

            {/* Preliminary grounding screen notice; model does not determine compliance or safety */}
            <div className={`p-3 rounded-lg border text-xs mb-4 flex items-center justify-between ${
              earthingResult.screeningPassed
                ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                : 'bg-amber-950/40 border-amber-800 text-amber-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
                <div>
                  <strong className="block font-bold">
                    {lang === 'fa'
                      ? `غربالگری مقدماتی ارتینگ: ${earthingResult.screeningPassed ? 'targetهای داخلی عبور کردند' : 'حداقل یک target داخلی رد شد'}؛ انطباق IEEE 80 و ایمنی محل ارزیابی نشده است.`
                      : `Preliminary grounding screen: ${earthingResult.screeningPassed ? 'internal targets passed' : 'one or more internal targets failed'}; IEEE 80 compliance and site safety are unevaluated.`}
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
                <span className={`text-lg font-bold font-mono ${earthingResult.resistanceScreenPassed ? 'text-industrial-success' : 'text-industrial-error'}`}>
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

            {/* Preliminary touch/step screen cards; no safety determination */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-industrial-surface border border-industrial-border text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sky-300">
                    {lang === 'fa' ? 'کنترل ولتاژ لمس مش (Touch Voltage - Em):' : 'Mesh Touch Voltage (Em):'}
                  </span>
                  <span className={`font-mono px-2 py-0.5 rounded text-[10px] font-bold ${
                    earthingResult.touchVoltageScreenPassed ? 'bg-amber-950 text-amber-200 border border-amber-700' : 'bg-amber-950 text-amber-200 border border-amber-700'
                  }`}>
                    {earthingResult.touchVoltageScreenPassed ? (lang === 'fa' ? 'درون target داخلی' : 'Within internal target') : (lang === 'fa' ? 'فراتر از target داخلی' : 'Above internal target')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300 font-mono">
                  <span>{lang === 'fa' ? 'ولتاژ تماس محاسبه‌شده:' : 'Actual Em:'} <strong>{earthingResult.actualMeshVoltageVolts} V</strong></span>
                  <span>{lang === 'fa' ? 'target داخلی مدل:' : 'Internal model target:'} <strong>{earthingResult.maxTouchVoltageVolts} V</strong></span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {lang === 'fa' ? 'حد غربالگری ولتاژ تماس (محاسبه IEEE 80 مقید به target داخلی فرضی رژیم زمین)' : 'Touch screening limit (IEEE 80 constrained by internal assumed grounding-regime target)'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-industrial-surface border border-industrial-border text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-purple-300">
                    {lang === 'fa' ? 'کنترل ولتاژ گام محوطه (Step Voltage - Es):' : 'Step Voltage (Es):'}
                  </span>
                  <span className={`font-mono px-2 py-0.5 rounded text-[10px] font-bold ${
                    earthingResult.stepVoltageScreenPassed ? 'bg-amber-950 text-amber-200 border border-amber-700' : 'bg-amber-950 text-amber-200 border border-amber-700'
                  }`}>
                    {earthingResult.stepVoltageScreenPassed ? (lang === 'fa' ? 'درون target داخلی' : 'Within internal target') : (lang === 'fa' ? 'فراتر از target داخلی' : 'Above internal target')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300 font-mono">
                  <span>{lang === 'fa' ? 'ولتاژ گام محاسبه‌شده:' : 'Actual Es:'} <strong>{earthingResult.actualStepVoltageVolts} V</strong></span>
                  <span>{lang === 'fa' ? 'target داخلی مدل:' : 'Internal model target:'} <strong>{earthingResult.maxStepVoltageVolts} V</strong></span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {lang === 'fa' ? 'حد غربالگری ولتاژ گام (محاسبه IEEE 80 مقید به target داخلی فرضی رژیم زمین)' : 'Step screening limit (IEEE 80 constrained by internal assumed grounding-regime target)'}
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
              </>
            ) : (
              <div data-testid="earthing-not-assessed" role="alert" className="rounded-lg border border-amber-600/50 bg-amber-950/20 p-4 text-sm text-amber-800">
                <strong>{lang === 'fa' ? 'ارزیابی سیستم زمین انجام نشد.' : 'Earthing study not assessed.'}</strong>{' '}
                {lang === 'fa' ? 'هرچند می‌توان مقاومت ویژه خاک را وارد کرد، موتور فعلی جریان خطای عمومی ۲٫۵/۶ kA و زمان قطع ثابت ۰٫۲ s را به‌کار می‌برد و ورودی مطالعه اتصال کوتاه پروژه نمی‌گیرد؛ بنابراین مقاومت محاسبه‌شده، ولتاژ لمس/گام، تعداد الکترود و حکم ایمنی پنهان می‌مانند. این مقادیر برای پروژه بررسی نشده‌اند.' : 'Soil resistivity can be entered, but the current engine hardcodes generic 2.5/6 kA fault current and 0.2 s clearing time and does not accept the project fault study. Calculated resistance, touch/step voltages, electrode counts and safety verdict are therefore withheld and are not assessed for this project.'}
              </div>
            )}
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
                <strong className="text-theme-strong block font-bold mb-0.5">
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
                <strong className="text-theme-strong font-mono">{lightningResult.collectionAreaM2.toLocaleString()} m²</strong>
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
            {lang === 'fa' ? 'فهرست غربالگری اولیه ادوات — انتخاب BOM نهایی نیست' : 'Preliminary protection screening schedule — not a selected BOM'}
          </h3>

          <div data-testid="protection-bom-warning" role="alert" className="mb-3 rounded border border-amber-600/50 bg-amber-950/20 p-3 text-xs text-amber-800">
            {lang === 'fa' ? 'هیچ تجهیز حفاظتی در این جدول برای ساخت/خرید انتخاب یا هماهنگ نشده است. مقادیر اولیه بر داده‌های کاتالوگ و فرض‌های غربالگری تکیه دارند؛ سطح اتصال کوتاه، منحنی تجهیزات، مدارک سازنده و کد محل لازم‌اند. مقادیر گم‌شده به‌معنی انتخاب‌نشده است.' : 'No protective device in this table is selected or coordinated for construction/procurement. Preliminary values depend on catalog inputs and screening assumptions; utility fault level, device curves, manufacturer documents and local code are required. Missing values mean not selected.'}
          </div>
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
                    <td className="p-2.5 font-bold text-theme-strong">
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
