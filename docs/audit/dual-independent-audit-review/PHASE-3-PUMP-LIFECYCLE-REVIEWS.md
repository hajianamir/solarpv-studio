# U19 persistence lifecycle follow-up — internal reviews

Task date2026-11-03. Same branch `arena/1bdbc808-solarpv-studio`, base c171538. This continuation preserves all previous changes and historical receipts. Scope: close PP-02/03's previously unexercised local-restore and bilingual lifecycle evidence, not add physical feasibility. Acceptance PP-L01–03 was recorded before the new test in the persistence plan. No production code, numerical formula, tolerance, input range or migration behavior changed in this follow-up.

## Pass 1 — Contract/compatibility, with boundary investigation

Reviewed `handleSaveProject`, `handleLoadLastProject`, `handleImportProject`, canonical snapshot builder and actual JSON modal controls. Last-local-save is deliberately not auto-applied: replacement needs confirmation, and rejected/canceled imports must preserve edits. A storage read or calling the migration function alone cannot prove the button's event/confirmation/commit path. Added separate fresh browser contexts for Persian and English and actual save/restore/cancel actions, with observable changed77→saved0 replacement. The portable download is read back and compared to the saved settings object before a123replacement import. Null motor efficiency, true zero volume and enabled state are checked directly.

Follow-up investigation: exercised cancellation before restore, then supplied malformed locally stored enabled state and observed localized blocked status. Verified edits remain77 and stored malformed bytes' JSON meaning remains unchanged, rather than using a failed restore to overwrite the source. Supplied unknown portable settings version rejects atomically; absent settings reset off/empty. These are integration/compatibility observations, not independent physical references.

## Pass 2 — Correctness/safety, with adversarial investigation

Reviewed finite/null parsing, settings schema, strict import-before-mutation boundary and no-adoption path against ADR-031. The test intentionally uses incomplete draft inputs: unavailable is required rather than a successful physical assessment. Existing Decimal and actual-base suites remain the numerical evidence; no expected physical output is derived from application output. No external physical source is newly needed for a UI-event test; the existing pinned EPANET/Decimal qualifications remain unchanged and no new manufacturer/site evidence is claimed.

Follow-up investigation: tested invalid efficiency2 through real controls, confirming the notice, empty control and unavailable state; local malformed `enabled:'true'` and unknown portable version must not coerce. In each locale, disabling then reenabling preserves zero and tab remount retains it. Original full production browser test still checks independent complete-duty outputs and finance isolation; new lifecycle cases do not replace those assertions. No need to weaken timeouts, force covered controls, bypass confirmation or change production save handling. P23-RT01 general intermittent save reliability is not declared repaired by successful focused saves.

## Pass 3 — Runtime/delivery, with artifact investigation

Reviewed isolated context cleanup, browser/server `finally` blocks, blocked external-provider routing, locale selectors and modal overlay behavior. The test closes canceled/blocked JSON modals through their actual X controls, waits for local storage, visible current values and localized error statuses, and checks page errors. Registered the lifecycle test after the existing phase1 browser test, so invoking `npm run test:phase1:browser` executes both; the Ubuntu core CI job now invokes that command after Chromium libraries and build. This is configured coverage, not an executed remote CI PASS.

Follow-up investigation: first dedicated run passed in both locales; expanded corrupt-local-store check and full combined command also passed in both locales. Downloaded envelope readback confirms schema/input values across actual browser producer/consumer boundaries. The first broad attempt found a TS7022 inference cycle in the new test and cascading implicit-any diagnostics; explicitly typed Playwright BrowserContext/Page resolves it without weakening strict settings. Lint rerun passed with93warnings/0errors and the combined browser command passed again. The failed attempt remains evidence. Baseline/integration results and exact executable identity are recorded in `phase3-pump-lifecycle-verification.json`; historical persistence receipts remain unmodified. This desktop Chromium integration does not establish native Windows/Safari/mobile layout, Docker, equipment curves/chronology/water delivery or whole-model conformity.

## Decision and rollback

The persistence implementation remains the ADR-031 bounded input-draft feature. PP-L01/02 have direct bilingual production-browser evidence; PP-L03 requires fresh broad gates in the accompanying receipt. Remove only the new test and its package-command suffix to roll back this follow-up (loses acceptance coverage; does not change saved data). Production-feature rollback remains ADR-031. No commit/push/PR/merge/release performed. Full Phase2/3 and release remain blocked by the original open packages and evidence stops.

## Final gate disposition

Final sequential baseline13/13 and integration11/11 pass with stable executable identity `1c2b25adc90f01ab3a555375ec2d3e4eab771124122a9470cec437d2478a36d9`. Combined production browser command passes in both locales. Lint93warnings/0errors; original failing type-check attempt is preserved. PP-L01–03 and bounded PP-01–04: VERIFIED_WITHIN_SCOPE. Implementation IMPLEMENTED; release BLOCKED. Refer to the durable receipt for source hashes, all raw logs and limits. Raw timestamps differ from task date and remain unchanged.
