[![v1.0.0](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/hajianamir/solarpv-studio/releases/tag/v1.0.0)

# SolarPV Studio

Cross-platform web Solar PV design, simulation, and financial engineering
platform.

> **Current release:** v1.0.0 · **Test baseline:** 117/117 · **TypeScript:** `strict: true` · **Post-strict audit:** [READY](docs/evidence/post-strict-audit.md)

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

## Quickstart & PC Execution (راهنمای اجرای کامل روی رایانه شخصی)

### روش ۱: اجرای تک‌کلیک روی ویندوز (Windows PC)
کافیست بر روی فایل **`start.bat`** دوبار کلیک کنید. اسکریپت به صورت خودکار:
۱. پیش‌نیاز Node.js را بررسی می‌کند.
۲. وابستگی‌ها و تنظیمات `.env` را در صورت نبود پیکربندی می‌کند.
۳. سرور را اجرا کرده و مرورگر پیش‌فرض سیستم را در آدرس `http://localhost:3000` باز می‌کند.

### روش ۲: اجرای تک‌کلیک روی لینوکس و مک (Linux / macOS PC)
در ترمینال دایرکتوری پروژه دستور زیر را وارد نمایید:
```bash
./start.sh
```

### روش ۳: اجرا از طریق ترمینال و npm (Cross-Platform)
```bash
# نصب وابستگی‌ها
npm install

# اجرای رانر دسکتاپ به همراه باز شدن خودکار مرورگر
npm run pc

# یا اجرای حالت بهینه‌شده تولید (Production Mode)
npm run pc:prod
```

### روش ۴: اجرا با Docker Desktop (کانتینر ایزوله)
```bash
docker compose up --build
```
سپس در مرورگر به آدرس [http://localhost:3000](http://localhost:3000) مراجعه فرمایید.

---

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
