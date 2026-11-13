import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { cp, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium as playwrightChromium, type Page } from 'playwright-core';

// Two real production builds from isolated copies. Only build two gets an
// extra console marker in the structural lazy module. No project source or
// generated dist in the calling checkout is modified by this test.
if (process.platform === 'linux') process.env.AWS_EXECUTION_ENV ??= 'AWS_Lambda_nodejs20.x';
const sparticuz = (await import('@sparticuz/chromium')).default;
const root = process.cwd();
const temp = await mkdtemp(path.join(os.tmpdir(), 'solarpv-pwa-retry-'));
const source = path.join(temp, 'source');
const build1 = path.join(temp, 'build-1');
const build2 = path.join(temp, 'build-2');
let browser: Awaited<ReturnType<typeof playwrightChromium.launch>> | undefined;
let server: ReturnType<typeof createServer> | undefined;

async function buildBoth(): Promise<void> {
  await cp(path.join(root, 'src'), path.join(source, 'src'), { recursive: true });
  await cp(path.join(root, 'public'), path.join(source, 'public'), { recursive: true });
  for (const file of ['index.html', 'package.json', 'postcss.config.js', 'tailwind.config.js', 'tsconfig.json', 'vite.config.ts']) {
    await cp(path.join(root, file), path.join(source, file));
  }
  await symlink(path.join(root, 'node_modules'), path.join(source, 'node_modules'), 'dir');
  const build = (out: string) => {
    const result = spawnSync(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', out], {
      cwd: source,
      env: { ...process.env, VITE_REAL_INTERNET: 'false', REAL_INTERNET: 'false' },
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
    if (result.status !== 0) throw new Error(`Build failed: ${result.stdout}\n${result.stderr}`);
  };
  build(build1);
  const component = path.join(source, 'src/components/StructuralFoundationTab.tsx');
  await writeFile(component, `${await readFile(component, 'utf8')}\nconsole.info('PR28_PWA_SECOND_BUILD_STRUCTURAL_CHUNK');\n`);
  build(build2);
}

const workerCacheName = async (build: string): Promise<string> => {
  const worker = await readFile(path.join(build, 'sw.js'), 'utf8');
  const match = /const CACHE_NAME = '([^']+)'/.exec(worker);
  assert.ok(match, 'production worker did not have a cache version');
  return match[1];
};
const showClimate = async (page: Page): Promise<void> => {
  await page.getByTestId('workflow-tab-climate').locator(':visible').first().click();
};
const editPsh = async (page: Page, value: string): Promise<void> => {
  await showClimate(page);
  await page.getByRole('button', { name: /Edit Climate Parameters|ویرایش پارامترهای اقلیمی/ }).click();
  await page.locator('#climate-psh-input').fill(value);
  await page.getByRole('button', { name: /Apply Custom Parameters|اعمال پارامترهای سفارشی/ }).click();
};
const readPsh = async (page: Page): Promise<string> => {
  await showClimate(page);
  await page.getByRole('button', { name: /Edit Climate Parameters|ویرایش پارامترهای اقلیمی/ }).click();
  const value = await page.locator('#climate-psh-input').inputValue();
  // Close without committing a different value.
  await page.getByRole('button', { name: /Apply Custom Parameters|اعمال پارامترهای سفارشی/ }).click();
  return value;
};
const visitStructural = async (page: Page): Promise<void> => {
  await page.getByTestId('workflow-tab-structural').locator(':visible').first().click();
  await page.locator('#struct-bearing-capacity').waitFor({ state: 'visible', timeout: 15000 });
};

try {
  await buildBoth();
  const oldCache = await workerCacheName(build1);
  const newCache = await workerCacheName(build2);
  assert.notEqual(oldCache, newCache, 'distinct builds must get distinct cache versions');
  const oldIndex = await readFile(path.join(build1, 'index.html'), 'utf8');
  const newIndex = await readFile(path.join(build2, 'index.html'), 'utf8');
  assert.notEqual(oldIndex, newIndex, 'the lazy-module change must be reflected in the main bundle');
  console.log(`[INFO] Real production builds: v1=${oldCache}, v2=${newCache}`);

  let servedBuild = build1;
  const mime: Record<string, string> = {
    '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png',
  };
  server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (url.pathname.startsWith('/api/')) { res.writeHead(503, { 'content-type': 'application/json' }); res.end('{}'); return; }
      const relative = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
      const file = path.resolve(servedBuild, relative);
      if (!file.startsWith(`${servedBuild}${path.sep}`)) { res.writeHead(403); res.end(); return; }
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': mime[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch { res.writeHead(404); res.end('not found'); }
  });
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  browser = await playwrightChromium.launch({
    executablePath: await sparticuz.executablePath(),
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'], headless: true,
  });

  // A first-ever offline visit is not supported; no preinstalled worker exists.
  const cold = await browser.newContext({ serviceWorkers: 'allow' });
  await cold.setOffline(true);
  const coldPage = await cold.newPage();
  await assert.rejects(coldPage.goto(base, { timeout: 10000 }));
  await cold.close();
  console.log('[PASS] A first-ever offline visit fails explicitly; installation requires connectivity.');

  const ctx = await browser.newContext({ serviceWorkers: 'allow', viewport: { width: 1600, height: 1000 } });
  await ctx.route('https://**/*', (route) => route.abort());
  const a = await ctx.newPage();
  const b = await ctx.newPage();
  const open = async (page: Page) => {
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.getByTestId('workflow-tab-climate').first().waitFor({ timeout: 20000 });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), undefined, { timeout: 15000 });
  };
  await open(a);
  await a.reload({ waitUntil: 'domcontentloaded' });
  await open(b);
  for (const page of [a, b]) {
    assert.equal(await page.evaluate(() => performance.getEntriesByType('resource').some((entry) => entry.name.includes('StructuralFoundationTab'))), false);
    await page.evaluate(() => {
      (window as Window & { __pwaControllerChanges?: number }).__pwaControllerChanges = 0;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        (window as Window & { __pwaControllerChanges?: number }).__pwaControllerChanges!++;
      });
    });
  }
  await editPsh(a, '2.34');
  await editPsh(b, '3.45');
  await a.keyboard.press('Control+s');
  const saved = await a.evaluate(() => JSON.parse(localStorage.getItem('solarpv_project_save') ?? 'null'));
  assert.equal(saved.city.peakSunHours, 2.34);
  const oldChunk = await a.evaluate(async (name) => {
    const cache = await caches.open(name);
    const requests = await cache.keys();
    return requests.map((request) => new URL(request.url).pathname).find((asset) => /StructuralFoundationTab-[^/]+\.js$/.test(asset));
  }, oldCache);
  assert.ok(oldChunk, 'v1 precache is missing the structural lazy chunk');

  servedBuild = build2;
  await a.evaluate(async () => { await (await navigator.serviceWorker.ready).update(); });
  await a.waitForFunction(async ({ oldName, newName }) => {
    const names = await caches.keys();
    const registration = await navigator.serviceWorker.getRegistration();
    return names.includes(oldName) && names.includes(newName) && registration?.waiting?.state === 'installed';
  }, { oldName: oldCache, newName: newCache }, { timeout: 30000 });
  for (const page of [a, b]) {
    await page.getByRole('status').filter({ hasText: /نسخهٔ جدید آماده|An update is ready/ }).waitFor({ timeout: 15000 });
    assert.equal(await page.evaluate(() => (window as Window & { __pwaControllerChanges?: number }).__pwaControllerChanges), 0);
  }
  const oldShellAfterUpdate = await a.evaluate(async (name) => (await (await caches.open(name)).match('/index.html'))?.text(), oldCache);
  assert.equal(oldShellAfterUpdate, oldIndex, 'waiting v2 overwrote v1 shell in cache');
  assert.equal(await a.evaluate(async () => (await fetch('/index.html')).text()), oldIndex, 'old client received the new shell before activation');
  assert.ok(await a.evaluate(async ({ name, chunk }) => Boolean(await (await caches.open(name)).match(chunk)), { name: oldCache, chunk: oldChunk }));
  console.log('[PASS] Different v2 build waits for two v1 tabs; both receive an unsaved-work warning, old shell/cache and controllers remain v1.');

  await ctx.setOffline(true);
  await Promise.all([visitStructural(a), visitStructural(b)]);
  assert.equal(await a.evaluate(() => navigator.onLine), false);
  assert.equal(await readPsh(a), '2.34');
  assert.equal(await readPsh(b), '3.45');
  console.log('[PASS] Both old clients open a previously unvisited v1 lazy view offline without losing their distinct edits.');
  await ctx.setOffline(false);
  await a.close();
  await b.waitForFunction(async ({ oldName, newName }) => {
    const names = await caches.keys();
    const registration = await navigator.serviceWorker.getRegistration();
    return names.includes(oldName) && names.includes(newName) && registration?.waiting?.state === 'installed';
  }, { oldName: oldCache, newName: newCache }, { timeout: 10000 });
  assert.equal(await readPsh(b), '3.45');
  await b.close();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const c = await ctx.newPage();
  await open(c);
  await c.waitForFunction(async ({ oldName, newName }) => {
    const names = await caches.keys();
    return names.includes(newName) && !names.includes(oldName);
  }, { oldName: oldCache, newName: newCache }, { timeout: 25000 });
  const persisted = await c.evaluate(() => JSON.parse(localStorage.getItem('solarpv_project_save') ?? 'null'));
  assert.equal(persisted.city.peakSunHours, 2.34);
  // Explicitly exercise cancel and then confirmed recovery from local storage.
  await c.getByTitle('دانلود / بارگذاری فایل JSON پروژه').click();
  let dialogPromise = c.waitForEvent('dialog');
  let clickPromise = c.getByRole('button', { name: /Restore last local save|بازیابی آخرین ذخیرهٔ محلی/ }).click();
  let dialog = await dialogPromise;
  assert.match(dialog.message(), /replaces|جایگزین/);
  await dialog.dismiss();
  await clickPromise;
  await c.getByRole('button', { name: /Restore last local save|بازیابی آخرین ذخیرهٔ محلی/ }).waitFor();
  const acceptedMessages: string[] = [];
  c.on('dialog', async (current) => { acceptedMessages.push(current.message()); await current.accept(); });
  await c.getByRole('button', { name: /Restore last local save|بازیابی آخرین ذخیرهٔ محلی/ }).click();
  await c.getByRole('button', { name: /Restore last local save|بازیابی آخرین ذخیرهٔ محلی/ }).waitFor({ state: 'detached', timeout: 15000 });
  assert.ok(acceptedMessages.length >= 1);
  assert.equal(await readPsh(c), '2.34');
  assert.equal(await c.evaluate(() => performance.getEntriesByType('resource').some((entry) => entry.name.includes('StructuralFoundationTab'))), false);
  await ctx.setOffline(true);
  await visitStructural(c);
  assert.equal(await c.evaluate(() => navigator.onLine), false);
  console.log('[PASS] After both v1 tabs close, v2 activates, retires v1 cache, loads its unvisited lazy view offline and restores the saved project only after confirmation.');

  // Roll back the served build while v2 is still controlled. The older worker
  // is installed as a new waiting version, not forced into the active tab.
  await ctx.setOffline(false);
  servedBuild = build1;
  await c.evaluate(async () => { await (await navigator.serviceWorker.ready).update(); });
  await c.waitForFunction(async ({ oldName, newName }) => {
    const names = await caches.keys();
    const registration = await navigator.serviceWorker.getRegistration();
    return names.includes(oldName) && names.includes(newName) && registration?.waiting?.state === 'installed';
  }, { oldName: oldCache, newName: newCache }, { timeout: 30000 });
  assert.equal(await readPsh(c), '2.34');
  await c.close();
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const d = await ctx.newPage();
  await open(d);
  await d.waitForFunction(async ({ oldName, newName }) => {
    const names = await caches.keys();
    return names.includes(oldName) && !names.includes(newName);
  }, { oldName: oldCache, newName: newCache }, { timeout: 25000 });
  assert.equal((await d.evaluate(() => JSON.parse(localStorage.getItem('solarpv_project_save') ?? 'null'))).city.peakSunHours, 2.34);
  await ctx.setOffline(true);
  await visitStructural(d);
  console.log('[PASS] Deploying the previous build waits for v2 to close; rollback activates v1, preserves the local save and serves its lazy view offline.');
  await ctx.close();

  // Test the real ErrorBoundary by blocking a lazy module in a fresh context.
  const errorContext = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1600, height: 1000 } });
  await errorContext.route('https://**/*', (route) => route.abort());
  await errorContext.route('**/assets/StructuralFoundationTab-*.js', (route) => route.abort('failed'));
  const errorPage = await errorContext.newPage();
  await errorPage.goto(base, { waitUntil: 'domcontentloaded' });
  await errorPage.getByTestId('workflow-tab-climate').first().waitFor();
  await editPsh(errorPage, '2.78');
  await errorPage.getByTestId('workflow-tab-structural').locator(':visible').first().click();
  await errorPage.getByRole('heading', { name: /Application Error/ }).waitFor({ timeout: 15000 });
  assert.match(await errorPage.locator('body').innerText(), /Unsaved edits may be lost/);
  for (const button of [/Reset UI/, /Reload/]) {
    dialogPromise = errorPage.waitForEvent('dialog');
    clickPromise = errorPage.getByRole('button', { name: button }).click();
    dialog = await dialogPromise;
    assert.match(dialog.message(), /unsaved project edits/i);
    await dialog.dismiss();
    await clickPromise;
    await errorPage.getByRole('heading', { name: /Application Error/ }).waitFor();
  }
  dialogPromise = errorPage.waitForEvent('dialog');
  clickPromise = errorPage.getByRole('button', { name: /Reset UI/ }).click();
  await (await dialogPromise).accept();
  await clickPromise;
  await errorPage.getByTestId('workflow-tab-climate').first().waitFor({ timeout: 15000 });
  await errorPage.getByTestId('workflow-tab-structural').locator(':visible').first().click();
  await errorPage.getByRole('heading', { name: /Application Error/ }).waitFor({ timeout: 15000 });
  await errorContext.unroute('**/assets/StructuralFoundationTab-*.js');
  dialogPromise = errorPage.waitForEvent('dialog');
  const navigation = errorPage.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });
  clickPromise = errorPage.getByRole('button', { name: /Reload/ }).click();
  await (await dialogPromise).accept();
  await clickPromise;
  await navigation;
  await errorPage.getByTestId('workflow-tab-climate').first().waitFor({ timeout: 15000 });
  console.log('[PASS] Actual lazy-load error boundary warns, respects cancel for reset/reload, and only resets/reloads after confirmation.');
  await errorContext.close();
  console.log('Distinct-build PWA/update/rollback and error-boundary regressions: PASS (local synthetic static host).');
} catch (error) {
  console.error('[FAIL] Distinct-build PWA/update/rollback regressions:', error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
  await rm(temp, { recursive: true, force: true });
}
