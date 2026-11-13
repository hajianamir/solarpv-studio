import type { ClimateCity, ParameterProvenance, SiteGeotechnicalOverrides } from '../types/climateTypes';

export type SolarSourceStatus = 'PROVIDER' | 'ANALYTICAL / UNVERIFIED';
export type SoilSourceStatus = 'PROVIDER COMPLETE' | 'PARTIAL' | 'ANALYTICAL / UNVERIFIED';

function providerField(record: ParameterProvenance | undefined, provider?: string): boolean {
  return Boolean(record &&
    (record.sourceKind === 'provider_value' || record.sourceKind === 'provider_derived') &&
    (!provider || record.providerName === provider) &&
    typeof record.value === 'number' && Number.isFinite(record.value));
}

/**
 * Summarize the available source records, not a blanket certification of the
 * entire site. Soil completeness requires all five requested 0–30cm properties
 * and no coverage warning. Imported claims are downgraded during migration.
 */
export function summarizeGatewaySources(city: ClimateCity, overrides?: SiteGeotechnicalOverrides): {
  solar: SolarSourceStatus;
  soil: SoilSourceStatus;
} {
  const provenance = city.fieldProvenance ?? {};
  const solarRecord = provenance.peakSunHours;
  const solar: SolarSourceStatus = providerField(solarRecord) && solarRecord?.value === city.peakSunHours && solarRecord.unit === 'kWh/m²/day'
    ? 'PROVIDER'
    : 'ANALYTICAL / UNVERIFIED';
  const soilRecords = ['clayFractionPercent', 'sandFractionPercent', 'siltFractionPercent', 'bulkDensityGPerCm3', 'phH2O']
    .map((key) => provenance[key]);
  const hasSomeProviderSoil = soilRecords.some((record) => providerField(record, 'ISRIC_SOILGRIDS'));
  const hasOverrides = Boolean(overrides && [
    overrides.soilType,
    overrides.soilBearingCapacityKpa,
    overrides.soilInternalFrictionAngleDeg,
    overrides.soilCohesionKpa,
    overrides.soilDensityKnM3,
  ].some((value) => value !== undefined && value !== null));
  const isComplete = !hasOverrides && soilRecords.every((record) =>
    providerField(record, 'ISRIC_SOILGRIDS') && !record?.qualityNote
  );
  const soil: SoilSourceStatus = isComplete ? 'PROVIDER COMPLETE' : hasSomeProviderSoil ? 'PARTIAL' : 'ANALYTICAL / UNVERIFIED';
  return { solar, soil };
}

export function gatewaySourceSummary(city: ClimateCity, overrides?: SiteGeotechnicalOverrides): string {
  const { solar, soil } = summarizeGatewaySources(city, overrides);
  return `SOLAR ${solar}; SOIL ${soil}`;
}
