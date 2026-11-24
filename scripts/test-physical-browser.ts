import {chooseResearchExample} from './research-browser-navigation';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHmac} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright-core';
const engine=process.env.BROWSER_ENGINE==='webkit'?webkit:chromium;
import dcExample from '../docs/examples/physical-models/dc_coupled.json';
import spmExample from '../docs/examples/physical-models/electrochemical_spm.json';
import controlExample from '../docs/examples/physical-models/dq_protection_control.json';
import {thermalExample,circuitExample} from '../src/studies/researchExamples';
import {validateResearchResponse,ResearchRequestSchema} from '../src/studies/researchApi';
const secret='physical-browser-only',port=5199;
const child=spawn(process.execPath,['--import','tsx','server.ts'],{env:{...process.env,PORT:String(port),NODE_ENV:'production',PVLIB_RESEARCH_ENABLED:'true',JWT_SECRET:secret,JWT_ISSUER:'research',JWT_AUDIENCE:'research',REAL_INTERNET:'false',VITE_REAL_INTERNET:'false',SOLARPV_DB_FILE:'.cache/physical-models/browser-db.json'},stdio:['ignore','pipe','pipe']});
let logs='';child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try{
 const base=`http://127.0.0.1:${port}`,deadline=Date.now()+45000;
 while(true){try{if((await fetch(`${base}/api/health`)).ok)break;}catch{}if(Date.now()>deadline||child.exitCode!==null)throw new Error(logs);await new Promise(r=>setTimeout(r,200));}
 let executablePath=process.env.BROWSER_EXECUTABLE_PATH;if(!executablePath&&process.platform==='linux'&&engine===chromium){process.env.AWS_EXECUTION_ENV??='AWS_Lambda_nodejs20.x';executablePath=await (await import('@sparticuz/chromium')).default.executablePath();}
 browser=await engine.launch({headless:true,executablePath,args:engine===chromium?['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']:[]});
 const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),c=Buffer.from(JSON.stringify({sub:'research-browser',iss:'research',aud:'research',exp:Math.floor(Date.now()/1000)+300})).toString('base64url');const token=`${h}.${c}.${createHmac('sha256',secret).update(`${h}.${c}`).digest('base64url')}`;
 const context=await browser.newContext({extraHTTPHeaders:{Authorization:`Bearer ${token}`},acceptDownloads:true});const page=await context.newPage();await page.route('https://**/*',r=>r.abort());const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.getByTestId('workflow-tab-research').locator(':visible').first().click();const panel=page.getByTestId('research-editor');await panel.waitFor();const input=panel.getByLabel('Research JSON');const run=panel.getByRole('button',{name:'Run research',exact:true});
 await input.fill('{');assert.equal(await run.isDisabled(),true);
 await input.fill(JSON.stringify(thermalExample));await run.click();await panel.getByTestId('research-result').waitFor({timeout:30000});validateResearchResponse(JSON.parse(await panel.getByTestId('research-result').innerText()),ResearchRequestSchema.parse(thermalExample));
 const download=page.waitForEvent('download');await panel.getByRole('button',{name:'Download research archive',exact:true}).click();const d=await download,p=await d.path();assert.ok(p);const archive=await readFile(p,'utf8');assert.equal(JSON.parse(archive).schemaVersion,'research-editor-archive-v1');
 await panel.getByLabel('Import research').setInputFiles({name:'restore.json',mimeType:'application/json',buffer:Buffer.from(archive)});assert.equal(await panel.getByTestId('research-result').count(),0);
 await input.fill(JSON.stringify(circuitExample));await run.click();await panel.getByTestId('research-result').waitFor({timeout:30000});
 await chooseResearchExample(panel,'Integrated synthetic example');await run.click();await panel.getByTestId('research-result').waitFor({timeout:30000});assert.equal(JSON.parse(await panel.getByTestId('research-result').innerText()).operation,'integrated');
 for(const [button,example] of [['DC-coupled synthetic example',dcExample],['SPM Chen2020 synthetic protocol',spmExample],['dq control / protection synthetic example',controlExample]] as const){
  await panel.getByRole('button',{name:button,exact:true}).click();assert.equal(await run.isDisabled(),false);
  await run.click();await panel.getByTestId('research-result').waitFor({timeout:30000});
  validateResearchResponse(JSON.parse(await panel.getByTestId('research-result').innerText()),ResearchRequestSchema.parse(example));
  const wait=page.waitForEvent('download');await panel.getByRole('button',{name:'Download research archive',exact:true}).click();const downloaded=await wait;const file=await downloaded.path();assert.ok(file);const text=await readFile(file,'utf8');
  const stored=JSON.parse(text);validateResearchResponse(stored.response,ResearchRequestSchema.parse(stored.request));
  await panel.getByLabel('Import research').setInputFiles({name:'physical-archive.json',mimeType:'application/json',buffer:Buffer.from(text)});assert.equal(await panel.getByTestId('research-result').count(),0);
 }
 // Real server is limited per IP, not JWT identity. Respect its 6/minute budget.
 await page.waitForTimeout(61000);
 // All three public operating modes execute through the actual browser/API DC path.
 for(const mode of ['powerplant','ongrid','offgrid']){const example=structuredClone(dcExample);example.plan.mode=mode;
  if(mode==='offgrid'){example.plan.intervals.forEach(r=>{r.gridAvailable=false;r.exportLimitW=0;});}
  await input.fill(JSON.stringify(example));await run.click();await panel.getByTestId('research-result').waitFor({timeout:30000});
  validateResearchResponse(JSON.parse(await panel.getByTestId('research-result').innerText()),ResearchRequestSchema.parse(example));
 }
 await input.fill(JSON.stringify(thermalExample));assert.equal(await panel.getByTestId('research-result').count(),0);
 // Delay the real API response to exercise abort and stale-response suppression.
 await page.route('**/api/v1/research/run',async route=>{await new Promise(r=>setTimeout(r,1000));try{await route.continue();}catch{}});
 await run.click();await panel.getByRole('button',{name:'Cancel research',exact:true}).click();await page.waitForTimeout(1300);assert.equal(await panel.getByTestId('research-result').count(),0);assert.equal(await run.isDisabled(),false);
 await page.unroute('**/api/v1/research/run');await run.click();await panel.getByTestId('research-result').waitFor();
 await page.getByTestId('workflow-tab-climate').locator(':visible').first().click();await page.getByRole('button',{name:/Edit Climate Parameters|ویرایش پارامترهای اقلیمی/}).click();await page.locator('#climate-latitude-input').fill('32.2');await page.locator('#climate-longitude-input').fill('-110.9');await page.getByRole('button',{name:/Apply Custom Parameters|اعمال پارامترهای سفارشی/}).click();await page.getByTestId('workflow-tab-research').locator(':visible').first().click();await panel.waitFor();assert.equal(await panel.getByTestId('research-result').count(),0);
 assert.deepEqual(errors,[]);console.log(`PASS real browser (${process.env.BROWSER_ENGINE??'chromium'}): six research operations including DC/SPM/dq, three DC operating modes, actual JWT/API, physical archive disk readback/import, cancel/stale/site invalidation`);
}finally{await browser?.close();child.kill('SIGTERM');}
