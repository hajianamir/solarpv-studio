# بقای cohort با دادهٔ right-censored — توسعهٔ مستقل از شواهد میدانی مفقود

تاریخ مبنا: ۲۰۲۶/۱۱/۰۳. این توسعه بخشی از A3/N11 را پوشش می‌دهد؛ پذیرش کامل A1–A3 یا RUL اختصاصی SCADA نیست.

## قابلیت واقعی و مسیر اجرا

عملیات `cohort_survival` با plan نسخهٔ `cohort-survival-v1` به worker Python، API احراز هویت‌شده، allowlist SDK و ResearchEditor متصل است. دکمهٔ **Censored cohort survival** مثال مصنوعی قابل‌اجرا را بارگذاری می‌کند. همهٔ محاسبات مدل روی سرور انجام می‌شود؛ محاسبات TS فقط کنترل مستقل نتیجه و سبک‌تر از مدل‌سازی/fit هستند. وابستگی جدیدی نصب نمی‌شود؛ SciPy موجود استفاده می‌شود و اجرای مدل پس از نصب آفلاین است.

کد: `services/pvlib_research/survival.py`؛ قرارداد و validator مستقل: `src/studies/portfolioSurvival.ts`؛ مثال: `docs/examples/portfolio/survival.synthetic.json`.

## قرارداد داده

- هر دارایی یک ردیف از **نصب** تا اولین failure یا آخرین مشاهده دارد؛ `failed=false` یعنی سانسور راست، نه خرابی در انتهای فایل.
- `assetId` در تمام سایت‌ها یکتاست؛ انتقال همان دارایی بین train/evaluation با تعویض siteId مجاز نیست.
- زمان‌ها offset صریح دارند؛ مدت از اختلاف UTC و هر روز برابر ۸۶۴۰۰ ثانیه است. واحد خروجی روز است، نه روز تقویمی محلی.
- سایت‌های train و evaluation جدا هستند. تمام outcomeهای train قبل یا در trainEndUtc هستند؛ نصب تمام دارایی‌های evaluation بعد یا در evaluationStartUtc است و evaluationStartUtc اکیداً بعد از trainEndUtc قرار دارد.
- حداقل دو دارایی در هر split، حداکثر ۱۰۰۰۰ ردیف در مجموع، follow-up مثبت تا ۳۶۵۰۰ روز. این سقف محاسباتی است، نه ادعای کفایت آماری ۲ دارایی.
- تعریف failure، منبع داده و شرح فرض سانسور مستقل/قابل‌انتقال اجباری است. وجود متن، صحت فرض را اثبات نمی‌کند.
- delayed entry/left truncation، competing event و recurrent failure در این نسخه پشتیبانی نمی‌شوند؛ دادهٔ چنین مسئله‌ای نباید با برچسب censor ساده وارد شود. schema برای این مفاهیم فیلد پشتیبانی‌شده ندارد و کلید اضافه را رد می‌کند.

## روش و کمیت مورد برآورد

### ۱. منحنی Kaplan–Meier

در زمان یکتای t، risk set شامل تمام دارایی‌هایی است که follow-up آن‌ها ≥t است. رویدادها پیش از حذف censor در همان زمان اعمال می‌شوند:

`S(t) = product(1 - d_i/n_i)`

تعداد atRisk، failures و censored هر زمان در خروجی است. منحنی فقط روی train fit می‌شود. medianLifetimeDays اولین زمان با S≤۰٫۵ است؛ اگر دیده نشده باشد null است، نه infinity قابل‌استفاده در مالی. median تجربی می‌تواند در بخش کم‌پشتوانهٔ منحنی باشد و به‌تنهایی صلاحیت پیش‌بینی ندارد.

### ۲. بازهٔ اطمینان

Greenwood: `V = sum(d/[n(n-d)])` و CI با تبدیل log-log و confidenceLevel در بازهٔ ۰٫۸ تا ۰٫۹۹. بازه‌ها **نقطه‌ای** هستند؛ simultaneous band یا prediction interval یک دارایی نیستند. برای endpointهای تجربی S=۰ یا ۱ بازهٔ degenerate همان مقدار گزارش می‌شود؛ این به معنی اطمینان واقعی ۱۰۰٪ یا عدم‌قطعیت صفر نیست. فرض استقلال دارایی‌ها و سانسور غیرآگاهانه لازم است؛ cluster correction سایت، bootstrap و covariate adjustment وجود ندارد.

### ۳. بقای شرطی و عمر باقیماندهٔ محدود

برای دارایی فرضی از همان cohort که تا age=a زنده مانده است:

`P(T>a+H | T>a) = S(a+H)/S(a)`

`restrictedMeanRemainingDays = integral[a,a+H] S(t)/S(a) dt`

انتگرال دقیق منحنی پله‌ای است. اگر a+H بیرون max follow-up باشد، risk set در انتهای افق کمتر از minimumAtRisk باشد، یا S(a)=۰، status برابر insufficient_support و هر دو مقدار null هستند. برون‌یابی، Weibull فرضی، میانگین عمر نامحدود یا RUL تجهیز خاص وجود ندارد. CI منحنی نباید به‌عنوان CI این مقدار انتگرالی تعبیر شود.

### ۴. ارزیابی مستقل IPCW Brier در افق ثابت

پیش‌بینی p=S_train(h) است. G با **reverse KM روی train** برآورد می‌شود؛ در زمان‌های tied، failureهای واقعی پیش از censor از denominator حذف می‌شوند. قرارداد tie برای score صریح است: failure در t≤h وزن ۱/G(t−)، دارایی با follow-up>h وزن ۱/G(h)، censor در t≤h سهم صفر می‌گیرد. بنابراین censor دقیقاً در h نیز early-censored است. این قرارداد discrete-time را نباید بدون تطبیق convention با هر کتابخانهٔ دیگر مقایسه کرد.

`Brier = [sum_fail p²/G(t−) + sum_alive (1-p)²/G(h)] / N_evaluation`

دارایی‌های early-censored از مخرج N حذف نمی‌شوند. `scoredAssets` تعداد outcomeهای اطلاع‌رسان است، نه تعداد مستقل سایت‌ها. اگر کمتر از دو outcome اطلاع‌رسان باشد، h خارج از پشتیبانی train باشد، risk set ناکافی باشد یا هر denominator لازم از minimumCensorSurvival پایین‌تر باشد، score=null می‌شود. کمبود شواهد به «خطای صفر» تبدیل نمی‌شود. به‌دلیل وزن‌های تخمینی مقدار score ممکن است از ۱ بزرگ‌تر شود؛ clip نمی‌شود.

این score به سانسور غیرآگاهانه و انتقال‌پذیری توزیع سانسور train به evaluation وابسته است. اختلاف آب‌وهوا/فناوری/سایت یا فرض نادرست با schema حل نمی‌شود. هیچ آستانهٔ قبولی یا ادعای «دقت RUL» از score ساخته نشده است.

## منابع و تصمیم‌های پژوهشی

- [SciPy 1.14.1 ecdf](https://docs.scipy.org/doc/scipy-1.14.1/reference/generated/scipy.stats.ecdf.html): oracle مستقل منحنی survival با CensoredData؛ runtime از نسخه‌های نصب‌شده در envelope گزارش می‌شود.
- [lifelines KaplanMeierFitter](https://lifelines.readthedocs.io/en/latest/fitters/univariate/KaplanMeierFitter.html): Greenwood exponential/log-log و تمایز median ناموجود؛ dependency محصول نیست.
- [scikit-survival، ارزیابی مدل بقا](https://scikit-survival.readthedocs.io/en/stable/user_guide/evaluating-survival-models.html): score مناسب دادهٔ right-censored و محدودیت معیارهای ارزیابی. ادعای بازتولید تمام مثال‌های آن نداریم.
- [scikit-survival 0.28.0 KM reverse](https://scikit-survival.readthedocs.io/en/v0.28.0/api/generated/sksurv.nonparametric.kaplan_meier_estimator.html): در ties، eventها برای برآورد censor distribution اول از denominator کم می‌شوند؛ این جزئیات در پیاده‌سازی و تست مستقل ثبت شده است.

این منابع روش را توجیه می‌کنند، نه قابلیت کاربرد روی تجهیزات پروژه. هیچ ردیف synthetic به مقاله یا سایت واقعی منتسب نشده است.

## معیارهای پذیرش این تحویل

۱. شاهد تحلیلی با train durations=[۲،۲،۴،۶،۸] و failures=[true,false,true,false,false]: risk=[۵،۳،۲،۱]، S=[۰٫۸،۸/۱۵،۸/۱۵،۸/۱۵]. reverse censor در t=۲ برابر ۰٫۷۵ و در t=۶ برابر ۰٫۳۷۵ است.
۲. شرط روی age=۲ و H=۳: survivalProbability=۲/۳ و restrictedMeanRemainingDays=۸/۳ روز، خطای مطلق ≤۱e−۱۲ در تست Python.
۳. Greenwood در اولین رویداد با فرمول بسته و NormalDist مستقل ≤۱e−۱۲ بررسی شود؛ منحنی سه مجموعهٔ تصادفی ثابت با SciPy ecdf/CensoredData مستقل ≤۱e−۱۲ تطبیق کند.
۴. IPCW با محاسبهٔ دستی برابر `((8/15)^2/.75 + (7/15)^2/.75)/3` باشد. حالت بی‌سانسور به Brier معمولی کاهش یابد. censor زودهنگام، positivity و نبود outcome اطلاع‌رسان آزموده شوند.
۵. تغییر outcomeهای evaluation، منحنی train و خروجی شرطی را عوض نکند. split نشت‌دار، asset تکراری بین سایت‌ها، timestamp بدون offset، nonfinite، boolean جعلی، نسخه/کلید نامعتبر و outcome آینده در train رد شوند.
۶. TS مستقلاً risk set، KM، RMST، reverse censor و IPCW را بازحساب کند. CI با تقریب inverse-normal Acklam فقط برای validation کنترل می‌شود؛ tolerance نسبی/مطلق ۱e−۹ است. سطح اطمینان ۰٫۸،۰٫۹،۰٫۹۵،۰٫۹۹ با اجرای واقعی Python تست می‌شود. survival/count/CI/score/gate و status دستکاری‌شده رد شوند.
۷. API واقعی auth و flag، rollback، SDK واقعی HTTP و مرورگر production با مثال جدید و archive/cancel اجرا شوند. اجرای سنگین همان محدودیت همزمانی، timeout و rate limiter موجود را حفظ کند؛ browser پس از شش job پنجرهٔ limiter را رعایت می‌کند.
۸. کل regression foundation و گیت portfolio پس از آخرین ویرایش دوباره اجرا و hash-bound receipt ساخته شود. تغییرات فرمول مالی و انرژی قبلی صفر باشد. سقف ۱۰۰۰۰ دارایی نیز بدون اتکا به زمان‌بندی شکننده تست شود و ورودی بیشتر رد شود.

تست‌ها: `scripts/test_survival.py` (۱۱ تست)، `scripts/test-survival.ts`، مرورگر `scripts/test-portfolio-browser.ts`. گیت: `PVLIB_PYTHON="$PWD/.venv/bin/python" npm run verify:portfolio`.

## feature flag، rollback و مرز پذیرش

همان دو flag `PVLIB_RESEARCH_ENABLED=true` و `PORTFOLIO_ANALYTICS_ENABLED=true` همراه با احراز هویت لازم‌اند؛ پیش‌فرض خاموش. خاموش‌کردن flag portfolio عملیات جدید را از capabilities حذف و run را با 503 متوقف می‌کند. SDK نیز enabled صریح می‌خواهد. UI نتیجه/plan را طبق قرارداد آرشیو پژوهشی ذخیره می‌کند، نه در مدل مالی.

همهٔ خروجی‌ها `not_field_validated`، `projectApproval=blocked`، `safetyApproval=not_assessed` و status پژوهشی insufficient_evidence دارند؛ status فرعی supported فقط پشتیبانی محاسباتی همین برآورد است. هیچ اتصال خودکار به انرژی، CAPEX/OPEX، نرخ خرابی مالی یا تعویض تجهیزات اضافه نشده است.

## Changelog و باقیمانده

یک مسیر اجرایی جدید، سه کمیت آماری، score مستقل و کنترل‌های پذیرش اضافه شد؛ نه صرفاً فرم یا ثبت نام قابلیت. زیرساخت بقای cohort دیگر کاملاً غایب نیست، ولی RUL فردی مبتنی بر SCADA/ML، prediction interval، ارزیابی cluster-aware، competing risks، pipeline رخداد زنده و qualification واقعی همچنان باقی‌اند. بخش‌های نرم‌افزاری A1/A2 در این تحویل تغییر نکردند. دادهٔ واقعی مفقود همچنان مانع تأیید میدانی است، نه مانع اجرای این kernel و تست‌های عددی مستقل آن.
