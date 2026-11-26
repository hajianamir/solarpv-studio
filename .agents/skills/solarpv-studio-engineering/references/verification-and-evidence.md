# Verification and evidence policy

## 1. Establish a baseline
Read package scripts and relevant CI/test source. Identify prerequisites, writable paths, network use and runtime cost before execution. Use disposable storage and isolated browser profiles for tests. Do not import a writable server into a test with its default production-like database path.

Record revision, working-tree scope, runtime/reference versions and command results. Reuse earlier evidence only when its revision and affected scope still apply; never imply a historical PASS was rerun.

## 2. Select tests by affected boundary

| Change | Starting commands | Required assertions beyond command success |
| --- | --- | --- |
| TypeScript/application behavior | `npm run lint`, `npm run build`, `npm test` | Client/Node types, ESLint, bundle and affected consumer regressions |
| Numerical expressions | `npm run verify:physics-registry`, `npm run verify:physics-reference-gate`, `npm run test:coverage` | Independent records, mutation sensitivity where supported, tolerance/source/domain and unresolved expressions |
| In-memory/migration flow | `npm run test:smoke` | Expected scenario states; not browser end-to-end validation |
| UI behavior/locales/layout | `npm run test:browser`, `npm run test:ui` | Real controls, mode/locale/responsive states, persistence and error paths |
| Vmp data path | `npm run test:accepted-audit` | Measured precedence, units, invalid inputs, windows, HTTP aliases and project flow |
| Geometry/worker lifecycle | `npm run test:remaining` | Geometric domain, ownership, concurrency, termination and live cancellation |
| Recovery | `npm run test:recovery` | Missing versus unreadable/corrupt storage and non-destructive save/signal behavior |
| Reports/downloads | `npm run verify:exports`, `npm run test:browser:download`, `npm run test:pdf` | Actual bytes read back, metadata/units and import restoration |
| Gateway/security | `npm run test:gateway`, `npm run verify:rate-limit`, `npm run verify:source-invariants` | Cache identity, failures, exact route protection and legitimate requests |
| Research/service workflow | `npm run test:research:api`, `npm run test:research:browser`, `npm run test:study:python`, `npm run test:study:workflow` | Service validation/auth/cancellation, eligibility, context and stale-result handling |
| Operations/energy | `npm run test:operating:dispatch`, `npm run test:operating:lifecycle`, `npm run test:operational:energy` | Chronology, conservation, constraints, policy and zero/undefined cases |
| Financial uncertainty | `npm run test:uq:contract`, `npm run test:uq:metrics`, `npm run test:uq:worker`, `npm run test:uq:archive` | Distribution meaning, seeds, cancellation, validation and archive identity |
| Foundation/portfolio | `npm run test:foundation`, `npm run verify:foundation`, `npm run test:portfolio` | Applicability, consistent consumers and persistence |
| Packaging/runtime | `npm run test:dependencies`, `npm run test:container` | Clean locked install, supported launcher and standalone final-image execution |
| Public claims/help/skills | `npm run verify:engine-claims`, `npm run verify:help`, `npm run test:skills` | Evidence wording, valid references and portable bundle parity |

This is a selection matrix, not permission to skip a required gate. Recheck `package.json` and CI before use. Scientific Python tests require their declared environments; do not install arbitrary unpinned packages to make a result pass.

## 3. Evidence classes
Use an explicit class per assertion:
- **inspection:** source/configuration review; no runtime proof.
- **internal-regression:** synthetic vectors, identities, properties or behavior fixtures.
- **independent-component:** separately generated/acquired reference for a defined model component/version/domain.
- **integration:** actual boundary interaction; label mocks, browser harness, server and artifact scope.
- **runtime-platform:** execution in the claimed installed/final/native runtime.
- **field-comparison:** qualified observations with calibration/coverage/measurement limits.
- **conformity:** only an applicable authorized standards assessment; never inferred from the other classes.

An error of 1e-15 against another implementation describes numerical agreement in the tested domain, not real-world accuracy. A bibliography link does not prove independently acquired outputs. The same equations in engine and test remain an internal algebra check.

## 4. Check results and acceptance disposition
A check result describes a specific observation; it is not an implementation or release decision. Use the decision fields in the delivery reference for those conclusions.

- **PASS:** the named assertion ran and met its declared threshold.
- **FAIL:** it ran and violated the threshold/contract.
- **BLOCKED:** the check could not establish its result because a prerequisite or required evidence is unavailable; identify that prerequisite and the affected criterion.
- **NOT_RUN:** the planned check has not been executed; record why and the consequence for acceptance.
- **WARN:** the check produced a qualified result under its defined policy; retain the limitation. It is not interchangeable with PASS.

For each check, record its ID, acceptance IDs, whether it is required, command or review method, revision plus dirty scope, environment/reference versions, expected assertion, observed result, evidence class, artifact location and limitations. Do not include secrets in environment records.

Every acceptance criterion MUST reference sufficient check evidence. A successful process exit without its required assertion is insufficient. A criterion with unresolved FAIL is failed; one with missing or qualified evidence remains unverified unless its acceptance policy explicitly permits that qualification. Record applicability with a reason; NOT_RUN is not a synonym for not applicable.

Preserve a failed first attempt and explain the corrective change/rerun. A longer supported timeout may address test infrastructure contention, but does not itself fix an application defect. Never silently weaken tolerances, skip assertions, stub missing scientific services or reclassify unsupported references to achieve green CI.

## 5. Numerical fixtures
Store generator, source/version, units, exact input vector, expected output, tolerance rationale and limitations. Keep raw/private/licensed datasets external when necessary; document acquisition without claiming possession. Generate expected references without importing or copying production outputs.

For a changed formula, run expression-level independent-reference checks in addition to internal tests. If it lacks accepted evidence, keep the release gate blocked even if all executable regression tests pass. Archived targets may be retired only via an explicit evidence decision that preserves their discrepancy and rationale; retirement is not validation.

### Numerical comparison contract
For each numerical assertion, specify the compared quantity, units, reference domain and comparator. Where a combined absolute/relative bound is used, define it explicitly as `abs(actual - reference) <= absoluteTolerance + relativeTolerance * abs(reference)`. Relative tolerance is a fraction, not a percent; absolute tolerance uses the quantity's units. The values MUST be justified by the reference, numerical method or acceptance requirement, not chosen to match the observed error.

Specify treatment of zero/near-zero references, non-finite values, angle wrapping, rounding and excluded/degenerate cases. Unless an assertion explicitly concerns a defined non-finite result, NaN/Infinity MUST cause rejection or test failure, not be removed from the sample set. Report sample count, maximum error and failing cases within the tested domain; do not describe that statistic as field accuracy.

## 6. Coverage and negative tests
Interpret coverage by its actual include/exclude configuration. The core coverage command is not whole-application coverage. Add tests for invalid inputs, unknown enums/versions, conflicts, cancellation, stale data, interrupted writes, unauthorized requests and undefined math as relevant.

For a defect correction, at least one regression MUST demonstrate the original defect or violated contract, unless reproduction is unavailable; in that case record the limitation and do not claim a reproduced fix. Negative tests should also show that the guard fails when its protection is removed or a prohibited state is injected. Tests checking headings or tokens only validate document structure, not semantic completeness or agent behavior.

## 7. Final gate review
Assess the final patch, not a stale intermediate revision. If a subsequent edit affects a checked assertion, rerun that check or mark its prior evidence superseded. An editorial-only edit need not invalidate unrelated numerical results; state the scope of evidence reuse.

Before handoff: inspect final diff, run whitespace checks, review new artifacts and secrets exposure, confirm unaffected work was preserved, and compare acceptance criteria with evidence rows. Use the delivery templates to record exactly what is safe to conclude. Do not merge or release on missing required evidence.
