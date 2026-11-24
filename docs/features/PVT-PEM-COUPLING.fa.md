# اتصال محدود PV-T/PCM به PEM — C3

## دامنه

این قابلیت composition دو kernel موجود و آزموده‌شدهٔ pvt_pcm و pem_dispatch است؛ **فقط اتصال یک‌طرفهٔ انرژی الکتریکی در بازه‌ها**. کلکتور lumped با PCM هم‌دما است، نه solver فضایی Stefan. PEM ایزوترمال است، نه stack حرارتی/فشار/گاز/کنترل واقعی. بازخورد حرارتی، پیش‌گرمایش آب و اعتبار بازیافت گرما، تجهیزات compressor/storage و coupling فضایی همچنان بازند؛ این کار کل C3 یا A1–D3 را تکمیل نمی‌کند.

## استفاده و rollback

requirements اصلی research و `PVLIB_PYTHON` کافی است؛ این عملیات runtime اختیاری reference نمی‌خواهد. سرور باید احراز هویت موجود را داشته باشد. `PVLIB_RESEARCH_ENABLED=true` و `PVT_PEM_COUPLING_ENABLED=true` لازم‌اند، هر دو پیش‌فرض خاموش. پرچم جدید مستقل از SCIENCE_C_ENABLED و REFERENCE_MODELS_ENABLED است؛ فعال‌بودن kernelهای منفرد، coupling را خودکار فعال نمی‌کند. حذف پرچم جدید اجرای درخواست را با503 متوقف و عملیات را از capabilities حذف می‌کند؛ رفتار kernelهای قبلی تغییر نمی‌کند.

در Research editor تب اقلیم، دکمهٔ `PV-T PEM coupled example` را انتخاب کنید. `docs/examples/science-c/coupled.request.json` همان request API در POST `/api/v1/research/run` و SDK موجود `Client(..., enabled=True).run(request)` است. archive/restore،cancel و stale-result suppression همان مرز قبلی را حفظ می‌کنند. توکن داخل archive ذخیره نمی‌شود؛ source یا فایل نمونه جای دادهٔ محرمانه نیست.

## قرارداد اتصال

plan نسخهٔpvt-pem-coupled-v1 شامل source/contextSha256،areaM2،transferEfficiency،hydrogenToleranceKg،collector و electrolyzer است. collector همان plan نسخهٔpvt-pcm-v1؛ electrolyzer پارامترهای pem-dispatch-v1 **بدون records** است. records دستی یا هر فیلد اضافی رد می‌شود؛ API هیچ availableW دلخواه را کنار نتیجهٔ collector نمی‌پذیرد. context سه plan و interval دو زیرمدل باید تطبیق داشته باشند. context صرفاً اظهار مشترک است، نه اثبات انطباق فیزیکی دستگاه‌ها.

هر بازه:

`collectorElectricJ = electricalJm2 * areaM2`

`availableW = collectorElectricJ * transferEfficiency / intervalS`

این توان، **میانگین بازه** است؛ از امکان‌پذیری توان لحظه‌ای یا شکل موج PV و ورودی PEM خبر نمی‌دهد. هیچ ذخیره‌ساز الکتریکی ضمنی مدل نشده و این تقریب برای طراحی کنترل قابل‌استناد نیست. بازه‌های کوتاه‌تر و forcing معتبر برای ارزیابی حساسیت لازم‌اند. مساحت .001..10000m²، بازده انتقال0..1، حداکثر168بازه و بودجهٔ گام همان collector قبلی است.

coarse و fine کلکتور جداگانه با state اولیهٔ یکسان وارد PEM می‌شوند؛ hydrogenDeltaKg اختلاف کل H2 را گزارش می‌کند. شکست gate دما/آنتالپی کلکتور باعث رد درخواست coupled می‌شود. قبولی کلکتور به‌تنهایی کافی نیست: اگر اختلاف H2 از hydrogenToleranceKg ورودی بیشتر باشد، numericalGate=failed_refinement؛ خروجی فقط تشخیصی پژوهشی است. این آستانه دقت فیزیکی یا calibration نیست و مدل، توان/حرارت تجربی تجهیزات را اعتبارسنجی نمی‌کند.

## تراز و شواهد عددی

واحد همهٔ انرژی‌های coupled J و جرم H2 در نتیجهٔ PEM،kg است. تراز:

`absorbed = collectorStorage + fluidHeat + ambientHeat + transferLoss + pemAuxiliary + pemStartup + pemCurtailed + chemicalHHV + pemHeat`

storage/fluid/ambient/pemHeat مقادیر علامت‌دارند؛ مقدار منفی می‌تواند نیاز به گرمای بیرونی باشد و نباید به‌عنوان بازده رایگان یا اعتبار بازیافت به مالی منتقل شود. HHV و heat جدا هستند؛ این تراز بازده مفید حرارتی،فشار،کیفیت گرما یا کارکرد ایمن را ثابت نمی‌کند.

نمونهٔ تحلیلی:50W/m²،100s،مساحت1m²،PV efficiency=.2،transfer=.95؛ خروجی الکتریکی1000J،ورودی PEM برابر950J،تلفات50J،ذخیرهٔ کلکتور4000J. در مدل ثابت1.5V/یک‌سلولی با FaradaicEfficiency=1، جرم H2 برابر `950/1.5/(2*96485.33212)*.00201588` یعنی تقریباً6.61616e-6kg است. این oracle ریاضی مصنوعی است، نه نمونهٔ اندازه‌گیری‌شدهٔ coupled.

شاهد TS زیرنتایج را با witnessهای مستقل قبلی PCM/Faraday بررسی، ورودی PEM را از خروجی collector بازسازی و transfer/totals/combined ledger را کنترل می‌کند. witness PCM یک محاسبهٔ محدود piecewise-affine قبلی است؛ solver SciPy و مدل تولیدی فقط روی سرورند. ledger جهانی تحمل نسبی1e-7 روی مقیاس انرژی دارد؛ تحمل عددی از دقت دستگاه جداست. مقدار hydrogenDelta با کنترل نسبی جدا بررسی می‌شود تا toleranceهای کوچک توسط تحمل عمومی انرژی پوشیده نشوند.

۱۰ آزمون Python شامل oracle تحلیلی،تطابق ترکیب با kernelهای منفرد،تلفات/تاریکی/صفر،scale و curtailment،startup و قطع توان،حرارت منفی،refinement H2 و رد collector،context/interval/records،immutable و fresh offline است. آزمون API/SDK شامل tamper انتقال و nested forcing،runtime اصلی،auth،flag مستقل/rollback و failed-refinement است. Chromium production شامل example/archive/cancel/disabled است؛ service worker برای interception قطعی capabilities در context این harness مسدود است و lifecycle آن در این آزمون جدید سنجیده نمی‌شود.

## پژوهش، provenance و مرز ادعا

این چرخه **دادهٔ تجربی جدیدی به‌دست نیاورده** و ادعای بازتولید benchmark دستگاه ندارد؛ acceptance، analytic software verification است. ورودی‌ها source/context صریح دارند، request/result و digest runtime در envelope حفظ می‌شود؛ نه citation یا hash نمایشی به‌عنوان اندازه‌گیری واقعی معرفی شده و نه synthetic fixture جای holdout مستقل قرار گرفته است.

در جستجوی مرجع اصلی، NREL83155 دربارهٔ مدل PV/electrolysis و قانون Faraday پیدا شد: https://docs.nrel.gov/docs/fy23osti/83155.pdf . دریافت متن کامل ناموفق بود؛ فقط snippet جستجو دیده شد و هیچ پارامتر تجهیز،منحنی عملکرد یا ادعای بازپخش از آن وارد نشده است. نتایج جستجو دربارهٔ مدل‌های دینامیکی PEM نیز نشان می‌دادند coupling الکتریکی ساده جای مدل حرارت/گاز را نمی‌گیرد؛ متن کامل آزمایش/دادهٔ قابل‌دریافت با مجوز تأییدشده در این چرخه فراهم نشد. روابط عددی/فرضیات مرجع همان kernelهای قبلاً مستندشده و oracle مستقل ریاضی است.

سه مرور ثبت‌شده:

1. مرور معماری: جلوگیری از double forcing و mismatched context/interval؛ سپس بازخوانی acceptance و روابط kernelهای موجود و جستجوی مرجع PV/electrolysis. تصمیم: availableW فقط مشتق از انرژی collector.
2. مرور انرژی: HHV/heat علامت‌دار و عدم اعتباردهی خودکار به preheat؛ سپس بررسی شواهد پژوهشی موجود و مقایسهٔ قانون Faraday با snippet NREL،ساخت oracle ریاضی و آزمون نیاز حرارتی منفی.
3. مرور همگرایی/امنیت: دمای همگرا تضمین H2 نیست؛ سپس تحلیل نمونهٔ حساس به step و آزمون cutoff/startup/curtailment و قرارداد strict. در اجرای نخستِ تست، stripped شدن فیلد records در schema جدید پیدا و با strict اصلاح شد؛ هیچ tolerance برای پنهان‌کردن شکست کاهش نیافت.

## گیت و ایمنی

`PVLIB_PYTHON=... PVLIB_REFERENCE_PYTHON=... npm run verify:coupling` کل زنجیرهٔ قبلی را نیز اجرا می‌کند. receipt: `docs/audit/PVT-PEM-COUPLING-GATE.json`. فقط ready-for-review با هش جاری معتبر است. کلیهٔ خروجی‌ها insufficient_evidence/not_field_validated/projectApproval blocked و safetyApproval not_assessed هستند. نه annual yield،نه مالی،نه گواه ایمنی و نه پذیرش پروژه خودکار اضافه نشده است.
