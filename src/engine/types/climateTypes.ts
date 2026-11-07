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

export type SiteDrainageCondition = 'well_drained' | 'moderate' | 'poor_flood_prone';

export type InstallationEnvironment =
  | 'ground_mount'             // نیروگاه زمینی / زمین باز
  | 'industrial_shed'          // سقف سوله صنعتی (ورق ذوزنقه‌ای / ساندویچ پانل / Standing Seam)
  | 'rooftop_flat_concrete';   // پشت‌بام بتنی مسطح ساختمان

export type ProvenanceSourceKind =
  | 'provider_value'
  | 'provider_derived'
  | 'local_model'
  | 'user_input'
  | 'default_unverified'
  | 'unavailable';

export interface ParameterProvenance {
  sourceKind: ProvenanceSourceKind;
  providerName: string;
  sourceDataset?: string;
  sourceParameter?: string;
  endpointOrVersion?: string;
  retrievedAt: string;
  derivationMethod?: string;
  qualityNote?: string;
  unit?: string;
  value?: number | string | null;
}

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
  daylightHoursDesign: number; // Design astronomical daylight duration (hours) at winter solstice
  nightHoursDesign: number;    // Design night duration (hours) = 24.0 - daylightHoursDesign
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
  distanceToCoastKm?: number;        // Geodesic distance to nearest sea/coast (km)
  drainageCondition?: SiteDrainageCondition; // Site hydrology drainage classification
  groundwaterDepthM?: number;        // Depth to groundwater table GWL (m)
  fieldProvenance?: Record<string, ParameterProvenance>; // Strict per-field provenance mapping (ENV-01)
}

/**
 * Calculates design daylight hours (and complementary night hours = 24 - daylight)
 * from solar geometry (latitude and solar declination at winter solstice of the site's hemisphere).
 *
 * Design Day = Winter Solstice:
 * - Northern hemisphere (lat >= 0): declination = -23.45° (approx Dec 21, shortest daylight)
 * - Southern hemisphere (lat < 0):  declination = +23.45° (approx Jun 21, shortest daylight)
 *
 * Sunset hour angle equation (NREL SPA / Cooper equation):
 *   cos(omega_s) = -tan(phi) * tan(delta)
 *   Daylight hours D = (24 / pi) * omega_s
 *   Night hours N    = 24.0 - D
 *
 * NOTE: PSH (Peak Sun Hours, kWh/m²/day) is solar irradiance energy density, NOT wall-clock hours.
 * daylightHoursDesign is the physical astronomical sunlight window.
 */
export function calculateDesignDaylightHours(latitudeDeg: number): {
  daylightHoursDesign: number;
  nightHoursDesign: number;
} {
  const lat = Math.max(-90, Math.min(90, Number(latitudeDeg) || 0));
  // At winter solstice of the hemisphere, declination has opposite sign to latitude
  const declinationDeg = lat >= 0 ? -23.45 : 23.45;
  const latRad = (lat * Math.PI) / 180.0;
  const declRad = (declinationDeg * Math.PI) / 180.0;

  const cosOmega = -Math.tan(latRad) * Math.tan(declRad);

  let daylightHours: number;
  if (cosOmega >= 1.0) {
    // Polar night: sun does not rise
    daylightHours = 0.0;
  } else if (cosOmega <= -1.0) {
    // Midnight sun: sun does not set
    daylightHours = 24.0;
  } else {
    const omegaSRad = Math.acos(cosOmega);
    daylightHours = (24.0 / Math.PI) * omegaSRad;
  }

  // Round to 2 decimal places with strict complement sum = 24.0
  const safeDaylight = Number(Math.max(0, Math.min(24, daylightHours)).toFixed(2));
  const safeNight = Number((24.0 - safeDaylight).toFixed(2));

  return {
    daylightHoursDesign: safeDaylight,
    nightHoursDesign: safeNight,
  };
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
  distanceToCoastKm?: number;
  drainageCondition?: SiteDrainageCondition;
  groundwaterDepthM?: number;
  foundationType?: string;
  installationEnvironment?: InstallationEnvironment;
  customEmbedmentDepthM?: number;
  customPostsPerTable?: number;
  groundClearanceM?: number;
  arrayTiltDeg?: number;
  customNotes?: string;
}
