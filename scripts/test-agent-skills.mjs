import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSkill, collectSkillFiles, syncSkills } from './sync-agent-skills.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'skills/solarpv-studio-engineering');
const text = await readFile(resolve(root, 'skills/pv-formula-audit/SKILL.md'), 'utf8');
validateSkill(text, 'pv-formula-audit');
assert.throws(() => validateSkill(text.replace(/^---\n/, ''), 'pv-formula-audit'));
assert.throws(() => validateSkill(text, 'different-name'));
assert.throws(() => validateSkill(text.replace('name: pv-formula-audit', 'name: Invalid_Name'), 'Invalid_Name'));
assert.throws(() => validateSkill(text.replace(/description: .*\n/, 'description: ""\n'), 'pv-formula-audit'));
assert.throws(() => validateSkill(text.replace('## Required output', '## Omitted'), 'pv-formula-audit'));
await syncSkills(true);

const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const primary = await readFile(resolve(source, 'SKILL.md'), 'utf8');
validateSkill(primary, 'solarpv-studio-engineering');
assert.ok(primary.split('\n').length < 250, 'Keep the entry point concise; put detailed procedures in bundled references');
for (const section of [
  '## Operating mandate', '## Load the right resources', '## Inputs and task classification',
  '## Execution workflow', '## Domain routing and hard boundaries', '## Verification matrix',
  '## Definition of done and release decisions', '## Required output',
]) assert.ok(primary.includes(section), `Missing primary section: ${section}`);

const files = await collectSkillFiles(source);
for (const expected of [
  'references/architecture-and-contracts.md', 'references/domain-assurance.md',
  'references/task-runbooks.md', 'references/verification-and-evidence.md',
  'references/delivery-and-review.md', 'references/evaluation-scenarios.md',
  'assets/change-plan.md', 'assets/findings-register.md', 'assets/verification-receipt.json',
]) assert.ok(files.includes(expected), `Missing bundled resource: ${expected}`);

function validateCommands(markdown) {
  for (const [, command] of markdown.matchAll(/`npm run ([a-z][a-z0-9:-]*)`/g)) {
    assert.ok(Object.hasOwn(packageJson.scripts, command), `Unknown npm script: ${command}`);
  }
}
async function validateLinks(markdown, file) {
  for (const [, link] of markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    if (/^https?:\/\//.test(link) || link.startsWith('#')) continue;
    const target = resolve(dirname(file), link.split('#')[0]);
    const path = relative(source, target);
    assert.ok(path && !path.startsWith('..') && !path.startsWith('/'), `Link escapes skill bundle: ${link}`);
    await readFile(target);
  }
}
let bundle = '';
for (const file of files.filter(file => file.endsWith('.md'))) {
  const path = resolve(source, file);
  const markdown = await readFile(path, 'utf8');
  validateCommands(markdown);
  await validateLinks(markdown, path);
  bundle += '\n' + markdown;
}
assert.throws(() => validateCommands('`npm run nonexistent-skill-example`'));
await assert.rejects(() => validateLinks('[missing](references/not-present.md)', resolve(source, 'SKILL.md')));
await assert.rejects(() => validateLinks('[escape](../../package.json)', resolve(source, 'SKILL.md')));
for (const section of [
  '## UI, accessibility and localization', '## Numerical and engineering models',
  '## Energy, storage and dynamic operation', '## Research, measurements and adoption',
  '## Finance, tariffs, portfolio and uncertainty', '## Security, APIs and services',
  '## Persistence, exports, offline delivery and recovery',
  '## A. Defect correction', '## B. New cross-system feature', '## C. Numerical-model change',
  '## D. Research/Python study', '## E. Data/schema/catalog migration',
  '## F. Security/API/service correction', '## G. Refactor/performance improvement',
  '## H. Release/dependency/platform work', '## I. Audit or documentation-only task',
]) assert.ok(bundle.includes(section), `Missing domain/runbook: ${section}`);
assert.ok(bundle.includes('Never seed over evidence of failed recovery'));
assert.ok(bundle.includes('Research results are not automatically production or financial inputs'));
assert.ok(bundle.includes('not a declaration that the repository is correct'));
assert.ok(bundle.includes('not claims of executed client behavior'));
assert.equal((bundle.match(/## Case \d+ —/g) ?? []).length, 9);
const template = JSON.parse(await readFile(resolve(source, 'assets/verification-receipt.json'), 'utf8'));
assert.equal(template.templateOnly, true);
assert.deepEqual(template.decision, {
  implementation: 'NOT_STARTED', verification: 'NOT_ASSESSED', release: 'NOT_ASSESSED', rationale: 'TEMPLATE_NOT_ASSESSED',
});
assert.ok(template.checks.every(check => check.required === null && check.evidenceClass === null));
const checkIds = new Set(template.checks.map(check => check.id));
const acceptanceIds = new Set(template.acceptance.map(criterion => criterion.id));
for (const criterion of template.acceptance) for (const id of criterion.checkIds) assert.ok(checkIds.has(id));
for (const check of template.checks) for (const id of check.acceptanceIds) assert.ok(acceptanceIds.has(id));
for (const id of ['R-01', 'R-02', 'R-03', 'R-04', 'R-05', 'R-06', 'R-07', 'R-08', 'P-01', 'P-02', 'P-03', 'P-04', 'P-05', 'P-06']) {
  assert.ok(primary.includes(id), `Missing normative requirement/phase ID: ${id}`);
}
for (const term of ['MUST / MUST NOT', 'Authoritative owner', 'Boundary contract', 'Required gate', 'Stop condition']) {
  assert.ok(primary.includes(term), `Undefined procedural term: ${term}`);
}
assert.ok(template.checks.every(check => check.status === 'NOT_RUN'));
assert.ok(template.acceptance.every(criterion => criterion.status === 'NOT_RUN'));

// Exercise actual nested-copy drift/missing-resource handling in a disposable workspace.
const temp = await mkdtemp(resolve(tmpdir(), 'solarpv-skills-'));
try {
  await mkdir(resolve(temp, 'skills/pv-formula-audit/references'), { recursive: true });
  await writeFile(resolve(temp, 'skills/pv-formula-audit/SKILL.md'), text);
  await writeFile(resolve(temp, 'skills/pv-formula-audit/references/example.md'), '# Canonical reference\n');
  await assert.rejects(() => syncSkills(true, temp), /Missing/);
  await syncSkills(false, temp);
  await syncSkills(true, temp);
  const copied = resolve(temp, '.claude/skills/pv-formula-audit/references/example.md');
  await writeFile(copied, '# Drift\n');
  await assert.rejects(() => syncSkills(true, temp), /Drift/);
  await syncSkills(false, temp);
  await rm(copied);
  await assert.rejects(() => syncSkills(true, temp), /Missing/);
  await mkdir(resolve(temp, '.agents/skills/personal-skill'), { recursive: true });
  const personal = resolve(temp, '.agents/skills/personal-skill/keep.md');
  await writeFile(personal, 'Do not touch');
  await syncSkills(false, temp);
  assert.equal(await readFile(personal, 'utf8'), 'Do not touch');
  if (process.platform !== 'win32') {
    await symlink(resolve(temp, 'skills/pv-formula-audit/SKILL.md'), resolve(temp, 'skills/pv-formula-audit/references/symlink.md'));
    await assert.rejects(() => syncSkills(false, temp), /symlinks/);
  }
} finally {
  await rm(temp, { recursive: true, force: true });
}
console.log('PASS skill metadata, bundled resources/links, npm inventory, template safety, scope checks, recursive copy parity, negative drift/missing/symlink tests and unrelated-skill preservation. Native client behavior and semantic completeness are NOT certified.');
