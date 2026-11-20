import type { StudyResult } from "./studyContract";
import { comparisonReason, stable } from "./studyComparisonGate";
export const EXPLORER_VERSION = "study-explorer-v1";
type Sample = StudyResult["samples"][number];
export type ExplorerOptions = {
  range?: { startUtc: string; endUtc: string };
  temperatureThresholdC?: number;
};
const BASE_POWER = {
  dcBeforeAdditionalLossWh: "dcBeforeAdditionalLossW",
  dcWh: "dcW",
  acWh: "acW",
};
function plant(r: StudyResult) {
  const s = r.request.system;
  return !!(
    s.transformer ||
    s.auxiliaryPowerW !== undefined ||
    s.acAvailability
  );
}
function numeric(row: Sample, key: string) {
  const v = row[key];
  if (typeof v !== "number" || !Number.isFinite(v))
    throw new Error(`Explorer evidence missing or nonnumeric: ${key}`);
  return v;
}
function powerMap(r: StudyResult) {
  const s = r.request.system;
  return {
    ...BASE_POWER,
    ...(plant(r)
      ? {
          availabilityLossWh: "availabilityLossW",
          auxiliaryConsumptionWh: "auxiliaryConsumptionW",
          transformerLossWh: "transformerLossW",
          gridImportWh: "gridImportW",
        }
      : {}),
    ...(s.sandia
      ? { inverterSelfConsumptionWh: "inverterSelfConsumptionW" }
      : {}),
    ...(s.acExportLimitW !== undefined
      ? {
          acBeforeExportLimitWh: "acBeforeExportLimitW",
          acExportLimitLossWh: "acExportLimitLossW",
        }
      : {}),
    ...(s.electrical
      ? {
          availableMppWh: "arrayMppW",
        }
      : {}),
    ...(s.electrical?.dcCable ? {dcCableLossWh:"dcCableLossW"} : {}),
    ...(s.rowIrradiance
      ? {
          frontIncidentWhm2: "poaGlobalWm2",
          rearIncidentWhm2: "rearIncidentWm2",
          rearEffectiveWhm2: "rearEffectiveIrradianceWm2",
        }
      : {}),
    ...(s.horizonProfile
      ? { horizonBlockedBeamWhm2: "horizonBlockedBeamWm2" }
      : {}),
    ...(s.soilingSchedule ? { soilingLossWhm2: "soilingLossWm2" } : {}),
  } as Record<string, string>;
}
function importPower(r: StudyResult, row: Sample) {
  return plant(r)
    ? numeric(row, "gridImportW")
    : r.request.system.sandia
      ? numeric(row, "inverterSelfConsumptionW")
      : null;
}
function mpptLoss(row: Sample, cableEnabled: boolean) {
  const mpp = numeric(row, "arrayMppW"),
    gap = mpp - numeric(row, "dcBeforeAdditionalLossW") - (cableEnabled ? numeric(row,"dcCableLossW") : 0);
  if (gap < -Math.max(1e-5, mpp * 1e-7))
    throw new Error("Explorer MPPT operating power exceeds available MPP");
  return Math.max(0, gap);
}
function energyRow(r: StudyResult, row: Sample) {
  const dt = r.request.weather.intervalMinutes / 60;
  const values: Record<string, number> = {};
  for (const [metric, key] of Object.entries(powerMap(r)))
    values[metric] = numeric(row, key) * dt;
  if (r.request.system.electrical)
    values.mpptConstraintLossWh = mpptLoss(row,Boolean(r.request.system.electrical?.dcCable)) * dt;
  const imported = importPower(r, row);
  if (imported !== null)
    values.netGridWh = (numeric(row, "acW") - imported) * dt;
  return values;
}
/** Enforced at the result/archive boundary, not left to a React render to throw. */
export function validateExplorerEvidence(r: StudyResult) {
  const s = r.request.system;
  const keys = [
    ...Object.values(powerMap(r)),
    "cellTemperatureC",
    ...(s.electrical ? ["dcOperatingState"] : []),
    ...(s.tracking ? ["trackerThetaDeg", "trackerActive"] : []),
    ...(s.albedoSchedule ? ["usedAlbedo"] : []),
    ...(s.soilingSchedule ? ["frontSoilingRatio", "rearSoilingRatio"] : []),
    ...(s.horizonProfile ? ["horizonBeamVisible"] : []),
    ...(plant(r) ? ["acPlantInputW"] : []),
  ];
  for (const [i, row] of r.samples.entries()) {
    for (const key of keys) numeric(row, key);
    if (s.electrical) mpptLoss(row,Boolean(s.electrical.dcCable));
    if (
      typeof row.midpointUtc !== "string" ||
      instant(row.midpointUtc) !==
        Date.parse(r.request.weather.records[i]?.timestamp) -
          r.request.weather.intervalMinutes * 30000
    )
      throw new Error(
        "Explorer midpoint evidence does not match weather interval",
      );
    if (
      s.electrical &&
      ![0, 1, 2, 3, 4].includes(numeric(row, "dcOperatingState"))
    )
      throw new Error("Explorer MPPT state invalid");
  }
}
function instant(text: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{3}(?:000)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(
      text,
    )
  )
    throw new Error("Explorer range requires seconds and explicit Z/offset");
  const n = Date.parse(text),
    day = new Date(text.slice(0, 10) + "T00:00:00Z");
  if (
    !Number.isFinite(n) ||
    !Number.isFinite(day.getTime()) ||
    day.toISOString().slice(0, 10) !== text.slice(0, 10)
  )
    throw new Error("Explorer range calendar date invalid");
  return n;
}
export function explorerSelection(
  r: StudyResult,
  options: ExplorerOptions = {},
) {
  const dt = r.request.weather.intervalMinutes * 60000,
    start = Date.parse(r.request.weather.records[0].timestamp) - dt,
    end = Date.parse(r.request.weather.records.at(-1)!.timestamp);
  const begin = options.range ? instant(options.range.startUtc) : start,
    finish = options.range ? instant(options.range.endUtc) : end;
  if (begin >= finish || begin < start || finish > end)
    throw new Error(
      "Explorer range must satisfy period start ≤ start < end ≤ period end; no clamp",
    );
  const threshold = options.temperatureThresholdC ?? null;
  if (
    threshold !== null &&
    (!Number.isFinite(threshold) || threshold < -100 || threshold > 200)
  )
    throw new Error(
      "Explorer temperature threshold must be finite within -100..200 °C",
    );
  const indices = r.samples.flatMap((row, i) => {
    const t = Date.parse(String(row.midpointUtc));
    return t >= begin && t < finish ? [i] : [];
  });
  return {
    startUtc: new Date(begin).toISOString(),
    endUtc: new Date(finish).toISOString(),
    rule: "midpoint in [start,end); whole intervals, no prorating",
    temperatureThresholdC: threshold,
    intervals: indices.length,
    representedHours: (indices.length * dt) / 3600000,
    status: indices.length ? "available" : "empty",
    indices,
  };
}
function statistics(values: number[]) {
  if (!values.length)
    return { status: "empty", min: null, max: null, mean: null };
  let min = Infinity,
    max = -Infinity,
    sum = 0;
  for (const v of values) {
    min = Math.min(min, v);
    max = Math.max(max, v);
    sum += v;
  }
  return { status: "available", min, max, mean: sum / values.length };
}
function sumValues(rows: Record<string, number>[]) {
  const sum: Record<string, number> = {};
  for (const row of rows)
    for (const [k, v] of Object.entries(row)) sum[k] = (sum[k] ?? 0) + v;
  return sum;
}
function balance(lhs: number | null, rhs: number | null) {
  if (lhs === null || rhs === null)
    return {
      status: "unavailable",
      lhsWh: lhs,
      rhsWh: rhs,
      residualWh: null,
      toleranceWh: null,
    };
  const residualWh = lhs - rhs,
    toleranceWh = 1e-6 * Math.max(1, Math.abs(lhs), Math.abs(rhs));
  return {
    status:
      Math.abs(residualWh) <= toleranceWh
        ? "within_arithmetic_tolerance"
        : "outside_arithmetic_tolerance",
    lhsWh: lhs,
    rhsWh: rhs,
    residualWh,
    toleranceWh,
  };
}
export function exploreStudy(r: StudyResult, options: ExplorerOptions = {}) {
  const selection = explorerSelection(r, options),
    rows = selection.indices.map((i) => r.samples[i]),
    s = r.request.system,
    dt = r.request.weather.intervalMinutes / 60;
  const energies = rows.map((row) => energyRow(r, row)),
    totals = sumValues(energies);
  const daily = new Map<
    string,
    {
      dateUtc: string;
      intervals: number;
      representedHours: number;
      energy: Record<string, number>;
    }
  >();
  rows.forEach((row, i) => {
    const dateUtc = new Date(String(row.midpointUtc))
      .toISOString()
      .slice(0, 10);
    const day = daily.get(dateUtc) ?? {
      dateUtc,
      intervals: 0,
      representedHours: 0,
      energy: {},
    };
    day.intervals++;
    day.representedHours += dt;
    day.energy = sumValues([day.energy, energies[i]]);
    daily.set(dateUtc, day);
  });
  const peak = (key: string, read: (row: Sample) => number) => {
    if (!rows.length)
      return {
        metric: key,
        status: "empty",
        valueW: null,
        midpointUtc: null,
        intervalEnd: null,
      };
    let winner = rows[0],
      value = read(winner);
    for (const row of rows) {
      const v = read(row);
      if (v > value) {
        value = v;
        winner = row;
      }
    }
    return {
      metric: key,
      status: "available",
      valueW: value,
      midpointUtc: winner.midpointUtc,
      intervalEnd: winner.timestamp,
    };
  };
  const peaks = [
    peak("dcW", (row) => numeric(row, "dcW")),
    peak("acW", (row) => numeric(row, "acW")),
  ];
  if (plant(r) || s.sandia)
    peaks.push(
      peak("gridImportW", (row) => importPower(r, row)!),
      peak("netGridW", (row) => numeric(row, "acW") - importPower(r, row)!),
    );
  const temperature = {
    ...statistics(rows.map((row) => numeric(row, "cellTemperatureC"))),
    unit: "°C",
    thresholdC: selection.temperatureThresholdC,
    hoursStrictlyAbove:
      selection.temperatureThresholdC === null || !rows.length
        ? null
        : rows.filter(
            (row) =>
              numeric(row, "cellTemperatureC") >
              selection.temperatureThresholdC!,
          ).length * dt,
  };
  let eventCount = 0,
    longestHours = 0,
    activeHours = 0;
  const eventExamples: {
    firstMidpointUtc: string;
    lastMidpointUtc: string;
    intervals: number;
    hours: number;
    lossWh: number;
  }[] = [];
  if (s.acExportLimitW !== undefined) {
    let run: (typeof eventExamples)[number] | null = null;
    const flush = () => {
      if (!run) return;
      eventCount++;
      longestHours = Math.max(longestHours, run.hours);
      if (eventExamples.length < 5) eventExamples.push(run);
      run = null;
    };
    for (const row of rows) {
      const loss = numeric(row, "acExportLimitLossW");
      if (loss > 1e-6) {
        activeHours += dt;
        if (!run)
          run = {
            firstMidpointUtc: String(row.midpointUtc),
            lastMidpointUtc: String(row.midpointUtc),
            intervals: 0,
            hours: 0,
            lossWh: 0,
          };
        run.lastMidpointUtc = String(row.midpointUtc);
        run.intervals++;
        run.hours += dt;
        run.lossWh += loss * dt;
      } else flush();
    }
    flush();
  }
  const exportCap = {
    status:
      s.acExportLimitW === undefined
        ? "unavailable_model_disabled"
        : selection.status,
    thresholdW: 1e-6,
    capW: s.acExportLimitW ?? null,
    eventCount:
      s.acExportLimitW === undefined || !rows.length ? null : eventCount,
    hours: s.acExportLimitW === undefined || !rows.length ? null : activeHours,
    longestHours:
      s.acExportLimitW === undefined || !rows.length ? null : longestHours,
    lossWh: totals.acExportLimitLossWh ?? null,
    examples: eventExamples,
  };
  const stateLabels = [
    "dark",
    "MPP",
    "voltage boundary",
    "current boundary",
    "no feasible MPPT point",
  ];
  const mppt = s.electrical
    ? {
        status: selection.status,
        states: stateLabels.map((label, state) => {
          const chosen = rows.filter(
            (row) => numeric(row, "dcOperatingState") === state,
          );
          return {
            state,
            label,
            intervals: chosen.length,
            hours: chosen.length * dt,
            dcWh: chosen.length
              ? chosen.reduce((sum, row) => sum + numeric(row, "dcW") * dt, 0)
              : null,
            constraintLossWh: chosen.length
              ? chosen.reduce((sum, row) => sum + mpptLoss(row,Boolean(r.request.system.electrical?.dcCable)) * dt, 0)
              : null,
          };
        }),
      }
    : { status: "unavailable_model_disabled", states: [] };
  let totalActiveStepTravelDeg = 0,
    maxActiveStepDeg = 0,
    activePairs = 0;
  if (s.tracking)
    for (let i = 1; i < rows.length; i++)
      if (
        numeric(rows[i - 1], "trackerActive") === 1 &&
        numeric(rows[i], "trackerActive") === 1
      ) {
        const step = Math.abs(
          numeric(rows[i], "trackerThetaDeg") -
            numeric(rows[i - 1], "trackerThetaDeg"),
        );
        totalActiveStepTravelDeg += step;
        maxActiveStepDeg = Math.max(maxActiveStepDeg, step);
        activePairs++;
      }
  const tracker = s.tracking
    ? {
        status: selection.status,
        theta: statistics(rows.map((row) => numeric(row, "trackerThetaDeg"))),
        activeHours:
          rows.filter((row) => numeric(row, "trackerActive") === 1).length * dt,
        parkedHours:
          rows.filter((row) => numeric(row, "trackerActive") === 0).length * dt,
        activePairs,
        totalActiveStepTravelDeg: rows.length ? totalActiveStepTravelDeg : null,
        maxActiveStepDeg: activePairs ? maxActiveStepDeg : null,
      }
    : { status: "unavailable_model_disabled" };
  const environment = {
    albedo: s.albedoSchedule
      ? statistics(rows.map((row) => numeric(row, "usedAlbedo")))
      : { status: "unavailable_schedule_disabled" },
    frontSoiling: s.soilingSchedule
      ? statistics(rows.map((row) => numeric(row, "frontSoilingRatio")))
      : { status: "unavailable_schedule_disabled" },
    rearSoiling:
      s.soilingSchedule && s.rowIrradiance
        ? statistics(rows.map((row) => numeric(row, "rearSoilingRatio")))
        : {
            status: s.soilingSchedule
              ? "inactive_without_rows"
              : "unavailable_schedule_disabled",
          },
    horizon: s.horizonProfile
      ? {
          status: selection.status,
          blockedHours: rows.length
            ? rows.filter(
                (row) =>
                  numeric(row, "horizonBeamVisible") === 0 &&
                  numeric(row, "horizonBlockedBeamWm2") > 0,
              ).length * dt
            : null,
          blockedBeamWhm2: totals.horizonBlockedBeamWhm2 ?? null,
        }
      : { status: "unavailable_model_disabled" },
    soilingLossWhm2: totals.soilingLossWhm2 ?? null,
  };
  const imported =
    rows.length && (plant(r) || s.sandia)
      ? rows.reduce((sum, row) => sum + importPower(r, row)! * dt, 0)
      : null;
  const ac = totals.acWh ?? null,
    net = totals.netGridWh ?? null;
  const additionalLossWh = rows.length
    ? totals.dcBeforeAdditionalLossWh - totals.dcWh
    : null;
  const capLoss =
    totals.acExportLimitLossWh ?? (s.acExportLimitW === undefined ? 0 : null);
  const input =
    plant(r) && rows.length
      ? rows.reduce((sum, row) => sum + numeric(row, "acPlantInputW") * dt, 0)
      : null;
  const plantLoss =
    plant(r) && rows.length
      ? totals.availabilityLossWh +
        totals.auxiliaryConsumptionWh +
        totals.transformerLossWh
      : null;
  const balances = {
    note: "Arithmetic bookkeeping, not measured plant validation. Do not subtract inverter self-consumption again. No hardware import is inferred for baseline PVWatts.",
    componentsWh: {
      ...Object.fromEntries(
        Object.entries(totals).filter(([key]) => key.endsWith("Wh")),
      ),
      additionalDcLossWh: additionalLossWh,
      totalImportWh: imported,
      acPlantInputWh: input,
    },
    netExportMinusImport: balance(
      net,
      ac !== null && imported !== null ? ac - imported : null,
    ),
    exportCap: balance(
      totals.acBeforeExportLimitWh ?? null,
      ac !== null && capLoss !== null && s.acExportLimitW !== undefined
        ? ac + capLoss
        : null,
    ),
    dcAdditional: balance(
      totals.dcWh ?? null,
      rows.length
        ? totals.dcBeforeAdditionalLossWh * (1 - s.additionalDcLossPct / 100)
        : null,
    ),
    plant: balance(
      input,
      net !== null && plantLoss !== null && capLoss !== null
        ? net + plantLoss + capLoss
        : null,
    ),
  };
  return {
    version: EXPLORER_VERSION,
    inputSha256: r.manifest.inputSha256,
    engineVersion: r.manifest.engineVersion,
    provenance: {
      workerSha256: r.manifest.workerSha256,
      requirementsSha256: r.manifest.requirementsSha256,
      execution: r.execution ?? null,
      authenticity:
        "Derived from declared result; not independently certified.",
    },
    selection: { ...selection, indices: undefined },
    limitations: [
      "Selected interval means, not instantaneous extrema; no partial interval energy prorating or annualization.",
      "Temperature threshold is user-declared diagnostic, not equipment protection or damage.",
      "Tracker travel is ideal geometric sampled active-step travel only, not actuator speed, cycles, stow, wear or reliability.",
      "Export-cap events exclude upstream inverter clipping; MPPT states are ideal static model states, not physical outages.",
    ],
    totalsWhOrWhm2: rows.length ? totals : null,
    daily: [...daily.values()],
    peaks,
    temperature,
    exportCap,
    mppt,
    tracker,
    environment,
    balances,
  };
}
/** Scalar leaves and array lengths only: no repeated object/array payloads. */
export function scenarioInputDiff(a: StudyResult, b: StudyResult) {
  const reason = comparisonReason(a, b);
  if (reason) throw new Error(reason);
  type Leaf = string | number | boolean | null;
  const flatten = (value: unknown, path: string, out: Map<string, Leaf>) => {
    if (Array.isArray(value)) {
      out.set(path + ".length", value.length);
      value.forEach((v, i) => flatten(v, `${path}[${i}]`, out));
    } else if (value !== null && typeof value === "object") {
      for (const [k, v] of Object.entries(value))
        flatten(v, path ? `${path}.${k}` : k, out);
    } else out.set(path, value as Leaf);
  };
  const left = new Map<string, Leaf>(),
    right = new Map<string, Leaf>();
  flatten(a.request, "", left);
  flatten(b.request, "", right);
  const changes = [...new Set([...left.keys(), ...right.keys()])]
    .sort()
    .flatMap((path) => {
      const currentPresent = left.has(path),
        otherPresent = right.has(path);
      const current = left.get(path) ?? null,
        other = right.get(path) ?? null;
      return currentPresent === otherPresent &&
        stable(current) === stable(other)
        ? []
        : [{ path, currentPresent, otherPresent, current, other }];
    });
  return {
    version: EXPLORER_VERSION,
    direction: "current inputs to other inputs",
    note: "Includes inactive parameters and source declarations. Differences do not prove causal effects; capacities are not normalized.",
    currentInputSha256: a.manifest.inputSha256,
    otherInputSha256: b.manifest.inputSha256,
    changes,
  };
}
function csv(rows: (string | number | null)[][]) {
  return rows
    .map((row) =>
      row
        .map((v) => {
          let text = v === null ? "" : String(v);
          if (typeof v === "string" && /^\s*[=+\-@\t\r]/.test(v))
            text = "'" + text;
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");
}
export function dailyExplorerCsv(
  r: StudyResult,
  options: ExplorerOptions = {},
) {
  const data = exploreStudy(r, options),
    metrics = Object.keys(powerMap(r));
  if (r.request.system.electrical) metrics.push("mpptConstraintLossWh");
  if(r.request.system.electrical?.dcCable) metrics.push("dcCableLossWh");
  if (plant(r) || r.request.system.sandia) metrics.push("netGridWh");
  return csv([
    [
      "dateUtc",
      "intervals",
      "representedHours",
      ...metrics,
      "inputSha256",
      "selectionStartUtc",
      "selectionEndUtc",
    ],
    ...data.daily.map((d) => [
      d.dateUtc,
      d.intervals,
      d.representedHours,
      ...metrics.map((k) => d.energy[k] ?? null),
      r.manifest.inputSha256,
      data.selection.startUtc,
      data.selection.endUtc,
    ]),
  ]);
}
export function selectedSamplesCsv(
  r: StudyResult,
  options: ExplorerOptions = {},
) {
  const selection = explorerSelection(r, options),
    columns = Object.keys(r.samples[0]);
  return csv([
    ["inputSha256", "selectionStartUtc", "selectionEndUtc", ...columns],
    ...selection.indices.map((i) => [
      r.manifest.inputSha256,
      selection.startUtc,
      selection.endUtc,
      ...columns.map((k) => r.samples[i][k] ?? null),
    ]),
  ]);
}
const escape = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function explorerHtml(r: StudyResult, options: ExplorerOptions = {}) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Study result explorer</title><style>body{font:15px system-ui;max-width:1000px;margin:2em auto}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><h1>Study result explorer / بازبینی نتیجه</h1><p>Read-only selected interval diagnostics. Not field validated, certified protection, wear or annual yield. Keep original JSON/archive; this is not a new execution.</p><h2>${escape(r.request.label)}</h2><pre>${escape(JSON.stringify(exploreStudy(r, options), null, 2))}</pre></html>`;
}
