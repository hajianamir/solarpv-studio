# U05 evidence card — bounded explicit-reference kernel

## Identity/state

- Public API: `singleDiodeModel.ts:evaluateReferenceDiode` re-exporting the sole owner in `core/referenceDiodeSolver.ts`.
- Strict input/result identity: `desoto_reference_bounded_v1`; contract owner `contracts/referenceDiode.ts`.
- Implementation: functional separate translation/bounded-root/continuous-metric API implemented.
- Verification: independent component/numerical-policy/contract scope verified; see receipt for executed commands.
- Model adoption/release: **BLOCKED/PARTIAL**. No App/I–V/calibration/catalog/project/HTTP/annual/financial selection is implemented. Full fitting, manufacturer applicability, field/conformity/whole-model validation and overall U05/Phase3 are not established.

## Domain/provenance

Externally supplied per-module STC parameters, not extracted nameplate summary values. Two source-pinned upstream pvlib0.13.1 fixture records (Example Module and CS5P-220M), not verified/current manufacturer catalog data. a_ref is nNsVth[V], alpha_sc is A/K; string scaling is performed once from per-module Rs/Rsh/a. Reference25°C/1000W/m², silicon Eg1.121eV/dEg−.0002677/K are explicit literals. Caller-supplied source/record text is attribution, not independent authentication/applicability approval.

72public cases:2reference vectors×G50/200/1000/1400W/m²×T−20/25/85°C×1/12/100series modules. Additional kernel-only zero-Rs/small-current cases; zero irradiance separately yields a dark state with zero metrics, not infinite-Rsh output. Supported condition envelope does not certify arbitrary coefficient vectors or unresolved numerical extremes. No parallel/mismatched/bypass/reverse-breakdown/recombination/spectral or CEC Adjust model.

## Independent method and policy evidence

Offline generator directly executes pinned pvlib `calcparams_desoto`, `singlediode` and `bishop88` with bounded reference roots/continuous MPP. Gradient conversion multiplies pvlib dP/dV by dV/dx. Python generator has no production TypeScript imports/execution/targets and denies network operations after installation. Source hashes and exact input/output vectors are stored with the oracle; primary source locations/hashes and numerical derivation are in ADR-025.

862total pool comparisons:72translations,296states,418root/solver-policy vectors,76public results. **Not862external physical-model cases.** Analytic budget/exhaustion/invalid boundaries are labeled separately from independent component references. A high-Rsh1e300ohm endpoint uses a60-digit Decimal ideal-Voc limiting witness; attempted upstream floating-point methods failed and were not adopted as reference output. The full upstream test suite was not executed.

66new expression identities each have exact-node executed/sensitive independent evidence. A registration utility first compares the entire oracle pool; then selects a vector for reach/sensitivity without changing oracle outputs/tolerances. Ordinary focused tests assert complete current expression coverage and explicitly execute all66records; the manifest gate also executes them. No waiver for parameter defaults/nested owners or untracked files.

## Numerical acceptance/results

Inputs/outputs use V/A/ohm/W/°C/Wm². Unrounded comparison budget2e−7absolute+1e−8relative; translation-only fixture budget1e−15+1e−8relative prevents small-Io mutations hiding under a large absolute tolerance. These allow reference optimizer termination/numerical conversion at100series scale, not physical uncertainty or field accuracy. Root acceptance separately requires residual≤1e−10+1e−12×scale (A for Voc/MPP derivative, V for Isc).

Observed maxima over72full cases:

| Quantity | Maximum absolute discrepancy |
|---|---:|
| Voc |2.407432475592941e−8V|
| Isc |4.906297590423492e−12A|
| Vmp |7.713151717325673e−8V|
| Imp |6.6082139760226255e−12A|
| Pmp |3.5288394428789616e−10W|

No display rounding or80step MPP approximation enters the new metrics. Results include the complete normalized input/provenance/conditions, parameter basis, policy identity and residuals. `available` means this numerical contract converged, not model adoption approval. `dark` preserves true zero; `unavailable` contains an explicit reason and no success metric fields. All result variants set financial adoption false.

## Boundary/consumer evidence and limits

51invalid/unsupported contract cases, exact-limit/adjacent conditions, schema-default budget, dark/overflow/negative-translation/exhaustion behavior, no mutation and JSON result-input replay tested. The old public module's new re-export is the same function object; no duplicate solver or fallback. The old positional API remains numerically unchanged and still reproduces the188.23V failed seed. Applying the new bounded kernel to the identical at-condition parameters yields45.00065763179139V and3.552097505021834e−11A residual. That witness is an internal defect regression, not independent validation of legacy extraction.

No selector was added to the I–V page and no HTTP/adoption API was exposed; actual existing browser/export suites check regressions, **not** a new UI/model integration that does not exist. Arbitrary datasheet fitting, coefficient-consistent beta/gamma constraints, invalid/unsupported technology domains, legacy extraction/area/cell inference and model-quality selection remain open. Extreme finite ratios can be unavailable because the finite bound overflows; do not promise all mathematical roots are representable.

## Reproduction/rollback

- Oracle: `scripts/fixtures/generate-bounded-diode.py`, pinned existing scientific requirements; `--check` rejects drift rather than silently overwrite.
- Data: `scripts/fixtures/physics/bounded-diode-pvlib.json`; each row records evidence class.
- Replay: `npm run test:phase3`, including historical first-slice legacy comparisons and current bounded solver tests.
- Expression selection: `scripts/register-bounded-diode-evidence.ts` (explicit maintenance operation, not ordinary numerical fixture generation).
- Records: `phase3-bounded-diode-comparison.json`, `phase3-bounded-diode-verification-receipt.json`, ADR-025 and `docs/guides/bounded-reference-diode.md`.

Rollback removes/disables the separate API and never routes its versioned input to legacy extraction silently. No App/durable schema migration or automatic financial invalidation was introduced. Earlier Phase2/3 receipts are historical execution snapshots; their source hashes need not match this later additive API change. Overall release remains blocked.
