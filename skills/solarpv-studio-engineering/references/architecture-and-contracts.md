# Architecture and cross-system contracts

Read when locating an owner, changing a shared interface, or assessing the blast radius of a change. Paths below are repository-relative. Confirm current exports/imports; this is an entry-point map, not an assertion of architectural purity.

## 1. System boundary map

| Boundary | Owners to inspect | Contract questions |
| --- | --- | --- |
| User → application | `src/App.tsx`, `src/main.tsx`, `src/components/` | Which mode/project is active? Who owns the input? Is a displayed value derived or editable? What becomes stale after an edit? |
| Application → ordinary design | `src/engine/pvEngineAdvanced.ts`, `src/engine/core/electricalSizingContract.ts`, `src/engine/systemModeCapacity.ts` | What is demand/capacity basis? Which selected module/inverter snapshot applies? Is the design feasible or diagnostic only? |
| Design → physical losses/annual energy | `src/engine/waterfallLossEngine.ts`, `src/engine/core/physicalLossContract.ts`, `src/engine/core/annualYieldEngine.ts` | Are thermal/shading/bifacial factors applied once? What temporal domain and energy boundary apply? |
| Project → chronological studies | `src/studies/studyContract.ts`, `src/studies/studyWorkflow.ts`, `src/studies/operatingDispatch.ts`, `src/studies/operationalEnergy.ts` | Are time steps, weather, topology, controls and configuration identity consistent? Is the result eligible for adoption? |
| Studies → financial adoption | `src/studies/studyComparisonGate.ts`, `src/studies/operationalProjectTransfer.ts`, `src/engine/core/financialContract.ts`, `src/App.tsx` | Is the gate actually evaluated? Are coverage and context sufficient? Can a stale result reach energy/revenue? |
| Browser → HTTP | `server.ts`, `src/server/researchApi.ts`, `src/server/pvlibStudy.ts`, `src/studies/researchApi.ts` | Which parser, identity resolver, payload/resource bound and error contract apply to this route? Verify middleware order, not just existence. |
| HTTP → Python | `src/server/`, `services/pvlib_study/worker.py`, `services/pvlib_research/api_worker.py` | What exact schema/version is sent? How are cancellation, timeout, stdout/stderr, exit status and process trees managed? |
| Gateway → provider | `src/engine/dataGateway/`, `src/engine/climaticData.ts` | Are location/time/provider/units part of cache identity? What is stale, unavailable, inferred or analytically estimated? |
| Catalog → selected project | `src/engine/catalogRepository.ts`, `src/engine/catalogAdapters.ts`, `src/components/PvArrayEngineeringTab.tsx` | Does selection copy all supported manufacturer fields? Does an existing project retain authoritative snapshot values? |
| Project → durable storage/import | `src/engine/core/projectMigration.ts`, `src/engine/offlineTransferEngine.ts`, `server.ts` | Is validation complete before mutation? Is confirmation required? What distinguishes new, corrupt, unreadable and incompatible storage? |
| Model → user artifact | `src/engine/reportingEngine.ts`, `src/components/OfficialReportModal.tsx`, `src/studies/reportPdf.ts` | Do units, provenance, qualifications, stale state and metadata survive serialization and read-back? |
| Source → installed runtime | `package.json`, `package-lock.json`, `Dockerfile`, `install.bat`, `start.bat`, `scripts/run-pc.ts` | Are code/services/assets bundled and dependencies reproducible? Does the final runtime work without source mounts or post-install internet? |

## 2. Numerical owners and their consumers

- **Thermal:** `src/engine/core/thermalDerate.ts` and `hourlyThermalEngine.ts`. Trace array sizing, losses, string hot-cell input and annual/representative thermal consumers. Mounting assumptions are not automatically validated by a NOCT fixture.
- **Geometry:** `src/engine/core/solarGeometryContract.ts`, `src/engine/solarPvEngine.ts`, `src/engine/tracker/`. Declare north/south azimuth, degree/radian and UTC/interval semantics at boundaries.
- **Electrical:** `electricalSizingContract.ts`, `mpptAllocation.ts`, `pvEngineAdvanced.ts`, `inverterClustering.ts`, `protectionBomEngine.ts`, `mvSubstationEngine.ts`. Check voltage AND current, physical allocation, fleet denominators and exact rating definitions.
- **Structural:** `structuralContract.ts`, `src/engine/structuralEngine.ts`, `src/engine/geotech/`, `src/engine/structural/`. Establish dimensions, material/soil/hazard provenance and applicability before suggesting construction suitability.
- **Layout/shading:** `powerplantCadLayout.ts`, `roof3dShadingEngine.ts`, `shadingLifecycle.ts`, `workers/`. Check valid footprints, reserved equipment, count/capacity identity, job ownership and dependency-based invalidation.
- **Storage/operations:** `batteryEngine.ts`, `simulation24hEngine.ts`, `src/studies/operatingDispatch.ts`, `operatingLifecycle.ts`; Python dynamics in `services/power_dynamics/`. Distinguish screening battery sizing, chronological dispatch and dynamic simulation.
- **Finance/UQ:** `financialEngine.ts`, `financialContract.ts`, `uncertaintyPropagation.ts`, `src/studies/financialUqRunner.ts`, `financialUqResultValidation.ts`, `financialUqArchive.ts`. Trace eligible energy, currency/rate basis, quantile semantics, seeded sampling and archived configuration identity.
- **Research:** `src/studies/`, `services/pvlib_research/`, `services/pvlib_study/`. Read the specific module/service README and test contracts; related names do not imply interchangeable schemas or validation status.

The core contracts are orchestration interfaces, not all dependency-free leaves. Existing engine modules include timestamps, catalog storage, reports and worker orchestration. Keep newly introduced numerical leaves deterministic and move side effects to an explicit owner.

## 3. Required boundary worksheet
For each affected edge record:

| Producer → consumer | Schema/version | Units/conventions | Identity/time basis | Validation owner | Failure/stale policy | Tests |
| --- | --- | --- | --- | --- | --- | --- |
| Fill with actual call sites | Do not invent a version | Include percent/fraction | Include project/dependency hash if present | Exact function/route | Reject/qualify/preserve/cancel | Real command and assertion |

Search consumers by symbol and by serialized field name. Import tracing alone misses JSON, persistence, report and Python boundaries.

## 4. Compatibility rules
1. Preserve optional-field absence; unknown is not zero or a fabricated catalog fact.
2. Never infer unchanged specifications from a reused equipment ID.
3. Preserve deprecated exports unless an authorized breaking change includes migration.
4. Maintain old-project tests when modifying validators; disclose intentional rejection of invalid historical values.
5. Keep recovery paths non-destructive: Never seed over evidence of failed recovery.
6. Browser APIs use relative/proxied addresses. Local loopback is appropriate inside isolated server tests, not a deployed browser's cross-service endpoint.
