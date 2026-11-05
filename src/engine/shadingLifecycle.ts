// Lifecycle state and pure reducer for 3D representative block shading input
//
// DISCLAIMER / METHODOLOGY LIMITATION:
// The 3D scene simulates a representative 55.2 kWp rooftop/ground array section with localized
// obstructions (e.g. HVAC, parapets, chimneys). Applying this geometric shading factor project-wide
// is an indicative engineering screening proxy. Full utility/C&I plant shading requires exhaustive
// multi-row terrain or full-layout CAD ray tracing.

export interface AppliedShading3dRecord {
  lossPct: number;
  source: 'representative_demo_block';
  appliedAtIso: string;
  capacityKwp: number;
}

export interface ShadingLifecycleState {
  appliedShading: AppliedShading3dRecord | null;
  appliedCityId?: string;
  appliedCapacityKwp?: number;
  isStale?: boolean;
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
    }
  | { type: 'REVERT' }
  | { type: 'RESET' }
  | { type: 'CHECK_SYNC'; currentCityId?: string; currentCapacityKwp?: number };

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
          source: 'representative_demo_block',
          appliedAtIso: action.appliedAtIso || new Date().toISOString(),
          capacityKwp: action.capacityKwp,
        },
        appliedCityId: action.cityId,
        appliedCapacityKwp: action.projectCapacityKwp ?? action.capacityKwp,
        isStale: false,
      };
    }
    case 'REVERT':
    case 'RESET': {
      return {
        appliedShading: null,
        appliedCityId: undefined,
        appliedCapacityKwp: undefined,
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

      return {
        ...state,
        isStale: capacityChanged,
      };
    }
    default:
      return state;
  }
}
