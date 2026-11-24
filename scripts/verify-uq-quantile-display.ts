import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const commands = [
  ['npm', ['run', 'verify:uq:contract']],
  ['npx', ['tsx', 'scripts/test-financial-energy-quantiles.ts']],
  ['npx', ['tsx', 'scripts/test-financial-energy-quantiles-browser.ts']],
  ['npm', ['run', 'build']],
] as const;
const results = [];
for (const [command, args] of commands) {
  const run = spawnSync(command, [...args], { encoding: 'utf8', timeout: 300_000, maxBuffer: 8 * 1024 * 1024, env: process.env });
  const passed = run.status === 0 && !run.error && !run.signal;
  results.push({ command: [command, ...args].join(' '), passed, exitCode: run.status, signal: run.signal });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${command} ${args.join(' ')}`);
  if (!passed) console.error(run.stdout, run.stderr);
}
const component = readFileSync('src/components/FinancialEnergyQuantiles.tsx', 'utf8');
const tab = readFileSync('src/components/FinancialTab.tsx', 'utf8');
const boundary = !/runFinancialUncertaintyPropagation\s*\(|fetch\s*\(|onPricingChange|operationalEnergy|researchApi/.test(component)
  && component.includes('initialExplicit = true') && component.includes('useState(initialExplicit)')
  && tab.includes('<FinancialEnergyQuantiles energy={uqResult.annualGenerationMwh} traceId={uqResult.traceId} lang={lang} />');
const documentation = readFileSync('docs/features/UQ-002-FINANCIAL-DISPLAY.fa.md', 'utf8').includes('Acceptance criteria');
const passed = results.every(row => row.passed) && boundary && documentation;
writeFileSync('docs/audit/UQ-002-GATE.json', JSON.stringify({
  schemaVersion: 'feature-gate-v1', feature: 'UQ-002', testedAt: new Date().toISOString(),
  status: passed ? 'ready-for-review' : 'blocked',
  scope: 'Opt-in financial energy card and standalone PDF only; Chromium component harness, not full-app E2E or native Safari.',
  featureFlag: 'Local checkbox; explicit mode true by default since UQ-005, legacy opt-out remains. No persisted preference.',
  researchGate: 'No research result or adoption path added; existing gates unchanged.',
  boundary, documentation, checks: results,
}, null, 2) + '\n');
process.exitCode = passed ? 0 : 1;
