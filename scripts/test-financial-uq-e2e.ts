import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import {readFinancialUqArchive,uqHash} from '../src/studies/financialUqArchive';
import { runFinancialUncertaintyPropagation, type FinancialUqRunInput, type FinancialUqResult } from '../src/engine/core/uncertaintyPropagation';
const port=5226, base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['--import','tsx','server.ts'],{env:{...process.env,PORT:String(port),NODE_ENV:'production',REAL_INTERNET:'false',VITE_REAL_INTERNET:'false',SOLARPV_DB_FILE:'.cache/uq-e2e/db.json'},stdio:['ignore','pipe','pipe']});
let logs='';server.stdout.on('data',x=>logs+=x);server.stderr.on('data',x=>logs+=x);
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try {
 const deadline=Date.now()+45000;
 while(true){try{if((await fetch(`${base}/api/health`)).ok)break;}catch{}if(Date.now()>deadline||server.exitCode!==null)throw new Error(logs);await new Promise(r=>setTimeout(r,150));}
 process.env.AWS_EXECUTION_ENV??='AWS_Lambda_nodejs20.x';
 browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE_PATH??(process.platform==='linux'?await(await import('@sparticuz/chromium')).default.executablePath():undefined),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({acceptDownloads:true,serviceWorkers:'block'});
 // Observe real Worker transport, without substituting inputs, outputs, computation or network responses.
 await context.addInitScript(()=>{
  const state=window as unknown as {uqInputs:unknown[];uqOutputs:unknown[];uqWorkers:number;uqTicks:number};
  state.uqInputs=[];state.uqOutputs=[];state.uqWorkers=0;state.uqTicks=0;setInterval(()=>state.uqTicks++,5);
  const Native=window.Worker;
  window.Worker=class extends Native {
   constructor(url:string|URL,options?:WorkerOptions){super(url,options);if(String(url).includes('financialUq.worker')){(state as any).uqWorkerUrl=String(url);state.uqWorkers++;this.addEventListener('message',e=>state.uqOutputs.push(e.data));}}
   postMessage(message:unknown,options:Transferable[]|StructuredSerializeOptions=[]){if((message as {input?:unknown})?.input)state.uqInputs.push(message);if(Array.isArray(options))super.postMessage(message,options);else super.postMessage(message,options);}
  };
 });
 const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://**/*',r=>r.abort());await page.goto(base);
 await page.getByTestId('workflow-tab-financial').locator(':visible').first().click();
 const run=page.getByTestId('uq-run');await run.waitFor();assert.equal(await run.isEnabled(),true);
 const baselineSource=await page.getByTestId('active-energy-source').allTextContents();
 assert.equal(baselineSource.length,1,'energy-source guard must not pass on an empty locator');
 await run.click();await page.getByTestId('financial-uq-result').waitFor();
 const observed=await page.evaluate(()=>({inputs:(window as any).uqInputs,outputs:(window as any).uqOutputs,workers:(window as any).uqWorkers}));
 assert.ok(observed.workers>0);assert.ok(observed.outputs.at(-1).ok);
 const responsiveness=await page.evaluate(async()=>{
  const state=window as any;const resource=performance.getEntriesByType('resource').map(x=>x.name).find(x=>x.includes('financialUq.worker-'));
  // Resource timing for Worker startup may not appear on Window; instrumented transport stores URL below.
  const url=resource||state.uqWorkerUrl;const worker=new Worker(url,{type:'module'});
  const input={...state.uqInputs[0].input,sampleSize:2000};const ticks=state.uqTicks;
  return await new Promise<{ticks:number;ok:boolean}>((resolve,reject)=>{
    const timeout=setTimeout(()=>{worker.terminate();reject(new Error('responsiveness timeout'));},30000);
    worker.onmessage=e=>{clearTimeout(timeout);worker.terminate();resolve({ticks:state.uqTicks-ticks,ok:e.data.ok===true});};
    worker.onerror=()=>{clearTimeout(timeout);worker.terminate();reject(new Error('worker failed'));};worker.postMessage({input});
  });
 });
 assert.equal(responsiveness.ok,true);assert.ok(responsiveness.ticks>0,'main-thread timer did not advance during real Worker job');
 const request=observed.inputs.at(-1).input as FinancialUqRunInput;
 const actual=observed.outputs.at(-1).value as FinancialUqResult;
 const expected=runFinancialUncertaintyPropagation(request);
 const {traceId:a,...aa}=actual;const {traceId:b,...bb}=expected;assert.deepEqual(aa,bb);assert.ok(a&&b);
 await page.getByTestId('uq-explicit-flag').check();
 assert.ok((await page.getByTestId('uq-explicit-result').innerText()).includes(String(actual.annualGenerationMwh.p10)));
 for(const metric of ['lcoe','npv']){
  await page.getByTestId(`uq-${metric}-flag`).check();
  const panel=page.getByTestId(`financial-${metric}-quantiles`),wait=page.waitForEvent('download');
  await panel.getByRole('button').click();const download=await wait;const file=await download.path();assert.ok(file);
  assert.equal((await readFile(file)).subarray(0,5).toString(),'%PDF-');
 }
 const archivePanel=page.getByTestId('uq-archive-panel');
 assert.equal(await page.getByTestId('uq-archive-export').isDisabled(),true);
 await page.getByTestId('uq-archive-consent').check();
 const archiveWait=page.waitForEvent('download');await page.getByTestId('uq-archive-export').click();
 const archivePath=await(await archiveWait).path();assert.ok(archivePath);const archiveText=await readFile(archivePath,'utf8');const archive=readFinancialUqArchive(archiveText);
 assert.ok(Object.keys(archive.source.files).length>10);assert.equal(archive.request.seed,42);
 const upload=page.getByTestId('uq-archive-import');
 await upload.setInputFiles({name:'uq.json',mimeType:'application/json',buffer:Buffer.from(archiveText)});
 await page.getByTestId('uq-archive-status').filter({hasText:'integrity_verified'}).waitFor();
 await page.getByTestId('uq-archive-replay').click();await page.getByTestId('uq-archive-status').filter({hasText:'reproduced'}).waitFor();
 const corrupt=JSON.parse(archiveText);corrupt.request.seed=43;
 await upload.setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(corrupt))});
 await page.getByTestId('uq-archive-status').filter({hasText:'invalid'}).waitFor();assert.equal(await page.getByTestId('uq-archive-replay').isDisabled(),true);
 // Historical t archives remain inspectable, never replayable; no automatic model replacement.
 const historicalFixture=JSON.parse(await readFile('scripts/fixtures/financial-uq-retirement.json','utf8'));
 await upload.setInputFiles({name:'historical-t-v1.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(historicalFixture.legacyStudentTArchive))});
 await page.getByTestId('uq-archive-status').filter({hasText:'legacy_read_only'}).waitFor();
 assert.equal(await page.getByTestId('uq-archive-replay').isDisabled(),true);
 // Even a source-matching v1 Gaussian snapshot must not be relabeled as v2 execution.
 const legacyGaussian={...archive,schemaVersion:'financial-uq-archive-v1'} as Record<string,unknown>;
 delete legacyGaussian.executionPolicy;delete legacyGaussian.archiveSha256;legacyGaussian.archiveSha256=uqHash(legacyGaussian);
 await upload.setInputFiles({name:'same-code-v1.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacyGaussian))});
 await page.getByTestId('uq-archive-status').filter({hasText:'legacy_read_only'}).waitFor();
 assert.equal(await page.getByTestId('uq-archive-replay').isDisabled(),true);
 assert.ok((await page.getByTestId('uq-execution-policy').innerText()).includes('Student-t'));
 const other=structuredClone(archive);other.source.files['src/engine/financialEngine.ts']='f'.repeat(64);other.source.bundleSha256=uqHash(other.source.files);const {archiveSha256:old,...otherPayload}=other;void old;other.archiveSha256=uqHash(otherPayload);
 await upload.setInputFiles({name:'other-code.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(other))});
 await page.getByTestId('uq-archive-status').filter({hasText:'code_mismatch'}).waitFor();assert.equal(await page.getByTestId('uq-archive-replay').isDisabled(),true);
 assert.ok(await archivePanel.isVisible());
 const result=page.getByTestId('financial-uq-result');
 assert.equal(await result.getByText('INVESTMENT_GRADE',{exact:true}).count(),0);
 // Switch language in the real App and verify scientific labels in English.
 await page.getByRole('button',{name:'EN',exact:true}).click();
 assert.ok((await result.innerText()).includes('NPV screening indicator — not a credit rating'));
 assert.ok((await result.innerText()).includes('Normalized Pearson r² ranking — not variance contribution'));
 assert.ok((await page.getByTestId('uq-method-limitations').innerText()).includes('not a validated aleatory/epistemic decomposition'));
 assert.equal(await result.getByText(/First-Order Variance Contribution via SRC/).count(),0);
 // Cancel and retry: no result from cancelled work may replace the snapshot.
 // Delay only delivery of the real asset so cancellation is deterministic on fast CPUs.
 await page.route('**/financialUq.worker-*.js',async route=>{await new Promise(resolve=>setTimeout(resolve,500));try{await route.continue();}catch{ /* cancelled request */ }});
 // Keyboard activation exercises the real accessible cancel action without a sticky-header pointer race.
 await run.click();await page.getByTestId('uq-cancel').press('Enter');assert.equal(await run.isEnabled(),true);
 await page.unroute('**/financialUq.worker-*.js');
 await run.click();await page.getByTestId('uq-cancel').waitFor({state:'hidden'});await result.waitFor();
 // Real project pricing change invalidates the snapshot, then rerun uses current pricing.
 const tariff=page.locator('#fin-pricing-tariff');await tariff.fill('1900');await tariff.blur();
 await result.waitFor({state:'hidden'});await run.click();await result.waitFor();
 await page.getByLabel('UQ sample count').selectOption('200');
 await result.waitFor({state:'hidden'});await run.click();await result.waitFor();
 assert.equal(await page.evaluate(()=>(window as any).uqInputs.at(-1).input.sampleSize),200);
 assert.deepEqual(await page.getByTestId('active-energy-source').allTextContents(),baselineSource);
 // Route failure: worker asset blocked; no blocking sync fallback or fake success.
 await page.route('**/financialUq.worker-*.js',route=>route.abort());
 await run.click();await page.getByTestId('uq-worker-error').waitFor();assert.equal(await run.isEnabled(),true);
 await page.unroute('**/financialUq.worker-*.js');
 await run.click();await page.getByTestId('uq-cancel').waitFor({state:'hidden'});await result.waitFor();
 // Navigation away during a job terminates it; remount starts without stale result.
 await run.click();await page.getByTestId('workflow-tab-climate').locator(':visible').first().click();
 await page.getByTestId('workflow-tab-financial').locator(':visible').first().click();
 assert.equal(await page.getByTestId('financial-uq-result').count(),0);
 assert.deepEqual(errors,[]);
 // Real offline application reload with service worker and a previously unvisited worker asset.
 const offlineContext=await browser.newContext({serviceWorkers:'allow'});const offline=await offlineContext.newPage();await offline.goto(base);
 await offline.evaluate(async()=>{await navigator.serviceWorker.ready;});
 await offline.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 await offlineContext.setOffline(true);await offline.reload();
 await offline.getByTestId('workflow-tab-financial').locator(':visible').first().click();
 await offline.getByTestId('uq-run').click();await offline.getByTestId('financial-uq-result').waitFor();
 await mkdir('docs/audit',{recursive:true});
 await writeFile('docs/audit/UQ-004-E2E.json',JSON.stringify({status:'PASS',browser:'Chromium',surface:'Full production App + Express server + real dedicated Worker; offline App reload',parity:'All fields except clock-based traceId exactly equal direct legacy engine',responsiveness,checks:['versioned archive download/import/replay, tamper and code-mismatch rejection','fa/en risk/method labels','three quantile cards','actual PDF downloads','cancel/retry','pricing and sample-count invalidation','worker asset failure/retry','navigation cancellation','energy-source unchanged','offline worker after App reload'],manifestBytes:(await readFile('dist/manifest.web.json')).length,notTested:['native Safari','all unrelated application features']},null,2)+'\n');
 console.log('PASS full-App UQ E2E: actual Worker/parity, fa/en labels, downloads, cancel/retry, stale inputs, asset failure, navigation, offline cached Worker');
}finally{await browser?.close();server.kill('SIGTERM');}
