# SolarPV Studio v1.0.3

**Release date:** In development (audit in progress)

RFC3 reports/compliance correctness audit. No physics engine changes.

## Highlights

- **R1**: Section A Provenance now reflects the actual project city coordinates rather than hardcoded Tehran.
- **R2**: Dual-panel Climate API view showing both parsed `ClimateCity` and raw `ClimateResourceData` provider response with metadata trace ID.
- **R3**: Removed dead `AdvancedFeaturesModal.tsx` (all features accessible via RFC3ReportsTab).
- **R4**: In-browser Core Unit Tests runner tab surfacing the 140-test suite with detailed pass/fail breakdown.
- **R9 / R10 / R14**: Real internet mode badge on Climate tab, confidence fallback handling, and live API error handling.

---

# SolarPV Studio v1.0.2

**Release date:** 2026-11-04

Structural/foundation audit hotfix on top of v1.0.1.

## Highlights

- **STRUCT-1**: unified ASCE 7-22 wind pressure across structural and foundation engines (shared `calculateWindPressureQz`; was 13.5% divergent).
- **STRUCT-2**: derived overturning moment arm + new pile uplift capacity check (beta/alpha method); `isStructurallySafe` is foundation-type-aware.
- **STRUCT-3**: Broms clay uses FHWA-NHI-16-009 §10.4.4 iterative form.
- **STRUCT-4**: `fosSlidingApplicable` flag — sliding FoS shown only for ballasted blocks.

- **STRUCT-5/6/7**: Ke elevation factor, unified uplift-per-post across engines (parity ratio 1.016), and wind downforce included in foundation compression (parity 0.994). Small numerical shifts (qz -4.2% at 1190 m; foundation uplift/compression now match structural). No safety verdicts flip.
- **STRUCT-8**: southern-hemisphere shading fix — Sydney-type sites now get physically valid min-pitch values (3.56 m → 7.57 m); northern sites unchanged.
- **STRUCT-9**: snow-load `Ce·Ct·Is = 1.0` assumptions documented; the missing 0.7 roof factor is flagged for v1.1.0 differentiation between ground-mount and rooftop systems.

### Behavior changes

- Many pile-based designs at high wind are now correctly flagged as uplift-undersized (FoS_uplift < 2.0). This is a real safety margin previously invisible, not a regression. Re-verify foundation depth/pile count.

---

# SolarPV Studio v1.0.1

**Release date:** 2026-11-03

Hotfix release on top of v1.0.0.

## Highlights

- **ENG-1 (critical)**: solar azimuth in `calculateSolarPosition` was 180° inverted between morning and afternoon (Tehran summer 09:00 returned 265.9° instead of 94.9°). Fixed; affects `POST /api/v1/solar/position`.
- **ENG-2 (high)**: off-grid battery autonomy sizing used nighttime-only load, undersizing the BESS ~2× (20 kWh/day × 2 days now correctly sizes to ~52.8 kWh gross, was ~24.8 kWh). On-grid outage scaling fixed (`outageHours/24` → `outageHours/12`).

- **ENG-3**: corrected non-monotonic inverter clipping loss at DC/AC ratio = 1.3 (continuous and monotone now; small yield shift for arrays with DC/AC > 1.3 - correctness fix, not a regression).
- **ENG-4**: hot-case string sizing now uses the Pmp temperature coefficient (IEC 62548 §7.2), correcting a 1-module under-sizing in some hot climates.

- **ENG-5**: full Perez 1990 8-bin diffuse model (was 3-bin; dropped zenith-angle terms). Affects only the `/api/v1/solar/poa` endpoint.
- **ENG-7**: tracker transposition gain now uses a latitude-derived fixed-tilt baseline (was hardcoded 30°). Affects reported tracker gain for sites far from 34°N/S (Singapore: 42% -> 29%; Berlin: 20% -> 23%); Tehran unchanged (~24%). Fixed-tilt baseline (16.8%) unchanged.

### Known limitations (v1.0.1)

- **Sun-path absolute GHI scale**: `buildClearSkySunPath` produces a representative 288-hour path whose `poa_fixed / GHI` ratio is ~1.045, below the ~1.18 physical expectation for a properly-tilted array at mid-latitudes. The `× 1.168` anchor in `computeWaterfallLosses` compensates for this in the waterfall math, but any direct use of `buildClearSkySunPath` without the anchor would under-report POA. Tracked for v1.1.0: replace the representative path with a fuller clear-sky model or recalibrate.

## Breaking changes

None. Both fixes are pure correctness repairs; no public signature changed except the internal parameter rename in `sizeBatteryBank`.

## Verification

- `npm run lint` → EXIT=0 · `npm test` → 119/119 · `npm run build` → success · `npm run test:smoke` → 5/5

---

# SolarPV Studio v1.0.0

**Release date:** 2026-11-03

The first stable release of SolarPV Studio — a cross-platform web PV
engineering platform spanning site assessment, array and electrical
design, structural and geotechnical analysis, tracked yield simulation,
EPC financial modeling, and formal reporting.

## Highlights of this release

- **22 engineering and robustness fixes** across the browser runtime,
  financial engine, string sizing, catalog consistency, error handling,
  and CI. See CHANGELOG.md for the full list.
- **Full TypeScript `strict: true`** — the entire codebase (`src/`,
  `server.ts`) now type-checks under TypeScript's strictest mode. Zero
  `@ts-nocheck` remain; production-code `as any` count is zero.
- **Reproducible builds** — `npm ci && npm run build` produces a
  byte-identical `dist/` bundle across two independent clean installs
  (sha256-verified, part of this release's acceptance gates).
- **Self-audited** — `docs/evidence/post-strict-audit.md` records a
  post-migration audit covering non-null assertions, `as unknown as`
  escapes, `noUnusedLocals` measurement (0 errors), a security grep pass,
  and evidence-file freshness. Verdict: READY for v1.0.0.

## Breaking changes

None. v1.0.0 is a stabilization release of the pre-existing 1.0.0
development line. No public API, exported interface, or build
configuration was changed in a backward-incompatible way.

## Dependencies

No dependency changes. `package-lock.json` is unchanged.

## What's next

Post-1.0.0 work is tracked under the deferred items in
`docs/evidence/post-strict-audit.md` (typing cleanups, `noUnusedLocals`
enablement, JSON.parse validation hardening). None are correctness
defects; all are cosmetic or defensive hardening.

## Verification

The tagged commit passes:

- `npm run lint` → EXIT=0
- `npm test` → 117/117
- `npm run build` → success
- `npm run test:smoke` → 5/5
- Reproducibility check → identical `dist/` hash across two `npm ci` runs

Full details in `docs/evidence/` and `docs/evidence/post-strict-audit.md`.

## Full changelog

See [CHANGELOG.md](./CHANGELOG.md).
