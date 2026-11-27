# ADR-019 — Unrounded per-channel current acceptance

Date2026-11-03. Status: implemented for P2-E1. **Not completion of rating-basis-specific U09b or standards conformity.**

## Reproduced defect

Direct `evaluateMpptCompatibility` and `designPvArray` compared currents after `.toFixed(2)`. One channel carrying the next representable binary64 current above20A displayed20.00A and could pass a20A limit. Likewise an Isc just above20A under the retained1.25 screen displayed25.00A and could pass a25A limit. Display rounding must not create declared current capacity.

## Decision

Shared pure predicates compare the **unrounded** allocated per-channel sum with the declared operating and retained legacy short-circuit limits. Exactly equal raw current is within its numeric limit; any represented overload rejects without a display tolerance. Zero allocated strings remain a valid zero-current comparison. Invalid/nonfinite current/rating/allocation dimensions reject at the predicate boundary.

The direct MPPT path, array path and central facade now use those shared predicates. Two-decimal returned/displayed current fields remain compatible. Blocking messages explicitly say values are display-rounded and that the unrounded per-channel comparison governs, so a displayed20.00A versus20A overload does not appear to be an unexplained arithmetic contradiction.

This change does **not** infer a manufacturer multiplier, convert per-input/whole-inverter ratings to per-MPPT ratings, or treat unknown coefficients/current-enhancement conditions as evidence. The existing readiness contract remains separately required. The legacy1.25×Isc rule is retained and explicitly qualified; operating current, short-circuit capability, voltage window and conductor/OCPD domains are not merged. A generic unqualified rating still yields unassessed readiness.

## Research, independent arithmetic and acceptance

Refreshed https://enphase.com/en-au/download/iq8ac-and-iq8hc-microinverters-data-sheet . The relevant DC input table distinguishes14A input operating current,25A short-circuit input current and20A permitted module Isc with an explicit1.25 relationship. This specific product example demonstrates why rating bases cannot be interchanged. It does not establish this project's generic per-MPPT applicability, a universal1.25 rule or a universal factor1 replacement. No product evidence/date/conditions are fabricated from synthetic tests.

The independent generator uses70-digit Decimal and `Decimal.from_float` to retain exact binary64 input values. Forty cases cover1/2/3/6 strings, below/equal/adjacent-above20A and small overloads hidden by two-decimal display, separately for operating and legacy short-circuit comparison. Boolean results are exact (zero tolerance). This is independent threshold arithmetic, not physical current or manufacturer-model validation.

Two directly exported predicate expressions have independently executed and mutation-sensitive fixtures under the unchanged physics gate. Consumer tests reproduce both old false-pass witnesses using rounded fields, then require rejection in direct MPPT, array sizing and the central facade. Exact-limit acceptance and missing-evidence unassessed status remain tested. The Phase1 AST guard enumerates exactly four removed rounded comparisons plus the already approved ADR-015 hot-temperature change; it does not grant a general numerical-parity waiver.

The fix operates on binary64 represented currents, not arbitrary-precision physical measurements. No claim is made that input precision establishes manufacturer measurement tolerance, maximum irradiance, bifacial gain, wire ampacity or conformity.

## Review and delivery

1. Contract trace isolated displayed current from the authoritative acceptance decision; actual channel allocation already used the worst occupied channel rather than a fleet average.
2. Safety/numerical review reproduced the original defect with adjacent-float inputs and checked exact equality, invalid inputs and both current categories. The independent predicates and Decimal references isolate the correction without changing voltage/thermal/current factors.
3. Consumer review checked direct/array/central-facade results and separately asserted readiness remains unassessed without manufacturer evidence. Follow-up manufacturer-table research confirmed the operating/short-circuit/module-rating distinction; unresolved factor/conditions and import/HTTP applicability remain open U09b work. Full continuation review/research rounds are also recorded in ADR-018; no human peer-review claim.

No persisted input schema changes. Recompute historical electrical results; old rounded-current pass flags are historical diagnostics, not current assessments. Safe rollback disables current acceptance if the predicates cannot be supported; it must not restore rounding-based acceptance. Keep returned display fields and missing-evidence containment while investigating.
