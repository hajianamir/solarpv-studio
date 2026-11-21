# بازبینی و تکمیل مراحل۳۰ تا۴۰
2026-11-03؛ موتور **1.15.0**؛ قرارداد بیرونی `pvlib-study-v1` حفظ شده است. این سند وضعیت جاری است؛ گزارش‌های مراحل قبلی و inventory-v1 snapshot تاریخی‌اند.

## جدول مرحله‌به‌مرحله
| مرحله | نتیجهٔ بازبینی و تکمیل | شاهد اجرایی |
|---|---|---|
|۳۰|کتابخانه، bundle، clone، atomic storage و دو حالت حرارتی موجود حفظ شدند؛ نگهداری raw weather receipt نیز تا آرشیو/clone تکمیل شد.|test-study-balanced.ts، test-study-storage-browser.ts و مرورگر واقعی|
|۳۱|inventory جاری نسخه۲،۱۸حوزهٔ فیزیکی با callsite، دامنه، محدودیت، نوع شاهد و tolerance؛ وضعیت غیرعددی weather/matrix/library جداست.|test_model_gap_audit.py واقعاً همهٔ شاهدهای نام‌دار را اجرا می‌کند.|
|۳۲|ماتریس کامل قراردادِ شبکهٔ گسستهٔ۸۱۹۲حالت، با قواعد انتظار مستقل و تطبیق TS/Python؛ artifact وضعیت تک‌تک حالت‌ها تولید می‌شود.|test_review_combinations.py و test-study-contract-matrix.ts|
|۳۳|مراجع نسخه۲: شش نقطهٔ حرارتی/اینورتر قبلی، سه ground diffuse، دو نقطهٔ signed کابلAC، انتگرال دقیقه‌ای/ماهUTC، شناسهٔ پارامترهای مرجع و۱۸شاهد معادله‌ای نسخه‌شده با آزمون‌های حساسیت.|test_versioned_numerics.py + registry اجرایی؛ ModelChain همان کتابخانه جدا می‌ماند.|
|۳۴|adapter صریح declared-interval-weather-v1 با تبدیل واحد، preview/confirm، receipt و فایل خام، کنترل TS/Python و restore واقعی تکمیل شد.|۳۲ترکیب واحد، corruption/rehash، اجرای واقعی و مرورگر|
|۳۵|حل مدار کابلDC و MPPT قبلی حفظ شد؛ تست‌های IVمستقل، حساسیت، صفرمقاومت، Sandia و منابع دوباره اجرا شدند.|test_dc_cable.py و test-study-dc-cable.ts|
|۳۶|ورودی‌هایMPPTمستقل و مجموعDC→یک اینورتر حفظ شد؛ پیکربندی، محاسبه و restore دوباره تست شد.|test_multi_mppt.py و workflow/browser|
|۳۷|تجمیع signed و clipping مستقل حفظ شد؛ رد اشتباه نتیجهٔ معتبر شب در guardTS رفع شد.|رگرسیون جدید all-night blocks با/بدون کابلAC|
|۳۸|کابلAC سه‌فاز متعادل LV، signed و دارای قیود صریح، فرم/گزارش/ledger/guard و تست تکمیل شد.|test_ac_cable.py؛ bisection مستقل، نقاط ثابت و حساسیت|
|۳۹|مصرف کمکی بازه‌ای در زنجیرهٔ کابل/ترانس/سقف نیز فقط یک‌بار اعمال می‌شود؛ رگرسیون و مرورگر موفق.|test_auxiliary_schedule.py و workflow/browser|
|۴۰|سقف صادرات ثابت/بازه‌ای پس از زنجیرهٔ کامل و بدون محدودکردن واردات حفظ شد؛ guard، انرژی و restore دوباره بررسی شد.|test_export_limit_schedule.py و workflow/browser|

«تکمیل مهندسی» در این جدول به دامنهٔ تعریف‌شدهٔ همین مراحل اشاره دارد، نه حذف تمام محدودیت‌های فیزیکی مدل‌ها، تأیید دادهٔ میدانی یا اثبات بی‌خطایی کل نرم‌افزار. مراحل۴۱/۴۲ داخل این درخواست نیستند.

## دو ایراد واقعی بازبینی
**R30-40/01:** Python نتیجهٔ شبِ چنداینورتر را با ورودی signed منفی تولید می‌کرد، ولی guardTS چون root خودش Sandia نبود، شرط input>=0 را به‌اشتباه روی آن اعمال می‌کرد. اکنون بلوک‌ها از این فرض جدا و همچنان با childResults کامل تطبیق داده می‌شوند؛ تست با/بدونACcable واردات و net-grid صحیح را می‌سنجد.

**R30-40/02:** در PVWatts پایه و فاقدACplant، افزودن `summary.gridImportWh=12345` و `netGridWh=-12345` پذیرفته می‌شد. اکنون شواهد واردات/plant، مصرف داخلی اینورتر و کابلAC در صورت غیرفعال‌بودن مدل متناظر، در نمونه/ماه/کل رد می‌شوند؛ archive نیز همان guard را دارد. رگرسیون‌های مراحل۳۰–۴۰ و guardانرژی بازبینی قبلی حفظ شدند.

## مرحله۳۴: ورود دادهٔ اعلام‌شده، نه تشخیص خودکار provider
در Study Builder بخش **Declared interval weather adapter** را باز کنید. manifestJSON و CSVساده را بچسبانید. header دقیق:

```csv
timestamp,ghi,dni,dhi,tempAir,windSpeed
```

برای راهنمای قرارداد، `docs/examples/declared-weather-manifest.synthetic.json` و `declared-weather.synthetic.csv` از fixtureمصنوعی قبلی ساخته شده‌اند؛ دادهٔ عملیاتی یا توصیهٔ سایت نیستند.

manifest باید source،quality،sourceVersion،reference،siteکامل، intervalMinutes، windHeightM=10، timestampConvention=interval_end و variableSemantics=interval_mean را صریح داشته باشد. units برای هر سه تابش جداگانه W/m2یاkW/m2، دماdegCیاK و بادm/sیاkm/h است. تبدیل‌ها فقط ×۱۰۰۰، −۲۷۳٫۱۵ و ÷۳٫۶ مطابق واحد اعلامی‌اند؛ resampling، shift، حدسtimezone، تبدیل ارتفاعباد یا fill انجام نمی‌شود. site باید با مختصات فعال و ارتفاع/timezone فرم دقیقاً برابر باشد. زمان‌ها offsetصریح، ترتیب منظم و تقویم معتبر می‌خواهند.

Preview هیچ ورودی مطالعه‌ای را اعمال نمی‌کند. پس از مشاهدهٔ نمونه‌ها و receipt، تأیید مفروضات را بزنید و Use converted weather را انتخاب کنید؛ سپس قرارداد هواشناسی و Applyفرم مطالعه نیز باید تأیید شوند. تغییر ورودی preview را باطل می‌کند. سرویس مستقیم هرگز به screening fallback نمی‌کند.

`weather.importTrace` شامل rawCsv،rawManifest،canonicalWeatherJson و SHA256 هر سه است. کنترل TS وPython هم hash و هم تبدیل واقعی/تطابق canonical را می‌سنجد؛ صرف rehashکردن manifest با واحد نادرست نمی‌تواند دادهٔ تبدیل‌نشده را معتبر کند. SHA256 برای integrity/trace است، نه احراز اصالت منبع. sourceWeather compacthash دارد و sourceledger منبع اصلی اعلام‌شده را جدا نشان می‌دهد. receipt مستقل دانلودشدنی و درخواست/آرشیو/bundle/clone نتیجه نیز آن را حفظ می‌کنند. مقایسهٔ مطالعات هنوز provenance/ورودی‌ها را سخت‌گیرانه تطبیق می‌دهد؛ receiptمتفاوت خودکار نادیده گرفته نمی‌شود.

حد rawCSV برابر۲MiB، manifest برابر۶۴۰۰۰بایت و canonicalWeatherJson برابر۴MiB است؛ سقف کل request۸MiB، output۱۶MiB، snapshot۲۴MiB وbundle۶۴MiB همچنان برقرارند. بزرگ‌بودن package یا تعداد childResults می‌تواند زودتر از سقف ردیف، حد اندازه را فعال کند؛ truncation یا حذف خاموش trace نداریم. برای ویرایش مستقیم دادهٔ canonical، Detach import trace باید صریح انتخاب شود؛ واردکردن CSVcanonical تازه نیز traceقبلی را جایگزین می‌کند.

این adapter **rawNSRDB/PVGIS importer نیست**. مستندات read_psm3 نشان می‌دهد فایلprovider metadata/units دارد؛ از نام ستون نمی‌توان interval-mean یا ارتفاع باد را نتیجه گرفت. کاربر باید معنای داده را از منبع معتبر اعلام کند. فایل عملیاتی پروژه ارائه نشده و ساخته نشده است.

## مرحله۳۸: کابلAC با تراز signed
در Study Builder، **AC cable → Balanced three phase LV** را فعال کنید. source/quality، مقاومت هر فازRبهΩ، ولتاژ خط‌به‌خط دریافتVll و حد جریان خط بهA صریح لازم‌اند. JSON:

`system.acCable = {source,quality,topology:"balanced_three_phase_lv",resistancePerPhaseOhm,receivingLineVoltageV,maxCurrentA}`

دامنه: Rاز۰تا۱۰۰Ω؛ Vllاز۱تا۱۰۰۰۰۰V؛ جریان مجازاز۰٫۰۱تا1e7A. این‌ها حد محاسباتی‌اند، نه مجازبودن طراحی. پارامترها از ظرفیتPV یا جنس کابل حدس زده نمی‌شوند. فقط root چنداینورتر؛ childACcable رد می‌شود. حداکثر۸۷۸۴بازهACplant و بودجه‌های قبلیMPPT/blocks حفظ شده‌اند.

ترتیب: جمع signed اینورترها → availabilityروی تولیدمثبت → auxiliary → **کابلLV** → transformer → exportcap. برای مدار سه‌فاز متعادلِ unityPF و ولتاژ ثابت دریافت:

`I = |Pout| / (sqrt(3) Vll)`

`Ploss = 3 R I² = R Pout² / Vll²`

`Pin = Pout + Ploss`

حل ریشهٔ monotonic با فرم عددی پایدار انجام می‌شود؛ discriminantنامعتبر، خروج ازشاخهٔmonotonic یا overcurrent رد می‌شود، نه clip. وارداتsigned نیز تلفات مثبت دارد و از شبکه انرژی بیشتری می‌خواهد. نمونهٔ تحلیلی مصنوعی: R=.4Ω وVll=400V؛ برایPout=10000W، افت۲۵۰WوPin=10250W؛ برایPout=-10000W، Pin=-9750W.

خروجی‌های `acCableInputW`،`acCableOutputW`،`acCableCurrentA`،`acCableLossW` و انرژی `acCableLossWh` در نمونه/ماه/کل، CSV/JSON، UI، report وexplorer حفظ می‌شوند. افت قبلاً درnetGridWh لحاظ شده و نباید دوباره کم شود. guardTS مقدارجریان، I²R، دامنه و تراز را مستقل از فرمول ریشه کنترل می‌کند. تستPython از bisectionمستقل، نقطهٔ ثابت و تغییرR/V استفاده می‌کند.

این مدل reactive/loadflow، افت/تنظیم واقعی ولتاژ، دمای کابل/ampacity، هارمونیک، نامتعادلی، اتصالکوتاه یا حفاظت نیست. exportcap همچنان downstreamوaccountingاست؛ پسازcurtailment، کابل/ترانس/DC دوباره حل نمی‌شوند. به‌همین‌دلیل نتیجهٔسقف، مدل کنترل واقعی تجهیزات نیست.

## شواهد مراحل۳۱–۳۳ و حدود تفسیر
- `study-model-gap-audit-v1.json` وSTATUSقدیمی فقط snapshotشروع‌اند. `study-model-gap-audit-v2.json` وضعیت جاری۱۸حوزه را باcallsite و شاهد نام‌دار می‌دهد؛ تستregistry آن‌ها را واقعاً اجرا می‌کند، نه فقط وجود متن را چک کند.
- `study-independent-numerics-v2.json` اعداد تحلیلی ثابت، منبع/دامنه، tolerance، فهرست۱۸شاهد مستقل و شناسهٔ فایل پارامترها را ثبت می‌کند. hashپارامترها صرفاً نسخه/هویت fixtureاست؛ خودِ hash شاهد صحت فیزیکی نیست. حساسیت پارامترها و معادلات در تست‌های نام‌دار اجرا می‌شوند؛ ModelChain مقایسهٔ همان کتابخانه جداست.
- ماتریس۸۱۹۲حالت از geometry۴×sky۲×IAM۲×spectral۲×thermal۴×DC۲×AC۲×plant۲×horizon۲×environment۲×exportcap۲ ساخته می‌شود. قواعد انتظار از validators استخراج نشده‌اند. هر حالت در هر دو زبان بررسی می‌شود:۴۳۵۲رد و۳۸۴۰مجاز.۱۶اجرای واقعی تمام زوج‌های قابل‌جمع گزینه‌های همین شبکه را پوشش می‌دهد؛۳۸۲۴مجاز دیگر صریحاً `not_numerically_executed` هستند. این اثبات دامنهٔ پیوسته، تمام ترکیب‌های عددی یا میدان نیست.
- جزئیات تک‌تک caseها در `.cache/study-evidence/contract-matrix-v2.json` تولید و درCI برایهرOS به‌صورتartifact با نگهداری۱۴روز ذخیره می‌شود؛ دادهٔ تولیدی بزرگ واردGit نمی‌شود.

## منابع
قبل از پیاده‌سازی مسیرهای تازه، مرجع pinnedترانس وورودیprovider دوباره خوانده شد؛ ground diffuse نیز برای مرجع عددی نسخه۲ مرور شد:
- https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.transformer.simple_efficiency.html
- https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.iotools.read_psm3.html
- https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.irradiance.get_ground_diffuse.html

هیچ دادهٔعملیاتی مفقود، صفرپر یا اختراع نشده؛ هیچ ادعای calibration،fieldvalidation،bankability،ایمنی یاصحت سالانه مطرح نیست. باقی‌ماندن این محدودیت‌هایذاتی به‌معنی وجود قابلیت مهندسیِ مخفی و تکمیل‌نشده در مراحل۳۰–۴۰ نیست؛ این‌ها مرز صریح دامنه‌اند.
