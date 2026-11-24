# بازبینی دقیقاً سه‌دوره‌ای مراحل قبل از۵۳
2026-11-03؛ شاخهarena/237e6ea2-solarpv-studio؛HEADپایه5438fb5. دامنه و ترتیب در `PVLIB-THREE-REVIEWS-AND-53-PLAN.fa.md` ثبت شد. این بررسی جامعِ قراردادها و suiteهای در دسترس است، نه ادعای مرور دستی تمام خطوط تاریخی یا اثبات میدان همهٔمراحل.

## دور۱ — قرارداد، کد و گیت‌ها (انجام شد)
roadmap و گیت‌های۴۴–۵۲ و مسیرهای production/research بررسی شدند؛ sourceهای thermal/uncertainty/electrical/transient/tracker و CLI مرور شدند. دو نقص قابل‌رفع:
- خروجی۵۰–۵۲planکامل وhashواحد نداشت: افزودن plan وplanSha256 با الگوریتم canonical موجود؛ فرمول‌ها/حدود/approval تغییر نکردند. تست replay و حساسیت hash اضافه شد.
- وضعیت roadmap۴۸ «اجرانشده» بود درحالی‌که پژوهش محدود انجام شده؛ وضعیت۴۸/۴۹ اصلاح شد بدون completeکردن عملیاتی.
نیازمندی‌های واقعی باز: اصلXLSX/ارتفاعباد/کالیبراسیون حسگر؛ شواهد۴۴–۴۷ و پروتکل مستقل واقعی؛ بودجهٔانرژی۴۹؛ کابل/ترانس۵۰؛کنترلر/telemetry۵۱؛survey/actuator/wind/log۵۲. هیچ‌یک با synthetic یا sourceخوداظهاری بسته نشدند.

## دور۲ — تست مرزی و رگرسیون (انجام شد)
۳۳تستresearch شاملmanifest replay جدید PASS؛۱۵۸تستproductionPython PASS؛تمام زنجیره npm test:study:workflow شامل مراحل۴۴–۴۷ وreview۳۰–۴۰ وmatrixدو‌زبانه PASS؛ lint:typesclient/node وbuild PASS (هشدارbundleبزرگ باقی است، خطا نیست). تلاش اول workflow باpythonسیستمexit3داد؛ محیطpinnedباPVLIB_PYTHONصریح پیکربندی شد و کل زنجیره مجدد موفق اجرا شد؛ تست‌ها برایپنهان‌کردنخطا تغییرنکردند. لاگ‌ها در/tmp/review-round2-* هستند. نقص فرمول تازه‌ای دراینsuiteها بازتولید نشد؛ دامنه‌های پیوسته/میدان ازاینPASSنتیجه نمی‌شوند.

## دور۳ — بازآزمایی اصلاحات و اسناد (انجام شد، پیش از کد۵۳)
۳۳تستresearchدوبارهPASS؛ سهCLI۵۰/۵۱/۵۲بازاجرا و JSONهای پایدار باplan/hashجدید تازه شدند؛ hashهرسهباdigestمستقلدرreadbackبررسی وblockedبودنشان تأیید شد. npm test: ششbenchmark وinternal synthetic/BIPVT PASS؛ npm test:study: HTTP/processواقعی شاملauth/timeout/abort/runtime/outputbounds PASS. diffcheckPASS. roadmapباوضعیتواقعی۴۸/۴۹ سازگارشد. نقصقابل‌بازتولیدبازماندهدرمحدودهٔsuiteها مشاهده نشد؛ محدودیت‌هایواقعی دور۱باز می‌مانند. مرورگر واقعی/CIWindows/Linuxاین‌نوبتاجرانشد؛ build/typecheck دور۲موفقبود. دقیقاًهمینسه‌دور برایمراحل قبلی انجام شد؛ تست‌هایپساز۵۳دورچهارمبازبینیقبلیمحسوبنمی‌شوند.

## جمع‌بندی پیش از۵۳
دو اصلاح نرم‌افزاری/مستندی دور۱ تکمیل و در دور۲/۳ تأیید شدند. داده/مدرک غایب قابل اختراع نیست. این مرور PASSهمهٔدامنه‌هایپیوسته/صحتتمامفرمول‌ها/گیت‌هایایمنیومیدانیرااثباتنمی‌کند. هیچمرحله‌ایصرفاًبه‌دلیلاینبررسیعملیاتیcompleteنشد. تغییراتunrelated حفظ وstage/commit/push/mergeنشدند.
