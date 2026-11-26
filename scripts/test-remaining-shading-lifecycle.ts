import assert from 'node:assert/strict';
import {simulateAnnual3dShading,type Scene3DState} from '../src/engine/roof3dShadingEngine';
import {runAnnualShadingSimulationAsync as run} from '../src/engine/workers/shadingWorkerClient';
const scene:Scene3DState={anchorLocation:{latitude:35,longitude:51,elevationM:0},roofPlanes:[],obstacles:[],pvTables:[],updatedAt:'2026-11-03T00:00:00Z'};
const expected=simulateAnnual3dShading(scene,5.2,40,{stepDays:30});
const originals={window:Object.getOwnPropertyDescriptor(globalThis,'window'),Worker:Object.getOwnPropertyDescriptor(globalThis,'Worker')};
class FakeWorker extends EventTarget {
 static mode='complete';static instances:FakeWorker[]=[];terminated=false;
 constructor(){super();FakeWorker.instances.push(this);}
 terminate(){this.terminated=true;}
 postMessage(message:{id:string}){
  if(FakeWorker.mode==='throw')throw new Error('post failed');
  const mode=FakeWorker.mode;
  setTimeout(()=>{
   if(this.terminated)return;
   if(mode==='error'||mode==='messageerror'){this.dispatchEvent(new Event(mode));return;}
   this.dispatchEvent(new MessageEvent('message',{data:{id:message.id,type:'complete',result:expected}}));
  },5);
 }
}
try{
 Object.defineProperty(globalThis,'window',{value:{},configurable:true});Object.defineProperty(globalThis,'Worker',{value:FakeWorker,configurable:true});
 const controller=new AbortController();
 const first=run(scene,5.2,40,{abortSignal:controller.signal});const second=run(scene,5.2,40);
 const settled=Promise.allSettled([first,second]);
 await assert.rejects(run(scene),/capacity/);controller.abort();
 const [a,b]=await settled;assert.equal(a.status,'rejected');assert.equal(b.status,'fulfilled');
 if(b.status==='fulfilled')assert.deepEqual(b.value,expected);
 assert.ok(FakeWorker.instances.every(worker=>worker.terminated),'Every owned Worker cleaned up');
 for(const mode of ['error','messageerror','throw']){FakeWorker.mode=mode;await assert.rejects(run(scene),/Worker|post failed/);}
 assert.ok(FakeWorker.instances.every(worker=>worker.terminated));
 Object.defineProperty(globalThis,'Worker',{value:undefined,configurable:true});
 assert.deepEqual(await run(scene,5.2,40,{stepDays:30}),expected,'Cooperative and sync paths must be numerically identical');
 const pre=new AbortController();pre.abort();await assert.rejects(run(scene,5.2,40,{abortSignal:pre.signal}),/cancelled/);
 const busy={...scene,pvTables:Array.from({length:12},(_,i)=>({id:`t${i}`,tableIndex:i,positionEnu:{x:i*10,y:0,z:1},widthM:4,slopedLengthM:2.3,tiltDeg:30,azimuthDeg:0,moduleCount:4,ratedPowerWp:2320}))};
 const abort=new AbortController();let progressed=false,timerFired=false;
 await assert.rejects(run(busy,5.2,40,{simulationMode:'hourly_8760',abortSignal:abort.signal,onProgress:()=>{if(!progressed){progressed=true;setTimeout(()=>{timerFired=true;abort.abort();},0);}}}),/aborted/);
 assert.ok(progressed&&timerFired,'Fallback yields to cancellation scheduled during execution, not just before starting');
 console.log('PASS shading lifecycle: two concurrent jobs, isolated cancellation, capacity, runtime/message/post errors, owned-worker cleanup, sync/cooperative parity, and live fallback timer cancellation. Fake Worker protocol tests; native browser tested separately by browser regression.');
}finally{
 for(const key of ['window','Worker'] as const){const old=originals[key];if(old)Object.defineProperty(globalThis,key,old);else Reflect.deleteProperty(globalThis,key);}
}
