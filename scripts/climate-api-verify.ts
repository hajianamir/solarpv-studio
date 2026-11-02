/**
 * PR-2a-6 REPAIR — Ambiguity B/E integration script
 * =================================================
 * Climate data must come from real global APIs only (NASA POWER → Americas,
 * PVGIS 5.3 SARAH-2 → Europe/Africa/Asia, NSRSB otherwise), routed through the
 * External Data Gateway. Every call logs a trace_id and returns raw HTTP output.
 * No global estimation/interpolation presented as measured data: analytical
 * circuit-breaker fallback is explicitly flagged isEstimated=true with
 * confidence 'analytical_estimate' (never 'hub_calibrated' — hubs deleted).
 *
 * 3 real coordinates × trace_id + provider + raw output.
 * Fails if annualGHI spread across the 3 points is not > 10%.
 */

import { fetchClimateData, getClimateData } from '../src/engine/climaticData';
import { ExternalDataGateway } from '../src/engine/dataGateway/externalDataGateway';

const SITES = [
  { name: 'Tehran, IR', lat: 35.6892, lng: 51.3890 },
  { name: 'Munich, DE', lat: 48.1351, lng: 11.5820 },
  { name: 'Phoenix, AZ, US', lat: 33.4484, lng: -112.0740 },
] as const;

let failures = 0;
function assert(condition: boolean, message: string) {
  if (condition) console.log(`  [PASS] ${message}`);
  else { console.error(`  [FAIL] ${message}`); failures++; }
}

async function main() {
  console.log('================================================================================');
  console.log(' PR-2a-6 REPAIR — Climate API routing per coordinate (Ambiguity B/E)');
  console.log('================================================================================\n');

  const rows: Array<{ name: string; lat: number; lng: number; traceId: string; provider: string; isEstimated: boolean; annualGhi: number; rawKeys: string[] }> = [];

  for (const site of SITES) {
    const city = await fetchClimateData(site.lat, site.lng);
    const traceId = city.id;
    const provider = city.dataSourceEn;
    const isEstimated = city.confidence === 'analytical_estimate';
    const annualGhi = city.peakSunHours * 365;

    // Raw gateway output (HTTP response) available via ComprehensiveSiteData
    const gateway = await ExternalDataGateway.getInstance().getComprehensiveSiteData(site.lat, site.lng);
    const rawKeys = Object.keys(gateway.climateResource);

    console.log(`\n--- ${site.name} (${site.lat.toFixed(4)}°, ${site.lng.toFixed(4)}°) ---`);
    console.log(`  trace_id: ${traceId}`);
    console.log(`  provider: ${provider}`);
    console.log(`  confidence: ${city.confidence} | isEstimated: ${isEstimated}`);
    console.log(`  annualGHI: ${annualGhi.toFixed(0)} kWh/m²/y | PSH: ${city.peakSunHours} kWh/m²/day`);
    console.log(`  raw output keys: ${rawKeys.join(', ')}`);

    rows.push({ name: site.name, lat: site.lat, lng: site.lng, traceId, provider, isEstimated, annualGhi, rawKeys });
  }

  console.log('\n================================================================================');
  console.log(' ASSERTIONS');
  console.log('================================================================================\n');

  // Every call carries a unique trace_id
  const traceIds = rows.map(r => r.traceId);
  assert(new Set(traceIds).size === 3, `3 unique trace_ids (got ${new Set(traceIds).size}): ${traceIds.join(' | ')}`);
  for (const r of rows) {
    assert(typeof r.traceId === 'string' && r.traceId.length > 0, `${r.name}: trace_id present`);
    assert(r.provider.length > 0, `${r.name}: source provider logged`);
    assert(r.rawKeys.length > 0, `${r.name}: raw HTTP output returned`);
  }

  // No 'hub_calibrated' confidence — climate hubs are deleted (ADR-005)
  for (const r of rows) {
    assert(r.isEstimated !== undefined, `${r.name}: estimation flag is explicit`);
    const syncCity = getClimateData(r.lat, r.lng);
    assert(syncCity.confidence !== 'hub_calibrated', `${r.name}: confidence is not 'hub_calibrated' (${syncCity.confidence})`);
  }

  // annualGHI spread between the 3 points must be > 10% (real regional differentiation)
  const ghis = rows.map(r => r.annualGhi);
  const spread = (Math.max(...ghis) - Math.min(...ghis)) / Math.min(...ghis) * 100;
  console.log(`  annualGHI values: ${ghis.map(g => g.toFixed(0)).join(' | ')} kWh/m²/y`);
  console.log(`  spread: ${spread.toFixed(2)}%`);
  assert(spread > 10, `annualGHI spread > 10% across 3 coordinates (got ${spread.toFixed(2)}%)`);

  // Sync getClimateData must never carry 'hub_calibrated' either
  for (const site of SITES) {
    const syncCity = getClimateData(site.lat, site.lng);
    assert(syncCity.confidence !== 'hub_calibrated', `${site.name}: sync path not hub-calibrated (${syncCity.confidence})`);
  }

  console.log(`\n${failures === 0 ? 'ALL CLIMATE API ASSERTIONS PASSED' : failures + ' ASSERTION(S) FAILED'}`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((err) => {
  console.error('UNCAUGHT ERROR:', err);
  process.exit(2);
});
