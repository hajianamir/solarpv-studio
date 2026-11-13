import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { unzipSync } from 'fflate';
import { chromium as playwrightChromium } from 'playwright-core';

// Linux CI uses the bundled Amazon Linux Chromium runtime; other platforms use
// the Playwright-managed browser installed by their CI runner.
let linuxChromium: { executablePath: () => Promise<string> } | undefined;
if (process.platform === 'linux') {
  process.env.AWS_EXECUTION_ENV ??= 'AWS_Lambda_nodejs20.x';
  linuxChromium = (await import('@sparticuz/chromium')).default;
}

const port = 5187;
const baseUrl = `http://127.0.0.1:${port}`;
const previewEnv = { ...process.env, VITE_REAL_INTERNET: 'false', REAL_INTERNET: 'false' };
let vite: ChildProcess | undefined;
let viteLog = '';
let browser: Awaited<ReturnType<typeof playwrightChromium.launch>> | undefined;

function buildProductionBundle(): void {
  const build = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
    cwd: process.cwd(),
    env: previewEnv,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (build.status !== 0) {
    throw new Error(`Production build failed before browser regression run:\\n${build.stdout}\\n${build.stderr}`);
  }
  console.log('[INFO] Built production assets for production service-worker browser checks.');
  vite = spawn(process.execPath, [
    'node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort',
  ], {
    cwd: process.cwd(),
    env: previewEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  vite.stdout?.on('data', (data) => { viteLog += String(data); });
  vite.stderr?.on('data', (data) => { viteLog += String(data); });
}
let artifactDir: string | undefined;
let originalServiceWorkerSource: string | undefined;


// Independent decimal/rational oracle for report values: parse the shortest
// round-tripping decimal, scale to cents, and round nearest with ties away.
function reportDecimalOracle(value: number): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(value.toString());
  assert.ok(match && Number.isFinite(value), `invalid finite report value: ${value}`);
  const [, sign, whole, fraction = '', exponentText = '0'] = match!;
  const scale = fraction.length - Number(exponentText);
  let numerator = BigInt(`${whole}${fraction}`) * 100n;
  let denominator = 1n;
  if (scale > 0) denominator = 10n ** BigInt(scale);
  else if (scale < 0) numerator *= 10n ** BigInt(-scale);
  let cents = numerator / denominator;
  if ((numerator % denominator) * 2n >= denominator) cents++;
  const result = `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
  return sign && cents ? `-${result}` : result;
}

async function waitForVite() {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (!vite || vite.exitCode !== null) throw new Error(`Vite preview exited early or was not started:\n${viteLog}`);
    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch {
      // Wait for dev server startup.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for Vite:\n${viteLog}`);
}

async function main() {
  buildProductionBundle();
  originalServiceWorkerSource = await readFile(path.join(process.cwd(), 'dist/sw.js'), 'utf8');
  await waitForVite();
  console.log('[INFO] Production preview is responding.');
  // Keep only container essentials here. sparticuz's Lambda-default flags (notably
  // --single-process and --no-zygote) can launch Chromium but cause Playwright's
  // first page target to close in this CI/runtime environment.
  browser = await playwrightChromium.launch({
    ...(linuxChromium ? {
      executablePath: await linuxChromium.executablePath(),
      // sparticuz Lambda flags are intentionally avoided; only container essentials are needed.
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    } : {}),
    headless: true,
    timeout: 20000,
  });
  console.log('[INFO] Headless Chromium launched.');
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  const page = await Promise.race([
    context.newPage(),
    new Promise<never>((_resolve, reject) => setTimeout(
      () => reject(new Error('Chromium did not create a page within 10 seconds')),
      10000,
    )),
  ]);
  console.log('[INFO] Browser context and page created.');
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(`[browser console] ${message.text()}`);
  });
  page.on('pageerror', (error) => console.error('[browser page error]', error));
  let gatewayRequests = 0;
  await page.route('**/api/v1/gateway/**', async (route) => {
    gatewayRequests++;
    await route.abort('internetdisconnected');
  });
  await page.route('https://**/*', (route) => route.abort('internetdisconnected'));
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  console.log('[INFO] Production app loaded in Chromium.');
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    if (!('serviceWorker' in navigator)) return reject(new Error('Service workers are unavailable in this browser context'));
    const timeout = window.setTimeout(() => reject(new Error('Timed out waiting for service worker registration')), 20000);
    navigator.serviceWorker.ready.then(() => {
      window.clearTimeout(timeout);
      resolve();
    }, (error) => {
      window.clearTimeout(timeout);
      reject(error);
    });
  }));
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), undefined, { timeout: 15000 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByTestId('workflow-tab-climate').waitFor({ timeout: 15000 });
  await page.waitForFunction(async () => {
    const cacheName = (await caches.keys()).find((name) => name.startsWith('solarpv-studio-'));
    if (!cacheName) return false;
    const requests = await (await caches.open(cacheName)).keys();
    return requests.some((request) => new URL(request.url).pathname.startsWith('/assets/'));
  }, undefined, { timeout: 15000 });
  const cachedAssetPaths = await page.evaluate(async () => {
    const cacheName = (await caches.keys()).find((name) => name.startsWith('solarpv-studio-'));
    if (!cacheName) return [];
    return (await (await caches.open(cacheName)).keys()).map((request) => new URL(request.url).pathname);
  });
  assert.ok(cachedAssetPaths.some((asset) => /StructuralFoundationTab-[^/]+[.]js$/.test(asset)), 'install precache omitted the previously unvisited structural lazy chunk');
  assert.equal(await page.evaluate(() => performance.getEntriesByType('resource').some((entry) => entry.name.includes('StructuralFoundationTab'))), false,
    'structural lazy chunk was already loaded before the offline route check');
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.getByTestId('workflow-tab-climate').waitFor({ timeout: 15000 });
  assert.equal(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)), true);
  await page.getByTestId('workflow-tab-structural').locator(':visible').first().click({ timeout: 15000 });
  await page.waitForFunction(() => performance.getEntriesByType('resource').some((entry) => entry.name.includes('StructuralFoundationTab')), undefined, { timeout: 20000 });
  assert.equal(await page.evaluate(() => navigator.onLine), false);
  await context.setOffline(false);
  console.log('[PASS] Fresh install precaches the unvisited lazy route; real service worker loads it after warm-shell offline reload while the browser context remains offline');

  const originalCacheMatch = /const CACHE_NAME = '([^']+)'/.exec(originalServiceWorkerSource ?? '');
  assert.ok(originalCacheMatch, 'built service worker has no content-versioned cache name');
  const originalCacheName = originalCacheMatch[1];
  assert.match(originalCacheName, /^solarpv-studio-[a-f0-9]{16}$/);
  const updateCacheName = `${originalCacheName}-update-probe`;
  const updateServiceWorkerSource = (originalServiceWorkerSource ?? '').replace(originalCacheName, updateCacheName);
  assert.notEqual(updateServiceWorkerSource, originalServiceWorkerSource);
  await writeFile(path.join(process.cwd(), 'dist/sw.js'), updateServiceWorkerSource, 'utf8');
  await page.evaluate(async () => { await (await navigator.serviceWorker.ready).update(); });
  await page.waitForFunction(async (cacheNames) => {
    const names = await caches.keys();
    const registration = await navigator.serviceWorker.getRegistration();
    return names.includes(cacheNames.updated) && names.includes(cacheNames.previous) && registration?.waiting?.state === 'installed';
  }, { previous: originalCacheName, updated: updateCacheName }, { timeout: 20000 });
  assert.equal(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)), true);
  console.log('[PASS] Service-worker update waits while an old client remains open and retains its old cache');

  // Revert the served worker. No skipWaiting, client takeover, or reload is
  // commanded; full distinct-build update/rollback is a separate regression.
  await writeFile(path.join(process.cwd(), 'dist/sw.js'), originalServiceWorkerSource ?? '', 'utf8');
  await page.evaluate(async () => { await (await navigator.serviceWorker.ready).update(); });
  assert.ok((await page.evaluate(() => caches.keys())).includes(originalCacheName));
  artifactDir = await mkdtemp(path.join(os.tmpdir(), 'solarpv-ui-artifacts-'));

  const clickTab = async (tab: string) => {
    await page.getByTestId(`workflow-tab-${tab}`).locator(':visible').first().click({ timeout: 15000 });
  };

  // F1 is contextual, accessible, localized, and does not steal editor/dialog keys.
  await page.keyboard.press('F1');
  const helpDialog = page.getByTestId('context-help-dialog');
  await helpDialog.waitFor({ timeout: 5000 });
  await helpDialog.getByRole('heading', { name: /Structural & foundation|سازه و فونداسیون/ }).waitFor();
  await helpDialog.getByRole('heading', { name: /Important inputs|ورودی‌های مهم/ }).waitFor();
  await helpDialog.getByRole('heading', { name: /Implemented calculation method|روش محاسبهٔ پیاده‌سازی‌شده/ }).waitFor();
  assert.match(await helpDialog.locator('#context-help-method').innerText(), /foundation|فونداسیون/);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute('aria-label')), 'بستن راهنما', 'Tab escaped the contextual help dialog instead of cycling within it');
  await page.keyboard.press('Escape');
  await helpDialog.waitFor({ state: 'detached' });
  await page.getByTitle('زبان / Language').click();
  await page.keyboard.press('F1');
  await helpDialog.getByRole('heading', { name: 'Structural & foundation' }).waitFor();
  assert.match(await helpDialog.locator('#context-help-inputs').innerText(), /soil|geotechnical/i);
  assert.match(await helpDialog.locator('#context-help-method').innerText(), /foundation recommendations/i);
  assert.match(await helpDialog.locator('#context-help-limitations').innerText(), /not stamped construction design/i);
  await page.keyboard.press('Escape');
  await page.getByTitle('Language / زبان').click();
  await page.evaluate(() => {
    (window as Window & { __f1Prevented?: boolean }).__f1Prevented = false;
    window.addEventListener('keydown', (event) => {
      if (event.key === 'F1') (window as Window & { __f1Prevented?: boolean }).__f1Prevented = event.defaultPrevented;
    });
  });
  await page.locator('header input').first().focus();
  await page.keyboard.press('F1');
  assert.equal(await page.evaluate(() => (window as Window & { __f1Prevented?: boolean }).__f1Prevented), true, 'F1 did not suppress browser default in a focused editor');
  assert.equal(await helpDialog.count(), 0, 'F1 opened contextual help while an editor had focus');
  await page.getByTestId('context-help-button').click();
  await helpDialog.waitFor();
  await page.keyboard.press('Escape');
  await page.getByTestId('context-help-button').click();
  await page.keyboard.press('F1');
  assert.equal(await helpDialog.count(), 1, 'F1 nested a new help dialog while a dialog was already open');
  await page.keyboard.press('Escape');
  console.log('[PASS] F1 opens localized page help, prevents browser help, and respects focused editors/open dialogs');

  // Changing a stored plant target must not leak into either customer-mode AC
  // reference or DC/AC denominator; switching back restores the plant target.
  await clickTab('system_mode');
  const plantTargetInput = page.locator('#target-plant-capacity-input');
  await plantTargetInput.fill('2000');
  await clickTab('array');
  assert.match(await page.getByTestId('array-ac-reference').innerText(), /2000[.]0/);
  assert.ok(await page.getByTestId('workflow-tab-harmonics_grid').locator(':visible').count() > 0,
    'Powerplant navigation does not expose the upstream-grid/harmonics tab');
  await page.getByRole('button', { name: 'On-Grid' }).click();
  await clickTab('array');
  const ongridAcReference = await page.getByTestId('array-ac-reference').innerText();
  assert.ok(!ongridAcReference.includes('2000.0'), `on-grid AC reference leaked the powerplant target: ${ongridAcReference}`);
  const ongridDisplayedRatio = /DC\/AC = ([0-9.]+)/.exec(await page.getByTestId('array-dc-ac-ratio').innerText())?.[1];
  assert.equal(ongridDisplayedRatio, await page.getByTestId('array-designed-dc-ac-ratio').innerText(), 'on-grid DC/AC denominator differs from the actual designed inverter capacity');

  // Harmonics is deliberately available for utility plants and grid-tied
  // customers, but is absent and unmounted for off-grid projects.
  await clickTab('harmonics_grid');
  await page.getByText(/Harmonics Analysis|تحلیل هارمونیک/).waitFor({ timeout: 10000 });
  await page.keyboard.press('F1');
  await helpDialog.waitFor();
  assert.match(await helpDialog.locator('#context-help-inputs').innerText(), /short-circuit|اتصال کوتاه/i);
  assert.match(await helpDialog.locator('#context-help-method').innerText(), /typical inverter spectrum|طیف ثابتِ نمونهٔ اینورتر/i);
  assert.match(await helpDialog.locator('#context-help-limitations').innerText(), /screening estimates|غربالگری بدانید/i);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'On-Grid' }).click();
  await page.getByTestId('workflow-tab-harmonics_grid').waitFor({ timeout: 10000 });
  assert.ok(await page.getByTestId('workflow-tab-harmonics_grid').locator(':visible').count() > 0,
    'On-grid navigation must expose upstream-grid/harmonics analysis');
  await clickTab('financial');
  await page.locator('#fin-pricing-tariff').waitFor({ timeout: 10000 });
  assert.equal(await page.locator('#fin-pricing-substation').count(), 0, 'on-grid still exposes plant-only substation unit pricing');
  for (const testId of ['capex-line-mv-substation', 'capex-line-grid-interconnection', 'capex-line-hv-connection']) {
    assert.equal(await page.getByTestId(testId).count(), 0, `on-grid exposes misleading ${testId} CAPEX row`);
  }
  await clickTab('harmonics_grid');
  await page.getByText(/Harmonics Analysis|تحلیل هارمونیک/).waitFor({ timeout: 10000 });
  await page.keyboard.press('F1');
  await helpDialog.waitFor();
  assert.match(await helpDialog.locator('#context-help-method').innerText(), /(SCR = upstream Ssc \/ plant MW|SCR = توان اتصال کوتاه بالادست)/i);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Off-Grid' }).click();
  await page.getByTestId('workflow-tab-harmonics_grid').waitFor({ state: 'detached', timeout: 10000 });
  assert.equal(await page.getByText(/Harmonics Analysis|تحلیل هارمونیک/).count(), 0, 'off-grid mode retained harmonic analysis rendering');
  await clickTab('array');
  const offgridAcReference = await page.getByTestId('array-ac-reference').innerText();
  assert.ok(!offgridAcReference.includes('2000.0'), `off-grid AC reference leaked the powerplant target: ${offgridAcReference}`);
  const offgridDisplayedRatio = /DC\/AC = ([0-9.]+)/.exec(await page.getByTestId('array-dc-ac-ratio').innerText())?.[1];
  assert.equal(offgridDisplayedRatio, await page.getByTestId('array-designed-dc-ac-ratio').innerText(), 'off-grid DC/AC denominator differs from the actual designed inverter capacity');
  await clickTab('financial');
  await page.locator('#fin-pricing-tariff').waitFor({ timeout: 10000 });
  assert.equal(await page.locator('#fin-pricing-substation').count(), 0, 'off-grid still exposes plant-only substation unit pricing');
  for (const testId of ['capex-line-mv-substation', 'capex-line-grid-interconnection', 'capex-line-hv-connection']) {
    assert.equal(await page.getByTestId(testId).count(), 0, `off-grid exposes misleading ${testId} CAPEX row`);
  }
  await page.getByRole('button', { name: 'نیروگاهی' }).click();
  await clickTab('system_mode');
  await plantTargetInput.fill('1000');
  await clickTab('financial');
  await page.locator('#fin-pricing-substation').waitFor({ timeout: 10000 });
  console.log('[PASS] Powerplant target/AC reference is isolated from customer modes; harmonics and financial controls are mode-scoped');

  await clickTab('climate');
  await page.getByRole('button', { name: /Edit Climate Parameters|ویرایش پارامترهای اقلیمی/ }).click();
  const originalPsh = await page.locator('#climate-psh-input').inputValue();
  await page.locator('#climate-latitude-input').fill('12');
  await page.locator('#climate-longitude-input').fill('101');
  await page.getByRole('button', { name: /Apply Custom Parameters|اعمال پارامترهای سفارشی/ }).click();
  assert.equal(gatewayRequests, 0, 'cold-offline browser unexpectedly called the data gateway');
  await page.getByRole('button', { name: /Edit Climate Parameters|ویرایش پارامترهای اقلیمی/ }).click();
  const refreshedPsh = await page.locator('#climate-psh-input').inputValue();
  assert.notEqual(refreshedPsh, originalPsh, 'coordinate change relabeled old PSH instead of recomputing it');
  console.log('[PASS] Real browser coordinate edit recomputes PSH offline; no gateway/API server is available');

  // Preserve existing PSH<1 behavior while making its caveat visible to the user.
  await page.locator('#climate-psh-input').fill('0.5');
  await page.getByRole('button', { name: /Apply Custom Parameters|اعمال پارامترهای سفارشی/ }).click();
  await page.getByText(/محدودیت مدل PSH پایین/).waitFor({ timeout: 10000 });
  console.log('[PASS] Browser shows the existing positive-PSH-below-1 scenario floor limitation');

  // Exercise the application's real report modal buttons and re-import its downloaded JSON.
  await page.keyboard.press('Control+e');
  await page.getByRole('button', { name: 'سفارشی‌سازی' }).click();
  await page.locator('#report-doc-id').fill('DOC-BROWSER-01');
  await page.locator('#report-doc-version').fill('Rev Browser 7');
  await page.locator('#report-company-name').fill('Browser Engineering Ltd');
  await page.locator('#report-lead-engineer').fill('Jordan Regression');
  await page.locator('#report-client-name').fill('Offline Client');
  await page.locator('#report-approval-status').selectOption('Under Review');
  await page.locator('#report-file-name').fill('browser-regression-report');
  await page.locator('#report-modal-close-btn').click();
  await page.keyboard.press('Control+e');
  await page.getByRole('button', { name: 'سفارشی‌سازی' }).click();
  assert.equal(await page.locator('#report-doc-id').inputValue(), 'DOC-BROWSER-01');
  assert.equal(await page.locator('#report-doc-version').inputValue(), 'Rev Browser 7');
  assert.equal(await page.locator('#report-company-name').inputValue(), 'Browser Engineering Ltd');
  assert.equal(await page.locator('#report-client-name').inputValue(), 'Offline Client');
  assert.equal(await page.locator('#report-lead-engineer').inputValue(), 'Jordan Regression');
  assert.equal(await page.locator('#report-approval-status').inputValue(), 'Under Review');
  await page.locator('#report-file-name').fill('browser-regression-report');
  console.log('[PASS] Report metadata survives actual modal close and remount');
  const docxDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Word (.docx)' }).click();
  const docxDownload = await docxDownloadPromise;
  const docxPath = path.join(artifactDir!, 'official-ui-report.docx');
  await docxDownload.saveAs(docxPath);
  const xlsxDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Excel (.xlsx)' }).click();
  const xlsxDownload = await xlsxDownloadPromise;
  const xlsxPath = path.join(artifactDir!, 'official-ui-report.xlsx');
  await xlsxDownload.saveAs(xlsxPath);
  const jsonDownloadPromise = page.waitForEvent('download');
  await page.getByTitle('ذخیره محلی پروژه با نام دلخواه').click();
  const jsonDownload = await jsonDownloadPromise;
  const jsonPath = path.join(artifactDir!, 'official-ui-project.solarpv.json');
  await jsonDownload.saveAs(jsonPath);

  const exportedEnvelope = JSON.parse(await readFile(jsonPath, 'utf8'));
  const exportedProject = exportedEnvelope.projectData;
  const rawReportSimulation = exportedProject.reportSnapshot.simulation;
  assert.ok(rawReportSimulation && Array.isArray(rawReportSimulation.hourlySteps), 'UI JSON report snapshot is missing raw 24-hour simulation data');
  const rawDiurnalAnnualMwh = rawReportSimulation.totalGeneration24hKwh * 365 / 1000;
  assert.equal(rawReportSimulation.totalGeneration24hKwh, exportedProject.reportSnapshot.simulation.totalGeneration24hKwh);
  assert.equal(exportedEnvelope.format, 'solarpv_project_envelope');
  assert.equal(exportedProject.city.latitude, 12);
  assert.equal(exportedProject.city.longitude, 101);
  assert.equal(exportedProject.city.peakSunHours, 0.5);
  assert.equal(exportedEnvelope.metadata.docId, 'DOC-BROWSER-01');
  assert.equal(exportedEnvelope.metadata.docVersion, 'Rev Browser 7');
  assert.equal(exportedEnvelope.metadata.approvalStatus, 'Under Review');
  assert.equal(exportedEnvelope.metadata.leadEngineer, 'Jordan Regression');
  assert.equal(exportedEnvelope.metadata.companyName, 'Browser Engineering Ltd');
  assert.equal(exportedEnvelope.metadata.clientName, 'Offline Client');
  assert.equal(exportedEnvelope.metadata.metadataTrust, 'user_entered_not_authenticated');
  assert.equal(exportedProject.metadata.metadataTrust, 'user_entered_not_authenticated');
  const exportedPshProvenance = exportedProject.reportSnapshot.dataProvenance.find((row: { key: string }) => row.key === 'peakSunHours');
  assert.ok(exportedPshProvenance, 'official UI JSON is missing PSH provenance');
  assert.equal(exportedPshProvenance.value, 0.5);
  assert.equal(exportedPshProvenance.unit, 'kWh/m²/day');
  assert.equal(exportedPshProvenance.sourceKind, 'user_input');
  assert.equal(exportedPshProvenance.provider, 'USER_OVERRIDE');

  const officialDocxZip = unzipSync(await readFile(docxPath));
  const officialDocxXml = new TextDecoder().decode(officialDocxZip['word/document.xml']);
  assert.ok(officialDocxXml.includes('0.5'), 'official UI DOCX lost the displayed PSH');
  assert.ok(officialDocxXml.includes('USER_OVERRIDE'), 'official UI DOCX lost PSH provenance');
  assert.ok(officialDocxXml.includes('user_input'), 'official UI DOCX lost PSH source kind');
  assert.ok(
    officialDocxXml.includes('user-entered; not authenticated') || officialDocxXml.includes('ورودی کاربر؛ احراز نشده'),
    'official UI DOCX does not label user-entered metadata as unauthenticated in either supported locale',
  );
  assert.ok(officialDocxXml.includes('12.00'), 'official UI DOCX lost the site latitude');
  assert.ok(officialDocxXml.includes('101.00'), 'official UI DOCX lost the site longitude');
  assert.ok(officialDocxXml.includes('قالب‌بندی هرگز') || officialDocxXml.includes('formatting is never fed back'), 'official UI DOCX is missing the F-04 rounding/model separation disclosure');
  for (const metadataValue of [
    exportedEnvelope.metadata.docId,
    exportedEnvelope.metadata.docVersion,
    exportedEnvelope.metadata.approvalStatus,
    exportedEnvelope.metadata.leadEngineer,
    exportedEnvelope.metadata.companyName,
    exportedEnvelope.metadata.clientName,
  ]) {
    assert.ok(officialDocxXml.includes(String(metadataValue)), `official UI DOCX lost metadata ${metadataValue}`);
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath);
  const summarySheet = workbook.getWorksheet('Project Summary');
  assert.ok(summarySheet, 'official UI XLSX is missing Project Summary sheet');
  const summaryValues = new Map<string, string>();
  summarySheet!.eachRow((row) => summaryValues.set(String(row.getCell(1).value), String(row.getCell(2).value)));
  assert.equal(summaryValues.get('Document ID'), exportedEnvelope.metadata.docId);
  assert.equal(summaryValues.get('Version / Revision'), exportedEnvelope.metadata.docVersion);
  const annualSummaryRow = summarySheet!.getRows(1, summarySheet!.rowCount)!.find((row) => row.getCell(1).value === 'Diurnal Diagnostic Generation (MWh, 24h)');
  assert.ok(annualSummaryRow, 'UI XLSX Project Summary omits the 24-hour-derived diagnostic');
  assert.equal(annualSummaryRow!.getCell(2).value, rawDiurnalAnnualMwh, 'UI XLSX summary fed a rounded figure instead of raw annualized model data');
  assert.equal(annualSummaryRow!.getCell(2).numFmt, '0.00', 'UI XLSX summary does not format the raw 24-hour-derived value to two decimals');
  const independentlyRoundedAnnualDisplay = reportDecimalOracle(rawDiurnalAnnualMwh);
  assert.match(independentlyRoundedAnnualDisplay, /^-?\d+\.\d{2}$/);
  assert.equal(summaryValues.get('User-entered Company (not authenticated)'), exportedEnvelope.metadata.companyName);
  assert.equal(summaryValues.get('User-entered Client Name (not authenticated)'), exportedEnvelope.metadata.clientName);
  assert.equal(summaryValues.get('User-entered Lead Engineer (not authenticated)'), exportedEnvelope.metadata.leadEngineer);
  assert.equal(summaryValues.get('User-entered Approval Status (not authenticated)'), exportedEnvelope.metadata.approvalStatus);
  const provenanceSheet = workbook.getWorksheet('Data Provenance');
  assert.ok(provenanceSheet, 'official UI XLSX is missing Data Provenance sheet');
  const pshRow = provenanceSheet!.getRows(1, provenanceSheet!.rowCount)!.find((row) => row.getCell(1).value === 'peakSunHours');
  assert.ok(pshRow, 'official UI XLSX is missing peakSunHours provenance');
  assert.equal(pshRow!.getCell(3).value, 0.5);
  assert.equal(pshRow!.getCell(4).value, 'kWh/m²/day');
  assert.equal(pshRow!.getCell(5).value, exportedPshProvenance.sourceKind);
  assert.equal(pshRow!.getCell(6).value, exportedPshProvenance.provider);
  const energySheet = workbook.getWorksheet('Energy Yield & PR');
  assert.ok(energySheet, 'official UI XLSX is missing Energy Yield & PR sheet');
  const energyRows = energySheet!.getRows(1, energySheet!.rowCount)!;
  const diurnalRow = energyRows.find((row) => row.getCell(1).value === 'Diurnal Diagnostic Net AC Generation');
  assert.ok(diurnalRow, 'official UI XLSX is missing its annualized 24-hour diagnostic row');
  assert.equal(diurnalRow!.getCell(2).value, rawDiurnalAnnualMwh, 'annualized report value differs from raw JSON model value');
  assert.equal(diurnalRow!.getCell(2).numFmt, '0.00', 'annualized report value is not independently displayed to two decimals');
  assert.equal(reportDecimalOracle(diurnalRow!.getCell(2).value as number), independentlyRoundedAnnualDisplay);
  const roundingDisclosureRow = energyRows.find((row) => row.getCell(1).value === 'F-04 24-hour rounding disclosure');
  assert.ok(roundingDisclosureRow && String(roundingDisclosureRow.getCell(2).value).includes('ties away from zero'), 'official UI XLSX is missing the F-04 tie/display/raw-model disclosure');

  await page.locator('#report-modal-close-btn').click();
  await page.keyboard.press('Control+s');
  const savedMetadata = await page.evaluate(() => JSON.parse(localStorage.getItem('solarpv_project_save') ?? '{}').metadata);
  assert.equal(savedMetadata.docId, 'DOC-BROWSER-01');
  assert.equal(savedMetadata.companyName, 'Browser Engineering Ltd');
  await page.getByTitle('دانلود / بارگذاری فایل JSON پروژه').click();
  const headerDownloadPromise = page.waitForEvent('download');
  await page.getByText('دانلود پاکت JSON').click();
  const headerPath = path.join(artifactDir!, 'header-project.solarpv.json');
  await (await headerDownloadPromise).saveAs(headerPath);
  const headerEnvelope = JSON.parse(await readFile(headerPath, 'utf8'));
  assert.equal(headerEnvelope.metadata.docId, 'DOC-BROWSER-01');
  assert.equal(headerEnvelope.metadata.companyName, 'Browser Engineering Ltd');
  assert.equal(headerEnvelope.projectData.metadata.approvalStatus, 'Under Review');
  console.log('[PASS] Header export and explicit project save preserve report metadata after modal closure');
  await page.keyboard.press('Control+e');
  page.once('dialog', async (dialog) => { await dialog.accept(); });
  await page.locator('#report-restore-file-input').setInputFiles(jsonPath);
  await clickTab('climate');
  await page.getByRole('button', { name: /Edit Climate Parameters|ویرایش پارامترهای اقلیمی/ }).click();
  assert.equal(await page.locator('#climate-latitude-input').inputValue(), '12');
  assert.equal(await page.locator('#climate-longitude-input').inputValue(), '101');
  assert.equal(await page.locator('#climate-psh-input').inputValue(), '0.5');
  await page.getByRole('button', { name: /Cancel Edit|انصراف از ویرایش/ }).click();
  console.log('[PASS] Actual UI DOCX/XLSX/JSON read-back preserves F-04 raw/format disclosure, provenance, and re-import state');

  // Select a location by clicking the actual Leaflet map (not by typing climate
  // coordinates), then override the newly estimated PSH to exact zero.
  await page.getByRole('button', { name: /By Coordinates|ورود با مختصات/ }).click();
  const mapLat = page.locator('#map-coord-latitude');
  const mapLng = page.locator('#map-coord-longitude');
  const beforeMapLat = await mapLat.inputValue();
  const beforeMapLng = await mapLng.inputValue();
  const mapCanvas = page.locator('.leaflet-container').first();
  await mapCanvas.scrollIntoViewIfNeeded();
  const mapBox = await mapCanvas.boundingBox();
  assert.ok(mapBox && mapBox.width > 100 && mapBox.height > 100, 'real Leaflet map canvas is not visible');
  await page.getByRole('alert').getByText(/Map tiles could not be reached|کاشی‌های نقشه قابل دسترسی نیستند/).waitFor({ timeout: 15000 });
  await page.mouse.click(mapBox!.x + mapBox!.width * 0.78, mapBox!.y + mapBox!.height * 0.78);
  await page.waitForFunction(({ oldLat, oldLng }) => {
    const lat = (document.querySelector('#map-coord-latitude') as HTMLInputElement | null)?.value;
    const lng = (document.querySelector('#map-coord-longitude') as HTMLInputElement | null)?.value;
    return Boolean(lat && lng && (lat !== oldLat || lng !== oldLng));
  }, { oldLat: beforeMapLat, oldLng: beforeMapLng }, { timeout: 10000 });
  const selectedMapLat = Number(await mapLat.inputValue());
  const selectedMapLng = Number(await mapLng.inputValue());
  assert.ok(Number.isFinite(selectedMapLat) && Number.isFinite(selectedMapLng));
  assert.ok(selectedMapLat !== Number(beforeMapLat) || selectedMapLng !== Number(beforeMapLng), 'map click did not select new coordinates');
  assert.equal(gatewayRequests, 0, 'offline map coordinate selection unexpectedly called the data gateway');
  await page.getByRole('button', { name: /Edit Climate Parameters|ویرایش پارامترهای اقلیمی/ }).click();
  await page.locator('#climate-psh-input').fill('0');
  await page.getByRole('button', { name: /Apply Custom Parameters|اعمال پارامترهای سفارشی/ }).click();
  await page.getByText(/Zero Solar Irradiance|تابش خورشیدی صفر/).waitFor({ timeout: 10000 });
  await page.keyboard.press('Control+e');
  const zeroJsonDownloadPromise = page.waitForEvent('download');
  await page.getByTitle('ذخیره محلی پروژه با نام دلخواه').click();
  const zeroJsonPath = path.join(artifactDir!, 'map-selected-zero-psh.solarpv.json');
  await (await zeroJsonDownloadPromise).saveAs(zeroJsonPath);
  const zeroEnvelope = JSON.parse(await readFile(zeroJsonPath, 'utf8'));
  assert.equal(zeroEnvelope.projectData.city.latitude, selectedMapLat, 'selected map latitude was not retained in the project export');
  assert.equal(zeroEnvelope.projectData.city.longitude, selectedMapLng, 'selected map longitude was not retained in the project export');
  assert.equal(zeroEnvelope.projectData.city.peakSunHours, 0, 'exact-zero PSH override was coerced or dropped during export');
  await page.locator('#report-modal-close-btn').click();
  console.log('[PASS] Real Leaflet map selection followed by exact-zero PSH override preserves coordinates and zero in JSON');
  await clickTab('structural');
  await page.getByText(/Structural analysis not assessed|تحلیل سازه‌ای انجام نشد/).waitFor({ timeout: 10000 });
  console.log('[PASS] Zero-PSH project shows no fabricated structural calculation');

  await clickTab('3d_viewer');
  await page.getByText(/PROJECT UNSIZABLE — NO ARRAY|پروژه غیرقابل سایزینگ/).waitFor({ timeout: 20000 });
  await page.getByRole('alert').getByText(/No representative PV tables|میز نماینده/).waitFor({ timeout: 10000 });
  assert.equal(gatewayRequests, 0, 'cold-offline browser unexpectedly called the data gateway');
  console.log('[PASS] Zero-capacity 3D view has no project tables/reliability claim; gateway/API server was absent');

  // Register a custom MV inverter through the catalog UI, change utility
  // inverter technology in the real system-mode UI, select that catalog record,
  // and ensure its stable identity survives the official project export.
  await clickTab('catalog');
  await page.getByRole('button', { name: /Add Custom Equipment to Catalog|افزودن تجهیز دلخواه جدید به کاتالوگ/ }).click();
  await page.getByRole('button', { name: /^Inverter$|^اینورتر$/ }).click();
  await page.locator('#cat-inv-manufacturer').fill('Arena Browser Identity');
  await page.locator('#cat-inv-model').fill('MV Identity Probe');
  await page.locator('#cat-inv-tech').selectOption('mv_turnkey');
  await page.locator('#cat-inv-pnom').fill('3125');
  await page.getByRole('button', { name: /Validate & Save Inverter|ثبت و اعتبارسنجی اینورتر/ }).click();
  await page.getByRole('button', { name: /Add Custom Equipment to Catalog|افزودن تجهیز دلخواه جدید به کاتالوگ/ }).waitFor({ timeout: 10000 });
  const identityRecord = await page.evaluate(() => {
    const catalog = JSON.parse(localStorage.getItem('solarpv_custom_catalog_v4') ?? 'null');
    return catalog?.custom?.inverters?.find((item: { modelName: string }) => item.modelName === 'MV Identity Probe') ?? null;
  });
  assert.ok(identityRecord?.id && identityRecord.origin === 'custom' && identityRecord.technology === 'mv_turnkey', 'real catalog UI did not persist the custom inverter identity');
  await clickTab('system_mode');
  await page.getByText(/Integrated MV Turnkey Skid Stations|پست‌های یکپارچه کانتینری/).click();
  await clickTab('array');
  await page.locator('#pv-inverter-picker-select').selectOption(identityRecord.id);
  await page.keyboard.press('Control+e');
  const identityExportPromise = page.waitForEvent('download');
  await page.getByTitle('ذخیره محلی پروژه با نام دلخواه').click();
  const identityExportPath = path.join(artifactDir!, 'inverter-technology-identity.solarpv.json');
  await (await identityExportPromise).saveAs(identityExportPath);
  const identityExport = JSON.parse(await readFile(identityExportPath, 'utf8'));
  assert.equal(identityExport.projectData.selectedInverter.id, identityRecord.id);
  assert.equal(identityExport.projectData.selectedInverter.origin, 'custom');
  assert.equal(identityExport.customEquipmentSnapshots.inverters.find((item: { id: string }) => item.id === identityRecord.id)?.technology, 'mv_turnkey');
  assert.ok(identityExport.customEquipmentSnapshots.inverters.some((item: { id: string }) => item.id === identityRecord.id));
  await page.locator('#report-modal-close-btn').click();
  console.log('[PASS] Real UI inverter technology change retains selected inverter id/origin through project export');

  // A negative power edit on a single load must be clamped to the schema's
  // positive minimum, remain saveable, and never produce an unrelated bay error.
  await page.getByRole('button', { name: /آف.*گرید|Off.*Grid/i }).first().click();
  await clickTab('loads');
  const firstLoadPower = page.locator('tbody tr').first().locator('input[type="number"]').first();
  await firstLoadPower.fill('-250');
  await firstLoadPower.press('Tab');
  assert.equal(await firstLoadPower.inputValue(), '1', 'negative rated load was not clamped to a schema-valid positive value');
  const loadPageText = await page.locator('body').innerText();
  assert.doesNotMatch(loadPageText, /bay count.*(invalid|error)|invalid.*bay count/i, 'negative load triggered an unrelated bay-count error');
  const beforeEditorShortcut = await page.evaluate(() => localStorage.getItem('solarpv_project_save'));
  await page.keyboard.press('Control+s');
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => localStorage.getItem('solarpv_project_save')), beforeEditorShortcut,
    'Ctrl+S was captured by the application while an editor had focus');
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('Control+s');
  await page.getByText(/در ساعت|Project v3 saved with trace/).waitFor({ timeout: 10000 });
  const savedNegativeLoad = await page.evaluate(() => JSON.parse(localStorage.getItem('solarpv_project_save') ?? 'null'));
  assert.ok(Array.isArray(savedNegativeLoad?.loads) && savedNegativeLoad.loads.length > 0, 'project save failed after negative-load correction');
  assert.equal(savedNegativeLoad.loads[0].ratedWatts, 1);
  assert.ok(savedNegativeLoad.loads.every((load: { ratedWatts: number }) => Number.isFinite(load.ratedWatts) && load.ratedWatts > 0));
  console.log('[PASS] Negative load is clamped independently of bay count and project remains saveable');

  // Two real tabs share this browser context's profile/localStorage. Prepare two
  // distinct custom records while each tab has its own repository instance, then
  // submit together and verify both tab views and the persisted catalog survive reload.
  const secondTab = await context.newPage();
  await secondTab.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await secondTab.getByTestId('workflow-tab-climate').waitFor({ timeout: 15000 });
  const tabA = page;
  const tabB = secondTab;
  await Promise.all([
    tabA.getByTestId('workflow-tab-catalog').locator(':visible').first().click(),
    tabB.getByTestId('workflow-tab-catalog').locator(':visible').first().click(),
  ]);
  const fillCustomModule = async (target: typeof page, suffix: string) => {
    await target.getByRole('button', { name: /Add Custom Equipment to Catalog|افزودن تجهیز دلخواه جدید به کاتالوگ/ }).click();
    await target.locator('#cat-mod-manufacturer').fill('Arena Multitab Test');
    await target.locator('#cat-mod-model').fill(`Concurrent-${suffix}`);
  };
  await Promise.all([fillCustomModule(tabA, 'A'), fillCustomModule(tabB, 'B')]);
  const saveModuleButtonA = tabA.getByRole('button', { name: /Validate & Save Module|ثبت و اعتبارسنجی در کاتالوگ/ });
  const saveModuleButtonB = tabB.getByRole('button', { name: /Validate & Save Module|ثبت و اعتبارسنجی در کاتالوگ/ });
  await Promise.all([saveModuleButtonA.click(), saveModuleButtonB.click()]);
  // A Playwright click resolves when the click event is dispatched, not when an
  // async lock-protected form handler has committed. Wait for both handlers to
  // finish before reading the shared durable store.
  await Promise.all([
    saveModuleButtonA.waitFor({ state: 'hidden', timeout: 15000 }),
    saveModuleButtonB.waitFor({ state: 'hidden', timeout: 15000 }),
  ]);
  const catalogState = await tabA.evaluate(() => JSON.parse(localStorage.getItem('solarpv_custom_catalog_v4') ?? 'null'));
  const savedModuleNames = (catalogState?.custom?.modules ?? []).map((item: { modelName: string }) => item.modelName);
  assert.ok(savedModuleNames.includes('Concurrent-A') && savedModuleNames.includes('Concurrent-B'), `cross-tab save conflict/loss: ${savedModuleNames.join(', ')}`);
  await tabA.getByText('Concurrent-A').waitFor({ timeout: 10000 });
  await tabA.getByText('Concurrent-B').waitFor({ timeout: 10000 });
  await tabB.getByText('Concurrent-A').waitFor({ timeout: 10000 });
  await tabB.getByText('Concurrent-B').waitFor({ timeout: 10000 });
  await Promise.all([tabA.reload(), tabB.reload()]);
  await Promise.all([
    tabA.getByTestId('workflow-tab-catalog').locator(':visible').first().click(),
    tabB.getByTestId('workflow-tab-catalog').locator(':visible').first().click(),
  ]);
  await tabA.getByText('Concurrent-A').waitFor({ timeout: 10000 });
  await tabA.getByText('Concurrent-B').waitFor({ timeout: 10000 });

  // Exercise real batch snapshots via UI-generated project JSON after both writes.
  await tabA.keyboard.press('Control+e');
  await tabA.getByRole('button', { name: 'سفارشی‌سازی' }).click();
  const catalogJsonPromise = tabA.waitForEvent('download');
  await tabA.getByTitle('ذخیره محلی پروژه با نام دلخواه').click();
  const catalogJsonDownload = await catalogJsonPromise;
  const catalogJsonPath = path.join(artifactDir!, 'multitab-catalog-project.solarpv.json');
  await catalogJsonDownload.saveAs(catalogJsonPath);
  const catalogEnvelope = JSON.parse(await readFile(catalogJsonPath, 'utf8'));
  const snapshotModelNames = catalogEnvelope.customEquipmentSnapshots.modules.map((item: { modelName: string }) => item.modelName);
  assert.ok(snapshotModelNames.includes('Concurrent-A') && snapshotModelNames.includes('Concurrent-B'), 'UI-generated batch snapshot omitted one concurrent catalog save');
  const canceledEnvelope = structuredClone(catalogEnvelope);
  canceledEnvelope.projectData.version = '2.0.0';
  canceledEnvelope.projectData.pendingImportedEmbedmentDepthM = 1.25;
  canceledEnvelope.projectData.city = { ...canceledEnvelope.projectData.city, latitude: 44, longitude: 55 };
  canceledEnvelope.customEquipmentSnapshots.modules.push({
    ...catalogEnvelope.customEquipmentSnapshots.modules.find((item: { modelName: string }) => item.modelName === 'Concurrent-A'),
    id: 'custom-mod-cancel-only',
    modelName: 'CancelOnly Must Not Apply',
  });
  const canceledJsonPath = path.join(artifactDir!, 'multitab-cancel-before-apply.solarpv.json');
  await writeFile(canceledJsonPath, JSON.stringify(canceledEnvelope), 'utf8');
  const cancelDialogPromise = tabA.waitForEvent('dialog');
  await tabA.locator('#report-restore-file-input').setInputFiles(canceledJsonPath);
  const cancelDialog = await cancelDialogPromise;
  assert.equal(cancelDialog.type(), 'confirm');
  await cancelDialog.dismiss();
  await tabA.locator('#report-restore-file-input').waitFor({ state: 'attached' });
  const afterCanceledImport = await tabA.evaluate(() => JSON.parse(localStorage.getItem('solarpv_custom_catalog_v4') ?? 'null'));
  assert.ok(!afterCanceledImport.custom.modules.some((item: { modelName: string }) => item.modelName === 'CancelOnly Must Not Apply'), 'cancel before confirmation mutated durable catalog state');
  const applyDialogPromise = tabA.waitForEvent('dialog', { timeout: 10000 }).catch(() => null);
  await tabA.locator('#report-restore-file-input').setInputFiles(catalogJsonPath);
  const applyDialog = await applyDialogPromise;
  if (applyDialog) {
    assert.equal(applyDialog.type(), 'confirm');
    await applyDialog.accept();
  }
  await tabA.getByText(/پروژه با موفقیت بارگذاری شد|پروژه با تأیید شما بازیابی شد|Project loaded successfully|Project applied after your confirmation/).waitFor({ timeout: 15000 });
  await tabA.getByTestId('workflow-tab-catalog').waitFor({ timeout: 15000 });
  await clickTab('climate');
  await tabA.getByRole('button', { name: /Edit Climate Parameters|ویرایش پارامترهای اقلیمی/ }).click();
  assert.equal(await tabA.locator('#climate-latitude-input').inputValue(), String(catalogEnvelope.projectData.city.latitude), 'batch import did not restore project latitude');
  assert.equal(await tabA.locator('#climate-longitude-input').inputValue(), String(catalogEnvelope.projectData.city.longitude), 'batch import did not restore project longitude');
  await tabA.getByRole('button', { name: /Cancel Edit|انصراف از ویرایش/ }).click();
  await clickTab('catalog');
  const postRestoreCatalog = await tabA.evaluate(() => JSON.parse(localStorage.getItem('solarpv_custom_catalog_v4') ?? 'null'));
  const postRestoreNames = (postRestoreCatalog?.custom?.modules ?? []).map((item: { modelName: string }) => item.modelName);
  assert.ok(postRestoreNames.includes('Concurrent-A') && postRestoreNames.includes('Concurrent-B'), 'batch snapshot restore lost catalog records');
  console.log('[PASS] Two real tabs concurrently save custom catalog items; storage-event refresh and reload preserve both; UI batch export/import round-trips both records.');

  // Inject a real Storage API exception in a separate page. Catalog save must
  // report failure and preserve the prior durable catalog; project save warns too.
  const failureTab = await context.newPage();
  await failureTab.addInitScript(() => {
    (window as Window & { __pr28FailWrites?: boolean }).__pr28FailWrites = true;
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if ((window as Window & { __pr28FailWrites?: boolean }).__pr28FailWrites
        && (key === 'solarpv_custom_catalog_v4' || key === 'solarpv_project_save')) {
        throw new DOMException('Synthetic quota/security failure', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    };
  });
  await failureTab.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await failureTab.getByTestId('workflow-tab-catalog').locator(':visible').first().click();
  await failureTab.getByRole('button', { name: /Add Custom Equipment to Catalog|افزودن تجهیز دلخواه جدید به کاتالوگ/ }).click();
  await failureTab.locator('#cat-mod-manufacturer').fill('Must Not Persist');
  await failureTab.locator('#cat-mod-model').fill('Quota Failure');
  await failureTab.getByRole('button', { name: /Validate & Save Module|ثبت و اعتبارسنجی در کاتالوگ/ }).click();
  await failureTab.getByText(/Could not persist the custom module|ذخیره‌سازی.*ماژول/).waitFor({ timeout: 10000 });
  const durableAfterFailedSave = await failureTab.evaluate(() => JSON.parse(localStorage.getItem('solarpv_custom_catalog_v4') ?? 'null'));
  assert.ok(!durableAfterFailedSave.custom.modules.some((item: { modelName: string }) => item.modelName === 'Quota Failure'));
  const savedProjectBeforeFailure = await failureTab.evaluate(() => localStorage.getItem('solarpv_project_save'));
  await failureTab.keyboard.press('Control+s');
  await failureTab.getByText(/Project save failed in browser storage|ذخیره‌سازی در فضای محلی ناموفق بود/).waitFor({ timeout: 10000 });
  assert.equal(await failureTab.evaluate(() => localStorage.getItem('solarpv_project_save')), savedProjectBeforeFailure);

  await failureTab.keyboard.press('Control+e');
  await failureTab.getByRole('button', { name: 'سفارشی‌سازی' }).click();
  const failureImportEnvelope = structuredClone(catalogEnvelope);
  failureImportEnvelope.projectData.version = '2.0.0';
  const failureImportPath = path.join(artifactDir!, 'multitab-failed-import.solarpv.json');
  await writeFile(failureImportPath, JSON.stringify(failureImportEnvelope), 'utf8');
  const failedImportDialogPromise = failureTab.waitForEvent('dialog');
  await failureTab.locator('#report-restore-file-input').setInputFiles(failureImportPath);
  const failedImportDialog = await failedImportDialogPromise;
  await failedImportDialog.accept();
  await failureTab.getByText(/Import rejected because custom equipment is invalid|Could not persist imported equipment atomically|بارگذاری به‌دلیل تجهیز نامعتبر/).waitFor({ timeout: 10000 });
  const persistedAfterImportFailure = await failureTab.evaluate(() => JSON.parse(localStorage.getItem('solarpv_custom_catalog_v4') ?? 'null'));
  const priorNamesAfterFailure = persistedAfterImportFailure.custom.modules.map((item: { modelName: string }) => item.modelName);
  assert.ok(priorNamesAfterFailure.includes('Concurrent-A') && priorNamesAfterFailure.includes('Concurrent-B'));
  assert.ok(!priorNamesAfterFailure.includes('Quota Failure'));
  assert.ok(!priorNamesAfterFailure.includes('CancelOnly Must Not Apply'));
  assert.ok((await failureTab.locator('body').innerText()).includes('Catalog storage was verified unchanged'), 'unchanged storage was not verified after the pre-write failure');
  assert.ok(!(await failureTab.locator('body').innerText()).includes('rollback was incomplete'), 'a rollback failure was claimed although no rollback was needed');
  await failureTab.evaluate(() => { (window as Window & { __pr28FailWrites?: boolean }).__pr28FailWrites = false; });
  await failureTab.reload();
  await failureTab.getByTestId('workflow-tab-catalog').locator(':visible').first().click();
  await failureTab.getByText('Concurrent-A').waitFor({ timeout: 10000 });
  await failureTab.getByText('Concurrent-B').waitFor({ timeout: 10000 });
  assert.equal(await failureTab.evaluate(() => localStorage.getItem('solarpv_project_save')), savedProjectBeforeFailure);
  console.log('[PASS] Injected pre-write quota/import failures report verified unchanged storage; no memory-only save is reported; preexisting catalog survives reload.');
  await context.close();
  console.log('Browser regression checks: offline lazy route, waiting SW update, F-04 reports, metadata remount, UI export/import, multitab catalog persistence, injected pre-write failures, unsizable UI PASS');
}

let suiteTimeoutHandle: NodeJS.Timeout;
const browserSuiteTimeoutMs = Number(process.env.BROWSER_TEST_TIMEOUT_MS) || 90000;
const suiteTimeout = new Promise<never>((_resolve, reject) => {
  suiteTimeoutHandle = setTimeout(
    () => reject(new Error(`Browser regression suite exceeded its ${browserSuiteTimeoutMs}ms wall-clock limit`)),
    browserSuiteTimeoutMs,
  );
});
Promise.race([main(), suiteTimeout]).catch(async (error) => {
  const failure = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error('[FAIL] Browser regressions:', failure);
  if (process.env.GITHUB_ACTIONS === 'true') {
    const annotation = failure.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A').replace(/:/g, '%3A').replace(/,/g, '%2C');
    console.error(`::error title=Browser regression failure::${annotation}`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFile } = await import('node:fs/promises');
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `\n### Browser regression failure\n\n\`\`\`text\n${failure}\n\`\`\`\n`, 'utf8').catch(() => undefined);
  }
  process.exitCode = 1;
}).finally(async () => {
  clearTimeout(suiteTimeoutHandle);
  if (browser) {
    await Promise.race([
      browser.close(),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  }
  if (originalServiceWorkerSource !== undefined) {
    await writeFile(path.join(process.cwd(), 'dist/sw.js'), originalServiceWorkerSource, 'utf8').catch(() => undefined);
  }
  if (artifactDir && (process.exitCode === undefined || process.exitCode === 0)) await rm(artifactDir, { recursive: true, force: true });
  else if (artifactDir) console.error(`[INFO] Preserving failed-run artifacts at ${artifactDir}`);
  vite?.kill('SIGTERM');
});
