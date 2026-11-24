# نتیجهٔ بازبینی پیش از مرحله۴۶
2026-11-03؛ مبنا0010512؛ همان شاخه؛ بدونmerge.

## موجودی و دامنه
این بازبینی روی قابلیت‌های موجود، اسناد تحویل و inventory مرحله۳۰–۴۵ انجام شد؛ زیرساخت/فیزیک قدیمی‌تر از طریق regressionهای موجود benchmark/audit/registry/browser پوشش داده شد. این ادعا نیست که همهٔ فرمول‌های تاریخی یا میدان از صفر و مستقل دوباره اعتبارسنجی شدند.

| بستهٔ موجود | شاهد و نتیجهٔ baseline پیش از تغییر |
|---|---|
|مطالعهٔ مستقیم/مهندسی قدیمی و مراحل۳۰–۳۴|۱۵۸Python، test:study HTTP/process، balanced/workflow/import/thermal، benchmark/audit/registry PASS|
|۳۵–۴۰ کابل/MPPT/اینورتر/AC plant/schedule|تست مستقل هر ماژول Python+TS، review30–40 و ماتریس دو زبان PASS؛ کنترل manifest/سقف/UTC/receipt/عدمdouble-count/fallback حفظ|
|۴۱ مشاهدات|قرارداد/receipt/flag/UTC/root-only/عدم‌اثر فیزیک و browser/archive/restore PASS|
|۴۲ آمار و۴۳دوره‌ها|شاهدهای مستقل دستی/Python، offset/missing/zero/period/CSV، browser/download وrestore PASS|
|۴۴پروتکل|hashoracle و exact-result/recompute/strictmetadata/size وbrowser PASS؛ دو نقص مرزی پایین بازتولید و اصلاح شد|
|۴۵gainتجربی|train-only/holdout/bounds/عدمreclip وraw/corrected/CSV/legacycompatibility، actualworker+browser PASS|

ماتریس موجود:۸۱۹۲contract،۴۳۵۲رد،۱۶runtime،۳۸۲۴contract-only. پوشش زوج‌های admissible این شبکه است، نه تمام عددهای پیوسته یا همهٔ ترکیب‌های فیزیکی. baseline lint صفرerror/۹۵warning، build PASS با هشدار chunk؛ API، npm test، test:audit وbrowser/storage PASS.

## نقص‌های بازتولیدشده و رفع‌شده پیش از۴۶
### R46-01 — JSON مبهم با نام تکراری
ساخت بستهٔ پروتکل معتبر و افزودن schemaVersion تکراری با مقدار نادرست قبل از مقدار درست، از مسیر عمومی readStudyProtocol پذیرفته شد. رفتار last-wins از JSON.parse بود؛ checksum ساختار نهایی آن را تشخیص نمی‌داد. اکنون parseStudyJson در مرز متن plan/metadata/package نام‌های decoded تکراری در هر object (ازجمله escape یونیکد) را رد می‌کند؛ نام یکسان در objectهای مستقل مجاز است. nonfinite عددی، عمق>۶۴ و سقف بایت نیز کنترل می‌شود. syntax را JSON.parse کنترل می‌کند و scan ساختاری مکمل است؛ regex masking یا تغییر hash انجام نشده. JSON معتبر و قالب گزارش/پروتکل قدیمی ثابت است. JSON.parse در ماژول‌های نامرتبط بدون شاهد تغییر نکرد.

### R46-02 — خطای async منقضی
تست مرورگر File.text را معلق کرد، plan جدید وارد شد، سپس read قدیمی reject شد: alert قدیمی ظاهر و assertion شکست خورد. اکنون catch همان generation guard مسیر موفق را دارد و input پس از پایان/خطا در finally پاک می‌شود؛ هیچ خطای معتبر فعلی پنهان نمی‌شود. browser دوباره با همان reproducer PASS شد.

## آزمون اصلاح‌ها
- scripts/test-validation-json-boundary.ts: duplicate/escaped/nested/nonfinite/deep/malformed/oversize/Unicode/BOM PASS.
- test-study-protocol.ts: reproducer duplicate اکنون rejected؛ roundtrip/hash/rehash/recompute/legacy/bundle PASS.
- build و مرورگر کامل با reproducer دیررس، storage و همهٔ جریان‌های موجود PASS.
- regression کامل و CI دقیقSHA نهایی پس از افزودن۴۶ نیز مجدداً اجرا و در گزارش تحویل ثبت می‌شود.

## موارد باقیمانده که نقص پیاده‌سازی قبلی نامیده نمی‌شوند
- دادهٔ عملیاتی/احراز گواهی حسگر/بازبینی مستقل و field campaign ارائه نشده؛ fieldValidation=false و field protocol self-declared است.
- کالیبراسیون پارامتر فیزیکی۴۸، uncertainty budget واقعی۴۹ و فازهای۵۰–۵۵ انجام نشده‌اند؛ gainتجربی جای آن‌ها نیست.
- محدودیت‌های مدل در inventory پابرجاست: loadflow/reactive/کنترلگذرا، thermalinertia، spatialmismatch/بایپس وterrain واقعی و مدل پویاsoiling/snow. خارج دامنهٔ تکمیل۴۶ و نیازمند داده/مرجع/گیت فازبندی‌اند.
- signature/trustedtimestamp/پیش‌ثبت مستقل یا تاریخچهٔ append-only نداریم؛ hash صرفاً اتصال/integrity است.
- warningهای lint و chunk عمومی موجودند؛ PASS آن‌ها را رفع‌شده معرفی نمی‌کند.

مرجع پژوهش اصلاح مرز JSON: RFC8259 section4 https://www.rfc-editor.org/rfc/rfc8259#section-4 . مرجع پیشین و strict contracts و evidence gates ضعیف نشده‌اند. تغییر فیزیک/worker/مالی و mergemain نداریم.
