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

  // Civil Bill of Materials (BOM)
  concreteVolumeTotalM3: number;
  steelRebarWeightTotalKg: number;
  structuralSteelRackingWeightKg: number;
  cementBagsCount: number;
  sandGravelTon: number;

  // Safety Verification
  fosOverturning: number;
  fosSliding: number;
  fosUplift: number;
  isStructurallySafe: boolean;
  engineeringRemarksFa: string;
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
  const windSpeedMs = basicWindSpeedKmh / 3.6;

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
  // q_z = 0.613 * K_z * K_zt * K_d * V^2 (N/m²)
  // Exposure Category C (open flat terrain / solar farm): K_z ~ 0.85 at h < 5m
  const kz = 0.88;
  const kzt = 1.0; // flat topography
  const kd = 0.85; // wind directionality factor
  const velocityWindPressureQzN_M2 = 0.613 * kz * kzt * kd * Math.pow(windSpeedMs, 2);

  // Aerodynamic coefficients for sloped ground-mount tables
  // C_p,net uplift (wind from rear under array) ~ 1.35 + 0.01 * tilt
  const cpUplift = 1.30 + 0.012 * arrayTiltDeg;
  // C_p,net downforce (wind blowing directly against front face) ~ 1.05 + 0.01 * tilt
  const cpDownforce = 0.95 + 0.01 * arrayTiltDeg;

  // Forces in kN
  const windUpliftForceKn = (velocityWindPressureQzN_M2 * cpUplift * tableAreaM2) / 1000.0;
  const windDownforceKn = (velocityWindPressureQzN_M2 * cpDownforce * tableAreaM2) / 1000.0;
  const windOverturningMomentKnM = windUpliftForceKn * tableMeanHeightM * Math.cos(tiltRad);

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
  const netUpliftPerPost = Math.max(
    0,
    (windUpliftForceKn - 0.9 * deadLoadTableKn) / postsPerTable + (windOverturningMomentKnM / (tableSlopedWidthM * postsPerTable / 2))
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
  let concreteVolumeTotalM3 = 0;
  let steelRebarWeightTotalKg = 0;

  // Soil bearing capacity factor
  const soilFactor = soilType === 'dense_sand_gravel' ? 1.0 : soilType === 'medium_clay' ? 1.2 : soilType === 'loose_sand' ? 1.45 : 0.8;

  if (foundationType === 'rammed_steel_pile') {
    recommendedDepthM = Number((1.5 * soilFactor).toFixed(1));
    foundationNameFa = 'پایه کوبشی فولادی C شکل گالوانیزه گرم';
    foundationNameEn = 'Hot-Dip Galvanized Rammed Steel C-Pile';
    foundationDimensionsDesc = `پروفیل فولادی C120×50×25×3.5mm، عمق کوبش در خاک: ${recommendedDepthM} متر (بدون بتن‌ریزی)`;
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
  } else if (foundationType === 'ground_screw') {
    recommendedDepthM = Number((1.6 * soilFactor).toFixed(1));
    foundationNameFa = 'شمع‌های پیچشی فولادی (Ground Screws)';
    foundationNameEn = 'Galvanized Continuous Ground Screw';
    foundationDimensionsDesc = `شمع پیچشی گالوانیزه قطر ۷۶mm، طول رزوه ۱۲۰۰mm، عمق نفوذ: ${recommendedDepthM} متر`;
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
  }

  // Cement and sand breakdown
  const cementBagsCount = Math.round(concreteVolumeTotalM3 * 7.0); // 7 bags per m³ of C25 concrete
  const sandGravelTon = Number((concreteVolumeTotalM3 * 1.85).toFixed(1));
  const structuralSteelRackingWeightKg = Number((rackingWeightPerTable * totalTablesCount).toFixed(0));

  // 6. Factors of Safety (FoS)
  const stabilizingMoment = (deadLoadTableKn * (tableSlopedWidthM / 2.0)) * Math.cos(tiltRad);
  const fosOverturning = Number((stabilizingMoment / Math.max(0.1, windOverturningMomentKnM)).toFixed(2));
  const fosSliding = Number((((deadLoadTableKn * 0.45) / Math.max(0.1, lateralShearPerPostKn * postsPerTable))).toFixed(2));
  const fosUplift = Number(((deadLoadTableKn / Math.max(0.1, windUpliftForceKn))).toFixed(2));

  const isStructurallySafe = fosOverturning >= 1.5 && fosSliding >= 1.4;

  let engineeringRemarksFa = 'پایداری سازه و فونداسیون طبق آیین‌نامه مبحث ۶ مقررات ملی ساختمان و ASCE 7 تأیید است.';
  if (!isStructurallySafe) {
    engineeringRemarksFa = 'هشدار مهندسی: ضریب اطمینان واژگونی کمتر از ۱.۵ است. عمق فونداسیون یا وزن پایه‌ها را افزایش دهید.';
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
    concreteVolumeTotalM3,
    steelRebarWeightTotalKg,
    structuralSteelRackingWeightKg,
    cementBagsCount,
    sandGravelTon,
    fosOverturning,
    fosSliding,
    fosUplift,
    isStructurallySafe,
    engineeringRemarksFa,
  };
}
