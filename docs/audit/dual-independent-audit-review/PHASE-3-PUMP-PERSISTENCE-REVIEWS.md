# Pump-duty persistence — three internal review passes

Date2026-11-03; branch `arena/1bdbc808-solarpv-studio`, base c171538. These are three focused passes by the same coding agent, not independent external reviewers or certification. Acceptance PP-01–04 is in the preimplementation plan. No numerical formula changed.

## 1 — Contract/compatibility, followed by boundary investigation

Inspected App snapshot/local/export/report producers and shared `handleImportProject` consumer; project migration schema/present-field check/candidate/default; envelope staging and commit ordering. Confirmed an additive field needs explicit candidate propagation as well as schema registration, otherwise legacy migrations lose values. Implemented all three owners together. Ranges are taken from the existing strict physical input schema, not copied constants. Derived result/extra properties are rejected.

Follow-up: adversarial schema, migration and transfer execution now covers59 supplied invalid settings, complete JSON roundtrip, missing legacy field, default-object independence and nonmutation. Includes null, unknown version/context/boundary, numeric strings, missing nested inputs, negative/nonfinite inputs, invalid efficiency/runtime/positive fluid constants. Confirmed canonical malformed settings block rather than trigger replacement defaults. Historical fixtures are not counted as evidence of equipment context. PP-01 supported by focused tests; broader checks separately receipted.

## 2 — Correctness/safety, followed by source and numerical investigation

Inspected disabled/incomplete/zero/invalid paths and no-adoption boundaries. Original panel/help SSR assertions required temporary values; this was a genuine changed contract, not a reason to remove assertions. Updated both localized disclosures and assertions. No model/legacy/financial leaf edited. No new coefficients, normative applicability or authenticated provenance claims introduced. `user_declared_unmatched` remains explicit even after changing site/equipment. Settings never feed annual-energy/load/finance calculation inputs.

Follow-up research: re-examined existing pinned EPANET source qualification (`phase3-pump-duty-source.json`) and Decimal/base-compatibility suite. Persistence supplies no new head/curve/chronology evidence and must not upgrade the prior law-only comparison. Reused869independent duty cases,18expression witnesses and48actual historical result comparisons (fetched full Git history for the latter), all passing in the focused rerun. No new external-source acquisition or EPANET execution claimed. First focused attempt failed on stale no-persistence wording; preserved rather than represented as an original pass. Missing pump/manufacturer/chronological evidence still stops feasibility/adoption.

## 3 — Runtime/delivery, followed by produced-artifact investigation

Inspected App-owned controlled replacement, standalone fallback, finite parsing and atomic import commit order. Browser coverage now verifies true zero and null after remount, enabled state, saved local JSON, real downloaded report/project JSON, altered imported values then re-export, malformed import preservation and old-project reset. This is production Chromium, not SSR alone. An initial added browser journey could not click through the report overlay after a blocked import (expected modal remains open); fixed test to explicitly close the modal rather than force clicks or change application behavior. Both attempts retained.

Follow-up: read downloaded JSON back and compare settings; rejected import retains120m³ rather than apply any malformed project; absent-field legacy import resets off/empty. Browser rerun passed with providers blocked. Required broad baseline/integration are separately recorded; native Windows/Docker/exact-source remote CI, inherited reference/whole-model debt and intermittent save reliability remain independent stops. Actual last-local-project button journey and full bilingual persistence lifecycle are not newly established by the focused browser extension (bilingual SSR plus Persian early controls/English later imports is narrower). Do not claim complete PP-02/03 verification until those journeys have durable evidence.

## Disposition

Implementation: IMPLEMENTED for versioned draft persistence. Verification: PARTIAL pending all planned journey/gate evidence. Release: BLOCKED. Full Phase2 INCOMPLETE / Phase3 PARTIAL. Rollback is ADR-031's selective UI inverse with original project-file preservation, not a lossless downgrade. No commit, push, PR, merge or release performed for this continuation.

## Final local gate observations

Final sequential baseline13/13 and integration11/11 passed with stable executable identity `2b94feac104fa3735d935d872a153c6d976fca8be6b6ed70c07830188846cfee`. Lint reports93warnings/0errors. First concurrent runs were12/13 and10/11: stale generated source inventory and browser90second wall-clock timeout respectively. Regenerated inventory changes only source hashes/declaration locations plus the new settings contract's explicitly unknown whole-model classification; isolated browser retry passed before the sequential rerun. No proven causal attribution of timeout to concurrency. Raw failed/passing receipts and logs, their hashes, platform stops and criterion-level partial states are in `phase3-pump-persistence-verification.json`. Raw runner timestamps disagree with task date and remain unmodified. Source/docs whitespace check excluding raw captured reporter logs passed. Final gate passes do not close the explicitly unexercised journey criteria above.

## Subsequent lifecycle continuation

The later same-branch `PHASE-3-PUMP-LIFECYCLE-REVIEWS.md` and `phase3-pump-lifecycle-verification.json` close the actual local-load and separate bilingual lifecycle gaps noted above. Those earlier observations/receipts remain historical, not rewritten passes. Bounded draft-persistence verification is now VERIFIED_WITHIN_SCOPE; full U19/Phase2/3 and release remain open/blocked.
