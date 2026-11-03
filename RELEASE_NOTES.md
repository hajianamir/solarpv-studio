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
