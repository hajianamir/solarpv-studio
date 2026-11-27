# Annual thermal screening: interpretation and compatibility

SolarPV Studio distinguishes **hot-design cell temperature** (used in voltage screening) from an **annual signed thermal energy correction**. They are not interchangeable.

## Current synthetic annual policy

`hemisphere_cosine_equator_flat_v1` generates 8,760 synthetic hourly samples and normalizes irradiation to the supplied average daily PSH ×365. It retains the northern July temperature peak, reverses the seasonal temperature harmonic in the southern hemisphere, and applies no hemispheric annual temperature harmonic at exactly zero latitude. Equatorial weather may still be strongly seasonal in reality. The profile is not measured/reanalysis hourly weather or a TMY.

- Supply finite minimum/maximum design temperatures, latitude, PSH, NOCT and power-temperature coefficient. A supplied annual mean must lie within the design extremes. Missing required inputs and inconsistent ranges reject instead of silently fabricating a profile.
- If annual mean is absent, the screen uses the midpoint of design extremes and labels it `derived_from_design_extremes`. A supplied value is labeled `supplied_annual_mean`; that label is not evidence that a provider measured it.
- At zero PSH the output is `zero_reference_irradiation` with a neutral zero-loss budget. There is no generation and no evaluated thermal-yield ratio.
- Mounting offsets and the synthetic weather distribution remain screening assumptions. Roof/shed fixture agreement does not establish real mounting temperatures.
- The ±temperature range is an input-bias sensitivity, not a forecast confidence interval.

## Reading signed percentages

A negative **thermal loss** is an energy gain relative to the temperature reference. A positive waterfall **stage power change** is that same gain. For example, −10% signed loss corresponds to a +10% thermal stage. Canonical `thermalDeratePctUsed` now preserves this sign rather than reporting its absolute magnitude. Other losses/gains still determine final energy.

## Reports and old snapshots

The official report and XLSX include policy/energy-availability labels. Exported project JSON additionally carries the complete thermal profile under supplemental `reportSnapshot.annualThermalProfile`; its signed loss matches the waterfall thermal stage with opposite sign. A report snapshot is historical evidence and does not replace authoritative project inputs on restoration.

Southern/equatorial results created under older software need recomputation. Snapshots without the policy label are historical/unspecified, not automatically current-policy results. Changing a thermal policy requires recomputing dependent annual-energy and financial reports. Do not restore the old northern-only phase or discard cold gains to match an old report. If the synthetic assumption is unsuitable, do not adopt it as a measured-weather/financial forecast; use an appropriately qualified scalar fallback or leave the assessment unavailable.

Independent component/policy arithmetic evidence and limits are recorded in ADR-015 and ADR-016. This guide does not claim whole-model validation, standards conformity or completion of all Phase2 work.

## Clipping precision is a separate screen

The legacy ILR-only clipping estimate now has one shared owner. Its historic annual API still returns four-decimal values (including the pre-clamp raw field), while the waterfall retains unrounded stage precision. This is unchanged screening arithmetic, not a physical inverter or measured annual clipping model. See ADR-017; no increased forecast accuracy follows from consolidation.
