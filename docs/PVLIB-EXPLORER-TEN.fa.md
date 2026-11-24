# ده ابزار بازبینی نتیجهٔ مطالعه

نسخهٔ ابزار: **`study-explorer-v1`**. موتور فیزیکی **1.8.0** و تحلیل قبلی **`study-insights-v1`** تغییر نکرده‌اند. این تحویل ده مرحلهٔ بازبینی و خروجی را اضافه می‌کند، **نه ده مدل فیزیکی تازه**. weather، تجهیزات، schedules و خروجی Python بازنویسی نمی‌شوند؛ هیچ دادهٔ مفقود یا سری عملیاتی ساخته نمی‌شود.

بعد از اجرای واقعی یا بازیابی نتیجهٔ معتبر، بخش «بازبینی نتیجه» ظاهر می‌شود. JSON/HTML کل دورهٔ اصلی و ابزار انتخاب بازه در دسترس‌اند؛ تفاوت ورودی دو سناریو در بخش مقایسهٔ کتابخانه است.

## ۱. انرژی روزانهٔ UTC
هر sample با مدت بازه ضرب می‌شود؛ کل انرژی بازه به **روزِ میانهٔ UTC** تخصیص می‌یابد. روز محلی سایت یا تاریخ پایان بازه ملاک نیست. سطرهای روزهای واقعاً انتخاب‌شده ساخته می‌شوند؛ روزهای خارج داده یا روز بدون midpoint پر نمی‌شوند.

تمام شاخص‌های موجود با همان معنای worker ارائه می‌شوند:
- DC پیش/پس از additional loss، صادرات AC؛
- واردات و net-grid، auxiliary/transformer/availability، self-consumption اینورتر، cap loss در صورت فعال‌بودن؛
- available MPP و constraint loss در حالت electrical؛
- تابش جلو/عقب و diagnostics افق/soiling در صورت فعال‌بودن.

واحد پسوند `Wh` انرژی الکتریکی و `Whm2` تابش تجمعی Wh/m² است؛ این دو با هم جمع نمی‌شوند. `rearEffectiveWhm2` طبق قرارداد قبلی clean optical است، نه rear پس از soiling/spectral. CSV روزانه دارای تعداد بازه، ساعات بازنمایی‌شده، SHA ورودی و مرز انتخاب است. UI برای سبک‌بودن۳۱روز اول را نشان می‌دهد؛ CSV/JSON کامل است. جمع روزها با دورهٔ انتخاب‌شده تطبیق می‌یابد، نه با yield سالانهٔ تخمینی.

## ۲. انتخاب بازه و خروجی همان بازه
آغاز و پایان را با timestamp دارای ثانیه و `Z` یا offset صریح وارد کنید. دامنه باید داخل دورهٔ واقعی فایل و آغاز<پایان باشد؛ **clamp خودکار نداریم**.

شرط انتخاب: `start <= midpointUtc < end`.

کل sample انتخاب می‌شود؛ بنابراین ساعات بازنمایی‌شده برابر تعداد×طول بازه است و ممکن است با فاصلهٔ زمانی بین مرزهای دلخواه فرق کند. بازه شکسته، انرژی prorate، weather تازه یا اجرای Python جدید ساخته نمی‌شود. انتخاب خالی معتبر است: `status=empty`، totals/statistics/peaks ناموجود و فایل sample CSV فقط header دارد؛ انرژی صفر جعلی تولید نمی‌شود.

اعشار زمان به سه رقم میلی‌ثانیه، یا قالب شش‌رقمی Python با سه صفر انتهایی پذیرفته می‌شود؛ مثلاً `.123Z` و `.123000Z` یک لحظه‌اند. `.123456Z` به‌دلیل دقت زیرمیلی‌ثانیهٔ پشتیبانی‌نشده رد می‌شود، نه اینکه بی‌صدا truncate شود. تاریخ نامعتبر، زمان بدون offset، مرز وارونه یا خارج فایل خطا می‌دهد و دانلود انتخاب نامعتبر نمایش داده نمی‌شود.

خروجی‌ها:
- JSON بررسی انتخاب با نسخه، مرزها، شرط انتخاب، آستانهٔ اختیاری، SHAها و execution اعلام‌شده؛
- CSV روزانهٔ انتخاب؛
- CSV sampleهای انتخاب‌شده با مرز انتخاب و SHA؛
- HTML قابل‌چاپِ بررسی انتخاب.

این فایل‌ها **archive قابل‌بازیابی یا اجرای تازه نیستند**. JSON اصلی و backup مطالعه را نگه دارید. تنظیمات نمایش محلی‌اند و با نتیجهٔ تازه/restore بازنشانی می‌شوند. گزارش HTML اصلی کتابخانه، مستقل از فیلتر UI، همواره تشخیص کل دوره با threshold دمای ناموجود را نشان می‌دهد؛ برای فیلتر فعلی، HTML بررسی انتخاب را دانلود کنید.

## ۳. اوج توان و زمان آن
بیشینهٔ `dcW` و `acW` در انتخاب، همراه midpoint و پایان بازهٔ اولین وقوع گزارش می‌شود. برای مدل دارای واردات، بیشینهٔ import و **signed net-grid** نیز موجود است. در تساوی، اولین نمونه در ترتیب زمانی برنده است. اگر همهٔ netها منفی باشند، بیشینه همچنان منفی است و صفر نمی‌شود.

این اعداد اوج **متوسط مدل‌شدهٔ بازه** هستند، نه transient/instantaneous peak، نامی تجهیزات، ظرفیت حفاظت یا مطالعات اتصال شبکه. پیش از مدل‌شدن import، توان واردات سخت‌افزاری برای PVWatts پایه حدس زده نمی‌شود؛ در نتیجه آن peak وجود ندارد.

## ۴. آمار دمای سلول و آستانهٔ صریح
min/max/mean دمای سلول مدل‌شده نمایش داده می‌شود. چون داده‌های پذیرفته‌شده interval منظم دارند، میانگین نمونه‌ها همان میانگین وزن‌زمانی در انتخاب است. تمام بازه‌ها، از جمله شب، در آمارند.

آستانهٔ دما **پیش‌فرض عددی ندارد**. خالی یعنی `thresholdC=null` و ساعات عبور ناموجود. اگر کاربر عدد finite در[-100,200]°C بدهد، فقط ساعات `cellTemperatureC > threshold` شمرده می‌شوند؛ برابری مشمول نیست. این حد ورودی صرفاً دامنهٔ ابزار آماری است، نه رتبه‌بندی حرارتی یا تأیید ایمنی.

این ابزار hotspot، thermal cycling، aging، lifetime، دمای قطعه اینورتر، damage یا عملکرد حفاظت را پیش‌بینی نمی‌کند. تغییر threshold نه بر دمای مدل و نه توان/انرژی اثر می‌گذارد.

## ۵. رخدادهای محدودیت صادرات AC
فقط اگر `acExportLimitW` فعال باشد:
- بازه با `acExportLimitLossW > 1e-6 W` رخداد محسوب می‌شود؛
- run متوالی یک event است؛ count، ساعات رخداد، طولانی‌ترین run و حداکثر۵نمونهٔ event ارائه می‌شود؛ شمارش کل محدود به۵نیست؛
- کل lossWh از **همهٔ بازه‌های انتخاب‌شده** انتگرال گرفته می‌شود؛ مقادیر مثبت زیر threshold نیز در کل انرژی باقی می‌مانند، گرچه event نمی‌سازند؛
- event آغاز/پایان‌شده در مرز انتخاب فقط بخش داخل انتخاب را نشان می‌دهد، نه طول کامل رخداد در خارج فیلتر.

این‌ها ساعات interval-loss هستند، نه زمان دقیق فرمان کنترلر یا outage. cap صفر معتبر و با اجرای واقعی آزموده شده است. clipping اینورتر از قبل upstream اعمال شده؛ این ابزار آن را دوباره cap loss نمی‌شمارد و توان قابل‌بازیافت یا رفتار dispatch را استنتاج نمی‌کند.

## ۶. تفکیک وضعیت‌های MPPT
فقط در electrical mode، پنج وضعیت قبلی worker با count، hours، dcWh پس از additional loss و constraintLossWh پیش از آن نشان داده می‌شوند:

| state | معنی مدل |
|---|---|
|0|dark|
|1|MPP|
|2|voltage boundary|
|3|current boundary|
|4|no feasible MPPT point|

constraint loss از `max(0,arrayMppW−dcBeforeAdditionalLossW)` مشتق می‌شود؛ worker ستون sample مستقل برای این loss ندارد. حد roundoff کوچک دقیقاً همان قرارداد موجود worker است؛ operating power بیش از MPP با اختلاف بزرگ رد می‌شود، نه اینکه با clamp پنهان شود. شاخص دوره‌ای با summary واقعی تطبیق داده شده است.

برای state بدون عضو در انتخاب، count/hours صفر ولی انرژی `null` است تا نبود مشاهده روشن بماند. MPPT غیرفعال `unavailable_model_disabled` دارد. stateها وضعیت مدل ایستای ایده‌آل‌اند، نه log کنترلر، حفاظت، خرابی یا downtime سخت‌افزار؛ حالتdark نیز لزوماً شب نجومی نیست.

## ۷. حرکت هندسی tracker
فقط در tracking mode:
- active/parked represented hours؛
- min/max/mean زاویهٔ signed theta در **همهٔ sampleهای انتخاب، شامل park**؛
- `totalActiveStepTravelDeg`: جمع قدرمطلق اختلاف theta فقط بین دو sample مجاور که **هر دو active** باشند؛
- تعداد چنین pairها و بزرگ‌ترین گام فعال.

از روی park/شب یا مرز انتخاب bridge زده نمی‌شود. انتخاب تک‌نمونه‌ای activePairs=0، مجموع گام۰ و max step ناموجود دارد؛ انتخاب خالی مجموع نیز ناموجود است. park بی‌حرکت مفروضِ مدل هندسی است، نه schedule عملیاتی واقعی.

مجموع گام‌ها نه actuator travel کامل، speed، cycle count، مصرف موتور، wear، قابلیت اطمینان، wind/snow stow یا طراحی سازه است. سمت و علامت theta همان قرارداد pvlib singleaxis است؛ الگوریتم tracker تغییر نکرده است.

## ۸. خلاصهٔ برنامه‌های محیطی اعمال‌شده
برای sampleهای انتخاب‌شده، min/max/mean آلبدوی بازه‌ای و SR جلو/عقب از ستون‌های **واقعاً اعمال‌شده** گرفته می‌شود. schedule غیرفعال ناموجود می‌ماند؛ scalar albedo از روی آن حدس زده نمی‌شود. rear SR بدون row optics با `inactive_without_rows` مشخص می‌شود، نه آلودگی مؤثر عقب.

برای horizon فعال، `blockedHours` فقط بازه‌هایی است که visible=0 و blockedBeamWm2>0؛ انسداد هندسی شبِ بدون beam به‌عنوان ساعات کاهش تابش شمرده نمی‌شود. blockedBeamWhm2 و soilingLossWhm2 انتگرال تشخیصی همان sampleها هستند، نه افت انرژی DC/AC. محدودیت‌های افق beam-only صفحهٔ منفرد، diffuse/ground بدون اصلاح، آلودگی صریح و نبود Kimber/برف همچنان برقرارند.

## ۹. جدول تراز حسابی انرژی
components در Wh، واردات کل، additional DC loss مشاهده‌شده و ورودی signed plant در صورت وجود نمایش داده می‌شوند. رابطه‌های زیر با residual و tolerance عددی جدا دیده می‌شوند:

- net-grid = export − total import؛
- before-export-cap = export + cap loss؛
- DC after = DC before × (1−declared additional loss/100)؛
- signed AC plant input = net-grid after cap + availability loss + auxiliary + transformer loss + cap loss.

import کل برای plant از `gridImportW` و برای Sandia بدون plant از `inverterSelfConsumptionW` می‌آید؛ self-consumption اینورتر **دوباره کم نمی‌شود**. برای PVWatts پایه بدون مدل واردات، رابطهٔ signed import ناموجود است، نه پیش‌بینی مصرف سخت‌افزار صفر. رابطهٔ مختص feature غیرفعال نیز unavailable است.

tolerance برابر `1e-6*max(1,abs(lhs),abs(rhs)) Wh` است. حالت خارج tolerance پنهان یا سبز نمی‌شود. این حسابداری درونی خروجی مدل است، نه تراز اندازه‌گیری‌شدهٔ نیروگاه یا شاهد مستقل صحت فیزیکی مدل. برای net/export بعضی رابطه‌ها بازنویسی همان تعریف‌اند؛ تأیید میدانی محسوب نمی‌شوند. lossهای تابشی Wh/m² وارد جدول انرژی الکتریکی نمی‌شوند.

## ۱۰. تفاوت دقیق ورودی دو سناریو
پس از انتخاب «مقایسه با نتیجهٔ فعلی» در کتابخانه، بخش جدید اختلاف‌ها را نشان می‌دهد:

- مسیر leaf هر پارامتر متفاوت، مقدار current/other و presence هر طرف؛
- طول array و مقادیر اعضای متفاوت، از جمله schedules؛
- scalarهای غیرفعال و منابع/برچسب‌ها نیز ممکن است diff شوند و لزوماً اثر عددی ندارند؛
- absent با صفر/null اشتباه نمی‌شود؛ آبجکت یا array بزرگ در هر ردیف تکرار نمی‌شود؛
- UI حداکثر۱۰۰تفاوت اول و تعداد کل را نشان می‌دهد؛ JSON شامل فهرست کامل است.

دروازهٔ مقایسه قبلی عیناً حفظ است؛ site/weather/engine/model غیرمجاز/hash/dependency ناسازگار رد می‌شوند. تفاوت نصب/row/thermal proxy فقط در whitelist قبلی مجاز است. این diff نه attribution علّی است، نه ظرفیت نرمال‌شده، نه تضمین tracking gain یا bifacial gain. HTML و React محتوای آزاد را escape می‌کنند؛ JSON یک داده است و منبع آن همچنان اعلام‌شده و بدون گواه اصالت است.

## مسیر ذخیره و بازتولید
request/result/archive schema، worker و requirements تغییر نکرده‌اند. پس از restore، همهٔ ابزارها از نتیجهٔ معتبر دوباره مشتق می‌شوند؛ فیلد تشخیص واردشده authoritative نیست. `validateResult` پیش از نمایش، evidence لازم از جمله midpoint مطابق weather، دمای عددی و ستون‌های مدل فعال را کنترل می‌کند؛ مقدار جایگزین برای دادهٔ مفقود ساخته نمی‌شود. دادهٔ خراب با خطای مشخص رد می‌شود و بازیابی ناموفق نتیجهٔ معتبر فعلی را از بین نمی‌برد.

نسخهٔ ابزار و input/worker/requirements SHA و execution اعلام‌شده در خروجی بررسی ثبت می‌شوند؛ این‌ها امضای اصالت نیستند. تغییر نسخهٔ ابزار در آینده می‌تواند تحلیل دوبارهٔ archive را عوض کند؛ اصل JSON را نگه دارید. CSVها CRLF/quoted هستند؛ مقادیر عددی گرد نمی‌شوند و stringهای بالقوه formula محافظت می‌شوند. import کردن CSV انتخاب به‌جای آب‌وهوای اصلی خودکار انجام نمی‌شود.

## شواهد آزمون و مرز اعتبار
- `scripts/test-study-explorer.ts` با شاهدهای مستقل arithmeticِ صریحاً مصنوعی: نیم‌ساعت/مرز روز کبیسه/offset، انتخاب نیمه‌باز/خالی/نامعتبر، peak و tie، threshold strict، رخدادهای متوالی و max5مثال، هر۵state، عدم bridge روی park، SR/albedo، signed balances با تغییر حساسیت DC/plant/cap، diff leaf/length/presence، CSV readback و HTML/formula escaping.
- اجرای واقعی Python: baseline و مدل کامل diode+Sandia+plant+rows+tracker+environment، capصفر، import-only Sandia بدونplant، افق و زمان .123000؛ انتگرال‌ها با summary تطبیق دارند؛ archive restore و no mutation آزموده شده‌اند.
- ۱۷۵۶۸sample آزمون منابع: تحلیل۳۶۶روزه و زیر۱MiB، بدون نگهداری نسخهٔ کپی sampleها در خروجی تشخیص؛ این fixture فقط بار/حسابداری ابزار را می‌آزماید، نه yieldسالانه.
- مرورگر واقعی: دانلود/خواندن JSON و daily/selectedCSV، انتخاب یک بازه/خالی/نامعتبر، threshold، HTML انتخاب و گزارش اصلی، input diff، tracker/MPPT/plant/environment و بازنشانی تنظیمات نمایش بعد از IndexedDB restore؛ archive ناقص بدون crash رد می‌شود.
- موتور فیزیکی، screening و حسابداری قبلی دست‌نخورده‌اند؛ هیچ الگوریتم کنترل/فیزیک جدید معرفی نشده است. field validation، calibration، bankability، استاندارد ایمنی/QC، مدل عمر/سازه یا SAM equivalence ادعا نمی‌شود. Docker آزموده نشده است.

## منابع خوانده‌شده پیش از کد
- pvlib0.13.1 singleaxis، تعریف هندسی theta: https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.tracking.singleaxis.html
- pvlib0.13.1 PVWatts inverter، AC clipping upstream: https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.inverter.pvwatts.html
- pvlib0.13.1 SAPM cell، دمای سلول مدل‌شده: https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.temperature.sapm_cell.html
- قراردادهای حسابداری/MPPT/source/time در worker موجود و راهنماهای AC-PLANT، ELECTRICAL، ENVIRONMENT و WORKFLOW-FIVE؛ این توسعه آن فرمول‌ها را تغییر نمی‌دهد.
