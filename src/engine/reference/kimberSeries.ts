/**
 * Kimber time-series algorithm, explicitly matched to pvlib-python 0.13.1.
 * Reference: pvlib/soiling.py@v0.13.1, kimber; Kimber et al. (2006),
 * DOI 10.1109/WCPEC.2006.279690. Software equivalence is NOT field validation.
 * Rain/grace windows: (t-window,t]; strict rain > threshold; first sample is
 * initial loss. Positive grace only; regular complete rainfall, <=24 h steps.
 * This API never generates weather and is NOT automatically wired to waterfall.
 */
import { checkKimberInput, type KimberRequest } from '../../referenceModels/kimberInput';
export type { KimberRequest, KimberParameters } from '../../referenceModels/kimberInput';
export function calculateKimberSeries(input: KimberRequest) {
  const checked = checkKimberInput(input);
  const metadata = {
    modelId: 'soiling_kimber_pvlib_0131', modelVersion: '1.0.0',
    referenceSoftware: 'pvlib-python 0.13.1', validationStatus: 'not_field_validated',
    units: { loss: 'fraction', rainfall: 'mm/interval', energy: 'Wh' },
    limitations: 'Site parameters required; positive grace; regular intervals; no missing-rain inference; no annual claim without a full-year energy series',
  };
  if (!checked.ok) return { ...metadata, status: 'missing_or_unsupported' as const, quality: 'missing', reason: checked.reason, period: null, appliedParameters: null, parameterQuality: 'missing', timezone: input?.timezone ?? null, samples: null, energyWeightedLossFraction: null };
  const p = input.parameters;
  const samples: { timestamp: string; lossFraction: number }[] = [];
  let rawLoss = p.initialLossFraction;
  let lastRainTime: number | null = null;
  let first = true;
  let weightedLoss = 0;
  let totalEnergy = 0;
  for (const [index, step] of input.steps.entries()) {
    const now = checked.timeHours[index];
    let accumulatedRain = 0;
    for (const [previousIndex, previous] of input.steps.entries()) {
      const time = checked.timeHours[previousIndex];
      if (time > now - p.rainAccumulationHours && time <= now) accumulatedRain += previous.rainfallMm!;
    }
    if (!first) rawLoss += p.lossRatePerDay * checked.stepDays;
    first = false;
    if (accumulatedRain > p.cleaningThresholdMm) lastRainTime = now;
    const inGrace = lastRainTime !== null && now - lastRainTime < p.gracePeriodDays * 24;
    if (inGrace || input.manualWashTimestamps.includes(step.timestamp)) rawLoss = 0;
    const lossFraction = Math.min(rawLoss, p.maxLossFraction);
    samples.push({ timestamp: step.timestamp, lossFraction });
    if (checked.energyComplete) {
      weightedLoss += lossFraction * step.unsoiledEnergyWh!;
      totalEnergy += step.unsoiledEnergyWh!;
    }
  }
  return {
    ...metadata, status: 'computed' as const, quality: input.weatherQuality,
    parameterQuality: input.parameterQuality, timezone: input.timezone,
    period: { start: input.steps[0].timestamp, end: input.steps.at(-1)!.timestamp },
    appliedParameters: { ...p }, samples,
    energyWeightedLossFraction: checked.energyComplete && totalEnergy > 0 ? weightedLoss / totalEnergy : null,
    energyQuality: checked.energyComplete && totalEnergy > 0 ? 'provided_complete' : 'missing_or_zero_weight',
  };
}
