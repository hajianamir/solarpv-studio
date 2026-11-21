import { z } from "zod";
import {
  AdvancedDispatchSchema,
  runAdvancedDispatch,
} from "./advancedDispatch";
import {
  adoptOperationalEnergy,
  type OperationalContext,
} from "./operationalEnergy";
import { weatherSha256 } from "./declaredWeatherAdapter";
import { stable } from "./studyComparisonGate";
import type { StudyResult } from "./studyContract";
import { validateIntegratedResult } from "./integratedStudy";
type IntegratedResult = ReturnType<typeof validateIntegratedResult>;
export const AdvancedStudySchema = z
  .object({
    schemaVersion: z.literal("advanced-study-v1"),
    pvResults: z.unknown(),
    plan: AdvancedDispatchSchema,
  })
  .strict();
/** Validate full model evidence + annual coverage + site/equipment before any advanced analysis. */
export function runAdvancedStudy(raw: unknown, context: OperationalContext) {
  if (new TextEncoder().encode(JSON.stringify(raw)).length > 64 * 1024 * 1024)
    throw new Error("Advanced study exceeds 64 MiB");
  const request = AdvancedStudySchema.parse(raw);
  const baseline = adoptOperationalEnergy(
    {
      schemaVersion: "operating-study-v1",
      pvResults: request.pvResults,
      plan: request.plan.operatingPlan,
    },
    context,
    "Independent advanced analysis; NOT adopted into annual finance",
  );
  const values = Array.isArray(request.pvResults)
    ? request.pvResults
    : [request.pvResults];
  const rows = values
    .flatMap((item) => {
      if (item.schemaVersion === "pvlib-study-result-v1")
        return (item as StudyResult).samples.map((s) => ({
          timestamp: s.timestamp,
          exportW: Number(s.acW),
          importW: Number(s.gridImportW ?? s.inverterSelfConsumptionW ?? 0),
        }));
      if (item.schemaVersion === "integrated-mppt-result-v1")
        return (item as IntegratedResult).samples.map((s) => ({
          timestamp: s.timestamp,
          exportW: s.exportW,
          importW: s.importW,
        }));
      throw new Error(
        "Advanced analysis accepts direct or integrated result evidence, not API envelopes",
      );
    })
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const result = runAdvancedDispatch(request.plan, rows);
  return {
    schemaVersion: "advanced-study-result-v1",
    sourceSha256: weatherSha256(stable(request)),
    context,
    baselineReceipt: baseline,
    result,
    request,
    qualification:
      "Independent advanced scenario; main project finance is unchanged",
  };
}
