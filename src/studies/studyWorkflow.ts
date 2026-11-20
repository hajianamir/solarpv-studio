import {
  StudyRequestSchema,
  type StudyRequest,
  type StudyResult,
} from "./studyContract";
import { z } from "zod";

export const WEATHER_COLUMNS = [
  "timestamp",
  "ghiWm2",
  "dniWm2",
  "dhiWm2",
  "tempAirC",
  "windSpeedMs",
] as const;
/** Strict single-record-per-line CSV; no dialect, unit or timestamp guessing. */
export function parseWeatherCsv(
  text: string,
): StudyRequest["weather"]["records"] {
  if (new TextEncoder().encode(text).length > 8 * 1024 * 1024)
    throw new Error("CSV exceeds 8 MiB");
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (lines.at(-1) === "") lines.pop();
  if (lines.length < 3 || lines.length > 17569)
    throw new Error("CSV requires 2..17568 data rows");
  function cells(line: string, row: number) {
    const fields: string[] = [];
    let value = "",
      quoted = false,
      closed = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quoted) {
        if (c === '"') {
          if (line[i + 1] === '"') {
            value += '"';
            i++;
          } else {
            quoted = false;
            closed = true;
          }
        } else value += c;
      } else if (c === ",") {
        fields.push(value);
        value = "";
        closed = false;
      } else if (c === '"' && value === "" && !closed) quoted = true;
      else {
        if (closed || c === '"')
          throw new Error(`CSV row ${row}: invalid quoting`);
        value += c;
      }
    }
    if (quoted) throw new Error(`CSV row ${row}: unterminated quote`);
    fields.push(value);
    return fields;
  }
  const header = cells(lines[0], 1);
  if (JSON.stringify(header) !== JSON.stringify(WEATHER_COLUMNS))
    throw new Error(`CSV header must be ${WEATHER_COLUMNS.join(",")}`);
  return lines.slice(1).map((line, i) => {
    const values = cells(line, i + 2);
    if (values.length !== 6 || values.some((v) => !v.trim()))
      throw new Error(
        `CSV row ${i + 2}: six nonempty values required; missing is not zero`,
      );
    const numbers = values.slice(1).map((value) => {
      if (
        !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim()) ||
        !Number.isFinite(Number(value))
      )
        throw new Error(`CSV row ${i + 2}: invalid finite number`);
      return Number(value);
    });
    return {
      timestamp: values[0],
      ghiWm2: numbers[0],
      dniWm2: numbers[1],
      dhiWm2: numbers[2],
      tempAirC: numbers[3],
      windSpeedMs: numbers[4],
    };
  });
}
export function weatherReview(request: StudyRequest) {
  return WEATHER_COLUMNS.slice(1).map((key) => {
    const values = request.weather.records.map((row) => Number(row[key]));
    return { key, min: Math.min(...values), max: Math.max(...values) };
  });
}
export function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
const energy = z.object({
  dcBeforeAdditionalLossWh: z.number().finite().nonnegative(),
  dcWh: z.number().finite().nonnegative(),
  acWh: z.number().finite().nonnegative(),
});
const resultSchema = z.object({
  schemaVersion: z.literal("pvlib-study-result-v1"),
  status: z.literal("completed"),
  engine: z.literal("pvlib-python-direct"),
  request: StudyRequestSchema,
  summary: energy,
  monthly: z
    .array(energy.extend({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
    .min(1)
    .max(13),
  samples: z
    .array(z.record(z.string(), z.union([z.string(), z.number().finite()])))
    .min(2)
    .max(17568),
  manifest: z.object({
    engineVersion: z.string(),
    models: z.record(z.string(), z.string()),
    validationStatus: z.literal("not_field_validated"),
    inputSha256: z.string().regex(/^[a-f0-9]{64}$/),
    workerSha256: z.string().regex(/^[a-f0-9]{64}$/),
    requirementsSha256: z.string().regex(/^[a-f0-9]{64}$/),
    python: z.string(),
    platform: z.string(),
    dependencies: z.record(z.string(), z.string()),
    period: z.object({
      startUtc: z.string(),
      endUtc: z.string(),
      intervalMinutes: z.number(),
      intervalCount: z.number(),
      completeUtcCalendarYear: z.boolean(),
      monthlyAllocation: z.string(),
    }),
    units: z.record(z.string(), z.string()),
    limitations: z.array(z.string()),
    warnings: z.array(z.string()),
  }),
  execution: z
    .object({
      runId: z.string(),
      startedAt: z.string(),
      finishedAt: z.string(),
    })
    .optional(),
});
export function validateResult(value: unknown): StudyResult {
  const r = resultSchema.parse(value) as StudyResult;
  if (
    r.samples.length !== r.request.weather.records.length ||
    r.manifest.period.intervalCount !== r.samples.length ||
    r.manifest.period.intervalMinutes !== r.request.weather.intervalMinutes
  )
    throw new Error("Result interval count/spacing mismatch");
  if (
    r.samples.some(
      (sample, i) =>
        sample.timestamp !== r.request.weather.records[i].timestamp,
    )
  )
    throw new Error("Result sample timestamps do not match request");
  return r;
}
export interface StudySnapshot {
  version: 1;
  id: string;
  savedAt: string;
  request: StudyRequest;
  result: StudyResult | null;
}
export function validateSnapshot(value: unknown): StudySnapshot {
  const envelope = z
    .object({
      version: z.literal(1),
      id: z.string().min(1).max(100),
      savedAt: z.string().datetime(),
      request: StudyRequestSchema,
      result: z.unknown().nullable(),
    })
    .strict()
    .parse(value);
  const result =
    envelope.result === null ? null : validateResult(envelope.result);
  if (result && stable(result.request) !== stable(envelope.request))
    throw new Error("Saved result does not match saved request");
  return { ...envelope, result };
}
export function comparisonReason(
  a: StudyResult,
  b: StudyResult,
): string | null {
  if (stable(a.request.site) !== stable(b.request.site))
    return "Different site / سایت متفاوت";
  if (stable(a.request.weather) !== stable(b.request.weather))
    return "Different weather or period / هواشناسی یا دوره متفاوت";
  if (
    stable(a.manifest.models) !== stable(b.manifest.models) ||
    a.manifest.workerSha256 !== b.manifest.workerSha256 ||
    a.manifest.requirementsSha256 !== b.manifest.requirementsSha256 ||
    stable(a.manifest.dependencies) !== stable(b.manifest.dependencies) ||
    a.manifest.engineVersion !== b.manifest.engineVersion
  )
    return "Different engine/models/dependencies / موتور یا نسخه متفاوت";
  return null;
}
const escape = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function studyReport(result: StudyResult, other?: StudyResult): string {
  if (other) {
    const reason = comparisonReason(result, other);
    if (reason) throw new Error(reason);
  }
  const section = (r: StudyResult) =>
    `<h2>${escape(r.request.label)}</h2><p>DC nameplate: ${r.request.system.arrayPdc0W} W; period AC: ${r.summary.acWh / 1000} kWh; DC: ${r.summary.dcWh / 1000} kWh</p><p>${escape(r.manifest.period.startUtc)} → ${escape(r.manifest.period.endUtc)}; UTC months, not annualized unless complete year.</p><table><tr><th>UTC month</th><th>DC Wh</th><th>AC Wh</th></tr>${r.monthly.map((m) => `<tr><td>${escape(m.month)}</td><td>${m.dcWh}</td><td>${m.acWh}</td></tr>`).join("")}</table><h3>Warnings & limitations</h3><ul>${[...r.manifest.warnings, ...r.manifest.limitations].map((w) => `<li>${escape(w)}</li>`).join("")}</ul><h3>Inputs (weather retained in companion JSON)</h3><pre>${escape(JSON.stringify({ ...r.request, weather: { ...r.request.weather, records: `${r.request.weather.records.length} rows; see JSON bundle` } }, null, 2))}</pre><h3>Execution and reproducibility</h3><pre>${escape(JSON.stringify({ execution: r.execution, manifest: r.manifest }, null, 2))}</pre>`;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Direct pvlib study report</title><style>body{font:15px system-ui;max-width:1000px;margin:2em auto;padding:1em;color:#172033}table{border-collapse:collapse;width:100%}td,th{border:1px solid #aaa;padding:6px}pre{white-space:pre-wrap;overflow-wrap:anywhere} @media print{body{margin:0}h2{break-before:page}}</style><h1>Direct pvlib study / گزارش مطالعه</h1><p>Not field validated. Separate from screening and financial reports. Imported/local results are not digitally certified. Keep the JSON bundle for full weather and reproducibility. Print using browser Print / Save as PDF.</p>${other ? `<h2>Scenario comparison</h2><p>Same weather, site and engine. AC difference (second − first): ${(other.summary.acWh - result.summary.acWh) / 1000} kWh; ${result.summary.acWh === 0 ? "percentage unavailable (zero baseline)" : `${(100 * (other.summary.acWh - result.summary.acWh)) / result.summary.acWh}%`}. Different capacities are not normalized.</p>` : ""}${section(result)}${other ? section(other) : ""}</html>`;
}
