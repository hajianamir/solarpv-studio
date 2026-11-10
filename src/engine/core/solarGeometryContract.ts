/**
 * SolarPV Studio v3.0 - Unified Solar Geometry, Azimuth & Time Contract
 * Single source of truth for solar azimuth conventions, UTC time normalization,
 * ENU solar directional ray vectors, and hemisphere-aware winter solstice solar altitude.
 *
 * Leaf module in `src/engine/core/`: NO circular dependencies.
 */

export type NorthAzimuthDeg = number & { readonly __brand: unique symbol };
export type SouthAzimuthDeg = number & { readonly __brand: unique symbol };
export type UtcTimestampSeconds = number & { readonly __brand: unique symbol };

export type AzimuthConvention = 'north_clockwise' | 'south_zero';

/**
 * Normalizes an angle into the North-Clockwise azimuth range [0, 360).
 * 0° = North, 90° = East, 180° = South, 270° = West.
 * Throws RangeError if value is NaN or Infinity.
 */
export function asNorthAzimuthDeg(deg: number): NorthAzimuthDeg {
  if (!Number.isFinite(deg)) {
    throw new RangeError(`Invalid NorthAzimuthDeg: value must be finite, got ${deg}`);
  }
  let normalized = ((deg % 360) + 360) % 360;
  if (Object.is(normalized, -0) || normalized === 360) {
    normalized = 0;
  }
  return normalized as NorthAzimuthDeg;
}

/**
 * Normalizes an angle into the South-Zero azimuth range (-180, +180].
 * 0° = South, -90° = East (morning), +90° = West (afternoon), ±180° = North.
 * Throws RangeError if value is NaN or Infinity.
 */
export function asSouthAzimuthDeg(deg: number): SouthAzimuthDeg {
  if (!Number.isFinite(deg)) {
    throw new RangeError(`Invalid SouthAzimuthDeg: value must be finite, got ${deg}`);
  }
  let normalized = ((deg % 360) + 360) % 360;
  if (normalized > 180) {
    normalized -= 360;
  }
  if (normalized <= -180) {
    normalized = 180;
  }
  if (Object.is(normalized, -0)) {
    normalized = 0;
  }
  return normalized as SouthAzimuthDeg;
}

/**
 * Converts South-Zero azimuth (-180..+180) to North-Clockwise azimuth [0..360).
 * Exact relation: gamma_north = ((gamma_south + 180) % 360 + 360) % 360
 *   0° (South) -> 180°
 * -90° (East)  ->  90°
 * +90° (West)  -> 270°
 * ±180° (North)->   0°
 */
export function southToNorthAzimuth(southDeg: number): NorthAzimuthDeg {
  if (!Number.isFinite(southDeg)) {
    throw new RangeError(`Invalid SouthAzimuthDeg: value must be finite, got ${southDeg}`);
  }
  const north = ((southDeg + 180.0) % 360.0 + 360.0) % 360.0;
  return asNorthAzimuthDeg(north);
}

/**
 * Converts North-Clockwise azimuth [0..360) to South-Zero azimuth (-180..+180].
 * Exact inverse of southToNorthAzimuth:
 * 180° (South) ->   0°
 *  90° (East)  -> -90°
 * 270° (West)  -> +90°
 *   0° (North) -> 180°
 */
export function northToSouthAzimuth(northDeg: number): SouthAzimuthDeg {
  if (!Number.isFinite(northDeg)) {
    throw new RangeError(`Invalid NorthAzimuthDeg: value must be finite, got ${northDeg}`);
  }
  let south = ((northDeg - 180.0) % 360.0 + 360.0) % 360.0;
  if (south > 180.0) {
    south -= 360.0;
  }
  if (south <= -180.0) {
    south = 180.0;
  }
  if (Object.is(south, -0)) {
    south = 0;
  }
  return asSouthAzimuthDeg(south);
}

/**
 * Normalizes Unix timestamp to seconds.
 * Throws RangeError if timestamp is not positive finite number.
 * If abs(utcTs) >= 1e11 (millisecond epoch timestamp), divides by 1000.
 */
export function normalizeUtcTimestampSeconds(utcTs: number): UtcTimestampSeconds {
  if (!Number.isFinite(utcTs) || utcTs <= 0) {
    throw new RangeError(`Invalid utcTs: must be a positive finite number, got ${utcTs}`);
  }
  let seconds = utcTs;
  if (Math.abs(seconds) >= 1e11) {
    seconds = Math.floor(seconds / 1000.0);
  }
  return seconds as UtcTimestampSeconds;
}

/**
 * Constructs normalized solar directional ray vector in ENU coordinates from North-Clockwise azimuth and elevation.
 * Coordinate frame: +X = East, +Y = North, +Z = Up.
 * Ray direction points FROM target TO the sun.
 */
export function sunVectorEnuFromNorthAzimuth(
  northAzDeg: number,
  elevationDeg: number
): { x: number; y: number; z: number } {
  if (!Number.isFinite(northAzDeg) || !Number.isFinite(elevationDeg)) {
    throw new RangeError(`Invalid solar angles: northAzDeg=${northAzDeg}, elevationDeg=${elevationDeg}`);
  }
  const azRad = (northAzDeg * Math.PI) / 180.0;
  const elRad = (elevationDeg * Math.PI) / 180.0;
  const cosEl = Math.cos(elRad);
  const clean = (val: number) => (Object.is(val, -0) ? 0 : val);
  return {
    x: clean(Math.sin(azRad) * cosEl),
    y: clean(Math.cos(azRad) * cosEl),
    z: clean(Math.sin(elRad)),
  };
}

/**
 * Constructs normalized solar directional ray vector in ENU coordinates from South-Zero azimuth and elevation.
 * Coordinate frame: +X = East, +Y = North, +Z = Up.
 * Ray direction points FROM target TO the sun.
 * Exact equivalence theorem:
 * sunVectorEnuFromSouthAzimuth(gamma_S, alpha) === sunVectorEnuFromNorthAzimuth(southToNorthAzimuth(gamma_S), alpha)
 */
export function sunVectorEnuFromSouthAzimuth(
  southAzDeg: number,
  elevationDeg: number
): { x: number; y: number; z: number } {
  if (!Number.isFinite(southAzDeg) || !Number.isFinite(elevationDeg)) {
    throw new RangeError(`Invalid solar angles: southAzDeg=${southAzDeg}, elevationDeg=${elevationDeg}`);
  }
  const azRad = (southAzDeg * Math.PI) / 180.0;
  const elRad = (elevationDeg * Math.PI) / 180.0;
  const cosEl = Math.cos(elRad);
  const clean = (val: number) => (Object.is(val, -0) ? 0 : val);
  return {
    x: clean(-Math.sin(azRad) * cosEl),
    y: clean(-Math.cos(azRad) * cosEl),
    z: clean(Math.sin(elRad)),
  };
}

/**
 * Calculates hemisphere-aware solar noon altitude at local winter solstice.
 * In Northern hemisphere (lat >= 0): declination = -23.45° (Dec 21).
 * In Southern hemisphere (lat < 0): declination = +23.45° (Jun 21).
 * rawAltitudeDeg = 90.0 - |latitudeDeg| - 23.45
 * clampedAltitudeDeg = max(minFloorDeg ?? 5.0, rawAltitudeDeg)
 */
export function calculateWinterSolsticeNoonAltitudeDeg(
  latitudeDeg: number,
  minFloorDeg: number = 5.0
): {
  rawAltitudeDeg: number;
  clampedAltitudeDeg: number;
  declinationDeg: number;
} {
  if (!Number.isFinite(latitudeDeg)) {
    throw new RangeError(`Invalid latitudeDeg: must be finite number, got ${latitudeDeg}`);
  }
  const absLat = Math.abs(latitudeDeg);
  const isNorthern = latitudeDeg >= 0;
  const declinationDeg = isNorthern ? -23.45 : 23.45;
  const rawAltitudeDeg = 90.0 - absLat - 23.45;
  const clampedAltitudeDeg = Math.max(minFloorDeg, rawAltitudeDeg);

  return {
    rawAltitudeDeg: Number(rawAltitudeDeg.toFixed(6)),
    clampedAltitudeDeg: Number(clampedAltitudeDeg.toFixed(6)),
    declinationDeg,
  };
}
