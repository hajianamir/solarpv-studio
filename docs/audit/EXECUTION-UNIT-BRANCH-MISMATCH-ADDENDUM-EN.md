# Branch-assignment addendum for the execution unit

Your report correctly says your separate execution session is assigned to `arena/91a6115e-solarpv-studio`, while the integration session is assigned to `arena/d9900df5-solarpv-studio`. **Do not switch branches** and do not claim a result from the `arena/91...` checkout as if it were a commit on `arena/d9900...`.

The integration owner has already received and checksum-verified the candidate patch through a GitHub Git blob. It applies to clean base `35e9cfe686e6ac72a1c903452dee2cb1fd57868c`, but not wholesale to the integration worktree because substantial changes overlap. The integration tree has failing results for Phase 5 audit, Phase 07 UI lifecycle, and browser cross-tab catalog save. Latest reproduction details are in `docs/audit/EXECUTION-UNIT-FINALIZATION-PROMPT-EN.md` in the integration workspace; the patch is `handoff/PR28-handoff-35e9cfe/source.patch` there.

Proceed only if your current working tree is demonstrably the same content snapshot as the integration tree (compare an exact manifest/diff; branch name alone is not enough). If it is the same snapshot, preserve all existing edits, fix the three failures and missing UI cases there, and deliver a checksum-verified patch/blob back to the integration owner. Do not commit/push to PR #28 or claim your result is already integrated.

If your files do not match the integration snapshot, do not start editing the wrong version. Request a reproducible snapshot of the integration tree or have the integration owner complete the fixes on their assigned `arena/d9900df5-solarpv-studio` session. Your output must state the exact base/tree identity, changed files, tests run, logs, and limitations. Keep Node/local synthetic evidence distinct from CI and production.
