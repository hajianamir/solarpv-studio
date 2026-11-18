/** pvlib-python 0.13.1 coverage_nrel + dc_loss_nrel, roof/reference variant.
 * Marion 2013 DOI 10.1016/j.solener.2013.07.029; Ryberg/Freeman 2017,
 * NREL/TP-6A20-68705; string-loss assumption: NREL/TP-6A20-67399 Eq 11.8.
 * Ground depth reset is the pvlib/SAM refinement, NOT the legacy exponential law.
 * No structural loads, synthetic weather, default site parameters, or annual yield.
 */
import { checkSnowInput, type SnowRequest } from '../../referenceModels/snowInput';
export type { SnowRequest } from '../../referenceModels/snowInput';
export function calculateSnowSeries(input: SnowRequest) {
  const checked = checkSnowInput(input);
  const metadata = {
    modelId: 'snow_pvlib_nrel_0131_roof', modelVersion: '1.0.0',
    referenceSoftware: 'pvlib-python 0.13.1', validationStatus: 'not_field_validated',
    units: { coverage: 'fraction of row slant height', loss: 'fraction of DC capacity', snowfall: 'cm/interval', depth: 'cm', poa: 'W/m2' },
    limitations: 'Roof/reference coefficients only; string partly covered means string capacity lost; complete regular data required; no structural or annual energy result',
  };
  if (!checked.ok) return { ...metadata, status: 'missing_or_unsupported' as const, quality: 'missing', reason: checked.reason, samples: null, appliedParameters: null, period: null };
  const p = input.parameters;
  const samples: { timestamp: string; coverageFraction: number; dcCapacityLossFraction: number }[] = [];
  let coverage = p.initialCoverageFraction;
  let first = true;
  for (const step of input.steps) {
    const newSnow = step.snowfallCm! / checked.stepHours > p.snowfallThresholdCmPerHour && step.groundSnowDepthCm! >= p.groundDepthThresholdCm;
    if (newSnow) coverage = 1;
    let slide = 0;
    if (!first && !newSnow && step.ambientTempC! > step.poaWm2! / p.canSlideCoefficientWm2PerC) {
      slide = p.slideAmountCoefficientPerHour * Math.sin(p.tiltDeg * Math.PI / 180) * checked.stepHours;
    }
    // Explicit pvlib refinement also overrides first-interval and tilt=0 behavior.
    if (step.groundSnowDepthCm! < p.groundDepthThresholdCm) coverage = 0;
    coverage = Math.max(0, coverage - slide);
    first = false;
    const loss = Math.ceil(coverage * p.parallelStringsAlongSlant) / p.parallelStringsAlongSlant;
    samples.push({ timestamp: step.timestamp, coverageFraction: coverage, dcCapacityLossFraction: loss });
  }
  return {
    ...metadata, status: 'computed' as const, quality: input.weatherQuality,
    parameterQuality: input.parameterQuality, timezone: input.timezone, mounting: input.mounting,
    period: { start: input.steps[0].timestamp, end: input.steps.at(-1)!.timestamp },
    appliedParameters: { ...p }, samples,
  };
}
