type ProviderTask = {
  provider: string;
  minIntervalMs: number;
  signal?: AbortSignal;
  run: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  abortListener?: () => void;
};

type ProviderLimiterState = {
  active: number;
  queue: ProviderTask[];
  nextStartByProvider: Map<string, number>;
  timer: ReturnType<typeof setTimeout> | null;
};

const GLOBAL_KEY = Symbol.for('solarpv.provider-request-limiter.v1');
const MAX_CONCURRENT_REQUESTS = 4;

/** Coordinator errors occur before an upstream request is invoked. */
export class ProviderCoordinatorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderCoordinatorError';
  }
}

const globalScope = globalThis as typeof globalThis & { [key: symbol]: ProviderLimiterState | undefined };
const state: ProviderLimiterState = globalScope[GLOBAL_KEY] ?? (globalScope[GLOBAL_KEY] = {
  active: 0,
  queue: [] as ProviderTask[],
  nextStartByProvider: new Map<string, number>(),
  timer: null,
});

function abortError(signal?: AbortSignal): Error {
  const error = new Error(signal?.reason instanceof Error ? signal.reason.message : 'Provider request aborted');
  error.name = 'AbortError';
  return error;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError(signal);
}

const wait = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal?.aborted) return reject(abortError(signal));
  const timer = setTimeout(() => {
    signal?.removeEventListener('abort', onAbort);
    resolve();
  }, ms);
  const onAbort = () => {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
    reject(abortError(signal));
  };
  signal?.addEventListener('abort', onAbort, { once: true });
});

export async function runWithDistributedStartGate<T>(
  provider: string,
  minIntervalMs: number,
  signal: AbortSignal | undefined,
  run: () => Promise<T>,
): Promise<T> {
  const url = typeof process !== 'undefined' ? process.env.PROVIDER_LIMITER_REDIS_REST_URL : undefined;
  const token = typeof process !== 'undefined' ? process.env.PROVIDER_LIMITER_REDIS_REST_TOKEN : undefined;
  const isProduction = typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
  if (!url && !token) {
    if (provider === 'nominatim' && isProduction) {
      throw new ProviderCoordinatorError('Nominatim is disabled: configure the shared Redis REST limiter for multi-instance-safe request spacing.');
    }
    return run();
  }
  if (!url || !token) throw new ProviderCoordinatorError('Both PROVIDER_LIMITER_REDIS_REST_URL and PROVIDER_LIMITER_REDIS_REST_TOKEN are required.');
  if (minIntervalMs <= 0) return run();

  const leaseKey = `solarpv:provider-start-lease:${provider}`;
  const startKey = `solarpv:provider-last-start:${provider}`;
  const leaseMs = Math.max(30000, minIntervalMs * 4);
  const leaseToken = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  const claimScript = "local t=redis.call('TIME'); local now=t[1]*1000+math.floor(t[2]/1000); local owner=redis.call('GET',KEYS[1]); if owner then return -1 end; local last=tonumber(redis.call('GET',KEYS[2]) or '0'); local delay=last+tonumber(ARGV[2])-now; if delay>0 then return delay end; redis.call('SET',KEYS[1],ARGV[1],'PX',ARGV[3],'NX'); return 0";
  const finishScript = "local t=redis.call('TIME'); local now=t[1]*1000+math.floor(t[2]/1000); if redis.call('GET',KEYS[1])==ARGV[1] then redis.call('SET',KEYS[2],now,'PX',ARGV[2]); redis.call('DEL',KEYS[1]); return 1 end; return 0";

  const redisEval = async (script: string, args: string[]) => {
    throwIfAborted(signal);
    // Even callers without a signal must not wait forever for the coordinator.
    // A timed-out claim may still have executed at Redis: fail closed and let
    // its lease expire rather than starting or immediately retrying upstream.
    const coordinatorSignal = combineProviderSignals(signal, AbortSignal.timeout(10000));
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['EVAL', script, '2', leaseKey, startKey, ...args]),
      signal: coordinatorSignal,
    });
    if (!response.ok) throw new Error(`Shared provider limiter returned HTTP ${response.status}`);
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Shared provider limiter returned a malformed response.');
    }
    const result = (payload as { result?: unknown; error?: unknown }).result;
    const providerError = (payload as { error?: unknown }).error;
    if (providerError !== undefined) {
      if (typeof providerError !== 'string' || providerError.length === 0) {
        throw new Error('Shared provider limiter returned a malformed error response.');
      }
      throw new Error(`Shared provider limiter error: ${providerError}`);
    }
    // Lua returns -1 for a held lease, 0 for a successful claim, or a positive
    // integer delay. Reject missing/null/string/NaN/fractional values before the
    // upstream callback: Number(undefined) previously became NaN and failed open.
    if (typeof result !== 'number' || !Number.isSafeInteger(result) || result < -1) {
      throw new Error('Shared provider limiter returned an invalid lease result; upstream request was not started.');
    }
    return result;
  };

  // Each delayed reservation is rechecked at Redis after waiting. A lease serializes
  // the actual fetch invocation; the last-start timestamp is written after fetch() is
  // invoked and before releasing the lease, so delayed Redis responses cannot make a
  // subsequent process reuse an old relative slot. A crashed holder fails closed until
  // the lease expires; its lease TTL exceeds the provider spacing interval.
  while (true) {
    throwIfAborted(signal);
    const claimWallStart = Date.now();
    const claimMonotonicStart = performance.now();
    let delayMs: number;
    try {
      delayMs = await redisEval(claimScript, [leaseToken, String(minIntervalMs), String(leaseMs)]);
    } catch (error) {
      if (signal?.aborted) throw abortError(signal);
      // Do not expose coordinator URLs, tokens, or untrusted response bodies.
      void error;
      throw new ProviderCoordinatorError('Shared provider limiter claim failed; upstream was not started.');
    }
    if (delayMs < 0) {
      await wait(Math.min(100, minIntervalMs), signal);
      continue;
    }
    if (delayMs > 0) {
      await wait(delayMs, signal);
      continue;
    }

    // The lease can expire while an asymmetric REST reply is in flight. The
    // claim began no earlier than this local request; reject if even that
    // conservative remaining time is insufficient for one spacing interval.
    // Wall time catches host suspension; monotonic time catches wall-clock jumps.
    const wallElapsed = Date.now() - claimWallStart;
    const elapsed = Math.max(wallElapsed, performance.now() - claimMonotonicStart);
    if (wallElapsed < 0 || elapsed >= leaseMs - minIntervalMs - 1000) {
      throw new ProviderCoordinatorError('Shared provider limiter claim arrived too late; upstream was not started.');
    }

    // Attach both fulfillment and rejection handlers immediately. Waiting for
    // Redis release before observing a fast upstream rejection otherwise causes
    // an unhandled rejection (and process termination on modern Node).
    let providerOutcome: Promise<{ ok: true; value: T } | { ok: false; error: unknown }>;
    try {
      throwIfAborted(signal);
      providerOutcome = Promise.resolve(run()).then(
        (value) => ({ ok: true as const, value }),
        (error) => ({ ok: false as const, error }),
      );
    } catch (error) {
      providerOutcome = Promise.resolve({ ok: false, error });
    }
    try {
      const released = await redisEval(finishScript, [leaseToken, String(leaseMs * 20)]);
      if (released !== 1) throw new Error('Start lease was not owned when release was attempted.');
    } catch (error) {
      // Invocation was attempted; do not retry it as a pre-start failure. If the
      // release failed before Redis executed it, the lease expires conservatively.
      void error;
      console.error('[provider-limiter] post-invocation lease release failed or was unconfirmed; no automatic upstream retry');
    }
    const outcome = await providerOutcome;
    if (!outcome.ok) throw outcome.error;
    return outcome.value;
  }
}

function pump(): void {
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
  if (state.active >= MAX_CONCURRENT_REQUESTS || state.queue.length === 0) return;

  const now = Date.now();
  const eligibleIndex = state.queue.findIndex((task) => {
    if (task.signal?.aborted) return true;
    return (state.nextStartByProvider.get(task.provider) ?? 0) <= now;
  });
  if (eligibleIndex < 0) {
    const nextAt = Math.min(...state.queue.map((task) => state.nextStartByProvider.get(task.provider) ?? now));
    state.timer = setTimeout(pump, Math.max(0, nextAt - now));
    return;
  }

  const [task] = state.queue.splice(eligibleIndex, 1);
  task.signal?.removeEventListener('abort', task.abortListener!);
  if (task.signal?.aborted) {
    task.reject(abortError(task.signal));
    pump();
    return;
  }

  state.active += 1;
  state.nextStartByProvider.set(task.provider, Date.now() + task.minIntervalMs);
  void (async () => {
    try {
      throwIfAborted(task.signal);
      task.resolve(await runWithDistributedStartGate(task.provider, task.minIntervalMs, task.signal, task.run));
    } catch (error) {
      task.reject(error);
    } finally {
      state.active -= 1;
      pump();
    }
  })();
  pump();
}

/** One process-wide FIFO/concurrency gate shared by all provider instances and endpoints. */
export function runProviderRequest<T>(
  provider: string,
  run: () => Promise<T>,
  options: { signal?: AbortSignal; minIntervalMs?: number } = {},
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const task: ProviderTask = {
      provider,
      minIntervalMs: Math.max(0, options.minIntervalMs ?? 0),
      signal: options.signal,
      run,
      resolve: resolve as (value: unknown) => void,
      reject,
    };
    if (task.signal?.aborted) return reject(abortError(task.signal));
    task.abortListener = () => {
      const index = state.queue.indexOf(task);
      if (index >= 0) {
        state.queue.splice(index, 1);
        task.signal?.removeEventListener('abort', task.abortListener!);
        reject(abortError(task.signal));
        pump();
      }
    };
    task.signal?.addEventListener('abort', task.abortListener, { once: true });
    state.queue.push(task);
    pump();
  });
}

export async function fetchProvider(
  provider: string,
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: { minIntervalMs?: number } = {},
): Promise<Response> {
  // Provider requests all share the same limiter. Distributed deployments also reserve
  // a minimum service slot through Redis; Nominatim keeps its strict >=1 s spacing.
  const minIntervalMs = Math.max(options.minIntervalMs ?? 0, provider === 'nominatim' ? 1050 : 100);
  return runProviderRequest(provider, () => fetch(input, init), {
    signal: init.signal ?? undefined,
    minIntervalMs,
  });
}

export function combineProviderSignals(...signals: Array<AbortSignal | undefined>): AbortSignal | undefined {
  const available = signals.filter((signal): signal is AbortSignal => Boolean(signal));
  if (available.length === 0) return undefined;
  if (available.length === 1) return available[0];
  if (typeof AbortSignal.any === 'function') return AbortSignal.any(available);
  const controller = new AbortController();
  const abort = (event: Event) => controller.abort((event.target as AbortSignal).reason);
  for (const signal of available) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener('abort', abort, { once: true });
  }
  return controller.signal;
}
