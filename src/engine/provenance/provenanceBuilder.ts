import { type ClimateCity, type SiteGeotechnicalOverrides, type ParameterProvenance } from '../types/climateTypes';
import { assessSaltCorrosion } from '../corrosion/saltCorrosionEngine';
import { recommendSharedFoundation } from '../geotech/foundationRecommendation';
import { type SoilType } from '../structuralEngine';

export interface ProvenanceRow {
  parameter: string;
  value: string;
  rawValue: number | string;
  unit: string;
  provider: string;
  sourceKind: string;
  derivationMethod?: string;
  qualityNote?: string;
  traceId: string;
  timestamp: string;
  confidence: 'measured' | 'regulatory' | 'analytical';
}

function isVerifiedRegulatoryEvidence(
  provenance: ParameterProvenance | undefined,
  value: number,
  unit: string,
): boolean {
  const evidence = provenance?.regulatoryEvidence as unknown;
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return false;
  const record = evidence as Record<string, unknown>;
  const requiredStrings = ['authorityId', 'standardCode', 'edition', 'datasetId', 'recordId', 'unit', 'retrievedAt'];
  if (requiredStrings.some((key) => typeof record[key] !== 'string' || !(record[key] as string).trim())) return false;
  if (record.status !== 'verified' || typeof record.value !== 'number' || !Number.isFinite(record.value)) return false;
  // The app has no independent signature/key trust anchor; a complete assertion
  // must not be promoted to regulatory confidence by matching its own fields.
  void provenance;
  void value;
  void unit;
  return false;
}

function makeFieldRow(
  parameter: string,
  value: number | string,
  unit: string,
  provenance: ParameterProvenance | undefined,
  overridden: boolean,
  traceId: string,
  timestamp: string,
): ProvenanceRow {
  const provenanceMatches = provenance?.value === value && provenance?.unit === unit;
  const verified = !overridden && typeof value === 'number' && isVerifiedRegulatoryEvidence(provenance, value, unit);
  const provider = overridden
    ? 'USER_OVERRIDE'
    : provenanceMatches
      ? provenance!.providerName
      : provenance
        ? 'PROVENANCE_VALUE_MISMATCH'
        : 'UNVERIFIED_DEFAULT';
  const sourceKind = overridden
    ? 'user_input'
    : provenanceMatches
      ? provenance!.sourceKind
      : 'default_unverified';
  const providerBacked = !overridden && provenanceMatches &&
    (provenance?.sourceKind === 'provider_value' || provenance?.sourceKind === 'provider_derived');
  return {
    parameter,
    value: `${value} ${unit}`,
    rawValue: value,
    unit,
    provider,
    sourceKind,
    derivationMethod: overridden ? 'Explicit user override' : provenanceMatches ? provenance?.derivationMethod : undefined,
    qualityNote: overridden
      ? 'User-supplied value; not independently verified.'
      : provenanceMatches
        ? provenance?.qualityNote
        : 'No matching provenance record for this exact value and unit.',
    traceId: provenance?.retrievedAt ? traceId : '—',
    timestamp: provenance?.retrievedAt || timestamp,
    confidence: verified ? 'regulatory' : providerBacked ? 'measured' : 'analytical',
  };
}

/** Build a stable, value-bound provenance projection shared by RFC and report exports. */
export async function buildProvenanceRows(
  city: ClimateCity,
  siteOverrides: SiteGeotechnicalOverrides | undefined,
  isEn: boolean,
): Promise<ProvenanceRow[]> {
  const now = new Date().toISOString();
  const trace = city.id || 'TRC-SITE-UNKNOWN';
  const provenance = city.fieldProvenance || {};

  let customDist: number | undefined;
  if (siteOverrides?.customNotes) {
    const parsed = parseFloat(siteOverrides.customNotes);
    if (!isNaN(parsed) && parsed >= 0) customDist = parsed;
  }
  const distanceToSeaKm = customDist ?? city.distanceToCoastKm ?? 60.0;
  let corrosionTrace = 'TRC-COR-UNAVAILABLE';
  let corrosionCat = 'UNASSESSED';
  let corrosionDist = distanceToSeaKm;
  try {
    const cor = await assessSaltCorrosion({ latitude: city.latitude, longitude: city.longitude, distanceToSeaKm });
    corrosionTrace = cor.traceId;
    corrosionCat = cor.iso9223Category;
    corrosionDist = cor.distanceToSeaKm;
  } catch {
    // The row remains clearly labelled analytical if the optional corrosion estimate fails.
  }

  const soilClassification = siteOverrides?.soilType ?? city.soilType ?? 'dense_sand_gravel';
  const fields: ProvenanceRow[] = [
    makeFieldRow(isEn ? 'Peak Sun Hours (PSH)' : 'ساعات آفتابی اوج (PSH)', city.peakSunHours, 'kWh/m²/day', provenance.peakSunHours, false, trace, now),
    makeFieldRow(isEn ? 'Minimum Design Temperature' : 'حداقل دمای طراحی', city.tempMinC, '°C', provenance.tempMinC, false, trace, now),
    makeFieldRow(isEn ? 'Maximum Design Temperature' : 'حداکثر دمای طراحی', city.tempMaxC, '°C', provenance.tempMaxC, false, trace, now),
    makeFieldRow(isEn ? 'Basic Wind Speed' : 'سرعت باد پایه', siteOverrides?.basicWindSpeedKmh ?? city.basicWindSpeedKmh ?? 130, 'km/h', provenance.basicWindSpeedKmh, siteOverrides?.basicWindSpeedKmh !== undefined, trace, now),
    makeFieldRow(isEn ? 'Ground Snow Load' : 'بار برف زمین', siteOverrides?.groundSnowLoadKgM2 ?? city.groundSnowLoadKgM2 ?? 0, 'kg/m²', provenance.groundSnowLoadKgM2, siteOverrides?.groundSnowLoadKgM2 !== undefined, trace, now),
    makeFieldRow(isEn ? 'Soil Bearing Capacity' : 'ظرفیت باربری خاک', siteOverrides?.soilBearingCapacityKpa ?? city.soilBearingCapacityKpa ?? 250, 'kPa', provenance.soilBearingCapacityKpa, siteOverrides?.soilBearingCapacityKpa !== undefined, trace, now),
    makeFieldRow(isEn ? 'Soil Internal Friction Angle' : 'زاویه اصطکاک داخلی خاک', siteOverrides?.soilInternalFrictionAngleDeg ?? city.soilInternalFrictionAngleDeg ?? 34, 'deg', provenance.soilInternalFrictionAngleDeg, siteOverrides?.soilInternalFrictionAngleDeg !== undefined, trace, now),
    makeFieldRow(isEn ? 'Frost Depth' : 'عمق یخبندان', siteOverrides?.frostDepthCm ?? city.frostDepthCm ?? 40, 'cm', provenance.frostDepthCm, siteOverrides?.frostDepthCm !== undefined, trace, now),
  ];

  const rec = recommendSharedFoundation({
    siteName: `${city.nameEn} (RFC 3.0 Project Context)`,
    latitude: city.latitude,
    longitude: city.longitude,
    elevationM: city.elevationM,
    soilClassification: soilClassification as SoilType,
    soilBearingCapacityKpa: siteOverrides?.soilBearingCapacityKpa ?? city.soilBearingCapacityKpa ?? 250,
    soilInternalFrictionAngleDeg: siteOverrides?.soilInternalFrictionAngleDeg ?? city.soilInternalFrictionAngleDeg ?? 34,
    soilCohesionKpa: siteOverrides?.soilCohesionKpa ?? city.soilCohesionKpa ?? 15,
    soilDensityKnM3: siteOverrides?.soilDensityKnM3 ?? city.soilDensityKnM3 ?? 18.5,
    frostDepthCm: siteOverrides?.frostDepthCm ?? city.frostDepthCm ?? 40,
    basicWindSpeedKmh: siteOverrides?.basicWindSpeedKmh ?? city.basicWindSpeedKmh ?? 130,
    groundSnowLoadKgM2: siteOverrides?.groundSnowLoadKgM2 ?? city.groundSnowLoadKgM2 ?? 100,
    tableAreaM2: 52,
    arrayTiltDeg: city.optimalTiltAnnualDeg || 31,
    postsPerTable: 4,
    clearanceHeightM: 1,
    slopeDeg: 4,
  });

  const locationProv = provenance.locationName;
  const hasVerifiedLocationName = locationProv?.sourceKind === 'provider_value' &&
    locationProv.providerName === 'OpenStreetMap Nominatim' &&
    locationProv.value === city.nameEn;
  const siteLabel = isEn ? city.nameEn : city.nameFa;
  const latStr = `${Math.abs(city.latitude).toFixed(4)}°${city.latitude >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(city.longitude).toFixed(4)}°${city.longitude >= 0 ? 'E' : 'W'}`;

  return [
    {
      parameter: isEn ? 'Project Site' : 'محل پروژه',
      value: `${siteLabel} · ${latStr}, ${lngStr}`,
      rawValue: `${siteLabel} · ${latStr}, ${lngStr}`,
      unit: 'coordinates',
      provider: hasVerifiedLocationName ? locationProv!.providerName : 'PROJECT_SITE_COORDINATES',
      sourceKind: hasVerifiedLocationName ? locationProv!.sourceKind : 'user_or_project_input',
      traceId: trace,
      timestamp: locationProv?.retrievedAt || now,
      confidence: hasVerifiedLocationName ? 'measured' : 'analytical',
    },
    ...fields,
    {
      parameter: isEn ? 'Soil Classification' : 'طبقه‌بندی خاک',
      value: soilClassification.replace(/_/g, ' ').toUpperCase(),
      rawValue: soilClassification,
      unit: 'classification',
      provider: siteOverrides?.soilType !== undefined ? 'USER_OVERRIDE' : provenance.soilType?.providerName || 'UNVERIFIED_DEFAULT',
      sourceKind: siteOverrides?.soilType !== undefined ? 'user_input' : provenance.soilType?.sourceKind || 'default_unverified',
      traceId: trace,
      timestamp: provenance.soilType?.retrievedAt || now,
      confidence: 'analytical',
    },
    {
      parameter: isEn ? 'Foundation Embedment Depth' : 'عمق کوبش فونداسیون',
      value: `${rec.pileDepthM.toFixed(2)} m`,
      rawValue: rec.pileDepthM,
      unit: 'm',
      provider: 'INTERNAL_SCREENING_MODEL',
      sourceKind: 'local_model',
      derivationMethod: 'Foundation recommendation model; field verification required.',
      qualityNote: 'Not a code-verified or geotechnically certified foundation design.',
      traceId: rec.traceId || 'TRC-FND-UNAVAILABLE',
      timestamp: now,
      confidence: 'analytical',
    },
    {
      parameter: isEn ? 'ISO 9223 Corrosion Category' : 'دسته خوردگی ISO 9223',
      value: `${corrosionCat} · ${corrosionDist} km to sea`,
      rawValue: `${corrosionCat}:${corrosionDist}`,
      unit: 'category / km',
      provider: 'INTERNAL_COASTAL_SCREENING_MODEL',
      sourceKind: 'local_model',
      traceId: corrosionTrace,
      timestamp: now,
      confidence: 'analytical',
    },
  ];
}
