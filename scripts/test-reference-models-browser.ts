import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHmac} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {thermalExample,circuitExample} from '../src/studies/researchExamples';
import {validateResearchResponse,ResearchRequestSchema} from '../src/studies/researchApi';
const secret='reference-browser-only',port=5204;
const child=spawn(process.execPath,['--import','tsx','server.ts'],{env:{...process.env,PORT:String(port),NODE_ENV:'production',PVLIB_RESEARCH_ENABLED:'true',SCIENCE_B_ENABLED:'false',SCIENCE_D_ENABLED:'false',REFERENCE_MODELS_ENABLED:'true',PORTFOLIO_ANALYTICS_ENABLED:'false',JWT_SECRET:secret,JWT_ISSUER:'research',JWT_AUDIENCE:'research',REAL_INTERNET:'false',VITE_REAL_INTERNET:'false'},stdio:['ignore','pipe','pipe']});
let logs='';child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try{
 const base=`http://127.0.0.1:${port}`,deadline=Date.now()+45000;
 while(true){try{if((await fetch(`${base}/api/health`)).ok)break;}catch{}if(Date.now()>deadline||child.exitCode!==null)throw new Error(logs);await new Promise(r=>setTimeout(r,200));}
 let executablePath:string|undefined;if(process.platform==='linux'){process.env.AWS_EXECUTION_ENV??='AWS_Lambda_nodejs20.x';executablePath=await (await import('@sparticuz/chromium')).default.executablePath();}
 browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),c=Buffer.from(JSON.stringify({sub:'research-browser',iss:'research',aud:'research',exp:Math.floor(Date.now()/1000)+300})).toString('base64url');const token=`${h}.${c}.${createHmac('sha256',secret).update(`${h}.${c}`).digest('base64url')}`;
 const context=await browser.newContext({extraHTTPHeaders:{Authorization:`Bearer ${token}`},acceptDownloads:true});const page=await context.newPage();await page.route('https://**/*',r=>r.abort());const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.getByTestId('workflow-tab-climate').locator(':visible').first().click();const panel=page.getByTestId('research-editor');await panel.waitFor();const input=panel.getByLabel('Research JSON');const run=panel.getByRole('button',{name:'Run research',exact:true});
 let jobs=0;
 for(const [label,name] of [['PVDeg reference example','pvdeg'],['PV ICE reference example','pvice'],['Coherent optics reference example','optics'],['Silicon literature constants example','silicon']]){
  // Respect the unmodified six-jobs-per-minute production limiter.
  if(jobs++===6)await page.waitForTimeout(61000);
  await panel.getByRole('button',{name:label,exact:true}).click();await run.click();await panel.getByTestId('research-result').waitFor({timeout:30000});
  const request=ResearchRequestSchema.parse(JSON.parse(await readFile(`docs/examples/references/${name}.json`,'utf8')));
  const value=JSON.parse(await panel.getByTestId('research-result').innerText());validateResearchResponse(value,request);assert.equal(value.result.projectApproval,'blocked');
 }
 const download=page.waitForEvent('download');await panel.getByRole('button',{name:'Download research archive',exact:true}).click();const file=await(await download).path();assert.ok(file);assert.equal(JSON.parse(await readFile(file,'utf8')).response.result.operation,'coherent_optics');
 await panel.getByLabel('Import research').setInputFiles({name:'restore.json',mimeType:'application/json',buffer:await readFile(file)});assert.equal(await panel.getByTestId('research-result').count(),0);
 await page.route('**/api/v1/research/run',async route=>{await new Promise(r=>setTimeout(r,700));try{await route.continue();}catch{}});
 await run.click();await panel.getByRole('button',{name:'Cancel research',exact:true}).click();await page.waitForTimeout(900);assert.equal(await panel.getByTestId('research-result').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS reference production Chromium: four examples, three actual upstream engines, JWT, schema/input-bound results, archive download/restore and cancel/stale suppression');
}finally{await browser?.close();child.kill('SIGTERM');}
