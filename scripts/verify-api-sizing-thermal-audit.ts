import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  performQuickSizing,
  InMemorySolarDatabase,
  calculateStringSizing,
  DEFAULT_MODULES,
} from '../src/engine/solarPvEngine';
import { designPvArray } from '../src/engine/pvEngineAdvanced';
import { CATALOG_MODULES, CATALOG_INVERTERS } from '../src/engine/equipmentCatalogData';
import { simulate24hEnergyBalance } from '../src/engine/simulation24hEngine';

console.log('================================================================================');
console.log(' SolarPV Studio — API Quick-Sizing, String Thermal & Simulation Audit Probe');
console.log('================================================================================\n');

let passedTests = 0;
let totalTests = 0;

function check(label: string, condition: boolean, detail?: string): void {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${label}${detail ? ` -> ${detail}` : ''}`);
  } else {
    console.error(`  ✗ [FAIL] ${label}${detail ? ` -> ${detail}` : ''}`);
    process.exitCode = 1;
  }
}

async function runProbe() {
  const db = new InMemorySolarDatabase();

  // --------------------------------------------------------------------------
  // Finding F-01: Scale-Matched Equipment Selection in Quick Sizing
  // --------------------------------------------------------------------------
  console.log('--- [F-01] Scale-Matched Quick Sizing Equipment Defaults ---');

  // Residential Case: 20 kWh/day, 1 day autonomy at Tehran (lat 35.6895) -> ~5.3 kWp
  const resQuick = performQuickSizing({
    projectName: 'Residential Rooftop Villa',
    latitude: 35.6895,
    longitude: 51.389,
    dailyKwh: 20,
    autonomyDays: 1,
  }, db);

  const resProject = db.projects.get(resQuick.projectId)!;
  const resInverter = db.inverters.get(resProject.inverterId!)!;
  const resBattery = db.batteries.get(resProject.batteryId!)!;

  check(
    'F-01: Residential system (5.3 kWp) selects residential-scale inverter (<= 25 kW)',
    resInverter.pnomAcKw <= 25,
    `selected ${resInverter.modelName} (${resInverter.pnomAcKw} kW)`
  );
  check(
    'F-01: Residential system selects residential-scale battery (<= 15 kWh per unit)',
    resBattery.capacityKwh <= 15,
    `selected ${resBattery.modelName} (${resBattery.capacityKwh} kWh)`
  );
  check(
    'F-01: Residential system LCOE is bankable and realistic ($0.10 - $0.25/kWh, NOT $1.51)',
    resQuick.lcoeUsdPerKwh > 0.10 && resQuick.lcoeUsdPerKwh < 0.25,
    `LCOE = $${resQuick.lcoeUsdPerKwh.toFixed(4)}/kWh (Capacity: ${resQuick.systemCapacityKwp} kWp)`
  );

  // Canonical Audit Case: 20 kWh/day, 1.5 days autonomy (storage requirement ≈ 33.3 kWh)
  const canonQuick = performQuickSizing({
    projectName: 'Residential Canonical Audit Case 1.5d',
    latitude: 35.6895,
    longitude: 51.389,
    dailyKwh: 20,
    autonomyDays: 1.5,
  }, db);
  const canonProject = db.projects.get(canonQuick.projectId)!;
  const canonInverter = db.inverters.get(canonProject.inverterId!)!;
  const canonBattery = db.batteries.get(canonProject.batteryId!)!;

  check(
    'F-01: Canonical scenario (20 kWh/day, 1.5d auto -> 33.3 kWh) selects residential battery (<= 30 kWh, NOT 200 kWh)',
    canonBattery.capacityKwh <= 30 && canonBattery.capacityKwh >= 2.0,
    `selected ${canonBattery.modelName} (${canonBattery.capacityKwh} kWh)`
  );
  check(
    'F-01: Canonical scenario LCOE satisfies bankable threshold (< $0.25/kWh, NOT $0.84)',
    canonQuick.lcoeUsdPerKwh < 0.25 && canonQuick.lcoeUsdPerKwh > 0.10,
    `LCOE = $${canonQuick.lcoeUsdPerKwh.toFixed(4)}/kWh (Capacity: ${canonQuick.systemCapacityKwp} kWp, Units: ${canonQuick.batteryCount})`
  );

  // Commercial Case: 400 kWh/day, 0.5 day autonomy -> ~100 kWp
  const comQuick = performQuickSizing({
    projectName: 'Commercial Warehouse 100kWp',
    latitude: 35.6895,
    longitude: 51.389,
    dailyKwh: 400,
    autonomyDays: 0.5,
  }, db);
  const comProject = db.projects.get(comQuick.projectId)!;
  const comInverter = db.inverters.get(comProject.inverterId!)!;
  const comBattery = db.batteries.get(comProject.batteryId!)!;

  check(
    'F-01: Commercial system (100 kWp) selects commercial-scale inverter (25 - 150 kW)',
    comInverter.pnomAcKw >= 25 && comInverter.pnomAcKw <= 150,
    `selected ${comInverter.modelName} (${comInverter.pnomAcKw} kW)`
  );
  check(
    'F-01: Commercial system selects commercial-scale battery (20 - 150 kWh)',
    comBattery.capacityKwh >= 20 && comBattery.capacityKwh <= 150,
    `selected ${comBattery.modelName} (${comBattery.capacityKwh} kWh)`
  );
  check(
    'F-01: Commercial system LCOE is economical ($0.08 - $0.18/kWh)',
    comQuick.lcoeUsdPerKwh > 0.08 && comQuick.lcoeUsdPerKwh < 0.18,
    `LCOE = $${comQuick.lcoeUsdPerKwh.toFixed(4)}/kWh`
  );

  // Utility Case: 4000 kWh/day, 1 day autonomy -> ~1000 kWp
  const utilQuick = performQuickSizing({
    projectName: 'Utility Solar Powerplant 1MW',
    latitude: 35.6895,
    longitude: 51.389,
    dailyKwh: 4000,
    autonomyDays: 1,
  }, db);
  const utilProject = db.projects.get(utilQuick.projectId)!;
  const utilInverter = db.inverters.get(utilProject.inverterId!)!;
  const utilBattery = db.batteries.get(utilProject.batteryId!)!;

  check(
    'F-01: Utility system (1000 kWp) selects utility-scale inverter (>= 150 kW)',
    utilInverter.pnomAcKw >= 150,
    `selected ${utilInverter.modelName} (${utilInverter.pnomAcKw} kW)`
  );
  check(
    'F-01: Utility system selects utility container BESS (>= 150 kWh)',
    utilBattery.capacityKwh >= 150,
    `selected ${utilBattery.modelName} (${utilBattery.capacityKwh} kWh)`
  );

  // --------------------------------------------------------------------------
  // Finding F-02: String Sizing Thermal Model Unification between API & UI
  // --------------------------------------------------------------------------
  console.log('\n--- [F-02] String Sizing Hot-Case Thermal Model Unification ---');

  const jinkoMod = CATALOG_MODULES.find((m) => m.id === 'mod-jinko-550w') || CATALOG_MODULES[0];
  const deyeInv = CATALOG_INVERTERS.find((i) => i.id === 'inv-deye-5k-1p') || CATALOG_INVERTERS[25];

  // UI computation with ambient temp -10 to 40°C
  const uiDesign = designPvArray(
    20,
    5.17,
    { ...jinkoMod, noctC: 45.0, lengthM: 2.278, widthM: 1.134 },
    { ...deyeInv, pnomAcKw: deyeInv.pnomKw, mpptChannelsCount: 2, imppMaxAmpsPerMppt: 13, iscMaxAmpsPerMppt: 17, efficiencyMaxPct: 97.6 },
    {
      ambientTempMinC: -10,
      ambientTempMaxC: 40,
      arrayTiltDeg: 25,
      installationEnvironment: 'ground_mount',
      soilingLossPct: 2,
      dcCableLossPct: 1.5,
      mismatchAndLidLossPct: 2,
      systemAvailabilityPct: 99,
      inverterClippingLossPct: 0,
      groundAlbedo: 0.2,
    },
    35.6892
  );

  // API string sizing computation with ambient temp 40°C using unified NOCT model
  const apiStringSizing = calculateStringSizing({
    panelVoc: jinkoMod.vocVolts,
    panelVmp: jinkoMod.vmpVolts,
    tempMinC: -10,
    tempMaxC: 40,
    noctC: 45.0,
    installationEnvironment: 'ground_mount',
    betaVocPerC: jinkoMod.tempCoeffVocPct / 100,
    betaPmpPerC: jinkoMod.tempCoeffPmpPct / 100,
    inverterVdcMax: deyeInv.vdcMaxVolts,
    inverterMpptMin: 200, // MPPT floor sensitivity
    inverterMpptMax: deyeInv.vmpptMaxVolts,
  });

  check(
    'F-02: API string sizing evaluates cell temperature under irradiance (~71.25°C)',
    Boolean(apiStringSizing.effectiveCellTempMaxC && Math.abs(apiStringSizing.effectiveCellTempMaxC - 71.25) < 0.1),
    `effectiveCellTemp = ${apiStringSizing.effectiveCellTempMaxC}°C`
  );

  // Direct Vmp comparison between ambient and cell temp
  const vmpSTC = jinkoMod.vmpVolts;
  const betaPmp = jinkoMod.tempCoeffPmpPct / 100;
  const vmpAmbient = vmpSTC * (1 + betaPmp * (40 - 25));
  const vmpCell = vmpSTC * (1 + betaPmp * (71.25 - 25));
  const minModAmbient = Math.ceil(200 / vmpAmbient); // 5
  const minModCell = Math.ceil(200 / vmpCell); // 6

  check(
    'F-02: String sizing hot-case floor uses cell temperature (6 modules) rather than unheated ambient (5 modules)',
    apiStringSizing.minModules === minModCell && minModCell === 6 && minModAmbient === 5,
    `minModules = ${apiStringSizing.minModules} (matches cell-based safety requirement of 6 vs ambient 5)`
  );

  // --------------------------------------------------------------------------
  // Finding F-03: Latitude Presence Validation in Quick Sizing
  // --------------------------------------------------------------------------
  console.log('\n--- [F-03] Latitude Presence & Validity Validation ---');

  let missingLatThrew = false;
  try {
    performQuickSizing({
      projectName: 'Missing Lat Project',
      latitude: undefined as any,
      longitude: 51.389,
      dailyKwh: 20,
      autonomyDays: 1,
    }, db);
  } catch (err: any) {
    missingLatThrew = true;
  }
  check('F-03: performQuickSizing throws Error when latitude is undefined', missingLatThrew);

  let nanLatThrew = false;
  try {
    performQuickSizing({
      projectName: 'NaN Lat Project',
      latitude: NaN,
      longitude: 51.389,
      dailyKwh: 20,
      autonomyDays: 1,
    }, db);
  } catch (err: any) {
    nanLatThrew = true;
  }
  check('F-03: performQuickSizing throws Error when latitude is NaN', nanLatThrew);

  let outOfBoundsLatThrew = false;
  try {
    performQuickSizing({
      projectName: 'Out of Bounds Lat Project',
      latitude: 99.5,
      longitude: 51.389,
      dailyKwh: 20,
      autonomyDays: 1,
    }, db);
  } catch (err: any) {
    outOfBoundsLatThrew = true;
  }
  check('F-03: performQuickSizing throws Error when latitude > 90', outOfBoundsLatThrew);

  // --------------------------------------------------------------------------
  // Finding F-04: raw energy remains full precision; human-facing display rounding
  // and independent arithmetic are verified in verify-f04-energy-contract.ts.
  // --------------------------------------------------------------------------
  console.log('\n--- [F-04] Raw Energy Conservation and Display-Only Rounding ---');
  const simResult = simulate24hEnergyBalance(10, 5.2, 24.55, 18.25, 25, 30, 50, 9.58);
  const sumWithCompensation = (values: number[]) => {
    let sum = 0;
    let correction = 0;
    for (const value of values) {
      const adjusted = value - correction;
      const next = sum + adjusted;
      correction = (next - sum) - adjusted;
      sum = next;
    }
    return sum;
  };
  const rawBounds = (values: number[]) => {
    const nEpsilon = 24 * Number.EPSILON;
    const gamma = nEpsilon / (1 - nEpsilon);
    return gamma * values.reduce((sum, value) => sum + Math.abs(value), 0)
      + 4 * Number.EPSILON * Math.max(1, ...values.map(Math.abs));
  };
  for (const [label, field, total] of [
    ['generation', 'solarGenKwh', simResult.totalGeneration24hKwh],
    ['consumption', 'loadDemandKwh', simResult.totalConsumption24hKwh],
    ['surplus', 'surplusKwh', simResult.totalSurplus24hKwh],
    ['deficit', 'deficitKwh', simResult.totalDeficit24hKwh],
  ] as const) {
    const hourly = simResult.hourlySteps.map((step) => step[field]);
    const independent = sumWithCompensation(hourly);
    check(
      `F-04: raw ${label} total agrees with independently compensated hourly values within the 24-term IEEE-754 bound`,
      Math.abs(total - independent) <= rawBounds(hourly),
      `rawTotal=${total}; compensatedHourly=${independent}; bound=${rawBounds(hourly)}`,
    );
  }
  const rawDemand = sumWithCompensation(simResult.hourlySteps.map((step) => step.loadDemandKwh));
  const modeledDemand = 24.55 + 18.25;
  check(
    'F-04: raw hourly demand conserves the independent daytime-plus-nighttime model input',
    Math.abs(rawDemand - modeledDemand) <= rawBounds(simResult.hourlySteps.map((step) => step.loadDemandKwh)),
    `rawHourlyDemand=${rawDemand}; modelInput=${modeledDemand}`,
  );
  const rawGeneration = sumWithCompensation(simResult.hourlySteps.map((step) => step.solarGenKwh));
  const modeledGeneration = 10 * 5.2 * 0.78;
  check(
    'F-04: raw hourly generation conserves the independently calculated daily PV model input',
    Math.abs(rawGeneration - modeledGeneration) <= rawBounds(simResult.hourlySteps.map((step) => step.solarGenKwh)),
    `rawHourlyGeneration=${rawGeneration}; modelInput=${modeledGeneration}`,
  );
  check(
    'F-04: sub-cent values remain unrounded in the simulation result',
    simResult.hourlySteps.some((step) => step.solarGenKwh !== Math.round(step.solarGenKwh * 100) / 100),
  );

  // --------------------------------------------------------------------------
  // Express Route Handlers Live Verification
  // --------------------------------------------------------------------------
  console.log('\n--- Live Express API Endpoint Invocations ---');
  const { app, db: serverDb } = await import('../server');

  const quickSizeRoute = (app as any)._router.stack
    .find((r: any) => r.route && r.route.path === '/api/v1/projects/quick-size' && r.route.methods.post)
    ?.route.stack[0].handle;

  let qsStatus = 200;
  let qsBody: any = null;
  const mockQsRes: any = {
    status(s: number) { qsStatus = s; return this; },
    json(d: any) { qsBody = d; return this; },
  };

  // 1. Missing latitude returns HTTP 400
  await quickSizeRoute({ body: { dailyKwh: 20, autonomyDays: 1 } }, mockQsRes);
  check(
    'F-03: Route POST /api/v1/projects/quick-size without latitude returns HTTP 400',
    qsStatus === 400 && qsBody.error.includes('latitude is required'),
    `status=${qsStatus}, error="${qsBody?.error}"`
  );

  // 2. Valid residential quick sizing returns HTTP 200 with realistic LCOE
  qsStatus = 200;
  qsBody = null;
  await quickSizeRoute({
    body: { dailyKwh: 20, autonomyDays: 1, latitude: 35.6895, longitude: 51.389, projectName: 'Live Quick Size Test' },
  }, mockQsRes);

  check(
    'F-01: Route POST /api/v1/projects/quick-size returns HTTP 200 and realistic residential LCOE (< $0.25/kWh)',
    qsStatus === 200 && qsBody.lcoeUsdPerKwh < 0.25 && qsBody.lcoeUsdPerKwh > 0.10,
    `status=${qsStatus}, LCOE=$${qsBody?.lcoeUsdPerKwh?.toFixed(4)}/kWh, cap=${qsBody?.systemCapacityKwp} kWp`
  );

  // 2b. Canonical residential quick sizing via live API endpoint (20 kWh/day, 1.5d autonomy)
  qsStatus = 200;
  qsBody = null;
  await quickSizeRoute({
    body: { dailyKwh: 20, autonomyDays: 1.5, latitude: 35.6895, longitude: 51.389, projectName: 'Live Canonical Test 1.5d' },
  }, mockQsRes);

  check(
    'F-01: Route POST /api/v1/projects/quick-size for canonical scenario (1.5d auto) yields LCOE < $0.25/kWh (NOT $0.84)',
    qsStatus === 200 && qsBody.lcoeUsdPerKwh < 0.25 && qsBody.lcoeUsdPerKwh > 0.10,
    `status=${qsStatus}, LCOE=$${qsBody?.lcoeUsdPerKwh?.toFixed(4)}/kWh, batteryCount=${qsBody?.batteryCount}`
  );

  // 3. String sizing endpoint with ambient temp
  const stringSizeRoute = (app as any)._router.stack
    .find((r: any) => r.route && r.route.path === '/api/v1/electrical/string-sizing' && r.route.methods.post)
    ?.route.stack[0].handle;

  let ssStatus = 200;
  let ssBody: any = null;
  const mockSsRes: any = {
    status(s: number) { ssStatus = s; return this; },
    json(d: any) { ssBody = d; return this; },
  };

  await stringSizeRoute({
    body: {
      panelVoc: 51.25,
      panelVmp: 42.68,
      tempMinC: -10,
      tempMaxC: 40,
      betaVocPerC: -0.0025,
      betaPmpPerC: -0.0029,
      inverterVdcMax: 1000,
      inverterMpptMin: 200,
      inverterMpptMax: 850,
    },
  }, mockSsRes);

  check(
    'F-02: Route POST /api/v1/electrical/string-sizing applies unified NOCT model (minModules: 6, effectiveCellTemp ~71.25°C)',
    ssStatus === 200 && ssBody.minModules === 6 && Math.abs(ssBody.effectiveCellTempMaxC - 71.25) < 0.2,
    `status=${ssStatus}, minModules=${ssBody?.minModules}, cellTemp=${ssBody?.effectiveCellTempMaxC}°C`
  );

  // 4. Zero-Based Audit Remediations Verification (Z-03, Z-04, Z-05)
  const solarPosRoute = (app as any)._router.stack
    .find((r: any) => r.route && r.route.path === '/api/v1/solar/position' && r.route.methods.post)
    ?.route.stack[0].handle;

  let spStatus = 200;
  let spBody: any = null;
  const mockSpRes: any = {
    status(s: number) { spStatus = s; return this; },
    json(d: any) { spBody = d; return this; },
  };

  // 4a. Missing latitudeDeg returns HTTP 400 (Z-04)
  await solarPosRoute({ body: {} }, mockSpRes);
  check(
    'Z-04: Route POST /api/v1/solar/position without latitudeDeg returns HTTP 400 (no silent Tehran fallback)',
    spStatus === 400 && spBody?.error?.includes('latitudeDeg is required'),
    `status=${spStatus}, error="${spBody?.error}"`
  );

  // 4b. Quick-size with save: false does not persist to database (Z-03)
  const initialDbProjectsCount = serverDb.projects.size;
  await quickSizeRoute({
    body: { dailyKwh: 20, autonomyDays: 1, latitude: 35.6895, longitude: 51.389, save: false },
  }, mockQsRes);
  check(
    'Z-03: Route POST /api/v1/projects/quick-size with save: false does not persist project to server DB',
    qsStatus === 200 && serverDb.projects.size === initialDbProjectsCount,
    `initialCount=${initialDbProjectsCount}, currentCount=${serverDb.projects.size}`
  );

  // 4c. JWT with alg != HS256 is rejected (Z-05)
  process.env.JWT_SECRET = 'test-audit-jwt-secret';
  const badAlgHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const badAlgPayload = Buffer.from(JSON.stringify({ sub: 'attacker', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  const badToken = `${badAlgHeader}.${badAlgPayload}.invalidsig`;
  const projectsRoute = (app as any)._router.stack
    .find((r: any) => r.route && r.route.path === '/api/v1/projects' && r.route.methods.get)
    ?.route.stack[0].handle;

  let projStatus = 200;
  let projBody: any = null;
  const mockProjRes: any = {
    status(s: number) { projStatus = s; return this; },
    json(d: any) { projBody = d; return this; },
  };

  await projectsRoute({
    headers: { authorization: `Bearer ${badToken}` },
  }, mockProjRes);
  check(
    'Z-05: Request with JWT alg: none is rejected with HTTP 401 (only HS256 permitted)',
    projStatus === 401 && projBody?.error?.includes('unsupported or missing algorithm'),
    `status=${projStatus}, error="${projBody?.error}"`
  );

  console.log('\n================================================================================');
  console.log(` AUDIT PROBE COMPLETE: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('================================================================================\n');

  if (totalTests !== passedTests) {
    process.exit(1);
  }
}

runProbe().catch((err) => {
  console.error('Probe crashed:', err);
  process.exit(1);
});
