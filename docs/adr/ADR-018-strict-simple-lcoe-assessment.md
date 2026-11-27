# ADR-018 — Strict simple-LCOE availability and financial boundary

Date:2026-11-03. Status: implemented for P2-F2/F3/F4/F5 in the finance continuation plan. **U16b and Phase2 remain partial; no financial-adoption/release approval.**

## Defects and decisions

The old `calculateLcoe` returns0 for invalid input, nonpositive energy and numerical failure, but also legitimately returns0 for zero costs with positive energy. It clamps costs/degradation and rounds/clamps the lifetime. The scenario path additionally rounded LCOE in the engine and returned0 for absent generation; the HTTP path rejected legitimate zero-cost results and silently ignored supplied degradation. These behaviors cannot form an unambiguous active financial contract.

Introduce a named strict `assessSimpleLcoe` result:

- `available` carries full-precision LCOE, discounted costs, discounted kWh, the normalized input snapshot, named `simple_discounted_lcoe_v1` policy, currency, rate/energy basis and limitations. `financialAdoptionEligible` is alwaysfalse: numeric availability is not a financial-eligibility or research-adoption gate.
- `unavailable` carries null LCOE, a stable invalid-input/numerical-failure reason and issues. Missing/nonfinite inputs, negative costs, zero/negative energy, noninteger/unbounded horizon and invalid basis enums reject. The horizon1–100years is a resource bound, not a physical-validity claim.
- Finite discount fractions greater than−1 are permitted, including0 and negative values. There is no invented rule tying discount to loan interest. Degradation is explicitly percent/year, geometric, within0–100%; first-year energy is before degradation. A100% annual degradation case retains first-year energy and zero later energy.
- Nonfinite or underflowed/overflowed cost/energy/ratio results are unavailable, including zero-cost cases with nonfinite discounted energy. A genuine finite zero-cost result is available0. Positive costs cannot underflow into a false zero LCOE.

One arithmetic owner sums year-zero CAPEX and end-of-year OPEX and energy discounting:

`PVcost = CAPEX + sum(OPEX/(1+r)^t)`;
`PVenergy = sum(Eyear1*(1-d)^(t-1)/(1+r)^t)`;
`LCOE = PVcost/PVenergy`, for t=1…N.

Costs use one declared currency unit; energy is kWh; r is a fractional discount rate and d is degradationPct/100. This is a simple constant-OPEX, pre-tax, unlevered specialization, not a complete tax/debt/incentive/salvage or tariff valuation model. The finite-size iterator avoids unbounded loop execution, including exact-operator mutation tests.

## Compatibility and consumers

The deprecated six-positional `calculateLcoe` export remains. Its legacy validation, cost/degradation clamps, horizon rounding/cap and zero sentinel are preserved. It now delegates arithmetic to the shared owner; the final finite/nonnegative fallback remains. Existing external callers can migrate deliberately; active scenario and HTTP consumers no longer depend on its ambiguous sentinel.

`POST /api/v1/finance/lcoe` retains numeric `lcoeValue` on valid existing requests, now inside an enriched assessment response. Omitted discount/horizon/degradation retain .05/25/0 defaults. Omitted currency/rate/energy basis are explicitly `unspecified`, not inferred. It consumes degradation and accepts mathematically valid negative discount rates. Genuine zero costs now return200/available0. Invalid/unsupported/numerically failed requests return400, with unavailable/null for assessed failures. Numeric strings, booleans and null do not coerce to money or energy; fractional lifetimes no longer silently round. Unsupported fields, including tax/inflation/debt/salvage schedules, reject instead of being silently ignored. Clients depending on coercion/ignored fields must migrate; adding unimplemented fields is not a way to request a richer financial model.

All three scenario alternatives use the strict owner. Each retains an unrounded LCOE and assessment; zero generation is null/unavailable. The React UI distinguishes valid0 from unavailable in Persian/English and only rounds to four decimals for display. Existing scenario CAPEX rounding, discount floor and low-PSH floor remain **qualified existing approximations**, not new correctness claims. The battery replacement reserve is already discounted under the existing scenario policy and is included once in the effective upfront cost. Its energy basis is explicitly `generation_proxy`, not assessed delivered/served off-grid energy. The UI warns about this distinction. These scenarios cannot establish financial adoption eligibility.

The main financialEngine/financialContract/Iranian ledger are not replaced by this simple model. No global economic assumption or project-input schema migration is claimed. Existing projects recompute scenario outputs from authoritative inputs; historical stored scenario0 cannot be interpreted as an assessed free-energy value.

## Independent evidence and scope

Generator `scripts/fixtures/physics/generate-simple-lcoe.py` uses independent50-digit Decimal annual sums. Forty-two cases span .5/1/5/10/50/1000 synthetic capacity scalings; discount−5%/0/18%; geometric degradation0/.5%; zero costs,100% degradation,1/100year horizons and currency/basis labels. It imports no production code or numeric outputs. Synthetic costs do not validate market prices or jurisdiction assumptions.

Tolerance: absolute1e−9 in the compared scalar's units plus relative1e−12, for binary64 versus Decimal accumulation/conversion only. It is not economic/field accuracy. Ten exact-expression fixtures execute the owner, strict wrapper, deprecated adapter and scenario reserve composition and are mutation-sensitive under the unchanged reference gate. Separate tests cover invalid enums/inputs, overflow/underflow, both zero meanings, compatibility clamps and all three scenarios' unrounded values. Real HTTP tests use disposable storage and exercise consumed degradation, metadata/defaults and rejected unsupported inputs. Bilingual server rendering tests verify zero/unavailable display; production browser checks verify the actual scenario value/rounding in both customer modes.

## Three reviews followed by targeted research

1. **Contracts:** traced all active `calculateLcoe` consumers and the LcoeRequest/Response shapes, scenario rendering, quick-sizing separation and public HTTP parser. Initial research fetched SAM LCOE help: real versus nominal values must not be compared as equivalent, delivered energy boundary matters, and total cashflow costs can include much more than CAPEX/OPEX. Decided on explicit strict/simple scope, not a claim of wholesale SAM parity. An alternate NREL simple-LCOE URL failed and was not used as evidence.
2. **Numerical/safety:** reviewed negative rates, year-zero/end-year timing, zero versus invalid,100% degradation, bound execution and floating overflow. Follow-up fetched both chunks of https://samrepo.nlr.gov/help/mtf_lcoe.html : year-zero investment, energy beginning in year1, discounted-cost definition and explanation that denominator discounting is algebraic valuation, not physical energy loss. Fetched https://samrepo.nlr.gov/help/degradation.html and found an important limitation: SAM Detailed PV/PVWatts single-rate settings use linear degradation, while other models/settings compound. Therefore the inherited geometric rule is explicitly named and not falsely validated as SAM PVWatts behavior.
3. **Runtime/delivery:** traced actual scenario energy and found it is a generation proxy, not chronological delivered/served energy. Added explicit `energyBasis`, normalized inputs, `financialAdoptionEligible:false` and a visible bilingual warning; no automatic annual-energy/finance adoption was added. Follow-up fetched https://samrepo.nlr.gov/help/financial_parameters.html : financial/debt/tax structures differ by model. Kept unsupported schedules rejected, not silently folded into a scalar answer. Reviewed actual HTTP tests, JSON roundtrip and production browser precision checks. While reviewing electrical safety, found the independent rounded-current false-pass defect; addressed separately in ADR-019.

These are agent review passes, not independent human peer review or conformity assessment.

## Guide and rollback

See `docs/guides/simple-lcoe-assessment.md` for request/response examples and compatibility. To roll back an active integration safely, disable that assessment or preserve the strict availability envelope while investigating. Do not reinstate zero-as-unavailable to UI/API decisions or silently discard degradation. The legacy adapter is retained for explicit compatibility only. No destructive migration or repository reset is needed; preserve historical artifacts and recompute dependent results after a policy change.

## Remaining U16b work

Explicit persisted economic policy/migration for the other ledgers and currencies, remaining precision audit, project versus equity/debt/DSCR and full replacement/salvage/nonconventional-flow coverage. This LCOE specialization does not implement those packages by omission or by labeling unsupported schedules as accepted.
