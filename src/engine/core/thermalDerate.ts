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
  mode?: ThermalEvaluationMode; // backward compatibility
  evaluationMode?: ThermalEvaluationMode; // standard per contract
}

export interface ThermalDerateResult {
  cellTempHotC: number;
  cellTempAnnualMeanC?: number;
  annualMeanDeratePct?: number;
  derateFraction: number;      // 0.0 to 1.0
  deratePct: number;           // 0 to 100
  mountingDeltaTC: number;     // 0°C ground, +14°C shed roof, +6.5°C flat concrete
  source: 'NOCT_IEC_61215';
  evaluationMode: ThermalEvaluationMode;
  effectiveAmbientTempC: number;
}

export function calculateThermalDerate(input: ThermalDerateInput): ThermalDerateResult {
  const evalMode: ThermalEvaluationMode = input.evaluationMode ?? input.mode ?? 'hot_design';
  const G = input.irradianceWm2 ?? 1000;
  const env = input.installationEnvironment || 'ground_mount';

  // Mounting thermal offset Delta-T (Faiman / King / IEC 61853):
  // Ground Mount = 0°C (free rear convection)
  // Industrial Shed = +14°C (trapped air layer under sheet roof)
  // Rooftop Flat Concrete = +6.5°C (re-radiation from concrete slab)
  const mountingDeltaTC = env === 'industrial_shed' ? 14.0 : env === 'rooftop_flat_concrete' ? 6.5 : 0.0;
  const noct = typeof input.module?.noctC === 'number' && Number.isFinite(input.module.noctC) ? input.module.noctC : 45.0;

  // Crucial safety guarantee: cellTempHotC is ALWAYS computed at ambientTempMaxC
  // to ensure string voltage safety (Vmp_min_hot per IEC 62548) is never compromised.
  const cellTempHotC = input.ambientTempMaxC + mountingDeltaTC + (noct - 20) * (G / 800);
  const deltaTHot = Math.max(0, cellTempHotC - 25);
  const hotDesignDeratePct = Math.abs(input.module.tempCoeffPmpPct) * deltaTHot;

  let cellTempAnnualMeanC: number | undefined;
  let annualMeanDeratePct: number | undefined;

  if (typeof input.ambientTempMeanC === 'number' && Number.isFinite(input.ambientTempMeanC)) {
    cellTempAnnualMeanC = input.ambientTempMeanC + mountingDeltaTC + (noct - 20) * (G / 800);
    const deltaTAnnual = Math.max(0, cellTempAnnualMeanC - 25);
    annualMeanDeratePct = Math.abs(input.module.tempCoeffPmpPct) * deltaTAnnual;
  }

  const isAnnualEnergy = evalMode === 'annual_energy' && annualMeanDeratePct !== undefined;
  const deratePct = isAnnualEnergy ? annualMeanDeratePct! : hotDesignDeratePct;
  const effectiveAmbientTempC = isAnnualEnergy ? input.ambientTempMeanC! : input.ambientTempMaxC;

  return {
    cellTempHotC,
    cellTempAnnualMeanC,
    annualMeanDeratePct,
    deratePct,
    derateFraction: deratePct / 100,
    mountingDeltaTC,
    source: 'NOCT_IEC_61215',
    evaluationMode: evalMode,
    effectiveAmbientTempC,
  };
}

/**
 * Explicit helper to compute and compare hot-design derate vs annual-mean derate.
 */
export function calculateAnnualThermalDerate(input: {
  module: { noctC?: number; tempCoeffPmpPct: number };
  ambientTempMeanC: number;
  ambientTempMaxC: number;
  irradianceWm2?: number;
  installationEnvironment?: InstallationEnvironment;
}): {
  hotDesignDeratePct: number;
  annualMeanDeratePct: number;
  cellTempHotC: number;
  cellTempAnnualMeanC: number;
  thermalOverestimationPts: number;
} {
  const hotRes = calculateThermalDerate({
    module: input.module,
    ambientTempMaxC: input.ambientTempMaxC,
    irradianceWm2: input.irradianceWm2,
    installationEnvironment: input.installationEnvironment,
    evaluationMode: 'hot_design',
  });

  const annualRes = calculateThermalDerate({
    module: input.module,
    ambientTempMaxC: input.ambientTempMaxC,
    ambientTempMeanC: input.ambientTempMeanC,
    irradianceWm2: input.irradianceWm2,
    installationEnvironment: input.installationEnvironment,
    evaluationMode: 'annual_energy',
  });

  const hotDesignDeratePct = Number(hotRes.deratePct.toFixed(4));
  const annualMeanDeratePct = Number((annualRes.annualMeanDeratePct ?? annualRes.deratePct).toFixed(4));
  const thermalOverestimationPts = Number((hotDesignDeratePct - annualMeanDeratePct).toFixed(4));

  return {
    hotDesignDeratePct,
    annualMeanDeratePct,
    cellTempHotC: hotRes.cellTempHotC,
    cellTempAnnualMeanC: annualRes.cellTempAnnualMeanC ?? annualRes.cellTempHotC,
    thermalOverestimationPts,
  };
}
