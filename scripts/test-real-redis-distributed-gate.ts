import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workerMode = process.env.PR28_REAL_REDIS_WORKER;
const filePath = fileURLToPath(import.meta.url);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emit(event: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(event)}\n`);
}

async function runWorker(): Promise<void> {
  const { runWithDistributedStartGate } = await import('../src/engine/dataGateway/providerRequestLimiter');
  const id = process.env.PR28_WORKER_ID ?? 'worker';
  const abortAfterMs = Number(process.env.PR28_ABORT_AFTER_MS ?? 0);
  const upstreamDelayMs = Number(process.env.PR28_UPSTREAM_DELAY_MS ?? 40);
  const failUpstream = process.env.PR28_FAIL_UPSTREAM === '1';
  const noSignal = process.env.PR28_NO_SIGNAL === '1';
  const controller = new AbortController();
  const timer = abortAfterMs > 0 ? setTimeout(() => controller.abort(new Error('integration cancellation deadline')), abortAfterMs) : null;
  emit({ type: 'worker-ready', id, pid: process.pid });
  try {
    const result = await runWithDistributedStartGate(
      'pr28-real-redis-integration',
      250,
      noSignal ? undefined : controller.signal,
      async () => {
        emit({ type: 'upstream-start', id, pid: process.pid, at: Date.now() });
        await sleep(upstreamDelayMs);
        if (failUpstream) throw new Error('synthetic upstream failed after invocation');
        return 'synthetic-upstream-ok';
      },
    );
    emit({ type: 'worker-result', id, pid: process.pid, result });
  } catch (error) {
    const e = error instanceof Error ? error : new Error(String(error));
    emit({ type: 'worker-error', id, pid: process.pid, name: e.name, message: e.message });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function respEncode(parts: string[]): Buffer {
  return Buffer.from(`*${parts.length}\r\n${parts.map((part) => `$${Buffer.byteLength(part)}\r\n${part}\r\n`).join('')}`);
}

function parseResp(buffer: Buffer): { value: number | string | null; bytes: number } | null {
  const end = buffer.indexOf('\r\n');
  if (end < 0 || buffer.length === 0) return null;
  const type = String.fromCharCode(buffer[0]);
  const line = buffer.toString('utf8', 1, end);
  if (type === ':') return { value: Number(line), bytes: end + 2 };
  if (type === '+') return { value: line, bytes: end + 2 };
  if (type === '-') throw new Error(`Redis returned an error: ${line}`);
  if (type === '$') {
    const length = Number(line);
    if (length === -1) return { value: null, bytes: end + 2 };
    const total = end + 2 + length + 2;
    if (buffer.length < total) return null;
    return { value: buffer.toString('utf8', end + 2, end + 2 + length), bytes: total };
  }
  throw new Error(`Unexpected Redis RESP reply type ${type}`);
}

async function commandRedis(port: number, command: string[]): Promise<number | string | null> {
  return await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    const timeout = setTimeout(() => socket.destroy(new Error('Redis socket timeout')), 3000);
    let buffer = Buffer.alloc(0);
    socket.once('connect', () => socket.write(respEncode(command)));
    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      try {
        const parsed = parseResp(buffer);
        if (!parsed) return;
        clearTimeout(timeout);
        socket.end();
        resolve(parsed.value);
      } catch (error) {
        clearTimeout(timeout);
        socket.destroy();
        reject(error);
      }
    });
    socket.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function reservePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const port = address.port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

interface BridgeState {
  mode: 'normal' | 'http-503' | 'empty-200' | 'null-result' | 'string-result' | 'bad-json';
  delayNextClaimMs: number;
  holdNextClaimMs: number;
  ttlOverrideMs: number | null;
  malformedNextRelease: boolean;
  delayNextReleaseMs: number;
  claimHeld?: () => void;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 100_000) reject(new Error('REST bridge request too large'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function sendBridgeResponse(res: ServerResponse, status: number, body: string): Promise<void> {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(body);
}

interface WorkerHandle {
  id: string;
  child: ChildProcess;
  events: Array<Record<string, unknown>>;
  stderr: string;
  exited: Promise<number>;
}

function spawnWorker(id: string, opts: { abortAfterMs?: number; upstreamDelayMs?: number; failUpstream?: boolean; noSignal?: boolean } = {}): WorkerHandle {
  const cli = path.resolve(process.cwd(), 'node_modules/tsx/dist/cli.mjs');
  const child = spawn(process.execPath, [cli, filePath], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PR28_REAL_REDIS_WORKER: '1',
      PR28_WORKER_ID: id,
      PR28_ABORT_AFTER_MS: String(opts.abortAfterMs ?? 0),
      PR28_UPSTREAM_DELAY_MS: String(opts.upstreamDelayMs ?? 40),
      PR28_FAIL_UPSTREAM: opts.failUpstream ? '1' : '0',
      PR28_NO_SIGNAL: opts.noSignal ? '1' : '0',
      NODE_OPTIONS: '--unhandled-rejections=strict',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const events: Array<Record<string, unknown>> = [];
  let output = '';
  let stderr = '';
  child.stdout!.setEncoding('utf8');
  child.stderr!.setEncoding('utf8');
  child.stdout!.on('data', (chunk: string) => {
    output += chunk;
    while (output.includes('\n')) {
      const newline = output.indexOf('\n');
      const line = output.slice(0, newline);
      output = output.slice(newline + 1);
      try { events.push(JSON.parse(line) as Record<string, unknown>); }
      catch { stderr += `non-json worker stdout: ${line}\n`; }
    }
  });
  child.stderr!.on('data', (chunk: string) => { stderr += chunk; });
  const exited = new Promise<number>((resolve) => child.once('exit', (code) => resolve(code ?? -1)));
  return { id, child, events, get stderr() { return stderr; }, exited };
}

async function waitForEvent(worker: WorkerHandle, type: string, timeoutMs = 6000): Promise<Record<string, unknown>> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const event = worker.events.find((candidate) => candidate.type === type);
    if (event) return event;
    if (worker.child.exitCode !== null) throw new Error(`worker ${worker.id} exited before ${type}: ${worker.stderr}`);
    await sleep(10);
  }
  throw new Error(`timed out waiting for ${type} from ${worker.id}; stderr=${worker.stderr}`);
}

async function waitWorker(worker: WorkerHandle, timeoutMs = 10000): Promise<void> {
  const code = await Promise.race([
    worker.exited,
    sleep(timeoutMs).then(() => { throw new Error(`worker ${worker.id} timed out; stderr=${worker.stderr}`); }),
  ]);
  assert.equal(code, 0, `worker ${worker.id} exit code; stderr=${worker.stderr}`);
}

async function main(): Promise<void> {
  const redisBin = process.env.REDIS_SERVER_BIN;
  if (!redisBin) throw new Error('REDIS_SERVER_BIN must name a disposable redis-server executable; no shared Redis fallback is permitted.');
  const version = spawnSync(redisBin, ['--version'], { encoding: 'utf8' });
  assert.equal(version.status, 0, `redis-server --version failed: ${version.stderr}`);
  const tempDir = await import('node:fs/promises').then(({ mkdtemp }) => mkdtemp(path.join(os.tmpdir(), 'pr28-isolated-redis-')));
  const redisPort = await reservePort();
  const bridgePort = await reservePort();
  const redis = spawn(redisBin, [
    '--port', String(redisPort), '--bind', '127.0.0.1', '--protected-mode', 'no',
    '--save', '', '--appendonly', 'no', '--dir', tempDir, '--loglevel', 'warning',
  ], { cwd: tempDir, stdio: ['ignore', 'pipe', 'pipe'] });
  let redisLogs = '';
  redis.stdout?.on('data', (data) => { redisLogs += String(data); });
  redis.stderr?.on('data', (data) => { redisLogs += String(data); });
  let redisReady = false;
  for (let i = 0; i < 100; i++) {
    try {
      redisReady = await commandRedis(redisPort, ['PING']) === 'PONG';
      if (redisReady) break;
    } catch { await sleep(25); }
  }
  assert.equal(redisReady, true, `isolated Redis failed to start: ${redisLogs}`);

  const state: BridgeState = {
    mode: 'normal', delayNextClaimMs: 0, holdNextClaimMs: 0,
    ttlOverrideMs: null, malformedNextRelease: false, delayNextReleaseMs: 0,
  };
  const bridge = createServer(async (req, res) => {
    try {
      if (req.method !== 'POST' || req.headers.authorization !== 'Bearer pr28-integration-only') {
        await sendBridgeResponse(res, 401, JSON.stringify({ error: 'unauthorized synthetic bridge request' }));
        return;
      }
      if (state.mode === 'http-503') {
        await sendBridgeResponse(res, 503, JSON.stringify({ error: 'synthetic REST bridge outage' }));
        return;
      }
      if (state.mode === 'empty-200') { await sendBridgeResponse(res, 200, '{}'); return; }
      if (state.mode === 'null-result') { await sendBridgeResponse(res, 200, '{"result":null}'); return; }
      if (state.mode === 'string-result') { await sendBridgeResponse(res, 200, '{"result":"0"}'); return; }
      if (state.mode === 'bad-json') { await sendBridgeResponse(res, 200, '{not-json'); return; }

      const body = JSON.parse(await readBody(req)) as unknown[];
      assert.equal(body[0], 'EVAL', 'synthetic bridge only supports the limiter EVAL endpoint');
      assert.equal(body[2], '2');
      const script = String(body[1]);
      const isClaim = script.includes("local owner=redis.call('GET',KEYS[1])");
      const isRelease = script.includes("redis.call('GET',KEYS[1])==ARGV[1]");
      const command = body.map(String);
      if (state.ttlOverrideMs !== null && isClaim) command[7] = String(state.ttlOverrideMs);
      const result = await commandRedis(redisPort, command);
      if (typeof result !== 'number') throw new Error('Redis EVAL returned a non-integer result');

      if (isClaim && result === 0 && state.holdNextClaimMs > 0) {
        const hold = state.holdNextClaimMs;
        state.holdNextClaimMs = 0;
        state.claimHeld?.();
        await sleep(hold);
      } else if (isClaim && result === 0 && state.delayNextClaimMs > 0) {
        const delay = state.delayNextClaimMs;
        state.delayNextClaimMs = 0;
        await sleep(delay);
      }
      if (isRelease && state.delayNextReleaseMs > 0) {
        const delay = state.delayNextReleaseMs;
        state.delayNextReleaseMs = 0;
        await sleep(delay);
      }
      if (isRelease && state.malformedNextRelease) {
        state.malformedNextRelease = false;
        await sendBridgeResponse(res, 200, '{}');
        return;
      }
      await sendBridgeResponse(res, 200, JSON.stringify({ result }));
    } catch (error) {
      if (!res.headersSent) await sendBridgeResponse(res, 503, JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
      else res.destroy();
    }
  });
  await new Promise<void>((resolve) => bridge.listen(bridgePort, '127.0.0.1', resolve));

  const provider = 'pr28-real-redis-integration';
  const leaseKey = `solarpv:provider-start-lease:${provider}`;
  const startKey = `solarpv:provider-last-start:${provider}`;
  const cleanupKeys = async () => { await commandRedis(redisPort, ['DEL', leaseKey, startKey]); };
  await cleanupKeys(); // Explicit test-key deletion in this isolated instance; no FLUSHDB.
  process.env.PROVIDER_LIMITER_REDIS_REST_URL = `http://127.0.0.1:${bridgePort}/eval`;
  process.env.PROVIDER_LIMITER_REDIS_REST_TOKEN = 'pr28-integration-only';

  try {
    // Two independent OS Node processes race. The bridge delays only the first
    // successful claim response after actual Redis has serialized the lease.
    state.delayNextClaimMs = 420;
    const raceA = spawnWorker('race-A', { upstreamDelayMs: 180 });
    const raceB = spawnWorker('race-B', { upstreamDelayMs: 80 });
    await Promise.all([waitWorker(raceA), waitWorker(raceB)]);
    const starts = [...raceA.events, ...raceB.events]
      .filter((event) => event.type === 'upstream-start')
      .sort((a, b) => Number(a.at) - Number(b.at));
    assert.equal(starts.length, 2, 'both real child processes must invoke their synthetic upstream once');
    assert.notEqual(starts[0].pid, starts[1].pid, 'workers must have independent Node process IDs');
    const raceGap = Number(starts[1].at) - Number(starts[0].at);
    assert.ok(raceGap >= 240, `asymmetric delayed claim race gap too short: ${raceGap} ms`);
    console.log(`[PASS] Two independent Node ${process.version} processes race through isolated Redis 7; real synthetic-upstream start gap=${raceGap} ms (420ms REST response delay).`);

    await cleanupKeys();
    // Simulate process death after Redis grants the lease but before its REST claim
    // response reaches the worker. The bridge shortens only this disposable test lease.
    state.ttlOverrideMs = 350;
    state.holdNextClaimMs = 800;
    let claimedResolve!: () => void;
    const claimed = new Promise<void>((resolve) => { claimedResolve = resolve; });
    state.claimHeld = claimedResolve;
    const killed = spawnWorker('killed-after-claim');
    await Promise.race([claimed, sleep(5000).then(() => { throw new Error('test bridge never observed successful Redis claim'); })]);
    killed.child.kill('SIGKILL');
    await killed.exited;
    state.claimHeld = undefined;
    state.ttlOverrideMs = null;
    const prematureStart = killed.events.some((event) => event.type === 'upstream-start');
    assert.equal(prematureStart, false, 'killed process started upstream before receiving Redis claim');
    const expiryDeadline = Date.now() + 3000;
    let expired = false;
    while (Date.now() < expiryDeadline) {
      expired = await commandRedis(redisPort, ['GET', leaseKey]) === null;
      if (expired) break;
      await sleep(30);
    }
    assert.equal(expired, true, 'real Redis lease did not expire after the synthetic test TTL');
    const recovered = spawnWorker('recovered-after-expiry');
    await waitWorker(recovered);
    assert.equal(recovered.events.filter((event) => event.type === 'upstream-start').length, 1);
    console.log('[PASS] Killed pre-start process leaves a real Redis lease; isolated short-TTL lease expires and a new process recovers. TTL was test-injected by synthetic REST bridge.');
    await cleanupKeys();

    // Cancellation/timeout while another process owns the real lease.
    assert.equal(await commandRedis(redisPort, ['SET', leaseKey, 'integration-blocker', 'PX', '5000']), 'OK');
    const canceled = spawnWorker('canceled-on-lease-wait', { abortAfterMs: 200 });
    await waitWorker(canceled);
    assert.equal(canceled.events.filter((event) => event.type === 'upstream-start').length, 0);
    assert.ok(canceled.events.some((event) => event.type === 'worker-error' && event.name === 'AbortError'));
    console.log('[PASS] Abort timeout while waiting on an actual Redis lease rejects before synthetic upstream start.');
    await cleanupKeys();

    // Invalid HTTP 200 bodies and an outage fail closed before upstream invocation.
    const invalidModes: BridgeState['mode'][] = ['empty-200', 'null-result', 'string-result', 'bad-json', 'http-503'];
    for (const mode of invalidModes) {
      state.mode = mode;
      const worker = spawnWorker(`invalid-${mode}`);
      await waitWorker(worker);
      assert.equal(worker.events.filter((event) => event.type === 'upstream-start').length, 0, `${mode} must block upstream`);
      assert.ok(worker.events.some((event) => event.type === 'worker-error'), `${mode} must report failure`);
    }
    state.mode = 'normal';
    console.log('[PASS] Synthetic REST bridge empty HTTP 200, null/string results, malformed JSON, and HTTP 503 all fail closed before start.');

    // A malformed post-start release is distinct: the upstream invocation already
    // happened, and the result must not be retried as if it never started.
    state.malformedNextRelease = true;
    const afterStart = spawnWorker('malformed-release-after-start');
    await waitWorker(afterStart);
    assert.equal(afterStart.events.filter((event) => event.type === 'upstream-start').length, 1);
    assert.ok(afterStart.events.some((event) => event.type === 'worker-result' && event.result === 'synthetic-upstream-ok'));
    assert.match(afterStart.stderr, /post-invocation lease release failed/);
    console.log('[PASS] Malformed release response after a real Redis-backed start is logged post-start and does not retry upstream.');
    await cleanupKeys();

    // A rejected upstream settles before the slow release response. Node's
    // strict unhandled-rejection mode must not terminate the child process.
    state.delayNextReleaseMs = 1200;
    const fastFailure = spawnWorker('fast-rejection-slow-release', { failUpstream: true, upstreamDelayMs: 10 });
    await waitWorker(fastFailure, 5000);
    assert.equal(fastFailure.events.filter((event) => event.type === 'upstream-start').length, 1);
    assert.ok(fastFailure.events.some((event) => event.type === 'worker-error' && String(event.message).includes('synthetic upstream failed')));
    assert.ok(!fastFailure.events.some((event) => event.type === 'worker-fatal'));
    console.log('[PASS] Strict Node child handles fast upstream rejection while real Redis release reply is delayed; no retry or process crash.');
    await cleanupKeys();

    // Exercise the real, unmodified 30-second lease. A delayed claim reply must
    // not start an upstream request after its lease might have expired, even
    // when the caller supplied no AbortSignal. A second process waits and
    // recovers when Redis expires the first lease.
    state.holdNextClaimMs = 30550;
    let longClaimResolve!: () => void;
    const longClaimed = new Promise<void>((resolve) => { longClaimResolve = resolve; });
    state.claimHeld = longClaimResolve;
    const delayed = spawnWorker('delayed-real-lease', { noSignal: true });
    await Promise.race([longClaimed, sleep(5000).then(() => { throw new Error('long claim was not issued'); })]);
    const actualTtl = await commandRedis(redisPort, ['PTTL', leaseKey]);
    assert.ok(typeof actualTtl === 'number' && actualTtl > 29000 && actualTtl <= 30000, `unexpected lease TTL: ${actualTtl}`);
    await waitWorker(delayed, 14000);
    state.claimHeld = undefined;
    assert.equal(delayed.events.filter((event) => event.type === 'upstream-start').length, 0);
    assert.ok(delayed.events.some((event) => event.type === 'worker-error' && event.name === 'ProviderCoordinatorError'));
    const afterRealExpiry = spawnWorker('recovered-real-lease', { noSignal: true });
    await waitWorker(afterRealExpiry, 27000);
    assert.equal(afterRealExpiry.events.filter((event) => event.type === 'upstream-start').length, 1);
    assert.ok(afterRealExpiry.events.some((event) => event.type === 'worker-result'));
    console.log(`[PASS] No-signal delayed claim fails closed; a second process recovers after actual Redis TTL=${actualTtl}ms expires (synthetic REST delay 30550ms).`);
    await cleanupKeys();

    // Simulate Redis itself becoming unavailable while the bridge remains up.
    redis.kill('SIGTERM');
    await new Promise<void>((resolve) => redis.once('exit', () => resolve()));
    const outage = spawnWorker('redis-process-stopped');
    await waitWorker(outage);
    assert.equal(outage.events.filter((event) => event.type === 'upstream-start').length, 0);
    assert.ok(outage.events.some((event) => event.type === 'worker-error'));
    console.log('[PASS] Stopped isolated Redis causes bridge 503 and blocks pre-start request.');
  } finally {
    bridge.close();
    if (redis.exitCode === null) redis.kill('SIGTERM');
    delete process.env.PROVIDER_LIMITER_REDIS_REST_URL;
    delete process.env.PROVIDER_LIMITER_REDIS_REST_TOKEN;
    await import('node:fs/promises').then(({ rm }) => rm(tempDir, { recursive: true, force: true }));
  }
}

if (workerMode) {
  runWorker().catch((error) => {
    const e = error instanceof Error ? error : new Error(String(error));
    emit({ type: 'worker-fatal', pid: process.pid, name: e.name, message: e.message });
    process.exitCode = 1;
  });
} else {
  main().catch((error) => {
    console.error('[FAIL] Real Redis distributed gate:', error);
    process.exitCode = 1;
  });
}
