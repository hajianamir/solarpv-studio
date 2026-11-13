import assert from 'node:assert/strict';
import { ClimateDataProvider } from '../src/engine/dataGateway/climateDataProvider';
import { SoilDataProvider } from '../src/engine/dataGateway/soilDataProvider';
import { CircuitBreaker } from '../src/engine/dataGateway/circuitBreaker';
import { fetchProvider, runProviderRequest, runWithDistributedStartGate } from '../src/engine/dataGateway/providerRequestLimiter';
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
    assert.notEqual(zeroTexture.fieldProvenance.clayFractionPercent.sourceKind, 'local_model');
    assert.notEqual(zeroTexture.fieldProvenance.phH2O.sourceKind, 'local_model');
  });
  const partialSoil = soil.parseSoilGridsResponse(35, 51, {
    properties: { layers: [{ name: 'clay', depths: [{ label: '0-5cm', values: { mean: 280 } }] }] },
  });
  check('Incomplete soil texture payload is explicitly analytical, not mislabeled live', () => {
    assert.equal(partialSoil.estimatedFromGlobalModel, true);
    assert.equal(partialSoil.fieldProvenance.clayFractionPercent.sourceKind, 'local_model');
    assert.match(partialSoil.fieldProvenance.clayFractionPercent.qualityNote ?? '', /ناقص|inconsistent|incomplete|missing/i);
  });
  const partialDepth = soil.parseSoilGridsResponse(35, 51, { properties: { layers: [
    { name: 'clay', depths: [{ label: '0-5cm', values: { mean: 200 } }] },
    { name: 'sand', depths: [{ label: '0-5cm', values: { mean: 500 } }] },
    { name: 'silt', depths: [{ label: '0-5cm', values: { mean: 300 } }] },
    { name: 'bdod', depths: [{ label: '0-5cm', values: { mean: 140 } }] },
    { name: 'phh2o', depths: [{ label: '0-5cm', values: { mean: 70 } }] },
  ] } });
  check('Incomplete depth coverage is disclosed per property, including bulk density and pH', () => {
    assert.equal(partialDepth.estimatedFromGlobalModel, true);
    for (const key of ['clayFractionPercent', 'sandFractionPercent', 'siltFractionPercent', 'bulkDensityGPerCm3', 'phH2O'] as const) {
      assert.equal(partialDepth.fieldProvenance[key].sourceKind, 'provider_derived', `${key} should not claim a complete provider value`);
      assert.match(partialDepth.fieldProvenance[key].qualityNote ?? '', /Incomplete 0-30cm coverage/);
    }
  });
  const overlappingSoil = soil.parseSoilGridsResponse(35, 51, { properties: { layers: [
    { name: 'clay', depths: [
      { label: '0-15cm', values: { mean: 200 } },
      { label: '10-30cm', values: { mean: 250 } },
    ] },
    { name: 'sand', depths: [{ label: '0-30cm', values: { mean: 600 } }] },
    { name: 'silt', depths: [{ label: '0-30cm', values: { mean: 200 } }] },
  ] } });
  check('Overlapping SoilGrids intervals are rejected rather than averaged as 0-30cm coverage', () => {
    assert.equal(overlappingSoil.estimatedFromGlobalModel, true);
    assert.equal(overlappingSoil.fieldProvenance.clayFractionPercent.sourceKind, 'local_model');
  });
  const duplicatePropertySoil = soil.parseSoilGridsResponse(35, 51, { properties: { layers: [
    { name: 'clay', depths: [{ label: '0-30cm', values: { mean: 200 } }] },
    { name: 'clay', depths: [{ label: '0-30cm', values: { mean: 220 } }] },
    { name: 'sand', depths: [{ label: '0-30cm', values: { mean: 600 } }] },
    { name: 'silt', depths: [{ label: '0-30cm', values: { mean: 200 } }] },
    { name: 'bdod', depths: [{ label: '0-30cm', values: { mean: 140 } }] },
    { name: 'phh2o', depths: [{ label: '0-30cm', values: { mean: 70 } }] },
  ] } });
  check('Duplicate SoilGrids property layers invalidate the profile and prevent a fully-live classification', () => {
    assert.equal(duplicatePropertySoil.estimatedFromGlobalModel, true);
    assert.equal(duplicatePropertySoil.metadata.isEstimatedFromGlobalModel, true);
    assert.equal(duplicatePropertySoil.fieldProvenance.clayFractionPercent.sourceKind, 'local_model');
    assert.match(duplicatePropertySoil.fieldProvenance.clayFractionPercent.qualityNote ?? '', /duplicate property layer/i);
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
  const nearZeroNasa = (climate as any).parseNasaPowerResponse(35.1, 51.2, {
    properties: { parameter: { ALLSKY_SFC_SW_DWN: { ANN: 0.001 } } },
  });
  check('Near-zero positive NASA provider values remain positive, available, and explicit', () => {
    assert.equal(nearZeroNasa.peakSunHours, 0.001);
    assert.equal(nearZeroNasa.fieldProvenance.peakSunHours.value, 0.001);
    assert.equal(nearZeroNasa.provenance.peakSunHours.status, 'available');
    assert.match(nearZeroNasa.provenance.peakSunHours.notes ?? '', /below two-decimal display precision/i);
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

  let zeroPvgisCalls = 0;
  let zeroNasaCalls = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).includes('re.jrc')) {
      zeroPvgisCalls++;
      return mkResponse({ outputs: { monthly: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, 'H(h)_m': 0, T2m: 20 })) } });
    }
    if (String(input).includes('power.larc')) {
      zeroNasaCalls++;
      return mkResponse({ properties: { parameter: { ALLSKY_SFC_SW_DWN: { ANN: 5.4 }, T2M: { ANN: 20 } } } });
    }
    return mkResponse({}, 503);
  }) as typeof fetch;
  const zeroClimate = await new ClimateDataProvider().fetchClimateResource(35.4, 51.5, { policy: 'prefer_remote' });
  check('Complete primary-provider zero is preserved as unsizable and does not fall through to positive secondary data', () => {
    assert.equal(zeroClimate.peakSunHours, 0);
    assert.equal(zeroClimate.dniKwhM2Day, 0);
    assert.equal(zeroClimate.dhiKwhM2Day, 0);
    assert.equal(zeroClimate.fieldProvenance.peakSunHours.value, 0);
    assert.equal(zeroClimate.fieldProvenance.peakSunHours.providerName, 'PVGIS');
    assert.equal(zeroClimate.metadata.dataStatus, 'unsizable');
    assert.equal(zeroPvgisCalls, 1);
    assert.equal(zeroNasaCalls, 0);
  });

  let zeroNasaCallsPrimary = 0;
  let pvgisAfterNasaZero = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).includes('power.larc')) {
      zeroNasaCallsPrimary++;
      return mkResponse({ properties: { parameter: { ALLSKY_SFC_SW_DWN: { ANN: 0 }, T2M: { ANN: 20 } } } });
    }
    if (String(input).includes('re.jrc')) pvgisAfterNasaZero++;
    return mkResponse({ outputs: { monthly: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, 'H(h)_m': 180 })) } });
  }) as typeof fetch;
  const nasaZeroClimate = await new ClimateDataProvider().fetchClimateResource(35.4, -100, { policy: 'prefer_remote' });
  check('NASA POWER primary zero is a valid unsizable value and does not trigger secondary substitution', () => {
    assert.equal(nasaZeroClimate.peakSunHours, 0);
    assert.equal(nasaZeroClimate.dniKwhM2Day, 0);
    assert.equal(nasaZeroClimate.metadata.sourceProvider, 'NASA_POWER');
    assert.equal(nasaZeroClimate.metadata.dataStatus, 'unsizable');
    assert.equal(zeroNasaCallsPrimary, 1);
    assert.equal(pvgisAfterNasaZero, 0);
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

  // Cross-instance start-gate: delayed Redis claim responses must not let old slots
  // bunch up. This is a shared-state REST mock (not a real Redis integration test).
  let redisCommands = 0;
  process.env.PROVIDER_LIMITER_REDIS_REST_URL = 'https://redis.example.test';
  process.env.PROVIDER_LIMITER_REDIS_REST_TOKEN = 'test-token';
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).includes('redis.example.test')) {
      redisCommands++;
      return mkResponse({ result: 0 });
    }
    return mkResponse({ ok: true });
  }) as typeof fetch;
  await fetchProvider('nominatim', 'https://nominatim.example.test/search');
  check('Nominatim request uses a distributed claim and post-start release', () => {
    assert.equal(redisCommands, 2);
  });

  const invalidCoordinatorPayloads: Array<{ label: string; body?: string; status?: number }> = [
    { label: 'missing result', body: '{}' },
    { label: 'null result', body: '{"result":null}' },
    { label: 'string result', body: '{"result":"0"}' },
    { label: 'invalid negative result', body: '{"result":-2}' },
    { label: 'malformed JSON', body: '{not-json' },
    { label: 'HTTP outage', body: '{"error":"offline"}', status: 503 },
  ];
  let malformedUpstreamStarts = 0;
  const malformedBlocked: string[] = [];
  for (const sample of invalidCoordinatorPayloads) {
    globalThis.fetch = (async () => new Response(sample.body ?? '{}', {
      status: sample.status ?? 200,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch;
    await assert.rejects(runWithDistributedStartGate('nominatim', 1050, undefined, async () => {
      malformedUpstreamStarts++;
      return 'must-not-start';
    }));
    malformedBlocked.push(sample.label);
  }
  check('Invalid/HTTP-failed coordinator replies fail closed before every upstream start (synthetic REST bridge)', () => {
    assert.equal(malformedUpstreamStarts, 0);
    assert.equal(malformedBlocked.length, invalidCoordinatorPayloads.length);
  });

  // A malformed release response occurs after the upstream invocation. The request
  // must not be mislabeled as pre-start failure or retried as if it never started.
  let postStartCalls = 0;
  let postStartRedisCalls = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).includes('redis.example.test')) {
      postStartRedisCalls++;
      return postStartRedisCalls === 1 ? mkResponse({ result: 0 }) : mkResponse({});
    }
    postStartCalls++;
    return mkResponse({ ok: true });
  }) as typeof fetch;
  const postStartResult = await runWithDistributedStartGate('nominatim', 1050, undefined, async () => {
    postStartCalls++;
    return 'started';
  });
  check('Malformed post-start release is reported as post-start and does not retry upstream', () => {
    assert.equal(postStartResult, 'started');
    assert.equal(postStartCalls, 1);
    assert.equal(postStartRedisCalls, 2);
  });

  const mockRedis = { lock: '', lastStartMs: 0 };
  let delayOneClaimResponse = true;
  const providerStarts: number[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).includes('redis.example.test')) {
      const body = JSON.parse(String(init?.body)) as unknown[];
      const script = String(body[1]);
      const token = String(body[5]);
      if (script.includes("local owner=redis.call('GET',KEYS[1])")) {
        if (mockRedis.lock) return mkResponse({ result: -1 });
        const delay = Math.max(0, mockRedis.lastStartMs + 1050 - Date.now());
        if (delay > 0) return mkResponse({ result: delay });
        mockRedis.lock = token;
        if (delayOneClaimResponse) {
          delayOneClaimResponse = false;
          await new Promise((resolve) => setTimeout(resolve, 900));
        }
        return mkResponse({ result: 0 });
      }
      if (mockRedis.lock === token) {
        mockRedis.lastStartMs = Date.now();
        mockRedis.lock = '';
      }
      return mkResponse({ result: 1 });
    }
    providerStarts.push(Date.now());
    return mkResponse({ ok: true });
  }) as typeof fetch;
  await Promise.all([
    runWithDistributedStartGate('nominatim', 1050, undefined, async () => { providerStarts.push(Date.now()); return 'first'; }),
    runWithDistributedStartGate('nominatim', 1050, undefined, async () => { providerStarts.push(Date.now()); return 'second'; }),
  ]);
  check('Distributed start gate rechecks after a 900ms asymmetric claim response (mocked Redis REST)', () => {
    assert.equal(providerStarts.length, 2);
    assert.ok(providerStarts[1] - providerStarts[0] >= 1040, `actual mocked start gap was ${providerStarts[1] - providerStarts[0]} ms`);
  });

  const priorNodeEnv = process.env.NODE_ENV;
  delete process.env.PROVIDER_LIMITER_REDIS_REST_URL;
  delete process.env.PROVIDER_LIMITER_REDIS_REST_TOKEN;
  process.env.NODE_ENV = 'production';
  let failsClosed = false;
  try {
    await runWithDistributedStartGate('nominatim', 1050, undefined, async () => 'should-not-start');
  } catch (error) {
    failsClosed = String(error).includes('Nominatim is disabled');
  } finally {
    if (priorNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = priorNodeEnv;
  }
  check('Production Nominatim fails closed without a shared coordinator', () => assert.equal(failsClosed, true));

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
