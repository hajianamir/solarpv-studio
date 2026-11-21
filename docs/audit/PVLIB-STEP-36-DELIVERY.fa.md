# شواهد تحویل مرحله۳۶
2026-11-03؛ شاخهarena/237e6ea2-solarpv-studio؛ baseline ea3d2a6؛ engine1.11.0. راهنمای قرارداد/کاربری/معادلات/حدود: `docs/PVLIB-STEP-36-INDEPENDENT-MPPT.fa.md`؛ نمونهٔ عددی مصنوعی: `docs/examples/mppt-inputs.synthetic.json`.

## اجرای واقعی
- هفت آزمون جدید Python چندورودی PASS: دو ولتاژمختلف، routing مستقل/عدمcouplingحدجریان، جهت/حرارت مستقل، جمعDCوPVWattsتحلیلی/clippingیک‌بار،plant/exportیک‌بار،۴ورودی وnightauxیک‌بار،۸۷۸۴بازهٔ سال‌کبیسه×۲ورودی وserializationکمتر16MiB، ردمحدودیتresources/قراردادها.
- TSworkflownew PASS: Zod،Pythonواقعی،تمپرستون/انرژی/ولتاژمشترک‌جعلی،ledgerدوره/ماه،thermalvariants،sources،report،comparison،bundle/archive/clone و نمونهٔمستندات. بهscriptCIموجودworkflow افزوده شد.
- realbrowsernew PASS: JSONبد→خطا→JSONدرست→review→runPython→دوvoltageمختلف→CSV/report→backup/restore→IndexedDBsave→reload→restoreباهماننتیجه. تستscreeningisolationموجودنیزعبورکرد.
- کلPythonمحیطبا۳تستذخیره‌نشدهٔ۳۱–۳۴:119PASS. تعدادآزمون‌هایفایل‌هایاینشاخهبدونآن۳تست:116. تست‌های۳۱–۳۴بااینمرحلهcommitنمی‌شوند.
- Workflowکامل،HTTP/process،typecheck/build،lint(0error/95warningقدیمی)،npmtest وauditباPHYSICS_DIFF_BASE=ea3d2a6 موفق.
- legacybrowserدرمهلتپیش‌فرض90sدوبارtimeoutشد(یک‌بارهمزمانباbuild/browserدیگر ویک‌بارجدا). اجرایجدا با `BROWSER_TEST_TIMEOUT_MS=180000 npm run test:browser` موفق؛assertionیاtesttimeoutکد تغییرنکرد. real-study browser جدا باهمانtimeoutقبلیPASS.
- ۱۰پیکربندیسابق fixed/diode/cable/Sandia/tracker/rows/optical/plant/environment/PVsyst درsamples/summary/monthly بینworkerea3d2a6وworkerجدیدبرابریعددی **دقیق** داشتند. فقطmanifest/version/hashتفاوتانتظارمی‌رود.

## مرز شواهد
Crosscheckبااجرایجداworkerشاهدroutingاست، نه استقلالفیزیکی. معادلهٔPVWattsمجموع بافرمولتحلیلی وآزمونحساسیتجداسازیورودی‌ها، درکنارIV/KVL/I²Rمستقلمرحله۳۵ استفادهشد. gateعمومیفیزیک هیچتغییرفرمولدرengineغربالگریندید؛ اینبه‌تنهاییاثباتمدلجدیدنیست. هیچhash/literalmaskingexceptionافزوده نشد.

## نهایی‌سازی
فایل‌های۳۱–۳۴کهپیش‌ترازاینناتمامبودندمحفوظوجداازcommitهستند. هیچweatherعملیاتیساخته/پرنشده،silentfallbackیاmergeوجودندارد. CIموفقاینمرحلهتنهاپسازمشاهدهٔنتیجهٔهمانSHAدرگزارشنهاییگفتهخواهدشد؛ نتیجهٔbaselineبهکدجدیدنسبتداده‌نمی‌شود.
