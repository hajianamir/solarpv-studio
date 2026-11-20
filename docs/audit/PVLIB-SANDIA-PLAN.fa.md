# طرح پیش از کد — اینورتر Sandia، موتور 1.5.0
تاریخ 2026-11-03. موجودی: موتور 1.4.0 با De Soto و MPPT، SAPM/Faiman و سقف صادرات؛ شاخه پاک.

## پژوهش
- API رسمی pvlib 0.13.1: https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.inverter.sandia.html ؛ ۹ پارامتر Paco/Pdco/Vdco/Pso/C0/C1/C2/C3/Pnt. مدل خودش MPPT/current limit را اعمال نمی‌کند.
- منبع مستقل Sandia PVPMC: https://pvpmc.sandia.gov/modeling-guide/dc-to-ac-conversion/sandia-inverter-model/ ؛ A=Pdco(1+C1(V−Vdco))، B=Pso(1+C2(V−Vdco))، C=C0(1+C3(V−Vdco)) و Pac=(Paco/(A−B)−C(A−B))(Pdc−B)+C(Pdc−B)^2.
- سورس رسمی https://pvlib-python.readthedocs.io/en/v0.13.1/_modules/pvlib/inverter.html : برخلاف عبارت مبهم توضیح API، شرط startup در کد **p_dc < Pso** است، نه Pac<Pso و نه Pdc<B. سپس خروجی −Pnt، clipping بالای Paco. آزمون دقیقاً همین شرط را با مرجع مستقل فرمول ترکیب خواهد کرد.

## قرارداد و تصمیم‌ها
system.sandia اختیاری: ۹ پارامتر صریح به‌علاوه modelMinDcV/modelMaxDcV/modelMaxDcPowerW به‌عنوان دامنه اعلامی اعتبار برازش؛ بدون lookup یا تخمین تجهیز. مستندات محدوده برازش باید در provenance ثبت شود.
فقط همراه system.electrical و additionalDcLossPct=0: ولتاژ باس و توان سازگار لازم است؛ مدل تلفات توان ثابت، افت ولتاژ کابل را مشخص نمی‌کند و بدون قرارداد جدید نباید به ورودی اینورتر نگاشت شود. inverterPdc0W باید دقیقاً Pdco باشد (معنی Pdco توان DC مرجع است نه حفاظت سخت). ضرایب eta قدیمی حفظ اما غیرفعال.
Vdco داخل دامنه مدل، دامنه MPPT داخل دامنه مدل، Pdco>Pso و Pdco>=Paco؛ modelMaxDcPowerW>=Pdco. پارامترهای A>B و B>=0 در دو سر محدوده (خطی) و توان/ولتاژ عملی داخل محدوده؛ تخطی موجب رد مطالعه، نه extrapolation خاموش.
در توان صفر از برازش در V=0 استفاده نمی‌شود؛ مصرف صریح −Pnt (Pso مثبت) اعمال می‌شود. مثبت خروجی Sandia تولید، منفی آن واردات مصرف اینورتر است. acW/acWh همچنان صادرات غیرمنفی پس از سقف‌اند؛ inverterNetAcW قبل از سقف signed، inverterSelfConsumptionW/Wh جدا غیرمنفی، netGridWh=acWh−inverterSelfConsumptionWh signed. سقف صادرات روی واردات اثری ندارد. ادعای کنترل startup/hysteresis واقعی نداریم.
تمام عددیات در worker هش‌شده. مقایسه خودکار مدل AC متفاوت مسدود. فرم، اجرا، آرشیو/بازیابی، CSV/JSON و گزارش لازم. آزمون مستقل معادله، حساسیت ولتاژ/ضرایب، clipping، startup مرزی، شب، قیود دامنه و عدم دوباره PVWatts، ترکیب کامل، آزمون عملی مرورگر و exact-SHA CI. حالت‌های قبلی بدون sandia باید دقیقاً ثابت بمانند.
