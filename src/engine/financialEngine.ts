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
  hvConnectionUsdPerKva: number;
  ppaTariffTomanPerKwh: number;
  landLeaseUsdPerKwpYear: number;
  gridOperatorFeeUsdPerKwpYear: number;
  dieselAnnualServiceOpexUsd: number;
  annualDegradationRate?: number;         // Dynamic degradation from environmental aging
  inverterReplacementYear?: number | null;// Replacement year for outdoor inverters in harsh climates
  inverterReplacementCostRatio?: number;  // Cost ratio (learning curve reduction, default 0.60)
  batteryChemistry?: string;              // e.g. 'lifepo4', 'gel_deep_cycle', 'agm_flooded'
  batteryLifespanYears?: number;          // Chemistry-dependent battery calendar life (AGM ~3y, Gel ~4y, LFP ~12y)
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
  hvConnectionUsdPerKva: 45,
  ppaTariffTomanPerKwh: 2800,
  landLeaseUsdPerKwpYear: 0.12,
  gridOperatorFeeUsdPerKwpYear: 0.06,
  dieselAnnualServiceOpexUsd: 1800,
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
  hvConnectionUsd: number;
  hvConnectionToman: number;
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
  inverterReplacementToman?: number;
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
  // Diesel backup economics (off-grid / hybrid)
  dieselFuelCostUsd: number;        // annual diesel fuel cost, USD
  dieselOpexUsd: number;            // annual diesel service & maintenance, USD
  batteryReplacementCostUsd: number;// year-12 battery replacement reserve, USD
  // Cost of energy actually served (annualized cost / annual energy)
  costOfEnergyServedUsdPerKwh: number;
  // Power-plant tariff & fixed annual charges
  ppaTariffTomanPerKwh: number;     // effective PPA tariff applied this run
  landLeaseAnnualUsd: number;       // annual ground lease, USD
  gridOperatorFeeAnnualUsd: number; // annual grid operator fee, USD
  npvUsd: number;
  npvToman: number;
  irrPct: number;
  isIrrDefined: boolean;
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
  const isDieselActive = p.includeDieselGenSet !== undefined
    ? Boolean(p.includeDieselGenSet)
    : systemMode === 'offgrid';

  const dieselUsd = isDieselActive ? (p.dieselGenSetCapexUsd !== undefined ? p.dieselGenSetCapexUsd : 12000) : 0;

  let substationUsd = 0;
  let gridInterconnectionUsd = 0;
  let hvConnectionUsd = 0;
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
      hvConnectionUsd = inverterCapacityKw * p.hvConnectionUsdPerKva; // HV connection / transmission interconnection fee
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
    hvConnectionUsd +
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
    hvConnectionUsd: Math.round(hvConnectionUsd),
    hvConnectionToman: Math.round(hvConnectionUsd * p.usdToTomanRate),
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

  // In Off-Grid or Hybrid with active generator, include generator fuel consumption for backup
  const annualDieselFuelCostToman = isDieselActive
    ? ((p.dieselAnnualFuelLiters && p.dieselAnnualFuelLiters > 0 ? p.dieselAnnualFuelLiters : 3500) * (p.dieselFuelPriceTomanPerLiter || 3500))
    : 0;

  // Power-plant fixed annual charges (land lease + grid operator fee) and
  // diesel backup service OPEX (off-grid / hybrid only). Applied every year
  // of the pro-forma; not escalated (fixed contract charges).
  const landLeaseAnnualUsd = systemMode === 'powerplant' ? totalPvCapacityKwp * p.landLeaseUsdPerKwpYear : 0;
  const gridOperatorFeeAnnualUsd = systemMode === 'powerplant' ? totalPvCapacityKwp * p.gridOperatorFeeUsdPerKwpYear : 0;
  const dieselOpexUsd = isDieselActive ? (p.dieselAnnualServiceOpexUsd ?? 1500) : 0;
  const dieselFuelCostUsd = isDieselActive
    ? ((p.dieselAnnualFuelLiters && p.dieselAnnualFuelLiters > 0 ? p.dieselAnnualFuelLiters : 3500) * (p.dieselFuelPriceTomanPerLiter || 3500)) / p.usdToTomanRate
    : 0;
  const batteryReplacementCostUsd = batteryReplacementYear12Usd;
  const fixedAnnualChargesUsd = landLeaseAnnualUsd + gridOperatorFeeAnnualUsd + dieselOpexUsd;

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
      year1RevenueToman = annualYieldKwh * p.ppaTariffTomanPerKwh;
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
  const degradationRate = p.annualDegradationRate !== undefined && p.annualDegradationRate > 0
    ? p.annualDegradationRate
    : 0.005; // 0.5% default module degradation per year

  // Chemistry-dependent battery replacement calendar life (AGM ~3y, Gel ~4y, NCM ~8y, LFP ~12y)
  const batteryLifespanYears: number = (() => {
    if (p.batteryLifespanYears && p.batteryLifespanYears > 0) {
      return p.batteryLifespanYears;
    }
    const chem = (p.batteryChemistry || '').toLowerCase();
    if (chem.includes('agm') || chem.includes('lead') || chem.includes('vrla')) return 3;
    if (chem.includes('gel')) return 4;
    if (chem.includes('ncm') || chem.includes('ternary')) return 8;
    return 12; // LiFePO4 / default calendar life
  })();

  for (let yr = 1; yr <= lifetimeYears; yr++) {
    const degradedGen = annualYieldKwh * Math.pow(1 - degradationRate, yr - 1);
    const tariffEscalated = (year1RevenueToman / Math.max(1, annualYieldKwh)) * Math.pow(1 + p.tariffEscalationPct / 100.0, yr - 1);
    const revenue = degradedGen * tariffEscalated;
    const opex = baseAnnualOpexToman * Math.pow(1.08, yr - 1) + fixedAnnualChargesUsd * p.usdToTomanRate; // 8% opex inflation + fixed annual charges
    const fuel = annualDieselFuelCostToman * Math.pow(1.08, yr - 1);
    const isBatteryReplacementYr =
      batteriesUsd > 0 &&
      yr < lifetimeYears &&
      yr % batteryLifespanYears === 0;
    const batteryReplacementToman = isBatteryReplacementYr
      ? (batteriesUsd * 0.70) * p.usdToTomanRate * Math.pow(1.05, yr - 1)
      : 0;
    const inverterReplacementToman = (p.inverterReplacementYear && yr === p.inverterReplacementYear && invertersUsd > 0)
      ? invertersUsd * (p.inverterReplacementCostRatio ?? 0.60) * p.usdToTomanRate * Math.pow(1.05, yr - 1)
      : 0;

    const netCashFlow = revenue - (opex + fuel + batteryReplacementToman + inverterReplacementToman);

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
      inverterReplacementToman: Math.round(inverterReplacementToman),
      netCashFlowToman: Math.round(netCashFlow),
      cumulativeCashFlowToman: Math.round(cumulativeCashFlow),
      discountedCashFlowToman: Math.round(discountedCashFlow),
    });
  }

  // 5. Internal Rate of Return (IRR) Binary Search with Bolzano Existence Check
  const cashFlows: number[] = [-totalCapexToman, ...cashFlow25Years.map(c => c.netCashFlowToman)];
  const hasPositive = cashFlows.some(cf => cf > 0);
  const hasNegative = cashFlows.some(cf => cf < 0);
  const undiscountedSum = cashFlows.reduce((sum, val) => sum + val, 0);

  let calculatedIrrPct = 0;
  let isIrrDefined = false;

  if (hasPositive && hasNegative && undiscountedSum > 0 && totalCapexToman > 0) {
    let lowIrr = -0.5;
    let highIrr = 3.0;

    const npvAt = (rate: number): number => {
      let npv = -totalCapexToman;
      for (let yr = 1; yr <= lifetimeYears; yr++) {
        npv += cashFlow25Years[yr - 1].netCashFlowToman / Math.pow(1 + rate, yr);
      }
      return npv;
    };

    const npvLow = npvAt(lowIrr);
    const npvHigh = npvAt(highIrr);

    // Bolzano's Intermediate Value Theorem: root exists in [low, high] only if signs differ
    if (npvLow * npvHigh <= 0) {
      for (let iter = 0; iter < 50; iter++) {
        const midIrr = (lowIrr + highIrr) / 2.0;
        const npvAtMid = npvAt(midIrr);
        if (npvAtMid > 0) {
          lowIrr = midIrr;
        } else {
          highIrr = midIrr;
        }
      }
      calculatedIrrPct = Number(((lowIrr + highIrr) / 2.0 * 100.0).toFixed(1));
      isIrrDefined = true;
    }
  }

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
  // ENG-6: the previous floor of 1 kWh inflated LCOE by up to 1000x when a
  // pathological input produced finite-but-sub-unit discounted energy
  // (e.g., 0.5 kWh -> 2x inflation; 0.05 kWh -> 20x). The 0.001 kWh floor
  // preserves the actual calculation for the 0.001-1 range and only caps
  // truly degenerate inputs (0 energy still yields a large but finite
  // number, not an exception).
  const lcoeTomanPerKwh = Number((sumDiscountedCosts / Math.max(0.001, sumDiscountedEnergyKwh)).toFixed(0));
  const lcoeUsdPerKwh = Number((lcoeTomanPerKwh / p.usdToTomanRate).toFixed(4));

  // Cost of energy actually served = annualized lifetime cost / year-1 energy.
  // Includes annualized CAPEX (capital recovery factor), OPEX, diesel fuel &
  // service OPEX, land lease and grid operator fees. Distinct from LCOE which
  // discounts costs & energy over the lifetime.
  const crf = lifetimeYears > 0
    ? (r * Math.pow(1 + r, lifetimeYears)) / (Math.pow(1 + r, lifetimeYears) - 1)
    : 0;
  const annualizedCapexUsd = totalCapexUsd * crf;
  const annualCostOfEnergyServedUsd =
    annualizedCapexUsd +
    baseAnnualOpexUsd +
    dieselFuelCostUsd +
    dieselOpexUsd +
    landLeaseAnnualUsd +
    gridOperatorFeeAnnualUsd;
  const costOfEnergyServedUsdPerKwh = annualCostOfEnergyServedUsd / Math.max(1, annualYieldKwh);

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
    dieselFuelCostUsd: Number(dieselFuelCostUsd.toFixed(4)),
    dieselOpexUsd,
    batteryReplacementCostUsd: Math.round(batteryReplacementCostUsd),
    costOfEnergyServedUsdPerKwh: Number(costOfEnergyServedUsdPerKwh.toFixed(6)),
    ppaTariffTomanPerKwh: p.ppaTariffTomanPerKwh,
    landLeaseAnnualUsd: Number(landLeaseAnnualUsd.toFixed(2)),
    gridOperatorFeeAnnualUsd: Number(gridOperatorFeeAnnualUsd.toFixed(2)),
    npvUsd: Math.round(discountedNpvSum / p.usdToTomanRate),
    npvToman: Math.round(discountedNpvSum),
    irrPct: calculatedIrrPct,
    isIrrDefined,
    annualCo2ReductionTons: Math.round(annualCo2ReductionTons),
    lifetime25yCo2ReductionTons: Math.round(lifetime25yCo2ReductionTons),
    cashFlow25Years,
  };
}
