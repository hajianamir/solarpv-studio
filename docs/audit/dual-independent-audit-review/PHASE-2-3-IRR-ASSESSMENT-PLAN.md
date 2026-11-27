# U16b/U16c — explicit conventional periodic IRR assessment

Task date: 2026-11-03. Preserve all current work. Financial numerical/behavioral risk; not whole-phase closure.

## Acceptance before implementation

- IRR-01: Given an explicit v1 policy and 2–101 finite same-unit annual cash flows with negative initial investment and one negative-to-positive sign change (ignoring zeros), assess the unique periodic root only inside the declared rate domain [-0.9, 10] (fractions). Return unrounded rate/percent, normalized NPV residual, original inputs, domain and financial-adoption false. Owner: new strict contract and pure `assessPeriodicIrr` leaf. Verify independent 60-digit Decimal roots, analytical roots and scaling invariance.
- IRR-02: Distinguish invalid input, no sign change, unsupported nonconventional pattern, outside-policy-domain and numerical failure from available/zero-rate IRR. No Newton guess selection, invented root or unavailable-to-zero coercion. Reject invalid/unknown policy and nonfinite values without mutation. Verify adversarial and JSON tests.
- IRR-03: Iranian UI explicitly builds project/equity series from existing unrounded ledgers and selects the new policy. Show precise IRR rounded only to two decimals and explicit unavailable status in both locales. Retain legacy public API outputs, NPV, ledgers, settings/project serialization and operational-adoption blocks unchanged. Verify legacy finance fixtures, SSR and real-browser three-mode observations.
- IRR-04: Every mathematical AST expression must have reached, independently compared and mutation-sensitive execution. Run focused + governing baseline/integration gates, retain failures/source identity and no release claim.

## Numerical source/domain and stops

Periodic IRR is the root of sum(C[t]/(1+r)^t)=0; see pinned numpy-financial `_financial.py` source already acquired in the Phase3 research manifest. This implementation is not its polynomial root algorithm. One sign change implies one positive discount-factor root (Descartes); initial-negative/final-positive orientation is required. A bounded bisection with explicit policy domain refuses other roots rather than silently picking Newton's first answer. Domain is an application numerical policy, not an economic plausibility standard; out-of-domain is not proof of no IRR globally.

Normalize by maximum absolute flow to reduce scale dependence; Horner in x=1/(1+r). 96 bounded bisection iterations; require absolute normalized NPV residual <=1e-10 before availability. Root replay budget 1e-9 percentage points absolute +1e-11 relative is a numerical verification budget, not financial accuracy. Return exact input metadata and residual; actual residual against original units scales with the largest flow. No irregular-date/XIRR, multiple-root enumeration, return calibration, debt schedule validation or bankability. Same-unit scaling is allowed; currencies may not be mixed.

Legacy financial API retains its old rounded/null IRRs for external compatibility and is marked deprecated for assessment use. Only current UI selects the new named policy. No durable schema or imported result is reinterpreted; rollback disables the new IRR consumer (display unavailable), not restores unqualified ambiguous roots. Research never becomes revenue/annual energy. Missing source applicability and platform/whole-model evidence still block corresponding claims.

## Execution notes

- Added final bilingual disclosure correction after a consumer review identified stale annualization/model-rounding claims; SSR/browser assertions constrain this copy to the actual annual input and full-precision ledger.
- Missing-field boundary probe removes each of the six required contract fields from a valid input in turn and asserts `status:unavailable`, `reason:invalid_input`; its command/log are retained with runtime evidence.
- Final stable-source receipts and all failed registration/SSR/locale attempts are retained in `phase23-irr-verification.json` and `phase23-irr-evidence/`. Historical receipts do not attest new executable sources.
