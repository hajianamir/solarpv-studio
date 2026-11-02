# P0-3 Evidence Capture — PR-2a-6 Phase 2 (fix/pr-2a-6-repair-final-complete)

Captured 2026-11-03. Branch: `fix/pr-2a-6-repair-final-complete`. No self-merge; PR opened for tagged reviewers.

## 1. Test Suite — `npm test`

File: `docs/evidence/test-output.txt`

**Result: ALL 72 UNIT TESTS PASSED, 0 FAILED.** (Previously 11 benchmarks; now 72 with P2-2 depth-equality and P2-4 salt-corrosion assertions.)

Key assertions:
- Cross-Validation: 5 cross_validation + 6 implementation_verification metrics; Table 3a PASS/FAIL gates; max relative discrepancy below tolerance (SANDIA-02 Pmp 410.30 W vs CEC 410.20 W → 0.02%).
- Fine Transition Sweep 10°–15°: monotonic decrease, 6 points, no cliff artifacts (§13.8).
- BIPV/T aperture/gross area ratio: 1.72/2.00 = 0.860 (static geometry fields, §2c).
- §13.9 Multi-Scenario 5-Climate Foundation Recommendations (Boulder, Phoenix, Munich, Singapore, Tehran): all FoS-safe, embedment ≥ frost depth + 1.0 m.
- §13.9b **P2-2 Shared Module Depth Equality (test_depth === ui_depth)**:
  - Boulder 1.90 m, Phoenix 1.50 m, Munich 1.80 m, Singapore 1.00 m, Tehran 1.80 m — identical between `coreSuiteVerification.ts` (via `structureRecommendationEngine.ts`) and `StructuralFoundationTab.tsx` because both delegate to `src/engine/geotech/foundationRecommendation.ts`.
- §13.9c **P2-4 ISO 9223 Salt Corrosion (Bushehr = C5)**: Bushehr (28.92, 50.83, 0 km) → C5; Tehran inland (60 km) → C1; bands 0.5 km → C5, 5 km → C3, 100 km → C1; traceId `TRC-COR-*`.

## 2. Coverage — `npm run test:coverage`

File: `docs/evidence/coverage-output.txt` (c8, include `src/engine/core/**`)

| File bundle | Statements | Branch | Functions | Lines |
|-------------|------------|--------|-----------|-------|
| All files   | 98.96%     | **86.05%** | 100% | 98.96% |
| `core` (aggregate) | 98.62% | **88.69%** | 100% | 98.62% |

**Coverage gate: `core` branch coverage = 88.69% ≥ 88.5% required.** ✅

Residual uncovered branches are defensive singularity guards in `prng.ts` (Gumbel/Weibull boundary loops that statistically never trigger with a fixed seed) and migration/validation branches in `projectMigration.ts` — by design unreachable in normal operation.

## 3. Build — `npm run build`

File: `docs/evidence/build-output.txt`

**Result: build OK** — `dist/assets/index-BosdQsMs.js` (1,568 kB → gzip 418 kB), CSS 41 kB → 7.7 kB gzip. Zero TypeScript errors except the pre-existing `projectMigration.ts(436)` base-commit issue (documented as out of scope).

## 4. LCOE 3-Mode Table — `scripts/financial-verify.ts`

File: `docs/evidence/lcoe-table.txt`

| Mode | LCOE ($/kWh) | Cost Served | Substation | Grid | HV Conn | Feed-In | Diesel Fuel | Diesel OPEX | Battery |
|------|-------------|-------------|------------|------|---------|---------|-------------|-------------|---------|
| Utility Powerplant (1 MW AC) | 0.0573 | 0.0538 | 40,250 | 27,600 | 45,000 | 46,667 | 0 | 0 | 0 |
| On-Grid with backup (1 MW AC) | 0.0994 | 0.0871 | 40,250 | 10,000 | 0 | 63,333 | 0 | 0 | 224,000 |
| Off-Grid standalone (1 MW + 2 MWh BESS) | 0.1000 | 0.0877 | **0** | **0** | 0 | **0** | 136 | 1,800 | 224,000 |

Assertions: 3 distinct LCOE values; Off-Grid substation=0, grid=0, feed-in revenue=0; off-grid includes battery replacement (>0), diesel fuel (>0), diesel OPEX (>0). **ALL PASSED.** (Ambiguity C: off-grid excludes grid connection cost, substation, feed-in revenue.)

## 5. FoundationEngine 5-Site Output — `scripts/structure-verify.ts`

File: `docs/evidence/foundation-5site.txt`

| Site | Inputs (wind/snow/bearing/phi/c/frost/tilt) | Primary | Embedment | FoS Lat | FoS Moment | Trace |
|------|---------------------------------------------|---------|-----------|---------|------------|-------|
| Tehran, IR (35.6892, 51.3890) | 130/50/220/32/15/35/31 | rammed_steel_pile | 1.95 m | 1.89 | 3.22 | TRC-STR-* |
| Boulder, CO (40.0150, -105.2705) | 130/60/220/32/15/45/35 | rammed_steel_pile | 2.05 m | 1.91 | 2.85 | TRC-STR-* |
| Munich, DE (48.1351, 11.5820) | 140/81/220/32/15/41/42 | rammed_steel_pile | 2.31 m | 1.87 | 2.02 | TRC-STR-* |
| Phoenix, AZ (33.4484, -112.0740) | 130/0/220/32/15/0/29 | rammed_steel_pile | 1.90 m | 1.89 | 3.45 | TRC-STR-* |
| Singapore (1.3521, 103.8198) | 120/0/160/24/35/0/8 | rammed_steel_pile | 1.00 m | 9.08 | 6.44 | TRC-STR-* |

All 5 sites: trace_id present, embedment ≥ frost + 1.0 m, FoS ≥ 1.5. Inputs vary across sites (wind: 3 distinct, snow: 4, frost: 4) → non-circular, per-coordinate variance proof.

## 6. Supporting Captures

- `docs/evidence/climate-api.txt` — 4-site climate API verification (Tehran/Munich/Phoenix/Berlin): trace_ids present, annualGHI spread >10%, confidence ≠ hub_calibrated, Berlin routes to PVGIS EMEA.
- `docs/evidence/grep-hubs.txt` — P0-2: zero production references to deleted hubs (`internationalHubs`, `IRANIAN_CLIMATE_CITIES`, `INDUSTRIAL_PARKS`, `ALL_CLIMATE_CITIES`, `HUB-SNOW-*`).
- `docs/evidence/real-http.txt` — P0-1: gateway `getComprehensiveSiteData` returns trace_id/timestamp/size/latency; `fetchClimateData` returns non-`hub_calibrated` confidence.

## 7. Pre-Existing Issue (Not Caused by This Branch)

`src/engine/core/projectMigration.ts(436)`: `dataRetrievalDate` required in target type but optional in `ClimateCity`. Exists on base commit `f5094e40`; explicitly left untouched per standing instruction.
