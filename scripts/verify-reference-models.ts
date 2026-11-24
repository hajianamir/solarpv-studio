import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const py=process.env.PVLIB_PYTHON??(process.platform==='win32'?'python':'python3');
const reference=process.env.PVLIB_REFERENCE_PYTHON;
if(!reference){writeFileSync('docs/audit/REFERENCE-MODELS-GATE.json',JSON.stringify({schemaVersion:'reference-models-gate-v1',runtimeTimestamp:new Date().toISOString(),softwareStatus:'blocked',reason:'PVLIB_REFERENCE_PYTHON must name an explicitly installed separate optional environment',allRemainingItemsCompleted:false,checks:[],fileSha256:{}},null,2)+'\n');throw new Error('PVLIB_REFERENCE_PYTHON required; no auto-install or runtime fallback');}
const steps:[string,string[]][]=[
 [py,['scripts/acquire_reference_data.py']],
 [reference,['scripts/build_reference_examples.py']],
 [reference,['-m','unittest','scripts.test_reference_models','-v']],
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-reference-models.ts']],
 [reference,['-m','pip','check']],
 [process.execPath,['scripts/ci-command.mjs','npx','eslint','--max-warnings=0','src/studies/referenceModels.ts','src/studies/researchApi.ts','src/server/researchApi.ts','src/components/ResearchEditor.tsx']],
 [process.execPath,['scripts/ci-command.mjs','npm','run','verify:remaining']],
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-reference-models-browser.ts']],
 [process.execPath,['scripts/ci-command.mjs','git','diff','--check']],
];
const checks=[];
for(const [command,args] of steps){const r=spawnSync(command,args,{env:{...process.env,PVLIB_PYTHON:py,PVLIB_REFERENCE_PYTHON:reference,PYBAMM_DISABLE_TELEMETRY:'true',REAL_INTERNET:'false',VITE_REAL_INTERNET:'false'},encoding:'utf8',timeout:2200000,maxBuffer:32*1024*1024});const passed=r.status===0&&!r.error&&!r.signal;checks.push({command:[command,...args].join(' '),passed,exitCode:r.status,signal:r.signal});console.log(`${passed?'PASS':'FAIL'} ${args.join(' ')}`);if(!passed)console.error(r.stdout,r.stderr);}
const manifest=JSON.parse(readFileSync('docs/reference-data/manifest.json','utf8')) as {files:{path:string;sha256:string}[]};
const files=['services/pvlib_research/reference_models.py','services/pvlib_research/requirements-references.txt','services/pvlib_research/requirements-references.lock.txt','services/pvlib_research/api_worker.py','src/studies/referenceModels.ts','src/studies/researchApi.ts','src/server/researchApi.ts','src/components/ResearchEditor.tsx','src/capabilities/manifest.json','sdk/solarpv_sdk/__init__.py','scripts/test_reference_models.py','scripts/test-reference-models.ts','scripts/test-reference-models-browser.ts','scripts/acquire_reference_data.py','scripts/build_reference_examples.py','scripts/verify-reference-models.ts','docs/examples/references/pvdeg.json','docs/examples/references/pvice.json','docs/examples/references/optics.json','docs/examples/references/silicon.json','docs/reference-data/manifest.json','docs/features/REFERENCE-ADAPTERS-SPEC.fa.md','docs/features/REFERENCE-ADAPTERS.fa.md','docs/features/A1-D3-REMAINING.fa.md','docs/audit/A1-D3-REMAINING-GATE.json','package.json','.github/workflows/foundation-acceptance.yml',...manifest.files.map(r=>r.path)];
const fileSha256=Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));const passed=checks.every(c=>c.passed)&&manifest.files.every(r=>fileSha256[r.path]===r.sha256);
const previous=JSON.parse(readFileSync('docs/audit/A1-D3-REMAINING-GATE.json','utf8')) as {remainingSoftware:unknown;externalEvidenceRequired:unknown};
writeFileSync('docs/audit/REFERENCE-MODELS-GATE.json',JSON.stringify({schemaVersion:'reference-models-gate-v1',runtimeTimestamp:new Date().toISOString(),softwareStatus:passed?'ready-for-review':'blocked',acceptedScope:['actual pinned PVDeg Arrhenius adapter and 8760-hour upstream weather replay','actual pinned PV ICE glass baseline adapter and three unmodified upstream tests','coherent tmm adapter with independent admittance matrix and compiled Si constants example'],allRemainingItemsCompleted:false,fullRoadmapStatus:'incomplete_software_and_independent_field_evidence',evidenceLevel:'upstream_software_regression_and_compiled_constants_not_field_qualification',remainingSoftware:previous.remainingSoftware,externalEvidenceRequired:previous.externalEvidenceRequired,flags:{REFERENCE_MODELS_ENABLED:true,deploymentDefault:'off',separateRuntimeRequired:true},boundary:{automaticEnergyAdoption:false,financeMutation:false,projectApproval:'blocked',safetyApproval:'not_assessed'},checks,fileSha256},null,2)+'\n');process.exitCode=passed?0:1;
