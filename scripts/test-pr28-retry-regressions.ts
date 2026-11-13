import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {
  CATALOG_MODULES, CATALOG_INVERTERS, CATALOG_BATTERIES,
  getFullModulesCatalog, getFullInvertersCatalog, getFullBatteriesCatalog,
  saveCustomModule as saveLegacyModule, saveCustomInverter as saveLegacyInverter,
  saveCustomBattery as saveLegacyBattery,
} from '../src/engine/equipmentCatalogData';
import { CatalogRepository } from '../src/engine/catalogRepository';
import { getDefaultClimateCity } from '../src/engine/climaticData';
import { createDefaultProjectV3, migrateProjectToV3 } from '../src/engine/core/projectMigration';
import {
  computeStructuralInputHash,
  createStructuralSnapshot,
  evaluateEffectiveStructuralSnapshot,
  exportStructuralSheetRows,
  FIXTURE_S1,
  isWeightOnlyOverturningApplicable,
} from '../src/engine/core/structuralContract';
import { calculateStructuralAndFoundations } from '../src/engine/structuralEngine';
import { ClimateDataProvider } from '../src/engine/dataGateway/climateDataProvider';
import { parseGeocodeResults } from '../src/engine/dataGateway/geocodeValidation';
import { SoilDataProvider } from '../src/engine/dataGateway/soilDataProvider';
import { createParameterProvenance } from '../src/engine/dataGateway/types';
import { buildProjectProvenanceSnapshot } from '../src/engine/provenance/projectProvenance';
import { buildProvenanceRows } from '../src/engine/provenance/provenanceBuilder';
import { summarizeGatewaySources } from '../src/engine/provenance/gatewayStatus';
import { simulate24hEnergyBalance } from '../src/engine/simulation24hEngine';
import { analyzeLoadProfile, normalizeLoadItemToWindow } from '../src/engine/loadProfiles';

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
let count = 0;
function passed(name: string): void { count++; console.log(`[PASS] ${name}`); }

async function main(): Promise<void> {
  process.env.REAL_INTERNET = 'false';
  delete process.env.VITE_REAL_INTERNET;
  delete process.env.PROVIDER_LIMITER_REDIS_REST_URL;
  delete process.env.PROVIDER_LIMITER_REDIS_REST_TOKEN;

  const project = { ...createDefaultProjectV3(), autonomyDays: 0, outageHours: 0 };
  const restored = migrateProjectToV3(project);
  assert.equal(restored.success, true);
  assert.equal(restored.project.autonomyDays, 0);
  assert.equal(restored.project.outageHours, 0);
  const legacy = migrateProjectToV3({ ...project, autonomyDays: undefined, outageHours: undefined });
  assert.equal(legacy.project.autonomyDays, 1.5);
  assert.equal(legacy.project.outageHours, 6);
  const malformedNumeric = migrateProjectToV3({ ...project, version: '2.0.0', autonomyDays: '0', outageHours: '0' });
  assert.equal(malformedNumeric.success, false, 'present non-numeric autonomy/outage values must not be silently coerced');
  assert.equal(malformedNumeric.migrationStatus, 'BLOCKED_INCONSISTENT');
  passed('Zero autonomy/outage survive migration; missing legacy fields default; malformed present values fail closed');

  const preciseLoad = { id: 'small-hours', name: 'Fractional load', category: 'other' as const, ratedWatts: 1000, surgeMultiplier: 1, quantity: 1, dayHours: 0.0049, nightHours: 0.012345, isDc: false };
  const preciseProject = {
    ...project,
    loads: [preciseLoad],
    selectedModule: { ...project.selectedModule, tempCoeffIscPct: 0.0487, tempCoeffVmpPct: -0.3521, bifacialityFactor: undefined },
  };
  const preciseRestored = migrateProjectToV3(JSON.parse(JSON.stringify(preciseProject)));
  assert.equal(preciseRestored.success, true);
  assert.deepEqual(preciseRestored.project.loads[0], preciseLoad);
  assert.equal(preciseRestored.project.selectedModule.tempCoeffIscPct, 0.0487);
  assert.equal(preciseRestored.project.selectedModule.tempCoeffVmpPct, -0.3521);
  assert.equal(preciseRestored.project.selectedModule.bifacialityFactor, undefined);
  const normalized = normalizeLoadItemToWindow(preciseLoad, { dayCapHours: 12, nightCapHours: 12 }).normalized;
  assert.deepEqual(normalized, preciseLoad);
  const analysis = analyzeLoadProfile([preciseLoad], { dayCapHours: 12, nightCapHours: 12 });
  assert.ok(Math.abs(analysis.totalDailyEnergyKwh - (0.0049 + 0.012345)) < 1e-15);
  assert.equal(CatalogRepository.getInstance().getModuleById('mod-longi-660')?.noctC, 44);
  for (const badProject of [
    { ...preciseProject, customBaysCount: 0 },
    { ...preciseProject, trackerConfig: { gcr: -1, axisTiltDeg: 0, maxRotationDeg: 60, enableBacktracking: true } },
    { ...preciseProject, loads: [{ ...preciseLoad, dayHours: -1 }] },
  ]) {
    const result = migrateProjectToV3(badProject);
    assert.equal(result.success, false);
    assert.equal(result.migrationStatus, 'BLOCKED_INCONSISTENT');
    assert.ok(result.blockerReasons.length > 0);
  }
  passed('Canonical high-precision load hours, optional module coefficients and absent bifacial factor survive; invalid bays/tracker/load are blocked');

  const hashInput = {
    cityId: 'same-id', latitude: 12, longitude: 101,
    totalModulesCount: 140, arrayTiltDeg: 28, foundationType: 'rammed_steel_pile',
    basicWindSpeedKmh: 120, groundSnowLoadKgM2: 50, groundClearanceM: 0.9,
    soilType: 'dense_sand_gravel', frostDepthCm: 30,
  };
  const hashA = computeStructuralInputHash(hashInput);
  const hashB = computeStructuralInputHash({ ...hashInput, latitude: 13 });
  const legacyHash = computeStructuralInputHash({ ...hashInput, latitude: undefined, longitude: undefined });
  assert.notEqual(hashA, hashB);
  assert.notEqual(hashA, legacyHash);
  const structural = createStructuralSnapshot(calculateStructuralAndFoundations(FIXTURE_S1), 'rammed_steel_pile', hashA);
  assert.equal(evaluateEffectiveStructuralSnapshot(structural, hashB)?.isStale, true);
  assert.equal(evaluateEffectiveStructuralSnapshot(structural, hashA)?.isStale, false);
  passed('Same-ID different-coordinate structural snapshots become stale, including legacy no-coordinate hashes');

  const pileRows = exportStructuralSheetRows(structural, true);
  const overturning = pileRows.find((row) => row[0].startsWith('Weight-only Overturning'));
  assert.ok(overturning);
  assert.equal(overturning[1], structural.fosOverturning);
  assert.match(overturning[3], /DIAGNOSTIC ONLY.*not included/);
  assert.equal(isWeightOnlyOverturningApplicable('rammed_steel_pile'), false);
  assert.equal(isWeightOnlyOverturningApplicable('rooftop_ballasted_block'), true);
  assert.equal(isWeightOnlyOverturningApplicable('concrete_pier'), true);
  passed('Pile weight-only FoS is exported as a diagnostic, while ballasted/pier applicability follows the actual criterion');

  const city = getDefaultClimateCity();
  city.soilBearingCapacityKpa = 350;
  city.fieldProvenance = {
    ...city.fieldProvenance,
    soilBearingCapacityKpa: createParameterProvenance('provider_derived', 'ISRIC_SOILGRIDS', { unit: 'kPa', value: 350 }),
  };
  const overrides = { soilBearingCapacityKpa: 350 };
  const projected = buildProjectProvenanceSnapshot(city, overrides).find((row) => row.key === 'soilBearingCapacityKpa');
  const rows = await buildProvenanceRows(city, overrides, true);
  const fieldRow = rows.find((row) => row.parameter === 'Soil Bearing Capacity');
  for (const row of [projected, fieldRow]) {
    assert.ok(row);
    assert.equal(row.provider, 'USER_OVERRIDE');
    assert.equal(row.sourceKind, 'user_input');
    assert.equal(row.confidence, 'analytical');
  }
  passed('Equal-value soil override remains USER_OVERRIDE/analytical in both provenance projections');

  const provider = new ClimateDataProvider();
  const pvgis = (value: number) => ({ outputs: { monthly: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, 'H(h)_m': value, T2m: 20 })) } });
  const nearZero = provider.parsePvgisResponse(35, 51, pvgis(0.01));
  const expected = 0.12 / 365.25;
  assert.ok(Math.abs(nearZero.peakSunHours - expected) < 1e-16 && nearZero.peakSunHours > 0);
  assert.equal(nearZero.metadata.dataStatus, 'measured');
  assert.equal(nearZero.fieldProvenance.peakSunHours.value, nearZero.peakSunHours);
  assert.match(nearZero.fieldProvenance.peakSunHours.qualityNote ?? '', /Positive.*not zero/);
  const zero = provider.parsePvgisResponse(35, 51, pvgis(0));
  assert.equal(zero.peakSunHours, 0);
  assert.equal(zero.metadata.dataStatus, 'unsizable');
  passed('Synthetic PVGIS near-zero stays positive in value/provenance; a genuine zero remains unsizable');

  const layer = (name: string, mean: number) => ({ name, depths: [{ label: '0-30cm', values: { mean } }] });
  const texture = [layer('clay', 200), layer('sand', 500), layer('silt', 300)];
  const duplicate = { properties: { layers: [...texture, layer('bdod', 120), layer('bdod', 180), layer('phh2o', 50), layer('phh2o', 80)] } };
  const missing = { properties: { layers: texture } };
  const soilProvider = new SoilDataProvider();
  const rejected = soilProvider.parseSoilGridsResponse(35, 51, duplicate);
  const missingControl = soilProvider.parseSoilGridsResponse(35, 51, missing);
  assert.equal(rejected.bulkDensityGPerCm3, 1.45);
  assert.equal(rejected.phH2O, 7);
  assert.equal(rejected.soilDensityKnM3, missingControl.soilDensityKnM3);
  assert.equal(rejected.fieldProvenance.bulkDensityGPerCm3.sourceKind, 'local_model');
  assert.equal(rejected.fieldProvenance.phH2O.sourceKind, 'local_model');
  assert.equal(rejected.estimatedFromGlobalModel, true);
  process.env.REAL_INTERNET = 'true';
  globalThis.fetch = (async () => new Response(JSON.stringify(duplicate), { status: 200 })) as typeof fetch;
  const cachedSoilProvider = new SoilDataProvider();
  await cachedSoilProvider.fetchSoilProperties(35, 51);
  assert.equal((cachedSoilProvider as any).cache.get('soil_35_51').ttlMs, 30000);
  globalThis.fetch = originalFetch;
  passed('Duplicate density/pH samples are discarded consistently with missing-property controls and a short cache TTL');

  const fullSoil = soilProvider.parseSoilGridsResponse(35, 51, { properties: { layers: [...texture, layer('bdod', 145), layer('phh2o', 70)] } });
  const sourceCity = {
    ...city,
    peakSunHours: 5.2,
    fieldProvenance: {
      ...rejected.fieldProvenance,
      peakSunHours: createParameterProvenance('provider_value', 'NASA_POWER', { unit: 'kWh/m²/day', value: 5.2 }),
    },
  };
  assert.deepEqual(summarizeGatewaySources(sourceCity), { solar: 'PROVIDER', soil: 'PARTIAL' });
  const fullCity = { ...sourceCity, fieldProvenance: { ...sourceCity.fieldProvenance, ...fullSoil.fieldProvenance } };
  assert.equal(summarizeGatewaySources(fullCity).soil, 'PROVIDER COMPLETE');
  assert.equal(summarizeGatewaySources(fullCity, overrides).soil, 'PARTIAL');
  passed('Gateway source summary distinguishes complete soil properties, partial soil and overrides');

  const unserved = simulate24hEnergyBalance(0, 5, 0.02, 0.02, 0, 0, 50, 12);
  assert.ok(Math.abs(unserved.totalDeficit24hKwh - 0.04) < 1e-12);
  assert.equal(unserved.lossOfPowerSupplyProbabilityPct, 100);
  assert.equal(unserved.isSelfSufficient, false);
  const batteryDrain = simulate24hEnergyBalance(0, 5, 0.02, 0.02, 90, 100, 50, 12);
  assert.equal(batteryDrain.energyNotServedKwh, 0);
  assert.equal(batteryDrain.reliesOnInitialCharge, true);
  assert.equal(batteryDrain.isSelfSufficient, false);
  passed('A wholly unserved sub-0.1 kWh load and small battery depletion cannot claim self-sufficiency');

  // Browser writes must be made inside a lock. Exercise both a pre-write failure
  // and a deliberately nonconforming write-then-throw plus failed rollback.
  const repo = CatalogRepository.getInstance();
  const priorWindow = (globalThis as any).window;
  let stored: string | null = JSON.stringify({ version: 4, custom: { modules: [], inverters: [], batteries: [] } });
  let writeMode: 'ok' | 'before' | 'after' | 'rollback-fail' = 'ok';
  const legacyStorage = new Map<string, string>();
  const storage = {
    getItem: (key: string) => key === 'solarpv_custom_catalog_v4' ? stored : legacyStorage.get(key) ?? null,
    setItem: (_key: string, value: string) => {
      if (writeMode === 'before' || writeMode === 'rollback-fail') throw new Error('injected storage failure');
      stored = value;
      if (writeMode === 'after') { writeMode = 'rollback-fail'; throw new Error('injected after-write failure'); }
    },
    removeItem: () => { if (writeMode === 'rollback-fail') throw new Error('injected rollback failure'); stored = null; },
  };
  (globalThis as any).window = { localStorage: storage, navigator: { locks: { request: async (_: string, operation: () => unknown) => operation() } } };
  try {
    const mod = { ...CATALOG_MODULES[0], id: 'custom-mod-lock-test' };
    const prior = stored;
    assert.equal(repo.saveCustomModule(mod).success, false);
    assert.equal(stored, prior);
    assert.equal(repo.deleteCustomModule(mod.id), false);
    assert.equal(repo.clearCustomEquipment(), false);
    writeMode = 'before';
    const prewrite = await repo.withCrossTabWriteLock(() => repo.restoreCustomEquipmentSnapshots({ modules: [mod] }));
    assert.equal(prewrite.success, false);
    assert.ok(prewrite.errors.some((error) => error.includes('verified unchanged')));
    assert.ok(!prewrite.errors.some((error) => error.includes('rollback was incomplete')));
    assert.equal(stored, prior);
    writeMode = 'after';
    const failedRollback = await repo.withCrossTabWriteLock(() => repo.restoreCustomEquipmentSnapshots({ modules: [mod] }));
    assert.equal(failedRollback.success, false);
    assert.ok(failedRollback.errors.some((error) => error.includes('rollback was incomplete')));
    assert.ok(!failedRollback.errors.some((error) => error.includes('verified unchanged')));
    assert.notEqual(stored, prior);

    // Exercise the older exported helpers when legacy keys exist but v4 does
    // not. All three writes must use the v4 lock and preserve legacy records.
    writeMode = 'ok';
    stored = null;
    const previousModule = { ...mod, id: 'custom-mod-existing-legacy', modelName: 'Existing legacy module' };
    legacyStorage.set('solarpv_custom_modules', JSON.stringify([previousModule]));
    assert.ok(getFullModulesCatalog().some((item) => item.id === previousModule.id));
    const legacyModule = { ...mod, id: 'custom-mod-wrapper', modelName: 'Wrapper module' };
    const legacyInverter = { ...CATALOG_INVERTERS[0], id: 'custom-inv-wrapper', modelName: 'Wrapper inverter' };
    const legacyBattery = { ...CATALOG_BATTERIES[0], id: 'custom-bat-wrapper', modelName: 'Wrapper battery' };
    assert.equal((await saveLegacyModule(legacyModule)).success, true);
    assert.equal((await saveLegacyInverter(legacyInverter)).success, true);
    assert.equal((await saveLegacyBattery(legacyBattery)).success, true);
    const migrated = JSON.parse(stored!);
    assert.ok(migrated.custom.modules.some((item: { id: string }) => item.id === previousModule.id));
    assert.ok(getFullModulesCatalog().some((item) => item.id === legacyModule.id));
    assert.ok(getFullInvertersCatalog().some((item) => item.id === legacyInverter.id));
    assert.ok(getFullBatteriesCatalog().some((item) => item.id === legacyBattery.id));
    const durableBeforeNoLock = stored;
    (globalThis as any).window.navigator.locks = undefined;
    assert.equal((await saveLegacyModule({ ...mod, id: 'custom-mod-no-lock' })).success, false);
    assert.equal(stored, durableBeforeNoLock);
  } finally {
    if (priorWindow === undefined) delete (globalThis as any).window;
    else (globalThis as any).window = priorWindow;
  }
  passed('Unlocked repository writes fail closed; pre-write and failed-rollback storage outcomes are reported distinctly');
  passed('Legacy helper writes migrate existing records into the locked v4 envelope and report missing locks');

  for (const bad of [null, '', '  ', false, [], {}, '0x0', 'Infinity', 'NaN', 91]) {
    assert.equal(parseGeocodeResults([{ lat: bad, lon: '0' }]), null, `invalid latitude ${String(bad)} was coerced`);
  }
  for (const bad of [null, '', '  ', false, [], {}, '181']) {
    assert.equal(parseGeocodeResults([{ lat: 0, lon: bad }]), null, `invalid longitude ${String(bad)} was coerced`);
  }
  assert.deepEqual(parseGeocodeResults([{ lat: '0', lon: 0, display_name: 'Origin', type: 'place' }]), [
    { lat: 0, lon: 0, display_name: 'Origin', type: 'place' },
  ]);
  assert.deepEqual(parseGeocodeResults([]), []);
  passed('Geocode result parser accepts genuine zero and empty success, but rejects absent, empty and invalid coordinates');

  // Exercise the actual Express route, not just the provider method. Only the
  // Nominatim upstream is synthetic; no real provider or coordinator is used.
  process.env.NODE_ENV = 'production';
  process.env.REAL_INTERNET = 'true';
  // Do not read or overwrite a developer's existing server database.
  process.env.SOLARPV_DB_FILE = path.join(os.tmpdir(), `solarpv-geocode-test-${process.pid}-${Date.now()}.json`);
  const { app } = await import('../server');
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}/api/v1/gateway/geocode?q=pr28-retry-fixture`;
  let upstreamMode: 'empty' | 'unavailable' | 'timeout' | 'null' | 'blank' | 'valid' = 'empty';
  let upstreamCalls = 0;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).startsWith('https://nominatim.openstreetmap.org/')) {
      upstreamCalls++;
      if (upstreamMode === 'timeout') return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
      });
      const body = upstreamMode === 'empty' ? []
        : upstreamMode === 'null' ? [{ lat: null, lon: '0', display_name: 'invalid null' }]
          : upstreamMode === 'blank' ? [{ lat: '0', lon: '', display_name: 'invalid blank' }]
            : upstreamMode === 'valid' ? [{ lat: '0', lon: '0', display_name: 'valid origin', type: 'place' }]
              : {};
      return Promise.resolve(new Response(JSON.stringify(body), { status: upstreamMode === 'unavailable' ? 503 : 200 }));
    }
    return originalFetch(input, init);
  }) as typeof fetch;
  try {
    let response = await originalFetch(url);
    assert.equal(response.status, 503);
    assert.equal((await response.json() as { code: string }).code, 'COORDINATOR_UNAVAILABLE');
    assert.equal(upstreamCalls, 0);
    assert.match(response.headers.get('cache-control') ?? '', /no-store/);
    process.env.NODE_ENV = 'development';
    response = await originalFetch(url);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);
    upstreamMode = 'unavailable';
    response = await originalFetch(url);
    assert.equal(response.status, 502);
    assert.equal((await response.json() as { code: string }).code, 'UPSTREAM_UNAVAILABLE');
    upstreamMode = 'timeout';
    response = await originalFetch(url);
    assert.equal(response.status, 504);
    assert.equal((await response.json() as { code: string }).code, 'TIMEOUT');
    for (const mode of ['null', 'blank'] as const) {
      upstreamMode = mode;
      response = await originalFetch(url);
      assert.equal(response.status, 502);
      assert.equal((await response.json() as { code: string }).code, 'MALFORMED_RESPONSE');
      assert.match(response.headers.get('cache-control') ?? '', /no-store/);
    }
    upstreamMode = 'valid';
    const callsBeforeValid = upstreamCalls;
    response = await originalFetch(url);
    assert.equal(response.status, 200);
    assert.equal((await response.json() as Array<{ lat: number; lon: number }>)[0].lat, 0);
    assert.equal(upstreamCalls, callsBeforeValid + 1, 'a previous failure was incorrectly cached');
    response = await originalFetch(url);
    assert.equal(response.status, 200);
    assert.equal(upstreamCalls, callsBeforeValid + 1, 'successful nonempty result was not cached');
    process.env.REAL_INTERNET = 'false';
    response = await originalFetch(url);
    assert.equal(response.status, 503);
    assert.equal((await response.json() as { code: string }).code, 'DISABLED');
    passed('Express geocoding differentiates coordinator failure, empty success, upstream error, timeout, malformed null/blank coordinates and disabled service; failure is not cached');
  } finally {
    globalThis.fetch = originalFetch;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  console.log(`PR #28 retry focused regressions: ${count}/${count} PASS (synthetic sources; no live providers).`);
}

main().catch((error) => {
  console.error('[FAIL] PR #28 retry focused regressions:', error);
  process.exitCode = 1;
}).finally(() => {
  globalThis.fetch = originalFetch;
  for (const key of ['REAL_INTERNET', 'VITE_REAL_INTERNET', 'NODE_ENV', 'SOLARPV_DB_FILE', 'PROVIDER_LIMITER_REDIS_REST_URL', 'PROVIDER_LIMITER_REDIS_REST_TOKEN']) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});
