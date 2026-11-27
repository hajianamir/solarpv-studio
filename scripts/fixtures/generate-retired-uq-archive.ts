/** Historical internal regression fixture, NOT independent scientific validation. */
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {DEFAULT_FINANCIAL_PRICING} from '../../src/engine/financialEngine';
const baseline='16d3ff4056b528c2d9a5215a5e44703e58b49db7';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
async function historical(file:string) {
 const source=execFileSync('git',['show',`${baseline}:${file}`],{encoding:'utf8'});
 const bundle=await build({stdin:{contents:source,resolveDir:path.resolve(path.dirname(file)),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node'});
 return {source,module:await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].contents).toString('base64'))};
}
const engineFile='src/engine/core/uncertaintyPropagation.ts',archiveFile='src/studies/financialUqArchive.ts';
const engine=await historical(engineFile), archive=await historical(archiveFile);
const input={plantCapacityKwp:1000,inverterCapacityKw:1000,baseAnnualYieldKwh:1800000,basePricing:DEFAULT_FINANCIAL_PRICING,sampleSize:60,seed:42};
const files={[engineFile]:sha(engine.source),[archiveFile]:sha(archive.source)};
const source={files,bundleSha256:archive.module.uqHash(files)};
const request={...input,copulaFamily:'students_t_copula'};
const historicalResult=engine.module.runFinancialUncertaintyPropagation(request);
// Clock is not part of deterministic numerical identity. Normalize only trace/runtime metadata for byte replay.
historicalResult.traceId='synthetic-historical-retired-t-fixture';
const historicalArchive=archive.module.makeFinancialUqArchive(request,historicalResult,'SYNTHETIC retirement regression, default illustrative pricing',source);
historicalArchive.runtime={engine:'synthetic historical regression, not runtime attestation',timezone:'UTC'};
const {archiveSha256:old,...payload}=historicalArchive;void old;historicalArchive.archiveSha256=archive.module.uqHash(payload);
const gaussian=Object.fromEntries(['powerplant','ongrid','offgrid'].map(systemMode=>[systemMode,
 archive.module.uqDeterministicResultHash(engine.module.runFinancialUncertaintyPropagation({...input,systemMode}))]));
const fixture={schemaVersion:'retired-uq-historical-regression-v1',baseline,sourceHashes:files,
 qualification:'Actual baseline implementation executed; known-invalid Student-t snapshot for read-only compatibility only. Gaussian hashes are internal exact regression references, not independent model validation.',input,gaussianDeterministicHashes:gaussian,legacyStudentTArchive:historicalArchive};
const target='scripts/fixtures/financial-uq-retirement.json',text=JSON.stringify(fixture,null,2)+'\n';
if(process.argv.includes('--check')){if(readFileSync(target,'utf8')!==text)throw new Error('Historical UQ fixture changed');}
else writeFileSync(target,text);
console.log('PASS actual historical v1 Student-t snapshot and three-mode Gaussian hash generation');
