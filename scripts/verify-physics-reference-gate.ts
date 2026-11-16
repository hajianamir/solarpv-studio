import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

export interface FormulaUnit {
  formulaId: string;
  sourceFile: string;
  functionName: string;
  expression: string;
}

export interface PhysicsReferenceRecord {
  formulaId: string;
  fixtureFile: string;
  productionExport: string;
  referenceTitle: string;
  referenceUrl: string;
  referenceVersion: string;
  referenceLocator: string;
}

interface PhysicsReferenceFixture {
  schemaVersion?: number;
  formulaId?: string;
  independentOfImplementation?: boolean;
  productionExport?: string;
  inputs?: unknown[];
  expected?: unknown;
  tolerances?: { absolute?: number; relative?: number };
  referenceSource?: { title?: string; url?: string; version?: string; locator?: string };
}

function isArithmeticOperator(kind: ts.SyntaxKind): boolean {
  return [
    ts.SyntaxKind.PlusToken,
    ts.SyntaxKind.MinusToken,
    ts.SyntaxKind.AsteriskToken,
    ts.SyntaxKind.SlashToken,
    ts.SyntaxKind.PercentToken,
    ts.SyntaxKind.AsteriskAsteriskToken,
    ts.SyntaxKind.LessThanLessThanToken,
    ts.SyntaxKind.GreaterThanGreaterThanToken,
    ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken,
    // Compound assignments are calculation mutations too. Omitting these lets
    // `sum += term` change to `sum -= term` without changing the AST unit.
    ts.SyntaxKind.PlusEqualsToken,
    ts.SyntaxKind.MinusEqualsToken,
    ts.SyntaxKind.AsteriskEqualsToken,
    ts.SyntaxKind.SlashEqualsToken,
    ts.SyntaxKind.PercentEqualsToken,
    ts.SyntaxKind.AsteriskAsteriskEqualsToken,
    ts.SyntaxKind.LessThanLessThanEqualsToken,
    ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
    ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
    ts.SyntaxKind.AmpersandEqualsToken,
    ts.SyntaxKind.BarEqualsToken,
    ts.SyntaxKind.CaretEqualsToken,
    ts.SyntaxKind.AmpersandAmpersandEqualsToken,
    ts.SyntaxKind.BarBarEqualsToken,
    ts.SyntaxKind.QuestionQuestionEqualsToken,
  ].includes(kind);
}

function isComparisonOperator(kind: ts.SyntaxKind): boolean {
  return [
    ts.SyntaxKind.LessThanToken,
    ts.SyntaxKind.LessThanEqualsToken,
    ts.SyntaxKind.GreaterThanToken,
    ts.SyntaxKind.GreaterThanEqualsToken,
    ts.SyntaxKind.EqualsEqualsToken,
    ts.SyntaxKind.EqualsEqualsEqualsToken,
    ts.SyntaxKind.ExclamationEqualsToken,
    ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ].includes(kind);
}

function isFormulaHelperCall(node: ts.Node): node is ts.CallExpression {
  if (!ts.isCallExpression(node)) return false;
  if (ts.isPropertyAccessExpression(node.expression) && node.expression.expression.getText() === 'Math') return true;
  const calleeName = ts.isPropertyAccessExpression(node.expression) ? node.expression.name.text : ts.isIdentifier(node.expression) ? node.expression.text : '';
  return /^(?:calculate|compute|solve|evaluate|derive|integrate|simulate|estimate|analyze|interpolate|newton|lambert|fresnel|sverak)/i.test(calleeName);
}

function containsFormulaMaterial(node: ts.Node): boolean {
  if (ts.isNumericLiteral(node) || isFormulaHelperCall(node)) return true;
  if (ts.isBinaryExpression(node) && (isArithmeticOperator(node.operatorToken.kind) || isComparisonOperator(node.operatorToken.kind))) return true;
  let found = false;
  ts.forEachChild(node, (child) => { if (!found) found = containsFormulaMaterial(child); });
  return found;
}

function isFormulaExpression(node: ts.Node): boolean {
  if (ts.isBinaryExpression(node)) {
    return isArithmeticOperator(node.operatorToken.kind) || isComparisonOperator(node.operatorToken.kind);
  }
  if (ts.isPrefixUnaryExpression(node)) {
    return [ts.SyntaxKind.MinusToken, ts.SyntaxKind.PlusToken, ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator);
  }
  if (ts.isPostfixUnaryExpression(node)) {
    return node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken;
  }
  if (ts.isConditionalExpression(node)) return containsFormulaMaterial(node);
  return isFormulaHelperCall(node);
}

function normalizeExpression(expression: string): string {
  return expression.replace(/\s+/g, '');
}

export function extractFormulaUnits(sourceFile: string, source: string): FormulaUnit[] {
  const ast = ts.createSourceFile(sourceFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const byOwner = new Map<string, { functionName: string; expressions: string[] }>();
  const ownerPathStack: string[] = [];
  const functionNameStack: string[] = [];
  const currentOwnerPath = (): string => ownerPathStack.join('.') || '<module>';
  const currentFunctionName = (): string => functionNameStack.at(-1) ?? '<module>';

  const addExpression = (expression: string): void => {
    const normalized = normalizeExpression(expression);
    if (!normalized) return;
    const ownerPath = currentOwnerPath();
    const owner = byOwner.get(ownerPath) ?? { functionName: currentFunctionName(), expressions: [] };
    owner.expressions.push(normalized);
    byOwner.set(ownerPath, owner);
  };

  const visit = (node: ts.Node): void => {
    let pushedFunction = false;
    let pushedOwnerPath = false;
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      ownerPathStack.push(`@class:${node.name?.text ?? '<anonymous>'}`);
      pushedOwnerPath = true;
    } else if (ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) {
      const name = node.name?.getText(ast) ?? '<anonymous-method>';
      ownerPathStack.push(`@method:${name}`);
      functionNameStack.push(name);
      pushedFunction = true;
      pushedOwnerPath = true;
    } else if (ts.isFunctionDeclaration(node)) {
      const name = node.name?.text ?? '<anonymous-function>';
      ownerPathStack.push(name);
      functionNameStack.push(name);
      pushedFunction = true;
      pushedOwnerPath = true;
    } else if (ts.isVariableDeclaration(node) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
      const name = node.name.getText(ast);
      ownerPathStack.push(name);
      functionNameStack.push(name);
      pushedFunction = true;
      pushedOwnerPath = true;
    }

    if (isFormulaExpression(node)) {
      const parent = node.parent;
      // Keep maximal expressions, not every nested operator; each changed equation
      // or threshold receives its own content-addressed fixture obligation.
      if (!parent || !isFormulaExpression(parent)) addExpression(node.getText(ast));
    } else if (ts.isNumericLiteral(node)) {
      let ancestor: ts.Node | undefined = node.parent;
      let covered = false;
      while (ancestor && !ts.isSourceFile(ancestor)) {
        if (isFormulaExpression(ancestor)) {
          covered = true;
          break;
        }
        if (ts.isFunctionLike(ancestor) && ancestor !== node.parent) break;
        ancestor = ancestor.parent;
      }
      if (!covered) {
        const parentText = node.parent ? normalizeExpression(node.parent.getText(ast)) : node.getText(ast);
        addExpression(`literal:${parentText}`);
      }
    }

    ts.forEachChild(node, visit);
    if (pushedOwnerPath) ownerPathStack.pop();
    if (pushedFunction) functionNameStack.pop();
  };
  visit(ast);

  const units: FormulaUnit[] = [];
  for (const [ownerPath, { functionName, expressions }] of byOwner) {
    const occurrences = new Map<string, number>();
    for (const expression of expressions) {
      const occurrence = occurrences.get(expression) ?? 0;
      occurrences.set(expression, occurrence + 1);
      const hash = createHash('sha256').update(`${ownerPath}\n${expression}\noccurrence:${occurrence}`).digest('hex').slice(0, 12);
      units.push({
        formulaId: `${sourceFile}#${ownerPath}#${hash}`,
        sourceFile,
        functionName,
        expression,
      });
    }
  }
  return units.sort((a, b) => a.formulaId.localeCompare(b.formulaId));
}

export function changedFormulaUnits(sourceFile: string, before: string, after: string): FormulaUnit[] {
  const beforeIds = new Set(extractFormulaUnits(sourceFile, before).map((unit) => unit.formulaId));
  const afterUnits = extractFormulaUnits(sourceFile, after);
  // New or altered expressions receive new content-addressed IDs. Removed equations
  // do not need an independent output fixture; any replacement/addition does.
  return afterUnits.filter((unit) => !beforeIds.has(unit.formulaId)).sort((a, b) => a.formulaId.localeCompare(b.formulaId));
}

export function validateEvidenceRecords(
  requiredFormulaIds: string[],
  records: PhysicsReferenceRecord[],
): string[] {
  const errors: string[] = [];
  const recordsById = new Map<string, PhysicsReferenceRecord[]>();
  for (const record of records) recordsById.set(record.formulaId, [...(recordsById.get(record.formulaId) ?? []), record]);
  for (const [formulaId, matching] of recordsById) {
    if (matching.length !== 1) errors.push(`${formulaId}: duplicate independent-reference fixture records (${matching.length})`);
  }

  for (const formulaId of requiredFormulaIds) {
    const matching = recordsById.get(formulaId) ?? [];
    if (matching.length !== 1) {
      errors.push(`${formulaId}: expected exactly one independent reference fixture record, found ${matching.length}`);
      continue;
    }
    const record = matching[0];
    if (!record.referenceTitle.trim()) errors.push(`${formulaId}: referenceTitle is required`);
    if (!/^https:\/\//i.test(record.referenceUrl)) errors.push(`${formulaId}: referenceUrl must use HTTPS`);
    if (!record.referenceVersion.trim()) errors.push(`${formulaId}: referenceVersion/edition is required`);
    if (!record.referenceLocator.trim()) errors.push(`${formulaId}: section/table/page/equation locator is required`);
    if (!record.fixtureFile.startsWith('scripts/fixtures/physics/')) errors.push(`${formulaId}: fixtureFile must be under scripts/fixtures/physics/`);
    if (!/^[$A-Z_a-z][$\w]*$/.test(record.productionExport)) errors.push(`${formulaId}: productionExport must be a named JavaScript export`);
    const [, formulaOwner] = formulaId.split('#');
    if (!formulaOwner || record.productionExport !== formulaOwner) {
      errors.push(`${formulaId}: productionExport must equal the function owner encoded in the formulaId (${formulaOwner ?? 'missing'})`);
    }
  }
  return errors;
}

function readEvidenceManifest(): PhysicsReferenceRecord[] {
  const manifestPath = 'scripts/physics-reference-evidence.json';
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { schemaVersion?: number; fixtures?: PhysicsReferenceRecord[] };
  assert.equal(manifest.schemaVersion, 1, `${manifestPath}: schemaVersion must be 1`);
  assert.ok(Array.isArray(manifest.fixtures), `${manifestPath}: fixtures must be an array`);
  return manifest.fixtures;
}

function git(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function getBeforeSource(baseRef: string, sourceFile: string): string {
  try {
    return execFileSync('git', ['show', `${baseRef}:${sourceFile}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch {
    return '';
  }
}

function safeRepoPath(repoPath: string): boolean {
  return !path.isAbsolute(repoPath) && !repoPath.split(/[\\/]/).includes('..') && fs.existsSync(repoPath);
}

function assertReferenceValue(actual: unknown, expected: unknown, absolute: number, relative: number, location = '$'): void {
  if (typeof expected === 'number') {
    assert.ok(typeof actual === 'number' && Number.isFinite(actual), `${location}: production output must be a finite number`);
    const allowed = absolute + relative * Math.abs(expected);
    assert.ok(Math.abs(actual - expected) <= allowed, `${location}: expected ${expected} ± ${allowed}, received ${actual}`);
    return;
  }
  if (Array.isArray(expected)) {
    assert.ok(Array.isArray(actual), `${location}: expected an array`);
    assert.equal(actual.length, expected.length, `${location}: array length mismatch`);
    expected.forEach((value, index) => assertReferenceValue(actual[index], value, absolute, relative, `${location}[${index}]`));
    return;
  }
  if (expected !== null && typeof expected === 'object') {
    assert.ok(actual !== null && typeof actual === 'object' && !Array.isArray(actual), `${location}: expected an object`);
    const expectedKeys = Object.keys(expected as Record<string, unknown>).sort();
    const actualKeys = Object.keys(actual as Record<string, unknown>).sort();
    assert.deepEqual(actualKeys, expectedKeys, `${location}: output keys mismatch`);
    for (const key of expectedKeys) {
      assertReferenceValue(
        (actual as Record<string, unknown>)[key],
        (expected as Record<string, unknown>)[key],
        absolute,
        relative,
        `${location}.${key}`,
      );
    }
    return;
  }
  assert.equal(actual, expected, `${location}: output value mismatch`);
}

function hasExportModifier(node: ts.Node): boolean {
  return ts.canHaveModifiers(node) && (ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false);
}

function assertFormulaHasDirectExportBinding(record: PhysicsReferenceRecord, sourceText: string): void {
  const [, formulaOwner] = record.formulaId.split('#');
  assert.ok(formulaOwner && record.productionExport === formulaOwner,
    `${record.formulaId}: productionExport must be the same function owner encoded in the formulaId`);
  const formulaUnit = extractFormulaUnits(record.formulaId.split('#')[0], sourceText)
    .find((unit) => unit.formulaId === record.formulaId);
  assert.ok(formulaUnit, `${record.formulaId}: formula unit is not present in its production source`);

  const ast = ts.createSourceFile(record.formulaId.split('#')[0], sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const normalizedFormula = normalizeExpression(formulaUnit.expression);
  const directExportContainsFormula = ast.statements.some((statement) => {
    if (ts.isFunctionDeclaration(statement)
      && statement.name?.text === record.productionExport
      && hasExportModifier(statement)) {
      return normalizeExpression(statement.getText(ast)).includes(normalizedFormula);
    }
    if (!ts.isVariableStatement(statement) || !hasExportModifier(statement)) return false;
    return statement.declarationList.declarations.some((declaration) =>
      ts.isIdentifier(declaration.name)
      && declaration.name.text === record.productionExport
      && declaration.initializer !== undefined
      && (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))
      && normalizeExpression(declaration.getText(ast)).includes(normalizedFormula));
  });
  assert.ok(directExportContainsFormula,
    `${record.formulaId}: exported production function ${record.productionExport} must be the direct named owner containing this formula expression`);
}

export async function executeReferenceFixture(record: PhysicsReferenceRecord, repoRoot = process.cwd()): Promise<void> {
  const fixturePath = path.resolve(repoRoot, record.fixtureFile);
  assert.ok(!path.isAbsolute(record.fixtureFile) && !record.fixtureFile.split(/[\\/]/).includes('..') && fs.existsSync(fixturePath), `${record.formulaId}: missing/unsafe fixture ${record.fixtureFile}`);
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as PhysicsReferenceFixture;
  assert.equal(fixture.schemaVersion, 1, `${record.fixtureFile}: schemaVersion must be 1`);
  assert.equal(fixture.formulaId, record.formulaId, `${record.fixtureFile}: formulaId mismatch`);
  assert.equal(fixture.independentOfImplementation, true, `${record.fixtureFile}: reference outputs must be declared independent of this implementation`);
  assert.equal(fixture.productionExport, record.productionExport, `${record.fixtureFile}: production export mismatch`);
  assert.ok(Array.isArray(fixture.inputs), `${record.fixtureFile}: positional production-function inputs are required`);
  assert.ok(Object.hasOwn(fixture, 'expected'), `${record.fixtureFile}: expected reference output is required`);
  const absolute = fixture.tolerances?.absolute;
  const relative = fixture.tolerances?.relative;
  assert.ok(typeof absolute === 'number' && Number.isFinite(absolute) && absolute >= 0, `${record.fixtureFile}: non-negative absolute tolerance is required`);
  assert.ok(typeof relative === 'number' && Number.isFinite(relative) && relative >= 0, `${record.fixtureFile}: non-negative relative tolerance is required`);
  assert.equal(fixture.referenceSource?.title, record.referenceTitle, `${record.fixtureFile}: reference title mismatch`);
  assert.equal(fixture.referenceSource?.url, record.referenceUrl, `${record.fixtureFile}: reference URL mismatch`);
  assert.equal(fixture.referenceSource?.version, record.referenceVersion, `${record.fixtureFile}: reference version mismatch`);
  assert.equal(fixture.referenceSource?.locator, record.referenceLocator, `${record.fixtureFile}: reference locator mismatch`);

  const [sourceFile] = record.formulaId.split('#');
  assert.ok(!path.isAbsolute(sourceFile) && !sourceFile.split(/[\\/]/).includes('..'), `${record.formulaId}: unsafe production module path`);
  const modulePath = path.resolve(repoRoot, sourceFile);
  assert.ok(fs.existsSync(modulePath), `${record.formulaId}: production module is missing`);
  assertFormulaHasDirectExportBinding(record, fs.readFileSync(modulePath, 'utf8'));
  const productionModule = await import(pathToFileURL(modulePath).href) as Record<string, unknown>;
  const productionFunction = productionModule[record.productionExport];
  assert.equal(typeof productionFunction, 'function', `${sourceFile}: exported production function ${record.productionExport} was not found`);
  const actual = await (productionFunction as (...args: unknown[]) => unknown)(...fixture.inputs);
  assertReferenceValue(actual, fixture.expected, absolute, relative);
  console.log(`Independent fixture executed against ${sourceFile}#${record.productionExport}: ${record.formulaId}`);
}

function collectChangedFormulaUnits(baseRef: string): FormulaUnit[] {
  // These directories implement provider, provenance, fixture and catalog plumbing,
  // not physical equations. New or changed calculation modules remain fail-closed.
  const excluded = [
    'src/engine/dataGateway/',
    'src/engine/provenance/',
    'src/engine/core/benchmarks/',
    'src/engine/types/',
  ];
  const changedPaths = git(['diff', '--name-only', '--diff-filter=ACMR', baseRef, '--', 'src/engine'])
    .split('\n')
    .filter((item) => item.endsWith('.ts') || item.endsWith('.tsx'))
    .filter((item) => !excluded.some((prefix) => item.startsWith(prefix)))
    .filter((item) => !/\.(?:test|spec)\.[tj]sx?$/.test(item));

  const changed: FormulaUnit[] = [];
  for (const sourceFile of changedPaths) {
    const before = getBeforeSource(baseRef, sourceFile);
    const after = fs.readFileSync(sourceFile, 'utf8');
    changed.push(...changedFormulaUnits(sourceFile, before, after));
  }
  return changed;
}

async function main(): Promise<void> {
  const requestedBase = process.env.PHYSICS_DIFF_BASE;
  const baseRef = requestedBase && !/^0+$/.test(requestedBase) ? requestedBase : requestedBase ? 'origin/main' : 'HEAD';
  const manifest = readEvidenceManifest();
  const changed = collectChangedFormulaUnits(baseRef);
  const requiredIds = changed.map((unit) => unit.formulaId);
  const allManifestIds = manifest.map((record) => record.formulaId);
  const errors = validateEvidenceRecords([...new Set([...requiredIds, ...allManifestIds])], manifest);
  for (const record of manifest) {
    const [sourceFile] = record.formulaId.split('#');
    if (!safeRepoPath(sourceFile)) {
      errors.push(`${record.formulaId}: formula source file is missing or unsafe`);
      continue;
    }
    const currentIds = new Set(extractFormulaUnits(sourceFile, fs.readFileSync(sourceFile, 'utf8')).map((unit) => unit.formulaId));
    if (!currentIds.has(record.formulaId)) errors.push(`${record.formulaId}: fixture is stale; update it for the current expression or remove it`);
  }
  if (errors.length > 0) {
    console.error('Independent physics reference gate FAILED: every changed/new formula expression needs an independently sourced fixture and executable assertion.');
    const visibleErrors = errors.slice(0, 30);
    for (const error of visibleErrors) console.error(`- ${error}`);
    if (errors.length > visibleErrors.length) console.error(`... ${errors.length - visibleErrors.length} additional gate violation(s) omitted`);
    console.error('Do not substitute checked-in targets, labels, copied implementation outputs, or analytic self-comparisons for independent reference data.');
    process.exitCode = 1;
    return;
  }

  for (const record of manifest) await executeReferenceFixture(record);
  if (changed.length === 0) {
    console.log(`Independent physics reference gate passed: no formula-expression changes in the selected engine diff (base ${baseRef}).`);
  } else {
    console.log(`Independent physics reference gate passed: ${changed.length} changed formula expression(s) each have an executed independent fixture.`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main().catch((error: unknown) => {
    console.error('Independent physics reference gate FAILED while executing a fixture.');
    console.error(error);
    process.exitCode = 1;
  });
}
