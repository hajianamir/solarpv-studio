import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {StudyRequestSchema,type StudyRequest} from '../src/studies/studyContract';
import {convertDeclaredWeather,weatherSha256} from '../src/studies/declaredWeatherAdapter';
import {validateResult,validateSnapshot,studyReport} from '../src/studies/studyWorkflow';
import {makeStudyBundle,validateStudyBundle,cloneStudyInputs} from '../src/studies/studyExchange';
import {sourceLedger} from '../src/studies/studyInsights';
import {exploreStudy} from '../src/studies/studyExplorer';
const base=StudyRequestSchema.parse(JSON.parse(readFileSync('services/pvlib_study/tests/synthetic-study.json','utf8')));
function execute(req:StudyRequest){const p=spawnSync(process.env.PVLIB_PYTHON??'python',['-I','-B','services/pvlib_study/worker.py'],{input:JSON.stringify(req),encoding:'utf8',maxBuffer:16*1024*1024});assert.equal(p.status,0,p.stderr);return validateResult(JSON.parse(p.stdout));}
const m={schemaVersion:'declared-interval-weather-v1',source:'SYNTHETIC explicit input; not operational',quality:'assumed',sourceVersion:'synthetic-v1',reference:'Test fixture only',site:base.site,intervalMinutes:base.weather.intervalMinutes,timestampConvention:'interval_end',variableSemantics:'interval_mean',windHeightM:10,units:{ghi:'kW/m2',dni:'W/m2',dhi:'kW/m2',tempAir:'K',windSpeed:'km/h'}};
const sourceCsv=['timestamp,ghi,dni,dhi,tempAir,windSpeed',...base.weather.records.map(r=>[r.timestamp,r.ghiWm2/1000,r.dniWm2,r.dhiWm2/1000,r.tempAirC+273.15,r.windSpeedMs*3.6].join(','))].join('\n');
const converted=convertDeclaredWeather(JSON.stringify(m),sourceCsv,base.site);assert.equal(converted.receipt.rawCsvSha256,createHash('sha256').update(sourceCsv).digest('hex'));assert.equal(weatherSha256('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
for(let bits=0;bits<32;bits++){
 const manifest=structuredClone(m);manifest.units={ghi:bits&1?'kW/m2':'W/m2',dni:bits&2?'kW/m2':'W/m2',dhi:bits&4?'kW/m2':'W/m2',tempAir:bits&8?'K':'degC',windSpeed:bits&16?'km/h':'m/s'};
 const csv=['timestamp,ghi,dni,dhi,tempAir,windSpeed',...base.weather.records.map(r=>[r.timestamp,r.ghiWm2/(bits&1?1000:1),r.dniWm2/(bits&2?1000:1),r.dhiWm2/(bits&4?1000:1),r.tempAirC+(bits&8?273.15:0),r.windSpeedMs*(bits&16?3.6:1)].join(','))].join('\n');
 const out=convertDeclaredWeather(JSON.stringify(manifest),csv,base.site);for(const [i,row] of out.weather.records.entries())for(const k of ['ghiWm2','dniWm2','dhiWm2','tempAirC','windSpeedMs'] as const)assert.ok(Math.abs(row[k]-base.weather.records[i][k])<1e-10);
}
for(const bad of [sourceCsv.replace(',ghi,',',GHI,'),sourceCsv.replace('T', ' '),sourceCsv+'\n\n',sourceCsv.replace(/\n([^,\n]+),[^,\n]+,/, '\n$1,,'),sourceCsv.replaceAll('Z','')])assert.throws(()=>convertDeclaredWeather(JSON.stringify(m),bad,base.site));
for(const patch of [{windHeightM:2},{variableSemantics:'instantaneous'},{timestampConvention:'interval_start'},{sourceVersion:''},{site:{...m.site,altitudeM:m.site.altitudeM+1}},{units:{...m.units,ghi:'Wh/m2'}}])assert.throws(()=>convertDeclaredWeather(JSON.stringify({...m,...patch}),sourceCsv,base.site));
const req=StudyRequestSchema.parse({...base,weather:converted.weather,system:{...base.system,acCable:{source:'SYNTHETIC cable',quality:'assumed',topology:'balanced_three_phase_lv',resistancePerPhaseOhm:.4,receivingLineVoltageV:400,maxCurrentA:100}}});
const out=execute(req);assert.ok(out.summary.acCableLossWh!>0);assert.equal(out.request.weather.importTrace!.rawCsv,sourceCsv);assert.ok(studyReport(out).includes('declared-weather-receipt-v1'));assert.ok(sourceLedger(req,out).entries.some(e=>e.component==='weatherImport'));assert.equal(exploreStudy(out).balances.plant.status,'within_arithmetic_tolerance');
for(const key of ['acCableLossW','acCableInputW','acCableOutputW','acCableCurrentA']){const bad=structuredClone(out);bad.samples[0][key]=Number(bad.samples[0][key])+1;assert.throws(()=>validateResult(bad));}
for(const mutate of [(r:StudyRequest)=>{r.weather.importTrace!.rawCsv+=' ';},(r:StudyRequest)=>{r.weather.records[0].tempAirC+=1;},(r:StudyRequest)=>{r.weather.importTrace!.canonicalWeatherSha256='0'.repeat(64);},(r:StudyRequest)=>{r.site.altitudeM+=1;}]){
 const bad=structuredClone(req);mutate(bad);assert.equal(StudyRequestSchema.safeParse(bad).success,false);const p=spawnSync(process.env.PVLIB_PYTHON??'python',['-I','-B','services/pvlib_study/worker.py'],{input:JSON.stringify(bad),encoding:'utf8'});assert.notEqual(p.status,0);
}
const rewritten=structuredClone(req);const tr=rewritten.weather.importTrace!;const wrong=JSON.parse(tr.rawManifest);wrong.units.ghi='W/m2';tr.rawManifest=JSON.stringify(wrong);tr.manifestSha256=weatherSha256(tr.rawManifest);rewritten.weather.source=`declared-import csv:${tr.rawCsvSha256}; manifest:${tr.manifestSha256}`;const {importTrace:ignored,...canonical}=rewritten.weather;tr.canonicalWeatherJson=JSON.stringify(canonical);tr.canonicalWeatherSha256=weatherSha256(tr.canonicalWeatherJson);assert.equal(StudyRequestSchema.safeParse(rewritten).success,false);assert.notEqual(spawnSync(process.env.PVLIB_PYTHON??'python',['-I','-B','services/pvlib_study/worker.py'],{input:JSON.stringify(rewritten),encoding:'utf8'}).status,0);
const snap=validateSnapshot({version:1,id:'00000000-0000-4000-8000-000000003040',savedAt:'2026-11-03T00:00:00Z',request:req,result:out});assert.deepEqual((await validateStudyBundle(JSON.parse(JSON.stringify(await makeStudyBundle([snap]))))).snapshots[0],snap);assert.deepEqual(cloneStudyInputs(snap,'Converted clone','00000000-0000-4000-8000-000000003041',snap.savedAt).request.weather,req.weather);
// Reproduced bug: all-night independent inverter signed input used to be rejected in TS.
const blocks=structuredClone(base);blocks.system.inverterBlocks=JSON.parse(readFileSync('docs/examples/inverter-blocks.synthetic.json','utf8'));blocks.system.additionalDcLossPct=0;blocks.system.arrayPdc0W=17600;blocks.system.inverterPdc0W=blocks.system.inverterBlocks!.reduce((n,b)=>n+b.system.inverterPdc0W,0);blocks.weather.records.forEach(w=>Object.assign(w,{ghiWm2:0,dniWm2:0,dhiWm2:0}));
for(const cable of [undefined,req.system.acCable]){blocks.system.acCable=cable;const night=execute(StudyRequestSchema.parse(blocks));assert.equal(night.summary.acWh,0);assert.ok(night.summary.gridImportWh!>0);assert.equal(night.summary.netGridWh,-night.summary.gridImportWh!);}
const baseline=execute(base);
for(const key of ['gridImportWh','netGridWh','acCableLossWh','inverterSelfConsumptionWh']){const bad=structuredClone(baseline);(bad.summary as unknown as Record<string,number>)[key]=12345;assert.throws(()=>validateResult(bad),/inactive/);}
console.log('Review 30–40 PASS: 32 explicit unit combinations, receipt SHA independent oracle, strict manifest/site/semantics/domain and TS/Python corruption rejection, actual Python AC cable, archive/bundle/clone/report/ledger and night-block regression. Synthetic only.');
