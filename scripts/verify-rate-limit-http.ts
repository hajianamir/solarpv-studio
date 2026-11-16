import assert from 'node:assert/strict';
import { once } from 'node:events';

process.env.NODE_ENV = 'test';
process.env.VITE_REAL_INTERNET = 'false';
const { app } = await import('../server');
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
assert.ok(address && typeof address === 'object');
const baseUrl = `http://127.0.0.1:${address.port}`;

try {
  let lastResponse: Response | undefined;
  for (let i = 0; i < 31; i += 1) {
    lastResponse = await fetch(`${baseUrl}/api/v1/gateway/geocode`);
  }
  assert.equal(lastResponse?.status, 429, '31st geocode request in one minute is blocked at the mounted middleware');
  assert.ok(Number(lastResponse?.headers.get('retry-after')) > 0, '429 includes Retry-After');
  const payload = await lastResponse!.json() as { error?: string };
  assert.equal(payload.error, 'Too many requests');
  console.log('Mounted HTTP rate-limit gate passed (30 requests allowed to route; 31st receives 429 without upstream access).');
} finally {
  server.close();
  await once(server, 'close');
}
