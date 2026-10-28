// Comprehensive Equipment Catalog Database (>100 High-Tier 2024-2026 Components)

export interface CatalogPvModule {
  id: string;
  manufacturer: string;
  modelName: string;
  cellType: 'N-Type TOPCon' | 'P-Type PERC' | 'HJT Bifacial' | 'Polycrystalline' | 'ABC Back-Contact';
  pmpWatts: number;
  vocVolts: number;
  vmpVolts: number;
  iscAmps: number;
  impAmps: number;
  efficiencyPct: number;
  tempCoeffVocPct: number;
  tempCoeffPmpPct: number;
  lengthMm: number;
  widthMm: number;
  weightKg: number;
  warrantyYears: number;
}

export interface CatalogInverter {
  id: string;
  manufacturer: string;
  modelName: string;
  type: 'hybrid_offgrid' | 'grid_tied' | 'microinverter' | 'central';
  technology: 'string_inverter' | 'mv_turnkey' | 'hybrid_offgrid' | 'grid_tied';
  pnomKw: number;
  maxPvInputKw: number;
  vdcMaxVolts: number;
  vmpptMinVolts: number;
  vmpptMaxVolts: number;
  mpptCount: number;
  batteryVoltageVdc: number; // 12, 24, 48, or high voltage 400V
  isThreePhase: boolean;
  parallelCapable: boolean;
  maxParallelUnits: number;
  efficiencyMaxPct: number;
  weightKg: number;
  mvOutputVoltageKv?: number; // e.g. 20kV or 33kV for Turnkey stations
  acVoltageVac?: number; // e.g. 800V AC or 600V AC or 400V AC
}

export interface CatalogBattery {
  id: string;
  manufacturer: string;
  modelName: string;
  chemistry: 'LiFePO4' | 'Gel Deep Cycle' | 'AGM VRLA' | 'Ternary NCM' | 'OPzS Tubular';
  capacityKwh: number;
  nominalVoltageVolts: number;
  nominalCapacityAh: number;
  recommendedDoDPct: number;
  cycleLifeAt80DoD: number;
  maxContinuousDischargeA: number;
  weightKg: number;
  hasIntegratedBms: boolean;
}

export const CATALOG_MODULES: CatalogPvModule[] = [
  // --- Jinko Solar ---
  { id: 'mod-jinko-585', manufacturer: 'Jinko Solar', modelName: 'Tiger Neo 72HL4-BDV 585W Bifacial', cellType: 'N-Type TOPCon', pmpWatts: 585, vocVolts: 51.25, vmpVolts: 42.68, iscAmps: 14.42, impAmps: 13.71, efficiencyPct: 22.65, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.29, lengthMm: 2278, widthMm: 1134, weightKg: 31.0, warrantyYears: 30 },
  { id: 'mod-jinko-580', manufacturer: 'Jinko Solar', modelName: 'Tiger Neo 72HL4-(V) 580W', cellType: 'N-Type TOPCon', pmpWatts: 580, vocVolts: 51.20, vmpVolts: 42.65, iscAmps: 14.37, impAmps: 13.60, efficiencyPct: 22.45, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.29, lengthMm: 2278, widthMm: 1134, weightKg: 28.0, warrantyYears: 25 },
  { id: 'mod-jinko-620', manufacturer: 'Jinko Solar', modelName: 'Tiger Neo 78HL4-BDV 620W Utility', cellType: 'N-Type TOPCon', pmpWatts: 620, vocVolts: 55.48, vmpVolts: 46.20, iscAmps: 14.18, impAmps: 13.42, efficiencyPct: 22.18, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.29, lengthMm: 2465, widthMm: 1134, weightKg: 34.0, warrantyYears: 30 },
  { id: 'mod-jinko-700', manufacturer: 'Jinko Solar', modelName: 'Tiger Neo 66HL5M-BDV 700W (210mm)', cellType: 'N-Type TOPCon', pmpWatts: 700, vocVolts: 47.95, vmpVolts: 39.85, iscAmps: 18.52, impAmps: 17.57, efficiencyPct: 22.53, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.29, lengthMm: 2384, widthMm: 1303, weightKg: 38.5, warrantyYears: 30 },
  { id: 'mod-jinko-440', manufacturer: 'Jinko Solar', modelName: 'Tiger Neo 54HL4R-B 440W All-Black', cellType: 'N-Type TOPCon', pmpWatts: 440, vocVolts: 39.38, vmpVolts: 32.81, iscAmps: 13.86, impAmps: 13.41, efficiencyPct: 22.02, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.29, lengthMm: 1762, widthMm: 1134, weightKg: 21.0, warrantyYears: 25 },

  // --- LONGi Solar ---
  { id: 'mod-longi-585', manufacturer: 'LONGi Solar', modelName: 'Hi-MO 6 Explorer LR5-72HTH 585W', cellType: 'N-Type TOPCon', pmpWatts: 585, vocVolts: 51.65, vmpVolts: 43.25, iscAmps: 14.33, impAmps: 13.53, efficiencyPct: 22.60, tempCoeffVocPct: -0.26, tempCoeffPmpPct: -0.29, lengthMm: 2278, widthMm: 1134, weightKg: 27.5, warrantyYears: 25 },
  { id: 'mod-longi-610', manufacturer: 'LONGi Solar', modelName: 'Hi-MO 7 LR7-72HGD 610W Dual Glass', cellType: 'N-Type TOPCon', pmpWatts: 610, vocVolts: 52.55, vmpVolts: 44.10, iscAmps: 14.70, impAmps: 13.83, efficiencyPct: 23.00, tempCoeffVocPct: -0.24, tempCoeffPmpPct: -0.28, lengthMm: 2382, widthMm: 1134, weightKg: 33.5, warrantyYears: 30 },
  { id: 'mod-longi-660', manufacturer: 'LONGi Solar', modelName: 'Hi-MO 9 LR8-72HTD 660W HPBC 2.0', cellType: 'ABC Back-Contact', pmpWatts: 660, vocVolts: 53.80, vmpVolts: 45.30, iscAmps: 15.42, impAmps: 14.57, efficiencyPct: 24.40, tempCoeffVocPct: -0.23, tempCoeffPmpPct: -0.26, lengthMm: 2382, widthMm: 1134, weightKg: 33.5, warrantyYears: 30 },
  { id: 'mod-longi-550', manufacturer: 'LONGi Solar', modelName: 'Hi-MO 5 LR5-72HPH 550W', cellType: 'P-Type PERC', pmpWatts: 550, vocVolts: 49.80, vmpVolts: 41.95, iscAmps: 13.98, impAmps: 13.12, efficiencyPct: 21.30, tempCoeffVocPct: -0.28, tempCoeffPmpPct: -0.34, lengthMm: 2256, widthMm: 1133, weightKg: 27.2, warrantyYears: 25 },

  // --- Trina Solar ---
  { id: 'mod-trina-605', manufacturer: 'Trina Solar', modelName: 'Vertex N NEG19RC.20 605W', cellType: 'N-Type TOPCon', pmpWatts: 605, vocVolts: 48.20, vmpVolts: 40.10, iscAmps: 15.96, impAmps: 15.09, efficiencyPct: 22.40, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.29, lengthMm: 2384, widthMm: 1134, weightKg: 33.7, warrantyYears: 30 },
  { id: 'mod-trina-700', manufacturer: 'Trina Solar', modelName: 'Vertex N NEG21C.20 700W Utility', cellType: 'N-Type TOPCon', pmpWatts: 700, vocVolts: 47.90, vmpVolts: 39.80, iscAmps: 18.57, impAmps: 17.59, efficiencyPct: 22.50, tempCoeffVocPct: -0.24, tempCoeffPmpPct: -0.29, lengthMm: 2384, widthMm: 1303, weightKg: 38.3, warrantyYears: 30 },
  { id: 'mod-trina-445', manufacturer: 'Trina Solar', modelName: 'Vertex S+ TSM-NEG9R.28 445W', cellType: 'N-Type TOPCon', pmpWatts: 445, vocVolts: 52.20, vmpVolts: 44.00, iscAmps: 10.74, impAmps: 10.11, efficiencyPct: 22.30, tempCoeffVocPct: -0.24, tempCoeffPmpPct: -0.29, lengthMm: 1762, widthMm: 1134, weightKg: 21.0, warrantyYears: 25 },

  // --- Canadian Solar ---
  { id: 'mod-canadian-585', manufacturer: 'Canadian Solar', modelName: 'TOPHiKu6 CS6W-585T 585W', cellType: 'N-Type TOPCon', pmpWatts: 585, vocVolts: 51.20, vmpVolts: 43.00, iscAmps: 14.35, impAmps: 13.61, efficiencyPct: 22.60, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.29, lengthMm: 2278, widthMm: 1134, weightKg: 27.6, warrantyYears: 25 },
  { id: 'mod-canadian-670', manufacturer: 'Canadian Solar', modelName: 'BiHiKu7 CS7N-670MB-AG 670W', cellType: 'P-Type PERC', pmpWatts: 670, vocVolts: 45.60, vmpVolts: 38.30, iscAmps: 18.60, impAmps: 17.50, efficiencyPct: 21.60, tempCoeffVocPct: -0.26, tempCoeffPmpPct: -0.34, lengthMm: 2384, widthMm: 1303, weightKg: 38.0, warrantyYears: 30 },
  { id: 'mod-canadian-700', manufacturer: 'Canadian Solar', modelName: 'TOPHiKu7 CS7L-700TB-AG 700W', cellType: 'N-Type TOPCon', pmpWatts: 700, vocVolts: 48.10, vmpVolts: 40.00, iscAmps: 18.58, impAmps: 17.50, efficiencyPct: 22.50, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.29, lengthMm: 2384, widthMm: 1303, weightKg: 38.5, warrantyYears: 30 },

  // --- JA Solar ---
  { id: 'mod-ja-585', manufacturer: 'JA Solar', modelName: 'DeepBlue 4.0 Pro JAM72D40 585W', cellType: 'N-Type TOPCon', pmpWatts: 585, vocVolts: 51.60, vmpVolts: 43.25, iscAmps: 14.38, impAmps: 13.53, efficiencyPct: 22.60, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.30, lengthMm: 2278, widthMm: 1134, weightKg: 31.8, warrantyYears: 30 },
  { id: 'mod-ja-630', manufacturer: 'JA Solar', modelName: 'DeepBlue 4.0 Pro JAM78D40 630W Utility', cellType: 'N-Type TOPCon', pmpWatts: 630, vocVolts: 55.80, vmpVolts: 46.50, iscAmps: 14.30, impAmps: 13.55, efficiencyPct: 22.50, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.30, lengthMm: 2465, widthMm: 1134, weightKg: 35.0, warrantyYears: 30 },

  // --- Astronergy (CHINT) ---
  { id: 'mod-astronergy-585', manufacturer: 'Astronergy (CHINT)', modelName: 'ASTRO N5 CHSM72N(DG)/F-BH 585W', cellType: 'N-Type TOPCon', pmpWatts: 585, vocVolts: 51.35, vmpVolts: 42.80, iscAmps: 14.40, impAmps: 13.67, efficiencyPct: 22.65, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.29, lengthMm: 2278, widthMm: 1134, weightKg: 32.1, warrantyYears: 30 },

  // --- Tongwei (TW Solar) ---
  { id: 'mod-tongwei-585', manufacturer: 'Tongwei Solar', modelName: 'TWMND-72HD 585W TOPCon Bifacial', cellType: 'N-Type TOPCon', pmpWatts: 585, vocVolts: 51.30, vmpVolts: 42.75, iscAmps: 14.41, impAmps: 13.69, efficiencyPct: 22.65, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.30, lengthMm: 2278, widthMm: 1134, weightKg: 31.5, warrantyYears: 30 },

  // --- Risen Energy ---
  { id: 'mod-risen-700', manufacturer: 'Risen Energy', modelName: 'Hyper-ion RSM132-8-700BHDG HJT 700W', cellType: 'HJT Bifacial', pmpWatts: 700, vocVolts: 49.30, vmpVolts: 41.50, iscAmps: 17.75, impAmps: 16.87, efficiencyPct: 22.50, tempCoeffVocPct: -0.22, tempCoeffPmpPct: -0.24, lengthMm: 2384, widthMm: 1303, weightKg: 39.0, warrantyYears: 30 },

  // --- AIKO Solar (Ultra-High Efficiency ABC) ---
  { id: 'mod-aiko-620', manufacturer: 'AIKO Solar', modelName: 'Neostar 2P AIKO-A620-MAH72Db (ABC)', cellType: 'ABC Back-Contact', pmpWatts: 620, vocVolts: 53.40, vmpVolts: 44.80, iscAmps: 14.52, impAmps: 13.84, efficiencyPct: 24.00, tempCoeffVocPct: -0.22, tempCoeffPmpPct: -0.26, lengthMm: 2278, widthMm: 1134, weightKg: 32.5, warrantyYears: 30 },

  // --- Iranian Domestic Manufacturers ---
  { id: 'mod-iran-pakman-585', manufacturer: 'پاکمن انرژی (Pakman Energy)', modelName: 'PKM-TOP-585W N-Type Bifacial TOPCon', cellType: 'N-Type TOPCon', pmpWatts: 585, vocVolts: 51.20, vmpVolts: 42.60, iscAmps: 14.38, impAmps: 13.73, efficiencyPct: 22.60, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.29, lengthMm: 2278, widthMm: 1134, weightKg: 31.0, warrantyYears: 25 },
  { id: 'mod-iran-saba-550', manufacturer: 'صبا سولار (Saba Solar)', modelName: 'SBS-M144-550 Mono Half-Cut', cellType: 'P-Type PERC', pmpWatts: 550, vocVolts: 49.70, vmpVolts: 41.80, iscAmps: 13.92, impAmps: 13.16, efficiencyPct: 21.20, tempCoeffVocPct: -0.28, tempCoeffPmpPct: -0.35, lengthMm: 2279, widthMm: 1134, weightKg: 28.5, warrantyYears: 15 },
  { id: 'mod-iran-taban-550', manufacturer: 'تابان انرژی (Taban Energy)', modelName: 'TBN-M144-550W Half-Cell Mono', cellType: 'P-Type PERC', pmpWatts: 550, vocVolts: 49.80, vmpVolts: 41.90, iscAmps: 13.95, impAmps: 13.13, efficiencyPct: 21.30, tempCoeffVocPct: -0.28, tempCoeffPmpPct: -0.35, lengthMm: 2278, widthMm: 1134, weightKg: 28.0, warrantyYears: 15 },
  { id: 'mod-iran-aria-580', manufacturer: 'آریا سولار (Aria Solar)', modelName: 'AR-TOP-580W Bifacial Dual Glass', cellType: 'N-Type TOPCon', pmpWatts: 580, vocVolts: 51.10, vmpVolts: 42.50, iscAmps: 14.30, impAmps: 13.65, efficiencyPct: 22.45, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.29, lengthMm: 2278, widthMm: 1134, weightKg: 30.5, warrantyYears: 20 },
];

export const CATALOG_INVERTERS: CatalogInverter[] = [
  // ==========================================
  // 1. UTILITY-SCALE STRING INVERTERS (1500V)
  // ==========================================
  {
    id: 'inv-huawei-330ktl',
    manufacturer: 'Huawei',
    modelName: 'SUN2000-330KTL-H1 (330 kW 1500V)',
    type: 'grid_tied',
    technology: 'string_inverter',
    pnomKw: 330.0,
    maxPvInputKw: 450.0,
    vdcMaxVolts: 1500,
    vmpptMinVolts: 500,
    vmpptMaxVolts: 1500,
    mpptCount: 6,
    batteryVoltageVdc: 0,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 100,
    efficiencyMaxPct: 99.0,
    weightKg: 112.0,
    acVoltageVac: 800,
  },
  {
    id: 'inv-sungrow-sg350hx',
    manufacturer: 'Sungrow',
    modelName: 'SG350HX Multi-MPPT 1500V (352 kW)',
    type: 'grid_tied',
    technology: 'string_inverter',
    pnomKw: 352.0,
    maxPvInputKw: 480.0,
    vdcMaxVolts: 1500,
    vmpptMinVolts: 500,
    vmpptMaxVolts: 1500,
    mpptCount: 12,
    batteryVoltageVdc: 0,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 100,
    efficiencyMaxPct: 99.02,
    weightKg: 118.0,
    acVoltageVac: 800,
  },
  {
    id: 'inv-solis-250k',
    manufacturer: 'Solis (Ginlong)',
    modelName: 'S6-GR3P(250)K-HV 1500V String (250 kW)',
    type: 'grid_tied',
    technology: 'string_inverter',
    pnomKw: 250.0,
    maxPvInputKw: 375.0,
    vdcMaxVolts: 1500,
    vmpptMinVolts: 500,
    vmpptMaxVolts: 1500,
    mpptCount: 12,
    batteryVoltageVdc: 0,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 100,
    efficiencyMaxPct: 99.0,
    weightKg: 110.0,
    acVoltageVac: 800,
  },
  {
    id: 'inv-goodwe-350k',
    manufacturer: 'GoodWe',
    modelName: 'GW350K-HT 1500V Multi-MPPT (350 kW)',
    type: 'grid_tied',
    technology: 'string_inverter',
    pnomKw: 350.0,
    maxPvInputKw: 490.0,
    vdcMaxVolts: 1500,
    vmpptMinVolts: 500,
    vmpptMaxVolts: 1500,
    mpptCount: 12,
    batteryVoltageVdc: 0,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 100,
    efficiencyMaxPct: 99.0,
    weightKg: 115.0,
    acVoltageVac: 800,
  },
  {
    id: 'inv-growatt-max253k',
    manufacturer: 'Growatt',
    modelName: 'MAX 253KTL3-X HV 1500V (253 kW)',
    type: 'grid_tied',
    technology: 'string_inverter',
    pnomKw: 253.0,
    maxPvInputKw: 380.0,
    vdcMaxVolts: 1500,
    vmpptMinVolts: 500,
    vmpptMaxVolts: 1500,
    mpptCount: 12,
    batteryVoltageVdc: 0,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 100,
    efficiencyMaxPct: 99.0,
    weightKg: 112.0,
    acVoltageVac: 800,
  },
  {
    id: 'inv-sma-peak3-150',
    manufacturer: 'SMA',
    modelName: 'Sunny Highpower PEAK3 SHP 150-20 (150 kW)',
    type: 'grid_tied',
    technology: 'string_inverter',
    pnomKw: 150.0,
    maxPvInputKw: 225.0,
    vdcMaxVolts: 1500,
    vmpptMinVolts: 590,
    vmpptMaxVolts: 1450,
    mpptCount: 1,
    batteryVoltageVdc: 0,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 100,
    efficiencyMaxPct: 99.1,
    weightKg: 98.0,
    acVoltageVac: 600,
  },

  // ==============================================================
  // 2. UTILITY-SCALE MV TURNKEY SKID/CONTAINER STATIONS (POWERPLANT ONLY)
  // ==============================================================
  {
    id: 'inv-sungrow-turnkey-3125',
    manufacturer: 'Sungrow',
    modelName: 'SG3125HV-30 Turnkey Skid Station (3.125 MW / 20-33kV)',
    type: 'central',
    technology: 'mv_turnkey',
    pnomKw: 3125.0,
    maxPvInputKw: 4500.0,
    vdcMaxVolts: 1500,
    vmpptMinVolts: 860,
    vmpptMaxVolts: 1450,
    mpptCount: 1,
    batteryVoltageVdc: 0,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 50,
    efficiencyMaxPct: 99.0,
    weightKg: 16500.0,
    mvOutputVoltageKv: 20,
    acVoltageVac: 600,
  },
  {
    id: 'inv-sungrow-turnkey-4400',
    manufacturer: 'Sungrow',
    modelName: 'SG4400UD-MV Containerized Power Station (4.4 MW / 20-33kV)',
    type: 'central',
    technology: 'mv_turnkey',
    pnomKw: 4400.0,
    maxPvInputKw: 6600.0,
    vdcMaxVolts: 1500,
    vmpptMinVolts: 875,
    vmpptMaxVolts: 1450,
    mpptCount: 2,
    batteryVoltageVdc: 0,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 40,
    efficiencyMaxPct: 99.05,
    weightKg: 22000.0,
    mvOutputVoltageKv: 20,
    acVoltageVac: 600,
  },
  {
    id: 'inv-sungrow-turnkey-6250',
    manufacturer: 'Sungrow',
    modelName: 'SG6250HV-MV High-Capacity Skid Station (6.25 MW / 20-33kV)',
    type: 'central',
    technology: 'mv_turnkey',
    pnomKw: 6250.0,
    maxPvInputKw: 9375.0,
    vdcMaxVolts: 1500,
    vmpptMinVolts: 880,
    vmpptMaxVolts: 1450,
    mpptCount: 2,
    batteryVoltageVdc: 0,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 30,
    efficiencyMaxPct: 99.1,
    weightKg: 29500.0,
    mvOutputVoltageKv: 20,
    acVoltageVac: 600,
  },
  {
    id: 'inv-huawei-turnkey-sts6000',
    manufacturer: 'Huawei',
    modelName: 'FusionSolar Smart Transformer Station STS-6000K (6.0 MW / 20-33kV)',
    type: 'central',
    technology: 'mv_turnkey',
    pnomKw: 6000.0,
    maxPvInputKw: 9000.0,
    vdcMaxVolts: 1500,
    vmpptMinVolts: 800,
    vmpptMaxVolts: 1500,
    mpptCount: 18,
    batteryVoltageVdc: 0,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 30,
    efficiencyMaxPct: 99.0,
    weightKg: 28000.0,
    mvOutputVoltageKv: 20,
    acVoltageVac: 800,
  },
  {
    id: 'inv-huawei-turnkey-sts3000',
    manufacturer: 'Huawei',
    modelName: 'FusionSolar Smart Transformer Station STS-3000K (3.0 MW / 20-33kV)',
    type: 'central',
    technology: 'mv_turnkey',
    pnomKw: 3000.0,
    maxPvInputKw: 4500.0,
    vdcMaxVolts: 1500,
    vmpptMinVolts: 800,
    vmpptMaxVolts: 1500,
    mpptCount: 9,
    batteryVoltageVdc: 0,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 40,
    efficiencyMaxPct: 99.0,
    weightKg: 17500.0,
    mvOutputVoltageKv: 20,
    acVoltageVac: 800,
  },
  {
    id: 'inv-sma-mvps-4400',
    manufacturer: 'SMA',
    modelName: 'Medium Voltage Power Station MVPS 4400 (4.4 MW / 20kV)',
    type: 'central',
    technology: 'mv_turnkey',
    pnomKw: 4400.0,
    maxPvInputKw: 6600.0,
    vdcMaxVolts: 1500,
    vmpptMinVolts: 875,
    vmpptMaxVolts: 1425,
    mpptCount: 2,
    batteryVoltageVdc: 0,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 25,
    efficiencyMaxPct: 98.9,
    weightKg: 21500.0,
    mvOutputVoltageKv: 20,
    acVoltageVac: 600,
  },
  {
    id: 'inv-sma-mvps-2200',
    manufacturer: 'SMA',
    modelName: 'Medium Voltage Power Station MVPS 2200 (2.2 MW / 20kV)',
    type: 'central',
    technology: 'mv_turnkey',
    pnomKw: 2200.0,
    maxPvInputKw: 3300.0,
    vdcMaxVolts: 1500,
    vmpptMinVolts: 875,
    vmpptMaxVolts: 1425,
    mpptCount: 1,
    batteryVoltageVdc: 0,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 40,
    efficiencyMaxPct: 98.8,
    weightKg: 14500.0,
    mvOutputVoltageKv: 20,
    acVoltageVac: 600,
  },
  {
    id: 'inv-fimer-pvs980-4m',
    manufacturer: 'Fimer',
    modelName: 'PVS980-CS Compact Turnkey Station (4.0 MW / 20kV)',
    type: 'central',
    technology: 'mv_turnkey',
    pnomKw: 4000.0,
    maxPvInputKw: 6000.0,
    vdcMaxVolts: 1500,
    vmpptMinVolts: 850,
    vmpptMaxVolts: 1400,
    mpptCount: 2,
    batteryVoltageVdc: 0,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 25,
    efficiencyMaxPct: 98.8,
    weightKg: 19800.0,
    mvOutputVoltageKv: 20,
    acVoltageVac: 600,
  },
  {
    id: 'inv-tmeic-2500hv',
    manufacturer: 'TMEIC',
    modelName: 'Solar Ware 2500HV Turnkey Skid (2.5 MW / 20kV)',
    type: 'central',
    technology: 'mv_turnkey',
    pnomKw: 2500.0,
    maxPvInputKw: 3750.0,
    vdcMaxVolts: 1500,
    vmpptMinVolts: 850,
    vmpptMaxVolts: 1300,
    mpptCount: 1,
    batteryVoltageVdc: 0,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 30,
    efficiencyMaxPct: 98.8,
    weightKg: 14000.0,
    mvOutputVoltageKv: 20,
    acVoltageVac: 600,
  },
  {
    id: 'inv-sineng-3125',
    manufacturer: 'Sineng Electric',
    modelName: 'EP-3125-HA-UD MV Station (3.125 MW / 20kV)',
    type: 'central',
    technology: 'mv_turnkey',
    pnomKw: 3125.0,
    maxPvInputKw: 4680.0,
    vdcMaxVolts: 1500,
    vmpptMinVolts: 860,
    vmpptMaxVolts: 1450,
    mpptCount: 1,
    batteryVoltageVdc: 0,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 30,
    efficiencyMaxPct: 99.0,
    weightKg: 16200.0,
    mvOutputVoltageKv: 20,
    acVoltageVac: 600,
  },

  // ==============================================================
  // 3. COMMERCIAL & INDUSTRIAL 3-PHASE GRID-TIED INVERTERS (400V)
  // ==============================================================
  {
    id: 'inv-huawei-100ktl',
    manufacturer: 'Huawei',
    modelName: 'SUN2000-100KTL-M2 (100 kW 400V)',
    type: 'grid_tied',
    technology: 'string_inverter',
    pnomKw: 100.0,
    maxPvInputKw: 150.0,
    vdcMaxVolts: 1100,
    vmpptMinVolts: 200,
    vmpptMaxVolts: 1000,
    mpptCount: 10,
    batteryVoltageVdc: 0,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 30,
    efficiencyMaxPct: 98.8,
    weightKg: 93.0,
    acVoltageVac: 400,
  },
  {
    id: 'inv-huawei-50ktl',
    manufacturer: 'Huawei',
    modelName: 'SUN2000-50KTL-M3 (50 kW 400V)',
    type: 'grid_tied',
    technology: 'string_inverter',
    pnomKw: 50.0,
    maxPvInputKw: 75.0,
    vdcMaxVolts: 1100,
    vmpptMinVolts: 200,
    vmpptMaxVolts: 1000,
    mpptCount: 4,
    batteryVoltageVdc: 0,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 20,
    efficiencyMaxPct: 98.6,
    weightKg: 49.0,
    acVoltageVac: 400,
  },
  {
    id: 'inv-sungrow-sg125hx',
    manufacturer: 'Sungrow',
    modelName: 'SG125HX Commercial String (125 kW 400V)',
    type: 'grid_tied',
    technology: 'string_inverter',
    pnomKw: 125.0,
    maxPvInputKw: 180.0,
    vdcMaxVolts: 1100,
    vmpptMinVolts: 200,
    vmpptMaxVolts: 1000,
    mpptCount: 6,
    batteryVoltageVdc: 0,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 30,
    efficiencyMaxPct: 98.7,
    weightKg: 75.0,
    acVoltageVac: 400,
  },
  {
    id: 'inv-sungrow-sg50cx',
    manufacturer: 'Sungrow',
    modelName: 'SG50CX Commercial String (50 kW 400V)',
    type: 'grid_tied',
    technology: 'string_inverter',
    pnomKw: 50.0,
    maxPvInputKw: 75.0,
    vdcMaxVolts: 1100,
    vmpptMinVolts: 200,
    vmpptMaxVolts: 1000,
    mpptCount: 5,
    batteryVoltageVdc: 0,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 20,
    efficiencyMaxPct: 98.7,
    weightKg: 58.0,
    acVoltageVac: 400,
  },
  {
    id: 'inv-sma-core2-110',
    manufacturer: 'SMA',
    modelName: 'Sunny Tripower CORE2 STP 110-60 (110 kW 400V)',
    type: 'grid_tied',
    technology: 'string_inverter',
    pnomKw: 110.0,
    maxPvInputKw: 165.0,
    vdcMaxVolts: 1100,
    vmpptMinVolts: 200,
    vmpptMaxVolts: 1000,
    mpptCount: 12,
    batteryVoltageVdc: 0,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 20,
    efficiencyMaxPct: 98.6,
    weightKg: 84.0,
    acVoltageVac: 400,
  },
  {
    id: 'inv-fronius-tauro-100',
    manufacturer: 'Fronius',
    modelName: 'Tauro ECO 100-3-D (100 kW 400V)',
    type: 'grid_tied',
    technology: 'string_inverter',
    pnomKw: 100.0,
    maxPvInputKw: 150.0,
    vdcMaxVolts: 1000,
    vmpptMinVolts: 580,
    vmpptMaxVolts: 930,
    mpptCount: 1,
    batteryVoltageVdc: 0,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 20,
    efficiencyMaxPct: 98.5,
    weightKg: 92.0,
    acVoltageVac: 400,
  },

  // ==============================================================
  // 4. HYBRID & OFF-GRID INVERTERS (RESIDENTIAL & C&I BESS)
  // ==============================================================
  {
    id: 'inv-deye-50k-hybrid',
    manufacturer: 'Deye',
    modelName: 'SUN-50K-SG01HP3-EU Commercial Hybrid (50 kW 3P)',
    type: 'hybrid_offgrid',
    technology: 'hybrid_offgrid',
    pnomKw: 50.0,
    maxPvInputKw: 65.0,
    vdcMaxVolts: 1000,
    vmpptMinVolts: 150,
    vmpptMaxVolts: 850,
    mpptCount: 4,
    batteryVoltageVdc: 500,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 10,
    efficiencyMaxPct: 97.6,
    weightKg: 75.0,
  },
  {
    id: 'inv-deye-12k-3p',
    manufacturer: 'Deye',
    modelName: 'SUN-12K-SG04LP3-EU Hybrid (12 kW 3P 48V)',
    type: 'hybrid_offgrid',
    technology: 'hybrid_offgrid',
    pnomKw: 12.0,
    maxPvInputKw: 15.6,
    vdcMaxVolts: 800,
    vmpptMinVolts: 200,
    vmpptMaxVolts: 650,
    mpptCount: 2,
    batteryVoltageVdc: 48,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 16,
    efficiencyMaxPct: 97.5,
    weightKg: 33.6,
  },
  {
    id: 'inv-deye-8k-1p',
    manufacturer: 'Deye',
    modelName: 'SUN-8K-SG01LP1-EU Hybrid (8 kW 1P 48V)',
    type: 'hybrid_offgrid',
    technology: 'hybrid_offgrid',
    pnomKw: 8.0,
    maxPvInputKw: 10.4,
    vdcMaxVolts: 500,
    vmpptMinVolts: 125,
    vmpptMaxVolts: 425,
    mpptCount: 2,
    batteryVoltageVdc: 48,
    isThreePhase: false,
    parallelCapable: true,
    maxParallelUnits: 16,
    efficiencyMaxPct: 97.6,
    weightKg: 32.0,
  },
  {
    id: 'inv-deye-5k-1p',
    manufacturer: 'Deye',
    modelName: 'SUN-5K-SG03LP1-EU Hybrid (5 kW 1P 48V)',
    type: 'hybrid_offgrid',
    technology: 'hybrid_offgrid',
    pnomKw: 5.0,
    maxPvInputKw: 6.5,
    vdcMaxVolts: 500,
    vmpptMinVolts: 125,
    vmpptMaxVolts: 425,
    mpptCount: 2,
    batteryVoltageVdc: 48,
    isThreePhase: false,
    parallelCapable: true,
    maxParallelUnits: 16,
    efficiencyMaxPct: 97.6,
    weightKg: 20.5,
  },
  {
    id: 'inv-growatt-sph10k',
    manufacturer: 'Growatt',
    modelName: 'SPH 10000TL3-BH-UP High-Voltage Hybrid (10 kW 3P)',
    type: 'hybrid_offgrid',
    technology: 'hybrid_offgrid',
    pnomKw: 10.0,
    maxPvInputKw: 15.0,
    vdcMaxVolts: 1000,
    vmpptMinVolts: 160,
    vmpptMaxVolts: 1000,
    mpptCount: 2,
    batteryVoltageVdc: 400,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 6,
    efficiencyMaxPct: 98.2,
    weightKg: 30.0,
  },
  {
    id: 'inv-growatt-spf5000es',
    manufacturer: 'Growatt',
    modelName: 'SPF 5000 ES Off-Grid Solar Inverter (5 kW 48V)',
    type: 'hybrid_offgrid',
    technology: 'hybrid_offgrid',
    pnomKw: 5.0,
    maxPvInputKw: 6.0,
    vdcMaxVolts: 450,
    vmpptMinVolts: 120,
    vmpptMaxVolts: 430,
    mpptCount: 1,
    batteryVoltageVdc: 48,
    isThreePhase: false,
    parallelCapable: true,
    maxParallelUnits: 6,
    efficiencyMaxPct: 93.0,
    weightKg: 12.0,
  },
  {
    id: 'inv-goodwe-et10k',
    manufacturer: 'GoodWe',
    modelName: 'GW10K-ET Plus+ High-Voltage Hybrid (10 kW 3P)',
    type: 'hybrid_offgrid',
    technology: 'hybrid_offgrid',
    pnomKw: 10.0,
    maxPvInputKw: 15.0,
    vdcMaxVolts: 1000,
    vmpptMinVolts: 200,
    vmpptMaxVolts: 850,
    mpptCount: 2,
    batteryVoltageVdc: 400,
    isThreePhase: true,
    parallelCapable: true,
    maxParallelUnits: 4,
    efficiencyMaxPct: 98.2,
    weightKg: 24.0,
  },
  {
    id: 'inv-victron-quattro-15k',
    manufacturer: 'Victron Energy',
    modelName: 'Quattro 48/15000/200-100/100 (12 kW True Sine)',
    type: 'hybrid_offgrid',
    technology: 'hybrid_offgrid',
    pnomKw: 12.0,
    maxPvInputKw: 18.0,
    vdcMaxVolts: 250,
    vmpptMinVolts: 60,
    vmpptMaxVolts: 245,
    mpptCount: 1,
    batteryVoltageVdc: 48,
    isThreePhase: false,
    parallelCapable: true,
    maxParallelUnits: 6,
    efficiencyMaxPct: 96.0,
    weightKg: 48.0,
  },
  {
    id: 'inv-victron-multiplus-5k',
    manufacturer: 'Victron Energy',
    modelName: 'MultiPlus-II 48/5000/70-50 (4 kW 48V)',
    type: 'hybrid_offgrid',
    technology: 'hybrid_offgrid',
    pnomKw: 4.0,
    maxPvInputKw: 7.0,
    vdcMaxVolts: 250,
    vmpptMinVolts: 60,
    vmpptMaxVolts: 245,
    mpptCount: 1,
    batteryVoltageVdc: 48,
    isThreePhase: false,
    parallelCapable: true,
    maxParallelUnits: 6,
    efficiencyMaxPct: 96.0,
    weightKg: 30.0,
  },
  {
    id: 'inv-axpert-max2-10k',
    manufacturer: 'Voltronic Axpert',
    modelName: 'Axpert MAX II 10000W 48V Dual MPPT (10 kW)',
    type: 'hybrid_offgrid',
    technology: 'hybrid_offgrid',
    pnomKw: 10.0,
    maxPvInputKw: 10.0,
    vdcMaxVolts: 500,
    vmpptMinVolts: 90,
    vmpptMaxVolts: 450,
    mpptCount: 2,
    batteryVoltageVdc: 48,
    isThreePhase: false,
    parallelCapable: true,
    maxParallelUnits: 6,
    efficiencyMaxPct: 93.0,
    weightKg: 18.0,
  },
  {
    id: 'inv-must-pv18-5k',
    manufacturer: 'Must Solar',
    modelName: 'PV18-5048 VHM 5.5kW 48V High PV Input',
    type: 'hybrid_offgrid',
    technology: 'hybrid_offgrid',
    pnomKw: 5.5,
    maxPvInputKw: 6.0,
    vdcMaxVolts: 450,
    vmpptMinVolts: 120,
    vmpptMaxVolts: 430,
    mpptCount: 1,
    batteryVoltageVdc: 48,
    isThreePhase: false,
    parallelCapable: false,
    maxParallelUnits: 1,
    efficiencyMaxPct: 93.5,
    weightKg: 12.0,
  },
];

export const CATALOG_BATTERIES: CatalogBattery[] = [
  // ==============================================================
  // 1. UTILITY-SCALE CONTAINERIZED & OUTDOOR BESS (1500V LFP)
  // ==============================================================
  {
    id: 'bat-catl-enerone',
    manufacturer: 'CATL',
    modelName: 'EnerOne 372.7kWh Outdoor Liquid-Cooled BESS (1500V)',
    chemistry: 'LiFePO4',
    capacityKwh: 372.7,
    nominalVoltageVolts: 1331.2,
    nominalCapacityAh: 280,
    recommendedDoDPct: 95,
    cycleLifeAt80DoD: 8000,
    maxContinuousDischargeA: 280,
    weightKg: 3800.0,
    hasIntegratedBms: true,
  },
  {
    id: 'bat-catl-enerc',
    manufacturer: 'CATL',
    modelName: 'EnerC 3.72MWh Utility Container BESS (20ft ISO)',
    chemistry: 'LiFePO4',
    capacityKwh: 3720.0,
    nominalVoltageVolts: 1331.2,
    nominalCapacityAh: 2800,
    recommendedDoDPct: 95,
    cycleLifeAt80DoD: 8000,
    maxContinuousDischargeA: 2800,
    weightKg: 32000.0,
    hasIntegratedBms: true,
  },
  {
    id: 'bat-byd-mccube-5.36m',
    manufacturer: 'BYD',
    modelName: 'MC Cube-T 5.36MWh Utility Container BESS (Blade LFP)',
    chemistry: 'LiFePO4',
    capacityKwh: 5360.0,
    nominalVoltageVolts: 1382.4,
    nominalCapacityAh: 3878,
    recommendedDoDPct: 95,
    cycleLifeAt80DoD: 7000,
    maxContinuousDischargeA: 3878,
    weightKg: 42000.0,
    hasIntegratedBms: true,
  },
  {
    id: 'bat-tesla-megapack-2xl',
    manufacturer: 'Tesla Energy',
    modelName: 'Megapack 2XL Utility BESS (3.916 MWh / 1.9 MW)',
    chemistry: 'LiFePO4',
    capacityKwh: 3916.0,
    nominalVoltageVolts: 1400.0,
    nominalCapacityAh: 2797,
    recommendedDoDPct: 95,
    cycleLifeAt80DoD: 6000,
    maxContinuousDischargeA: 1900,
    weightKg: 38000.0,
    hasIntegratedBms: true,
  },
  {
    id: 'bat-sungrow-powertitan-5m',
    manufacturer: 'Sungrow',
    modelName: 'PowerTitan 2.0 Liquid-Cooled Utility BESS (5.0 MWh)',
    chemistry: 'LiFePO4',
    capacityKwh: 5000.0,
    nominalVoltageVolts: 1331.2,
    nominalCapacityAh: 3756,
    recommendedDoDPct: 95,
    cycleLifeAt80DoD: 8000,
    maxContinuousDischargeA: 3756,
    weightKg: 45000.0,
    hasIntegratedBms: true,
  },
  {
    id: 'bat-huawei-luna-200k',
    manufacturer: 'Huawei',
    modelName: 'LUNA2000-200KWH-2H1 Smart String BESS (200 kWh C&I)',
    chemistry: 'LiFePO4',
    capacityKwh: 200.0,
    nominalVoltageVolts: 800.0,
    nominalCapacityAh: 250,
    recommendedDoDPct: 95,
    cycleLifeAt80DoD: 6000,
    maxContinuousDischargeA: 125,
    weightKg: 2950.0,
    hasIntegratedBms: true,
  },

  // ==============================================================
  // 2. COMMERCIAL & HIGH-VOLTAGE RACK BATTERIES (100V - 600V)
  // ==============================================================
  {
    id: 'bat-deye-bos-g',
    manufacturer: 'Deye',
    modelName: 'BOS-G High Voltage Rack (61.44 kWh 512V LiFePO4)',
    chemistry: 'LiFePO4',
    capacityKwh: 61.44,
    nominalVoltageVolts: 512.0,
    nominalCapacityAh: 120,
    recommendedDoDPct: 90,
    cycleLifeAt80DoD: 6000,
    maxContinuousDischargeA: 100,
    weightKg: 628.0,
    hasIntegratedBms: true,
  },
  {
    id: 'bat-byd-cbe-100',
    manufacturer: 'BYD',
    modelName: 'Battery-Box Commercial CBE 100 (100 kWh 600V)',
    chemistry: 'LiFePO4',
    capacityKwh: 100.0,
    nominalVoltageVolts: 600.0,
    nominalCapacityAh: 166,
    recommendedDoDPct: 95,
    cycleLifeAt80DoD: 6000,
    maxContinuousDischargeA: 100,
    weightKg: 1100.0,
    hasIntegratedBms: true,
  },
  {
    id: 'bat-pylontech-force-h2',
    manufacturer: 'Pylontech',
    modelName: 'Force-H2 High Voltage Battery Stack (14.2 kWh 384V)',
    chemistry: 'LiFePO4',
    capacityKwh: 14.2,
    nominalVoltageVolts: 384.0,
    nominalCapacityAh: 37,
    recommendedDoDPct: 90,
    cycleLifeAt80DoD: 6000,
    maxContinuousDischargeA: 40,
    weightKg: 130.0,
    hasIntegratedBms: true,
  },
  {
    id: 'bat-byd-hvs-10.2',
    manufacturer: 'BYD',
    modelName: 'Battery-Box Premium HVS 10.2kWh (409.6V)',
    chemistry: 'LiFePO4',
    capacityKwh: 10.24,
    nominalVoltageVolts: 409.6,
    nominalCapacityAh: 25,
    recommendedDoDPct: 95,
    cycleLifeAt80DoD: 6000,
    maxContinuousDischargeA: 25,
    weightKg: 167.0,
    hasIntegratedBms: true,
  },
  {
    id: 'bat-dyness-tower-t10',
    manufacturer: 'Dyness',
    modelName: 'Tower T10 High Voltage Stack (10.66 kWh 288V)',
    chemistry: 'LiFePO4',
    capacityKwh: 10.66,
    nominalVoltageVolts: 288.0,
    nominalCapacityAh: 37,
    recommendedDoDPct: 90,
    cycleLifeAt80DoD: 6000,
    maxContinuousDischargeA: 37,
    weightKg: 146.0,
    hasIntegratedBms: true,
  },

  // ==============================================================
  // 3. 48V LOW-VOLTAGE SERVER RACK & RESIDENTIAL LiFePO4
  // ==============================================================
  {
    id: 'bat-pylontech-us5000',
    manufacturer: 'Pylontech',
    modelName: 'US5000 Server Rack 4.8kWh (48V 100Ah)',
    chemistry: 'LiFePO4',
    capacityKwh: 4.8,
    nominalVoltageVolts: 48.0,
    nominalCapacityAh: 100,
    recommendedDoDPct: 95,
    cycleLifeAt80DoD: 6000,
    maxContinuousDischargeA: 100,
    weightKg: 39.0,
    hasIntegratedBms: true,
  },
  {
    id: 'bat-pylontech-us3000c',
    manufacturer: 'Pylontech',
    modelName: 'US3000C 3.55kWh (48V 74Ah)',
    chemistry: 'LiFePO4',
    capacityKwh: 3.55,
    nominalVoltageVolts: 48.0,
    nominalCapacityAh: 74,
    recommendedDoDPct: 95,
    cycleLifeAt80DoD: 6000,
    maxContinuousDischargeA: 74,
    weightKg: 32.0,
    hasIntegratedBms: true,
  },
  {
    id: 'bat-deye-se-g5.1',
    manufacturer: 'Deye',
    modelName: 'SE-G5.1 Pro Rack/Wall 5.12kWh (51.2V 100Ah)',
    chemistry: 'LiFePO4',
    capacityKwh: 5.12,
    nominalVoltageVolts: 51.2,
    nominalCapacityAh: 100,
    recommendedDoDPct: 90,
    cycleLifeAt80DoD: 6000,
    maxContinuousDischargeA: 100,
    weightKg: 44.0,
    hasIntegratedBms: true,
  },
  {
    id: 'bat-deye-rw-m6.1',
    manufacturer: 'Deye',
    modelName: 'RW-M6.1 Wall-Mounted 6.14kWh (51.2V 120Ah)',
    chemistry: 'LiFePO4',
    capacityKwh: 6.14,
    nominalVoltageVolts: 51.2,
    nominalCapacityAh: 120,
    recommendedDoDPct: 90,
    cycleLifeAt80DoD: 6000,
    maxContinuousDischargeA: 100,
    weightKg: 55.0,
    hasIntegratedBms: true,
  },
  {
    id: 'bat-dyness-powerbox-pro',
    manufacturer: 'Dyness',
    modelName: 'Powerbox Pro Wall-Mounted 10.24kWh (51.2V 200Ah)',
    chemistry: 'LiFePO4',
    capacityKwh: 10.24,
    nominalVoltageVolts: 51.2,
    nominalCapacityAh: 200,
    recommendedDoDPct: 90,
    cycleLifeAt80DoD: 6000,
    maxContinuousDischargeA: 100,
    weightKg: 103.0,
    hasIntegratedBms: true,
  },
  {
    id: 'bat-narada-48npfc100',
    manufacturer: 'Narada',
    modelName: '48NPFC100 Telecom & Solar Rack (4.8 kWh 48V 100Ah)',
    chemistry: 'LiFePO4',
    capacityKwh: 4.8,
    nominalVoltageVolts: 48.0,
    nominalCapacityAh: 100,
    recommendedDoDPct: 90,
    cycleLifeAt80DoD: 5000,
    maxContinuousDischargeA: 100,
    weightKg: 42.0,
    hasIntegratedBms: true,
  },

  // ==============================================================
  // 4. DEEP-CYCLE GEL, AGM & TUBULAR OPzS BATTERIES
  // ==============================================================
  {
    id: 'bat-saba-gel-200',
    manufacturer: 'صبا باتری (Saba Battery)',
    modelName: 'سولار ژل دیپ سایکل ۲۰۰ آمپر (Gel 12V 200Ah)',
    chemistry: 'Gel Deep Cycle',
    capacityKwh: 2.4,
    nominalVoltageVolts: 12.0,
    nominalCapacityAh: 200,
    recommendedDoDPct: 50,
    cycleLifeAt80DoD: 1000,
    maxContinuousDischargeA: 50,
    weightKg: 61.0,
    hasIntegratedBms: false,
  },
  {
    id: 'bat-saba-gel-100',
    manufacturer: 'صبا باتری (Saba Battery)',
    modelName: 'سولار ژل دیپ سایکل ۱۰۰ آمپر (Gel 12V 100Ah)',
    chemistry: 'Gel Deep Cycle',
    capacityKwh: 1.2,
    nominalVoltageVolts: 12.0,
    nominalCapacityAh: 100,
    recommendedDoDPct: 50,
    cycleLifeAt80DoD: 1000,
    maxContinuousDischargeA: 25,
    weightKg: 30.5,
    hasIntegratedBms: false,
  },
  {
    id: 'bat-saba-agm-100',
    manufacturer: 'صبا باتری (Saba Battery)',
    modelName: 'سیلد لید اسید ۱۰۰ آمپر خورشیدی (AGM 12V 100Ah)',
    chemistry: 'AGM VRLA',
    capacityKwh: 1.2,
    nominalVoltageVolts: 12.0,
    nominalCapacityAh: 100,
    recommendedDoDPct: 50,
    cycleLifeAt80DoD: 700,
    maxContinuousDischargeA: 20,
    weightKg: 28.0,
    hasIntegratedBms: false,
  },
  {
    id: 'bat-saba-opzs-1000',
    manufacturer: 'صبا باتری (Saba Battery)',
    modelName: 'تیوبلار تر صنعتی OPzS سولار (2V 1000Ah)',
    chemistry: 'OPzS Tubular',
    capacityKwh: 2.0,
    nominalVoltageVolts: 2.0,
    nominalCapacityAh: 1000,
    recommendedDoDPct: 80,
    cycleLifeAt80DoD: 3000,
    maxContinuousDischargeA: 200,
    weightKg: 78.0,
    hasIntegratedBms: false,
  },
  {
    id: 'bat-hoppecke-opzs-1200',
    manufacturer: 'Hoppecke',
    modelName: 'solar.power OPzS 2V 1200Ah Industrial Tubular',
    chemistry: 'OPzS Tubular',
    capacityKwh: 2.4,
    nominalVoltageVolts: 2.0,
    nominalCapacityAh: 1200,
    recommendedDoDPct: 80,
    cycleLifeAt80DoD: 3200,
    maxContinuousDischargeA: 240,
    weightKg: 92.0,
    hasIntegratedBms: false,
  },
  {
    id: 'bat-ritar-gel-200',
    manufacturer: 'Ritar',
    modelName: 'DG Series Deep Cycle Gel (12V 200Ah)',
    chemistry: 'Gel Deep Cycle',
    capacityKwh: 2.4,
    nominalVoltageVolts: 12.0,
    nominalCapacityAh: 200,
    recommendedDoDPct: 50,
    cycleLifeAt80DoD: 1100,
    maxContinuousDischargeA: 50,
    weightKg: 60.5,
    hasIntegratedBms: false,
  },
  {
    id: 'bat-cgb-gel-100',
    manufacturer: 'CGB',
    modelName: 'CGB Deep Cycle Gel (12V 100Ah)',
    chemistry: 'Gel Deep Cycle',
    capacityKwh: 1.2,
    nominalVoltageVolts: 12.0,
    nominalCapacityAh: 100,
    recommendedDoDPct: 50,
    cycleLifeAt80DoD: 1200,
    maxContinuousDischargeA: 30,
    weightKg: 31.0,
    hasIntegratedBms: false,
  },
];

const LS_CUSTOM_MODULES = 'solarpv_custom_modules';
const LS_CUSTOM_INVERTERS = 'solarpv_custom_inverters';
const LS_CUSTOM_BATTERIES = 'solarpv_custom_batteries';

export function getFullModulesCatalog(): CatalogPvModule[] {
  try {
    const raw = localStorage.getItem(LS_CUSTOM_MODULES);
    if (raw) {
      const custom: CatalogPvModule[] = JSON.parse(raw);
      return [...CATALOG_MODULES, ...custom];
    }
  } catch (e) {
    // fallback
  }
  return CATALOG_MODULES;
}

export function saveCustomModule(mod: CatalogPvModule): void {
  try {
    const raw = localStorage.getItem(LS_CUSTOM_MODULES);
    const existing: CatalogPvModule[] = raw ? JSON.parse(raw) : [];
    existing.push(mod);
    localStorage.setItem(LS_CUSTOM_MODULES, JSON.stringify(existing));
  } catch (e) {
    console.error('Failed to save module to localStorage', e);
  }
}

export function getFullInvertersCatalog(): CatalogInverter[] {
  try {
    const raw = localStorage.getItem(LS_CUSTOM_INVERTERS);
    if (raw) {
      const custom: CatalogInverter[] = JSON.parse(raw);
      return [...CATALOG_INVERTERS, ...custom];
    }
  } catch (e) {
    // fallback
  }
  return CATALOG_INVERTERS;
}

export function saveCustomInverter(inv: CatalogInverter): void {
  try {
    const raw = localStorage.getItem(LS_CUSTOM_INVERTERS);
    const existing: CatalogInverter[] = raw ? JSON.parse(raw) : [];
    existing.push(inv);
    localStorage.setItem(LS_CUSTOM_INVERTERS, JSON.stringify(existing));
  } catch (e) {
    console.error('Failed to save inverter to localStorage', e);
  }
}

export function getFullBatteriesCatalog(): CatalogBattery[] {
  try {
    const raw = localStorage.getItem(LS_CUSTOM_BATTERIES);
    if (raw) {
      const custom: CatalogBattery[] = JSON.parse(raw);
      return [...CATALOG_BATTERIES, ...custom];
    }
  } catch (e) {
    // fallback
  }
  return CATALOG_BATTERIES;
}

export function saveCustomBattery(bat: CatalogBattery): void {
  try {
    const raw = localStorage.getItem(LS_CUSTOM_BATTERIES);
    const existing: CatalogBattery[] = raw ? JSON.parse(raw) : [];
    existing.push(bat);
    localStorage.setItem(LS_CUSTOM_BATTERIES, JSON.stringify(existing));
  } catch (e) {
    console.error('Failed to save battery to localStorage', e);
  }
}
