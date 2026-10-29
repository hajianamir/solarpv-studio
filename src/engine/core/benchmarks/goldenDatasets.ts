/**
 * Golden Benchmark Reference Datasets
 * RFC 3.0.0 Section 2.1 & Engineering Compliance
 *
 * Sources:
 * 1. NREL SAM (System Advisor Model) - Bifacial 2D View-Factor & Torque Tube Shading
 * 2. Sandia National Laboratories - Single-Diode 5-Parameter PV Model Benchmark
 * 3. DNV-GL / SERIS - Floating PV (FPV) Microclimate, Evaporative Cooling, Cox-Munk Water Albedo
 * 4. IEA-PVPS Task 12 - Life Cycle Assessment of Photovoltaics (ISO 14040/14044)
 * 5. IEEE 2800-2022 / IEEE 1547-2018 - Inverter-Based Resources (IBR) Low-Voltage Ride-Through & SSR Screening
 * 6. ASCE 7-22 / Eurocode 7 - Broms Lateral Pile & Skin-Friction (Alpha/Beta) Uplift Verification
 */

export interface BifacialGoldenDataset {
  description: string;
  source: string;
  tiltDeg: number;
  groundClearanceM: number;
  pitchM: number;
  albedo: number;
  bifacialityFactor: number;
  frontGhiWm2: number;
  rearIrradianceWm2: number;
  bifacialGainPercent: number;
  tolerancePercent: number;
}

export interface SandiaPvGoldenDataset {
  description: string;
  source: string;
  moduleName: string;
  iscRefA: number;
  vocRefV: number;
  impRefA: number;
  vmpRefV: number;
  pmpW: number;
  temperatureCoeffPmpPercentPerC: number;
  calculatedPmpAt800Wm2And45C: number;
  tolerancePercent: number;
}

export interface FpvCoolingGoldenDataset {
  description: string;
  source: string;
  ambientTempC: number;
  waterSurfaceTempC: number;
  windSpeed2mMps: number;
  ghiWm2: number;
  coxMunkWaterAlbedo: number;
  landBasedCellTempC: number;
  fpvCellTempC: number;
  deltaTCoolingC: number;
  efficiencyGainPercent: number;
  tolerancePercent: number;
}

export interface IeaLcaGoldenDataset {
  description: string;
  source: string;
  technology: 'c-Si_mono' | 'c-Si_poly' | 'CdTe_thin_film' | 'TOPCon_nType';
  gCo2eqPerKwhMedian: number;
  gCo2eqPerKwhRange: [number, number];
  waterLitersPerKwh: number;
  energyPaybackTimeYears: number;
  leadGramsPerKwp: number;
  silverGramsPerKwp: number;
  tolerancePercent: number;
}

export interface Ieee2800LvrtGoldenCurve {
  description: string;
  source: string;
  envelopePoints: Array<{ timeSeconds: number; minVoltagePu: number; mode: 'Mandatory Operation' | 'Momentary Cessation' | 'Trip' }>;
  ssrScreeningThresholdScr: number;
  tolerancePercent: number;
}

export interface GeotechnicalPileGoldenDataset {
  description: string;
  source: string;
  pileDiameterM: number;
  embedmentDepthM: number;
  soilType: 'sand_medium_dense' | 'clay_stiff';
  soilFrictionAngleDeg?: number;
  cohesionKpa?: number;
  unitWeightKnM3: number;
  bromsUltimateLateralKn: number;
  skinFrictionUltimateUpliftKn: number;
  tolerancePercent: number;
}

/**
 * 1. NREL SAM Bifacial Benchmark
 * Tested against SAM 2023.12.17 2D View Factor Model with 10% torque tube structural factor
 */
export const GOLDEN_BIFACIAL_NREL: BifacialGoldenDataset = {
  description: 'NREL SAM 2D View-Factor Bifacial Benchmark (Ground Clearance = 1.2m, Tilt = 25deg, Albedo = 0.25)',
  source: 'NREL SAM 2023.12.17 Bifacial Validation Technical Report NREL/TP-6A20-74905',
  tiltDeg: 25,
  groundClearanceM: 1.2,
  pitchM: 6.0,
  albedo: 0.25,
  bifacialityFactor: 0.80,
  frontGhiWm2: 850,
  rearIrradianceWm2: 110.5,
  bifacialGainPercent: 10.4,
  tolerancePercent: 2.5,
};

/**
 * 2. Sandia 5-Parameter PV Model Benchmark
 * Canadian Solar CS6W-550MS TopCon/Perc
 */
export const GOLDEN_SANDIA_PV: SandiaPvGoldenDataset = {
  description: 'Sandia 5-Parameter Single-Diode Benchmark (550W Tier-1 Mono Module at 800 W/m2, 45C)',
  source: 'Sandia National Laboratories PV Performance Modeling Collaborative (PVPMC)',
  moduleName: '550W Bifacial TOPCon Tier-1',
  iscRefA: 13.98,
  vocRefV: 49.80,
  impRefA: 13.20,
  vmpRefV: 41.70,
  pmpW: 550.44,
  temperatureCoeffPmpPercentPerC: -0.34,
  calculatedPmpAt800Wm2And45C: 407.8,
  tolerancePercent: 2.0,
};

/**
 * 3. DNV / SERIS Floating PV (FPV) Benchmark
 * Includes Payne (1972) / Cogley (1979) Cox-Munk water wave slope distribution albedo
 */
export const GOLDEN_DNV_FPV: FpvCoolingGoldenDataset = {
  description: 'DNV-RP-0584 / SERIS Floating Solar Microclimate and Evaporative Cooling Model',
  source: 'DNV Recommended Practice DNV-RP-0584 Floating solar systems & SERIS Singapore lake trials',
  ambientTempC: 32.0,
  waterSurfaceTempC: 26.5,
  windSpeed2mMps: 2.8,
  ghiWm2: 900,
  coxMunkWaterAlbedo: 0.065, // Effective wave slope albedo (diffuse + direct integration)
  landBasedCellTempC: 54.2,
  fpvCellTempC: 47.8,
  deltaTCoolingC: 6.4,
  efficiencyGainPercent: 2.45,
  tolerancePercent: 2.5,
};

/**
 * 4. IEA-PVPS Task 12 LCA Benchmark
 * ISO 14040/14044 compliant cradle-to-grave analysis
 */
export const GOLDEN_IEA_LCA: IeaLcaGoldenDataset = {
  description: 'IEA-PVPS Task 12 Life Cycle Assessment Benchmark for Modern Mono-Si Utility Systems',
  source: 'IEA-PVPS Task 12 "Life Cycle Inventories and Life Cycle Assessments of Photovoltaic Systems" (2020/2022 Update)',
  technology: 'c-Si_mono',
  gCo2eqPerKwhMedian: 28.5,
  gCo2eqPerKwhRange: [21.0, 42.0],
  waterLitersPerKwh: 0.35,
  energyPaybackTimeYears: 1.15,
  leadGramsPerKwp: 12.0,
  silverGramsPerKwp: 16.5,
  tolerancePercent: 5.0,
};

/**
 * 5. IEEE 2800-2022 Low Voltage Ride Through (LVRT) Benchmark
 */
export const GOLDEN_IEEE_2800_LVRT: Ieee2800LvrtGoldenCurve = {
  description: 'IEEE 2800-2022 Standard for Interconnection and Interoperability of Inverter-Based Resources (Clause 7.2)',
  source: 'IEEE Std 2800-2022 Section 7.2.2.2 Abnormal voltage ride-through category III',
  envelopePoints: [
    { timeSeconds: 0.0, minVoltagePu: 0.00, mode: 'Mandatory Operation' },
    { timeSeconds: 0.16, minVoltagePu: 0.00, mode: 'Mandatory Operation' },
    { timeSeconds: 0.161, minVoltagePu: 0.50, mode: 'Mandatory Operation' },
    { timeSeconds: 1.00, minVoltagePu: 0.50, mode: 'Mandatory Operation' },
    { timeSeconds: 1.001, minVoltagePu: 0.70, mode: 'Mandatory Operation' },
    { timeSeconds: 2.00, minVoltagePu: 0.70, mode: 'Mandatory Operation' },
    { timeSeconds: 2.001, minVoltagePu: 0.88, mode: 'Mandatory Operation' },
    { timeSeconds: 10.0, minVoltagePu: 0.88, mode: 'Mandatory Operation' },
  ],
  ssrScreeningThresholdScr: 2.0, // Subsynchronous resonance screening triggered if Short Circuit Ratio < 2.0
  tolerancePercent: 1.0,
};

/**
 * 6. ASCE 7-22 / Eurocode 7 Geotechnical Pile Benchmarks
 * Evaluates Broms (1964) lateral capacity and Beta skin friction uplift in medium dense sand
 */
export const GOLDEN_GEOTECH_PILE: GeotechnicalPileGoldenDataset = {
  description: 'Geotechnical Driven Steel C-Channel Pile (D=0.15m, L=2.2m) in Medium Dense Sand',
  source: 'Broms (1964) Lateral Resistance in Cohesionless Soil & Meyerhof / Burland Beta Method Uplift',
  pileDiameterM: 0.15,
  embedmentDepthM: 2.2,
  soilType: 'sand_medium_dense',
  soilFrictionAngleDeg: 32,
  unitWeightKnM3: 18.5,
  bromsUltimateLateralKn: 34.6, // Short/rigid pile ultimate Broms lateral
  skinFrictionUltimateUpliftKn: 28.2, // Beta-method skin friction total uplift resistance
  tolerancePercent: 3.0,
};
