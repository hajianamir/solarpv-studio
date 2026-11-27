# Phase 4 execution plan — software verification and explicit release stops

Date: 2026-11-03
Branch: `arena/e2cfedea-solarpv-studio`
Base checkout: `16d3ff4056b528c2d9a5215a5e44703e58b49db7`

## Scope and authority

Start Phase4 without treating Phase2/3 as accepted. The canonical scope remains the six work packages in `REPORT-AND-FOUR-PHASE-PLAN.md`, section 8, Phase4. This first slice adds a reproducible local verification harness and executes available baseline/integration/platform checks. It does not modify numerical models, project schemas, UI, research adoption, authentication or release policy.

Implementation, verification and release remain separate. No command PASS can close the inherited 56 CAD-expression reference debt, validate whole models, supply manufacturer/site applicability or waive untested platforms. Earlier Phase3 receipts remain historical and are not relabeled as current checkout evidence.

## Acceptance criteria for the starting slice

| ID | Given / action / required observation | Owner and evidence |
|---|---|---|
| P4-S01 | Given the current package scripts, selecting a named suite shall fail before execution for unknown suite or missing/empty script; execute exact selected npm script definitions without arbitrary CLI command injection. | `scripts/phase4-verification.mjs`; `test:phase4` |
| P4-S02 | Every attempted command shall retain script definition, exit/signal/error, elapsed time and SHA256 of actual output. Timeout/nonzero/signal/spawn error shall never become PASS. Failures remain recorded while independent commands continue. | Runner incremental receipt and negative tests |
| P4-S03 | Receipt shall retain checkout, branch, working-tree state, lockfile/script hashes, platform and runtime, plus before/after executable-input hashes. Changed executable inputs shall make the run incomplete/failed, not silently current. | `sourceIdentity`, `assessRun`, actual receipts |
| P4-S04 | Missing/extra/reordered/failed/skipped results or an empty plan shall not satisfy the selected suite. All local passes shall still report release BLOCKED, not complete Phase4. | Harness negative tests; assessment field |
| P4-S05 | Given the locked checkout, run `npm ci` and baseline suite with current evidence inventory/reference gates; preserve warnings and failures. | Installation log + baseline receipt |
| P4-S06 | Exercise available actual integration and final-image checks without substituting source inspection for artifact/browser/container behavior. Missing prerequisites shall remain failed/unassessed. | Integration/platform receipts, scope qualifications |

## Execution interface

- `npm run test:phase4`: harness contract/negative tests; no application server.
- `npm run verify:phase4:baseline`: harness, lint/build/core/smoke/coverage, Phase1/2/3 regressions, source inventory, physics references, help and claims.
- `npm run verify:phase4:integration`: accepted audit, remaining lifecycle/HTTP/worker fixes, recovery, export artifact read-back, browser/UI, PDF/download, UQ worker/archive and gateway.
- `npm run verify:phase4:platform`: dependency/launcher checks and the real production Docker-image test. Docker absence is a failing required platform observation, not skipped success.

These are **initial subsets**, not the entire release inventory. `packageScriptsSha256` identifies the actual inventory inspected. Final scope still requires `test:audit`, relevant research/Python/operational/CAD suites and exact-SHA remote matrix/launchers/platform execution. Do not present the subset runner as a release aggregator.

Run through npm so the harness uses the invoking npm CLI via Node (including on Windows), not shell-joined user arguments. Each command has a 15-minute timeout. Run suites sequentially: existing browser tests may rebuild shared dist and use fixed test ports. The child tests retain their own isolated DB/profile cleanup contracts. Do not point tests at user production data. An interrupted harness can leave an incremental receipt without final assessment; that receipt is incomplete and cannot authorize anything.

## Receipt identity, storage and privacy

Raw logs and incremental receipts are written under unique ignored `.cache/phase4/<suite>-<timestamp>-<pid>/` directories. They may contain test/project information and are not automatically published. Persist reviewed receipts, not caches or dependency trees, in the audit directory. Source identity hashes every git-visible non-ignored file except docs and changelog; documentation is deliberately outside executable-input stability. Dependencies/external data are not attested by that digest; lockfile, install/runtime and separate references remain required. Receipt hashes detect identity/corruption, not authorship or trusted remote execution.

Starting `npm ci` is a clean locked dependency installation in this workspace, **not** a clean OS image or proof of post-install offline operation. Linux Node22 observations do not prove Node20/24, Windows batch launchers, native Safari/iOS, Docker or optional Python environments. A declared workflow matrix is a plan, not an executed job result.

## Remaining full-Phase4 work

| Work package | Current starting evidence | Completion still required |
|---|---|---|
| U18b live ledger | Existing current-implementation inventory and 56 finding dispositions; rerun inventory check | Inspect source edition/locator/domain/provenance and actual patch/test/decision per record; inherited CAD56 debt stays separate |
| Cross-path integration | Execute existing browser, artifact, recovery, HTTP/gateway and UQ tests | Same-project/input/model identity across all three modes, climate/catalog/design/losses/eligible-energy/finance and reports; Python parity and full stale/invalid/old import coverage |
| Independent-reference closure | Execute current expression/component reference gate without changing it | Whole-model source projects/engines, nested-owner/serialization representability, inherited reference coverage and applicability; no new gate exception |
| Platform/install/offline | Locked local install; attempt dependency and actual Docker checks | Remote exact-SHA Node20/22/24, Windows install.bat/start.bat, final image, post-install offline, optional pinned Python, native claims only on actual platform |
| Three final reviews | Initial harness reviews recorded in status | Three final whole-system passes after implementation stabilizes, each with targeted investigation and corrective reruns |
| Final release gate | Current local command receipts | Entire applicable script inventory, coverage limits, exact-SHA job links/artifacts, tested rollout/rollback and resolved required stops |

## Stop and rollback rules

Release and automatic scientific/financial adoption stay BLOCKED while any required reference, project applicability, platform or Phase2/3 gate is missing/failed. Missing Docker stops final-image acceptance, not independent numerical or integration checks. Missing Python/reference datasets stop applicable reproduction claims, not offline TypeScript fixture replay. Never synthesize manufacturer/site/standards data to close a gate.

Rollback this starting slice by ceasing to invoke the added harness and removing its package entries/scripts/documentation in a focused patch. No production state or project migration is involved. Never disable an existing reference/auth/adoption gate as part of rollback. No commit, push, PR or release is authorized by the request to start Phase4.
