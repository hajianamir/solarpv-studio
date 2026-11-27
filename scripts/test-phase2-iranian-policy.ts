import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {IranianEconomicPolicySchema,IranianScreenSettingsSchema,createDefaultIranianScreenSettings} from '../src/contracts/iranianEconomicPolicy';
import {runIranianRegulationFinancialModel} from '../src/engine/iranianRegulationsFinancial';
import {IranianRegulationsTab} from '../src/components/IranianRegulationsTab';
import {createDefaultProjectV3,migrateProjectToV3} from '../src/engine/core/projectMigration';
import {assertReferenceValue} from './verify-physics-reference-gate';
const fixture=JSON.parse(readFileSync('scripts/fixtures/physics/iranian-policy-decimal.json','utf8'));
for(const c of fixture.cases) {
 const before=structuredClone(c.inputs);
 const result=runIranianRegulationFinancialModel(...c.inputs as Parameters<typeof runIranianRegulationFinancialModel>);
 assertReferenceValue(result,c.expected,fixture.tolerances.absolute,fixture.tolerances.relative);
 assert.deepEqual(c.inputs,before);
 assert.equal(result.npvMillionToman,result.equityNpvMillionToman,'Deprecated alias remains equity, never silently reinterpreted');
 assert.equal(result.financialAdoptionEligible,false);
 const discount=result.economicPolicy.discountRatePct/100;
 const project=[-result.totalCapexMillionToman,...result.cashFlow25Years.map(r=>r.revenueMillionToman-r.opexMillionToman)];
 const equity=[-result.equityContributionMillionToman,...result.cashFlow25Years.map(r=>r.netCashFlowMillionToman)];
 const npv=(series:number[])=>series.reduce((sum,v,t)=>sum+v/(1+discount)**t,0);
 assert.ok(Math.abs(npv(project)-result.projectNpvMillionToman)<1e-6);
 assert.ok(Math.abs(npv(equity)-result.equityNpvMillionToman)<1e-6);
 if(c.inputs[5]===0)assert.ok(Math.abs(result.cashFlow25Years.reduce((sum,r)=>sum+r.debtServiceMillionToman,0)-result.bankLoanMillionToman)<1e-7,'Zero-interest matrix repays the principal through the final payment');
}
const settings=createDefaultIranianScreenSettings();
const tiny=fixture.cases.find((c:{inputs:unknown[]})=>c.inputs[0]===10&&c.inputs[5]===1e-12);
assert.ok(tiny);
const oldR=1e-12/100,oldPower=(1+oldR)**6;
const oldPayment=220.5*(oldR*oldPower)/(oldPower-1);
assert.ok(Math.abs(oldPayment-tiny.expected.cashFlow25Years[0].debtServiceMillionToman)>.01,'Independent tiny-rate reference must distinguish original cancellation defect');
const calc=(share:number,interest:number,policy=settings.economicPolicy)=>runIranianRegulationFinancialModel(10,18,'satba_fit_ppa',4200,share,interest,6,25,policy);
assert.equal(calc(0,0).projectNpvMillionToman,calc(70,23).projectNpvMillionToman,'Debt cannot alter pre-debt project NPV');
assert.equal(calc(0,0).projectNpvMillionToman,calc(0,0).equityNpvMillionToman);
assert.notEqual(calc(70,23).projectNpvMillionToman,calc(70,23).equityNpvMillionToman,'Original UI label defect has a numerical witness');
assert.equal(calc(70,23,{...settings.economicPolicy,discountRatePct:0}).economicPolicy.discountRatePct,0,'No invented discount >= loan interest law');
for(const invalid of [{currency:'USD'},{rateBasis:'real'},{modelPolicy:'guess'},{discountRatePct:-100},{discountRatePct:1001},{discountRatePct:NaN},{tariffEscalationPct:Infinity},{opexEscalationPct:'15'},{taxPct:20}]) {
 assert.equal(IranianEconomicPolicySchema.safeParse({...settings.economicPolicy,...invalid}).success,false);
 assert.throws(()=>calc(70,0,{...settings.economicPolicy,...invalid} as typeof settings.economicPolicy));
}
for(const invalid of [{loanInterestPct:-1},{loanTermYears:2.5},{customTariffToman:null},{framework:'guess'},{loanInterestPct:'0'},{economicPolicy:null}])assert.equal(IranianScreenSettingsSchema.safeParse({...settings,...invalid}).success,false);
assert.throws(()=>runIranianRegulationFinancialModel(NaN,1,'satba_fit_ppa'));
assert.throws(()=>runIranianRegulationFinancialModel(1,-1,'satba_fit_ppa'));
assert.throws(()=>runIranianRegulationFinancialModel(1e308,1e308,'satba_fit_ppa'));
assert.throws(()=>calc(70,0,{...settings.economicPolicy,discountRatePct:-99.99999999999999}),'Numerical overflow cannot become a displayed success');
const project=createDefaultProjectV3();
const {iranianScreenSettings:_priorSettings,...old}=project;void _priorSettings;
const migrated=migrateProjectToV3(old);assert.equal(migrated.success,true);assert.deepEqual(migrated.project.iranianScreenSettings,settings,'Missing legacy settings use disclosed prior UI defaults');
const custom={...settings,loanInterestPct:0,loanSharePct:0,economicPolicy:{...settings.economicPolicy,discountRatePct:5,tariffEscalationPct:0,opexEscalationPct:3}};
const restored=migrateProjectToV3(JSON.parse(JSON.stringify({...project,iranianScreenSettings:custom})));
assert.equal(restored.success,true);assert.deepEqual(restored.project.iranianScreenSettings,custom);
for(const bad of [null,{...custom,economicPolicy:{...custom.economicPolicy,rateBasis:'real'}},{...custom,loanTermYears:0}]) {
 const blocked=migrateProjectToV3({...project,iranianScreenSettings:bad});
 assert.equal(blocked.success,false);assert.equal(blocked.migrationStatus,'BLOCKED_INCONSISTENT');
 assert.ok(blocked.blockerReasons.some(r=>r.includes('iranianScreenSettings')));
}
for(const lang of ['en','fa'] as const) {
 const html=renderToStaticMarkup(React.createElement(IranianRegulationsTab,{capacityKwp:10,annualGenerationMwh:18,lang,settings:custom}));
 assert.match(html,/iranian-equity-npv/);assert.match(html,/iranian-project-npv/);
 assert.match(html,/iranian_screen_economics_v1/);assert.match(html,/TOMAN/);assert.match(html,/financialAdoptionEligible: false/);
 assert.match(html,/id="iran-reg-interest-rate"[^>]*value="0"/);
 assert.match(html,/id="iran-policy-discountRatePct"[^>]*value="5"/);
 const unavailable=renderToStaticMarkup(React.createElement(IranianRegulationsTab,{capacityKwp:NaN,annualGenerationMwh:18,lang}));assert.match(unavailable,/iranian-model-unavailable/);
 const blocked=renderToStaticMarkup(React.createElement(IranianRegulationsTab,{capacityKwp:10,annualGenerationMwh:18,lang,operationalEnergyBlocked:true}));assert.match(blocked,/iranian-operational-blocked/);assert.doesNotMatch(blocked,/iranian-project-npv/);
}
console.log(`PASS Iranian policy: ${fixture.cases.length} independent Decimal ledgers, project/equity separation and debt invariance, zero/negative/positive discount, strict basis/inputs/overflow, legacy/current project roundtrip and bilingual rendering. Screening only, financial adoption false.`);
