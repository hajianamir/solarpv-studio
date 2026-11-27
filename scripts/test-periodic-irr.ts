import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {assessPeriodicIrr,evaluatePeriodicNpv} from '../src/engine/core/periodicIrr';
import {type PeriodicIrrInput} from '../src/contracts/periodicIrr';
import {IranianRegulationsTab} from '../src/components/IranianRegulationsTab';
import {runIranianRegulationFinancialModel} from '../src/engine/iranianRegulationsFinancial';
import {assertReferenceValue,extractFormulaUnits,executeReferenceFixture,type PhysicsReferenceRecord} from './verify-physics-reference-gate';
const fixture=JSON.parse(readFileSync('scripts/fixtures/physics/periodic-irr-decimal.json','utf8'));
for(const c of fixture.cases) {
 const before=JSON.stringify(c.inputs[0]);const actual=assessPeriodicIrr(c.inputs[0]);
 assertReferenceValue(actual,c.expected,fixture.tolerances.absolute,fixture.tolerances.relative);
 assert.equal(JSON.stringify(c.inputs[0]),before);assert.deepEqual(JSON.parse(JSON.stringify(actual)),actual);
 if(c.ledgerInputs) {
  const ledger=runIranianRegulationFinancialModel(...c.ledgerInputs as Parameters<typeof runIranianRegulationFinancialModel>);
  const cashFlows=c.inputs[0].cashFlowBasis==='project'?[-ledger.totalCapexMillionToman,...ledger.cashFlow25Years.map(row=>row.revenueMillionToman-row.opexMillionToman)]:[-ledger.equityContributionMillionToman,...ledger.cashFlow25Years.map(row=>row.netCashFlowMillionToman)];
  const integrated=assessPeriodicIrr({...c.inputs[0],cashFlows});
  assert.equal(integrated.status,c.expected.status);
  if(integrated.status==='available')assertReferenceValue(integrated.irrPct,c.expected.irrPct,fixture.tolerances.absolute,fixture.tolerances.relative);
 }

}
for(const c of fixture.npvCases)assertReferenceValue(evaluatePeriodicNpv(c.inputs[0],c.inputs[1]),c.expected,1e-10,1e-12);
const base:PeriodicIrrInput={modelPolicy:'conventional_periodic_irr_bounded_v1',cashFlows:[-100,110],period:'annual',currency:'TOMAN',cashFlowBasis:'equity',rateBasis:'nominal'};
function reason(flows:number[],expected:string) {
 const result=assessPeriodicIrr({...base,cashFlows:flows});assert.equal(result.status,'unavailable');
 if(result.status==='unavailable')assert.equal(result.reason,expected);
 assert.equal(result.irrPct,null);assert.equal(result.rate,null);assert.equal(result.financialAdoptionEligible,false);
}
for(const flows of [[0,0],[0,100],[-100,-1],[100,100]])reason(flows,'no_sign_change');
for(const flows of [[-100,230,-132],[100,-110],[0,-100,110]])reason(flows,'unsupported_cash_flow_pattern');
for(const flows of [[-100,1],[-1,100]])reason(flows,'outside_policy_domain');
reason([-1e308,Number.MIN_VALUE],'numerical_failure');
for(const cashFlows of [[],[-1],new Array(102).fill(1),[-1,NaN],[-1,Infinity]])reason(cashFlows,'invalid_input');
for(const patch of [{modelPolicy:'legacy'},{period:'monthly'},{currency:'mixed'},{rateBasis:'unknown'},{cashFlowBasis:'guess'},{extra:1},{cashFlows:null}]) {
 const result=assessPeriodicIrr({...base,...patch} as unknown as PeriodicIrrInput);assert.equal(result.status,'unavailable');if(result.status==='unavailable')assert.equal(result.reason,'invalid_input');
}
const zero=assessPeriodicIrr({...base,cashFlows:[-100,100]});assert.equal(zero.status,'available');if(zero.status==='available')assert.ok(Math.abs(zero.irrPct)<1e-10);
// Leading zero investment is unsupported; zero intermediate/final periods are fine.
assert.equal(assessPeriodicIrr({...base,cashFlows:[-100,0,121,0]}).status,'available');
for(const lang of ['en','fa'] as const) {
 const html=renderToStaticMarkup(React.createElement(IranianRegulationsTab,{capacityKwp:.5,annualGenerationMwh:.9,lang}));
 assert.match(html,/data-testid="iranian-equity-irr"[^>]*data-status="available"/);
 assert.match(html,/conventional_periodic_irr_bounded_v1/);
 assert.match(html,lang==='en'?/Nonconventional flows/:/جریان غیرمتعارف/);
 assert.match(html,lang==='en'?/cash-flow ledger retains full precision/:/جریان نقدی دقت کامل/);
 assert.doesNotMatch(html,/projection extrapolates the unrounded 24-hour|model rounds amounts to millions/);
 const outside=renderToStaticMarkup(React.createElement(IranianRegulationsTab,{capacityKwp:.5,annualGenerationMwh:11.8,lang}));
 assert.match(outside,/data-testid="iranian-equity-irr"[^>]*data-status="unavailable"[^>]*data-reason="outside_policy_domain"/);
 const zeroHtml=renderToStaticMarkup(React.createElement(IranianRegulationsTab,{capacityKwp:0,annualGenerationMwh:0,lang}));
 assert.match(zeroHtml,/data-testid="iranian-equity-irr"[^>]*data-status="unavailable"[^>]*data-reason="no_sign_change"/);
 const blocked=renderToStaticMarkup(React.createElement(IranianRegulationsTab,{capacityKwp:.5,annualGenerationMwh:11.8,lang,operationalEnergyBlocked:true}));assert.doesNotMatch(blocked,/iranian-equity-irr/);
}
const legacy=runIranianRegulationFinancialModel(.5,11.8,'article_16');
const actual=assessPeriodicIrr({...base,currency:'MILLION_TOMAN',cashFlows:[-legacy.totalCapexMillionToman,...legacy.cashFlow25Years.map(c=>c.revenueMillionToman-c.opexMillionToman)]});
assert.equal(actual.status,'available');if(actual.status==='available')assert.equal(Math.round(actual.irrPct*10)/10,legacy.projectIrrPct,'Legacy still rounds; new consumer does not feed displayed IRR back into ledger');
const file='src/engine/core/periodicIrr.ts';const units=extractFormulaUnits(file,readFileSync(file,'utf8'));
const records=JSON.parse(readFileSync('scripts/physics-reference-evidence.json','utf8')).fixtures.filter((r:PhysicsReferenceRecord)=>r.formulaId.startsWith(file+'#')) as PhysicsReferenceRecord[];
assert.ok(units.length>0);assert.deepEqual(units.map(u=>u.formulaId).sort(),records.map(r=>r.formulaId).sort());for(const record of records)await executeReferenceFixture(record);
console.log(`PASS ${fixture.cases.length} Decimal root/status cases, ${fixture.npvCases.length} NPV cases, ${units.length} reached/sensitive expressions; explicit root statuses, scaling/zero/legacy/bilingual/adoption boundaries`);
