# Accepted audit corrections — Vmp coefficient and agent guidance

## Acceptance
Measured manufacturer beta_Vmp is preserved from custom catalog input through selection and project snapshot to advanced sizing. Catalog/advanced fields use %/°C; string HTTP accepts fractional betaVmpPerC or percent tempCoeffVmpPct, with conflicting aliases rejected. Measured input takes precedence over Pmp/Isc proxies and must be finite and negative. Missing values keep existing numerical behavior with explicit non-conservative-bias caveats; no built-in coefficient is fabricated.

The shared resolver is an implementation consistency mechanism, not a new physics validation. Linear algebra checks at 25°C and hot/cold endpoints test implementation. Pmp=Vmp*Imp implies gamma_Pmp=beta_Vmp+alpha_Imp locally; alpha_Isc is only a proxy. Standards edition/clauses and manufacturer applicability require independent review.

## Guide and rollback
In Catalog, enter optional Manufacturer beta_Vmp in %/°C (e.g. synthetic -0.4); blank means unknown. Saved/imported project module snapshots retain it. For HTTP send -0.004 as betaVmpPerC OR -0.4 as tempCoeffVmpPct. Explicit zero/positive/nonfinite coefficients are errors, not unknowns. Do not reuse synthetic examples as datasheet facts.

The optional field is the adoption switch: omit it to retain legacy numerical fallback, with warning. Roll back via selective inverse patch together with schema/tests; never reset unrelated work. Existing snapshots without the field remain supported. Invalid supplied values deliberately no longer pass silently. No clipping/wind/harmonics formula or research-to-finance gate changes are accepted here. Energy/financial outputs may change indirectly when a measured coefficient changes the feasible array design; no research adoption is authorized.

## Review sequence
1. Reviewed catalog, selection and snapshot flow; then examined source coefficient/temperature units and persistence schema.
2. Reviewed all three voltage-window implementations; then derived the local product-rule identity and added synthetic hot/cold counterexamples. This is analytical research, not independent manufacturer validation.
3. Reviewed HTTP aliases and regressions; then added real disposable-server tests and provenance guards. No licensed clause verification, field campaign or new external model certification was performed.

Agent instructions are corrected working rules, not a declaration that all pre-existing modules satisfy them. Pending: primary-source clipping/wind/harmonics review, whole-model reference evidence and container runtime gate.

## Reference-gate stop condition
The changed-expression independent-reference gate is run separately from the executable regression suite. Synthetic endpoint/product-rule cases do NOT satisfy its independent-source requirement. On this patch it reports seven missing records (catalog input guards, MPPT selection and fractional/percent conversion expressions). Do not reclassify those internal checks as independent evidence or weaken the gate; this remains a release stop until acceptable references are registered and executed. This scoped result is distinct from the earlier eight whole-model blocked entries.

The wider smoke harness had a stale all-targets-PASS assertion. It now accepts only the explicitly retired bifacial WARN and still rejects failed metrics or any other warning, with negative checks. The discrepancy is not erased or blessed as physics validation. Seven existing independently generated string fixtures were regenerated with diagnostic wording updated only; numerical references were unchanged.
