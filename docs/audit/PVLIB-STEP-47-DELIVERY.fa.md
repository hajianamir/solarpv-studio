# تحویل مرحله۴۷ — پروندهٔ شواهد میدان
تاریخ: 2026-11-03؛ مبنا:77019df؛ شاخه:arena/237e6ea2-solarpv-studio. شناسهٔ نهایی commit و CI در پیام تحویل ثبت می‌شود.

## تغییرها
- نمای اختصاصی field_evidence با actual/operator/threshold/unit/pass و منبع معیار، coverage/status، raw/evaluated metrics و gain، دلایل block و reference مدارک.
- register اختیاری study-field-document-register-v1: مقید به inputSHA/planSHA/dataset، category یکتا، reference دقیق، SHA اعلامی سند، reviewer/time، applicability و سقف۶۴۰۰۰بایت. duplicate-key و timestamp بدون Z/offset رد می‌شود.
- سند حسگر/ساعت/مرز باید کل intervalهای train و evaluation را بپوشاند؛ سند independentReview کل evaluation و reviewedAt پس از پایان آن. این‌ها صرفاً بررسی سازگاری metadata هستند، نه احراز سند یا بازبین.
- وضعیت قدیمی blocked/criteria_not_met مقدم است؛ criteria met بدون مدارک کامل => evidence_review_required؛ با metadata کامل => declared_dossier_complete. در همهٔ حالات not_field_validated ثابت است.
- JSON پرونده، CSV معیارها و ردیف‌ها، HTML مستقل escaped/CSP و register قابل بازتولید. ویرایش register تأیید/اعمال قبلی را حذف و export را تا اعمال معتبر یا پاک‌کردن draft غیرفعال می‌کند. تعویض plan نمای قبلی را حذف می‌کند.
- قرارداد قدیمی report/protocol، فیزیک، engine1.16.0، نتایج مدل، مسیر offline و محاسبات مالی تغییر نکردند.

## پژوهش
NIST https://www.nist.gov/calibrations/traceability : زنجیرهٔ مستند کالیبراسیون و سهم uncertainty لازم است؛ traceability به‌تنهایی fitness-for-purpose نیست. reference/hash/metadata اثبات traceability، اصالت، استقلال، امضا یا تأیید NIST نیست. جزئیات موجودی و برنامهٔ پیش از کد در PVLIB-STEP-47-PLAN.fa.md.

## آزمون‌های اجراشده
- تست اختصاصی با worker واقعی و oracle مستقل Python برای MBE/RMSE؛ gain شناخته‌شده و holdout، raw/corrected، null برای missing/excluded و نبود انرژی برای دما؛ metadata binding/schema/size/duplicate/category/reference/time/applicability و پوشش train؛ اولویت وضعیت‌ها؛ CSV injection/HTML escaping؛ برابری report قدیمی و بازتولید bundle و عدم تغییر نتیجه: PASS.
- مرورگر واقعی: خواندن خود downloadهای JSON/CSV/HTML، تأیید register، draft/export gating، register اشتباه و پاک‌کردن/reset؛ کل browser و storage: PASS.
- Python:۱۵۸ تست PASS؛ workflow کامل شامل۸۱۹۲ قرارداد (۴۳۵۲ رد،۱۶ اجرای runtime،۳۸۲۴ contract-only): PASS. پوشش زوج گزینه‌ها به معنی پوشش پیوستهٔ همهٔ پارامترها نیست.
- HTTP/process API،۶ benchmark، audit، build و TypeScript: PASS؛ lint صفر error و۹۵ warning موجود؛ هشدار اندازهٔ chunk باقی است. git diff --check: PASS.

## محدودیت
تمام داده‌های آزمون synthetic هستند، حتی fixture با label measured برای آزمودن gate. هیچ مشاهدهٔ عملیاتی یا مدرک واقعی ساخته نشده است. اصل اسناد، hash واقعی فایل خارجی، هویت/استقلال بازبین، زنجیرهٔ traceability و field campaign بررسی نشده‌اند. اعلام criteria met یا dossier complete نه field validation، نه انطباق IEC، نه bankable/SAM-grade و نه اعتبار سالانه است. اجرای میدانی و کالیبراسیون فیزیکی همچنان pending است.
