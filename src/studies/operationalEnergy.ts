import {
  dispatchOperatingEnergy,
  OperatingPlanSchema,
} from "./operatingDispatch";
import { z } from "zod";
import { ResearchRequestSchema, validateResearchResponse } from "./researchApi";
import { parseStudyJson } from "./strictStudyJson";
import { validateResult } from "./studyWorkflow";
import { validateIntegratedResult } from "./integratedStudy";
import { stable } from "./studyComparisonGate";
import { weatherSha256 } from "./declaredWeatherAdapter";
import type { StudyRequest, StudyResult } from "./studyContract";
const finite = z.number().finite();
export const OperationalContextSchema = z
  .object({
    latitude: finite.min(-90).max(90),
    longitude: finite.min(-180).max(180),
    dcCapacityKwp: finite.positive(),
    inverterCapacityKw: finite.positive(),
    mode: z.enum(["powerplant", "ongrid", "offgrid"]),
    batteryCapacityKwh: finite.nonnegative().optional(),
    configurationSha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export type OperationalContext = z.infer<typeof OperationalContextSchema>;
export interface OperationalEnergy {
  dispatch?: Omit<ReturnType<typeof dispatchOperatingEnergy>, "samples">;
  financeEnergyKwh?: number;
  valuedSelfConsumedKwh?: number;
  studyId?: string;
  schemaVersion: "operational-energy-v1";
  source: "direct-study" | "integrated-batches";
  context: OperationalContext;
  year: number;
  exportKwh: number;
  importKwh: number;
  intervalCount: number;
  sourceSha256: string;
  validationStatus: "not_field_validated";
  usage: "engineering_scenario";
  acknowledgement: string;
  boundary: string;
}
const acknowledgement = z.string().trim().min(10).max(500);
function template(r: StudyRequest) {
  const copy = structuredClone(r);
  copy.label = "period";
  copy.weather.records = [];
  delete copy.weather.importTrace;
  for (const key of [
    "cellTemperatureSchedule",
    "soilingSchedule",
    "albedoSchedule",
    "auxiliarySchedule",
    "acAvailability",
    "acExportLimitSchedule",
  ] as const) {
    const schedule = copy.system[key];
    if (schedule) schedule.records = [];
  }
  return copy;
}
/** Never annualize a partial period. Never feed temperature or watts into kWh finance. */
export function adoptOperationalEnergy(
  value: unknown,
  contextValue: OperationalContext,
  ack: string,
): OperationalEnergy {
  const context = OperationalContextSchema.parse(contextValue);
  acknowledgement.parse(ack);
  if (new TextEncoder().encode(JSON.stringify(value)).length > 64 * 1024 * 1024)
    throw new Error("Operational input exceeds 64 MiB");
  const envelope =
    (value as { schemaVersion?: string })?.schemaVersion ===
    "operating-study-v1"
      ? z
          .object({
            schemaVersion: z.literal("operating-study-v1"),
            pvResults: z.unknown(),
            plan: OperatingPlanSchema,
          })
          .strict()
          .parse(value)
      : null;
  if (context.mode !== "powerplant" && !envelope)
    throw new Error(
      "On/off-grid adoption requires explicit interval load, grid and battery operating plan",
    );
  if (envelope && envelope.plan.mode !== context.mode)
    throw new Error("Operating mode mismatch");
  if (
    envelope &&
    context.batteryCapacityKwh !== undefined &&
    Math.abs(envelope.plan.battery.capacityKwh - context.batteryCapacityKwh) >
      1e-6
  )
    throw new Error("Project/dispatch battery capacity mismatch");
  const pvValue = envelope ? envelope.pvResults : value;
  const values = Array.isArray(pvValue) ? pvValue : [pvValue];
  if (values.length < 1 || values.length > 24)
    throw new Error("Require 1..24 validated energy results");
  const rows: { timestamp: string; exportW: number; importW: number }[] = [];
  let firstConfig = "",
    firstKind = "",
    interval = 0,
    capacity = 0,
    inverter = 0;
  for (const original of values) {
    let value = original;
    if (
      (value as { schemaVersion?: unknown })?.schemaVersion ===
      "research-api-result-v1"
    ) {
      const request = ResearchRequestSchema.parse(
        parseStudyJson(
          (value as { requestCanonicalJson: string }).requestCanonicalJson,
          8 * 1024 * 1024,
        ),
      );
      value = validateResearchResponse(value, request).result;
    }
    // The portable import is the model result, not an unverified summary or API envelope.
    const version = (value as { schemaVersion?: unknown })?.schemaVersion;
    let config: string,
      kind: string,
      request: StudyRequest,
      step: number,
      dc: number,
      ac: number;
    if (version === "pvlib-study-result-v1") {
      const r = validateResult(value);
      request = r.request;
      step = request.weather.intervalMinutes;
      kind = "direct-study";
      config = stable({
        request: template(request),
        engineVersion: r.manifest.engineVersion,
        models: r.manifest.models,
        dependencies: r.manifest.dependencies,
        workerSha256: r.manifest.workerSha256,
        requirementsSha256: r.manifest.requirementsSha256,
      });
      dc = request.system.arrayPdc0W / 1000;
      ac =
        (request.system.sandia?.Paco ??
          request.system.inverterPdc0W *
            (request.system.inverterEtaNom ?? 0.96)) / 1000;
      // Block sizing / tariff boundaries need their own explicit financial mapping.
      if (request.system.inverterBlocks || request.system.mpptInputs)
        throw new Error(
          "Use explicit integrated batches for multi-input adoption",
        );
      for (const s of r.samples) {
        const output = Number(s.acW),
          imp = Number(s.gridImportW ?? s.inverterSelfConsumptionW ?? 0);
        if (
          !Number.isFinite(output) ||
          output < 0 ||
          !Number.isFinite(imp) ||
          imp < 0
        )
          throw new Error("Invalid AC boundary");
        rows.push({ timestamp: s.timestamp, exportW: output, importW: imp });
      }
    } else if (version === "integrated-mppt-result-v1") {
      const r = validateIntegratedResult(value);
      request = r.plan.inputs[0].request;
      step = request.weather.intervalMinutes;
      kind = "integrated-batches";
      config = stable({
        algorithmVersion: r.algorithmVersion,
        pvlibVersion: r.pvlibVersion,
        workerSha256: r.workerSha256,
        requirementsSha256: r.requirementsSha256,
        childrenRuntime: r.children.map((c) => {
          const m = (c.result as StudyResult).manifest;
          return {
            id: c.id,
            engineVersion: m.engineVersion,
            models: m.models,
            dependencies: m.dependencies,
            workerSha256: m.workerSha256,
            requirementsSha256: m.requirementsSha256,
          };
        }),
        inverter: r.plan.inverter,
        inputs: r.plan.inputs.map((e) => ({
          id: e.id,
          request: template(e.request),
        })),
      });
      dc =
        r.plan.inputs.reduce((n, e) => n + e.request.system.arrayPdc0W, 0) /
        1000;
      ac = r.plan.inverter.Paco / 1000;
      rows.push(
        ...r.samples.map((s) => ({
          timestamp: s.timestamp,
          exportW: s.exportW,
          importW: s.importW,
        })),
      );
    } else
      throw new Error(
        "Only validated AC energy results accepted; temperature/static DC are not annual yield",
      );
    if (
      Math.abs(request.site.latitude - context.latitude) > 1e-6 ||
      Math.abs(request.site.longitude - context.longitude) > 1e-6
    )
      throw new Error("Project site mismatch");
    if (
      Math.abs(dc - context.dcCapacityKwp) >
        Math.max(0.001, context.dcCapacityKwp * 1e-6) ||
      Math.abs(ac - context.inverterCapacityKw) >
        Math.max(0.001, context.inverterCapacityKw * 1e-6)
    )
      throw new Error("Project capacity mismatch; no automatic scaling");
    if (
      firstConfig &&
      (config !== firstConfig || step !== interval || kind !== firstKind)
    )
      throw new Error("Batch configuration or interval mismatch");
    firstConfig = config;
    firstKind = kind;
    interval = step;
    capacity = dc;
    inverter = ac;
  }
  if (!capacity || !inverter || rows.length > 527040)
    throw new Error("Invalid energy resource bound");
  rows.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const dt = interval * 60000,
    start = Date.parse(rows[0].timestamp) - dt,
    end = Date.parse(rows.at(-1)!.timestamp),
    year = new Date(start).getUTCFullYear();
  if (
    start !== Date.UTC(year, 0, 1) ||
    end !== Date.UTC(year + 1, 0, 1) ||
    rows.some(
      (r, i) =>
        !Number.isFinite(Date.parse(r.timestamp)) ||
        (i > 0 &&
          Date.parse(r.timestamp) - Date.parse(rows[i - 1].timestamp) !== dt),
    )
  )
    throw new Error(
      "Require exactly one complete UTC calendar year, no gap/overlap or extrapolation",
    );
  const exportKwh =
      (rows.reduce((s, r) => s + r.exportW, 0) * interval) / 60000,
    importKwh = (rows.reduce((s, r) => s + r.importW, 0) * interval) / 60000;
  if (
    !Number.isFinite(exportKwh) ||
    exportKwh <= 0 ||
    !Number.isFinite(importKwh) ||
    importKwh < 0
  )
    throw new Error("Invalid annual energy");
  let operating: Partial<OperationalEnergy> = {};
  if (envelope) {
    if (envelope.plan.intervalMinutes !== interval)
      throw new Error("Dispatch/PV cadence mismatch");
    const { samples, ...ledger } = dispatchOperatingEnergy(envelope.plan, rows);
    // Initial stored energy is not newly generated PV. Conservatively exclude it from valued self-consumption.
    const valuedSelfKwh = Math.max(
      0,
      ledger.selfConsumedKwh - ledger.initialStoredKwh,
    );
    const financeEnergyKwh =
      context.mode === "powerplant"
        ? ledger.exportKwh
        : context.mode === "ongrid"
          ? ledger.exportKwh + valuedSelfKwh
          : valuedSelfKwh;
    operating = {
      dispatch: ledger,
      valuedSelfConsumedKwh: valuedSelfKwh,
      financeEnergyKwh,
      exportKwh: ledger.exportKwh,
      importKwh: ledger.importKwh,
    };
  }
  return {
    schemaVersion: "operational-energy-v1",
    source: firstKind as OperationalEnergy["source"],
    context,
    year,
    exportKwh,
    importKwh,
    intervalCount: rows.length,
    sourceSha256: weatherSha256(stable(envelope ?? values)),
    validationStatus: "not_field_validated",
    usage: "engineering_scenario",
    acknowledgement: ack,
    boundary:
      firstKind === "integrated-batches"
        ? "inverter_AC_export_before_unmodeled_plant_losses"
        : "study_AC_export_at_declared_modeled_boundary",
    ...operating,
  };
}
export function activeOperationalEnergy(
  receipt: OperationalEnergy | null,
  context: OperationalContext | null,
) {
  return receipt && context && stable(receipt.context) === stable(context)
    ? receipt
    : null;
}

/** Incremental PV benefit is not the household electricity bill: never subtract imports twice. */
export function operationalFinanceInputs(receipt: OperationalEnergy) {
  const annualEnergyKwh = receipt.financeEnergyKwh ?? receipt.exportKwh;
  return {
    annualEnergyKwh,
    pricing: {
      annualGridImportKwh:
        receipt.context.mode === "powerplant" ? receipt.importKwh : 0,
      ...(receipt.dispatch
        ? {
            selfConsumptionRatioPct:
              annualEnergyKwh > 0
                ? (100 * (receipt.valuedSelfConsumedKwh ?? 0)) / annualEnergyKwh
                : 0,
            offgridServedLoadKwhAnnual: annualEnergyKwh,
            offgridDailyLoadKwh: undefined,
          }
        : {}),
    },
  };
}
