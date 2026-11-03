# SolarPV Studio v3.0 - Documentation Status & Model Compliance

**Updated:** 2026-11-03T13:54:45.157Z
**Release Phase:** RFC 3.0 / PR-2a-6
**Audit Verification:** Automated via `npm run sync-docs`
**ADR Count:** 10

## Architecture Decision Records (derived from source)

- **ADR-001** (Accepted & Extended): Computational Strategy for Sub-Hourly & Probabilistic Monte Carlo Modeling  
  _file: `docs/adr/ADR-001-computational-load-strategy.md` (126 lines, 7862 bytes)_
- **ADR-002** (Accepted): Specification & Definition of the 2.5D Bifacial Irradiance Model  
  _file: `docs/adr/ADR-002-bifacial-2.5d-view-factor-definition.md` (110 lines, 8023 bytes)_
- **ADR-003** (Accepted): Specification for 15-Minute Slope-Aware Backtracking Single-Axis Tracker  
  _file: `docs/adr/ADR-003-backtracking-slope-aware-strategy.md` (56 lines, 3541 bytes)_
- **ADR-004** (Unknown): Rejection of Google Maps/Solar Platform Due to Licensing Cost & Adoption of Global Open Geospatial and Scientific Data Stack  
  _file: `docs/adr/ADR-004-google-maps-solar-integration.md` (74 lines, 6397 bytes)_
- **ADR-005** (Unknown): Removal of Climate Hubs — Pure API-Driven Architecture  
  _file: `docs/adr/ADR-005-removal-of-climate-hubs-api-only-architecture.md` (39 lines, 3804 bytes)_
- **ADR-006** (Unknown): Salt Corrosion & Coastal Salinity Engine (ISO 9223 C1–C5)  
  _file: `docs/adr/ADR-006-salt-corrosion-iso-9223.md` (56 lines, 4083 bytes)_
- **ADR-007** (Unknown): Foundation Recommendation Shared Module (`src/engine/geotech/foundationRecommendation.ts`)  
  _file: `docs/adr/ADR-007-foundation-shared-module.md` (45 lines, 3187 bytes)_
- **ADR-008** (Unknown): UI/UX Design System  
  _file: `docs/adr/ADR-008-ui-ux-design-system.md` (69 lines, 3060 bytes)_
- **ADR-009** (Unknown): Mobile / Tablet Responsive Strategy  
  _file: `docs/adr/ADR-009-mobile-tablet-responsive.md` (63 lines, 2344 bytes)_
- **ADR-010** (Unknown): Tracker Backtracking Engine & pvlib Cross-Validation Fixtures  
  _file: `docs/adr/ADR-010-tracker-fixtures.md` (37 lines, 2059 bytes)_

## Geotechnical & Engineering Cross-Tab Propagation Status
- **Climate ➔ Inverter:** Ambient T_max > 45°C (1.5%/°C) & Elevation > 2000m
  (1.0%/100m per IEC 62109-1) derating verified.
- **Geotechnical ➔ Structural:** ASCE 7-22 wind pressure q_z, ground snow
  load S_k, Broms lateral pile sizing (L ≥ d_frost + 1.0 m, FoS ≥ 1.5) verified.
- **Cross-Tab ➔ Financial:** Mode-aware financial analysis (OffGrid vs OnGrid
  vs Powerplant), LCOE decomposition, and zero-substation off-grid accounting
  verified.
