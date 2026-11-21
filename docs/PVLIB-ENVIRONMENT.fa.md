# سه مرحلهٔ محیط تابش — موتور 1.8.0

این تحویل سه ورودی مستقل و اختیاری را به مطالعهٔ مستقیم اضافه می‌کند: **پروفایل افقِ beam-only، نسبت آلودگی سطحِ جلو/عقب، و آلبدوی بازه‌ای**. هیچ داده یا ضریب پروژه خودکار تخمین زده نمی‌شود. نبود هر گزینه مسیر قبلی را حفظ می‌کند؛ فعال‌کردن گزینه با ورودی ناقص رد می‌شود.

## ۱. پروفایل افق سایت
در فرم «افق فقط مستقیم» را فعال کنید یا `system.horizonProfile` بدهید. شیء شامل `source`، `quality` و `points` است. CSV سادهٔ بدون quote برای نقاط:

```csv
azimuthDeg,elevationDeg
0,10
180,30
360,10
```

مثال فقط قالب عددی را نشان می‌دهد، نه افق یک سایت واقعی. منبع باید survey/دادهٔ معتبر پروژه یا فرضِ صریح باشد.

قرارداد: ۲ تا ۳۶۱ نقطه؛ azimuth از شمال ساعت‌گرد، مرتب اکید از **۰ تا ۳۶۰**؛ elevation دو سر یکسان، در بازهٔ ۰ تا ۸۵ درجه. افق بین نقاط خطی است؛ شکاف دور شمال با اتصال صریح دو سر بسته می‌شود. elevation منفی، profile ناقص یا seam ناسازگار رد می‌شود، نه extrapolate یا clamp.

`beamVisible = apparentSolarElevation > interpolatedHorizonElevation`

در حالت برابری نیز beam مسدود است. حذف **فقط از POA direct، پس از transposition** است؛ POA global و ورودی حرارتی به‌اندازهٔ beam incident حذف‌شده کاهش می‌یابند. IAM پس از آن اعمال می‌شود. diffuse آسمان (از جمله circumsolar)، sky-view و بازتاب زمین از GHI ورودی تغییر نمی‌کنند.

**فقط صفحهٔ منفرد ثابت یا tracker** پشتیبانی می‌شود. ترکیب با `rowIrradiance` صریحاً رد می‌شود و هیچ fallback پنهانی به حالت بدون افق نداریم. برای مدل ردیفی، افق را خودتان غیرفعال کنید؛ این تغییر به‌معنای لحاظ‌شدن افق در ردیف نیست.

این یک مدل سادهٔ انسداد beam است، نه مدل کامل سایهٔ افق، سایه نزدیک، سهم جزئی قرص خورشید، تغییر روشنایی زمین، mismatch یا اعتبارسنجی layout. با مثال pvlib که DNI و GHI را پیش از transposition تعدیل می‌کند **یکسان نیست**؛ این نسخه عمداً diffuse و ground را دست‌نخورده نگه می‌دارد.

خروجی‌ها:
- `horizonElevationDeg`: افق در سمت خورشید؛
- `horizonBeamVisible`: صفر/یک هندسی؛
- `horizonBlockedBeamWm2`: beam incident حذف‌شده پیش از IAM؛
- `horizonBlockedBeamWhm2`: انتگرال دوره و ماه؛ **نه انرژی الکتریکی DC ازدست‌رفته**.

## ۲. برنامهٔ صریح آلودگی سطح
گزینهٔ آلودگی، `system.soilingSchedule={source,quality,records}` را می‌سازد. CSV ساده:

```csv
timestamp,frontRatio,rearRatio
2026-01-01T01:00:00Z,0.95,0.9
2026-01-01T02:00:00Z,1,1
```

این فقط قالب است، نه برنامهٔ عملیاتی یا دادهٔ اندازه‌گیری‌شده. `frontRatio` و `rearRatio` در [۰،۱]، **نسبت عبور نور باقی‌مانده** هستند، نه درصد loss. یک یعنی تمیز، صفر یعنی بدون عبور مؤثر. هر دو مقدار صریح لازم‌اند؛ rear در صفحه منفرد حفظ ولی غیرفعال است.

این برنامه **مدل تجمع Kimber/HSU، شست‌وشوی باران، برف یا تولید تصادفی سری** نیست. ضرایب باید از منبع پروژه یا فرض مستند کاربر بیایند. آلودگی یکنواخت سطحی فرض می‌شود؛ سلول آلوده، bypass و hotspot مدل نشده‌اند.

ترتیب: تابش incident → IAM و وزن‌های دوطرفه → **soiling** → spectral → DC. برای ردیف:

`soiledOptical = cleanFrontEffective * frontRatio + cleanRearEffective * rearRatio`

طیف دقیقاً یک‌بار روی این جمع اعمال می‌شود. تابش حرارتی و دما با این **modifier آلودگی** تغییر نمی‌کند؛ جذب حرارتی لایهٔ آلودگی مدل نشده است. افق و آلبدو می‌توانند مستقلاً تابش incident و دما را تغییر دهند.

خروجی‌ها:
- `frontSoilingRatio`, `rearSoilingRatio`: مقادیر برنامهٔ صریح؛
- `soilingInputIrradianceWm2`: تابش مؤثر اپتیکیِ تمیز پیش از soiling و spectral؛
- `soilingLossWm2`: تفاوت clean و soiled، پیش از spectral؛
- `soilingLossWhm2`: انتگرال دوره/ماه، **نه افت انرژی DC/AC**.

اجزای قبلی `frontEffectiveIrradianceWm2`، `rearEffectiveIrradianceWm2` و `rearEffectiveWhm2` همچنان clean optical و پیش از soiling/spectral هستند. اگر spectral فعال باشد، `spectralInputIrradianceWm2` مقدار **پس از soiling** است؛ `effectiveIrradianceWm2` نهایی ورودی DC است. یک loss را دوباره در additionalDcLossPct یا waterfall screening وارد نکنید.

## ۳. آلبدوی زمان‌متغیر
گزینهٔ آلبدوی بازه‌ای `system.albedoSchedule={source,quality,records}` را می‌سازد:

```csv
timestamp,albedo
2026-01-01T01:00:00Z,0.2
2026-01-01T02:00:00Z,0.3
```

`albedo` بین صفر و یک و broadband است. برنامه به transposition صفحه منفرد (Hay–Davies/Perez) و infinite_sheds داده می‌شود. `system.albedo` ثابت برای سازگاری حفظ ولی در این حالت **غیرفعال** است؛ `usedAlbedo` مقدار اعمال‌شدهٔ هر بازه را ثبت می‌کند.

برای صفحه منفرد، رابطهٔ ground diffuse برابر `GHI * albedo * (1−cos(tilt))/2` است. در ردیف، مدل view-factor موجود به‌کار می‌رود و سهم بازتاب زمین عقب نیز متأثر می‌شود. آلبدو مدل پیش‌بینی برف/ذوب/پوشش زمین یا بازتاب طیفی مستقل نیست؛ سطح زمین یا snow از مقدار آن حدس زده نمی‌شود.

## قرارداد مشترک داده‌ها
- هر شیء منبع و کیفیت مستقل دارد: `measured`، `weather_provider`، `user_configured` یا `assumed`. این برچسب‌ها اعلام کاربرند، نه تأیید مستقل اصالت.
- برنامه‌های soiling/albedo باید **همهٔ بازه‌های weather** را با همان تعداد، ترتیب و پایان بازه در UTC پوشش دهند. Z و offset معادل پذیرفته می‌شوند.
- همان قرارداد میانگین بازه و interval-end هواشناسی برقرار است؛ نه نمونه‌برداری instantaneous و نه interpolated time-series.
- timestamp بی‌offset، ردیف خالی، مقدار مفقود، ردیف اضافی/تکراری/نامرتب و source خالی رد می‌شود. هیچ fill، nearest-neighbor یا تبدیل واحد حدسی نداریم.
- CSV ساده و بدون quote، header دقیق، یک newline نهایی مجاز؛ حداکثر فایل ۸MiB. profile حد۳۶۱ نقطه و زمان مطالعه با هر گزینهٔ محیطی حداکثر۸۷۸۴ بازه است.
- داده‌ای که قبلاً horizon/soiling مشابه در آن لحاظ شده نباید دوباره تعدیل شود؛ provenance و معنای weather ورودی را بررسی کنید.

## گردش کار و مقایسه
هر سه گزینه در فرم، review، JSON سخت TS/Python، اجرای واقعی، نمایش/ماه، CSV/JSON، IndexedDB/backup restore و گزارش HTML متصل‌اند. مدل‌ها، واحدها، نسخه و هش در manifest ثبت می‌شوند؛ ورودی‌های برنامه‌ها در JSON بازتولیدپذیر باقی می‌مانند. CSV خروجی مقادیر اعمال‌شده را دارد.

تفاوت حضور/نوع horizon، soiling یا albedo model مانع مقایسهٔ خودکار است. دو سناریوی هم‌مدل با ضرایب/برنامهٔ متفاوت فقط با سایر قراردادهای سازگار مقایسه می‌شوند. تغییر DC یا AC را «loss خالص محیط» تلقی نکنید، زیرا دما، قیود MPPT، clipping و واردات کمکی نیز می‌توانند اثر بگذارند.

## آزمون و مرز اعتبار
۹۱ آزمون Python (۱۲ آزمون جدید محیطی)، شامل interpolation/مرز مستقل، beam-only/closure حرارتی، افق صفر، tracker+Perez، رابطهٔ مستقل albedo و تطبیق ردیفی با ورودی ثابت هر بازه، ضرایب مستقل front/rear، ترتیب soiling/spectral، شب/opacity صفر، داده/دامنه نامعتبر و UTC offsets، انتگرال نیم‌ساعتی مرز ماه و ترکیب کامل ۸۷۸۴‌بازه‌ای زیر۱۶MiB. سقف خروجی server افزایش نیافت؛ fixture سالانه تاریک فقط قرارداد منابع و خروجی را می‌آزماید، نه yield سالانه.

fixture `environment-reference-parameters.json` صریحاً synthetic آزمون است و در UI خودکار پر نمی‌شود. تست‌های workflow/API/browser واقعی ورود فرم، restore، report و ترکیب‌های مجاز/غیرمجاز را می‌سنجند. خروجی samples/monthly/summary ۹ حالت قبلی بدون opt-in با موتور1.7.0 دقیقاً برابر ماند.

این شواهد تأیید میدانی، کالیبراسیون، bankability، استاندارد یا هم‌ارزی SAM نیستند. مدل کامل افق/پخشیده، soiling دینامیکی، mismatch، کنترل/حفاظت، باد/برف و سازه همچنان کامل‌شده محسوب نمی‌شوند. Docker آزموده نشده است.

## منابع خوانده‌شده
- pvlib 0.13.1، افق و شرط هندسی (نه الگوریتم یکسان با ما): https://pvlib-python.readthedocs.io/en/v0.13.1/gallery/shading/plot_simple_irradiance_adjustment_for_horizon_shading.html
- Sandia PVPMC، تعریف نسبت عبور نور soiling: https://pvpmc.sandia.gov/modeling-guide/1-weather-design-inputs/shading-soiling-and-reflection-losses/soiling-losses/
- pvlib، معادله و ورودی albedo: https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.irradiance.get_ground_diffuse.html
