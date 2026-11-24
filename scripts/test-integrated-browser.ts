// Browser-executed contract/archive checks on an actual two-worker result.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
const run=spawnSync(process.env.PVLIB_PYTHON??'python',['-c',"import json;from services.pvlib_research.tests.test_integrated import fixture;from services.pvlib_research.integrated import run_integrated;print(json.dumps(run_integrated(fixture(thermal='imported'))))"],{encoding:'utf8',timeout:120000,maxBuffer:32*1024*1024});
assert.equal(run.status,0,run.stderr);const result=JSON.parse(run.stdout);
const bundled=await build({stdin:{contents:"import {makeIntegratedArchive,restoreIntegratedArchive} from './src/studies/integratedStudy';globalThis.__stage55={makeIntegratedArchive,restoreIntegratedArchive};",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'browser',format:'iife'});
let executablePath:string|undefined;
if(process.platform==='linux'){process.env.AWS_EXECUTION_ENV??='AWS_Lambda_nodejs20.x';executablePath=await (await import('@sparticuz/chromium')).default.executablePath();}
const browser=await chromium.launch({headless:true,executablePath,args:process.platform==='linux'?['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']:[]});
try{
  const page=await browser.newPage();await page.route('**/*',r=>r.abort());
  await page.addScriptTag({content:bundled.outputFiles[0].text});
  const got=await page.evaluate((value)=>{
    const api=(globalThis as unknown as {__stage55:{makeIntegratedArchive:(v:unknown)=>unknown;restoreIntegratedArchive:(s:string)=>{projectApproval:string;summary:{netWh:number}}}}).__stage55;
    const archive=api.makeIntegratedArchive(value);
    const restored=api.restoreIntegratedArchive(JSON.stringify(archive));
    const broken=JSON.parse(JSON.stringify(archive));broken.result.summary.netWh++;
    let rejected=false;try{api.restoreIntegratedArchive(JSON.stringify(broken));}catch{rejected=true;}
    return {status:restored.projectApproval,netWh:restored.summary.netWh,rejected};
  },result);
  assert.equal(got.status,'blocked');assert.equal(got.netWh,result.summary.netWh);assert.equal(got.rejected,true);
  console.log('Stage55 real Chromium PASS: browser-bundled contract, actual two-worker mixed geometry/imported-cell result, portable archive roundtrip/tamper. No claim of editor/UI integration or field validation.');
}finally{await browser.close();}
