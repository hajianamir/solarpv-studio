# ADR-024 — Start Phase3 with an explicit single-diode reference boundary

Date: 2026-11-03. Status: first U05 evidence/qualification slice implemented; U05 model replacement and Phase3 completion **not** accepted. Phase2 unresolved gates remain in force and release remains BLOCKED.

## Decision

Before replacing equations, independently compare the existing single-diode engine against pinned pvlib0.13.1 using **externally supplied reference parameters**, not the application's summary-input extraction heuristic. Keep the numerical engine, exported/serialized interfaces, model version and all current energy/financial adoption rules unchanged. The engine comments now correctly call extraction heuristic, identify the unused gamma argument and explain aggregate `vt` semantics. The I–V page and help no longer claim a bypass-diode circuit simulation or imply full coefficient fitting.

The first slice is a reproducible, offline **independent component experiment** plus replay and truthful UI. It does not introduce an alternative production model, fitted-parameter selector or automatic scientific/financial adoption. Future fitting needs its own explicit/versioned input contract, residual/domain/convergence results and affected-consumer acceptance before selection.

## Ownership and consumers

`src/engine/singleDiodeModel.ts:calculateSingleDiodeCurve` remains authoritative for this legacy curve. Consumers include `IvCurveTracerTab`, `core/electricalSizingContract.ts:calibrateSingleDiodeMpp`, cross-validation and audit/remediation scripts. The UI uses fixed illustrative51.2V/14.37A/42.65V/13.6A/580W inputs, not the selected catalog module. The checkbox clamps plotted current/power; KPI calculations remain unshaded. It neither solves substring bypass circuits nor searches global MPPT. New bilingual copy states that behavior explicitly.

No numerical expression changes occur in this slice; a baseline-AST regression compares against branch base `a5b2c5f8eac89b3be3a9148f786653e0ee11815a`. The public `vt` field remains the aggregate `Ns*k*T/q` across the full string, excluding ideality n; `n*vt` corresponds to pvlib's `nNsVth`. Correcting its misleading per-cell comment does **not** rename/reinterpret stored numeric data or alter a schema.

## Reference experiment

`generate-phase3-single-diode.py` independently executes pinned `pvlib.pvsystem.calcparams_desoto`, `singlediode(method='brentq')` and `i_from_v(method='brentq')`. It contains no production imports, subprocess execution or production numerical targets. Reference vectors come from upstream test fixtures `cec_module_params` (Example Module) and `cec_module_cs5p_220m`. These are source-pinned upstream test records, not newly acquired/current/verified manufacturer catalog evidence.

48cases: two parameter vectors × irradiance50/200/1000/1400W/m² × cell temperature−20/25/85°C ×1/12series modules. Each has81reference curve points, true optimized MPP, grid-sampled MPP, implicit Isc/Voc and translated parameters. The test compares3,888points. Darkness separately verifies the inherited zero result; no finite-Rsh De Soto night translation is claimed. No annual weather, spectral correction, shading, bypass network, CEC Adjust or tax/financial context is involved.

Mapping is explicit: alpha_sc A/K → percent of reference Isc; a_ref → the legacy n using the declared thermal product, not fitting output. Legacy custom Rs/Rsh are **whole-string STC values**; photocurrent and saturation current are unchanged by pure series stacking. Reference software execution is local in an isolated Python environment installed from the existing locked `services/pvlib_study/requirements.txt`; the oracle itself rejects socket connection/DNS/send/bind operations. A separate TypeScript fixture replay works without Python/network. There is no new server endpoint or browser scientific runtime.

`benchmarks/independent/phase3-single-diode.json` stores reference inputs/outputs, units, versions and actual installed source hashes. `phase3-single-diode-comparison.json` stores replay metrics and unresolved regimes, with explicit `--write` regeneration only after investigation. Ordinary test replay rejects report drift. These are model evidence artifacts, not project output eligible for financial adoption.

## Acceptance and numerical meaning

`PHASE-3-PLAN.md` declares budgets before comparison: translated parameters absolute1e−12+relative1e−6; rounded voltage/current absolute.005001V/A+relative1e−6; rounded power absolute.050001W+relative1e−6. These represent output quantization and numerical/constant-conversion allowances, not physical accuracy. The engine's1.60217663e−19 electron charge differs from the exact CODATA charge used via SciPy eV/K; observed saturation-current relative difference is2.090890332295781e−8. No tolerance was increased to turn a solver failure into success.

Reference currents are compared at the reference's **unrounded** Voc/80 grid, avoiding artificial knee-error amplification from rounding reported voltage. Grid-sampled MPP is compared with grid-sampled reference; true optimized MPP and Isc are separately reported, not silently accepted under sample quantization.

Observed maxima within the48cases:

| Quantity | Maximum observed discrepancy | Interpretation |
|---|---:|---|
| Voc |0.00494177190994094V|Within declared output quantization budget|
| Grid-sampled Pmp |0.04925369077727737W|Within power-output quantization budget|
| True optimized Pmp vs reported legacy Pmp |1.143681669601392W; max relative1.923361377309934% in a different low-power case|Sampling **and** rounding; not fitting/accuracy acceptance|
| Reference grid-only Pmp loss |1.1651372312189778W; max relative0.047632159777237856% in another case|Sampling effect independently isolated before output rounding|
| True Vmp vs reported sampled Vmp |4.16614025952083V on a12-module low-G string|Grid-sampling discrepancy, not voltage-root error|
| Implicit Isc vs scalar legacy Isc |0.0248298709062027A|Legacy approximate scalar, not exact I(V=0)|

Maxima can occur in different cases; full IDs and raw values remain in the comparison artifact. Neither sampled MPP nor scalar Isc is promoted to an exact solver metric.

## Confirmed unresolved defects and stop conditions

1. `tempCoeffPmpPct` is accepted but unused. A-.3vs-.9%/°C witness returns identical full results. Do not claim gamma is fitted or honored.
2. `tempCoeffVocPct` affects the initial Newton guess, not a fitted temperature relation. Moderate seed changes give identical results at the tested witness. A stronger negative seed exposes a **confirmed convergence defect**: with fixed summary inputs at1000W/m²/65°C, beta−.25returns45.00V while beta−.8returns188.23V with identical translated parameters. The implicit current residual at188.23V is approximately−2.511354112684054e29A. This is an internal equation-residual defect witness, not independent parameter-fit validation. No convergence/error state is emitted by the legacy API.
3. Scalar Isc is an irradiance/temperature estimate rather than the implicit short-circuit root; MPP uses80interval sampling.
4. Validity of summary-input fitting, inferred cell counts/area, invalid temperature/custom-parameter domains and arbitrary Newton convergence is unestablished. External-reference specialization success does not certify those paths.

**Stop:** no claim of complete U05 validation, measured datasheet fitting, arbitrary-coefficient solver reliability or engineering/adoption readiness. The next numerical repair must introduce bounded/root-residual convergence semantics and explicit reference-parameter ownership, preserve a declared compatibility adapter, and obtain executed expression-level/consumer evidence. Do not replace or silently trust failed roots based on this experiment. The fixed-input demo remains qualified, and no new auto-adoption path is enabled.

## Three self-review/followup rounds

1. **Contract review:** traced engine, calibration wrapper, registry, I–V control/plot/KPI ownership and source-pinned parameter units. Found `vt` misleading and the bypass claim incompatible with plot-only clipping. Followup inspected pinned `pvsystem.py:calcparams_desoto` and `ivtools/sdm/desoto.py:fit_desoto`: reference-parameter translation is distinct from solving a multi-equation fit, with alpha/beta in A/K and V/K. Do not infer manufacturer gamma or advertise a complete fit from an STC summary.
2. **Correctness review:** ran48external cases and compared translated parameters/curve samples separately from exact Isc/MPP. The initial moderate/strong-beta invariance assumption failed: it revealed the unconverged-root witness. Followup inspected the upstream five fitting equations (short circuit, open circuit, MPP condition and temperature constraint) and bounded Brent root/convergence handling in `pvlib/singlediode.py`. Corrected the **test assumption**, retained the severe failed-root witness and did not weaken any tolerance or alter production numerics. Fitting failures and convergence checks need their own accepted replacement slice.
3. **Delivery review:** examined actual bilingual/static and production-browser copy, toggle behavior and stable unshaded KPIs, fixture/replay drift checks and numerical AST parity. Followup exercised offline oracle regeneration with network operations denied and compared fixture bytes, inspected installed/reference source hashes and ran broad application/export/reference/browser suites. This supports the stated software/component scope, not upstream test-suite execution or field validation.

These are agent self-review rounds, not three independent human reviews. Full upstream pvlib test suites were **not executed**; the committed generator directly executed the specified reference functions.

### Sources and hashes

At https://github.com/pvlib/pvlib-python/tree/v0.13.1 :

- `tests/conftest.py`, SHA256 `161c0305130313eb8e49ae57bacc22cef9fe6995c9b637d0304aa26a7666130e`.
- `pvlib/pvsystem.py`, SHA256 `9ebc0b98b678e1053184f642824139dc8c1ee9340b86aeda073f1c112478490c`.
- `pvlib/singlediode.py`, SHA256 `6f38b581bddea9fb344afa34af344751dde120bf0f22d3d698655752287899e7`.
- `pvlib/ivtools/sdm/desoto.py`, SHA256 `ac639516839ce58a08a8f3eb842625dccda52916d64ecae89a76f8dc2eaecb37`.
- `tests/test_pvsystem.py`, SHA256 `a945fbcbfe6e100b206095d18a5983cf341e24e8fd699a6707b00057b281e006` (translation tests inspected, not full suite executed).

## Failed attempts and rollback

An initial offline test replaced the socket class with a function, causing SSL class initialization to fail before computation. This was a test-instrumentation failure, not evidence of attempted network access. Replaced it with Python audit-hook denial of network operations; unchanged fixture regeneration succeeds. The committed generator enforces the same operation-level prohibition without breaking imports.

Fresh shallow checkout lacked pre-existing Phase1/Phase2 historical baseline objects. Fetched the exact0c4d7cad and0d41fd38objects, without branch change, expectation changes or blanket unshallowing. Locked Node/Python dependencies were restored locally; generated environments/logs remain ignored, no large environment files committed.

Rollback removes the standalone experiment/replay and qualification copy; there is no schema or production-numerical migration. Do not remove prior safety/adoption containment. Changes to model equations or persisted versions are intentionally deferred to a separately verified implementation. See the model evidence card and `phase3-single-diode-verification-receipt.json` for final outcomes/limitations.
