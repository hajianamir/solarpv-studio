# مرحلهٔ ۵۴ — نتیجهٔ پیاده‌سازی و تست پژوهشی
تاریخ: 2026-11-03؛ شاخه: `arena/237e6ea2-solarpv-studio`؛ HEAD پایه: `5438fb59f4bb5cde05c20818b780464e1fe28752`.

## وضعیت واقعی
سه جزء مستقل برای **اینرسی حرارتی پشت‌ماژول، برف و آلودگی پویا** پیاده و آزمایش شدند. این یک مسیر پژوهشی با معادلات فرضی صریح است، نه کالیبراسیون یا پذیرش عملیاتی مرحلهٔ۵۴. دادهٔ واقعی حسگر/باد با ارتفاع احراز‌شده/برف/آلودگی/نگهداری و ضرایب مصوب ارائه نشده‌اند. خروجی همیشه `conditional_assumptions / projectApproval=blocked` است. مراحل قبلی به‌واسطهٔ این اجرا پذیرفته‌شده محسوب نمی‌شوند.

برنامهٔ پیش از کد: `PVLIB-54-PLAN.fa.md`. مرجع بررسی‌شده برای فرم ضریب دفع گرما و تطابق ارتفاع باد: [pvlib 0.13.1 Faiman](https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.temperature.faiman.html). مدل حاضر Faiman کالیبره یا پیاده‌سازی استاندارد IEC نیست؛ پارامترهای آزمایش مصنوعی‌اند. ظرفیت، جذب، ذوب و شستشو به شواهد مستقل نیاز دارند. پارامترهای برازش مردود مرحله۴۸ وارد نشدند.

## پیاده‌سازی
### ۱. پشت‌ماژول
`environment.py`: موازنهٔ سطحی `C*dT/dt = absorptance*effectivePOA - extractedElectrical - h*(T-Ta)`، با `h=h0+hWind*wind`.
- ظرفیت J/(m² K)، توان W/m² و دما °C؛ ورودی استخراج الکتریکی صریح و مستقل است، نه توان تولیدشدهٔ مدل یا تخمین از دما.
- هدف فقط `back_of_module`؛ cell target و فیلد دمای سلول رد می‌شوند. `observedEndModuleBackC` صرفاً مشاهدهٔ پشت‌ماژول در انتهای interval است؛ غیاب آن null می‌ماند و صفرسازی نمی‌شود. semantics واقعی حسگر احراز نمی‌شود.
- ارتفاع باد و ارتفاع مبنای ضرایب باید هر دو صریح، مثبت و برابر باشند؛ بدون مقدار پیش‌فرض، تبدیل ارتفاع یا جایگزینی hub height.
- domain منبع‌دار اعلامی برای هوا/باد/POA/دمای پشت‌ماژول اجباری و کنترل می‌شود. این کنترل اثبات اعتبار مهندسی همان domain نیست.
- استخراج الکتریکی ناسازگار با حد محافظه‌کارانهٔ جذب قابل‌دسترس در هر substep رد می‌شود، نه clipping مخفی.
- midpoint-held forcing و حل نمایی حرارت؛ heat integral و stored heat جدا گزارش می‌شوند. دقت برای forcing پیوسته نیازمند refinement است، حتی وقتی residual معادله نزدیک صفر است.

### ۲. برف — ماژول جدا
`snow_environment.py`: انبار **SWE روی ماژول**، بارش SWE صریح و ذوب خطی درجه‌روز با سقف جرم در دسترس؛ coverage=min(SWE/fullCoverageSWE,1)، transmission خطی بین بی‌برف و پوشش کامل.
- نه Marion، نه snow density، sliding، latent heat، insulation یا محاسبهٔ جرم/بار سازه‌ای.
- بارش زمینی/عمق برف به SWE یا بارش باران به برف تبدیل نمی‌شود.
- حذف مکانیکیِ fraction صریح در ابتدای interval ثبت می‌شود؛ حذف، ذوب و بارش جدا و residual انبار گزارش می‌شوند.

### ۳. آلودگی — ماژول جدا
`soiling_environment.py`: optical depth بی‌بُعد با `dTau/dt = deposition - washCoefficient*rain*Tau` و transmission=exp(-Tau).
- حل تحلیلی با تابع پایدار phi، شامل wash صفر و بسیار کوچک/subnormal؛ بدون افتِ deposition در حد wash≈0.
- cleaning fraction صریح در شروع interval فقط یک بار اعمال می‌شود؛ deposited/washed/cleaned و residual جدا هستند.
- مدل فرضی است، نه Kimber، گردوغبار با جرم فیزیکی یا مدل کالیبرهٔ شستشو. برف و خاک مستقل ادامه می‌یابند؛ interaction آن‌ها مدل نشده است.

## زمان، بودجه و حسابداری
interval پیوسته با timestamp دارای Z/offset، مدت۰٫۰۰۱تا۳۶۰۰ثانیه و forcing نوع ZOH؛ بدون gapfill، sort خودکار، حدس DST یا annualization. ورودی ساعتی نمی‌تواند صحت گذرای زیرساعتی را ثابت کند. گام حداکثر۶۰ثانیه و یک‌دهم کمترین time constant در domain اعلامی است؛ بودجه پیش‌برآورد گام‌ها و cancel در هر گام، بدون fallback یا result ناقص جدید. wall-clock timeout ندارد.

`poaBasis=unshaded_front` اجباری؛ transmission برف و خاک یک بار ضرب می‌شوند. اصالت upstream و نبود تلفات پنهان در فایل قابل‌اثبات نیست. هیچ Wh/m² این مسیر به‌صورت خودکار به انرژی نیروگاه، auxiliary، BIPVT، سایه۵۳، مالی یا structural snow اضافه/کسر نمی‌شود. heatToAmbient علامت‌دار است؛ هوای گرم می‌تواند گره سردتر را گرم کند. برف فقط cover نوری فرض شده و موازنهٔ انرژی ذوب برف یا گرمای نهان در این حل نیست.

## تست‌های پس از پیاده‌سازی
**۵۱ تست research PASS** شامل۹تست جدید۵۴ و۴۲تست قبلی:
۱. پاسخ پله و حد تعادل حرارتی با جواب بستهٔ مستقل، انرژی و مشاهدهٔ درست پشت‌ماژول، replay/hash و عدم mutation.
۲. سرمایش نمایی و حساسیت مستقل به ظرفیت، h0، hWind و absorptance.
۳. انبار برف، ذوب محدود به موجودی، coverage و snow removal.
۴. حل مستقل خاک با باران/deposition/cleaning و توازن optical depth.
۵. wash تقریباً صفر/subnormal و انقضای برف با انتگرال تحلیلی انرژی/refinement.
۶. مقایسهٔ coupled thermal/snow/soil با حل‌گر مستقل SciPy DOP853 و refinement گام۲/۱/۰٫۵ثانیه؛ endpoint و انتگرال نوری و residual حرارتی.
۷. پیوستگی UTC/offset از مرز نیمه‌شب، بدون reset یا doublecount و مقایسهٔ غایب null.
۸. رد target سلول، POAقبلاًآلوده، ارتفاع باد نامعلوم/ناسازگار، domain/NaN/زمان نامعتبر، budget/cancel، استخراج ناسازگار و خروج حالت از domain.
۹. اجرای واقعی CLI، readback hash و cancel بدون ایجاد خروجی جدید.

**۱۵۸ تست production Python PASS پس از کد۵۴** در۵۱٫۰۰ثانیه. matrix۸۱۹۲قرارداد:۴۳۵۲رد،۱۶runtime و۳۸۲۴contract-only، نه اجرای عددی همهٔ۸۱۹۲حالت. `git diff --check` و compileall:PASS. TypeScript/build/browser/Windows و CI دقیق SHA این مرحله اجرا نشده‌اند؛ مسیر تولید/UI تغییر نکرده است. نتایج build و workflow مرحلهٔ قبل جای اجرای تازه گزارش نمی‌شوند.

## اجرای عملی CLI — صرفاً synthetic
ورودی: `docs/examples/research/environment-synthetic-plan.json`؛ خروجی: `docs/audit/PVLIB-54-SYNTHETIC-RESULT.json`.
دو interval ده‌دقیقه‌ای، گام۱ثانیه،۱۲۰۰گام؛ انبار اولیهٔ برف۰٫۵mmSWE و خاکTau=۰٫۲؛ باران/deposition/ذوب در intervalاول و پاک‌سازی۸۰٪خاک و حذف برف در شروع دومی. استخراج الکتریکی صریحاً صفر؛ این مثال، نمونهٔ هواشناسی/نگهداری واقعی نیست.

| شاخص | پایان intervalاول | پایان intervalدوم |
|---|---:|---:|
|دمای پشت‌ماژول،°C|24.212875781|24.406235976|
|انبار برف،mmSWE|0.350000000|0|
|optical depth خاک|0.172366710|0.037806675|
|انتگرال تابش مؤثر interval،Wh/m²|111.961436086|80.375474281|

کل تابش مؤثر: **192.336910367Wh/m²**؛ جذب:173.103219331Wh/m²؛ دفع به هوا:158.415766077Wh/m²؛ تغییر گرمای ذخیره‌شده:52874.831711984J/m²؛ residual حرارتی کل کمتر از۱e-8J/m². residual انبار برف کمتر از۱e-13mm و خاک کمتر از۱e-13Tau است. residual کوچک، صحت فیزیک فرضی یا accuracy حسگر را ثابت نمی‌کند.

refinement نمونه:
|گام،s|دمای پایان،°C|تابش مؤثر کل،Wh/m²|
|---|---:|---:|
|2|24.406235610|192.336910337|
|1|24.406235976|192.336910367|
|0.5|24.406236068|192.336910375|
زمان مشاهده‌شدهٔ یک اجرا حدود۰٫۰۰۳ثانیه، نه تضمین realtime. plan/hash فایل پایدار دوباره خوانده و تأیید شد.

## فایل‌ها و پذیرش باقی‌مانده
- `services/pvlib_research/environment.py`
- `services/pvlib_research/snow_environment.py`
- `services/pvlib_research/soiling_environment.py`
- `services/pvlib_research/tests/test_environment.py`
- CLI زیرفرمان `environment` و راهنمای کامل READMEپژوهش.

ظرفیت/ضرایب معتبرِ هدف حسگر درست، اثبات ارتفاع باد و دامنه، هواشناسی/برف/آلودگی/نگهداری واقعی و اندازه‌گیری مستقل پشت‌ماژول با زمان‌بندی کافی و بازبینی مهندس هنوز لازم است. این کار جزئی/پژوهشی است و stage۵۴ازنظرعملیاتیcompleteنیست. هیچ ادعای field-validated، bankable، Kimber/Marion یا IEC-compliance مطرح نمی‌شود. تغییرات قدیمی محفوظ مانده‌اند؛ stage/commit/push/merge انجام نشده است.
