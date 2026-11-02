# ADR-009: Mobile / Tablet Responsive Strategy

**Status:** Accepted  
**Date:** 2026-11-03  
**Branch:** fix/pr-2a-6-repair-final-complete → arena/904fd837-solarpv-studio

## 1. Context

SolarPV Studio v3.0 must render correctly on three target viewports:
- Mobile: 375 × 667 (iPhone SE / compact)
- Tablet: 768 × 1024 (iPad / landscape phone)
- Desktop: 1920 × 1080 (full workstation)

## 2. Decision

### Breakpoints (tailwind.config.js)
| Breakpoint | Width | Behavior |
|------------|-------|----------|
| `sm` | 640px | Tablet threshold |
| `md` | 768px | Tablet full width |
| `lg` | 1024px | Desktop sidebar docked |
| `xl` | 1280px | Desktop wide |

### Sidebar
- **Desktop (≥1024px):** Fixed right sidebar, 280px width, full navigation
- **Tablet (640–1023px):** Slide-over panel, `fixed inset-y-0 right-0`, toggle button in header
- **Mobile (<640px):** Bottom navigation bar (5 max items), sidebar hidden, floating action for context

### Layout Grid
- **Desktop:** 3-column grid for metric cards, tables full width
- **Tablet:** 2-column grid for metric cards, tables with horizontal scroll
- **Mobile:** 1-column stacked layout, cards full width

### Images & Media
- All `` tags: `loading="lazy"`, `object-contain`, `max-w-full`, `h-auto`
- No fixed pixel heights on image containers
- Chart containers use `min-height` (desktop 400px, tablet 320px, mobile 260px)

### Tables
- `overflow-x-auto` wrapper on all data tables
- Sticky first column where applicable
- Font-size scales: desktop 12px, tablet 11px, mobile 10px

### Touch Targets
- Minimum 44 × 44px tap targets on mobile
- Spacing between interactive elements ≥ 8px

## 3. Consequences

- `App.tsx` sidebar uses `lg:translate-x-0 hidden lg:block` + mobile `absolute right-0 translate-x-full`
- Cashflow table wrapped in `overflow-x-auto`
- All metric cards use `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- No fixed-height containers that break on small screens

## 4. Verification

Target viewports must be validated (real device or dev-tools device mode):
- 375 × 667: Sidebar collapses, bottom nav, single column, tables scroll horizontally
- 768 × 1024: Slide-over sidebar toggle, 2-column grid
- 1920 × 1080: Full sidebar docked, 3-column grid

Note: Playwright not installed in sandbox; visual verification must be done on networked machine.
