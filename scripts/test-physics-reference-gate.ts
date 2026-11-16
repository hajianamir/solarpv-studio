import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { changedFormulaUnits, executeReferenceFixture, extractFormulaUnits, validateEvidenceRecords } from './verify-physics-reference-gate';

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
const compoundAssignmentChange = changedFormulaUnits(
  'src/engine/exampleEngine.ts',
  'export function accumulate(sum: number, x: number) { sum += x; return sum; }',
  'export function accumulate(sum: number, x: number) { sum -= x; return sum; }',
);
assert.ok(compoundAssignmentChange.some((unit) => unit.expression.includes('sum-=x')), 'changing += to -= creates a fixture obligation');
const updateOperatorChange = changedFormulaUnits(
  'src/engine/exampleEngine.ts',
  'export function accumulate(sum: number) { sum++; return sum; }',
  'export function accumulate(sum: number) { sum--; return sum; }',
);
assert.ok(updateOperatorChange.length > 0, 'changing a post-increment to post-decrement creates a fixture obligation');

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
  productionExport: 'calculate',
  referenceTitle: 'Independent technical reference',
  referenceUrl: 'https://example.org/reference',
  referenceVersion: '2026 edition',
  referenceLocator: 'Equation 4, Table 2',
};
assert.deepEqual(validateEvidenceRecords([formulaId], [validRecord]), [], 'complete independent-reference metadata satisfies the manifest contract');
assert.ok(validateEvidenceRecords([formulaId], [{ ...validRecord, referenceUrl: 'http://example.org/reference' }]).length > 0, 'insecure/non-source URL fails closed');
assert.ok(validateEvidenceRecords([formulaId], [{ ...validRecord, productionExport: 'not-valid-export!' }]).length > 0, 'malformed production export fails closed');

// Exercise the same runner used by CI against a temporary real TS module. A
// deliberately wrong fixture must fail numeric comparison, proving that the
// gate calls production code rather than trusting test-file text or assertions.
const fixtureRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'physics-reference-gate-'));
try {
  fs.mkdirSync(path.join(fixtureRepo, 'src/engine'), { recursive: true });
  fs.mkdirSync(path.join(fixtureRepo, 'scripts/fixtures/physics'), { recursive: true });
  fs.writeFileSync(path.join(fixtureRepo, 'src/engine/exampleEngine.ts'), 'export function calculate(x: number) { return x * 2 + 1; }');
  const fixturePath = path.join(fixtureRepo, validRecord.fixtureFile);
  const runtimeFixture = {
    schemaVersion: 1,
    formulaId,
    independentOfImplementation: true,
    productionExport: 'calculate',
    inputs: [3],
    expected: 7,
    tolerances: { absolute: 1e-12, relative: 1e-12 },
    referenceSource: {
      title: validRecord.referenceTitle,
      url: validRecord.referenceUrl,
      version: validRecord.referenceVersion,
      locator: validRecord.referenceLocator,
    },
  };
  fs.writeFileSync(fixturePath, JSON.stringify(runtimeFixture));
  await executeReferenceFixture(validRecord, fixtureRepo);
  fs.writeFileSync(fixturePath, JSON.stringify({ ...runtimeFixture, expected: 8 }));
  await assert.rejects(() => executeReferenceFixture(validRecord, fixtureRepo), /expected 8/,
    'mismatched independent output must fail after executing the production export');
} finally {
  fs.rmSync(fixtureRepo, { recursive: true, force: true });
}

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
assert.match(packageJson.scripts['test:audit'], /verify:physics-reference-gate/, 'audit suite must run the reference gate');
const workflow = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
assert.match(workflow, /name: Physics Registry & Independent Reference Gate/, 'dedicated CI job must have a discoverable stable check name');
assert.match(workflow, /fetch-depth: 0/, 'gate checkout must have history to compare its base');
assert.match(workflow, /verify-physics-reference-gate\.ts/, 'dedicated workflow must invoke the independent reference gate');
assert.match(workflow, /PHYSICS_DIFF_BASE:/, 'workflow must pass the push/PR base to the detector');

console.log('Physics reference gate tests passed (formula mutations fail closed; prose-only edits do not; CI wiring is present).');
