# Financial UQ execution and archive compatibility

New calculations support the existing **Gaussian** sampler only. Student-t execution is retired because its legacy marginal transform was incorrect; it is not silently replaced by Gaussian. Clayton/Gumbel remain unsupported. This restriction does not validate project uncertainty assumptions, statistical confidence intervals or financial bankability.

## New calculations and exports

The ordinary financial UI already selects Gaussian. Numerical results for the same inputs/seed/budget are unchanged. New archive exports use `financial-uq-archive-v2`, recording `executionPolicy: gaussian-only-retired-student-t-v2`. Export still requires explicit pricing-confidentiality consent and a production build with source identity. Use the normal Windows `install.bat` installation route; this change adds no dependency or separate installation requirement.

A v2 replay requires the supported execution policy and the exact matching source digest. Replay compares deterministic outputs only; it does not apply imported prices, replace project energy or alter financial inputs. A changed source/model, invalid payload, unsupported policy or failed computation cannot be repaired into a successful replay.

## Existing v1 files

Keep the original archive. Valid v1 archives still import for integrity inspection with their stored metrics, inputs and hashes intact. They are reported as `legacy_read_only`; replay is disabled in this engine, including for Gaussian v1 snapshots. This is a deliberate safety/compatibility restriction, not an automatic migration. A genuine historical executable may be needed for controlled historical reproduction; the application does not run it on import.

New v2 files cannot be opened by old v1-only readers. Do not overwrite old files with a v2 export and assume downgrade compatibility. Project save/import schemas are unchanged; financial UQ archives are not project-import files.

## Availability and errors

- `legacy_read_only`: valid historical v1 file, no execution here.
- `code_mismatch`: v2 file does not match the current production source, or source identity is unavailable.
- `policy_unavailable`: execution policy/family cannot be selected by the replay gate. Unknown serialized policy/schema is rejected at import.
- Direct Student-t calls throw `UQ_STUDENT_T_RETIRED_INVALID_MARGINAL_TRANSFORM`.
- Runner preflight rejects unsupported families before allocating a Worker. A direct retired request to the actual Worker receives a generic computation error; private pricing and stack traces are not returned.

`VITE_FINANCIAL_UQ_WORKER=false` disables the worker route without a synchronous fallback. A safe rollback may disable execution/export/replay while preserving readable files; it must not re-enable the known-invalid Student-t implementation.

## Maintainer evidence

`npm run test:uq:retirement`, `test:uq:worker`, `test:uq:archive` and `test:uq:e2e` cover direct policy, actual Worker, historical archive, Gaussian regression and production-browser behavior. `scripts/fixtures/generate-retired-uq-archive.ts --check` reproduces the internal historical fixture from pinned base Git sources; it needs those Git objects but not a scientific network service. The fixture is historical implementation evidence, not independent scientific truth. See ADR-027 and the Phase2/3 continuation receipt for exact source/test scope and remaining gates.
