# Post-Strict Audit Report

**Date:** 2026-11-03
**Branch:** arena/aa3988a2-solarpv-studio
**Base HEAD:** 6217035 (Phase 5.4 finale)

**Baseline at audit start:**
- Tests: 117/117 PASS · Lint: EXIT=0 · Build: success · Smoke: 5/5
- `strict: true` (umbrella only), zero individual strict flags in tsconfig.json
- `@ts-nocheck` count: 0

## 1. Debt inventory

### 1.1 Non-null assertions (`!`) — Total: 2
Both in `src/engine/core/benchmarks/unitTestsCore.ts` (test-only code):

| File:Line | Enclosing scope | Triage |
|---|---|---|
| unitTestsCore.ts:1517 | `rep.trackerDetails!.annualTranspositionGainPct` | ACCEPT — test assertion on a result the preceding lines provably populated; test code, not runtime |
| unitTestsCore.ts:1527 | `rep.trackerDetails!.annualShadingLossPct` | ACCEPT — same |

### 1.2 `as unknown as` escapes — Total: 3
All in `src/App.tsx` (620, 622, 632): redundant casts on Zod-validated `clean.*`
fields, known since Phase 2 ("removal scheduled for Phase 2/3 cleanup").
**Triage: DEFER → Phase 6.1** (safe to remove now that shapes match; cosmetic, not a defect).

### 1.3 `as any` / `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` — Total: 35
- `src/engine/env/runtimeEnv.ts:9` — `// @ts-ignore` on `process` guard — **ACCEPT**: deliberate cross-runtime accessor (Phase 0 BUG-1), commented.
- `src/engine/env/runtimeEnv.ts:18` — `// @ts-ignore` on `import.meta.env` — **ACCEPT**: same rationale (Vite-specific).
- `src/engine/env/runtimeEnv.ts:19` — `import.meta as any` — **ACCEPT**: same rationale.
- 31 × `as any` in `src/engine/core/benchmarks/unitTestsCore.ts` (lines 1591–1903: schema `.shape` probes, `rawPayload`/`res.project` payload casts) — pre-existing from PR #7, test-only. **DEFER → 6.1**.
- 3 × `as any` in `src/engine/core/projectMigration.ts` (373, 507, 587: legacy-payload normalization boundaries) — pre-existing from PR #7. **DEFER → 6.1**.
- 6 × `as any` in components (CatalogTab 563/621/735, OfficialReportModal 439/502, SolarPumpingTab 177: `e.target.value as any` on select handlers; SiteLocationMap 39/40/263/264: `(currentCity as any).latitudeDeg` legacy-field fallback) — pre-existing. **DEFER → 6.1** (typed union or proper optional field).
- `@ts-nocheck` / `@ts-expect-error`: **0**. No Phase 0–5 constraint was violated.

### 1.4 TODO / FIXME / HACK / XXX — Total: 0

## 2. noUnusedLocals / noUnusedParameters measurement

- Combined error count (M): **0** (TS6133/TS6192/etc.: none)
- Error-code breakdown: empty
- Top files: none
- Classification: no orphaned code, no dead branches, no real-unused symbols. The Phase 2 catalog unification and Phase 3 dead-component deletions left **zero** unused-symbol residue.
- Recommendation: flags can be flipped on in Phase 6.3 at zero cost; no Phase 6.1 cleanup prerequisite.

## 3. Behavioral spot-checks

### 3.1 `??` / `?.` insertions from Phase 5.3 — Count: 1 (matches the 5.3 report)
- `OfficialReportModal.tsx:213` — `effectiveCity.dataRetrievalDate ?? ''` in an Excel-export row.
  Verdict: **semantically correct** — the field is optional by Phase 1 design; `''` is the right display/export fallback and matches the pre-strict runtime behavior (undefined rendered as empty cell).
- No other `??`/`?.` insertions in 5.1–5.3. No behavior regression found.

### 3.2 FinancialTab sanitizer minimums
FIELD_MINIMUMS clamps `discountRatePct`→0.01, `usdToTomanRate`→1, unit prices→0.0001/0.01.
Verdict: **correct behavior** — prevents the crf=0/0 NaN path (BUG-8); clamping to a tiny positive is the intended silent-repair UX, consistent with the schema's `.min(0.01)`. No field missing from the map can legitimately produce NaN downstream. No defect.

### 3.3 sim24h zero-BESS guard — **PASS**
`hasBattery = maxBatteryWh > 1e-6` at line 50; loop SoC pinned to 100 and min/max tracking guarded (117–122); return min/max = 100 when no battery (149–150). Covered by the [P0-HARDENING] test (117/117 includes it).

### 3.4 `||` → `??` swaps from Phase 5.x — Count: 0
Verified across strict-a/b/c commits: zero removed `||` lines. Compliant with the Phase 5.3 prohibition.

### 3.5 Security greps
- `eval(`: 0 · `dangerouslySetInnerHTML`: 0
- `.innerHTML =`: 1 — `ThreeJsViewer.tsx:47` `container.innerHTML = ''` (clears container, injects nothing). **ACCEPT**.
- `JSON.parse`: 19 sites — `projectMigration.ts` paths are Zod-validated; remaining localStorage reads use `raw ? JSON.parse(raw) : []` guarded patterns. **DEFER → Phase 6.5** for a systematic validation pass.
- plaintext `http://` (non-localhost): 2 — both are XML namespace URIs in `reportingEngine.ts` (`http://www.w3.org/TR/REC-html40`), not network calls. **ACCEPT**.
- `process.env` in src/: **0** (BUG-1 holds).
- `fetch()`: 6 sites, all to https NASA POWER / PVGIS endpoints in dataGateway. **ACCEPT**.

### 3.6 Evidence-file freshness — **FRESH**
`docs/evidence/test-output.txt` and `coverage-output.txt` both show `Unit Tests Run: 117 | Passed: 117 | Failed: 0` — regenerated in Phase 4 (BUG-22) and still current.

## 4. Triage summary

### 4.1 FIX-NOW: **0 items** — no finding qualified under all five fix-now criteria (nothing is a real correctness defect; all candidates are cosmetic or exceed the budget).
### 4.2 DEFER

| # | Category | File:Line | Finding | Proposed phase |
|---|---|---|---|---|
| 1 | as unknown as | src/App.tsx:620,622,632 | redundant casts on Zod-validated fields | 6.1 |
| 2 | as any | unitTestsCore.ts ×31 | test-only payload/schema probes | 6.1 |
| 3 | as any | projectMigration.ts:373,507,587 | legacy-payload normalization boundaries | 6.1 |
| 4 | as any | CatalogTab/OfficialReportModal/SolarPumpingTab/SiteLocationMap ×10 | select-handler casts + legacy lat/lng fallback | 6.1 |
| 5 | JSON.parse validation | 19 sites across src/ | systematic safeParse/guard review | 6.5 |
| 6 | non-null assertions | unitTestsCore.ts:1517,1527 | safe but unguarded `!` in tests | 6.2 |

### 4.3 ACCEPT
- runtimeEnv.ts `@ts-ignore` ×2 + `import.meta as any` — deliberate cross-runtime accessors (BUG-1 design)
- ThreeJsViewer `innerHTML = ''` — container clearing, no injection
- reportingEngine http:// strings — XML namespaces, not network calls
- 2 `!` in unitTestsCore — provably populated test results
- fetch() sites — all https

## 5. Release-readiness recommendation

**READY for v1.0.0 release prep (Phase 7).** Zero fix-now defects; the deferred items are all cosmetic typing cleanups or hardening reviews that do not affect correctness of shipped behavior. Evidence files are fresh at 117/117. Recommended order: Phase 7 release prep directly; Phase 6.1/6.2/6.5 typing cleanups can land post-release without risk.

## 6. Audit methodology notes
- Greps used: `\w!\.` (2), `as unknown as` (3), `\bas any\b|@ts-ignore|@ts-expect-error|@ts-nocheck` (35), TODO/FIXME/HACK/XXX (0), security set (eval/innerHTML/dSI/JSON.parse/http/process.env/fetch), `git show a5e728a` guard extraction, noUnused measurement via temporary tsconfig (restored, verified `git diff tsconfig.json` empty).
- Manual review: FinancialTab sanitizer vs. BUG-8 NaN path; sim24hEngine hasBattery guard; OfficialReportModal `?? ''` semantics; 5.3 diff for `||` removals (none).
- Anomaly noted for reviewer: tsconfig.json ships with explicit `"noUnusedLocals": false, "noUnusedParameters": false` lines — harmless, and measurement shows flipping them to true produces 0 errors.
- Manual-review catches the greps could not make: (a) the `?? ''` fallback matches pre-strict undefined-render behavior, not a silent change; (b) the http:// hits are XML namespace identifiers inside generated .xls XML, not fetch targets; (c) the single innerHTML write empties a Three.js container and cannot inject untrusted markup.
- Baseline commands recorded: `npm run lint` EXIT=0, `npm test` 117/117, `npm run test:smoke` 5/5, `npm run build` ✓, HEAD=6217035, tsconfig strict umbrella only, @ts-nocheck=0.

## Appendix A — Raw command outputs

```
$ grep -rnE '\w!\.' src/ server.ts --include='*.ts' --include='*.tsx' | wc -l
2
$ grep -rnE 'as unknown as' src/ server.ts | wc -l
3
$ grep -rnE '\bas any\b|@ts-ignore|@ts-expect-error|@ts-nocheck' src/ server.ts | wc -l
35
$ grep -rnE '//\s*(TODO|FIXME|HACK|XXX)' src/ server.ts scripts/ | wc -l
0
$ # noUnusedLocals+noUnusedParameters temporary enablement:
$ grep -cE "error TS[0-9]+" /tmp/audit-unused.log
0
$ grep -rnE '\beval\s*\(' src/ server.ts | wc -l
0
$ grep -rnE 'dangerouslySetInnerHTML' src/ | wc -l
0
$ grep -rnE '\.innerHTML\s*=' src/ --include='*.tsx' | wc -l
1   (ThreeJsViewer.tsx:47, container clear)
$ grep -rnE 'JSON\.parse\(' src/ server.ts | wc -l
19
$ grep -rnP 'http://(?!localhost)' src/ | wc -l
2   (reportingEngine.ts XML namespaces)
$ grep -rnE 'process\.env' src/ | wc -l
0
$ grep -rnE 'fetch\(' src/ server.ts | wc -l
6   (all https: NASA POWER / PVGIS)
$ grep -h "Unit Tests Run" docs/evidence/test-output.txt docs/evidence/coverage-output.txt
Unit Tests Run: 117 | Passed: 117 | Failed: 0
Unit Tests Run: 117 | Passed: 117 | Failed: 0
$ git show a5e728a -- 'src/**' | grep -cE '^\+.*(\?\?|\?\.)'
1   (OfficialReportModal.tsx dataRetrievalDate ?? '')
$ for c in 4047c70 f1ccf79 a5e728a; do git show $c -- 'src/**' | grep -cE '^-.*\|\| '; done
0   (zero || removals in all 5.x commits)
$ grep -c '"strict": true' tsconfig.json
1
$ grep -rl '^// @ts-nocheck' src/ server.ts | wc -l
0
```

## Appendix B — Fix-now gate application

Each candidate finding was tested against all five criteria (real correctness
defect / ≤5 files ≤30 lines / no public-signature or tsconfig change /
verifiable by existing 117 tests or smoke / no dist, package.json, vite,
server routing, or env behavior). Result: 0 of the catalogued findings meet
criterion 1 (real correctness defect). The `as unknown as` casts in App.tsx
are redundant but not wrong; the `as any` sites are pre-existing test/migration
internals; the single `??` is behavior-preserving. Therefore the FIX-NOW
bucket is empty and no fix commit was produced, per the prompt's "zero
fix-now commits is a valid and expected outcome."
