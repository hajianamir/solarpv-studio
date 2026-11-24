# UQ-001 — قرارداد صریح صدک انرژی

## Intake و دامنه
نوع: زیرساخت غیرپژوهشی؛ بدون تولید انرژی جدید یا پذیرش نتیجهٔ پژوهش.
هدف/داستان کاربر: توسعه‌دهندهٔ گزارش بتواند صدک‌های خروجی قدیمی مالی را بدون تغییر مقدار، به CDF و احتمال تجاوز صریح تبدیل کند تا P90 تولید با q90 اشتباه نشود.

## Discover و تصمیم محافظه‌کارانه
مسیر `src/engine/core/uncertaintyPropagation.ts` صدک‌های CDF انرژی را در p10/p50/p90 نگه می‌دارد. مسیر `energyUncertaintyReview` از قبل P90 تجاوز را درست تعریف می‌کند. این برش فقط adapter جدید است؛ هیچ مصرف‌کنندهٔ موجود، پروژهٔ ذخیره‌شده، UI، Python API یا financial engine تغییر نمی‌کند. اصلاح نمایش UI و migration یک قابلیت بعدی مستقل است.

## طرح و قرارداد
- فایل `src/studies/uqQuantileContract.ts`: تابع خالص `explicitEnergyQuantiles`، نسخهٔ `uq-quantiles-v1`.
- flag صریح در سطح فراخوانی: `enabled: true`؛ نام `uq_explicit_quantiles_v1`. نبود true مسیر disabled را برمی‌گرداند. flag سراسری محصول فعال نشده است.
- ورودی فقط `legacy_financial_cdf_v1`؛ provenance غیرخالی؛ p10≤p50≤p90 غیرمنفی و finite؛ واحد Wh/kWh/MWh.
- خروجی available: q10/q50/q90 بدون تغییر؛ exceedance p90=q10 و p10=q90؛ metadata محدودیت و اعتبار `not_field_validated`.
- خطاها: UQ_UNSUPPORTED_SOURCE، UQ_PROVENANCE_REQUIRED، UQ_INVALID_ENERGY_QUANTILES، UQ_UNORDERED_QUANTILES، UQ_UNSUPPORTED_ENERGY_UNIT.
- وضعیت مصرف‌کننده: disabled → fallback موجود؛ available → نمایش صریح؛ exception → خطای داده، بدون حدس یا اصلاح خودکار. در این چرخه UI/API شبکه اضافه نشده است.
- امنیت/کارایی: بدون I/O، اینترنت، import، dependency جدید یا محاسبهٔ سنگین؛ هزینهٔ ثابت و سه مقدار عددی. provenance سند صحت نیست و اطلاعات حساس نباید در آن فرستاده شود.
- مسیر برگشت: flag=false یا حذف مصرف adapter؛ چون هیچ مصرف‌کننده و migration اضافه نشده، دادهٔ قبلی دست‌نخورده است.

## معیارهای پذیرش
1. نگاشت P90 انرژی به q10 و حفظ کامل مقدار/واحد؛ آزمون lognormal با oracle مستقل Python NormalDist.
2. flag خاموش هیچ خروجی کمی جدیدی ندهد.
3. دادهٔ غیرمتناهی/منفی/نامرتب، واحد غیرانرژی و منبع ناشناخته رد شوند؛ مقدار صفر و واحدهای مجاز پذیرفته شوند.
4. ورودی mutate نشود؛ هیچ import یا فراخوانی finance/adoption در adapter وجود نداشته باشد.
5. تست‌های UQ موجود، پذیرش انرژی عملیاتی، benchmark هسته و typecheck سبز باشند.
6. metadata دقت، محدودیت و منشأ در خروجی موجود باشد.

## Verify / Reflect
تست اول به دلیل رقم مرجع اشتباه در fixture شکست خورد؛ oracle مستقل Python مقدار 77.39017796600123 را برای median=100 و logSigma=.2 تأیید کرد و fixture اصلاح شد. tolerance نگاشت در این case برابر 1e-9 واحد ورودی است؛ این تلورانس صحت انرژی میدانی نیست.
رگرسیون اولیه به دلیل نبود pandas و metadata مربوط به certifi متوقف شد؛ محیط محلی `.venv` با requirements قفل‌شدهٔ موجود ساخته شد، بدون تغییر وابستگی پروژه. سپس تست‌ها مجدداً موفق شدند.

اجرای gate: `PVLIB_PYTHON="$PWD/.venv/bin/python" npm run verify:uq:contract`؛ receipt در `docs/audit/UQ-001-GATE.json` ثبت می‌شود. این gate فقط برش UQ-001 را ارزیابی می‌کند؛ جای تأیید کل محصول یا انتشار عمومی نیست.

## سه پاسخ کیفیت
- ورود ناخواستهٔ پژوهش به مالی؟ خیر؛ adapter هیچ مسیر adoption یا side effect ندارد؛ gate فعلی پژوهش تغییر نکرده است. هیچ gate پذیرش خودکار جدیدی فعال نشده است.
- رگرسیون و مرجع عددی؟ بله، با فرمان‌ها و exit code در receipt؛ نه اعتبارسنجی میدانی.
- دقت/محدودیت/منشأ؟ در خروجی و این سند صریح است؛ مقدار از منبع حفظ می‌شود، mean/P75/P99 و horizon استنتاج نمی‌شود.

## Changelog و Learn
افزودن adapter opt-in، تست‌ها، فرمان gate و receipt؛ هیچ تغییر رفتار تولیدی موجود.
بدهی/مرحلهٔ بعد: اتصال صریح فقط به نمایش انرژی مالی پشت flag محصول، آزمون UI/PDF و تشخیص source نسخه‌دار؛ سپس migration. نام p90 قدیمی هنوز در محصول تغییر نکرده و نباید این برش را رفع کامل ناسازگاری UI معرفی کرد. gate عمومی مجوز و Safari خارج این دامنه است.
