# سه مرحلهٔ اپتیکی — موتور 1.6.0

## مرحلهٔ ۱: انتقال تابش آسمان Perez
در اقلیم ← ساخت مطالعه، «مدل انتقال تابش آسمان» را انتخاب کنید:
- Hay–Davies: حالت قبلی؛ نبود `system.skyDiffuseModel` هم همین معنا را دارد.
- `perez`: ضرایب ثابت منتشرشده `allsitescomposite1990`، جرم هوای **نسبی** Kasten–Young 1989 و هندسه در midpoint بازه.

Perez در این نسخه فقط برای صفحهٔ منفرد ثابت یا tracker است. `perez + rowIrradiance` هم در TS و هم Python صریحاً رد می‌شود؛ API infinite_sheds مسیر موجود با Hay–Davies حفظ شده و fallback پنهانی نداریم. بازگشت به Hay–Davies باید انتخاب خود کاربر باشد.

مدل Perez فقط sky diffuse را تغییر می‌دهد؛ ground reflected جدا و beam بر پایه هندسه است. چون مدل به جرم هوای تعریف‌شده نیاز دارد، برای midpoint زیر افق فقط تابش‌های صفر پذیرفته می‌شوند؛ DHI/GHI مثبت شب در این حالت رد می‌شود. هیچ دادهٔ گمشده‌ای پر یا صفر نمی‌شود. صفر خروجی شب صرفاً نتیجهٔ هندسه و ورودی صفرِ موجود است. Perez بین binهای clearness ناپیوسته است؛ به‌معنای دقیق‌تر بودن همیشگی نسبت به Hay–Davies نیست.

## مرحلهٔ ۲: IAM فیزیکی شیشه
گزینهٔ «مدل IAM مستقیم: Physical glazing» شیء اختیاری `system.physicalIam` را می‌سازد. هر شش پارامتر باید صریح و با منبع معتبر باشند:

| فیلد | واحد/معنا | حدود نرم‌افزاری |
|---|---|---|
| `frontN`, `rearN` | ضریب شکست شیشه جلو/عقب، بی‌بُعد | ۱٫۰۱ تا ۳ |
| `frontK`, `rearK` | ضریب extinction، 1/m | ۰ تا ۱۰۰ |
| `frontL`, `rearL` | ضخامت شیشه، m | ۰٫۰۰۰۰۱ تا ۰٫۰۲ |

محاسبه با `pvlib.iam.physical`، بدون AR، برای پوشش تک‌لایه است. بر پایه Snell، Fresnel و Bouguer، عبور نور در زاویه موردنظر به عبور نور در برخورد عمود تقسیم می‌شود؛ بنابراین IAM عمود یک است، نه عبور مطلق شیشه. تابش پشت سطح (AOI≥90°) سهم beam مؤثر ندارد.

فقط **beam** تغییر می‌کند؛ IAM diffuse همچنان unity است. مقادیر `iamB` و `rearIamB` قدیمی حفظ ولی غیرفعال‌اند. در صفحهٔ منفرد، پارامترهای rear حفظ ولی غیرفعال‌اند؛ در ردیف، پارامترهای مستقل front/rear استفاده می‌شوند. این مدل شیشه با چند لایه، پوشش ضدبازتاب، آلودگی یا شکست طیفی شیشه نیست. ضرایب منبع نمونه به پروژه تعمیم خودکار داده نمی‌شوند.

## مرحلهٔ ۳: اصلاح طیفی SAPM
گزینهٔ «اصلاح طیفی: SAPM absolute airmass» شیء اختیاری `system.sapmSpectral` را می‌سازد:

| فیلد | تعریف | حدود نرم‌افزاری |
|---|---|---|
| `A0` تا `A4` | ضرایب empirical وابسته به ماژول؛ AM بی‌بُعد | هر کدام −۱۰ تا ۱۰ |
| `minAbsoluteAirmass` | کمینهٔ معتبر برازش | ۰٫۱ تا ۴۰ |
| `maxAbsoluteAirmass` | بیشینهٔ معتبر برازش | ۰٫۱ تا ۴۰ و بزرگ‌تر از min |

`f1 = A0 + A1*AMa + A2*AMa² + A3*AMa³ + A4*AMa⁴`

AMa از Kasten–Young 1989 و فشار استاندارد محاسبه‌شده از ارتفاع سایت به دست می‌آید؛ فشار اندازه‌گیری‌شده نیست. ضرایب و دامنه معتبر باید از منبع پروژه بیایند و در `parameterProvenance` ثبت شوند. هیچ lookup، برازش خودکار یا دامنه حدسی نداریم.

تنها در `effective optical irradiance > 0` فعال است. AM نامعین یا خارج از دامنه، چندجمله‌ای غیرمتناهی/غیرمثبت یا عامل بیش از ۲ مطالعه را رد می‌کند. عامل بالاتر از یک ممکن است؛ این الزاماً loss نیست. پیش از فراخوانی pvlib، چندجمله‌ای خام بررسی می‌شود تا clipping داخلی pvlib مقدار منفی را پنهان نکند. این guardهای نرم‌افزاری اعتبار علمی دامنهٔ اعلامی را ثابت نمی‌کنند.

اصلاح دقیقاً **یک‌بار** پس از IAM و جمع تابش مؤثر front/rear، پیش از DC اعمال می‌شود. thermal POA و دما را تغییر نمی‌دهد. در ردیف، همان عامل برای جمع دو طرف استفاده می‌شود؛ این تقریب، تفاوت طیفِ نور بازتابی پشت و آسمان جلو را مستقل مدل نمی‌کند. این توسعه نه کل مدل SAPM، نه طیف طول‌موجی، و نه اصلاح مستقل بخار آب/آئروسل است.

## خروجی و تفسیر آن
در حالت طیفی، چهار ستون جدید ثبت می‌شود:
- `spectralInputIrradianceWm2`: تابش مؤثر اپتیکی پس از IAM، **پیش از طیف**؛
- `spectralFactor`: عامل بی‌بُعد؛
- `absoluteAirmass`: جرم هوای مطلق در نقاط فعال؛
- `spectralActive`: یک در نقاط اعمال اصلاح؛ صفر برای تابش مؤثر صفر.

`effectiveIrradianceWm2 = spectralInputIrradianceWm2 * spectralFactor` مقدار نهایی الکتریکی است. در نقاط غیر‌فعال، factor و AM با صفر sentinel و `spectralActive=0` گزارش می‌شوند؛ این صفر، تخمین جرم هوای واقعی یا پرکردن weather نیست. AM شب تعریف‌نشده وارد چندجمله‌ای نمی‌شود.

در ردیف، `frontEffectiveIrradianceWm2`، `rearEffectiveIrradianceWm2` و انرژی `rearEffectiveWhm2` همچنان **پیش از اصلاح طیفی** هستند؛ incident و thermal metrics هم قبلی‌اند. نام «effective rear» به اپتیک وزن‌دار قبلی اشاره دارد، نه سهم نهایی spectral. حداکثر تعداد بازه در حالت طیفی ۸۷۸۴ است؛ بدون این گزینه سقف‌های قبلی حفظ‌اند.

## گردش کار و مقایسه
هر سه مرحله به فرم، JSON سخت، بازبینی weather، اجرا، نتیجه، CSV/JSON، ذخیره IndexedDB، بازیابی/backup و گزارش HTML متصل‌اند. مدل‌ها و نسخه/هش در manifest و قابلیت‌ها ثبت می‌شوند. ترکیب مجاز سه مرحله: Perez + physical IAM + SAPM spectral روی صفحه منفرد ثابت/ردیاب، با PVWatts DC یا De Soto و اینورتر مناسب. برای ردیف، physical IAM و spectral با Hay–Davies قابل ترکیب‌اند.

تفاوت transposition، beam IAM یا spectral model مانع مقایسه خودکار است؛ ضریب متفاوت در مدل یکسان با سایر قراردادهای سازگار قابل مقایسه است. restore آرشیو تاریخی نتیجه را اجرای جدید یا اصالت تأییدشده معرفی نمی‌کند.

## آزمون و مرز اعتبار
۶۷ آزمون Python شامل ۱۱ آزمون جدید: هر هشت bin جدول مستقل Perez، هویت سطح افقی، مسیر واقعی worker و شب، رابطه مستقل Snell/Fresnel، حساسیت n/K/L، غیرفعال بودن b قدیمی، جرم هوای نسبی/فشار/مطلق و چندجمله‌ای مستقل، حساسیت A0..A4، عدم تغییر thermal و اعمال یک‌باره پس از rows، دامنه‌های نامعتبر، ترکیب کامل، محدودیت تعداد و خروجی ۸۷۸۴‌بازه‌ای زیر ۱۶MiB. annual fixture تاریک فقط منابع و قرارداد خروجی را می‌آزماید، نه تولید سالانه.

fixture `optical-reference-parameters.json` صریحاً ورودی synthetic آزمون است، نه تجهیز پیش‌فرض یا مشخصات تأییدشده پروژه. workflow/API/مرورگر واقعی ورود، اجرا، restore، گزارش و رد Perez+rows را می‌آزمایند. نمونه‌های خروجی شش حالت قبلی بدون opt-in با موتور 1.5.0 دقیقاً برابرند.

آزمون‌ها field validation، calibration، bankability، انطباق استاندارد یا هم‌ارزی SAM نیستند. IAM پخشیده، طیف مستقل عقب، mismatch/bypass، کنترل دینامیکی/حفاظت، کابل، باد/برف و سازه با این توسعه تکمیل نمی‌شوند. Docker آزموده نشده است.

## منابع خوانده‌شده
- Perez API نسخه 0.13.1 (AM نسبی): https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.irradiance.perez.html
- معادله و جدول مستقل Perez: https://pvpmc.sandia.gov/modeling-guide/1-weather-design-inputs/plane-of-array-poa-irradiance/calculating-poa-irradiance/poa-sky-diffuse/perez-sky-diffuse-model/ . متن PVPMC در brightness از عبارت absolute استفاده می‌کند؛ اجرای این نسخه مطابق API pvlib از **relative** استفاده می‌کند و آزمون جدول با AM ورودی صریح است.
- Physical API: https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.iam.physical.html
- مرجع مستقل physical IAM و اصلاح Snell: https://pvpmc.sandia.gov/modeling-guide/1-weather-design-inputs/shading-soiling-and-reflection-losses/incident-angle-reflection-losses/physical-iam-model/
- SAPM spectral API: https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.spectrum.spectral_factor_sapm.html
- معادله مستقل f1: https://pvpmc.sandia.gov/modeling-guide/2-dc-module-iv/point-value-models/sandia-pv-array-performance-model/
