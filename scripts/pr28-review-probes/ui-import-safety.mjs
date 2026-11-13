import { chromium } from 'playwright-core';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
if (process.platform === 'linux') process.env.AWS_EXECUTION_ENV ??= 'AWS_Lambda_nodejs20.x';
const sparticuz = (await import('@sparticuz/chromium')).default;
const out = process.env.PR28_PROBE_OUTPUT || '/tmp/solarpv-pr28-review-ui';
const initial = JSON.parse(await readFile(path.join(out, 'scenario.json'), 'utf8'));
initial.projectData.city.fieldProvenance = {};
const badWeight = structuredClone(initial);
badWeight.projectData.selectedModule.weightKg = -1;
badWeight.projectData.city.latitude = 44;
badWeight.projectData.customBaysCount = 8;
badWeight.projectData.loads = badWeight.projectData.loads.slice(0, 1);
badWeight.projectData.projectName = 'INVALID WEIGHT MUST NOT APPLY';
const badSite = structuredClone(initial);
badSite.projectData.city.latitude = 91;
badSite.projectData.projectName = 'INVALID SITE MUST NOT APPLY';
const badTracker = structuredClone(initial);
badTracker.projectData.trackerConfig = { gcr: -1, axisTiltDeg: 0, maxRotationDeg: 60, enableBacktracking: true };
badTracker.projectData.projectName = 'INVALID TRACKER MUST NOT APPLY';
const badLoad = structuredClone(initial);
badLoad.projectData.loads[0].dayHours = -1;
badLoad.projectData.customBaysCount = 0;
badLoad.projectData.projectName = 'INVALID LOAD MUST NOT APPLY';
const recovery = structuredClone(initial);
recovery.projectData.projectName = 'CANCELED RECOVERY MUST NOT APPLY';
recovery.projectData.city.fieldProvenance = { basicWindSpeedKmh: { sourceKind: 'provider_value', providerName: 'INVENTED_AUTHORITY', unit: 'km/h', value: 130 } };
const browser = await chromium.launch({ executablePath: await sparticuz.executablePath(), args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'], headless: true });
const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: true, viewport: { width: 1600, height: 1000 } });
await context.route('https://**/*', (route) => route.abort());
await context.route('**/api/v1/gateway/**', (route) => route.abort());
const page = await context.newPage();
let dialogMode = 'accept';
const dialogs = [];
page.on('dialog', async (dialog) => { dialogs.push(dialog.message()); if (dialogMode === 'accept') await dialog.accept(); else await dialog.dismiss(); });
const open = async () => { await page.keyboard.press('Control+e'); await page.locator('#report-modal-close-btn').waitFor(); };
const dump = async (name) => {
  const event = page.waitForEvent('download');
  await page.getByTitle('ذخیره محلی پروژه با نام دلخواه').click();
  const file = path.join(out, name);
  await (await event).saveAs(file);
  return JSON.parse(await readFile(file, 'utf8'));
};
const fields = (project) => ({
  name: project.projectData.projectName, latitude: project.projectData.city.latitude, longitude: project.projectData.city.longitude,
  bays: project.projectData.customBaysCount, loads: project.projectData.loads, module: project.projectData.selectedModule,
  overrides: project.projectData.siteOverrides,
});
try {
  await page.goto(process.env.PR28_PROBE_URL || 'http://127.0.0.1:5190/', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('workflow-tab-climate').first().waitFor();
  const newEquipment = await page.evaluate(async () => {
    const data = await import('/src/engine/equipmentCatalogData.ts');
    return { ...data.CATALOG_MODULES[0], id: 'custom-mod-canceled-recovery', modelName: 'Canceled recovery item' };
  });
  recovery.customEquipmentSnapshots.modules.push(newEquipment);
  for (const [name, value] of [['import-valid.json', initial], ['import-invalid-weight.json', badWeight], ['import-invalid-site.json', badSite], ['import-invalid-tracker.json', badTracker], ['import-invalid-load.json', badLoad], ['import-canceled.json', recovery]]) {
    await writeFile(path.join(out, name), JSON.stringify(value));
  }
  await open();
  await page.locator('#report-restore-file-input').setInputFiles(path.join(out, 'import-valid.json'));
  await page.locator('#report-modal-close-btn').waitFor({ state: 'detached', timeout: 15000 });
  await open();
  const before = await dump('import-before-safety-checks.json');
  const catalogBefore = await page.evaluate(() => localStorage.getItem('solarpv_custom_catalog_v4'));
  dialogs.length = 0;
  for (const [file, reason] of [['import-invalid-weight.json', /weightKg/], ['import-invalid-site.json', /latitude/], ['import-invalid-tracker.json', /trackerConfig/], ['import-invalid-load.json', /customBaysCount/]]) {
    await page.locator('#report-restore-file-input').setInputFiles(path.join(out, file));
    const blocked = page.getByText(/بارگذاری مسدود شد:|Import blocked:/);
    await blocked.waitFor({ timeout: 10000 });
    await page.waitForFunction((pattern) => [...document.querySelectorAll('body *')].some((element) =>
      element.childElementCount === 0 && /بارگذاری مسدود شد:|Import blocked:/.test(element.textContent ?? '') && new RegExp(pattern).test(element.textContent ?? ''),
    ), reason.source, { timeout: 10000 });
    const after = await dump(`after-${file}`);
    assert.deepEqual(fields(after), fields(before), `${file} changed unrelated project inputs`);
    assert.equal(await page.evaluate(() => localStorage.getItem('solarpv_custom_catalog_v4')), catalogBefore);
    assert.equal(dialogs.length, 0, `${file} must be blocked rather than applied via recovery`);
  }
  dialogMode = 'dismiss';
  await page.locator('#report-restore-file-input').setInputFiles(path.join(out, 'import-canceled.json'));
  await page.getByText(/بارگذاری لغو شد|Import canceled/).waitFor({ timeout: 10000 });
  const canceled = await dump('after-canceled-recovery.json');
  assert.equal(dialogs.length, 1);
  assert.deepEqual(fields(canceled), fields(before));
  assert.equal(await page.evaluate(() => localStorage.getItem('solarpv_custom_catalog_v4')), catalogBefore);
  console.log('[PASS] Negative module mass, invalid coordinates, invalid tracker and invalid load/bays are blocked without changing site, bays, loads, module or catalog.');
  console.log('[PASS] Dismissing untrusted-provenance recovery leaves project and pending catalog addition unchanged.');

  const precise = structuredClone(initial);
  precise.projectData.systemMode = 'ongrid';
  precise.projectData.loads = [{ ...precise.projectData.loads[0], id: 'precision-load', name: 'Fractional input', ratedWatts: 1000, quantity: 1, dayHours: 0.0049, nightHours: 0.012345, isDc: false }];
  await writeFile(path.join(out, 'precision-load-input.json'), JSON.stringify(precise));
  dialogMode = 'accept';
  await page.locator('#report-restore-file-input').setInputFiles(path.join(out, 'precision-load-input.json'));
  await page.locator('#report-modal-close-btn').waitFor({ state: 'detached', timeout: 15000 });
  await open();
  const preciseOutput = await dump('precision-load-output.json');
  assert.equal(preciseOutput.projectData.loads[0].dayHours, 0.0049);
  assert.equal(preciseOutput.projectData.loads[0].nightHours, 0.012345);
  const expectedKwh = 0.0049 + 0.012345;
  assert.ok(Math.abs(preciseOutput.projectData.reportSnapshot.simulation.totalConsumption24hKwh - expectedKwh) < 1e-14);
  console.log('[PASS] Fractional operating hours survive real import, site-window effect and report JSON; raw 24-hour consumption uses the unrounded inputs.');
} finally {
  await context.close();
  await browser.close();
}
