# ADR-031 — Persist explicit unmatched pump-duty drafts

Date: 2026-11-03. Status: implemented, verification recorded separately. Supersedes ADR-030's temporary-input decision only; all physical qualifications remain.

## Decision

App owns `pumpDutySettings` in its canonical project snapshot. `pump-duty-settings-v1` is a separately versioned strict additive project3.0.0 field, retaining explicit model/DC boundary and mandatory `user_declared_unmatched` context. Nine nullable numeric inputs reuse the duty contract's ranges. Null denotes incomplete input, never zero. Only missing whole settings default off/all-null; supplied malformed settings reject restoration before catalog/project mutation. No derived result is accepted or stored as a trusted input.

The panel is controlled in App and retains a standalone local default for existing independent consumers. Invalid edits clear the affected field and disclose the loss; disabling retains inputs but removes assessment output. Changed site/equipment context does not upgrade saved assumptions: all settings remain unmatched. No automatic research, annual-energy, financial, load or equipment adoption.

## Alternatives and consequences

Local-only values lose work on tab unmount. Inferred legacy/PSH defaults fabricate an operating point. Saving calculated results would risk stale/trusted imports. Automatic site matching without authenticated provenance would falsely imply applicability. These alternatives are rejected.

Portable envelopes, local saves and report project-input snapshots share one builder and restore validator. Readers that predate this field can discard it: preserve original current-version files, with no lossless downgrade promise. Older projects explicitly reset prior project's duty settings rather than inherit them.

## Rollback and limits

Remove the controlled panel integration selectively; keep strict import validation and original saved files, and do not reinterpret saved settings as equipment approval. Re-run migration, focused pump and browser gates after inverse changes. No numerical leaf, legacy pump or financial arithmetic changes. Equipment curves, startup, chronological feasibility, water delivery, authenticated provenance and full U19 remain open. See `PHASE-3-PUMP-PERSISTENCE-PLAN.md` and accompanying review/verification records in `docs/audit/dual-independent-audit-review/`.
