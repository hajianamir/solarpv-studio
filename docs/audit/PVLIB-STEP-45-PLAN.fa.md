# برنامهٔ پیش از کد — مرحلهٔ۴۵
2026-11-03؛ مبنا2ff1ff8؛ همان شاخه بدون merge.

دامنهٔ مصوب: gain توان محدود بدون offset، train-only fit و test زمانی جدا، raw/adjusted و آشکارماندن بدترشدن holdout. هستهٔ عددی و قرارداد runStudyValidation در تحویل قبلی موجود و با oracle مستقل تست شده است. برای تکمیل قابل‌استفادهٔ مرحله۴۵، نمای اختصاصی بازبینی و خروجی ردیف‌های خام/اصلاح‌شده و انرژی همان جفت‌ها اضافه می‌شود؛ قرارداد قدیمی گزارش/بستهٔ مرحله۴۴ بدون تغییر می‌ماند.

خروجی جدید study-output-calibration-review-v1: fingerprint نتیجهٔ دقیق، plan/hash و گزارش موجود، metadata حسگر/نقطه/واحد، خلاصهٔ train/test با raw/adjusted metrics و matched energy، ردیف‌های هر پنجره با observed/rawModel/adjustedModel/rawResidual/adjustedResidual و flag/reason/status. فقط paired ردیف اصلاح‌شده دارد؛ خارج/مفقود/حذف‌شده/unavailable به صفر تبدیل نمی‌شود. کل سری خارج دو پنجره اصلاح نمی‌شود و خروجی تجربی دوباره clip نمی‌شود؛ هشدار صریح که ممکن است از cap یا محدودیت تجهیز عبور کند و نتیجهٔ فیزیکی تازه نیست.

UI: فقط بعد از اجرای موفق output_calibration، جدول train/test و gain/bound/وضعیت بهبود یا عدم بهبود و هشدارها؛ JSON، CSV ردیف‌ها و HTML مستقل. export null خالی، عددمنفی واقعی عدد، string formula-like ایمن. نتیجهٔ جدید یا editplan نما را با همان clear/reset قبلی پاک می‌کند. هیچ دکمهٔ Apply-to-model و تغییر P50/P90 اضافه نمی‌شود. import مدل اصلاح‌شده یا اعمال gain در field dossier فراتر از قواعد موجود نیست.

مرجع پیش از کد: scikit-learn1.6 LinearRegression، کمینه‌سازی مجموع مربعات residual و no-intercept مدل محدود است؛ اثبات تناسب فیزیکی نیست. https://scikit-learn.org/1.6/modules/generated/sklearn.linear_model.LinearRegression.html . مطالعهٔ قبلی train/test leakage همچنان معتبر است. sklearn dependency نصب نمی‌شود.

گیت‌ها: oracle مستقل gain غیرمتناسب، lower/upper bound، offset/range/حداقلpairs/dark/unavailable/دما/net، صفر و flagها، بدترشدن holdout و train-onlygain، matched energy Wh و W/kW، CSV escaping/null، برابری report قدیمی و protocol/recompute، عدم mutation/restore، مرورگر موفق/دانلود/reset و fullsuite و CI دقیقSHA. دادهٔعملیاتی ارائه نشده؛ کالیبراسیون فیزیکی/حسگر و fieldvalidation خارج از ادعای تحویل است.
