// Single source of truth for PV thermal derating (PR-2a-7-P0).
// NOCT-based cell temperature model per IEC 61215 / IEC 62548.
// ALL consumers (App display, pvEngineAdvanced, waterfallLossEngine) MUST
// call calculateThermalDerate() so every tab shows the same number.

export interface ThermalDerateInput {
  module: { noctC: number; tempCoeffPmpPct: number };
  ambientTempMaxC: number;
  irradianceWm2?: number; // default 1000
}

export interface ThermalDerateResult {
  cellTempHotC: number;
  derateFraction: number;      // 0.0 to 1.0
  deratePct: number;           // 0 to 100
  source: 'NOCT_IEC_61215';
}

export function calculateThermalDerate(input: ThermalDerateInput): ThermalDerateResult {
  const G = input.irradianceWm2 ?? 1000;
  const cellTempHotC = input.ambientTempMaxC + (input.module.noctC - 20) * (G / 800);
  const deltaT = Math.max(0, cellTempHotC - 25);
  const deratePct = Math.abs(input.module.tempCoeffPmpPct) * deltaT;
  return {
    cellTempHotC,
    deratePct,
    derateFraction: deratePct / 100,
    source: 'NOCT_IEC_61215',
  };
}
