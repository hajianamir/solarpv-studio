# ADR-027 — Retire invalid Student-t execution without reinterpreting archives

Date: 2026-11-03
Status: accepted containment; U20 overall remains partial. No corrected Student-t model adopted.

## Context and evidence

Phase3 primary-source research established that the legacy sampler scales Gaussian latents by a chi-square variate but applies the normal CDF to those t latents. The resulting marginals are not uniform, so heavy latent tails alone never validated the copula. See `PHASE-3-DEEP-RESEARCH.md`, its source-hashed SciPy CDF witnesses and source manifest. Gaussian Spearman calibration cannot be assumed calibrated for a t-copula either.

The production entry remained callable after the convergence diagnostic began rejecting it. Replacing the transform alone would silently alter financial distributions and invalidate historical replay. A valid replacement still requires calibrated dependence/df policy, independent tests and explicit versions; it is not in scope here.

## Decision

- Introduce execution policy `gaussian-only-retired-student-t-v2` in `contracts/financialUqExecutionPolicy.ts`.
- Reject Student-t explicitly at the public sampler, therefore also the public financial engine and actual Worker. No silent Gaussian substitution. Preserve the existing Archimedean not-implemented guard. Unknown runtime family names reject as unsupported.
- Preflight the runner before Worker allocation and reject unsupported reply families even if other transport fields appear valid.
- Keep Gaussian arithmetic, random streams, quantile ordering, LCOE legacy mapping and financial pricing exactly unchanged. No new empirical interval, additive variance or N=100 claim.
- Export **archive v2**, persisting execution policy. Strictly require Gaussian request/result family and validate existing hashes/limits. No archive migration in place.
- Read valid archive v1 with its original result and hashes intact. All v1 archives are **inspection-only** in this engine, including Gaussian and hypothetical source-matching v1 files. This deliberate compatibility restriction avoids treating the old format as acceptance under a new execution policy. Historical executable replay requires a separately controlled historical environment; it is not offered by this app.
- Permit v2 replay only under the current supported policy and exact source identity. Unknown schema/policy/family rejects rather than downgrades. Replay remains comparison-only: no project, energy or finance adoption.

The dormant historical t branch stays in source for traceability; the guard makes it unreachable. This does not count as continued support. Numerical AST identities are unchanged, but reachable supported behavior intentionally changes.

## Tests and evidence classification

`generate-retired-uq-archive.ts` actually executes the engine and archive code from base `16d3ff4056b528c2d9a5215a5e44703e58b49db7`, preserving source hashes and generating a genuine legacy t snapshot plus Gaussian result hashes in all three modes. Clock metadata is normalized only for fixture reproducibility. These are **internal historical regressions**, not independent scientific reference outputs or actual customer archives.

`test:uq:retirement` checks read-only historical integrity, explicit v2 policy, exact three-mode Gaussian baseline hashes, direct sampler/engine refusal, pre-allocation runner refusal, tamper/unknown policy rejection and bilingual rendering. Actual Worker tests bypass the runner and require generic failure for t; plausible t replies are rejected. Actual production Chromium E2E imports a genuine legacy t snapshot and a source-matching v1 Gaussian snapshot, disables replay and preserves no-adoption behavior; current v2 replay must still reproduce. Existing privacy, size, duplicate-key, cancellation, stale-context and offline tests remain applicable.

The benchmark's former Student-vs-Gaussian latent-kurtosis test is replaced with explicit retirement refusal. It was not a uniform-marginal test and must not be kept as a passing scientific claim for an unavailable model. Independent CDF defect evidence remains in the research fixtures; no tolerances or numerical reference guards are weakened.

## Compatibility, rollout and rollback

This is an intentional public behavior restriction: callers selecting Student-t get an error; valid old archives remain inspectable but cannot run here. Default UI is already Gaussian, so ordinary results retain exact deterministic identity. New v2 exports are not readable by old v1-only readers; retain original v1 files and do not overwrite them. Source digests invalidate replay across incompatible builds.

`VITE_FINANCIAL_UQ_WORKER=false` remains the supported operational disable switch and never enables synchronous fallback. Safe rollback disables new execution/export/replay while retaining read-only historical files; do not remove the retirement guard or restore invalid t execution. No saved-project schema changes, HTTP endpoints, financial-adoption paths or manufacturer values are introduced.

## Remaining gates

U20 still lacks calibrated scenario/empirical interval coverage and conditional sensitivity evidence; full Phase3/Phase2/release remain incomplete/blocked. This fixes an execution-policy defect, not the t-copula numerical method, model bankability or field uncertainty calibration.
