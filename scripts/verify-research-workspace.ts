import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const steps=[
 ['npm','run','lint:types'],
 ['npx','eslint','src/App.tsx','src/components/ClimateTab.tsx','src/components/ResearchEditor.tsx','src/components/ResearchWorkspace.tsx','src/helpContent.ts'],
 ['npm','run','verify:help'],
 ['npm','test'],
 ['npm','run','build'],
 ['npx','tsx','scripts/test-research-workspace-browser.ts'],
 ['npx','tsx','scripts/test-browser-regressions.ts'],
 ['npx','tsx','scripts/test-research-browser.ts'],
 ['npx','tsx','scripts/test-calibration-browser.ts'],
 ['npx','tsx','scripts/test-direct-pvlib-browser.ts'],
 ['npx','tsx','scripts/test-foundation-browser.ts'],
 ['git','diff','--check'],
];
const checks=[];
for(const args of steps){const result=spawnSync(process.execPath,['scripts/ci-command.mjs',...args],{encoding:'utf8',env:{...process.env,REAL_INTERNET:'false',VITE_REAL_INTERNET:'false'},maxBuffer:32*1024*1024,timeout:600000});const passed=result.status===0&&!result.signal&&!result.error;checks.push({command:args.join(' '),passed,exitCode:result.status,signal:result.signal});console.log(`${passed?'PASS':'FAIL'} ${args.join(' ')}`);if(!passed)console.error(result.stdout,result.stderr);}
const files=['src/App.tsx','src/components/ClimateTab.tsx','src/components/ResearchEditor.tsx','src/components/ResearchWorkspace.tsx','src/helpContent.ts','src/i18n.ts','src/engine/core/benchmarks/unitTestsCore.ts','scripts/research-browser-navigation.ts','scripts/test-research-workspace-browser.ts','scripts/test-browser-regressions.ts','scripts/test-research-browser.ts','scripts/test-calibration-browser.ts','scripts/test-direct-pvlib-browser.ts','scripts/verify-research-workspace.ts','docs/features/RESEARCH-WORKSPACE-SPEC.fa.md','docs/features/RESEARCH-WORKSPACE.fa.md','CHANGELOG.md'];
const fileSha256=Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
writeFileSync('docs/audit/RESEARCH-WORKSPACE-GATE.json',JSON.stringify({schemaVersion:'research-workspace-gate-v1',softwareStatus:checks.every(c=>c.passed)?'ready-for-review':'blocked',scope:['independent lazy research workspace with four tool sections and thirteen model topics','utility AC/MV engineering preserved without customer mode dashboard','on/off-grid policy with loads; project family navigation and explicit restore preserved'],boundary:{projectSchemaChanged:false,numericalEngineChanged:false,automaticEnergyAdoption:false,financeMutation:false,fieldQualificationClaimed:false},notTested:['all optional scientific runtimes and every A1-D3 acceptance suite','native Windows/Safari'],checks,fileSha256},null,2)+'\n');process.exitCode=checks.every(c=>c.passed)?0:1;
