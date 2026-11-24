# تکمیل لایه الکتریکی مستقیم — پیش از کدنویسی، ۲۰۲۶-۱۱-۰۳

مبنا acc2a77؛ موجودی: PVWatts DC تجمیعی، سطح ثابت/ردیاب و تابش ردیفی دوطرفه موجودند؛ I–V و MPPT ولتاژی وجود ندارند. دامنه این مرحله ماژول‌های یکسان در تابش و دمای یکنواخت، مدل De Soto/تک‌دیودی و نقطه کار ایده‌آل محدود به پنجره ولتاژ و سقف جریان است؛ نه mismatch یا bypass یا تأیید طراحی ایمنی.

## منابع معتبر بررسی‌شده

- https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.pvsystem.calcparams_desoto.html : پنج پارامتر وابسته به تابش/دما، alpha_sc با واحد A/°C، a_ref برحسب V و شامل n×Ns×Vth؛ EgRef و dEgdT باید با روش استخراج پارامترها سازگار باشند؛ dEgdT واحد1/K و عموماً منفی است.
- https://pvlib-python.readthedocs.io/en/v0.13.1/gallery/iv-modeling/plot_singlediode.html : نمونه Canadian Solar CS5P-220M، شش نقطه عددی منتشرشده و Lambert W؛ داده‌های نمونه فقط fixture نرم‌افزاری‌اند و خودکار به پروژه وارد نمی‌شوند.
- https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.pvsystem.i_from_v.html : جریان از ولتاژ با Lambert W، دامنه پارامترهای مثبت و Rsh بی‌نهایت مجاز در حد تاریکی؛ NaN هواشناسی نباید با صفر جایگزین شود.
- https://pvpmc.sandia.gov/modeling-guide/2-dc-module-iv/single-diode-equivalent-circuit-models/ : معادله مستقل Kirchhoff/Shockley و شرط ماژول‌های یکسان و uniform irradiance/temperature برای scaling سری/موازی. مرجع مستقل residual I–V در تست‌ها، نه ادعای field calibration.

## قرارداد و تصمیم‌های اجرایی

`system.electrical` اختیاری strict با16 پارامتر صریح: alphaScAperC، aRefV، iLRefA، iORefA، rShRefOhm، rSOhm، egRefEv، dEgdTPerK، modulesPerString، stringsInParallel، mpptMinV، mpptMaxV، maxDcV، maxInputCurrentA، designMinCellTemperatureC و designMaxEffectiveIrradianceWm2. هیچ fit، نام ماژول یا پارامتر diode حدس زده نمی‌شود؛ provenance همان منبع تجهیزات الزامی است.

در نبود electrical تمام اعداد قبلی حفظ می‌شوند. در حضور آن De Soto→singlediode جای PVWatts DC را می‌گیرد؛ gammaPdcPerC ورودی legacy غیرفعال است. pdc0 آرایه صرفاً nameplate اعلام‌شده است و باید با MPP مرجع ماژول×تعدادها در تلورانس۲٪ سازگار باشد؛ scaling دوباره با آن انجام نمی‌شود. مرجع تابش1000W/m² و دمای25°C صریح در manifest. ماژول‌های هر رشته و رشته‌های موازی یکسان فرض می‌شوند.

بیشینه DC نامی ورودی همچنان inverterPdc0W و همان PVWatts inverter است؛ مدل ولتاژ-وابسته یا چند MPPT اینورتر ادعا نمی‌شود. نقطه کار قبل از additionalDcLossPct گزارش می‌شود؛ تلفات ثابت بعد از آن فقط یک بار اعمال می‌شوند.

MPP نامحدود از pvlib؛ نقطه ولتاژ در بازه MPPT محدود می‌شود. اگر سقف جریان نقض شود، با حل ریشه I(V)=Imax روی منحنی I–V به ولتاژ بالاتر می‌رویم؛ I در همان V به‌طور غیر فیزیکی قیچی نمی‌شود. اگر هیچ نقطه مجاز در پنجره نباشد، خاموشی صریح state4 است. تاریکی واقعی state0 است. Voc بالاتر از maxDcV در سناریوی طراحی سرد یا هر sample باعث رد کل مطالعه می‌شود، نه قطع ساختگی ولتاژ برای پنهان‌کردن نقض. بررسی طراحی فقط همان Tmin/Geff اعلام‌شده است و جای استاندارد/تأیید نصب را نمی‌گیرد.

حدود عملیاتی: حداکثر8784 رکورد در electrical، cell temperature محاسبه‌شده -100..150°C، قیود صحیح integer سری/موازی، mpptMin<mpptMax<=maxDcV. این bounds guardrailاند نه دامنه کالیبراسیون.

مقایسه PVWatts/diode در کتابخانه به‌طور خودکار مجاز نمی‌شود: مدل DC متفاوت است. سناریوهای diode در همان مدل/worker/dependencies و weather/site قابل مقایسه‌اند. این مرز از تعبیر اختلاف الگوریتم به gain فیزیکی جلوگیری می‌کند. موتور1.3.0 و request schema فعلی به‌صورت افزودنی سازگار می‌ماند.

## آزمون‌ها

شش مقدار منتشرشده نمونه رسمی، residual مستقل معادله تک‌دیود، scaling سری/موازی، جستجوی شبکه مستقل نقطه مجاز، مرز ولتاژ و ریشه جریان، خاموشی بی‌نقطه/شب، safety rejection و nameplate، عدم وابستگی به gamma غیرفعال، تلفیق ردیاب+دوطرفه و thermal، حدود منابع و legacy exact regression؛ API واقعی و مرورگر فرم/خروجی/backup/report. هیچ آزمون مصنوعی جای داده میدانی را نمی‌گیرد.
