import assert from 'node:assert/strict';
import fs from 'node:fs';
import { changedFormulaUnits, extractFormulaUnits, validateEvidenceRecords } from './verify-physics-reference-gate';

const sourceBefore = `export function calculate(input: number) {\n  const power = input * 2 + 1;\n  return power <= 100;\n}`;
const sourceAfterCoefficientChange = `export function calculate(input: number) {\n  const power = input * 2 + 1.5;\n  return power <= 100;\n}`;
const changed = changedFormulaUnits('src/engine/exampleEngine.ts', sourceBefore, sourceAfterCoefficientChange);
assert.ok(changed.length >= 1, 'a changed equation coefficient produces a formula-fixture obligation');
assert.ok(changed.every((unit) => unit.formulaId.startsWith('src/engine/exampleEngine.ts#calculate#')));
assert.ok(validateEvidenceRecords(changed.map((unit) => unit.formulaId), []).length > 0, 'missing independent evidence fails closed');

const commentOnly = changedFormulaUnits(
  'src/engine/exampleEngine.ts',
  sourceBefore,
  `// Clarified prose only.\n${sourceBefore}`,
);
assert.equal(commentOnly.length, 0, 'comment-only edits do not create false formula changes');

const variableChange = changedFormulaUnits(
  'src/engine/exampleEngine.ts',
  'export function calculate(x: number, y: number) { return x * 2 + y; }',
  'export function calculate(x: number, y: number) { return y * 2 + x; }',
);
assert.ok(variableChange.length > 0, 'changing equation inputs/terms creates a formula-fixture obligation');
const callChange = changedFormulaUnits(
  'src/engine/exampleEngine.ts',
  'export function calculate(x: number) { return solveA(x); }',
  'export function calculate(x: number) { return solveB(x); }',
);
assert.ok(callChange.length > 0, 'changing a calculation/helper call site creates a formula-fixture obligation');
const branchFormulaChange = changedFormulaUnits(
  'src/engine/exampleEngine.ts',
  'export function calculate(x: number) { return x < 3 ? x * 2 : x * 4; }',
  'export function calculate(x: number) { return x < 3 ? x * 2 : x * 5; }',
);
assert.ok(branchFormulaChange.length > 0, 'changing a piecewise formula branch creates a fixture obligation');
const signChange = changedFormulaUnits(
  'src/engine/exampleEngine.ts',
  'export function calculate(x: number) { return x; }',
  'export function calculate(x: number) { return -x; }',
);
assert.ok(signChange.length > 0, 'changing a formula sign creates a fixture obligation');

const unchangedBooleanContract = changedFormulaUnits(
  'src/engine/exampleEngine.ts',
  'export function status(a: boolean, b: boolean) { return a && b; }',
  'export function status(a: boolean, b: boolean) { return b && a; }',
);
assert.equal(unchangedBooleanContract.length, 0, 'non-numerical status wiring does not require scientific reference data');

const formulaId = extractFormulaUnits('src/engine/exampleEngine.ts', sourceAfterCoefficientChange)[0].formulaId;
const validRecord = {
  formulaId,
  fixtureFile: 'scripts/fixtures/physics/example-reference.json',
  testFile: 'scripts/verify-example-reference.ts',
  referenceTitle: 'Independent technical reference',
  referenceUrl: 'https://example.org/reference',
  referenceVersion: '2026 edition',
  referenceLocator: 'Equation 4, Table 2',
};
assert.deepEqual(validateEvidenceRecords([formulaId], [validRecord]), [], 'complete independent-reference metadata satisfies the manifest contract');
assert.ok(validateEvidenceRecords([formulaId], [{ ...validRecord, referenceUrl: 'http://example.org/reference' }]).length > 0, 'insecure/non-source URL fails closed');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
assert.match(packageJson.scripts['test:audit'], /verify:physics-reference-gate/, 'audit suite must run the reference gate');
const workflow = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
assert.match(workflow, /name: Physics Registry & Independent Reference Gate/, 'dedicated CI job must have a discoverable stable check name');
assert.match(workflow, /fetch-depth: 0/, 'gate checkout must have history to compare its base');
assert.match(workflow, /verify-physics-reference-gate\.ts/, 'dedicated workflow must invoke the independent reference gate');
assert.match(workflow, /PHYSICS_DIFF_BASE:/, 'workflow must pass the push/PR base to the detector');

console.log('Physics reference gate tests passed (formula mutations fail closed; prose-only edits do not; CI wiring is present).');
