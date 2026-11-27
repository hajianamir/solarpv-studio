# Phase 1 contract / migration guide

2026-11-03. Applies to the current implementation; not an engineering certification. Read ADR-011 and the current status/matrix before adopting model results.

## POA API v1

`POST /api/v1/solar/poa` retains the south-zero default for generic `azimuthDeg` / `surfaceAzimuthDeg` (0 south, −90 east, +90 west, ±180 north). Library `calculatePoaIrradiance` remains north-clockwise (0 north, 90 east, 180 south, 270 west). No persisted angle changes or automatic 180° migration.

New callers should send `surfaceAzimuthNorthDeg`, or `surfaceAzimuthConvention: "north_clockwise"` with a generic surface angle. Explicit `surfaceAzimuthSouthDeg` remains accepted. All supplied surface aliases must agree after conversion/normalization; contradictory generic and explicit aliases now fail HTTP 400 rather than being silently ignored. Unknown convention, null/blank/non-finite supplied angles fail. `sunAzimuthDeg` / `solarAzimuthDeg` are always north-clockwise; contradictory solar aliases also fail. Multiple aliases differing by a full turn agree. Circular agreement tolerance 1e−8 degrees is an input-normalization tolerance, not a solar-position accuracy claim.

Response retains `poaIrradiance` and adds `azimuth` (`contract: poa-azimuth-v1`, normalized surface/sun angles and `legacyDefaultUsed`) plus nullable `deprecation`. An implicit generic legacy request gets a migration message, not changed irradiance. Existing north-only callers retain their values. Conflict rejection is an intentional safety compatibility change: remove redundant conflicting aliases, do not retry under a guessed convention. Persisted project state is not transformed.

Caller inventory: App energy uses direct TS waterfall/solar contracts, not this HTTP route. Real request consumers checked in this repository are API audit/remediation scripts (`scripts/test-remaining-poa-http.ts`, `verify-api-sizing-thermal-audit.ts`, `test-accepted-vmp-audit.ts`, remediation scripts). External clients are unknown. Historical scripts making angle-dependent-default assumptions are not authoritative migration specifications. Test all four compass directions in both direct adapter and actual HTTP.

## Electrical evidence

`src/contracts/electricalReadiness.ts` owns metadata schema and assessment, not physical equations. Optional `mpptRatingEvidence` travels with `InverterSpecs`, catalog inverter and project snapshot. It records basis, scope, source, source date (null when unknown), conditions, required multiplier and the actual operating/short-circuit rating values in A. Unknown source dates do not become review dates. Wrong/missing/contradictory metadata remains unassessed. Supplied rating values must match the evidence snapshot.

- `factored_array_isc`, per-MPPT scope, declared 1.25 and matching source snapshot can complete **evidence for the retained screen** only when measured Vmp coefficient and actual per-channel allocation are also supplied. It does not override an overload or a voltage failure, authenticate a datasheet, or assert conformity.
- `permissible_module_isc_stc`, `terminal_short_circuit_capability`, unknown basis, per-input or whole-inverter scope are retained but unassessed for this legacy comparison. No automatic division/multiplication or per-input aggregation is guessed.
- Legacy/generic 65/90 A or UI/default ratings without source evidence remain unassessed even when their arithmetic inequalities pass. Missing measured coefficients are not invented. Assumed balanced or invalid explicit allocation cannot establish installed wiring readiness. Both consumers must pass allocator validity; missing validity fails closed. Non-null source dates must be real calendar dates (for example 2026-02-30 rejects); null dates remain unknown, not guessed.
- `isCompliant`, `isDesignFeasible`, `isMpptCurrentAssessed` are deprecated/qualified **numerical-screen aliases**, not evidence-readiness approvals. Consumers must show `electricalReadiness` and its reasons. Current UI and printable/DOCX/XLSX reports do so. `conformity` stays null. No conductor/OCPD multiplier changes are made.
- Catalog projection retains supplied ratings/evidence; malformed optional records reject rather than silently default. Old projects lacking evidence still load and calculate qualified screening diagnostics. Import/export round-trips optional evidence; absent evidence remains absent.

The simple HTTP string-sizing API has no MPPT-current assessment; do not infer per-channel evidence or a current rating from its voltage-only response. Quick-sizing catalog adapters likewise cannot manufacture MPPT readiness when their target type does not carry those fields. Full basis-dependent numerical policies remain Phase 2 with manufacturer-specific evidence.

## Capacity, annual energy and PR

Actual module nameplate DC, installed inverter AC and requested AC target are distinct. SLD actual DC and Iranian CAPEX use module DC. Exported SVG and browser print/PDF retain capacity and screening qualifications. No SLD-specific PDF generator existed: earlier initial-slice prose describing one was incorrect; artifact acceptance now exercises actual browser print and SVG readback.

The scalar Iranian framework uses screening annual Financial energy only; adopted operational energy disables it because it lacks the import-cost/dispatch ledger. It never substitutes gross PV or a representative day. Existing coverage/context/configuration/staleness gates still govern adoption. Zero irradiation remains zero rather than a fallback annual number; invalid projects remain governed by existing project/engine validation.

Waterfall PR = net AC energy / effective-POA DC reference energy, at STC reference power, after empirical transposition but before loss/gain stages. It is not measured IEC PR. Rear contribution enters the numerator; this is a **front/reference-denominator** screening PR, not rear-irradiance-normalized bifacial PR. Compound multiplier = product of stage (1 + signed percentage/100); rounding can make displayed PR differ slightly. Derating multiplier includes selected thermal/efficiency/loss assumptions and is not interchangeable with the waterfall PR.

No universal ≤100% PR requirement is introduced. Zero is preserved; positive tolerance, rear input and cold gain must not be prohibited by a generic PR definition. The existing branded `annualYieldEngine.asPerformanceRatioPct` is a legacy bounded API and is NOT the HUD/waterfall owner. Its bound and waterfall's negative-annual-thermal clamp remain recorded numerical debt for Phase 2; they are not evidence that cold gain is universally invalid. Tests characterize the retained clamp without claiming it is corrected. Denominator=0 returns a screening zero; it is not a measured PR observation.

## Economic and sensitivity assumptions

`src/presentation/phase1Evidence.ts` registers status, owner, currency/valuation basis, review date and nullable source/effective date for default financial and Iranian scenarios. Defaults are illustrative; no current official tariff or live FX is claimed. Rates/rounding/solvers are unchanged. User overrides and saved projects remain recoverable; model evidence is not authenticated by entering a value.

Bifacial proxy/2D sensitivity has `unsupported_sensitivity`, no independently validated domain and `bankabilityEligible: false`. UI, finance and report artifacts retain this qualification; no GCR formula replacement or new bankable adoption path is introduced. The retired target WARN remains. Chronological Research adoption still requires its own gates and does not validate these scalar sensitivities.

## Reproduction and rollback

Run `npm run build`, `npm run test:phase1`, `npm run test:phase1:browser`, `npm run verify:phase1-evidence`, claims/HTTP/operational/persistence/export/browser suites and required lint/core/smoke/coverage/reference gates. Inventory regenerates with `npx tsx scripts/phase1-evidence-inventory.ts`; hashes detect stale sources/fixtures. Inventory and registry declarations are not proof of whole-model accuracy.

Rollback optional schema metadata with old projects still readable; preserve unknown fields in archived project copies. Never silently change angle convention or restore false conformity claims. If adapter regressions arise, disable affected summary/financial screens, not known-wrong AC/DC/annual substitutions. Legacy 1.25 math stays unchanged until a referenced numerical strategy replaces it. No safety-model claim is unblocked by a passing internal contract test.


Follow-up: ADR-012 documents the exit-review repairs and Phase 2 uplift-forwarding start. The structural recommendation wrapper now consumes the shared net reaction rather than its own 1.15 pressure multiplier; this is not a newly validated structural equation. Old exported recommendation reactions should be regenerated and re-reviewed.
