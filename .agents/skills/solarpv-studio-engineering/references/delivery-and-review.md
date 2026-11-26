# Acceptance, review and delivery decisions

## 1. Acceptance specification
Before a substantial change, assign each criterion a stable ID and specify:

> Given **[input, mode, project and preconditions]**, when **[action/calculation]**, the system shall produce **[observable output/state]** within **[justified tolerance, if numerical]**. For **[invalid or failing condition]**, it shall **[reject, preserve, cancel or qualify]**. Verify through **[check ID and evidence class]**.

Each criterion MUST identify its authoritative owner, affected consumers and verification method. A criterion such as “works correctly” is not testable. Do not invent a numerical tolerance, safety factor or performance threshold; derive it from the requirement/reference or record the unresolved requirement.

List non-goals, deliberately unchanged behavior and compatibility requirements. Specify migration and rollback before modifying durable state. Small editorial changes MAY use a concise record rather than a separate plan file.

## 2. Risk and required treatment
| Risk class | Trigger | Minimum treatment |
| --- | --- | --- |
| Presentation | Text/layout changes without new data semantics | Affected locale, accessibility and layout checks |
| Behavioral | Input, selection or state-transition change | Reproduction, invalid/failure paths and affected modes |
| Cross-boundary | Serialized/API/Python/report/schema change | Producer/consumer contract, round-trip and rejection cases |
| Numerical/financial | Formula, coefficient, energy basis, cost/rate or quantile change | Units, provenance, domain, consumer consequences and applicable numerical/reference gates |
| Integrity/security | Recovery, authorization, file access or subprocess change | Isolated adversarial/failure tests and non-destructive defaults |
| Release/platform | Dependency, launcher, container or update-path change | Reproducible installation and final-runtime evidence for each claimed environment |

Multiple classes may apply. Apply their combined requirements; do not average risk. A gate is required when governing instructions, applicable CI/release policy or the acceptance plan require it. Record applicability and rationale before interpreting the gate's result. Do not relabel an applicable failure as out of scope after execution.

## 3. Independent decision fields
Implementation, verification and release are separate dimensions. Record all three; do not collapse them into “done.”

| Field | State | Exact meaning |
| --- | --- | --- |
| Implementation | NOT_STARTED | No implementation for the stated scope has been produced |
| Implementation | PARTIAL | Some planned changes are present; identify outstanding criteria |
| Implementation | IMPLEMENTED | Planned code/document changes are present; verification is assessed separately |
| Verification | NOT_ASSESSED | Acceptance evidence has not been assessed |
| Verification | PARTIAL | Some applicable criteria have evidence; at least one remains unverified or qualified |
| Verification | VERIFIED_WITHIN_SCOPE | Every applicable acceptance criterion has sufficient evidence of its specified class and no unresolved violation |
| Verification | FAILED | An applicable acceptance criterion has an observed unresolved violation |
| Release | NOT_ASSESSED | Release eligibility has not been evaluated or is outside the task's requested decision |
| Release | BLOCKED | At least one applicable required release gate is failed, missing, blocked or unresolved |
| Release | ELIGIBLE_WITHIN_POLICY | Every applicable required release gate has acceptable evidence under the declared policy |

A required gate with WARN is unresolved unless an existing applicable policy explicitly accepts that warning. Record that policy and retained limitation; the agent MUST NOT create an ad hoc exception to grant eligibility. A pre-existing failure is not necessarily caused by the patch, but it still constrains release when its gate applies.

Neither VERIFIED_WITHIN_SCOPE nor ELIGIBLE_WITHIN_POLICY confers standards conformity, engineering certification, regulatory approval or bankability. These require the applicable authority and evidence.

## 4. Review passes
For substantial changes, record observations, findings and follow-up investigation for each pass. Checkboxes alone do not constitute evidence.

### Pass 1 — Contract and compatibility
- Identify authoritative owners and all affected consumers, including serialized/report/service fields.
- Verify units, timestamps, identity, schema and absent/default/error semantics.
- Examine mode behavior, selected snapshots, exports and old-project compatibility.
- Follow up through actual call sites, serialized examples and boundary cases.

### Pass 2 — Correctness and safety
- Examine numerical assumptions, evidence applicability and undefined/invalid cases.
- Examine research/financial adoption, authorization, resource limits and mutation ordering.
- Verify no fabricated provenance, secrets or private datasets were introduced.
- Follow up through primary sources, independent fixtures, analytical derivation or adversarial cases; label the method and unavailable evidence.

### Pass 3 — Runtime and delivery
- Examine cancellation, cleanup, stale results, persistence/recovery and produced artifacts.
- Verify the relevant browser/HTTP/Python/final-runtime behavior or identify the missing environment.
- Check affected help, changelog and ADR requirements.
- Follow up through observed runtime tests and review the final diff and rollback path.

These passes are internal review. Do not describe them as three independent validations or field investigations.

## 5. Stop-condition protocol
For each stop, record:
1. The specific operation or claim that MUST NOT proceed.
2. The violated requirement, unsafe ambiguity or missing evidence.
3. The affected criteria, consumers and release/adoption gates.
4. Independent, safe work that MAY continue.
5. The concrete input, corrective change or evidence needed to resume.

Examples: missing reference data prohibits an independent-validation/release claim; it need not prevent documenting internal regression results. Ambiguous write authorization prohibits the write; it does not prohibit read-only inspection. Do not retry a blocked operation without changing the prerequisite or documenting new evidence.

## 6. Rollback and disabling
Identify an actual supported mechanism: feature/adoption gate, tested compatibility path or selective inverse patch. Describe the affected state/schema, data-preservation method and post-rollback checks. If downgrade compatibility is untested, state that explicitly.

Rollback MUST NOT bypass authentication, recovery protection, physical feasibility or research adoption. It MUST NOT reset unrelated work or silently reinstate a known-unsafe calculation.

## 7. Git and PR delivery
Perform only authorized actions on the assigned branch. Review staged content, generated resources and secrets exposure before commit/push. Exclude local environments, caches, private data and build artifacts unless required by repository policy.

A PR description SHOULD identify scope, acceptance evidence, migrations, rollback and unresolved gates. Report the actual operation result and URL; creation of a PR is not evidence of CI success or merge completion.

## 8. Handoff quality
Lead with the three decision fields and the user-visible outcome. Reference criterion/check IDs and durable evidence instead of dumping logs. State residual limitations and the next unblock condition. Avoid unqualified completion, accuracy, security or release claims.
