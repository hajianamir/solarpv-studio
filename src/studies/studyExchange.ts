import { z } from "zod";
import { StudyRequestSchema, type StudyRequest } from "./studyContract";
import {
  validateSnapshot,
  WEATHER_COLUMNS,
  type StudySnapshot,
} from "./studyWorkflow";
export const MAX_BUNDLE_BYTES = 64 * 1024 * 1024;
export const MAX_BUNDLE_ENTRIES = 20;
export function checkedSnapshot(value: unknown) {
  if (new TextEncoder().encode(JSON.stringify(value)).length > 24 * 1024 * 1024)
    throw new Error("Snapshot exceeds 24 MiB");
  const s = validateSnapshot(value);
  if (new TextEncoder().encode(JSON.stringify(s)).length > 24 * 1024 * 1024)
    throw new Error("Snapshot exceeds 24 MiB");
  if (
    new TextEncoder().encode(JSON.stringify(s.request)).length >
    8 * 1024 * 1024
  )
    throw new Error("Request exceeds 8 MiB");
  return s;
}
/** Local sorted-key JSON checksum format, not RFC8785/PROV, a signature or authentication. */
export function canonicalBundleJson(value: unknown): string {
  if (Array.isArray(value))
    return "[" + value.map(canonicalBundleJson).join(",") + "]";
  if (value !== null && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => JSON.stringify(k) + ":" + canonicalBundleJson(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
async function checksum(payload: unknown) {
  if (!globalThis.crypto?.subtle)
    throw new Error(
      "SHA256 unavailable; HTTPS/secure context required. No unchecked bundle fallback.",
    );
  const bytes = new TextEncoder().encode(canonicalBundleJson(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
function snapshots(values: unknown[]) {
  if (values.length < 1 || values.length > MAX_BUNDLE_ENTRIES)
    throw new Error("Bundle requires 1..20 snapshots");
  const ids = new Set<string>();
  return values.map((value) => {
    const s = checkedSnapshot(value);
    if (ids.has(s.id)) throw new Error("Duplicate snapshot ID inside bundle");
    ids.add(s.id);
    return s;
  });
}
export async function makeStudyBundle(values: StudySnapshot[]) {
  const payload = {
    schemaVersion: "study-library-bundle-v1" as const,
    snapshots: JSON.parse(JSON.stringify(snapshots(values))) as StudySnapshot[],
  };
  if (
    new TextEncoder().encode(JSON.stringify(payload)).length >
    MAX_BUNDLE_BYTES - 200
  )
    throw new Error("Bundle exceeds 64 MiB");
  return { ...payload, checksumSha256: await checksum(payload) };
}
export async function validateStudyBundle(value: unknown) {
  if (new TextEncoder().encode(JSON.stringify(value)).length > MAX_BUNDLE_BYTES)
    throw new Error("Bundle exceeds 64 MiB");
  const raw = z
    .object({
      schemaVersion: z.literal("study-library-bundle-v1"),
      snapshots: z.array(z.unknown()).min(1).max(20),
      checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .strict()
    .parse(value);
  const payload = {
    schemaVersion: raw.schemaVersion,
    snapshots: raw.snapshots,
  };
  if ((await checksum(payload)) !== raw.checksumSha256)
    throw new Error("Bundle checksum mismatch; no import");
  return { ...raw, snapshots: snapshots(raw.snapshots) };
}
export type StudyBundle = Awaited<ReturnType<typeof validateStudyBundle>>;
export function previewBundle(bundle: StudyBundle, existingIds: string[]) {
  const ids = new Set(existingIds);
  return {
    count: bundle.snapshots.length,
    conflicts: bundle.snapshots.filter((s) => ids.has(s.id)).map((s) => s.id),
    entries: bundle.snapshots.map((s) => ({
      id: s.id,
      label: s.request.label,
      hasResult: s.result !== null,
      latitude: s.request.site.latitude,
      longitude: s.request.site.longitude,
    })),
  };
}
export function cloneStudyInputs(
  snapshot: StudySnapshot,
  label: string,
  id: string,
  savedAt: string,
) {
  const checked = checkedSnapshot(snapshot);
  return checkedSnapshot({
    version: 1,
    id,
    savedAt,
    request: { ...structuredClone(checked.request), label },
    result: null,
  });
}
export function requestStudyJson(request: StudyRequest) {
  const parsed = StudyRequestSchema.parse(request),
    text = JSON.stringify(parsed, null, 2);
  if (new TextEncoder().encode(text).length > 8 * 1024 * 1024)
    throw new Error("Formatted request exceeds 8 MiB");
  return text;
}
export function weatherInputCsv(request: StudyRequest) {
  const checked = StudyRequestSchema.parse(request);
  return [
    WEATHER_COLUMNS,
    ...checked.weather.records.map((row) =>
      WEATHER_COLUMNS.map((key) => String(row[key])),
    ),
  ]
    .map((row) =>
      row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
    )
    .join("\r\n");
}
export function filterStudyEntries<
  T extends {
    label: string;
    savedAt: string;
    completed: boolean;
    latitude: number;
    longitude: number;
  },
>(
  entries: T[],
  options: {
    search: string;
    status: "all" | "inputs" | "results";
    siteOnly: boolean;
    latitude: number;
    longitude: number;
    sort: "newest" | "oldest" | "label";
  },
) {
  const query = options.search.trim().toLocaleLowerCase();
  return entries
    .filter(
      (e) =>
        (!query || e.label.toLocaleLowerCase().includes(query)) &&
        (options.status === "all" ||
          e.completed === (options.status === "results")) &&
        (!options.siteOnly ||
          (e.latitude === options.latitude &&
            e.longitude === options.longitude)),
    )
    .sort((a, b) =>
      options.sort === "label"
        ? a.label.localeCompare(b.label)
        : options.sort === "oldest"
          ? a.savedAt.localeCompare(b.savedAt)
          : b.savedAt.localeCompare(a.savedAt),
    );
}
