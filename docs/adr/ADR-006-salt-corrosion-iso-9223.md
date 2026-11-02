# ADR-006: Salt Corrosion & Coastal Salinity Engine (ISO 9223 C1–C5)

## 1. Status

**Accepted** (PR-2a-6-REPAIR-FINAL-COMPLETE — P2-4)

## 2. Context & Problem Statement

Solar PV plants in saline / coastal environments suffer accelerated corrosion of mounting structures, inverter enclosures, and module frames, plus measurable yield derating from salt aerosol deposition. SolarPV Studio previously had no corrosion model: foundation selection, inverter derating, and OPEX financials ignored shoreline proximity entirely, which understates lifecycle cost for coastal projects (e.g., Bushehr, Iran on the Persian Gulf; Mumbai; Miami; Alexandria).

Per ADR-005 (API-only architecture), no static hardcoded coastal database may be embedded in production code. The shoreline distance must be resolved from live sources (OSM Nominatim reverse geocode or Copernicus Marine shoreline distance) or supplied explicitly by the engineer.

## 3. Decision

A new engine `src/engine/corrosion/saltCorrosionEngine.ts` implements ISO 9223:1992 atmospheric corrosivity categorization C1–C5 driven by distance-to-sea:

| Distance to Sea | ISO 9223 Category | Corrosivity |
|-----------------|-------------------|-------------|
| > 50 km         | C1                | Very low    |
| 10–50 km        | C2                | Low         |
| 3–10 km         | C3                | Moderate    |
| 1–3 km          | C4                | High        |
| < 1 km          | C5                | Very high (marine, C5-M) |

Each category carries documented engineering derating assumptions (maintained in ADR-006, revisable by the responsible civil engineer):

| Category | Module Derate | Inverter Derate | Structure Derate | Maintenance OPEX Adder |
|----------|---------------|-----------------|------------------|------------------------|
| C1       | 0.0%          | 0.0%            | 0.0%             | 0.0%                   |
| C2       | 0.3%          | 0.2%            | 0.0%             | +2.0%                  |
| C3       | 0.7%          | 0.5%            | +0.3%            | +5.0%                  |
| C4       | 1.2%          | 0.8%            | +0.8%            | +10.0%                 |
| C5       | 2.0%          | 1.5%            | +1.5%            | +15.0%                 |

The module exports:
- `classifyCorrosionCategory(distanceToSeaKm): 'C1'|'C2'|'C3'|'C4'|'C5'` — pure, deterministic, unit-testable.
- `assessSaltCorrosion(input): Promise<SaltCorrosionOutput>` — resolves distance via OSM Nominatim reverse geocode (`ExternalDataGateway.climateProvider.forwardGeocodeNominatim`) when omitted, otherwise uses the supplied `distanceToSeaKm` (no hard-coded defaults — throws if missing and offline).
- Every output carries `traceId` (`TRC-COR-*`) and `source` (`osm_nominatim` | `user_entry`) per the traceability requirement (every API/logged decision carries a trace_id).

### Acceptance anchor (Bushehr)

Bushehr, Iran (28.92°N, 50.83°E) lies on the Persian Gulf shoreline: `distanceToSeaKm = 0` → ISO 9223 **C5** (very high, marine). Locked by unit test `P2-4 ISO 9223 Salt Corrosion Classification (Bushehr = C5)` in `scripts/run-all-benchmarks.ts` → `unitTestsCore.ts` §13.9c.

## 4. Consequences & Benefits

- **Coastal projects are no longer silently under-designed**: C5 sites trigger marine-grade coating, stainless fasteners, sealed enclosures, and 6-month inspection guidance in the Structural Foundation Tab and salinity derating in the Financial Tab (inverter + module yield impact).
- **No circularity**: categories derive from measured/resolved shoreline distance, not from the outputs they derate.
- **Offline-safe**: when Nominatim is unreachable and no distance is supplied, the engine throws an explicit error rather than inventing data.

## 5. Verification

- Unit test: `classifyCorrosionCategory(0.5) === 'C5'`, `(5.0) === 'C3'`, `(100.0) === 'C1'`.
- Unit test: `assessSaltCorrosion({28.92, 50.83, distanceToSeaKm: 0})` → `C5`, traceId `TRC-COR-*`.
- `npm run lint` (tsc --noEmit): zero new errors.
- `npm test`: all benchmarks pass.
