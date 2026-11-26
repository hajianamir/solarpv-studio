/**
 * Physical Loss Contract & Multi-Model Unified Interface
 * SolarPV Studio v3.0 - Phase 4 (PR-2a-4)
 *
 * Shared API for physical-loss estimates (not a validation certificate):
 * 1. Unvalidated chord-slice bifacial screening proxy; not Hottel crossed-strings.
 * 2. Martin & Ruiz (2001) temperature-coupled angle-dependent IAM optical reflection model.
 * 3. Internal snow shedding/damming screening heuristic; not the Marion model.
 * 4. Soiling screening with internal/user-defined rain bins and cleaning inputs.
 * 5. Full catalog-backed Nominal Module Operating Cell Temperature (NOCT) resolution.
 */

import {
  type BifacialGainInput,
  type BifacialGainDiagnostics,
  evaluateBifacialGainWithDiagnostics,
} from '../bifacialGain';

import {
  type EffectivePoaTransmissionResult,
  calculateEffectivePoaIam,
} from '../optical/iamEngine';

import {
  type HourlySnowWeatherStep,
  simulateAnnualSnowShedding,
} from '../snow/marionSnowEngine';

import {
  type DailyWeatherSoilingStep,
  simulateAnnualSoiling,
} from '../soiling/kimberSoilingEngine';

import {
  type SnowSheddingConfig,
  type SnowSheddingSummaryResult,
  type SoilingConfig,
  type SoilingSimulationResult,
} from './advancedInterfaces';

import { resolveModuleNoctC } from '../equipmentCatalogData';

export interface PhysicalLossEvaluationInput {
  bifacial?: BifacialGainInput;
  iam?: {
    beamPoaWm2?: number;
    skyDiffusePoaWm2?: number;
    groundReflectedPoaWm2?: number;
    aoiBeamDeg?: number;
    tiltDeg?: number;
    cellTemperatureC?: number;
    arCoatingFactor?: number;
  };
  snow?: {
    config?: Partial<SnowSheddingConfig>;
    weatherHourly?: HourlySnowWeatherStep[];
    useStandardWinterProfile?: boolean;
  };
  soiling?: {
    config?: Partial<SoilingConfig>;
    weatherDaily?: DailyWeatherSoilingStep[];
  };
  module?: {
    noctC?: number;
    cellType?: string;
  } | null;
}

export interface PhysicalLossEvaluationResult {
  bifacialGainPct: number;
  iamLossPct: number;
  snowLossPct: number;
  soilingLossPct: number;
  noctC: number;
  diagnostics: {
    bifacialDiagnostics: BifacialGainDiagnostics;
    iamDetails?: EffectivePoaTransmissionResult;
    snowSummary?: SnowSheddingSummaryResult;
    soilingSummary?: SoilingSimulationResult;
    noctResolved: { noctC: number; isFallback: boolean };
  };
}

/**
 * Evaluates the simplified, unvalidated chord-slice bifacial heuristic with diagnostics.
 */
export function evaluatePhysicalBifacialGain(input: BifacialGainInput): BifacialGainDiagnostics {
  return evaluateBifacialGainWithDiagnostics({
    ...input,
    modelMode: input.modelMode ?? 'view_factor_2d',
  });
}

/**
 * Evaluates Martin & Ruiz temperature-coupled incidence angle modifier (IAM) optical loss.
 * `aoiBeamDeg` is the beam incidence angle on the module plane, not solar zenith.
 */
export function evaluatePhysicalIamLoss(input: {
  beamPoaWm2?: number;
  skyDiffusePoaWm2?: number;
  groundReflectedPoaWm2?: number;
  aoiBeamDeg: number;
  tiltDeg: number;
  cellTemperatureC?: number;
  arCoatingFactor?: number;
}): {
  iamLossPct: number;
  iamPoaEffective: number;
  details: EffectivePoaTransmissionResult;
} {
  const beam = input.beamPoaWm2 ?? 700.0;
  const diffuse = input.skyDiffusePoaWm2 ?? 150.0;
  const ground = input.groundReflectedPoaWm2 ?? 50.0;
  const tCell = input.cellTemperatureC ?? 25.0;
  const ar = input.arCoatingFactor ?? 0.16;

  const res = calculateEffectivePoaIam(
    beam,
    diffuse,
    ground,
    input.aoiBeamDeg,
    input.tiltDeg,
    tCell,
    ar
  );

  const lossPct = Number(res.effectiveTransmissionLossPercent.toFixed(1));
  const iamLossPct = -Math.abs(lossPct);

  return {
    iamLossPct,
    iamPoaEffective: res.iamPoaEffective,
    details: res,
  };
}

/**
 * Generates a deterministic 8760-hour annual snow profile for winter snow shedding evaluations.
 * Default: Hours 1..1440 have periodic snow storms (5 cm) and cold temperatures, followed by warm weather.
 */
export function buildStandardWinterSnowProfile(params?: {
  winterHours?: number;
  stormIntervalHours?: number;
  stormDurationHours?: number;
  stormSnowfallCm?: number;
  winterGroundSnowCm?: number;
}): HourlySnowWeatherStep[] {
  const winterHours = params?.winterHours ?? 1440;
  const stormSnowfallCm = params?.stormSnowfallCm ?? 5.0;
  const winterGroundSnowCm = params?.winterGroundSnowCm ?? 25.0;

  const profile: HourlySnowWeatherStep[] = [];
  for (let h = 1; h <= 8760; h++) {
    if (h <= winterHours) {
      const temp = -2.0 + 5.0 * Math.sin(((h / 24.0) * 2.0 * Math.PI));
      const isStorm = (h % 96 === 1 || h % 96 === 2);
      profile.push({
        hourOfYear: h,
        ambientTempC: temp,
        snowfallDepthCm: isStorm ? stormSnowfallCm : 0,
        accumulatedGroundSnowCm: winterGroundSnowCm,
      });
    } else {
      profile.push({
        hourOfYear: h,
        ambientTempC: 18.0,
        snowfallDepthCm: 0,
        accumulatedGroundSnowCm: 0,
      });
    }
  }

  return profile;
}

/**
 * Evaluates an unvalidated snow screening estimate and damming indicator.
 */
export function evaluatePhysicalSnowLoss(
  config: Partial<SnowSheddingConfig> = {},
  weatherHourly?: HourlySnowWeatherStep[]
): SnowSheddingSummaryResult {
  const weather = weatherHourly ?? buildStandardWinterSnowProfile();
  return simulateAnnualSnowShedding(config, weather);
}

/**
 * Evaluates soiling screening with assumed/user-defined rainfall-cleaning bins.
 */
export function evaluatePhysicalSoilingLoss(
  config: Partial<SoilingConfig> = {},
  weatherDaily?: DailyWeatherSoilingStep[]
): SoilingSimulationResult {
  return simulateAnnualSoiling(config, weatherDaily);
}

/**
 * Unified evaluation of all five physical loss components.
 */
export function evaluatePhysicalLossModels(
  input: PhysicalLossEvaluationInput = {}
): PhysicalLossEvaluationResult {
  // 1. Bifacial Gain
  let bifacialDiag: BifacialGainDiagnostics;
  if (input.bifacial) {
    bifacialDiag = evaluatePhysicalBifacialGain(input.bifacial);
  } else {
    bifacialDiag = {
      activeCapPct: 25,
      gainFraction: 0.0,
      gainPct: 0.0,
      unclampedGainPct: 0.0,
      isClampedAt15Pct: false,
      clampedExcessPct: 0.0,
      modelUsed: 'view_factor_2d',
    };
  }

  // 2. Optical IAM Loss
  let iamRes: { iamLossPct: number; iamPoaEffective: number; details: EffectivePoaTransmissionResult } | undefined;
  if (input.iam && input.iam.aoiBeamDeg !== undefined && input.iam.tiltDeg !== undefined) {
    iamRes = evaluatePhysicalIamLoss({
      beamPoaWm2: input.iam.beamPoaWm2,
      skyDiffusePoaWm2: input.iam.skyDiffusePoaWm2,
      groundReflectedPoaWm2: input.iam.groundReflectedPoaWm2,
      aoiBeamDeg: input.iam.aoiBeamDeg,
      tiltDeg: input.iam.tiltDeg,
      cellTemperatureC: input.iam.cellTemperatureC,
      arCoatingFactor: input.iam.arCoatingFactor,
    });
  }

  // 3. Snow Loss
  let snowSummary: SnowSheddingSummaryResult | undefined;
  if (input.snow) {
    const weather = input.snow.weatherHourly ?? (input.snow.useStandardWinterProfile !== false ? buildStandardWinterSnowProfile() : []);
    snowSummary = evaluatePhysicalSnowLoss(input.snow.config ?? {}, weather);
  }

  // 4. Soiling Loss
  let soilingSummary: SoilingSimulationResult | undefined;
  if (input.soiling) {
    soilingSummary = evaluatePhysicalSoilingLoss(input.soiling.config ?? {}, input.soiling.weatherDaily);
  }

  // 5. NOCT Resolution
  const resolvedNoct = resolveModuleNoctC(input.module);

  return {
    bifacialGainPct: bifacialDiag.gainPct,
    iamLossPct: iamRes?.iamLossPct ?? -2.2,
    snowLossPct: snowSummary?.annualSnowLossPercent ?? 0.0,
    soilingLossPct: soilingSummary?.annualAverageSoilingLossPercent ?? 4.5,
    noctC: resolvedNoct.noctC,
    diagnostics: {
      bifacialDiagnostics: bifacialDiag,
      iamDetails: iamRes?.details,
      snowSummary,
      soilingSummary,
      noctResolved: resolvedNoct,
    },
  };
}
