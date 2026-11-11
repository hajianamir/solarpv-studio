# F-04 — RED / unresolved

**Status: RED. Do not merge as fully verified and do not report F-04 as passing.**

The existing independent audit still reproduces the known discrepancy in the 24-hour generation total:

- Sum of hourly generation values rounded to 0.01 kWh: **40.58 kWh**
- `totalGeneration24hKwh`: **40.56 kWh**
- Difference: **0.02 kWh**
- Reproduction: `npm run test:audit` → `scripts/verify-api-sizing-thermal-audit.ts`, F-04 generation assertion.

The consumption-side F-04 assertion passes, but that does not make the finding green. The failing generation-side assertion remains unchanged and must continue to fail until the contract is decided and the implementation is corrected with an independent regression.

## Decision required

The product/engineering owner must explicitly select the authoritative contract for the total (for example, sum of displayed hourly cents versus rounding the unrounded energy total), and specify how per-hour rounding residuals are allocated, if at all. The implementation and independent test may only be updated after that decision. No reconciliation or tolerance has been added in this remediation.
