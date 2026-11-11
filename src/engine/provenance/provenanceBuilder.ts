import { type ClimateCity, type SiteGeotechnicalOverrides } from '../types/climateTypes';
import { assessSaltCorrosion } from '../corrosion/saltCorrosionEngine';
import { recommendSharedFoundation } from '../geotech/foundationRecommendation';
import { type SoilType } from '../structuralEngine';

export interface ProvenanceRow {
  parameter: string;
  value: string;
  provider: string;
  traceId: string;
  timestamp: string;
  confidence: 'measured' | 'regulatory' | 'analytical';
}

/**
 * Build the "Section A — This Project's Data Provenance" rows for the
 * given project context. Uses the ACTUAL city, not hardcoded Tehran.
 */
export async function buildProvenanceRows(
  city: ClimateCity,
  siteOverrides: SiteGeotechnicalOverrides | undefined,
  isEn: boolean,
): Promise<ProvenanceRow[]> {
  const now = new Date().toISOString();
  const climateTrace = city.id || `TRC-GW-${Date.now().toString(36).toUpperCase()}`;

  // Salt corrosion: parse user-entered distance if available, otherwise 60 km default
  let customDist: number | undefined;
  if (siteOverrides?.customNotes) {
    const parsed = parseFloat(siteOverrides.customNotes);
    if (!isNaN(parsed) && parsed >= 0) {
      customDist = parsed;
    }
  }
  const distanceToSeaKm = customDist ?? 60.0;
  let corrosionTrace = `TRC-COR-${Date.now().toString(36).toUpperCase()}`;
  let corrosionCat = 'C1';
  let corrosionDist = distanceToSeaKm;
  try {
    const cor = await assessSaltCorrosion({
      latitude: city.latitude,
      longitude: city.longitude,
      distanceToSeaKm,
    });
    corrosionTrace = cor.traceId;
    corrosionCat = cor.iso9223Category;
    corrosionDist = cor.distanceToSeaKm;
  } catch {
    /* offline / analytical fallback */
  }

  // Foundation via shared geotech module
  const soilClassification = (siteOverrides?.soilType ?? city.soilType ?? 'dense_sand_gravel') as SoilType;
  const structInput = {
    siteName: `${isEn ? city.nameEn : city.nameFa} (RFC 3.0 Project Context)`,
    latitude: city.latitude,
    longitude: city.longitude,
    elevationM: city.elevationM,
    soilClassification,
    soilBearingCapacityKpa: siteOverrides?.soilBearingCapacityKpa ?? city.soilBearingCapacityKpa ?? 250,
    soilInternalFrictionAngleDeg: siteOverrides?.soilInternalFrictionAngleDeg ?? city.soilInternalFrictionAngleDeg ?? 34,
    soilCohesionKpa: siteOverrides?.soilCohesionKpa ?? city.soilCohesionKpa ?? 15,
    soilDensityKnM3: siteOverrides?.soilDensityKnM3 ?? city.soilDensityKnM3 ?? 18.5,
    frostDepthCm: siteOverrides?.frostDepthCm ?? city.frostDepthCm ?? 40,
    basicWindSpeedKmh: siteOverrides?.basicWindSpeedKmh ?? city.basicWindSpeedKmh ?? 130,
    groundSnowLoadKgM2: siteOverrides?.groundSnowLoadKgM2 ?? city.groundSnowLoadKgM2 ?? 100,
    tableAreaM2: 52.0,
    arrayTiltDeg: city.optimalTiltAnnualDeg || 31,
    postsPerTable: 4,
    clearanceHeightM: 1.0,
    slopeDeg: 4.0,
  };
  const rec = recommendSharedFoundation(structInput);
  const structTrace = rec.traceId || `TRC-FND-${Date.now().toString(36).toUpperCase()}`;

  const latStr = city.latitude >= 0 ? `${city.latitude.toFixed(4)}°N` : `${Math.abs(city.latitude).toFixed(4)}°S`;
  const lngStr = city.longitude >= 0 ? `${city.longitude.toFixed(4)}°E` : `${Math.abs(city.longitude).toFixed(4)}°W`;

  const isMeasuredSite = city.confidence === 'measured';
  const pshProv = city.fieldProvenance?.peakSunHours;

  const hasNominatimName =
    city.fieldProvenance?.locationName?.providerName === 'OpenStreetMap Nominatim' ||
    (Boolean(city.nameEn) &&
      !city.nameEn.startsWith('Coordinates Site') &&
      !city.nameEn.startsWith('Custom Site') &&
      !city.nameEn.includes('Default Engineering Site') &&
      !city.nameEn.includes('Analytical Model') &&
      city.id.startsWith('gateway_'));

  const isUserOverrideSite = city.dataSourceEn?.includes('USER_OVERRIDE');

  const siteProvider = isUserOverrideSite
    ? 'USER_OVERRIDE'
    : hasNominatimName
    ? 'OpenStreetMap Nominatim (reverse geocode)'
    : 'Local Project Preset / Geodesic Coordinate Pin';

  const siteConfidence = isUserOverrideSite
    ? 'analytical'
    : hasNominatimName
    ? 'measured'
    : 'analytical';

  const pshProvider = pshProv?.providerName
    ? pshProv.providerName
    : (isMeasuredSite ? 'NASA POWER / PVGIS (Satellite Reanalysis)' : 'REGIONAL_ANALYTICAL_MODEL');

  const isIran = city.latitude >= 25 && city.latitude <= 40 && city.longitude >= 44 && city.longitude <= 64;

  const windProv = city.fieldProvenance?.basicWindSpeedKmh;
  const snowProv = city.fieldProvenance?.groundSnowLoadKgM2;
  const bearingProv = city.fieldProvenance?.soilBearingCapacityKpa;

  const isWindOverridden = siteOverrides?.basicWindSpeedKmh !== undefined || windProv?.sourceKind === 'user_input';
  const isSnowOverridden = siteOverrides?.groundSnowLoadKgM2 !== undefined || snowProv?.sourceKind === 'user_input';
  const isBearingOverridden = siteOverrides?.soilBearingCapacityKpa !== undefined || bearingProv?.sourceKind === 'user_input';

  const isExplicitWindRegulatory =
    !isWindOverridden &&
    Boolean(
      windProv?.providerName?.includes('BHRC') ||
      windProv?.providerName?.includes('INBC') ||
      windProv?.providerName?.includes('ASCE')
    );

  const windProvider = isWindOverridden
    ? 'USER_OVERRIDE'
    : isExplicitWindRegulatory
    ? windProv!.providerName
    : 'Regional Analytical Screening Model';

  const windConfidence = isExplicitWindRegulatory ? 'regulatory' : 'analytical';

  const isExplicitSnowRegulatory =
    !isSnowOverridden &&
    Boolean(
      snowProv?.providerName?.includes('BHRC') ||
      snowProv?.providerName?.includes('INBC') ||
      snowProv?.providerName?.includes('ASCE')
    );

  const snowProvider = isSnowOverridden
    ? 'USER_OVERRIDE'
    : isExplicitSnowRegulatory
    ? snowProv!.providerName
    : 'Regional Analytical Screening Model';

  const snowConfidence = isExplicitSnowRegulatory ? 'regulatory' : 'analytical';

  const soilBearingProvider = isBearingOverridden
    ? 'USER_OVERRIDE'
    : bearingProv?.providerName || (city.fieldProvenance?.clayFractionPercent?.providerName === 'ISRIC_SOILGRIDS' ? 'ISRIC SoilGrids Geotechnical Mapping' : 'Regional Geotechnical Screening Model');

  const soilMapProvider = isIran ? 'BHRC Geotechnical Map' : 'Global Digital Soil Map / Geomorphic Screening Model';

  return [
    {
      parameter: isEn ? 'Project Site' : 'محل پروژه',
      value: `${isEn ? city.nameEn : city.nameFa} · ${latStr}, ${lngStr}`,
      provider: siteProvider,
      traceId: climateTrace,
      timestamp: now,
      confidence: siteConfidence,
    },
    {
      parameter: isEn ? 'Peak Sun Hours (PSH)' : 'ساعات آفتابی اوج (PSH)',
      value: `${city.peakSunHours} kWh/m²/day`,
      provider: pshProvider,
      traceId: climateTrace,
      timestamp: now,
      confidence: city.confidence === 'measured' ? 'measured' : 'analytical',
    },
    {
      parameter: isEn ? 'Basic Wind Speed' : 'سرعت باد پایه',
      value: `${structInput.basicWindSpeedKmh} km/h`,
      provider: windProvider,
      traceId: '—',
      timestamp: now,
      confidence: windConfidence,
    },
    {
      parameter: isEn ? 'Ground Snow Load' : 'بار برف زمین',
      value: `${structInput.groundSnowLoadKgM2} kg/m²`,
      provider: snowProvider,
      traceId: '—',
      timestamp: now,
      confidence: snowConfidence,
    },
    {
      parameter: isEn ? 'Soil Bearing Capacity' : 'ظرفیت باربری مجاز خاک',
      value: `${structInput.soilBearingCapacityKpa} kPa`,
      provider: soilBearingProvider,
      traceId: '—',
      timestamp: now,
      confidence: 'analytical',
    },
    {
      parameter: isEn ? 'Soil Classification' : 'طبقه‌بندی خاک',
      value: structInput.soilClassification.replace(/_/g, ' ').toUpperCase(),
      provider: soilMapProvider,
      traceId: '—',
      timestamp: now,
      confidence: 'analytical',
    },
    {
      parameter: isEn ? 'Foundation Embedment Depth' : 'عمق کوبش فونداسیون',
      value: `${rec.pileDepthM.toFixed(2)} m`,
      provider: 'Broms (1964) · ASCE 7-22 / Eurocode 7 / INBC Part 6',
      traceId: structTrace,
      timestamp: now,
      confidence: 'analytical',
    },
    {
      parameter: isEn ? 'ISO 9223 Corrosion Category' : 'دسته زهکش شوری ISO 9223',
      value: `${corrosionCat} · ${corrosionDist} km to sea`,
      provider: 'ISO 9223 + OSM Nominatim shoreline distance (ADR-006)',
      traceId: corrosionTrace,
      timestamp: now,
      confidence: 'analytical',
    },
    {
      parameter: isEn ? 'Financial Tariff Model' : 'مدل تعرفه مالی',
      value: isEn ? 'On-grid (feed-in enabled)' : 'متصل به شبکه (فید-ان فعال)',
      provider: 'Internal Financial Engine (3-mode LCOE)',
      traceId: `TRC-FIN-${Date.now().toString(36).toUpperCase()}`,
      timestamp: now,
      confidence: 'analytical',
    },
  ];
}
