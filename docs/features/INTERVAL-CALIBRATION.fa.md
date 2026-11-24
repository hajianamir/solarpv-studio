# رابط کالیبراسیون بازه و holdout — زیرمجموعهٔ A1

## دامنه

این عملیات، فرمول split-conformal با absolute-residual را روی پیش‌بینی‌های مدل frozen اظهارشده محاسبه می‌کند و holdout را گزارش می‌دهد. fit/retrain،همسان‌سازی کامل legacy UQ،مدل PV/LCOE عمومی،tail calibration،RUL censored و دادهٔ معتبر پروژه خارج دامنه‌اند. این زیرمجموعه نه تکمیل A1 است و نه A1–D3.

نکتهٔ اصلی: site/time holdout لزوماً exchangeable نیست؛ حتی صحت متادیتای «مدل قبل از calibration آموزش دیده» با hash ورودی اثبات نمی‌شود. بنابراین `guaranteeStatus=blocked_exchangeability_and_model_freeze_not_verified` در همهٔ خروجی‌ها ثابت است. هیچ راهی برای تبدیل آن به guaranteed/approved از طریق فیلد ورودی یا تغییر flag وجود ندارد. گزارش پوشش تجربی به معنی تضمین پوشش آینده یا کالیبراسیون عملیاتی نیست.

## استفاده و rollback

requirements اصلی research و `PVLIB_PYTHON` کافی است؛ عملیات runtime اختیاری reference نمی‌خواهد. در سرور دارای احراز هویت موجود، `PVLIB_RESEARCH_ENABLED=true` و `INTERVAL_CALIBRATION_ENABLED=true` لازم‌اند؛ پیش‌فرض خاموش. این پرچم مستقل از PORTFOLIO_ANALYTICS_ENABLED،SCIENCE_C_ENABLED و REFERENCE_MODELS_ENABLED است. حذف آن، عملیات را از capabilities حذف و درخواست اجرا را با503 رد می‌کند، بدون تغییر عملیات قبلی.

در Research editor تب اقلیم، `Interval calibration example` را انتخاب کنید. request نمونه در `docs/examples/references/calibration.json` برای POST `/api/v1/research/run` و `Client(..., enabled=True).run(request)` SDK مشترک است. توکن در archive ذخیره نمی‌شود؛ اطلاعات محرمانه را در source/example قرار ندهید. cancel و import/archive/restore همان مرز قبلی را دارند و هیچ پذیرش مالی ایجاد نمی‌کنند.

## قرارداد داده و جلوگیری از leakage

plan نسخهٔinterval-calibration-v1 شامل source/contextSha256/modelSha256/datasetSha256،modelTrainingEndTimestamp،durationHours،alpha،trainingSites و دو مجموعهٔ calibration/evaluation است. هر ردیف siteId،timestamp با offset صریح،predictionKwh و observedKwh دارد. همهٔ ردیف‌ها انرژی kWh مربوط به پنجره‌ای با طول یکسان durationHours و آغاز timestamp هستند؛ این سرویس resampling/gap-filling یا تبدیل واحد ضمنی نمی‌کند.

محدودیت‌ها:1..5000ردیف و حداکثر100site در هر مجموعه،1..100trainingSite،alpha=.001...5،durationHours=.25..8784. siteها بین training/calibration/evaluation جدا؛site/time یکتا؛پنجره‌های هر site بدون هم‌پوشانی؛trainingEnd پیش از شروع calibration؛پایان آخرین پنجرهٔ calibration <= شروع اولین evaluation. تطبیق timestamp بر حسب زمان UTC است، نه متن offset. chronology و uniqueness تضمین استقلال آماری نیستند. trainSites و model/dataset hashes اظهارشده‌اند؛ نتیجه اصالت سند یا مدل را تأیید نمی‌کند. censoring،censored RUL،واحد MWh و فیلد اضافه پذیرفته نمی‌شوند.

نمونهٔ همراه صریحاً مصنوعی است. modelSha256/datasetSha256 آن sentinelهای تست‌اند، نه هش سند اندازه‌گیری واقعی. این چرخه دادهٔ تجربی مستقل PV یا calibration پروژه فراهم نکرده است. برای چنین ادعایی همچنان دادهٔ مجاز مستقل و بررسی freeze/انتخاب/shift لازم است.

## فرمول و precision

امتیازها `abs(observedKwh-predictionKwh)` فقط از calibration آمده و صعودی مرتب می‌شوند. رتبهٔ یک‌مبنا `ceil((n+1)*(1-alpha))` و شعاع، همان order statistic است؛ interpolation یا quantile معمولی جای آن نمی‌نشیند. برای پرهیز از خطای گردکردن سقف در مرزهای decimal، Python از Decimal(str(alpha)) و TS از محاسبهٔ rational با BigInt روی نمایش decimal همان ورودی استفاده می‌کنند؛ این قرارداد الگوریتمی است، نه ادعای دقت بیشتر دادهٔ اندازه‌گیری.

اگر rank>n باشد، شعاع،دو کران و عرض،null هستند و bandStatus=unbounded_insufficient_calibration. null اینجا **کل خط حقیقی** است، نه صفر یا دادهٔ گمشده. در این حالت empiricalCoverage=1 صرفاً پوشش بدیهی بازهٔ نامحدود است و نباید موفقیت کالیبراسیون تلقی شود. rank به n clip نمی‌شود و Infinity وارد JSON نمی‌شود. lower منفی را هم بدون فرض پنهان نگه می‌داریم.

برای finite bands، interval=[prediction-radius,prediction+radius] و coverage از مقایسهٔ inclusive با همان کران‌های floating-point محاسبه می‌شود. MAE،RMSE،bias با علامت prediction-observed،empiricalCoverage و meanWidth روی evaluation،به‌صورت کل و تفکیک site گزارش می‌شوند. observed evaluation در شعاع دخالت ندارد؛ استفادهٔ مجدد کاربر از holdout برای tuning خارج این سرویس می‌تواند leakage ایجاد کند و این API نمی‌تواند آن را تشخیص دهد.

nominalCoverage=1-alpha نام هدف marginal coverage است، نه P90 exceedance انرژی،نه CI میانگین،نه quantile مالی یا interval کالیبرهٔ RUL. تمام intervalها ممکن است برای کاربرد فیزیکی/مالی نامناسب باشند. هیچ attachment خودکاری به annual-energy یا finance اضافه نشده است؛ خروجی insufficient_evidence/not_field_validated/projectApproval blocked می‌ماند.

## منشأ و پژوهش

مخزن نویسندهٔ Gentle Introduction to Conformal Prediction،commit`0426de356dbfa71c4c46be81d1973255ac66d050`،فایل notebooks/correctness_checks.ipynb و LICENSE MIT صریحاً از GitHub دریافت و در docs/reference-data/conformal frozen شدند؛SHA256/blob/مجوز در manifest است. این notebook شامل آزمایش نرم‌افزاری و نمودار است،نه دادهٔ PV. آزمون ما فقط سه assignment اصلی convention شاخص/Beta در cell7 را جداگانه برای n=100,1000,10000 اجرا می‌کند؛اجرای تمام notebook/plots یا میلیون‌ها Monte Carlo ادعا نمی‌شود. n=10000 این آزمون به convention کد مرجع مربوط است،نه گسترش budget عملیات.

مرجع نظری کشف‌شده: Angelopoulos/Bates،arXiv2107.07511 و مخزن https://github.com/aangelopoulos/conformal-prediction . دریافت PDF از https://arxiv.org/pdf/2107.07511 ناموفق بود؛ متن کامل مقاله خوانده‌شده معرفی نمی‌شود. استناد اجرایی به کد frozen نویسنده و oracleهای رتبه‌ای مستقل است. وبلاگ‌های نتایج جستجو با فرمول‌های quantile interpolated،oracle پذیرفته نشدند.

## آزمون و پذیرش

۱۱ آزمون Python:golden شعاع/MAE/RMSE،convention نویسنده،شمارش همهٔ رتبه‌های held-out در جمعیت‌های کوچک مشخص و ties،نمونهٔ ناکافی،مرز decimal،عدم دخالت outcome holdout در شعاع،lower منفی،site/time/overlap،قرارداد و metadata،immutability/provenance و fresh offline. شمارش رتبه‌ها اثبات اعتبار دادهٔ پروژه نیست. TS شاهد مستقل rational-rank و بازسازی interval/metrics دارد و دخالت rank،شعاع،کران،coverage و guaranteeStatus با tamper آزموده می‌شود.

API/SDK،auth/flag/rollback،core runtime،Chromium production/example/archive/cancel/disabled و کل regression قبلی جزو `npm run verify:calibration` هستند. service worker فقط در context مرورگر این harness برای interception قطعی capabilities مسدود است؛ آزمون lifecycle آن نیست. receipt در `docs/audit/INTERVAL-CALIBRATION-GATE.json`؛ تنها ready-for-review با هش جاری معتبر است.

سه مرور ثبت‌شده:

1. مرور آماری: تمایز nominal coverage و holdout تجربی از guarantee پروژه؛ سپس جستجوی منبع اصلی و دریافت notebook/مجوز نویسنده با commit/hash. تصمیم: guarantee همیشه مسدود.
2. مرور precision: rank کامل با n+1 و شاخهٔ unbounded؛ سپس بازخوانی convention l/a/b کد frozen،شمارش رتبه‌های finite population،آزمون ties و decimal boundary. از clipping رتبه و interpolation اجتناب شد.
3. مرور leakage/provenance: site/time metadata کافی برای exchangeability نیست؛ سپس بررسی پنجره‌های انرژی و افزودن منع overlap و جدایی کامل splitها،آزمون immutable و عدم دخالت evaluation در radius و auth/rollback/tamper. هیچ‌یک جای audit مدل یا دادهٔ میدان نیست.
