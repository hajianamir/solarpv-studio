import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright-core';
import {openResearch,selectLoadMode} from './research-browser-navigation';
const port=5214;
const child=spawn(process.execPath,['--import','tsx','server.ts'],{env:{...process.env,PORT:String(port),NODE_ENV:'production',REAL_INTERNET:'false',VITE_REAL_INTERNET:'false',PVLIB_RESEARCH_ENABLED:'false',PVLIB_STUDY_ENABLED:'false'},stdio:['ignore','pipe','pipe']});
let logs='';child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try{
 const base=`http://127.0.0.1:${port}`,deadline=Date.now()+45000;
 while(true){try{if((await fetch(base+'/api/health')).ok)break;}catch{}if(Date.now()>deadline||child.exitCode!==null)throw new Error(logs);await new Promise(r=>setTimeout(r,200));}
 let executablePath:string|undefined;if(process.platform==='linux'){process.env.AWS_EXECUTION_ENV??='AWS_Lambda_nodejs20.x';executablePath=await(await import('@sparticuz/chromium')).default.executablePath();}
 browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000}});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));let researchRequests=0;
 page.on('request',r=>{if(r.url().includes('/api/v1/research/'))researchRequests++;});await page.route('https://**/*',r=>r.abort());
 const tab=async(id:string)=>page.getByTestId(`workflow-tab-${id}`).locator(':visible').first().click();
 const save=async()=>{await page.locator('textarea:focus,input:focus').evaluateAll(elements=>elements.forEach(e=>(e as HTMLElement).blur()));await page.keyboard.press('Control+s');const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('solarpv_project_save')??'null'));assert.ok(data);delete data.savedAt;delete data.traceId;return data;};
 await page.goto(base);await tab('climate');await page.getByTestId('climate-psh-display').waitFor();
 assert.equal(researchRequests,0);for(const id of ['research-editor','pvlib-study-panel','advanced-dispatch-panel','external-data-review'])assert.equal(await page.getByTestId(id).count(),0);
 assert.equal(await page.getByTestId('workflow-tab-system_mode').count(),0);await tab('electrical_requirements');await page.locator('#target-plant-capacity-input').fill('2500');assert.equal(await page.getByTestId('load-grid-policy').count(),0);assert.equal(await page.locator('#outage-hours-input').count(),0);
 const before=await save();await openResearch(page);await page.getByTestId('research-editor').waitFor();assert.ok(researchRequests>0);const panel=page.getByTestId('research-editor');
 const topics=panel.getByRole('tab');assert.equal(await topics.count(),13);
 for(const t of await topics.all()){
  await t.click();const active=panel.locator('[data-research-topic]:visible');assert.equal(await active.count(),1);assert.equal(await t.getAttribute('aria-selected'),'true');
  for(const button of await active.getByRole('button').all()){
   await button.click();const input=JSON.parse(await panel.getByLabel('Research JSON').inputValue());assert.ok(input.operation&&input.plan.schemaVersion);assert.ok((await panel.getByTestId('research-preview').innerText()).includes('not_field_validated'));assert.equal(await panel.getByRole('button',{name:'Run research',exact:true}).isDisabled(),true);
  }
 }
 assert.deepEqual(await save(),before,'Research interaction mutated persisted engineering/finance inputs');
 await panel.getByTestId('research-topic-physical').click();await panel.getByTestId('research-topic-physical').focus();await page.keyboard.press('ArrowRight');assert.equal(await panel.getByTestId('research-topic-calibration').getAttribute('aria-selected'),'true');await page.keyboard.press('Home');await page.keyboard.press('End');assert.equal(await panel.getByTestId('research-topic-calibration').getAttribute('aria-selected'),'true');
 await page.getByTestId('research-section-studies').click();await page.getByTestId('pvlib-study-panel').waitFor();assert.equal(await page.getByTestId('research-editor').count(),0);
 await page.getByTestId('research-section-dispatch').click();await page.getByTestId('advanced-dispatch-panel').waitFor();
 await page.getByTestId('research-section-data').click();await page.getByTestId('external-data-review').waitFor();assert.equal(await page.getByTestId('operational-energy-panel').count(),0);
 await tab('climate');assert.equal(await page.getByTestId('research-workspace').count(),0);
 // Policy exists only under loads; mode changes still drive real workflow and sizing.
 await selectLoadMode(page,'ongrid');await page.locator('#outage-hours-input').fill('9');assert.equal(await page.getByTestId('workflow-tab-electrical_requirements').count(),0);assert.equal(await page.getByTestId('workflow-tab-mv_substation').count(),0);
 let saved=await save();assert.equal(saved.outageHours,9);assert.equal(saved.systemMode,'ongrid');assert.equal(saved.targetPowerplantCapacityKw,2500);
 await page.getByTestId('load-mode-offgrid').click();await page.locator('#autonomy-days-input').fill('3');assert.equal(await page.locator('#outage-hours-input').count(),0);assert.equal(await page.getByTestId('workflow-tab-harmonics_grid').count(),0);saved=await save();assert.equal(saved.systemMode,'offgrid');assert.equal(saved.autonomyDays,3);
 await page.reload();await page.getByTitle(/دانلود \/ بارگذاری فایل JSON پروژه|Export \/ Import Project JSON/).click();page.on('dialog',d=>void d.accept());await page.getByRole('button',{name:/بازیابی آخرین ذخیرهٔ محلی|Restore last local save/}).click();await page.getByTestId('project-family-loads').click();await page.getByTestId('load-mode-offgrid').and(page.locator('[aria-pressed=true]')).waitFor();assert.equal(await page.getByTestId('load-mode-offgrid').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#autonomy-days-input').inputValue(),'3');
 await page.getByTestId('project-family-powerplant').click();await page.getByTestId('utility-electrical-design').waitFor();assert.equal(await page.locator('#target-plant-capacity-input').inputValue(),'2500');assert.equal(await page.getByTestId('load-grid-policy').count(),0);
 await page.getByTestId('project-family-loads').click();assert.equal(await page.getByTestId('load-mode-offgrid').getAttribute('aria-pressed'),'true');await page.getByTestId('project-family-powerplant').click();
 await page.getByRole('button',{name:'EN',exact:true}).click();await openResearch(page);assert.equal(await page.getByTestId('research-workspace').getAttribute('dir'),'ltr');await page.getByTestId('research-section-studies').click();await page.getByTestId('pvlib-study-panel').waitFor();
 // Mobile + RTL navigation remains accessible through the drawer.
 await page.getByRole('button',{name:'فا',exact:true}).click();await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Toggle navigation menu'}).click();await tab('climate');await page.getByTestId('climate-psh-display').waitFor();await page.getByRole('button',{name:'Toggle navigation menu'}).click();await tab('research');await page.getByTestId('research-workspace').waitFor();assert.equal(await page.getByTestId('research-workspace').getAttribute('dir'),'rtl');
 assert.deepEqual(errors,[]);console.log('PASS production Chromium fa/en + mobile RTL, isolated research/lazy requests, all topics/examples, keyboard, unchanged saved inputs, AC/MV preservation, load-only grid policy and save/reload');
}finally{await browser?.close();child.kill('SIGTERM');}
