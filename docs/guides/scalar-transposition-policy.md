# Named scalar GHI-to-POA policy

The annual loss screen uses **legacy_latitude_tilt_screen_v1**, owned by `src/engine/core/scalarTransposition.ts`. This is an inherited unvalidated latitude/tilt heuristic, **not** a weather-driven irradiance transposition model, measured plant validation or PVsyst/pvlib parity.

## What is unchanged

- Input angles are degrees; output is percent gain over horizontal GHI.
- Missing tilt keeps the old16.8% default. Zero/nonpositive tilt gives0% gain. Missing latitude keeps35.69degrees. Latitude sign is folded to absolute latitude for this screen.
- Optimal tilt, maximum gain, sine/cosine factors and inherited one-decimal quantization are unchanged. Tilt, latitude and tracker choices can materially affect annual energy/finance; displayed precision is not physical accuracy.
- Tracker retains the separate clear-sky relative-gain calculation and1.168fixed-reference anchor. The named fixed-tilt heuristic does not claim tracker baseline equivalence.
- Canonical annual yield, App, waterfall UI and roof simulation reach the same production owner through `computeConfiguredWaterfall`. Existing report JSON/energy outputs are not rewritten and old project settings are not silently reinterpreted.

The waterfall page and bilingual help explicitly name the current screen and its limitations. Current identification does not add a persisted policy selector; broader policy migration and annual/HTTP/profile reconciliation remain open Phase2 work.

## Developer compatibility

Prefer named `computeConfiguredWaterfall` inputs for production composition; deprecated `buildWaterfallArgs` and the17-slot `computeWaterfallLosses` remain for compatibility. The old public `calculateFixedTiltTranspositionGain` waterfall export is an identity re-export of the core function, not a second implementation. New isolated arithmetic consumers may import the core function and policy identifier directly.

`calculateUnifiedAnnualYield` is a deprecated, currently unused alternate legacy annual screen. Its constant1.168fixed/1.25tracker factors and other stage semantics differ. Do not use it as an interchangeable physical or canonical owner. Tests prohibit promoting it into production without an explicit contract/evidence/migration change. Its exported signature and outputs remain intact for compatibility.

Nonfinite/out-of-domain values are tested to ensure extraction parity, **not** approved as engineering inputs. The finite independent arithmetic matrix covers latitude−90..90 and tilt up to90degrees, plus the legacy nonpositive branch. The screen has no DNI/DHI, solar azimuth/zenith or measured-weather decomposition and cannot answer arbitrary physical POA questions.

## Verification and rollback

`npm run test:phase2` includes122independent60-digit Decimal/Taylor-series cases,15individually executed mutation-sensitive expression witnesses and153exact comparisons against the actual base implementation. Prior full-report canonical/roof/reference/browser and artifact checks remain. These verify policy arithmetic, routing and compatibility, not accuracy of its coefficients. ADR-023 and `phase2-transposition-verification-receipt.json` distinguish failed attempts, reruns and limits.

A shallow checkout must include the historical commit used by existing AST baseline tests (`0c4d7cadc7db6001459ea36fdf9a3d1403179a71`); retrieve that exact object rather than changing expected baselines to force a pass. Windows application setup continues through `install.bat`.

Rollback restores the original function body in `waterfallLossEngine.ts` together with removing its new import/re-export. No durable settings or numerical behavior changed, so no destructive migration or automatic financial recalculation is introduced. Never use rollback to remove unsupported-safety containment or silently adopt a different transposition model.
