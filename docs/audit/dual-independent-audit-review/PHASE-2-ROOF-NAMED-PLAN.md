# Roof named-waterfall continuation

Date: 2026-11-03. Base 0d41fd38c8038fb5a2c4f1da8082dc2fbcd2f8fb; branch arena/0743c1ca-solarpv-studio. Preserve the preceding dirty canonical migration, receipts and fixtures. No commit/push requested.

## Acceptance and boundaries

R1: Extend reference execution to directly exported synchronous generators only, by inspecting their declared AST. Drain to the final return, not yielded progress. Bound next calls (100000), request cleanup once on budget failure (not unbounded draining of a yielding finally), reject unsupported async generators, and keep harness failures distinct from mutant application rejection. Ordinary functions retain their original output protocol. Tests must prove executed-after-yield arithmetic, wrong targets, unreachable nodes, output-insensitive dead computations and budget exhaustion fail closed.

R2: Export the existing annualShadingSteps generator as an internal verification/cooperative kernel; its body remains unchanged except the named waterfall call. Migrate that call to computeConfiguredWaterfall and remove the production import-guard exception. Keep positional exports/benchmarks and exact 17-slot compatibility tests. The generator owner must have a directly executed independently generated fixture and a numerical mutation witness; no indirect-export waiver, call renaming or copied numerical output.

R3: Independent Decimal scalar report composition plus separately reconstructed daylight counts/PSH normalization for an empty equatorial scene checks the generator's complete returned report. Nonzero declared capacity tests nonzero waterfall transport while explicitly preserving the existing project-snapshot mismatch (empty scene is NOT a valid plant). Test actual base-version roof parity on empty and populated scenes and synchronous/cooperative paths, cancellation and serialized reports. No claim of whole-scene ray-tracing/weather/physical validation.

R4: Run focused harness/roof/named tests, lint/build/core/smoke/coverage, Phase1/Phase2, remaining native-worker/lifecycle/HTTP tests, recovery, exports, claims/help/registry/reference/evidence and production browser. Record every failure and supported rerun; no green-by-waiver.

## Three review/research passes (record observations in ADR)

1. Contract review: generator vs ordinary/async return protocols and direct owner binding. Follow with pinned TypeScript/ECMAScript generator declaration/return investigation.
2. Correctness review: next-call resource bound, cleanup/error classification, independent expectations, output sensitivity and baseline behavior. Follow with pinned solar-geometry/component and local exact arithmetic investigation; retain all screening qualifications.
3. Delivery review: native-worker/cooperative cancellation and full serialized artifacts, import guard, historical receipt integrity. Follow with actual source/runtime checks. Self-review is not independent human review.

## Rollback and stop

If evidence cannot exercise the real generator return, retain the roof positional call and mark R2 incomplete. Do not lower direct-export or sensitivity requirements. If supported, rollback can restore only the roof call; the tested bounded harness extension can remain. No persisted schema or policy/coefficient change, automatic research adoption or financial eligibility is introduced. A feature flag is unnecessary for behavior-preserving call routing; disable unsupported decisions rather than restoring known unsafe acceptance.

## Execution outcome

R1–R4 implemented and verified within the named-routing/protocol scope. Eighteen final regression commands passed, including actual native-worker/lifecycle, artifact/export and production-browser checks. Source registry and evidence inventory pass. The unchanged direct-owner/exact-execution requirements now verify both cumulative changed call nodes with generator return support. Lint remains0errors/93warnings and the retired bifacial stored-target WARN remains; neither confers release eligibility. Initial four-case oracle failed on zero-capacity performance ratio; corrected the independent zero-denominator branch rather than changing production or tolerance. ADR-021 and `phase2-roof-named-verification-receipt.json` record evidence, review/research and remaining limits. Production positional-consumer migration is complete; common transposition and Phase2 overall remain incomplete.
