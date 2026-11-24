import assert from 'node:assert/strict';
import express from 'express';
import {once} from 'node:events';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {createResearchRouter} from '../src/server/researchApi';
process.env.JWT_SECRET='synthetic-browser-test';process.env.EXTERNAL_DATA_ENABLED='true';
const built=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {ExternalDataReview} from './src/components/ExternalDataReview';const root=createRoot(document.getElementById('root'));function render(latitude=40){root.render(React.createElement(ExternalDataReview,{token:'synthetic-test',latitude,longitude:-74,lang:new URLSearchParams(location.search).get('lang')||'en'}));}window.changeSite=()=>render(41);render();`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'esm',platform:'browser'});
const app=express();app.use('/api/v1/research',createResearchRouter({resolveIdentity:req=>req.headers.authorization==='Bearer synthetic-test'?{userId:'synthetic'}:{}}));app.get('/fixture.js',(_req,res)=>res.type('js').send(built.outputFiles[0].text));app.get('/',(_req,res)=>res.type('html').send('<div id="root"></div><script type="module" src="/fixture.js"></script>'));
const server=app.listen(0,'0.0.0.0');await once(server,'listening');const addr=server.address();assert.ok(addr&&typeof addr==='object');
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try{
 process.env.AWS_EXECUTION_ENV??='AWS_Lambda_nodejs20.x';browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE_PATH??(process.platform==='linux'?await(await import('@sparticuz/chromium')).default.executablePath():undefined),headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({acceptDownloads:true});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const context={projectId:'SYNTHETIC',assetId:'meter',projectRevisionSha256:'a'.repeat(64),latitude:40,longitude:-74,boundary:'poi'};
 const payload={target:{context,startUtc:'2024-01-01T00:00:00Z',endUtc:'2024-01-01T01:00:00Z',intervalMinutes:60},series:{schemaVersion:'external-series-v1',kind:'scada',origin:'meter',source:'SYNTHETIC browser data',sourceVersion:'1',quality:'assumed',context,timezone:'UTC',unit:'W',powerConvention:'positive_export_negative_import',intervalMinutes:60,timestampConvention:'interval_end',statistic:'interval_mean',records:[{timestamp:'2024-01-01T01:00:00Z',value:100,quality:'valid'}]}};
 for(const lang of ['en','fa']){
  await page.goto(`http://127.0.0.1:${addr.port}/?lang=${lang}`);const panel=page.getByTestId('external-data-review');const run=panel.getByRole('button').nth(0);const upload=panel.getByLabel('Import external comparison');
  assert.equal(await run.isDisabled(),true);
  await upload.setInputFiles({name:'series.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});await page.getByTestId('external-data-status').filter({hasText:'loaded'}).waitFor();await run.click();await page.getByTestId('external-data-status').filter({hasText:'verified_for_comparison'}).waitFor();
  const wait=page.waitForEvent('download');await panel.getByRole('button').nth(2).click();const file=await(await wait).path();assert.ok(file);const receipt=JSON.parse(await readFile(file,'utf8'));assert.equal(receipt.comparisonEnergyWh,100);assert.equal(receipt.energyAdoption,false);assert.equal(receipt.researchGate.status,'blocked');
  await page.route('**/data/review',async route=>{await new Promise(r=>setTimeout(r,350));try{await route.continue();}catch{}});
  await run.click();await panel.getByRole('button').nth(1).click();await page.waitForTimeout(450);assert.equal(await page.getByTestId('external-data-status').innerText(),'idle');assert.equal(await panel.getByRole('button').nth(2).isDisabled(),true);
  await run.click();await page.evaluate(()=>{(window as unknown as {changeSite:()=>void}).changeSite();});await page.waitForTimeout(450);assert.equal(await run.isDisabled(),true);assert.equal(await panel.getByRole('button').nth(2).isDisabled(),true);await page.unroute('**/data/review');
  await upload.setInputFiles({name:'old-site.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});await page.getByTestId('external-data-status').filter({hasText:'invalid_or_site_mismatch'}).waitFor();
 }
 assert.deepEqual(errors,[]);console.log('PASS F1 Chromium fa/en: real data API, import, confidential receipt download, cancel/stale response and site-change invalidation, no adoption controls');
}finally{await browser?.close();server.close();await once(server,'close');}
