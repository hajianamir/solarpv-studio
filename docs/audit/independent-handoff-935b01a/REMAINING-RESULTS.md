# Remaining 16 findings — implementation delivered, verification incomplete

**Implementation:** finding-specific repairs/claim containments implemented.  
**Verification:** **PARTIAL — not fully complete.**  
**Release:** **BLOCKED.** No commit, push or PR made.

This continuation preserves the earlier six repairs and addresses F01/F02/F03/F04/F07/F08/F09/F10/F11/F12/F15/F16/F17/F18/F19/F20 on `arena/9a79dcb1-solarpv-studio`.

## Changes

| Findings | Implemented behavior |
|---|---|
| F01/F03 | Bilingual report repeats named scalar POA limitations; comments identify actual App/roof configured-waterfall route. No weather-driven replacement or site validation invented. |
| F02/F10 | Coastal-distance bands explicitly internal/ISO unassessed; PVGIS modeled climate no longer claims IEC monitoring Class A. Existing heuristic derates/coatings remain unvalidated. |
| F04 | Historical comparisons fail actionably in shallow/missing-history checkouts; exact baselines are never silently skipped or replaced. |
| F07/F08/F17 | Correct optional near-grazing ASHRAE behavior, bracket/residual-check legacy diode roots, and calculate polar direction with stable local ENU components. Legacy fitting/approximate Isc/sampled MPP limits remain. |
| F09/F11/F15/F16 | Preserve0°C/51.2V, show unassessed battery-voltage/topology compatibility, enforce raw MPPT voltage limits, correctly label80%ceiling budgeting heuristic. |
| F12/F18 | Repair original physical browser's supported advanced-editor navigation; make thermal subprocess input EOF/capture/cancellation/deadline/cleanup deterministic and bounded. |
| F19 | Value PV-origin local energy using explicit initial-inventory-first accounting through losses and auxiliary demand; unused initial SOC no longer erases direct PV value. |
| F20 | Replace quadratic rain-window/wash scans with linear operations; retain interval/threshold/grace/energy policies. |

## Current-source verification

Clean executable identity: `595016f824d4e734b450602be8677b370e7083998417b80200ce1e23e0c2af5d`.

- **Baseline12/13:** lint0errors/93warnings, build, core tests, smoke, core coverage, Phases1–3, inventory, help and claim checks PASS. **Independent-expression gate FAIL.**
- **Integration11/11 PASS**, including HTTP/browser/UI/exports/recovery/gateway checks.
- **Combined English/Persian production-browser PASS**, including prior repaired scenarios/report geometry/imports and new temperature/BESS controls.
- **Original physical browser PASS:** actual JWT/API/workers, six operations, three DC modes, archive readback/restore, cancellation and stale/site invalidation.
- **Scientific/runtime:**66research Python tests,15physical Python tests plus4mutation witnesses, physical API matrix,3thermal transport tests PASS in the pinned Linux environment.
- **Numerical:**28independent SPA and30ASHRAE vectors, original887SPA vectors,48pvlib diode cases/3888curve points and72explicit-reference cases retained. Actual historical stressed Voc188.23V now45.00V with checked unrounded residuals.
- **Storage:** actual-worker full-year all-mode adoption/archive/finance tests and ongrid/offgrid unused-initial-SOC regressions PASS.
- **Kimber:**36quadratic comparisons,20pinned component and33annual-reference fixtures PASS.35040interval calculation42.7ms in the final focused run. Actual4.12MBannual-file import and waterfall replacement in English/Persian took1.408/1.803s; largest observed browser tasks587/654ms. This removes the reported tens-of-seconds pathology, not all main-thread blocking or a worker migration.

## Why this is not fully complete

The required fail-closed independent-expression gate identifies **51missing records and3stale Kimber records** for changed numerical expressions. Passing independent component comparisons does not itself populate/exercise these exact expression records. They have **not** been replaced with production-generated expected outputs or waived.

To finish acceptance: provide a supported direct-reference strategy for nested numerical helpers, add/rebind independently generated expression fixtures with actual execution/mutation sensitivity, preserve retired evidence, then rerun required gates against the final source. Until then, the remaining-finding implementation cannot be called fully verified or release-ready.

F01's scalar method and F02's derate/coating assumptions remain explicitly bounded model limitations. Native Windows/Docker/Safari, remote exact-source CI, whole-model/site/field/manufacturer/standards applicability and completion of the original independent audit are not established here.

## Evidence and decisions

- [Per-finding register](FINDINGS.md)
- [Machine receipt and artifact hashes](remaining-verification.json)
- [Unresolved expression records](remaining-reference-gaps.json)
- [Three internal review passes and failed attempts](REMAINING-REVIEWS.md)
- [ADR-035: equations, ownership, compatibility and rollback](../../adr/ADR-035-remaining-partial-audit-remediation.md)

Historical failed/interrupted attempts and current passing checks are retained separately. Component verification is not field validation or conformity. No publication/release action was taken.
