# تحویل مرحلهٔ ۴۱ — ورود مشاهده‌های مستقل

تاریخ: 2026-11-03؛ مبنا: `9ce257c`؛ موتور: `1.16.0`؛ شاخه: `arena/237e6ea2-solarpv-studio`.

## دامنه و استفاده
در Study Builder پس از بارگذاری آب‌وهوا، بخش «Measured observations» را باز کنید. manifest و CSV را وارد کنید، Preview بزنید، قرارداد را صریحاً تأیید و Add کنید؛ سپس درخواست مطالعه را بازبینی و اجرا کنید. نمونه‌ها: `docs/examples/measurement-manifest.synthetic.json` و `measurement-observations.synthetic.csv`. این فایل‌ها **مصنوعی‌اند، نه دادهٔ عملیاتی**. CSV ساده و بدون نقل‌قول با ستون‌های `timestamp,value,qualityFlag,reason` است؛ comma/newline داخل reason پشتیبانی نمی‌شود.

- manifest اجباری: منشأ/نسخه/کیفیت اعلامی/شناسه حسگر، مختصات مطابق مطالعه، نقطه مدل، واحد، interval و semantics صریح.
- تنها میانگین بازه با timestamp انتهای بازه و Z/offset؛ همان grid و interval آب‌وهوا. بدون استنتاج timezone، جابه‌جایی، interpolation یا resampling.
- توان W/kW: `plant_export` (AC خروجی نهایی پس از مراحل فعال و محدودیت صادرات)، `plant_import` (واردات مدل‌شده، فقط در صورت موجود بودن)، `plant_net_grid` (صادرات منهای واردات موجود)، `array_dc_terminal` (DC ترمینال اینورتر، جمع در حالت بلوک/MPPT). انرژی Wh/kWh و کنتور تجمعی پشتیبانی نمی‌شوند.
- دمای degC: فقط `reference_cell_temperature`، متناظر با `cellTemperatureC` صفحهٔ مرجع؛ نه backsheet و نه میانگین ظرفیت‌وزن‌دار بلوک‌ها. مشاهدهٔ دما به ورودی حرارتی مدل تبدیل نمی‌شود.
- صفر valid باقی می‌ماند؛ missing فقط null با دلیل، excluded عددی با دلیل؛ شکاف و ردیف خارج دوره حفظ می‌شود. نبود خروجی متناظر مدل به صفر تبدیل نمی‌شود. مقادیر excluded در محدودهٔ حفاظتی عددی حفظ می‌شوند، نه اینکه به مقادیر معتبر تبدیل شوند.
- حداکثر ۴ dataset، مجموع ۱۷۵۶۸ ردیف، بازهٔ حداکثر ۳۶۶ روز، هر CSV حداکثر ۲ MiB؛ سقف‌های قبلی درخواست/نتیجه/archive/bundle برقرار است. در سقف قبلی اندازهٔ فایل ممکن است نیاز به کاهش ردیف‌ها باشد.
- JSON داده و receipt خام+SHA256، CSV ردیف‌های جفت‌شده و JSON نمای مشاهده قابل دریافت‌اند؛ گزارش HTML و source ledger داده را نشان می‌دهند. archive/bundle/clone/IndexedDB restore داده‌ها را حفظ می‌کنند. JSON مستقیم بدون receipt مجاز است و نباید CSV-verified تلقی شود. SHA سلامت بایت‌های نگهداری‌شده را می‌سنجد، نه اصالت حسگر/منشأ.

## شواهد آزمون محلی
- ۱۵۸ تست Python: PASS، شامل ۶ تست جدید برای قرارداد/receipt/حدود و عدم تغییر فیزیک حالت عادی، بلوک و MPPT.
- `test:study:workflow`: PASS؛ تست مرحلهٔ ۴۱ شامل اجرای واقعی Python، رد مشترک موارد نامعتبر TS/Python، UTC offset، واحد، missing/excluded/outside/unavailable، CSV ایمن و ledger/report/archive/bundle/clone.
- ماتریس قبلی: ۸۱۹۲ قرارداد، ۴۳۵۲ رد، ۱۶ اجرای عددی واقعی، ۳۸۲۴ صرفاً قراردادی؛ نه پوشش عددی همهٔ ترکیب‌ها.
- `test:study` HTTP/process: PASS؛ احراز هویت، محدودیت اندازه/نرخ/ظرفیت، timeout/abort، نبود runtime و عدم fallback.
- `test:study:browser`: PASS؛ ورود نامعتبر←اصلاح←preview←تأیید←اجرا، خواندن واقعی downloadهای observation JSON/CSV/view و HTML، backup و reload/IndexedDB restore؛ همچنین آزمون تراکنش‌های storage.
- build و TypeScript و lint: PASS؛ lint دارای ۹۵ هشدار موجود، صفر error. یک خطای نوع در تست جدید هنگام اجرای اولیه lint پیدا و رفع شد؛ lint مجدد PASS. هشدار chunk بزرگ build باقی است.
- `npm test` و `test:audit`: PASS؛ benchmarkها و گیت‌های source/physics/reference بدون تغییر فرمول‌ها.

CI دقیق SHA پس از commit روی همین شاخه بررسی می‌شود؛ نتیجهٔ CI را از run مربوط به همان SHA بخوانید، نه run نسخهٔ قبلی.

## محدودیت و مرحلهٔ بعد
این مرحله ورود/حفظ مشاهده و جفت‌سازی دقیق UTC است. MBE/MAE/RMSE، درصد هم‌پوشانی و تحلیل residual برای مرحلهٔ ۴۲ باقی است. این تست‌ها تأیید نرم‌افزار با دادهٔ مصنوعی‌اند؛ field validation، کالیبراسیون، تأیید حسگر، bankable yield یا اعتبار سالانه محسوب نمی‌شوند. هیچ merge یا تغییر main انجام نمی‌شود.

مرجع بررسی‌شده پیش از کد: https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.iotools.read_pvgis_hourly.html — نگاشت نام متغیر و metadata به‌تنهایی منشأ measured یا سازگاری boundary/interval را ثابت نمی‌کند؛ provider autodetection اضافه نشده است.

### اصلاح قابلیت حمل تست پس از CI اولیه
CI نسخهٔ `fcf23b7` در پنج job موفق و در direct-study ویندوز ناموفق بود. دریافت log به‌علت EOF شبکه ممکن نشد؛ بررسی تست و بازتولید محلی با fixture دارای CRLF همان خطای parser در خط ساخت نمونهٔ CRLF را نشان داد: `replaceAll(LF, CRLF)` روی CRLF به CRCRLF تبدیل می‌کرد. ساخت variant تست به تبدیل idempotent با `/\r?\n/g` اصلاح شد؛ **بایت‌های receipt ورودی، SHA، parser و قیود داده تغییر نکردند**. تست کامل جدید با fixture LF و CRLF جداگانه دوباره PASS شد. CI باید برای commit اصلاحی نیز کامل بررسی شود؛ موفقیت Linux نسخهٔ اولیه جایگزین CI دقیق نسخهٔ اصلاح‌شده نیست.
