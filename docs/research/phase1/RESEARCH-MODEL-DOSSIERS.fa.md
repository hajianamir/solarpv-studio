# dossier مدل‌های پژوهشی — روابط، داده، مرجع و آزمون مستقل

این سند مکمل `MULTICLIMATE-BENCHMARK.fa.md` و قرارداد عمومی `GENERAL-PURPOSE-MODELS.fa.md` است. تاریخ برنامه 2026-11-03. **تحقیق و طراحی آزمون است، نه اعلام پیاده‌سازی/اعتبارسنجی همهٔ مدل‌ها.** روابط تحلیلی زیر که «قرارداد پیشنهادی» نام دارند، استنتاج فیزیکی‌اند؛ صرف نوشتن آن‌ها شاهد حساس مستقلِ آمادهٔ gate محصول نیست.

## قاعدهٔ مشترک coupling

مدل پژوهشی سه حالت دارد: اجرای مستقل در sandbox پژوهش؛ مقایسهٔ A/B با baseline؛ یا adoption صریح به annual stream پس از سازگاری ورودی/زمان/واحد و آزمون. فقط حالت سوم مجاز است تولید/dispatch/مالی را تغییر دهد. نمودار دمای پژوهشی یا fit آزمایشگاهی نباید بی‌اطلاع کاربر سالانه را عوض کند. نبود پارامتر فقط مدل وابسته را unavailable می‌کند؛ baseline مستقل باقی می‌ماند.

هر آزمون باید equation/version، input contract، reference مستقل، mask، units، حساسیت پارامتر، boundary و tolerances مستدل داشته باشد. فیت مدل به خروجی خودش، آزمون مستقل نیست.

## R1 — inertia حرارتی: Prilliman در برابر ODE

**مرجع مطالعه‌شده:** [pvlib 0.13.1 Prilliman](https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.temperature.prilliman.html) و `temperature.py` نسخهٔ pinned موجود در manifest مدل‌ها.

Prilliman خروجی steady-state را با میانگین وزنیِ **پنجرهٔ ۲۰ دقیقهٔ گذشته** هموار می‌کند؛ مدل مستقل دوگرهی یا بازسازی cell temperature از حسگر backsheet نیست. ورودی منظم با گام کمتر از ۲۰ دقیقه، دمای steady-state، باد در ارتفاع آرایه و جرم واحدسطح لازم است. برای گام حداقل ۲۰ دقیقه، پیاده‌سازی pinned دما را **بدون تغییر و با warning** برمی‌گرداند. upsample دادهٔ ساعتی به دقیقه‌ای، شواهد گذرای جدید ایجاد نمی‌کند.

**آزمون اجراشده:** ثابت‌ماندن سیگنال ثابت؛ NaN باد به صفر تبدیل نشود؛ ورودی ساعتی همان خروجی باشد؛ cadence نامنظم به `NotImplementedError` مشخص برسد. چهار تست PASS در بستهٔ پژوهشی. این‌ها آزمون رفتار تابع‌اند، نه کیفیت thermal prediction واقعی.

**مرجع تجربی مناسب:** SLTE یک‌دقیقه‌ای، با حذف/برچسب event خاموشی و gap؛ wind ۱۰متری برای مدل نیازمند باد array-height باید با تبدیل مستدل/حساسیت همراه باشد. اگر تبدیل مستند نیست calibration همان ارتفاع تعریف شود، نه انتقال بی‌نام ضرایب.

**قرارداد پیشنهادی ODE تک‌گرهی:** `C*dT/dt = Q - H*(T-Ta)` با C برحسب J/(m² K)، Q برحسب W/m² و H برحسب W/(m² K). برای Q,H,Ta ثابت، `T_inf=Ta+Q/H` و `T(t)=T_inf+(T0-T_inf)*exp(-H*t/C)`.

آزمون مستقل بعدی: پاسخ پله در زمان‌های مختلف، limitِ C→0 در مقایسه با steady-state، تعادل Q=0 و انرژی انتگرالی. برای دوگرهی cell/backsheet، ظرفیت‌ها مثبت و conductance متقابل باید با علامت مخالف در دو معادله ظاهر شود تا تبادل داخلی انرژی خلق نکند. C/Kهای نامشخص از جدول Faiman استخراج نمی‌شوند. آزمون پایداری با dtهای ریزشونده، initialization و warmup و عدم استفاده از آینده لازم است. Euler صریح بی‌بررسی می‌تواند ناپایدار شود؛ روش implicit/exact با مدل خطی قابل مقایسه است.

## R2 — تابش بلندموج و دوگرهی

**مرجع:** `pvlib.temperature.faiman_rad` نسخهٔ ۰٫۱۳٫۱ و راهنمای کامل خوانده‌شدهٔ [SAND2023-01949](https://www.osti.gov/servlets/purl/2293574/).

`q_rad=epsilon*sigma*F*(T_surface_K^4-T_sky_K^4)` قرارداد سادهٔ تبادل مؤثر است، نه حل کامل همهٔ view-factorهای زمین/ردیف/آسمان. استفاده از °C به توان چهار، یا استفادهٔ یک sky_view برای همهٔ هندسه‌ها خطاست. در مدل محیطی شامل downwelling، نگاشت سطح افقیِ اندازه‌گیری/برآورد به سطح مایل باید مستند باشد.

SLTE بلندموج ECMWF ساعتیِ درون‌یابی‌شده دارد؛ کیفیت آن مستقل از حسگر backsheet نیست و دادهٔ minute-level واقعی برای longwave نیست. برای fit، ساختار خطای منبع و هم‌بستگی زمانی حفظ شود. ضرایب Faiman تجمیعی با radiation صریح نباید بدون بازتعریف استفاده شوند.

**آزمون بعدی:** حالت Tsky=Tsurface باید flux صفر بدهد؛ تغییر واحد K/C آشکار شود؛ هنگام شب cooling مجاز است و Tc<Ta لزوماً خطای داده نیست؛ جمع fluxها و تغییر انرژی ذخیره کنترل شود. مقایسهٔ fit روی Tback با ادعای Tc بدون مشاهده/مدل coupling ممنوع. مدل دقیق‌تر فقط در صورت دادهٔ کافی انتخاب شود؛ steady-state مستقل متوقف نمی‌شود.

## R3 — مدار سلول/زیررشته و bypass

**اصل مرجع دریافت‌شده:** [SunPower/PVMismatch](https://github.com/SunPower/PVMismatch/tree/b391a98c5ded478a73b3c6a08e8de89024be5156)، فایل‌های pvcell/pvmodule/pvconstants و تست‌ها، BSD-3-Clause. **اجرای کتابخانه در این نوبت انجام نشد.**

کد PVMismatch دارای مدل **دو‌دیودی سلول و breakdown معکوس** است؛ `Tcell` در K و `Ee` برحسب suns است. پیش‌فرض‌های سلول مشخصات همهٔ فناوری‌ها نیستند. خروجی آن را نمی‌توان بدون همسان‌کردن model family و پارامترها، oracle عددیِ مدل تک‌دیودی فعلی نامید.

topology باید تعداد سلول، گروه‌بندی زیررشته، series/parallel/cross-tie، مسیر bypass و پارامتر دیود را صریح مشخص کند. کد مرجع bypass را روی ولتاژ زیررشته یا کل ماژول طبق configuration اعمال می‌کند؛ یک دیود فرضی برای هر سلول الزاماً topology واقعی نیست.

**آزمون مستقل لازم:**

- قبل از PVMismatch، حالات تحلیلی دو منبع/دو مقاومت سری و موازی، I–V یکنواخت و clamp دیود معلوم.
- در مدار فیزیکی، KCL/KVL و ناحیه‌های reverse/bypass؛ monotonic branch و علامت توان مصرفی/تولیدی بررسی شود.
- irradianceهای یکسان، سایهٔ یک سلول، سایهٔ یک زیررشته، bypass روشن/خاموش، عدم‌تقارن stringها، MPPT window و چند قلهٔ P–V.
- همگرایی discretization و tolerance solver مستقل از نمایش نمودار. جستجوی global MPP با قلهٔ محلی یا P&O یکی نیست.
- شدت‌های ۰٫۱/۱ suns باید با ۱۰۰/۱۰۰۰ W/m² اشتباه نشوند؛ پارامترهای ماژول بدون استخراج معتبر به سلول تقسیم نشوند.

تا زمان وجود topology و پارامترهای قابل‌اعمال، درصد mismatch یا حالت unshaded انتخاب صریحِ پایه است. خروجی cell-specific ساخته نشود؛ کل yield پایه هم قفل نشود.

## R4 — اپتیک/بایفیشال: هندسهٔ سریع در برابر finite rays

**مرجع:** `pvlib.bifacial.infinite_sheds` pinned و README/مجوز bifacial_radiance قبلاً دریافت شده است. دریافت README برابر اجرای Radiance نیست.

infinite-sheds برای ردیف‌های موازی و یکنواخت روی زمین افقی و دور از انتها مناسب است. ray tracing برای هر شکلِ ورودی بدون material/units/coordinate contract خودبه‌خود مرجع دقیق نیست. تفاوت finite field/edge با مدل infinite، خطای نرم‌افزاری الزامی نیست.

**آزمون بعدی:** صفحهٔ بدون مانع با تابش مستقیم و cosine projection تحلیلی؛ obstruction کامل و صفر؛ reciprocal view-factor روی سطوح ساده؛ سایهٔ خطی ردیف‌ها با هندسهٔ معلوم؛ همگرایی تعداد ray/patch و seed با metric خطا؛ front/rear broadband و effective irradiance جدا. albedo و bifaciality و IAM دوباره اعمال نشوند. rear irradiance به‌تنهایی mismatch الکتریکی یا دمای سطح عقب نیست.

منبع چندموقعیتی میدان DTUv3 برای بایفیشال و fixed/tracker مفید است، اما با یک دیتاست دانمارک پوشش جهانی ثابت نمی‌شود. نداشتن mesh واقعی فقط ray-level study را محدود می‌کند؛ monofacial یا مدل هندسی قابل‌اعمال قابل اجراست.

## R5 — ردیاب شیب‌دار، slew و stow

**مرجع اولیه خوانده‌شده:** [Anderson & Mikofski، NREL/TP-5K00-76626](https://docs.nlr.gov/docs/fy20osti/76626.pdf)، DOI `10.2172/1660126`؛ nomenclature/چارچوب اصلی از متن وب و پیاده‌سازی pinned `tracking.py` بررسی شد. گزارش کامل باینری محلی نیست. [PlantPredict standard backtracking](https://docs.plantpredict.com/models/tracking/backtracking/standard_backtracking) نیز خوانده شد و همین خانوادهٔ روش را معرفی می‌کند؛ سند تجاری زنده، نسخهٔ immutable یا oracle مستقلِ اثبات‌شده نیست.

در درجهٔ اول frame و علامت azimuth/axis/cross-slope تطبیق داده شود؛ مشابه‌بودن نام زاویه در دو نرم‌افزار کافی نیست. axis orientation معادل با تغییر ۱۸۰° باید همراه نگاشت علامت درست بررسی شود. هندسهٔ شیب یکنواخت، terrain نامنظم و rotation control سه مسئله‌اند.

**آزمون‌های بعدی:** زمین افقی و تقارن صبح/عصر، limits نامتقارن، شیب مثبت/منفی، دو نیمکره و عبور azimuth، row pitch و GCR، مقایسهٔ shaded fraction محاسبه‌شده با تقاطع هندسی مستقل. برای دینامیک، قید `abs(theta_next-theta)<=slew_rate*dt` و state hysteresis/recovery بعد از باد لازم است؛ باد/آستانه/تاخیر/زاویهٔ stow مشخصات configuration است، نه ثابت جهانی.

dataset خطاهای emulated ردیاب برای detection مناسب است، نه تأیید torque/ساختار/stow ایمن. یک annual energy engine نباید گواهی ایمنی سازه بدهد. نبود این داده‌ها مانع زاویهٔ هدف kinematic نیست.

## R6 — MPPT واقعی در برابر فرض MPP

**مرجع رسمی خوانده‌شده:** [IEC 62891:2020، edition 1.0](https://webstore.iec.ch/en/publication/28105)، صفحهٔ ناشر. این صفحه static و dynamic MPPT و جدایی آن از conversion efficiency در IEC 61683 را تصریح می‌کند. **متن کامل استاندارد خریداری/دریافت نشده؛ پروفایل‌های آزمون و حدود قبولی استاندارد پیاده/تأیید نشده‌اند.** متن تبلیغاتی تجهیزات جای بند استاندارد نیست.

فرض steady-state در MPP برای مدل انرژی پایه یک idealized upper opportunity است، نه الگوریتم کنترل. lag/RC پژوهشی، P&O/Incremental Conductance/controller firmware واقعی نیست.

قرارداد پیشنهادی اندازه‌گیری: `eta_mppt = integral(P_operating_DC dt)/integral(P_available_MPP_DC dt)` روی بازهٔ یکسان با توان مرجع شناخته‌شده. میانگین سادهٔ نسبت‌های لحظه‌ای در dawn/cloud و near-zero مخرج معادل این نسبت انرژی نیست. clipping/voltage/current limit باید از loss tracking جدا و در مرز یکسان گزارش شود.

**آزمون بعدی:** I–V مصنوعیِ فیزیکی با MPP مستقل برای تست کنترلر، پله و ramp و تغییر دما، قله‌های متعدد و زمان نمونه‌برداری، step-size/sampling convergence، voltage limits و start-up. این سیگنال‌ها fixture کنترل هستند، نه دادهٔ عملیاتی ساختگی. برای نام‌گذاری «کنترلر واقعی» دادهٔ firmware/نرخ نمونه‌برداری/اندازه‌گیری سریع و تست دستگاه لازم است؛ hourly energy نمی‌تواند transient controller را اعتبارسنجی کند.

## R7 — تلفات شبکه، AC load-flow و حفاظت

**مرجع روش:** قرارداد واحد/علامت pandapower 3.3.0 که قبلاً خوانده شد؛ solve مستقل این نوبت اجرا نشده است.

شبکهٔ balanced radial فعلی با unbalanced یا short-circuit/protection یکی نیست. مشخصات R/X، طول و واحد، پایهٔ ولتاژ L-L در برابر فازی، sign توان و محل کنتور باید قبل از مقایسه یکی شوند. برای مرجع کوچک دو باس می‌توان رابطهٔ مستقل `S_r=V_r*conj((V_s-V_r)/Z)` را در مقیاس **هر فاز** حل کرد و سپس با مدل سه‌فاز مقایسه کرد؛ جمع سه‌فاز را دوباره در سه ضرب نکنیم.

**آزمون بعدی:** خط بی‌بار، R=0، تلفات `I²R` با جریان معلوم، دو‌باس با حل مستقل و مشخصات ثابت، تغییر Q و voltage limits، grid import/export و conservation. همگرایی solver با engineering feasibility یکی نیست. ampacity، حفاظت و tap/unbalance تا وقتی پشتیبانی و تأیید نشده خروجی مستقل unavailable باشند. درصد تلفات پایه در مرز روشن جای حل افت ولتاژ معرفی نشود.

## R8 — خاک/برف و حافظهٔ رخداد

**مرجع دریافت‌شده:** `pvlib/soiling.py`, `snow.py` و آزمون‌ها در commit pinned. اصل داده‌های پژوهشی با مجوز/metadata جدا لازم است.

Kimber به mm بارش هر بازه، نرخ انباشت، threshold، grace period و تاریخ wash نیاز دارد؛ cumulative daily precipitation مثل mPERT باید ابتدا به increment تبدیل شود. منفی‌شدن diff در reset روزانه، «بارش منفی» نیست. فقدان داده، بارش صفر نیست؛ این تمایز آزمون منفی لازم دارد.

coverage_nrel بارش برف cm در هر بازه و عمق ground برحسب cm می‌خواهد و validation اصلی fixed-tilt است. SWE، mm باران و snow_depth قابل جایگزینی مستقیم نیستند. latent heat و ذوب مکانیکی و بار سازه‌ای حوزه‌های جدا هستند.

**آزمون بعدی:** بدون رخداد/با رخداد wash، grace period در برابر manual wash، گام زمانی و بارش threshold، snowfall و sliding، وضعیت اولیه، gap و restart. state و warmup در split فصلی نشت نکنند. دادهٔ روزانهٔ برف برای ادعای واکنش دقیقه‌ای کافی نیست. مدل فرضی ماهانه/اثر لحاظ‌نشده مجاز است ولی با نام روشن.

## R9 — باتری، dispatch و کفایت off-grid

**مرجع:** کد SSC ظرفیت/dispatch BTM/FOM نسخهٔ pinned در manifest مدل‌ها؛ اجرای کامل SAM این نوبت انجام نشد.

مدل energy-bucket از مدل voltage/capacity/thermal/lifetime جداست. جریان‌محور Ah با انرژی kWh بدون ولتاژ و راندمان یکسان نیست. ذخیرهٔ SOC اولیه و نهایی و ظرفیت واقعی/نامی، محدودیت توان و charge source باید در همان مرز ورودی تعریف شوند.

**آزمون بعدی:** شارژ/دشارژ با حساب انرژی مستقل، باتری پر/خالی، end effects سالانه، round-trip تنها یک‌بار، همزمانی charge/discharge، قطع شبکه و no-grid-charge، صادرات محدود، بار صفر/بالا و unmet energy. زمان Loss-of-load و نسبت انرژی تأمین‌نشده یکی نیستند. برای الگوریتم greedy ادعای optimal نکنیم؛ perfect foresight با online controller جدا گزارش شود.

برای مدل عمر، chemistry-specific و دما/DoD/c-rate لازم‌اند؛ نبود منحنی عمر مانع سناریوی انرژی پایه نیست، ولی فرض replacement/degradation در اقتصاد باید آشکار باشد. بازده یا عمر عمومی برای همهٔ batteryها hard-code نشود.

## R10 — PVT/BIPVT و مبدل حرارتی

**مرجع اولیهٔ مطالعه‌شده:** [IEA SHC Task60 Report C1، RC1 Revision 1، 2020-09-28](https://www.iea-shc.org/Data/Sites/1/publications/IEA-SHC-Task60-Numerical-Ssimulations-for-PVT.pdf)، DOI `10.18777/ieashc-task60-2020-0006`؛ بخش‌های معرفی ابزارها، فهرست روش‌ها و نمونهٔ مدل absorber با CFD-FEM از متن وب خوانده شد. بخش‌هایی فراتر از سقف استخراج PDF/گزارش کامل را خوانده‌شده فرض نمی‌کنیم. Report B1 در جستجو شناسایی شد ولی fetch کامل ناموفق بود؛ از جزئیات جستجو برای ادعای ISO compliance استفاده نمی‌شود.

مهم‌ترین تفکیک: PV backsheet thermal inertia، PVT دارای برداشت سیال، و BIPVT دارای شرایط مرزی ساختمان یک مدل نیستند. انرژی حرارتی مفید به `mdot*cp*(Tout-Tin)` وابسته است؛ مقدار الکتریکی باید از دمای cell سازگار محاسبه شود. مساحت gross/aperture/cell و واحدهای ضرایب باید همان مرجع characterization باشد.

**آزمون بعدی:** موازنهٔ incident/absorbed/electric/useful heat/loss/storage، جریان صفر و stagnant collector (رابطهٔ خروجی با تقسیم بر mdot در این نقطه معتبر نیست)، افزایش دبی و محدودیت انتقال حرارت، دمای ورودی/خروجی، محیط ساختمان/تهویه و شرایط مرزی. معادلهٔ steady-state efficiency با مدل quasi-dynamic ISO و ظرفیت مؤثر بدون نگاشت ضرایب یکسان نیست. برداشت حرارت و راندمان الکتریکی را دو بار از همان شار انرژی کم نکنیم.

تا زمانی که collector characterization قابل‌اعمال موجود نیست، فقط ماژول PVT/BIPVT محدود است؛ محاسبهٔ PV-only با حذف صریح thermal extraction قابل ارائه است. ضریب ۳٫۵، پارامتر خاک یا یک مقالهٔ خاص جای مشخصات collector عمومی نیست.

## R11 — عدم‌قطعیت و انتقال بین اقلیم‌ها

**مرجع ناشر خوانده‌شده:** [BIPM JCGM 101:2008](https://www.bipm.org/en/doi/10.59161/jcgm101-2008)، DOI `10.59161/JCGM101-2008`. صفحهٔ رسمی scopeِ propagation of distributions با Monte Carlo را تأیید می‌کند؛ دریافت متن کامل PDF در این نوبت ناموفق بود، بنابراین ادعای انطباق کامل با بندهای آن نداریم.

**طرح مطالعه:** منابع metrology، هواشناسی/سال‌به‌سال، پارامتر، model discrepancy و operating events جدا؛ ارتباط زمانی/بین حسگرها/بین سایت‌ها حفظ شود. توزیع انتخابی و covariance باید مستند باشد. درصد ثابت عمومی یا استقلال اجباری به مدل تحمیل نشود. مدل غیرخطی با clipping/battery/curtailment، تبدیل سادهٔ annual-P90 به ضرب همهٔ ساعت‌ها را توجیه نمی‌کند.

**آزمون مستقل بعدی:** جمع خطی با covariance معلوم (واریانس تحلیلی)، ضرب/نسبت با دامنهٔ معتبر، توزیع‌های bounded، seed و convergence کمی quantile، bias correction با test untouched، calibration coverage روی بلوک زمانی و سایت نگه‌داشته‌شده. MC پیاده‌شدهٔ موجود را بدون بررسی دامنه به پشتیبانی وابستگی سیستماتیک غیرصفر بین همهٔ گروه‌ها ارتقا ندهیم.

## وضعیت آمادگی اجرایی

- **اکنون اجرا شده:** W/L بستهٔ benchmark، integrity منابع، split/leakage و رفتار Prilliman. این اجراها خارج از محصولند.
- **آمادهٔ طراحی آزمون فاز بعد:** قرارداد دامنه و وابستگی تمام dossierهای بالا و روش مرجع مستقل مشخص شده است؛ برای هر مدل باید fixture حساس عددی و adapter محصول جدا پذیرفته شود.
- **باز:** field binaries/مجوز/QC و اجرای F؛ مقایسهٔ عملی PVMismatch/Radiance/pandapower؛ متن کامل استاندارد مجاز برای ادعای انطباق؛ دادهٔ تجهیزات جهت calibration واقعی. این کمبودها فقط به ادعا/مدل مربوط محدودند، نه تمام نرم‌افزار.

داده‌های کمبوددار به صفر عملیاتی تبدیل نشوند، شکست اجرای صریح پنهان نشود و پیچیدگی پژوهشی بدون نتیجهٔ بهتر روی holdout به annual baseline تحمیل نشود.
