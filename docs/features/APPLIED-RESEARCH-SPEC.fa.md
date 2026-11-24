# A1 evaluator و D3 تقویم محلی — قرارداد پذیرش

این برش کل باقیمانده‌های A1–D3 نیست. A1: evaluator غیرخطی محدود PVWatts + LCOE سناریویی، نه UQ عمومی/CI/GSA یا adoption مالی. D3: تبدیل قبض Gregorian محلی با IANA/DST و حفظ kWh، نه تعرفه/تقویم خورشیدی/OCR/LLM.

## داده/مرجع

pvlib0.13.1 و tests نسخه‌ثابت، weather fixture قبلی با POA/temp_cell مدل‌شده، و IANA2025b source/License از commit ثابت دریافت شوند. timezone runtime از package موجود tzdata2025.2 و فایل TZif همان package خوانده شود، نه نسخهٔ مجهول OS. «نمونهٔ upstream معتبر» به معنی تست نرم‌افزار است، نه accuracy field.

## pv_lcoe_scenarios

weather از registered_psm3 (سال کامل۱۹۹۹، همان بایت/واحد/زمان frozen) یا constant_reference با سال/POA/T صریح؛ حداکثر۱۶ سناریو. PVWatts DC واقعی و inverter واقعی pvlib0.13.1، static losses قبل اینورتر و clipping صریح. خروجی first-year AC، DC، loss/clipping diagnostics و projection اقتصادی سالانه با degradation بعد AC، capex زمان۰ و OPEX/replacement انتهای سال، real discount و currency صریح. هزینه/انرژی discounted و LCOE research فقط؛ صفر انرژی → null. دقت: این مدل clipping/دما nonlinear است ولی عمر فیزیکی یا دستگاه calibrated نیست. baseline undegraded و alreadyAppliedMechanisms=[] الزامی؛ هیچ مالی موجود تغییر نکند.

پذیرش: upstream golden DC/inverter، oracle جبری مستقل TS برای تمام ساعات/سناریوها، dark/lowlight/clipping، loss placement، discount zero، replacement timing و degradation، loop سال کبیسه، دادهٔ سالانه frozen و bounds؛ hash/provenance و tamper؛ بدون quantile/GSA جعلی. harmonization legacy/general nested UQ هنوز باقی است.

## bill_local_ensemble

unit فقط kWh، Gregorian سال۲۰۰۰..۲۰۹۹، monthهای متوالی≤۱۲، شکل‌های caller≤۳ با وزن۲۴ساعته. timeZone allowlist UTC/New_York/Berlin/Tehran/Kolkata/Lord_Howe؛ intervalMinutes=۳۰ یا۶۰. UTC grid پیوسته؛ label محلی با offset و fold؛ انرژی هر slot متناسب با وزن ساعت محلی × durationHours، نرمال‌سازی جداگانه هر ماه. gap ساعت بهار ساخته نشود و ساعت تکراری پاییز با offset/fold متمایز باشد. month startهای nonexistent/ambiguous و offset transition خارج از grid رد؛ Lord_Howe با step60 در transition نیم‌ساعته رد، step30 پشتیبانی. عدد پول، timezone path، تقویم مبهم و واحد غیر kWh رد.

پذیرش: NY مارس۲۰۲۴=۷۴۳h، نوامبر۲۰۲۴=۷۲۱h؛ برلین، Tehran بدون DST۲۰۲۴، Kolkata +۵:۳۰، Lord_Howe نیم‌ساعت، leap year/zero و full-year۸۷۸۴h؛ exact closure ماهانه، independent Intl witness TS و fail-closed بر اختلاف tzdb مرورگر/runtime. normalize براساس تعداد slot واقعی، نه۲۴×روز. timezone از source package نسخه‌ثابت+SHA در نتیجه. هیچ measured-load/confidence یا savings ادعا نشود.

## ادغام/گیت

دو operation پشت APPLIED_RESEARCH_ENABLED پیش‌فرض off + auth و PVLIB_RESEARCH_ENABLED؛ Python core (بدون runtime اختیاری reference) و SDK/editor موجود با state/archive/cancel؛ schema strict و بودجه. گیت شامل Python/numerical/offline، API/SDK/tamper/flag/rollback، production browser دو مثال، scoped lint/types و verify:references کامل. readiness فقط این برش؛ allRemainingItemsCompleted=false؛ rollback همان flag=false و بدون migration. no automatic finance/annual energy adoption.
