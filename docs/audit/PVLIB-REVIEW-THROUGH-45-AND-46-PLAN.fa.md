# بازبینی مراحل قبل و برنامهٔ مرحله۴۶
2026-11-03؛ مبنا0010512؛ شاخهٔ ثابت؛ بدونmerge.

قبل از تغییر، مجموعهٔ کامل موجود اجرا شد:۱۵۸Python،workflow و ماتریس۸۱۹۲contract، API/process، browser+storage،lint/build/benchmark/audit همگیPASS. این پوشش به‌معنای اثبات بی‌خطایی یا صحت میدان نیست. موجودی نسخه‌دار مراحل۳۰–۴۵ و گزارش‌های پیشین بررسی می‌شود؛ مراحل قدیمی‌تر از طریق benchmark/audit/registry/browser موجود کنترل می‌شوند، نه ادعای بازاعتبارسنجی عددی همهٔ فرمول‌ها.

موارد بازبینی قابل اصلاح پیش از۴۶:
- import پروتکل/plan از JSON.parse استفاده می‌کند؛ کلید تکراری با تفسیر last-wins ممکن است پذیرفته شود. با بستهٔ معتبر و افزودن schemaVersion تکراری بازتولید و سپس رد strict duplicate-key، nonfinite، عمق و bytecap اضافه شود. فرمت بسته/گزارش معتبر قدیمی عوض نشود.
- handler async file.text پس از edit/result جدید مقدار موفق را discard می‌کند، اما catch شکست دیررس هنوز می‌تواند alert قدیمی را نمایش دهد. با File.text معلق و reject پس از edit در مرورگر بازتولید، سپس generation guard برای خطا و reset fileinput اضافه شود.
- محدودیت‌های عمدی/دادهٔ واقعی/فاز۴۸–۵۵ در backlog باقی‌اند؛ با ادعای ناقص‌بودن پیاده‌سازی قبلی مخلوط نشوند. اگر بازبینی ایراد عددی بازتولیدپذیر دیگری یافت، مستقل ثبت و با شاهد اصلاح شود، نه حدس/تغییر broad.

مرجع پیش از کد: RFC8259 section4 دربارهٔ یکتایی نام object و رفتار غیرقابل‌اتکای duplicate، https://www.rfc-editor.org/rfc/rfc8259#section-4 ؛ parser جدید از JSON.parse برای صحت syntax و scan ساختاری برای تکرار استفاده می‌کند، نه regex masking. اعداد finite، عمق≤۶۴ و UTF8 byte cap؛ BOM ابتدایی قابل پذیرش، hash روی ساختار معتبر همان قالب قبلی است.

مرحله۴۶: هستهٔ شرطی lognormal/P50/P90 با CV/correlation/PSD و annual gate موجود است. تکمیل با بازبینی اختصاصی uncertainty budget، سهم‌های diagonal و cross-covariance (نه جمع درصدهای دلخواه)، نمایش P50/P90/mean و افق/واحد، هشدار cancellation/CV0 و correlation log-space، JSON/CSV/HTML مستقل و fingerprint نتیجهٔ دقیق. خروجی قدیمی report/protocol و موتور1.16.0 ثابت می‌مانند. gain یا residual به uncertainty تبدیل نمی‌شود؛ هیچ annualization/multi-year extrapolation یا اعتبار bankable نداریم. سهم cross می‌تواند منفی باشد و به‌عنوان کاهش عددی variance تحت فرض correlation نمایش می‌یابد، نه حذف فیزیکی عدم‌قطعیت.

مرجع NIST پیش ازکد مجدد خوانده شد: median=m، inverse survival=m exp(sigma Phi^-1(1-p))، CV=sqrt(exp(sigma²)-1). https://www.itl.nist.gov/div898/handbook/eda/section3/eda3669.htm

گیت‌ها: baseline/reproducer/اصلاح/retake قبل از۴۶؛ oracle مستقل NumPy/NormalDist برای ماتریس PSD و سهم‌ها و quantile، zero/corr±1/حداکثر۸component/shape/NaN/سال ناقص و کامل؛ immutable old report/protocol/restore؛ مرورگر download/readback/invalid/edit/reset؛ سپس رگرسیون کامل و CI دقیقSHA. دادهٔعملیاتی ارائه نشده،fieldValidation=false و physical calibration pending باقی است.
