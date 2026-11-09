// Structural Mounting & Civil Foundation Engineering Engine
// Conforming to ASCE 7-22, Iranian National Building Code Part 6 (مبحث ۶ مقررات ملی ساختمان), and ACI 318

import {
  calculateBromsPileSizing,
  calculateRequiredEmbedmentForUplift,
  type BromsPileSizingResult,
} from './geotech/bromsMethod';
import {
  calculateUnifiedWindPressureQz,
  calculateUnifiedKz,
  calculateUnifiedLateralShearPerPost,
  calculateUnifiedTableLoadsAndReactions,
  calculateGoverningPileDepth,
} from './core/structuralContract';

export type FoundationType =
  | 'rammed_steel_pile'          // پایه‌های کوبشی فولادی C شکل (نیروگاه‌های مقیاس مگاواتی - کوبش مستقیم در خاک)
  | 'pre_drilled_grouted_pile'   // شمع در گمانه پیش‌حفاری با تزریق گروت پرمقاومت (راهکار کاهش عمق در سنگ بستر و خاک سخت)
  | 'surface_ballasted_block'    // بلوک‌های بتنی مسلح سطحی زمینی (بدون نفوذ در خاک - ویژه زمین‌های سنگی/مانع‌دار)
  | 'concrete_pier'              // پایه‌های بتنی درجا (خاک‌های سنگی و سخت)
  | 'ground_screw'               // شمع‌های پیچشی فولادی
  | 'rooftop_ballasted_block'    // بلوک‌های بتنی وزنی پشت‌بام بدون نفوذ در ایزوگام
  | 'shed_roof_clamp_rail'       // اتصال کلمپ و ریل مستقیم به سقف سوله صنعتی (ورق ذوزنقه‌ای / ساندویچ پانل / Standing Seam)
  | 'rooftop_anchor_bolted';     // پایه‌های مهارشده با انکربولت در دال بتنی سقف ساختمان (آب‌بندی شده)

export type SoilType =
  | 'dense_sand_gravel' // شن و ماسه متراکم (اصطکاک بالا)
  | 'medium_clay'       // رس متوسط تا سخت
  | 'loose_sand'        // ماسه سست
  | 'rocky_limestone';  // بستر سنگ آهکی یا کوهستانی

/**
 * Estimate ultimate uplift (tension) capacity per driven pile or rock socket.
 *  - Pre-drilled rock socket micro-pile: grout-to-rock interface bond (FHWA-NHI-05-039 / Eurocode 7):
 *      T_ult = pi * D_hole * L * tau_bond
 *  - Cohesionless: beta method (Burland 1973 / Meyerhof 1976):
 *      T_ult = beta * sigma'_v,avg * perimeter * L
 *      beta = 0.3 (loose) / 0.4 (medium) / 0.5 (dense)
 *  - Cohesive (undrained, alpha method, FHWA-NHI-16-009 §10.2):
 *      T_ult = alpha * su * perimeter * L
 *      alpha = 0.5 for su < 50 kPa, 0.35 for su >= 50 kPa
 */
function estimatePileUpliftCapacityKn(
  soilType: SoilType,
  embedmentM: number,
  diameterM: number,
  cohesionKpa: number,
  densityKnM3: number,
  foundationType?: FoundationType,
): number {
  if (foundationType === 'pre_drilled_grouted_pile') {
    // Rock-socket grout bond pullout capacity per FHWA-NHI-05-039 / Eurocode 7 (EN 1997-1)
    // tau_bond (grout to rock/hardpan interface):
    //   rocky_limestone: 1500 kPa (1.5 MPa)
    //   dense_sand_gravel / caliche: 550 kPa
    //   medium_clay: 300 kPa
    //   loose_sand: 200 kPa
    const tauBondKpa =
      soilType === 'rocky_limestone' ? 1500
      : soilType === 'dense_sand_gravel' ? 550
      : soilType === 'medium_clay' ? 300
      : 200;
    const holeDiaM = Math.max(0.12, diameterM); // 120 mm standard DTH rock borehole
    const bondAreaM2 = Math.PI * holeDiaM * embedmentM;
    return Number((bondAreaM2 * tauBondKpa).toFixed(1));
  }
  if (foundationType === 'surface_ballasted_block' || foundationType === 'rooftop_ballasted_block') {
    // Ballast block uplift resistance is governed by self-weight gravity,
    // returned here as base reference capacity
    return 20.0;
  }
  if (foundationType === 'shed_roof_clamp_rail') {
    // Clamps & purlin fasteners mechanical tensile capacity per post (FoS >= 2.5)
    return 120.0;
  }
  if (foundationType === 'rooftop_anchor_bolted') {
    // 4x M12 chemical anchors in reinforced concrete slab per post
    return 60.0;
  }
  const perimeterM = Math.PI * diameterM;
  if (soilType === 'medium_clay') {
    const su = Math.max(25, cohesionKpa);
    const alpha = su < 50 ? 0.5 : 0.35;
    return alpha * su * perimeterM * embedmentM;
  }
  const beta =
    soilType === 'dense_sand_gravel' ? 0.5
    : soilType === 'loose_sand' ? 0.3
    : 0.4;
  const sigmaVAvg = Math.max(5, (densityKnM3 * embedmentM) / 2);
  return beta * sigmaVAvg * perimeterM * embedmentM;
}

export interface StructuralParametersInput {
  totalModulesCount: number;
  moduleLengthM: number;       // e.g. 2.278 m
  moduleWidthM: number;        // e.g. 1.134 m
  moduleWeightKg: number;      // e.g. 28.5 kg
  tablesCount: number;         // e.g. modules per table / string
  modulesPerTable: number;     // e.g. 28 modules per table (2x14 configuration)
  arrayTiltDeg: number;        // e.g. 25-30 deg
  groundClearanceM: number;    // e.g. 0.8-1.2 m
  basicWindSpeedKmh: number;   // e.g. 120 km/h (33.3 m/s)
  groundSnowLoadKgM2: number;  // e.g. 50 kg/m²
  foundationType: FoundationType;
  soilType: SoilType;
  // Geotechnical and environmental parameters
  soilBearingCapacityKpa?: number;
  soilInternalFrictionAngleDeg?: number;
  soilCohesionKpa?: number;
  soilDensityKnM3?: number;
  annualRainfallMm?: number;
  frostDepthCm?: number;
  seismicZoneCoefficientA?: number;
  exposureCategory?: ExposureCategory;
  structureHeightM?: number;
  topographicFactorKzt?: number;
  windDirectionalityKd?: number;
  /** Optional override for pile skin-friction uplift capacity per post (kN).
   *  When absent, the engine estimates via the beta/alpha method below. */
  pileUpliftCapacityPerPostKn?: number;
  elevationM?: number;
  /** Optional custom embedment depth override (meters). When absent, sized via Broms (1964) lateral capacity. */
  customEmbedmentDepthM?: number;
  /** Optional custom posts per table count (e.g. 2, 4, 6, 8 posts). */
  customPostsPerTable?: number;
  /** Optional custom concrete ballast mass override (kg) for rooftop ballasted systems. */
  customBallastWeightKgPerTable?: number;
}

/**
 * ASCE 7-22 Eq. 26.10-1 velocity pressure q_z (Pa).
 * SINGLE source of truth for wind pressure across structuralEngine and
 * foundationRecommendation. Do NOT duplicate the formula elsewhere.
 */
export interface WindPressureResult {
  qzN_M2: number;
  qzKnM2: number;
  vMs: number;
  kz: number;
  kzt: number;
  kd: number;
  ke: number;
}

export type ExposureCategory = 'B' | 'C' | 'D';

/**
 * Calculates ASCE 7-22 Table 26.10-1 velocity pressure exposure coefficient Kz
 * as a function of exposure category (B, C, D) and structure height z (m).
 */
export function calculateKz(
  exposure: ExposureCategory = 'C',
  heightM?: number
): number {
  return calculateUnifiedKz(exposure, heightM);
}

/** Net uplift pressure coefficient for a tilted PV table:
 *  - Ground-mount: ASCE 7-22 §29.4.3 / SEAOC PV2-2017 §4.3
 *  - Rooftop: ASCE 7-22 §29.4.4 / Ch 30 (edge vortices & roof separation GC_rn) */
export function cpUpliftFor(tiltDeg: number, isRooftop: boolean = false): number {
  if (isRooftop) {
    return 1.45 + 0.015 * tiltDeg;
  }
  return 1.30 + 0.012 * tiltDeg;
}

/** Net downward pressure coefficient (wind on front of panel). */
export function cpDownforceFor(tiltDeg: number, isRooftop: boolean = false): number {
  if (isRooftop) {
    return 1.10 + 0.012 * tiltDeg;
  }
  return 0.95 + 0.01 * tiltDeg;
}

export function calculateWindPressureQz(
  basicWindSpeedKmh: number,
  elevationM: number = 0,
  exposureCategory: ExposureCategory = 'C',
  structureHeightM?: number,
  topographicFactorKzt: number = 1.0,
  windDirectionalityKd: number = 0.85
): WindPressureResult {
  return calculateUnifiedWindPressureQz({
    basicWindSpeedKmh,
    elevationM,
    exposureCategory,
    structureHeightM,
    topographicFactorKzt,
    windDirectionalityKd,
  });
}

export interface StructuralRemedialGuidance {
  isCritical: boolean;
  isWarning: boolean;
  governingFailureMode: 'uplift_tension' | 'overturning_moment' | 'sliding' | 'bearing_capacity' | 'none';
  governingFos: number;
  requiredFos: number;
  targetEmbedmentDepthM: number;
  targetPostsPerTable: number;
  targetBallastKgPerTable: number;
  actionsEn: string[];
  actionsFa: string[];
}

export interface StructuralAnalysisResult {
  tableAreaM2: number;
  tableSlopedWidthM: number;
  totalArrayAreaM2: number;
  tableLengthM: number;
  tableHeightM: number;
  totalTablesCount: number;
  modulesPerTable?: number;

  // Loads per Table (ASCE 7 & Iranian Code Part 6)
  deadLoadTableKg: number;
  deadLoadTableKn: number;
  velocityWindPressureQzN_M2: number;
  windUpliftForceKn: number;
  windDownforceKn: number;
  windOverturningMomentKnM: number;
  snowLoadTableKn: number;

  // Foundation Sizing per Table (typically 4 or 6 piles/piers per table)
  postsPerTable: number;
  totalPostsCount: number;
  upliftPerPostKn: number;
  compressionPerPostKn: number;
  lateralShearPerPostKn: number;

  // Foundation Specifications
  foundationNameFa: string;
  foundationNameEn: string;
  recommendedDepthM: number;
  foundationDimensionsDesc: string;
  foundationDimensionsDescEn: string;

  // Geotechnical Checks
  allowableSoilBearingKpa: number;
  appliedPostBearingPressureKpa: number;
  isBearingCapacitySafe: boolean;
  frostDepthCm: number;
  isFrostDepthRespected: boolean;

  // Civil Bill of Materials (BOM)
  concreteVolumeTotalM3: number;
  steelRebarWeightTotalKg: number;
  structuralSteelRackingWeightKg: number;
  cementBagsCount: number;
  sandGravelTon: number;

  // Safety Verification
  fosOverturning: number;
  fosSliding: number;
  /**
   * True when `fosSliding` is a physically meaningful safety factor
   * (friction-governed base, i.e. `rooftop_ballasted_block`).
   * False for `rammed_steel_pile`, `concrete_pier`, `ground_screw` - these
   * rely on soil lateral resistance, not base friction. For those types,
   * use the Broms FoS from the foundation recommendation.
   */
  fosSlidingApplicable: boolean;
  /** Per-post uplift safety factor (T_ult / F_uplift_per_post).
   *  Only meaningful for pile / pier / screw foundations. */
  fosUplift: number;
  /** Uplift capacity used (kN per post) - surfaced for transparency. */
  upliftCapacityPerPostKn: number;
  /** Broms lateral soil resistance factor of safety (H_ult / H_applied). */
  fosLateral: number;
  /** Soil bearing capacity factor of safety (q_allow / q_applied). */
  fosBearing: number;
  /** Overturning FoS including pile tensile anchoring resistance. */
  fosOverturningAnchored: number;
  /** Broms selected structural pile profile (e.g. W6x9, W6x12, C150x50x2.5). */
  bromsPileSection: string;
  /** Minimum embedment depth required to protect against frost heave (frostDepth + 1.0m). */
  minDepthForFrostM: number;
  isStructurallySafe: boolean;
  /** Flags that structural check is a preliminary engineering screening without site-specific structural drawings. */
  isScreeningPreliminary: boolean;
  screeningDisclaimerFa: string;
  screeningDisclaimerEn: string;
  /** Human-readable reason the design is or isn't safe, per foundation type. */
  safetyReasonEn: string;
  safetyReasonFa: string;
  engineeringRemarksFa: string;
  engineeringRemarksEn: string;
  /** Clear actionable guidance for the user when FoS is warning or critical. */
  remedialGuidance: StructuralRemedialGuidance;
}

export function calculateStructuralAndFoundations(
  input: StructuralParametersInput
): StructuralAnalysisResult {
  const {
    totalModulesCount,
    moduleLengthM,
    moduleWidthM,
    moduleWeightKg,
    modulesPerTable,
    arrayTiltDeg,
    groundClearanceM,
    basicWindSpeedKmh,
    groundSnowLoadKgM2,
    foundationType,
    soilType,
  } = input;

  const isRooftop =
    foundationType === 'rooftop_ballasted_block' ||
    foundationType === 'rooftop_anchor_bolted' ||
    foundationType === 'shed_roof_clamp_rail';

  const tiltRad = (arrayTiltDeg * Math.PI) / 180.0;

  // Standard 2P (2 Portrait) table configuration
  // Table width = 2 modules in portrait, Table length = (modulesPerTable / 2) * moduleWidth
  const tableLengthM = (modulesPerTable / 2.0) * (moduleWidthM + 0.02);
  const tableSlopedWidthM = 2.0 * moduleLengthM + 0.05;
  const tableAreaM2 = Number((tableLengthM * tableSlopedWidthM).toFixed(2));

  const totalTablesCount = Math.ceil(totalModulesCount / modulesPerTable);
  const totalArrayAreaM2 = tableAreaM2 * totalTablesCount;

  // Mean height of the table above ground / roof
  const tableMeanHeightM = groundClearanceM + (tableSlopedWidthM * Math.sin(tiltRad)) / 2.0;

  const windPressure = calculateWindPressureQz(
    basicWindSpeedKmh,
    input.elevationM ?? 0,
    input.exposureCategory ?? 'C',
    input.structureHeightM,
    input.topographicFactorKzt ?? 1.0,
    input.windDirectionalityKd ?? 0.85
  );
  const windSpeedMs = windPressure.vMs;

  // 1. Dead Load Calculation
  // 2. Dead Load Calculation
  const moduleTotalWeightPerTable = modulesPerTable * moduleWeightKg;
  const rackingWeightPerTable = tableAreaM2 * 14.5; // kg of galvanized steel/aluminum
  const deadLoadTableKg = moduleTotalWeightPerTable + rackingWeightPerTable;
  const deadLoadTableKn = (deadLoadTableKg * 9.81) / 1000.0;

  // q_z from the shared calculateWindPressureQz helper (single source).
  const velocityWindPressureQzN_M2 = windPressure.qzN_M2;

  // 3. Foundation Sizing per Table
  // Typically 4 posts per table (for 2P14 = 28 modules) or 6 posts for larger tables
  const postsPerTable = input.customPostsPerTable ?? (modulesPerTable > 20 ? 4 : 2);
  const totalPostsCount = totalTablesCount * postsPerTable;

  // 4. Wind & Snow Loads and Post Reaction Forces via unified structural contract
  const tableLoads = calculateUnifiedTableLoadsAndReactions({
    qzN_M2: velocityWindPressureQzN_M2,
    groundSnowLoadKgM2,
    tableAreaM2,
    tableSlopedWidthM,
    groundClearanceM,
    arrayTiltDeg,
    deadLoadTableKn,
    postsPerTable,
    isRooftop,
  });

  const windUpliftForceKn = tableLoads.windUpliftForceKn;
  const windDownforceKn = tableLoads.windDownforceKn;
  const windOverturningMomentKnM = tableLoads.windOverturningMomentKnM;
  const snowLoadTableKn = tableLoads.snowLoadTableKn;
  const upliftPerPostKn = tableLoads.upliftPerPostKn;
  const compressionPerPostKn = tableLoads.compressionPerPostKn;
  const lateralShearPerPostKn = tableLoads.lateralShearPerPostKn;

  // 5. Foundation Geometry & Soil Mechanics (Broms 1964 Lateral Equilibrium)
  const allowableSoilBearingKpa = input.soilBearingCapacityKpa || (soilType === 'dense_sand_gravel' ? 250 : soilType === 'medium_clay' ? 180 : soilType === 'loose_sand' ? 140 : 350);
  const hasFrostData = input.frostDepthCm !== undefined && input.frostDepthCm !== null;
  const siteFrostDepthCm = hasFrostData ? input.frostDepthCm! : 0;
  const siteFrostDepthM = siteFrostDepthCm / 100.0;
  const soilFrictionAngleDeg = input.soilInternalFrictionAngleDeg ?? (soilType === 'dense_sand_gravel' ? 34 : soilType === 'loose_sand' ? 28 : soilType === 'rocky_limestone' ? 38 : 24);
  const soilCohesionKpa = input.soilCohesionKpa ?? (soilType === 'medium_clay' ? 35 : 10);
  const soilDensityKnM3 = input.soilDensityKnM3 ?? 18.0;

  // Broms lateral pile capacity single-source calculation
  const bromsResult = calculateBromsPileSizing(
    lateralShearPerPostKn,
    groundClearanceM,
    hasFrostData ? siteFrostDepthM : 0.30,
    soilType,
    allowableSoilBearingKpa,
    soilFrictionAngleDeg,
    soilCohesionKpa,
    soilDensityKnM3
  );

  let recommendedDepthM = 1.6;
  let foundationNameFa = 'پایه کوبشی فولادی C شکل (Rammed Steel C-Pile)';
  let foundationNameEn = 'Rammed Galvanized Steel C-Pile (Direct Driving)';
  let foundationDimensionsDesc = 'پروفیل فولادی C120×50×20×3.5 mm، عمق نفوذ ۱.۶ متر';
  let foundationDimensionsDescEn = 'C120x50x20x3.5mm galvanized steel profile, 1.6m embedment depth';
  let concreteVolumeTotalM3 = 0;
  let steelRebarWeightTotalKg = 0;
  let ballastKgPerTable = 0;

  if (foundationType === 'rammed_steel_pile') {
    if (input.customEmbedmentDepthM !== undefined && input.customEmbedmentDepthM > 0) {
      recommendedDepthM = Number(input.customEmbedmentDepthM.toFixed(2));
    } else if (input.frostDepthCm !== undefined) {
      const reqUpliftDepthM = calculateRequiredEmbedmentForUplift(
        upliftPerPostKn,
        soilType,
        0.15,
        soilCohesionKpa,
        soilDensityKnM3,
        siteFrostDepthM,
        2.0
      );
      const governingDepthCalc = calculateGoverningPileDepth({
        lateralDepthM: bromsResult.lateralDepthM ?? bromsResult.embedmentDepthM,
        frostDepthM: siteFrostDepthM,
        upliftRequiredDepthM: reqUpliftDepthM,
      });
      recommendedDepthM = governingDepthCalc.effectiveRecommendedDepthM;
    } else {
      recommendedDepthM = bromsResult.embedmentDepthM;
    }
    foundationNameFa = 'پایه کوبشی فولادی C شکل گالوانیزه گرم';
    foundationNameEn = 'Hot-Dip Galvanized Rammed Steel C-Pile';
    foundationDimensionsDesc = `پروفیل فولادی ${bromsResult.pileSection} (یا C120×50×25×3.5mm)، عمق کوبش در خاک: ${recommendedDepthM} متر (بدون بتن‌ریزی)`;
    foundationDimensionsDescEn = `${bromsResult.pileSection} steel post, direct ramming depth: ${recommendedDepthM} m (concrete-free)`;
    concreteVolumeTotalM3 = 0;
    steelRebarWeightTotalKg = 0;
  } else if (foundationType === 'pre_drilled_grouted_pile') {
    // Pre-drilled rock-socket grouted micro-pile: eliminates deep pile refusal in shallow rock,
    // caliche or cemented gravel by drilling a compact 120mm hole into rock and grouting
    // with 35MPa non-shrink cementitious grout (FHWA-NHI-05-039).
    const isCompetentBedrock = soilType === 'rocky_limestone';
    if (isCompetentBedrock) {
      // In competent bedrock, embedment depth is governed by rock socket bond length (0.75m - 1.05m),
      // immune to soil frost heave jacking.
      const baseRockSocketM = Math.max(0.70, Number((siteFrostDepthM + 0.15).toFixed(2)));
      recommendedDepthM = input.customEmbedmentDepthM !== undefined && input.customEmbedmentDepthM > 0
        ? Number(input.customEmbedmentDepthM.toFixed(2))
        : Number(Math.min(1.05, Math.max(0.75, baseRockSocketM)).toFixed(2));
    } else {
      // In soil (sand, gravel, clay), pile must penetrate below frost heave depth unless verified by borehole
      const reqGroutedUpliftM = calculateRequiredEmbedmentForUplift(
        upliftPerPostKn,
        soilType,
        0.15,
        soilCohesionKpa,
        soilDensityKnM3,
        siteFrostDepthM,
        2.0
      );
      const minGroutedFrostM = hasFrostData ? bromsResult.minDepthForFrostM : 1.20;
      const autoGroutedDepthM = Math.max(minGroutedFrostM, reqGroutedUpliftM * 0.5, 0.80);
      recommendedDepthM = input.customEmbedmentDepthM !== undefined && input.customEmbedmentDepthM > 0
        ? Number(input.customEmbedmentDepthM.toFixed(2))
        : Number(autoGroutedDepthM.toFixed(2));
    }
    const drillDiaM = 0.12; // 120mm DTH drill diameter
    const volPerHoleM3 = Math.PI * Math.pow(drillDiaM / 2.0, 2) * recommendedDepthM;
    concreteVolumeTotalM3 = Number((volPerHoleM3 * totalPostsCount).toFixed(2));
    steelRebarWeightTotalKg = Number((totalPostsCount * 4.0).toFixed(0)); // steel post acts as core + centralizer spacers
    foundationNameFa = 'شمع در گمانه پیش‌حفاری با تزریق گروت پرمقاومت (Pre-Drilled Grouted Rock Socket)';
    foundationNameEn = 'Pre-Drilled Rock-Socket Grouted Micro-Pile (Drill & Grout)';
    foundationDimensionsDesc = `گمانه پیش‌حفاری ۱۲۰mm به عمق ${recommendedDepthM} متر در سنگ بستر/کالیچ + پروفیل گالوانیزه و تزریق گروت ۳۵MPa`;
    foundationDimensionsDescEn = `Pre-drilled 120mm borehole, ${recommendedDepthM}m rock embedment with 35MPa non-shrink grout encasement`;
  } else if (foundationType === 'surface_ballasted_block') {
    // Ground-mounted surface precast concrete ballast block (Zero ground penetration / refusal mitigation)
    recommendedDepthM = 0.20; // 20cm surface pad depth
    const reqBallastUpliftKg = Math.max(350, ((windUpliftForceKn * 1000) / 9.81) * 1.5 - deadLoadTableKg);
    const reqBallastSlidingKg = Math.max(300, ((lateralShearPerPostKn * postsPerTable * 1000 * 1.5) / (9.81 * 0.50)) - deadLoadTableKg);
    const armCos = Math.max(0.1, (tableSlopedWidthM / 2.0) * Math.cos(tiltRad));
    const reqBallastOverturningKg = Math.max(350, ((windOverturningMomentKnM * 1.5 * 1000) / (9.81 * armCos)) - deadLoadTableKg);
    const baseBallastKg = Math.round(Math.max(reqBallastUpliftKg, reqBallastSlidingKg, reqBallastOverturningKg));
    ballastKgPerTable = input.customBallastWeightKgPerTable !== undefined && input.customBallastWeightKgPerTable > 0
      ? input.customBallastWeightKgPerTable
      : baseBallastKg;
    const volPerTableM3 = ballastKgPerTable / 2400.0;
    concreteVolumeTotalM3 = Number((volPerTableM3 * totalTablesCount).toFixed(1));
    steelRebarWeightTotalKg = Number((concreteVolumeTotalM3 * 25.0).toFixed(0)); // 25 kg/m3 light rebar cage
    foundationNameFa = 'بلوک‌های بتنی مسلح پیش‌ساخته سطحی زمینی (Ground Surface Ballast Blocks)';
    foundationNameEn = 'Ground-Mounted Precast Reinforced Concrete Ballast Blocks (Zero Penetration)';
    foundationDimensionsDesc = `بلوک‌های بتنی مسلح سطحی با وزن ${Math.round(ballastKgPerTable)} کیلوگرم در هر میز (${Math.round(ballastKgPerTable / postsPerTable)} kg/پایه)، بدون نفوذ در زمین`;
    foundationDimensionsDescEn = `Surface precast concrete ballast blocks (${Math.round(ballastKgPerTable)} kg/table, ${Math.round(ballastKgPerTable / postsPerTable)} kg/post), zero penetration`;
  } else if (foundationType === 'concrete_pier') {
    recommendedDepthM = input.customEmbedmentDepthM !== undefined && input.customEmbedmentDepthM > 0
      ? Number(input.customEmbedmentDepthM.toFixed(2))
      : Number(Math.max(siteFrostDepthM + 0.3, bromsResult.embedmentDepthM * 0.85).toFixed(2));
    const pierDiameterM = 0.40;
    const volPerPierM3 = Math.PI * Math.pow(pierDiameterM / 2.0, 2) * recommendedDepthM;
    concreteVolumeTotalM3 = Number((volPerPierM3 * totalPostsCount).toFixed(1));
    steelRebarWeightTotalKg = Number((totalPostsCount * 22.0).toFixed(0)); // 22 kg rebar cage per pier
    foundationNameFa = 'فونداسیون استوانه‌ای بتن درجا (Cast-in-Place Concrete Pier)';
    foundationNameEn = 'Cast-in-Place Reinforced Concrete Pier';
    foundationDimensionsDesc = `پایه بتنی مسلح قطر ۴۰ سانتی‌متر، عمق: ${recommendedDepthM} متر با انکربولت‌های M20 گالوانیزه`;
    foundationDimensionsDescEn = `Reinforced concrete cylinder dia 40cm, depth: ${recommendedDepthM} m with M20 HDG anchor bolts`;
  } else if (foundationType === 'ground_screw') {
    if (input.customEmbedmentDepthM !== undefined && input.customEmbedmentDepthM > 0) {
      recommendedDepthM = Number(input.customEmbedmentDepthM.toFixed(2));
    } else if (input.frostDepthCm !== undefined) {
      const reqUpliftDepthM = calculateRequiredEmbedmentForUplift(
        upliftPerPostKn,
        soilType,
        0.076,
        soilCohesionKpa,
        soilDensityKnM3,
        siteFrostDepthM,
        2.0
      );
      const governingDepthCalc = calculateGoverningPileDepth({
        lateralDepthM: bromsResult.lateralDepthM ?? bromsResult.embedmentDepthM,
        frostDepthM: siteFrostDepthM,
        upliftRequiredDepthM: reqUpliftDepthM,
      });
      recommendedDepthM = governingDepthCalc.effectiveRecommendedDepthM;
    } else {
      recommendedDepthM = Number(Math.max(siteFrostDepthM + 0.5, bromsResult.embedmentDepthM * 0.95).toFixed(2));
    }
    foundationNameFa = 'شمع‌های پیچشی فولادی (Ground Screws)';
    foundationNameEn = 'Galvanized Continuous Ground Screw';
    foundationDimensionsDesc = `شمع پیچشی گالوانیزه قطر ۷۶mm، طول رزوه ۱۲۰۰mm، عمق نفوذ: ${recommendedDepthM} متر`;
    foundationDimensionsDescEn = `Continuous helical ground screw dia 76mm, flight 1200mm, depth: ${recommendedDepthM} m`;
    concreteVolumeTotalM3 = 0;
    steelRebarWeightTotalKg = 0;
  } else if (foundationType === 'shed_roof_clamp_rail') {
    // Industrial metal shed roof: direct clamp and mini-rail installation
    // Zero ground embedment, zero concrete, ultra-lightweight aluminum framing
    recommendedDepthM = 0.0;
    concreteVolumeTotalM3 = 0;
    steelRebarWeightTotalKg = 0;
    ballastKgPerTable = 0;
    foundationNameFa = 'اتصال کلمپ و ریل مستقیم به سقف سوله (Industrial Metal Shed Clamp & Rail)';
    foundationNameEn = 'Industrial Shed Roof Clamp & Rail Mounting System';
    foundationDimensionsDesc = 'کلمپ‌های آلومینیومی آنودایز شده و مینی‌ریل روی گام ورق سوله/ساندویچ‌پانل با واشر آب‌بندی EPDM و پیچ‌های خودکار به پرلین‌ها (عمق کوبش در خاک: ۰.۰ متر - بدون بتن‌ریزی)';
    foundationDimensionsDescEn = 'Anodized aluminum clamps and mini-rails fastened to shed purlins with EPDM gaskets (0.0m soil driving - zero concrete)';
  } else if (foundationType === 'rooftop_anchor_bolted') {
    // Flat concrete building rooftop: HDG stanchions with M12 chemical anchors into concrete slab
    recommendedDepthM = 0.10; // 10cm slab anchor depth, zero soil penetration
    concreteVolumeTotalM3 = 0;
    steelRebarWeightTotalKg = 0;
    ballastKgPerTable = 0;
    foundationNameFa = 'پایه‌های مهارشده با انکربولت در دال بتنی سقف (Rooftop Chemically Anchored Stanchions)';
    foundationNameEn = 'Rooftop Chemically Anchored Stanchions on Concrete Slab';
    foundationDimensionsDesc = 'پایه‌های فولادی گالوانیزه مهارشده با انکربولت M12 و چسب کاشت شیمیایی در دال بتنی سقف به عمق ۱۰ سانتی‌متر همراه با عایق‌بندی قیری/پلی‌یورتان (عمق کوبش در خاک: ۰.۰ متر)';
    foundationDimensionsDescEn = 'HDG steel stanchions with M12 chemical anchors embedded 10cm into roof slab with waterproofing (zero soil driving)';
  } else {
    // Rooftop ballasted block (non-penetrating)
    recommendedDepthM = 0.0; // 0.0m ground embedment (non-penetrating surface ballast)
    const reqBallastUpliftKg = Math.max(350, ((windUpliftForceKn * 1000) / 9.81) * 1.5 - deadLoadTableKg);
    const reqBallastSlidingKg = Math.max(300, ((lateralShearPerPostKn * postsPerTable * 1000 * 1.4) / (9.81 * 0.55)) - deadLoadTableKg);
    const armCos = Math.max(0.1, (tableSlopedWidthM / 2.0) * Math.cos(tiltRad));
    const reqBallastOverturningKg = Math.max(350, ((windOverturningMomentKnM * 1.5 * 1000) / (9.81 * armCos)) - deadLoadTableKg);
    const baseBallastKg = Math.round(Math.max(reqBallastUpliftKg, reqBallastSlidingKg, reqBallastOverturningKg));
    ballastKgPerTable = input.customBallastWeightKgPerTable !== undefined && input.customBallastWeightKgPerTable > 0
      ? input.customBallastWeightKgPerTable
      : baseBallastKg;
    const volPerTableM3 = ballastKgPerTable / 2400.0; // concrete density 2400 kg/m³
    concreteVolumeTotalM3 = Number((volPerTableM3 * totalTablesCount).toFixed(1));
    foundationNameFa = 'بلوک‌های بتنی وزنی پیش‌ساخته پشت‌بام (Ballasted Rooftop Blocks)';
    foundationNameEn = 'Precast Concrete Ballast Blocks (Non-Penetrating)';
    foundationDimensionsDesc = `بلوک‌های بتنی پیش‌ساخته با وزن ${Math.round(ballastKgPerTable)} کیلوگرم به ازای هر استراکچر (عمق کوبش در خاک: ۰.۰ متر - غیرنفوذی روی پد EPDM)`;
    foundationDimensionsDescEn = `Precast concrete blocks weighing ${Math.round(ballastKgPerTable)} kg per mounting table (0.0m soil driving - EPDM pads)`;
  }

  // Cement and sand breakdown
  const cementBagsCount = foundationType === 'pre_drilled_grouted_pile'
    ? Math.round(concreteVolumeTotalM3 * 9.0) // high-strength non-shrink grout (450 kg/m3 cement)
    : Math.round(concreteVolumeTotalM3 * 7.0); // 7 bags per m³ of C25 concrete
  const sandGravelTon = foundationType === 'pre_drilled_grouted_pile'
    ? Number((concreteVolumeTotalM3 * 1.35).toFixed(1)) // silica sand for grout
    : Number((concreteVolumeTotalM3 * 1.85).toFixed(1));
  const structuralSteelRackingWeightKg = Number((rackingWeightPerTable * totalTablesCount).toFixed(0));

  // Geotechnical Checks
  const footingFootprintM2 =
    foundationType === 'concrete_pier' ? (Math.PI * 0.2 * 0.2)
    : foundationType === 'rooftop_ballasted_block' ? 0.8
    : foundationType === 'surface_ballasted_block' ? 0.35
    : foundationType === 'rooftop_anchor_bolted' ? 0.25
    : foundationType === 'shed_roof_clamp_rail' ? 0.15
    : 0.15;
  const appliedPostBearingPressureKpa = Number((compressionPerPostKn / footingFootprintM2).toFixed(1));
  const isBearingCapacitySafe = appliedPostBearingPressureKpa <= allowableSoilBearingKpa;

  const isRooftopOrShed =
    foundationType === 'shed_roof_clamp_rail' ||
    foundationType === 'rooftop_anchor_bolted' ||
    foundationType === 'rooftop_ballasted_block' ||
    foundationType === 'surface_ballasted_block';
  const isCompetentBedrock = soilType === 'rocky_limestone';
  const isFrostDepthImmune = isRooftopOrShed || isCompetentBedrock;
  const isFrostDepthRespected = isFrostDepthImmune ? true : hasFrostData ? recommendedDepthM >= bromsResult.minDepthForFrostM : false;

  // 6. Factors of Safety (FoS)
  const isBallasted = foundationType === 'rooftop_ballasted_block' || foundationType === 'surface_ballasted_block';
  const effectiveNormalLoadKn = isBallasted
    ? deadLoadTableKn + ((ballastKgPerTable * 9.81) / 1000.0)
    : deadLoadTableKn;
  const stabilizingMoment = (effectiveNormalLoadKn * (tableSlopedWidthM / 2.0)) * Math.cos(tiltRad);
  const fosOverturning = Number((stabilizingMoment / Math.max(0.1, windOverturningMomentKnM)).toFixed(2));
  // fosSliding uses base friction - meaningful ONLY for ballasted blocks
  const frictionMu = foundationType === 'surface_ballasted_block' ? 0.50 : 0.55;
  const fosSliding = Number((((effectiveNormalLoadKn * frictionMu) / Math.max(0.1, lateralShearPerPostKn * postsPerTable))).toFixed(2));
  const fosSlidingApplicable = isBallasted;

  // Pile uplift (tension) capacity per post, after recommendedDepthM is final.
  const upliftCapacityPerPostKn =
    input.pileUpliftCapacityPerPostKn
    ?? estimatePileUpliftCapacityKn(
         soilType, recommendedDepthM, 0.15,
         input.soilCohesionKpa ?? 10, input.soilDensityKnM3 ?? 18.0,
         foundationType,
       );

  const fosUplift = Number(
    (upliftCapacityPerPostKn / Math.max(0.01, upliftPerPostKn)).toFixed(2)
  );

  // Overturning resisting moment including rear pile tension pullout capacity:
  const rearPostsCount = Math.max(1, Math.floor(postsPerTable / 2));
  const postSpacingM = tableSlopedWidthM * Math.cos(tiltRad);
  const anchorResistingMomentKnM = rearPostsCount * upliftCapacityPerPostKn * postSpacingM;
  const fosOverturningAnchored = Number(
    ((stabilizingMoment + anchorResistingMomentKnM) / Math.max(0.1, windOverturningMomentKnM)).toFixed(2)
  );

  const fosBearing = Number((allowableSoilBearingKpa / Math.max(0.1, appliedPostBearingPressureKpa)).toFixed(2));
  const fosLateral = bromsResult.fosLateral;

  // 7. Remedial Guidance and Optimization Targets
  const targetDepthForUplift = calculateRequiredEmbedmentForUplift(
    upliftPerPostKn,
    soilType,
    0.15,
    soilCohesionKpa,
    soilDensityKnM3,
    siteFrostDepthM,
    2.0
  );
  const targetEmbedmentDepthM = Math.max(
    targetDepthForUplift,
    bromsResult.embedmentDepthM,
    Number((siteFrostDepthM + 1.0).toFixed(2))
  );

  let targetPostsPerTable = postsPerTable;
  if (fosUplift < 2.0 && !isBallasted) {
    targetPostsPerTable = postsPerTable <= 2 ? 4 : postsPerTable <= 4 ? 6 : 8;
  }

  const targetBallastKgPerTable = Math.max(
    600,
    Math.round(((windUpliftForceKn * 1000) / 9.81) * 1.5 - deadLoadTableKg)
  );

  let governingFailureMode: StructuralRemedialGuidance['governingFailureMode'] = 'none';
  let governingFos = fosUplift;
  let requiredFos = 2.0;

  if (isBallasted) {
    if (fosOverturning < 1.5) {
      governingFailureMode = 'overturning_moment';
      governingFos = fosOverturning;
      requiredFos = 1.5;
    } else if (fosSliding < 1.4) {
      governingFailureMode = 'sliding';
      governingFos = fosSliding;
      requiredFos = 1.4;
    } else if (!isBearingCapacitySafe) {
      governingFailureMode = 'bearing_capacity';
      governingFos = fosBearing;
      requiredFos = 1.0;
    }
  } else {
    if (fosUplift < 2.0) {
      governingFailureMode = 'uplift_tension';
      governingFos = fosUplift;
      requiredFos = 2.0;
    } else if (fosLateral < 1.5) {
      governingFailureMode = 'sliding';
      governingFos = fosLateral;
      requiredFos = 1.5;
    } else if (!isBearingCapacitySafe) {
      governingFailureMode = 'bearing_capacity';
      governingFos = fosBearing;
      requiredFos = 1.0;
    }
  }

  const isCritical =
    (isBallasted && (fosOverturning < 1.2 || fosSliding < 1.1 || !isBearingCapacitySafe)) ||
    (!isBallasted && (fosUplift < 1.2 || fosLateral < 1.1 || !isBearingCapacitySafe));

  const isWarning =
    (isBallasted && (fosOverturning < 1.5 || fosSliding < 1.4 || !isBearingCapacitySafe)) ||
    (!isBallasted && (fosUplift < 2.0 || fosLateral < 1.5 || !isBearingCapacitySafe));

  const actionsEn: string[] = [];
  const actionsFa: string[] = [];

  if (isBallasted) {
    if (fosOverturning < 1.5) {
      actionsEn.push(`Increase concrete ballast block mass to at least ${targetBallastKgPerTable} kg per table to achieve overturning FoS ≥ 1.5.`);
      actionsFa.push(`وزن بلوک‌های بتنی بالاست را به حداقل ${targetBallastKgPerTable} کیلوگرم بر هر استراکچر افزایش دهید تا ضریب اطمینان واژگونی به بالای ۱.۵ برسد.`);
    }
    if (fosSliding < 1.4) {
      actionsEn.push('Add high-friction EPDM/rubber separation pads (μ ≥ 0.6) under ballast blocks to satisfy sliding FoS ≥ 1.4.');
      actionsFa.push('زیر بلوک‌های بتنی از پدهای لاستیکی EPDM با ضریب اصطکاک بالا (حداقل ۰.۶) استفاده کنید تا ضریب اطمینان لغزش به بالای ۱.۴ برسد.');
    }
  } else {
    if (fosUplift < 2.0) {
      actionsEn.push(`Increase pile embedment depth from ${recommendedDepthM}m to ${targetEmbedmentDepthM}m to increase soil skin friction capacity (T_ult) and achieve FoS_uplift ≥ 2.0 (Eurocode 7).`);
      actionsFa.push(`عمق کوبش شمع را از ${recommendedDepthM} متر به ${targetEmbedmentDepthM} متر افزایش دهید تا ظرفیت کششی جدار خاک ارتقا یافته و FoS کشش طبق یوروکد ۷ به بالای ۲.۰ برسد.`);

      actionsEn.push('If ground refusal occurs in shallow rock or hard caliche, switch to Pre-Drilled Grouted Pile (0.85m depth) or Surface Ballasted Block.');
      actionsFa.push('در صورت بروز پس‌زدگی کوبش در سنگ یا کالیچ، از راهکار شمع در گمانه پیش‌حفاری با تزریق گروت (عمق ۰.۸۵m) یا بلوک‌های بتنی سطحی استفاده فرمایید.');

      actionsEn.push(`Increase posts per table from ${postsPerTable} to ${targetPostsPerTable} posts to reduce uplift tension demand per post.`);
      actionsFa.push(`تعداد پایه‌ها در هر میز را از ${postsPerTable} به ${targetPostsPerTable} پایه افزایش دهید تا بار کشش باد بین پایه‌های بیشتری توزیع شود.`);
    }
    if (fosLateral < 1.5) {
      actionsEn.push(`Increase pile embedment depth to ${bromsResult.embedmentDepthM}m or upgrade pile section to W6x12 / C150 to satisfy Broms lateral equilibrium.`);
      actionsFa.push(`عمق کوبش پایه را به حداقل ${bromsResult.embedmentDepthM} متر افزایش دهید یا مقطع شمع را تقویت نمایید تا تعادل جانبی برمز برقرار شود.`);
    }
    if (groundClearanceM > 0.8) {
      actionsEn.push(`Lower ground clearance height from ${groundClearanceM}m to 0.7m–0.8m to shorten the overturning moment arm.`);
      actionsFa.push(`ارتفاع آزاد زیر پنل‌ها را از ${groundClearanceM} متر به ۰.۷ تا ۰.۸ متر کاهش دهید تا بازوی لنگر واژگونی کوتاه‌تر شود.`);
    }
    if (arrayTiltDeg > 25) {
      actionsEn.push(`Optimize array tilt angle from ${arrayTiltDeg}° toward 22°–25° to lower aerodynamic wind uplift drag coefficients.`);
      actionsFa.push(`زاویه شیب آرایه را به ۲۲ تا ۲۵ درجه تنظیم نمایید تا ضرایب مکش آیرودینامیکی باد کاهش یابد.`);
    }
  }

  if (!isBearingCapacitySafe) {
    actionsEn.push(`Bearing pressure (${appliedPostBearingPressureKpa} kPa) exceeds allowable soil capacity (${allowableSoilBearingKpa} kPa). Enlarge foundation base / footing footprint.`);
    actionsFa.push(`تنش وارده به خاک (${appliedPostBearingPressureKpa} kPa) از ظرفیت مجاز (${allowableSoilBearingKpa} kPa) بیشتر است. مساحت پی یا کلاهک شمع را گسترش دهید.`);
  }

  const remedialGuidance: StructuralRemedialGuidance = {
    isCritical,
    isWarning,
    governingFailureMode,
    governingFos,
    requiredFos,
    targetEmbedmentDepthM,
    targetPostsPerTable,
    targetBallastKgPerTable,
    actionsEn,
    actionsFa,
  };

  // Safety verdict depends on the governing failure mode per foundation type:
  //  - ballasted block: self-weight resists overturning and sliding
  //  - pile / screw / rock-grouted: uplift tension governs (Eurocode 7: FoS_uplift >= 2.0)
  //  - concrete pier: both uplift and self-weight overturning required
  const screeningDisclaimerFa =
    'توجه: ارزیابی سازه و فونداسیون در سطح غربالگری اولیه مهندسی (Screening) است. تاییدیه نهایی مستلزم بررسی نقشه‌های چون‌ساخت، آزمایش کشش برجا (Pullout Test) و محاسبات تفصیلی مهندس محاسب دارای پروانه اشتغال می‌باشد.';
  const screeningDisclaimerEn =
    'NOTICE: This structural screening is preliminary. Definitive certification requires as-built structural drawings, site pullout tests, and endorsement by a licensed professional structural engineer.';

  let isStructurallySafe: boolean;
  let safetyReasonEn: string;
  let safetyReasonFa: string;
  switch (foundationType) {
    case 'shed_roof_clamp_rail': {
      const clampUpliftCapacityPerTableKn = modulesPerTable * 4 * 1.8; // 1.8 kN tensile pullout capacity per purlin fastener
      const fosClampUplift = Number((clampUpliftCapacityPerTableKn / Math.max(0.1, windUpliftForceKn)).toFixed(2));
      const roofDeadLoadKgM2 = Number(((moduleWeightKg * modulesPerTable + structuralSteelRackingWeightKg / totalTablesCount) / tableAreaM2).toFixed(1));
      const isRoofLoadSafe = roofDeadLoadKgM2 <= 35.0; // safe industrial shed live/dead capacity (typ. 50-75 kg/m2)
      isStructurallySafe = fosClampUplift >= 2.0 && isRoofLoadSafe;
      safetyReasonEn = isStructurallySafe
        ? `[Preliminary Screening] Industrial shed clamp mounting evaluated against assumed allowable load (dead load ${roofDeadLoadKgM2} kg/m² <= 35 kg/m², fastener FoS = ${fosClampUplift} >= 2.0). Requires structural framing review.`
        : `Industrial shed clamp warning: check purlin fastener pullout (FoS = ${fosClampUplift}) or roof dead load (${roofDeadLoadKgM2} kg/m²).`;
      safetyReasonFa = isStructurallySafe
        ? `[غربالگری اولیه] اتصال کلمپ به سقف سوله بر مبنای فرضیات استاندارد ارزیابی شد (بار مرده ${roofDeadLoadKgM2} kg/m² کمتر از ۳۵ kg/m² فرضی، FoS مکش باد = ${fosClampUplift} >= ۲.۰). کنترل ظرفیت تیرها و پرلین‌ها در نقشه‌های چون‌ساخت الزامی است.`
        : `هشدار اتصال سقف سوله: مقاومت پیچ‌های پرلین (FoS = ${fosClampUplift}) یا اضافه بار سقف (${roofDeadLoadKgM2} kg/m²) نیازمند بازبینی است.`;
      break;
    }
    case 'rooftop_anchor_bolted': {
      const anchorTensileCapacityKn = postsPerTable * 4 * 15.0; // 4x M12 anchors per baseplate screening assumption
      const fosAnchorUplift = Number((anchorTensileCapacityKn / Math.max(0.1, windUpliftForceKn)).toFixed(2));
      // Engineering Candor (P7-07 / C7-04): Without site-specific in-situ pullout data or
      // concrete slab structural drawings, chemical anchors cannot be declared safe.
      isStructurallySafe = false;
      safetyReasonEn =
        `[UNASSESSED - Pullout Data Required] Rooftop chemical anchor tensile capacity cannot be certified safe without site-specific in-situ pullout testing (ASTM E488) and structural concrete slab thickness verification. Nominal screening FoS = ${fosAnchorUplift}, but field verification by a licensed structural engineer is mandatory.`;
      safetyReasonFa =
        `[ارزیابی‌نشده - نیازمند آزمون کشش درجا] ظرفیت انکربولت دال بتنی سقف نیازمند آزمایش کشش درجا (Pullout Test) و نقشه‌های سازه است؛ تأیید ایمنی صادر نشد (ضریب اسمی = ${fosAnchorUplift}).`;
      break;
    }
    case 'rooftop_ballasted_block': {
      const roofDeadLoadKgM2 = Number(((deadLoadTableKg + ballastKgPerTable) / tableAreaM2).toFixed(1));
      const isRoofLoadSafe = roofDeadLoadKgM2 <= 40.0;
      isStructurallySafe = fosOverturning >= 1.5 && fosSliding >= 1.4 && isRoofLoadSafe;
      safetyReasonEn = isStructurallySafe
        ? `[Preliminary Screening] Rooftop ballasted block evaluated (Overturning FoS = ${fosOverturning} >= 1.5, sliding FoS = ${fosSliding} >= 1.4, roof dead load ${roofDeadLoadKgM2} kg/m² <= 40 kg/m²). Roof structural capacity must be certified.`
        : `Rooftop ballast block warning: Overturning FoS = ${fosOverturning}, Sliding FoS = ${fosSliding}, roof load = ${roofDeadLoadKgM2} kg/m². Adjust ballast weight or tilt angle.`;
      safetyReasonFa = isStructurallySafe
        ? `[غربالگری اولیه] بلوک‌های بالاست وزنی پشت‌بام ارزیابی شد (FoS واژگونی = ${fosOverturning} >= ۱.۵، FoS لغزش = ${fosSliding} >= ۱.۴، اضافه بار سقف = ${roofDeadLoadKgM2} kg/m²). ظرفیت سازه‌ای سقف ساختمان باید توسط مهندس سازه تایید گردد.`
        : `هشدار بالاست پشت‌بام: FoS واژگونی = ${fosOverturning}، FoS لغزش = ${fosSliding}، اضافه بار سقف = ${roofDeadLoadKgM2} kg/m². زاویه شیب یا وزن بالاست را بازبینی فرمایید.`;
      break;
    }
    case 'surface_ballasted_block':
      isStructurallySafe = fosOverturning >= 1.5 && fosSliding >= 1.4 && isBearingCapacitySafe;
      safetyReasonEn = isStructurallySafe
        ? `Surface precast ballast block verified (Overturning FoS = ${fosOverturning} >= 1.5, sliding FoS = ${fosSliding} >= 1.4). Zero ground penetration required for refusal/rocky ground.`
        : `Surface ballast insufficient against wind action (Overturning FoS = ${fosOverturning}, Sliding FoS = ${fosSliding}). Increase ballast block mass.`;
      safetyReasonFa = isStructurallySafe
        ? `بلوک بتنی پیش‌ساخته سطحی تأیید است (FoS واژگونی = ${fosOverturning} >= ۱.۵، FoS لغزش = ${fosSliding} >= ۱.۴). بدون نیاز به کوبش در خاک‌های سخت/سنگی.`
        : `وزن بلوک سطحی در برابر باد ناکافی است. جرم بلوک بتنی را افزایش دهید.`;
      break;
    case 'pre_drilled_grouted_pile': {
      const isCompetentBedrock = soilType === 'rocky_limestone';
      if (!isRooftopOrShed && !isCompetentBedrock && !hasFrostData) {
        isStructurallySafe = false;
        safetyReasonEn =
          `[UNASSESSED - Frost Depth Required] Site frost depth is unspecified; pre-drilled grouted pile embedment in soil cannot be certified safe against frost heave. Geotechnical borehole frost depth data is mandatory.`;
        safetyReasonFa =
          `[ارزیابی‌نشده - نیازمند عمق یخبندان] عمق یخبندان ساختگاه نامشخص است؛ پایداری شمع پیش‌حفاری‌شده در خاک در برابر تورم یخبندان قابل تأیید نیست.`;
      } else {
        const isEmbedmentSufficient = input.customEmbedmentDepthM !== undefined
          ? (input.customEmbedmentDepthM > 0 && isFrostDepthRespected)
          : isFrostDepthRespected;
        isStructurallySafe = fosUplift >= 2.0 && isBearingCapacitySafe && isFrostDepthRespected && isEmbedmentSufficient;
        safetyReasonEn = isStructurallySafe
          ? isCompetentBedrock
            ? `Rock-socket grout bond capacity verified in competent bedrock (FoS_uplift = ${fosUplift} >= 2.0, T_ult = ${upliftCapacityPerPostKn.toFixed(1)} kN/post). Compact depth (${recommendedDepthM}m) eliminates refusal (FHWA-NHI-05-039).`
            : `Rock-socket grout bond capacity verified (FoS_uplift = ${fosUplift} >= 2.0, T_ult = ${upliftCapacityPerPostKn.toFixed(1)} kN/post). Frost penetration depth respected (L = ${recommendedDepthM}m >= ${bromsResult.minDepthForFrostM}m).`
          : !isFrostDepthRespected
          ? `Pre-drilled pile depth (${recommendedDepthM}m) does not satisfy required frost heave penetration depth (${bromsResult.minDepthForFrostM}m for ${siteFrostDepthCm}cm frost depth). Pile embedment cannot be certified safe against frost heave without site-specific rock-head borehole verification.`
          : `Rock-socket grout bond capacity insufficient (FoS_uplift = ${fosUplift} < 2.0, T_ult = ${upliftCapacityPerPostKn.toFixed(1)} kN/post vs demand ${upliftPerPostKn} kN/post). Increase borehole depth.`;
        safetyReasonFa = isStructurallySafe
          ? isCompetentBedrock
            ? `ظرفیت چسبندگی گروت در سنگ بستر یکپارچه تأیید است (FoS_uplift = ${fosUplift} >= ۲.۰، ظرفیت ${upliftCapacityPerPostKn.toFixed(1)} kN/پایه). عمق بهینه ${recommendedDepthM} متر مانع پس‌زدگی کوبش می‌شود.`
            : `ظرفیت چسبندگی گروت تأیید است (FoS_uplift = ${fosUplift} >= ۲.۰، ظرفیت ${upliftCapacityPerPostKn.toFixed(1)} kN/پایه) و عمق نفوذ یخبندان رعایت شده است.`
          : !isFrostDepthRespected
          ? `عمق شمع پیش‌حفاری (${recommendedDepthM} متر) کمتر از حداقل عمق نفوذ یخبندان (${bromsResult.minDepthForFrostM} متر برای عمق یخبندان ${siteFrostDepthCm} سانتی‌متر) است؛ پایداری در برابر تورم یخبندان بدون گزارش ژئوتکنیکی سنگ بستر قابل تأیید نیست.`
          : `ظرفیت کششی گروت در سنگ ناکافی است (FoS_uplift = ${fosUplift} < ۲.۰). عمق گمانه یا قطر حفاری را افزایش دهید.`;
      }
      break;
    }
    case 'rammed_steel_pile':
    case 'ground_screw': {
      if (!isRooftopOrShed && !hasFrostData) {
        isStructurallySafe = false;
        safetyReasonEn =
          `[UNASSESSED - Frost Depth Required] Site frost depth is unspecified; pile embedment and uplift resistance cannot be certified safe against frost heave action. Geotechnical borehole frost depth data is mandatory.`;
        safetyReasonFa =
          `[ارزیابی‌نشده - نیازمند عمق یخبندان] عمق یخبندان ساختگاه نامشخص است؛ پایداری فونداسیون در برابر تورم یخبندان و کشش باد قابل تأیید نیست.`;
      } else {
        const isEmbedmentSufficient = input.customEmbedmentDepthM !== undefined
          ? (input.customEmbedmentDepthM > 0 && input.customEmbedmentDepthM >= bromsResult.embedmentDepthM && isFrostDepthRespected)
          : isFrostDepthRespected;
        isStructurallySafe = fosUplift >= 2.0 && isBearingCapacitySafe && isEmbedmentSufficient && fosLateral >= 1.5;
        safetyReasonEn = isStructurallySafe
          ? `Pile uplift capacity OK (FoS_uplift = ${fosUplift} >= 2.0, T_ult = ${upliftCapacityPerPostKn.toFixed(1)} kN/post). Broms lateral FoS >= 1.5 verified in foundation report.`
          : !isEmbedmentSufficient
          ? `Custom embedment depth (${recommendedDepthM}m) is insufficient for lateral/frost/uplift limits (FoS_uplift=${fosUplift}, FoS_lateral=${fosLateral}).`
          : `Pile uplift capacity INSUFFICIENT (FoS_uplift = ${fosUplift} < 2.0, T_ult = ${upliftCapacityPerPostKn.toFixed(1)} kN/post vs demand ${upliftPerPostKn} kN/post). Increase embedment or add ballast.`;
        safetyReasonFa = isStructurallySafe
          ? `ظرفیت کشش شمع کافی است (FoS_uplift = ${fosUplift} >= ۲.۰).`
          : !isEmbedmentSufficient
          ? `عمق کوبش واردشده (${recommendedDepthM} متر) الزامات عمق یخبندان یا مقاومت جانبی را ارضا نمی‌کند.`
          : `ظرفیت کشش شمع کافی نیست (FoS_uplift = ${fosUplift} < ۲.۰). عمق کوبش را افزایش دهید.`;
      }
      break;
    }
    case 'concrete_pier':
      if (!isRooftopOrShed && !hasFrostData) {
        isStructurallySafe = false;
        safetyReasonEn =
          `[UNASSESSED - Frost Depth Required] Site frost depth is unspecified; concrete pier embedment cannot be certified safe against frost heave. Geotechnical borehole frost depth data is mandatory.`;
        safetyReasonFa =
          `[ارزیابی‌نشده - نیازمند عمق یخبندان] عمق یخبندان ساختگاه نامشخص است؛ پایداری پایه بتنی در برابر یخبندان قابل تأیید نیست.`;
      } else {
        isStructurallySafe =
          fosUplift >= 2.0 && fosOverturning >= 1.5 && isBearingCapacitySafe && isFrostDepthRespected;
        safetyReasonEn = isStructurallySafe
          ? `Pier uplift FoS = ${fosUplift} >= 2.0 and overturning FoS = ${fosOverturning} >= 1.5.`
          : `Pier insufficient: FoS_uplift = ${fosUplift}, FoS_overturning = ${fosOverturning}. Increase pier depth or diameter.`;
        safetyReasonFa = isStructurallySafe
          ? `FoS کشش ${fosUplift} و واژگونی ${fosOverturning} کافی است.`
          : `پایه بتنی کافی نیست: FoS_uplift=${fosUplift}, FoS_overturning=${fosOverturning}.`;
      }
      break;
    default:
      isStructurallySafe = false;
      safetyReasonEn = 'Unknown foundation type.';
      safetyReasonFa = 'نوع فونداسیون ناشناخته.';
  }

  let engineeringRemarksFa =
    'ارزیابی اولیه پایداری سازه و فونداسیون در مودهای بررسی‌شده (کشش، باربری خاک و برش جانبی برمز) طبق مبحث ۶ و ۷ مقررات ملی و ASCE 7-22 ارضا شده است. مودهای ارزیابی‌نشده (اتصالات کلمپ، انکرهای شیمیایی، گردابه‌های گوشه و پاسخ لرزه‌ای) مستثنی بوده و انطباق اجرایی منوط به گمانه‌زنی ژئوتکنیک و طراحی تفصیلی است.';
  let engineeringRemarksEn =
    'Preliminary screening structural stability and foundation sizing compliant with INBC Part 6 & ASCE 7-22 for evaluated failure modes (uplift, bearing, Broms lateral). Unassessed modes (purlin clamps, chemical anchors, corner vortices, seismic dynamics) excluded; definitive certification subject to borehole testing and detailed engineering.';
  if (!isStructurallySafe) {
    if (!isRooftopOrShed && !hasFrostData) {
      engineeringRemarksFa = 'هشدار مهندسی: عمق یخبندان ساختگاه نامشخص است؛ بدون گمانه‌زنی و تعیین عمق یخبندان، پایداری شمع قابل تأیید نیست.';
      engineeringRemarksEn = 'Engineering Warning: Site frost depth is unspecified; pile embedment cannot be certified safe against frost heave without borehole data.';
    } else if (!isBearingCapacitySafe) {
      engineeringRemarksFa = `هشدار مهندسی: تنش وارده به خاک (${appliedPostBearingPressureKpa} kPa) از ظرفیت باربری مجاز خاک (${allowableSoilBearingKpa} kPa) فراتر رفته است. ابعاد پی را گسترش دهید.`;
      engineeringRemarksEn = `Engineering Warning: Bearing pressure (${appliedPostBearingPressureKpa} kPa) exceeds allowable soil capacity (${allowableSoilBearingKpa} kPa). Enlarge footing area.`;
    } else {
      engineeringRemarksFa = 'هشدار مهندسی: ضریب اطمینان واژگونی کمتر از ۱.۵ است. عمق فونداسیون یا وزن پایه‌ها را افزایش دهید.';
      engineeringRemarksEn = 'Engineering Warning: Factor of safety against overturning is below 1.5. Increase pile depth or ballast weight.';
    }
  }

  return {
    tableAreaM2,
    tableSlopedWidthM: Number(tableSlopedWidthM.toFixed(3)),
    totalArrayAreaM2: Number(totalArrayAreaM2.toFixed(0)),
    tableLengthM: Number(tableLengthM.toFixed(2)),
    tableHeightM: Number(tableSlopedWidthM.toFixed(2)),
    totalTablesCount,
    deadLoadTableKg: Math.round(deadLoadTableKg),
    deadLoadTableKn: Number(deadLoadTableKn.toFixed(2)),
    velocityWindPressureQzN_M2: Math.round(velocityWindPressureQzN_M2),
    windUpliftForceKn: Number(windUpliftForceKn.toFixed(1)),
    windDownforceKn: Number(windDownforceKn.toFixed(1)),
    windOverturningMomentKnM: Number(windOverturningMomentKnM.toFixed(1)),
    snowLoadTableKn: Number(snowLoadTableKn.toFixed(1)),
    modulesPerTable,
    postsPerTable,
    totalPostsCount,
    upliftPerPostKn,
    compressionPerPostKn,
    lateralShearPerPostKn,
    foundationNameFa,
    foundationNameEn,
    recommendedDepthM,
    foundationDimensionsDesc,
    foundationDimensionsDescEn,
    allowableSoilBearingKpa,
    appliedPostBearingPressureKpa,
    isBearingCapacitySafe,
    frostDepthCm: siteFrostDepthCm,
    isFrostDepthRespected,
    concreteVolumeTotalM3,
    steelRebarWeightTotalKg,
    structuralSteelRackingWeightKg,
    cementBagsCount,
    sandGravelTon,
    fosOverturning,
    fosSliding,
    fosSlidingApplicable,
    fosUplift,
    upliftCapacityPerPostKn: Number(upliftCapacityPerPostKn.toFixed(2)),
    isStructurallySafe,
    isScreeningPreliminary: true,
    screeningDisclaimerFa,
    screeningDisclaimerEn,
    safetyReasonEn,
    safetyReasonFa,
    engineeringRemarksFa,
    engineeringRemarksEn,
    fosLateral,
    fosBearing,
    fosOverturningAnchored,
    bromsPileSection: bromsResult.pileSection,
    minDepthForFrostM: bromsResult.minDepthForFrostM,
    remedialGuidance,
  };
}
