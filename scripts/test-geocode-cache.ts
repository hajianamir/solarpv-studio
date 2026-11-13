import assert from 'node:assert/strict';
import {
  BoundedGeocodeCache,
  MAX_GEOCODE_CACHE_ENTRIES,
  MAX_GEOCODE_CACHE_TOTAL_BYTES,
  MAX_GEOCODE_QUERY_BYTES,
  isGeocodeQueryWithinLimit,
  normalizeGeocodeQuery,
} from '../src/engine/dataGateway/geocodeCache';

const passed: string[] = [];
function check(name: string, run: () => void) {
  run();
  passed.push(name);
  console.log(`[PASS] ${name}`);
}

check('query normalization is canonical and strict UTF-8 length limit is enforced', () => {
  assert.equal(normalizeGeocodeQuery('  ＮＥＷ　York\n'), 'new york');
  assert.equal(isGeocodeQueryWithinLimit('x'.repeat(MAX_GEOCODE_QUERY_BYTES)), true);
  assert.equal(isGeocodeQueryWithinLimit('x'.repeat(MAX_GEOCODE_QUERY_BYTES + 1)), false);
  assert.equal(isGeocodeQueryWithinLimit('é'.repeat(MAX_GEOCODE_QUERY_BYTES / 2)), true);
  assert.equal(isGeocodeQueryWithinLimit('é'.repeat(MAX_GEOCODE_QUERY_BYTES / 2 + 1)), false);
  assert.equal(isGeocodeQueryWithinLimit(' '.repeat(MAX_GEOCODE_QUERY_BYTES + 1)), false, 'oversized raw whitespace must be rejected before normalization');
});

check('LRU cache remains capped when continuously filled beyond its maximum', () => {
  const cache = new BoundedGeocodeCache<string[]>({ maxEntries: 3, ttlMs: 1000 });
  for (let index = 0; index < 100; index++) {
    assert.equal(cache.set(`query-${index}`, [`result-${index}`], 0), true);
    assert.ok(cache.sizeAt(0) <= 3);
  }
  assert.equal(cache.sizeAt(0), 3);
  assert.deepEqual(cache.get('query-99', 0), ['result-99']);
  assert.equal(cache.get('query-96', 0), undefined, 'oldest entry should have been evicted');

  const productionCache = new BoundedGeocodeCache<number>();
  for (let index = 0; index < MAX_GEOCODE_CACHE_ENTRIES + 100; index++) {
    assert.equal(productionCache.set(`production-${index}`, index, 0), true);
  }
  assert.equal(productionCache.sizeAt(0), MAX_GEOCODE_CACHE_ENTRIES, 'production cache must enforce its configured hard cap');
  assert.ok(productionCache.cachedResultBytesAt(0) <= MAX_GEOCODE_CACHE_TOTAL_BYTES);
});

check('expired entries are pruned and expired lookups cannot be served', () => {
  const cache = new BoundedGeocodeCache<string[]>({ maxEntries: 4, ttlMs: 100 });
  for (let index = 0; index < 4; index++) {
    assert.equal(cache.set(`aged-${index}`, [`result-${index}`], 1000), true);
  }
  assert.equal(cache.sizeAt(1099), 4);
  assert.equal(cache.get('aged-0', 1100), undefined);
  assert.equal(cache.sizeAt(1100), 0);
  for (let index = 0; index < 40; index++) {
    assert.equal(cache.set(`refill-${index}`, ['ok'], 1100), true);
  }
  assert.equal(cache.sizeAt(1100), 4, 'refill after expiry must still obey the hard entry cap');
  assert.equal(cache.sizeAt(1200), 0, 'all entries must be removed after their TTL');
});

check('oversized query keys and serialized results are never retained', () => {
  const cache = new BoundedGeocodeCache<string[]>({ maxEntries: 2, ttlMs: 1000, maxResultBytes: 16 });
  assert.equal(cache.set('x'.repeat(MAX_GEOCODE_QUERY_BYTES + 1), ['ok'], 0), false);
  assert.equal(cache.set('small-query', ['x'.repeat(32)], 0), false);
  assert.equal(cache.sizeAt(0), 0);

  const byteBounded = new BoundedGeocodeCache<string[]>({ maxEntries: 10, ttlMs: 1000, maxResultBytes: 16, maxTotalBytes: 8 });
  assert.equal(byteBounded.set('first', ['a'], 0), true);
  assert.equal(byteBounded.set('second', ['b'], 0), true);
  assert.equal(byteBounded.sizeAt(0), 1, 'aggregate byte budget should evict least-recently-used data');
  assert.equal(byteBounded.get('first', 0), undefined);
  assert.deepEqual(byteBounded.get('second', 0), ['b']);
  assert.ok(byteBounded.cachedResultBytesAt(0) <= 8);
});

console.log(`Geocode cache regression checks: ${passed.length}/${passed.length} PASS (production cap=${MAX_GEOCODE_CACHE_ENTRIES})`);
