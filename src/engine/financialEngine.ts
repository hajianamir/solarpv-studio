// Financial Engine: CAPEX, OPEX Savings, Payback, NPV, LCOE & CO2 Abatement

export interface FinancialCapexBreakdown {
  pvModulesUsd: number;
  pvModulesToman: number;
  invertersUsd: number;
  invertersToman: number;
  batteriesUsd: number;
  batteriesToman: number;
  structuresUsd: number;
  structuresToman: number;
  cablesAndProtectionUsd: number;
  cablesAndProtectionToman: number;
  engineeringAndInstallationUsd: number;
  engineeringAndInstallationToman: number;
  totalCapexUsd: number;
  totalCapexToman: number;
}

export interface FinancialAnalysisResult {
  capexBreakdown: FinancialCapexBreakdown;
  annualEnergyYieldKwh: number;
  annualOpexUsd: number;
  annualOpexToman: number;
  annualElectricitySavingsUsd: number;
  annualElectricitySavingsToman: number;
  simplePaybackPeriodYears: number;
  lcoeUsdPerKwh: number;
  lcoeTomanPerKwh: number;
  npvUsd: number;
  npvToman: number;
  annualCo2ReductionTons: number;
  lifetime25yCo2ReductionTons: number;
}

export function performFinancialAnalysis(
  totalPvCapacityKwp: number,
  batteryCapacityKwh: number,
  inverterCapacityKw: number,
  annualYieldKwh: number,
  usdToTomanRate: number = 90_000,
  gridTariffTomanPerKwh: number = 3_500,
  discountRate: number = 0.18, // 18% standard Iranian Rial WACC or 6% USD
  lifetimeYears: number = 25
): FinancialAnalysisResult {
  // Equipment Unit Cost Benchmarks (Competitive 2025/2026 rates in Iran)
  // Modules: ~$0.17/Wp (Tier 1 N-Type TOPCon)
  const modulesUsd = totalPvCapacityKwp * 1000.0 * 0.17;
  const modulesToman = modulesUsd * usdToTomanRate;

  // Inverters: ~$110/kW (Hybrid bidirectional with MPPT)
  const invertersUsd = inverterCapacityKw * 110.0;
  const invertersToman = invertersUsd * usdToTomanRate;

  // Batteries: ~$190/kWh (LiFePO4 high quality)
  const batteriesUsd = batteryCapacityKwh * 190.0;
  const batteriesToman = batteriesUsd * usdToTomanRate;

  // Racking / Galvanized structures: ~$0.045/Wp
  const structuresUsd = totalPvCapacityKwp * 1000.0 * 0.045;
  const structuresToman = structuresUsd * usdToTomanRate;

  // Cables, Combiner, SPD & Protection: ~$0.04/Wp
  const cablesAndProtectionUsd = totalPvCapacityKwp * 1000.0 * 0.04;
  const cablesAndProtectionToman = cablesAndProtectionUsd * usdToTomanRate;

  // Labor, engineering, commissioning: ~10% of hardware
  const hardwareSumUsd = modulesUsd + invertersUsd + batteriesUsd + structuresUsd + cablesAndProtectionUsd;
  const engineeringUsd = hardwareSumUsd * 0.10;
  const engineeringToman = engineeringUsd * usdToTomanRate;

  const totalCapexUsd = hardwareSumUsd + engineeringUsd;
  const totalCapexToman = totalCapexUsd * usdToTomanRate;

  const capexBreakdown: FinancialCapexBreakdown = {
    pvModulesUsd: Math.round(modulesUsd),
    pvModulesToman: Math.round(modulesToman),
    invertersUsd: Math.round(invertersUsd),
    invertersToman: Math.round(invertersToman),
    batteriesUsd: Math.round(batteriesUsd),
    batteriesToman: Math.round(batteriesToman),
    structuresUsd: Math.round(structuresUsd),
    structuresToman: Math.round(structuresToman),
    cablesAndProtectionUsd: Math.round(cablesAndProtectionUsd),
    cablesAndProtectionToman: Math.round(cablesAndProtectionToman),
    engineeringAndInstallationUsd: Math.round(engineeringUsd),
    engineeringAndInstallationToman: Math.round(engineeringToman),
    totalCapexUsd: Math.round(totalCapexUsd),
    totalCapexToman: Math.round(totalCapexToman),
  };

  // OPEX (O&M, cleaning, insurance: ~1.2% of CAPEX per year)
  const annualOpexUsd = totalCapexUsd * 0.012;
  const annualOpexToman = annualOpexUsd * usdToTomanRate;

  // Annual Electricity bill savings
  const annualElectricitySavingsToman = annualYieldKwh * gridTariffTomanPerKwh;
  const annualElectricitySavingsUsd = annualElectricitySavingsToman / usdToTomanRate;

  // Simple Payback Period
  const netAnnualSavingsUsd = annualElectricitySavingsUsd - annualOpexUsd;
  const simplePaybackPeriodYears = netAnnualSavingsUsd > 0
    ? Math.round((totalCapexUsd / netAnnualSavingsUsd) * 10) / 10
    : 99.0;

  // LCOE calculation over 25 years with 0.5% degradation
  let presentValueCostsUsd = totalCapexUsd;
  let presentValueEnergyKwh = 0;
  const degradationRate = 0.005;

  for (let t = 1; t <= lifetimeYears; t++) {
    const discountFactor = Math.pow(1.0 + 0.06, t); // 6% USD real discount rate for LCOE
    presentValueCostsUsd += annualOpexUsd / discountFactor;

    // Battery replacement around year 12
    if (t === 12 && batteryCapacityKwh > 0) {
      presentValueCostsUsd += (batteriesUsd * 0.70) / discountFactor; // battery expected 30% cheaper in 12y
    }

    const energyInYear = annualYieldKwh * Math.pow(1.0 - degradationRate, t - 1);
    presentValueEnergyKwh += energyInYear / discountFactor;
  }

  const lcoeUsdPerKwh = presentValueEnergyKwh > 0
    ? presentValueCostsUsd / presentValueEnergyKwh
    : 0.0;
  const lcoeTomanPerKwh = lcoeUsdPerKwh * usdToTomanRate;

  // Net Present Value (NPV)
  let npvUsd = -totalCapexUsd;
  for (let t = 1; t <= lifetimeYears; t++) {
    const discountFactor = Math.pow(1.0 + 0.08, t);
    const netCashflow = annualElectricitySavingsUsd - annualOpexUsd;
    npvUsd += netCashflow / discountFactor;
  }
  const npvToman = npvUsd * usdToTomanRate;

  // CO2 Emissions Reduction (Grid emission factor approx 0.65 kg CO2 per kWh)
  const annualCo2ReductionTons = Math.round((annualYieldKwh * 0.65) / 1000.0 * 10) / 10;
  const lifetime25yCo2ReductionTons = Math.round(annualCo2ReductionTons * 25.0 * 0.94);

  return {
    capexBreakdown,
    annualEnergyYieldKwh: Math.round(annualYieldKwh),
    annualOpexUsd: Math.round(annualOpexUsd),
    annualOpexToman: Math.round(annualOpexToman),
    annualElectricitySavingsUsd: Math.round(annualElectricitySavingsUsd),
    annualElectricitySavingsToman: Math.round(annualElectricitySavingsToman),
    simplePaybackPeriodYears,
    lcoeUsdPerKwh,
    lcoeTomanPerKwh: Math.round(lcoeTomanPerKwh),
    npvUsd: Math.round(npvUsd),
    npvToman: Math.round(npvToman),
    annualCo2ReductionTons,
    lifetime25yCo2ReductionTons,
  };
}
