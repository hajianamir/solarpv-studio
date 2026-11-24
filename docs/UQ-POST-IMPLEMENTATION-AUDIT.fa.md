# گزارش بازبینی و صحت‌سنجی UQ-001 تا UQ-004

## نتیجهٔ اجرایی
کد قرارداد صدک، adapterهای انرژی/هزینه/NPV، سه کارت و PDF، Worker/runner، lifecycle تب مالی، precache و تست‌های مربوط بازبینی شد. پس از اصلاح یافته‌های زیر، فرمان تجمیعی `PVLIB_PYTHON="$PWD/.venv/bin/python" npm run verify:uq:worker` با exit code صفر اجرا شد. رسید خودکار وضعیت `ready-for-review` دارد؛ این وضعیت فقط برای دامنهٔ آزموده‌شده است، نه تأیید انتشار عمومی یا دقت میدانی.

## یافته‌ها و اصلاحات این بازبینی

| یافته | ریسک | اصلاح | شاهد تست |
|---|---|---|---|
| runner فقط سه p50 را finite می‌سنجید | پذیرش نتیجهٔ ناقص با tail/واحد/شمارندهٔ خراب | قرارداد کامل `financialUqResultValidation.ts`؛ reject بدون repair | mutation روی پاسخ کامل موتور: NaN p10، tail نامرتب، stdDev نامتناهی، unit، count، درصد و trace خراب |
| export هنگام تعویض نتیجه در همان مؤلفه باطل نمی‌شد | دانلود PDF متعلق به نتیجهٔ قبلی کنار نتیجهٔ جدید | وابسته‌کردن نسل export به value/traceId/metric | درخواست فونت معلق، تعویض props، عدم دانلود قدیمی و موفقیت export تازه؛ انرژی، LCOE و NPV |
| تعداد نمونه خارج snapshot-context بود | باقی‌ماندن نتیجهٔ تعداد نمونهٔ قبلی پس از انتخاب جدید | افزودن uqSampleSize به context و لغو/ابطال | E2E production: تغییر به ۲۰۰، پنهان‌شدن نتیجه و اجرای درخواست ۲۰۰تایی |
| lint محدوده قبلاً در gate نبود؛ cleanup عددی هشدار exhaustive-deps ایجاد می‌کرد | نبود کنترل استاتیک lifecycle در پذیرش | capture شیء نسل پایدار؛ افزودن ESLint محدوده به gate | صفر خطای lint؛ دو warning قدیمی any باقی است |
| guard منبع انرژی می‌توانست در صورت نبود locator تهی باشد | امکان false-pass در آزمون مرز مالی | assertion وجود دقیق یک منبع انرژی | E2E production و مقایسه قبل/بعد |

اعتبارسنجی جدید **سلامت انتقال/ساختار نتیجه** را می‌سنجد: واحدها، finite بودن همهٔ عددها، ترتیب انرژی/NPV و ترتیب معکوس LCOE، nominal=median، شمارنده‌های سازگار و بازهٔ درصدها. این کنترل توزیع ورودی را کالیبره نمی‌کند و امتیاز Pearson را به سهم واریانس تبدیل نمی‌کند.

## پوشش صحت‌سنجی پس از اصلاح

| سطح | مورد | نتیجه |
|---|---|---|
| عددی مستقل | lognormal تحلیلی با مرجع NormalDist؛ معنی P90 انرژی=q10 | PASS در UQ-001 |
| قرارداد | CDF هزینه با mapping معکوس، NPV منفی، واحد واقعی MWh/year، خطاهای ورودی، immutability | PASS |
| Worker واقعی | مقایسه در powerplant/ongrid/offgrid با اجرای مستقیم legacy | برابری دقیق همهٔ فیلدها جز traceId مبتنی بر ساعت |
| شکست و منابع | cancel/timeout/unavailable، malformed reply، onerror/messageerror/postMessage failure، sample bounds و build flag خاموش | PASS |
| UI و PDF | SSR دو زبان، Chromium مؤلفه/تب واقعی، PDF text readback، خطای فونت/retry و لغو export کهنه | PASS |
| E2E production | App کامل + Express + Worker واقعی، برچسب‌ها، دانلود، cancel/retry، stale pricing/sample count، asset failure، navigation | PASS |
| آفلاین | reload برنامه با Service Worker واقعی و سپس اجرای Worker بدون اتصال | PASS |
| پاسخ‌گویی | job واقعی ۲۰۰۰ نمونه و پیشروی timer اصلی | PASS؛ ۳۶ tick در اجرای ثبت‌شده، نه SLA سرعت |
| رگرسیون | هسته، UQ قبلی و مرز پذیرش انرژی عملیاتی | PASS |
| مرورگر گسترده | مجموعهٔ موجود offline lazy routes، SW update، AC، F-04، import/export، multitab catalog، خطاهای ذخیره و fallback climate | PASS؛ بخش آنلاین قدیمی synthetic/mocked است |
| استاتیک و build | TypeScript client/node، lint محدوده و build production، diff whitespace | PASS؛ دو warning قدیمی any و هشدارهای bundle باقی |

مرجع قابل بازتولید: `docs/audit/UQ-004-GATE.json` دارای command/exit status و hash فایل‌های کلیدی است. `docs/audit/UQ-004-E2E.json` پوشش E2E و محدودیت آن را ثبت می‌کند. گزارش‌های UQ-001 تا UQ-003 نیز در gate دوباره ساخته شدند. timestamp رسیدها از ساعت محیط اجراست.

## مرزهای حفظ‌شده
- موتور و فرمول مالی بازنویسی نشده‌اند؛ همان محاسبه در Worker اجرا می‌شود.
- main-thread synchronous fallback وجود ندارد؛ خاموش‌بودن flag مسیر را مسدود می‌کند.
- هیچ endpoint، راز، dependency جدید یا پذیرش انرژی پژوهشی اضافه نشده است.
- خروجی‌های پژوهش به‌طور خودکار وارد مالی نمی‌شوند؛ تست مرز انرژی قبلی هم دوباره اجرا شد.
- برچسب‌های risk/decomposition در UI اکتشافی‌اند؛ raw enum و نام فیلدهای legacy برای backward compatibility باقی‌اند.

## موارد باقی‌مانده — اولویت‌بندی

### اولویت بالا، پیش از ادعای انتشار چندسکویی/عمومی
1. **native Safari و Windows در کد نهایی:** در این چرخه اجرا نشده‌اند. مانع تاریخی دسترسی دیسک Safari با Chromium سبز رفع‌شده نیست؛ WebKit نیز جای Safari واقعی نیست.
2. **مجوز انتشار:** LICENSE ریشه در checkout موجود نیست. موارد قبلی حقوق داده/fixture و dependencyهای نامشخص باید با شواهد تعیین تکلیف شوند؛ این ممیزی مجوز حقوقی صادر نمی‌کند.

### اولویت محصول و سازگاری
3. **مهاجرت نسخه‌دار نام فیلدها:** p10/p90 قدیمی برای انرژی و LCOE معناهای متفاوت دارند؛ adapter صریح افزوده شده، اما فرمت legacy هنوز تغییر نکرده است.
4. **نمایش پیش‌فرض:** flagهای صریح کارت‌ها همچنان پیش‌فرض خاموش‌اند. حالت legacy هنوز برچسب‌های قدیمی و نمایش spread را دارد؛ اصلاح پیش‌فرض باید همراه رگرسیون و سیاست مهاجرت مستقل باشد.
5. **بستهٔ بازتولید پروژه‌ای UQ:** traceId مدرک hash کامل پروژه/توزیع/پارامتر/کد نیست. archive نسخه‌دار با seed، تمام فرض‌ها و source hashes هنوز نیاز است.
6. **کیفیت کد و bundle:** دو warning قدیمی any در FinancialTab و هشدارهای chunk size/dynamic imports/annotation وابستگی‌ها باقی‌اند. هیچ خطای lint در محدودهٔ بررسی‌شده باقی نماند.

### اولویت علمی — خارج از ادعای صحت نرم‌افزاری
7. **کالیبراسیون پروژه‌ای CV و همبستگی:** توزیع‌های فعلی اکتشافی‌اند؛ عبور تست‌ها اثبات عدم‌قطعیت واقعی پروژه نیست.
8. **تفکیک معتبر aleatory/epistemic و attribution:** اکنون UI score بودن را درست می‌گوید؛ Sobol/Shapley یا nested UQ معتبر هنوز پیاده‌سازی نشده‌اند.
9. **P75/P99 و tail convergence:** از سه صدک موجود استنتاج نمی‌شوند؛ نیازمند طرح نمونه‌برداری و شواهد جدا هستند.
10. **اعتبارسنجی میدانی و بانک‌پذیری:** دادهٔ مستقل/holdout و معیارهای پروژه لازم است. parity موتور و Worker فقط عدم تغییر رفتار محاسباتی را ثابت می‌کند.

این فهرست backlog است، نه وجود ده نقص اصلاح‌نشده در قابلیت‌های پذیرفته‌شده. موارد ۱ و ۲ مانع ادعای انتشار عمومی‌اند؛ سایر موارد توسعه/مهاجرت یا ادعای علمی فراتر از دامنهٔ فعلی هستند.

## پیگیری اجرایی UQ-005
موارد ۳ تا ۵ در محدودهٔ بستهٔ UQ اجرا و تست شدند: آرشیو نسخه‌دار با هر دو mapping legacy/canonical، نمایش صریح پیش‌فرض همراه fallback، export/import و replay مستقل Worker با source identity و تشخیص دست‌کاری. مورد ۶: دو any رفع، chunkهای PDF/Office تفکیک و Climate/Financial lazy شدند؛ بودجهٔ JS زیر ۱٬۰۰۰٬۰۰۰ byte پاس شد. هشدارهای وابستگی/cycle بدون تحلیل بیشتر بسته اعلام نمی‌شوند.

برای مورد ۱، workflow واقعی Linux/Windows افزوده شد، ولی در این جلسه اجرای remote یا native Safari انجام نشده است. موارد ۲ و ۷ تا ۱۰ بدون مدرک مالکیت، runtime بومی و دادهٔ مستقل بسته نشده‌اند؛ گیت انتشار عمداً `blocked_external_evidence` است. شرح پذیرش، rollback و تست‌ها: `docs/features/UQ-005-REPRODUCIBILITY.fa.md`؛ رسید تست: `docs/audit/UQ-005-GATE.json`.
