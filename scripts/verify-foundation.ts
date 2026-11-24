import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {capabilityManifest} from '../src/capabilities/manifest';
const py=process.env.PVLIB_PYTHON??(process.platform==='win32'?'python':'python3');
const steps:[string,string[]][]=[
 ...['verify:physics-registry','verify:source-invariants','verify:engine-claims','verify:rate-limit','test'].map(name=>[process.execPath,['scripts/ci-command.mjs','npm','run',name]] as [string,string[]]),
 [process.execPath,['scripts/ci-command.mjs','npm','run','lint:types']],
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-foundation.ts']],
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-foundation-browser.ts']],
 [py,['-m','unittest','discover','-s','sdk','-p','test_*.py','-v']],
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-research-api.ts']],
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-physical-models.ts']],
 [process.execPath,['scripts/ci-command.mjs','npx','eslint','--max-warnings=0','src/capabilities/manifest.ts','src/studies/externalSeries.ts','src/components/ExternalDataReview.tsx','src/server/researchApi.ts']],
 [process.execPath,['scripts/ci-command.mjs','npm','run','verify:uq:remaining']],
 [process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/test-research-browser.ts']],
];
const checks=[];
for(const [command,args] of steps){const result=spawnSync(command,args,{encoding:'utf8',env:{...process.env,PYTHONPATH:'sdk',REAL_INTERNET:'false',VITE_REAL_INTERNET:'false'},timeout:900000,maxBuffer:16*1024*1024});const passed=result.status===0&&!result.error&&!result.signal;checks.push({command:[command,...args].join(' '),passed,exitCode:result.status,signal:result.signal});console.log(`${passed?'PASS':'FAIL'} ${args.join(' ')}`);if(!passed)console.error(result.stdout,result.stderr);}
const manifest=capabilityManifest(true)!;
const files=new Set(['src/capabilities/manifest.json','src/capabilities/manifest.ts','src/engine/core/modelRegistry.ts','src/studies/externalSeries.ts','src/server/researchApi.ts','src/components/ResearchEditor.tsx','src/components/ExternalDataReview.tsx','sdk/solarpv_sdk/__init__.py','sdk/pyproject.toml','sdk/test_sdk.py','sdk/example.py','scripts/test-foundation.ts','scripts/test-foundation-browser.ts','scripts/verify-foundation.ts','package.json','docs/features/F0-F1-FOUNDATION.fa.md','docs/examples/external-series.synthetic.json','docs/audit/UQ-005-GATE.json','.github/workflows/foundation-acceptance.yml']);
for(const row of manifest.capabilities)for(const f of [...row.executors,...row.ui,...row.tests])files.add(f);
const hashes=Object.fromEntries([...files].sort().map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]));
const passed=checks.every(c=>c.passed);
writeFileSync('docs/audit/F0-F1-GATE.json',JSON.stringify({schemaVersion:'foundation-gate-v1',softwareStatus:passed?'ready-for-review':'blocked',overallReleaseStatus:'blocked_external_evidence',scope:'F0 exact capability inventory; F1 bounded data comparison and opt-in SDK foundation, not live ingestion, persistence or energy adoption',runtimeTimestamp:new Date().toISOString(),runtime:{node:process.version,platform:process.platform},coverage:{capabilities:manifest.capabilities.length,partial:manifest.capabilities.filter(r=>r.maturity==='partial').length,planned:manifest.capabilities.filter(r=>r.maturity==='planned').length},testFlags:{CAPABILITY_AUDIT_ENABLED:true,EXTERNAL_DATA_ENABLED:true,PVLIB_RESEARCH_ENABLED:true,SDK_ENABLED:true},deploymentDefaults:'off; explicit opt-in required',boundary:{newEnergyAdoptionPath:false,newFinanceMutation:false,researchGate:'blocked'},externalBlockers:manifest.externalBlockers,checks,fileSha256:hashes},null,2)+'\n');process.exitCode=passed?0:1;
