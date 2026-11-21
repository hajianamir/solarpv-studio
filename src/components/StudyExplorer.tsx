import { useMemo, useState } from "react";
import type { StudyResult } from "../studies/studyContract";
import {
  exploreStudy,
  dailyExplorerCsv,
  selectedSamplesCsv,
  explorerHtml,
  type ExplorerOptions,
} from "../studies/studyExplorer";
function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** Local view settings only. Mounted anew for each result; never changes execution inputs. */
export function StudyExplorer({
  result,
  en,
}: {
  result: StudyResult;
  en: boolean;
}) {
  const dt = result.request.weather.intervalMinutes * 60000;
  const [start, setStart] = useState(
    new Date(
      Date.parse(result.request.weather.records[0].timestamp) - dt,
    ).toISOString(),
  );
  const [end, setEnd] = useState(
    new Date(
      Date.parse(result.request.weather.records.at(-1)!.timestamp),
    ).toISOString(),
  );
  const [threshold, setThreshold] = useState("");
  const calculated = useMemo(() => {
    try {
      if (
        threshold.trim() &&
        !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(threshold.trim())
      )
        throw new Error("Explicit finite temperature threshold required");
      const options: ExplorerOptions = {
        range: { startUtc: start, endUtc: end },
        ...(threshold.trim()
          ? { temperatureThresholdC: Number(threshold) }
          : {}),
      };
      return { options, data: exploreStudy(result, options), error: null };
    } catch (e) {
      return {
        options: null,
        data: null,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }, [result, start, end, threshold]);
  const d = calculated.data;
  return (
    <section
      data-testid="study-result-explorer"
      className="border border-slate-600 rounded p-3 text-xs space-y-2"
    >
      <h3>
        {en
          ? "Result explorer — ten read-only review tools"
          : "بازبینی نتیجه — ده ابزار تحلیلیِ بدون تغییر داده"}
      </h3>
      <p>
        {en
          ? "Whole interval means selected by midpoint in [start,end). No prorating, new execution, physical control/protection or annualization. Local view settings reset on restore/result change."
          : "انتخاب کل بازه با میانه در [آغاز، پایان). بدون تسهیم بازه، اجرای تازه، کنترل/حفاظت فیزیکی یا سالانه‌سازی. تنظیم نمایش با نتیجهٔ تازه یا بازیابی بازنشانی می‌شود."}
      </p>
      <label>
        {en
          ? "Selection start (explicit Z/offset)"
          : "آغاز انتخاب (Z/offset صریح)"}
        <input
          aria-label="Explorer start UTC"
          className="bg-slate-900 block w-full"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </label>
      <label>
        {en ? "Selection end (exclusive)" : "پایان انتخاب (خارج از انتخاب)"}
        <input
          aria-label="Explorer end UTC"
          className="bg-slate-900 block w-full"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </label>
      <label>
        {en
          ? "Optional temperature threshold (°C); blank = unavailable"
          : "آستانهٔ اختیاری دما (°C)؛ خالی = ناموجود"}
        <input
          aria-label="Explorer temperature threshold"
          className="bg-slate-900"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
        />
      </label>
      {calculated.error && <p role="alert">{calculated.error}</p>}
      {d && (
        <>
          <p data-testid="explorer-selection">
            {d.selection.status} · {d.selection.intervals} intervals ·{" "}
            {d.selection.representedHours} h · {d.selection.startUtc} →{" "}
            {d.selection.endUtc}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              data-testid="download-explorer-json"
              onClick={() =>
                download(
                  "pvlib-study-explorer.json",
                  JSON.stringify(d, null, 2),
                  "application/json",
                )
              }
            >
              JSON — {en ? "selected diagnostics" : "بررسی انتخاب"}
            </button>
            <button
              type="button"
              data-testid="download-explorer-daily"
              onClick={() =>
                download(
                  "pvlib-study-daily.csv",
                  dailyExplorerCsv(result, calculated.options!),
                  "text/csv;charset=utf-8",
                )
              }
            >
              {en ? "Daily CSV" : "CSV روزانه"}
            </button>
            <button
              type="button"
              data-testid="download-explorer-samples"
              onClick={() =>
                download(
                  "pvlib-study-selected-samples.csv",
                  selectedSamplesCsv(result, calculated.options!),
                  "text/csv;charset=utf-8",
                )
              }
            >
              {en ? "Selected sample CSV" : "CSV نمونه‌های انتخابی"}
            </button>
            <button
              type="button"
              data-testid="download-explorer-report"
              onClick={() =>
                download(
                  "pvlib-study-explorer.html",
                  explorerHtml(result, calculated.options!),
                  "text/html;charset=utf-8",
                )
              }
            >
              {en ? "Selected review HTML" : "HTML بررسی انتخاب"}
            </button>
          </div>
          <details data-testid="explorer-daily">
            <summary>
              {en
                ? "1–2. Daily UTC energy / selected period (first 31; full CSV)"
                : "۱–۲. انرژی روزانه UTC / دوره انتخابی (۳۱روز نخست؛ CSV کامل)"}
            </summary>
            <pre dir="ltr" className="whitespace-pre-wrap">
              {JSON.stringify(
                { totals: d.totalsWhOrWhm2, daily: d.daily.slice(0, 31) },
                null,
                2,
              )}
            </pre>
          </details>
          {(
            [
              [
                "peaks",
                "3. Peak interval-mean powers / اوج متوسط توان بازه",
                d.peaks,
              ],
              [
                "temperature",
                "4. Modeled cell temperatures / دمای مدل‌شده سلول",
                d.temperature,
              ],
              [
                "export-cap",
                "5. Export-cap events (not inverter clipping) / رخداد محدودیت صادرات",
                d.exportCap,
              ],
              [
                "mppt",
                "6. Ideal static MPPT states / وضعیت MPPT ایستا",
                d.mppt,
              ],
              [
                "tracker",
                "7. Ideal active-step geometry (not actuator wear/stow) / حرکت هندسی، نه استهلاک یا stow",
                d.tracker,
              ],
              [
                "environment",
                "8. Applied environmental schedules / برنامه‌های محیطی اعمال‌شده",
                d.environment,
              ],
              [
                "balances",
                "9. Arithmetic energy bookkeeping / تراز حسابی انرژی",
                d.balances,
              ],
            ] as const
          ).map(([key, title, value]) => (
            <details key={key} data-testid={`explorer-${key}`}>
              <summary>{title}</summary>
              <pre dir="ltr" className="whitespace-pre-wrap break-all">
                {JSON.stringify(value, null, 2)}
              </pre>
            </details>
          ))}
          <p>
            {en
              ? "10. Scenario input differences appear when comparing two compatible saved/current results in the library below. Missing/disabled features remain unavailable; no data generated."
              : "۱۰. تفاوت ورودی سناریوها هنگام مقایسه دو نتیجه سازگار در کتابخانه زیر نمایان می‌شود. قابلیت غیرفعال ناموجود می‌ماند؛ داده تولید نمی‌شود."}
          </p>
        </>
      )}
    </section>
  );
}
