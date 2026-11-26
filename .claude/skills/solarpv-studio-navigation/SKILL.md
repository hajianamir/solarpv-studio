---
name: solarpv-studio-navigation
description: "Locate SolarPV Studio calculation contracts, numerical engines, UI and HTTP consumers, catalog adapters, persistence schemas, and evidence. Use before repository changes or when tracing a calculation end to end."
---
# Navigation

## When to use
For the full delivery process, start with `skills/solarpv-studio-engineering/SKILL.md`. This skill is a focused navigation companion.

Use before editing an unfamiliar subsystem or tracing a calculation through the UI, API, persistence and reports. All paths below are relative to the repository root, not the skill directory.

## Procedure
1. Read `AGENTS.md`, inspect the current branch/status and preserve unrelated work.
2. Locate the owning calculation contract, then trace imports and all boundary consumers.
3. Inspect tests, fixtures and evidence metadata before deciding what is validated.
4. Select focused regression gates plus shared lint/build/tests. Do not infer coverage from a test command name.

## Repository map
- UI orchestration: src/App.tsx; HTTP adapters: server.ts. Inspect each route; “thin passthrough” is a goal, not a verified invariant.
- Shared contracts: src/engine/core/{electricalSizingContract,structuralContract,financialContract,physicalLossContract}.ts.
- Numerical leaves: thermalDerate, solarGeometryContract, vmpTemperatureCoefficient and related core modules. Inspect import direction before asserting purity.
- Discipline engines: pvEngineAdvanced, solarPvEngine, structuralEngine, waterfallLossEngine, tracker/, bifacial/, and financial/storage engines.
- Catalog path: equipmentCatalogData → catalogRepository → PvArrayEngineeringTab selection → ModuleSpecs → electricalSizingContract/pvEngineAdvanced. catalogAdapters maps to per-run equipmentTypes. projectMigration validates snapshots.
- Side-effect paths include dataGateway, catalog persistence, reporting, provenance, worker orchestration and timestamped project creation; not every src/engine module is pure.
- Tests: package.json and .github/workflows are the current command inventory. unitTestsCore is a shared test spine; scripts include browser/HTTP/recovery/export gates.
- Evidence: scripts/fixtures, benchmarks/independent, physics reference registry, docs/audit and docs/adr. Legacy tracker provenance claims 0.16.1; newer pinned component fixtures use 0.13.1. Inspect metadata; never interpret either as whole-model certification.

Generate counts/import graphs on demand. Headers and bibliographic links alone never confer trust. Current unresolved screening/validation limits take precedence over historical “verified” wording.

## Required output
Return the owning modules, relevant consumers and persistence/API boundaries, evidence locations, applicable tests and unresolved architectural or validation gaps. When a requested path no longer exists, search the current checkout and report the actual location rather than inventing an equivalent.
