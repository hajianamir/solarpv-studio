# طرح پیش از کد: دو مرحله حرارت و محدودیت صادرات
تاریخ: 2026-11-03

## موجودی و قرارداد
موتور 1.3.0: SAPM، PVWatts یا De Soto، آرشیو و گزارش متصل. حالت‌های قدیمی باید بدون تغییر عددی بمانند.

مرحله ۱: system.faiman اختیاری با u0، u1 و windHeightM=10؛ ضرایب صریح، بدون مقدار تجهیز پیش‌فرض. دما T=Ta+G/(u0+u1*v). باد قرارداد موجود ۱۰ متر است؛ فقط ضرایب معتبر برای همان ارتفاع پذیرفته می‌شوند، بدون تبدیل حدسی ارتفاع. ضرایب SAPM برای سازگاری آرشیو حفظ ولی غیرفعال‌اند. ورودی G همان proxy صریح حرارتی در حالت ردیفی است؛ این انتخاب اعتبارسنجی حرارتی دوطرفه نیست.

منبع مطالعه‌شده: https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.temperature.faiman.html
مستندات تأکید می‌کند ارتفاع باد باید با ارتفاع تعیین ضریب یکسان باشد. u0: W/m²/K و u1: W/m²/K/(m/s). پیش‌فرض مقاله برای نصب خاص بوده و به پروژه تعمیم داده نمی‌شود. آزمون مستقل از رابطه تحلیلی، صفر تابش، باد و ترکیب ردیاب/ردیف/دیود.

مرحله ۲: system.acExportLimitW اختیاری، شامل صفر. Pexport=min(Pinverter,limit)، پس از تلفات DC و اینورتر؛ بدون بازخورد به MPPT. انرژی پیش از محدودیت و کاهش آن جدا ثبت می‌شود. سامانه بدون بار محلی/باتری فرض می‌شود: خروجی تولید برابر صادرات است. نه پخش بار، کنترل دینامیکی، محدودیت زمان‌متغیر یا معادل SAM.

منبع مستقل بررسی‌شده از GitHub API: https://github.com/NatLabRockies/ssc/blob/patch/ssc/cmod_grid.cpp ، بخش interconnection lines 188–215: interconnectionLimited=max(0,gridNet-limit)، کسر از gen. اینجا تنها حالت بدون بار/ذخیره استفاده می‌شود. دریافت صفحه SAM grid_limits ناموفق بود؛ ادعای خواندن آن نداریم.

هر دو مرحله: فرم→بازبینی→اجرا→آرشیو/بازیابی→CSV/JSON/گزارش؛ قرارداد سخت TS/Python و خروجی؛ ممنوعیت fallback. عدم انتخاب گزینه‌ها باید samples/monthly/summary قبلی را دقیقاً حفظ کند. آزمون Python مستقل، API/workflow، مرورگر واقعی، lint/build و CI روی SHA نهایی لازم است. این آزمون‌ها اثبات میدانی/بانکی نیستند.

## تکمیل بررسی منبع مستقل پس از پیاده‌سازی اولیه
Sandia PVPMC نیز دریافت شد: https://pvpmc.sandia.gov/modeling-guide/2-dc-module-iv/module-temperature/faiman-module-temperature-model/ ؛ رابطه تحلیلی همان موازنه حرارت بالاست، آزمایش اولیه بر هفت ماژول glass/Tedlar بوده است، نه اثبات عمومی نصب. نسخه ثابت منبع SSC: https://github.com/NatLabRockies/ssc/blob/fe79123d73eea2608d2de158183a058ebd6bd5e1/ssc/cmod_grid.cpp .
