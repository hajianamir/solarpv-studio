import {asNorthAzimuthDeg, southToNorthAzimuth} from '../engine/core/solarGeometryContract';

/** v1 compatibility adapter. Sun angles are always north-clockwise.
 * New callers should send surfaceAzimuthNorthDeg or an explicit convention.
 * All supplied aliases must represent the same direction (modulo 360).
 */
export function resolvePoaAzimuthRequest(body: Record<string, unknown>) {
  const convention = body.surfaceAzimuthConvention;
  if (convention !== undefined && convention !== 'north_clockwise' && convention !== 'south_zero') {
    throw new Error('Unknown surfaceAzimuthConvention');
  }
  const read = (key: string) => {
    const value = body[key];
    if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '' || !Number.isFinite(Number(value))) throw new Error(`Invalid ${key}`);
    return Number(value);
  };
  const candidates: number[] = [];
  for (const key of ['surfaceAzimuthNorthDeg', 'surfaceAzimuthSouthDeg', 'azimuthDeg', 'surfaceAzimuthDeg']) {
    if (body[key] === undefined) continue;
    const value = read(key);
    candidates.push(key === 'surfaceAzimuthNorthDeg' || (key !== 'surfaceAzimuthSouthDeg' && convention === 'north_clockwise') ? asNorthAzimuthDeg(value) : southToNorthAzimuth(value));
  }
  const north = candidates[0] ?? (convention === 'north_clockwise' ? 180 : southToNorthAzimuth(0));
  if (candidates.some(value => Math.abs(((value - north + 540) % 360) - 180) > 1e-8)) throw new Error('Conflicting surface azimuth aliases');
  const sun = ['sunAzimuthDeg', 'solarAzimuthDeg'].filter(key => body[key] !== undefined).map(key => asNorthAzimuthDeg(read(key)));
  if (sun.length === 2 && Math.abs(((sun[0] - sun[1] + 540) % 360) - 180) > 1e-8) throw new Error('Conflicting solar azimuth aliases');
  return {
    surfaceAzimuthNorthDeg: north,
    sunAzimuthNorthDeg: sun[0] ?? 180,
    contract: 'poa-azimuth-v1' as const,
    legacyDefaultUsed: convention === undefined && body.surfaceAzimuthNorthDeg === undefined && body.surfaceAzimuthSouthDeg === undefined,
  };
}
