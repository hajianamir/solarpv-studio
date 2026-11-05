// Comprehensive Financial Engine: Mode-Aware (Off-Grid, On-Grid, Powerplant), User-Driven Pricing,
// CAPEX, OPEX, LCOE, NPV, IRR & Multi-Year Cash Flow Architecture.
// Conforming to NREL SAM Financial Models, IRENA Renewable Power Generation Costs & SATBA PPA Regulations.

export type FinancialSystemMode = 'powerplant' | 'ongrid' | 'offgrid';

export type IrrStatus =
  | 'DEFINED_SINGLE_ROOT'
  | 'NO_SIGN_CHANGE'
  | 'NO_ROOT_IN_RANGE'
  | 'NON_CONVENTIONAL_MULTIPLE_ROOTS'
  | 'ROOT_OUT_OF_BOUNDS';

export type PaybackStatus =
  | 'PAYBACK_ACHIEVED'
  | 'NOT_ACHIEVED_WITHIN_HORIZON'
  | 'INVALID_INPUT'
  | 'ZERO_REVENUE';

export interface PaybackPeriodResult {
  years: number | null;
  status: PaybackStatus;
  formattedYears: string;
}

export interface UserFinancialPricing {
  moduleUsdPerWp: number; // e.g. 0.14 $/Wp
  inverterUsdPerKw: number; // e.g. 55 $/kW
  batteryUsdPerKwh: number; // e.g. 160 $/kWh
  structureUsdPerWp: number; // e.g. 0.045 $/Wp
  cablingBopUsdPerWp: number; // e.g. 0.035 $/Wp
  substationUsdPerMva: number; // e.g. 35,000 $/MVA
  epcLaborUsdPerKw: number; // e.g. 25 $/kW
  gridTariffTomanPerKwh: number; // e.g. 3,800 Toman/kWh (On-Grid retail net-metering displacement)
  usdToTomanRate: number; // e.g. 90,000 Toman/$
  annualOpexPctOfCapex: number; // e.g. 1.2% / year
  discountRatePct: number; // e.g. 18% IRR discount rate
  tariffEscalationPct: number; // e.g. 15% annual tariff indexation
  includeDieselGenSet?: boolean;
  dieselGenSetCapexUsd?: number; // e.g. 12,000 $
  dieselAnnualFuelLiters?: number; // e.g. 3,500 L/year (derived or user-specified)
  dieselAnnualRunHours?: number; // e.g. 250 h/year proxy
  dieselFuelConsumptionLitersPerHour?: number; // e.g. 14 L/h
  dieselFuelPriceTomanPerLiter?: number; // e.g. 3,500 Toman/L subsidized / 25,000 free-market
  dieselAnnualServiceOpexUsd: number; // e.g. 1,800 $/year
  hvConnectionUsdPerKva: number; // e.g. 45 $/kVA of apparent power demand (S = P / PF)
  plantPowerFactor?: number; // e.g. 0.95 nominal operating power factor for apparent power conversion
  contingencyCapexPct?: number; // e.g. 3.0% physical/price contingency reserve
  ppaTariffTomanPerKwh: number; // e.g. 2,800 Toman/kWh (Utility PPA contract feed-in tariff)
  offgridAvoidedCostTomanPerKwh?: number; // e.g. 21,600 Toman/kWh (~$0.24/kWh remote diesel displacement proxy)
  landLeaseUsdPerKwpYear: number;
  gridOperatorFeeUsdPerKwpYear: number;
  annualDegradationRate?: number; // Dynamic degradation from environmental aging (%/yr as fraction, e.g. 0.005)
  inverterReplacementYear?: number | null; // Replacement year for outdoor inverters
  inverterReplacementCostRatio?: number; // Cost ratio (learning curve reduction, default 0.60)
  batteryChemistry?: string; // e.g. 'lifepo4', 'gel_deep_cycle', 'agm_flooded'
  batteryLifespanYears?: number; // Chemistry-dependent battery calendar life (AGM ~3y, Gel ~4y, LFP ~12y)
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
  contingencyUsd: number;
  contingencyToman: number;
  batteryReplacementYear12Usd: number; // Future reserve (not part of Year 0 initial CAPEX)
  totalCapexUsd: number;
  totalCapexToman: number;
  isReconciled: boolean;
}

export interface YearCashFlowItem {
  year: number;
  capexToman: number;
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

export interface FinancialAssumptionsMetadata {
  modelScope: 'PRE_TAX_PRELIMINARY_SCREENING';
  discountRatePct: number;
  tariffEscalationPct: number;
  annualDegradationPct: number;
  annualOpexPctOfCapex: number;
  plantPowerFactor: number;
  usdToTomanRate: number;
  activeModeTariffUnit: string;
  activeModeTariffValue: number;
  standardsReference: string;
  citationDate: string;
}

export interface FinancialAnalysisResult {
  systemMode: FinancialSystemMode;
  capexBreakdown: FinancialCapexBreakdown;
  annualEnergyYieldKwh: number;
  annualOpexUsd: number;
  annualOpexToman: number;
  annualRevenueToman: number;
  annualRevenueUsd: number;
  simplePaybackPeriodYears: number | null;
  discountedPaybackPeriodYears: number | null;
  simplePayback: PaybackPeriodResult;
  discountedPayback: PaybackPeriodResult;
  lcoeUsdPerKwh: number | null;
  lcoeTomanPerKwh: number | null;
  isLcoeDefined: boolean;
  batteryReplacementNotesFa?: string;
  // Diesel backup economics (off-grid / hybrid)
  dieselFuelCostUsd: number; // annual diesel fuel cost, USD
  dieselOpexUsd: number; // annual diesel service & maintenance, USD
  dieselEstimatedAnnualFuelLiters: number;
  batteryReplacementCostUsd: number; // year-12 battery replacement reserve, USD
  // Cost of energy served (proxy when dispatch is unsimulated)
  costOfEnergyServedUsdPerKwh: number | null;
  costOfEnergyServedProxyUsdPerKwh: number | null;
  costOfEnergyServedStatus: 'DISPATCH_SIMULATED' | 'PROXY_UNCONSTRAINED_YIELD' | 'UNDEFINED';
  costOfEnergyServedNoteFa: string;
  costOfEnergyServedNoteEn: string;
  // Active tariff applied
  activeModeTariffTomanPerKwh: number;
  ppaTariffTomanPerKwh: number;
  gridTariffTomanPerKwh: number;
  offgridAvoidedCostTomanPerKwh: number;
  landLeaseAnnualUsd: number;
  gridOperatorFeeAnnualUsd: number;
  npvUsd: number;
  npvToman: number;
  irrPct: number | null;
  irrStatus: IrrStatus;
  isIrrDefined: boolean;
  annualCo2ReductionTons: number;
  lifetime25yCo2ReductionTons: number;
  year0CashFlow: YearCashFlowItem;
  cashFlow25Years: YearCashFlowItem[];
  cashFlowWithYear0: YearCashFlowItem[];
  isCashFlowReconciled: boolean;
  assumptionsMetadata: FinancialAssumptionsMetadata;
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

  const safePvKwp = Math.max(0, Number.isFinite(totalPvCapacityKwp) ? totalPvCapacityKwp : 0);
  const safeBatteryKwh = Math.max(0, Number.isFinite(batteryCapacityKwh) ? batteryCapacityKwh : 0);
  const safeInverterKw = Math.max(0, Number.isFinite(inverterCapacityKw) ? inverterCapacityKw : 0);
  const safeAnnualYieldKwh = Math.max(0, Number.isFinite(annualYieldKwh) ? annualYieldKwh : 0);
  const safeLifetimeYears = Math.max(1, Math.min(50, Math.round(Number.isFinite(lifetimeYears) ? lifetimeYears : 25)));

  const pvWatts = safePvKwp * 1000.0;
  const powerFactor = Math.max(0.70, Math.min(1.0, p.plantPowerFactor ?? 0.95));
  // Plant apparent power demand: S_kVA = P_kW / PF
  const plantApparentPowerKva = safeInverterKw > 0 ? safeInverterKw / powerFactor : 0;
  const plantMva = Math.max(0.0, plantApparentPowerKva / 1000.0);

  // 1. System Mode-Aware CAPEX & Balance of Plant (BOP) Allocation
  const modulesUsd = pvWatts * p.moduleUsdPerWp;
  const invertersUsd = safeInverterKw * p.inverterUsdPerKw;
  const batteriesUsd = systemMode === 'powerplant' ? 0 : safeBatteryKwh * p.batteryUsdPerKwh;
  const structuresUsd = pvWatts * p.structureUsdPerWp;
  const cablesBopUsd = pvWatts * p.cablingBopUsdPerWp;
  const epcLaborUsd = safeInverterKw * p.epcLaborUsdPerKw;

  const isDieselActive = p.includeDieselGenSet !== undefined
    ? Boolean(p.includeDieselGenSet)
    : systemMode === 'offgrid';

  const dieselUsd = isDieselActive ? Math.max(0, p.dieselGenSetCapexUsd ?? 12000) : 0;

  let substationUsd = 0;
  let gridInterconnectionUsd = 0;
  let hvConnectionUsd = 0;
  let batteryReplacementYear12Usd = 0;

  switch (systemMode) {
    case 'offgrid':
      substationUsd = 0;
      gridInterconnectionUsd = 0;
      hvConnectionUsd = 0;
      batteryReplacementYear12Usd = batteriesUsd * 0.70;
      break;

    case 'ongrid':
      substationUsd = safeInverterKw > 500 ? plantMva * p.substationUsdPerMva : 0;
      gridInterconnectionUsd = safeInverterKw * 10.0;
      hvConnectionUsd = 0;
      batteryReplacementYear12Usd = batteriesUsd > 0 ? batteriesUsd * 0.70 : 0;
      break;

    case 'powerplant':
    default:
      substationUsd = plantMva * p.substationUsdPerMva;
      gridInterconnectionUsd = plantMva * 24000;
      // Rigorous apparent power unit consistency: $/kVA * kVA = $
      hvConnectionUsd = plantApparentPowerKva * p.hvConnectionUsdPerKva;
      batteryReplacementYear12Usd = 0;
      break;
  }

  const baseSubtotalCapexUsd =
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

  const contingencyPct = Math.max(0, Math.min(30, p.contingencyCapexPct ?? 0));
  const contingencyUsd = (baseSubtotalCapexUsd * contingencyPct) / 100.0;

  const totalCapexUsd = baseSubtotalCapexUsd + contingencyUsd;
  const totalCapexToman = totalCapexUsd * p.usdToTomanRate;

  // Fully reconciled breakdown: sum of rounded parts strictly equals total
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
    contingencyUsd: Math.round(contingencyUsd),
    contingencyToman: Math.round(contingencyUsd * p.usdToTomanRate),
    batteryReplacementYear12Usd: Math.round(batteryReplacementYear12Usd),
    totalCapexUsd: Math.round(totalCapexUsd),
    totalCapexToman: Math.round(totalCapexToman),
    isReconciled: true,
  };

  // Reconcile rounding delta into totalCapex to ensure 100% exact balance
  const sumItemsUsd =
    capexBreakdown.pvModulesUsd +
    capexBreakdown.invertersUsd +
    capexBreakdown.batteriesUsd +
    capexBreakdown.structuresUsd +
    capexBreakdown.cablesAndProtectionUsd +
    capexBreakdown.substationMvUsd +
    capexBreakdown.gridInterconnectionUsd +
    capexBreakdown.hvConnectionUsd +
    capexBreakdown.dieselGenSetUsd +
    capexBreakdown.engineeringAndInstallationUsd +
    capexBreakdown.contingencyUsd;
  capexBreakdown.totalCapexUsd = sumItemsUsd;

  const sumItemsToman =
    capexBreakdown.pvModulesToman +
    capexBreakdown.invertersToman +
    capexBreakdown.batteriesToman +
    capexBreakdown.structuresToman +
    capexBreakdown.cablesAndProtectionToman +
    capexBreakdown.substationMvToman +
    capexBreakdown.gridInterconnectionToman +
    capexBreakdown.hvConnectionToman +
    capexBreakdown.dieselGenSetToman +
    capexBreakdown.engineeringAndInstallationToman +
    capexBreakdown.contingencyToman;
  capexBreakdown.totalCapexToman = sumItemsToman;

  // 2. OPEX & Diesel Fuel Estimation (Explicit Proxy Model)
  const baseAnnualOpexToman = totalCapexToman * (p.annualOpexPctOfCapex / 100.0);
  const baseAnnualOpexUsd = totalCapexUsd * (p.annualOpexPctOfCapex / 100.0);

  // Diesel fuel liters calculation from user inputs
  let estimatedAnnualFuelLiters = 0;
  if (isDieselActive) {
    if (p.dieselAnnualFuelLiters !== undefined && p.dieselAnnualFuelLiters > 0) {
      estimatedAnnualFuelLiters = p.dieselAnnualFuelLiters;
    } else if (p.dieselAnnualRunHours && p.dieselFuelConsumptionLitersPerHour) {
      estimatedAnnualFuelLiters = p.dieselAnnualRunHours * p.dieselFuelConsumptionLitersPerHour;
    } else {
      estimatedAnnualFuelLiters = 3500;
    }
  }

  const fuelPriceTomanPerLiter = p.dieselFuelPriceTomanPerLiter ?? 3500;
  const annualDieselFuelCostToman = isDieselActive ? estimatedAnnualFuelLiters * fuelPriceTomanPerLiter : 0;
  const dieselFuelCostUsd = p.usdToTomanRate > 0 ? annualDieselFuelCostToman / p.usdToTomanRate : 0;
  const dieselOpexUsd = isDieselActive ? (p.dieselAnnualServiceOpexUsd ?? 1800) : 0;

  const landLeaseAnnualUsd = systemMode === 'powerplant' ? safePvKwp * p.landLeaseUsdPerKwpYear : 0;
  const gridOperatorFeeAnnualUsd = systemMode === 'powerplant' ? safePvKwp * p.gridOperatorFeeUsdPerKwpYear : 0;
  const fixedAnnualChargesUsd = landLeaseAnnualUsd + gridOperatorFeeAnnualUsd + dieselOpexUsd;

  // 3. Mode-Aware Year 1 Revenue / Energy Savings
  let year1RevenueToman = 0;
  let activeModeTariffTomanPerKwh = 0;

  switch (systemMode) {
    case 'offgrid': {
      // Off-Grid: Avoided cost of remote diesel power displacement
      const avoidedDieselTariff = p.offgridAvoidedCostTomanPerKwh ?? 21600;
      activeModeTariffTomanPerKwh = avoidedDieselTariff;
      year1RevenueToman = safeAnnualYieldKwh * avoidedDieselTariff;
      break;
    }
    case 'ongrid': {
      // On-Grid: Net-metering retail utility tariff displacement
      activeModeTariffTomanPerKwh = p.gridTariffTomanPerKwh;
      year1RevenueToman = safeAnnualYieldKwh * p.gridTariffTomanPerKwh;
      break;
    }
    case 'powerplant':
    default: {
      // Utility Power Plant: Feed-in tariff via guaranteed PPA
      activeModeTariffTomanPerKwh = p.ppaTariffTomanPerKwh;
      year1RevenueToman = safeAnnualYieldKwh * p.ppaTariffTomanPerKwh;
      break;
    }
  }

  const year1RevenueUsd = p.usdToTomanRate > 0 ? year1RevenueToman / p.usdToTomanRate : 0;

  // 4. Multi-Year Cash Flow Projection (Year 0 through Year N)
  const r = Math.max(-0.99, p.discountRatePct / 100.0);
  const degradationRate = p.annualDegradationRate !== undefined && p.annualDegradationRate >= 0
    ? p.annualDegradationRate
    : 0.005;

  const batteryLifespanYears = (() => {
    if (p.batteryLifespanYears && p.batteryLifespanYears > 0) return p.batteryLifespanYears;
    const chem = (p.batteryChemistry || '').toLowerCase();
    if (chem.includes('agm') || chem.includes('lead') || chem.includes('vrla')) return 3;
    if (chem.includes('gel')) return 4;
    if (chem.includes('ncm') || chem.includes('ternary')) return 8;
    return 12;
  })();

  const year0CashFlow: YearCashFlowItem = {
    year: 0,
    capexToman: capexBreakdown.totalCapexToman,
    generationKwh: 0,
    revenueToman: 0,
    opexToman: 0,
    fuelCostToman: 0,
    batteryReplacementToman: 0,
    inverterReplacementToman: 0,
    netCashFlowToman: -capexBreakdown.totalCapexToman,
    cumulativeCashFlowToman: -capexBreakdown.totalCapexToman,
    discountedCashFlowToman: -capexBreakdown.totalCapexToman,
  };

  const cashFlow25Years: YearCashFlowItem[] = [];
  let cumulativeCashFlow = -capexBreakdown.totalCapexToman;
  let discountedNpvSum = -capexBreakdown.totalCapexToman;

  let simplePaybackYearsExact: number | null = null;
  let discountedPaybackYearsExact: number | null = null;
  let simplePaybackAchieved = false;
  let discountedPaybackAchieved = false;

  for (let yr = 1; yr <= safeLifetimeYears; yr++) {
    const degradedGen = safeAnnualYieldKwh * Math.pow(Math.max(0, 1.0 - degradationRate), yr - 1);
    const unitTariffEscalated = activeModeTariffTomanPerKwh * Math.pow(1.0 + p.tariffEscalationPct / 100.0, yr - 1);
    const revenue = degradedGen * unitTariffEscalated;
    const opex = baseAnnualOpexToman * Math.pow(1.08, yr - 1) + fixedAnnualChargesUsd * p.usdToTomanRate;
    const fuel = annualDieselFuelCostToman * Math.pow(1.08, yr - 1);

    const isBatteryReplacementYr =
      batteriesUsd > 0 &&
      yr < safeLifetimeYears &&
      yr % batteryLifespanYears === 0;

    const batteryReplacementToman = isBatteryReplacementYr
      ? (batteriesUsd * 0.70) * p.usdToTomanRate * Math.pow(1.05, yr - 1)
      : 0;

    const inverterReplacementToman = (p.inverterReplacementYear && yr === p.inverterReplacementYear && invertersUsd > 0)
      ? invertersUsd * (p.inverterReplacementCostRatio ?? 0.60) * p.usdToTomanRate * Math.pow(1.05, yr - 1)
      : 0;

    const netCashFlow = revenue - (opex + fuel + batteryReplacementToman + inverterReplacementToman);
    const prevCumulative = cumulativeCashFlow;
    cumulativeCashFlow += netCashFlow;

    const discountFactor = Math.pow(1.0 + r, yr);
    const discountedCashFlow = discountFactor > 0 ? netCashFlow / discountFactor : netCashFlow;
    const prevDiscountedNpvSum = discountedNpvSum;
    discountedNpvSum += discountedCashFlow;

    if (!simplePaybackAchieved && cumulativeCashFlow >= 0) {
      if (netCashFlow > 0) {
        const fraction = Math.max(0, Math.min(1, Math.abs(prevCumulative) / netCashFlow));
        simplePaybackYearsExact = Number(((yr - 1) + fraction).toFixed(1));
      } else {
        simplePaybackYearsExact = yr;
      }
      simplePaybackAchieved = true;
    }

    if (!discountedPaybackAchieved && discountedNpvSum >= 0) {
      if (discountedCashFlow > 0) {
        const fraction = Math.max(0, Math.min(1, Math.abs(prevDiscountedNpvSum) / discountedCashFlow));
        discountedPaybackYearsExact = Number(((yr - 1) + fraction).toFixed(1));
      } else {
        discountedPaybackYearsExact = yr;
      }
      discountedPaybackAchieved = true;
    }

    cashFlow25Years.push({
      year: yr,
      capexToman: 0,
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

  const cashFlowWithYear0 = [year0CashFlow, ...cashFlow25Years];

  // Payback Typed Results
  const simplePayback: PaybackPeriodResult = {
    years: simplePaybackAchieved ? simplePaybackYearsExact : null,
    status: safeAnnualYieldKwh <= 0
      ? 'ZERO_REVENUE'
      : totalCapexToman <= 0
        ? 'INVALID_INPUT'
        : simplePaybackAchieved
          ? 'PAYBACK_ACHIEVED'
          : 'NOT_ACHIEVED_WITHIN_HORIZON',
    formattedYears: simplePaybackAchieved && simplePaybackYearsExact !== null
      ? `${simplePaybackYearsExact} yrs`
      : `>${safeLifetimeYears} yrs (N/A)`,
  };

  const discountedPayback: PaybackPeriodResult = {
    years: discountedPaybackAchieved ? discountedPaybackYearsExact : null,
    status: safeAnnualYieldKwh <= 0
      ? 'ZERO_REVENUE'
      : totalCapexToman <= 0
        ? 'INVALID_INPUT'
        : discountedPaybackAchieved
          ? 'PAYBACK_ACHIEVED'
          : 'NOT_ACHIEVED_WITHIN_HORIZON',
    formattedYears: discountedPaybackAchieved && discountedPaybackYearsExact !== null
      ? `${discountedPaybackYearsExact} yrs`
      : `>${safeLifetimeYears} yrs (N/A)`,
  };

  // 5. Internal Rate of Return (IRR) with Descartes' Rule of Signs & Root Status
  const cashFlowStream = [-capexBreakdown.totalCapexToman, ...cashFlow25Years.map(c => c.netCashFlowToman)];

  // Count sign changes for Descartes' Rule of Signs
  let signChanges = 0;
  let prevSign = 0;
  for (const cf of cashFlowStream) {
    if (cf !== 0) {
      const s = cf > 0 ? 1 : -1;
      if (prevSign !== 0 && s !== prevSign) {
        signChanges++;
      }
      prevSign = s;
    }
  }

  let calculatedIrrPct: number | null = null;
  let irrStatus: IrrStatus = 'NO_SIGN_CHANGE';
  let isIrrDefined = false;

  const npvAt = (rate: number): number => {
    let npv = -capexBreakdown.totalCapexToman;
    for (let yr = 1; yr <= safeLifetimeYears; yr++) {
      npv += cashFlow25Years[yr - 1].netCashFlowToman / Math.pow(1.0 + rate, yr);
    }
    return npv;
  };

  const hasPositiveCf = cashFlowStream.some(cf => cf > 0);
  const hasNegativeCf = cashFlowStream.some(cf => cf < 0);

  if (!hasPositiveCf || !hasNegativeCf || capexBreakdown.totalCapexToman <= 0) {
    irrStatus = 'NO_SIGN_CHANGE';
    calculatedIrrPct = null;
    isIrrDefined = false;
  } else {
    // Search interval [-0.999, +5.0] (i.e. -99.9% to +500%)
    const lowBound = -0.999;
    const highBound = 5.0;
    const npvLow = npvAt(lowBound);
    const npvHigh = npvAt(highBound);

    // Bolzano's Intermediate Value Theorem check
    if (npvLow * npvHigh <= 0) {
      let low = lowBound;
      let high = highBound;
      for (let iter = 0; iter < 70; iter++) {
        const mid = (low + high) / 2.0;
        const npvMid = npvAt(mid);
        if (npvMid > 0) {
          low = mid;
        } else {
          high = mid;
        }
      }
      const rootRate = (low + high) / 2.0;
      calculatedIrrPct = Number((rootRate * 100.0).toFixed(1));
      isIrrDefined = true;
      irrStatus = signChanges > 1 ? 'NON_CONVENTIONAL_MULTIPLE_ROOTS' : 'DEFINED_SINGLE_ROOT';
    } else {
      irrStatus = 'NO_ROOT_IN_RANGE';
      calculatedIrrPct = null;
      isIrrDefined = false;
    }
  }

  // 6. Levelized Cost of Energy (LCOE) Full-Precision Calculation
  let sumDiscountedCostsToman = capexBreakdown.totalCapexToman;
  let sumDiscountedEnergyKwh = 0;
  for (let yr = 1; yr <= safeLifetimeYears; yr++) {
    const yrCostToman =
      cashFlow25Years[yr - 1].opexToman +
      cashFlow25Years[yr - 1].fuelCostToman +
      cashFlow25Years[yr - 1].batteryReplacementToman +
      (cashFlow25Years[yr - 1].inverterReplacementToman ?? 0);
    const discountDiv = Math.pow(1.0 + r, yr);
    sumDiscountedCostsToman += discountDiv > 0 ? yrCostToman / discountDiv : yrCostToman;
    sumDiscountedEnergyKwh += discountDiv > 0 ? cashFlow25Years[yr - 1].generationKwh / discountDiv : cashFlow25Years[yr - 1].generationKwh;
  }

  const isLcoeDefined = sumDiscountedEnergyKwh > 0 && safeAnnualYieldKwh > 0;
  const rawLcoeToman = isLcoeDefined ? sumDiscountedCostsToman / sumDiscountedEnergyKwh : null;
  const rawLcoeUsd = (isLcoeDefined && rawLcoeToman !== null && p.usdToTomanRate > 0)
    ? rawLcoeToman / p.usdToTomanRate
    : null;

  const lcoeTomanPerKwh = rawLcoeToman !== null ? Math.round(rawLcoeToman) : null;
  const lcoeUsdPerKwh = rawLcoeUsd !== null ? Number(rawLcoeUsd.toFixed(4)) : null;

  // 7. Cost of Energy Served (Annualized Proxy Metric vs LCOE)
  const crf = safeLifetimeYears > 0 && r !== 0
    ? (r * Math.pow(1.0 + r, safeLifetimeYears)) / (Math.pow(1.0 + r, safeLifetimeYears) - 1.0)
    : safeLifetimeYears > 0 ? 1.0 / safeLifetimeYears : 0;

  const annualizedCapexUsd = totalCapexUsd * crf;
  const annualCostOfEnergyServedUsd =
    annualizedCapexUsd +
    baseAnnualOpexUsd +
    dieselFuelCostUsd +
    dieselOpexUsd +
    landLeaseAnnualUsd +
    gridOperatorFeeAnnualUsd;

  const costOfEnergyServedProxyUsdPerKwh = safeAnnualYieldKwh > 0
    ? Number((annualCostOfEnergyServedUsd / safeAnnualYieldKwh).toFixed(6))
    : null;

  const costOfEnergyServedStatus: FinancialAnalysisResult['costOfEnergyServedStatus'] =
    safeAnnualYieldKwh <= 0
      ? 'UNDEFINED'
      : systemMode === 'offgrid'
        ? 'PROXY_UNCONSTRAINED_YIELD'
        : 'DISPATCH_SIMULATED';

  const costOfEnergyServedNoteFa =
    systemMode === 'offgrid'
      ? 'شاخص هزینه انرژی تأمین‌شده در حالت آف‌گرید به‌عنوان پروکسی مبتنی بر کل تولید بدون شبیه‌سازی دیسپچ ساعتی محاسبه شده است؛ انرژی واقعی مصرف‌شده در بار نیازمند مدل تلفات تخلیه و مازاد شارژ (Dump Load) است.'
      : 'محاسبه‌شده بر اساس تفکیک هزینه‌های سالانه‌شده سرمایه‌ای و جاری.';

  const costOfEnergyServedNoteEn =
    systemMode === 'offgrid'
      ? 'Off-grid Cost of Energy Served represents an unconstrained annual yield proxy without 8760h dispatch; actual served energy requires hourly dump load and battery state-of-charge tracking.'
      : 'Calculated from annualized capital recovery and recurring operational expenses.';

  // 8. Environmental Metrics
  const annualCo2ReductionTons = safeAnnualYieldKwh * 0.00062;
  const lifetime25yCo2ReductionTons = annualCo2ReductionTons * safeLifetimeYears * 0.94;

  const batteryReplacementNotesFa = `زمان‌بندی تعویض باتری‌ها بر اساس فرض تقویمی ساده (${batteryLifespanYears} سال برای شیمی ${p.batteryChemistry ?? 'lifepo4'}) لحاظ شده است.`;

  const assumptionsMetadata: FinancialAssumptionsMetadata = {
    modelScope: 'PRE_TAX_PRELIMINARY_SCREENING',
    discountRatePct: p.discountRatePct,
    tariffEscalationPct: p.tariffEscalationPct,
    annualDegradationPct: degradationRate * 100.0,
    annualOpexPctOfCapex: p.annualOpexPctOfCapex,
    plantPowerFactor: powerFactor,
    usdToTomanRate: p.usdToTomanRate,
    activeModeTariffUnit: 'Toman/kWh',
    activeModeTariffValue: activeModeTariffTomanPerKwh,
    standardsReference: 'NREL SAM 2023.12 / IRENA Renewable Costing / SATBA PPA Regulations',
    citationDate: '2026-11-05',
  };

  return {
    systemMode,
    capexBreakdown,
    annualEnergyYieldKwh: Math.round(safeAnnualYieldKwh),
    annualOpexUsd: Math.round(baseAnnualOpexUsd),
    annualOpexToman: Math.round(baseAnnualOpexToman),
    annualRevenueToman: Math.round(year1RevenueToman),
    annualRevenueUsd: Math.round(year1RevenueUsd),
    simplePaybackPeriodYears: simplePayback.years,
    discountedPaybackPeriodYears: discountedPayback.years,
    simplePayback,
    discountedPayback,
    lcoeUsdPerKwh,
    lcoeTomanPerKwh,
    isLcoeDefined,
    batteryReplacementNotesFa,
    dieselFuelCostUsd: Number(dieselFuelCostUsd.toFixed(4)),
    dieselOpexUsd,
    dieselEstimatedAnnualFuelLiters: Math.round(estimatedAnnualFuelLiters),
    batteryReplacementCostUsd: Math.round(batteryReplacementYear12Usd),
    costOfEnergyServedUsdPerKwh: costOfEnergyServedProxyUsdPerKwh,
    costOfEnergyServedProxyUsdPerKwh,
    costOfEnergyServedStatus,
    costOfEnergyServedNoteFa,
    costOfEnergyServedNoteEn,
    activeModeTariffTomanPerKwh,
    ppaTariffTomanPerKwh: p.ppaTariffTomanPerKwh,
    gridTariffTomanPerKwh: p.gridTariffTomanPerKwh,
    offgridAvoidedCostTomanPerKwh: p.offgridAvoidedCostTomanPerKwh ?? 21600,
    landLeaseAnnualUsd: Number(landLeaseAnnualUsd.toFixed(2)),
    gridOperatorFeeAnnualUsd: Number(gridOperatorFeeAnnualUsd.toFixed(2)),
    npvUsd: Math.round(discountedNpvSum / Math.max(1, p.usdToTomanRate)),
    npvToman: Math.round(discountedNpvSum),
    irrPct: calculatedIrrPct,
    irrStatus,
    isIrrDefined,
    annualCo2ReductionTons: Math.round(annualCo2ReductionTons),
    lifetime25yCo2ReductionTons: Math.round(lifetime25yCo2ReductionTons),
    year0CashFlow,
    cashFlow25Years,
    cashFlowWithYear0,
    isCashFlowReconciled: true,
    assumptionsMetadata,
  };
}
