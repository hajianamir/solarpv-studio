# Iranian economic-policy continuation

Date 2026-11-03. Branch arena/0743c1ca-solarpv-studio; base0d41fd38c8038fb5a2c4f1da8082dc2fbcd2f8fb. Preserve prior dirty canonical/roof work and historical receipts. No commit/push requested.

## Confirmed gaps

The ledger fixes discount at20% and derives tariff/OPEX escalation from inflation without a persisted policy. The UI labels equity NPV (year-zero equity plus post-debt flows) as Project NPV. Its local inputs disappear on tab unmount and truthy fallback prevents intentional zero loan interest. These are supported software/financial-boundary defects; do not invent statutory tariff evidence or a law linking discount and loan interest.

## Acceptance

E1: Strict versioned TOMAN/nominal policy declares discount, tariff escalation and OPEX escalation percentages. Optional ninth engine argument preserves old eight-argument behavior (including inflation indexing) when omitted. Invalid/unknown/unsupported currency/valuation/schedules reject; numeric strings are not coerced. Rates must be finite, greater than−100%, with an explicit supported numerical upper envelope, not a financial law. No automatic financial adoption.

E2: Separate project NPV (CAPEX + operating flows) and equity NPV (equity + post-debt flows). Retain npvMillionToman as a deprecated equity alias for compatibility; UI labels match actual quantities. Keep existing ledger precision and debt/DSCR behavior. Independent Decimal cases cover six capacities, no debt/zero interest, discount negative/zero/positive and independently varied escalation. Old defaults must match numerically; full result fixtures include explicit basis metadata. Positive tiny interest must approach the zero-rate payment without cancellation; reproduce the observed36.779396956861255vs36.75million-Toman defect at1e−12% interest. No claim of tax/replacement/salvage/balloon/nonconventional-flow completeness.

E3: Persist all Iranian-screen settings and explicit policy through App canonical snapshot, local save, project transfer/export/import and report project-input snapshot. Missing legacy settings migrate to documented former UI defaults; never fabricate previous unsaved local-tab values. Malformed supplied settings block import atomically. Bilingual controls allow intentional zeros and retain validated settings across tab changes. Currency/nominal/model limits remain visible. Actual production browser export/readback/import must retain settings and policy, and distinguish project/equity displays.

E4: Exact-node independently generated/mutation-sensitive fixtures for changed expressions; focused contract/migration/UI/actual-browser tests; final lint/build/core/smoke/coverage/Phase1/Phase2/remaining/recovery/exports/claims/help/registry/reference/evidence gates. Three review passes each followed by source/runtime investigation. Record failures and limits rather than bypassing tests.

## Stops/rollback

Unsupported economic bases or schedules reject; do not silently ignore them. Explicit new policy must not be stripped during import. A safe rollback disables the new screen/configuration or retains its strict parsing; it must not silently compute a saved custom policy using legacy20%/inflation defaults. Historical results remain historical and must be recomputed for changed policies. Other financial engines, annual energy adoption and standards/manufacturer safety work are outside this slice and remain open.

## Execution outcome

E1–E4 implemented for this bounded screen slice; ADR-022 records decisions, three self-review/research rounds and exclusions. Independent 48-case policy/tiny-interest suite and original18case precision suite pass. Final18-command broad regression passed; post-review lint/build/help/browser reruns also passed after disclosure/help edits. The exact-expression gate executed and sensitivity-checked all11cumulative changed formulas. See `phase2-iranian-policy-verification-receipt.json` for commands and hashes. U16b and overall Phase2 remain partial/incomplete; release remains blocked. No commit/push performed for this continuation.
