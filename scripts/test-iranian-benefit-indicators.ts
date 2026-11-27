import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {evaluateIranianBenefitIndicators} from '../src/engine/core/iranianBenefitIndicators';
import {type IranianBenefitIndicatorsInput} from '../src/contracts/iranianBenefitIndicators';
import {runIranianRegulationFinancialModel} from '../src/engine/iranianRegulationsFinancial';
import {IranianRegulationsTab} from '../src/components/IranianRegulationsTab';
import {extractFormulaUnits,executeReferenceFixture,assertReferenceValue,type PhysicsReferenceRecord} from './verify-physics-reference-gate';
const fixture=JSON.parse(readFileSync('scripts/fixtures/physics/iranian-benefit-indicators-decimal.json','utf8'));
for(const c of fixture.cases) {
 const before=JSON.stringify(c.inputs[0]);const result=evaluateIranianBenefitIndicators(c.inputs[0]);
 assertReferenceValue(result,c.expected,fixture.tolerances.absolute,fixture.tolerances.relative);
 assert.equal(JSON.stringify(c.inputs[0]),before);
 assert.deepEqual(JSON.parse(JSON.stringify(result)),result,'Full precision and metadata survive JSON, not a rounded display ledger');
}
const input: IranianBenefitIndicatorsInput={modelPolicy:'iranian_benefit_indicators_full_precision_v1',capacityKwp:.5,annualGenerationMwh:11.8,penaltyRateTomanPerKwh:4200,outageLossMillionTomanPerKwp:8.5};
const precise=evaluateIranianBenefitIndicators(input);
const legacy=runIranianRegulationFinancialModel(.5,11.8,'article_16');
assert.equal(legacy.article16PenaltyAvoidedMillionToman,50);
assert.equal(legacy.summerBlackoutLossPreventedMillionToman,4);
assert.equal(precise.article16PenaltyAvoidanceProxyMillionToman,49.56);
assert.equal(precise.outageLossProxyMillionToman,4.25);
assert.equal((legacy.article16PenaltyAvoidedMillionToman/1000).toFixed(1),'0.1');
assert.equal((precise.article16PenaltyAvoidanceProxyMillionToman/1000).toFixed(1),'0.0','Independent witness exposes double rounding, not just extra stored decimals');
for(const key of ['capacityKwp','annualGenerationMwh','penaltyRateTomanPerKwh','outageLossMillionTomanPerKwp'] as const) {
 for(const value of [NaN,Infinity,-Infinity,-1,'4200',null])assert.throws(()=>evaluateIranianBenefitIndicators({...input,[key]:value} as IranianBenefitIndicatorsInput));
 const zero=evaluateIranianBenefitIndicators({...input,[key]:0});assert.equal(zero.financialAdoptionEligible,false);
 const missing={...input} as Partial<IranianBenefitIndicatorsInput>;delete missing[key];assert.throws(()=>evaluateIranianBenefitIndicators(missing as IranianBenefitIndicatorsInput));
}
assert.throws(()=>evaluateIranianBenefitIndicators({...input,modelPolicy:'silent-legacy'} as unknown as IranianBenefitIndicatorsInput));
assert.throws(()=>evaluateIranianBenefitIndicators({...input,outageLossMillionTomanPerKwp:1e308,capacityKwp:1e308}),/nonfinite/);
assert.throws(()=>evaluateIranianBenefitIndicators({...input,annualGenerationMwh:1e308,penaltyRateTomanPerKwh:1e308}),/nonfinite/);
for(const lang of ['fa','en'] as const) {
 const html=renderToStaticMarkup(React.createElement(IranianRegulationsTab,{capacityKwp:.5,annualGenerationMwh:11.8,lang}));
 assert.match(html,/data-testid="iranian-penalty-proxy"[^>]*data-raw-million-toman="49.56"[^>]*>49\.56 /);
 assert.match(html,/data-testid="iranian-outage-proxy"[^>]*data-raw-million-toman="4.25"/);
 assert.match(html,lang==='en'?/Not added to revenue/:/به درآمد اضافه نمی‌شود/);
 const blocked=renderToStaticMarkup(React.createElement(IranianRegulationsTab,{capacityKwp:.5,annualGenerationMwh:11.8,lang,operationalEnergyBlocked:true}));
 assert.doesNotMatch(blocked,/iranian-penalty-proxy/);
}
const file='src/engine/core/iranianBenefitIndicators.ts';
const units=extractFormulaUnits(file,readFileSync(file,'utf8'));
const records=JSON.parse(readFileSync('scripts/physics-reference-evidence.json','utf8')).fixtures.filter((r:PhysicsReferenceRecord)=>r.formulaId.startsWith(file+'#')) as PhysicsReferenceRecord[];
assert.ok(units.length>0);assert.deepEqual(records.map(r=>r.formulaId).sort(),units.map(r=>r.formulaId).sort(),'Every current expression, including new untracked source, must be covered');
for(const record of records)await executeReferenceFixture(record);
console.log(`PASS ${fixture.cases.length} independent Decimal benefit indicators; ${units.length} exact AST reach/sensitivity witnesses; legacy preserved, double-rounding repaired in bilingual UI, invalid/zero/overflow/serialization/adoption boundaries`);
