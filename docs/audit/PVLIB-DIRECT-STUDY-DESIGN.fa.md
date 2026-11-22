# پیش از پیاده‌سازی: مسیر مستقل مطالعهٔ مستقیم pvlib

تاریخ ۲۰۲۶-۱۱-۰۳؛ شاخه `arena/237e6ea2-solarpv-studio`؛ baseline `5438fb59f4bb5cde05c20818b780464e1fe28752`.

## تحقیق انجام‌شده و تصمیم‌های مبتنی بر آن

منابع زیر پیش از تغییر کد اجرایی خوانده شدند؛ این مرور مستندات، اعتبارسنجی میدانی نیست:

1. [pvlib 0.13.1 ModelChain guide](https://pvlib-python.readthedocs.io/en/v0.13.1/user_guide/modeling_topics/modelchain.html): ترکیب Location/PVSystem و انتخاب مدل در مراحل مختلف؛ inference پارامترها می‌تواند مدل را تعیین کند. تصمیم: در مسیر جدید هیچ inference خاموش مدل/تجهیزات نداریم؛ مدل‌ها و پارامترها صریح و نسخه‌دار خواهند بود. اجرای مستقیم توابع pvlib انتخاب می‌شود تا intermediateها و مرز انرژی هر مرحله ثبت شوند.
2. [PVWatts DC](https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.pvsystem.pvwatts_dc.html): pdc0 توان نامی ماژول‌هاست و gamma برحسب 1/°C، نه درصد. effective irradiance پیش از soiling/spectral است. تصمیم: توان DC کل آرایه و ضریب دما صریح؛ بدون استفاده از catalog تاییدنشده.
3. [PVWatts inverter](https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.inverter.pvwatts.html): pdc0 اینورتر با pdc0 آرایه فرق دارد؛ Pac0=eta_nom*pdc0. تصمیم: دو فیلد مستقل با واحد W؛ clipping قبلی waterfall دوباره اعمال نمی‌شود.
4. [SAPM cell temperature](https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.temperature.sapm_cell.html): ضرایب به ساختار و mounting وابسته، wind در ارتفاع ۱۰ متر. تصمیم: a/b/deltaT صریح با provenance؛ باد مفقود یا ارتفاع نامشخص default نمی‌شود.
5. [Total irradiance](https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.irradiance.get_total_irradiance.html): تفکیک direct/sky/ground؛ Hay-Davies نیازمند extraterrestrial DNI. تصمیم: Hay-Davies صریح و محاسبهٔ مستقیم dni_extra با pvlib؛ albedo و azimuth شمال‌مبنا صریح.
6. [Interval averages](https://pvlib-python.readthedocs.io/en/v0.13.1/gallery/irradiance-transposition/plot_interval_transposition_error.html): solar position در timestamp لبهٔ بازه با میانگین بازه سازگار نیست؛ midpoint خطا را کاهش می‌دهد ولی حذف نمی‌کند. تصمیم: ورودی interval-average با interval-end و dt صریح؛ محاسبهٔ موقعیت در midpoint، انتگرال انرژی rectangular، ثبت این تقریب. instantaneous input در نسخه اول unsupported.
7. [PySAM Pvwattsv8](https://nrel-pysam.readthedocs.io/en/main/modules/Pvwattsv8.html): PVWattsV8 مدل ساده‌تر از pvsamv1؛ متغیرهای interdependent در API خودبه‌خود مانند UI همگام نمی‌شوند. تصمیم: نام «PVWatts V8/SAM-equivalent» به این زنجیره داده نمی‌شود؛ نسخهٔ مدل pvlib جداگانه ثبت می‌شود.
8. [PVGIS official user manual](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/pvgis-5-user-manual_en): انتخاب پایگاه داده، مکان، horizon و خروجی سری زمانی/فایل مهم‌اند. تصمیم: ورودی هواشناسی و کیفیت/منبع آن در مطالعه ذخیره می‌شود؛ اتصال خودکار PSH به سری ساعتی یا horizon ضمنی انجام نمی‌شود.

صفحات sam.nrel.gov/photovoltaic/pv-sub-models.html و pvwatts.nrel.gov در این محیط بازیابی نشدند؛ متن آن‌ها خوانده‌شده ادعا نمی‌شود. نسخه 0.13.1 برای سازگاری و بازتولید با مراجع قبلی انتخاب شده، نه با ادعای جدیدترین نسخه.

## موجودی و مرز تغییر

- backend فعلی `server.ts`: Express، parser پیش‌فرض 2 MB، rate-limit و JWT/gateway identity موجود. مسیر جدید قبل از parser عمومی limiter/body cap مستقل خواهد داشت و از identity فعلی استفاده می‌کند. Production بدون هویت معتبر fail-closed؛ dev فقط با enable صریح. اجرای shell یا command ارسالی کاربر ممنوع.
- UI فعلی ClimateTab، waterfall/finance/official report مبتنی بر موتور TypeScript است. خروجی جدید **وارد waterfall یا finance فعلی نمی‌شود**؛ مقایسهٔ دو ورودی نامتجانس علمی نیست. یک پنل مطالعه و export مستقل اضافه می‌شود. screening آفلاین حفظ و برچسب روشن آن نمایش داده می‌شود.
- الگوریتم‌های snow/Kimber قبلی، constants، tracker و structural load تغییر نمی‌کنند.
- مسیر Python جدید خارج از engine TypeScript، با تست مستقیم، نسخه pin شده، ثبت hash کد/ورودی و محیط اجرا؛ gate قدیمی دست‌نخورده می‌ماند. تست جدید Python/HTTP در CI اختصاصی اضافه می‌شود تا فرمول جدید بیرون از scanner فعلی بدون تست نماند.

## دامنهٔ نسخهٔ اجرایی اول

زنجیرهٔ fixed-tilt monofacial: SPA nrel_numpy → Hay-Davies → ASHRAE IAM روی beam (diffuse IAM=1 فرض صریح) → SAPM cell → PVWatts DC → افت DC تجمیعیِ صریح → PVWatts inverter. ورودی GHI/DNI/DHI/temp_air/wind_10m کامل و منظم حداکثر یک‌ساعت؛ timezone/offset، پارامتر تجهیزات و provenance صریح. خروجی intermediateها، انرژی همان دوره (نه annualized)، ماهانه UTC، هشدارها، ورودی دقیق و شناسنامهٔ اجرا. وضعیت not_field_validated. برف/غبار/سایهٔ مدل‌شده مستقل در این نسخه به زنجیره افزوده نمی‌شود تا double-counting رخ ندهد؛ تنها درصد DC اضافیِ صریح و برچسب‌خورده.

اجرا در subprocess محدود Python، concurrency محدود و backpressure، timeout/kill، حد bytes خروجی و ورودی، abort هنگام قطع اتصال؛ خاموش یا missing dependency یعنی unavailable، نه fallback خاموش. پاسخ قابل دانلود برای بازتولید است؛ سرور raw weather را خودکار در DB مشترک ذخیره نمی‌کند. صف پایدار چندگرهی، acquisition/provider adapters، مدل diode/CEC، باتری و اتصال به گزارش مالی اصلی خارج از نسخه اول هستند و تکمیل‌شده ادعا نمی‌شوند.

## برنامه آزمون پیش از تحویل

اعتبارسنجی قرارداد و invalid/missing/timezone/gap؛ مثال مرجع SAPM منتشرشده؛ PVWatts DC/inverter با oracle مستقل معادلات مستند؛ مقایسهٔ زنجیره با ModelChain مستقل با فرض‌های همسان؛ شب، clipping، صفر، leap-year/partial period، energy balance و midpoint. HTTP واقعی: disabled/auth/invalid input/dependency failure/concurrency/timeout/abort/body limits و اجرای موفق Python. UI مرورگر: جدایی screening، ورود/اجرا/خطا و download manifest. تمام suites موجود حفظ و اجرا شوند. خروجی تست ≠ validation میدانی؛ هیچ MBE/MAE/RMSE سایت بدون dataset مستقل گزارش نمی‌شود.
