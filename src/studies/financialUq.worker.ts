import { runFinancialUncertaintyPropagation, type FinancialUqRunInput } from '../engine/core/uncertaintyPropagation';

self.onmessage = (event: MessageEvent<{ input: FinancialUqRunInput }>) => {
  try {
    const input = event.data.input;
    if (!input || !Number.isInteger(input.sampleSize) || input.sampleSize! < 20 || input.sampleSize! > 2000
      || !Number.isFinite(input.seed) || !Number.isFinite(input.plantCapacityKwp) || input.plantCapacityKwp <= 0
      || !Number.isFinite(input.inverterCapacityKw) || input.inverterCapacityKw <= 0
      || !Number.isFinite(input.baseAnnualYieldKwh) || input.baseAnnualYieldKwh <= 0
      || JSON.stringify(input).length > 131072) throw new Error('UQ_WORKER_INVALID_INPUT');
    self.postMessage({ ok: true, value: runFinancialUncertaintyPropagation(input) });
  } catch {
    // Never send user pricing, project details or a stack trace to UI/logs.
    self.postMessage({ ok: false, error: 'UQ_WORKER_COMPUTATION_FAILED' });
  }
};
