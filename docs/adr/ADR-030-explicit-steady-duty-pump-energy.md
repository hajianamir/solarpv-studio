# ADR-030 — Explicit steady-duty hydraulic/shaft/motor/DC energy boundary

Task date: 2026-11-03. Accepted for a bounded, opt-in arithmetic comparison; U19 and Phase2/3 remain partial, release blocked.

## Problem and scope decision

Legacy `calculateSolarPump` derives runtime from0.9×PSH, rounds friction/head before power, chooses a motor from an assumed HP series, derives VFD/PV nameplates with1.25/1.35 multipliers and emits a synthetic monthly profile. These steps do not establish motor electrical input, a matched pump operating point, VFD continuous/overload duty, morning startup or worst-month water delivery. Earlier Phase3 research retained27hydraulic comparisons and already identified those limits. The old UI also incorrectly called1.25a motor service factor although the code multiplies the rounded motor kW to form a drive heuristic.

Do not silently replace the old formulas, invent curves or fit a one-point PV/water multiplier. Instead add a separately selected explicit steady-duty energy boundary, and label the legacy UI as heuristic/unassessed. This is not the complete equipment/chronology replacement.

## Owners and input contracts

- Strict input owner: `src/contracts/pumpDutyEnergy.ts`, `PumpDutyEnergyInputSchema`.
- Pure numerical owner: `src/engine/core/pumpDutyEnergy.ts`, `assessPumpDutyEnergy(input:unknown)`.
- Consumer: opt-in `PumpDutyEnergyPanel` within `SolarPumpingTab`.
- Existing legacy numerical owner/callers: `calculateSolarPump`, unchanged arithmetic, return shape and notes. Comments now identify its screening scope. Existing benchmarks and research fixtures remain applicable to legacy arithmetic only.

Policy is `pump_steady_duty_energy_v1`; boundary is `dc_bus_to_vfd`. All nine numerical inputs are required and explicit: daily volume m³/day, constant TDH m, pumping hours h/day, density kg/m³, gravity m/s², hydraulic pump efficiency, motor efficiency, drive efficiency and available DC energy kWh/day at the VFD input. No PSH default, efficiency band, legacy rounded head, PV nameplate or equipment rating is substituted.

Volume/head/available energy may be zero; hours must be positive and <=24, density/gravity positive, each efficiency in(0,1]. Fields must be finite numbers; unknown/missing fields and policies reject. Density/gravity are not guessed from a location/fluid label. No coordinate/weather/equipment identity or provenance is fabricated by the form.

## Equations, units and external context

Steady hydraulic work W=rho*g*V*H joules; hydraulic daily energy=W/3,600,000 kWh. Average hydraulic power is that daily energy divided by declared pumping hours. Shaft power divides by pump hydraulic efficiency, motor electrical input divides by motor efficiency, drive DC input divides by drive efficiency. Each stage's daily energy equals its power times pumping hours. Daily DC deficit=max(0,required DC energy - available DC energy).

Pinned EPANET2.2 `src/hydraul.c`, commit `4d8d82ddc260fce216af9321fc3d9a4646ac6827`, was acquired and inspected through the GitHub contents API. `getenergy` computes head×flow×specific gravity divided by aggregate efficiency with US-customary conversion; `addenergy` accumulates power×time. Hash/path/bytes/method are in `phase3-pump-duty-source.json`. Its aggregate efficiency is not independent manufacturer evidence for our separate stages; its US-customary constants are not copied into the SI implementation. EPANET was not executed in this slice.

The new API is an independently checked SI energy-accounting identity with explicit user assumptions, not an EPANET hydraulic network, pump curve model or field-validated power prediction. No taxes/costs/annual energy/PV capacity/starting torque/water availability model is introduced.

## Availability and safety

Return either `status:available` with full normalized inputs, named-unit metrics, policy/boundary and aggregate balance state, or `status:unavailable` with `invalid_input`/`numerical_failure`. Reject nonfinite/negative calculated metrics, erased positive flow and erased positive hydraulic work/power/energy from underflow. Zero demand/head remains a legitimate zero-work idealization, not proof of free/available water or zero auxiliary consumption. Very large/small domains may return unavailable conservatively even where an alternative numerical order could avoid intermediate overflow.

Every result has `waterDeliveryGuaranteed:false` and `financialAdoptionEligible:false`. Available results also retain equipment and chronological water delivery as `unassessed`. `no_aggregate_deficit` is deliberately not `feasible`: the supplied daily DC integral might arrive outside the operating window, fail to meet instantaneous drive power/voltage/current limits or lack hydraulic supply. Even a deficit quantifies only the declared constant-duty scenario; this API does not solve an achievable curtailed water volume.

No idle/standby, cable, transient, variable flow/head/efficiency, NPSH/drawdown, thermal or current/voltage losses are included. Runtime is declared independently of PSH. All finite supported input shapes are not a universal physical-applicability or floating-point-accuracy guarantee.

## UI and compatibility

The explicit panel is initially off with empty inputs. Empty is unavailable, never `Number('')=0`. Users must enter every input deliberately. No result remains visible when invalid input replaces valid input or the toggle is disabled. Both locales expose the boundary/limitations and distinguish aggregate deficit from no aggregate deficit.

This panel is a temporary comparison. It has no storage/HTTP/report exporter and is not serialized with projects; navigating away/remounting resets it. The UI explicitly discloses that fact. A durable versioned project selection and equipment/source snapshots are separate outstanding work, rather than silently saving an unregistered policy inside the existing project schema.

Legacy UI values remain numerical compatibility outputs. Its description/PV label/monthly chart/notes now disclose heuristic nameplates, assumed efficiency/runtime, synthetic monthly factors and unassessed pump curves/drive capacity. Removed the false motor1.25service-factor statement. The legacy API's historical `guaranteeYearRoundWater` name and returned notes remain for compatibility and must not be interpreted as an assessed guarantee; the new API does not accept this flag.

## Evidence, budgets and tests

Independent standard-library Python60-digit Decimal base-unit work and explicit stage efficiency products generate869cases:864Cartesian valid arithmetic cases and five explicit numerical-failure witnesses. The valid pool covers volume0/.5/120/300m³/day, head0/50/130.25m, hours.25/5/12, pump efficiency.6/1, motor.8/1, drive.95/1, available DC energy0/10/100kWh/day; density1000kg/m³ and gravity9.81m/s² are explicit test constants, not measured inputs or universal defaults. Negative cases include overflow and distinct flow/work underflow guards.

Comparison is abs(actual-reference)<=1e-10+1e-12*abs(reference) in each named output unit. This is a double-precision product/division replay budget versus60-digit Decimal, not hydraulic/energy-delivery forecast accuracy. No production output generates expected fixtures. All18current mathematical expressions have directly reached, independently compared, mutation-sensitive witnesses. Focused tests enforce complete new-source expression coverage, strict/missing/type/range/nonfinite cases, zero/invalid/numerical boundaries, power ordering, runtime-power/energy identity, JSON and nonmutation.

Forty-eight actual-base legacy whole-result comparisons cover PSH.5/2/5/8, volume0/10/120/300 and three irrigation types. These are compatibility regressions, not independent physical evidence. Production Chromium fills real explicit form controls and compares stage powers/energy to the independent Decimal witness, exercises deficit/zero/invalid/toggle/remount states, and verifies unchanged Iranian NPV. Bilingual SSR constrains the off-by-default and legacy qualification text. Baseline/integration evidence and failed first reference-registration attempt are recorded separately in `phase3-pump-duty-verification.json`.

Contextual help in both locales distinguishes the legacy PSH policy from the new explicit duty boundary, including temporary-input and no-adoption limits. The existing CI workflow runs the focused suite; full-history checkout preserves its exact-base regression prerequisite rather than bypassing it. A configured CI step is not a remote/native-platform PASS.

## Rollback and stops

Disable/remove `PumpDutyEnergyPanel` to roll back without data migration or modifying legacy results. Keep corrected screening/unassessed labels; do not restore water/startup guarantees or the false motor service factor. This is explicit opt-in selection, not an automatic model migration.

Matched pump/motor/VFD curves, duty/overload/current/voltage/NPSH evidence, site/head/flow/time-series solar matching, energy/water dynamics, durable selection/provenance and full U19 acceptance remain open. No inferred manufacturer coefficient, normative conformity, guaranteed flow, finance/annual-energy adoption, whole-model validation or release. Docker/native Windows/exact-revision remote CI and inherited reference gates remain separate stops.
