# ADR-011 — Phase 1 contracts and evidence containment

Date: 2026-11-03. Status: accepted Phase 1 contracts/containment; numerical replacements blocked as specified below. Scope: dual-independent-audit Phase 1, not release certification.

## Decisions and owners

1. `src/presentation/designSummary.ts` adapts App-owned, already-eligible values. Actual DC = `arrayDesign.totalPvCapacityKwp`; installed AC = `inverterClustering.totalInverterCapacityKw`; requested AC = `targetPowerplantCapacityKw`. None is a synonym. SLD UI, exported SVG and actual browser print/PDF consume actual DC. No sizing algorithm changes. Optional backward-readable electrical evidence metadata is added to the project schema.
2. `activeOperationalEnergy` remains the sole operational eligibility gate (coverage, context, configuration). `annualYieldKwh` remains the Financial boundary. Without an eligible receipt, Iranian screening consumes waterfall annual net AC, not representative-day generation times 365. With a receipt, the scalar Iranian framework is unavailable: it cannot value imports/dispatch. Do not substitute gross PV, exported energy, or a screening year. Financial/Operational retain their existing mode-specific treatment. No Research adoption bypass.
3. HUD PR now uses waterfall `performanceRatioPct`, matching the waterfall screen. Its denominator is the engine's effective-POA reference energy (`rawGhiEnergyKwh * (1 + transpositionGainPct/100)`), before loss/gain stages; numerator is net AC after stages. This remains a screening proxy, not measured IEC PR. Effective derating is a separate compound multiplier, not that PR. Preserve true zero and do not impose a universal 100% ceiling on cold/bifacial gain. No loss-stage arithmetic changed.
4. References do not establish conformity. Remove surviving electrical, Broms and structural-recommendation conformity wording and the unsourced PR benchmark; retain legacy `isCompliant` feasibility alias for compatibility, without promoting it to a standards result. Rating-basis metadata and readiness now explicitly qualify legacy numerical aliases; `conformity` remains null.
5. Financial defaults remain illustrative, not current official tariffs. Surface unverified source/effective-date status and hardcoded tariff floors/CAPEX/OPEX/degradation/escalation/discount assumptions; no claim that the review date is a tariff effective date. No financial-rate recalibration.

## Wind decision record (U01a)

Current owner: `src/engine/core/structuralContract.ts`; consumers include `structuralEngine`, `structureRecommendationEngine` and `geotech/foundationRecommendation`. Legacy chain is `0.613 Kz Kzt Kd Ke V²` Pa with V in m/s converted from km/h; outputs also include kN/m². Default category C, Kzt 1 and Kd .85. Kz category/height branches and omitted-height C baseline differ; no independently verified ASCE table implementation is claimed.

Audit diagnosis: elevation exponential mixes metric input with a feet-based coefficient. This is not permission to apply an isolated replacement: adopting an ASCE 7-22 edition chain must account for relocation of Kd from velocity pressure to design pressure, terrain/height and structure applicability. A universal Kd=1 change could remove directionality from the complete chain. Do not present legacy qz as verified 7-22 Eq. 26.10-1.

Evidence: assessment report records public secondary ASCE examples and conflicting unit descriptions; no licensed clause/table/applicability verification was obtained. **BLOCKED**: authoritative edition-specific units, height minima, risk/category/wind-speed basis, aerodynamic coefficients, full downstream pressure chain, independent fixtures for all consumers. Stop the affected design/conformity claim, not independent boundary corrections. No wind coefficient or pressure arithmetic was changed in this slice. Required future decision: edition-tagged strategy with explicit units, complete pressure-chain tests, defaults/migration and independent references before activation.

## Other stopped replacements

- Isc: retain 1.25 pending per-channel manufacturer rating/source/conditions. Enphase IQ8AC/IQ8HC published data distinguish input current, short-circuit input, and module Isc with a 1.25 qualification. This disproves universal factor removal, not applicability to every catalog entry. Missing ratings/coefficients stay unknown. U09a schema/readiness is implemented; applying basis-specific numerical factors remains Phase 2.
- Broms/LPS/parallel-cable/uplift: do not replace formulas from conflicting audit proposals without source/applicability fixtures. Claims removed here do not validate the remaining arithmetic.
- Bifacial proxy: inverse-GCR replacement is not independently established; registered unverified-target warning remains. Sensitivity is explicitly unsupported/unvalidated and ineligible for new bankability claims; no new physical model is claimed.
- API azimuth: explicit conventions, normalized agreement checks and conflicting-alias rejection are implemented with v1 legacy deprecation metadata; no silent convention flip.

## Acceptance and verification

P1-B01: different DC/installed/requested AC survive adaptation; SLD and Iranian show same actual DC in powerplant/on-grid/off-grid. P1-B02: Iranian annual energy equals eligible screening Financial boundary; adopted ledger is unavailable rather than revalued. P1-B03: HUD and waterfall PR match, zero survives, >100 is not universally clamped. P1-C01: removed conformity/official-default/benchmark strings cannot return undetected.

Run `npm run test:phase1`, `npm run test:phase1:browser` after build, `npm run verify:engine-claims`, operational-energy regressions, lint/build/core/smoke/coverage and reference gates. Unit arithmetic fixtures are synthetic internal-contract evidence, not independent physics/finance validation. Production browser checks three modes with external providers blocked; does not establish real irradiance/provider/field accuracy. See the live status file for executed outcomes and gaps. Focused production-browser acceptance now includes actual SLD SVG/print-PDF readback, DOCX/XLSX qualifications, optional evidence project round-trip, and adopted-ledger blocking in the operational suite. Earlier slice prose incorrectly presumed a dedicated SLD PDF generator; the actual print path is tested.

## Compatibility, rollback and stops

No persisted field is removed or reinterpreted. Existing projects recompute summaries: plant SLD kWp and Iranian CAPEX/annual results can materially change because the old sources were wrong. Users must re-review prior exports and financial decisions. The Iranian screen deliberately becomes unavailable for adopted operational energy; do not silently restore the incorrect ledger valuation as a fallback.

Rollback is a targeted reverse patch of this slice and its UI adapter, not a data migration; preserve assessment artifacts and unrelated edits. If a boundary regression appears, disable the affected summary rather than revive false capacity/energy labeling. Restoring old formulas/claims requires a separate evidence decision. No runtime feature flag: keeping a selectable known-wrong financial basis would be unsafe. Phase 1 completion is a contracts/containment disposition only; blocked physical validation is not release approval. See the final status for gate outcomes.


## Final boundary layering and numerical parity

Rating/source metadata schema, validation and readiness classification live in `src/contracts`, not physical engines. The reference gate initially flagged diagnostic concatenation/comparisons as seven new expressions; it was not modified or waived. Engine consumers now only attach the metadata assessment/reasons. `test:phase1` asserts identical extracted equation IDs before/after in PV, MPPT, catalog and project-schema consumers, including removals, so no physical expression was moved to evade evidence requirements. The contracts have dedicated unit/coverage/persistence regressions. Legacy numerical flags remain qualified aliases; readiness is not inferred from them.

Optional rating metadata: basis/scope/source/date/conditions/multiplier plus matching A-valued source snapshot. Unknown source date is null and unassessed. Finite positive current ratings alone, including generic 65/90 A records, cannot complete evidence readiness. Per-input, whole-inverter and terminal-capability bases remain unassessed until a supported numerical strategy exists. A supplied document link is not authentication or conformity evidence.

## Wind candidates and blocked source locator

These are diagnostic candidates, not independently approved design references:

| Elevation m | Current `exp(-.0000362*z)` | A metric candidate `exp(-.000119*z)` | B candidate `exp(-z/8000)` |
|---|---|---|---|
| 0 | 1.000000 | 1.000000 | 1.000000 |
| 500 | 0.982063 | 0.942236 | 0.939413 |
| 1000 | 0.964447 | 0.887808 | 0.882497 |
| 2000 | 0.930159 | 0.788203 | 0.778801 |

Locators: assessment §3.1 and sources S1/S2, including the CED ASCE 7-22 envelope-procedure course (`https://www.cedengineering.com/userfiles/S02-048%20-%20Calculating%20Wind%20Loads%20on%20Buildings%20Using%20the%20Envelope%20Procedure%20of%20ASCE%207-22%20Code%20-%20US.pdf`) and public worked guidance. These are secondary, not sufficient licensed normative applicability evidence. Exact source editions, low-height B/C/D minimums, structural category, basic wind speed risk basis and a complete q→pressure→post→foundation/report chain remain BLOCKED. Negative elevation currently clamps Ke to one; that is legacy behavior, not adopted standard interpretation. A universal Kd=1 is not accepted. Structural/foundation UI and reports explicitly retain UNASSESSED applicability; no coefficient replacement occurred.
