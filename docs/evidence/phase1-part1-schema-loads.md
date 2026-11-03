# Phase 1 Part 1 — ElectricalLoadItemSchema alignment (C1 fix)

## Result
- `npm test`: **103/103 PASS** (was 98; +5 new `Migration-RoundTrip` P1.1.x tests)
- New suites:
  - P1.1.1 Canonical round-trip (MIGR-00, 2/2 loads preserved exactly) — PASS
  - P1.1.2 Legacy v2 loads normalized (powerWatts→ratedWatts, dailyHours→dayHours, keyword category: روشنایی→lighting, چیلر→hvac) — PASS
  - P1.1.3 Malformed canonical load rejected (no silent defaults) — PASS
  - P1.1.4 LOAD_CATEGORY_VALUES sync with LoadCategory (11 values, bogus rejected) — PASS
  - P1.1.5 MIGR-02 still RECOVERED_WITH_WARNINGS with loads=2 preserved — PASS
- Negative tests (D6/D7): stashing `projectMigration.ts` makes P1.1.1 crash/FAIL → tests are genuine regression guards. Restored → 103/103 PASS.
- `npm run lint`: only the pre-existing `projectMigration.ts` ClimateCity error (out of scope per work order).
- `npm run build`: ✓ built.
- Scope: only 3 files changed — `projectMigration.ts`, `migrationTestVectors.ts`, `unitTestsCore.ts`. `App.tsx`, `loadProfiles.ts`, engines untouched.
- Note: Phase-0 prerequisites were NOT fully met in the repo (zod is ^4.6.7, bun.lock still present); per the golden rule, package.json/lockfiles were not touched.
