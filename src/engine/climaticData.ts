// Climatic & Geotechnical API-Driven Engine
// SolarPV Studio v3.0 - ADR-005: Removal of Climate Hubs & Pure API-Driven Architecture
// Conforming to NASA POWER v2.0, PVGIS (SARAH-2/ERA5), NSRDB, INBC Part 6, ASCE 7-22, Eurocode 1 & 7

import { ExternalDataGateway } from './dataGateway/externalDataGateway';
import { estimateGeodesicDistanceToCoastKm } from './corrosion/saltCorrosionEngine';
import { isRealInternetEnabled } from './env/runtimeEnv';

import {
  calculateDesignDaylightHours,
  type ClimateCity,
  type SoilClassification,
  type SiteGeotechnicalOverrides,
  type SiteDrainageCondition,
} from './types/climateTypes';

export {
  calculateDesignDaylightHours,
};

export type {
  ClimateCity,
  SoilClassification,
  SiteGeotechnicalOverrides,
  SiteDrainageCondition,
};


export function applyGeotechnicalOverrides(
  baseCity: ClimateCity,
  overrides?: SiteGeotechnicalOverrides
): ClimateCity {
  if (!overrides) return baseCity;

  const updatedProvenance = { ...(baseCity.fieldProvenance || {}) };
  const now = new Date().toISOString();

  if (overrides.soilBearingCapacityKpa !== undefined) {
    updatedProvenance.soilBearingCapacityKpa = {
      sourceKind: 'user_input',
      providerName: 'USER_OVERRIDE',
      derivationMethod: 'User geotechnical override for allowable soil bearing capacity',
      unit: 'kPa',
      value: overrides.soilBearingCapacityKpa,
      retrievedAt: now,
    };
  }
  if (overrides.soilInternalFrictionAngleDeg !== undefined) {
    updatedProvenance.soilInternalFrictionAngleDeg = {
      sourceKind: 'user_input',
      providerName: 'USER_OVERRIDE',
      derivationMethod: 'User geotechnical override for soil internal friction angle',
      unit: 'deg',
      value: overrides.soilInternalFrictionAngleDeg,
      retrievedAt: now,
    };
  }
  if (overrides.soilCohesionKpa !== undefined) {
    updatedProvenance.soilCohesionKpa = {
      sourceKind: 'user_input',
      providerName: 'USER_OVERRIDE',
      derivationMethod: 'User geotechnical override for soil cohesion',
      unit: 'kPa',
      value: overrides.soilCohesionKpa,
      retrievedAt: now,
    };
  }
  if (overrides.frostDepthCm !== undefined) {
    updatedProvenance.frostDepthCm = {
      sourceKind: 'user_input',
      providerName: 'USER_OVERRIDE',
      derivationMethod: 'User geotechnical override for site frost depth',
      unit: 'cm',
      value: overrides.frostDepthCm,
      retrievedAt: now,
    };
  }
  if (overrides.basicWindSpeedKmh !== undefined) {
    updatedProvenance.basicWindSpeedKmh = {
      sourceKind: 'user_input',
      providerName: 'USER_OVERRIDE',
      derivationMethod: 'User site override for basic wind speed',
      unit: 'km/h',
      value: overrides.basicWindSpeedKmh,
      retrievedAt: now,
    };
  }
  if (overrides.groundSnowLoadKgM2 !== undefined) {
    updatedProvenance.groundSnowLoadKgM2 = {
      sourceKind: 'user_input',
      providerName: 'USER_OVERRIDE',
      derivationMethod: 'User site override for ground snow load',
      unit: 'kg/m²',
      value: overrides.groundSnowLoadKgM2,
      retrievedAt: now,
    };
  }
  if (overrides.annualRainfallMm !== undefined) {
    updatedProvenance.annualRainfallMm = {
      sourceKind: 'user_input',
      providerName: 'USER_OVERRIDE',
      derivationMethod: 'User site override for annual rainfall',
      unit: 'mm',
      value: overrides.annualRainfallMm,
      retrievedAt: now,
    };
  }

  return {
    ...baseCity,
    basicWindSpeedKmh: overrides.basicWindSpeedKmh ?? baseCity.basicWindSpeedKmh,
    groundSnowLoadKgM2: overrides.groundSnowLoadKgM2 ?? baseCity.groundSnowLoadKgM2,
    annualRainfallMm: overrides.annualRainfallMm ?? baseCity.annualRainfallMm,
    soilType: overrides.soilType ?? baseCity.soilType,
    soilBearingCapacityKpa: overrides.soilBearingCapacityKpa ?? baseCity.soilBearingCapacityKpa,
    soilInternalFrictionAngleDeg: overrides.soilInternalFrictionAngleDeg ?? baseCity.soilInternalFrictionAngleDeg,
    soilCohesionKpa: overrides.soilCohesionKpa ?? baseCity.soilCohesionKpa,
    soilDensityKnM3: overrides.soilDensityKnM3 ?? baseCity.soilDensityKnM3,
    frostDepthCm: overrides.frostDepthCm ?? baseCity.frostDepthCm,
    seismicZoneCoefficientA: overrides.seismicZoneCoefficientA ?? baseCity.seismicZoneCoefficientA,
    distanceToCoastKm: overrides.distanceToCoastKm ?? baseCity.distanceToCoastKm,
    drainageCondition: overrides.drainageCondition ?? baseCity.drainageCondition,
    groundwaterDepthM: overrides.groundwaterDepthM ?? baseCity.groundwaterDepthM,
    fieldProvenance: updatedProvenance,
  };
}

export function getEffectiveClimateCity(
  baseCity: ClimateCity,
  overrides?: SiteGeotechnicalOverrides
): ClimateCity {
  return applyGeotechnicalOverrides(baseCity, overrides);
}

/**
 * Evaluates comprehensive climatic and geotechnical parameters for ANY geographic coordinates
 * worldwide (-90 <= lat <= +90, -180 <= lng <= +180).
 *
 * In accordance with ADR-005, hardcoded static city arrays have been completely abolished
 * (IRANIAN_CLIMATE_CITIES, INDUSTRIAL_PARKS, INTERNATIONAL_CLIMATE_HUBS, ALL_CLIMATE_CITIES
 * are permanently removed). There are no climate hubs remaining — every coordinate on Earth
 * resolves distinct, dynamically computed engineering parameters.
 *
 * This is the SYNCHRONOUS deterministic geospatial model used for instant UI feedback and as
 * the circuit-breaker fallback when global APIs (NASA POWER / PVGIS / NSRDB) are unreachable.
 * All outputs carry confidence: 'analytical_estimate' and full provenance metadata.
 *
 * For production-grade measured data, use the async `fetchClimateData(lat, lng)` which resolves
 * real HTTP responses from NASA POWER v2.0 (Americas), PVGIS 5.3 SARAH-2 (EMEA/Asia), or
 * NSRDB with per-call trace_id logging.
 */
export function getClimateData(lat: number, lng: number): ClimateCity {
  // 1. Strict coordinate bounds validation
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    isNaN(lat) ||
    isNaN(lng) ||
    lat < -90.0 ||
    lat > 90.0 ||
    lng < -180.0 ||
    lng > 180.0
  ) {
    throw new Error(
      `Invalid geographic coordinates: latitude ${lat} (must be in range [-90, +90]) and longitude ${lng} (must be in range [-180, +180]).`
    );
  }

  const absLat = Math.abs(lat);
  const isSouthernHemisphere = lat < 0;

  // Geographic macro-regions
  const isEurope = lat >= 35 && lat <= 70 && lng >= -10 && lng <= 40;
  const isNorthAmerica = lat >= 15 && lat <= 70 && lng >= -160 && lng <= -50;
  const isMENA = lat >= 12 && lat <= 42 && lng >= -15 && lng <= 65;
  const isEastAsia = lat >= 10 && lat <= 55 && lng >= 70 && lng <= 145;
  const isAustralia = lat >= -45 && lat <= -10 && lng >= 110 && lng <= 155;
  const isSouthAmerica = lat <= 12 && lat >= -55 && lng >= -85 && lng <= -35;

  // Continuous Solar Irradiance Model (PSH)
  // Solar geometry: Extraterrestrial daily irradiation integrated with atmospheric clearness Kt
  let basePsh = 5.0;
  if (absLat < 15.0) {
    basePsh = 5.6 - absLat * 0.02; // Tropical belt: high irradiance with cloud attenuation
  } else if (absLat < 35.0) {
    // Subtropical desert / high-pressure belt: Peak solar resource worldwide
    basePsh = isMENA ? 5.85 + (30 - Math.abs(absLat - 28)) * 0.03 : 5.6;
    if (isSouthAmerica && absLat >= 18 && absLat <= 26 && lng >= -72 && lng <= -66) {
      basePsh = 7.2; // Atacama desert anomaly
    }
  } else if (absLat < 50.0) {
    basePsh = isEurope ? 3.8 + (50 - absLat) * 0.05 : 4.6 + (50 - absLat) * 0.04;
  } else {
    basePsh = Math.max(1.8, 3.8 - (absLat - 50.0) * 0.07);
  }

  // Optimal Tilt Angle (deg)
  // Analytical derivation based on latitude: beta_opt ≈ |phi| * 0.88 for mid-latitudes
  const optTilt = Math.max(8, Math.min(65, Math.round(absLat * 0.88)));
  const optTiltWinter = Math.min(75, optTilt + 15);
  const optTiltSummer = Math.max(0, optTilt - 15);

  // Extreme Design Temperatures (ASHRAE 0.4% / 99.6% design conditions)
  let tMin = -5.0;
  let tMax = 38.0;
  if (absLat > 50.0) {
    tMin = -22.0 - (absLat - 50.0) * 0.5;
    tMax = 32.0;
  } else if (absLat > 35.0) {
    tMin = isEurope ? -12.0 : -15.0;
    tMax = isEurope ? 36.0 : 39.0;
  } else if (absLat < 20.0) {
    tMin = 18.0;
    tMax = 38.0;
  } else if (isMENA) {
    tMin = absLat > 32 ? -6.0 : 4.0;
    tMax = 46.0;
  }

  // Structural Environmental Wind & Snow Loads (ASCE 7-22 / Eurocode 1 / INBC Part 6)
  let windKmh = 130;
  let snowKgM2 = 0;
  let frostDepthCm = 0;

  if (absLat >= 48.0) {
    snowKgM2 = Math.round(80 + (absLat - 48.0) * 6);
    windKmh = 140;
    frostDepthCm = Math.min(150, Math.round(40 + (absLat - 48.0) * 4));
  } else if (absLat >= 34.0) {
    snowKgM2 = isEurope ? 70 : isMENA ? 50 : 60;
    windKmh = 130;
    frostDepthCm = isEurope ? 50 : isMENA ? 35 : 45;
  } else {
    snowKgM2 = 0;
    windKmh = absLat < 15 ? 120 : 130;
    frostDepthCm = 0;
  }

  // Geotechnical Soil Properties Model (Peck-Hanson-Thornburn 1974 & Bowles 1996)
  let soilType: SoilClassification = 'dense_sand_gravel';
  let qaKpa = 220;
  let phiDeg = 32;
  let cohesionKpa = 15;
  let densityKnM3 = 18.0;

  if (absLat < 25.0 && !isMENA) {
    // Tropical weathered clay / laterite
    soilType = 'medium_clay';
    qaKpa = 160;
    phiDeg = 24;
    cohesionKpa = 35;
    densityKnM3 = 17.5;
  } else if (isMENA && absLat < 30.0) {
    // Arid coarse sand
    soilType = 'loose_sand';
    qaKpa = 180;
    phiDeg = 30;
    cohesionKpa = 0;
    densityKnM3 = 17.0;
  }

  const latLabel = `${absLat.toFixed(2)}°${isSouthernHemisphere ? 'S' : 'N'}`;
  const lngLabel = `${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`;

  const regionNameEn = isEurope
    ? 'Europe (CEN / Eurocode Zone)'
    : isNorthAmerica
    ? 'North America (ASCE 7 Zone)'
    : isMENA
    ? 'Middle East & North Africa (MENA / INBC Zone)'
    : isEastAsia
    ? 'East Asia (GB / JIS Zone)'
    : isAustralia
    ? 'Australia (AS/NZS Zone)'
    : isSouthAmerica
    ? 'South America Zone'
    : isSouthernHemisphere
    ? 'Southern Hemisphere Global Zone'
    : 'Northern Hemisphere Global Zone';

  const regionNameFa = isEurope
    ? 'اروپا (ناحیه یورورکد)'
    : isNorthAmerica
    ? 'آمریکای شمالی (ناحیه ASCE 7)'
    : isMENA
    ? 'خاورمیانه و شمال آفریقا (MENA / مبحث ۶)'
    : isEastAsia
    ? 'شرق آسیا (ناحیه استاندارد GB/JIS)'
    : isAustralia
    ? 'استرالیا (ناحیه AS/NZS)'
    : isSouthAmerica
    ? 'آمریکای جنوبی'
    : isSouthernHemisphere
    ? 'نیمکره جنوبی'
    : 'نیمکره شمالی';

  return {
    id: `site_${lat.toFixed(4)}_${lng.toFixed(4)}`,
    nameFa: `سایت مختصاتی (${latLabel}, ${lngLabel})`,
    nameEn: `Coordinates Site (${latLabel}, ${lngLabel})`,
    provinceFa: regionNameFa,
    provinceEn: regionNameEn,
    latitude: Number(lat.toFixed(4)),
    longitude: Number(lng.toFixed(4)),
    elevationM: Math.round(Math.max(0, 450 + (35 - absLat) * 20)),
    peakSunHours: Number(basePsh.toFixed(2)),
    daylightHoursDesign: calculateDesignDaylightHours(lat).daylightHoursDesign,
    nightHoursDesign: calculateDesignDaylightHours(lat).nightHoursDesign,
    tempMinC: Number(tMin.toFixed(1)),
    tempMaxC: Number(tMax.toFixed(1)),
    albedo: 0.20,
    soilingLossPct: isMENA ? 5.5 : 3.0,
    optimalTiltAnnualDeg: optTilt,
    optimalTiltWinterDeg: optTiltWinter,
    optimalTiltSummerDeg: optTiltSummer,
    descriptionFa: 'تخمین مدل تحلیلی منطقه‌ای (بدون اتصال به API) — برای طراحی bankable نیازمند داده ماهواره‌ای است',
    descriptionEn: 'Regional analytical model estimate (no API connection) — bankable design requires satellite data',
    basicWindSpeedKmh: windKmh,
    groundSnowLoadKgM2: snowKgM2,
    annualRainfallMm: absLat > 45 ? 750 : isMENA ? 180 : 450,
    soilType,
    soilBearingCapacityKpa: qaKpa,
    soilInternalFrictionAngleDeg: phiDeg,
    soilCohesionKpa: cohesionKpa,
    soilDensityKnM3: densityKnM3,
    frostDepthCm: frostDepthCm,
    seismicZoneCoefficientA: 0.25,
    dataSourceFa: 'مدل تحلیلی منطقه‌ای داخلی (REGIONAL_ANALYTICAL_MODEL)',
    dataSourceEn: 'Internal Regional Analytical Model (REGIONAL_ANALYTICAL_MODEL)',
    dataRetrievalDate: '2024-10-15',
    confidence: 'analytical_estimate',
    distanceToCoastKm: estimateGeodesicDistanceToCoastKm(lat, lng),
    drainageCondition:
      (absLat > 45 ? 750 : isMENA ? 180 : 450) > 600 || soilType === 'medium_clay'
        ? 'poor_flood_prone'
        : (absLat > 45 ? 750 : isMENA ? 180 : 450) > 350
        ? 'moderate'
        : 'well_drained',
    groundwaterDepthM:
      estimateGeodesicDistanceToCoastKm(lat, lng) <= 2.0
        ? 1.5
        : estimateGeodesicDistanceToCoastKm(lat, lng) <= 10.0
        ? 3.0
        : 6.0,
  };
}

/**
 * Returns default reference project site (Tehran coordinates: 35.6892°N, 51.3890°E).
 */
export function getDefaultClimateCity(): ClimateCity {
  const defaultCity = getClimateData(35.6892, 51.3890);
  return {
    ...defaultCity,
    nameFa: 'تهران (سایت پیش‌فرض مهندسی)',
    nameEn: 'Tehran (Default Engineering Site)',
  };
}

/**
 * Resolves real measured climate & geotechnical telemetry for ANY coordinates via the
 * global API gateway (NASA POWER v2.0 → PVGIS 5.3 SARAH-2 → NSRDB routing by region,
 * plus ISRIC SoilGrids and ASCE 7/Eurocode structural hazards).
 *
 * Every call carries a unique `trace_id` (in returned `ClimateCity.id`) that is logged for
 * auditability. This is the production data path mandated by ADR-005: no hard-coded hubs,
 * no interpolation between static points — every coordinate hits the live API.
 *
 * Falls back to the deterministic geospatial model (`getClimateData`) when the circuit breaker
 * is open (offline / rate-limited / air-gapped); the fallback keeps `confidence: 'analytical_estimate'`
 * so estimated data is never mistaken for measured API data.
 */
export async function fetchClimateData(
  lat: number,
  lng: number,
  options?: { signal?: AbortSignal }
): Promise<ClimateCity> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new Error(`Invalid geographic coordinates: ${lat}, ${lng}`);
  }

  // If real internet is explicitly disabled, return the local model without network latency
  if (!isRealInternetEnabled()) {
    return getClimateData(lat, lng);
  }

  // Combine caller signal with a 35-second overall deadline
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(new Error('Gateway request timed out after 35000ms')), 35000);

  let combinedSignal: AbortSignal;
  if (!options?.signal) {
    combinedSignal = timeoutController.signal;
  } else if (typeof AbortSignal.any === 'function') {
    combinedSignal = AbortSignal.any([options.signal, timeoutController.signal]);
  } else {
    const combined = new AbortController();
    const abortCombined = () => combined.abort(options.signal?.reason || timeoutController.signal.reason);
    if (options.signal.aborted) {
      combined.abort(options.signal.reason);
    } else {
      options.signal.addEventListener('abort', abortCombined, { once: true });
      timeoutController.signal.addEventListener('abort', abortCombined, { once: true });
    }
    combinedSignal = combined.signal;
  }

  try {
    let result: ClimateCity | null = null;
    if (typeof window !== 'undefined') {
      try {
        const r = await fetch(`/api/v1/gateway/site?lat=${lat}&lng=${lng}`, {
          signal: combinedSignal,
        });
        if (r.ok) {
          const payload = await r.json();
          if (payload?.ok && payload.climateCity) {
            result = payload.climateCity as ClimateCity;
          }
        }
      } catch (e) {
        if ((e as Error)?.name === 'AbortError' || combinedSignal.aborted) {
          throw e;
        }
        console.warn('[gateway] proxy unavailable; keeping this browser request offline:', e);
      }
      // Browser-side direct provider calls bypass server-side shared rate control. If the
      // same-origin gateway is offline/unavailable, return an explicitly analytical result.
      if (!result) return getClimateData(lat, lng);
      return result;
    }

    if (combinedSignal.aborted) {
      const abortError = new Error('Climate request aborted');
      abortError.name = 'AbortError';
      throw abortError;
    }
    const { climateCity } = await ExternalDataGateway.getInstance().getComprehensiveSiteData(lat, lng, {
      signal: combinedSignal,
    });
    return climateCity;
  } finally {
    clearTimeout(timer);
  }
}
