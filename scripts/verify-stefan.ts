import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const py=process.env.PVLIB_PYTHON??'python3';
const steps:[string,string[]][]=[
 [py,['scripts/build_stefan_reference.py']],
 [py,['-m','unittest','scripts.test_stefan_spatial','-v']],
 [process.execPath,['scripts/ci-command.mjs','npm','run','verify:applied']],
 [process.execPath,['scripts/ci-command.mjs','git','diff','--check']],
];
const checks=[];
for(const [command,args] of steps){const r=spawnSync(command,args,{env:{...process.env,PVLIB_PYTHON:py,REAL_INTERNET:'false',VITE_REAL_INTERNET:'false'},encoding:'utf8',timeout:2800000,maxBuffer:32*1024*1024});const passed=r.status===0&&!r.error&&!r.signal;checks.push({command:[command,...args].join(' '),passed,exitCode:r.status,signal:r.signal});console.log(`${passed?'PASS':'FAIL'} ${args.join(' ')}`);if(!passed)console.error(r.stdout,r.stderr);}
const files=['services/pvlib_research/stefan_spatial.py','scripts/test_stefan_spatial.py','scripts/build_stefan_reference.py','scripts/verify-stefan.ts','docs/features/STEFAN-SPATIAL-SPEC.fa.md','docs/features/STEFAN-SPATIAL.fa.md','docs/examples/stefan/paraffin.json','docs/examples/stefan/neumann-reference.json','docs/features/A1-D3-REMAINING.fa.md','docs/audit/APPLIED-RESEARCH-GATE.json','package.json','CHANGELOG.md'];
const fileSha256=Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
writeFileSync('docs/audit/STEFAN-SPATIAL-GATE.json',JSON.stringify({schemaVersion:'stefan-spatial-gate-v1',runtimeTimestamp:new Date().toISOString(),softwareStatus:checks.every(c=>c.passed)?'ready-for-review':'blocked',allRemainingItemsCompleted:false,acceptedScope:['standalone 1D conduction-only isothermal melting FV kernel','opt-in bounded offline CLI','independent Neumann reference and numerical regression'],notCompleted:['API/SDK/UI integration for this new kernel','PV-T/PEM coupling','multidimensional convection and material validation','remaining A1-D3 roadmap'],evidenceLevel:'analytic_verification_not_experimental_validation',deploymentDefault:'CLI disabled without --enable-research',boundary:{automaticEnergyAdoption:false,financeMutation:false,projectApproval:'blocked'},checks,fileSha256},null,2)+'\n');process.exitCode=checks.every(c=>c.passed)?0:1;
