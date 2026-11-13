import { chromium } from 'playwright-core';
import ExcelJS from 'exceljs';
import { unzipSync } from 'fflate';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
if (process.platform === 'linux') process.env.AWS_EXECUTION_ENV ??= 'AWS_Lambda_nodejs20.x';
const sparticuz = (await import('@sparticuz/chromium')).default;
const out = process.env.PR28_PROBE_OUTPUT || '/tmp/solarpv-pr28-review-ui';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: await sparticuz.executablePath(), args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'], headless: true });
const ctx = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: true, viewport: { width: 1600, height: 1100 } });
await ctx.route('https://**/*', (r) => r.abort());
await ctx.route('**/api/v1/gateway/**', (r) => r.abort());
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('dialog', (d) => d.accept());
const download = async (button, name) => {
  const pending = p.waitForEvent('download');
  await button.click();
  const file = path.join(out, name);
  await (await pending).saveAs(file);
  return file;
};
try {
  await p.goto(process.env.PR28_PROBE_URL || 'http://127.0.0.1:5190/', { waitUntil: 'domcontentloaded' });
  await p.getByTestId('workflow-tab-climate').first().waitFor();
  const input = JSON.parse(await readFile(path.join(out, 'seed.json'), 'utf8'));
  input.projectData.systemMode = 'ongrid';
  input.projectData.city.peakSunHours = 4.73;
  input.projectData.city.fieldProvenance = {};
  await writeFile(path.join(out, 'f04-ui-hourly-input.json'), JSON.stringify(input));
  await p.keyboard.press('Control+e');
  await p.locator('#report-modal-close-btn').waitFor();
  await p.locator('#report-restore-file-input').setInputFiles(path.join(out, 'f04-ui-hourly-input.json'));
  await p.locator('#report-modal-close-btn').waitFor({ state: 'detached', timeout: 15000 });
  await p.keyboard.press('Control+e');
  await p.locator('#report-modal-close-btn').waitFor();
  await p.getByRole('button', { name: 'سفارشی‌سازی' }).click();
  const jsonPath = await download(p.getByTitle('ذخیره محلی پروژه با نام دلخواه'), 'f04-ui-hourly-export.json');
  const envelope = JSON.parse(await readFile(jsonPath, 'utf8'));
  const sim = envelope.projectData.reportSnapshot.simulation;
  assert.equal(sim.hourlySteps.length, 24);
  const reportDisclosure = await p.getByTestId('f04-report-rounding-disclosure').innerText();
  const reportText = await p.locator('#report-modal-close-btn').evaluate((button) => button.closest('[role="dialog"]')?.innerText ?? document.body.innerText);
  const excelPath = await download(p.getByRole('button', { name: 'Excel (.xlsx)' }), 'f04-report.xlsx');
  const wordPath = await download(p.getByRole('button', { name: 'Word (.docx)' }), 'f04-report.docx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  const findRow = (sheetName, label) => {
    let result;
    workbook.getWorksheet(sheetName).eachRow((row) => {
      if (row.getCell(1).value === label) result = { value: row.getCell(2).value, numFmt: row.getCell(2).numFmt, unit: row.getCell(3).value, note: row.getCell(4).value };
    });
    assert.ok(result, `missing ${sheetName}: ${label}`);
    return result;
  };
  const xlsx = {
    summary: findRow('Project Summary', 'Diurnal Diagnostic Generation (MWh, 24h)'),
    diagnostic: findRow('Energy Yield & PR', 'Diurnal Diagnostic Net AC Generation'),
    gross: findRow('Energy Yield & PR', 'Gross DC Annual Generation (24h Extrapolated)'),
    primary: findRow('Energy Yield & PR', 'Net AC Annual Generation (Primary)'),
    disclosure: findRow('Energy Yield & PR', 'F-04 24-hour rounding disclosure'),
  };
  const word = new TextDecoder().decode(unzipSync(await readFile(wordPath))['word/document.xml']);
  assert.ok(word.includes('مقادیر انرژی ۲۴ ساعته'), 'DOCX missing the F-04 disclosure');
  assert.ok(!word.includes('Diurnal Diagnostic Net AC Generation'), 'unexpected annualized diagnostic row in DOCX');
  assert.ok(!reportText.includes('Diurnal Diagnostic Net AC Generation'), 'unexpected annualized diagnostic row in preview');
  assert.ok(envelope.projectData.reportSnapshot.waterfallReport, 'sample needs the real waterfall primary report');
  await p.locator('#report-modal-close-btn').click();
  await p.getByTestId('workflow-tab-sim24h').locator(':visible').first().click();
  await p.getByTestId('energy-rounding-disclosure').waitFor();
  const disclosure = await p.getByTestId('energy-rounding-disclosure').innerText();
  const kpis = [];
  for (const label of ['تولید ۲۴ ساعته خورشیدی', 'مصرف کل بار ۲۴ ساعته', 'مازاد انرژی تزریق/اتلاف', 'کسری انرژی (Deficit)']) kpis.push(await p.getByText(label, { exact: true }).locator('..').innerText());
  const groups = p.locator('svg g.cursor-pointer');
  assert.equal(await groups.count(), 24);
  const hours = [];
  for (let i = 0; i < 24; i++) {
    await groups.nth(i).locator('text').hover({ force: true });
    const box = p.locator('div.mt-3.p-3.bg-industrial-surface\\/90');
    await box.waitFor({ timeout: 3000 });
    const spans = await box.locator('span').allInnerTexts();
    assert.equal(spans.length, 8, `hour ${i} details`);
    assert.match(spans[0], new RegExp(`\\b${i}:00`));
    hours.push(spans);
  }
  await p.getByTestId('workflow-tab-iran_regulations').locator(':visible').first().click();
  await p.getByTestId('f04-regulatory-annualization-disclosure').waitFor();
  const regulatoryDisclosure = await p.getByTestId('f04-regulatory-annualization-disclosure').innerText();
  const annualRows = [];
  for (let year = 1; year <= 25; year++) annualRows.push(await p.getByTestId(`f04-regulatory-generation-year-${year}`).innerText());
  const regulatoryModel = await p.evaluate(async ({ total, capacity }) => {
    const source = await import('/src/engine/iranianRegulationsFinancial.ts');
    return source.runIranianRegulationFinancialModel(capacity, total * 365 / 1000, 'article_16', 4500, 70, 23, 5);
  }, { total: sim.totalGeneration24hKwh, capacity: envelope.projectData.reportSnapshot.arrayDesign.totalPvCapacityKwp });
  await writeFile(path.join(out, 'f04-ui-hourly-capture.json'), JSON.stringify({
    sim, disclosure, kpis, hours, errors, reportDisclosure, xlsx, annualRows, regulatoryDisclosure, regulatoryModel,
    waterfallPrimaryMwh: envelope.projectData.reportSnapshot.waterfallReport.netAnnualEnergyExportMwh,
    docxDisclosurePresent: word.includes('مقادیر انرژی ۲۴ ساعته'),
    docxDiurnalRowPresent: word.includes('Diurnal Diagnostic Net AC Generation'),
    reportDiurnalRowPresent: reportText.includes('Diurnal Diagnostic Net AC Generation'),
  }, null, 2));
  assert.deepEqual(errors, []);
  console.log('[PASS] Captured 24 × 6 actual hourly UI values, four daily KPIs, raw JSON simulation and report disclosures.');
  console.log('[PASS] Read back actual XLSX raw numeric cells, formats and units; actual DOCX contains disclosure, while this waterfall preview/DOCX has no diurnal diagnostic row.');
  console.log('[PASS] Captured all 25 real regulatory annual-generation rows and the regulatory finance model for an external oracle.');
} finally {
  await ctx.close();
  await browser.close();
}
