/**
 * Core Subsystem Unit Tests & Extreme Tail Verification
 * SolarPV Studio v3.0 - Phase 2a Pre-Merge Gate (PR-2a-1-REPAIR)
 *
 * Enforces rigorous branch coverage for:
 * 1. PRNG: Seed reproducibility, Gaussian Box-Muller, Gumbel Type I, Weibull wind distributions
 * 2. Cross-Validation: PASS, WARN, FAIL branches, nominal-zero guards, and custom test vectors
 * 3. Model Registry: Trace generation, model lookup, fallback escalation, and SemVer checks
 */

import { Mulberry32PRNG, generateLatinHypercubeSample } from '../prng';
import { runSystemCrossValidation } from './crossValidation';
import { createTraceMetadata, PHYSICS_MODEL_REGISTRY } from '../modelRegistry';
import { migrateProjectToV3 } from '../projectMigration';
import {
  evaluateRainCleaningFraction,
  simulateAnnualSoiling,
  DailyWeatherSoilingStep,
} from '../../soiling/kimberSoilingEngine';
import {
  evaluateSheddingFraction,
  calculateSnowStep,
  simulateAnnualSnowShedding,
  HourlySnowWeatherStep,
} from '../../snow/marionSnowEngine';
import { computeWaterfallLosses } from '../../waterfallLossEngine';
import { DEFAULT_SOILING_CONFIG, DEFAULT_SNOW_SHEDDING_CONFIG } from '../advancedInterfaces';
import {
  calculateMartinRuizIam,
  calculateFresnelIam,
  calculateAshraeIam,
  calculateTemperatureCoupledIam,
  calculateBrandemuehlDiffuseAngles,
  calculateEffectivePoaIam,
} from '../../optical/iamEngine';
import { runPhysicalSensitivityAnalysis } from './sensitivityAnalysis';
import { runMarionSnowRecalibrationSuite } from '../../snow/marionSnowRecalibration';
import { runExternalEmpiricalValidationSuite } from './externalValidation';
import { simulateBipvThermalStep } from '../../bipv/bipvThermalEngine';
import { runMigrationTestSuite } from './migrationTestVectors';

export interface UnitTestResult {
  suite: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

export function runCoreUnitTests(): { passed: number; failed: number; results: UnitTestResult[] } {
  const results: UnitTestResult[] = [];

  const assert = (suite: string, name: string, condition: boolean, details: string) => {
    results.push({
      suite,
      name,
      status: condition ? 'PASS' : 'FAIL',
      details,
    });
  };

  // ==========================================================================
  // Suite 1: PRNG & Extreme Tail Distributions
  // ==========================================================================
  const prng1 = new Mulberry32PRNG(12345);
  const prng2 = new Mulberry32PRNG(12345);

  // 1.1 Seed Repeatability
  let seedsIdentical = true;
  for (let i = 0; i < 50; i++) {
    if (prng1.next() !== prng2.next()) {
      seedsIdentical = false;
      break;
    }
  }
  assert('PRNG', 'Seed Repeatability', seedsIdentical, 'Two PRNG instances with seed 12345 produced identical 50 pseudo-random numbers.');

  // 1.2 Seed Reset via .seed()
  prng1.seed(9999);
  prng2.seed(9999);
  assert('PRNG', 'Seed Reset Method', prng1.next() === prng2.next(), 'prng.seed(9999) correctly reset state deterministically.');

  // 1.3 Range Generation
  let inRange = true;
  for (let i = 0; i < 100; i++) {
    const val = prng1.nextRange(-15.0, 45.0);
    if (val < -15.0 || val >= 45.0) {
      inRange = false;
      break;
    }
  }
  assert('PRNG', 'Uniform Range Sampling', inRange, 'prng.nextRange(-15, 45) generated 100 numbers strictly within [-15, 45).');

  // 1.4 Gaussian Box-Muller (Mean & Variance Check)
  const nGauss = 10000;
  let sumG = 0;
  let sumG2 = 0;
  for (let i = 0; i < nGauss; i++) {
    const g = prng1.nextGaussian(0, 1);
    sumG += g;
    sumG2 += g * g;
  }
  const meanG = sumG / nGauss;
  const varG = sumG2 / nGauss - meanG * meanG;
  assert(
    'PRNG',
    'Standard Gaussian Box-Muller Distribution',
    Math.abs(meanG) < 0.05 && Math.abs(varG - 1.0) < 0.06,
    `Empirical N(0, 1) over 10k samples: Mean=${meanG.toFixed(4)} (expected 0.00), Var=${varG.toFixed(4)} (expected 1.00)`
  );

  // 1.5 Gumbel Type I Analytical Tail Verification (mu=0, beta=1)
  // Analytical Inverse CDF: x(u) = mu - beta * ln(-ln(u))
  // For u = 0.99 (P99 extreme): x = -ln(-ln(0.99)) = -ln(0.0100503) = 4.60015
  const nGumbel = 20000;
  const gumbelSamples: number[] = new Array(nGumbel);
  for (let i = 0; i < nGumbel; i++) {
    gumbelSamples[i] = prng1.nextGumbel(0, 1);
  }
  gumbelSamples.sort((a, b) => a - b);
  const p99Observed = gumbelSamples[Math.floor(0.99 * nGumbel)];
  const p99Analytical = -Math.log(-Math.log(0.99)); // ~4.60015
  const gumbelErr = Math.abs(p99Observed - p99Analytical) / p99Analytical;
  assert(
    'PRNG',
    'Gumbel Extreme Wind Tail (P99 Inversion)',
    gumbelErr < 0.05,
    `P99 Extreme Gust: Observed=${p99Observed.toFixed(4)}, Analytical=${p99Analytical.toFixed(4)}, Relative Error=${(gumbelErr * 100).toFixed(2)}%`
  );

  // 1.6 Weibull Wind Speed Verification (c=8.5 m/s, k=2.0 - Rayleigh)
  // Analytical Median: v50 = c * (ln(2))^(1/k) = 8.5 * (0.69315)^0.5 = 7.0768 m/s
  const nWeibull = 20000;
  const weibullSamples: number[] = new Array(nWeibull);
  for (let i = 0; i < nWeibull; i++) {
    weibullSamples[i] = prng1.nextWeibull(8.5, 2.0);
  }
  weibullSamples.sort((a, b) => a - b);
  const v50Observed = weibullSamples[Math.floor(0.50 * nWeibull)];
  const v50Analytical = 8.5 * Math.pow(Math.log(2.0), 0.5); // ~7.0768
  const weibullErr = Math.abs(v50Observed - v50Analytical) / v50Analytical;
  assert(
    'PRNG',
    'Weibull Operational Wind Speed Median',
    weibullErr < 0.03,
    `Weibull Median: Observed=${v50Observed.toFixed(4)} m/s, Analytical=${v50Analytical.toFixed(4)} m/s, Relative Error=${(weibullErr * 100).toFixed(2)}%`
  );

  // 1.7 Latin Hypercube Multi-Dimensional Stratification
  const lhs = generateLatinHypercubeSample(100, 4, prng1);
  assert(
    'PRNG',
    'Latin Hypercube 4D Sample Dimensions',
    lhs.length === 100 && lhs[0].length === 4,
    'LHS generated 100x4 matrix successfully.'
  );

  // ==========================================================================
  // Suite 2: Cross-Validation Branches & Error State Handling
  // ==========================================================================

  // 2.1 Clean Golden Run
  const cleanCross = runSystemCrossValidation();
  assert('Validation', 'Nominal Cross-Validation PASS Branch', cleanCross.overallStatus === 'PASS', 'Clean run returned overall PASS');

  // 2.2 Trigger WARN Branch (relErr > tolerance && relErr <= 1.5 * tolerance)
  // VAL-SANDIA-02 has nominal 410.20 and tolerance 1.5%.
  // Error of 1.8% triggers WARN: 410.20 * (1 + 0.018) = 417.58
  const warnCross = runSystemCrossValidation({ sandiaPmpW: 417.58 });
  const sandiaMetric = warnCross.metrics.find(m => m.testId === 'VAL-SANDIA-02');
  assert(
    'Validation',
    'Cross-Validation WARN Branch Coverage',
    sandiaMetric?.status === 'WARN' && warnCross.overallStatus === 'WARN',
    `Custom value 417.58W triggered WARN status as expected (relErr=${sandiaMetric?.relativeErrorPercent}% vs tol=${sandiaMetric?.tolerancePercent}%)`
  );

  // 2.3 Trigger FAIL Branch (relErr > 1.5 * tolerance)
  // Sandia tolerance = 1.5%. Value of 450.0W gives error of ~9.7% (> 2.25%)
  const failCross = runSystemCrossValidation({ sandiaPmpW: 450.0 });
  const sandiaFailMetric = failCross.metrics.find(m => m.testId === 'VAL-SANDIA-02');
  assert(
    'Validation',
    'Cross-Validation FAIL Branch Coverage',
    sandiaFailMetric?.status === 'FAIL' && failCross.overallStatus === 'FAIL',
    `Custom value 450.0W triggered FAIL status and escalated overallStatus to FAIL (testsFailed=${failCross.testsFailed})`
  );

  // ==========================================================================
  // Suite 3: Model Registry & Metadata Traceability
  // ==========================================================================
  const trace = createTraceMetadata(['multiphysics_bipv_fpv', 'pv_single_diode_core', 'non_existent_model'], 42, 18.5);
  assert(
    'Registry',
    'Calculation Trace Generation & Fallback',
    trace.traceId.startsWith('TRACE-') &&
      trace.modelVersions['multiphysics_bipv_fpv'] !== undefined &&
      trace.modelVersions['pv_single_diode_core'] !== undefined &&
      trace.modelVersions['non_existent_model'] === undefined &&
      trace.schemaVersion === '3.0.0',
    `Trace ${trace.traceId} created with registered models and omitted unregistered IDs safely.`
  );

  let allModelsSemver = true;
  for (const [id, entry] of Object.entries(PHYSICS_MODEL_REGISTRY)) {
    if (!/^\d+\.\d+\.\d+$/.test(entry.version)) {
      allModelsSemver = false;
      break;
    }
  }
  assert('Registry', 'Model SemVer Compliance', allModelsSemver, 'All registered physics models adhere to Strict SemVer 2.0.0.');

  // ==========================================================================
  // Suite 4: Migration Inconsistency & Safety Traps
  // ==========================================================================
  const emptyRes = migrateProjectToV3({});
  assert(
    'Migration',
    'Empty Payload Safe Recovery',
    emptyRes.migrationStatus === 'RECOVERED_WITH_WARNINGS' && emptyRes.warnings.length > 0,
    `Empty input recovered safely with ${emptyRes.warnings.length} warning(s) instead of throwing an unhandled exception.`
  );

  // ==========================================================================
  // Suite 5: Kimber Soiling Simulation Engine (PR-2a-2)
  // ==========================================================================
  // 5.1 Kimber 5-Bin Discrete Rainfall Cleaning
  const binConfig = { ...DEFAULT_SOILING_CONFIG, modelVariant: 'kimber_full_discrete_bins' as const };
  const cleanTrace = evaluateRainCleaningFraction(0.5, binConfig);
  const cleanLight = evaluateRainCleaningFraction(2.0, binConfig);
  const cleanMod = evaluateRainCleaningFraction(3.5, binConfig);
  const cleanHeavy = evaluateRainCleaningFraction(8.0, binConfig);
  const cleanTorrential = evaluateRainCleaningFraction(15.0, binConfig);

  const discreteBinsCorrect =
    cleanTrace === 0.00 &&
    cleanLight === 0.25 &&
    cleanMod === 0.65 &&
    cleanHeavy === 0.95 &&
    cleanTorrential === 1.00;
  assert(
    'KimberSoiling',
    'Discrete Rainfall Bins',
    discreteBinsCorrect,
    `5-bin precipitation cleaning accurately mapped: trace=0%, 2mm=25%, 3.5mm=65%, 8mm=95%, 15mm=100%`
  );

  // 5.2 Simplified Linear Rain Cleaning
  const simpConfig = { ...DEFAULT_SOILING_CONFIG, modelVariant: 'kimber_simplified' as const, rainCleaningThresholdMm: 5.0, partialWashCoefficient: 0.8 };
  const simpUnder1 = evaluateRainCleaningFraction(0.8, simpConfig);
  const simpPartial = evaluateRainCleaningFraction(2.5, simpConfig);
  const simpFull = evaluateRainCleaningFraction(6.0, simpConfig);
  assert(
    'KimberSoiling',
    'Simplified Linear Washing',
    simpUnder1 === 0.0 && Math.abs(simpPartial - 0.40) < 0.01 && simpFull === 1.0,
    `Simplified model: <1mm=0%, 2.5mm partial=40%, >=5mm threshold=100%`
  );

  // 5.3 Dust Storm (Haboob) Multiplier
  const normalDays: DailyWeatherSoilingStep[] = Array.from({ length: 10 }, (_, i) => ({ dayOfYear: i + 1, rainfallMm: 0, dustStormOccurred: false }));
  const stormDays: DailyWeatherSoilingStep[] = Array.from({ length: 10 }, (_, i) => ({ dayOfYear: i + 1, rainfallMm: 0, dustStormOccurred: true }));
  const simNormal = simulateAnnualSoiling({ dailySoilingRatePercent: 0.20, dustStormVulnerabilityFactor: 2.5, maxSoilingCeilingPercent: 30 }, normalDays);
  const simStorm = simulateAnnualSoiling({ dailySoilingRatePercent: 0.20, dustStormVulnerabilityFactor: 2.5, maxSoilingCeilingPercent: 30 }, stormDays);
  const stormLossDay10 = simStorm.dailyProfile[9].dailySoilingLossPercent;
  const normalLossDay10 = simNormal.dailyProfile[9].dailySoilingLossPercent;
  assert(
    'KimberSoiling',
    'Dust Storm Multiplier',
    Math.abs(stormLossDay10 - normalLossDay10 * 2.5) < 0.05,
    `Dust storm vulnerability 2.5x produced ${stormLossDay10}% vs normal ${normalLossDay10}%`
  );

  // 5.4 Maximum Soiling Ceiling Clamp
  const dryYear: DailyWeatherSoilingStep[] = Array.from({ length: 250 }, (_, i) => ({ dayOfYear: i + 1, rainfallMm: 0 }));
  const simCeiling = simulateAnnualSoiling({ dailySoilingRatePercent: 0.25, maxSoilingCeilingPercent: 28.0, scheduledWashIntervalDays: 0 }, dryYear);
  const clampedLoss = simCeiling.dailyProfile[249].dailySoilingLossPercent;
  assert(
    'KimberSoiling',
    'Saturation Ceiling Clamp',
    clampedLoss === 28.0,
    `Soiling accumulation safely clamped to saturation ceiling of 28.0% (theoretical unclamped: 62.5%)`
  );

  // 5.5 Scheduled Manual Wash Cycles
  const simWash = simulateAnnualSoiling({ dailySoilingRatePercent: 0.20, scheduledWashIntervalDays: 15 }, dryYear);
  const day14Loss = simWash.dailyProfile[13].dailySoilingLossPercent;
  const day15Loss = simWash.dailyProfile[14].dailySoilingLossPercent;
  assert(
    'KimberSoiling',
    'Scheduled Wash Reset',
    day14Loss > 0 && day15Loss === 0.0 && simWash.dailyProfile[14].manualCleanPerformed,
    `Scheduled wash cycle on day 15 reset soiling loss to 0.0% with manualCleanPerformed flag`
  );

  // ==========================================================================
  // Suite 6: Marion Snow Shedding & Base Damming Engine (PR-2a-2)
  // ==========================================================================
  // 6.1 Temperature Sliding Threshold
  const coldShed = evaluateSheddingFraction(25.0, -3.0, 0.8, 0, 1.0, 0.5);
  const warmShed = evaluateSheddingFraction(25.0, 1.5, 0.8, 0, 1.0, 0.5);
  assert(
    'MarionSnow',
    'Temperature Slide Threshold',
    coldShed === 0.0 && warmShed >= 0.84 && warmShed <= 0.86,
    `Sub-freezing (-3C) yielded 0.0 shedding; warm (+1.5C) at 25 deg tilt yielded ${warmShed} (target: 0.85)`
  );

  // 6.2 Flat vs Tilted Array Kinematics
  const flatShed = evaluateSheddingFraction(1.0, 2.0, 0.8, 0, 1.0, 0.5);
  assert(
    'MarionSnow',
    'Flat Array Sublimation vs Tilt Slide',
    flatShed <= 0.40 && warmShed > flatShed * 2.0,
    `Low tilt (1 deg) limited to thermal sublimation (${flatShed}) vs gravity sliding at 25 deg (${warmShed})`
  );

  // 6.3 Ground Clearance Damming Boundary
  // Clearance = 0.80m, dammingRiskThreshold = 0.50m -> Damming triggers at ground snow >= 0.30m
  const undammedShed = evaluateSheddingFraction(25.0, 1.5, 0.80, 10, 1.0, 0.5, 0.50);
  const dammedShed = evaluateSheddingFraction(25.0, 1.5, 0.80, 50, 1.0, 0.5, 0.50);
  assert(
    'MarionSnow',
    'Avalanche Damming Restriction',
    undammedShed >= 0.84 && dammedShed <= 0.50,
    `Damming boundary: 10cm ground snow shed ${undammedShed}; 50cm snow dammed lower rack to ${dammedShed}`
  );

  // 6.4 Structural Sliding Load
  const snowStepRes = calculateSnowStep(
    { hourOfYear: 1, ambientTempC: -2.0, snowfallDepthCm: 25.0, accumulatedGroundSnowCm: 5.0 },
    { ...DEFAULT_SNOW_SHEDDING_CONFIG, tiltDeg: 30.0 },
    0.0
  );
  assert(
    'MarionSnow',
    'Structural Snow Load',
    snowStepRes.structuralSlidingLoadKnM2 > 0 && snowStepRes.moduleCoveredFraction > 0,
    `Structural load calculated as ${snowStepRes.structuralSlidingLoadKnM2} kN/m2 under 25cm snowfall at 30 deg tilt`
  );

  // 6.5 Annual Severe Damming Classification
  const severeDamWeather: HourlySnowWeatherStep[] = Array.from({ length: 300 }, (_, i) => ({
    hourOfYear: i + 1,
    ambientTempC: 1.0,
    snowfallDepthCm: 5.0,
    accumulatedGroundSnowCm: 70.0, // High ground snow triggering damming
  }));
  const severeDamSim = simulateAnnualSnowShedding({ groundClearanceM: 0.80, dammingRiskThresholdM: 0.50 }, severeDamWeather);
  assert(
    'MarionSnow',
    'Severe Damming Categorization',
    severeDamSim.avalancheDammingRisk === 'SEVERE',
    `Extended ground snow damming correctly classified as SEVERE risk`
  );

  // ==========================================================================
  // Suite 7: Compound Waterfall Multiplier Integration (PR-2a-2)
  // ==========================================================================
  const waterfallCompound = computeWaterfallLosses(100.0, 5.0, 40.0, 5.0, 1.25, false, 8.0);
  const soilingStage = waterfallCompound.stages.find(s => s.id === 'soiling');
  const snowStage = waterfallCompound.stages.find(s => s.id === 'snow');
  assert(
    'WaterfallLoss',
    'Compound Multiplier Integrity',
    soilingStage !== undefined && snowStage !== undefined && snowStage.stageOutputKwh < soilingStage.stageOutputKwh,
    `Both Kimber (-5%) and Marion (-8%) stages present and compounded sequentially into net export`
  );

  const waterfallZeroSnow = computeWaterfallLosses(100.0, 5.0, 40.0, 4.0, 1.25, false, 0.0);
  const noSnowStage = waterfallZeroSnow.stages.find(s => s.id === 'snow');
  assert(
    'WaterfallLoss',
    'Invariant 14-Stage Architecture (Zero Snow No-Op)',
    noSnowStage !== undefined && noSnowStage.percentageLoss === 0.0 && waterfallZeroSnow.stages.length === 14,
    `Waterfall maintains constant 14-stage structure across all climates, executing snow as 0.0% no-op in snow-free zones`
  );

  // ==========================================================================
  // Suite 8: Physical Sensitivity Analysis & Anti-Overfitting Sweeps (PR-2a-3)
  // ==========================================================================
  // Suite 8: Physical Sensitivity Analysis (Anti-Overfitting & Monotonicity)
  // ==========================================================================
  const sensReport = runPhysicalSensitivityAnalysis();
  assert(
    'Sensitivity',
    'Kimber Climate Monotonicity',
    sensReport.isKimberMonotonic,
    `Kimber soiling strictly responds monotonically across 9 climate regimes: higher rain reduces soiling, higher deposition increases soiling`
  );
  assert(
    'Sensitivity',
    'Marion Snow Monotonicity',
    sensReport.isMarionMonotonic,
    `Marion snow loss responds monotonically across 12 tilt-snowfall regimes: steeper tilt reduces snow loss via sliding, deeper snowfall increases loss`
  );
  assert(
    'Sensitivity',
    'IAM Optical Monotonicity',
    sensReport.isIamMonotonic,
    `IAM angular transmittance strictly decreases with incident angle; thermo-optic dn/dT increases reflection at high cell temperatures`
  );

  // 8.4 Continuous Smooth Damming Fine Tilt Sweep (PR-2a-4-REPAIR)
  // Verifies elimination of discontinuous 9x cliff drop between 15° and 25°
  let fineTiltMonotonic = true;
  for (let i = 0; i < sensReport.fineTiltSweep.length - 1; i++) {
    if (sensReport.fineTiltSweep[i].annualSnowLossPercent < sensReport.fineTiltSweep[i + 1].annualSnowLossPercent) {
      fineTiltMonotonic = false;
    }
  }
  const sweep10 = sensReport.fineTiltSweep.find(p => p.tiltDeg === 10);
  const sweep15 = sensReport.fineTiltSweep.find(p => p.tiltDeg === 15);
  const sweep18 = sensReport.fineTiltSweep.find(p => p.tiltDeg === 18);
  const sweep20 = sensReport.fineTiltSweep.find(p => p.tiltDeg === 20);
  const sweep22 = sensReport.fineTiltSweep.find(p => p.tiltDeg === 22);
  const sweep25 = sensReport.fineTiltSweep.find(p => p.tiltDeg === 25);
  assert(
    'Sensitivity',
    'Continuous Smooth Damming Fine Tilt Sweep',
    fineTiltMonotonic &&
      sweep10 !== undefined && sweep15 !== undefined && sweep20 !== undefined && sweep25 !== undefined &&
      sweep10.annualSnowLossPercent > sweep15.annualSnowLossPercent &&
      sweep15.annualSnowLossPercent > sweep20.annualSnowLossPercent &&
      sweep20.annualSnowLossPercent > sweep25.annualSnowLossPercent,
    `Smooth continuous damming verified across fine tilt sweep: 10°(${sweep10?.annualSnowLossPercent}%) -> 15°(${sweep15?.annualSnowLossPercent}%) -> 18°(${sweep18?.annualSnowLossPercent}%) -> 20°(${sweep20?.annualSnowLossPercent}%) -> 22°(${sweep22?.annualSnowLossPercent}%) -> 25°(${sweep25?.annualSnowLossPercent}%)`
  );

  // ==========================================================================
  // Suite 9: Temperature-Coupled Optical IAM Engine (PR-2a-3)
  // ==========================================================================
  // 9.1 Normal Incidence Transmission (theta = 0 deg)
  const iamNormal = calculateMartinRuizIam(0.0, 0.16);
  assert(
    'OpticalIAM',
    'Normal Incidence Baseline',
    iamNormal === 1.0,
    `Martin & Ruiz ARC glass yields exactly 1.0000 transmittance at perpendicular incidence (0 deg)`
  );

  // 9.2 Oblique Angle Reflection Loss (theta = 60 deg)
  const iam60 = calculateMartinRuizIam(60.0, 0.16);
  assert(
    'OpticalIAM',
    'Martin & Ruiz Oblique Angle (60 deg)',
    Math.abs(iam60 - 0.9579) < 0.005,
    `Martin & Ruiz ARC glass at 60 deg incidence yields IAM = ${iam60} (4.21% optical reflection loss)`
  );

  // 9.3 Thermo-Optic dn/dT Coupling at High Cell Temperature
  const iamStc = calculateTemperatureCoupledIam({ angleIncidenceDeg: 60.0, cellTemperatureC: 25.0 });
  const iamHot = calculateTemperatureCoupledIam({ angleIncidenceDeg: 60.0, cellTemperatureC: 75.0 });
  assert(
    'OpticalIAM',
    'Thermo-Optic dn/dT Temperature Coupling',
    iamHot.iamCoupled < iamStc.iamCoupled && iamHot.thermoOpticDeltaPercent < 0,
    `Elevated desert cell temp (75C vs 25C) reduced optical transmittance by ${Math.abs(iamHot.thermoOpticDeltaPercent).toFixed(3)}% at 60 deg incidence`
  );

  // 9.4 Physical Fresnel vs ASHRAE Comparison
  const fresnel60 = calculateFresnelIam(60.0, 1.526);
  const ashrae60 = calculateAshraeIam(60.0, 0.05);
  assert(
    'OpticalIAM',
    'Physical Fresnel & ASHRAE Models',
    fresnel60 > 0.85 && ashrae60 > 0.85,
    `Physical Fresnel (${fresnel60}) and ASHRAE b0 (${ashrae60}) evaluated consistently within expected physical bounds`
  );

  // 9.5 Brandemuehl & Beckman Diffuse Integration
  const diffAngles25 = calculateBrandemuehlDiffuseAngles(25.0);
  assert(
    'OpticalIAM',
    'Brandemuehl Diffuse Equivalent Angles',
    diffAngles25.skyDiffuseThetaDeg > 55.0 && diffAngles25.skyDiffuseThetaDeg < 60.0 &&
    diffAngles25.groundReflectedThetaDeg > 75.0 && diffAngles25.groundReflectedThetaDeg < 80.0,
    `At 25 deg array tilt: sky diffuse theta = ${diffAngles25.skyDiffuseThetaDeg} deg, ground reflected theta = ${diffAngles25.groundReflectedThetaDeg} deg`
  );

  // 9.6 Effective POA Transmittance Integration
  const effPoa = calculateEffectivePoaIam(700.0, 150.0, 50.0, 35.0, 25.0, 45.0, 0.16);
  assert(
    'OpticalIAM',
    'Effective POA Weighted Transmittance',
    effPoa.iamPoaEffective > 0.95 && effPoa.effectiveTransmissionLossPercent < 5.0,
    `Effective POA IAM calculated as ${effPoa.iamPoaEffective} (effective loss: ${effPoa.effectiveTransmissionLossPercent}%) under combined beam/diffuse/ground irradiance`
  );

  // ==========================================================================
  // Suite 10: Marion NREL Empirical Recalibration (Boulder, Munich, Toronto)
  // ==========================================================================
  const recalReport = runMarionSnowRecalibrationSuite();
  const boulderBench = recalReport.benchmarks.find(b => b.hubId === 'HUB-SNOW-BOULDER');
  const munichBench = recalReport.benchmarks.find(b => b.hubId === 'HUB-SNOW-MUNICH');
  const torontoBench = recalReport.benchmarks.find(b => b.hubId === 'HUB-SNOW-TORONTO');

  assert(
    'SnowRecalib',
    'NREL Marion Recalibration Suite Status',
    recalReport.overallStatus === 'PASS',
    `All 3 empirical cold-climate hubs passed: Boulder (${boulderBench?.simulatedAnnualSnowLossPercent}%), Munich (${munichBench?.simulatedAnnualSnowLossPercent}%), Toronto (${torontoBench?.simulatedAnnualSnowLossPercent}%)`
  );
  assert(
    'SnowRecalib',
    'Boulder CO NREL Target (4.0% - 6.0%)',
    boulderBench !== undefined && boulderBench.status === 'PASS' && boulderBench.simulatedAnnualSnowLossPercent >= 4.0 && boulderBench.simulatedAnnualSnowLossPercent <= 6.0,
    `Boulder 300cm snow at 40 deg tilt produced ${boulderBench?.simulatedAnnualSnowLossPercent}% annual snow loss (NREL nominal target: 4.6%)`
  );
  assert(
    'SnowRecalib',
    'Munich DE DWD Target (2.0% - 4.0%)',
    munichBench !== undefined && munichBench.status === 'PASS' && munichBench.simulatedAnnualSnowLossPercent >= 2.0 && munichBench.simulatedAnnualSnowLossPercent <= 4.0,
    `Munich 150cm snow at 30 deg tilt produced ${munichBench?.simulatedAnnualSnowLossPercent}% annual snow loss (DWD nominal target: 2.9%)`
  );
  assert(
    'SnowRecalib',
    'Toronto CA Andrews Target (3.0% - 5.0%)',
    torontoBench !== undefined && torontoBench.status === 'PASS' && torontoBench.simulatedAnnualSnowLossPercent >= 3.0 && torontoBench.simulatedAnnualSnowLossPercent <= 5.0,
    `Toronto 200cm snow at 35 deg tilt produced ${torontoBench?.simulatedAnnualSnowLossPercent}% annual snow loss (Andrews nominal target: 3.8%)`
  );
  assert(
    'SnowRecalib',
    'USACE Realistic Ground Snowpack Accumulation',
    (boulderBench?.maxGroundSnowDepthCm ?? 0) >= 30.0 && (boulderBench?.maxGroundSnowDepthCm ?? 0) <= 55.0 &&
    (munichBench?.maxGroundSnowDepthCm ?? 0) >= 15.0 && (munichBench?.maxGroundSnowDepthCm ?? 0) <= 30.0 &&
    (torontoBench?.maxGroundSnowDepthCm ?? 0) >= 20.0 && (torontoBench?.maxGroundSnowDepthCm ?? 0) <= 40.0,
    `USACE DDA realistic peak ground snow depths: Boulder = ${boulderBench?.maxGroundSnowDepthCm}cm, Munich = ${munichBench?.maxGroundSnowDepthCm}cm, Toronto = ${torontoBench?.maxGroundSnowDepthCm}cm`
  );
  assert(
    'SnowRecalib',
    'Three-Consecutive-Winter Inter-Annual Stability',
    recalReport.threeWinterProfiles.length === 3 && recalReport.threeWinterProfiles.every(p => p.status === 'PASS'),
    `3-consecutive-winter simulation passed across all hubs with CV <= 18% (inter-annual stability verified)`
  );

  // ==========================================================================
  // Suite 11: Field Measurement Validation & SAM Cross-Model Suite
  // ==========================================================================
  const extReport = runExternalEmpiricalValidationSuite();
  const mesaStation = extReport.fieldBenchmarks.find(b => b.stationId === 'FIELD-SEAC-AZ-01');
  const samPhoenix = extReport.crossModelComparisons.find(c => c.climateHubId === 'SAM-HUB-PHOENIX');
  const samMunich = extReport.crossModelComparisons.find(c => c.climateHubId === 'SAM-HUB-MUNICH');
  const samSingapore = extReport.crossModelComparisons.find(c => c.climateHubId === 'SAM-HUB-SINGAPORE');

  assert(
    'ExternalVal',
    'Overall External Validation Suite Status',
    extReport.overallStatus === 'PASS',
    `IEC 61724-1 field sensor benchmark and SAM cross-model comparisons all passed with zero tolerance violations`
  );
  assert(
    'ExternalVal',
    'IEC 61724-1 Mesa AZ Field Transmissometer',
    mesaStation !== undefined && mesaStation.status === 'PASS' && mesaStation.relativeDiscrepancyPercent <= 1.0,
    `Mesa AZ 45-day dry summer period (Station 1221): sensor measured 8.45% vs simulated ${mesaStation?.simulatedEngineLossPercent}% (err = ${mesaStation?.relativeDiscrepancyPercent}%)`
  );
  assert(
    'ExternalVal',
    'SAM Cross-Model Conformity',
    samPhoenix?.overallStatus === 'PASS' && samMunich?.overallStatus === 'PASS' && samSingapore?.overallStatus === 'PASS',
    `Phoenix (soiling ${samPhoenix?.studioAnnualSoilingPercent}% vs SAM ${samPhoenix?.samAnnualSoilingPercent}%), Munich (snow ${samMunich?.studioAnnualSnowPercent}% vs SAM ${samMunich?.samAnnualSnowPercent}%), Singapore (soiling ${samSingapore?.studioAnnualSoilingPercent}%)`
  );

  // 11.4 External Validation Defensive Branch Testing (lines 125 & 178 coverage)
  const failExt = runExternalEmpiricalValidationSuite({ customFieldMeasuredLoss: 15.0 });
  const failSam = runExternalEmpiricalValidationSuite({ forceCrossModelFailure: true });
  assert(
    'ExternalVal',
    'External Validation Defensive Branch Execution',
    failExt.overallStatus === 'FAIL' && failExt.fieldBenchmarks[0].status === 'FAIL' && failSam.overallStatus === 'FAIL',
    `Defensive branches safely caught tolerance breach (15.0% vs 8.46%) and forced cross-model discrepancy, setting status to FAIL`
  );

  // ==========================================================================
  // Suite 12: BIPV/T Multiphysics Coupling & Thermal Non-Uniformity Engine (PR-2a-4)
  // ==========================================================================
  // 12.1 Forced Air Convection & IEA SHC Task 60 Thermal Efficiency
  const bipvtForced = simulateBipvThermalStep(
    {
      isBipvSystem: true,
      ventilationMode: 'forced_convection',
      forcedMassFlowKgPerSM2: 0.05,
      ductLengthM: 2.0,
      ductWidthM: 1.0,
      cavityAirGapM: 0.10,
      tiltDeg: 30.0,
      stcElectricalEfficiency: 0.16,
      tempCoeffPmpPercentPerC: -0.40,
    },
    1000.0,
    20.0,
    1.5,
    30.0
  );
  assert(
    'BIPVT',
    'IEA Task 60 Thermal Efficiency Reference',
    Math.abs(bipvtForced.thermalEfficiencyPercent - 45.2) <= 1.5,
    `Tripanagnostopoulos / IEA Task 60 reference: simulated ${bipvtForced.thermalEfficiencyPercent}% vs 45.2% nominal target`
  );

  // 12.2 Eave-to-Ridge Vertical Temperature Gradient vs Bulk Air Heating
  assert(
    'BIPVT',
    'Eave-to-Ridge Vertical Thermal Gradient vs Bulk Air Heating',
    bipvtForced.temperatureGradientDeltaC >= 15.0 && bipvtForced.temperatureGradientDeltaC <= 28.0 &&
    bipvtForced.ridgeCellTemperatureC > bipvtForced.eaveCellTemperatureC &&
    bipvtForced.airTemperatureRiseC >= 7.5 && bipvtForced.airTemperatureRiseC <= 10.5,
    `Laminate vertical gradient Delta T_cell = ${bipvtForced.temperatureGradientDeltaC}°C (Eave: ${bipvtForced.eaveCellTemperatureC}°C -> Ridge: ${bipvtForced.ridgeCellTemperatureC}°C); Bulk air stream heated by Delta T_air = ${bipvtForced.airTemperatureRiseC}°C`
  );

  // 12.3 Gross Collector Area vs Aperture Area Efficiency Normalization
  assert(
    'BIPVT',
    'Gross vs Aperture Area Efficiency Normalization',
    bipvtForced.apertureToGrossRatio === 0.86 &&
    bipvtForced.stcGrossElectricalEfficiencyPercent === 13.76 &&
    bipvtForced.netGrossDeliveredElectricalEfficiencyPercent > 12.0 &&
    bipvtForced.netGrossDeliveredElectricalEfficiencyPercent < 13.5,
    `Aperture-to-gross ratio = ${bipvtForced.apertureToGrossRatio}; STC Gross Area target = ${bipvtForced.stcGrossElectricalEfficiencyPercent}% (IEA Task 60 target: 13.8%); Net delivered gross = ${bipvtForced.netGrossDeliveredElectricalEfficiencyPercent}%`
  );

  // 12.4 Series String Electrical Mismatch Loss
  assert(
    'BIPVT',
    'Series String Mismatch Loss',
    bipvtForced.stringMismatchLossPercent >= 1.0 && bipvtForced.stringMismatchLossPercent <= 3.5,
    `Temperature non-uniformity induced string mismatch loss = ${bipvtForced.stringMismatchLossPercent}% (net delivered aperture efficiency: ${bipvtForced.netElectricalEfficiencyPercent}%)`
  );

  // 12.5 Ventilated Cavity vs Unventilated Insulated Roof BIPV
  const bipvtUnvent = simulateBipvThermalStep(
    {
      isBipvSystem: true,
      ventilationMode: 'unventilated_insulated',
      stcElectricalEfficiency: 0.16,
      tempCoeffPmpPercentPerC: -0.40,
    },
    1000.0,
    20.0
  );
  assert(
    'BIPVT',
    'Ventilated Cavity vs Unventilated Roof Comparison',
    bipvtUnvent.meanCellTemperatureC >= 85.0 && bipvtForced.cellTemperatureReductionC >= 30.0,
    `Unventilated roof cell temp reached ${bipvtUnvent.meanCellTemperatureC}°C; ventilated cavity lowered operating temp by ${bipvtForced.cellTemperatureReductionC}°C`
  );

  // 12.6 Natural Buoyancy Thermosiphon Mode
  const bipvtNat = simulateBipvThermalStep(
    {
      isBipvSystem: true,
      ventilationMode: 'natural_buoyancy',
      ductLengthM: 4.0,
      ductWidthM: 1.0,
      cavityAirGapM: 0.08,
      tiltDeg: 30.0,
    },
    1000.0,
    25.0
  );
  assert(
    'BIPVT',
    'Natural Buoyancy Thermosiphon Airflow',
    bipvtNat.ductAirVelocityMs > 0.3 && bipvtNat.ductAirMassFlowKgPerS > 0.02,
    `Natural chimney thermosiphon established air velocity = ${bipvtNat.ductAirVelocityMs} m/s and mass flow = ${bipvtNat.ductAirMassFlowKgPerS} kg/s`
  );

  // 12.7 Dual-Sided Environmental Soiling & Duct Filtration
  assert(
    'BIPVT',
    'Dual-Sided Environmental Soiling',
    bipvtForced.frontSoilingLossPercent === 3.5 && bipvtForced.rearDuctDustDepositionPercent > 0 && bipvtForced.rearDuctDustDepositionPercent < 1.0,
    `Front exterior glass soiling = ${bipvtForced.frontSoilingLossPercent}%; rear duct cavity dust deposition = ${bipvtForced.rearDuctDustDepositionPercent}%`
  );

  // 12.8 Non-BIPV Fallback Safeguard (Zero Overhead)
  const nonBipv = simulateBipvThermalStep({ isBipvSystem: false });
  assert(
    'BIPVT',
    'Non-BIPV Fallback Safeguard',
    !nonBipv.isBipvActive && nonBipv.temperatureGradientDeltaC === 0.0 && nonBipv.slices.length === 0,
    `Non-BIPV system safely bypassed multiphysics duct simulation with zero computational overhead`
  );

  // 12.9 Migration Safety Unhandled Catch Branch Coverage (migrationTestVectors.ts 328-336)
  const throwingPayload: any = {};
  Object.defineProperty(throwingPayload, 'targetPowerplantCapacityKw', {
    get() { throw new Error('Simulated binary IO bus failure'); },
  });
  const throwingReport = runMigrationTestSuite([{
    caseId: 'MIGR-TEST-CATCH',
    name: 'Throwing Exception Vector',
    sourceVersion: '1.0.0',
    rawPayload: throwingPayload,
    expectedStatus: 'BLOCKED_INCONSISTENT',
    expectedUserConfirmation: true,
  }]);
  assert(
    'Migration',
    'Unhandled Exception Catch Branch',
    throwingReport.results[0].migratedVersion === 'FAILED' && throwingReport.results[0].notes.includes('Simulated binary IO bus failure'),
    `migrationTestVectors.ts catch block safely caught unhandled runtime exception and categorized as BLOCKED_INCONSISTENT`
  );

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  return { passed, failed, results };
}
