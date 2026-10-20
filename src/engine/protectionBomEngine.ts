// Cable Sizing, Voltage Drop & Protection BOM Engine (IEC 60364-5-52 & IEC 62548)

export interface CableRunCalculation {
  sectionNameFa: string;
  sectionNameEn: string;
  oneWayLengthM: number;
  designCurrentAmps: number;
  nominalVoltageVolts: number;
  conductorMaterial: 'copper' | 'aluminum';
  allowableDropPct: number;
  calculatedCrossSectionMm2: number;
  selectedStandardCrossSectionMm2: number;
  actualVoltageDropVolts: number;
  actualVoltageDropPct: number;
  isCompliant: boolean;
}

export interface ProtectionBomItem {
  id: string;
  category: 'fuse' | 'breaker' | 'spd' | 'rcd' | 'isolator';
  deviceFa: string;
  deviceEn: string;
  specificationFa: string;
  rating: string;
  quantity: number;
  locationFa: string;
}

export interface ProtectionAnalysisResult {
  cableRuns: CableRunCalculation[];
  protectionBom: ProtectionBomItem[];
  earthingElectrodeLengthM: number;
  earthingConductorMm2: number;
}

const STANDARD_CABLE_SECTIONS_MM2 = [2.5, 4.0, 6.0, 10.0, 16.0, 25.0, 35.0, 50.0, 70.0, 95.0, 120.0, 150.0, 185.0, 240.0];

export function calculateCableRun(
  sectionNameFa: string,
  sectionNameEn: string,
  oneWayLengthM: number,
  designCurrentAmps: number,
  nominalVoltageVolts: number,
  conductorMaterial: 'copper' | 'aluminum' = 'copper',
  allowableDropPct: number = 1.5
): CableRunCalculation {
  const gamma = conductorMaterial === 'copper' ? 56.0 : 35.0; // m/(ohm*mm2)
  const allowableDropVolts = (allowableDropPct / 100.0) * nominalVoltageVolts;

  // Formula: S = (2 * L * I) / (gamma * DeltaV)
  const calculatedCrossSectionMm2 = (2.0 * oneWayLengthM * designCurrentAmps) / (gamma * allowableDropVolts);

  // Select next higher standard cross section
  const selectedStandard = STANDARD_CABLE_SECTIONS_MM2.find(s => s >= calculatedCrossSectionMm2)
    || STANDARD_CABLE_SECTIONS_MM2[STANDARD_CABLE_SECTIONS_MM2.length - 1];

  // Actual voltage drop with selected cable
  const actualVoltageDropVolts = (2.0 * oneWayLengthM * designCurrentAmps) / (gamma * selectedStandard);
  const actualVoltageDropPct = (actualVoltageDropVolts / nominalVoltageVolts) * 100.0;
  const isCompliant = actualVoltageDropPct <= allowableDropPct;

  return {
    sectionNameFa,
    sectionNameEn,
    oneWayLengthM,
    designCurrentAmps,
    nominalVoltageVolts,
    conductorMaterial,
    allowableDropPct,
    calculatedCrossSectionMm2,
    selectedStandardCrossSectionMm2: selectedStandard,
    actualVoltageDropVolts,
    actualVoltageDropPct,
    isCompliant,
  };
}

export function generateProtectionBom(
  parallelStringsCount: number,
  stringIscAmps: number,
  stringVocMaxVolts: number,
  inverterKw: number,
  inverterDcContinuousCurrentAmps: number,
  systemDcVoltage: number,
  isThreePhase: boolean
): ProtectionAnalysisResult {
  // 1. Cables sizing
  // Section A: PV Array to Inverter (DC String, typical 20m)
  const arrayToInverterCable = calculateCableRun(
    "کابل DC استرینگ آرایه خورشیدی به اینورتر",
    "PV Array to Inverter (DC)",
    25.0,
    stringIscAmps * 1.25,
    stringVocMaxVolts * 0.85, // Operating Vmp
    'copper',
    1.5
  );

  // Section B: Inverter to Battery (Heavy DC, typical 3m)
  const inverterToBatteryCable = calculateCableRun(
    "کابل DC باسبار باتری به اینورتر",
    "Battery Bank to Inverter (DC)",
    3.0,
    inverterDcContinuousCurrentAmps * 1.25,
    systemDcVoltage,
    'copper',
    1.0 // Low drop for battery run
  );

  // Section C: Inverter to AC Distribution Board (typical 15m)
  const acVoltage = isThreePhase ? 400.0 : 230.0;
  const acCurrent = isThreePhase
    ? (inverterKw * 1000.0) / (Math.sqrt(3) * 400.0 * 0.95)
    : (inverterKw * 1000.0) / (230.0 * 0.95);

  const inverterToAcBoardCable = calculateCableRun(
    "کابل خروجی AC اینورتر به تابلوی توزیع",
    "Inverter to AC Distribution Board",
    15.0,
    acCurrent * 1.25,
    acVoltage,
    'copper',
    1.5
  );

  // 2. Protection BOM Items
  const bom: ProtectionBomItem[] = [];

  // A. gPV DC Fuses (per string if parallel >= 2)
  const gPvRating = Math.max(15, Math.ceil(stringIscAmps * 1.5 / 5) * 5);
  bom.push({
    id: 'bom-1',
    category: 'fuse',
    deviceFa: 'فیوز فتوولتائیک gPV سیلندری ۱۰×۳۸ به همراه پایه فیوز ریلی',
    deviceEn: 'gPV DC String Fuse with DIN Rail Fuse Holder',
    specificationFa: `${gPvRating}A / 1000V DC (IEC 60269-6)`,
    rating: `${gPvRating}A 1000VDC`,
    quantity: parallelStringsCount * 2, // Positive and negative poles
    locationFa: 'تابلوی تجمیع DC (Combiner Box)',
  });

  // B. DC Isolator / MCB
  const dcMcbRating = Math.max(20, Math.ceil((stringIscAmps * parallelStringsCount * 1.25) / 5) * 5);
  bom.push({
    id: 'bom-2',
    category: 'breaker',
    deviceFa: 'کلید مینیاتوری DC دو پل غیرحرارتی خورشیدی',
    deviceEn: '2-Pole DC Miniature Circuit Breaker (MCB)',
    specificationFa: `${dcMcbRating}A / 1000V DC قطبیت‌دار`,
    rating: `${dcMcbRating}A 1000VDC`,
    quantity: 1,
    locationFa: 'ورودی DC اینورتر',
  });

  // C. DC Surge Protective Device (Type II SPD)
  bom.push({
    id: 'bom-3',
    category: 'spd',
    deviceFa: 'سرج ارستر صاعقه‌گیر DC کلاس II خورشیدی',
    deviceEn: 'Type II DC Surge Protective Device (SPD)',
    specificationFa: `Ucpv: 1000V DC, In: 20kA, Imax: 40kA (IEC 61643-32)`,
    rating: `1000VDC / 40kA`,
    quantity: 1,
    locationFa: 'تابلوی ورودی DC آرایه',
  });

  // D. Battery Mega/ANL DC Fuse
  const batFuseRating = Math.max(100, Math.ceil((inverterDcContinuousCurrentAmps * 1.35) / 25) * 25);
  bom.push({
    id: 'bom-4',
    category: 'fuse',
    deviceFa: 'فیوز پرسرعت مگا / ANL ویژه باتری به همراه پایه عایق',
    deviceEn: 'Mega/ANL Fast-Acting DC Battery Fuse',
    specificationFa: `${batFuseRating}A / 58V DC Interrupting Rating 2000A`,
    rating: `${batFuseRating}A DC`,
    quantity: 1,
    locationFa: 'سر قطب مثبت (+) بانک باتری',
  });

  // E. AC MCB
  const acMcbRating = Math.max(16, Math.ceil((acCurrent * 1.3) / 5) * 5);
  bom.push({
    id: 'bom-5',
    category: 'breaker',
    deviceFa: isThreePhase ? 'کلید مینیاتوری AC چهار پل (4P)' : 'کلید مینیاتوری AC دو پل (2P)',
    deviceEn: isThreePhase ? '4-Pole AC MCB (Curve C)' : '2-Pole AC MCB (Curve C)',
    specificationFa: `${acMcbRating}A / ${isThreePhase ? '400V' : '230V'} 6kA (IEC 60898)`,
    rating: `${acMcbRating}A AC`,
    quantity: 1,
    locationFa: 'خروجی AC اینورتر',
  });

  // F. AC Type II SPD
  bom.push({
    id: 'bom-6',
    category: 'spd',
    deviceFa: 'سرج ارستر AC کلاس II تابلویی',
    deviceEn: 'Type II AC Surge Protective Device',
    specificationFa: `Uc: 275V/440V AC, In: 20kA, Imax: 40kA`,
    rating: `275/440VAC 40kA`,
    quantity: 1,
    locationFa: 'تابلوی توزیع AC اصلی',
  });

  // G. Type B RCD for Solar PV (IEC 62477-1)
  bom.push({
    id: 'bom-7',
    category: 'rcd',
    deviceFa: 'کلید محافظ جان خطای نشتی جریان نوع B (Type B RCD)',
    deviceEn: 'Type B Residual Current Device (RCD)',
    specificationFa: `${acMcbRating}A / 30mA حساس به نشتی‌های جریان مستقیم DC و AC فرکانس بالا`,
    rating: `30mA Type B`,
    quantity: 1,
    locationFa: 'خط تغذیه بارهای حساس AC',
  });

  return {
    cableRuns: [arrayToInverterCable, inverterToBatteryCable, inverterToAcBoardCable],
    protectionBom: bom,
    earthingElectrodeLengthM: 3.0,
    earthingConductorMm2: 16.0,
  };
}
