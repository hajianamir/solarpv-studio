import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,statSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const commands=[
 ['npm',['run','verify:uq:worker']],
 ['npm',['run','test:uq:archive']],
 ['npx',['eslint','--max-warnings=0','src/components/FinancialTab.tsx','src/components/FinancialUqArchivePanel.tsx','src/studies/financialUqArchive.ts','src/components/FinancialEnergyQuantiles.tsx','src/components/FinancialMetricQuantiles.tsx']],
] as const;
const checks=[];
for(const [command,args] of commands){const r=spawnSync(command,[...args],{encoding:'utf8',env:{...process.env,VITE_REAL_INTERNET:'false',REAL_INTERNET:'false'},timeout:900000,maxBuffer:16*1024*1024});const passed=r.status===0&&!r.error&&!r.signal;checks.push({command:[command,...args].join(' '),passed,exitCode:r.status,signal:r.signal});console.log(`${passed?'PASS':'FAIL'} ${command} ${args.join(' ')}`);if(!passed)console.error(r.stdout,r.stderr);}
const chunks=readdirSync('dist/assets').filter(f=>f.endsWith('.js')).map(file=>({file,bytes:statSync(`dist/assets/${file}`).size})).sort((a,b)=>b.bytes-a.bytes);
const bundleBudget=chunks.every(c=>c.bytes<=1000000);
const sourceFiles=['src/studies/financialUqArchive.ts','src/components/FinancialUqArchivePanel.tsx','src/components/FinancialTab.tsx','src/components/FinancialEnergyQuantiles.tsx','src/components/FinancialMetricQuantiles.tsx','src/App.tsx','vite.config.ts','scripts/test-financial-uq-archive.ts','scripts/test-financial-uq-e2e.ts','.github/workflows/uq-acceptance.yml','docs/features/UQ-005-REPRODUCIBILITY.fa.md'];
const fileSha256=Object.fromEntries(sourceFiles.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]));
const passed=checks.every(c=>c.passed)&&bundleBudget;
const hasRootLicense=['LICENSE','LICENSE.md','LICENSE.txt'].some(existsSync);
writeFileSync('docs/audit/UQ-005-GATE.json',JSON.stringify({schemaVersion:'feature-gate-v1',feature:'UQ-005',testedAt:new Date().toISOString(),softwareStatus:passed?'ready-for-review':'blocked',overallReleaseStatus:'blocked_external_evidence',bundleBudget:{passed:bundleBudget,maxBytes:1000000,largestChunks:chunks.slice(0,6)},externalGates:{license:hasRootLicense?'requires_rights_review':'blocked_missing_owner_license_decision',windows:'not_run_in_this_session; workflow configured',nativeSafari:'blocked_native_runtime_evidence_not_available',fieldCalibration:'blocked_independent_project_data_required',validDecompositionAndP99:'blocked_method_and_tail_evidence_required'},researchAdoption:'None added; archive replay never mutates finance or project.',fileSha256,checks},null,2)+'\n');
process.exitCode=passed?0:1;
