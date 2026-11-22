import { downloadBlob } from "../browser/download";
import { useCallback, useEffect, useRef, useState } from "react";
import type { OperationalContext } from "../studies/operationalEnergy";
import type { compareOperatingPolicies } from "../studies/operatingPolicyComparison";
import type { runOperatingLifecycle } from "../studies/operatingLifecycle";
import { stable } from "../studies/studyComparisonGate";
import { parseStudyJson } from "../studies/strictStudyJson";
type Result = ReturnType<typeof compareOperatingPolicies> | ReturnType<typeof runOperatingLifecycle>;
export function operatingExperimentSummary(result: Result) {
  if (result.schemaVersion === "operating-policy-comparison-v1") return {
    schemaVersion: result.schemaVersion, sourceSha256: result.sharedInputSha256,
    mode: result.context.mode, loadFirst: result.loadFirst.status,
    optimalDiscrete: result.optimalDiscrete.status, delta: result.delta,
    errors: [result.loadFirst, result.optimalDiscrete].flatMap(r => r.status === "blocked" ? [r.error] : []),
    qualification: result.qualification, limitations: result.limitations,
  };
  return { schemaVersion: result.schemaVersion, sourceSha256: result.sourceSha256,
    mode: result.context.mode, npvToman: result.npvToman,
    years: result.years.map(({ study, ...row }) => ({ ...row,
      intervals: study.result.samples.length, objectiveToman: study.result.objectiveToman,
      unmetKwh: study.result.unmetKwh, fuelLiters: study.result.fuelLiters })),
    qualification: result.qualification, limitations: result.limitations };
}
export function OperatingExperimentPanel({ context }: { context: OperationalContext | null }) {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const worker = useRef<Worker | null>(null), revision = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const key = stable(context);
  const cancel = useCallback(() => {
    revision.current++; clearTimeout(timer.current); worker.current?.terminate(); worker.current = null; setBusy(false);
  }, []);
  useEffect(() => { cancel(); setResult(null); setError(""); return cancel; }, [key, cancel]);
  const load = async (file: File, operation: "comparison" | "lifecycle") => {
    cancel(); const version = revision.current; setResult(null); setError(""); setBusy(true);
    try {
      if (!context) throw new Error("Active project context required for this optional experiment");
      if (file.size > 64 * 1024 * 1024) throw new Error("Experiment import exceeds 64 MiB");
      const parsed = parseStudyJson(await file.text(), 64 * 1024 * 1024) as { schemaVersion?: string; request?: unknown };
      if (version !== revision.current) return;
      const request = ["operating-policy-comparison-v1", "operating-lifecycle-result-v1", "advanced-study-result-v1"].includes(parsed.schemaVersion ?? "")
        ? parsed.request : parsed;
      const w = new Worker(new URL("../studies/operatingExperiments.worker.ts", import.meta.url), { type: "module" });
      worker.current = w;
      timer.current = setTimeout(() => {
        if (version !== revision.current) return;
        cancel(); setError("Operating experiment timed out after 120 seconds; no fallback");
      }, 120_000);
      w.onmessage = e => {
        if (version !== revision.current) return;
        clearTimeout(timer.current); w.terminate(); worker.current = null; setBusy(false);
        if (e.data.ok) setResult(e.data.value); else setError(e.data.error);
      };
      w.onerror = e => {
        if (version !== revision.current) return;
        clearTimeout(timer.current); w.terminate(); worker.current = null; setBusy(false); setError(e.message || "Experiment worker failed; no fallback");
      };
      w.postMessage({ request, context, operation });
    } catch (e) { if (version === revision.current) { setBusy(false); setError(String(e)); } }
  };
  const download = downloadBlob;
  const visible = result && stable(result.context) === key ? result : null;
  const summary = visible ? operatingExperimentSummary(visible) : null;
  return <section data-testid="operating-experiment-panel" className="border rounded-xl p-4 space-y-3">
    <h3>مقایسهٔ سیاست و تحلیل چندساله / Policy comparison and lifecycle</h3>
    <p>اختیاری برای هر سه حالت؛ بدون تغییر منبع انرژی یا مالی فعال. اطلاعات سالانه و ضرایب صریح هر سایت لازم است؛ پژوهش اختیاری، baseline را مسدود نمی‌کند. مقایسه، forecast یا صرفه‌جویی تضمینی نیست.</p>
    {([ ["comparison", "Import policy comparison study"], ["lifecycle", "Import multiyear operating lifecycle"] ] as const).map(([operation, label]) =>
      <label key={operation}>{label}<input aria-label={label} type="file" accept=".json,application/json" disabled={!context}
        onChange={e => { const input = e.currentTarget, file = input.files?.[0]; if (file) void load(file, operation).finally(() => { if (input.files?.[0] === file) input.value = ""; }); }} /></label>)}
    <button onClick={cancel}>Cancel operating experiment</button>
    {busy && <p role="status">Computing bounded operating experiment — no fallback</p>}
    {error && <p role="alert">{error}</p>}
    {visible && summary && <div data-testid="operating-experiment-result">
      <pre className="overflow-auto text-xs">{JSON.stringify(summary, null, 2)}</pre>
      <button onClick={() => { try {
        const blob = new Blob([JSON.stringify(visible)], { type: "application/json" });
        if (blob.size > 64 * 1024 * 1024) throw new Error("Report exceeds 64 MiB replay limit; no partial archive exported");
        download(blob, "operating-experiment.json");
      } catch (e) { setError(String(e)); } }}>Download operating experiment JSON</button>
      <button onClick={async () => { try {
        const { createReportPdf } = await import("../studies/reportPdf");
        download(await createReportPdf("Operating policy / lifecycle experiment", [{ title: "Identity, results and limitations", rows: Object.entries(summary) }]), "operating-experiment.pdf");
      } catch (e) { setError(String(e)); } }}>Download operating experiment PDF</button>
    </div>}
  </section>;
}
