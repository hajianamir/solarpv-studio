/** Execution policy, not a new stochastic model or accuracy claim. */
export const FINANCIAL_UQ_EXECUTION_POLICY = 'gaussian-only-retired-student-t-v2' as const;

export function assertFinancialUqCopulaExecutable(family: unknown): void {
  if (family === 'students_t_copula') throw new Error('UQ_STUDENT_T_RETIRED_INVALID_MARGINAL_TRANSFORM');
  if (family !== undefined && family !== 'gaussian_copula') throw new Error('UQ_UNSUPPORTED_COPULA');
}
