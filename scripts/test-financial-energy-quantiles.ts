import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FinancialEnergyQuantiles } from '../src/components/FinancialEnergyQuantiles';
import { financialEnergyQuantileSections } from '../src/studies/financialEnergyQuantileView';
import { createReportPdf } from '../src/studies/reportPdf';
const energy = { p10: 70, p50: 100, p90: 130, nominal: 100, mean: 105, stdDev: 20, relativeSpreadPercent: 60, unit: 'MWh' };
const before = JSON.stringify(energy);
const { runFinancialUncertaintyPropagation } = await import('../src/engine/core/uncertaintyPropagation');
const { DEFAULT_FINANCIAL_PRICING } = await import('../src/engine/financialEngine');
const actual = runFinancialUncertaintyPropagation({ plantCapacityKwp: 1000, inverterCapacityKw: 1000, baseAnnualYieldKwh: 1800000, basePricing: DEFAULT_FINANCIAL_PRICING, sampleSize: 60, seed: 42 });
assert.equal(actual.annualGenerationMwh.unit, 'MWh/year');
const actualBefore = JSON.stringify(actual);
const actualRows = financialEnergyQuantileSections(actual.annualGenerationMwh, actual.traceId)[0].rows;
assert.deepEqual(actualRows.find(row => row[0] === 'Unit'), ['Unit', 'MWh/year']);
assert.deepEqual(actualRows.find(row => row[0] === 'Energy exceedance P90 (CDF q10)'), ['Energy exceedance P90 (CDF q10)', actual.annualGenerationMwh.p10]);
assert.equal(JSON.stringify(actual), actualBefore);
for (const lang of ['fa', 'en'] as const) {
  const html = renderToStaticMarkup(React.createElement(FinancialEnergyQuantiles, { energy, traceId: 'SYNTHETIC-uq-002', lang, initialExplicit: false }));
  assert.ok(html.includes('P10: 70 | P90: 130'));
  assert.ok(!html.includes('uq-explicit-result'));
  assert.ok(!html.includes('checked=""'));
}
assert.ok(renderToStaticMarkup(React.createElement(FinancialEnergyQuantiles,{energy,traceId:'default'})).includes('uq-explicit-result'));
const sections = financialEnergyQuantileSections(energy, 'SYNTHETIC-uq-002');
assert.deepEqual(sections[0].rows.find(row => row[0] === 'Energy exceedance P90 (CDF q10)'), ['Energy exceedance P90 (CDF q10)', 70]);
assert.throws(() => financialEnergyQuantileSections({ ...energy, p10: NaN }, 'trace'), /UQ_INVALID/);
assert.equal(JSON.stringify(energy), before);
const blob = await createReportPdf('Conditional financial energy quantiles', sections, await readFile('src/assets/fonts/DejaVuSans.ttf'));
const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
const pdf = await getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false, useSystemFonts: false }).promise;
let text = '';
for (let i = 1; i <= pdf.numPages; i++) {
  const content = await (await pdf.getPage(i)).getTextContent();
  text += content.items.map(item => 'str' in item ? item.str : '').join(' ') + '\n';
}
text = text.replace(/\s+/g, ' ');
for (const marker of ['Energy exceedance P90 (CDF q10)', '70', 'SYNTHETIC-uq-002', 'not_field_validated', 'uq-quantiles-v1', 'No research energy adoption']) assert.ok(text.includes(marker), `${marker}: ${text}`);
await pdf.destroy();
console.log('PASS UQ-002: legacy SSR fa/en, immutable shared view, invalid data, actual PDF text readback');
