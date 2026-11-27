import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runIranianRegulationFinancialModel} from '../src/engine/iranianRegulationsFinancial';
import {assertReferenceValue} from './verify-physics-reference-gate';
const f=JSON.parse(readFileSync('scripts/fixtures/physics/iranian-precision-decimal.json','utf8'));
let fractional=0;
for(const c of f.cases){
 const result=runIranianRegulationFinancialModel(...c.inputs as Parameters<typeof runIranianRegulationFinancialModel>);
 assertReferenceValue(result,c.expected,f.tolerances.absolute,f.tolerances.relative);
 if(!Number.isInteger(result.cashFlow25Years[0].revenueMillionToman))fractional++;
 const series=[-result.equityContributionMillionToman,...result.cashFlow25Years.map(r=>r.netCashFlowMillionToman)];
 const recomputed=series.reduce((sum,v,t)=>sum+v/1.2**t,0);
 assert.ok(Math.abs(recomputed-result.npvMillionToman)<1e-7);
 const displayed=result.cashFlow25Years.map(r=>r.netCashFlowMillionToman.toFixed(0));
 assert.equal(displayed.length,25);assert.ok(Math.abs(result.cashFlow25Years[0].netCashFlowMillionToman-c.expected.cashFlow25Years[0].netCashFlowMillionToman)<1e-7);
}
assert.ok(fractional>0,'Fixtures must expose pre-ledger rounding loss');
const tiny=runIranianRegulationFinancialModel(.5,.9,'satba_fit_ppa',4200,70,0,6,25);
assert.equal(tiny.totalCapexMillionToman,15.75);assert.equal(tiny.bankLoanMillionToman,11.025);
assert.equal(runIranianRegulationFinancialModel(1,0,'satba_fit_ppa').lcoeTomanPerKwh,null);
console.log(`PASS finance precision: ${f.cases.length} independent 50-digit Decimal ledgers at .5/1/5/10/50/1000kWp, zero/debt/interest cases; unrounded NPV and row accounting; legacy illustrative assumptions remain unvalidated.`);
