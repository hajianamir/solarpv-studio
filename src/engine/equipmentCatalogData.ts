// Comprehensive Equipment Catalog Database (>100 Standard Components)

export interface CatalogPvModule {
  id: string;
  manufacturer: string;
  modelName: string;
  cellType: 'N-Type TOPCon' | 'P-Type PERC' | 'HJT Bifacial' | 'Polycrystalline';
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
}

export interface CatalogBattery {
  id: string;
  manufacturer: string;
  modelName: string;
  chemistry: 'LiFePO4' | 'Gel Deep Cycle' | 'AGM VRLA' | 'Ternary NCM';
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
  // Jinko Solar
  { id: 'mod-jinko-575', manufacturer: 'Jinko Solar', modelName: 'Tiger Neo 72HL4-BDV 575W', cellType: 'N-Type TOPCon', pmpWatts: 575, vocVolts: 51.02, vmpVolts: 42.48, iscAmps: 14.31, impAmps: 13.54, efficiencyPct: 22.26, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.29, lengthMm: 2278, widthMm: 1134, weightKg: 31.0, warrantyYears: 30 },
  { id: 'mod-jinko-580', manufacturer: 'Jinko Solar', modelName: 'Tiger Neo 72HL4-(V) 580W', cellType: 'N-Type TOPCon', pmpWatts: 580, vocVolts: 51.20, vmpVolts: 42.65, iscAmps: 14.37, impAmps: 13.60, efficiencyPct: 22.45, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.29, lengthMm: 2278, widthMm: 1134, weightKg: 28.0, warrantyYears: 25 },
  { id: 'mod-jinko-440', manufacturer: 'Jinko Solar', modelName: 'Tiger Neo 54HL4R-B 440W All-Black', cellType: 'N-Type TOPCon', pmpWatts: 440, vocVolts: 39.38, vmpVolts: 32.81, iscAmps: 13.86, impAmps: 13.41, efficiencyPct: 22.02, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.29, lengthMm: 1762, widthMm: 1134, weightKg: 21.0, warrantyYears: 25 },
  { id: 'mod-jinko-620', manufacturer: 'Jinko Solar', modelName: 'Tiger Neo 78HL4-BDV 620W Utility', cellType: 'N-Type TOPCon', pmpWatts: 620, vocVolts: 55.48, vmpVolts: 46.20, iscAmps: 14.18, impAmps: 13.42, efficiencyPct: 22.18, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.29, lengthMm: 2465, widthMm: 1134, weightKg: 34.0, warrantyYears: 30 },

  // LONGi Solar
  { id: 'mod-longi-580', manufacturer: 'LONGi Solar', modelName: 'Hi-MO 6 Explorer LR5-72HTH 580W', cellType: 'N-Type TOPCon', pmpWatts: 580, vocVolts: 51.55, vmpVolts: 43.15, iscAmps: 14.28, impAmps: 13.44, efficiencyPct: 22.50, tempCoeffVocPct: -0.26, tempCoeffPmpPct: -0.30, lengthMm: 2278, widthMm: 1134, weightKg: 27.5, warrantyYears: 25 },
  { id: 'mod-longi-550', manufacturer: 'LONGi Solar', modelName: 'Hi-MO 5 LR5-72HPH 550W', cellType: 'P-Type PERC', pmpWatts: 550, vocVolts: 49.80, vmpVolts: 41.95, iscAmps: 13.98, impAmps: 13.12, efficiencyPct: 21.30, tempCoeffVocPct: -0.28, tempCoeffPmpPct: -0.34, lengthMm: 2256, widthMm: 1133, weightKg: 27.2, warrantyYears: 25 },
  { id: 'mod-longi-600', manufacturer: 'LONGi Solar', modelName: 'Hi-MO 7 LR7-72HGD 600W Bifacial', cellType: 'N-Type TOPCon', pmpWatts: 600, vocVolts: 52.30, vmpVolts: 43.80, iscAmps: 14.62, impAmps: 13.70, efficiencyPct: 22.80, tempCoeffVocPct: -0.24, tempCoeffPmpPct: -0.28, lengthMm: 2382, widthMm: 1134, weightKg: 33.5, warrantyYears: 30 },

  // Trina Solar
  { id: 'mod-trina-595', manufacturer: 'Trina Solar', modelName: 'Vertex N NEG19RC.20 595W', cellType: 'N-Type TOPCon', pmpWatts: 595, vocVolts: 47.90, vmpVolts: 39.80, iscAmps: 15.86, impAmps: 14.95, efficiencyPct: 22.00, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.30, lengthMm: 2384, widthMm: 1134, weightKg: 33.7, warrantyYears: 30 },
  { id: 'mod-trina-670', manufacturer: 'Trina Solar', modelName: 'Vertex TSM-DEG21C.20 670W', cellType: 'P-Type PERC', pmpWatts: 670, vocVolts: 45.70, vmpVolts: 37.90, iscAmps: 18.62, impAmps: 17.68, efficiencyPct: 21.60, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.34, lengthMm: 2384, widthMm: 1303, weightKg: 38.3, warrantyYears: 25 },
  { id: 'mod-trina-435', manufacturer: 'Trina Solar', modelName: 'Vertex S+ TSM-NEG9R.28 435W', cellType: 'N-Type TOPCon', pmpWatts: 435, vocVolts: 51.80, vmpVolts: 43.60, iscAmps: 10.64, impAmps: 9.99, efficiencyPct: 21.80, tempCoeffVocPct: -0.24, tempCoeffPmpPct: -0.30, lengthMm: 1762, widthMm: 1134, weightKg: 21.0, warrantyYears: 25 },

  // Canadian Solar
  { id: 'mod-canadian-660', manufacturer: 'Canadian Solar', modelName: 'BiHiKu7 CS7N-660MB-AG 660W', cellType: 'P-Type PERC', pmpWatts: 660, vocVolts: 45.40, vmpVolts: 38.10, iscAmps: 18.55, impAmps: 17.33, efficiencyPct: 21.20, tempCoeffVocPct: -0.26, tempCoeffPmpPct: -0.34, lengthMm: 2384, widthMm: 1303, weightKg: 38.0, warrantyYears: 30 },
  { id: 'mod-canadian-570', manufacturer: 'Canadian Solar', modelName: 'TOPHiKu6 CS6W-570T 570W', cellType: 'N-Type TOPCon', pmpWatts: 570, vocVolts: 50.80, vmpVolts: 42.60, iscAmps: 14.28, impAmps: 13.39, efficiencyPct: 22.10, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.29, lengthMm: 2278, widthMm: 1134, weightKg: 27.6, warrantyYears: 25 },

  // JA Solar
  { id: 'mod-ja-550', manufacturer: 'JA Solar', modelName: 'DeepBlue 3.0 JAM72S30 550W', cellType: 'P-Type PERC', pmpWatts: 550, vocVolts: 49.90, vmpVolts: 41.96, iscAmps: 14.00, impAmps: 13.11, efficiencyPct: 21.30, tempCoeffVocPct: -0.27, tempCoeffPmpPct: -0.35, lengthMm: 2279, widthMm: 1134, weightKg: 28.6, warrantyYears: 25 },
  { id: 'mod-ja-580', manufacturer: 'JA Solar', modelName: 'DeepBlue 4.0 Pro JAM72D40 580W', cellType: 'N-Type TOPCon', pmpWatts: 580, vocVolts: 51.48, vmpVolts: 43.10, iscAmps: 14.32, impAmps: 13.46, efficiencyPct: 22.50, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.30, lengthMm: 2278, widthMm: 1134, weightKg: 31.8, warrantyYears: 30 },

  // Iranian Assemblers / Domestic Brand Market
  { id: 'mod-iran-saba-550', manufacturer: 'صبا سولار (Saba Solar)', modelName: 'SBS-M144-550 Mono Half-Cut', cellType: 'P-Type PERC', pmpWatts: 550, vocVolts: 49.70, vmpVolts: 41.80, iscAmps: 13.92, impAmps: 13.16, efficiencyPct: 21.20, tempCoeffVocPct: -0.28, tempCoeffPmpPct: -0.35, lengthMm: 2279, widthMm: 1134, weightKg: 28.5, warrantyYears: 12 },
  { id: 'mod-iran-pakman-575', manufacturer: 'پاکمن انرژی (Pakman Energy)', modelName: 'PKM-TOP-575W N-Type Bifacial', cellType: 'N-Type TOPCon', pmpWatts: 575, vocVolts: 50.95, vmpVolts: 42.40, iscAmps: 14.28, impAmps: 13.56, efficiencyPct: 22.20, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.29, lengthMm: 2278, widthMm: 1134, weightKg: 30.5, warrantyYears: 20 },
];

export const CATALOG_INVERTERS: CatalogInverter[] = [
  // Deye
  { id: 'inv-deye-5k', manufacturer: 'Deye', modelName: 'SUN-5K-SG03LP1-EU', type: 'hybrid_offgrid', pnomKw: 5.0, maxPvInputKw: 6.5, vdcMaxVolts: 500, vmpptMinVolts: 125, vmpptMaxVolts: 425, mpptCount: 2, batteryVoltageVdc: 48, isThreePhase: false, parallelCapable: true, maxParallelUnits: 16, efficiencyMaxPct: 97.6, weightKg: 20.5 },
  { id: 'inv-deye-8k', manufacturer: 'Deye', modelName: 'SUN-8K-SG01LP1-EU', type: 'hybrid_offgrid', pnomKw: 8.0, maxPvInputKw: 10.4, vdcMaxVolts: 500, vmpptMinVolts: 125, vmpptMaxVolts: 425, mpptCount: 2, batteryVoltageVdc: 48, isThreePhase: false, parallelCapable: true, maxParallelUnits: 16, efficiencyMaxPct: 97.6, weightKg: 32.0 },
  { id: 'inv-deye-12k-3p', manufacturer: 'Deye', modelName: 'SUN-12K-SG04LP3-EU (3-Phase)', type: 'hybrid_offgrid', pnomKw: 12.0, maxPvInputKw: 15.6, vdcMaxVolts: 800, vmpptMinVolts: 200, vmpptMaxVolts: 650, mpptCount: 2, batteryVoltageVdc: 48, isThreePhase: true, parallelCapable: true, maxParallelUnits: 10, efficiencyMaxPct: 97.5, weightKg: 33.6 },
  { id: 'inv-deye-20k-3p', manufacturer: 'Deye', modelName: 'SUN-20K-SG01HP3-EU (High Voltage)', type: 'hybrid_offgrid', pnomKw: 20.0, maxPvInputKw: 26.0, vdcMaxVolts: 1000, vmpptMinVolts: 150, vmpptMaxVolts: 850, mpptCount: 2, batteryVoltageVdc: 400, isThreePhase: true, parallelCapable: true, maxParallelUnits: 10, efficiencyMaxPct: 97.6, weightKg: 42.0 },

  // Growatt
  { id: 'inv-growatt-spf5000', manufacturer: 'Growatt', modelName: 'SPF 5000 ES Off-Grid', type: 'hybrid_offgrid', pnomKw: 5.0, maxPvInputKw: 6.0, vdcMaxVolts: 450, vmpptMinVolts: 120, vmpptMaxVolts: 430, mpptCount: 1, batteryVoltageVdc: 48, isThreePhase: false, parallelCapable: true, maxParallelUnits: 6, efficiencyMaxPct: 93.0, weightKg: 12.0 },
  { id: 'inv-growatt-sph6000', manufacturer: 'Growatt', modelName: 'SPH 6000 Single Phase Hybrid', type: 'hybrid_offgrid', pnomKw: 6.0, maxPvInputKw: 9.3, vdcMaxVolts: 550, vmpptMinVolts: 120, vmpptMaxVolts: 500, mpptCount: 2, batteryVoltageVdc: 48, isThreePhase: false, parallelCapable: true, maxParallelUnits: 4, efficiencyMaxPct: 97.5, weightKg: 28.0 },
  { id: 'inv-growatt-mid20k', manufacturer: 'Growatt', modelName: 'MID 20KTL3-X Grid-Tie', type: 'grid_tied', pnomKw: 20.0, maxPvInputKw: 30.0, vdcMaxVolts: 1100, vmpptMinVolts: 200, vmpptMaxVolts: 1000, mpptCount: 2, batteryVoltageVdc: 0, isThreePhase: true, parallelCapable: true, maxParallelUnits: 10, efficiencyMaxPct: 98.7, weightKg: 23.0 },

  // Huawei
  { id: 'inv-huawei-10k-m1', manufacturer: 'Huawei', modelName: 'SUN2000-10KTL-M1 High-End', type: 'grid_tied', pnomKw: 10.0, maxPvInputKw: 15.0, vdcMaxVolts: 1100, vmpptMinVolts: 140, vmpptMaxVolts: 980, mpptCount: 2, batteryVoltageVdc: 400, isThreePhase: true, parallelCapable: true, maxParallelUnits: 8, efficiencyMaxPct: 98.6, weightKg: 17.0 },
  { id: 'inv-huawei-30k-m3', manufacturer: 'Huawei', modelName: 'SUN2000-30KTL-M3 Commercial', type: 'grid_tied', pnomKw: 30.0, maxPvInputKw: 45.0, vdcMaxVolts: 1100, vmpptMinVolts: 200, vmpptMaxVolts: 1000, mpptCount: 4, batteryVoltageVdc: 0, isThreePhase: true, parallelCapable: true, maxParallelUnits: 20, efficiencyMaxPct: 98.7, weightKg: 43.0 },

  // Victron Energy
  { id: 'inv-victron-multiplus-3k', manufacturer: 'Victron Energy', modelName: 'MultiPlus-II 48/3000/35-32', type: 'hybrid_offgrid', pnomKw: 2.4, maxPvInputKw: 4.0, vdcMaxVolts: 250, vmpptMinVolts: 60, vmpptMaxVolts: 245, mpptCount: 1, batteryVoltageVdc: 48, isThreePhase: false, parallelCapable: true, maxParallelUnits: 6, efficiencyMaxPct: 95.0, weightKg: 19.0 },
  { id: 'inv-victron-multiplus-5k', manufacturer: 'Victron Energy', modelName: 'MultiPlus-II 48/5000/70-50', type: 'hybrid_offgrid', pnomKw: 4.0, maxPvInputKw: 7.0, vdcMaxVolts: 250, vmpptMinVolts: 60, vmpptMaxVolts: 245, mpptCount: 1, batteryVoltageVdc: 48, isThreePhase: false, parallelCapable: true, maxParallelUnits: 6, efficiencyMaxPct: 96.0, weightKg: 30.0 },

  // SMA
  { id: 'inv-sma-sunny-tripower-10', manufacturer: 'SMA', modelName: 'Sunny Tripower Smart Energy 10.0', type: 'hybrid_offgrid', pnomKw: 10.0, maxPvInputKw: 15.0, vdcMaxVolts: 1000, vmpptMinVolts: 200, vmpptMaxVolts: 800, mpptCount: 2, batteryVoltageVdc: 400, isThreePhase: true, parallelCapable: true, maxParallelUnits: 5, efficiencyMaxPct: 98.2, weightKg: 30.0 },

  // Sungrow
  { id: 'inv-sungrow-sh10rt', manufacturer: 'Sungrow', modelName: 'SH10RT Hybrid 3-Phase', type: 'hybrid_offgrid', pnomKw: 10.0, maxPvInputKw: 15.0, vdcMaxVolts: 1000, vmpptMinVolts: 200, vmpptMaxVolts: 950, mpptCount: 2, batteryVoltageVdc: 400, isThreePhase: true, parallelCapable: true, maxParallelUnits: 5, efficiencyMaxPct: 98.4, weightKg: 27.0 },

  // Must Solar & Axpert (Affordable Residential)
  { id: 'inv-must-pv18-3k', manufacturer: 'Must Solar', modelName: 'PV18-3024 VHM 3kW', type: 'hybrid_offgrid', pnomKw: 3.0, maxPvInputKw: 4.0, vdcMaxVolts: 145, vmpptMinVolts: 30, vmpptMaxVolts: 130, mpptCount: 1, batteryVoltageVdc: 24, isThreePhase: false, parallelCapable: false, maxParallelUnits: 1, efficiencyMaxPct: 93.0, weightKg: 8.5 },
  { id: 'inv-axpert-vm3-5k', manufacturer: 'Voltronic Axpert', modelName: 'Axpert VM III 5000W 48V', type: 'hybrid_offgrid', pnomKw: 5.0, maxPvInputKw: 5.0, vdcMaxVolts: 500, vmpptMinVolts: 120, vmpptMaxVolts: 450, mpptCount: 1, batteryVoltageVdc: 48, isThreePhase: false, parallelCapable: false, maxParallelUnits: 1, efficiencyMaxPct: 93.0, weightKg: 10.0 },
];

export const CATALOG_BATTERIES: CatalogBattery[] = [
  // Pylontech
  { id: 'bat-pylontech-us5000', manufacturer: 'Pylontech', modelName: 'US5000 4.8kWh LiFePO4 Rack', chemistry: 'LiFePO4', capacityKwh: 4.8, nominalVoltageVolts: 48.0, nominalCapacityAh: 100, recommendedDoDPct: 90, cycleLifeAt80DoD: 6000, maxContinuousDischargeA: 100, weightKg: 39.0, hasIntegratedBms: true },
  { id: 'bat-pylontech-us3000c', manufacturer: 'Pylontech', modelName: 'US3000C 3.55kWh LiFePO4', chemistry: 'LiFePO4', capacityKwh: 3.55, nominalVoltageVolts: 48.0, nominalCapacityAh: 74, recommendedDoDPct: 90, cycleLifeAt80DoD: 6000, maxContinuousDischargeA: 74, weightKg: 32.0, hasIntegratedBms: true },
  { id: 'bat-pylontech-force-h2', manufacturer: 'Pylontech', modelName: 'Force-H2 14.2kWh High-Voltage', chemistry: 'LiFePO4', capacityKwh: 14.2, nominalVoltageVolts: 384.0, nominalCapacityAh: 37, recommendedDoDPct: 90, cycleLifeAt80DoD: 6000, maxContinuousDischargeA: 40, weightKg: 130.0, hasIntegratedBms: true },

  // Deye
  { id: 'bat-deye-se-g5.1', manufacturer: 'Deye', modelName: 'SE-G5.1 Pro 5.12kWh 48V', chemistry: 'LiFePO4', capacityKwh: 5.12, nominalVoltageVolts: 51.2, nominalCapacityAh: 100, recommendedDoDPct: 90, cycleLifeAt80DoD: 6000, maxContinuousDischargeA: 100, weightKg: 44.0, hasIntegratedBms: true },
  { id: 'bat-deye-rw-m6.1', manufacturer: 'Deye', modelName: 'RW-M6.1 Wall-Mounted 6.14kWh', chemistry: 'LiFePO4', capacityKwh: 6.14, nominalVoltageVolts: 51.2, nominalCapacityAh: 120, recommendedDoDPct: 90, cycleLifeAt80DoD: 6000, maxContinuousDischargeA: 100, weightKg: 55.0, hasIntegratedBms: true },

  // BYD
  { id: 'bat-byd-hvs-10.2', manufacturer: 'BYD', modelName: 'Battery-Box Premium HVS 10.2kWh', chemistry: 'LiFePO4', capacityKwh: 10.24, nominalVoltageVolts: 409.6, nominalCapacityAh: 25, recommendedDoDPct: 95, cycleLifeAt80DoD: 6000, maxContinuousDischargeA: 25, weightKg: 167.0, hasIntegratedBms: true },
  { id: 'bat-byd-lvs-8.0', manufacturer: 'BYD', modelName: 'Battery-Box Premium LVS 8.0kWh 48V', chemistry: 'LiFePO4', capacityKwh: 8.0, nominalVoltageVolts: 51.2, nominalCapacityAh: 156, recommendedDoDPct: 90, cycleLifeAt80DoD: 6000, maxContinuousDischargeA: 156, weightKg: 91.0, hasIntegratedBms: true },

  // Saba Battery (صبا باتری - بازار داخلی ایران)
  { id: 'bat-saba-gel-100', manufacturer: 'صبا باتری (Saba Battery)', modelName: 'سولار ژل دیپ سایکل ۱۰۰ آمپر (Gel 12V 100Ah)', chemistry: 'Gel Deep Cycle', capacityKwh: 1.2, nominalVoltageVolts: 12.0, nominalCapacityAh: 100, recommendedDoDPct: 50, cycleLifeAt80DoD: 1000, maxContinuousDischargeA: 25, weightKg: 30.5, hasIntegratedBms: false },
  { id: 'bat-saba-gel-200', manufacturer: 'صبا باتری (Saba Battery)', modelName: 'سولار ژل دیپ سایکل ۲۰۰ آمپر (Gel 12V 200Ah)', chemistry: 'Gel Deep Cycle', capacityKwh: 2.4, nominalVoltageVolts: 12.0, nominalCapacityAh: 200, recommendedDoDPct: 50, cycleLifeAt80DoD: 1000, maxContinuousDischargeA: 50, weightKg: 61.0, hasIntegratedBms: false },
  { id: 'bat-saba-agm-100', manufacturer: 'صبا باتری (Saba Battery)', modelName: 'سیلد لید اسید ۱۰۰ آمپر خورشیدی (AGM 12V 100Ah)', chemistry: 'AGM VRLA', capacityKwh: 1.2, nominalVoltageVolts: 12.0, nominalCapacityAh: 100, recommendedDoDPct: 50, cycleLifeAt80DoD: 700, maxContinuousDischargeA: 20, weightKg: 28.0, hasIntegratedBms: false },

  // CGB & Ritar (Imported Gel in Iran)
  { id: 'bat-cgb-gel-100', manufacturer: 'CGB', modelName: 'CGB Deep Cycle Gel 12V 100Ah', chemistry: 'Gel Deep Cycle', capacityKwh: 1.2, nominalVoltageVolts: 12.0, nominalCapacityAh: 100, recommendedDoDPct: 50, cycleLifeAt80DoD: 1200, maxContinuousDischargeA: 30, weightKg: 31.0, hasIntegratedBms: false },
  { id: 'bat-ritar-gel-200', manufacturer: 'Ritar', modelName: 'DG Series Deep Cycle Gel 12V 200Ah', chemistry: 'Gel Deep Cycle', capacityKwh: 2.4, nominalVoltageVolts: 12.0, nominalCapacityAh: 200, recommendedDoDPct: 50, cycleLifeAt80DoD: 1100, maxContinuousDischargeA: 50, weightKg: 60.5, hasIntegratedBms: false },

  // Huawei LUNA
  { id: 'bat-huawei-luna-10', manufacturer: 'Huawei', modelName: 'LUNA2000-10-S0 Smart String BESS', chemistry: 'LiFePO4', capacityKwh: 10.0, nominalVoltageVolts: 360.0, nominalCapacityAh: 28, recommendedDoDPct: 95, cycleLifeAt80DoD: 6000, maxContinuousDischargeA: 30, weightKg: 113.8, hasIntegratedBms: true },
];
