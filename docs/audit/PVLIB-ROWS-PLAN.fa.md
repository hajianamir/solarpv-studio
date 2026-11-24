# پیش از توسعه: تابش ردیفی/دوطرفه مستقیم — ۲۰۲۶-۱۱-۰۳

مبنا `00ced4b`؛ موجودی: هندسه تک‌محوره و fixed، تابش سطح منفرد Hay-Davies، SAPM و PVWatts؛ ردیف‌ها و پشت ماژول وارد انرژی نمی‌شوند. هدف این مرحله افزودن یک مدل تابش واقعی با دامنه روشن است، نه ادعای تکمیل سازه/کنترل/نیروگاه.

## منابع بررسی‌شده پیش از کد

- https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.bifacial.infinite_sheds.get_irradiance.html : آرایه موازی هم‌فاصله و زمین افقی، view factor، سایه مستقیم و diffuse masking، height مرکز میز و pitch؛ قابل استفاده برای fixed و tracker. IAM فقط beam را کم می‌کند؛ bifaciality و shade/transmission جدا هستند.
- https://pvlib-python.readthedocs.io/en/v0.13.1/_modules/pvlib/bifacial/infinite_sheds.html (بخش‌های معرفی و get_irradiance): پشت با tilt=180-front و azimuth+180 ساخته می‌شود؛ خروجی دو سمت و جمع وزن‌دار جدا هستند. مرجع مستند DOI 10.1109/PVSC40753.2019.8980572؛ متن کامل مقاله به‌عنوان خوانده‌شده ادعا نمی‌شود.
- https://pvlib-python.readthedocs.io/en/v0.13.1/gallery/bifacial/plot_bifi_model_pvwatts.html : نمونه مرجع مشابه با pvfactors، وزن‌دهی bifaciality و PVWatts؛ thermal آن مثال Faiman و مبتنی بر effective irradiance است و نباید با SAPM قبلی یکسان معرفی شود. در این پیاده‌سازی solarfactors اضافه نمی‌شود و مثال pvfactors شاهد هم‌ارزی infinite_sheds نیست.

## قرارداد تصمیم‌گیری

`system.rowIrradiance` اختیاری و strict، همه هشت فیلد صریح: gcr .01..1، heightM .1..100، pitchM .1..100، bifaciality 0..1، rearShadeLossPct و rearTransmissionLossPct هرکدام0..100، rearIamB0..1، temperatureIrradiance از front_only/front_plus_rear. bifaciality=0 مدل monofacial با سایه تابشی ردیف‌هاست، نه همان سطح منفرد بدون ردیف. هیچ مدل جدیدی به مطالعات قبلی خودکار اعمال نمی‌شود.

فقط زمین افقی؛ همراه tracker باید axisTiltDeg و crossAxisTiltDeg دقیقاً صفر و GCR دو بخش برابر باشد. ارتفاع مرکز باید از نیم‌عرض میز×sin(بیشینه شیب) بیشتر باشد تا لبه به زمین وارد نشود. این کنترل اولیه جای تأیید سازه/terrain نیست. برای حد منابع، نسبت ارتفاع مرکز/pitch حداکثر۲ است (حداکثر۲۳ ردیف مجاور در cutoff پنج‌درجه‌ای pvlib)؛ row mode حداکثر8784 رکورد (سال کبیسه ساعتی)؛ سایر modes همان17568 رکورد.

اجرای واقعی infinite_sheds با Hay-Davies، npoints=100 و vectorize=False. ابتدا هر دو سمت با IAM=1 و bifaciality=1 و صفر کاهش ساختاری محاسبه می‌شوند؛ سپس beam IAM دو سمت جدا، diffuse unity، rear weight=bifaciality×(1-shade loss)×(1-transmission loss)، بدون تکرار IAM یا تلفات DC. خروجی raw incident، front/rear effective، سهم عقب وزن‌دار، shading fractions و irradiance مورد استفاده دما مستقل‌اند.

SAPM مدل حرارتی اختصاصی bifacial نیست: کاربر صریحاً front_only یا front_plus_rear **incident POA** را به‌عنوان thermal proxy انتخاب می‌کند؛ bifaciality ضریب تولید برق است و irradiance حرارتی را ضرب نمی‌کند. این فرض در manifest/report ثبت می‌شود و کالیبره‌شده تلقی نمی‌شود.

حفظ نتایج fixed/tracker قبلی الزامی است. موتور1.2.0؛ مقایسه سناریوهای row/isolated مجاز فقط با همان worker/dependencies/weather/site؛ علاوه بر mounting، کلیدهای rowIrradiance و temperatureIrradiance ورودی سناریو هستند، نه مجوز تفاوت arbitrary model. در گزارش تفاوت thermal proxy و optics صریح است و delta energy به‌عنوان bifacial gain مستقل نام‌گذاری نمی‌شود.

## آزمون‌ها

قرارداد دو زبان و خطای شیب/GCR/clearance/resource، oracle مستقل حد افقی بدون albedo و DNI تنها، آزمون هندسی beam shade با projection، مونتاژ مستقل دو سمت با get_irradiance_poa (wiring نه field validation)، وزن‌دهی مستقل عقب/IAM/DC/thermal، حساسیت albedo و bifaciality و فاصله، صفرشب، مقایسه نسخه قدیمی بدون row، سال ساعتی در حد حافظه/خروجی؛ API و مرورگر فرم تا Python/backup/comparison/report. همه fixtureها مصنوعی و محدود به شواهد نرم‌افزاری‌اند.
