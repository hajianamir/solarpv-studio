# گزارش تحویل مرحله۳۹
2026-11-03؛ شاخه `arena/237e6ea2-solarpv-studio`؛ مبنا d12117d؛ بدون merge.

## خروجی
موتور1.13.0؛ مصرف کمکی میانگین بازه به وات باsource/quality، timestampصریح و انطباقUTC، بدون fill/interpolation. ثابت و schedule متنافی‌اند. schedule رویLV پس ازavailability و قبلtransformer فقط یک‌بار اعمال می‌شود، حتی درشب/availabilityصفر. مصرف داخلی اینورتر دوباره کسر نمی‌شود. guard، CSVeditor/review/restore، manifest/capability، sourceledger، explorer، JSON/CSV/report و archive/bundle/clone پشتیبانی می‌کنند.

برنامهٔ پیش از کد و منبع: `PVLIB-STEP-39-PLAN.fa.md`؛ راهنمای فنی: `../PVLIB-STEP-39-AUXILIARY-SCHEDULE.fa.md`. تغییر مرحله۳۸ یا۴۰ و تکمیلfoundation۳۱–۳۴ ادعا نمی‌شود.

## تست محلی
- Python کامل: **۱۳۵ تست PASS**؛ سه تست foundationنامرتبط محلی و خارج از تحویل‌اند؛ بنابراین مجموعهٔ نسخه‌شدهٔ قابل‌انتساب **۱۳۲ تست** است. هفت تست جدیدschedule همگیPASS.
- `test:study:workflow` باPythonواقعی PASS؛ suiteجدید قرارداد/CSV/guard/archive/ledger/report/explorer/portablebundle/clone و regressionهای قبلی اجرا شدند. پس از افزوده‌شدن کنترلoffset/childreject، suiteجدید جدا دوبارهPASSشد.
- مقایسهٔworkerقبلیd12117dباworkerجدید درچهارfixture baseline/plant/blocks/mppt: samples،summaryوmonthly دقیقاً برابر.
- `test:study`HTTP/process PASS؛ اجرایواقعیPython،JWT،body/rate/capacity/timeout/kill/abort/runtime/outputbound.
- `test:study:browser` direct+storage PASS؛ مسیرschedule باچنداینورتر، ورودی بد، JSON/CSV/report، archive وIDBreloadrestore واقعاًاجراشد. `test:browser` قدیمی نیز سری و باtimeout۱۸۰ثانیه PASS.
- build،TypeScript،npmtest PASS؛ lint صفرerror و۹۵warning؛ audit با PHYSICS_DIFF_BASE=d12117d PASS؛ gitdiffcheck PASS.

مقادیر عددی شاهد: شش بازهٔ ساعتی با `[0,20,100,0,50,300]` برابر۴۷۰Wh؛ برای۱۵دقیقه۱۱۷٫۵Wh، دوماهUTC۵و۱۱۲٫۵Wh. ترازsignedترانس باbisectionمستقل بررسی شد. برابری دو اجرایworker تنهاregression/routingاست، نه مرجع مستقل فیزیک.

فایل‌هایuntrackedfoundationنامرتبط stageنمی‌شوند. دادهٔ عملیاتی وجودندارد و ساخته/صفرپرنشده. Docker/fieldvalidation انجام‌نشده؛ تست‌های مصنوعی وCI تضمین ایمنی، دقت سالانه یاbankabilityنیستند. CIدقیقSHA پس ازpushدرپاسخ تحویل گزارش می‌شود؛ CIمرحله۳۷ شاهد اینتحویل نیست.
