import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const steps=[
 ['npm','run','lint'],['npm','run','build'],['npm','test'],
 ['npm','run','test:dependencies'],['npm','run','test:ac-retirement'],
 ['npm','run','verify:exports'],['npm','run','verify:help'],
 ['npx','tsx','scripts/test-research-workspace-browser.ts'],
 ['npx','tsx','scripts/test-browser-regressions.ts'],['npm','run','test:ui'],
 ['npm','audit'],['git','diff','--check'],
];
const checks=[];
// Run serially: browser/SW suites must not race another build replacing dist assets.
for(const args of steps){
 const r=spawnSync(process.execPath,['scripts/ci-command.mjs',...args],{encoding:'utf8',env:{...process.env,REAL_INTERNET:'false',VITE_REAL_INTERNET:'false'},maxBuffer:32*1024*1024,timeout:600000});
 const passed=r.status===0&&!r.signal&&!r.error;checks.push({command:args.join(' '),passed,exitCode:r.status,signal:r.signal});
 console.log(`${passed?'PASS':'FAIL'} ${args.join(' ')}`);if(!passed)console.error(r.stdout,r.stderr);
}
const files=['src/App.tsx','src/main.tsx','src/index.css','src/styles/workspace.css','index.html','tailwind.config.js','package.json','package-lock.json','.github/workflows/ci.yml','scripts/test-ui-refresh-browser.ts','scripts/verify-ui-refresh.ts','docs/features/WORKSPACE-DESIGN-SYSTEM.fa.md','CHANGELOG.md','public/fonts/licenses/Inter-OFL.txt','public/fonts/licenses/Vazirmatn-OFL.txt','public/fonts/licenses/JetBrainsMono-OFL.txt'];
const sourceSha256=Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
writeFileSync('docs/audit/WORKSPACE-DESIGN-GATE.json',JSON.stringify({schemaVersion:'workspace-design-gate-v1',status:checks.every(c=>c.passed)?'ready-for-review':'blocked',environment:{platform:process.platform,node:process.version,browser:'bundled Chromium'},scope:['shared screen design system, semantic color states, cards, forms, tables, dialogs and workflow shell','local licensed Persian, English and monospace fonts','persistent presentation-only density','responsive RTL/LTR, keyboard drawer, reduced motion and print shell separation'],boundary:{uiRefreshChangesEnergyOrFinanceFormulas:false,uiRefreshChangesProjectSchema:false,automaticResearchAdoption:false,earlierBranchChangesPreserved:true},layoutChecks:JSON.parse(readFileSync('.cache/ui-refresh/checks.json','utf8')),limitations:['Representative screen/state coverage, not every arbitrary user dataset','No native Windows/Safari/iOS or screen-reader certification','No full WebGL/CAD visual matrix','Print shell tested; no claim of identical PDF pagination','Existing no-explicit-any lint warnings remain'],checks,sourceSha256},null,2)+'\n');
process.exitCode=checks.every(c=>c.passed)?0:1;
