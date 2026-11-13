import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { unzipSync } from 'fflate';
import { chromium as playwrightChromium } from 'playwright-core';
import { getDefaultClimateCity } from '../src/engine/climaticData';
import { ClimateDataProvider } from '../src/engine/dataGateway/climateDataProvider';
import { SoilDataProvider } from '../src/engine/dataGateway/soilDataProvider';
import { createParameterProvenance } from '../src/engine/dataGateway/types';

// Real UI, synthetic same-origin gateway and provider payloads. External HTTP
// is blocked. The build is in a temporary output directory, not ./dist.
if (process.platform === 'linux') process.env.AWS_EXECUTION_ENV ??= 'AWS_Lambda_nodejs20.x';
const sparticuz = (await import('@sparticuz/chromium')).default;
const root = process.cwd();
const temp = await mkdtemp(path.join(os.tmpdir(), 'solarpv-gateway-ui-'));
const buildDir = path.join(temp, 'build');
const outputDir = process.env.PR28_UI_ARTIFACTS_DIR ? path.resolve(process.env.PR28_UI_ARTIFACTS_DIR) : path.join(temp, 'artifacts');
await mkdir(outputDir, { recursive: true });
let browser: Awaited<ReturnType<typeof playwrightChromium.launch>> | undefined;
let server: ReturnType<typeof createServer> | undefined;

try {
  const build = spawnSync(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', buildDir], {
    cwd: root,
    env: { ...process.env, VITE_REAL_INTERNET: 'true', REAL_INTERNET: 'true' },
    encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  });
  if (build.status !== 0) throw new Error(`Gateway UI build failed: ${build.stdout}\n${build.stderr}`);
  const layer = (name: string, mean: number) => ({ name, depths: [{ label: '0-30cm', values: { mean } }] });
  const partialSoil = new SoilDataProvider().parseSoilGridsResponse(12, 101, {
    properties: { layers: [layer('clay', 200), layer('sand', 500), layer('silt', 300), layer('bdod', 120), layer('bdod', 180), layer('phh2o', 70)] },
  });
  const climate = new ClimateDataProvider().parsePvgisResponse(12, 101, {
    outputs: { monthly: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, 'H(h)_m': 150, T2m: 20 })) },
  });
  const city = {
    ...getDefaultClimateCity(),
    id: 'synthetic-gateway-12-101', latitude: 12, longitude: 101,
    peakSunHours: climate.peakSunHours, soilBearingCapacityKpa: 350,
    confidence: 'measured', dataSourceEn: 'Synthetic PVGIS / partial ISRIC', dataSourceFa: 'Synthetic PVGIS / partial ISRIC',
    fieldProvenance: {
      ...climate.fieldProvenance,
      ...partialSoil.fieldProvenance,
      soilBearingCapacityKpa: createParameterProvenance('provider_derived', 'ISRIC_SOILGRIDS', { unit: 'kPa', value: 350 }),
    },
  };
  const fixture = { ok: true, live: false, isSolarLive: true, isSoilLive: false, climateCity: city, climateResource: climate, soilProperties: partialSoil, traceId: 'SYNTHETIC-PR28' };
  const mime: Record<string, string> = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
  server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const relative = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
      const file = path.resolve(buildDir, relative);
      if (!file.startsWith(`${buildDir}${path.sep}`)) { res.writeHead(403); res.end(); return; }
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': mime[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch { res.writeHead(404); res.end('not found'); }
  });
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  browser = await playwrightChromium.launch({ executablePath: await sparticuz.executablePath(), args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'], headless: true });
  const ctx = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: true, viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  const requestedUrls: string[] = [];
  const pageErrors: string[] = [];
  page.on('request', (request) => requestedUrls.push(request.url()));
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await ctx.route('https://**/*', (route) => route.abort('internetdisconnected'));
  let siteMode: 'failure' | 'partial' = 'failure';
  let sawSlowRequest: (() => void) | undefined;
  await ctx.route('**/api/v1/gateway/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/geocode')) {
      const query = url.searchParams.get('q');
      if (query === 'slow-old') {
        sawSlowRequest?.();
        await new Promise((resolve) => setTimeout(resolve, 1200));
        await route.fulfill({ json: [{ lat: 8, lon: 9, display_name: 'Obsolete slow result', type: 'place' }] }).catch(() => undefined);
        return;
      }
      const data: Record<string, { status: number; body: unknown }> = {
        empty: { status: 200, body: [] },
        timeout: { status: 504, body: { code: 'TIMEOUT' } },
        disabled: { status: 503, body: { code: 'DISABLED' } },
        coordinator: { status: 503, body: { code: 'COORDINATOR_UNAVAILABLE' } },
        unavailable: { status: 502, body: { code: 'UPSTREAM_UNAVAILABLE' } },
        'bad-null': { status: 200, body: [{ lat: null, lon: 0, display_name: 'Bad Null' }] },
        'bad-blank': { status: 200, body: [{ lat: '0', lon: '', display_name: 'Bad Blank' }] },
        'valid-zero': { status: 200, body: [{ lat: 0, lon: 0, display_name: 'Valid Origin', type: 'place' }] },
        new: { status: 200, body: [{ lat: 1, lon: 2, display_name: 'New Result', type: 'place' }] },
      };
      const entry = data[query ?? ''] ?? { status: 500, body: {} };
      await route.fulfill({ status: entry.status, contentType: 'application/json', body: JSON.stringify(entry.body) });
      return;
    }
    await route.fulfill({ status: siteMode === 'partial' ? 200 : 502, contentType: 'application/json', body: JSON.stringify(siteMode === 'partial' ? fixture : { error: 'synthetic failure' }) });
  });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('workflow-tab-climate').first().waitFor({ timeout: 20000 });
  const search = page.getByPlaceholder(/City, town, industrial zone|نام شهر، شهرک صنعتی یا منطقه/);
  await search.waitFor({ timeout: 15000 });
  const runSearch = async (query: string) => { await search.fill(query); await search.press('Enter'); };
  for (const [query, expected] of [
    ['empty', /مکانی مطابق جستجو یافت نشد|No matching places found/],
    ['timeout', /زمان جستجوی مکان به پایان رسید|Geocoding timed out/],
    ['disabled', /جستجوی آنلاین مکان غیرفعال است|Online geocoding is disabled/],
    ['coordinator', /نبود هماهنگ‌کننده نرخ|shared rate coordinator/],
    ['unavailable', /جستجوی مکان در دسترس نیست|Geocoding is unavailable; retry/],
    ['bad-null', /جستجوی مکان در دسترس نیست|Geocoding is unavailable; retry/],
    ['bad-blank', /جستجوی مکان در دسترس نیست|Geocoding is unavailable; retry/],
  ] as const) {
    await runSearch(query);
    await page.getByRole('status').filter({ hasText: expected }).waitFor({ timeout: 10000 });
    assert.equal(await page.getByText('Bad Null', { exact: true }).count(), 0);
    assert.equal(await page.getByText('Bad Blank', { exact: true }).count(), 0);
  }
  await runSearch('valid-zero');
  await page.getByRole('button', { name: /Valid Origin/ }).waitFor({ timeout: 10000 });
  const slowStarted = new Promise<void>((resolve) => { sawSlowRequest = resolve; });
  await runSearch('slow-old');
  await slowStarted;
  await runSearch('new');
  await page.getByRole('button', { name: /New Result/ }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(1500);
  assert.equal(await page.getByText('Obsolete slow result').count(), 0);
  console.log('[PASS] Real map UI distinguishes empty/timeout/disabled/coordinator/upstream errors, rejects null/blank coordinates, accepts zero and ignores an aborted stale response.');

  // Observe a real RFC fallback first, then load a partial-soil fixture into the
  // project and compare footer, RFC, preview and actual exported artifacts.
  const tab = async (id: string) => page.getByTestId(`workflow-tab-${id}`).locator(':visible').first().click();
  await tab('rfc3_reports');
  await page.getByRole('button', { name: 'داده‌های اقلیمی از API' }).click();
  await page.getByRole('button', { name: 'دریافت مونیخ از API' }).click();
  await page.getByText('PROVENANCE: ANALYTICAL FALLBACK / GATEWAY ERROR').waitFor({ timeout: 10000 });
  siteMode = 'partial';
  await tab('climate');
  await page.getByRole('button', { name: /Edit Climate Parameters|ویرایش پارامترهای اقلیمی/ }).click();
  await page.locator('#climate-latitude-input').fill('12');
  await page.locator('#climate-longitude-input').fill('101');
  await page.getByRole('button', { name: /Apply Custom Parameters|اعمال پارامترهای سفارشی/ }).click();
  await page.getByText(/Custom Site \(12\.0000, 101\.0000\)|محل سفارشی/).first().waitFor({ timeout: 10000 });
  await page.waitForFunction(() => document.querySelector('footer')?.textContent?.includes('SOIL PARTIAL'), undefined, { timeout: 10000 });
  const footer = await page.locator('footer').innerText();
  assert.match(footer, /SOLAR PROVIDER; SOIL PARTIAL/);
  assert.doesNotMatch(footer, /SOIL LIVE|11\/11 BENCHMARKS PASS/);
  await tab('structural');
  const bearing = page.locator('#struct-bearing-capacity');
  await bearing.waitFor();
  assert.equal(await bearing.inputValue(), '350');
  await bearing.fill('360');
  await bearing.fill('350');
  await page.waitForTimeout(700);
  await page.keyboard.press('Control+e');
  await page.locator('#report-modal-close-btn').waitFor();
  const previewRow = page.locator('tr').filter({ hasText: 'Soil Bearing Capacity' }).first();
  const previewText = await previewRow.innerText();
  assert.match(previewText, /350/);
  assert.match(previewText, /USER_OVERRIDE/);
  assert.match(previewText, /user_input/);
  assert.match(previewText, /analytical/);
  const download = async (button: string, file: string) => {
    const event = page.waitForEvent('download', { timeout: 20000 });
    await page.getByRole('button', { name: button }).click();
    const target = path.join(outputDir, file);
    await (await event).saveAs(target);
    return target;
  };
  const jsonEvent = page.waitForEvent('download');
  await page.getByTitle('ذخیره محلی پروژه با نام دلخواه').click();
  const jsonPath = path.join(outputDir, 'equal-override.json');
  await (await jsonEvent).saveAs(jsonPath);
  const documentPath = await download('Word (.docx)', 'equal-override.docx');
  const workbookPath = await download('Excel (.xlsx)', 'equal-override.xlsx');
  const project = JSON.parse(await readFile(jsonPath, 'utf8'));
  assert.equal(project.projectData.city.soilBearingCapacityKpa, 350);
  assert.equal(project.projectData.siteOverrides.soilBearingCapacityKpa, 350);
  const record = project.projectData.reportSnapshot.dataProvenance.find((row: { key: string }) => row.key === 'soilBearingCapacityKpa');
  assert.equal(record.provider, 'USER_OVERRIDE');
  assert.equal(record.sourceKind, 'user_input');
  assert.equal(record.confidence, 'analytical');
  const xml = new TextDecoder().decode(unzipSync(await readFile(documentPath))['word/document.xml']);
  const docxRow = (xml.match(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g) ?? []).find((row) => row.includes('Soil Bearing Capacity') && row.includes('USER_OVERRIDE'));
  assert.ok(docxRow && docxRow.includes('user_input') && docxRow.includes('analytical'), 'DOCX provenance row lacks override/confidence');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const sheet = workbook.getWorksheet('Data Provenance');
  assert.ok(sheet);
  const sheetRows: unknown[][] = [];
  sheet.eachRow((row) => { if (row.getCell(1).value === 'soilBearingCapacityKpa') sheetRows.push((row.values as unknown[]).slice(1)); });
  assert.equal(sheetRows.length, 1);
  assert.equal(sheetRows[0][2], 350);
  assert.equal(sheetRows[0][4], 'user_input');
  assert.equal(sheetRows[0][5], 'USER_OVERRIDE');
  assert.equal(sheetRows[0][11], 'analytical');
  await page.locator('#report-modal-close-btn').click();
  await tab('rfc3_reports');
  await page.getByRole('button', { name: 'بخش A — تاریخچه داده‌ها' }).click();
  const rfcText = await page.locator('tr').filter({ hasText: 'Soil Bearing Capacity' }).first().innerText();
  assert.match(rfcText, /USER_OVERRIDE/);
  assert.match(rfcText, /analytical/);
  assert.doesNotMatch(rfcText, /measured/);
  await page.getByRole('button', { name: 'داده‌های اقلیمی از API' }).click();
  await page.getByRole('button', { name: 'دریافت مونیخ از API' }).click();
  await page.getByText(/PROVENANCE: MIXED \/ PARTIAL — SOLAR PROVIDER; SOIL PARTIAL/).waitFor({ timeout: 10000 });
  assert.match(await page.locator('footer').innerText(), /SOLAR PROVIDER; SOIL PARTIAL/);
  const directProviderRequests = requestedUrls.filter((url) => /power\.larc\.nasa\.gov|re\.jrc\.ec\.europa\.eu|rest\.isric\.org|nominatim\.openstreetmap\.org/i.test(url));
  assert.deepEqual(directProviderRequests, []);
  assert.deepEqual(pageErrors, []);
  console.log('[PASS] Synthetic partial soil is PARTIAL in footer and RFC; 350 kPa equal-value override is USER_OVERRIDE / analytical in RFC, preview, JSON, DOCX and XLSX.');
  console.log('[PASS] Browser made no direct NASA, PVGIS, SoilGrids or Nominatim requests on gateway failure or synthetic success.');
  console.log(`Gateway UI artifacts: ${outputDir}`);
  await ctx.close();
} catch (error) {
  console.error('[FAIL] PR #28 gateway UI regressions:', error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
  await rm(temp, { recursive: true, force: true });
}
