# Phase 2 continuation acceptance — 2026-11-03

Branch arena/6a50ab5f-solarpv-studio; base 0c4d7cadc7db6001459ea36fdf9a3d1403179a71. Preserve existing dirty work. Numerical/cross-boundary risk. Overall Phase 2 remains incomplete until the authoritative matrix is satisfied; passing this slice does not close unrelated packages.

## Next acceptance criteria

- P2-T5: For identical annual thermal inputs at north/south latitudes, the synthetic temperature seasonal component has opposite phase; equator has zero hemispheric annual harmonic. Northern day-200 cosine convention and existing solar/NOCT/mount parameters remain unchanged. This is a declared synthetic policy, not local weather evidence. Independent Python/numpy seasonal policy reconstruction plus pvlib DC evaluation; metamorphic hemisphere tests separate from physical weather validation.
- P2-T6: Zero PSH yields zero thermal energy loss/gain budget, not a spurious 100% loss; annual PSH integral remains PSH×365. Finite/range-invalid latitude, temperatures, NOCT, coefficient and sensitivity reject rather than fabricate weather. Explicitly retain and label the design-extremes-derived mean when annual mean absent.
- P2-T7: Canonical thermal metadata uses signed *loss* (negative gain), inverse of signed waterfall stage. Named/positional/canonical annual energy and metadata agree with an identical explicit loss override; JSON report readback preserves sign. Hot-design temperatures unaffected.

- P2-S1: Extract the unchanged legacy clipping heuristic to one owner. Preserve the annual API's finite-ILR normalization and four-decimal rounding, and the waterfall's raw clipping precision and historical invalid-input behavior. Independently characterize declared heuristic arithmetic with Decimal; do not describe this as a physical clipping model or field validation. Test consumer equality at ordinary, threshold, clamp and nonfinite inputs. No transposition-policy change is authorized by this extraction.

## Owners and consumers

`hourlyThermalEngine.ts`: synthetic annual profile → App `annualThermalProfile` → named waterfall override → FinancialTab/WaterfallLossTab/OfficialReportModal. `annualYieldEngine.ts`: canonical signed thermal metadata. `thermalDerate.ts`: unchanged hot and scalar annual temperature owner. No measured provider weather or research adoption is introduced. Heavy fixture generation is local installed Python, never client network execution.

## Required checks / rollback

New focused Phase2 thermal cases, exact-expression independent reference/mutation gate, lint/build/core/smoke/coverage, existing Phase1/Phase2/accepted audit and browser checks; consumer/API tests as touched. Three review passes with targeted source investigation after each. Persist ADR, guide/changelog and hash receipt. Synthetic seasonal result compatibility is recomputation from project inputs; historical exported results remain qualified historical artifacts. Rollback disables synthetic annual override or uses the explicitly qualified scalar path, not the known northern-only phase or a gain clamp. No existing safety/research gate is weakened. No commit/push requested.

## Broader work queue

U09b rating-specific factors and per-channel evidence; U07a scalar clipping/transposition and positional migration; U16b explicit ledger policy/migration/debt versus project accounting; U01b normative wind applicability and persisted model policy. Existing U10/U12/U13/U14 evidence and unsupported-state containment must remain intact. Research alone cannot promote unknown manufacturer/standard applicability into assessed results.
