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
  }>;
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
    distributionType: 'uniform',
    minBound: 0.18,
    maxBound: 0.26,
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
    { var1: 'ghi_annual', var2: 'albedo', correlationValue: 0.15, metricType: 'spearman_rho' },
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
