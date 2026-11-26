import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { once } from 'node:events';

process.env.NODE_ENV = 'production';
process.env.VITE_REAL_INTERNET = 'false';
process.env.JWT_SECRET = 'http-test-only-secret-never-use-in-production';
process.env.JWT_ISSUER = 'https://idp.example.test/';
process.env.JWT_AUDIENCE = 'solarpv-api-test';
delete process.env.INTERNAL_GATEWAY_SECRET;

const { app, assertProductionJwtConfiguration } = await import('../server');
assert.doesNotThrow(() => assertProductionJwtConfiguration(), 'agreed production JWT configuration permits server startup');
const configuredIssuer = process.env.JWT_ISSUER;
const configuredAudience = process.env.JWT_AUDIENCE;
delete process.env.JWT_ISSUER;
assert.throws(() => assertProductionJwtConfiguration(), /JWT_ISSUER and JWT_AUDIENCE/, 'missing production issuer blocks startup in JWT mode');
process.env.JWT_ISSUER = configuredIssuer;
delete process.env.JWT_AUDIENCE;
assert.throws(() => assertProductionJwtConfiguration(), /JWT_ISSUER and JWT_AUDIENCE/, 'missing production audience blocks startup in JWT mode');
process.env.JWT_AUDIENCE = configuredAudience;
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
assert.ok(address && typeof address === 'object');
const baseUrl = `http://127.0.0.1:${address.port}`;

function token(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: 'production-auth-http-test-user',
    exp: Math.floor(Date.now() / 1000) + 300,
    ...claims,
  })).toString('base64url');
  const signingInput = `${header}.${payload}`;
  const signature = createHmac('sha256', process.env.JWT_SECRET!).update(signingInput).digest('base64url');
  return `${signingInput}.${signature}`;
}

async function createProject(authorization?: string, extraHeaders: Record<string, string> = {}) {
  return fetch(`${baseUrl}/api/v1/projects/quick-size`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(authorization ? { authorization } : {}),
      ...extraHeaders,
    },
    body: JSON.stringify({ allowAnalyticalEstimate: true, dailyKwh: 20, autonomyDays: 1, latitude: 40.7, longitude: -74, persist: false }),
  });
}

try {
  const acceptedClaims = { iss: process.env.JWT_ISSUER, aud: process.env.JWT_AUDIENCE };
  assert.equal((await createProject(`Bearer ${token({ exp: undefined, ...acceptedClaims })}`)).status, 401, 'production JWT without required exp fails closed over HTTP');
  assert.equal((await createProject(`Bearer ${token({ exp: Math.floor(Date.now() / 1000) - 1, ...acceptedClaims })}`)).status, 401, 'expired production JWT fails closed over HTTP');
  assert.equal((await createProject(`Bearer ${token({ exp: Math.floor(Date.now() / 1000) + 172800, ...acceptedClaims })}`)).status, 401, 'production JWT exceeding default max TTL fails closed over HTTP');
  assert.equal((await createProject(`Bearer ${token({})}`)).status, 401, 'production JWT without issuer/audience claims fails closed');
  assert.equal((await createProject(`Bearer ${token({ iss: acceptedClaims.iss })}`)).status, 401, 'production JWT without audience fails closed');
  assert.equal((await createProject(`Bearer ${token({ ...acceptedClaims, iss: 'https://wrong.example.test/' })}`)).status, 401, 'issuer mismatch is rejected');
  assert.equal((await createProject(`Bearer ${token({ ...acceptedClaims, aud: 'wrong-api' })}`)).status, 401, 'audience mismatch is rejected');
  assert.equal((await createProject(`Bearer ${token(acceptedClaims)}`)).status, 200, 'exact agreed issuer and audience are accepted');

  // Production JWT mode cannot silently run without the agreed IdP configuration.
  delete process.env.JWT_ISSUER;
  assert.equal((await createProject(`Bearer ${token(acceptedClaims)}`)).status, 401, 'missing production issuer configuration fails closed');
  process.env.JWT_ISSUER = acceptedClaims.iss;
  delete process.env.JWT_AUDIENCE;
  assert.equal((await createProject(`Bearer ${token(acceptedClaims)}`)).status, 401, 'missing production audience configuration fails closed');
  process.env.JWT_AUDIENCE = acceptedClaims.aud;

  // Explicit gateway-only mode is separate: no JWT secret, bearer rejected, signed gateway identity accepted.
  const bearerForGatewayOnly = token(acceptedClaims);
  delete process.env.JWT_SECRET;
  delete process.env.JWT_ISSUER;
  delete process.env.JWT_AUDIENCE;
  process.env.INTERNAL_GATEWAY_SECRET = 'gateway-http-test-secret-never-use-in-production';
  assert.doesNotThrow(() => assertProductionJwtConfiguration(), 'documented gateway-only mode does not require JWT issuer/audience');
  assert.equal((await createProject(`Bearer ${bearerForGatewayOnly}`)).status, 401, 'gateway-only mode rejects bearer tokens');
  assert.equal((await createProject(undefined, { 'x-user-id': 'gateway-test-user' })).status, 401, 'gateway-only mode rejects unsigned identity headers');
  assert.equal((await createProject(undefined, {
    'x-user-id': 'gateway-test-user',
    'x-gateway-secret': process.env.INTERNAL_GATEWAY_SECRET,
  })).status, 200, 'gateway-only mode accepts identity only with configured gateway secret');

  console.log('Production HTTP auth gate passed: JWT issuer/audience are mandatory and exact; gateway-only remains isolated and authenticated.');
} finally {
  server.close();
  await once(server, 'close');
}
