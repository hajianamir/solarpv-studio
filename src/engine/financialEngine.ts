// Comprehensive Financial Engine: Mode-Aware (Off-Grid, On-Grid, Powerplant), User-Driven Pricing, CAPEX, OPEX, LCOE, NPV, IRR & 25-Year Cash Flow
// Conforming to NREL SAM Financial Models, IRENA Renewable Power Generation Costs & SATBA PPA Regulations

export type FinancialSystemMode = 'powerplant' | 'ongrid' | 'offgrid';

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
  systemMode: FinancialSystemMode;
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
  gridInterconnectionUsd: number;
  gridInterconnectionToman: number;
  dieselGenSetUsd: number;
  dieselGenSetToman: number;
  engineeringAndInstallationUsd: number;
  engineeringAndInstallationToman: number;
  batteryReplacementYear12Usd: number;
  totalCapexUsd: number;
  totalCapexToman: number;
}

export interface YearCashFlowItem {
  year: number;
  generationKwh: number;
  revenueToman: number;
  opexToman: number;
  fuelCostToman: number;
  batteryReplacementToman: number;
  netCashFlowToman: number;
  cumulativeCashFlowToman: number;
  discountedCashFlowToman: number;
}

export interface FinancialAnalysisResult {
  systemMode: FinancialSystemMode;
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
  lifetimeYears: number = 25,
  systemMode: FinancialSystemMode = 'powerplant'
): FinancialAnalysisResult {
  const p: UserFinancialPricing = {
    ...DEFAULT_FINANCIAL_PRICING,
    ...(customPricing || {}),
  };

  const pvWatts = totalPvCapacityKwp * 1000.0;
  const plantMva = Math.max(0.1, (inverterCapacityKw / 1000.0) * 1.15);

  // 1. System Mode-Aware CAPEX & Balance of Plant (BOP) Allocation
  const modulesUsd = pvWatts * p.moduleUsdPerWp;
  const invertersUsd = inverterCapacityKw * p.inverterUsdPerKw;
  const batteriesUsd = systemMode === 'powerplant' ? 0 : batteryCapacityKwh * p.batteryUsdPerKwh;
  const structuresUsd = pvWatts * p.structureUsdPerWp;
  const cablesBopUsd = pvWatts * p.cablingBopUsdPerWp;
  const epcLaborUsd = inverterCapacityKw * p.epcLaborUsdPerKw;
  const dieselUsd = (systemMode === 'offgrid' || p.includeDieselGenSet) ? (p.dieselGenSetCapexUsd || 12000) : 0;

  let substationUsd = 0;
  let gridInterconnectionUsd = 0;
  let batteryReplacementYear12Usd = 0;

  switch (systemMode) {
    case 'offgrid':
      // Off-Grid Microgrid: Absolutely ZERO substation or utility grid connection cost
      substationUsd = 0;
      gridInterconnectionUsd = 0;
      // Scheduled battery replacement reserve at Year 12 (expected battery calendar life)
      batteryReplacementYear12Usd = batteriesUsd * 0.70; // 30% cost learning curve reduction by Year 12
      break;

    case 'ongrid':
      // Commercial/Industrial Distributed Rooftop: No HV substation unless > 500 kW
      substationUsd = inverterCapacityKw > 500 ? plantMva * p.substationUsdPerMva : 0;
      gridInterconnectionUsd = inverterCapacityKw * 10.0; // Local utility net-metering & bidirectional protection cubicle
      batteryReplacementYear12Usd = batteriesUsd > 0 ? batteriesUsd * 0.70 : 0;
      break;

    case 'powerplant':
    default:
      // Utility Power Plant: Full step-up substation, HV switchyard, Bay RMU, and grid interconnection
      substationUsd = plantMva * p.substationUsdPerMva;
      gridInterconnectionUsd = plantMva * 24000; // Transmission line bay, SCADA gateway, SATBA metering
      batteryReplacementYear12Usd = 0;
      break;
  }

  const totalCapexUsd =
    modulesUsd +
    invertersUsd +
    batteriesUsd +
    structuresUsd +
    cablesBopUsd +
    substationUsd +
    gridInterconnectionUsd +
    epcLaborUsd +
    dieselUsd;

  const totalCapexToman = totalCapexUsd * p.usdToTomanRate;

  const capexBreakdown: FinancialCapexBreakdown = {
    systemMode,
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
    gridInterconnectionUsd: Math.round(gridInterconnectionUsd),
    gridInterconnectionToman: Math.round(gridInterconnectionUsd * p.usdToTomanRate),
    dieselGenSetUsd: Math.round(dieselUsd),
    dieselGenSetToman: Math.round(dieselUsd * p.usdToTomanRate),
    engineeringAndInstallationUsd: Math.round(epcLaborUsd),
    engineeringAndInstallationToman: Math.round(epcLaborUsd * p.usdToTomanRate),
    batteryReplacementYear12Usd: Math.round(batteryReplacementYear12Usd),
    totalCapexUsd: Math.round(totalCapexUsd),
    totalCapexToman: Math.round(totalCapexToman),
  };

  // 2. OPEX & Fuel Simulation
  const baseAnnualOpexToman = totalCapexToman * (p.annualOpexPctOfCapex / 100.0);
  const baseAnnualOpexUsd = totalCapexUsd * (p.annualOpexPctOfCapex / 100.0);

  // In Off-Grid, include generator fuel consumption for backup
  const annualDieselFuelCostToman = (systemMode === 'offgrid' || p.includeDieselGenSet)
    ? (p.dieselAnnualFuelLiters || 3500) * (p.dieselFuelPriceTomanPerLiter || 3500)
    : 0;

  // 3. Mode-Aware Year 1 Revenue / Energy Savings
  let year1RevenueToman = 0;
  switch (systemMode) {
    case 'offgrid':
      // Off-Grid: Zero grid feed-in revenue. Economic value is derived from displacement of expensive diesel generation
      // Baseline off-grid diesel generation cost in remote sites is approx ~0.24 $/kWh (21,600 Toman/kWh)
      const avoidedDieselTariffTomanPerKwh = Math.max(p.gridTariffTomanPerKwh * 3.5, 18000);
      year1RevenueToman = annualYieldKwh * avoidedDieselTariffTomanPerKwh;
      break;

    case 'ongrid':
      // On-Grid: Net-metering energy bill reduction at user's retail utility tariff
      year1RevenueToman = annualYieldKwh * p.gridTariffTomanPerKwh;
      break;

    case 'powerplant':
    default:
      // Powerplant: Guaranteed Power Purchase Agreement (PPA) feed-in tariff with indexation
      year1RevenueToman = annualYieldKwh * p.gridTariffTomanPerKwh;
      break;
  }
  const year1RevenueUsd = year1RevenueToman / p.usdToTomanRate;

  // 4. 25-Year Pro-Forma Cash Flow Projection
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
    const tariffEscalated = (year1RevenueToman / Math.max(1, annualYieldKwh)) * Math.pow(1 + p.tariffEscalationPct / 100.0, yr - 1);
    const revenue = degradedGen * tariffEscalated;
    const opex = baseAnnualOpexToman * Math.pow(1.08, yr - 1); // 8% opex inflation
    const fuel = annualDieselFuelCostToman * Math.pow(1.08, yr - 1);
    const batteryReplacementToman = (yr === 12 && batteryReplacementYear12Usd > 0)
      ? batteryReplacementYear12Usd * p.usdToTomanRate * Math.pow(1.05, 11)
      : 0;

    const netCashFlow = revenue - (opex + fuel + batteryReplacementToman);

    cumulativeCashFlow += netCashFlow;
    const discountedCashFlow = netCashFlow / Math.pow(1 + r, yr);
    discountedNpvSum += discountedCashFlow;

    if (!foundSimple && cumulativeCashFlow >= 0) {
      simplePayback = yr - 1 + Math.abs(cumulativeCashFlow - netCashFlow) / Math.max(1, netCashFlow);
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
      batteryReplacementToman: Math.round(batteryReplacementToman),
      netCashFlowToman: Math.round(netCashFlow),
      cumulativeCashFlowToman: Math.round(cumulativeCashFlow),
      discountedCashFlowToman: Math.round(discountedCashFlow),
    });
  }

  // 5. Internal Rate of Return (IRR) Binary Search
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

  // 6. Levelized Cost of Energy (LCOE) Calculation
  let sumDiscountedCosts = totalCapexToman;
  let sumDiscountedEnergyKwh = 0;
  for (let yr = 1; yr <= lifetimeYears; yr++) {
    const yrCost =
      cashFlow25Years[yr - 1].opexToman +
      cashFlow25Years[yr - 1].fuelCostToman +
      cashFlow25Years[yr - 1].batteryReplacementToman;
    sumDiscountedCosts += yrCost / Math.pow(1 + r, yr);
    sumDiscountedEnergyKwh += cashFlow25Years[yr - 1].generationKwh / Math.pow(1 + r, yr);
  }
  const lcoeTomanPerKwh = Number((sumDiscountedCosts / Math.max(1, sumDiscountedEnergyKwh)).toFixed(0));
  const lcoeUsdPerKwh = Number((lcoeTomanPerKwh / p.usdToTomanRate).toFixed(4));

  // 7. Lifetime CO2 Emission Avoidance
  const annualCo2ReductionTons = (annualYieldKwh * 0.00062);
  const lifetime25yCo2ReductionTons = annualCo2ReductionTons * lifetimeYears * 0.94;

  return {
    systemMode,
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
