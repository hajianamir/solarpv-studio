# Phase 2 continuation — named waterfall consumers

Date: 2026-11-03. Base: 0d41fd38c8038fb5a2c4f1da8082dc2fbcd2f8fb. Branch: arena/0743c1ca-solarpv-studio. Baseline working tree clean.

## Scope and autonomous stop

Advance the production-consumer portion of U07a's 17-slot migration. Keep positional computeWaterfallLosses and buildWaterfallArgs as deprecated compatibility boundaries. Do not relocate/change engine arithmetic, change defaults, reinterpret old projects or invent a common physical transposition model. U07a transposition policy and other Phase 2 packages remain separately open. No commit/push requested.

The remaining bypasses found by inspection are canonical annual yield (manual tuple + metadata labeling) and roof3d annual shading (manual tuple). App and WaterfallLossTab already call computeConfiguredWaterfall. Benchmarks intentionally retain legacy calls as compatibility witnesses.

## Acceptance

- N1: Canonical annual yield goes through computeConfiguredWaterfall; App and WaterfallLossTab remain on that boundary. Roof routing is deferred as recorded below. A TypeScript AST consumer guard rejects direct positional calls, tuple builder use and manual metadata labeling outside the compatibility module and explicit baseline-pinned roof exception, including aliased/namespace imports. Compatibility exports remain available.
- N2: All 17 slots retain ordering, defaults, aliases and precedence. Tests compare named/legacy reports and explicit tuple values for zero/undefined/NaN boundaries, thermal loss/gain/override failure, physical/reference loss composition, tracker on/off and mounting/latitude/shading/bifacial inputs. No relaxed numerical tolerance: exact numbers and serialized artifacts must match.
- N3: Actual canonical annual and roof3d consumers preserve energy/stages and JSON readback relative to their pre-migration inputs. Optional undefined diagnostics may be omitted in-memory by the existing named wrapper; serialized shape must be identical.
- N4: Final lint/build/core/smoke/coverage, Phase1/Phase2, remaining, recovery, export, engine-claims/help/reference/evidence gates and production-browser checks pass. Record failures and unrun prerequisites honestly.

No arithmetic changes are intended: the canonical call replacement is an extracted formula unit and needs its own independently generated, executed, mutation-sensitive fixture. All other canonical AST units and the complete roof AST inventory must match the base; run the unmodified reference gate. This is internal compatibility/integration evidence, not independent physical validation. Existing independent component fixtures remain applicable because arithmetic is unchanged. Add five independent Decimal full-report composition cases with an executed nonzero-energy routing witness; tolerance 1e-7 absolute plus 1e-12 relative is binary64/Decimal roundoff allowance, not model accuracy.

## Reviews and research sequence

1. Contract review: trace actual call sites, tuple slots and serialized optional fields. Follow with pinned pvlib 0.13.1 irradiance API research: total POA requires solar angles and DNI/GHI/DHI, and sky model selection is explicit. Local annual PSH/tilt heuristics cannot be silently rebranded as that physical model. Preserve local policies in this migration.
2. Correctness review: inspect tuple precedence, alias and invalid/nonfinite behavior, and compare actual reports. Follow with pinned upstream irradiance/test-source investigation before deciding whether a common transposition replacement is supported.
3. Delivery review: inspect AST consumer enforcement, actual downstream artifacts and compatibility/recovery tests. Follow with upstream serialization/testing and local runtime investigation, recording observed results rather than inferred completeness.

## Rollback

Revert only the migrated calls and their imports to their prior tuple adapters if necessary; retain compatibility exports and tests. Do not change coefficients, restore known safety false passes or enable financial/research adoption. No durable schema migration or feature flag is needed for numerically unchanged call-site routing.

## Executed review findings and stop disposition

1. Contract review found the existing configured wrapper removes undefined tracker diagnostics before returning. Canonical legacy reports had an own `trackerDetails:undefined` field. JSON omits it either way; actual base-version comparisons verify unchanged serialized keys and values, while the in-memory omission is documented. Tuple and metadata attachment stay owned by the existing wrapper. Follow-up pinned pvlib 0.13.1 `irradiance.py` investigation verified `get_total_irradiance` requires geometry and irradiance components; annual PSH alone is insufficient. No physical model was substituted.
2. Correctness review initially expected identical formula AST inventories, but the gate correctly detects canonical and roof call replacements as formula changes. Added a Decimal canonical fixture and exact removed/added call IDs, not a general AST waiver. Root-level reference-gate code is unchanged. Follow-up retrieved `tests/test_irradiance.py` from pvlib v0.13.1 through GitHub API and inspected total-irradiance scalar/albedo/model tests and missing-extra-DNI rejection. These tests do not establish parity of our annual heuristic. **Roof stop:** the call belongs to private `annualShadingSteps`, a generator; the current gate requires a directly bound export and compares returned outputs. Do not bypass it by exempting the call, changing helper names, or describing the non-exported generator as an exercised public numerical export. Roof code restored to base; its complete numerical AST set remains pinned and actual base-version runtime outputs are compared. Safe continuation needs independently referenced generator-return execution support or an evidence-backed adapter design, plus boundary tests—not a blanket exemption.
3. Delivery review checked all production imports, alias/namespace/re-export/dynamic-import bypass witnesses, temporary baseline-module cleanup, and actual canonical/roof JSON reports. Follow-up investigated pinned upstream tests around POA component names and scalar outputs: these are instantaneous component contracts, not evidence for a scalar annual multiplier. Locally, the existing reference-integration suite executes 33 fixtures and UTC/New York/Tehran subprocesses, preserving atomic replacement, missing/site/geometry fallback and serialization. Temp sources use exclusive creation and are removed after successful creation, including import failure. No network is used by numerical tests after dependency installation.

Reviews are agent self-review passes, not independent human reviews. N1 is implemented within the explicitly reduced canonical scope, not complete U07a. Full Phase2 remains partial/release-blocked. See ADR-020 and the new verification receipt for final check outcomes.
