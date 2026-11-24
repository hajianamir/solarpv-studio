# C1–C3: مشخصات تحویل پژوهشی محدود

مبنا: جدول برنامهٔ بازنگری‌شده، نه نام‌گذاری دلخواه. هر پنج مسیر زیر پشت `SCIENCE_C_ENABLED` و auth پژوهشی هستند؛ به مالی/پذیرش سالانه متصل نمی‌شوند. کاربران هدف پژوهشگر شبکه، Agri/FPV و هیدروژن/حرارت‌اند. هدف تحویل kernels واقعی با قرارداد strict، مرجع عددی و rollback است، نه گواه مقرراتی یا تکمیل کامل تمام فازها.

## C1 / grid_support

Volt–Var جدول قطعه‌خطی صریح، frequency–watt droop، پاسخ مرتبه‌اول دقیق در هر بازهٔ ثابت، محدودیت توان ظاهری/جریان و اتصال اندازه‌گیری‌شده. screening **فقط deadline قطع در محدودهٔ خارج از band اظهاری** با rulepack نسخه/منبع/document hash/context، خروجی سه‌حالته. rulepack مفقود/نامنطبق یا پاسخ اتصال نامعلوم → insufficient_evidence. anti-islanding همیشه نامعلوم، نه استنباط از droop. هیچ IEEE/utility threshold پیش‌فرض یا GFM/EMT/گواه ایجاد نمی‌شود. ورودی generic rulepack جای منبع رسمی تأییدشده نیست.

پذیرش: oracle تحلیلی پاسخ پله، دایرهٔ P/Q و current limit در افت ولتاژ، ترتیب نمونه/زمان، مرز دقیق trip deadline و missing/context، tamper و no-certificate. library قبلی dq دست‌نخورده بماند.

## C2 / agri_water

مدل روزانهٔ paired shaded/reference روی مرز زمینی یکسان. DLI با ضریب تبدیل PAR منبع‌دارِ caller، root-zone bucket و stress از TAW/RAW، ET مرجع داده‌شده (نه تخمین از تابش)، runoff/drainage و ledger آب. رشد biomass از intercepted PAR، ضریب LUE و water stress، yield با harvest index. LER از نسبت crop yield دو سناریو + نسبت انرژی PV به baseline صریح هم‌مرز؛ baseline صفر → null. بدون مدل حرارتی خرداقلیم، فنولوژی/بیماری/رشد مکانیکی محصول یا تأیید میدانی.

پذیرش: شاهد آب بسته، خشکی/سرریز، conservation، برابری shade=1، DLI تحلیلی، LER با baseline صفر و مثبت؛ روزهای gap رد شوند. ضرایب پیش‌فرض زراعی جهانی ایجاد نشوند.

## C2 / fpv_balance

دو سناریوی پوشیده/باز با reservoir سطح/ظرفیت گرمایی ثابت و evaporation potential اظهاری. پوشش تنها ضریب ورودی تبخیر زیرپوشش و جذب خورشیدی را تعدیل می‌کند، نه درصد صرفه‌جویی ازپیش‌ساخته. دمای آب با حل انرژی implicit (حساس+جابه‌جایی+تبخیر) و حجم آب با بارش/ورودی/خروجی/تبخیر؛ دامنهٔ کاهش حجم محدود برای فرض heat capacity ثابت، خشکی/سرریز بدون policy رد شوند. مصرف latent به حساب انرژی وارد شود. بدون هیدرودینامیک، stratification و دمای ماژول PV/افزایش yield ادعایی.

پذیرش: حل بستهٔ implicit Euler، ledger جرم/انرژی، پوشش صفر برابری، تبخیر صفر، رد خشک‌شدن/خارج‌دامنه؛ step/half-step برای دمای آب و gate همگرایی.

## C3 / pem_dispatch

مدل isothermal polarization با reversible voltage + asinh activation + مقاومت ohmic؛ توان متغیر خارجی، aux، startup تأخیری/مصرف، ramp جریان، minimum part-load و قطع اضطراری با کمبود توان. تولید H2 از Faraday و oxygen/water استوکیومتری. جریان در هر بازه ثابت و ramp یک قید تغییر setpoint بین بازه‌هاست، نه انتگرال جریان ramp پیوسته. ledger توان = stack+aux+curtailment، stack = HHV H2 + heat (heat می‌تواند منفی باشد یعنی external heat required). min-current از حالت خاموش حداقل نرخ ramp را نقض نکند؛ نمی‌توان از توان ناکافی انرژی ساخت. بدون مخزن فشار/کمپرسور/گرمایش گذرا/ایمنی.

پذیرش: constant-voltage Faraday با oracle بسته، startup/low power/ramp/emergency، جرم و انرژی، HHV واحد J/mol منبع‌دار، reference polarization مستقل. دادهٔ synthetic به تجهیز واقعی نسبت داده نشود.

## C3 / pvt_pcm

مدل lumped واحد سطح: PV حرارتی با جذب و efficiency خطی وابسته به T، fluid heat extraction با UA مؤثر و Tin/flow ظرفیت‌گرمایی؛ PCM enthalpy (sensible solid / plateau latent / sensible liquid). implicit Euler روی انرژی PCM با ریشه‌گیری monotone و محدودیت domain، coarse/fine time-step و gate. thermal heat خروجی می‌تواند هنگام گرم‌تر بودن سیال منفی باشد. بدون حل فضایی Stefan/ذوب‌جبهه‌ای و بدون اتصال خودکار به PEM؛ coupling تجمیعی مستقل آینده است.

پذیرش: ذوب ایزوترم زمان نهان تحلیلی، sensible transient و steady scalar oracle، ledger absorbed=PV+fluid+ambient+storage، no-double-counting و refinement. تفاوت مدل lumped با Stefan PDE صریح باشد.

## قرارداد مشترک/اجرا/گیت

strict versioned plan، source و contextSha256، timestamp offsetدار و grid پیوسته؛ بودجهٔ محدود هر operation در schema. model در Python و validation مستقل سبک TS. UI مثال/ویرایش JSON/loading/error/result/archive/cancel موجود reuse شود؛ SDK allowlist، flag مستقل، rollback با خاموش‌کردن C، no-network execution، timeout/auth/rate limit موجود حفظ شوند. هر خروجی projectApproval=blocked، safetyApproval=not_assessed، not_field_validated؛ نتیجهٔ pass عددی یا screen یعنی تطابق همین داده و فرض، نه field/utility approval.

گیت: unit و numerical witnesses پنج kernel، API/SDK واقعی و tamper/flags، production browser هر پنج مثال، scoped lint/types و کل verify:science-b (شامل A/foundation). receipt hash-bound با وضعیت partial تمام فازها. هیچ تغییر مالی/انرژی قبلی؛ هیچ قابلیت خارج از همین scope تمام‌شده شمرده نشود.
