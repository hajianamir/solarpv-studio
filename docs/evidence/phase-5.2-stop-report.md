# Phase 5.2 measurement report + Phase 5.3 scope preview

## Phase 5.2 (noImplicitAny) measurement

- N (total noImplicitAny errors): **1** → **Path A** (N ≤ 250, single PR)
- Error-code breakdown: TS7018 × 1
- Top files: `src/App.tsx` (1) — `protectionBom: []` implicitly `any[]` at line 505
- Fix: `[] as ProtectionBomItem[]` + `type ProtectionBomItem` import. Annotation-only.

## Phase 5.3 scope preview

- strictNullChecks total errors: **M = 1**
- Top 15 files: `src/components/OfficialReportModal.tsx` (1) — TS2322 array covariance
  (`(string|number)[] | (string|undefined)[]` not assignable to `(string|number)[][]`)
- Recommended partition: **M ≤ 400 → single PR** (no 5.3a/5.3b/5.3c split needed)
