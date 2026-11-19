# پیگیری محدود متن و کتابشناسی snow / soiling

شاخهٔ اجرا: `arena/cfc20741-solarpv-studio`؛ والد این پیگیری: `e43c66564041d13f722c194e9d6d77b864eb2002`.

## تغییرهای محدود

- پیش‌فرض ثابت `3.50%` در BIPV/T «فرض غربالگری داخلی» است؛ اجرای مدل Kimber یا اعتبارگرفتن BIPV/T از آن مقاله نیست. مقدار، فرمول و rear-soiling تغییر نکرده‌اند.
- توضیح `snowLossPct` در `waterfallArgs` ورودی assumed/user-defined معرفی شده، نه خروجی مدل معتبر Marion.
- کامنت مرحلهٔ soiling در crossValidation با metric داخلیِ از قبل اصلاح‌شده هماهنگ شده است.
- guardهای محدود برای همین متن‌ها و ارجاع‌ها افزوده شده‌اند؛ detector، workflow، manifest و fixtureها تغییر نکرده‌اند.

## تطبیق کتابشناختی

این بررسی، تطبیق عنوان/نویسنده/DOI و صفحات در metadata قابل‌دسترسی و ارجاع‌های pvlib نسخهٔ ثابت است، نه بررسی همهٔ متن مقاله‌ها، جدول‌ها یا معادلات آن‌ها. هیچ ادعای تازه‌ای دربارهٔ اعتبارسنجی مدل داخلی از آن نتیجه نمی‌شود.

| ارجاع | اصلاح | شواهد قابل پیگیری |
|---|---|---|
| Marion و همکاران، ۲۰۱۳ | عنوان صحیح: *Measured and modeled photovoltaic system energy losses from snow for Colorado and Wisconsin locations*؛ Solar Energy، جلد 97، صفحات 112–121؛ DOI `10.1016/j.solener.2013.07.029`. عنوان قبلی «A Snow-Loss Model… / IEEE JPV» پس گرفته شد. | References در [pvlib 0.13.1 snow.py](https://github.com/pvlib/pvlib-python/blob/v0.13.1/pvlib/snow.py)، و [رکورد کتابشناختی](https://www.semanticscholar.org/paper/Measured-and-modeled-photovoltaic-system-energy-for-Marion-Schaefer/1bb8721fec5f9ed82714dd7a6537ebf4da12e6aa). |
| Kimber، Mitchell، Nogradi، Wenger، ۲۰۰۶ | عنوان صحیح شامل *Southwest Region of the United States*؛ IEEE 4th WCPEC، جلد 2، صفحات 2391–2395؛ DOI `10.1109/WCPEC.2006.279690`. انتساب قبلی به شمارهٔ گزارش `NREL/CP-520-40123` بدون احراز ارتباط، حذف شد. | References تابع kimber در [pvlib 0.13.1 soiling.py](https://github.com/pvlib/pvlib-python/blob/v0.13.1/pvlib/soiling.py) و [رکورد کتابشناختی عنوان/نویسندگان/صفحات/DOI](https://www.semanticscholar.org/paper/The-Effect-of-Soiling-on-Large-Grid-Connected-in-of-Kimber-Mitchell/1de41e5ee4e3dcdc7da22c9f1f7def353ffd5c83). |
| Townsend و Powers، ۲۰۱۱ | عنوان به *Photovoltaics and snow: An update from two winters of measurements in the SIERRA*، 37th IEEE PVSC، DOI `10.1109/PVSC.2011.6186627` اصلاح شد. صفحه‌ای که مستقلاً احراز نشده بود اضافه نشد. | References تابع loss_townsend در [pvlib 0.13.1 snow.py](https://github.com/pvlib/pvlib-python/blob/v0.13.1/pvlib/snow.py). |
| Coello و Boyle، ۲۰۱۹ | عنوان به *Simple Model For Predicting Time Series Soiling of Photovoltaic Panels*؛ IEEE Journal of Photovoltaics؛ DOI `10.1109/JPHOTOV.2019.2919628` اصلاح شد. ادعای معادله/جدول یا صفحات تأییدنشده اضافه نشد. | References تابع hsu در [pvlib 0.13.1 soiling.py](https://github.com/pvlib/pvlib-python/blob/v0.13.1/pvlib/soiling.py). |
| Andrews / Pearce در header قدیمی snow | مدخل ناقص و تأییدنشدهٔ قبلی حذف شد؛ بدون احراز عنوان/نسخه/صفحات با مقالهٔ حدسی جایگزین نشد. این تصمیم، نفی وجود پژوهش آن نویسندگان نیست. | برای نگه‌داشتن این مدخل، احراز مستقل مقالهٔ دقیق لازم است؛ این heuristic به آن منبع وابسته معرفی نمی‌شود. |

عنوان‌های بخش/جدول/معادلهٔ قدیمی و نسبت‌دادن binهای داخلی یا gamma به این مقاله‌ها بازگردانده نشده‌اند. استانداردهای IEC/ASCE/Eurocode در headerها همچنان صرفاً پیشینه‌اند، نه ادعای تطابق طراحی یا گواهی مهندسی.

## مرز ادعا

اصلاح ارجاع، آن heuristic را پیاده‌سازی مقاله نمی‌کند؛ disclaimer هم جای دادهٔ سایت یا اعتبارسنجی مستقل را نمی‌گیرد. این بسته فقط نقاط مشخص‌شده در بازبینی را اصلاح می‌کند، نه تمام ارجاع‌های repository یا اعتبار کلی BIPV/T، yield سالانه، برف و soiling. تأیید فنی ناظر طبق اعلام مالک، تأیید مالک نیز محسوب می‌شود؛ این پیگیری تا بازبینی نسخهٔ تازه، ادعای تأیید تازه ندارد. در این کار merge انجام نمی‌شود.

## پذیرش محلی

مقایسهٔ tokenهای AST با والد `e43c6656`، پس از حذف trivia/comment و بدون حذف literalهای کد، در هر پنج فایل `src` تغییرکرده دقیقاً یکسان بود؛ حتی tokenهای اجرایی و رشته‌های محاسباتی نیز تغییر نکرده‌اند.

`verify:engine-claims` (همراه regression منفی نقاط جدید)، `test:physics-reference-gate`، typecheck، ESLint، build، `npm test`، اجرای کامل `test:audit` و gateway همگی با exit صفر تمام شدند. ESLint صفر خطا/۹۵ هشدار و build هشدار chunk بزرگ دارد؛ gateway برابر 24/24 است. این نتایج اعتبار نرم‌افزاری‌اند، نه احراز علمی مدل‌ها یا خواندن کامل متن مقاله‌ها.
