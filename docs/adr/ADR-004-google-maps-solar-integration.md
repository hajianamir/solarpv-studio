# ADR-004: Rejection of Google Maps/Solar Platform Due to Licensing Cost & Adoption of Global Open Geospatial and Scientific Data Stack

## 1. Status
**Accepted / Superceded Previous Draft** (PR-2a-6 Architectural Decision)

## 2. Context & Root Cause for Rejection of Google Maps Platform
In previous iterations, Google Maps Platform and Google Solar API were evaluated for satellite tile rendering, building rooftop edge detection, and solar irradiance modeling.

However, after architectural and commercial evaluation, **Google Maps and Google Solar API were definitively rejected for SolarPV Studio**, primarily due to:
1. **Commercial Licensing & Per-Request API Pricing**:
   - Google Solar API incurs steep commercial charges ($0.075 to $0.15+ per API request for Building Insights / Data Layers), making automated utility-scale scans and continuous client iterations prohibitively expensive.
   - Google Maps JavaScript API incurs high monthly raster and vector tile fees beyond very modest quotas, creating unnecessary vendor lock-in and running costs for open engineering tools and EPC contractors.
2. **Geographical Coverage Restrictions**:
   - Google Solar API provides data only for selected countries (US, Western Europe, Japan, parts of LatAm). Key global solar growth regions—including the Middle East, Central Asia, North Africa, and Southeast Asia—are completely omitted.
3. **Air-Gapped & Offline Engineering Requirements**:
   - Utility-scale solar engineering often requires operation in remote project offices or corporate air-gapped intranets where proprietary cloud billing keys cannot and should not be required.

## 3. Decision
We reject Google Maps Platform and Google Solar API in favor of an **entirely free, open-access, scientific-grade GIS and geotechnical stack**:

### Mapping & Geospatial GIS Stack (Zero-Cost, No API Key):
1. **Map Renderer**: **Leaflet.js** (lightweight, mobile-responsive, zero licensing fees).
2. **Satellite Orthophoto Layer**: **Esri World Imagery** (`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`).
3. **Topography & Terrain Slope Layer**: **OpenTopoMap** (`https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png`) for ground contour and slope analysis.
4. **Street & Reference Layer**: **OpenStreetMap Carto** (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`).
5. **Reverse Geocoding**: **OSM Nominatim API** (free, reverse geocoding to city/country with local client cache).
6. **Building Footprint & Rooftop Detection**: **OpenStreetMap Overpass API** (`https://overpass-api.de/api/interpreter`) querying `way["building"]` polygons as a 100% free alternative to Google Places and Google Solar rooftop geometries.

### Scientific Data Fallback Chain
For climate, solar irradiance, and weather parameters, the platform strictly enforces a three-tier fallback hierarchy:
$$\text{NASA POWER} \longrightarrow \text{PVGIS 5.3} \longrightarrow \text{Calibrated Analytical Physical Model}$$

1. **NASA POWER Climatology (Primary Global Provider)**:
   - Free REST API without API key (`https://power.larc.nasa.gov/api/temporal/climatology/point`).
   - Global coverage based on Goddard Earth Observing System (GEOS-5 FP-IT).
   - Data updated within ~2 months latency. Provides GHI, DNI, DHI, $T_{\text{max}}$, $T_{\text{min}}$, and 10m wind speed.
2. **PVGIS 5.3 (Europe, Africa, Middle East, Central Asia)**:
   - Free REST API from EU Joint Research Centre (`https://re.jrc.ec.europa.eu/api/v5_2/MRcalc`).
   - High-accuracy SARAH-2 and ERA5 reanalysis datasets.
3. **Calibrated Regional Analytical Physical Model (Air-gapped Fallback)**:
   - Evaluated instantly if external networks are unavailable or if the Circuit Breaker opens.
   - Computes solar geometry, atmospheric transmittance, and empirical extremes based on latitude and elevation.

### Geotechnical & Structural Hazard Providers
1. **Soil & Geotechnical**:
   - **ISRIC SoilGrids 2.0** (`https://rest.isric.org/soilgrids/v2.0/properties/query`) providing 250m resolution clay, sand, silt, and bulk density.
   - Mapped via empirical relations (Peck, Hanson & Thornburn 1974; Bowles 1996 5th ed.) to allowable bearing capacity $q_{\text{allow}}$, internal friction angle $\phi$, and cohesion $c$ with explicit uncertainty ranges ($\pm 15\%$, $\pm 3^\circ$) and geotechnical borehole disclaimers.
2. **Wind & Snow Hazards**:
   - ASCE 7-22, Eurocode 1 (EN 1991-1-4 / EN 1991-1-3), and INBC Part 6 mapped to local design codes.

## 4. Auditing, Provenance & Circuit Breaker
- All calculation outputs feature a unique provenance ID in the format:
  $$\text{TRC-GW-YYYYMMDD-XXXXXXXX}$$
- Circuit Breaker maintains a 30-second cooldown period, handles HTTP 429 rate-limiting with exponential backoff, and guarantees zero UI blocking upon network timeouts.

## 5. Consequences & Verification
- **Total Independence from Proprietary Fees**: 0$ API billing.
- **Global Coverage**: 100% of Earth coordinates ($-90^\circ$ to $+90^\circ$, $-180^\circ$ to $+180^\circ$) resolve valid engineering parameters.
- **Audit Compliance**: All data provenance, confidence levels (`measured`, `hub_calibrated`, `analytical_estimate`), and disclaimers are transparently displayed in the user interface.
