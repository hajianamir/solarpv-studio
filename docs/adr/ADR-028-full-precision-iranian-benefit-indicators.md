# ADR-028 — Full-precision screening benefit indicators, compatible legacy API

Date: 2026-11-03
Status: accepted for bounded arithmetic/UI precision only; U16b/U16c remain partial.

## Problem and evidence

`runIranianRegulationFinancialModel` rounds penalty avoidance to whole million Toman and the outage-loss proxy likewise. Its UI formerly divided the already rounded penalty amount by 1000 and rounded again to one decimal billion Toman. For 11.8 MWh at the illustrative 4200 Toman/kWh, exact arithmetic gives 49.56 million Toman; legacy output is 50 million, which displays 0.1 billion rather than the correctly single-rounded 0.0 billion. At .5 kWp, the separate illustrative 8.5 million Toman/kWp proxy is 4.25 million, not the rounded legacy 4 million. These are accounting/rounding witnesses, not evidence of avoided penalties or realized outage savings.

The two benefits have different assumed meanings and must not be combined, counted as new cash-flow revenue, or used to claim bankability. Current rates are not verified official tariff or industrial loss estimates.

## Decision and compatibility

Add a separate pure API `evaluateIranianBenefitIndicators` with required model policy `iranian_benefit_indicators_full_precision_v1`. Require explicit nonnegative finite capacity, annual generation, penalty rate and outage-loss coefficient. Strictly reject missing/unknown fields, unknown policy, invalid/nonfinite input and arithmetic overflow. Zero remains valid. Never add a default rate inside the mathematical kernel.

Return unrounded IEEE754 numbers, named units, normalized original inputs, policy version, unverified-assumption basis and `financialAdoptionEligible:false`. This is normal double precision, not arbitrary-precision financial accounting. Input serialization and source/model identity can accompany independent use of this API.

Use exact dimensional identities:

- Annual MWh × 1000 kWh/MWh × Toman/kWh ÷ 1,000,000 Toman/million.
- Capacity kWp × explicitly assumed million Toman/kWp.

The outage coefficient has no verified annual/event applicability; it is a separate proxy, not added to the annual penalty number.

The existing public financial-model result, its rounded fields and all ledger/IRR/NPV/LCOE calculations remain numerically unchanged. Mark the two old result fields deprecated; do not reinterpret saved scalar values or change whole-result fixtures. This retains old clients while exposing a named full-precision API. No project schema migration or new persisted default model selector is introduced because the financial model and its inputs are not replaced.

The Iranian UI now explicitly calls the new indicator API with the same disclosed illustrative rates, displays million Toman to two decimals at the presentation boundary, identifies the selected indicator policy and shows the outage proxy separately. This avoids representing ordinary small installations as 0.0 billion. It does not change revenue, debt service, eligible energy, project/equity valuation or financial adoption. The existing operational-energy block remains ahead of this computation; invalid numeric states remain unavailable, not successful zeroes.

## Independent arithmetic and regression evidence

A standalone standard-library Python generator computes **168 Cartesian cases** using 60-digit Decimal, without reading/importing production code or accessing a service. Capacity includes zero/.5/1/5/10/50/1000 kWp; generation includes zero/.9/11.8/1800.12345 MWh; rates include zero and non-default values. This validates dimensional arithmetic and declared precision, **not empirical rates/project economics**. Reference locator is Python Decimal documentation and the explicitly recorded unit identities, not a fabricated financial standard clause.

The comparison budget is `1e-15 + 5e-15*abs(expected)` million Toman for the two-operation double-precision evaluation versus rounded Decimal outputs; it is a numerical replay budget, not monetary forecast accuracy. All zero and absent/invalid cases are separately checked. Three current mathematical AST expressions each have directly executed reach/sensitivity fixtures. Expected values come only from Decimal, not production output. Focused tests require exact expression inventory coverage, including when new source is not yet tracked by git diff collection.

Old whole-financial-result fixtures remain unchanged and must pass. New tests also cover immutability, JSON serialization, fractional/double-rounding witnesses, invalid/missing/range/policy/overflow and bilingual SSR. Production Chromium tests verify actual capacity/annual-energy inputs, raw indicator values, displayed precision/policy in three modes and existing project/report pathways. Successful arithmetic/consumer checks do not establish statutory applicability, independent financial-model validation or bankability.

## Selection, rollback and stops

The new API is opt-in through its explicit policy/input contract. Legacy callers retain the old numerical API. A safe visual rollback removes/disables the new indicator card/call through a focused inverse patch while leaving existing financial results/data intact; do not restore the misleading combined guaranteed-savings label. No project data is rewritten, so there is no downgraded saved-result reinterpretation. Existing operational-energy/adoption blocks must remain enabled.

Further U16b/U16c work still includes unrounded IRR/LCOE/other scalar policies, solver/root conventions, full financing/debt/DSCR schedules, consolidated public financial kernels, import/export economics and source/applicability evidence. Missing current official tariff/customer outage data continues to block those claims. Full Phase2/3 and release are not complete.
