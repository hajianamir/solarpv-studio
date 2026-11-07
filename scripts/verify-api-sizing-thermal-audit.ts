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
  // Finding F-04: 24h Simulation Rounding Precision Unification (0.01 kWh)
  // --------------------------------------------------------------------------
  console.log('\n--- [F-04] Simulation Summary & Hourly Rounding Unification ---');

  const simResult = simulate24hEnergyBalance(
    10.0,
    5.2,
    24.55,
    18.25,
    25.0,
    30.0,
    50.0,
    9.58
  );

  const sumHourlyLoad = Number(simResult.hourlySteps.reduce((acc, s) => acc + s.loadDemandKwh, 0).toFixed(2));
  const totalConsumption = simResult.totalConsumption24hKwh;

  check(
    'F-04: totalConsumption24hKwh matches exact centesimal sum of hourly loads (0.01 kWh precision)',
    Math.abs(sumHourlyLoad - totalConsumption) <= 0.01,
    `hourlySum = ${sumHourlyLoad.toFixed(2)} kWh, totalConsumption = ${totalConsumption.toFixed(2)} kWh`
  );

  const sumHourlyGen = Number(simResult.hourlySteps.reduce((acc, s) => acc + s.solarGenKwh, 0).toFixed(2));
  const totalGen = simResult.totalGeneration24hKwh;
  check(
    'F-04: totalGeneration24hKwh matches exact centesimal sum of hourly generation (0.01 kWh precision)',
    Math.abs(sumHourlyGen - totalGen) <= 0.01,
    `hourlyGenSum = ${sumHourlyGen.toFixed(2)} kWh, totalGeneration = ${totalGen.toFixed(2)} kWh`
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
