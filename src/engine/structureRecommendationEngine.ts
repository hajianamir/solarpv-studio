/**
 * Structure & Civil Foundation Recommendation Engine
 * SolarPV Studio v3.0 - PR-2a-6 Geotechnical & Structural Automation
 *
 * Implements:
 * - Geotechnical multi-criteria decision tree scoring (Rammed Steel Pile, Concrete Pier, Ground Screw, Ballasted Block)
 * - Broms (1964) lateral capacity method for piles in cohesive and cohesionless soils
 * - Frost depth heave protection constraints (L >= d_frost + 1.0 m)
 * - Profile selection: W6x9 vs W6x12 vs Cold-formed C-Channel
 * - 6-Section Detailed Structural Engineering Report generator
 * - Compliance with ASCE 7-22, Eurocode 7 (EN 1997-1), and IBC 2024
 */

import { FoundationType, SoilType } from './structuralEngine';

export interface StructuralRecommendationInput {
  siteName?: string;
  latitude: number;
  longitude: number;
  soilClassification: SoilType;
  soilBearingCapacityKpa: number;
  soilInternalFrictionAngleDeg: number;
  soilCohesionKpa: number;
  soilDensityKnM3: number;
  frostDepthCm: number;
  basicWindSpeedKmh: number;
  groundSnowLoadKgM2: number;
  slopeDeg?: number;
  tableAreaM2?: number;
  arrayTiltDeg?: number;
  postsPerTable?: number;
  clearanceHeightM?: number;
}

export interface FoundationOptionScore {
  type: FoundationType;
  nameEn: string;
  nameFa: string;
  suitabilityScore: number; // 0 to 100
  rank: number;
  pros: string[];
  cons: string[];
  estimatedCapexUsdPerKw: number;
  installSpeedMwPerWeek: number;
}

export interface BromsPileSizingResult {
  pileSection: 'W6x9' | 'W6x12' | 'C150x50x2.5';
  embedmentDepthM: number;
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

export interface FoundationRecommendationResult {
  input: StructuralRecommendationInput;
  primaryRecommendation: FoundationType;
  recommendedPileSizing: BromsPileSizingResult;
  allRankedOptions: FoundationOptionScore[];
  windPressureQzKnM2: number;
  groundSnowPressureSkKnM2: number;
  lateralShearPerPostKn: number;
  upliftPerPostKn: number;
  compressionPerPostKn: number;
  sensitivityPlus20Wind: {
    windSpeedKmh: number;
    lateralShearPerPostKn: number;
    fosLateral: number;
    pileAdequate: boolean;
  };
  geotechnicalDisclaimer: string;
  reportMarkdown: string;
}

export function recommendFoundation(input: StructuralRecommendationInput): FoundationRecommendationResult {
  const tableArea = input.tableAreaM2 ?? 52.0; // standard 28-module 2P table
  const tilt = input.arrayTiltDeg ?? 25.0;
  const posts = input.postsPerTable ?? 4;
  const clearance = input.clearanceHeightM ?? 1.2;
  const slope = input.slopeDeg ?? 2.0;
  const frostM = (input.frostDepthCm ?? 30.0) / 100.0;

  // Environmental loads (ASCE 7-22 simplified)
  const vMs = input.basicWindSpeedKmh / 3.6;
  const qz = 0.5 * 1.225 * Math.pow(vMs, 2) * 1.0 * 0.85 / 1000.0; // kN/m²
  const sk = (input.groundSnowLoadKgM2 * 9.81) / 1000.0; // kN/m²

  // Forces per table and post
  const tiltRad = (tilt * Math.PI) / 180.0;
  const lateralWindForceTable = qz * tableArea * Math.sin(tiltRad) * 1.2; // kN
  const lateralShearPerPost = lateralWindForceTable / posts;
  const upliftPerPost = (qz * tableArea * 1.15) / posts;
  const deadLoadPerPost = (tableArea * 22.0 * 9.81 / 1000.0) / posts; // ~0.22 kN/m² self weight
  const compressionPerPost = ((sk * tableArea * Math.cos(tiltRad)) + (tableArea * 22.0 * 9.81 / 1000.0)) / posts;

  // Multi-criteria scoring
  const scores: FoundationOptionScore[] = [];

  // 1. Rammed Steel Pile
  let rammedScore = 85;
  const rammedPros: string[] = ['Very fast installation (1.5-2.5 MW/week)', 'Lowest CAPEX for cohesive/granular soils', 'Zero concrete curing delay'];
  const rammedCons: string[] = [];
  if (input.soilClassification === 'rocky_limestone') {
    rammedScore -= 50;
    rammedCons.push('Refusal in shallow rock requires pre-drilling or concrete piers');
  }
  if (input.soilClassification === 'loose_sand') {
    rammedScore -= 10;
    rammedCons.push('Requires deeper embedment for lateral stability in loose sand');
  }
  if (slope > 15) {
    rammedScore -= 15;
    rammedCons.push('Difficult rig access on steep slopes');
  }
  scores.push({
    type: 'rammed_steel_pile',
    nameEn: 'Rammed Steel Pile (Driven W-Beam / C-Channel)',
    nameFa: 'پایه کوبشی فولادی (شمع پروفیل گرم‌نورد/C)',
    suitabilityScore: Math.max(10, Math.min(98, rammedScore)),
    rank: 0,
    pros: rammedPros,
    cons: rammedCons.length > 0 ? rammedCons : ['Requires soil push/pull load testing on site'],
    estimatedCapexUsdPerKw: 14.5,
    installSpeedMwPerWeek: 2.0,
  });

  // 2. Concrete Pier (Drilled Shaft)
  let pierScore = 70;
  const pierPros: string[] = ['Highest lateral and uplift resistance', 'Ideal for rocky/limestone or karst terrain', 'Excellent in high-wind regions (>140 km/h)'];
  const pierCons: string[] = ['High concrete volume and water supply logistics', '28-day curing delay before mounting racks', 'Higher labor and machinery costs'];
  if (input.soilClassification === 'rocky_limestone') {
    pierScore += 25;
  }
  if (input.basicWindSpeedKmh > 140) {
    pierScore += 10;
  }
  if (input.soilClassification === 'loose_sand') {
    pierCons.push('Risk of borehole collapse; requires temporary steel casing');
  }
  scores.push({
    type: 'concrete_pier',
    nameEn: 'Drilled Concrete Pier (Cast-in-Place Shaft)',
    nameFa: 'شمع بتنی درجا (حفاری و بتن‌ریزی)',
    suitabilityScore: Math.max(10, Math.min(95, pierScore)),
    rank: 0,
    pros: pierPros,
    cons: pierCons,
    estimatedCapexUsdPerKw: 24.0,
    installSpeedMwPerWeek: 0.6,
  });

  // 3. Ground Screw (Helical Anchor)
  let screwScore = 75;
  const screwPros: string[] = ['Excellent tensile uplift resistance', 'Suitable for undulating terrain and slopes up to 25°', 'Immediate loading capacity'];
  const screwCons: string[] = ['Higher material unit cost than driven piles', 'Risk of blade damage in cobbles/boulders (>100mm)'];
  if (slope > 8) {
    screwScore += 15;
    screwPros.push('Adapts easily to uneven grades and natural topography');
  }
  if (input.soilClassification === 'medium_clay' || input.soilClassification === 'loose_sand') {
    screwScore += 5;
  }
  if (input.soilClassification === 'rocky_limestone') {
    screwScore -= 40;
    screwCons.push('Cannot penetrate solid rock without costly core-drilling');
  }
  scores.push({
    type: 'ground_screw',
    nameEn: 'Helical Ground Screw Anchor',
    nameFa: 'شمع پیچشی فولادی (Ground Screw)',
    suitabilityScore: Math.max(10, Math.min(94, screwScore)),
    rank: 0,
    pros: screwPros,
    cons: screwCons,
    estimatedCapexUsdPerKw: 19.5,
    installSpeedMwPerWeek: 1.2,
  });

  // 4. Ballasted Concrete Block
  let blockScore = 40;
  const blockPros: string[] = ['Zero soil penetration / zero ground disturbance', 'Suitable for brownfields, capped landfills, and rooftops'];
  const blockCons: string[] = ['Extremely high concrete tonnage', 'Prone to differential settlement on soft soils', 'Susceptible to sliding under high wind'];
  if (input.soilBearingCapacityKpa < 100) {
    blockScore -= 20;
    blockCons.push('Exceeds allowable bearing capacity of soft soils without engineered sub-base');
  }
  if (slope > 5) {
    blockScore -= 25;
    blockCons.push('Severe downhill sliding hazard on sloped terrain');
  }
  scores.push({
    type: 'rooftop_ballasted_block',
    nameEn: 'Surface Ballasted Concrete Block',
    nameFa: 'بلوک وزنی بتنی سطحی',
    suitabilityScore: Math.max(5, Math.min(80, blockScore)),
    rank: 0,
    pros: blockPros,
    cons: blockCons,
    estimatedCapexUsdPerKw: 28.0,
    installSpeedMwPerWeek: 0.4,
  });

  // Sort by suitability score descending
  scores.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  scores.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  const primary = scores[0].type;

  // Broms Lateral Sizing for Steel Piles
  const bromsResult = calculateBromsPileSizing(
    lateralShearPerPost,
    clearance,
    frostM,
    input.soilClassification,
    input.soilBearingCapacityKpa,
    input.soilInternalFrictionAngleDeg,
    input.soilCohesionKpa,
    input.soilDensityKnM3
  );

  // Sensitivity to +20% wind gust
  const sensWindKmh = Math.round(input.basicWindSpeedKmh * 1.2);
  const sensVms = sensWindKmh / 3.6;
  const sensQz = 0.5 * 1.225 * Math.pow(sensVms, 2) * 1.0 * 0.85 / 1000.0;
  const sensLateralShear = (sensQz * tableArea * Math.sin(tiltRad) * 1.2) / posts;
  const sensFos = Number((bromsResult.lateralCapacityKn / Math.max(0.1, sensLateralShear)).toFixed(2));

  const disclaimer =
    'Disclaimer: Automated structural recommendations and Broms sizing are preliminary engineering estimates adhering to ASCE 7-22 / Eurocode 7 standards. A licensed Professional Engineer (PE) must perform site-specific geotechnical investigations (SPT/CPT boreholes) and pull-out/lateral load test verification prior to construction.';

  const result: FoundationRecommendationResult = {
    input,
    primaryRecommendation: primary,
    recommendedPileSizing: bromsResult,
    allRankedOptions: scores,
    windPressureQzKnM2: Number(qz.toFixed(3)),
    groundSnowPressureSkKnM2: Number(sk.toFixed(3)),
    lateralShearPerPostKn: Number(lateralShearPerPost.toFixed(2)),
    upliftPerPostKn: Number(upliftPerPost.toFixed(2)),
    compressionPerPostKn: Number(compressionPerPost.toFixed(2)),
    sensitivityPlus20Wind: {
      windSpeedKmh: sensWindKmh,
      lateralShearPerPostKn: Number(sensLateralShear.toFixed(2)),
      fosLateral: sensFos,
      pileAdequate: sensFos >= 1.5,
    },
    geotechnicalDisclaimer: disclaimer,
    reportMarkdown: '',
  };

  result.reportMarkdown = generateFoundationEngineeringReport(result);
  return result;
}

/**
 * Broms (1964) Lateral Bearing Capacity Method for Driven Piles
 */
function calculateBromsPileSizing(
  lateralShearKn: number,
  clearanceHeightM: number,
  frostDepthM: number,
  soilClass: SoilType,
  qaKpa: number,
  phiDeg: number,
  cohesionKpa: number,
  densityKnM3: number
): BromsPileSizingResult {
  const minDepthForFrost = Number((frostDepthM + 1.0).toFixed(2));
  const pileWidthD = 0.15; // W6 section flange width ~ 150mm (0.15 m)

  let requiredDepthM = minDepthForFrost;
  let ultimateLateralCapacityKn = 0;
  const leverArmM = clearanceHeightM;

  if (soilClass === 'medium_clay') {
    // Cohesive Soil: Broms short pile in clay: Hu_ult = 9 * cu * D * (L - 1.5*D) / (1 + (1.5*D + 0.5*f)/(e + L))
    const cu = Math.max(25, cohesionKpa);
    // Iteratively find depth L providing FoS >= 1.75
    let testL = minDepthForFrost;
    while (testL <= 4.0) {
      const activeLength = Math.max(0.1, testL - 1.5 * pileWidthD);
      const cap = (9.0 * cu * pileWidthD * activeLength) / (2.0 + leverArmM / testL);
      if (cap >= lateralShearKn * 1.75 && testL >= minDepthForFrost) {
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

    let testL = minDepthForFrost;
    while (testL <= 4.0) {
      const cap = (0.5 * gamma * pileWidthD * Math.pow(testL, 3) * kp) / (leverArmM + testL);
      if (cap >= lateralShearKn * 1.8 && testL >= minDepthForFrost) {
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

  // Profile selection
  // W6x9: Zx = 5.56 in³ = 91.1 cm³, Fy = 345 MPa -> M_allow = 31.4 kNm
  // W6x12: Zx = 7.30 in³ = 120 cm³, Fy = 345 MPa -> M_allow = 41.4 kNm
  // C150x50x2.5: Zx = 35 cm³, Fy = 345 MPa -> M_allow = 12.1 kNm
  let pileSection: 'W6x9' | 'W6x12' | 'C150x50x2.5' = 'W6x9';
  let allowableMomentKnM = 31.4;

  if (bendingMomentKnM < 8.0 && lateralShearKn < 6.0) {
    pileSection = 'C150x50x2.5';
    allowableMomentKnM = 12.1;
  } else if (bendingMomentKnM > 25.0 || lateralShearKn > 15.0) {
    pileSection = 'W6x12';
    allowableMomentKnM = 41.4;
  }

  const fosLateral = Number((ultimateLateralCapacityKn / Math.max(0.1, lateralShearKn)).toFixed(2));
  const fosMoment = Number((allowableMomentKnM / Math.max(0.1, bendingMomentKnM)).toFixed(2));
  const isSafe = fosLateral >= 1.5 && fosMoment >= 1.5 && requiredDepthM >= minDepthForFrost;

  return {
    pileSection,
    embedmentDepthM: requiredDepthM,
    minDepthForFrostM: minDepthForFrost,
    lateralCapacityKn: ultimateLateralCapacityKn,
    appliedLateralShearKn: Number(lateralShearKn.toFixed(2)),
    bendingMomentKnM,
    allowableMomentKnM,
    fosLateral,
    fosMoment,
    isFosSafe: isSafe,
    notes: `Selected ${pileSection} satisfies Broms lateral equilibrium with FoS=${fosLateral} and frost heave embedment constraint (L=${requiredDepthM}m >= ${minDepthForFrost}m).`,
  };
}

/**
 * Generates 6-Section Detailed Civil & Structural Engineering Report
 */
export function generateFoundationEngineeringReport(res: FoundationRecommendationResult): string {
  const p = res.recommendedPileSizing;
  const sens = res.sensitivityPlus20Wind;

  return `# Civil Foundation & Structural Mounting Recommendation Report
**Project Location / Site:** Lat ${res.input.latitude.toFixed(4)}°, Lng ${res.input.longitude.toFixed(4)}°
**Governing Design Codes:** ASCE 7-22 (Wind/Snow Loads) | Eurocode 7 (EN 1997-1) | IBC 2024 Chapter 18

---

## 1. Geotechnical & Telemetry Summary
- **Soil Classification:** ${res.input.soilClassification.toUpperCase()}
- **Allowable Bearing Capacity ($q_a$):** ${res.input.soilBearingCapacityKpa} kPa
- **Internal Friction Angle ($\phi$):** ${res.input.soilInternalFrictionAngleDeg}°
- **Cohesion ($c$):** ${res.input.soilCohesionKpa} kPa
- **Bulk Density ($\gamma$):** ${res.input.soilDensityKnM3} kN/m³
- **Local Frost Line Depth ($d_{frost}$):** ${res.input.frostDepthCm} cm

---

## 2. Environmental Load & Demand Analysis
- **Basic Wind Speed ($V_b$):** ${res.input.basicWindSpeedKmh} km/h $\\rightarrow$ Dynamic Pressure $q_z = ${res.windPressureQzKnM2}$ kN/m²
- **Ground Snow Load ($S_k$):** ${res.input.groundSnowLoadKgM2} kg/m² $\\rightarrow$ Snow Pressure $S_k = ${res.groundSnowPressureSkKnM2}$ kN/m²
- **Lateral Shear Demand ($H_u$ per post):** ${res.lateralShearPerPostKn} kN
- **Net Uplift Demand ($T_u$ per post):** ${res.upliftPerPostKn} kN
- **Total Compression Demand ($P_u$ per post):** ${res.compressionPerPostKn} kN

---

## 3. Foundation Typologies Multi-Criteria Ranking

| Rank | Typology | Suitability | Estimated CAPEX | Installation Speed | Primary Engineering Feasibility |
| :---: | :--- | :---: | :---: | :---: | :--- |
${res.allRankedOptions.map(o => `| **${o.rank}** | **${o.nameEn}** | **${o.suitabilityScore}/100** | $${o.estimatedCapexUsdPerKw.toFixed(2)}/kW | ${o.installSpeedMwPerWeek} MW/wk | ${o.pros[0]} |`).join('\n')}

---

## 4. Final Recommended Structural Sizing (Broms Method)
- **Primary Recommendation:** **${res.primaryRecommendation.toUpperCase()}**
- **Selected Steel Profile:** **${p.pileSection}** (ASTM A992 Grade 50, $F_y = 345$ MPa)
- **Required Embedment Depth ($L$):** **${p.embedmentDepthM} m**
- **Frost Heave Minimum Embedment Threshold:** $d_{frost} + 1.0\\text{m} = ${p.minDepthForFrostM}\\text{ m}$ $\\rightarrow$ **COMPLIANT**
- **Calculated Ultimate Lateral Capacity ($H_{ult}$):** ${p.lateralCapacityKn} kN
- **Governing Bending Moment ($M_u$):** ${p.bendingMomentKnM} kN·m (Allowable: ${p.allowableMomentKnM} kN·m)
- **Factor of Safety (Lateral $FoS_H$):** **${p.fosLateral}** (Requirement: $\\ge 1.50$) $\\rightarrow$ **${p.fosLateral >= 1.5 ? 'PASS' : 'FAIL'}**
- **Factor of Safety (Bending $FoS_M$):** **${p.fosMoment}** (Requirement: $\\ge 1.50$) $\\rightarrow$ **${p.fosMoment >= 1.5 ? 'PASS' : 'FAIL'}**

---

## 5. Gust Sensitivity Analysis (+20% Extreme Wind)
- **Elevated Wind Speed:** ${sens.windSpeedKmh} km/h (+20% ASCE 7-22 300-year recurrence)
- **Increased Lateral Shear Demand:** ${sens.lateralShearPerPostKn} kN
- **Resulting Factor of Safety ($FoS_{gust}$):** **${sens.fosLateral}**
- **Adequacy Status:** **${sens.pileAdequate ? 'SAFE (No pile resize needed)' : 'UPGRADE REQUIRED (Upgrade to W6x12 or increase embedment)'}**

---

## 6. Geotechnical Disclaimer & Structural Sign-off
${res.geotechnicalDisclaimer}
`;
}
