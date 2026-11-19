# Opt-in annual snow / soiling reference import

This connects the pinned **pvlib-python 0.13.1** algorithms to the primary application waterfall, financial annual energy and official reports. It does **not** establish field validation, site calibration, standards conformity or bankable accuracy. Original screening defaults and legacy APIs are unchanged.

## Use

1. Open **Site & Climate**. Set the site's coordinates first. For snow, set the actual roof installation environment in the existing engineering controls and use the active array tilt. Ground mounting and active tracking are not supported by this fixed-tilt roof snow variant.
2. Under **Opt-in reference snow / soiling**, import your JSON file (maximum 20 MB). There are no generated weather samples and no implicit parameter defaults.
3. A successful import replaces only the selected model's existing waterfall stage, once. The other stage keeps its previous manual/screening value. Both requested models must succeed; otherwise neither is applied. Invalid file imports leave the currently active configuration unchanged and display an error.
4. Inspect the status and expandable metadata in Climate, Waterfall and the official report. The model ID/version, declared weather/parameter quality, UTC period, energy source/quality, units, parameters, wash timestamps and limitations are retained. Quality is the caller's declaration, **not independently verified provenance**.
5. **Disable reference models** removes the configuration and restores the original screening/manual inputs. Editing coordinates, tilt or mounting can make an imported configuration unavailable; the waterfall then uses its previous inputs with an explicit reason. A provider refresh may remove the old site-specific configuration; re-import after confirming the current site.
6. Save/export the project explicitly. JSON project/envelope export includes the exact raw inputs under `city.annualReferenceLosses`. Restore preserves them and re-evaluates against the active site/context. Large series may exceed browser-storage quotas; do not assume import implies a durable save. Official DOCX/XLSX/JSON reports include the applied/fallback status and metadata. Existing save-error handling remains in effect.

## File contract

Types: `src/referenceModels/annualReferenceInput.ts`, `kimberInput.ts`, `snowInput.ts`.

This is a **shape illustration only**. Empty arrays below are deliberately unavailable, not zero-loss/weather defaults:

```json
{
  "schemaVersion": 1,
  "year": 2023,
  "site": { "latitude": 40, "longitude": -74 },
  "energyQuality": "user_configured",
  "energySource": "Identify the actual clean/snow-free DC energy source and assumptions",
  "energy": [],
  "soiling": {
    "timezone": "UTC",
    "weatherQuality": "measured",
    "parameterQuality": "user_configured",
    "parameters": {
      "cleaningThresholdMm": 6,
      "lossRatePerDay": 0.0015,
      "gracePeriodDays": 14,
      "maxLossFraction": 0.3,
      "initialLossFraction": 0,
      "rainAccumulationHours": 24
    },
    "manualWashTimestamps": [],
    "steps": []
  }
}
```

The illustrative numbers are **assumptions**, not site measurements or recommendations. Replace every parameter with a defensible value and declare its quality. Supported quality labels are `measured`, `weather_provider`, `user_configured`, `assumed`.

- `energy` entries: `{ "timestamp": "ISO timestamp with explicit UTC offset", "cleanDcEnergyWh": number }`. Energy must be **interval-integrated clean/snow-free DC Wh before both losses**, not irradiance, POA, AC export, PSH, a daily arithmetic mean or already snow/soiling-derated DC energy. Missing/negative/non-finite weights are rejected; true measured zero intervals are allowed. Total weight must be positive.
- `soiling.steps` entries: `{ "timestamp": "same exact string", "rainfallMm": number }`. Rainfall is mm **per interval**, not mm/hour. Existing Kimber `unsoiledEnergyWh` fields, if supplied, are overridden by the common `energy` series to avoid conflicting aggregation weights. Wash timestamps must exactly match a sample. Initial loss is the first sample's state; rate accumulation starts at the next sample.
- Optional `snow` replaces or accompanies `soiling`:

```json
{
  "timezone": "UTC",
  "weatherQuality": "measured",
  "parameterQuality": "user_configured",
  "mounting": "roof",
  "parameters": {
    "tiltDeg": 30,
    "rowSlantHeightM": 2,
    "parallelStringsAlongSlant": 3,
    "initialCoverageFraction": 0,
    "snowfallThresholdCmPerHour": 1,
    "groundDepthThresholdCm": 1,
    "canSlideCoefficientWm2PerC": -80,
    "slideAmountCoefficientPerHour": 0.197
  },
  "steps": []
}
```

- `snow.steps` entries: `{ "timestamp": "same exact string", "snowfallCm": number, "groundSnowDepthCm": number, "poaWm2": number, "ambientTempC": number }`. Snowfall is cm **per interval**; depth is cm; POA is W/m²; temperature is °C. `parallelStringsAlongSlant` maps to pvlib's `num_strings` in `dc_loss_nrel`: the number of parallel strings along row slant height, not the plant-wide string count. Partly covered strings are assumed to lose their entire capacity. Only the roof/reference coefficients **-80 and 0.197 fraction/hour** are supported. Active tilt must match; active mounting must be `industrial_shed` or `rooftop_flat_concrete`. Row slant height is recorded geometry, not a separate factor in pvlib's fraction-based coverage law. These example parameters are not site calibration.

At least one of `soiling` / `snow` must be present. All requested weather and energy arrays must have the **same exact timestamp strings**, length, ordered regular intervals and no gaps. Every timestamp denotes an **interval end**. Coverage must begin at January 1 00:00 UTC of `year` (first timestamp minus one interval) and end at January 1 00:00 UTC of the next year, including leap days. Initial state must therefore be justified for the first interval. Local-calendar-only or partial-year data is not silently annualized. The first timestamp in a daily 2023 series would be `2023-01-02T00:00:00Z`; the last would be `2024-01-01T00:00:00Z`. Snow requires hourly/sub-hourly resolution; Kimber allows regular intervals up to 24 hours.

## Aggregation and sign

Let `E` be clean DC energy per interval, `s` Kimber loss fraction and `n` pvlib snow DC-capacity loss fraction:

- Soiling annual fraction = `sum(E*s) / sum(E)`.
- If both are selected, snow annual fraction = `sum(E*(1-s)*n) / sum(E*(1-s))`.
- The two sequential waterfall retained fractions then reproduce the **joint** environmental retained energy `sum(E*(1-s)*(1-n))/sum(E)` rather than independently averaging two correlated losses. Zero post-soiling denominator for requested snow is unavailable.
- Treating snow capacity loss as proportional interval DC energy loss is an **explicit approximation**, not a shade-circuit model or measured energy validation. Other hourly losses are not coupled to these series; annual PSH/thermal/shading estimates remain as before.
- Percentages passed to the waterfall are positive magnitudes. The existing engine applies `-abs(lossPct)` in each existing stage. There is no second annual energy multiplication. Reference selection takes precedence over the corresponding manual/legacy percentage; disabling restores that input.
- The sizing path has a single environmental derate slot. It receives the multiplicative combined equivalent of the resolved soiling and snow percentages; the primary annual report/finance continues to use the two distinct waterfall stages.

## Scope and evidence

`computeConfiguredWaterfall` provides resolved percentages plus report metadata. `buildWaterfallArgs` supports the same selection for typed callers; consumers using the raw tuple must use `withReferenceLossMetadata` with the **same resolved input context** if they render/export reference claims. `computeCanonicalAnnualYield` is wired to both. `computeWaterfallLosses`'s 17-argument legacy API is unchanged.

The standalone 3D shading diagnostic keeps its original screening defaults; it is not the project's primary annual-energy report and has not been relabeled as a reference run. BIPVT's 3.5% screening soiling assumption is unchanged. Structural snow loading, tracker/transposition, thermal offsets and unrelated constants are unchanged.

Reproducible independent numerical evidence: install `pvlib==0.13.1` in a separate Python environment, then run `python scripts/fixtures/physics/generate-annual-reference-0131.py` from the repository root. The generator uses Python pvlib results and independent energy sums. Report text/metadata templates are API contracts, not physical evidence. Synthetic fixture weather is for numerical testing only and is never supplied to the live project. No field MBE/MAE/RMSE or annual site-validity claim is made.
