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

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

function isProductionEnv(): boolean {
  return process.env.NODE_ENV === 'production';
}

function isAuthConfigured(): boolean {
  return Boolean(process.env.INTERNAL_GATEWAY_SECRET || process.env.JWT_SECRET);
}

app.use(express.json());

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

// 1. Solar calculations
app.post('/api/v1/solar/position', (req: Request, res: Response) => {
  try {
    const { latitudeDeg = 35.6895, longitudeDeg = 51.389, utcTs = Math.floor(Date.now() / 1000) } = req.body;
    const lat = Number(latitudeDeg);
    const lng = Number(longitudeDeg);
    const ts = Number(utcTs);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ error: `Invalid latitude: must be between -90 and 90, got ${latitudeDeg}` });
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ error: `Invalid longitude: must be between -180 and 180, got ${longitudeDeg}` });
    }
    if (!Number.isFinite(ts) || ts <= 0) {
      return res.status(400).json({ error: `Invalid timestamp: must be a positive number, got ${utcTs}` });
    }

    const result = calculateSolarPosition(lat, lng, ts);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/v1/solar/poa', (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (
      body.surfaceTiltDeg !== undefined &&
      (typeof body.surfaceTiltDeg !== 'number' || !Number.isFinite(body.surfaceTiltDeg) || body.surfaceTiltDeg < 0 || body.surfaceTiltDeg > 90)
    ) {
      return res.status(400).json({ error: `Invalid surfaceTiltDeg: must be between 0 and 90, got ${body.surfaceTiltDeg}` });
    }
    if (
      body.dniWm2 !== undefined &&
      (typeof body.dniWm2 !== 'number' || !Number.isFinite(body.dniWm2) || body.dniWm2 < 0)
    ) {
      return res.status(400).json({ error: `Invalid dniWm2: must be a non-negative number, got ${body.dniWm2}` });
    }
    if (
      body.dhiWm2 !== undefined &&
      (typeof body.dhiWm2 !== 'number' || !Number.isFinite(body.dhiWm2) || body.dhiWm2 < 0)
    ) {
      return res.status(400).json({ error: `Invalid dhiWm2: must be a non-negative number, got ${body.dhiWm2}` });
    }
    if (
      body.ghiWm2 !== undefined &&
      (typeof body.ghiWm2 !== 'number' || !Number.isFinite(body.ghiWm2) || body.ghiWm2 < 0)
    ) {
      return res.status(400).json({ error: `Invalid ghiWm2: must be a non-negative number, got ${body.ghiWm2}` });
    }

    const result = calculatePoaIrradiance(body);
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

    const result = calculateStringSizing({
      ...req.body,
      betaVocPerC: rawBeta,
      betaPmpPerC: rawBetaPmp,
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
    if (!Number.isFinite(lt) || lt <= 0) {
      return res.status(400).json({ error: `Lifetime years must be a positive non-zero finite number, got ${lifetimeYears}` });
    }

    const val = calculateLcoe(c, o, energy, d, lt);
    res.json({ lcoeValue: val });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/v1/finance/npv', (req: Request, res: Response) => {
  try {
    const { rate, cashflows } = req.body;
    const r = Number(rate);
    if (!Number.isFinite(r)) {
      return res.status(400).json({ error: `Rate must be a finite number, got ${rate}` });
    }
    if (!Array.isArray(cashflows) || cashflows.some(c => typeof c !== 'number' || !Number.isFinite(c))) {
      return res.status(400).json({ error: 'Cash flows must be an array of finite numbers' });
    }

    const val = calculateNpv(r, cashflows);
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

        const expectedSig = crypto
          .createHmac('sha256', jwtSecret)
          .update(parts[0] + '.' + parts[1])
          .digest('base64')
          .replace(/=/g, '')
          .replace(/\+/g, '-')
          .replace(/\//g, '_');

        if (!constantTimeEqual(parts[2], expectedSig)) {
          return { authError: 'Invalid bearer token: signature verification failed' };
        }

        try {
          const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
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
    if (latitude !== undefined && (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
      return res.status(400).json({ error: `latitude must be between -90 and 90, got ${latitude}` });
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
    const result = performQuickSizing({ ...req.body, ownerId: resolvedOwnerId }, db);
    const persisted = saveDatabase();
    if (!persisted) {
      db.projects.delete(result.projectId);
      return res.status(500).json({ error: 'Failed to persist created project to storage.' });
    }
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 6. Project List and Project CRUD with Authorization
app.get('/api/v1/projects', (_req: Request, res: Response) => {
  res.json(Array.from(db.projects.values()));
});

app.get('/api/v1/projects/:id', (req: Request, res: Response) => {
  const project = db.projects.get(req.params.id as string);
  if (!project) return res.status(404).json({ error: `Project '${req.params.id}' not found` });
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
app.get('/api/v1/catalog/modules', (_req: Request, res: Response) => {
  res.json(Array.from(db.pvModules.values()));
});

app.post('/api/v1/catalog/modules', (req: Request, res: Response) => {
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
  const previousItem = db.pvModules.get(item.id);
  db.pvModules.set(item.id, item);
  const persisted = saveDatabase();
  if (!persisted) {
    if (previousItem !== undefined) {
      db.pvModules.set(item.id, previousItem);
    } else {
      db.pvModules.delete(item.id);
    }
    return res.status(500).json({ error: 'Failed to persist PV module to storage.' });
  }
  res.status(201).json(item);
});

app.get('/api/v1/catalog/inverters', (_req: Request, res: Response) => {
  res.json(Array.from(db.inverters.values()));
});

app.post('/api/v1/catalog/inverters', (req: Request, res: Response) => {
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
  const previousItem = db.inverters.get(item.id);
  db.inverters.set(item.id, item);
  const persisted = saveDatabase();
  if (!persisted) {
    if (previousItem !== undefined) {
      db.inverters.set(item.id, previousItem);
    } else {
      db.inverters.delete(item.id);
    }
    return res.status(500).json({ error: 'Failed to persist inverter to storage.' });
  }
  res.status(201).json(item);
});

app.get('/api/v1/catalog/batteries', (_req: Request, res: Response) => {
  res.json(Array.from(db.batteries.values()));
});

app.post('/api/v1/catalog/batteries', (req: Request, res: Response) => {
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
  const previousItem = db.batteries.get(item.id);
  db.batteries.set(item.id, item);
  const persisted = saveDatabase();
  if (!persisted) {
    if (previousItem !== undefined) {
      db.batteries.set(item.id, previousItem);
    } else {
      db.batteries.delete(item.id);
    }
    return res.status(500).json({ error: 'Failed to persist battery to storage.' });
  }
  res.status(201).json(item);
});

// 8. Reports Generation with Snapshot Reconciliation (M09)
app.post('/api/v1/reports/generate', (req: Request, res: Response) => {
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

  // Snapshot Reconciliation against persistent database (M09)
  const projectSnapshot = projectId && projectId !== 'N/A' ? db.projects.get(projectId) : undefined;
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

    // Explicit discrepancy checks across physical metrics (M09)
    if (
      systemCapacityKwp !== undefined &&
      Math.abs(systemCapacityKwp - projectSnapshot.systemCapacityKwp) / Math.max(1, projectSnapshot.systemCapacityKwp) > 0.01
    ) {
      discrepancies.push(`Capacity mismatch: report=${systemCapacityKwp} kWp vs snapshot=${projectSnapshot.systemCapacityKwp} kWp`);
    }
    if (panelCount !== undefined && panelCount !== projectSnapshot.panelCount) {
      discrepancies.push(`Panel count mismatch: report=${panelCount} vs snapshot=${projectSnapshot.panelCount}`);
    }
    if (inverterCount !== undefined && inverterCount !== projectSnapshot.inverterCount) {
      discrepancies.push(`Inverter count mismatch: report=${inverterCount} vs snapshot=${projectSnapshot.inverterCount}`);
    }
    if (batteryCount !== undefined && batteryCount !== projectSnapshot.batteryCount) {
      discrepancies.push(`Battery count mismatch: report=${batteryCount} vs snapshot=${projectSnapshot.batteryCount}`);
    }
    if (annualYieldKwh !== undefined && typeof projectSnapshot.estimatedAnnualYieldKwh === 'number') {
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

// 9. Sync Push/Pull with Rejection of Malformed Payloads (M05, M06, M07)
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

  // Track original snapshot before mutations for atomic rollback on persistence failure (M07)
  const previousProjects = new Map(db.projects);
  const previousOutbox = [...db.outbox];

  for (const msg of messages) {
    if (!msg || typeof msg !== 'object' || !msg.id) {
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

    if (normType === 'project') {
      if (!msg.payloadJson) {
        rejected.push({ id: msg.id, reason: 'Missing payloadJson for Project entity' });
        continue;
      }
      try {
        const proj = typeof msg.payloadJson === 'string' ? JSON.parse(msg.payloadJson) : msg.payloadJson;
        if (!proj || typeof proj !== 'object' || !proj.id) {
          rejected.push({ id: msg.id, reason: 'Malformed project payload: missing id' });
          continue;
        }

        // Schema validation (M06)
        const validation = validateProjectSchema(proj);
        if (!validation.valid) {
          rejected.push({
            id: msg.id,
            reason: `Invalid project schema: ${validation.error}`,
          });
          continue;
        }

        // Ownership authorization check (M06)
        const existing = db.projects.get(proj.id);
        const requesterId = headerUserId;

        // In secure mode (production or when auth secrets are configured), all sync project mutations require verified authentication
        const isSecure = isProductionEnv() || isAuthConfigured();
        if (isSecure && !requesterId) {
          rejected.push({
            id: msg.id,
            reason: 'Authentication required: syncing project modifications requires a verified identity.',
          });
          continue;
        }

        if (existing?.ownerId) {
          if (!requesterId) {
            rejected.push({
              id: msg.id,
              reason: `Authentication required: project '${proj.id}' is owned by '${existing.ownerId}'. Identity must be supplied via Bearer token or authenticated gateway header.`,
            });
            continue;
          }
          if (existing.ownerId !== requesterId) {
            rejected.push({
              id: msg.id,
              reason: `Access denied: project '${proj.id}' is owned by '${existing.ownerId}', requester is '${requesterId}'. Cannot modify.`,
            });
            continue;
          }
        }

        // Preserve existing ownerId; if unowned, bind strictly to authenticated requesterId (never trust payload ownerId)
        const projectToStore: Project = {
          ...proj,
          ownerId: existing?.ownerId || requesterId || undefined,
        };

        db.projects.set(proj.id, projectToStore);
      } catch (parseErr: any) {
        rejected.push({ id: msg.id, reason: `JSON parse error in payloadJson: ${parseErr.message}` });
        continue;
      }
    }

    db.outbox.push({ ...msg, processed: true, processedAt: new Date().toISOString() });
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

app.get('/api/v1/sync/pull', (_req: Request, res: Response) => {
  res.json({
    currentClock: Date.now(),
    projects: Array.from(db.projects.values()),
  });
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
