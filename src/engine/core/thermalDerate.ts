// Single source of truth for PV thermal derating (PR-2a-7-P0 / Phase 3 Unified Annual Yield).
// NOCT-based cell temperature model per IEC 61215 / IEC 62548.
// Enhanced to account for mounting ventilation (ground mount, industrial shed, rooftop)
// and dual-mode separation: hot_design (Vmp_min_hot inverter sizing) vs annual_energy (annual mean derate).
// ALL consumers (App display, pvEngineAdvanced, waterfallLossEngine, annualYieldEngine) MUST
// call calculateThermalDerate() so every tab shows the same number.

import type { InstallationEnvironment } from '../types/climateTypes';

export type ThermalEvaluationMode = 'hot_design' | 'annual_energy';

export interface ThermalDerateInput {
  module: { noctC?: number; tempCoeffPmpPct: number };
  ambientTempMaxC: number;
  ambientTempMeanC?: number;
  irradianceWm2?: number; // default 1000
  installationEnvironment?: InstallationEnvironment;
  mode?: ThermalEvaluationMode; // default 'hot_design'
}

export interface ThermalDerateResult {
  cellTempHotC: number;
  derateFraction: number;      // 0.0 to 1.0
  deratePct: number;           // 0 to 100
  mountingDeltaTC: number;     // 0°C ground, +14°C shed roof, +6.5°C flat concrete
  source: 'NOCT_IEC_61215';
  evaluationMode: ThermalEvaluationMode;
  effectiveAmbientTempC: number;
}

export function calculateThermalDerate(input: ThermalDerateInput): ThermalDerateResult {
  const mode: ThermalEvaluationMode = input.mode ?? 'hot_design';
  const effectiveAmbientTempC =
    mode === 'annual_energy' && typeof input.ambientTempMeanC === 'number' && Number.isFinite(input.ambientTempMeanC)
      ? input.ambientTempMeanC
      : input.ambientTempMaxC;

  const G = input.irradianceWm2 ?? 1000;
  const env = input.installationEnvironment || 'ground_mount';
  // Mounting thermal offset Delta-T (Faiman / King / IEC 61853):
  // Ground Mount = 0°C (free rear convection)
  // Industrial Shed = +14°C (trapped air layer under sheet roof)
  // Rooftop Flat Concrete = +6.5°C (re-radiation from concrete slab)
  const mountingDeltaTC = env === 'industrial_shed' ? 14.0 : env === 'rooftop_flat_concrete' ? 6.5 : 0.0;
  const noct = typeof input.module?.noctC === 'number' && Number.isFinite(input.module.noctC) ? input.module.noctC : 45.0;
  
  const cellTempHotC = effectiveAmbientTempC + mountingDeltaTC + (noct - 20) * (G / 800);
  const deltaT = Math.max(0, cellTempHotC - 25);
  const deratePct = Math.abs(input.module.tempCoeffPmpPct) * deltaT;
  return {
    cellTempHotC,
    deratePct,
    derateFraction: deratePct / 100,
    mountingDeltaTC,
    source: 'NOCT_IEC_61215',
    evaluationMode: mode,
    effectiveAmbientTempC,
  };
}
