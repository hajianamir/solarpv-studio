import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFile } from 'node:fs/promises';
import { financialMetricQuantiles, financialMetricQuantileSections } from '../src/studies/financialMetricQuantiles';
import { FinancialMetricQuantiles } from '../src/components/FinancialMetricQuantiles';
import { createReportPdf } from '../src/studies/reportPdf';
import { runFinancialUncertaintyPropagation } from '../src/engine/core/uncertaintyPropagation';
import { DEFAULT_FINANCIAL_PRICING } from '../src/engine/financialEngine';
const base = {nominal: 20, mean: 20, stdDev: 5, relativeSpreadPercent: 50, p10: 30, p50: 20, p90: 10, unit: '$/MWh'};
const original = JSON.stringify(base);
const lcoe = financialMetricQuantiles('lcoe', base, 'SYNTHETIC-003');
assert.deepEqual(lcoe.cdf, {q10:10,q50:20,q90:30});
assert.equal(lcoe.adverseTail.value, 30);
const negative = {...base, p10:-100, p50:-20, p90:50,unit:'USD'};
const npv = financialMetricQuantiles('npv', negative, 'SYNTHETIC-003');
assert.deepEqual(npv.cdf, {q10:-100,q50:-20,q90:50});
assert.equal(npv.adverseTail.value, -100);
assert.equal(npv.financeMutation, false); assert.equal(npv.researchEnergyAdoption, false);
for (const bad of [NaN,Infinity,-Infinity]) assert.throws(() => financialMetricQuantiles('npv',{...negative,p50:bad},'trace'));
assert.throws(() => financialMetricQuantiles('npv',{...negative,unit:'$/MWh'},'trace'));
assert.throws(() => financialMetricQuantiles('lcoe',{...base,p90:-1},'trace'));
assert.throws(() => financialMetricQuantiles('lcoe',{...base,p90:40},'trace'));
assert.throws(() => financialMetricQuantiles('npv',negative,' '));
for (const metric of ['lcoe','npv'] as const) {
  const value=metric==='lcoe'?base:negative;
  for (const lang of ['fa','en'] as const) {
    const html=renderToStaticMarkup(React.createElement(FinancialMetricQuantiles,{metric,value,traceId:'test',lang,children:'LEGACY-UNCHANGED',initialExplicit:false}));
    assert.ok(html.includes('LEGACY-UNCHANGED')); assert.ok(!html.includes('checked=""'));
  }
  const blob=await createReportPdf('Metric fixture',financialMetricQuantileSections(metric,value,'SYNTHETIC-003'),await readFile('src/assets/fonts/DejaVuSans.ttf'));
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc=await getDocument({data:new Uint8Array(await blob.arrayBuffer()),isEvalSupported:false,useSystemFonts:false}).promise;
  let text=''; for(let i=1;i<=doc.numPages;i++){const c=await(await doc.getPage(i)).getTextContent();text+=c.items.map(x=>'str'in x?x.str:'').join(' ');}
  for(const marker of ['CDF q10','CDF q90','SYNTHETIC-003','not_field_validated',metric==='lcoe'?'higher_cost':'lower_npv']) assert.ok(text.includes(marker),marker);
  await doc.destroy();
}
const actual=runFinancialUncertaintyPropagation({plantCapacityKwp:1000,inverterCapacityKw:1000,baseAnnualYieldKwh:1800000,basePricing:DEFAULT_FINANCIAL_PRICING,sampleSize:60,seed:42});
const snapshot=JSON.stringify(actual);
assert.equal(financialMetricQuantiles('lcoe',actual.lcoeUsdPerMwh,actual.traceId).cdf.q90,actual.lcoeUsdPerMwh.p10);
assert.equal(financialMetricQuantiles('npv',actual.npvUsd,actual.traceId).cdf.q10,actual.npvUsd.p10);
assert.equal(JSON.stringify(actual),snapshot); assert.equal(JSON.stringify(base),original);
console.log('PASS UQ-003: known quantiles, signed NPV, reversed cost semantics, actual engine, immutable input, fail-closed validation, fa/en legacy and PDF text');
