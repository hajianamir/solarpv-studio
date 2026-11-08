/**
 * SolarPV Studio v3.0 - Unified Annual Yield Engine
 * Single Source of Truth for annual energy yield estimation, Performance Ratio (PR),
 * specific annual yield, and dual-mode thermal derate evaluation (hot_design vs annual_energy).
 *
 * Leaf/core module in `src/engine/core/`: NO circular dependencies.
 */

import {
  calculateThermalDerate,
  type ThermalDerateResult,
} from './thermalDerate';
import type { InstallationEnvironment } from '../types/climateTypes';

export type AnnualYieldKwh = number & { readonly __brand: unique symbol };
export type PerformanceRatioPct = number & { readonly __brand: unique symbol };
export type SpecificYieldKwhPerKwp = number & { readonly __brand: unique symbol };

export function asAnnualYieldKwh(val: number): AnnualYieldKwh {
  if (!Number.isFinite(val) || val < 0) {
    throw new RangeError(`Invalid AnnualYieldKwh: must be non-negative finite number, got ${val}`);
  }
  return Number(val.toFixed(4)) as AnnualYieldKwh;
}

export function asPerformanceRatioPct(val: number): PerformanceRatioPct {
  if (!Number.isFinite(val) || val < 0 || val > 100) {
    throw new RangeError(`Invalid PerformanceRatioPct: must be between 0 and 100, got ${val}`);
  }
  return Number(val.toFixed(4)) as PerformanceRatioPct;
}

export function asSpecificYieldKwhPerKwp(val: number): SpecificYieldKwhPerKwp {
  if (!Number.isFinite(val) || val < 0) {
    throw new RangeError(`Invalid SpecificYieldKwhPerKwp: must be non-negative finite number, got ${val}`);
  }
  return Number(val.toFixed(2)) as SpecificYieldKwhPerKwp;
}

export interface AnnualYieldStageLoss {
  id: string;
  nameFa: string;
  nameEn: string;
  percentageLoss: number;
  percentageLossRaw?: number;
}

export interface UnifiedAnnualYieldInput {
  installedCapacityKwp: number;
  peakSunHours: number;
  ambientTempMaxC: number;
  ambientTempMeanC?: number;
  soilingLossPct?: number;
  dcAcRatio?: number;
  hasTracker?: boolean;
  snowLossPct?: number;
  iamLossPct?: number;
  noctC?: number;
  tempCoeffPmpPct?: number;
  bifacialGainPct?: number;
  evaluationMode?: 'hot_design' | 'annual_energy';
  installationEnvironment?: InstallationEnvironment;
  nearShadingLossPct?: number;
  qualityTolerancePct?: number;
  lidLossPct?: number;
  mismatchLossPct?: number;
  dcCablingLossPct?: number;
  mpptTrackingLossPct?: number;
  inverterEfficiencyPct?: number;
  transformerLossPct?: number;
  auxUnavailabilityLossPct?: number;
}

export interface UnifiedAnnualYieldResult {
  installedCapacityKwp: number;
  annualYieldKwh: AnnualYieldKwh;
  performanceRatioPct: PerformanceRatioPct;
  specificYieldKwhPerKwp: SpecificYieldKwhPerKwp;
  effectiveDeratingFactor: number;
  evaluationMode: 'hot_design' | 'annual_energy';
  thermalDerate: ThermalDerateResult;
  clippingLossPct: number;
  stages: AnnualYieldStageLoss[];
}

/**
 * Calculates continuous inverter clipping loss strictly clamped to physical bounds [-85.0, -0.2].
 * Linear clipping model: -0.2% baseline for ILR <= 1.3, then grows with slope 6.5%/unit ILR above 1.3.
 */
export function calculatePhysicalClippingLossPct(dcAcRatio: number): {
  clippingLossPct: number;
  rawClippingLossPct: number;
} {
  const safeIlr = Math.max(0.1, Number.isFinite(dcAcRatio) ? dcAcRatio : 1.25);
  const rawClipping = -0.2 - 6.5 * Math.max(0, safeIlr - 1.3);
  const clamped = Math.max(-85.0, Math.min(-0.2, rawClipping));
  return {
    clippingLossPct: Number(clamped.toFixed(4)),
    rawClippingLossPct: Number(rawClipping.toFixed(4)),
  };
}

/**
 * Calculates standard overall system derating factor from individual loss stages.
 */
export function calculateStandardDeratingFactor(params: {
  tempDeratePct: number;
  soilingLossPct?: number;
  dcCableLossPct?: number;
  mismatchAndLidLossPct?: number;
  inverterEfficiencyPct?: number;
  systemAvailabilityPct?: number;
  clippingLossPct?: number;
}): number {
  const derateTemp = Math.max(0, 1.0 - params.tempDeratePct / 100.0);
  const derateSoiling = Math.max(0, 1.0 - (params.soilingLossPct ?? 4.5) / 100.0);
  const derateCable = Math.max(0, 1.0 - (params.dcCableLossPct ?? 1.5) / 100.0);
  const derateMismatch = Math.max(0, 1.0 - (params.mismatchAndLidLossPct ?? 2.5) / 100.0);
  const derateInverter = Math.max(0, (params.inverterEfficiencyPct ?? 98.5) / 100.0);
  const derateAvailability = Math.max(0, (params.systemAvailabilityPct ?? 99.0) / 100.0);
  const derateClipping = Math.max(0, 1.0 - Math.abs(params.clippingLossPct ?? 0.2) / 100.0);

  const factor =
    derateTemp *
    derateSoiling *
    derateCable *
    derateMismatch *
    derateInverter *
    derateAvailability *
    derateClipping;

  return Number(factor.toFixed(6));
}

/**
 * Calculates unified annual energy yield using single source of truth formulation.
 */
export function calculateUnifiedAnnualYield(
  input: UnifiedAnnualYieldInput
): UnifiedAnnualYieldResult {
  const {
    installedCapacityKwp,
    peakSunHours,
    ambientTempMaxC,
    ambientTempMeanC,
    soilingLossPct = 4.5,
    dcAcRatio = 1.25,
    hasTracker = false,
    snowLossPct = 0.0,
    iamLossPct = -2.2,
    noctC = 45.0,
    tempCoeffPmpPct = -0.31,
    bifacialGainPct = 0.0,
    evaluationMode = 'annual_energy',
    installationEnvironment = 'ground_mount',
    nearShadingLossPct = -2.4,
    qualityTolerancePct = 0.4,
    lidLossPct = -1.2,
    mismatchLossPct = -1.3,
    dcCablingLossPct = -1.4,
    mpptTrackingLossPct = -0.4,
    inverterEfficiencyPct = -2.2,
    transformerLossPct = -1.5,
    auxUnavailabilityLossPct = -1.0,
  } = input;

  const thermal = calculateThermalDerate({
    module: { noctC, tempCoeffPmpPct },
    ambientTempMaxC,
    ambientTempMeanC,
    installationEnvironment,
    mode: evaluationMode,
  });

  const { clippingLossPct } = calculatePhysicalClippingLossPct(dcAcRatio);

  const stages: AnnualYieldStageLoss[] = [];

  if (bifacialGainPct > 0) {
    stages.push({
      id: 'bifacial_gain',
      nameFa: 'بهره تابش دوطرفه سطح پشت ماژول (Bifacial Gain)',
      nameEn: 'Bifacial Rear Irradiance Gain (First-Order Proxy)',
      percentageLoss: Number(bifacialGainPct.toFixed(2)),
      percentageLossRaw: bifacialGainPct,
    });
  }

  stages.push(
    {
      id: 'near_shading',
      nameFa: 'تلفات سایه‌اندازی نزدیک بین ردیف‌ها',
      nameEn: 'Near Shading Loss (Row-to-Row)',
      percentageLoss: Number(nearShadingLossPct.toFixed(2)),
      percentageLossRaw: nearShadingLossPct,
    },
    {
      id: 'iam',
      nameFa: 'تلفات انعکاس اپتیکی شیشه (IAM / Fresnel)',
      nameEn: 'Incidence Angle Modifier (IAM)',
      percentageLoss: Number((-Math.abs(iamLossPct)).toFixed(2)),
      percentageLossRaw: -Math.abs(iamLossPct),
    },
    {
      id: 'soiling',
      nameFa: 'تلفات گردوغبار و رسوب سطحی پنل (Kimber Model)',
      nameEn: 'Soiling & Environmental Dust Loss (Kimber)',
      percentageLoss: Number((-Math.abs(soilingLossPct)).toFixed(2)),
      percentageLossRaw: -Math.abs(soilingLossPct),
    },
    {
      id: 'snow',
      nameFa: 'تلفات نشست و ماندگاری برف (Marion Model)',
      nameEn: 'Snow Coverage & Shedding Loss (Marion)',
      percentageLoss: Number((-Math.abs(snowLossPct)).toFixed(2)),
      percentageLossRaw: -Math.abs(snowLossPct),
    },
    {
      id: 'thermal',
      nameFa: 'تلفات حرارتی سلول ناشی از دمای کارکرد (NOCT)',
      nameEn: 'Cell Operating Temperature Loss (Pmp coeff)',
      percentageLoss: Number((-thermal.deratePct).toFixed(2)),
      percentageLossRaw: -thermal.deratePct,
    },
    {
      id: 'quality',
      nameFa: 'تلورانس توان نامی تولیدکننده (Module Quality)',
      nameEn: 'Module Quality & Factory Flash Tolerance',
      percentageLoss: Number(qualityTolerancePct.toFixed(2)),
      percentageLossRaw: qualityTolerancePct,
    },
    {
      id: 'lid',
      nameFa: 'تلفات زوال اولیه نوری (LID & LeTID)',
      nameEn: 'Light-Induced Degradation (LID & LeTID)',
      percentageLoss: Number((-Math.abs(lidLossPct)).toFixed(2)),
      percentageLossRaw: -Math.abs(lidLossPct),
    },
    {
      id: 'mismatch',
      nameFa: 'تلفات عدم تطابق الکتریکی استرینگ‌ها (I-V Mismatch)',
      nameEn: 'String Module I-V Mismatch Loss',
      percentageLoss: Number((-Math.abs(mismatchLossPct)).toFixed(2)),
      percentageLossRaw: -Math.abs(mismatchLossPct),
    },
    {
      id: 'dc_cabling',
      nameFa: 'تلفات اهمی کابل‌کشی DC خورشیدی (I²R)',
      nameEn: 'DC Cabling Ohmic Loss (I²R)',
      percentageLoss: Number((-Math.abs(dcCablingLossPct)).toFixed(2)),
      percentageLossRaw: -Math.abs(dcCablingLossPct),
    },
    {
      id: 'mppt_tracking',
      nameFa: 'تلفات ترکینگ نقطه حداکثر توان اینورتر (MPPT)',
      nameEn: 'Inverter Dynamic MPPT Tracking Loss',
      percentageLoss: Number((-Math.abs(mpptTrackingLossPct)).toFixed(2)),
      percentageLossRaw: -Math.abs(mpptTrackingLossPct),
    },
    {
      id: 'clipping',
      nameFa: 'تلفات برش توان اینورتر (Clipping Over-paneling)',
      nameEn: 'Inverter AC Power Clipping (DC/AC Over-paneling)',
      percentageLoss: Number(clippingLossPct.toFixed(2)),
      percentageLossRaw: clippingLossPct,
    },
    {
      id: 'inverter_efficiency',
      nameFa: 'تلفات بازدهی تبدیل DC به AC اینورتر',
      nameEn: 'Inverter DC-to-AC Conversion Loss',
      percentageLoss: Number((-Math.abs(inverterEfficiencyPct)).toFixed(2)),
      percentageLossRaw: -Math.abs(inverterEfficiencyPct),
    }
  );

  if (installedCapacityKwp >= 50.0) {
    stages.push({
      id: 'mv_transformer',
      nameFa: 'تلفات ترانسفورماتور افزاینده و خطوط جمع‌آوری MV',
      nameEn: 'AC Collector & MV Step-Up Transformer Loss',
      percentageLoss: Number((-Math.abs(transformerLossPct)).toFixed(2)),
      percentageLossRaw: -Math.abs(transformerLossPct),
    });
  }

  stages.push({
    id: 'aux_unavailability',
    nameFa: 'مصرف داخلی و قابلیت اطمینان شبکه (Availability)',
    nameEn: 'Substation Auxiliaries & Grid Availability',
    percentageLoss: Number((-Math.abs(auxUnavailabilityLossPct)).toFixed(2)),
    percentageLossRaw: -Math.abs(auxUnavailabilityLossPct),
  });

  // Transposition gain factor:
  const transpositionGain = hasTracker ? 1.25 : 1.168;
  const rawGhiEnergyKwh = installedCapacityKwp * peakSunHours * 365.0;
  const effectivePoaEnergyKwh = rawGhiEnergyKwh * transpositionGain;

  let currentEnergy = effectivePoaEnergyKwh;
  let compoundProduct = 1.0;
  for (const s of stages) {
    const p = s.percentageLossRaw ?? s.percentageLoss;
    compoundProduct *= 1.0 + p / 100.0;
    currentEnergy *= 1.0 + p / 100.0;
  }

  const annualYieldKwh = asAnnualYieldKwh(currentEnergy);
  const performanceRatioPct = asPerformanceRatioPct(
    effectivePoaEnergyKwh > 0 ? (currentEnergy / effectivePoaEnergyKwh) * 100.0 : 0
  );
  const specificYieldKwhPerKwp = asSpecificYieldKwhPerKwp(
    installedCapacityKwp > 0 ? currentEnergy / installedCapacityKwp : 0
  );

  const effectiveDeratingFactor = calculateStandardDeratingFactor({
    tempDeratePct: thermal.deratePct,
    soilingLossPct,
    dcCableLossPct: Math.abs(dcCablingLossPct),
    mismatchAndLidLossPct: Math.abs(mismatchLossPct) + Math.abs(lidLossPct),
    inverterEfficiencyPct: 100.0 - Math.abs(inverterEfficiencyPct),
    systemAvailabilityPct: 100.0 - Math.abs(auxUnavailabilityLossPct),
    clippingLossPct,
  });

  return {
    installedCapacityKwp,
    annualYieldKwh,
    performanceRatioPct,
    specificYieldKwhPerKwp,
    effectiveDeratingFactor,
    evaluationMode,
    thermalDerate: thermal,
    clippingLossPct,
    stages,
  };
}

export interface FivePathConvergenceReport {
  paths: {
    mainWaterfallKwh: number;
    pvEngineAdvancedKwh: number;
    simulation24hKwh: number;
    quickSizingKwh: number;
    serverIndependentKwh: number;
  };
  meanKwh: number;
  minKwh: number;
  maxKwh: number;
  spreadKwh: number;
  dispersionRatio: number; // max / min
  relativeSpreadPct: number; // spread / mean * 100
  isConverged: boolean; // dispersionRatio <= 1.05
}

/**
 * Reconciles and analyzes convergence across the 5 independent generation paths.
 */
export function reconcile5PathConvergence(paths: {
  mainWaterfallKwh: number;
  pvEngineAdvancedKwh: number;
  simulation24hKwh: number;
  quickSizingKwh: number;
  serverIndependentKwh: number;
}): FivePathConvergenceReport {
  const vals = Object.values(paths).filter((v) => Number.isFinite(v) && v > 0);
  const minKwh = Math.min(...vals);
  const maxKwh = Math.max(...vals);
  const spreadKwh = maxKwh - minKwh;
  const meanKwh = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
  const dispersionRatio = minKwh > 0 ? maxKwh / minKwh : Infinity;
  const relativeSpreadPct = meanKwh > 0 ? (spreadKwh / meanKwh) * 100.0 : 0;
  const isConverged = dispersionRatio <= 1.05;

  return {
    paths,
    meanKwh: Number(meanKwh.toFixed(2)),
    minKwh: Number(minKwh.toFixed(2)),
    maxKwh: Number(maxKwh.toFixed(2)),
    spreadKwh: Number(spreadKwh.toFixed(2)),
    dispersionRatio: Number(dispersionRatio.toFixed(6)),
    relativeSpreadPct: Number(relativeSpreadPct.toFixed(4)),
    isConverged,
  };
}
