# ADR-029 — Explicit bounded conventional periodic IRR assessment

Task date: 2026-11-03. Decision: accepted for scoped screening assessment; U16b/U16c and release remain partial/blocked.

## Context and owner trace

`runIranianRegulationFinancialModel` has a nested multi-guess Newton solver and bounded fallback. It rounds its first successful rate to one decimal percent and otherwise returns null, with no separate no-root/unsupported/domain/convergence status. The Iranian panel previously printed these scalar fields. Existing external callers and independent whole-result fixtures depend on that legacy result shape; replacing it globally would silently alter the economic interpretation of old clients.

The new authoritative numerical boundary is `assessPeriodicIrr` in `src/engine/core/periodicIrr.ts`, validated by `PeriodicIrrInputSchema`. The sole application adopter in this slice is `IranianRegulationsTab`: it forms project flows from negative total CAPEX and annual revenue minus OPEX; equity flows from negative equity contribution and existing post-debt net cash flows. Both use the same existing unrounded 25-year ledgers. This changes the displayed IRR assessment, not those ledgers, NPV, cash-flow schedules, rates, debt service, project settings or import/export schema. Deprecated legacy rounded scalar fields and their algorithm remain unchanged.

## Governing equation and policy

For equally spaced annual cash flows C[t], solve sum(C[t]/(1+r)^t)=0. Pinned numpy-financial v1.0.0 `_financial.py`, commit `247aa4e2ee4fa7db44915790d5a730b9776d10a7`, documents this equation. The implementation source also explicitly notes multiple solutions and selects the rate closest to zero. That selection is **not** adopted here. Acquisition hash/path/bytes are recorded in `phase23-irr-source.json`; the library source was inspected, not executed as a whole external financial reference.

Our explicit policy `conventional_periodic_irr_bounded_v1` accepts only an initially negative investment and exactly one negative-to-positive sign change after zero entries are omitted. Several initial negative annual periods and trailing/intermediate zeros are allowed. By Descartes' sign rule the discount-factor polynomial has one positive root; hence one root for r > -1. Later reinvestment/reversal and positive initial investment are unsupported, not assigned whichever root a starting guess finds. For example [-100,230,-132] has both 10% and 20% roots; this API refuses to select between them.

The application search domain is [-0.9,10] in fractional annual rate (-90% to 1000%). This is **not** a universal mathematical IRR bound or economic plausibility judgment. Opposite endpoint signs bracket the unique root. Out-of-domain means no root assessed within this policy, not no IRR anywhere. Endpoint classification follows floating-point evaluation; near-boundary rounding differences are not an accuracy certification.

Normalize flows by maximum absolute amount, reject if normalization erases any nonzero flow, and evaluate the NPV polynomial via Horner in x=1/(1+r). Normalized magnitudes <=1, maximum degree100 and x<=approximately10 bound intermediate arithmetic in the declared domain. Use 96 fixed bisection steps, then require finite absolute normalized NPV residual <=1e-10. Fixed work bounds prevent uncontrolled iteration, including under mutation probes. A numerically ill-conditioned long-horizon polynomial may remain unavailable even if its input shape is supported. No unconditional convergence/accuracy guarantee for arbitrary cash flows is made.

## Result and boundary semantics

Strict input: policy, 2–101 finite flows in one specified currency, annual periods, explicit project/equity cash-flow basis and nominal/real rate basis. No defaults silently assign currency, valuation or period. Unknown/missing fields reject as `invalid_input`. Results are either:

- available: full-precision fractional/percent rate, normalized residual, original normalized input, policy/domain and `financialAdoptionEligible:false`;
- unavailable: null rate/percent and explicit reason `invalid_input`, `no_sign_change`, `unsupported_cash_flow_pattern`, `outside_policy_domain` or `numerical_failure`.

Zero IRR is available (within floating precision), distinct from all-zero/no-sign-change series. The output and input are JSON-safe; no network, clock, randomness or storage. Internal NPV helper is separately exported for direct component reference execution; callers wanting an assessment must use the strict assessment boundary, not its raw polynomial helper.

Final consumer review also corrected stale table disclosure: it no longer falsely claims a representative-day annualization fallback or model-level million-Toman rounding. Generation and currency are rounded only in the visible table; legacy LCOE is still explicitly qualified as rounded.

The bilingual screen now displays two-decimal percentages only at presentation, or a localized unavailable reason. Data attributes retain raw rates and selected policy for actual browser observations. An operational-energy block still prevents the scalar framework from being displayed for adopted dispatch energy. Neither available IRR nor an illustrative tariff qualifies finance/annual-energy adoption or bankability.

## Verification and review scope

Independent 60-digit Decimal direct-sum NPV and 240-step bisection produce 164 root/status cases: 156 available, eight unavailable. They include analytical one/two-period roots, zero-rate, scales1e-9/1/1e9, explicit policy endpoints and 96 project/equity cases composed from the previously independent Decimal Iranian ledgers. Production never generates expected values. Eight direct NPV cases use independently summed discounted amounts. The focused test also recomputes production Iranian ledgers and compares their resulting assessed rates against these independent cases, preserving old whole-result regression coverage.

Numerical root comparison budget: absolute1e-9 plus relative1e-11 (percentage points when comparing percent), allowing double-precision evaluation versus Decimal and the long-horizon bisection residual. This is a numerical replay budget, not a financial return forecast. Raw NPV comparisons have absolute1e-10/relative1e-12 in focused tests; expression fixtures use the declared pool budget. Residual is compared to zero under1e-9 fixture budget while production's availability guard independently enforces1e-10. All33 mathematical expressions are directly reached and mutation-sensitive with independent outputs; the focused test checks all current expressions including untracked new source. Source/inventory/whole-result regression passes do not imply empirical applicability.

Three internal review passes and follow-up investigations are recorded in `PHASE-2-3-IRR-REVIEWS.md`. Runtime logs and attempts are retained separately, not replaced by this design record.

## Rollback and remaining work

New callers opt in via explicit policy; old public financial API remains compatible and deprecated for assessment use. Current UI explicitly selects the new assessment. No durable migration is required. Safe rollback disables the new IRR card/consumer and shows unavailable rather than reinstating an unqualified ambiguous-root claim. Existing project/equity NPV and cash flows stay intact.

Not implemented here: all-root enumeration, XIRR/irregular timing, global IRR-model migration, arbitrary financing/debt/DSCR reconciliation, multiple discount-rate/WACC validation, full-precision legacy LCOE/payback cleanup, independent whole-finance execution, statutory assumptions or model calibration. The missing normative/manufacturer/site/platform/remote evidence and inherited reference debt remain active stops. Phase2/3 completion and release are not authorized by this change.
