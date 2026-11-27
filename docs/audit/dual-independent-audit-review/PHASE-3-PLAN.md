# Phase 3 — model quality and architectural drift

Started: 2026-11-03. Branch base: a5b2c5f8eac89b3be3a9148f786653e0ee11815a. Overall Phase2 remains incomplete and release blocked. This starts independent Phase3 experiments allowed by the four-phase plan; it does not waive Phase2 exit requirements or authorize adoption of replacement models.

## First slice: U05 single-diode evidence and truthful UI

Before changing production equations, separate explicit externally fitted reference-parameter translation/solving from the existing STC-summary extraction heuristic. Authoritative existing engine: `calculateSingleDiodeCurve`; consumers: I–V page, shared electrical calibration adapter, internal cross-validation and audit scripts. The page uses a fixed synthetic module, not the selected catalog snapshot. Its shading checkbox only distorts plotted points and does not simulate electrical bypass circuits.

### Acceptance

- P3-D1: Independently execute pinned pvlib0.13.1 `calcparams_desoto`, `singlediode` and `i_from_v` offline after locked environment installation. Commit generator, source/version/hash/input/units, fixture and evidence card. Use externally supplied reference parameters from pinned upstream fixtures, not fit coefficients invented to match output. Include STC, low/high irradiance, cold/hot, single/string cases and zero irradiance separately.
- P3-D2: Compare translated parameters and rounded curve samples against external references with declared error budgets. Compare true versus80-step sampled MPP separately; do not adjust tolerance to hide sampling or Isc defects. Record metric maxima and unresolved regimes. Use a replay test that needs no Python/network after fixture generation. Preserve all current production numerical behavior in this first slice.
- P3-D3: Reproduce unused gamma coefficient, beta-as-initial-seed limitation, aggregate `vt` semantics, approximate Isc and sampled MPP as applicable. Do not claim the summary-input heuristic satisfies all datasheet coefficients. Clarify comments and UI/help, including the cosmetic shading toggle, with bilingual static and actual production-browser assertions.
- P3-D4: Three self-review/followup research rounds, ADR/model evidence card, guide/changelog, verification receipt. Run lint/build/core/smoke/coverage, focused experiment/replay, Phase1/Phase2, accepted audit, physics/evidence/help/claims, export and production-browser checks. Relevant failures remain explicit; no public model selection/adoption or new financial input path.

### Numerical contract before execution

Use pvlib0.13.1 upstream `cec_module_cs5p_220m` and `cec_module_params` test fixtures (reference parameter vectors, not verified live manufacturer catalog data). Inputs W/m² and °C; A/V/ohm/W parameters and outputs. Map alpha_sc A/°C to existing percent-of-STC-Isc input explicitly. Legacy custom Rs/Rsh are whole-string STC quantities; photocurrent/saturation current do not multiply in series. Match the legacy ideality/thermal product to the externally specified a_ref without fitting output. Reference solver outputs remain independent of TypeScript.

Parameter translation comparison: absolute1e−12 plus relative1e−6, allowing the engine's rounded electron-charge constant versus SciPy CODATA Boltzmann eV/K. Voc and current at identical exact voltages: rounding budget0.005V/0.005A plus1e−6relative and numerical1e−6absolute. Returned curve voltage rounding can amplify current error near the knee; references must evaluate the actual unrounded reference voltage grid, not infer solver accuracy from rounded coordinates. True MPP discrepancy is reported, not forced into endpoint quantization tolerance. Derived Isc approximation is reported separately, not relabeled exact.

### Rollback/stops

No production numerical replacement in this slice. Rollback removes the standalone experiment/qualification copy while retaining prior safety containment; no persisted schema migration or energy recalculation. A numerical replacement requires explicit reference-parameter schema/version, convergence/error result, independent exact-expression fixtures and all affected consumers. Missing model/reference evidence blocks adoption, not unrelated research. Keep scientific Python execution local/server-side, never ship it into browser JavaScript.

## Remaining Phase3 queue

Follow the authoritative plan packages U07b annual/time-series/tracker/clipping; U08 thermal/IAM; U17 bifacial; U11b protection/harmonics/site; U15 BIPV/T; U19 pump; U09c sourced catalog; U16c financial kernels; U20 convergence/UQ. Each needs its own bounded evidence/adoption decision. No package is declared complete by starting this plan or passing structural checks.

## First-slice execution outcome

P3-D1–D4 implemented/verified for the bounded evidence and qualification scope, not a numerical replacement or complete U05 validation.48pinned-pvlib cases/3,888points pass the predeclared parameter/grid/rounding contract; exact Isc/optimized MPP discrepancies are reported separately. Gamma/seed/zero and severe unconverged-root witnesses are retained. Bilingual static and actual production-browser cosmetic-toggle/KPI assertions pass. Offline generator regeneration with network operations denied is byte-for-byte identical. All18selected application/regression commands pass; lint retains93existingwarnings and retired bifacial reference remains WARN. ADR-024 records three substantive self-review/followup rounds and failed attempts. See the comparison artifact/evidence card/verification receipt. Production numerical formulas are unchanged; solver reliability, adoption and release remain blocked pending the documented next numerical repair.

## Bounded-kernel continuation

The separately planned B1–B5 slice now implements explicit reference inputs and a bounded residual-checked numerical API (ADR-025), with72external full cases/862component-policy vectors/51invalid contracts/66executed sensitive expressions. Legacy numerical behavior remains unchanged; new model is not selected by production consumers. This advances the first slice's kernel priority without claiming complete fitting or consumer/adoption integration. See the bounded plan, evidence card, comparison and receipt for current results/limitations. Overall Phase2/3/release gates remain blocked.
