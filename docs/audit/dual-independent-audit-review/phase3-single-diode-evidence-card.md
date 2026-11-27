# U05 model evidence card — first Phase3 experiment

## Identity and acceptance state

- Production owner: `src/engine/singleDiodeModel.ts:calculateSingleDiodeCurve`, unchanged numerical implementation; registry version2.5.0 retained.
- Independent reference: pvlib0.13.1 / NumPy2.2.6 / SciPy1.15.3, Python3.11.2 observed. Installed/reference file hashes in fixture and ADR-024.
- Evidence class: independent-component translation/solver comparison plus internal defect/compatibility witnesses and actual UI integration. Not field comparison or conformity.
- Scope result: explicit-reference specialization verified within quantization/constant-conversion budgets; **overall U05 PARTIAL, solver-reliability/adoption/release BLOCKED**.

## Input provenance/domain

Two literal parameter records from pinned upstream `tests/conftest.py`: `cec_module_params` (Example Module) and `cec_module_cs5p_220m`. These are test-source vectors, not current manufacturer catalog evidence. No fitted coefficient was invented and no production numerical output became an oracle target.

48cases: G50/200/1000/1400W/m², cell temperature−20/25/85°C,1/12modules in series. Units: V/A/ohm/W, a_ref/nNsVth in V; irradiance is effective irradiance and includes no separately modeled spectral modifier. Reference alpha is A/K; application percent input is converted using stated STC Isc. R_s and R_sh supplied to the legacy API are string totals; I_L/I_o are series-invariant. No parallel strings, nonuniform illumination or CEC Adjust is modeled.

## Method and acceptance

The independent Python generator translates externally specified reference parameters with `calcparams_desoto`, solves the implicit curve using `singlediode`/`i_from_v` with Brent root solving and returns exact optimized MPP plus an independent81point grid. Socket operations are rejected by an audit hook; no Python service/browser adoption integration is introduced.

The TypeScript replay compares all48translated parameter sets and3,888curve points, rounded Voc and grid-sampled MPP. Parameter tolerance:1e−12absolute+1e−6relative, accounting for constant precision and translation. Output budgets:.005001V/A or.050001W+1e−6relative, accounting for existing display quantization plus small numerical allowance. The replay compares current on the unrounded reference grid, not rounded reported voltage. True optimized MPP and implicit Isc use discrepancy reporting rather than relaxed acceptance thresholds. Fill factor/efficiency and heuristic-inferred area are **not independently validated whole-result metrics** in this card.

## Results and retained discrepancies

- Max parameter relative difference: I_o2.090890332295781e−8; other compared parameters are within floating-point roundoff.
- Max Voc difference.00494177190994094V and sampled Pmp difference.04925369077727737W, within declared quantization budgets.
- Independent grid-only Pmp loss max1.1651372312189778W; max relative0.047632159777237856% in another case.
- Reported legacy Pmp versus true optimized Pmp max1.143681669601392W; max relative1.923361377309934% in a low-power case where rounding is material.
- Scalar Isc approximation max difference.0248298709062027A; true versus sampled Vmp max4.16614025952083V on a12module low-irradiance string.
- Case IDs/full metrics are recorded in `phase3-single-diode-comparison.json`; maxima do not establish field accuracy.

## Unsupported and failed regimes

Summary-input extraction is not independently validated as a full fit. gamma_Pmp is unused; beta_Voc seeds Newton rather than constraining a fitted coefficient. A fixed1000W/m²/65°C summary-input witness with beta−.8returns188.23V versus45V with beta−.25despite identical translated parameters; root residual approximately−2.51e29A. This unresolved convergence defect is an explicit stop on reliability/adoption claims. Invalid temperatures/custom parameters, exhaustive fitting failures, cell-count inference, exact Isc/MPP, bypass circuits, measurement agreement and annual energy are not validated.

The UI's partial-shading checkbox is a cosmetic plot distortion with unchanged unshaded KPIs. Bilingual copy and actual production-browser assertions make that limitation visible. It is not an electrical mismatch/bypass model.

## Reproduction, versioning and rollback

- Locked optional scientific environment: `services/pvlib_study/requirements.txt`.
- Generator: `scripts/fixtures/generate-phase3-single-diode.py`; `--check` verifies byte-for-byte output rather than overwriting drift.
- Reference data: `benchmarks/independent/phase3-single-diode.json`.
- Offline replay: `npm run test:phase3`; explicit report regeneration only through `tsx scripts/test-phase3-single-diode.ts --write` after investigating discrepancies.
- Actual UI assertions: `npm run test:phase1:browser`; generic browser/UI suites also run.
- Governing plan/reviews/receipt: `PHASE-3-PLAN.md`, ADR-024 and `phase3-single-diode-verification-receipt.json`.

No production numerical policy or persisted schema changes. Rollback removes the experiment/disclosure changes, not prior safety containment. Any future solver/fit replacement requires a separately versioned contract, explicit opt-in/adoption decision, failed-root/error behavior, independent expression-level evidence and affected-consumer tests. This card is not permission to select the legacy solver as a validated design model.
