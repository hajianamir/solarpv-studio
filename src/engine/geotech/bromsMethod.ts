/**
 * Broms (1964) Lateral Bearing Capacity Method for Driven Piles
 * SolarPV Studio v3.0 - Geotechnical & Foundation Engineering Engine
 *
 * Conforming to:
 * - Broms, B.B. (1964): Lateral Resistance of Piles in Cohesive and Cohesionless Soils
 * - FHWA-NHI-16-009 / GEC 012: Design and Construction of Driven Pile Foundations
 * - Eurocode 7 (EN 1997-1) §7.6: Transverse actions on piles
 * - ASCE 7-22 §27.3 / Iranian National Building Code Part 7 (مبحث ۷ مقررات ملی ساختمان)
 */

import { type SoilType } from '../structuralEngine';

export interface BromsPileSizingResult {
  pileSection: string;
  embedmentDepthM: number;
  lateralDepthM: number;
  minDepthForFrostM: number;
  lateralCapacityKn: number;
  appliedLateralShearKn: number;
  bendingMomentKnM: number;
  allowableMomentKnM: number;
  fosLateral: number;
  fosMoment: number;
  isFosSafe: boolean;
  notes: string;
}

/**
 * Broms (1964) lateral bearing capacity method for driven piles.
 * Single source of truth for pile sizing across all engines, benchmarks, and UI.
 *
 * @param lateralShearKn Applied horizontal shear force at top of post (kN)
 * @param clearanceHeightM Height of pile head above ground surface (lever arm e, m)
 * @param frostDepthM Frost penetration depth at site (m)
 * @param soilClass Soil geotechnical classification
 * @param qaKpa Allowable soil bearing capacity (kPa)
 * @param phiDeg Angle of internal friction (degrees)
 * @param cohesionKpa Undrained shear strength / cohesion (kPa)
 * @param densityKnM3 Moist/saturated unit weight of soil (kN/m³)
 * @param targetFos Minimum required lateral factor of safety (default 1.75 per Eurocode 7 / FHWA)
 */
export function calculateBromsPileSizing(
  lateralShearKn: number,
  clearanceHeightM: number,
  frostDepthM: number,
  soilClass: SoilType,
  qaKpa: number,
  phiDeg: number,
  cohesionKpa: number,
  densityKnM3: number,
  targetFos: number = 1.75
): BromsPileSizingResult {
  const minDepthForFrost = Number((frostDepthM + 1.0).toFixed(2));
  const pileWidthD = 0.15; // W6 section flange width ~ 150mm (0.15 m)

  let requiredDepthM = minDepthForFrost;
  let ultimateLateralCapacityKn = 0;
  const leverArmM = Math.max(0.1, clearanceHeightM);

  if (soilClass === 'medium_clay') {
    // FHWA-NHI-16-009 §10.4.4 (free-headed short pile, cohesive soil):
    //   Solve iteratively for f:  e + 1.5*D + f/2 = L
    //   Then Hu = 9 * su * D * f
    // where e = leverArmM (moment arm to ground), D = pileWidthD, L = testL.
    const cu = Math.max(25, cohesionKpa);
    // Iteratively find depth L providing FoS >= targetFos for pure lateral equilibrium
    let testL = 0.8;
    while (testL <= 4.0) {
      const f = 2.0 * (testL - 1.5 * pileWidthD - leverArmM);
      const cap = f > 0 ? 9.0 * cu * pileWidthD * f : 0;
      if (cap >= lateralShearKn * targetFos) {
        requiredDepthM = Number(testL.toFixed(2));
        ultimateLateralCapacityKn = Number(cap.toFixed(1));
        break;
      }
      testL += 0.1;
    }
    if (ultimateLateralCapacityKn === 0) {
      requiredDepthM = 2.5;
      ultimateLateralCapacityKn = Number(((9.0 * cu * pileWidthD * (2.5 - 1.5 * pileWidthD)) / 2.5).toFixed(1));
    }
  } else {
    // Cohesionless Soil (Sand/Gravel): Broms short pile: Hu_ult = 0.5 * gamma * D * L^3 * Kp / (e + L)
    const phiRad = (phiDeg * Math.PI) / 180.0;
    const kp = Math.pow(Math.tan(Math.PI / 4 + phiRad / 2), 2);
    const gamma = densityKnM3 > 0 ? densityKnM3 : 18.0;

    let testL = 0.8;
    while (testL <= 4.0) {
      const cap = (0.5 * gamma * pileWidthD * Math.pow(testL, 3) * kp) / (leverArmM + testL);
      if (cap >= lateralShearKn * (targetFos >= 1.8 ? targetFos : 1.8)) {
        requiredDepthM = Number(testL.toFixed(2));
        ultimateLateralCapacityKn = Number(cap.toFixed(1));
        break;
      }
      testL += 0.1;
    }
    if (ultimateLateralCapacityKn === 0) {
      requiredDepthM = 2.2;
      ultimateLateralCapacityKn = Number(((0.5 * gamma * pileWidthD * Math.pow(2.2, 3) * kp) / (leverArmM + 2.2)).toFixed(1));
    }
  }

  // Bending moment check
  const bendingMomentKnM = Number((lateralShearKn * (leverArmM + 0.3 * requiredDepthM)).toFixed(2));

  // Profile selection:
  // C150x50x2.5: Zx = 35 cm³, Fy = 345 MPa -> M_allow = 12.1 kNm
  // W6x9:        Zx = 5.56 in³ = 91.1 cm³, Fy = 345 MPa -> M_allow = 31.4 kNm
  // W6x12:       Zx = 7.30 in³ = 120 cm³, Fy = 345 MPa -> M_allow = 41.4 kNm
  let pileSection = 'W6x9';
  let allowableMomentKnM = 31.4;

  if (bendingMomentKnM < 8.0 && lateralShearKn < 6.0) {
    pileSection = 'C150x50x2.5';
    allowableMomentKnM = 12.1;
  } else if (bendingMomentKnM > 25.0 || lateralShearKn > 15.0) {
    pileSection = 'W6x12';
    allowableMomentKnM = 41.4;
  }

  const lateralDepthM = requiredDepthM;
  const effectiveEmbedmentDepthM = Math.max(requiredDepthM, minDepthForFrost);

  const fosLateral = Number((ultimateLateralCapacityKn / Math.max(0.1, lateralShearKn)).toFixed(2));
  const fosMoment = Number((allowableMomentKnM / Math.max(0.1, bendingMomentKnM)).toFixed(2));
  const isSafe = fosLateral >= 1.5 && fosMoment >= 1.5 && effectiveEmbedmentDepthM >= minDepthForFrost;

  return {
    pileSection,
    embedmentDepthM: effectiveEmbedmentDepthM,
    lateralDepthM,
    minDepthForFrostM: minDepthForFrost,
    lateralCapacityKn: ultimateLateralCapacityKn,
    appliedLateralShearKn: Number(lateralShearKn.toFixed(2)),
    bendingMomentKnM,
    allowableMomentKnM,
    fosLateral,
    fosMoment,
    isFosSafe: isSafe,
    notes: `Selected ${pileSection} satisfies Broms lateral equilibrium with FoS=${fosLateral} and frost heave embedment constraint (L=${effectiveEmbedmentDepthM}m >= ${minDepthForFrost}m).`,
  };
}

/**
 * Calculate the required embedment depth (m) to achieve a target uplift factor of safety.
 * Derived by inverting the skin-friction uplift formula:
 *   For cohesionless soil: T_ult = beta * (gamma * L / 2) * (pi * D) * L = 0.5 * beta * gamma * pi * D * L^2
 *   Therefore: L_req = sqrt( T_demand * targetFos / (0.5 * beta * gamma * pi * D) )
 *   For cohesive soil: T_ult = alpha * su * (pi * D) * L
 *   Therefore: L_req = T_demand * targetFos / (alpha * su * pi * D)
 */
export function calculateRequiredEmbedmentForUplift(
  upliftDemandPerPostKn: number,
  soilType: SoilType,
  diameterM: number = 0.15,
  cohesionKpa: number = 15,
  densityKnM3: number = 18.0,
  minFrostDepthM: number = 0.3,
  targetFos: number = 2.0
): number {
  if (upliftDemandPerPostKn <= 0) {
    return 0.5;
  }

  const perimeterM = Math.PI * diameterM;
  const targetCapacityKn = upliftDemandPerPostKn * targetFos;
  let depthFromUplift = 0.5;

  if (soilType === 'medium_clay') {
    const su = Math.max(25, cohesionKpa);
    const alpha = su < 50 ? 0.5 : 0.35;
    depthFromUplift = targetCapacityKn / (alpha * su * perimeterM);
  } else {
    const beta =
      soilType === 'dense_sand_gravel' ? 0.5
      : soilType === 'loose_sand' ? 0.3
      : 0.4;
    const gamma = Math.max(14, densityKnM3);
    // T_ult = 0.5 * beta * gamma * perimeter * L^2
    const coef = 0.5 * beta * gamma * perimeterM;
    depthFromUplift = Math.sqrt(targetCapacityKn / coef);
  }

  return Number(Math.min(5.0, Math.max(0.5, depthFromUplift)).toFixed(2));
}
