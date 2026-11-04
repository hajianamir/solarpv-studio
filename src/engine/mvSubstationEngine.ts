// Medium-Voltage (MV) & High-Voltage (HV) Substation, Transformer & IEEE 80 Grounding Engine
// Governed by:
// - IEC 60076 (Power Transformers) with ambient temperature and altitude derating
// - IEC 60909 (Short-circuit currents in three-phase a.c. systems)
// - IEC 62271-200 (A.C. metal-enclosed switchgear and controlgear)
// - IEEE 80-2013 (Guide for Safety in AC Substation Grounding)
// - IEC 60099-4 (Surge arresters)

export interface MvSubstationInput {
  plantCapacityAcMva: number;   // Plant AC capacity in MVA
  inverterOutputVoltageV: number;// e.g. 400V, 690V, 800V
  gridConnectionVoltageKv: number;// e.g. 20kV, 33kV, 63kV
  soilResistivityOhmM: number;  // Soil resistivity (e.g. 60 ohm-m moist clay, 250 ohm-m gravel)
  clearingTimeSec: number;      // Fault duration (e.g. 0.5s)
  ambientTempC?: number;        // Site maximum ambient temp (e.g. 45°C)
  elevationM?: number;          // Site elevation (e.g. 1400m)
  upstreamGridShortCircuitMva?: number; // Upstream utility short-circuit capacity (e.g. 500 MVA)
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
  // Derating breakdown per IEC 60076
  temperatureDeratingPct: number;
  altitudeDeratingPct: number;
  harmonicDeratingPct: number;
  effectiveCapacityUnderSiteConditionsMva: number;
}

export interface ShortCircuitCalculation {
  initialSymmetricalIscKa: number; // I_sc'' (kA)
  peakDynamicIpKa: number;         // i_p (kA)
  breakingCapacityKa: number;      // Minimum required circuit breaker breaking rating
  thermalEquivalentIthKa: number;
  upstreamGridMva: number;
  totalImpedanceOhms: number;
}

export interface Ieee80EarthingResult {
  groundGridConductorMm2: number;  // Copper conductor cross section
  touchVoltageLimitVolts: number;  // Maximum permissible safe touch voltage
  stepVoltageLimitVolts: number;   // Maximum permissible safe step voltage
  calculatedGridResistanceOhms: number; // Target Rg <= 1.0 Ohm
  isCompliant: boolean;
  actualMeshVoltageVolts: number;
  actualStepVoltageVolts: number;
  isTouchSafe: boolean;
  isStepSafe: boolean;
}

export interface AuxiliaryTransformerSpec {
  ratedKva: number;
  voltageRatio: string;
  loadLossesW: number;
  purposeFa: string;
  purposeEn: string;
}

export interface MvCableSpec {
  crossSectionMm2: number;
  cableDesignationFa: string;
  cableDesignationEn: string;
  nominalCurrentAmps: number;
  screenCrossSectionMm2: number;
}

export interface SurgeArresterSpec {
  ratedVoltageUrKv: number;
  continuousOperatingVoltageMcovKv: number;
  nominalDischargeCurrentKa: number;
  energyClass: string;
  specificationFa: string;
}

export interface MvSubstationResult {
  transformer: TransformerSpecification;
  shortCircuit: ShortCircuitCalculation;
  switchgearDescriptionFa: string;
  earthing: Ieee80EarthingResult;
  auxiliaryTransformer: AuxiliaryTransformerSpec;
  mvCollectorCable: MvCableSpec;
  surgeArrester: SurgeArresterSpec;
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
    ambientTempC = 42.0,
    elevationM = 1200.0,
    upstreamGridShortCircuitMva = 500.0,
  } = input;

  // 1. Transformer Sizing with IEC 60076 Environmental Deratings:
  // - Ambient Temperature Derating: 1% per °C above 40°C
  const tempDeratePct = Math.max(0, (ambientTempC - 40.0) * 1.0);
  // - Altitude Derating: 0.4% per 100m above 1000m for oil-immersed transformers
  const altDeratePct = Math.max(0, ((elevationM - 1000.0) / 100.0) * 0.4);
  // - Inverter Harmonic Current Derating (K-factor = 4 for solar inverters, ~4% thermal reserve)
  const harmonicDeratePct = 4.0;

  const totalDeratingFactor =
    (1.0 - tempDeratePct / 100.0) *
    (1.0 - altDeratePct / 100.0) *
    (1.0 - harmonicDeratePct / 100.0);

  // Sizing formula with 10% operational margin divided by derating factor
  const requiredMva = (plantCapacityAcMva * 1.10) / Math.max(0.75, totalDeratingFactor);

  const standardMvaRatings = [0.63, 1.0, 1.25, 1.6, 2.0, 2.5, 3.15, 4.0, 5.0, 6.3, 8.0, 10.0, 12.5, 16.0, 20.0, 25.0, 31.5, 40.0];
  const ratedMva = standardMvaRatings.find((r) => r >= requiredMva) || Math.ceil(requiredMva / 5) * 5;
  const effectiveCapacity = Number((ratedMva * totalDeratingFactor).toFixed(2));

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
    temperatureDeratingPct: Number(tempDeratePct.toFixed(1)),
    altitudeDeratingPct: Number(altDeratePct.toFixed(1)),
    harmonicDeratingPct: harmonicDeratePct,
    effectiveCapacityUnderSiteConditionsMva: effectiveCapacity,
  };

  // 2. Short Circuit Analysis per IEC 60909
  // Total impedance Z_k = Z_grid + Z_trafo
  const cFactor = 1.10;
  const zGridOhms = (cFactor * Math.pow(gridConnectionVoltageKv, 2)) / upstreamGridShortCircuitMva;
  const zTransOhms = (ukPct / 100.0) * (Math.pow(gridConnectionVoltageKv, 2) / ratedMva);
  const zTotalOhms = zGridOhms + zTransOhms;

  const initialSymmetricalIscKa = (cFactor * gridConnectionVoltageKv) / (Math.sqrt(3) * zTotalOhms);

  // Peak dynamic current: i_p = kappa * sqrt(2) * I_sc'' (kappa ≈ 1.8 for MV networks)
  const kappa = 1.8;
  const peakDynamicIpKa = kappa * Math.SQRT2 * initialSymmetricalIscKa;

  // Selected standard breaking capacity (e.g. 16kA, 20kA, 25kA, 31.5kA)
  const standardBreakingRatings = [16.0, 20.0, 25.0, 31.5, 40.0];
  const breakingCapacityKa = standardBreakingRatings.find((b) => b >= initialSymmetricalIscKa) || 25.0;
  const thermalEquivalentIthKa = initialSymmetricalIscKa;

  const shortCircuit: ShortCircuitCalculation = {
    initialSymmetricalIscKa: Math.round(initialSymmetricalIscKa * 10) / 10,
    peakDynamicIpKa: Math.round(peakDynamicIpKa * 10) / 10,
    breakingCapacityKa,
    thermalEquivalentIthKa: Math.round(thermalEquivalentIthKa * 10) / 10,
    upstreamGridMva: upstreamGridShortCircuitMva,
    totalImpedanceOhms: Number(zTotalOhms.toFixed(3)),
  };

  // 3. IEEE 80 Earthing Grid Calculations
  const groundGridConductorMm2 = Math.max(70.0, Math.ceil((initialSymmetricalIscKa * Math.sqrt(clearingTimeSec)) / 0.15));

  // Tolerable Touch & Step Voltages for 50kg body with 10cm gravel surface layer (rho_s ≈ 3000 ohm-m)
  const cs = 1.0 - (0.09 * (1.0 - soilResistivityOhmM / 3000.0)) / (2.0 * 0.10 + 0.09);
  const touchVoltageLimitVolts = Math.round((1000.0 + 1.5 * cs * 3000.0) * (0.116 / Math.sqrt(clearingTimeSec)));
  const stepVoltageLimitVolts = Math.round((1000.0 + 6.0 * cs * 3000.0) * (0.116 / Math.sqrt(clearingTimeSec)));

  // Grid resistance estimation for substation mesh (Sverak formula):
  const substationAreaM2 = Math.max(400.0, ratedMva * 250.0);
  const totalBuriedLengthM = Math.sqrt(substationAreaM2) * 8.0;
  const hDepthM = 0.8;
  const sverakTerm = (1.0 / Math.sqrt(20.0 * substationAreaM2)) * (1.0 + 1.0 / (1.0 + hDepthM * Math.sqrt(20.0 / substationAreaM2)));
  const calculatedGridResistanceOhms = Math.round(soilResistivityOhmM * (1.0 / totalBuriedLengthM + sverakTerm) * 100) / 100;

  // Actual mesh and step voltages
  const ifaultKa = initialSymmetricalIscKa * 0.7; // ground fault split factor
  const actualMesh = Math.round((soilResistivityOhmM * ifaultKa * 1000.0 * 0.65) / (totalBuriedLengthM * 1.5));
  const actualStep = Math.round((soilResistivityOhmM * ifaultKa * 1000.0 * 0.35) / (totalBuriedLengthM * 1.2));

  const earthing: Ieee80EarthingResult = {
    groundGridConductorMm2: Math.min(240, Math.max(70, groundGridConductorMm2)),
    touchVoltageLimitVolts,
    stepVoltageLimitVolts,
    calculatedGridResistanceOhms,
    isCompliant: calculatedGridResistanceOhms <= 1.0,
    actualMeshVoltageVolts: actualMesh,
    actualStepVoltageVolts: actualStep,
    isTouchSafe: actualMesh <= touchVoltageLimitVolts,
    isStepSafe: actualStep <= stepVoltageLimitVolts,
  };

  // 4. Auxiliary Station Service Transformer (مصارف داخلی)
  const auxKva = ratedMva >= 10.0 ? 100 : ratedMva >= 3.0 ? 50 : 25;
  const auxiliaryTransformer: AuxiliaryTransformerSpec = {
    ratedKva: auxKva,
    voltageRatio: `${gridConnectionVoltageKv} kV / 0.4 kV`,
    loadLossesW: auxKva * 20,
    purposeFa: 'تأمین برق تابلوی مصارف داخلی، سیستم مانیتورینگ SCADA، موتورهای ترکر، روشنایی پست، سیستم اطفاء حریق و شارژر باتریخانه',
    purposeEn: 'Auxiliary station power for SCADA RTU, tracker drive motors, perimeter CCTV, substation lighting, and UPS battery chargers',
  };

  // 5. MV Collector Cable Sizing (Secondary to Switchgear)
  const mvCurrentAmps = Number(((plantCapacityAcMva * 1000.0) / (Math.sqrt(3) * gridConnectionVoltageKv)).toFixed(1));
  const mvCrossSection = mvCurrentAmps > 200 ? 240 : mvCurrentAmps > 130 ? 185 : mvCurrentAmps > 80 ? 120 : 70;
  const mvCollectorCable: MvCableSpec = {
    crossSectionMm2: mvCrossSection,
    cableDesignationFa: `کابل فشار متوسط آلومینیوم تک‌رشته 3x(1x${mvCrossSection} mm²) AL/XLPE/CTS/PVC ${gridConnectionVoltageKv}kV`,
    cableDesignationEn: `3x(1x${mvCrossSection}mm²) AL/XLPE/CTS/PVC ${gridConnectionVoltageKv}kV single-core cable`,
    nominalCurrentAmps: mvCurrentAmps,
    screenCrossSectionMm2: 25, // 25mm² copper tape screen for earth fault return
  };

  // 6. Surge Arrester (IEC 60099-4)
  const mcovKv = Number(((gridConnectionVoltageKv * 1.05) / Math.sqrt(3)).toFixed(1));
  const ratedUrKv = gridConnectionVoltageKv === 20 ? 24 : gridConnectionVoltageKv === 33 ? 36 : 72.5;
  const surgeArrester: SurgeArresterSpec = {
    ratedVoltageUrKv: ratedUrKv,
    continuousOperatingVoltageMcovKv: mcovKv,
    nominalDischargeCurrentKa: 10,
    energyClass: 'Class 2 (Heavy Duty Station Arrester - 5.0 kJ/kV)',
    specificationFa: `برقگیر اکسید روی پلیمری ایستگاهی ${ratedUrKv}kV / 10kA کلاس ۲ (IEC 60099-4)`,
  };

  // 7. Reactive Power & Grid Code Capability
  const reactivePowerCapacityMvar = Math.round(plantCapacityAcMva * 0.4843 * 100) / 100;
  const powerFactorRange = '±0.90 (Capacitive / Inductive Q(U) Control)';

  const switchgearDescriptionFa = `تابلوی کمپکت گازی SF6 فشار متوسط (RMU) رده ولتاژی ${gridConnectionVoltageKv} کیلوولت با بریکر خلاء (VCB) ۶۳۰ آمپر، قدرت قطع ${breakingCapacityKa} کیلوآمپر، مجهز به رله‌های حفاظتی میکروپروسسوری اضافه جریان و خطای زمین (ANSI 50/51/50N/51N) و سکسیونر زمین موتوری.`;

  const notesFa = [
    `ترانسفورماتور افزاینده ${ratedMva} MVA (ظرفیت مؤثر ${effectiveCapacity} MVA با لحاظ افت دمایی ${tempDeratePct}٪ و ارتفاعی ${altDeratePct}٪) با گروه برداری Dyn11 و امپدانس اتصالی ${ukPct}٪ جهت اتصال مطمئن به شبکه ${gridConnectionVoltageKv}kV.`,
    `جریان اتصال کوتاه متقارن اولیه ${shortCircuit.initialSymmetricalIscKa} kA و پیک دینامیکی ${shortCircuit.peakDynamicIpKa} kA مطابق با IEC 60909 (با احتساب امپدانس شبکه بالادست ${upstreamGridShortCircuitMva} MVA).`,
    `طراحی مش ارتینگ پست بر اساس IEEE 80 با هادی مسی ${earthing.groundGridConductorMm2} mm² و مقاومت کل زمین ${earthing.calculatedGridResistanceOhms} اهم (تأمین ولتاژ گام و لمس مجاز).`,
    `تعبیه ترانسفورماتور مصارف داخلی ${auxiliaryTransformer.ratedKva} kVA جهت تغذیه بدون وقفه SCADA، سیستم‌های حفاظتی و درایوهای ترکر.`,
    `پشتیبانی کامل از تزریق توان راکتیو تا سقف ±${reactivePowerCapacityMvar} Mvar جهت تثبیت ولتاژ خطوط انتقال طبق کد شبکه ایران (Grid Code).`,
  ];

  return {
    transformer,
    shortCircuit,
    switchgearDescriptionFa,
    earthing,
    auxiliaryTransformer,
    mvCollectorCable,
    surgeArrester,
    reactivePowerCapacityMvar,
    powerFactorRange,
    notesFa,
  };
}
