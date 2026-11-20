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
            mounting: r.system.tracking ? "single_axis" : "fixed",
            thermalModel: r.system.faiman ? "faiman" : "sapm",
            u0: r.system.faiman ? String(r.system.faiman.u0) : "",
            u1: r.system.faiman ? String(r.system.faiman.u1) : "",
            exportEnabled: r.system.acExportLimitW !== undefined ? "yes" : "no",
            acExportLimitW:
              r.system.acExportLimitW !== undefined
                ? String(r.system.acExportLimitW)
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
            electricalModel: r.system.electrical ? "diode" : "pvwatts",
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
            </select>
          </label>
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
            {en ? "Constant AC export cap" : "سقف ثابت صادرات AC"}
            <select
              aria-label="Study export enabled"
              value={v.exportEnabled ?? "no"}
              onChange={(e) => change("exportEnabled", e.target.value)}
            >
              <option value="no">{en ? "Disabled" : "غیرفعال"}</option>
              <option value="yes">{en ? "Enabled" : "فعال"}</option>
            </select>
          </label>
          {v.exportEnabled === "yes" && (
            <div>
              <p>
                {en
                  ? "After inverter; assumes no local load or storage. Zero means no export. No DC feedback or grid dynamics."
                  : "پس از اینورتر؛ بدون بار محلی یا ذخیره‌ساز. صفر یعنی بدون صادرات. بدون بازخورد DC یا دینامیک شبکه."}
              </p>
              {text(
                "acExportLimitW",
                en ? "AC export limit (W)" : "حد صادرات AC (W)",
                "number",
              )}
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
                  ...(v.inverterModel === "sandia"
                    ? {
                        sandia: Object.fromEntries(
                          sandiaFields.map(([key]) => [key, number(key)]),
                        ),
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
                  ...(v.exportEnabled === "yes"
                    ? { acExportLimitW: number("acExportLimitW") }
                    : {}),
                  ...(v.electricalModel === "diode"
                    ? {
                        electrical: Object.fromEntries(
                          electricalFields.map(([key]) => [key, number(key)]),
                        ),
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
