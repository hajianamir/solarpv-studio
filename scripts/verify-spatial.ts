import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const py=process.env.PVLIB_PYTHON??'python3';
const steps:[string,string[]][]=[
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-spatial.ts']],
 [process.execPath,['scripts/ci-command.mjs','npx','eslint','--max-warnings=0','src/studies/spatialResearch.ts','src/studies/researchApi.ts','src/server/researchApi.ts','src/components/ResearchEditor.tsx']],
 [process.execPath,['scripts/ci-command.mjs','npm','run','verify:stefan']],
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-spatial-browser.ts']],
 [process.execPath,['scripts/ci-command.mjs','git','diff','--check']],
];
const checks=[];
for(const [command,args] of steps){const r=spawnSync(command,args,{env:{...process.env,PVLIB_PYTHON:py,REAL_INTERNET:'false',VITE_REAL_INTERNET:'false'},encoding:'utf8',timeout:3000000,maxBuffer:32*1024*1024});const passed=r.status===0&&!r.error&&!r.signal;checks.push({command:[command,...args].join(' '),passed,exitCode:r.status,signal:r.signal});console.log(`${passed?'PASS':'FAIL'} ${args.join(' ')}`);if(!passed)console.error(r.stdout,r.stderr);}
const files=['services/pvlib_research/stefan_spatial.py','services/pvlib_research/api_worker.py','src/studies/spatialResearch.ts','src/studies/researchApi.ts','src/server/researchApi.ts','src/components/ResearchEditor.tsx','sdk/solarpv_sdk/__init__.py','scripts/test-spatial.ts','scripts/test-spatial-browser.ts','scripts/verify-spatial.ts','docs/examples/stefan/request.json','docs/features/SPATIAL-INTEGRATION.fa.md','docs/features/A1-D3-REMAINING.fa.md','docs/audit/STEFAN-SPATIAL-GATE.json','package.json','CHANGELOG.md'];
const fileSha256=Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
writeFileSync('docs/audit/SPATIAL-INTEGRATION-GATE.json',JSON.stringify({schemaVersion:'spatial-integration-gate-v1',runtimeTimestamp:new Date().toISOString(),softwareStatus:checks.every(c=>c.passed)?'ready-for-review':'blocked',allRemainingItemsCompleted:false,acceptedScope:['authenticated API, SDK and editor integration of bounded 1D Stefan kernel','O(cells) independent constitutive/grid/energy witnesses','opt-in independent flag, rollback, production browser archive/cancel'],evidenceLevel:'analytic_software_verification_not_field_validation',notCompleted:['PV-T/PEM coupling','multidimensional convection or real material validation','other remaining A1-D3 roadmap items'],flags:{SPATIAL_RESEARCH_ENABLED:true,deploymentDefault:'off',requiresBaseResearchFlag:true},boundary:{automaticEnergyAdoption:false,financeMutation:false,projectApproval:'blocked'},checks,fileSha256},null,2)+'\n');process.exitCode=checks.every(c=>c.passed)?0:1;
