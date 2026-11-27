# Phase 1 — completed contracts and evidence containment

Updated 2026-11-03. **Phase 1 contracts/containment implemented; blocked model-validation dispositions retained. NOT release approval.** Baseline `0c4d7cadc7db6001459ea36fdf9a3d1403179a71`; branch `arena/6a50ab5f-solarpv-studio`. Completion means the Phase 1 boundary corrections, explicit decisions, readiness states, qualifications and acceptance checks below—not that every audited model is validated or every later-phase defect is fixed.

## Follow-up exit review (2026-11-03)

A subsequent review reopened three concrete gaps behind the earlier completion label: invalid explicit MPPT allocations could appear evidence-complete, impossible non-null source dates passed format-only validation, and the structural recommendation header/Markdown still implied governing-code compliance. These are now repaired, not dismissed as external evidence blockers. Both sizing consumers propagate allocation validity; calendar/schema/catalog tests cover real/invalid leap dates; actual UI recommendation report and claims guards retain unassessed applicability. ADR-012 records decisions, compatibility and rollback.

The independent-source blockers below are still real and unresolved. This follow-up does not invent licensed standards/manufacturer evidence or close the 56 inherited CAD references. Phase 2 has now started with the U14 uplift-forwarding slice; see `PHASE-2-STATUS.md` and the new follow-up receipt for current verification. Earlier completion receipts remain historical snapshots, not hashes of today's modified sources.

## Authoritative deliverables

- `REPORT-AND-FOUR-PHASE-PLAN.md`: original assessment, four phases and complete finding crosswalk; historical observations are not rewritten as new validation.
- `PHASE-1-CONTRACT-GUIDE.md`: API/client migration, rating basis, capacity/annual-energy/PR definitions, economics/sensitivity, compatibility and rollback.
- `docs/adr/ADR-011-phase1-contracts-and-evidence-containment.md`: accepted decisions and evidence stops, including original/A/B wind candidates and blocked source applicability.
- `current-implementation-evidence.json`: hash-checked inventory of current engine TS, services Python and boundary-contract sources, interfaces/input locators, reference versions/fixture IDs and unresolved whole-model applicability. Registry declarations are distinguished from implementations; no entire module is certified by presence of a component reference.
- `current-finding-dispositions.json`: all 26 Audit A + 30 Audit B findings retain source owner, disposition and verification plan. U14 numerical uplift replacement is Phase 2 per the detailed implementation table; the original crosswalk's P1 label is a scheduling inconsistency, not permission for an unsupported equation replacement.
- `phase1-completion-receipt.json`: final source/log hashes, outcomes and exclusions. Earlier slice receipt is historical, not current completion evidence.

## Live current-implementation standards / evidence / readiness matrix

| Package | Current implementation and evidence | Phase 1 disposition / continuing stop |
|---|---|---|
| U01a wind | ADR-011 records legacy SI inputs, feet-like elevation coefficient, Kz omitted/explicit default, category/height uncertainty, Kd location and full pressure/reaction consumer chain. Original/A/B candidates are separate diagnostics. Structural UI/report carry unassessed site/source applicability. | **Decision/containment complete; numerical validation BLOCKED.** No coefficient swap. Applicable edition/category/risk/wind-speed basis, primary height/coefficient tables and independent full-chain references remain missing. |
| U03 capacity | Named summary adapter separates actual module DC, installed inverter AC and requested AC. SLD and Iranian screen use actual DC. Unit cases cover ratios 1/1.25/1.5 and module-count×Pmp identity; actual browser covers all three system modes. | **Implemented/tested.** Exported SLD SVG and actual browser print/PDF reopen with correct DC and screening qualifications. Earlier slice prose incorrectly presumed a dedicated SLD PDF generator; the actual print path is now verified. |
| U03 annual energy | Existing full-year/context/configuration/staleness adoption gate unchanged. Iranian screening uses eligible annual Financial screening basis, not day×365. Adopted operational ledger blocks the scalar model because it cannot value imports/dispatch. | **Implemented/tested.** Production browser covers three screening modes; actual annual adoption browser asserts scalar block. Operational regressions retain partial/overlap/context/nonenergy rejection, leap year and import-cost/NPV behavior. No automatic Research adoption. |
| U04 API azimuth | `presentation/poaAzimuthRequest.ts` normalizes all explicit/generic aliases and rejects conflicts/unknown conventions; v1 implicit south-zero default preserved with response contract/deprecation metadata. Library remains north-clockwise. No saved-project angle migration. | **Implemented/tested.** Direct and real HTTP compass/wrap/alias/invalid/legacy tests; existing accepted API and browser/persistence consumers pass. External client inventory remains inherently unknown; guide specifies migration. |
| U06a PR | HUD uses waterfall PR with explicit effective-POA reference denominator and net AC numerator. Compound stage multiplier and derating are distinct. Zero preserved; no universal ceiling introduced. Gain/zero/denominator characterization tests and browser equality. | **Contract/labels complete.** Legacy branded bounded API and negative-thermal override clamp are explicitly characterized Phase 2 debt, not a universal PR law or corrected cold-gain physics. No numerical formula replaced. |
| U09a electrical | Optional `contracts/electricalReadiness.ts` schema records basis/scope/source/date/conditions/multiplier and matching A-valued ratings. Catalog/project snapshots preserve it. Missing date/coefficients, generic ratings, unsupported basis and assumed or invalid wiring remain **unassessed**. Non-null source dates must be real ISO calendar dates. Per-channel allocation and overload blocking retained. UI/report expose readiness; conformity stays null. | **Schema/readiness containment implemented/tested.** Legacy 1.25 equations and numerical flags remain qualified aliases, never evidence approval. Enphase primary example is retained as a basis-specific counterexample, not applied universally. Basis-dependent factor conversion and manufacturer data acquisition remain BLOCKED/Phase 2–3. |
| U11a/U18a claims | Electrical/Broms/foundation/structural conformity wording corrected; analytical elevation/soil/seismic assumptions qualified in UI/reports; internal harmonic/null-conformity guards retained. Tracker historical 0.16.1 attribution distinguished from actual stored 0.13.1 component-fixture provenance. Source/evidence inventory covers current TS/Python modules, source versions/domains/input locators, component evidence IDs and unresolved claims. | **Containment/matrix implemented/tested.** Source and restored-string guards are not proof that every historical sentence or model is correct. No site investigation, fault study, harmonic spectrum or normative applicability is invented. |
| U16a economics | Typed assumption registry records owners, currency/valuation basis, reviewed date and **null source/effective dates**. Iranian floors/CAPEX/OPEX/discount/escalation disclosed. Financial profiles no longer claim official/standard market baseline. UI, printable/DOCX/XLSX/JSON and operational dossier snapshots retain qualifications. | **Containment implemented/tested.** Defaults remain illustrative; user overrides/saved projects recoverable. No market data freshness or financial-model accuracy claim. Precision/solver/ledger repairs remain Phase 2. |
| U17a bifacial | Explicit `unsupported_sensitivity`, null independently validated domain, `bankabilityEligible: false`. Notice appears in waterfall/finance and exported report evidence. Retired target WARN retained. | **Containment implemented/tested.** No proxy/GCR replacement and no newly bankable scalar output. Independent sensitivity/geometry/illumination validation remains Phase 3. |
| Deferred safety kernels | LPS, cable impedance/current sharing and Broms equations unchanged; Phase 2 has removed the duplicate uplift wrapper expression in favor of the existing shared reaction. | **BLOCKED affected validity/conformity claims**, not independent safe contracts. Follow the assessment's Phase 2 source/applicability/reference gates. |

## Acceptance evidence

- P1-B01/B02/B03: actual DC/installed/requested AC; ratios and nameplate identity; invalid sizing and zero-irradiance characterization; three-mode SLD/Iranian annual binding/HUD PR; actual SLD SVG/PDF readback; adopted ledger block and existing stale-context invalidation.
- P1-A01: explicit compass vectors, equivalent aliases, full-turn wrapping, conflict/unknown/null/blank/non-finite rejection, versioned legacy result continuity and deprecation metadata in real HTTP.
- P1-E01: unknown/generic 65/90 A source basis cannot complete evidence readiness; per-input/terminal/module-Isc bases are not silently converted; measured coefficient/actual allocation requirements, actual per-channel overload, schema/catalog rejection, project import/export metadata round-trip.
- P1-C01: unsupported conformity/official-default/benchmark/version assertions guarded; evidence/qualifications survive real DOCX/XLSX/JSON and print/SVG artifacts. All 56 findings accounted for by executable inventory check.
- Numerical parity: tests compare **both additions and removals** of formula AST IDs in PV, MPPT, catalog and project consumers against assessment baseline. Phase 1 introduced no physical equation replacement. Phase 2 now deliberately removes the conflicting wrapper uplift expression while preserving shared reaction equations. Metadata schema/readiness belongs in `src/contracts`; the physics gate itself was not altered.

## Executed verification and limitations

Logs are regenerable under `.cache/phase1-completion/`; receipt records hashes. Commands run separately; a successful shell wrapper is not treated as success of every command.

| Check | Result |
|---|---|
| lint (client + Node types + ESLint) | PASS, 93 warnings; not warning-free |
| production build | PASS |
| core `npm test`, smoke, coverage | PASS; core-scoped coverage 91.34% statements/lines, 66.13% branches, 72.81% functions; existing unverified bifacial WARN retained |
| focused Phase 1 unit and production browser | PASS; actual three-mode SVG/print-PDF, DOCX/XLSX/JSON readback, evidence project round-trip; external providers blocked |
| real POA HTTP, accepted-audit | PASS |
| operational-energy and operational-browser | PASS with pinned ignored `.venv` runtime; annual/full-year/adoption/import costs and scalar block tested |
| full existing browser regressions, recovery, export readback | PASS |
| claims, help, physics registry, current evidence inventory | PASS; registration/inventory is not independent validation |
| targeted boundary coverage | PASS; separate from core scope; exact figures in receipt/log, not whole-project coverage |
| current-baseline independent reference gate | PASS; existing registered fixtures execute; Phase 2 removes a duplicate wrapper expression, not the shared equations; **not inherited closure** |
| inherited reference gate against `71a7c2b…` | **FAIL: 56 missing CAD-expression references**, reproduced; no waiver or manufactured goldens |
| whitespace/diff check | PASS |

Earlier attempts are retained in logs/receipts: initial slice operational test lacked pandas then passed with the pinned runtime; initial completion reference check flagged seven metadata/diagnostic expressions, then passed after proper boundary-layer separation and exact formula-parity checks; initial PDF text check failed on extracted whitespace, then passed with whitespace-only normalization. No engineering tolerance was loosened.

## Exit and next phase

**Phase 1 exits as implemented contracts/containment with explicit BLOCKED evidence dispositions.** This is the plan's allowed disposition where standards/manufacturer sources are unavailable; it is not full audited-project closure. No Docker/native Safari/field/conformity/release approval is claimed. The inherited independent-reference failure prevents a full release/merge-green declaration.

Proceed only to independently supported Phase 2 kernels and their reference strategies. Keep unverified wind/MPPT basis conversions/LPS/Broms/model-bankability claims stopped until evidence exists. Rollback/compatibility instructions are in ADR-011 and the contract guide; do not restore false conformity wording or known-wrong AC/DC/annual bindings. No commit, push or merge performed.
