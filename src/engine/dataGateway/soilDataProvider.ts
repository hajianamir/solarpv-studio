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

import type { SoilClassification } from '../types/climateTypes';
import { type SoilPropertiesData, type ParameterProvenance, createParameterProvenance } from './types';
import { CircuitBreaker } from './circuitBreaker';
import { isRealInternetEnabled } from '../env/runtimeEnv';

const PROVIDER_TIMEOUT_MS = 12000;

interface SoilCacheEntry {
  data: SoilPropertiesData;
  timestamp: number;
  ttlMs: number;
}

export class SoilDataProvider {
  private cache: Map<string, SoilCacheEntry> = new Map();
  private readonly remoteCacheTtlMs: number = 30 * 24 * 60 * 60 * 1000; // 30 days TTL for verified satellite/measured soil data
  private readonly fallbackCacheTtlMs: number = 30 * 1000; // 30 seconds TTL for analytical fallback
  private circuitBreaker = new CircuitBreaker();

  public generateTraceId(prefix: string = 'TRC-GW'): string {
    const d = new Date();
    const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
    const randHex = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0').toUpperCase();
    return `${prefix}-${dateStr}-${randHex}`;
  }

  public async fetchSoilProperties(
    lat: number,
    lng: number,
    options?: { signal?: AbortSignal }
  ): Promise<SoilPropertiesData> {
    const cacheKey = `soil_${lat}_${lng}`;
    if (options?.signal?.aborted) {
      throw new DOMException('Soil property query aborted by caller', 'AbortError');
    }
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < cached.ttlMs) {
      return {
        ...cached.data,
        metadata: {
          ...cached.data.metadata,
          isCached: true,
        },
      };
    }

    if (!isRealInternetEnabled()) {
      const fallback = this.computeAnalyticalSoilProperties(lat, lng, true);
      this.cache.set(cacheKey, { data: fallback, timestamp: Date.now(), ttlMs: this.fallbackCacheTtlMs });
      return fallback;
    }

    return this.circuitBreaker.execute(
      async () => {
        // Query ISRIC SoilGrids REST API across topsoil standard depths (0-5cm, 5-15cm, 15-30cm)
        const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}&property=bdod&property=clay&property=sand&property=silt&property=phh2o&depth=0-5cm&depth=5-15cm&depth=15-30cm&value=mean`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

        try {
          const resp = await fetch(url, { signal: controller.signal });
          if (!resp.ok) {
            throw new Error(`ISRIC SoilGrids returned HTTP ${resp.status}`);
          }
          const json = await resp.json();
          return this.parseSoilGridsResponse(lat, lng, json);
        } catch (fetchErr) {
          if ((fetchErr as Error)?.name === 'AbortError') {
            throw new Error(`ISRIC SoilGrids timeout after ${PROVIDER_TIMEOUT_MS} ms`);
          }
          throw fetchErr;
        } finally {
          clearTimeout(timeoutId);
        }
      },
      () => {
        // Analytical geotechnical fallback based on geomorphic / climatic zones
        return this.computeAnalyticalSoilProperties(lat, lng, true);
      }
    ).then((result) => {
      const isFallback = result.metadata.isEstimatedFromGlobalModel;
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        ttlMs: isFallback ? this.fallbackCacheTtlMs : this.remoteCacheTtlMs,
      });
      return result;
    });
  }

  public parseSoilGridsResponse(lat: number, lng: number, json: any): SoilPropertiesData {
    // Helper to calculate depth interval thickness in cm (e.g., 0-5cm -> 5cm, 5-15cm -> 10cm, 15-30cm -> 15cm)
    const parseLayerThicknessCm = (depthObj: any): number => {
      if (typeof depthObj?.range?.top_depth === 'number' && typeof depthObj?.range?.bottom_depth === 'number') {
        const thickness = depthObj.range.bottom_depth - depthObj.range.top_depth;
        if (thickness > 0) return thickness;
      }
      const label = String(depthObj?.label || '');
      const match = label.match(/(\d+)-(\d+)\s*cm/i);
      if (match) {
        const top = parseInt(match[1], 10);
        const bottom = parseInt(match[2], 10);
        if (bottom > top) return bottom - top;
      }
      return 10;
    };

    // SoilGrids units: clay/sand/silt in g/kg (divide by 10 to get %), bdod in cg/cm3 (divide by 100 for g/cm3)
    let clayPct = 25.0;
    let sandPct = 50.0;
    let siltPct = 25.0;
    let bdodGcm3 = 1.45;
    let ph = 7.0;

    let hasClay = false;
    let hasSand = false;
    let hasSilt = false;
    let hasBdod = false;
    let hasPh = false;
    let minTopDepth = Infinity;
    let maxBottomDepth = -Infinity;
    const depthByProperty: Record<string, string> = {};

    const layers = json?.properties?.layers;
    if (Array.isArray(layers) && layers.length > 0) {
      for (const layer of layers) {
        const depths = layer?.depths;
        let sumWeighted = 0;
        let sumWeight = 0;
        let propMinTop = Infinity;
        let propMaxBottom = -Infinity;
        if (Array.isArray(depths) && depths.length > 0) {
          for (const d of depths) {
            const val = d?.values?.mean;
            // Filter out negative sentinels (e.g. -999)
            if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
              const weight = parseLayerThicknessCm(d);
              sumWeighted += val * weight;
              sumWeight += weight;

              let top = Infinity;
              let bottom = -Infinity;
              if (typeof d?.range?.top_depth === 'number' && typeof d?.range?.bottom_depth === 'number') {
                top = d.range.top_depth;
                bottom = d.range.bottom_depth;
              } else if (typeof d?.label === 'string') {
                const m = d.label.match(/(\d+)-(\d+)/);
                if (m) {
                  top = parseInt(m[1], 10);
                  bottom = parseInt(m[2], 10);
                }
              }
              if (Number.isFinite(top) && Number.isFinite(bottom) && top >= 0 && bottom > top) {
                propMinTop = Math.min(propMinTop, top);
                propMaxBottom = Math.max(propMaxBottom, bottom);
                minTopDepth = Math.min(minTopDepth, top);
                maxBottomDepth = Math.max(maxBottomDepth, bottom);
              }
            }
          }
        }
        if (sumWeight > 0) {
          const meanVal = sumWeighted / sumWeight;
          const propLabel = Number.isFinite(propMinTop) && Number.isFinite(propMaxBottom)
            ? `${propMinTop}-${propMaxBottom}cm`
            : '0-30cm';
          depthByProperty[layer.name] = propLabel;
          if (layer.name === 'clay') { clayPct = meanVal / 10.0; hasClay = true; }
          if (layer.name === 'sand') { sandPct = meanVal / 10.0; hasSand = true; }
          if (layer.name === 'silt') { siltPct = meanVal / 10.0; hasSilt = true; }
          if (layer.name === 'bdod') { bdodGcm3 = meanVal / 100.0; hasBdod = true; }
          if (layer.name === 'phh2o') { ph = meanVal / 10.0; hasPh = true; }
        }
      }
    }

    const depthLabel = Number.isFinite(minTopDepth) && Number.isFinite(maxBottomDepth)
      ? `${minTopDepth}-${maxBottomDepth}cm`
      : '0-30cm';

    const clayDepth = depthByProperty.clay || depthLabel;
    const sandDepth = depthByProperty.sand || depthLabel;
    const siltDepth = depthByProperty.silt || depthLabel;
    const bdodDepth = depthByProperty.bdod || depthLabel;
    const phDepth = depthByProperty.phh2o || depthLabel;

    const hasUniformDepth = clayDepth === sandDepth && sandDepth === siltDepth;
    const depthOverlapNote = hasUniformDepth
      ? undefined
      : `Staggered depth intervals: clay (${clayDepth}), sand (${sandDepth}), silt (${siltDepth}). Texture triad computed across staggered depths.`;

    // Check individual fraction bounds (0 to 100%)
    if (hasClay && (clayPct < 0 || clayPct > 100)) hasClay = false;
    if (hasSand && (sandPct < 0 || sandPct > 100)) hasSand = false;
    if (hasSilt && (siltPct < 0 || siltPct > 100)) hasSilt = false;

    // Identify specifically which fractions are missing
    const missingFractions: string[] = [];
    if (!hasClay) missingFractions.push('clay');
    if (!hasSand) missingFractions.push('sand');
    if (!hasSilt) missingFractions.push('silt');

    let isTextureComplete = hasClay && hasSand && hasSilt;
    let textureWasNormalized = false;

    if (isTextureComplete) {
      const textureSum = clayPct + sandPct + siltPct;
      // In USDA soil mechanics, sum of clay + sand + silt is 100%.
      // Due to independent depth-spline fits, minor deviation within [85%, 115%] is normal.
      // Deviations outside [85%, 115%] indicate severely inconsistent / corrupted provider data.
      if (textureSum >= 85 && textureSum <= 115) {
        clayPct = Number(((clayPct / textureSum) * 100).toFixed(1));
        sandPct = Number(((sandPct / textureSum) * 100).toFixed(1));
        siltPct = Number((100 - clayPct - sandPct).toFixed(1));
        textureWasNormalized = Math.abs(textureSum - 100) > 0.1;
      } else {
        // Severe physical inconsistency (e.g. 135% or 150%) — reject provider texture!
        isTextureComplete = false;
        missingFractions.push(`texture triad sum non-physical (${textureSum.toFixed(1)}%, expected 100% ±15%)`);
      }
    }

    // If texture is incomplete or inconsistent, fall back to analytical geomorphic estimate
    if (!isTextureComplete) {
      const analytical = this.computeAnalyticalSoilProperties(lat, lng, true);
      clayPct = analytical.clayFractionPercent;
      sandPct = analytical.sandFractionPercent;
      siltPct = analytical.siltFractionPercent;
    }

    const { classification, bearingKpa, phiDeg, bearingRangeKpa, frictionRangeDeg, cohesionKpa, densityKnM3, densityDerivationMethod, disclaimer } =
      this.mapTextureToGeotechnicalParams(clayPct, sandPct, siltPct, bdodGcm3);

    const frostDepth = Math.abs(lat) > 45 ? 60 : 20;
    const isTextureFromProvider = isTextureComplete;
    const isSoilFullyLive = isTextureFromProvider && hasBdod && hasPh && hasUniformDepth;

    const fieldProvenance: Record<string, ParameterProvenance> = {
      clayFractionPercent: isTextureComplete
        ? createParameterProvenance((textureWasNormalized || !hasUniformDepth) ? 'provider_derived' : 'provider_value', 'ISRIC_SOILGRIDS', {
            sourceDataset: 'SoilGrids 250m v2.0',
            sourceParameter: `clay/mean (${clayDepth})`,
            unit: '%',
            value: Number(clayPct.toFixed(1)),
            derivationMethod: textureWasNormalized ? `Normalized to 100% USDA triad from SoilGrids layer means (${clayDepth})` : undefined,
            qualityNote: depthOverlapNote,
          })
        : createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
            unit: '%',
            value: Number(clayPct.toFixed(1)),
            derivationMethod: `Geomorphic zonal texture estimate (${missingFractions.join(', ')} missing or inconsistent in ISRIC payload)`,
            qualityNote: `لایه خاک در پاسخ ISRIC ناقص یا ناسازگار بود (${missingFractions.join(', ')}) — برآورد تحلیلی`,
          }),
      sandFractionPercent: isTextureComplete
        ? createParameterProvenance((textureWasNormalized || !hasUniformDepth) ? 'provider_derived' : 'provider_value', 'ISRIC_SOILGRIDS', {
            sourceDataset: 'SoilGrids 250m v2.0',
            sourceParameter: `sand/mean (${sandDepth})`,
            unit: '%',
            value: Number(sandPct.toFixed(1)),
            derivationMethod: textureWasNormalized ? `Normalized to 100% USDA triad from SoilGrids layer means (${sandDepth})` : undefined,
            qualityNote: depthOverlapNote,
          })
        : createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
            unit: '%',
            value: Number(sandPct.toFixed(1)),
            derivationMethod: `Geomorphic zonal texture estimate (${missingFractions.join(', ')} missing or inconsistent in ISRIC payload)`,
            qualityNote: `لایه خاک در پاسخ ISRIC ناقص یا ناسازگار بود (${missingFractions.join(', ')}) — برآورد تحلیلی`,
          }),
      siltFractionPercent: isTextureComplete
        ? createParameterProvenance((textureWasNormalized || !hasUniformDepth) ? 'provider_derived' : 'provider_value', 'ISRIC_SOILGRIDS', {
            sourceDataset: 'SoilGrids 250m v2.0',
            sourceParameter: `silt/mean (${siltDepth})`,
            unit: '%',
            value: Number(siltPct.toFixed(1)),
            derivationMethod: textureWasNormalized ? `Normalized to 100% USDA triad from SoilGrids layer means (${siltDepth})` : undefined,
            qualityNote: depthOverlapNote,
          })
        : createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
            unit: '%',
            value: Number(siltPct.toFixed(1)),
            derivationMethod: `Geomorphic zonal texture estimate (${missingFractions.join(', ')} missing or inconsistent in ISRIC payload)`,
            qualityNote: `لایه خاک در پاسخ ISRIC ناقص یا ناسازگار بود (${missingFractions.join(', ')}) — برآورد تحلیلی`,
          }),
      bulkDensityGPerCm3: hasBdod
        ? createParameterProvenance('provider_value', 'ISRIC_SOILGRIDS', {
            sourceDataset: 'SoilGrids 250m v2.0',
            sourceParameter: `bdod/mean (${bdodDepth})`,
            unit: 'g/cm³',
            value: Number(bdodGcm3.toFixed(2)),
          })
        : createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
            unit: 'g/cm³',
            value: Number(bdodGcm3.toFixed(2)),
            derivationMethod: 'Geomorphic zonal dry bulk density estimate (bdod missing from ISRIC payload)',
            qualityNote: 'چگالی ظاهری خاک در پاسخ ISRIC وجود نداشت — برآورد تحلیلی',
          }),
      phH2O: hasPh
        ? createParameterProvenance('provider_value', 'ISRIC_SOILGRIDS', {
            sourceDataset: 'SoilGrids 250m v2.0',
            sourceParameter: `phh2o/mean (${phDepth})`,
            unit: 'pH',
            value: Number(ph.toFixed(1)),
          })
        : createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
            unit: 'pH',
            value: Number(ph.toFixed(1)),
            derivationMethod: 'Neutral soil pH default (7.0)',
          }),
      soilBearingCapacityKpa: createParameterProvenance(
        isTextureFromProvider ? 'provider_derived' : 'local_model',
        isTextureFromProvider ? 'ISRIC_SOILGRIDS' : 'REGIONAL_ANALYTICAL_MODEL',
        {
          unit: 'kPa',
          value: bearingKpa,
          derivationMethod: 'Semi-empirical correlation from texture fractions & dry density (Bowles 1996 / Terzaghi)',
          qualityNote: 'برآورد ژئوتکنیکی غربالگری — جایگزین آزمایش مکانیک خاک و گمانه‌زنی سایت نیست',
        }
      ),
      soilInternalFrictionAngleDeg: createParameterProvenance(
        isTextureFromProvider ? 'provider_derived' : 'local_model',
        isTextureFromProvider ? 'ISRIC_SOILGRIDS' : 'REGIONAL_ANALYTICAL_MODEL',
        {
          unit: 'deg',
          value: phiDeg,
          derivationMethod: 'Correlation from sand/gravel fraction and USCS soil classification',
          qualityNote: 'برآورد غربالگری زاویه اصطکاک داخلی',
        }
      ),
      soilCohesionKpa: createParameterProvenance(
        isTextureFromProvider ? 'provider_derived' : 'local_model',
        isTextureFromProvider ? 'ISRIC_SOILGRIDS' : 'REGIONAL_ANALYTICAL_MODEL',
        {
          unit: 'kPa',
          value: cohesionKpa,
          derivationMethod: 'Correlation from clay fraction and soil classification plasticity',
          qualityNote: 'برآورد چسبندگی خاک',
        }
      ),
      soilDensityKnM3: createParameterProvenance(
        hasBdod ? 'provider_derived' : 'local_model',
        hasBdod ? 'ISRIC_SOILGRIDS' : 'REGIONAL_ANALYTICAL_MODEL',
        {
          unit: 'kN/m³',
          value: densityKnM3,
          derivationMethod: hasBdod
            ? densityDerivationMethod
            : `Analytical estimate: ${densityDerivationMethod}`,
        }
      ),
      frostDepthCm: createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
        unit: 'cm',
        value: frostDepth,
        derivationMethod: 'Latitude-based seasonal frost penetration screening rule',
        qualityNote: 'برآورد غربالگری — نیازمند انطباق با مبحث ششم مقررات ملی ساختمان یا آیین‌نامه محلی',
      }),
    };

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
      frostDepthCm: frostDepth,
      phH2O: Number(ph.toFixed(1)),
      estimatedFromGlobalModel: !isSoilFullyLive,
      geotechnicalDisclaimer: disclaimer,
      metadata: {
        traceId: this.generateTraceId('TRC-SOIL'),
        sourceProvider: isTextureFromProvider ? 'ISRIC_SOILGRIDS' : 'REGIONAL_ANALYTICAL_MODEL',
        retrievalTimestamp: new Date().toISOString(),
        isCached: false,
        isEstimatedFromGlobalModel: !isSoilFullyLive,
        geographicRegion: isTextureFromProvider ? 'Global Soil Grids 250m Resolution' : 'Geomorphic Analytical Model',
        governingStandards: ['ISRIC World Soil Information', 'ASTM D2487 (USCS)', 'Eurocode 7 (EN 1997-1)'],
      },
      fieldProvenance,
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

    const { bearingKpa, phiDeg, bearingRangeKpa, frictionRangeDeg, cohesionKpa, densityKnM3, densityDerivationMethod, disclaimer } =
      this.mapTextureToGeotechnicalParams(clayPct, sandPct, siltPct, bdod);

    const frostDepth = absLat > 45 ? 70 : 15;

    const fieldProvenance: Record<string, ParameterProvenance> = {
      clayFractionPercent: createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
        unit: '%',
        value: clayPct,
        derivationMethod: 'Geomorphic zonal texture estimate (arid vs temperate)',
      }),
      sandFractionPercent: createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
        unit: '%',
        value: sandPct,
        derivationMethod: 'Geomorphic zonal texture estimate',
      }),
      siltFractionPercent: createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
        unit: '%',
        value: siltPct,
        derivationMethod: 'Geomorphic zonal texture estimate',
      }),
      bulkDensityGPerCm3: createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
        unit: 'g/cm³',
        value: bdod,
        derivationMethod: 'Geomorphic zonal dry bulk density estimate',
      }),
      phH2O: createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
        unit: 'pH',
        value: 7.2,
        derivationMethod: 'Standard neutral soil pH estimate',
      }),
      soilBearingCapacityKpa: createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
        unit: 'kPa',
        value: bearingKpa,
        derivationMethod: 'Semi-empirical correlation from texture fractions & dry density',
        qualityNote: 'برآورد ژئوتکنیکی غربالگری — جایگزین آزمایش مکانیک خاک نیست',
      }),
      soilInternalFrictionAngleDeg: createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
        unit: 'deg',
        value: phiDeg,
        derivationMethod: 'Correlation from sand/gravel fraction and USCS soil classification',
      }),
      soilCohesionKpa: createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
        unit: 'kPa',
        value: cohesionKpa,
        derivationMethod: 'Correlation from clay fraction and soil classification plasticity',
      }),
      soilDensityKnM3: createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
        unit: 'kN/m³',
        value: densityKnM3,
        derivationMethod: `Analytical estimate: ${densityDerivationMethod}`,
      }),
      frostDepthCm: createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
        unit: 'cm',
        value: frostDepth,
        derivationMethod: 'Latitude-based seasonal frost penetration screening rule',
      }),
    };

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
      frostDepthCm: frostDepth,
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
      fieldProvenance,
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
    densityDerivationMethod: string;
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
        densityDerivationMethod: 'Empirical soil unit weight correlation for cohesive clay: 16.5 + (bdod - 1.3) × 3.0 kN/m³',
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
        densityDerivationMethod: 'Empirical soil unit weight correlation for loose granular sand: 16.0 + (bdod - 1.3) × 2.5 kN/m³',
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
        densityDerivationMethod: 'Empirical soil unit weight correlation for dense sand/gravel: 17.5 + (bdod - 1.4) × 2.5 kN/m³',
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
        densityDerivationMethod: 'Standard engineering unit weight for weathered rock / limestone hardpan: 20.0 kN/m³',
        disclaimer,
      };
    }
  }
}
