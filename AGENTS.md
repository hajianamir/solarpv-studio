# SolarPV Studio — operating manual for coding agents

Read before changing numerical engines, src/App.tsx or server.ts. These are working rules, not a certification of existing code.

## Invariants
- Preserve shared thermal calculations in core/thermalDerate.ts and angle/time semantics in core/solarGeometryContract.ts. Prefer these contracts over parallel implementations.
- Keep screening/uncertainty disclosures and deprecated public aliases. A citation or “faithful port” header is a claim, not evidence of accuracy.
- Never automatically adopt research into financial/annual-energy inputs: retain temporal coverage, project-context matching and registered adoption gates.
- Do not place network/storage/clock/random dependencies in pure numerical leaves. Existing orchestration, catalog, reporting, provenance and worker modules have explicit side effects; the entire engine directory is NOT pure.
- Never invent manufacturer coefficients or replace missing evidence with a passing internal test.

## Formula changes
Record governing equation/source and applicable edition/assumptions. Do not invent licensed clause numbers. Ship numerical fixtures with explicit units, tolerance rationale, provenance and regression coverage for all consumers, including HTTP and project persistence where relevant. Distinguish physical law, empirical model and internal heuristic.
Keep separate: source attribution, implementation verification, independent numerical comparison, project applicability, field validation and conformity assessment. A published replacement does not justify automatically removing UNVALIDATED caveats. Record modeling strategy decisions in docs/adr and behavior changes in CHANGELOG.md; document rollback and stop conditions.

## Evidence and work queue
- thermalDerate mounting offsets remain unvalidated screening assumptions.
- Vmp measured coefficient is preferred; missing Pmp/Isc substitutes have no guaranteed conservative bias. See skills/pv-string-sizing-iec62548/SKILL.md.
- Tracker legacy headers/fixtures claim pvlib 0.16.1; newer scripts/fixtures/generate-remaining-geometry.py pins 0.13.1. Do not conflate them. The latter tests component geometry only.
- Solar/string references and generation scripts live under scripts/fixtures and benchmarks/independent. Read metadata and tested domain, not just filenames.
- Stored bifacial target is retired/unverified and remains WARN; do not tune output to turn it green.
- Clipping heuristic bias, wind-elevation alternatives and harmonics conformity need primary-source/applicability review before changing formulas. Naming IEC/ASCE/IEEE is not proof of conformity.
- Docker runtime and independent whole-model reference gates must not be waived by successful component tests.

## Verification
Run npm run lint (client + Node type checks AND ESLint), npm run build, npm test, npm run test:smoke, npm run test:coverage. Smoke is in-memory integration, not browser end-to-end coverage. Add focused tests for changed boundaries: test:remaining, test:recovery, verify:exports, test:browser, test:ui and reference gates as applicable. Read package.json and .github/workflows for current commands; do not freeze counts or workflow inventories in prose. Report unavailable/failed gates explicitly. Never merge red gates.

## Navigation
See skills/solarpv-studio-navigation/SKILL.md. Generate module/LOC/import counts when needed instead of treating historical counts as architecture guarantees.

## Portable skill discovery
Start with `skills/solarpv-studio-engineering/SKILL.md` for the whole-project lifecycle, risk controls and verification matrix. Navigation, formula-audit and string-sizing skills are specialist companions, not the project-wide operating process.

Canonical skills live in `skills/<name>/SKILL.md`, using shared YAML `name`/`description` frontmatter and Markdown instructions. Codex discovers repository copies in `.agents/skills/`; Claude Code discovers repository copies in `.claude/skills/`. The primary skill loads its bundled `references/` and reusable `assets/` as needed; keep those resources with SKILL.md. Edit canonical files, run `npm run skills:sync`, and verify with `npm run test:skills`. Commit the generated copies together; do not edit them separately. See `skills/README.md` for invocation and limits.
