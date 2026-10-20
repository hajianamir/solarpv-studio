// Battery Energy Storage System (BESS) & Degradation Life-Cycle Engine

export type BatteryChemistry = 'lifepo4' | 'gel_deep_cycle' | 'agm_flooded' | 'ternary_ncm';

export interface BatteryChemistryProfile {
  id: BatteryChemistry;
  nameFa: string;
  nameEn: string;
  recommendedDoDPct: number;
  maxDoDPct: number;
  roundTripEfficiencyPct: number;
  nominalCellVoltage: number;
  standardCycleLifeAt80DoD: number;
  maxContinuousCRate: number;
  maxSurgeCRate: number;
  tempDeratingPerCBelow20: number; // % capacity loss per °C below 20°C
  estimatedCostPerKwhUsd: number;
  estimatedCostPerKwhToman: number;
  typicalLifespanYears: number;
}

export const BATTERY_CHEMISTRIES: Record<BatteryChemistry, BatteryChemistryProfile> = {
  lifepo4: {
    id: 'lifepo4',
    nameFa: 'لیتیوم آهن فسفات (LiFePO4)',
    nameEn: 'Lithium Iron Phosphate (LiFePO4)',
    recommendedDoDPct: 85,
    maxDoDPct: 90,
    roundTripEfficiencyPct: 95,
    nominalCellVoltage: 3.2,
    standardCycleLifeAt80DoD: 5500,
    maxContinuousCRate: 1.0,
    maxSurgeCRate: 2.0,
    tempDeratingPerCBelow20: 0.5,
    estimatedCostPerKwhUsd: 190,
    estimatedCostPerKwhToman: 17_000_000,
    typicalLifespanYears: 12,
  },
  gel_deep_cycle: {
    id: 'gel_deep_cycle',
    nameFa: 'ژل عمیق دشارژ (Gel Deep Cycle)',
    nameEn: 'Gel Deep Cycle',
    recommendedDoDPct: 50,
    maxDoDPct: 60,
    roundTripEfficiencyPct: 85,
    nominalCellVoltage: 2.0,
    standardCycleLifeAt80DoD: 1000,
    maxContinuousCRate: 0.25,
    maxSurgeCRate: 0.6,
    tempDeratingPerCBelow20: 1.0,
    estimatedCostPerKwhUsd: 110,
    estimatedCostPerKwhToman: 10_000_000,
    typicalLifespanYears: 4,
  },
  agm_flooded: {
    id: 'agm_flooded',
    nameFa: 'اسید-سرب سیلد خورشیدی (AGM VRLA)',
    nameEn: 'Sealed Lead-Acid (AGM)',
    recommendedDoDPct: 50,
    maxDoDPct: 55,
    roundTripEfficiencyPct: 80,
    nominalCellVoltage: 2.0,
    standardCycleLifeAt80DoD: 700,
    maxContinuousCRate: 0.20,
    maxSurgeCRate: 0.5,
    tempDeratingPerCBelow20: 1.2,
    estimatedCostPerKwhUsd: 90,
    estimatedCostPerKwhToman: 8_000_000,
    typicalLifespanYears: 3,
  },
  ternary_ncm: {
    id: 'ternary_ncm',
    nameFa: 'لیتیم ترنری (Ternary NCM)',
    nameEn: 'Ternary Lithium (NCM/NCA)',
    recommendedDoDPct: 80,
    maxDoDPct: 85,
    roundTripEfficiencyPct: 92,
    nominalCellVoltage: 3.7,
    standardCycleLifeAt80DoD: 2200,
    maxContinuousCRate: 1.2,
    maxSurgeCRate: 2.5,
    tempDeratingPerCBelow20: 0.8,
    estimatedCostPerKwhUsd: 160,
    estimatedCostPerKwhToman: 14_500_000,
    typicalLifespanYears: 7,
  },
};

export interface BatteryBankSizingResult {
  chemistry: BatteryChemistryProfile;
  systemVoltageVdc: number; // 12, 24, or 48V
  grossCapacityKwh: number;
  usableCapacityKwh: number;
  totalCapacityAh: number;
  unitBatteryCapacityAh: number;
  batteriesInSeries: number;
  parallelStrings: number;
  totalBatteryUnitsCount: number;
  continuousDischargeCurrentAmps: number;
  peakSurgeDischargeCurrentAmps: number;
  actualContinuousCRate: number;
  estimatedLifespanYears: number;
  expectedTotalCycles: number;
  warnings: string[];
}

export function sizeBatteryBank(
  nighttimeDailyKwh: number,
  autonomyDays: number,
  chemistryType: BatteryChemistry,
  systemVoltageVdc: number,
  inverterPeakWatts: number,
  inverterContinuousWatts: number,
  minAmbientTempC: number = 15.0,
  unitBatteryAh: number = 100 // standard 100Ah or 200Ah unit block
): BatteryBankSizingResult {
  const profile = BATTERY_CHEMISTRIES[chemistryType];
  const warnings: string[] = [];

  // Temperature correction factor (Arrhenius / Peukert effect)
  const tempDeltaBelow20 = Math.max(0, 20.0 - minAmbientTempC);
  const tempCorrectionFactor = Math.max(0.65, 1.0 - (tempDeltaBelow20 * profile.tempDeratingPerCBelow20) / 100.0);

  const dodFraction = profile.recommendedDoDPct / 100.0;
  const roundTripFraction = profile.roundTripEfficiencyPct / 100.0;

  // Total usable energy required during autonomy window
  const requiredUsableKwh = nighttimeDailyKwh * Math.max(0.5, autonomyDays);

  // Gross capacity required
  const grossCapacityKwh = requiredUsableKwh / (dodFraction * roundTripFraction * tempCorrectionFactor);
  const grossCapacityWh = grossCapacityKwh * 1000.0;

  // Capacity in Ampere-Hours at selected busbar DC voltage
  const totalCapacityAh = grossCapacityWh / systemVoltageVdc;

  // Physical units arrangement (assuming 12V individual units for Lead/Gel or 48V/12V rack modules for LiFePO4)
  const unitVoltage = chemistryType === 'lifepo4' && systemVoltageVdc === 48 ? 48.0 : 12.0;
  const batteriesInSeries = Math.max(1, Math.round(systemVoltageVdc / unitVoltage));

  const parallelStrings = Math.max(1, Math.ceil(totalCapacityAh / unitBatteryAh));
  const totalBatteryUnitsCount = batteriesInSeries * parallelStrings;
  const actualBankAh = parallelStrings * unitBatteryAh;
  const actualGrossKwh = (actualBankAh * systemVoltageVdc) / 1000.0;
  const actualUsableKwh = actualGrossKwh * dodFraction;

  // Current draws from battery bank
  const inverterEff = 0.93;
  const continuousDischargeCurrentAmps = inverterContinuousWatts / (systemVoltageVdc * inverterEff);
  const peakSurgeDischargeCurrentAmps = inverterPeakWatts / (systemVoltageVdc * inverterEff);

  const actualContinuousCRate = continuousDischargeCurrentAmps / actualBankAh;

  if (actualContinuousCRate > profile.maxContinuousCRate) {
    warnings.push(
      `جریان دشارژ پیوسته (${continuousDischargeCurrentAmps.toFixed(1)}A معادل ${actualContinuousCRate.toFixed(2)}C) بیش از نرخ مجاز شیمی ${profile.nameFa} (${profile.maxContinuousCRate}C) است! خطر داغ شدن و سوختن باتری.`
    );
  }

  // Lifespan estimation based on cycles and DoD
  // Cycle life derating based on temperature (high temperatures accelerate degradation)
  const cycleLifeAtActualDoD = profile.standardCycleLifeAt80DoD * (0.80 / dodFraction);
  const cyclesPerYear = 365;
  const theoreticalYears = cycleLifeAtActualDoD / cyclesPerYear;
  const estimatedLifespanYears = Math.min(profile.typicalLifespanYears, Math.max(1.5, Math.round(theoreticalYears * 10) / 10));

  return {
    chemistry: profile,
    systemVoltageVdc,
    grossCapacityKwh: actualGrossKwh,
    usableCapacityKwh: actualUsableKwh,
    totalCapacityAh: actualBankAh,
    unitBatteryCapacityAh: unitBatteryAh,
    batteriesInSeries,
    parallelStrings,
    totalBatteryUnitsCount,
    continuousDischargeCurrentAmps,
    peakSurgeDischargeCurrentAmps,
    actualContinuousCRate,
    estimatedLifespanYears,
    expectedTotalCycles: Math.round(cycleLifeAtActualDoD),
    warnings,
  };
}
