import type { NextFunction, Request, Response } from 'express';

export interface ClientRateLimitOptions {
  windowMs: number;
  maxRequests: number;
  maxTrackedClients?: number;
  now?: () => number;
}

/**
 * Bounded, process-local rate limiter for costly public HTTP operations.
 * Do not treat it as cross-instance protection: horizontally scaled deployments
 * must enforce a shared limit at a trusted gateway/WAF or use a distributed store.
 */
export function createClientRateLimiter(options: ClientRateLimitOptions) {
  if (!Number.isInteger(options.windowMs) || options.windowMs < 1000) throw new Error('windowMs must be an integer >= 1000');
  if (!Number.isInteger(options.maxRequests) || options.maxRequests < 1) throw new Error('maxRequests must be a positive integer');

  const maxTrackedClients = Math.max(100, Math.floor(options.maxTrackedClients ?? 10_000));
  const now = options.now ?? Date.now;
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    // Express req.ip respects only explicitly configured trusted proxies. The app
    // leaves proxy trust disabled unless TRUST_PROXY=true is set by the operator.
    const key = (req.ip || req.socket?.remoteAddress || 'unknown-client').slice(0, 128);
    const currentTime = now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= currentTime) {
      if (buckets.size >= maxTrackedClients) {
        for (const [client, entry] of buckets) {
          if (entry.resetAt <= currentTime) buckets.delete(client);
        }
        while (buckets.size >= maxTrackedClients) {
          const oldestKey = buckets.keys().next().value as string | undefined;
          if (!oldestKey) break;
          buckets.delete(oldestKey);
        }
      }
      bucket = { count: 0, resetAt: currentTime + options.windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, options.maxRequests - bucket.count);
    const resetSeconds = Math.max(1, Math.ceil((bucket.resetAt - currentTime) / 1000));
    res.setHeader('RateLimit-Limit', String(options.maxRequests));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(resetSeconds));

    if (bucket.count > options.maxRequests) {
      res.setHeader('Retry-After', String(resetSeconds));
      res.status(429).json({ error: 'Too many requests', retryAfterSeconds: resetSeconds });
      return;
    }
    next();
  };
}
