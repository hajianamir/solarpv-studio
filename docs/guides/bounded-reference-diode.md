# Explicit reference single-diode API

`evaluateReferenceDiode` is a separate opt-in numerical API. It translates supplied reference parameters and computes implicit Isc/Voc and continuous MPP with bounded roots/residual checks. It does **not** fit a datasheet, replace the legacy I–V page or automatically supply energy/finance. It is not a manufacturer/applicability certificate.

## Input example

```ts
import {evaluateReferenceDiode} from '../engine/singleDiodeModel';

const result = evaluateReferenceDiode({
  modelPolicy: 'desoto_reference_bounded_v1',
  reference: {
    basis: 'per_module_stc',
    photocurrentA: 5.114,
    saturationCurrentA: 8.196e-10,
    seriesResistanceOhm: 1.065,
    shuntResistanceOhm: 381.68,
    diodeFactorV: 2.6373,
    alphaScAperC: 0.004539,
    referenceCellTempC: 25,
    referenceIrradianceWm2: 1000,
    bandgapEv: 1.121,
    bandgapTemperatureCoefficientPerK: -0.0002677,
    provenance: {
      source: 'pvlib0.13.1 tests/conftest.py; test vector, not verified catalog',
      recordId: 'cec_module_cs5p_220m',
    },
  },
  conditions: {
    effectiveIrradianceWm2: 1000,
    cellTempC: 25,
    seriesModules: 12,
  },
  iterationLimit: 128,
});

if (result.status === 'available') {
  // Unrounded V/A/W and numerical residuals, not an adoption decision.
  console.log(result.voc, result.isc, result.vmp, result.imp, result.pmp);
} else if (result.status === 'dark') {
  // Exact zero generating metrics; no infinite Rsh in serialized output.
} else {
  // invalid_input, numerical_domain or not_converged; no metric fallback.
  console.log(result.reason);
}
```

This example uses an upstream reference test record, not a verified current manufacturer fit. The schema is strict at every level. Unknown fields, unsupported model/basis, numeric strings, beta/gamma coefficients and incomplete reference/provenance reject. Supply alpha in **A/°C**, not percent; `diodeFactorV` is **a_ref=nNsVth**, not per-cell kT/q or the legacy `vt` field. Rs/Rsh are **per-module STC** here, unlike the legacy custom string-total API. Series scaling is performed once.

Only silicon assumptions25°C/1000W/m²/Eg1.121eV/dEg−.0002677/K are implemented. Conditions are0(dark) or50–1400W/m² effective irradiance,−20..85°C and integer1..100series modules. This envelope is not proof of every possible parameter vector's applicability or numerical resolvability. Thin-film recombination, reverse breakdown, bypass networks and CEC Adjust are unsupported. Provenance text is caller attribution, not independently authenticated evidence.

## Failure and precision

`iterationLimit` defaults to128in the validated schema, permits1..128and bounds each of three roots. A valid input can still be unavailable: negative/overflowed translation, nonfinite/failed bracket or exhausted budget cannot become successful values. `not_converged` includes numerical bracket/evaluation failures, not just an iteration-count shortage. Never silently retry using the legacy extraction model.

The solver uses diode voltage and implicit residual checks, without exponential clipping or a beta-based Newton guess. Root residual units differ: A for open circuit, V for short circuit and W/V=A for MPP derivative. Numerical policy is absolute1e−10+relative1e−12scaled by photocurrent or ideal voltage as appropriate. Output is not rounded; downstream presentation must not feed rounded metrics back into calculations. `available` describes a numerical result in this contract, **not** a physically validated module or financially adoptable annual model.

Available/dark results retain the complete normalized input, model identity and `financialAdoptionEligible:false`. JSON-roundtrip `result.input` through this same evaluator for replay. No App/project/import/API schema or automatic selection is changed. Do not reinterpret older saved scalar outputs as explicit-reference results. Unavailable responses intentionally have no successful metric fields.

## Legacy behavior and testing

`calculateSingleDiodeCurve` and its existing callers are unchanged, including the known extreme-beta seed failure. The new bounded kernel resolves that at-condition vector to45.0006576V rather than188.23V, but this is **not** a repair of the legacy summary-input extraction API. The I–V page still uses the qualified legacy model; its cosmetic shading warning remains.

`npm run test:phase3` includes the earlier legacy characterization and the new72case full-reference comparison,862component/solver-policy vectors,51invalid contracts and66executed mutation-sensitive numerical expressions. Source-pinned external cases, policy/analytic boundary tests and internal failure witnesses are explicitly distinguished. No full upstream test suite or field validation is claimed.

Application setup on Windows remains `install.bat`. Optional scientific reference regeneration runs locally/server-side in an isolated environment installed from `services/pvlib_study/requirements.txt`:

```text
python scripts/fixtures/generate-bounded-diode.py --check
```

The generator rejects network operations after installation and asserts pvlib0.13.1/NumPy2.2.6/SciPy1.15.3. Do not run heavy scientific references in browser JavaScript. Reference drift must be investigated before dropping `--check` to regenerate. The registration utility selects executed/sensitive witnesses only from the independently generated pool; it never manufactures targets by reading production results. Updating fixtures requires refreshing the existing grid-import registry normalization and evidence inventory, then rerunning the gates. Ordinary tests only replay and check; comparison-receipt writes require explicit `--write` after review.

Rollback removes/disables this new API. It must not silently route explicit inputs to the legacy solver. No durable migration is introduced here. Full datasheet fitting, current UI/catalog/API/project integration, validated manufacturer applicability and annual/financial adoption remain separate work. See ADR-025, `PHASE-3-STATUS.md`, `phase3-bounded-diode-evidence-card.md`, the comparison artifact and verification receipt.
