import type { StudyResult } from "./studyContract";
export function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
// Mount selection is a scenario input. Only these documented geometry/thermal-input model-key differences
// may vary; transposition, thermal/electrical models, versions and hashes stay exact.
function comparisonModels(models: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(models).filter(
      ([key]) =>
        !["mounting", "rowIrradiance", "temperatureIrradiance"].includes(key),
    ),
  );
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
    stable(comparisonModels(a.manifest.models)) !==
      stable(comparisonModels(b.manifest.models)) ||
    a.manifest.workerSha256 !== b.manifest.workerSha256 ||
    a.manifest.requirementsSha256 !== b.manifest.requirementsSha256 ||
    stable(a.manifest.dependencies) !== stable(b.manifest.dependencies) ||
    a.manifest.engineVersion !== b.manifest.engineVersion
  )
    return "Different engine/models/dependencies / موتور یا نسخه متفاوت";
  return null;
}
