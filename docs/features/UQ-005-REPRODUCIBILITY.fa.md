# UQ-005 — تکمیل backlog نرم‌افزاری و گیت‌های بیرونی

## به‌روزرسانی سیاست اجرا — ADR-027

اجرای جدید فقط Gaussian است. Student-t به‌علت تبدیل نادرست حاشیه‌ای بازنشسته شده است و fallback خودکار به Gaussian ندارد. خروجی جدید از `financial-uq-archive-v2` با `executionPolicy=gaussian-only-retired-student-t-v2` استفاده می‌کند. آرشیو v1 با تمام hashها و نتیجهٔ تاریخی خوانده می‌شود، اما در موتور فعلی فقط خواندنی است؛ حتی تطابق source اجازهٔ بازاجرا نمی‌دهد. هیچ فایل قدیمی درجا بازنویسی یا با مدل جدید تفسیر نمی‌شود. وضعیت‌های `legacy_read_only` و `policy_unavailable` به وضعیت‌های زیر اضافه شده‌اند. توصیف v1 در ادامه، قرارداد تاریخی است.

## Intake / دامنه و نتیجهٔ مورد انتظار
غیرپژوهشی: تبدیل نتیجهٔ موقت UQ به یک بستهٔ مستقل بازتولید، نمایش صریح پیش‌فرض، رفع warningهای any و کاهش chunkهای بزرگ. کاربر بتواند بدون تغییر مالی/انرژی، snapshot را صادر، از نظر integrity بررسی و روی همان source بازاجرا کند.

این چرخه **کالیبراسیون میدانی یا گواه انتشار چندسکویی نیست**. انتخاب حقوقی LICENSE یا جعل دادهٔ میدانی/نتیجهٔ Safari مجاز نیست. وضعیت‌های بیرونی باید جدا از موفقیت نرم‌افزاری بمانند.

## طراحی و قرارداد
- `financialUqArchive.ts`؛ schema `financial-uq-archive-v1` با ورودی دقیق، defaults صریح، seed و sampleSize، legacyResult دست‌نخورده و canonicalQuantiles نسخه‌دار.
- mapping مهاجرت: energy exceedance P90=q10؛ LCOE q90=legacy.p10؛ NPV q10=legacy.p10. معنی قدیمی به‌صورت خودکار عوض نمی‌شود. raw legacy برای سازگاری حفظ است. این migration بستهٔ UQ است؛ پروژهٔ قدیمی یا موتور legacy بازنویسی نمی‌شود.
- SHA-256 canonical روی request، result، نتیجهٔ مستقل از traceId، snapshot-context مالی و کل payload. source identity شامل hash فایل‌های TS/TSX/JSON/CSS زیر src و package/package-lock، تنظیمات Vite و TypeScript است. پوشش فایل‌ها در خود archive قابل مشاهده است؛ ادعای hash تمام پروژه/باینری سیستم‌عامل نیست.
- source identity هنگام **production build** تولید می‌شود و dirty working tree را با محتوای واقعی hash می‌کند؛ به commit SHA به‌تنهایی متکی نیست. در dev/HMR هویت ثابت ادعا نمی‌شود و export مسدود است.
- runtime شامل user-agent و timezone اعلام‌شدهٔ JavaScript است؛ attestation سخت‌افزار یا سیستم‌عامل نیست.
- ورودی فایل حداکثر ۵۱۲KiB، unique keys، finite numbers، عمق محدود و schema strict. digest اشتباه، canonical mapping ناسازگار یا نسخهٔ ناشناخته reject می‌شوند. hash امضای اصالت/اعتبارسنجی داده نیست.

## UI / امنیت / lifecycle
`FinancialUqArchivePanel` داخل نتیجهٔ UQ قرار دارد. export فقط پس از فعال‌کردن checkbox «شامل قیمت‌ها» فعال می‌شود؛ قیمت‌ها و ورودی مالی محرمانه‌اند و خودکار upload/log نمی‌شوند. فایل به‌صورت محلی دانلود می‌شود.

وضعیت‌ها: idle/loading/integrity_verified/code_mismatch/running/reproduced/result_mismatch/invalid/failed/cancelled. source متفاوت اجازهٔ replay نمی‌دهد؛ سلامت hash به معنی یکسان‌بودن کد نیست. replay با Worker bounded فعلی انجام می‌شود؛ فقط hash نتیجهٔ deterministic مقایسه و traceId ساعت نادیده گرفته می‌شود. replay هیچ setter مالی، project import یا adoption ندارد. تغییر فایل و unmount اجرای قبلی را لغو می‌کنند.

آرشیو از context فعلی به پروژه import نمی‌شود؛ صرفاً شاهد مستقل است. مشاهدهٔ `reproduced` یعنی همان محاسبه تکرار شده، نه اینکه فرض‌ها درست یا پروژه بانک‌پذیر است.

## پیش‌فرض جدید و fallback
از این چرخه نمایش صریح کارت‌های انرژی، هزینه و NPV **پیش‌فرض روشن** است. هر checkbox همچنان امکان نمایش legacy را می‌دهد؛ برای مصرف‌کنندهٔ مؤلفه `initialExplicit=false` fallback محافظه‌کارانه است. هیچ preference در دادهٔ پروژه ذخیره نمی‌شود. تست‌های قبلی SSR حالت compatibility را صریح درخواست می‌کنند و default جدید جدا آزموده می‌شود. این بند جایگزین توصیف «پیش‌فرض خاموش» در اسناد تاریخی UQ-002/003 است.

## بهینه‌سازی و کیفیت کد
- دو any در FinancialTab با generic روی UserFinancialPricing و نوع customerType جایگزین شدند.
- ClimateTab و FinancialTab زیر Suspense موجود به lazy route تبدیل شدند؛ SW همچنان chunkها را برای offline precache می‌کند.
- کتابخانه‌های PDF/fontkit، Excel، DOCX و validation chunk مستقل دارند؛ حد warning به‌منظور مخفی‌کردن مسئله افزایش نیافته است.
- mixed static/dynamic import مربوط به catalog cycle و annotationهای وابستگی‌ها عمداً بی‌دلیل دست‌کاری نشده‌اند؛ رفع تمام هشدارهای third-party یا تغییر پین‌ها در این چرخه ادعا نمی‌شود.

## Acceptance criteria و تست
1. archive نسخه‌دار round-trip شود و input/result mutate نشوند؛ canonical mapping با مقادیر legacy سازگار باشد.
2. بازاجرای request صادرشده نتیجهٔ یکسان جز traceId بدهد؛ seed و تمام مقادیر مورد استفاده حفظ شوند.
3. دست‌کاری input/result/source/context/canonical و حتی جعل فقط checksum بیرونی، duplicate keys، nonfinite، نسخهٔ ناشناخته و size نامعتبر reject شوند.
4. export بدون source identity یا بدون checkbox محرمانگی مسدود باشد؛ import کد متفاوت replay نداشته باشد.
5. production E2E دانلود→دیسک→import→replay و tamper/code mismatch را بررسی کند؛ منبع انرژی پیش/پس ثابت بماند.
6. نمایش صریح پیش‌فرض و legacy opt-out در fa/en، PDF و رگرسیون‌های قبلی عبور کنند.
7. lint محدوده بدون warning/error، types و build موفق؛ هیچ chunk JS خروجی بزرگ‌تر از ۱٬۰۰۰٬۰۰۰ byte نباشد. این بودجهٔ bundle است، نه SLA سرعت شبکه.
8. pipeline لینوکس/ویندوز تعریف شود؛ اجرای محلی لینوکس با اجرای واقعی Windows/Safari اشتباه گرفته نشود.

فرمان: `PVLIB_PYTHON="$PWD/.venv/bin/python" npm run verify:uq:remaining`.
رسید نرم‌افزاری/گیت بیرونی: `docs/audit/UQ-005-GATE.json`.

## CI و محدودهٔ ادعا
`.github/workflows/uq-acceptance.yml` مسیر unit/archive/browser/E2E را برای Linux و Windows با SHA checkout و runtime artifact تعریف می‌کند. در این نوبت push/اجرای remote انجام نشده است؛ بنابراین Windows جدید PASS اعلام نمی‌شود. تست‌های جدید در غیرلینوکس مسیر Chromium سیستم/نصب‌شده را می‌پذیرند و binary لینوکس را تحمیل نمی‌کنند. تست native Safari موجود جایگزین نشده و مانع تاریخی آن رفع‌شده نیست.

## گیت‌های بیرونی مسدود
- LICENSE ریشه و حقوق موارد قبلی: نیازمند تصمیم/مدرک صاحب حق؛ فایل مجوز ساختگی ایجاد نمی‌شود.
- Safari واقعی و Windows نهایی: نیازمند runtime/اجرای واقعی CI؛ تعریف workflow مدرک PASS نیست.
- CV/correlation کالیبره، decomposition معتبر، P75/P99 با tail evidence و bankability: نیازمند دادهٔ مستقل و دامنهٔ کاربرد مشخص. خروجی/هشدار اکتشافی فعلی حفظ می‌شود؛ percentile جدید با دقت ساختگی اضافه نمی‌شود.

## سه پاسخ کیفیت
ورود پژوهش به مالی؟ خیر؛ archive/replay جدا و بدون adoption است. رگرسیون و صحت عددی؟ unit، hash/mutation، Worker parity، PDF و production E2E اجرا می‌شوند. محدودیت/منشأ/دقت؟ در archive، UI و این سند صریح‌اند؛ hashing و replay جای دادهٔ میدانی را نمی‌گیرند.

## Changelog / rollback
افزودن archive و replay محلی، هویت source در production، پیش‌فرض canonical، رفع any، جداسازی chunk و workflow پلتفرمی. وابستگی جدید یا endpoint اضافه نشده است. برگشت نمایش با checkbox/initialExplicit=false و حذف archive panel ممکن است؛ project migration مخرب وجود ندارد. خاموش‌کردن `VITE_FINANCIAL_UQ_WORKER=false` همچنان محاسبه را مسدود می‌کند و fallback blocking ایجاد نمی‌کند.
