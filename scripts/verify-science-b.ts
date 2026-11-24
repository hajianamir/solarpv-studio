import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const py=process.env.PVLIB_PYTHON??(process.platform==='win32'?'python':'python3');
const steps:[string,string[]][]=[
 [py,['-m','unittest','scripts.test_science_b','-v']],
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-science-b.ts']],
 [process.execPath,['scripts/ci-command.mjs','npx','eslint','--max-warnings=0','src/studies/scienceB.ts','src/studies/researchApi.ts','src/server/researchApi.ts','src/components/ResearchEditor.tsx']],
 [process.execPath,['scripts/ci-command.mjs','npm','run','verify:portfolio']],
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-science-b-browser.ts']],
 [py,['-m','pip','check']],
];
const checks=[];
for(const [command,args] of steps){const r=spawnSync(command,args,{env:{...process.env,PYBAMM_DISABLE_TELEMETRY:'true',REAL_INTERNET:'false',VITE_REAL_INTERNET:'false'},encoding:'utf8',timeout:1500000,maxBuffer:32*1024*1024});const passed=r.status===0&&!r.error&&!r.signal;checks.push({command:[command,...args].join(' '),passed,exitCode:r.status,signal:r.signal});console.log(`${passed?'PASS':'FAIL'} ${args.join(' ')}`);if(!passed)console.error(r.stdout,r.stderr);}
const files=['services/pvlib_research/science_b.py','services/pvlib_research/battery_pybamm.py','services/pvlib_research/requirements-science-b.txt','services/pvlib_research/api_worker.py','src/studies/scienceB.ts','src/studies/researchApi.ts','src/server/researchApi.ts','src/components/ResearchEditor.tsx','src/capabilities/manifest.json','sdk/solarpv_sdk/__init__.py','scripts/test_science_b.py','scripts/test-science-b.ts','scripts/test-science-b-browser.ts','scripts/verify-science-b.ts','docs/examples/science-b/oet.synthetic.json','docs/examples/science-b/battery.synthetic.json','docs/examples/science-b/tandem.synthetic.json','docs/features/B1-B3-SPEC.fa.md','docs/features/B1-B3-IMPLEMENTATION.fa.md','docs/audit/A1-A3-GATE.json','package.json','.github/workflows/foundation-acceptance.yml'];
const fileSha256=Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));const passed=checks.every(c=>c.passed);
writeFileSync('docs/audit/B1-B3-GATE.json',JSON.stringify({schemaVersion:'science-b-gate-v1',runtimeTimestamp:new Date().toISOString(),softwareStatus:passed?'ready-for-review':'blocked',fullPhaseStatus:{B1:'partial_horizontal_steady_ideal_patch_OET_only',B2:'partial_published_cell_thermal_SPM_SPMe_DFN_and_optional_SEI_only',B3:'partial_common_grid_EQE_and_ideal_2T_4T_only'},scope:'Bounded numerical research methods; not completion or field qualification of B1–B3 roadmap',overallReleaseStatus:'blocked_incomplete_scope_and_missing_field_technology_evidence',flags:{PVLIB_RESEARCH_ENABLED:true,SCIENCE_B_ENABLED:true,deploymentDefault:'off'},boundary:{automaticEnergyAdoption:false,financeMutation:false,projectApproval:'blocked',safetyApproval:'not_assessed'},checks,fileSha256},null,2)+'\n');process.exitCode=passed?0:1;
