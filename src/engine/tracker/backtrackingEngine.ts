// Single-Axis Tracker with Slope-Aware Backtracking — PR-2a-7
// Faithful TypeScript port of pvlib 0.16.1:
//   - pvlib.tracking.singleaxis (Marion & Dobos, NREL/TP-6A20-58891, Eq. 14-16)
//   - pvlib.shading.projected_solar_zenith_angle (Anderson & Mikofski, NREL/TP-5K00-76626, Eq. 4-5)
//   - pvlib.tracking.calc_surface_orientation / _unit_normal (R = Rz(-az) Rx(-tilt) Ry(theta))
//   - pvlib.irradiance.get_total_irradiance with model='isotropic'
// Pure functions: no I/O, no Date(), no randomness. Float64 throughout.
// Angles are radians internally; degrees only at the API boundary.

export interface TrackerConfig {
  /** GCR = module width / row pitch. Typical 0.30-0.45 for 1P trackers. Must be in (0, 1). */
  gcr: number;
  /** East-west ground slope in degrees (0 = flat). Range [-90, 90]. */
  axisTiltDeg: number;
  /** Maximum mechanical rotation from horizontal (degrees). Typical 45-60. */
  maxRotationDeg: number;
  /** Whether backtracking is enabled. If false, true tracking (row shading possible). */
  enableBacktracking: boolean;
  /** Ground albedo for ground-reflected POA. */
  albedo?: number;
  /** Site latitude (used only for internal default sun path). */
  latitudeDeg?: number;
}

export interface TrackerState {
  /** Rotation angle from horizontal, degrees. pvlib sign convention (axis_azimuth=0). */
  rotationDeg: number;
  /** True tracking angle before backtracking, degrees. */
  trueTrackingDeg: number;
  /** Row-to-row shading fraction (0-1). 0 when backtracking corrects the angle. */
  shadingFraction: number;
  /** POA irradiance on module plane (W/m²). 0 at night. */
  poaWm2: number;
  /** Whether sun is above horizon. */
  isDay: boolean;
  /** Surface tilt/azimuth after rotation (degrees). */
  surfaceTiltDeg: number;
  surfaceAzimuthDeg: number;
  /** Angle of incidence (degrees). */
  aoiDeg: number;
}

export interface SunVector {
  zenithRad: number;
  azimuthRad: number;
}

export interface IrradianceWm2 {
  ghi: number;
  dni: number;
  dhi: number;
}

export interface SunPathPoint extends SunVector, IrradianceWm2 {
  hourOfYear: number;
}

export interface TrackerAnnualResult {
  hourlyStates: TrackerState[];
  /** Annual POA energy (kWh/m²). */
  annualPoaKwhPerM2: number;
  /** Annual row-to-row shading loss fraction (0-1). */
  annualShadingLossFraction: number;
  /** Annual transposition gain over fixed-tilt at optimal angle (%). */
  annualTranspositionGainPct: number;
  /** Share of daytime hours where backtracking modified the angle (%). */
  backtrackingActivationPct: number;
  /** Max absolute rotation reached (degrees). */
  maxAbsRotationDeg: number;
}

const DEG = Math.PI / 180.0;
const RAD = 180.0 / Math.PI;

const sind = (d: number) => Math.sin(d * DEG);
const cosd = (d: number) => Math.cos(d * DEG);
const acosd = (x: number) => Math.acos(Math.max(-1, Math.min(1, x))) * RAD;

/** pvlib.shading.projected_solar_zenith_angle, axis_azimuth = 0 (N-S horizontal axis). */
export function projectedSolarZenithDeg(
  zenithDeg: number,
  azimuthDeg: number,
  axisTiltDeg: number,
  axisAzimuthDeg: number = 0
): number {
  const sx = sind(zenithDeg) * sind(azimuthDeg);
  const sy = sind(zenithDeg) * cosd(azimuthDeg);
  const sz = cosd(zenithDeg);
  const sxPrime = sx * cosd(axisAzimuthDeg) - sy * sind(axisAzimuthDeg);
  const szPrime =
    sx * sind(axisAzimuthDeg) * sind(axisTiltDeg) +
    sy * sind(axisTiltDeg) * cosd(axisAzimuthDeg) +
    sz * cosd(axisTiltDeg);
  return Math.atan2(sxPrime, szPrime) * RAD; // Eq. (5)
}

/** pvlib.tracking._unit_normal + calc_surface_orientation. */
export function surfaceOrientation(
  thetaDeg: number,
  axisTiltDeg: number,
  axisAzimuthDeg: number = 0
): { surfaceTiltDeg: number; surfaceAzimuthDeg: number } {
  const surfaceTiltDeg = acosd(cosd(thetaDeg) * cosd(axisTiltDeg)); // Eq. (1)
  const cA = cosd(-axisAzimuthDeg), sA = sind(-axisAzimuthDeg);
  const cT = cosd(-axisTiltDeg), sT = sind(-axisTiltDeg);
  const cTh = cosd(thetaDeg), sTh = sind(thetaDeg);
  const x = sA * sT * cTh + cA * sTh;
  const y = sA * sTh - cA * sT * cTh;
  let surfaceAzimuthDeg = Math.atan2(x, y) * RAD;
  if (surfaceTiltDeg === 0) surfaceAzimuthDeg = axisAzimuthDeg - 90;
  surfaceAzimuthDeg = ((surfaceAzimuthDeg % 360) + 360) % 360;
  return { surfaceTiltDeg, surfaceAzimuthDeg };
}

/** pvlib.irradiance.aoi_projection (radians math on degrees input). */
export function aoiProjection(
  surfaceTiltDeg: number,
  surfaceAzimuthDeg: number,
  zenithDeg: number,
  azimuthDeg: number
): number {
  return (
    cosd(surfaceTiltDeg) * cosd(zenithDeg) +
    sind(surfaceTiltDeg) * sind(zenithDeg) * cosd(azimuthDeg - surfaceAzimuthDeg)
  );
}

function validateConfig(config: TrackerConfig): void {
  if (!(config.gcr > 0 && config.gcr < 1)) {
    throw new Error(`GCR must be in (0, 1), got ${config.gcr}`);
  }
  if (!(config.axisTiltDeg >= -90 && config.axisTiltDeg <= 90)) {
    throw new Error(`axisTiltDeg must be in [-90, 90], got ${config.axisTiltDeg}`);
  }
  if (!(config.maxRotationDeg > 0 && config.maxRotationDeg <= 90)) {
    throw new Error(`maxRotationDeg must be in (0, 90], got ${config.maxRotationDeg}`);
  }
}

/**
 * pvlib.tracking.singleaxis — single timestep. Pure.
 */
export function computeTrackerState(
  sun: SunVector,
  config: TrackerConfig,
  irr?: IrradianceWm2
): TrackerState {
  validateConfig(config);
  const zenithDeg = sun.zenithRad * RAD;
  const azimuthDeg = ((sun.azimuthRad * RAD) % 360 + 360) % 360;

  if (zenithDeg > 90) {
    return {
      rotationDeg: 0, trueTrackingDeg: 0, shadingFraction: 0, poaWm2: 0,
      isDay: false, surfaceTiltDeg: 0, surfaceAzimuthDeg: 0, aoiDeg: 90,
    };
  }

  // True tracking angle (omega_ideal), axis_azimuth = 0
  const omegaIdeal = projectedSolarZenithDeg(zenithDeg, azimuthDeg, config.axisTiltDeg, 0);

  // Backtracking — Marion & Dobos Eq. 14-16 (pvlib 0.16 form)
  let theta = omegaIdeal;
  let backtracked = false;
  if (config.enableBacktracking) {
    const axesDistance = 1 / config.gcr; // cross_axis_tilt = 0
    const temp = Math.abs(axesDistance * cosd(omegaIdeal));
    if (temp < 1) {
      theta = omegaIdeal - Math.sign(omegaIdeal) * acosd(temp);
      backtracked = true;
    }
  }
  // Mechanical clamp
  const maxA = config.maxRotationDeg;
  theta = Math.max(-maxA, Math.min(maxA, theta));

  // Row-to-row shading fraction: eliminated by backtracking; otherwise the
  // geometry term temp >= 1 means rows shade each other.
  const axesDistance = 1 / config.gcr;
  const temp = Math.abs(axesDistance * cosd(omegaIdeal));
  // PR-2a-7-FOLLOWUP (ISSUE-3): a near-flat panel (|omegaIdeal| < 5 deg, e.g.
  // winter-solstice noon at mid latitudes) casts no row-to-row shadow, so the
  // heuristic temp-1 must not be applied there. With backtracking enabled the
  // correction already guarantees shadingFraction = 0 by design.
  const shadingFraction = (() => {
    // With backtracking enabled, row-to-row shading is eliminated by design.
    if (config.enableBacktracking) return 0.0;
    // PR-2a-7-FOLLOWUP (ISSUE-3): a near-flat panel (|omegaIdeal| < 5 deg, e.g.
    // winter-solstice noon at mid latitudes) casts no row-to-row shadow.
    if (Math.abs(omegaIdeal) < 5.0) return 0.0;
    return Math.min(1, Math.max(0, temp - 1));
  })();

  const { surfaceTiltDeg, surfaceAzimuthDeg } = surfaceOrientation(theta, config.axisTiltDeg, 0);
  const proj = aoiProjection(surfaceTiltDeg, surfaceAzimuthDeg, zenithDeg, azimuthDeg);
  const aoiDeg = acosd(proj);

  // POA — pvlib get_total_irradiance, model='isotropic'
  let poaWm2 = 0;
  if (irr) {
    const albedo = config.albedo ?? 0.2;
    const poaDirect = Math.max(irr.dni * proj, 0); // dni * cos(aoi), floored at 0
    const poaSkyDiffuse = irr.dhi * ((1 + cosd(surfaceTiltDeg)) / 2);
    const poaGroundDiffuse = irr.ghi * albedo * ((1 - cosd(surfaceTiltDeg)) / 2);
    poaWm2 = poaDirect + poaSkyDiffuse + poaGroundDiffuse;
  }

  return {
    rotationDeg: theta,
    trueTrackingDeg: omegaIdeal,
    shadingFraction,
    poaWm2,
    isDay: true,
    surfaceTiltDeg,
    surfaceAzimuthDeg,
    aoiDeg,
  };
}

/**
 * Full-year (or representative-day) simulation. Deterministic.
 * fixedTiltDeg/fixedAzimuthDeg define the fixed-tilt baseline for the
 * transposition-gain metric; pass null to skip the gain computation.
 */
export function simulateTrackerAnnual(
  sunPath: SunPathPoint[],
  config: TrackerConfig,
  fixedBaseline?: { fixedTiltDeg: number; fixedAzimuthDeg: number } | null
): TrackerAnnualResult {
  validateConfig(config);
  const states: TrackerState[] = [];
  let poaSumWh = 0;
  let fixedPoaSumWh = 0;
  let shadeSum = 0;
  let dayHours = 0;
  let backtrackHours = 0;
  let maxAbs = 0;

  for (const p of sunPath) {
    const st = computeTrackerState(
      { zenithRad: p.zenithRad, azimuthRad: p.azimuthRad },
      config,
      { ghi: p.ghi, dni: p.dni, dhi: p.dhi }
    );
    states.push(st);
    if (st.isDay) {
      poaSumWh += st.poaWm2; // 1-hour steps → W·h
      shadeSum += st.shadingFraction;
      dayHours++;
      if (Math.abs(st.rotationDeg - st.trueTrackingDeg) > 1e-9) backtrackHours++;
      maxAbs = Math.max(maxAbs, Math.abs(st.rotationDeg));
      if (fixedBaseline) {
        const proj = aoiProjection(fixedBaseline.fixedTiltDeg, fixedBaseline.fixedAzimuthDeg,
          p.zenithRad * RAD, ((p.azimuthRad * RAD) % 360 + 360) % 360);
        const albedo = config.albedo ?? 0.2;
        const direct = Math.max(p.dni * proj, 0);
        const sky = p.dhi * ((1 + cosd(fixedBaseline.fixedTiltDeg)) / 2);
        const ground = p.ghi * albedo * ((1 - cosd(fixedBaseline.fixedTiltDeg)) / 2);
        fixedPoaSumWh += direct + sky + ground;
      }
    }
  }

  const annualPoaKwhPerM2 = poaSumWh / 1000;
  const annualShadingLossFraction = dayHours > 0 ? shadeSum / dayHours : 0;
  const annualTranspositionGainPct =
    fixedBaseline && fixedPoaSumWh > 0
      ? ((poaSumWh - fixedPoaSumWh) / fixedPoaSumWh) * 100
      : 0;

  return {
    hourlyStates: states,
    annualPoaKwhPerM2,
    annualShadingLossFraction,
    annualTranspositionGainPct,
    backtrackingActivationPct: dayHours > 0 ? (backtrackHours / dayHours) * 100 : 0,
    maxAbsRotationDeg: maxAbs,
  };
}
