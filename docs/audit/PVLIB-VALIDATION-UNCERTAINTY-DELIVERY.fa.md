# تحویل ابزارهای کالیبراسیون/عدم‌قطعیت/پروندهٔ میدان
2026-11-03؛ مبنا a2780c1؛ شاخه arena/237e6ea2-solarpv-studio؛ بدون merge.

## نتیجهٔ واقعی
این تحویل سه ابزار اجرایی دارد: کالیبراسیون تجربی gain خروجی با holdout، P50/P90 شرطی لوگ‌نرمال و dossier شواهد/معیارهای میدان. **کالیبراسیون پارامتر فیزیکی و اعتبارسنجی واقعی سایت انجام نشده‌اند**؛ داده و مدارک عملیاتی نداریم. این تمایز در UI، قرارداد گزارش، راهنما و برنامهٔ فازبندی حفظ شده و validationStatus در همهٔ مسیرها not_field_validated است. هیچ پارامتر worker/مدل یا عدد مالی تغییر نمی‌کند؛ engine1.16.0 ثابت است.

## فایل‌ها و کاربرد
- `src/studies/studyValidation.ts`: plan strict با SHA مطالعه، gain fit/holdout، uncertainty correlation PSD و quantile، field gates، HTML امن و report hash.
- `src/components/StudyValidationTools.tsx` و panel: مثال‌های صریح synthetic، plan JSON، تأیید اجباری، اجرا، دانلود JSON/HTML/plan و بارگذاری plan برای بازمحاسبه؛ stale result/plan رد می‌شود.
- `scripts/test-study-validation.ts`: تست‌های مستقل و actual worker؛ در workflow/CI موجود افزوده شد.
- `docs/PVLIB-VALIDATION-TOOLS.fa.md`: فرمول‌ها، زمان، واحد، مراجع، روش استفاده و محدودیت.
- `docs/PVLIB-NEXT-PHASES.fa.md`: برنامهٔ داده/مسئولیت/وابستگی/گیت برای۴۴–۵۵. ابزارهای۴۴–۴۷ موجودند ولی اجرای واقعی میدان pending است؛۴۸ physical calibration و۴۹ uncertainty budget واقعی و سپس۵۰–۵۵ نیازمند اقدام مستقل‌اند. این شماره‌ها completion ادعایی inventory نیستند.
- inventory جملهٔ قدیمی «نبود measurement comparison» را اصلاح کرده و operationalValidationStatus را صریح ثبت می‌کند؛ fieldValidation=false باقی است.

## آزمون‌های اجراشده
۱. تست جدید PASS: gain معلوم۱.۱ و هدف غیرمتناسب با oracle مستقل Python fsum، bound/clamp، حداقل train/test و timestamp/overlap، dark unidentifiable، holdout بدتر بدون تغییر gain؛ عدمmutation واقعی samples/summary/monthly. تست‌های منحنی fit روی دادهٔ مصنوعی مستقل از ادعای physical parameter fitting‌اند.
۲. NIST/Python NormalDist oracle برای P90، CV0 و correlation−1/0/+1، matrix نامتقارن/nonPSD/duplicate، افق سال ناقص رد و سال کامل UTC مصنوعی با اجرای واقعی worker پذیرفته شد؛ خروجی سال مصنوعی ادعای آب‌وهوای واقعی یا اعتبار سالانه نیست.
۳. field gates: synthetic/assumed blocked، reference خالی رد، operational_declared+measured با receipt و thresholds فقط declared_criteria_met و همچنان not_field_validated؛ شکست معیار و پنجرهٔ بیرون دوره، اتصال calibration صرفاً به test همان حسگر، escapeHTML و plan/recompute/bundle PASS. اصالت رشتهٔ reference قابل اثبات خودکار نیست.
۴. مرورگر واقعی PASS: تأییدقبل‌اجرا، افق annual روی مطالعهٔ ناقص رد، uncertainty JSON/HTML readback با تابع برابر، plan دانلود/بارگذاری/اجرای مجدد، fieldsynthetic blocked، calibration کم‌داده رد؛ سپس fixture مستقل شش‌جفتی ساخته‌شده با دو اجرای واقعی worker و بازیابی archive، fit موفق gain۱.۱ و برابری گزارش در UI. reset پس از result جدید بررسی شد. خطای نوع union در assert تست مرورگر یافت و با narrowing رفع شد؛ typecheck و browser مجدد PASS.
۵. ۱۵۸ تست Python PASS؛ workflow کامل شامل سه مرحلهٔ اندازه‌گیری و تست جدید PASS. ماتریس قبلی۸۱۹۲قرارداد/۴۳۵۲رد/۱۶runtime/۳۸۲۴contract-only؛ نه اجرای عددی همهٔ دامنه‌ها.
۶. API/process، storage browser، benchmarkها، audit/source/physics gates، build، tsc و lint PASS؛ lint۹۵warningموجود/صفرerror و هشدار chunk بزرگ build باقی‌اند.

## مراجع بررسی‌شده پیش ازکد
- NIST lognormal: https://www.itl.nist.gov/div898/handbook/eda/section3/eda3669.htm
- scikit-learn1.6 train/test leakage: https://scikit-learn.org/1.6/modules/cross_validation.html

CI دقیق commit پس از ثبت/push بررسی و در پاسخ نهایی لینک می‌شود؛ موفقیت CI قبلی جای این نسخه نیست. فایل عملیاتی/گواهی حسگر ارائه نشده؛ فاز میدانی، physical fitting، uncertainty budget واقعی، بانک‌پذیری و استانداردپذیری انجام‌شده اعلام نمی‌شوند. برای اقدام بعدی داده‌های فازصفر سند فازبندی باید ارائه و پروتکل پیش از تحلیل نهایی تأیید شود.
