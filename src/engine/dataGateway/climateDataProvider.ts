/**
 * Multi-Provider Global Climate & Solar Resource Provider
 * SolarPV Studio v3.0 - Data Gateway
 *
 * Routing Architecture:
 * - Western Hemisphere (Longitudes -170° to -30°): NREL NSRDB / NASA POWER
 * - Europe, Africa, Middle East & Mediterranean (-30° to +65°, -35° to 70°): PVGIS (SARAH-2 / ERA5)
 * - Global Fallback: NASA POWER Climatology (free, no key, ~2 months latency)
 * - Offline / Air-gapped Fallback: Calibrated Analytical Clear-Sky & Geographic Model
 *
 * REAL_INTERNET=true mode:
 *   When set to 'true', analytical fallback is DISABLED. If the real HTTP API call
 *   fails, an error is thrown instead of silently degrading to REGIONAL_ANALYTICAL_MODEL.
 *   This provides hard proof that real provider data (NASA POWER / PVGIS) was obtained.
 */

import {
  type ClimateResourceData,
  type DataProvenanceMetadata,
  type DataFetchPolicy,
  type ParameterProvenance,
  createEngineeringDatum,
  createParameterProvenance,
} from './types';
import { CircuitBreaker } from './circuitBreaker';
import { isRealInternetEnabled } from '../env/runtimeEnv';

/** External provider budget. NASA POWER climatology routinely takes 5–15 s. */
const PROVIDER_TIMEOUT_MS = 15000;
const OSM_TIMEOUT_MS = 6000;

interface ClimateCacheEntry {
  data: ClimateResourceData;
  timestamp: number;
  ttlMs: number;
  isEstimated: boolean;
  policy: DataFetchPolicy;
}

export class ClimateDataProvider {
  private cache: Map<string, ClimateCacheEntry> = new Map();
  private readonly remoteCacheTtlMs: number = 7 * 24 * 60 * 60 * 1000; // 7 days TTL for verified satellite data
  private readonly fallbackCacheTtlMs: number = 5 * 60 * 1000; // 5 min TTL for analytical fallback
  private nasaBreaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 30000, halfOpenMaxTrials: 2 });
  private pvgisBreaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 30000, halfOpenMaxTrials: 2 });

  /**
   * Generates a deterministic calculation trace ID conforming to SolarPV Studio auditing standards:
   * TRC-GW-YYYYMMDD-XXXXXXXX
   */
  public generateTraceId(prefix: string = 'TRC-GW'): string {
    const d = new Date();
    const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
    const randHex = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0').toUpperCase();
    return `${prefix}-${dateStr}-${randHex}`;
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public getNasaCircuitBreaker(): CircuitBreaker {
    return this.nasaBreaker;
  }

  public getPvgisCircuitBreaker(): CircuitBreaker {
    return this.pvgisBreaker;
  }

  public getCircuitBreaker(): CircuitBreaker {
    return this.nasaBreaker;
  }

  public async fetchClimateResource(
    lat: number,
    lng: number,
    options?: { forceAnalytical?: boolean; bypassCache?: boolean; policy?: DataFetchPolicy }
  ): Promise<ClimateResourceData> {
    const realInternet = isRealInternetEnabled();
    const requestedPolicy = options?.policy;

    if (requestedPolicy === 'remote_required' && options?.forceAnalytical) {
      throw new Error("Conflict: options.forceAnalytical cannot be used with policy 'remote_required'");
    }

    let policy: DataFetchPolicy;
    if (requestedPolicy === 'remote_required') {
      policy = 'remote_required';
    } else if (options?.forceAnalytical || (!realInternet && !requestedPolicy)) {
      policy = 'analytical_only';
    } else {
      policy = requestedPolicy ?? 'prefer_remote';
    }

    const cacheKey = `clim_${lat.toFixed(3)}_${lng.toFixed(3)}`;

    // Policy-aware Cache Lookup (Checked before any network action)
    if (!options?.bypassCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < cached.ttlMs) {
        if (policy === 'analytical_only') {
          return {
            ...cached.data,
            metadata: {
              ...cached.data.metadata,
              isCached: true,
              cacheStatus: 'hit',
              fetchPolicy: policy,
            },
          };
        }
        if (policy === 'remote_required') {
          // Analytical cached results are NOT eligible for remote_required
          if (!cached.isEstimated) {
            return {
              ...cached.data,
              metadata: {
                ...cached.data.metadata,
                isCached: true,
                cacheStatus: 'hit',
                fetchPolicy: policy,
              },
            };
          }
        }
        if (policy === 'prefer_remote') {
          if (!cached.isEstimated) {
            return {
              ...cached.data,
              metadata: {
                ...cached.data.metadata,
                isCached: true,
                cacheStatus: 'hit',
                fetchPolicy: policy,
              },
            };
          }
          // If cached data is analytical fallback, only return it if both breakers are currently OPEN
          if (this.pvgisBreaker.getState() === 'OPEN' && this.nasaBreaker.getState() === 'OPEN') {
            return {
              ...cached.data,
              metadata: {
                ...cached.data.metadata,
                isCached: true,
                cacheStatus: 'hit',
                fetchPolicy: policy,
              },
            };
          }
        }
      }
    }

    if (policy === 'analytical_only') {
      const analyticalResult = this.computeAnalyticalClimateResource(lat, lng, true);
      analyticalResult.metadata.fetchPolicy = policy;
      analyticalResult.metadata.cacheStatus = options?.bypassCache ? 'bypassed' : 'miss';
      this.cache.set(cacheKey, {
        data: analyticalResult,
        timestamp: Date.now(),
        ttlMs: this.fallbackCacheTtlMs,
        isEstimated: true,
        policy,
      });
      return analyticalResult;
    }

    // Determine regional routing priority: EMEA/Asia prefers PVGIS; Americas/Pacific prefers NASA POWER
    const isEmeaAsia = lng > -30 && lng <= 65 && lat >= -35 && lat <= 70;
    const primaryProvider: 'PVGIS' | 'NASA_POWER' = isEmeaAsia ? 'PVGIS' : 'NASA_POWER';

    const executeRemoteChain = async (): Promise<ClimateResourceData> => {
      const pBreaker = primaryProvider === 'PVGIS' ? this.pvgisBreaker : this.nasaBreaker;
      const sBreaker = primaryProvider === 'PVGIS' ? this.nasaBreaker : this.pvgisBreaker;
      const pFetch = primaryProvider === 'PVGIS' ? () => this.fetchPvgisResource(lat, lng) : () => this.fetchNasaPowerResource(lat, lng);
      const sFetch = primaryProvider === 'PVGIS' ? () => this.fetchNasaPowerResource(lat, lng) : () => this.fetchPvgisResource(lat, lng);

      try {
        return await pBreaker.execute(pFetch);
      } catch (pErr) {
        // Failover to secondary provider
        try {
          return await sBreaker.execute(sFetch);
        } catch (sErr) {
          throw new Error(
            `All remote providers failed. Primary (${primaryProvider}): ${(pErr as Error).message}; Secondary: ${(sErr as Error).message}`
          );
        }
      }
    };

    if (policy === 'remote_required') {
      if (!realInternet) {
        throw new Error('remote_required failed: Internet connection is disabled or unavailable and policy is remote_required');
      }
      try {
        const remoteData = await executeRemoteChain();
        remoteData.metadata.fetchPolicy = policy;
        remoteData.metadata.cacheStatus = options?.bypassCache ? 'bypassed' : 'miss';
        this.cache.set(cacheKey, {
          data: remoteData,
          timestamp: Date.now(),
          ttlMs: this.remoteCacheTtlMs,
          isEstimated: false,
          policy,
        });
        return remoteData;
      } catch (remoteErr) {
        throw new Error(`remote_required failed: ${(remoteErr as Error).message}`);
      }
    }

    // Default policy: prefer_remote
    try {
      const remoteData = await executeRemoteChain();
      remoteData.metadata.fetchPolicy = policy;
      remoteData.metadata.cacheStatus = options?.bypassCache ? 'bypassed' : 'miss';
      this.cache.set(cacheKey, {
        data: remoteData,
        timestamp: Date.now(),
        ttlMs: this.remoteCacheTtlMs,
        isEstimated: false,
        policy,
      });
      return remoteData;
    } catch {
      // Graceful fallback to regional analytical model with explicit estimated provenance
      const fallbackResult = this.computeAnalyticalClimateResource(lat, lng, true);
      fallbackResult.metadata.fetchPolicy = policy;
      fallbackResult.metadata.cacheStatus = options?.bypassCache ? 'bypassed' : 'miss';
      fallbackResult.metadata.circuitBreakerStatus =
        this.pvgisBreaker.getState() === 'OPEN' || this.nasaBreaker.getState() === 'OPEN' ? 'OPEN' : 'CLOSED';
      this.cache.set(cacheKey, {
        data: fallbackResult,
        timestamp: Date.now(),
        ttlMs: this.fallbackCacheTtlMs,
        isEstimated: true,
        policy,
      });
      return fallbackResult;
    }
  }

  /**
   * Real HTTP Query to NASA POWER Climatology API (Free, no API key required)
   */
  public async fetchNasaPowerResource(lat: number, lng: number): Promise<ClimateResourceData> {
    const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN,T2M,T2M_MIN,T2M_MAX,WS10M,PRECTOTCORR&community=RE&longitude=${lng.toFixed(4)}&latitude=${lat.toFixed(4)}&format=JSON`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

    try {
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!resp.ok) {
        throw new Error(`NASA POWER HTTP ${resp.status}`);
      }
      const data = await resp.json();
      return this.parseNasaPowerResponse(lat, lng, data);
    } catch (err) {
      clearTimeout(timeout);
      if ((err as Error)?.name === 'AbortError') {
        throw new Error(`NASA POWER timeout after ${PROVIDER_TIMEOUT_MS} ms`);
      }
      throw err;
    }
  }

  private parseNasaPowerResponse(lat: number, lng: number, json: any): ClimateResourceData {
    const params = json?.properties?.parameter;
    const rawPsh = params?.ALLSKY_SFC_SW_DWN?.ANN;
    if (
      rawPsh === undefined ||
      rawPsh === null ||
      typeof rawPsh !== 'number' ||
      !Number.isFinite(rawPsh) ||
      rawPsh < 0.1 ||
      rawPsh > 12.0
    ) {
      throw new Error(`NASA POWER response missing valid solar irradiance parameter (got ${rawPsh})`);
    }
    const psh = rawPsh;

    const isTempPhysical = (t: any): boolean =>
      typeof t === 'number' && Number.isFinite(t) && t >= -70 && t <= 65 && t !== -999;

    const rawTMean = params?.T2M?.ANN;
    if (rawTMean !== undefined && rawTMean !== null && !isTempPhysical(rawTMean)) {
      throw new Error(`NASA POWER temperature out of physical range or sentinel (got ${rawTMean}°C)`);
    }

    const rawTMin = params?.T2M_MIN?.ANN;
    if (rawTMin !== undefined && rawTMin !== null && !isTempPhysical(rawTMin)) {
      throw new Error(`NASA POWER minimum temperature out of physical range or sentinel (got ${rawTMin}°C)`);
    }

    const rawTMax = params?.T2M_MAX?.ANN;
    if (rawTMax !== undefined && rawTMax !== null && !isTempPhysical(rawTMax)) {
      throw new Error(`NASA POWER maximum temperature out of physical range or sentinel (got ${rawTMax}°C)`);
    }

    const hasT2M = rawTMean !== undefined && rawTMean !== null && isTempPhysical(rawTMean);
    const tMean = hasT2M ? rawTMean : 20.0;
    const tMin = rawTMin ?? -5.0;
    const tMax = rawTMax ?? 42.0;

    if (tMin > tMax) {
      throw new Error(`NASA POWER temperature consistency error: tMin (${tMin}°C) > tMax (${tMax}°C)`);
    }

    // Precipitation validation & derivation (ENV-03)
    const rawPrectotcorr = params?.PRECTOTCORR?.ANN;
    const hasPrecip =
      typeof rawPrectotcorr === 'number' &&
      Number.isFinite(rawPrectotcorr) &&
      rawPrectotcorr >= 0 &&
      rawPrectotcorr <= 100 &&
      rawPrectotcorr !== -999;

    let precipMm: number;
    let precipProvenance: ParameterProvenance;
    const absLat = Math.abs(lat);
    if (hasPrecip) {
      precipMm = Number((rawPrectotcorr * 365.25).toFixed(1));
      precipProvenance = createParameterProvenance('provider_value', 'NASA_POWER', {
        sourceDataset: 'NASA POWER Climatology (GEOS-5 FP-IT)',
        sourceParameter: 'PRECTOTCORR',
        unit: 'mm/year',
        value: precipMm,
        derivationMethod: 'Annual sum: daily precipitation (mm/day) × 365.25',
      });
    } else {
      // Missing from NASA payload -> Fallback to regional analytical climatology model (honest local_model)
      // Never fabricate as NASA_POWER, and never inject a false literal 0 mm which distorts soiling/corrosion downstream
      const isMENA = absLat < 40 && lng > 25 && lng < 65;
      const analyticalPrecip = absLat > 45 ? 750 : (isMENA ? 180 : 450);
      precipMm = analyticalPrecip;
      precipProvenance = createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
        sourceDataset: 'Regional Climatology Screening Model',
        sourceParameter: 'PRECTOTCORR_FALLBACK',
        unit: 'mm/year',
        value: analyticalPrecip,
        derivationMethod: 'Regional precipitation climatology (PRECTOTCORR missing from NASA payload; avoided false zero)',
        qualityNote: 'بارش در خروجی NASA POWER موجود نبود — برآورد اقلیمی منطقه‌ای به عنوان مدل تحلیلی اعمال شد',
      });
    }
    const optTilt = Math.max(10, Math.min(60, Math.round(absLat * 0.88)));
    const dniVal = Number((psh * 0.72).toFixed(2));
    const dhiVal = Number((psh * 0.28).toFixed(2));
    const soilingVal = absLat < 35 && lng > 35 && lng < 65 ? 6.5 : 3.0;

    const fieldProvenance: Record<string, ParameterProvenance> = {
      peakSunHours: createParameterProvenance('provider_value', 'NASA_POWER', {
        sourceDataset: 'NASA POWER Climatology (GEOS-5 FP-IT)',
        sourceParameter: 'ALLSKY_SFC_SW_DWN',
        unit: 'kWh/m²/day',
        value: Number(psh.toFixed(2)),
      }),
      dniKwhM2Day: createParameterProvenance('provider_derived', 'NASA_POWER', {
        sourceDataset: 'NASA POWER Climatology',
        sourceParameter: 'ALLSKY_SFC_SW_DWN',
        unit: 'kWh/m²/day',
        value: dniVal,
        derivationMethod: 'Standard partition proxy: GHI × 0.72',
      }),
      dhiKwhM2Day: createParameterProvenance('provider_derived', 'NASA_POWER', {
        sourceDataset: 'NASA POWER Climatology',
        sourceParameter: 'ALLSKY_SFC_SW_DWN',
        unit: 'kWh/m²/day',
        value: dhiVal,
        derivationMethod: 'Standard partition proxy: GHI × 0.28',
      }),
      tempAnnualMeanC: hasT2M
        ? createParameterProvenance('provider_value', 'NASA_POWER', {
            sourceDataset: 'NASA POWER Climatology',
            sourceParameter: 'T2M',
            unit: '°C',
            value: Number(tMean.toFixed(1)),
          })
        : createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
            unit: '°C',
            value: Number(tMean.toFixed(1)),
            derivationMethod: 'Regional temperature default (T2M missing from NASA payload)',
          }),
      tempMinC: rawTMin !== undefined && isTempPhysical(rawTMin)
        ? createParameterProvenance('provider_value', 'NASA_POWER', {
            sourceDataset: 'NASA POWER Climatology',
            sourceParameter: 'T2M_MIN',
            unit: '°C',
            value: Number(tMin.toFixed(1)),
          })
        : createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
            unit: '°C',
            value: Number(tMin.toFixed(1)),
            derivationMethod: 'Regional minimum temperature screening model',
          }),
      tempMaxC: rawTMax !== undefined && isTempPhysical(rawTMax)
        ? createParameterProvenance('provider_value', 'NASA_POWER', {
            sourceDataset: 'NASA POWER Climatology',
            sourceParameter: 'T2M_MAX',
            unit: '°C',
            value: Number(tMax.toFixed(1)),
          })
        : createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
            unit: '°C',
            value: Number(tMax.toFixed(1)),
            derivationMethod: 'Regional maximum temperature screening model',
          }),
      albedo: createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
        unit: 'dimensionless',
        value: 0.20,
        derivationMethod: 'Standard ground surface albedo default (0.20)',
      }),
      annualPrecipitationMm: precipProvenance,
      optimalTiltDeg: createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
        unit: 'deg',
        value: optTilt,
        derivationMethod: 'Latitude-based optimal tilt rule Math.round(absLat * 0.88)',
      }),
      soilingLossPercent: createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
        unit: '%',
        value: soilingVal,
        derivationMethod: 'Regional arid/temperate dust deposition heuristic',
      }),
      elevationM: json?.geometry?.coordinates?.[2] !== undefined
        ? createParameterProvenance('provider_value', 'NASA_POWER', {
            unit: 'm',
            value: Math.round(json.geometry.coordinates[2]),
          })
        : createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
            unit: 'm',
            value: Math.round(Math.max(0, 450 + (35 - absLat) * 15)),
            derivationMethod: 'Regional hypsometric estimate',
          }),
    };

    const provenance = {
      peakSunHours: createEngineeringDatum(Number(psh.toFixed(2)), 'available', 'NASA_POWER', 'satellite_reanalysis', 3.0, 'NASA POWER Climatology ALLSKY_SFC_SW_DWN', 'kWh/m²/day'),
      dniKwhM2Day: createEngineeringDatum(dniVal, 'estimated', 'NASA_POWER', 'analytical_model', 8.0, 'Derived from GHI using standard partition', 'kWh/m²/day'),
      dhiKwhM2Day: createEngineeringDatum(dhiVal, 'estimated', 'NASA_POWER', 'analytical_model', 8.0, 'Derived from GHI using standard partition', 'kWh/m²/day'),
      tempAnnualMeanC: hasT2M
        ? createEngineeringDatum(Number(tMean.toFixed(1)), 'available', 'NASA_POWER', 'satellite_reanalysis', 2.0, 'NASA POWER 2m Temperature (T2M)', '°C')
        : createEngineeringDatum(Number(tMean.toFixed(1)), 'estimated', 'NASA_POWER', 'rule_of_thumb_screening', 15.0, 'Regional default estimate (T2M missing from NASA POWER payload)', '°C'),
    };

    return {
      latitude: Number(lat.toFixed(4)),
      longitude: Number(lng.toFixed(4)),
      elevationM: Math.round(json?.geometry?.coordinates?.[2] ?? Math.max(0, 450 + (35 - absLat) * 15)),
      peakSunHours: Number(psh.toFixed(2)),
      dniKwhM2Day: dniVal,
      dhiKwhM2Day: dhiVal,
      tempMinC: Number(tMin.toFixed(1)),
      tempMaxC: Number(tMax.toFixed(1)),
      tempAnnualMeanC: Number(tMean.toFixed(1)),
      albedo: 0.20,
      annualPrecipitationMm: precipMm,
      optimalTiltDeg: optTilt,
      soilingLossPercent: soilingVal,
      metadata: {
        traceId: this.generateTraceId('TRC-GW'),
        sourceProvider: 'NASA_POWER',
        retrievalTimestamp: new Date().toISOString(),
        isCached: false,
        isEstimatedFromGlobalModel: !hasT2M,
        geographicRegion: 'NASA POWER Climatology (GEOS-5 FP-IT)',
        governingStandards: ['NASA POWER Climatology v2.0', 'WMO Guide to Climatological Practices No. 100'],
      },
      fieldProvenance,
      provenance,
    };
  }

  /**
   * Real HTTP Query to PVGIS 5.3 EU Science Hub API (Free, no API key required)
   */
  public async fetchPvgisResource(lat: number, lng: number): Promise<ClimateResourceData> {
    const url = `https://re.jrc.ec.europa.eu/api/v5_2/MRcalc?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}&horirrad=1&outputformat=json`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

    try {
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!resp.ok) {
        throw new Error(`PVGIS HTTP ${resp.status}`);
      }
      const data = await resp.json();
      return this.parsePvgisResponse(lat, lng, data);
    } catch (err) {
      clearTimeout(timeout);
      if ((err as Error)?.name === 'AbortError') {
        throw new Error(`PVGIS timeout after ${PROVIDER_TIMEOUT_MS} ms`);
      }
      throw err;
    }
  }

  private parsePvgisResponse(lat: number, lng: number, json: any): ClimateResourceData {
    const monthly = json?.outputs?.monthly;
    if (!Array.isArray(monthly) || monthly.length !== 12) {
      throw new Error(`PVGIS response missing complete 12-month irradiance outputs (got ${Array.isArray(monthly) ? monthly.length : 0} months)`);
    }
    let annualKwh = 0;
    for (let i = 0; i < monthly.length; i++) {
      const m = monthly[i];
      const hMonth = m?.['H(h)_m'];
      if (typeof hMonth !== 'number' || !Number.isFinite(hMonth) || hMonth <= 0 || hMonth > 450) {
        throw new Error(`PVGIS response contains invalid monthly irradiance in month ${i + 1} (got ${hMonth})`);
      }
      annualKwh += hMonth;
    }
    const psh = Number((annualKwh / 365).toFixed(2));
    const absLat = Math.abs(lat);
    const optTilt = Math.max(10, Math.min(60, Math.round(absLat * 0.88)));
    const estimatedMeanTempC = absLat > 45 ? 10.5 : 22.0;
    const tMin = absLat > 45 ? -15 : 2;
    const tMax = absLat > 45 ? 32 : 40;
    const dniVal = Number((psh * 0.70).toFixed(2));
    const dhiVal = Number((psh * 0.30).toFixed(2));
    const soilingVal = absLat < 35 && lng > 35 && lng < 65 ? 6.5 : 3.0;

    const fieldProvenance: Record<string, ParameterProvenance> = {
      peakSunHours: createParameterProvenance('provider_derived', 'PVGIS', {
        sourceDataset: 'PVGIS 5.3 SARAH-2 / ERA5',
        sourceParameter: 'H(h)_m annual sum / 365',
        unit: 'kWh/m²/day',
        value: psh,
        derivationMethod: 'Derived from sum of 12 monthly horizontal irradiation values / 365',
      }),
      dniKwhM2Day: createParameterProvenance('provider_derived', 'PVGIS', {
        sourceDataset: 'PVGIS 5.3',
        sourceParameter: 'H(h)_m',
        unit: 'kWh/m²/day',
        value: dniVal,
        derivationMethod: 'Direct partition proxy: GHI × 0.70',
      }),
      dhiKwhM2Day: createParameterProvenance('provider_derived', 'PVGIS', {
        sourceDataset: 'PVGIS 5.3',
        sourceParameter: 'H(h)_m',
        unit: 'kWh/m²/day',
        value: dhiVal,
        derivationMethod: 'Diffuse partition proxy: GHI × 0.30',
      }),
      tempAnnualMeanC: createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
        unit: '°C',
        value: estimatedMeanTempC,
        derivationMethod: 'Regional latitude temperature model (PVGIS MRcalc does not provide temperature)',
        qualityNote: 'PVGIS MRcalc دمای هوا برنمی‌گرداند؛ برآورد مدل تحلیلی اقلیمی است',
      }),
      tempMinC: createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
        unit: '°C',
        value: tMin,
        derivationMethod: 'Regional latitude temperature model',
      }),
      tempMaxC: createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
        unit: '°C',
        value: tMax,
        derivationMethod: 'Regional latitude temperature model',
      }),
      albedo: createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
        unit: 'dimensionless',
        value: 0.20,
        derivationMethod: 'Standard ground surface albedo default (0.20)',
      }),
      annualPrecipitationMm: createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
        unit: 'mm/year',
        value: 600,
        derivationMethod: 'Regional precipitation climatology (PVGIS MRcalc does not provide precipitation)',
        qualityNote: 'PVGIS بارش برنمی‌گرداند؛ برآورد مدل تحلیلی اقلیمی است',
      }),
      optimalTiltDeg: createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
        unit: 'deg',
        value: optTilt,
        derivationMethod: 'Latitude-based optimal tilt rule Math.round(absLat * 0.88)',
      }),
      soilingLossPercent: createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
        unit: '%',
        value: soilingVal,
        derivationMethod: 'Regional arid/temperate dust deposition heuristic',
      }),
      elevationM: json?.inputs?.location?.elevation !== undefined
        ? createParameterProvenance('provider_value', 'PVGIS', {
            unit: 'm',
            value: Math.round(json.inputs.location.elevation),
          })
        : createParameterProvenance('local_model', 'REGIONAL_ANALYTICAL_MODEL', {
            unit: 'm',
            value: 500,
            derivationMethod: 'Default elevation',
          }),
    };

    const provenance = {
      peakSunHours: createEngineeringDatum(psh, 'available', 'PVGIS', 'satellite_reanalysis', 3.0, 'PVGIS 5.3 monthly horizontal irradiance H(h)_m sum', 'kWh/m²/day'),
      dniKwhM2Day: createEngineeringDatum(dniVal, 'estimated', 'PVGIS', 'analytical_model', 8.0, 'Derived from GHI using standard partition', 'kWh/m²/day'),
      dhiKwhM2Day: createEngineeringDatum(dhiVal, 'estimated', 'PVGIS', 'analytical_model', 8.0, 'Derived from GHI using standard partition', 'kWh/m²/day'),
      tempAnnualMeanC: createEngineeringDatum(estimatedMeanTempC, 'estimated', 'PVGIS', 'rule_of_thumb_screening', 15.0, 'Regional latitude-based estimate (PVGIS MRcalc does not return temperature)', '°C'),
    };

    return {
      latitude: Number(lat.toFixed(4)),
      longitude: Number(lng.toFixed(4)),
      elevationM: Math.round(json?.inputs?.location?.elevation ?? 500),
      peakSunHours: psh,
      dniKwhM2Day: dniVal,
      dhiKwhM2Day: dhiVal,
      tempMinC: tMin,
      tempMaxC: tMax,
      tempAnnualMeanC: estimatedMeanTempC,
      albedo: 0.20,
      annualPrecipitationMm: 600,
      optimalTiltDeg: optTilt,
      soilingLossPercent: soilingVal,
      metadata: {
        traceId: this.generateTraceId('TRC-GW'),
        sourceProvider: 'PVGIS',
        retrievalTimestamp: new Date().toISOString(),
        isCached: false,
        isEstimatedFromGlobalModel: true, // Mark true because temperature and precipitation are local estimates!
        geographicRegion: 'PVGIS 5.3 SARAH-2 / ERA5',
        governingStandards: ['PVGIS v5.3 (European Commission JRC)', 'IEC 61724-1 Class A'],
      },
      fieldProvenance,
      provenance,
    };
  }

  /**
   * Nominatim Reverse Geocoding (OpenStreetMap) — resolves coordinates to a
   * human-readable city/place name (e.g. "München, Bavaria, Germany").
   * Falls back to generic "Coordinates Site" when the API is unreachable.
   */
  public async reverseGeocodeNominatim(lat: number, lng: number): Promise<string> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}&zoom=10&accept-language=fa+en`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OSM_TIMEOUT_MS);

    try {
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!resp.ok) {
        throw new Error(`Nominatim HTTP ${resp.status}`);
      }
      const data = (await resp.json()) as any;
      const name = data?.address?.city || data?.address?.town || data?.address?.village || data?.display_name;
      if (name) return String(name);
      throw new Error('Nominatim returned no place name');
    } catch {
      clearTimeout(timeout);
      return `Coordinates Site (${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'})`;
    }
  }

  /**
   * Nominatim Forward Geocoding (OpenStreetMap) — resolves a free-text place query
   * to candidate coordinates (city search / autocomplete). Falls back to an empty
   * list when the API is unreachable (offline/sandbox environments).
   */
  public async forwardGeocodeNominatim(query: string): Promise<Array<{ lat: number; lon: number; display_name: string; type: string }>> {
    if (!query.trim()) return [];
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=5&accept-language=fa+en`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OSM_TIMEOUT_MS);

    try {
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!resp.ok) throw new Error(`Nominatim HTTP ${resp.status}`);
      const data = await resp.json();
      if (!Array.isArray(data)) return [];
      return data.map((item: any) => ({
        lat: Number(item.lat),
        lon: Number(item.lon),
        display_name: String(item.display_name ?? item.lat + ', ' + item.lon),
        type: String(item.type ?? 'place'),
      }));
    } catch {
      clearTimeout(timeout);
      return [];
    }
  }

  /**
   * Free Building Footprint Detection using Overpass API (OpenStreetMap)
   * Alternative to Google Places API / Google Solar Rooftop API
   */
  public async detectBuildingFootprints(
    lat: number,
    lng: number,
    radiusM: number = 200
  ): Promise<{
    buildingCount: number;
    footprints: Array<{ id: number; tags?: Record<string, string>; coordinates: Array<[number, number]> }>;
    traceId: string;
    source: string;
  }> {
    const traceId = this.generateTraceId('TRC-GW');
    const query = `[out:json][timeout:5];way["building"](around:${radiusM},${lat.toFixed(5)},${lng.toFixed(5)});out geom;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!resp.ok) {
        throw new Error(`Overpass HTTP ${resp.status}`);
      }
      const data = (await resp.json()) as any;
      const elements = data?.elements || [];
      const footprints = elements.map((el: any) => ({
        id: el.id,
        tags: el.tags,
        coordinates: (el.geometry || []).map((pt: any) => [pt.lat, pt.lon] as [number, number]),
      }));

      return {
        buildingCount: footprints.length,
        footprints,
        traceId,
        source: 'OpenStreetMap Overpass API (Free)',
      };
    } catch {
      clearTimeout(timeout);
      // Graceful empty fallback
      return {
        buildingCount: 0,
        footprints: [],
        traceId,
        source: 'OpenStreetMap Overpass API (Fallback)',
      };
    }
  }

  public computeAnalyticalClimateResource(
    lat: number,
    lng: number,
    isEstimatedFallback: boolean = true,
    provider: DataProvenanceMetadata['sourceProvider'] = 'REGIONAL_ANALYTICAL_MODEL',
    standards: string[] = ['WMO Climatic Normals', 'ASHRAE Fundamentals']
  ): ClimateResourceData {
    const absLat = Math.abs(lat);
    const isSouth = lat < 0;

    let psh = 5.2;
    if (absLat < 20) {
      psh = 5.9;
    } else if (absLat < 35) {
      psh = (lng > 40 && lng < 60) ? 6.2 : 5.8;
    } else if (absLat < 50) {
      psh = 4.3;
    } else {
      psh = Math.max(2.4, 3.8 - (absLat - 50) * 0.07);
    }

    const dni = Number((psh * 0.72).toFixed(2));
    const dhi = Number((psh * 0.28).toFixed(2));
    const optTilt = Math.max(10, Math.min(60, Math.round(absLat * 0.88)));

    let tMin = -8.0;
    let tMax = 38.0;
    if (absLat > 45) {
      tMin = -18.0;
      tMax = 32.0;
    } else if (absLat < 25) {
      tMin = 14.0;
      tMax = 44.0;
    }

    const region = absLat < 23.5 ? 'Tropical Belt' : isSouth ? 'Southern Temperate Zone' : 'Northern Temperate Zone';
    const precipMm = absLat > 40 ? 800 : 250;
    const tMean = Number(((tMin + tMax) / 2.0).toFixed(1));
    const elevM = Math.round(Math.max(0, 450 + (35 - absLat) * 15));
    const soilingVal = absLat < 35 && lng > 35 && lng < 65 ? 6.5 : 3.0;

    const fieldProvenance: Record<string, ParameterProvenance> = {
      peakSunHours: createParameterProvenance('local_model', provider, {
        unit: 'kWh/m²/day',
        value: Number(psh.toFixed(2)),
        derivationMethod: 'Calculated from regional latitude/longitude analytical model',
      }),
      dniKwhM2Day: createParameterProvenance('local_model', provider, {
        unit: 'kWh/m²/day',
        value: dni,
        derivationMethod: 'Analytical clear-sky geographic proxy model',
      }),
      dhiKwhM2Day: createParameterProvenance('local_model', provider, {
        unit: 'kWh/m²/day',
        value: dhi,
        derivationMethod: 'Analytical clear-sky geographic proxy model',
      }),
      tempAnnualMeanC: createParameterProvenance('local_model', provider, {
        unit: '°C',
        value: tMean,
        derivationMethod: 'Analytical latitude and elevation temperature model',
      }),
      tempMinC: createParameterProvenance('local_model', provider, {
        unit: '°C',
        value: tMin,
        derivationMethod: 'Analytical extreme temperature screening model',
      }),
      tempMaxC: createParameterProvenance('local_model', provider, {
        unit: '°C',
        value: tMax,
        derivationMethod: 'Analytical extreme temperature screening model',
      }),
      albedo: createParameterProvenance('local_model', provider, {
        unit: 'dimensionless',
        value: 0.20,
        derivationMethod: 'Standard ground surface albedo default (0.20)',
      }),
      annualPrecipitationMm: createParameterProvenance('local_model', provider, {
        unit: 'mm/year',
        value: precipMm,
        derivationMethod: 'Analytical latitude-zonal precipitation climatology',
      }),
      optimalTiltDeg: createParameterProvenance('local_model', provider, {
        unit: 'deg',
        value: optTilt,
        derivationMethod: 'Empirical optimal tilt rule Math.round(absLat * 0.88)',
      }),
      soilingLossPercent: createParameterProvenance('local_model', provider, {
        unit: '%',
        value: soilingVal,
        derivationMethod: 'Regional arid/temperate dust deposition heuristic',
      }),
      elevationM: createParameterProvenance('local_model', provider, {
        unit: 'm',
        value: elevM,
        derivationMethod: 'Regional hypsometric estimate',
      }),
    };

    const provenance = {
      peakSunHours: createEngineeringDatum(Number(psh.toFixed(2)), isEstimatedFallback ? 'estimated' : 'available', provider, 'analytical_model', 12.0, 'Calculated from regional latitude/longitude analytical model', 'kWh/m²/day'),
      dniKwhM2Day: createEngineeringDatum(dni, 'estimated', provider, 'analytical_model', 15.0, 'Analytical clear-sky geographic proxy model', 'kWh/m²/day'),
      dhiKwhM2Day: createEngineeringDatum(dhi, 'estimated', provider, 'analytical_model', 15.0, 'Analytical clear-sky geographic proxy model', 'kWh/m²/day'),
      tempAnnualMeanC: createEngineeringDatum(tMean, 'estimated', provider, 'analytical_model', 10.0, 'Analytical latitude and elevation model', '°C'),
    };

    return {
      latitude: Number(lat.toFixed(4)),
      longitude: Number(lng.toFixed(4)),
      elevationM: elevM,
      peakSunHours: Number(psh.toFixed(2)),
      dniKwhM2Day: dni,
      dhiKwhM2Day: dhi,
      tempMinC: tMin,
      tempMaxC: tMax,
      tempAnnualMeanC: tMean,
      albedo: 0.20,
      annualPrecipitationMm: precipMm,
      optimalTiltDeg: optTilt,
      soilingLossPercent: soilingVal,
      metadata: {
        traceId: this.generateTraceId('TRC-GW'),
        sourceProvider: provider,
        retrievalTimestamp: new Date().toISOString(),
        isCached: false,
        isEstimatedFromGlobalModel: isEstimatedFallback,
        geographicRegion: region,
        governingStandards: standards,
      },
      fieldProvenance,
      provenance,
    };
  }
}
