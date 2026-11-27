# ADR-032 — Do not infer thermal time-series origin from a scalar

Date2026-11-03. Status: bounded provenance containment; verification in the thermal-origin receipt.

## Problem

The17-slot waterfall API accepts an optional signed annual thermal-loss scalar. It previously described every supplied value as a synthetic8760sample annual profile normalized to PSH. A direct caller can supply0 or a cold gain with no originating profile. The description asserted a source/sample count not present in the API. The App currently generates a separate synthetic profile, but that call-site fact does not hold for every direct/named/canonical consumer.

## Decision

Do not change the scalar API or any numerical formula. Add `thermal-input-qualification-v1` metadata on freshly computed waterfall reports with basis `supplied_signed_annual_loss_unknown_origin` or `scalar_noct_screen`. Both remain `screening_only`, chronological coverage `not_established`, sample count null, independently validated applicability false and financial adoption eligibility false. These are evidence restrictions, not a financial model change or a new authorization bypass.

Replace the thermal stage's false source attribution with bilingual neutral signed-scalar/NOCT language. Render basis and limitations in the waterfall UI. JSON report/project snapshots naturally preserve the report metadata. A historical report may lack the additive optional property; display `unknown_legacy_report`, never fabricate origin. The separate App `annualThermalProfile` can still truthfully identify its synthetic generation; this new scalar qualification does not erase that independent object or authenticate it as measured weather.

## Consequences and alternatives

Copying App's profile label into the shared scalar engine is rejected: it invents chronology for other callers. Adding an unvalidated source string to the scalar signature could likewise be mistaken for authenticated provenance. An explicit future model/context/profile selector requires separate versioned inputs, coverage checks and adoption gates; this repair does not implement that selector or whole U02/U07 acceptance.

The optional property preserves existing TypeScript report literals and old files; current outputs always include it. Existing consumers may ignore additive metadata, so explanatory stage text is corrected too. Thirty actual-base whole-report comparisons strip only this new metadata and the corrected thermal explanations; all numeric/stage values must remain equal. Existing signed-thermal independent fixtures remain the arithmetic evidence, not whole-model climate accuracy.

## Rollback and stops

Selectively remove metadata/UI integration if necessary, retaining corrected neutral descriptions and original exported files. Re-run direct/named/canonical compatibility, report readback and baseline/integration/browser gates. Never restore a false8760attribution as a compatibility requirement. No new measured/reanalysis/TMY/chronological, site-matching, manufacturer, financial-adoption, normative or release claim. Native-platform/whole-model gates and other Phase2/3 packages remain independently open.
