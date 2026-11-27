# ADR-014 — Candidate voltage-drop ownership, unsupported pile containment and ledger precision

Date: 2026-11-03. Status: accepted for scoped repairs; **not Phase 2 exit approval**.

## Acceptance and decisions

### P2-C2 — Cable selection and reported drop share an evaluator

`candidateVoltageDropVolts` owns the elementary steady-state DC/AC drop calculation. Candidate selection invokes it for each section/run combination; the reported drop invokes the same function with the selected dimensions. Preliminary algebra remains a legacy estimate, not the acceptance test. All voltage-drop, ampacity and short-circuit constraints must pass, and search exhaustion blocks acceptance. Unknown AC arrangement/source/equivalent reactance blocks `isAssessed` and `isCompliant` even if a legacy diagnostic drop is below its limit.

Supported calculation domain: balanced three-phase or single-phase lagging AC, or DC, equal-length/equal-sharing parallel conductors. `equivalentReactanceOhmPerM` is the total equivalent circuit's per-metre reactance **including coupling at the design frequency**, not the reactance of each conductor to be divided blindly by N. The source description must identify the applicable circuit/frequency. Presence of this text is not independent verification of a user's evidence. Missing source/arrangement is unknown, including in old saved projects. UI and project schema preserve the optional inputs; no arrangement is silently migrated into old data. Invalid scalar/PF/reactance inputs reject; UI catches RangeError and renders unassessed rather than crashing. Ambient at/above conductor temperature limit has no assessed ampacity.

The actual source is Schneider Electric, *Electrical Installation Guide 2010*, chapter G §3.2, fig G27, fetched from https://www.electrical-installation.org/enw/images/0/0a/G-Sizing-and-protection-of-conductors.pdf . Its G27 impedance-summary footnote says resistance divides by parallel conductor count while reactance remains practically unchanged in that arrangement. This is **not** a universal law for every cable geometry. It is why the implementation requires equivalent-circuit X rather than inventing X/N.

Units: length m, current A, area mm², conductivity m/(Ω·mm²), reactance Ω/m, drop V. AC formula: k L I (R cosφ + X sinφ), k=2 or √3; R=1/(conductivity·area·runs). DC takes k=2, PF=1, X=0. Independent 50-digit Decimal generator supplies 144 component conditions; direct-export reference records execute and mutation-probe every new formula expression. Absolute 1e-10 V plus relative 1e-12 covers floating-point agreement only, not cable-impedance uncertainty. Candidate regression matrix has 81 phase/PF/length/current cases plus X-only exhaustion, missing evidence and schema round-trip. Existing insulation/ampacity/grouping/protection screens are not independently validated by this component oracle.

### P2-B2 — Unsupported Broms regimes cannot produce safe decisions

Research in the University of Newcastle OER §6.25 confirms `e+L` for the specified short free-head drained-soil capacity equation. It also requires separate maximum-moment equilibrium, groundwater treatment and short/long regime checks against section yield. Current inputs cannot establish those domains. Retain equations and numeric outputs as explicitly named legacy diagnostics, but emit `assessmentStatus=unassessed`, retain the prior predicate under `legacyScreenPassed`, and make deprecated `isFosSafe` false.

The structural rammed-pile/ground-screw/grouted-pile consumers cannot approve a design from this screen. Recommendation and wind-sensitivity displays cannot say SAFE/ADEQUATE merely because a legacy FoS threshold passed. Search exhaustion remains blocking. Tests exercise 144 soil/load/lever-arm/target cases, including 85 prior green-screen witnesses, the actual structural consumer, wrapper equality and generated Markdown. This is containment verification, not independent Broms numerical validation. Do not restore safety just because a soil class or pullout number is present.

### P2-F2 — Do not quantize the Iranian ledger before NPV/IRR

The Iranian model retains **million Toman** as its documented base unit, with full double precision rather than whole-million rounding. Capital, loan, annual revenue/OPEX/debt, generation, cumulative cash, DSCR and NPV no longer round before downstream calculations. Project and equity cash-flow series remain separate. Display metrics that are not inputs to the ledger retain legacy formatting; the UI formats ledger values without feeding them back.

An independent 50-digit Decimal oracle covers 18 ledgers at 0.5/1/5/10/50/1000 kWp, zero debt, zero interest and ordinary interest-bearing annuities. It independently bisects IRR and applies explicitly documented local assumptions; it does **not** assert that Iranian tariffs, escalation, cost benchmarks, taxes, discount rates or the entire financial model are validated. NPV accounting reference: https://samrepo.nlr.gov/help/mtf_npv.html , with background Short et al. 1995 NREL/TP-462-5173. Fixture tolerance 1e-7 million Toman plus relative 1e-11 allows double-precision compound arithmetic, not economic forecasting error. Direct-export fixtures and mutation probes cover each changed expression. Explicit financial-assumptions UI/schema/migration, broader main-ledger precision and invalid-result adapters remain open under U16b.

## Compatibility / rollback

New feeder inputs are optional and survive project parsing. Old AC inputs remain readable but unassessed; DC calculation remains available under its existing qualified assumptions. Safe rollback withholds new AC acceptance; never roll back to silent default impedance approval. Existing cable result shape/aliases remain available.

Broms' deprecated boolean now deliberately fails closed. Consumers needing historical comparison use `legacyScreenPassed`, never as a construction approval. Rollback disables pile design decisions, not the new unassessed boundary.

Iranian cash-flow numeric values now include fractions of a million Toman. Recompute derived tables/NPV/IRR; do not compare an old rounded report snapshot as if it were this calculation. No automatic migration of historical snapshots or externally supplied economic evidence is claimed. Safe rollback may display retained historical reports as historical but must not reintroduce rounded values into new NPV/IRR calculations.

## Three review passes and follow-up

1. **Contract/ownership:** traced actual selection/report evaluators, input editor, schema, wrapper and structural consumer. Research follow-up fetched Schneider G21 voltage equations and G27 parallel-impedance guidance in full. New AC evidence fields are optional, never seeded into old projects. Caught a test's incorrect result-field name and corrected it to the existing public `isVoltageDropCompliant` field.
2. **Numerical/safety:** challenged X/N and L−e; follow-up sources reject blanket replacements. Independent Decimal oracles use no production outputs. First cable sensitivity witness used PF=0, hiding R changes; replaced the witness with a mixed R/X, PF=.7, three-run case, then all expression mutations were detected. Inspected residual sensitivity SAFE/ADEQUATE labels and disabled those unsupported decisions too.
3. **Runtime/artifacts:** verified null/unknown transport, bounded candidate failure, invalid-temperature UI behavior, legacy booleans, reported diagnostics and raw ledger/display separation. Decimal versus binary floating-point comparison initially used exact equality in one ledger assertion; replaced that assertion with the already declared financial-oracle tolerance. Existing tests were updated to supply explicitly synthetic impedance evidence for tests of assessed AC screens; tests of unknown evidence still assert failure. Verification receipt records exact executions and limitations.

## Completion boundary

These repairs do not finish U01b, complete U02, U09b, U07a or all of U16b. U10 is an explicit equivalent-circuit screen, not an independently verified ampacity/impedance design system. U13 is unavailable/contained rather than physically reimplemented. No historical reference gate was changed or waived. Full Phase 2 and release approval remain blocked.
