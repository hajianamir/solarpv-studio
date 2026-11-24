import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";
const port = 5199;
const child = spawn(process.execPath, ["--import", "tsx", "server.ts"], {
  env: {
    ...process.env,
    PORT: String(port),
    NODE_ENV: "production",
    REAL_INTERNET: "false",
    VITE_REAL_INTERNET: "false",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
child.stdout.on("data", (x) => (logs += x));
child.stderr.on("data", (x) => (logs += x));
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  const base = `http://127.0.0.1:${port}`,
    deadline = Date.now() + 45000;
  while (true) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) break;
    } catch {}
    if (Date.now() > deadline || child.exitCode !== null) throw new Error(logs);
    await new Promise((r) => setTimeout(r, 200));
  }
  let executablePath: string | undefined;
  if (process.platform === "linux") {
    process.env.AWS_EXECUTION_ENV ??= "AWS_Lambda_nodejs20.x";
    executablePath = await (
      await import("@sparticuz/chromium")
    ).default.executablePath();
  }
  browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  const page = await browser.newPage({ acceptDownloads: true });
  await page.route("https://**/*", (r) => r.abort());
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  const tab = async (name: string) =>
    page
      .getByTestId(`workflow-tab-${name}`)
      .locator(":visible")
      .first()
      .click();
  await tab("climate");
  await page
    .getByRole("button", {
      name: /Edit Climate Parameters|ویرایش پارامترهای اقلیمی/,
    })
    .click();
  await page.locator("#climate-latitude-input").fill("32.2");
  await page.locator("#climate-longitude-input").fill("-110.9");
  await page
    .getByRole("button", {
      name: /Apply Custom Parameters|اعمال پارامترهای سفارشی/,
    })
    .click();
  const panel = page.getByTestId("operational-energy-panel"),
    down = page.waitForEvent("download");
  await panel
    .getByRole("button", { name: "Download operational context", exact: true })
    .click();
  const path = await (await down).path();
  assert.ok(path);
  const context = JSON.parse(await readFile(path, "utf8"));
  const run = spawnSync(
    process.env.PVLIB_PYTHON ?? "python",
    [
      "-c",
      `import json,sys\nfrom services.pvlib_study.worker import run_study\nc=json.loads(sys.stdin.read());r=json.load(open('.cache/study-evidence/operational/annual-direct.json'))['request'];r['system']['arrayPdc0W']=c['dcCapacityKwp']*1000;r['system']['inverterPdc0W']=c['inverterCapacityKw']*1000/r['system']['inverterEtaNom'];print(json.dumps(run_study(r)))`,
    ],
    {
      input: JSON.stringify(context),
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      timeout: 120000,
    },
  );
  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout);
  await panel
    .getByLabel("Import operational annual results")
    .setInputFiles({
      name: "annual-synthetic.json",
      mimeType: "application/json",
      buffer: Buffer.from(run.stdout),
    });
  await panel
    .getByLabel("Operational acknowledgement")
    .fill(
      "SYNTHETIC browser software test only; source assumptions explicitly accepted",
    );
  await panel
    .getByRole("button", { name: "Use validated annual energy", exact: true })
    .click();
  await panel.getByTestId("operational-energy-active").waitFor();
  const archiveDownload = page.waitForEvent("download");
  await panel
    .getByRole("button", {
      name: "Download portable operational study",
      exact: true,
    })
    .click();
  const archivePath = await (await archiveDownload).path();
  assert.ok(archivePath);
  const archive = JSON.parse(await readFile(archivePath, "utf8"));
  assert.match(archive.id, /^[a-f0-9]{64}$/);
  await panel
    .getByRole("button", { name: "Use screening energy", exact: true })
    .click();
  await panel
    .getByTestId("operational-energy-active")
    .waitFor({ state: "hidden" });
  await panel
    .getByLabel("Import portable operational study")
    .setInputFiles({
      name: "portable.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(archive)),
    });
  await panel.getByTestId("operational-energy-active").waitFor();
  await page.keyboard.press("Control+s");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("solarpv_project_save")!),
  );
  assert.equal(saved.operationalStudyId, archive.id);
  await page.reload();
  await tab("climate");
  page.on("dialog", (dialog) => void dialog.accept());
  await page
    .getByTitle(
      /دانلود \/ بارگذاری فایل JSON پروژه|Export \/ Import Project JSON/,
    )
    .click();
  await page
    .getByRole("button", {
      name: /بازیابی آخرین ذخیرهٔ محلی|Restore last local save/,
    })
    .click();
  await panel.getByTestId("operational-energy-active").waitFor();
  await page.keyboard.press("Control+e");
  const report = page.getByTestId("operational-report");
  await report.waitFor();
  assert.ok(
    (await report.innerText()).includes(String(archive.receipt.exportKwh)),
  );
  for (const name of ["HTML", "Word", "Excel", "JSON with evidence"]) {
    const download = page.waitForEvent("download");
    await report
      .getByRole("button", {
        name: `Download operational ${name}`,
        exact: true,
      })
      .click();
    const file = await (await download).path();
    assert.ok(file);
    const data = await readFile(file);
    assert.ok(data.length > 100);
    if (name === "Word" || name === "Excel")
      assert.equal(data.subarray(0, 2).toString(), "PK");
    if (name === "JSON with evidence") {
      const parsed = JSON.parse(data.toString());
      assert.equal(parsed.study.id, archive.id);
      assert.ok(
        Math.abs(parsed.receipt.exportKwh - result.summary.acWh / 1000) < 1e-5,
      );
    }
  }
  await page.evaluate(() => {
    const original = window.open;
    window.open = function (...args: Parameters<typeof window.open>) {
      const w = original.apply(window, args);
      if (w)
        w.print = () => {
          w.document.body.dataset.printRequested = "true";
        };
      return w;
    };
  });
  const popupEvent = page.waitForEvent("popup");
  await report
    .getByRole("button", {
      name: "Print operational report / PDF",
      exact: true,
    })
    .click();
  const popup = await popupEvent;
  assert.ok(
    (await popup.locator("body").innerText()).includes(
      archive.receipt.sourceSha256,
    ),
  );
  assert.equal(
    await popup.locator("body").getAttribute("data-print-requested"),
    "true",
  );
  await popup.close();
  await report
    .getByRole("button", { name: "Close operational report", exact: true })
    .click();
  await tab("financial");
  await page.getByTestId("financial-analysis").waitFor();
  assert.equal(
    Number(
      await page
        .getByTestId("financial-analysis")
        .getAttribute("data-annual-energy-kwh"),
    ),
    Math.round(result.summary.acWh / 1000),
  );
  await page
    .getByRole("button", { name: "Return to screening", exact: true })
    .click();
  assert.ok(
    (await page.getByTestId("active-energy-source").innerText()).includes(
      "screening waterfall",
    ),
  );
  assert.equal(
    await page.getByRole("dialog").count(),
    0,
    "Blocked report request must not remain queued after reset",
  );
  assert.deepEqual(errors, []);
  await tab("climate");
  await panel
    .getByLabel("Import operational annual results")
    .setInputFiles({
      name: "annual-synthetic.json",
      mimeType: "application/json",
      buffer: Buffer.from(run.stdout),
    });
  await panel
    .getByLabel("Operational acknowledgement")
    .fill("SYNTHETIC site invalidation gate acceptance");
  await panel
    .getByRole("button", { name: "Use validated annual energy", exact: true })
    .click();
  await panel.getByTestId("operational-energy-active").waitFor();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("solarpv-operational-studies", 1);
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction("documents", "readwrite");
          tx.objectStore("documents").clear();
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      }),
  );
  await page.reload();
  await tab("climate");
  await page
    .getByTitle(
      /دانلود \/ بارگذاری فایل JSON پروژه|Export \/ Import Project JSON/,
    )
    .click();
  await page
    .getByRole("button", {
      name: /بازیابی آخرین ذخیرهٔ محلی|Restore last local save/,
    })
    .click();
  await page
    .getByText(/Saved operational evidence missing in this browser/)
    .waitFor();
  assert.equal(await panel.getByTestId("operational-energy-active").count(), 0);
  assert.ok(
    (await page.getByTestId("active-energy-source").innerText()).includes(
      "screening waterfall",
    ),
  );
  await panel
    .getByLabel("Import portable operational study")
    .setInputFiles({
      name: "recovery.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(archive)),
    });
  await panel.getByTestId("operational-energy-active").waitFor();
  await page
    .getByRole("button", {
      name: /Edit Climate Parameters|ویرایش پارامترهای اقلیمی/,
    })
    .click();
  await page.locator("#climate-longitude-input").fill("-110.8");
  await page
    .getByRole("button", {
      name: /Apply Custom Parameters|اعمال پارامترهای سفارشی/,
    })
    .click();
  await panel
    .getByTestId("operational-energy-active")
    .waitFor({ state: "hidden" });
  assert.ok(
    (await page.getByTestId("active-energy-source").innerText()).includes(
      "screening waterfall",
    ),
  );
  console.log(
    "PASS App Chromium: annual adoption, portable archive, reload + project restore, finance source, HTML/Word/Excel/JSON readback, print document, reset, site invalidation",
  );
} finally {
  await browser?.close();
  child.kill("SIGTERM");
}
