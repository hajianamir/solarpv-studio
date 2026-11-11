import assert from 'node:assert/strict';
import { ClimateDataProvider } from '../src/engine/dataGateway/climateDataProvider';
import { SoilDataProvider } from '../src/engine/dataGateway/soilDataProvider';
import { CircuitBreaker } from '../src/engine/dataGateway/circuitBreaker';
import { fetchProvider, runProviderRequest } from '../src/engine/dataGateway/providerRequestLimiter';
import { generateScenarios } from '../src/engine/scenarioEngine';

const originalFetch = globalThis.fetch;
const originalEnv = {
  realInternet: process.env.REAL_INTERNET,
  redisUrl: process.env.PROVIDER_LIMITER_REDIS_REST_URL,
  redisToken: process.env.PROVIDER_LIMITER_REDIS_REST_TOKEN,
};
const passed: string[] = [];
function check(name: string, fn: () => void) {
  fn();
  passed.push(name);
  console.log(`[PASS] ${name}`);
}
function mkResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}
const pvgisPayload = {
  outputs: {
    monthly: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, 'H(h)_m': 120, T2m: 20 })),
  },
};

async function main() {
  process.env.REAL_INTERNET = 'true';
  delete process.env.PROVIDER_LIMITER_REDIS_REST_URL;
  delete process.env.PROVIDER_LIMITER_REDIS_REST_TOKEN;

  // Soil completeness: preserve real zero-valued fractions and recognize partial payloads.
  const soil = new SoilDataProvider();
  const zeroTexture = soil.parseSoilGridsResponse(35, 51, {
    properties: { layers: [
      { name: 'clay', depths: [{ label: '0-30cm', values: { mean: 0 } }] },
      { name: 'sand', depths: [{ label: '0-30cm', values: { mean: 1000 } }] },
      { name: 'silt', depths: [{ label: '0-30cm', values: { mean: 0 } }] },
      { name: 'phh2o', depths: [{ label: '0-30cm', values: { mean: 0 } }] },
    ] },
  });
  check('SoilGrids valid zeros are retained as valid provider values', () => {
    assert.equal(zeroTexture.clayFractionPercent, 0);
    assert.equal(zeroTexture.sandFractionPercent, 100);
    assert.equal(zeroTexture.siltFractionPercent, 0);
    assert.equal(zeroTexture.phH2O, 0);
    assert.equal(zeroTexture.fieldProvenance.clayFractionPercent.sourceKind, 'provider_value');
    assert.equal(zeroTexture.fieldProvenance.phH2O.sourceKind, 'provider_value');
  });
  const partialSoil = soil.parseSoilGridsResponse(35, 51, {
    properties: { layers: [{ name: 'clay', depths: [{ label: '0-5cm', values: { mean: 280 } }] }] },
  });
  check('Incomplete soil texture payload is explicitly analytical, not mislabeled live', () => {
    assert.equal(partialSoil.estimatedFromGlobalModel, true);
    assert.equal(partialSoil.fieldProvenance.clayFractionPercent.sourceKind, 'local_model');
    assert.match(partialSoil.fieldProvenance.clayFractionPercent.qualityNote ?? '', /ناقص|inconsistent|incomplete|missing/i);
  });

  let soilCalls = 0;
  globalThis.fetch = (async () => { soilCalls++; return mkResponse({ error: 'ISRIC unavailable' }, 503); }) as typeof fetch;
  const failingSoil = new SoilDataProvider();
  const soilFallback = await failingSoil.fetchSoilProperties(36, 52);
  const soilCached = await failingSoil.fetchSoilProperties(36, 52);
  check('Soil provider errors use explicitly estimated fallback and short fallback-cache hit', () => {
    assert.equal(soilFallback.estimatedFromGlobalModel, true);
    assert.equal(soilFallback.metadata.isEstimatedFromGlobalModel, true);
    assert.equal(soilCached.metadata.isCached, true);
    assert.equal(soilCalls, 1);
  });

  // Climate cache policy: remote cache may serve prefer_remote, but never analytical_only.
  let pvgisCalls = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).includes('re.jrc')) {
      pvgisCalls++;
      return mkResponse(pvgisPayload);
    }
    return mkResponse({}, 503);
  }) as typeof fetch;
  const climate = new ClimateDataProvider();
  const liveFirst = await climate.fetchClimateResource(35.1, 51.2, { policy: 'prefer_remote' });
  const remoteCallCount = pvgisCalls;
  const liveCached = await climate.fetchClimateResource(35.1, 51.2, { policy: 'prefer_remote' });
  check('Remote climate cache hit reports hit and reuses provider data', () => {
    assert.equal(liveFirst.metadata.sourceProvider, 'PVGIS');
    assert.equal(liveCached.metadata.cacheStatus, 'hit');
    assert.equal(pvgisCalls, remoteCallCount);
  });
  const analytical = await climate.fetchClimateResource(35.1, 51.2, { policy: 'analytical_only' });
  check('Analytical-only policy refuses an incompatible remote cache entry', () => {
    assert.equal(analytical.metadata.sourceProvider, 'REGIONAL_ANALYTICAL_MODEL');
    assert.equal(analytical.metadata.fetchPolicy, 'analytical_only');
    assert.equal(analytical.metadata.cacheStatus, 'miss');
  });

  // Explicit provider failure: fallback is marked estimated and short-lived.
  globalThis.fetch = (async () => mkResponse({ error: 'provider unavailable' }, 503)) as typeof fetch;
  const failingClimate = new ClimateDataProvider();
  const failedResult = await failingClimate.fetchClimateResource(35.2, 51.3, { policy: 'prefer_remote' });
  check('Provider HTTP failures result in explicit analytical fallback metadata', () => {
    assert.equal(failedResult.metadata.sourceProvider, 'REGIONAL_ANALYTICAL_MODEL');
    assert.equal(failedResult.metadata.isEstimatedFromGlobalModel, true);
    assert.equal(failedResult.metadata.cacheStatus, 'miss');
  });

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).includes('re.jrc')) {
      return mkResponse({ outputs: { monthly: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, 'H(h)_m': 0 })) } });
    }
    return mkResponse({}, 503);
  }) as typeof fetch;
  const zeroClimate = await new ClimateDataProvider().fetchClimateResource(35.4, 51.5, { policy: 'prefer_remote' });
  check('Valid zero annual irradiance is preserved as zero, never replaced by a positive regional estimate', () => {
    assert.equal(zeroClimate.peakSunHours, 0);
    assert.equal(zeroClimate.fieldProvenance.peakSunHours.value, 0);
    assert.equal(zeroClimate.fieldProvenance.peakSunHours.providerName, 'PVGIS');
  });
  const lowPsh = generateScenarios(100, 10, 1, 90000, 18, 0.5);
  const onePsh = generateScenarios(100, 10, 1, 90000, 18, 1.0);
  check('Existing positive PSH<1 scenario floor is preserved and explicitly observable', () => {
    assert.deepEqual(
      lowPsh.map(({ pvCapacityKwp, lcoeUsdPerKwh }) => ({ pvCapacityKwp, lcoeUsdPerKwh })),
      onePsh.map(({ pvCapacityKwp, lcoeUsdPerKwh }) => ({ pvCapacityKwp, lcoeUsdPerKwh })),
    );
  });

  // Caller abort must reject (not return fallback/cache) and must not count as breaker failure.
  let abortObserved = false;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    const signal = init?.signal;
    if (!signal) return reject(new Error('test expected AbortSignal'));
    signal.addEventListener('abort', () => {
      abortObserved = true;
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    }, { once: true });
  })) as typeof fetch;
  const abortClimate = new ClimateDataProvider();
  const abortController = new AbortController();
  const abortRequest = abortClimate.fetchClimateResource(35.3, 51.4, { signal: abortController.signal });
  setTimeout(() => abortController.abort(), 150);
  await assert.rejects(abortRequest, (error: Error) => error.name === 'AbortError');
  check('Caller abort propagates without analytical fallback or circuit-breaker failure', () => {
    assert.equal(abortObserved, true);
    assert.equal(abortClimate.getPvgisCircuitBreaker().getStats().totalFailures, 0);
  });

  const breaker = new CircuitBreaker();
  await assert.rejects(
    breaker.execute(async () => { const e = new Error('cancel'); e.name = 'AbortError'; throw e; }, () => 'fallback'),
    (error: Error) => error.name === 'AbortError',
  );
  check('Circuit breaker never counts an AbortError or invokes fallback', () => {
    assert.equal(breaker.getStats().totalFailures, 0);
    assert.equal(breaker.getStats().fallbackServed, 0);
  });

  let soilAbortObserved = false;
  globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => {
      soilAbortObserved = true;
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    }, { once: true });
  })) as typeof fetch;
  const soilAbortController = new AbortController();
  const soilAbortProvider = new SoilDataProvider();
  const soilAbortRequest = soilAbortProvider.fetchSoilProperties(36.1, 52.1, { signal: soilAbortController.signal });
  setTimeout(() => soilAbortController.abort(), 150);
  await assert.rejects(soilAbortRequest, (error: Error) => error.name === 'AbortError');
  check('Soil provider propagates caller abort instead of returning a successful fallback', () => {
    assert.equal(soilAbortObserved, true);
  });

  // A symbol-backed global queue shares one cap across independent adapter instances.
  globalThis.fetch = originalFetch;
  let active = 0;
  let maxActive = 0;
  await Promise.all(Array.from({ length: 12 }, (_, i) => runProviderRequest(`test-${i % 3}`, async () => {
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 12));
    active--;
    return i;
  })));
  check('Provider limiter enforces one shared concurrency cap across callers', () => {
    assert.ok(maxActive <= 4, `max active requests was ${maxActive}`);
    assert.ok(maxActive > 1, 'limiter serialized all independent providers unexpectedly');
  });

  // Cross-instance coordination contract: Redis REST EVAL obtains shared reservation.
  let redisReservations = 0;
  process.env.PROVIDER_LIMITER_REDIS_REST_URL = 'https://redis.example.test';
  process.env.PROVIDER_LIMITER_REDIS_REST_TOKEN = 'test-token';
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).includes('redis.example.test')) {
      redisReservations++;
      return mkResponse({ result: 0 });
    }
    return mkResponse({ ok: true });
  }) as typeof fetch;
  await fetchProvider('nominatim', 'https://nominatim.example.test/search');
  check('Nominatim request reserves its shared Redis slot in multi-instance mode', () => {
    assert.equal(redisReservations, 1);
  });

  // Cold offline path is separately guaranteed by the browser test / same-origin contract:
  // direct browser provider fallback is intentionally absent from fetchClimateData.
  console.log(`Data gateway regression checks: ${passed.length}/${passed.length} PASS`);
}

main().catch((error) => {
  console.error('[FAIL] Data gateway regression tests:', error);
  process.exitCode = 1;
}).finally(() => {
  globalThis.fetch = originalFetch;
  if (originalEnv.realInternet === undefined) delete process.env.REAL_INTERNET;
  else process.env.REAL_INTERNET = originalEnv.realInternet;
  if (originalEnv.redisUrl === undefined) delete process.env.PROVIDER_LIMITER_REDIS_REST_URL;
  else process.env.PROVIDER_LIMITER_REDIS_REST_URL = originalEnv.redisUrl;
  if (originalEnv.redisToken === undefined) delete process.env.PROVIDER_LIMITER_REDIS_REST_TOKEN;
  else process.env.PROVIDER_LIMITER_REDIS_REST_TOKEN = originalEnv.redisToken;
});
