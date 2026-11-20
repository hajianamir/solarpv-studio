import React, { useEffect, useRef, useState } from "react";
import type { StudyRequest, StudyResult } from "../studies/studyContract";
import {
  comparisonReason,
  studyReport,
  validateSnapshot,
  type StudySnapshot,
} from "../studies/studyWorkflow";
import {
  deleteStudy,
  listStudies,
  loadStudy,
  saveStudy,
  type StudyIndex,
} from "../studies/studyLibrary";
export function studyDownload(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function StudyLibrary({
  request,
  result,
  dirty,
  busy,
  latitude,
  longitude,
  en,
  onRestore,
}: {
  request: StudyRequest | null;
  result: StudyResult | null;
  dirty: boolean;
  busy: boolean;
  latitude: number;
  longitude: number;
  en: boolean;
  onRestore: (snapshot: StudySnapshot) => void;
}) {
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const [entries, setEntries] = useState<StudyIndex[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [other, setOther] = useState<StudyResult | null>(null);
  useEffect(() => {
    let active = true;
    listStudies()
      .then((rows) => {
        if (active) setEntries(rows);
      })
      .catch((e) => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    setOther(null);
  }, [result, latitude, longitude]);
  async function action(work: () => Promise<void>) {
    setWorking(true);
    setError("");
    setMessage("");
    try {
      await work();
      setEntries(await listStudies());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setWorking(false);
    }
  }
  function snapshot(): StudySnapshot {
    if (!request || dirty) throw new Error("Validate and apply inputs first");
    return {
      version: 1,
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      request,
      result,
    };
  }
  function restore(s: StudySnapshot) {
    if (!active.current) return;
    if (
      dirty &&
      !window.confirm(
        en
          ? "Discard unapplied edits and restore?"
          : "تغییرات اعمال‌نشده کنار گذاشته و بازیابی شود؟",
      )
    )
      return;
    if (
      s.request.site.latitude !== latitude ||
      s.request.site.longitude !== longitude
    )
      throw new Error(
        "Select the saved site first / ابتدا سایت ذخیره‌شده را انتخاب کنید",
      );
    onRestore(s);
    setMessage(
      en
        ? "Restored local/imported snapshot; not a new execution or certified result."
        : "نسخهٔ محلی/واردشده بازیابی شد؛ اجرای جدید یا نتیجهٔ دارای امضای اصالت نیست.",
    );
  }
  const reason = result && other ? comparisonReason(result, other) : null;
  return (
    <section
      className="border border-slate-600 rounded p-3 space-y-3"
      data-testid="study-library"
    >
      <h3>
        {en
          ? "4–6. Local library, comparison & report"
          : "۴–۶. کتابخانهٔ محلی، مقایسه و گزارش"}
      </h3>
      <p className="text-xs">
        {en
          ? "Saved only in this browser/origin, shared by users of this browser profile. Not account-isolated or part of project JSON. Browser clearing/eviction can remove it: export backups. No cloud upload."
          : "ذخیره فقط در همین مرورگر و origin؛ مشترک میان کاربران این پروفایل، بدون جداسازی حساب و خارج از JSON پروژه. پاک‌سازی مرورگر می‌تواند آن را حذف کند؛ نسخهٔ پشتیبان بگیرید. بارگذاری ابری انجام نمی‌شود."}
      </p>
      <fieldset disabled={busy || working} className="space-y-3">
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            data-testid="save-study"
            disabled={!request || dirty}
            onClick={() =>
              void action(async () => {
                await saveStudy(snapshot());
                setMessage(en ? "Saved successfully" : "ذخیره شد");
              })
            }
          >
            {en ? "Save new snapshot" : "ذخیرهٔ نسخهٔ جدید"}
          </button>
          <button
            type="button"
            data-testid="backup-study"
            disabled={!request || dirty}
            onClick={() => {
              try {
                studyDownload(
                  "pvlib-study-archive.json",
                  JSON.stringify(snapshot(), null, 2),
                  "application/json",
                );
              } catch (e) {
                setError(String(e));
              }
            }}
          >
            {en ? "Export portable archive" : "پشتیبان قابل‌انتقال"}
          </button>
          <button type="button" onClick={() => void action(async () => {})}>
            {en ? "Refresh library" : "تازه‌سازی کتابخانه"}
          </button>
        </div>
        <label className="text-xs block">
          {en
            ? "Restore portable archive (max 24 MiB)"
            : "بازیابی پشتیبان (حداکثر ۲۴ MiB)"}
          <input
            type="file"
            accept=".json,application/json"
            aria-label="Restore study archive"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              void action(async () => {
                if (f.size > 24 * 1024 * 1024)
                  throw new Error("Archive exceeds 24 MiB");
                restore(validateSnapshot(JSON.parse(await f.text())));
              });
            }}
          />
        </label>
        <ul className="text-xs space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              data-testid="saved-study-entry"
              className="border-b border-slate-700 pb-2"
            >
              <span>
                {entry.label} · {entry.savedAt} · {entry.latitude},{" "}
                {entry.longitude} · {entry.completed ? "result" : "inputs only"}
              </span>
              <div className="flex gap-4">
                <button
                  type="button"
                  disabled={
                    entry.latitude !== latitude || entry.longitude !== longitude
                  }
                  onClick={() =>
                    void action(async () => restore(await loadStudy(entry.id)))
                  }
                >
                  {en ? "Restore" : "بازیابی"}
                </button>
                <button
                  type="button"
                  disabled={!entry.completed || !result}
                  onClick={() =>
                    void action(async () => {
                      const saved = await loadStudy(entry.id);
                      if (!saved.result)
                        throw new Error("Saved study has no result");
                      const mismatch = comparisonReason(result!, saved.result);
                      if (mismatch) throw new Error(mismatch);
                      setOther(saved.result);
                    })
                  }
                >
                  {en ? "Compare with current" : "مقایسه با نتیجهٔ فعلی"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        en
                          ? "Delete this local snapshot?"
                          : "این نسخهٔ محلی حذف شود؟",
                      )
                    )
                      void action(async () => {
                        await deleteStudy(entry.id);
                        setOther(null);
                      });
                  }}
                >
                  {en ? "Delete" : "حذف"}
                </button>
              </div>
            </li>
          ))}
        </ul>
        {result && (
          <button
            type="button"
            data-testid="download-study-report"
            onClick={() =>
              studyDownload(
                "pvlib-study-report.html",
                studyReport(result, other ?? undefined),
                "text/html;charset=utf-8",
              )
            }
          >
            {en
              ? "Download printable report (HTML / Print to PDF)"
              : "دانلود گزارش قابل‌چاپ (HTML / چاپ به PDF)"}
          </button>
        )}
        {result && other && !reason && (
          <div data-testid="study-comparison" className="text-xs">
            <h4>
              {en
                ? "Comparable site/weather/engine; mounting/row optics/thermal proxy may differ; capacity not normalized"
                : "سایت، هواشناسی و موتور سازگار؛ نصب/تابش ردیفی/فرض حرارتی ممکن است متفاوت باشند؛ بدون نرمال‌سازی ظرفیت"}
            </h4>
            <table>
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Mounting / optics</th>
                  <th>DC W</th>
                  <th>AC kWh</th>
                </tr>
              </thead>
              <tbody>
                {[result, other].map((r, i) => (
                  <tr key={i}>
                    <td>{r.request.label}</td>
                    <td>
                      {r.request.system.tracking ? "single-axis" : "fixed"} /{" "}
                      {r.request.system.rowIrradiance
                        ? "rows/bifacial"
                        : "isolated"}
                    </td>
                    <td>{r.request.system.arrayPdc0W}</td>
                    <td>{r.summary.acWh / 1000}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              Δ AC (saved − current):{" "}
              {(other.summary.acWh - result.summary.acWh) / 1000} kWh ·{" "}
              {result.summary.acWh === 0
                ? "N/A (zero baseline)"
                : `${(100 * (other.summary.acWh - result.summary.acWh)) / result.summary.acWh}%`}
            </p>
            <svg
              viewBox="0 0 400 100"
              role="img"
              aria-label="Scenario AC energy comparison"
            >
              <rect
                x="0"
                y="10"
                height="25"
                width={
                  Math.max(result.summary.acWh, other.summary.acWh) === 0
                    ? 0
                    : (380 * result.summary.acWh) /
                      Math.max(result.summary.acWh, other.summary.acWh)
                }
                fill="#38bdf8"
              />
              <rect
                x="0"
                y="55"
                height="25"
                width={
                  Math.max(result.summary.acWh, other.summary.acWh) === 0
                    ? 0
                    : (380 * other.summary.acWh) /
                      Math.max(result.summary.acWh, other.summary.acWh)
                }
                fill="#a78bfa"
              />
            </svg>
          </div>
        )}
      </fieldset>
      {message && (
        <p role="status" className="text-xs">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
