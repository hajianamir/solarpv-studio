// Advanced Cable Sizing, Multi-Conductor Parallel Runs, Earthing (IEEE 80 / IEC 60364-5-54)
// and Lightning Protection System (IEC 62305 / IEC 62548) Engine
// Sizing governed simultaneously by:
// 1. Voltage Drop constraint (IEC 60364-5-52) with conductor inductive reactance
// 2. Thermal Ampacity (Current-Carrying Capacity) with temperature & grouping derating (IEC 60287 / IEC 60364-5-52)
// 3. Short-circuit adiabatic thermal withstand (k²S² >= I²t per IEC 60364-5-54)
// 4. Joule thermal power loss & efficiency verification

export type ConductorMaterial = 'copper' | 'aluminum';
export type InsulationType = 'xlpe' | 'pvc';
export type UpstreamGroundingSystem = 'solidly_grounded' | 'impedance_grounded' | 'isolated_it';
export type InstallationMethod = 'cable_tray' | 'in_conduit' | 'direct_buried';

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
  ambientTempC?: number;           // Defaults to 40°C
  installationMethod?: InstallationMethod; // Defaults to 'cable_tray'
  expectedIscKa?: number;           // Defaults to 10 kA
  faultClearingTimeSec?: number;    // Defaults to 0.1s
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
  // Multi-constraint engineering parameters
  thermalAmpacityPerRunAmps: number;
  totalThermalAmpacityAmps: number;
  temperatureDeratingFactorKt: number;
  groupingDeratingFactorKg: number;
  shortCircuitWithstandMinMm2: number;
  powerLossWatts: number;
  powerLossPct: number;
  isAmpacityCompliant: boolean;
  isShortCircuitCompliant: boolean;
  // Cable electrical parameters (IEC 60287 / IEC 60502)
  lineCapacitanceUfPerKm: number;
  totalCapacitanceUf: number;
  chargingCurrentAmps: number;
  capacitanceModelNote: string;
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
  // IEEE 80 touch/step potential safety verification
  tolerableTouchVoltageVolts: number;
  tolerableStepVoltageVolts: number;
  actualMeshVoltageVolts: number;
  actualStepVoltageVolts: number;
  isTouchVoltageSafe: boolean;
  isStepVoltageSafe: boolean;
  isResistanceCompliant: boolean;
  isEarthingSafe: boolean; // Integrated compliance: resistance AND touch AND step
  isPreliminaryEstimate: boolean;
  disclaimerFa: string;
  disclaimerEn: string;
  bentoniteEnhancedResistanceOhms?: number;
  bentoniteApplied?: boolean;
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
  isPreliminaryAssessment: boolean;
  notesFa: string[];
  notesEn: string[];
  // IEC 62305 Risk & Separation Distance
  collectionAreaM2: number;
  annualExpectedStrikesNd: number;
  tolerableStrikesNc: number;
  requiredEfficiencyPct: number;
  separationDistanceCm: number;
  installationGuidelinesFa: string[];
  installationGuidelinesEn?: string[];
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

// Base current-carrying ampacity tables (IEC 60364-5-52 Table B.52 at 30°C in air)
const BASE_AMPACITY_COPPER_XLPE: Record<number, number> = {
  2.5: 32,
  4.0: 42,
  6.0: 54,
  10.0: 75,
  16.0: 100,
  25.0: 133,
  35.0: 164,
  50.0: 198,
  70.0: 253,
  95.0: 306,
  120.0: 354,
  150.0: 407,
  185.0: 464,
  240.0: 546,
  300.0: 628,
  400.0: 728,
};

const BASE_AMPACITY_COPPER_PVC: Record<number, number> = {
  2.5: 25,
  4.0: 34,
  6.0: 43,
  10.0: 60,
  16.0: 80,
  25.0: 106,
  35.0: 131,
  50.0: 159,
  70.0: 202,
  95.0: 244,
  120.0: 282,
  150.0: 324,
  185.0: 371,
  240.0: 436,
  300.0: 500,
  400.0: 580,
};

// Aluminum ampacity is approx 78% of copper
function getBaseAmpacity(sectionMm2: number, material: ConductorMaterial, insulation: InsulationType): number {
  const baseTable = insulation === 'xlpe' ? BASE_AMPACITY_COPPER_XLPE : BASE_AMPACITY_COPPER_PVC;
  const cuAmpacity = baseTable[sectionMm2] || 0;
  return material === 'copper' ? cuAmpacity : Math.round(cuAmpacity * 0.78);
}

// Single cable maximum practical cross-section before requiring parallel runs
const MAX_PRACTICAL_SINGLE_CABLE_MM2 = 240.0;

/**
 * Calculates multi-constraint sizing and parallel cable runs for an electrical run:
 * Sizing satisfies Voltage Drop + Thermal Ampacity (with Temp/Grouping derating) + Short-circuit withstand.
 */
export function calculateAdvancedCableRun(config: CableRunConfig): CableRunResult {
  // 1. Conductivity gamma: Copper = 56 m/(Ω*mm²), Aluminum = 35 m/(Ω*mm²)
  const gamma = config.conductorMaterial === 'copper' ? 56.0 : 35.0;

  // Temperature correction factor for conductivity
  const ambientTempC = config.ambientTempC ?? 40.0;
  const tempCorrection = config.insulationType === 'xlpe' ? 1.0 : 0.88;
  const effectiveGamma = gamma * tempCorrection;

  // Ampacity derating factors (IEC 60364-5-52 Table B.52.14)
  // kt = sqrt((T_max - T_amb) / (T_max - 30))
  const maxOperatingTemp = config.insulationType === 'xlpe' ? 90.0 : 70.0;
  const kt = Number(
    Math.min(1.0, Math.max(0.60, Math.sqrt((maxOperatingTemp - ambientTempC) / (maxOperatingTemp - 30.0)))).toFixed(3)
  );

  // Grouping factor kg: installation method and multi-circuit derating (IEC 60364-5-52 Table B.52.17)
  const installMethod = config.installationMethod ?? 'cable_tray';
  const kg = installMethod === 'direct_buried' ? 0.70 : installMethod === 'in_conduit' ? 0.75 : 0.82;

  // 2. Short-Circuit Thermal Withstand Requirement (IEC 60364-5-54)
  // S_sc = (I_sc * sqrt(t)) / k
  // k for Cu/XLPE = 143, Cu/PVC = 115, Al/XLPE = 94, Al/PVC = 76
  const kFactor =
    config.conductorMaterial === 'copper'
      ? config.insulationType === 'xlpe' ? 143 : 115
      : config.insulationType === 'xlpe' ? 94 : 76;
  const iscAmps = (config.expectedIscKa ?? 10.0) * 1000.0;
  const faultDurationSec = config.faultClearingTimeSec ?? 0.1;
  const shortCircuitWithstandMinMm2 = Number(((iscAmps * Math.sqrt(faultDurationSec)) / kFactor).toFixed(1));

  // 3. Voltage Drop Constraint Sizing
  const allowableDropVolts = (config.allowableDropPct / 100.0) * config.nominalVoltageVolts;
  let calculatedTheoreticalMm2: number;

  if (config.isDc) {
    calculatedTheoreticalMm2 = (2.0 * config.oneWayLengthM * config.designCurrentAmps) / (effectiveGamma * allowableDropVolts);
  } else if (config.isThreePhase) {
    const cosPhi = 0.95;
    // Include AC reactance component (X_L ≈ 0.08 Ω/km = 0.00008 Ω/m)
    const sinPhi = Math.sqrt(1.0 - cosPhi * cosPhi);
    const reactiveDropVolts = Math.sqrt(3) * config.oneWayLengthM * config.designCurrentAmps * 0.00008 * sinPhi;
    const netAllowableResistiveDrop = Math.max(0.2, allowableDropVolts - reactiveDropVolts);

    calculatedTheoreticalMm2 =
      (Math.sqrt(3) * config.oneWayLengthM * config.designCurrentAmps * cosPhi) /
      (effectiveGamma * netAllowableResistiveDrop);
  } else {
    calculatedTheoreticalMm2 = (2.0 * config.oneWayLengthM * config.designCurrentAmps) / (effectiveGamma * allowableDropVolts);
  }

  // 4. Combined Sizing: Candidate cross section must satisfy ALL THREE constraints simultaneously:
  // (a) Voltage drop: total section >= calculatedTheoreticalMm2
  // (b) Thermal ampacity: total derated ampacity >= designCurrentAmps
  // (c) Short-circuit thermal withstand: total section >= shortCircuitWithstandMinMm2 (IEC 60364-5-54)
  let parallelRuns = 1;
  let perRunSection = STANDARD_CABLE_SECTIONS_MM2[0];

  const checkAmpacity = (section: number, runs: number): boolean => {
    const baseAmp = getBaseAmpacity(section, config.conductorMaterial, config.insulationType);
    const deratedAmp = baseAmp * kt * kg;
    return deratedAmp * runs >= config.designCurrentAmps;
  };

  const checkShortCircuit = (section: number, runs: number): boolean => {
    return (section * runs) >= shortCircuitWithstandMinMm2;
  };

  const minRequiredTotalMm2 = Math.max(calculatedTheoreticalMm2, shortCircuitWithstandMinMm2);

  // Find minimum standard size that satisfies voltage drop, ampacity, and short-circuit
  for (const candidate of STANDARD_CABLE_SECTIONS_MM2) {
    if (
      candidate >= calculatedTheoreticalMm2 &&
      checkShortCircuit(candidate, 1) &&
      checkAmpacity(candidate, 1)
    ) {
      perRunSection = candidate;
      parallelRuns = 1;
      break;
    }
  }

  // If requires larger than MAX_PRACTICAL_SINGLE_CABLE_MM2 or single cable insufficient
  if (
    minRequiredTotalMm2 > MAX_PRACTICAL_SINGLE_CABLE_MM2 ||
    !checkAmpacity(perRunSection, parallelRuns) ||
    !checkShortCircuit(perRunSection, parallelRuns)
  ) {
    let foundMultiRun = false;
    for (let runs = 2; runs <= 6; runs++) {
      const sectionNeededPerRun = calculatedTheoreticalMm2 / runs;
      const matched = STANDARD_CABLE_SECTIONS_MM2.find(
        (s) =>
          s >= sectionNeededPerRun &&
          s <= MAX_PRACTICAL_SINGLE_CABLE_MM2 &&
          checkAmpacity(s, runs) &&
          checkShortCircuit(s, runs)
      );
      if (matched) {
        parallelRuns = runs;
        perRunSection = matched;
        foundMultiRun = true;
        break;
      }
    }

    // Fallback if very large (or tight short-circuit / ampacity constraints)
    if (!foundMultiRun) {
      parallelRuns = Math.max(
        parallelRuns,
        Math.ceil(minRequiredTotalMm2 / MAX_PRACTICAL_SINGLE_CABLE_MM2)
      );
      perRunSection = MAX_PRACTICAL_SINGLE_CABLE_MM2;
    }
  }

  const totalEffectiveCrossSection = parallelRuns * perRunSection;

  // 5. Actual Voltage Drop Recalculation
  let actualDropVolts: number;
  if (config.isDc) {
    actualDropVolts = (2.0 * config.oneWayLengthM * config.designCurrentAmps) / (effectiveGamma * totalEffectiveCrossSection);
  } else if (config.isThreePhase) {
    const cosPhi = 0.95;
    const sinPhi = Math.sqrt(1.0 - cosPhi * cosPhi);
    const rPerMeter = 1.0 / (effectiveGamma * totalEffectiveCrossSection);
    const xPerMeter = 0.00008; // 0.08 ohm/km
    actualDropVolts =
      Math.sqrt(3) *
      config.oneWayLengthM *
      config.designCurrentAmps *
      (rPerMeter * cosPhi + xPerMeter * sinPhi);
  } else {
    actualDropVolts = (2.0 * config.oneWayLengthM * config.designCurrentAmps) / (effectiveGamma * totalEffectiveCrossSection);
  }

  const actualDropPct = Number(((actualDropVolts / config.nominalVoltageVolts) * 100.0).toFixed(2));
  const isDropCompliant = actualDropPct <= config.allowableDropPct;

  // 6. Ampacity & Short-Circuit Verification
  const singleBaseAmp = getBaseAmpacity(perRunSection, config.conductorMaterial, config.insulationType);
  const singleDeratedAmp = Number((singleBaseAmp * kt * kg).toFixed(1));
  const totalDeratedAmp = Number((singleDeratedAmp * parallelRuns).toFixed(1));
  const isAmpacityCompliant = totalDeratedAmp >= config.designCurrentAmps;
  // Rigorous IEC 60364-5-54 k²S² >= I²t without arbitrary discount factors:
  const isShortCircuitCompliant = totalEffectiveCrossSection >= shortCircuitWithstandMinMm2;

  // 7. Joule Thermal Power Loss (P_loss = m * I² * R)
  const lineResistanceOhms = config.oneWayLengthM / (effectiveGamma * totalEffectiveCrossSection);
  const multiplier = config.isThreePhase ? 3.0 : 2.0;
  const powerLossWatts = Math.round(multiplier * Math.pow(config.designCurrentAmps, 2) * lineResistanceOhms);
  const totalTransferredPowerWatts = config.isThreePhase
    ? Math.sqrt(3) * config.nominalVoltageVolts * config.designCurrentAmps * 0.95
    : config.nominalVoltageVolts * config.designCurrentAmps;
  const powerLossPct = Number(((powerLossWatts / Math.max(1, totalTransferredPowerWatts)) * 100.0).toFixed(2));

  // 8. Line Capacitance & AC Charging Current per IEC 60287-1-1 & IEC 60502-1 / EN 50618:
  // Relative dielectric permittivity epsilon_r per IEC 60287-1-1 Table 3:
  // XLPE = 2.4, PVC = 5.0
  const epsilonR = config.insulationType === 'pvc' ? 5.0 : 2.4;

  // Stranded circular compacted conductor outer diameter d_c (mm) per IEC 60228:
  const dcMm = Number((2.0 * Math.sqrt(perRunSection / (Math.PI * 0.88))).toFixed(2));

  // Nominal insulation thickness t_ins (mm) per IEC 60502-1 Table 5 / EN 50618:
  let tInsMm = 0.8;
  if (perRunSection > 240) tInsMm = 2.2;
  else if (perRunSection > 185) tInsMm = 2.0;
  else if (perRunSection > 120) tInsMm = 1.8;
  else if (perRunSection > 70) tInsMm = 1.6;
  else if (perRunSection > 35) tInsMm = 1.4;
  else if (perRunSection > 16) tInsMm = 1.2;
  else if (perRunSection > 6) tInsMm = 1.0;

  // Diameter over insulation D_i (mm):
  const diMm = Number((dcMm + 2.0 * tInsMm).toFixed(2));

  // Operating line capacitance C (uF/km) per IEC 60287-1-1 Eq. (2.2):
  // C = epsilon_r / (18 * ln(D_i / d_c))  [uF/km]  (using 1/(18) ≈ 0.0556)
  // Coaxial geometry boundary conditions & assumptions:
  // - Models radial electrostatic field across insulation layer between conductor outer radius (r_c = d_c / 2)
  //   and a grounded coaxial metallic shield, copper tape screen (CTS), or conductive sheath/earth return path at (r_i = D_i / 2).
  // - This represents the rigorous working operating capacitance for screened single-core cables (or armored MV/LV cables).
  // - For standard 6 mm² EN 50618 PV DC string cables (d_c = 2.95 mm, t_ins = 0.8 mm, D_i = 4.55 mm):
  //   XLPE (epsilon_r = 2.4) yields exactly 0.308 uF/km; PVC (epsilon_r = 5.0) yields exactly 0.642 uF/km.
  // - Engineering limitation note: Standard PV solar cables (EN 50618 / IEC 62930) are typically unshielded;
  //   actual capacitance depends on conduit/tray laying geometry, earthing proximity, and manufacturer construction datasheets.
  //   Insulation thickness uses nominal low-voltage cross-section ladders and does not substitute certified factory testing.
  const lnDiOverDc = Math.log(diMm / dcMm);
  const lineCapacitanceUfPerKm = Number(((0.0556 * epsilonR) / Math.max(0.1, lnDiOverDc)).toFixed(3));
  const totalCapacitanceUf = Number(((lineCapacitanceUfPerKm * config.oneWayLengthM * parallelRuns) / 1000.0).toFixed(4));
  const vPhase = config.isThreePhase ? config.nominalVoltageVolts / Math.sqrt(3) : config.nominalVoltageVolts;
  // Steady-state 50Hz reactive charging current applies only to AC circuits (zero for pure DC):
  const chargingCurrentAmps = config.isDc
    ? 0.0
    : Number((2.0 * Math.PI * 50.0 * (totalCapacitanceUf * 1e-6) * vPhase).toFixed(4));

  const capacitanceModelNote =
    'Idealized coaxial screened geometry per IEC 60287-1-1 Eq. 2.2; actual capacitance of unshielded/multicore cables depends on laying geometry and manufacturer datasheets.';

  // Full compliance requires voltage drop, thermal ampacity, AND short-circuit withstand:
  const isCompliant = isDropCompliant && isAmpacityCompliant && isShortCircuitCompliant;

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
    const errorReasonsFa: string[] = [];
    const errorReasonsEn: string[] = [];

    if (!isDropCompliant) {
      errorReasonsFa.push(`افت ولتاژ (${actualDropPct}٪) بیش از حد مجاز (${config.allowableDropPct}٪) است.`);
      errorReasonsEn.push(`Voltage drop (${actualDropPct}%) exceeds threshold (${config.allowableDropPct}%).`);
    }
    if (!isAmpacityCompliant) {
      errorReasonsFa.push(`جریان مجاز پیوسته (${totalDeratedAmp}A با ضریب حرارتی kt=${kt} و روش نصب kg=${kg}) کمتر از جریان طراحی (${config.designCurrentAmps}A) است.`);
      errorReasonsEn.push(`De-rated ampacity (${totalDeratedAmp}A with kt=${kt}, kg=${kg}) is below design current (${config.designCurrentAmps}A).`);
    }
    if (!isShortCircuitCompliant) {
      errorReasonsFa.push(`سطح مقطع کل (${totalEffectiveCrossSection}mm²) کمتر از حداقل تحمل اتصال کوتاه آدیاباتیک (${shortCircuitWithstandMinMm2}mm² برای Isc=${config.expectedIscKa ?? 10}kA در زمان ${faultDurationSec}s) است.`);
      errorReasonsEn.push(`Cross-section (${totalEffectiveCrossSection}mm²) is below short-circuit withstand minimum (${shortCircuitWithstandMinMm2}mm² for ${config.expectedIscKa ?? 10}kA at ${faultDurationSec}s).`);
    }

    troubleshootingGuideFa = `نحوه رفع خطا: ${errorReasonsFa.join(' ')} راهکار: ۱) افزایش تعداد کابل موازی به ${parallelRuns + 1} رشته، ۲) افزایش سایز کابل به سطح مقطع بالاتر، یا ۳) تغییر جنس کابل به مس با هدایت الکتریکی بالاتر.`;
    troubleshootingGuideEn = `Troubleshooting Guide: ${errorReasonsEn.join(' ')} Resolution: 1) Increase parallel runs to ${parallelRuns + 1}, 2) Select larger cross-section, or 3) Switch conductor to Copper.`;
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
    thermalAmpacityPerRunAmps: singleDeratedAmp,
    totalThermalAmpacityAmps: totalDeratedAmp,
    temperatureDeratingFactorKt: kt,
    groupingDeratingFactorKg: kg,
    shortCircuitWithstandMinMm2,
    powerLossWatts,
    powerLossPct,
    isAmpacityCompliant,
    isShortCircuitCompliant,
    lineCapacitanceUfPerKm,
    totalCapacitanceUf,
    chargingCurrentAmps,
    capacitanceModelNote,
    troubleshootingGuideFa,
    troubleshootingGuideEn,
  };
}

/**
 * Calculates complete Earthing (IEEE 80-2013 / IEC 60364-5-54)
 * Uses IEEE 80 Sverak composite grid-rod equation and verifies Touch/Step potential limits.
 */
export function calculateEarthingSystem(
  systemCapacityKw: number,
  soilResistivityOhmM: number = 100, // standard soil in Iran: 50-200 Ω·m
  upstreamSystem: UpstreamGroundingSystem = 'solidly_grounded',
  isUtilityPowerplant: boolean = false,
  applyBentoniteEnhancement: boolean = false
): EarthingAnalysisResult {
  const rho = Math.max(10, soilResistivityOhmM || 100);
  const targetResistance = isUtilityPowerplant ? 1.0 : 4.0; // IEEE 80 requires <= 1.0 ohm for utility substations, <= 4-5 ohms for solar arrays

  // Ground Rod: standard 3m length, 16mm diameter (0.016m)
  const rodLengthM = 3.0;
  const rodRadiusM = 0.008;

  // Single rod resistance formula (Dwight formula):
  const singleRodResistance = (rho / (2.0 * Math.PI * rodLengthM)) * (Math.log((4.0 * rodLengthM) / rodRadiusM) - 1.0);

  // Mesh & Rod grouping factor (Sunde equation approximation)
  const estimatedRods = Math.max(
    isUtilityPowerplant ? 12 : 2,
    Math.ceil((singleRodResistance / targetResistance) * 0.7)
  );

  const buriedConductorLength = isUtilityPowerplant
    ? Math.max(150, Math.sqrt(systemCapacityKw * 10) * 4) // Perimeter mesh of plant
    : 30; // 30m loop around building / array

  // Composite resistance using IEEE 80 Sverak formulation:
  // Rg = rho * [ 1/L_T + 1 / sqrt(20 * A) * (1 + 1 / (1 + h * sqrt(20/A))) ]
  const areaM2 = (buriedConductorLength / 4.0) ** 2;
  const hDepthM = 0.8;
  const totalLength = buriedConductorLength + estimatedRods * rodLengthM;
  const sverakTerm = (1.0 / Math.sqrt(20.0 * areaM2)) * (1.0 + 1.0 / (1.0 + hDepthM * Math.sqrt(20.0 / areaM2)));
  const calculatedRgBase = rho * (1.0 / totalLength + sverakTerm);
  const calculatedRg = Number(calculatedRgBase.toFixed(2));

  // Bentonite / Earth Enhancement Material (GEM / LOM) calculation:
  // Lowers local ground contact resistance by ~45% in high resistivity soils (rho > 150)
  const bentoniteEnhancedResistance = Number((calculatedRg * 0.55).toFixed(2));
  const effectiveRg = applyBentoniteEnhancement ? bentoniteEnhancedResistance : calculatedRg;

  // Conductor cross-section based on adiabatic fault current equation:
  // S = sqrt(I_sc^2 * t) / k (IEC 60364-5-54)
  const buriedConductorMm2 = isUtilityPowerplant ? 95.0 : 35.0; // 95 mm² bare copper tape for powerplant
  const equipmentBondingMm2 = isUtilityPowerplant ? 25.0 : 16.0;
  const inverterGroundingMm2 = isUtilityPowerplant ? 70.0 : 25.0;
  const batteryRackBondingMm2 = 35.0;

  // IEEE 80 Tolerable Touch & Step Voltages (50kg body, crushed rock layer rho_s = 3000 ohm-m, fault t_f = 0.2s)
  const hs = 0.10; // 10cm crushed rock layer
  const cs = 1.0 - (0.09 * (1.0 - rho / 3000.0)) / (2.0 * hs + 0.09);
  const tolerableTouch = Math.round((1000.0 + 1.5 * cs * 3000.0) * (0.116 / Math.sqrt(0.2)));
  const tolerableStep = Math.round((1000.0 + 6.0 * cs * 3000.0) * (0.116 / Math.sqrt(0.2)));

  // Actual Mesh and Step Voltages under ground fault current:
  // Fault current: Solidly grounded ~5 kA, Impedance grounded ~0.4 kA, IT ~0.05 kA
  const ifaultKa = upstreamSystem === 'solidly_grounded' ? (isUtilityPowerplant ? 6.0 : 2.5) : upstreamSystem === 'impedance_grounded' ? 0.4 : 0.05;
  const km = 0.65; // mesh geometric factor
  const ki = 1.25; // irregularity factor
  const actualMeshVoltageVolts = Math.round((rho * ifaultKa * 1000.0 * km * ki) / (totalLength * 1.5));
  const actualStepVoltageVolts = Math.round((rho * ifaultKa * 1000.0 * 0.35 * ki) / (totalLength * 1.2));

  // Maximum touch & step voltage limits according to standard regulatory thresholds (IEEE 80 / IEC 60364-4-41)
  let maxTouch = tolerableTouch;
  let maxStep = tolerableStep;
  if (upstreamSystem === 'impedance_grounded') {
    maxTouch = Math.min(tolerableTouch, 120.0);
    maxStep = Math.min(tolerableStep, 400.0);
  } else if (upstreamSystem === 'isolated_it') {
    maxTouch = Math.min(tolerableTouch, 50.0);
    maxStep = Math.min(tolerableStep, 200.0);
  }

  // Safety compliance flags must verify actual potential against governing limit (maxTouch / maxStep)
  const isTouchVoltageSafe = actualMeshVoltageVolts <= maxTouch;
  const isStepVoltageSafe = actualStepVoltageVolts <= maxStep;

  const earthingExecutionStepsFa = [
    '۱. حفر رینگ ارت پیرامونی: حفر کانال به عمق حداقل ۸۰ سانتی‌متر دور تا دور محوطه آرایه‌ها و پست برق.',
    `۲. کوبش الکترودهای میله‌ای: کوبیدن ${estimatedRods} عدد راد ارت مسی ۳ متری با فاصله حداقل ۶ متر از یکدیگر (دو برابر طول راد) جهت جلوگیری از تداخل حوزه‌های پتانسیل.`,
    '۳. اتصالات جوش احتراقی (کدولد): اتصال کلیه سر میله‌ها به تسمه/سیم لخت مسی با جوش کدولد (Cadweld) گرافیتی استاندارد جهت جلوگیری از خوردگی گالوانیک.',
    '۴. هم‌بندی سازه‌ها و پنل‌ها: نصب گیره‌های ارت دندانه‌دار (Grounding Clips) در زیر فریم هر ماژول خورشیدی و هم‌بندی پایه‌های استراکچر با کابل مسی ۱۶ میلی‌متر مربع.',
    '۵. حوضچه ارت و شینه اصلی اتصال زمین (MET): تعبیه دریچه بازدید تست ارت مجهز به شینه شمش مسی و پیت ارت در ورودی پست و اتاق اینورتر.',
    `۶. هماهنگی با شبکه بالادست (${upstreamSystem === 'solidly_grounded' ? 'زمین مستقیم TN-S' : upstreamSystem === 'impedance_grounded' ? 'مقاومت زمین NGR' : 'ایزوله IT'}): اتصال نقطه نوترال به رله‌های خطای زمین 50N/51N و تنظیم زمان قطع زیر ۰.۲ ثانیه.`,
    ...(rho > 150
      ? ['۷. بهسازی خاک با بنتونیت/مواد کاهنده LOM: در خاک‌های خشک و با مقاومت بالا، تزریق دوغاب بنتونیت اکتیو در اطراف میله‌ها مقاومت زمین را تا ۴۵٪ کاهش می‌دهد.']
      : []),
  ];

  const earthingExecutionStepsEn = [
    '1. Perimeter Ground Ring: Excavate an 80cm deep trench around the array boundary and substation perimeter.',
    `2. Copper-Bonded Ground Rods: Drive ${estimatedRods} x 3m rods spaced at least 6m apart to prevent sphere-of-influence overlap.`,
    '3. Exothermic Cadweld Connections: Connect rods to buried copper conductor using molecular exothermic welding.',
    '4. Module Frame & Structure Bonding: Install certified serrated grounding clips on all module frames and 16 mm² bonding jumpers on all steel tables.',
    '5. Earth Test Wells & Main Earthing Terminal (MET): Install inspectable earth pits with test disconnect links at the substation and inverter skids.',
    `6. Upstream Grid Coordination (${upstreamSystem}): Coordinate with upstream utility protection relays (50N/51N) for clearance under 0.2s.`,
    ...(rho > 150
      ? ['7. Soil Enhancement Material: In high-resistivity arid soils, bentonite/GEM slurry reduces earth resistance by ~45%.']
      : []),
  ];

  return {
    soilResistivityOhmM: rho,
    targetGroundResistanceOhms: targetResistance,
    calculatedGroundResistanceOhms: effectiveRg,
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
    tolerableTouchVoltageVolts: tolerableTouch,
    tolerableStepVoltageVolts: tolerableStep,
    actualMeshVoltageVolts,
    actualStepVoltageVolts,
    isTouchVoltageSafe,
    isStepVoltageSafe,
    isResistanceCompliant: effectiveRg <= targetResistance,
    isEarthingSafe: effectiveRg <= targetResistance && isTouchVoltageSafe && isStepVoltageSafe,
    isPreliminaryEstimate: true,
    disclaimerFa:
      'توجه: محاسبات مقاومت زمین و ولتاژهای تماس و گام صرفاً ارزیابی اولیه غربالگری بر پایه مدل خاک یکنواخت و حدود فرضی پیش‌فرض (مانند سقف فرضی ولتاژ تماس ۱۲۰ ولت برای سیستم زمین‌شده از طریق امپدانس یا ۵۰ ولت برای IT) است. این حدود فرضی برای کلیه حوزه‌ها الزام‌آور نبوده و حد واقعی به زمان قطع حفاظت، رطوبت محیط و مقررات محلی وابسته است. طراحی اجرایی IEEE 80 نیازمند اندازه‌گیری مقاومت ویژه خاک با روش ۴ نقطه‌ای ونر و مدل‌سازی تفصیلی شبکه مش است.',
    disclaimerEn:
      'Notice: Ground resistance and touch/step potential verifications are preliminary screening estimates using uniform soil assumptions and indicative default regulatory ceilings (e.g. 120V touch voltage limit for impedance-grounded systems, 50V for IT). Actual limits depend on fault duration, environmental wetness, and local utility interconnection codes. Definitive IEEE 80 compliance requires Wenner 4-pin soil testing and site-specific grid modeling.',
    bentoniteEnhancedResistanceOhms: bentoniteEnhancedResistance,
    bentoniteApplied: applyBentoniteEnhancement,
    earthingExecutionStepsFa,
    earthingExecutionStepsEn,
  };
}

/**
 * Calculates Lightning Protection System (IEC 62305 & IEC 62548)
 * Performs IEC 62305-2 risk assessment and computes safe separation distance 's' (IEC 62305-3).
 */
export function calculateLightningProtection(
  systemCapacityKw: number,
  isUtilityPowerplant: boolean = false,
  keraunicDaysPerYear: number = 20 // Standard in Iran (15-25 thunderstorm days/yr)
): LightningProtectionResult {
  // 1. IEC 62305-2 Collection Area & Strike Risk
  // Flash density Ng = 0.1 * Td (flashes/km²/year)
  const ng = 0.1 * Math.max(5, keraunicDaysPerYear);
  // Estimate physical dimensions based on capacity (approx 1.5 ha per MW)
  const lengthM = isUtilityPowerplant ? Math.round(Math.sqrt(systemCapacityKw * 10) * 1.5) : 30;
  const widthM = isUtilityPowerplant ? Math.round(Math.sqrt(systemCapacityKw * 10) * 0.8) : 15;
  const heightM = isUtilityPowerplant ? 6.0 : 3.5;

  // Collection area Ad = L*W + 6H(L+W) + 9*PI*H²
  const collectionAreaM2 = Math.round(
    lengthM * widthM + 6.0 * heightM * (lengthM + widthM) + 9.0 * Math.PI * Math.pow(heightM, 2)
  );

  // Expected direct strikes per year: Nd = Ng * Ad * Cd * 10^-6 (Cd = 1.0 open terrain)
  const annualExpectedStrikesNd = Number((ng * collectionAreaM2 * 1e-6).toFixed(4));
  // Tolerable strike rate Nc (IEC 62305-2): typically 0.001 to 0.0015
  const tolerableStrikesNc = 0.0012;
  const requiredEfficiency = Math.max(0, 1.0 - tolerableStrikesNc / Math.max(0.0001, annualExpectedStrikesNd));
  const requiredEfficiencyPct = Number((requiredEfficiency * 100.0).toFixed(1));

  // Determine LPS Class from required efficiency per IEC 62305-1 Table 5 / IEC 62305-2:
  // Class I: E > 0.98 (r = 20m)
  // Class II: 0.95 < E <= 0.98 or baseline for utility-scale power plant (r = 30m)
  // Class III: 0.80 < E <= 0.95 (r = 45m)
  // Class IV: E <= 0.80 (r = 60m)
  let lpsClass: 'Class I' | 'Class II' | 'Class III' | 'Class IV' = 'Class III';
  let rollingSphereRadiusM = 45.0;
  let protectionAngleDeg = 35;
  let kiSeparation = 0.04;

  if (requiredEfficiency > 0.98) {
    lpsClass = 'Class I';
    rollingSphereRadiusM = 20.0;
    protectionAngleDeg = 55;
    kiSeparation = 0.08;
  } else if (requiredEfficiency > 0.95 || isUtilityPowerplant) {
    lpsClass = 'Class II';
    rollingSphereRadiusM = 30.0;
    protectionAngleDeg = 45;
    kiSeparation = 0.06;
  } else if (requiredEfficiency > 0.80) {
    lpsClass = 'Class III';
    rollingSphereRadiusM = 45.0;
    protectionAngleDeg = 35;
    kiSeparation = 0.04;
  } else {
    lpsClass = 'Class IV';
    rollingSphereRadiusM = 60.0;
    protectionAngleDeg = 25;
    kiSeparation = 0.04;
  }

  // 2. Safe Separation Distance Calculation (IEC 62305-3 Section 6.3)
  // s = ki * (kc / km) * l
  // kc = 1 / (2 * downConductorsCount) (partition factor)
  // km = 1.0 (air insulation)
  // l = length along down conductor (mast height + vertical path)
  const airTerminalsCount = isUtilityPowerplant
    ? Math.max(4, Math.ceil(systemCapacityKw / 2500) * 2)
    : 1;
  const downConductorsCount = airTerminalsCount * 2;
  const downConductorCrossSectionMm2 = 50.0;

  const kc = Math.max(0.25, 1.0 / downConductorsCount);
  const separationPathLengthM = heightM + 2.0;
  const separationDistanceM = kiSeparation * (kc / 1.0) * separationPathLengthM;
  const separationDistanceCm = Number((separationDistanceM * 100.0).toFixed(1));

  const installationGuidelinesFa = [
    `۱. صاعقه‌گیرهای میله‌ای فرانکلین یا الکترونیکی ESE با شعاع حفاظتی بر اساس گوی غلتان ${rollingSphereRadiusM} متر (کلاس ${lpsClass}).`,
    `۲. حداقل فاصله جداسازی ایمن (Separation Distance - s) به میزان ${separationDistanceCm} سانتی‌متر بین هادی نزولی صاعقه و کابل‌های DC/AC سولار جهت جلوگیری از ایجاد جرقه جانبی (Side Flash).`,
    '۳. نصب حداقل ۲ هادی نزولی (Down Conductor) مسی ۵۰ میلی‌متر مربع برای هر دکل صاعقه‌گیر در دو مسیر مجزا به سمت چاه ارت صاعقه.',
    '۴. نصب سرج ارستر صاعقه‌گیر ترکیبی Type 1+2 DC در ورودی اینورتر با تحمل جریان ضربه‌ای Iimp حداقل 12.5kA و In=20kA.',
    '۵. نصب سرج ارستر AC کلاس Type 1+2 در تابلوی توزیع جهت مهار موج اضافه ولتاژ صاعقه القایی شبکه.',
    '۶. در سقف‌های سوله صنعتی فلزی با ضخامت ورق بالای ۰.۵ میلی‌متر، استفاده از ورق به عنوان پایانه صاعقه طبیعی طبق پیوست D استاندارد IEC 62305-3 مجاز است.',
  ];

  return {
    lpsClass,
    rollingSphereRadiusM,
    protectionAngleDeg,
    airTerminalsCount,
    airTerminalHeightM: heightM,
    downConductorsCount,
    downConductorCrossSectionMm2,
    dcSpdSpec: 'Type 1+2 DC SPD (1500V DC, Iimp: 12.5 kA, In: 20 kA, Up < 3.8 kV)',
    acSpdSpec: 'Type 1+2 AC SPD (400V/800V AC, Iimp: 12.5 kA, In: 20 kA)',
    mvArresterSpec: 'Station Class Heavy-Duty MV Metal-Oxide Surge Arrester (24kV / 10kA Class 1)',
    lightningRiskLevelFa: isUtilityPowerplant
      ? `بالا - نیازمند کلاس ${lpsClass} (نرخ برخورد سالانه: ${annualExpectedStrikesNd} برخورد/سال)`
      : `متوسط - کلاس ${lpsClass} (نرخ برخورد: ${annualExpectedStrikesNd} برخورد/سال)`,
    isPreliminaryAssessment: true,
    notesFa: [
      'ارزیابی اولیه ریسک صاعقه بر مبنای مساحت معادل و شاخص کرانیک منطقه؛ طراحی تفصیلی نهایی نیازمند ارزیابی جامع ریسک R1-R4 طبق IEC 62305-2 است.',
    ],
    notesEn: [
      'Preliminary lightning risk assessment based on collection area and regional keraunic days; full EPC engineering requires formal IEC 62305-2 R1-R4 risk assessment.',
    ],
    collectionAreaM2,
    annualExpectedStrikesNd,
    tolerableStrikesNc,
    requiredEfficiencyPct,
    separationDistanceCm,
    installationGuidelinesFa,
  };
}
