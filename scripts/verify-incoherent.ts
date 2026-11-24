import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const py=process.env.PVLIB_PYTHON??'python3',reference=process.env.PVLIB_REFERENCE_PYTHON;
if(!reference)throw new Error('PVLIB_REFERENCE_PYTHON required; no implicit install or runtime fallback');
const steps:[string,string[]][]=[
 [py,['scripts/acquire_reference_data.py']],
 [reference,['-m','unittest','scripts.test_incoherent_optics','-v']],
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-incoherent.ts']],
 [process.execPath,['scripts/ci-command.mjs','npx','eslint','--max-warnings=0','src/studies/incoherentOptics.ts','src/studies/researchApi.ts','src/server/researchApi.ts','src/components/ResearchEditor.tsx']],
 [process.execPath,['scripts/ci-command.mjs','npm','run','verify:spatial']],
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-incoherent-browser.ts']],
 [process.execPath,['scripts/ci-command.mjs','git','diff','--check']],
];
const checks=[];
for(const [command,args] of steps){const r=spawnSync(command,args,{env:{...process.env,PVLIB_PYTHON:py,PVLIB_REFERENCE_PYTHON:reference,REAL_INTERNET:'false',VITE_REAL_INTERNET:'false'},encoding:'utf8',timeout:3200000,maxBuffer:32*1024*1024});const passed=r.status===0&&!r.error&&!r.signal;checks.push({command:[command,...args].join(' '),passed,exitCode:r.status,signal:r.signal});console.log(`${passed?'PASS':'FAIL'} ${args.join(' ')}`);if(!passed)console.error(r.stdout,r.stderr);}
const files=['services/pvlib_research/incoherent_optics.py','services/pvlib_research/api_worker.py','src/studies/incoherentOptics.ts','src/studies/researchApi.ts','src/server/researchApi.ts','src/components/ResearchEditor.tsx','sdk/solarpv_sdk/__init__.py','scripts/test_incoherent_optics.py','scripts/test-incoherent.ts','scripts/test-incoherent-browser.ts','scripts/verify-incoherent.ts','scripts/acquire_reference_data.py','docs/reference-data/manifest.json','docs/reference-data/tmm/engine-source.txt','docs/reference-data/tmm/upstream-tests.txt','docs/reference-data/tmm/LICENSE.txt','docs/examples/references/incoherent.json','docs/features/INCOHERENT-OPTICS-SPEC.fa.md','docs/features/INCOHERENT-OPTICS.fa.md','docs/features/A1-D3-REMAINING.fa.md','docs/audit/SPATIAL-INTEGRATION-GATE.json','package.json','CHANGELOG.md'];
const fileSha256=Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
writeFileSync('docs/audit/INCOHERENT-OPTICS-GATE.json',JSON.stringify({schemaVersion:'incoherent-optics-gate-v1',runtimeTimestamp:new Date().toISOString(),softwareStatus:checks.every(c=>c.passed)?'ready-for-review':'blocked',allRemainingItemsCompleted:false,acceptedScope:['actual pinned tmm all-incoherent normal-incidence adapter','independent intensity-series and coherent phase-average tests','authenticated API, SDK and editor integration'],evidenceLevel:'upstream_software_and_analytic_verification_not_technology_EQE_or_field_validation',notCompleted:['mixed coherent/incoherent stacks','oblique incidence for this new adapter','roughness/scattering/depth profile','measured technology EQE','other remaining A1-D3 roadmap'],flags:{INCOHERENT_OPTICS_ENABLED:true,deploymentDefault:'off',requiresBaseAndReferenceFlags:true,separateRuntimeRequired:true},boundary:{automaticEnergyAdoption:false,financeMutation:false,projectApproval:'blocked'},checks,fileSha256},null,2)+'\n');process.exitCode=checks.every(c=>c.passed)?0:1;
