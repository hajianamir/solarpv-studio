import { readbackPdf } from "./pdf-readback";
import ExcelJS from "exceljs";
import { unzipSync } from "fflate";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium, webkit, type Browser } from "playwright-core";
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
let browser: Browser | undefined;
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
  const engine = process.env.BROWSER_ENGINE ?? "chromium";
  if (!["chromium", "webkit"].includes(engine))
    throw new Error("Unsupported BROWSER_ENGINE");
  if (
    process.platform === "linux" &&
    engine === "chromium" &&
    !process.env.PLAYWRIGHT_INSTALLED
  ) {
    process.env.AWS_EXECUTION_ENV ??= "AWS_Lambda_nodejs20.x";
    executablePath = await (
      await import("@sparticuz/chromium")
    ).default.executablePath();
  }
  browser = await (engine === "webkit" ? webkit : chromium).launch({
    headless: true,
    executablePath,
    args:
      engine === "chromium"
        ? ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
        : [],
  });
  const page = await browser.newPage({ acceptDownloads: true });
  await page.route("https://**/*", (r) => r.abort());
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mkdir(".cache/platform-evidence", { recursive: true });
  await mkdir(".cache/pdf-evidence", { recursive: true });
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
  page.on("dialog", (dialog) => void dialog.accept());
  for (const mode of ["powerplant", "ongrid", "offgrid"] as const) {
    if (mode !== "powerplant")
      await page
        .getByRole("button", {
          name: mode === "ongrid" ? "On-Grid" : "Off-Grid",
          exact: true,
        })
        .click();
    await tab("climate");
    const panel = page.getByTestId("operational-energy-panel");
    const down = page.waitForEvent("download");
    await panel
      .getByRole("button", {
        name: "Download operational context",
        exact: true,
      })
      .click();
    const path = await (await down).path();
    assert.ok(path);
    const context = JSON.parse(await readFile(path, "utf8"));
    assert.equal(context.mode, mode);
    const run = spawnSync(
      process.env.PVLIB_PYTHON ?? "python",
      [
        "-c",
        `import json,sys\nfrom services.pvlib_study.worker import run_study\nc=json.loads(sys.stdin.read());r=json.load(open('.cache/study-evidence/operational/annual-direct.json'))['request'];r['site']['latitude']=c['latitude'];r['site']['longitude']=c['longitude'];r['system']['arrayPdc0W']=c['dcCapacityKwp']*1000;r['system']['inverterPdc0W']=c['inverterCapacityKw']*1000/r['system']['inverterEtaNom'];print(json.dumps(run_study(r)))`,
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

    const evidence = {
      schemaVersion: "operating-study-v1",
      pvResults: result,
      plan: {
        schemaVersion: "operating-dispatch-v1",
        mode,
        source: "Synthetic browser operating schedule, not field data",
        intervalMinutes: result.request.weather.intervalMinutes,
        battery: {
          capacityKwh: context.batteryCapacityKwh ?? 0,
          minSocFraction: 0.1,
          initialSocFraction: 0.1,
          maxChargeKw: 10,
          maxDischargeKw: 10,
          chargeEfficiency: 0.9,
          dischargeEfficiency: 0.9,
        },
        records: result.samples.map((r: any) => ({
          timestamp: r.timestamp,
          loadW: mode === "powerplant" ? 0 : 500,
          gridAvailable: mode !== "offgrid",
          exportLimitW: 1e9,
        })),
      },
    };
    if (process.env.TEST_ADVANCED !== "false") {
      const advanced = page.getByTestId("advanced-dispatch-panel");
      const originalSource = await page
        .getByTestId("active-energy-source")
        .innerText();
      const request = {
        schemaVersion: "advanced-study-v1",
        pvResults: result,
        plan: {
          schemaVersion: "advanced-dispatch-v1",
          operatingPlan: evidence.plan,
          controller: "optimal-discrete",
          optimizer: {
            socStates: 3,
            terminalSocFraction: 0.1,
            batteryWearTomanPerKwh: 5,
            unmetPenaltyTomanPerKwh: 100000,
          },
          diesel:
            mode === "offgrid"
              ? {
                  source: "Synthetic browser diesel curve, not field data",
                  ratedKw: 2,
                  minLoadFraction: 0.1,
                  interceptLitersPerHour: 0.2,
                  slopeLitersPerKwh: 0.25,
                  fuelTomanPerLiter: 100,
                  startCostToman: 10,
                  initiallyOn: false,
                }
              : null,
          aging:
            mode === "powerplant"
              ? null
              : {
                  source:
                    "Synthetic browser lifetime coefficients, not calibrated",
                  initialSoh: 1,
                  endOfLifeSoh: 0.8,
                  calendarLossFractionPerYear: 0.01,
                  lossFractionPerEfc: 0.00001,
                  projectionYears: 25,
                },
          economics: result.samples.map((r: any) => ({
            timestamp: r.timestamp,
            importTomanPerKwh: 200,
            exportTomanPerKwh: 50,
            dieselAvailable: mode === "offgrid",
          })),
        },
      };
      await advanced
        .getByLabel("Import advanced operating study")
        .setInputFiles({
          name: "advanced-synthetic.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(request)),
        });
      await advanced
        .getByTestId("advanced-dispatch-result")
        .waitFor({ timeout: 60000 });
      assert.equal(
        await page.getByTestId("active-energy-source").innerText(),
        originalSource,
        "Advanced independent analysis must not covertly change finance",
      );
      const event = page.waitForEvent("download");
      await advanced
        .getByRole("button", {
          name: "Download advanced ledger JSON",
          exact: true,
        })
        .click();
      const path = await (await event).path();
      assert.ok(path);
      const value = JSON.parse(await readFile(path, "utf8"));
      assert.equal(
        value.result.optimality,
        "global_optimum_on_declared_lattice_only",
      );
      assert.equal(value.result.samples.length, 8760);
      if (mode === "offgrid") {
        assert.ok(value.result.fuelLiters > 0);
        assert.ok(value.result.batteryLife);
        assert.equal(value.result.gridImportKwh, 0);
      }
      const pdfEvent = page.waitForEvent("download");
      await advanced
        .getByRole("button", { name: "Download advanced PDF", exact: true })
        .click();
      const pdfPath = await (await pdfEvent).path();
      assert.ok(pdfPath);
      const pdfBytes = await readFile(pdfPath);
      await writeFile(
        `.cache/pdf-evidence/${engine}-${mode}-advanced.pdf`,
        pdfBytes,
      );
      const check = await readbackPdf(pdfBytes);
      assert.ok(check.compact.includes(value.sourceSha256));
      assert.ok(check.text.includes(mode));
      // Re-import result archives always replays their request; summaries cannot become authority.
      value.result.objectiveToman = -999;
      await advanced
        .getByLabel("Import advanced operating study")
        .setInputFiles({
          name: "replay.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(value)),
        });
      await advanced
        .getByTestId("advanced-dispatch-result")
        .waitFor({ timeout: 60000 });
      assert.ok(
        !(
          await advanced.getByTestId("advanced-dispatch-result").innerText()
        ).includes("-999"),
      );
    }
    await panel.getByLabel("Import operational annual results").setInputFiles({
      name: "synthetic-mode.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(evidence)),
    });
    await panel
      .getByLabel("Operational acknowledgement")
      .fill("Synthetic all-mode browser acceptance");
    await panel
      .getByRole("button", { name: "Use validated annual energy", exact: true })
      .click();
    await panel.getByTestId("operational-energy-active").waitFor();
    await page.keyboard.press("Control+e");
    const report = page.getByTestId("operational-report");
    await report.waitFor();
    const download = page.waitForEvent("download");
    await report
      .getByRole("button", {
        name: "Download operational JSON with evidence",
        exact: true,
      })
      .click();
    const reportPath = await (await download).path();
    assert.ok(reportPath);
    const doc = JSON.parse(await readFile(reportPath, "utf8"));
    assert.equal(doc.receipt.context.mode, mode);
    assert.ok(doc.engineeringSnapshot.protection);
    assert.ok("structural" in doc.engineeringSnapshot);
    if (mode === "offgrid") {
      assert.equal(doc.receipt.exportKwh, 0);
      assert.equal(doc.receipt.importKwh, 0);
    }
    for (const kind of ["HTML", "Word", "Excel", "PDF"]) {
      const event = page.waitForEvent("download");
      await report
        .getByRole("button", {
          name: `Download operational ${kind}`,
          exact: true,
        })
        .click();
      const path = await (await event).path();
      assert.ok(path);
      const bytes = await readFile(path);
      if (kind === "PDF") {
        await writeFile(
          `.cache/pdf-evidence/${engine}-${mode}-operational.pdf`,
          bytes,
        );
        const check = await readbackPdf(bytes);
        assert.ok(check.compact.includes(doc.receipt.sourceSha256));
        assert.ok(check.text.includes(mode));
        assert.ok(check.text.includes("EPC design annex"));
        assert.ok(check.text.includes("engineering.protection"));
      }
      if (kind === "HTML") {
        const text = bytes.toString();
        assert.ok(text.includes("EPC design annex"));
        assert.ok(text.includes(mode));
      }
      if (kind === "Word") {
        const xml = new TextDecoder().decode(
          unzipSync(bytes)["word/document.xml"],
        );
        assert.ok(xml.includes("engineering.protection"));
        assert.ok(xml.includes(mode));
        assert.ok(xml.includes(doc.receipt.sourceSha256));
      }
      if (kind === "Excel") {
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.readFile(path);
        assert.ok(wb.getWorksheet("EPC design annex")!.rowCount > 100);
        const sheet = wb.getWorksheet("Source and financial summary")!;
        assert.ok(
          JSON.stringify(sheet.getSheetValues()).includes(
            doc.receipt.sourceSha256,
          ),
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
    assert.ok((await popup.locator("body").innerText()).includes(mode));
    assert.equal(
      await popup.locator("body").getAttribute("data-print-requested"),
      "true",
    );
    await popup.close();
    await report
      .getByRole("button", { name: "Close operational report", exact: true })
      .click();
    await tab("financial");
    assert.equal(
      Number(
        await page
          .getByTestId("financial-analysis")
          .getAttribute("data-annual-energy-kwh"),
      ),
      Math.round(doc.receipt.financeEnergyKwh),
    );
    await tab("climate");
    await page
      .getByTitle(
        /دانلود \/ بارگذاری فایل JSON پروژه|Export \/ Import Project JSON/,
      )
      .click();
    const bundleDownload = page.waitForEvent("download");
    await page
      .getByRole("button", { name: /دانلود پاکت JSON|Export Envelope/ })
      .click();
    const bundlePath = await (await bundleDownload).path();
    assert.ok(bundlePath);
    const bundle = await readFile(bundlePath);
    assert.equal(
      JSON.parse(bundle.toString()).format,
      "solarpv_operational_project",
    );
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const r = indexedDB.open("solarpv-operational-studies", 1);
          r.onsuccess = () => {
            const db = r.result,
              tx = db.transaction("documents", "readwrite");
            tx.objectStore("documents").clear();
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onabort = () => reject(tx.error);
          };
          r.onerror = () => reject(r.error);
        }),
    );
    await page.reload();
    await tab("climate");
    await page
      .locator('input[type=file][accept=".json"]')
      .first()
      .setInputFiles({
        name: "portable-project.json",
        mimeType: "application/json",
        buffer: bundle,
      });
    await panel.getByTestId("operational-energy-active").waitFor();
    const next = page.waitForEvent("download");
    await panel
      .getByRole("button", {
        name: "Download operational receipt",
        exact: true,
      })
      .click();
    const nextPath = await (await next).path();
    assert.ok(nextPath);
    assert.equal(
      JSON.parse(await readFile(nextPath, "utf8")).studyId,
      doc.study.id,
    );
    await page
      .getByRole("button", { name: "Return to screening", exact: true })
      .click();
    console.log(
      `PASS ${mode}: actual worker annual + explicit dispatch, finance, EPC annex, report evidence and portable project restore`,
    );
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `.cache/platform-evidence/${engine}-receipt.json`,
    JSON.stringify(
      {
        status: "PASS",
        platform: process.platform,
        arch: process.arch,
        node: process.version,
        engine,
        browserVersion: browser.version(),
        advanced: process.env.TEST_ADVANCED !== "false",
        modes: ["powerplant", "ongrid", "offgrid"],
        realPdfReadback: true,
        qualification: "Browser engine is not automatically native Safari",
      },
      null,
      2,
    ),
  );
} finally {
  await browser?.close();
  child.kill("SIGTERM");
}
