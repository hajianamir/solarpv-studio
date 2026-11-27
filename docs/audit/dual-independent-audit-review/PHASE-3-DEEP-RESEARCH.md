# Phase 3 — primary-source research and executed reference dossier

Date: 2026-11-03. Applies to the current working tree, not a released revision.

## Disposition

**Research acquisition and bounded experiments implemented; Phase 3 remains PARTIAL and release BLOCKED.** Research supplies equations, versions, reference data and implementation decisions. It does not replace missing production integrations, normative applicability, manufacturer attestation or field evidence. No package is promoted to whole-model validation by this document. Existing Phase 2 gates are not waived.

This investigation addresses all ten packages in the canonical Phase 3 table. Public-source numerical acquisition is materially advanced. Site-specific evidence and inaccessible normative/manufacturer sources remain explicit stops, not inferred values. No production numerical formula, persisted model selector or adoption gate is changed.

## Reproducibility and source integrity

- `phase3-research-sources.json` records 28 artifacts with immutable commit URLs, SHA256, byte counts and ignored-cache paths.
- `scripts/fixtures/acquire-phase3-research.py` reacquires the artifacts through the GitHub contents API. `--check` verifies cached bytes without network. Upstream licenses are acquired for pvlib/EnergyPlus; full upstream files remain in ignored cache, not redistributed as project source. Consult upstream licenses before other redistribution.
- `scripts/fixtures/generate-phase3-research.py` verifies all source hashes and the installed pvlib Python sources used by the experiment against the pinned acquired source. It denies socket connection/name-resolution and subprocess operations during calculation. It uses pvlib 0.13.1 and the existing pinned study environment. `--check` requires exact fixture reproduction.
- `scripts/fixtures/physics/phase3-research-reference.json` retains the reference cases and modeling assumptions. The companion `phase3-research-comparison.json` records actual production comparisons and production source hashes.
- `npm run test:phase3:research` checks source/fixture identity, M&R quantization, independent annual ledger invariants, the fit failure/residual witness, polynomial multi-root IRR and research discrepancies. It is part of `test:phase3`. It does not need network or Python. A successful discrepancy test does **not** mean the discrepant model is accurate.
- Acquisition is a maintainer research operation requiring configured `gh`, not a new application network feature. Normal users retain the Windows `install.bat` installation route; no new runtime dependency or install procedure is introduced.

### Principal primary-source anchors

Full file hashes are in the manifest; these links identify the exact inspected revisions.

1. [pvlib De Soto fit and residual equations](https://github.com/pvlib/pvlib-python/blob/6b9476b90892bd05726b237d9098f7536568a43a/pvlib/ivtools/sdm/desoto.py)
2. [pvlib thermal models and parameter applicability](https://github.com/pvlib/pvlib-python/blob/6b9476b90892bd05726b237d9098f7536568a43a/pvlib/temperature.py)
3. [pvlib M&R and physical IAM](https://github.com/pvlib/pvlib-python/blob/6b9476b90892bd05726b237d9098f7536568a43a/pvlib/iam.py)
4. [pvlib infinite-sheds implementation](https://github.com/pvlib/pvlib-python/blob/6b9476b90892bd05726b237d9098f7536568a43a/pvlib/bifacial/infinite_sheds.py)
5. [pvlib Sandia inverter, startup, clipping and tare](https://github.com/pvlib/pvlib-python/blob/6b9476b90892bd05726b237d9098f7536568a43a/pvlib/inverter.py)
6. [EnergyPlus 24.2 BIPVT coupled thermal implementation](https://github.com/NREL/EnergyPlus/blob/e7ecb2d53b6b2f4666bf5a56fc9b3ba35cf34190/src/EnergyPlus/PhotovoltaicThermalCollectors.cc)
7. [EPANET 2.2 hydraulic resistance and pump coefficients](https://github.com/OpenWaterAnalytics/EPANET/blob/4d8d82ddc260fce216af9321fc3d9a4646ac6827/src/hydcoeffs.c)
8. [NumPy Financial 1.0.0 NPV/IRR definitions](https://github.com/numpy/numpy-financial/blob/247aa4e2ee4fa7db44915790d5a730b9776d10a7/numpy_financial/_financial.py)
9. [SciPy 1.15.3 Student-t CDF](https://github.com/scipy/scipy/blob/e29dcb65a2040f04819b426a04b60d44a8f69c04/scipy/stats/_continuous_distns.py)
10. [CEC module table snapshot, 2019-03-05](https://github.com/pvlib/pvlib-python/blob/6b9476b90892bd05726b237d9098f7536568a43a/pvlib/data/sam-library-cec-modules-2019-03-05.csv)
11. [CEC inverter table snapshot, 2019-03-05](https://github.com/pvlib/pvlib-python/blob/6b9476b90892bd05726b237d9098f7536568a43a/pvlib/data/sam-library-cec-inverters-2019-03-05.csv)

## U05 — extraction is not translation

**Acquired:** fit equations, solver policy, thermal translation and a sourced CEC module row. Existing bounded-diode evidence remains separate.

**Executed:** a five-equation De Soto fit for `Canadian_Solar_Inc__CS5P_220M` from the pinned CEC table. The unmodified default initial guess fails with “not making good progress.” A separately declared CEC-parameter initial guess converges; this is recorded as a second attempt, not hidden fallback. Maximum absolute equation residual is `4.90552293230806e-10 A`. Fitted Rs, Rsh, IL, Io and a are positive in this case. Acceptance test requires residual below `1e-7 A` as a bounded numerical convergence check, not physical/model accuracy.

**Coefficient finding:** the fifth equation imposes Voc at Tref+2 K using supplied beta_Voc, not an exact local derivative at Tref. Local beta is about `-0.22208610 V/K` versus supplied `-0.222156 V/K`. Local gamma_Pmp is `-0.43162588 %/K`, not the table's `-0.476 %/K`: gamma is not one of the five constraints. A fit must disclose these residuals and cannot claim all supplied coefficients are honored. `a_ref` is n*Ns*k*T/q, not per-cell thermal voltage.

**Decision:** retain the explicit externally fitted bounded API; design any fitting service as an authenticated server/Python operation with physical-parameter/residual/failure checks. Do not silently invoke an unconstrained fit or relabel it as a measured coefficient. STC/temperature cases here are numerical research inputs from a legacy table, not manufacturer attestation.

**Still required:** versioned production consumer/legacy adapter and storage semantics; invalid/underdetermined/negative-parameter fitting tests; technology/domain and cold/hot/irradiance fitting sweeps. One successful seeded fit does not close U05.

## U07b — annual clipping needs chronology and a named energy boundary

**Acquired:** full-year Phoenix and Newark TMY3 EPW files from EnergyPlus, Amsterdam IWEC EPW from pvlib, actual CEC module/inverter snapshot rows, tracker/transposition/inverter source. Their immutable URLs and hashes are in the manifest. EPW files are source-distributed reference weather, not live weather or newly measured site observations.

**Executed:** 3 weather files × fixed/tracker × ILR 1/1.2/1.5/2/2.4 = **30 hourly annual cases**, each 8,760 hours. Fixed tilt is absolute latitude and equator-facing. Tracker is horizontal north/south, ±60°, backtracking, GCR .4. Both share isotropic diffuse, albedo .2 and open-rack glass/polymer SAPM temperature. EPW radiation is preceding-hour Wh/m²; hourly-start read indices are shifted +30 min for midpoint solar geometry, with fixed local offsets and no DST.

**DC boundary:** PVWatts DC with sourced CEC gamma; not a full CEC diode/module simulation. Nominal DC nameplate is inverter Paco×ILR. **AC boundary:** sourced ABB MICRO 0.25 inverter Sandia coefficients at constant Vdco; this is a normalized controlled inverter experiment, not a module/string feasibility design. Negative night tare is preserved. Clipping is the positive excess of unconstrained Sandia efficiency output above Paco; startup/low-load/tare are not mislabeled as clipping. No soiling, wire, availability, spectral or diffuse-IAM losses. Beam IAM is separately reported, not also subtracted from energy.

At ILR=2, energy per reference 250W inverter is:

| Weather | Fixed net AC kWh | Tracker net AC kWh | Fixed clipping kWh | Tracker clipping kWh |
|---|---:|---:|---:|---:|
| Phoenix | 774.8182 | 857.4637 | 211.2185 | 257.2926 |
| Newark | 618.1492 | 660.6546 | 109.3242 | 110.9624 |
| Amsterdam | 441.5704 | 467.5287 | 50.7507 | 50.8176 |

**Decision:** these cases provide a real-weather chronological reference boundary; they do not validate the existing scalar evaluator. Do not tune scalar gains to reproduce one ratio. Retain named legacy screening, add a separate explicit chronological selector only after shared inputs/output, equipment-voltage and stale/version checks are implemented.

**Still required:** southern-hemisphere sourced annual weather, public annual selector/integration, reference-to-production error/tolerance table, coherent fixed/tracker/GHI denominator, equipment/MPPT bounds, subhourly clipping sensitivity and actual site applicability. The additional pvlib TMY file acquired is not counted as an executed annual case.

## U08 — mounting and optical extensions must remain distinct

**Executed:** **60 thermal cases**: G=0/10/200/800/1200 W/m², wind=0/1/5/10 m/s, three named SAPM constructions/mountings; Faiman u0=25/u1=6.84 open-rack comparison accompanies each row. SAPM parameter dictionaries are retained. Faiman defaults describe the cited open-rack Negev modules, not a universal roof. Weather wind is used as supplied in annual cases; module-height conversion is unresolved.

The illustrative legacy-to-SAPM category mapping produces screen-minus-SAPM differences from `-20.74599` to `+17.77974 °C`. These are differences between assumptions, not a calibration error or an acceptance budget. At G=0 both external simple models return ambient, while legacy roof offsets persist. This establishes that constant offsets are not a wind/irradiance-sensitive mounting model; it does not authorize replacing them with one external parameter set.

**Executed:** **16 M&R IAM cases**, ar=.16/.20, AOI=0/15/45/60/80/89/90/100°. Test budget `5.01e-7` covers six-decimal production rounding plus floating-point margin, not measurement error. Annual beam-IAM loss as percent of all incident POA is separately reported for every weather/geometry; diffuse IAM is explicitly excluded.

**Decision:** preserve shared thermal owner. Any replacement needs explicit mounting-specific coefficients/provenance, model version/toggle and annual weighting. Isolate the internal thermo-optic extension from referenced M&R/Fresnel: its kappa=1.35 and dn/dT applicability are not established by the IAM source. Do not call baseline agreement validation of the thermo-optic correction.

**Still required:** production toggles/provenance, physically applicable roof parameters, external thermo-optic measurements/material model and annual loss closure with night/low-G behavior. No automatic mounting-offset replacement.

## U17 — matched infinite-sheds comparison supports restriction, not proxy acceptance

**Executed:** **96 external cases**: GCR .2/.4/.6/.8 × tilt 10/30/60° × albedo .2/.6 × clear/diffuse/rear-beam/night. Collector width=2m, lower-edge clearance=1m; convert to pvlib center height using `clearance + width*sin(tilt)/2`. Preserve common pitch, bifaciality .8 and external front denominator. External structural shade/transmission factors are explicitly zero, not pvlib's default -2% rear loss. Legacy row length 1e12m approximates the infinite-row limit and has no torque tube. Illumination GHI is constructed consistently from DNI, DHI and zenith; these geometries are controlled synthetic inputs, not measured annual observations.

Production chord minus external raw rear irradiance ranges from `-55.24964` to `+387.93935 W/m²`. No physical accuracy tolerance is applied to hide that discrepancy. The legacy scalar proxy stays positive at night even when all supplied irradiance is zero: it is an annual screening heuristic, not an instantaneous irradiance model. A cap on output does not fix model physics. Rounded sky+ground factors need not close to one because neighboring rows are not represented as an explicit receiving surface.

**Decision:** restrict both legacy options to qualified screening; do not use their pointwise output as independently validated rear energy or automatically adopt into chronological finance. A separately versioned infinite-sheds component is a defensible candidate, subject to parameter checks and adoption gates. Retired 10.4% target remains WARN. This investigation runs pvlib, **not** SAM/PVsyst; no whole-model SAM/PVsyst equivalence claim is made.

**Still required:** actual runtime restriction/selector policy across consumers; finite-row/tube/terrain treatment; external whole-model project files and engine execution for any whole-model claim. Integration is not complete merely because a better reference exists.

## U11b — normative and site evidence cannot be synthesized from model code

**Research finding:** none of the acquired numerical engines is an authoritative jurisdiction-specific earthing/harmonic conformity assessment. Harmonic voltage THD and current demand distortion are different quantities and require specified PCC, voltage class, applicable standard/edition, generation rules, system frequency, source spectrum and fault/current basis. No contested limit table is adopted. No IEC/IEEE clause or utility applicability is inferred from a library citation.

**Required earthing record:** grid/soil geometry and measured layer resistivity; surface material/thickness/resistivity; applicable fault current split and asymmetry; protection clearing time; accessible touch/step geometry; standard edition and authorized design/conformity evidence. Missing inputs remain unknown, not zero or “safe.”

**Required site record:** provider/source/version/date/vertical datum, explicit user-vs-provider elevation precedence, resolution/uncertainty, geology and seismic provenance, and readiness reasons. A weather file altitude is weather-station metadata, not measured customer-site ground elevation.

**Stop:** keep `isEarthingSafe`, `isThdCompliant` and related conformity booleans null without their applicable evidence. Public model research cannot supply a customer's protection study, PCC agreement, soil survey or jurisdiction. Normative publisher/utility sources outside the allowed network were not acquired; no paywalled text was reconstructed. Safe metadata/readiness implementation may continue, but this research does not claim that implementation exists.

## U15 — BIPV/T control volume before empirical axial profile

**Acquired and inspected:** EnergyPlus 24.2 BIPVT implementation and unit-test source. `calculateBIPVTMaxHeatGain` explicitly uses geometry, cell/coverage fractions, glass/backing resistances and emissivities, solar absorption less electrical extraction, wind/natural convection, wall/radiative temperatures and channel fluid heat capacity. It solves coupled glass/PV/backing temperatures, channel-air exponential balance, and checks local energy balances. Mass flow determines channel velocity through density×width×gap; it is not interchangeable with airflow per module area. Source contains iteration limits and its own assumptions; those are not blanket acceptance guarantees.

**Contrast with repository:** forced-mode `1.417` multiplier is an unverified adjustment; the axial gradient has a 12°C floor, so it cannot approach zero continuously with irradiance. The useful-heat expression does not establish a closed whole-control-volume balance, and clamping negative heat-to-laminate is not evidence of conservation.

**Replacement specification:** define physical domain/area basis and kg/s versus kg/s/m²; solve absorbed shortwave = electrical power + fluid enthalpy gain + external convection + longwave radiation + building conduction + storage (zero for a declared steady state). Retain signed gains/losses and reject failed residual/convergence checks rather than clamp into success. Natural circulation needs buoyancy/pressure-drop closure, not an arbitrary prescribed forced-flow equivalent. Finite-difference derivatives must hold geometry, mass flow and boundary temperatures fixed; do not change the experiment while perturbing one variable.

**Decision:** do not tune/remove 1.417 in isolation or transfer an EnergyPlus correlation without matching domain. Qualify existing profile; develop an opt-in physical solver only with multi-regime independent cases, residual/energy budgets and no-gradient zero/low-G limits.

**Still required:** executed EnergyPlus model/input deck or equivalent independent published measured cases, geometry/material/flow applicability, forced/natural/stagnation sweeps and production replacement/rollback. EnergyPlus executable/full upstream tests were **not** run. Source acquisition is not the requested whole-model experiment.

## U19 — hydraulic duty is not motor nameplate or solar availability

**Acquired:** EPANET 2.2 head-loss and pump coefficient source. EPANET's Hazen–Williams resistance uses US customary 4.727 and diameter exponent 4.871; compare only after explicit unit conversion. It does not validate this application's assumed C=140, efficiency bands, motor series or irrigation pressure targets.

**Executed:** **27 duty cases** over volume 10/100/300m³/day, PSH 2/5/8, pipe diameter 40/63/110mm, L=100m, static head=30m, declared delivery head=2m and pump efficiency=.6. Retain unrounded legacy-form SI friction and separately converted EPANET friction. Compute hydraulic W and kWh/day directly from rho*g*Q*H and rho*g*V*H; compare actual production rounded head/power/motor/PV results. The identity check tolerance is `1e-10 kWh` for floating-point consistency only, not hydraulic accuracy. The .9×PSH pumping-hours assumption is explicitly a policy, not a physically derived runtime.

**Decision:** future versioned duty option must separate hydraulic power, pump shaft power, motor electrical input, standard motor selection, VFD continuous/overload duty and PV time-series power/energy. Retain the nameplate-based option as documented conservative policy, not a guarantee of startup/water delivery. Internal calculations must retain precision until display. Actual pump curves/NPSH, motor efficiency, VFD limits/start threshold and irradiance profile determine feasibility; PSH and 1.35×motor alone cannot guarantee morning startup or worst-month water.

**Still required:** sourced pump/motor/VFD curves/ratings, step-boundary sweeps and explicit energy/water feasibility; versioned duty/nameplate selector and backward-compatible storage. Existing synthetic monthly factors remain unvalidated. No selected equipment is invented.

## U09c — catalog provenance and measured coefficients

**Acquired:** full pinned legacy CEC tables including headers/units, data/date/version columns where present and row variants. Selected module/inverter names are retained in the reference fixture. Table fields distinguish alpha_sc A/K, beta_oc V/K and gamma_r %/K. There is **no measured beta_Vmp field** in the acquired CEC module schema. Inverter rows include ratings such as voltage, MPPT and currents; missing/date cells are not proof of conformity or fresh manufacturer verification.

**Decision:** use these only as explicitly identified CEC reference snapshots; never relabel them as newly acquired manufacturer datasheets. Store original identifier/source/variant/units/date independently from normalized application fields, preserve missing values and freeze selected customer snapshots. Any derived coefficient must remain derived and separately named; gamma/alpha cannot become “measured beta_Vmp.”

**Still required:** actual current manufacturer variant-specific primary documents and supported-field round trips through adapter/selection/storage/import/API/report. Missing manufacturer evidence remains unassessed. The current branch does not gain new catalog provenance propagation from acquiring a table.

## U16c — financial algebra, root selection and valuation policy

**Executed:** pinned NumPy Financial NPV/IRR on six signed/unrounded cash-flow fixtures, including no-positive/no-negative flows and `[-100,230,-132]`. NPV convention includes the t=0 cash flow. The latter polynomial has exact admissible IRRs 10% and 20%; production shared solver correctly returns a multiple-root status with both roots. NumPy Financial's single selected root is preserved as its policy, not treated as the only mathematically correct result. No-root outputs stay null, not zero. Direct NPV comparison uses `1e-10` currency units as an implementation arithmetic budget for these small fixtures only.

**Decision:** consolidate common mathematics, not different valuation policies. Compare pre-debt project and post-debt equity ledgers separately. State nominal/real, discount/finance/reinvestment rates, tax/debt timing, signed import/export and constrained demand, USD/TOMAN unit basis, exchange/escalation timing and unrounded ledgers. Published solver parity cannot establish an Iranian tariff or an assessed discount rate.

**Still required:** all public financial-path comparison and shared-kernel migration, discount boundaries, full currency/economics/demand fixtures and current Iranian regulatory/source applicability. No current official tariff/utility contract was acquired or inferred. Existing separate Iranian policy work remains qualified screening; this experiment is not “bankable.”

## U20 — probability transform and convergence assumptions

**Executed:** **20 SciPy CDF/quantile witnesses** for Student-t df=3/5/8/30, probabilities .01/.1/.5/.9/.99. At t quantiles, `t.cdf` recovers the input probability; `norm.cdf` generally does not. This directly demonstrates why transforming the repository's t latent by a normal CDF does not preserve uniform copula margins. The df-dependent discrepancy is mathematical, not a finite-seed convergence problem. Exact parity budget `1e-10` checks the reference probability inversion only.

**Decision:** continue rejecting non-Gaussian families in the new convergence diagnostic. A Student-t repair requires its own persisted model version, correct t CDF, explicit df, dependence calibration and legacy archive/replay policy; changing arithmetic under an unchanged archive version would invalidate replay semantics. Do not claim Gaussian Spearman calibration is automatically correct for t dependence.

The existing production Gaussian diagnostic spans budgets 20/100/400, seeds 7/42/1337 and zero/correlated GHI-soiling scenarios. Selected-seed extrema are descriptive variability, **not** a statistical confidence interval. Mixed LHS/copula trials are not IID; binomial order-statistic confidence formulas cannot simply be imported from a separate IID research experiment. A defensible option is replicated randomized-design quantile variability with explicitly justified replication/coverage assumptions; empirical calibration and coverage testing are still needed. Squared-correlation rankings remain exploratory, not additive variance attribution; N=100 is not guaranteed.

**Still required:** accepted/versioned t policy or explicit retirement across all consumers, justified interval/coverage evidence, representative calibrated scenarios and persisted diagnostic replay if exposed publicly. Existing main/worker and archive regression tests are not independent statistical validation.

## Three internal review passes and follow-up research

1. **Contracts/compatibility:** compared source units and definitions against current consumers. Found center-height vs lower-edge bifacial geometry, inverse LCOE labels, EPW hour timing, US/SI Hazen–Williams constants and total-vs-per-area mass flow as consequential boundaries. Follow-up inspected exact source signatures, tables and coefficient definitions; retained explicit conversions in experiments. No silent migration introduced.
2. **Correctness/safety:** executed external components and inspected residuals rather than treating source citations as proof. Found default-fit failure, gamma mismatch, persistent night roof/proxy behavior, large rear-model discrepancies and incorrect Student-t marginal transform. Follow-up retained failed attempts, calculated independent roots/energy identities and declined to accept whole models or invent physical tolerances.
3. **Runtime/delivery:** re-ran source checks and exact offline generation; inspected research isolation and cache/storage boundaries. Full-source datasets stay ignored; small result fixtures/hashes are retained. Follow-up confirmed loaded pvlib source bytes match the acquired revision, corrected numeric timezone handling rather than altering weather timing, and integrated replay into `test:phase3`. No source fetch occurs on test/application runtime.

These are internal reviews followed by research, not three independent external certifications.

## Stops, next implementation and rollback

| Operation/claim stopped | Reason | Resume condition / safe work |
|---|---|---|
| Phase3 complete / release eligible | Multiple package implementations and applicable reference gates remain missing | Complete model-specific work; research can proceed independently |
| Manufacturer-measured beta_Vmp / fresh certified ratings | CEC table is a legacy reference snapshot and lacks that field | Acquire applicable primary variant docs; preserve unknown meanwhile |
| Site earthing/harmonic/seismic conformity | Missing site/protection/PCC/normative applicability | Applicable authorized data and assessment; implement metadata/readiness safely |
| Whole-model SAM/PVsyst/EnergyPlus validation | Only pvlib components executed; EnergyPlus source inspected | Acquire/run actual input projects and engine versions; retain component evidence |
| Southern annual benchmark complete | Only northern annual weather executed | Acquire applicable southern source file and execute matching cases |
| Automatic annual/finance replacement | Selectors/migrations/adoption context not implemented | Versioned opt-in integration, stale invalidation and independent reference/error gates |

Next numerical implementation priority is a versioned Student-t retirement/repair policy, followed by the shared explicit chronological annual contract using acquired weather/equipment references; run unrelated safe packages in parallel only where their input evidence exists. BIPV and pump must not substitute one-point fitted multipliers for physical/operating evidence.

Rollback for this research addition is to stop invoking its scripts/remove its added test command; no project migration or financial numerical rollback is needed. Preserve existing branch work and historical receipts. Reacquisition may fail if GitHub availability/access changes; do not silently generate new synthetic weather or replace pinned artifacts to make checks pass.

## Executed verification receipt

`phase3-research-verification-receipt.json` records source/fixture/log hashes, corrected failed attempts, exact scope and omitted gates. Passed lint (0 errors; 93 existing warnings), build, core tests, smoke, coverage, Phase3 (including final replay), physics reference gate, Phase1 evidence inventory, offline source integrity and exact Python reproduction, plus diff whitespace checks. No full upstream suite, browser/HTTP change, independent field/manufacturer/conformity assessment or external EnergyPlus/SAM/PVsyst execution is claimed.
