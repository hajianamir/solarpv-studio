import {
  createOperationalStudy,
  saveOperationalStudy,
  validateOperationalStudy,
  loadOperationalStudy,
} from "../studies/operationalStudy";
import React, { useState, useEffect, useRef } from "react";
import {
  type OperationalContext,
  type OperationalEnergy,
} from "../studies/operationalEnergy";
import { parseStudyJson } from "../studies/strictStudyJson";
import { stable } from "../studies/studyComparisonGate";
export function OperationalEnergyPanel({
  context,
  receipt,
  onChange,
}: {
  context: OperationalContext | null;
  receipt: OperationalEnergy | null;
  onChange: (r: OperationalEnergy | null) => void;
}) {
  const [value, setValue] = useState<unknown>(null),
    [ack, setAck] = useState(""),
    [error, setError] = useState("");
  const [notes, setNotes] = useState(""),
    [timeZone, setTimeZone] = useState(""),
    [altitude, setAltitude] = useState(""),
    [moduleModel, setModuleModel] = useState(""),
    [inverterModel, setInverterModel] = useState("");
  const ackRef = useRef(ack);
  ackRef.current = ack;
  const revision = useRef({ version: 0 });
  const key = stable(context);
  useEffect(() => {
    const pending = revision.current;
    pending.version++;
    setValue(null);
    setAck("");
    setError("");
    return () => {
      pending.version++;
    };
  }, [key]);
  const load = async (file: File) => {
    const version = ++revision.current.version;
    onChange(null);
    setValue(null);
    try {
      if (file.size > 64 * 1024 * 1024)
        throw new Error("Maximum import 64 MiB");
      const data = parseStudyJson(await file.text(), 64 * 1024 * 1024);
      if (version === revision.current.version) {
        setValue(data);
        setError("");
      }
    } catch (e) {
      if (version === revision.current.version) setError(String(e));
    }
  };
  return (
    <section
      className="border rounded-xl p-4 space-y-2"
      data-testid="operational-energy-panel"
    >
      <p>
        برای on-grid/off-grid فایل operating-study-v1 شامل pvResults معتبر
        سالانه و plan صریح بار/وضعیت شبکه/سقف صادرات/باتری لازم است. راهنما:
        docs/OPERATING-DISPATCH.fa.md. هیچ بار یا dispatch ساعتی از پروفایل روز
        نمونه ساخته نمی‌شود.
      </p>
      <h3>منبع اجرایی تولید و مالی / Operational energy source</h3>
      <p>
        انتخاب اختیاری برای هر سه حالت نیروگاهی، on-grid و off-grid؛ نه تأیید
        میدانی. فقط خروجی AC معتبرِ یک سال کامل UTC و مطابق سایت و ظرفیت پذیرفته
        می‌شود. دما یا توان لحظه‌ای قابل تبدیل مستقیم به درآمد سالانه نیست.
      </p>
      <p>
        شواهد در IndexedDB همین مرورگر ذخیره می‌شوند. ذخیرهٔ محلی فقط شناسه را نگه می‌دارد؛ دانلود پاکت پروژه، شواهد معتبر را هم در همان فایل می‌گنجاند. آرشیو مستقل مطالعه نیز قابل دریافت است. هش تضمین اصالت یا امضای مسئول نیست.
      </p>
      <p>
        StudyResult، پاسخ دانلودشدهٔ API integrated، یا آرایه‌ای از integrated
        resultهای بازه‌بندی‌شده وارد کنید. تلفات waterfall دوباره اعمال
        نمی‌شوند؛ مرز integrated خروجی اینورتر است، نه الزاماً کنتور فروش. خرید
        برق نیروگاه با تعرفهٔ خرید منظور می‌شود؛ در on-grid منفعت افزایشی خودمصرفی و فروش محاسبه می‌شود، نه کل قبض خانوار؛ off-grid فقط بار تأمین‌شدهٔ منتسب به PV را ارزش‌گذاری می‌کند.
      </p>
      <button
        disabled={!context}
        onClick={() => {
          const url = URL.createObjectURL(
            new Blob([JSON.stringify(context, null, 2)], {
              type: "application/json",
            }),
          );
          const a = document.createElement("a");
          a.href = url;
          a.download = "operational-context.json";
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}
      >
        Download operational context
      </button>
      <input
        aria-label="Import operational annual results"
        type="file"
        accept=".json,application/json"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void load(f);
          e.target.value = "";
        }}
      />
      <fieldset className="space-y-2">
        <legend>
          Optional declared metadata — not measured or applied to yield
        </legend>
        <input
          aria-label="Study time zone"
          placeholder="IANA time zone (optional)"
          value={timeZone}
          onChange={(e) => setTimeZone(e.target.value)}
        />
        <input
          aria-label="Study altitude"
          placeholder="Altitude m (optional)"
          type="number"
          value={altitude}
          onChange={(e) => setAltitude(e.target.value)}
        />
        <input
          aria-label="Study module model"
          placeholder="Module model"
          value={moduleModel}
          onChange={(e) => setModuleModel(e.target.value)}
        />
        <input
          aria-label="Study inverter model"
          placeholder="Inverter model"
          value={inverterModel}
          onChange={(e) => setInverterModel(e.target.value)}
        />
        <textarea
          aria-label="Study notes"
          placeholder="Evidence and boundary notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </fieldset>
      <label>
        مسئول/شرح پذیرش مفروضات و مرز انرژی{" "}
        <input
          aria-label="Operational acknowledgement"
          value={ack}
          onChange={(e) => {
            setAck(e.target.value);
            onChange(null);
          }}
        />
      </label>
      <button
        disabled={!context || !value || ack.trim().length < 10}
        onClick={async () => {
          const version = ++revision.current.version;
          try {
            if (!context) throw new Error("Project context required");
            const doc = createOperationalStudy(value, context, ack, {
              notes,
              moduleModel,
              inverterModel,
              ...(timeZone ? { timeZone } : {}),
              ...(altitude !== "" ? { altitudeM: Number(altitude) } : {}),
            });
            await saveOperationalStudy(doc);
            if (
              version === revision.current.version &&
              ackRef.current === ack
            ) {
              onChange(validateOperationalStudy(doc, context).receipt);
              setError("");
            }
          } catch (e) {
            if (version === revision.current.version) setError(String(e));
          }
        }}
      >
        Use validated annual energy
      </button>{" "}
      <button
        onClick={() => {
          revision.current.version++;
          onChange(null);
        }}
      >
        Use screening energy
      </button>
      <input
        aria-label="Import portable operational study"
        type="file"
        accept=".json"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          const version = ++revision.current.version;
          onChange(null);
          try {
            if (!context) throw new Error("Project context required");
            if (f.size > 68 * 1024 * 1024)
              throw new Error("Maximum archive 68 MiB");
            const result = validateOperationalStudy(
              parseStudyJson(await f.text(), 68 * 1024 * 1024),
              context,
            );
            await saveOperationalStudy(result.document);
            if (version === revision.current.version) {
              onChange(result.receipt);
              setError("");
            }
          } catch (err) {
            if (version === revision.current.version) setError(String(err));
          }
        }}
      />
      {receipt?.studyId && (
        <button
          onClick={async () => {
            try {
              const { document: archive } = await loadOperationalStudy(
                receipt.studyId!,
              );
              const url = URL.createObjectURL(
                new Blob([JSON.stringify(archive)], {
                  type: "application/json",
                }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = "operational-study-archive.json";
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            } catch (e) {
              setError(String(e));
            }
          }}
        >
          Download portable operational study
        </button>
      )}
      {!context && <p>برای این سناریو ظرفیت معتبر و context پروژه لازم است.</p>}
      {receipt && (
        <button
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([JSON.stringify(receipt, null, 2)], {
                type: "application/json",
              }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = "operational-energy-receipt.json";
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          Download operational receipt
        </button>
      )}
      {receipt && (
        <p data-testid="operational-energy-active">
          {receipt.year}: {receipt.exportKwh.toFixed(3)} kWh export /{" "}
          {receipt.importKwh.toFixed(3)} kWh import — engineering_scenario /
          not_field_validated — {receipt.boundary}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
