# Explicit reference-diode consumer — three internal review passes

Task date2026-11-03. Branch arena/1bdbc808-solarpv-studio, base c171538. Same coding agent performed these separate passes; not external independent review. Scope DC-01–04; existing pump/thermal work preserved. No new numerical model or formula.

## Pass1 — Contract/compatibility, followed by call-site investigation

Traced existing I–V component, public singleDiodeModel re-export, strict reference request schema, bounded numerical owner and canonical App project snapshot. Kept original legacy component body intact under a wrapper; legacy remains default. The new reference panel receives only language, not a selected module, conditions from legacy sliders, project setter or callback into annual/finance. Its only request comes from complete user JSON. Public validated evaluator remains the sole numerical entry.

Follow-up: compared source diff for the legacy component (only export/name plus selector wrapper), ran existing legacy SSR and actual numerical compatibility witnesses, and tested default→reference→legacy→reference in both locales. Legacy default metrics agree before/after; reference draft starts empty, resets on leaving/remount and does not synthesize nameplate parameters. Reference view is metric-only, so no sampled plot is falsely promoted to a solved reference curve. Existing legacy slider edits reset when the view unmounts; guide explicitly documents this rather than promising retention.

## Pass2 — Correctness/safety, followed by numerical-source/adversarial investigation

Re-examined ADR-025 and pinned bounded-diode fixture provenance: pvlib0.13.1 translation/Bishop88 references, numerical units/budgets/envelope and independently executed component/public comparisons. No reference acquisition or external scientific execution is newly claimed here: reuse executes the existing independently generated vectors. Source/record labels are required attribution, not authenticated manufacturer records. No new fit or measured beta/gamma constraint is introduced. Numerical source files, fixture numbers and tolerances are unchanged.

Follow-up: existing suite replays72external end-to-end cases,862component/policy vectors and66mutation-sensitive expression witnesses. Bilingual real browser compares Voc/Isc/Vmp/Imp/Pmp raw values with the independent fixture at the original2e-7+1e-8relative tolerance, not current-production expected values. Invalid JSON, missing fields, numeric string, unknown policy, iteration1exhaustion, negative-translated-current numerical-domain witness and oversize text produce no success metrics. Zero irradiance is distinct dark with zero power/no residual display. Every edit clears prior success before explicit reevaluation. Textarea plus handler bounds request length32768; existing evaluator budget remains at most384root iterations. No eval, network, storage or arbitrary optimizer added; heavy fitting remains on the authenticated scientific-service path if later implemented.

## Pass3 — Runtime/delivery, followed by produced-state investigation

Inspected context/browser/server cleanup, JSX escaping of user attribution, lack of persistence/adoption callbacks, input labels/directions/units and residual rendering. Temporary state is per mounted panel, avoiding retained assessed metrics after switching models or editing JSON. Both locales disclose supported envelope and unauthenticated/unmatched status, no fitting/fallback and no persistence/adoption. Contextual help, guide, changelog and ADR-033 reflect the explicit UI while retaining ADR-025's historical numerical-only scope note.

Follow-up: production Chromium runs in isolated contexts with providers blocked; checks page errors, unchanged Iranian NPV and absence of reference settings in actual local-save JSON, then remount default. Added new browser suite to existing combined phase1 browser command already configured in Ubuntu CI; no remote CI execution claimed. First verification attempts found missing sandbox dependencies (`tsc` unavailable), not a passing gate. Installed from locked npm ci and fetched full Git history for historical comparison prerequisites, then reran. No package/lockfile dependency upgrade or browser timeout weakening. The bounded comparison receipt changes only a stale consumer-limitation string after the new UI; numerical observations/hashes remain unchanged.

## Disposition/rollback

Final gate results/source identity are in `phase3-diode-consumer-verification.json`. Remove only selector/reference-panel integration to roll back; no project data migration. Preserve old qualifications and keep invalid-reference failure separate from legacy output. U05 fitting, physical parameter applicability and other consumer/service/calibration/HTTP work remain open; Phase2 INCOMPLETE, Phase3 PARTIAL, release BLOCKED. Native Windows/Docker/exact-source remote CI, inherited reference debt and existing save reliability stops are not closed by these desktop browser tests. No commit/push/PR/merge/release performed.

## Final gate disposition

Final local baseline13/13 and integration11/11 PASS, with stable executable identity `8ae9600a2068bee492ef536cc0410478cca7100e212e54d9a235510baa1109b0`. Combined phase1 production-browser command passes existing report/financial checks, pump persistence in both locales and new reference-diode journeys in both locales. Lint93warnings/0errors. The new numerical solver/schema, legacy numerical API and independent fixture are byte-identical to HEAD; their SHA256 values and raw gate logs are recorded in the receipt. DC-01–04 VERIFIED_WITHIN_SCOPE; implementation IMPLEMENTED; release BLOCKED. Raw timestamps differ from task date and are retained. No final-source remote/native platform certification.
