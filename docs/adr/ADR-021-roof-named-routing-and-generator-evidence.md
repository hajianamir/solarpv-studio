# ADR-021 — Roof named routing with bounded generator evidence

Date: 2026-11-03. Status: roof production-consumer routing implemented. Supersedes the **roof stop only** in ADR-020; historical receipts are not rewritten. **U07a common transposition policy and overall Phase2 remain partial; release blocked.**

## Decision

Route roof annual shading's waterfall reconciliation through `computeConfiguredWaterfall`, the same typed named boundary used by canonical annual yield, App and WaterfallLossTab. Retain the positional API, 17-slot builder and benchmark compatibility tests. Remove the roof production-import guard exception. The prior two-step tuple invocation is the sole changed numerical AST occurrence in the roof engine. No coefficients, temporal policy, irradiance normalization, geometric loss, reconciliation threshold or financial/research eligibility changes.

The existing `annualShadingSteps` generator is now directly exported with `@internal` documentation. Sync and cooperative APIs continue to drain that same kernel. Exporting it does not make it a validated whole-scene physical model or a new user-facing adoption API.

## Why the reference harness needed a supported protocol

Previously the harness invoked a directly exported function and compared its return. A generator invocation returns an iterator before executing its body. Without draining it, the target AST is never executed and its final report is not compared. The prior roof migration was therefore correctly stopped, not waived.

The harness now recognizes a directly declared exported synchronous generator in the instrumented AST and drains it to `done:true`, comparing the final return value. It does not infer a generator merely because an ordinary function returns an iterable; ordinary functions retain their existing protocol. Async generators are explicitly unsupported. The direct-export owner check, exact AST execution, independent reference assertion and single-numeric-property mutation sensitivity remain mandatory and unchanged in strength.

The drain permits at most 100000 `next()` calls. Budget exhaustion requests iterator cleanup once with `return()` and fails the check. Harness protocol/budget errors have a distinct error class and **cannot count as mutant application-rejection sensitivity**. A generator may run arbitrary code inside one `next()`/`return()`; this step budget is not preemption or a wall-clock security sandbox. A yielding `finally` is not exhaustively drained. Existing ordinary fixture execution has the same non-returning-call limitation. Process/tool execution limits remain necessary for hostile or pathological code; no stronger isolation claim is made.

## Evidence

- Harness tests execute arithmetic after yields and compare only the final return, reject a yielded-progress target, unreachable AST and executed-but-unused calculations, reject async generators and ordinary iterator-returning function output, and distinguish genuine mutant application rejection from harness-budget failure. Direct drain tests exercise cleanup on exhaustion and final return at exactly the last allowed call.
- `generate-roof-named-waterfall.py` uses independent 50-digit Decimal retained-fraction composition and empty-scene/daylight/PSH identities, not TypeScript imports or numerical outputs. Four complete return cases cover declared capacity 0/1/100/1000kWp and PSH2/5/6. Zero tilt gives zero fixed transposition gain. NOCT45 at ambient−6.25°C gives cell25°C and zero hot-design thermal loss. Local stage assumptions and thresholds are characterized, not independently validated physics.
- The equatorial day1 fixture selects `stepDays:365`: integer hours7–17 exceed1° altitude, eleven samples weighted365 give4015 daylight hours, and normalized horizontal irradiation is PSH×365kWh/m². This is a deliberately coarse policy test, not annual weather. The output continues to label the screening approximation.
- Empty tables have zero geometric energy/loss. A nonzero declared capacity intentionally disagrees with that empty geometry: `isReconciled:false` and capacity-mismatch notes are preserved. It supplies a nonzero waterfall mutation witness **without granting a valid plant**.
- Full returned reports use absolute tolerance1e−7 plus relative1e−12 solely for binary64 versus Decimal accumulation/rounding. Text comes from explicit API text contracts, not scientific inference. Actual pre/post regression uses exact JSON equality.
- The actual base-version roof engine is dynamically loaded from immutable base0d41fd3 in temporary sibling modules, with exclusive creation and cleanup. Four empty and eight populated cases span ±latitude, tilt0/30, an obstacle/no obstacle, full energy/stage/reconciliation/JSON output, and cooperative/sync parity. Invalid zero/negative/nonfinite PSH rejection and no input mutation are asserted. The entire roof numerical AST inventory is identical except the exact old/new call IDs. Canonical's preceding 36 base-version comparisons, all17slots and five Decimal cases remain.

The modified reference gate directly executes and mutation-checks `roof3dShadingEngine.ts#annualShadingSteps#a3427c625e63`. No helper renaming, indirect-export exception or copied target replaced that obligation. Relative to this branch base, the cumulative canonical+roof work has two changed call expressions.

## Three reviews followed by investigation

1. **Contract/protocol review:** traced generator declaration, suspended execution, progress yields and final return. Follow-up inspected TypeScript5.9.3 `es2015.generator.d.ts` (pinned GitHub source and installed declaration) and ECMAScript2025 `GeneratorResume` / `GeneratorYield`: yield produces an iterator result with `done:false`; completed execution returns the final result. This supports draining, not treating yielded progress as a report. Unsupported async execution is rejected, not guessed.
2. **Correctness/safety review:** examined step bounds, completion boundaries, cleanup and mutant error classification. Follow-up inspected ECMAScript2025 `IteratorClose`, whose throw-completion handling preserves the original failure, and pinned pvlib0.13.1 `declination_cooper69` (radians,23.45°, day+284). These sources support protocol/analytic daylight interpretation, not validation of local clear-sky/weather assumptions. Added a regression where only the mutant exhausts the budget so a harness failure cannot falsely prove sensitivity. The first four-case oracle run found that zero-capacity performance ratio must remain0 rather than the nonzero retained-fraction ratio; corrected the independent generator's zero-denominator branch and reran all four cases. Production code/tolerance were not adjusted to fit it.
3. **Delivery/runtime review:** traced shared sync/cooperative kernel, live timer yields, Worker client cancellation and final report shape. Follow-up inspected actual cooperative `finally` cleanup and worker cancellation source and ran the full remaining/lifecycle/native-worker and browser suites (results in receipt). Populated scenes and serialized reports are checked against the actual base, not inferred from import structure. No physics, conformity, bankability or whole-project completeness follows from those checks.

These are agent self-review passes, not independent human review.

### Pinned research provenance

- https://github.com/microsoft/TypeScript/blob/v5.9.3/src/lib/es2015.generator.d.ts — SHA256 `3b6518dfd20f600982c1f79c4e3683f91ae5a85c23bf0e6ed7e81e3a1f37762a`.
- https://github.com/tc39/ecma262/blob/es2025/spec.html — Git blob7685cdd711ebc9784c80274eb8143ac016c00e01, SHA256 `525626fffc5737ad2eab8898f36e2a29189ada2d31316cc5beffeea1b4122321`; sections GeneratorResume, GeneratorYield/Yield and IteratorClose inspected.
- https://github.com/pvlib/pvlib-python/blob/v0.13.1/pvlib/solarposition.py — SHA256 `a91ec411f89826e153108e845b7fa0a8cd2302b8c87bd46cb4caebaa353f2521`; declination_cooper69 inspected, upstream Python not executed in this slice.

## Rollback and limits

Rollback may restore only the prior roof tuple call if needed; keep tested harness support, compatibility exports and all safety/unavailable/adoption restrictions. Serialized numerical reports are unchanged; inactive own-undefined tracker diagnostics are omitted by the configured wrapper, as documented for canonical in ADR-020. No durable schema or numerical-policy migration is needed, and no behavior-changing feature flag is added.

This completes the **production positional-consumer migration**, not all U07a or Phase2. Common transposition policy, common annual-policy reconciliation, persisted economic/model policies, manufacturer-specific electrical implementation and broader economics remain open. Historical CAD/retired-target/deployment/field-validation limitations are not waived. See `PHASE-2-ROOF-NAMED-PLAN.md`, the annual thermal guide and `phase2-roof-named-verification-receipt.json` for acceptance/execution details.
