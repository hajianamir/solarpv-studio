// Comprehensive Financial Engine: User-Driven Pricing, CAPEX, OPEX, LCOE, NPV, IRR & 25-Year Cash Flow

export interface UserFinancialPricing {
  moduleUsdPerWp: number; // e.g. 0.14 $/Wp
  inverterUsdPerKw: number; // e.g. 55 $/kW
  batteryUsdPerKwh: number; // e.g. 160 $/kWh
  structureUsdPerWp: number; // e.g. 0.045 $/Wp
  cablingBopUsdPerWp: number; // e.g. 0.035 $/Wp
  substationUsdPerMva: number; // e.g. 35,000 $/MVA
  epcLaborUsdPerKw: number; // e.g. 25 $/kW
  gridTariffTomanPerKwh: number; // e.g. 3,800 Toman/kWh
  usdToTomanRate: number; // e.g. 90,000 Toman/$
  annualOpexPctOfCapex: number; // e.g. 1.2% / year
  discountRatePct: number; // e.g. 18% IRR discount rate
  tariffEscalationPct: number; // e.g. 15% annual tariff indexation in Iran
  includeDieselGenSet?: boolean;
  dieselGenSetCapexUsd?: number;
  dieselAnnualFuelLiters?: number;
  dieselFuelPriceTomanPerLiter?: number;
}

export const DEFAULT_FINANCIAL_PRICING: UserFinancialPricing = {
  moduleUsdPerWp: 0.14,
  inverterUsdPerKw: 55,
  batteryUsdPerKwh: 160,
  structureUsdPerWp: 0.045,
  cablingBopUsdPerWp: 0.035,
  substationUsdPerMva: 35000,
  epcLaborUsdPerKw: 25,
  gridTariffTomanPerKwh: 3800,
  usdToTomanRate: 90000,
  annualOpexPctOfCapex: 1.2,
  discountRatePct: 18.0,
  tariffEscalationPct: 15.0,
  includeDieselGenSet: false,
  dieselGenSetCapexUsd: 0,
  dieselAnnualFuelLiters: 0,
  dieselFuelPriceTomanPerLiter: 3500,
};

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
  substationMvUsd: number;
  substationMvToman: number;
  dieselGenSetUsd: number;
  dieselGenSetToman: number;
  engineeringAndInstallationUsd: number;
  engineeringAndInstallationToman: number;
  totalCapexUsd: number;
  totalCapexToman: number;
}

export interface YearCashFlowItem {
  year: number;
  generationKwh: number;
  revenueToman: number;
  opexToman: number;
  fuelCostToman: number;
  netCashFlowToman: number;
  cumulativeCashFlowToman: number;
  discountedCashFlowToman: number;
}

export interface FinancialAnalysisResult {
  capexBreakdown: FinancialCapexBreakdown;
  annualEnergyYieldKwh: number;
  annualOpexUsd: number;
  annualOpexToman: number;
  annualRevenueToman: number;
  annualRevenueUsd: number;
  simplePaybackPeriodYears: number;
  discountedPaybackPeriodYears: number;
  lcoeUsdPerKwh: number;
  lcoeTomanPerKwh: number;
  npvUsd: number;
  npvToman: number;
  irrPct: number;
  annualCo2ReductionTons: number;
  lifetime25yCo2ReductionTons: number;
  cashFlow25Years: YearCashFlowItem[];
}

export function performFinancialAnalysis(
  totalPvCapacityKwp: number,
  batteryCapacityKwh: number,
  inverterCapacityKw: number,
  annualYieldKwh: number,
  customPricing?: Partial<UserFinancialPricing>,
  lifetimeYears: number = 25
): FinancialAnalysisResult {
  const p: UserFinancialPricing = {
    ...DEFAULT_FINANCIAL_PRICING,
    ...(customPricing || {}),
  };

  const pvWatts = totalPvCapacityKwp * 1000.0;
  const plantMva = Math.max(0.1, (inverterCapacityKw / 1000.0) * 1.15);

  // 1. CAPEX itemized calculation
  const modulesUsd = pvWatts * p.moduleUsdPerWp;
  const invertersUsd = inverterCapacityKw * p.inverterUsdPerKw;
  const batteriesUsd = batteryCapacityKwh * p.batteryUsdPerKwh;
  const structuresUsd = pvWatts * p.structureUsdPerWp;
  const cablesBopUsd = pvWatts * p.cablingBopUsdPerWp;
  const substationUsd = inverterCapacityKw > 500 ? plantMva * p.substationUsdPerMva : 0;
  const epcLaborUsd = inverterCapacityKw * p.epcLaborUsdPerKw;
  const dieselUsd = p.includeDieselGenSet ? p.dieselGenSetCapexUsd || 0 : 0;

  const totalCapexUsd =
    modulesUsd +
    invertersUsd +
    batteriesUsd +
    structuresUsd +
    cablesBopUsd +
    substationUsd +
    epcLaborUsd +
    dieselUsd;

  const totalCapexToman = totalCapexUsd * p.usdToTomanRate;

  const capexBreakdown: FinancialCapexBreakdown = {
    pvModulesUsd: Math.round(modulesUsd),
    pvModulesToman: Math.round(modulesUsd * p.usdToTomanRate),
    invertersUsd: Math.round(invertersUsd),
    invertersToman: Math.round(invertersUsd * p.usdToTomanRate),
    batteriesUsd: Math.round(batteriesUsd),
    batteriesToman: Math.round(batteriesUsd * p.usdToTomanRate),
    structuresUsd: Math.round(structuresUsd),
    structuresToman: Math.round(structuresUsd * p.usdToTomanRate),
    cablesAndProtectionUsd: Math.round(cablesBopUsd),
    cablesAndProtectionToman: Math.round(cablesBopUsd * p.usdToTomanRate),
    substationMvUsd: Math.round(substationUsd),
    substationMvToman: Math.round(substationUsd * p.usdToTomanRate),
    dieselGenSetUsd: Math.round(dieselUsd),
    dieselGenSetToman: Math.round(dieselUsd * p.usdToTomanRate),
    engineeringAndInstallationUsd: Math.round(epcLaborUsd),
    engineeringAndInstallationToman: Math.round(epcLaborUsd * p.usdToTomanRate),
    totalCapexUsd: Math.round(totalCapexUsd),
    totalCapexToman: Math.round(totalCapexToman),
  };

  // 2. OPEX & Fuel
  const baseAnnualOpexToman = (totalCapexToman * (p.annualOpexPctOfCapex / 100.0));
  const baseAnnualOpexUsd = totalCapexUsd * (p.annualOpexPctOfCapex / 100.0);

  const annualDieselFuelCostToman = p.includeDieselGenSet
    ? (p.dieselAnnualFuelLiters || 0) * (p.dieselFuelPriceTomanPerLiter || 3500)
    : 0;

  // 3. Year 1 Revenue / Energy Savings
  const year1RevenueToman = annualYieldKwh * p.gridTariffTomanPerKwh;
  const year1RevenueUsd = year1RevenueToman / p.usdToTomanRate;

  // 4. 25-Year Cash Flow Pro-Forma Projection
  const cashFlow25Years: YearCashFlowItem[] = [];
  let cumulativeCashFlow = -totalCapexToman;
  let discountedNpvSum = -totalCapexToman;
  let simplePayback = lifetimeYears;
  let discountedPayback = lifetimeYears;
  let foundSimple = false;
  let foundDiscounted = false;

  const r = p.discountRatePct / 100.0;
  const degradationRate = 0.005; // 0.5% module degradation per year

  for (let yr = 1; yr <= lifetimeYears; yr++) {
    const degradedGen = annualYieldKwh * Math.pow(1 - degradationRate, yr - 1);
    const tariffEscalated = p.gridTariffTomanPerKwh * Math.pow(1 + p.tariffEscalationPct / 100.0, yr - 1);
    const revenue = degradedGen * tariffEscalated;
    const opex = baseAnnualOpexToman * Math.pow(1.08, yr - 1); // 8% opex inflation
    const fuel = annualDieselFuelCostToman * Math.pow(1.08, yr - 1);
    const netCashFlow = revenue - (opex + fuel);

    cumulativeCashFlow += netCashFlow;
    const discountedCashFlow = netCashFlow / Math.pow(1 + r, yr);
    discountedNpvSum += discountedCashFlow;

    if (!foundSimple && cumulativeCashFlow >= 0) {
      simplePayback = yr - 1 + Math.abs(cumulativeCashFlow - netCashFlow) / netCashFlow;
      foundSimple = true;
    }

    if (!foundDiscounted && discountedNpvSum >= 0) {
      discountedPayback = yr;
      foundDiscounted = true;
    }

    cashFlow25Years.push({
      year: yr,
      generationKwh: Math.round(degradedGen),
      revenueToman: Math.round(revenue),
      opexToman: Math.round(opex),
      fuelCostToman: Math.round(fuel),
      netCashFlowToman: Math.round(netCashFlow),
      cumulativeCashFlowToman: Math.round(cumulativeCashFlow),
      discountedCashFlowToman: Math.round(discountedCashFlow),
    });
  }

  // 5. IRR Calculation using Binary Search
  let lowIrr = -0.5;
  let highIrr = 1.0;
  for (let iter = 0; iter < 40; iter++) {
    const midIrr = (lowIrr + highIrr) / 2.0;
    let npvAtMid = -totalCapexToman;
    for (let yr = 1; yr <= lifetimeYears; yr++) {
      npvAtMid += cashFlow25Years[yr - 1].netCashFlowToman / Math.pow(1 + midIrr, yr);
    }
    if (npvAtMid > 0) {
      lowIrr = midIrr;
    } else {
      highIrr = midIrr;
    }
  }
  const calculatedIrrPct = Number(((lowIrr + highIrr) / 2.0 * 100.0).toFixed(1));

  // 6. LCOE Calculation
  let sumDiscountedCosts = totalCapexToman;
  let sumDiscountedEnergyKwh = 0;
  for (let yr = 1; yr <= lifetimeYears; yr++) {
    const yrCost = cashFlow25Years[yr - 1].opexToman + cashFlow25Years[yr - 1].fuelCostToman;
    sumDiscountedCosts += yrCost / Math.pow(1 + r, yr);
    sumDiscountedEnergyKwh += cashFlow25Years[yr - 1].generationKwh / Math.pow(1 + r, yr);
  }
  const lcoeTomanPerKwh = Number((sumDiscountedCosts / Math.max(1, sumDiscountedEnergyKwh)).toFixed(0));
  const lcoeUsdPerKwh = Number((lcoeTomanPerKwh / p.usdToTomanRate).toFixed(4));

  // 7. CO2 Abatement
  const annualCo2ReductionTons = (annualYieldKwh * 0.00062);
  const lifetime25yCo2ReductionTons = annualCo2ReductionTons * lifetimeYears * 0.94;

  return {
    capexBreakdown,
    annualEnergyYieldKwh: Math.round(annualYieldKwh),
    annualOpexUsd: Math.round(baseAnnualOpexUsd),
    annualOpexToman: Math.round(baseAnnualOpexToman),
    annualRevenueToman: Math.round(year1RevenueToman),
    annualRevenueUsd: Math.round(year1RevenueUsd),
    simplePaybackPeriodYears: Number(simplePayback.toFixed(1)),
    discountedPaybackPeriodYears: Number(discountedPayback.toFixed(1)),
    lcoeUsdPerKwh,
    lcoeTomanPerKwh,
    npvUsd: Math.round(discountedNpvSum / p.usdToTomanRate),
    npvToman: Math.round(discountedNpvSum),
    irrPct: calculatedIrrPct,
    annualCo2ReductionTons: Math.round(annualCo2ReductionTons),
    lifetime25yCo2ReductionTons: Math.round(lifetime25yCo2ReductionTons),
    cashFlow25Years,
  };
}
