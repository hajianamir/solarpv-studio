# Thermal, uncertainty and radial AC research CLI

**Partial stage 48/49 infrastructure, not operational completion.** This is a
separate Python research path. It never writes StudyResult, fits electrical gain,
relabels module-back measurements as cell temperature, changes finance, or
silently falls back when pvlib fails. The production worker/UI remain unchanged.

## Setup / test

From the repository root:

```sh
python -m venv .cache/thermal-research/venv
.cache/thermal-research/venv/bin/python -m pip install -r services/pvlib_research/requirements.txt
.cache/thermal-research/venv/bin/python -m unittest discover -s services/pvlib_research/tests -v
```

Use the corresponding `Scripts/python.exe` path on Windows. Tests intentionally
label synthetic mathematical inputs separately from the seven real, web-rendered
DTU observations in `docs/examples/research/`.

## DTU parse / research experiment

```sh
.cache/thermal-research/venv/bin/python -m services.pvlib_research thermal \
  --excerpt docs/examples/research/dtu-v3-t7-rendered-excerpt.csv \
  --research-fit-plan docs/examples/research/dtu-v3-t7-research-plan.json \
  --output .cache/thermal-research/dtu-fit.json
```

For a locally available **original DTU v3** workbook use `--xlsx /path/to/file`
instead of `--excerpt`. The XLSX reader verifies publisher MD5 before reading,
computes its own SHA256, bounds compressed/uncompressed size, recognizes exact
headers/units rather than guessing columns, reads cached cell values (no macro,
formula or external-link execution), selects T7/Monofacial/HSAT, preserves quality
exclusion reasons and joins by exact CET(GMT+1) interval-end timestamp. Hour 24 is
explicitly supported. It sorts records without filling gaps. Unknown wind
installation height remains null. Missing or incompatible headers/units stop the
reader. The original-file happy path has only been tested on a clearly synthetic
workbook under a test-only mocked expected checksum; the real original bytes
were not accessible locally. Web-rendered real sheets were inspected separately.

The fixed bounded grid includes a baseline candidate, caches exact candidate
results and reports active bounds. Every uncached candidate invokes the isolated
`thermal_worker.py` process with `target=back_of_module` and measured POA.
Budget includes the four final train/holdout baseline/fitted worker calls.
`--cancel-file /path/to/flag` cancels when the file exists, including while a
worker is running. Worker failure/timeout/cancellation aborts the run: no partial
winner or silent fallback. Holdout never selects coefficients. Training-envelope
extrapolation is visible and blocks acceptance. Jacobian singular values flag
rank loss but are NOT uncertainty estimates or proof of practical identifiability.
Bounds are research declarations, not physical-domain approval. Holdout reports
are diagnostic, not a test-once claim after repeated model development.

**Current real experiment**: 7 observations, one day, four train / three holdout,
unknown wind height, tool-rendered receipt only. Research u0 lower bound was
revised from 5 to 10 after the worker correctly rejected an over-150 C candidate;
no failure gate was weakened and no holdout-based tuning was done. Operational
status remains blocked, independent of optimizer success. No coefficients may be
transferred to a 10 m wind basis, another installation or a cell/energy model.

## Conditional energy uncertainty research

```sh
.cache/thermal-research/venv/bin/python -m services.pvlib_research uncertainty \
  --plan /path/to/sourced-budget.json \
  --output .cache/thermal-research/conditional-budget.json
```

The exact schema and synthetic examples are exercised by `tests/test_research.py`.
Every component needs id, non-overlapping physical `effectIds`, group
(`systematic` / `interannual`), category (`resource` / `model` / `metrology` /
`other`), CV, explicit log bias, source/version/document hash/applicability and
history years. Interannual support must declare at least two years; the tool does
not authenticate this declaration or infer a distribution from it. Duplicate
physical-effect IDs are rejected but differently named overlapping effects still
need independent review. Separate group correlation matrices must be PSD.
Systematic/interannual cross-group independence requires an explicit source;
nonzero cross-group dependence is unsupported, not silently modeled. The full
interannual year-to-year correlation matrix is mandatory, even for one year.

Simulation shares systematic factors across years and correlates interannual
factors across sources and years. Horizon output is **arithmetic mean annual
energy**, not the geometric mean or total lifetime energy. The latter requires
multiplying by the explicit number of years. Analytic lognormal P50/P90/mean are
reported only for a single year; multi-year arithmetic-mean quantiles use Monte
Carlo. Exact mean/variance of the arithmetic average and a separately labeled
log-geometric-mean variance are reported for comparison. Bias is a multiplier
`exp(sum(logBias))`; CV alone never supplies a bias correction.

P90 means the 10th CDF percentile. The DKW 95% band bounds finite Monte Carlo
quantile error under the declared model, **not real-project uncertainty**. PCG64
seed, NumPy version and half-sample diagnostics are included. Source signatures,
independence, probability distributions and engineering approval are NOT
verified: output always remains conditional, projectApproval blocked and
not_field_validated. No thermal RMSE -> energy CV conversion; no long-term
annualization of partial data. No real-project uncertainty budget was available
for DTU, so no project P50/P90 was computed in this delivery.

## Stage 50: conditional radial AC snapshot

```sh
.cache/thermal-research/venv/bin/python -m services.pvlib_research electrical \
  --plan docs/examples/research/radial-ac-synthetic-plan.json \
  --output .cache/thermal-research/radial-ac.json
```

`electrical.py` implements balanced three-phase constant-PQ current summation
(MATPOWER manual 4.3.2). All voltages/impedances must be referred to ONE voltage
level: `voltageLLV` is line-line; `rOhm/xOhm` are per-phase series impedances.
Transformers may only be externally referred series equivalents; tap ratios,
magnetizing/no-load loss and shunts are NOT modeled. Never add old transformer
or cable losses to this output for the same physical effects.

Nodes are oriented/topologically ordered; index 0 is slack, array item 0 is
node 1; each integer `parent` must be smaller than its node index. Load W is
nonnegative, load Var is signed. Generation W is nonnegative; PF is a magnitude
in [0.05,1] and `generationQSign` (+1 injection, -1 absorption) is explicit.
Positive POI P/Q means IMPORT; negative means EXPORT. All P/Q fields are total
three-phase powers. No energy aggregation or hourly schedule is inferred.

Optional `exportLimitW` (nonnegative) triggers proportional active generation
curtailment at fixed PF. Every candidate re-solves load flow and I²R/I²X; loads
remain unchanged. A feasible-side 48-step bracket search is used, not clipping
of POI power. This is a research control policy, not a validated plant controller
or general optimal-power-flow algorithm. Any candidate convergence/domain failure
aborts; no fallback. `maxIterations` defaults to 200 (maximum 2000), complex voltage
step tolerance to 1e-8 V; explicit PQ residual gate and [0.5,1.5] pu mathematical
voltage domain are NOT manufacturer voltage limits. Up to 200 non-slack nodes.

Results include before/after POI, branch currents/losses, voltage magnitudes,
P/Q residuals and generation curtailed. POI ALREADY includes losses. This path
is not connected to StudyResult or its waterfall and does not certify ampacity,
protection, harmonics, unbalance, meshed systems, stability or equipment limits.
Source is caller-declared, not authenticated. Always conditional/project blocked.
Synthetic example and independent algebraic/nodal-root tests are not field
validation. Engineering approval and real topology/equipment data remain needed.

## Stage 51: assumed reduced-order transient research

```sh
.cache/thermal-research/venv/bin/python -m services.pvlib_research transient \
  --plan docs/examples/research/transient-synthetic-plan.json \
  --output .cache/thermal-research/transient.json
```

This is NOT P&O, incremental conductance, an IV-curve/DC-link model or a real
inverter/controller. It models assumed first-order *power tracking* and command
response, a lumped thermal RC and a caller-declared linear thermal derating law.
No physical controller validation is implied by passing ODE tests.

Inputs are explicit contiguous ZOH intervals (0.001–60 seconds), timestamped with
Z/offset; no gaps, overlaps, hourly averages or zero filling. Sub-minute labels
alone cannot prove measurement bandwidth: source is only a caller declaration.
Initial tracked DC power, command power and inverter temperature are mandatory.
No hidden state reset between intervals. MPPT/control time constants in seconds,
thermal R in K/W, C in J/K, rating W, fixed efficiency and derating/shutdown
thresholds C are explicit in `equipment`; none are manufacturer defaults.

States and equations:
- `dm/dt = (availableDcW-m)/mpptTauS`
- `dc/dt = (setpointW-c)/controlTauS`
- `f(T) = clip((shutdownC-T)/(shutdownC-derateStartC), 0, 1)`
- `P = max(0, min(efficiency*min(m,availableDcW), c, hardLimitW, ratingW*f(T)))`
- `heat = P*(1/efficiency-1)`
- `dT/dt = (heat-(T-ambientC)/R)/C`; `dE/dt = P`

Command is deliberately lagged and may exceed a newly reduced SETPOINT during
its response. A distinct hard local AC limit acts algebraically; it is NOT a
POI export limiter, protection certification or a claim of real instantaneous
control. Dropping available power clamps actual AC even if the tracking state
still contains old power. No stored electrical energy is modeled. Above shutdown
the assumed output is zero, without latch/hysteresis, and automatically recovers.
Cooling integral is signed: ambient can heat a colder inverter.

Fixed-step RK4 integrates state, AC joules, conversion heat and ambient heat
with the same stage powers; outputs Wh by dividing by 3600. `stepS` must be no
larger than one tenth of both lags and RC (and at most 10 seconds), with default
200000 / maximum 1000000 total steps. These are numerical-domain bounds, not
proof of hardware stability or accuracy near switching surfaces. Repeat with
smaller steps for each study. There is a step budget, not a wall-clock deadline.
`--cancel-file` aborts between integration steps, without partial output or
fallback. Numerical errors fail closed. Trace contains interval endpoints,
interval energy and thermal-balance residual, not all internal RK stages.

Independent tests use analytic first-order step/cooling/energy oracles and
SciPy DOP853 for coupled thermal derating, plus step refinement and power bounds.
The synthetic example is NOT operational high-frequency telemetry. Real
controller/equipment parameters, independent sufficiently fast measurements,
sensitivity/convergence studies and engineering approval are still required.
Always conditional/project blocked; no connection to production waterfall,
phase-50 load flow, energy finance or real-time control.

## Stage 52: planar tracker geometry and motion research

```sh
.cache/thermal-research/venv/bin/python -m services.pvlib_research tracker \
  --plan docs/examples/research/tracker-synthetic-plan.json \
  --output .cache/thermal-research/tracker.json
```

`tracker.py` uses pinned pvlib slope-aware singleaxis for the ideal geometric
setpoint and a separate constant-speed actuator model for actual motion. It is
NOT real terrain reconstruction, an actuator load model or wind safety approval.

Geometry contract (degrees): azimuth clockwise from north; `slopeAzimuthDeg`
is the direction the plane descends (horizontal projection of its upward
normal); slope tilt 0..30. `terrain.datum` and source are mandatory declarations,
not verified surveys. Axis is assumed parallel to that plane, using pvlib
`calc_axis_tilt` / `calc_cross_axis_tilt`. For south axis: positive theta faces
west; positive axis tilt descends south; positive cross-axis tilt descends west.
Rows are parallel and identical, with GCR = module width / row pitch (<1).
Asymmetric physical travel limits are explicit. This is an infinite-row planar
backtracking TARGET, not a shading calculation of finite terrain/obstacles.

Encoder contract: `physicalTheta = encoderTheta + encoderOffsetDeg` exactly
once. Initial encoder angle and wind latch are mandatory. This new schema does
not change legacy offsets/aliases or production geometry. Physical rotation,
encoder rotation and derived ENU normal at interval end are reported separately.

Contiguous Z/offset-timestamped intervals (0.001..60 s, at most 10000) provide
start-of-interval solar zenith/azimuth and wind held constant for that interval.
No solar-position inference, interpolation, gap filling or guessed wind height.
Wind height and source must be declared but are NOT authenticated; trigger
threshold must apply to that height/measurement definition. No gust prediction.
Wind >= trigger latches stow; wind <= release unlatches; between thresholds the
previous latch persists. Priority: wind stow, then night stow (zenith >=90), then
tracking. Stow is a target with finite transit time, not instant protection.
When tracking resumes it also obeys slew. No acceleration, torque, limit-switch,
collision or snow-load model. Backtracking no longer guarantees no shading when
actual angle lags its target or the row is stowing.

For each actuator, movement time = angle travelled / slew speed. Energy is
`count * (movingW * movingSeconds + idleW * remainingSeconds) / 3600` Wh.
Moving power includes all consumption while moving; idle power is ONLY charged
in the remainder (not twice). No regeneration/startup/torque-varying power model.
Reported energy remains STANDALONE and is never automatically subtracted from
production energy or existing auxiliary. Check physical overlap before importing.
Optional `observedEndEncoderDeg` belongs to that interval's END and is compared
without fitting, filtering or controlling the simulated angle; RMSE/MBE/pair
count are reported, never field approval. Missing log stays null/no comparison,
not a fabricated observation.

`--cancel-file` aborts between intervals; no fallback/partial result. There is
an interval-count bound, not a wall-clock deadline. Tests include independent
flat-plane ENU vector/backtracking oracles, plane-axis orthogonality, offsets
0/6.5/14, slew and motor-unit checks, wind hysteresis and night transitions.
Actual survey/layout, actuator limits, stow specification and sufficiently fast
wind/motion logs plus engineering review remain necessary; outputs always
conditional/project blocked. Synthetic example is NOT operational telemetry.

## Replay receipt improvement (three-pass review)

Stages 50–53 now include the full `plan` and canonical `planSha256` using the
existing sorted compact JSON digest. A hash binds declarations; it does NOT
verify a survey, manufacturer document or reviewer. Stages 50–52 synthetic
persisted outputs were regenerated, with formula and approval status unchanged.
See `docs/audit/PVLIB-THREE-REVIEWS.fa.md` for the three recorded review passes,
tests, environment issue and unresolved real-data gates.

## Stage 53: finite optics and assumed bypass-network research

```sh
.cache/thermal-research/venv/bin/python -m services.pvlib_research shading \
  --plan docs/examples/research/shading-synthetic-plan.json \
  --output .cache/thermal-research/shading.json
```

`shading.py` is an isolated snapshot, not annual yield or a replacement for the
production infinite-sheds implementation. All geometry is explicit ENU metres.
Each receiver patch has origin, perpendicular side vectors `u`/`v` and outward
normal `u cross v`. Sample points are midpoint grid points, equal area. Positive
normal defines the front face. Triangles are finite, opaque and double-sided;
include row/terrain meshes explicitly. Receivers do NOT automatically become
occluders. No reflection, translucent material or receiver/mesh collision check.

Direct irradiation is DNI * max(normal dot sun,0) times visible sample fraction.
Sun azimuth is east of north, zenith from up. DNI must be zero at/below horizon.
Diffuse is ONLY isotropic sky: radiance = DHI/pi integrated over the global
upper hemisphere with positive surface-cosine projection and ray visibility.
Uniform midpoint quadrature in mu=cos(zenith) and azimuth has dOmega=2pi/(M*A).
The unoccluded horizontal integral equals DHI; inclined view factor is approximate.
No separate horizon attenuation is applied: horizon-like opaque geometry belongs
in the mesh, so do not apply an existing horizon/row loss again. No ground/rear
or anisotropic diffuse model is implied.

Ray intersection is double-sided Moller–Trumbore with relative angular tolerance
1e-12, barycentric tolerance 1e-12 and t > 1e-8 m. Coplanar/self origins and nearly
parallel intersections are excluded; geometry separated at comparable distances
is unsupported. Surface grid and sky quadrature alias finite edges: refine BOTH
for a study. Caps: 24 patches, 128 triangles, grid <=12, skyMu <=8, skyAzimuth <=32,
and preflight conservative origin-direction-triangle pairs <= declared budget
(up to 2 million). No wall-clock guarantee. `--cancel-file` checks between rays/
triangles; failure/cancellation gives no new result or fallback.

### Explicit ASSUMED circuit, not a cell-physics model

Each patch corresponds to ONE uniformly illuminated electrical substring. This
averages geometric shading WITHIN a patch; split spatial regions into separate
electrical substrings only if that is consistent with actual wiring. Cell-level
mismatch inside a substring is NOT modeled. Each patch has `iscRefA` and `vocV`.
An explicit list of series strings must use every patch exactly once; strings
are parallel on a COMMON voltage with ideal blocking diodes (no reverse current).
There is no independent MPPT per string in this model.

The deliberately simplified model is:
- Isc = IscRef * patchIrradiance / referenceWm2;
- Vsubstring(I) = max(-bypassDropV, Voc * (1-I/Isc)), for Isc>0;
- for a dark substring, Vsubstring=-bypassDropV even at I=0 (assumed constant-drop
  bypass convention; not an open-circuit diode law).

Voc is constant for any positive illumination; no temperature/log-irradiance,
reverse breakdown, diode exponential, resistance, switching or safety behavior.
Parameters/source are caller declarations, NOT sourced equipment validation.
Series IV is piecewise linear; parallel currents sum at common voltage. The
solver considers every knot and every stationary point of P=V*I on every linear
interval, giving the global MPP of THIS ASSUMED MODEL, not a local grid peak and
not a guarantee for real PV. Electrical oracles use independent current roots
and voltage-domain local-peak searches plus analytic uniform/bypass cases.

### Accounting

Outputs keep separate:
- optical incident W before/after blocking (irradiance * area, NOT electrical W);
- unshaded/shaded network MPP electrical W;
- sum of isolated-substring MPP and mismatch in each case.

Electrical network reduction equals isolated-substring reduction PLUS the
CHANGE in mismatch; that change is signed. Do not add optical incident watts or
full shaded mismatch to the network reduction. No output is inserted into an
existing waterfall, losses, thermal path or finance. This snapshot has no
annualization or energy timestep.

The synthetic example is not actual geometry/wiring/measurements. Full plan,
hash, algorithm version, limitations and conditional/project-blocked status are
always returned. Real mesh/layout/wiring/bypass specs, independent ray/circuit
benchmarks, refinement studies and qualified review are still needed for project
acceptance. See `docs/audit/PVLIB-53-RESULTS.fa.md` for results and missing scope.

## Stage 54: module-back inertia and separate assumed environmental states

```sh
.cache/thermal-research/venv/bin/python -m services.pvlib_research environment \
  --plan docs/examples/research/environment-synthetic-plan.json \
  --output .cache/thermal-research/environment.json
```

`environment.py` orchestrates three separate models: an assumed one-node
module-BACK areal thermal balance, `snow_environment.py` for on-module SWE
inventory/optical cover, and `soiling_environment.py` for optical-depth
accumulation/washing. These are NOT calibrated Faiman, Marion or Kimber models.
No coefficient from the rejected phase-48 fit is imported. Stage-51 thermal
state is the INVERTER; this stage is a different MODULE-BACK state.

All parameter groups require caller sources (not authenticated). Thermal
capacity C is J/(m² K); h0 is W/(m² K), hWind is W/(m² K (m/s)); h=h0+hWind*v.
Wind height must be explicitly positive and exactly equal to the declared
coefficient wind height; no hub-height substitution/conversion or default.
A caller-declared air/wind/POA/back-temperature domain is mandatory and checked;
it is not an engineering approval of that domain or of coefficient validity.

The thermal equation is `C*dTback/dt = absorptance*effectivePOA - extracted -
h*(Tback-Tair)`. Extracted electrical W/m² is a mandatory independent input, NOT
estimated production or a conversion from backsheet to cell temperature. It
must not exceed a conservative absorbed-power bound throughout a substep, so
incompatible snow/soiling versus extraction schedules fail rather than clip.
No long-wave radiative, cell/backsheet gradient, BIPVT duct or electrical model
is inferred. Only target `back_of_module` is accepted. Optional
`observedEndModuleBackC` is an END-point backsheet observation; cell fields,
interval-mean temperatures mislabeled as endpoints and independent-cell claims
are unsupported. The CLI rejects unknown cell fields but cannot authenticate a
caller's measurement semantics. Comparison reports raw pair count/RMSE/MBE;
missing observations remain null and never constitute validation.

Snow parameters: full-cover SWE mm, melt coefficient mm/(h °C) and transmission
of full cover. Incoming `snowfallSweMmPerHour` is EXPLICIT on-module equivalent
water, not ground snow depth. Inventory has constant accumulation minus
`meltCoefficient*max(Tair,0)`, with available-mass floor zero. Coverage is
min(SWE/fullCoverSWE,1), and transmission = 1-coverage*(1-coveredTransmission).
This is empirical optics only: NO snow density, sliding, latent heat,
insulation, structural weight or safety calculation. No rain/snow phase or
rain-to-snow conversion is guessed. Snow covered irradiance is not water
melting energy in this model.

Soiling state tau is dimensionless optical depth with transmission exp(-tau).
`dTau/dt = depositionTauPerHour - rainWashPerMm*rainMmPerHour*tau` (time in hours).
Its exact solution uses a stable exponential/phi function, including zero or
subnormal rain-wash rates. This is NOT dust mass, not Kimber and not a
calibrated physical wash/deposition model. Both processes continue independently
when snow is present; snow/dust interaction is not modeled.

Maintenance: `soilCleaningFraction` and `snowRemovalFraction` are mandatory in
each interval (zero explicitly means none). Each removes that fraction of its
state AT INTERVAL START, once. No daily or interval reset. Removed/washed/melted
and deposited/added amounts are recorded separately with inventory residuals.
Cleaning energy, latent heat and maintenance power are not modeled or added
to existing auxiliary.

Intervals are contiguous, explicit Z/offset timestamps with 0.001..3600-second
ZOH forcing. No sorting/filling gaps, timezone inference or annualization.
Hourly forcing may be declared but cannot establish real sub-hour transients:
measurement bandwidth and end-sensor timing need independent evidence. Optical
state endpoints/midpoints are exact under each interval's assumed rates; the
thermal forcing is MIDPOINT-HELD per substep and its exponential thermal update
and heat integral are exact for that held forcing, not the true continuously
varying forcing. Step refinement is required, especially at snow exhaustion or
coverage changes. `stepS` <= minimum declared thermal time constant / 10 and
<=60 s; total steps default 200000 / maximum 1000000. No wall-clock deadline;
`--cancel-file` checks each step; failure/cancellation returns no new result or
fallback. State-domain violations stop without silently clipping temperatures.

Accounting: `poaBasis=unshaded_front` is mandatory. Effective POA multiplies snow
and soiling transmission ONCE. It must not already contain those same losses.
The CLI cannot verify upstream data provenance or hidden double counting.
Output Wh/m² is an optical/thermal areal integral, NOT plant PV yield. Absorbed,
electrical-extracted, ambient heat (signed), stored heat and thermal residual
are separate. No output is automatically applied to production energy,
structural snow, phase-53 optics, finance or auxiliary. Full plan/hash/version,
limitations and conditional/project-blocked state are retained. Source metadata
is not metrology, engineering review or field validation.

Tests compare analytic thermal steps/cooling, independent DOP853 coupled
thermal/environment equations, exact snow/soil inventories, cleaning/rain,
near-zero wash, snow exhaustion, refinement, coefficient sensitivity, UTC,
sensor-target/domain gates and actual CLI readback/cancellation. Real sourced
coefficients/domains, wind installation proof, snow/soil/maintenance logs and
independent correctly timed backsheet observations remain necessary.

## Stage 55: versioned opt-in multi-input composition

```sh
python -m services.pvlib_research integrated \
  --plan docs/examples/research/integrated-synthetic-plan.json \
  --output .cache/thermal-research/integrated.json --timeout-s 120
```

Use the pinned research environment's Python. This is a NEW contract
`integrated-mppt-plan-v1` / `integrated-mppt-result-v1`, not an expansion of
legacy StudyRequest/StudyResult v1. Existing unsupported legacy combinations
remain rejected and historical archive semantics remain unchanged. There is
no integrated editor, public HTTP endpoint or finance attachment in this stage.

A plan has source, one Sandia `inverter` parameter set and 2..4 uniquely named
`inputs` containing full existing, independently validated StudyRequests. Each
input requires detailed electrical/DC operating-point modeling with zero
additional DC loss; fixed or tracker geometry and modeled OR explicit imported
CELL temperatures may vary per input, within existing per-input restrictions.
No module-back-to-cell inference is made from stages 48 or 54. Site and weather
must match exactly (including provenance/labels and timestamp representation),
not merely compare approximately; there is no resampling. Measurements, nested
MPPT/inverter blocks, per-child Sandia, AC plant, availability and export caps
are rejected rather than silently discarded. Group-level AC plant/export
control is future work, not an implicit combination with stages 50–54.

Each input runs the existing pinned DC worker in a direct isolated subprocess.
Its inverter AC calculation is unused diagnostic output. Actual input terminal
V and DC W feed ONE `pvlib.inverter.sandia_multi`: the published power-weighted
extension evaluates each voltage at the TOTAL power, then clips and applies
startup/tare once. Do not sum child inverter AC or child night consumption.
Inactive inputs use Vdco solely for the zero-weight upstream expression; the
all-dark interval is explicitly -Pnt once to avoid upstream 0/0. Active inputs
and total DC must be within declared fitted voltage/power domains. No arbitrary
shared-voltage average, dynamic MPPT efficiency, shared-current limit or
hardware certification is implied. Domain declarations are not authenticated.

No execution caps were increased: total input-intervals <=8784 (at most4392
weather intervals with two inputs); plan <=8 MiB; disk-backed polled child
output <=32 MiB, stderr <=64 KiB; whole result <=32 MiB. This is an application
budget, not an OS disk quota. CLI serializes integrated output compactly so
pretty-print expansion cannot exceed the import budget. Deadlines include all
child solves, validation and composition; default120 s, allowed0.001..600 s.
Processes are killed/waited on timeout/cancel; no fallback or partial winner.
`--cancel-file` is checked during child communication and before result delivery.

The JSON reader rejects duplicate keys, NaN/Infinity AND overflow literals such
as 1e999; bounded reads do not first load an arbitrarily large input. All research
CLI outputs are now written with a same-directory temporary file and atomic
replace; write/rename failure or byte-budget failure preserves a previous result
and cleans the temporary file. A previous result at the same path is not a new
successful run; check command exit code and receipts.

Outputs retain every child result/request/manifest, the full plan, algorithm
version, Python-canonical UTF-8 plan JSON and its SHA256, worker/requirements
hashes, pinned pvlib version, execution counts, signed AC/import/export samples
and period totals only. The Python-canonical string is explicit because Python
and JS JSON float renderings may differ. SHA binds data, not authenticity.
`src/studies/integratedStudy.ts` validates plan and result in the browser/TS,
checks child bindings with legacy result validation and independently recomputes
the shared Sandia equation and all totals in JS. It cannot prove caller source
claims, malware-free remote files or equipment performance.

Portable archives have their own `integrated-mppt-archive-v1`, checksum and
strict restore/recompute checks. `makeIntegratedArchive` /
`restoreIntegratedArchive` do not change old archive readers. Explicit migration
helpers `migrateLegacyMppt` (TS) and `migrate_legacy` (Python) copy compatible bare
legacy fixed-MPPT plans into the new contract with a caller-supplied Sandia fit.
They refuse migration that would drop plant or measurement data. Migration
changes inverter choice deliberately; it does NOT promise the old PVWatts AC
values remain identical. Old requests themselves are not mutated or overwritten.

Tests: 16 bounded dual-language cases (12 rejected,4 actual two-worker runtime
results,0 contract-only), independent Python AND JS Sandia equations, mixed
geometry/imported cell fixtures, shared tare/clipping, fit-domain sensitivity,
process timeout/kill/cancel/output bounds, strictJSON/atomic output and archive
corruption/migration checks. Chromium actually executes the bundled contract
and archive on a real two-worker result; that is not an integrated UI/editor.

Full local validation is recorded in three explicit rounds by
`scripts/run-final-validation.py --round N` for N1/2/3. Each round runs all16
configured suites and retains failures without short-circuiting. Cache logs are
local evidence, NOT remote exact-SHA CI. The Linux/Windows CI configuration now
includes research, integrated contract and integrated-browser tests, but an
unexecuted configuration is not a CI pass. Real project data/qualified reviews
remain blocked; see `docs/audit/PVLIB-55-SOURCE-AND-BLOCKER-REGISTER.fa.md` and
`docs/audit/PVLIB-55-RESULTS.fa.md` for actual results and limits.


## Research editor/API and advanced models (subsequent delivery)

The Climate tab now has a separate JSON research editor. `/api/v1/research/run`
executes integrated composition, two-node cell/back radiation thermal balance,
and five-parameter substring/bypass circuits. It requires
`PVLIB_RESEARCH_ENABLED=true`, configured server JWT/gateway authentication,
and pinned `PVLIB_PYTHON`. The previous stage55 browser statement above is a
historical scope statement, not the scope of this new delivery.

No automatic attachment to energy/finance; every result remains
`not_field_validated` / `blocked`. Parameters must be sourced explicitly.
See `docs/audit/RESEARCH-EDITOR-ADVANCED-RESULTS.fa.md` for contracts, startup,
equations, limits, sources and test receipts.

## Draft operational source adoption (release blocked)

A subsequent opt-in Climate panel can adopt a validated full-year AC result or
bounded integrated annual batches into App production-energy display and the
powerplant financial scenario. It does not annualize partial data, apply the
screening waterfall twice, or convert static thermal/DC outputs into annual AC.
Selection is memory-only, context-bound and explicitly acknowledged. Official
mixed-source report export is disabled while selected. The new grid-import
billing formulas currently FAIL the independent physics-reference audit gate;
this draft is NOT push/release ready. See
`docs/audit/OPERATIONAL-ENERGY-RESULTS.fa.md` and its validation receipt. Do not
interpret earlier isolated-research statements as permission to claim field
validation for this new opt-in engineering scenario.

## Subsequent three-stage gate closure

The draft failure described above is historical. Seven financial AST obligations
now have independently generated Decimal fixtures and exact-node sensitivity
witnesses, including invalid/minimum/maximum clamp cases. Fixture reproduction
runs without rewriting targets. Lossless opt-in undefined encoding preserves
full object-key/type/numeric checks in the reference gate.

Operational adoption now rejects mixed engine/worker/requirements provenance
across batches; all report entry points fail closed for mixed-source reporting.
Large integrated requests use bounded disk-backed stdin to guarantee EOF with a
slow reader; a dedicated 2MiB transport regression and actual ordinary/leap-year
worker runs cover this correction.

Current final results and release limits supersede the historical draft status:
`docs/audit/OPERATIONAL-GATES-THREE-STAGES-RESULTS.fa.md`. No automatic field
approval, nonenergy-to-annual conversion, remote CI pass, or Windows pass is
implied by local gate closure.
