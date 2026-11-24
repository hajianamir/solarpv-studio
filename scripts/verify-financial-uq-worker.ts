import {spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const commands=[
 ['npm',['run','verify:uq:metrics']],
 ['npx',['tsx','scripts/test-financial-uq-worker.ts']],
 ['npx',['eslint','src/studies/uqQuantileContract.ts','src/studies/financialEnergyQuantileView.ts','src/studies/financialMetricQuantiles.ts','src/studies/financialUq.worker.ts','src/studies/financialUqRunner.ts','src/studies/financialUqResultValidation.ts','src/components/FinancialEnergyQuantiles.tsx','src/components/FinancialMetricQuantiles.tsx','src/components/FinancialTab.tsx']],
 ['npm',['run','test:browser']],
 ['npm',['run','build']],
 ['npx',['tsx','scripts/test-financial-uq-e2e.ts']],
] as const;
const checks=[];
for(const [command,args] of commands){
 const result=spawnSync(command,[...args],{encoding:'utf8',env:{...process.env,VITE_REAL_INTERNET:'false',REAL_INTERNET:'false'},timeout:600000,maxBuffer:16*1024*1024});
 const passed=result.status===0&&!result.error&&!result.signal;
 checks.push({command:[command,...args].join(' '),passed,exitCode:result.status,signal:result.signal,error:result.error?.message??null});
 console.log(`${passed?'PASS':'FAIL'} ${command} ${args.join(' ')}`);
 if(!passed)console.error(result.stdout,result.stderr);
}
const files=['src/components/FinancialTab.tsx','src/studies/financialUq.worker.ts','src/studies/financialUqRunner.ts','vite.config.ts','scripts/test-financial-uq-worker.ts','scripts/test-financial-uq-e2e.ts','docs/features/UQ-004-WORKER-E2E.fa.md','src/studies/financialUqResultValidation.ts','src/components/FinancialEnergyQuantiles.tsx','src/components/FinancialMetricQuantiles.tsx','scripts/test-financial-energy-quantiles-browser.ts'];
const fileSha256=Object.fromEntries(files.map(file=>[file,createHash('sha256').update(readFileSync(file)).digest('hex')]));
const tab=readFileSync(files[0],'utf8'),runner=readFileSync(files[2],'utf8');
const boundary=!/runFinancialUncertaintyPropagation\s*\(/.test(tab)&&!runner.includes('runFinancialUncertaintyPropagation')&&!/bankableRiskCategory|Variance Contribution via SRC/.test(tab);
const documentation=readFileSync(files[6],'utf8').includes('Acceptance criteria');
const sw=readFileSync('dist/sw.js','utf8');const offlineWorker=/financialUq\.worker-[\w-]+\.js/.test(sw);
const passed=checks.every(check=>check.passed)&&boundary&&documentation&&offlineWorker;
mkdirSync('docs/audit',{recursive:true});writeFileSync('docs/audit/UQ-004-GATE.json',JSON.stringify({schemaVersion:'feature-gate-v1',feature:'UQ-004',testedAt:new Date().toISOString(),status:passed?'ready-for-review':'blocked',scope:'Full-App Chromium UQ E2E and existing broad browser suite; not all possible app cases or native Safari.',boundary,documentation,offlineWorker,featureFlag:'VITE_FINANCIAL_UQ_WORKER=false disables jobs without synchronous fallback; tested in isolated build.',researchGate:'Unchanged; operational energy regressions included via upstream gates.',fileSha256,checks},null,2)+'\n');
process.exitCode=passed?0:1;
