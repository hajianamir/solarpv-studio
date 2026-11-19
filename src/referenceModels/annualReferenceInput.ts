import type { KimberRequest, ModelInputQuality } from './kimberInput';
import type { SnowRequest } from './snowInput';
/** Opt-in only. Energy is clean/snow-free DC energy per interval, before either loss. */
export interface AnnualReferenceInput {
  schemaVersion: 1;
  year: number;
  site: { latitude: number; longitude: number };
  energyQuality: ModelInputQuality;
  energySource: string;
  energy: { timestamp: string; cleanDcEnergyWh: number | null }[];
  soiling?: KimberRequest;
  snow?: SnowRequest;
}

export interface ReferenceContext {hasTracker?:boolean;tiltDeg?:number;installationEnvironment?:string}

/** Validate the written local calendar before Date.parse converts the explicit offset to UTC.
 * Never let the host's timezone interpret an offset-free energy timestamp.
 * Leap seconds and 24:00 notation are deliberately unsupported, as in the weather APIs.
 */
function hasExplicitEnergyOffset(timestamp: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(timestamp)) return false;
  if (!Number.isFinite(Date.parse(timestamp))) return false;
  const date = timestamp.slice(0, 10);
  const calendar = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(calendar.getTime()) && calendar.toISOString().slice(0, 10) === date;
}

export function checkAnnualReferenceInput(input: AnnualReferenceInput, site?:{latitude:number;longitude:number}, context?:ReferenceContext) {
  const invalid=(reason:string)=>({ok:false as const,reason});
  if (!input || input.schemaVersion !== 1 || !Number.isInteger(input.year) || input.year < 1900 || input.year > 2200 || !input.site ||
    !Number.isFinite(input.site.latitude) || !Number.isFinite(input.site.longitude) || Math.abs(input.site.latitude)>90 || Math.abs(input.site.longitude)>180 ||
    (site && (site.latitude !== input.site.latitude || site.longitude !== input.site.longitude))) return invalid('Invalid schema/year/site or coordinates differ from active site');
  if (!['measured','weather_provider','user_configured','assumed'].includes(input.energyQuality) || typeof input.energySource !== 'string' || !input.energySource.trim()) return invalid('Explicit energy provenance required');
  if (!Array.isArray(input.energy) || input.energy.length<2 || (!input.soiling && !input.snow)) return invalid('Complete annual energy series and at least one model required');
  const energy = input.energy;
  if (!energy.every(s=>s && typeof s.timestamp==='string' && typeof s.cleanDcEnergyWh==='number' && Number.isFinite(s.cleanDcEnergyWh) && s.cleanDcEnergyWh>=0)) return invalid('Missing or invalid clean DC energy; no zero substitution');
  if (!energy.every(s=>hasExplicitEnergyOffset(s.timestamp))) return invalid('Every energy timestamp requires a valid ISO calendar timestamp with explicit Z or UTC offset');
  // Date.parse is host-timezone independent only after the explicit-offset check above.
  const times=energy.map(s=>Date.parse(s.timestamp));
  const dt=times[1]-times[0];
  if (!Number.isFinite(dt) || dt<=0 || dt>86400000 || times[0]-dt!==Date.UTC(input.year,0,1) || times.at(-1)!==Date.UTC(input.year+1,0,1) || !times.slice(1).every((t,i)=>t-times[i]===dt)) return invalid('Require one complete UTC calendar year of regular interval-end energy samples, without gaps');
  const aligned=(steps:{timestamp:string}[])=>Array.isArray(steps)&&steps.length===energy.length&&steps.every((s,i)=>s?.timestamp===energy[i].timestamp);
  if ((input.soiling&&!aligned(input.soiling.steps))||(input.snow&&!aligned(input.snow.steps))) return invalid('Weather and energy timestamps must match exactly');
  if (input.snow && context?.hasTracker) return invalid('Fixed-tilt snow reference cannot be applied to active tracking');
  if (input.snow && context?.tiltDeg !== undefined && input.snow.parameters?.tiltDeg !== context.tiltDeg) return invalid('Snow tilt differs from active array tilt');
  if (input.snow && context?.installationEnvironment !== undefined && !['industrial_shed','rooftop_flat_concrete'].includes(context.installationEnvironment)) return invalid('Roof/reference snow variant cannot be applied to active ground mounting');
  return {ok:true as const, energy, dt};
}
