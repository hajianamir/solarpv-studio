import assert from 'node:assert/strict';
import { createServer as createViteServer } from 'vite';
import { chromium as playwrightChromium } from 'playwright-core';

// Real browser tabs; storage-event delivery is deliberately delayed so that
// locking must reload storage rather than trusting each tab's stale cache.
if (process.platform === 'linux') process.env.AWS_EXECUTION_ENV ??= 'AWS_Lambda_nodejs20.x';
process.env.VITE_REAL_INTERNET = 'false';
process.env.REAL_INTERNET = 'false';
const sparticuz = (await import('@sparticuz/chromium')).default;
const vite = await createViteServer({
  root: process.cwd(),
  server: { host: '127.0.0.1', port: 0, strictPort: false, allowedHosts: true },
  logLevel: 'error',
});
let browser: Awaited<ReturnType<typeof playwrightChromium.launch>> | undefined;

try {
  await vite.listen();
  const address = vite.httpServer?.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  browser = await playwrightChromium.launch({ executablePath: await sparticuz.executablePath(), args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'], headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1600, height: 1000 } });
  await context.route('https://**/*', (route) => route.abort());
  await context.route('**/api/v1/gateway/**', (route) => route.abort());
  const a = await context.newPage();
  const b = await context.newPage();
  await context.addInitScript(() => {
    const original = window.addEventListener.bind(window);
    window.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
      if (type === 'storage') {
        return original(type, (event: Event) => setTimeout(() => {
          if (typeof listener === 'function') listener.call(window, event);
          else listener.handleEvent(event);
        }, 2000), options);
      }
      return original(type, listener, options);
    }) as typeof window.addEventListener;
  });
  for (const page of [a, b]) {
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('workflow-tab-climate').first().waitFor({ timeout: 20000 });
    assert.equal(await page.evaluate(() => window.isSecureContext && Boolean(navigator.locks)), true);
  }
  const fixtures = await a.evaluate(async () => {
    const dataPath = '/src/engine/equipmentCatalogData.ts';
    const data = await import(/* @vite-ignore */ dataPath);
    return {
      old: { ...data.CATALOG_MODULES[0], id: 'custom-mod-pr28-legacy-existing', modelName: 'Existing legacy item' },
      module: { ...data.CATALOG_MODULES[0], id: 'custom-mod-pr28-concurrent', modelName: 'Concurrent wrapper module' },
      batch: { ...data.CATALOG_MODULES[0], id: 'custom-mod-pr28-batch', modelName: 'Concurrent batch module' },
      normal: { ...data.CATALOG_MODULES[0], id: 'custom-mod-pr28-normal', modelName: 'Concurrent direct module' },
      after: { ...data.CATALOG_MODULES[0], id: 'custom-mod-pr28-after-write', modelName: 'Injected partial batch' },
      inverter: { ...data.CATALOG_INVERTERS[0], id: 'custom-inv-pr28-concurrent', modelName: 'Concurrent inverter' },
      battery: { ...data.CATALOG_BATTERIES[0], id: 'custom-bat-pr28-concurrent', modelName: 'Concurrent battery' },
    };
  });
  await a.evaluate((old) => {
    localStorage.setItem('solarpv_custom_modules', JSON.stringify([old]));
  }, fixtures.old);
  const unlocked = await b.evaluate(async (mod) => {
    const repoPath = '/src/engine/catalogRepository.ts';
    const { CatalogRepository } = await import(/* @vite-ignore */ repoPath);
    return CatalogRepository.getInstance().saveCustomModule(mod);
  }, fixtures.module);
  assert.equal(unlocked.success, false);
  const concurrent = await Promise.all([
    a.evaluate(async (mod) => {
      const dataPath = '/src/engine/equipmentCatalogData.ts';
      const data = await import(/* @vite-ignore */ dataPath);
      return await data.saveCustomModule(mod);
    }, fixtures.module),
    b.evaluate(async (inverter) => {
      const repoPath = '/src/engine/catalogRepository.ts';
      const { CatalogRepository } = await import(/* @vite-ignore */ repoPath);
      const repo = CatalogRepository.getInstance();
      return await repo.withCrossTabWriteLock(() => repo.saveCustomInverter(inverter));
    }, fixtures.inverter),
  ]);
  assert.ok(concurrent.every((result) => result.success));
  let durable = await a.evaluate(() => JSON.parse(localStorage.getItem('solarpv_custom_catalog_v4') ?? 'null'));
  assert.ok(durable.custom.modules.some((item: { id: string }) => item.id === fixtures.old.id));
  assert.ok(durable.custom.modules.some((item: { id: string }) => item.id === fixtures.module.id));
  assert.ok(durable.custom.inverters.some((item: { id: string }) => item.id === fixtures.inverter.id));
  console.log('[PASS] Delayed storage events: an unlocked write fails; concurrent legacy-helper and repository saves preserve migrated legacy records in v4.');

  const batchRace = await Promise.all([
    a.evaluate(async (item) => {
      const repoPath = '/src/engine/catalogRepository.ts';
      const { CatalogRepository } = await import(/* @vite-ignore */ repoPath);
      const repo = CatalogRepository.getInstance();
      return await repo.withCrossTabWriteLock(() => repo.restoreCustomEquipmentSnapshots({ modules: [item] }));
    }, fixtures.batch),
    b.evaluate(async (item) => {
      const repoPath = '/src/engine/catalogRepository.ts';
      const { CatalogRepository } = await import(/* @vite-ignore */ repoPath);
      const repo = CatalogRepository.getInstance();
      return await repo.withCrossTabWriteLock(() => repo.saveCustomModule(item));
    }, fixtures.normal),
  ]);
  assert.ok(batchRace.every((result) => result.success));
  durable = await a.evaluate(() => JSON.parse(localStorage.getItem('solarpv_custom_catalog_v4') ?? 'null'));
  for (const item of [fixtures.old, fixtures.module, fixtures.batch, fixtures.normal]) {
    assert.ok(durable.custom.modules.some((record: { id: string }) => record.id === item.id), `lost ${item.id}`);
  }
  console.log('[PASS] Batch restore racing a normal save merges both under the real browser cross-tab lock.');

  const expected = durable.custom.modules.find((item: { id: string }) => item.id === fixtures.batch.id);
  const update = (page: typeof a, label: string) => page.evaluate(async ({ previous, name }) => {
    const repoPath = '/src/engine/catalogRepository.ts';
    const { CatalogRepository } = await import(/* @vite-ignore */ repoPath);
    const repo = CatalogRepository.getInstance();
    return await repo.withCrossTabWriteLock(() => repo.saveCustomModule({ ...previous, modelName: name }, previous));
  }, { previous: expected, name: label });
  const updates = await Promise.all([update(a, 'Version A'), update(b, 'Version B')]);
  assert.equal(updates.filter((result) => result.success).length, 1);
  assert.equal(updates.filter((result) => !result.success).length, 1);
  assert.match(updates.find((result) => !result.success).errors.join(' '), /changed|exists/);
  const deleteStale = await b.evaluate(async (previous) => {
    const repoPath = '/src/engine/catalogRepository.ts';
    const { CatalogRepository } = await import(/* @vite-ignore */ repoPath);
    const repo = CatalogRepository.getInstance();
    return await repo.withCrossTabWriteLock(() => repo.deleteCustomModule(previous.id, previous));
  }, expected);
  assert.equal(deleteStale, false);
  const conflict = await b.evaluate(async (previous) => {
    const repoPath = '/src/engine/catalogRepository.ts';
    const { CatalogRepository } = await import(/* @vite-ignore */ repoPath);
    const repo = CatalogRepository.getInstance();
    return await repo.withCrossTabWriteLock(() => repo.restoreCustomEquipmentSnapshots({ modules: [previous] }));
  }, expected);
  assert.equal(conflict.success, false);
  assert.match(conflict.errors.join(' '), /conflicts/);
  await Promise.all([a.reload(), b.reload()]);
  durable = await a.evaluate(() => JSON.parse(localStorage.getItem('solarpv_custom_catalog_v4') ?? 'null'));
  const winner = durable.custom.modules.find((item: { id: string }) => item.id === fixtures.batch.id);
  assert.ok(winner.modelName === 'Version A' || winner.modelName === 'Version B');
  assert.ok(durable.custom.modules.some((item: { id: string }) => item.id === fixtures.normal.id));
  console.log('[PASS] Concurrent same-ID edits detect a stale expected record; stale delete and conflicting import fail, winner persists after reload.');

  // Conditional saves have the same compare/update/delete semantics for all
  // equipment types, including an update racing a deletion in another tab.
  for (const [kind, fixture] of [['module', fixtures.normal], ['inverter', fixtures.inverter], ['battery', fixtures.battery]] as const) {
    if (kind === 'battery') {
      const created = await a.evaluate(async (item) => {
        const repoPath = '/src/engine/catalogRepository.ts';
        const { CatalogRepository } = await import(/* @vite-ignore */ repoPath);
        const repo = CatalogRepository.getInstance();
        return await repo.withCrossTabWriteLock(() => repo.saveCustomBattery(item));
      }, fixture);
      assert.equal(created.success, true);
    }
    const collection = kind === 'module' ? 'modules' : kind === 'inverter' ? 'inverters' : 'batteries';
    const previous = await a.evaluate(({ list, id }) => JSON.parse(localStorage.getItem('solarpv_custom_catalog_v4') ?? 'null').custom[list].find((item: { id: string }) => item.id === id), { list: collection, id: fixture.id });
    const attempt = (page: typeof a, action: 'save' | 'delete', item: any, expectedItem: any) => page.evaluate(async ({ type, op, record, expectedRecord }) => {
      const repoPath = '/src/engine/catalogRepository.ts';
      const { CatalogRepository } = await import(/* @vite-ignore */ repoPath);
      const repo = CatalogRepository.getInstance();
      return await repo.withCrossTabWriteLock(() => {
        if (op === 'delete') {
          if (type === 'module') return repo.deleteCustomModule(record.id, expectedRecord);
          if (type === 'inverter') return repo.deleteCustomInverter(record.id, expectedRecord);
          return repo.deleteCustomBattery(record.id, expectedRecord);
        }
        if (type === 'module') return repo.saveCustomModule(record, expectedRecord);
        if (type === 'inverter') return repo.saveCustomInverter(record, expectedRecord);
        return repo.saveCustomBattery(record, expectedRecord);
      });
    }, { type: kind, op: action, record: item, expectedRecord: expectedItem });
    const raced = await Promise.all([
      attempt(a, 'save', { ...previous, modelName: `${kind} A` }, previous),
      attempt(b, 'save', { ...previous, modelName: `${kind} B` }, previous),
    ]);
    assert.equal(raced.filter((result: any) => result.success).length, 1, `${kind}: one update should win`);
    assert.equal(raced.filter((result: any) => !result.success).length, 1, `${kind}: stale update should fail`);
    const latest = await a.evaluate(({ list, id }) => JSON.parse(localStorage.getItem('solarpv_custom_catalog_v4') ?? 'null').custom[list].find((item: { id: string }) => item.id === id), { list: collection, id: fixture.id });
    // Even an idempotent-looking target is not success if an explicit expected
    // record is stale; mismatched IDs must not allocate an unrelated new item.
    const staleIdentical: any = await attempt(b, 'save', latest, previous);
    assert.equal(staleIdentical.success, false, `${kind}: stale expected record was ignored`);
    const mismatch: any = await attempt(b, 'save', { ...latest, id: `invalid-${kind}-id` }, latest);
    assert.equal(mismatch.success, false, `${kind}: mismatched update ID`);
    assert.equal(await attempt(b, 'delete', latest, previous), false, `${kind}: stale deletion`);
    assert.equal(await attempt(b, 'delete', latest, latest), true, `${kind}: valid deletion`);
    const afterDelete: any = await attempt(a, 'save', { ...latest, modelName: 'must not resurrect' }, latest);
    assert.equal(afterDelete.success, false, `${kind}: deleted record was resurrected`);
    assert.match(afterDelete.errors.join(' '), /deleted|missing/);
    await Promise.all([a.reload(), b.reload()]);
    const saved = await a.evaluate(() => JSON.parse(localStorage.getItem('solarpv_custom_catalog_v4') ?? 'null'));
    assert.ok(!saved.custom[collection].some((item: { id: string }) => item.id === fixture.id), `${kind}: deleted record reappeared after reload`);
  }
  console.log('[PASS] Module, inverter and battery conditional updates detect competing edits, mismatched IDs, stale deletes and update-after-delete without resurrection.');

  const afterWrite = await a.evaluate(async (item) => {
    const repoPath = '/src/engine/catalogRepository.ts';
    const { CatalogRepository } = await import(/* @vite-ignore */ repoPath);
    const repo = CatalogRepository.getInstance();
    const before = localStorage.getItem('solarpv_custom_catalog_v4');
    const original = Storage.prototype.setItem;
    let hits = 0;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === 'solarpv_custom_catalog_v4') {
        hits++;
        if (hits === 1) original.call(this, key, value);
        throw new DOMException('Synthetic post-write/rollback failure', 'QuotaExceededError');
      }
      return original.call(this, key, value);
    };
    try {
      const result = await repo.withCrossTabWriteLock(() => repo.restoreCustomEquipmentSnapshots({ modules: [item] }));
      return { result, before, after: localStorage.getItem('solarpv_custom_catalog_v4'), hits };
    } finally { Storage.prototype.setItem = original; }
  }, fixtures.after);
  assert.equal(afterWrite.result.success, false);
  assert.ok(afterWrite.hits >= 2);
  assert.notEqual(afterWrite.before, afterWrite.after);
  assert.match(afterWrite.result.errors.join(' '), /rollback was incomplete/);
  assert.doesNotMatch(afterWrite.result.errors.join(' '), /verified unchanged/);
  await a.reload();
  durable = await a.evaluate(() => JSON.parse(localStorage.getItem('solarpv_custom_catalog_v4') ?? 'null'));
  assert.ok(durable.custom.modules.some((item: { id: string }) => item.id === fixtures.after.id));
  console.log('[PASS] Injected nonconforming write-then-throw and failed rollback are reported incomplete; the actual partial durable write is visible after reload.');

  const beforeNoLock = await b.evaluate(() => localStorage.getItem('solarpv_custom_catalog_v4'));
  const noLock = await b.evaluate(async (item) => {
    Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true });
    const dataPath = '/src/engine/equipmentCatalogData.ts';
    const data = await import(/* @vite-ignore */ dataPath);
    return await data.saveCustomModule({ ...item, id: 'custom-mod-pr28-no-lock' });
  }, fixtures.module);
  assert.equal(noLock.success, false);
  assert.equal(await b.evaluate(() => localStorage.getItem('solarpv_custom_catalog_v4')), beforeNoLock);
  console.log('[PASS] Legacy save helper fails closed when Web Locks is unavailable, with no durable write.');
  await context.close();
  console.log('PR #28 catalog cross-tab race regressions: PASS (real local Chromium, synthetic storage failures).');
} catch (error) {
  console.error('[FAIL] PR #28 catalog cross-tab race regressions:', error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await vite.close();
}
