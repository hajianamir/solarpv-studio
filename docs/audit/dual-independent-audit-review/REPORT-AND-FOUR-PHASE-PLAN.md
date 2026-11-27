# Reconciliation of two independent audits and four-phase remediation plan

## 1. Scope, revision and decision

**Reviewed code:** `0c4d7cadc7db6001459ea36fdf9a3d1403179a71` (main merge of PR #49). Working branch: `arena/6a50ab5f-solarpv-studio`.

**Request:** study both supplied reports twice, verify their assertions against code, report what should be done, and prepare four detailed implementation phases. This is an assessment, not authorization to implement the proposed numerical changes. Only this report, diagnostic reproduction tooling and its output are added; production code, fixture registry, standards claims and acceptance gates are unchanged.

**Independent decisions:**
- Assessment/report: completed within the targeted review scope below.
- Remediation implementation: **NOT STARTED by this assessment**. Previously merged CAD/container fixes are not new work here.
- Verification: **PARTIAL engineering evidence**. Targeted reproductions and existing tests executed; no claim of independently auditing every source line or reproducing either auditor's entire exercise.
- Release: **BLOCKED for an unqualified full-validation claim**. Confirmed contract defects, disputed safety-model assumptions and inherited independent-reference debt remain. Screening disclosures do not establish project applicability, field accuracy, standards conformity or bankability.

Both reports contain useful findings, but neither is a safe implementation specification. A repeated assertion is not an independent confirmation. Do not implement their suggested constants/formulas indiscriminately.

### Two complete report-review passes

1. **Pass 1 — extraction and reconciliation:** read both reports' metadata, executive verdicts, inventories, formula sections, findings registers, boundary maps, evidence assessments, recommendations and appendices. Preserve report-local identifiers: **A-F01…A-F26** for report one; **B-H1/H2, B-M1…M14, B-L1…L14** for report two. Reconcile overlaps rather than sum their severity totals. The second report's headline counts do not cleanly match its enumerated register/classifications.
2. **Pass 2 — challenge and disposition:** revisit every finding and its proposed remedy; trace present symbols/call sites, inspect existing evidence/gates, execute targeted diagnostic probes and selected regression/reference suites. Challenge the standards and quantitative assertions separately from confirming that a line exists. The crosswalks below account for every enumerated ID, including disclosed/already-addressed findings.

Report A's line numbers mostly predate current App layout; report B's source baseline is not a reproducible commit SHA. Dates/edition names in the supplied text are claims, not source provenance. Current symbol/line references below supersede report line numbers. Repository/test metadata is retained as metadata, not treated as independently verified calendar history.

### Inspection coverage and limits

Targeted reads cover the reported expressions and consumers in App/server, structural/hourly thermal/annual yield/electrical/financial contracts, solar engine, single-diode, tracker, bifacial, cable/earthing/lightning, Broms/foundation wrapper, BIPV/T, pump, catalog, climate, UQ, reference registry/fixtures, skills and archived traceability documents. This is **not a new full line-by-line audit of all engines/UI/Python services**. Python dynamics, full MV applicability, licensed ASCE/IEC/IEEE clauses, current Iranian tariffs and site measurements were not independently revalidated. Their broad “EXACT”, “bankable” and “no unsafe direction” verdicts are not adopted.

## 2. Executive conclusion: what should be done

1. **Fix demonstrable boundary defects first:** AC/DC capacity and annual-energy wiring, UI PR source, explicit API azimuth semantics, inconsistent hot-cell fallback, Southern Hemisphere temperature phase, foundation wrapper rederivation, and parallel-cable impedance handling under declared topology assumptions.
2. **Resolve evidence-dependent safety models before changing constants:** wind Ke/Kz/Kd and load convention; MPPT rating basis; LPS geometry/current sharing; Broms equilibrium and acceptance factors. Do not relax a safety check just because one report calls it conservative.
3. **Unify annual energy and financial contracts:** signed thermal energy treatment, one explicit transposition/clipping policy, coherent PR definition, preserved energy-adoption controls, non-rounded cash-flow arithmetic and source-qualified monetary assumptions. Preserve deprecated interfaces through tested adapters.
4. **Qualify or replace unsupported advanced-model behavior:** bifacial GCR dependence, single-diode extraction/temperature coefficient semantics, BIPV/T gradients/heat balance, and pump PV-sizing policy. A plausible replacement is not a validated replacement.
5. **Complete evidence and release work:** live standards traceability, source/edition/applicability manifests, independently generated numerical comparisons, negative/mutation tests, real artifacts/platform runs and explicit disposition of the inherited 56 CAD reference records. Never regenerate targets from production to obtain a pass.

## 3. Corrections to the audit reports themselves

### 3.1 Wind: common implementation concern, conflicting proposed repairs

Current `structuralContract.ts:203–237` takes **meters** and computes `exp(-0.0000362 * elevationM)`. `calculateUnifiedKz` returns 0.88 when C/height omitted, but 0.849 at explicit 3 m. These code behaviors are confirmed. At 1000 m current Ke is approximately 0.96445; candidate `exp(-0.000119*z)` gives 0.88781 and `exp(-z/8000)` gives 0.88250. These are pressure-factor comparisons, **not wind-speed errors**.

A proposes a metric conversion; B asserts a different exponent and incorrectly says 0.0000362 has no relevant feet interpretation. Public worked guidance uses the feet expression, and public 7-22 explanations also place Kd in the pressure rather than velocity-pressure expression [S1, S2]. B's blanket “Kd must be 1.0 for fundamental building loads” is not established; 0.85 is used for building cases in those references. The code already accepts `windDirectionalityKd`; this is not simply a missing parameter.

**Disposition:** confirmed unit/model-definition problem; **do not approve either replacement solely from these reports**. Obtain the applicable edition, structural category and load-chain equations. Record whether the returned quantity is raw velocity pressure or directionality-adjusted pressure and apply Kd exactly once. Evaluate C/D minimum-height assumptions too; neither audit establishes all current table coefficients.

### 3.2 MPPT Isc: missing semantics is confirmed; universal factor removal is rejected

`electricalSizingContract.ts:180–203` always compares `1.25 × channel Isc` with a generically named inverter limit. Input/catalog contracts do not encode what the rating means. That ambiguity is real.

B's claim that inverter short-circuit limits **must never** involve this factor is overbroad. Enphase's published input table lists 25 A maximum short-circuit DC input current and explicitly permits 20 A module Isc using a 1.25 factor [S3]. This is a counterexample, not permission to apply Enphase rules to utility inverters.

**Disposition:** model manufacturer-defined rating basis, operating conditions and applicable factors. Preserve existing behavior through an explicitly qualified legacy path; unknown basis must not become a green compliance result. Keep conductor/OCPD, inverter operating current and inverter short-circuit capability separate. The reports' exact NEC clause references are not independently verified here.

### 3.3 Hot-cell arithmetic in B is wrong

At G=1000 and NOCT=45, the shared rise is `(45−20)*1000/800 = 31.25°C`, **not 25°C**. At NOCT=42 the rise is 27.5°C. The flat +25 fallback underestimates both examples. Below NOCT=40 (at the same irradiance) its bias can reverse. Fix the shared-input contract, not the reports' universal bias claim.

### 3.4 Broms remedies conflict and may be unsafe

A variously describes the existing sand expression as exact and questions it; B proposes replacing `(e+L)` by `(L−e)`. That change would increase capacity and becomes singular near L=e. Current source clearly defines e as the positive load lever arm above grade. No primary, applicable derivation supporting B's sign change was obtained. Available engineering documentation emphasizes head restraint and short/long-pile applicability [S6]; secondary examples are not sufficient to resolve the governing equations.

**Disposition:** do not implement B's sign change. Derive force/moment equilibrium with a drawing and explicit sign convention, section/soil/groundwater assumptions and short/long-pile checks. Independently benchmark before replacing capacity or bending equations. “Conservative” is not a demonstrated whole-design guarantee, particularly with the empirical bending arm and differing search/pass FoS.

### 3.5 Financial examples overstate what was established

A says OPEX becomes zero for residential systems below 10 kWp. Current initial OPEX is `round(31.5*capacity)*0.015` million Toman. Probes give first-year OPEX **5 million at 10 kWp, 2 million at 5 kWp, 0 at 1 kWp and 0.5 kWp**. Rounding distortion is confirmed; the claimed threshold is not. A capacity-based 0.5-million threshold is around 1.06 kWp before CAPEX rounding, not 10 kWp.

A nominal discount rate below debt interest is not inherently invalid: WACC, tax, financing and valuation basis matter. The defect is an undocumented fixed 20% and unclear basis, not a universal requirement that discount rate exceed loan rate. B's “2017-era” classification of defaults is unverified. Dated sources and explicit user assumptions are required; no replacement market rates are invented.

### 3.6 PR, bifacial and irradiance recommendations require qualification

- PR has no universal 100% physical ceiling. Cold operation, rating tolerance, denominator definitions and rear irradiance can affect the result. Do not remove genuine gains merely to force PR below 100. Define monofacial/front-reference vs bifacial-adjusted denominator and averaging explicitly; review the core PR validator's 0–100 bound alongside UI labels.
- Positive GCR sensitivity of the current proxy is confirmed, but replacing GCR by `1−GCR` does not establish a valid rear-irradiance model. A universal monotonicity theorem across every geometry, illumination and gain denominator is not established by the audit. Test controlled fixed-boundary regimes with a pinned external model.
- “Use PSH/4” is not an adequately defined annual temperature/irradiance model. Annual PSH alone does not specify the irradiance distribution needed for thermal or clipping integration.
- “Kasten–Young 1989” is misidentified in B's Perez discussion. Current code uses 0.15/93.885/−1.25, not the 1989 expression. Versioned pvlib documents distinguish those airmass choices [S4]. Correct clearness algebra and coefficient-table agreement do **not** prove whole-function parity, including airmass, extraterrestrial DNI, zenith convention and edge cases.

### 3.7 Evidence and scope claims need correction

- There are **100 registered expression-reference records** in `scripts/physics-reference-evidence.json`, across 10 source files, including thermal, IAM, snow, soiling and finance. B's “only two fixtures / no external references for those domains” is false for this checkout. Presence in a manifest does not automatically validate the whole module, mounting offsets or site applicability.
- Current catalog has **25 modules, zero with measured Vmp coefficient**, not the 23 stated by A. Unknown fields must stay unknown.
- B's “5th edition Meeus” and inconsistent Duffie/Beckman edition references are not accepted bibliographic locators. Pin actual editions/source locations in the traceability work.
- Re-running the stored SPA fixture confirms the stated numerical errors, but it is **comparison with an existing reference**, not newly running SPA. The fixture excludes the horizon (`5 < zenith < 85`); it cannot establish a horizon/refraction guarantee.
- B excludes App, protection and BIPV internals from line audit in Appendix B. Its broad correctness/safety summary cannot cover those omissions. A's global “exhaustive every engine expression” claim is not independently substantiated by its supplied evidence.

## 4. Findings crosswalk — report A (every enumerated finding)

Status vocabulary: **Confirmed** = source behavior/contract verified (not automatically standard violation); **Partial** = observation valid but quantitative/remedy/applicability claims need correction; **Retain** = disclosed limitation or historical mitigation, not a new fix; **Evidence** = source/standard not sufficiently established. P1…P4 refer to the four phases in §8. U IDs identify consolidated work packages.

| ID | Present-code evidence | Disposition and required action | Plan |
|---|---|---|---|
| A-F01 | `core/structuralContract.ts:231–237`, metric argument + feet-like exponent | Confirmed mismatch; resolve SI coefficient/edition and raw-vs-adjusted pressure before replacement. Do not accept B's competing equation by voting. | P1/P2 U01 |
| A-F02 | `core/hourlyThermalEngine.ts:38–55` phase fixed at day 200 | Confirmed hemisphere-insensitive synthetic season; make phase explicit, hemisphere-aware and documented. Bias magnitude depends on inputs. | P2 U02 |
| A-F03 | `core/annualYieldEngine.ts:149–176`; App `:1214` supplies hourly override | Confirmed canonical/App thermal-policy mismatch; one annual evaluator with complete inputs/provenance. | P2 U02 |
| A-F04 | `App.tsx:3128–3135` passes AC target and day×365 | Confirmed financial boundary defect. Use actual DC and eligible annual energy with explicit mode/basis. | P1 U03 |
| A-F05 | `solarPvEngine.ts:615–622`; `server.ts:427–439` | Confirmed legacy HTTP south vs library north default. Version/deprecate; reject ambiguity in new contract, preserve documented legacy behavior. | P1 U04 |
| A-F06 | `structuralContract.ts:162–194,225–227` | Confirmed omitted/explicit height discontinuity. Resolve default and verify applicable height/exposure tables. | P2 U01 |
| A-F07 | `singleDiodeModel.ts:41–50,100–108,171` | Confirmed unused gamma; beta only seeds root. Separate parameter translation from extraction; compare non-STC sensitivities or explicitly disclose unsupported coefficients. B's blanket SDM correctness is insufficient. | P3 U05 |
| A-F08 | `App.tsx:2337–2338,3007–3013` | Confirmed PR source drift and AC/DC SLD mismatch. Use named metrics; handle legitimate zero, not `||0.805`. | P1 U03/U06 |
| A-F09 | `waterfallLossEngine.ts:86–120` | Confirmed 1.168 tracker anchor differs from site curve. Align baseline/denominator to the actual tracker comparison, not just substitute a constant. | P3 U07 |
| A-F10 | `tracker/backtrackingEngine.ts:273+` synthetic path; waterfall scalar use | Retain clear-sky limitation; cloudy-climate numerical bias ranges not reproduced. Offer explicit chronology rather than auto-correct by arbitrary clearness scalar. | P3 U07 |
| A-F11 | `thermalDerate.ts:47,55`; waterfall `:218–220` | Confirmed signed annual thermal inconsistency. Additional consumer issue: waterfall clamps a negative hourly loss override to zero, so fixing thermal leaf alone will not preserve cold gains. | P2 U02 |
| A-F12 | `thermalDerate.ts:38–46` | Retain unvalidated mounting warning. Do not replace offsets without independent domain evidence; characterize low-G sensitivity. | P3 U08 |
| A-F13 | `vmpTemperatureCoefficient.ts`; catalog interface `:17` and records | Confirmed measured-field gap; 0/25 populated. Datasheet acquisition/provenance, no fabricated beta_Vmp or alpha_Imp/alpha_Isc. | P1/P3 U09 |
| A-F14 | `protectionBomEngine.ts:343–353,395–408,423–445` | Confirmed fixed X despite parallel R reduction. Use declared equal-sharing topology and recompute voltage drop within each candidate search; do not universally assume X/N for arbitrary arrangements. | P2 U10 |
| A-F15 | `protectionBomEngine.ts:736–748,824–827` | Confirmed assumed surface/fault/clearing/mesh values; compliance remains null. Add optional explicit sourced fault/surface/clearing inputs and assumption ledger; never make it certified by adding two fields. | P2/P3 U11 |
| A-F16 | `protectionBomEngine.ts:889–929` | Confirmed class-only angles 55/45/35/25 and comment/code kc mismatch; angle ignores height. Exact tabular/function replacement requires source edition, geometry, topology and domain. | P2 U12 |
| A-F17 | `geotech/bromsMethod.ts:64–112` | Empirical bending arm confirmed. Capacity remedies disputed; obtain applicable equilibrium/reference cases. Include groundwater/effective stress and pile regime. | P2 U13 |
| A-F18 | `structureRecommendationEngine.ts:262,275` | Confirmed wrapper rederives uplift with 1.15 despite shared result. Return shared reaction and verify every report/BOM consumer. | P1 U14 |
| A-F19 | `bipv/bipvThermalEngine.ts:315–337` | Confirmed 1.417 enhancement and inverse-length gradient with 12°C floor. Do not certify by fitting one target. Define fixed-mass-flow vs velocity/area conditions, solve balance and local profile. | P3 U15 |
| A-F20 | `iranianRegulationsFinancial.ts:85–126,133–179` | Confirmed intermediate integer rounding/fixed discount/escalation. Small-system example corrected in §3.5. Use full-precision ledger and explicit economic basis. | P2 U16 |
| A-F21 | `annualYieldEngine.ts:100–109`; waterfall `:289–290` | Confirmed duplicate heuristic, not “physical” clipping validation. Consolidate without first changing outputs, then benchmark chronological alternatives. | P2/P3 U07 |
| A-F22 | `bifacialGain.ts:82–86,179–182` | Positive proxy slope reproduced. Do not blindly flip to 1−GCR or promote chord mode to validated. Flag unsupported sensitivity pending external comparisons. | P1/P3 U17 |
| A-F23 | `solarPvEngine.ts:538–612`; stored SPA metadata | Scope qualification warranted; empirical maxima only apply to tested sites/times. No universal ±0.02° or horizon-accuracy warranty. | P4 U18 |
| A-F24 | `solarPumpEngine.ts:89–104,122–143` | Rounding/standard-motor coupling confirmed. PV sizing from duty vs nameplate is a design-policy choice requiring startup/VFD/energy constraints; not automatically a defect. | P3 U19 |
| A-F25 | `uncertaintyPropagation.ts:80–86,542–585,632`; result validator | Retain qualifications. Correlation scores are not Sobol attribution; sampling uncertainty must be measured, not accept a universal ±3–4% from N=100. | P3/P4 U20 |
| A-F26 | engine headers and `verify-engine-claims.ts` | Existing null-conformity/provenance guards confirmed and executed. Maintain; do not reopen as if no mitigation exists. Broader wording gaps remain below. | P1/P4 U18 |

## 5. Findings crosswalk — report B (every enumerated finding)

| ID | Present-code evidence | Disposition and required action | Plan |
|---|---|---|---|
| B-H1 | `electricalSizingContract.ts:180–203` | Partial: factor unconditional, semantics missing. Universal removal refuted by manufacturer example (§3.2). Introduce basis/provenance and unknown-state policy. | P1/P2 U09 |
| B-H2 | `structuralContract.ts:203–237` | Partial: metric exponent concern confirmed; e^(−z/8000), Kd=1 universal default and wind-speed wording not accepted. Kd already configurable. | P1/P2 U01 |
| B-M1 | thermal offsets `thermalDerate.ts:38–46` | Retain disclosed assumption; quantify controlled sensitivity, no unsupported replacement. | P3 U08 |
| B-M2 | thermal G default `:35,54` | Confirmed scalar annual approximation. Proposed PSH/4 is not a reference-quality repair. | P2 U02 |
| B-M3 | `solarPvEngine.ts:285–296` | Confirmed fallback uncertainty. A “conservative −0.35” is not conservative at both string bounds. Preserve diagnostics; block unqualified assessment when missing. | P1/P2 U09 |
| B-M4 | electrical hot fallback `:156` | Confirmed drift; report's NOCT=45 arithmetic wrong. Require/pass shared thermal inputs and compare consumers. | P2 U02/U09 |
| B-M5 | electrical ratings `:465–477,549–569` | Heuristic exists; downstream unassessed/blocking mitigation exists. Improve type/naming, retain hard gate. | P1 U09 |
| B-M6 | electrical header `:12` | Confirmed remaining “Compliant” wording. Also inspect Broms “Conforming to” and foundation “adhering” language; current claims gate does not catch all scope inflation. | P1 U18 |
| B-M7 | clipping duplicate locations above | Confirmed heuristic and duplication. One owner + explicit screen metadata; external replacement requires climate/ILR domain evidence. | P2/P3 U07 |
| B-M8 | waterfall `:213–220` | Confirmed default hot conditions as annual stage. Explicit annual vs design types; preserve old API via qualified adapter. | P2 U02 |
| B-M9 | tracker synthetic path `:273+` | Confirmed simple profile. Model/bias assessment partial; do not silently add airmass term and present as validated weather. | P3 U07 |
| B-M10 | `harmonicsEngine.ts:117–164,184–210` | Internal thresholds, synthetic harmonics and 50 Hz confirmed; standard table identities/numerical repairs not established. Do not encode B's B.1/B.2 story as fact. Need applicable PCC/voltage/edition/generation rules and spectrum provenance. | P1/P3 U11 |
| B-M11 | Broms `:64–107` | Disputed reference/sign remedies; reject L−e substitution pending derivation. “Safe direction” not a whole-model proof. | P2 U13 |
| B-M12 | Broms `:53,75,97,134` | Different search/pass criteria confirmed. Search exhaustion already blocks; code difference alone does not prove an exhausted design passes. Define lateral target vs section moment acceptance separately, then enforce/document. | P2 U13 |
| B-M13 | financial defaults `financialEngine.ts:75–97,974`; contract `:79–111` | Untraceable/time-sensitive default provenance confirmed; “2017-era” and replacement prices unverified. Require dated sources or explicit non-market assumptions, stale flags and currency basis. | P1/P2 U16 |
| B-M14 | archived appendices 04/06; only matching standards document found | Live traceability gap confirmed; archives already prominently marked. Build implementation-specific matrix; not a certificate. | P1/P4 U18 |
| B-L1 | `annualYieldEngine.ts:412` vs waterfall `:86–111` | Confirmed transposition drift. One named owner with baseline conventions and compatibility tests. | P2/P3 U07 |
| B-L2 | waterfall PR `:333`; annual core `:425–426` | Definition concern valid; claim that positive gains automatically invalidate PR/requires ≤100 is rejected. Define/label denominators and test signed gains. | P1/P2 U06 |
| B-L3 | `bifacial2dViewFactor.ts:~150–180` heuristic factors | Retain unvalidated energy/view-factor residual qualification; no claim of energy-conserving Hottel model. | P3 U17 |
| B-L4 | `optical/iamEngine.ts` temperature-coupled extension | Retain internal-extension distinction. Do not assume universal negligible 0.3% without domain; optional explicit model selection. | P3 U08 |
| B-L5 | `singleDiodeModel.ts:11,103–108` | vt is module/string aggregate thermal voltage excluding n; internal a includes n. Comment says per-cell kT/q, so naming/docs mismatch is broader than n omission. Preserve field; add clear a/nNsVth alias if needed. | P3 U05 |
| B-L6 | tracker header `:2`; fixture generator pins 0.13.1 | Provenance mismatch confirmed; distinguish actual 0.13.1 fixtures from legacy 0.16.1 claims, not a global search/replace of all versions. | P1 U18 |
| B-L7 | electrical battery comment `:340` | Confirmed Arrhenius/Peukert overclaim over linear model. Fix wording and negative claims regression. | P1 U18 |
| B-L8 | `climaticData.ts:~239–260`; overrides/provenance | Retain analytical classification; explicit site-investigation readiness gate for beyond-screening use. A checkbox alone is not geotechnical evidence. | P1/P4 U11/U13 |
| B-L9 | climate `:328` | Fixed seismic coefficient confirmed. Require jurisdiction/hazard evidence, or unassessed; no invented coordinate lookup. | P1/P4 U11 |
| B-L10 | `solarPvEngine.ts:368–386` | Invalid-input zero confirmed. Introduce typed unavailable result via compatible adapter; distinguish genuine zero, invalid and undefined denominator. | P2 U16 |
| B-L11 | climate `:305` | Heuristic elevation confirmed. Audit provider precedence and provenance on every structural consumer; do not silently overwrite explicit user data. | P1/P2 U01/U11 |
| B-L12 | `solarPvEngine.ts` quick sizing; assessment response type | Retain screening-only sizing-equation-reversal disclosure. Test fleet feasibility; no source found for replacing heuristics with another fixed anchor. | P3/P4 U09 |
| B-L13 | `waterfallArgs.ts:99,102–122` | 16/17 doc mismatch confirmed; named builder still returns 17-slot legacy tuple. Migrate through typed adapter; do not simply delete compatibility/arity tests. | P2 U07 |
| B-L14 | solar/financial/contract solvers and wrappers | Duplication confirmed; not all APIs have identical purposes/inputs. Consolidate shared kernels only after solver/error/currency/degradation/salvage behavior matrix. Include Iranian solver omitted by simplistic “three solvers” count. | P2/P3 U16 |

## 6. Reproduction and test evidence

### Reproducible diagnostics

Run from repository root after locked dependency installation:

```sh
npx tsx docs/audit/dual-independent-audit-review/probes.ts
```

`probe-results.json` records actual production-function outputs and explicit inputs. Candidate wind equations are labeled **not approved targets**. The script never imports production output into the physics fixture manifest. Its successful exit means it ran, not that all observed engineering behavior is correct.

| Observation | Executed result | Interpretation |
|---|---|---|
| Stored SPA comparison | 887 rows; max zenith 0.0058638014°, azimuth 0.0224826298°; 0 out of stored tolerance 0.05°/0.15° | Independently sourced stored component comparison; no horizon/field validation |
| Kz omitted vs explicit C,3m | 0.88 vs 0.849 | Default contract discontinuity |
| Synthetic thermal at ±35° with identical PSH/extremes/mean | North loss 4.26982334%, South 2.94926847% | Reproduces consequence of unflipped season; difference alone is not an exact oracle for a repaired climate model |
| Shared hot cell at ambient 40 | NOCT45:71.25°C, NOCT42:67.5°C, electrical fallback:65°C | Corrects audit arithmetic and shows drift |
| One MPPT: Isc14 A, inverter limit16 A | Compared current17.5 A; blocks current | Confirms implemented factor, not manufacturer applicability |
| SDM at 70°C, changing gamma −0.30→−0.40 or beta −0.26→−0.40 | Same rounded Voc42.84 V and Pmp451.1 W for this sample | Supports source-level unused/initial-guess concern; not an exhaustive sensitivity proof |
| Proxy GCR0.3→0.6 at bf0.8/albedo0.22 | Gain2.376%→4.752% | Confirms positive slope in controlled proxy, not a validated replacement |
| Catalog | 25 total, 0 measured Vmp coefficients | Missing manufacturer data, not permission to invent values |
| Iranian OPEX | 0.5/1 kWp round to0; 5→2,10→5 million Toman | Precision defect; A's10 kWp cutoff incorrect |
| Invalid LCOE denominator | 0 returned | Ambiguous public error contract |

### Commands actually run in this review

Node 22.22.3; `npm ci` completed. No production build/browser/Docker run is claimed for this assessment (those are future phase gates or historical evidence in earlier receipts).

| Command | Outcome / scope |
|---|---|
| `npm test` | exit0; executable regressions pass; stored retired bifacial target remains WARN |
| `npm run test:accepted-audit` | exit0; synthetic window/coefficient/catalog/persistence and HTTP aliases/legacy/infeasibility checks |
| `npm run verify:engine-claims` | exit0; current bounded claims guards, not proof all wording is correct |
| `npm run test:skills` | exit0; format/discovery parity, not semantic audit completeness |
| `npm run verify:physics-registry` | exit0; registry contract |
| `npm run verify:physics-reference-gate` with `PHYSICS_DIFF_BASE=0c4d7ca…` | exit0; no changed production formula expressions in this report-only patch. Embedded reference-gate regression fixtures also ran. **Not proof inherited formulas are validated.** |
| `npm run test:cad:evidence-review` | initial exit1 because shallow checkout lacked baseline; fetched exact71a7c2b object, rerun exit0:56 expressions/56 missing records |
| direct physics gate with `PHYSICS_DIFF_BASE=71a7c2b…` after fetch | exit1; inherited CAD56-reference gap reproduced |
| diagnostic probes | exit0, output saved alongside this report; internal reproductions distinguished from SPA stored-reference comparison |
| `git diff --check` | run at final review; no application behavior modifications |

Initial missing-history failures are not evidence of a formula defect. Fetching history fixed the prerequisite, not the independent-reference deficit. Full logs are local `.cache/dual-audit/*.log` and are ephemeral; durable observations are in this report and the result/receipt files.

## 7. Boundary and risk map

| Authoritative quantity | Current drift / risk | Required destination contract |
|---|---|---|
| Actual PV DC kWp | AC target sent to SLD/regulations | Module-count×module-nameplate DC; separate installed AC and requested target |
| Annual energy | Representative day×365 vs waterfall vs eligible adopted chronology | Named annual quantity, temporal scope, AC/DC/grid/self-consumed boundary, provenance; retain full-year/context adoption gate |
| PR | HUD derate vs waterfall compound, hard0–100 helper | Explicit numerator/denominator/irradiance/reference power; named screen vs chronological metrics |
| Hot vs annual thermal | +25 fallback; mean/max scalar; hourly; signed clamp | Separate design-temperature and annual-energy contracts sharing physical kernels |
| Azimuth | Library north vs HTTP legacy south | Explicit convention at new boundaries; versioned aliases and conflict handling |
| MPPT current | Generic Isc limit with unconditional factor | Per-channel allocation + rating definition/source/conditions and assessed status |
| Wind/foundation | Unit factor, default height jump, rederived uplift | Edition/category/units; one pressure-to-reaction chain; no duplicated Kd |
| Parallel cable | R scales with runs; X fixed, search uses single-run drop | Per-candidate complex impedance under declared sharing/arrangement assumptions |
| Monetary results | Integer intermediate million-Toman, unexplained nominal20% | Full-precision ledger, explicit currency/rate/tax/valuation basis and data vintage |
| Reference evidence | Branch-diff green vs inherited CAD56 gap | Baseline-aware evidence inventory, executed records and unresolved-debt register |

### Priority, not copied severity totals

**P0 containment/contract risk:** ambiguous Isc assessment; structural standard/unit ambiguity; LPS unsupported geometry; finance/SLD AC/DC/annual-energy mismatch; unsupported positive validation/conformity language. Safety-model uncertainty outranks the attractiveness of energy improvements. Keep engineering outputs qualified or unassessed where evidence is missing.

**P1 correctness/consistency:** shared thermal/signed annual flow, hemisphere phase, azimuth migration, wrapper reactions, impedance candidate search, financial precision/error semantics.

**P2 model quality/evidence:** tracker/cloud/clipping/bifacial/SDM/BIPV/pump/UQ benchmarking and sourced equipment/economic data. These must not be silently promoted to certified engineering after internal tests.

## 8. Detailed implementation plan — exactly four phases

Phases are dependency/acceptance stages, not deadlines. Each work package ends in a recorded automated disposition: PASS within declared scope, FAIL, BLOCKED missing evidence, or explicitly qualified screening. No unstated human-approval dependency. Missing governing information blocks the affected model/claim; safe independent work can continue. Effort estimates below are planning bands, **not commitments**, and exclude source licensing/data acquisition time.

### Phase 1 — Establish authoritative contracts, evidence and containment

**Objective:** prevent known boundary inconsistencies and ambiguous inputs from being presented as reliable design/financial outputs; decide disputed rules before editing formulas. **Indicative effort:** 4–7 engineering days plus evidence acquisition. Depends on this baseline assessment only.

| Package | Implementation work / files | Acceptance and required tests |
|---|---|---|
| U01a Wind decision record | In ADR/traceability, define ASCE edition, structural category, meters/feet, Kz height/default, Ke equation/domain, Kd location, pressure/reaction basis; enumerate structuralEngine/foundation/recommendation/report consumers. | Source locator and applicability sufficient to derive0/500/1000/2000m cases; original/audit-A/audit-B candidates recorded separately. If unavailable, retain qualified legacy screen and block ASCE-conformity claim; no coefficient swap. |
| U03 Capacity and energy binding | Introduce a named view-model for actual DC, installed AC, requested AC and eligible annual energy. Fix IranianRegulationsTab/SLD to consume correct fields. Test representative-day outputs never substitute for adopted full-year annual quantity. | Three modes, DC/AC ratio1/1.25/1.5, zero/invalid/stale projects; nameplate equals module count×Pmp within display rounding. Real UI/report/download/read-back tests ensure one capacity/energy basis. Preserve monetary-model behavior until Phase2. |
| U04 API azimuth decision/migration | Inventory direct callers, north/south aliases and HTTP consumers. Define explicit new convention; keep legacy route default through adapter with deprecation metadata, or version route before a breaking change. | Paired TS/HTTP east/west/north/south vectors; explicit aliases agree; conflicting/unknown aliases reject; omitted convention follows documented version, not silent180° flip. Regression covers persisted projects and clients. |
| U06a PR and label contract | Define screen PR/derating/compound factor and monofacial vs bifacial denominator. Remove misleading universal100% ceiling from requirements, not blindly from validators. | One definition sheet; tests for zero, negative loss/cold gain, positive tolerance, rear contribution and unavailable irradiation. UI labels use correct metric; no `||` fallback replacing valid0. |
| U09a Electrical rating/data readiness | Extend schema with rating basis and source/conditions (STC permissible array Isc vs maximum terminal capability vs required multiplier; conductor/OCPD separate). Audit every adapter, MPPT channel, catalog snapshot and HTTP boundary. Mark unknown measured coefficients and generic65/90A ratings unassessed. | Manufacturer-specific examples plus independent synthetic basis tests; unknown/ambiguous legacy basis cannot gain false green. Preserve known assessed behavior and overload blocking. No universal removal of1.25 or insertion of “conservative” beta. |
| U11a/U18a Claims and readiness | Correct surviving electrical/Broms/foundation overclaims; label analytical elevation/soil/seismic and internal harmonic thresholds. Create live standards/evidence matrix for current TS/Python implementation. Keep archived roadmap banner and all existing null-conformity fields. | Expanded claims negative tests reject reintroduced certification wording; UI/artifacts retain qualifications. Matrix includes source version/domain, inputs, evidence IDs, status and unresolved claims—not just standard names. |
| U16a/U17a Economic/model containment | Mark monetary defaults as dated sourced values or illustrative user assumptions; expose discount/currency basis. Add explicit unsupported bifacial-sensitivity status/warning without claiming a new physical model. | No unavailable market data presented as current official tariff. No unsupported default/bifacial output eligible for new bankability claim. Overrides and existing saved projects remain recoverable. |

**Phase1 exit gate:** all A/B IDs have disposition/source owner/test plan; high-risk unsupported claims contained; corrected capacity/energy/azimuth contracts pass unit, integration, browser and artifact tests; no actual formula replaced without its reference strategy. Record unresolved wind/MPPT/LPS/Broms evidence as BLOCKED rather than selecting one auditor's opinion.

**Flag/rollback:** explicit legacy adapters for versioned azimuth/current semantics; new view-model may be rolled back only with UI/financial calculation disabled for inconsistent states. Keep project schema migration backward readable. Never restore false-compliance wording as rollback.

### Phase 2 — Correct shared numerical kernels and propagate contracts

**Objective:** implement proven correctness fixes with independent references and consumer parity; resolve safety math only where Phase1 evidence supports it. **Indicative effort:** 7–12 engineering days, excluding blocked standards acquisition. Depends on Phase1 decisions.

| Package | Implementation work / files | Acceptance, references and regression matrix |
|---|---|---|
| U01b Wind/Kz | Apply approved SI/edition mapping and one Kd placement. Remove omitted/explicit default discontinuity using declared default height. Validate finite/range/domain inputs and negative/sea-level behavior explicitly. | Independently calculated/reference cases for exposure B/C/D, low/boundary/tall heights,0/500/1000/2000m, Kd variants; same reaction across structuralEngine/foundation wrappers and reports. Test no Kd double application. Do not treat reproducing the new equation in a TS test as external evidence. |
| U02 Thermal owner and hemisphere | Define `hot_design` temperature vs annual signed energy result. Share hot-temperature kernel in MPPT. Make synthetic seasonal phase hemisphere-aware, explicitly define equator/default phase, and require sufficient annual-profile inputs or retain qualified scalar fallback. Propagate negative annual loss through builder/waterfall/App/reports rather than clamping at0. | Ground/roof/shed; NOCT40/42/45; signed gamma; cold/hot, ±latitude/equator/polar; zeroPSH; invalid/extreme temperatures. Preserve annual PSH integral and zero-generation semantics. Hot design unchanged unless explicitly covered. Direct annual API/App/HTTP/reports agree given identical model/input. Benchmark external hourly temperatures/energy separately from synthetic phase metamorphic tests. |
| U09b Electrical implementation | Use shared thermal inputs; apply rating-basis-specific factors and manufacturer conditions per channel, not fleet averages. Maintain operating current, terminal short-circuit capability, conductor/OCPD and voltage-window checks separately. | Factors1/1.25/declared model; basis unknown; uneven/balanced allocation; bifacial/enhanced-current assumptions; exact-limit and adjacent-float tests; measured/proxy/missing beta cases. Include catalog→selection→save/import→HTTP and all three sizing paths. Missing evidence cannot become assessed. |
| U10 Cable candidate search | Calculate R and X for each candidate/runs combination under explicit equal-length/equal-sharing arrangement; use same evaluator for sizing and reported drops. Retain ampacity/grouping/adiabatic checks and explicit unsatisfied result. | DC,1φ,3φ; PF1/.9/.7; N1/2/3/6; long/short and high-current feeds; R-only/X-only limiting cases; independently sourced equal-sharing calculations. Unknown arrangement not represented as generally valid X/N. Verify actual chosen candidate satisfies every condition. |
| U12 LPS | Replace height-independent angles and ambiguous kc only from applicable source/geometry/topology. Otherwise return unassessed angle/separation while retaining qualified rolling-sphere information. | ClassI–IV at several heights, upper-domain cutoff, one/multiple down-conductors, ring/non-ring, isolated/bonded topologies; unsafe interpolation/extrapolation rejected. Exact kc selection supported by source, not code comment. Real UI/report null/unassessed rendering tests. |
| U13 Broms/FoS | Derive head-condition-specific equilibrium and maximum bending, validate section properties/regime and groundwater inputs. Resolve requested search factor, sand floor and moment acceptance as explicit separate policies. Keep search exhaustion blocking. | Independent worked sand/clay/free/fixed/short/long or unsupported cases; varied lever arm, L≈e, soil inputs/frost, zero/extreme load; search limit and candidate/pass equivalence. Never adopt L−e without valid derivation. Record unsupported regimes as unassessed. |
| U14 Shared uplift | Replace wrapper's1.15 rederivation with authoritative reaction; review wrapper's independently reconstructed moment/clearance as well. | Shared/wrapper equality across tilt/dead load/posts/wind and all foundation options; artifacts use same result. Exact comparison justified for shared values, not claimed external validation. |
| U16b Precision and economics | Keep full-precision Toman or documented base unit in ledger; round at display/export formatting only. Make discount/escalation/currency/valuation inputs explicit with legacy migration. Separate project vs equity cash flow, debt service and DSCR. Introduce unavailable/error result for invalid LCOE with deprecated-compatible adapter. | 0.5/1/5/10/50/1000kWp; zero debt/interest, balloon/final payment, replacement/salvage, negative/nonconventional flows, nominal/real scenarios; independently generated Decimal/spreadsheet calculations with provenance. Verify displayed rounding does not feed IRR/NPV. Do not force discount≥debt rate as an invented law. |
| U07a Shared scalar infrastructure | Extract one unchanged clipping screen and one named transposition policy; migrate17-slot calls through typed named adapter while retaining deprecated signatures. Characterize behavior before consolidation. | Equality tests for aliases/old projects; defaults/undefined/NaN/zero boundaries; all consumers use same chosen policy and label. Update17-arity docs; do not delete compatibility checks until migration policy permits. |

**Phase2 exit gate:** each changed expression has governing equation/source, applicable domain, units, tolerance rationale, independent evidence record/execution and mutation sensitivity as required by current policy; all affected consumers pass. Unresolved work stays disabled/unassessed, not falsely marked complete. Tests must prove reproduction of the original defect and its correction. Run lint/build/core/accepted audit/protection/structural/financial regression and reference gates before advancing model adoption.

**Flag/rollback:** versioned model policy persisted with projects/results; recompute/invalidate dependent cached outputs on policy change. Legacy values may be displayed as historical qualified results, not silently promoted. Safety-model rollback disables unsupported design decisions rather than reopening known unsafe acceptance.

### Phase 3 — Validate model quality and eliminate architectural drift

**Objective:** improve fidelity only where reference evidence supports it; do not confuse consolidation with validation. **Indicative effort:** 10–20 engineering days; data/source acquisition may extend it. Depends on Phase2 interfaces; independent experiments may begin earlier but cannot auto-adopt outputs.

| Package | Work and experiment design | Acceptance/evidence boundary |
|---|---|---|
| U05 Single diode | Separate fitted reference parameters from De Soto parameter translation. Fit from suitable datasheet/IV/temperature data or accept explicit externally fitted parameters. Declare which beta/gamma constraints can be satisfied and fitting residuals; preserve legacy output through adapter. Clarify vt vs nNsVth without breaking serialized results. | Compare pinned pvlib/CEC/De Soto cases at STC, low/highG and cold/hot temperatures; Voc/Isc/Vmp/Imp/Pmp and coefficient-sensitivity sweeps. Check convergence/physical bounds/fitting failures. Do not claim unused gamma honored or solve an underdetermined fit by inventing coefficients. |
| U07b Yield/transposition/tracker/clipping | One annual evaluator selecting explicit screen or chronological model. Align fixed baseline and tracker/GHI ratio; characterize cloud/diffuse dependence with fixed/racking/terrain assumptions. Benchmark clipping over ILR, weather and temperature without tuning to retired targets. | Source-pinned weather/equipment cases: north/south, cloudy/clear, fixed/tracker, ILR1–2+, inverter model and loss-boundary accounting. Compare time-series energy, not only scalar gain. Real profile/reference acquisition documented; synthetic invariants remain separately labeled. Preserve legacy screening option and metadata. |
| U08 Thermal/IAM extensions | Sensitivity table for mounting offsets versusG/wind/mounting; compare SAPM/Faiman parameterized cases without pretending one parameter set represents every roof. Isolate internal thermo-optic IAM extension from referenced M&R/Fresnel models. | Component fixtures using verified parameter sets; night/lowG behavior; annual weighted losses; explicit model toggles, assumptions and provenance. No auto replacement of roof offsets from a single calibration case. |
| U17 Bifacial | Benchmark proxy/chord behavior against pinned infinite-sheds or independently executed external model in matched geometries. Decide retire/disable/restrict proxy vs introduce validated component option. Account for front/rear denominator, shading, height, pitch and view-factor residual. | Controlled GCR sweeps under fixed height/tilt/albedo/illumination; clear/diffuse, rear beam/night, cap behavior; view-factor/energy closure where model claims it. Independent whole-model SAM/PVsyst case requires actual source files/engine execution. Retired10.4% target remains WARN until independently reproduced, not force-fit. |
| U11b Protection/harmonics/site data | Add fault-clearing/surface/fault-current metadata to earthing screens; integrate sourced PCC limits, system frequency and spectrum only under applicable standard/jurisdiction. Provider elevation precedence, geology/seismic unknown states and project-readiness flags remain explicit. | Data-supplied vs missing/assumed inputs;50/60Hz, voltage/PCC categories, utility generation and source spectrum. Preserve `isEarthingSafe/isThdCompliant/... = null` without conformity evidence. No automatic selection of B's contested table values. |
| U15 BIPV/T | Replace empirical axial profile only after defining control volume, geometry, mass flow vs velocity, convection/radiation/electrical/thermal balances. Remove or qualify1.417 tuning factor. | Published/independent thermal cases and energy residuals acrossG, airflow, duct length, area, inlet/ambient and forced/natural modes. Zero/lowG and12°C gradient-floor behavior tested. Finite differences checked under fixed physical boundary conditions; no one-point “IEA validation”. |
| U19 Pump | Separate duty hydraulic/shaft demand, standard motor selection, VFD/startup requirements and PV energy/power design. Compare nameplate-based oversizing policy with duty-based option; retain precision internally. | Water-demand/head/flow sweeps across motor step boundaries, pipe diameter/friction, efficiency, PSH and startup threshold. Verify daily water/energy objectives, not merely smoother kWp curve. Preserve documented conservative design option. |
| U09c Catalog | Acquire manufacturer coefficient/rating source data only where available; add provenance, version, units and applicable module/inverter variant. Preserve undefined fields and customer snapshots. | Supported fields survive catalog adapter/selection/storage/import/API/report. Manufacturer beta_Vmp is never inferred from gamma/alpha_Isc and labeled measured. Unknown ratings remain unassessed. |
| U16c Financial kernels | Compare all public financial paths, including Iranian model, by valuation basis; consolidate mathematical kernels while retaining method-specific inputs and deprecated exports. | Standard/nonconventional/no-root/multi-root cash flows, discount boundaries, demand-constrained energy, signed import/export economics, currency conversions and non-rounded ledgers. Independent calculation fixtures; no “bankable” label from algebra parity. |
| U20 UQ | Preserve r² exploratory-score label; evaluate sample-size/seed convergence and quantile variability for representative independent/correlated inputs. Distinguish epistemic/aleatory assumptions and optional conditional sensitivity methods. | Archive/replay and worker/main parity, quantile order and finance gates; empirical confidence/convergence intervals with assumptions. No normalized r² presented as additive variance attribution or N=100 guarantee. |

**Phase3 exit gate:** model-by-model evidence cards state tested domain, versions, source hashes, errors/tolerances and unresolved regimes. Better internal fit is not enough. Only successful, applicable model outputs may be selected; research remains separate from ordinary Site/Climate and cannot auto-enter annual energy/finance.

**Flag/rollback:** persisted explicit model versions and opt-in selectors for replacements; incompatible/stale saved results invalidated, not reinterpreted. Retain qualified screening adapters where safe. Disable a new model on reference failure without falling back silently to another calculation.

### Phase 4 — Full-system verification, traceability and release disposition

**Objective:** verify the exact final revision and issue a truthful release decision. **Indicative effort:** 5–8 engineering days plus external-runtime/data availability. Depends on accepted Phase1–3 scope; blocked models must have explicit non-adoption/disabled behavior.

| Package | Work | Required exit evidence |
|---|---|---|
| U18b Live evidence ledger | Finish current-implementation standards map; link all56 supplied findings to actual patches/tests/decisions. Include inherited CAD56 record debt separately from new expression changes. | Every record has source edition/locator, equation/domain, input provenance, test/fixture IDs, evidence class, implemented status and applicability limit. No green branch diff treated as inherited-model validation. |
| Cross-path integration | Verify climate/catalog/project→design→losses→eligible energy→finance→UI/report/export and API/Python parity in three system modes. | Exact same project/input/model identity; AC/DC/units/azimuth and thermal/PR conventions retained. Invalid/missing/stale/zero paths and older project imports covered. Actual DOCX/XLSX/JSON/PDF read-back, not token presence. |
| Independent-reference closure | Execute existing and new numerical references with exact AST reach/sensitivity rules. Address nested-owner/serialization evidence representability explicitly if current gate cannot express required evidence; any gate redesign is separate, tested policy work—not an exemption to obtain green. | No manufactured expected outputs, mass fixture-copying or waived56 debt. Whole-model reference runs stored with executable generator, input files/version/hash/domain and tolerance rationale. If unavailable: reference closure and release stay BLOCKED. |
| Platform/install/offline | Run locked clean installs, Node supported matrix, Windows install.bat/start.bat, production Docker without source mounts, production browser/worker/cancellation and post-install offline operation. Optional Python engines tested in pinned isolated runtime. | Exact SHA job links and logs, final-image boot+health, real downloads and failure recovery. Safari/iOS/native claims only if actually exercised; report unavailable platforms. Preserve auth/server resource limits and relative browser service URLs. |
| Three final reviews + targeted investigation | Review1: equations/units/domain, then independently check disputed equations and boundary cases. Review2: architecture/consumer/persistence/security, then trace actual exports/adoption/stale mutation. Review3: runtime/evidence/claims, then inspect artifact bytes, exact-SHA jobs and negative/mutation failures. | Findings register records each pass, follow-up sources/commands, corrective changes and reruns. No structural test described as semantic completeness. |
| Final operational release gate | Run actual package-script inventory: lint/build/test/test:audit/smoke/coverage; accepted audit/remaining/recovery/browser/UI/export and affected research/operational/UQ/CAD/reference suites. | Exact commands/exits, coverage scope, warnings, exclusions and remote matrix. Documentation/help/changelog/model ADRs updated; rollout/rollback tested. Separate implementation/verification/release decision; never merge/release red required gates. |

**Phase4 exit:** release only the explicitly scoped validated software capabilities when every required gate for that scope passes. Engineering conformity, field accuracy and bankability remain unavailable without their separate evidence. If the56 inherited reference gap persists, report “runtime/software checks pass; reference acceptance blocked”—not complete validation.

## 9. Sources and source-quality notes

Sources support only the specific claims stated; they do not grant blanket standard conformance. Search snippets were used for discovery, not treated as licensed standard text. Public wind secondary sources disagree in places and are insufficient to approve the full structural implementation.

- **S1:** Public worked ASCE7-22 envelope guidance, feet expression and Kd discussion: [1](https://www.cedengineering.com/userfiles/S02-048%20-%20Calculating%20Wind%20Loads%20on%20Buildings%20Using%20the%20Envelope%20Procedure%20of%20ASCE%207-22%20Code%20-%20US.pdf). Secondary explanation; applicable standard still required.
- **S2:** Public ASCE7-22 calculator explanation, Kd applied in design pressure and0.85 building example: [2](https://calcs.com/calculators/loadsWindCnCASCE7-22). Secondary corroboration, not licensed clause verification.
- **S3:** Manufacturer counterexample to universal Isc-factor removal: [1](https://enphase.com/en-au/download/iq8ac-and-iq8hc-microinverters-data-sheet), input table footnote (25A terminal /20A module with1.25). Fetched table verified; irrelevant garbled image-extraction text was not used.
- **S4:** Versioned pvlib0.13.1 airmass model definitions: https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.atmosphere.get_relative_airmass.html . Distinguishes Kasten1966 and Kasten–Young1989, apparent vs true zenith.
- **S5:** Versioned De Soto parameter-translation contract: https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.pvsystem.calcparams_desoto.html . Defines a_ref=nNsVth and dEgdT in1/K; fitting/manufacturer temperature-coefficient agreement is a separate task.
- **S6:** Engineering software method documentation emphasizes pile stiffness regime/head restraint: [2](https://www.finesoftware.eu/help/geo5/en/pile-horizontal-bearing-capacity-brom-s-method-01/). Does not resolve the audits' competing sand denominators; not used as a numerical fixture.
- **S7:** External bifacial-model scope/outputs: [3](https://pvlib-python.readthedocs.io/en/v0.11.1/_modules/pvlib/bifacial/infinite_sheds.html). Background for experimental design only; future fixtures must pin their actual chosen version, not silently use this older page or stable/main.

## 10. Deliverables and immediate next action

Files alongside this report:
- `probes.ts`: reproducible, offline-after-install diagnostic calls to production functions.
- `probe-results.json`: observed inputs/outputs, including re-executed stored SPA comparison.
- `review-receipt.json`: baseline, file hashes, executed-command outcomes and coverage limits.

**Start with Phase1, not with global formula replacement.** The most dangerous response to these reports would be to change Ke, Kd, inverter Isc and Broms simultaneously based on conflicting unsourced prescriptions, then regenerate goldens. Establish the governing contracts, fix independently demonstrable boundary errors with regressions, and only then adopt evidence-supported numerical changes.
