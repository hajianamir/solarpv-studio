import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
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
  testFile: string;
  referenceTitle: string;
  referenceUrl: string;
  referenceVersion: string;
  referenceLocator: string;
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
    return node.operator === ts.SyntaxKind.MinusToken || node.operator === ts.SyntaxKind.PlusToken;
  }
  if (ts.isConditionalExpression(node)) return containsFormulaMaterial(node);
  return isFormulaHelperCall(node);
}

function normalizeExpression(expression: string): string {
  return expression.replace(/\s+/g, '');
}

export function extractFormulaUnits(sourceFile: string, source: string): FormulaUnit[] {
  const ast = ts.createSourceFile(sourceFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const byOwner = new Map<string, string[]>();
  const ownerStack: string[] = ['<module>'];

  const addExpression = (owner: string, expression: string): void => {
    const normalized = normalizeExpression(expression);
    if (!normalized) return;
    const items = byOwner.get(owner) ?? [];
    items.push(normalized);
    byOwner.set(owner, items);
  };

  const visit = (node: ts.Node): void => {
    const ownerNode = ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)
      ? node
      : undefined;
    let pushedOwner = false;
    if (ownerNode) {
      const name = ownerNode.name?.getText(ast) ?? '<anonymous-method>';
      ownerStack.push(name);
      pushedOwner = true;
    } else if (ts.isVariableDeclaration(node) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
      ownerStack.push(node.name.getText(ast));
      pushedOwner = true;
    }

    if (isFormulaExpression(node)) {
      const parent = node.parent;
      // Keep maximal expressions, not every nested operator; each changed equation
      // or threshold receives its own content-addressed fixture obligation.
      if (!parent || !isFormulaExpression(parent)) {
        addExpression(ownerStack.at(-1) ?? '<module>', node.getText(ast));
      }
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
        addExpression(ownerStack.at(-1) ?? '<module>', `literal:${parentText}`);
      }
    }

    ts.forEachChild(node, visit);
    if (pushedOwner) ownerStack.pop();
  };
  visit(ast);

  const units: FormulaUnit[] = [];
  for (const [functionName, expressions] of byOwner) {
    const occurrences = new Map<string, number>();
    for (const expression of expressions) {
      const occurrence = occurrences.get(expression) ?? 0;
      occurrences.set(expression, occurrence + 1);
      const hash = createHash('sha256').update(`${expression}\noccurrence:${occurrence}`).digest('hex').slice(0, 12);
      units.push({
        formulaId: `${sourceFile}#${functionName}#${hash}`,
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
    if (!/^scripts\/[\w./-]+\.(?:ts|js|mjs)$/.test(record.testFile)) errors.push(`${formulaId}: testFile must be a repository script`);
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

function runReferenceTest(record: PhysicsReferenceRecord): void {
  assert.ok(safeRepoPath(record.fixtureFile), `${record.formulaId}: missing/unsafe fixture ${record.fixtureFile}`);
  assert.ok(safeRepoPath(record.testFile), `${record.formulaId}: missing/unsafe test ${record.testFile}`);
  const fixture = JSON.parse(fs.readFileSync(record.fixtureFile, 'utf8')) as {
    schemaVersion?: number;
    formulaId?: string;
    independentOfImplementation?: boolean;
    inputs?: Record<string, unknown>;
    expected?: Record<string, unknown>;
    tolerances?: Record<string, unknown>;
    referenceSource?: { title?: string; url?: string; version?: string; locator?: string };
  };
  assert.equal(fixture.schemaVersion, 1, `${record.fixtureFile}: schemaVersion must be 1`);
  assert.equal(fixture.formulaId, record.formulaId, `${record.fixtureFile}: formulaId mismatch`);
  assert.equal(fixture.independentOfImplementation, true, `${record.fixtureFile}: reference outputs must be declared independent of this implementation`);
  assert.ok(fixture.inputs && Object.keys(fixture.inputs).length > 0, `${record.fixtureFile}: independent fixture inputs are required`);
  assert.ok(fixture.expected && Object.keys(fixture.expected).length > 0, `${record.fixtureFile}: expected reference outputs are required`);
  assert.ok(fixture.tolerances && Object.keys(fixture.tolerances).length > 0, `${record.fixtureFile}: numerical tolerances are required`);
  assert.equal(fixture.referenceSource?.title, record.referenceTitle, `${record.fixtureFile}: reference title mismatch`);
  assert.equal(fixture.referenceSource?.url, record.referenceUrl, `${record.fixtureFile}: reference URL mismatch`);
  assert.equal(fixture.referenceSource?.version, record.referenceVersion, `${record.fixtureFile}: reference version mismatch`);
  assert.equal(fixture.referenceSource?.locator, record.referenceLocator, `${record.fixtureFile}: reference locator mismatch`);

  const testText = fs.readFileSync(record.testFile, 'utf8');
  assert.ok(testText.includes(record.formulaId), `${record.testFile}: test must name the exact formulaId`);
  assert.ok(testText.includes(record.fixtureFile), `${record.testFile}: test must load the checked-in independent fixture`);
  assert.match(testText, /assert\.|expect\(/, `${record.testFile}: test must contain assertions`);
  execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', record.testFile], { stdio: 'inherit' });
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

function main(): void {
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

  for (const record of manifest) runReferenceTest(record);
  if (changed.length === 0) {
    console.log(`Independent physics reference gate passed: no formula-expression changes in the selected engine diff (base ${baseRef}).`);
  } else {
    console.log(`Independent physics reference gate passed: ${changed.length} changed formula expression(s) each have an executed independent fixture.`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) main();
