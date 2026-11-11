import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { unzipSync } from 'fflate';
import { chromium as playwrightChromium } from 'playwright-core';
import sparticuzChromium from '@sparticuz/chromium';

const port = 5187;
const baseUrl = `http://127.0.0.1:${port}`;
const vite = spawn(process.execPath, [
  'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort',
], {
  cwd: process.cwd(),
  env: { ...process.env, VITE_REAL_INTERNET: 'false', REAL_INTERNET: 'false' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let viteLog = '';
vite.stdout.on('data', (data) => { viteLog += String(data); });
vite.stderr.on('data', (data) => { viteLog += String(data); });
let browser: Awaited<ReturnType<typeof playwrightChromium.launch>> | undefined;
let artifactDir: string | undefined;

async function waitForVite() {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (vite.exitCode !== null) throw new Error(`Vite exited early:\n${viteLog}`);
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Wait for dev server startup.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for Vite:\n${viteLog}`);
}

async function main() {
  await waitForVite();
  browser = await playwrightChromium.launch({
    executablePath: await sparticuzChromium.executablePath(),
    args: sparticuzChromium.args,
    headless: true,
  });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  let gatewayRequests = 0;
  await page.route('**/api/v1/gateway/**', async (route) => {
    gatewayRequests++;
    await route.abort('internetdisconnected');
  });
  await page.route('https://**/*', (route) => route.abort('internetdisconnected'));
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  artifactDir = await mkdtemp(path.join(os.tmpdir(), 'solarpv-ui-artifacts-'));

  const clickTab = async (tab: string) => {
    await page.getByTestId(`workflow-tab-${tab}`).filter({ visible: true }).first().click({ timeout: 15000 });
  };
  await clickTab('climate');
  await page.getByRole('button', { name: /Edit Climate Parameters|ویرایش پارامترهای اقلیمی/ }).click();
  const originalPsh = await page.locator('#climate-psh-input').inputValue();
  await page.locator('#climate-latitude-input').fill('12');
  await page.locator('#climate-longitude-input').fill('101');
  await page.getByRole('button', { name: /Apply Custom Parameters|اعمال پارامترهای سفارشی/ }).click();
  await page.getByText(/Custom Site \(12\.0000, 101\.0000\)|محل سفارشی/).first().waitFor({ timeout: 15000 });
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
  await page.getByRole('button', { name: 'ذخیره پروژه' }).click();
  const jsonDownload = await jsonDownloadPromise;
  const jsonPath = path.join(artifactDir!, 'official-ui-project.solarpv.json');
  await jsonDownload.saveAs(jsonPath);

  const exportedEnvelope = JSON.parse(await readFile(jsonPath, 'utf8'));
  const exportedProject = exportedEnvelope.projectData;
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
  const exportedPshProvenance = exportedProject.dataProvenance.find((row: { key: string }) => row.key === 'peakSunHours');
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
  assert.ok(officialDocxXml.includes('12.00'), 'official UI DOCX lost the site latitude');
  assert.ok(officialDocxXml.includes('101.00'), 'official UI DOCX lost the site longitude');
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
  assert.equal(summaryValues.get('Approval Status'), exportedEnvelope.metadata.approvalStatus);
  assert.equal(summaryValues.get('Lead Engineer'), exportedEnvelope.metadata.leadEngineer);
  assert.equal(summaryValues.get('Checked / Verified By'), exportedEnvelope.metadata.companyName);
  assert.equal(summaryValues.get('Client Acceptance'), exportedEnvelope.metadata.clientName);
  const provenanceSheet = workbook.getWorksheet('Data Provenance');
  assert.ok(provenanceSheet, 'official UI XLSX is missing Data Provenance sheet');
  const pshRow = provenanceSheet!.getRows(1, provenanceSheet!.rowCount)!.find((row) => row.getCell(1).value === 'peakSunHours');
  assert.ok(pshRow, 'official UI XLSX is missing peakSunHours provenance');
  assert.equal(pshRow!.getCell(3).value, 0.5);
  assert.equal(pshRow!.getCell(4).value, 'kWh/m²/day');
  assert.equal(pshRow!.getCell(5).value, exportedPshProvenance.sourceKind);
  assert.equal(pshRow!.getCell(6).value, exportedPshProvenance.provider);

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#report-restore-file-input').setInputFiles(jsonPath);
  await page.getByText(/Custom Site \(12\.0000, 101\.0000\)/).waitFor({ timeout: 15000 });
  console.log('[PASS] Real UI DOCX/XLSX/JSON downloads preserve site + PSH provenance and UI JSON re-import restores site');

  await page.getByRole('button', { name: /Edit Climate Parameters|ویرایش پارامترهای اقلیمی/ }).click();
  await page.locator('#climate-psh-input').fill('0');
  await page.getByRole('button', { name: /Apply Custom Parameters|اعمال پارامترهای سفارشی/ }).click();
  await page.getByText(/Zero Solar Irradiance|تابش خورشیدی صفر/).waitFor({ timeout: 10000 });
  await clickTab('structural');
  await page.getByText(/Structural analysis not assessed|تحلیل سازه‌ای انجام نشد/).waitFor({ timeout: 10000 });
  console.log('[PASS] Zero-PSH project shows no fabricated structural calculation');

  await clickTab('3d_viewer');
  await page.getByText(/PROJECT UNSIZABLE — NO ARRAY|پروژه غیرقابل سایزینگ/).waitFor({ timeout: 20000 });
  await page.getByRole('alert').getByText(/No representative PV tables|میز نماینده/).waitFor({ timeout: 10000 });
  assert.equal(gatewayRequests, 0, 'cold-offline browser unexpectedly called the data gateway');
  console.log('[PASS] Zero-capacity 3D view has no project tables/reliability claim; gateway/API server was absent');
  await context.close();
  console.log('Browser regression checks: 6 PASS (cold offline, coordinate refresh, low PSH, official DOCX/XLSX/JSON export + JSON re-import, unsizable UI)');
}

main().catch((error) => {
  console.error('[FAIL] Browser regressions:', error);
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
  if (artifactDir) await rm(artifactDir, { recursive: true, force: true });
  vite.kill('SIGTERM');
});
