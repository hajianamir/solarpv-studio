import {z} from 'zod';

/** Evidence describes a manufacturer rating, NOT conductor ampacity/OCPD sizing.
 * Missing legacy fields remain unknown; no catalog defaults are evidence.
 */
export const MpptRatingEvidenceSchema = z.object({
  basis: z.enum(['unknown', 'permissible_module_isc_stc', 'factored_array_isc', 'terminal_short_circuit_capability']),
  scope: z.enum(['per_mppt', 'per_input', 'whole_inverter']),
  source: z.string().trim().min(1),
  sourceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const timestamp = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
  }, 'Source date must be a real ISO calendar date').nullable(),
  conditions: z.string().trim().min(1),
  requiredMultiplier: z.number().finite().positive().optional(),
  operatingCurrentAmps: z.number().finite().positive(),
  shortCircuitCurrentAmps: z.number().finite().positive(),
});
export type MpptRatingEvidence = z.infer<typeof MpptRatingEvidenceSchema>;
export interface ElectricalReadiness {
  status: 'screening_evidence_complete' | 'unassessed';
  conformity: null;
  legacyShortCircuitMultiplier: 1.25;
  reasons: string[];
}
export function assessElectricalReadiness(input: {
  evidence?: MpptRatingEvidence;
  measuredVmpPct?: number;
  operatingLimit: number;
  shortCircuitLimit: number;
  allocationAssumed: boolean;
  allocationValid: boolean;
}): ElectricalReadiness {
  const reasons: string[] = [];
  const parsed = MpptRatingEvidenceSchema.safeParse(input.evidence);
  if (!parsed.success) reasons.push('Manufacturer current rating basis/source/date/conditions missing or invalid.');
  else {
    const e = parsed.data;
    if (e.sourceDate === null) reasons.push('Manufacturer source publication/effective date unknown.');
    if (e.operatingCurrentAmps !== input.operatingLimit || e.shortCircuitCurrentAmps !== input.shortCircuitLimit) reasons.push('Current ratings differ from the source evidence snapshot.');
    if (e.scope !== 'per_mppt') reasons.push('Rating scope is not per MPPT; per-input/whole-inverter conversion is not assessed.');
    if (e.basis !== 'factored_array_isc' || e.requiredMultiplier !== 1.25) reasons.push('Rating basis is not established as compatible with the retained 1.25 array-Isc screen; no automatic factor conversion.');
  }
  if (!Number.isFinite(input.operatingLimit) || input.operatingLimit <= 0 || !Number.isFinite(input.shortCircuitLimit) || input.shortCircuitLimit <= 0) reasons.push('Finite positive operating and short-circuit ratings required.');
  if (input.measuredVmpPct === undefined || !Number.isFinite(input.measuredVmpPct) || input.measuredVmpPct >= 0) reasons.push('Measured manufacturer Vmp temperature coefficient unavailable.');
  if (!input.allocationValid) reasons.push('Per-channel string allocation invalid or unavailable.');
  if (input.allocationAssumed) reasons.push('Actual per-channel string allocation unavailable.');
  return {status: reasons.length ? 'unassessed' : 'screening_evidence_complete', conformity: null, legacyShortCircuitMultiplier: 1.25, reasons};
}

/** Catalog/project metadata validation only, not an electrical sizing formula. */
export function appendRatingMetadataErrors(inv: {mpptRatingEvidence?: unknown; iscMaxAmpsPerMppt?: number; imppMaxAmpsPerMppt?: number}, errorsFa: string[], errorsEn: string[]) {
  if (inv.mpptRatingEvidence !== undefined && !MpptRatingEvidenceSchema.safeParse(inv.mpptRatingEvidence).success) {
    errorsFa.push('مدرک مبنای جریان MPPT نامعتبر است.'); errorsEn.push('Invalid MPPT rating evidence.');
  }
  for (const value of [inv.iscMaxAmpsPerMppt, inv.imppMaxAmpsPerMppt]) {
    if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
      errorsFa.push('جریان MPPT باید مثبت و متناهی باشد.'); errorsEn.push('MPPT current must be finite and positive.');
    }
  }
}
