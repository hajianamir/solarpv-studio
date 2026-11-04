// SolarPV Studio Core Calculation Engine
// Faithful TypeScript implementation of pv-math, pv-electrical, pv-finance, and pv-shading

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Triangle {
  v0: Vec3;
  v1: Vec3;
  v2: Vec3;
}

// Equipment shapes moved to the leaf module types/equipmentTypes.ts (BUG-9)
// and re-exported here for backward compatibility.
export type { PvModule, Inverter, Battery } from './types/equipmentTypes';
import type { PvModule, Inverter, Battery } from './types/equipmentTypes';
import { getClimateData } from './climaticData';

export interface Project {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  dailyLoadKwh: number;
  autonomyDays: number;
  systemCapacityKwp: number;
  panelCount: number;
  inverterCount: number;
  batteryCount: number;
  lcoeUsdPerKwh: number;
  estimatedAnnualYieldKwh?: number;
  createdAt?: string;
}

export interface QuickSizingRequest {
  projectName: string;
  latitude: number;
  longitude: number;
  dailyKwh: number;
  autonomyDays: number;
  moduleId?: string;
  inverterId?: string;
  batteryId?: string;
}

export interface QuickSizingResponse {
  projectId: string;
  projectName: string;
  systemCapacityKwp: number;
  panelCount: number;
  inverterCount: number;
  batteryCount: number;
  lcoeUsdPerKwh: number;
  estimatedAnnualYieldKwh: number;
}

export interface StringSizingRequest {
  panelVoc: number;
  panelVmp: number;
  tempMinC: number;
  tempMaxC: number;
  betaVocPerC: number;
  betaPmpPerC?: number;   // NEW (BUG-6) — temperature coefficient of Pmp, fraction/°C, negative
                          //       e.g. -0.0030 means -0.30 %/°C
  inverterVdcMax: number;
  inverterMpptMin: number;
  inverterMpptMax: number;
}

export interface StringSizingResponse {
  minModules: number;
  maxModules: number;
  hasWarning: boolean;
  warnings?: string[];
}

export interface LcoeRequest {
  capex: number;
  opexAnnual: number;
  energyAnnual: number;
  discountRate: number;
  lifetimeYears: number;
}

export interface LcoeResponse {
  lcoeValue: number;
}

export interface SolarPositionRequest {
  latitudeDeg: number;
  longitudeDeg: number;
  utcTs: number;
}

export interface SolarPositionResponse {
  zenithDeg: number;
  azimuthDeg: number;
}

export interface PoaIrradianceRequest {
  ghi: number;
  dni: number;
  dhi: number;
  tiltDeg: number;
  azimuthDeg: number;
  sunZenithDeg: number;
  sunAzimuthDeg: number;
}

export interface PoaIrradianceResponse {
  poaIrradiance: number;
}

export interface VoltageDropRequest {
  lengthM: number;
  currentA: number;
  crossSectionMm2: number;
  vNominal: number;
  rho?: number;
}

export interface VoltageDropResponse {
  voltageDropPct: number;
}

export interface NpvRequest {
  rate: number;
  cashflows: number[];
}

export interface IrrRequest {
  cashflows: number[];
}

export interface ShadingAnalyzeRequest {
  meshTriangles: Triangle[];
  targetPoints: Vec3[];
  sunDirections: Vec3[];
}

export interface ShadingAnalyzeResponse {
  shadingFactors: number[];
}

// ----------------------------------------------------
// DEFAULT SEED CATALOG
// ----------------------------------------------------
// DEPRECATED: kept for backward compatibility with server.ts and any
// external callers. Values are derived synchronously from the canonical
// equipment catalog via catalogAdapters.ts. Do not add new entries here —
// extend equipmentCatalogData.ts instead.
import {
  ENGINE_DEFAULT_MODULES as ADAPTED_MODULES,
  ENGINE_DEFAULT_INVERTERS as ADAPTED_INVERTERS,
  ENGINE_DEFAULT_BATTERIES as ADAPTED_BATTERIES,
} from './catalogAdapters';

export const DEFAULT_MODULES: PvModule[] = ADAPTED_MODULES;
export const DEFAULT_INVERTERS: Inverter[] = ADAPTED_INVERTERS;
export const DEFAULT_BATTERIES: Battery[] = ADAPTED_BATTERIES;

// In-Memory Database store
export class InMemorySolarDatabase {
  public projects: Map<string, Project> = new Map();
  public pvModules: Map<string, PvModule> = new Map();
  public inverters: Map<string, Inverter> = new Map();
  public batteries: Map<string, Battery> = new Map();
  public outbox: Array<any> = [];

  constructor() {
    // Seed from the canonical equipment catalog via adapters (BUG-9).
    const seedModules = DEFAULT_MODULES.length > 0 ? DEFAULT_MODULES : [];
    const seedInverters = DEFAULT_INVERTERS.length > 0 ? DEFAULT_INVERTERS : [];
    const seedBatteries = DEFAULT_BATTERIES.length > 0 ? DEFAULT_BATTERIES : [];
    seedModules.forEach((m) => this.pvModules.set(m.id, m));
    seedInverters.forEach((i) => this.inverters.set(i.id, i));
    seedBatteries.forEach((b) => this.batteries.set(b.id, b));
  }
}

// ----------------------------------------------------
// ELECTRICAL SIZING & VOLTAGE DROP
// ----------------------------------------------------
export function calculateStringSizing(req: StringSizingRequest): StringSizingResponse {
  const {
    panelVoc,
    panelVmp,
    tempMinC,
    tempMaxC,
    betaVocPerC,
    betaPmpPerC,
    inverterVdcMax,
    inverterMpptMin,
    inverterMpptMax,
  } = req;

  const warnings: string[] = [];
  const vocMaxTemp = panelVoc * (1.0 + betaVocPerC * (tempMinC - 25.0));
  // IEC 62548 §7.2: hot-case MPPT floor uses the Pmp temperature
  // coefficient (typically steeper than Voc). Fall back to Voc when
  // betaPmpPerC is absent (conservative approximation).
  const vmpHotCoeff = (req.betaPmpPerC ?? betaVocPerC);
  const vmpMinTemp = panelVmp * (1.0 + vmpHotCoeff * (tempMaxC - 25.0));

  const maxModulesVmax = Math.floor(inverterVdcMax / vocMaxTemp);
  // Per IEC 62548 §7.2 the MPPT upper-bound is governed by the HIGHEST Vmp,
  // which occurs at the coldest design temperature. Use the Pmp temperature
  // coefficient when supplied; otherwise fall back to the Voc coefficient
  // (documented conservative approximation).
  const vmpColdCoeff = betaPmpPerC ?? betaVocPerC;
  const singleModuleVmpMaxCold = panelVmp * (1.0 + vmpColdCoeff * (tempMinC - 25.0));
  const maxModulesMppt = Math.floor(inverterMpptMax / singleModuleVmpMaxCold);
  const maxModules = Math.min(maxModulesVmax, maxModulesMppt);

  const minModules = Math.ceil(inverterMpptMin / vmpMinTemp);

  if (minModules > maxModules) {
    warnings.push("Minimum required modules exceeds maximum allowed string voltage.");
  }

  return {
    minModules: Math.max(1, minModules),
    maxModules: Math.max(1, maxModules),
    hasWarning: warnings.length > 0,
    warnings,
  };
}

export function calculateVoltageDropDc(
  lengthM: number,
  currentA: number,
  crossSectionMm2: number,
  vNominal: number,
  rho: number = 0.0175 // Copper default in ohm-mm2/m
): number {
  if (crossSectionMm2 <= 0 || vNominal <= 0) {
    return 0.0;
  }
  const resistance = rho * (2.0 * lengthM) / crossSectionMm2;
  const vDrop = resistance * currentA;
  return (vDrop / vNominal) * 100.0;
}

// ----------------------------------------------------
// FINANCIAL ENGINE (LCOE, NPV, IRR)
// ----------------------------------------------------
export function calculateLcoe(
  capex: number,
  opexAnnual: number,
  energyAnnual: number,
  discountRate: number,
  lifetimeYears: number,
  degradationPct: number = 0   // NEW (BUG-7) — annual module degradation, %/year
): number {
  if (energyAnnual <= 0 || lifetimeYears <= 0) {
    return 0.0;
  }

  let totalCostPv = capex;
  for (let t = 1; t <= lifetimeYears; t++) {
    totalCostPv += opexAnnual / Math.pow(1.0 + discountRate, t);
  }

  let totalEnergyPv = 0;
  const dFrac = degradationPct / 100.0;
  for (let t = 1; t <= lifetimeYears; t++) {
    totalEnergyPv += (energyAnnual * Math.pow(1.0 - dFrac, t - 1)) / Math.pow(1.0 + discountRate, t);
  }

  if (totalEnergyPv === 0) return 0.0;
  return totalCostPv / totalEnergyPv;
}

export function calculateNpv(rate: number, cashflows: number[]): number {
  if (!cashflows || cashflows.length === 0) return 0.0;
  return cashflows.reduce((sum, cf, t) => sum + cf / Math.pow(1.0 + rate, t), 0);
}

export function calculateIrr(cashflows: number[]): number {
  if (!cashflows || cashflows.length < 2) return 0.0;

  const hasPos = cashflows.some(c => c > 0);
  const hasNeg = cashflows.some(c => c < 0);
  if (!hasPos || !hasNeg) return 0.0;

  // If undiscounted sum is non-positive, capital is never recovered -> no real positive rate of return
  const undiscountedSum = cashflows.reduce((a, b) => a + b, 0);
  if (undiscountedSum <= 0) return 0.0;

  let rate = 0.10;
  const maxIterations = 100;
  const tolerance = 1e-7;

  for (let i = 0; i < maxIterations; i++) {
    let f = 0.0;
    let df = 0.0;

    for (let t = 0; t < cashflows.length; t++) {
      const cf = cashflows[t];
      const denom = Math.pow(1.0 + rate, t);
      f += cf / denom;
      df += (-t * cf) / (denom * (1.0 + rate));
    }

    if (Math.abs(df) < 1e-12) break;

    const nextRate = rate - f / df;
    if (Math.abs(nextRate - rate) < tolerance && nextRate > -0.99 && nextRate < 10.0) {
      return nextRate;
    }
    rate = nextRate;
  }

  // Bisection fallback
  let low = -0.90;
  let high = 5.0;
  const fLow = calculateNpv(low, cashflows);
  const fHigh = calculateNpv(high, cashflows);

  // Intermediate Value Theorem: signs must differ for root existence
  if (fLow * fHigh > 0) {
    return 0.0;
  }

  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2.0;
    const fMid = calculateNpv(mid, cashflows);
    if (Math.abs(fMid) < tolerance) {
      return mid;
    }
    if (fMid > 0.0) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return (low + high) / 2.0;
}

// ----------------------------------------------------
// SOLAR POSITION & POA IRRADIANCE (NOAA + PEREZ)
// ----------------------------------------------------
export function calculateSolarPosition(
  latitudeDeg: number,
  longitudeDeg: number,
  utcTs: number
): { zenithDeg: number; azimuthDeg: number } {
  const daysSince2000 = (utcTs - 946728000.0) / 86400.0;
  const julianCentury = daysSince2000 / 36525.0;

  const toRad = (deg: number) => (deg * Math.PI) / 180.0;
  const toDeg = (rad: number) => (rad * 180.0) / Math.PI;

  const geomMeanLongSun = (280.46646 + julianCentury * (36000.76983 + julianCentury * 0.0003032)) % 360.0;
  const geomMeanAnomSun = 357.52911 + julianCentury * (35999.05029 - 0.0001537 * julianCentury);

  const sunEqOfCtr =
    Math.sin(toRad(geomMeanAnomSun)) * (1.914602 - julianCentury * (0.004817 + 0.000014 * julianCentury)) +
    Math.sin(toRad(2.0 * geomMeanAnomSun)) * (0.019993 - 0.000101 * julianCentury) +
    Math.sin(toRad(3.0 * geomMeanAnomSun)) * 0.000289;

  const sunTrueLong = geomMeanLongSun + sunEqOfCtr;
  const apparentLong = sunTrueLong - 0.00569 - 0.00478 * Math.sin(toRad(125.04 - 1934.136 * julianCentury));

  const meanObliqEclip =
    23.0 + (26.0 + (21.448 - julianCentury * (46.815 + julianCentury * (0.00059 - julianCentury * 0.001813))) / 60.0) / 60.0;
  const obliqCorr = meanObliqEclip + 0.00256 * Math.cos(toRad(125.04 - 1934.136 * julianCentury));

  const declination = toDeg(Math.asin(Math.sin(toRad(obliqCorr)) * Math.sin(toRad(apparentLong))));

  const varY = Math.pow(Math.tan(toRad(obliqCorr) / 2.0), 2);
  const eqOfTime =
    4.0 *
    toDeg(
      varY * Math.sin(toRad(2.0 * geomMeanLongSun)) -
        2.0 * Math.sin(toRad(geomMeanAnomSun)) * 0.016708634 +
        4.0 * 0.016708634 * varY * Math.sin(toRad(geomMeanAnomSun)) * Math.cos(toRad(2.0 * geomMeanLongSun)) -
        0.5 * varY * varY * Math.sin(toRad(4.0 * geomMeanLongSun)) -
        1.25 * 0.016708634 * 0.016708634 * Math.sin(toRad(2.0 * geomMeanAnomSun))
    );

  const secondsInDay = ((utcTs % 86400) + 86400) % 86400;
  const timeOffset = eqOfTime + 4.0 * longitudeDeg;
  const trueSolarTime = secondsInDay / 60.0 + timeOffset;

  const hourAngle = trueSolarTime / 4.0 < 0.0 ? trueSolarTime / 4.0 + 180.0 : trueSolarTime / 4.0 - 180.0;

  const latRad = toRad(latitudeDeg);
  const declRad = toRad(declination);
  const haRad = toRad(hourAngle);

  const cosZenith = Math.sin(latRad) * Math.sin(declRad) + Math.cos(latRad) * Math.cos(declRad) * Math.cos(haRad);
  const clampedCosZenith = Math.min(1.0, Math.max(-1.0, cosZenith));
  const zenithRad = Math.acos(clampedCosZenith);
  const zenithDeg = toDeg(zenithRad);

  const sinZenith = Math.sin(zenithRad);
  let azimuthRad = 0;
  if (Math.abs(sinZenith) > 1e-6 && Math.abs(Math.cos(latRad)) > 1e-6) {
    const val = (Math.sin(latRad) * cosZenith - Math.sin(declRad)) / (Math.cos(latRad) * sinZenith);
    const clampedVal = Math.min(1.0, Math.max(-1.0, val));
    if (haRad > 0.0) {
      // Afternoon: sun is west of solar noon meridian.
      azimuthRad = Math.acos(clampedVal);
    } else {
      // Morning: sun is east of solar noon meridian.
      azimuthRad = Math.PI * 2.0 - Math.acos(clampedVal);
    }
  }
  const azimuthDeg = (toDeg(azimuthRad) + 180.0) % 360.0;

  return { zenithDeg, azimuthDeg };
}

export function calculatePoaIrradiance(req: PoaIrradianceRequest): number {
  const { ghi, dni, dhi, tiltDeg, azimuthDeg, sunZenithDeg, sunAzimuthDeg } = req;

  if (sunZenithDeg >= 90.0) {
    return 0.0;
  }

  const toRad = (deg: number) => (deg * Math.PI) / 180.0;
  const tiltRad = toRad(tiltDeg);
  const zenithRad = toRad(sunZenithDeg);
  const sunAzRad = toRad(sunAzimuthDeg);
  const surfaceAzRad = toRad(azimuthDeg);

  const cosInc =
    Math.cos(zenithRad) * Math.cos(tiltRad) +
    Math.sin(zenithRad) * Math.sin(tiltRad) * Math.cos(sunAzRad - surfaceAzRad);
  const cosIncClamp = Math.max(0.0, cosInc);

  const beamPoa = dni * cosIncClamp;

  const a = Math.max(0.0, cosIncClamp);
  const b = Math.max(0.087156, Math.cos(zenithRad)); // cos(85 deg)
  const airMass = Math.max(0.1, 1.0 / (Math.cos(zenithRad) + 0.15 * Math.pow(93.885 - sunZenithDeg, -1.25)));
  const brightness = Math.max(0.0, (dhi * airMass) / 1367.0);

  const clearness =
    dhi <= 0.0
      ? 1.0
      : ((dhi + dni) / dhi + 1.041 * Math.pow(zenithRad, 3)) / (1.0 + 1.041 * Math.pow(zenithRad, 3));

  // Perez 1990 8-bin diffuse model (Duffie & Beckman 4th ed., Table 2.5.1).
  // Each bin is (f11, f12, f13, f21, f22, f23) evaluated as:
  //   f1 = f11 + f12*brightness + f13*zenithRad
  //   f2 = f21 + f22*brightness + f23*zenithRad
  interface PerezBin {
    epsLo: number; epsHi: number;
    f11: number; f12: number; f13: number;
    f21: number; f22: number; f23: number;
  }
  const PEREZ_1990_BINS: ReadonlyArray<PerezBin> = [
    { epsLo: 1.000, epsHi: 1.065, f11: -0.008, f12:  0.588, f13: -0.062, f21: -0.060, f22:  0.072, f23: -0.022 },
    { epsLo: 1.065, epsHi: 1.230, f11:  0.130, f12:  0.683, f13: -0.151, f21: -0.019, f22:  0.066, f23: -0.029 },
    { epsLo: 1.230, epsHi: 1.500, f11:  0.330, f12:  0.487, f13: -0.221, f21:  0.055, f22: -0.064, f23: -0.026 },
    { epsLo: 1.500, epsHi: 1.950, f11:  0.568, f12:  0.187, f13: -0.295, f21:  0.109, f22: -0.152, f23: -0.014 },
    { epsLo: 1.950, epsHi: 2.800, f11:  0.873, f12: -0.392, f13: -0.362, f21:  0.226, f22: -0.462, f23:  0.001 },
    { epsLo: 2.800, epsHi: 4.500, f11:  1.132, f12: -1.237, f13: -0.412, f21:  0.288, f22: -0.823, f23:  0.056 },
    { epsLo: 4.500, epsHi: 6.200, f11:  1.060, f12: -1.600, f13: -0.359, f21:  0.264, f22: -1.127, f23:  0.131 },
    { epsLo: 6.200, epsHi: Infinity, f11: 0.678, f12: -0.327, f13: -0.250, f21: 0.156, f22: -1.377, f23: 0.251 },
  ];
  const bin = PEREZ_1990_BINS.find(b => clearness >= b.epsLo && clearness < b.epsHi)
    ?? PEREZ_1990_BINS[PEREZ_1990_BINS.length - 1];
  let f1 = bin.f11 + bin.f12 * brightness + bin.f13 * zenithRad;
  let f2 = bin.f21 + bin.f22 * brightness + bin.f23 * zenithRad;

  const f1Clamp = Math.max(0.0, f1);
  const diffusePoa =
    dhi *
    ((1.0 - f1Clamp) * ((1.0 + Math.cos(tiltRad)) / 2.0) +
      f1Clamp * (a / b) +
      f2 * Math.sin(tiltRad));

  const albedo = 0.2;
  const groundReflected = ghi * albedo * ((1.0 - Math.cos(tiltRad)) / 2.0);

  return Math.max(0.0, beamPoa + Math.max(0.0, diffusePoa) + groundReflected);
}

// ----------------------------------------------------
// RAY TRACING & SHADING ANALYSIS
// ----------------------------------------------------
function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vec3Dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function vec3Cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function vec3Normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function rayTriangleIntersect(orig: Vec3, dir: Vec3, tri: Triangle): boolean {
  const edge1 = vec3Sub(tri.v1, tri.v0);
  const edge2 = vec3Sub(tri.v2, tri.v0);
  const h = vec3Cross(dir, edge2);
  const a = vec3Dot(edge1, h);

  if (Math.abs(a) < 1e-7) return false;

  const f = 1.0 / a;
  const s = vec3Sub(orig, tri.v0);
  const u = f * vec3Dot(s, h);

  if (u < 0.0 || u > 1.0) return false;

  const q = vec3Cross(s, edge1);
  const v = f * vec3Dot(dir, q);

  if (v < 0.0 || u + v > 1.0) return false;

  const t = f * vec3Dot(edge2, q);
  return t > 1e-7;
}

export function calculateShadingFactor(
  triangles: Triangle[],
  targetPoints: Vec3[],
  sunDirs: Vec3[]
): number[] {
  if (sunDirs.length === 0 || targetPoints.length === 0) return [];

  return sunDirs.map((sunDir) => {
    const dirNorm = vec3Normalize(sunDir);
    let unshadedCount = 0;

    for (const pt of targetPoints) {
      let isOccluded = false;
      for (const tri of triangles) {
        if (rayTriangleIntersect(pt, dirNorm, tri)) {
          isOccluded = true;
          break;
        }
      }
      if (!isOccluded) {
        unshadedCount++;
      }
    }

    return unshadedCount / targetPoints.length;
  });
}

// ----------------------------------------------------
// QUICK SIZING SERVICE
// ----------------------------------------------------
export function performQuickSizing(
  req: QuickSizingRequest,
  db: InMemorySolarDatabase
): QuickSizingResponse {
  const module = (req.moduleId ? db.pvModules.get(req.moduleId) : undefined) || DEFAULT_MODULES[0];
  const inverter = (req.inverterId ? db.inverters.get(req.inverterId) : undefined) || DEFAULT_INVERTERS[0];
  const battery = (req.batteryId ? db.batteries.get(req.batteryId) : undefined) || DEFAULT_BATTERIES[0];

  let peakSunHours: number;
  try {
    const climate = getClimateData(req.latitude, req.longitude ?? 51.389);
    peakSunHours = climate.peakSunHours;
  } catch {
    peakSunHours = Math.max(3.5, 6.0 - Math.abs(req.latitude) * 0.05);
  }
  const requiredArrayKwp = req.dailyKwh / (peakSunHours * 0.75);

  const panelCount = Math.ceil((requiredArrayKwp * 1000.0) / module.pmpWatts);
  const actualCapacityKwp = (panelCount * module.pmpWatts) / 1000.0;

  const inverterCount = Math.ceil(actualCapacityKwp / inverter.pnomAcKw);

  const requiredBatteryStorageKwh = (req.dailyKwh * req.autonomyDays) / battery.depthOfDischargeMax;
  const batteryCount = Math.ceil(requiredBatteryStorageKwh / battery.capacityKwh);

  const annualYieldKwh = actualCapacityKwp * peakSunHours * 365.0 * 0.78;

  const capex = (actualCapacityKwp * 1100.0) + (batteryCount * battery.capacityKwh * 350.0);
  const opexAnnual = capex * 0.015;
  const lcoeVal = calculateLcoe(capex, opexAnnual, annualYieldKwh, 0.05, 25);

  const projectId = `proj-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
  const projectName = req.projectName?.trim() || "Quick PV Project";

  const project: Project = {
    id: projectId,
    name: projectName,
    latitude: req.latitude,
    longitude: req.longitude,
    dailyLoadKwh: req.dailyKwh,
    autonomyDays: req.autonomyDays,
    systemCapacityKwp: actualCapacityKwp,
    panelCount,
    inverterCount,
    batteryCount,
    lcoeUsdPerKwh: lcoeVal,
    estimatedAnnualYieldKwh: annualYieldKwh,
    createdAt: new Date().toISOString(),
  };

  db.projects.set(projectId, project);

  return {
    projectId,
    projectName,
    systemCapacityKwp: actualCapacityKwp,
    panelCount,
    inverterCount,
    batteryCount,
    lcoeUsdPerKwh: lcoeVal,
    estimatedAnnualYieldKwh: annualYieldKwh,
  };
}
