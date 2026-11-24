# UQ-003 — صدک صریح هزینه و NPV

## Intake / Discover
قابلیت غیرپژوهشی، فقط نمایش و PDF مستقل. هدف: کاربر هزینهٔ نامطلوب را با NPV نامطلوب اشتباه نگیرد. در موتور legacy، `computeStats(..., true)` برای LCOE دو فیلد را معکوس ذخیره می‌کند: p10=q90 و p90=q10. برای NPV ترتیب CDF عادی است و مقادیر منفی مجازند. تعمیم قرارداد انرژی به هر دو اشتباه است.

## Plan / قرارداد / فرض
- `financialMetricQuantiles.ts`: adapter خالص با metric فقط lcoe یا npv، unit دقیق $/MWh یا USD و trace ID غیرخالی. فقط قرارداد موتور legacy فعلی پشتیبانی می‌شود؛ ورودی خارجی با معنای نامعلوم پذیرفته نیست.
- خروجی نسخهٔ `financial-metric-quantiles-v1`، q10/q50/q90، adverseTail با جهت و احتمال CDF، source و provenance و محدودیت‌ها.
- هزینه: q10=legacy.p90، q50=p50، q90=p10؛ adverse=هزینهٔ بالای q90.
- NPV: q10=p10، q50=p50، q90=p90؛ adverse=NPV پایین q10. منفی‌بودن NPV خطا نیست.
- هیچ mean، probability of loss، expected shortfall یا confidence interval از سه صدک استنتاج نمی‌شود.
- `FinancialMetricQuantiles.tsx`: دو flag مستقل محلی با پیش‌فرض خاموش؛ children همان کارت قدیمی‌اند. خاموش=legacy، روشن معتبر=نمایش CDF/دنباله نامطلوب، روشن نامعتبر=alert بدون export، exporting=busy، شکست=retry.
- در FinancialTab فقط دو کارت LCOE/NPV wrap شده‌اند. هیچ معادله، sort، sample، ذخیرهٔ پروژه، API یا endpoint جدیدی اضافه نشده است. مسیر Python/auth بدون تغییر است. محاسبهٔ سنگین جدید در UI وجود ندارد؛ PDF کوتاه lazy است و فونت داخلی دارد.
- خاموش‌کردن flag یا unmount، download تکمیل‌نشده را لغو می‌کند. snapshot export موفق‌شدهٔ قبلی مستقل است.

## Acceptance criteria
1. fixture LCOE با p10=30,p50=20,p90=10 → CDF=10,20,30 و adverse=30.
2. fixture NPV با -100,-20,50 → CDF بدون تغییر و adverse=-100.
3. unit اشتباه، trace خالی، nonfinite و ترتیب نامعتبر رد؛ LCOE منفی رد، NPV منفی مجاز.
4. ورودی mutate نشود؛ actual financial engine با adapter کار کند؛ adapter هیچ adoption/finance mutation ندارد.
5. پیش‌فرض خاموش در fa/en؛ Chromium روی تب واقعی UQ را اجرا و هر دو flag، جهت adverse و PDF را آزمایش کند.
6. PDF واقعی بازخوانی شود و CDF/جهت/source/schema/trace/validation داشته باشد؛ رگرسیون‌های UQ-001/002، انرژی و هسته و types/build سبز.

## راهنمای کاربر و دقت
بعد از اجرای UQ تب مالی، روی کارت LCOE یا NPV گزینهٔ «صدک صریح و دنبالهٔ نامطلوب» را فعال کنید. q90 هزینه به معنی هزینهٔ بالا و q10 NPV به معنی ارزش پایین است. این دو را «P90 هزینه/NPV» نمی‌نامیم تا ابهام جهت نداشته باشند. PDF مستقل تنها snapshot UQ همان اجراست، نه گزارش اصلی طراحی یا گواه مالی.

دقت همان گردکردن قبلی موتور است. P50 میانه است نه لزوماً میانگین. منشأ trace ID اجرایی است نه hash کامل دادهٔ پروژه؛ صحت توزیع‌ها یا بانک‌پذیری را ثابت نمی‌کند. سطح `not_field_validated` در خروجی/PDF و هشدار رابط وجود دارد.

## Verify / Gate / Learn
فرمان: `PVLIB_PYTHON="$PWD/.venv/bin/python" npm run verify:uq:metrics`.
رسید: `docs/audit/UQ-003-GATE.json`.
تست‌های مستقل mapping با مقادیر شناخته‌شده، signed NPV، actual engine، SSR fa/en، PDF text readback و Chromium tab integration اضافه شده‌اند. بررسی کل App، Safari بومی و اعتبارسنجی میدانی ادعا نمی‌شود. گیت برای دامنهٔ این قابلیت است و مانع‌های عمومی انتشار را پاک نمی‌کند.

سه کنترل کیفیت: ورود پژوهش به مالی؟ خیر، مسیر فقط legacy result→presentation است. رگرسیون و مرجع عددی؟ mapping شناخته‌شده و رگرسیون موتور اجرا می‌شوند؛ فیزیک جدیدی وجود ندارد. محدودیت/منشأ/دقت؟ در UI/PDF و این سند است.

Changelog: دو کارت opt-in و PDF مستقل، adapter صریح هزینه/NPV، تست و gate جدید. رفتار legacy با flag خاموش حفظ شده است. نسخهٔ دادهٔ پروژه تغییر نکرده و migration نیاز نیست.
باقی‌مانده/مرحلهٔ بعد: تغییر نام ذخیره‌سازی قدیمی فقط با migration نسخه‌دار، بازبینی ادعاهای risk category/decomposition و انتقال اجرای سنگین UQ قدیمی از thread اصلی در یک چرخهٔ جدا. flag پیش‌فرض همچنان خاموش است؛ این انتشار به معنی رفع کامل همهٔ ادعاهای UQ نیست.
