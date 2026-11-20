# Direct pvlib studies — v1 operator and user guide

**به‌روزرسانی مدل / Model update:** موتور 1.1.0 اکنون fixed-tilt و single-axis monofacial را پشتیبانی می‌کند. قرارداد جدید، روش استفاده و محدودیت‌ها: [راهنمای ردیاب تک‌محوره](PVLIB-SINGLE-AXIS.fa.md).
**Workflow update:** A bilingual form builder, strict weather CSV review, browser-local IndexedDB snapshots, portable restore, compatible-scenario comparison and printable HTML reporting are now available. See [the workflow guide](PVLIB-STUDY-WORKFLOW.fa.md). The original JSON import/API remain supported.

This is a separate, **real Python execution** path, not a JavaScript approximation or a relabeling of the existing screening waterfall. It is opt-in and disabled by default. It can run on a local computer without internet after installing its pinned runtime; a remote deployment needs connectivity to that server. No weather/provider fetch is performed by this worker.

## Scope: what is and is not implemented

Supported: one fixed-tilt or ideal single-axis tracking monofacial aggregate array and one aggregate inverter, explicit module/inverter and SAPM temperature parameters, complete regular interval-average GHI/DNI/DHI, dry-bulb temperature and **10 m** wind. Engine 1.1.0 calls pvlib-python **0.13.1** directly for SPA, optional single-axis geometry, Hay-Davies transposition, ASHRAE beam IAM, SAPM cell temperature, PVWatts DC and PVWatts inverter. It is **not** equivalent to SAM/PVWatts V8, a string electrical model or a measured site validation.

Not implemented in this chain: automatic weather acquisition, irradiation decomposition from GHI, gap filling, horizon/near or electrical row shading, bifacial, tracker stow/control/motor consumption, snow/Kimber, batteries, grid curtailment, financial dispatch, persistent job queue or multi-node scheduling. Existing screening and reference-snow/soiling features remain separate and unchanged. No output is silently copied into screening finance, sizing or waterfall. No legacy clipping/loss factor is applied a second time.

The current study report is **JSON plus intermediate CSV**, independently downloadable from the study panel. It is not merged into the existing project's DOCX/XLSX or automatically restored by the existing project loader. Save a snapshot in the local study library or export a portable archive to retain a study; changing the active site or leaving the panel clears only its active in-memory state. Server-side automatic history storage is deliberately absent to avoid storing private weather under an unscoped shared project identity.

## Install and run locally

Python 3.11 is the tested reference environment; Node 20/22 remains the application runtime. Pinned Python dependencies are in `services/pvlib_study/requirements.txt`. No dependency is downloaded at study-request time.

Linux/macOS:

```sh
python3 -m venv .cache/pvlib-study-venv
.cache/pvlib-study-venv/bin/python -m pip install -r services/pvlib_study/requirements.txt
npm ci
PVLIB_STUDY_ENABLED=true PVLIB_PYTHON="$PWD/.cache/pvlib-study-venv/bin/python" npm run dev
```

Windows PowerShell:

```powershell
python -m venv .cache/pvlib-study-venv
& .cache/pvlib-study-venv/Scripts/python.exe -m pip install -r services/pvlib_study/requirements.txt
npm ci
$env:PVLIB_STUDY_ENABLED='true'
$env:PVLIB_PYTHON=(Resolve-Path .cache/pvlib-study-venv/Scripts/python.exe).Path
npm run dev
```

Do not expose the development server to untrusted networks. In production, study execution requires a verified identity using the application's existing HS256 JWT or trusted-gateway mechanism. An authenticated reverse proxy can inject the configured identity; an API client can send a signed Bearer token. The UI does not embed signing secrets or implement a new login flow. Simply enabling the feature does not bypass authentication. A standalone production browser without an authenticated gateway/session integration will see `AUTH_REQUIRED`, not an anonymous execution.

The existing default Docker image is not changed to install Python. An **optional** `Dockerfile.study` and `docker-compose.study.yml` provide the dual-runtime deployment. Set private `JWT_SECRET`, `JWT_ISSUER` and `JWT_AUDIENCE`, then use `docker compose -f docker-compose.study.yml up --build`. The signing secret must stay at the server/gateway, never in a frontend build variable. Run behind HTTPS and authenticated ingress. The study image runs as the existing non-root node user; the compose file bounds memory/CPU/processes and mounts only the existing application data volume writable. The container recipe is supplied separately from the local execution tests; see the delivery audit for which environments actually ran.

## UI workflow

1. Select the site's coordinates in **Site & Climate**.
2. Open **Independent direct pvlib-python study**. The adjacent text explicitly identifies current offline project calculations as screening.
3. Import your JSON study, maximum 8 MiB. Coordinates must match the active site; the study's equipment and geometry are independent, caller-specified scenario inputs and are displayed before running. They are not automatically verified against the selected catalog or 3D scene.
4. Run the study. `enabled` in capabilities means configuration enabled, **not** a health check of installed Python dependencies.
5. Inspect period energy, monthly UTC totals, warnings, units and the full model/version manifest. Partial periods remain period totals; they are not extrapolated to a year.
6. Download the JSON study report (exact request, results and execution manifest) and optional CSV intermediates. Formatting is display-only; exports retain unrounded computed numbers.

An invalid file leaves the prior imported request untouched and displays the error. A new successful import clears the previous result. A failed execution clears the previous result rather than presenting it as a new success. Cancellation, timeout, capacity exhaustion, authentication failure or missing Python dependencies never invoke a screening fallback. Switching site/unmounting the panel aborts the request and prevents late responses from overwriting the new site's state.

## Request contract

Authoritative checked schemas: `src/studies/studyContract.ts` and `services/pvlib_study/worker.py`. Unknown fields and missing required fields are rejected. Numerical bounds are **service guardrails, not evidence that every parameter combination is scientifically validated**.

```text
schemaVersion: "pvlib-study-v1"
label: nonblank description, <=200 characters
site:
  latitude, longitude: degrees (+north, +east)
  altitudeM: elevation above sea level, -500..9000 m
  timezone: valid IANA timezone (metadata; explicit offsets define actual instants)
system:
  surfaceTiltDeg: 0..90, surfaceAzimuthDeg: 0..360 clockwise from north
  albedo: 0..1
  arrayPdc0W: aggregate DC STC nameplate, W
  gammaPdcPerC: -0.01..0 per degC (NOT percent/degC)
  inverterPdc0W: inverter DC input limit, W (NOT array nameplate)
  inverterEtaNom: 0.8..0.995
  inverterEtaRef: exactly 0.9637 for this supported model configuration
  iamB: explicit ASHRAE coefficient, 0..1
  additionalDcLossPct: explicit constant additional DC loss, 0..100%
  tracking: optional strict tracker object; all six fields explicit (see single-axis guide)
  temperature: {a: -10..0, b: -1..0, deltaT: 0..20 degC}
parameterProvenance:
  source: nonblank source/assumption description, <=500 characters
  quality: measured | weather_provider | user_configured | assumed
weather:
  source, quality: same requirements as parameterProvenance
  windHeightM: exactly 10 (no implicit height correction)
  timestampConvention: "interval_end"
  intervalMinutes: integer 1..60
  records: 2..17568 records, each with:
    timestamp: YYYY-MM-DDTHH:mm:ss[.sss]Z or signed +/-HH:mm offset
    ghiWm2, dniWm2, dhiWm2: finite 0..2000 W/m2 interval averages
    tempAirC: finite -90..70 degC
    windSpeedMs: finite 0..75 m/s
```

Array DC nameplate / inverter DC input limit must be <=2 in this first configuration. Wider overload domains and alternative electrical models are not silently extrapolated. Full irradiance averaging intervals must be regular, ordered and without gaps/duplicates; naive/local/date-only timestamps and invalid calendar dates are rejected. Coverage is supported within years 1900..2200 and at most 366 days, including the first interval. Genuine zero irradiance is accepted; missing irradiance/wind/temperature is not converted to zero. At least a complete 30-minute UTC leap year fits the 17568-row limit; finer intervals require shorter studies.

A complete **synthetic numerical test** request is in `services/pvlib_study/tests/synthetic-study.json`, intended only to exercise the protocol and tests. It is not downloaded or substituted into live projects and does not represent measured weather. Replace inputs with justified data and parameters before interpreting energy. There are no hidden equipment/weather defaults.

## Model and time assumptions

- SPA `nrel_numpy`, explicit fixed delta_t=67 s and sunrise/sunset refraction=0.5667 degrees; standard-atmosphere pressure `alt2pres(altitude)`. These are recorded assumptions, not site-measured pressure or historical/forecast Earth-rotation corrections. See [SPA documentation](https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.solarposition.spa_python.html).
- Geometry is evaluated at each interval midpoint; reported samples preserve original interval-end strings and include `midpointUtc`. Interval averages do not become instantaneous truth: [pvlib interval-averaging discussion](https://pvlib-python.readthedocs.io/en/v0.13.1/gallery/irradiance-transposition/plot_interval_transposition_error.html).
- Hay-Davies uses pvlib Spencer extraterrestrial radiation, solar constant 1366.1 W/m²; albedo is explicit. Diffuse IAM and spectral factors are **unity assumptions**. ASHRAE IAM applies to beam only.
- SAPM temperature uses total POA, air temperature and 10 m wind with explicit a/b/deltaT, reference irradiance 1000 W/m². Coefficients must suit actual module construction and mounting. The program does not certify their suitability.
- PVWatts DC uses effective irradiance and explicit gamma, with 25°C reference. Negative predicted DC is outside this configuration's support and is rejected rather than clamped silently.
- Apply `additionalDcLossPct` once at DC; feed that DC directly into pvlib's PVWatts inverter using **inverter** pdc0 and the two efficiency parameters. No old waterfall transposition/thermal/clipping/soiling factors are added. This additional loss is an assumption, not a physical decomposition.
- Energy Wh = sum of modeled W × interval hours (rectangular approximation). Monthly energy is allocated by the midpoint's **UTC month**, not by a prorated split of boundary-crossing intervals or the site's local month. Full-year flag requires an exact complete UTC calendar year; no annualization is performed.
- Positive DNI when the midpoint apparent sun is below the horizon is rejected as unsupported. A partly sunlit sunrise/sunset averaging interval can require finer-resolution input; it is not automatically corrected. GHI/DNI/DHI closure differences >100 W/m² cause a warning and preserve the inputs; the threshold is an engineering diagnostic, not a validation rule.

## API and execution safety

- `GET /api/v1/studies/capabilities`: configuration and supported schema/version, no dependency-health claim; no-store.
- `POST /api/v1/studies/run`: validated request; returns `pvlib-study-result-v1` with summary, monthly results, all intermediate samples, exact parsed request and execution manifest; no-store.
- A completed manifest records run ID and UTC wall-clock start/finish, engine version, worker-file SHA256, requirements-file SHA256, Python/platform and every pinned dependency version. `inputSha256` hashes the Python canonical JSON representation of the parsed request (sorted keys, compact separators, UTF-8, no NaN). It is **not** a hash of raw upload whitespace/bytes. Original timestamp strings and parameter values are retained. Worker checks installed dependency versions against the pinned requirements before computing.
- One process-local study at a time, no unbounded waiting queue. 6 attempts/client/minute, 45-second worker deadline, 8 MiB request and 16 MiB output cap. JSON validation in Node and Python; isolated Python `-I`, no shell, fixed worker path and no caller-controlled executable. Environment inheritance is restricted; dependency installation is an operator action only. stderr is drained, not exposed as a traceback or retained without bound.
- Timeout/client disconnect kills the worker and holds capacity until termination. `429 BUSY` includes Retry-After. `400` rejects schema/JSON, `413` body size, `422` scientific/domain input, `401` identity, `503` disabled/missing runtime/dependency version, `504` time limit, `502` worker/output failure. None is a successful screening response.
- Limits are **per process**, not a distributed scheduler or OS sandbox. Use ingress rate limits, container resource controls and network isolation for public/multi-instance deployment. Do not treat `-I` as a security sandbox. No study files are stored server-side automatically; browser downloads contain potentially private weather and equipment data.

## Tests and scientific claims

```sh
python -m unittest discover -s services/pvlib_study/tests -v
# With PVLIB_PYTHON set to the pinned Python environment:
npm run test:study
npm run build
npm run test:study:browser
```

Numerical checks include a published SAPM temperature example, published SPA reference values, independent equations for DC/inverter/energy accounting, and a separate pvlib ModelChain construction with the same declared assumptions. ModelChain comparison checks our wiring of pvlib; it is **not independent field validation**. Tests also cover missing/invalid/naive/gapped inputs, offset equivalence, zero/night, clipping, leap-year coverage and raw manifest integrity. HTTP/process tests exercise the existing production JWT mechanism, forged identities, disabled mode, body/rate/capacity limits, missing executable, timeouts, abort and output caps. A real browser test runs Python through authenticated HTTP, reads back report downloads, injects an explicit outage and proves the screening waterfall did not change.

Dedicated CI runs these checks on Linux and Windows with Python 3.11. Existing application tests and the existing physics-reference gate are not weakened. The older scanner covers changed TypeScript engine expressions, not Python; the new Python equations and orchestration are covered explicitly by the dedicated CI jobs that run on push rather than being claimed as scanned by that gate.

No measured independent field dataset has been acquired in this implementation. MBE/MAE/RMSE, bankability and annual site accuracy are **not established**. See the research/design record: `docs/audit/PVLIB-DIRECT-STUDY-DESIGN.fa.md`.
