import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const py=process.env.PVLIB_PYTHON??'python3';
const steps:[string,string[]][]=[
 [py,['-m','unittest','scripts.test_applied_research','-v']],
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-applied.ts']],
 [process.execPath,['scripts/ci-command.mjs','npx','eslint','--max-warnings=0','src/studies/appliedResearch.ts','src/studies/researchApi.ts','src/server/researchApi.ts','src/components/ResearchEditor.tsx']],
 [process.execPath,['scripts/ci-command.mjs','npm','run','verify:references']],
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-applied-browser.ts']],
 [process.execPath,['scripts/ci-command.mjs','git','diff','--check']],
];
const checks=[];
for(const [command,args] of steps){const r=spawnSync(command,args,{env:{...process.env,PVLIB_PYTHON:py,REAL_INTERNET:'false',VITE_REAL_INTERNET:'false'},encoding:'utf8',timeout:2400000,maxBuffer:32*1024*1024});const passed=r.status===0&&!r.error&&!r.signal;checks.push({command:[command,...args].join(' '),passed,exitCode:r.status});console.log(`${passed?'PASS':'FAIL'} ${args.join(' ')}`);if(!passed)console.error(r.stdout,r.stderr);}
const files=['services/pvlib_research/applied_research.py','services/pvlib_research/api_worker.py','src/studies/appliedResearch.ts','src/studies/researchApi.ts','src/server/researchApi.ts','src/components/ResearchEditor.tsx','sdk/solarpv_sdk/__init__.py','scripts/test_applied_research.py','scripts/test-applied.ts','scripts/test-applied-browser.ts','scripts/verify-applied.ts','docs/examples/applied/local.json','docs/examples/applied/pv.json','docs/features/APPLIED-RESEARCH-SPEC.fa.md','docs/features/APPLIED-RESEARCH.fa.md','docs/reference-data/manifest.json','docs/reference-data/tz/tzif-manifest.json','docs/audit/REFERENCE-MODELS-GATE.json','package.json'];
const fileSha256=Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
writeFileSync('docs/audit/APPLIED-RESEARCH-GATE.json',JSON.stringify({schemaVersion:'applied-research-gate-v1',runtimeTimestamp:new Date().toISOString(),softwareStatus:checks.every(c=>c.passed)?'ready-for-review':'blocked',allRemainingItemsCompleted:false,acceptedScope:['bounded nonlinear PVWatts and real discounted LCOE scenarios','Gregorian pinned local-calendar bill ensembles'],evidenceLevel:'upstream_software_and_calendar_regression_not_field_calibration',deploymentDefault:'off',boundary:{automaticEnergyAdoption:false,financeMutation:false,projectApproval:'blocked'},checks,fileSha256},null,2)+'\n');process.exitCode=checks.every(c=>c.passed)?0:1;
