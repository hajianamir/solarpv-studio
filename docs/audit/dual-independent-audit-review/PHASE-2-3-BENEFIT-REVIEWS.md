# Benefit precision — three bounded internal reviews and follow-up investigations

These are same-agent internal reviews, not independent external audits. Scope is ADR-028, not whole Phase2/3.

## Review 1 — semantics, units and financial consumers

Inspected legacy penalty/outage calculations, Iranian UI and existing whole-result finance/policy regression expectations. Found premature rounding and a combined implication of savings despite unverified coefficients. Decision: additive API, explicit rates, separate qualified indicators, no ledger change.

Follow-up investigation: standalone Python Decimal dimensional references cover 168 Cartesian inputs including fractional and zero values; the .5kWp/11.8MWh example isolates the rounding defect. This is arithmetic evidence only. No primary Iranian tariff or customer outage-loss source was acquired in this slice. The absent official/source applicability evidence continues to prohibit realized savings/official-rate claims. Outage time basis is deliberately not inferred.

## Review 2 — input, reproducibility and reference integrity

Reviewed strict contract, explicit model policy, overflow, no-input mutation, serialized metadata and legacy compatibility. All three current mathematical expressions have executed independent reference reach and mutation sensitivity, enforced by direct source inventory even before new files are tracked. Focused suite passes invalid/zero/overflow/JSON/bilingual and unchanged old-output boundaries.

Follow-up investigation: the governing reference gate exposed a manifest-order reproducibility conflict: the independent grid-import generator moves its records to the end. Fixed only the new registrar's insertion order; did not regenerate expected values with production outputs, loosen comparison tolerance or modify old reference generator semantics. Both independent generators' byte checks pass. Initial phase suites also failed because the shallow checkout lacked historical paths; `git fetch --unshallow origin main` restored historical references without switching branches or changing test expectations.

## Review 3 — real consumers, broad gates and interpretation

Actual production Chromium passes three-mode raw indicator/policy/precision assertions alongside preexisting project import/export, adopted-energy, NPV and artifact read-back checks. Broad integration passes 11/11 including browser/Worker/archive/gateway. This run does not establish root cause or resolution of the previously intermittent project-save timeout P23-RT01.

Follow-up investigation: first baseline retains actual historical-fixture/reference-order failures. After remediation all 13 baseline command exits passed, but the harness correctly marked the second receipt incomplete because workflow configuration changed during its run. Neither attempt is relabeled successful. A subsequent stable-source run is recorded separately in the machine receipt. Logs report their runtime UTC timestamps; task date is not a wall-clock attestation. Lint has 93 warnings and no errors; warnings are not waived as fixed.

## Stops and remaining research

No new manufacturer/normative tariff/site/financing applicability evidence, Windows execution, Docker execution, exact-revision remote CI or whole-model validation is claimed. Existing scientific source acquisitions are historical, not newly executed external financial models. Deep source-backed financial/structural/model research and three final whole-system review cycles remain on the canonical queue. Legacy rounded LCOE/other economics and solver/debt/import/export contracts remain separate work; Phase2/3 and release stay incomplete/blocked.
