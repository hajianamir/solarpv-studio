# ADR-008: UI/UX Design System

**Status:** Accepted  
**Date:** 2026-11-03  
**Branch:** fix/pr-2a-6-repair-final-complete → arena/904fd837-solarpv-studio

## 1. Context

SolarPV Studio v3.0 required a professional modern engineering UI/UX overhaul. The previous interface used decorative Tailwind defaults (rounded-full pills, shadow-*, bg-gradient-*, emoji, non-industrial colors) that did not match the engineering discipline of the application.

## 2. Decision

Adopt a strict industrial design system with:

### Typography
- **Sans:** IBM Plex Sans / Inter (body 14px, labels 12px, headings 16px)
- **Mono:** JetBrains Mono for ALL numbers, coordinates, IDs, percentages, trace IDs
- **Forbidden:** Decorative fonts, font-weight > 700, italics

### Palette (strict)
| Token | Hex | Usage |
|-------|-----|-------|
| bg-canvas | `#0A0E1A` | Application background |
| bg-surface | `#121826` | Cards, surfaces |
| border | `#1F2937` | 1px borders only |
| primary | `#3B82F6` | Engineering blue (actions, links) |
| success | `#10B981` | Signal green (pass, safe) |
| warning | `#F59E0B` | Caution amber (warnings, estimated data) |
| error | `#EF4444` | Alert red (fail, unsafe) |
| data-accent | `#06B6D4` | Numeric text, coordinates, IDs |

### Layout
- **Sidebar:** 280px fixed, docked right, grouped nav (Input / Simulation / Reports / Settings), slide-over on mobile (<640px)
- **Header:** 48px (project name + save + sync status)
- **Status bar:** 24px (last trace_id, active provider, model version)
- **Grid breakpoints:** Mobile 1-col / Tablet 2-col / Desktop 3-col

### Stripped Entirely
- All `rounded-full` pills
- All `shadow-*` (except `shadow-none`)
- All `bg-gradient-*` and `linear-gradient`
- All emoji and decorative icons (only functional Lucide icons allowed)

### Components
- **DataTable:** Zebra striping, sticky header, sortable, copyable cells, horizontal scroll on <768px
- **MetricCard:** One large mono number + small label + confidence badge
- **InputField:** Label above, unit right-aligned, inline validation
- **Charts:** Recharts with thin lines, muted grid, no 3D/gradients

### Responsive Behavior
- Chart containers: `aspect-ratio` or `min-height` (never fixed px)
- Tables: horizontal scroll on <768px with sticky first column
- Images: `loading="lazy"`, `object-contain`, `max-w-full`, `h-auto`
- Sidebar: collapses to bottom-nav on <640px (5 icons max)

## 3. Consequences

- `tailwind.config.js` defines `industrial.*` color tokens, `font-sans`/`font-mono` families, `borderRadius` without `full`, no `boxShadow` beyond `none`
- `index.html` body uses `bg-industrial-bg text-slate-100 font-sans`
- All 29 component files migrated from default Tailwind colors to `industrial.*` tokens
- `grep -rn "rounded-full\|shadow-\|bg-gradient" src/components/` returns empty
- Pre-existing `projectMigration.ts:436` TS error left untouched (base commit issue)

## 4. Verification

- `npm run lint` — clean except pre-existing `projectMigration.ts:436`
- `npm run build` — succeeds
- `npm test` — 76 passed / 0 failed
