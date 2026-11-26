import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';
const html=`<!doctype html><script type="module">
import {runAnnualShadingSimulationAsync as run} from '/src/engine/workers/shadingWorkerClient.ts';
window.runCases=async()=>{
 const empty={anchorLocation:{latitude:35,longitude:51,elevationM:0},roofPlanes:[],obstacles:[],pvTables:[],updatedAt:'2026-11-03T00:00:00Z'};
 const busy={...empty,pvTables:Array.from({length:12},(_,i)=>({id:'t'+i,tableIndex:i,positionEnu:{x:i*10,y:0,z:1},widthM:4,slopedLengthM:2.3,tiltDeg:30,azimuthDeg:0,moduleCount:4,ratedPowerWp:2320}))};
 const ctrl=new AbortController();let progressed=false;
 const first=run(busy,5.2,40,{simulationMode:'hourly_8760',abortSignal:ctrl.signal,onProgress:()=>{progressed=true;ctrl.abort();}});
 const second=run(empty,5.2,40,{stepDays:30});
 const settled=await Promise.allSettled([first,second]);
 const original=window.Worker;window.Worker=undefined;
 let timer=false,fallbackProgress=false,fallbackCancelled=false;
 try{
  const cancel=new AbortController();
  try{await run(busy,5.2,40,{simulationMode:'hourly_8760',abortSignal:cancel.signal,onProgress:()=>{if(!fallbackProgress){fallbackProgress=true;setTimeout(()=>{timer=true;cancel.abort();},0);}}});}catch(e){fallbackCancelled=/aborted/.test(e.message);}
 }finally{window.Worker=original;}
 return {first:settled[0].status,second:settled[1].status,progressed,timer,fallbackProgress,fallbackCancelled};
};
</script>`;
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0},plugins:[{name:'isolated-worker-harness',configureServer(s){s.middlewares.use('/__remaining_worker_test',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});}}]});
await server.listen();
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try{
 let executablePath:string|undefined;if(process.platform==='linux'){process.env.AWS_EXECUTION_ENV??='AWS_Lambda_nodejs20.x';executablePath=await(await import('@sparticuz/chromium')).default.executablePath();}
 browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 const address=server.httpServer!.address();assert.ok(address&&typeof address==='object');
 const page=await browser.newPage();let workers=0;const errors:string[]=[];page.on('worker',()=>workers++);page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`http://127.0.0.1:${address.port}/__remaining_worker_test`);await page.waitForFunction('typeof window.runCases === "function"');
 const result=await page.evaluate('window.runCases()');
 assert.deepEqual(result,{first:'rejected',second:'fulfilled',progressed:true,timer:true,fallbackProgress:true,fallbackCancelled:true});assert.equal(workers,2);assert.deepEqual(errors,[]);
 console.log('PASS real Chromium: two native Workers, cancellation during progress isolated from concurrent completion; live no-Worker fallback processes timer cancellation. Vite module harness, not production bundle coverage.');
}finally{await browser?.close();await server.close();}
