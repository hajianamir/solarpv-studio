import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {preview} from 'vite';
import {chromium,type BrowserContext,type Page} from 'playwright-core';
const oracle=JSON.parse(await readFile('scripts/fixtures/physics/bounded-diode-pvlib.json','utf8'));
const witness=oracle.cases[0];
const server=await preview({preview:{host:'127.0.0.1',port:0,strictPort:true}});
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try{
 let executablePath:string|undefined;
 if(process.platform==='linux'){process.env.AWS_EXECUTION_ENV??='AWS_Lambda_nodejs20.x';executablePath=await(await import('@sparticuz/chromium')).default.executablePath();}
 browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 const address=server.httpServer.address();assert.ok(address&&typeof address==='object');
 for(const lang of ['fa','en'] as const){
  const context:BrowserContext=await browser.newContext({viewport:{width:1536,height:1024},serviceWorkers:'block'});
  try{
   const page:Page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://**/*',r=>r.abort());await page.goto(`http://127.0.0.1:${address.port}`);
   if(lang==='en')await page.getByRole('button',{name:'EN',exact:true}).click();
   const tab=async(id:string)=>page.getByTestId(`workflow-tab-${id}`).locator(':visible').first().click();
   await tab('iran_regulations');const npv=await page.getByTestId('iranian-equity-npv').getAttribute('data-value');
   await tab('iv_curve');assert.equal(await page.locator('#iv-model-policy').inputValue(),'legacy_nameplate_screen_v1');
   const legacy=await page.getByTestId('iv-curve-metrics').innerText();
   await page.locator('#iv-model-policy').selectOption('desoto_reference_bounded_v1');
   const request=page.locator('#reference-diode-request'),result=page.getByTestId('reference-diode-result');
   assert.equal(await request.inputValue(),'');assert.equal(await page.getByTestId('iv-curve-metrics').count(),0);
   const run=async(raw:unknown)=>{await request.fill(JSON.stringify(raw));await page.getByTestId('reference-diode-evaluate').click();};
   await run(witness.inputs[0]);await result.waitFor();assert.equal(await result.getAttribute('data-status'),'available');
   for(const key of ['voc','isc','vmp','imp','pmp']){
    const actual=Number(await page.getByTestId(`reference-diode-${key}`).getAttribute('data-raw'));
    assert.ok(Math.abs(actual-witness.expected[key])<=2e-7+1e-8*Math.abs(witness.expected[key]),`${lang} independent ${key}`);
   }
   await page.getByTestId('reference-diode-residuals').waitFor();
   await request.fill('{');assert.equal(await result.count(),0,'Any edit invalidates successful metrics');
   await page.getByTestId('reference-diode-evaluate').click();await page.getByTestId('reference-diode-unavailable').waitFor();
   for(const bad of [{}, {...witness.inputs[0],modelPolicy:'unknown'}, {...witness.inputs[0],iterationLimit:1}, {...witness.inputs[0],reference:{...witness.inputs[0].reference,photocurrentA:'10'}}]){
    await run(bad);await page.getByTestId('reference-diode-unavailable').waitFor();assert.equal(await result.count(),0,'Invalid/unconverged must not fall back');
   }
   await request.fill(' '.repeat(32769));await page.getByTestId('reference-diode-evaluate').click();await page.getByTestId('reference-diode-unavailable').waitFor();assert.equal(await result.count(),0,'Oversize text cannot produce metrics');
   await run({...witness.inputs[0],reference:{...witness.inputs[0].reference,alphaScAperC:-1e10},conditions:{...witness.inputs[0].conditions,cellTempC:85}});
   await page.getByTestId('reference-diode-unavailable').waitFor();assert.equal(await page.getByTestId('reference-diode-unavailable').getAttribute('data-reason'),'numerical_domain');
   const dark={...witness.inputs[0],conditions:{...witness.inputs[0].conditions,effectiveIrradianceWm2:0}};
   await run(dark);await result.waitFor();assert.equal(await result.getAttribute('data-status'),'dark');assert.equal(await page.getByTestId('reference-diode-pmp').getAttribute('data-raw'),'0');
   assert.equal(await page.getByTestId('reference-diode-residuals').count(),0);
   assert.equal(await request.getAttribute('maxlength'),'32768');
   await page.locator('#iv-model-policy').selectOption('legacy_nameplate_screen_v1');assert.equal(await page.getByTestId('iv-curve-metrics').innerText(),legacy,'Default legacy metrics unchanged');
   await page.locator('#iv-model-policy').selectOption('desoto_reference_bounded_v1');assert.equal(await request.inputValue(),'','Leaving reference resets temporary draft');
   await run(witness.inputs[0]);
   await tab('iran_regulations');assert.equal(await page.getByTestId('iranian-equity-npv').getAttribute('data-value'),npv,'No reference adoption into finance');
   await page.keyboard.press('Control+s');
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('solarpv_project_save')??'{}'));
   assert.equal('referenceDiode' in saved,false);assert.equal('referenceDiodeSettings' in saved,false);
   await tab('iv_curve');assert.equal(await page.locator('#iv-model-policy').inputValue(),'legacy_nameplate_screen_v1','Tab remount restores legacy default, not research selection');
   assert.deepEqual(errors,[]);console.log(`PASS reference diode ${lang}: explicit independent metrics, invalid/stale/dark/exhaustion, temporary reset, unchanged legacy/finance and no project settings.`);
  }finally{await context.close();}
 }
}finally{await browser?.close();await new Promise<void>((resolve,reject)=>server.httpServer.close(e=>e?reject(e):resolve()));}
