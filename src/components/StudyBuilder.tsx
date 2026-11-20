import React, { useEffect, useRef, useState } from "react";
import {
  StudyRequestSchema,
  type StudyRequest,
} from "../studies/studyContract";
import {
  parseWeatherCsv,
  WEATHER_COLUMNS,
  weatherReview,
} from "../studies/studyWorkflow";
const fields = [
  ["surfaceTiltDeg", "Tilt / شیب (°)"],
  ["surfaceAzimuthDeg", "Azimuth +N→E / سمت (°)"],
  ["albedo", "Albedo / آلبدو (0..1)"],
  ["arrayPdc0W", "Array DC nameplate / توان آرایه (W)"],
  ["gammaPdcPerC", "DC temperature coefficient / ضریب دما (1/°C)"],
  ["inverterPdc0W", "Inverter DC limit / حد DC اینورتر (W)"],
  ["inverterEtaNom", "Nominal inverter efficiency / بازده (0..1)"],
  ["iamB", "ASHRAE IAM b"],
  ["additionalDcLossPct", "Additional DC loss / تلفات اضافی (%)"],
  ["a", "SAPM a"],
  ["b", "SAPM b"],
  ["deltaT", "SAPM ΔT (°C)"],
] as const;
type Values = Record<string, string>;
export function StudyBuilder({
  request,
  latitude,
  longitude,
  en,
  busy,
  onApply,
  onDirty,
}: {
  request: StudyRequest | null;
  latitude: number;
  longitude: number;
  en: boolean;
  busy: boolean;
  onApply: (r: StudyRequest) => void;
  onDirty: () => void;
}) {
  const csvRevision = useRef(0);
  useEffect(
    () => () => {
      csvRevision.current++;
    },
    [],
  );
  const [v, setV] = useState<Values>({});
  const [records, setRecords] = useState<StudyRequest["weather"]["records"]>(
    [],
  );
  const [error, setError] = useState("");
  const [review, setReview] = useState<StudyRequest | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    csvRevision.current++;
    const r = request;
    setV(
      r
        ? {
            label: r.label,
            altitudeM: String(r.site.altitudeM),
            timezone: r.site.timezone,
            intervalMinutes: String(r.weather.intervalMinutes),
            weatherSource: r.weather.source,
            weatherQuality: r.weather.quality,
            parameterSource: r.parameterProvenance.source,
            parameterQuality: r.parameterProvenance.quality,
            ...Object.fromEntries(
              fields.map(([key]) => [
                key,
                String(
                  key === "a" || key === "b" || key === "deltaT"
                    ? r.system.temperature[key]
                    : r.system[key],
                ),
              ]),
            ),
          }
        : {},
    );
    setRecords(r?.weather.records ?? []);
    setReview(r);
    setConfirmed(Boolean(r));
    setError("");
  }, [request, latitude, longitude]);
  function change(key: string, value: string) {
    setV((old) => ({ ...old, [key]: value }));
    setReview(null);
    setError("");
    onDirty();
  }
  function number(key: string) {
    if (!v[key]?.trim()) throw new Error(`${key}: required / الزامی`);
    const n = Number(v[key]);
    if (!Number.isFinite(n)) throw new Error(`${key}: finite number required`);
    return n;
  }
  const text = (key: string, label: string, type = "text") => (
    <label className="block text-xs" key={key}>
      {label}
      <input
        aria-label={`Study ${key}`}
        type={type}
        step={type === "number" ? "any" : undefined}
        value={v[key] ?? ""}
        onChange={(e) => change(key, e.target.value)}
        className="block w-full rounded bg-slate-900 p-2 border border-slate-600"
      />
    </label>
  );
  const quality = (key: string, label: string) => (
    <label className="block text-xs">
      {label}
      <select
        aria-label={`Study ${key}`}
        value={v[key] ?? ""}
        onChange={(e) => change(key, e.target.value)}
        className="block bg-slate-900 p-2"
      >
        <option value="">—</option>
        {["measured", "weather_provider", "user_configured", "assumed"].map(
          (q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ),
        )}
      </select>
    </label>
  );
  return (
    <details
      className="border border-slate-600 rounded p-3"
      open
      data-testid="study-builder"
    >
      <summary>
        {en
          ? "1–2. Build study & review weather"
          : "۱–۲. ساخت مطالعه و بررسی هواشناسی"}
      </summary>
      <fieldset disabled={busy} className="space-y-3 mt-3">
        <p className="text-xs">
          {en
            ? "No equipment/weather defaults. Active site:"
            : "بدون پیش‌فرض تجهیزات یا هواشناسی. سایت فعال:"}{" "}
          {latitude}, {longitude}.{" "}
          {en
            ? "Equipment is an independent scenario, not auto-linked to the catalog."
            : "تجهیزات سناریوی مستقل‌اند و به کاتالوگ متصل نیستند."}
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {text("label", "Study name / نام مطالعه")}
          {text("altitudeM", "Altitude / ارتفاع (m)", "number")}
          {text("timezone", "IANA timezone / منطقه زمانی")}
          {fields.map(([key, label]) => text(key, label, "number"))}
          {text(
            "parameterSource",
            "Equipment/parameter source / منبع پارامترها",
          )}
          {quality("parameterQuality", "Parameter quality / کیفیت پارامتر")}
        </div>
        <p className="text-xs">
          {en
            ? "PVWatts inverter reference efficiency is fixed at 0.9637. Temperature coefficients and mounting parameters must have a justified source."
            : "بازده مرجع اینورتر PVWatts برابر ۰٫۹۶۳۷ ثابت است. ضرایب حرارتی باید منبع توجیه‌پذیر داشته باشند."}
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {text("weatherSource", "Weather source / منبع هواشناسی")}
          {quality("weatherQuality", "Weather quality / کیفیت هواشناسی")}
          {text("intervalMinutes", "Interval / بازه (min, 1–60)", "number")}
        </div>
        <p className="text-xs" dir="ltr">
          CSV UTF-8: {WEATHER_COLUMNS.join(",")}
          <br />
          ISO timestamps with Z/offset; W/m², °C, m/s. Interval-end averages
          only. Not raw PVGIS/SAM CSV.
        </p>
        <label className="block text-xs">
          {en ? "Weather CSV (max 8 MiB)" : "فایل هواشناسی CSV (حداکثر ۸ MiB)"}
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label="Study weather CSV"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              const revision = ++csvRevision.current;
              onDirty();
              setReview(null);
              setRecords([]);
              setError("");
              try {
                if (f.size > 8 * 1024 * 1024)
                  throw new Error("CSV exceeds 8 MiB");
                const rows = parseWeatherCsv(await f.text());
                if (revision === csvRevision.current) setRecords(rows);
              } catch (cause) {
                if (revision === csvRevision.current) setError(String(cause));
              }
            }}
          />
        </label>
        <p className="text-xs">
          {records.length}{" "}
          {en
            ? "weather records loaded (not yet a scientific validation)"
            : "ردیف دریافت شد (به‌معنای اعتبارسنجی علمی نیست)"}
        </p>
        <label className="block text-xs">
          <input
            type="checkbox"
            aria-label="Confirm weather conventions"
            checked={confirmed}
            onChange={(e) => {
              setConfirmed(e.target.checked);
              setReview(null);
              onDirty();
            }}
          />{" "}
          {en
            ? "I confirm 10 m wind, interval-end averages, explicit UTC offsets and correct units. No missing values filled."
            : "باد ۱۰ متر، میانگین پایان بازه، offset صریح و واحدها را تأیید می‌کنم. دادهٔ مفقود پر نشده است."}
        </label>
        <button
          type="button"
          data-testid="apply-study-builder"
          onClick={() => {
            try {
              if (!confirmed)
                throw new Error(
                  "Confirm weather conventions / قرارداد هواشناسی را تأیید کنید",
                );
              const system = Object.fromEntries(
                fields
                  .filter(([k]) => !["a", "b", "deltaT"].includes(k))
                  .map(([k]) => [k, number(k)]),
              );
              const candidate = StudyRequestSchema.parse({
                schemaVersion: "pvlib-study-v1",
                label: v.label,
                site: {
                  latitude,
                  longitude,
                  altitudeM: number("altitudeM"),
                  timezone: v.timezone,
                },
                system: {
                  ...system,
                  inverterEtaRef: 0.9637,
                  temperature: {
                    a: number("a"),
                    b: number("b"),
                    deltaT: number("deltaT"),
                  },
                },
                parameterProvenance: {
                  source: v.parameterSource,
                  quality: v.parameterQuality,
                },
                weather: {
                  source: v.weatherSource,
                  quality: v.weatherQuality,
                  windHeightM: 10,
                  timestampConvention: "interval_end",
                  intervalMinutes: number("intervalMinutes"),
                  records,
                },
              });
              setReview(candidate);
              setError("");
              onApply(candidate);
            } catch (cause) {
              setReview(null);
              setError(cause instanceof Error ? cause.message : String(cause));
            }
          }}
        >
          {en
            ? "Validate & apply study inputs"
            : "بررسی و اعمال ورودی‌های مطالعه"}
        </button>
        {error && (
          <p role="alert" className="text-xs text-red-300 whitespace-pre-wrap">
            {error}
          </p>
        )}
        {review && (
          <div data-testid="weather-review" className="text-xs">
            <p>
              {en
                ? "Contract checks passed: ordered, regular, finite, bounded. No gap filling. Domain checks also run in Python."
                : "کنترل قرارداد موفق: مرتب، منظم، متناهی و در دامنه؛ بدون پرکردن شکاف. بررسی فیزیکی در Python نیز اجرا می‌شود."}
            </p>
            <p dir="ltr">
              {review.weather.records[0].timestamp} →{" "}
              {review.weather.records.at(-1)!.timestamp} ·{" "}
              {review.weather.intervalMinutes} min ·{" "}
              {review.weather.records.length} rows
            </p>
            <table>
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Min</th>
                  <th>Max</th>
                </tr>
              </thead>
              <tbody>
                {weatherReview(review).map((r) => (
                  <tr key={r.key}>
                    <td>{r.key}</td>
                    <td>{r.min}</td>
                    <td>{r.max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <details>
              <summary>{en ? "First 5 rows" : "۵ ردیف نخست"}</summary>
              <pre dir="ltr" className="overflow-auto">
                {JSON.stringify(review.weather.records.slice(0, 5), null, 2)}
              </pre>
            </details>
          </div>
        )}
      </fieldset>
    </details>
  );
}
