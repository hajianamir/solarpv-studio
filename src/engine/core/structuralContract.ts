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

export interface UnifiedTableGeometryInput {
  modulesPerTable: number;
  moduleLengthM: number;
  moduleWidthM: number;
}

export interface UnifiedTableGeometryResult {
  tableLengthM: number;
  tableSlopedWidthM: number;
  tableAreaM2: number;
}

/**
 * Standard table geometry: 2 modules in portrait, with 20mm clamp spacing along length
 * and 50mm center gap along slope.
 */
export function calculateUnifiedTableGeometry(
  input: UnifiedTableGeometryInput
): UnifiedTableGeometryResult {
  const { modulesPerTable, moduleLengthM, moduleWidthM } = input;
  if (!Number.isInteger(modulesPerTable) || modulesPerTable < 1) {
    throw new RangeError(`Invalid modulesPerTable (${modulesPerTable}): must be an integer >= 1`);
  }
  if (!Number.isFinite(moduleLengthM) || moduleLengthM <= 0) {
    throw new RangeError(`Invalid moduleLengthM (${moduleLengthM}): must be positive finite`);
  }
  if (!Number.isFinite(moduleWidthM) || moduleWidthM <= 0) {
    throw new RangeError(`Invalid moduleWidthM (${moduleWidthM}): must be positive finite`);
  }

  const tableLengthM = (modulesPerTable / 2.0) * (moduleWidthM + 0.02);
  const tableSlopedWidthM = 2.0 * moduleLengthM + 0.05;
  const tableAreaM2 = tableLengthM * tableSlopedWidthM;

  return {
    tableLengthM,
    tableSlopedWidthM,
    tableAreaM2,
  };
}

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

  if (!Number.isFinite(basicWindSpeedKmh) || basicWindSpeedKmh < 0) {
    throw new RangeError(
      `Invalid basicWindSpeedKmh (${basicWindSpeedKmh}): wind speed must be a non-negative finite number`
    );
  }
  if (!Number.isFinite(elevationM)) {
    throw new RangeError(`Invalid elevationM (${elevationM}): elevation must be a finite number`);
  }

  const vMs = basicWindSpeedKmh / 3.6;
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
 *
 * Strictly rejects zero or non-finite base wind speed (cannot compute ratio against zero pressure).
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
  if (!Number.isFinite(baseInput.basicWindSpeedKmh) || baseInput.basicWindSpeedKmh <= 0) {
    throw new RangeError(
      `Invalid basicWindSpeedKmh (${baseInput.basicWindSpeedKmh}): cannot compute sensitivity ratio for non-positive or non-finite wind speed`
    );
  }
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    throw new RangeError(`Invalid multiplier (${multiplier}): multiplier must be a positive finite number`);
  }

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

  if (!Number.isInteger(modulesPerTable) || modulesPerTable < 1) {
    throw new RangeError(`Invalid modulesPerTable (${modulesPerTable}): must be a positive integer >= 1`);
  }
  if (!Number.isFinite(moduleWeightKg) || moduleWeightKg <= 0) {
    throw new RangeError(`Invalid moduleWeightKg (${moduleWeightKg}): must be a positive finite number`);
  }
  if (!Number.isFinite(tableAreaM2) || tableAreaM2 <= 0) {
    throw new RangeError(`Invalid tableAreaM2 (${tableAreaM2}): must be a positive finite number`);
  }

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

  if (!Number.isInteger(postsPerTable) || postsPerTable < 1) {
    throw new RangeError(
      `Invalid postsPerTable (${postsPerTable}): posts count per table must be an integer >= 1`
    );
  }
  if (!Number.isFinite(arrayTiltDeg) || arrayTiltDeg < 0 || arrayTiltDeg > 90) {
    throw new RangeError(
      `Invalid arrayTiltDeg (${arrayTiltDeg}): array tilt must be a finite number between 0 and 90 degrees`
    );
  }
  if (!Number.isFinite(qzN_M2) || qzN_M2 < 0) {
    throw new RangeError(`Invalid qzN_M2 (${qzN_M2}): wind velocity pressure must be a non-negative finite number`);
  }
  if (!Number.isFinite(tableAreaM2) || tableAreaM2 <= 0) {
    throw new RangeError(`Invalid tableAreaM2 (${tableAreaM2}): table area must be a positive finite number`);
  }

  const tiltRad = (arrayTiltDeg * Math.PI) / 180.0;
  const lateralWindForceTableKn = (qzN_M2 * tableAreaM2 * Math.sin(tiltRad)) / 1000.0;
  const lateralShearPerPostKn = Number((lateralWindForceTableKn / postsPerTable).toFixed(3));

  return {
    lateralWindForceTableKn,
    lateralShearPerPostKn,
  };
}

export interface UnifiedTableLoadsInput {
  qzN_M2: number;
  groundSnowLoadKgM2: number;
  tableAreaM2: number;
  tableSlopedWidthM: number;
  groundClearanceM: number;
  arrayTiltDeg: number;
  deadLoadTableKn: number;
  postsPerTable: number;
  isRooftop?: boolean;
}

export interface UnifiedTableLoadsResult {
  cpUplift: number;
  cpDownforce: number;
  windUpliftForceKn: number;
  windDownforceKn: number;
  windOverturningMomentKnM: number;
  snowLoadTableKn: number;
  upliftPerPostKn: number;
  compressionPerPostKn: number;
  lateralWindForceTableKn: number;
  lateralShearPerPostKn: number;
}

/**
 * Unified load and reaction calculation per table and per post.
 * Single source of truth for both structuralEngine and foundationRecommendation.
 */
export function calculateUnifiedTableLoadsAndReactions(
  input: UnifiedTableLoadsInput
): UnifiedTableLoadsResult {
  const {
    qzN_M2,
    groundSnowLoadKgM2,
    tableAreaM2,
    tableSlopedWidthM,
    groundClearanceM,
    arrayTiltDeg,
    deadLoadTableKn,
    postsPerTable,
    isRooftop = false,
  } = input;

  if (!Number.isInteger(postsPerTable) || postsPerTable < 1) {
    throw new RangeError(`Invalid postsPerTable (${postsPerTable}): must be an integer >= 1`);
  }
  if (!Number.isFinite(arrayTiltDeg) || arrayTiltDeg < 0 || arrayTiltDeg > 90) {
    throw new RangeError(`Invalid arrayTiltDeg (${arrayTiltDeg}): must be between 0 and 90`);
  }
  if (!Number.isFinite(qzN_M2) || qzN_M2 < 0) {
    throw new RangeError(`Invalid qzN_M2 (${qzN_M2}): must be non-negative finite number`);
  }

  const tiltRad = (arrayTiltDeg * Math.PI) / 180.0;

  // Aerodynamic coefficients per ASCE 7-22 §29.4.3 / §29.4.4
  const cpUplift = isRooftop ? 1.45 + 0.015 * arrayTiltDeg : 1.30 + 0.012 * arrayTiltDeg;
  const cpDownforce = isRooftop ? 1.10 + 0.012 * arrayTiltDeg : 0.95 + 0.01 * arrayTiltDeg;

  const windUpliftForceKn = (qzN_M2 * cpUplift * tableAreaM2) / 1000.0;
  const windDownforceKn = (qzN_M2 * cpDownforce * tableAreaM2) / 1000.0;

  const overturningMomentArmM = (tableSlopedWidthM / 2.0) + (groundClearanceM * Math.sin(tiltRad));
  const windOverturningMomentKnM = windUpliftForceKn * overturningMomentArmM;

  // Snow load per ASCE 7-22 §7.4
  const cs = arrayTiltDeg > 30 ? Math.max(0, 1 - (arrayTiltDeg - 30) / 40) : 1.0;
  const roofSnowFactor = isRooftop ? 0.70 : 1.0;
  const snowLoadTableKg = groundSnowLoadKgM2 * roofSnowFactor * cs * tableAreaM2 * Math.cos(tiltRad);
  const snowLoadTableKn = (snowLoadTableKg * 9.81) / 1000.0;

  // Lateral shear per post
  const lateralWindForceTableKn = (qzN_M2 * tableAreaM2 * Math.sin(tiltRad)) / 1000.0;
  const lateralShearPerPostKn = Number((lateralWindForceTableKn / postsPerTable).toFixed(3));

  // Net tension (uplift) per post
  const verticalUpliftForceKn = windUpliftForceKn * Math.cos(tiltRad);
  const netUpliftPerPost = Math.max(
    0,
    (verticalUpliftForceKn - 0.9 * deadLoadTableKn) / postsPerTable +
    (windOverturningMomentKnM / ((tableSlopedWidthM * postsPerTable) / 2.0))
  );
  const upliftPerPostKn = Number(netUpliftPerPost.toFixed(3));

  // Compression per post
  const compressionPerPostKn = Number(
    ((deadLoadTableKn + 1.2 * windDownforceKn + snowLoadTableKn) / postsPerTable).toFixed(3)
  );

  return {
    cpUplift,
    cpDownforce,
    windUpliftForceKn,
    windDownforceKn,
    windOverturningMomentKnM,
    snowLoadTableKn,
    upliftPerPostKn,
    compressionPerPostKn,
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
 * 2. Non-finite or NaN depth inputs are explicitly rejected with isDepthAdequate=false.
 * 3. Negative, zero, or non-finite custom embedment depths are explicitly rejected as invalid (never declared safe).
 * 4. Custom depth less than governing depth is explicitly flagged as insufficient (never declared safe).
 */
export function calculateGoverningPileDepth(
  input: GoverningPileDepthInput
): GoverningPileDepthResult {
  const isInputValid =
    Number.isFinite(input.lateralDepthM) && input.lateralDepthM >= 0 &&
    Number.isFinite(input.frostDepthM) && input.frostDepthM >= 0 &&
    Number.isFinite(input.upliftRequiredDepthM) && input.upliftRequiredDepthM >= 0;

  if (!isInputValid) {
    return {
      depthRequiredLateralM: input.lateralDepthM,
      depthRequiredFrostM: input.frostDepthM + 1.0,
      depthRequiredUpliftM: input.upliftRequiredDepthM,
      depthGoverningCalculatedM: NaN,
      effectiveRecommendedDepthM: input.customEmbedmentDepthM ?? NaN,
      governingLimit: 'invalid_negative_depth',
      isDepthAdequate: false,
      notesFa: 'خطای بحرانی ایمنی سازه: پارامترهای عمق نامتناهی، NaN یا منفی هستند.',
      notesEn: 'CRITICAL SAFETY ERROR: Depth parameters are non-finite, NaN, or negative.',
    };
  }

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

export const DEFAULT_GROUND_CLEARANCE_M = 0.8;

export interface StructuralInputHashParams {
  cityId: string;
  totalModulesCount: number;
  arrayTiltDeg: number;
  foundationType: string;
  basicWindSpeedKmh: number;
  groundSnowLoadKgM2: number;
  groundClearanceM: number;
  soilType: string;
  frostDepthCm: number;
  soilBearingCapacityKpa?: number | null;
  soilInternalFrictionAngleDeg?: number | null;
  soilCohesionKpa?: number | null;
  soilDensityKnM3?: number | null;
  seismicZoneCoefficientA?: number | null;
  customEmbedmentDepthM?: number | null;
  customPostsPerTable?: number | null;
  installationEnvironment?: string | null;
  elevationM?: number | null;
  modulesPerTable?: number | null;
}

/**
 * Computes canonical input hash covering all structural & foundation design variables.
 * Shared between StructuralFoundationTab, App, OfficialReportModal, and verification harness.
 */
export function computeStructuralInputHash(params: StructuralInputHashParams): string {
  return [
    params.cityId,
    params.totalModulesCount,
    params.arrayTiltDeg,
    params.foundationType,
    params.basicWindSpeedKmh,
    params.groundSnowLoadKgM2,
    params.groundClearanceM,
    params.soilType,
    params.frostDepthCm,
    params.soilBearingCapacityKpa ?? 'default',
    params.soilInternalFrictionAngleDeg ?? 'default',
    params.soilCohesionKpa ?? 'default',
    params.soilDensityKnM3 ?? 'default',
    params.seismicZoneCoefficientA ?? 'default',
    params.customEmbedmentDepthM ?? 'null',
    params.customPostsPerTable ?? 'null',
    params.installationEnvironment ?? 'ground_mount',
    params.elevationM ?? 0,
    params.modulesPerTable ?? 28,
  ].join('_');
}

/**
 * Structural Tab Calculation Snapshot.
 * Carries exact state from StructuralFoundationTab to OfficialReportModal.
 * When absent or inputs change without recalculating, status is 'unavailable' or 'isStale: true'.
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
  bromsPileSection: string;
  totalTablesCount: number;
  totalPostsCount: number;
  postsPerTable: number;
  tableAreaM2: number;
  qzPa: number;
  qzKnM2: number;
  deadLoadTableKn: number;
  windUpliftForceKn: number;
  windDownforceKn: number;
  windOverturningMomentKnM: number;
  snowLoadTableKn: number;
  lateralShearPerPostKn: number;
  upliftPerPostKn: number;
  compressionPerPostKn: number;
  recommendedDepthM: number;
  minDepthForFrostM: number;
  frostDepthCm: number;
  appliedPostBearingPressureKpa: number;
  allowableSoilBearingKpa: number;
  upliftCapacityPerPostKn: number;
  concreteVolumeTotalM3?: number;
  steelRebarWeightTotalKg?: number;
  governingLimit: string;
  fosUplift: number;
  fosLateral: number;
  fosOverturning: number;
  fosSliding: number;
  fosBearing: number;
  isBearingCapacitySafe: boolean;
  isFrostDepthRespected: boolean;
  isStructurallySafe: boolean;
  isScreeningPreliminary: boolean;
  assessmentStatus: AssessmentStatus;
  disclosures: UnassessedDisclosures;
  safetyReasonFa: string;
  safetyReasonEn: string;
}

/**
 * Generates a deterministic structural snapshot from analysis results and input hash.
 */
export function createStructuralSnapshot(
  result: {
    foundationNameFa: string;
    foundationNameEn: string;
    bromsPileSection: string;
    totalTablesCount: number;
    totalPostsCount: number;
    postsPerTable: number;
    tableAreaM2: number;
    velocityWindPressureQzN_M2: number;
    deadLoadTableKn: number;
    windUpliftForceKn: number;
    windDownforceKn: number;
    windOverturningMomentKnM: number;
    snowLoadTableKn: number;
    lateralShearPerPostKn: number;
    upliftPerPostKn: number;
    compressionPerPostKn: number;
    recommendedDepthM: number;
    minDepthForFrostM: number;
    frostDepthCm: number;
    concreteVolumeTotalM3?: number;
    steelRebarWeightTotalKg?: number;
    appliedPostBearingPressureKpa: number;
    allowableSoilBearingKpa: number;
    upliftCapacityPerPostKn: number;
    fosUplift: number;
    fosLateral: number;
    fosOverturning: number;
    fosSliding: number;
    fosBearing: number;
    isBearingCapacitySafe: boolean;
    isFrostDepthRespected: boolean;
    isStructurallySafe: boolean;
    safetyReasonFa: string;
    safetyReasonEn: string;
  },
  foundationType: string,
  inputHash: string,
  isStale: boolean = false
): StructuralSnapshot {
  const disclosures = getStructuralHonestyDisclosures();
  const isRooftopAnchor = foundationType === 'rooftop_anchor_bolted';
  const assessmentStatus: AssessmentStatus = isRooftopAnchor ? 'unassessed' : 'assessed';

  return {
    snapshotId: `SNAP-STR-${inputHash.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
    timestampMs: 0,
    inputHash,
    isAvailable: true,
    isStale,
    foundationType,
    foundationNameFa: result.foundationNameFa,
    foundationNameEn: result.foundationNameEn,
    bromsPileSection: result.bromsPileSection,
    totalTablesCount: result.totalTablesCount,
    totalPostsCount: result.totalPostsCount,
    postsPerTable: result.postsPerTable,
    tableAreaM2: result.tableAreaM2,
    qzPa: result.velocityWindPressureQzN_M2,
    qzKnM2: Number((result.velocityWindPressureQzN_M2 / 1000).toFixed(3)),
    deadLoadTableKn: result.deadLoadTableKn,
    windUpliftForceKn: result.windUpliftForceKn,
    windDownforceKn: result.windDownforceKn,
    windOverturningMomentKnM: result.windOverturningMomentKnM,
    snowLoadTableKn: result.snowLoadTableKn,
    lateralShearPerPostKn: result.lateralShearPerPostKn,
    upliftPerPostKn: result.upliftPerPostKn,
    compressionPerPostKn: result.compressionPerPostKn,
    recommendedDepthM: result.recommendedDepthM,
    minDepthForFrostM: result.minDepthForFrostM,
    frostDepthCm: result.frostDepthCm,
    appliedPostBearingPressureKpa: result.appliedPostBearingPressureKpa,
    allowableSoilBearingKpa: result.allowableSoilBearingKpa,
    upliftCapacityPerPostKn: result.upliftCapacityPerPostKn,
    concreteVolumeTotalM3: result.concreteVolumeTotalM3,
    steelRebarWeightTotalKg: result.steelRebarWeightTotalKg,
    governingLimit: 'governing_depth_verified',
    fosUplift: result.fosUplift,
    fosLateral: result.fosLateral,
    fosOverturning: result.fosOverturning,
    fosSliding: result.fosSliding,
    fosBearing: result.fosBearing,
    isBearingCapacitySafe: result.isBearingCapacitySafe,
    isFrostDepthRespected: result.isFrostDepthRespected,
    isStructurallySafe: isRooftopAnchor ? false : result.isStructurallySafe,
    isScreeningPreliminary: true,
    assessmentStatus,
    disclosures,
    safetyReasonFa: result.safetyReasonFa,
    safetyReasonEn: result.safetyReasonEn,
  };
}

export type StructuralSheetRow = [string, string | number, string, string];

/**
 * Generates official Excel export rows from a StructuralSnapshot.
 * Shared between OfficialReportModal and verify-phase07 harness to guarantee zero divergence.
 */
export function exportStructuralSheetRows(
  snapshot: StructuralSnapshot | null,
  isEn: boolean = false
): StructuralSheetRow[] {
  if (!snapshot || !snapshot.isAvailable) {
    return [
      ['STRUCTURAL SIZING & CIVIL FOUNDATIONS (ASCE 7-22 / INBC 6 / EUROCODE 7)', '', '', ''],
      ['Parameter', 'Calculated Value', 'Design Unit', 'Design Standard / Limit'],
      ['Structural Analysis Status', 'UNAVAILABLE', '-', 'Run calculation in Structural & Foundation Tab'],
      ['Velocity Wind Pressure (qz)', 'UNAVAILABLE', 'N/m²', 'ASCE 7-22 Eq. 26.10-1'],
      ['Wind Uplift Force per Table', 'UNAVAILABLE', 'kN', 'ASCE 7-22 §27.3 Net Uplift'],
      ['Wind Downforce per Table', 'UNAVAILABLE', 'kN', 'ASCE 7-22 §27.3 Net Downforce'],
      ['Overturning Moment per Table', 'UNAVAILABLE', 'kN·m', 'Derived arm (W/2 + h*sin beta)'],
      ['Factored Snow Load per Table', 'UNAVAILABLE', 'kN', 'INBC 6 / ASCE 7-22 §7.4'],
      ['Foundation Technology', 'UNAVAILABLE', '-', 'Eurocode 7 EN 1997-1'],
      ['Pile Profile Section', 'UNAVAILABLE', '-', 'Broms (1964) / ASTM A123'],
      ['Embedment Depth in Ground', 'UNAVAILABLE', 'm', 'Frost + Uplift + Lateral Governing'],
      ['Total Mounting Tables', 'UNAVAILABLE', 'tables', 'Plant-wide count'],
      ['Total Piles Count', 'UNAVAILABLE', 'posts', 'Plant-wide structural posts'],
      ['Applied Post Bearing Pressure', 'UNAVAILABLE', 'kPa', 'Allowable qa check'],
      ['Ultimate Skin-Friction Uplift (T_ult)', 'UNAVAILABLE', 'kN/post', 'Burland-Meyerhof Beta Method'],
      ['Uplift Safety Factor (FoS_uplift)', 'UNAVAILABLE', '-', 'Required >= 2.0 (Eurocode 7)'],
      ['Broms Lateral Safety Factor (FoS_lateral)', 'UNAVAILABLE', '-', 'Required >= 1.5 (Broms 1964)'],
      ['Overturning Safety Factor (FoS_overturning)', 'UNAVAILABLE', '-', 'Required >= 1.5 (ASCE 7-22)'],
      ['Structural Safety Compliance', 'UNAVAILABLE', '-', 'Recalculation in Structural Tab Required'],
    ];
  }

  if (snapshot.isStale) {
    return [
      ['STRUCTURAL SIZING & CIVIL FOUNDATIONS (ASCE 7-22 / INBC 6 / EUROCODE 7)', '', '', ''],
      ['Parameter', 'Calculated Value', 'Design Unit', 'Design Standard / Limit'],
      ['Structural Analysis Status', 'STALE — Inputs Modified', '-', 'Recalculation in Structural Tab Required'],
      ['Velocity Wind Pressure (qz)', snapshot.qzPa, 'N/m²', 'ASCE 7-22 Eq. 26.10-1 (STALE)'],
      ['Wind Uplift Force per Table', snapshot.windUpliftForceKn, 'kN', 'ASCE 7-22 §27.3 Net Uplift (STALE)'],
      ['Wind Downforce per Table', snapshot.windDownforceKn, 'kN', 'ASCE 7-22 §27.3 Net Downforce (STALE)'],
      ['Overturning Moment per Table', snapshot.windOverturningMomentKnM, 'kN·m', 'Derived arm (STALE)'],
      ['Factored Snow Load per Table', snapshot.snowLoadTableKn, 'kN', 'INBC 6 / ASCE 7-22 §7.4 (STALE)'],
      ['Foundation Technology', isEn ? snapshot.foundationNameEn : snapshot.foundationNameFa, '-', 'Eurocode 7 EN 1997-1'],
      ['Pile Profile Section', snapshot.bromsPileSection, '-', 'Broms (1964) / ASTM A123'],
      ['Embedment Depth in Ground', snapshot.recommendedDepthM, 'm', `L >= Frost Depth + 1.0m (${snapshot.minDepthForFrostM}m) (STALE)`],
      ['Total Mounting Tables', snapshot.totalTablesCount, 'tables', `${snapshot.postsPerTable} posts per table`],
      ['Total Piles Count', snapshot.totalPostsCount, 'posts', 'Plant-wide structural posts'],
      ['Applied Post Bearing Pressure', snapshot.appliedPostBearingPressureKpa, 'kPa', `Allowable qa = ${snapshot.allowableSoilBearingKpa} kPa`],
      ['Ultimate Skin-Friction Uplift (T_ult)', snapshot.upliftCapacityPerPostKn, 'kN/post', 'Burland-Meyerhof Beta Method'],
      ['Uplift Safety Factor (FoS_uplift)', snapshot.fosUplift, '-', 'Required >= 2.0 (Eurocode 7)'],
      ['Broms Lateral Safety Factor (FoS_lateral)', snapshot.fosLateral, '-', 'Required >= 1.5 (Broms 1964)'],
      ['Overturning Safety Factor (FoS_overturning)', snapshot.fosOverturning, '-', 'Required >= 1.5 (ASCE 7-22)'],
      ['Structural Safety Compliance', 'STALE — RECALCULATION REQUIRED', '-', 'Project parameters modified after calculation'],
    ];
  }

  const complianceStatus = snapshot.isStructurallySafe
    ? 'SCREENING PASS (Preliminary — Unassessed Modes Excluded)'
    : 'ACTION REQUIRED / UNASSESSED';

  const complianceStandard =
    'INBC 6 / ASCE 7-22 Preliminary Screening Only (Edge vortices & dynamic seismic unassessed)';

  return [
    ['STRUCTURAL SIZING & CIVIL FOUNDATIONS (ASCE 7-22 / INBC 6 / EUROCODE 7)', '', '', ''],
    ['Parameter', 'Calculated Value', 'Design Unit', 'Design Standard / Limit'],
    ['Structural Analysis Status', 'SYNCHRONIZED', '-', 'Live Structural Tab Snapshot'],
    ['Velocity Wind Pressure (qz)', snapshot.qzPa, 'N/m²', 'ASCE 7-22 Eq. 26.10-1'],
    ['Wind Uplift Force per Table', snapshot.windUpliftForceKn, 'kN', 'ASCE 7-22 §27.3 Net Uplift'],
    ['Wind Downforce per Table', snapshot.windDownforceKn, 'kN', 'ASCE 7-22 §27.3 Net Downforce'],
    ['Overturning Moment per Table', snapshot.windOverturningMomentKnM, 'kN·m', 'Derived arm (W/2 + h*sin beta)'],
    ['Factored Snow Load per Table', snapshot.snowLoadTableKn, 'kN', 'INBC 6 / ASCE 7-22 §7.4'],
    ['Foundation Technology', isEn ? snapshot.foundationNameEn : snapshot.foundationNameFa, '-', 'Eurocode 7 EN 1997-1'],
    ['Pile Profile Section', snapshot.bromsPileSection, '-', 'Broms (1964) / ASTM A123'],
    ['Embedment Depth in Ground', snapshot.recommendedDepthM, 'm', `L >= Frost Depth + 1.0m (${snapshot.minDepthForFrostM}m)`],
    ['Total Mounting Tables', snapshot.totalTablesCount, 'tables', `${snapshot.postsPerTable} posts per table`],
    ['Total Piles Count', snapshot.totalPostsCount, 'posts', 'Plant-wide structural posts'],
    ['Applied Post Bearing Pressure', snapshot.appliedPostBearingPressureKpa, 'kPa', `Allowable qa = ${snapshot.allowableSoilBearingKpa} kPa`],
    ['Ultimate Skin-Friction Uplift (T_ult)', snapshot.upliftCapacityPerPostKn, 'kN/post', 'Burland-Meyerhof Beta Method'],
    ['Uplift Safety Factor (FoS_uplift)', snapshot.fosUplift, '-', 'Required >= 2.0 (Eurocode 7)'],
    ['Broms Lateral Safety Factor (FoS_lateral)', snapshot.fosLateral, '-', 'Required >= 1.5 (Broms 1964)'],
    ['Overturning Safety Factor (FoS_overturning)', snapshot.fosOverturning, '-', 'Required >= 1.5 (ASCE 7-22)'],
    ['Structural Safety Compliance', complianceStatus, '-', complianceStandard],
  ];
}
