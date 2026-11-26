---
name: pv-string-sizing-iec62548
description: "Review or implement PV string voltage windows and Vmp temperature-coefficient handling. Use when changing DC string sizing, hot/cold MPPT limits, coefficient units, catalog wiring, or string-sizing API validation."
---
# String voltage screening

## When to use
Use for DC series-string design, voltage-window reviews, and measured-coefficient data-flow changes. Read `AGENTS.md` and locate every consumer before editing.

## Required inputs
Record module Voc/Vmp, manufacturer temperature coefficients with units and provenance, inverter DC/MPPT limits, hot-cell and cold-design temperatures, mounting assumptions, and per-channel current ratings/allocation. Report missing data explicitly; never fabricate manufacturer values.

## Procedure and equations

Scope: linear temperature-window screening, not an IEC/NEC conformity determination. Verify applicable standard edition and exact clauses separately.

With fractional coefficients per °C and reference 25°C:
- Voc_cold = Voc * (1 + beta_Voc * (T_cold - 25)).
- Vmp_hot/cold = Vmp * (1 + beta_Vmp * (T_hot/cold - 25)).
- N_min = ceil(Vmppt_min / Vmp_hot).
- N_max = min(floor(Vdc_max / Voc_cold), floor(Vmppt_max / Vmp_cold)).
- N_min > N_max is infeasible, never silently clamp into a valid design.
- Current checks require exact inverter rating definitions, per-channel allocation and applicable electrical rules; do not blindly apply 1.25 to every rating called “Isc max”.

Use manufacturer beta_Vmp (%/°C in catalog/advanced sizing, fraction/°C in StringSizingRequest). Supplied values must be finite and negative. API accepts betaVmpPerC or tempCoeffVmpPct and rejects conflicting aliases.

Locally Pmp=Vmp*Imp gives gamma_Pmp=beta_Vmp+alpha_Imp. Alpha_Isc is not alpha_Imp. With positive alpha_Imp, gamma_Pmp can be LESS negative than beta_Vmp: using it directly can overestimate hot Vmp and underestimate cold Vmp. Neither this substitution nor gamma_Pmp-alpha_Isc is guaranteed conservative. Existing fallback values remain for compatibility, with a warning; do not invent missing measured data or infer certification.

Use the shared thermal model on hot-cell design paths. Mounting +14/+6.5°C offsets remain unvalidated assumptions; colder ambient as cold-cell proxy has its own applicability limit. More modules is not universally safer: it can improve hot MPPT operation while violating cold limits.

Test coefficient precedence, %/fraction conversion, missing-value warnings, invalid inputs, both window limits, infeasibility, catalog selection and project round-trip. Synthetic algebra fixtures are implementation checks, not manufacturer or independent yield validation.

## Verification commands
From the repository root, run `npm run test:accepted-audit` for coefficient/window/API checks, `npm test` for shared regressions, and `npm run test:browser` when catalog/selection/persistence UI changes. Run lint/build and the independent-reference gate for changed expressions; consult `package.json` for the current commands.

## Required output and stop conditions
Report coefficient source/units, hot/cold voltages, feasible integer interval, current-rating assumptions, warnings, tests and remaining evidence gaps. Report infeasibility rather than silently selecting an executable string. Missing measured data keeps the result qualified as screening; it does not establish code conformity or bankability. Preserve research-adoption and financial-boundary gates.
