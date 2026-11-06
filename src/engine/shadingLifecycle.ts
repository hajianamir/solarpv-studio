// Lifecycle state and pure reducer for 3D representative block shading input
//
// DISCLAIMER / METHODOLOGY LIMITATION:
// The 3D scene simulates a representative 55.2 kWp rooftop/ground array section with localized
// obstructions (e.g. HVAC, parapets, chimneys). Applying this geometric shading factor project-wide
// is an indicative engineering screening proxy. Full utility/C&I plant shading requires exhaustive
// multi-row terrain or full-layout CAD ray tracing.

export interface AppliedShading3dRecord {
  lossPct: number;
  source: 'representative_demo_block' | 'project_array_design';
  appliedAtIso: string;
  capacityKwp: number;
  signatureHash?: string;
}

export interface ShadingLifecycleState {
  appliedShading: AppliedShading3dRecord | null;
  appliedCityId?: string;
  appliedCapacityKwp?: number;
  appliedSignatureHash?: string;
  isStale?: boolean;
}

export function computeShadingSceneSignature(params: {
  capacityKwp: number;
  tiltDeg?: number;
  azimuthDeg?: number;
  pitchM?: number;
  cityId?: string;
  obstaclesCount?: number;
}): string {
  const cap = (params.capacityKwp || 0).toFixed(1);
  const tilt = (params.tiltDeg ?? 25).toFixed(1);
  const az = (params.azimuthDeg ?? 0).toFixed(1);
  const pitch = (params.pitchM ?? 5.0).toFixed(1);
  const city = params.cityId || 'default';
  const obs = params.obstaclesCount ?? 0;
  return `cap:${cap}|tilt:${tilt}|az:${az}|pitch:${pitch}|city:${city}|obs:${obs}`;
}

export function createInitialShadingLifecycleState(): ShadingLifecycleState {
  return {
    appliedShading: null,
    isStale: false,
  };
}

export type ShadingLifecycleAction =
  | {
      type: 'APPLY';
      lossPct: number;
      capacityKwp: number;
      projectCapacityKwp: number;
      appliedAtIso?: string;
      cityId?: string;
      source?: 'representative_demo_block' | 'project_array_design';
      signatureHash?: string;
    }
  | { type: 'REVERT' }
  | { type: 'RESET' }
  | {
      type: 'CHECK_SYNC';
      currentCityId?: string;
      currentCapacityKwp?: number;
      currentSignatureHash?: string;
    };

/**
 * Pure state reducer governing the apply / revert / reset lifecycle of 3D near-shading.
 */
export function shadingLifecycleReducer(
  state: ShadingLifecycleState,
  action: ShadingLifecycleAction
): ShadingLifecycleState {
  switch (action.type) {
    case 'APPLY': {
      if (action.projectCapacityKwp === undefined) {
        console.warn(
          '[shadingLifecycle] projectCapacityKwp was omitted from APPLY action. Falling back to capacityKwp (demo block size); this may cause capacity drift staleness if project capacity differs.'
        );
      }
      return {
        appliedShading: {
          lossPct: action.lossPct,
          source: action.source ?? 'representative_demo_block',
          appliedAtIso: action.appliedAtIso || new Date().toISOString(),
          capacityKwp: action.capacityKwp,
          signatureHash: action.signatureHash,
        },
        appliedCityId: action.cityId,
        appliedCapacityKwp: action.projectCapacityKwp ?? action.capacityKwp,
        appliedSignatureHash: action.signatureHash,
        isStale: false,
      };
    }
    case 'REVERT':
    case 'RESET': {
      return {
        appliedShading: null,
        appliedCityId: undefined,
        appliedCapacityKwp: undefined,
        appliedSignatureHash: undefined,
        isStale: false,
      };
    }
    case 'CHECK_SYNC': {
      if (!state.appliedShading) return state;
      const cityChanged = Boolean(
        action.currentCityId && state.appliedCityId && action.currentCityId !== state.appliedCityId
      );
      if (cityChanged) {
        // Project location changed: reset applied shading to avoid cross-project contamination
        return {
          appliedShading: null,
          appliedCityId: undefined,
          appliedCapacityKwp: undefined,
          appliedSignatureHash: undefined,
          isStale: false,
        };
      }

      // Check if project capacity changed by > 5% since 3D shading was applied
      const capacityChanged = Boolean(
        action.currentCapacityKwp !== undefined &&
          state.appliedCapacityKwp !== undefined &&
          Math.abs(action.currentCapacityKwp - state.appliedCapacityKwp) /
            Math.max(1, state.appliedCapacityKwp) >
            0.05
      );

      // Check if input parameter signature changed
      const signatureChanged = Boolean(
        action.currentSignatureHash &&
          state.appliedSignatureHash &&
          action.currentSignatureHash !== state.appliedSignatureHash
      );

      return {
        ...state,
        isStale: capacityChanged || signatureChanged,
      };
    }
    default:
      return state;
  }
}
