# Conventional annual IRR assessment

The Iranian financial screen now uses an explicitly versioned IRR assessment for project and equity cash flows. Project IRR uses investment before debt; equity IRR uses equity contribution and post-debt flows. Values retain double precision and are displayed to two decimal percent. The screen still uses illustrative assumptions, not verified tariffs or a bankable financial model.

## When a rate is unavailable

- **No sign change:** flows do not contain both an outflow and an inflow. All-zero cash flow is not 0% IRR.
- **Unsupported cash-flow pattern:** positive initial investment, leading-zero investment or reinvestment after positive receipts. Multiple sign changes may produce multiple IRRs; this screen does not pick one.
- **Root outside policy domain:** no root assessed in the search range -90% to 1000% annually. A root elsewhere may still exist.
- **Numerical failure:** arithmetic/residual or normalization could not be trusted. Do not replace it with zero.
- **Invalid input:** malformed, missing, mixed/unsupported metadata or nonfinite flows.

A conventional investment can have several initial negative periods, followed by receipts; intermediate/trailing zeros are permitted. Only equally spaced annual periods are supported. For [-100,110], the annual rate is10%; for [-100,100] it is approximately0%. [-100,230,-132] has10% and20% roots and is deliberately unavailable here. The search range is an application policy, not an engineering/financial standard or a test of project viability.

No IRR display changes revenue, NPV, debt service, saved project inputs or adopted energy. Existing programmatic `runIranianRegulationFinancialModel` fields retain their legacy rounded algorithm for compatibility and are deprecated for new assessment consumers. New callers select `conventional_periodic_irr_bounded_v1` with explicit period/currency/cash-flow/rate basis. Do not combine currencies or nominal/real bases.

Windows setup remains `install.bat`. Maintainers can run `npm run test:periodic-irr` (also part of `test:phase2`) and `npm run test:phase1:browser`. The independent offline stdlib Python fixture byte check is `python scripts/fixtures/generate-periodic-irr.py --check`. ADR-029 documents equations, numerical domain, budgets and rollback. No all-root/XIRR/whole-financial-model validation is claimed.

## فارسی

بازده داخلی پروژه پیش از بدهی و بازده آورده پس از بدهی، از همان جریان نقدی بدون گردکردن محاسبه و فقط هنگام نمایش به دو رقم اعشار گرد می‌شوند. جریان با چند تغییر علامت ممکن است چند ریشه داشته باشد؛ انتخاب خودکار یک ریشه انجام نمی‌شود. دامنه جستجوی سالانه منفی۹۰٪ تا۱۰۰۰٪ سیاست عددی برنامه است، نه حد عمومی بازده. «در دسترس نیست» با صفر درصد تفاوت دارد و علت آن نمایش داده می‌شود. این محاسبه درآمد یا ذخیره پروژه را تغییر نمی‌دهد و مجوز پذیرش مالی یا تضمین سرمایه‌گذاری نیست. نصب ویندوز با `install.bat` انجام می‌شود.
