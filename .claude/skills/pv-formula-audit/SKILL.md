---
name: pv-formula-audit
description: "Audit PV physics and finance formulas, consumer boundaries, numerical references, and provenance. Use when reviewing engineering calculations or preparing a severity-ranked formula audit."
---
# Formula audit procedure

## When to use
Use for reviews of solar geometry, irradiance, thermal, electrical, structural, storage or financial calculations. For a string-voltage task, also read `skills/pv-string-sizing-iec62548/SKILL.md` from the repository root.

## Inputs
Identify the requested scope, source revision, changed modules, input units, claimed standards and available reference evidence. Record missing inputs; do not invent them.

1. Generate an inventory of numerical exports and consumers, including units, domains, HTTP adapters and project persistence. Do not assume every engine file is pure.
2. Classify physical law, literature model, empirical standard or heuristic. Obtain primary source/edition and applicability; unavailable licensed sources are an evidence gap, not permission to guess clauses.
3. Verify equations, coefficients, units and boundaries. Keep provenance and uncertainty caveats. Distinguish source attribution from independent execution and field validation.
4. Map consumers and duplicated formulas. Run independent fixtures where available; record exact reference version, generator, tolerance rationale and test domain. Internal algebra checks are not external validation.
5. Assess direction of bias per constraint and operating regime. Rank electrical/structural safety, compliance and financial consequences explicitly; energy bias does not automatically outrank structural risk.
6. Report module verdicts (implementation-checked / independently component-compared / screening / unverified), finding severity, implemented/reference equations, evidence, impact and recommendation. Include interconnection and standards matrices when substantiated.
7. Run relevant regression/reference gates and record failures or unavailable evidence. Do not change heuristics or remove caveats merely to produce a green report.

## Required output
- Scope and revision reviewed, modules/consumers inspected, and commands executed.
- Findings table: ID, severity, file/line, implemented versus reference equation, evidence class, bias by operating regime, impact and recommendation.
- Module verdicts and standards/consumer cross-reference matrix where supported.
- Test outcomes, missing evidence and release blockers, separating implementation checks from independent comparison or field validation.

## Stop conditions
Stop adoption or certification claims when reference evidence, applicable standard text, safety inputs or project-context matching is missing. Never change formulas solely to make a gate green. Do not modify code during a read-only audit unless asked.
