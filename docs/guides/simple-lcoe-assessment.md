# Simple LCOE: strict availability and migration

Use `assessSimpleLcoe` for new application code. The old six-positional `calculateLcoe` is retained for compatibility, but its numeric0 can mean either a valid zero cost or an unavailable calculation. It must not be used to decide that energy is free.

## Model and units

The model discounts year-zero CAPEX, constant end-of-year OPEX and first-year energy with geometric annual degradation over an integer1–100year horizon. CAPEX/OPEX must share one currency unit. `energyAnnual` is first-year kWh; identify whether it is delivered energy, a generation proxy or unspecified. `discountRate` is a fraction (.05 means5%); `degradationPct` is percent/year (.5 means0.5%). Rates must exceed−1. No automatic currency, inflation or real/nominal conversion occurs.

This is a pre-tax unlevered screen. It does not implement debt/tax/escalation/replacement/salvage schedules, nonlinear degradation or the complete SAM financial model. SAM degradation conventions also vary by performance model; geometric degradation here is explicit, not claimed PVWatts equivalence.

## HTTP example

POST JSON to `/api/v1/finance/lcoe`:

```json
{
  "capex": 10000,
  "opexAnnual": 200,
  "energyAnnual": 5000,
  "discountRate": 0.05,
  "lifetimeYears": 25,
  "degradationPct": 0.5,
  "currency": "USD",
  "rateBasis": "nominal",
  "energyBasis": "delivered"
}
```

Accepted currency labels: `USD`, `TOMAN`, `unspecified`. Valuation labels: `real`, `nominal`, `unspecified`. Energy labels: `delivered`, `generation_proxy`, `unspecified`. Labels describe caller-supplied assumptions, not verified evidence.

- HTTP200/`status:available`: full-precision `lcoeValue`, `discountedCosts`, `discountedEnergyKwh`, normalized `inputs`, `modelPolicy` and limitations. `financialAdoptionEligible:false` remains explicit. Compare alternatives only with a consistent currency, valuation and energy boundary.
- Genuine zero costs with finite positive energy return available0—not an error.
- Invalid/unsupported/numerically failed requests return HTTP400. Strict calculation failures have `status:unavailable`, `lcoeValue:null` and a reason. Zero energy is not free electricity. Overflow/underflow cannot silently become a zero-cost result.
- Legacy omitted discount/horizon/degradation default to .05/25/0. Omitted currency/valuation/energy basis remain `unspecified` and qualified. Numeric strings, null, booleans and fractional horizons do not coerce/round. Unsupported fields such as taxes or inflation reject instead of being ignored.

## Scenario UI

The three existing scenario alternatives keep full-precision LCOE until four-decimal display. Valid0 and unavailable/null render differently in both languages. Scenario energy remains an explicitly labeled generation proxy, not chronological delivered/served energy, and the existing battery replacement present-value reserve is included in effective CAPEX. Existing price/PSH/discount floors are still screening assumptions. These scenario results do not authorize financial adoption.

## Compatibility, historical artifacts and rollback

The deprecated function retains its legacy clamps, horizon rounding/cap and invalid0 sentinel. New strict results deliberately do not preserve that ambiguity. Consumers of scenario `lcoeUsdPerKwh` must handle null; it is not zero. HTTP clients may continue reading `lcoeValue` on successful requests but should migrate to status/reason/basis metadata and handle validation errors.

No global project-input economic-policy migration is claimed by this change. Existing projects recompute scenarios from inputs. Historical0 results without an availability envelope remain ambiguous, not assessed free energy. If strict calculation cannot be supported, leave the assessment unavailable or disable it; do not restore silent parameter omission or zero-as-invalid to active UI/API decisions. See ADR-018 and the finance verification receipt for evidence and limits.

## Electrical precision companion

MPPT current acceptance now compares unrounded per-channel current; displayed currents still use two decimals. A small overload may therefore display as the same rounded number as the rating while correctly being blocked. There is no display-rounding tolerance that grants extra capacity. This does not establish manufacturer rating applicability; missing evidence remains unassessed. See ADR-019.
