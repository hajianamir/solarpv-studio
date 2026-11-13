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
import { combineProviderSignals, fetchProvider } from './providerRequestLimiter';

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
        const timeoutId = setTimeout(() => controller.abort(new Error('ISRIC timeout')), PROVIDER_TIMEOUT_MS);
        const signal = combineProviderSignals(options?.signal, controller.signal);

        try {
          const resp = await fetchProvider('isric_soilgrids', url, { signal });
          if (!resp.ok) {
            throw new Error(`ISRIC SoilGrids returned HTTP ${resp.status}`);
          }
          const json = await resp.json();
          return this.parseSoilGridsResponse(lat, lng, json);
        } catch (fetchErr) {
          if (options?.signal?.aborted) {
            const abortError = new Error('Soil property query aborted by caller');
            abortError.name = 'AbortError';
            throw abortError;
          }
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
    // SoilGrids output is evaluated against its requested 0-30 cm domain. Unknown,
    // duplicated or overlapping intervals are never converted into assumed thicknesses.
    const parseDepthInterval = (depthObj: any): { top: number; bottom: number; label: string } | null => {
      let top: number;
      let bottom: number;
      if (typeof depthObj?.range?.top_depth === 'number' && typeof depthObj?.range?.bottom_depth === 'number') {
        top = depthObj.range.top_depth;
        bottom = depthObj.range.bottom_depth;
      } else if (typeof depthObj?.label === 'string') {
        const match = depthObj.label.match(/(\d+)-(\d+)\s*cm/i);
        if (!match) return null;
        top = Number(match[1]);
        bottom = Number(match[2]);
      } else {
        return null;
      }
      if (!Number.isFinite(top) || !Number.isFinite(bottom) || top < 0 || bottom <= top || bottom > 30) return null;
      return { top, bottom, label: `${top}-${bottom}cm` };
    };

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
    const depthByProperty: Record<string, string> = {};
    const depthCoverageComplete: Record<string, boolean> = {};
    const depthProblemByProperty: Record<string, string> = {};
    const knownProperties = new Set(['clay', 'sand', 'silt', 'bdod', 'phh2o']);
    const seenProperties = new Set<string>();

    const layers = json?.properties?.layers;
    if (Array.isArray(layers)) {
      for (const layer of layers) {
        const name = String(layer?.name ?? '');
        if (!knownProperties.has(name)) continue;
        if (seenProperties.has(name)) {
          depthProblemByProperty[name] = 'duplicate property layer';
          depthCoverageComplete[name] = false;
          if (name === 'clay') hasClay = false;
          if (name === 'sand') hasSand = false;
          if (name === 'silt') hasSilt = false;
          if (name === 'bdod') hasBdod = false;
          if (name === 'phh2o') hasPh = false;
          continue;
        }
        seenProperties.add(name);
        const depths = layer?.depths;
        if (!Array.isArray(depths) || depths.length === 0) {
          depthProblemByProperty[name] = 'no depth records';
          continue;
        }
        const samples: Array<{ top: number; bottom: number; label: string; value: number }> = [];
        let invalidRecord = false;
        for (const depth of depths) {
          const interval = parseDepthInterval(depth);
          const value = depth?.values?.mean;
          if (!interval || typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
            invalidRecord = true;
            continue;
          }
          samples.push({ ...interval, value });
        }
        samples.sort((a, b) => a.top - b.top || a.bottom - b.bottom);
        for (let i = 1; i < samples.length; i++) {
          if (samples[i].top < samples[i - 1].bottom) invalidRecord = true;
        }
        if (invalidRecord || samples.length === 0) {
          depthProblemByProperty[name] = invalidRecord ? 'invalid, duplicate or overlapping depth record' : 'no valid interval';
          continue;
        }

        let coveredTo = 0;
        let complete = samples[0].top === 0;
        for (const sample of samples) {
          if (sample.top !== coveredTo) complete = false;
          coveredTo = sample.bottom;
        }
        complete = complete && coveredTo === 30;
        const weighted = samples.reduce((sum, sample) => sum + sample.value * (sample.bottom - sample.top), 0);
        const weight = samples.reduce((sum, sample) => sum + (sample.bottom - sample.top), 0);
        const mean = weighted / weight;
        const labels = samples.map((sample) => sample.label);
        depthByProperty[name] = labels.join(' + ');
        depthCoverageComplete[name] = complete;
        if (!complete) {
          const gaps: string[] = [];
          let cursor = 0;
          for (const sample of samples) {
            if (sample.top > cursor) gaps.push(`${cursor}-${sample.top}cm missing`);
            cursor = Math.max(cursor, sample.bottom);
          }
          if (cursor < 30) gaps.push(`${cursor}-30cm missing`);
          depthProblemByProperty[name] = gaps.join(', ') || 'incomplete 0-30 cm coverage';
        }
        if (name === 'clay') { clayPct = mean / 10.0; hasClay = true; }
        if (name === 'sand') { sandPct = mean / 10.0; hasSand = true; }
        if (name === 'silt') { siltPct = mean / 10.0; hasSilt = true; }
        if (name === 'bdod') { bdodGcm3 = mean / 100.0; hasBdod = true; }
        if (name === 'phh2o') { ph = mean / 10.0; hasPh = true; }
      }
    }

    const depthLabel = 'NO_VALID_INTERVAL';
    const clayDepth = depthByProperty.clay || depthLabel;
    const sandDepth = depthByProperty.sand || depthLabel;
    const siltDepth = depthByProperty.silt || depthLabel;
    const bdodDepth = depthByProperty.bdod || depthLabel;
    const phDepth = depthByProperty.phh2o || depthLabel;
    const requiredDepthProperties = ['clay', 'sand', 'silt', 'bdod', 'phh2o'];
    const hasUniformDepth = requiredDepthProperties.every((name) => depthCoverageComplete[name] === true);
    const depthDescriptions = requiredDepthProperties.map((name) =>
      `${name} (${depthByProperty[name] || 'unavailable'}${depthProblemByProperty[name] ? `; ${depthProblemByProperty[name]}` : ''})`
    );
    const depthOverlapNote = hasUniformDepth
      ? undefined
      : `Incomplete 0-30cm coverage or inconsistent interval records: ${depthDescriptions.join('; ')}. Values use only valid listed intervals and are not a complete 0-30cm profile.`;

    // Check individual fraction bounds (0 to 100%)
    if (hasClay && (clayPct < 0 || clayPct > 100)) hasClay = false;
    if (hasSand && (sandPct < 0 || sandPct > 100)) hasSand = false;
    if (hasSilt && (siltPct < 0 || siltPct > 100)) hasSilt = false;

    // Rejected duplicate/invalid layers must not leak an earlier sample into the
    // analytical result or its derived density. These match the missing-property
    // defaults, rather than relabeling provider values as a local model.
    if (hasBdod && (bdodGcm3 <= 0 || bdodGcm3 > 3)) {
      hasBdod = false;
      depthProblemByProperty.bdod = 'bulk density outside physical range';
    }
    if (hasPh && (ph < 0 || ph > 14)) {
      hasPh = false;
      depthProblemByProperty.phh2o = 'pH outside physical range';
    }
    if (!hasBdod) bdodGcm3 = 1.45;
    if (!hasPh) ph = 7.0;

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
            qualityNote: `${depthOverlapNote ?? ''} ISRIC texture incomplete or inconsistent (${missingFractions.join(', ')}); analytical estimate used. لایه خاک ناقص یا ناسازگار بود — برآورد تحلیلی`,
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
            qualityNote: `${depthOverlapNote ?? ''} ISRIC texture incomplete or inconsistent (${missingFractions.join(', ')}); analytical estimate used. لایه خاک ناقص یا ناسازگار بود — برآورد تحلیلی`,
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
            qualityNote: `${depthOverlapNote ?? ''} ISRIC texture incomplete or inconsistent (${missingFractions.join(', ')}); analytical estimate used. لایه خاک ناقص یا ناسازگار بود — برآورد تحلیلی`,
          }),
      bulkDensityGPerCm3: hasBdod
        ? createParameterProvenance(depthCoverageComplete.bdod ? 'provider_value' : 'provider_derived', 'ISRIC_SOILGRIDS', {
            sourceDataset: 'SoilGrids 250m v2.0',
            sourceParameter: `bdod/mean (${bdodDepth})`,
            unit: 'g/cm³',
            value: Number(bdodGcm3.toFixed(2)),
            qualityNote: depthCoverageComplete.bdod ? undefined : depthOverlapNote,
          })
        : createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
            unit: 'g/cm³',
            value: Number(bdodGcm3.toFixed(2)),
            derivationMethod: 'Geomorphic zonal dry bulk density estimate (bdod missing from ISRIC payload)',
            qualityNote: `${depthOverlapNote ?? ''} Bulk density was missing or rejected from ISRIC; analytical estimate used. چگالی ظاهری خاک موجود یا معتبر نبود — برآورد تحلیلی`,
          }),
      phH2O: hasPh
        ? createParameterProvenance(depthCoverageComplete.phh2o ? 'provider_value' : 'provider_derived', 'ISRIC_SOILGRIDS', {
            sourceDataset: 'SoilGrids 250m v2.0',
            sourceParameter: `phh2o/mean (${phDepth})`,
            unit: 'pH',
            value: Number(ph.toFixed(1)),
            qualityNote: depthCoverageComplete.phh2o ? undefined : depthOverlapNote,
          })
        : createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
            unit: 'pH',
            value: Number(ph.toFixed(1)),
            derivationMethod: 'Neutral soil pH default (7.0)',
            qualityNote: `${depthOverlapNote ?? ''} ISRIC pH was missing or rejected; neutral analytical estimate used.`,
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
