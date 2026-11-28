import {historicalSource} from './historical-source';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {generateScenarios} from '../src/engine/scenarioEngine';
import {ScenarioComparisonTab} from '../src/components/ScenarioComparisonTab';
const fixture=JSON.parse(readFileSync('scripts/fixtures/physics/audit-priority-scenarios-decimal.json','utf8'));
for(const c of fixture.cases){
 const result=generateScenarios(...c.inputs as Parameters<typeof generateScenarios>).find(s=>s.id===c.id)!;
 for(const key of ['firstYearGenerationProxyKwh','lcoeUsdPerKwh'] as const){const expected=c.expected[key];assert.ok(typeof result[key]==='number'&&Math.abs(result[key]!-expected)<=1e-10+1e-12*Math.abs(expected),`${c.id} ${key}`);}
 assert.equal(result.reliabilityIndexPct,null);assert.equal(result.cableVoltageDropPct,null);
 assert.equal(result.reliabilityAssessment,'not_assessed');assert.equal(result.electricalSafetyAssessment,'not_assessed');
 assert.equal(JSON.parse(JSON.stringify(result)).reliabilityIndexPct,null);
}
const low=generateScenarios(100,10,1,90000,18,.5),one=generateScenarios(100,10,1,90000,18,1);
assert.equal(low[0].firstYearGenerationProxyKwh,14235);assert.ok(Math.abs(low[0].lcoeUsdPerKwh!-.662649265)<1e-8);
for(let i=0;i<3;i++){assert.equal(low[i].firstYearGenerationProxyKwh*2,one[i].firstYearGenerationProxyKwh);assert.equal(low[i].lcoeUsdPerKwh,2*one[i].lcoeUsdPerKwh!);}
for(const psh of [0,-1])for(const result of generateScenarios(100,10,1,90000,18,psh)){assert.equal(result.firstYearGenerationProxyKwh,0);assert.equal(result.lcoeUsdPerKwh,null);}
for(const bad of [NaN,Infinity])assert.deepEqual(generateScenarios(100,10,1,90000,18,bad),generateScenarios(100,10,1,90000,18,5.17),'Unrelated legacy invalid-resource fallback is not silently changed');
const ranking=generateScenarios(1,.1,1,90000,18,5);assert.equal(ranking[0].tco25yUsd,2486);assert.equal(ranking[1].tco25yUsd,2108);
const conditional=generateScenarios(1,100,1,90000,18,.5)[2];assert.equal(conditional.reliabilityIndexPct,null,'Energy-poor witness cannot receive99.9% service claim');
for(const lang of ['en','fa'] as const){
 const html=renderToStaticMarkup(React.createElement(ScenarioComparisonTab,{scenarios:ranking,lang,peakSunHours:.5}));
 assert.match(html,/scenario-assessment-limits/);assert.match(html,/Not assessed|ارزیابی‌نشده/);
 assert.doesNotMatch(html,/99\.9%|N\+1|hot-standby|fire safety compliance|Lowest 25-year|Continuous.*availability|پایداری دائمی|۱۰۰٪/);
 assert.match(html,/without a 1\.0 floor|بدون کف ۱/);
 const historical=ranking.map(s=>({...s,reliabilityIndexPct:99.9})) as unknown as ReturnType<typeof generateScenarios>;
 const legacyHtml=renderToStaticMarkup(React.createElement(ScenarioComparisonTab,{scenarios:historical,lang}));assert.doesNotMatch(legacyHtml,/99\.9%/,'Old-shaped objects cannot revive fabricated uptime');
}
const basePath=resolve(`src/engine/.physics-reference-audit-scenario-${process.pid}.ts`);
writeFileSync(basePath,historicalSource('935b01acfb119ebbd0cc9f62fbb0e8a7278cf83b:src/engine/scenarioEngine.ts'));
let compatibility=0;
try{
 const prior=await import(pathToFileURL(basePath).href) as typeof import('../src/engine/scenarioEngine');
 for(const psh of [0,1,5,8])for(const capacity of [1,100]){
  const before=prior.generateScenarios(capacity,10,1,90000,18,psh),after=generateScenarios(capacity,10,1,90000,18,psh);
  for(let i=0;i<before.length;i++){
   for(const [key,value] of Object.entries(before[i]))if(typeof value==='number'&&!['reliabilityIndexPct','cableVoltageDropPct'].includes(key))assert.equal((after[i] as unknown as Record<string,unknown>)[key],value,`Unchanged numerical ${key}`);
   assert.deepEqual(after[i].lcoeAssessment,before[i].lcoeAssessment);compatibility++;
  }
 }
}finally{unlinkSync(basePath);}
console.log(`PASS ${compatibility} actual-base ordinary-resource/zero numerical scenario compatibility cases.`);
console.log(`PASS audit priority: ${fixture.cases.length} independent Decimal scenario vectors; F05/F06/F13/F14 counterexamples, null/JSON/bilingual bounds. No reliability/market/field validation.`);
