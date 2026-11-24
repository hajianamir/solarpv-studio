import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const checks = [
  ['npm', ['run', 'test:uq:contract']],
  ['npx', ['tsx', 'scripts/test-energy-uncertainty-review.ts']],
  ['npm', ['run', 'test:operational:energy']],
  ['npm', ['test']],
  ['npm', ['run', 'lint:types']],
] as const;
const results = [];
for (const [command, args] of checks) {
  const run = spawnSync(command, [...args], { encoding: 'utf8', timeout: 180_000, maxBuffer: 8 * 1024 * 1024, env: process.env });
  const passed = run.status === 0 && !run.error && !run.signal;
  results.push({ command: [command, ...args].join(' '), passed, exitCode: run.status, signal: run.signal, error: run.error?.message ?? null });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${command} ${args.join(' ')}`);
  if (!passed) console.error(run.stdout, run.stderr);
}
const passed = results.every(result => result.passed);
const git = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
mkdirSync('docs/audit', { recursive: true });
writeFileSync('docs/audit/UQ-001-GATE.json', JSON.stringify({
  schemaVersion: 'feature-gate-v1', feature: 'UQ-001',
  testedAt: new Date().toISOString(), baseHead: git.stdout.trim(), workingTreeChangesIncluded: true,
  status: passed ? 'ready-for-review' : 'blocked', scope: 'Opt-in pure quantile adapter only; not product release or field validation.',
  featureFlag: 'uq_explicit_quantiles_v1: enabled per request only; existing product unchanged',
  researchAdoption: 'Not introduced; existing gates unchanged',
  checks: results,
}, null, 2) + '\n');
process.exitCode = passed ? 0 : 1;
