import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {chromium} from 'playwright-core';
const port=5193;
const secret='study-browser-test-only-secret';
const child=spawn(process.execPath,['--import','tsx','server.ts'],{env:{...process.env,PORT:String(port),NODE_ENV:'production',PVLIB_STUDY_ENABLED:'true',JWT_SECRET:secret,JWT_ISSUER:'study-browser',JWT_AUDIENCE:'study-browser',REAL_INTERNET:'false',VITE_REAL_INTERNET:'false'},stdio:['ignore','pipe','pipe']});
let logs='';child.stdout.on('data',data=>{logs=(logs+String(data)).slice(-12000);});child.stderr.on('data',data=>{logs=(logs+String(data)).slice(-12000);});
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try{
  const base=`http://127.0.0.1:${port}`;
  const deadline=Date.now()+45000;
  while(true){try{const res=await fetch(`${base}/api/health`,{signal:AbortSignal.timeout(1000)});if(res.ok)break;}catch{/* bounded test server startup */}if(Date.now()>deadline||child.exitCode!==null)throw new Error(`Study test server failed: ${logs}`);await new Promise(resolve=>setTimeout(resolve,200));}
  let executablePath:string|undefined;
  if(process.platform==='linux'){process.env.AWS_EXECUTION_ENV??='AWS_Lambda_nodejs20.x';executablePath=await (await import('@sparticuz/chromium')).default.executablePath();}
  browser=await chromium.launch({headless:true,executablePath,args:process.platform==='linux'?['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']:[]});
  const head=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
  const claims=Buffer.from(JSON.stringify({sub:'study-browser-user',iss:'study-browser',aud:'study-browser',exp:Math.floor(Date.now()/1000)+300})).toString('base64url');
  const token=`${head}.${claims}.${createHmac('sha256',secret).update(`${head}.${claims}`).digest('base64url')}`;
  const context=await browser.newContext({extraHTTPHeaders:{Authorization:`Bearer ${token}`},acceptDownloads:true});
  const page=await context.newPage();
  await page.route('https://**/*',route=>route.abort());
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base);
  const tab=async(name:string)=>{await page.getByTestId(`workflow-tab-${name}`).locator(':visible').first().click();};
  await tab('climate');
  const panel=page.getByTestId('pvlib-study-panel');await panel.waitFor();
  await page.getByRole('button',{name:/Edit Climate Parameters|ویرایش پارامترهای اقلیمی/}).click();
  await page.locator('#climate-latitude-input').fill('32.2');await page.locator('#climate-longitude-input').fill('-110.9');
  await page.getByRole('button',{name:/Apply Custom Parameters|اعمال پارامترهای سفارشی/}).click();
  await tab('waterfall_loss');const before=await page.locator('table').allTextContents();assert.ok(before.length);
  await tab('climate');
  const request=JSON.parse(await readFile('services/pvlib_study/tests/synthetic-study.json','utf8'));
  const invalid=structuredClone(request);invalid.weather.records[0].timestamp='2017-04-01T17:00:00';
  const upload=page.getByLabel('Import direct pvlib study JSON');
  await upload.setInputFiles({name:'invalid-study.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalid))});
  await panel.getByRole('alert').waitFor();assert.equal(await panel.getByTestId('run-pvlib-study').isDisabled(),true);
  await upload.setInputFiles({name:'synthetic-test-only.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(request))});
  await page.getByTestId('study-input-label').waitFor();
  await page.getByTestId('run-pvlib-study').click();
  await page.getByTestId('pvlib-study-result').waitFor({timeout:55000});
  const downloadPromise=page.waitForEvent('download');await page.getByTestId('download-study-json').click();
  const download=await downloadPromise;const stream=await download.createReadStream();assert.ok(stream);const chunks:Buffer[]=[];for await(const chunk of stream)chunks.push(Buffer.from(chunk));const result=JSON.parse(Buffer.concat(chunks).toString());
  assert.equal(result.engine,'pvlib-python-direct');assert.equal(result.manifest.dependencies.pvlib,'0.13.1');assert.deepEqual(result.request,request);assert.ok(result.execution.runId);assert.equal(result.manifest.period.completeUtcCalendarYear,false);assert.ok(result.summary.acWh>0);
  const csvPromise=page.waitForEvent('download');await page.getByTestId('download-study-csv').click();assert.ok((await csvPromise).suggestedFilename().endsWith('.csv'));
  // Explicit service failure cannot silently show a screening result or retain a completed study.
  await page.route('**/api/v1/studies/run',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({code:'UNAVAILABLE',message:'Injected runtime outage; no fallback'})}));
  await page.getByTestId('run-pvlib-study').click();await panel.getByRole('alert').waitFor();assert.equal(await page.getByTestId('pvlib-study-result').count(),0);
  await tab('waterfall_loss');assert.deepEqual(await page.locator('table').allTextContents(),before,'Independent study changed screening waterfall');
  assert.deepEqual(errors,[]);
  console.log('Direct study real-browser PASS: invalid import, actual Python run over authenticated HTTP, JSON/CSV download, explicit outage without fallback, screening waterfall unchanged. Synthetic numerical inputs only.');
}finally{await browser?.close();child.kill('SIGTERM');}
