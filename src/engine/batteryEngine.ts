// Battery Energy Storage System (BESS) & Degradation Life-Cycle Engine

export type BatteryChemistry = 'lifepo4' | 'gel_deep_cycle' | 'agm_flooded' | 'ternary_ncm' | 'LiFePO4' | string;

export interface BatteryChemistryProfile {
  id: string;
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

export const BATTERY_CHEMISTRIES: Record<string, BatteryChemistryProfile> = {
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

// Aliases for robustness
BATTERY_CHEMISTRIES['LiFePO4'] = BATTERY_CHEMISTRIES['lifepo4'];
BATTERY_CHEMISTRIES['LFP'] = BATTERY_CHEMISTRIES['lifepo4'];
BATTERY_CHEMISTRIES['gel'] = BATTERY_CHEMISTRIES['gel_deep_cycle'];
BATTERY_CHEMISTRIES['Gel'] = BATTERY_CHEMISTRIES['gel_deep_cycle'];
BATTERY_CHEMISTRIES['agm'] = BATTERY_CHEMISTRIES['agm_flooded'];
BATTERY_CHEMISTRIES['AGM'] = BATTERY_CHEMISTRIES['agm_flooded'];
BATTERY_CHEMISTRIES['ncm'] = BATTERY_CHEMISTRIES['ternary_ncm'];

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

const FALLBACK_BATTERY_PROFILE: BatteryChemistryProfile = {
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
};

export function sizeBatteryBank(
  nighttimeDailyKwh: number = 0,
  autonomyDays: number = 1.0,
  chemistryType: BatteryChemistry = 'lifepo4',
  systemVoltageVdc: number = 48,
  inverterPeakWatts: number = 5000,
  inverterContinuousWatts: number = 3000,
  minAmbientTempC: number = 15.0,
  unitBatteryAh: number = 100 // standard 100Ah or 200Ah unit block
): BatteryBankSizingResult {
  // Normalize chemistry key safely
  const rawKey = typeof chemistryType === 'string' ? chemistryType : (chemistryType as any)?.id || 'lifepo4';
  let matchedProfile = BATTERY_CHEMISTRIES?.[rawKey] || BATTERY_CHEMISTRIES?.[rawKey.toLowerCase()];
  if (!matchedProfile) {
    const lower = rawKey.toLowerCase();
    if (lower.includes('life') || lower.includes('lfp') || lower.includes('lith')) {
      matchedProfile = BATTERY_CHEMISTRIES?.lifepo4;
    } else if (lower.includes('gel')) {
      matchedProfile = BATTERY_CHEMISTRIES?.gel_deep_cycle;
    } else if (lower.includes('agm') || lower.includes('lead') || lower.includes('acid')) {
      matchedProfile = BATTERY_CHEMISTRIES?.agm_flooded;
    } else if (lower.includes('ncm') || lower.includes('ternary')) {
      matchedProfile = BATTERY_CHEMISTRIES?.ternary_ncm;
    }
  }

  const profile: BatteryChemistryProfile = {
    ...FALLBACK_BATTERY_PROFILE,
    ...(matchedProfile || BATTERY_CHEMISTRIES?.lifepo4 || {}),
  };

  const vdc = Math.max(12, Number(systemVoltageVdc) || 48);
  const unitAh = Math.max(10, Number(unitBatteryAh) || 100);
  const contWatts = Math.max(100, Number(inverterContinuousWatts) || 3000);
  const peakWatts = Math.max(contWatts, Number(inverterPeakWatts) || contWatts * 1.5);
  const ambientTemp = minAmbientTempC !== undefined ? Number(minAmbientTempC) : 15.0;
  const warnings: string[] = [];

  // If zero energy requirement (e.g. utility powerplant or 0 autonomy)
  if (nighttimeDailyKwh <= 0 || autonomyDays <= 0) {
    return {
      chemistry: profile,
      systemVoltageVdc: vdc,
      grossCapacityKwh: 0,
      usableCapacityKwh: 0,
      totalCapacityAh: 0,
      unitBatteryCapacityAh: unitAh,
      batteriesInSeries: 0,
      parallelStrings: 0,
      totalBatteryUnitsCount: 0,
      continuousDischargeCurrentAmps: 0,
      peakSurgeDischargeCurrentAmps: 0,
      actualContinuousCRate: 0,
      estimatedLifespanYears: profile.typicalLifespanYears,
      expectedTotalCycles: profile.standardCycleLifeAt80DoD,
      warnings: [],
    };
  }

  // Temperature correction factor (Arrhenius / Peukert effect)
  const tempDeltaBelow20 = Math.max(0, 20.0 - ambientTemp);
  const tempCorrectionFactor = Math.max(
    0.65,
    1.0 - (tempDeltaBelow20 * (profile.tempDeratingPerCBelow20 || 0.5)) / 100.0
  );

  const dodFraction = (profile.recommendedDoDPct || 80) / 100.0;
  const roundTripFraction = (profile.roundTripEfficiencyPct || 90) / 100.0;

  // Total usable energy required during autonomy window
  const requiredUsableKwh = nighttimeDailyKwh * Math.max(0.2, autonomyDays);

  // Gross capacity required
  const grossCapacityKwh = requiredUsableKwh / (dodFraction * roundTripFraction * tempCorrectionFactor);
  const grossCapacityWh = grossCapacityKwh * 1000.0;

  // Capacity in Ampere-Hours at selected busbar DC voltage
  const totalCapacityAh = grossCapacityWh / vdc;

  // Physical units arrangement (assuming 12V individual units for Lead/Gel or 48V/12V rack modules for LiFePO4)
  const unitVoltage = profile.id === 'lifepo4' && vdc === 48 ? 48.0 : 12.0;
  const batteriesInSeries = Math.max(1, Math.round(vdc / unitVoltage));

  const parallelStrings = Math.max(1, Math.ceil(totalCapacityAh / unitAh));
  const totalBatteryUnitsCount = batteriesInSeries * parallelStrings;
  const actualBankAh = parallelStrings * unitAh;
  const actualGrossKwh = (actualBankAh * vdc) / 1000.0;
  const actualUsableKwh = actualGrossKwh * dodFraction;

  // Current draws from battery bank
  const inverterEff = 0.93;
  const continuousDischargeCurrentAmps = contWatts / (vdc * inverterEff);
  const peakSurgeDischargeCurrentAmps = peakWatts / (vdc * inverterEff);

  const actualContinuousCRate = actualBankAh > 0 ? continuousDischargeCurrentAmps / actualBankAh : 0;

  if (actualContinuousCRate > (profile.maxContinuousCRate || 1.0)) {
    warnings.push(
      `جریان دشارژ پیوسته (${continuousDischargeCurrentAmps.toFixed(1)}A معادل ${actualContinuousCRate.toFixed(2)}C) بیش از نرخ مجاز شیمی ${profile.nameFa} (${profile.maxContinuousCRate}C) است! خطر داغ شدن و سوختن باتری.`
    );
  }

  // Lifespan estimation based on cycles and DoD
  const cycleLifeAtActualDoD = (profile.standardCycleLifeAt80DoD || 3000) * (0.80 / Math.max(0.1, dodFraction));
  const cyclesPerYear = 365;
  const theoreticalYears = cycleLifeAtActualDoD / cyclesPerYear;
  const estimatedLifespanYears = Math.min(
    profile.typicalLifespanYears || 10,
    Math.max(1.5, Math.round(theoreticalYears * 10) / 10)
  );

  return {
    chemistry: profile,
    systemVoltageVdc: vdc,
    grossCapacityKwh: Number(actualGrossKwh.toFixed(1)),
    usableCapacityKwh: Number(actualUsableKwh.toFixed(1)),
    totalCapacityAh: Math.round(actualBankAh),
    unitBatteryCapacityAh: unitAh,
    batteriesInSeries,
    parallelStrings,
    totalBatteryUnitsCount,
    continuousDischargeCurrentAmps: Number(continuousDischargeCurrentAmps.toFixed(1)),
    peakSurgeDischargeCurrentAmps: Number(peakSurgeDischargeCurrentAmps.toFixed(1)),
    actualContinuousCRate: Number(actualContinuousCRate.toFixed(2)),
    estimatedLifespanYears,
    expectedTotalCycles: Math.round(cycleLifeAtActualDoD),
    warnings,
  };
}
