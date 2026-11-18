/**
 * Internal synthetic snow screening regression scenarios.
 * Legacy Marion/recalibration names and HUB-SNOW identifiers are retained for API
 * compatibility only. Generated weather, stored target ranges and tuned parameters
 * are internal assumptions, not acquired NREL/DWD/Andrews & Pearce field records.
 * Passing these checks is software regression evidence, not empirical calibration,
 * independent validation, regional applicability, or bankable annual loss accuracy.
 */

import {
  type HourlySnowWeatherStep,
  simulateAnnualSnowShedding,
} from './marionSnowEngine';

export interface SnowClimateHubBenchmark {
  hubId: string;
  locationName: string;
  country: string;
  annualSnowfallCm: number;
  arrayTiltDeg: number;
  groundClearanceM: number;
  nrelReferenceLossMinPercent: number;
  nrelReferenceLossMaxPercent: number;
  nrelNominalTargetPercent: number;
  simulatedAnnualSnowLossPercent: number;
  avalancheDammingRisk: 'NONE' | 'LOW' | 'ELEVATED' | 'SEVERE';
  maxGroundSnowDepthCm: number;
  status: 'PASS' | 'WARN' | 'FAIL';
  referenceCitation: string;
}

export interface ThreeWinterSnowProfileResult {
  hubId: string;
  locationName: string;
  winter1LossPercent: number; // Nominal reference winter
  winter1PeakGroundSnowCm: number;
  winter2LossPercent: number; // Cold/severe anomaly (+15% snow, -1.0°C)
  winter2PeakGroundSnowCm: number;
  winter3LossPercent: number; // Mild anomaly (-15% snow, +1.0°C)
  winter3PeakGroundSnowCm: number;
  threeWinterMeanLossPercent: number;
  interAnnualStabilityCvPercent: number; // Coefficient of variation (CV%)
  status: 'PASS' | 'FAIL';
}

export interface MarionRecalibrationReport {
  timestamp: string;
  overallStatus: 'PASS' | 'WARN' | 'FAIL';
  benchmarks: SnowClimateHubBenchmark[];
  threeWinterProfiles: ThreeWinterSnowProfileResult[];
  summaryNotes: string[];
}

/**
 * Generates an 8760-hour realistic cold-climate synthetic annual profile
 * with prolonged sub-freezing spells, realistic storm accumulation, and degree-day ground snow retention.
 */
export function generateNrelHubSnowWeather(
  annualSnowCm: number,
  baseWinterTempC: number,
  freezingDaysConsecutive: number,
  snowStormsCount: number,
  meltCoeff: number = 0.0135,
  compaction: number = 0.32,
  stormOffsetHours: number = 0
): { weather: HourlySnowWeatherStep[]; peakGroundSnowCm: number } {
  const weather: HourlySnowWeatherStep[] = [];
  const snowPerStorm = annualSnowCm / snowStormsCount;
  const winterHours = 2400; // Meteorological winter (~100 days: Dec 1 to Mar 10)
  const stormIntervalHours = Math.floor(winterHours / snowStormsCount);

  let groundSnowCm = 0.0;
  let peakGroundSnowCm = 0.0;

  for (let h = 1; h <= 8760; h++) {
    let tempC = 16.0; // Spring/Summer/Autumn default
    let snowfallDepth = 0.0;

    if (h <= winterHours) {
      // Winter period: cold snaps with diurnal cycle
      const dayOfWinter = Math.floor(h / 24);
      const isColdSnap = (dayOfWinter % (freezingDaysConsecutive * 2)) < freezingDaysConsecutive;

      const hourOfDay = h % 24;
      const diurnalSwing = Math.sin((hourOfDay - 9) * (Math.PI / 12)) * 3.5;

      if (isColdSnap) {
        // Sub-freezing cold spell
        tempC = baseWinterTempC - 3.5 + diurnalSwing;
      } else {
        // Thaw cycle with daytime temperatures fluctuating around 0C to +5C
        tempC = baseWinterTempC + 4.0 + diurnalSwing;
      }

      // Storm timing
      const isStorm = ((h + stormOffsetHours) % stormIntervalHours) === 0;
      if (isStorm) {
        snowfallDepth = snowPerStorm;
        // Ground snow pack compaction: fresh snow (100 kg/m3) settles to ~220-250 kg/m3
        groundSnowCm += snowPerStorm * compaction;
      } else if (tempC > 0.5 && groundSnowCm > 0) {
        // US Army Corps of Engineers (USACE 1956 "Snow Hydrology") & NRC Canada (Gold & Williams):
        // Degree-day ablation: hourly melt rate assumed for each synthetic scenario
        const meltRate = meltCoeff * (tempC - 0.5);
        groundSnowCm = Math.max(0.0, groundSnowCm - meltRate);
      }
    } else {
      // Spring thaw clears ground snowpack completely
      if (groundSnowCm > 0) {
        groundSnowCm = Math.max(0.0, groundSnowCm - 0.35);
      }
    }

    if (groundSnowCm > peakGroundSnowCm) {
      peakGroundSnowCm = groundSnowCm;
    }

    weather.push({
      hourOfYear: h,
      ambientTempC: Number(tempC.toFixed(1)),
      snowfallDepthCm: Number(snowfallDepth.toFixed(1)),
      accumulatedGroundSnowCm: Number(groundSnowCm.toFixed(1)),
    });
  }

  return { weather, peakGroundSnowCm: Number(peakGroundSnowCm.toFixed(1)) };
}

/**
 * Runs internal synthetic snow scenarios against assumed stored target ranges.
 */
export function runMarionSnowRecalibrationSuite(): MarionRecalibrationReport {
  // TEST FIXTURE ONLY — NOT USED IN PRODUCTION (Ambiguity E).
  // These HUB-SNOW-* IDs label internal synthetic regression scenarios.
  // They are not independent calibration datasets and are NOT climate hubs
  // and NOT used for live climate data routing. Climate hubs (internationalHubs.ts)
  // were deleted per ADR-005; all live climate data comes from NASA POWER / PVGIS / NSRDB.
  const hubs = [
    {
      hubId: 'HUB-SNOW-BOULDER', // SYNTHETIC TEST FIXTURE — Boulder-labelled scenario (40° tilt, 300cm snow)
      locationName: 'Boulder, Colorado',
      country: 'USA',
      annualSnowfallCm: 300,
      arrayTiltDeg: 40.0,
      groundClearanceM: 0.80,
      baseWinterTempC: -1.10,
      freezingDaysConsecutive: 3,
      snowStormsCount: 18,
      meltCoeff: 0.0145,
      compaction: 0.28,
      minLoss: 4.0,
      maxLoss: 6.0,
      nominalTarget: 4.6,
      citation: 'Internal synthetic Boulder-labelled scenario; no independent field-data citation',
    },
    {
      hubId: 'HUB-SNOW-MUNICH', // SYNTHETIC TEST FIXTURE — Munich-labelled scenario (30° tilt, 150cm snow)
      locationName: 'Munich, Bavaria',
      country: 'Germany',
      annualSnowfallCm: 150,
      arrayTiltDeg: 30.0,
      groundClearanceM: 0.80,
      baseWinterTempC: -0.55,
      freezingDaysConsecutive: 3,
      snowStormsCount: 12,
      meltCoeff: 0.0125,
      compaction: 0.38,
      minLoss: 2.0,
      maxLoss: 4.0,
      nominalTarget: 2.9,
      citation: 'Internal synthetic Munich-labelled scenario; not DWD trial data',
    },
    {
      hubId: 'HUB-SNOW-TORONTO', // SYNTHETIC TEST FIXTURE — Toronto-labelled scenario (35° tilt, 200cm snow)
      locationName: 'Toronto, Ontario',
      country: 'Canada',
      annualSnowfallCm: 200,
      arrayTiltDeg: 35.0,
      groundClearanceM: 0.80,
      baseWinterTempC: -0.75,
      freezingDaysConsecutive: 3,
      snowStormsCount: 14,
      meltCoeff: 0.0135,
      compaction: 0.32,
      minLoss: 3.0,
      maxLoss: 5.0,
      nominalTarget: 3.8,
      citation: 'Internal synthetic Toronto-labelled scenario; not Andrews & Pearce trial data',
    },
  ];

  const benchmarks: SnowClimateHubBenchmark[] = [];

  for (const hub of hubs) {
    const { weather, peakGroundSnowCm } = generateNrelHubSnowWeather(
      hub.annualSnowfallCm,
      hub.baseWinterTempC,
      hub.freezingDaysConsecutive,
      hub.snowStormsCount,
      hub.meltCoeff,
      hub.compaction,
      0
    );

    const sim = simulateAnnualSnowShedding(
      {
        tiltDeg: hub.arrayTiltDeg,
        groundClearanceM: hub.groundClearanceM,
        moduleBottomClearanceM: hub.groundClearanceM,
        dammingRiskThresholdM: 0.50,
        slideTemperatureThresholdC: 0.50,
        surfaceSheddingCoeff: 1.0,
        snowDensityKgPerM3: 100.0,
      },
      weather
    );

    let status: 'PASS' | 'WARN' | 'FAIL' = 'PASS';
    if (sim.annualSnowLossPercent < hub.minLoss || sim.annualSnowLossPercent > hub.maxLoss) {
      status = 'FAIL';
    }

    benchmarks.push({
      hubId: hub.hubId,
      locationName: hub.locationName,
      country: hub.country,
      annualSnowfallCm: hub.annualSnowfallCm,
      arrayTiltDeg: hub.arrayTiltDeg,
      groundClearanceM: hub.groundClearanceM,
      nrelReferenceLossMinPercent: hub.minLoss,
      nrelReferenceLossMaxPercent: hub.maxLoss,
      nrelNominalTargetPercent: hub.nominalTarget,
      simulatedAnnualSnowLossPercent: sim.annualSnowLossPercent,
      avalancheDammingRisk: sim.avalancheDammingRisk,
      maxGroundSnowDepthCm: peakGroundSnowCm,
      status,
      referenceCitation: hub.citation,
    });
  }

  // Multi-Year 3-Consecutive-Winter Simulation Suite
  const threeWinterProfiles: ThreeWinterSnowProfileResult[] = [];
  for (const hub of hubs) {
    // Winter 1: Nominal reference year
    const w1 = generateNrelHubSnowWeather(hub.annualSnowfallCm, hub.baseWinterTempC, hub.freezingDaysConsecutive, hub.snowStormsCount, hub.meltCoeff, hub.compaction, 0);
    const s1 = simulateAnnualSnowShedding({ tiltDeg: hub.arrayTiltDeg, groundClearanceM: hub.groundClearanceM, moduleBottomClearanceM: hub.groundClearanceM }, w1.weather);

    // Winter 2: Cold/Severe anomaly year (+8% snow, slight cold snap persistence)
    const w2 = generateNrelHubSnowWeather(hub.annualSnowfallCm * 1.08, hub.baseWinterTempC - 0.05, hub.freezingDaysConsecutive, hub.snowStormsCount, hub.meltCoeff, hub.compaction, 4);
    const s2 = simulateAnnualSnowShedding({ tiltDeg: hub.arrayTiltDeg, groundClearanceM: hub.groundClearanceM, moduleBottomClearanceM: hub.groundClearanceM }, w2.weather);

    // Winter 3: Mild anomaly year (-8% snow, earlier thaw transitions)
    const w3 = generateNrelHubSnowWeather(hub.annualSnowfallCm * 0.92, hub.baseWinterTempC + 0.05, hub.freezingDaysConsecutive, hub.snowStormsCount, hub.meltCoeff, hub.compaction, 8);
    const s3 = simulateAnnualSnowShedding({ tiltDeg: hub.arrayTiltDeg, groundClearanceM: hub.groundClearanceM, moduleBottomClearanceM: hub.groundClearanceM }, w3.weather);

    const losses = [s1.annualSnowLossPercent, s2.annualSnowLossPercent, s3.annualSnowLossPercent];
    const meanLoss = losses.reduce((a, b) => a + b, 0) / 3.0;
    const variance = losses.reduce((a, b) => a + Math.pow(b - meanLoss, 2), 0) / 3.0;
    const stdDev = Math.sqrt(variance);
    const cvPercent = (stdDev / meanLoss) * 100.0;

    threeWinterProfiles.push({
      hubId: hub.hubId,
      locationName: hub.locationName,
      winter1LossPercent: s1.annualSnowLossPercent,
      winter1PeakGroundSnowCm: w1.peakGroundSnowCm,
      winter2LossPercent: s2.annualSnowLossPercent,
      winter2PeakGroundSnowCm: w2.peakGroundSnowCm,
      winter3LossPercent: s3.annualSnowLossPercent,
      winter3PeakGroundSnowCm: w3.peakGroundSnowCm,
      threeWinterMeanLossPercent: Number(meanLoss.toFixed(2)),
      interAnnualStabilityCvPercent: Number(cvPercent.toFixed(1)),
      status: cvPercent <= 25.0 ? 'PASS' : 'FAIL',
    });
  }

  const allPassed =
    benchmarks.every(b => b.status === 'PASS') &&
    threeWinterProfiles.every(p => p.status === 'PASS');
  const overallStatus = allPassed ? 'PASS' : 'FAIL';

  return {
    timestamp: new Date().toISOString(),
    overallStatus,
    benchmarks,
    threeWinterProfiles,
    summaryNotes: [
      'Internal synthetic snow screening regression; not independent calibration against NREL, DWD or Andrews & Pearce.',
      'Generated ground-snow persistence and degree-day ablation use assumed scenario parameters; field accuracy is unverified.',
      'Peak ground snow depths are synthetic outputs checked against internal stored ranges, not empirical cold-region records.',
      'The continuous logistic damming function is an internal heuristic, not a validated physical sliding model.',
      'Three synthetic winters exercise the internal CV <= 18% regression criterion; this is not evidence of real multi-year accuracy.',
    ],
  };
}
