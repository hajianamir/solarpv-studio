import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
const bundle = await build({ stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {FinancialEnergyQuantiles} from './src/components/FinancialEnergyQuantiles'; import {FinancialMetricQuantiles} from './src/components/FinancialMetricQuantiles'; import {FinancialTab} from './src/components/FinancialTab'; import {performFinancialAnalysis,DEFAULT_FINANCIAL_PRICING} from './src/engine/financialEngine';
const params=new URLSearchParams(location.search); const energy={p10:params.has('invalid')?-1:70,p50:100,p90:130,nominal:100,mean:105,stdDev:20,relativeSpreadPercent:60,unit:'MWh'};
const root=createRoot(document.getElementById('root'));
function Full(){const [pricing,setPricing]=React.useState(DEFAULT_FINANCIAL_PRICING);return React.createElement(FinancialTab,{financial:performFinancialAnalysis(1000,0,1000,1800000,pricing),pricing,onPricingChange:setPricing,lang:'en'});}
function renderFixture(traceId='SYNTHETIC-browser'){
const metric=params.get('metric');root.render(params.has('full')?React.createElement(Full):metric?React.createElement(FinancialMetricQuantiles,{metric,value:metric==='lcoe'?{...energy,p10:130,p90:70,unit:'$/MWh'}:{...energy,unit:'USD'},traceId,lang:'en',children:'LEGACY'}):React.createElement(FinancialEnergyQuantiles,{energy:{...energy},traceId,lang:params.get('lang')||'en'}));}
window.replaceFixture=()=>renderFixture('NEW-RESULT');renderFixture();`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, format: 'esm', platform: 'browser' });
const workerBundle = await build({entryPoints:['src/studies/financialUq.worker.ts'],bundle:true,write:false,format:'esm',platform:'browser'});
const server = createServer(async (req, res) => {
  if (req.url === '/financialUq.worker.ts') { res.setHeader('Content-Type','text/javascript'); res.end(workerBundle.outputFiles[0].contents); return; }
  if (req.url === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].contents); }
  else if (req.url?.endsWith('DejaVuSans.ttf')) { res.end(await readFile('src/assets/fonts/DejaVuSans.ttf')); }
  else { res.setHeader('Content-Type', 'text/html'); res.end('<div id="root"></div><script type="module" src="/fixture.js"></script>'); }
});
await new Promise<void>(resolve => server.listen(0, '0.0.0.0', resolve));
const address = server.address(); assert.ok(address && typeof address !== 'string');
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  process.env.AWS_EXECUTION_ENV ??= 'AWS_Lambda_nodejs20.x';
  const executablePath = process.env.BROWSER_EXECUTABLE_PATH ?? (process.platform==='linux'?await (await import('@sparticuz/chromium')).default.executablePath():undefined);
  browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ acceptDownloads: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const base = `http://127.0.0.1:${address.port}`;
  for (const lang of ['en', 'fa']) {
    await page.goto(`${base}/?lang=${lang}`);
    const flag = page.getByTestId('uq-explicit-flag'); await flag.waitFor();
    assert.equal(await flag.isChecked(), true); await flag.uncheck();
    assert.ok((await page.getByTestId('financial-energy-quantiles').innerText()).includes('P10: 70 | P90: 130'));
    await flag.check();
    assert.ok((await page.getByTestId('uq-explicit-result').innerText()).includes('P10: 130 | P50: 100 | P90: 70 MWh'));
    const waiting = page.waitForEvent('download');
    await page.getByRole('button').click();
    const download = await waiting;
    assert.equal(download.suggestedFilename(), 'financial-energy-quantiles.pdf');
    const path = await download.path(); assert.ok(path);
    assert.equal((await readFile(path)).subarray(0, 5).toString(), '%PDF-');
    await flag.uncheck(); assert.equal(await page.getByTestId('uq-explicit-result').count(), 0);
  }
  await page.goto(`${base}/?invalid=1`); await page.getByTestId('uq-explicit-flag').check();
  assert.ok((await page.getByRole('alert').innerText()).includes('Invalid quantiles'));
  assert.equal(await page.getByRole('button').count(), 0);
  // Bundled font failure must be visible and retryable, not a success download.
  await page.goto(base); await page.getByTestId('uq-explicit-flag').check();
  await page.route('**/DejaVuSans.ttf', route => route.fulfill({ status: 503, body: 'unavailable' }));
  await page.getByRole('button').click(); await page.getByRole('alert').waitFor();
  assert.ok((await page.getByRole('alert').innerText()).includes('PDF export failed'));
  assert.equal(await page.getByRole('button').isEnabled(), true);
  await page.unroute('**/DejaVuSans.ttf');
  // In-flight export belongs to its result: replacing props on the SAME component must cancel it.
  for(const metric of ['energy','lcoe','npv']){
    await page.goto(metric==='energy'?base:`${base}/?metric=${metric}`);
    await page.getByTestId(metric==='energy'?'uq-explicit-flag':`uq-${metric}-flag`).check();
    let release!:()=>void;let requested!:()=>void;
    const blocked=new Promise<void>(resolve=>release=resolve),seen=new Promise<void>(resolve=>requested=resolve);
    await page.route('**/DejaVuSans.ttf',async route=>{requested();await blocked;await route.continue();});
    await page.getByRole('button').click();await seen;
    await page.evaluate(()=>{(window as any).replaceFixture();});
    await page.getByText(/NEW-RESULT/).waitFor();
    const staleDownload=page.waitForEvent('download',{timeout:1500}).then(()=>true,()=>false);
    release();assert.equal(await staleDownload,false,'stale PDF downloaded after result replacement');
    await page.unroute('**/DejaVuSans.ttf');
    const fresh=page.waitForEvent('download');await page.getByRole('button').click();await fresh;
  }
  // Real FinancialTab and actual legacy engine, not a hand-made unit fixture.
  await page.goto(`${base}/?full=1`);
  await page.getByRole('button', {name:'Run LHS UQ Simulation',exact:true}).click();
  await page.getByTestId('uq-explicit-flag').check();
  assert.ok((await page.getByTestId('uq-explicit-result').innerText()).includes('MWh/year'));
  for (const metric of ['lcoe','npv']) {
    const flag=page.getByTestId(`uq-${metric}-flag`);
    assert.equal(await flag.isChecked(),true); await flag.uncheck(); await flag.check();
    const panel=page.getByTestId(`financial-${metric}-quantiles`);
    assert.ok((await panel.innerText()).includes(metric==='lcoe'?'Adverse: higher cost, q90':'Adverse: lower NPV, q10'));
    const waiting=page.waitForEvent('download');await panel.getByRole('button').click();
    assert.equal((await waiting).suggestedFilename(),`financial-${metric}-quantiles.pdf`);
    await flag.uncheck();assert.equal(await page.getByTestId(`uq-${metric}-result`).count(),0);
  }
  const pricingInput = page.locator('input[type="number"]').first();
  await pricingInput.fill('0.31'); await pricingInput.blur();
  await page.getByTestId('financial-energy-quantiles').waitFor({state:'hidden'});
  assert.deepEqual(errors, []);
  console.log('PASS UQ-002 Chromium: real React toggle fa/en, legacy fallback, actual PDF downloads, invalid data and font-error retry');
} finally { await browser?.close(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
