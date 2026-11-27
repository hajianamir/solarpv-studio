# Phase 4 — started, not complete

Task date: 2026-11-03. Base checkout: `16d3ff4056b528c2d9a5215a5e44703e58b49db7`.
Branch: `arena/e2cfedea-solarpv-studio`. No commit/push/release performed.

**Implementation:** starting local verification harness, negative tests, execution plan and receipts implemented. Full Phase4 implementation/traceability is partial.

**Verification:** baseline and integration subsets pass after acquiring required Git history; platform subset fails the actual container gate. Full-system acceptance remains partial.

**Release: BLOCKED.** Phase2/3 acceptance, inherited CAD56 independent-reference debt, external whole-model/applicability and required platform/exact-final-revision evidence remain unresolved. Starting this phase does not waive them.

## Subsequent Phase2/3 continuation

The kickoff receipts below are historical executable-input snapshots. ADR-027 Student-t retirement and archive v2 work changes executable inputs afterward; it requires fresh regressions and does not inherit the earlier PASS as current-revision acceptance. See `PHASE-2-3-REMAINING-EXECUTION.md`. No original receipt/digest is rewritten.

## Executed starting slice

See [execution plan](PHASE-4-PLAN.md), `phase4-start-verification-receipt.json` and `phase4-start-source-manifest.json`.

| Check group | Observation | Qualification |
|---|---|---|
| Locked install | `npm ci` PASS; Node22.22.3/npm10.9.8; 466 installed packages, npm reported zero vulnerabilities | Local locked install, not a clean OS image/security assessment or all supported Node versions |
| Harness negative tests | PASS for script selection, missing/unknown plans, incomplete/order/failed/skip results, error/signal status and changed-source assessment | Implementation checks; cannot authorize release |
| First baseline attempt | 10 PASS / 3 FAIL | Shallow checkout lacked historical sources required by existing Phase1/2/3 tests; actual failures retained |
| History correction | `git fetch --unshallow origin main` PASS | No branch switch, source changes, rewritten expectations or weakened guard |
| Baseline rerun | **13/13 PASS**, executable inputs stable | lint/build/core/smoke/coverage, Phase1/2/3, evidence/reference/help/claims checks; not scientific/phase acceptance |
| Integration | **11/11 PASS**, executable inputs stable | Accepted audit, remaining fixes, recovery, exports, browser/UI, PDF, download adapter, UQ worker/archive and gateway |
| Platform | Dependency/launcher check PASS; **container FAIL** with `spawnSync docker ENOENT` | No Docker executable; final production image not built/booted here. Never marked skipped green |
| Read-only remote snapshot | Base-SHA CI and foundation workflows in progress at observation | Not completed acceptance or CI evidence for this uncommitted patch |

Lint retains 93 existing warnings, zero errors. Coverage uses the existing c8 `src/engine/core/**` scope excluding `prng.ts`; this is not whole-project path or physical-model coverage. Export tests read actual DOCX/XLSX/JSON bytes and restore serialized JSON; PDF test reads a real five-page synthetic PDF with Persian text/source identity. Browser tests exercise actual Chromium flows, but the download-adapter test alone is a DOM/cleanup check. Climate gateway responses in browser regressions are mocked, not measured weather or provider accuracy evidence. Resource-load warnings in browser logs are retained, not hidden.

Run timestamp strings come from the sandbox clock, which reports 2026-11-27; they are preserved verbatim and are not a wall-clock attestation or a change to the task date. Original logs stay in ignored cache; reviewed receipts preserve outcomes and SHA256 references, not a remote durable log archive.

## Initial findings and disposition

| ID | Finding | Disposition / resume condition |
|---|---|---|
| P4-F01 | Shallow Git history makes historical regression tests fail before completing | Environment corrected by fetching history; both failed and successful attempts retained |
| P4-F02 | Docker unavailable | Final-image/platform acceptance remains FAILED/BLOCKED; execute the existing real container gate on an available Docker runtime |
| P4-F03 | Local test PASS does not close Phase2/3 or inherited references | Keep independent reference/applicability stops; no waiver or replacement goldens |
| P4-F04 | Current remote snapshot is base-only and pending | Obtain completed exact-final-revision jobs and artifacts after authorized publication; no implied current-patch CI |
| P4-F05 | Initial suites are not full final script inventory | Continue applicable audit, research/Python/operational/CAD and platform matrix; record exact commands and limits |

## Three internal starting-slice reviews and targeted follow-up

1. **Contract/identity:** reviewed canonical Phase4 package table, current package scripts and CI matrices. Follow-up inspected `scripts/ci-command.mjs`, report read-back and browser regression entry points. The harness uses explicit npm script names/definitions with the invoking npm CLI, not arbitrary shell-joined user commands. Receipt binds checkout, lockfile, package script definitions and executable-input content; docs/changelog are explicitly outside executable-input stability. Existing findings inventory remains a source/evidence map, not closure of all 56 supplied findings.
2. **Evidence/failure semantics:** exercised missing/reordered/extra/skipped/failed results, spawn-error/signal and source-change assessment. Follow-up traced the first real failures to absent Git objects with `git cat-file`/shallow status, fetched history, and re-executed unchanged tests. A later PASS did not erase the earlier failures. A selected-suite PASS always leaves release BLOCKED. The new harness is orchestration, not a numerical leaf or replacement reference gate.
3. **Runtime/delivery:** inspected actual command logs and artifact test output after sequential execution. Follow-up distinguished real browser/PDF/DOCX/XLSX/JSON checks from the DOM download-adapter test, recorded Docker ENOENT as failure and retained base-only remote pending status. Raw datasets, logs and install output stay ignored. No production/project schema change or new adoption path requires migration.

These are reviews of the **starting slice**, not the three final whole-system reviews required for Phase4 exit. No independent external certification is implied.

## Next work

1. Continue the full applicable final operational script inventory, particularly `test:audit`, research/API/Python, operational/energy and CAD reference suites; resolve failures without converting missing evidence into successful skips.
2. Extend U18b finding-by-finding traceability to actual patches, tests, editions/locators, domains and provenance, preserving inherited CAD56 debt separately.
3. Verify same-project/model identity across all three system modes and the full climate/catalog→design→losses→eligible-energy→finance→UI/report/export/API/Python path, beyond currently exercised scenarios.
4. Execute Docker, Windows batch launchers, Node20/24 and native platform/offline matrix where available; retain exact-SHA jobs and final-image health/artifacts. Do not equate workflow declarations with execution.
5. After implementation stabilizes, perform three final reviews with targeted investigation and emit the final scoped release decision. Missing Phase2/3 or applicable reference/platform evidence continues to block release.

Rollback: remove/stop invoking the newly added Phase4 orchestration scripts and package commands in a focused inverse patch. No production behavior, stored project data or numerical model is changed. Existing safety/reference/adoption gates remain intact.
