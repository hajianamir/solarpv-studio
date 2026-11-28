import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {preview} from 'vite';
import {chromium,type BrowserContext,type Page} from 'playwright-core';
import {selectLoadMode} from './research-browser-navigation';
const independent=JSON.parse(await readFile('scripts/fixtures/physics/audit-priority-scenarios-decimal.json','utf8')).rowGeometry;
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
   await tab('iv_curve');
   const temperature=page.getByRole('slider',{name:lang==='en'?'Cell temperature °C':'دمای سلول °C',exact:true});
   await temperature.fill('0');await temperature.press('ArrowRight');await temperature.press('ArrowLeft');
   assert.equal(await page.getByTestId('legacy-cell-temperature').innerText(),'0°C');
   await tab('waterfall_loss');await page.keyboard.press('Control+e');
   const geometry=page.getByTestId('report-projected-ground-coverage');await geometry.waitFor();
   const slant=Number(await geometry.getAttribute('data-slant-m')),tilt=Number(await geometry.getAttribute('data-tilt-deg')),pitch=Number(await geometry.getAttribute('data-pitch-m'));
   assert.equal(slant,2.278,'Default report must use selected single-module slant, not4.6m');assert.ok(pitch>0);
   const expected=100*slant*Math.cos(tilt*Math.PI/180)/pitch;assert.equal(await geometry.innerText(),expected.toFixed(1)+'%');
   assert.ok(expected<100);
   assert.equal(tilt,independent.tiltDeg);assert.ok(Math.abs(pitch-independent.noonPitchM)<1e-10);assert.ok(Math.abs(expected-independent.projectedGroundCoveragePct)<1e-10);assert.ok(independent.pitchAt14TrueSolarM>pitch);
   assert.match(await page.getByTestId('report-transposition-qualification').innerText(),/Not weather-driven|مبتنی بر هواشناسی نیست/);
   const basis=await page.getByTestId('report-row-clearance-basis').innerText();
   assert.match(basis,/winter-solstice-noon|ظهر انقلاب زمستانی/);assert.doesNotMatch(basis,/provides nominal inter-row clearance|جهت تامین فاصله|IEC 62548/);
   const downloadPromise=page.waitForEvent('download');
   await page.getByTitle(lang==='en'?'Save Project File to Local Machine':'ذخیره محلی پروژه با نام دلخواه',{exact:true}).click();
   const downloaded=await downloadPromise;const file=await downloaded.path();assert.ok(file);
   const envelope=JSON.parse(await readFile(file,'utf8'));const missing=structuredClone(envelope);delete missing.projectData.selectedModule.lengthM;
   page.on('dialog',d=>d.accept());
   await page.locator('#report-restore-file-input').setInputFiles({name:'missing-dimensions.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(missing))});
   await page.locator('#report-modal-close-btn').waitFor({state:'detached'});
   await page.keyboard.press('Control+e');
   await page.getByTestId('report-projected-ground-coverage').filter({hasText:/Unavailable|در دسترس نیست/}).waitFor();
   await page.locator('#report-restore-file-input').setInputFiles({name:'restore-original.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(envelope))});
   await page.locator('#report-modal-close-btn').waitFor({state:'detached'});

   for(const mode of ['ongrid','offgrid'] as const){
    await selectLoadMode(page,mode);await tab('bess');
    await page.locator('#bess-unit-voltage').selectOption('51.2');assert.equal(await page.locator('#bess-unit-voltage').inputValue(),'51.2');
    assert.match(await page.getByTestId('battery-arrangement-status').innerText(),/51.2/);
    assert.match(await page.getByTestId('battery-arrangement-status').innerText(),/unassessed|ارزیابی نشده/);
    await tab('climate');
    await page.getByRole('button',{name:/Edit Climate Parameters|ویرایش پارامترهای اقلیمی/}).click();
    await page.locator('#climate-psh-input').fill('0.5');
    await page.getByRole('button',{name:/Apply Custom Parameters|اعمال پارامترهای سفارشی/}).click();
    await tab('scenarios');await page.getByTestId('scenario-assessment-limits').waitFor();
    for(const id of ['optimized_lifepo4','budget_gel','industrial_redundant']){
     const card=page.getByTestId(`scenario-card-${id}`);await card.waitFor();
     assert.match(await page.getByTestId(`scenario-reliability-${id}`).innerText(),/Not assessed|ارزیابی‌نشده/);
     assert.doesNotMatch(await card.innerText(),/99\.9|N\+1|hot-standby|fire safety compliance|Lowest 25-year|پایداری دائمی/);
     const pv=Number(await card.getAttribute('data-pv-kwp')),energy=Number(await page.getByTestId(`scenario-energy-${id}`).getAttribute('data-raw-kwh'));
     const expectedEnergy=pv*.5*365*(id==='industrial_redundant'?.8:.78);assert.ok(Math.abs(energy-expectedEnergy)<1e-8);
    }
   }
   assert.deepEqual(errors,[]);console.log(`PASS audit priority ${lang}: default report selected geometry/no noon-to-four-hour claim; ongrid/offgrid actual0.5PSH scenarios unassessed and energy preserved.`);
  }finally{await context.close();}
 }
}finally{await browser?.close();await new Promise<void>((resolve,reject)=>server.httpServer.close(e=>e?reject(e):resolve()));}
