import {MeasurementImporter} from "./MeasurementImporter";
import type {MeasurementDataset} from "../studies/measurementContract";
import {DeclaredWeatherImporter} from "./DeclaredWeatherImporter";
import {type WeatherImportTrace} from "../studies/declaredWeatherAdapter";
import { StudyInsights } from "./StudyInsights";
import React, { useEffect, useRef, useState } from "react";
import {
  StudyRequestSchema,
  type StudyRequest,
} from "../studies/studyContract";
import {
  parseCellTemperatureCsv,
  parseWeatherCsv,
  parseAvailabilityCsv,
  parseAuxiliaryCsv,
  parseExportLimitCsv,
  parseHorizonCsv,
  parseSoilingCsv,
  parseAlbedoCsv,
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
const trackingFields = [
  ["axisTiltDeg", "Axis tilt / شیب محور (°)"],
  ["axisAzimuthDeg", "Axis azimuth / سمت محور (° clockwise from N)"],
  ["maxAngleDeg", "Symmetric rotation limit / حد چرخش متقارن (±°)"],
  ["gcr", "GCR / نسبت عرض میز به فاصله محورها (0.01–1)"],
  ["crossAxisTiltDeg", "Cross-axis tilt / شیب عرضی راست‌گرد (°)"],
] as const;
const rowFields = [
  ["rowGcr", "Row GCR / نسبت عرض میز به فاصله محورها"],
  ["heightM", "Row center height / ارتفاع مرکز میز (m)"],
  ["pitchM", "Row pitch / فاصله محورها (m)"],
  ["bifaciality", "Bifaciality / نسبت بازده پشت به جلو (0–1)"],
  ["rearShadeLossPct", "Rear structure loss / کاهش ساختاری پشت (%)"],
  ["rearTransmissionLossPct", "Rear transmission loss / کاهش عبور پشت (%)"],
  ["rearIamB", "Rear ASHRAE b / ضریب IAM پشت"],
] as const;
const physicalIamFields = [
  ["frontN", "Front refractive index n"],
  ["frontK", "Front extinction K (1/m)"],
  ["frontL", "Front glass thickness L (m)"],
  ["rearN", "Rear refractive index n"],
  ["rearK", "Rear extinction K (1/m)"],
  ["rearL", "Rear glass thickness L (m)"],
] as const;
const spectralFields = [
  ["A0", "Spectral A0"],
  ["A1", "Spectral A1"],
  ["A2", "Spectral A2"],
  ["A3", "Spectral A3"],
  ["A4", "Spectral A4"],
  ["minAbsoluteAirmass", "Fitted minimum absolute airmass"],
  ["maxAbsoluteAirmass", "Fitted maximum absolute airmass"],
] as const;
const sandiaFields = [
  ["Paco", "AC rating Paco (W)"],
  ["Pdco", "Reference DC power Pdco (W)"],
  ["Vdco", "Reference voltage Vdco (V)"],
  ["Pso", "Startup DC power Pso (W)"],
  ["C0", "C0 (1/W)"],
  ["C1", "C1 (1/V)"],
  ["C2", "C2 (1/V)"],
  ["C3", "C3 (1/V)"],
  ["Pnt", "Night self-consumption Pnt (W)"],
  ["modelMinDcV", "Fitted domain minimum DC (V)"],
  ["modelMaxDcV", "Fitted domain maximum DC (V)"],
  ["modelMaxDcPowerW", "Fitted domain maximum DC power (W)"],
] as const;
const electricalFields = [
  ["alphaScAperC", "Module αsc / ضریب جریان (A/°C)"],
  ["aRefV", "Module a_ref = nNsVth / ضریب دیود (V)"],
  ["iLRefA", "Module I_L_ref / جریان نوری (A)"],
  ["iORefA", "Module I_o_ref / جریان اشباع (A)"],
  ["rShRefOhm", "Module R_sh_ref / مقاومت شنت (Ω)"],
  ["rSOhm", "Module R_s / مقاومت سری (Ω)"],
  ["egRefEv", "Module EgRef / شکاف انرژی مرجع (eV)"],
  ["dEgdTPerK", "Module dEgdT / وابستگی شکاف انرژی (1/K)"],
  ["modulesPerString", "Modules per string / ماژول سری در رشته"],
  ["stringsInParallel", "Parallel strings / رشته‌های موازی"],
  ["mpptMinV", "Minimum MPPT / کمینه MPPT (V)"],
  ["mpptMaxV", "Maximum MPPT / بیشینه MPPT (V)"],
  ["maxDcV", "Maximum DC voltage / حد ولتاژ DC (V)"],
  ["maxInputCurrentA", "Aggregate current limit / حد جریان تجمیعی (A)"],
  [
    "designMinCellTemperatureC",
    "Specified design minimum cell temperature / کمینه دمای سلول طراحی (°C)",
  ],
  [
    "designMaxEffectiveIrradianceWm2",
    "Specified design irradiance / بیشینه تابش مؤثر طراحی (W/m²)",
  ],
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
  const [measurements,setMeasurements]=useState<MeasurementDataset[]>([]);
  const [records, setRecords] = useState<StudyRequest["weather"]["records"]>(
    [],
  );
  const [importTrace,setImportTrace]=useState<WeatherImportTrace|undefined>();
  const [error, setError] = useState("");
  const [review, setReview] = useState<StudyRequest | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    csvRevision.current++;
    const r = request;
    setMeasurements(r?.measurements ?? []);
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
            mounting: r.system.tracking ? "single_axis" : "fixed",
            thermalModel: r.system.cellTemperatureSchedule
              ? "explicit"
              : r.system.pvsystTemperature
                ? "pvsyst"
                : r.system.faiman
                  ? "faiman"
                  : "sapm",
            pvsystSource: r.system.pvsystTemperature?.source ?? "",
            pvsystQuality: r.system.pvsystTemperature?.quality ?? "",
            uc: r.system.pvsystTemperature
              ? String(r.system.pvsystTemperature.uc)
              : "",
            uv: r.system.pvsystTemperature
              ? String(r.system.pvsystTemperature.uv)
              : "",
            moduleEfficiency: r.system.pvsystTemperature
              ? String(r.system.pvsystTemperature.moduleEfficiency)
              : "",
            alphaAbsorption: r.system.pvsystTemperature
              ? String(r.system.pvsystTemperature.alphaAbsorption)
              : "",
            cellSource: r.system.cellTemperatureSchedule?.source ?? "",
            cellQuality: r.system.cellTemperatureSchedule?.quality ?? "",
            cellCsv: r.system.cellTemperatureSchedule
              ? [
                  "timestamp,cellTemperatureC",
                  ...r.system.cellTemperatureSchedule.records.map(
                    (row) => `${row.timestamp},${row.cellTemperatureC}`,
                  ),
                ].join("\n")
              : "",
            u0: r.system.faiman ? String(r.system.faiman.u0) : "",
            u1: r.system.faiman ? String(r.system.faiman.u1) : "",
            exportEnabled: r.system.acExportLimitSchedule ? "schedule" : r.system.acExportLimitW !== undefined ? "yes" : "no",
            exportScheduleSource:r.system.acExportLimitSchedule?.source ?? "",
            exportScheduleQuality:r.system.acExportLimitSchedule?.quality ?? "",
            exportScheduleCsv:r.system.acExportLimitSchedule ? ["timestamp,limitW",...r.system.acExportLimitSchedule.records.map(row=>`${row.timestamp},${row.limitW}`)].join("\n") : "",
            acExportLimitW:
              r.system.acExportLimitW !== undefined
                ? String(r.system.acExportLimitW)
                : "",
            horizonEnabled: r.system.horizonProfile ? "yes" : "no",
            horizonSource: r.system.horizonProfile?.source ?? "",
            horizonQuality: r.system.horizonProfile?.quality ?? "",
            horizonCsv: r.system.horizonProfile
              ? [
                  "azimuthDeg,elevationDeg",
                  ...r.system.horizonProfile.points.map(
                    (row) => `${row.azimuthDeg},${row.elevationDeg}`,
                  ),
                ].join("\n")
              : "",
            soilingEnabled: r.system.soilingSchedule ? "yes" : "no",
            soilingSource: r.system.soilingSchedule?.source ?? "",
            soilingQuality: r.system.soilingSchedule?.quality ?? "",
            soilingCsv: r.system.soilingSchedule
              ? [
                  "timestamp,frontRatio,rearRatio",
                  ...r.system.soilingSchedule.records.map(
                    (row) =>
                      `${row.timestamp},${row.frontRatio},${row.rearRatio}`,
                  ),
                ].join("\n")
              : "",
            albedoEnabled: r.system.albedoSchedule ? "yes" : "no",
            albedoSource: r.system.albedoSchedule?.source ?? "",
            albedoQuality: r.system.albedoSchedule?.quality ?? "",
            albedoCsv: r.system.albedoSchedule
              ? [
                  "timestamp,albedo",
                  ...r.system.albedoSchedule.records.map(
                    (row) => `${row.timestamp},${row.albedo}`,
                  ),
                ].join("\n")
              : "",
            transformerEnabled: r.system.transformer ? "yes" : "no",
            ratingVa: r.system.transformer
              ? String(r.system.transformer.ratingVa)
              : "",
            noLoadLossFraction: r.system.transformer
              ? String(r.system.transformer.noLoadLossFraction)
              : "",
            loadLossFraction: r.system.transformer
              ? String(r.system.transformer.loadLossFraction)
              : "",
            auxiliaryEnabled:
              r.system.auxiliarySchedule ? "schedule" : r.system.auxiliaryPowerW !== undefined ? "yes" : "no",
            auxiliaryScheduleSource: r.system.auxiliarySchedule?.source ?? "",
            auxiliaryScheduleQuality: r.system.auxiliarySchedule?.quality ?? "",
            auxiliaryScheduleCsv: r.system.auxiliarySchedule ? ["timestamp,powerW",...r.system.auxiliarySchedule.records.map(row=>`${row.timestamp},${row.powerW}`)].join("\n") : "",
            auxiliaryPowerW:
              r.system.auxiliaryPowerW !== undefined
                ? String(r.system.auxiliaryPowerW)
                : "",
            acCableEnabled:r.system.acCable ? "yes" : "no",
            acCableSource:r.system.acCable?.source ?? "",acCableQuality:r.system.acCable?.quality ?? "",
            resistancePerPhaseOhm:r.system.acCable ? String(r.system.acCable.resistancePerPhaseOhm) : "",
            receivingLineVoltageV:r.system.acCable ? String(r.system.acCable.receivingLineVoltageV) : "",
            acCableMaxCurrentA:r.system.acCable ? String(r.system.acCable.maxCurrentA) : "",
            availabilityEnabled: r.system.acAvailability ? "yes" : "no",
            availabilitySource: r.system.acAvailability?.source ?? "",
            availabilityQuality: r.system.acAvailability?.quality ?? "",
            availabilityCsv: r.system.acAvailability
              ? [
                  "timestamp,availableFraction",
                  ...r.system.acAvailability.records.map(
                    (row) => `${row.timestamp},${row.availableFraction}`,
                  ),
                ].join("\n")
              : "",
            skyDiffuseModel: r.system.skyDiffuseModel ?? "haydavies",
            beamIamModel: r.system.physicalIam ? "physical" : "ashrae",
            spectralModel: r.system.sapmSpectral ? "sapm" : "unity",
            ...Object.fromEntries(
              physicalIamFields.map(([key]) => [
                key,
                r.system.physicalIam ? String(r.system.physicalIam[key]) : "",
              ]),
            ),
            ...Object.fromEntries(
              spectralFields.map(([key]) => [
                key,
                r.system.sapmSpectral ? String(r.system.sapmSpectral[key]) : "",
              ]),
            ),
            inverterModel: r.system.sandia ? "sandia" : "pvwatts",
            ...Object.fromEntries(
              sandiaFields.map(([key]) => [
                key,
                r.system.sandia ? String(r.system.sandia[key]) : "",
              ]),
            ),
            dcCableEnabled: r.system.electrical?.dcCable ? "yes" : "no",
            dcCableSource: r.system.electrical?.dcCable?.source ?? "",
            dcCableQuality: r.system.electrical?.dcCable?.quality ?? "user_configured",
            stringLoopResistanceOhm: String(r.system.electrical?.dcCable?.stringLoopResistanceOhm ?? ""),
            sharedLoopResistanceOhm: String(r.system.electrical?.dcCable?.sharedLoopResistanceOhm ?? ""),
            inverterBlocksJson: r.system.inverterBlocks ? JSON.stringify(r.system.inverterBlocks,null,2) : "",
            electricalModel: r.system.inverterBlocks ? "blocks" : r.system.mpptInputs ? "multi" : r.system.electrical ? "diode" : "pvwatts",
            mpptInputsJson: r.system.mpptInputs ? JSON.stringify(r.system.mpptInputs,null,2) : "",
            ...Object.fromEntries(
              electricalFields.map(([key]) => [
                key,
                r.system.electrical ? String(r.system.electrical[key]) : "",
              ]),
            ),
            optics: r.system.rowIrradiance ? "rows" : "isolated",
            temperatureIrradiance:
              r.system.rowIrradiance?.temperatureIrradiance ?? "",
            ...Object.fromEntries(
              rowFields.map(([key]) => [
                key,
                r.system.rowIrradiance
                  ? String(
                      r.system.rowIrradiance[key === "rowGcr" ? "gcr" : key],
                    )
                  : "",
              ]),
            ),
            backtrack: r.system.tracking
              ? String(r.system.tracking.backtrack)
              : "",
            ...Object.fromEntries(
              trackingFields.map(([key]) => [
                key,
                r.system.tracking ? String(r.system.tracking[key]) : "",
              ]),
            ),
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
    setImportTrace(r?.weather.importTrace);
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
        <label className="block text-xs">
          {en ? "Mounting model" : "مدل نصب"}
          <select
            aria-label="Study mounting"
            value={v.mounting ?? "fixed"}
            onChange={(e) => change("mounting", e.target.value)}
            className="block bg-slate-900 p-2"
          >
            <option value="fixed">Fixed tilt / سطح ثابت</option>
            <option value="single_axis">
              Single-axis tracker / ردیاب تک‌محوره
            </option>
          </select>
        </label>
        {v.mounting === "single_axis" && (
          <div
            className="space-y-3 border border-sky-800 p-3"
            data-testid="tracker-inputs"
          >
            <p className="text-xs">
              {en
                ? "Ideal monofacial tracker geometry; no row-shading electrical loss, wind stow or motor consumption. Fixed tilt/azimuth below are retained references only and do not control tracking. For a south-pointing axis, positive theta rotates west; cross-axis slope is right-handed. All tracker values and their source must be declared."
                : "هندسهٔ ایده‌آل ردیاب یک‌رو؛ بدون تلفات الکتریکی سایه ردیف، stow باد یا مصرف موتور. شیب و سمت ثابت پایین فقط مرجع نگه‌داری‌شده‌اند و ردیاب را کنترل نمی‌کنند. برای محور جنوبی، theta مثبت به غرب است؛ شیب عرضی قرارداد راست‌گرد دارد. تمام مقادیر و منبع ردیاب باید صریح باشند."}
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {trackingFields.map(([key, label]) => text(key, label, "number"))}
              <label className="block text-xs">
                Backtracking / عقب‌گرد ضدسایه
                <select
                  aria-label="Study backtrack"
                  value={v.backtrack ?? ""}
                  onChange={(e) => change("backtrack", e.target.value)}
                  className="block bg-slate-900 p-2"
                >
                  <option value="">—</option>
                  <option value="true">Enabled / فعال</option>
                  <option value="false">
                    Disabled (true tracking) / غیرفعال
                  </option>
                </select>
              </label>
            </div>
          </div>
        )}
        <label className="block text-xs">
          {en ? "Irradiance geometry" : "هندسهٔ تابش"}
          <select
            aria-label="Study optics"
            value={v.optics ?? "isolated"}
            onChange={(e) => change("optics", e.target.value)}
            className="block bg-slate-900 p-2"
          >
            <option value="isolated">
              Isolated plane (legacy) / سطح منفرد
            </option>
            <option value="rows">
              Infinite sheds: row shading + optional bifacial / ردیفی و دوطرفه
            </option>
          </select>
        </label>
        {v.optics === "rows" && (
          <div
            className="border border-sky-800 p-3 space-y-3"
            data-testid="row-inputs"
          >
            <p className="text-xs">
              {en
                ? "Level terrain, parallel equally spaced infinite rows only; horizontal tracker axes and matching GCR required. Bifaciality=0 keeps front row shading but no rear electrical contribution. Height is row center, not bottom edge. SAPM thermal irradiance is an explicit uncalibrated proxy. Maximum 8784 intervals."
                : "فقط زمین افقی و ردیف‌های بی‌نهایتِ موازی و هم‌فاصله؛ محور ردیاب باید افقی و GCR دو بخش برابر باشد. bifaciality صفر، سایه تابشی جلو را حفظ و سهم برقی عقب را حذف می‌کند. ارتفاع مربوط به مرکز میز است، نه لبه پایین. ورودی حرارتی SAPM یک فرض کالیبره‌نشدهٔ صریح است. حداکثر ۸۷۸۴ بازه."}
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {rowFields.map(([key, label]) => text(key, label, "number"))}
              <label className="block text-xs">
                {en
                  ? "SAPM incident irradiance proxy"
                  : "فرض تابش ورودی حرارتی SAPM"}
                <select
                  aria-label="Study temperatureIrradiance"
                  value={v.temperatureIrradiance ?? ""}
                  onChange={(e) =>
                    change("temperatureIrradiance", e.target.value)
                  }
                  className="block bg-slate-900 p-2"
                >
                  <option value="">—</option>
                  <option value="front_only">Front only / فقط جلو</option>
                  <option value="front_plus_rear">
                    Front + rear (not efficiency weighted) / جلو و عقب، بدون وزن
                    بازده
                  </option>
                </select>
              </label>
            </div>
          </div>
        )}
        <label className="block text-xs">
          {en ? "DC electrical model" : "مدل الکتریکی DC"}
          <select
            aria-label="Study electrical model"
            value={v.electricalModel ?? "pvwatts"}
            onChange={(e) => change("electricalModel", e.target.value)}
            className="block bg-slate-900 p-2"
          >
            <option value="pvwatts">
              PVWatts DC (legacy) / مدل تجمیعی قبلی
            </option>
            <option value="blocks">Independent inverter blocks / اینورترهای مستقل</option>
            <option value="multi">Independent MPPT inputs / ورودی‌های MPPT مستقل</option>
            <option value="diode">
              De Soto single diode + ideal constrained MPPT / تک‌دیودی
            </option>
          </select>
        </label>
        <label>
          {en ? "AC inverter model" : "مدل اینورتر AC"}
          <select
            aria-label="Study inverter model"
            value={v.inverterModel ?? "pvwatts"}
            onChange={(e) => change("inverterModel", e.target.value)}
          >
            <option value="pvwatts">PVWatts</option>
            <option value="sandia">
              Sandia (voltage dependent / وابسته به ولتاژ)
            </option>
          </select>
        </label>
        <label>
          {en ? "Sky diffuse transposition" : "مدل انتقال تابش آسمان"}
          <select
            aria-label="Study sky diffuse model"
            value={v.skyDiffuseModel ?? "haydavies"}
            onChange={(e) => change("skyDiffuseModel", e.target.value)}
          >
            <option value="haydavies">Hay–Davies</option>
            <option value="perez">
              Perez 1990 (isolated plane only / فقط صفحه منفرد)
            </option>
          </select>
        </label>
        <label>
          {en ? "Beam IAM model" : "مدل IAM مستقیم"}
          <select
            aria-label="Study beam IAM model"
            value={v.beamIamModel ?? "ashrae"}
            onChange={(e) => change("beamIamModel", e.target.value)}
          >
            <option value="ashrae">ASHRAE</option>
            <option value="physical">Physical glazing / شیشه فیزیکی</option>
          </select>
        </label>
        {v.beamIamModel === "physical" && (
          <div data-testid="physical-iam-inputs">
            <p>
              {en
                ? "Explicit glass parameters for front/rear, no AR coating. Beam only: diffuse IAM stays unity. Legacy iamB/rearIamB inactive. Rear values retained but inactive on isolated plane."
                : "پارامترهای صریح شیشه جلو/عقب؛ بدون AR. فقط تابش مستقیم؛ IAM پخشیده همچنان یک است. iamB/rearIamB غیرفعال. مقادیر عقب در صفحه منفرد حفظ ولی غیرفعال‌اند."}
            </p>
            {physicalIamFields.map(([key, label]) =>
              text(key, label, "number"),
            )}
          </div>
        )}
        <label>
          {en ? "Spectral modifier" : "اصلاح طیفی"}
          <select
            aria-label="Study spectral model"
            value={v.spectralModel ?? "unity"}
            onChange={(e) => change("spectralModel", e.target.value)}
          >
            <option value="unity">Unity / یک</option>
            <option value="sapm">SAPM absolute airmass / جرم هوای مطلق</option>
          </select>
        </label>
        {v.spectralModel === "sapm" && (
          <div data-testid="spectral-inputs">
            <p>
              {en
                ? "Explicit fitted A0..A4 and absolute-airmass validity domain required. No extrapolation. One common factor for front/rear effective irradiance, not thermal POA. This is not full SAPM or wavelength-resolved spectrum."
                : "ضرایب صریح برازش‌شده A0..A4 و دامنه معتبر جرم هوای مطلق لازم است. بدون برون‌یابی. یک عامل مشترک برای تابش مؤثر جلو/عقب، نه تابش حرارتی. این کل SAPM یا طیف طول‌موجی نیست."}
            </p>
            {spectralFields.map(([key, label]) => text(key, label, "number"))}
          </div>
        )}
        <fieldset data-testid="horizon-inputs" className="border p-3">
          <legend>Beam-only horizon / افق فقط مستقیم</legend>
          <select
            aria-label="Study horizon enabled"
            value={v.horizonEnabled ?? "no"}
            onChange={(e) => change("horizonEnabled", e.target.value)}
          >
            <option value="no">Disabled / غیرفعال</option>
            <option value="yes">Enabled / فعال</option>
          </select>
          {v.horizonEnabled === "yes" && (
            <div>
              <p>
                Isolated plane only; closed ordered 0..360 profile, equal seam,
                elevation 0..85. Diffuse and ground unchanged. / فقط صفحه منفرد؛
                افق مرتب و بسته؛ بدون اصلاح تابش پخشیده و زمین.
              </p>
              {text("horizonSource", "Source / منبع")}
              <label>
                Quality
                <select
                  aria-label="Study horizonQuality"
                  value={v.horizonQuality ?? ""}
                  onChange={(e) => change("horizonQuality", e.target.value)}
                >
                  <option value="">—</option>
                  {[
                    "measured",
                    "weather_provider",
                    "user_configured",
                    "assumed",
                  ].map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                CSV: azimuthDeg,elevationDeg
                <textarea
                  aria-label="Study horizon CSV"
                  className="block w-full bg-slate-900"
                  rows={4}
                  value={v.horizonCsv ?? ""}
                  onChange={(e) => change("horizonCsv", e.target.value)}
                />
              </label>
            </div>
          )}
        </fieldset>
        <fieldset data-testid="soiling-inputs" className="border p-3">
          <legend>Explicit soiling ratios / ضرایب صریح آلودگی</legend>
          <select
            aria-label="Study soiling enabled"
            value={v.soilingEnabled ?? "no"}
            onChange={(e) => change("soilingEnabled", e.target.value)}
          >
            <option value="no">Disabled / غیرفعال</option>
            <option value="yes">Enabled / فعال</option>
          </select>
          {v.soilingEnabled === "yes" && (
            <div>
              <p>
                Complete weather-aligned front/rear transmission 0..1; no
                Kimber, snow or thermal correction. Rear inactive on isolated
                plane. / ضرایب عبور صریح هم‌تراز هواشناسی؛ نه Kimber، برف یا
                اصلاح حرارتی.
              </p>
              {text("soilingSource", "Source / منبع")}
              <label>
                Quality
                <select
                  aria-label="Study soilingQuality"
                  value={v.soilingQuality ?? ""}
                  onChange={(e) => change("soilingQuality", e.target.value)}
                >
                  <option value="">—</option>
                  {[
                    "measured",
                    "weather_provider",
                    "user_configured",
                    "assumed",
                  ].map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                CSV: timestamp,frontRatio,rearRatio
                <textarea
                  aria-label="Study soiling CSV"
                  className="block w-full bg-slate-900"
                  rows={4}
                  value={v.soilingCsv ?? ""}
                  onChange={(e) => change("soilingCsv", e.target.value)}
                />
              </label>
            </div>
          )}
        </fieldset>
        <fieldset data-testid="albedo-inputs" className="border p-3">
          <legend>Interval albedo / آلبدوی بازه‌ای</legend>
          <select
            aria-label="Study albedo enabled"
            value={v.albedoEnabled ?? "no"}
            onChange={(e) => change("albedoEnabled", e.target.value)}
          >
            <option value="no">Disabled / غیرفعال</option>
            <option value="yes">Enabled / فعال</option>
          </select>
          {v.albedoEnabled === "yes" && (
            <div>
              <p>
                Complete weather-aligned albedo 0..1; scalar albedo retained but
                inactive. No snow prediction. / آلبدوی کامل هم‌تراز هواشناسی؛
                مقدار ثابت غیرفعال؛ بدون پیش‌بینی برف.
              </p>
              {text("albedoSource", "Source / منبع")}
              <label>
                Quality
                <select
                  aria-label="Study albedoQuality"
                  value={v.albedoQuality ?? ""}
                  onChange={(e) => change("albedoQuality", e.target.value)}
                >
                  <option value="">—</option>
                  {[
                    "measured",
                    "weather_provider",
                    "user_configured",
                    "assumed",
                  ].map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                CSV: timestamp,albedo
                <textarea
                  aria-label="Study albedo CSV"
                  className="block w-full bg-slate-900"
                  rows={4}
                  value={v.albedoCsv ?? ""}
                  onChange={(e) => change("albedoCsv", e.target.value)}
                />
              </label>
            </div>
          )}
        </fieldset>
        <fieldset data-testid="ac-plant-inputs" className="border p-3">
          <legend>
            {en
              ? "AC plant: three independent stages"
              : "سه مرحله مستقل سمت AC نیروگاه"}
          </legend>
          <p>
            {en
              ? "Positive generation availability → declared LV auxiliary (constant or interval-average W) → energized transformer → export cap. Inverter self-consumption remains. Not a grid outage/control model."
              : "دسترس‌پذیری تولید مثبت ← مصرف کمکی دائمی LV ← ترانس همیشه متصل ← سقف صادرات. مصرف داخلی اینورتر باقی است. مدل خاموشی شبکه یا کنترل نیست."}
          </p>
          <label>
            {en ? "Transformer" : "ترانسفورماتور"}
            <select
              aria-label="Study transformer enabled"
              value={v.transformerEnabled ?? "no"}
              onChange={(e) => change("transformerEnabled", e.target.value)}
            >
              <option value="no">Disabled / غیرفعال</option>
              <option value="yes">Enabled / فعال</option>
            </select>
          </label>
          {v.transformerEnabled === "yes" && (
            <div>
              {text("ratingVa", "Transformer rating (VA), unity PF", "number")}
              {text(
                "noLoadLossFraction",
                "No-load loss fraction of rating (0..0.1)",
                "number",
              )}
              {text(
                "loadLossFraction",
                "Rated output load-loss fraction (0..0.1)",
                "number",
              )}
            </div>
          )}
          <label>AC cable / کابل AC
            <select aria-label="Study AC cable enabled" value={v.acCableEnabled ?? "no"} onChange={e=>change("acCableEnabled",e.target.value)}><option value="no">Disabled</option><option value="yes">Balanced three phase LV</option></select>
          </label>
          {v.acCableEnabled==="yes" && <div data-testid="ac-cable-inputs"><p>Explicit receiving line voltage, per-phase resistance, unity PF. After LV auxiliary, before transformer. Not a voltage load-flow or ampacity/protection design.</p>{text("acCableSource","AC cable source")}{quality("acCableQuality","AC cable quality")}{text("resistancePerPhaseOhm","Per-phase resistance (Ohm)","number")}{text("receivingLineVoltageV","Receiving line voltage (V)","number")}{text("acCableMaxCurrentA","Declared maximum line current (A)","number")}</div>}
          <label>
            {en ? "Auxiliary demand" : "مصرف کمکی"}
            <select
              aria-label="Study auxiliary enabled"
              value={v.auxiliaryEnabled ?? "no"}
              onChange={(e) => change("auxiliaryEnabled", e.target.value)}
            >
              <option value="no">Disabled / غیرفعال</option>
              <option value="yes">Constant W / توان ثابت</option>
              <option value="schedule">Interval schedule / برنامهٔ بازه‌ای</option>
            </select>
          </label>
          {v.auxiliaryEnabled === "yes" &&
            text(
              "auxiliaryPowerW",
              "Always-on LV auxiliary (W), excluding inverter self-consumption",
              "number",
            )}
          {v.auxiliaryEnabled === "schedule" && (
            <div>
              {text("auxiliaryScheduleSource", "Auxiliary schedule source / منبع")}
              <label>
                Auxiliary schedule quality
                <select
                  aria-label="Study auxiliaryScheduleQuality"
                  value={v.auxiliaryScheduleQuality ?? ""}
                  onChange={(e) =>
                    change("auxiliaryScheduleQuality", e.target.value)
                  }
                >
                  <option value="">—</option>
                  {[
                    "measured",
                    "weather_provider",
                    "user_configured",
                    "assumed",
                  ].map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                CSV: timestamp,powerW
                <textarea
                  aria-label="Study auxiliarySchedule CSV"
                  className="block w-full bg-slate-900"
                  rows={5}
                  value={v.auxiliaryScheduleCsv ?? ""}
                  onChange={(e) => change("auxiliaryScheduleCsv", e.target.value)}
                />
              </label>
              <p>
                {en
                  ? "Paste complete plain CSV with the exact weather interval-end timeline, explicit UTC offsets and nonnegative interval-average W. No missing interval is filled."
                  : "CSV کامل و ساده با خط زمان پایان بازه دقیقاً مطابق هواشناسی، offset صریح و توان میانگین غیرمنفی به وات وارد کنید؛ هیچ بازه مفقود پر نمی‌شود."}
              </p>
            </div>
          )}
          <label>
            {en ? "Interval AC availability" : "دسترس‌پذیری بازه‌ای AC"}
            <select
              aria-label="Study availability enabled"
              value={v.availabilityEnabled ?? "no"}
              onChange={(e) => change("availabilityEnabled", e.target.value)}
            >
              <option value="no">Disabled / غیرفعال</option>
              <option value="yes">Enabled / فعال</option>
            </select>
          </label>
          {v.availabilityEnabled === "yes" && (
            <div>
              {text("availabilitySource", "Availability source / منبع")}
              <label>
                Availability quality
                <select
                  aria-label="Study availabilityQuality"
                  value={v.availabilityQuality ?? ""}
                  onChange={(e) =>
                    change("availabilityQuality", e.target.value)
                  }
                >
                  <option value="">—</option>
                  {[
                    "measured",
                    "weather_provider",
                    "user_configured",
                    "assumed",
                  ].map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                CSV: timestamp,availableFraction
                <textarea
                  aria-label="Study availability CSV"
                  className="block w-full bg-slate-900"
                  rows={5}
                  value={v.availabilityCsv ?? ""}
                  onChange={(e) => change("availabilityCsv", e.target.value)}
                />
              </label>
              <p>
                {en
                  ? "Paste complete plain CSV with the exact weather interval-end timeline, explicit UTC offsets and fractions 0..1. No missing interval is filled."
                  : "CSV کامل و ساده با خط زمان پایان بازه دقیقاً مطابق هواشناسی، offset صریح و ضریب صفر تا یک وارد کنید؛ هیچ بازه مفقود پر نمی‌شود."}
              </p>
            </div>
          )}
        </fieldset>
        {v.inverterModel === "sandia" && (
          <div
            data-testid="sandia-inputs"
            className="space-y-3 border border-sky-800 p-3"
          >
            <p>
              {en
                ? "Explicit fitted inverter parameters and supported voltage/power domain required. Select De Soto and set additional DC loss to zero: cable voltage drop is not modeled. inverterPdc0W must equal Pdco (reference, not protection rating); legacy eta values are inactive. Negative inverter AC is imported self-consumption, reported separately from nonnegative export. No real controller dynamics or certified protection."
                : "پارامترهای صریح برازش‌شده و دامنه معتبر ولتاژ/توان لازم است. De Soto را انتخاب و تلفات DC اضافی را صفر کنید؛ افت ولتاژ کابل مدل نشده است. inverterPdc0W باید برابر Pdco باشد (مرجع، نه حد حفاظت)؛ etaهای قبلی غیرفعال‌اند. AC منفی اینورتر واردات مصرف داخلی است و جدا از صادرات غیرمنفی گزارش می‌شود. بدون کنترل دینامیکی یا حفاظت تأییدشده."}
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {sandiaFields.map(([key, label]) => text(key, label, "number"))}
            </div>
          </div>
        )}
        {v.electricalModel === "blocks" && <fieldset data-testid="inverter-block-inputs" className="border p-3"><legend>Independent inverter blocks / بلوک‌های اینورتر مستقل</legend><p>2–4 blocks, each with unique id, source, quality and full system object. Same site/weather; independent optics, thermal, DC, MPPT and inverter. Clipping/internal consumption per block, then signed AC sum before common root plant/export. No block nesting or child plant/export; additionalDcLossPct=0. Root nameplates/DC inverter reference capacities must equal sums. Root optical/thermal diagnostics and inverter efficiency are not an equivalent plant model. Max 8784 total block-MPPT intervals.</p><textarea aria-label="Study inverter blocks JSON" dir="ltr" rows={14} className="w-full bg-slate-900" value={v.inverterBlocksJson??""} onChange={e=>change("inverterBlocksJson",e.target.value)}/></fieldset>}
        {v.electricalModel === "multi" && <fieldset className="space-y-2 border p-3" data-testid="multi-mppt-inputs">
          <legend>Independent MPPT / ورودی‌های مستقل</legend>
          <p>2–4 fixed-tilt uniform subarrays; each entry must explicitly declare id, source, quality, surfaceTiltDeg, surfaceAzimuthDeg, arrayPdc0W and electrical (full diode/limits, optional dcCable). Same site/weather and optical/thermal coefficients; each input has its own POA, cell temperature and terminal operating point. Total arrayPdc0W must equal the sum. additionalDcLossPct=0. PVWatts inverter only, clipping once after summing DC; no shared voltage. Root plane is a reference diagnostic only. Maximum 8784 weather intervals and 17568 input-intervals total; no automatic annual splitting. / هر ورودی هندسه، دیود، قیود و کابل مستقل؛ بدون فرض ولتاژ مشترک.</p>
          <label className="block">MPPT input list JSON / فهرست ورودی‌ها
            <textarea aria-label="Study MPPT inputs JSON" dir="ltr" className="block w-full bg-slate-900 p-2" rows={14} value={v.mpptInputsJson??""} onChange={e=>change("mpptInputsJson",e.target.value)} />
          </label>
        </fieldset>}
        {v.electricalModel === "diode" && (
          <div
            data-testid="electrical-inputs"
            className="space-y-3 border border-sky-800 p-3"
          >
            <p className="text-xs">
              {en
                ? "Module-level fitted parameters, uniform identical modules and one DC bus only. No guessing/fitting or bypass/mismatch. EgRef/dEgdT must match parameter source. Array nameplate must match module reference MPP × counts within 2%; gammaPdcPerC below is inactive. MPPT is an ideal static envelope, not certified protection or real controller dynamics. Voc checks apply only to the specified design condition and modeled samples."
                : "پارامترهای برازش‌شده در سطح ماژول، ماژول‌های یکسان با تابش/دمای یکنواخت و فقط یک باس DC. بدون حدس/برازش و بدون bypass یا mismatch. EgRef/dEgdT باید با منبع سازگار باشند. توان نامی آرایه باید با MPP مرجع×تعدادها تا ۲٪ سازگار باشد؛ gammaPdcPerC پایین غیرفعال است. MPPT یک قید ایستای ایده‌آل است، نه حفاظت تأییدشده یا کنترل واقعی. بررسی Voc فقط شرایط طراحی اعلام‌شده و sampleها را می‌پوشاند."}
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <label>DC cable / کابل DC
                <select aria-label="Study DC cable" value={v.dcCableEnabled ?? "no"} onChange={e=>change("dcCableEnabled",e.target.value)}>
                  <option value="no">Disabled / غیرفعال</option><option value="yes">Uniform strings + shared home run / رشته‌های یکسان و کابل مشترک</option>
                </select>
              </label>
              {v.dcCableEnabled === "yes" && <>
                <p className="text-xs">Explicit round-trip loop Ω at declared design conditions, not one-way resistance. R_eq = R_string / parallel strings + R_shared. No automatic cable temperature correction or ampacity assessment. additionalDcLossPct must be zero. MPPT voltage/current are inverter-terminal values. / مقاومت حلقهٔ رفت‌وبرگشت؛ بدون تبدیل دما یا تأیید ظرفیت جریان کابل.</p>
                {text("dcCableSource", "DC cable resistance source / منبع و شرایط مقاومت")}
                {quality("dcCableQuality", "DC cable quality / کیفیت")}
                {text("stringLoopResistanceOhm", "Each identical string loop resistance (Ω) / مقاومت حلقه هر رشته", "number")}
                {text("sharedLoopResistanceOhm", "Shared home-run loop resistance (Ω) / مقاومت حلقه کابل مشترک", "number")}
              </>}
              {electricalFields.map(([key, label]) =>
                text(key, label, "number"),
              )}
            </div>
          </div>
        )}
        <div className="grid sm:grid-cols-3 gap-3">
          {text("label", "Study name / نام مطالعه")}
          {text("altitudeM", "Altitude / ارتفاع (m)", "number")}
          {text("timezone", "IANA timezone / منطقه زمانی")}
          <label>
            {en ? "Thermal model" : "مدل حرارتی"}
            <select
              aria-label="Study thermal model"
              value={v.thermalModel ?? "sapm"}
              onChange={(e) => change("thermalModel", e.target.value)}
            >
              <option value="sapm">SAPM</option>
              <option value="faiman">Faiman</option>
              <option value="pvsyst">
                PVsyst — explicit 10 m wind coefficients
              </option>
              <option value="explicit">
                Explicit interval cell temperature
              </option>
            </select>
          </label>
          {(v.thermalModel === "pvsyst" || v.thermalModel === "explicit") && (
            <div data-testid="new-thermal-inputs">
              <p>
                {en
                  ? "Explicit source required. No fitting, missing-data fill or wind-height/module-to-cell conversion. SAPM coefficients retained but inactive."
                  : "منبع صریح لازم است. بدون برازش، پرکردن داده یا تبدیل ارتفاع باد/دمای ماژول به سلول. ضرایب SAPM حفظ ولی غیرفعال‌اند."}
              </p>
              {v.thermalModel === "pvsyst" ? (
                <>
                  {text("uc", "Uc (W/m²/K)", "number")}
                  {text("uv", "Uv (W/m²/K per m/s)", "number")}
                  {text(
                    "moduleEfficiency",
                    "Fixed thermal module efficiency (0..0.5)",
                    "number",
                  )}
                  {text("alphaAbsorption", "Absorptance (0.01..1)", "number")}
                  {text("pvsystSource", "PVsyst source")}
                </>
              ) : (
                <>
                  {text("cellSource", "Cell temperature source")}
                  <label>
                    timestamp,cellTemperatureC
                    <textarea
                      aria-label="Study cell temperature CSV"
                      className="block w-full bg-slate-900"
                      value={v.cellCsv ?? ""}
                      onChange={(e) => change("cellCsv", e.target.value)}
                    />
                  </label>
                </>
              )}
              <label>
                Quality
                <select
                  aria-label="Study thermal quality"
                  value={
                    (v.thermalModel === "pvsyst"
                      ? v.pvsystQuality
                      : v.cellQuality) ?? ""
                  }
                  onChange={(e) =>
                    change(
                      v.thermalModel === "pvsyst"
                        ? "pvsystQuality"
                        : "cellQuality",
                      e.target.value,
                    )
                  }
                >
                  <option value="">—</option>
                  {[
                    "measured",
                    "weather_provider",
                    "user_configured",
                    "assumed",
                  ].map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {v.thermalModel === "faiman" && (
            <div data-testid="faiman-inputs">
              <p>
                {en
                  ? "Explicit fitted coefficients for 10 m wind required; no height conversion. SAPM coefficients below are retained but inactive. Row thermal irradiance remains the declared proxy, not validated bifacial heat transfer."
                  : "ضرایب صریح معتبر برای باد ۱۰ متر لازم است؛ بدون تبدیل ارتفاع. ضرایب SAPM پایین حفظ ولی غیرفعال‌اند. تابش حرارتی ردیف همان proxy اعلام‌شده است، نه انتقال حرارت دوطرفه تأییدشده."}
              </p>
              {text("u0", "u0 (W/m²/K)", "number")}
              {text("u1", "u1 (W/m²/K per m/s)", "number")}
            </div>
          )}
          <label>
            {en ? "AC export cap" : "سقف صادرات AC"}
            <select
              aria-label="Study export enabled"
              value={v.exportEnabled ?? "no"}
              onChange={(e) => change("exportEnabled", e.target.value)}
            >
              <option value="no">{en ? "Disabled" : "غیرفعال"}</option>
              <option value="yes">{en ? "Constant W" : "توان ثابت"}</option>
              <option value="schedule">{en ? "Interval schedule" : "برنامهٔ بازه‌ای"}</option>
            </select>
          </label>
          {v.exportEnabled === "yes" && (
            <div>
              <p>
                {en
                  ? "After inverter and declared AC plant; no external local load or storage. Zero means no export; imports remain. No DC feedback or grid dynamics."
                  : "پس از اینورتر؛ بدون بار محلی یا ذخیره‌ساز. صفر یعنی بدون صادرات. بدون بازخورد DC یا دینامیک شبکه."}
              </p>
              {text(
                "acExportLimitW",
                en ? "AC export limit (W)" : "حد صادرات AC (W)",
                "number",
              )}
            </div>
          )}
          {v.exportEnabled === "schedule" && (
            <div>
              {text("exportScheduleSource", "Export cap schedule source / منبع")}
              <label>
                Export cap schedule quality
                <select
                  aria-label="Study exportScheduleQuality"
                  value={v.exportScheduleQuality ?? ""}
                  onChange={(e) =>
                    change("exportScheduleQuality", e.target.value)
                  }
                >
                  <option value="">—</option>
                  {[
                    "measured",
                    "weather_provider",
                    "user_configured",
                    "assumed",
                  ].map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                CSV: timestamp,limitW
                <textarea
                  aria-label="Study exportSchedule CSV"
                  className="block w-full bg-slate-900"
                  rows={5}
                  value={v.exportScheduleCsv ?? ""}
                  onChange={(e) => change("exportScheduleCsv", e.target.value)}
                />
              </label>
              <p>
                {en
                  ? "Paste complete plain CSV with the exact weather interval-end timeline, explicit UTC offsets and nonnegative export limits W. No missing interval is filled."
                  : "CSV کامل و ساده با خط زمان پایان بازه دقیقاً مطابق هواشناسی، offset صریح و سقف صادرات غیرمنفی به وات وارد کنید؛ هیچ بازه مفقود پر نمی‌شود."}
              </p>
            </div>
          )}
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
              setImportTrace(undefined);
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
        <DeclaredWeatherImporter site={{latitude,longitude,altitudeM:Number(v.altitudeM),timezone:v.timezone ?? ""}} onDirty={()=>{onDirty();setReview(null);setConfirmed(false);}} onApply={weather=>{csvRevision.current++;setRecords(weather.records);setImportTrace(weather.importTrace);setV(old=>({...old,weatherSource:weather.source,weatherQuality:weather.quality,intervalMinutes:String(weather.intervalMinutes)}));setReview(null);setConfirmed(false);setError("");onDirty();}}/>
        {importTrace&&<p data-testid="weather-import-trace">Declared weather raw package retained · {importTrace.rawCsvSha256}<button type="button" onClick={()=>{setImportTrace(undefined);setReview(null);onDirty();}}>Detach import trace (explicit canonical edit)</button></p>}
        <MeasurementImporter datasets={measurements} site={{latitude,longitude}} weather={{intervalMinutes:Number(v.intervalMinutes),records}} onDirty={()=>{onDirty();setReview(null);}} onChange={values=>{setMeasurements(values);setReview(null);setError("");onDirty();}}/>
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
                  ...(v.horizonEnabled === "yes"
                    ? {
                        horizonProfile: {
                          source: v.horizonSource,
                          quality: v.horizonQuality,
                          points: parseHorizonCsv(v.horizonCsv ?? ""),
                        },
                      }
                    : {}),
                  ...(v.soilingEnabled === "yes"
                    ? {
                        soilingSchedule: {
                          source: v.soilingSource,
                          quality: v.soilingQuality,
                          records: parseSoilingCsv(v.soilingCsv ?? ""),
                        },
                      }
                    : {}),
                  ...(v.albedoEnabled === "yes"
                    ? {
                        albedoSchedule: {
                          source: v.albedoSource,
                          quality: v.albedoQuality,
                          records: parseAlbedoCsv(v.albedoCsv ?? ""),
                        },
                      }
                    : {}),

                  ...(v.acCableEnabled==="yes" ? {acCable:{source:v.acCableSource,quality:v.acCableQuality,topology:"balanced_three_phase_lv",resistancePerPhaseOhm:number("resistancePerPhaseOhm"),receivingLineVoltageV:number("receivingLineVoltageV"),maxCurrentA:number("acCableMaxCurrentA")}} : {}),
                  ...(v.transformerEnabled === "yes"
                    ? {
                        transformer: {
                          ratingVa: number("ratingVa"),
                          noLoadLossFraction: number("noLoadLossFraction"),
                          loadLossFraction: number("loadLossFraction"),
                        },
                      }
                    : {}),
                  ...(v.auxiliaryEnabled === "yes"
                    ? { auxiliaryPowerW: number("auxiliaryPowerW") }
                    : {}),
                  ...(v.auxiliaryEnabled === "schedule" ? {auxiliarySchedule:{source:v.auxiliaryScheduleSource,quality:v.auxiliaryScheduleQuality,records:parseAuxiliaryCsv(v.auxiliaryScheduleCsv ?? "")}} : {}),
                  ...(v.availabilityEnabled === "yes"
                    ? {
                        acAvailability: {
                          source: v.availabilitySource,
                          quality: v.availabilityQuality,
                          records: parseAvailabilityCsv(
                            v.availabilityCsv ?? "",
                          ),
                        },
                      }
                    : {}),
                  ...(v.skyDiffuseModel === "perez"
                    ? { skyDiffuseModel: "perez" }
                    : request?.system.skyDiffuseModel === "haydavies"
                      ? { skyDiffuseModel: "haydavies" }
                      : {}),
                  ...(v.beamIamModel === "physical"
                    ? {
                        physicalIam: Object.fromEntries(
                          physicalIamFields.map(([key]) => [key, number(key)]),
                        ),
                      }
                    : {}),
                  ...(v.spectralModel === "sapm"
                    ? {
                        sapmSpectral: Object.fromEntries(
                          spectralFields.map(([key]) => [key, number(key)]),
                        ),
                      }
                    : {}),
                  ...(v.inverterModel === "sandia" && v.electricalModel !== "blocks"
                    ? {
                        sandia: Object.fromEntries(
                          sandiaFields.map(([key]) => [key, number(key)]),
                        ),
                      }
                    : {}),
                  ...(v.thermalModel === "pvsyst"
                    ? {
                        pvsystTemperature: {
                          source: v.pvsystSource,
                          quality: v.pvsystQuality,
                          uc: number("uc"),
                          uv: number("uv"),
                          moduleEfficiency: number("moduleEfficiency"),
                          alphaAbsorption: number("alphaAbsorption"),
                          windHeightM: 10,
                        },
                      }
                    : {}),
                  ...(v.thermalModel === "explicit"
                    ? {
                        cellTemperatureSchedule: {
                          source: v.cellSource,
                          quality: v.cellQuality,
                          records: parseCellTemperatureCsv(v.cellCsv ?? ""),
                        },
                      }
                    : {}),
                  ...(v.thermalModel === "faiman"
                    ? {
                        faiman: {
                          u0: number("u0"),
                          u1: number("u1"),
                          windHeightM: 10,
                        },
                      }
                    : {}),
                  ...(v.exportEnabled === "schedule" ? {acExportLimitSchedule:{source:v.exportScheduleSource,quality:v.exportScheduleQuality,records:parseExportLimitCsv(v.exportScheduleCsv ?? "")}} : {}),
                  ...(v.exportEnabled === "yes"
                    ? { acExportLimitW: number("acExportLimitW") }
                    : {}),
                  ...(v.electricalModel === "blocks" ? {inverterBlocks:JSON.parse(v.inverterBlocksJson || "null")} : {}),
                  ...(v.electricalModel === "multi" ? {mpptInputs: JSON.parse(v.mpptInputsJson || "null")} : {}),
                  ...(v.electricalModel === "diode"
                    ? {
                        electrical: {
                          ...Object.fromEntries(electricalFields.map(([key]) => [key, number(key)])),
                          ...(v.dcCableEnabled === "yes" ? {dcCable:{
                            topology:"uniform_strings_shared_home_run",
                            source:v.dcCableSource,quality:v.dcCableQuality,
                            stringLoopResistanceOhm:number("stringLoopResistanceOhm"),
                            sharedLoopResistanceOhm:number("sharedLoopResistanceOhm"),
                          }} : {}),
                        },
                      }
                    : {}),
                  ...(v.optics === "rows"
                    ? {
                        rowIrradiance: {
                          ...Object.fromEntries(
                            rowFields.map(([key]) => [
                              key === "rowGcr" ? "gcr" : key,
                              number(key),
                            ]),
                          ),
                          temperatureIrradiance: v.temperatureIrradiance,
                        },
                      }
                    : {}),
                  ...(v.mounting === "single_axis"
                    ? {
                        tracking: {
                          ...Object.fromEntries(
                            trackingFields.map(([key]) => [key, number(key)]),
                          ),
                          backtrack: (() => {
                            if (!["true", "false"].includes(v.backtrack))
                              throw new Error(
                                "Choose backtracking explicitly / وضعیت backtracking را انتخاب کنید",
                              );
                            return v.backtrack === "true";
                          })(),
                        },
                      }
                    : {}),
                  inverterEtaRef: 0.9637,
                  temperature: {
                    a: number("a"),
                    b: number("b"),
                    deltaT: number("deltaT"),
                  },
                },
                ...(measurements.length ? {measurements} : {}),
                parameterProvenance: {
                  source: v.parameterSource,
                  quality: v.parameterQuality,
                },
                weather: {
                  ...(importTrace ? {importTrace} : {}),
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
            <StudyInsights request={review} en={en} />
            {review.system.inverterBlocks&&<div data-testid="inverter-block-review"><p>Signed AC aggregation AFTER each independent inverter. Internal consumption is not subtracted twice. Root plant/export once. Reference-plane diagnostics only.</p><pre dir="ltr" className="overflow-auto">{JSON.stringify(review.system.inverterBlocks,null,2)}</pre></div>}
            {review.system.mpptInputs && <div data-testid="multi-mppt-review"><p>Independent terminal MPPTs; one PVWatts inverter after DC aggregation. Root POA/temperature are reference-plane diagnostics only.</p><pre dir="ltr" className="overflow-auto">{JSON.stringify(review.system.mpptInputs,null,2)}</pre></div>}
            {review.system.electrical?.dcCable && <p data-testid="dc-cable-review" dir="ltr">DC cable: uniform identical strings + shared home run; string loop {review.system.electrical.dcCable.stringLoopResistanceOhm} Ω; shared loop {review.system.electrical.dcCable.sharedLoopResistanceOhm} Ω. Fixed declared design-condition resistance. Inverter-terminal MPPT; no double percentage loss. Source: {review.system.electrical.dcCable.source} ({review.system.electrical.dcCable.quality}).</p>}
            {(review.system.pvsystTemperature ||
              review.system.cellTemperatureSchedule) && (
              <p data-testid="new-thermal-review">
                Thermal mode:{" "}
                {review.system.pvsystTemperature
                  ? "PVsyst explicit 10 m fitted coefficients"
                  : "explicit interval cell temperature; no fill"}
              </p>
            )}
            <p>
              {en
                ? "Contract checks passed: ordered, regular, finite, bounded. No gap filling. Domain checks also run in Python."
                : "کنترل قرارداد موفق: مرتب، منظم، متناهی و در دامنه؛ بدون پرکردن شکاف. بررسی فیزیکی در Python نیز اجرا می‌شود."}
            </p>
            {(review.system.soilingSchedule ||
              review.system.albedoSchedule ||
              review.system.horizonProfile) && (
              <p data-testid="environment-review">
                {en
                  ? "Environment contracts checked; schedules aligned in UTC, no fill."
                  : "قرارداد محیط بررسی شد؛ برنامه‌ها هم‌تراز UTC و بدون پرکردن."}{" "}
                {review.system.soilingSchedule?.records.length} /{" "}
                {review.system.albedoSchedule?.records.length} /{" "}
                {review.system.horizonProfile?.points.length}
              </p>
            )}
            {review.measurements&&<p data-testid="measurements-review">Independent observations: {review.measurements.length} dataset(s), {review.measurements.reduce((n,d)=>n+d.records.length,0)} records. Not model inputs or field validation.</p>}
            {review.system.acExportLimitSchedule && <p data-testid="export-schedule-review">Explicit interval export cap W: {review.system.acExportLimitSchedule.records.length} · {review.system.acExportLimitSchedule.source} · {review.system.acExportLimitSchedule.quality}. After plant; imports unaffected; no DC feedback.</p>}
            {review.system.auxiliarySchedule && <p data-testid="auxiliary-schedule-review">LV auxiliary interval-average W: {review.system.auxiliarySchedule.records.length} · {review.system.auxiliarySchedule.source} · {review.system.auxiliarySchedule.quality}. Applied before transformer, including night and zero availability; excludes inverter internal consumption.</p>}
            {review.system.acAvailability && (
              <p data-testid="availability-review">
                {en
                  ? "Availability schedule aligned in UTC, no fill"
                  : "برنامه دسترس‌پذیری هم‌تراز UTC؛ بدون پرکردن"}
                : {review.system.acAvailability.records.length} ·{" "}
                {review.system.acAvailability.source} ·{" "}
                {review.system.acAvailability.quality}
              </p>
            )}
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
