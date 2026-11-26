# Change plan: <task identifier>

Template only. Replace placeholders with task-specific facts. Do not mark a criterion satisfied before its required evidence exists.

## 1. Baseline and authority
- Requested outcome and authorized operations:
- Commit, branch and relevant uncommitted changes:
- Governing instructions and applicable CI/release policy:
- Existing failures or unavailable environments:
- Scope and explicit non-goals:
- Risk classes and rationale:

## 2. Acceptance specification
| Criterion ID | Preconditions: mode/project/input | Action | Observable output/state | Threshold and rationale | Invalid/failure behavior | Planned check IDs |
| --- | --- | --- | --- | --- | --- | --- |
| AC-01 | | | | | | CHECK-01 |

## 3. Boundary contracts
| Contract ID | Authoritative owner | Producer → consumer | Schema/version | Units, time and identity | Absent/default/error/stale semantics | Validation owner | Compatibility impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BC-01 | | | | | | | |

## 4. Implementation and review plan
- Minimal coherent patch and affected consumers:
- Data/schema/API changes and migration behavior:
- Numerical source, validity domain and independent evidence requirements:
- Financial/research adoption and stale-dependency checks:
- Authorization, resource, persistence and recovery checks:
- Review 1: contract findings and follow-up investigation:
- Review 2: correctness/safety findings and follow-up investigation:
- Review 3: runtime/delivery findings and follow-up investigation:

## 5. Gate applicability and verification
| Check ID | Acceptance IDs | Command/review method | Required? Governing reason | Preconditions and isolated environment | Expected assertions and evidence class | Artifact location |
| --- | --- | --- | --- | --- | --- | --- |
| CHECK-01 | AC-01 | | Unassessed | | | |

## 6. Stop conditions and rollback
- Prohibited operation/claim if a condition fails:
- Criterion or gate affected:
- Safe work that may continue:
- Specific evidence/input/change needed to resume:
- Supported disable/rollback mechanism:
- Data/schema implications and compatibility limits:
- Post-rollback verification:

## 7. Delivery obligations
- User guide/help/changelog/ADR updates and applicability:
- Criterion-to-evidence receipt location:
- Implementation state:
- Verification state:
- Release state and policy basis:
