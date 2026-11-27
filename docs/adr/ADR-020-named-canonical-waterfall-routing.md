# ADR-020 — Named canonical waterfall routing and guarded compatibility

Date: 2026-11-03. Status: implemented for the canonical-consumer portion of U07a. **U07a and overall Phase2 remain partial; release blocked.**

## Context and decision

Canonical annual yield manually built a 17-slot positional tuple, invoked the legacy waterfall, and separately attached reference-loss metadata. App and WaterfallLossTab already use `computeConfiguredWaterfall`. Route canonical annual yield through that same named boundary, retaining existing explicit canonical defaults. Do not alter scalar equations, stage percentages, transposition, thermal policy or financial adoption. The legacy function and builder remain exported and now carry deprecation guidance; existing benchmark/arity/compatibility tests remain.

The named wrapper omits the own undefined `trackerDetails` property when tracking is inactive. Prior canonical results included that property with undefined. Both serialize identically; absence rather than own-undefined is now the canonical in-memory diagnostic shape. No input/project schema migration or stored-number rewrite is needed. Explicit zero values, signed thermal gain, unspecified optional fields and invalid thermal overrides keep their prior behavior. No new input coercion is introduced.

## Evidence and units

`test-phase2-named-waterfall.ts` asserts every tuple slot, defaults, primary/alias precedence, zero/NaN transport, null tracker configuration, tracker boolean/config behavior, physical-loss inputs and invalid thermal overrides. Nineteen named/legacy report cases use exact serialized equality; 36 actual base-version canonical calculations and four actual base-version roof calculations preserve the full JSON report. The existing 33-fixture reference-integration suite checks reference-loss replacement/atomic fallback and serialization under UTC, America/New_York and Asia/Tehran.

The gate correctly identifies the changed canonical call as an expression. One new exact-node fixture executes it and verifies mutation sensitivity. `generate-named-waterfall.py` independently computes five full reports with 50-digit Decimal sequential retained-fraction multiplication. Cases include 0/1/100/1000kWp, zero/positive PSH, and negative/zero/positive signed thermal loss. The executed witness is nonzero energy with a cold gain, not only a zero-energy identity. Units: kWp, first-year kWh, daily PSH, Celsius for transported inputs and percentage points. Tilt zero fixes transposition gain at zero; local losses remain explicitly unvalidated policy constants. Report wording comes from the existing text-contract template, not numerical production output. No TypeScript execution/import generates numerical expectations.

Tolerance is absolute 1e-7 in each compared scalar's units plus relative 1e-12 for accumulated binary64 versus Decimal arithmetic and rounding, not weather/site/physical accuracy. Actual pre/post consumer regression uses exact equality, not this tolerance. The test pins the exact removed/added canonical call expression IDs; all other canonical numerical ASTs must be unchanged. No gate code or global waiver changed.

## Three review/research passes

1. Contract review traced the production consumers, optional tracker diagnostics and named/positional defaults. Follow-up inspected pinned pvlib v0.13.1 irradiance source: `get_total_irradiance` requires surface/solar geometry and DNI/GHI/DHI; sky model and additional requirements are explicit. Annual PSH alone cannot identify a validated physical transposition model. Keep local annual policies unchanged.
2. Correctness review found that call-site replacement itself is gated, and that the roof call is inside a private generator. Follow-up retrieved `tests/test_irradiance.py` from pvlib v0.13.1 via GitHub API and inspected missing-extra-DNI rejection, scalar/albedo/model and near-90-degree zenith tests. These are instantaneous component tests, not support for inventing an annual multiplier. Add independent Decimal routing evidence for canonical, not copied targets. Restore roof to base until direct generator-return evidence execution is supported without weakening the gate.
3. Delivery review exercised production-import guard witnesses (renamed, namespace/destructuring, re-export and dynamic imports), temporary baseline-module cleanup and actual reports. Follow-up inspected upstream total-POA output component contracts and executed local reference integration in three timezones. This distinguishes serialized numerical parity from physical validation. Upstream tests were inspected, not executed. Retrieved upstream test source SHA256: `1d396714977b5312f8fe35c0d9b7e40c491de7fe102d1c41f94dbb668937981b`.

Sources: https://github.com/pvlib/pvlib-python/blob/v0.13.1/pvlib/irradiance.py and https://github.com/pvlib/pvlib-python/blob/v0.13.1/tests/test_irradiance.py . These agent self-review passes are not human independent review/conformity.

## Stops, failed attempts and remaining work

- The first focused test incorrectly expected complete formula AST identity. Inspection identified the precise calculation-call replacement; an independent fixture and exact-node assertion replace that erroneous expectation, not a blanket exemption.
- The first manifest entry used an absolute fixture path generated from `__file__`. The unchanged gate rejected it. Generator now emits a repository-relative path; canonical sorting and reference gate rerun pass.
- The fresh checkout was shallow and lacked historical base 0c4d7ca required by existing Phase1/uplift AST checks. Initial runs failed before those historical comparisons. Fetched that immutable commit from origin (no branch switch); reruns pass. Test execution itself does not auto-fetch. Preserve this history prerequisite in offline test setups.
- The private roof generator call remains positional. The import guard allows that file only while its entire numerical AST inventory equals the base, and actual base/runtime JSON is checked. This is explicit incomplete implementation, not validated named routing. Before migrating it, add independently referenced generator-return execution or another evidence-backed adapter architecture and regression tests; do not evade helper-call detection or remove the gate's direct-export requirement ad hoc.
- Common transposition policy, remaining annual-policy consumers, global model/economic-policy migration and manufacturer-specific electrical work remain open. No evidence/release/financial gate is bypassed.

## Rollback and guide

Restore only canonical's prior tuple + legacy call + metadata attachment if the named boundary needs rollback. Retain the deprecated exports, original numerical values, invalid-state containment and adoption restrictions. Since serialized numerical behavior is unchanged, no feature flag or destructive data migration is added. See `docs/guides/annual-thermal-screening.md` and `PHASE-2-NAMED-WATERFALL-PLAN.md`; final command outcomes and source hashes are in `phase2-named-waterfall-verification-receipt.json`.
