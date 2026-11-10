/**
 * Financial Engine Integrity Contract, Residual Salvage LCOE,
 * Multi-Root IRR / MIRR, Fisher Country Profiles & 3-Axis Sensitivity Matrix
 *
 * Implements bankable financial standards:
 * - NREL SAM / IRENA Renewable Power Generation Costs
 * - Coordinated Substation MVA Allocation with MV Bays
 * - Fixed OPEX Escalation Integrity
 * - Linear Residual Salvage Credit for Late-Horizon Equipment Replacements
 * - Descartes Multi-Root Scanner & Modified Internal Rate of Return (MIRR)
 * - Fisher Real vs Nominal Discount Rate Invariance (1 + r_real = (1 + r_nom) / (1 + inflation))
 * - Environmental Outdoor Inverter & Salt-Mist Aging Coupling (IEC 61701 & IEC 62109-1)
 * - 3-Axis 27-Point Economic Sensitivity Matrix
 */

import {
  performFinancialAnalysis,
  DEFAULT_FINANCIAL_PRICING,
  type UserFinancialPricing,
  type FinancialAnalysisResult,
  type FinancialSystemMode,
} from '../financialEngine';

import {
  calculateEnvironmentalAging,
  type EnvironmentalAgingInput,
  type EnvironmentalAgingResult,
} from '../environmentalAgingEngine';

// ============================================================================
// 1. Country Macroeconomic Financial Profiles & Fisher Equation
// ============================================================================

export type CountryFinancialProfileId =
  | 'IR_SATBA_NOMINAL_TOMAN'
  | 'IR_FISHER_REAL_CONSTANT'
  | 'INTL_USD_BENCHMARK';

export interface CountryFinancialProfile {
  id: CountryFinancialProfileId;
  nameEn: string;
  nameFa: string;
  currency: 'TOMAN' | 'USD';
  inflationRatePct: number;
  discountRatePct: number;
  tariffEscalationPct: number;
  opexEscalationPct: number;
  ppaTariffTomanPerKwh: number;
  gridTariffTomanPerKwh: number;
  usdToTomanRate: number;
  descriptionEn: string;
  descriptionFa: string;
}

/**
 * Converts nominal discount rate and inflation rate to real discount rate
 * using the exact Fisher equation:
 * (1 + r_real) = (1 + r_nom) / (1 + inflation) => r_real = ((1 + r_nom) / (1 + inflation) - 1) * 100
 */
export function computeFisherRealDiscountRatePct(
  nominalDiscountRatePct: number,
  inflationRatePct: number
): number {
  const nom = 1.0 + nominalDiscountRatePct / 100.0;
  const inf = 1.0 + inflationRatePct / 100.0;
  return Number((((nom / inf) - 1.0) * 100.0).toFixed(4));
}

export const COUNTRY_FINANCIAL_PROFILES: Record<CountryFinancialProfileId, CountryFinancialProfile> = {
  IR_SATBA_NOMINAL_TOMAN: {
    id: 'IR_SATBA_NOMINAL_TOMAN',
    nameEn: 'Iran SATBA PPA (Nominal Toman)',
    nameFa: 'ایران - قرارداد خرید تضمینی ساتبا (تومان اسمی با تورم)',
    currency: 'TOMAN',
    inflationRatePct: 15.0,
    discountRatePct: 18.0,
    tariffEscalationPct: 15.0,
    opexEscalationPct: 8.0,
    ppaTariffTomanPerKwh: 2800,
    gridTariffTomanPerKwh: 3800,
    usdToTomanRate: 90000,
    descriptionEn: 'Official SATBA commercial baseline under nominal inflationary accounting (18% nominal discount, 15% tariff escalation, 8% OPEX indexation).',
    descriptionFa: 'خط مبنای تجاری قرارداد ساتبا با حسابداری تورم اسمی (۱۸٪ نرخ تنزیل اسمی، ۱۵٪ شاخص‌بندی تعرفه، ۸٪ رشد OPEX).',
  },
  IR_FISHER_REAL_CONSTANT: {
    id: 'IR_FISHER_REAL_CONSTANT',
    nameEn: 'Iran Purchasing Power Parity (Fisher Real Constant Toman)',
    nameFa: 'ایران - قدرت خرید ثابت (نرخ تنزیل حقیقی فیشر بدون تورم)',
    currency: 'TOMAN',
    inflationRatePct: 15.0,
    discountRatePct: computeFisherRealDiscountRatePct(18.0, 15.0), // 2.6087%
    tariffEscalationPct: 0.0,
    opexEscalationPct: 0.0,
    ppaTariffTomanPerKwh: 2800,
    gridTariffTomanPerKwh: 3800,
    usdToTomanRate: 90000,
    descriptionEn: 'Inflation-neutral real purchasing power evaluation using exact Fisher equation (real discount 2.6087%, 0% tariff & OPEX escalation).',
    descriptionFa: 'ارزیابی ارزش فعلی در قدرت خرید ثابت سال اول با حذف اثر تورم اسمی طبق رابطه فیشر (تنزیل حقیقی ۲.۶۰۸۷٪، رشد تعرفه و OPEX صفر).',
  },
  INTL_USD_BENCHMARK: {
    id: 'INTL_USD_BENCHMARK',
    nameEn: 'International USD Utility Benchmark (IRENA / NREL SAM)',
    nameFa: 'بنچ‌مارک بین‌المللی دلاری مگاواتی (IRENA / NREL SAM)',
    currency: 'USD',
    inflationRatePct: 2.5,
    discountRatePct: 7.5,
    tariffEscalationPct: 2.0,
    opexEscalationPct: 2.5,
    ppaTariffTomanPerKwh: 4950, // $0.055/kWh * 90,000
    gridTariffTomanPerKwh: 10800, // $0.120/kWh * 90,000
    usdToTomanRate: 90000,
    descriptionEn: 'International benchmark for utility-scale solar projects ($0.055/kWh PPA, 7.5% discount rate, 2.0% escalation).',
    descriptionFa: 'شاخص استاندارد بین‌المللی نیروگاه‌های خورشیدی بزرگ‌مقیاس (تعرفه ۵.۵ سنت دلار بر کیلووات‌ساعت، تنزیل ۷.۵٪، رشد ۲.۰٪).',
  },
};

// ============================================================================
// 2. Descartes Multi-Root IRR & Modified Internal Rate of Return (MIRR)
// ============================================================================

export interface CashFlowIrrAndMirrResult {
  irrPct: number | null;
  irrRootsPct: number[];
  mirrPct: number | null;
  irrStatus: 'NO_SIGN_CHANGE' | 'DEFINED_SINGLE_ROOT' | 'NON_CONVENTIONAL_MULTIPLE_ROOTS' | 'NO_ROOT_IN_RANGE';
  isIrrDefined: boolean;
  signChanges: number;
}

/**
 * Robust cash flow solver detecting multiple real IRR roots across non-conventional
 * cash flows and computing the unique Modified Internal Rate of Return (MIRR).
 */
export function solveCashFlowIrrAndMirr(
  cashFlowStream: number[],
  discountRatePct: number = 18.0
): CashFlowIrrAndMirrResult {
  if (!cashFlowStream || cashFlowStream.length < 2) {
    return {
      irrPct: null,
      irrRootsPct: [],
      mirrPct: null,
      irrStatus: 'NO_SIGN_CHANGE',
      isIrrDefined: false,
      signChanges: 0,
    };
  }

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

  const hasPositiveCf = cashFlowStream.some((cf) => cf > 0);
  const hasNegativeCf = cashFlowStream.some((cf) => cf < 0);

  if (!hasPositiveCf || !hasNegativeCf) {
    return {
      irrPct: null,
      irrRootsPct: [],
      mirrPct: null,
      irrStatus: 'NO_SIGN_CHANGE',
      isIrrDefined: false,
      signChanges,
    };
  }

  const npvAt = (rate: number): number => {
    let npv = 0;
    for (let t = 0; t < cashFlowStream.length; t++) {
      npv += cashFlowStream[t] / Math.pow(1.0 + rate, t);
    }
    return npv;
  };

  const scannedRoots: number[] = [];
  const numIntervals = 600;
  const scanA = -0.90;
  const scanB = 5.0;
  const step = (scanB - scanA) / numIntervals;

  for (let i = 0; i < numIntervals; i++) {
    const subA = scanA + i * step;
    const subB = subA + step;
    const npvA = npvAt(subA);
    const npvB = npvAt(subB);

    if (npvA * npvB <= 0) {
      let low = subA;
      let high = subB;
      for (let iter = 0; iter < 60; iter++) {
        const mid = (low + high) / 2.0;
        const npvMid = npvAt(mid);
        if (npvA <= 0) {
          if (npvMid <= 0) low = mid;
          else high = mid;
        } else {
          if (npvMid > 0) low = mid;
          else high = mid;
        }
      }
      const root = Number((((low + high) / 2.0) * 100.0).toFixed(1));
      if (!scannedRoots.some((rVal) => Math.abs(rVal - root) < 0.05)) {
        scannedRoots.push(root);
      }
    }
  }

  let calculatedIrrPct: number | null = null;
  let irrStatus: CashFlowIrrAndMirrResult['irrStatus'] = 'NO_ROOT_IN_RANGE';
  let isIrrDefined = false;

  if (scannedRoots.length > 0) {
    scannedRoots.sort((a, b) => a - b);
    const positiveRoots = scannedRoots.filter((rVal) => rVal > 0);
    if (positiveRoots.length > 0) {
      calculatedIrrPct = positiveRoots[0];
    } else {
      calculatedIrrPct = scannedRoots[scannedRoots.length - 1];
    }
    isIrrDefined = true;
    irrStatus = (signChanges > 1 || scannedRoots.length > 1)
      ? 'NON_CONVENTIONAL_MULTIPLE_ROOTS'
      : 'DEFINED_SINGLE_ROOT';
  } else {
    // Check wider boundary condition [-0.999, 5.0]
    const npvLow = npvAt(-0.999);
    const npvHigh = npvAt(5.0);
    if (npvLow * npvHigh <= 0) {
      let low = -0.999;
      let high = 5.0;
      for (let iter = 0; iter < 70; iter++) {
        const mid = (low + high) / 2.0;
        const npvMid = npvAt(mid);
        if (npvMid > 0) low = mid;
        else high = mid;
      }
      calculatedIrrPct = Number((((low + high) / 2.0) * 100.0).toFixed(1));
      isIrrDefined = true;
      irrStatus = signChanges > 1 ? 'NON_CONVENTIONAL_MULTIPLE_ROOTS' : 'DEFINED_SINGLE_ROOT';
      scannedRoots.push(calculatedIrrPct);
    }
  }

  // MIRR with finance & reinvestment rate
  const horizonYears = cashFlowStream.length - 1;
  const rDecimal = Math.max(-0.99, discountRatePct / 100.0);
  let pvNegative = 0;
  let fvPositive = 0;

  for (let t = 0; t <= horizonYears; t++) {
    const cf = cashFlowStream[t];
    if (cf < 0) {
      pvNegative += Math.abs(cf) / Math.pow(1.0 + rDecimal, t);
    } else if (cf > 0) {
      fvPositive += cf * Math.pow(1.0 + rDecimal, horizonYears - t);
    }
  }

  const mirrPct = (pvNegative > 0 && fvPositive > 0 && horizonYears > 0)
    ? Number(((Math.pow(fvPositive / pvNegative, 1.0 / horizonYears) - 1.0) * 100.0).toFixed(1))
    : null;

  return {
    irrPct: calculatedIrrPct,
    irrRootsPct: scannedRoots,
    mirrPct,
    irrStatus,
    isIrrDefined,
    signChanges,
  };
}

// ============================================================================
// 3. Full-Chain Integrated Financial System Analysis
// ============================================================================

export interface ResolvedFinancialSystemInput {
  totalPvCapacityKwp: number;
  inverterCapacityKw: number;
  batteryCapacityKwh: number;
  baseAnnualYieldKwh: number;
  substationTransformerMva?: number;
  agingInput?: EnvironmentalAgingInput;
  agingResult?: EnvironmentalAgingResult;
  pricing?: Partial<UserFinancialPricing>;
  profileId?: CountryFinancialProfileId;
  systemMode?: FinancialSystemMode;
  lifetimeYears?: number;
}

export interface ResolvedFinancialSystemResult {
  effectiveAnnualYieldKwh: number;
  inverterAnnualEnergyDeratePct: number;
  annualDegradationPct: number;
  substationTransformerMva: number;
  aging: EnvironmentalAgingResult;
  financialResult: FinancialAnalysisResult;
}

/**
 * Connects physical annual yield, coordinated electrical sizing, and outdoor environmental aging
 * into the comprehensive financial pro-forma analysis.
 */
export function resolveFinancialSystemAnalysis(
  input: ResolvedFinancialSystemInput
): ResolvedFinancialSystemResult {
  const aging = input.agingResult ?? calculateEnvironmentalAging(
    input.agingInput ?? {
      installationEnvironment: 'ground_mount',
      ambientTempMaxC: 39.0,
      elevationM: 1200,
      siteTiltDeg: 31.0,
    }
  );

  const inverterAnnualEnergyDeratePct =
    aging.inverterImpact.inverterAnnualEnergyDeratePct ??
    Number((aging.inverterImpact.totalInverterDeratePct * 0.35).toFixed(2));

  const effectiveAnnualYieldKwh = Math.round(
    input.baseAnnualYieldKwh * (1.0 - inverterAnnualEnergyDeratePct / 100.0)
  );

  const annualDegradationRate = Number((aging.pvImpact.annualDegradationPct / 100.0).toFixed(4));

  const defaultSubstationMva = input.substationTransformerMva ?? (
    input.inverterCapacityKw > 0
      ? Number(((input.inverterCapacityKw / 0.95) / 1000.0).toFixed(2))
      : 1.52
  );

  let profilePricing: Partial<UserFinancialPricing> = {};
  if (input.profileId && COUNTRY_FINANCIAL_PROFILES[input.profileId]) {
    const prof = COUNTRY_FINANCIAL_PROFILES[input.profileId];
    profilePricing = {
      discountRatePct: prof.discountRatePct,
      tariffEscalationPct: prof.tariffEscalationPct,
      opexEscalationPct: prof.opexEscalationPct,
      ppaTariffTomanPerKwh: prof.ppaTariffTomanPerKwh,
      gridTariffTomanPerKwh: prof.gridTariffTomanPerKwh,
      usdToTomanRate: prof.usdToTomanRate,
    };
  }

  const mergedPricing: Partial<UserFinancialPricing> = {
    ...DEFAULT_FINANCIAL_PRICING,
    ...profilePricing,
    ...input.pricing,
    annualDegradationRate,
    substationTransformerMva: input.substationTransformerMva ?? defaultSubstationMva,
    escalateFixedChargesWithOpex: true,
    includeResidualSalvageValue: true,
    inverterReplacementYear:
      input.pricing?.inverterReplacementYear !== undefined
        ? input.pricing.inverterReplacementYear
        : (aging.environment === 'ground_mount' ? 12 : null),
    inverterReplacementCostRatio: input.pricing?.inverterReplacementCostRatio ?? 0.60,
    inverterLifespanYears: input.pricing?.inverterLifespanYears ?? 15,
  };

  const financialResult = performFinancialAnalysis(
    input.totalPvCapacityKwp,
    input.batteryCapacityKwh,
    input.inverterCapacityKw,
    effectiveAnnualYieldKwh,
    mergedPricing,
    input.lifetimeYears ?? 25,
    input.systemMode ?? 'powerplant'
  );

  return {
    effectiveAnnualYieldKwh,
    inverterAnnualEnergyDeratePct,
    annualDegradationPct: aging.pvImpact.annualDegradationPct,
    substationTransformerMva: mergedPricing.substationTransformerMva ?? defaultSubstationMva,
    aging,
    financialResult,
  };
}

// ============================================================================
// 4. Mandatory 3-Axis 27-Point Economic Sensitivity Matrix
// ============================================================================

export interface MandatorySensitivityAxes {
  tariffEscalationPctValues?: number[]; // [0, 5, 15]
  discountRatePctValues?: number[];     // [12, 18, 24]
  capexMultipliers?: number[];          // [0.85, 1.00, 1.15]
}

export interface SensitivityPointResult {
  tariffEscalationPct: number;
  discountRatePct: number;
  capexMultiplier: number;
  npvUsd: number;
  lcoeTomanPerKwh: number;
  lcoeUsdPerKwh: number;
  irrPct: number | null;
  totalCapexUsd: number;
}

export interface MandatorySensitivityMatrixResult {
  points: SensitivityPointResult[];
  totalPointsCount: number;
  monotonicPassingPointsCount: number;
  isMonotonicValid: boolean;
  baseNpvUsd: number;
  baseLcoeTomanPerKwh: number;
}

/**
 * Computes the required 3-axis 3x3x3 (27 scenarios) sensitivity grid:
 * Tariff Escalation [0%, 5%, 15%] x Discount Rate [12%, 18%, 24%] x CAPEX Multiplier [0.85, 1.00, 1.15]
 * and validates strict economic monotonicity laws.
 */
export function computeMandatorySensitivityMatrix(
  baseInput: ResolvedFinancialSystemInput,
  axes?: MandatorySensitivityAxes
): MandatorySensitivityMatrixResult {
  const escValues = axes?.tariffEscalationPctValues ?? [0, 5, 15];
  const discValues = axes?.discountRatePctValues ?? [12, 18, 24];
  const capexMultipliers = axes?.capexMultipliers ?? [0.85, 1.00, 1.15];

  const points: SensitivityPointResult[] = [];
  const basePricing = { ...DEFAULT_FINANCIAL_PRICING, ...baseInput.pricing };

  for (const esc of escValues) {
    for (const disc of discValues) {
      for (const mult of capexMultipliers) {
        const scaledPricing: Partial<UserFinancialPricing> = {
          ...basePricing,
          tariffEscalationPct: esc,
          discountRatePct: disc,
          moduleUsdPerWp: basePricing.moduleUsdPerWp * mult,
          inverterUsdPerKw: basePricing.inverterUsdPerKw * mult,
          batteryUsdPerKwh: basePricing.batteryUsdPerKwh * mult,
          structureUsdPerWp: basePricing.structureUsdPerWp * mult,
          cablingBopUsdPerWp: basePricing.cablingBopUsdPerWp * mult,
          substationUsdPerMva: basePricing.substationUsdPerMva * mult,
          epcLaborUsdPerKw: basePricing.epcLaborUsdPerKw * mult,
          hvConnectionUsdPerKva: basePricing.hvConnectionUsdPerKva * mult,
          substationTransformerMva: baseInput.substationTransformerMva ?? 1.52,
          escalateFixedChargesWithOpex: true,
          includeResidualSalvageValue: true,
        };

        const res = resolveFinancialSystemAnalysis({
          ...baseInput,
          pricing: scaledPricing,
        });

        points.push({
          tariffEscalationPct: esc,
          discountRatePct: disc,
          capexMultiplier: mult,
          npvUsd: res.financialResult.npvUsd,
          lcoeTomanPerKwh: res.financialResult.lcoeTomanPerKwh ?? 0,
          lcoeUsdPerKwh: res.financialResult.lcoeUsdPerKwh ?? 0,
          irrPct: res.financialResult.irrPct,
          totalCapexUsd: res.financialResult.capexBreakdown.totalCapexUsd,
        });
      }
    }
  }

  // Find a specific point by its coordinates
  const findPoint = (esc: number, disc: number, mult: number) =>
    points.find(
      (p) =>
        p.tariffEscalationPct === esc &&
        p.discountRatePct === disc &&
        Math.abs(p.capexMultiplier - mult) < 1e-4
    );

  // Validate strict economic monotonicity:
  // 1. d(NPV)/d(esc) > 0
  // 2. d(NPV)/d(r) < 0 and d(LCOE)/d(r) > 0
  // 3. d(NPV)/d(CAPEX) < 0 and d(LCOE)/d(CAPEX) > 0
  let monotonicPassingCount = 0;

  for (const pt of points) {
    let isValid = true;

    // Check tariff escalation monotonicity (at same disc & mult)
    for (const otherEsc of escValues) {
      if (otherEsc > pt.tariffEscalationPct) {
        const higherPt = findPoint(otherEsc, pt.discountRatePct, pt.capexMultiplier);
        if (higherPt && higherPt.npvUsd <= pt.npvUsd) {
          isValid = false;
        }
      }
    }

    // Check discount rate monotonicity (at same esc & mult)
    for (const otherDisc of discValues) {
      if (otherDisc > pt.discountRatePct) {
        const higherDiscPt = findPoint(pt.tariffEscalationPct, otherDisc, pt.capexMultiplier);
        if (higherDiscPt) {
          if (higherDiscPt.npvUsd >= pt.npvUsd) isValid = false;
          if (higherDiscPt.lcoeTomanPerKwh <= pt.lcoeTomanPerKwh) isValid = false;
        }
      }
    }

    // Check CAPEX multiplier monotonicity (at same esc & disc)
    for (const otherMult of capexMultipliers) {
      if (otherMult > pt.capexMultiplier) {
        const higherMultPt = findPoint(pt.tariffEscalationPct, pt.discountRatePct, otherMult);
        if (higherMultPt) {
          if (higherMultPt.npvUsd >= pt.npvUsd) isValid = false;
          if (higherMultPt.lcoeTomanPerKwh <= pt.lcoeTomanPerKwh) isValid = false;
        }
      }
    }

    if (isValid) {
      monotonicPassingCount++;
    }
  }

  const basePt = findPoint(15, 18, 1.00) ?? points[0];

  return {
    points,
    totalPointsCount: points.length,
    monotonicPassingPointsCount: monotonicPassingCount,
    isMonotonicValid: monotonicPassingCount === points.length && points.length === 27,
    baseNpvUsd: basePt.npvUsd,
    baseLcoeTomanPerKwh: basePt.lcoeTomanPerKwh,
  };
}
