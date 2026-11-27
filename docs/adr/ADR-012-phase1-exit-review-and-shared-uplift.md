# ADR-012 — Phase 1 exit-review repairs; Phase 2 shared-uplift start

Date: 2026-11-03. Status: accepted for the changes below. Baseline remains `0c4d7cadc7db6001459ea36fdf9a3d1403179a71`; earlier dirty Phase 1 work is preserved. This is not a claim that Phase 2 or model validation is complete.

## Exit-review findings and Phase 1 repairs

The previous Phase 1 completion statement was too broad for three concrete edge cases:

1. Explicit invalid MPPT allocations set `isAssumed=false`; readiness checked assumed wiring but not allocation validity. A source-complete synthetic record could therefore have evidence-complete status beside a failed numerical allocation. Add required `allocationValid` to the internal readiness input. Both PV and MPPT consumers pass the authoritative allocator's `isValid`. Invalid or omitted validity is unassessed; no string allocation or current equation changes.
2. Rating `sourceDate` accepted impossible dates such as 2026-02-30. Retain null for unknown dates; validate non-null ISO dates against their actual UTC calendar representation. This parses the provided date only—no current-clock or network dependency. Calendar validation is metadata validation, not manufacturer authentication. Unknown, format-invalid and calendar-invalid remain distinct from a known valid date.
3. Structural recommendation header and generated Markdown still said compliance/governing design codes. Replace with background references and explicit unassessed applicability/conformity. Correct the shared module's unsupported claims of no defaults and universal test/UI parity. Existing optional defaults are not measured site evidence.

Acceptance P1-X01: valid, invalid and absent allocation validity across both consumers; malformed project/catalog source dates reject; unknown dates retained, leap dates accepted only in real leap years. P1-X02: header and actual report cannot reintroduce the corrected conformity wording. Preserve positive valid-evidence behavior, legacy numerical blocking, project recoverability and all qualifications.

Compatibility: no persisted mandatory field added. Existing evidence with null dates remains readable and unassessed. Previously accepted impossible non-null dates now reject as invalid metadata; preserve the original project file and correct/remove that optional evidence rather than invent a date. Old JS callers omitting `allocationValid` now fail closed to unassessed; TS callers must supply it. No physical model is affected.

## Phase 2 decision — U14 first slice

Owner: `recommendSharedFoundation` → `calculateUnifiedTableLoadsAndReactions`; wrapper `recommendFoundation` and generated `reportMarkdown` must forward the shared net uplift reaction for the **same input**.

Previous wrapper substituted `qz * tableArea * 1.15 / posts`, discarding the shared reaction's tilt, dead load, overturning and rooftop context. Remove that duplicate expression and return `shared.upliftPerPostKn`. Do not replace the shared wind/soil/reaction equations or interpret this contract correction as validating them. Source of the forwarded value is the existing shared implementation; exact identity is the required tolerance, not an independently established engineering accuracy.

`StructuralRecommendationInput` now types the shared optional module count/mass, racking dead-load density and sloped width rather than relying on an untyped cast to carry them. Existing UI paths retain their previous input values/default behavior; do not pretend that this also supplies absent site evidence or reconciles all independent structural snapshots. The actual UI recommendation report is checked against the shared evaluator using the same serialized inputs. Its existing caller in RFC reports consumes the corrected reaction as well.

Acceptance P2-U14a:
- Exact uplift forwarding in 108 synthetic cases across 3 environments, 3 tilts, 3 wind speeds (including zero), 2 post counts and 2 module masses; 72 cases expose the removed expression's disagreement.
- Lateral and compression fields remain shared, report text contains the same reaction, input/report file readback retains it, actual production-browser report uses the same input/reaction.
- Shared foundation and structural reaction formula ASTs unchanged against baseline. The only numerical expression removed is the duplicate wrapper reaction; no new physical equation or coefficient is introduced and no independent golden is fabricated.
- Missing governing sources and independent full-model references remain BLOCKED. Current-baseline formula gate success is not inherited CAD reference closure.

## Continuing Phase 2 scope and stops

U14 is **started, not fully closed**. Wrapper reconstruction of moment/capacity/allowable moment and sensitivity policy remains legacy screening and needs explicit source/application review. A note in the generated disclaimer says so. Do not call the entire structural pipeline consistent when UI/core snapshot paths use different geometry/dead-load inputs. New independent numerical strategy work remains separate.

Next safe packages: U02 thermal hot-design/annual signed-energy input ownership and hemisphere policy with independent component references; U09b rating-specific current rules only for documented manufacturers; U10 candidate impedance under declared arrangements. U01b wind, U12 LPS and U13 Broms stay blocked where normative applicability is missing. No blind Kd, elevation, Broms-denominator, parallel-X or GCR replacement.

## Flag / rollback / verification

No runtime switch offers the known-wrong wrapper coefficient as an option. A regression should disable the recommendation/report or restore a prior qualified artifact, not silently revive a conflicting uplift reaction. Preserve base inputs and provenance; old exported reactions are historical and should be regenerated/reviewed. Source calendar/allocation checks fail closed and must not be relaxed to force evidence green.

Run required lint/build/core/smoke/coverage plus Phase 1, Phase 2, real production-browser/report, operational, recovery/export, claims, source-inventory and reference gates. See `PHASE-2-STATUS.md` for actual outcomes. Synthetic parity and unchanged-equation tests prove contract consistency only, not standards conformity, site accuracy, physical safety or field validation.
