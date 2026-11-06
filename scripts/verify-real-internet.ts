/**
 * Verification Probe for Live Internet Climate Data Fetching (REAL_INTERNET / VITE_REAL_INTERNET)
 *
 * Verifies:
 * 1. `isRealInternetEnabled()` works cleanly without errors across runtime environments.
 * 2. In offline/default mode (`REAL_INTERNET=false` / unset):
 *    - Analytical physical model (`REGIONAL_ANALYTICAL_MODEL`) is safely utilized.
 *    - Zero network errors or unhandled rejections.
 *    - Explicit data provenance with audit trace_id.
 * 3. In online mode (`REAL_INTERNET=true`):
 *    - Real network calls are enforced (NASA POWER / PVGIS).
 *    - Analytical fallback is strictly disabled (fails explicitly if providers unreachable).
 *    - When successful, metadata sourceProvider is NASA_POWER or PVGIS.
 */

import { ClimateDataProvider } from '../src/engine/dataGateway/climateDataProvider';
import { isRealInternetEnabled } from '../src/engine/env/runtimeEnv';

let failures = 0;
function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    failures++;
  }
}

async function main() {
  console.log('================================================================================');
  console.log(' SolarPV Studio — REAL_INTERNET Flag & Climate Data Gateway Verification');
  console.log('================================================================================\n');

  // Test 1: Flag detection logic across process.env
  console.log('--- 1. Flag Detection Logic ---');
  const initialFlag = isRealInternetEnabled();
  console.log(`  Initial isRealInternetEnabled(): ${initialFlag}`);
  assert(initialFlag === false, 'Default environment has REAL_INTERNET disabled (air-gapped/sandbox safe)');

  process.env.REAL_INTERNET = 'true';
  const flagWhenTrue = isRealInternetEnabled();
  assert(flagWhenTrue === true, 'isRealInternetEnabled() returns true when process.env.REAL_INTERNET="true"');

  process.env.REAL_INTERNET = 'false';
  const flagWhenFalse = isRealInternetEnabled();
  assert(flagWhenFalse === false, 'isRealInternetEnabled() returns false when process.env.REAL_INTERNET="false"');

  delete process.env.REAL_INTERNET;
  const flagWhenUnset = isRealInternetEnabled();
  assert(flagWhenUnset === false, 'isRealInternetEnabled() returns false when process.env.REAL_INTERNET is unset');

  // Test 2: Offline / Analytical Mode (REAL_INTERNET unset / false)
  console.log('\n--- 2. Offline Mode: Calibrated Regional Analytical Model ---');
  const offlineProvider = new ClimateDataProvider();
  try {
    const offlineResult = await offlineProvider.fetchClimateResource(35.6892, 51.3890); // Tehran
    console.log(`  trace_id:       ${offlineResult.metadata.traceId}`);
    console.log(`  sourceProvider: ${offlineResult.metadata.sourceProvider}`);
    console.log(`  estimated:      ${offlineResult.metadata.isEstimatedFromGlobalModel}`);
    console.log(`  PSH:            ${offlineResult.peakSunHours} kWh/m²/day`);
    console.log(`  T_max:          ${offlineResult.tempMaxC} °C`);

    assert(offlineResult.metadata.traceId.startsWith('TRC-GW'), 'Trace ID conforms to TRC-GW standard');
    assert(offlineResult.metadata.sourceProvider === 'REGIONAL_ANALYTICAL_MODEL', 'Offline mode returns REGIONAL_ANALYTICAL_MODEL');
    assert(offlineResult.metadata.isEstimatedFromGlobalModel === true, 'isEstimatedFromGlobalModel is explicitly true in offline fallback');
    assert(offlineResult.peakSunHours > 3.0 && offlineResult.peakSunHours < 8.0, 'PSH is physically realistic');
  } catch (err) {
    console.error(`  [FAIL] Offline fetch threw unexpected error: ${(err as Error).message}`);
    failures++;
  }

  // Test 3: Online Mode Gate (REAL_INTERNET=true)
  console.log('\n--- 3. Online Mode: Strict Real Network Gating (No Silent Fallback) ---');
  process.env.REAL_INTERNET = 'true';
  const onlineProvider = new ClimateDataProvider();

  try {
    const onlineResult = await onlineProvider.fetchClimateResource(35.6892, 51.3890);
    // If we reach here, real network was accessible
    console.log(`  [ONLINE SUCCESS] Real HTTP API returned data`);
    console.log(`  sourceProvider: ${onlineResult.metadata.sourceProvider}`);
    console.log(`  trace_id:       ${onlineResult.metadata.traceId}`);
    assert(
      onlineResult.metadata.sourceProvider === 'NASA_POWER' || onlineResult.metadata.sourceProvider === 'PVGIS',
      'REAL_INTERNET=true returned data from NASA_POWER or PVGIS (never analytical model)'
    );
    assert(onlineResult.metadata.isEstimatedFromGlobalModel === false, 'Real measured data is not marked as estimated');
  } catch (err) {
    const errMsg = (err as Error).message;
    console.log(`  Network call result: ${errMsg}`);
    // In restricted sandbox, external APIs (NASA / PVGIS) are blocked by design.
    // The key invariant: It MUST NOT silently fall back to REGIONAL_ANALYTICAL_MODEL.
    const isAnalyticalFallbackBlocked =
      errMsg.includes('No analytical fallback allowed in REAL_INTERNET mode') ||
      errMsg.includes('Analytical fallback disabled in REAL_INTERNET mode') ||
      errMsg.includes('REAL_INTERNET=true');

    assert(isAnalyticalFallbackBlocked, 'REAL_INTERNET=true strictly blocked silent analytical fallback and threw explicit error');
  } finally {
    delete process.env.REAL_INTERNET;
  }

  // Final summary
  console.log('\n================================================================================');
  console.log(` ${failures === 0 ? 'ALL VERIFICATION ASSERTIONS PASSED (100%)' : `${failures} ASSERTION(S) FAILED`}`);
  console.log('================================================================================');

  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal unhandled error in probe:', err);
  process.exit(2);
});
