# ۳۰ گام ترکیبی: کتابخانهٔ مطالعه و دو ورودی حرارتی

موتور **1.9.0**؛ قالب ورودی و archive قبلی حفظ شده است. این تحویل **۳۰ گام پذیرش** دارد، نه۳۰مدل فیزیکی:۲۰گام محصول/انتقال داده و۱۰گام قرارداد، اجرا، اتصال و شواهد دو حالت حرارتی. تحلیل‌های `study-insights-v1` و `study-explorer-v1` برقرارند؛ screening/اقتصاد پروژه بازنویسی نمی‌شود.

## وضعیت گام‌های ۱ تا ۲۰: مدیریت و انتقال مطالعه

|گام|خروجی تکمیل‌شده|
|---|---|
|۱|جستجوی نام مطالعه در کتابخانه|
|۲|فیلتر نسخه‌های فقط ورودی / دارای نتیجه|
|۳|فیلتر سایت فعال براساس latitude/longitude دقیق|
|۴|مرتب‌سازی جدیدترین، قدیمی‌ترین و نام|
|۵|صفحه‌بندی۱۰تایی با شمارش و کنترل مرز صفحه|
|۶|کپی فقط ورودی‌ها با نام صریح و UUID تازه؛ نتیجهٔ قبلی منتقل نمی‌شود|
|۷|دانلود archive هر نسخه، مستقل از نتیجهٔ فعال|
|۸|دانلود request JSON هر نسخه|
|۹|دانلود weather CSV هر نسخه، با همان صفرها، مقادیر و offsetهای ورودی|
|۱۰|انتخاب چند نسخه و لغو انتخاب؛ حداکثر۲۰انتخاب|
|۱۱|حذف گروهی در یک transaction با تأیید کاربر و rollback کامل در خطا|
|۱۲|پشتیبان گروهی نسخه‌های انتخاب‌شده|
|۱۳|SHA256 یکپارچگی payload پشتیبان با قرارداد صریح sorted-key JSON|
|۱۴|بررسی پیش از ورود و نمایش نام/شناسه/نتیجه/تعارض، بدون نوشتن|
|۱۵|ورود اتمی add-only؛ تعارض با شناسهٔ موجود باعث رد کل ورود می‌شود|
|۱۶|رد شناسهٔ تکراری در خود پشتیبان|
|۱۷|حدود۲۰نسخه،۶۴MiB گروه،۲۴MiB هر archive و۸MiB هر request؛ بدون truncation|
|۱۸|برآورد اختیاری فضای کل origin مرورگر؛ نبود اطلاعات صریح است|
|۱۹|تازه‌سازی بین تب‌های همان origin با notification، بدون انتقال محتوای مطالعه|
|۲۰|دانلود request و weather ورودی فعلی، حتی پیش از اجرا|

### کار با کتابخانه
نام موردنظر را در Search وارد کنید؛ status و active site فقط فهرست را فیلتر می‌کنند و چیزی از پایگاه حذف نمی‌کنند. جستجو نسبت به بزرگی حروف حساس نیست. انتخاب‌ها بین صفحه‌ها باقی می‌مانند و تعداد **کل انتخاب‌ها** دیده می‌شود، نه فقط صفحهٔ جاری. انتخاب نسخه‌ای که در تب دیگر حذف شده، پس از refresh از انتخاب‌ها کنار می‌رود. برای لغو همه از Clear selection استفاده کنید.

برای clone، ابتدا «Clone label» را صریح پر کنید و دکمهٔ کپی فقط ورودی‌های همان سطر را بزنید. نسخهٔ منبع، label و نتیجهٔ آن دست‌نخورده می‌مانند؛ clone فقط request دارد و باید واقعاً اجرا شود تا نتیجه بگیرد. نتیجه و inputSHA قدیمی با نام تازه به‌عنوان نتیجهٔ تازه معرفی نمی‌شود. نیازی به فعال‌کردن سایت نسخه برای خروجی‌گرفتن یا clone نیست؛ **restore همچنان سایت مطابق را لازم دارد**.

### پشتیبان گروهی و ورود اتمی
۱. یک تا۲۰نسخه انتخاب کنید و backup بگیرید. فایل `study-library-bundle-v1` شامل snapshots اصلی و `checksumSha256` است.
۲. فایل را در Import study library bundle وارد کنید. در این مرحله فقط اندازه، checksum و قرارداد تمام نسخه‌ها بررسی و preview نمایش داده می‌شود؛ هیچ نسخه‌ای ذخیره نشده است.
۳. در صورت تعارض ID، تأیید غیرفعال است. فایل یا نسخه‌های موجود را بازنویسی نمی‌کنیم و ID را خودکار عوض نمی‌کنیم. برای نسخهٔ مستقل از clone استفاده کنید؛ حذف نسخهٔ موجود تصمیم جداگانه و صریح کاربر است.
۴. تأیید، همهٔ `add`ها را در یک transaction اجرا می‌کند. اگر بعد از preview، تب دیگر ID را ساخته باشد یا خطای quota/storage رخ دهد، کل عملیات rollback می‌شود. موفقیت فقط پس از `transaction.oncomplete` اعلام می‌شود، نه موفقیت یک request.
۵. Cancel بررسی را کنار می‌گذارد؛ حذف گروهی نیز transaction مستقل و تأیید صریح دارد.

بررسی اولیه نه تضمین ظرفیت دیسک است و نه تضمین نبود race در لحظهٔ تأیید. کد هنگام نوشتن دوباره از قید یکتایی IndexedDB استفاده می‌کند. آزمون واقعی مرورگر، تعارض در افزودن دوم، خطای quota تزریق‌شده در افزودن دوم و خطای حذف دوم را با حفظ تمام داده‌های قبلی بررسی کرده است.

### معنی checksum و حدود اعتماد
Checksum برابر SHA256 بایت‌های UTF-8 قرارداد محلی canonical JSON روی `{schemaVersion,snapshots}` است: کلیدهای object به ترتیب code-unit مرتب، ترتیب array محفوظ، مقادیر JSON معمولی. **این RFC8785، PROV، HMAC، امضای دیجیتال یا گواه اصالت نیست.** دارندهٔ فایل می‌تواند داده و checksum هر دو را عوض کند؛ checksum صرفاً ناسازگاری/تغییر بدون به‌روزرسانی hash را آشکار می‌کند. source/quality و metadata اجرا همچنان ادعاهای داخل فایل‌اند.

ساخت/بررسی bundle به Web Crypto در secure context نیاز دارد؛ در نبود آن خطای صریح می‌دهیم و bundle بررسی‌نشده وارد نمی‌شود. دانلود archive تکی قبلی باقی است. payload محدود است چون digest streaming نیست. request export قالب‌بندی‌شده اگر از۸MiB عبور کند خطا می‌دهد، نه اینکه داده را حذف کند.

ذخیره فقط در همین مرورگر/origin است، مشترک میان کاربران پروفایل مرورگر، بدون جداسازی حساب و بدون upload ابری. برآورد storage کل origin (شامل سایر داده‌های برنامه) است و ظرفیت رزروشده یا ضمانت موفقیت import نیست. BroadcastChannel فقط نوع تغییر و یک nonce موقت فرستنده را می‌فرستد؛ محتوا/شناسهٔ مطالعه/credential منتقل نمی‌شود. نبود پشتیبانی از notification با Refresh دستی پوشش داده می‌شود؛ claim همگام‌سازی ابری یا merge هم‌زمان نداریم.

## گام‌های ۲۱ تا ۲۵: دمای PVsyst با ضرایب صریح

۲۱. قرارداد سخت TS/Python و منبع مستقل؛ ۲۲. اجرای واقعی pvlib و دامنهٔ خروجی؛ ۲۳. فرم/review/restore؛ ۲۴. نتیجه، CSV/JSON، گزارش، دفتر منابع و مانع مقایسه؛ ۲۵. شواهد مستقل و حساسیت عددی تکمیل شده‌اند.

شیء اختیاری:

```text
system.pvsystTemperature = {
  source, quality,
  uc: 0.1..200,
  uv: 0..100,
  moduleEfficiency: 0..0.5,
  alphaAbsorption: 0.01..1,
  windHeightM: 10
}
```

تمام ضرایب باید صریح داده شوند؛ فرم آن‌ها را از preset یا آب‌وهوا حدس نمی‌زند. `quality` همان measured/weather_provider/user_configured/assumed اعلام‌شدهٔ کاربر است. واحد Uc برابر W/m²/K و Uv برابر W/m²/K به‌ازایm/s است؛ efficiency و absorptance کسرند، نه درصد.

مدل pvlib0.13.1:

`Tc = Ta + alphaAbsorption * thermalPOA * (1−moduleEfficiency) / (uc + uv*wind10m)`

**ضرایب باید برای همان باد۱۰متر ورودی fitted/مناسب باشند.** ضرایب PVsyst متداول در ارتفاع دیگر را بی‌دلیل به این ابزار ندهید؛ تبدیل ارتفاع یا fit خودکار نداریم. `moduleEfficiency` یک پارامتر ثابتِ حرارتی است و از DC واقعی محاسبه یا به توان DC دوباره ضرب نمی‌شود. دمای حاصل از همین رابطه بر DC موجود اثر می‌گذارد.

thermalPOA در صفحهٔ منفرد همان POA global است. در row mode، سیاست موجود `front_only` یا `front_plus_rear` همچنان صریح است؛ این فقط proxy حرارتی قبلی است، نه تأیید انتقال حرارت دوطرفه. soiling/spectral طبق قرارداد قبلی روی تابش مؤثر اپتیکی اثر می‌گذارند و خودشان thermalPOA را کم نمی‌کنند. افق/آلبدو ممکن است POA incident را تغییر دهند.

خروجی دما باید finite و در[-100,150]°C باشد؛ ترکیب ضرایب غیرواقعی که دمای بسیار بالا بسازد رد می‌شود، نه clamp یا extrapolate. محدودیت‌های DC، ولتاژ و دامنهٔ مدل‌های دیگر نیز برقرارند. SAPM a/b/deltaT برای سازگاری ورودی حفظ ولی در این حالت غیرفعال‌اند.

این یک مدل steady-state تجربی دمای سلول است؛ نه حل transient، heat capacity، هم‌ارزی کل نرم‌افزار PVsyst، مدل thermal protection، کالیبراسیون یا اعتبارسنجی حرارتی مستقل bifacial.

## گام‌های ۲۶ تا ۳۰: برنامهٔ صریح دمای سلول

۲۶. قرارداد کامل schedule/CSV/UTC؛ ۲۷. اعمال مستقیم در worker؛ ۲۸. فرم/review/restore؛ ۲۹. result/archive/report/compare/diagnostics/capabilities؛ ۳۰. شواهد مستقل و اجرای کامل API/browser/resource تکمیل شده‌اند.

```text
system.cellTemperatureSchedule = {
  source, quality,
  records: [{ timestamp, cellTemperatureC }]
}
```

CSV سادهٔ بدون quote با header دقیق:

```csv
timestamp,cellTemperatureC
2026-01-01T01:00:00Z,20
2026-01-01T02:00:00Z,21
```

این اعداد فقط **قالب نمونه** هستند، نه دادهٔ سایت یا اندازه‌گیری. بازهٔ cellTemperatureC برابر[-100,150]°C است؛ صفر و مقدار منفی معتبرند و با missing اشتباه نمی‌شوند. تمام timestampها باید پایان همان بازهٔ میانگین weather و دقیقاً هم‌تراز UTC باشند؛ Z/offset معادل پذیرفته است. حداقل۲ و حداکثر۸۷۸۴رکورد، بدون gap/ردیف اضافی/تکراری/نامرتب؛ یک newline نهایی مجاز، blank row اضافی نامعتبر است. هیچ fill/interpolation یا تولید سری دما انجام نمی‌شود.

منظور **دمای سلولِ میانگین همان بازه** است، نه دمای ماژول/backsheet یا نمونهٔ instantaneous. تبدیل module-to-cell، offset حسگر، resampling، lag یا تصحیح bias در این نسخه وجود ندارد. source و quality کاربر، حتی measured، تأیید مستقل حسگر نیستند.

در این حالت دما مستقیماً از برنامه گرفته می‌شود و مدل حرارتی اجرا نمی‌شود؛ SAPM و thermalPOA proxy برای دما غیرفعال‌اند. بااین‌حال محاسبات اپتیک و irradiance ورودی DC برقرارند. تغییر دمای هوای weather هنوز می‌تواند از مسیر **refraction موقعیت خورشید** بر تابش/توان اثر جزئی بگذارد؛ جایگزینی دمای سلول به‌معنای غیرفعال‌شدن تمام کاربردهای air temperature نیست. باد یا ضرایب SAPM، دمای صریح را عوض نمی‌کنند. coupling بازخورد دمای اندازه‌گیری‌شده به جذب یا اندازه‌گیری توان ایجاد نمی‌شود.

این گزینه، Faiman و PVsyst **دو‌به‌دو ناسازگارند**؛ اگر بیش از یکی در JSON باشد، TS و worker صریحاً رد می‌کنند و هیچ precedence/fallback پنهانی نداریم. انتخاب SAPM/Faiman در فرم، opt-inهای حرارتی دیگر را از request جدید حذف می‌کند ولی مقادیر فرم هنگام رفت‌وبرگشت قابل مشاهده می‌مانند.

## گردش کار و سازگاری
- هر دو حالت با منبع مستقل در source ledger، مدل/محدودیت در manifest و قابلیت‌های API موتور1.9.0 معرفی شده‌اند؛ maxThermalRecords=8784.
- دمای اعمال‌شده در sample CSV/JSON، explorer و آمار دمای قبلی می‌آید؛ اصل schedule/ضرایب در request/archive باقی است.
- گزارش مدل حرارتی و منبع را نشان می‌دهد؛ archive/result guard، دمای صریح را با schedule و دمای PVsyst را با رابطه/thermalPOA اعلام‌شده می‌سنجد. این arithmetic guard گواه میدانی نیست.
- دو مدل دمای متفاوت با دروازهٔ مقایسهٔ قبلی سازگار تلقی نمی‌شوند. دو سناریوی هم‌مدل فقط در صورت سازگاری سایر قراردادها قابل مقایسه‌اند؛ تفاوت energy به‌تنهایی اندازه‌گیری gain حرارتی واقعی نیست.
- بدون فعال‌کردن دو گزینهٔ جدید، samples/summary/monthly در۱۰حالت baseline در برابر موتور1.8.0 **دقیقاً برابر** آزموده شد. نسخه و hash worker طبیعتاً تغییر می‌کند؛ آرشیو قدیمی معتبر را می‌توان restore کرد، اما مقایسهٔ خودکار میان worker/version متفاوت همچنان رد می‌شود.

## شواهد عملی و حدود اعتبار
- **۱۰۱ آزمون Python**، شامل۱۰آزمون حرارتی جدید: معادلهٔ مستقل و حساسیت U/wind/eta/absorption، مثال منتشرشده، صفرPOA/دمای محیط، SAPM غیرفعال، row thermal proxy/full chain، دمای صریح با DC تحلیلی و POA ثابت، UTC offsets، missing/domain/exclusivity/hot-output و۸۷۸۴رکورد زیر۱۶MiB.
- workflow جدید: فیلتر/clone/exports، checksum در برابر Node SHA256 مستقل، tamper/duplicate/limits۲۴و۶۴MiB، TS/CSV، Python واقعی هر دو حالت، archive/report و رد نتیجهٔ دست‌کاری‌شده.
- مرورگر واقعی برنامه: فرم هر دو حالت، actual Python، restore و report، ورودی request/weather،۱۲نسخهٔ test-only برای pagination/site/status/search/sort، clone بدون نتیجه، خروجی سطر، checksum/preflight/conflict، انتخاب و حذف گروهی، storage estimate.
- مرورگر واقعی storage: rollback تعارض، خطای second-add و second-delete، دوام پس از reload و cross-tab notification؛ از همان ماژول تولیدی استفاده می‌کند، نه mock IndexedDB.
- تمام داده‌های ساختگی در تست با برچسب SYNTHETIC هستند و در فرم پروژه خودکار پر نمی‌شوند. fixture سالانه فقط قرارداد منابع را می‌سنجد، نه yield سالانه.
- هیچ field validation، calibration، bankability، ارزیابی استاندارد/حفاظت، مدل برف/سازه یا هم‌ارزی کامل SAM/PVsyst ادعا نمی‌شود. Docker آزموده نشده است.

## منابع خوانده‌شده پیش از کد
- pvlib0.13.1 PVsyst cell temperature: https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.temperature.pvsyst_cell.html
- MDN IDBTransaction.abort، rollback: https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/abort
- MDN SubtleCrypto.digest، secure context/nonstreaming/digest نه signature: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
- قراردادهای موجود UTC، source، row thermal، MPPT و archive در راهنماهای پیشین حفظ شده‌اند.
