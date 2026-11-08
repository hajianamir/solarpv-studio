/**
 * Engine-side per-run equipment shapes.
 *
 * Moved here from `src/engine/solarPvEngine.ts` so that `catalogAdapters.ts`
 * can import them as a leaf module without creating a circular dependency
 * (solarPvEngine re-exports them for backward compatibility).
 *
 * This file MUST have ZERO imports (leaf module).
 */

export interface PvModule {
  id: string;
  manufacturer: string;
  modelName: string;
  pmpWatts: number;
  vmpVolts: number;
  impAmps: number;
  vocVolts: number;
  iscAmps: number;
  betaVocPerC: number;
  noctC?: number;
  tempCoeffPmpPct?: number;
}

export interface Inverter {
  id: string;
  manufacturer: string;
  modelName: string;
  pnomAcKw: number;
  vdcMaxVolts: number;
  vmpptMinVolts: number;
  vmpptMaxVolts: number;
}

export interface Battery {
  id: string;
  manufacturer: string;
  modelName: string;
  capacityKwh: number;
  nominalVoltageVolts: number;
  depthOfDischargeMax: number;
}
