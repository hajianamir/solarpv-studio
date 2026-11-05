import { computeWaterfallLosses } from './waterfallLossEngine';
import { type TrackerConfig } from './tracker/backtrackingEngine';
import { type InstallationEnvironment } from './types/climateTypes';

/**
 * Named, typed, self-documenting input interface for the 16-stage PV loss waterfall.
 * Eliminates positional argument misalignment bugs across all call sites.
 */
export interface WaterfallArgsInput {
  /** Nameplate DC array peak capacity in kWp */
  installedCapacityKwp?: number;
  /** Alias for installedCapacityKwp */
  dcCapacityKw?: number;

  /** Annual average Peak Sun Hours (PSH / kWh/m²/day) */
  peakSunHours: number;

  /** Maximum design ambient air temperature in °C */
  ambientTempMaxC?: number;
  /** Alias for ambientTempMaxC */
  ambientTempC?: number;

  /** Environmental dust & soiling loss percentage (default 4.5%) */
  soilingLossPct?: number;

  /** DC/AC inverter loading ratio (ILR / overpaneling factor, default 1.25) */
  dcAcRatio?: number;

  /** Whether single-axis tracking physics is active (default false or derived from trackerConfig) */
  hasTracker?: boolean;
  /** Alias for hasTracker */
  isSingleAxisTracker?: boolean;

  /** Marion snow coverage & shedding loss percentage (default 0.0%) */
  snowLossPct?: number;

  /** Martin & Ruiz incidence angle modifier Fresnel reflection loss (default -2.2%) */
  iamLossPct?: number;

  /** Nominal Module Operating Cell Temperature in °C (default 45.0°C) */
  noctC?: number;
  /** Alias for noctC */
  moduleNoctC?: number;

  /** Maximum power temperature coefficient in %/°C (default -0.30%/°C) */
  tempCoeffPmpPct?: number;

  /** Slope-aware single-axis tracker configuration object (optional) */
  trackerConfig?: TrackerConfig | null;

  /** Mounting installation environment (ground_mount, roof_flush, etc.) */
  installationEnv?: InstallationEnvironment;
  /** Alias for installationEnv */
  installationEnvironment?: InstallationEnvironment;

  /** Array fixed tilt angle in degrees (optional) */
  fixedTiltDeg?: number;
  /** Alias for fixedTiltDeg */
  tiltDeg?: number;

  /** Geographical latitude in degrees (optional) */
  latitudeDeg?: number;

  /** 3D near-shading geometric deficit percentage override (optional, e.g. 5.98) */
  shadingLossOverridePct?: number;
  /** Alias for shadingLossOverridePct */
  shadingLoss3dPct?: number;
  /** Alias for near-shading */
  nearShadingLossPct?: number;

  /** First-order bifacial rear irradiance gain percentage (optional, e.g. 3.01%) */
  bifacialGainPct?: number;
}

/**
 * Total parameter arity of computeWaterfallLosses.
 * Must strictly track the engine signature (16 positional parameters).
 *
 * NOTE ON FUNCTION ARITY IN JAVASCRIPT:
 * Function.prototype.length counts parameters up to the first parameter with a default value.
 * In computeWaterfallLosses, soilingLossPct=4.5 is at index 3, so computeWaterfallLosses.length === 3.
 * WATERFALL_ARG_COUNT asserts the full tuple length as typed by
 * Parameters<typeof computeWaterfallLosses>['length'].
 */
export const WATERFALL_ARG_COUNT: number = 16;

/**
 * Pure builder function mapping named WaterfallArgsInput to the strict 16-parameter
 * positional tuple required by computeWaterfallLosses.
 *
 * Parameter positions:
 *  0: installedCapacityKwp
 *  1: peakSunHours
 *  2: ambientTempMaxC
 *  3: soilingLossPct (default 4.5)
 *  4: dcAcRatio (default 1.25)
 *  5: hasTracker (Boolean(trackerConfig) unless explicitly provided)
 *  6: snowLossPct (default 0.0)
 *  7: iamLossPct (default -2.2)
 *  8: noctC (default 45.0)
 *  9: tempCoeffPmpPct (default -0.30)
 * 10: trackerConfig
 * 11: installationEnv
 * 12: fixedTiltDeg
 * 13: latitudeDeg
 * 14: shadingLossOverridePct
 * 15: bifacialGainPct (appended 16th slot)
 */
export function buildWaterfallArgs(i: WaterfallArgsInput): Parameters<typeof computeWaterfallLosses> {
  const capKwp = (i.installedCapacityKwp ?? i.dcCapacityKw) ?? 1000;
  const psh = i.peakSunHours;
  const tempMax = (i.ambientTempMaxC ?? i.ambientTempC) ?? 35.0;
  const soiling = i.soilingLossPct ?? 4.5;
  const dcAc = i.dcAcRatio ?? 1.25;
  const hasTracker =
    i.hasTracker !== undefined
      ? Boolean(i.hasTracker)
      : i.isSingleAxisTracker !== undefined
      ? Boolean(i.isSingleAxisTracker)
      : Boolean(i.trackerConfig);
  const snow = i.snowLossPct ?? 0.0;
  const iam = i.iamLossPct ?? -2.2;
  const noct = (i.noctC ?? i.moduleNoctC) ?? 45.0;
  const tempCoeff = i.tempCoeffPmpPct ?? -0.30;
  const trackerCfg = i.trackerConfig ?? undefined;
  const env = (i.installationEnv ?? i.installationEnvironment) ?? undefined;
  const tilt = (i.fixedTiltDeg ?? i.tiltDeg) ?? undefined;
  const lat = i.latitudeDeg ?? undefined;
  const shadingOverride = i.shadingLossOverridePct ?? i.shadingLoss3dPct;
  const bifacialGain = i.bifacialGainPct !== undefined ? i.bifacialGainPct : undefined;

  const args: Parameters<typeof computeWaterfallLosses> = [
    capKwp,
    psh,
    tempMax,
    soiling,
    dcAc,
    hasTracker,
    snow,
    iam,
    noct,
    tempCoeff,
    trackerCfg,
    env,
    tilt,
    lat,
    shadingOverride,
    bifacialGain,
  ];

  return args;
}
