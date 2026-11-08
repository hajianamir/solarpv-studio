/**
 * Structural & Geotechnical Engineering Contract
 * Phase 07 Remediation — Single Source of Truth for Structural Physics & Honesty
 *
 * Conforming to:
 * - ASCE 7-22 Chapters 26, 27, 29, 30 (Wind velocity pressure & aerodynamic coefficients)
 * - Eurocode 7 (EN 1997-1) §7.6 (Pile uplift, lateral resistance, factor of safety)
 * - Iranian National Building Code Part 6 (مبحث ۶ مقررات ملی ساختمان - بارهای وارد بر ساختمان)
 * - Iranian National Building Code Part 7 (مبحث ۷ مقررات ملی ساختمان - پی و ژئوتکنیک)
 * - FHWA-NHI-16-009 / Broms (1964) (Lateral soil equilibrium)
 */

import { type ExposureCategory, type StructuralParametersInput } from '../structuralEngine';

/**
 * Standard S-1 Synthetic Structural Benchmark Fixture
 * Defined in PHASE-07-PROMPT.fa.md Section 3.
 */
export const FIXTURE_S1: StructuralParametersInput = Object.freeze({
  totalModulesCount: 140,
  moduleLengthM: 2.278,
  moduleWidthM: 1.134,
  moduleWeightKg: 28.5,
  tablesCount: 5,
  modulesPerTable: 28,
  arrayTiltDeg: 28,
  groundClearanceM: 0.9,
  basicWindSpeedKmh: 120,
  groundSnowLoadKgM2: 50,
  foundationType: 'rammed_steel_pile',
  soilType: 'dense_sand_gravel',
  soilBearingCapacityKpa: 250,
  soilInternalFrictionAngleDeg: 34,
  soilCohesionKpa: 10,
  soilDensityKnM3: 18,
  annualRainfallMm: 230,
  frostDepthCm: 30,
  seismicZoneCoefficientA: 0.35,
  elevationM: 1190,
});

/**
 * Additional Synthetic Benchmark Fixture S-2 (High wind, deeper frost, medium clay)
 * Used for C7-02 load model equality verification across varied inputs.
 */
export const FIXTURE_S2: StructuralParametersInput = Object.freeze({
  totalModulesCount: 200,
  moduleLengthM: 2.278,
  moduleWidthM: 1.134,
  moduleWeightKg: 28.5,
  tablesCount: 8,
  modulesPerTable: 25,
  arrayTiltDeg: 32,
  groundClearanceM: 1.2,
  basicWindSpeedKmh: 140,
  groundSnowLoadKgM2: 100,
  foundationType: 'rammed_steel_pile',
  soilType: 'medium_clay',
  soilBearingCapacityKpa: 180,
  soilInternalFrictionAngleDeg: 24,
  soilCohesionKpa: 35,
  soilDensityKnM3: 18.5,
  annualRainfallMm: 350,
  frostDepthCm: 50,
  seismicZoneCoefficientA: 0.30,
  elevationM: 1400,
});

/**
 * Additional Synthetic Benchmark Fixture S-3 (Low tilt, low wind, loose sand)
 * Used for C7-02 load model equality verification across varied inputs.
 */
export const FIXTURE_S3: StructuralParametersInput = Object.freeze({
  totalModulesCount: 112,
  moduleLengthM: 2.278,
  moduleWidthM: 1.134,
  moduleWeightKg: 28.5,
  tablesCount: 4,
  modulesPerTable: 28,
  arrayTiltDeg: 15,
  groundClearanceM: 0.6,
  basicWindSpeedKmh: 100,
  groundSnowLoadKgM2: 20,
  foundationType: 'rammed_steel_pile',
  soilType: 'loose_sand',
  soilBearingCapacityKpa: 140,
  soilInternalFrictionAngleDeg: 28,
  soilCohesionKpa: 10,
  soilDensityKnM3: 17.0,
  annualRainfallMm: 120,
  frostDepthCm: 15,
  seismicZoneCoefficientA: 0.25,
  elevationM: 800,
});

export type S1FixtureType = typeof FIXTURE_S1;

export interface UnifiedWindPressureInput {
  basicWindSpeedKmh: number;
  elevationM?: number;
  exposureCategory?: ExposureCategory;
  structureHeightM?: number;
  topographicFactorKzt?: number;
  windDirectionalityKd?: number;
}

export interface UnifiedWindPressureResult {
  qzN_M2: number;     // Pa (N/m²)
  qzKnM2: number;    // kN/m²
  vMs: number;       // m/s
  kz: number;
  kzt: number;
  kd: number;
  ke: number;
}

/**
 * Calculate ASCE 7-22 velocity pressure exposure coefficient Kz.
 */
export function calculateUnifiedKz(
  exposure: ExposureCategory = 'C',
  heightM?: number
): number {
  if (heightM === undefined && exposure === 'C') {
    return 0.88; // Default baseline for low ground-mount PV (ASCE 7-22 nominal)
  }
  const z = Math.max(0.5, heightM ?? 3.0);
  let alpha: number;
  let zg: number;
  let zmin: number;

  switch (exposure) {
    case 'B':
      alpha = 7.0;
      zg = 365.76;
      zmin = 9.14;
      break;
    case 'D':
      alpha = 11.5;
      zg = 213.36;
      zmin = 2.13;
      break;
    case 'C':
    default:
      alpha = 9.5;
      zg = 274.32;
      zmin = 4.57;
      break;
  }

  const effectiveZ = Math.max(z, zmin);
  return Number((2.01 * Math.pow(effectiveZ / zg, 2.0 / alpha)).toFixed(3));
}

/**
 * ASCE 7-22 Eq. 26.10-1 velocity pressure q_z (Pa).
 * Single source of truth across all modules.
 *
 * q_z = 0.613 * K_z * K_zt * K_d * K_e * V^2 (Pa)
 */
export function calculateUnifiedWindPressureQz(
  input: UnifiedWindPressureInput
): UnifiedWindPressureResult {
  const {
    basicWindSpeedKmh,
    elevationM = 0,
    exposureCategory = 'C',
    structureHeightM,
    topographicFactorKzt = 1.0,
    windDirectionalityKd = 0.85,
  } = input;

  const vMs = Math.max(0, basicWindSpeedKmh) / 3.6;
  const kz = (structureHeightM === undefined && exposureCategory === 'C')
    ? 0.88
    : calculateUnifiedKz(exposureCategory, structureHeightM);
  const kzt = Math.max(0.5, topographicFactorKzt);
  const kd = Math.max(0.5, windDirectionalityKd);

  // ASCE 7-22 §26.10.1 elevation factor Ke.
  // ke = 1.0 at sea level (elevationM <= 0), exp(-0.0000362 * elevationM) above sea level.
  const ke = elevationM > 0
    ? Math.exp(-0.0000362 * elevationM)
    : 1.0;

  const qzN_M2 = 0.613 * kz * kzt * kd * ke * Math.pow(vMs, 2);
  const qzKnM2 = qzN_M2 / 1000.0;

  return {
    qzN_M2,
    qzKnM2,
    vMs,
    kz,
    kzt,
    kd,
    ke,
  };
}

/**
 * Calculates sensitivity ratio of wind pressure for a speed multiplier.
 * For multiplier 1.2, returns qz(1.2*V) / qz(V) which analytically equals 1.44.
 */
export function calculateWindPressureSensitivity(
  baseInput: UnifiedWindPressureInput,
  multiplier: number = 1.2
): {
  baseQzPa: number;
  elevatedQzPa: number;
  ratio: number;
  elevatedSpeedKmh: number;
} {
  const base = calculateUnifiedWindPressureQz(baseInput);
  const elevatedInput: UnifiedWindPressureInput = {
    ...baseInput,
    basicWindSpeedKmh: baseInput.basicWindSpeedKmh * multiplier,
  };
  const elevated = calculateUnifiedWindPressureQz(elevatedInput);
  const ratio = elevated.qzN_M2 / base.qzN_M2;

  return {
    baseQzPa: base.qzN_M2,
    elevatedQzPa: elevated.qzN_M2,
    ratio,
    elevatedSpeedKmh: elevatedInput.basicWindSpeedKmh,
  };
}

export interface DeadLoadTableInput {
  modulesPerTable: number;
  moduleWeightKg: number;
  tableAreaM2: number;
  rackingUnitWeightKgM2?: number; // default 14.5 kg/m² for galvanized steel/aluminum
}

export interface DeadLoadTableResult {
  moduleTotalWeightPerTableKg: number;
  rackingWeightPerTableKg: number;
  deadLoadTableKg: number;
  deadLoadTableKn: number;
}

/**
 * Single source of truth for table dead load calculation.
 */
export function calculateUnifiedTableDeadLoad(
  input: DeadLoadTableInput
): DeadLoadTableResult {
  const {
    modulesPerTable,
    moduleWeightKg,
    tableAreaM2,
    rackingUnitWeightKgM2 = 14.5,
  } = input;

  const moduleTotalWeightPerTableKg = modulesPerTable * moduleWeightKg;
  const rackingWeightPerTableKg = tableAreaM2 * rackingUnitWeightKgM2;
  const deadLoadTableKg = moduleTotalWeightPerTableKg + rackingWeightPerTableKg;
  const deadLoadTableKn = (deadLoadTableKg * 9.81) / 1000.0;

  return {
    moduleTotalWeightPerTableKg,
    rackingWeightPerTableKg,
    deadLoadTableKg,
    deadLoadTableKn,
  };
}

export interface LateralShearInput {
  qzN_M2: number;
  tableAreaM2: number;
  arrayTiltDeg: number;
  postsPerTable: number;
}

/**
 * Single source of truth for lateral shear demand per post.
 * Eliminates artificial hidden multipliers (e.g. * 1.2 in legacy recommendation engine).
 */
export function calculateUnifiedLateralShearPerPost(
  input: LateralShearInput
): {
  lateralWindForceTableKn: number;
  lateralShearPerPostKn: number;
} {
  const { qzN_M2, tableAreaM2, arrayTiltDeg, postsPerTable } = input;
  const tiltRad = (arrayTiltDeg * Math.PI) / 180.0;
  const lateralWindForceTableKn = (qzN_M2 * tableAreaM2 * Math.sin(tiltRad)) / 1000.0;
  const lateralShearPerPostKn = lateralWindForceTableKn / Math.max(1, postsPerTable);

  return {
    lateralWindForceTableKn,
    lateralShearPerPostKn,
  };
}

export interface GoverningPileDepthInput {
  lateralDepthM: number;
  frostDepthM: number;
  upliftRequiredDepthM: number;
  customEmbedmentDepthM?: number;
}

export interface GoverningPileDepthResult {
  depthRequiredLateralM: number;
  depthRequiredFrostM: number;
  depthRequiredUpliftM: number;
  depthGoverningCalculatedM: number;
  effectiveRecommendedDepthM: number;
  governingLimit: 'lateral' | 'frost' | 'uplift' | 'custom_insufficient' | 'custom_sufficient' | 'invalid_negative_depth';
  isDepthAdequate: boolean;
  notesFa: string;
  notesEn: string;
}

/**
 * Sizing of governing pile embedment depth:
 * L_governing = max(L_lateral, L_frost, L_uplift)
 *
 * Safety requirements:
 * 1. Required limits are NOT rounded down before comparison (e.g. 1.234m is not truncated to 1.23m).
 * 2. Negative, zero, or non-finite custom embedment depths are explicitly rejected as invalid (never declared safe).
 * 3. Custom depth less than governing depth is explicitly flagged as insufficient (never declared safe).
 */
export function calculateGoverningPileDepth(
  input: GoverningPileDepthInput
): GoverningPileDepthResult {
  const depthRequiredLateralM = input.lateralDepthM;
  const depthRequiredFrostM = input.frostDepthM + 1.0;
  const depthRequiredUpliftM = input.upliftRequiredDepthM;

  const depthGoverningCalculatedM = Math.max(
    depthRequiredLateralM,
    depthRequiredFrostM,
    depthRequiredUpliftM
  );

  let effectiveRecommendedDepthM = depthGoverningCalculatedM;
  let isDepthAdequate = true;
  let governingLimit: GoverningPileDepthResult['governingLimit'] = 'lateral';

  if (depthGoverningCalculatedM === depthRequiredUpliftM) {
    governingLimit = 'uplift';
  } else if (depthGoverningCalculatedM === depthRequiredFrostM) {
    governingLimit = 'frost';
  } else {
    governingLimit = 'lateral';
  }

  if (input.customEmbedmentDepthM !== undefined) {
    effectiveRecommendedDepthM = input.customEmbedmentDepthM;
    if (!Number.isFinite(input.customEmbedmentDepthM) || input.customEmbedmentDepthM <= 0) {
      isDepthAdequate = false;
      governingLimit = 'invalid_negative_depth';
    } else if (input.customEmbedmentDepthM < depthGoverningCalculatedM) {
      isDepthAdequate = false;
      governingLimit = 'custom_insufficient';
    } else {
      governingLimit = 'custom_sufficient';
    }
  }

  const notesFa =
    governingLimit === 'invalid_negative_depth'
      ? `خطای بحرانی ایمنی سازه: عمق وارد شده (${effectiveRecommendedDepthM}m) نامعتبر یا غیرمثبت است.`
      : isDepthAdequate
      ? `عمق شمع (${Number(effectiveRecommendedDepthM.toFixed(3))}m) الزامات سه‌گانه جانبی (${Number(depthRequiredLateralM.toFixed(3))}m)، یخ‌زدگی (${Number(depthRequiredFrostM.toFixed(3))}m) و کشش مکش باد (${Number(depthRequiredUpliftM.toFixed(3))}m) را پوشش می‌دهد.`
      : `هشدار: عمق دستی (${Number(effectiveRecommendedDepthM.toFixed(3))}m) کمتر از حداقل حاکم محاسباتی (${Number(depthGoverningCalculatedM.toFixed(3))}m) است و ضریب اطمینان کافی را تأمین نمی‌کند.`;

  const notesEn =
    governingLimit === 'invalid_negative_depth'
      ? `CRITICAL SAFETY ERROR: Custom embedment depth (${effectiveRecommendedDepthM}m) is non-positive or invalid.`
      : isDepthAdequate
      ? `Pile embedment (${Number(effectiveRecommendedDepthM.toFixed(3))}m) satisfies lateral (${Number(depthRequiredLateralM.toFixed(3))}m), frost (${Number(depthRequiredFrostM.toFixed(3))}m), and uplift (${Number(depthRequiredUpliftM.toFixed(3))}m) governing limits.`
      : `WARNING: Custom embedment depth (${Number(effectiveRecommendedDepthM.toFixed(3))}m) is less than required governing depth (${Number(depthGoverningCalculatedM.toFixed(3))}m). Safety factor is insufficient.`;

  return {
    depthRequiredLateralM,
    depthRequiredFrostM,
    depthRequiredUpliftM,
    depthGoverningCalculatedM,
    effectiveRecommendedDepthM,
    governingLimit,
    isDepthAdequate,
    notesFa,
    notesEn,
  };
}

export type AssessmentStatus = 'assessed' | 'unassessed' | 'partially_assessed';

export interface UnassessedDisclosures {
  rooftopAnchorStatus: AssessmentStatus;
  shedPurlinClampStatus: AssessmentStatus;
  seismicVerificationStatus: AssessmentStatus;
  cornerEdgeVortexStatus: AssessmentStatus;
  loadCombinationsStatus: AssessmentStatus;
  disclaimerFa: string;
  disclaimerEn: string;
}

/**
 * Disclosures for structural modes that lack sufficient site-specific data or engineering methods.
 * Conforms to Rule H-08, DoD-05, and C7-04.
 */
export function getStructuralHonestyDisclosures(): UnassessedDisclosures {
  return {
    rooftopAnchorStatus: 'unassessed',
    shedPurlinClampStatus: 'unassessed',
    seismicVerificationStatus: 'unassessed',
    cornerEdgeVortexStatus: 'unassessed',
    loadCombinationsStatus: 'partially_assessed',
    disclaimerFa:
      'توجه مهم مهندسی: ارزیابی سازه و فونداسیون در سطح غربالگری اولیه (Preliminary Screening) است. اتصالات مهاری سقف، ظرفیت پرلین‌های سوله، اثرات گردابه‌ای گوشه/لبه و تحلیل دینامیکی زلزله ارزیابی‌نشده (Unassessed) هستند و نیازمند بررسی نقشه‌های چون‌ساخت و تأیید مهندس محاسب ذی‌صلاح می‌باشند.',
    disclaimerEn:
      'CRITICAL ENGINEERING NOTICE: Structural checks are limited to preliminary screening. Rooftop concrete anchors, shed purlin gauge capacity, edge/corner aerodynamic vortices, and dynamic seismic analysis are UNASSESSED and require site pullout tests and licensed professional engineer verification.',
  };
}

/**
 * Structural Tab Calculation Snapshot.
 * Carries exact state from StructuralFoundationTab to OfficialReportModal.
 * When absent or inputs change without recalculating, status is 'unavailable'.
 */
export interface StructuralSnapshot {
  snapshotId: string;
  calculatedAtCommit?: string;
  timestampMs: number;
  inputHash: string;
  isAvailable: boolean;
  isStale: boolean;
  foundationType: string;
  foundationNameFa: string;
  foundationNameEn: string;
  qzPa: number;
  qzKnM2: number;
  deadLoadTableKn: number;
  lateralShearPerPostKn: number;
  upliftPerPostKn: number;
  compressionPerPostKn: number;
  recommendedDepthM: number;
  governingLimit: string;
  fosUplift: number;
  fosLateral: number;
  fosOverturning: number;
  fosSliding: number;
  isStructurallySafe: boolean;
  isScreeningPreliminary: boolean;
  assessmentStatus: AssessmentStatus;
  disclosures: UnassessedDisclosures;
}
