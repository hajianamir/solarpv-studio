import { z } from 'zod';
import type { FinancialUqResult } from '../engine/core/uncertaintyPropagation';
const finite = z.number().finite();
const metric = z.object({
  nominal: finite, mean: finite, stdDev: finite.nonnegative(), p10: finite, p50: finite, p90: finite,
  relativeSpreadPercent: finite.nonnegative(), unit: z.string(),
}).strict();
const pct = finite.min(0).max(100);
const count = z.number().int().nonnegative();
const schema = z.object({
  traceId: z.string().trim().min(1).max(256), sampleCount: count.min(20).max(2000),
  copulaFamilyUsed: z.enum(['gaussian_copula','students_t_copula','clayton_copula','gumbel_copula']),
  annualGenerationMwh: metric.extend({unit:z.literal('MWh/year')}),
  lcoeUsdPerMwh: metric.extend({unit:z.literal('$/MWh')}), npvUsd: metric.extend({unit:z.literal('USD')}),
  bankableRiskCategory: z.enum(['LOW_RISK','INVESTMENT_GRADE','ELEVATED_VOLATILITY','HIGH_UNCERTAINTY']),
  tornadoSensitivityRanking: z.array(z.object({variableId:z.string().min(1),name:z.string().min(1),varianceContributionPercent:pct,sensitivityType:z.enum(['aleatory','epistemic']).optional()}).strict()).max(32),
  convergenceStandardErrorNpvUsd: finite.nonnegative().optional(),
  trialStatusBreakdown: z.object({totalTrials:count,irrDefinedTrials:count,irrUndefinedTrials:count,paybackAchievedTrials:count,paybackUnachievedTrials:count}).strict().optional(),
  uncertaintyDecomposition: z.object({aleatoryVariancePct:pct,epistemicVariancePct:pct,aleatoryVariables:z.array(z.string()).max(32).optional(),epistemicVariables:z.array(z.string()).max(32).optional(),methodologyNote:z.string().optional()}).strict().optional(),
  screeningAndBankabilityNoticeFa:z.string().optional(),screeningAndBankabilityNoticeEn:z.string().optional(),
}).strict();
/** Transport integrity only, not model/field validation. Reject, never repair or reorder. */
export function assertFinancialUqResult(value: unknown, expectedSamples: number): asserts value is FinancialUqResult {
  const r = schema.parse(value);
  const e=r.annualGenerationMwh,c=r.lcoeUsdPerMwh,n=r.npvUsd,t=r.trialStatusBreakdown;
  if(r.sampleCount!==expectedSamples || e.p10<0 || e.mean<0 || e.p10>e.p50 || e.p50>e.p90
    || c.p90<0 || c.mean<0 || c.p90>c.p50 || c.p50>c.p10 || n.p10>n.p50 || n.p50>n.p90
    || [e,c,n].some(m=>m.nominal!==m.p50)
    || (t && (t.totalTrials!==r.sampleCount || t.irrDefinedTrials+t.irrUndefinedTrials!==t.totalTrials || t.paybackAchievedTrials+t.paybackUnachievedTrials!==t.totalTrials))) {
    throw new Error('UQ_WORKER_INVALID_RESULT');
  }
}
