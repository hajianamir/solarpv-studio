# ADR-013 — Signed thermal transfer, shared pile diagnostics and LPS containment

Date: 2026-11-03. Status: accepted for the scoped changes below, **not Phase 2 completion**.

## Decision and acceptance

* **P2-T1:** An explicitly supplied annual loss is signed. Negative loss is gain. `thermalStagePercentage` is the only transfer/sign validator: finite, at most 100 percent loss; invalid explicit values throw rather than silently adopt a design fallback. Missing override still uses the existing hot-design fallback. Named adapter, 17-slot compatibility API and canonical annual API preserve the same override. No annual weather, mounting-offset or whole-system accuracy claim follows.
* **P2-S1:** Forward the shared pile calculation's moment, capacity and safety-screen diagnostics rather than reconstructing with a hard-coded 0.9 m clearance and rounded FoS. Keep the shared foundation-specific recommended section/depth. Recompute wind sensitivity through the same shared input path. This establishes owner consistency, not soil-model correctness or equivalence with every structural consumer/default.
* **P2-L1:** The current LPS API has neither reference-plane geometry nor conductor topology/bonding data. Its angle and separation are therefore null/unassessed for every call. Historical values remain under `legacyGeometryDiagnostics` for diagnosis only; they are not installation values. Replace imperative installation distances with bilingual unavailable guidance. Nominal rolling-sphere/class/SPD quantities remain qualified screening assumptions, not design approval.

## Evidence, units and limitations

The new sign component uses pinned pvlib 0.13.1 PVWatts DC: `Pdc = G/1000 * Pdc0 * (1 + gamma*(Tcell-25))`. Gamma is 1/°C, temperature °C, irradiance W/m², power W; the transfer inputs/outputs are percentage points. Fifteen independently generated component conditions use -20/0/25/50/80 °C and gamma -.002/-.004/-.005 per °C at 1000 W/m² and Pdc0=1 W. Absolute tolerance 1e-10 percentage points covers only floating-point conversion, not predictive accuracy. The reference gate executes the direct export and a sensitivity mutation. Generator, fixture and registry entry are versioned with the code.

LPS containment changes no governing angle or separation equation: manufacturer guidance establishes why the missing geometry/topology is consequential, not a substitute for the adopted standard. See `PHASE-2-RESEARCH-AND-REVIEW.md` for sources and remaining stops. Shared-pile tests compare identical inputs exactly (sensitivity display rounds to two decimals); they are intentionally not independent physical references.

## Compatibility and rollback

Existing 17-slot calls remain supported. Explicit NaN/Infinity thermal overrides now reject; negative overrides now increase the thermal stage rather than disappearing. The canonical API gains an optional override, not a mandatory persisted field. Callers must not conflate this override with weather-data adoption eligibility.

LPS consumers must handle null angle/separation and preserve `assessmentStatus`. JSON round-trip and actual browser rendering are tested. Do not roll back to publishing legacy separation as safe. The safe rollback is to withhold the whole affected LPS panel/result. Thermal rollback may omit an explicit annual override and label the existing scalar hot-design fallback, but must not silently clamp a signed annual result. Shared structural rollback must withhold disputed diagnostics rather than reinstate contradictory reconstructions.

## Unfinished work / prohibited claims

U01b wind/domain, full U02 hemisphere/profile ownership and downstream derating contract, U09b manufacturer-specific completion, U10 candidate/arrangement search, U13 regime/groundwater/FoS, U16b monetary precision/migration, and U07a scalar consolidation still require implementation/evidence. Existing historical CAD reference debt is not waived. This ADR does not authorize declaring Phase 2 finished or the application release-ready.
