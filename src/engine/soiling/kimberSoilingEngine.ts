/**
 * Preliminary soiling accumulation and rain-cleaning screening model
 * SolarPV Studio v3.0 - Phase 2a (PR-2a-2)
 *
 * Background references only (not validation of this implementation):
 * - Kimber, A., et al. (NREL/CP-520-40123): "The Effect of Soiling on Large Grid-Connected Photovoltaic Systems in California and the Southwest US"
 * - IEC 61724-1: Photovoltaic system performance - Monitoring: Soiling Ratio (SR)
 * - Coello, M., & Boyle, L. (2019): "Modelling the Impact of Soiling on Photovoltaic Performance"
 *
 * Rain bins, dust multipliers and cleaning assumptions are internal/user-defined.
 * No independent field validation or reproduction of Kimber, SAM or PVsyst is claimed.
 * Legacy export and variant names are retained for API compatibility.
 * Features:
 * 1. Supports both `kimber_simplified` and `kimber_full_discrete_bins` model variants.
 * 2. Full discrete precipitation bins (0mm, 1-2.5mm, 2.5-5mm, 5-10mm, >=10mm).
 * 3. Dust storm (haboob) vulnerability scaling factor for desert zones.
 * 4. Scheduled manual wash cycles and rain wash-off hysteresis.
 * 5. Soiling-ratio bookkeeping; not a claim of IEC monitoring compliance.
 */

import {
  type SoilingConfig,
  type SoilingDailyStepResult,
  type SoilingSimulationResult,
  DEFAULT_SOILING_CONFIG,
} from '../core/advancedInterfaces';

export interface DiscreteRainCleaningBin {
  minRainMm: number;
  maxRainMm: number;
  cleaningFraction: number; // 0.0 (no cleaning) to 1.0 (100% full wash)
  description: string;
}

/**
 * Internal assumed rainfall-cleaning bins; NOT a published Kimber table.
 * Kimber et al. (2006), "The Effect of Soiling on Large Grid-Connected
 * Photovoltaic Systems in California and the Southwest US" is background on
 * accumulation and rainfall-related cleaning, not provenance for these bins.
 * The former section/table/equation and SAM/PVsyst equivalence claims are
 * unverified and withdrawn. Each threshold/fraction below is an internal
 * screening assumption; site-specific calibration is required before design use.
 * The legacy KIMBER_STANDARD_RAIN_BINS export name is compatibility-only.
 */
export const KIMBER_STANDARD_RAIN_BINS: ReadonlyArray<DiscreteRainCleaningBin> = [
  { minRainMm: 0.0, maxRainMm: 1.0, cleaningFraction: 0.00, description: 'Trace / Dew (<1.0mm) - Zero cleaning (crusting risk)' },
  { minRainMm: 1.0, maxRainMm: 2.5, cleaningFraction: 0.25, description: 'Light Shower (1.0-2.5mm) - 25% partial wash' },
  { minRainMm: 2.5, maxRainMm: 5.0, cleaningFraction: 0.65, description: 'Moderate Rain (2.5-5.0mm) - 65% partial wash' },
  { minRainMm: 5.0, maxRainMm: 10.0, cleaningFraction: 0.95, description: 'Heavy Rain (5.0-10.0mm) - 95% near-complete wash' },
  { minRainMm: 10.0, maxRainMm: Infinity, cleaningFraction: 1.00, description: 'Torrential Rain (>=10.0mm) - 100% complete wash-off' },
];

export interface DailyWeatherSoilingStep {
  dayOfYear: number; // 1 to 365
  rainfallMm: number;
  dustStormOccurred?: boolean;
}

/**
 * Evaluates rain cleaning fraction based on precipitation depth and selected model variant.
 */
export function evaluateRainCleaningFraction(
  rainfallMm: number,
  config: SoilingConfig
): number {
  if (rainfallMm <= 0.0) return 0.0;

  if (config.modelVariant === 'kimber_full_discrete_bins') {
    // 5-bin discrete distribution
    for (const bin of KIMBER_STANDARD_RAIN_BINS) {
      if (rainfallMm >= bin.minRainMm && rainfallMm < bin.maxRainMm) {
        return bin.cleaningFraction;
      }
    }
    return 1.0;
  } else {
    // kimber_simplified (single rain threshold with linear partial transition)
    const threshold = config.rainCleaningThresholdMm;
    if (rainfallMm >= threshold) {
      return 1.0;
    }
    if (rainfallMm >= 1.0) {
      const linearFraction = (rainfallMm / threshold) * config.partialWashCoefficient;
      return Math.max(0.0, Math.min(1.0, linearFraction));
    }
    return 0.0;
  }
}

/**
 * Simulates a full 365-day annual soiling degradation and cleaning profile.
 */
export function simulateAnnualSoiling(
  config: Partial<SoilingConfig> = {},
  weatherDaily: DailyWeatherSoilingStep[] = []
): SoilingSimulationResult {
  const mergedConfig: SoilingConfig = {
    ...DEFAULT_SOILING_CONFIG,
    ...config,
  };

  const dailyProfile: SoilingDailyStepResult[] = [];
  let currentSoilingLossPct = 0.0;
  let totalLossSum = 0.0;
  let maxMonthlyLossPct = 0.0;

  // Monthly buckets for calculating maximum monthly loss
  const monthlySums: number[] = new Array(12).fill(0);
  const monthlyDays: number[] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  for (let day = 1; day <= 365; day++) {
    const weather = weatherDaily.find(w => w.dayOfYear === day) ?? {
      dayOfYear: day,
      rainfallMm: 0,
      dustStormOccurred: false,
    };

    const isDustStorm = Boolean(weather.dustStormOccurred);
    const dustMultiplier = isDustStorm ? mergedConfig.dustStormVulnerabilityFactor : 1.0;

    // 1. Daily soiling accumulation
    const dailyDeposition = mergedConfig.dailySoilingRatePercent * dustMultiplier;
    currentSoilingLossPct = Math.min(
      mergedConfig.maxSoilingCeilingPercent,
      currentSoilingLossPct + dailyDeposition
    );

    // 2. Check scheduled manual wash
    let manualCleanPerformed = false;
    if (
      mergedConfig.scheduledWashIntervalDays &&
      mergedConfig.scheduledWashIntervalDays > 0 &&
      day % mergedConfig.scheduledWashIntervalDays === 0
    ) {
      currentSoilingLossPct = 0.0;
      manualCleanPerformed = true;
    }

    // 3. Rain wash-off recovery
    if (!manualCleanPerformed && weather.rainfallMm > 0) {
      const cleanFraction = evaluateRainCleaningFraction(weather.rainfallMm, mergedConfig);
      currentSoilingLossPct = currentSoilingLossPct * (1.0 - cleanFraction);
    }

    currentSoilingLossPct = Math.max(0.0, currentSoilingLossPct);

    // IEC 61724-1 Soiling Ratio SR = 1.0 - (loss / 100)
    const cumulativeFactor = 1.0 - currentSoilingLossPct / 100.0;
    const soilingRatio = cumulativeFactor;

    totalLossSum += currentSoilingLossPct;

    // Track monthly average
    let cumDays = 0;
    let monthIdx = 0;
    for (let m = 0; m < 12; m++) {
      if (day <= cumDays + monthlyDays[m]) {
        monthIdx = m;
        break;
      }
      cumDays += monthlyDays[m];
    }
    monthlySums[monthIdx] += currentSoilingLossPct;

    dailyProfile.push({
      dayOfYear: day,
      rainfallMm: Number(weather.rainfallMm.toFixed(2)),
      dustStormOccurred: isDustStorm,
      manualCleanPerformed,
      dailySoilingLossPercent: Number(currentSoilingLossPct.toFixed(2)),
      cumulativeSoilingFactor: Number(cumulativeFactor.toFixed(4)),
      soilingRatio: Number(soilingRatio.toFixed(4)),
    });
  }

  // Calculate monthly averages
  for (let m = 0; m < 12; m++) {
    const monthlyAvg = monthlySums[m] / monthlyDays[m];
    if (monthlyAvg > maxMonthlyLossPct) {
      maxMonthlyLossPct = monthlyAvg;
    }
  }

  const annualAvgLoss = totalLossSum / 365.0;

  // Determine vulnerability category
  let category: SoilingSimulationResult['dustStormVulnerabilityCategory'] = 'LOW';
  if (annualAvgLoss >= 8.0 || mergedConfig.dustStormVulnerabilityFactor >= 2.2) {
    category = 'CRITICAL';
  } else if (annualAvgLoss >= 5.0 || mergedConfig.dustStormVulnerabilityFactor >= 1.7) {
    category = 'HIGH';
  } else if (annualAvgLoss >= 3.0) {
    category = 'MODERATE';
  }

  const recommendedWashes =
    mergedConfig.scheduledWashIntervalDays && mergedConfig.scheduledWashIntervalDays > 0
      ? Math.floor(365 / mergedConfig.scheduledWashIntervalDays)
      : annualAvgLoss > 5.0
      ? 4
      : 2;

  return {
    annualAverageSoilingLossPercent: Number(annualAvgLoss.toFixed(2)),
    maxMonthlySoilingLossPercent: Number(maxMonthlyLossPct.toFixed(2)),
    recommendedWashingCyclesPerYear: recommendedWashes,
    dustStormVulnerabilityCategory: category,
    dailyProfile,
  };
}
