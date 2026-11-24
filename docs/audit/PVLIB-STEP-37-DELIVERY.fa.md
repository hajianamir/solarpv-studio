# تحویل مرحله۳۷ و بازبینی۱–۳۶
2026-11-03؛ شاخه `arena/237e6ea2-solarpv-studio`؛ بدون merge.

## ترتیب کار و دامنه
ابتدا برنامه و بازبینی در `PVLIB-REAUDIT-1-36-AND-37-PLAN.fa.md` و نتیجه در `PVLIB-REAUDIT-1-36-RESULTS.fa.md` ثبت شد. commit `7356c44` دو نقص واقعی guard انرژی/metadata را پیش از پیاده‌سازی۳۷ رفع کرد. راهنمای مرحله۳۷، منابع pvlib خوانده‌شده، قرارداد، ترتیب حسابداری و محدودیت‌ها در `../PVLIB-STEP-37-INVERTER-BLOCKS.fa.md` است. تغییر موتور به1.12.0 برای اجرای۲تا۴اینورتر مستقل است، نه معادل‌سازی مجموعDC با یک اینورتر.

## شواهد نهایی محلی
- Python: **۱۲۸ تست PASS**؛ شامل سه تست foundation محلی و خارج از این تحویل. بنابراین مجموعهٔ قابل‌انتساب به فایل‌های نسخه‌شدهٔ این تحویل **۱۲۵ تست** است؛ CI مرجع شمارش نسخه‌شده خواهد بود.
- ماتریس قرارداد:۲۰۴۸حالت،۱۰۸۸رد،۹۶۰مجاز؛۱۶اجرای عددی همهٔزوج‌های قابل‌جمع گزینه‌های همین ماتریس را پوشاندند؛۹۴۴حالت فقط قرارداد، نه اجرای عددی.
- مرحله۳۷:۸تست Python PASS؛ PVWatts تحلیلی مستقل، routing، clipping مجزا، signed aggregation، شب با دوPnt، availabilityصفر، MPPTداخل بلوک، سخت‌گیری قرارداد و بودجه/اندازه.
- `test:study:workflow` با Python واقعی PASS؛ regressionهای بازبینی، child tampering، گزارش و archive/restore/clone/comparison نیز اجرا شدند.
- `test:study` HTTP/process PASS: Python واقعی،JWT، بدنه/ظرفیت/rate-limit/timeout/abort/runtime/output bound.
- `build`، `tsc --noEmit`، `npm test` PASS؛ lint صفرerror و۹۵warning؛ audit با مبنای6267957 PASS.
- `test:study:browser`: direct + storage مرورگر واقعی PASS؛ editor،اجرای۳۷،فایل‌های هر بلوک،گزارش،آرشیو و IndexedDB/restore. `test:browser` قدیمی نیز با timeout۱۸۰ثانیه PASS؛ مرورگرها سری اجرا شدند.
- مقایسه با worker مرحله۳۶ در۱۱fixture: fixed،diode،cable،Sandia،tracker،rows،optical،plant،environment،PVsyst،multiMPPT؛ `samples` و `summary` و `monthly` دقیقاً برابر بودند. این regressionاست، نه اثبات صحت مستقل مدل‌های قدیمی.

فایل‌های foundation۳۱–۳۴ از قبل موجود و نامرتبط، عمداً stage نشده‌اند. هیچ دادهٔ عملیاتی ساعتی اختراع/صفرپر نشده؛ adapter هواشناسی۳۴ یا کل foundation۳۱–۳۴ تکمیل‌شده اعلام نمی‌شود. Docker و دادهٔ میدانی تست نشده‌اند. تست مصنوعی وCI گواهی ایمنی، bankability، calibration یا اعتبار سالانه نیست. CI دقیقSHA پس از push بررسی و در پاسخ تحویل اعلام می‌شود؛ موفقیت CI قبلی به نسخهٔ جدید نسبت داده نمی‌شود.
