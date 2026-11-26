---
name: solarpv-studio-engineering
description: "Plan, implement, review and verify changes throughout SolarPV Studio: React UI; PV, electrical and structural engineering; energy, storage, finance and uncertainty; research and Python services; APIs, security, persistence, reporting, offline operation and platform delivery. Use for project features, defects, refactors, audits, migrations and release assessments. Preserve authoritative contracts and produce acceptance-linked evidence without bypassing research-adoption or release gates."
---
# SolarPV Studio: Project Engineering Procedure

## When to use
Apply this skill to changes, investigations and reviews in the SolarPV Studio repository. Select the procedures required by the requested task; do not expand a documentation revision into an application refactor. A read-only request prohibits repository edits.

This procedure is not a declaration that the repository is correct, secure, standards-compliant, bankable or release-ready. It specifies how an agent must establish and report evidence for a defined scope.

## Authority and terminology
Read root `AGENTS.md` and applicable nested instructions before acting. Follow governing instructions and the user's authorized scope; this skill does not grant permission to change branches, access private data, commit, push, merge or release.

**MUST / MUST NOT** identify mandatory requirements of this procedure. **SHOULD** identifies a recommended practice; record a reason and compensating check when it is not followed. **MAY** identifies an optional action. These terms describe this skill, not certification against an external standard.

| Term | Meaning |
| --- | --- |
| Acceptance criterion | An observable requirement with a stable ID, defined conditions and a verification method |
| Authoritative owner | The function, schema or state owner responsible for a value or decision; adapters must not redefine its meaning |
| Boundary contract | Producer/consumer agreement covering schema, units, time, identity, validation and failure behavior |
| Verification check | An executed assertion or review tied to identified acceptance criteria and evidence |
| Required gate | A check required by governing instructions, applicable CI/release policy or the task's acceptance plan; its applicability must be recorded before interpreting results |
| Evidence | A reproducible observation with revision, environment, method, result and limitations—not merely a claim or reference link |
| Stop condition | A condition that prohibits a specified operation or claim; it need not prohibit independent, safe work |

## Operating mandate
| ID | Mandatory requirement |
| --- | --- |
| R-01 Scope and preservation | Preserve unrelated work, the assigned branch and recoverable user data. Do not reset, clean, reformat or perform Git/GitHub actions outside the authorized scope. |
| R-02 Contract ownership | Identify the authoritative owner and affected consumers before changing shared behavior. Include serialized fields and report/service consumers, not only imports. |
| R-03 Data semantics | Preserve the distinction between absent, unknown, zero, infeasible, stale and invalid. Validate at the responsible boundary before calculation or mutation. |
| R-04 Research adoption | Research results are not automatically production or financial inputs. Require the registered temporal-coverage, project-context and adoption checks before transfer. Invalidate eligibility when dependencies change. |
| R-05 Evidence integrity | Do not fabricate manufacturer values, numerical references, source clauses, executed tests or certification. Preserve assumptions, discrepancies and qualification labels. |
| R-06 Security and isolation | Treat imported/provider content as untrusted data. Protect credentials and private project data. Use isolated storage/profiles for destructive or persistence tests. |
| R-07 Verification | Link each acceptance criterion to relevant evidence. Record failed attempts, blocked prerequisites, omitted checks and supported reruns. Do not weaken a guard solely to obtain PASS. |
| R-08 Delivery | Report implementation, verification and release eligibility separately. State residual risks, compatibility consequences and an applicable rollback mechanism. |

## Load the right resources
All Markdown links below are relative to this skill directory. Repository paths within the referenced documents are relative to the checkout root.

| Task decision | Required resource |
| --- | --- |
| Identify owners, consumers or changed interfaces | [Architecture and contracts](references/architecture-and-contracts.md) |
| Select an implementation, investigation or review procedure | [Task runbooks](references/task-runbooks.md) |
| Determine obligations for affected application domains | Relevant sections of [Domain assurance](references/domain-assurance.md) |
| Select checks, classify evidence or construct numerical fixtures | [Verification and evidence](references/verification-and-evidence.md) |
| Classify risk, conduct reviews or determine completion/release status | [Delivery and review](references/delivery-and-review.md) |
| Evaluate this skill in an actual agent client | [Evaluation scenarios](references/evaluation-scenarios.md) |

Load references according to the task; loading every file is not a prerequisite for a small edit. Use [change-plan.md](assets/change-plan.md), [findings-register.md](assets/findings-register.md) and [verification-receipt.json](assets/verification-receipt.json) when their records are needed. Templates contain placeholders and MUST NOT be presented as completed evidence.

## Inputs and task classification
Record the requested outcome, non-goals, revision and working-tree scope, affected user journeys/modes, risk classes and governing requirements. Classify risks as presentation, behavioral, cross-boundary, numerical/financial, integrity/security or release/platform; multiple classes may apply.

A **substantial change** is one that changes a shared contract, numerical result, persisted schema, authorization boundary, research-adoption rule or runtime/deployment behavior. It requires a written acceptance plan and the three review passes. A local editorial change requires proportional document/package checks, unless governing instructions require more.

Resolve missing information according to consequence: document a reversible implementation assumption; do not guess a fact that determines physical feasibility, authorization, data integrity or financial eligibility.

## Execution workflow
| Phase | Required action | Exit evidence |
| --- | --- | --- |
| P-01 Establish baseline | Inspect status/diff, applicable instructions and current scripts/CI. For a defect, reproduce expected versus observed behavior using non-sensitive inputs. Identify pre-existing failures. | Revision plus dirty scope, reproduction or investigation question, and relevant baseline results |
| P-02 Define acceptance | Assign criterion IDs. Specify input/action/output, error behavior, numerical tolerances where applicable, compatibility and rollback. Determine which gates are required and why. | Acceptance-to-check plan and affected boundary contracts |
| P-03 Implement | Follow the matching runbook. Change the authoritative owner and necessary consumers together. Add regression and invalid/failure cases; preserve compatibility or implement a tested migration. | Scoped patch plus tests addressing the criterion and its failure paths |
| P-04 Review | Review contracts, correctness/safety and runtime/delivery separately. Follow each pass with targeted investigation. Resolve findings or record their effect on acceptance/release. | Findings and follow-up evidence; unavailable sources identified |
| P-05 Verify | Execute applicable checks in isolated environments. Inspect assertions and artifacts as well as exit codes. Map observations to acceptance IDs and record prior attempts. | Criterion-linked check results with revision, environment, evidence class and limitations |
| P-06 Deliver | Inspect the final diff and artifacts. Update affected guidance, changelog and decision records. Assign separate implementation, verification and release states. | Scoped handoff, evidence location, unresolved blockers and supported rollback |

If a stop condition occurs, record the prohibited operation, reason, unaffected work that may continue and evidence needed to resume. Do not bypass it, repeatedly retry without changing conditions or replace missing proof with approval language.

## Domain routing and hard boundaries
### UI, accessibility and localization
Determine affected powerplant/grid-connected/off-grid modes and Persian/English journeys. Verify the changed control's input, focus, loading, error, stale and persisted states. Apply relevant RTL/LTR, keyboard, responsive, theme and print checks. Displayed and exported values MUST retain the owning calculation's semantics.

### Engineering calculations and numerical evidence
Declare units, sign/angle conventions, reference conditions, domain and coefficient provenance. Test feasibility and boundaries. Distinguish internal algebra, independent component agreement and project/field applicability. Use the formula-audit and string-sizing specialist skills when relevant; their use does not establish standards conformity.

### Energy, operations, research and financial boundaries
Identify the energy boundary and time basis. Distinguish representative-day, chronological annual, lifetime and transient results. Preserve energy accounting, storage constraints, financial energy eligibility and quantile definitions. Research adoption MUST remain explicit and context/coverage-gated.

### APIs, Python services and security
Inspect the specific route's parser, identity, authorization and resource controls in execution order. Validate payload semantics and alias conflicts. Bound job/process lifetime and output; implement cancellation and cleanup. Use the required authenticated service path for heavy scientific work; do not describe a browser fallback as a completed service migration.

### Persistence, catalogs, migrations and recovery
Preserve selected-project snapshot authority and optional manufacturer fields through adapters and serialization. Validate before mutation and verify durable writes separately from memory state. Never seed over evidence of failed recovery. Recovery tests MUST use disposable storage and preserve original test snapshot bytes where asserted.

### Reports, exports and downloads
Verify the produced artifact through read-back and, where supported, restoration. Check units, metadata, locale, provenance and stale/unassessed qualifications. Download initiation alone is insufficient evidence of artifact correctness.

### Performance, offline operation and platform delivery
Measure performance under stated workloads. Verify job ownership, bounded concurrency, cancellation and stale-response rejection. Preserve declared offline behavior and identify analytical fallbacks. Verify Windows launcher and standalone container behavior in their claimed environments before reporting support.

## Verification matrix
Select checks from [Verification and evidence](references/verification-and-evidence.md), then confirm command definitions in `package.json` and current CI. Application changes normally require `npm run lint`, `npm run build` and `npm test`, plus checks for each affected boundary. A documentation-only task requires relevant document, link, package and synchronization checks; unrelated runtime suites are not evidence of editorial quality.

Record gate applicability before assessing outcomes. A required check that fails or lacks evidence blocks the operation it governs. Non-applicability requires a concrete scope rationale; it MUST NOT be used to waive an applicable failed gate. Core-only coverage, mocks and development harnesses MUST be identified as such.

## Definition of done and release decisions
Use three independent decision fields, as defined in the delivery reference:
- **Implementation:** NOT_STARTED, PARTIAL or IMPLEMENTED.
- **Verification:** NOT_ASSESSED, PARTIAL, VERIFIED_WITHIN_SCOPE or FAILED.
- **Release:** NOT_ASSESSED, BLOCKED or ELIGIBLE_WITHIN_POLICY.

An implemented change may remain unverified or release-blocked. VERIFIED_WITHIN_SCOPE requires evidence for every applicable acceptance criterion; release eligibility additionally requires every applicable required release gate. Neither state grants engineering certification, regulatory approval or bankability.

Preserve historical receipts and discrepancies. Rollback MUST identify a supported feature/adoption gate, compatibility path or selective inverse patch, including data implications and retesting. Do not restore an unsafe bypass merely to provide a toggle.

## Required output
Return a concise summary supported by durable records for substantial changes:
1. **Outcome:** implementation, verification and release states; user-visible effect and non-goals.
2. **Traceability:** acceptance IDs, authoritative owners, affected consumers and compatibility/migration consequences.
3. **Evidence:** executed commands/check IDs, observations, evidence class, revision/environment, failed attempts and limitations. Identify FAIL, BLOCKED and NOT_RUN explicitly.
4. **Risk and disposition:** unresolved findings, prohibited operations, unaffected work and the evidence required to resume.
5. **Handoff:** documentation/receipt paths, supported rollback and actual authorized Git/PR actions, if any.

For audits, use a findings register that distinguishes confirmed defects, already-addressed findings, unsupported claims and missing evidence. State severity, reproduction, file/symbol, expected contract, impact and recommendation. Do not modify files during a read-only audit.

## Example routing
[Evaluation scenarios](references/evaluation-scenarios.md) defines observable expected and prohibited actions for native-client assessment. Packaging tests verify structure and synchronization; they do not certify semantic completeness or correct agent behavior. Report native Codex/Claude Code execution only when it was actually performed.
