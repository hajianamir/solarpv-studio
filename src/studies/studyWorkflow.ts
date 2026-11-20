import {exploreStudy,scenarioInputDiff,validateExplorerEvidence} from './studyExplorer';
import {stable,comparisonReason} from './studyComparisonGate';
export {stable,comparisonReason} from './studyComparisonGate';
import {studyInsights,compareStudies} from './studyInsights';
import {
  StudyRequestSchema,
  AvailabilityRecordSchema,
  SoilingRecordSchema,
  AlbedoRecordSchema,
  HorizonPointSchema,
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
/** Availability CSV intentionally accepts only plain, unquoted two-column records. */
export function parseAvailabilityCsv(
  text: string,
): NonNullable<StudyRequest["system"]["acAvailability"]>["records"] {
  if (new TextEncoder().encode(text).length > 8 * 1024 * 1024)
    throw new Error("Availability CSV exceeds 8 MiB");
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (lines.at(-1) === "") lines.pop();
  if (
    lines[0] !== "timestamp,availableFraction" ||
    lines.length < 3 ||
    lines.length > 8785
  )
    throw new Error(
      "Availability CSV requires timestamp,availableFraction and 2..8784 rows",
    );
  return lines.slice(1).map((line, i) => {
    const cells = line.split(",");
    if (
      cells.length !== 2 ||
      !cells[0] ||
      !/^\s*(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?\s*$/.test(cells[1])
    )
      throw new Error(
        `Availability CSV row ${i + 2}: explicit timestamp and fraction required; missing is not zero`,
      );
    return AvailabilityRecordSchema.parse({
      timestamp: cells[0],
      availableFraction: Number(cells[1]),
    });
  });
}
function plainEnvironmentCsv<T>(
  text: string,
  columns: string[],
  schema: z.ZodType<T>,
  maximum: number,
): T[] {
  if (new TextEncoder().encode(text).length > 8 * 1024 * 1024)
    throw new Error("Environment CSV exceeds 8 MiB");
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (lines.at(-1) === "") lines.pop();
  if (
    lines[0] !== columns.join(",") ||
    lines.length < 3 ||
    lines.length > maximum + 1
  )
    throw new Error("Environment CSV header/row count invalid");
  return lines.slice(1).map((line, i) => {
    const cells = line.split(",");
    if (cells.length !== columns.length || cells.some((c) => !c.trim()))
      throw new Error(`Environment CSV row ${i + 2}: missing is not zero`);
    const obj: Record<string, unknown> = {};
    for (const [j, k] of columns.entries()) {
      if (k === "timestamp") obj[k] = cells[j];
      else {
        if (
          !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(
            cells[j].trim(),
          )
        )
          throw new Error("Environment CSV invalid number");
        obj[k] = Number(cells[j]);
      }
    }
    return schema.parse(obj);
  });
}
export const parseSoilingCsv = (text: string) =>
  plainEnvironmentCsv(
    text,
    ["timestamp", "frontRatio", "rearRatio"],
    SoilingRecordSchema,
    8784,
  );
export const parseAlbedoCsv = (text: string) =>
  plainEnvironmentCsv(text, ["timestamp", "albedo"], AlbedoRecordSchema, 8784);
export const parseHorizonCsv = (text: string) =>
  plainEnvironmentCsv(
    text,
    ["azimuthDeg", "elevationDeg"],
    HorizonPointSchema,
    361,
  );
export function weatherReview(request: StudyRequest) {
  return WEATHER_COLUMNS.slice(1).map((key) => {
    const values = request.weather.records.map((row) => Number(row[key]));
    return { key, min: Math.min(...values), max: Math.max(...values) };
  });
}
const energy = z.object({
  dcBeforeAdditionalLossWh: z.number().finite().nonnegative(),
  dcWh: z.number().finite().nonnegative(),
  acWh: z.number().finite().nonnegative(),
  horizonBlockedBeamWhm2: z.number().finite().nonnegative().optional(),
  soilingLossWhm2: z.number().finite().nonnegative().optional(),
  availabilityLossWh: z.number().finite().nonnegative().optional(),
  auxiliaryConsumptionWh: z.number().finite().nonnegative().optional(),
  transformerLossWh: z.number().finite().nonnegative().optional(),
  gridImportWh: z.number().finite().nonnegative().optional(),
  inverterSelfConsumptionWh: z.number().finite().nonnegative().optional(),
  netGridWh: z.number().finite().optional(),
  acBeforeExportLimitWh: z.number().finite().nonnegative().optional(),
  acExportLimitLossWh: z.number().finite().nonnegative().optional(),
  availableMppWh: z.number().finite().nonnegative().optional(),
  mpptConstraintLossWh: z.number().finite().nonnegative().optional(),
  frontIncidentWhm2: z.number().finite().nonnegative().optional(),
  rearIncidentWhm2: z.number().finite().nonnegative().optional(),
  rearEffectiveWhm2: z.number().finite().nonnegative().optional(),
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
    electricalChecks: z.record(z.string(), z.number().finite()).optional(),
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
  if(r.samples.some(row=>typeof row.solarZenithDeg!=='number'||row.solarZenithDeg<0||row.solarZenithDeg>180))throw new Error('Invalid solar zenith for study diagnostics');
  if (
    r.request.system.skyDiffuseModel === "perez" &&
    !r.manifest.models.transposition?.startsWith("perez allsitescomposite1990")
  )
    throw new Error("Perez manifest mismatch");
  if (
    r.request.system.physicalIam &&
    !r.manifest.models.beamIam?.startsWith("physical Fresnel-Bouguer")
  )
    throw new Error("Physical IAM manifest mismatch");
  if (
    r.request.system.physicalIam &&
    r.samples.some((sample) =>
      [
        "beamIam",
        ...(r.request.system.rowIrradiance ? ["rearBeamIam"] : []),
      ].some(
        (k) =>
          typeof sample[k] !== "number" ||
          Number(sample[k]) < 0 ||
          Number(sample[k]) > 1.00000001,
      ),
    )
  )
    throw new Error("Invalid physical IAM components");
  if (r.request.system.sapmSpectral) {
    const p = r.request.system.sapmSpectral;
    if (!r.manifest.models.spectral?.startsWith("sapm A0..A4"))
      throw new Error("Spectral manifest mismatch");
    for (const sample of r.samples) {
      const input = sample.spectralInputIrradianceWm2,
        factor = sample.spectralFactor,
        am = sample.absoluteAirmass,
        active = sample.spectralActive,
        out = sample.effectiveIrradianceWm2;
      if (
        typeof input !== "number" ||
        typeof factor !== "number" ||
        typeof am !== "number" ||
        typeof out !== "number" ||
        input < 0 ||
        factor < 0 ||
        factor > 2 ||
        Math.abs(input * factor - out) > 1e-6 * Math.max(1, out) ||
        (input > 0
          ? active !== 1 ||
            am < p.minAbsoluteAirmass ||
            am > p.maxAbsoluteAirmass ||
            factor <= 0
          : active !== 0 || am !== 0 || factor !== 0)
      )
        throw new Error("Invalid spectral components/domain");
    }
  }
  if (
    r.request.system.horizonProfile ||
    r.request.system.soilingSchedule ||
    r.request.system.albedoSchedule
  ) {
    const sys = r.request.system,
      dt = r.request.weather.intervalMinutes / 60;
    const close = (a: number, b: number) =>
      Number.isFinite(a) &&
      Number.isFinite(b) &&
      Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
    const energies: Record<
      string,
      { sample: string; sum: number; months: Map<string, number> }
    > = {};
    if (sys.horizonProfile) {
      if (!r.manifest.models.horizon?.startsWith("linear closed azimuth"))
        throw new Error("Environment horizon manifest missing");
      energies.horizonBlockedBeamWhm2 = {
        sample: "horizonBlockedBeamWm2",
        sum: 0,
        months: new Map(),
      };
    }
    if (sys.soilingSchedule) {
      if (!r.manifest.models.soiling?.startsWith("explicit front/rear"))
        throw new Error("Environment soiling manifest missing");
      energies.soilingLossWhm2 = {
        sample: "soilingLossWm2",
        sum: 0,
        months: new Map(),
      };
    }
    if (
      sys.albedoSchedule &&
      !r.manifest.models.albedo?.startsWith("explicit interval albedo")
    )
      throw new Error("Environment albedo manifest missing");
    for (const [i, row] of r.samples.entries()) {
      const required = [
        ...(sys.albedoSchedule ? ["usedAlbedo"] : []),
        ...(sys.horizonProfile
          ? [
              "horizonElevationDeg",
              "horizonBeamVisible",
              "horizonBlockedBeamWm2",
            ]
          : []),
        ...(sys.soilingSchedule
          ? [
              "frontSoilingRatio",
              "rearSoilingRatio",
              "soilingInputIrradianceWm2",
              "soilingLossWm2",
            ]
          : []),
      ];
      if (required.some((k) => typeof row[k] !== "number"))
        throw new Error("Environment numeric components missing");
      if (
        sys.albedoSchedule &&
        !close(Number(row.usedAlbedo), sys.albedoSchedule.records[i]?.albedo)
      )
        throw new Error("Environment albedo record mismatch");
      if (sys.horizonProfile) {
        const h = Number(row.horizonElevationDeg),
          v = Number(row.horizonBeamVisible),
          blocked = Number(row.horizonBlockedBeamWm2),
          direct = Number(row.poaDirectWm2);
        const original = Math.max(
          0,
          r.request.weather.records[i]?.dniWm2 *
            Math.cos((Number(row.aoiDeg) * Math.PI) / 180),
        );
        if (
          !Number.isFinite(h) ||
          h < 0 ||
          h > 85 ||
          v !== (90 - Number(row.solarZenithDeg) > h ? 1 : 0) ||
          blocked < 0 ||
          !close(blocked, original * (1 - v)) ||
          !close(direct, original * v)
        )
          throw new Error("Environment horizon components invalid");
      }
      if (sys.soilingSchedule) {
        const sr = sys.soilingSchedule.records[i],
          front = sys.rowIrradiance
            ? Number(row.frontEffectiveIrradianceWm2)
            : Number(row.poaDirectWm2) * Number(row.beamIam) +
              Number(row.poaSkyDiffuseWm2) +
              Number(row.poaGroundDiffuseWm2),
          rear = sys.rowIrradiance ? Number(row.rearEffectiveIrradianceWm2) : 0;
        const input = Number(row.soilingInputIrradianceWm2),
          loss = Number(row.soilingLossWm2);
        if (
          !close(Number(row.frontSoilingRatio), sr?.frontRatio) ||
          !close(Number(row.rearSoilingRatio), sr?.rearRatio) ||
          loss < 0 ||
          !close(input, front + rear) ||
          !close(
            loss,
            front * (1 - sr.frontRatio) + rear * (1 - sr.rearRatio),
          ) ||
          !close(
            input - loss,
            Number(
              sys.sapmSpectral
                ? row.spectralInputIrradianceWm2
                : row.effectiveIrradianceWm2,
            ),
          )
        )
          throw new Error("Environment soiling components invalid");
      }
      for (const e of Object.values(energies)) {
        const value = Number(row[e.sample]) * dt;
        const month = String(row.midpointUtc).slice(0, 7);
        e.sum += value;
        e.months.set(month, (e.months.get(month) ?? 0) + value);
      }
    }
    for (const [key, e] of Object.entries(energies)) {
      if (
        !close(
          Number((r.summary as unknown as Record<string, number>)[key]),
          e.sum,
        ) ||
        r.monthly.length !== e.months.size ||
        r.monthly.some(
          (m) =>
            !close(
              Number((m as unknown as Record<string, number>)[key]),
              e.months.get(m.month) ?? NaN,
            ),
        )
      )
        throw new Error("Environment integrated irradiance invalid");
    }
  }
  const plantActive = Boolean(
    r.request.system.transformer ||
    r.request.system.auxiliaryPowerW !== undefined ||
    r.request.system.acAvailability,
  );
  if (plantActive) {
    const sys = r.request.system,
      dt = r.request.weather.intervalMinutes / 60;
    const close = (a: number, b: number) =>
      Number.isFinite(a) &&
      Number.isFinite(b) &&
      Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
    const keys = [
      "availabilityLossWh",
      "auxiliaryConsumptionWh",
      "transformerLossWh",
      "gridImportWh",
      "netGridWh",
      "acWh",
    ] as const;
    const sums = Object.fromEntries(keys.map((k) => [k, 0]));
    const months = new Map<string, Record<string, number>>();
    if (
      !r.manifest.models.acAvailability ||
      !r.manifest.models.auxiliary ||
      !r.manifest.models.transformer
    )
      throw new Error("AC plant manifest missing");
    for (const [i, row] of r.samples.entries()) {
      if (
        [
          "acPlantInputW",
          "acAvailabilityFraction",
          "availabilityLossW",
          "auxiliaryConsumptionW",
          "transformerLossW",
          "gridImportW",
          "acW",
        ].some((k) => typeof row[k] !== "number")
      )
        throw new Error("AC plant components missing");
      const input = Number(row.acPlantInputW),
        fraction = Number(row.acAvailabilityFraction),
        availableLoss = Number(row.availabilityLossW),
        aux = Number(row.auxiliaryConsumptionW),
        tloss = Number(row.transformerLossW),
        imported = Number(row.gridImportW),
        exported = Number(row.acW);
      const output = input - availableLoss - aux - tloss;
      if (
        !close(
          fraction,
          sys.acAvailability?.records[i]?.availableFraction ?? 1,
        ) ||
        !close(availableLoss, Math.max(0, input) * (1 - fraction)) ||
        !close(aux, sys.auxiliaryPowerW ?? 0) ||
        tloss < 0 ||
        imported < 0 ||
        exported < 0 ||
        !close(imported, Math.max(0, -output)) ||
        !close(
          exported,
          Math.min(Math.max(0, output), sys.acExportLimitW ?? Infinity),
        ) ||
        (sys.sandia && !close(input, Number(row.inverterNetAcW)))
      )
        throw new Error("AC plant power accounting invalid");
      if (
        (!sys.sandia && (input < 0 || input > Number(row.dcW) + 1e-5)) ||
        (sys.acExportLimitW !== undefined &&
          !close(Number(row.acBeforeExportLimitW), Math.max(0, output)))
      )
        throw new Error("AC plant upstream/cap boundary invalid");
      if (sys.transformer) {
        const t = sys.transformer;
        if (
          Math.abs(output) > t.ratingVa + 1e-5 ||
          !close(
            tloss,
            t.ratingVa * t.noLoadLossFraction +
              (t.loadLossFraction * output * output) / t.ratingVa,
          )
        )
          throw new Error("AC plant transformer balance invalid");
      } else if (tloss !== 0)
        throw new Error("AC plant disabled transformer loss");
      const values = {
        availabilityLossWh: availableLoss * dt,
        auxiliaryConsumptionWh: aux * dt,
        transformerLossWh: tloss * dt,
        gridImportWh: imported * dt,
        netGridWh: (exported - imported) * dt,
        acWh: exported * dt,
      };
      const month = String(row.midpointUtc).slice(0, 7);
      const bucket =
        months.get(month) ?? Object.fromEntries(keys.map((k) => [k, 0]));
      for (const k of keys) {
        sums[k] += values[k];
        bucket[k] += values[k];
      }
      months.set(month, bucket);
    }
    if (
      keys.some((k) => !close(Number(r.summary[k]), sums[k])) ||
      r.monthly.length !== months.size ||
      r.monthly.some(
        (m) =>
          !months.has(m.month) ||
          keys.some((k) => !close(Number(m[k]), months.get(m.month)![k])),
      )
    )
      throw new Error("AC plant integrated energy invalid");
  }
  if (r.request.system.sandia) {
    const inv = r.request.system.sandia,
      dt = r.request.weather.intervalMinutes / 60;
    const close = (a: number, b: number) =>
      Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
    const balance = (row: {
      acWh: number;
      inverterSelfConsumptionWh?: number;
      netGridWh?: number;
      gridImportWh?: number;
    }) =>
      row.inverterSelfConsumptionWh !== undefined &&
      row.netGridWh !== undefined &&
      close(
        row.netGridWh,
        row.acWh -
          (plantActive
            ? (row.gridImportWh ?? NaN)
            : row.inverterSelfConsumptionWh),
      );
    const monthlyImports = new Map<string, number>();
    let exported = 0,
      imported = 0;
    if (
      !r.manifest.models.ac?.startsWith("sandia voltage-dependent") ||
      !balance(r.summary) ||
      r.monthly.some((m) => !balance(m))
    )
      throw new Error("Invalid Sandia energy/manifest");
    for (const sample of r.samples) {
      const net = sample.inverterNetAcW,
        own = sample.inverterSelfConsumptionW,
        dc = sample.dcW,
        ac = sample.acW;
      if (
        typeof net !== "number" ||
        typeof own !== "number" ||
        typeof dc !== "number" ||
        typeof ac !== "number" ||
        own < 0 ||
        net > Math.min(inv.Paco, dc) + 1e-5 ||
        !close(own, Math.max(0, -net)) ||
        (!plantActive &&
          !close(
            ac,
            Math.min(
              Math.max(0, net),
              r.request.system.acExportLimitW ?? Infinity,
            ),
          ))
      )
        throw new Error("Invalid Sandia operating output");
      exported += ac * dt;
      imported += own * dt;
      const month = String(sample.midpointUtc).slice(0, 7);
      monthlyImports.set(month, (monthlyImports.get(month) ?? 0) + own * dt);
    }
    if (
      !close(exported, r.summary.acWh) ||
      !close(imported, r.summary.inverterSelfConsumptionWh!) ||
      r.monthly.length !== monthlyImports.size ||
      r.monthly.some(
        (m) =>
          !monthlyImports.has(m.month) ||
          !close(m.inverterSelfConsumptionWh!, monthlyImports.get(m.month)!),
      )
    )
      throw new Error("Invalid Sandia integrated energy");
  }
  if (
    r.request.system.faiman &&
    !r.manifest.models.temperature?.startsWith("faiman;")
  )
    throw new Error("Faiman model manifest missing");
  if (r.request.system.acExportLimitW !== undefined) {
    const limit = r.request.system.acExportLimitW;
    const balanced = (row: {
      acWh: number;
      acBeforeExportLimitWh?: number;
      acExportLimitLossWh?: number;
    }) =>
      row.acBeforeExportLimitWh !== undefined &&
      row.acExportLimitLossWh !== undefined &&
      Math.abs(
        row.acBeforeExportLimitWh - row.acWh - row.acExportLimitLossWh,
      ) <=
        1e-6 * Math.max(1, row.acBeforeExportLimitWh);
    if (
      !r.manifest.models.acExport?.startsWith("constant export cap") ||
      !balanced(r.summary) ||
      r.monthly.some((m) => !balanced(m)) ||
      r.samples.some(
        (sample) =>
          typeof sample.acBeforeExportLimitW !== "number" ||
          typeof sample.acExportLimitLossW !== "number" ||
          typeof sample.acW !== "number" ||
          sample.acW < 0 ||
          sample.acW > limit + 1e-7 ||
          sample.acBeforeExportLimitW < 0 ||
          Math.abs(sample.acW - Math.min(sample.acBeforeExportLimitW, limit)) >
            1e-6 * Math.max(1, sample.acBeforeExportLimitW) ||
          sample.acExportLimitLossW < 0 ||
          Math.abs(
            sample.acBeforeExportLimitW -
              sample.acW -
              sample.acExportLimitLossW,
          ) >
            1e-6 * Math.max(1, sample.acBeforeExportLimitW),
      )
    )
      throw new Error("Invalid AC export cap accounting");
  }
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
  if (r.request.system.tracking) {
    const t = r.request.system.tracking;
    if (
      !r.manifest.models.mounting?.startsWith("singleaxis;") ||
      r.samples.some(
        (sample) =>
          ![
            "trackerThetaDeg",
            "trackerActive",
            "surfaceTiltDeg",
            "surfaceAzimuthDeg",
          ].every(
            (key) =>
              typeof sample[key] === "number" && Number.isFinite(sample[key]),
          ) ||
          Math.abs(Number(sample.trackerThetaDeg)) > t.maxAngleDeg + 1e-8 ||
          ![0, 1].includes(Number(sample.trackerActive)) ||
          Number(sample.surfaceTiltDeg) < 0 ||
          Number(sample.surfaceTiltDeg) > 90.00000001 ||
          Number(sample.surfaceAzimuthDeg) < 0 ||
          Number(sample.surfaceAzimuthDeg) > 360.00000001,
      )
    )
      throw new Error("Tracker result geometry missing or out of bounds");
  }
  if (r.request.system.rowIrradiance) {
    if (
      !r.manifest.models.rowIrradiance?.startsWith("infinite_sheds ") ||
      ![
        r.summary.frontIncidentWhm2,
        r.summary.rearIncidentWhm2,
        r.summary.rearEffectiveWhm2,
      ].every((value) => typeof value === "number" && Number.isFinite(value)) ||
      r.samples.some(
        (row) =>
          ![
            "frontEffectiveIrradianceWm2",
            "rearIncidentWm2",
            "rearDirectWm2",
            "rearSkyDiffuseWm2",
            "rearGroundDiffuseWm2",
            "rearBeamIam",
            "rearEffectiveIrradianceWm2",
            "frontShadedFraction",
            "rearShadedFraction",
            "temperatureIrradianceWm2",
          ].every(
            (key) =>
              typeof row[key] === "number" &&
              Number.isFinite(row[key]) &&
              Number(row[key]) >= -1e-8,
          ) ||
          Number(row.frontShadedFraction) > 1 + 1e-8 ||
          Number(row.rearShadedFraction) > 1 + 1e-8 ||
          Number(row.rearBeamIam) > 1 + 1e-8,
      )
    )
      throw new Error(
        "Row irradiance result components missing or out of bounds",
      );
  }
  if (r.request.system.electrical) {
    const e = r.request.system.electrical;
    if (
      !r.manifest.models.dc?.startsWith("desoto + singlediode") ||
      !r.manifest.electricalChecks ||
      ![r.summary.availableMppWh, r.summary.mpptConstraintLossWh].every(
        (v) => typeof v === "number" && Number.isFinite(v) && v >= 0,
      ) ||
      r.samples.some(
        (row) =>
          ![
            "arrayVocV",
            "arrayVmpV",
            "arrayMppW",
            "operatingVoltageV",
            "operatingCurrentA",
            "dcOperatingState",
          ].every(
            (key) =>
              typeof row[key] === "number" &&
              Number.isFinite(row[key]) &&
              Number(row[key]) >= 0,
          ) ||
          ![0, 1, 2, 3, 4].includes(Number(row.dcOperatingState)) ||
          Number(row.arrayVocV) > e.maxDcV + 1e-6 ||
          Number(row.operatingCurrentA) > e.maxInputCurrentA + 1e-6 ||
          ([1, 2, 3].includes(Number(row.dcOperatingState)) &&
            (Number(row.operatingVoltageV) < e.mpptMinV - 1e-6 ||
              Number(row.operatingVoltageV) > e.mpptMaxV + 1e-6)) ||
          ([0, 4].includes(Number(row.dcOperatingState)) &&
            (Number(row.operatingVoltageV) !== 0 ||
              Number(row.operatingCurrentA) !== 0)),
      )
    )
      throw new Error(
        "Detailed electrical output missing or outside declared envelope",
      );
  }
  validateExplorerEvidence(r);
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
    `<h2>${escape(r.request.label)}</h2><h3>Result explorer (study-explorer-v1, full period; no temperature threshold supplied)</h3><pre>${escape(JSON.stringify(exploreStudy(r),null,2))}</pre><h3>Data diagnostics, coverage and source ledger (study-insights-v1)</h3><pre>${escape(JSON.stringify(studyInsights(r.request,r),null,2))}</pre><p>Mounting: ${r.request.system.tracking ? "single-axis tracker (ideal geometry)" : "fixed tilt"}; optics: ${r.request.system.rowIrradiance ? "infinite sheds (front/rear row optics)" : "isolated plane"}</p>${r.request.system.rowIrradiance ? `<p>Incident front / rear / weighted effective rear: ${r.summary.frontIncidentWhm2} / ${r.summary.rearIncidentWhm2} / ${r.summary.rearEffectiveWhm2} Wh/m². Thermal proxy: ${escape(r.request.system.rowIrradiance.temperatureIrradiance)}.</p>` : ""}<p>DC model: ${r.request.system.electrical ? "De Soto single diode + ideal constrained MPPT" : "PVWatts DC"}</p>${r.request.system.electrical ? `<p>Unconstrained MPP / constraint loss: ${r.summary.availableMppWh} / ${r.summary.mpptConstraintLossWh} Wh. Voc checks are for specified conditions only, not certified electrical design.</p>` : ""}${r.request.system.horizonProfile || r.request.system.soilingSchedule || r.request.system.albedoSchedule ? `<p>Environment: ${escape(r.manifest.models.horizon ?? "horizon disabled")}; ${escape(r.manifest.models.soiling ?? "soiling disabled")}; ${escape(r.manifest.models.albedo ?? "constant albedo")}. Blocked beam / optical soiling loss: ${r.summary.horizonBlockedBeamWhm2 ?? "not enabled"} / ${r.summary.soilingLossWhm2 ?? "not enabled"} Wh/m². Beam-only horizon; no diffuse sky masking. Soiling changes optical irradiance, not thermal POA.</p>` : ""}<p>Optics: ${escape(r.manifest.models.transposition)}; beam IAM: ${escape(r.manifest.models.beamIam)}; spectral: ${escape(r.manifest.models.spectral)}. Diffuse IAM remains unity; spectral modifier does not alter thermal POA.</p>${r.request.system.transformer || r.request.system.auxiliaryPowerW !== undefined || r.request.system.acAvailability ? `<p>AC plant — always energized: availability loss / LV auxiliary / transformer loss: ${r.summary.availabilityLossWh} / ${r.summary.auxiliaryConsumptionWh} / ${r.summary.transformerLossWh} Wh. Total grid import: ${r.summary.gridImportWh} Wh; net grid: ${r.summary.netGridWh} Wh. Do not subtract inverter self-consumption a second time.</p>` : ""}<p>AC inverter: ${escape(r.manifest.models.ac)}.</p>${r.request.system.sandia ? `<p>Imported inverter self-consumption: ${r.summary.inverterSelfConsumptionWh} Wh; net grid (export minus total import): ${r.summary.netGridWh} Wh. Export cap does not limit self-consumption import. No external site load/storage; declared plant auxiliaries, if enabled, are included.</p>` : ""}<p>Thermal model: ${escape(r.manifest.models.temperature)}.</p>${r.request.system.acExportLimitW !== undefined ? `<p>AC export cap: ${r.request.system.acExportLimitW} W; before cap / export loss: ${r.summary.acBeforeExportLimitWh} / ${r.summary.acExportLimitLossWh} Wh. No external site load/storage beyond declared LV auxiliary; static cap only.</p>` : ""}<p>DC nameplate: ${r.request.system.arrayPdc0W} W; period AC: ${r.summary.acWh / 1000} kWh; DC: ${r.summary.dcWh / 1000} kWh</p><p>${escape(r.manifest.period.startUtc)} → ${escape(r.manifest.period.endUtc)}; UTC months, not annualized unless complete year.</p><table><tr><th>UTC month</th><th>DC Wh</th><th>AC Wh</th>${r.request.system.horizonProfile ? "<th>Blocked beam Wh/m²</th>" : ""}${r.request.system.soilingSchedule ? "<th>Soiling loss Wh/m²</th>" : ""}${r.request.system.sandia ? "<th>Inverter self-consumption Wh</th>" : ""}${r.request.system.transformer || r.request.system.auxiliaryPowerW !== undefined || r.request.system.acAvailability ? "<th>Availability loss Wh</th><th>Auxiliary Wh</th><th>Transformer loss Wh</th><th>Total import Wh</th>" : ""}${r.summary.netGridWh !== undefined ? "<th>Net grid Wh</th>" : ""}</tr>${r.monthly.map((m) => `<tr><td>${escape(m.month)}</td><td>${m.dcWh}</td><td>${m.acWh}</td>${r.request.system.horizonProfile ? `<td>${m.horizonBlockedBeamWhm2}</td>` : ""}${r.request.system.soilingSchedule ? `<td>${m.soilingLossWhm2}</td>` : ""}${r.request.system.sandia ? `<td>${m.inverterSelfConsumptionWh}</td>` : ""}${r.request.system.transformer || r.request.system.auxiliaryPowerW !== undefined || r.request.system.acAvailability ? `<td>${m.availabilityLossWh}</td><td>${m.auxiliaryConsumptionWh}</td><td>${m.transformerLossWh}</td><td>${m.gridImportWh}</td>` : ""}${m.netGridWh !== undefined ? `<td>${m.netGridWh}</td>` : ""}</tr>`).join("")}</table><h3>Warnings & limitations</h3><ul>${[...r.manifest.warnings, ...r.manifest.limitations].map((w) => `<li>${escape(w)}</li>`).join("")}</ul><h3>Inputs (weather retained in companion JSON)</h3><pre>${escape(JSON.stringify({ ...r.request, weather: { ...r.request.weather, records: `${r.request.weather.records.length} rows; see JSON bundle` } }, null, 2))}</pre><h3>Execution and reproducibility</h3><pre>${escape(JSON.stringify({ execution: r.execution, manifest: r.manifest }, null, 2))}</pre>`;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Direct pvlib study report</title><style>body{font:15px system-ui;max-width:1000px;margin:2em auto;padding:1em;color:#172033}table{border-collapse:collapse;width:100%}td,th{border:1px solid #aaa;padding:6px}pre{white-space:pre-wrap;overflow-wrap:anywhere} @media print{body{margin:0}h2{break-before:page}}</style><h1>Direct pvlib study / گزارش مطالعه</h1><p>Not field validated. Separate from screening and financial reports. Imported/local results are not digitally certified. Keep the JSON bundle for full weather and reproducibility. Print using browser Print / Save as PDF.</p>${other ? `<h2>Scenario comparison</h2><p>Same weather, site and engine; mounting, row optics and thermal irradiance proxy may differ (see scenario inputs). Delta is not an isolated bifacial gain. No guarantee of tracking gain. AC difference (second − first): ${(other.summary.acWh - result.summary.acWh) / 1000} kWh; ${result.summary.acWh <= 0 ? "percentage unavailable (nonpositive baseline)" : `${(100 * (other.summary.acWh - result.summary.acWh)) / result.summary.acWh}%`}. Different capacities are not normalized.</p>` : ""}${other ? `<h3>Absolute energy comparison (other minus current; not normalized)</h3><p>Percentages unavailable for nonpositive current or missing metrics. Wh/m² diagnostics are not electrical energy losses.</p><pre>${escape(JSON.stringify({energy:compareStudies(result,other),inputDifferences:scenarioInputDiff(result,other)},null,2))}</pre>` : ""}${section(result)}${other ? section(other) : ""}</html>`;
}
