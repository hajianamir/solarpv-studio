/**
 * Bounded in-process cache policy for the unauthenticated geocoding proxy.
 * Query and result byte limits are enforced before retaining data.
 */
export const MAX_GEOCODE_QUERY_BYTES = 256;
export const MAX_GEOCODE_CACHE_ENTRIES = 500;
export const MAX_GEOCODE_CACHE_RESULT_BYTES = 32 * 1024;
export const MAX_GEOCODE_CACHE_TOTAL_BYTES = 8 * 1024 * 1024;
export const GEOCODE_CACHE_TTL_MS = 30 * 60 * 1000;

const utf8ByteLength = (value: string): number => new TextEncoder().encode(value).byteLength;

/** Canonical key and provider query: compatibility-normalized, whitespace-collapsed and case-insensitive. */
export function normalizeGeocodeQuery(query: string): string {
  return query.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();
}

export function isGeocodeQueryWithinLimit(query: string): boolean {
  return query.length > 0 && utf8ByteLength(query) <= MAX_GEOCODE_QUERY_BYTES;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  resultBytes: number;
}

export interface BoundedGeocodeCacheOptions {
  maxEntries?: number;
  ttlMs?: number;
  maxResultBytes?: number;
  maxTotalBytes?: number;
}

/**
 * Expiring LRU cache. Every lookup/insertion prunes expired entries, and
 * insertion evicts least-recently-used entries until the hard size cap holds.
 */
export class BoundedGeocodeCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private readonly maxResultBytes: number;
  private readonly maxTotalBytes: number;
  private retainedBytes = 0;

  constructor(options: BoundedGeocodeCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? MAX_GEOCODE_CACHE_ENTRIES;
    this.ttlMs = options.ttlMs ?? GEOCODE_CACHE_TTL_MS;
    this.maxResultBytes = options.maxResultBytes ?? MAX_GEOCODE_CACHE_RESULT_BYTES;
    this.maxTotalBytes = options.maxTotalBytes ?? MAX_GEOCODE_CACHE_TOTAL_BYTES;
    if (!Number.isInteger(this.maxEntries) || this.maxEntries < 1) {
      throw new RangeError('Geocode cache maxEntries must be a positive integer');
    }
    if (!Number.isFinite(this.ttlMs) || this.ttlMs <= 0) {
      throw new RangeError('Geocode cache ttlMs must be positive');
    }
    if (!Number.isInteger(this.maxResultBytes) || this.maxResultBytes < 1) {
      throw new RangeError('Geocode cache maxResultBytes must be a positive integer');
    }
    if (!Number.isInteger(this.maxTotalBytes) || this.maxTotalBytes < 1) {
      throw new RangeError('Geocode cache maxTotalBytes must be a positive integer');
    }
  }

  get size(): number {
    return this.sizeAt(Date.now());
  }

  get cachedResultBytes(): number {
    return this.cachedResultBytesAt(Date.now());
  }

  cachedResultBytesAt(now: number): number {
    this.pruneExpired(now);
    return this.retainedBytes;
  }

  sizeAt(now: number): number {
    this.pruneExpired(now);
    return this.entries.size;
  }

  get(key: string, now: number = Date.now()): T | undefined {
    this.pruneExpired(now);
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now) {
      this.deleteEntry(key);
      return undefined;
    }
    // Reinsert to make this the most-recently-used entry without extending TTL.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  /** Returns false for oversized/invalid keys or values and retains nothing. */
  set(key: string, value: T, now: number = Date.now()): boolean {
    if (!isGeocodeQueryWithinLimit(key)) return false;

    let serialized: string | undefined;
    try {
      serialized = JSON.stringify(value);
    } catch {
      return false;
    }
    if (typeof serialized !== 'string') return false;
    const resultBytes = utf8ByteLength(serialized);
    if (resultBytes > this.maxResultBytes || resultBytes > this.maxTotalBytes) return false;

    this.pruneExpired(now);
    this.deleteEntry(key);
    while (this.entries.size >= this.maxEntries || this.retainedBytes + resultBytes > this.maxTotalBytes) {
      const oldestKey = this.entries.keys().next().value as string | undefined;
      if (oldestKey === undefined) break;
      this.deleteEntry(oldestKey);
    }
    this.entries.set(key, {
      value,
      expiresAt: now + this.ttlMs,
      resultBytes,
    });
    this.retainedBytes += resultBytes;
    return true;
  }

  pruneExpired(now: number = Date.now()): number {
    let removed = 0;
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) {
        this.deleteEntry(key);
        removed++;
      }
    }
    return removed;
  }

  private deleteEntry(key: string): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;
    this.entries.delete(key);
    this.retainedBytes -= entry.resultBytes;
    return true;
  }
}
