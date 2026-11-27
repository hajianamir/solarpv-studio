# ADR-022 — Explicit Iranian screening economics and cash-flow identity

Date: 2026-11-03. Status: implemented for this Iranian-screen U16b slice. **Not full U16b/Phase2 completion, statutory validation or financial-adoption approval.** Prior dirty routing work and historical receipts are retained.

## Confirmed defects and decision

The Iranian ledger hard-coded a20% discount, derived escalation from inflation, and exposed an ambiguous `npvMillionToman` that the UI labeled Project NPV although it discounted year-zero equity plus post-debt cash flows. Tab-local settings were lost on navigation; truthy parsing changed intentional0% loan interest to18%. Review also reproduced cancellation error in positive near-zero loan interest: at10kWp,70% debt,6years,1e−12% interest, the old first payment was36.779396956861255million Toman instead of approaching the zero-interest36.75.

Introduce strict `iranian_screen_economics_v1`: TOMAN, nominal valuation, explicit annual discount/tariff escalation/OPEX escalation percentages. Accept it as optional ninth engine argument. Omitted policy preserves the former mathematical20%/inflation-indexed specialization (tariff=.48×inflation, OPEX=.60×inflation). The active UI always supplies its explicit persisted policy. The eighth inflation argument is retained for deprecated-compatible callers; it is not additionally applied to an explicit policy. No implicit real/nominal/currency conversion.

Rates are finite, greater than−100%, and no more than1000%. The upper bound is an explicit supported numerical screening envelope, not an economic law. Numerical failure near singular rates or extreme money/loan inputs rejects rather than displaying NaN/Infinity. Currency/valuation/version/unknown fields reject, including unsupported tax schedules. There is no imposed relationship between discount and loan interest. `financialAdoptionEligible:false` is explicit in the result and visible UI.

## Cash-flow meanings and precision

- Project NPV: `−CAPEX + sum((revenue_t−OPEX_t)/(1+d)^t)`.
- Equity NPV: `−equity + sum((revenue_t−OPEX_t−debt_service_t)/(1+d)^t)`.
- `npvMillionToman` remains a deprecated **equity** alias, never silently reinterpreted. New fields are `projectNpvMillionToman` and `equityNpvMillionToman`.
- Both use the selected nominal screening discount. This is a declared comparison assumption, not a validated WACC/cost-of-equity model. UI labels and raw data attributes distinguish them; changing debt cannot alter pre-debt project NPV.
- Retain full-precision million-Toman rows/NPV and existing DSCR/payment timing. No new rounding feeds a ledger. Existing rounded scalar IRR/LCOE/payback/avoidance compatibility fields remain and their broader precision review is still open.
- Ordinary positive-rate annuity now uses `principal * r / -expm1(-n * log1p(r))`, algebraically equal to `principal*r/(1−(1+r)^−n)`. At exactly0rate use principal/n. This avoids subtracting nearly equal powers. Units: rate fraction/year, annual end-year payments, n integer1–25years, million Toman. This is numerical stabilization, not a different financing convention.

Initial CAPEX31.5million Toman/kWp, OPEX1.5%, geometric generation degradation.45%,25years and tariff floors remain illustrative local assumptions. No taxes, replacement/salvage schedules, balloon schedules, chronological dispatch/import valuation or verified statutory rates are implemented. NPV availability is not financial feasibility approval.

## Persistence, UI and migration

`iranianScreenSettings` stores framework, entered tariff, debt share, interest, tenor and the complete policy in the canonical App snapshot. Local save, project transfer/export/import and report project-input snapshots share that owner. Zod owns absent-field defaults and validates supplied nested values strictly. Malformed provided settings block current import atomically, never disappear into fallback defaults.

Absent legacy settings migrate to the former UI defaults: Article16, entered tariff4500, debt70%, loan23%,5years, nominal discount20%, tariff escalation12%, OPEX escalation15%. Previous releases did not persist those tab-local edits; their unsaved values cannot be reconstructed. The settings now survive tab unmounts. Intentional zeros are preserved; invalid edits show an error and retain the last validated value rather than silently substituting another number. The page shows entered versus applied tariff and the unverified framework floors. Invalid model inputs/nonfinite arithmetic render a bilingual unavailable state; adopted operational energy remains blocked without gross-PV fallback.

Backward downgrade to older readers that do not understand this field is **not supported** for policy fidelity. They may discard it. Safe rollback must disable this screen or retain strict new-policy interpretation; never recompute a saved custom policy at legacy20% without warning. No automatic destructive stored-result rewrite occurs. Recompute dependents after changing policy; historical report snapshots remain historical. No behavior-changing rollout flag is added because this is an explicit persisted screen configuration, not automatic adoption into another financial model.

## Independent evidence

`generate-iranian-precision.py` independently computes50-digit Decimal cash-flow/annuity/NPV ledgers and bisection IRR, without TypeScript imports, execution or numerical outputs. The original18cases remain; the additional48cases cover.5/1/5/10/50/1000kWp, negative/zero/positive discount, independently varied negative/zero/positive escalation, zero interest and positive tiny rates1e−9/1e−12/1e−16%. API metadata is contract evidence, not statutory validation. Absolute1e−7million Toman plus relative1e−11 supports binary64 accumulation/conversion; it is not economic/forecast accuracy.

Nine additional exact-expression records cover policy normalization/rate selection, separated project NPV and stabilized annuity. With the preceding two routing nodes the cumulative branch delta is11executed/mutation-sensitive expressions. Legacy precision records are regenerated for additive result fields using the same independent generator, not edited to copied targets.

Focused tests assert independent full results, the original cancellation witness, project debt invariance/no-debt equality, the deprecated equity alias, unsupported basis/unknown field rejection, finite failure, legacy missing-field migration, strict invalid import blocking and bilingual available/unavailable/operational-blocked rendering. Actual production browser verifies custom policy and0%interest, correct project/equity values, tab-unmount retention, local save, downloaded project JSON, import with changed policy and subsequent re-export. These are software/arithmetic/integration evidence, not field/bankability validation.

## Three review/research passes

1. **Contract review:** traced all engine callers (the tab is the active production caller), misleading NPV label, default/fallback behavior and App snapshot/import/export boundaries. Follow-up inspected SAM NPV and debt/equity documentation at pinned revision below. It confirms cash-flow identity matters and equity=capital−debt. SAM describes broader model-dependent after-tax flows; therefore these local **pre-tax** project/equity metrics are explicitly not claimed SAM parity.
2. **Correctness review:** reviewed nominal/real units, independent escalation, loan timing,0rates, extreme/invalid inputs and discovered the near-zero annuity cancellation defect. Follow-up inspected ECMAScript2025 `Math.expm1`/`Math.log1p`, which expressly compute accurately near zero, and SAM financial-parameter/loan snippets separating analysis period, nominal loan rate, inflation and discount. Preserve an explicit nominal input rather than invent real/nominal conversion or a discount≥loan-interest constraint. Added tiny-rate independent Decimal witnesses. The SAM prose contains model-specific descriptions and a statement about increasing discount increasing NPV that is not adopted as a general law; executed discounted-cash-flow arithmetic governs this specialization.
3. **Delivery review:** traced canonical serialization, strict nested import validation, zero edits and actual UI values against the engine, including different project/equity debt treatments. Follow-up inspected SAM inflation/nominal conversion and tax/loan model differences, and executed local browser/project-file paths. Current code rejects unsupported real valuation rather than merely relabeling nominal numbers. Reports carry screen settings as project inputs, not as replacements for unrelated Financial-tab metrics. Legacy unsaved tab values cannot be recovered or falsely attributed.

These are agent self-review passes, not independent human reviews.

### Research provenance

Pinned SAM revision: `784177b634fa1475fda6672b70595e087a238aea` in https://github.com/NatLabRockies/SAM . Inspected:

- `doc/source/financial-metrics/mtf_npv.rst`, SHA256 `e06a529f2c54ccc4a6f14275ffa57b03b8dba2f362955bbe9f5d826a501a2241`.
- `doc/source/financial-metrics/mtf_debt_and_equity.rst`, SHA256 `ce5db21679ea599a94d9945cec0a1c824ac272f10ccdbf03f4228ca6486086ec`.
- `doc/source/includes/snip_financing_general.rst`, SHA256 `d75b4a15f6cc165ee2fb492ae0a81fce51d4361a34dae5d35544cd5176eedb06`.
- `doc/source/includes/snip_financing_loan_parameters_rescom.rst`, SHA256 `167f1eaf6709c9001d2b6d5447bb87c35a04632b8a1e53f70d95687bd256be70`.

ECMAScript2025 `spec.html`, previously pinned Git blob7685cdd711ebc9784c80274eb8143ac016c00e01, sections sec-math.expm1 / sec-math.log1p inspected. Upstream SAM computations were **not executed**; Decimal fixtures verify the declared specialization only.

## Failed attempts and limits

An initial migration candidate manually used a ternary for missing settings; the formula gate correctly detected it as a new expression. Defaulting belongs to metadata schema validation, so it was moved to Zod's field-default factory, keeping supplied invalid/null values blocked and adding no physical equation exemption. A foreground combined type-check command timed out after client checks; final process-managed type/lint/build checks establish the completed outcome. Earlier focused runs predate annuity stabilization; final receipt identifies the authoritative reruns.

Broader U16b scalar precision, full debt schedules, nonconventional flows, other ledgers/currencies, global policy migration and annual/project applicability remain open. U07a transposition and manufacturer-specific electrical/standards work remain separately incomplete. See `docs/guides/iranian-economic-policy.md`, the continuation plan and `phase2-iranian-policy-verification-receipt.json` for execution/rollback details.
