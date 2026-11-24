import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const py=process.env.PVLIB_PYTHON??(process.platform==='win32'?'python':'python3');
const steps:[string,string[]][]=[
 [py,['-m','unittest','scripts.test_science_d','-v']],
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-science-d.ts']],
 [process.execPath,['scripts/ci-command.mjs','npm','run','lint:types']],
 [process.execPath,['scripts/ci-command.mjs','npx','eslint','--max-warnings=0','src/studies/scienceD.ts','src/studies/researchApi.ts','src/server/researchApi.ts','src/components/ResearchEditor.tsx']],
 [py,['scripts/verify_science_c_kernels.py']],
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-science-d-browser.ts']],
 [process.execPath,['scripts/ci-command.mjs','git','diff','--check']],
];
const checks=[];
for(const [command,args] of steps){const r=spawnSync(command,args,{env:{...process.env,PVLIB_PYTHON:py,PYBAMM_DISABLE_TELEMETRY:'true',REAL_INTERNET:'false',VITE_REAL_INTERNET:'false'},encoding:'utf8',timeout:1800000,maxBuffer:32*1024*1024});const passed=r.status===0&&!r.error&&!r.signal;checks.push({command:[command,...args].join(' '),passed,exitCode:r.status,signal:r.signal});console.log(`${passed?'PASS':'FAIL'} ${args.join(' ')}`);if(!passed)console.error(r.stdout,r.stderr);}
const files=['services/pvlib_research/science_d.py','services/pvlib_research/api_worker.py','src/studies/scienceD.ts','src/studies/researchApi.ts','src/server/researchApi.ts','src/components/ResearchEditor.tsx','src/capabilities/manifest.json','sdk/solarpv_sdk/__init__.py','scripts/test_science_d.py','scripts/test-science-d.ts','scripts/test-science-d-browser.ts','scripts/verify-science-d.ts','docs/examples/science-d/degradation.synthetic.json','docs/examples/science-d/circular.synthetic.json','docs/examples/science-d/bills.synthetic.json','docs/examples/science-d/scenario.synthetic.json','docs/features/D1-D3-SPEC.fa.md','docs/features/D1-D3-IMPLEMENTATION.fa.md','docs/audit/C1-C3-KERNEL-GATE.json','docs/audit/B1-B3-GATE.json','package.json','.github/workflows/foundation-acceptance.yml'];
const passed=checks.every(c=>c.passed);const fileSha256=Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
writeFileSync('docs/audit/D1-D3-GATE.json',JSON.stringify({schemaVersion:'science-d-gate-v1',runtimeTimestamp:new Date().toISOString(),softwareStatus:passed?'ready-for-review':'blocked',fullPhaseStatus:{D1:'partial_declared_Arrhenius_RH_retention_not_PVDeg_adapter_or_calibrated_RUL',D2:'partial_cohort_cutoff_ledger_and_declared_factor_bounds_not_PV_ICE_or_certified_LCA',D3:'partial_month_preserving_profiles_and_offline_typed_proposal_not_LLM'},overallReleaseStatus:'blocked_incomplete_roadmap_and_missing_field_inventory_evidence',deploymentDefault:'off',flags:{PVLIB_RESEARCH_ENABLED:true,SCIENCE_D_ENABLED:true},boundary:{automaticEnergyAdoption:false,financeMutation:false,projectApproval:'blocked',safetyApproval:'not_assessed'},checks,fileSha256},null,2)+'\n');process.exitCode=passed?0:1;
