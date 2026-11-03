# Changelog

All notable changes to SolarPV Studio are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_(No unreleased changes as of v1.0.0.)_

## [1.0.2] - 2026-11-04

### Fixed

- **STRUCT-1**: unified wind pressure formula between structural and foundation engines (was 13.5% different for the same site; Tehran 130 km/h now 0.598 kN/m² in both via shared `calculateWindPressureQz`).
- **STRUCT-3**: Broms clay lateral capacity now uses the FHWA-NHI-16-009 §10.4.4 iterative form (was a non-standard `(2 + e/L)` denominator with no reference).
- **STRUCT-4**: `fosSlidingApplicable` flag added - the friction-based sliding FoS is now marked applicable only for ballasted blocks; the UI no longer shows it for pile/pier types (use the Broms FoS instead).

- **STRUCT-2 (correctness fix)**: wind overturning moment arm now derived from panel geometry (W/2 + h·sinβ) rather than h_mean·cosβ, and the safety suite gained a **pile uplift capacity check** (beta method for cohesionless, alpha for cohesive, per Eurocode 7 / FHWA-NHI-16-009), previously absent. `isStructurallySafe` is now foundation-type-aware: ballasted blocks verify overturning FoS ≥ 1.5, pile/pier/screw verify uplift FoS ≥ 2.0. **Behavior change**: many 28-module tables at 130 km/h wind are now correctly flagged as uplift-undersized (FoS_uplift ≈ 0.1–0.4). Re-verify foundation depth and pile count for existing pile-based designs.

## [1.0.1] - 2026-11-03

### Fixed

- **ENG-1 (critical)**: solar position azimuth returned 180° inverted in both the morning and afternoon branches. Tehran summer 09:00 returned 265.9° (should be 94.9°); afternoon returned the mirror. Affects the `POST /api/v1/solar/position` endpoint and any future internal caller.
- **ENG-2 (high)**: off-grid battery autonomy sizing used the nighttime-only load instead of the full 24-hour load, undersizing the BESS by ~2×. A 20 kWh/day site with 2 days autonomy now correctly sizes to ~52.8 kWh gross (was ~24.8 kWh). On-grid outage sizing had a related bug (`outageHours / 24` instead of `outageHours / 12`). Both fixed via the new `computeAutonomyEnergyRequirement` helper.

- **ENG-3 (medium)**: inverter clipping loss was non-monotonic at DC/AC ratio = 1.3 (jumped from -0.2% to -0.065% as ILR crossed 1.3, then increased again - physically impossible since higher ILR must yield more clipping). Formula is now continuous and monotone. Note: annual yield for arrays with DC/AC > 1.3 shifts by a small amount (+0.2% additional loss at ILR = 1.4) - this is the correct behavior (the pre-fix formula under-counted clipping in the 1.3-1.5 ILR band).
- **ENG-4 (low)**: hot-case string sizing used the Voc temperature coefficient instead of the Pmp coefficient (IEC 62548 §7.2). Undersized the minimum-modules count by 1 in some hot climates. Fixed by using `betaPmpPerC` when supplied, falling back to `betaVocPerC` for backward compatibility. Some configs that previously emitted no MPPT-floor warning will now correctly warn that the string is too short for the hot-case MPPT minimum.

- **ENG-5 (low)**: `calculatePoaIrradiance` was a collapsed 3-bin approximation of the Perez 1990 model that also dropped the zenith-angle terms (`f13·θ_z`, `f23·θ_z`). Replaced with the full 8-bin coefficient table (Duffie & Beckman 4th ed., Table 2.5.1). Clear-sky diffuse POA now matches hand calculation to ~1 W/m² (previously under-counted by ~13 W/m² at very high clearness). Affects only the `POST /api/v1/solar/poa` endpoint; no internal physics path consumes this function.
- **ENG-7 (low)**: tracker transposition gain in `computeWaterfallLosses` used a hardcoded fixed-tilt comparison baseline of 30° regardless of latitude, over-crediting the tracker at sites where the true optimal tilt is far from 30°. Baseline is now latitude-derived (`|latitude| × 0.88`). User-visible: reported tracker gain drops from ~42% to ~29% at Singapore (1.35°N) and shifts at Berlin (52.52°N); Tehran (35.69°N) is near-invariant (~24%). The ×1.168 fixed-tilt-over-GHI anchor and the non-tracker 16.8% baseline are unchanged. The underlying sun-path's absolute `poa_fixed/GHI` ratio is still low (~1.045 vs the ~1.18 physical expectation) - separate issue deferred to v1.1.0.

- **ENG-6 (low)**: LCOE denominator floored at 1 kWh, inflating LCOE by up to 1000x for pathological inputs producing finite-but-sub-unit discounted energy. Floor raised to 0.001 kWh. No observable change for realistic plants (discounted energy is in the millions of kWh); the guard only affects degenerate inputs.
- **ENG-8 (none)**: removed dead `const b = (2π·(dayOfYear − 81)) / 364` in `shadingSunPathEngine.ts` - a Cooper-equation intermediate left behind when the declination formula was switched to Spencer. No behavioral change.

## [1.0.0] - 2026-11-03

### Changed

- README rewritten to describe the actual stack (React 18 + Vite 6 + TypeScript 5, Express 4 via tsx); the out-of-tree .NET 8 MAUI + Blazor Hybrid + Rust + PostgreSQL + gRPC roadmap docs are archived with an explicit "NOT THE CURRENT IMPLEMENTATION" banner (BUG-11).
- `scripts/sync-docs.ts` rewritten to derive ADR titles/statuses from `docs/adr/` source instead of a hardcoded list; `docs/STATUS-RFC-3.0.md` regenerated with all 10 ADRs (BUG-12).
- `metadata.json` capabilities corrected — phantom `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` removed (BUG-19).
- `.env.example` now documents every runtime-read variable: `VITE_REAL_INTERNET`, `PORT`, `NODE_ENV`; `.env`/`.env.local` confirmed git-ignored (BUG-20).
- Full TypeScript migration to `strict: true` (Phases 5.0–5.4: safe sub-flags, `noImplicitAny`, `strictNullChecks` + `strictPropertyInitialization`, umbrella flip; zero `@ts-nocheck` remain).
- `verbatimModuleSyntax: true` enabled with all type-only imports converted (BUG-15).
- CI now runs `npm run lint`, `npm test`, and `npm run test:smoke` on every PR/push (BUG-17).

### Fixed

- BUG-1: `process.env` read directly in browser-bound modules — replaced with a cross-runtime `runtimeEnv` helper + Vite `define`; `src/` is now `process.env`-free.
- BUG-2: user pricing silently reset to defaults on every project save/load round-trip — `UserFinancialPricingSchema` aligned to the canonical 21-field `UserFinancialPricing` interface.
- BUG-3: NaN battery SoC in the 24h simulation for zero-BESS (powerplant) mode — guarded, SoC pinned to 100; sim24h tab hidden in powerplant mode.
- BUG-4: circular dependency between `climaticData.ts` and `dataGateway/*` — shared types extracted to leaf module `src/engine/types/climateTypes.ts`.
- BUG-5: a 1 MW utility plant displayed a 48 V "DC bus" — inverter DC bus (from MPPT ceiling) and battery DC bus are now reported as separate KPIs.
- BUG-6: string sizing used STC Vmp for the MPPT upper bound, over-sizing strings ~2 modules in winter — now uses coldest-day Vmp per IEC 62548 §7.2.
- BUG-7: financial engine had zero golden-value tests — added LCOE (independent recomputation), NPV, and IRR golden tests.
- BUG-8: FinancialTab numeric inputs could produce NaN LCOE via `discountRatePct = 0` — per-field sanitizer with minimums added.
- BUG-9: two diverging equipment catalogs — engine `DEFAULT_*` now derived from the canonical `equipmentCatalogData.ts` via adapters.
- BUG-10: tracker config crash during render — `computeTrackerState` sample wrapped in try/catch with a bilingual warning; GCR/rotation/axis-tilt inputs clamped.
- BUG-11: README advertised a .NET 8 MAUI stack that does not exist in this repo.
- BUG-12: `sync-docs.ts` wrote hardcoded, incorrect ADR summaries to the status doc.
- BUG-13: four dead components removed (QuickSizing, SizingCalculator, EpcProposalModal, CatalogManager).
- BUG-14: no React error boundary — any render throw blanked the whole app; `ErrorBoundary` added around `<App/>`.
- BUG-16: WebGL/Leaflet resource leaks under React StrictMode double-invocation — idempotency guards and ref-nulling cleanup added.
- BUG-17: CI never invoked `npm run lint`; pre-existing `projectMigration.ts` type error fixed so lint is a hard gate.
- BUG-18: stale `bun.lock` coexisted with `package-lock.json` — removed; npm is the pinned package manager.
- BUG-19: phantom Gemini capability advertised in `metadata.json` with no corresponding code.
- BUG-20: `.env.example` was missing the variables the app actually reads.
- BUG-22: literal `\n` (backslash + n) artifact in benchmark output polluted captured evidence files — fixed and evidence regenerated.

### Security

- `process.env` fully removed from `src/` (BUG-1); browser bundle no longer reads Node env directly.
- Post-strict audit (`docs/evidence/post-strict-audit.md`) records a full security grep pass: no `eval`, no `dangerouslySetInnerHTML`, no plaintext http network calls, no `process.env` in src; `JSON.parse` validation review deferred (Phase 6.5).
- `.env` / `.env.local` confirmed git-ignored (BUG-20).

### Internal

- TypeScript strict-mode migration data: `docs/evidence/phase-5.0-baseline.md`, `docs/evidence/phase-5.3-measurement.md`.
- Post-strict audit: `docs/evidence/post-strict-audit.md` — 0 fix-now, 6 defer, 5 accept; verdict READY for v1.0.0.
- Test suite grew from 110 to 117 with regression tests for BUG-3 (NaN SoC), BUG-4 (module-cycle), BUG-6 (cold-Vmp MPPT), BUG-7 (LCOE/NPV/IRR goldens), BUG-9 (catalog unification).
- Bundled Leaflet CSS via `main.tsx` import; unpkg CDN link removed from `index.html`.

[Unreleased]: https://github.com/hajianamir/solarpv-studio/compare/v1.0.2...HEAD
[1.0.2]: https://github.com/hajianamir/solarpv-studio/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/hajianamir/solarpv-studio/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/hajianamir/solarpv-studio/releases/tag/v1.0.0
