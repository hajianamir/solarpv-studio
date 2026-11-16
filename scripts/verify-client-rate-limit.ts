import assert from 'node:assert/strict';
import { createClientRateLimiter } from '../src/server/clientRateLimit';

let now = 10_000;
const middleware = createClientRateLimiter({ windowMs: 60_000, maxRequests: 2, maxTrackedClients: 100, now: () => now });
function invoke(ip: string) {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let body: unknown;
  let nextCalls = 0;
  const req = { ip, socket: { remoteAddress: ip } } as any;
  const res = {
    setHeader(name: string, value: string) { headers[name] = value; return this; },
    status(code: number) { statusCode = code; return this; },
    json(value: unknown) { body = value; return this; },
  } as any;
  middleware(req, res, (() => { nextCalls += 1; }) as any);
  return { headers, statusCode, body, nextCalls };
}

assert.equal(invoke('192.0.2.1').nextCalls, 1, 'first request proceeds');
assert.equal(invoke('192.0.2.1').nextCalls, 1, 'second request proceeds');
const blocked = invoke('192.0.2.1');
assert.equal(blocked.statusCode, 429, 'request over limit is blocked');
assert.equal(blocked.nextCalls, 0, 'blocked request never reaches route');
assert.ok(Number(blocked.headers['Retry-After']) > 0, 'blocked response includes Retry-After');
assert.equal(invoke('192.0.2.2').nextCalls, 1, 'limits are isolated per client');
now += 60_001;
assert.equal(invoke('192.0.2.1').nextCalls, 1, 'expired window is reset');

assert.throws(() => createClientRateLimiter({ windowMs: 999, maxRequests: 1 }), /windowMs/);
assert.throws(() => createClientRateLimiter({ windowMs: 1000, maxRequests: 0 }), /maxRequests/);
console.log('Client rate-limit contract passed (window, per-client isolation, 429 headers, expiry, config validation).');
