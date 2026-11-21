import React, { useEffect, useRef, useState, useCallback } from "react";
import type { OperationalContext } from "../studies/operationalEnergy";
import type { runAdvancedStudy } from "../studies/advancedStudy";
import { parseStudyJson } from "../studies/strictStudyJson";
import { stable } from "../studies/studyComparisonGate";
type Result = ReturnType<typeof runAdvancedStudy>;
export function AdvancedDispatchPanel({
  context,
}: {
  context: OperationalContext | null;
}) {
  const [result, setResult] = useState<Result | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const worker = useRef<Worker | null>(null),
    revision = useRef(0),
    key = stable(context);
  const cancel = useCallback(() => {
    revision.current++;
    worker.current?.terminate();
    worker.current = null;
    setBusy(false);
  }, []);
  useEffect(() => {
    cancel();
    setResult(null);
    setError("");
    return cancel;
  }, [key, cancel]);
  const download = (blob: Blob, name: string) => {
    const u = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = u;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  };
  const load = async (file: File) => {
    cancel();
    const version = revision.current;
    setResult(null);
    setError("");
    setBusy(true);
    try {
      if (!context) throw new Error("Project context required");
      if (file.size > 64 * 1024 * 1024)
        throw new Error("Maximum advanced import 64 MiB");
      const parsed = parseStudyJson(await file.text(), 64 * 1024 * 1024) as {
        schemaVersion?: string;
        request?: unknown;
      };
      if (version !== revision.current) return;
      const request =
        parsed.schemaVersion === "advanced-study-result-v1"
          ? parsed.request
          : parsed;
      const w = new Worker(
        new URL("../studies/advancedDispatch.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.current = w;
      w.onmessage = (e) => {
        if (version !== revision.current) return;
        setBusy(false);
        w.terminate();
        worker.current = null;
        if (e.data.ok) setResult(e.data.value);
        else setError(e.data.error);
      };
      w.onerror = (e) => {
        if (version !== revision.current) return;
        setBusy(false);
        setError(e.message || "Advanced worker failed; no fallback");
        w.terminate();
        worker.current = null;
      };
      w.postMessage({ request, context });
    } catch (e) {
      if (version === revision.current) {
        setBusy(false);
        setError(String(e));
      }
    }
  };
  const visible = result && stable(result.context) === key ? result : null;
  return (
    <section
      className="border rounded-xl p-4 space-y-3"
      data-testid="advanced-dispatch-panel"
    >
      <h3>
        تحلیل پیشرفته باتری/دیزل و dispatch بهینه / Advanced operating analysis
      </h3>
      <p>
        هر سه حالت؛ مستقل از منبع فعال مالی. ورودی advanced-study-v1 و شواهد
        واقعی مدل لازم است. optimal-discrete جواب بهینهٔ شبکهٔ گسستهٔ SOC با
        اطلاع کامل آینده است، نه پیش‌بینی یا بهینگی پیوسته. کنترل load-first نیز
        قابل انتخاب است. راهنما: docs/ADVANCED-DISPATCH-AND-PDF.fa.md.
      </p>
      <p>
        مدل دیزل: منحنی خطی سوخت، حداقل بار، دسترس‌پذیری و هزینه روشن‌شدن. مدل
        عمر: calendar + EFC با ضرایب صریح کاربر، گزارش SOH و تعویض؛ بدون
        کالیبراسیون میدانی یا بازخورد افت ظرفیت در همان دوره. این تحلیل،
        درآمد/هزینه یا عمر پیش‌فرض پروژه را خودکار بازنویسی نمی‌کند.
      </p>
      <input
        aria-label="Import advanced operating study"
        type="file"
        accept=".json,application/json"
        disabled={!context}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void load(f);
        }}
      />
      {busy && (
        <p role="status">
          Computing bounded advanced study in worker — no silent fallback
        </p>
      )}
      <button onClick={cancel}>Cancel advanced dispatch</button>
      {error && <p role="alert">{error}</p>}
      {visible && (
        <div data-testid="advanced-dispatch-result">
          <pre className="overflow-auto text-xs">
            {JSON.stringify(
              {
                ...visible.result,
                samples: `${visible.result.samples.length} intervals; full ledger in JSON`,
                socLevelsKwh: visible.result.socLevelsKwh,
              },
              null,
              2,
            )}
          </pre>
          <button
            onClick={() =>
              download(
                new Blob([JSON.stringify(visible)], {
                  type: "application/json",
                }),
                "advanced-study-result.json",
              )
            }
          >
            Download advanced ledger JSON
          </button>
          <button
            onClick={async () => {
              try {
                const { createReportPdf } = await import(
                  "../studies/reportPdf"
                );
                const { samples, ...summary } = visible.result;
                download(
                  await createReportPdf("Advanced operating analysis", [
                    {
                      title: "Identity and limits",
                      rows: [
                        ["Source SHA-256", visible.sourceSha256],
                        ["Mode", visible.context.mode],
                        ["Qualification", visible.qualification],
                        ["Intervals", samples.length],
                        [
                          "Ledger",
                          "Full interval ledger and replayable evidence in JSON; PDF is summary only",
                        ],
                      ],
                    },
                    {
                      title: "Dispatch / diesel / battery life summary",
                      rows: Object.entries(summary),
                    },
                  ]),
                  "advanced-operating-report.pdf",
                );
              } catch (e) {
                setError(String(e));
              }
            }}
          >
            Download advanced PDF
          </button>
        </div>
      )}
    </section>
  );
}
