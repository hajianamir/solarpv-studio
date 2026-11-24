import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import express from 'express';
import {once} from 'node:events';
import {CapabilityManifestSchema,capabilityManifest} from '../src/capabilities/manifest';
import {PHYSICS_MODEL_REGISTRY} from '../src/engine/core/modelRegistry';
import {ExternalSeriesSchema,reviewExternalSeries,readExternalSeries} from '../src/studies/externalSeries';
import {createResearchRouter} from '../src/server/researchApi';
import {uqHash} from '../src/studies/financialUqArchive';
const manifest=capabilityManifest(true)!;assert.equal(capabilityManifest(false),null);
for(const row of manifest.capabilities)for(const file of [...row.executors,...row.ui,...row.tests])assert.ok(existsSync(file),`${row.id}: ${file}`);
for(const id of ['lca_lifecycle_sustainability','hydrogen_grid_stability','multiphysics_bipv_fpv'])assert.equal(PHYSICS_MODEL_REGISTRY[id].implementationStatus,'planned');
const duplicate=structuredClone(manifest);duplicate.capabilities[0]=duplicate.capabilities[1];assert.equal(CapabilityManifestSchema.safeParse(duplicate).success,false);
const context={projectId:'SYNTHETIC-project',assetId:'SYNTHETIC-meter',projectRevisionSha256:'a'.repeat(64),latitude:40,longitude:-74,boundary:'poi' as const};
const target={context,startUtc:'2024-02-29T00:00:00Z',endUtc:'2024-02-29T02:00:00Z',intervalMinutes:60};
const series={schemaVersion:'external-series-v1' as const,kind:'external_generation' as const,origin:'wind' as const,source:'SYNTHETIC independent meter fixture',sourceVersion:'1',quality:'assumed' as const,context,timezone:'UTC',intervalMinutes:60,timestampConvention:'interval_end' as const,statistic:'interval_mean' as const,unit:'kW' as const,powerConvention:'positive_export_negative_import' as const,records:[{timestamp:'2024-02-29T01:00:00Z',value:2,quality:'valid' as const},{timestamp:'2024-02-29T02:00:00Z',value:3,quality:'valid' as const}]};
const before=JSON.stringify({series,target});
assert.throws(()=>reviewExternalSeries(series,target),/DISABLED/);
const r=reviewExternalSeries(series,target,true);assert.equal(r.comparisonEnergyWh,5000);assert.equal(r.status,'verified_for_comparison');assert.equal(r.energyAdoption,false);assert.equal(r.researchGate.status,'blocked');assert.equal(r.provenance.origin,'wind');
assert.equal(reviewExternalSeries({...series,unit:'W',records:series.records.map(x=>({...x,value:x.value*1000}))},target,true).comparisonEnergyWh,5000);
assert.equal(reviewExternalSeries({...series,kind:'scada',origin:'grid',records:series.records.map(x=>({...x,value:-x.value}))},target,true).comparisonEnergyWh,-5000);
assert.equal(reviewExternalSeries({...series,records:series.records.slice(1)},target,true).comparisonEnergyWh,null);
assert.equal(reviewExternalSeries({...series,records:[{...series.records[0],value:null,quality:'missing',reason:'SYNTHETIC gap'},series.records[1]]},target,true).coverage.missing,1);
assert.equal(reviewExternalSeries({...series,context:{...context,assetId:'other'}},target,true).status,'context_mismatch');
assert.equal(reviewExternalSeries(series,{...target,intervalMinutes:30},true).status,'interval_mismatch');
assert.equal(reviewExternalSeries({...series,records:[{...series.records[0],quality:'excluded',reason:'SYNTHETIC curtailment'},series.records[1]]},target,true).comparisonEnergyWh,null);
assert.equal(reviewExternalSeries({...series,records:[...series.records,{...series.records[1],timestamp:'2024-02-29T03:00:00Z'}]},target,true).coverage.outside,1);
assert.throws(()=>reviewExternalSeries(series,{...target,endUtc:target.startUtc},true));
assert.equal(ExternalSeriesSchema.safeParse({...series,records:[{...series.records[0],timestamp:'2024-02-29T01:30:00Z'},series.records[1]]}).success,false);

for(const patch of [{records:[series.records[1],series.records[0]]},{records:[series.records[0],series.records[0]]},{records:[{...series.records[0],value:NaN}]},{records:[{...series.records[0],value:null}]},{records:[{...series.records[0],timestamp:'2024-02-30T01:00:00Z'}]},{records:[{...series.records[0],timestamp:'garbage'}]},{timezone:'America/New_York'},{kind:'external_generation',origin:'grid'},{records:[{...series.records[0],value:-1}]},{extra:true}])assert.equal(ExternalSeriesSchema.safeParse({...series,...patch}).success,false,JSON.stringify(patch));
assert.throws(()=>readExternalSeries(JSON.stringify(series).replace('"origin":','"origin":"pv","origin":')),/duplicate/);
assert.throws(()=>readExternalSeries(' '.repeat(4*1024*1024+1)));
// DST fall-back repeated local hour represents two different physical instants, not duplicates.
const fall={...series,timezone:'America/New_York',records:[{...series.records[0],timestamp:'2024-11-03T01:00:00-04:00'},{...series.records[1],timestamp:'2024-11-03T01:00:00-05:00'}]};
assert.ok(ExternalSeriesSchema.safeParse(fall).success);
const spring={...series,timezone:'America/New_York',records:[{...series.records[0],timestamp:'2024-03-10T01:00:00-05:00'},{...series.records[1],timestamp:'2024-03-10T03:00:00-04:00'}]};assert.ok(ExternalSeriesSchema.safeParse(spring).success);
assert.equal(JSON.stringify({series,target}),before);
// CPU bound: max supported hourly leap-year record count, exact 366-day integral.
const annualStart=Date.parse('2024-01-01T00:00:00Z');const annual={...series,records:Array.from({length:8784},(_,i)=>({timestamp:new Date(annualStart+(i+1)*3600000).toISOString(),value:1,quality:'valid'}))};
const began=performance.now();assert.equal(reviewExternalSeries(annual,{...target,startUtc:'2024-01-01T00:00:00Z',endUtc:'2025-01-01T00:00:00Z'},true).comparisonEnergyWh,8784000);assert.ok(performance.now()-began<10000);
// Auth is checked before body parsing; independent data flag, no research adoption.
process.env.PVLIB_RESEARCH_ENABLED='true';
process.env.JWT_SECRET='synthetic-test-only-not-a-real-secret';process.env.EXTERNAL_DATA_ENABLED='true';process.env.CAPABILITY_AUDIT_ENABLED='true';
const app=express();app.use('/api/v1/research',createResearchRouter({resolveIdentity:req=>req.headers.authorization==='Bearer synthetic-test'?{userId:'synthetic-user'}:{}}));
const server=app.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert.ok(address&&typeof address==='object');const origin=`http://127.0.0.1:${address.port}`;
try{
 const post=(body:string,auth=true)=>fetch(origin+'/api/v1/research/data/review',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer synthetic-test'}:{})},body});
 assert.equal((await post('{',false)).status,401);
 const response=await post(JSON.stringify({series,target}));assert.equal(response.status,200);assert.deepEqual(await response.json(),r);
 assert.equal((await post('{"series":null,"series":null,"target":null}')).status,400);
 assert.equal((await post(' '.repeat(4*1024*1024+1))).status,413);
 const caps=await(await fetch(origin+'/api/v1/research/capability-audit')).json();assert.equal(caps.capabilities.length,33);
 process.env.EXTERNAL_DATA_ENABLED='false';assert.equal((await post('{')).status,503);process.env.EXTERNAL_DATA_ENABLED='true';
 // Real Python SDK -> actual HTTP server, no proxy or saved credentials.
 const py=await promisify(execFile)(process.env.PVLIB_PYTHON??'python3',['-c',`import sys,json\nsys.path.insert(0,'sdk')\nfrom solarpv_sdk import Client,SolarPVError\np=json.loads(sys.argv[2])\nc=Client(sys.argv[1],'synthetic-test',enabled=True)\nr=c.review_data(p['series'],p['target'])\nassert r['comparisonEnergyWh']==5000 and r['researchGate']['status']=='blocked'\ntry: Client(sys.argv[1],'synthetic-test').review_data(p['series'],p['target']);raise AssertionError('disabled')\nexcept SolarPVError as e: assert str(e)=='SDK_DISABLED'\nprint('PASS SDK HTTP review and disabled guard')`,origin,JSON.stringify({series,target})],{timeout:30000});console.log(py.stdout.trim());
 const runPy=await promisify(execFile)(process.env.PVLIB_PYTHON??'python3',['-c',`import sys,json,uuid\nsys.path.insert(0,'sdk')\nfrom solarpv_sdk import Client\np=json.load(open('docs/examples/research/diode-network-synthetic-request.json'))\nr=Client(sys.argv[1],'synthetic-test',enabled=True).run(p)\nuuid.UUID(r['jobId'])\nassert r['energyAdoption'] is False and r['envelope']['operation']=='diode_network'\nprint('PASS SDK actual numerical job + input-bound envelope + ephemeral job UUID')`,origin],{timeout:30000});console.log(runPy.stdout.trim());
 // Static boundary regression: these modules have no adoption/finance setter imports.
 for(const p of ['src/studies/externalSeries.ts','src/components/ExternalDataReview.tsx'])assert.ok(!/from ['"].*(?:operationalEnergy|financialEngine|operationalProjectTransfer)/.test(readFileSync(p,'utf8')));
 assert.equal(r.inputSha256,uqHash(series));
 let limited=false;for(let i=0;i<8;i++){if((await post(JSON.stringify({series,target}))).status===429){limited=true;break;}}assert.ok(limited);
 process.env.CAPABILITY_AUDIT_ENABLED='false';assert.equal((await fetch(origin+'/api/v1/research/capability-audit')).status,503);
 delete process.env.JWT_SECRET;delete process.env.INTERNAL_GATEWAY_SECRET;assert.equal((await post('{}')).status,503);

}finally{server.close();await once(server,'close');}
console.log('PASS F0/F1: exact 33-row manifest, planned declarations, immutable schema, independent power integral, leap/DST/grid/gap/context gates, auth-before-parse, duplicate/size rejection, real Python SDK HTTP, no adoption');
