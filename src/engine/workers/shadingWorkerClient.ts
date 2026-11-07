import {
  simulateAnnual3dShading,
  type Scene3DState,
  type ShadingSimulationOptions,
  type AnnualShading3dResult,
} from '../roof3dShadingEngine';
import type { WorkerShadingResponse } from './shadingWorker';

export interface AsyncShadingSimulationOptions extends ShadingSimulationOptions {
  abortSignal?: AbortSignal;
  onProgress?: (progressPct: number, currentDay: number, totalDays: number) => void;
}

let sharedWorker: Worker | null = null;
let activeJobId: string | null = null;

function getSharedWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }
  if (!sharedWorker) {
    try {
      sharedWorker = new Worker(new URL('./shadingWorker.ts', import.meta.url), {
        type: 'module',
      });
    } catch {
      sharedWorker = null;
    }
  }
  return sharedWorker;
}

/**
 * Runs 3D annual ray-traced shading simulation asynchronously in a Web Worker (browser)
 * or in non-blocking slices / direct execution (Node.js/test runtime).
 * Fully supports progress reporting and cancellation via AbortSignal (MAIN-05).
 */
export async function runAnnualShadingSimulationAsync(
  scene: Scene3DState,
  peakSunHours: number = 5.2,
  ambientTempMaxC: number = 40.0,
  options?: AsyncShadingSimulationOptions
): Promise<AnnualShading3dResult> {
  const worker = getSharedWorker();

  // If in browser environment with Web Worker available:
  if (worker) {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    activeJobId = id;

    return new Promise<AnnualShading3dResult>((resolve, reject) => {
      let cleanedUp = false;

      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        if (options?.abortSignal) {
          options.abortSignal.removeEventListener('abort', onAbort);
        }
        worker.removeEventListener('message', onMessage);
      };

      const onAbort = () => {
        worker.postMessage({ id, type: 'cancel' });
        // Terminate and recreate shared worker on hard cancellation to instantly drop compute
        try {
          worker.terminate();
          sharedWorker = null;
        } catch {
          // ignore
        }
        cleanup();
        reject(new Error('Simulation cancelled by user'));
      };

      if (options?.abortSignal) {
        if (options.abortSignal.aborted) {
          return reject(new Error('Simulation cancelled by user'));
        }
        options.abortSignal.addEventListener('abort', onAbort);
      }

      const onMessage = (event: MessageEvent<WorkerShadingResponse>) => {
        const msg = event.data;
        if (!msg || msg.id !== id) return;

        if (msg.type === 'progress') {
          options?.onProgress?.(msg.progressPct, msg.currentDay, msg.totalDays);
        } else if (msg.type === 'complete') {
          cleanup();
          resolve(msg.result);
        } else if (msg.type === 'aborted') {
          cleanup();
          reject(new Error('Simulation cancelled by user'));
        } else if (msg.type === 'error') {
          cleanup();
          reject(new Error(msg.error));
        }
      };

      worker.addEventListener('message', onMessage);

      // Send simulation request to worker
      worker.postMessage({
        id,
        type: 'simulate',
        scene,
        peakSunHours,
        ambientTempMaxC,
        options: {
          simulationMode: options?.simulationMode,
          stepDays: options?.stepDays,
          albedo: options?.albedo,
        },
      });
    });
  }

  // Graceful fallback for Node.js / SSR / unsupported worker environments:
  return new Promise<AnnualShading3dResult>((resolve, reject) => {
    try {
      if (options?.abortSignal?.aborted) {
        return reject(new Error('Simulation cancelled by user'));
      }
      const result = simulateAnnual3dShading(scene, peakSunHours, ambientTempMaxC, options);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  });
}
