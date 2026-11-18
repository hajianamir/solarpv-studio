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

// Only the verified local snow-stage description arguments are prose. These
// two ternaries reproduce the former #85396c0f10ad / #bcace70942a8 obligations.
const waterfallPath = 'src/engine/waterfallLossEngine.ts';
const snowDisplay = `export function computeWaterfallLosses(snowLossPct: number) {
  const stages: unknown[] = [];
  const addStage = (id: string, nameFa: string, nameEn: string, pct: number, descFa: string, descEn: string) => {
    stages.push({ id, nameFa, nameEn, percentageLoss: pct, descriptionFa: descFa, descriptionEn: descEn });
  };
  addStage('snow', 'برف', 'Snow', -Math.abs(snowLossPct),
    snowLossPct > 0 ? 'برآورد اولیهٔ برف؛ مدل Marion یا درصد تلفات سالانهٔ اعتبارسنجی‌شده نیست' : 'ورودی تلفات برف صفر است؛ نبود برف در سایت از این مقدار اثبات نمی‌شود',
    snowLossPct > 0 ? 'Preliminary snow estimate; not the Marion model or an independently validated annual loss.' : 'Snow-loss input is zero (no-op); this does not establish a snow-free site.');
  return stages;
}`;
for (const [from, to] of [
  ['برآورد اولیهٔ برف؛ مدل Marion یا درصد تلفات سالانهٔ اعتبارسنجی‌شده نیست', 'توضیح فارسی جدید'],
  ['Preliminary snow estimate; not the Marion model or an independently validated annual loss.', 'Revised English description'],
  ['ورودی تلفات برف صفر است؛ نبود برف در سایت از این مقدار اثبات نمی‌شود', 'توضیح فارسیِ ورودی صفر'],
  ['Snow-loss input is zero (no-op); this does not establish a snow-free site.', 'Revised zero-input description'],
]) {
  assert.equal(changedFormulaUnits(waterfallPath, snowDisplay, snowDisplay.replace(from, to)).length, 0,
    'changing either language/branch of the verified snow description needs no physics fixture');
}
function requiresEvidence(file: string, before: string, after: string, reason: string): void {
  const changed = changedFormulaUnits(file, before, after);
  assert.ok(changed.length > 0, reason);
  assert.ok(validateEvidenceRecords(changed.map(u => u.formulaId), []).length > 0,
    `${reason}: the gate must require evidence, not merely detect an edit`);
}
requiresEvidence(waterfallPath, snowDisplay, snowDisplay.replace('-Math.abs(snowLossPct)', '-Math.abs(snowLossPct * 2)'), 'snow loss coefficient');
requiresEvidence(waterfallPath, snowDisplay, snowDisplay.replace('-Math.abs(snowLossPct)', 'Math.abs(snowLossPct)'), 'snow loss sign');
requiresEvidence(waterfallPath, snowDisplay, snowDisplay.replace('snowLossPct > 0', 'snowLossPct >= 0'), 'display predicate operator remains checked');
requiresEvidence(waterfallPath, snowDisplay, snowDisplay.replace('snowLossPct > 0', 'snowLossPct > 1'), 'display predicate threshold remains checked');
requiresEvidence(waterfallPath, snowDisplay, snowDisplay.replace("'snow', 'برف'", "'other', 'برف'"), 'another stage cannot borrow the snow display context');
const textEdit = snowDisplay.replace('Preliminary snow estimate;', 'Updated snow description;');
requiresEvidence('src/engine/unrelated.ts', snowDisplay, textEdit, 'a same-named function in another module is not exempt');
const unsafeDisplay = snowDisplay.replace('stages.push({', 'const coefficient = Number(descEn); stages.push({ coefficient,');
requiresEvidence(waterfallPath, unsafeDisplay, unsafeDisplay.replace('Preliminary snow estimate;', 'Updated snow description;'),
  'a helper that consumes description as a number is not exempt');
const wrongPosition = snowDisplay.replace("'Snow', -Math.abs(snowLossPct),", "snowLossPct > 0 ? 'name A' : 'name B', -Math.abs(snowLossPct),");
requiresEvidence(waterfallPath, wrongPosition, wrongPosition.replace("'name A'", "'name C'"),
  'string ternaries in a stage name argument remain outside the exemption');
const computedDescription = snowDisplay.replace("'Preliminary snow estimate; not the Marion model or an independently validated annual loss.'", 'String(snowLossPct * 2)');
requiresEvidence(waterfallPath, snowDisplay, computedDescription, 'computed description payloads are not exempt');
const numericText = 'export function compute(x: number) { const factor = x > 0 ? "2" : "3"; return x * Number(factor); }';
requiresEvidence(waterfallPath, numericText, numericText.replace('"2"', '"4"'), 'numeric-string coefficient');
const selectorText = 'export function compute(x: number) { const mode = x > 0 ? "fixed" : "tracker"; return mode === "fixed" ? x * 1.168 : x * 1.25; }';
requiresEvidence(waterfallPath, selectorText, selectorText.replace('? "fixed"', '? "tracker"'), 'string model selector');

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

const formulaId = extractFormulaUnits('src/engine/exampleEngine.ts', sourceAfterCoefficientChange)
  .find((unit) => unit.expression.includes('input*2+1.5'))!.formulaId;
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
assert.ok(validateEvidenceRecords([formulaId], [{ ...validRecord, productionExport: 'differentFunction' }]).some((error) => error.includes('must equal the function owner')), 'manifest export must match the function encoded in the formula ID');
const nestedSameNameSource = 'export function calculate(input: number) { return input * 5; } function unrelated() { function calculate(input: number) { return input * 2 + 1.5; } return calculate(1); }';
const nestedSameNameUnit = extractFormulaUnits('src/engine/exampleEngine.ts', nestedSameNameSource)
  .find((unit) => unit.expression.includes('input*2+1.5'))!;
assert.notEqual(nestedSameNameUnit.formulaId, formulaId, 'formula IDs encode lexical owner path, not only the leaf function name');
assert.ok(validateEvidenceRecords([nestedSameNameUnit.formulaId], [{ ...validRecord, formulaId: nestedSameNameUnit.formulaId }])
  .some((error) => error.includes('must equal the function owner')), 'nested same-named calculation cannot be attributed to the top-level export');

// Exercise the same runner used by CI against a temporary real TS module. A
// deliberately wrong fixture must fail numeric comparison, proving that the
// gate calls production code rather than trusting test-file text or assertions.
const fixtureRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'physics-reference-gate-'));
try {
  fs.mkdirSync(path.join(fixtureRepo, 'src/engine'), { recursive: true });
  fs.mkdirSync(path.join(fixtureRepo, 'scripts/fixtures/physics'), { recursive: true });
  fs.writeFileSync(path.join(fixtureRepo, 'src/engine/exampleEngine.ts'), 'export function calculate(input: number) { return input * 2 + 1.5; }');
  const fixturePath = path.join(fixtureRepo, validRecord.fixtureFile);
  const runtimeFixture = {
    schemaVersion: 1,
    formulaId,
    independentOfImplementation: true,
    productionExport: 'calculate',
    inputs: [3],
    expected: 7.5,
    independentCalculation: 'Evaluate the stated fixture formula independently from the production implementation.',
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

  fs.writeFileSync(fixturePath, JSON.stringify({ ...runtimeFixture, productionExport: 'other' }));
  await assert.rejects(() => executeReferenceFixture({ ...validRecord, productionExport: 'other' }, fixtureRepo), /same function owner/,
    'an export with a different name from the formula owner must be rejected');

  fs.writeFileSync(fixturePath, JSON.stringify(runtimeFixture));
  fs.writeFileSync(path.join(fixtureRepo, 'src/engine/exampleEngine.ts'), 'export function calculate(input: number) { return input * 5; } function unrelated() { function calculate(input: number) { return input * 2 + 1.5; } return calculate(1); }');
  await assert.rejects(() => executeReferenceFixture(validRecord, fixtureRepo), /formula unit is not present|direct named owner containing this formula expression/,
    'an export that no longer contains the formula expression must be rejected');

  fs.writeFileSync(path.join(fixtureRepo, 'src/engine/exampleEngine.ts'), 'export function calculate(input: number) { if (false) { return input * 2 + 1.5; } return 7.5; }');
  await assert.rejects(() => executeReferenceFixture(validRecord, fixtureRepo), /fixture inputs did not execute the exact formula AST node/,
    'a formula node in an unexecuted branch must fail the execution probe');

  const duplicateSource = 'export function calculate(input: number) { const output = input * 2 + 1.5; const unused = input * 2 + 1.5; return output; }';
  const duplicateUnits = extractFormulaUnits('src/engine/exampleEngine.ts', duplicateSource)
    .filter((unit) => unit.expression === 'input*2+1.5');
  assert.equal(duplicateUnits.length, 2, 'identical formula occurrences are separately identified');
  const unusedOccurrence = duplicateUnits[1];
  const unusedOccurrenceRecord = { ...validRecord, formulaId: unusedOccurrence.formulaId };
  fs.writeFileSync(path.join(fixtureRepo, 'src/engine/exampleEngine.ts'), duplicateSource);
  fs.writeFileSync(fixturePath, JSON.stringify({ ...runtimeFixture, formulaId: unusedOccurrence.formulaId }));
  await assert.rejects(() => executeReferenceFixture(unusedOccurrenceRecord, fixtureRepo), /perturbing the exact formula AST result did not change the production output/,
    'perturbing an unused duplicate formula occurrence must not be credited with the first occurrence output');

  fs.writeFileSync(path.join(fixtureRepo, 'src/engine/exampleEngine.ts'), 'export function calculate(input: number) { const unused = input * 2 + 1.5; void unused; return 7.5; }');
  fs.writeFileSync(fixturePath, JSON.stringify(runtimeFixture));
  await assert.rejects(() => executeReferenceFixture(validRecord, fixtureRepo), /perturbing the exact formula AST result did not change the production output/,
    'a formula node that executes but cannot affect the tested output must fail the influence probe');

  // A helper's first numeric field is reporting-only; only the second is consumed.
  const objectSource = `function calculatePair(input: number) {
    return { angleIncidenceDeg: input, iamCoupled: input * 2 };
  }
  export function calculate(input: number) {
    const pair = calculatePair(input);
    return pair.iamCoupled;
  }`;
  const objectUnit = extractFormulaUnits('src/engine/exampleEngine.ts', objectSource)
    .find((unit) => unit.ownerPath === 'calculate' && unit.expression === 'calculatePair(input)')!;
  const objectRecord = { ...validRecord, formulaId: objectUnit.formulaId };
  fs.writeFileSync(path.join(fixtureRepo, 'src/engine/exampleEngine.ts'), objectSource);
  const objectFixture = { ...runtimeFixture, formulaId: objectUnit.formulaId, inputs: [3], expected: 6 };
  fs.writeFileSync(fixturePath, JSON.stringify(objectFixture));
  await executeReferenceFixture(objectRecord, fixtureRepo);

  fs.writeFileSync(fixturePath, JSON.stringify({ ...objectFixture, expected: 7 }));
  await assert.rejects(() => executeReferenceFixture(objectRecord, fixtureRepo), /expected 7/,
    'object sensitivity must not bypass the independent reference assertion');

  const ratioSource = objectSource.replace('return pair.iamCoupled;',
    'return pair.angleIncidenceDeg / pair.iamCoupled;');
  fs.writeFileSync(path.join(fixtureRepo, 'src/engine/exampleEngine.ts'), ratioSource);
  fs.writeFileSync(fixturePath, JSON.stringify({ ...objectFixture, expected: 0.5 }));
  await executeReferenceFixture(objectRecord, fixtureRepo);
  // Mutating both fields by 50% would leave this ratio unchanged. Independent
  // single-property executions must detect both influences instead.

  const unusedObjectSource = objectSource.replace('return pair.iamCoupled;', 'return 6;');
  fs.writeFileSync(path.join(fixtureRepo, 'src/engine/exampleEngine.ts'), unusedObjectSource);
  fs.writeFileSync(fixturePath, JSON.stringify(objectFixture));
  await assert.rejects(() => executeReferenceFixture(objectRecord, fixtureRepo),
    /did not change the production output.*numeric properties: angleIncidenceDeg, iamCoupled/,
    'all numeric properties of an unused object must fail sensitivity');

  const unvisitedObjectSource = objectSource.replace(
    'const pair = calculatePair(input);',
    'if (false) { const pair = calculatePair(input); } const pair = { iamCoupled: 6 };',
  );
  fs.writeFileSync(path.join(fixtureRepo, 'src/engine/exampleEngine.ts'), unvisitedObjectSource);
  await assert.rejects(() => executeReferenceFixture(objectRecord, fixtureRepo),
    /fixture inputs did not execute the exact formula AST node/,
    'an unvisited object expression cannot pass via the correct constant output');

  const compoundSource = 'export function accumulate(sum: number, x: number) { sum += x; return sum; }';
  const compoundUnit = extractFormulaUnits('src/engine/exampleEngine.ts', compoundSource)
    .find((unit) => unit.expression.includes('sum+=x'))!;
  const compoundRecord = { ...validRecord, formulaId: compoundUnit.formulaId, productionExport: 'accumulate' };
  fs.writeFileSync(path.join(fixtureRepo, 'src/engine/exampleEngine.ts'), compoundSource);
  fs.writeFileSync(fixturePath, JSON.stringify({ ...runtimeFixture, formulaId: compoundUnit.formulaId, productionExport: 'accumulate', inputs: [2, 3], expected: 5 }));
  await executeReferenceFixture(compoundRecord, fixtureRepo);

  const incrementSource = 'export function increment(value: number) { value++; return value; }';
  const incrementUnit = extractFormulaUnits('src/engine/exampleEngine.ts', incrementSource)
    .find((unit) => unit.expression === 'value++')!;
  const incrementRecord = { ...validRecord, formulaId: incrementUnit.formulaId, productionExport: 'increment' };
  fs.writeFileSync(path.join(fixtureRepo, 'src/engine/exampleEngine.ts'), incrementSource);
  fs.writeFileSync(fixturePath, JSON.stringify({ ...runtimeFixture, formulaId: incrementUnit.formulaId, productionExport: 'increment', inputs: [4], expected: 5 }));
  await executeReferenceFixture(incrementRecord, fixtureRepo);
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
