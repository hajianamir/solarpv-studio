import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {preview} from 'vite';
import {chromium,type BrowserContext,type Page} from 'playwright-core';
const server=await preview({preview:{host:'127.0.0.1',port:0,strictPort:true}});
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try {
 let executablePath:string|undefined;
 if(process.platform==='linux'){process.env.AWS_EXECUTION_ENV??='AWS_Lambda_nodejs20.x';executablePath=await(await import('@sparticuz/chromium')).default.executablePath();}
 browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 const address=server.httpServer.address();assert.ok(address&&typeof address==='object');
 for(const lang of ['fa','en'] as const){
  const context:BrowserContext=await browser.newContext({viewport:{width:1536,height:1024},serviceWorkers:'block'});
  try{
   const page:Page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://**/*',r=>r.abort());
   await page.goto(`http://127.0.0.1:${address.port}`);
   if(lang==='en')await page.getByRole('button',{name:'EN',exact:true}).click();
   const tab=async(id:string)=>page.getByTestId(`workflow-tab-${id}`).locator(':visible').first().click();
   const openJson=async()=>page.getByTitle(lang==='en'?'Export / Import Project JSON':'دانلود / بارگذاری فایل JSON پروژه',{exact:true}).click();
   const restoreButton=()=>page.getByRole('button',{name:lang==='en'?'Restore last local save':'بازیابی آخرین ذخیرهٔ محلی',exact:true});
   const volume=()=>page.locator('#pump-duty-dailyWaterVolumeM3');
   const enable=()=>page.locator('#pump-duty-enable');
   const upload=async(value:unknown)=>page.locator('input[type="file"]').first().setInputFiles({name:'pump-lifecycle.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
   await tab('solar_pumping');assert.equal(await enable().isChecked(),false);
   await enable().check();await volume().fill('0');
   await page.locator('#pump-duty-totalDynamicHeadM').fill('50');
   await page.locator('#pump-duty-motorEfficiency').fill('2');
   await page.getByTestId('pump-duty-invalid-edit').waitFor();
   assert.equal(await page.locator('#pump-duty-motorEfficiency').inputValue(),'');
   await page.getByTestId('pump-duty-unavailable').waitFor();
   await volume().focus();await volume().blur();await page.keyboard.press('Control+s');
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('solarpv_project_save')??'{}').pumpDutySettings?.inputs.dailyWaterVolumeM3===0);
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('solarpv_project_save')!));
   assert.equal(saved.pumpDutySettings.enabled,true);assert.equal(saved.pumpDutySettings.inputs.motorEfficiency,null);
   await volume().fill('77');
   await openJson();page.once('dialog',d=>d.dismiss());await restoreButton().click();
   // Cancellation leaves the modal open; its close control is the first button in the dialog card.
   // Clicking the JSON trigger again is not possible through the overlay. Close via its X button.
   const modal=restoreButton().locator('..');await modal.locator('button').first().click();
   assert.equal(await volume().inputValue(),'77','Canceled local restore preserves current edits');
   const corrupt={...saved,pumpDutySettings:{...saved.pumpDutySettings,enabled:'true'}};
   await page.evaluate(value=>localStorage.setItem('solarpv_project_save',JSON.stringify(value)),corrupt);
   await openJson();page.once('dialog',d=>d.accept());await restoreButton().click();
   await page.getByRole('status').filter({hasText:lang==='en'?/Import blocked/:/بارگذاری مسدود شد/}).waitFor();
   await restoreButton().locator('..').locator('button').first().click();
   assert.equal(await volume().inputValue(),'77','Malformed local save leaves current project intact');
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('solarpv_project_save')!)),corrupt,'Rejected restore does not overwrite stored evidence');
   await page.evaluate(value=>localStorage.setItem('solarpv_project_save',JSON.stringify(value)),saved);

   await openJson();page.on('dialog',d=>d.accept());await restoreButton().click();
   await page.waitForFunction(()=>document.querySelector<HTMLInputElement>('#pump-duty-dailyWaterVolumeM3')?.value==='0');
   assert.equal(await enable().isChecked(),true);
   await tab('iran_regulations');await tab('solar_pumping');assert.equal(await volume().inputValue(),'0');
   await enable().uncheck();assert.equal(await page.getByTestId('pump-duty-result').count(),0);await enable().check();assert.equal(await volume().inputValue(),'0');
   await openJson();const downloaded=page.waitForEvent('download');
   await page.getByRole('button',{name:lang==='en'?/^Export Envelope/:/^دانلود پاکت JSON/}).click();
   const path=await(await downloaded).path();assert.ok(path);
   const envelope=JSON.parse(await readFile(path,'utf8'));assert.deepEqual(envelope.projectData.pumpDutySettings,saved.pumpDutySettings);
   envelope.projectData.pumpDutySettings.inputs.dailyWaterVolumeM3=123;
   await upload(envelope);
   await page.waitForFunction(()=>document.querySelector<HTMLInputElement>('#pump-duty-dailyWaterVolumeM3')?.value==='123');
   const malformed=structuredClone(envelope);malformed.projectData.pumpDutySettings.schemaVersion='unknown';
   await upload(malformed);await page.getByRole('status').filter({hasText:lang==='en'?/Import blocked/:/بارگذاری مسدود شد/}).waitFor();
   assert.equal(await volume().inputValue(),'123','Invalid import is atomic');
   delete envelope.projectData.pumpDutySettings;await upload(envelope);
   await page.waitForFunction(()=>document.querySelector<HTMLInputElement>('#pump-duty-enable')?.checked===false);
   await enable().check();assert.equal(await volume().inputValue(),'','Legacy import resets prior inputs');
   assert.deepEqual(errors,[]);console.log(`PASS pump lifecycle ${lang}: actual local save/restore/cancel, null/zero/off/remount, downloaded portable JSON, replacement, rejection, legacy reset.`);
  }finally{await context.close();}
 }
}finally{await browser?.close();await new Promise<void>((resolve,reject)=>server.httpServer.close(e=>e?reject(e):resolve()));}
