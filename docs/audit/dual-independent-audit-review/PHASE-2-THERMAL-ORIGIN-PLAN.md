# U02/U07a continuation — thermal scalar origin containment

Task date2026-11-03; branch arena/1bdbc808-solarpv-studio, base c171538. Preserve existing pump persistence work. Confirmed source defect: `computeWaterfallLosses` labels any supplied annualThermalDerateOverridePct as a synthetic8760profile, even when a direct caller supplies only a scalar. Neither scalar nor annual label proves8760sampling, measured weather, matching context or financial adoption.

## Acceptance before implementation

- TO-01: Explicit supplied thermal override (including0 and negative loss/cold gain) gets machine-readable `supplied_signed_annual_loss_unknown_origin`; no override gets `scalar_noct_screen`. Both are screening-only; chronological coverage and independent applicability are not established. No inferred sample count, provenance authentication or adoption eligibility. Test direct positional/named/canonical paths, zero/cold/hot override cases and JSON readback.
- TO-02: Stage EN/FA descriptions no longer assert synthetic8760origin from the presence of a scalar. Expose localized basis/limits in waterfall UI and preserve metadata inside actual downloaded report/project JSON. Historical reports lacking metadata render unknown rather than invent origin. Existing App synthetic-profile disclosure remains independently true for its separate profile object. Test bilingual SSR and production browser readback.
- TO-03: No changes to numerical formulas,17-slot adapter, loss/gain signs, defaults, financial adoption, legacy values or report input authority. Characterize numerical/stage values against actual base-version waterfall before/after stripping only new metadata and corrected thermal explanatory text. Retain independent signed-thermal cases and full baseline/integration/browser gates. Three reviews with targeted investigations; raw failures retained.

## Compatibility, rollback and stops

Add optional report metadata for compatibility with historical literal/saved reports; fresh engine outputs always provide it. Do not make old saved numbers trusted simply because metadata is missing. Not a new physical thermal model, chronology resolver, authenticated source chain or whole U02 closure. Any downstream claim of chronology/applicability remains blocked. Safe rollback removes new UI/metadata selectively but retains corrected neutral descriptions (do not restore false8760claim). No policy toggle can turn unknown origin into authenticated weather. Native/platform/whole-model and existing Phase2/3 stops remain.
