import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const commands = [
  ['npm', ['run', 'verify:uq:display']],
  ['npx', ['tsx', 'scripts/test-financial-metric-quantiles.ts']],
] as const;
const checks = [];
for (const [command, args] of commands) {
  const run = spawnSync(command, [...args], { encoding: 'utf8', timeout: 420_000, maxBuffer: 8 * 1024 * 1024, env: process.env });
  const passed = run.status === 0 && !run.error && !run.signal;
  checks.push({command: [command, ...args].join(' '), passed, exitCode: run.status, signal: run.signal});
  console.log(`${passed ? 'PASS' : 'FAIL'} ${command} ${args.join(' ')}`);
  if (!passed) console.error(run.stdout, run.stderr);
}
const files = ['src/studies/financialMetricQuantiles.ts','src/components/FinancialMetricQuantiles.tsx','src/components/FinancialTab.tsx','docs/features/UQ-003-METRIC-QUANTILES.fa.md','scripts/test-financial-metric-quantiles.ts','scripts/test-financial-energy-quantiles-browser.ts'];
const fileSha256 = Object.fromEntries(files.map(file => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]));
const component = readFileSync(files[1], 'utf8');
const boundary = !/runFinancialUncertaintyPropagation\s*\(|fetch\s*\(|onPricingChange|researchApi|operationalEnergy/.test(component) && component.includes('initialExplicit = true') && component.includes('useState(initialExplicit)');
const documentation = readFileSync(files[3], 'utf8').includes('Acceptance criteria');
const passed = checks.every(check => check.passed) && boundary && documentation;
writeFileSync('docs/audit/UQ-003-GATE.json', JSON.stringify({schemaVersion:'feature-gate-v1',feature:'UQ-003',testedAt:new Date().toISOString(),status:passed?'ready-for-review':'blocked',scope:'Opt-in legacy LCOE/NPV CDF and adverse-tail presentation only; no model changes or public product release.',featureFlags:'Independent local checkboxes, explicit mode true by default since UQ-005; legacy opt-out tested.',researchGate:'No adoption introduced; existing gates unchanged.',boundary,documentation,fileSha256,checks},null,2)+'\n');
process.exitCode = passed ? 0 : 1;
