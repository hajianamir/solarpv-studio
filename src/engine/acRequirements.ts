import type { InverterSpecs } from './pvEngineAdvanced';

export type AcPhase = 'single' | 'three' | 'unknown';
export type AcNetworkLevel = 'not_applicable' | 'lv' | 'mv' | 'hv' | 'unknown';

/** User-confirmed electrical interface data. `null` means not supplied, never inferred. */
export interface AcConnectionRequirement {
  phase: AcPhase;
  lineToLineVolts: number | null;
  lineToNeutralVolts: number | null;
  frequencyHz: number | null;
  /** Required for real-power to current conversion; unknown is not defaulted to 0.95. */
  powerFactor: number | null;
  /** Prospective fault level and clearing time at this interface, from a declared study/source. */
  availableFaultCurrentKa: number | null;
  faultClearingTimeSec: number | null;
  confirmed: boolean;
}

export interface AcRequirements {
  /** Customer installation / load service; independent from inverter and utility. */
  loadService: AcConnectionRequirement;
  /** Inverter's AC terminals (model data and user confirmation are separate). */
  inverterOutput: AcConnectionRequirement;
  /** Local low-voltage utility interface, when present. */
  lvGrid: AcConnectionRequirement;
  /** Export interface after step-up transformer. */
  injection: { level: AcNetworkLevel; nominalKv: number | null; confirmed: boolean };
  /** Self-attested equipment nameplate source; source URL is not authenticated by the app. */
  inverterNameplate: { nominalFrequencyHz: number | null; sourceUrl: string; userConfirmed: boolean };
  /** Optional per-load overrides keyed by stable load id, not inferred from category. */
  loadOverrides: Record<string, AcConnectionRequirement>;
}

const emptyConnection = (): AcConnectionRequirement => ({
  phase: 'unknown', lineToLineVolts: null, lineToNeutralVolts: null, frequencyHz: null,
  powerFactor: null, availableFaultCurrentKa: null, faultClearingTimeSec: null, confirmed: false,
});

export function createUnknownAcRequirements(): AcRequirements {
  return {
    loadService: emptyConnection(), inverterOutput: emptyConnection(), lvGrid: emptyConnection(),
    injection: { level: 'unknown', nominalKv: null, confirmed: false },
    inverterNameplate: { nominalFrequencyHz: null, sourceUrl: '', userConfirmed: false },
    loadOverrides: {},
  };
}

export interface AcRequirementAssessment {
  status: 'incomplete' | 'compatible' | 'incompatible';
  reasons: string[];
}

/** Checks only explicitly supplied/confirmed interfaces; it is not a protection study. */
export function assessAcRequirements(
  requirements: AcRequirements | null | undefined,
  inverter?: Pick<InverterSpecs, 'isThreePhase' | 'acVoltageVac'> | null,
  mode?: 'powerplant' | 'ongrid' | 'offgrid',
): AcRequirementAssessment {
  if (!requirements) return { status: 'incomplete', reasons: ['AC requirements are not specified; confirm the local service and grid requirements.'] };
  const reasons: string[] = [];
  const completeConnection = (connection: AcConnectionRequirement, requirePowerFactor = false) => connection.confirmed
    && isValidAcConnection(connection)
    && connection.phase !== 'unknown' && connection.frequencyHz !== null
    && (connection.lineToLineVolts !== null || connection.lineToNeutralVolts !== null)
    && (!requirePowerFactor || (connection.powerFactor !== null && connection.powerFactor > 0 && connection.powerFactor <= 1
      && connection.availableFaultCurrentKa !== null && connection.availableFaultCurrentKa > 0
      && connection.faultClearingTimeSec !== null && connection.faultClearingTimeSec > 0));
  if (!completeConnection(requirements.loadService)) reasons.push('Site load-service phase/voltage/frequency is incomplete or unconfirmed.');
  if (mode === 'ongrid' && !completeConnection(requirements.lvGrid)) reasons.push('LV grid interface is incomplete or unconfirmed; do not substitute the load service or inverter interface.');
  const required = requirements.inverterOutput;
  if (!completeConnection(required, true)) {
    reasons.push('Inverter AC interface requirement is incomplete or unconfirmed; protection sizing also requires declared prospective fault current and clearing time.');
  } else if (!requirements.inverterNameplate.userConfirmed || !requirements.inverterNameplate.sourceUrl.startsWith('https://') || requirements.inverterNameplate.nominalFrequencyHz === null) {
    reasons.push('Selected inverter nameplate phase/voltage/frequency has not been checked against a user-provided HTTPS manufacturer datasheet reference.');
  } else if (inverter) {
    const inverterPhase = inverter.isThreePhase ? 'three' : 'single';
    if (required.phase === 'three' && required.lineToLineVolts === null) reasons.push('Confirmed three-phase inverter output requires line-to-line voltage to compare the selected inverter.');
    if (required.frequencyHz !== requirements.inverterNameplate.nominalFrequencyHz) reasons.push(`Confirmed inverter frequency (${requirements.inverterNameplate.nominalFrequencyHz} Hz) does not match AC output requirement (${required.frequencyHz} Hz).`);
    if (required.phase !== inverterPhase) reasons.push(`Selected inverter phase (${inverterPhase}) does not match confirmed output requirement (${required.phase}).`);
    const catalogComparisonVoltage = required.phase === 'three'
      ? required.lineToLineVolts
      : (required.lineToNeutralVolts ?? required.lineToLineVolts);
    if (inverter.acVoltageVac !== undefined && catalogComparisonVoltage !== null && Math.abs(inverter.acVoltageVac - catalogComparisonVoltage) > Math.max(1, catalogComparisonVoltage * 0.01)) {
      reasons.push(`Catalog inverter voltage (${inverter.acVoltageVac} V) does not match the confirmed applicable phase voltage (${catalogComparisonVoltage} V).`);
    }
  }
  const injection = requirements.injection;
  if (injection.level === 'unknown' || !injection.confirmed || (injection.level !== 'not_applicable' && injection.nominalKv === null)) {
    reasons.push('Grid-injection voltage level is not confirmed; LV service must not be treated as MV/HV injection.');
  } else if (mode === 'powerplant' && injection.level !== 'mv' && injection.level !== 'hv') {
    reasons.push('Powerplant injection requires an explicitly declared MV/HV point of connection; LV is not equivalent.');
  } else if (mode === 'offgrid' && injection.level !== 'not_applicable') {
    reasons.push('Off-grid mode must explicitly declare grid injection as not applicable.');
  } else if (mode === 'ongrid' && injection.level !== 'not_applicable') {
    reasons.push('On-grid LV service and post-transformer MV/HV injection are distinct; declare injection not applicable if no export interface exists.');
  }
  return {
    status: reasons.some((reason) => reason.includes('does not match')) ? 'incompatible' : reasons.length ? 'incomplete' : 'compatible',
    reasons,
  };
}

export function updateAcConnection(
  current: AcRequirements | null,
  target: 'loadService' | 'inverterOutput' | 'lvGrid' | `load:${string}`,
  patch: Partial<AcConnectionRequirement>,
): AcRequirements {
  const base = current ?? createUnknownAcRequirements();
  if (target.startsWith('load:')) {
    const loadId = target.slice(5);
    const prior = base.loadOverrides[loadId] ?? emptyConnection();
    const update = { ...patch, ...(patch.confirmed !== undefined ? {} : { confirmed: false }) };
    return { ...base, loadOverrides: { ...base.loadOverrides, [loadId]: { ...prior, ...update } } };
  }
  const connectionKey = target as 'loadService' | 'inverterOutput' | 'lvGrid';
  const update = { ...patch, ...(patch.confirmed !== undefined ? {} : { confirmed: false }) };
  return { ...base, [connectionKey]: { ...base[connectionKey], ...update } };
}

export function isValidAcConnection(value: AcConnectionRequirement): boolean {
  const positiveOrNull = (n: number | null) => n === null || (Number.isFinite(n) && n > 0);
  return positiveOrNull(value.lineToLineVolts) && positiveOrNull(value.lineToNeutralVolts)
    && positiveOrNull(value.frequencyHz)
    && (value.powerFactor === null || (Number.isFinite(value.powerFactor) && value.powerFactor > 0 && value.powerFactor <= 1))
    && positiveOrNull(value.availableFaultCurrentKa) && positiveOrNull(value.faultClearingTimeSec);
}

export interface LoadAcCurrentResult {
  id: string;
  name: string;
  phase: AcPhase;
  voltageVolts: number | null;
  currentAmps: number | null;
  status: 'assessed' | 'incomplete' | 'dc_not_applicable';
  basis: 'per_load_override' | 'site_load_service' | 'none';
}

/** Active AC load currents from explicit connection requirements; no class/category phase inference. */
export function evaluateLoadAcCurrents(
  loads: Array<{ id: string; name: string; ratedWatts: number; quantity: number; isDc: boolean }>,
  requirements: AcRequirements | null | undefined,
): LoadAcCurrentResult[] {
  return loads.map((load) => {
    if (load.isDc) return { id: load.id, name: load.name, phase: 'unknown', voltageVolts: null, currentAmps: null, status: 'dc_not_applicable', basis: 'none' };
    const override = requirements?.loadOverrides[load.id];
    const connection = override ?? requirements?.loadService;
    const basis = override ? 'per_load_override' : requirements ? 'site_load_service' : 'none';
    if (!connection || !connection.confirmed || connection.phase === 'unknown' || connection.frequencyHz === null || !connection.powerFactor || connection.powerFactor <= 0 || connection.powerFactor > 1) {
      return { id: load.id, name: load.name, phase: connection?.phase ?? 'unknown', voltageVolts: null, currentAmps: null, status: 'incomplete', basis };
    }
    const voltage = connection.phase === 'three' ? connection.lineToLineVolts : (connection.lineToNeutralVolts ?? connection.lineToLineVolts);
    if (!voltage || voltage <= 0) return { id: load.id, name: load.name, phase: connection.phase, voltageVolts: null, currentAmps: null, status: 'incomplete', basis };
    const current = load.ratedWatts * load.quantity / ((connection.phase === 'three' ? Math.sqrt(3) : 1) * voltage * connection.powerFactor);
    return { id: load.id, name: load.name, phase: connection.phase, voltageVolts: voltage, currentAmps: Number.isFinite(current) ? current : null, status: Number.isFinite(current) ? 'assessed' : 'incomplete', basis };
  });
}
