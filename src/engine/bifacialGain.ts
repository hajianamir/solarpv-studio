// Bifacial Rear Irradiance Gain Engine
//
// Dual-Mode Architecture:
// 1. 'screening_proxy': First-order empirical screening proxy (bf * gcr * albedo * 0.45, clamped [0, 0.15]),
//    intended for rapid preliminary techno-economic appraisal of Iranian C&I and utility PV plants.
// 2. 'view_factor_2d': Rigorous 2.5D view-factor model (Marion 2017 / Hottel crossed-strings formulation,
//    clamped [0, 0.25]), integrating chord slices, ground exitance shade profiles, and torque tube blockage.

import { calculateBifacialViewFactor } from './bifacial/bifacial2dViewFactor';

export interface BifacialGainInput {
  isBifacial?: boolean;
  bifacialityFactor: number;
  groundCoverRatio: number;
  albedo: number;

  modelMode?: 'screening_proxy' | 'view_factor_2d';
  tiltDeg?: number;
  azimuthDeg?: number;
  collectorWidthM?: number;
  groundClearanceM?: number;
  rowLengthM?: number;
  sliceCount?: number;
  ghiWm2?: number;
  dniWm2?: number;
  dhiWm2?: number;
  frontPoaWm2?: number;
  solarZenithDeg?: number;
  solarAzimuthDeg?: number;
}

export interface BifacialGainDiagnostics {
  gainFraction: number;
  gainPct: number;
  unclampedGainPct: number;
  isClampedAt15Pct: boolean;
  clampedExcessPct: number;
  modelUsed: 'screening_proxy' | 'view_factor_2d';
}

/**
 * Calculates rear irradiance gain fraction.
 * Defaults to first-order screening proxy (bf * gcr * albedo * 0.45, clamped to [0, 0.15])
 * or 2.5D view-factor model (clamped to [0, 0.25]) when modelMode === 'view_factor_2d'.
 */
export function rearGainFraction(input: BifacialGainInput): number {
  if (input.isBifacial === false) return 0.0;
  const bf = Math.max(0, input.bifacialityFactor ?? 0);
  if (bf <= 0) return 0.0;

  if (input.modelMode === 'view_factor_2d') {
    const gcr = Math.max(0.01, input.groundCoverRatio ?? 0.38);
    const collectorWidthM = input.collectorWidthM ?? 2.278;
    const pitchM = collectorWidthM / gcr;
    const albedo = Math.max(0, input.albedo ?? 0.22);

    const sim = calculateBifacialViewFactor(
      {
        tiltDeg: input.tiltDeg ?? 31,
        azimuthDeg: input.azimuthDeg ?? 180,
        pitchM,
        collectorWidthM,
        groundClearanceM: input.groundClearanceM ?? 1.2,
        rowLengthM: input.rowLengthM ?? 50,
        albedo,
        bifacialityFactor: bf,
        sliceCount: input.sliceCount ?? 10,
      },
      {
        ghiWm2: input.ghiWm2 ?? 800,
        dniWm2: input.dniWm2 ?? 700,
        dhiWm2: input.dhiWm2 ?? 150,
        frontPoaWm2: input.frontPoaWm2 ?? 850,
        solarZenithDeg: input.solarZenithDeg ?? 35,
        solarAzimuthDeg: input.solarAzimuthDeg ?? 180,
      }
    );
    const gainPct = Math.min(25.0, Math.max(0.0, sim.bifacialGainPercent));
    return gainPct / 100.0;
  }

  // Default 'screening_proxy'
  const gcr = Math.max(0, input.groundCoverRatio ?? 0.38);
  const albedo = Math.max(0, input.albedo ?? 0.22);

  const raw = bf * gcr * albedo * 0.45;
  return Math.min(0.15, Math.max(0.0, raw));
}

/**
 * Calculates rear irradiance gain percentage.
 * Returns gain in range [0, 15.0] for screening proxy or [0, 25.0] for view factor 2D.
 */
export function rearGainPercent(input: BifacialGainInput): number {
  if (input.isBifacial === false) return 0.0;
  const bf = Math.max(0, input.bifacialityFactor ?? 0);
  if (bf <= 0) return 0.0;

  if (input.modelMode === 'view_factor_2d') {
    const frac = rearGainFraction(input);
    return Number((frac * 100.0).toFixed(2));
  }

  return Number((rearGainFraction(input) * 100.0).toFixed(2));
}

/**
 * Evaluates bifacial rear gain with detailed saturation and diagnostic flags.
 */
export function evaluateBifacialGainWithDiagnostics(input: BifacialGainInput): BifacialGainDiagnostics {
  const modelUsed: 'screening_proxy' | 'view_factor_2d' = input.modelMode ?? 'screening_proxy';

  if (input.isBifacial === false) {
    return {
      gainFraction: 0.0,
      gainPct: 0.0,
      unclampedGainPct: 0.0,
      isClampedAt15Pct: false,
      clampedExcessPct: 0.0,
      modelUsed,
    };
  }

  const bf = Math.max(0, input.bifacialityFactor ?? 0);
  if (bf <= 0) {
    return {
      gainFraction: 0.0,
      gainPct: 0.0,
      unclampedGainPct: 0.0,
      isClampedAt15Pct: false,
      clampedExcessPct: 0.0,
      modelUsed,
    };
  }

  if (modelUsed === 'view_factor_2d') {
    const gcr = Math.max(0.01, input.groundCoverRatio ?? 0.38);
    const collectorWidthM = input.collectorWidthM ?? 2.278;
    const pitchM = collectorWidthM / gcr;
    const albedo = Math.max(0, input.albedo ?? 0.22);

    const sim = calculateBifacialViewFactor(
      {
        tiltDeg: input.tiltDeg ?? 31,
        azimuthDeg: input.azimuthDeg ?? 180,
        pitchM,
        collectorWidthM,
        groundClearanceM: input.groundClearanceM ?? 1.2,
        rowLengthM: input.rowLengthM ?? 50,
        albedo,
        bifacialityFactor: bf,
        sliceCount: input.sliceCount ?? 10,
      },
      {
        ghiWm2: input.ghiWm2 ?? 800,
        dniWm2: input.dniWm2 ?? 700,
        dhiWm2: input.dhiWm2 ?? 150,
        frontPoaWm2: input.frontPoaWm2 ?? 850,
        solarZenithDeg: input.solarZenithDeg ?? 35,
        solarAzimuthDeg: input.solarAzimuthDeg ?? 180,
      }
    );
    const unclampedGainPct = Number(sim.bifacialGainPercent.toFixed(4));
    const gainPct = Number(Math.min(25.0, Math.max(0.0, unclampedGainPct)).toFixed(2));
    const gainFraction = Number((gainPct / 100.0).toFixed(4));
    return {
      gainFraction,
      gainPct,
      unclampedGainPct,
      isClampedAt15Pct: false,
      clampedExcessPct: 0.0,
      modelUsed: 'view_factor_2d',
    };
  }

  // screening_proxy
  const gcr = Math.max(0, input.groundCoverRatio ?? 0.38);
  const albedo = Math.max(0, input.albedo ?? 0.22);
  const unclampedGainPct = Number((bf * gcr * albedo * 0.45 * 100.0).toFixed(4));
  const isClampedAt15Pct = unclampedGainPct > 15.0;
  const clampedExcessPct = isClampedAt15Pct
    ? Number((unclampedGainPct - 15.0).toFixed(4))
    : 0.0;
  const gainPct = Number(Math.min(15.0, Math.max(0.0, unclampedGainPct)).toFixed(2));
  const gainFraction = Number((gainPct / 100.0).toFixed(4));

  return {
    gainFraction,
    gainPct,
    unclampedGainPct,
    isClampedAt15Pct,
    clampedExcessPct,
    modelUsed: 'screening_proxy',
  };
}

/**
 * Direct alias for rearGainFraction for screening appraisal.
 */
export const computeBifacialRearGain = rearGainFraction;
