/**
 * Pure-data climate/geotechnical types.
 *
 * Extracted from `src/engine/climaticData.ts` to break the ESM circular
 * dependency between `climaticData` and `dataGateway/*`.
 *
 * This file MUST have ZERO imports (leaf module). Any future addition
 * must respect that constraint or the cycle returns.
 */

export type SoilClassification =
  | 'dense_sand_gravel'
  | 'medium_clay'
  | 'loose_sand'
  | 'rocky_limestone';

export interface ClimateCity {
  id: string;
  nameFa: string;
  nameEn: string;
  provinceFa: string;
  provinceEn: string;
  latitude: number;
  longitude: number;
  elevationM: number;
  peakSunHours: number; // PSH (kWh/m²/day)
  tempMinC: number;     // Extreme design minimum ambient temp
  tempMaxC: number;     // Extreme design maximum ambient temp
  albedo: number;       // Ground reflection coefficient
  soilingLossPct: number; // Expected dust/soiling loss percentage
  optimalTiltAnnualDeg: number;
  optimalTiltWinterDeg: number;
  optimalTiltSummerDeg: number;
  descriptionFa: string;
  descriptionEn: string;

  // Geotechnical & Structural Load Parameters (ASCE 7-22 / Eurocode 7 / INBC 6)
  basicWindSpeedKmh: number;         // Basic 3-sec gust wind speed (km/h)
  groundSnowLoadKgM2: number;        // Ground snow load S_k (kg/m²)
  annualRainfallMm: number;          // Annual precipitation (mm/year)
  soilType: SoilClassification;      // Soil geotechnical category
  soilBearingCapacityKpa: number;    // Allowable soil bearing capacity q_a (kPa / kN/m²)
  soilInternalFrictionAngleDeg: number; // Angle of internal friction phi (deg)
  soilCohesionKpa: number;           // Cohesion c (kPa)
  soilDensityKnM3: number;           // Soil unit weight gamma (kN/m³)
  frostDepthCm: number;              // Seasonal frost penetration depth (cm)
  seismicZoneCoefficientA: number;   // Design base acceleration A
  dataSourceFa: string;              // Official source provenance
  dataSourceEn: string;              // Official source provenance in English
  dataRetrievalDate?: string;         // Date retrieved
  confidence?: 'measured' | 'hub_calibrated' | 'analytical_estimate'; // Data confidence grade
}

export interface SiteGeotechnicalOverrides {
  basicWindSpeedKmh?: number;
  groundSnowLoadKgM2?: number;
  annualRainfallMm?: number;
  soilType?: SoilClassification;
  soilBearingCapacityKpa?: number;
  soilInternalFrictionAngleDeg?: number;
  soilCohesionKpa?: number;
  soilDensityKnM3?: number;
  frostDepthCm?: number;
  seismicZoneCoefficientA?: number;
  customNotes?: string;
}
