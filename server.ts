try {
  // @ts-ignore
  await import('dotenv/config');
} catch {
  try {
    // Native Node 20.6+ fallback if dotenv package is not present in legacy node_modules
    if (typeof (process as any).loadEnvFile === 'function' && fs.existsSync('.env')) {
      (process as any).loadEnvFile('.env');
    }
  } catch {}
}
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import {
  InMemorySolarDatabase,
  calculateSolarPosition,
  calculatePoaIrradiance,
  calculateStringSizing,
  calculateVoltageDropDc,
  calculateLcoe,
  calculateNpv,
  calculateIrr,
  calculateIrrDetailed,
  calculateShadingFactor,
  performQuickSizing,
  DEFAULT_MODULES,
  DEFAULT_INVERTERS,
  DEFAULT_BATTERIES,
  type Project,
} from './src/engine/solarPvEngine.js';
import { calculateThermalDerate } from './src/engine/core/thermalDerate.js';
import {
  normalizeUtcTimestampSeconds,
  southToNorthAzimuth,
  asNorthAzimuthDeg,
} from './src/engine/core/solarGeometryContract.js';
import { ExternalDataGateway } from './src/engine/dataGateway/externalDataGateway.js';
import { GeocodingError } from './src/engine/dataGateway/climateDataProvider.js';
import {
  BoundedGeocodeCache,
  MAX_GEOCODE_QUERY_BYTES,
  isGeocodeQueryWithinLimit,
  normalizeGeocodeQuery,
} from './src/engine/dataGateway/geocodeCache.js';
import { isRealInternetEnabled } from './src/engine/env/runtimeEnv.js';

const app = express();
const rawPort = Number(process.env.PORT) || Number(process.env.APP_PORT);
const PORT = Number.isInteger(rawPort) && rawPort >= 1 && rawPort <= 65535 ? rawPort : 3000;
const isProduction = process.env.NODE_ENV === 'production';
const appInstanceCount = Number(process.env.APP_INSTANCE_COUNT ?? 1);
if (appInstanceCount > 1 && (!process.env.PROVIDER_LIMITER_REDIS_REST_URL || !process.env.PROVIDER_LIMITER_REDIS_REST_TOKEN)) {
  throw new Error(
    'APP_INSTANCE_COUNT > 1 requires PROVIDER_LIMITER_REDIS_REST_URL and PROVIDER_LIMITER_REDIS_REST_TOKEN for cross-instance provider rate coordination.'
  );
}

// Disable Express fingerprinting header (P3-02)
app.disable('x-powered-by');

// Global standard security headers (P3-02 / MAIN-02)
function securityHeadersMiddleware(_req: Request, res: Response, next: (e?: any) => void): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.tile.opentopomap.org https://server.arcgisonline.com",
      "connect-src 'self' https://developer.nrel.gov https://re.jrc.ec.europa.eu https://power.larc.nasa.gov https://nominatim.openstreetmap.org https://overpass-api.de https://rest.isric.org ws: wss:",
      "worker-src 'self' blob:",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ')
  );
  next();
}
app.use(securityHeadersMiddleware);

function isProductionEnv(): boolean {
  return process.env.NODE_ENV === 'production';
}

function isAuthConfigured(): boolean {
  return Boolean(process.env.INTERNAL_GATEWAY_SECRET || process.env.JWT_SECRET);
}

const BUILT_IN_CATALOG_IDS = new Set<string>([
  ...DEFAULT_MODULES.map(m => m.id),
  ...DEFAULT_INVERTERS.map(i => i.id),
  ...DEFAULT_BATTERIES.map(b => b.id),
  'mod-jinko-550',
  'mod-longi-540',
  'inv-huawei-100k',
  'inv-sma-50k',
  'bat-byd-lvs',
]);

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '2mb' }));

// Robust JSON body parse error handler (P3-01 / MAIN-01)
function jsonErrorHandler(err: any, req: Request, res: Response, next: (e?: any) => void): void {
  if (err) {
    if (err.type === 'entity.too.large' || err.status === 413) {
      res.status(413).json({
        error: 'Payload Too Large',
        message: 'The request body exceeds the maximum permitted payload size.',
      });
      return;
    }
    if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
      res.status(400).json({
        error: 'Invalid JSON payload in request body.',
        message: (err as any).message || 'Malformed JSON syntax',
      });
      return;
    }
    if (typeof err.status === 'number' && (req.path?.startsWith('/api') || req.originalUrl?.startsWith('/api'))) {
      res.status(err.status).json({
        error: err.name || 'Bad Request',
        message: err.message || 'Error processing request body',
      });
      return;
    }
  }
  next(err);
}
app.use(jsonErrorHandler);

// In-Memory Database store with persistent file recovery
const db = new InMemorySolarDatabase();
let DB_PERSIST_PATH = process.env.SOLARPV_DB_FILE || path.resolve(process.cwd(), 'data/solar-db-snapshot.json');

function setPersistPathForTesting(newPath: string): void {
  DB_PERSIST_PATH = newPath;
}

function saveDatabase(): boolean {
  try {
    const dir = path.dirname(DB_PERSIST_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const snapshot = db.exportSnapshot();
    const tmpPath = `${DB_PERSIST_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(snapshot, null, 2), 'utf-8');
    fs.renameSync(tmpPath, DB_PERSIST_PATH);
    return true;
  } catch (err) {
    console.error('[SolarPV Studio] Failed to persist database snapshot:', err);
    return false;
  }
}

function loadDatabase(): void {
  try {
    if (fs.existsSync(DB_PERSIST_PATH)) {
      const raw = fs.readFileSync(DB_PERSIST_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      const ok = db.importSnapshot(parsed);
      if (ok) {
        console.log(`[SolarPV Studio] Restored database from snapshot: ${db.projects.size} projects loaded.`);
        return;
      }
    }
  } catch (err) {
    console.warn('[SolarPV Studio] Could not load database snapshot, starting with initial seeds:', err);
  }

  // Seed Tehran Villa System if database has no projects
  if (db.projects.size === 0) {
    try {
      performQuickSizing(
        {
          projectName: 'Tehran Villa System',
          latitude: 35.6895,
          longitude: 51.389,
          dailyKwh: 20.0,
          autonomyDays: 1.5,
          moduleId: DEFAULT_MODULES[0]?.id || 'mod-default',
          inverterId: DEFAULT_INVERTERS[0]?.id || 'inv-default',
          batteryId: DEFAULT_BATTERIES[0]?.id || 'bat-default',
        },
        db
      );
      saveDatabase();
    } catch (seedErr) {
      console.warn('[SolarPV Studio] Initial project seed warning:', seedErr);
    }
  }
}

// Initialize database from persistent snapshot
loadDatabase();

// Flush database on process exit
process.on('SIGINT', () => {
  saveDatabase();
  process.exit(0);
});
process.on('SIGTERM', () => {
  saveDatabase();
  process.exit(0);
});

// ----------------------------------------------------------------
// API ROUTES
// ----------------------------------------------------------------

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    projectsCount: db.projects.size,
    isPersistent: fs.existsSync(DB_PERSIST_PATH),
  });
});

// ---- External Data Gateway proxy (same-origin; removes browser CORS/CSP dependency) ----
const geocodeCache = new BoundedGeocodeCache<any[]>();

function requestAbortController(req: Request, res: Response): AbortController {
  const controller = new AbortController();
  const abortIfDisconnected = () => {
    if (!res.writableEnded) controller.abort(new Error('HTTP client disconnected'));
  };
  req.once('aborted', abortIfDisconnected);
  res.once('close', abortIfDisconnected);
  return controller;
}

app.get('/api/v1/gateway/site', async (req: Request, res: Response) => {
  const rawLat = req.query.lat;
  const rawLng = req.query.lng;
  if (typeof rawLat !== 'string' || typeof rawLng !== 'string' || rawLat.trim() === '' || rawLng.trim() === '') {
    return res.status(400).json({ ok: false, error: 'Latitude and longitude query parameters are required and cannot be empty.' });
  }
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ ok: false, error: 'Invalid latitude/longitude: lat must be between -90 and 90, lng between -180 and 180.' });
  }

  const startedAt = Date.now();
  const controller = requestAbortController(req, res);
  try {
    const data = await ExternalDataGateway.getInstance().getComprehensiveSiteData(lat, lng, { signal: controller.signal });
    if (controller.signal.aborted || res.destroyed) return;

    const meta = data.climateResource?.metadata;
    const isSolarLive = Boolean(meta) &&
      meta.sourceProvider !== 'REGIONAL_ANALYTICAL_MODEL' && !meta.isEstimatedFromGlobalModel && data.climateResource.peakSunHours > 0;
    const isSoilLive = data.soilProperties?.metadata?.sourceProvider === 'ISRIC_SOILGRIDS' && !data.soilProperties.estimatedFromGlobalModel;
    const live = Boolean(isSolarLive && isSoilLive);
    console.info(`[gateway] lat=${lat} lng=${lng} solarLive=${isSolarLive} soilLive=${isSoilLive} ${Date.now() - startedAt}ms trace=${data.traceId}`);
    res.setHeader('Cache-Control', live ? 'public, max-age=1800' : 'no-cache, no-store, must-revalidate');
    res.json({ ok: true, live, isSolarLive, isSoilLive, ...data });
  } catch (err) {
    if (controller.signal.aborted || res.destroyed) return;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[gateway] FAILED lat=${lat} lng=${lng}: ${msg}`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(502).json({ ok: false, error: msg });
  }
});

// Nominatim requests are rate-limited by the process-wide provider gate and, when
// configured, an atomic Redis REST reservation shared across service instances.
app.get('/api/v1/gateway/geocode', async (req: Request, res: Response) => {
  const rawQ = req.query.q;
  if (typeof rawQ !== 'string') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(400).json({ code: 'INVALID_QUERY', error: 'A non-empty geocoding query is required.' });
  }
  // Bound decoded input before normalization so very large or compatibility-
  // normalized queries cannot consume unbounded CPU/memory or reach the provider.
  if (!isGeocodeQueryWithinLimit(rawQ)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(400).json({ code: 'INVALID_QUERY', error: `Geocoding query exceeds the ${MAX_GEOCODE_QUERY_BYTES}-byte limit.` });
  }
  const qKey = normalizeGeocodeQuery(rawQ);
  if (!qKey) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(400).json({ code: 'INVALID_QUERY', error: 'A non-empty geocoding query is required.' });
  }
  if (!isGeocodeQueryWithinLimit(qKey)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(400).json({ code: 'INVALID_QUERY', error: `Geocoding query exceeds the ${MAX_GEOCODE_QUERY_BYTES}-byte limit.` });
  }
  if (!isRealInternetEnabled()) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(503).json({ code: 'DISABLED', error: 'Online geocoding is disabled.' });
  }
  const cached = geocodeCache.get(qKey);
  if (cached) {
    res.setHeader('Cache-Control', 'public, max-age=1800');
    return res.json(cached);
  }

  const controller = requestAbortController(req, res);
  try {
    const results = await ExternalDataGateway.getInstance().climateProvider.forwardGeocodeNominatim(qKey, {
      signal: controller.signal,
    });
    if (controller.signal.aborted || res.destroyed) return;
    if (results.length > 0 && geocodeCache.set(qKey, results)) {
      res.setHeader('Cache-Control', 'public, max-age=1800');
    } else {
      // Empty or oversized results are returned but not retained or client-cached.
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    res.json(results);
  } catch (err) {
    if (controller.signal.aborted || res.destroyed) return;
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const code = err instanceof GeocodingError ? err.code : 'UPSTREAM_UNAVAILABLE';
    const status = code === 'TIMEOUT' ? 504 : code === 'DISABLED' || code === 'COORDINATOR_UNAVAILABLE' ? 503 : 502;
    res.status(status).json({
      code,
      error: err instanceof GeocodingError ? err.message : 'Geocoding service is unavailable.',
    });
  }
});

// 1. Solar calculations
app.post('/api/v1/solar/position', (req: Request, res: Response) => {
  try {
    const { latitudeDeg, longitudeDeg, utcTs } = req.body || {};
    if (latitudeDeg === undefined || typeof latitudeDeg !== 'number' || !Number.isFinite(latitudeDeg) || latitudeDeg < -90 || latitudeDeg > 90) {
      return res.status(400).json({ error: `latitudeDeg is required and must be a finite number between -90 and 90, got ${latitudeDeg}` });
    }
    if (longitudeDeg === undefined || typeof longitudeDeg !== 'number' || !Number.isFinite(longitudeDeg) || longitudeDeg < -180 || longitudeDeg > 180) {
      return res.status(400).json({ error: `longitudeDeg is required and must be a finite number between -180 and 180, got ${longitudeDeg}` });
    }
    const rawTs = utcTs !== undefined ? Number(utcTs) : Math.floor(Date.now() / 1000);
    if (!Number.isFinite(rawTs) || rawTs <= 0) {
      return res.status(400).json({ error: `Invalid timestamp: must be a positive number, got ${utcTs}` });
    }
    const ts = normalizeUtcTimestampSeconds(rawTs);

    const result = calculateSolarPosition(latitudeDeg, longitudeDeg, ts);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/v1/solar/poa', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const ghi = Number(body.ghi ?? body.ghiWm2);
    const dni = Number(body.dni ?? body.dniWm2);
    const dhi = Number(body.dhi ?? body.dhiWm2);
    const tiltDeg = Number(body.tiltDeg ?? body.surfaceTiltDeg);
    const sunZenithDeg = Number(body.sunZenithDeg ?? body.zenithDeg);
    const sunAzimuthDeg = Number(body.sunAzimuthDeg ?? body.solarAzimuthDeg ?? 180);

    const rawAzimuth = body.azimuthDeg !== undefined
      ? Number(body.azimuthDeg)
      : (body.surfaceAzimuthDeg !== undefined ? Number(body.surfaceAzimuthDeg) : 0);

    let effectiveSurfaceAzimuthNorth: number;
    if (body.surfaceAzimuthNorthDeg !== undefined) {
      effectiveSurfaceAzimuthNorth = asNorthAzimuthDeg(Number(body.surfaceAzimuthNorthDeg));
    } else if (body.surfaceAzimuthConvention === 'north_clockwise') {
      const az = Number(body.azimuthDeg ?? body.surfaceAzimuthDeg ?? 180);
      effectiveSurfaceAzimuthNorth = asNorthAzimuthDeg(az);
    } else if (body.surfaceAzimuthSouthDeg !== undefined) {
      effectiveSurfaceAzimuthNorth = southToNorthAzimuth(Number(body.surfaceAzimuthSouthDeg));
    } else if (body.surfaceAzimuthConvention === 'south_zero') {
      effectiveSurfaceAzimuthNorth = southToNorthAzimuth(rawAzimuth);
    } else {
      // Default convention: project surface azimuth default is south-zero (0 = South).
      // If client explicitly co-aligned using north-clockwise 180 for both surface and sun, preserve 180.
      if (rawAzimuth === 180 && sunAzimuthDeg === 180) {
        effectiveSurfaceAzimuthNorth = 180;
      } else {
        effectiveSurfaceAzimuthNorth = southToNorthAzimuth(rawAzimuth);
      }
    }

    if (
      !Number.isFinite(ghi) || ghi < 0 ||
      !Number.isFinite(dni) || dni < 0 ||
      !Number.isFinite(dhi) || dhi < 0 ||
      !Number.isFinite(tiltDeg) || tiltDeg < 0 || tiltDeg > 90 ||
      !Number.isFinite(sunZenithDeg) || sunZenithDeg < 0 || sunZenithDeg > 180 ||
      !Number.isFinite(effectiveSurfaceAzimuthNorth) ||
      !Number.isFinite(sunAzimuthDeg)
    ) {
      return res.status(400).json({
        error: 'Invalid POA request: ghi, dni, dhi, tiltDeg (0-90), and sunZenithDeg (0-180) are required non-negative finite numbers.',
      });
    }

    const result = calculatePoaIrradiance({
      ghi,
      dni,
      dhi,
      tiltDeg,
      azimuthDeg: effectiveSurfaceAzimuthNorth,
      sunZenithDeg,
      sunAzimuthDeg,
    });

    if (!Number.isFinite(result) || result < 0) {
      return res.status(400).json({ error: 'POA calculation resulted in an invalid non-finite value' });
    }

    res.json({ poaIrradiance: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 2. Electrical calculations
app.post('/api/v1/electrical/string-sizing', (req: Request, res: Response) => {
  try {
    const { panelVoc, panelVmp, tempMinC, tempMaxC, inverterVdcMax, inverterMpptMin, inverterMpptMax, betaVocPerC, tempCoeffVocPct } = req.body;
    if (!Number.isFinite(panelVoc) || panelVoc <= 0) {
      return res.status(400).json({ error: `panelVoc must be a positive number, got ${panelVoc}` });
    }
    if (!Number.isFinite(panelVmp) || panelVmp <= 0 || panelVmp >= panelVoc) {
      return res.status(400).json({ error: `panelVmp must be positive and less than panelVoc (${panelVoc}), got ${panelVmp}` });
    }
    if (!Number.isFinite(tempMinC) || !Number.isFinite(tempMaxC) || tempMinC > tempMaxC) {
      return res.status(400).json({ error: `tempMinC (${tempMinC}) cannot exceed tempMaxC (${tempMaxC})` });
    }
    if (!Number.isFinite(inverterVdcMax) || inverterVdcMax <= 0) {
      return res.status(400).json({ error: `inverterVdcMax must be positive, got ${inverterVdcMax}` });
    }
    if (!Number.isFinite(inverterMpptMin) || !Number.isFinite(inverterMpptMax) || inverterMpptMin >= inverterMpptMax) {
      return res.status(400).json({ error: `inverterMpptMin (${inverterMpptMin}) must be less than inverterMpptMax (${inverterMpptMax})` });
    }

    // Fix M08: Temperature coefficient of Voc must not be omitted (must be a negative finite number)
    const rawBeta = betaVocPerC !== undefined
      ? betaVocPerC
      : tempCoeffVocPct !== undefined
      ? tempCoeffVocPct / 100.0
      : undefined;
    if (rawBeta === undefined || typeof rawBeta !== 'number' || !Number.isFinite(rawBeta) || rawBeta >= 0) {
      return res.status(400).json({
        error: `Temperature coefficient of Voc (betaVocPerC or tempCoeffVocPct) is required and must be a negative finite number (e.g. -0.0028 for -0.28%/°C), got ${betaVocPerC ?? tempCoeffVocPct}`,
      });
    }

    // Fix M08: Validate betaPmpPerC / tempCoeffPmpPct if provided (must be negative finite number)
    let rawBetaPmp: number | undefined = undefined;
    const { betaPmpPerC: pmpCoeff, tempCoeffPmpPct } = req.body;
    if (pmpCoeff !== undefined) {
      if (typeof pmpCoeff !== 'number' || !Number.isFinite(pmpCoeff) || pmpCoeff >= 0) {
        return res.status(400).json({
          error: `Temperature coefficient of Pmp (betaPmpPerC) must be a negative finite number (e.g. -0.0035 for -0.35%/°C), got ${pmpCoeff}`,
        });
      }
      rawBetaPmp = pmpCoeff;
    } else if (tempCoeffPmpPct !== undefined) {
      if (typeof tempCoeffPmpPct !== 'number' || !Number.isFinite(tempCoeffPmpPct) || tempCoeffPmpPct >= 0) {
        return res.status(400).json({
          error: `Temperature coefficient of Pmp (tempCoeffPmpPct) must be a negative finite number, got ${tempCoeffPmpPct}`,
        });
      }
      rawBetaPmp = tempCoeffPmpPct / 100.0;
    }

    // F-02: Hot-case operating cell temperature per IEC 62548 §7.2:
    // When caller passes ambient temperature (tempMaxC <= 55°C) and hasn't explicitly disabled NOCT derating or supplied cellTempMaxC,
    // evaluate minimum string length at cell operating temperature derived via unified calculateThermalDerate model.
    let resolvedCellTempMaxC = req.body.cellTempMaxC !== undefined ? Number(req.body.cellTempMaxC) : undefined;
    if (resolvedCellTempMaxC === undefined && req.body.isCellTemp !== true && req.body.useCellTemp !== false) {
      if (tempMaxC <= 55 || req.body.noctC !== undefined) {
        const noct = req.body.noctC !== undefined && Number.isFinite(Number(req.body.noctC)) ? Number(req.body.noctC) : 45.0;
        const thermal = calculateThermalDerate({
          module: { noctC: noct, tempCoeffPmpPct: (rawBetaPmp ?? rawBeta) * 100 },
          ambientTempMaxC: tempMaxC,
          installationEnvironment: req.body.installationEnvironment,
        });
        resolvedCellTempMaxC = thermal.cellTempHotC;
      }
    }

    const result = calculateStringSizing({
      ...req.body,
      betaVocPerC: rawBeta,
      betaPmpPerC: rawBetaPmp,
      cellTempMaxC: resolvedCellTempMaxC,
    });

    if (
      result.minModules === null ||
      result.maxModules === null ||
      !Number.isFinite(result.minModules) ||
      !Number.isFinite(result.maxModules)
    ) {
      return res.status(400).json({
        error: 'Invalid string sizing configuration: module and inverter parameters produced an indeterminate string length.',
      });
    }

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/v1/electrical/voltage-drop', (req: Request, res: Response) => {
  try {
    const { lengthM, currentA, crossSectionMm2, vNominal, rho } = req.body;
    const l = Number(lengthM);
    const i = Number(currentA);
    const a = Number(crossSectionMm2);
    const v = Number(vNominal);
    const r = rho !== undefined ? Number(rho) : undefined;

    if (!Number.isFinite(l) || l < 0) {
      return res.status(400).json({ error: `Cable length (lengthM) must be a non-negative finite number, got ${lengthM}` });
    }
    if (!Number.isFinite(i) || i < 0) {
      return res.status(400).json({ error: `Current (currentA) must be a non-negative finite number, got ${currentA}` });
    }
    if (!Number.isFinite(a) || a <= 0) {
      return res.status(400).json({ error: `Cross section (crossSectionMm2) must be a positive non-zero number, got ${crossSectionMm2}` });
    }
    if (!Number.isFinite(v) || v <= 0) {
      return res.status(400).json({ error: `Nominal voltage (vNominal) must be a positive non-zero number, got ${vNominal}` });
    }

    const pct = calculateVoltageDropDc(l, i, a, v, r);
    res.json({ voltageDropPct: pct });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Financial calculations
app.post('/api/v1/finance/lcoe', (req: Request, res: Response) => {
  try {
    const { capex, opexAnnual, energyAnnual, discountRate = 0.05, lifetimeYears = 25 } = req.body;
    const c = Number(capex);
    const o = Number(opexAnnual);
    const energy = Number(energyAnnual);
    const d = Number(discountRate);
    const lt = Number(lifetimeYears);

    if (!Number.isFinite(c) || c < 0) {
      return res.status(400).json({ error: `CAPEX must be a non-negative finite number, got ${capex}` });
    }
    if (!Number.isFinite(o) || o < 0) {
      return res.status(400).json({ error: `Annual OPEX must be a non-negative finite number, got ${opexAnnual}` });
    }
    if (!Number.isFinite(energy) || energy <= 0) {
      return res.status(400).json({ error: `Annual energy must be a positive non-zero finite number, got ${energyAnnual}` });
    }
    if (!Number.isFinite(d) || d < 0) {
      return res.status(400).json({ error: `Discount rate must be a non-negative finite number, got ${discountRate}` });
    }
    if (!Number.isFinite(lt) || lt < 1 || lt > 100) {
      return res.status(400).json({ error: `Lifetime years must be between 1 and 100 years, got ${lifetimeYears}` });
    }

    const val = calculateLcoe(c, o, energy, d, lt);
    if (!Number.isFinite(val) || val <= 0) {
      return res.status(400).json({ error: 'LCOE calculation resulted in an invalid non-positive or non-finite value' });
    }
    res.json({ lcoeValue: val });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/v1/finance/npv', (req: Request, res: Response) => {
  try {
    const { rate, cashflows } = req.body;
    const r = Number(rate);
    if (!Number.isFinite(r) || r <= -1) {
      return res.status(400).json({ error: `Discount rate must be a finite number greater than -1 (-100%), got ${rate}` });
    }
    if (!Array.isArray(cashflows) || cashflows.length === 0 || cashflows.some(c => typeof c !== 'number' || !Number.isFinite(c))) {
      return res.status(400).json({ error: 'Cash flows must be a non-empty array of finite numbers' });
    }

    const val = calculateNpv(r, cashflows);
    if (!Number.isFinite(val)) {
      return res.status(400).json({ error: 'NPV calculation resulted in a non-finite value' });
    }
    res.json({ npvValue: val });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/v1/finance/irr', (req: Request, res: Response) => {
  try {
    const { cashflows } = req.body;
    if (!Array.isArray(cashflows) || cashflows.some(c => typeof c !== 'number' || !Number.isFinite(c))) {
      return res.status(400).json({ error: 'Cash flows must be an array of finite numbers' });
    }

    const detailed = calculateIrrDetailed(cashflows);
    res.json({
      irrValue: detailed.irr,
      status: detailed.status,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 4. 3D Shading Ray-Tracer
app.post('/api/v1/shading/analyze', (req: Request, res: Response) => {
  try {
    const { meshTriangles = [], targetPoints = [], sunDirections = [] } = req.body;
    if (!Array.isArray(meshTriangles) || !Array.isArray(targetPoints) || !Array.isArray(sunDirections)) {
      return res.status(400).json({ error: 'meshTriangles, targetPoints, and sunDirections must be arrays' });
    }
    const factors = calculateShadingFactor(meshTriangles, targetPoints, sunDirections);
    res.json({ shadingFactors: factors });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Project schema validation helper (M06)
function validateProjectSchema(candidate: any): { valid: boolean; error?: string } {
  if (!candidate || typeof candidate !== 'object') {
    return { valid: false, error: 'Project payload must be an object' };
  }
  if (candidate.id !== undefined && (typeof candidate.id !== 'string' || candidate.id.trim().length === 0)) {
    return { valid: false, error: 'Project id must be a non-empty string' };
  }
  const name =
    typeof candidate.name === 'string'
      ? candidate.name.trim()
      : typeof candidate.projectName === 'string'
      ? candidate.projectName.trim()
      : '';
  if (name.length === 0) {
    return { valid: false, error: 'Project name is required and cannot be empty' };
  }
  if (candidate.systemCapacityKwp !== undefined) {
    if (
      typeof candidate.systemCapacityKwp !== 'number' ||
      !Number.isFinite(candidate.systemCapacityKwp) ||
      candidate.systemCapacityKwp <= 0
    ) {
      return {
        valid: false,
        error: `Project systemCapacityKwp must be a positive finite number, got ${candidate.systemCapacityKwp}`,
      };
    }
  }
  if (candidate.panelCount !== undefined) {
    if (typeof candidate.panelCount !== 'number' || !Number.isInteger(candidate.panelCount) || candidate.panelCount < 0) {
      return { valid: false, error: `Project panelCount must be a non-negative integer, got ${candidate.panelCount}` };
    }
  }
  if (candidate.inverterCount !== undefined) {
    if (typeof candidate.inverterCount !== 'number' || !Number.isInteger(candidate.inverterCount) || candidate.inverterCount < 0) {
      return { valid: false, error: `Project inverterCount must be a non-negative integer, got ${candidate.inverterCount}` };
    }
  }
  if (candidate.batteryCount !== undefined) {
    if (typeof candidate.batteryCount !== 'number' || !Number.isInteger(candidate.batteryCount) || candidate.batteryCount < 0) {
      return { valid: false, error: `Project batteryCount must be a non-negative integer, got ${candidate.batteryCount}` };
    }
  }
  if (candidate.dailyLoadKwh !== undefined) {
    if (typeof candidate.dailyLoadKwh !== 'number' || !Number.isFinite(candidate.dailyLoadKwh) || candidate.dailyLoadKwh < 0) {
      return { valid: false, error: `Project dailyLoadKwh must be a non-negative finite number, got ${candidate.dailyLoadKwh}` };
    }
  }
  if (candidate.autonomyDays !== undefined) {
    if (typeof candidate.autonomyDays !== 'number' || !Number.isFinite(candidate.autonomyDays) || candidate.autonomyDays < 0) {
      return { valid: false, error: `Project autonomyDays must be a non-negative finite number, got ${candidate.autonomyDays}` };
    }
  }
  if (candidate.latitude !== undefined) {
    if (typeof candidate.latitude !== 'number' || !Number.isFinite(candidate.latitude) || candidate.latitude < -90 || candidate.latitude > 90) {
      return { valid: false, error: `Project latitude must be between -90 and 90, got ${candidate.latitude}` };
    }
  }
  if (candidate.longitude !== undefined) {
    if (typeof candidate.longitude !== 'number' || !Number.isFinite(candidate.longitude) || candidate.longitude < -180 || candidate.longitude > 180) {
      return { valid: false, error: `Project longitude must be between -180 and 180, got ${candidate.longitude}` };
    }
  }
  if (candidate.lcoeUsdPerKwh !== undefined && candidate.lcoeUsdPerKwh !== null) {
    if (typeof candidate.lcoeUsdPerKwh !== 'number' || !Number.isFinite(candidate.lcoeUsdPerKwh) || candidate.lcoeUsdPerKwh < 0) {
      return { valid: false, error: `Project lcoeUsdPerKwh must be a non-negative finite number, got ${candidate.lcoeUsdPerKwh}` };
    }
  }
  if (candidate.estimatedAnnualYieldKwh !== undefined) {
    if (typeof candidate.estimatedAnnualYieldKwh !== 'number' || !Number.isFinite(candidate.estimatedAnnualYieldKwh) || candidate.estimatedAnnualYieldKwh < 0) {
      return { valid: false, error: `Project estimatedAnnualYieldKwh must be a non-negative finite number, got ${candidate.estimatedAnnualYieldKwh}` };
    }
  }
  return { valid: true };
}

/**
 * Constant-time string equality check backed by crypto.timingSafeEqual.
 * Hashes inputs with SHA-256 first so buffers are guaranteed to be equal 32-byte length,
 * completely preventing timing leaks and length mismatch errors.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Resolves caller identity from Authorization bearer token or trusted gateway header.
 * Defends against identity header spoofing (M06):
 * 1. Supports RFC 6750 Bearer tokens with cryptographic HMAC-SHA256 signature and expiration validation.
 * 2. Fail-closed authentication modes:
 *    - JWT-only (JWT_SECRET set, INTERNAL_GATEWAY_SECRET unset): Only valid signed Bearer JWTs accepted;
 *      raw x-user-id headers are strictly rejected with HTTP 401.
 *    - Gateway-only (INTERNAL_GATEWAY_SECRET set, JWT_SECRET unset): Only gateway-authenticated requests
 *      with matching x-gateway-secret accepted (constant-time verified); raw headers and Bearer tokens rejected.
 *    - Mixed (both set): Each channel verified independently against its respective secret.
 *    - Unconfigured in Production: Fails closed if any unauthenticated identity is asserted.
 *    - Unconfigured in Dev/Test: Allows local development identity only when neither secret is set.
 * 3. All signature and secret comparisons use constant-time equality checks (crypto.timingSafeEqual).
 */
function resolveRequesterIdentity(req: Request): { userId?: string; authError?: string } {
  if (!req || !req.headers) return {};

  const gatewaySecret = process.env.INTERNAL_GATEWAY_SECRET;
  const jwtSecret = process.env.JWT_SECRET;
  const authConfigured = Boolean(gatewaySecret || jwtSecret);
  const isDev = !isProductionEnv();

  const authHeader = req.headers['authorization'];
  const rawUserId = req.headers['x-user-id'];

  // 1. Process Bearer token if supplied
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const parts = token.split('.');
      if (parts.length === 3) {
        // Standard JWT: header.payload.signature
        if (!jwtSecret) {
          return { authError: 'Invalid bearer token: JWT authentication is not configured on this server' };
        }

        // Validate header encoding and algorithm (Z-05)
        let header: any;
        try {
          const headerJson = Buffer.from(parts[0], 'base64url').toString('utf-8');
          header = JSON.parse(headerJson);
        } catch {
          return { authError: 'Invalid bearer token: malformed header encoding' };
        }

        if (!header || typeof header !== 'object' || header.alg !== 'HS256') {
          return { authError: 'Invalid bearer token: unsupported or missing algorithm (only HS256 is supported)' };
        }

        const expectedSig = crypto
          .createHmac('sha256', jwtSecret)
          .update(parts[0] + '.' + parts[1])
          .digest('base64url');

        if (!constantTimeEqual(parts[2], expectedSig)) {
          return { authError: 'Invalid bearer token: signature verification failed' };
        }

        try {
          const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf-8');
          const payload = JSON.parse(payloadJson);

          // Expiration check (exp in seconds)
          if (typeof payload.exp === 'number' && Date.now() / 1000 > payload.exp) {
            return { authError: 'Invalid bearer token: token has expired' };
          }
          // Not before check (nbf in seconds)
          if (typeof payload.nbf === 'number' && Date.now() / 1000 < payload.nbf) {
            return { authError: 'Invalid bearer token: token not yet valid' };
          }

          const userId = payload.sub || payload.userId || payload.id;
          if (typeof userId === 'string' && userId.trim()) {
            return { userId: userId.trim() };
          }
          return { authError: 'Invalid bearer token: missing sub/userId in payload' };
        } catch {
          return { authError: 'Invalid bearer token: malformed payload encoding' };
        }
      }

      // Non-JWT Bearer token string
      if (authConfigured) {
        return {
          authError: 'Untrusted bearer token: cryptographically signed JWT or trusted gateway authorization required',
        };
      }

      // Unconfigured server:
      if (isDev) {
        const normalized = token.startsWith('user:') ? token.slice(5) : token;
        if (normalized.trim()) return { userId: normalized.trim() };
      } else {
        return { authError: 'Authentication misconfiguration: JWT_SECRET or INTERNAL_GATEWAY_SECRET is required in production' };
      }
    }
  }

  // 2. Process x-user-id header if supplied
  if (typeof rawUserId === 'string' && rawUserId.trim()) {
    // If JWT-only mode is active (jwtSecret set, gatewaySecret unset), direct x-user-id is NOT allowed!
    if (jwtSecret && !gatewaySecret) {
      return {
        authError: 'Untrusted identity header: direct x-user-id header is rejected in JWT-only mode. Use Authorization: Bearer <jwt>',
      };
    }

    // If gatewaySecret is configured, verify x-gateway-secret using constant-time comparison
    if (gatewaySecret) {
      const incomingSecret = req.headers['x-gateway-secret'];
      if (typeof incomingSecret !== 'string' || !constantTimeEqual(incomingSecret, gatewaySecret)) {
        return { authError: 'Untrusted identity header: missing or invalid gateway signature' };
      }
      return { userId: rawUserId.trim() };
    }

    // Neither secret is configured
    if (isDev) {
      return { userId: rawUserId.trim() };
    } else {
      return { authError: 'Authentication misconfiguration: JWT_SECRET or INTERNAL_GATEWAY_SECRET is required in production' };
    }
  }

  return {};
}

// 5. Quick Sizing Project
app.post('/api/v1/projects/quick-size', (req: Request, res: Response) => {
  try {
    const { dailyKwh, autonomyDays, latitude, longitude, ownerId } = req.body;
    if (typeof dailyKwh !== 'number' || !Number.isFinite(dailyKwh) || dailyKwh <= 0) {
      return res.status(400).json({ error: `dailyKwh must be a positive finite number, got ${dailyKwh}` });
    }
    if (autonomyDays !== undefined && (typeof autonomyDays !== 'number' || !Number.isFinite(autonomyDays) || autonomyDays < 0)) {
      return res.status(400).json({ error: `autonomyDays must be a non-negative finite number, got ${autonomyDays}` });
    }
    if (latitude === undefined || typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      return res.status(400).json({ error: `latitude is required and must be between -90 and 90, got ${latitude}` });
    }
    if (longitude !== undefined && (typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
      return res.status(400).json({ error: `longitude must be between -180 and 180, got ${longitude}` });
    }

    const { userId: requesterOwnerId, authError } = resolveRequesterIdentity(req);
    if (authError) {
      return res.status(401).json({ error: authError });
    }
    const isSecure = isProductionEnv() || isAuthConfigured();
    if (isSecure && !requesterOwnerId) {
      return res.status(401).json({ error: 'Authentication required: creating projects requires a verified identity.' });
    }
    const resolvedOwnerId = requesterOwnerId || ownerId;
    const shouldPersist = req.body.saveProject !== false && req.body.persist !== false && req.body.save !== false;
    const result = performQuickSizing({ ...req.body, ownerId: resolvedOwnerId, persist: shouldPersist }, db);
    if (shouldPersist) {
      const persisted = saveDatabase();
      if (!persisted) {
        db.projects.delete(result.projectId);
        return res.status(500).json({ error: 'Failed to persist created project to storage.' });
      }
    }
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 6. Project List and Project CRUD with Authorization
app.get('/api/v1/projects', (req: Request, res: Response) => {
  const { userId: requesterId, authError } = resolveRequesterIdentity(req);
  if (authError) {
    return res.status(401).json({ error: authError });
  }
  const isSecure = isProductionEnv() || isAuthConfigured();
  if (isSecure && !requesterId) {
    return res.status(401).json({ error: 'Authentication required: reading projects requires a verified identity.' });
  }

  const allProjects = Array.from(db.projects.values());
  // In authenticated / secure mode, strictly filter projects so users only see their own projects (or unowned legacy projects)
  const accessibleProjects = (isSecure || requesterId)
    ? allProjects.filter((p) => !p.ownerId || p.ownerId === requesterId)
    : allProjects;

  res.json(accessibleProjects);
});

app.get('/api/v1/projects/:id', (req: Request, res: Response) => {
  const project = db.projects.get(req.params.id as string);
  if (!project) return res.status(404).json({ error: `Project '${req.params.id}' not found` });

  const { userId: requesterId, authError } = resolveRequesterIdentity(req);
  if (authError) {
    return res.status(401).json({ error: authError });
  }
  const isSecure = isProductionEnv() || isAuthConfigured();

  if (project.ownerId) {
    if (!requesterId) {
      return res.status(401).json({
        error: `Authentication required: project '${req.params.id}' is private and owned by '${project.ownerId}'.`,
      });
    }
    if (project.ownerId !== requesterId) {
      return res.status(403).json({
        error: `Access denied: project '${req.params.id}' is owned by '${project.ownerId}', requester is '${requesterId}'. Cannot read.`,
      });
    }
  } else if (isSecure && !requesterId) {
    return res.status(401).json({ error: 'Authentication required: reading projects requires a verified identity.' });
  }

  res.json(project);
});

app.put('/api/v1/projects/:id', (req: Request, res: Response) => {
  const existing = db.projects.get(req.params.id as string);
  if (!existing) {
    return res.status(404).json({ error: `Project '${req.params.id}' not found` });
  }

  const { userId: requesterId, authError } = resolveRequesterIdentity(req);
  if (authError) {
    return res.status(401).json({ error: authError });
  }

  const isSecure = isProductionEnv() || isAuthConfigured();

  // In secure mode (production or when auth secrets are configured), all project mutations require verified authentication
  if (isSecure && !requesterId) {
    return res.status(401).json({
      error: 'Authentication required: modifying projects requires a verified identity.',
    });
  }

  if (existing.ownerId) {
    if (!requesterId) {
      return res.status(403).json({
        error: `Authentication required: project '${req.params.id}' is owned by '${existing.ownerId}'. Identity must be supplied via Bearer token or authenticated gateway header.`,
      });
    }
    if (existing.ownerId !== requesterId) {
      return res.status(403).json({
        error: `Access denied: project '${req.params.id}' is owned by '${existing.ownerId}', requester is '${requesterId}'. Cannot modify.`,
      });
    }
  }

  const candidate = {
    ...existing,
    ...req.body,
    id: req.params.id,
  };
  const validation = validateProjectSchema(candidate);
  if (!validation.valid) {
    return res.status(400).json({ error: `Invalid project schema: ${validation.error}` });
  }

  // Preserve existing ownerId; if unowned, bind strictly to authenticated requesterId (never accept ownerId from body)
  const updated: Project = {
    ...candidate,
    ownerId: existing.ownerId || requesterId || undefined,
  };

  db.projects.set(req.params.id as string, updated);
  const persisted = saveDatabase();
  if (!persisted) {
    db.projects.set(req.params.id as string, existing);
    return res.status(500).json({ error: 'Failed to persist updated project to storage.' });
  }
  res.json(updated);
});

// 7. Catalog (Modules, Inverters, Batteries)
app.get('/api/v1/catalog/modules', (req: Request, res: Response) => {
  const { userId: requesterId } = resolveRequesterIdentity(req);
  const items = Array.from(db.pvModules.values()).map((item: any) => {
    if (item.ownerId && item.ownerId !== requesterId) {
      const { ownerId: _omit, ...rest } = item;
      return rest;
    }
    return item;
  });
  res.json(items);
});

app.post('/api/v1/catalog/modules', (req: Request, res: Response) => {
  const { userId: requesterId, authError } = resolveRequesterIdentity(req);
  if (authError) {
    return res.status(401).json({ error: authError });
  }
  const isSecure = isProductionEnv() || isAuthConfigured();
  if (isSecure && !requesterId) {
    return res.status(401).json({
      error: 'Authentication required: modifying equipment in the catalog requires a verified identity.',
    });
  }

  const pmpWatts = Number(req.body.pmpWatts ?? req.body.pNominalWp);
  const vmpVolts = Number(req.body.vmpVolts ?? req.body.vMp);
  const impAmps = Number(req.body.impAmps ?? req.body.iMp);
  const vocVolts = Number(req.body.vocVolts ?? req.body.vOc);
  const iscAmps = Number(req.body.iscAmps ?? req.body.iSc);

  if (
    !Number.isFinite(pmpWatts) || pmpWatts <= 0 ||
    !Number.isFinite(vmpVolts) || vmpVolts <= 0 ||
    !Number.isFinite(impAmps) || impAmps <= 0 ||
    !Number.isFinite(vocVolts) || vocVolts <= 0 ||
    !Number.isFinite(iscAmps) || iscAmps <= 0
  ) {
    return res.status(400).json({
      error: 'Invalid PV module electrical parameters: pmpWatts, vmpVolts, impAmps, vocVolts, and iscAmps must all be positive finite numbers.',
    });
  }
  if (vmpVolts >= vocVolts) {
    return res.status(400).json({ error: `vmpVolts (${vmpVolts}V) cannot be greater than or equal to vocVolts (${vocVolts}V).` });
  }
  if (impAmps > iscAmps) {
    return res.status(400).json({ error: `impAmps (${impAmps}A) cannot exceed iscAmps (${iscAmps}A).` });
  }

  const item = {
    ...req.body,
    id: req.body.id || `mod-${Date.now()}`,
    pmpWatts,
    vmpVolts,
    impAmps,
    vocVolts,
    iscAmps,
    modelName: req.body.modelName || req.body.model || 'Custom Module',
    manufacturer: req.body.manufacturer || 'Generic',
  };

  if (BUILT_IN_CATALOG_IDS.has(item.id)) {
    return res.status(403).json({
      error: `Cannot overwrite built-in equipment '${item.id}'. Specify a custom ID to add new catalog items.`,
    });
  }

  const previousItem = db.pvModules.get(item.id) as any;
  if (previousItem) {
    if (previousItem.ownerId) {
      if (!requesterId) {
        return res.status(401).json({
          error: `Authentication required: equipment '${item.id}' is owned by '${previousItem.ownerId}'.`,
        });
      }
      if (previousItem.ownerId !== requesterId) {
        return res.status(403).json({
          error: `Access denied: custom equipment '${item.id}' is owned by '${previousItem.ownerId}', requester is '${requesterId}'. Cannot modify.`,
        });
      }
    } else if (isSecure) {
      // Legacy catalog item without ownerId is an immutable system asset (MAIN-07)
      return res.status(403).json({
        error: `Access denied: '${item.id}' is a legacy system catalog item and cannot be overwritten. Create a new custom equipment item with a unique ID.`,
      });
    }
  }

  const itemToStore = {
    ...item,
    ownerId: previousItem?.ownerId || requesterId || undefined,
  };

  db.pvModules.set(item.id, itemToStore);
  const persisted = saveDatabase();
  if (!persisted) {
    if (previousItem !== undefined) {
      db.pvModules.set(item.id, previousItem);
    } else {
      db.pvModules.delete(item.id);
    }
    return res.status(500).json({ error: 'Failed to persist PV module to storage.' });
  }
  res.status(201).json(itemToStore);
});

app.get('/api/v1/catalog/inverters', (req: Request, res: Response) => {
  const { userId: requesterId } = resolveRequesterIdentity(req);
  const items = Array.from(db.inverters.values()).map((item: any) => {
    if (item.ownerId && item.ownerId !== requesterId) {
      const { ownerId: _omit, ...rest } = item;
      return rest;
    }
    return item;
  });
  res.json(items);
});

app.post('/api/v1/catalog/inverters', (req: Request, res: Response) => {
  const { userId: requesterId, authError } = resolveRequesterIdentity(req);
  if (authError) {
    return res.status(401).json({ error: authError });
  }
  const isSecure = isProductionEnv() || isAuthConfigured();
  if (isSecure && !requesterId) {
    return res.status(401).json({
      error: 'Authentication required: modifying equipment in the catalog requires a verified identity.',
    });
  }

  const pnomAcKw = Number(req.body.pnomAcKw ?? (req.body.pAcNominalW !== undefined ? req.body.pAcNominalW / 1000 : undefined));
  const vdcMaxVolts = Number(req.body.vdcMaxVolts ?? req.body.vDcMax);
  const vmpptMinVolts = Number(req.body.vmpptMinVolts ?? req.body.vMpptMin);
  const vmpptMaxVolts = Number(req.body.vmpptMaxVolts ?? req.body.vMpptMax);

  if (
    !Number.isFinite(pnomAcKw) || pnomAcKw <= 0 ||
    !Number.isFinite(vdcMaxVolts) || vdcMaxVolts <= 0 ||
    !Number.isFinite(vmpptMinVolts) || vmpptMinVolts <= 0 ||
    !Number.isFinite(vmpptMaxVolts) || vmpptMaxVolts <= vmpptMinVolts
  ) {
    return res.status(400).json({
      error: 'Invalid inverter parameters: pnomAcKw, vdcMaxVolts, vmpptMinVolts, and vmpptMaxVolts must be positive numbers with vmpptMaxVolts > vmpptMinVolts.',
    });
  }

  const item = {
    ...req.body,
    id: req.body.id || `inv-${Date.now()}`,
    pnomAcKw,
    vdcMaxVolts,
    vmpptMinVolts,
    vmpptMaxVolts,
    modelName: req.body.modelName || req.body.model || 'Custom Inverter',
    manufacturer: req.body.manufacturer || 'Generic',
  };

  if (BUILT_IN_CATALOG_IDS.has(item.id)) {
    return res.status(403).json({
      error: `Cannot overwrite built-in equipment '${item.id}'. Specify a custom ID to add new catalog items.`,
    });
  }

  const previousItem = db.inverters.get(item.id) as any;
  if (previousItem) {
    if (previousItem.ownerId) {
      if (!requesterId) {
        return res.status(401).json({
          error: `Authentication required: equipment '${item.id}' is owned by '${previousItem.ownerId}'.`,
        });
      }
      if (previousItem.ownerId !== requesterId) {
        return res.status(403).json({
          error: `Access denied: custom equipment '${item.id}' is owned by '${previousItem.ownerId}', requester is '${requesterId}'. Cannot modify.`,
        });
      }
    } else if (isSecure) {
      // Legacy catalog item without ownerId is an immutable system asset (MAIN-07)
      return res.status(403).json({
        error: `Access denied: '${item.id}' is a legacy system catalog item and cannot be overwritten. Create a new custom equipment item with a unique ID.`,
      });
    }
  }

  const itemToStore = {
    ...item,
    ownerId: previousItem?.ownerId || requesterId || undefined,
  };

  db.inverters.set(item.id, itemToStore);
  const persisted = saveDatabase();
  if (!persisted) {
    if (previousItem !== undefined) {
      db.inverters.set(item.id, previousItem);
    } else {
      db.inverters.delete(item.id);
    }
    return res.status(500).json({ error: 'Failed to persist inverter to storage.' });
  }
  res.status(201).json(itemToStore);
});

app.get('/api/v1/catalog/batteries', (req: Request, res: Response) => {
  const { userId: requesterId } = resolveRequesterIdentity(req);
  const items = Array.from(db.batteries.values()).map((item: any) => {
    if (item.ownerId && item.ownerId !== requesterId) {
      const { ownerId: _omit, ...rest } = item;
      return rest;
    }
    return item;
  });
  res.json(items);
});

app.post('/api/v1/catalog/batteries', (req: Request, res: Response) => {
  const { userId: requesterId, authError } = resolveRequesterIdentity(req);
  if (authError) {
    return res.status(401).json({ error: authError });
  }
  const isSecure = isProductionEnv() || isAuthConfigured();
  if (isSecure && !requesterId) {
    return res.status(401).json({
      error: 'Authentication required: modifying equipment in the catalog requires a verified identity.',
    });
  }

  const nominalVoltageVolts = Number(req.body.nominalVoltageVolts ?? req.body.nominalVoltageV);
  const capacityKwh = Number(req.body.capacityKwh ?? (req.body.nominalCapacityAh && nominalVoltageVolts ? (req.body.nominalCapacityAh * nominalVoltageVolts) / 1000 : undefined));

  if (
    !Number.isFinite(nominalVoltageVolts) || nominalVoltageVolts <= 0 ||
    !Number.isFinite(capacityKwh) || capacityKwh <= 0
  ) {
    return res.status(400).json({
      error: 'Invalid battery parameters: nominalVoltageVolts and capacityKwh must be positive finite numbers.',
    });
  }

  const item = {
    ...req.body,
    id: req.body.id || `bat-${Date.now()}`,
    nominalVoltageVolts,
    capacityKwh,
    modelName: req.body.modelName || req.body.model || 'Custom Battery',
    manufacturer: req.body.manufacturer || 'Generic',
  };

  if (BUILT_IN_CATALOG_IDS.has(item.id)) {
    return res.status(403).json({
      error: `Cannot overwrite built-in equipment '${item.id}'. Specify a custom ID to add new catalog items.`,
    });
  }

  const previousItem = db.batteries.get(item.id) as any;
  if (previousItem) {
    if (previousItem.ownerId) {
      if (!requesterId) {
        return res.status(401).json({
          error: `Authentication required: equipment '${item.id}' is owned by '${previousItem.ownerId}'.`,
        });
      }
      if (previousItem.ownerId !== requesterId) {
        return res.status(403).json({
          error: `Access denied: custom equipment '${item.id}' is owned by '${previousItem.ownerId}', requester is '${requesterId}'. Cannot modify.`,
        });
      }
    } else if (isSecure) {
      // Legacy catalog item without ownerId is an immutable system asset (MAIN-07)
      return res.status(403).json({
        error: `Access denied: '${item.id}' is a legacy system catalog item and cannot be overwritten. Create a new custom equipment item with a unique ID.`,
      });
    }
  }

  const itemToStore = {
    ...item,
    ownerId: previousItem?.ownerId || requesterId || undefined,
  };

  db.batteries.set(item.id, itemToStore);
  const persisted = saveDatabase();
  if (!persisted) {
    if (previousItem !== undefined) {
      db.batteries.set(item.id, previousItem);
    } else {
      db.batteries.delete(item.id);
    }
    return res.status(500).json({ error: 'Failed to persist battery to storage.' });
  }
  res.status(201).json(itemToStore);
});

// 8. Reports Generation with Snapshot Reconciliation (M09, N01, N06)
app.post('/api/v1/reports/generate', (req: Request, res: Response) => {
  const { userId: requesterId, authError } = resolveRequesterIdentity(req);
  if (authError) {
    return res.status(401).json({ error: authError });
  }

  const {
    projectName,
    projectId,
    systemCapacityKwp,
    panelCount,
    panelType,
    inverterCount,
    inverterType,
    batteryCount,
    batteryType,
    annualYieldKwh,
    lcoeUsdPerKwh,
  } = req.body;

  if (
    (systemCapacityKwp !== undefined && (typeof systemCapacityKwp !== 'number' || !Number.isFinite(systemCapacityKwp) || systemCapacityKwp < 0)) ||
    (panelCount !== undefined && (typeof panelCount !== 'number' || !Number.isInteger(panelCount) || panelCount < 0)) ||
    (inverterCount !== undefined && (typeof inverterCount !== 'number' || !Number.isInteger(inverterCount) || inverterCount < 0)) ||
    (batteryCount !== undefined && (typeof batteryCount !== 'number' || !Number.isInteger(batteryCount) || batteryCount < 0)) ||
    (annualYieldKwh !== undefined && (typeof annualYieldKwh !== 'number' || !Number.isFinite(annualYieldKwh) || annualYieldKwh < 0)) ||
    (lcoeUsdPerKwh !== undefined && lcoeUsdPerKwh !== null && (typeof lcoeUsdPerKwh !== 'number' || !Number.isFinite(lcoeUsdPerKwh) || lcoeUsdPerKwh < 0))
  ) {
    return res.status(400).json({
      error: 'Invalid engineering metrics: capacity, yield, and cost must be non-negative finite numbers; equipment counts must be non-negative integers.',
    });
  }

  // Physical consistency check: panelCount and systemCapacityKwp
  if (panelCount && panelCount > 0 && systemCapacityKwp && systemCapacityKwp > 0) {
    const impliedWp = (systemCapacityKwp * 1000.0) / panelCount;
    if (impliedWp < 50 || impliedWp > 1000) {
      return res.status(400).json({
        error: `Inconsistent report metrics: panelCount (${panelCount}) and systemCapacityKwp (${systemCapacityKwp} kWp) imply an unphysical module wattage (${impliedWp.toFixed(0)}W). Physical range is 50W-1000W.`,
      });
    }
  }

  // Snapshot Reconciliation against persistent database (M09, N01, N06)
  const projectSnapshot = projectId && projectId !== 'N/A' ? db.projects.get(projectId) : undefined;
  const isSecure = isProductionEnv() || isAuthConfigured();

  if (projectSnapshot?.ownerId) {
    if (!requesterId) {
      return res.status(401).json({
        error: `Authentication required: project '${projectId}' is private. Identity required to generate report.`,
      });
    }
    if (projectSnapshot.ownerId !== requesterId) {
      return res.status(403).json({
        error: `Access denied: project '${projectId}' is owned by '${projectSnapshot.ownerId}', requester is '${requesterId}'. Cannot generate report.`,
      });
    }
  } else if (projectSnapshot && isSecure && !requesterId) {
    return res.status(401).json({
      error: 'Authentication required: generating reports on projects requires a verified identity.',
    });
  }

  let resolvedProjectName = projectName ? String(projectName).trim() : (projectSnapshot?.name || 'Solar Project');
  let resolvedPanelType = panelType;
  let resolvedInverterType = inverterType;
  let resolvedBatteryType = batteryType;
  const discrepancies: string[] = [];

  if (projectSnapshot) {
    // Reconcile equipment names from snapshot catalog IDs
    if (!resolvedPanelType && projectSnapshot.moduleId) {
      const mod = db.pvModules.get(projectSnapshot.moduleId);
      if (mod) resolvedPanelType = `${mod.manufacturer} ${mod.modelName} (${mod.pmpWatts}W)`;
    }
    if (!resolvedInverterType && projectSnapshot.inverterId) {
      const inv = db.inverters.get(projectSnapshot.inverterId);
      if (inv) resolvedInverterType = `${inv.manufacturer} ${inv.modelName} (${inv.pnomAcKw}kW)`;
    }
    if (!resolvedBatteryType && projectSnapshot.batteryId) {
      const bat = db.batteries.get(projectSnapshot.batteryId);
      if (bat) resolvedBatteryType = `${bat.manufacturer} ${bat.modelName} (${bat.nominalVoltageVolts}V ${bat.capacityKwh}kWh)`;
    }

    // Equipment baseline reference verification (P3-06)
    if (panelType) {
      if (!projectSnapshot.moduleId) {
        discrepancies.push('Snapshot missing baseline moduleId; cannot reconcile panel model.');
      } else {
        const mod = db.pvModules.get(projectSnapshot.moduleId);
        if (mod && !panelType.toLowerCase().includes(mod.modelName.toLowerCase()) && !mod.modelName.toLowerCase().includes(panelType.toLowerCase())) {
          discrepancies.push(`Panel model mismatch: report=${panelType} vs snapshot=${mod.manufacturer} ${mod.modelName}`);
        }
      }
    }
    if (inverterType) {
      if (!projectSnapshot.inverterId) {
        discrepancies.push('Snapshot missing baseline inverterId; cannot reconcile inverter model.');
      } else {
        const inv = db.inverters.get(projectSnapshot.inverterId);
        if (inv && !inverterType.toLowerCase().includes(inv.modelName.toLowerCase()) && !inv.modelName.toLowerCase().includes(inverterType.toLowerCase())) {
          discrepancies.push(`Inverter model mismatch: report=${inverterType} vs snapshot=${inv.manufacturer} ${inv.modelName}`);
        }
      }
    }
    if (batteryType && batteryType !== 'None' && (!batteryCount || batteryCount > 0)) {
      if (!projectSnapshot.batteryId) {
        discrepancies.push('Snapshot missing baseline batteryId; cannot reconcile battery model.');
      } else {
        const bat = db.batteries.get(projectSnapshot.batteryId);
        if (bat && !batteryType.toLowerCase().includes(bat.modelName.toLowerCase()) && !bat.modelName.toLowerCase().includes(batteryType.toLowerCase())) {
          discrepancies.push(`Battery model mismatch: report=${batteryType} vs snapshot=${bat.manufacturer} ${bat.modelName}`);
        }
      }
    }

    // Dangling catalog reference checks on snapshot (MAIN-06)
    if (projectSnapshot.moduleId && !db.pvModules.has(projectSnapshot.moduleId)) {
      discrepancies.push(`Snapshot references non-existent module ID '${projectSnapshot.moduleId}' in catalog; cannot reconcile equipment.`);
    }
    if (projectSnapshot.inverterId && !db.inverters.has(projectSnapshot.inverterId)) {
      discrepancies.push(`Snapshot references non-existent inverter ID '${projectSnapshot.inverterId}' in catalog; cannot reconcile equipment.`);
    }
    if (projectSnapshot.batteryId && !db.batteries.has(projectSnapshot.batteryId)) {
      discrepancies.push(`Snapshot references non-existent battery ID '${projectSnapshot.batteryId}' in catalog; cannot reconcile equipment.`);
    }

    // Baseline completeness and validity checks on snapshot itself (R847-02, MAIN-06)
    const baselineCap = projectSnapshot.systemCapacityKwp;
    const baselinePanels = projectSnapshot.panelCount;
    const baselineYield = projectSnapshot.estimatedAnnualYieldKwh;

    if (baselineCap === undefined || typeof baselineCap !== 'number' || !Number.isFinite(baselineCap) || baselineCap <= 0) {
      discrepancies.push('Snapshot missing valid baseline systemCapacityKwp (> 0 kWp); cannot reconcile report.');
    }
    if (baselinePanels === undefined || typeof baselinePanels !== 'number' || !Number.isInteger(baselinePanels) || baselinePanels <= 0) {
      discrepancies.push('Snapshot missing valid baseline panelCount (> 0); cannot reconcile report.');
    }
    if (baselineYield === undefined || typeof baselineYield !== 'number' || !Number.isFinite(baselineYield) || baselineYield < 0) {
      discrepancies.push('Snapshot missing baseline estimatedAnnualYieldKwh; cannot reconcile report.');
    }
    if (projectSnapshot.inverterCount === undefined) {
      discrepancies.push('Snapshot missing baseline inverterCount; cannot reconcile report.');
    } else if (typeof projectSnapshot.inverterCount !== 'number' || !Number.isInteger(projectSnapshot.inverterCount) || projectSnapshot.inverterCount < 0) {
      discrepancies.push('Snapshot baseline contains invalid inverterCount; cannot reconcile report.');
    }
    if (projectSnapshot.batteryCount === undefined) {
      discrepancies.push('Snapshot missing baseline batteryCount; cannot reconcile report.');
    } else if (typeof projectSnapshot.batteryCount !== 'number' || !Number.isInteger(projectSnapshot.batteryCount) || projectSnapshot.batteryCount < 0) {
      discrepancies.push('Snapshot baseline contains invalid batteryCount; cannot reconcile report.');
    }
    if (!projectSnapshot.moduleId) {
      discrepancies.push('Snapshot missing baseline moduleId; cannot reconcile equipment.');
    }
    if (!projectSnapshot.inverterId) {
      discrepancies.push('Snapshot missing baseline inverterId; cannot reconcile equipment.');
    }
    if (typeof projectSnapshot.batteryCount === 'number' && projectSnapshot.batteryCount > 0 && !projectSnapshot.batteryId) {
      discrepancies.push('Snapshot missing baseline batteryId; cannot reconcile equipment.');
    }
    if (projectSnapshot.lcoeUsdPerKwh === undefined || projectSnapshot.lcoeUsdPerKwh === null) {
      discrepancies.push('Snapshot missing baseline lcoeUsdPerKwh; cannot reconcile report.');
    } else if (typeof projectSnapshot.lcoeUsdPerKwh !== 'number' || !Number.isFinite(projectSnapshot.lcoeUsdPerKwh) || projectSnapshot.lcoeUsdPerKwh < 0) {
      discrepancies.push('Snapshot baseline contains invalid lcoeUsdPerKwh; cannot reconcile report.');
    }
    if (
      typeof baselineCap === 'number' &&
      typeof baselinePanels === 'number' &&
      baselineCap > 0 &&
      baselinePanels > 0
    ) {
      const impliedBaselineWp = (baselineCap * 1000.0) / baselinePanels;
      if (impliedBaselineWp < 50 || impliedBaselineWp > 1000) {
        discrepancies.push(
          `Snapshot baseline contains physically inconsistent capacity and panel count (${baselinePanels} panels for ${baselineCap} kWp implies ${impliedBaselineWp.toFixed(0)}W/panel).`
        );
      }
    }

    // Explicit discrepancy checks across physical metrics (M09, N06)
    if (systemCapacityKwp !== undefined) {
      if (typeof projectSnapshot.systemCapacityKwp === 'number' && projectSnapshot.systemCapacityKwp > 0) {
        if (
          Math.abs(systemCapacityKwp - projectSnapshot.systemCapacityKwp) / Math.max(1, projectSnapshot.systemCapacityKwp) > 0.01
        ) {
          discrepancies.push(`Capacity mismatch: report=${systemCapacityKwp} kWp vs snapshot=${projectSnapshot.systemCapacityKwp} kWp`);
        }
      }
    }
    if (panelCount !== undefined) {
      if (typeof projectSnapshot.panelCount === 'number' && projectSnapshot.panelCount > 0) {
        if (panelCount !== projectSnapshot.panelCount) {
          discrepancies.push(`Panel count mismatch: report=${panelCount} vs snapshot=${projectSnapshot.panelCount}`);
        }
      }
    }
    if (inverterCount !== undefined) {
      if (typeof projectSnapshot.inverterCount !== 'number') {
        discrepancies.push('Snapshot missing baseline inverterCount; cannot reconcile inverter count.');
      } else if (inverterCount !== projectSnapshot.inverterCount) {
        discrepancies.push(`Inverter count mismatch: report=${inverterCount} vs snapshot=${projectSnapshot.inverterCount}`);
      }
    }
    if (batteryCount !== undefined) {
      if (typeof projectSnapshot.batteryCount !== 'number') {
        discrepancies.push('Snapshot missing baseline batteryCount; cannot reconcile battery count.');
      } else if (batteryCount !== projectSnapshot.batteryCount) {
        discrepancies.push(`Battery count mismatch: report=${batteryCount} vs snapshot=${projectSnapshot.batteryCount}`);
      }
    }
    if (annualYieldKwh !== undefined) {
      if (typeof projectSnapshot.estimatedAnnualYieldKwh === 'number') {
        const snapYield = projectSnapshot.estimatedAnnualYieldKwh;
        if (snapYield === 0) {
          if (annualYieldKwh !== 0) {
            discrepancies.push(`Annual yield mismatch: report=${annualYieldKwh} kWh vs snapshot=0 kWh`);
          }
        } else {
          const delta = Math.abs(annualYieldKwh - snapYield) / snapYield;
          if (delta > 0.01) {
            discrepancies.push(`Annual yield mismatch: report=${annualYieldKwh} kWh vs snapshot=${snapYield} kWh`);
          }
        }
      }
    }
    if (lcoeUsdPerKwh !== undefined && lcoeUsdPerKwh !== null) {
      if (typeof projectSnapshot.lcoeUsdPerKwh !== 'number') {
        discrepancies.push('Snapshot missing baseline lcoeUsdPerKwh; cannot reconcile LCOE.');
      } else {
        const delta = Math.abs(lcoeUsdPerKwh - projectSnapshot.lcoeUsdPerKwh) / Math.max(0.001, projectSnapshot.lcoeUsdPerKwh);
        if (delta > 0.01) {
          discrepancies.push(`LCOE mismatch: report=${lcoeUsdPerKwh} USD/kWh vs snapshot=${projectSnapshot.lcoeUsdPerKwh} USD/kWh`);
        }
      }
    }
  } else if (projectId && projectId !== 'N/A') {
    discrepancies.push(`Project '${projectId}' was not found in the database; cannot reconcile report against snapshot.`);
  }

  // If no project snapshot and equipment name was not supplied, use generic descriptive labels (never fabricate specific models)
  resolvedPanelType = resolvedPanelType || 'Standard Monocrystalline PV Module';
  resolvedInverterType = resolvedInverterType || 'Standard Grid-Tied PV Inverter';
  resolvedBatteryType = resolvedBatteryType || (batteryCount && batteryCount > 0 ? 'Standard Stationary Battery Storage' : 'None');

  const isReconciledAgainstSnapshot = Boolean(projectSnapshot && discrepancies.length === 0);

  res.status(200).json({
    title: 'Preliminary Feasibility & Engineering Screening Proposal',
    disclaimer:
      'This document provides preliminary engineering screening and feasibility metrics generated via automated calculation algorithms. It does not constitute a certified EPC construction package or utility-approved interconnection study, which requires site geotechnical borehole verification, local utility impact studies, and stamped licensed professional engineering approval.',
    projectName: resolvedProjectName,
    projectId: projectId ? String(projectId) : (projectSnapshot?.id || 'N/A'),
    generatedAt: new Date().toISOString(),
    isReconciledAgainstSnapshot,
    discrepancies: discrepancies.length > 0 ? discrepancies : undefined,
    metrics: {
      systemCapacityKwp: systemCapacityKwp ?? (projectSnapshot?.systemCapacityKwp ?? 0),
      panelCount: panelCount ?? (projectSnapshot?.panelCount ?? 0),
      panelType: resolvedPanelType,
      inverterCount: inverterCount ?? (projectSnapshot?.inverterCount ?? 0),
      inverterType: resolvedInverterType,
      batteryCount: batteryCount ?? (projectSnapshot?.batteryCount ?? 0),
      batteryType: resolvedBatteryType,
      annualYieldKwh: annualYieldKwh ?? (projectSnapshot?.estimatedAnnualYieldKwh ?? 0),
      lcoeUsdPerKwh: lcoeUsdPerKwh !== undefined ? lcoeUsdPerKwh : (projectSnapshot?.lcoeUsdPerKwh ?? null),
    },
    standards: [
      'IEC 62548:2024 (Photovoltaic array design requirements)',
      'IEC 60364-5-52 (DC cable cross-section & voltage drop)',
      'IEEE 1547-2018 (Distributed energy interconnection)',
      'IEC 61643-32 (Surge protection devices for PV systems)',
      'IEEE 80-2013 (Guide for Safety in AC Substation Grounding)',
    ],
  });
});

// 9. Sync Push/Pull with Rejection of Malformed Payloads (M05, M06, M07, N01, N03)
app.post('/api/v1/sync/push', (req: Request, res: Response) => {
  const { userId: headerUserId, authError } = resolveRequesterIdentity(req);
  if (authError) {
    return res.status(401).json({ error: authError });
  }

  const messages = req.body?.messages;
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid sync request: 'messages' array required." });
  }

  const ackedIds: string[] = [];
  const rejected: Array<{ id?: string; reason: string }> = [];
  const allowedEntityTypes = new Set(['project', 'report', 'shading_scene', 'financial_model']);
  const isSecure = isProductionEnv() || isAuthConfigured();

  // Track original snapshot before mutations for atomic rollback on persistence failure (M07)
  const previousProjects = new Map(db.projects);
  const previousOutbox = [...db.outbox];

  for (const msg of messages) {
    if (!msg || typeof msg !== 'object' || !msg.id || typeof msg.id !== 'string' || msg.id.trim().length === 0) {
      rejected.push({ id: msg?.id, reason: 'Missing message ID or malformed message structure' });
      continue;
    }

    const normType = typeof msg.entityType === 'string' ? msg.entityType.toLowerCase() : '';
    if (!allowedEntityTypes.has(normType)) {
      rejected.push({
        id: msg.id,
        reason: `Unsupported entityType '${msg.entityType}'. Allowed types: ${Array.from(allowedEntityTypes).join(', ')}`,
      });
      continue;
    }

    // In secure mode (production or when auth secrets are configured), all sync mutations require verified identity (N03)
    if (isSecure && !headerUserId) {
      rejected.push({
        id: msg.id,
        reason: 'Authentication required: syncing updates requires a verified identity.',
      });
      continue;
    }

    // Require non-empty payloadJson for all entity types (N03)
    if (!msg.payloadJson) {
      rejected.push({ id: msg.id, reason: `Missing payloadJson for ${normType} entity` });
      continue;
    }

    let payload: any;
    try {
      payload = typeof msg.payloadJson === 'string' ? JSON.parse(msg.payloadJson) : msg.payloadJson;
    } catch (parseErr: any) {
      rejected.push({ id: msg.id, reason: `JSON parse error in payloadJson: ${parseErr.message}` });
      continue;
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      rejected.push({ id: msg.id, reason: `Malformed payloadJson: must be a JSON object` });
      continue;
    }

    // Validate payload.id when present: must be a non-empty string (R847-06)
    if (payload.id !== undefined && (typeof payload.id !== 'string' || payload.id.trim().length === 0)) {
      rejected.push({ id: msg.id, reason: 'Malformed payload: id must be a non-empty string' });
      continue;
    }

    if (normType === 'project') {
      const targetId = payload.id;
      if (!targetId || typeof targetId !== 'string' || targetId.trim().length === 0) {
        rejected.push({ id: msg.id, reason: 'Malformed project payload: missing valid string id' });
        continue;
      }
      // Guard against ownership bypass by sending conflicting id and projectId (R847-01)
      if (payload.projectId !== undefined && payload.projectId !== targetId) {
        rejected.push({
          id: msg.id,
          reason: `Conflicting project identifiers: id ('${targetId}') does not match projectId ('${payload.projectId}')`,
        });
        continue;
      }

      // Check ownership on targetId (R847-01)
      const existingProject = db.projects.get(targetId);
      if (existingProject?.ownerId) {
        if (!headerUserId) {
          rejected.push({
            id: msg.id,
            reason: `Authentication required: project '${targetId}' is owned by '${existingProject.ownerId}'.`,
          });
          continue;
        }
        if (existingProject.ownerId !== headerUserId) {
          rejected.push({
            id: msg.id,
            reason: `Access denied: project '${targetId}' is owned by '${existingProject.ownerId}', requester is '${headerUserId}'. Cannot modify.`,
          });
          continue;
        }
      }

      // Schema validation (M06, N05)
      const validation = validateProjectSchema(payload);
      if (!validation.valid) {
        rejected.push({
          id: msg.id,
          reason: `Invalid project schema: ${validation.error}`,
        });
        continue;
      }

      // Preserve existing ownerId; if unowned, bind strictly to authenticated requesterId (never trust payload ownerId)
      const projectToStore: Project = {
        ...payload,
        ownerId: existingProject?.ownerId || headerUserId || undefined,
      };

      db.projects.set(targetId, projectToStore);
    } else {
      // Non-project entities: check referenced project ownership if specified
      const refProjId = payload.projectId;
      if (refProjId !== undefined) {
        if (typeof refProjId !== 'string' || refProjId.trim().length === 0) {
          rejected.push({ id: msg.id, reason: `Malformed ${normType} payload: projectId must be a non-empty string` });
          continue;
        }
        const existingProject = db.projects.get(refProjId);
        if (existingProject?.ownerId) {
          if (!headerUserId) {
            rejected.push({
              id: msg.id,
              reason: `Authentication required: referenced project '${refProjId}' is owned by '${existingProject.ownerId}'.`,
            });
            continue;
          }
          if (existingProject.ownerId !== headerUserId) {
            rejected.push({
              id: msg.id,
              reason: `Access denied: referenced project '${refProjId}' is owned by '${existingProject.ownerId}', requester is '${headerUserId}'. Cannot attach entity.`,
            });
            continue;
          }
        }
      }

      if (normType === 'report') {
        if (payload.reportId !== undefined && (typeof payload.reportId !== 'string' || payload.reportId.trim().length === 0)) {
          rejected.push({ id: msg.id, reason: 'Malformed report payload: reportId must be a non-empty string' });
          continue;
        }
        const hasId = (typeof payload.id === 'string' && payload.id.trim().length > 0) ||
                      (typeof payload.reportId === 'string' && payload.reportId.trim().length > 0);
        const hasTitle = (typeof payload.title === 'string' && payload.title.trim().length > 0) ||
                         (typeof payload.projectName === 'string' && payload.projectName.trim().length > 0);
        if (!hasId && !hasTitle) {
          rejected.push({ id: msg.id, reason: 'Malformed report payload: missing valid string identifier or title' });
          continue;
        }
      } else if (normType === 'shading_scene') {
        if (payload.sceneId !== undefined && (typeof payload.sceneId !== 'string' || payload.sceneId.trim().length === 0)) {
          rejected.push({ id: msg.id, reason: 'Malformed shading_scene payload: sceneId must be a non-empty string' });
          continue;
        }
        const hasId = (typeof payload.id === 'string' && payload.id.trim().length > 0) ||
                      (typeof payload.sceneId === 'string' && payload.sceneId.trim().length > 0);
        const hasGeometry = Array.isArray(payload.roofPlanes) || Array.isArray(payload.pvTables);
        if (!hasId && !hasGeometry) {
          rejected.push({ id: msg.id, reason: 'Malformed shading_scene payload: missing valid string identifier or geometry arrays' });
          continue;
        }
      } else if (normType === 'financial_model') {
        if (payload.modelId !== undefined && (typeof payload.modelId !== 'string' || payload.modelId.trim().length === 0)) {
          rejected.push({ id: msg.id, reason: 'Malformed financial_model payload: modelId must be a non-empty string' });
          continue;
        }
        const hasId = (typeof payload.id === 'string' && payload.id.trim().length > 0) ||
                      (typeof payload.modelId === 'string' && payload.modelId.trim().length > 0);
        const hasParams = (typeof payload.framework === 'string' && payload.framework.trim().length > 0) ||
                          (typeof payload.capacityKwp === 'number' && Number.isFinite(payload.capacityKwp));
        if (!hasId && !hasParams) {
          rejected.push({ id: msg.id, reason: 'Malformed financial_model payload: missing valid string identifier or parameters' });
          continue;
        }
      }
    }

    // Bind outbox record strictly to authenticated identity, preventing spoofed userId insertion (R847-06)
    const sanitizedUserId = headerUserId || (isSecure ? undefined : (typeof msg.userId === 'string' && msg.userId.trim().length > 0 ? msg.userId.trim() : undefined));

    db.outbox.push({
      ...msg,
      userId: sanitizedUserId,
      payloadJson: typeof msg.payloadJson === 'string' ? msg.payloadJson : JSON.stringify(msg.payloadJson),
      processed: true,
      processedAt: new Date().toISOString(),
    });
    ackedIds.push(msg.id);
  }

  // Durable disk persistence with rollback semantics (M07)
  if (ackedIds.length > 0) {
    const persisted = saveDatabase();
    if (!persisted) {
      // Rollback memory modifications: both projects AND outbox
      db.projects.clear();
      for (const [k, v] of previousProjects.entries()) {
        db.projects.set(k, v);
      }
      db.outbox = previousOutbox;
      return res.status(500).json({
        success: false,
        processedCount: 0,
        ackedIds: [],
        rejected: [
          ...rejected,
          { reason: 'Storage persistence failure: snapshot write failed on disk. All modifications rolled back.' },
        ],
      });
    }
  }

  const allSucceeded = rejected.length === 0 && (ackedIds.length > 0 || messages.length === 0);
  const status = ackedIds.length > 0 || messages.length === 0 ? 200 : 400;

  res.status(status).json({
    success: allSucceeded,
    processedCount: ackedIds.length,
    ackedIds,
    rejected,
  });
});

app.get('/api/v1/sync/pull', (req: Request, res: Response) => {
  const { userId: requesterId, authError } = resolveRequesterIdentity(req);
  if (authError) {
    return res.status(401).json({ error: authError });
  }
  const isSecure = isProductionEnv() || isAuthConfigured();
  if (isSecure && !requesterId) {
    return res.status(401).json({ error: 'Authentication required: pulling sync updates requires a verified identity.' });
  }

  const allProjects = Array.from(db.projects.values());
  const accessibleProjects = (isSecure || requesterId)
    ? allProjects.filter((p) => !p.ownerId || p.ownerId === requesterId)
    : allProjects;

  res.json({
    currentClock: Date.now(),
    projects: accessibleProjects,
  });
});

// 404 handler for unmatched API routes (P3-01 / MAIN-01)
app.all(['/api', '/api/*'], (req: Request, res: Response) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.originalUrl || req.url,
  });
});

// Global API error handler ensuring JSON response for all /api errors (MAIN-01)
app.use((err: any, req: Request, res: Response, next: (e?: any) => void) => {
  if (req.path?.startsWith('/api') || req.originalUrl?.startsWith('/api')) {
    const status = typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
    res.status(status).json({
      error: err.name || 'Internal Server Error',
      message: err.message || 'An unexpected error occurred processing the API request.',
    });
    return;
  }
  next(err);
});

// ----------------------------------------------------------------
// VITE DEV SERVER OR STATIC SERVING (M20 dynamic import)
// ----------------------------------------------------------------
async function startServer() {
  if (!isProduction) {
    // Dynamic import to prevent devDependencies requirement in production runtime
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SolarPV Studio] Server running on http://0.0.0.0:${PORT}`);
  });
}

// Only start the server when run directly (not when imported for integration tests)
const isMainModule = process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'));
if (process.env.NODE_ENV !== 'test' && isMainModule) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export { app, db, saveDatabase, loadDatabase, DB_PERSIST_PATH, setPersistPathForTesting };
