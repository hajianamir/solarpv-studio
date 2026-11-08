/**
 * Electrical Sizing, MPPT Hard-Blocking & Powerplant Fleet Contract (Phase 05 Remediation)
 *
 * Provides authoritative reference implementations and compatibility gates for:
 * 1. Residential & Commercial Inverter Right-Sizing (evaluateInverterRightSizing)
 * 2. Multi-Channel MPPT Hard-Blocking & Compliance (evaluateMpptCompatibility)
 * 3. Utility-Scale Powerplant Inverter Fleet Distribution & MV Bays (calculateFleetInverterDistribution)
 * 4. Usable BESS Storage with DoD, Round-Trip Efficiency & Temperature Derating (evaluateUsableBatteryStorage)
 * 5. STC MPP Calibrated Single-Diode Model Curve & Parameter Extraction (calibrateSingleDiodeMpp)
 *
 * IEC 62548 / NEC 690 / IEEE 1562 / IEC 60891 Compliant.
 */

import {
  evaluateInverterClustering,
  type InverterClusteringResult,
} from '../inverterClustering';

import {
  sizeBatteryBank,
  type BatteryChemistry,
  type BatteryBankSizingResult,
  type SystemMode,
} from '../batteryEngine';

import {
  designPowerplantBays,
  type PowerplantBayArchitectureResult,
  type InverterTechnology,
} from '../powerplantBayEngine';

import {
  calculateSingleDiodeCurve,
  type IvCurveResult,
  type DiodeParameters,
} from '../singleDiodeModel';

// ============================================================================
// 1. Inverter Right-Sizing
// ============================================================================

export interface InverterRightSizingResult {
  requestedUnitKw: number;
  effectiveUnitKw: number;
  isRightSized: boolean;
  clustering: InverterClusteringResult;
}

/**
 * Evaluates inverter right-sizing for residential and commercial loads.
 * Prevents allocating industrial/utility-scale units (e.g. 330 kW) to micro/standard residential loads.
 */
export function evaluateInverterRightSizing(
  continuousWatts: number,
  peakSurgeWatts: number,
  preferredUnitKw: number = 5.0,
  inverterVmpptMaxV?: number
): InverterRightSizingResult {
  const clustering = evaluateInverterClustering(
    continuousWatts,
    peakSurgeWatts,
    preferredUnitKw,
    inverterVmpptMaxV
  );

  return {
    requestedUnitKw: preferredUnitKw,
    effectiveUnitKw: clustering.unitRatingKw,
    isRightSized: clustering.isUnitRightSized ?? false,
    clustering,
  };
}

// ============================================================================
// 2. MPPT Multi-Channel Compatibility & Hard Blocking
// ============================================================================

export interface MpptCheckInput {
  moduleVoc: number;
  moduleVmp: number;
  moduleIsc: number;
  moduleImp: number;
  modulePmp: number;
  tempCoeffVocPct: number;
  tempCoeffVmpPct?: number;
  tempCoeffPmpPct?: number;
  tempCoeffIscPct?: number;
  modulesPerString: number;
  parallelStrings: number;
  inverterVdcMax: number;
  inverterVmpptMin: number;
  inverterVmpptMax: number;
  inverterImppMaxPerMppt: number;
  inverterIscMaxPerMppt: number;
  inverterMpptChannels: number;
  inverterCount?: number;
  inverterPnomAcKw: number;
  ambientTempMinC: number;
  ambientTempMaxC: number;
  cellTempHotC?: number;
}

export interface MpptCheckResult {
  isVoltageFeasible: boolean;
  isCurrentFeasible: boolean;
  isCompliant: boolean;
  stringVocMaxColdV: number;
  stringVmpMinHotV: number;
  effectiveMpptChannels: number;
  stringsPerMppt: number;
  operatingCurrentAmps: number;
  shortCircuitCurrentAmps: number;
  currentSafetyMarginPct: number;
  dcAcRatio: number;
  singleInverterDcAcRatio: number;
  blockingErrors: string[];
  warnings: string[];
}

/**
 * Evaluates string voltage, current and short-circuit compliance against inverter MPPT limits.
 * Handles fleet-level MPPT channel aggregation when multiple inverters are installed.
 */
export function evaluateMpptCompatibility(input: MpptCheckInput): MpptCheckResult {
  const invCount = Math.max(1, input.inverterCount ?? 1);
  const effectiveMpptChannels = invCount * Math.max(1, input.inverterMpptChannels);

  // String voltage limits
  const singleVocCold = input.moduleVoc * (1.0 + (input.tempCoeffVocPct / 100.0) * (input.ambientTempMinC - 25.0));
  const stringVocMaxColdV = Number((input.modulesPerString * singleVocCold).toFixed(2));

  const effectiveHotC = input.cellTempHotC ?? (input.ambientTempMaxC + 25.0);
  const vmpCoeffPct = input.tempCoeffVmpPct ?? (
    input.tempCoeffPmpPct !== undefined && input.tempCoeffIscPct !== undefined
      ? input.tempCoeffPmpPct - input.tempCoeffIscPct
      : (input.tempCoeffPmpPct ?? -0.30)
  );
  const singleVmpHot = input.moduleVmp * (1.0 + (vmpCoeffPct / 100.0) * (effectiveHotC - 25.0));
  const stringVmpMinHotV = Number((input.modulesPerString * singleVmpHot).toFixed(2));

  const isVoltageFeasible =
    stringVocMaxColdV <= input.inverterVdcMax &&
    stringVmpMinHotV >= input.inverterVmpptMin &&
    stringVocMaxColdV >= stringVmpMinHotV;

  // MPPT Current calculations
  const stringsPerMppt = Math.ceil(input.parallelStrings / effectiveMpptChannels);
  const operatingCurrentAmps = Number((stringsPerMppt * input.moduleImp).toFixed(2));
  const shortCircuitCurrentAmps = Number((stringsPerMppt * input.moduleIsc * 1.25).toFixed(2));

  const blockingErrors: string[] = [];
  const warnings: string[] = [];

  let isCurrentFeasible = true;
  if (input.inverterImppMaxPerMppt > 0 && operatingCurrentAmps > input.inverterImppMaxPerMppt) {
    isCurrentFeasible = false;
    const msg = `Operating current (${operatingCurrentAmps}A) exceeds MPPT rating (${input.inverterImppMaxPerMppt}A)`;
    blockingErrors.push(msg);
    warnings.push(msg);
  }

  if (input.inverterIscMaxPerMppt > 0 && shortCircuitCurrentAmps > input.inverterIscMaxPerMppt) {
    isCurrentFeasible = false;
    const msg = `Short-circuit current with 1.25 factor (${shortCircuitCurrentAmps}A) exceeds MPPT limit (${input.inverterIscMaxPerMppt}A)`;
    blockingErrors.push(msg);
    warnings.push(msg);
  }

  if (!isVoltageFeasible) {
    blockingErrors.push(
      `String voltage out of bounds: Voc_cold=${stringVocMaxColdV}V (max ${input.inverterVdcMax}V), Vmp_hot=${stringVmpMinHotV}V (min ${input.inverterVmpptMin}V)`
    );
  }

  const totalPvCapacityKw = (input.parallelStrings * input.modulesPerString * input.modulePmp) / 1000.0;
  const singleInverterDcAcRatio = Number((totalPvCapacityKw / input.inverterPnomAcKw).toFixed(6));
  const dcAcRatio = Number((totalPvCapacityKw / (invCount * input.inverterPnomAcKw)).toFixed(6));

  const currentSafetyMarginPct = input.inverterImppMaxPerMppt > 0
    ? Number((((input.inverterImppMaxPerMppt - operatingCurrentAmps) / input.inverterImppMaxPerMppt) * 100).toFixed(2))
    : 0;

  return {
    isVoltageFeasible,
    isCurrentFeasible,
    isCompliant: isVoltageFeasible && isCurrentFeasible,
    stringVocMaxColdV,
    stringVmpMinHotV,
    effectiveMpptChannels,
    stringsPerMppt,
    operatingCurrentAmps,
    shortCircuitCurrentAmps,
    currentSafetyMarginPct,
    dcAcRatio,
    singleInverterDcAcRatio,
    blockingErrors,
    warnings,
  };
}

// ============================================================================
// 3. Powerplant Fleet Inverter Distribution & MV Bays
// ============================================================================

export interface FleetDistributionInput {
  plantCapacityMw: number;
  pvDcCapacityMwp?: number;
  technology?: InverterTechnology;
  customBaysCount?: number;
  inverterUnitKw?: number;
  gridKv?: number;
}

export interface FleetDistributionResult {
  totalPlantInverters: number;
  actualBaysCount: number;
  invertersPerBay: number[];
  bayInstalledAcMw: number[];
  transformerRatingMva: number[];
  totalInstalledInverterAcMw: number;
  effectiveFleetDcAcRatio: number;
  powerplantArchitecture: PowerplantBayArchitectureResult;
}

/**
 * Calculates optimal distribution of string inverters across power blocks without double-ceiling rounding.
 */
export function calculateFleetInverterDistribution(
  input: FleetDistributionInput
): FleetDistributionResult {
  const tech = input.technology ?? 'string_inverter';
  const gridKv = input.gridKv ?? 20.0;
  const unitKw = input.inverterUnitKw ?? (tech === 'mv_turnkey' ? 3125.0 : 330.0);

  const arch = designPowerplantBays(
    input.plantCapacityMw,
    input.pvDcCapacityMwp ?? input.plantCapacityMw * 1.25,
    tech,
    input.customBaysCount,
    gridKv,
    unitKw
  );

  const invertersPerBay = arch.bays.map((b) => b.inverterCount);
  const bayInstalledAcMw = arch.bays.map((b) => (b.inverterCount * b.inverterUnitRatingKw) / 1000.0);
  const transformerRatingMva = arch.bays.map((b) => b.transformerRatingMva);

  const totalPlantInverters = arch.totalInverterCount ?? invertersPerBay.reduce((sum, n) => sum + n, 0);
  const totalInstalledInverterAcMw = arch.totalInstalledInverterAcMw ??
    Number((bayInstalledAcMw.reduce((sum, m) => sum + m, 0)).toFixed(3));
  const effectiveFleetDcAcRatio = arch.effectiveFleetDcAcRatio ??
    (totalInstalledInverterAcMw > 0 ? Number(((input.pvDcCapacityMwp ?? input.plantCapacityMw * 1.25) / totalInstalledInverterAcMw).toFixed(6)) : 0);

  return {
    totalPlantInverters,
    actualBaysCount: arch.actualBaysCount,
    invertersPerBay,
    bayInstalledAcMw,
    transformerRatingMva,
    totalInstalledInverterAcMw,
    effectiveFleetDcAcRatio,
    powerplantArchitecture: arch,
  };
}

// ============================================================================
// 4. Usable BESS Storage with Efficiency & Temperature Derating
// ============================================================================

export interface UsableStorageInput {
  dailyEnergyKwh: number;
  autonomyDays: number;
  chemistry?: BatteryChemistry;
  busbarVdc?: number;
  ambientTempC?: number;
  unitAh?: number;
  continuousWatts?: number;
  peakSurgeWatts?: number;
  systemMode?: SystemMode;
  designNightKwh?: number;
  outageHours?: number;
  designNightHours?: number;
}

export interface UsableStorageResult {
  nominalDoDUsableKwh: number;
  actualUsableKwh: number;
  grossCapacityKwh: number;
  nightCoveragePct: number;
  batteriesInSeries: number;
  parallelStrings: number;
  totalUnitsCount: number;
  unitVoltage: number;
  sizingResult: BatteryBankSizingResult;
}

/**
 * Calculates battery bank sizing factoring DoD, round-trip efficiency, and Arrhenius/Peukert temperature derating.
 */
export function evaluateUsableBatteryStorage(
  input: UsableStorageInput
): UsableStorageResult {
  const chemistry = input.chemistry ?? 'lifepo4';
  const vdc = input.busbarVdc ?? 48;
  const unitAh = input.unitAh ?? 100;
  const contW = input.continuousWatts ?? 3000;
  const peakW = input.peakSurgeWatts ?? contW * 1.5;
  const tempC = input.ambientTempC ?? 15.0;
  const sysMode = input.systemMode ?? 'offgrid';

  const sizingResult = sizeBatteryBank(
    input.dailyEnergyKwh,
    input.autonomyDays,
    chemistry,
    vdc,
    peakW,
    contW,
    tempC,
    unitAh,
    input.designNightKwh,
    sysMode,
    input.outageHours,
    input.designNightHours
  );

  let unitVoltage = 12.0;
  if (chemistry === 'lifepo4' || chemistry === 'ternary_ncm') {
    if (vdc >= 48) unitVoltage = 48.0;
    else if (vdc === 24) unitVoltage = 24.0;
    else unitVoltage = 12.0;
  }

  return {
    nominalDoDUsableKwh: sizingResult.nominalDoDUsableCapacityKwh ?? sizingResult.usableCapacityKwh,
    actualUsableKwh: sizingResult.usableCapacityKwh,
    grossCapacityKwh: sizingResult.grossCapacityKwh,
    nightCoveragePct: sizingResult.nightCoveragePct ?? 100,
    batteriesInSeries: sizingResult.batteriesInSeries,
    parallelStrings: sizingResult.parallelStrings,
    totalUnitsCount: sizingResult.totalBatteryUnitsCount,
    unitVoltage,
    sizingResult,
  };
}

// ============================================================================
// 5. STC MPP Single-Diode Calibration & Zero Current Root
// ============================================================================

export interface SingleDiodeCalibrationInput {
  stcVoc: number;
  stcIsc: number;
  stcVmp: number;
  stcImp: number;
  stcPmp: number;
  tempCoeffVocPct?: number;
  tempCoeffIscPct?: number;
  tempCoeffPmpPct?: number;
  irradianceWm2?: number;
  cellTempC?: number;
  seriesModulesCount?: number;
  customParams?: Partial<DiodeParameters>;
}

export interface SingleDiodeCalibrationResult {
  stcPmpTarget: number;
  calibratedPmp: number;
  calibratedVoc: number;
  pmpErrorWatts: number;
  efficiencyPct: number;
  cellsPerModule: number;
  rsRefModule: number;
  lastPointCurrent: number;
  isVocRootZeroCurrent: boolean;
  ivCurve: IvCurveResult;
}

/**
 * Calibrates single-diode model series resistance and open-circuit voltage via Newton-Raphson.
 */
export function calibrateSingleDiodeMpp(
  input: SingleDiodeCalibrationInput
): SingleDiodeCalibrationResult {
  const ivCurve = calculateSingleDiodeCurve(
    input.stcVoc,
    input.stcIsc,
    input.stcVmp,
    input.stcImp,
    input.stcPmp,
    input.tempCoeffVocPct ?? -0.26,
    input.tempCoeffIscPct ?? 0.045,
    input.tempCoeffPmpPct ?? -0.30,
    input.irradianceWm2 ?? 1000.0,
    input.cellTempC ?? 25.0,
    input.seriesModulesCount ?? 1,
    input.customParams
  );

  const lastPoint = ivCurve.points[ivCurve.points.length - 1];
  const lastPointCurrent = lastPoint ? lastPoint.i : 0;
  const isVocRootZeroCurrent = Math.abs(lastPointCurrent) < 1e-4;

  return {
    stcPmpTarget: input.stcPmp,
    calibratedPmp: ivCurve.pmp,
    calibratedVoc: ivCurve.voc,
    pmpErrorWatts: Number(Math.abs(ivCurve.pmp - input.stcPmp).toFixed(2)),
    efficiencyPct: ivCurve.efficiencyPct,
    cellsPerModule: ivCurve.extractedParameters?.cellsPerModule ?? 72,
    rsRefModule: ivCurve.extractedParameters?.rs ?? 0,
    lastPointCurrent,
    isVocRootZeroCurrent,
    ivCurve,
  };
}
