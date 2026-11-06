import type { Scene3DState } from './roof3dShadingEngine';

// Lifecycle state and pure reducer for 3D representative block shading input
//
// DISCLAIMER / METHODOLOGY LIMITATION:
// The 3D scene simulates a representative 55.2 kWp rooftop/ground array section with localized
// obstructions (e.g. HVAC, parapets, chimneys). Applying this geometric shading factor project-wide
// is an indicative engineering screening proxy. Full utility/C&I plant shading requires exhaustive
// multi-row terrain or full-layout CAD ray tracing.

export interface ShadingAnalysisMetadata {
  inputSignature: string;
  engineVersion: string;
  calculatedAt: string;
  status: 'valid' | 'stale' | 'failed';
}

export interface AppliedShading3dRecord {
  lossPct: number;
  source: 'representative_demo_block' | 'project_array_design';
  appliedAtIso: string;
  capacityKwp: number;
  signatureHash?: string;
  simulationMode?: 'hourly_8760' | 'screening_3day';
  metadata?: ShadingAnalysisMetadata;
}

export interface ShadingLifecycleState {
  appliedShading: AppliedShading3dRecord | null;
  appliedCityId?: string;
  appliedCapacityKwp?: number;
  appliedSignatureHash?: string;
  appliedSimulationMode?: 'hourly_8760' | 'screening_3day';
  isStale?: boolean;
  staleReason?: string;
}

/** Pure deterministic 64-bit FNV-1a hex hasher */
function fnv1a64Hex(str: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x84222325;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code;
    h2 = Math.imul(h2, 0x5bd1e995);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

export interface ShadingSignatureParams {
  capacityKwp?: number;
  tiltDeg?: number;
  azimuthDeg?: number;
  pitchM?: number;
  cityId?: string;
  peakSunHours?: number;
  obstaclesCount?: number;
  scene?: Scene3DState;
  engineVersion?: string;
  albedo?: number;
  simulationMode?: 'hourly_8760' | 'screening_3day';
}

/**
 * Computes a canonical, deterministic signature hash of the 3D scene geometry,
 * layout topology, and site parameters.
 */
export function computeShadingSceneSignature(params: ShadingSignatureParams): string {
  const engineVersion = params.engineVersion ?? '3.1.0-remediated';

  if (params.scene) {
    const s = params.scene;
    const anchor = s.anchorLocation
      ? {
          lat: Number((s.anchorLocation.latitude ?? 0).toFixed(4)),
          lng: Number((s.anchorLocation.longitude ?? 0).toFixed(4)),
          elev: Number((s.anchorLocation.elevationM ?? 0).toFixed(1)),
        }
      : null;

    const albedoVal =
      params.albedo !== undefined
        ? params.albedo
        : s.albedo !== undefined
          ? s.albedo
          : 0.20;

    const roof = (s.roofPlanes || []).map((r) => ({
      id: r.id,
      eaves: r.eavesHeightM,
      tilt: r.tiltDeg,
      az: r.azimuthDeg,
      poly: r.polygonEnu,
    }));
    const tables = (s.pvTables || [])
      .map((t) => ({
        id: t.id,
        x: Number((t.positionEnu.x || 0).toFixed(2)),
        y: Number((t.positionEnu.y || 0).toFixed(2)),
        z: Number((t.positionEnu.z || 0).toFixed(2)),
        w: Number((t.widthM || 0).toFixed(2)),
        l: Number((t.slopedLengthM || 0).toFixed(2)),
        tilt: Number((t.tiltDeg || 0).toFixed(1)),
        az: Number((t.azimuthDeg || 0).toFixed(1)),
        mod: t.moduleCount,
        wp: t.ratedPowerWp,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    const obstacles = (s.obstacles || [])
      .map((o) => ({
        id: o.id,
        type: o.geometryType,
        x: Number((o.positionEnu.x || 0).toFixed(2)),
        y: Number((o.positionEnu.y || 0).toFixed(2)),
        z: Number((o.positionEnu.z || 0).toFixed(2)),
        w: o.dimensionsM?.widthM ? Number(o.dimensionsM.widthM.toFixed(2)) : null,
        l: o.dimensionsM?.lengthM ? Number(o.dimensionsM.lengthM.toFixed(2)) : null,
        h: o.dimensionsM?.heightM ? Number(o.dimensionsM.heightM.toFixed(2)) : null,
        r: o.dimensionsM?.radiusM ? Number(o.dimensionsM.radiusM.toFixed(2)) : null,
        rot: o.rotationDeg ? Number(o.rotationDeg.toFixed(1)) : 0,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    const canonicalObj = {
      engineVersion,
      cityId: params.cityId || 'default',
      anchor,
      albedo: albedoVal !== null && albedoVal !== undefined ? Number(Number(albedoVal).toFixed(2)) : null,
      simMode: params.simulationMode ?? null,
      psh: params.peakSunHours ? Number(params.peakSunHours.toFixed(2)) : null,
      cap: Number(((s.totalPvCapacityKwp ?? params.capacityKwp) || 0).toFixed(2)),
      modCount: s.totalModulesCount ?? null,
      tilt: Number(((s.tiltDeg ?? params.tiltDeg) || 0).toFixed(1)),
      az: Number(((s.azimuthDeg ?? params.azimuthDeg) || 0).toFixed(1)),
      pitch: Number(((s.interRowSpacingM ?? params.pitchM) || 0).toFixed(2)),
      env: s.installationEnvironment || 'rooftop',
      roof,
      tables,
      obstacles,
    };

    return fnv1a64Hex(JSON.stringify(canonicalObj));
  }

  // Legacy fallback if full scene object is not provided
  const cap = (params.capacityKwp || 0).toFixed(1);
  const tilt = (params.tiltDeg ?? 25).toFixed(1);
  const az = (params.azimuthDeg ?? 0).toFixed(1);
  const pitch = (params.pitchM ?? 5.0).toFixed(1);
  const city = params.cityId || 'default';
  const obs = params.obstaclesCount ?? 0;
  return `cap:${cap}|tilt:${tilt}|az:${az}|pitch:${pitch}|city:${city}|obs:${obs}|v:${engineVersion}`;
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
      simulationMode?: 'hourly_8760' | 'screening_3day';
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
          simulationMode: action.simulationMode,
        },
        appliedCityId: action.cityId,
        appliedCapacityKwp: action.projectCapacityKwp ?? action.capacityKwp,
        appliedSignatureHash: action.signatureHash,
        appliedSimulationMode: action.simulationMode,
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

      let staleReason: string | undefined;
      if (signatureChanged) {
        staleReason = 'Scene geometry, obstacles, or layout parameters changed since analysis was applied';
      } else if (capacityChanged) {
        staleReason = 'Project capacity changed by > 5% since analysis was applied';
      }

      return {
        ...state,
        isStale: capacityChanged || signatureChanged,
        staleReason: capacityChanged || signatureChanged ? staleReason : undefined,
      };
    }
    default:
      return state;
  }
}
