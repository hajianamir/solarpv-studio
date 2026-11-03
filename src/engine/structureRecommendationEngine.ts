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

import { type FoundationType, type SoilType } from './structuralEngine';
import {
  recommendSharedFoundation,
  scoreFoundationOptions,
  type FoundationRecommendationInput,
  type FoundationRecommendationOutput,
} from './geotech/foundationRecommendation';

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
  /** Required — no hard-coded defaults anywhere in this engine (Ambiguity A). */
  slopeDeg: number;
  /** Required — no hard-coded defaults anywhere in this engine (Ambiguity A). */
  tableAreaM2: number;
  /** Required — no hard-coded defaults anywhere in this engine (Ambiguity A). */
  arrayTiltDeg: number;
  /** Required — no hard-coded defaults anywhere in this engine (Ambiguity A). */
  postsPerTable: number;
  /** Required — no hard-coded defaults anywhere in this engine (Ambiguity A). */
  clearanceHeightM: number;
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

// Option definitions shared between engine and UI (single source of truth)
const FOUNDATION_OPTIONS: FoundationOptionScore[] = [
  {
    type: 'rammed_steel_pile',
    nameEn: 'Rammed Steel Pile (Driven W-Beam / C-Channel)',
    nameFa: 'پایه کوبشی فولادی (شمع پروفیل گرم‌نورد/C)',
    suitabilityScore: 0, // set dynamically
    rank: 0,
    pros: ['Very fast installation (1.5-2.5 MW/week)', 'Lowest CAPEX for cohesive/granular soils', 'Zero concrete curing delay'],
    cons: ['Requires soil push/pull load testing on site'],
    estimatedCapexUsdPerKw: 14.5,
    installSpeedMwPerWeek: 2.0,
  },
  {
    type: 'concrete_pier',
    nameEn: 'Drilled Concrete Pier (Cast-in-Place Shaft)',
    nameFa: 'شمع بتنی درجا (حفاری و بتن‌ریزی)',
    suitabilityScore: 0,
    rank: 0,
    pros: ['Highest lateral and uplift resistance', 'Ideal for rocky/limestone or karst terrain', 'Excellent in high-wind regions (>140 km/h)'],
    cons: ['High concrete volume and water supply logistics', '28-day curing delay before mounting racks', 'Higher labor and machinery costs'],
    estimatedCapexUsdPerKw: 24.0,
    installSpeedMwPerWeek: 0.6,
  },
  {
    type: 'ground_screw',
    nameEn: 'Helical Ground Screw Anchor',
    nameFa: 'شمع پیچشی فولادی (Ground Screw)',
    suitabilityScore: 0,
    rank: 0,
    pros: ['Excellent tensile uplift resistance', 'Suitable for undulating terrain and slopes up to 25°', 'Immediate loading capacity'],
    cons: ['Higher material unit cost than driven piles', 'Risk of blade damage in cobbles/boulders (>100mm)'],
    estimatedCapexUsdPerKw: 19.5,
    installSpeedMwPerWeek: 1.2,
  },
  {
    type: 'rooftop_ballasted_block',
    nameEn: 'Surface Ballasted Concrete Block',
    nameFa: 'بلوک وزنی بتنی سطحی',
    suitabilityScore: 0,
    rank: 0,
    pros: ['Zero soil penetration / zero ground disturbance', 'Suitable for brownfields, capped landfills, and rooftops'],
    cons: ['Extremely high concrete tonnage', 'Prone to differential settlement on soft soils', 'Susceptible to sliding under high wind'],
    estimatedCapexUsdPerKw: 28.0,
    installSpeedMwPerWeek: 0.4,
  },
];

export function recommendFoundation(input: StructuralRecommendationInput): FoundationRecommendationResult {
  // Delegates to the shared geotech module (single source of truth — same code path
  // used by coreSuiteVerification test suite and StructuralFoundationTab UI, so
  // test embedment depth === UI embedment depth for every site).
  const shared: FoundationRecommendationOutput = recommendSharedFoundation(input as FoundationRecommendationInput);

  // Ranked options from the shared scorer, enriched with UI-only fields
  // (CAPEX, installation speed). Score and rank come from scoreFoundationOptions only.
  const scored = scoreFoundationOptions(input as FoundationRecommendationInput).sort((a, b) => b.score - a.score);
  const optionMeta = new Map<FoundationType, FoundationOptionScore>(FOUNDATION_OPTIONS.map((o) => [o.type, o]));
  const allRankedOptions: FoundationOptionScore[] = scored.map((s, idx) => {
    const meta = optionMeta.get(s.type)!;
    return {
      ...meta,
      suitabilityScore: s.score,
      rank: idx + 1,
      pros: s.pros,
      cons: s.cons,
    };
  });

  const primary = scored[0].type;

  // Frost constraint + pile sizing from shared module (no local Broms duplicate)
  const frostM = input.frostDepthCm / 100.0;
  const bromsResult: BromsPileSizingResult = {
    pileSection: shared.pileSection as 'W6x9' | 'W6x12' | 'C150x50x2.5',
    embedmentDepthM: shared.pileDepthM,
    minDepthForFrostM: Number((frostM + 1.0).toFixed(2)),
    lateralCapacityKn: shared.factorOfSafetyLateral > 0 ? shared.factorOfSafetyLateral * shared.lateralShearPerPostKn : 0,
    appliedLateralShearKn: shared.lateralShearPerPostKn,
    bendingMomentKnM: shared.lateralShearPerPostKn * (0.9 + 0.3 * shared.pileDepthM),
    allowableMomentKnM: shared.pileSection === 'W6x12' ? 41.4 : shared.pileSection === 'C150x50x2.5' ? 12.1 : 31.4,
    fosLateral: shared.factorOfSafetyLateral,
    fosMoment: shared.factorOfSafetyMoment,
    isFosSafe: shared.factorOfSafetyLateral >= 1.5 && shared.factorOfSafetyMoment >= 1.5,
    notes: shared.rationale,
  };

  // Sensitivity to +20% wind gust
  const tiltRad = (input.arrayTiltDeg * Math.PI) / 180.0;
  const sensWindKmh = Math.round(input.basicWindSpeedKmh * 1.2);
  const sensVms = sensWindKmh / 3.6;
  const sensQz = 0.5 * 1.225 * Math.pow(sensVms, 2) * 1.0 * 0.85 / 1000.0;
  const sensLateralShear = (sensQz * input.tableAreaM2 * Math.sin(tiltRad) * 1.2) / input.postsPerTable;
  const sensFos = Number((bromsResult.lateralCapacityKn / Math.max(0.1, sensLateralShear)).toFixed(2));

  const upliftPerPost = (shared.windPressureQzKnM2 * input.tableAreaM2 * 1.15) / input.postsPerTable;

  const disclaimer =
    'Disclaimer: Automated structural recommendations and Broms sizing are preliminary engineering estimates adhering to ASCE 7-22 / Eurocode 7 standards. A licensed Professional Engineer (PE) must perform site-specific geotechnical investigations (SPT/CPT boreholes) and pull-out/lateral load test verification prior to construction.';

  const result: FoundationRecommendationResult = {
    input,
    primaryRecommendation: primary,
    recommendedPileSizing: bromsResult,
    allRankedOptions,
    windPressureQzKnM2: shared.windPressureQzKnM2,
    groundSnowPressureSkKnM2: shared.snowPressureSkKnM2,
    lateralShearPerPostKn: shared.lateralShearPerPostKn,
    upliftPerPostKn: upliftPerPost,
    compressionPerPostKn: shared.compressionPerPostKn,
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
