/**
 * Advanced Engineering Model Interfaces (Phase 2a & 2b Contract)
 * RFC 3.0.0 Section 2 - Technical Additions
 *
 * Defines formal data contracts for:
 * 1. Kimber/HSU Soiling & Rain Recovery
 * 2. Marion/Townsend Snow Shedding & Sliding Risk
 * 3. Temperature-Coupled Incidence Angle Modifier (IAM)
 * 4. 15-Minute Slope-Aware Backtracking Single-Axis Tracker
 */

// ============================================================================
// 1. Soiling & Rain Recovery (Kimber / HSU Model)
// Standard: Kimber et al. (NREL) / IEC 61724-1 Soiling Ratio
// ============================================================================

export interface SoilingConfig {
  /** Daily soiling accumulation rate during dry periods (%/day), typically 0.15% - 0.50% in arid zones */
  dailySoilingRatePercent: number;

  /** Minimum precipitation threshold (mm/day) required for complete rain wash-off (default: 4.0 - 5.0 mm) */
  rainCleaningThresholdMm: number;

  /** Partial cleaning grace ratio for rain between 1mm and threshold (0.0 to 1.0) */
  partialWashCoefficient: number;

  /** Maximum ceiling for soiling loss accumulation (% cap, typically 20% - 30% before saturation) */
  maxSoilingCeilingPercent: number;

  /** Scheduled manual wash dates (ISO format strings) or frequency in days */
  scheduledWashIntervalDays?: number;

  /** Desert dust storm vulnerability multiplier (1.0 = standard, 2.5 = high haboob/arid zone) */
  dustStormVulnerabilityFactor: number;

  /** Kimber model calculation variant: simplified uniform daily or full discrete bin distribution */
  modelVariant: 'kimber_simplified' | 'kimber_full_discrete_bins';
}

export interface SoilingDailyStepResult {
  dayOfYear: number;
  rainfallMm: number;
  dustStormOccurred: boolean;
  manualCleanPerformed: boolean;
  dailySoilingLossPercent: number;
  cumulativeSoilingFactor: number; // 1.0 = pristine, 0.95 = 5% loss
  soilingRatio: number; // IEC 61724-1 standard ratio
}

export interface SoilingSimulationResult {
  annualAverageSoilingLossPercent: number;
  maxMonthlySoilingLossPercent: number;
  recommendedWashingCyclesPerYear: number;
  dustStormVulnerabilityCategory: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  dailyProfile: SoilingDailyStepResult[];
}

// ============================================================================
// 2. Snow Shedding & Sliding Risk (Marion / Townsend Model)
// Standard: NREL Marion (2013) / Townsend & Powers (2011)
// ============================================================================

export interface SnowSheddingConfig {
  /** Tilt angle of the PV array (degrees) */
  tiltDeg: number;

  /** Ground clearance to lowest module edge (meters) - lower clearance causes snow accumulation damming */
  groundClearanceM: number;

  /** Module bottom frame clearance above ground/snow surface (meters, default 0.8m) */
  moduleBottomClearanceM: number;

  /** Snow height threshold relative to bottom frame where avalanche damming starts (meters, default 0.5m) */
  dammingRiskThresholdM: number;

  /** Threshold ground snow depth (cm) where slide blockage begins */
  dammingSnowDepthThresholdCm: number;

  /** Critical temperature threshold for melting slide (°C, typically -1°C to +2°C) */
  slideTemperatureThresholdC: number;

  /** Module surface treatment factor (1.0 = untreated glass, 1.25 = anti-soiling hydrophobic coating) */
  surfaceSheddingCoeff: number;

  /**
   * Snow density for structural sliding load calculation (kg/m3)
   * - 100 kg/m3 (0.98 kN/m3): Fresh uncompacted snow (Eurocode 1 / ASCE 7-22 default)
   * - 200-250 kg/m3 (1.96-2.45 kN/m3): Settled wet winter snow
   * - 300-500 kg/m3 (2.94-4.90 kN/m3): Aged wind-packed or structural design snow
   */
  snowDensityKgPerM3?: number;
}

export interface SnowSheddingStepResult {
  hourOfYear: number;
  ambientTempC: number;
  snowfallDepthCm: number;
  moduleCoveredFraction: number; // 0.0 (clean) to 1.0 (fully covered)
  sheddingMechanism: 'none' | 'thermal_melt' | 'gravity_slide' | 'dammed_at_base';
  snowLossPercent: number;
  structuralSlidingLoadKnM2: number;
}

export interface SnowSheddingSummaryResult {
  annualSnowLossPercent: number;
  snowCoverageDays: number;
  avalancheDammingRisk: 'NONE' | 'LOW' | 'ELEVATED' | 'SEVERE';
  maxSnowStructuralLoadKnM2: number;
}

// ============================================================================
// 3. Temperature-Coupled Incidence Angle Modifier (IAM)
// Coupled optical-thermal model accounting for thermo-optic coefficient dn/dT
// and thermal expansion of ARC (Anti-Reflective Coating)
// References: Martin & Ruiz (2001), IEC 61853-2, Snell-Fresnel Optics
// ============================================================================

export interface TemperatureCoupledIamConfig {
  /** Reference refractive index of ARC layer at 25°C (typically 1.38 for porous SiO2, 1.526 for glass) */
  refractiveIndexArcRef: number;

  /** Thermo-optic coefficient of glass/coating dn/dT (1/K, typically 3.0e-5 to 6.5e-5) */
  thermoOpticCoeffPerK: number;

  /** Angular modifier parameter (Ashrae b0 factor, typically 0.05 - 0.06) */
  ashraeB0: number;

  /** Martin & Ruiz (2001) ARC angular parameter a_r (typically 0.16 for ARC solar glass, 0.20 for bare glass) */
  arCoatingFactor?: number;

  /** Optical formulation model variant */
  modelVariant?: 'martin_ruiz' | 'ashrae_b0' | 'physical_fresnel';

  /** Cell operating temperature (°C) */
  cellTemperatureC: number;

  /** Angle of incidence theta (degrees, 0 = perpendicular) */
  angleIncidenceDeg: number;
}

export interface TemperatureCoupledIamResult {
  angleIncidenceDeg: number;
  cellTemperatureC: number;
  iamBaseline: number;
  iamCoupled: number;
  thermoOpticDeltaPercent: number; // Additional transmission gain or loss due to thermal expansion/refractive shift
}

// ============================================================================
// 4. Backtracking Single-Axis Tracker (15-Minute Sub-Hourly Dispatch)
// Standard: Anderson & Mikofski / NREL True-Tracking & Backtracking
// ============================================================================

export interface BacktrackingTrackerConfig {
  /** Maximum mechanical rotation limit (±degrees, typically ±60°) */
  maxRotationDeg: number;

  /** Ground Cover Ratio (GCR = Collector Width / Row Pitch) */
  gcr: number;

  /** Module collector width along tracker chord (meters) */
  collectorWidthM: number;

  /** Row-to-row pitch (meters) */
  pitchM: number;

  /** Terrain N-S / E-W slope angle (degrees, for slope-aware 3D backtracking) */
  terrainSlopeDeg: number;

  /** Sub-hourly timestep duration (minutes, e.g. 15) */
  timeStepMinutes: 15 | 30 | 60;
}

export interface TrackerStepResult {
  timestampIso: string;
  solarZenithDeg: number;
  solarAzimuthDeg: number;
  trueTrackingAngleDeg: number;
  commandedTrackerAngleDeg: number;
  isBacktracking: boolean;
  shadingFraction: number; // 0.0 = zero mutual shadow, >0 = inter-row shading
  beamTranspositionFactor: number;
  clippingAvoidanceGainPercent: number;
}

// ============================================================================
// Fallback & Standard Defaults
// ============================================================================

export const DEFAULT_SOILING_CONFIG: SoilingConfig = {
  dailySoilingRatePercent: 0.22,
  rainCleaningThresholdMm: 5.0,
  partialWashCoefficient: 0.5,
  maxSoilingCeilingPercent: 25.0,
  scheduledWashIntervalDays: 60,
  dustStormVulnerabilityFactor: 1.8,
  modelVariant: 'kimber_simplified',
};

export const DEFAULT_SNOW_SHEDDING_CONFIG: SnowSheddingConfig = {
  tiltDeg: 25,
  groundClearanceM: 0.8,
  moduleBottomClearanceM: 0.8,
  dammingRiskThresholdM: 0.5,
  dammingSnowDepthThresholdCm: 45,
  slideTemperatureThresholdC: 0.5,
  surfaceSheddingCoeff: 1.0,
  snowDensityKgPerM3: 100, // 100 kg/m3 fresh uncompacted snow baseline
};

export const DEFAULT_IAM_CONFIG: TemperatureCoupledIamConfig = {
  refractiveIndexArcRef: 1.38, // Porous silica anti-reflective layer on solar glass
  thermoOpticCoeffPerK: 4.5e-5, // Soda-lime / borosilicate solar glass dn/dT
  ashraeB0: 0.05,
  arCoatingFactor: 0.16, // Martin & Ruiz (2001) parameter for ARC textured glass
  modelVariant: 'martin_ruiz',
  cellTemperatureC: 25.0,
  angleIncidenceDeg: 0.0,
};

export const DEFAULT_TRACKER_CONFIG: BacktrackingTrackerConfig = {
  maxRotationDeg: 60,
  gcr: 0.38,
  collectorWidthM: 2.278,
  pitchM: 6.0,
  terrainSlopeDeg: 0.0,
  timeStepMinutes: 15,
};
