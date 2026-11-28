/** Input validation only: no rainfall reconstruction or physical loss calculation. */
export type ModelInputQuality = 'measured' | 'weather_provider' | 'user_configured' | 'assumed';
export interface KimberParameters {
  cleaningThresholdMm: number;
  lossRatePerDay: number;
  gracePeriodDays: number;
  maxLossFraction: number;
  initialLossFraction: number;
  rainAccumulationHours: number;
}
export interface KimberRequest {
  /** ISO timestamps with explicit UTC offset; every sample is an interval end. */
  steps: { timestamp: string; rainfallMm: number | null; unsoiledEnergyWh?: number | null }[];
  timezone: string;
  weatherQuality: ModelInputQuality;
  parameterQuality: ModelInputQuality;
  parameters: KimberParameters;
  /** Exact sample timestamps, not an inferred wash frequency. */
  manualWashTimestamps: string[];
}
export function checkKimberInput(input: KimberRequest):
  | { ok: false; reason: string }
  | { ok: true; timeHours: number[]; stepDays: number; energyComplete: boolean } {
  if (!input || !Array.isArray(input.steps) || input.steps.length < 2) return { ok: false, reason: 'At least two timestamped rainfall samples are required' };
  try { new Intl.DateTimeFormat('en', { timeZone: input.timezone }).format(); }
  catch { return { ok: false, reason: 'An explicit valid IANA timezone is required' }; }
  if (!input.timezone) return { ok: false, reason: 'Timezone is required' };
  const qualities = ['measured', 'weather_provider', 'user_configured', 'assumed'];
  if (!qualities.includes(input.weatherQuality) || !qualities.includes(input.parameterQuality)) return { ok: false, reason: 'Weather and parameter provenance are required' };
  const p = input.parameters;
  if (!p || !Object.values(p).every(Number.isFinite) ||
    !['cleaningThresholdMm', 'lossRatePerDay', 'gracePeriodDays', 'maxLossFraction', 'initialLossFraction', 'rainAccumulationHours'].every(k => Number.isFinite(p[k as keyof KimberParameters])) ||
    p.cleaningThresholdMm < 0 || p.lossRatePerDay < 0 || p.gracePeriodDays <= 0 || p.maxLossFraction < 0 || p.maxLossFraction > 1 ||
    p.initialLossFraction < 0 || p.initialLossFraction > p.maxLossFraction || p.rainAccumulationHours <= 0) {
    return { ok: false, reason: 'Explicit finite physical parameters required; grace and rain window must be positive' };
  }
  const times: number[] = [];
  let energyComplete = true;
  for (const step of input.steps) {
    if (!step || typeof step.timestamp !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(Z|[+-]\d{2}:\d{2})$/.test(step.timestamp) || !Number.isFinite(Date.parse(step.timestamp))) return { ok: false, reason: 'Every timestamp needs an explicit UTC offset' };
    const year = Number(step.timestamp.slice(0, 4));
    const month = Number(step.timestamp.slice(5, 7));
    const day = Number(step.timestamp.slice(8, 10));
    if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate() || Number(step.timestamp.slice(11, 13)) > 23) return { ok: false, reason: 'Invalid calendar timestamp' };
    if (step.rainfallMm === null || !Number.isFinite(step.rainfallMm) || step.rainfallMm < 0) return { ok: false, reason: 'Missing/invalid rainfall; no dry-weather substitution is permitted' };
    if (step.unsoiledEnergyWh === null || step.unsoiledEnergyWh === undefined) energyComplete = false;
    else if (!Number.isFinite(step.unsoiledEnergyWh) || step.unsoiledEnergyWh < 0) return { ok: false, reason: 'Invalid unsoiled energy weight' };
    times.push(Date.parse(step.timestamp) / 3600000);
  }
  const interval = times[1] - times[0];
  if (interval <= 0 || interval > 24 || !times.slice(1).every((t, i) => Math.abs(t - times[i] - interval) < 1e-9)) return { ok: false, reason: 'Require regular increasing intervals up to 24 hours; gaps/DST interval changes unsupported' };
  const timestamps = new Set(input.steps.map(s => s.timestamp));
  if (!Array.isArray(input.manualWashTimestamps) || !input.manualWashTimestamps.every(t => timestamps.has(t))) return { ok: false, reason: 'Manual wash timestamps must exactly match samples' };
  return { ok: true, timeHours: times, stepDays: interval / 24, energyComplete };
}
