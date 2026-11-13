/**
 * Unified External Data Gateway Facade
 * SolarPV Studio v3.0 - Global Engineering Architecture
 */

import { ClimateDataProvider } from './climateDataProvider';
import { SoilDataProvider } from './soilDataProvider';
import { StructuralHazardProvider } from './structuralHazardProvider';
import {
  type ClimateResourceData,
  type SoilPropertiesData,
  type StructuralHazardData,
  type ParameterProvenance,
  createParameterProvenance,
} from './types';
import { type ClimateCity, type SoilClassification, calculateDesignDaylightHours } from '../types/climateTypes';

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  const error = new Error('External data gateway request aborted');
  error.name = 'AbortError';
  throw error;
}
import { estimateGeodesicDistanceToCoastKm } from '../corrosion/coastlineModel';

export interface ComprehensiveSiteData {
  climateCity: ClimateCity;
  climateResource: ClimateResourceData;
  soilProperties: SoilPropertiesData;
  structuralHazard: StructuralHazardData;
  traceId: string;
}

export class ExternalDataGateway {
  private static instance: ExternalDataGateway | null = null;

  public readonly climateProvider: ClimateDataProvider;
  public readonly soilProvider: SoilDataProvider;
  public readonly structuralProvider: StructuralHazardProvider;

  private constructor() {
    this.climateProvider = new ClimateDataProvider();
    this.soilProvider = new SoilDataProvider();
    this.structuralProvider = new StructuralHazardProvider();
  }

  public static getInstance(): ExternalDataGateway {
    if (!ExternalDataGateway.instance) {
      ExternalDataGateway.instance = new ExternalDataGateway();
    }
    return ExternalDataGateway.instance;
  }

  /**
   * Fetches full environmental, optical, and civil geotechnical telemetry for any coordinates worldwide.
   */
  public async getComprehensiveSiteData(lat: number, lng: number, options?: { signal?: AbortSignal }): Promise<ComprehensiveSiteData> {
    throwIfAborted(options?.signal);
    const traceId = `TRC-GW-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const [climateResource, soilProperties, structuralHazard, nominatimName] = await Promise.all([
      this.climateProvider.fetchClimateResource(lat, lng, { signal: options?.signal }),
      this.soilProvider.fetchSoilProperties(lat, lng, { signal: options?.signal }),
      this.structuralProvider.fetchStructuralHazard(lat, lng),
      this.climateProvider.reverseGeocodeNominatim(lat, lng, { signal: options?.signal }),
    ]);

    throwIfAborted(options?.signal);

    const distCoastKm = estimateGeodesicDistanceToCoastKm(lat, lng);
    const gwDepthM = distCoastKm <= 2.0 ? 1.5 : distCoastKm <= 10.0 ? 3.0 : 6.0;
    const drainage: ClimateCity['drainageCondition'] =
      climateResource.annualPrecipitationMm > 600 || soilProperties.soilClassification === 'medium_clay'
        ? 'poor_flood_prone'
        : climateResource.annualPrecipitationMm > 350
        ? 'moderate'
        : 'well_drained';

    const designDaylight = calculateDesignDaylightHours(lat);

    const cityFieldProvenance: Record<string, ParameterProvenance> = {
      ...(climateResource.fieldProvenance || {}),
      ...(soilProperties.fieldProvenance || {}),
      ...(structuralHazard.fieldProvenance || {}),
      daylightHoursDesign: createParameterProvenance('local_model', 'ASTRONOMICAL_SPA_MODEL', {
        unit: 'hours',
        value: designDaylight.daylightHoursDesign,
        derivationMethod: 'Astronomical sunset hour angle at local winter solstice',
      }),
      nightHoursDesign: createParameterProvenance('local_model', 'ASTRONOMICAL_SPA_MODEL', {
        unit: 'hours',
        value: designDaylight.nightHoursDesign,
        derivationMethod: '24.0 - daylightHoursDesign',
      }),
      distanceToCoastKm: createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
        unit: 'km',
        value: distCoastKm,
        derivationMethod: 'Geodesic distance calculation to world coastline dataset',
      }),
      groundwaterDepthM: createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
        unit: 'm',
        value: gwDepthM,
        derivationMethod: 'Coastal proximity step heuristic',
        qualityNote: 'برآورد هیدرولوژیکی غربالگری — نیازمند بررسی میدانی (Site Investigation Required)',
      }),
    };

    const climateCity: ClimateCity = {
      id: `gateway_${lat}_${lng}`,
      nameFa: nominatimName,
      nameEn: nominatimName,
      provinceFa: climateResource.metadata.geographicRegion,
      provinceEn: climateResource.metadata.geographicRegion,
      latitude: lat,
      longitude: lng,
      elevationM: climateResource.elevationM,
      peakSunHours: climateResource.peakSunHours,
      daylightHoursDesign: designDaylight.daylightHoursDesign,
      nightHoursDesign: designDaylight.nightHoursDesign,
      tempMinC: climateResource.tempMinC,
      tempMaxC: climateResource.tempMaxC,
      albedo: climateResource.albedo,
      soilingLossPct: climateResource.soilingLossPercent,
      optimalTiltAnnualDeg: climateResource.optimalTiltDeg,
      optimalTiltWinterDeg: Math.min(75, climateResource.optimalTiltDeg + 15),
      optimalTiltSummerDeg: Math.max(0, climateResource.optimalTiltDeg - 15),
      descriptionFa: `داده‌های یکپارچه‌شده از درگاه جهانی اقلیم، خاک و بارهای سازه‌ای (ISRIC, NSRDB/PVGIS, ASCE 7/Eurocode)`,
      descriptionEn: `Integrated telemetry from Global Gateway (ISRIC SoilGrids, NSRDB/PVGIS, ASCE 7/Eurocode)`,
      basicWindSpeedKmh: structuralHazard.basicWindSpeedKmh,
      groundSnowLoadKgM2: structuralHazard.groundSnowLoadKgM2,
      annualRainfallMm: climateResource.annualPrecipitationMm,
      soilType: soilProperties.soilClassification,
      soilBearingCapacityKpa: soilProperties.soilBearingCapacityKpa,
      soilInternalFrictionAngleDeg: soilProperties.soilInternalFrictionAngleDeg,
      soilCohesionKpa: soilProperties.soilCohesionKpa,
      soilDensityKnM3: soilProperties.soilDensityKnM3,
      frostDepthCm: soilProperties.frostDepthCm,
      seismicZoneCoefficientA: structuralHazard.seismicAccelerationA,
      dataSourceFa: `درگاه یکپارچه جهانی (${climateResource.metadata.sourceProvider} / ${soilProperties.metadata.sourceProvider})`,
      dataSourceEn: `Unified External Gateway (${climateResource.metadata.sourceProvider} / ${soilProperties.metadata.sourceProvider})`,
      confidence: climateResource.metadata.sourceProvider !== 'REGIONAL_ANALYTICAL_MODEL' ? 'measured' : 'analytical_estimate',
      dataRetrievalDate: (climateResource.metadata.retrievalTimestamp || new Date().toISOString()).slice(0, 10),
      distanceToCoastKm: distCoastKm,
      drainageCondition: drainage,
      groundwaterDepthM: gwDepthM,
      fieldProvenance: cityFieldProvenance,
    };

    return {
      climateCity,
      climateResource,
      soilProperties,
      structuralHazard,
      traceId,
    };
  }
}
