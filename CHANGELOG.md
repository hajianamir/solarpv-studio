# Changelog

## Unreleased — explicit steady-duty pump energy comparison

- Add a strict opt-in steady-duty energy policy with explicit volume/head/runtime/fluid/efficiency/DC-energy inputs and separate hydraulic, shaft, motor-electrical and drive-DC boundaries. Preserve full precision; reject invalid and numerical-failure domains.
- Add an initially empty temporary comparison panel; no PSH/legacy assumptions are copied, no project inputs are saved, and no finance/annual-energy adoption or water guarantee is allowed. Legacy numerical API remains unchanged.
- Qualify legacy motor/PV/monthly UI as unassessed heuristics; remove the false1.25motor-service-factor claim. Add864independent Decimal comparisons, five numerical-failure witnesses,18executed expression witnesses,48actual-base legacy comparisons and real-browser form/NPV-isolation tests. See ADR-030 and `docs/features/PUMP-DUTY-ENERGY.md`. Full U19 and Phase2/3 remain incomplete.

## Unreleased — explicit conventional periodic IRR assessment

- Add a strict, opt-in annual IRR policy with full-precision rates, explicit project/equity/currency/rate metadata, bounded bisection and normalized residual checks. Distinguish no sign change, unsupported nonconventional flows, outside-domain roots, invalid input and numerical failure.
- Iranian screen now uses this assessment with localized unavailable reasons instead of the legacy first-guess/rounded scalar. Legacy public financial outputs, ledgers, NPV and saved settings remain unchanged; no automatic financial adoption.
- Correct stale bilingual table disclosure: annual input and full-precision ledgers are distinct from presentation rounding and the legacy rounded LCOE.
- Add 164 independent Decimal root/status cases, eight NPV cases, 33 executed expression witnesses, project/equity ledger integration and real-browser assertions. See ADR-029 and `docs/features/PERIODIC-IRR-ASSESSMENT.md`. U16b/U16c remain partial.

## Unreleased — qualified full-precision Iranian benefit indicators

- Add an explicit-policy, strict-input screening indicator API with unrounded penalty/outage proxies; retain old rounded financial API results and cash flows unchanged.
- Show separate bilingual assumption-qualified million-Toman values, with no automatic financial adoption or guaranteed-savings claim.
- Add 168 independent Decimal reference cases, three executed expression sensitivity witnesses, negative/serialization/legacy/UI tests and production-browser assertions. See ADR-028 and `docs/features/IRANIAN-BENEFIT-INDICATORS.md`. U16b/U16c and Phase2/3 remain partial.

## Unreleased — retire invalid Student-t UQ execution

- Reject new Student-t financial/sampler/Worker execution without a silent Gaussian fallback. Preserve Gaussian arithmetic and verify exact baseline deterministic hashes in all three system modes. The prior latent-kurtosis benchmark was not a copula-margin validation and now checks explicit retirement instead.
- Export strict UQ archive v2 with `gaussian-only-retired-student-t-v2` policy. Keep valid v1 archives intact/readable but inspection-only in this engine, including Gaussian v1; unknown policies/families cannot gain replay eligibility. New v2 exports require a v2-capable reader.
- Add genuine historical v1 fixture generation, direct/actual-Worker/production-browser compatibility tests, bilingual policy disclosure and CI regression coverage. See ADR-027 and `PHASE-2-3-REMAINING-EXECUTION.md`. U20, Phase2/3 and release remain partial/blocked.

## Unreleased — Phase4 verification kickoff

- Add a local baseline/integration/platform verification harness that records exact script definitions, checkout and executable-input hashes, runtime, command exits and log hashes. Preserve failed attempts and reject incomplete or changed-source results; a local PASS never authorizes release.
- Add negative harness tests and a Phase4 acceptance/work-package plan. No production numerical, saved-project, UI or adoption-policy changes. Phase2/3 and required reference/platform stops remain active.

## Unreleased — Phase3 primary-source research and offline reference cases

- Acquire 28 SHA256-pinned public source/data artifacts with a repeatable GitHub acquisition script and offline integrity checks; retain large upstream files in ignored cache.
- Add executed references for 60 thermal, 16 M&R IAM, 96 infinite-sheds, 30 full-year clipping, 27 pump duty, six financial and 20 Student-t CDF cases, plus an explicitly seeded De Soto fit with retained default-fit failure and coefficient residuals. No production numerical replacement or automatic adoption.
- Replay actual thermal/bifacial/pump discrepancies without laundering them into accuracy PASS; integrate research replay into `test:phase3`. Document each package's evidence, decisions and remaining manufacturer/site/normative/runtime/integration stops in `PHASE-3-DEEP-RESEARCH.md`. Phase3 remains partial and release blocked.

## Unreleased — production UQ convergence diagnostic

- Add opt-in offline multi-budget/multi-seed diagnostics around the unchanged production Gaussian financial sampler, deterministic per-run hashes and explicit ascending CDF envelopes for energy, NPV and LCOE. Integrate regression checks into `test:phase3`. No public consumer or financial adoption.
- Reject non-Gaussian families in this new diagnostic: legacy Student-t latents use a normal marginal CDF and must not be represented as a validated t-copula. Existing legacy behavior is not silently changed or reinterpreted.
- Selected-seed ranges are not confidence intervals or an N=100 guarantee. See ADR-026. U20, full Phase3 and release remain incomplete/blocked.

## Unreleased — bounded explicit-reference diode API

- Add strict versioned `desoto_reference_bounded_v1` per-module STC inputs and an explicit public `evaluateReferenceDiode` API, separate from legacy summary-input extraction. Retain normalized input/provenance/conditions, model identity and financial-adoption ineligibility in successful/dark results.
- Implement separate De Soto translation and bounded implicit Isc/Voc/continuous-MPP roots, without beta-based Newton guesses or exponential clipping. Invalid, nonfinite and unconverged inputs return explicit unavailable results; darkness remains distinct zero output.
- Add72independent full-reference cases,862component/solver-policy comparisons,51invalid-contract tests and66executed mutation-sensitive expression witnesses. Same-parameter failed-root witness converges to45.0006576V in the new kernel; the old API and its188.23V defect remain unchanged/qualified, not silently reinterpreted.
- No App/I–V/calibration/catalog/project/HTTP/annual/financial selection, durable schema change or automatic fallback. See ADR-025 and the bounded-reference guide/evidence card for numerical domain, source hashes, failures, rollback and remaining fitting/adoption limits. Full U05/Phase3 and release are not complete.


## Unreleased — Phase3 single-diode reference boundary

- Start independent U05 evidence work without waiving incomplete Phase2/release gates. Add a pinned offline pvlib0.13.1 generator,48explicit-reference parameter cases/3,888curve points, offline replay and a model evidence card with domain/source hashes/tolerances and unresolved regimes.
- Separate reference-parameter translation from heuristic STC extraction and sampled versus optimized MPP. Preserve all production numerical formulas/signatures/results; clarify aggregate legacy vt semantics in comments only.
- Reproduce unused gamma_Pmp, beta-as-initial-seed, approximate Isc and a severe extreme-beta unconverged Voc defect. Keep solver-reliability/adoption claims blocked rather than adjusting tolerance or silently substituting another model.
- Correct bilingual I–V page/help claims: fixed illustrative module,80interval sampled MPP and cosmetic shading toggle, not a bypass-diode circuit simulation. Add actual production-browser KPI-invariance assertions.
- See ADR-024, `PHASE-3-PLAN.md`, `PHASE-3-STATUS.md` and `docs/guides/single-diode-validation.md` for evidence limits, next numerical repair and rollback. This is not full U05/Phase3 validation, conformity or financial-adoption approval.


## Unreleased — named production scalar transposition owner

- Extract unchanged fixed-tilt screening arithmetic into `core/scalarTransposition.ts`, named `legacy_latitude_tilt_screen_v1`; retain the old waterfall export as a deprecated identity re-export. No energy coefficients, report shape or project inputs changed.
- Name/qualify the policy in bilingual waterfall/help, including the retained tracker1.168anchor. Explicitly deprecate the unused alternate constant-gain annual API rather than silently changing its historical behavior.
- Add122independent Decimal/Taylor cases,15executed mutation-sensitive expression witnesses,153exact actual-base scalar comparisons and a production-import guard. Existing canonical/roof/report/browser compatibility checks remain. See ADR-023 and the scalar-transposition guide; broader policy migration and annual-model harmonization remain open.


## Unreleased — explicit Iranian screening policy and NPV identity

- Persist Iranian-screen inputs and strict TOMAN/nominal discount, tariff escalation and OPEX escalation through tab changes, project save/export/import and report input snapshots. Preserve intentional zero interest/discount; reject invalid edits/imported policies without silently replacing them.
- Correct the Project NPV label defect by separating pre-debt project and post-debt equity NPV. Keep `npvMillionToman` as a deprecated equity alias. Both use the explicitly selected screening discount, not an assessed WACC/equity-rate model.
- Stabilize positive near-zero ordinary-loan annuity with log1p/expm1; retain the exact-zero branch. Add48independent Decimal ledgers and actual production-browser zero-interest/custom-policy/local-save/project-file/NPV checks alongside existing18legacycases.
- Expose policy and financial-adoption ineligibility, entered/applied unverified tariff floors and unavailable numerical failures. Retain legacy eight-argument mathematical policy when no explicit ninth argument is supplied. See ADR-022 and the Iranian economic-policy guide for migration/rollback and remaining U16b limitations.


## Unreleased — roof named-waterfall migration and generator references

- Complete the remaining roof production-consumer routing through the named waterfall boundary; remove its production import-guard exception while retaining deprecated positional/17-slot APIs and benchmark compatibility tests.
- Extend reference execution to directly declared exported synchronous generators: compare final returns, bound next calls, request cleanup on exhaustion, and prevent harness failures from being credited as numerical mutation sensitivity. Existing direct-owner/executed-node/reference/sensitivity requirements remain.
- Add four independent Decimal/analytic full-return roof cases and eight populated-scene actual base-version comparisons with cooperative parity; preserve snapshot mismatch and invalid-input/cancellation behavior. No physical coefficients or adoption eligibility change. Common transposition and broader Phase2 work remain open; ADR-021 documents evidence and limits.


## Unreleased — named canonical waterfall routing

- Route canonical annual yield through the configured named waterfall API shared with App and the waterfall tab. Preserve numerical/default/alias/override semantics and JSON reports; omit inactive undefined tracker diagnostics in memory.
- Retain and mark the 17-slot tuple and positional APIs deprecated. Add explicit slot/default/alias and import-guard regressions, actual pre/post canonical and roof JSON comparisons, and five independent Decimal composition cases with an executed mutation-sensitive call fixture.
- Roof's private-generator positional call remains a baseline-pinned exception, not a completed migration. Common transposition policy and overall Phase2 remain partial/release-blocked. See ADR-020 and the updated annual-thermal guide.


## Unreleased — strict simple LCOE and raw MPPT current acceptance

- Add strict named LCOE availability: distinguish invalid/zero-generation/numerical failure (null) from genuine zero-cost energy (0). Centralize discounted cost/energy arithmetic, retain the deprecated numeric adapter's legacy compatibility, and keep full precision through scenario results.
- The LCOE HTTP endpoint now consumes degradation, reports currency/valuation/energy basis and inputs, and rejects unsupported fields/coercions instead of silently ignoring them. Successful results remain numerical screening outputs with financial adoption disabled. Scenario UI distinguishes unavailable and valid-zero values in both languages.
- Compare unrounded per-channel operating and legacy-factored short-circuit currents in direct MPPT, array sizing and central sizing; displayed two-decimal currents no longer grant capacity. Manufacturer rating evidence remains independently required.
- Add 42 independent Decimal LCOE cases, 40 exact Decimal current boundaries, actual HTTP/bilingual rendering/customer-mode browser checks and mutation-sensitive expression fixtures. See ADR-018/019 and the simple-LCOE guide for compatibility, qualified scope and rollback. Overall Phase2 remains incomplete.


## Unreleased — unchanged clipping-screen consolidation

- Deduplicate the inherited clipping screen into one explicitly qualified owner, preserving the deprecated annual API's pre-clamp/raw and four-decimal fields and the waterfall's unrounded loss stage.
- Add 14 independent Decimal arithmetic characterizations and exact-expression mutation fixtures. These verify unchanged extraction, not physical clipping accuracy. Transposition/17-slot policy consolidation remains open; see ADR-017.

## Unreleased — Phase 2 hemisphere and signed annual metadata

- Reverse the synthetic annual temperature harmonic in the southern hemisphere; explicitly use no hemispheric annual harmonic at the equator. Preserve annual PSH normalization and existing hot-design behavior. New results carry the named synthetic policy and zero/positive-irradiation state.
- Zero PSH now returns a neutral thermal-loss budget instead of a spurious 100% loss; missing/nonfinite/inconsistent hourly thermal inputs reject. A supplied annual mean is no longer labeled verified provider data.
- Preserve cold-gain sign in canonical annual metadata. Include the thermal profile in supplemental project-report JSON and policy/availability in visible reports and XLSX, with actual production-browser readback assertions.
- Add 32 independently reconstructed numpy/pvlib integration cases and five exact-expression mutation-sensitive fixtures. These verify the declared synthetic policy, not measured-weather accuracy. See ADR-016 and `docs/guides/annual-thermal-screening.md` for compatibility/rollback and open Phase2 work.


## Unreleased — Phase 2 wind SI and thermal ownership

- Correct wind elevation exponent units (published per-foot coefficient now converts metre inputs), unify omitted and explicit3m default height, and reject invalid height/exposure/Kd/Kzt rather than silently clamping factors. Legacy wind screen remains qualified, not a code-conformity result.
- MPPT fallback hot-cell temperature now comes from the shared NOCT/mounting owner; optional NOCT/environment inputs and explicit hot-cell override are supported. Scalar annual thermal loss preserves cold gains and coefficient sign; hot-design convention is unchanged.
- Add independent pvlib/Decimal component fixtures and direct-export mutation checks; replace old regressions that encoded the metre-unit/.88-default defects. See ADR-015 for domains, rollback and remaining Phase2 work. No full-completion or release approval.


## Unreleased — Phase 2 cable, pile and precision follow-up

- Use the same steady-state voltage-drop evaluator for cable candidate selection and reported drop. Require explicit AC equivalent reactance, equal-sharing arrangement and source; unknown arrangement and exhausted searches cannot pass. Optional fields survive project parsing and have bilingual input controls. Invalid-temperature/PF/reactance UI results fail closed.
- Unsupported Broms pile domains and their structural/sensitivity consumers cannot declare safety. Retain numeric legacy diagnostics, not an approved design; remove misleading recurrence-period and compliance labels.
- Preserve full-precision million-Toman capital/debt/revenue/OPEX/generation/cumulative ledger values and NPV in the Iranian financial screen, with 18 independent Decimal ledgers. Economic assumptions remain illustrative; other U16b work remains open.
- See ADR-014 for evidence, tested domains, compatibility, rollback and remaining Phase 2 blockers. No release/conformity approval.


## Unreleased — Phase 2 scoped numerical-contract repairs

- Preserve explicitly supplied negative annual thermal loss as gain in the waterfall; reject invalid explicit overrides and expose the same optional input in the canonical annual API. Pinned pvlib 0.13.1 component fixture and mutation-sensitive reference gate; not annual weather/model validation.
- Forward shared foundation moment/capacity/FoS instead of reconstructing from a fixed clearance; evaluate diagnostic wind sensitivity through the same shared input path.
- Withhold unsupported lightning protective angle/separation as null/unassessed; retain old quantities only as named diagnostics and replace imperative installation advice with bilingual limitations. UI and JSON regression coverage.
- Preserve deprecated 17-slot waterfall interface; correct its arity documentation. See ADR-013 and Phase 2 research/status. **Phase 2 remains incomplete; no release/conformity approval.**


All notable changes to SolarPV Studio are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Phase 1 exit review and Phase 2 start
- Repair evidence-readiness edge cases: invalid supplied MPPT wiring is unassessed in both sizing consumers; impossible non-null manufacturer source dates reject while unknown dates remain null. No electrical/current multiplier changes.
- Remove remaining structural recommendation header/report governing-code compliance wording and qualify legacy geometry/default/parity statements.
- Start Phase 2 U14: forward the shared net uplift reaction to recommendation results/reports instead of recomputing with a fixed 1.15 pressure multiplier. Preserve existing shared reaction, wind and soil equations; add optional shared geometry/dead-load input typing.
- Add 108 synthetic consumer-parity cases (72 expose the old duplicate expression), Markdown/input readback and actual production-browser recommendation-report assertions. These are consistency checks, not independent physical validation.
- Phase 2 remains in progress; moment/capacity reconstruction, other kernels and blocked normative/manufacturer references are not claimed complete. See ADR-012 and the Phase 2 status for compatibility, rollback and executed gates.

### Phase 1 audit contracts and evidence containment
- Separate actual DC, installed AC and requested AC in the summary adapter; SLD uses actual DC, including its existing shared PDF input.
- Iranian illustrative financial screening uses the eligible annual Financial screening basis, not representative-day ×365. It is intentionally unavailable for adopted operational energy because the scalar model cannot value dispatch/import costs.
- HUD now labels/displays waterfall screening PR instead of a derating multiplier with a truthy fallback; retain legitimate zero and do not impose a universal 100% ceiling.
- Qualify surviving electrical/Broms/structural conformity, official financial-baseline and unsourced PR-benchmark claims; disclose unverified illustrative Iranian assumptions and tariff floors.
- POA v1 retains its legacy south-zero default with deprecation metadata; all explicit/generic surface and solar aliases must agree after normalization. Conflicts/unknown conventions reject rather than silently changing orientation.
- Add backward-readable MPPT rating-basis/source/date/conditions metadata and explicit electrical evidence readiness. Unknown/generic current ratings, missing coefficients and assumed wiring remain unassessed; legacy 1.25 arithmetic and numerical aliases are preserved and qualified.
- Register illustrative economic assumptions with unknown source/effective dates, mark bifacial sensitivity unsupported, and retain qualifications in financial/structural screens and report artifacts. Clarify historical tracker version attribution versus pinned component fixtures.
- Add screening SLD SVG download; verify actual SVG and print/PDF capacity readback, DOCX/XLSX/JSON qualifications, evidence project round-trip and adopted-operational blocking in production-browser checks.
- Complete Phase 1 contracts/containment dispositions, ADR-011, contract guide, hash-checked current TS/Python evidence inventory and all 56 finding dispositions. Normative/manufacturer model validation remains BLOCKED where evidence is missing; inherited 56-expression CAD reference debt remains unresolved. No full-release approval.
- Compatibility: no project schema migration; corrected capacity/energy can change previous Iranian financial outputs. Re-review old exports. Rollback/stops and validation limitations: `docs/adr/ADR-011-phase1-contracts-and-evidence-containment.md`, `docs/audit/dual-independent-audit-review/PHASE-1-STATUS.md`.

### Final runtime validation follow-up
- Final tested runtime revision `3222aab`: real-container health, Node 20/22/24, Windows operational validation, Linux/Windows pvlib study, independent CAD artifacts and foundation checks pass remotely. The independent formula-reference gate remains failed (56 records missing); no full-release PASS.
- Update the direct-study isolation test to locate the current screening-only waterfall title without removing the unchanged-screening assertions.
- Fix a real final-image boot failure: copy registered `docs/reference-data` required by server-imported study contracts into the runner stage.
- Surface bounded, escaped container failure diagnostics through GitHub Checks while preserving failure status and redacting the generated runtime secret.
- Replace stale inline-batch text expectations with the delegated launcher preflight checks; exercise missing/broken/repaired dotenv and uuid entry points.
- Keep feature-branch physics checks relative to main rather than the previous push, so follow-up commits cannot hide earlier unreferenced formula changes.

### Independent CAD artifact verification
- Independently check module/DC-capacity accounting with Decimal and artifact counts, site area with GEOS, and row aggregates from artifact coordinates; reject five additional corrupted metrics. These component checks do not waive full-model reference requirements.
- Fix a real external-parser failure in DXF export: supply R2000 entity subclasses and LAYER table metadata; use deterministic unique handles with HANDSEED and explicit meter/metric headers.
- Add pinned test-only ezdxf/Shapely/GEOS verification of 61 actual files, structural audit without repair, geometric constraints and third-party round-trip; include ten reason-specific negative cases and a dedicated CI job.
- Add a complete advisory review of 56 changed CAD expressions. This inventory neither waives the reference gate nor labels internal siting policy as independent engineering validation. See docs/features/CAD-INDEPENDENT-ARTIFACT-VERIFICATION.fa.md.

### CAD access-road and pitch audit remediation
- Separate MV station bays from the central through-road and reserve their full corridor before accepting PV tables; derive capacity from the accepted footprints.
- Return requested/effective pitch with explicit centimeter-grid adjustment; use effective pitch for placement, GCR, shading indicator and DXF annotations.
- Render/export the same road and station polygons, including explicit perimeter strips and every station; suppress unavailable layouts/exports and disclose screening-only siting assumptions.
- Add rectangle/connectivity and actual DXF read-back tests plus production Chromium SVG/download/error-recovery checks; include geometry regressions in the main suite and CI.
- Fix M06/M09 setup: require analytical-screening consent, assert project creation before authorization checks, test missing-consent rejection, and isolate the M01–M22 persistence path.
- See docs/features/CAD-ACCESS-PITCH-REMEDIATION.fa.md for acceptance, limitations and rollback. Independent expression-reference and final-runtime release requirements are not waived.

### Portable agent skills
- Refine the project skill into a normative procedure: defined terminology, stable requirement/phase IDs, explicit phase exit evidence, criterion-to-check traceability, numerical comparator semantics, scoped stop conditions, and independent implementation/verification/release states. Align review guidance and templates with those definitions.
- Restructure the primary skill as a task-routed bundle: six detailed reference guides, nine task runbooks, three reusable delivery assets, and nine explicit native-agent evaluation cases. Sync and verify complete bundles, including missing/drift/link checks, without claiming native-client or semantic certification.
- Add a comprehensive `solarpv-studio-engineering` primary skill for the entire project lifecycle, with architecture ownership, risk-based verification, domain acceptance, security/data/financial boundaries, platform delivery and release stop conditions. Keep audit/navigation/string-sizing as specialist companions.
- Standardize all four skills on shared SKILL.md name/description YAML frontmatter, usage triggers, procedures, and output contracts.
- Add Codex `.agents/skills` and Claude Code `.claude/skills` discovery copies with dependency-free sync/validation commands and CI parity checks. No numerical-model behavior changes.

### Accepted audit corrections
- Preserve optional manufacturer Vmp temperature coefficients through catalog selection, adapters and project snapshots; validate negative finite values across voltage-window engines and HTTP percent/fraction aliases.
- Share coefficient selection and disclose that Pmp/Isc fallbacks are not guaranteed conservative; retain missing-data numerical defaults.
- Add corrected AGENTS.md and audit/navigation/string-sizing skills without unsupported “verified” anchors or blanket coefficient-conservatism claims. See docs/features/VMP-COEFFICIENT-AUDIT.md for acceptance, limits and rollback.

### Remaining remediation (2026-11-03)
- Fixed deterministic POA azimuth contracts, owned concurrent shading workers and cooperative cancellation, CAD footprint/count consistency, rear-beam geometry, tracker shading/energy weighting, and low-load diesel rounding/zero-load handling.
- Added pinned independent component-geometry fixtures and HTTP/native Chromium/lifecycle regressions (`npm run test:remaining`). See `docs/operations/PRIORITIZED-REMEDIATION.fa.md` for acceptance, rollback and limits.
- Retired the unreproduced stored bifacial target as a visible WARN, retaining its discrepancy rather than tuning to it. Whole-model independent validation and local Docker runtime evidence remain blocked; no annual/field accuracy certification is claimed.

### Changed
- Phase 1 data protection: distinguish missing snapshots from failed recovery, validate imports off to the side, latch failed paths against all saves including shutdown, and expose degraded health. Copy complete transitive server source into the production image, use locked local tsx and supported Node, and add a real no-source-mount Docker smoke gate (local Docker unavailable). Remove eight disposable coverage files and four obsolete PR28 session instructions; retain active tests and referenced evidence. Two-phase plan and recovery guide: `docs/operations/PRIORITIZED-REMEDIATION.fa.md`.
- Register and execute ten independent SPA/string-feasibility reference witnesses in `npm test`; regenerate expected values without production outputs and test exact-node mutation sensitivity. Keep baseline/import failures fail-closed while recognizing executed mutant runtime rejection. Mark all structural diagnostic results and spreadsheet states explicitly NOT CERTIFIED; withdraw residual ASCE compliance claims without relabelling the legacy coefficients as an implemented standard. Global reference gate and model-replacement work remain open.
- Fix UTC-boundary solar azimuth with an independent 887-case NREL-SPA fixture; run it in `npm test`. Return explicit infeasible string status without clamping impossible strings to one module; support measured Vmp coefficients and warn on proxies. Require quick-size longitude and HTTP analytical-screening opt-in, retain provenance in saved projects, use the shared financial engine, scale-match demo equipment, and withdraw PVsyst-grade waterfall wording. See `docs/features/PRIORITY-AUDIT-REMEDIATION.fa.md`.
- Unify the workspace visual system: refined light/dark surfaces, responsive measured shell, accessible workflow navigation, page hierarchy, shared form/table/card sizing, and persistent comfortable/compact density. Bundle licensed Persian/English variable fonts locally instead of Google Fonts; improve mobile focus handling, reduced-motion and print separation. See `docs/features/WORKSPACE-DESIGN-SYSTEM.fa.md`.
- Retire the explicit AC interface requirement editor in every project mode and remove its active calculation, save, SLD and report dependencies. Discard legacy payloads with a migration warning/confirmation; retain independent feeder safety inputs and catalog consistency checks. MV architecture uses its own positive collector voltage, not a second injection declaration. Recomputed old projects may differ; review before finance.
- Replace the research JSON-only default with model parameter forms, actionable service/model/auth readiness, refresh/retry and server-computed result tables with provenance. Preserve advanced JSON, authentication, cancellation and no automatic financial adoption. See `docs/features/AC-RETIREMENT-RESEARCH-EXECUTION.fa.md`.
- Modernize ExcelJS-scoped CSV/ZIP dependencies to fast-csv 5.0.8 and unzipper 0.12.5, removing deprecated lodash.isequal/fstream/rimraf. Upgrade ESLint to 10.15 and react-hooks plugin to 7.1 while preserving the existing two Hooks rules. Align installer/launcher Node checks with the new runtime requirements; add real CSV/streaming XLSX regression tests. See `docs/features/DEPENDENCY-MODERNIZATION.fa.md`.
- Isolate research from site/climate editing in a lazy-loaded, bilingual Research & Laboratory tab with four tool sections and thirteen model topics, accessible keyboard/RTL/mobile navigation, and unchanged research authentication/adoption boundaries.
- Remove the duplicate System Mode & Grid Strategy dashboard: retain utility AC requirements and MV bay engineering under `electrical_requirements`, and place customer on-grid/off-grid policy with outage/autonomy inputs in Electrical Loads. Preserve project schema, engine calculations, saved inputs, and the last customer mode when switching project families. Update help and browser regression navigation. See `docs/features/RESEARCH-WORKSPACE.fa.md`.

### Added
- Double-clickable Windows `install.bat`: installs lockfile-pinned app and development dependencies, verifies them, and initializes `.env` without replacing existing settings. `start.bat` and the managed Windows runner reuse it for repairs; Node.js/npm prerequisites are checked with actionable errors. Optional Python research engines remain separate.

### Fixed
- PC launcher now detects stale/missing direct dependencies (including `@noble/hashes`) even when `node_modules` already exists, repairs them through npm, and rechecks before starting. The managed server uses direct Node + tsx without a Windows shell shim, avoiding DEP0190 and preserving spaced paths. See `docs/features/PC-LAUNCHER-DEPENDENCY-REPAIR.md`.

### Added
- Opt-in B2 `battery_protocol`: pinned PyBaMM current/rest/charge stages with preserved cell state, separate spatial/tolerance/IDAS-step-bound sensitivity, charge/heating ledgers, strict independent output witnesses and authenticated API/SDK/editor integration. Default-off `BATTERY_PROTOCOL_ENABLED`; no energy/finance adoption, measured-cell or safety qualification. See BATTERY-PROTOCOL.fa.md and its gate receipt.

## [1.0.3] - 2026-11-04

### Added
- **RFC3 Unit Tests tab**: the full `runCoreUnitTests()` suite (146 tests) is now runnable from RFC3ReportsTab → "Unit Tests" sub-tab, with per-test status and details.
- **LHS Timing Label**: sub-tab 4 displays explicit LHS vs CMC execution timing breakdown alongside the speedup factor (R12).
- **Dual-panel Climate API view**: "Parsed" (ClimateCity) and "Raw Provider Response" (ClimateResourceData with metadata) shown side-by-side, proving what the provider actually returned.

### Changed
- **Section A Provenance**: now reflects the ACTUAL project city (threaded via prop) rather than hardcoded Tehran. Extracted to `buildProvenanceRows()` for unit-test coverage.
- **Fetch buttons**: display REAL_INTERNET ON/OFF mode badge so users know whether they are seeing measured or analytical data.
- **R6**: Bumped physics model versions in `PHYSICS_MODEL_REGISTRY` (`civil_geotechnical_broms` to 3.1.0, `pv_single_diode_core` to 2.5.0, `optical_iam_thermo_coupled` to 3.1.0, `climate_resilience_15min` to 3.1.0) to reflect E1–E7 audit improvements.

### Fixed
- **R1**: provenance hardcoded to Tehran regardless of project site.
- **R2**: "raw provider response" panel was rendering the parsed `ClimateCity`, not the gateway's `ClimateResourceData`.
- **R8**: Section B now defaults to expanded and persists user toggle state in `localStorage` (`solarpv_section_b_expanded`).
- **R9**: missing "analytical fallback" indicator on Climate API tab.
- **R10**: empty confidence badge when `ClimateCity.confidence` was `undefined`.
- **R11**: validation re-run benchmark yields to browser macro-task queue so spinner renders during execution.
- **R13**: salt corrosion engine allows explicit `distanceToSeaKm` user overrides when `resolveDistance` is active.
- **R14**: dead `catch` in `handleFetchClimateApi` — now live after R2 bypass (surfaces explicit error state with fallback data).
- **R15**: `ClimateCity.dataRetrievalDate` accurately populated from `climateResource.metadata.retrievalTimestamp`.

### Removed
- **R3**: `AdvancedFeaturesModal.tsx` (dead code — `isOpen` never set true; all functionality available in RFC3ReportsTab).

## [1.0.2] - 2026-11-04

### Fixed

- **STRUCT-1**: unified wind pressure formula between structural and foundation engines (was 13.5% different for the same site; Tehran 130 km/h now 0.598 kN/m² in both via shared `calculateWindPressureQz`).
- **STRUCT-3**: Broms clay lateral capacity now uses the FHWA-NHI-16-009 §10.4.4 iterative form (was a non-standard `(2 + e/L)` denominator with no reference).
- **STRUCT-4**: `fosSlidingApplicable` flag added - the friction-based sliding FoS is now marked applicable only for ballasted blocks; the UI no longer shows it for pile/pier types (use the Broms FoS instead).

- **STRUCT-2 (correctness fix)**: wind overturning moment arm now derived from panel geometry (W/2 + h·sinβ) rather than h_mean·cosβ, and the safety suite gained a **pile uplift capacity check** (beta method for cohesionless, alpha for cohesive, per Eurocode 7 / FHWA-NHI-16-009), previously absent. `isStructurallySafe` is now foundation-type-aware: ballasted blocks verify overturning FoS ≥ 1.5, pile/pier/screw verify uplift FoS ≥ 2.0. **Behavior change**: many 28-module tables at 130 km/h wind are now correctly flagged as uplift-undersized (FoS_uplift ≈ 0.1–0.4). Re-verify foundation depth and pile count for existing pile-based designs.

- **STRUCT-5 (low)**: added ASCE 7-22 §26.10.1 Ke elevation factor to wind pressure. qz drops ~4.2% at 1190 m (Tehran) and ~5.7% at 1620 m (Boulder). Sea-level sites unchanged. `calculateWindPressureQz` now accepts an optional `elevationM` argument; both callers pass `input.elevationM ?? 0`.
- **STRUCT-6 (medium)**: unified `cpUplift` and cos(β) treatment between `structuralEngine` and `foundationRecommendation` (exported `cpUpliftFor`/`cpDownforceFor`). Reported uplift-per-post diverged ~45% between tabs; now within 10% (residual is the dead-load model - v1.1.0). Note: the `fosUplift` result field is a REDEFINITION (previously deadLoad/uplift, meaningless) - it now means pile tension FoS per E5.1.
- **STRUCT-7 (medium)**: `foundationRecommendation` now includes wind downforce (1.2·qz·cpDownforce·A) in compression-per-post; previously omitted, under-reporting compression by 20-30% at high wind. `upliftPerPostKn` is now exposed in the output.

- **STRUCT-8 (low)**: `shadingSunPathEngine` winter-solstice altitude formula was `90 − latitude − 23.45` (Northern-hemisphere only), giving nonsensical `recommendedMinPitchM` for southern sites (Sydney 3.56 m — less than the 4.6 m collector width). Changed to `90 − |latitude| − 23.45` and made the winter-solstice profile hemisphere-aware (day 172 / Jun 21 label for southern latitudes). Northern sites bit-identical. Sydney: min pitch 3.56 m → 7.57 m (physically valid).
- **STRUCT-9 (documentation)**: snow-load `Ce·Ct·Is` assumptions are now documented in code. Current implementation uses `pf = pg·Cs·cos(β)` with `Ce = Ct = Is = 1.0`, omitting the 0.7 roof factor from ASCE 7-22 §7.4.1. This is conservative and physically correct for ground-mount panels (no roof-level wind/thermal reduction applies). For rooftop ballasted systems the 0.7 factor SHOULD apply; differentiated in v1.1.0. **No numerical change** in this release.

## [1.0.1] - 2026-11-03

### Fixed

- **ENG-1 (critical)**: solar position azimuth returned 180° inverted in both the morning and afternoon branches. Tehran summer 09:00 returned 265.9° (should be 94.9°); afternoon returned the mirror. Affects the `POST /api/v1/solar/position` endpoint and any future internal caller.
- **ENG-2 (high)**: off-grid battery autonomy sizing used the nighttime-only load instead of the full 24-hour load, undersizing the BESS by ~2×. A 20 kWh/day site with 2 days autonomy now correctly sizes to ~52.8 kWh gross (was ~24.8 kWh). On-grid outage sizing had a related bug (`outageHours / 24` instead of `outageHours / 12`). Both fixed via the new `computeAutonomyEnergyRequirement` helper.

- **ENG-3 (medium)**: inverter clipping loss was non-monotonic at DC/AC ratio = 1.3 (jumped from -0.2% to -0.065% as ILR crossed 1.3, then increased again - physically impossible since higher ILR must yield more clipping). Formula is now continuous and monotone. Note: annual yield for arrays with DC/AC > 1.3 shifts by a small amount (+0.2% additional loss at ILR = 1.4) - this is the correct behavior (the pre-fix formula under-counted clipping in the 1.3-1.5 ILR band).
- **ENG-4 (low)**: hot-case string sizing used the Voc temperature coefficient instead of the Pmp coefficient (IEC 62548 §7.2). Undersized the minimum-modules count by 1 in some hot climates. Fixed by using `betaPmpPerC` when supplied, falling back to `betaVocPerC` for backward compatibility. Some configs that previously emitted no MPPT-floor warning will now correctly warn that the string is too short for the hot-case MPPT minimum.

- **ENG-5 (low)**: `calculatePoaIrradiance` was a collapsed 3-bin approximation of the Perez 1990 model that also dropped the zenith-angle terms (`f13·θ_z`, `f23·θ_z`). Replaced with the full 8-bin coefficient table (Duffie & Beckman 4th ed., Table 2.5.1). Clear-sky diffuse POA now matches hand calculation to ~1 W/m² (previously under-counted by ~13 W/m² at very high clearness). Affects only the `POST /api/v1/solar/poa` endpoint; no internal physics path consumes this function.
- **ENG-7 (low)**: tracker transposition gain in `computeWaterfallLosses` used a hardcoded fixed-tilt comparison baseline of 30° regardless of latitude, over-crediting the tracker at sites where the true optimal tilt is far from 30°. Baseline is now latitude-derived (`|latitude| × 0.88`). User-visible: reported tracker gain drops from ~42% to ~29% at Singapore (1.35°N) and shifts at Berlin (52.52°N); Tehran (35.69°N) is near-invariant (~24%). The ×1.168 fixed-tilt-over-GHI anchor and the non-tracker 16.8% baseline are unchanged. The underlying sun-path's absolute `poa_fixed/GHI` ratio is still low (~1.045 vs the ~1.18 physical expectation) - separate issue deferred to v1.1.0.

- **ENG-6 (low)**: LCOE denominator floored at 1 kWh, inflating LCOE by up to 1000x for pathological inputs producing finite-but-sub-unit discounted energy. Floor raised to 0.001 kWh. No observable change for realistic plants (discounted energy is in the millions of kWh); the guard only affects degenerate inputs.
- **ENG-8 (none)**: removed dead `const b = (2π·(dayOfYear − 81)) / 364` in `shadingSunPathEngine.ts` - a Cooper-equation intermediate left behind when the declination formula was switched to Spencer. No behavioral change.

## [1.0.0] - 2026-11-03

### Changed

- README rewritten to describe the actual stack (React 18 + Vite 6 + TypeScript 5, Express 4 via tsx); the out-of-tree .NET 8 MAUI + Blazor Hybrid + Rust + PostgreSQL + gRPC roadmap docs are archived with an explicit "NOT THE CURRENT IMPLEMENTATION" banner (BUG-11).
- `scripts/sync-docs.ts` rewritten to derive ADR titles/statuses from `docs/adr/` source instead of a hardcoded list; `docs/STATUS-RFC-3.0.md` regenerated with all 10 ADRs (BUG-12).
- `metadata.json` capabilities corrected — phantom `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` removed (BUG-19).
- `.env.example` now documents every runtime-read variable: `VITE_REAL_INTERNET`, `PORT`, `NODE_ENV`; `.env`/`.env.local` confirmed git-ignored (BUG-20).
- Full TypeScript migration to `strict: true` (Phases 5.0–5.4: safe sub-flags, `noImplicitAny`, `strictNullChecks` + `strictPropertyInitialization`, umbrella flip; zero `@ts-nocheck` remain).
- `verbatimModuleSyntax: true` enabled with all type-only imports converted (BUG-15).
- CI now runs `npm run lint`, `npm test`, and `npm run test:smoke` on every PR/push (BUG-17).

### Fixed

- BUG-1: `process.env` read directly in browser-bound modules — replaced with a cross-runtime `runtimeEnv` helper + Vite `define`; `src/` is now `process.env`-free.
- BUG-2: user pricing silently reset to defaults on every project save/load round-trip — `UserFinancialPricingSchema` aligned to the canonical 21-field `UserFinancialPricing` interface.
- BUG-3: NaN battery SoC in the 24h simulation for zero-BESS (powerplant) mode — guarded, SoC pinned to 100; sim24h tab hidden in powerplant mode.
- BUG-4: circular dependency between `climaticData.ts` and `dataGateway/*` — shared types extracted to leaf module `src/engine/types/climateTypes.ts`.
- BUG-5: a 1 MW utility plant displayed a 48 V "DC bus" — inverter DC bus (from MPPT ceiling) and battery DC bus are now reported as separate KPIs.
- BUG-6: string sizing used STC Vmp for the MPPT upper bound, over-sizing strings ~2 modules in winter — now uses coldest-day Vmp per IEC 62548 §7.2.
- BUG-7: financial engine had zero golden-value tests — added LCOE (independent recomputation), NPV, and IRR golden tests.
- BUG-8: FinancialTab numeric inputs could produce NaN LCOE via `discountRatePct = 0` — per-field sanitizer with minimums added.
- BUG-9: two diverging equipment catalogs — engine `DEFAULT_*` now derived from the canonical `equipmentCatalogData.ts` via adapters.
- BUG-10: tracker config crash during render — `computeTrackerState` sample wrapped in try/catch with a bilingual warning; GCR/rotation/axis-tilt inputs clamped.
- BUG-11: README advertised a .NET 8 MAUI stack that does not exist in this repo.
- BUG-12: `sync-docs.ts` wrote hardcoded, incorrect ADR summaries to the status doc.
- BUG-13: four dead components removed (QuickSizing, SizingCalculator, EpcProposalModal, CatalogManager).
- BUG-14: no React error boundary — any render throw blanked the whole app; `ErrorBoundary` added around `<App/>`.
- BUG-16: WebGL/Leaflet resource leaks under React StrictMode double-invocation — idempotency guards and ref-nulling cleanup added.
- BUG-17: CI never invoked `npm run lint`; pre-existing `projectMigration.ts` type error fixed so lint is a hard gate.
- BUG-18: stale `bun.lock` coexisted with `package-lock.json` — removed; npm is the pinned package manager.
- BUG-19: phantom Gemini capability advertised in `metadata.json` with no corresponding code.
- BUG-20: `.env.example` was missing the variables the app actually reads.
- BUG-22: literal `\n` (backslash + n) artifact in benchmark output polluted captured evidence files — fixed and evidence regenerated.

### Security

- `process.env` fully removed from `src/` (BUG-1); browser bundle no longer reads Node env directly.
- Post-strict audit (`docs/evidence/post-strict-audit.md`) records a full security grep pass: no `eval`, no `dangerouslySetInnerHTML`, no plaintext http network calls, no `process.env` in src; `JSON.parse` validation review deferred (Phase 6.5).
- `.env` / `.env.local` confirmed git-ignored (BUG-20).

### Internal

- TypeScript strict-mode migration data: `docs/evidence/phase-5.0-baseline.md`, `docs/evidence/phase-5.3-measurement.md`.
- Post-strict audit: `docs/evidence/post-strict-audit.md` — 0 fix-now, 6 defer, 5 accept; verdict READY for v1.0.0.
- Test suite grew from 110 to 117 with regression tests for BUG-3 (NaN SoC), BUG-4 (module-cycle), BUG-6 (cold-Vmp MPPT), BUG-7 (LCOE/NPV/IRR goldens), BUG-9 (catalog unification).
- Bundled Leaflet CSS via `main.tsx` import; unpkg CDN link removed from `index.html`.

[Unreleased]: https://github.com/hajianamir/solarpv-studio/compare/v1.0.3...HEAD
[1.0.3]: https://github.com/hajianamir/solarpv-studio/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/hajianamir/solarpv-studio/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/hajianamir/solarpv-studio/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/hajianamir/solarpv-studio/releases/tag/v1.0.0

## Applied research (bounded A1/D3; default off)

- Add authenticated nonlinear PVWatts/LCOE scenarios and pinned Gregorian local-calendar/DST bill ensembles with API/SDK/editor support.
- Add upstream pvlib/IANA provenance, independent TypeScript witnesses, offline numerical, security/rollback and browser tests.
- No automatic finance/energy adoption, calibrated UQ, measured-load claim or full A1–D3 completion. See `docs/features/APPLIED-RESEARCH.fa.md`.

## C3 spatial research kernel (partial, opt-in CLI only)

- Add bounded conservative 1D isothermal enthalpy finite-volume melting kernel; no API/SDK/UI integration or PV-T/PEM coupling claimed.
- Add independently generated 70-digit Neumann fixtures, 13 tests including space/time refinement, energy conservation, offline execution and CLI rollback.
- No annual-energy/finance adoption or experimental/material qualification. See `docs/features/STEFAN-SPATIAL.fa.md`.

## Spatial Stefan product integration (bounded C3)

- Add strict authenticated API/SDK/editor path for existing Stefan kernel behind independent default-off SPATIAL_RESEARCH_ENABLED.
- Add O(cells) constitutive/grid/energy witnesses (not a full PDE proof), tamper/flag/rollback and production browser archive/cancel tests.
- Preserve research-only boundary; no coupling, field qualification or full A1–D3 completion claim. See `docs/features/SPATIAL-INTEGRATION.fa.md`.

## B3 all-incoherent optics (bounded, default off)

- Add actual optional tmm0.2.0 incoherent adapter for normal incidence and all-thick layers with nonabsorbing outer media.
- Add independent geometric-series/phase-average witnesses, frozen engine-source provenance, API/SDK/editor, auth and dual flag rollback tests.
- No roughness, mixed-stack, measured EQE, electrical yield or full-roadmap claim. See `docs/features/INCOHERENT-OPTICS.fa.md`.

## D2 selected-material inventory research (default off)

- Add real PV ICE replay for seven frozen c-Si baseline materials and versioned caller-declared annual kg reconciliation with explicit context/boundary.
- Add source acquisition/projection, independent area/mass and ledger witnesses, glass regression, auth/flag rollback, API/SDK/editor and browser tests.
- No verified site inventory, whole-module LCA, carbon/cost credits or full-roadmap completion claimed. See `docs/features/MATERIAL-INVENTORY.fa.md`.

## C3 bounded one-way PV-T/PCM to PEM coupling (default off)

- Derive PEM mean interval electrical feed solely from collector electrical energy, area and transfer efficiency; reject manual nested forcing.
- Add coarse/fine H2 sensitivity, signed global energy ledger, API/SDK/editor and independent flag rollback tests.
- No thermal feedback, preheat credits, instantaneous-power feasibility, real equipment validation or full-roadmap claim. See `docs/features/PVT-PEM-COUPLING.fa.md`.

## A1 descriptive interval calibration interface (default off)

- Add exact-rank absolute-residual bands, explicit unbounded small-sample encoding and disjoint-site temporal holdout metrics; reject overlapping measurement windows.
- Add pinned author notebook/license provenance, independent finite-population/rank tests, API/SDK/editor and auth/flag/rollback/browser coverage.
- Exchangeability and model freeze remain unverified; no field calibration, energy P90, censored RUL interval, automatic finance adoption or full-roadmap completion. See `docs/features/INTERVAL-CALIBRATION.fa.md`.
