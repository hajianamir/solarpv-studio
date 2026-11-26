# Task runbooks

Use the matching runbook after reading the primary skill. These procedures supplement the primary skill. They do not expand the authorized scope. Each runbook MUST conclude with criterion-linked evidence and the separate implementation, verification and release decisions defined in the delivery reference.

## A. Defect correction
1. State expected/observed behavior, revision and minimal non-sensitive reproduction.
2. Trace the authoritative owner and all consumers, including serialized/Python/report fields.
3. Add a regression that fails for the defect; keep existing safety failures intact.
4. Implement the smallest root-cause change. Avoid a UI-only patch when the owner is a shared calculation.
5. Test the original reproduction, adjacent boundaries and impacted modes/legacy inputs.
6. Document behavioral consequences and selective rollback. If independent evidence is missing, stop the affected release claim rather than force a green gate.

**Deliverable:** reproduction, cause, affected interfaces, code/tests, observed results and unresolved limitations.

## B. New cross-system feature
1. Write acceptance scenarios with input/action/output/failure behavior, including authorization, persistence and adoption where relevant.
2. Map the vertical slice: control → contract → computation/service → result → storage/report. Assign one authoritative owner per value.
3. Version new payloads where necessary; define optional/missing/stale behavior and cancellation before implementing UI success states.
4. Add a reversible feature/adoption gate if warranted; do not introduce a permanent fallback to known-unsafe math.
5. Deliver a coherent thin slice with unit, boundary integration and actual user-flow verification.
6. Complete help, provenance, migration and rollback documentation. Mark scaffolding/partial coverage explicitly.

**Stop:** do not expose a “ready” action when required computation, durable persistence or eligibility checks remain unimplemented.

## C. Numerical-model change
1. Capture governing equation, exact source/edition, applicability, units, coefficients and expected bias by regime.
2. Review every consumer and avoid introducing duplicate paths.
3. Generate independent vectors with a committed generator and pinned reference version where possible; keep data provenance and licensing explicit.
4. Add internal algebra/property/boundary tests separately. Record tolerance derivation; do not copy production outputs into expected references.
5. Run registry/expression-level reference gates and consumer regressions. Preserve retired targets and visible discrepancies.
6. Report numerical comparison domain separately from annual/project accuracy or conformity.

**Stop:** missing required independent evidence, inaccessible governing clauses, unexplained discrepancy or unsafe financial adoption. Do not weaken the gate.

## D. Research/Python study
1. Identify whether this is exploratory research, a comparison tool, calibrated model or an adoptable operational result.
2. Define a structured service protocol, pinned runtime, job identity, bounded resources, authentication, cancellation and errors.
3. Validate weather/measurement timestamp semantics, units, coverage and project configuration before computation.
4. Keep research results distinct from normal design. Evaluate registered coverage/context/adoption eligibility explicitly.
5. Test Python calculations, HTTP/service integration, UI lifecycle, stale results, unavailable dependencies and offline behavior separately.
6. Archive enough non-sensitive configuration/evidence to reproduce the result. Disclose synthetic versus observed data and partial implementation.

**Stop:** implicit service fallback that changes the model, unqualified sensor reinterpretation or a direct research-to-revenue connection.

## E. Data/schema/catalog migration
1. Inventory old versions and field ownership. Preserve authoritative selected snapshots and optional absence.
2. Define exact validation, migration and confirmation behavior before writes. Preserve evidence of corrupt/unreadable storage.
3. Test old→new, new→export→import and unknown/future schema behavior using disposable files/browser profiles.
4. Exercise invalid values, conflicting IDs, multi-tab updates, quota/I/O failures and aborted mutation.
5. Verify recovery and read-back. Provide rollback compatibility; do not imply downgrade support unless tested.

**Stop:** partial mutation, success reported before durable persistence, destructive seeding, or loss of original snapshot bytes.

## F. Security/API/service correction
1. Build a route-specific threat sketch: attacker capability, assets, trust boundaries, authorization and resource limits.
2. Reproduce safely in an isolated test; do not print credentials or attack live external systems.
3. Test the rejection path and legitimate user path. Include parser/middleware order and subprocess/file boundaries.
4. Verify failures do not leak payloads, environment variables, private files or unbounded output.
5. Record production configuration prerequisites and regression evidence without storing secrets.

**Stop:** ambiguous ownership/authorization or changes that would broaden access while fixing a preview problem.

## G. Refactor/performance improvement
1. Define behavior and performance invariants before moving code.
2. Establish representative and boundary baselines; include CPU/memory/UI responsiveness when claimed.
3. Preserve public exports, schema, calculation order/precision and cancellation ownership unless explicitly changed.
4. Refactor narrowly; prove parity and measure the improvement under stated conditions.
5. Check build/chunk/worker and production behavior, not just TypeScript compilation.

**Stop:** unexplained numerical drift, missing baseline or a “performance fix” that silently lowers fidelity.

## H. Release/dependency/platform work
1. Read actual CI and dependency/runtime declarations. Assess implementation, verification and release eligibility separately.
2. Use locked dependency installation and inspect launcher/service/image contents.
3. Exercise clean installation, final runtime, offline-after-install behavior and update/recovery paths where changed.
4. Do not claim Windows/Safari/iOS/container support based on a different runtime or mocked harness.
5. Summarize required gates by exact revision and environment. Retain failed/missing evidence as a release blocker.
6. Prepare commit/PR/release actions only when authorized and report their actual results.

## I. Audit or documentation-only task
1. Confirm read-only versus implementation scope.
2. Classify claims as confirmed defect, already addressed, unsupported allegation or missing evidence.
3. Cite actual files and reproducible observations; distinguish current source from historical receipts.
4. For docs/skills, validate links, referenced scripts, packaging and drift. Do not run unrelated destructive/integration jobs merely to inflate the test list.
5. Do not call a structural document check proof that an agent or model behaves correctly.

## Review sequence for substantial changes
- **Review 1 — contracts:** inspect interfaces, units, modes, consumers and migration; follow with call-graph and edge-case investigation.
- **Review 2 — correctness/safety:** inspect numerical/data/financial/security assumptions; follow with primary references, independent fixtures or adversarial cases. Disclose unavailable evidence.
- **Review 3 — operation:** inspect cancellation, failure/recovery, artifacts and deployment; follow with actual browser/HTTP/process/runtime tests where available.

Record these as internal reviews with follow-up research. Do not relabel them as independent validators or field research.
