import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { mkdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { startFinancialUq, type UqWorkerPort } from '../src/studies/financialUqRunner';
import { runFinancialUncertaintyPropagation } from '../src/engine/core/uncertaintyPropagation';
import { DEFAULT_FINANCIAL_PRICING } from '../src/engine/financialEngine';
const input = { plantCapacityKwp: 1000, inverterCapacityKw: 1000, baseAnnualYieldKwh: 1800000, basePricing: DEFAULT_FINANCIAL_PRICING, sampleSize: 60, seed: 42 };
let terminated = 0;
function fake(): UqWorkerPort {
  return { onmessage:null, onerror:null, onmessageerror:null, postMessage() {}, terminate() { terminated++; } };
}
const cancelled = startFinancialUq(input, {workerFactory:fake});
cancelled.cancel(); await assert.rejects(cancelled.promise, /CANCELLED/); assert.equal(terminated,1);
cancelled.cancel(); assert.equal(terminated,1);
await assert.rejects(startFinancialUq(input,{workerFactory:fake,timeoutMs:5}).promise,/TIMEOUT/);
await assert.rejects(startFinancialUq(input,{workerFactory:()=>{throw new Error('secret');}}).promise,/UNAVAILABLE/);
let port = fake(); const failure=startFinancialUq(input,{workerFactory:()=>port});
port.onmessage!({data:{ok:false,error:'private data'}} as MessageEvent); await assert.rejects(failure.promise,/^Error: UQ_WORKER_FAILED$/);
port=fake();const malformed=startFinancialUq(input,{workerFactory:()=>port});port.onmessage!({data:{ok:true,value:{}}} as MessageEvent);await assert.rejects(malformed.promise,/FAILED/);
// Corrupt full, otherwise plausible replies: three valid medians are not a sufficient contract.
const fixture=runFinancialUncertaintyPropagation(input);
const mutations:((r:typeof fixture)=>void)[]=[
 r=>{r.annualGenerationMwh.p10=NaN;},r=>{r.annualGenerationMwh.p90=r.annualGenerationMwh.p10-1;},
 r=>{r.lcoeUsdPerMwh.unit='USD';},r=>{r.npvUsd.stdDev=Infinity;},r=>{r.sampleCount++;},
 r=>{r.trialStatusBreakdown!.irrDefinedTrials++;},r=>{r.tornadoSensitivityRanking[0].varianceContributionPercent=101;},
 r=>{r.uncertaintyDecomposition!.aleatoryVariancePct=-1;},r=>{r.traceId=' ';},
];
for(const mutate of mutations){const reply=structuredClone(fixture);mutate(reply);const p=fake();const job=startFinancialUq(input,{workerFactory:()=>p});p.onmessage!({data:{ok:true,value:reply}} as MessageEvent);await assert.rejects(job.promise,/UQ_WORKER_FAILED/);}
for(const kind of ['error','messageerror','post'] as const){const p=fake();if(kind==='post')p.postMessage=()=>{throw new Error('private');};const job=startFinancialUq(input,{workerFactory:()=>p});if(kind==='error')p.onerror!({preventDefault(){}} as ErrorEvent);if(kind==='messageerror')p.onmessageerror!({} as MessageEvent);await assert.rejects(job.promise,/UQ_WORKER_/);}
const bundled=await build({entryPoints:['src/studies/financialUq.worker.ts'],bundle:true,write:false,format:'esm',platform:'node',banner:{js:"import {parentPort} from 'node:worker_threads'; globalThis.self = {postMessage: data => parentPort.postMessage(data)}; parentPort.on('message', data => self.onmessage({data}));"}});
await mkdir('.cache/uq-worker',{recursive:true});await writeFile('.cache/uq-worker/worker.mjs',bundled.outputFiles[0].contents);
function nodeFactory(): UqWorkerPort {
  const thread=new Worker(new URL('../.cache/uq-worker/worker.mjs',import.meta.url));
  const adapter:UqWorkerPort={onmessage:null,onerror:null,onmessageerror:null,postMessage:data=>thread.postMessage(data),terminate:()=>{void thread.terminate();}};
  thread.on('message',data=>adapter.onmessage?.({data} as MessageEvent));
  thread.on('error',()=>adapter.onerror?.({preventDefault(){}} as ErrorEvent));return adapter;
}
for (const systemMode of ['powerplant','ongrid','offgrid'] as const) {
 const request={...input,systemMode}; const before=JSON.stringify(request);
 const actual=await startFinancialUq(request,{workerFactory:nodeFactory}).promise;
 const expected=runFinancialUncertaintyPropagation(request);
 const {traceId:a,...restA}=actual;const {traceId:b,...restB}=expected;
 assert.ok(a && b);assert.deepEqual(restA,restB);assert.equal(JSON.stringify(request),before);
}
await assert.rejects(startFinancialUq({...input,sampleSize:100000},{workerFactory:nodeFactory}).promise,/FAILED/);
// Build-time rollback flag must block before allocating any Worker (never a sync fallback).
const disabledBundle=await build({stdin:{contents:`import {startFinancialUq} from './src/studies/financialUqRunner'; export let created=0; export const code=startFinancialUq(${JSON.stringify(input)},{workerFactory:()=>{created++;throw new Error('allocation');}}).promise.catch(e=>e.message);`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',define:{'import.meta.env':'{"VITE_FINANCIAL_UQ_WORKER":"false"}'}});
await writeFile('.cache/uq-worker/disabled.mjs',disabledBundle.outputFiles[0].contents);
const disabled=await import('../.cache/uq-worker/disabled.mjs' as string);assert.equal(await disabled.code,'UQ_WORKER_UNAVAILABLE');assert.equal(disabled.created,0);
console.log('PASS UQ Worker: actual isolated computation parity in 3 modes, immutable inputs, bounds, cancellation, timeout, unavailable, malformed replies and disabled build flag');
