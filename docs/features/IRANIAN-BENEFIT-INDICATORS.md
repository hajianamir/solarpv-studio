# Iranian screening benefit indicators

The Iranian-regulations panel displays an **illustrative penalty-avoidance proxy**, in million Toman/year with two decimals. A separate outage proxy is in million Toman; no event/annual applicability is verified for that coefficient. Neither amount is guaranteed or newly added to revenue.

The panel explicitly assumes 4200 Toman/kWh and 8.5 million Toman/kWp. These are application assumptions, not verified official rates or customer loss estimates. Site-specific contracts, qualifying electricity, current law and outage costs require separate evidence. Do not sum these proxies or represent them as actual savings.

For 11.8 MWh and .5 kWp the proxies are 49.56 and 4.25 million Toman respectively. Calculation retains double precision until display. The legacy programmatic financial API still returns its old rounded benefit fields for compatibility; new callers use `evaluateIranianBenefitIndicators` with an explicit policy and both explicit rates. There is no financial-ledger or saved-project migration.

The separate adopted-energy boundary still applies. A displayed zero is not a feasibility finding. Invalid/nonfinite/overflow cases are rejected, not turned into zero savings. Disabling the new indicator call/card is a presentation rollback without project-data changes; keep assumption warnings and financial-adoption blocks.

For Windows installation use the repository's `install.bat`. Maintainer regression: `npm run test:iranian:benefits`, also included in `test:phase2`; browser assertions run under `test:phase1:browser`. Decimal generation is offline Python standard library: `python scripts/fixtures/generate-iranian-benefit-indicators.py --check`. See ADR-028 for units, limits and legacy compatibility.

## فارسی

نمایه فرضی اجتناب از جریمه با واحد میلیون تومان در سال و دو رقم اعشار نمایش داده می‌شود. نمایه خاموشی جداگانه و با واحد میلیون تومان است؛ دوره زمانی معتبر برای ضریب آن تأیید نشده است. نرخ ۴۲۰۰ تومان بر کیلووات‌ساعت و ضریب ۸٫۵ میلیون تومان بر کیلووات‌پیک صرفاً فرض برنامه‌اند، نه تعرفه رسمی یا منفعت تضمین‌شده. هیچ‌یک به درآمد جریان نقدی اضافه نمی‌شود. برای نصب ویندوز از `install.bat` استفاده کنید.
