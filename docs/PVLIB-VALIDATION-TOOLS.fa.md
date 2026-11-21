# ابزار کالیبراسیون خروجی، P50/P90 و پروندهٔ میدان

## چه چیزی اجرا شده و چه چیزی نشده است؟
این تحویل ابزار **empirical output calibration**، **conditional lognormal P50/P90** و **field-evidence dossier** را اجرا می‌کند. هیچ دادهٔ عملیاتی ارائه نشده و در نتیجه هیچ سایت واقعاً کالیبره/اعتبارسنجی نشده است. برازش پارامترهای فیزیکی ماژول/اینورتر/حرارت پیاده‌سازی این بسته نیست؛ فاز۴۸ سند `PVLIB-NEXT-PHASES.fa.md` برای آن تعریف شده است. engineVersion همچنان1.16.0 و validationStatus همیشه not_field_validated است.

## استفاده
۱. مطالعه را با ورودی‌های کامل اجرا کنید؛ برای کالیبراسیون و پروندهٔ میدان، مشاهدات مستقل را از importer مرحله۴۱ اضافه کنید.
۲. بخش **Calibration, P50/P90 and field evidence** را باز کنید. سه دکمه فقط مثال **SYNTHETIC** می‌سازند؛ مثال‌ها تخمین واقعی یا معیار استاندارد نیستند. ابزار کالیبراسیون روی fixture پنج‌ردیفی۴۱ که فقط دو جفت دارد عمداً خطای کمبود داده می‌دهد.
۳. plan JSON را با protocol/source/version واقعی، studyInputSha256 همان نتیجه و همهٔ فرض‌ها تکمیل کنید. کلید اضافی، متن خالی، پنجرهٔ نامعتبر، SHA مطالعهٔ دیگر و plan بیش از۶۴KiB رد می‌شوند. تأیید فرض‌ها قبل از اجرا اجباری است.
۴. Compute را اجرا و JSON+plan و HTML مستقل را دریافت کنید. plan JSON جدا قابل دریافت و بارگذاری مجدد است؛ بارگذاری، نتیجهٔ قبلی را trusted نمی‌گیرد و با تأیید مجدد دوباره روی نتیجهٔ معتبر محاسبه می‌کند. config/SHA در گزارش است. گزارش یا اصلاح خروجی به archive/worker/مالی تحمیل نمی‌شود؛ برای بازتولید، study JSON و plan را نگه دارید. با result/restore جدید فرم و گزارش پاک می‌شوند.

## قراردادها و فرمول‌ها
ورودی `study-validation-plan-v1` و خروجی `study-validation-report-v1` با analyticsVersion1.0.0 هستند. منبع، نسخه و purpose (`synthetic_software_test` یا `operational_declared`) اجباری‌اند؛ label/مدرک کاربر را نرم‌افزار احراز اصالت نمی‌کند. result در مرز API تابع تحلیل با validateResult بررسی می‌شود.

### output_calibration
پارامترها: datasetId، دو پنجرهٔ train/test با Z/offset، minGain/maxGain صریح در بازهٔ حفاظتی[0.5,1.5]. فقط export/import/DC غیرمنفی؛ دما و net signed رد می‌شوند. پنجره‌ها با midpoint UTC و [start,end) انتخاب می‌شوند؛ train باید پیش از test و spanهای رکوردها غیرهم‌پوشان باشند. حداقل۲جفت valid در هر بخش؛ این حد نرم‌افزار است و کفایت علمی/فصلی را ثابت نمی‌کند.

`g_unconstrained = Σ(x_model × y_observed) / Σ(x_model²)`؛ gain به bounds clamp می‌شود و boundActive گزارش می‌شود. train تماماً تاریک/صفر غیرقابل‌شناسایی است و رد می‌شود. پیش‌بینی تجربی `g × model` است؛ offset ندارد. MBE/MAE/RMSE قبل و بعد برای train و test با علامت model−observed گزارش می‌شود. صفر/شب معتبر حذف نمی‌شود؛ missing/excluded/outside/unavailable وارد fit نمی‌شود. test gain را انتخاب نمی‌کند؛ بدترشدن holdout صریحاً نمایان است و hide/auto-revert نمی‌شود. تکرار تنظیم با نگاه به test همچنان leakage است و نرم‌افزار نمی‌تواند استقلال اجرایی آزمایش را تضمین کند. گواهی حسگر یا پارامتر فیزیکی به دست نمی‌آید و gain خودکار به baseline/P50/P90 اعمال نمی‌شود.

### energy_uncertainty
افق `study_period` یا `single_calendar_year`؛ دومی فقط با سال کامل UTC معتبر. نقطهٔ انرژی **AC export** مثبت است، نه net signed. کاربر صریحاً `study_ac_export_as_median` را می‌پذیرد؛ مدل نمی‌داند خروجی deterministic واقعاً median است. حداکثر۸مؤلفهٔ منبع‌دار با CV[0,1] و ماتریس correlation صریح مربعی و symmetric با قطر۱ و PSD. هیچ پیش‌فرض استقلال وجود ندارد. correlation مربوط به متغیرهای نرمال در **log-space** است، نه لزوماً correlation مقادیر انرژی در فضای عادی. مقادیر صفر و ماتریس‌های singular مثبت‌نیمه‌معین با تلرانس عددی حدود1e-12 پذیرفته می‌شوند.

`sigma_i = sqrt(log(1+CV_i²))`
`variance_log = Σ_i Σ_j rho_ij sigma_i sigma_j`
`P50 = study AC export energy`
`P90 = P50 × exp(−1.2815515655446004 × sqrt(variance_log))`
`mean = P50 × exp(variance_log/2)`

P90 صدک۱۰/سطح۹۰٪ exceedance **تحت فرض مدل اعلام‌شده** است، نه confidence interval میانگین یا تضمین مالی. CVها باید برای همان horizon باشند؛ systematic/interannual خودکار کاهش نمی‌یابند و تبدیل چندسال/ensemble/Monte Carlo یا استقلال/دوباره‌شماری منابع بررسی فیزیکی نشده است. CV=0 یک فرض قطعی اعلامی و حالت حدی توزیع است؛ برابری P50/P90 اثبات قطعیت واقعی نیست. residual RMSE مستقیماً uncertainty نیست. فصل/چند ساعت را سالانه نمی‌کنیم.

مرجع پیش ازکد: NIST lognormal distribution، scale=median و inverse survival. https://www.itl.nist.gov/div898/handbook/eda/section3/eda3669.htm

### field_evidence
datasetId، evaluation، evidence references برای certificate/time sync/site&meter boundary/independent review و criteria منبع‌دار اجباری‌اند. criteria شامل حداقل pairs، pairedHours، درصد پوشش بازه‌های مدل، حداکثر|MBE| و RMSE با واحد canonical حسگر است. evaluation باید داخل دورهٔ مدل باشد؛ مخرج coverage تعداد بازه‌های مدل در پنجرهٔ انتخابی است، نه پوشش فصلی یا اصالت مشاهده. دادهٔ توان بدون هیچ جفت energized نمی‌تواند عملکرد توان را ارزیابی کند.

اگر calibration اختیاری داده شود، evaluation باید دقیقاً همان test دست‌نخوردهٔ همان حسگر باشد و train جدا باشد؛ metrics اصلاح‌شده به‌طور صریح معیار ارزیابی‌اند و raw نیز باقی است. ورودی synthetic، کیفیت غیرmeasured، نبود receipt، پنجرهٔ خارج مدل یا نبود جفت => `blocked`. پروندهٔ دارای label measured و مدارک اعلامی از نظر عددی `declared_criteria_met` یا `criteria_not_met` می‌گیرد؛ **هیچ‌کدام field_validated نیستند**. reference رشته‌ای اثبات وجود یا اعتبار گواهی نیست. threshold کاربر استاندارد IEC یا تأیید مهندس نیست. اعتبار واقعی به بازبین مستقل و داده/مدارک واقعی نیاز دارد.

مرجع: جداسازی train/test و خطر tuning روی test، scikit-learn1.6. https://scikit-learn.org/1.6/modules/cross_validation.html

## شواهد و محدودیت
`scripts/test-study-validation.ts` شاهد gain معلوم و هدف غیرمتناسب با oracle مستقل Python، clamp، بدترشدن holdout، leakage/حداقل داده/آموزش صفر؛ oracle مستقل NormalDist برای P90، CVصفر/correlation±1/PSD-invalid و سال ناقص/کامل مصنوعی؛ gateهای پروندهٔ میدان، plan hash، عدمmutation و bundle/recompute و HTML escape را اجرا می‌کند. تست مرورگر اجرای واقعی و download/readback و بارگذاری plan را می‌سنجد. دادهٔ سال مصنوعی فقط شاهد calendar gate است و آب‌وهوای عملیاتی/اعتبار سالانه محسوب نمی‌شود.

برنامهٔ همهٔ بسته‌ها و گیت‌های داده/آزمون/تأیید در `docs/PVLIB-NEXT-PHASES.fa.md` است. با عبور تست نرم‌افزاری نمی‌توان فاز عملیاتی را کامل نامید؛ calibration فیزیکی، campaign واقعی و uncertainty budget پروژه هنوز نیازمند داده و اجرای مراحل آن سندند.
