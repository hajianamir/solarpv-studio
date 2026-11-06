/**
 * External Data Gateway Types & Schemas
 * SolarPV Studio v3.0 - Global Multi-Region Data Integration Architecture
 */

import type { SoilClassification } from '../types/climateTypes';

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export type DatumStatus = 'available' | 'estimated' | 'missing' | 'invalid' | 'not_evaluated';

export interface EngineeringDatum<T> {
  value: T;
  status: DatumStatus;
  source: string; // e.g., 'PVGIS-ERA5', 'NASA_POWER', 'ISRIC_SOILGRIDS', 'INBC_PART_6', 'REGIONAL_ANALYTICAL_MODEL', 'SCREENING_ESTIMATE'
  method: 'direct_measurement' | 'satellite_reanalysis' | 'geostatistical_interpolation' | 'analytical_model' | 'rule_of_thumb_screening';
  uncertaintyPct?: number;
  timestamp?: string;
  notes?: string;
}

export function createEngineeringDatum<T>(
  value: T,
  status: DatumStatus = 'available',
  source: string = 'REGIONAL_ANALYTICAL_MODEL',
  method: EngineeringDatum<T>['method'] = 'analytical_model',
  uncertaintyPct?: number,
  notes?: string
): EngineeringDatum<T> {
  return {
    value,
    status,
    source,
    method,
    uncertaintyPct,
    timestamp: new Date().toISOString(),
    notes,
  };
}

export interface DataProvenanceMetadata {
  traceId: string;
  sourceProvider: 'NSRDB' | 'PVGIS' | 'NASA_POWER' | 'ISRIC_SOILGRIDS' | 'DLUBAL_GEOZONE' | 'REGIONAL_ANALYTICAL_MODEL';
  retrievalTimestamp: string;
  isCached: boolean;
  isEstimatedFromGlobalModel: boolean;
  geographicRegion: string;
  governingStandards: string[];
}

export interface ClimateResourceData {
  latitude: number;
  longitude: number;
  elevationM: number;
  peakSunHours: number; // kWh/m²/day
  dniKwhM2Day: number;
  dhiKwhM2Day: number;
  tempMinC: number;
  tempMaxC: number;
  tempAnnualMeanC: number;
  albedo: number;
  annualPrecipitationMm: number;
  optimalTiltDeg: number;
  soilingLossPercent: number;
  metadata: DataProvenanceMetadata;
}

export interface SoilPropertiesData {
  latitude: number;
  longitude: number;
  soilClassification: SoilClassification;
  clayFractionPercent: number;
  sandFractionPercent: number;
  siltFractionPercent: number;
  bulkDensityGPerCm3: number;
  soilBearingCapacityKpa: number;
  soilInternalFrictionAngleDeg: number;
  bearingCapacityRangeKpa?: { min: number; nominal: number; max: number };
  frictionAngleRangeDeg?: { min: number; nominal: number; max: number };
  soilCohesionKpa: number;
  soilDensityKnM3: number;
  frostDepthCm: number;
  phH2O?: number;
  estimatedFromGlobalModel: boolean;
  geotechnicalDisclaimer?: string;
  metadata: DataProvenanceMetadata;
}

export interface StructuralHazardData {
  latitude: number;
  longitude: number;
  basicWindSpeedKmh: number;
  basicWindPressureQzKnM2: number;
  groundSnowLoadKgM2: number;
  groundSnowLoadSkKnM2: number;
  seismicAccelerationA: number;
  windStandardCode: 'ASCE_7_22' | 'EN_1991_1_4' | 'INBC_PART_6' | 'AS_NZS_1170_2';
  snowStandardCode: 'ASCE_7_22_CH7' | 'EN_1991_1_3' | 'INBC_PART_6' | 'AS_NZS_1170_3';
  metadata: DataProvenanceMetadata;
}

export interface GatewayHealthStatus {
  circuitState: CircuitBreakerState;
  consecutiveFailures: number;
  lastFailureTime?: number;
  cacheHitRatioPercent: number;
  totalRequests: number;
}
