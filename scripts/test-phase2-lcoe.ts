import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {assessSimpleLcoe,calculateDiscountedLcoe} from '../src/engine/core/simpleLcoe';
import {calculateLcoe} from '../src/engine/solarPvEngine';
import {generateScenarios,assessScenarioLcoe} from '../src/engine/scenarioEngine';
import {ScenarioComparisonTab} from '../src/components/ScenarioComparisonTab';
import {assertReferenceValue} from './verify-physics-reference-gate';

const fixture=JSON.parse(readFileSync('scripts/fixtures/physics/simple-lcoe-decimal.json','utf8'));
for(const c of fixture.cases) {
 const actual=assessSimpleLcoe(c.inputs[0]);
 assertReferenceValue(actual,c.expected,fixture.tolerances.absolute,fixture.tolerances.relative);
 assert.deepEqual(JSON.parse(JSON.stringify(actual)),actual);
 const x=c.inputs[0];
 if(x.degradationPct<=10)assert.ok(Math.abs(calculateLcoe(x.capex,x.opexAnnual,x.energyAnnual,x.discountRate,x.lifetimeYears,x.degradationPct)-c.expected.lcoeValue)<1e-10,'Deprecated numeric adapter retains ordinary supported arithmetic');
}
const base={capex:10000,opexAnnual:200,energyAnnual:5000,discountRate:.05,lifetimeYears:25,degradationPct:.5,energyBasis:'delivered' as const,currency:'USD' as const,rateBasis:'nominal' as const};
for(const patch of [
 {capex:-1},{capex:NaN},{capex:null},{opexAnnual:-1},{energyAnnual:0},{energyAnnual:-1},
 {discountRate:-1},{discountRate:Infinity},{lifetimeYears:0},{lifetimeYears:1.5},{lifetimeYears:101},
 {degradationPct:-.1},{degradationPct:100.01},{degradationPct:NaN},{currency:'guess'},{rateBasis:'guess'},
 {taxes:0},{currency:undefined},{rateBasis:undefined},
]) {
 const result=assessSimpleLcoe({...base,...patch});
 assert.equal(result.status,'unavailable');assert.equal(result.lcoeValue,null);
}
for(const patch of [{capex:1e308,opexAnnual:1e308},{energyAnnual:1e308,discountRate:-.99,lifetimeYears:100},{energyAnnual:5e-324,discountRate:1e308},{capex:0,opexAnnual:0,energyAnnual:1e308,discountRate:-.99,lifetimeYears:100}]) {
 const result=assessSimpleLcoe({...base,...patch});assert.equal(result.status,'unavailable');
 if(result.status==='unavailable')assert.equal(result.reason,'numerical_failure');
}
const free=assessSimpleLcoe({...base,capex:0,opexAnnual:0});assert.equal(free.status,'available');assert.equal(free.lcoeValue,0);
assert.equal(assessSimpleLcoe({...base,energyAnnual:0}).lcoeValue,null);
// The old zero sentinel remains solely for compatibility, never active assessment.
assert.equal(calculateLcoe(10000,200,0,.05,25),0);
assert.equal(calculateLcoe(10000,200,5000,.05,1e20),calculateLcoe(10000,200,5000,.05,100));
assert.equal(calculateLcoe(-1,-1,5000,.05,25),0);
assert.equal(calculateLcoe(10000,200,5000,.05,25,100),calculateLcoe(10000,200,5000,.05,25,10));
const composed=assessScenarioLcoe({initialCapexUsd:9000,replacementPresentValueUsd:1000,opexAnnual:200,energyAnnual:5000,discountRate:.05,lifetimeYears:25,degradationPct:.5});
assert.deepEqual(composed,assessSimpleLcoe({...base,energyBasis:'generation_proxy'}));
for(const peakSunHours of [0,5]) {
 const scenarios=generateScenarios(10,20,1.5,90000,18,peakSunHours);
 for(const scenario of scenarios) {
  assert.equal(scenario.lcoeUsdPerKwh,scenario.lcoeAssessment.lcoeValue,'No display rounding feeds returned LCOE');
  assert.equal(scenario.lcoeAssessment.status,peakSunHours===0?'unavailable':'available');
 }
}
const row=generateScenarios(10,20,1.5)[0];
for(const lang of ['en','fa'] as const) {
 const html=renderToStaticMarkup(React.createElement(ScenarioComparisonTab,{lang,scenarios:[{...row,lcoeUsdPerKwh:0,lcoeAssessment:free}]}));
 assert.match(html,/\$0\.0000\/kWh/,'A genuine zero cost is not labeled unavailable');
 const noEnergy=assessSimpleLcoe({...base,energyAnnual:0});
 const missingHtml=renderToStaticMarkup(React.createElement(ScenarioComparisonTab,{lang,scenarios:[{...row,lcoeUsdPerKwh:null,lcoeAssessment:noEnergy}]}));
 assert.doesNotMatch(missingHtml,/\$0\.0000\/kWh/);assert.match(missingHtml,/Unavailable|در دسترس نیست/);
}
// Real HTTP boundary; never import server with its default writable database.
mkdirSync('.cache',{recursive:true});const dir=mkdtempSync(resolve('.cache/lcoe-contract-'));
process.env.NODE_ENV='test';process.env.SOLARPV_DB_FILE=join(dir,'db.json');process.env.VITE_REAL_INTERNET='false';
const {app}=await import('../server');const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
const address=server.address();assert.ok(address&&typeof address==='object');
const post=(body:Record<string,unknown>)=>fetch(`http://127.0.0.1:${address.port}/api/v1/finance/lcoe`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
try {
 for(const body of [base,{...base,capex:0,opexAnnual:0},{...base,discountRate:-.05}]) {
  const response=await post(body);assert.equal(response.status,200);assert.deepEqual(await response.json(),assessSimpleLcoe(body));
 }
 const legacy={capex:10000,opexAnnual:200,energyAnnual:5000};
 const response=await post(legacy);assert.equal(response.status,200);const result=await response.json();
 assert.equal(result.currency,'unspecified');assert.equal(result.rateBasis,'unspecified');
 assert.ok(Math.abs(result.lcoeValue-calculateLcoe(10000,200,5000,.05,25))<1e-12);
 const deg=await(await post({...legacy,degradationPct:2})).json();assert.ok(deg.lcoeValue>result.lcoeValue,'HTTP degradation is no longer silently ignored');
 for(const body of [{},{...base,energyAnnual:0},{...base,capex:null},{...base,capex:'10000'},{...base,lifetimeYears:1.5},{...base,lifetimeYears:101},{...base,taxes:0},{...base,inflation:0},{...base,currency:'guess'},{...base,capex:1e308,opexAnnual:1e308}])assert.equal((await post(body)).status,400,JSON.stringify(body));
}finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));rmSync(dir,{recursive:true,force:true});}
assert.ok(Number.isFinite(calculateDiscountedLcoe(base).lcoeValue));
console.log(`PASS strict LCOE: ${fixture.cases.length} independent Decimal cost/energy/ratio cases, valid-zero vs unavailable/overflow, deprecated adapter, full-precision scenarios, bilingual render and real HTTP degradation/metadata/input boundary. Simple unlevered screening only.`);
