/**
 * Unified External Data Gateway Facade
 * SolarPV Studio v3.0 - Global Engineering Architecture
 */

import { ClimateDataProvider } from './climateDataProvider';
import { SoilDataProvider } from './soilDataProvider';
import { StructuralHazardProvider } from './structuralHazardProvider';
import { ClimateResourceData, SoilPropertiesData, StructuralHazardData } from './types';
import { ClimateCity, SoilClassification } from '../climaticData';

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
  public async getComprehensiveSiteData(lat: number, lng: number): Promise<ComprehensiveSiteData> {
    const traceId = `TRC-GW-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const [climateResource, soilProperties, structuralHazard] = await Promise.all([
      this.climateProvider.fetchClimateResource(lat, lng),
      this.soilProvider.fetchSoilProperties(lat, lng),
      this.structuralProvider.fetchStructuralHazard(lat, lng),
    ]);

    const climateCity: ClimateCity = {
      id: `gateway_${lat.toFixed(3)}_${lng.toFixed(3)}`,
      nameFa: `سایت موقعیت (${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'})`,
      nameEn: `Site (${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'})`,
      provinceFa: climateResource.metadata.geographicRegion,
      provinceEn: climateResource.metadata.geographicRegion,
      latitude: lat,
      longitude: lng,
      elevationM: climateResource.elevationM,
      peakSunHours: climateResource.peakSunHours,
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
      dataRetrievalDate: new Date().toISOString().slice(0, 10),
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
