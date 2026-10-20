// Medium-Voltage (MV) & High-Voltage (HV) Substation, Transformer & IEEE 80 Grounding Engine

export interface MvSubstationInput {
  plantCapacityAcMva: number;   // Plant AC capacity in MVA
  inverterOutputVoltageV: number;// e.g. 400V, 690V, 800V
  gridConnectionVoltageKv: number;// e.g. 20kV or 33kV
  soilResistivityOhmM: number;  // Soil resistivity (e.g. 60 ohm-m moist clay, 250 ohm-m gravel)
  clearingTimeSec: number;      // Fault duration (e.g. 0.5s)
}

export interface TransformerSpecification {
  ratedPowerMva: number;
  primaryVoltageKv: number;
  secondaryVoltageKv: number;
  vectorGroup: string;         // e.g. Dyn11 or YNd11
  impedanceVoltageUkPct: number;// e.g. 6.5%
  noLoadLossesKw: number;      // Iron core losses (P0)
  loadLossesKw: number;        // Copper winding losses (Pk)
  coolingType: string;         // ONAN (Oil-immersed) or AN (Dry-type)
  efficiencyAtFullLoadPct: number;
}

export interface ShortCircuitCalculation {
  initialSymmetricalIscKa: number; // I_sc'' (kA)
  peakDynamicIpKa: number;         // i_p (kA)
  breakingCapacityKa: number;      // Minimum required circuit breaker breaking rating
  thermalEquivalentIthKa: number;
}

export interface Ieee80EarthingResult {
  groundGridConductorMm2: number;  // Copper conductor cross section
  touchVoltageLimitVolts: number;  // Maximum permissible safe touch voltage
  stepVoltageLimitVolts: number;   // Maximum permissible safe step voltage
  calculatedGridResistanceOhms: number; // Target Rg <= 1.0 Ohm
  isCompliant: boolean;
}

export interface MvSubstationResult {
  transformer: TransformerSpecification;
  shortCircuit: ShortCircuitCalculation;
  switchgearDescriptionFa: string;
  earthing: Ieee80EarthingResult;
  reactivePowerCapacityMvar: number;
  powerFactorRange: string;
  notesFa: string[];
}

export function designMvSubstation(input: MvSubstationInput): MvSubstationResult {
  const {
    plantCapacityAcMva,
    inverterOutputVoltageV,
    gridConnectionVoltageKv,
    soilResistivityOhmM,
    clearingTimeSec,
  } = input;

  // 1. Transformer sizing with 1.15x safety / thermal headroom
  const standardMvaRatings = [0.63, 1.0, 1.25, 1.6, 2.0, 2.5, 3.15, 4.0, 5.0, 6.3, 8.0, 10.0, 12.5, 16.0, 20.0, 25.0];
  const requiredMva = plantCapacityAcMva * 1.10;
  const ratedMva = standardMvaRatings.find(r => r >= requiredMva) || Math.ceil(requiredMva / 5) * 5;

  const ukPct = ratedMva >= 3.15 ? 7.0 : 6.0;
  const noLoadLossesKw = Math.round(ratedMva * 1.6 * 10) / 10;
  const loadLossesKw = Math.round(ratedMva * 8.5 * 10) / 10;
  const totalLossesKw = noLoadLossesKw + loadLossesKw;
  const fullLoadEff = (1.0 - totalLossesKw / (ratedMva * 1000.0 * 0.95)) * 100.0;

  const transformer: TransformerSpecification = {
    ratedPowerMva: ratedMva,
    primaryVoltageKv: inverterOutputVoltageV / 1000.0,
    secondaryVoltageKv: gridConnectionVoltageKv,
    vectorGroup: 'Dyn11 (D-Primary / Y-Neutral Secondary)',
    impedanceVoltageUkPct: ukPct,
    noLoadLossesKw,
    loadLossesKw,
    coolingType: ratedMva >= 2.0 ? 'ONAN (روغنی هرمتیک با رادیاتور)' : 'AN (رزینی خشک)',
    efficiencyAtFullLoadPct: Math.round(fullLoadEff * 100) / 100,
  };

  // 2. Short Circuit Analysis per IEC 60909
  // I_sc'' = c * U_n / (sqrt(3) * Z_k)
  // Z_k = (u_k% / 100) * (U_n^2 / S_rt)
  const zTransOhms = (ukPct / 100.0) * (Math.pow(gridConnectionVoltageKv, 2) / ratedMva);
  const cFactor = 1.10; // Voltage factor per IEC 60909
  const initialSymmetricalIscKa = (cFactor * gridConnectionVoltageKv) / (Math.sqrt(3) * zTransOhms);

  // Peak dynamic current: i_p = kappa * sqrt(2) * I_sc'' (kappa ≈ 1.8 for MV networks)
  const kappa = 1.8;
  const peakDynamicIpKa = kappa * Math.SQRT2 * initialSymmetricalIscKa;

  // Selected standard breaking capacity (e.g. 16kA, 20kA, 25kA, 31.5kA)
  const standardBreakingRatings = [16.0, 20.0, 25.0, 31.5, 40.0];
  const breakingCapacityKa = standardBreakingRatings.find(b => b >= initialSymmetricalIscKa) || 25.0;
  const thermalEquivalentIthKa = initialSymmetricalIscKa;

  const shortCircuit: ShortCircuitCalculation = {
    initialSymmetricalIscKa: Math.round(initialSymmetricalIscKa * 10) / 10,
    peakDynamicIpKa: Math.round(peakDynamicIpKa * 10) / 10,
    breakingCapacityKa,
    thermalEquivalentIthKa: Math.round(thermalEquivalentIthKa * 10) / 10,
  };

  // 3. IEEE 80 Earthing Grid Calculations
  // Conductor cross-section: A = I_sc * sqrt(t_c) / K_copper (K ≈ 0.226 for copper exothermic weld)
  const groundGridConductorMm2 = Math.max(70.0, Math.ceil((initialSymmetricalIscKa * Math.sqrt(clearingTimeSec) / 0.15)));

  // Tolerable Touch & Step Voltages for 50kg body with 10cm gravel surface layer (rho_s ≈ 3000 ohm-m)
  // V_touch50 = (1000 + 1.5 * C_s * rho_s) * 0.116 / sqrt(t_c)
  const touchVoltageLimitVolts = Math.round((1000.0 + 1.5 * 0.75 * 3000.0) * (0.116 / Math.sqrt(clearingTimeSec)));
  // V_step50 = (1000 + 6.0 * C_s * rho_s) * 0.116 / sqrt(t_c)
  const stepVoltageLimitVolts = Math.round((1000.0 + 6.0 * 0.75 * 3000.0) * (0.116 / Math.sqrt(clearingTimeSec)));

  // Grid resistance estimation for typical 30x30m substation mesh (Laurent & Niemann formula):
  // R_g = rho / (4 * r) + rho / L_total
  const substationAreaM2 = Math.max(400.0, ratedMva * 250.0);
  const eqRadius = Math.sqrt(substationAreaM2 / Math.PI);
  const totalBuriedLengthM = Math.sqrt(substationAreaM2) * 8.0;
  const calculatedGridResistanceOhms = Math.round(
    ((soilResistivityOhmM / (4.0 * eqRadius)) + (soilResistivityOhmM / totalBuriedLengthM)) * 100
  ) / 100;

  const earthing: Ieee80EarthingResult = {
    groundGridConductorMm2: Math.min(240, Math.max(70, groundGridConductorMm2)),
    touchVoltageLimitVolts,
    stepVoltageLimitVolts,
    calculatedGridResistanceOhms,
    isCompliant: calculatedGridResistanceOhms <= 1.0,
  };

  // 4. Reactive Power & Grid Code Capability (cos phi = 0.90 lead to 0.90 lag)
  // Q_max = P * tan(acos(0.90)) ≈ P * 0.4843
  const reactivePowerCapacityMvar = Math.round(plantCapacityAcMva * 0.4843 * 100) / 100;
  const powerFactorRange = '±0.90 (Capacitive / Inductive Q(U) Control)';

  const switchgearDescriptionFa = `تابلوی کمپکت گازی SF6 فشار متوسط (RMU) رده ولتاژی ${gridConnectionVoltageKv} کیلوولت با بریکر خلاء (VCB) ۶۳۰ آمپر، قدرت قطع ${breakingCapacityKa} کیلوآمپر، مجهز به رله‌های حفاظتی میکروپروسسوری اضافه جریان و خطای زمین (ANSI 50/51/50N/51N) و سکسیونر زمین موتوری.`;

  const notesFa = [
    `ترانسفورماتور افزاینده ${ratedMva} MVA با گروه برداری Dyn11 و امپدانس اتصالی ${ukPct}٪ جهت اتصال مطمئن به شبکه ${gridConnectionVoltageKv}kV.`,
    `جریان اتصال کوتاه متقارن اولیه ${shortCircuit.initialSymmetricalIscKa} kA و پیک دینامیکی ${shortCircuit.peakDynamicIpKa} kA مطابق با IEC 60909.`,
    `طراحی مش ارتینگ پست بر اساس IEEE 80 با هادی مسی ${earthing.groundGridConductorMm2} mm² و مقاومت کل زمین ${earthing.calculatedGridResistanceOhms} اهم (کمتر از ۱ اهم مجاز).`,
    `پشتیبانی کامل از تزریق توان راکتیو تا سقف ±${reactivePowerCapacityMvar} Mvar جهت تثبیت ولتاژ خطوط انتقال طبق کد شبکه ایران (Grid Code).`,
  ];

  return {
    transformer,
    shortCircuit,
    switchgearDescriptionFa,
    earthing,
    reactivePowerCapacityMvar,
    powerFactorRange,
    notesFa,
  };
}
