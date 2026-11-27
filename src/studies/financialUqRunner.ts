import type { FinancialUqResult, FinancialUqRunInput } from '../engine/core/uncertaintyPropagation';
import { assertFinancialUqResult } from './financialUqResultValidation';
import { assertFinancialUqCopulaExecutable } from '../contracts/financialUqExecutionPolicy';

export interface UqWorkerPort {
  postMessage(message: unknown): void;
  terminate(): void;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
}
/** One bounded job per dedicated Worker. No synchronous fallback on the UI thread. */
export function startFinancialUq(input: FinancialUqRunInput, options: {
  workerFactory?: () => UqWorkerPort; timeoutMs?: number;
} = {}) {
  let worker: UqWorkerPort | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let settled = false;
  let rejectJob: (reason: Error) => void;
  const cleanup = () => {
    if (timer) clearTimeout(timer);
    if (worker) { worker.onmessage = null; worker.onerror = null; worker.onmessageerror = null; worker.terminate(); }
  };
  const promise = new Promise<FinancialUqResult>((resolve, reject) => {
    rejectJob = reject;
    const fail = (code: string) => { if (!settled) { settled = true; cleanup(); reject(new Error(code)); } };
    try { assertFinancialUqCopulaExecutable(input.copulaFamily); }
    catch { fail('UQ_COPULA_EXECUTION_BLOCKED'); return; }
    try {
      // Rollback switch disables this route; it never revives blocking main-thread computation.
      const env = (import.meta as ImportMeta & { env?: { VITE_FINANCIAL_UQ_WORKER?: string } }).env;
      if (env?.VITE_FINANCIAL_UQ_WORKER === 'false') throw new Error('UQ_WORKER_DISABLED');
      worker = (options.workerFactory ?? (() => new Worker(new URL('./financialUq.worker.ts', import.meta.url), { type: 'module', name: 'financial-uq' })))();
      worker.onmessage = event => {
        if (settled) return;
        const reply = event.data;
        try {
          if (reply?.ok !== true) throw new Error('UQ_WORKER_FAILED');
          assertFinancialUqResult(reply.value, input.sampleSize ?? 100);
          assertFinancialUqCopulaExecutable(reply.value.copulaFamilyUsed);
        } catch { fail('UQ_WORKER_FAILED'); return; }
        settled = true; cleanup(); resolve(reply.value);
      };
      worker.onerror = event => { event.preventDefault(); fail('UQ_WORKER_FAILED'); };
      worker.onmessageerror = () => fail('UQ_WORKER_MESSAGE_FAILED');
      timer = setTimeout(() => fail('UQ_WORKER_TIMEOUT'), options.timeoutMs ?? 120000);
      worker.postMessage({ input });
    } catch { fail('UQ_WORKER_UNAVAILABLE'); }
  });
  return { promise, cancel() {
    if (settled) return;
    settled = true; cleanup(); rejectJob(new Error('UQ_WORKER_CANCELLED'));
  } };
}
