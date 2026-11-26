import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const port=5216,base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['--import','tsx','server.ts'],{env:{...process.env,PORT:String(port),NODE_ENV:'production',REAL_INTERNET:'false',VITE_REAL_INTERNET:'false',PVLIB_RESEARCH_ENABLED:'false'},stdio:['ignore','pipe','pipe']});
let logs='';server.stdout.on('data',x=>logs=(logs+String(x)).slice(-10000));server.stderr.on('data',x=>logs=(logs+String(x)).slice(-10000));
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
const checks:string[]=[];
try{
 const deadline=Date.now()+45000;while(true){try{if((await fetch(base+'/api/health')).ok)break;}catch{}if(Date.now()>deadline||server.exitCode!==null)throw Error(logs);await new Promise(r=>setTimeout(r,200));}
 let executablePath:string|undefined;if(process.platform==='linux'){process.env.AWS_EXECUTION_ENV??='AWS_Lambda_nodejs20.x';executablePath=await(await import('@sparticuz/chromium')).default.executablePath();}
 browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1536,height:1024},serviceWorkers:'block'}),page=await context.newPage();
 const errors:string[]=[],externalFonts:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/fonts\.(googleapis|gstatic)\.com/.test(r.url()))externalFonts.push(r.url());});await page.route('https://**/*',r=>r.abort());
 await mkdir('.cache/ui-refresh',{recursive:true});await page.goto(base);await page.getByTestId('studio-workspace').waitFor();
 const tab=async(id:string)=>{if(await page.getByRole('button',{name:'Toggle navigation menu'}).isVisible()&&await page.getByRole('button',{name:'Toggle navigation menu'}).getAttribute('aria-expanded')!=='true')await page.getByRole('button',{name:'Toggle navigation menu'}).click();await page.getByTestId(`workflow-tab-${id}`).locator(':visible').first().click();await page.locator('.studio-page-heading h1').waitFor();};
 const fit=async(label:string)=>{
  await page.waitForTimeout(220);
  const sizes=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,main:document.querySelector('main')!.getBoundingClientRect().width,shell:document.querySelector('.studio-shell')!.getBoundingClientRect().bottom,nav:document.querySelector('aside')!.getBoundingClientRect().top}));
  assert.ok(sizes.scroll<=sizes.width+1,`${label} overflows: ${JSON.stringify(sizes)}`);assert.ok(Math.abs(sizes.shell-sizes.nav)<2,`${label} shell/nav offset mismatch`);checks.push(label);
 };
 await tab('electrical_requirements');const capacity=page.locator('#target-plant-capacity-input');
 const save=async()=>{await capacity.blur();await page.keyboard.press('Control+s');return page.evaluate(()=>{const data=JSON.parse(localStorage.getItem('solarpv_project_save')??'{}');delete data.savedAt;delete data.traceId;return data;});};
 const before=await save(),comfortable=await capacity.evaluate(e=>e.getBoundingClientRect().height);
 await page.getByTestId('density-toggle').click();assert.equal(await page.getByTestId('studio-workspace').getAttribute('data-density'),'compact');
 assert.ok(await capacity.evaluate(e=>e.getBoundingClientRect().height)<comfortable,'compact controls are not denser');assert.deepEqual(await save(),before,'density changed project inputs');
 await page.reload();assert.equal(await page.getByTestId('studio-workspace').getAttribute('data-density'),'compact');await page.getByTestId('density-toggle').click();
 for(const language of ['fa','en']){
  if(language==='en')await page.getByRole('button',{name:'EN',exact:true}).click();
  for(const theme of ['dark','light']){
   if(await page.locator('html').getAttribute('data-theme')!==theme)await page.getByTestId('theme-toggle').click();
   for(const id of ['climate','electrical_requirements','catalog','array','cables_bom','financial','research','sld']){
    await tab(id);if(id==='climate')await page.getByTestId('climate-psh-display').waitFor();if(id==='research')await page.getByTestId('research-editor').waitFor();
    await fit(`${language}/${theme}/${id}/desktop`);
   }
   await tab('climate');await page.evaluate(()=>document.fonts.ready);
   assert.ok(await page.evaluate(()=>document.fonts.check('14px "Vazirmatn Variable"','پژوهش اقلیم')&&document.fonts.check('14px "Inter Variable"','Solar')&&document.fonts.check('14px "JetBrains Mono Variable"','0123456789')));
   const contrast=await page.evaluate(()=>{
    return ['.studio-nav-item[aria-current="page"]','.studio-report-trigger'].map(selector=>{
     const style=getComputedStyle(document.querySelector(selector)!);
     const foreground=(style.color.match(/[\d.]+/g)??[]).map(Number),background=(style.backgroundColor.match(/[\d.]+/g)??[]).map(Number);
     const base=(getComputedStyle(document.querySelector('.studio-sidebar')!).backgroundColor.match(/[\d.]+/g)??[]).map(Number),alpha=background[3]??1;
     let a=0,b=0;
     for(let i=0;i<3;i++){const x=foreground[i]/255,y=(background[i]*alpha+base[i]*(1-alpha))/255;a+=(x<=.04045?x/12.92:((x+.055)/1.055)**2.4)*[.2126,.7152,.0722][i];b+=(y<=.04045?y/12.92:((y+.055)/1.055)**2.4)*[.2126,.7152,.0722][i];}
     return {selector,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
    });
   });
   assert.ok(contrast.every(c=>c.ratio>=4.5),JSON.stringify(contrast));
   await page.screenshot({path:`.cache/ui-refresh/${language}-${theme}-desktop.png`});
  }
 }
 for(const width of [1440,1280,1024,768,390,320]){
  await page.setViewportSize({width,height:900});
  for(const id of ['climate','electrical_requirements','catalog','array','cables_bom','financial','research','sld']){await tab(id);await fit(`en/light/${id}/${width}`);}
 }
 // Mobile dialog focus containment, Escape, and return focus.
 const toggle=page.getByRole('button',{name:'Toggle navigation menu'});await toggle.click();
 assert.equal(await toggle.getAttribute('aria-expanded'),'true');assert.equal(await page.locator('#studio-navigation').getAttribute('aria-modal'),'true');
 await page.locator('#studio-navigation :focus').waitFor();
 await page.keyboard.press('Shift+Tab');assert.ok(await page.evaluate(()=>!!document.activeElement?.closest('#studio-navigation')),await page.evaluate(()=>JSON.stringify({active:document.activeElement?.outerHTML,nav:document.querySelector('aside')?.outerHTML.slice(0,400)})));
 await page.keyboard.press('Escape');assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.ok(await toggle.evaluate(e=>document.activeElement===e));
 await page.getByRole('button',{name:'فا',exact:true}).click();await page.setViewportSize({width:390,height:844});await tab('climate');await fit('fa/light/climate/mobile');await page.screenshot({path:'.cache/ui-refresh/fa-light-mobile.png'});
 await page.emulateMedia({reducedMotion:'reduce'});assert.ok(await page.getByTestId('studio-workspace').evaluate(e=>parseFloat(getComputedStyle(e).transitionDuration)<=.00002));
 await page.emulateMedia({media:'print'});assert.equal(await page.locator('.studio-shell').isVisible(),false);
 assert.deepEqual(externalFonts,[]);assert.deepEqual(errors,[]);
 await writeFile('.cache/ui-refresh/checks.json',JSON.stringify({status:'PASS',checks,localFonts:true,projectInputIsolation:true,nativeSafariWindowsTested:false},null,2));
 console.log(`PASS UI refresh: ${checks.length} layout checks, dark/light fa/en, 320–1536px, local fonts, density persistence/project isolation, mobile keyboard, reduced motion and print.`);
}finally{await browser?.close();server.kill('SIGTERM');}
