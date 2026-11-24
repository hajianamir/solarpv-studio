import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const py=process.env.PVLIB_PYTHON??'python3',reference=process.env.PVLIB_REFERENCE_PYTHON;
if(!reference)throw new Error('PVLIB_REFERENCE_PYTHON required; no implicit install or runtime fallback');
const steps:[string,string[]][]=[
 [py,['scripts/acquire_reference_data.py']],
 [reference,['-m','unittest','scripts.test_material_inventory','-v']],
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-inventory.ts']],
 [process.execPath,['scripts/ci-command.mjs','npx','eslint','--max-warnings=0','src/studies/materialInventory.ts','src/studies/researchApi.ts','src/server/researchApi.ts','src/components/ResearchEditor.tsx']],
 [process.execPath,['scripts/ci-command.mjs','npm','run','verify:incoherent']],
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-inventory-browser.ts']],
 [process.execPath,['scripts/ci-command.mjs','git','diff','--check']],
];
const checks=[];
for(const [command,args] of steps){const r=spawnSync(command,args,{env:{...process.env,PVLIB_PYTHON:py,PVLIB_REFERENCE_PYTHON:reference,REAL_INTERNET:'false',VITE_REAL_INTERNET:'false'},encoding:'utf8',timeout:3300000,maxBuffer:32*1024*1024});const passed=r.status===0&&!r.error&&!r.signal;checks.push({command:[command,...args].join(' '),passed,exitCode:r.status,signal:r.signal});console.log(`${passed?'PASS':'FAIL'} ${args.join(' ')}`);if(!passed)console.error(r.stdout,r.stderr);}
const materials=['glass','silicon','silver','copper','aluminium_frames','encapsulant','backsheet'];
const files=['services/pvlib_research/material_inventory.py','services/pvlib_research/api_worker.py','src/studies/materialInventory.ts','src/studies/researchApi.ts','src/server/researchApi.ts','src/components/ResearchEditor.tsx','sdk/solarpv_sdk/__init__.py','scripts/test_material_inventory.py','scripts/test-inventory.ts','scripts/test-inventory-browser.ts','scripts/verify-inventory.ts','scripts/acquire_reference_data.py','docs/reference-data/manifest.json','docs/reference-data/pvice/material-summary.json','docs/reference-data/pvice/us-module.csv','docs/reference-data/pvice/LICENSE.txt',...materials.map(n=>'docs/reference-data/pvice/us-'+n+'.csv'),'docs/examples/references/inventory.json','docs/features/MATERIAL-INVENTORY-SPEC.fa.md','docs/features/MATERIAL-INVENTORY.fa.md','docs/features/A1-D3-REMAINING.fa.md','docs/audit/INCOHERENT-OPTICS-GATE.json','package.json','CHANGELOG.md'];
const fileSha256=Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
writeFileSync('docs/audit/MATERIAL-INVENTORY-GATE.json',JSON.stringify({schemaVersion:'material-inventory-gate-v1',runtimeTimestamp:new Date().toISOString(),softwareStatus:checks.every(c=>c.passed)?'ready-for-review':'blocked',allRemainingItemsCompleted:false,acceptedScope:['actual pinned PV ICE selected seven-material US baseline replay','versioned declared annual-kg inventory comparison with explicit context and boundary','authenticated API, SDK and editor integration'],evidenceLevel:'upstream_software_and_baseline_replay_not_verified_site_inventory',notCompleted:['verified real-site inventory and BOM','full global stock/cohort closure qualification','whole-module LCA or cost/EOL reconciliation','other remaining A1-D3 roadmap'],flags:{MATERIAL_INVENTORY_ENABLED:true,deploymentDefault:'off',requiresBaseAndReferenceFlags:true,separateRuntimeRequired:true},boundary:{automaticEnergyAdoption:false,financeMutation:false,projectApproval:'blocked'},checks,fileSha256},null,2)+'\n');process.exitCode=checks.every(c=>c.passed)?0:1;
