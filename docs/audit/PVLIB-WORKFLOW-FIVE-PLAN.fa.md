# طرح پیش از کد — پنج مرحله گردش کار مطالعه
2026-11-03؛ شروع پاک روی 39f1d499f5c953eebfb5373e807031183caf1442. موتور فیزیکی1.8.0 بدون تغییر؛ تحلیل مشتق‌شده با نسخه مستقل study-insights-v1.

## منابع خوانده‌شده
- pvlib0.13.1 complete_irradiance: https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.irradiance.complete_irradiance.html رابطه closure GHI=DHI+DNI*cos(zenith). این توسعه فقط diagnostic می‌سازد و هرگز از complete_irradiance برای پرکردن داده استفاده نمی‌کند. midpoint apparent zenith در خروجی فقط تقریب برای میانگین بازه است؛ threshold پروژه‌ای استاندارد QCRad نیست.
- RFC4180 https://www.rfc-editor.org/rfc/rfc4180 قرارداد CRLF، header، double-quote escaping؛ ماهانه و comparison CSV با ستون صریح واحد، مقادیر numeric بدون rounding، unavailable خالی و status مجزا. فقط ستون‌های ثابت/عددی/ماه و SHA صادر می‌شوند تا label کاربر فرمول spreadsheet نشود.
- W3C PROV overview https://www.w3.org/TR/prov-overview/ اهمیت ثبت entity/activity/source برای ارزیابی اعتماد؛ دفتر منبع محلی مشتق‌شده و نه PROV serialization/certification پیاده می‌شود.
- صفحه PVPMC irradiance-and-insolation fetch ناموفق؛ به آن به‌عنوان منبع خوانده‌شده استناد نمی‌شود.

## پنج مرحله و معیار پذیرش
۱. QA هواشناسی در review و request فعال: all-zero، DHI>GHI+20W/m²، تکرار دقیق پنج مقدار هواشناسی در run>=6بازه؛ counts و حداکثر5مثال timestamp، هشدار اطلاعاتی نه reject یا تصحیح. در نتیجه closure صرفاً approximate با threshold max(50W/m²,10%GHI)، فقط zenith<=80°؛ شب zenith>=96° و irradiance>20W/m² جدا. هیچ sun-position جدید در browser ساخته نمی‌شود، pre-run closure unavailable صریح است. thresholdها diagnostic داخلی و نه استاندارد/احراز کیفیت حسگرند. تغییر ورودی output physics ندارد.
۲. پوشش زمانی از ابتدا/end واقعی interval-end و dt، ماه بر midpointUTC دقیقاً همان worker؛ ساعات و fractions ماه/سال تقویمی UTC، completeUtcCalendarYear، دوره ناقص annualize نمی‌شود. داده ورودی از schema معتبر؛ coverage=پوشش همین فایل نه availability سنسور یا نمایندگی اقلیم. بازه‌های بدون gap شرط قبلی‌اند.
۳. comparison عددی same-contract موجود با جهت other−current و baseline<=0 درصد unavailable؛ delta مطلق برای تمام metricهای energy مشترک، net signed مجاز؛ optional ناموجود unavailable نه صفر؛ monthly join اتحاد ماه‌ها و unavailable صریح؛ تفاوت capacity نرمال نمی‌شود. CSV و HTML و UI یک محاسبه مشترک. gate موجود حفظ؛ اختلاف منابع source/quality هم‌چنان weather mismatch است.
۴. monthlyCSV با همه metricهای present، UTC month، coverage hours/fraction، inputSHA/engine و واحد در نام metric؛ loss irradiance Wh/m² با electric Wh جمع نمی‌شود. sample CSV قبلی بدون تغییر. دانلود واقعی و readback آزمون شود.
۵. source ledger شامل weather، equipment provenance، هر schedule/profile با count و source/quality، inherited equipment provenance برای زیرمدل‌ها، inactive retained scalars و فرض thermal/temporal؛ schema، version، SHA و execution در نتیجه. JSON قابل‌دانلود برای request/result و HTML/UI؛ archive field جدیدی ندارد و پس از restore از request/result معتبر بازتولید می‌شود؛ authenticity تأیید نمی‌شود.

مسیر pre-run→actual Python→result→archive/restore→comparison/report؛ آزمون مستقل arithmetic، UTC leap/month boundary/offset، صفر/optional/signed delta، CSV readback و escaping، واقعاً مرورگر دانلود/restore. regression قبلی unchanged؛ lint/build/Python/workflow/API/browser و exact-SHA all6CI؛ selective push فقط همین شاخه و بدون merge.

## پالایش قرارداد پوشش، پیش از تحویل
برای مرز ماه غیرهم‌تراز با گام نمونه‌برداری، پوشش زمانی از اشتراک واقعی بازه زمانی با ماه/سال محاسبه می‌شود (fraction هرگز بیش از۱ نیست). energyMidpointAssignedHours جداگانه قواعد تخصیص انرژی worker را نشان می‌دهد؛ انرژی موجود تسهیم یا تغییر نمی‌شود. آزمون مستقل23:40/00:40 این تمایز را می‌سنجد.
