# برش مرجع‌دار B3 / D1 / D2

هدف: بستن بخشی از شکاف adapterهای واقعی، نه افزودن نام کتابخانه بدون اجرا. کاربران پژوهشگرند؛ خروجی صرفاً research است. کل A1–D3 هنوز نرم‌افزار/شواهد باقیمانده دارد.

## داده و پذیرش

دریافت build-time از GitHub با commit ثابت و Git blob verification؛ SHA256 و license همراه داده. engine پس از نصب آفلاین است. `docs/reference-data/manifest.json` هویت فایل‌ها را مشخص می‌کند. PVDeg weather fixture = NSRDB/PSM3 مدل‌شده، نه SCADA خرابی. PV ICE baseline = سناریوی ادبیات/برآورد و projection؛ نه inventory واقعی سایت. آزمون‌های upstream software reference هستند، نه آزمایشگاه مستقل.

سه operation پشت REFERENCE_MODELS_ENABLED و PVLIB_RESEARCH_ENABLED با auth:

1. `pvdeg_acceleration`: اجرای واقعی pvdeg0.7.0/arrhenius_deg با forcing اظهاری، واحدها و فاصلهٔ زمانی ثابت، نسخهٔ pinned؛ chamber-to-field AF، نه retention یا RUL. نمونهٔ سالانهٔ PSM3 + زنجیرهٔ upstream و tolerance قبلی upstream (12.804 ±0.1) بازپخش شود؛ oracle مستقیم Arrhenius مستقل، تاریکی صفر denominator رد، double degradation guard.
2. `pvice_massflow`: اجرای واقعی PV_ICE0.4.3 روی دو جفت فایل frozen (upstream_test و us_glass_baseline)، فقط scale نصب و override محدود collection/lifetime؛ هیچ path/dataset arbitrary. tempfile و restore cwd اجباری؛ پاک‌کردن temp. g→kg صریح، ledger ورودی/خروجی manufacturing و landfill و witnessهای upstream؛ بدون محاسبهٔ LCA یا credit خودکار از جریان جرم.
3. `coherent_optics`: اجرای tmm0.2.0 روی n/k صریح مشترک-grid و finite films، incident medium غیرجاذب، مقادیر طیفی بدون extrapolation، R/T/جذب کل؛ independent complex-matrix oracle و عددهای مرجع Mathematica در upstream tests. دامنهٔ ضخامت نوری برای جلوگیری از opacity clamp و ابهام دقت محدود باشد. هیچ technology-specific accuracy بدون measured constants/EQE ادعا نشود.

## ادغام/اجرای امن

runtime اختیاری جدا با PVLIB_REFERENCE_PYTHON برای سه operation فوق؛ عدم تنظیم runtime → fail-closed 503، نه نصب/دانلود یا fallback. قفل dependency جدا و راهنمای بازسازی؛ runtime عادی دست‌نخورده. flag پیش‌فرض off و rollback با خاموش‌کردن همان flag، بدون migration. allowlist SDK، قرارداد strict ورودی/خروجی و UI editor با loading/error/archive/cancel موجود. rate limit، auth، timeout و output budget موجود حفظ شوند.

خروجی research-api/portfolio envelope با projectApproval=blocked، not_field_validated، safetyApproval=not_assessed و evidence/runtime hash است. هیچ path مالی یا پذیرش annual-energy ساخته نمی‌شود. parser unit ambiguity، keys اضافه، budget و scientific domain را رد کند. منابع upstream هیچ دستور اجرایی برای agent/کاربر محسوب نمی‌شوند.

## گیت

unit/numerical tests actual packages و replay frozen references، no-network تازه، tamper/provenance، actual API/SDK، flag/runtime/rollback و production Chromium سه مثال، lint/types و verify:remaining کامل. readiness فقط همین adapterها و fixture replay است؛ full-roadmap همیشه incomplete و field qualification blocked. ادعای پایان همهٔ فازها مجاز نیست. فقدان دادهٔ failure/calorimetry/utility/holdout واقعی با fixture ساختگی پر نمی‌شود.
