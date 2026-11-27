import {z} from 'zod';

export const PeriodicIrrInputSchema=z.object({
  modelPolicy:z.literal('conventional_periodic_irr_bounded_v1'),
  cashFlows:z.array(z.number().finite()).min(2).max(101),
  period:z.literal('annual'),
  cashFlowBasis:z.enum(['project','equity']),
  currency:z.enum(['TOMAN','MILLION_TOMAN','USD']),
  rateBasis:z.enum(['nominal','real']),
}).strict();
export type PeriodicIrrInput=z.infer<typeof PeriodicIrrInputSchema>;
export type PeriodicIrrUnavailableReason='invalid_input'|'no_sign_change'|'unsupported_cash_flow_pattern'|'outside_policy_domain'|'numerical_failure';
