# SolarPV Studio v3.0 - Documentation Status & Model Compliance

**Updated:** 2026-11-02T11:13:29.245Z
**Release Phase:** RFC 3.0 / PR-2a-6
**Audit Verification:** Automated via `npm run sync-docs`

## Synchronized Architectural Decisions
1. **ADR-001**: 2.5D View-Factor Bifacial SAM Alignment (SAM 2023.12.17 10.40% vs 10.51% gain, 1.06% error).
2. **ADR-002**: Hottel Clear-Sky Beam Irradiance & Atmospheric Attenuation Model.
3. **ADR-003**: Environmental Soiling & Snow Shedding Mechanics (Kimber 2006, Marion 2013).
4. **ADR-004**: Rejection of Google Maps Platform Due to Commercial Licensing Cost & Full Free Stack Adoption (Leaflet, OSM, Esri, OpenTopoMap, Nominatim, Overpass API, NASA POWER, PVGIS, SoilGrids 2.0).
5. **ADR-005**: Removal of Static Climate Hubs & Pure API-Driven Geospatial Architecture.

## Geotechnical & Engineering Cross-Tab Propagation Status
- **Climate ➔ Inverter:** Ambient $T_{max} > 45^\circ\text{C}$ ($1.5\%/^\circ\text{C}$) & Elevation $> 2000\text{m}$ ($1.0\%/100\text{m}$ per IEC 62109-1) derating verified.
- **Geotechnical ➔ Structural:** ASCE 7-22 wind pressure $q_z$, ground snow load $S_k$, Broms lateral pile sizing ($L \ge d_{frost} + 1.0\text{ m}$, $FoS \ge 1.5$) verified.
- **Cross-Tab ➔ Financial:** Mode-aware financial analysis (OffGrid vs OnGrid vs Powerplant), LCOE decomposition, and zero-substation off-grid accounting verified.
