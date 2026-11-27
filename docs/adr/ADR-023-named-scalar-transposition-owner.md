# ADR-023 — Named inherited scalar transposition owner

Date: 2026-11-03. Status: implemented, bounded U07a infrastructure; not new physical-model validation or overall Phase2 completion.

## Decision and governing policy

Extract `calculateFixedTiltTranspositionGain` unchanged from `waterfallLossEngine.ts` to `core/scalarTransposition.ts`. The named policy is **legacy_latitude_tilt_screen_v1**. Preserve a deprecated identity re-export at the former path: compatibility callers receive the exact same function object, not a copied implementation. Canonical annual, App, waterfall UI and roof simulation already use the configured waterfall owner (ADR-020/021). No change to their energy calculations, ordering, financial eligibility, cached results, schema or serialized report shape occurs here.

The governing source is the inherited application screen at repository base `0d41fd38c8038fb5a2c4f1da8082dc2fbcd2f8fb`, `src/engine/waterfallLossEngine.ts`, function `calculateFixedTiltTranspositionGain`. Its coefficients are **not independently empirically validated**. Naming/extracting the policy does not cure that limitation or establish a scientific transposition model.

For tilt b and absolute latitude L, both in degrees:

- Missing tilt returns16.8percent over horizontal GHI; nonpositive tilt returns0.
- `o = max(8, min(60, .88 L))` degrees, default latitude35.69degrees.
- `m = 12 + min(6, .15 L)` percent.
- `g = m sin((pi/2) min(1,b/o)) cos(max(0,b−o) pi/180)` percent.
- Return the inherited one-decimal `Number(g.toFixed(1))` value.

The one-decimal quantization remains part of the **legacy policy**, not a newly recommended scientific precision. Removing it would change energy and downstream finance; that is explicitly outside an unchanged extraction. Absent/zero/nonfinite/out-of-domain behavior is characterized, not silently repaired or declared an engineering-valid domain. Independent finite characterization covers latitude−90..90degrees and tilt−1..90degrees (negative tilt only checks the legacy zero branch). Physical project applicability is unassessed.

Tracker simulation remains untouched: clear-sky relative tracker gain over its fixed reference is multiplied by the inherited1.168 fixed-over-GHI anchor. It is not equivalent to invoking the tilt heuristic with every tracker's reference angle. The policy disclosure states this exception instead of claiming common coefficients or weather-driven POA accuracy.

## Legacy annual interface and no silent adoption

`calculateUnifiedAnnualYield` has **no current non-benchmark production consumers**. It retains a different constant1.168fixed/1.25tracker transposition and other legacy stage/thermal behavior. Mark that API deprecated and document the difference. Do not silently replace it with the canonical model, which would alter historical API outputs and need independent full-result evidence and migration decisions. A focused AST import guard prevents accidental promotion of this unused alternate API (including renamed/namespace imports) to production.

This completes the named production fixed-tilt owner and previously completed 17-slot consumer migration, not physical annual-model harmonization. Global persisted model-policy selection, all alternate annual APIs, weather-based transposition and full U02 consumer reconciliation remain separately open. The named constant is a current implementation identifier, **not** a new user-selectable saved model. Existing projects keep their current behavior; no new serialized field is silently added.

## Evidence and tolerances

`generate-scalar-transposition.py` independently evaluates the stated inherited policy with60-digit Python Decimal and120-term Taylor-series sine/cosine using an explicit high-precision pi. It does not import/execute TypeScript, use JavaScript Math/libm outputs or copy production numerical targets.122cases cover both hemispheres/equator,9latitudes,10tilts each, below/at/above optimal-tilt boundaries and absent tilt/latitude. The Taylor domain here is small (sine argument0..pi/2, cosine excess <pi/2 for the characterized finite cases);120terms make truncation negligible relative to inherited0.1percentage-point quantization. Absolute/relative1e−12 tolerances are arithmetic conversion allowances, not forecast accuracy. The matrix asserts exact equality of its quantized outputs. Arbitrary rounding ties outside this matrix are not independently certified.

Fifteen exact-expression records are individually executed and mutation-sensitive, including missing-tilt and nonpositive-tilt return branches, optimal-tilt bounds, trig factors and decimal quantization. The ordinary Git-diff reference gate does not discover new untracked source files in this workspace, so the focused test **explicitly executes all15records regardless of Git tracking state**. This supplements rather than changes/weakens the gate. A reported11cumulative branch-diff count must not be confused with those15additional extraction checks.

The focused test also loads the **actual base module** beside its dependencies and compares153scalar results exactly with `Object.is`, including default, NaN, infinities, negative/tiny/extreme tilt and signed-coordinate cases. Those are regression/compatibility observations, not physical reference cases. Prior full canonical/roof Decimal fixtures and actual base JSON comparisons continue to exercise report composition and consumers. The bilingual UI uses a shared disclosure and is tested in static render and production-browser paths; existing DOCX/XLSX/JSON readback continues unchanged.

## Three self-review and followup investigations

1. **Contract/ownership review:** traced all production imports of configured waterfall, the old public fixed-tilt export, and unused `calculateUnifiedAnnualYield`. Found incompatible constant-gain semantics in the latter, so retained/deprecated rather than silently harmonizing them. Followup fetched and inspected pvlib0.13.1 `irradiance.py:get_total_irradiance`: actual POA needs tilt/azimuth, solar geometry, DNI/GHI/DHI and specified sky/ground components. This scalar latitude/tilt heuristic cannot claim pvlib equivalence; its policy label and warnings explicitly say so.
2. **Arithmetic/domain review:** checked signed latitude, absent tilt, latitude defaults, branch execution, optimal-tilt saturation, excess cosine and one-decimal quantization. Followup inspected ECMAScript2025 `Number.prototype.toFixed`, `Math.sin` and `Math.cos`: toFixed rounds the represented binary number, trig is implementation-approximated, and nonfinite trig returnsNaN. Therefore retain exact legacy behavior and independently compare finite quantized values; do not turn compatibility of NaN/Infinity into new supported-domain claims. Independent Decimal Taylor fixtures and per-node mutation execution follow this review.
3. **Delivery/consumer review:** examined production UI labeling, actual base module results, report shape compatibility, old tuple APIs, canonical/roof calls and regression wiring. Followup inspected pinned pvlib tests (`test_isotropic_float`, total-irradiance input/model cases) and its isotropic component equation `DHI*(1+cos(beta))/2`, confirming component/reference tests are not a substitute for annual weather/energy evidence. Production browser checks the policy disclosure across existing mode/energy/artifact paths. Upstream pvlib tests were inspected, **not executed**, and no external full-model parity is claimed.

These are agent self-review passes, not independent human reviews.

### Research provenance

- https://github.com/pvlib/pvlib-python/blob/v0.13.1/pvlib/irradiance.py ; SHA256 `57ab40dfbe624bd85c3b9f7168922ba96ef572ddd58c5fbf05d34184dbc6998c`; `get_total_irradiance`, `isotropic`, model/input documentation inspected.
- https://github.com/pvlib/pvlib-python/blob/v0.13.1/tests/test_irradiance.py ; SHA256 `1d396714977b5312f8fe35c0d9b7e40c491de7fe102d1c41f94dbb668937981b`; scalar isotropic witness and total-irradiance model/input tests inspected.
- https://github.com/tc39/ecma262/blob/es2025/spec.html ; SHA256 `525626fffc5737ad2eab8898f36e2a29189ada2d31316cc5beffeea1b4122321`; sec-number.prototype.tofixed / sec-math.sin / sec-math.cos inspected.

## Failures, prerequisites and rollback

This resumed workspace lacked installed packages. Restored locked verification dependencies with `npm ci --ignore-scripts`; no dependency/lockfile version change. Initial fixture generation wrote absolute registry paths; gate correctly rejected them. Corrected generator to repository-relative paths and regenerated the existing grid-import ledger registry ordering. No production output was copied and no gate exception added.

Initial broad regression's Phase1/Phase2 scripts failed because the shallow checkout lacked historical object `0c4d7cadc7db6001459ea36fdf9a3d1403179a71`, required by pre-existing actual-base AST tests. Retrieved **that exact commit** with `git fetch --no-tags origin <sha>`; did not change branch or substitute a newer baseline. Rerun outcomes belong in the verification receipt; the first failed executions remain recorded. Fresh shallow CI/workspaces must provide that historical object for these pre-existing gates.

Rollback restores the original fixed-tilt body and removes the new import/re-export together. No user data migration, numerical result invalidation or behavior flag is needed for an unchanged extraction. Do not roll back safety containment from prior slices. No new model adoption, standards conformity, bankability or whole-Phase2 completion is authorized. See `docs/guides/scalar-transposition-policy.md` and `phase2-transposition-verification-receipt.json` for delivery evidence.
