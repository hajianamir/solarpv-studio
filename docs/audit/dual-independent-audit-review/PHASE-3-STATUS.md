# Phase3 status — started, not complete

## U19 steady-duty energy continuation — task date2026-11-03

Added strict opt-in `pump_steady_duty_energy_v1`, separating full-precision hydraulic, shaft, motor-electrical and drive-DC power/energy and aggregate daily DC deficit. Density/gravity/runtime/head/efficiencies/available DC energy are explicit, never inherited from PSH or legacy nameplates. A new off-by-default, empty, temporary UI comparison exposes these boundaries and rejects invalid/numerical domains. It does not persist project policy, choose equipment, prove chronology/water delivery or adopt energy/finance. Legacy numerical output remains unchanged; its UI is now explicitly heuristic/synthetic/unassessed.

Evidence:864independent Decimal valid cases plus five numerical-failure witnesses,18reached/mutation-sensitive expressions,48actual-base legacy whole-result comparisons, bilingual SSR and production-browser real-input/deficit/zero/invalid/toggle/remount/financial-isolation assertions. See ADR-030, `PHASE-3-PUMP-DUTY-PLAN.md`, `PHASE-3-PUMP-DUTY-REVIEWS.md` and `phase3-pump-duty-verification.json` for runtime results, failures, source identities and limits. **U19 remains PARTIAL:** matched equipment curves/limits, chronological resource/water feasibility, source applicability and persistent versioned project policy remain open. **Phase2 INCOMPLETE; Phase3 PARTIAL; release BLOCKED.** Historical snapshots below are not current-source runtime attestations.

## Conventional periodic IRR continuation — 2026-11-03 task date

U16b/U16c: strict opt-in `conventional_periodic_irr_bounded_v1` now separates available unrounded annual IRR from invalid/no-sign-change/nonconventional/out-of-domain/numerical outcomes. Iranian UI explicitly assesses project/equity series from existing unrounded ledgers and shows localized reasons; the legacy financial API, NPV, ledgers and saved project settings remain unchanged. No multiple-root selection, XIRR, guaranteed convergence or financial adoption.

Independent Decimal evidence:164 root/status cases (including96 project/equity ledger compositions), eight NPV cases and33 reached/mutation-sensitive expressions. See ADR-029, `PHASE-2-3-IRR-ASSESSMENT-PLAN.md`, `PHASE-2-3-IRR-REVIEWS.md` and `phase23-irr-verification.json` for current runtime evidence, failed attempts and stops. **U16b/U16c remain PARTIAL, Phase2 INCOMPLETE, Phase3 PARTIAL, release BLOCKED.** This snapshot supersedes only the statement that every UI IRR is legacy-rounded; legacy API and other economic policies remain open.

Date: 2026-11-03. Branch base: a5b2c5f8eac89b3be3a9148f786653e0ee11815a.

**Phase3 STARTED through an independent U05 experiment. Phase2 remains INCOMPLETE. Release remains BLOCKED.** Starting evidence work is not an assertion that earlier gates passed or all models are validated.

## Current U20 continuation — explicit retirement and v2 archives

The known-invalid Student-t path is now explicitly refused at the public sampler/financial engine and actual Worker; the runner blocks it before allocation and rejects unsupported reply families. Gaussian calculation is unchanged and is checked against actual-base deterministic hashes in all three modes. No automatic Gaussian fallback or corrected t model is introduced.

New archives use strict `financial-uq-archive-v2` and `gaussian-only-retired-student-t-v2`. Valid v1 files preserve their original results/hashes but are read-only in this engine, even for Gaussian/source-matching snapshots. New policy/source checks gate v2 replay; neither old nor new archive can automatically adopt energy or mutate finance. Historical v1 generation, strict parser/worker tests and production-browser import/replay regressions cover the boundary. See ADR-027 and [remaining work execution](PHASE-2-3-REMAINING-EXECUTION.md).

This closes retired-path containment, **not all U20**: calibrated scenarios/interval coverage and any corrected t replacement remain open. Phase2/3 and release remain incomplete/blocked. The sections below retain earlier execution-time states, including statements that the legacy t path was still executable before this continuation.

## Primary-source deep research continuation

See [the ten-package research dossier](PHASE-3-DEEP-RESEARCH.md), `phase3-research-sources.json` and `phase3-research-comparison.json`. Acquired 28 immutable-source/data artifacts. Executed 60 thermal, 16 IAM, 96 bifacial, 30 full-year clipping, 27 pump-duty, six financial and 20 Student-t CDF cases plus a five-equation De Soto fitting experiment with retained default-guess failure. Full cached source hashes and actual loaded pvlib source are checked; numerical generation reproduces exactly offline.

The evidence supports explicit restriction/replacement designs, not package closure: actual discrepancies remain, manufacturer and site/normative applicability cannot be inferred from CEC/model code, southern annual weather is missing, and production selectors/serialization and whole-model execution are not supplied by research alone. No production numerical changes or automatic adoption. **Phase3 PARTIAL; release BLOCKED.**

## U20 production convergence continuation

Added an opt-in offline production Gaussian sampler diagnostic with 2–4 budgets and 3–8 seeds, per-run deterministic hashes and explicit CDF seed envelopes. Tests cover 20/100/400 trials and three seeds under zero latent-correlation and correlated scenarios, replay, independent envelope aggregation and rejection boundaries. Worker/archive regression suites pass separately. This is not external numerical validation or integrated persisted diagnostic replay.

**New stop:** legacy Student-t latents are transformed with a normal CDF, not a Student-t CDF. The diagnostic rejects this family; existing production behavior remains unchanged and unvalidated pending explicit versioned repair/calibration and replay policy. No financial-adoption approval, IID interval claim, additive variance claim or N=100 guarantee. See ADR-026. U20 and all Phase3 are still incomplete.

## Bounded explicit-reference continuation — current

The next kernel priority is now implemented as a **separate opt-in API**: strict `desoto_reference_bounded_v1` per-module STC reference inputs, separate De Soto translation, bounded diode-voltage roots with residual checks, exact implicit Isc/Voc and continuous MPP. Dark/unavailable/available remain distinct; failures cannot become successful metrics. Results retain full normalized input/provenance/conditions and financial adoption remains false. Public entry is re-exported by `singleDiodeModel.ts`; existing positional API/callers remain unchanged.

Evidence:72external end-to-end cases,862component/solver-policy comparisons,51invalid contracts and66executed mutation-sensitive numerical expressions. The original failed-seed vector resolves through the new kernel to45.0006576V with~3.55e−11A residual; **the legacy API still reproduces its188.23V defect** and was not silently replaced. Source-pinned external calculations, analytic limit/budget boundaries and internal defect witnesses are separately labeled. No tolerance was widened; attempted upstream extreme high-Rsh floating-point failures remain documented.

See ADR-025, `PHASE-3-BOUNDED-DIODE-PLAN.md`, the bounded evidence card/comparison/verification receipt and `docs/guides/bounded-reference-diode.md`. All18broad regression commands pass in the recorded run; final evidence-maintenance reruns are listed in the receipt. Numerical library implementation is **implemented/verified within this scope**, not a complete U05 or operational integration. No App/I–V/calibration/catalog/project/HTTP/annual/financial model selection or durable schema migration was added.

**Next:** assess supported datasheet fitting inputs/coefficient constraints/residuals and a separately explicit consumer/model-selection/migration decision. Do not treat passed reference-parameter arithmetic as validated manufacturer extraction. Arbitrary reference domains/technology, legacy extraction/seed reliability, full U05/Phase3 and release remain partial/blocked. Historical first-slice observations below retain their execution-time state.

## U05 first slice

- **Implementation:** standalone pinned-pvlib reference acquisition/generator, offline TypeScript replay, committed comparison metrics and bilingual I–V qualification implemented. No production numerical replacement, saved schema change, model-selector change or annual/financial adoption path.
- **Verification:**48independent explicit-reference parameter cases and3,888curve points pass declared translation/quantization budgets. True optimized MPP and implicit Isc discrepancies are reported separately. Moderate seed/gamma/zero behavior, severe unconverged-root witness, static bilingual rendering and actual production-browser cosmetic-toggle/KPI behavior tested. Existing production numerical formula AST unchanged against branch base.
- **Release/model acceptance:**BLOCKED/PARTIAL. Complete fitting, validated applicability and arbitrary-input convergence are not established. A reproducible extreme-beta Newton failure remains unresolved and blocks any solver-reliability/adoption claim. External fitted parameters are upstream test vectors, not verified catalog metadata.

All18selected application/regression commands pass in the current verification run, including lint/build/core/smoke/coverage, Phase1/2/3, accepted audit, export/help/claims/physics/evidence and actual browser/UI suites. Lint retains93existingwarnings; the retired unverified bifacial target remains WARN. The offline Python oracle was executed with network operations denied and reproduced fixture bytes. Full upstream pvlib test suites were not executed. See `phase3-single-diode-verification-receipt.json` for commands, hashes, failures and scope.

## Findings requiring numerical followup

| Finding | Observation | Disposition |
|---|---|---|
| P3-U05-F1 | gamma_Pmp input is unused | Reproduced; copy qualified. Do not invent/use a fitted gamma constraint without supported fit design. |
| P3-U05-F2 | beta_Voc seeds the root but does not constrain a fitted temperature relation | Reproduced and qualified; fitting/translation ownership remains open. |
| P3-U05-F3 | Extreme seed returns188.23V rather than45V for identical translated parameters, with huge nonzero implicit current residual | Confirmed solver-convergence defect. Replacement/adoption/reliability claims STOPPED pending bounded root/residual/error contract and independent fixtures. No tolerance widened. |
| P3-U05-F4 | MPP is80interval sampled, Isc scalar approximate | Independent exact-versus-sampled metrics retained, not hidden within broad accuracy tolerance. |
| P3-U05-F5 | vt comment described a per-cell thermal voltage, but value is aggregate Ns*kT/q | Comment corrected; numeric/schema semantics unchanged; n*vt maps to nNsVth. |
| P3-U05-F6 | UI claimed bypass-diode simulation although toggle only distorts plotted points | Bilingual UI/help corrected and browser KPI-invariance assertion added. No bypass model introduced. |

## First-slice next-step record (historical; kernel continuation above)

Prioritize a versioned explicit-reference parameter contract plus bounded solver/convergence result, then a separately assessed datasheet fit with residuals and coefficient constraints. Preserve deprecated summary-input behavior through an explicit adapter rather than silently replacing every caller. Require exact-expression evidence and actual calibration/UI/API/report consumers before adoption. Invalid/custom input domains and historical extraction cannot be declared validated by the48case specialization.

Other Phase3 packages U07b/U08/U17/U11b/U15/U19/U09c/U16c/U20 have not been completed by this slice. Phase2 annual/API reconciliation, manufacturer applicability and broader financial/policy gaps retain their previous dispositions. No new commit/push requested or performed.

References: `PHASE-3-PLAN.md`, ADR-024, `phase3-single-diode-evidence-card.md`, `phase3-single-diode-comparison.json` and `docs/guides/single-diode-validation.md`.
