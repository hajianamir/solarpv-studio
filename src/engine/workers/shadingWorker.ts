import {
  simulateAnnual3dShading,
  type Scene3DState,
  type ShadingSimulationOptions,
  type AnnualShading3dResult,
} from '../roof3dShadingEngine';

export interface WorkerShadingRequest {
  id: string;
  type: 'simulate';
  scene: Scene3DState;
  peakSunHours: number;
  ambientTempMaxC: number;
  options?: ShadingSimulationOptions;
}

export type WorkerShadingResponse =
  | { id: string; type: 'progress'; progressPct: number; currentDay: number; totalDays: number }
  | { id: string; type: 'complete'; result: AnnualShading3dResult }
  | { id: string; type: 'aborted' }
  | { id: string; type: 'error'; error: string };

self.onmessage = (event: MessageEvent<WorkerShadingRequest | { id: string; type: 'cancel' }>) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'simulate') {
    const { id, scene, peakSunHours, ambientTempMaxC, options } = data;
    try {
      const result = simulateAnnual3dShading(scene, peakSunHours, ambientTempMaxC, {
        ...options,
        onProgress: (progressPct, currentDay, totalDays) => {
          self.postMessage({ id, type: 'progress', progressPct, currentDay, totalDays });
        },
      });
      self.postMessage({ id, type: 'complete', result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('aborted')) {
        self.postMessage({ id, type: 'aborted' });
      } else {
        self.postMessage({ id, type: 'error', error: msg });
      }
    }
  }
};
