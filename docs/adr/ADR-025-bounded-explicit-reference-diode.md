# ADR-025 — Explicit reference parameters and bounded single-diode roots

Date: 2026-11-03. Status: implemented for a separate opt-in numerical API; not a replacement of legacy extraction or full U05/Phase3/adoption approval. Preserve ADR-024's legacy failure witness and all Phase2 gates.

## Decision and compatibility

Add strict `desoto_reference_bounded_v1` inputs in `src/contracts/referenceDiode.ts` and numerical owner `src/engine/core/referenceDiodeSolver.ts`. Public entry: `evaluateReferenceDiode`, also re-exported by `singleDiodeModel.ts`. The old positional `calculateSingleDiodeCurve`, its STC-extraction heuristic, sampled metrics, callers and known seed failure are unchanged. No hidden fallback is permitted between the two APIs.

The new implementation actually computes translated parameters, implicit Isc/Voc and continuous MPP with bounded roots; it is not just a schema/scaffold. It is deliberately **not selected by App, the I–V page, the calibration adapter, catalog/project import, HTTP, annual yield or finance**. There is no new UI selector, runtime endpoint or research adoption path. The old UI warnings remain truthful. Full vertical model selection/migration needs a separate reviewed contract and applicability decision; a new library function is not proof of those consumers being migrated.

Externally supplied per-module STC parameters are I_L_ref[A], I_o_ref[A], R_s[ohm], R_sh_ref[ohm], a_ref[V] and alpha_sc[A/K], not nameplate summary points or inferred manufacturer gamma/beta. Reference25°C/1000W/m², silicon Eg1.121eV and dEg/dT−.0002677/K are literal supported policy, not implicit technology guesses. a_ref explicitly represents nNsVth. Provenance source/record ID is required but remains caller attribution, **not authenticated manufacturer evidence**. Unknown fields, unsupported versions/basis, numeric strings and extra beta/gamma/fit parameters reject.

## Conditions, limits and result semantics

Condition envelope: effective irradiance0(dark) or50..1400W/m², cell temperature−20..85°C, integer1..100series modules. This is a declared implementation/experimental envelope, not a promise that every reference parameter vector in it is physically applicable or numerically resolvable. Positive finite I_L/I_o/R_sh/a, nonnegative R_s and finite alpha are required. Translation producing negative, zero or nonfinite parameters cannot become available.

The schema owns the optional iteration-budget default128, supported1..128. Internal root helpers require an explicit budget, cannot silently default to another model and enforce their own finite parameter/target/budget boundary. Ordinary public calls validate before computing.

Results discriminate:

- `available`: full-precision V/A/W metrics, translated string parameters, numerical residuals, normalized complete input/provenance/conditions and model identity.
- `dark`: exact zero generating metrics and retained input; no infinite shunt resistance serialized as null.
- `unavailable`: `invalid_input`, `numerical_domain` or `not_converged`; no successful-looking metric fields. `not_converged` includes root-bracket/nonfinite-root failure as well as iteration exhaustion; it is not a claim that every such failure merely needs a bigger budget.

Every result declares `financialAdoptionEligible:false`. The result's normalized input can be JSON-roundtripped/replayed without inferring a model from historical scalar outputs. No App/project schema is changed or rewritten. Internal exported numerical helpers exist for exact-expression reference execution; application/untrusted callers must use the validated public evaluator, not an unchecked diode-state evaluation.

## Governing equations and units

Source specialization: pinned pvlib0.13.1 `pvsystem.calcparams_desoto`, `singlediode.py:bishop88` and bounded root functions. Reference values are externally supplied, **not fitted here**. With T and Tref in K, G effective W/m²:

- I_L = (G/Gref)[I_L_ref + alpha_sc(T−Tref)].
- E_g(T)=E_g_ref[1+dEg/dT(T−Tref)].
- I_o = I_o_ref(T/Tref)^3 exp[E_g_ref/(k Tref)−E_g(T)/(k T)], with k=8.617333262145e−5eV/K.
- String R_s=N R_s_ref; R_sh=N R_sh_ref/(G/Gref); a=N a_ref T/Tref. Series stacking does not multiply photocurrent/saturation current.

Using diode voltage x=V+I R_s:

- I(x)=I_L−I_o expm1(x/a)−x/R_sh [A].
- V(x)=x−R_s I(x) [V]; P(x)=V I [W].
- I'(x)=−I_o exp(x/a)/a−1/R_sh [A/V].
- P'(x)=I+(x−2R_s I)I' [W/V=A].

No exponential clipping creates a fake finite root. Nonfinite evaluation rejects. The ideal open-circuit bound is xideal=a log1p(I_L/I_o). On[0,xideal], I decreases and V increases. At x=0, I>0 and V≤0; at xideal the finite-shunt current is≤0. In the generating quadrant, I(V) decreases and is concave, so I+V*dI/dV crosses zero once. Before the Isc crossing V<0 gives positive P' and after Voc gives negative P'. Thus the same bracket contains the unique generating MPP derivative root. Reject failed/nonfinite brackets and physically inconsistent final metrics rather than extrapolate. Extreme ratios may overflow this bound and return unavailable even when an abstract mathematical root exists; no arbitrary-parameter numerical-domain claim is made.

Each root uses bisection with at most128iterations. Acceptance requires absolute residual≤1e−10+1e−12×scale, where scale is ideal voltage for the Isc voltage residual and photocurrent for Voc current / MPP derivative residuals. Residual units remain separate. At most384root iterations are requested per public evaluation, plus bounded endpoint/final evaluations; no network/storage/clock/random dependency enters the numerical leaves. Physical sign/order/finite checks gate available results. These are numerical tolerances, not physical accuracy.

## Independent executed evidence

`scripts/fixtures/generate-bounded-diode.py` executes installed pinned pvlib0.13.1/NumPy2.2.6/SciPy1.15.3 offline, rejecting socket connection/DNS/send/bind. Inputs come from the source-pinned upstream Example Module and CS5P-220M test vectors, not live manufacturer catalog acquisition. Reference hashes are retained.72end-to-end cases cover2vectors×4irradiances×3temperatures×3series counts(1/12/100). Additional zero-Rs and small-current parameter cases exercise component kernels.

The complete independent pool contains862comparisons:72translations,296Bishop88states,418root/solver-policy cases and76public-result cases. The root pool includes independently specified analytic and budget/exhaustion tests; **not every pool row is an independent physical model case**. Upstream full test suites were not executed; the generator directly executes the reference functions. Extreme high-Rsh endpoint uses an explicitly labeled60-digit Decimal ideal-Voc limiting calculation because upstream floating-point solvers fail there; it is not reported as a successful pvlib whole-model run.

Unrounded reference comparison budget declared before execution: absolute2e−7(V/A/W)+relative1e−8; translation-only fixtures use1e−15+relative1e−8 to avoid hiding small saturation-current mutations. These cover reference optimizer termination and accumulation at100module string scale, not real accuracy. Residual checks use their own tighter numerical policy. Observed maxima over72public cases: Voc2.407432475592941e−8V, Isc4.906297590423492e−12A, Vmp7.713151717325673e−8V, Imp6.6082139760226255e−12A, Pmp3.5288394428789616e−10W. See the comparison artifact for exact values.

All66new expression identities have independently generated exact-node execution and mutation-sensitivity witnesses. The registration utility first replays the **entire independent pool** and only then selects an already generated vector demonstrating node reach/sensitivity. It never derives a numerical target from production outputs, changes tolerances or waives a missed node. Analytic/budget witnesses make iteration-counter/tolerance changes observable through success/exhaustion. Focused tests verify every current unit has exactly one record and explicitly execute them even while the new module is untracked; the ordinary manifest reference gate executes the registered records too.

## Failed-root witness and legacy non-adoption

For ADR-024's bad-seed case, the old API still returns188.23V. Applying the new seed-free bounded kernel to **the same at-condition parameters** yields45.00065763179139V with current residual3.552097505021834e−11A. This is a consumer/defect regression on an internally supplied parameter vector, not independent validation of the legacy STC extraction. The72external reference cases establish the separate kernel comparison domain. There is no beta seed in the new contract; unsupported beta/gamma fields reject instead of pretending to fit them.

Tests also cover51malformed/unsupported contracts, retained input/provenance and JSON replay, input immutability, strict versions/basis/units/default budget, dark state, exhausted budgets, invalid translation/overflow, direct public re-export identity, residuals and physical metric ordering. Existing first-slice48case legacy characterization and the unrepaired legacy defect remain intact. No old API result is silently reinterpreted as the new model.

## Three self-review/followup research rounds

1. **Contract/compatibility review:** traced the old I–V/calibration/cross-validation consumers, new public re-export, normalized input snapshot and schema defaults. Followup inspected pinned `calcparams_desoto` definitions for a_ref/alpha_sc/reference units and `fit_desoto`'s separate multi-equation fitting inputs. Decision: accept a_ref directly, require reference basis/provenance, reject gamma/beta and do not add guessed manufacturer coefficients or a catalog migration.
2. **Mathematics/numerical review:** derived the diode-voltage root/derivative bounds and checked dark/zero-Rs/small-current/100series/overflow/exhaustion cases. Followup inspected upstream Bishop88 gradient definitions: pvlib's returned dP/dV must multiply dV/dx to compare with our P'(x). Independently execute that conversion, continuous MPP roots and solver-budget witnesses. Discovered upstream high-Rsh Brent bracket/alternate Lambert overflow failures; preserved the limitation and used a separately identified Decimal limiting witness rather than tune a passing external output or drop the boundary silently.
3. **Delivery/evidence review:** verified the unchanged legacy source inventory, explicit API/JSON replay, no production selection/adoption and all66executed sensitive nodes. Followup ran offline byte-reproduction, actual full application/browser/export/regression paths and source/evidence inventory; reviewed manifest source hashes and fail-closed cases. No new UI/API selector or authenticated service was invented just to call the kernel; integration not implemented is explicitly excluded from completion claims.

These are agent self-review rounds, not independent human reviews or field validation.

### Pinned sources

https://github.com/pvlib/pvlib-python/tree/v0.13.1 :

- `pvlib/pvsystem.py`, SHA256 `9ebc0b98b678e1053184f642824139dc8c1ee9340b86aeda073f1c112478490c`.
- `pvlib/singlediode.py`, SHA256 `6f38b581bddea9fb344afa34af344751dde120bf0f22d3d698655752287899e7`.
- `pvlib/ivtools/sdm/desoto.py`, SHA256 `ac639516839ce58a08a8f3eb842625dccda52916d64ecae89a76f8dc2eaecb37`.
- `tests/conftest.py`, SHA256 `161c0305130313eb8e49ae57bacc22cef9fe6995c9b637d0304aa26a7666130e`.

## Failed attempts and rollback

The initial extra high-Rsh1e300ohm case caused pvlib Brent `f(a)/f(b)` sign rejection from floating-point cancellation. An exploratory pvlib LambertW call also overflowed and emitted NaN. Neither result was adopted or serialized as a reference. The committed generator keeps this boundary as the separately stated Decimal ideal-Voc limit (finite-shunt perturbation<1e−290V), not an external-solver accuracy claim. Ordinary finite reference cases continue to execute Brent/Bishop88.

An initial helper default `iterationLimit=128` was extracted as a formula in a parameter initializer, outside the harness's supported direct-body binding. Default ownership properly belongs to the public input schema; the internal helper now requires the explicit validated budget. No harness exemption or arbitrary new default fixture was introduced. All66remaining actual numerical expressions execute/sensitivity-check.

Rollback disables/removes the explicit new API, not an invisible routing switch to legacy extraction. No App/persisted schema was changed; no silent saved-result conversion or dependent annual/financial invalidation is required. Keep historical receipts and legacy failure qualification. Full datasheet fitting, arbitrary reference-domain reliability, manufacturer applicability, calibrated cell/area provenance, thin-film/recombination/reverse-breakdown/bypass circuits, UI/API/catalog adoption and whole Phase3 remain open. See the bounded-diode guide, evidence card and verification receipt.
