# نتیجه مرحله اول پیاده‌سازی مرجع — ۲۰۲۶-۱۱-۰۳

شاخه: `arena/cfc20741-solarpv-studio`؛ گزارش پیش از کد: `REFERENCE-MODELS-IMPLEMENTATION-START.fa.md` در commit `1d5351ec913462501ea9f55309b092904d972b73`؛ پیاده‌سازی: `851aa38`.

**این تحویل جزئی است؛ دستور سه‌مدلی و integration کامل نشده است.** دو API محاسباتی مستقل از legacy ساخته شده‌اند. مدل forced-air BIPVT، اتصال UI/report/waterfall و اعتبارسنجی میدانی هنوز انجام نشده‌اند. هیچ‌یک validated/calibrated/bankable/SAM-grade نامیده نمی‌شود.

## قبل و بعد

|موضوع|قبل|اکنون|
|---|---|---|
|Soiling|binهای screening قدیمی|همان مسیر حفظ شد؛ API جداگانه `calculateKimberSeries` با شناسه `soiling_kimber_pvlib_0131` نسخه `1.0.0` اضافه شد|
|Snow|shedding نمایی screening قدیمی|همان مسیر حفظ شد؛ API جداگانه `calculateSnowSeries` با شناسه `snow_pvlib_nrel_0131_roof` نسخه `1.0.0` اضافه شد|
|BIPVT|موتور legacy و front soiling ثابت|بدون تغییر؛ مدل مرجع جدید یا solver معتبر اضافه نشده است|
|UI و waterfall|مسیرهای قبلی|بدون تغییر؛ مدل‌های جدید هنوز انتخاب/اعمال نمی‌شوند و افتی دوباره افزوده نمی‌شود|

فایل‌های اجرایی: `src/engine/reference/{kimberSeries,snowSeries}.ts`؛ قراردادها و کنترل ورودی: `src/referenceModels/{kimberInput,snowInput}.ts`. aliasهای قدیمی، structural snow load، tracker/transposition و ثابت‌های نامرتبط تغییر نکرده‌اند.

## دامنه و قرارداد اجرایی

- هر دو: پارامترها و provenance صریح، timestamps با offset و timezone معتبر، resolution منظم؛ داده ناقص/نامعتبر نتیجه `missing_or_unsupported` با samples=null می‌دهد. بارش مفقود با صفر جایگزین نمی‌شود. metadata شامل شناسه، نسخه، واحد، محدودیت و `not_field_validated` است. quality ورودی به‌وسیله caller اعلام می‌شود؛ تأیید مستقل منبع داده نیست.
- Kimber: حداقل دو نمونه، حداکثر فاصله ۲۴ ساعت؛ rainfall بر حسب mm/interval؛ rolling window راست‌بسته `(t-window,t]`؛ آستانه باران strict `>` و grace strict `<`؛ گام اول initial state، wash در timestamp دقیق بدون ایجاد grace جدید؛ cap روی خروجی و نه accumulator داخلی. تمام threshold/window/grace/rate/cap/initial/washها ورودی‌اند، default اقلیمی پنهان ندارند. سری انرژی unsoiled کامل و مثبت، افت وزن‌دار انرژی می‌دهد؛ وزن ناقص/صفر نتیجه تجمیعی null، نه میانگین روزانه. نتیجه period است، خودکار annual نامیده نمی‌شود. پیاده‌سازی rolling فعلاً O(n²) است؛ برای سری‌های بسیار بلند زیرساعتی بهینه نشده است.
- Snow: حداقل سه نمونه منظم ساعتی یا زیرساعتی؛ snowfall به cm/interval و تبدیل داخلی به cm/hour، ground depth به cm، POA به W/m² و دمای محیط به °C. پارامترهای tilt، ارتفاع شیبدار ردیف، شمار strings در امتداد شیب و initial coverage صریح‌اند. ارتفاع ردیف metadata هندسی است و در قانون fraction-based pvlib مستقیماً ضرب نمی‌شود. نام `parallelStringsAlongSlant` به پارامتر `num_strings` تابع dc_loss_nrel نگاشت می‌شود؛ مدل مدار الکتریکی نیست. timestamp نمونه پایان بازه است؛ در نمونه اول لغزش عادی اعمال نمی‌شود. reset عمق پایین، first step و tilt=0 را هم override می‌کند. snowfall event پوشش را ۱ کرده و همان گام لغزش ندارد. فقط variant roof/reference با ضرایب دقیق -80 و 0.197 پذیرفته می‌شود؛ mounting دیگر unsupported است. string حتی جزئی پوشیده، ظرفیتش ازدست‌رفته فرض می‌شود. خروجی DC-capacity loss است، نه افت انرژی سالانه؛ structural load جدا و دست‌نخورده است.
- NASA/PVGIS climatology موجود، سری واقعی کامل موردنیاز این APIها نیست. هیچ بارش/برف/POA ساعتی مصنوعی برای اتصال به سایت ساخته نشده است. داده‌های fixture مصنوعی و فقط input آزمون الگوریتم‌اند، نه داده آب‌وهوا یا تأیید عملکرد سایت.

## منابع واقعاً استفاده‌شده و محدودیت تحقیق

1. کد و اجرای مستقل **pvlib-python 0.13.1**: [soiling.py](https://github.com/pvlib/pvlib-python/blob/v0.13.1/pvlib/soiling.py)، [snow.py](https://github.com/pvlib/pvlib-python/blob/v0.13.1/pvlib/snow.py). مبنای دقیق این پیاده‌سازی نسخه نرم‌افزار pinned است، نه ادعای هم‌ارزی تمام SAM یا تمام variantهای مقاله.
2. [مستندات Kimber همان نسخه](https://pvlib-python.readthedocs.io/en/v0.13.1/_modules/pvlib/soiling.html): Kimber et al., DOI `10.1109/WCPEC.2006.279690`؛ نرخ‌های منطقه‌ای universal نیستند. پارامترها باید از measured/user-configured/assumed تفکیک شوند.
3. [مستندات snow همان نسخه](https://pvlib-python.readthedocs.io/en/v0.13.1/_modules/pvlib/snow.html): Marion 2013 DOI `10.1016/j.solener.2013.07.029`؛ refinement عمق و مدل strings به منابع NREL ارجاع دارند. بازیابی PDF NREL/TP-6A20-68705 موفق نشد؛ متن کامل آن خوانده‌شده ادعا نمی‌شود. تفاوت واحد 1.97 tenths/hour با 0.197 fraction/hour نباید تفاوت فیزیکی یا هم‌ارزی کامل SAM تعبیر شود.
4. [صفحه رسمی IEA PVPS Task 15](https://iea-pvps.org/key-topics/t15-modelling-simulation-bipv-analysis-2026/)، DOI `10.69766/GWEF4173`، سپتامبر ۲۰۲۶: فقط صفحه معرفی مطالعه خوانده شد؛ گزارش کامل و dataset مستقل به دست نیامد. این منبع اعتبارسنجی BIPVT این نرم‌افزار نیست.
5. [صفحه Purdue](https://docs.lib.purdue.edu/ihpbc/25/) و Candanedo DOI `10.1115/1.4003145`: همبستگی و دامنه Re/هندسه از متن اصلی احراز نشده‌اند. بنابراین correlation ابداع یا extrapolate نشده؛ API/solver مرجع BIPVT و آزمون‌های انرژی/همگرایی آن **هنوز ساخته نشده‌اند**، نه اینکه آزمایش موفق داشته باشند.

## شواهد آزمون

- ۲۰ fixture Kimber و ۱۲ fixture Snow؛ هر کدام یک expression را در gate با اجرای مستقل و mutation sensitivity پوشش می‌دهد. expectedهای فیزیکی از اجرای Python pvlib==0.13.1 هستند، نه موتور TypeScript.
- generatorهای قابل تکرار: `scripts/fixtures/physics/generate-{kimber,snow}-0131.py`؛ نیازمند محیط Python با pvlib==0.13.1 و dependencies آن. از ریشه repo اجرا شوند. metadataهای expected قرارداد API هستند و evidence علمی مستقل محسوب نمی‌شوند.
- ۴ مقایسه اضافی hourly/sub-hourly در `reference-timeseries-pvlib-0131.json`؛ tests در `scripts/test-reference-{kimber,snow}.ts` و runner اصلی وارد شده‌اند. تلورانس مقایسه عددی `1e-10` است؛ این تلورانس metric خطای میدانی نیست.
- مرزهای rain threshold/grace/wash/cap، انرژی ناقص/صفر، first/event/no-slide/depth-reset/flat-tilt، scaling زیرساعتی، timestamp/gap/order/calendar، پارامتر نامعتبر و weather ناقص آزموده شدند.
- gate بدون تضعیف workflow/detector اجرا شد: `PHYSICS_DIFF_BASE=1d5351e npm run test:audit` روی فایل‌های staged؛ **۳۲ expression تغییرکرده، هر یک fixture مستقل اجراشده و sensitivity-checked؛ PASS**.
- محلی PASS (exit 0): `npm run lint:types`، `npm run lint:eslint`، `npm run build`، `npm test`، `npm run test:audit`، `npm run test:gateway`، `npm run test:remediation`، `npm run test:smoke`، `npm run test:browser`، `npm run verify:exports` و `git diff --cached --check`. audit شامل source invariants، registry، claims، rate limits و gate/self-tests است. تست مرورگر cold-offline/mock provider است، نه آزمایش دسترسی آب‌وهوای واقعی.
- **MBE/MAE/RMSE، temperature bias، خطای انرژی سالانه و پوشش زمانی داده میدانی گزارش نمی‌شوند**: dataset قابل مقایسه واقعی نداریم. اجرای الگوریتم و fixture parity جای آن‌ها را نمی‌گیرد.

## باقی‌مانده‌های صریح

دریافت متن اصلی correlation و داده مستقل BIPVT؛ ساخت API missing/unsupported و solver forced-air segmented با مرزها و موازنه انرژی و residual؛ آزمون‌های MPP/open circuit/zero-flow/failure/convergence؛ ingestion واقعی time series و integration opt-in در UI/report با sign و جلوگیری از double counting؛ گزارش کیفیت/پوشش زمانی واقعی و metrics فقط پس از دسترسی به داده قابل مقایسه. محدودیت inputs به معنی ضرورت جعل داده یا تغییر fallback نیست.

وضعیت CI برای SHA نهایی پس از push در پاسخ تحویل گزارش می‌شود؛ PASSهای بالا نتیجه محلی هستند، نه ادعای CI آینده. هیچ merge انجام نشده است.
