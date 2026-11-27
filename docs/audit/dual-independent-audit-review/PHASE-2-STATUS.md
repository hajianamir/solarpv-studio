# Phase 2 status — scoped repairs, not complete

## Latest scoped implementation — 2026-11-03

**Overall Phase 2: INCOMPLETE; release/full-validation claim BLOCKED.** See [research and three-pass review](PHASE-2-RESEARCH-AND-REVIEW.md), ADR-013 through ADR-019, and `phase2-finance-verification-receipt.json` for the latest evidence. Earlier tables below are retained as the preceding snapshot, not a current assertion that no thermal code changed.

| Package | Current implementation state |
|---|---|
| U02 | Shared MPPT hot-temperature fallback replaces ambient+25; explicit override retained. Scalar annual owner now preserves cold gain and signed gamma; 24 pvlib component cases, independent MPPT full-result fixture and 9 mount/NOCT parity cases. Existing signed waterfall override retained. Synthetic seasonal temperature now reverses in the south and is flat at the equator; zero PSH has a neutral explicitly unavailable thermal-yield ratio. Canonical metadata preserves gain sign. 32 independent numpy/pvlib policy-integration cases and actual XLSX/JSON profile readback added. **Partial:** complete common annual policy/API/App/HTTP reconciliation and global persisted policy migration remain open; no measured-weather validation. |
| U12 | **Unavailable alternative implemented:** current API emits null/unassessed protective angle and separation. Legacy values isolated as diagnostics; bilingual installation guidance and actual browser unavailable rendering tested. No standards numerical implementation claimed. |
| U14 | Shared uplift plus moment/capacity/FoS now forwarded, hard-coded clearance reconstruction removed, sensitivity reactions evaluated through shared inputs. Underlying shared model unchanged. **Wrapper defect repaired;** broader physical and cross-pipeline applicability not established. |
| U10 | Candidate/report share one voltage-drop evaluator. Explicit equivalent X/arrangement/source required for AC acceptance; unknown or exhausted candidates blocked. 144 Decimal component conditions and 81 candidate cases; optional UI/schema inputs. Existing ampacity/protection assumptions remain qualified. |
| U13 | **Unavailable/contained:** unsupported Broms domain cannot produce a safe pile decision. Legacy predicate is diagnostic only; structural consumer and recommendation/sensitivity claims fail closed. 144 cases include 85 former green-screen witnesses. Equations retained, not physically validated. |
| U16b | **Partial repair:** Iranian ledger retains fractional million-Toman amounts through NPV/IRR; 18 independent Decimal ledgers. New shared simple-LCOE owner and strict availability preserve zero vs null, full-precision scenarios, explicit currency/rate/energy basis and financial-adoption ineligibility. HTTP consumes degradation and rejects unsupported schedules; 42 independent Decimal cases plus actual HTTP/UI/browser checks. Deprecated numeric adapter retained. Other-ledger economic policy/migration/precision and complete financial acceptance remain open. |
| U01b | **Supported fixes implemented:** per-foot elevation exponent correctly converts SI; omitted/explicit3m default unified; invalid exposure/height/Kd/Kzt rejects, no hidden .5 clamp. Independent altitude/pressure fixtures and Kd-once regressions. **Open:** normative exposure/aerodynamic applicability and complete persisted model-policy migration; legacy coefficients are not newly validated. |
| U09b | **Partial:** MPPT hot-temperature ownership repaired. Raw per-channel operating/legacy-Isc acceptance now replaces rounded-current comparisons in direct/array/central paths; 40 exact independent Decimal threshold cases and adjacent-float false-pass witnesses. Unknown evidence remains unassessed. Rating-basis-specific factors/conditions and complete catalog/import/HTTP reconciliation remain open. |
| U07a | **Partial:** duplicated clipping screen extracted unchanged to one owner, preserving annual rounding/pre-clamp raw field and waterfall raw precision. 14 independent Decimal arithmetic characterizations and exact-node fixtures, **not physical validation**. Common transposition policy and complete 17-slot migration remain open implementation work. |

## Previous follow-up snapshot

2026-11-03; baseline `0c4d7cadc7db6001459ea36fdf9a3d1403179a71`, branch `arena/6a50ab5f-solarpv-studio`. Prior edits and assessment artifacts preserved. **Phase 1 exit-review defects repaired; Phase 2 STARTED, NOT COMPLETE.** This is not release approval or a claim that missing standards/manufacturer evidence has been acquired.

## Phase 1: remaining defects found and repaired

The earlier completion label did not catch these issues. They were reproduced by new regression cases and fixed rather than explained away:

| Gap | Repair and acceptance |
|---|---|
| Invalid explicit MPPT allocation could be evidence-complete because it was not assumed wiring | Internal readiness now requires `allocationValid`; both PV design and MPPT compatibility pass the existing allocator's validity. Bad/missing validity remains unassessed; normal positive evidence and numerical overload blocking retained. Unit tests exercise both sizing consumers. |
| Manufacturer source date was format-only | Non-null source dates must be real ISO calendar dates; invalid leap-day/month/day reject in metadata, project and catalog validation. Null dates remain unknown/readable/unassessed. No current-clock or network dependence. |
| Structural header/Markdown still implied conformity or governing-code applicability | Remaining compliance/governing-code labels replaced with background references and UNASSESSED applicability. Shared-module assertions of no defaults/universal site parity corrected. Claims guards and actual UI report assertions added. |

No actual manufacturer coefficient, tariff effective date, normative source clause or physical accuracy was invented. The old 56-reference CAD deficit and normative/model-applicability blockers remain open. ADR-012 records compatibility: old JS readiness callers missing validity fail closed; impossible dated evidence must be corrected or removed from a retained original project copy. No mandatory persisted field added.

## Phase 2: first implementation slice (U14a)

`recommendFoundation` now returns `shared.upliftPerPostKn`, removing its independent `qz × area × 1.15 / posts` approximation. The generated recommendation report therefore uses the same net reaction as the shared evaluator for identical inputs. Optional shared geometry/dead-load fields are explicitly typed. Existing callers continue to work.

**Evidence:** 108 synthetic consumer cases span ground/shed/roof, tilt 0/30/60°, wind 0/120/180 km/h, 2/4 posts and 20/40 kg module mass. In 72 cases the original wrapper expression disagrees with the shared value. Exact shared/wrapper uplift equality, lateral/compression preservation, input/Markdown readback and generated qualifications pass. The actual production-browser recommendation report is compared against the shared evaluator using its displayed report inputs.

Shared structural/foundation formula ASTs are unchanged versus the assessment baseline. These are **contract-consistency tests**, not independent engineering reference cases. No aerodynamic coefficient, soil model, safety factor or wind-elevation interpretation was replaced. Success means the wrapper no longer contradicts its authoritative shared reaction—not that the reaction is safe, standards-conforming or independently validated.

### Phase 2 queue / stop conditions

| Package | Current disposition |
|---|---|
| U14 shared uplift | **Started:** duplicate uplift expression removed; report propagation tested. **Still open:** wrapper moment/capacity/allowable-moment reconstruction and sensitivity, full cross-path actual-input reconciliation, broader model/reference evidence. Do not call all structural pipelines equivalent when defaults/input provenance differ. |
| U02 thermal owner / hemisphere / signed annual energy | Next supported numerical work: separate design and annual contracts; acquire/execute applicable component references, define synthetic hemisphere/equator policy and preserve full-year/context gates. No thermal formula changed in this turn. |
| U09b rating-specific electrical rules | **BLOCKED for unsupported manufacturer bases:** source/conditions/rating semantics must justify each comparison. Readiness fixes do not authorize universal removal of 1.25 or invented measured coefficients. |
| U01b wind/Kz | **BLOCKED:** applicable edition/category/risk/units/height minimums and complete Kd pressure chain need authoritative references; no blind coefficient swap. |
| U10 impedance candidate search | Open: declare arrangement/equal-sharing model and independent references before changing R/X or search feasibility. |
| U12 LPS / U13 Broms | **BLOCKED affected model claims:** normative geometry/topology/regime/source evidence missing; no unsupported angle/kc or denominator replacements. |
| U16b finance precision / U07a scalar consolidation | Open under the original Phase 2 plan; no monetary rounding, solver or scalar-model replacement in this slice. |

The original four-phase plan remains authoritative. This file records progress, not a replacement roadmap or new phases.

## Verification executed for this follow-up

Per-command logs: `.cache/phase2-start/` (regenerable, not committed). Durable hashes/outcomes: `phase1-followup-phase2-start-receipt.json`.

| Command / gate | Result and scope |
|---|---|
| `npm run lint` | PASS, 93 warnings, no errors; includes client and Node type checks |
| `npm run build` | PASS; production bundle used for focused browser |
| `npm test`, `npm run test:smoke` | PASS; core tests and in-memory smoke, not proof of field accuracy; retired bifacial reference WARN retained |
| `npm run test:coverage` | PASS; existing core scope: 91.34% statements/lines, 66.13% branches, 72.81% functions |
| `npm run test:phase1` | PASS including invalid-wiring/calendar/schema/catalog regressions and unchanged numerical ASTs in readiness consumers |
| `npm run test:phase2` | PASS: 108 synthetic contract cases, report/input readback, 72 original-defect witnesses, unchanged shared reaction equations |
| `npm run test:phase1:browser` | PASS: actual three-mode capacity/energy/PR and SVG/PDF/report artifacts, plus actual structural recommendation report/shared reaction comparison |
| `npm run test:browser` | PASS broader existing UI/import/export/multitab/unsizable/mocked-provider suite |
| `npm run test:operational:browser` | PASS with pinned Python runtime, adopted-year/ledger block and existing context invalidation; no automatic Research adoption |
| `npm run test:accepted-audit`, `npm run test:recovery`, `npm run verify:exports` | PASS; persisted and exported boundaries retained |
| `npm run verify:engine-claims`, `verify:help`, `verify:physics-registry`, `verify:phase1-evidence` | PASS; 134 current sources / all 56 finding dispositions accounted for; inventory is not a whole-model certificate |
| `npx tsx scripts/structure-verify.ts` | PASS existing synthetic/analytical foundation variance screen, not site validation |
| Targeted boundary `c8` | PASS, 100% statement/branch/function/line coverage for exercised `src/contracts` and `src/presentation` files; not whole-project coverage |
| Current-baseline `verify:physics-reference-gate` | PASS; no new/changed equation requiring a reference record; duplicate wrapper expression removed, underlying shared equations unchanged. Gate not edited or waived. |
| Historical reference gate `PHYSICS_DIFF_BASE=71a7c2b…` | **FAIL, 56 missing CAD reference records**, reproduced. No fabricated external goldens or waiver. |
| `git diff --check` | PASS |

No Docker, native Safari/iOS, deployment, field validation, standards conformity or full-release approval is claimed. Do not merge as a fully green release while the inherited independent-reference gate is red.

## Compatibility / rollback

Regenerate and re-review old foundation recommendation exports: net uplift can materially differ from the former wrapper approximation. The input schema stays backward-readable, and source metadata is never guessed to repair an invalid date. If a propagation regression appears, disable the affected recommendation/report rather than reinstate the known-conflicting multiplier or false-compliance text. See ADR-012 for the scoped rollback and remaining source stops. No commit, push or merge performed.
