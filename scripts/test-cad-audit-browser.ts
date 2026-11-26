import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {preview} from 'vite';
import {chromium} from 'playwright-core';
import {generatePowerplantLayout,type PowerplantCadParameters} from '../src/engine/powerplantCadLayout';

// Uses the actual production bundle and application route, NOT an isolated component.
// Run npm run build first. Browser requests to external providers are explicitly blocked.
const server=await preview({preview:{host:'127.0.0.1',port:0,strictPort:true}});
const scratch=await mkdtemp(join(tmpdir(),'solarpv-cad-browser-'));
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try{
 let executablePath:string|undefined;
 if(process.platform==='linux'){process.env.AWS_EXECUTION_ENV??='AWS_Lambda_nodejs20.x';executablePath=await(await import('@sparticuz/chromium')).default.executablePath();}
 browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1536,height:1024},serviceWorkers:'block'});
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.route('https://**/*',route=>route.abort());
 const address=server.httpServer.address();assert.ok(address&&typeof address==='object');
 await page.goto(`http://127.0.0.1:${address.port}`);
 await page.getByTestId('workflow-tab-cad_layout').locator(':visible').first().click();
 await page.locator('#cad-land-length-m').fill('500');await page.locator('#cad-land-width-m').fill('500');await page.locator('#cad-road-width-m').fill('12');await page.locator('#cad-row-pitch-m').fill('7');await page.locator('#cad-array-tilt-deg').fill('30');await page.locator('#cad-module-wattage').fill('580');
 const params:PowerplantCadParameters={structureType:'fixed_tilt',landLengthM:500,landWidthM:500,arrayTiltDeg:30,arrayAzimuthDeg:0,rowPitchM:7,moduleWattage:580,moduleLengthM:2.278,moduleWidthM:1.134,roadWidthM:12};
 const expected=generatePowerplantLayout(params);
 async function checkSvg(p:PowerplantCadParameters){
  const r=generatePowerplantLayout(p);
  await page.waitForFunction(count=>document.querySelectorAll('[data-cad-kind="table"]').length===count,r.totalTablesCount);
  const geometry=await page.locator('[data-cad-kind]').evaluateAll(elements=>elements.map(element=>({id:element.getAttribute('data-cad-id'),kind:element.getAttribute('data-cad-kind'),x:Number(element.getAttribute('x')),y:Number(element.getAttribute('y')),width:Number(element.getAttribute('width')),height:Number(element.getAttribute('height'))})));
  const scale=Math.min(790/p.landLengthM,330/p.landWidthM),startX=35+(790-p.landLengthM*scale)/2,startY=45+(330-p.landWidthM*scale)/2;
  for(const model of [...r.tables.map(t=>({...t,kind:'table'})),...r.reservedZones]){
   const drawn=geometry.find(element=>element.id===model.id);assert.ok(drawn,model.id);assert.equal(drawn.kind,model.kind);
   for(const [actual,wanted] of [[drawn.x,startX+model.xM*scale],[drawn.y,startY+model.yM*scale],[drawn.width,model.lengthM*scale],[drawn.height,model.widthM*scale]])assert.ok(Math.abs(actual-wanted)<1e-7);
  }
  assert.equal(geometry.length,r.tables.length+r.reservedZones.length);
 }
 await checkSvg(params);assert.equal(await page.locator('[data-cad-kind="mv_station"]').count(),expected.mvPowerStationsCount);
 for(const rowPitchM of [3,4,4.6]){
  await page.locator('#cad-array-tilt-deg').fill('0');await page.locator('#cad-row-pitch-m').fill(String(rowPitchM));
  await checkSvg({...params,arrayTiltDeg:0,rowPitchM});
  assert.match(await page.getByTestId('cad-pitch-summary').innerText(),/4\.6/);
 }
 await page.getByRole('button',{name:'EN',exact:true}).click();
 assert.match(await page.getByTestId('cad-pitch-summary').innerText(),/Requested pitch: 4.6 m \| Effective pitch: 4.6 m/);
 await page.locator('#cad-row-pitch-m').fill('3');await page.getByTestId('cad-pitch-adjusted').waitFor();
 assert.match(await page.getByTestId('cad-pitch-adjusted').innerText(),/prevent footprint overlap/);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export DXF',exact:true}).click();
 const download=await downloadPromise;const path=join(scratch,'screening.dxf');await download.saveAs(path);
 const dxf=await readFile(path,'utf8');assert.match(dxf,/Effective pitch: 4.6m \| Requested pitch: 3m/);assert.match(dxf,/NOT A CONSTRUCTION/);
 await page.locator('#cad-land-width-m').fill('30');await page.locator('#cad-land-length-m').fill('10000');
 await page.getByTestId('cad-layout-error').waitFor();assert.equal(await page.getByRole('button',{name:'Export DXF',exact:true}).count(),0);
 await page.locator('#cad-land-length-m').fill('500');await page.locator('#cad-land-width-m').fill('500');
 await page.getByTestId('cad-pitch-summary').waitFor();assert.equal(await page.getByTestId('cad-layout-error').count(),0);
 assert.deepEqual(errors,[]);
 console.log('PASS production Chromium CAD route: SVG/model polygon parity, all station counts, low-pitch disclosure in fa/en, real DXF download, invalid-site export suppression and recovery. External provider requests blocked; no native-platform/civil approval claimed.');
}finally{
 await browser?.close();await new Promise<void>(resolve=>server.httpServer.close(()=>resolve()));await rm(scratch,{recursive:true,force:true});
}
