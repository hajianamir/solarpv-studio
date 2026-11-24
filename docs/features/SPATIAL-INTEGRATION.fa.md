# ادغام محصولی Stefan فضایی — C3 محدود

## دامنه و معیار پذیرش

این برش، kernel مستندشده در STEFAN-SPATIAL-SPEC.fa.md را بدون تغییر الگوریتم به مسیر API احراز هویت‌شده، SDK و Research editor اضافه می‌کند. شرط پایان: قرارداد strict TS/Python، محدودیت کار پیش از spawn، کنترل ورودی/خروجی و tamper، احراز هویت، پرچم مستقل default-off و rollback، SDK واقعی HTTP، مرورگر production و اجرای کل رگرسیون قبلی. این ادغام نه تکمیل C3 است، نه اتصال PV-T/PEM، نه حل چندبعدی/همرفت یا اعتبارسنجی مادهٔ پروژه.

## نصب، استفاده و rollback

requirements اصلی research و Python تنظیم‌شدهٔ `PVLIB_PYTHON` لازم است؛ runtime اختیاری reference برای این عملیات جدید لازم نیست. در سرور دارای پیکربندی احراز هویت موجود، `PVLIB_RESEARCH_ENABLED=true` و `SPATIAL_RESEARCH_ENABLED=true` را تنظیم کنید. پرچم دوم مستقل از SCIENCE_C_ENABLED، APPLIED_RESEARCH_ENABLED و REFERENCE_MODELS_ENABLED است. پیش‌فرض خاموش؛ با خاموش‌کردن آن عملیات با503 رد و از capabilities حذف می‌شود، عملیات‌های دیگر تغییر نمی‌کنند. قابلیت enabled بودن runtime را probe نمی‌کند؛ خطای Python باید جدا رفع شود.

در تب اقلیم Research editor، دکمهٔ `Spatial Stefan example` را انتخاب کنید. `Run research` فقط هنگام فعال‌بودن قابلیت و درخواست معتبر در دسترس است. API: POST `/api/v1/research/run` با همان JSON نمونه در `docs/examples/stefan/request.json` و توکن احراز هویت موجود. کلید/توکن داخل نمونه یا archive ذخیره نمی‌شود؛ از درج دادهٔ محرمانه در source خودداری کنید. SDK موجود: `Client(..., enabled=True).run(request)`؛ خروجی research-only است و energyAdoption/financeMutation=false می‌ماند. CLI قبلی هم با opt-in صریح پابرجاست.

فرمت request شامل operation=`stefan_spatial` و plan نسخهٔ`stefan-spatial-v1` است؛ فایل paraffin.json فقط plan است و برای CLI استفاده می‌شود. دانلود/بازخوانی archive نتیجه را خودکار معتبر/قابل‌پذیرش مالی نمی‌کند. cancel و ویرایش ورودی نتیجهٔ کهنه را حذف می‌کنند.

## محاسبات و اعتبارسنجی

حل PDE تنها در worker Python احراز‌شدهٔ سرور اجرا می‌شود. کلاینت فقط O(cells) شاهد دارد: طول شبکه، موقعیت سلول، تعداد/گام زمانی، رابطهٔ آنتالپی/دما/کسر مایع، حدود فیزیکی، یکنواختی پروفیل گرمایش، عمق معادل و ledger انرژی. کلاینت transient را مجدداً حل نمی‌کند. این کنترل‌ها انواع دست‌کاری را تشخیص می‌دهند، اما اثبات کامل PDE نیستند؛ خروجی ساختگیِ سازگار با همهٔ این روابط لزوماً از نظر زمانی صحیح نیست. صحت الگوریتم از آزمون‌های مستقل Neumann/همگرایی حاصل می‌شود، نه صرفاً از schema یا هش.

بودجهٔ ورودی plan: cells<=512، steps<=200000، cells*steps<=20000000. نرخ/تایم‌اوت، محدودیت هم‌زمانی و اندازهٔ خروجی همان سیاست موجود research API است. مقادیر غیرfinite، کلید اضافه، wall<=melting و budget اضافی قبل از اجرای worker رد می‌شوند. عملیات خودش هیچ شبکه یا path ورودی اجرا نمی‌کند.

دامنهٔ دقت فیزیکی و پارامترهای مرجع در STEFAN-SPATIAL.fa.md است. دادهٔ مستقل70رقمی frozen، معادلات/پارامترهای benchmark هستند، نه اندازه‌گیری پروژه یا replay خروجی COMSOL. این چرخه دادهٔ تجربی جدیدی به‌دست نیاورده است. هیچ خروجی به مالی/annual-energy متصل نیست؛ projectApproval=blocked و validationStatus=not_field_validated پابرجاست.

## سه مرور و پژوهش

1. مرور مرز اجرا: از بازحل PDE در UI جلوگیری شد؛ سپس مرجع Neumann و رابطهٔ انرژی STEFAN-SPATIAL بازبینی و شاهد O(cells) از solver جدا شد.
2. مرور سلامت ادعا: ledger به‌تنهایی شاهد PDE نیست؛ سپس جستجوی «Stefan enthalpy mesh/time convergence» منابع منتشرشدهٔ همگرایی را یافت. نتیجهٔ ScienceDirect با Neumann-type boundary معادل مرز دمای ثابت این مدل نیست و benchmark جایگزین اعلام نشد. منبع کشف‌شده: https://www.sciencedirect.com/science/article/abs/pii/S0096300302008469 (snippet، نه متن کامل). مرجع منتشرشدهٔ DG-FEM: https://www.tandfonline.com/doi/full/10.1080/10407790.2023.2211231 (snippet؛ ادعای بازتولید نداریم). محدودیت همگرایی و تفکیک verification/validation حفظ شد.
3. مرور امنیت/سازگاری: جداسازی flag، اعتبارسنجی قبل از spawn و archive/cancel؛ سپس آزمون واقعی API/SDK و Chromium به‌همراه بازاجرای مرجع70رقمی،13 آزمون kernel و کل زنجیرهٔ regression قبلی انجام می‌شود. نتیجهٔ اجرا در receipt است، نه ادعای مستقل ممیزی میدانی. تست جدید Chromium برای رهگیری قطعی capabilities، service worker را در context آزمون مسدود می‌کند؛ آزمون مستقل lifecycle سرویس‌ورکر نیست. خطای type در harness و عبور درخواست از رهگیر Playwright به‌علت سرویس‌ورکر در اجرای نخست شناسایی و در خود تست اصلاح شد؛ CSP برای تست تضعیف نشد.

## گیت و وضعیت باقیمانده

`PVLIB_PYTHON=... PVLIB_REFERENCE_PYTHON=... npm run verify:spatial`؛ receipt در `docs/audit/SPATIAL-INTEGRATION-GATE.json` است. فقط ready-for-review روی هش فایل‌های جاری معتبر است. راهنماهای پیشین kernel-only شرح تاریخی برش قبلی‌اند؛ این سند وضعیت ادغام جدید را بیان می‌کند.

A1 تا D3 همچنان کامل نیست: calibration/UQ پروژه، sizing/lifecycle کامل، pipeline عملیاتی و RUL، geometry/Radiance، پروتکل/دادهٔ باتری و runaway، EQE فناوری، registry رسمی/GFM، holdout کاربردهای زمین/آب، coupling PV-T/PEM، calibration interval و inventory reconciliation و workflow provider opt-in بازند. این کار آنها را بسته اعلام نمی‌کند.
