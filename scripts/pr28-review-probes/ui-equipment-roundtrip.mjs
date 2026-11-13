import { chromium } from 'playwright-core';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
if (process.platform === 'linux') process.env.AWS_EXECUTION_ENV ??= 'AWS_Lambda_nodejs20.x';
const sparticuz = (await import('@sparticuz/chromium')).default;
const out = process.env.PR28_PROBE_OUTPUT || '/tmp/solarpv-pr28-review-ui';
await mkdir(out, { recursive: true });
const baseUrl = process.env.PR28_PROBE_URL || 'http://127.0.0.1:5190/';
const browser = await chromium.launch({ executablePath: await sparticuz.executablePath(), args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'], headless: true });
const errors = [];
async function newPage() {
  const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: true, viewport: { width: 1600, height: 1000 } });
  await context.route('https://**/*', (route) => route.abort());
  await context.route('**/api/v1/gateway/**', (route) => route.abort());
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('workflow-tab-climate').first().waitFor();
  return { context, page };
}
const tab = async (page, name) => page.getByTestId(`workflow-tab-${name}`).locator(':visible').first().click();
const report = async (page) => { await page.keyboard.press('Control+e'); await page.locator('#report-modal-close-btn').waitFor(); };
async function download(page, selector, name) {
  const pending = page.waitForEvent('download');
  await selector.click();
  const file = path.join(out, name);
  await (await pending).saveAs(file);
  return file;
}
async function saveJson(page, name) {
  const file = await download(page, page.getByTitle('ذخیره محلی پروژه با نام دلخواه'), name);
  return JSON.parse(await readFile(file, 'utf8'));
}
async function importJson(page, file) {
  await report(page);
  await page.locator('#report-restore-file-input').setInputFiles(file);
  await page.locator('#report-modal-close-btn').waitFor({ state: 'detached', timeout: 15000 });
}
let first;
let second;
try {
  first = await newPage();
  const { page } = first;
  const fixtures = await page.evaluate(async () => {
    const data = await import('/src/engine/equipmentCatalogData.ts');
    const m = data.CATALOG_MODULES.find((item) => item.id === 'mod-jinko-585');
    const i = data.CATALOG_INVERTERS.find((item) => item.id === 'inv-huawei-330ktl');
    const module = { ...m, id: 'custom-mod-same-name-review', lengthMm: 2500, widthMm: 1300, weightKg: 44 };
    const inverter = { ...i, id: 'custom-inv-same-name-review', pnomKw: 300 };
    const moduleResult = await data.saveCustomModule(module);
    const inverterResult = await data.saveCustomInverter(inverter);
    return { module, inverter, moduleResult, inverterResult };
  });
  assert.equal(fixtures.moduleResult.success, true, JSON.stringify(fixtures.moduleResult));
  assert.equal(fixtures.inverterResult.success, true, JSON.stringify(fixtures.inverterResult));
  await tab(page, 'array');
  const modulePicker = page.locator('#pv-module-picker-select');
  const inverterPicker = page.locator('#pv-inverter-picker-select');
  const moduleLabels = await modulePicker.locator('option').allTextContents();
  assert.equal(moduleLabels.filter((label) => label.includes(fixtures.module.modelName)).length, 2);
  await modulePicker.selectOption('mod-jinko-585');
  await modulePicker.selectOption(fixtures.module.id);
  await inverterPicker.selectOption('inv-huawei-330ktl');
  await inverterPicker.selectOption(fixtures.inverter.id);
  await report(page);
  const exported = await saveJson(page, 'equipment-custom.json');
  assert.equal(exported.projectData.selectedModule.id, fixtures.module.id);
  assert.equal(exported.projectData.selectedModule.origin, 'custom');
  assert.equal(exported.projectData.selectedModule.weightKg, 44);
  assert.equal(exported.projectData.selectedModule.lengthM, 2.5);
  assert.equal(exported.projectData.selectedInverter.id, fixtures.inverter.id);
  assert.equal(exported.projectData.selectedInverter.pnomAcKw, 300);
  const catalogModule = exported.customEquipmentSnapshots.modules.find((item) => item.id === fixtures.module.id);
  const catalogInverter = exported.customEquipmentSnapshots.inverters.find((item) => item.id === fixtures.inverter.id);
  assert.equal(catalogModule.lengthMm, 2500);
  assert.equal(catalogModule.cellType, fixtures.module.cellType);
  assert.equal(catalogInverter.technology, fixtures.inverter.technology);
  assert.equal(catalogInverter.maxPvInputKw, fixtures.inverter.maxPvInputKw);
  await page.locator('#report-modal-close-btn').click();

  // Independent fresh browser profile: this import must recreate complete
  // catalog records, not just the selected projection held by the project.
  second = await newPage();
  const p = second.page;
  await importJson(p, path.join(out, 'equipment-custom.json'));
  await tab(p, 'array');
  assert.equal(await p.locator('#pv-module-picker-select').inputValue(), fixtures.module.id);
  assert.equal(await p.locator('#pv-inverter-picker-select').inputValue(), fixtures.inverter.id);
  await report(p);
  const restored = await saveJson(p, 'equipment-restored.json');
  assert.deepEqual(restored.projectData.selectedModule, exported.projectData.selectedModule);
  assert.deepEqual(restored.projectData.selectedInverter, exported.projectData.selectedInverter);
  assert.equal(restored.customEquipmentSnapshots.modules.find((item) => item.id === fixtures.module.id).lengthMm, 2500);
  const altered = structuredClone(restored);
  altered.projectData.city.fieldProvenance = {};
  altered.projectData.selectedModule.weightKg = 45;
  altered.projectData.selectedModule.tempCoeffIscPct = 0.0487;
  altered.projectData.selectedModule.tempCoeffVmpPct = -0.3521;
  altered.projectData.selectedInverter.pnomAcKw = 299;
  await writeFile(path.join(out, 'equipment-same-id-altered.json'), JSON.stringify(altered));
  await p.locator('#report-modal-close-btn').click();
  await importJson(p, path.join(out, 'equipment-same-id-altered.json'));
  await tab(p, 'array');
  assert.equal(await p.locator('#pv-module-picker-select').inputValue(), '__selected_module_snapshot__');
  assert.match(await p.locator('#pv-module-picker-select option:checked').innerText(), /45kg/);
  assert.equal(await p.locator('#pv-inverter-picker-select').inputValue(), '__selected_inverter_snapshot__');
  assert.match(await p.locator('#pv-inverter-picker-select option:checked').innerText(), /299kW/);
  await report(p);
  const alteredSaved = await saveJson(p, 'equipment-same-id-altered-saved.json');
  assert.equal(alteredSaved.projectData.selectedModule.tempCoeffIscPct, 0.0487);
  assert.equal(alteredSaved.projectData.selectedModule.tempCoeffVmpPct, -0.3521);
  assert.equal(alteredSaved.projectData.selectedModule.weightKg, 45);
  assert.equal(alteredSaved.customEquipmentSnapshots.modules.find((item) => item.id === fixtures.module.id).weightKg, 44);
  assert.equal(alteredSaved.customEquipmentSnapshots.inverters.find((item) => item.id === fixtures.inverter.id).pnomKw, 300);
  await p.locator('#report-modal-close-btn').click();

  const incomplete = structuredClone(alteredSaved);
  delete incomplete.projectData.selectedModule.id;
  delete incomplete.projectData.selectedModule.origin;
  delete incomplete.projectData.selectedModule.lengthM;
  delete incomplete.projectData.selectedModule.widthM;
  delete incomplete.projectData.selectedModule.weightKg;
  incomplete.projectData.city.fieldProvenance = {};
  await writeFile(path.join(out, 'equipment-legacy-incomplete.json'), JSON.stringify(incomplete));
  await importJson(p, path.join(out, 'equipment-legacy-incomplete.json'));
  await tab(p, 'array');
  assert.equal(await p.locator('#pv-module-picker-select').inputValue(), '__selected_module_snapshot__');
  assert.match(await p.locator('body').innerText(), /ارزیابی‌نشده — ابعاد موجود نیست/);
  assert.match(await p.locator('body').innerText(), /compatibility geometry is diagnostic only/);
  await tab(p, 'structural');
  await p.locator('#struct-display-safety-compliance').waitFor();
  assert.match((await p.getByRole('alert').allTextContents()).join(' '), /ارزیابی‌نشده/);
  await report(p);
  const missing = await saveJson(p, 'equipment-legacy-incomplete-saved.json');
  assert.equal(missing.projectData.selectedModule.id, undefined);
  assert.equal(missing.projectData.selectedModule.origin, 'legacy');
  assert.equal(missing.projectData.selectedModule.lengthM, undefined);
  assert.equal(missing.projectData.selectedModule.weightKg, undefined);
  const excelFile = await download(p, p.getByRole('button', { name: 'Excel (.xlsx)' }), 'equipment-legacy-incomplete.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelFile);
  const structuralRows = [];
  workbook.getWorksheet('Structural & Foundations').eachRow((row) => structuralRows.push(row.values.slice(1)));
  assert.ok(structuralRows.some((row) => row[0] === 'Structural Assessment' && row[1] === 'UNASSESSED'));
  await p.locator('#report-modal-close-btn').click();

  await tab(p, 'array');
  await p.locator('#pv-module-picker-select').selectOption('mod-jinko-580');
  await report(p);
  const mono = await saveJson(p, 'equipment-monofacial.json');
  assert.equal(mono.projectData.selectedModule.bifacialityFactor, undefined);
  await p.locator('#report-modal-close-btn').click();
  await importJson(p, path.join(out, 'equipment-monofacial.json'));
  await report(p);
  const monoAgain = await saveJson(p, 'equipment-monofacial-restored.json');
  assert.equal(monoAgain.projectData.selectedModule.bifacialityFactor, undefined);
  await p.locator('#report-modal-close-btn').click();
  await tab(p, 'array');
  await p.locator('#pv-module-picker-select').selectOption('mod-longi-660');
  await report(p);
  const noct = await saveJson(p, 'equipment-noct.json');
  assert.equal(noct.projectData.selectedModule.noctC, 44);
  assert.deepEqual(errors, []);
  console.log('[PASS] Same-name builtin/custom module and inverter selected by ID; full custom catalog records and selected projections round-trip into a clean browser profile.');
  console.log('[PASS] Altered same-ID physical/electrical snapshots display as distinct snapshots; optional temperature coefficients survive without overwriting full catalog records.');
  console.log('[PASS] Missing legacy module dimensions/mass stay unknown and structurally unassessed without a crash; diagnostic geometry is disclosed.');
  console.log('[PASS] Monofacial factor absence survives export/import; catalog NOCT 44 °C is retained.');
} finally {
  await first?.context.close();
  await second?.context.close();
  await browser.close();
}
