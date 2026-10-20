import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import {
  InMemorySolarDatabase,
  calculateSolarPosition,
  calculatePoaIrradiance,
  calculateStringSizing,
  calculateVoltageDropDc,
  calculateLcoe,
  calculateNpv,
  calculateIrr,
  calculateShadingFactor,
  performQuickSizing,
  DEFAULT_MODULES,
  DEFAULT_INVERTERS,
  DEFAULT_BATTERIES,
} from './src/engine/solarPvEngine.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// In-Memory Database store
const db = new InMemorySolarDatabase();

// Seed initial sample projects
const initialProject = performQuickSizing(
  {
    projectName: "Tehran Villa System",
    latitude: 35.6895,
    longitude: 51.3890,
    dailyKwh: 20.0,
    autonomyDays: 1.5,
    moduleId: DEFAULT_MODULES[0].id,
    inverterId: DEFAULT_INVERTERS[0].id,
    batteryId: DEFAULT_BATTERIES[0].id,
  },
  db
);

// ----------------------------------------------------------------
// API ROUTES
// ----------------------------------------------------------------

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// 1. Solar calculations
app.post('/api/v1/solar/position', (req: Request, res: Response) => {
  try {
    const { latitudeDeg = 35.6895, longitudeDeg = 51.3890, utcTs = Math.floor(Date.now() / 1000) } = req.body;
    const result = calculateSolarPosition(Number(latitudeDeg), Number(longitudeDeg), Number(utcTs));
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/v1/solar/poa', (req: Request, res: Response) => {
  try {
    const result = calculatePoaIrradiance(req.body);
    res.json({ poaIrradiance: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 2. Electrical calculations
app.post('/api/v1/electrical/string-sizing', (req: Request, res: Response) => {
  try {
    const result = calculateStringSizing(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/v1/electrical/voltage-drop', (req: Request, res: Response) => {
  try {
    const { lengthM, currentA, crossSectionMm2, vNominal, rho } = req.body;
    const pct = calculateVoltageDropDc(
      Number(lengthM),
      Number(currentA),
      Number(crossSectionMm2),
      Number(vNominal),
      rho !== undefined ? Number(rho) : undefined
    );
    res.json({ voltageDropPct: pct });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Financial calculations
app.post('/api/v1/finance/lcoe', (req: Request, res: Response) => {
  try {
    const { capex, opexAnnual, energyAnnual, discountRate = 0.05, lifetimeYears = 25 } = req.body;
    const val = calculateLcoe(
      Number(capex),
      Number(opexAnnual),
      Number(energyAnnual),
      Number(discountRate),
      Number(lifetimeYears)
    );
    res.json({ lcoeValue: val });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/v1/finance/npv', (req: Request, res: Response) => {
  try {
    const { rate, cashflows } = req.body;
    const val = calculateNpv(Number(rate), cashflows || []);
    res.json({ npvValue: val });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/v1/finance/irr', (req: Request, res: Response) => {
  try {
    const { cashflows } = req.body;
    const val = calculateIrr(cashflows || []);
    res.json({ irrValue: val });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 4. 3D Shading Ray-Tracer
app.post('/api/v1/shading/analyze', (req: Request, res: Response) => {
  try {
    const { meshTriangles = [], targetPoints = [], sunDirections = [] } = req.body;
    const factors = calculateShadingFactor(meshTriangles, targetPoints, sunDirections);
    res.json({ shadingFactors: factors });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 5. Quick Sizing Project
app.post('/api/v1/projects/quick-size', (req: Request, res: Response) => {
  try {
    const result = performQuickSizing(req.body, db);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 6. Project List
app.get('/api/v1/projects', (_req: Request, res: Response) => {
  res.json(Array.from(db.projects.values()));
});

// 7. Catalog (Modules, Inverters, Batteries)
app.get('/api/v1/catalog/modules', (_req: Request, res: Response) => {
  res.json(Array.from(db.pvModules.values()));
});

app.post('/api/v1/catalog/modules', (req: Request, res: Response) => {
  const item = { ...req.body, id: req.body.id || `mod-${Date.now()}` };
  db.pvModules.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/v1/catalog/inverters', (_req: Request, res: Response) => {
  res.json(Array.from(db.inverters.values()));
});

app.post('/api/v1/catalog/inverters', (req: Request, res: Response) => {
  const item = { ...req.body, id: req.body.id || `inv-${Date.now()}` };
  db.inverters.set(item.id, item);
  res.status(201).json(item);
});

app.get('/api/v1/catalog/batteries', (_req: Request, res: Response) => {
  res.json(Array.from(db.batteries.values()));
});

app.post('/api/v1/catalog/batteries', (req: Request, res: Response) => {
  const item = { ...req.body, id: req.body.id || `bat-${Date.now()}` };
  db.batteries.set(item.id, item);
  res.status(201).json(item);
});

// 8. Reports Generation
app.post('/api/v1/reports/generate', (req: Request, res: Response) => {
  const {
    projectName = "Solar Project",
    projectId = "N/A",
    systemCapacityKwp = 0,
    panelCount = 0,
    inverterCount = 0,
    batteryCount = 0,
    annualYieldKwh = 0,
    lcoeUsdPerKwh = 0,
  } = req.body;

  res.json({
    title: "Official EPC Solar PV Design Proposal",
    projectName,
    projectId,
    generatedAt: new Date().toISOString(),
    metrics: {
      systemCapacityKwp,
      panelCount,
      panelType: "575W N-Type High Efficiency Modules",
      inverterCount,
      inverterType: "10kW String Inverters (Three-Phase)",
      batteryCount,
      batteryType: "10.2kWh LiFePO4 Energy Storage Bank",
      annualYieldKwh,
      lcoeUsdPerKwh,
    },
    standards: [
      "IEC 62548:2024 (Photovoltaic array design requirements)",
      "IEC 60364-5-52 (DC cable cross-section & voltage drop)",
      "IEEE 1547-2018 (Distributed energy interconnection)",
      "IEC 61643-32 (Surge protection devices for PV systems)",
    ]
  });
});

// 9. Sync Push/Pull
app.post('/api/v1/sync/push', (req: Request, res: Response) => {
  const messages = req.body.messages || [];
  const ackedIds: string[] = [];

  for (const msg of messages) {
    if (msg.entityType === 'Project' && msg.payloadJson) {
      try {
        const proj = typeof msg.payloadJson === 'string' ? JSON.parse(msg.payloadJson) : msg.payloadJson;
        if (proj && proj.id) {
          db.projects.set(proj.id, proj);
        }
      } catch {
        // ignore parse error
      }
    }
    db.outbox.push({ ...msg, processed: true, processedAt: new Date().toISOString() });
    if (msg.id) ackedIds.push(msg.id);
  }

  res.json({
    success: true,
    processedCount: ackedIds.length,
    ackedIds,
  });
});

app.get('/api/v1/sync/pull', (req: Request, res: Response) => {
  res.json({
    currentClock: Date.now(),
    projects: Array.from(db.projects.values()),
  });
});

// ----------------------------------------------------------------
// VITE DEV SERVER OR STATIC SERVING
// ----------------------------------------------------------------
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
