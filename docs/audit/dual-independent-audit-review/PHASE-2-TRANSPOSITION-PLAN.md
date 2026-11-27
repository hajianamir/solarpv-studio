# Phase 2 — named scalar transposition owner

Date: 2026-11-03. Scope: U07a unchanged scalar infrastructure; no automatic model adoption.

## Acceptance before edits

- T1: move the unchanged fixed-tilt screening calculation into a named core owner, retain the public waterfall export as a deprecated compatibility re-export, preserve absent/zero/NaN/infinite legacy semantics. Independently calculate a latitude/tilt matrix in Python; compare actual pre-change base source for exact compatibility, including adjacent boundaries. Name heuristic provenance rather than claiming pvlib transposition.
- T2: canonical/App/waterfall/roof use the same owner through the configured waterfall. Preserve 17-slot APIs and existing full-report fixtures. Re-run actual base comparisons, all configured consumers and exact-expression mutation-sensitive reference gate.
- T3: disclose the chosen scalar policy and its unvalidated scope in both UI languages/help, without adding a new field to old report JSON. Mark the unused legacy annual API's separate constant-gain policy explicitly deprecated rather than silently unifying different equations. Review actual imports to prevent it becoming an alternate production path.
- T4: ADR, guide/changelog, three self-review/followup investigations, acceptance-linked receipt and required lint/build/core/smoke/coverage/phase suites/reference/help/browser regressions. No release/conformity/full annual-profile parity claim.

## Domain and compatibility

Percent gain over horizontal GHI, tilt/latitude in degrees; default absent tilt16.8%, nonpositive tilt0%, latitude default35.69degrees. Internal heuristic uses bounded optimal tilt, saturating sine, excess-angle cosine and inherited one-decimal quantization. No weather, DNI/DHI/GHI decomposition or physical POA accuracy is implied. Finite physical characterization covers tilt0–90 and latitude−90–90; out-of-domain/nonfinite cases are compatibility tests only, not supported engineering inputs. No change to tracker simulation/1.168 anchor or constant25% legacy tracker gain.

## Rollback/stop

Pure extraction: restore original function body and remove imported owner together; persisted settings and numeric report shapes unchanged. Do not replace the deprecated legacy annual factor with the chosen owner without independent full-result evidence and an explicit adoption/migration decision. Overall Phase2 remains incomplete until all remaining packages are resolved. A missing exact-expression witness blocks completion of this slice, not grounds to weaken the gate.

## Execution outcome

T1–T4 implemented and verified within this unchanged-extraction scope.122independent Decimal cases,15exact-node mutation-sensitive witnesses and153base scalar comparisons pass; bilingual render and actual production browser checks pass. All18required broad commands ultimately pass; initial Phase1/Phase2 attempts failed on a missing shallow-history prerequisite and pass after exact-SHA fetch. No baseline expectation or numerical gate weakened. ADR-023 records three substantive self-review/followup investigations. Production U07a infrastructure is implemented; global persisted policy selection, alternate annual/API/profile harmonization/U02 and overall Phase2 remain incomplete. Release remains blocked. No commit/push performed.
