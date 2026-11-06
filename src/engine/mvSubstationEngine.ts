// Medium-Voltage (MV) & High-Voltage (HV) Substation, Transformer & IEEE 80 Grounding Engine
// Governed by:
// - IEC 60076 (Power Transformers) with ambient temperature and altitude derating
// - IEC 60909 (Short-circuit currents in three-phase a.c. systems)
// - IEC 62271-200 (A.C. metal-enclosed switchgear and controlgear)
// - IEEE 80-2013 (Guide for Safety in AC Substation Grounding)
// - IEC 60099-4 (Surge arresters)

export interface MvSubstationInput {
  plantCapacityAcMva?: number;   // Plant AC capacity in MVA
  plantCapacityAcMw?: number;    // Plant active power in MW (S_kVA = P_kW / PF, S_MVA = S_kVA / 1000)
  powerFactor?: number;          // Explicit operating power factor (default 0.95)
  inverterOutputVoltageV: number;// e.g. 400V, 690V, 800V
  gridConnectionVoltageKv: number;// e.g. 20kV, 33kV, 63kV
  soilResistivityOhmM: number;  // Soil resistivity (e.g. 60 ohm-m moist clay, 250 ohm-m gravel)
  clearingTimeSec: number;      // Fault duration (e.g. 0.5s)
  ambientTempC?: number;        // Site maximum ambient temp (e.g. 45°C)
  elevationM?: number;          // Site elevation (e.g. 1400m)
  upstreamGridShortCircuitMva?: number; // Upstream utility short-circuit capacity (e.g. 500 MVA)
  gridRxRatio?: number;         // Upstream grid R_Q / X_Q ratio (site-specific screening input, typical 0.05-0.20, default 0.10)
  mvCableLengthM?: number;      // Plant MV collection feeder cable length (m)
  mvCableCrossSectionMm2?: number; // MV cable conductor cross-section (mm² Cu, e.g. 120)
  parallelCableRunsCount?: number; // Number of parallel collection feeder runs (default 1)
  cableConductorTempC?: number; // Conductor temp for R calculation: 20°C for max fault current per IEC 60909-0 §6.4.2, 90°C for min fault
  mvCableReactanceOhmPerKm?: number; // Specific cable reactance (Ohm/km, default 0.115 per IEC 60909 Table 3)
  shortCircuitCalculationMode?: 'max_fault_current' | 'min_fault_current'; // IEC 60909 c_max vs c_min
  customCVoltageFactor?: number; // Optional user override for c factor
  faultLocation?: 'mv_busbar' | 'feeder_terminal'; // Fault point: substation MV busbar (excl. cable) vs feeder terminal (incl. cable)
  includeConverterContributionAtBusbar?: boolean; // Whether inverter fault current is added at busbar (default true)
  inverterFaultContributionFactor?: number; // Converter current limit k_inv per IEC 60909-0 Clause 6.7 / IEEE 1547 (default 1.15)
  faultCurrentLowThresholdKa?: number; // Screening threshold, default 0.5 kA
  faultCurrentHighThresholdKa?: number;// Screening threshold, default 30.0 kA
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
  faultLocation: 'mv_busbar' | 'feeder_terminal';
  faultLocationDescriptionFa: string;
  faultLocationDescriptionEn: string;
  initialSymmetricalIscKa: number; // I_sc'' (kA)
  peakDynamicIpKa: number;         // i_p (kA)
  breakingCapacityKa: number;      // Minimum required circuit breaker breaking rating
  ratedPeakMakingCapacityKa: number; // Rated peak making capacity (2.5 * breaking capacity per IEC 62271-100)
  thermalEquivalentIthKa: number;  // I_th (kA)
  upstreamGridMva: number;
  gridRxRatio: number;
  gridImpedance: {
    rOhms: number;
    xOhms: number;
    zOhms: number;
    rxRatio: number;
  };
  transformerImpedance: {
    rOhms: number;
    xOhms: number;
    zOhms: number;
    ktFactor: number;
    rUncorrectedOhms: number;
    xUncorrectedOhms: number;
  };
  cableImpedance: {
    rOhms: number;
    xOhms: number;
    zOhms: number;
    lengthM: number;
    crossSectionMm2: number;
    parallelRunsCount: number;
    conductorTempC: number;
    singleRunROhms: number;
    singleRunXOhms: number;
  };
  totalImpedanceOhms: number;
  rEquivalentOhms: number;
  xEquivalentOhms: number;
  rOverXRatio: number;
  kappa: number;
  cFactor: number;
  cFactorSource: string;
  busbarGridIscKa: number;
  busbarIscKa: number;
  busbarGridOnlyIscKa: number;
  busbarWithConverterIscKa: number;
  includeConverterContributionAtBusbar: boolean;
  feederTerminalGridIscKa: number;
  inverterFaultContributionKa: number;
  feederTerminalIscKa: number;
  governingIscKa: number;
  governingFaultLocation: 'mv_busbar' | 'feeder_terminal';
  assumptionsFa: string[];
  assumptionsEn: string[];
  faultCurrentOutOfRangeWarning?: string;
  screeningMethodologyNoticeFa: string;
  screeningMethodologyNoticeEn: string;
  isBreakerSufficient: boolean;
  selectedBreakerModel: string;
  selectedBreakerManufacturer: string;
  selectedBreakerCatalogDocRef?: string;
  ratedShortTimeDurationSec: number;
  operatingSequence: string;
  breakerDeficiencyReason?: string;
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
  catalogDocReference: string;
  typeTestStandard: string;
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
    catalogDocReference: 'ABB Technical Guide 1VCP000001 - Rev. T, Section 4 "Technical Data", Table 4.2 (VD4/P 24 kV)',
    typeTestStandard: 'IEC 62271-100',
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
    catalogDocReference: 'ABB Technical Guide 1VCP000001 - Rev. T, Section 4 "Technical Data", Table 4.2 (VD4/P 24 kV)',
    typeTestStandard: 'IEC 62271-100',
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
    catalogDocReference: 'Schneider Electric AMTED302029EN / NRJED111246EN, Chapter 3 "Electrical Characteristics", Table 3.1 (HVX 24 kV)',
    typeTestStandard: 'IEC 62271-100',
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
    catalogDocReference: 'Siemens Catalog HG 11.21 · 2021, Chapter 2 "Selection & Ordering Data", Table 2/17 (SION 3AE1 24 kV)',
    typeTestStandard: 'IEC 62271-100',
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
    catalogDocReference: 'ABB Technical Guide 1VCP000001 - Rev. T, Section 4 "Technical Data", Table 4.2 (VD4/P 24 kV)',
    typeTestStandard: 'IEC 62271-100',
  },
  {
    modelDesignation: 'Siemens SION 3AH3 (NXAIR 36kV-31.5kA)',
    manufacturer: 'Siemens',
    ratedVoltageKv: 36,
    ratedNormalCurrentAmps: 1250,
    ratedBreakingCapacityKa: 31.5,
    ratedPeakMakingCapacityKa: 82.0,
    ratedShortTimeWithstandKa: 31.5,
    ratedShortTimeDurationSec: 3.0,
    operatingSequence: 'O - 0.3s - CO - 15s - CO',
    catalogDocReference: 'Siemens Catalog HA 25.71 · 2022, Chapter 3 "Technical Data", Table 3/1 (NXAIR Switchgear with SION 3AH3 VCB up to 36 kV)',
    typeTestStandard: 'IEC 62271-100',
  },
  {
    modelDesignation: 'Schneider Evolis 24-50 (MCset 24kV)',
    manufacturer: 'Schneider Electric',
    ratedVoltageKv: 24,
    ratedNormalCurrentAmps: 2500,
    ratedBreakingCapacityKa: 50.0,
    ratedPeakMakingCapacityKa: 125.0,
    ratedShortTimeWithstandKa: 50.0,
    ratedShortTimeDurationSec: 3.0,
    operatingSequence: 'O - 0.3s - CO - 15s - CO',
    catalogDocReference: 'Schneider Electric AMTED398031EN, Section 2 "Technical Characteristics", Table 2.2 (MCset 24 kV with Evolis VCB)',
    typeTestStandard: 'IEC 62271-100',
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
    catalogDocReference: 'ABB Technical Guide 1VCP000001 - Rev. T, Section 4 "Technical Data", Table 4.2 (VD4 24 kV)',
    typeTestStandard: 'IEC 62271-100',
  },
];

export interface Ieee80EarthingResult {
  groundGridConductorMm2: number;  // Copper conductor cross section
  touchVoltageLimitVolts: number;  // Maximum permissible safe touch voltage
  stepVoltageLimitVolts: number;   // Maximum permissible safe step voltage
  calculatedGridResistanceOhms: number; // Target Rg <= 1.0 Ohm
  isCompliant: boolean; // Comprehensive IEEE 80 compliance: Rg <= 1.0 && isTouchSafe && isStepSafe
  isResistanceCompliant: boolean; // Grid resistance threshold Rg <= 1.0 Ohm
  actualMeshVoltageVolts: number;
  actualStepVoltageVolts: number;
  isTouchSafe: boolean;
  isStepSafe: boolean;
  complianceNotesFa?: string;
  complianceNotesEn?: string;
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
    inverterOutputVoltageV,
    gridConnectionVoltageKv,
    soilResistivityOhmM,
    clearingTimeSec,
    ambientTempC = 42.0,
    elevationM = 1200.0,
    upstreamGridShortCircuitMva = 500.0,
  } = input;

  // Derive operating plant MVA from explicit active power P (MW) and power factor PF if provided:
  // S_kVA = P_kW / PF, S_MVA = S_kVA / 1000
  const pf = Math.max(0.70, Math.min(1.0, input.powerFactor ?? 0.95));
  let plantCapacityAcMva = input.plantCapacityAcMva ?? 5.0;
  if (input.plantCapacityAcMw !== undefined && input.plantCapacityAcMw > 0) {
    const sKva = (input.plantCapacityAcMw * 1000.0) / pf;
    plantCapacityAcMva = sKva / 1000.0;
  }

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

  // 2. Short Circuit Analysis per IEC 60909-0:2016 (Complex Impedance Z = R + jX)
  // Voltage factor c per IEC 60909-0:2016 Table 1:
  // - LV (Un <= 1kV): c_max = 1.10 (or 1.05 for +6% grids), c_min = 0.95
  // - MV (1kV < Un <= 35kV): c_max = 1.10, c_min = 1.00
  // - HV (Un > 35kV): c_max = 1.10, c_min = 1.00
  let cFactor = 1.10;
  let cFactorSource = 'IEC 60909-0:2016 Table 1 (c_max = 1.10)';

  if (input.customCVoltageFactor !== undefined && input.customCVoltageFactor > 0) {
    cFactor = input.customCVoltageFactor;
    cFactorSource = `User custom c override (${cFactor})`;
  } else {
    const isMinFault = input.shortCircuitCalculationMode === 'min_fault_current';
    if (gridConnectionVoltageKv <= 1.0) {
      cFactor = isMinFault ? 0.95 : 1.10;
      cFactorSource = `IEC 60909-0:2016 Table 1 (LV <= 1kV, ${isMinFault ? 'c_min = 0.95' : 'c_max = 1.10'})`;
    } else {
      cFactor = isMinFault ? 1.00 : 1.10;
      cFactorSource = `IEC 60909-0:2016 Table 1 (MV/HV > 1kV, ${isMinFault ? 'c_min = 1.00' : 'c_max = 1.10'})`;
    }
  }

  const unKv = gridConnectionVoltageKv;
  const isMinFault = input.shortCircuitCalculationMode === 'min_fault_current';

  // 1. Upstream grid impedance (R_grid + j X_grid):
  // Z_grid = (c * Un^2) / S_sc_Q
  // Configurable R_Q / X_Q ratio (site-specific screening input, typical 0.05-0.20, default 0.10)
  const gridRx = Math.max(0.01, Math.min(1.0, input.gridRxRatio ?? 0.10));
  const zGridMagnitudeOhms = (cFactor * Math.pow(unKv, 2)) / upstreamGridShortCircuitMva;
  const xGridOhms = zGridMagnitudeOhms / Math.sqrt(1.0 + Math.pow(gridRx, 2));
  const rGridOhms = gridRx * xGridOhms;

  // 2. Transformer impedance (R_T + j X_T) referred to MV side:
  // Z_T,base = (uk% / 100) * (Un^2 / S_rT)
  // R_T,base = (P_k * 10^-3 * Un^2) / (S_rT^2)
  const zTransBaseOhms = (ukPct / 100.0) * (Math.pow(unKv, 2) / ratedMva);
  const rTransBaseOhms = (loadLossesKw * 1e-3 * Math.pow(unKv, 2)) / Math.pow(ratedMva, 2);
  const xTransBaseOhms = Math.sqrt(Math.max(0, Math.pow(zTransBaseOhms, 2) - Math.pow(rTransBaseOhms, 2)));

  // Transformer impedance correction factor K_T per IEC 60909-0:2016 Clause 6.3.3.1:
  // K_T = 0.95 * [c_max / (1 + 0.6 * x_T)]
  // where x_T = X_T / Z_rT ≈ u_k / 100
  const zNominalTrafoOhms = Math.pow(unKv, 2) / ratedMva;
  const xTPerUnit = zNominalTrafoOhms > 0 ? xTransBaseOhms / zNominalTrafoOhms : ukPct / 100.0;
  const cMaxForKt = 1.10;
  const ktFactor = Number((0.95 * (cMaxForKt / (1.0 + 0.6 * xTPerUnit))).toFixed(4));
  const rTransOhms = rTransBaseOhms * ktFactor;
  const xTransOhms = xTransBaseOhms * ktFactor;
  const zTransMagnitudeOhms = Math.hypot(rTransOhms, xTransOhms);

  // 3. Plant MV Collection Feeder Cable Impedance (R_cable + j X_cable):
  // Conductor temperature calibration per IEC 60909-0 Clause 6.4.2 & 6.4.3:
  // - Max fault current (c_max / breaker sizing): conductor at 20°C (lowest R, highest I_sc'')
  // - Min fault current (c_min / relay sensitivity): conductor at max operating temp (90°C XLPE)
  const cableLengthM = Math.max(0, input.mvCableLengthM ?? 0);
  const cableSectionMm2 = Math.max(25, input.mvCableCrossSectionMm2 ?? 120);
  const parallelRuns = Math.max(1, Math.min(12, input.parallelCableRunsCount ?? 1));
  const cableReactancePerKm = Math.max(0.05, input.mvCableReactanceOhmPerKm ?? 0.115);

  const conductorTempC = input.cableConductorTempC ?? (isMinFault ? 90.0 : 20.0);
  const rhoCu = 0.01786 * (1.0 + 0.00393 * (conductorTempC - 20.0)); // Ohm * mm² / m

  let singleRunROhms = 0;
  let singleRunXOhms = 0;
  let rCableOhms = 0;
  let xCableOhms = 0;

  if (cableLengthM > 0) {
    singleRunROhms = (rhoCu * cableLengthM) / cableSectionMm2;
    singleRunXOhms = (cableReactancePerKm * cableLengthM) / 1000.0;
    rCableOhms = singleRunROhms / parallelRuns;
    xCableOhms = singleRunXOhms / parallelRuns;
  }
  const zCableOhms = Math.hypot(rCableOhms, xCableOhms);

  // 4. Substation Busbar vs Feeder Terminal Fault Topology & Inverter Contribution:
  // - 'mv_busbar': Fault at substation MV busbar (upstream grid + transformer, plus inverter backfeed)
  // - 'feeder_terminal': Downstream fault at collection feeder end (includes parallel cables + inverter current)
  // Per IEC 60909-0 Clause 6.7 and IEEE 1547: Static power converter-connected PV generating units contribute
  // a dynamic current-limited short-circuit current governed by k_inv * I_nom (typically 1.10 - 1.25, default 1.15).
  // The nominal current is based on plant active AC power (MW) at nominal voltage: I_n = P_ac / (sqrt(3) * U_n).
  const faultLocation: 'mv_busbar' | 'feeder_terminal' =
    input.faultLocation ?? (cableLengthM > 0 ? 'feeder_terminal' : 'mv_busbar');

  const rBusbarOhms = rGridOhms + rTransOhms;
  const xBusbarOhms = xGridOhms + xTransOhms;
  const zBusbarOhms = Math.hypot(rBusbarOhms, xBusbarOhms);
  const busbarGridIscKa = Number(((cFactor * unKv) / (Math.sqrt(3) * zBusbarOhms)).toFixed(3));

  const rFeederOhms = rBusbarOhms + rCableOhms;
  const xFeederOhms = xBusbarOhms + xCableOhms;
  const zFeederOhms = Math.hypot(rFeederOhms, xFeederOhms);
  const feederTerminalGridIscKa = Number(((cFactor * unKv) / (Math.sqrt(3) * zFeederOhms)).toFixed(3));

  // Converter fault contribution from PV inverters (kA) at MV voltage (active AC power basis):
  const plantCapacityAcMw = input.plantCapacityAcMw !== undefined && input.plantCapacityAcMw > 0
    ? input.plantCapacityAcMw
    : plantCapacityAcMva * pf;
  const nominalPlantMvCurrentKa = plantCapacityAcMw / (Math.sqrt(3) * unKv);
  const kInv = Math.max(1.0, Math.min(2.0, input.inverterFaultContributionFactor ?? 1.15));
  const inverterFaultContributionKa = Number((kInv * nominalPlantMvCurrentKa).toFixed(3));

  // Total initial symmetrical short-circuit currents incorporating inverter fault current per IEC 60909-0 Clause 6.7:
  const includeConverterAtBusbar = input.includeConverterContributionAtBusbar ?? true;
  const busbarGridOnlyIscKa = busbarGridIscKa;
  const busbarWithConverterIscKa = Number((busbarGridIscKa + inverterFaultContributionKa).toFixed(3));
  const busbarIscKa = includeConverterAtBusbar ? busbarWithConverterIscKa : busbarGridOnlyIscKa;
  const feederTerminalIscKa = Number((feederTerminalGridIscKa + inverterFaultContributionKa).toFixed(3));

  // Governing impedance and initial symmetrical fault current for selected fault location:
  const rTotalOhms = faultLocation === 'feeder_terminal' ? rFeederOhms : rBusbarOhms;
  const xTotalOhms = faultLocation === 'feeder_terminal' ? xFeederOhms : xBusbarOhms;
  const zTotalOhms = faultLocation === 'feeder_terminal' ? zFeederOhms : zBusbarOhms;

  const initialSymmetricalIscKa = faultLocation === 'feeder_terminal' ? feederTerminalIscKa : busbarIscKa;

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

  // Filter catalog for breakers compatible with the grid connection voltage:
  const voltageCompatibleBreakers = STANDARD_MV_BREAKERS.filter((b) => b.ratedVoltageKv >= gridConnectionVoltageKv);

  // Multi-criteria screening selection from reference MV breaker catalog based on published IEC 62271-100 ratings (indicative engineering screening, not independent type-test verification):
  // 1. Rated voltage Ur >= gridConnectionVoltageKv
  // 2. Rated continuous current Ir >= nominalMvCurrentAmps
  // 3. Rated short-circuit breaking capacity Isc >= initialSymmetricalIscKa
  // 4. Rated peak making capacity Ima >= peakDynamicIpKa
  // 5. Short-time thermal withstand energy: Ik^2 * tk >= Ith^2 * t_clearing
  const selectedBreaker = voltageCompatibleBreakers.find(
    (b) =>
      b.ratedNormalCurrentAmps >= nominalMvCurrentAmps &&
      b.ratedBreakingCapacityKa >= initialSymmetricalIscKa &&
      b.ratedPeakMakingCapacityKa >= peakDynamicIpKa &&
      b.ratedShortTimeWithstandKa * Math.sqrt(b.ratedShortTimeDurationSec / tk) >= thermalEquivalentIthKa
  );
  const isBreakerSufficient = selectedBreaker !== undefined;

  // Maximum ratings available in catalog for this voltage class:
  const maxCatalogIrAmps = voltageCompatibleBreakers.length > 0
    ? Math.max(...voltageCompatibleBreakers.map((b) => b.ratedNormalCurrentAmps))
    : 0;
  const maxCatalogBreakingKa = voltageCompatibleBreakers.length > 0
    ? Math.max(...voltageCompatibleBreakers.map((b) => b.ratedBreakingCapacityKa))
    : 0;
  const maxCatalogMakingKa = voltageCompatibleBreakers.length > 0
    ? Math.max(...voltageCompatibleBreakers.map((b) => b.ratedPeakMakingCapacityKa))
    : 0;

  // Identify specific engineering bottleneck when no catalog breaker matches:
  let breakerDeficiencyReason: string | undefined;
  if (!isBreakerSufficient) {
    const reasons: string[] = [];
    if (voltageCompatibleBreakers.length === 0) {
      reasons.push('voltage_class_unavailable');
    } else {
      if (nominalMvCurrentAmps > maxCatalogIrAmps) {
        reasons.push(`continuous_current_exceeded (${nominalMvCurrentAmps}A > ${maxCatalogIrAmps}A)`);
      }
      if (initialSymmetricalIscKa > maxCatalogBreakingKa) {
        reasons.push(`breaking_capacity_exceeded (${initialSymmetricalIscKa.toFixed(1)}kA > ${maxCatalogBreakingKa}kA)`);
      }
      if (peakDynamicIpKa > maxCatalogMakingKa) {
        reasons.push(`peak_making_exceeded (${peakDynamicIpKa.toFixed(1)}kA > ${maxCatalogMakingKa}kA)`);
      }
      if (reasons.length === 0) {
        reasons.push('thermal_withstand_or_duty_margin_exceeded');
      }
    }
    breakerDeficiencyReason = reasons.join('; ');
  }

  const selectedBreakerModel = selectedBreaker ? selectedBreaker.modelDesignation : 'NO_STANDARD_BREAKER_MATCHED';
  const selectedBreakerManufacturer = selectedBreaker ? selectedBreaker.manufacturer : 'N/A';
  const breakingCapacityKa = selectedBreaker ? selectedBreaker.ratedBreakingCapacityKa : maxCatalogBreakingKa;
  const ratedPeakMakingCapacityKa = selectedBreaker ? selectedBreaker.ratedPeakMakingCapacityKa : maxCatalogMakingKa;
  const ratedShortTimeDurationSec = selectedBreaker ? selectedBreaker.ratedShortTimeDurationSec : 3.0;
  const operatingSequence = selectedBreaker ? selectedBreaker.operatingSequence : 'N/A';

  const lowThresh = input.faultCurrentLowThresholdKa ?? 0.5;
  const highThresh = input.faultCurrentHighThresholdKa ?? 30.0;
  let faultCurrentOutOfRangeWarning: string | undefined;

  if (initialSymmetricalIscKa < lowThresh) {
    faultCurrentOutOfRangeWarning = `SCREENING WARNING: Fault current (${initialSymmetricalIscKa.toFixed(2)} kA) is below standard screening lower threshold (${lowThresh} kA); verify source grid impedance and transformer parameters.`;
  } else if (initialSymmetricalIscKa > highThresh) {
    faultCurrentOutOfRangeWarning = `SCREENING WARNING: Fault current (${initialSymmetricalIscKa.toFixed(2)} kA) exceeds standard screening upper threshold (${highThresh} kA); high fault level exceeds typical distribution switchgear limits; current-limiting reactors or transmission voltage connection required.`;
  }

  const shortCircuit: ShortCircuitCalculation = {
    faultLocation,
    faultLocationDescriptionFa:
      faultLocation === 'mv_busbar'
        ? 'باس‌بار فشار متوسط پست اصلی (شامل شبکه بالادست و ترانسفورماتور بدون کابل کلکتور)'
        : 'ترمینال انتهای فیدر کلکتور / ایستگاه اینورتر (شامل کابل‌های کلکتور MV و سهم جریان اتصال کوتاه اینورترها)',
    faultLocationDescriptionEn:
      faultLocation === 'mv_busbar'
        ? 'Substation MV Busbar (Upstream Grid + Transformer, excluding collector cable)'
        : 'Collector Feeder Inverter Terminal (Includes parallel MV collection cables + inverter fault current)',
    initialSymmetricalIscKa: Math.round(initialSymmetricalIscKa * 10) / 10,
    peakDynamicIpKa: Math.round(peakDynamicIpKa * 10) / 10,
    breakingCapacityKa,
    ratedPeakMakingCapacityKa,
    thermalEquivalentIthKa: Math.round(thermalEquivalentIthKa * 10) / 10,
    upstreamGridMva: upstreamGridShortCircuitMva,
    gridRxRatio: gridRx,
    gridImpedance: {
      rOhms: Number(rGridOhms.toFixed(5)),
      xOhms: Number(xGridOhms.toFixed(5)),
      zOhms: Number(zGridMagnitudeOhms.toFixed(5)),
      rxRatio: gridRx,
    },
    transformerImpedance: {
      rOhms: Number(rTransOhms.toFixed(5)),
      xOhms: Number(xTransOhms.toFixed(5)),
      zOhms: Number(zTransMagnitudeOhms.toFixed(5)),
      ktFactor,
      rUncorrectedOhms: Number(rTransBaseOhms.toFixed(5)),
      xUncorrectedOhms: Number(xTransBaseOhms.toFixed(5)),
    },
    cableImpedance: {
      rOhms: Number(rCableOhms.toFixed(5)),
      xOhms: Number(xCableOhms.toFixed(5)),
      zOhms: Number(zCableOhms.toFixed(5)),
      lengthM: cableLengthM,
      crossSectionMm2: cableSectionMm2,
      parallelRunsCount: parallelRuns,
      conductorTempC,
      singleRunROhms: Number(singleRunROhms.toFixed(5)),
      singleRunXOhms: Number(singleRunXOhms.toFixed(5)),
    },
    totalImpedanceOhms: Number(zTotalOhms.toFixed(4)),
    rEquivalentOhms: Number(rTotalOhms.toFixed(4)),
    xEquivalentOhms: Number(xTotalOhms.toFixed(4)),
    rOverXRatio: Number(rOverXRatio.toFixed(3)),
    kappa,
    cFactor,
    cFactorSource,
    busbarGridIscKa,
    busbarIscKa,
    busbarGridOnlyIscKa,
    busbarWithConverterIscKa,
    includeConverterContributionAtBusbar: includeConverterAtBusbar,
    feederTerminalGridIscKa,
    inverterFaultContributionKa,
    feederTerminalIscKa,
    governingIscKa: initialSymmetricalIscKa,
    governingFaultLocation: faultLocation,
    assumptionsFa: [
      `ضریب اضافه جریان اینورتر k_inv = ${kInv.toFixed(2)} یک فرض غربالگری مهندسی منطبق با رفتار دینامیکی اینورترهای متصل به شبکه است (استاندارد IEC 60909-0 بند ۶.۷ چارچوب محاسبه را ارائه می‌دهد، اما مقدار دقیق به کنترلر و دیتاشیت تایپ‌تست سازنده بستگی دارد).`,
      'جریان‌های خطای شبکه بالادست و اینورترها به صورت جمع حسابی دامنه‌ها (حالت حدی محافظه‌کارانه بر اساس IEC 60909-0 بند ۶.۷) ترکیب شده‌اند.',
      includeConverterAtBusbar
        ? 'جریان خطای باسبار شامل پس‌تغذیه اینورترها بدون احتساب تضعیف امپدانس ترانسفورماتور/کابل‌های رابط است (حد بالای محافظه‌کارانه غربالگری).'
        : 'جریان خطای باسبار بر مبنای سهم شبکه بالادست بدون احتساب تزریق محلی اینورترها محاسبه شده است.',
      'محاسبات شامل سهم موتورها، میرایی مقاومت قوس الکتریکی و مولفه‌های توالی صفر ارتینگ نمی‌باشد.',
      `ظرفیت اتصال کوتاه شبکه برق بالادست (${upstreamGridShortCircuitMva} MVA) و نسبت R_Q/X_Q (${gridRx.toFixed(2)}) فرضیات اولیه غربالگری هستند.`,
      `جریان خطای مبنا جهت انتخاب کلید قدرت: ${initialSymmetricalIscKa.toFixed(3)} کیلوآمپر در ${faultLocation === 'feeder_terminal' ? 'انتهای فیدر خروجی' : 'باسبار پست فشار متوسط'}.`,
    ],
    assumptionsEn: [
      `Inverter current contribution limit factor k_inv = ${kInv.toFixed(2)} is an engineering screening assumption for typical grid-following inverter controls. IEC 60909-0 Clause 6.7 provides the calculation framework; the exact dynamic fault limit must be verified against certified manufacturer type-test datasheets.`,
      'Upstream utility grid and inverter fault currents are combined as arithmetic scalar magnitudes (I_sc = I_sc,grid + I_sc,inv), representing a conservative upper-bound screening envelope per IEC 60909-0 Clause 6.7.',
      includeConverterAtBusbar
        ? 'Substation MV busbar fault current includes unattenuated inverter backfeed, assuming negligible transformer/collector impedance between inverters and MV busbar (upper-bound screening).'
        : 'Substation MV busbar fault current is evaluated on a grid-only basis excluding local inverter backfeed contribution.',
      'Screening calculation excludes dynamic motor backfeed, arc resistance damping, and zero-sequence earthing fault currents.',
      `Upstream grid short-circuit capacity (${upstreamGridShortCircuitMva} MVA) and R_Q/X_Q ratio (${gridRx.toFixed(2)}) are user-specified preliminary screening parameters.`,
      `Governing fault current for breaker duty selection: ${initialSymmetricalIscKa.toFixed(3)} kA at ${faultLocation === 'feeder_terminal' ? 'feeder terminal' : 'substation MV busbar'}.`,
    ],
    faultCurrentOutOfRangeWarning,
    screeningMethodologyNoticeFa:
      'محاسبات اتصال کوتاه بر اساس مدل غربالگری مهندسی IEC 60909-0:2016 شامل امپدانس شبکه بالادست، ترانسفورماتور (با ضریب تصحیح KT) و کابل‌های موازی کلکتور MV است. مقاومت کابل برای بیشینه اتصال کوتاه در دمای ۲۰ درجه سانتی‌گراد و برای کمینه در ۹۰ درجه محاسبه شده است. طراحی نهایی مستلزم مطالعات هماهنگی حفاظتی در ETAP یا DIgSILENT است.',
    screeningMethodologyNoticeEn:
      'Short-circuit analysis based on IEC 60909-0:2016 engineering screening incorporating upstream grid, transformer (with KT correction factor), and parallel MV collection cables. Conductor resistance evaluated at 20°C for conservative maximum fault current (breaker sizing) and 90°C for minimum fault current (relay sensitivity). Final design requires transient network studies in ETAP or DIgSILENT PowerFactory.',
    isBreakerSufficient,
    selectedBreakerModel,
    selectedBreakerManufacturer,
    selectedBreakerCatalogDocRef: selectedBreaker ? selectedBreaker.catalogDocReference : undefined,
    ratedShortTimeDurationSec,
    operatingSequence,
    breakerDeficiencyReason,
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

  const isResistanceCompliant = calculatedGridResistanceOhms <= 1.0;
  const isTouchSafe = actualMesh <= touchVoltageLimitVolts;
  const isStepSafe = actualStep <= stepVoltageLimitVolts;
  const isCompliant = isResistanceCompliant && isTouchSafe && isStepSafe;

  const earthing: Ieee80EarthingResult = {
    groundGridConductorMm2: Math.min(240, Math.max(70, groundGridConductorMm2)),
    touchVoltageLimitVolts,
    stepVoltageLimitVolts,
    calculatedGridResistanceOhms,
    isCompliant,
    isResistanceCompliant,
    actualMeshVoltageVolts: actualMesh,
    actualStepVoltageVolts: actualStep,
    isTouchSafe,
    isStepSafe,
    complianceNotesFa: isCompliant
      ? 'شبکه زمین پست طبق IEEE 80 هم از نظر مقاومت کمتر از ۱ اهم و هم از نظر ولتاژهای تماس و گام ایمن است.'
      : !isResistanceCompliant
        ? 'مقاومت شبکه زمین از ۱ اهم بیشتر است. نیاز به افزایش طول هادی مدفون یا افزودن میله راد عمقی.'
        : 'ولتاژ تماس یا گام از حد مجاز انسانی فراتر است! ضخامت لایه شن سطحی یا تراکم مش زمین را افزایش دهید.',
    complianceNotesEn: isCompliant
      ? 'Substation grounding grid fully compliant with IEEE 80 (Rg <= 1.0 Ohm, touch and step voltages safe).'
      : !isResistanceCompliant
        ? 'Ground resistance exceeds 1.0 Ohm target; add deep vertical ground rods or expand grid perimeter.'
        : 'Touch or step voltage exceeds safe physiological threshold per IEEE 80; increase gravel surface layer or mesh density.',
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

  let switchgearDescriptionFa: string;
  let switchgearDescriptionEn: string;

  if (isBreakerSufficient) {
    switchgearDescriptionFa = `تابلوی کمپکت گازی SF6 فشار متوسط (GIS/RMU) با دژنکتور خلاء مدل ${shortCircuit.selectedBreakerModel} (${shortCircuit.selectedBreakerManufacturer})، رده ولتاژ ${gridConnectionVoltageKv}kV، قدرت قطع نامی ${breakingCapacityKa} kA، قدرت وصل پیک نامی ${ratedPeakMakingCapacityKa} kA و تحمل حرارتی اتصال کوتاه ${breakingCapacityKa} kA به مدت ${shortCircuit.ratedShortTimeDurationSec} ثانیه با سکانس استاندارد ${shortCircuit.operatingSequence} طبق IEC 62271-100 (مرجع کاتالوگ سازنده: ${selectedBreaker?.catalogDocReference})، مجهز به رله‌های حفاظتی میکروپروسسوری (ANSI 50/51/50N/51N) و سکسیونر زمین موتوری.`;
    switchgearDescriptionEn = `Medium-voltage gas-insulated switchgear (GIS/RMU) with vacuum circuit breaker ${shortCircuit.selectedBreakerModel} (${shortCircuit.selectedBreakerManufacturer}), rated ${gridConnectionVoltageKv}kV: ${breakingCapacityKa} kA symmetrical breaking, ${ratedPeakMakingCapacityKa} kA peak making, and ${breakingCapacityKa} kA / ${shortCircuit.ratedShortTimeDurationSec}s thermal withstand (${shortCircuit.operatingSequence}) per IEC 62271-100 (Manufacturer ref: ${selectedBreaker?.catalogDocReference}), with numerical protection relay (50/51/50N/51N) and motorized earth switch.`;
  } else {
    if (voltageCompatibleBreakers.length === 0) {
      switchgearDescriptionFa = `هشدار عدم تطابق رده ولتاژ: ولتاژ اتصال به شبکه (${gridConnectionVoltageKv}kV) از حداکثر ولتاژ نامی کلیدهای استاندارد MV در کاتالوگ مرجع (حداکثر ۳۶kV) فراتر است. راه‌حل مهندسی: استفاده از تجهیزات کلیدخانه فشار قوی انتقال (مانند پست‌های ۶۳kV، ۷۲.۵kV یا ۱۳۲kV) یا بازنگری در سطح ولتاژ ثانویه ترانسفورماتور پست.`;
      switchgearDescriptionEn = `VOLTAGE CLASS UNAVAILABLE WARNING: Grid connection voltage (${gridConnectionVoltageKv}kV) exceeds maximum rated voltage of standard medium-voltage switchgear breakers in reference catalog (maximum 36kV). Engineering resolution: specify high-voltage transmission class switchgear (e.g. 63kV, 72.5kV, or 132kV GIS/AIS) or reconfigure interconnection substation transformer voltage.`;
    } else if ((initialSymmetricalIscKa > maxCatalogBreakingKa || peakDynamicIpKa > maxCatalogMakingKa) && nominalMvCurrentAmps > maxCatalogIrAmps) {
      switchgearDescriptionFa = `هشدار بحرانی عدم کفایت ظرفیت قطع و بار مداوم کلید: جریان اتصال کوتاه محاسبه‌شده (${shortCircuit.initialSymmetricalIscKa} kA متقارن / ${shortCircuit.peakDynamicIpKa} kA پیک) از حداکثر ظرفیت قطع بریکرهای کاتالوگ (${maxCatalogBreakingKa} kA قطع / ${maxCatalogMakingKa} kA وصل) و همچنین جریان نامی بار کامل نیروگاه (${nominalMvCurrentAmps}A) از بالاترین رتبه جریان پیوسته (${maxCatalogIrAmps}A) فراتر است. راه‌حل مهندسی: تفکیک باسبار به چند فیدر کلکتور موازی (Split Busbars) و نصب راکتور محدودکننده جریان (CLR) یا اتصال در سطح ولتاژ بالاتر (مانند ۶۳kV/۱۳۲kV).`;
      switchgearDescriptionEn = `CRITICAL BREAKER CAPACITY & CURRENT INADEQUACY WARNING: Symmetrical fault current (${shortCircuit.initialSymmetricalIscKa} kA) or dynamic peak (${shortCircuit.peakDynamicIpKa} kA) exceeds maximum standard medium-voltage catalog breaker rating (${maxCatalogBreakingKa} kA breaking / ${maxCatalogMakingKa} kA peak making), and plant full-load continuous collector current (${nominalMvCurrentAmps}A) exceeds maximum continuous rating (${maxCatalogIrAmps}A). Engineering resolution: implement split busbar architecture with multiple parallel feeder breakers and add current-limiting reactors (CLR) or interconnect at higher transmission voltage (e.g. 63kV/132kV).`;
    } else if (initialSymmetricalIscKa > maxCatalogBreakingKa || peakDynamicIpKa > maxCatalogMakingKa) {
      switchgearDescriptionFa = `هشدار بحرانی ظرفیت قطع و وصل کلید: جریان اتصال کوتاه محاسبه‌شده (${shortCircuit.initialSymmetricalIscKa} kA متقارن / ${shortCircuit.peakDynamicIpKa} kA پیک) از حداکثر ظرفیت بریکرهای استاندارد MV کاتالوگ (${maxCatalogBreakingKa} kA قطع / ${maxCatalogMakingKa} kA وصل پیک) فراتر است. راه‌حل مهندسی: نصب راکتور محدودکننده جریان (CLR) یا افزایش امپدانس اتصال‌کوتاه ترانسفورماتور پست.`;
      switchgearDescriptionEn = `CRITICAL BREAKER CAPACITY WARNING: Symmetrical fault current (${shortCircuit.initialSymmetricalIscKa} kA) or dynamic peak (${shortCircuit.peakDynamicIpKa} kA) exceeds maximum standard medium-voltage catalog breaker rating (${maxCatalogBreakingKa} kA breaking / ${maxCatalogMakingKa} kA peak making). Sized breaker cannot interrupt this fault; current-limiting reactor (CLR) or higher transformer impedance required.`;
    } else if (nominalMvCurrentAmps > maxCatalogIrAmps) {
      switchgearDescriptionFa = `هشدار عدم کفایت جریان مداوم کلید: جریان نامی بار کامل خروجی نیروگاه (${nominalMvCurrentAmps}A) از بالاترین رتبه جریان پیوسته کلیدهای کاتالوگ (${maxCatalogIrAmps}A) بیشتر است. راه‌حل مهندسی: تفکیک باسبار به چند فیدر کلکتور موازی (Split Busbars) یا اتصال به شبکه در سطح ولتاژ بالاتر (مانند ۶۳kV/۱۳۲kV).`;
      switchgearDescriptionEn = `CIRCUIT BREAKER CONTINUOUS CURRENT EXCEEDED: Plant full-load continuous collector current (${nominalMvCurrentAmps}A) exceeds maximum standard medium-voltage breaker continuous rating (${maxCatalogIrAmps}A). Engineering resolution: implement split busbar architecture with multiple parallel feeder breakers or interconnect at higher transmission voltage (e.g. 63kV/132kV).`;
    } else {
      switchgearDescriptionFa = `هشدار عدم کفایت تحمل حرارتی اتصال کوتاه: انرژی حرارتی معادل اتصال کوتاه (Ith=${shortCircuit.thermalEquivalentIthKa} kA در زمان تداوم خطا ${clearingTimeSec}s) از ظرفیت استقامت حرارتی کلیدهای کاتالوگ فراتر است. راه‌حل مهندسی: تسریع زمان رفع خطا توسط رله‌های دیجیتال سریع‌تر، هماهنگی حفاظتی دقیق‌تر، یا انتخاب کلیدخانه با استقامت حرارتی زمان‌بالا.`;
      switchgearDescriptionEn = `THERMAL SHORT-TIME WITHSTAND EXCEEDED: Thermal equivalent short-circuit current (Ith=${shortCircuit.thermalEquivalentIthKa} kA for clearing duration ${clearingTimeSec}s) exceeds the short-time thermal withstand capacity of standard catalog breakers. Engineering resolution: reduce fault clearing protection duration via high-speed numerical relays or specify switchgear with higher short-time thermal duration.`;
    }
  }

  const notesFa = [
    `ترانسفورماتور افزاینده ${ratedMva} MVA (ظرفیت مؤثر ${effectiveCapacity} MVA با لحاظ افت دمایی ${tempDeratePct}٪ و ارتفاعی ${altDeratePct}٪) با گروه برداری Dyn11 و امپدانس اتصالی ${ukPct}٪ جهت اتصال مطمئن به شبکه ${gridConnectionVoltageKv}kV.`,
    `جریان اتصال کوتاه متقارن اولیه ${shortCircuit.initialSymmetricalIscKa} kA، جریان پیک ضربه‌ای ${shortCircuit.peakDynamicIpKa} kA (ضریب کاپا ${shortCircuit.kappa}) و معادل حرارتی Ith=${shortCircuit.thermalEquivalentIthKa} kA بر اساس امپدانس مختلط R+jX طبق IEC 60909.`,
    ...(isBreakerSufficient
      ? [`کلید دژنکتور منتخب از کاتالوگ مرجع (${shortCircuit.selectedBreakerModel} با قدرت قطع ${breakingCapacityKa} kA متقارن، قدرت وصل ${ratedPeakMakingCapacityKa} kA پیک و تحمل حرارتی ${shortCircuit.ratedShortTimeDurationSec} ثانیه‌ای) مقادیر اتصال کوتاه و بار نامی طراحی را طبق مشخصات کاتالوگ سازنده بر پایه رده‌بندی IEC 62271-100 پوشش می‌دهد؛ انطباق نهایی در اسناد EPC منوط به تایید تایپ‌تست کارخانه‌ای سازنده و تطبیق شرایط محیطی ساختگاه است.`]
      : [`هشدار بحرانی: هیچ بریکر استاندارد MV با مشخصات کافی برای شرایط پروژه یافت نشد (علت عدم انطباق: ${shortCircuit.breakerDeficiencyReason}).`]),
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
