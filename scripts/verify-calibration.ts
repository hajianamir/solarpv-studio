import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const py=process.env.PVLIB_PYTHON??'python3';
const steps:[string,string[]][]=[
 [py,['scripts/acquire_reference_data.py']],
 [py,['-m','unittest','scripts.test_interval_calibration','-v']],
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-calibration.ts']],
 [process.execPath,['scripts/ci-command.mjs','npx','eslint','--max-warnings=0','src/studies/intervalCalibration.ts','src/studies/researchApi.ts','src/server/researchApi.ts','src/components/ResearchEditor.tsx']],
 [process.execPath,['scripts/ci-command.mjs','npm','run','verify:coupling']],
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-calibration-browser.ts']],
 [process.execPath,['scripts/ci-command.mjs','git','diff','--check']],
];
const checks=[];
for(const [command,args] of steps){const r=spawnSync(command,args,{env:{...process.env,PVLIB_PYTHON:py,REAL_INTERNET:'false',VITE_REAL_INTERNET:'false'},encoding:'utf8',timeout:3500000,maxBuffer:32*1024*1024});const passed=r.status===0&&!r.error&&!r.signal;checks.push({command:[command,...args].join(' '),passed,exitCode:r.status,signal:r.signal});console.log(`${passed?'PASS':'FAIL'} ${args.join(' ')}`);if(!passed)console.error(r.stdout,r.stderr);}
const files=['services/pvlib_research/interval_calibration.py','services/pvlib_research/api_worker.py','src/studies/intervalCalibration.ts','src/studies/researchApi.ts','src/server/researchApi.ts','src/components/ResearchEditor.tsx','sdk/solarpv_sdk/__init__.py','scripts/test_interval_calibration.py','scripts/test-calibration.ts','scripts/test-calibration-browser.ts','scripts/verify-calibration.ts','scripts/acquire_reference_data.py','docs/reference-data/manifest.json','docs/reference-data/conformal/correctness-checks.ipynb','docs/reference-data/conformal/LICENSE.txt','docs/examples/references/calibration.json','docs/features/INTERVAL-CALIBRATION-SPEC.fa.md','docs/features/INTERVAL-CALIBRATION.fa.md','docs/features/A1-D3-REMAINING.fa.md','docs/audit/PVT-PEM-COUPLING-GATE.json','package.json','CHANGELOG.md'];
const fileSha256=Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
writeFileSync('docs/audit/INTERVAL-CALIBRATION-GATE.json',JSON.stringify({schemaVersion:'interval-calibration-gate-v1',runtimeTimestamp:new Date().toISOString(),softwareStatus:checks.every(c=>c.passed)?'ready-for-review':'blocked',allRemainingItemsCompleted:false,acceptedScope:['absolute-residual exact decimal rank formula and explicit unbounded intervals','descriptive disjoint-site temporal holdout metrics with nonoverlapping windows','authenticated API, SDK and editor integration'],evidenceLevel:'author_software_reference_and_analytic_rank_verification_not_project_calibration',notCompleted:['verified project data and model-freeze audit','exchangeability or calibrated operational coverage','general UQ harmonization and tail validation','censored RUL intervals','other remaining A1-D3 roadmap'],flags:{INTERVAL_CALIBRATION_ENABLED:true,deploymentDefault:'off',requiresBaseResearchFlag:true},boundary:{automaticEnergyAdoption:false,financeMutation:false,projectApproval:'blocked',coverageGuarantee:'not_established'},checks,fileSha256},null,2)+'\n');process.exitCode=checks.every(c=>c.passed)?0:1;
