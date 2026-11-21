# تحویل مرحلهٔ۴۴ — پروتکل و قابلیت ردیابی
2026-11-03؛ مبنا312f73f؛ شاخه arena/237e6ea2-solarpv-studio؛ بدون merge.

## دامنهٔ تکمیل‌شده
هستهٔ config/plan/report در تحویل قبل موجود بود. این مرحله بستهٔ قابل‌حمل `study-protocol-package-v1` با اتصال به **نتیجهٔ دقیق**، metadata بازنگری و بازمحاسبهٔ کامل را اضافه می‌کند. موتور1.16.0، فرمول‌های calibration/P50/P90 و پارامترهای فیزیکی تغییر نکردند؛ validationStatus=not_field_validated در بسته اجباری است.

فایل‌ها: `src/studies/studyProtocol.ts`، `src/components/StudyValidationTools.tsx`، `scripts/test-study-protocol.ts` و تست مرورگر؛ برنامهٔ فازبندی/inventory به‌روز شد. تست اختصاصی در workflow/CI موجود قرار گرفت.

## استفاده
۱. مطالعهٔ معتبر را اجرا/بازیابی و plan تحلیل را تأیید و محاسبه کنید.
۲. در همان بخش ابزارها، قسمت **44. Protocol traceability** metadata JSON را تکمیل کنید: protocolId، reviewer، revision، createdAt با Z/offset و changeReason. دکمهٔ مثال صرفاً metadata مصنوعی می‌دهد؛ جایگزین هویت واقعی بازبین نیست. تأیید metadata جداگانه لازم است.
۳. Create checked protocol package را بزنید و JSON و HTML را دریافت کنید. فایل **JSON مطالعهٔ دقیق** را نیز نگه دارید؛ بسته برای کاهش اندازه، کل weather/samples را در خود تکرار نمی‌کند.
۴. با Load study protocol package بسته را وارد کنید. schema/ظرفیت/checksum بررسی می‌شود، نتیجهٔ دقیق fingerprint می‌شود و report از plan دوباره محاسبه و کامل مقایسه می‌شود. سپس plan به فرم می‌آید و نمایش تحلیل به تأیید مجدد نیاز دارد؛ ورودی مدل/نتیجه/مالی overwrite نمی‌شود.
۵. تغییر plan یا metadata بستهٔ قبلی را پاک می‌کند؛ نتیجهٔ جدید/restore فرم و گزارش را reset می‌کند. بارگذاری async که بعد از edit/result جدید تمام شود، با شمارهٔ revision داخلی نادیده گرفته می‌شود. plan-only قدیمی همچنان قابل استفاده است.

## قرارداد و محدودیت اعتماد
- سقف package متن/شیء ۲۵۶KiB؛ metadata strict و کلید ناشناخته رد می‌شود. report ناشناخته از روی نتیجهٔ ذخیره‌شده trusted نمی‌شود.
- fingerprint روی نمایش canonical نتیجهٔ validateشده، شامل داده‌ها و manifest/نسخه/هش worker و اطلاعات اجرای حفظ‌شده است. rerun با input یکسان ولی manifest/execution متفاوت می‌تواند عمداً رد شود؛ برای کاربرد مجدد plan قدیمی، مسیر plan-only یا بستهٔ بازنگری‌شده لازم است.
- reportSha256 و packageSha256 نیز کنترل می‌شوند؛ تغییر report با محاسبهٔ دوبارهٔ hashها هم اگر با محاسبهٔ واقعی متفاوت باشد رد می‌شود.
- از `canonicalBundleJson` موجود و SHA256 استفاده می‌شود: قالب محلی `sorted-key-json-sha256-v1` با ترتیب code-unit ثابت، نه localeCompare و **نه ادعای RFC8785**. مرجع پژوهش پیش ازکد: https://www.rfc-editor.org/rfc/rfc8785 . hash مستقل با Node crypto آزموده شد.
- revision۱ predecessor ندارد؛ revisionهای بعدی previousPackageSha256 اجباری دارند. این فقط **لینک ادعایی تاریخچه** است؛ والد/تمام زنجیره در این مرحله ارائه یا independently verified نمی‌شود.
- reviewer و createdAt خوداظهاری‌اند. hash/تاریخ/شمارهٔ بازنگری **امضای دیجیتال، احراز هویت، trusted timestamp، append-only audit یا اثبات پیش‌ثبت مستقل** نیستند. کاربر می‌تواند بستهٔ تازه با hashهای جدید و دادهٔ دیگری بسازد؛ نرم‌افزار اصالت ادعای او را تأیید نمی‌کند. پیشگیری عددی نشت train/test موجود است ولی history واقعی آزمایش یا تکرار tuning را اثبات نمی‌کند.

## آزمون‌های اجراشده
- تست۴۴ PASS: بستهٔ deterministic و JSON/key-order roundtrip، hash oracle مستقل Node crypto، metadata/revision/calendar/offset، ظرفیت byte/Unicode و JSON خراب، unknown keys، report tamper+rehash، input یکسان با worker/engine متفاوت، HTML escape، plan-only compatibility، immutability و bundle restore دقیق.
- مرورگر واقعی PASS: metadata confirmation، ایجاد بسته، download/readback واقعی JSON/HTML، رد checksum خراب و فایل بزرگ، ورود مجدد صحیح، report مخفی تا reconfirm، برابری گزارش با محاسبه و پاک‌شدن بسته پس از metadata edit. جریان‌های قبلی calibration/uncertainty/field/restore/storage نیز PASS.
- ۱۵۸ تست Python و workflow کامل PASS؛ ماتریس۸۱۹۲contract/۴۳۵۲reject/۱۶runtime/۳۸۲۴contract-only بدون ادعای اجرای عددی همهٔ ترکیب‌ها.
- API/process، build، benchmark و audit/source/physics PASS؛ lint/TypeScript PASS با صفرerror و۹۵warning موجود؛ هشدار chunk بزرگ build باقی است. خطای نوع در ساخت دادهٔ tamper تست ابتدا پیدا و با Object.assign روی fixture رفع شد؛ lint مجدد PASS.

CI دقیق commit پس از push بررسی و در پاسخ نهایی لینک می‌شود. تکمیل این مرحله فقط engineering traceability است؛ دادهٔ واقعی و احراز مدارک/بازبینی مستقل/field campaign همچنان pending است. فازهای۴۵–۴۷ هستهٔ نرم‌افزاری قبلی دارند و فاز۴۸physicalcalibration و۴۹uncertaintybudget واقعی انجام نشده‌اند؛ این تحویل آن‌ها را تکمیل‌شده نمی‌نامد.
