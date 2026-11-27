# Thermal input origin in the annual screening waterfall

The waterfall is an annual **screening budget**, not proof of chronological climate simulation. Its thermal input qualification has two current bases:

- `scalar_noct_screen`: the shared scalar NOCT estimate uses the supplied ambient temperature and defaults. A canonical annual caller can supply a mean temperature; this is still a scalar estimate, not a time series.
- `supplied_signed_annual_loss_unknown_origin`: a caller supplied a signed annual-loss scalar. Positive loss reduces output; negative loss represents cold gain; explicit zero is not missing. The scalar alone does not establish whether its source was synthetic, measured, reanalysis, TMY or anything else.

Both expose `thermal-input-qualification-v1`, `assessment:screening_only`, `chronologicalCoverage:not_established`, `timeSeriesSampleCount:null`, and false independent-applicability/financial-adoption eligibility. This metadata grants no new adoption rights and does not change existing screening financial arithmetic. A separate profile object, such as App's synthetic `annualThermalProfile`, retains its own origin and limitations; it is not authenticated site weather merely because it contains8760samples.

Open the annual loss waterfall to see the basis/limits. Fresh report/project JSON includes `reportSnapshot.waterfallReport.thermalInputQualification`; inspect that object together with any separate profile and input snapshot. Historical reports missing the property display `unknown_legacy_report`. Missing metadata is unknown, not approval. Exported inputs remain the restoration authority; saved derived results must not be treated as fresh assessed inputs.

No coefficient, energy result, loss/gain sign,17-slot compatibility API or financial ledger changed in this repair. See ADR-032 and `PHASE-2-THERMAL-ORIGIN-PLAN.md`. Actual-base compatibility is internal regression; existing independent signed-thermal references verify component arithmetic only. Site/whole-model accuracy, normative applicability and chronology remain unestablished.

Maintainer verification: `npx tsx scripts/test-thermal-origin.ts` (also in `npm run test:phase2`), `npm run test:phase1:browser`, and governing baseline/integration checks. Windows users install using `install.bat`.

## فارسی

در بودجه سالانه غربالگری، منشأ ورودی حرارتی نمایش داده می‌شود. `scalar_noct_screen` تقریب اسکالر NOCT است. `supplied_signed_annual_loss_unknown_origin` یعنی عدد تلفات سالانه از فراخواننده دریافت شده و منشأ، تعداد نمونه و پوشش زمانی آن از خود عدد قابل اثبات نیست. صفر صریح با نبود ورودی فرق دارد؛ تلفات منفی به معنی بهره سرمایی است. هیچ‌کدام مجوز تازه برای انتقال به مالی یا انرژی سالانه، تأیید انطباق با سایت یا اعتبارسنجی مستقل نیستند. فایل‌های قدیمی بدون این فراداده با `unknown_legacy_report` مشخص می‌شوند. شیوه محاسبه انرژی و مالی تغییری نکرده است. نصب ویندوز با `install.bat` است.
