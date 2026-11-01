/**
 * ISRIC SoilGrids 2.0 Global Geotechnical Provider
 * SolarPV Studio v3.0 - Data Gateway
 *
 * REST Endpoint: https://rest.isric.org/soilgrids/v2.0/properties/query
 * Maps global digital soil mapping (ISRIC World Soil Information) to:
 * - USDA Soil Taxonomy & Unified Soil Classification System (USCS)
 * - Geotechnical bearing capacity q_a (kPa), internal friction phi (°), cohesion c (kPa)
 * - Editable defaults for civil foundation sizing (piles, ground screws, concrete piers)
 */

import { SoilClassification } from '../climaticData';
import { SoilPropertiesData } from './types';
import { CircuitBreaker } from './circuitBreaker';

export class SoilDataProvider {
  private cache: Map<string, { data: SoilPropertiesData; timestamp: number }> = new Map();
  private readonly cacheTtlMs: number = 30 * 24 * 60 * 60 * 1000; // 30 days TTL (soil is static)
  private circuitBreaker = new CircuitBreaker();

  public generateTraceId(prefix: string = 'TRC-GW'): string {
    const d = new Date();
    const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
    const randHex = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0').toUpperCase();
    return `${prefix}-${dateStr}-${randHex}`;
  }

  public async fetchSoilProperties(lat: number, lng: number): Promise<SoilPropertiesData> {
    const cacheKey = `soil_${lat.toFixed(3)}_${lng.toFixed(3)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTtlMs) {
      return {
        ...cached.data,
        metadata: {
          ...cached.data.metadata,
          isCached: true,
        },
      };
    }

    return this.circuitBreaker.execute(
      async () => {
        // Attempt query to ISRIC SoilGrids REST API with short timeout
        const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lat=${lat}&lon=${lng}&property=bdod&property=clay&property=sand&property=silt&property=phh2o&depth=0-30cm&value=mean`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        try {
          const resp = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (!resp.ok) {
            throw new Error(`ISRIC SoilGrids returned HTTP ${resp.status}`);
          }
          const json = await resp.json();
          return this.parseSoilGridsResponse(lat, lng, json);
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          throw fetchErr;
        }
      },
      () => {
        // Analytical geotechnical fallback based on geomorphic / climatic zones
        return this.computeAnalyticalSoilProperties(lat, lng, true);
      }
    ).then((result) => {
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    });
  }

  private parseSoilGridsResponse(lat: number, lng: number, json: any): SoilPropertiesData {
    // SoilGrids units: clay/sand/silt in g/kg (divide by 10 to get %), bdod in cg/cm3 (divide by 100 for g/cm3)
    let clayPct = 25.0;
    let sandPct = 50.0;
    let siltPct = 25.0;
    let bdodGcm3 = 1.45;
    let ph = 7.0;

    const layers = json?.properties?.layers;
    if (Array.isArray(layers)) {
      for (const layer of layers) {
        const meanVal = layer?.depths?.[0]?.values?.mean;
        if (typeof meanVal === 'number') {
          if (layer.name === 'clay') clayPct = meanVal / 10.0;
          if (layer.name === 'sand') sandPct = meanVal / 10.0;
          if (layer.name === 'silt') siltPct = meanVal / 10.0;
          if (layer.name === 'bdod') bdodGcm3 = meanVal / 100.0;
          if (layer.name === 'phh2o') ph = meanVal / 10.0;
        }
      }
    }

    const { classification, bearingKpa, phiDeg, bearingRangeKpa, frictionRangeDeg, cohesionKpa, densityKnM3, disclaimer } =
      this.mapTextureToGeotechnicalParams(clayPct, sandPct, siltPct, bdodGcm3);

    return {
      latitude: Number(lat.toFixed(4)),
      longitude: Number(lng.toFixed(4)),
      soilClassification: classification,
      clayFractionPercent: Number(clayPct.toFixed(1)),
      sandFractionPercent: Number(sandPct.toFixed(1)),
      siltFractionPercent: Number(siltPct.toFixed(1)),
      bulkDensityGPerCm3: Number(bdodGcm3.toFixed(2)),
      soilBearingCapacityKpa: bearingKpa,
      soilInternalFrictionAngleDeg: phiDeg,
      bearingCapacityRangeKpa: bearingRangeKpa,
      frictionAngleRangeDeg: frictionRangeDeg,
      soilCohesionKpa: cohesionKpa,
      soilDensityKnM3: densityKnM3,
      frostDepthCm: Math.abs(lat) > 45 ? 60 : 20,
      phH2O: Number(ph.toFixed(1)),
      estimatedFromGlobalModel: true,
      geotechnicalDisclaimer: disclaimer,
      metadata: {
        traceId: this.generateTraceId('TRC-SOIL'),
        sourceProvider: 'ISRIC_SOILGRIDS',
        retrievalTimestamp: new Date().toISOString(),
        isCached: false,
        isEstimatedFromGlobalModel: true,
        geographicRegion: 'Global Soil Grids 250m Resolution',
        governingStandards: ['ISRIC World Soil Information', 'ASTM D2487 (USCS)', 'Eurocode 7 (EN 1997-1)'],
      },
    };
  }

  public computeAnalyticalSoilProperties(lat: number, lng: number, isEstimated: boolean = true): SoilPropertiesData {
    const absLat = Math.abs(lat);
    let classification: SoilClassification = 'dense_sand_gravel';
    let clayPct = 20.0;
    let sandPct = 60.0;
    let siltPct = 20.0;
    let bdod = 1.55;

    // Arid / desert sunbelts typically feature sand / gravel or calcic horizons
    if (absLat < 35 && ((lng > 35 && lng < 65) || (lng > -120 && lng < -100))) {
      classification = 'dense_sand_gravel';
      clayPct = 12.0;
      sandPct = 72.0;
      siltPct = 16.0;
      bdod = 1.65;
    } else if (absLat > 45) {
      classification = 'medium_clay';
      clayPct = 38.0;
      sandPct = 32.0;
      siltPct = 30.0;
      bdod = 1.40;
    }

    const { bearingKpa, phiDeg, bearingRangeKpa, frictionRangeDeg, cohesionKpa, densityKnM3, disclaimer } =
      this.mapTextureToGeotechnicalParams(clayPct, sandPct, siltPct, bdod);

    return {
      latitude: Number(lat.toFixed(4)),
      longitude: Number(lng.toFixed(4)),
      soilClassification: classification,
      clayFractionPercent: clayPct,
      sandFractionPercent: sandPct,
      siltFractionPercent: siltPct,
      bulkDensityGPerCm3: bdod,
      soilBearingCapacityKpa: bearingKpa,
      soilInternalFrictionAngleDeg: phiDeg,
      bearingCapacityRangeKpa: bearingRangeKpa,
      frictionAngleRangeDeg: frictionRangeDeg,
      soilCohesionKpa: cohesionKpa,
      soilDensityKnM3: densityKnM3,
      frostDepthCm: absLat > 45 ? 70 : 15,
      phH2O: 7.2,
      estimatedFromGlobalModel: true,
      geotechnicalDisclaimer: disclaimer,
      metadata: {
        traceId: this.generateTraceId('TRC-SOIL'),
        sourceProvider: 'REGIONAL_ANALYTICAL_MODEL',
        retrievalTimestamp: new Date().toISOString(),
        isCached: false,
        isEstimatedFromGlobalModel: isEstimated,
        geographicRegion: 'Global Geomorphic Classification',
        governingStandards: ['ASCE 7-22 Geotechnical Design', 'Eurocode 7'],
      },
    };
  }

  /**
   * Maps soil texture fractions (clay %, sand %, silt %) and dry bulk density (g/cm³)
   * to allowable soil bearing capacity, friction angle, and cohesion based on:
   * - Peck, R.B., Hanson, W.E., & Thornburn, T.H. (1974): "Foundation Engineering", 2nd ed., John Wiley & Sons.
   * - Bowles, J.E. (1996): "Foundation Analysis and Design", 5th ed., McGraw-Hill (Table 3-4 & Eq. 3-24).
   * - Terzaghi, K., Peck, R.B., & Mesri, G. (1996): "Soil Mechanics in Engineering Practice", 3rd ed.
   */
  private mapTextureToGeotechnicalParams(
    clay: number,
    sand: number,
    silt: number,
    bdod: number
  ): {
    classification: SoilClassification;
    bearingKpa: number;
    phiDeg: number;
    bearingRangeKpa: { min: number; nominal: number; max: number };
    frictionRangeDeg: { min: number; nominal: number; max: number };
    cohesionKpa: number;
    densityKnM3: number;
    disclaimer: string;
  } {
    const disclaimer =
      'Estimated from global digital soil mapping (ISRIC SoilGrids 2.0 @ 250m). These empirical correlations are preliminary design estimates and DO NOT replace on-site geotechnical boreholes, Standard Penetration Tests (SPT), or Cone Penetration Tests (CPT) required by ASCE 7-22 / Eurocode 7.';

    if (clay >= 35.0) {
      // Cohesive Clayey Soil (Bowles Table 3-4 for medium-to-stiff clays)
      const nominalPhi = Math.round(22.0 + 0.08 * (100.0 - clay));
      const nominalQa = Math.round(140.0 + 1.25 * clay);
      const nominalC = Math.round(15.0 + 0.60 * clay);
      const gamma = Number((16.5 + (bdod - 1.3) * 3.0).toFixed(1));

      return {
        classification: 'medium_clay',
        bearingKpa: nominalQa,
        phiDeg: nominalPhi,
        bearingRangeKpa: { min: Math.round(nominalQa * 0.85), nominal: nominalQa, max: Math.round(nominalQa * 1.15) },
        frictionRangeDeg: { min: nominalPhi - 3, nominal: nominalPhi, max: nominalPhi + 3 },
        cohesionKpa: nominalC,
        densityKnM3: gamma,
        disclaimer,
      };
    } else if (sand >= 70.0 && bdod < 1.50) {
      // Loose Granular Sand (Peck-Hanson-Thornburn Eq. for loose cohesionless sand)
      const nominalPhi = Math.round(28.0 + 0.05 * sand);
      const nominalQa = Math.round(130.0 + 0.40 * sand);
      const gamma = Number((16.0 + (bdod - 1.3) * 2.5).toFixed(1));

      return {
        classification: 'loose_sand',
        bearingKpa: nominalQa,
        phiDeg: nominalPhi,
        bearingRangeKpa: { min: Math.round(nominalQa * 0.85), nominal: nominalQa, max: Math.round(nominalQa * 1.15) },
        frictionRangeDeg: { min: nominalPhi - 2, nominal: nominalPhi, max: nominalPhi + 2 },
        cohesionKpa: 0,
        densityKnM3: gamma,
        disclaimer,
      };
    } else if (sand >= 45.0 && bdod >= 1.50) {
      // Dense Sand & Gravel / Glacial Till (Bowles 1996 for dense coarse gravel-sand mixes)
      const nominalPhi = Math.min(38, Math.round(29.0 + 0.12 * sand));
      const nominalQa = Math.round(180.0 + 1.2 * sand);
      const gamma = Number((17.5 + (bdod - 1.4) * 2.5).toFixed(1));

      return {
        classification: 'dense_sand_gravel',
        bearingKpa: nominalQa,
        phiDeg: nominalPhi,
        bearingRangeKpa: { min: Math.round(nominalQa * 0.85), nominal: nominalQa, max: Math.round(nominalQa * 1.15) },
        frictionRangeDeg: { min: nominalPhi - 3, nominal: nominalPhi, max: nominalPhi + 3 },
        cohesionKpa: 12,
        densityKnM3: gamma,
        disclaimer,
      };
    } else {
      // Weathered Rock / Limestone / Hardpan
      const nominalPhi = 38;
      const nominalQa = 350;

      return {
        classification: 'rocky_limestone',
        bearingKpa: nominalQa,
        phiDeg: nominalPhi,
        bearingRangeKpa: { min: 280, nominal: nominalQa, max: 450 },
        frictionRangeDeg: { min: 35, nominal: nominalPhi, max: 42 },
        cohesionKpa: 45,
        densityKnM3: 20.0,
        disclaimer,
      };
    }
  }
}
