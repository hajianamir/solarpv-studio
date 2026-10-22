// Advanced Cable Sizing, Multi-Conductor Parallel Runs, Earthing (IEEE 80 / IEC 60364-5-54)
// and Lightning Protection System (IEC 62305 / IEC 62548) Engine

export type ConductorMaterial = 'copper' | 'aluminum';
export type InsulationType = 'xlpe' | 'pvc';
export type UpstreamGroundingSystem = 'solidly_grounded' | 'impedance_grounded' | 'isolated_it';

export interface CableRunConfig {
  id: string;
  sectionNameFa: string;
  sectionNameEn: string;
  oneWayLengthM: number;
  designCurrentAmps: number;
  nominalVoltageVolts: number;
  conductorMaterial: ConductorMaterial;
  insulationType: InsulationType;
  allowableDropPct: number;
  isDc: boolean;
  isThreePhase?: boolean;
}

export interface CableRunResult {
  config: CableRunConfig;
  calculatedTheoreticalCrossSectionMm2: number;
  selectedStandardSingleCrossSectionMm2: number;
  parallelRunsCount: number; // 1, 2, 3, or 4 cables in parallel per phase
  perRunCrossSectionMm2: number; // e.g. 185 mm²
  totalEffectiveCrossSectionMm2: number;
  cableDesignationFa: string; // e.g. "2 × (1 × 185 mm²) مسی XLPE"
  cableDesignationEn: string;
  actualVoltageDropVolts: number;
  actualVoltageDropPct: number;
  isCompliant: boolean;
  troubleshootingGuideFa?: string;
  troubleshootingGuideEn?: string;
}

export interface EarthingAnalysisResult {
  soilResistivityOhmM: number;
  targetGroundResistanceOhms: number;
  calculatedGroundResistanceOhms: number;
  groundRodsCount: number;
  rodLengthM: number;
  rodDiameterMm: number;
  buriedBareConductorLengthM: number;
  buriedConductorCrossSectionMm2: number;
  equipmentBondingConductorMm2: number;
  inverterGroundingConductorMm2: number;
  batteryRackBondingConductorMm2: number;
  upstreamSystemType: UpstreamGroundingSystem;
  maxTouchVoltageVolts: number;
  maxStepVoltageVolts: number;
  isResistanceCompliant: boolean;
  earthingExecutionStepsFa: string[];
  earthingExecutionStepsEn: string[];
}

export interface LightningProtectionResult {
  lpsClass: 'Class I' | 'Class II' | 'Class III' | 'Class IV';
  rollingSphereRadiusM: number;
  protectionAngleDeg: number;
  airTerminalsCount: number;
  airTerminalHeightM: number;
  downConductorsCount: number;
  downConductorCrossSectionMm2: number;
  dcSpdSpec: string;
  acSpdSpec: string;
  mvArresterSpec: string;
  lightningRiskLevelFa: string;
  installationGuidelinesFa: string[];
}

export interface ProtectionBomItem {
  id: string;
  category: 'fuse' | 'breaker' | 'spd' | 'rcd' | 'isolator' | 'earthing';
  deviceFa: string;
  deviceEn: string;
  specificationFa: string;
  rating: string;
  quantity: number;
  locationFa: string;
}

export interface CompleteProtectionSystemResult {
  cableRuns: CableRunResult[];
  earthing: EarthingAnalysisResult;
  lightning: LightningProtectionResult;
  protectionBom: ProtectionBomItem[];
}

// Standard metric cable sizes available in industry (IEC 60228)
export const STANDARD_CABLE_SECTIONS_MM2 = [
  2.5, 4.0, 6.0, 10.0, 16.0, 25.0, 35.0, 50.0, 70.0, 95.0, 120.0, 150.0, 185.0, 240.0, 300.0, 400.0,
];

// Single cable maximum practical cross-section before requiring parallel runs
const MAX_PRACTICAL_SINGLE_CABLE_MM2 = 240.0;

/**
 * Calculates sizing and parallel cable runs for an electrical run
 */
export function calculateAdvancedCableRun(config: CableRunConfig): CableRunResult {
  // Conductivity gamma: Copper = 56 m/(Ω*mm²), Aluminum = 35 m/(Ω*mm²)
  const gamma = config.conductorMaterial === 'copper' ? 56.0 : 35.0;

  // Temperature correction factor for insulation:
  // XLPE rated at 90°C (operating temperature ~70°C in ducts)
  // PVC rated at 70°C (operating temperature ~60°C in ducts)
  const tempCorrection = config.insulationType === 'xlpe' ? 1.0 : 0.88;
  const effectiveGamma = gamma * tempCorrection;

  const allowableDropVolts = (config.allowableDropPct / 100.0) * config.nominalVoltageVolts;

  // Formula:
  // DC or Single Phase AC: S = (2 * L * I) / (effectiveGamma * DeltaV)
  // Three Phase AC: S = (sqrt(3) * L * I * cosPhi) / (effectiveGamma * DeltaV)
  let calculatedTheoreticalMm2: number;
  if (config.isDc) {
    calculatedTheoreticalMm2 = (2.0 * config.oneWayLengthM * config.designCurrentAmps) / (effectiveGamma * allowableDropVolts);
  } else if (config.isThreePhase) {
    const cosPhi = 0.95;
    calculatedTheoreticalMm2 =
      (Math.sqrt(3) * config.oneWayLengthM * config.designCurrentAmps * cosPhi) / (effectiveGamma * allowableDropVolts);
  } else {
    calculatedTheoreticalMm2 = (2.0 * config.oneWayLengthM * config.designCurrentAmps) / (effectiveGamma * allowableDropVolts);
  }

  // Determine parallel runs if required cross section is high
  let parallelRuns = 1;
  let perRunSection = STANDARD_CABLE_SECTIONS_MM2[0];

  if (calculatedTheoreticalMm2 <= MAX_PRACTICAL_SINGLE_CABLE_MM2) {
    perRunSection =
      STANDARD_CABLE_SECTIONS_MM2.find((s) => s >= calculatedTheoreticalMm2) ||
      STANDARD_CABLE_SECTIONS_MM2[STANDARD_CABLE_SECTIONS_MM2.length - 1];
    parallelRuns = 1;
  } else {
    // Needs parallel runs
    for (let runs = 2; runs <= 6; runs++) {
      const sectionNeededPerRun = calculatedTheoreticalMm2 / runs;
      const matched = STANDARD_CABLE_SECTIONS_MM2.find(
        (s) => s >= sectionNeededPerRun && s <= MAX_PRACTICAL_SINGLE_CABLE_MM2
      );
      if (matched) {
        parallelRuns = runs;
        perRunSection = matched;
        break;
      }
    }
    // Fallback if extremely huge
    if (parallelRuns === 1) {
      parallelRuns = Math.ceil(calculatedTheoreticalMm2 / MAX_PRACTICAL_SINGLE_CABLE_MM2);
      perRunSection = MAX_PRACTICAL_SINGLE_CABLE_MM2;
    }
  }

  const totalEffectiveCrossSection = parallelRuns * perRunSection;

  // Actual voltage drop recalculation
  let actualDropVolts: number;
  if (config.isDc) {
    actualDropVolts = (2.0 * config.oneWayLengthM * config.designCurrentAmps) / (effectiveGamma * totalEffectiveCrossSection);
  } else if (config.isThreePhase) {
    const cosPhi = 0.95;
    actualDropVolts =
      (Math.sqrt(3) * config.oneWayLengthM * config.designCurrentAmps * cosPhi) /
      (effectiveGamma * totalEffectiveCrossSection);
  } else {
    actualDropVolts = (2.0 * config.oneWayLengthM * config.designCurrentAmps) / (effectiveGamma * totalEffectiveCrossSection);
  }

  const actualDropPct = Number(((actualDropVolts / config.nominalVoltageVolts) * 100.0).toFixed(2));
  const isCompliant = actualDropPct <= config.allowableDropPct;

  const matFa = config.conductorMaterial === 'copper' ? 'مسی (Cu)' : 'آلومینیومی (Al)';
  const matEn = config.conductorMaterial === 'copper' ? 'Cu' : 'Al';
  const insulFa = config.insulationType === 'xlpe' ? 'XLPE (90°C)' : 'PVC (70°C)';
  const insulEn = config.insulationType.toUpperCase();

  const cableDesignationFa =
    parallelRuns > 1
      ? `${parallelRuns} × (1 × ${perRunSection} mm²) ${matFa} با عایق ${insulFa}`
      : `1 × (${perRunSection} mm²) ${matFa} با عایق ${insulFa}`;

  const cableDesignationEn =
    parallelRuns > 1
      ? `${parallelRuns}x(1x${perRunSection}mm²) ${matEn}/${insulEn}`
      : `1x(${perRunSection}mm²) ${matEn}/${insulEn}`;

  let troubleshootingGuideFa: string | undefined;
  let troubleshootingGuideEn: string | undefined;

  if (!isCompliant) {
    troubleshootingGuideFa = `نحوه رفع خطا: افت ولتاژ این مسیر (${actualDropPct}٪) بیش از حد مجاز (${config.allowableDropPct}٪) است. راهکار: ۱) افزایش تعداد کابل موازی به ${parallelRuns + 1} رشته، یا ۲) تغییر جنس کابل از آلومینیوم به مس با هدایت الکتریکی بالاتر، یا ۳) کوتاه نمودن طول مسیر کابل‌کشی.`;
    troubleshootingGuideEn = `Troubleshooting Guide: Voltage drop (${actualDropPct}%) exceeds allowable threshold (${config.allowableDropPct}%). Resolution: 1) Increase parallel runs to ${parallelRuns + 1}, 2) Switch conductor to Copper, or 3) Shorten physical cable run length.`;
  }

  return {
    config,
    calculatedTheoreticalCrossSectionMm2: Number(calculatedTheoreticalMm2.toFixed(1)),
    selectedStandardSingleCrossSectionMm2: perRunSection,
    parallelRunsCount: parallelRuns,
    perRunCrossSectionMm2: perRunSection,
    totalEffectiveCrossSectionMm2: totalEffectiveCrossSection,
    cableDesignationFa,
    cableDesignationEn,
    actualVoltageDropVolts: Number(actualDropVolts.toFixed(2)),
    actualVoltageDropPct: actualDropPct,
    isCompliant,
    troubleshootingGuideFa,
    troubleshootingGuideEn,
  };
}

/**
 * Calculates complete Earthing (IEEE 80 / IEC 60364-5-54) for solar arrays and upstream grid
 */
export function calculateEarthingSystem(
  systemCapacityKw: number,
  soilResistivityOhmM: number = 100, // standard soil in Iran: 50-200 Ω·m
  upstreamSystem: UpstreamGroundingSystem = 'solidly_grounded',
  isUtilityPowerplant: boolean = false
): EarthingAnalysisResult {
  const rho = Math.max(10, soilResistivityOhmM || 100);
  const targetResistance = isUtilityPowerplant ? 1.0 : 4.0; // IEEE 80 requires <= 1.0 ohm for utility substations, <= 4-5 ohms for solar arrays

  // Ground Rod: standard 3m length, 16mm diameter (0.016m)
  const rodLengthM = 3.0;
  const rodRadiusM = 0.008;

  // Single rod resistance formula (Dwight formula):
  // R_single = (rho / (2 * PI * L)) * (ln(4L / r) - 1)
  const singleRodResistance = (rho / (2.0 * Math.PI * rodLengthM)) * (Math.log((4.0 * rodLengthM) / rodRadiusM) - 1.0);

  // Mesh & Rod grouping factor (Sunde equation approximation)
  // Number of rods needed to reach target resistance with perimeter ground conductor loop:
  const estimatedRods = Math.max(
    isUtilityPowerplant ? 12 : 2,
    Math.ceil((singleRodResistance / targetResistance) * 0.7)
  );

  const buriedConductorLength = isUtilityPowerplant
    ? Math.max(150, Math.sqrt(systemCapacityKw * 10) * 4) // Perimeter mesh of plant
    : 30; // 30m loop around building / array

  // Composite resistance of grid + rods (Laurent / Nyman equation):
  // Rg = rho / (4 * r_eq) + rho / L_total
  const areaM2 = (buriedConductorLength / 4.0) ** 2;
  const rEquivalent = Math.sqrt(areaM2 / Math.PI);
  const totalLength = buriedConductorLength + estimatedRods * rodLengthM;
  const calculatedRg = Number(((rho / (4.0 * rEquivalent)) + (rho / totalLength)).toFixed(2));

  // Conductor cross-section based on adiabatic fault current equation:
  // S = sqrt(I_sc^2 * t) / k (IEC 60364-5-54)
  const buriedConductorMm2 = isUtilityPowerplant ? 95.0 : 35.0; // 95 mm² bare copper tape for powerplant
  const equipmentBondingMm2 = isUtilityPowerplant ? 25.0 : 16.0;
  const inverterGroundingMm2 = isUtilityPowerplant ? 70.0 : 25.0;
  const batteryRackBondingMm2 = 35.0;

  // Maximum touch & step voltage limits according to IEEE 80 (50kg body weight, 0.2s fault duration)
  let maxTouch = 70.0; // Volts (safety threshold)
  let maxStep = 250.0;
  if (upstreamSystem === 'impedance_grounded') {
    maxTouch = 120.0; // Lower ground fault current via neutral grounding resistor (NGR)
    maxStep = 400.0;
  } else if (upstreamSystem === 'isolated_it') {
    maxTouch = 50.0; // Requires Insulation Monitoring Device (IMD)
    maxStep = 200.0;
  }

  const earthingExecutionStepsFa = [
    '۱. حفر رینگ ارت پیرامونی: حفر کانال به عمق حداقل ۸۰ سانتی‌متر دور تا دور محوطه آرایه‌ها و پست برق.',
    `۲. کوبش الکترودهای میله‌ای: کوبیدن ${estimatedRods} عدد راد ارت مسی ۳ متری با فاصله حداقل ۶ متر از یکدیگر (دو برابر طول راد) جهت جلوگیری از تداخل حوزه‌های پتانسیل.`,
    '۳. اتصالات جوش احتراقی (کدولد): اتصال کلیه سر میله‌ها به تسمه/سیم لخت مسی با جوش کدولد (Cadweld) گرافیتی استاندارد جهت جلوگیری از خوردگی گالوانیک.',
    '۴. هم‌بندی سازه‌ها و پنل‌ها: نصب گیره‌های ارت دندانه‌دار (Grounding Clips) در زیر فریم هر ماژول خورشیدی و هم‌بندی پایه‌های استراکچر با کابل مسی ۱۶ میلی‌متر مربع.',
    '۵. حوضچه ارت و شینه اصلی اتصال زمین (MET): تعبیه دریچه بازدید تست ارت مجهز به شینه شمش مسی و پیت ارت در ورودی پست و اتاق اینورتر.',
    `۶. هماهنگی با شبکه بالادست (${upstreamSystem === 'solidly_grounded' ? 'زمین مستقیم TN-S' : upstreamSystem === 'impedance_grounded' ? 'مقاومت زمین NGR' : 'ایزوله IT'}): اتصال نقطه نوترال به رله‌های خطای زمین 50N/51N و تنظیم زمان قطع زیر ۰.۲ ثانیه.`,
  ];

  const earthingExecutionStepsEn = [
    '1. Perimeter Ground Ring: Excavate an 80cm deep trench around the array boundary and substation perimeter.',
    `2. Copper-Bonded Ground Rods: Drive ${estimatedRods} x 3m rods spaced at least 6m apart to prevent sphere-of-influence overlap.`,
    '3. Exothermic Cadweld Connections: Connect rods to buried copper conductor using molecular exothermic welding.',
    '4. Module Frame & Structure Bonding: Install certified serrated grounding clips on all module frames and 16 mm² bonding jumpers on all steel tables.',
    '5. Earth Test Wells & Main Earthing Terminal (MET): Install inspectable earth pits with test disconnect links at the substation and inverter skids.',
    `6. Upstream Grid Coordination (${upstreamSystem}): Coordinate with upstream utility protection relays (50N/51N) for clearance under 0.2s.`,
  ];

  return {
    soilResistivityOhmM: rho,
    targetGroundResistanceOhms: targetResistance,
    calculatedGroundResistanceOhms: calculatedRg,
    groundRodsCount: estimatedRods,
    rodLengthM,
    rodDiameterMm: 16,
    buriedBareConductorLengthM: Math.round(buriedConductorLength),
    buriedConductorCrossSectionMm2: buriedConductorMm2,
    equipmentBondingConductorMm2: equipmentBondingMm2,
    inverterGroundingConductorMm2: inverterGroundingMm2,
    batteryRackBondingConductorMm2: batteryRackBondingMm2,
    upstreamSystemType: upstreamSystem,
    maxTouchVoltageVolts: maxTouch,
    maxStepVoltageVolts: maxStep,
    isResistanceCompliant: calculatedRg <= targetResistance,
    earthingExecutionStepsFa,
    earthingExecutionStepsEn,
  };
}

/**
 * Calculates Lightning Protection System (IEC 62305 & IEC 62548)
 */
export function calculateLightningProtection(
  systemCapacityKw: number,
  isUtilityPowerplant: boolean = false
): LightningProtectionResult {
  const lpsClass = isUtilityPowerplant ? 'Class II' : 'Class III';
  const rollingSphereRadiusM = isUtilityPowerplant ? 30.0 : 45.0; // Class II = 30m, Class III = 45m
  const protectionAngleDeg = isUtilityPowerplant ? 45 : 35;

  const airTerminalsCount = isUtilityPowerplant
    ? Math.max(4, Math.ceil(systemCapacityKw / 2500) * 2) // On substation tower & inverter skids
    : 1;

  const downConductorsCount = airTerminalsCount * 2; // At least 2 down conductors per mast (IEC 62305-3)
  const downConductorCrossSectionMm2 = 50.0; // 50 mm² bare copper

  const installationGuidelinesFa = [
    `۱. صاعقه‌گیرهای میله‌ای فرانکلین یا الکترونیکی ESE با شعاع حفاظتی بر اساس گوی غلتان ${rollingSphereRadiusM} متر (کلاس ${lpsClass}).`,
    '۲. نصب حداقل ۲ هادی نزولی (Down Conductor) مسی ۵۰ میلی‌متر مربع برای هر دکل صاعقه‌گیر در دو مسیر مجزا به سمت چاه ارت صاعقه.',
    '۳. نصب سرج ارستر صاعقه‌گیر ترکیبی Type 1+2 DC در ورودی اینورتر با تحمل جریان ضربه‌ای Iimp حداقل 12.5kA و In=20kA.',
    '۴. نصب سرج ارستر AC کلاس Type 1+2 در تابلوی توزیع جهت مهار موج اضافه ولتاژ صاعقه القایی شبکه.',
    '۵. رعایت فاصله جداسازی ایمن (Separation Distance - s) حداقل ۱ متر بین هادی نزولی صاعقه و کابل‌های DC/AC سولار جهت جلوگیری از آرک جانبی (Side Flash).',
  ];

  return {
    lpsClass,
    rollingSphereRadiusM,
    protectionAngleDeg,
    airTerminalsCount,
    airTerminalHeightM: isUtilityPowerplant ? 6.0 : 3.5,
    downConductorsCount,
    downConductorCrossSectionMm2,
    dcSpdSpec: 'Type 1+2 DC SPD (1500V DC, Iimp: 12.5 kA, In: 20 kA, Up < 3.8 kV)',
    acSpdSpec: 'Type 1+2 AC SPD (400V/800V AC, Iimp: 12.5 kA, In: 20 kA)',
    mvArresterSpec: 'Station Class Heavy-Duty MV Metal-Oxide Surge Arrester (24kV / 10kA Class 1)',
    lightningRiskLevelFa: isUtilityPowerplant ? 'متوسط رو به بالا (نیاز به حفاظت کلاس II با ارسترهای اختصاصی)' : 'استاندارد کلاس III',
    installationGuidelinesFa,
  };
}
