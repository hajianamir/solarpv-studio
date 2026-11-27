# Phase 2/3 remaining work — prioritized continuation

Date: 2026-11-03. Branch `arena/e2cfedea-solarpv-studio`, base `16d3ff4056b528c2d9a5215a5e44703e58b49db7`.

Preserve the uncommitted Phase4 kickoff and historical receipts. Return to unfinished implementation rather than treating Phase4 runtime passes as earlier-phase acceptance. No commit/push/release authorized. The canonical Phase2/3 tables and model evidence cards remain authoritative; this is an execution queue, not a reduced acceptance scope.

## U19 explicit steady-duty energy continuation

Implemented the separate opt-in duty arithmetic/API and an initially empty temporary UI consumer; no legacy hydraulic/nameplate/monthly numerical changes. ADR-030, the pump-duty plan/reviews and `phase3-pump-duty-verification.json` record scope and evidence. Equipment/chronology/water/source applicability and durable project model selection remain open; no guarantee/adoption or whole-package closure. Earlier receipts do not attest this new executable source.

## IRR assessment continuation

U16b/U16c now include the opt-in bounded conventional periodic IRR assessment and an explicit current Iranian UI consumer. See ADR-029, `PHASE-2-3-IRR-ASSESSMENT-PLAN.md`, `PHASE-2-3-IRR-REVIEWS.md` and `phase23-irr-verification.json`. This does not close all-root/other-consumer/irregular-time/financing work or whole-package acceptance. Prior receipts below are historical for this new executable source.

## Financial precision continuation

Additive U16b/U16c benefit-proxy precision work follows the U20 containment below. See `PHASE-2-3-FINANCIAL-PRECISION-PLAN.md`, ADR-028 and `phase23-benefit-verification.json` for acceptance, current evidence and limits. No phase/release completion is implied.

## Previous slice: U20 retired Student-t policy and archive compatibility

Risk: behavioral, financial containment, serialized archive and UI/worker boundary. Numerical Gaussian formulas deliberately unchanged. ADR-027 records the decision, source evidence, compatibility restriction and safe rollback.

| Acceptance ID | Required observation | Owner / tests |
|---|---|---|
| P23-U20-01 | Public Student-t sampler and financial engine refuse execution, never return a substituted Gaussian result | Shared contract guard; direct retirement tests; retained independent CDF defect witnesses |
| P23-U20-02 | Runner refuses unsupported family before Worker allocation; actual Worker also refuses direct t messages; unsupported result family cannot be accepted | Runner/shared engine and actual isolated Worker tests |
| P23-U20-03 | Genuine historical v1 t archive stays readable and byte-semantically unchanged with valid hashes; v1 replay is disabled even with matching source; no mutation of imported file | Historical baseline generator, parser/helper and actual browser import tests |
| P23-U20-04 | New v2 archive persists policy, enforces matching Gaussian request/result and exact source before replay; unknown version/policy/family fails | Archive round-trip/tamper tests and production browser replay |
| P23-U20-05 | Gaussian deterministic results retain exact actual-base hashes in powerplant/ongrid/offgrid; no finance/energy adoption | Historical fixture plus mode tests, worker parity and existing E2E adoption assertions |
| P23-U20-06 | Bilingual policy disclosure, documentation, CI regression route, strict types, broad regressions, evidence inventory and physics gate pass; preserve failures/limits | SSR/browser, existing commands and current receipt |

Not goals: implementing a new t-CDF/dependence calibration, changing Gaussian quantiles/r² rankings, new confidence intervals, or claiming all U20 complete. No source-derived coefficient is relabeled measured.

## Remaining Phase 2 queue

| Package | Supported next implementation | Missing-evidence stop retained |
|---|---|---|
| U02/U07a | Reconcile explicit annual screening vs chronological contracts across direct/App/HTTP, version selectors and invalidate stale outputs | Synthetic seasonality is not sourced hourly/field model validation; retain existing shared thermal owner |
| U16b | Finish full-precision derived financial metrics and explicit solver/valuation status; consolidate only compatible kernels with Decimal/cashflow fixtures | Do not infer official tariffs/assessed discount rates; full debt/DSCR/root policy needs separate evidence |
| U09b | Propagate supported rating-basis conditions through per-channel catalog/project/HTTP consumers | Unknown manufacturer terminal/array-current basis stays unassessed; no universal factor swap |
| U01b | Persist model/assumption identity and complete source/applicability traceability | No new normative exposure/aerodynamic approval without applicable edition/category/reference chain |
| U10/U12/U13/U14 | Preserve existing candidate and unavailable/containment repairs; finish affected export/consumer/reference gaps | No LPS angle/kc or unsupported Broms regime invented; underlying structural adequacy remains unassessed |

## Remaining Phase 3 queue

| Package | Next implementation/evidence action |
|---|---|
| U20 | This slice closes retired-path execution/archive containment only. Calibrated scenarios, defensible quantile variability intervals and any t replacement remain separate |
| U05 | Design explicit consumer/model selector and legacy adapter; fit failures/physical bounds/coefficient residuals before operational fitting |
| U07b/U08 | Reuse acquired real-weather/reference cases for explicit annual evaluator and opt-in parameterized thermal/IAM boundaries; southern cases and applicability still required |
| U17 | Enforce screening-only restrictions or separately introduce infinite-sheds option with matched geometry and versioned persisted inputs; no retired target tuning |
| U11b/U09c | Complete metadata/readiness and catalog provenance round trips, preserve unknown measured coefficients; site/normative/manufacturer acquisition still blocks their applicable claims |
| U15 | Build a physical control-volume balance only after matching independent multi-regime cases/geometry/flow; no one-point 1.417 tuning or gradient-floor claim |
| U19 | Explicit hydraulic/shaft/motor/DC duty boundaries and necessary aggregate energy-deficit assessment now implemented with temporary opt-in UI (ADR-030). Still require sourced pump/motor/VFD curves/limits, chronological energy/water feasibility, qualified PV policy and durable project/model/provenance selection |
| U16c | Compare all financial paths by project/equity, nominal/real/currency/debt basis; complete independent root and unrounded-ledger coverage |

## Review and stop policy

Three internal reviews each followed by targeted source/negative/runtime investigation are recorded with the slice receipt. Their scope is the current change, not final whole-project certification. New empirical/numerical work must bring its own governing source/domain/units, tolerances, independent fixtures and required mutation checks. Do not transform unsupported-model retirement into a validation claim.

Phase4 kickoff receipts retain their historical executable-input digests. These new executable changes require fresh verification; prior Phase4 passes are not evidence for this changed tree. Missing Docker/native-platform/full-reference gates remain blocked independently of this repair.

## Current slice verification and internal reviews

Implementation: retired-path policy and archive compatibility implemented. Verification: targeted policy/archive/actual-Worker/production-UQ-browser checks pass, as do all 13 baseline commands. The broader integration run retained one project-save Ctrl+S toast timeout at `scripts/test-browser-regressions.ts:715`; the exact unchanged browser suite then passed in isolation. No test or production save code was weakened/changed. The underlying timing cause is not established: record **P23-RT01** as intermittent/unresolved stability evidence, not a proven repair. The original integration receipt remains FAILED_OR_INCOMPLETE; the isolated successful rerun is separate. Release remains BLOCKED.

1. **Contract/compatibility review:** traced direct sampler, financial engine, Worker/runner, result validator, archive parser/writer, actual UI and source identity. Follow-up executed the actual base engine/archive source to generate a genuine historical t snapshot, then verified unchanged payload/hashes and exact Gaussian hashes in three modes. Selected a separate strict v2 archive, rather than silently changing v1 semantics or executing unsupported historical models.
2. **Scientific/safety review:** examined the former latent-kurtosis benchmark and refetched the pinned SciPy Student-t CDF source; its SHA256 matched the acquired manifest. Follow-up confirmed `_cdf` uses `sc.stdtr(df, x)` and retained the independent df=5 witness: t CDF at its 1% quantile is ~.01, whereas the normal transform gives ~.0003828154. Heavy latent tails are not uniform marginals. Added public/actual-Worker refusal, plausible unsupported-reply rejection and rehashed unknown-policy negative tests; no numerical tolerance changed.
3. **Runtime/delivery review:** exercised production Chromium v2 download/replay, genuine legacy-t and same-source v1-Gaussian imports, cancellation, stale inputs, asset failures and offline Worker. Follow-up inspected real test logs, investigated the broad save timeout through its exact assertion/App save message and isolated rerun, and retained both outcomes rather than changing the assertion or inferring a fixed cause. The Node22/Linux result does not certify Windows/native Safari or Docker; prior Phase4 reference/platform stops remain active.

See `phase23-uq-retirement-verification-receipt.json` for source/fixture/log hashes, exact command outcomes, failed attempt and residual scope. U20 calibrated-interval work and all outstanding Phase2/3 package gates remain open. No commit/push performed.
