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

async function reserveDistributedSpacing(provider: string, minIntervalMs: number, signal?: AbortSignal): Promise<void> {
  const url = typeof process !== 'undefined' ? process.env.PROVIDER_LIMITER_REDIS_REST_URL : undefined;
  const token = typeof process !== 'undefined' ? process.env.PROVIDER_LIMITER_REDIS_REST_TOKEN : undefined;
  if (!url && !token) return;
  if (!url || !token) throw new Error('Both PROVIDER_LIMITER_REDIS_REST_URL and PROVIDER_LIMITER_REDIS_REST_TOKEN are required.');
  if (minIntervalMs <= 0) return;

  // Redis atomic reservation makes Nominatim spacing safe across Node processes/replicas.
  const script = "local t=redis.call('TIME'); local now=t[1]*1000+math.floor(t[2]/1000); local n=tonumber(redis.call('GET',KEYS[1]) or '0'); local slot=math.max(now,n); redis.call('SET',KEYS[1],slot+tonumber(ARGV[1]),'PX',tonumber(ARGV[1])*20); return math.max(0,slot-now)";
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['EVAL', script, '1', `solarpv:provider-gap:${provider}`, String(minIntervalMs)]),
    signal,
  });
  if (!response.ok) throw new Error(`Shared provider limiter returned HTTP ${response.status}`);
  const payload = await response.json() as { result?: unknown; error?: string };
  if (payload.error) throw new Error(`Shared provider limiter error: ${payload.error}`);
  const delayMs = Number(payload.result);
  if (Number.isFinite(delayMs) && delayMs > 0) await wait(delayMs, signal);
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
      await reserveDistributedSpacing(task.provider, task.minIntervalMs, task.signal);
      throwIfAborted(task.signal);
      task.resolve(await task.run());
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
