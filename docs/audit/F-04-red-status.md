# F-04 — historical status; superseded

> **SUPERSEDED:** The owner later permitted rounding. The no-rounding / exact-equality statements and local pass claims below are historical only and do not describe the current contract or this revised candidate. The current implementation keeps raw computational values and independently displays kWh to two decimals, nearest with ties away from zero; hourly values and totals are rounded independently and the report discloses that totals use unrounded inputs. This precision and tie rule are technical choices, not owner-mandated. Current verification is reported separately for the exact candidate tested.

**Owner decision recorded.** Do not describe this as awaiting a decision. The required contract is exact equality between each published 24-hour energy total and the exact sum of its published unrounded hourly values; no tolerance is allowed.

## Implementation and local evidence

`src/engine/simulation24hEngine.ts` now retains full precision for hourly generation, load, charge, discharge, surplus, and deficit values. The 24-hour generation, consumption, surplus, and deficit totals are reduced directly from the corresponding published hourly steps. The diagnostic annualization in the official report no longer rounds that derived energy total.

Independent checks use strict equality (not a tolerance) and cover the reported scenario, fractional/sub-cent values, polar night, zero PV/zero demand, and battery flows. Local results:

- `REAL_INTERNET=false npx tsx scripts/verify-api-sizing-thermal-audit.ts`: **30/30 passed** on Node 20 and Node 22, including all exact F-04 checks.
- `npm run test:audit`: **exit 0 on Node 20 and Node 22**; F-04 exact assertions passed. R1–R11: 85/85; audit remediation: 70/70; M01–M22: 142/142; phase audit: 56/56.
- `REAL_INTERNET=false npx tsx scripts/engineering-audit-remediation-test.ts`: **70/70 passed**, including strict hourly-load and generation/surplus conservation checks.

The previous implementation produced 40.58 kWh from rounded hourly generation versus a 40.56 kWh total. That is historical pre-fix evidence, not the current outcome. On the changed implementation the published hourly sum and total are both 40.56 kWh, and the regression compares the unrounded values strictly.

## Remaining verification

These results are local, uncommitted, and are **not a CI result**. PR #28 remains open at remote head `1e012083fd1f014c6c027922772dfdb1f585185b`; the local working tree is based on `35e9cfe686e6ac72a1c903452dee2cb1fd57868c`. F-04 should be considered locally fixed and tested, but not CI-verified until these changes are attached to a relevant commit and the required CI run passes. No commit, push, or merge was made.
