# ADR-007: Foundation Recommendation Shared Module (`src/engine/geotech/foundationRecommendation.ts`)

## 1. Status

**Accepted** (PR-2a-6-REPAIR-FINAL-COMPLETE — P2-2)

## 2. Context & Problem Statement

Foundation recommendation logic (multi-criteria scoring of rammed steel pile / concrete pier / ground screw / ballasted block, plus Broms (1964) lateral pile sizing with frost-depth constraint) previously existed in two places:

1. `src/engine/structureRecommendationEngine.ts` — `recommendFoundation()` (used by `StructuralFoundationTab.tsx` UI).
2. A duplicated local copy inside `structureRecommendationEngine.ts` (`calculateBromsPileSizing`) — and implicitly re-implemented ad-hoc in test code.

This duplication created a correctness risk: the test suite and the UI could compute different embedment depths for the same site (`test_depth ≠ ui_depth`), invalidating any cross-check between automated tests and field-facing recommendations (Ambiguity A: all inputs must come from the caller — no hard-coded defaults).

## 3. Decision

Extract the foundation recommendation into a single shared module:

**`src/engine/geotech/foundationRecommendation.ts`** — single source of truth containing:
- `scoreFoundationOptions(input)` — multi-criteria suitability scoring (0–100) for the four typologies, identical criteria for test and UI.
- `recommendSharedFoundation(input, traceId?)` — core recommendation: ASCE 7-22 wind/snow loads, Broms lateral sizing (cohesive + cohesionless Broms short-pile methods), frost-depth constraint (`L ≥ d_frost + 1.0 m`), profile selection (W6x9 / W6x12 / C150x50x2.5), trace ID (`TRC-FND-*`).
- `calculateBromsPileSizing` — encapsulated locally (no duplicate implementations).

Consumers (both delegate through `recommendFoundation` in `structureRecommendationEngine.ts`):
- `src/engine/core/benchmarks/unitTestsCore.ts` — §13.9 5-climate foundation integration test + §13.9b depth-equality test.
- `src/components/StructuralFoundationTab.tsx` — UI recommendation + 6-section engineering report.

Both code paths now call the same functions, guaranteeing `test_depth === ui_depth` for every site.

## 4. Consequences & Benefits

- **Test/UI parity**: §13.9b asserts embedment-depth equality across Boulder, Phoenix, Munich, Singapore, Tehran — locked in CI via `npm test`.
- **No hard-coded defaults**: every geotechnical/climatic input is required by the caller (API-only architecture per ADR-005).
- **Broms logic lives in exactly one place** (shared module; previously duplicated in `structureRecommendationEngine.ts` — duplicate removed).
- Trace IDs propagate from shared output into `FoundationRecommendationResult.traceId` for evidence capture.

## 5. Verification

- §13.9 Multi-Scenario 5-Climate Foundation Recommendations — PASS (all 5 sites FoS-safe, embedment ≥ frost + 1.0 m).
- §13.9b P2-2 Shared Module Depth Equality (test_depth === ui_depth, 5 sites) — PASS:
  - Boulder 1.90 m, Phoenix 1.50 m, Munich 1.80 m, Singapore 1.00 m, Tehran 1.80 m.
- `npm run lint`: zero new TypeScript errors (only pre-existing `projectMigration.ts` error on base commit).
- `npm test`: all 72 unit tests pass.
