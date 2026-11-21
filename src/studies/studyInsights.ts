import type { StudyRequest, StudyResult } from "./studyContract";
import { comparisonReason, stable } from "./studyComparisonGate";

/** Read-only derived workflow diagnostics; not a physical engine or a data repair step. */
export const INSIGHTS_VERSION = "study-insights-v1";
export function periodCoverage(request: StudyRequest) {
  const dt = request.weather.intervalMinutes * 60000;
  const start = Date.parse(request.weather.records[0].timestamp) - dt,
    end = Date.parse(request.weather.records.at(-1)!.timestamp);
  const year = new Date(start).getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1),
    yearEnd = Date.UTC(year + 1, 0, 1);
  const months = new Map<string, number>();
  for (const r of request.weather.records) {
    const key = new Date(Date.parse(r.timestamp) - dt / 2)
      .toISOString()
      .slice(0, 7);
    months.set(key, (months.get(key) ?? 0) + 1);
  }
  const years = [];
  for (let y = year; y <= new Date(end - 1).getUTCFullYear(); y++) {
    const begin = Date.UTC(y, 0, 1),
      finish = Date.UTC(y + 1, 0, 1),
      hours = (Math.min(end, finish) - Math.max(start, begin)) / 3600000,
      calendarHours = (finish - begin) / 3600000;
    years.push({
      year: y,
      hours,
      calendarHours,
      fraction: hours / calendarHours,
    });
  }
  const calendarMonths = [];
  const first = new Date(start);
  for (
    let t = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1);
    t < end;
  ) {
    const date = new Date(t),
      next = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
      month = date.toISOString().slice(0, 7);
    const hours = (Math.min(end, next) - Math.max(start, t)) / 3600000,
      calendarHours = (next - t) / 3600000,
      intervals = months.get(month) ?? 0;
    calendarMonths.push({
      month,
      intervals,
      hours,
      midpointAssignedHours: (intervals * dt) / 3600000,
      calendarHours,
      fraction: hours / calendarHours,
    });
    t = next;
  }
  return {
    years,
    startUtc: new Date(start).toISOString(),
    endUtc: new Date(end).toISOString(),
    hours: (request.weather.records.length * dt) / 3600000,
    intervals: request.weather.records.length,
    completeUtcCalendarYear: start === yearStart && end === yearEnd,
    annualization: "none" as const,
    monthlyCoveragePolicy:
      "Elapsed UTC intersection; energy remains allocated by interval midpoint, not prorated.",
    months: calendarMonths,
  };
}

export function weatherDiagnostics(
  request: StudyRequest,
  result?: StudyResult,
) {
  if (
    result &&
    result.request !== request &&
    stable(result.request) !== stable(request)
  )
    throw new Error("Diagnostics result/request mismatch");
  const fields = [
    "ghiWm2",
    "dniWm2",
    "dhiWm2",
    "tempAirC",
    "windSpeedMs",
  ] as const;
  const checks = [
    {
      code: "zero_irradiance",
      description: "All three irradiance inputs zero; may be valid night.",
      count: 0,
      examples: [] as string[],
    },
    {
      code: "dhi_above_ghi",
      description:
        "DHI > GHI + 20 W/m²; investigate, do not automatically repair.",
      count: 0,
      examples: [] as string[],
    },
    {
      code: "repeated_weather",
      description:
        "Exact five-value weather repeat in runs of at least 6 intervals; may be legitimate.",
      count: 0,
      examples: [] as string[],
    },
  ];
  const add = (index: number, timestamp: string) => {
    const c = checks[index];
    c.count++;
    if (c.examples.length < 5) c.examples.push(timestamp);
  };
  const records = request.weather.records;
  for (const row of records) {
    if (row.ghiWm2 === 0 && row.dniWm2 === 0 && row.dhiWm2 === 0)
      add(0, row.timestamp);
    if (row.dhiWm2 > row.ghiWm2 + 20) add(1, row.timestamp);
  }
  for (let begin = 0; begin < records.length;) {
    let end = begin + 1;
    while (
      end < records.length &&
      fields.every((k) => records[end][k] === records[begin][k])
    )
      end++;
    if (end - begin >= 6)
      for (let i = begin; i < end; i++) add(2, records[i].timestamp);
    begin = end;
  }
  let closureEligible = 0;
  if (result) {
    checks.push({
      code: "approximate_closure",
      description:
        "Midpoint apparent zenith ≤80°; |GHI−DHI−DNI*cos(z)| > max(50 W/m², 10% GHI). Interval-average diagnostic, not a certified QC test.",
      count: 0,
      examples: [],
    });
    checks.push({
      code: "night_irradiance",
      description:
        "Midpoint apparent zenith ≥96° and any irradiance >20 W/m²; check timing/units.",
      count: 0,
      examples: [],
    });
    for (const [i, row] of records.entries()) {
      const z = result.samples[i]?.solarZenithDeg;
      if (typeof z !== "number" || !Number.isFinite(z))
        throw new Error("Diagnostics solar zenith unavailable");
      if (z <= 80) {
        closureEligible++;
        const residual =
          row.ghiWm2 - row.dhiWm2 - row.dniWm2 * Math.cos((z * Math.PI) / 180);
        if (Math.abs(residual) > Math.max(50, 0.1 * row.ghiWm2))
          add(3, row.timestamp);
      }
      if (z >= 96 && Math.max(row.ghiWm2, row.dniWm2, row.dhiWm2) > 20)
        add(4, row.timestamp);
    }
  }
  return {
    version: INSIGHTS_VERSION,
    policy:
      "Informational only; no data repair, rejection, sensor certification or field validation.",
    geometryStatus: result ? "available_from_result" : "unavailable_before_run",
    closureEligible: result ? closureEligible : null,
    checks,
  };
}
export function sourceLedger(request: StudyRequest, result?: StudyResult) {
  const s = request.system;
  const entries: {
    component: string;
    source: string;
    quality: string;
    count: number | null;
  }[] = [
    {
      component: "weather",
      source: request.weather.source,
      quality: request.weather.quality,
      count: request.weather.records.length,
    },
    {
      component: "equipment_parameters",
      ...request.parameterProvenance,
      count: null,
    },
  ];
  if(request.weather.importTrace){const m=JSON.parse(request.weather.importTrace.rawManifest);entries.push({component:"weatherImport",source:m.source,quality:m.quality,count:request.weather.records.length});}
  for (const [component, value, count] of [
    ["cellTemperatureSchedule",s.cellTemperatureSchedule,s.cellTemperatureSchedule?.records.length],
    ["pvsystTemperature",s.pvsystTemperature,undefined],
    ["dcCable",s.electrical?.dcCable,undefined],
    ["horizonProfile", s.horizonProfile, s.horizonProfile?.points.length],
    ["soilingSchedule", s.soilingSchedule, s.soilingSchedule?.records.length],
    ["albedoSchedule", s.albedoSchedule, s.albedoSchedule?.records.length],
    ["acCable",s.acCable,null],
    ["acAvailability", s.acAvailability, s.acAvailability?.records.length],
    ["auxiliarySchedule", s.auxiliarySchedule, s.auxiliarySchedule?.records.length],
    ["acExportLimitSchedule", s.acExportLimitSchedule, s.acExportLimitSchedule?.records.length],
  ] as const)
    if (value)
      entries.push({
        component,
        source: value.source,
        quality: value.quality,
        count: count ?? null,
      });
  for (const block of s.inverterBlocks??[])entries.push({component:`inverterBlock:${block.id}`,source:block.source,quality:block.quality,count:null});
  for (const input of s.mpptInputs??[]) {
    entries.push({component:`mppt:${input.id}`,source:input.source,quality:input.quality,count:null});
    if(input.electrical.dcCable)entries.push({component:`mpptCable:${input.id}`,source:input.electrical.dcCable.source,quality:input.electrical.dcCable.quality,count:null});
  }
  return {
    version: INSIGHTS_VERSION,
    authenticity:
      "Caller-declared sources; not independently verified or digitally certified.",
    entries,
    coverage: periodCoverage(request),
    assumptions: {
      timestampConvention: "interval_end averages; geometry at UTC midpoint",
      monthlyAllocation: "UTC midpoint; not civil local months",
      windHeightM: request.weather.windHeightM,
      albedo: s.albedoSchedule
        ? "schedule; retained scalar inactive"
        : "declared scalar",
      fixedGeometry: s.inverterBlocks ? "root reference diagnostic; actual geometry belongs to each inverter block" : s.mpptInputs ? "independent fixed input planes; root is reference diagnostic only" : s.tracking
        ? "tracker active; retained fixed tilt/azimuth inactive"
        : "fixed plane",
      rearSoiling:
        s.soilingSchedule && !s.rowIrradiance
          ? "retained rear ratio inactive"
          : "not inactive",
      thermalInputMode:s.cellTemperatureSchedule?"explicit cell temperature; thermal POA proxy inactive":s.pvsystTemperature?"PVsyst fixed efficiency/absorptance; 10 m wind fitted coefficients":"existing modeled thermal input",
      thermalIrradiance:
        s.rowIrradiance?.temperatureIrradiance ?? "front isolated POA",
      equipmentSourceScope: s.inverterBlocks ? "Each inverter block carries its own declared parameter source; full child requests/results retained. Root optical/thermal inputs are reference diagnostics only." :
        "Root model parameters inherit parameterProvenance; independent MPPT electrical parameters inherit their input source and optional cable source. No per-coefficient certification.",
    },
    execution: result
      ? {
          engineVersion: result.manifest.engineVersion,
          inputSha256: result.manifest.inputSha256,
          workerSha256: result.manifest.workerSha256,
          requirementsSha256: result.manifest.requirementsSha256,
          run: result.execution ?? null,
        }
      : null,
  };
}
export const ENERGY_METRICS = [
  "dcBeforeAdditionalLossWh",
  "dcWh",
  "acWh",
  "gridImportWh",
  "netGridWh",
  "inverterSelfConsumptionWh",
  "acBeforeExportLimitWh",
  "acExportLimitLossWh",
  "availabilityLossWh",
  "auxiliaryConsumptionWh",
  "transformerLossWh",
  "acCableLossWh",
  "availableMppWh",
  "mpptConstraintLossWh",
  "dcCableLossWh",
  "frontIncidentWhm2",
  "rearIncidentWhm2",
  "rearEffectiveWhm2",
  "horizonBlockedBeamWhm2",
  "soilingLossWhm2",
] as const;
type EnergyMetric = (typeof ENERGY_METRICS)[number];
function delta(
  metric: EnergyMetric,
  a: Partial<Record<EnergyMetric, number>>,
  b: Partial<Record<EnergyMetric, number>>,
) {
  const baseline = a[metric],
    other = b[metric],
    available = typeof baseline === "number" && typeof other === "number";
  return {
    metric,
    unit: metric.endsWith("Whm2") ? "Wh/m²" : "Wh",
    baseline: baseline ?? null,
    other: other ?? null,
    delta: available ? other - baseline : null,
    percent:
      available && baseline > 0 ? (100 * (other - baseline)) / baseline : null,
    status: !available
      ? "unavailable_missing_metric"
      : baseline <= 0
        ? "percentage_unavailable_nonpositive_baseline"
        : "available",
  };
}
export function compareStudies(a: StudyResult, b: StudyResult) {
  const reason = comparisonReason(a, b);
  if (reason) throw new Error(reason);
  const metrics = ENERGY_METRICS.filter(
    (k) => a.summary[k] !== undefined || b.summary[k] !== undefined,
  );
  const keys = [
    ...new Set([...a.monthly, ...b.monthly].map((m) => m.month)),
  ].sort();
  return {
    version: INSIGHTS_VERSION,
    direction: "other minus current",
    normalized: false,
    metrics: metrics.map((k) => delta(k, a.summary, b.summary)),
    monthly: keys.map((month) => {
      const am = a.monthly.find((m) => m.month === month),
        bm = b.monthly.find((m) => m.month === month);
      return {
        month,
        metrics: metrics.map((k) => delta(k, am ?? {}, bm ?? {})),
      };
    }),
  };
}
/** Fixed schema and numeric data only; no user labels/sources in CSV cells. */
function csv(rows: (string | number | null)[][]) {
  return rows
    .map((row) =>
      row
        .map((v) => {
          const text = v === null ? "" : String(v);
          const safe =
            typeof v === "string" && /^[\s]*[=+\-@\t\r]/.test(v)
              ? "'" + text
              : text;
          return `"${safe.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");
}
export function monthlyStudyCsv(result: StudyResult) {
  const metrics = ENERGY_METRICS.filter((k) =>
    result.monthly.some((m) => m[k] !== undefined),
  );
  const coverage = periodCoverage(result.request);
  return csv([
    [
      "monthUtc",
      "representedHours",
      "calendarMonthHours",
      "representedFraction",
      "energyMidpointAssignedHours",
      "energyStatus",
      ...metrics,
      "inputSha256",
      "engineVersion",
    ],
    ...coverage.months.map((c) => {
      const m = result.monthly.find((m) => c.month === m.month);
      return [
        c.month,
        c.hours,
        c.calendarHours,
        c.fraction,
        c.midpointAssignedHours,
        m
          ? "available_midpoint_allocation"
          : "unavailable_no_midpoint_intervals",
        ...metrics.map((k) => m?.[k] ?? null),
        result.manifest.inputSha256,
        result.manifest.engineVersion,
      ];
    }),
  ]);
}
export function comparisonStudyCsv(a: StudyResult, b: StudyResult) {
  const c = compareStudies(a, b);
  const rows = [
    ...c.metrics.map((m) => ({ period: "total", ...m })),
    ...c.monthly.flatMap((m) =>
      m.metrics.map((v) => ({ period: m.month, ...v })),
    ),
  ];
  return csv([
    [
      "periodUtc",
      "metric",
      "unit",
      "current",
      "other",
      "deltaOtherMinusCurrent",
      "percentOfPositiveCurrent",
      "status",
      "currentInputSha256",
      "otherInputSha256",
    ],
    ...rows.map((m) => [
      m.period,
      m.metric,
      m.unit,
      m.baseline,
      m.other,
      m.delta,
      m.percent,
      m.status,
      a.manifest.inputSha256,
      b.manifest.inputSha256,
    ]),
  ]);
}
export function studyInsights(request: StudyRequest, result?: StudyResult) {
  return {
    version: INSIGHTS_VERSION,
    coverage: periodCoverage(request),
    weather: weatherDiagnostics(request, result),
    sources: sourceLedger(request, result),
  };
}
