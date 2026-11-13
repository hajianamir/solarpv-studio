# Execution Unit — Next Steps for PR #28 Remediation Handoff

You have completed remediation work and local validation in an isolated worktree. Your immediate responsibility is to make that exact work reproducibly available to the integration owner, resolve the remaining validation gaps where possible, and report evidence accurately. Do not treat prose describing changes as a substitute for the source diff.

## Known context

- Integration branch: `arena/d9900df5-solarpv-studio`
- Integration baseline: `35e9cfe686e6ac72a1c903452dee2cb1fd57868c`
- PR #28 published head last reported: `1e012083fd1f014c6c027922772dfdb1f585185b` on `arena/91a6115e-solarpv-studio`
- The integration worktree already contains substantial uncommitted tracked and untracked changes. **Do not reset, clean, overwrite, or rebase that worktree.**
- Your isolated-worktree report states that code changes and local gates passed, but the dedicated Phase 07 verifier was not rerun. Its exact commit/ref/path and source diff have not yet been made available to the integration owner.
- Published PR checks fail at “Real Browser Regressions (cold offline)” for Node 20 and Node 22. GitHub log retrieval failed with EOF; the cause is unknown. Do not attribute this failure to a local cause without evidence.

## Required actions

1. **Freeze and identify your exact worktree state.** Record its absolute path, branch/ref, base SHA, HEAD SHA, `git status`, and whether all intended changes are committed. Do not modify or delete the worktree while preparing the handoff.
2. **Produce a reconstructable handoff artifact** from the exact code you tested: preferably a commit/ref accessible to the integration owner or a patch/archive containing the full diff. Include SHA-256 checksums and a file manifest. Exclude dependencies, build outputs, secrets, private keys, caches, and unrelated user data. Make sure the artifact includes the inverter-ID/origin fix, explicit-zero migration handling, negative-load/bay isolation, map zero-PSH safeguards, recovery/PWA changes, gateway lease-verification mock updates, and every test added or modified.
3. **Do not push to, rename, switch, merge into, or rewrite the integration branch.** Do not alter PR #28 or claim your local results are CI results. If you need a GitHub ref to share your tested commit, use only the execution branch assigned to you and state the exact ref; coordinate before any publication if branch permissions or destination are unclear.
4. **Re-run the dedicated Phase 07 verifier** against the exact tested tree in an isolated copy, because it can write tracked evidence. Capture the full output and identify each failed quantity/coherence check, not just the summary. Preserve and compare the evidence file before/after; restore any generated tracked evidence unless intentionally changed and justified.
5. **Run the focused real-browser probes** for inverter technology-change identity, negative load without an unrelated bay-count failure, and map coordinate selection followed by zero-PSH override with structural/3D safeguards. Preserve raw artifacts and commands. Verify assertions test the intended behavior, not merely that the UI does not crash.
6. **Reconcile the browser CI failure if possible.** Retry retrieving the published run logs through supported GitHub tooling. If unavailable, report that explicitly. Test the published head and your candidate separately; do not conflate their results. Keep the missing-`libnss3.so` clean-checkout result scoped to this sandbox and do not present it as the CI cause.
7. **Validate the candidate after its final code edits** with clean dependency installation and the stated Node 20.20.2 and Node 22.22.3 matrices. Include type checks, production build, core tests, audit gates, gateway, browser, export read-back, smoke, and isolated real-Redis tests. Record exact commands, exit codes, runtime versions, and log paths. State clearly that the Redis REST bridge is synthetic and that production Redis REST, live providers, Windows runtime, and comprehensive engineering validation remain unmeasured unless genuinely tested.
8. **Deliver a concise completion report** containing: exact source ref/SHA; artifact path and checksum; changed-file count; commands and results; Phase 07 result; browser probe results; known failures/limitations; and explicit confirmation that you did not change the integration branch or PR. Do not say “ready to merge” unless the integration owner has applied the patch, all required checks pass on that exact integrated revision, and the appropriate CI checks are green.

## Acceptance condition for this handoff

The integration owner must be able to retrieve the exact code that produced your reported results, verify its identity, and selectively apply it to `arena/d9900df5-solarpv-studio` without losing existing work. If you cannot provide a source ref or reconstructable patch/archive, stop and report what is missing; do not ask the integration owner to infer implementation from this summary.
