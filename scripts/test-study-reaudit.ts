import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {validateResult,validateSnapshot} from '../src/studies/studyWorkflow';
const request=JSON.parse(readFileSync('services/pvlib_study/tests/synthetic-study.json','utf8'));
const raw=spawnSync(process.env.PVLIB_PYTHON??'python',['-I','-B','services/pvlib_study/worker.py'],{input:JSON.stringify(request),encoding:'utf8'});
assert.equal(raw.status,0,raw.stderr);const result=validateResult(JSON.parse(raw.stdout));
for(const key of ['dcBeforeAdditionalLossWh','dcWh','acWh'] as const){
  for(const where of ['summary','monthly'] as const){const bad=structuredClone(result);if(where==='summary')bad.summary[key]+=12345;else bad.monthly[0][key]+=12345;assert.throws(()=>validateResult(bad),/energy integration/);assert.throws(()=>validateSnapshot({version:1,id:'reaudit',savedAt:'2026-11-03T00:00:00Z',request,result:bad}),/energy integration/);}
}
const duplicated=structuredClone(result);duplicated.monthly.push(duplicated.monthly[0]);assert.throws(()=>validateResult(duplicated),/energy integration/);
for(const patch of [{startUtc:'2000-01-01T00:00:00Z'},{endUtc:'2000-01-01T00:00:00Z'},{completeUtcCalendarYear:true},{monthlyAllocation:'local end month'}]){const bad=structuredClone(result);Object.assign(bad.manifest.period,patch);assert.throws(()=>validateResult(bad),/period metadata/);}
console.log('Re-audit regressions PASS: legacy baseline period/monthly DC/AC corruption, duplicate months and false annual/UTC metadata rejected at result and archive boundaries.');
