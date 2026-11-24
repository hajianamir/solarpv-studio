# برنامهٔ پیش از کد — مرحلهٔ ۴۳
2026-11-03؛ مبنا 1eaa02b؛ دامنه طبق تأیید کاربر: تحلیل روز/ماه UTC و بازهٔ انتخابی، نمودار residual و CSV. تحلیل مشتق‌شده است؛ موتور 1.16.0 و قرارداد ۴۲ ثابت می‌مانند.

موجودی: measurementComparison شامل جفت‌های دقیق UTC، شمارش، MBE/MAE/RMSE و انرژی جفت‌ها؛ UI/HTML/JSON و آزمون مستقل دارد. محاسبات ۴۲ برای جلوگیری از اختلاف فرمول در تابع مشترک خلاصه‌سازی استخراج می‌شود؛ خروجی قدیمی باید عیناً حفظ شود.

سیاست زمانی صریح: عضویت بازه و تخصیص روز/ماه بر اساس **نقطهٔ میانی بازهٔ مشاهده/مدل در UTC**، همسو با ماه‌بندی انرژی worker؛ بازهٔ انتخابی [startUtc,endUtc) است. دو کران با Z/offset صریح، معتبر و start<end؛ بدون کران یعنی همهٔ داده‌ها شامل مشاهدات بیرون دوره. بخش‌بندی فقط برچسب‌گذاری آماری است، نه resampling یا پرکردن شکاف. فقط bucket دارای timestamp مدل یا مشاهده گزارش می‌شود؛ تاریخ غایب ساخته نمی‌شود. شمارنده و مخرج هر bucket از همان انتخاب زمانی است؛ گروه بدون جفت metrics=null. هیچ میانگین‌گیری از RMSE روزها برای RMSE کل صورت نمی‌گیرد.

خروجی قرارداد study-measurement-period-analysis-v1، metadata و selection و سیاست زمان، مجموع + روزها + ماه‌ها + residual rows برای هر حسگر جدا. CSVهای summary و residual با header ثابت، CRLF، escape و محافظ formula injection؛ null خالی نه صفر. گزارش HTML تحلیل پیش‌فرض کامل را دارد؛ UI امکان انتخاب بازه/حسگر، مشاهده روز/ماه، نمودار نقطه‌ای residual واقعی بدون اتصال شکاف، JSON و CSV هر انتخاب. نمودار همهٔ جفت‌ها را رسم می‌کند و جدول دسترس‌پذیر خلاصه/واحد/UTC دارد؛ در نبود جفت نمودار ساخته نمی‌شود. انتخاب‌ها با تغییر result/reset/restore پاک می‌شوند، در archive به‌عنوان دادهٔ مدل ذخیره نمی‌شوند.

پژوهش پیش از کد: pandas time-series guide تفکیک timestamp، timezone، time span و grouping/resampling را روشن می‌کند؛ این پیاده‌سازی صرفاً grouping دستی با قرارداد صریح midpoint است، نه پیش‌فرض resample و نه dependency جدید. https://pandas.pydata.org/docs/user_guide/timeseries.html#resampling . فرمول‌های خطا همان مراجع pinned مرحلهٔ۴۲ و شاهدهای مستقل‌اند.

تست: مرز نیمه‌شب/ماه/سال/leapday، offset و DST به UTC، half-open range، invalid تاریخ/کران، انتخاب خالی، missing/excluded/outside/unavailable، اختلاف تعداد جفت روزها و RMSE کل، W/kW/degC/۱۵دقیقه و انرژی، CSV injection/null، حفظ۴۲/عدمmutation/بازیابی، مرورگر واقعی انتخاب/نمودار/export/reset و full suites و CI دقیق SHA. دادهٔعملیاتی موجود نیست؛ تأیید میدانی/کالیبراسیون/گواهی دقت ادعا نمی‌شود.

Git: فایل‌های شروع همگی بایت‌به‌بایت با remote 1eaa02b برابر بودند، pointer محلی مبنا بود؛ snapshot حفاظتی stash نگه‌داری و همان شاخه ff-only شد؛ هیچ فایل متفاوتی برای بازگرداندن وجود نداشت. بدون reset/force/main/تغییر شاخه.
