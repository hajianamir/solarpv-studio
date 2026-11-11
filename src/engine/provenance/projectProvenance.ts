import type { ClimateCity, ParameterProvenance, SiteGeotechnicalOverrides } from '../types/climateTypes';

export interface ProjectProvenanceRecord {
  key: string;
  parameter: string;
  parameterFa: string;
  value: number | string;
  unit: string;
  sourceKind: string;
  provider: string;
  sourceDataset?: string;
  sourceParameter?: string;
  endpointOrVersion?: string;
  retrievedAt?: string;
  derivationMethod?: string;
  qualityNote?: string;
  confidence: 'measured' | 'regulatory' | 'analytical';
}

const FIELD_DEFINITIONS: Array<{ key: keyof ClimateCity; parameter: string; unit: string }> = [
  { key: 'peakSunHours', parameter: 'Peak Sun Hours (PSH)', unit: 'kWh/m²/day' },
  { key: 'tempMinC', parameter: 'Minimum Design Temperature', unit: '°C' },
  { key: 'tempMaxC', parameter: 'Maximum Design Temperature', unit: '°C' },
  { key: 'optimalTiltAnnualDeg', parameter: 'Annual Optimum Tilt', unit: 'deg' },
  { key: 'albedo', parameter: 'Albedo', unit: 'dimensionless' },
  { key: 'soilingLossPct', parameter: 'Soiling Loss', unit: '%' },
  { key: 'annualRainfallMm', parameter: 'Annual Precipitation', unit: 'mm' },
  { key: 'basicWindSpeedKmh', parameter: 'Basic Wind Speed', unit: 'km/h' },
  { key: 'groundSnowLoadKgM2', parameter: 'Ground Snow Load', unit: 'kg/m²' },
  { key: 'soilBearingCapacityKpa', parameter: 'Soil Bearing Capacity', unit: 'kPa' },
  { key: 'soilInternalFrictionAngleDeg', parameter: 'Soil Internal Friction Angle', unit: 'deg' },
  { key: 'soilCohesionKpa', parameter: 'Soil Cohesion', unit: 'kPa' },
  { key: 'soilDensityKnM3', parameter: 'Soil Density', unit: 'kN/m³' },
  { key: 'frostDepthCm', parameter: 'Frost Depth', unit: 'cm' },
  { key: 'elevationM', parameter: 'Elevation', unit: 'm' },
];

function evidenceIsValid(prov: ParameterProvenance | undefined, value: number, unit: string): boolean {
  const e = prov?.regulatoryEvidence;
  return Boolean(
    prov?.sourceKind === 'provider_value' &&
    e?.status === 'verified' &&
    e.authorityId.trim() && e.standardCode.trim() && e.edition.trim() &&
    e.datasetId.trim() && e.recordId.trim() &&
    e.authorityId === prov.providerName && e.datasetId === prov.sourceDataset &&
    e.value === value && e.unit === unit && prov.value === value && prov.unit === unit &&
    Number.isFinite(Date.parse(e.retrievedAt))
  );
}

/** Single source of truth for value + unit + provenance shown/exported by all report surfaces. */
export function buildProjectProvenanceSnapshot(
  city: ClimateCity,
  overrides: SiteGeotechnicalOverrides = {},
): ProjectProvenanceRecord[] {
  const source = city.fieldProvenance || {};
  return FIELD_DEFINITIONS.map(({ key, parameter, unit }) => {
    const overrideValue = overrides[key as keyof SiteGeotechnicalOverrides];
    const hasOverride = typeof overrideValue === 'number';
    const value = hasOverride ? overrideValue as number : city[key];
    const prov = source[key as string];
    const matches = typeof value === 'number' && prov?.value === value && prov?.unit === unit;
    const verifiedRegulatory = !hasOverride && typeof value === 'number' && evidenceIsValid(prov, value, unit);
    const providerBacked = matches && (prov?.sourceKind === 'provider_value' || prov?.sourceKind === 'provider_derived');
    return {
      key: String(key),
      parameter,
      parameterFa: parameter,
      value: value as number | string,
      unit,
      sourceKind: hasOverride ? 'user_input' : matches ? prov!.sourceKind : 'default_unverified',
      provider: hasOverride ? 'USER_OVERRIDE' : matches ? prov!.providerName : prov ? 'PROVENANCE_VALUE_MISMATCH' : 'UNVERIFIED_DEFAULT',
      sourceDataset: hasOverride ? undefined : matches ? prov?.sourceDataset : undefined,
      sourceParameter: hasOverride ? undefined : matches ? prov?.sourceParameter : undefined,
      endpointOrVersion: hasOverride ? undefined : matches ? prov?.endpointOrVersion : undefined,
      retrievedAt: hasOverride ? undefined : matches ? prov?.retrievedAt : undefined,
      derivationMethod: hasOverride ? 'Explicit user override' : matches ? prov?.derivationMethod : undefined,
      qualityNote: hasOverride
        ? 'User supplied; not independently verified.'
        : matches
          ? prov?.qualityNote
          : 'No provenance record matching this exact value and unit.',
      confidence: verifiedRegulatory ? 'regulatory' : providerBacked ? 'measured' : 'analytical',
    };
  });
}
