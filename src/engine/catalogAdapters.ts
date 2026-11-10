/**
 * Adapters between the equipment catalog (string-keyed, extensive) and the
 * engine-side per-run type shapes (used by InMemorySolarDatabase and
 * performQuickSizing). Ensures a single source of truth for hardware data.
 */

import {
  type CatalogPvModule,
  type CatalogInverter,
  type CatalogBattery,
  CATALOG_MODULES,
  CATALOG_INVERTERS,
  CATALOG_BATTERIES,
} from './equipmentCatalogData';

import type { PvModule, Inverter, Battery } from './types/equipmentTypes';

/** Convert a catalog module to the engine's per-run PvModule shape. */
export function catalogModuleToEngine(m: CatalogPvModule): PvModule {
  return {
    id: m.id,
    manufacturer: m.manufacturer,
    modelName: m.modelName,
    pmpWatts: m.pmpWatts,
    vmpVolts: m.vmpVolts,
    impAmps: m.impAmps,
    vocVolts: m.vocVolts,
    iscAmps: m.iscAmps,
    // Catalog stores tempCoeffVocPct in %/°C (e.g. -0.25).
    // Engine expects betaVocPerC as fraction/°C (e.g. -0.0025).
    betaVocPerC: m.tempCoeffVocPct / 100.0,
    noctC: m.noctC ?? 45.0,
    tempCoeffPmpPct: m.tempCoeffPmpPct,
  };
}

/** Convert a catalog inverter to the engine's per-run Inverter shape. */
export function catalogInverterToEngine(i: CatalogInverter): Inverter {
  return {
    id: i.id,
    manufacturer: i.manufacturer,
    modelName: i.modelName,
    pnomAcKw: i.pnomKw,
    vdcMaxVolts: i.vdcMaxVolts,
    vmpptMinVolts: i.vmpptMinVolts,
    vmpptMaxVolts: i.vmpptMaxVolts,
  };
}

/** Convert a catalog battery to the engine's per-run Battery shape. */
export function catalogBatteryToEngine(b: CatalogBattery): Battery {
  return {
    id: b.id,
    manufacturer: b.manufacturer,
    modelName: b.modelName,
    capacityKwh: b.capacityKwh,
    nominalVoltageVolts: b.nominalVoltageVolts,
    // Catalog stores recommendedDoDPct as 0-100; engine expects 0-1.
    depthOfDischargeMax: b.recommendedDoDPct / 100.0,
  };
}

// Convenience: pre-adapted default lists used by InMemorySolarDatabase.
export const ENGINE_DEFAULT_MODULES: PvModule[] = CATALOG_MODULES.map(catalogModuleToEngine);
export const ENGINE_DEFAULT_INVERTERS: Inverter[] = CATALOG_INVERTERS.map(catalogInverterToEngine);
export const ENGINE_DEFAULT_BATTERIES: Battery[] = CATALOG_BATTERIES.map(catalogBatteryToEngine);
