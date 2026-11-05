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
  ratedPeakMakingCapacityKa: number; // Rated peak making capacity (2.5 * breaking capacity per IEC 62271-100)
  thermalEquivalentIthKa: number;  // I_th (kA)
  upstreamGridMva: number;
  totalImpedanceOhms: number;
  rEquivalentOhms: number;
  xEquivalentOhms: number;
  rOverXRatio: number;
  kappa: number;
  isBreakerSufficient: boolean;
  selectedBreakerModel: string;
  selectedBreakerManufacturer: string;
  ratedShortTimeDurationSec: number;
  operatingSequence: string;
}

export interface MvBreakerCatalogModel {
  modelDesignation: string;
  manufacturer: string;
  ratedVoltageKv: number;
  ratedNormalCurrentAmps: number;
  ratedBreakingCapacityKa: number;
  ratedPeakMakingCapacityKa: number;
  ratedShortTimeWithstandKa: number;
  ratedShortTimeDurationSec: number;
  operatingSequence: string;
}

export const STANDARD_MV_BREAKERS: MvBreakerCatalogModel[] = [
  {
    modelDesignation: 'ABB VD4/P 24.06.16',
    manufacturer: 'ABB',
    ratedVoltageKv: 24,
    ratedNormalCurrentAmps: 630,
    ratedBreakingCapacityKa: 16.0,
    ratedPeakMakingCapacityKa: 40.0,
    ratedShortTimeWithstandKa: 16.0,
    ratedShortTimeDurationSec: 3.0,
    operatingSequence: 'O - 0.3s - CO - 15s - CO',
  },
  {
    modelDesignation: 'ABB VD4/P 24.12.20',
    manufacturer: 'ABB',
    ratedVoltageKv: 24,
    ratedNormalCurrentAmps: 1250,
    ratedBreakingCapacityKa: 20.0,
    ratedPeakMakingCapacityKa: 50.0,
    ratedShortTimeWithstandKa: 20.0,
    ratedShortTimeDurationSec: 3.0,
    operatingSequence: 'O - 0.3s - CO - 15s - CO',
  },
  {
    modelDesignation: 'Schneider HVX 24-25',
    manufacturer: 'Schneider Electric',
    ratedVoltageKv: 24,
    ratedNormalCurrentAmps: 1250,
    ratedBreakingCapacityKa: 25.0,
    ratedPeakMakingCapacityKa: 63.0,
    ratedShortTimeWithstandKa: 25.0,
    ratedShortTimeDurationSec: 3.0,
    operatingSequence: 'O - 0.3s - CO - 15s - CO',
  },
  {
    modelDesignation: 'Siemens SION 3AE 24kV-31.5kA',
    manufacturer: 'Siemens',
    ratedVoltageKv: 24,
    ratedNormalCurrentAmps: 1250,
    ratedBreakingCapacityKa: 31.5,
    ratedPeakMakingCapacityKa: 82.0,
    ratedShortTimeWithstandKa: 31.5,
    ratedShortTimeDurationSec: 3.0,
    operatingSequence: 'O - 0.3s - CO - 15s - CO',
  },
  {
    modelDesignation: 'ABB VD4/P 24.20.40',
    manufacturer: 'ABB',
    ratedVoltageKv: 24,
    ratedNormalCurrentAmps: 2000,
    ratedBreakingCapacityKa: 40.0,
    ratedPeakMakingCapacityKa: 100.0,
    ratedShortTimeWithstandKa: 40.0,
    ratedShortTimeDurationSec: 3.0,
    operatingSequence: 'O - 0.3s - CO - 15s - CO',
  },
  {
    modelDesignation: 'Siemens NXAIR 36kV-31.5kA',
    manufacturer: 'Siemens',
    ratedVoltageKv: 36,
    ratedNormalCurrentAmps: 1250,
    ratedBreakingCapacityKa: 31.5,
    ratedPeakMakingCapacityKa: 82.0,
    ratedShortTimeWithstandKa: 31.5,
    ratedShortTimeDurationSec: 3.0,
    operatingSequence: 'O - 0.3s - CO - 15s - CO',
  },
  {
    modelDesignation: 'Schneider MCset 24-50',
    manufacturer: 'Schneider Electric',
    ratedVoltageKv: 24,
    ratedNormalCurrentAmps: 2500,
    ratedBreakingCapacityKa: 50.0,
    ratedPeakMakingCapacityKa: 125.0,
    ratedShortTimeWithstandKa: 50.0,
    ratedShortTimeDurationSec: 3.0,
    operatingSequence: 'O - 0.3s - CO - 15s - CO',
  },
  {
    modelDesignation: 'ABB VD4 24.25.63',
    manufacturer: 'ABB',
    ratedVoltageKv: 24,
    ratedNormalCurrentAmps: 2500,
    ratedBreakingCapacityKa: 63.0,
    ratedPeakMakingCapacityKa: 160.0,
    ratedShortTimeWithstandKa: 63.0,
    ratedShortTimeDurationSec: 3.0,
    operatingSequence: 'O - 0.3s - CO - 15s - CO',
  },
];

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
  switchgearDescriptionEn: string;
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

  // 2. Short Circuit Analysis per IEC 60909 (Complex Impedance Z = R + jX)
  // Voltage factor c per IEC 60909-0 Table 1: c = 1.10 for MV/HV systems
  const cFactor = 1.10;
  const unKv = gridConnectionVoltageKv;

  // Upstream grid impedance (R_grid + j X_grid):
  // Z_grid = (c * Un^2) / S_sc_Q
  // Standard IEC 60909-0 ratio for MV upstream distribution grid: R_Q / X_Q ≈ 0.10
  const zGridMagnitudeOhms = (cFactor * Math.pow(unKv, 2)) / upstreamGridShortCircuitMva;
  const xGridOhms = zGridMagnitudeOhms / Math.sqrt(1.0 + Math.pow(0.10, 2));
  const rGridOhms = 0.10 * xGridOhms;

  // Transformer impedance (R_T + j X_T) referred to MV side:
  // Z_T = (uk% / 100) * (Un^2 / S_rT)
  // R_T = (P_k * 10^-3 * Un^2) / (S_rT^2)
  const zTransMagnitudeOhms = (ukPct / 100.0) * (Math.pow(unKv, 2) / ratedMva);
  const rTransOhms = (loadLossesKw * 1e-3 * Math.pow(unKv, 2)) / Math.pow(ratedMva, 2);
  const xTransOhms = Math.sqrt(Math.max(0, Math.pow(zTransMagnitudeOhms, 2) - Math.pow(rTransOhms, 2)));

  // Total equivalent complex impedance at MV fault point:
  const rTotalOhms = rGridOhms + rTransOhms;
  const xTotalOhms = xGridOhms + xTransOhms;
  const zTotalOhms = Math.sqrt(Math.pow(rTotalOhms, 2) + Math.pow(xTotalOhms, 2));

  // Initial symmetrical short-circuit current (kA):
  const initialSymmetricalIscKa = (cFactor * unKv) / (Math.sqrt(3) * zTotalOhms);

  // Peak factor kappa per IEC 60909-0 Section 4.3.1.2:
  // kappa = 1.02 + 0.98 * exp(-3 * R/X)
  const rOverXRatio = xTotalOhms > 0 ? rTotalOhms / xTotalOhms : 0.10;
  const kappa = Number((1.02 + 0.98 * Math.exp(-3.0 * rOverXRatio)).toFixed(3));
  const peakDynamicIpKa = kappa * Math.SQRT2 * initialSymmetricalIscKa;

  // Thermal equivalent short-circuit current Ith per IEC 60909-0:
  // Ith = I_sc'' * sqrt(m + n)
  // For far-from-generator faults (typical for PV grid interconnection), n = 1.0.
  // Factor m accounts for DC aperiodic decay over fault clearing time:
  const fNom = 50.0;
  const tk = Math.max(0.05, clearingTimeSec);
  let mFactor = 0.05;
  if (kappa > 1.02 && kappa < 2.0) {
    const lnKappaMinus1 = Math.log(kappa - 1.0);
    const exponent = 2.0 * fNom * tk * lnKappaMinus1;
    if (exponent < -0.01) {
      mFactor = Math.max(0.0, (1.0 / exponent) * (Math.exp(exponent) - 1.0));
    }
  }
  const nFactor = 1.0;
  const thermalEquivalentIthKa = initialSymmetricalIscKa * Math.sqrt(mFactor + nFactor);

  // Full-load plant collector current at grid voltage:
  const nominalMvCurrentAmps = Number(((plantCapacityAcMva * 1000.0) / (Math.sqrt(3) * gridConnectionVoltageKv)).toFixed(1));

  // Multi-criteria selection from certified manufacturer breaker catalog (IEC 62271-100):
  // 1. Rated voltage Ur >= gridConnectionVoltageKv
  // 2. Rated continuous current Ir >= nominalMvCurrentAmps
  // 3. Rated short-circuit breaking capacity Isc >= initialSymmetricalIscKa
  // 4. Rated peak making capacity Ima >= peakDynamicIpKa
  // 5. Short-time thermal withstand energy: Ik^2 * tk >= Ith^2 * t_clearing
  const selectedBreaker = STANDARD_MV_BREAKERS.find(
    (b) =>
      b.ratedVoltageKv >= gridConnectionVoltageKv &&
      b.ratedNormalCurrentAmps >= nominalMvCurrentAmps &&
      b.ratedBreakingCapacityKa >= initialSymmetricalIscKa &&
      b.ratedPeakMakingCapacityKa >= peakDynamicIpKa &&
      b.ratedShortTimeWithstandKa * Math.sqrt(b.ratedShortTimeDurationSec / tk) >= thermalEquivalentIthKa
  );
  const isBreakerSufficient = selectedBreaker !== undefined;
  const fallbackBreaker = STANDARD_MV_BREAKERS.find((b) => b.ratedVoltageKv >= gridConnectionVoltageKv) ?? STANDARD_MV_BREAKERS[STANDARD_MV_BREAKERS.length - 1];
  const activeBreaker = selectedBreaker ?? fallbackBreaker;

  const breakingCapacityKa = activeBreaker.ratedBreakingCapacityKa;
  const ratedPeakMakingCapacityKa = activeBreaker.ratedPeakMakingCapacityKa;

  const shortCircuit: ShortCircuitCalculation = {
    initialSymmetricalIscKa: Math.round(initialSymmetricalIscKa * 10) / 10,
    peakDynamicIpKa: Math.round(peakDynamicIpKa * 10) / 10,
    breakingCapacityKa,
    ratedPeakMakingCapacityKa,
    thermalEquivalentIthKa: Math.round(thermalEquivalentIthKa * 10) / 10,
    upstreamGridMva: upstreamGridShortCircuitMva,
    totalImpedanceOhms: Number(zTotalOhms.toFixed(3)),
    rEquivalentOhms: Number(rTotalOhms.toFixed(4)),
    xEquivalentOhms: Number(xTotalOhms.toFixed(4)),
    rOverXRatio: Number(rOverXRatio.toFixed(3)),
    kappa,
    isBreakerSufficient,
    selectedBreakerModel: activeBreaker.modelDesignation,
    selectedBreakerManufacturer: activeBreaker.manufacturer,
    ratedShortTimeDurationSec: activeBreaker.ratedShortTimeDurationSec,
    operatingSequence: activeBreaker.operatingSequence,
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

  const switchgearDescriptionFa = isBreakerSufficient
    ? `تابلوی کمپکت گازی SF6 فشار متوسط (GIS/RMU) با دژنکتور خلاء مدل ${shortCircuit.selectedBreakerModel} (${shortCircuit.selectedBreakerManufacturer})، رده ولتاژ ${gridConnectionVoltageKv}kV، قدرت قطع نامی ${breakingCapacityKa} kA، قدرت وصل پیک نامی ${ratedPeakMakingCapacityKa} kA و تحمل حرارتی اتصال کوتاه ${breakingCapacityKa} kA به مدت ${shortCircuit.ratedShortTimeDurationSec} ثانیه با سکانس استاندارد ${shortCircuit.operatingSequence} طبق IEC 62271-100، مجهز به رله‌های حفاظتی میکروپروسسوری (ANSI 50/51/50N/51N) و سکسیونر زمین موتوری.`
    : `هشدار بحرانی عدم کفایت کلید: جریان اتصال کوتاه اولیه (${shortCircuit.initialSymmetricalIscKa} kA یا پیک ${shortCircuit.peakDynamicIpKa} kA) از بالاترین قدرت قطع بریکرهای استاندارد MV کاتالوگ (${breakingCapacityKa} kA قطع / ${ratedPeakMakingCapacityKa} kA وصل پیک) فراتر است. بریکر انتخاب‌شده قادر به قطع این جریان نیست و نصب راکتور محدودکننده جریان (CLR) یا بازنگری در طراحی باسبار الزامی است.`;

  const switchgearDescriptionEn = isBreakerSufficient
    ? `Medium-voltage gas-insulated switchgear (GIS/RMU) with vacuum circuit breaker ${shortCircuit.selectedBreakerModel} (${shortCircuit.selectedBreakerManufacturer}), rated ${gridConnectionVoltageKv}kV: ${breakingCapacityKa} kA symmetrical breaking, ${ratedPeakMakingCapacityKa} kA peak making, and ${breakingCapacityKa} kA / ${shortCircuit.ratedShortTimeDurationSec}s thermal withstand (${shortCircuit.operatingSequence}) per IEC 62271-100, with numerical protection relay (50/51/50N/51N) and motorized earth switch.`
    : `CRITICAL BREAKER CAPACITY WARNING: Symmetrical fault current (${shortCircuit.initialSymmetricalIscKa} kA) or peak dynamic current (${shortCircuit.peakDynamicIpKa} kA) exceeds standard medium-voltage catalog breaker rating (${breakingCapacityKa} kA breaking / ${ratedPeakMakingCapacityKa} kA peak making). Sized breaker cannot safely interrupt this fault; current-limiting reactor (CLR) or higher transformer impedance required.`;

  const notesFa = [
    `ترانسفورماتور افزاینده ${ratedMva} MVA (ظرفیت مؤثر ${effectiveCapacity} MVA با لحاظ افت دمایی ${tempDeratePct}٪ و ارتفاعی ${altDeratePct}٪) با گروه برداری Dyn11 و امپدانس اتصالی ${ukPct}٪ جهت اتصال مطمئن به شبکه ${gridConnectionVoltageKv}kV.`,
    `جریان اتصال کوتاه متقارن اولیه ${shortCircuit.initialSymmetricalIscKa} kA، جریان پیک ضربه‌ای ${shortCircuit.peakDynamicIpKa} kA (ضریب کاپا ${shortCircuit.kappa}) و معادل حرارتی Ith=${shortCircuit.thermalEquivalentIthKa} kA بر اساس امپدانس مختلط R+jX طبق IEC 60909.`,
    ...(isBreakerSufficient
      ? [`کلید دژنکتور منتخب (${shortCircuit.selectedBreakerModel} با قدرت قطع ${breakingCapacityKa} kA متقارن، قدرت وصل ${ratedPeakMakingCapacityKa} kA پیک و تحمل حرارتی ${shortCircuit.ratedShortTimeDurationSec} ثانیه‌ای) کاملاً با جریان‌های اتصال کوتاه محاسبه‌شده همخوانی داشته و منطبق بر الزامات IEC 62271-100 است.`]
      : [`هشدار بحرانی: هیچ بریکر استاندارد MV با قدرت قطع کافی برای جریان خطای ${shortCircuit.initialSymmetricalIscKa} kA یافت نشد (حداکثر رده موجود: ${breakingCapacityKa} kA).`]),
    `طراحی مش ارتینگ پست بر اساس IEEE 80 با هادی مسی ${earthing.groundGridConductorMm2} mm² و مقاومت کل زمین ${earthing.calculatedGridResistanceOhms} اهم (تأمین ولتاژ گام و لمس مجاز).`,
    `تعبیه ترانسفورماتور مصارف داخلی ${auxiliaryTransformer.ratedKva} kVA جهت تغذیه بدون وقفه SCADA، سیستم‌های حفاظتی و درایوهای ترکر.`,
    `پشتیبانی کامل از تزریق توان راکتیو تا سقف ±${reactivePowerCapacityMvar} Mvar جهت تثبیت ولتاژ خطوط انتقال طبق کد شبکه ایران (Grid Code).`,
  ];

  return {
    transformer,
    shortCircuit,
    switchgearDescriptionFa,
    switchgearDescriptionEn,
    earthing,
    auxiliaryTransformer,
    mvCollectorCable,
    surgeArrester,
    reactivePowerCapacityMvar,
    powerFactorRange,
    notesFa,
  };
}
