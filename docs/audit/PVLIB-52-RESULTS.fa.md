# مرحلهٔ ۵۲ — نتیجهٔ پیاده‌سازی و تست پژوهشی
تاریخ: 2026-11-03؛ شاخه: `arena/237e6ea2-solarpv-studio`؛ HEAD پایه: `5438fb59f4bb5cde05c20818b780464e1fe28752`.

## وضعیت صریح
مدل پژوهشی هندسهٔ صفحه‌ای و حرکت ترکر پیاده و تست شد. **مرحله از نظر عملیاتی تکمیل نیست**: survey واقعی، مدارک actuator و stow، telemetry باد و لاگ حرکت مستقل ارائه نشده‌اند. خروجی همواره `conditional_assumptions / projectApproval=blocked` است. fixture مصنوعی اعتبارسنجی میدانی یا تأیید ایمنی نیست. هیچ تولید/مالی/auxiliary موجود تغییر نکرده؛ گیت مراحل قبلی هم ارتقا نیافته است.

## موجودی، مرجع و دامنه
برنامهٔ پیش از کد: `PVLIB-52-PLAN.fa.md`. مرجع بررسی‌شده: [مستندات singleaxis](https://pvlib-python.readthedocs.io/en/stable/reference/generated/pvlib.tracking.singleaxis.html) و قرارداد علامت/شیب آن. اجرای واقعی با **pvlib 0.13.1** pinned انجام شد، نه نسخهٔ جاری سایت. پیاده‌سازی axis/cross-axis از صفحهٔ شیب‌دار با همان کتابخانه است؛ آزمون‌های صفحهٔ ساده و برداری مستقل‌اند.

- شیب، جهت نزول صفحه، datum و source صریح؛ محور موازی صفحه فرض می‌شود. این survey reader، مدل 3D واقعی، finite edge یا terrain ناهموار نیست.
- برای محور جنوبی، theta مثبت به غرب است؛ axisTilt مثبت به جنوب نزول دارد و crossAxisTilt مثبت به غرب نزول دارد. زاویه‌های حقیقی، encoder و بردار normal در ENU جدا گزارش می‌شوند.
- رابطهٔ offset دقیقاً یک بار: `physicalTheta = encoderTheta + encoderOffsetDeg`؛ قراردادها و offsetهای legacy تغییر نکرده‌اند.
- هدف ایده‌آل singleaxis/backtracking با GCR=width/pitch محاسبه می‌شود، سپس slew فیزیکی اعمال می‌شود. زاویهٔ واقعی عقب‌مانده از هدف یا در stow، تضمین بی‌سایگی ندارد.
- باد با ارتفاع و منبع اعلامی لازم است؛ ارتفاع حدسی یا تبدیل خودکار ارتفاع نداریم. صحت منبع/نصب احراز نمی‌شود. trigger/release با hysteresis و حالت اولیهٔ صریح؛ باد بر شب اولویت دارد. شب zenith>=90 است.
- intervalهای پیوسته با زمان UTC/offset و حداکثر۶۰ثانیه، خورشید و باد ZOH؛ هیچ interpolation/پرکردن گپ یا پیش‌بینی تندباد انجام نمی‌شود.
- stow با زمان حرکت محدود است، نه حفاظت آنی. مدل شتاب/گشتاور/برخورد/بار باد و برف ندارد.

## انرژی موتور و مقایسهٔ حرکت
مصرف حرکت بر حسب W در زمان حرکت، و مصرف idle فقط در زمان باقی‌مانده، ضرب در تعداد actuator و تقسیم بر۳۶۰۰ می‌شود. مصرف حرکت از قبل شامل مصرف کل حین حرکت است و idle دوباره به آن افزوده نمی‌شود. انرژی خروجی standalone است؛ از انرژی/auxiliary قبلی خودکار کسر نمی‌شود. انتقال به مطالعهٔ انرژی نیازمند بررسی overlap است.

`observedEndEncoderDeg` اختیاری متعلق به انتهای interval است؛ بدون fitting یا اثر بر کنترل، فقط RMSE/MBE و تعداد جفت‌ها گزارش می‌شود. مشاهدهٔ غایب null می‌ماند. در مثال تحویلی لاگ واقعی وجود ندارد.

## تست‌های پس از پیاده‌سازی
**۳۲ تست پژوهشی PASS** شامل۸تست جدید:
۱. oracle برداری ENU مستقل برای شرق/غرب/جنوب، جهت و نرمال سطح.
۲. offsetهای۰،۶٫۵،۱۴ و حفظ حالت اولیهٔ latch باد.
۳. backtracking صفحهٔ افقی با فرمول تحلیلی مستقل و محدودیت مکانیکی بدون backtracking.
۴. صفحهٔ شیب‌دار: علامت axis/cross-axis و عمودبودن normal به محور.
۵. slew، رسیدن/نرسیدن به هدف، انرژی موتور با واحد زمان، مقایسه با لاگ صریحاً مصنوعی و عدم mutation.
۶. wind hysteresis، اولویت stow باد بر شب، مرز شب و بازگشت به tracking، idle بدون حرکت و offset یک‌باره.
۷. UTC/offset، gap، timestamp بدون offset، لغو و سقف تعداد interval.
۸. strict schema، باد غایب، ارتفاع نامعلوم، geometry/actuator نامعتبر، NaN، bool نامعتبر و رد ورودی یک‌ساعته.

**۱۵۸ تست production Python PASS** در۵۰٫۸۰ثانیه؛ matrix۸۱۹۲ قرارداد:۴۳۵۲ رد،۱۶ runtime و۳۸۲۴ contract-only. `git diff --check`:PASS. build/TypeScript/browser/Windows و CI دقیق SHA این مرحله اجرا نشدند. تست الگوریتم هرگز تأیید میدان نیست.

## اجرای عملی CLI با دادهٔ مصنوعی
ورودی: `docs/examples/research/tracker-synthetic-plan.json`؛ خروجی: `docs/audit/PVLIB-52-SYNTHETIC-RESULT.json`.
چهار interval یک‌دقیقه‌ای، صفحهٔ۵درجه رو به غرب، محورجنوبی،۴actuator،سرعت۲deg/s،توان حرکت۱۲۰W و idle۳W برای هر actuator:

| حالت | زاویهٔ فیزیکی پایان، درجه | انرژی موتور کل، Wh |
|---|---:|---:|
|tracking با backtracking|-5.216435754|0.539068324|
|wind stow|0|0.539068324|
|wind latch برقرار|0|0.200000000|
|night stow پس از release|-10|0.850000000|

انرژی کل: **2.128136648Wh**؛ مجموع حرکت هر actuator: **20.432871509deg**. زمان مشاهده‌شدهٔ یک اجرا حدود۰٫۰۰۱۱ثانیه است، نه تضمین realtime. cancel بین intervalها، خطا بدون fallback؛ سقف۱۰۰۰۰interval، نه wallclocktimeout.

## فایل‌ها و تحویل
- `services/pvlib_research/tracker.py`: هندسه، حرکت و حساب انرژی.
- `services/pvlib_research/tests/test_tracker.py`: تست‌ها و oracleها.
- `services/pvlib_research/__main__.py`: زیرفرمان `tracker` با plan/output/cancel-file.
- `services/pvlib_research/README.md`: قراردادها و دستور اجرای کامل.

تغییرات قدیمی working tree حفظ شدند؛ commit/push/merge این نوبت انجام نشده است. قبل از پذیرش واقعی، survey/layout معتبر، محدودیت‌های سازنده و مشخصات استو، باد با ارتفاع/تعریف معتبر و فرکانس کافی، لاگ حرکت مستقل و تأیید مهندسی لازم‌اند. ثبت source/datum به‌تنهایی این گیت‌ها را نمی‌بندد.
