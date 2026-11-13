# Execution Unit Prompt — Closeout After Integrated Local Gates Passed

The integration owner has now received and verified your three Git blobs, applied the reviewed patch to the current integration checkout, and rerun the principal failing gates there. Your role is **final evidence review and release handoff**, not to duplicate changes or overwrite another checkout.

## Current facts

- Integration session/branch: `arena/d9900df5-solarpv-studio`; HEAD at base `35e9cfe686e6ac72a1c903452dee2cb1fd57868c`, with substantial uncommitted work.
- Your reported execution checkout was `arena/91a6115e-solarpv-studio` at the same base SHA, but it is not the integration branch and its working-tree contents were not proven identical.
- Candidate source patch SHA-256: `ffb5b3d1a7792502dc10fa991dc92f8ba9ac5f618dd8a60cdeb182b0f17866dd`. Git blob `65a244a7e23fda60a49a77f4b0039a3d0a0b818b`.
- Patch-review report SHA-256: `0f5cede72a4da8f53a77137726be653a4e8373a26dbb75697046f109cd915e34`.
- Sanitized test logs archive SHA-256: `3d3d3f09228fb7ccf131f207f3ee1c7d202a97779fb6dd0bd5e20a6ad55f1904`.
- The artifacts are locally retained under `handoff/integration-snapshot-35e9cfe/`; their `SHA256SUMS` verifies.
- After applying the patch, the integration owner locally passed `REAL_INTERNET=false npm run test:all`, full browser regressions, Phase 07, types/build, and the listed targeted suites on Node 20.20.2 and Node 22.22.3. Phase 05/07 generated tracked evidence was restored and hashes matched. These are local results, not CI.
- GitHub PR #28 remains open on `arena/91a6115e-solarpv-studio` at head `1e012083fd1f014c6c027922772dfdb1f585185b`; its earlier published browser checks failed and logs were unavailable. Your candidate was not pushed and no PR was changed.

## Instructions

1. **Respect your session’s assigned branch.** Do not switch branches, reset, clean, stash, rebase, force-push, or modify PR #28. If you are still assigned to `arena/91a6115e-solarpv-studio`, do not claim that you can commit the integration work to `arena/d9900df5-solarpv-studio` from your checkout.
2. If the integration owner’s snapshot is available, verify its manifest/checksums and review the patch/report/logs for contradictions or test gaps. Do not rerun the same suite merely to create another copy of existing results. If useful, perform a **fresh clean-install** validation on a separate isolated reconstruction of the exact sanitized integration snapshot, under Node 20.20.2 and Node 22.22.3. Preserve the source snapshot and tracked evidence.
3. Do not copy supervisor-only dossiers, patches, keys, or excluded audit material into your checkout or handoff. Respect the snapshot’s exclusions and its manifest; do not infer excluded content.
4. The final unresolved release task is **branch/CI integration**: the active integration work is on `arena/d9900df5-solarpv-studio`, but PR #28 still points at the older `arena/91a6115e-solarpv-studio` head. Do not update or retarget that PR yourself unless your task is explicitly reassigned and authorized. Tell the integration owner that local success does not turn the old PR CI green.
5. Return a concise closeout record containing: exact checkout branch/HEAD, snapshot manifest identity, whether clean install was actually performed, commands/runtime/exit codes, any new issue, and explicit statement that no branch/PR was changed. If there are no new findings, say so and defer commit/push/CI publication to the integration session assigned to `arena/d9900df5-solarpv-studio`.

## Completion bar

Do not label the work “complete” or “merge-ready” until the scoped integrated changes are committed/pushed from their assigned branch, GitHub CI is green on that exact commit, and any remaining scope/limitations are documented. Local browser/Redis/provider fixtures do not establish live providers, production Redis REST, Windows, production deployment/update behavior, Excel renderer behavior, or comprehensive engineering validation.
