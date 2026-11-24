import { useState } from "react";
import {
  makeStudyBundle,
  validateStudyBundle,
  previewBundle,
  MAX_BUNDLE_BYTES,
  type StudyBundle,
} from "../studies/studyExchange";
import {
  loadStudies,
  deleteStudies,
  importStudyBundle,
  type StudyIndex,
} from "../studies/studyLibrary";
function studyDownload(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function StudyLibraryTools({
  entries,
  selected,
  setSelected,
  action,
  en,
}: {
  entries: StudyIndex[];
  selected: string[];
  setSelected: (ids: string[]) => void;
  action: (work: () => Promise<void>) => Promise<void>;
  en: boolean;
}) {
  const [pending, setPending] = useState<StudyBundle | null>(null),
    [usage, setUsage] = useState<string>("unavailable / ناموجود");
  const preview = pending
    ? previewBundle(
        pending,
        entries.map((e) => e.id),
      )
    : null;
  return (
    <div className="space-y-2" data-testid="study-library-tools">
      <p>
        {en ? "Selected (max 20)" : "انتخاب (حداکثر۲۰)"}: {selected.length} /{" "}
        {entries.length}
      </p>
      <button
        type="button"
        data-testid="clear-study-selection"
        onClick={() => setSelected([])}
      >
        {en ? "Clear selection" : "لغو انتخاب"}
      </button>
      <button
        type="button"
        data-testid="bundle-export"
        disabled={!selected.length || selected.length > 20}
        onClick={() =>
          void action(async () => {
            const bundle = await makeStudyBundle(await loadStudies(selected));
            studyDownload(
              "pvlib-study-library-bundle.json",
              JSON.stringify(bundle),
              "application/json",
            );
          })
        }
      >
        {en ? "Back up selected snapshots" : "پشتیبان نسخه‌های انتخابی"}
      </button>
      <button
        type="button"
        data-testid="bulk-delete-studies"
        disabled={!selected.length || selected.length > 20}
        onClick={() => {
          if (
            window.confirm(
              `${en ? "Delete selected snapshots?" : "نسخه‌های انتخابی حذف شوند؟"} ${selected.length}`,
            )
          )
            void action(async () => {
              await deleteStudies(selected);
              setSelected([]);
            });
        }}
      >
        {en ? "Delete selected atomically" : "حذف اتمی انتخاب‌ها"}
      </button>
      <label>
        {en
          ? "Bundle preflight (max 64 MiB; no write yet)"
          : "بررسی پشتیبان گروهی (حداکثر۶۴MiB؛ هنوز ذخیره نمی‌شود)"}
        <input
          aria-label="Import study library bundle"
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            setPending(null);
            if (file)
              void action(async () => {
                if (file.size > MAX_BUNDLE_BYTES)
                  throw new Error("Bundle exceeds 64 MiB");
                const checked = await validateStudyBundle(
                  JSON.parse(await file.text()),
                );
                setPending(checked);
              });
          }}
        />
      </label>
      {preview && (
        <div data-testid="bundle-preview">
          <p>
            {preview.count} · conflicts: {preview.conflicts.length} ·{" "}
            {en
              ? "Checksum verified, not authenticity. Conflict check repeated inside write transaction. No overwrite."
              : "checksum بررسی شد، نه اصالت. تعارض هنگام نوشتن دوباره سنجیده می‌شود؛ بدون بازنویسی."}
          </p>
          <ul>
            {preview.entries.map((e) => (
              <li key={e.id}>
                {e.label} · {e.id} · {e.hasResult ? "result" : "inputs"}
              </li>
            ))}
          </ul>
          <button
            type="button"
            data-testid="confirm-bundle-import"
            disabled={!!preview.conflicts.length}
            onClick={() =>
              void action(async () => {
                await importStudyBundle(pending);
                setPending(null);
              })
            }
          >
            {en
              ? "Import all atomically (add only)"
              : "ورود اتمی همه (فقط افزودن)"}
          </button>
          <button
            type="button"
            data-testid="cancel-bundle-import"
            onClick={() => setPending(null)}
          >
            {en ? "Cancel preflight" : "لغو بررسی"}
          </button>
        </div>
      )}
      <button
        type="button"
        data-testid="study-storage-estimate"
        onClick={() =>
          void action(async () => {
            if (!navigator.storage?.estimate) {
              setUsage("unavailable / ناموجود");
              return;
            }
            const e = await navigator.storage.estimate();
            setUsage(
              `origin-wide approximate bytes: usage=${e.usage ?? "unavailable"}, quota=${e.quota ?? "unavailable"}; not reserved capacity`,
            );
          })
        }
      >
        {en ? "Estimate browser-origin storage" : "برآورد فضای origin مرورگر"}
      </button>
      <p data-testid="study-storage-usage">{usage}</p>
    </div>
  );
}
