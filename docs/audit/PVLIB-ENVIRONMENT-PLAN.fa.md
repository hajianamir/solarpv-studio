# طرح پیش از کد: سه مرحله محیط تابش — 1.8.0
تاریخ 2026-11-03. شروع شاخه پاک، HEAD=d5cafa4، موتور1.7.0.

## پژوهش
- pvlib 0.13.1 horizon gallery: https://pvlib-python.readthedocs.io/en/v0.13.1/gallery/shading/plot_simple_irradiance_adjustment_for_horizon_shading.html ؛ interpolated horizon، شرط apparent elevation>horizon برای beam. مثال مرجع DNI/GHI را پیش از transposition تغییر می‌دهد؛ این پیاده‌سازی عمداً **beam-only پس از transposition** است، نه کپی کامل مثال: diffuse/circumsolar و ground GHI را تغییر نمی‌دهد. این تفاوت و محدودیت صریح است.
- Sandia PVPMC soiling: https://pvpmc.sandia.gov/modeling-guide/1-weather-design-inputs/shading-soiling-and-reflection-losses/soiling-losses/ ؛ SR سهم عبور نور و مکمل loss است. برنامهٔ صریح این توسعه مدل تجمع/شستشو/بارش Kimber، برف یا تخمین از آب‌وهوا نیست.
- pvlib ground diffuse API: https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.irradiance.get_ground_diffuse.html ؛ Gground=GHI*rho*(1-cos(tilt))/2. albedo می‌تواند numeric series باشد؛ در infinite_sheds نیز به همان ورودی داده می‌شود، بدون انتخاب surface-type یا ضریب پیش‌فرض.

## قرارداد سه مرحله
۱. system.horizonProfile={source,quality,points:[{azimuthDeg,elevationDeg}]}، حداقل۲ و حداکثر۳۶۱ نقطه، آغاز۰ پایان۳۶۰ با elevation برابر، azimuth مرتب اکید، elevation0..85°. linear interpolation؛ apparent sun elevation>horizon visible، برابری blocked. فقط isolated fixed/tracker؛ ترکیب با rowIrradiance صریحاً رد می‌شود، چون این توسعه coupling افق/ground و ردیف را حل نمی‌کند. حذف beam incident پس از transposition؛ diffuse و ground بدون تغییر. thermal POA به‌قدر حذف incident beam کم می‌شود. خروجی blocked beam W/m² و انتگرال Wh/m²، نه mismatch یا DC energy loss.
۲. system.soilingSchedule={source,quality,records:[{timestamp,frontRatio,rearRatio}]} با SR0..1؛ هر دو نسبت صریح، rear در isolated حفظ ولی غیرفعال. بر optical effective پس از IAM/وزن‌های bifacial و قبل از spectral دقیقاً یکبار اعمال می‌شود؛ thermal POA مستقل باقی است. اجزای clean optical front/rear قبلی حفظ و soilingInputIrradianceWm2/loss جدا ثبت می‌شوند.
۳. system.albedoSchedule={source,quality,records:[{timestamp,albedo}]}0..1، جایگزین scalar albedo فقط با opt-in، scalar حفظ ولی غیرفعال. ورودی سری به هر دو transposition isolated و infinite_sheds؛ usedAlbedo برای audit. این حالت مدل snow/melt یا بازتاب طیفی نیست.

برنامه‌ها کامل، timestamp پایان بازه و mean مطابق weather، هم‌تراز دقیق در UTC، Z/offset معادل پذیرفته؛ هیچ fill/interpolation زمانی/سری ساختگی برای پروژه تولید نمی‌شود. هر منبع provenance مستقل دارد. CSV ساده بدون quote در فرم برای profile/schedules؛ max8784 environment records. سنجش خروجی ترکیب کامل سال کبیسه لازم است؛ اگر سقف فعلی۱۶MiB کافی نبود، سقف bounded خروجی را با اعلان capability و تست منابع افزایش می‌دهیم، نه حذف ستون یا truncation.

مسیر فرم→review→run→archive/restore→compare/report و CSV/JSON؛ models/units/version/hash صریح. مدل ناسازگار خودکار مقایسه نمی‌شود. تست مستقل interpolation/visibility، نسبت خطی soiling، رابطه albedo، حساسیت front/rear، thermal/spectral ordering، قرارداد UTC/missing/invalid و API/browser واقعی. نتیجه عددی قبلی بدون opt-in دقیقاً حفظ شود. نه ادعای field/bankability/ساختار/حفاظت/مدل کامل سایه.
