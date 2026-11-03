# SolarPV Studio

Cross-platform web Solar PV design, simulation, and financial engineering
platform.

## Actual Stack (this repository)

| Layer       | Technology                                    |
|-------------|-----------------------------------------------|
| Frontend    | React 18 + Vite 6 + TypeScript 5              |
| Styling     | Tailwind CSS 3 (industrial palette, ADR-008)  |
| 3D / Maps   | Three.js 0.174 + Leaflet 1.9                  |
| Server      | Express 4 via `tsx`                           |
| Tests       | Custom TS benchmark runner (`npm test`)       |
| State       | In-memory (`InMemorySolarDatabase`) + localStorage |
| Persistence | Browser localStorage (`solarpv_project_save`) |

> **Note:** `docs/architecture/TECHNICAL_SPECIFICATION.md` and its appendices
> describe a **future, out-of-tree** .NET 8 MAUI + Blazor Hybrid + Rust +
> PostgreSQL + gRPC roadmap. That roadmap is **not** implemented in this
> repository. See the archive banner in each appendix for details.

## Quickstart

```bash
npm ci
npm run dev      # starts Express + Vite middleware on http://localhost:3000
```

## Verification gates

```bash
npm run lint         # tsc --noEmit (zero errors required)
  # Type-imports are enforced via verbatimModuleSyntax: true in tsconfig.json
npm run build        # vite build (production bundle)
npm test             # core subsystem + benchmark tests
npm run test:coverage
npm run test:smoke   # 5 end-to-end user flows
```

## Subsystem map

| Path | Purpose |
|------|---------|
| `src/App.tsx` | Root shell, sidebar, tab routing |
| `src/engine/solarPvEngine.ts` | Core PV physics (POA, LCOE, IRR, NPV) |
| `src/engine/financialEngine.ts` | 25-year cash-flow, mode-aware LCOE |
| `src/engine/pvEngineAdvanced.ts` | String sizing, NOCT, MPPT windows |
| `src/engine/structuralEngine.ts` | ASCE 7-22 wind/snow, foundation sizing |
| `src/engine/tracker/` | Single-axis backtracking (pvlib-aligned) |
| `src/engine/dataGateway/` | NASA POWER / PVGIS / ISRIC via circuit breaker |
| `src/engine/core/benchmarks/` | Golden dataset validation, LHS, migration |
| `server.ts` | Express API (quick-size, catalog, sync) |

## Architecture Decision Records

See `docs/adr/` — 10 ADRs covering computational strategy, bifacial view
factors, backtracking, Google Maps rejection, climate-hub removal, salt
corrosion, foundation module sharing, UI design system, mobile responsiveness,
and pvlib tracker fixtures.

Auto-generated summary: `docs/STATUS-RFC-3.0.md` (`npm run sync-docs`).

## Standards & benchmarks

- Physics: IEC 62548, IEC 60364, IEEE 1547, ASCE 7-22, ISO 9223, IEC 62305
- Financial: NREL SAM 2023.12.17 comparison, SATBA PPA regulations
- Tracker: pvlib 0.16.1 cross-validation (see `docs/adr/ADR-010-*.md`)
