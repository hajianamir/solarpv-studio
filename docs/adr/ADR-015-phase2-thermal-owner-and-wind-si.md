# ADR-015 — Shared hot temperature, signed scalar annual correction and wind SI/default policy

Date: 2026-11-03. Status: accepted for the changes below. **Not full Phase 2 completion or model-adoption approval.**

## Decisions and acceptance

### P2-T3 — MPPT hot-temperature ownership

The direct MPPT API no longer approximates an unknown hot cell as ambient maximum +25 °C. It accepts optional NOCT and installation environment and delegates the fallback to `calculateThermalDerate(...).cellTempHotC`. Explicit supplied `cellTempHotC` remains authoritative. Existing shared NOCT defaults/mounting assumptions apply; absent NOCT is still an assumed 45 °C, not manufacturer evidence. The power coefficient does not enter the cell-temperature formula; only the temperature is consumed from that call, never its power-derating result.

An independently specified ground-mount example at ambient40 °C, NOCT42 °C, G1000 W/m² gives cell67.5 °C. With the synthetic measured voltage slope -.3%/°C and ten 40 V modules, hot string Vmp is349 V versus the old fallback's352 V. The full direct-export fixture independently derives voltage windows, currents, allocation, ratio and readiness metadata; synthetic evidence metadata is not a real product's proof. Nine ground/shed/roof × NOCT40/42/45 consistency tests compare implicit shared temperature to explicitly supplied shared temperature. These establish ownership; they do not validate mounting offsets or manufacturer temperature coefficients.

### P2-T4 — Scalar annual power correction is signed

Annual scalar loss now uses `-gammaPct * (TcellAnnual-25)` rather than `abs(gammaPct)*max(0,TcellAnnual-25)`. This preserves cold gains and the direction of an explicitly supplied coefficient. The hot-design temperature and hot-design loss convention are unchanged. Existing callers of `calculateAnnualThermalDerate`/annual-yield stages receive the signed annual result; no claim is made that every annual energy consumer now chooses the same temperature/profile policy.

The oracle executes pvlib0.13.1 PVWatts DC at24 independently specified ground-mount component conditions: NOCT40/42/45, ambient annual mean -40/0/25/40 °C and gamma -.3/+.3%/°C. NOCT temperature is independently computed with Decimal using Applied Sciences2020,10(3)914 Eq1. Units: °C, W/m², percent per °C, signed loss percentage. Tolerance1e-10 percentage points plus relative1e-12 covers floating-point arithmetic only. Unusual positive coefficients are algebraic sign tests, not manufacturer claims. The direct-export reference gate mutation-probes both changed annual expressions.

### P2-W3 — Correct per-foot elevation coefficient and default-height discontinuity

The published elevation factor is `exp(-0.0000362*zFeet)`, not that coefficient times metres. A dedicated component converts metres using exact0.3048 m/ft before applying the exponent. Sources: NCSEA Wind Engineering Committee February2024 school/hospital examples (site379 ft → Ke≈.986), corroborated by Bentley STAAD.Pro2025's ASCE7-22 verification (300 ft →≈.989). Both were fetched, not merely quoted from an audit. Existing below-sea-level no-reduction Ke=1 policy is retained explicitly; this is not validation of physical density below sea level.

Nine independent 50-digit Decimal cases cover negative/zero, published-example elevations and500/1000/1190/1620/2000 m. The independent combined-pressure fixture separately declares all other legacy parameters rather than presenting them as a validated code chain. At1190 m the corrected factor is≈.868201, at1620 m≈.824976. Previous internal regressions expecting≈.958/.943 were reproducing the metre-unit mistake; replaced by independently computed references, not wider tolerances.

Omitted height now follows the existing explicit3 m legacy reference-height calculation for all B/C/D exposures, removing the independent .88 shortcut in both entry points. Legacy exposure constants/power law/minimums are **unchanged and not newly validated as a current-edition table**. At3 m in legacy C, rounded Kz=.849; the old omitted-height .88 result changes. Default height is a screening policy, not measured site geometry.

Height/exposure/Kzt/Kd input guards reject nonfinite/invalid inputs. The positive Kd range is≤1; positive Kzt is not silently floored. Removed the hidden .5 clamps so a supplied valid factor is not substituted. Kd stays included exactly once in the explicitly legacy combined-pressure screen; this is **not** a claim that its qz field is the ASCE7-22 velocity-pressure definition. The NCSEA source explicitly notes Kd's relocation to design pressure in7-22. All exposure/elevation combinations in the regression verify the retained product scales once, not Kd².

## Research sources and scope

- https://doi.org/10.3390/app10030914 , §2 Eq1. Full relevant section fetched: the paper warns the simple NOCT method is ground-mount oriented and does not establish roof-integrated behavior.
- https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.pvsystem.pvwatts_dc.html , signed temperature factor relative to25 °C; gamma in1/°C. Not a synthetic annual-weather validation.
- https://www.ncsea.com/app/uploads/2024/02/Wind-Problems.pdf , ground elevation examples and directionality relocation discussion. Not an applicability assessment for PV tables.
- https://docs.bentley.com/LiveContent/web/STAAD.Pro-v2025.0.1/Help/en/topics/Verification/06%20Loading/v-stpst_ASCE_7-22_wind_load_generation_on_building.html , ground-elevation300 ft example. The exposure/pressure verification concerns an enclosed building, not this project's PV aerodynamics; no wholesale table adoption.

## Three review passes / follow-up

1. **Ownership/contracts:** traced direct MPPT and existing shared temperature APIs. Explicit overrides remain unchanged. Prior Phase1 AST-parity tests now enumerate exactly the one removed MPPT fallback expression and one fixture-gated shared call. They still reject every unreviewed delta. No reference-gate source change or waiver.
2. **Numerics/safety:** independently fetched NOCT, pvlib and NCSEA/Bentley sources; corrected the wind-unit error and annual sign handling. Revisited omitted versus explicit height and found the .88 shortcut remained in two locations; removed both in favor of the existing3 m path. Ke component proof does not approve the exposure table/aerodynamics.
3. **Runtime/artifacts:** ran focused consumer and production-browser report/readback checks. Existing core/coverage checks first failed because stored assertions reproduced old .88/metre-unit behavior. Replaced those specific expectations with independently calculated default-policy/elevation values and preserved strict tolerances. Broad formula-AST guards remain narrow allowlists of the actual reviewed removals/additions; new math still has executed, mutation-sensitive independent fixtures.

## Compatibility and rollback

Derived wind forces/depths/recommendations change at positive elevation and for omitted height. Recompute from authoritative project inputs; old report snapshots are historical, not this model's outputs. There is no claim that a complete persisted model-policy migration has shipped. Default-height/edition/category/aerodynamic applicability still needs qualification before design adoption. A safe wind rollback disables design acceptance or selects a separately justified no-altitude-reduction screen; never silently restore the known metre-unit exponent.

Direct MPPT calls that omitted both measured hot cell and NOCT can now produce different hot-window constraints. This intentionally fixes ownership drift; callers with measured hot-cell inputs are unaffected. Do not roll back to ambient+25; either supply the authoritative temperature or leave voltage assessment unavailable. Annual cold gains must not be silently clamped away to recover old totals.

## Remaining Phase2 work

U02's synthetic hemisphere/equator/profile policy and complete canonical/App/HTTP/metadata reconciliation remain open. U09b rating-specific factors, U07a scalar consolidation, full U16b explicit financial policy/migration, and wind normative applicability/model-policy migration are not closed by these component fixes. The inherited CAD reference debt is unchanged. This ADR cannot be used to declare Phase2 or release validation finished.
