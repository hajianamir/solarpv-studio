import {validateCableInputs, hasCableImpedanceEvidence} from '../contracts/cableAssessment';
import {candidateVoltageDropVolts} from './core/cableVoltageDrop';
// Preliminary cable, grounding and lightning screening calculations.
// Standards references below identify the model's intended context only: current edition,
// jurisdiction, manufacturer data and project inputs are not independently verified here.
// Outputs are not a standards-conformity determination or a substitute for qualified design review.
// The simplified cable model checks voltage-drop, thermal-ampacity and adiabatic withstand proxies.
// 4. Joule thermal power loss & efficiency verification

export type ConductorMaterial = 'copper' | 'aluminum';
export type InsulationType = 'xlpe' | 'pvc';
export type UpstreamGroundingSystem = 'solidly_grounded' | 'impedance_grounded' | 'isolated_it';
export type InstallationMethod = 'cable_tray' | 'in_conduit' | 'direct_buried';
export type MotorStartingMethod = 'not_applicable' | 'direct_on_line' | 'star_delta' | 'soft_starter' | 'vfd';

/** User-authored, persisted design inputs for one physical feeder. Undefined means unknown, never inferred. */
export interface CableFeederInputs {
  oneWayLengthM?: number;
  designCurrentAmps?: number;
  nominalVoltageVolts?: number;
  conductorMaterial?: ConductorMaterial;
  insulationType?: InsulationType;
  allowableDropPct?: number;
  isDc?: boolean;
  isThreePhase?: boolean;
  /** Explicit equivalent-circuit AC reactance, including mutual coupling, at design frequency. */
  equivalentReactanceOhmPerM?: number;
  parallelArrangement?: 'equal_length_equal_sharing';
  impedanceSource?: string;
  powerFactor?: number;
  coincidenceFactor?: number;
  ambientTempC?: number;
  installationMethod?: InstallationMethod;
  groupedCircuitsCount?: number;
  protectiveDeviceRatingAmps?: number;
  protectiveDeviceBreakingCapacityKa?: number;
  protectiveDeviceReference?: string;
  expectedIscKa?: number;
  faultClearingTimeSec?: number;
  motorStartingMethod?: MotorStartingMethod;
  motorStartingMultiplier?: number;
}
export type CableFeederInputMap = Record<string, CableFeederInputs>;

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
  expectedIscKa?: number;           // Legacy calculation fallback only; not sufficient for final assessment
  faultClearingTimeSec?: number;    // Legacy calculation fallback only; not sufficient for final assessment
  /** Explicit equivalent-circuit AC reactance, including mutual coupling, at design frequency. */
  equivalentReactanceOhmPerM?: number;
  parallelArrangement?: 'equal_length_equal_sharing';
  impedanceSource?: string;
  powerFactor?: number;
  groupedCircuitsCount?: number;
  protectiveDeviceRatingAmps?: number;
  protectiveDeviceBreakingCapacityKa?: number;
  protectiveDeviceReference?: string;
  coincidenceFactor?: number;
  motorStartingMethod?: MotorStartingMethod;
  motorStartingMultiplier?: number;
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
  /** Conservative conductor temperature used to convert 20°C nominal resistivity to operating resistance. */
  conductorResistanceTempC: number | null;
  conductorResistanceModelNote: string;
  /** Rounded display value; compliance uses the unrounded voltage-drop ratio. */
  actualVoltageDropPct: number;
  isVoltageDropCompliant: boolean;
  isCompliant: boolean;
  /** False means critical source inputs are missing; all numeric output fields are non-results. */
  isAssessed?: boolean;
  assessmentNote?: string;
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
  isProtectionCoordinationAssessed?: boolean;
  isProtectionCoordinationCompliant?: boolean;
  isMotorStartingAssessed?: boolean;
  motorStartingAssessmentNote?: string;
  /** User multiplier-based current estimate only; dynamic starting voltage drop is not assessed. */
  motorStartingCurrentAmps?: number | null;
  motorStartingVoltageDropPct?: number | null;
  // Cable electrical parameters (IEC 60287 / IEC 60502)
  lineCapacitanceUfPerKm: number;
  totalCapacitanceUf: number;
  chargingCurrentAmps: number;
  capacitanceModelNote: string;
  troubleshootingGuideFa?: string;
  troubleshootingGuideEn?: string;
}

export function createUnassessedCableRun(config: Pick<CableRunConfig, 'id' | 'sectionNameFa' | 'sectionNameEn' | 'oneWayLengthM' | 'conductorMaterial' | 'insulationType' | 'allowableDropPct' | 'isDc' | 'isThreePhase'>, assessmentNote: string): CableRunResult {
  // Numeric zeroes below are transport placeholders only. `isAssessed: false` is
  // mandatory and consumers must suppress them; this object is never a pass.
  return {
    config: { ...config, designCurrentAmps: 0, nominalVoltageVolts: 0 },
    calculatedTheoreticalCrossSectionMm2: 0, selectedStandardSingleCrossSectionMm2: 0,
    parallelRunsCount: 0, perRunCrossSectionMm2: 0, totalEffectiveCrossSectionMm2: 0,
    cableDesignationFa: 'بررسی نشده', cableDesignationEn: 'Not assessed',
    actualVoltageDropVolts: 0, conductorResistanceTempC: null,
    conductorResistanceModelNote: 'Not assessed: required cable inputs are incomplete.',
    actualVoltageDropPct: 0, isVoltageDropCompliant: false, isCompliant: false,
    isAssessed: false, assessmentNote,
    thermalAmpacityPerRunAmps: 0, totalThermalAmpacityAmps: 0,
    temperatureDeratingFactorKt: 0, groupingDeratingFactorKg: 0,
    shortCircuitWithstandMinMm2: 0, powerLossWatts: 0, powerLossPct: 0,
    isAmpacityCompliant: false, isShortCircuitCompliant: false,
    isProtectionCoordinationAssessed: false, isProtectionCoordinationCompliant: false,
    isMotorStartingAssessed: false, motorStartingAssessmentNote: assessmentNote,
    motorStartingCurrentAmps: null, motorStartingVoltageDropPct: null,
    lineCapacitanceUfPerKm: 0, totalCapacitanceUf: 0, chargingCurrentAmps: 0,
    capacitanceModelNote: 'Not calculated: required AC inputs are unknown or unconfirmed.',
  };
}

/** Compare raw voltage drop against its limit; formatting/rounding is display-only. */
export function isVoltageDropWithinLimit(actualDropVolts: number, nominalVoltageVolts: number, allowableDropPct: number): boolean {
  if (!Number.isFinite(actualDropVolts) || !Number.isFinite(nominalVoltageVolts) || nominalVoltageVolts <= 0
    || !Number.isFinite(allowableDropPct) || allowableDropPct < 0) return false;
  return (actualDropVolts / nominalVoltageVolts) * 100 <= allowableDropPct;
}

export type DcSystemEarthingType = 'floating' | 'functional_negative' | 'functional_positive';

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
  // Preliminary touch/step screening estimates only; no IEEE 80/site safety determination.
  tolerableTouchVoltageVolts: number;
  tolerableStepVoltageVolts: number;
  actualMeshVoltageVolts: number;
  actualStepVoltageVolts: number;
  isTouchVoltageSafe: null;
  isStepVoltageSafe: null;
  isResistanceCompliant: null;
  isEarthingSafe: null;
  touchVoltageScreenPassed: boolean;
  stepVoltageScreenPassed: boolean;
  resistanceScreenPassed: boolean;
  screeningPassed: boolean;
  isPreliminaryEstimate: true;
  disclaimerFa: string;
  disclaimerEn: string;
  bentoniteEnhancedResistanceOhms?: number;
  bentoniteApplied?: boolean;
  earthingExecutionStepsFa: string[];
  earthingExecutionStepsEn: string[];

  // Section B: Protective equipotential bonding & DC earthing architecture
  pvFrameStructureBondingMm2: number;
  pvFrameStructureBondingBasisFa: string;
  pvFrameStructureBondingBasisEn: string;
  batteryRackBondingBasisFa: string;
  batteryRackBondingBasisEn: string;
  inverterEnclosureBondingMm2: number;
  inverterEnclosureBondingBasisFa: string;
  inverterEnclosureBondingBasisEn: string;
  dcSystemEarthing: DcSystemEarthingType;
  requiresInsulationMonitoring: boolean;
  requiresGfdiRcu: boolean;
}

export interface LightningProtectionResult {
  lpsClass: 'Class I' | 'Class II' | 'Class III' | 'Class IV';
  rollingSphereRadiusM: number;
  protectionAngleDeg: number | null;
  assessmentStatus: 'unassessed';
  /** Historical diagnostics only, never approved installation values. */
  legacyGeometryDiagnostics: {protectionAngleDeg: number; separationDistanceCm: number};
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
  separationDistanceCm: number | null;
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
  validateCableInputs(config);
  // 1. Conductor resistance: nominal conductivity is referenced to 20°C.
  // In the absence of manufacturer resistance data or a verified operating temperature,
  // use the insulation-class maximum as a conservative thermal design temperature.
  const gamma20 = config.conductorMaterial === 'copper' ? 56.0 : 35.0;
  const alphaPerC = config.conductorMaterial === 'copper' ? 0.00393 : 0.00403;
  const ambientTempC = config.ambientTempC ?? 40.0;
  const maxOperatingTemp = config.insulationType === 'xlpe' ? 90.0 : 70.0;
  const conductorResistanceTempC = maxOperatingTemp;
  const resistanceTemperatureFactor = 1.0 + alphaPerC * (conductorResistanceTempC - 20.0);
  const effectiveGamma = gamma20 / resistanceTemperatureFactor;
  const conductorResistanceModelNote =
    `Resistance uses 20°C nominal conductivity corrected to ${conductorResistanceTempC}°C (maximum ${config.insulationType.toUpperCase()} conductor temperature) as a conservative screening assumption; verify manufacturer AC resistance and actual design conductor temperature.`;

  // Ampacity derating factors (IEC 60364-5-52 Table B.52.14)
  // kt = sqrt((T_max - T_amb) / (T_max - 30))
  const kt = Number(
    Math.min(1.0, Math.max(0.60, Math.sqrt((maxOperatingTemp - ambientTempC) / (maxOperatingTemp - 30.0)))).toFixed(3)
  );

  // Grouping factor kg: installation method and multi-circuit derating (IEC 60364-5-52 Table B.52.17)
  const installMethod = config.installationMethod ?? 'cable_tray';
  const installBase = installMethod === 'direct_buried' ? 0.70 : installMethod === 'in_conduit' ? 0.75 : 0.82;
  const groupedCount = Math.max(1, Math.floor(config.groupedCircuitsCount ?? 1));
  const groupCountFactor = groupedCount <= 1 ? 1 : groupedCount === 2 ? 0.80 : groupedCount === 3 ? 0.70 : groupedCount === 4 ? 0.65 : groupedCount === 5 ? 0.60 : 0.57;
  const kg = Number((installBase * groupCountFactor).toFixed(3));

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
    const cosPhi = config.powerFactor ?? 0.95;
    // Include AC reactance component (X_L ≈ 0.08 Ω/km = 0.00008 Ω/m)
    const sinPhi = Math.sqrt(1.0 - cosPhi * cosPhi);
    const reactiveDropVolts = Math.sqrt(3) * config.oneWayLengthM * config.designCurrentAmps * 0.00008 * sinPhi;
    const netAllowableResistiveDrop = Math.max(0.2, allowableDropVolts - reactiveDropVolts);

    calculatedTheoreticalMm2 =
      (Math.sqrt(3) * config.oneWayLengthM * config.designCurrentAmps * cosPhi) /
      (effectiveGamma * netAllowableResistiveDrop);
  } else {
    const cosPhi = config.powerFactor ?? 0.95;
    const sinPhi = Math.sqrt(1.0 - cosPhi * cosPhi);
    const reactiveDropVolts = 2 * config.oneWayLengthM * config.designCurrentAmps * 0.00008 * sinPhi;
    const netAllowableResistiveDrop = Math.max(0.2, allowableDropVolts - reactiveDropVolts);
    calculatedTheoreticalMm2 = (2.0 * config.oneWayLengthM * config.designCurrentAmps * cosPhi) / (effectiveGamma * netAllowableResistiveDrop);
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
  let searchExhausted = false;
  const dropForCandidate = (section: number, runs: number) => candidateVoltageDropVolts(config, effectiveGamma, section, runs);
  const checkDrop = (section: number, runs: number) => isVoltageDropWithinLimit(dropForCandidate(section, runs), config.nominalVoltageVolts, config.allowableDropPct);

  // Find minimum standard size that satisfies voltage drop, ampacity, and short-circuit
  for (const candidate of STANDARD_CABLE_SECTIONS_MM2) {
    if (
      checkDrop(candidate, parallelRuns) &&
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
    !checkDrop(perRunSection, parallelRuns) ||
    !checkAmpacity(perRunSection, parallelRuns) ||
    !checkShortCircuit(perRunSection, parallelRuns)
  ) {
    let foundMultiRun = false;
    for (let runs = 2; runs <= 6; runs++) {
      const matched = STANDARD_CABLE_SECTIONS_MM2.find(
        (s) =>
          checkDrop(s, runs) &&
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
      searchExhausted = true;
      parallelRuns = Math.max(
        parallelRuns,
        Math.ceil(minRequiredTotalMm2 / MAX_PRACTICAL_SINGLE_CABLE_MM2)
      );
      perRunSection = MAX_PRACTICAL_SINGLE_CABLE_MM2;
    }
  }

  const totalEffectiveCrossSection = parallelRuns * perRunSection;

  // Same evaluator as candidate selection; preliminary algebra is diagnostic only.
  const actualDropVolts = dropForCandidate(perRunSection, parallelRuns);

  const actualDropPctUnrounded = (actualDropVolts / config.nominalVoltageVolts) * 100.0;
  const actualDropPct = Number(actualDropPctUnrounded.toFixed(2));
  const isDropCompliant = isVoltageDropWithinLimit(actualDropVolts, config.nominalVoltageVolts, config.allowableDropPct);

  // 6. Ampacity & Short-Circuit Verification
  const singleBaseAmp = getBaseAmpacity(perRunSection, config.conductorMaterial, config.insulationType);
  const singleDeratedAmp = Number((singleBaseAmp * kt * kg).toFixed(1));
  const totalDeratedAmp = Number((singleDeratedAmp * parallelRuns).toFixed(1));
  const isAmpacityCompliant = totalDeratedAmp >= config.designCurrentAmps;
  // Rigorous IEC 60364-5-54 k²S² >= I²t without arbitrary discount factors:
  const isShortCircuitCompliant = totalEffectiveCrossSection >= shortCircuitWithstandMinMm2;
  const isProtectionCoordinationAssessed = Boolean(
    config.protectiveDeviceRatingAmps && config.protectiveDeviceBreakingCapacityKa
    && config.protectiveDeviceReference?.trim() && config.expectedIscKa && config.faultClearingTimeSec
  );
  const isProtectionCoordinationCompliant = isProtectionCoordinationAssessed
    && (config.protectiveDeviceRatingAmps as number) >= config.designCurrentAmps
    && (config.protectiveDeviceRatingAmps as number) <= totalDeratedAmp
    && (config.protectiveDeviceBreakingCapacityKa as number) >= (config.expectedIscKa as number);
  const motorStartingCurrentAmps = config.motorStartingMethod && config.motorStartingMethod !== 'not_applicable'
    && config.motorStartingMultiplier && config.motorStartingMultiplier >= 1
    ? config.designCurrentAmps * config.motorStartingMultiplier : null;
  // A current multiplier alone cannot determine dynamic voltage drop: starting PF,
  // source impedance, motor/drive behavior and an acceptance limit are not modeled.
  const isMotorStartingAssessed = config.isDc || config.motorStartingMethod === 'not_applicable';
  const motorStartingVoltageDropPct = null;
  const motorStartingAssessmentNote = isMotorStartingAssessed
    ? undefined
    : 'Motor starting voltage drop NOT ASSESSED: a current multiplier is only a current estimate; starting power factor, source impedance, motor/drive dynamic data and a project acceptance limit are required.';

  // 7. Joule Thermal Power Loss (P_loss = m * I² * R)
  const lineResistanceOhms = config.oneWayLengthM / (effectiveGamma * totalEffectiveCrossSection);
  const multiplier = config.isThreePhase ? 3.0 : 2.0;
  const powerLossWatts = Math.round(multiplier * Math.pow(config.designCurrentAmps, 2) * lineResistanceOhms);
  const powerFactor = config.powerFactor ?? 0.95;
  const totalTransferredPowerWatts = config.isDc
    ? config.nominalVoltageVolts * config.designCurrentAmps
    : config.isThreePhase
      ? Math.sqrt(3) * config.nominalVoltageVolts * config.designCurrentAmps * powerFactor
      : config.nominalVoltageVolts * config.designCurrentAmps * powerFactor;
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

  // A feeder pass also requires explicit protection data and, for AC circuits, an
  // explicit motor-start disposition. Active motor starting remains unassessed here.
  const isImpedanceAssessed = hasCableImpedanceEvidence(config);
  const isCompliant = !searchExhausted && isImpedanceAssessed && isDropCompliant && isAmpacityCompliant && isShortCircuitCompliant
    && isProtectionCoordinationAssessed && isProtectionCoordinationCompliant && isMotorStartingAssessed;
  const assessmentNotes = [
    searchExhausted ? 'Cable candidate search exhausted; returned dimensions are diagnostic only.' : '',
    !isImpedanceAssessed ? 'AC impedance UNASSESSED: declare equal-length/equal-sharing arrangement and sourced equivalent reactance (including coupling and design frequency). Default reactance is a legacy diagnostic only.' : '',
    !isDropCompliant || !isAmpacityCompliant || !isShortCircuitCompliant ? 'Candidate search did not satisfy all voltage-drop, ampacity and short-circuit constraints; no accepted cable selection.' : '',
    !isProtectionCoordinationAssessed
      ? 'Protection coordination is unassessed: explicit protective-device and verified fault data are required.'
      : '',
    motorStartingAssessmentNote ?? '',
  ].filter(Boolean);
  const isAssessed = assessmentNotes.length === 0;

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
    if (!isProtectionCoordinationAssessed) {
      errorReasonsFa.push('هماهنگی حفاظتی بررسی نشده: مشخصات کلید/فیوز و داده خطای معتبر ناقص است.');
      errorReasonsEn.push('Protection coordination is unassessed: protective-device specifications or verified fault data are missing.');
    } else if (!isProtectionCoordinationCompliant) {
      errorReasonsFa.push('مشخصات حفاظت با جریان طراحی، ظرفیت حرارتی کابل یا جریان اتصال کوتاه اعلام‌شده سازگار نیست.');
      errorReasonsEn.push('Protective-device rating/breaking capacity does not match the design current, cable ampacity or declared fault current.');
    }
    if (!isMotorStartingAssessed && motorStartingAssessmentNote) {
      errorReasonsFa.push('افت ولتاژ راه‌اندازی موتور بررسی نشده است؛ روش راه‌اندازی به‌تنهایی برای ارزیابی دینامیکی کافی نیست.');
      errorReasonsEn.push(motorStartingAssessmentNote);
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
    conductorResistanceTempC,
    conductorResistanceModelNote,
    actualVoltageDropPct: actualDropPct,
    isVoltageDropCompliant: isDropCompliant,
    isCompliant,
    isAssessed,
    assessmentNote: assessmentNotes.length ? assessmentNotes.join(' ') : undefined,
    isProtectionCoordinationAssessed,
    isProtectionCoordinationCompliant,
    isMotorStartingAssessed,
    motorStartingAssessmentNote,
    motorStartingCurrentAmps,
    motorStartingVoltageDropPct,
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
 * Produces a preliminary earthing estimate using simplified grid/rod formulas.
 * Internal touch/step comparisons are for screening only and do not establish IEEE 80 compliance or site safety.
 */
export function calculateEarthingSystem(
  systemCapacityKw: number,
  soilResistivityOhmM: number = 100, // generic default only; not a measured site value
  upstreamSystem: UpstreamGroundingSystem = 'solidly_grounded',
  isUtilityPowerplant: boolean = false,
  applyBentoniteEnhancement: boolean = false,
  dcSystemEarthing: DcSystemEarthingType = 'floating'
): EarthingAnalysisResult {
  const rho = Math.max(10, soilResistivityOhmM || 100);
  const targetResistance = isUtilityPowerplant ? 1.0 : 4.0; // Internal screening targets only; confirm project criteria with the utility/engineer

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

  // Conductor cross-section based on adiabatic fault current equation & standard minimum mechanical rules:
  // IEC 60364-5-54 & IEC 62548
  const buriedConductorMm2 = isUtilityPowerplant ? 95.0 : 35.0; // 95 mm² bare copper tape for powerplant

  // PV Module Frame & Metallic Structure Protective Bonding (IEC 62548 & IEC 60364-5-54):
  // Minimum mechanical cross-section without mechanical protection is 6 mm² Cu.
  // When exposed outdoors or coordinated with external lightning protection, 16 mm² Cu is required.
  // For utility-scale megawatt arrays, 25 mm² Cu is used for inter-table bonding.
  const pvFrameStructureBondingMm2 = isUtilityPowerplant ? 25.0 : (systemCapacityKw > 50 ? 16.0 : 6.0);
  const pvFrameStructureBondingBasisFa = isUtilityPowerplant
    ? 'استاندارد IEC 62548 و IEC 60364-5-54 (سایز ۲۵mm² مس جهت هم‌بندی پایه‌های سازه خورشیدی نیروگاهی)'
    : systemCapacityKw > 50
    ? 'استاندارد IEC 62548 و IEC 60364-5-54 (سایز ۱۶mm² مس برای استراکچر فضای باز و هماهنگی صاعقه‌گیر)'
    : 'استاندارد IEC 62548 و IEC 60364-5-54 (حداقل ۶mm² مس جهت حفاظت مکانیکی فریم و سازه)';
  const pvFrameStructureBondingBasisEn = isUtilityPowerplant
    ? 'IEC 62548 & IEC 60364-5-54 (25 mm² Cu for utility PV table structure bonding)'
    : systemCapacityKw > 50
    ? 'IEC 62548 & IEC 60364-5-54 (16 mm² Cu for outdoor structural bonding & LPS integration)'
    : 'IEC 62548 & IEC 60364-5-54 (Min 6 mm² Cu mechanical robustness for PV frames & racking)';

  // BESS Battery Rack & Enclosure Protective Bonding (IEC 60364-5-54 & IEC 62485-2 / IEC 62933):
  // Metal racks and battery cabinets must be bonded directly to the site Main Earthing Terminal (MET).
  // 16 mm² Cu minimum for stationary battery racks; 35 mm² Cu for utility/industrial containerized BESS.
  const batteryRackBondingConductorMm2 = isUtilityPowerplant || systemCapacityKw > 100 ? 35.0 : 16.0;
  const batteryRackBondingBasisFa = isUtilityPowerplant || systemCapacityKw > 100
    ? 'استاندارد IEC 60364-5-54 و IEC 62485-2 (کابل ۳۵mm² مس جهت هم‌بندی رک‌های کانتینر BESS صنعتی به MET)'
    : 'استاندارد IEC 60364-5-54 و IEC 62485-2 (کابل ۱۶mm² مس جهت هم‌بندی رک و کابینت فلزی باتری به MET)';
  const batteryRackBondingBasisEn = isUtilityPowerplant || systemCapacityKw > 100
    ? 'IEC 60364-5-54 & IEC 62485-2 (35 mm² Cu for utility/containerized BESS rack bonding to MET)'
    : 'IEC 60364-5-54 & IEC 62485-2 (16 mm² Cu for stationary battery enclosure bonding to MET)';

  // Inverter Enclosure Protective Bonding (IEC 60364-5-54):
  const inverterEnclosureBondingMm2 = isUtilityPowerplant ? 70.0 : (systemCapacityKw > 50 ? 25.0 : 16.0);
  const inverterGroundingMm2 = inverterEnclosureBondingMm2;
  const inverterEnclosureBondingBasisFa = isUtilityPowerplant
    ? 'استاندارد IEC 60364-5-54 (۷۰mm² مس برای بدنه اینورتر مرکزی نیروگاهی)'
    : systemCapacityKw > 50
    ? 'استاندارد IEC 60364-5-54 (۲۵mm² مس برای اینورتر استرینگ تجاری)'
    : 'استاندارد IEC 60364-5-54 (۱۶mm² مس برای اینورتر استرینگ توزیع)';
  const inverterEnclosureBondingBasisEn = isUtilityPowerplant
    ? 'IEC 60364-5-54 (70 mm² Cu for central utility inverter chassis)'
    : systemCapacityKw > 50
    ? 'IEC 60364-5-54 (25 mm² Cu for commercial string inverter)'
    : 'IEC 60364-5-54 (16 mm² Cu for standard string inverter chassis)';

  const equipmentBondingMm2 = pvFrameStructureBondingMm2;

  // DC System Earthing & Monitoring Architecture (IEC 62548 / IEC 62109-2 / IEC 61557-8):
  // Default is 'floating' (isolated IT DC circuit). Requires Insulation Monitoring Device (IMD).
  // Functional earthing is permitted ONLY upon manufacturer authorization and mandates automatic GFDI/RCMU.
  const requiresInsulationMonitoring = dcSystemEarthing === 'floating';
  const requiresGfdiRcu = dcSystemEarthing !== 'floating';

  // Illustrative internal touch/step thresholds; site-specific IEEE 80 limits are not determined by this model.
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

  // Internal illustrative screen caps; not a standards-limit or regulatory-conformity determination.
  let maxTouch = tolerableTouch;
  let maxStep = tolerableStep;
  if (upstreamSystem === 'impedance_grounded') {
    maxTouch = Math.min(tolerableTouch, 120.0);
    maxStep = Math.min(tolerableStep, 400.0);
  } else if (upstreamSystem === 'isolated_it') {
    maxTouch = Math.min(tolerableTouch, 50.0);
    maxStep = Math.min(tolerableStep, 200.0);
  }

  // Keep the model comparisons distinct from a real safety determination.
  const touchVoltageScreenPassed = actualMeshVoltageVolts <= maxTouch;
  const stepVoltageScreenPassed = actualStepVoltageVolts <= maxStep;
  const resistanceScreenPassed = effectiveRg <= targetResistance;
  const screeningPassed = resistanceScreenPassed && touchVoltageScreenPassed && stepVoltageScreenPassed;

  const earthingExecutionStepsFa = [
    '۱. اتصال فریم ماژول‌ها: نصب گیره‌های ارت دندانه‌دار یا لَگ استاندارد (Serrated Grounding Clips / Lugs) در زیر فریم تک‌تک ماژول‌های PV جهت سوراخ کردن لایه اکسید آلومینیوم و تضمین پیوستگی الکتریکی.',
    `۲. هم‌بندی حفاظتی استراکچر: اتصال پایه‌ها و استراکچر فلزی با هادی مسی ${pvFrameStructureBondingMm2} میلی‌متر مربع به شینه اصلی ارت (MET) و رینگ پیرامونی.`,
    `۳. هم‌بندی رک و کابینت باتری (BESS): اتصال شاسی و رک فلزی باتری‌ها با کابل مسی ${batteryRackBondingConductorMm2} میلی‌متر مربع به همان شینه اصلی ارت (MET) سیستم.`,
    '۴. طرح اتصال زمین DC: توپولوژی زمین‌کردن/شناور و هم‌بندی را با سازنده اینورتر، استاندارد نافذ و طراحی حفاظت ساختگاه تعیین کنید؛ الکترود جداگانه را بدون مطالعه فرض نکنید.',
    `۵. وضعیت قطب‌های DC و مانیتورینگ: ${
      dcSystemEarthing === 'floating'
        ? 'قطب‌های مثبت و منفی حامل جریان DC شناور (Floating) هستند و نباید زمین شوند. نصب دستگاه پایش پیوسته مقاومت عایقی (IMD طبق IEC 61557-8) الزامی است.'
        : `ارت عملکردی قطب DC (${dcSystemEarthing === 'functional_negative' ? 'منفی' : 'مثبت'}) تنها با الزام و تاییدیه سازنده اینورتر مجاز است؛ فعال‌سازی رله آشکارسازی و قطع خطای زمین (GFDI/RCMU طبق IEC 62109-2) الزامی می‌باشد.`
    }`,
    `۶. حفر کانال و کوبش الکترودها: حفر کانال به عمق حداقل ۸۰ سانتی‌متر و کوبیدن ${estimatedRods} عدد راد ارت مسی ۳ متری با فاصله حداقل ۶ متر جهت جلوگیری از تداخل حوزه‌های پتانسیل.`,
    '۷. جوش احتراقی کدولد (Cadweld): اتصال کلیه سر میله‌ها به تسمه/سیم لخت مسی با جوش احتراقی استاندارد جهت ممانعت از خوردگی گالوانیک.',
    '۸. حوضچه بازدید و شینه اصلی اتصال زمین (MET): تعبیه دریچه بازدید تست ارت مجهز به شینه شمش مسی و پیت ارت در ورودی پست و اتاق اینورتر.',
    `۹. هماهنگی با شبکه بالادست (${upstreamSystem === 'solidly_grounded' ? 'زمین مستقیم TN-S' : upstreamSystem === 'impedance_grounded' ? 'مقاومت زمین NGR' : 'ایزوله IT'}): تنظیم رله‌های 50N/51N باید از مطالعه هماهنگی حفاظت و الزام شرکت برق استخراج شود؛ زمان ۰.۲ ثانیه در این مدل فرضی است.`,
    ...(rho > 150
      ? ['۱۰. بهسازی خاک با بنتونیت/مواد کاهنده LOM: در خاک‌های خشک و با مقاومت بالا، تزریق دوغاب بنتونیت اکتیو در اطراف میله‌ها مقاومت زمین را تا ۴۵٪ کاهش می‌دهد.']
      : []),
  ];

  const earthingExecutionStepsEn = [
    '1. PV Module Frame Grounding: Install certified serrated grounding clips or lugs under each PV module frame to pierce anodization and ensure equipotential bonding.',
    `2. Metallic Structure Bonding: Bond all steel/aluminum mounting tables with ${pvFrameStructureBondingMm2} mm² copper conductor to the perimeter ground ring / MET.`,
    `3. BESS Battery Rack & Enclosure Bonding: Bond battery cabinets and metallic racks with ${batteryRackBondingConductorMm2} mm² copper conductor to the same Main Earthing Terminal (MET).`,
    '4. DC grounding topology: confirm the grounded/floating and bonding arrangement with the inverter manufacturer, adopted codes, and site protection design; do not assume a separate electrode is suitable.',
    `5. DC Current-Carrying Conductors & Monitoring: ${
      dcSystemEarthing === 'floating'
        ? 'Positive and negative DC poles are Floating (IT system). Continuous Insulation Monitoring Device (IMD per IEC 61557-8) is mandatory.'
        : `Functional DC earthing (${dcSystemEarthing === 'functional_negative' ? 'Negative' : 'Positive'} pole) is permitted only with manufacturer mandate; automatic GFDI/RCMU ground fault interruption (IEC 62109-2) is mandatory.`
    }`,
    `6. Perimeter Trench & Ground Rods: Excavate an 80cm deep trench and drive ${estimatedRods} x 3m copper rods spaced at least 6m apart to prevent sphere-of-influence overlap.`,
    '7. Exothermic Cadweld Connections: Connect all buried junctions using graphite-mold molecular exothermic welding to eliminate galvanic corrosion.',
    '8. Earth Test Wells & Main Earthing Terminal (MET): Install inspectable earth pits with test disconnect links at the substation and inverter skids.',
    `9. Upstream Grid Coordination (${upstreamSystem}): Set 50N/51N relays from the site-specific protection-coordination study and utility criteria; the model does not establish clearing time.`,
    ...(rho > 150
      ? ['10. Soil Enhancement Material: In high-resistivity arid soils, bentonite/GEM slurry reduces earth resistance by ~45%.']
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
    batteryRackBondingConductorMm2: batteryRackBondingConductorMm2,
    upstreamSystemType: upstreamSystem,
    maxTouchVoltageVolts: maxTouch,
    maxStepVoltageVolts: maxStep,
    tolerableTouchVoltageVolts: tolerableTouch,
    tolerableStepVoltageVolts: tolerableStep,
    actualMeshVoltageVolts,
    actualStepVoltageVolts,
    isTouchVoltageSafe: null,
    isStepVoltageSafe: null,
    isResistanceCompliant: null,
    isEarthingSafe: null,
    touchVoltageScreenPassed,
    stepVoltageScreenPassed,
    resistanceScreenPassed,
    screeningPassed,
    isPreliminaryEstimate: true,
    disclaimerFa:
      'توجه: این فقط غربالگری مقدماتی با مدل خاک یکنواخت، جریان خطا/زمان قطع فرضی و targetهای داخلی است؛ ایمنی محل یا انطباق IEEE 80/IEC 60364 ارزیابی نشده است. طراحی اجرایی به اندازه‌گیری خاک، هندسه و لایه‌بندی واقعی، مطالعه خطا و حفاظت، معیار شرکت برق و بازبینی مهندس ذی‌صلاح نیاز دارد.',
    disclaimerEn:
      'Notice: This is preliminary screening only, using uniform-soil and assumed fault/time inputs with internal targets; site safety and IEEE 80/IEC 60364 compliance are not evaluated. Final design requires measured soil, actual grid geometry and layering, a fault/protection study, utility criteria, and qualified engineering review.',
    bentoniteEnhancedResistanceOhms: bentoniteEnhancedResistance,
    bentoniteApplied: applyBentoniteEnhancement,
    earthingExecutionStepsFa,
    earthingExecutionStepsEn,
    pvFrameStructureBondingMm2,
    pvFrameStructureBondingBasisFa,
    pvFrameStructureBondingBasisEn,
    batteryRackBondingBasisFa,
    batteryRackBondingBasisEn,
    inverterEnclosureBondingMm2,
    inverterEnclosureBondingBasisFa,
    inverterEnclosureBondingBasisEn,
    dcSystemEarthing,
    requiresInsulationMonitoring,
    requiresGfdiRcu,
  };
}

/**
 * Legacy lightning screening diagnostics only, not an IEC risk assessment.
 * Angle/separation are unavailable without applicable height/topology evidence.
 * Historical diagnostics must not be used as installation guidance.
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
    'زاویه حفاظتی و فاصله جداسازی بررسی‌نشده‌اند: ارتفاع نسبت به صفحه مرجع، هندسه و توپولوژی هادی‌ها، ضرایب و ویرایش استاندارد باید مستند شوند. از اعداد تشخیصی قدیمی برای نصب استفاده نکنید.',
    'انتخاب کلاس، SPD و شعاع گوی غلتان در این خروجی فقط غربالگری است؛ ارزیابی ریسک و طراحی اختصاصی محل لازم است.',
  ];

  return {
    lpsClass,
    rollingSphereRadiusM,
    protectionAngleDeg: null,
    assessmentStatus: 'unassessed',
    legacyGeometryDiagnostics: {protectionAngleDeg, separationDistanceCm},
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
      'Protective angle and separation unavailable pending documented geometry/topology. Preliminary lightning risk assessment based on collection area and regional keraunic days; full EPC engineering requires formal IEC 62305-2 R1-R4 risk assessment.',
    ],
    collectionAreaM2,
    annualExpectedStrikesNd,
    tolerableStrikesNc,
    requiredEfficiencyPct,
    separationDistanceCm: null,
    installationGuidelinesEn: ['Protective angle and separation UNASSESSED: reference-plane height, conductor topology/current sharing, bonding, medium and applicable edition are not established. Do not use legacy geometry diagnostics for installation. Nominal rolling-sphere/class and SPD values remain screening assumptions, not a risk or conformity assessment.'],
    installationGuidelinesFa,
  };
}
