import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const py=process.env.PVLIB_PYTHON??'python3';
const steps:[string,string[]][]=[
 [py,['scripts/acquire_reference_data.py']],
 [py,['-m','unittest','scripts.test_battery_protocol','-v']],
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-battery-protocol.ts']],
 [process.execPath,['scripts/ci-command.mjs','npx','eslint','--max-warnings=0','src/studies/batteryProtocol.ts','src/studies/researchApi.ts','src/server/researchApi.ts','src/components/ResearchEditor.tsx']],
 [process.execPath,['scripts/ci-command.mjs','npm','run','verify:calibration']],
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-battery-protocol-browser.ts']],
 [process.execPath,['scripts/ci-command.mjs','git','diff','--check']],
];
const checks=[];
for(const [command,args] of steps){const r=spawnSync(command,args,{env:{...process.env,PVLIB_PYTHON:py,REAL_INTERNET:'false',VITE_REAL_INTERNET:'false'},encoding:'utf8',timeout:3600000,maxBuffer:32*1024*1024});const passed=r.status===0&&!r.error&&!r.signal;checks.push({command:[command,...args].join(' '),passed,exitCode:r.status,signal:r.signal});console.log(`${passed?'PASS':'FAIL'} ${args.join(' ')}`);if(!passed)console.error(r.stdout,r.stderr);}
const files=['services/pvlib_research/battery_protocol.py','services/pvlib_research/api_worker.py','src/studies/batteryProtocol.ts','src/studies/researchApi.ts','src/server/researchApi.ts','src/components/ResearchEditor.tsx','sdk/solarpv_sdk/__init__.py','scripts/test_battery_protocol.py','scripts/test-battery-protocol.ts','scripts/test-battery-protocol-browser.ts','scripts/verify-battery-protocol.ts','scripts/acquire_reference_data.py','docs/reference-data/manifest.json','docs/reference-data/pybamm/Chen2020.txt','docs/reference-data/pybamm/OKane2022.txt','docs/reference-data/pybamm/simulation-tests.txt','docs/reference-data/pybamm/LICENSE.txt','docs/examples/science-b/protocol.synthetic.json','docs/features/BATTERY-PROTOCOL-SPEC.fa.md','docs/features/BATTERY-PROTOCOL.fa.md','docs/features/A1-D3-REMAINING.fa.md','docs/audit/INTERVAL-CALIBRATION-GATE.json','package.json','CHANGELOG.md'];
const fileSha256=Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
writeFileSync('docs/audit/BATTERY-PROTOCOL-GATE.json',JSON.stringify({schemaVersion:'battery-protocol-gate-v1',runtimeTimestamp:new Date().toISOString(),softwareStatus:checks.every(c=>c.passed)?'ready-for-review':'blocked',allRemainingItemsCompleted:false,acceptedScope:['short piecewise constant signed-current cell protocols with continuous electrochemical/thermal state','separate mesh/tolerance/configured internal-time-bound sensitivity and coulomb/heating witnesses','authenticated API, SDK and editor integration'],evidenceLevel:'pinned_upstream_software_and_analytic_ledgers_not_measured_cell_validation',notCompleted:['CV/event-driven or long cycling','measured cell validation and calibrated thermal behavior','actual accepted-step statistics or general convergence-order proof','plating mechanics runaway pack safety','other remaining A1-D3 roadmap'],flags:{BATTERY_PROTOCOL_ENABLED:true,deploymentDefault:'off',requiresBaseResearchFlag:true},boundary:{automaticEnergyAdoption:false,financeMutation:false,projectApproval:'blocked',safetyApproval:'not_assessed'},checks,fileSha256},null,2)+'\n');process.exitCode=checks.every(c=>c.passed)?0:1;
