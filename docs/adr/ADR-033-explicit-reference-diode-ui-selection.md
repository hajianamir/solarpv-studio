# ADR-033 — Explicit bounded-reference I–V metrics consumer

Date2026-11-03. Bounded UI selection only; supersedes ADR-025's no-I–V-consumer statement, not its numerical/applicability limits.

## Decision

Keep `calculateSingleDiodeCurve` and existing illustrative legacy plot/controls/metrics unchanged as the default view. Wrap it in an explicit localized selector. Selecting `desoto_reference_bounded_v1` opens a separate empty `ReferenceDiodePanel` accepting a complete strict request JSON. This is a continuous metric assessment, not a sampled curve renderer or datasheet fitter. No catalog/nameplate parameters or legacy coefficients are copied, matched, inferred or used as fallback.

Only the existing public validated `evaluateReferenceDiode` runs on an explicit evaluation action. The input string is limited to32768characters by control and handler; solver/root schema and iteration bounds remain unchanged. This small bounded calculation (at most384root iterations) is not new heavy fitting/scientific service orchestration. Any future heavy fitting must use the authenticated scientific service path, not extend this browser into an unbounded optimizer.

Edits immediately discard the prior result; clearing or leaving the reference view discards draft/results. Dark remains valid zero generation, unavailable results never display successful metrics. Metrics retain raw double precision with six-decimal display; residual units remain distinct. Required source/record labels are escaped user attribution, not authenticated manufacturer data or proof of operating-condition applicability.

## Isolation and compatibility

Selection is temporary/local to the I–V tab; no project schema, input snapshot, report result, annual energy, finance, calibration, HTTP or catalog migration is added. Remount/default return to the legacy view. Leaving a view remounts its controls: legacy slider edits also reset; do not promise retention. Both views retain their qualifications. This is not replacing the old model's known failure or satisfying the complete U05 fit/model-validation package.

The existing numerical reference pool, tolerances, source identities and66expression witnesses are reused without alteration. Only the comparison receipt's textual consumer limitation is updated; numerical observations remain unchanged. Production browser in both locales compares full-precision metric values to the pinned independent fixture, exercises failure/dark/stale/reset paths and checks unchanged legacy metrics/financial NPV/no new project settings.

## Rollback and stops

Remove selector/reference-panel integration and restore the original legacy component export; preserve legacy warnings and all numerical owners/tests. No durable data migration is needed because no new project inputs/results are saved. Re-run phase3 numerical, bilingual browser and baseline/integration checks. Never replace invalid/unconverged reference input with legacy output. Manufacturer/site provenance, general fitting/parameter residuals, measured beta/gamma constraints, other consumers and whole U05/Phase2/3 remain open. Native/remote/platform/whole-model release gates remain independently blocked.
