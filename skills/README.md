# Portable repository skills

These skills use the shared [Agent Skills](https://agentskills.io/specification) layout:

```text
<skill-name>/
  SKILL.md          # YAML frontmatter and concise routing instructions
  references/       # Task-loaded architecture, runbooks and assurance guidance
  assets/           # Reusable plans, findings and evidence-receipt templates
```

The frontmatter deliberately uses only shared fields, with lowercase hyphenated names matching their directories. Descriptions explain both the task and when to use the skill. Instructions include inputs/context, procedure, output expectations and relevant limits. No Claude-only tool permissions, Codex-only metadata or machine-specific absolute paths are required.

## Start here: whole-project engineering

Use **`solarpv-studio-engineering`** as the primary skill for the entire repository. It covers the delivery lifecycle and all major subsystems: UI/localization/accessibility, numerical engineering, energy/operations, finance/uncertainty, research/Python services, APIs/security, external data, catalogs/persistence/recovery, exports, performance/offline behavior, Windows/container delivery and release evidence.

Its entry point defines mandatory requirement IDs, execution phases with exit evidence, and separate implementation/verification/release decisions. It routes to six supporting guides: architecture/contracts, nine task runbooks, domain assurance, verification/evidence, delivery/review, and nine native-agent evaluation scenarios. Three reusable assets provide a change plan, findings register and verification-receipt template. Acceptance and check IDs link requirements to evidence; the receipt defaults to unassessed states and does not preselect evidence class or gate applicability. Its purpose is to coordinate project-wide work; specialist skills add detail rather than replace that process.

| Skill | Role |
| --- | --- |
| `solarpv-studio-engineering` | Primary whole-project implementation, maintenance, review and release playbook |
| `solarpv-studio-navigation` | Focused ownership/consumer tracing and repository orientation |
| `pv-formula-audit` | Specialist numerical-formula and provenance audit |
| `pv-string-sizing-iec62548` | Specialist string-voltage and temperature-coefficient review |

## Discovery and invocation

| Client | Repository discovery path | Explicit invocation |
| --- | --- | --- |
| Codex | `.agents/skills/<name>/SKILL.md` | Start with `$solarpv-studio-engineering`; mention a specialist skill when needed. |
| Claude Code | `.claude/skills/<name>/SKILL.md` | Start with `/solarpv-studio-engineering`; invoke a specialist skill when needed. |

Clients can also select a skill from its description. Open the repository as the workspace and use a client version supporting repository skills. Repository code paths inside instructions are repository-relative; Markdown links to bundled references/assets are skill-relative. For personal installation, copy the entire individual skill directory, including references and assets, into the corresponding client's user skills directory; repository-specific instructions still require this checkout.

## Single-source maintenance

1. Edit the canonical bundle in `skills/<name>/` (entry point, references and assets as applicable).
2. Run `npm run skills:sync` to write both complete client discovery bundles.
3. Run `npm run test:skills` and commit source plus generated copies together.

Regular files, rather than symlinks, keep Windows checkouts usable. `skills:check` checks exact parity without writing. The sync tool only writes the source-named files recursively within each skill destination; it does not delete unrelated or personal skills in client directories. Removing/renaming a canonical skill requires explicitly removing its old generated copies too.

## Validation scope

The dependency-free validator checks our deliberately narrow frontmatter subset, name/directory rules, description limits, usage/output sections, and byte-for-byte discovery-copy parity. Negative tests cover missing frontmatter, invalid/mismatched names, empty description and missing output section. Whole-project scope checks also verify required delivery domains and that explicit npm commands across the primary skill and reference guides exist in package.json. Tests also exercise local resource links, safe template defaults, recursive missing/drift detection, symlink rejection and preservation of unrelated skills in an isolated temporary workspace. These are structural/content checks, not proof that the skill produces correct agent decisions. It is not a general YAML parser or a native Codex/Claude Code runtime certification. Native CLI invocation has not been tested in this sandbox. The bundled evaluation scenarios specify observable expected and prohibited actions for a future native-client assessment; their presence is not a passed behavioral evaluation.

No physics or finance code changes are part of this packaging change. Existing validation/release blockers remain in force. To roll back discovery installation, remove the generated skill directories for the relevant client; the canonical instructions remain readable in `skills/`.
