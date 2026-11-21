# مرحله۴۰ — سقف صادرات زمان‌متغیر
2026-11-03؛ موتور **1.14.0**؛ قرارداد بیرونی `pvlib-study-v1` حفظ شده است.

## ورود و قرارداد
در Study Builder، **AC export cap → Interval schedule** را انتخاب کنید، منبع/کیفیت را صریح وارد و CSV کامل بدهید. مثال صرفاً مصنوعی قرارداد:

```csv
timestamp,limitW
2024-01-01T01:00:00Z,0
2024-01-01T02:00:00Z,500
```

زمان‌ها را با دادهٔ واقعی درخواست خود جایگزین کنید؛ این مثال دادهٔ عملیاتی نیست. سقف به وات و غیرمنفی است و برای کل همان بازه ثابت فرض می‌شود. timestamp پایان بازهٔ weather است؛ این ورودی انرژیWh، درصد یا فرمان کنترل لحظه‌ای نیست.

JSON: `system.acExportLimitSchedule = {source,quality,records:[{timestamp,limitW},…]}`.

- limitW عدد finite از۰تا1e9؛۲تا۸۷۸۴ردیف؛ source غیرخالی؛ quality یکی از measured/weather_provider/user_configured/assumed. provenance اعلام کاربر است، نه احراز اصالت.
- تعداد، ترتیب و لحظهٔUTC تمام ردیف‌ها دقیقاً برابر weather؛ timestampباZیاoffsetصریح. نمایش offsetمعادل پذیرفته می‌شود؛ gap/duplicate/reorder/بدونoffset رد می‌شوند.
- CSV ساده بدون quoting، header دقیق، هر رکورد یک خط؛ BOM/CRLF مجاز. هیچ مقدار خالی صفر فرض نمی‌شود و هیچ forwardfill/interpolation/تکرارروزانه ساخته نمی‌شود.
- ثابت `acExportLimitW` همچنان پشتیبانی می‌شود؛ ثابت و schedule همزمان، حتی ثابت صفر، رد می‌شوند. UI فقط حالت انتخاب‌شده را صادر می‌کند.
- در چنداینورتر، سقف فقط درroot و پس از جمع signed وplant مشترک یک‌بار اعمال می‌شود؛ child schedule رد است. بودجه‌های قبلیMPPT/blocks، زمان‌اجرا، درخواست و خروجی16MiB افزایش نیافته‌اند.

## مدل و تراز
برای هر بازه:

`export = min(max(signed_power_after_plant, 0), interval_limit_W)`

`export_cap_loss = positive_export_before_cap − export`

واردات از توان منفی پس ازplant به‌دست می‌آید و سقف روی آن اعمال نمی‌شود. سقف صفر یعنی ممنوعیت صادرات، نه صفرکردن مصرف کمکی یا مصرف داخلی اینورتر/ترانس. در شب وavailabilityصفر، مصرف‌های اعلام‌شده باقی می‌مانند. `netGridWh = acWh − gridImportWh` درحالتplant است؛ مصرف داخلی اینورتر دوباره از آن کسر نشود.

این یک **مدل حسابداری سقف روی میانگین بازه** است. min روی میانگین توان، الزام سقف لحظه‌ای درون بازه یا رفتار واقعی کنترل‌کننده را اثبات نمی‌کند. پس از اعمال سقف، نقطهDC/MPPT، منحنیاینورتر و transformer دوباره حل نمی‌شوند؛ بنابراین افت ترانس همان سناریوی پیش ازcurtailment است، نه محاسبهٔ تلفات واقعی کنترل‌شده پس ازکاهش توان. باتری،dispatch،gridvoltage/reactive/protection، پاسخگذرا وcurtailmentبرDC مدل نشده‌اند. clippingاینورتر قبلاً مستقل رخ داده و باexport-cap loss یکی نیست؛ افت‌ها دوباره بهwaterfall قدیمی افزوده نمی‌شوند. این تغییر مرحله۳۸،۴۱ یا۴۲ را پیاده‌سازی نمی‌کند.

## خروجی و نگهداری
- نمونهٔ schedule شامل `appliedAcExportLimitW` است؛ CSV/JSON سقف دقیق هر بازه را حفظ می‌کنند. در مدل ثابت، این ستون جدید ساخته نمی‌شود تا خروجی عددی قدیمی تغییر نکند.
- `acBeforeExportLimitW` و `acExportLimitLossW` و انتگرال‌هایWh درsummary/ماهUTC باقی‌اند. ماه براساس midpointUTC، انرژی براساس توانمیانگین×ساعتبازه است؛ دورهٔناقص سالانه‌سازی نمی‌شود.
- UIنتیجه، گزارشچاپی و جدولماهانه انرژی پیشازسقف/افتصادرات را نشان می‌دهند. explorer حالت را `explicit_interval_schedule` اعلام می‌کند و capWثابت راnull می‌گذارد؛ یک سقف میانگین ساختگی به‌جای schedule گزارش نمی‌شود. شمارشرویدادها همان runsافتبیشاز1e-6W است، نه رویدادکنترل واقعی.
- manifestنسخه/مدل/واحد/محدودیت، capabilityسرویس و sourceledger پشتیبانی دارند. JSON وreportورودی کامل schedule را حفظ می‌کنند.
- archive/bundle/clone/IndexedDB همان درخواست ونتیجه را نگه می‌دارند. guard مقدار سقف اعمال‌شده را با درخواست، minقدرت را با خروجی و انرژی پیشازسقف/افت را با انتگرال نمونه‌ها و ماه‌ها کنترل می‌کند؛ ترازجمع به‌تنهایی کافی نیست. شواهدسقف درمدلغیرفعال و ستونscheduleدرحالتثابت رد می‌شوند.

## منبع و آزمون
قبل ازکد مرجعpinnedخواندهشد:
https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.inverter.pvwatts.html
اینمنبع منحنی/clippingاینورتر را مشخص می‌کند، نه کنترل واقعی سقف صادرات؛ جداسازی clippingازcap در اینمرحله صریح است.

`test_export_limit_schedule.py`: هفت تست؛ minتحلیلی وDCبدونتغییر، ثابتدرمقابلscheduleثابت درچهارپیکربندی، bisectionمستقلترانس باauxiliarySchedule، وارداتشب/zeroavailability/zerocap،۱۵دقیقه/مرزماه/offset، ورودی‌هایغیرمجاز و اجرای۸۷۸۴بازه مصنوعیتماماًشب زیر16MiB/رد۸۷۸۵ردیف. اجرایتماماًشب شاهدبودجه/اندازه است، نه دادهٔهواشناسیسالانه.

`scripts/test-study-export-limit-schedule.ts`: Pythonواقعی، CSV/قراردادسخت‌گیر، min وانرژیماه، tamperنمونه/درخواست/ماه/کل، provenance/explorer/report، bundle/clone/archive، importsبدونتغییر وchildreject. ثابتدرمقابلscheduleثابت وbaselineقبلی شواهدregression/routingهستند؛ فرمولmin،انتگرال وترازترانس شاهدتحلیلیجدا دارند.

مرورگرواقعی ورودCSVناقص→خطا→اصلاح→review→APIباPython→دواینورتر+auxiliarySchedule+capschedule→JSON/CSV/report→archive→IndexedDB→reload→restore را اجراکرده است؛ retryAfterواقعی429 رعایت می‌شود وrate-limit تضعیف نشده است.

همهٔfixtureها مصنوعی‌اند؛ missingدادهٔعملیاتی پرنشده وscreeningجایگزین اجرایمستقیم نمی‌شود. PASSتست/CI، fieldvalidation، calibration، bankability، دقتسالانه یا تأییدایمنی نیست.
