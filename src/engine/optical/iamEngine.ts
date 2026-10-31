/**
 * Temperature-Coupled Incidence Angle Modifier (IAM) Engine
 * SolarPV Studio v3.0 - Phase 2a (PR-2a-3)
 *
 * Governing Standards & Scientific References:
 * - Martin, N. & Ruiz, J. M. (2001): "Calculation of the PV modules angular losses under field conditions",
 *   Solar Energy, 70(1), pp. 25-38. DOI: 10.1016/S0038-092X(00)00155-4.
 * - IEC 61853-2 (2016): Photovoltaic (PV) module performance testing - Part 2:
 *   Spectral responsivity, incidence angle and module operating temperature measurements.
 * - Souka, A. F. & Safwat, H. H. (1966): "Determination of the optimum orientations for the double-exposure flat-plate collector",
 *   Solar Energy, 10(4), pp. 170-174. (ASHRAE b0 model foundation).
 * - Brandemuehl, M. J. & Beckman, W. A. (1980): "Transmission of diffuse radiation through CPC and flat plate collector glazings",
 *   Solar Energy, 24(5), pp. 511-513.
 * - Ghosh, G. (1995): "Handbook of Thermo-Optic Coefficients of Optical Materials with Applications",
 *   Academic Press (dn/dT values for fused silica and borosilicate/soda-lime solar glasses).
 *
 * Physical Principles:
 * 1. Fresnel Reflection & Snell's Law across air-ARC-glass interfaces.
 * 2. Martin & Ruiz (2001) empirical ARC formulation:
 *      IAM(theta) = 1 - [exp(-cos(theta)/a_r) - exp(-1/a_r)] / [1 - exp(-1/a_r)]
 *      where a_r = 0.16 for modern anti-reflective coated (ARC) textured glass.
 * 3. Temperature Coupling: High cell temperatures (up to 75°C in desert/BIPV installations)
 *    shift the refractive index through the thermo-optic coefficient:
 *      n(T) = n_ref + (dn/dT) * (T_cell - 25°C)
 *    where dn/dT ~ +4.5e-5 K^-1 is an analytical approximation based on Ghosh (1995) and IEC 61853-2
 *    for solar cover glass and porous silica ARC, subject to experimental uncertainty of +/-1.2e-5 K^-1
 *    depending on iron dopant concentration, soda-lime versus low-iron composition, and ARC porosity.
 * 4. Sky Diffuse & Ground-Reflected Integration:
 *    Uses Brandemuehl & Beckman equivalent incidence angles as functions of array tilt beta.
 */

import {
  TemperatureCoupledIamConfig,
  TemperatureCoupledIamResult,
  DEFAULT_IAM_CONFIG,
} from '../core/advancedInterfaces';

export interface DiffuseEquivalentAngles {
  skyDiffuseThetaDeg: number;
  groundReflectedThetaDeg: number;
}

export interface EffectivePoaTransmissionResult {
  iamBeam: number;
  iamSkyDiffuse: number;
  iamGroundDiffuse: number;
  iamPoaEffective: number;
  effectiveTransmissionLossPercent: number;
}

/**
 * Calculates the Martin & Ruiz (2001) ARC angular modifier.
 *
 * @param incidenceDeg Angle of incidence in degrees (0 = normal to panel)
 * @param arCoatingFactor Parameter a_r (typically 0.16 for modern ARC, 0.20 for bare glass)
 * @returns Baseline optical transmittance modifier IAM in [0, 1]
 */
export function calculateMartinRuizIam(
  incidenceDeg: number,
  arCoatingFactor: number = 0.16
): number {
  const theta = Math.max(0.0, Math.min(90.0, incidenceDeg));
  if (theta >= 89.9) return 0.0;
  if (theta <= 0.01) return 1.0;

  const cosTheta = Math.cos((theta * Math.PI) / 180.0);
  const a = Math.max(0.05, arCoatingFactor);

  const expCos = Math.exp(-cosTheta / a);
  const expOne = Math.exp(-1.0 / a);
  const denom = 1.0 - expOne;

  if (Math.abs(denom) < 1e-12) return 1.0;

  const rawLoss = (expCos - expOne) / denom;
  const iam = 1.0 - rawLoss;

  return Math.max(0.0, Math.min(1.0, Number(iam.toFixed(6))));
}

/**
 * Calculates physical Fresnel optical transmittance for unpolarized solar irradiance.
 *
 * @param incidenceDeg Angle of incidence in degrees
 * @param nGlass Refractive index of glass/coating
 * @param nAir Refractive index of air (default 1.00029)
 * @returns IAM normalized to normal incidence (IAM = (1 - R(theta)) / (1 - R(0)))
 */
export function calculateFresnelIam(
  incidenceDeg: number,
  nGlass: number = 1.526,
  nAir: number = 1.00029
): number {
  const theta = Math.max(0.0, Math.min(90.0, incidenceDeg));
  if (theta >= 89.9) return 0.0;
  if (theta <= 0.01) return 1.0;

  const thetaRad = (theta * Math.PI) / 180.0;
  const sinThetaI = Math.sin(thetaRad);

  // Snell's Law: n_air * sin(theta_i) = n_glass * sin(theta_t)
  const sinThetaT = (nAir / nGlass) * sinThetaI;
  if (sinThetaT >= 1.0) return 0.0; // Total internal reflection guard

  const thetaTRad = Math.asin(sinThetaT);
  const cosThetaI = Math.cos(thetaRad);
  const cosThetaT = Math.cos(thetaTRad);

  // Perpendicular (s-polarized) reflection
  const rPerp = (nAir * cosThetaI - nGlass * cosThetaT) / (nAir * cosThetaI + nGlass * cosThetaT);
  // Parallel (p-polarized) reflection
  const rPara = (nGlass * cosThetaI - nAir * cosThetaT) / (nGlass * cosThetaI + nAir * cosThetaT);

  // Unpolarized reflection coefficient
  const rTheta = 0.5 * (rPerp * rPerp + rPara * rPara);

  // Normal incidence reflection
  const rZero = Math.pow((nAir - nGlass) / (nAir + nGlass), 2);

  const iam = (1.0 - rTheta) / (1.0 - rZero);
  return Math.max(0.0, Math.min(1.0, Number(iam.toFixed(6))));
}

/**
 * Calculates ASHRAE b0 empirical angular modifier.
 *
 * @param incidenceDeg Angle of incidence in degrees
 * @param b0 ASHRAE factor (typically 0.05 for solar glass)
 */
export function calculateAshraeIam(
  incidenceDeg: number,
  b0: number = 0.05
): number {
  const theta = Math.max(0.0, Math.min(90.0, incidenceDeg));
  if (theta >= 85.0) return 0.0; // ASHRAE cutoff at high angles

  const thetaRad = (theta * Math.PI) / 180.0;
  const cosTheta = Math.cos(thetaRad);
  if (cosTheta <= 0.01) return 0.0;

  const iam = 1.0 - b0 * (1.0 / cosTheta - 1.0);
  return Math.max(0.0, Math.min(1.0, Number(iam.toFixed(6))));
}

/**
 * Calculates Temperature-Coupled Incidence Angle Modifier (PR-2a-3).
 *
 * Couples optical reflection with operating cell temperature through the thermo-optic
 * coefficient (dn/dT). At elevated cell temperatures (e.g. 65°C-75°C in arid environments
 * or unventilated BIPV), refractive index increases, slightly raising Fresnel reflection
 * at oblique angles.
 */
export function calculateTemperatureCoupledIam(
  config: Partial<TemperatureCoupledIamConfig> = {}
): TemperatureCoupledIamResult {
  const merged: TemperatureCoupledIamConfig = {
    ...DEFAULT_IAM_CONFIG,
    ...config,
  };

  const theta = Math.max(0.0, Math.min(90.0, merged.angleIncidenceDeg));
  const tCell = merged.cellTemperatureC;
  const deltaT = tCell - 25.0; // Deviation from STC 25°C

  // 1. Calculate baseline IAM at STC 25°C
  const variant = merged.modelVariant ?? 'martin_ruiz';
  let baselineIam = 1.0;

  if (variant === 'martin_ruiz') {
    baselineIam = calculateMartinRuizIam(theta, merged.arCoatingFactor ?? 0.16);
  } else if (variant === 'physical_fresnel') {
    baselineIam = calculateFresnelIam(theta, merged.refractiveIndexArcRef);
  } else {
    baselineIam = calculateAshraeIam(theta, merged.ashraeB0);
  }

  // 2. Thermo-optic refractive shift: n(T) = n_ref + (dn/dT) * deltaT
  const dn = merged.thermoOpticCoeffPerK * deltaT;

  // 3. Oblique incidence thermo-optic coupling factor:
  // Transmission loss increases with sin^2(theta) at non-perpendicular angles
  const thetaRad = (theta * Math.PI) / 180.0;
  const sinTheta = Math.sin(thetaRad);

  // Optical coupling coefficient kappa = 1.35 for ARC silica glass
  const kappaOpt = 1.35;
  const thermoOpticDelta = -kappaOpt * dn * Math.pow(sinTheta, 2);

  // Coupled IAM: baseline modified by thermo-optic effect
  let coupledIam = baselineIam + thermoOpticDelta;
  coupledIam = Math.max(0.0, Math.min(1.0, coupledIam));

  const deltaPercent = baselineIam > 0 ? ((coupledIam - baselineIam) / baselineIam) * 100.0 : 0.0;

  return {
    angleIncidenceDeg: theta,
    cellTemperatureC: tCell,
    iamBaseline: Number(baselineIam.toFixed(4)),
    iamCoupled: Number(coupledIam.toFixed(4)),
    thermoOpticDeltaPercent: Number(deltaPercent.toFixed(3)),
  };
}

/**
 * Calculates Brandemuehl & Beckman (1980) equivalent incidence angles for diffuse irradiance.
 *
 * @param tiltDeg PV array tilt in degrees (0 = horizontal, 90 = vertical)
 */
export function calculateBrandemuehlDiffuseAngles(tiltDeg: number): DiffuseEquivalentAngles {
  const beta = Math.max(0.0, Math.min(90.0, tiltDeg));

  // Brandemuehl & Beckman (1980) polynomial correlations:
  // Sky diffuse equivalent angle: theta_sky = 59.7 - 0.1388 * beta + 0.001497 * beta^2
  const skyDiffuse = 59.7 - 0.1388 * beta + 0.001497 * beta * beta;

  // Ground reflected equivalent angle: theta_gnd = 90.0 - 0.5788 * beta + 0.002693 * beta^2
  const groundReflected = 90.0 - 0.5788 * beta + 0.002693 * beta * beta;

  return {
    skyDiffuseThetaDeg: Number(skyDiffuse.toFixed(2)),
    groundReflectedThetaDeg: Number(groundReflected.toFixed(2)),
  };
}

/**
 * Integrates beam, sky-diffuse, and ground-reflected components into effective POA transmittance factor.
 */
export function calculateEffectivePoaIam(
  beamPoaWm2: number,
  skyDiffusePoaWm2: number,
  groundReflectedPoaWm2: number,
  solarZenithDeg: number,
  tiltDeg: number,
  cellTemperatureC: number = 25.0,
  arCoatingFactor: number = 0.16
): EffectivePoaTransmissionResult {
  const totalPoa = beamPoaWm2 + skyDiffusePoaWm2 + groundReflectedPoaWm2;
  if (totalPoa <= 0.0) {
    return {
      iamBeam: 1.0,
      iamSkyDiffuse: 0.95,
      iamGroundDiffuse: 0.88,
      iamPoaEffective: 1.0,
      effectiveTransmissionLossPercent: 0.0,
    };
  }

  // 1. Beam IAM
  const iamBeamRes = calculateTemperatureCoupledIam({
    angleIncidenceDeg: solarZenithDeg,
    cellTemperatureC,
    arCoatingFactor,
    modelVariant: 'martin_ruiz',
  });
  const iamBeam = iamBeamRes.iamCoupled;

  // 2. Diffuse equivalent angles
  const diffAngles = calculateBrandemuehlDiffuseAngles(tiltDeg);

  const iamSkyRes = calculateTemperatureCoupledIam({
    angleIncidenceDeg: diffAngles.skyDiffuseThetaDeg,
    cellTemperatureC,
    arCoatingFactor,
    modelVariant: 'martin_ruiz',
  });
  const iamSkyDiffuse = iamSkyRes.iamCoupled;

  const iamGndRes = calculateTemperatureCoupledIam({
    angleIncidenceDeg: diffAngles.groundReflectedThetaDeg,
    cellTemperatureC,
    arCoatingFactor,
    modelVariant: 'martin_ruiz',
  });
  const iamGroundDiffuse = iamGndRes.iamCoupled;

  // 3. Weighted total POA transmittance
  const weightedTransmittance =
    beamPoaWm2 * iamBeam +
    skyDiffusePoaWm2 * iamSkyDiffuse +
    groundReflectedPoaWm2 * iamGroundDiffuse;

  const iamPoaEffective = weightedTransmittance / totalPoa;
  const lossPercent = (1.0 - iamPoaEffective) * 100.0;

  return {
    iamBeam: Number(iamBeam.toFixed(4)),
    iamSkyDiffuse: Number(iamSkyDiffuse.toFixed(4)),
    iamGroundDiffuse: Number(iamGroundDiffuse.toFixed(4)),
    iamPoaEffective: Number(iamPoaEffective.toFixed(4)),
    effectiveTransmissionLossPercent: Number(lossPercent.toFixed(2)),
  };
}
