# ADR-026: production UQ convergence diagnostic, not an acceptance certificate

Date: 2026-11-03
Status: accepted for opt-in diagnostic only; U20 remains incomplete.

## Decision

Add `financialUqConvergence` in the studies layer. Run the unchanged production financial engine at 2–4 ascending budgets (20–2000 trials) and 3–8 unique unsigned integer seeds. Preserve per-run deterministic hashes and ascending CDF10/50/90 energy, NPV and LCOE. Summarize observed min/max and range across seeds. Validate engine results using the existing transport contract. Reject invalid designs and unsupported copulas rather than substitute a model.

The wrapper is a synchronous offline/test diagnostic, deliberately not imported into UI, HTTP, workers or annual-energy adoption. Production calculation and persistence are unchanged. Rollback: do not invoke the new API; no existing consumer or saved schema needs migration. Any later UI route requires bounded asynchronous execution and separate integration tests.

## Scientific stop

Inspection found that `sampleBivariateCopula` scales Gaussian latents by a chi-square variate for the Student-t option, then applies the normal CDF to both families. This is not the required Student-t marginal probability integral transform. Further, the Gaussian Spearman-to-latent mapping cannot be assumed calibrated for t dependence. This diagnostic therefore rejects all non-Gaussian families. Existing legacy Student-t behavior is NOT repaired or validated by this addition; its financial qualification remains an open consequential defect. No silent replacement or archive reinterpretation is permitted.

Selected-seed extrema are descriptive, not confidence or tolerance intervals. IID binomial/order-statistic intervals do not apply automatically to the production mixed LHS/copula sampler. N=100 is not guaranteed; monotonic improvement with budget is neither assumed nor asserted. Inputs are illustrative, not field-calibrated distributions. Exploratory squared-correlation rankings are not additive variance attribution.

## Acceptance and evidence

`npm run test:uq:convergence` exercises zero latent-correlation and correlated Gaussian scenarios, budgets 20/100/400, seeds 7/42/1337, exact repeated replay, unchanged input, direct production result hashes, explicit legacy LCOE reversal, independently sorted extrema and fail-closed malformed designs/families. These are implementation/regression checks against the existing engine, not an independent scientific oracle for that engine. Existing worker and archive tests separately cover actual worker parity and archived exact replay. No new physical accuracy tolerance or external source claim is introduced.

U20 completion still requires a scientifically supported correlated sampler policy, independently justified empirical interval assumptions and applicable calibration, plus integrated persisted diagnostic replay if a public consumer is introduced. Other Phase3 packages remain governed by their own unresolved evidence gates.
