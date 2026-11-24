import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const py=process.env.PVLIB_PYTHON??'python3';
const steps:[string,string[]][]=[
 [py,['-m','unittest','scripts.test_pvt_pem_coupling','-v']],
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-coupling.ts']],
 [process.execPath,['scripts/ci-command.mjs','npx','eslint','--max-warnings=0','src/studies/pvtPemCoupling.ts','src/studies/scienceC.ts','src/studies/researchApi.ts','src/server/researchApi.ts','src/components/ResearchEditor.tsx']],
 [process.execPath,['scripts/ci-command.mjs','npm','run','verify:inventory']],
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-coupling-browser.ts']],
 [process.execPath,['scripts/ci-command.mjs','git','diff','--check']],
];
const checks=[];
for(const [command,args] of steps){const r=spawnSync(command,args,{env:{...process.env,PVLIB_PYTHON:py,REAL_INTERNET:'false',VITE_REAL_INTERNET:'false'},encoding:'utf8',timeout:3400000,maxBuffer:32*1024*1024});const passed=r.status===0&&!r.error&&!r.signal;checks.push({command:[command,...args].join(' '),passed,exitCode:r.status,signal:r.signal});console.log(`${passed?'PASS':'FAIL'} ${args.join(' ')}`);if(!passed)console.error(r.stdout,r.stderr);}
const files=['services/pvlib_research/pvt_pem_coupling.py','services/pvlib_research/science_c.py','services/pvlib_research/api_worker.py','src/studies/pvtPemCoupling.ts','src/studies/scienceC.ts','src/studies/researchApi.ts','src/server/researchApi.ts','src/components/ResearchEditor.tsx','sdk/solarpv_sdk/__init__.py','scripts/test_pvt_pem_coupling.py','scripts/test-coupling.ts','scripts/test-coupling-browser.ts','scripts/verify-coupling.ts','docs/examples/science-c/coupled.request.json','docs/features/PVT-PEM-COUPLING-SPEC.fa.md','docs/features/PVT-PEM-COUPLING.fa.md','docs/features/A1-D3-REMAINING.fa.md','docs/audit/MATERIAL-INVENTORY-GATE.json','package.json','CHANGELOG.md'];
const fileSha256=Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
writeFileSync('docs/audit/PVT-PEM-COUPLING-GATE.json',JSON.stringify({schemaVersion:'pvt-pem-coupling-gate-v1',runtimeTimestamp:new Date().toISOString(),softwareStatus:checks.every(c=>c.passed)?'ready-for-review':'blocked',allRemainingItemsCompleted:false,acceptedScope:['one-way interval-average electrical composition of existing PV-T/PCM and PEM kernels','derived feed only, transfer losses, coarse/fine H2 sensitivity and signed energy ledger','authenticated API, SDK and editor integration'],evidenceLevel:'analytic_composition_verification_not_coupled_equipment_validation',notCompleted:['two-way thermal feedback and preheating model','instantaneous electrical feasibility','spatial Stefan coupling','experimental device qualification','other remaining A1-D3 roadmap'],flags:{PVT_PEM_COUPLING_ENABLED:true,deploymentDefault:'off',requiresBaseResearchFlag:true,separateReferenceRuntimeForThisOperation:false},boundary:{automaticEnergyAdoption:false,financeMutation:false,projectApproval:'blocked',safetyApproval:'not_assessed'},checks,fileSha256},null,2)+'\n');process.exitCode=checks.every(c=>c.passed)?0:1;
