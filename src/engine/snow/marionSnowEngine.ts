/**
 * Marion / Townsend Snow Shedding & Sliding Damming Engine
 * SolarPV Studio v3.0 - Phase 2a (PR-2a-2)
 *
 * Governing Standards & References:
 * - Marion, B., et al. (2013): "A Snow-Loss Model for Photovoltaic Systems", IEEE JPV
 * - Townsend, T., & Powers, L. (2011): "Photovoltaics and Snow: An Update from Two Cold Climates"
 * - Andrews, R. W., & Pearce, J. M. (2012): "The Effect of Snow on Photovoltaic Performance"
 * - ASCE 7-22 Chapter 7 / Eurocode 1 (EN 1991-1-3): Snow Loads on Structures
 *
 * Physics & Mechanics:
 * 1. Thermal melt when ambient temperature > slideTemperatureThresholdC (typically 0.0°C to +1.5°C).
 * 2. Gravity slide driven by array tilt angle: sliding force = m * g * sin(tilt).
 * 3. Base clearance damming: when ground snow depth approaches moduleBottomClearanceM,
 *    shed snow piles up at the lower rack edge, forming a physical dam that halts further shedding.
 * 4. Surface treatment coefficient (1.0 = standard glass, 1.25 = hydrophobic anti-stick coating).
 * 5. Structural sliding load calculation (kN/m2) for structural mounting compliance.
 */

import {
  SnowSheddingConfig,
  SnowSheddingStepResult,
  SnowSheddingSummaryResult,
  DEFAULT_SNOW_SHEDDING_CONFIG,
} from '../core/advancedInterfaces';

export { DEFAULT_SNOW_SHEDDING_CONFIG };

export interface HourlySnowWeatherStep {
  hourOfYear: number; // 1 to 8760
  ambientTempC: number;
  snowfallDepthCm: number;
  accumulatedGroundSnowCm: number;
}

/**
 * Evaluates the steady-state or post-storm module snow shedding fraction according to Marion et al. (2013).
 *
 * S_frac = 1 - exp(-gamma * sin(tilt) * max(0, T_amb - T_slide) * surfaceCoeff)
 * Subject to base clearance damming constraints: if ground snow accumulation bridges
 * the bottom rack clearance, shedding is dammed and fraction is restricted to <= 0.50.
 */
export function evaluateSheddingFraction(
  tiltDeg: number,
  ambientTempC: number,
  groundClearanceM: number = 0.80,
  accumulatedGroundSnowCm: number = 0,
  surfaceSheddingCoeff: number = 1.0,
  slideTemperatureThresholdC: number = 0.50,
  dammingRiskThresholdM: number = 0.50
): number {
  const groundSnowM = accumulatedGroundSnowCm / 100.0;
  const isDammed = groundSnowM >= Math.max(0.15, groundClearanceM - dammingRiskThresholdM);

  if (ambientTempC < slideTemperatureThresholdC) {
    return 0.0; // Below freezing threshold; snow stays frozen adhered to glass
  }

  const tiltRad = (tiltDeg * Math.PI) / 180.0;
  const sinTilt = Math.sin(tiltRad);

  if (sinTilt <= 0.05) {
    // Nearly horizontal (< 3 deg): purely thermal sublimation/melt, minimal sliding
    const thermalFraction = Math.min(0.40, 0.15 * (ambientTempC - slideTemperatureThresholdC));
    return Number(thermalFraction.toFixed(4));
  }

  // Marion (2013) exponential gravity-shear sliding coefficient gamma = 4.49
  // At tilt = 25 deg (sin(25) = 0.4226) and T_amb = 1.5 C (delta T = 1.0 C):
  // exponent = 4.49 * 0.4226 * 1.0 = 1.8975 -> 1 - exp(-1.8975) = 0.8500 (85.0% shed)
  const gamma = 4.49;
  const deltaT = Math.max(0.0, ambientTempC - slideTemperatureThresholdC);
  const rawShedFraction = 1.0 - Math.exp(-gamma * sinTilt * deltaT * surfaceSheddingCoeff);

  let finalFraction = Math.max(0.0, Math.min(1.0, rawShedFraction));

  if (isDammed) {
    // Avalanche damming at bottom rack: shed snow is trapped against lower cells
    // Tilt-dependent retention: flatter arrays retain more toe wedge
    const tiltRetentionFraction = 0.50 - 0.20 * Math.min(1.0, sinTilt / 0.5736);
    finalFraction = Math.min(tiltRetentionFraction, finalFraction);
  }

  return Number(finalFraction.toFixed(4));
}

/**
 * Calculates hourly snow shedding step and determines whether shedding occurred or was dammed.
 */
export function calculateSnowStep(
  weather: HourlySnowWeatherStep,
  config: SnowSheddingConfig,
  currentCoveredFraction: number
): SnowSheddingStepResult {
  const tiltRad = (config.tiltDeg * Math.PI) / 180.0;
  const sinTilt = Math.sin(tiltRad);

  // Fresh snowfall increases covered module fraction
  let covered = currentCoveredFraction;
  if (weather.snowfallDepthCm >= 1.5) {
    covered = 1.0; // 1.5cm or more covers front active cell area completely
  } else if (weather.snowfallDepthCm > 0) {
    covered = Math.min(1.0, currentCoveredFraction + weather.snowfallDepthCm * 0.50);
  }

  let mechanism: SnowSheddingStepResult['sheddingMechanism'] = 'none';
  const groundSnowM = weather.accumulatedGroundSnowCm / 100.0;
  const clearanceM = config.moduleBottomClearanceM ?? config.groundClearanceM ?? 0.80;
  const dammingThresholdM = config.dammingRiskThresholdM ?? 0.50;

  // Check avalanche damming at the lower frame edge
  // Townsend & Powers (2011) / Marion (2013): Low tilt arrays retain a ground/toe snow drift berm
  // because gravitational sliding shear is insufficient to cast shed snow clear of the array frame.
  // Smooth continuous logistic transition function across 5° to 35°:
  // Eliminates non-physical cliff drops between discrete tilt brackets.
  // Evaluates to: ~0.205 (5°), ~0.231 (10°), ~0.354 (15°), ~0.529 (18°), ~0.671 (20°), ~0.796 (22°), ~0.916 (25°), >0.98 (30°+)
  const tiltDammingFactor = 0.20 + 0.80 / (1.0 + Math.exp(-(config.tiltDeg - 19.0) / 2.8));
  const effectiveClearanceM = clearanceM * tiltDammingFactor;
  const isDammed = groundSnowM >= Math.max(0.08, effectiveClearanceM - dammingThresholdM * 0.5);

  if (covered > 0) {
    if (isDammed && covered >= 0.25) {
      mechanism = 'dammed_at_base';
      // Dammed snow forms a barrier wedge trapping lower cells.
      // Continuous tilt-dependent retention: flat arrays retain more snow wedge (~0.55 at 5°) than moderate tilt arrays (~0.36 at 15°, ~0.24 at 25°)
      const tiltRetentionScale = 0.60 - 0.35 * Math.min(1.0, Math.sin(tiltRad) / Math.sin((35.0 * Math.PI) / 180.0));
      const dammedRetention = Math.max(0.15, Math.min(0.60, tiltRetentionScale + (groundSnowM - 0.08) * 0.25));
      // Thermal melt clears dammed snow during warm thaw periods:
      const thermalClearing = weather.ambientTempC >= config.slideTemperatureThresholdC
        ? 0.06 * (weather.ambientTempC - config.slideTemperatureThresholdC)
        : 0.0;
      covered = Math.max(dammedRetention, covered - 0.02 - thermalClearing);
    } else if (weather.ambientTempC >= config.slideTemperatureThresholdC) {
      // Thermal slide / melt conditions: degree-day thermal lubrication + gravity shear slide
      const deltaT = Math.max(0.1, weather.ambientTempC - config.slideTemperatureThresholdC);
      const baseThermalMelt = 0.05 * deltaT * config.surfaceSheddingCoeff;
      const gravitySlideSpeed = 0.28 * sinTilt * deltaT * config.surfaceSheddingCoeff;
      const totalClearingRate = Math.min(0.40, baseThermalMelt + gravitySlideSpeed);

      mechanism = sinTilt >= 0.18 ? 'gravity_slide' : 'thermal_melt';
      covered = Math.max(0.0, covered - totalClearingRate);
    }
  }

  // Structural snow load (kN/m2) adhering to ASCE 7-22 Chapter 7 / Eurocode 1 (EN 1991-1-3):
  // Density conversion: rho (kg/m3) * g (9.80665 m/s2) / 1000 = gamma (kN/m3)
  // - Fresh uncompacted snow: 100 kg/m3 -> 0.981 kN/m3
  // - Settled wet winter snow: 200-250 kg/m3 -> 1.96-2.45 kN/m3
  // - Structural design packed snow: 300-500 kg/m3 -> 2.94-4.90 kN/m3
  const densityKgM3 = config.snowDensityKgPerM3 ?? 100.0;
  const snowUnitWeightKnM3 = (densityKgM3 * 9.80665) / 1000.0;
  const snowDepthM = weather.snowfallDepthCm / 100.0;
  const structuralLoad = snowDepthM * snowUnitWeightKnM3 * Math.cos(tiltRad) * covered;

  // Energy loss percentage is proportional to covered module fraction
  const snowLossPct = covered * 100.0;

  return {
    hourOfYear: weather.hourOfYear,
    ambientTempC: weather.ambientTempC,
    snowfallDepthCm: weather.snowfallDepthCm,
    moduleCoveredFraction: Number(covered.toFixed(3)),
    sheddingMechanism: mechanism,
    snowLossPercent: Number(snowLossPct.toFixed(2)),
    structuralSlidingLoadKnM2: Number(structuralLoad.toFixed(3)),
  };
}

/**
 * Simulates annual snow coverage and avalanche damming risk.
 */
export function simulateAnnualSnowShedding(
  config: Partial<SnowSheddingConfig> = {},
  weatherHourly: HourlySnowWeatherStep[] = []
): SnowSheddingSummaryResult {
  const mergedConfig: SnowSheddingConfig = {
    ...DEFAULT_SNOW_SHEDDING_CONFIG,
    ...config,
  };

  let currentCover = 0.0;
  let totalLossHours = 0;
  let coveredHoursCount = 0;
  let maxLoadKnM2 = 0.0;
  let dammedHoursCount = 0;

  const totalSteps = weatherHourly.length > 0 ? weatherHourly.length : 8760;

  for (let h = 1; h <= totalSteps; h++) {
    const weather = weatherHourly[h - 1] ?? {
      hourOfYear: h,
      ambientTempC: 15.0, // Default warm if no snow input
      snowfallDepthCm: 0,
      accumulatedGroundSnowCm: 0,
    };

    const stepRes = calculateSnowStep(weather, mergedConfig, currentCover);
    currentCover = stepRes.moduleCoveredFraction;

    totalLossHours += stepRes.snowLossPercent;
    if (stepRes.moduleCoveredFraction > 0.05) {
      coveredHoursCount++;
    }
    if (stepRes.sheddingMechanism === 'dammed_at_base') {
      dammedHoursCount++;
    }
    if (stepRes.structuralSlidingLoadKnM2 > maxLoadKnM2) {
      maxLoadKnM2 = stepRes.structuralSlidingLoadKnM2;
    }
  }

  const annualSnowLossPercent = totalSteps > 0 ? totalLossHours / totalSteps : 0.0;
  const snowCoverageDays = Math.round(coveredHoursCount / 24.0);

  // Damming risk categorization
  let dammingRisk: SnowSheddingSummaryResult['avalancheDammingRisk'] = 'NONE';
  if (dammedHoursCount > 150) {
    dammingRisk = 'SEVERE';
  } else if (dammedHoursCount > 50) {
    dammingRisk = 'ELEVATED';
  } else if (dammedHoursCount > 0) {
    dammingRisk = 'LOW';
  }

  return {
    annualSnowLossPercent: Number(annualSnowLossPercent.toFixed(2)),
    snowCoverageDays,
    avalancheDammingRisk: dammingRisk,
    maxSnowStructuralLoadKnM2: Number(maxLoadKnM2.toFixed(3)),
  };
}

/**
 * Calculates structural snow load (kN/m2) on tilted PV arrays according to ASCE 7-22 and Eurocode 1.
 *
 * @param snowfallDepthCm Snow depth in cm
 * @param tiltDeg Array tilt in degrees
 * @param snowDensityKgPerM3 Snow density in kg/m3 (default 100 for fresh uncompacted, 300 for aged/structural design)
 * @returns Normal structural surface load in kN/m2
 */
export function calculateSnowStructuralLoad(
  snowfallDepthCm: number,
  tiltDeg: number,
  snowDensityKgPerM3: number = 100.0
): number {
  const tiltRad = (tiltDeg * Math.PI) / 180.0;
  const unitWeightKnM3 = (snowDensityKgPerM3 * 9.80665) / 1000.0;
  const depthM = snowfallDepthCm / 100.0;
  return Number((depthM * unitWeightKnM3 * Math.cos(tiltRad)).toFixed(4));
}

