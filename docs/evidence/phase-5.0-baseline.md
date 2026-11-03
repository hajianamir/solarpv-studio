# Phase 5.0 — Strict-Mode Baseline Report

Measured on branch `arena/aa3988a2-solarpv-studio` at `ac422a4` (post Phase 4).
Method: per-flag `tsc --noEmit` runs via `npm run lint` with only that flag flipped.

## Umbrella measurement

- `strict: true` total errors:  5
- Total files affected:        2
  - `src/engine/dataGateway/climateDataProvider.ts` — 4 (TS18046, unknown catch vars)
  - `src/components/OfficialReportModal.tsx` — 1 (TS2322, strictNullChecks array covariance)

## Per-flag breakdown

| Flag                          | Errors | % of umbrella | Phase |
|-------------------------------|--------|---------------|-------|
| alwaysStrict                  |   0    |     0%        | 5.1   |
| noImplicitThis                |   0    |     0%        | 5.1   |
| strictBindCallApply           |   0    |     0%        | 5.1   |
| strictFunctionTypes           |   0    |     0%        | 5.1   |
| useUnknownInCatchVariables    |   4    |    80%        | 5.1   |
| noImplicitAny                 |   1    |    20%        | 5.2   |
| strictNullChecks (alone)      |   1    |    20%        | 5.3   |
| strictNullChecks + SPI        |   1    |    20%        | 5.3   |

(Note: per-flag counts overlap; umbrella total is 5 unique errors, not the sum.)

## Phase 5.1 safe-flags sum

- Sum of individual 5.1 flags: 4
- S_combined (all five enabled together): **4** — all in
  `src/engine/dataGateway/climateDataProvider.ts` (`.message` on `unknown` catch vars)

## Top files by residual error count (5.2 + 5.3 candidates)

1. `src/engine/dataGateway/climateDataProvider.ts` — 4 (fixed in 5.1)
2. `src/components/OfficialReportModal.tsx` — 1 (strictNullChecks, deferred to 5.3)

## Gate decision

- S_combined = 4 <= 150 → **PHASE 5.1 PROCEEDS**

## Recommendation for 5.2 / 5.3

- `noImplicitAny`: 1 error — trivially tractable in a single phase.
- `strictNullChecks` + SPI: 1 error alone — tractable in a single phase;
  no per-directory split needed at this baseline.
