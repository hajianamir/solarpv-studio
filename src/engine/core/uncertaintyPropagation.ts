/**
 * Uncertainty Propagation (UQ) Architecture
 * RFC 3.0.0 Section 6
 *
 * Propagates stochastic uncertainties through Latin Hypercube Sampling (LHS)
 * coupled with a Multivariate Copula to evaluate financial and yield distributions
 * (P10, P50, P90 for Generation, LCOE, NPV).
 *
 * Mathematical Distinction:
 * - Spearman's rho (\rho) is a non-parametric rank correlation measure used solely
 *   for parameter calibration of the latent correlation matrix \Sigma.
 * - Copula (C(u_1, ..., u_d)) is the joint multivariate distribution function.
 *   Transformation: \Sigma_{jk} = 2 \cdot \sin(\frac{\pi}{6} \cdot \rho_{jk}^{Spearman})
 *   Sampling is performed via Cholesky factor L: Z = L \cdot \xi, U_j = \Phi(Z_j),
 *   followed by marginal inverse CDF transformation X_j = F_j^{-1}(U_j).
 */

export interface StochasticInputVariable {
  variableId: 'ghi_annual' | 'albedo' | 'soiling_loss' | 'fpv_water_temp_delta' | 'extreme_wind_gust' | 'capex_variance';
  name: string;
  nominalValue: number;
  distributionType: 'normal' | 'lognormal' | 'gumbel' | 'weibull' | 'uniform';
  standardDeviation?: number;
  uncertaintyPercent?: number; // e.g. ±5%
  gumbelScaleBeta?: number;
  minBound?: number;
  maxBound?: number;
}

export type CopulaFamily = 'gaussian_copula' | 'students_t_copula' | 'clayton_copula' | 'gumbel_copula';

export type RankCorrelationMetric = 'spearman_rho' | 'kendall_tau';

export interface BivariateCorrelationParameter {
  var1: StochasticInputVariable['variableId'];
  var2: StochasticInputVariable['variableId'];
  /** Rank correlation coefficient used to fit the copula parameter in [-1.0, 1.0] */
  correlationValue: number;
  metricType: RankCorrelationMetric;
}

export interface MultivariateCopulaConfig {
  family: CopulaFamily;
  /** Degrees of freedom \nu for Student's t-copula (typically 4 - 8 for fat-tail climate events) */
  degreesOfFreedom?: number;
  /** Pairwise rank correlation parameters */
  pairwiseCorrelations: BivariateCorrelationParameter[];
}

export interface UncertaintyPropagationConfig {
  sampleSizeLhs: number; // Typically 100 for LHS stratified sampling
  seed: number;
  confidenceLevels: {
    p10: number; // 0.10
    p50: number; // 0.50
    p90: number; // 0.90
  };
  stochasticVariables: StochasticInputVariable[];
  copula: MultivariateCopulaConfig;
}

export interface MetricDistributionOutput {
  nominal: number;
  mean: number;
  stdDev: number;
  p10: number; // Exceeded 90% of the time (conservative for energy/revenue)
  p50: number; // Median
  p90: number; // Exceeded 10% of the time (optimistic for energy, risk for LCOE)
  relativeSpreadPercent: number; // (P90 - P10) / P50 * 100
  unit: string;
}

export interface FinancialUqResult {
  traceId: string;
  sampleCount: number;
  copulaFamilyUsed: CopulaFamily;
  annualGenerationMwh: MetricDistributionOutput;
  lcoeUsdPerMwh: MetricDistributionOutput;
  npvUsd: MetricDistributionOutput;
  bankableRiskCategory: 'LOW_RISK' | 'INVESTMENT_GRADE' | 'ELEVATED_VOLATILITY' | 'HIGH_UNCERTAINTY';
  tornadoSensitivityRanking: Array<{
    variableId: string;
    name: string;
    varianceContributionPercent: number;
    sensitivityType?: 'aleatory' | 'epistemic';
  }>;
  convergenceStandardErrorNpvUsd?: number;
  trialStatusBreakdown?: {
    totalTrials: number;
    irrDefinedTrials: number;
    irrUndefinedTrials: number;
    paybackAchievedTrials: number;
    paybackUnachievedTrials: number;
  };
  uncertaintyDecomposition?: {
    aleatoryVariancePct: number;
    epistemicVariancePct: number;
    aleatoryVariables?: string[];
    epistemicVariables?: string[];
    methodologyNote?: string;
  };
  screeningAndBankabilityNoticeFa?: string;
  screeningAndBankabilityNoticeEn?: string;
}

export const DEFAULT_UQ_STOCHASTIC_VARIABLES: StochasticInputVariable[] = [
  {
    variableId: 'ghi_annual',
    name: 'Annual Global Horizontal Irradiance (GHI)',
    nominalValue: 1950,
    distributionType: 'normal',
    uncertaintyPercent: 4.5, // Typical satellite-derived P50/P90 interannual variability
  },
  {
    variableId: 'albedo',
    name: 'Ground Surface Albedo',
    nominalValue: 0.22,
    distributionType: 'normal',
    uncertaintyPercent: 15.9, // stdDev = 0.035 / 0.22 ≈ 15.9%, clamped [0.12, 0.40]
    minBound: 0.12,
    maxBound: 0.40,
  },
  {
    variableId: 'soiling_loss',
    name: 'Annual Soiling Degradation',
    nominalValue: 4.0,
    distributionType: 'lognormal',
    uncertaintyPercent: 20.0,
  },
  {
    variableId: 'capex_variance',
    name: 'EPC Construction & Equipment CAPEX',
    nominalValue: 1.0, // Multiplier
    distributionType: 'normal',
    uncertaintyPercent: 7.0, // Typical ±7% EPC price contingency
  },
];

export const DEFAULT_COPULA_CONFIG: MultivariateCopulaConfig = {
  family: 'gaussian_copula',
  pairwiseCorrelations: [
    { var1: 'ghi_annual', var2: 'soiling_loss', correlationValue: -0.25, metricType: 'spearman_rho' }, // Clear skies correlate with drier dust periods
  ],
};

// ============================================================================
// Mathematical Calibration & Sampling Engine
// ============================================================================

/**
 * Calibrates linear latent Gaussian/t correlation coefficient from non-parametric Spearman's rank rho:
 * \Sigma_{jk} = 2 \cdot \sin(\frac{\pi}{6} \cdot \rho_{jk}^{Spearman})
 */
export function calibrateLatentLinearCorrelation(rhoSpearman: number): number {
  if (rhoSpearman < -1 || rhoSpearman > 1) {
    throw new Error(`Invalid Spearman rho: ${rhoSpearman}. Must be in [-1, 1].`);
  }
  return 2.0 * Math.sin((Math.PI / 6.0) * rhoSpearman);
}

/** Box-Muller transform for standard normal deviates */
function standardNormalBoxMuller(prngNext: () => number): [number, number] {
  let u1 = prngNext();
  let u2 = prngNext();
  while (u1 <= 1e-15) u1 = prngNext();
  const radius = Math.sqrt(-2.0 * Math.log(u1));
  const theta = 2.0 * Math.PI * u2;
  return [radius * Math.cos(theta), radius * Math.sin(theta)];
}

/** Generates a Chi-square deviate with \nu degrees of freedom as sum of \nu squared standard normals */
export function sampleChiSquareDeviate(nu: number, prngNext: () => number): number {
  let sumSq = 0.0;
  let remaining = nu;
  while (remaining > 0) {
    const [z1, z2] = standardNormalBoxMuller(prngNext);
    sumSq += z1 * z1;
    remaining -= 1;
    if (remaining > 0) {
      sumSq += z2 * z2;
      remaining -= 1;
    }
  }
  return sumSq;
}

export interface CopulaBivariateSample {
  u1: number; // Uniform marginal [0, 1]
  u2: number; // Uniform marginal [0, 1]
  latent1: number; // Latent Gaussian or Student-t value
  latent2: number;
}

/**
 * Samples a bivariate copula with explicit family validation and runtime guards.
 * - Gaussian Copula: Z = L * \xi, U_j = \Phi(Z_j)
 * - Student's t Copula: T = (L * \xi) / \sqrt{W / \nu} where W ~ \chi^2_\nu
 * - Archimedean (Clayton / Gumbel): Guarded with NOT_IMPLEMENTED error in v3.0
 */
export function sampleBivariateCopula(
  family: CopulaFamily,
  rhoSpearman: number,
  nSamples: number,
  degreesOfFreedom: number = 5,
  seed: number = 1337
): CopulaBivariateSample[] {
  // Runtime Guard for Archimedean Copulas
  if (family === 'clayton_copula' || family === 'gumbel_copula') {
    throw new Error(
      `ARCHIMEDEAN_NOT_IMPLEMENTED_IN_V3_0: Copula family '${family}' is marked NOT_IMPLEMENTED for v3.0 core. Use 'gaussian_copula' or 'students_t_copula'.`
    );
  }

  // Latent linear correlation mapping
  const r = calibrateLatentLinearCorrelation(rhoSpearman);
  const clampedR = Math.max(-0.9999, Math.min(0.9999, r));
  // Cholesky decomposition of 2x2 correlation matrix [[1, r], [r, 1]]
  // L = [[1, 0], [r, sqrt(1 - r^2)]]
  const l21 = clampedR;
  const l22 = Math.sqrt(Math.max(1e-12, 1.0 - clampedR * clampedR));

  // Seeded Mulberry32 PRNG
  let s = seed >>> 0;
  const prng = (): number => {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const results: CopulaBivariateSample[] = [];

  for (let i = 0; i < nSamples; i++) {
    const [xi1, xi2] = standardNormalBoxMuller(prng);
    // Correlated Gaussian vector
    const z1 = xi1;
    const z2 = l21 * xi1 + l22 * xi2;

    let latent1 = z1;
    let latent2 = z2;

    if (family === 'students_t_copula') {
      const nu = Math.max(3, degreesOfFreedom);
      const w = sampleChiSquareDeviate(nu, prng);
      const scale = Math.sqrt(w / nu);
      latent1 = z1 / scale;
      latent2 = z2 / scale;
    }

    // Standard normal CDF approximation (Abramowitz & Stegun / Hart formula)
    const phi = (x: number): number => {
      const b1 = 0.319381530;
      const b2 = -0.356563782;
      const b3 = 1.781477937;
      const b4 = -1.821255978;
      const b5 = 1.330274429;
      const p = 0.2316419;
      const c = 0.3989422804014327; // 1 / sqrt(2*pi)
      if (x >= 0.0) {
        const k = 1.0 / (1.0 + p * x);
        const poly = k * (b1 + k * (b2 + k * (b3 + k * (b4 + k * b5))));
        return 1.0 - c * Math.exp(-0.5 * x * x) * poly;
      } else {
        const k = 1.0 / (1.0 - p * x);
        const poly = k * (b1 + k * (b2 + k * (b3 + k * (b4 + k * b5))));
        return c * Math.exp(-0.5 * x * x) * poly;
      }
    };

    results.push({
      u1: Math.min(0.99999, Math.max(0.00001, phi(latent1))),
      u2: Math.min(0.99999, Math.max(0.00001, phi(latent2))),
      latent1,
      latent2,
    });
  }

  return results;
}

import {
  performFinancialAnalysis,
  type UserFinancialPricing,
  type FinancialSystemMode,
} from '../financialEngine';

/**
 * Rational approximation for Inverse Standard Normal Cumulative Distribution Function \Phi^{-1}(p).
 * High-precision Acklam algorithm (absolute error < 1.15e-9).
 */
export function inverseStandardNormalCdf(p: number): number {
  if (p <= 0 || p >= 1) {
    if (p <= 0) return -8.0;
    return 8.0;
  }

  // Coefficients in rational approximations
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];

  const pLow = 0.02425;
  const pHigh = 1.0 - pLow;

  if (p < pLow) {
    const q = Math.sqrt(-2.0 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0);
  } else if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
           (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1.0);
  } else {
    const q = Math.sqrt(-2.0 * Math.log(1.0 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0);
  }
}

export interface FinancialUqRunInput {
  plantCapacityKwp: number;
  batteryCapacityKwh?: number;
  inverterCapacityKw: number;
  baseAnnualYieldKwh: number;
  basePricing: UserFinancialPricing;
  systemMode?: FinancialSystemMode;
  sampleSize?: number;
  seed?: number;
  copulaFamily?: CopulaFamily;
  spearmanRhoGhiSoiling?: number;
  isBifacial?: boolean;
  bifacialityFactor?: number;
  groundCoverRatio?: number;
}

/**
 * Executable Latin Hypercube Sampling (LHS) & Copula-driven Monte Carlo Pipeline
 * Passes each stratified sample through the canonical yield & financial analysis engine.
 */
export function runFinancialUncertaintyPropagation(input: FinancialUqRunInput): FinancialUqResult {
  const {
    plantCapacityKwp,
    batteryCapacityKwh = 0,
    inverterCapacityKw,
    baseAnnualYieldKwh,
    basePricing,
    systemMode = 'powerplant',
    sampleSize = 100,
    seed = 42,
    copulaFamily = 'gaussian_copula',
    spearmanRhoGhiSoiling = -0.25,
  } = input;

  const n = Math.max(20, Math.min(2000, sampleSize));

  // Seeded PRNG (Mulberry32)
  let s = (seed >>> 0) || 1337;
  const prng = (): number => {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Generate bivariate copula samples for correlated (GHI, soiling)
  const copulaSamples = sampleBivariateCopula(copulaFamily, spearmanRhoGhiSoiling, n, 5, seed);

  // Stratified LHS permutations for independent parameters
  const generateLhsPermutation = (): number[] => {
    const u: number[] = [];
    for (let i = 0; i < n; i++) {
      u.push((i + prng()) / n);
    }
    // Fisher-Yates shuffle
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      const tmp = u[i];
      u[i] = u[j];
      u[j] = tmp;
    }
    return u;
  };

  const uCapex = generateLhsPermutation();
  const uOpex = generateLhsPermutation();
  const uTariff = generateLhsPermutation();
  const uDiscount = generateLhsPermutation();
  const uAlbedo = generateLhsPermutation();

  const genMwhSamples: number[] = [];
  const lcoeMwhSamples: number[] = [];
  const npvUsdSamples: number[] = [];

  let irrDefinedCount = 0;
  let irrUndefinedCount = 0;
  let paybackAchievedCount = 0;
  let paybackUnachievedCount = 0;

  // Correlation tracking for Tornado sensitivity
  const ghiDeviations: number[] = [];
  const soilingDeviations: number[] = [];
  const albedoDeviations: number[] = [];
  const capexDeviations: number[] = [];
  const opexDeviations: number[] = [];
  const tariffDeviations: number[] = [];
  const discountDeviations: number[] = [];

  for (let i = 0; i < n; i++) {
    // 1. Correlated Marginals from Copula
    // GHI: Normal (mean=1.0, stdDev=0.045), strictly clamped [0.80, 1.25]
    const zGhi = inverseStandardNormalCdf(copulaSamples[i].u1);
    const ghiFactor = Math.max(0.80, Math.min(1.25, 1.0 + zGhi * 0.045));
    ghiDeviations.push(ghiFactor - 1.0);

    // Soiling: Lognormal (mean=4.0%, stdDev=1.0%), strictly clamped [1.0%, 15.0%]
    const zSoiling = inverseStandardNormalCdf(copulaSamples[i].u2);
    const soilingPct = Math.max(1.0, Math.min(15.0, 4.0 * Math.exp(zSoiling * 0.20)));
    soilingDeviations.push(soilingPct - 4.0);

    // Albedo: Normal (mean=0.22, stdDev=0.035), clamped [0.12, 0.40]
    const zAlbedo = inverseStandardNormalCdf(uAlbedo[i]);
    const sampledAlbedo = Math.max(0.12, Math.min(0.40, 0.22 + zAlbedo * 0.035));
    albedoDeviations.push(sampledAlbedo - 0.22);

    // 2. Stratified Marginals
    // CAPEX Multiplier: Normal (mean=1.0, stdDev=0.07), clamped [0.80, 1.25]
    const zCapex = inverseStandardNormalCdf(uCapex[i]);
    const capexMultiplier = Math.max(0.80, Math.min(1.25, 1.0 + zCapex * 0.07));
    capexDeviations.push(capexMultiplier - 1.0);

    // OPEX Multiplier: Normal (mean=1.0, stdDev=0.10), clamped [0.75, 1.35]
    const zOpex = inverseStandardNormalCdf(uOpex[i]);
    const opexMultiplier = Math.max(0.75, Math.min(1.35, 1.0 + zOpex * 0.10));
    opexDeviations.push(opexMultiplier - 1.0);

    // Tariff Multiplier: Normal (mean=1.0, stdDev=0.06), clamped [0.80, 1.25]
    const zTariff = inverseStandardNormalCdf(uTariff[i]);
    const tariffMultiplier = Math.max(0.80, Math.min(1.25, 1.0 + zTariff * 0.06));
    tariffDeviations.push(tariffMultiplier - 1.0);

    // Discount rate: Uniform +/- 2.0%
    const discountRatePct = Math.max(2.0, basePricing.discountRatePct + (uDiscount[i] - 0.5) * 4.0);
    discountDeviations.push(discountRatePct - basePricing.discountRatePct);

    // 3. Compute sampled annual generation incorporating GHI, soiling derate, and ground albedo:
    const soilingDerateRatio = (1.0 - soilingPct / 100.0) / (1.0 - 0.045);
    const isBifacial = input.isBifacial ?? false;
    const bifaciality = input.bifacialityFactor ?? 0.80;
    const gcr = input.groundCoverRatio ?? 0.38;
    const albedoSensitivityCoeff = isBifacial ? bifaciality * gcr * 0.45 : 0.02;
    const albedoRearGainFactor = 1.0 + (sampledAlbedo - 0.22) * albedoSensitivityCoeff;
    const trialYieldKwh = Math.max(0, baseAnnualYieldKwh * ghiFactor * soilingDerateRatio * albedoRearGainFactor);

    // 4. Sampled Pricing object
    const trialPricing: UserFinancialPricing = {
      ...basePricing,
      moduleUsdPerWp: basePricing.moduleUsdPerWp * capexMultiplier,
      inverterUsdPerKw: basePricing.inverterUsdPerKw * capexMultiplier,
      structureUsdPerWp: basePricing.structureUsdPerWp * capexMultiplier,
      cablingBopUsdPerWp: basePricing.cablingBopUsdPerWp * capexMultiplier,
      substationUsdPerMva: basePricing.substationUsdPerMva * capexMultiplier,
      epcLaborUsdPerKw: basePricing.epcLaborUsdPerKw * capexMultiplier,
      annualOpexPctOfCapex: basePricing.annualOpexPctOfCapex * opexMultiplier,
      gridTariffTomanPerKwh: Math.round(basePricing.gridTariffTomanPerKwh * tariffMultiplier),
      ppaTariffTomanPerKwh: Math.round(basePricing.ppaTariffTomanPerKwh * tariffMultiplier),
      discountRatePct,
    };

    // 5. Execute canonical financial engine
    const trialFin = performFinancialAnalysis(
      plantCapacityKwp,
      batteryCapacityKwh,
      inverterCapacityKw,
      trialYieldKwh,
      trialPricing,
      25,
      systemMode
    );

    genMwhSamples.push(trialYieldKwh / 1000.0);
    lcoeMwhSamples.push((trialFin.lcoeUsdPerKwh ?? 0) * 1000.0);
    npvUsdSamples.push(trialFin.npvUsd);

    if (trialFin.isIrrDefined) irrDefinedCount++;
    else irrUndefinedCount++;

    if (trialFin.simplePayback.status === 'PAYBACK_ACHIEVED') paybackAchievedCount++;
    else paybackUnachievedCount++;
  }

  // Distribution aggregator helper
  const computeStats = (data: number[], unit: string, isCostMetric: boolean = false): MetricDistributionOutput => {
    const sorted = [...data].sort((a, b) => a - b);
    const count = sorted.length;
    const mean = sorted.reduce((sum, v) => sum + v, 0) / count;
    const variance = sorted.reduce((sum, v) => sum + (v - mean) ** 2, 0) / Math.max(1, count - 1);
    const stdDev = Math.sqrt(variance);

    // Percentile indices
    // For energy/revenue: P10 is exceeded 90% of the time (conservative), so 10th percentile; P90 is 90th percentile.
    // For costs (LCOE): P10 cost is conservative (high cost), P90 is optimistic (low cost).
    const idx10 = Math.max(0, Math.min(count - 1, Math.floor(0.10 * count)));
    const idx50 = Math.max(0, Math.min(count - 1, Math.floor(0.50 * count)));
    const idx90 = Math.max(0, Math.min(count - 1, Math.floor(0.90 * count)));

    const val10 = isCostMetric ? sorted[idx90] : sorted[idx10];
    const val50 = sorted[idx50];
    const val90 = isCostMetric ? sorted[idx10] : sorted[idx90];
    const relativeSpread = val50 > 0 ? (Math.abs(val90 - val10) / val50) * 100.0 : 0.0;

    return {
      nominal: Number(val50.toFixed(2)),
      mean: Number(mean.toFixed(2)),
      stdDev: Number(stdDev.toFixed(2)),
      p10: Number(val10.toFixed(2)),
      p50: Number(val50.toFixed(2)),
      p90: Number(val90.toFixed(2)),
      relativeSpreadPercent: Number(relativeSpread.toFixed(1)),
      unit,
    };
  };

  const genStats = computeStats(genMwhSamples, 'MWh/year', false);
  const lcoeStats = computeStats(lcoeMwhSamples, '$/MWh', true);
  const npvStats = computeStats(npvUsdSamples, 'USD', false);

  // First-Order Variance Attribution via Linear Pearson Determination Coefficients (r_i² index)
  const calcPearsonCorrelation = (x: number[], y: number[]): number => {
    const mx = x.reduce((s, v) => s + v, 0) / x.length;
    const my = y.reduce((s, v) => s + v, 0) / y.length;
    let cov = 0;
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < x.length; i++) {
      const dx = x[i] - mx;
      const dy = y[i] - my;
      cov += dx * dy;
      sx += dx * dx;
      sy += dy * dy;
    }
    const denom = Math.sqrt(sx * sy);
    return denom > 0 ? Math.abs(cov / denom) : 0;
  };

  const srcGhi = calcPearsonCorrelation(ghiDeviations, npvUsdSamples);
  const srcSoiling = calcPearsonCorrelation(soilingDeviations, npvUsdSamples);
  const srcAlbedo = calcPearsonCorrelation(albedoDeviations, npvUsdSamples);
  const srcCapex = calcPearsonCorrelation(capexDeviations, npvUsdSamples);
  const srcTariff = calcPearsonCorrelation(tariffDeviations, npvUsdSamples);
  const srcOpex = calcPearsonCorrelation(opexDeviations, npvUsdSamples);
  const srcDiscount = calcPearsonCorrelation(discountDeviations, npvUsdSamples);

  const sumSrc2 =
    srcGhi ** 2 +
    srcSoiling ** 2 +
    srcAlbedo ** 2 +
    srcCapex ** 2 +
    srcTariff ** 2 +
    srcOpex ** 2 +
    srcDiscount ** 2 || 1;

  const tornado = [
    { variableId: 'tariff', name: 'Power Tariff / Avoided Cost', varianceContributionPercent: Number(((srcTariff ** 2 / sumSrc2) * 100.0).toFixed(1)), sensitivityType: 'epistemic' as const },
    { variableId: 'capex_variance', name: 'CAPEX Equipment & EPC Pricing', varianceContributionPercent: Number(((srcCapex ** 2 / sumSrc2) * 100.0).toFixed(1)), sensitivityType: 'epistemic' as const },
    { variableId: 'ghi_annual', name: 'Annual Solar GHI Irradiance', varianceContributionPercent: Number(((srcGhi ** 2 / sumSrc2) * 100.0).toFixed(1)), sensitivityType: 'aleatory' as const },
    { variableId: 'opex_variance', name: 'OPEX & Recurring Maintenance', varianceContributionPercent: Number(((srcOpex ** 2 / sumSrc2) * 100.0).toFixed(1)), sensitivityType: 'epistemic' as const },
    { variableId: 'soiling_loss', name: 'Soiling Deposition & Washing Deficit', varianceContributionPercent: Number(((srcSoiling ** 2 / sumSrc2) * 100.0).toFixed(1)), sensitivityType: 'aleatory' as const },
    { variableId: 'discount_rate', name: 'Weighted Average Cost of Capital (Discount Rate)', varianceContributionPercent: Number(((srcDiscount ** 2 / sumSrc2) * 100.0).toFixed(1)), sensitivityType: 'epistemic' as const },
    { variableId: 'albedo', name: 'Ground Surface Albedo', varianceContributionPercent: Number(((srcAlbedo ** 2 / sumSrc2) * 100.0).toFixed(1)), sensitivityType: 'aleatory' as const },
  ].sort((a, b) => b.varianceContributionPercent - a.varianceContributionPercent);

  // Group Aleatory (Physical Climate) vs Epistemic (Techno-Economic / Modeling) Variance Decomposition
  const aleatorySum2 = srcGhi ** 2 + srcSoiling ** 2 + srcAlbedo ** 2;
  const epistemicSum2 = srcCapex ** 2 + srcTariff ** 2 + srcOpex ** 2 + srcDiscount ** 2;
  const totalGroupSum2 = aleatorySum2 + epistemicSum2 || 1;

  const aleatoryPct = Number(((aleatorySum2 / totalGroupSum2) * 100.0).toFixed(1));
  const epistemicPct = Number(((epistemicSum2 / totalGroupSum2) * 100.0).toFixed(1));

  // Risk category based on NPV spread
  let bankableRiskCategory: FinancialUqResult['bankableRiskCategory'] = 'INVESTMENT_GRADE';
  if (npvStats.relativeSpreadPercent < 25.0 && npvStats.p10 > 0) {
    bankableRiskCategory = 'LOW_RISK';
  } else if (npvStats.p10 > 0) {
    bankableRiskCategory = 'INVESTMENT_GRADE';
  } else if (npvStats.p50 > 0) {
    bankableRiskCategory = 'ELEVATED_VOLATILITY';
  } else {
    bankableRiskCategory = 'HIGH_UNCERTAINTY';
  }

  const convergenceStandardErrorNpvUsd = Number((npvStats.stdDev / Math.sqrt(n)).toFixed(2));

  return {
    traceId: `UQ-RUN-${Date.now().toString(36).toUpperCase()}`,
    sampleCount: n,
    copulaFamilyUsed: copulaFamily,
    annualGenerationMwh: genStats,
    lcoeUsdPerMwh: lcoeStats,
    npvUsd: npvStats,
    bankableRiskCategory,
    tornadoSensitivityRanking: tornado,
    convergenceStandardErrorNpvUsd,
    trialStatusBreakdown: {
      totalTrials: n,
      irrDefinedTrials: irrDefinedCount,
      irrUndefinedTrials: irrUndefinedCount,
      paybackAchievedTrials: paybackAchievedCount,
      paybackUnachievedTrials: paybackUnachievedCount,
    },
    uncertaintyDecomposition: {
      aleatoryVariancePct: aleatoryPct,
      epistemicVariancePct: epistemicPct,
      aleatoryVariables: ['ghi_annual', 'soiling_loss', 'albedo'],
      epistemicVariables: ['tariff', 'capex_variance', 'opex_variance', 'discount_rate'],
      methodologyNote:
        'First-order variance attribution via normalized Pearson determination coefficients (r_i² index across sampled parametric multipliers on NPV, representing exploratory linear sensitivity rather than orthogonal Sobol or rank-based ANOVA decomposition)',
    },
    screeningAndBankabilityNoticeFa:
      'تحلیل عدم قطعیت و حساسیت مالی بر پایه نمونه‌برداری لاتین هایپرکیوب (LHS) با اعمال ضرایب بر انرژی سالانه پایه انجام شده است. نتایج صرفاً جنبه غربالگری و حساسیت‌سنجی اولیه اقتصادی دارند و معادل تحلیل چندفیزیکی چندساله P50/P90 با داده‌های ساعتی ماهواره‌ای یا گزارش مشاور فنی وام‌دهنده (LTA) نیستند.',
    screeningAndBankabilityNoticeEn:
      'Exploratory financial sensitivity based on Latin Hypercube Sampling (LHS) with parametric multipliers on baseline annual yield. Results represent preliminary sensitivity screening and do not substitute for multi-year satellite hourly time-series (P50/P90) or Lender Technical Advisor (LTA) bankability due diligence.',
  };
}

/**
 * Calculates sample kurtosis: \mu_4 / \sigma^4.
 * Theoretical baseline: Gaussian = 3.0, Student's t(\nu=5) = 9.0 (excess kurtosis +6.0).
 */
export function calculateSampleKurtosis(samples: number[]): number {
  const n = samples.length;
  if (n < 4) return 0;
  const mean = samples.reduce((acc, v) => acc + v, 0) / n;
  let m2 = 0;
  let m4 = 0;
  for (let i = 0; i < n; i++) {
    const diff = samples[i] - mean;
    const diffSq = diff * diff;
    m2 += diffSq;
    m4 += diffSq * diffSq;
  }
  const variance = m2 / n;
  if (variance <= 1e-12) return 0;
  return (m4 / n) / (variance * variance);
}
