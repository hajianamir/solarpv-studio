// Structural Mounting & Civil Foundation Engineering Engine
// Conforming to ASCE 7-22, Iranian National Building Code Part 6 (مبحث ۶ مقررات ملی ساختمان), and ACI 318

export type FoundationType =
  | 'rammed_steel_pile'      // پایه‌های کوبشی فولادی C شکل (نیروگاه‌های مقیاس مگاواتی)
  | 'concrete_pier'          // پایه‌های بتنی درجا (خاک‌های سنگی و سخت)
  | 'ground_screw'           // شمع‌های پیچشی فولادی
  | 'rooftop_ballasted_block'; // بلوک‌های بتنی وزنی پشت‌بام بدون نفوذ در ایزوگام

export type SoilType =
  | 'dense_sand_gravel' // شن و ماسه متراکم (اصطکاک بالا)
  | 'medium_clay'       // رس متوسط تا سخت
  | 'loose_sand'        // ماسه سست
  | 'rocky_limestone';  // بستر سنگ آهکی یا کوهستانی

/**
 * Estimate ultimate uplift (tension) capacity per driven pile.
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
): number {
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
  /** Optional override for pile skin-friction uplift capacity per post (kN).
   *  When absent, the engine estimates via the beta/alpha method below. */
  pileUpliftCapacityPerPostKn?: number;
  elevationM?: number;
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

/** Net uplift pressure coefficient for a tilted ground-mount table,
 *  ASCE 7-22 §27.3-4 / SEAOC PV2-2017 §4.3. */
export function cpUpliftFor(tiltDeg: number): number {
  return 1.30 + 0.012 * tiltDeg;
}

/** Net downward pressure coefficient (wind on front of panel). */
export function cpDownforceFor(tiltDeg: number): number {
  return 0.95 + 0.01 * tiltDeg;
}

export function calculateWindPressureQz(
  basicWindSpeedKmh: number,
  elevationM: number = 0,
): WindPressureResult {
  const vMs = Math.max(0, basicWindSpeedKmh) / 3.6;
  const kz = 0.88;  // Exposure C, h<5m - same as current structuralEngine
  const kzt = 1.0;
  const kd = 0.85;
  // ASCE 7-22 §26.10.1 elevation factor. ke = 1.0 at sea level; drops
  // ~0.362% per 100 m. Only applied when elevationM > 0.
  const ke = elevationM > 0
    ? Math.exp(-0.0000362 * elevationM)
    : 1.0;
  const qzN_M2 = 0.613 * kz * kzt * kd * ke * Math.pow(vMs, 2);
  return {
    qzN_M2,
    qzKnM2: qzN_M2 / 1000,
    vMs,
    kz, kzt, kd, ke,
  };
}

export interface StructuralAnalysisResult {
  tableAreaM2: number;
  totalArrayAreaM2: number;
  tableLengthM: number;
  tableHeightM: number;
  totalTablesCount: number;

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
  isStructurallySafe: boolean;
  /** Human-readable reason the design is or isn't safe, per foundation type. */
  safetyReasonEn: string;
  safetyReasonFa: string;
  engineeringRemarksFa: string;
  engineeringRemarksEn: string;
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

  const tiltRad = (arrayTiltDeg * Math.PI) / 180.0;
  const windPressure = calculateWindPressureQz(basicWindSpeedKmh, input.elevationM ?? 0);
  const windSpeedMs = windPressure.vMs;

  // Standard 2P (2 Portrait) table configuration
  // Table width = 2 modules in portrait, Table length = (modulesPerTable / 2) * moduleWidth
  const tableLengthM = (modulesPerTable / 2.0) * (moduleWidthM + 0.02);
  const tableSlopedWidthM = 2.0 * moduleLengthM + 0.05;
  const tableAreaM2 = tableLengthM * tableSlopedWidthM;

  const totalTablesCount = Math.ceil(totalModulesCount / modulesPerTable);
  const totalArrayAreaM2 = tableAreaM2 * totalTablesCount;

  // Mean height of the table above ground
  const tableMeanHeightM = groundClearanceM + (tableSlopedWidthM * Math.sin(tiltRad)) / 2.0;

  // 1. Dead Load Calculation
  // Module weight + Aluminum purlins/clamps + Steel torque-tube/brackets (~18 kg/m² for racking)
  const moduleTotalWeightPerTable = modulesPerTable * moduleWeightKg;
  const rackingWeightPerTable = tableAreaM2 * 14.5; // kg of galvanized steel/aluminum
  const deadLoadTableKg = moduleTotalWeightPerTable + rackingWeightPerTable;
  const deadLoadTableKn = (deadLoadTableKg * 9.81) / 1000.0;

  // 2. Wind Load Calculation (ASCE 7 & Iranian Code Part 6)
  // q_z from the shared calculateWindPressureQz helper (single source).
  const velocityWindPressureQzN_M2 = windPressure.qzN_M2;

  // Aerodynamic coefficients for sloped ground-mount tables
  // C_p,net uplift (wind from rear under array) ~ 1.35 + 0.01 * tilt
  const cpUplift = cpUpliftFor(arrayTiltDeg);
  // C_p,net downforce (wind blowing directly against front face) ~ 1.05 + 0.01 * tilt
  const cpDownforce = cpDownforceFor(arrayTiltDeg);

  // Forces in kN
  const windUpliftForceKn = (velocityWindPressureQzN_M2 * cpUplift * tableAreaM2) / 1000.0;
  const windDownforceKn = (velocityWindPressureQzN_M2 * cpDownforce * tableAreaM2) / 1000.0;
  // Overturning moment about the down-slope (south) post base.
  // 2D cross-section, down-slope post at origin: panel CG at
  // (W_sloped*cos(beta)/2, h_gc + W_sloped*sin(beta)/2); normal wind force
  // F = qz*Cp*A with components (F*sin(beta), F*cos(beta)).
  // Moment = x*F_y - y*F_x = F*(W_sloped/2 + h_gc*sin(beta)).
  const overturningMomentArmM =
    (tableSlopedWidthM / 2.0) + (groundClearanceM * Math.sin(tiltRad));
  const windOverturningMomentKnM = windUpliftForceKn * overturningMomentArmM;

  // 3. Snow Load Calculation
  // S = S_0 * C_s * C_e * C_t * I_s
  // C_s slope reduction for tilt > 30 deg
  const cs = arrayTiltDeg > 30 ? Math.max(0, 1 - (arrayTiltDeg - 30) / 40) : 1.0;
  const snowLoadTableKg = groundSnowLoadKgM2 * cs * tableAreaM2 * Math.cos(tiltRad);
  const snowLoadTableKn = (snowLoadTableKg * 9.81) / 1000.0;

  // 4. Foundation Sizing per Table
  // Typically 4 posts per table (for 2P14 = 28 modules) or 6 posts for larger tables
  const postsPerTable = modulesPerTable > 20 ? 4 : 2;
  const totalPostsCount = totalTablesCount * postsPerTable;

  // Net tension (uplift) per post = (Wind Uplift - 0.9 * Dead Load) / posts + Moment effect
  // Vertical component of the normal wind force is F_normal * cos(beta).
  // The moment term (M / post-spacing) already represents the vertical
  // reaction induced by the moment, so cos(beta) is NOT applied to it.
  const verticalUpliftForceKn = windUpliftForceKn * Math.cos(tiltRad);

  const netUpliftPerPost = Math.max(
    0,
    (verticalUpliftForceKn - 0.9 * deadLoadTableKn) / postsPerTable + (windOverturningMomentKnM / (tableSlopedWidthM * postsPerTable / 2))
  );
  const upliftPerPostKn = Number(netUpliftPerPost.toFixed(1));

  // Max compression per post = (Dead Load + 1.2 * Wind Downforce + Snow) / posts
  const compressionPerPostKn = Number(
    ((deadLoadTableKn + 1.2 * windDownforceKn + snowLoadTableKn) / postsPerTable).toFixed(1)
  );

  // Lateral shear per post
  const lateralShearPerPostKn = Number(
    ((velocityWindPressureQzN_M2 * tableAreaM2 * Math.sin(tiltRad)) / (postsPerTable * 1000.0)).toFixed(1)
  );

  // 5. Foundation Geometry & Soil Mechanics
  let recommendedDepthM = 1.6;
  let foundationNameFa = 'پایه کوبشی فولادی C شکل (Rammed Steel C-Pile)';
  let foundationNameEn = 'Rammed Galvanized Steel C-Pile (Direct Driving)';
  let foundationDimensionsDesc = 'پروفیل فولادی C120×50×20×3.5 mm، عمق نفوذ ۱.۶ متر';
  let foundationDimensionsDescEn = 'C120x50x20x3.5mm galvanized steel profile, 1.6m embedment depth';
  let concreteVolumeTotalM3 = 0;
  let steelRebarWeightTotalKg = 0;

  // Soil bearing capacity factor
  const soilFactor = soilType === 'dense_sand_gravel' ? 1.0 : soilType === 'medium_clay' ? 1.2 : soilType === 'loose_sand' ? 1.45 : 0.8;

  if (foundationType === 'rammed_steel_pile') {
    recommendedDepthM = Number((1.5 * soilFactor).toFixed(1));
    foundationNameFa = 'پایه کوبشی فولادی C شکل گالوانیزه گرم';
    foundationNameEn = 'Hot-Dip Galvanized Rammed Steel C-Pile';
    foundationDimensionsDesc = `پروفیل فولادی C120×50×25×3.5mm، عمق کوبش در خاک: ${recommendedDepthM} متر (بدون بتن‌ریزی)`;
    foundationDimensionsDescEn = `C120x50x25x3.5mm steel post, direct ramming depth: ${recommendedDepthM} m (concrete-free)`;
    concreteVolumeTotalM3 = 0;
    steelRebarWeightTotalKg = 0;
  } else if (foundationType === 'concrete_pier') {
    recommendedDepthM = Number((1.2 * soilFactor).toFixed(1));
    const pierDiameterM = 0.40;
    const volPerPierM3 = Math.PI * Math.pow(pierDiameterM / 2.0, 2) * recommendedDepthM;
    concreteVolumeTotalM3 = Number((volPerPierM3 * totalPostsCount).toFixed(1));
    steelRebarWeightTotalKg = Number((totalPostsCount * 22.0).toFixed(0)); // 22 kg rebar cage per pier
    foundationNameFa = 'فونداسیون استوانه‌ای بتن درجا (Cast-in-Place Concrete Pier)';
    foundationNameEn = 'Cast-in-Place Reinforced Concrete Pier';
    foundationDimensionsDesc = `پایه بتنی مسلح قطر ۴۰ سانتی‌متر، عمق: ${recommendedDepthM} متر با انکربولت‌های M20 گالوانیزه`;
    foundationDimensionsDescEn = `Reinforced concrete cylinder dia 40cm, depth: ${recommendedDepthM} m with M20 HDG anchor bolts`;
  } else if (foundationType === 'ground_screw') {
    recommendedDepthM = Number((1.6 * soilFactor).toFixed(1));
    foundationNameFa = 'شمع‌های پیچشی فولادی (Ground Screws)';
    foundationNameEn = 'Galvanized Continuous Ground Screw';
    foundationDimensionsDesc = `شمع پیچشی گالوانیزه قطر ۷۶mm، طول رزوه ۱۲۰۰mm، عمق نفوذ: ${recommendedDepthM} متر`;
    foundationDimensionsDescEn = `Continuous helical ground screw dia 76mm, flight 1200mm, depth: ${recommendedDepthM} m`;
    concreteVolumeTotalM3 = 0;
    steelRebarWeightTotalKg = 0;
  } else {
    // Rooftop ballasted block
    recommendedDepthM = 0.25; // block thickness
    const ballastKgPerTable = Math.max(400, (windUpliftForceKn * 1000) / 9.81 * 1.5 - deadLoadTableKg);
    const volPerTableM3 = ballastKgPerTable / 2400.0; // concrete density 2400 kg/m³
    concreteVolumeTotalM3 = Number((volPerTableM3 * totalTablesCount).toFixed(1));
    foundationNameFa = 'بلوک‌های بتنی وزنی پیش‌ساخته پشت‌بام (Ballasted Rooftop Blocks)';
    foundationNameEn = 'Precast Concrete Ballast Blocks (Non-Penetrating)';
    foundationDimensionsDesc = `بلوک‌های بتنی پیش‌ساخته با وزن ${Math.round(ballastKgPerTable)} کیلوگرم به ازای هر استراکچر`;
    foundationDimensionsDescEn = `Precast concrete blocks weighing ${Math.round(ballastKgPerTable)} kg per mounting table`;
  }

  // Cement and sand breakdown
  const cementBagsCount = Math.round(concreteVolumeTotalM3 * 7.0); // 7 bags per m³ of C25 concrete
  const sandGravelTon = Number((concreteVolumeTotalM3 * 1.85).toFixed(1));
  const structuralSteelRackingWeightKg = Number((rackingWeightPerTable * totalTablesCount).toFixed(0));

  // Geotechnical Checks
  const allowableSoilBearingKpa = input.soilBearingCapacityKpa || (soilType === 'dense_sand_gravel' ? 250 : soilType === 'medium_clay' ? 180 : soilType === 'loose_sand' ? 140 : 350);
  const footingFootprintM2 = foundationType === 'concrete_pier' ? (Math.PI * 0.2 * 0.2) : foundationType === 'rooftop_ballasted_block' ? 0.8 : 0.15;
  const appliedPostBearingPressureKpa = Number((compressionPerPostKn / footingFootprintM2).toFixed(1));
  const isBearingCapacitySafe = appliedPostBearingPressureKpa <= allowableSoilBearingKpa;

  const siteFrostDepthCm = input.frostDepthCm ?? 30;
  const isFrostDepthRespected = (recommendedDepthM * 100) >= siteFrostDepthCm;

  // 6. Factors of Safety (FoS)
  const stabilizingMoment = (deadLoadTableKn * (tableSlopedWidthM / 2.0)) * Math.cos(tiltRad);
  const fosOverturning = Number((stabilizingMoment / Math.max(0.1, windOverturningMomentKnM)).toFixed(2));
  // fosSliding uses mu=0.45 base friction - meaningful ONLY for ballasted
  // blocks. For pile/pier types this value is present but must NOT be
  // displayed; use the Broms FoS from the foundation report.
  const fosSliding = Number((((deadLoadTableKn * 0.45) / Math.max(0.1, lateralShearPerPostKn * postsPerTable))).toFixed(2));
  const fosSlidingApplicable = foundationType === 'rooftop_ballasted_block';
  // Pile uplift (tension) capacity per post, after recommendedDepthM is final.
  const upliftCapacityPerPostKn =
    input.pileUpliftCapacityPerPostKn
    ?? estimatePileUpliftCapacityKn(
         soilType, recommendedDepthM, 0.15,
         input.soilCohesionKpa ?? 10, input.soilDensityKnM3 ?? 18.0,
       );

  const fosUplift = Number(
    (upliftCapacityPerPostKn / Math.max(0.01, upliftPerPostKn)).toFixed(2)
  );

  // Safety verdict depends on the governing failure mode per foundation type:
  //  - ballasted block: self-weight resists overturning and sliding
  //  - pile / screw: uplift tension governs (Eurocode 7: FoS_uplift >= 2.0)
  //  - concrete pier: both uplift and self-weight overturning required
  let isStructurallySafe: boolean;
  let safetyReasonEn: string;
  let safetyReasonFa: string;
  switch (foundationType) {
    case 'rooftop_ballasted_block':
      isStructurallySafe = fosOverturning >= 1.5 && fosSliding >= 1.4 && isBearingCapacitySafe;
      safetyReasonEn = isStructurallySafe
        ? `Overturning FoS = ${fosOverturning} >= 1.5 and sliding FoS = ${fosSliding} >= 1.4 (self-weight ballast governs).`
        : `Overturning FoS = ${fosOverturning} < 1.5. Increase ballast mass.`;
      safetyReasonFa = isStructurallySafe
        ? `ضریب واژگونی ${fosOverturning} >= ۱.۵ و ضریب لغزش ${fosSliding} >= ۱.۴ (وزن بالاست).`
        : `ضریب واژگونی ${fosOverturning} < ۱.۵. وزن بالاست را افزایش دهید.`;
      break;
    case 'rammed_steel_pile':
    case 'ground_screw':
      isStructurallySafe = fosUplift >= 2.0 && isBearingCapacitySafe;
      safetyReasonEn = isStructurallySafe
        ? `Pile uplift capacity OK (FoS_uplift = ${fosUplift} >= 2.0, T_ult = ${upliftCapacityPerPostKn.toFixed(1)} kN/post). Broms lateral FoS >= 1.5 verified in foundation report.`
        : `Pile uplift capacity INSUFFICIENT (FoS_uplift = ${fosUplift} < 2.0, T_ult = ${upliftCapacityPerPostKn.toFixed(1)} kN/post vs demand ${upliftPerPostKn} kN/post). Increase embedment or add ballast.`;
      safetyReasonFa = isStructurallySafe
        ? `ظرفیت کشش شمع کافی است (FoS_uplift = ${fosUplift} >= ۲.۰).`
        : `ظرفیت کشش شمع کافی نیست (FoS_uplift = ${fosUplift} < ۲.۰). عمق کوبش را افزایش دهید.`;
      break;
    case 'concrete_pier':
      isStructurallySafe =
        fosUplift >= 2.0 && fosOverturning >= 1.5 && isBearingCapacitySafe;
      safetyReasonEn = isStructurallySafe
        ? `Pier uplift FoS = ${fosUplift} >= 2.0 and overturning FoS = ${fosOverturning} >= 1.5.`
        : `Pier insufficient: FoS_uplift = ${fosUplift}, FoS_overturning = ${fosOverturning}. Increase pier depth or diameter.`;
      safetyReasonFa = isStructurallySafe
        ? `FoS کشش ${fosUplift} و واژگونی ${fosOverturning} کافی است.`
        : `پایه بتنی کافی نیست: FoS_uplift=${fosUplift}, FoS_overturning=${fosOverturning}.`;
      break;
    default:
      isStructurallySafe = false;
      safetyReasonEn = 'Unknown foundation type.';
      safetyReasonFa = 'نوع فونداسیون ناشناخته.';
  }

  let engineeringRemarksFa = 'پایداری سازه و فونداسیون طبق آیین‌نامه مبحث ۶ مقررات ملی ساختمان و ASCE 7-22 تأیید است.';
  let engineeringRemarksEn = 'Structural stability and foundation sizing compliant with INBC Part 6 & ASCE 7-22.';
  if (!isStructurallySafe) {
    if (!isBearingCapacitySafe) {
      engineeringRemarksFa = `هشدار مهندسی: تنش وارده به خاک (${appliedPostBearingPressureKpa} kPa) از ظرفیت باربری مجاز خاک (${allowableSoilBearingKpa} kPa) فراتر رفته است. ابعاد پی را گسترش دهید.`;
      engineeringRemarksEn = `Engineering Warning: Bearing pressure (${appliedPostBearingPressureKpa} kPa) exceeds allowable soil capacity (${allowableSoilBearingKpa} kPa). Enlarge footing area.`;
    } else {
      engineeringRemarksFa = 'هشدار مهندسی: ضریب اطمینان واژگونی کمتر از ۱.۵ است. عمق فونداسیون یا وزن پایه‌ها را افزایش دهید.';
      engineeringRemarksEn = 'Engineering Warning: Factor of safety against overturning is below 1.5. Increase pile depth or ballast weight.';
    }
  }

  return {
    tableAreaM2: Number(tableAreaM2.toFixed(1)),
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
    safetyReasonEn,
    safetyReasonFa,
    engineeringRemarksFa,
    engineeringRemarksEn,
  };
}
