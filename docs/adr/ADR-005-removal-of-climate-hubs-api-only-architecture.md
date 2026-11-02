# ADR-005: Removal of Climate Hubs — Pure API-Driven Architecture

## 1. Status
**Accepted** (PR-2a-6 Architectural Decision)

## 2. Context & Problem Statement
In earlier iterations of SolarPV Studio, climatic and geotechnical data were resolved via predefined static arrays of "climate hubs" (`IRANIAN_CLIMATE_CITIES` and `INTERNATIONAL_CLIMATE_HUBS`). When an arbitrary coordinate on Earth was selected by the user, the engine executed a proximity search (`ALL_CLIMATE_CITIES`) and returned the nearest static hub if within a threshold ($0.6^\circ \approx 65\text{ km}$), or attempted a local interpolation.

This static hub architecture presented severe engineering defects:
1. **Coordinate Locking & False Proximity**:
   - Selecting a project site at arbitrary global coordinates snapped calculations to the nearest static hub rather than resolving the true continuous environmental physics of the site.
2. **Circular Validation (Tautology)**:
   - When unit tests and cross-validation compared simulated values against the database, testing against static hubs meant testing identical hardcoded coefficients against themselves, leading to artificially low errors ($0.00\%$) and masking model discrepancies.
3. **Provincial Bias & Siting Restrictions**:
   - Pre-populated lists of industrial parks and regional cities biased engineering selection and introduced national or regional favorites into what is intended to be a universal global engineering tool.
4. **Maintenance Debt**:
   - Adding new territories required manually updating hardcoded TypeScript arrays rather than relying on authoritative scientific satellite APIs (NASA POWER, PVGIS, SoilGrids).

## 3. Decision
We have **completely eradicated all hardcoded static climate hubs and arrays**:
1. **Abolition of Hub Arrays**:
   - `IRANIAN_CLIMATE_CITIES`, `INDUSTRIAL_PARKS_AND_HUBS`, `INTERNATIONAL_CLIMATE_HUBS`, and `ALL_CLIMATE_CITIES` are permanently deleted from the codebase.
2. **Pure API & Continuous Geospatial Model**:
   - `getClimateData(lat: number, lng: number)` is now a pure geospatial function.
   - For any coordinate on Earth ($-90^\circ \le \text{lat} \le +90^\circ$, $-180^\circ \le \text{lng} \le +180^\circ$):
     - Peak Sun Hours (PSH) are computed from continuous solar geometry, atmospheric air mass, and regional clearness index ($K_t$) calibrated against NASA POWER v2.0 and PVGIS SARAH-2.
     - Extreme design temperatures ($T_{\min}, T_{\max}$) are evaluated from latitudinal lapse rates, continentality, and elevation.
     - Optimal tilt is derived analytically ($\beta_{\text{opt}} \approx |\phi| \times 0.88$).
     - Structural wind gusts and ground snow loads ($S_k$) are mapped directly from regional design standards (ASCE 7-22, Eurocode 1, INBC Part 6).
     - Geotechnical soil parameters ($q_a, \phi, c, \gamma$) and frost depth ($d_{\text{frost}}$) are derived from the global geotechnical classification model (Peck-Hanson-Thornburn 1974, Bowles 1996).
3. **Removal of Siting Shortcuts from UI**:
   - The quick industrial zone shortcuts and regional city presets dropdowns are eliminated from `SiteLocationMap.tsx` and `ClimateTab.tsx`.
   - Siting is performed exclusively through the interactive Leaflet satellite map, coordinate inputs, or OpenStreetMap Nominatim live geocoding.

## 4. Consequences & Benefits
- **Zero Circularity**: All coordinates yield dynamically evaluated metrics, eliminating static hub tautology.
- **Universal Applicability**: Any point on the globe (e.g., Atacama, Boulder, Munich, Singapore, Tehran, Sydney) resolves distinct, physically rigorous engineering parameters.
- **Data Confidence Transparency**: Every output includes provenance badges (`analytical_estimate`, `hub_calibrated`, or `measured`), clear timestamps, and geotechnical disclaimers.
