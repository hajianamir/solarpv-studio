import type {CableRunConfig} from '../engine/protectionBomEngine';

/** Fail invalid scalar input before the numerical candidate search. */
export function validateCableInputs(config: CableRunConfig): void {
  for (const [name, value] of Object.entries({length: config.oneWayLengthM, current: config.designCurrentAmps, voltage: config.nominalVoltageVolts, dropLimit: config.allowableDropPct})) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError(`Invalid cable ${name}`);
  }
  if (config.ambientTempC !== undefined && (!Number.isFinite(config.ambientTempC) || config.ambientTempC >= (config.insulationType === 'xlpe' ? 90 : 70))) throw new RangeError('Ambient temperature must be finite and below insulation conductor limit; ampacity unavailable');
  if (config.nominalVoltageVolts === 0 || config.allowableDropPct === 0) throw new RangeError('Cable voltage and drop limit must be positive');
  if (config.powerFactor !== undefined && (!Number.isFinite(config.powerFactor) || config.powerFactor < 0 || config.powerFactor > 1)) throw new RangeError('Cable lagging PF must be within [0,1]');
  if (config.equivalentReactanceOhmPerM !== undefined && (!Number.isFinite(config.equivalentReactanceOhmPerM) || config.equivalentReactanceOhmPerM < 0)) throw new RangeError('Equivalent cable reactance must be finite and nonnegative');
}

/** Presence of explicit impedance evidence, not external verification of its truth. */
export function hasCableImpedanceEvidence(config: CableRunConfig): boolean {
  return config.isDc || (config.parallelArrangement === 'equal_length_equal_sharing' && config.equivalentReactanceOhmPerM !== undefined && Boolean(config.impedanceSource?.trim()));
}
