# Phase2 finance boundary acceptance — 2026-11-03

Continue on assigned branch, preserving existing dirty work. Numerical/financial, HTTP and UI boundary risk. Overall Phase2 incomplete until authoritative matrix fulfilled.

## Criteria fixed before implementation

- P2-F2: one discounted constant-OPEX/degrading-energy LCOE arithmetic owner with declared units/time basis. Independent Decimal annual discount sums verify full-precision costs, kWh and ratio. Keep the old six-positional `calculateLcoe` export as deprecated-compatible adapter, including its clamps/zero sentinel; active paths must no longer interpret that sentinel as free electricity.
- P2-F3: named strict assessment rejects missing/nonfinite/negative costs, nonpositive generation, fractional/out-of-bounds horizon, invalid discount/degradation and inconsistent enum metadata. A finite genuinely zero-cost case is available with LCOE0. Zero energy and numerical overflow/underflow are unavailable/null, not cost0. Support negative discount rates strictly greater than−1 without inventing a debt-rate constraint. Maximum100 years is a resource limit, not physical validity.
- P2-F4: HTTP `/api/v1/finance/lcoe` uses the strict result, consumes degradation rather than silently ignoring it, preserves `lcoeValue` for valid existing numeric requests, marks omitted currency/rate basis unspecified, and rejects malformed inputs. Real HTTP tests use disposable storage. Unsupported tax/escalation/debt/salvage models must not be silently interpreted as implemented.
- P2-F5: scenario engine/UI distinguish unavailable LCOE/null from valid zero and preserve full-precision LCOE until display. Existing illustrative scenario capacity/cost/PSH policies are not redesigned or validated here.

- P2-E1 (confirmed review finding): current feasibility must compare the unrounded per-channel operating/legacy-factored short-circuit sum to its rating. Two-decimal presentation must not admit even an adjacent-float overload. Preserve display fields and retained factor; require rating-basis evidence separately. Independent Decimal threshold cases and actual direct/array consumer witnesses, exact AST delta guards, guide/ADR and rollback. This does not complete U09b manufacturer factor conversion.

## Research, scope and verification

Fetched SAM LCOE help: discounted delivered energy, explicit cost and rate basis, and no comparison of nominal versus real as equivalent. This simple PRE-TAX, constant-OPEX, no-debt/no-tax/no-salvage specialization is not SAM financial-model parity. NREL simple-LCOE alternate URL failed; do not rely on it. Decimal reference generation is offline Python. Require focused unit/numerical/integration/UI checks, lint/build/core/smoke/coverage, Phase1/2/accepted audit, exports/recovery and exact-expression independent reference/mutation gate. Add ADR/changelog/guide and hash receipt after three review passes and research follow-up. Do not weaken the reference gate.

## Rollback

Preserve historical `calculateLcoe` compatibility separately; never reintroduce zero-as-unavailable to active UI/HTTP results. If strict assessment cannot be supported, disable the affected assessment rather than silently claiming free energy. No project input schema migration is asserted by this scoped change; full economic policy persistence/migration remains separate U16b work. No commit/push authorized or needed.
