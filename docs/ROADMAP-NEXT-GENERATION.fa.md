# نقشهٔ اجرایی توسعهٔ SolarPV Studio — محصول متعارف و پژوهش

تاریخ: ۲۰۲۶-۱۱-۰۳ | مبنای بررسی کد: `0051d3ef224da0a1555d2766e13f5625b103f6ff`

وضعیت: **پیشنهاد اجرایی، نه اعلام پیاده‌سازی یا اعتبارسنجی قابلیت‌های آینده**. در تهیهٔ این سند کد مدل‌ها تغییر نکرده و آزمون جدیدی اجرا نشده است. زمان‌ها برآورد مهندسی با عدم‌قطعیت حدود ±۳۵٪ هستند؛ تأخیر تهیهٔ داده، مجوز و آزمایشگاه جداست.

## ۱. سه مرور و سه دور تحقیق

### مرور اول: تطبیق پیشنهاد با محصول و بازار → تحقیق اول

کد بررسی‌شده نشان می‌دهد P50/P90، تحلیل مالی تصادفی، دادهٔ اندازه‌گیری، اجزای حرارتی/محیطی، DC coupling و API پژوهشی از صفر شروع نمی‌شوند. مسئلهٔ اصلی بلوغ، یکپارچگی و شواهد است. تحقیق اول روی BESS مستقل/هیبرید، عدم‌قطعیت تولید و twin کم‌حسگر انجام شد. RatedPower مرجع دامنهٔ تجاری است، نه مرجع صحت فیزیکی [1]. روش SAM تفکیک تغییرپذیری بین‌سالی و عدم‌قطعیت معرفتی را مبنای مفیدی برای طراحی قرار می‌دهد [2]. ادعای twin بدون حسگر تابش باید به وجود مرجع مستقل یا همتای قابل مقایسه مشروط شود [3].

### مرور دوم: تفکیک مسئله‌های علمی → تحقیق دوم

کد SPM موجود هم‌دما و بدون پیرشدگی است؛ کنترل dq موجود مدل میانگین متعادل است، نه EMT یا اثبات GFM. تحقیق دوم، پیرشدگی کوپل‌شدهٔ PyBaMM، حدود مدل‌های bifacial، spectral mismatch، PVDeg و الزامات شبکه را بررسی کرد. نمونهٔ نسخه‌دار PyBaMM نشان می‌دهد SEI، plating، ترک و افت مادهٔ فعال به پارامترگذاری و بررسی پایداری شبکه نیاز دارند [4]. مدل دوبعدی pvfactors/solarfactors اثر انتهای ردیف را پوشش نمی‌دهد [5]. شبیه‌سازی Volt-Var و ride-through جای آزمون anti-islanding را نمی‌گیرد [6].

### مرور سوم: وابستگی، داده، هزینه و معیار خروج → تحقیق سوم

تحقیق سوم روی SunSolve P90، حساسیت سراسری، LCA/circularity، هیدروژن، FPV و امنیت دستیار انجام شد. مستندات کامل معماری SunSolve و بخش اصلی مثال نسخه‌دار PyBaMM و صفحهٔ اصلی OWASP خوانده شد؛ برای دیگر منابع از مستندات/چکیده‌ها/گزیده‌های بازیابی‌شده استفاده شد، نه ادعای مطالعهٔ کامل همهٔ مقالات. SunSolve خروجی نسبت‌های عدم‌قطعیت مانند P90/P50 می‌دهد و موتور آن ابری است [7]. PV ICE ابزار جریان مواد و اقتصاد چرخشی است و به‌تنهایی معادل LCA کامل نیست [8،9]. اثر خنک‌شدن FPV نباید با درصد ثابت عمومی نمایش داده شود [10]. نتیجه: زیرساخت API و داده زودتر، ادعاهای RUL و runaway دیرتر و مشروط.

## ۲. خط مبنا و شکاف واقعی

| موضوع | وضعیت قابل مشاهده در کد | تصمیم توسعه |
|---|---|---|
| عدم‌قطعیت | سه مسیر: TS مالی، بودجهٔ lognormal مطالعه و Python systematic/interannual | قرارداد مشترک؛ جلوگیری از موتور چهارم ناسازگار |
| صدک‌ها | در `uncertaintyPropagation.ts` مسیر مالی انرژی `p90` را صدک ۹۰ CDF ذخیره می‌کند | تفکیک `q90` از `energyExceedanceP90=q10`؛ مهاجرت نسخه‌دار |
| attribution | رتبه‌بندی Pearson r² در TS اکتشافی است | عنوان سهم علّی/Sobol نگیرد؛ روش وابسته به فرض همبستگی انتخاب شود |
| API پژوهشی | شش عملیات integrated، thermal_two_node، diode_network، dc_coupled، electrochemical_spm، dq_protection_control | توسعهٔ SDK/schema/jobs، نه ساخت API از صفر |
| PV+BESS | dispatch و DC coupling موجود، بلوغ مسیرها یکسان نیست | موازنهٔ واحد، تولید خارجی، auxiliaries و sizing مقید |
| چندفیزیکی PV | اجزای optical/electrical/thermal و مدل یکپارچه وجود دارند | اتصال مکانی/زمانی، بازخورد و benchmark؛ نه ادعای نبود کل مدل |
| باتری | SPM محافظه‌کارانهٔ دو الکترود، بدون پیرشدگی و گرما | ابتدا thermal سپس SPMe/DFN و degradation در adapter اختیاری |
| شبکه | PLL/dq/RL و حفاظت پژوهشی | screening جدا از دینامیک و certification |
| agri/FPV | ارجاعات و اجزای محیطی/حرارتی وجود دارد | وجود برچسب در registry به معنی crop solver یا مدل معتبر تبخیر نیست؛ audit تابع و تست در فاز صفر |
| پیرشدگی PV | نرخ‌های تجربی محیطی | adapter سازوکارهای منتخب PVDeg با دادهٔ فناوری مشخص |
| SCADA | ورود/مقایسهٔ اندازه‌گیری زیربناست | pipeline عملیاتی، مرجع، event labels و holdout جدید لازم است |

فایل‌های مهم: `src/studies/energyUncertaintyReview.ts`، `src/engine/core/uncertaintyPropagation.ts`، `services/pvlib_research/uncertainty.py`، `src/components/FinancialTab.tsx`، `src/studies/researchApi.ts`، `services/pvlib_research/api_worker.py`، `services/power_dynamics/electrochemistry.py`، `services/power_dynamics/control.py`، `src/engine/environmentalAgingEngine.ts`.

## ۳. اصول غیرقابل مذاکره

1. **قرارداد آماری روشن:** `q(p)` صدک CDF است؛ P90 انرژی یعنی q(0.10)، P75 یعنی q(0.25)، P99 یعنی q(0.01). میانگین را به جای میانه نگذاریم. برای هزینه و NPV، جهت نامطلوب با نام صریح نمایش داده شود؛ از کاربرد مبهم «P90 هزینه» خودداری شود.
2. **عدم دوباره‌شماری:** RMSE مدل مستقیماً CV سالانه نیست؛ weather ensemble، خطای اندازه‌گیری، bias، soiling و degradation باید مرز و همبستگی مستند داشته باشند. ماتریس نامعتبر silently repair نشود.
3. **هویت نتیجه:** واحد، زمان/منطقه، گام زمانی، مرز AC/DC، seed، داده/پارامتر/کد/نسخه و دامنهٔ اعتبار همراه نتیجه بمانند. کش با تغییر هر یک invalidate شود.
4. **پژوهش به مالی خودکار منتقل نشود:** نتیجهٔ پژوهش با برچسب اعتبار، پذیرش صریح و بازتولید قابل حسابرسی وارد مطالعهٔ عملیاتی شود؛ مسیر فعلی پذیرش حفظ شود.
5. **عدم ادعای تأییدیه:** خروجی نرم‌افزار نه تأیید اتصال شبکه، نه تضمین عمر باتری/محصول، نه گواه ایمنی حریق و نه گواه بانک‌پذیری است.
6. **نسخه‌بندی مهاجرت:** نتایج UQ قدیمی با معنای اولیه حفظ و deprecated شوند؛ بازتفسیر بی‌سروصدا ممنوع. رابط فارسی/انگلیسی و گزارش PDF همان قرارداد را نشان دهند.

## ۴. معماری هدف

`Project/Data → Quality & Provenance → Scenario → Model adapters → Job runner → Evidence bundle → UI/SDK/Report`

- لایهٔ مشترک: schema نسخه‌دار با واحدها، timeseries و interval semantics، خطاهای ساخت‌یافته، دادهٔ مرجع و اعتبارسنجی.
- موتور سریع محصول: dispatch، مدل انرژی و uncertainty عملیاتی؛ اجرای bounded و قابل تکرار.
- موتور پژوهش: adapterهای اختیاری نسخه‌قفل‌شده؛ صف job با سهمیهٔ CPU/RAM، timeout، cancel، checkpoint و idempotency. توسعهٔ worker موجود، بدون اجرای arbitrary code از درخواست کاربر.
- مدل‌های خارجی: قرارداد adapter و manifest مجوز/نسخه/پارامتر؛ وابستگی جدید در مسیر پیش‌فرض مرورگر تحمیل نشود.
- UI: سه سطح «screening»، «research verified روی benchmark مشخص»، «field validated برای دامنهٔ معین». سطح سوم تنها بعد از تأیید مستقل داده/روش فعال شود.

## ۵. فازبندی اجرایی

هفته‌ها نسبی از T0 هستند. مسیر A محصول و مسیر B پژوهش پس از فاز ۱ موازی می‌شوند. هر فاز تحویل جدا و feature flag دارد؛ شروع فاز بعد مساوی اجازهٔ انتشار خروجی قبلی نیست.

### فاز ۰ — تثبیت خط مبنا و قرارداد؛ هفتهٔ ۱–۲؛ ۶–۸ نفرهفته

**مالک:** لید فنی + متخصص PV/UQ + QA.

- inventory تابع، UI، schema، تست و محدودیت برای تمام پیشنهادها؛ trace هر ادعا به کد و fixture.
- ثبت ADR برای صدک، انرژی خالص/ناخالص، horizon، نرخ و واحد؛ لیست سناریوهای بازتولیدپذیر.
- بررسی مجوز ریشهٔ پروژه، موارد نامشخص وابستگی‌ها و حق استفادهٔ fixtureها؛ مانع Safari واقعی و خواندن فایل جداگانه پیگیری شود. موفقیت WebKit معادل پذیرش Safari واقعی نیست.
- **خروجی:** capability matrix، data contract، benchmark manifest، backlog با مالک و مجوز.
- **Gate G0:** تمام قابلیت‌های وعده‌داده‌شده طبقه‌بندی شوند؛ هیچ نتیجهٔ فاقد provenance با برچسب معتبر منتشر نشود؛ blockers انتشار عمومی تعیین تکلیف یا صریحاً مانع بمانند.

### فاز ۱ — زیرساخت مشترک و اصلاح UQ؛ هفتهٔ ۳–۶؛ ۱۶–۲۰ نفرهفته

**وابستگی:** G0. **مالک:** backend، UQ، frontend، QA.

- schema مشترک برای هر سه مسیر UQ؛ q-values جدا از exceedance. سازگارکنندهٔ legacy و تست گزارش مالی.
- تفکیک aleatory/epistemic فقط با مدل/طرح نمونه‌برداری موجه، نه تقسیم دلخواه variance؛ ثبت توزیع‌ها، واحد و دلیل انتخاب.
- SDK پایتون حداقلی برای شش operation موجود، مثال notebook/CLI، contract tests، seed و hash؛ groundwork صف job و محدودیت منابع.
- **پذیرش پیشنهادی:** fixture lognormal با P90 تحلیلی؛ بازتولید با seed ثابت در همان runtime؛ همبستگی صفر/مثبت/منفی، ورودی PSD نامعتبر، leap-year، DST، دادهٔ مفقود و q-tailها تست شوند. P90 تحلیلی و نمونه‌ای با بازهٔ خطای MC سازگار باشند، نه equality ناموجه.
- **G1:** هیچ UI یا PDF، q90 انرژی را energy-exceedance-P90 معرفی نکند؛ round-trip پروژهٔ قدیمی بدون تخریب معنا؛ پذیرش خودکار research→finance وجود نداشته باشد.

### مسیر A / فاز ۲A — UQ کاربردی و twin تشخیص؛ هفتهٔ ۷–۱۲؛ ۲۴–۳۰ نفرهفته

**وابستگی:** G1 و قرارداد دادهٔ پایلوت. **مالک:** data/UQ، PV، backend، frontend، QA.

- weather چندساله و bootstrap بلوکی/مدل زمانی؛ بودجهٔ عدم‌قطعیت پروژه‌ای با provenance و سناریوی همبستگی. P50/P75/P90 عمومی؛ P99 تنها با تشخیص کفایت tail و هشدار/امتناع در دادهٔ ناکافی.
- attribution دو سطح: ranking اکتشافی با عنوان درست؛ sensitivity معتبر در فاز ۵. سهم متغیرهای همبسته به انتخاب روش وابسته است.
- SCADA CSV ابتدا؛ connectorهای زنده پس از پایلوت. QC زمان، واحد، reset کنتور، availability، curtailment، snow/soiling و sensor drift.
- twin کم‌حسگر: مدل مرجع هواشناسی یا peer group همگن، residual، change point و clustering با شاخص اطمینان. در نبود مرجع مناسب «غیرقابل تشخیص» بدهد، نه علت قطعی.
- **پذیرش:** split زمانی و site-held-out؛ عدم leakage؛ precision/recall رویداد، false alarms بر سایت‌ماه، زمان تشخیص و missed energy. پیش از مشاهدهٔ holdout، با شریک پایلوت targetها قفل شوند. بدون رخداد برچسب‌دار، فقط benchmark مصنوعی و عنوان prototype.
- **G2A:** حداقل سه مجموعه‌دادهٔ دارای حق استفاده با شرایط متفاوت برای پایلوت؛ شواهد synthetic و field جدا. بدون رخداد خرابی و دادهٔ سانسورشدهٔ کافی، RUL منتشر نشود.

### مسیر B / فاز ۲B — هستهٔ چندفیزیکی PV؛ هفتهٔ ۷–۱۴؛ ۲۸–۳۶ نفرهفته

**وابستگی:** G1. **مالک:** پژوهشگر optical/electrical، numerical/backend، QA علمی.

- adapter اختیاری Radiance/bifacial_radiance برای هندسهٔ سه‌بعدی؛ مدل سریع view-factor برای سال کامل. اول هندسهٔ ساده، بعد torque tube/near-shading و ناهمگنی cell/submodule.
- نگاشت irradiance → diode network و bypass → گرما؛ بازخورد دما به IV با حل تکراری bounded. برخوردار بودن از دو مدل در یک صفحه «کوپل کامل» نیست.
- حفظ تفکیک absorbed irradiance و electrical extraction برای جلوگیری از دوباره‌شماری منبع گرما؛ سیاست interpolation زمانی/مکانی و solver convergence روشن.
- **پذیرش پیشنهادی:** steady-state موجود در limit بازتولید شود؛ KCL/KVL و موازنهٔ انرژی؛ refinement فضا/زمان و ray count؛ هندسهٔ یکنواخت، سایهٔ لبه، bypass و albedo متغیر. اختلاف عددی خروجی aggregate در دو refinement نهایی هدف ≤۱٪، یا انتشار با هشدار عدم همگرایی. این آستانه صحت میدانی نیست.
- **G2B:** یک case تحلیلی، یک benchmark مستقل نسخه‌قفل و یک مقایسهٔ میدانی در صورت تأمین داده؛ اگر مورد سوم موجود نباشد فقط research verified، نه field validated.

### مسیر A / فاز ۳A — PV+BESS مستقل و هیبرید؛ هفتهٔ ۱۳–۲۰؛ ۲۸–۳۶ نفرهفته

**وابستگی:** G1؛ از QC و schema فاز ۲A استفاده می‌کند. **مالک:** متخصص storage/optimization، backend، frontend، QA.

- generation profile خارجی wind/hydro/contractual با منبع و timestamp؛ AC-coupled/retrofit و standalone روی schema موجود؛ DC-coupled با قیود فیزیکی فعلی سازگار.
- HVAC، standby، inverter، pump و transformer auxiliary با مرز AC/DC/زمان روشن؛ مصرف کمکی در موازنهٔ dispatch و سپس هزینه ثبت شود.
- بهینه‌سازی sizing PV/inverter/BESS و dispatch مقید: SOC، توان، بازده، export/import، تعرفه، degradation و replacement؛ heuristic baseline سپس solver LP/MILP در صورت نیاز.
- نتیجهٔ infeasible معتبر، نه برنامهٔ ناقض قیود. هم‌زمانی charge/discharge و انگیزهٔ آن صریح مدل شود؛ درآمد arbitrage بدون تعرفه/محدودیت واقعی وعده داده نشود.
- **پذیرش پیشنهادی:** residual انرژی سالانه ≤۰٫۱٪ throughput برای مسیر محصول، SOC در tolerance solver، case کوچک با optimum شناخته‌شده و ثبت optimality gap. benchmark SAM/PySAM فقط در مرز/فرض‌های یکسان؛ بدون ادعای parity کامل.
- **G3A:** صفر نقض سخت قیود در corpus؛ annual net energy، هزینهٔ auxiliaries و degradation قابل ردیابی به timestep باشد.

### مسیر B / فاز ۳B — باتری حرارتی و پیرشدگی؛ هفتهٔ ۱۵–۲۴؛ ۳۶–۴۸ نفرهفته

**وابستگی:** G1، زیرساخت job و پارامتر سلول دارای مجوز. **مالک:** متخصص الکتروشیمی، numerical/backend، QA علمی.

- B1: lumped thermal با گرمای irreversible/reversible و شرایط مرزی؛ مقایسهٔ نسخه‌قفل‌شدهٔ SPM موجود با PyBaMM.
- B2: adapter SPMe/DFN برای غلظت الکترولیت و دامنه‌هایی که SPM کافی نیست؛ حفظ مدل سبک قبلی برای کاربرد مناسب.
- B3: calendar/cycle aging تجربی محصول؛ سپس SEI/plating و mechanics به‌صورت انتخابی با پارامترهای همان chemistry. پارامتر یک مقاله برای تمام LFP/NMC تعمیم داده نشود.
- **پذیرش:** موجودی lithium و energy، ظرفیت/SOC، positivity، cutoff events، mesh/time refinement؛ پروفایل pulse/charge/discharge و دمای خارج training. tolerance ولتاژ/دما قبل از fit براساس نویز آزمایش قفل شود؛ خطای fit گزارش validation نیست.
- **G3B:** امکان برگشت به SPM ساده، علت توقف solver قابل گزارش و دامنهٔ اعتبار هر chemistry مشخص. **thermal runaway/propagation خارج این فاز است.**

### فاز ۴A — agro و FPV؛ هفتهٔ ۲۱–۲۸؛ ۲۸–۳۶ نفرهفته

**وابستگی:** G2B برای نقشهٔ نور، G3A برای اقتصاد؛ agronomist/هیدرولوژیست و دادهٔ پایلوت.

- Agri-1: PAR/DLI زیر پنل و ناهمگنی نور؛ crop scenario از پارامتر کاربر. Agri-2: adapter crop/soil-water/microclimate پس از انتخاب محصول و اقلیم هدف؛ آبیاری، خاک، تقویم کشت و management ورودی باشند [11].
- `LER = Y_agri,dual/Y_agri,reference + E_pv,dual/E_pv,reference` با مساحت، دوره و baseline سازگار. نسبت عملکرد محصول از کاهش تابش به‌تنهایی استنتاج نشود.
- FPV: thermal coefficients وابسته به float/ventilation، دمای آب و هوا/باد؛ evaporation/water savings ماژول مستقل با پوشش، هندسه و دادهٔ مخزن. gain ثابت عمومی حذف/صرفاً scenario اعلام شود [10].
- **پذیرش:** حد بدون پنل/بدون پوشش، موازنهٔ آب، PAR و واحدها، فصل کشت و شاهد مستقل. محصول دیگر/اقلیم دیگر با برچسب extrapolation. حداقل یک فصل paired pilot برای ادعای crop yield؛ بدون داده فقط screening.
- **G4A:** گزارش جداگانهٔ PV، محصول، آب و عدم‌قطعیت؛ سازه، مهاربندی، باد/موج و اکولوژی آب ادعای حل‌شده نگیرند.

### فاز ۴B — دینامیک و کد شبکه؛ هفتهٔ ۲۵–۳۲؛ ۲۸–۳۶ نفرهفته

**وابستگی:** G1؛ متخصص شبکه/کنترل و دسترسی به اسناد مجاز.

- ابتدا screening: P-Q capability، Volt-Var/Volt-Watt/frequency-watt و جدول rule نسخه‌دار کشور/utility با تاریخ و مرجع؛ «نامشخص» حالت رسمی خروجی باشد.
- سپس پژوهش GFM droop، محدودکنندهٔ جریان، transition و مدل شبکهٔ ضعیف؛ نوع GFL/GFM از توانایی Volt-Var نتیجه گرفته نشود.
- **پذیرش:** step/voltage sag/frequency events، priority و saturation، refinement گام زمانی، benchmark مستقل. نامتعادلی، هارمونیک و EMT فقط با مدل مناسب؛ مدل balanced averaged برای آن‌ها کافی نیست.
- **G4B:** گزارش screening با بند و نسخه؛ هیچ badge انطباق/anti-islanding certification صرفاً از شبیه‌سازی صادر نشود [6].

### فاز ۵ — پژوهش‌های توسعه‌ای انتخابی؛ هفتهٔ ۲۹–۴۰؛ هر بسته بودجهٔ مستقل

این فاز یک کار ده‌هفته‌ای برای همهٔ موارد نیست. با تیم پایه فقط **یک یا دو بسته** انتخاب می‌شود؛ سایر بسته‌ها به موج بعد منتقل می‌شوند.

| بسته | خروجی و وابستگی | تلاش اولیه | معیار خروج |
|---|---|---:|---|
| H2 محصول | dispatch الکترولایزر با منحنی بارجزئی، min load، startup/standby، rectifier، compression، آب، تعویض stack و LCOH؛ پس از G3A | ۱۸–۲۶ نفرهفته | موازنهٔ برق/جرم، HHV/LHV صریح، H2 و auxiliaries جدا؛ مقایسهٔ هم‌فرض با HOPP/GreenHEART [12] |
| PV-T/PEM/PCM پژوهش | state حرارتی گذرا، heat exchanger، enthalpy PCM، بار حرارتی مفید، کنترل و coupling زمانی؛ پس از G2B | ۲۴–۳۶ | latent heat/energy balance، freezing/melting، refinement و bench آزمایشگاهی؛ دمای خروجی PV-T خودکار مناسب PEM فرض نشود |
| spectral/tandem | طیف + EQE هر junction و 2T current matching /4T topology، angular/temperature؛ پس از G2B | ۲۰–۳۰ | انتگرال طیفی/واحد، تک‌پیوند limit، طیف مرجع و چند طیف واقعی؛ یک multiplier Si مدل tandem نیست |
| PVDeg | سازوکار منتخب moisture/UV/LeTID متناسب فناوری؛ پس از thermal و پارامتر معتبر | ۱۶–۲۴ | بازتولید مثال نسخه‌دار، data holdout؛ عدم جمع کورکورانه با نرخ degradation قدیمی [13] |
| nested UQ/GSA | حلقهٔ بیرونی epistemic/درونی weather، surrogate با خطای مشخص، Morris screening سپس Sobol برای ورودی مستقل؛ correlated attribution با روش مناسب مانند Shapley | ۱۶–۲۴ | Ishigami/مدل تحلیلی، CI شاخص‌ها، budget و convergence؛ Pearson r² به Sobol تغییرنام ندهد [14] |
| LCA/circularity | BOM→material flow PV ICE، LCI دارای مجوز، functional unit و cradle-to-grave، replacement/recycling و روش allocation | ۱۲–۲۰ | موازنهٔ جرم، kgCO2e/kWh و EPBT با مرز/کشور/سال، جلوگیری از دوباره‌شماری credit؛ بررسی Parasol پیش از انتخاب، نه فرض ابزار هم‌ارز [8،9] |
| دستیار امن | read-only توضیح/گزارش مبتنی بر خروجی قطعی؛ bill OCR→مصرف سالانه/ماهانه با تأیید کاربر؛ load shape فقط inferred با سناریو | ۱۲–۱۸ | citation، redaction، schema validation، تست prompt injection، تأیید صریح قبل از تغییر طراحی؛ قبض به‌تنهایی peak/hourly واقعی نمی‌سازد [15] |

**بسته‌های مشروط خارج تعهد تقویمی:** RUL پس از دادهٔ failure/censoring و validation مستقل با survival/calibration و baseline؛ thermal runaway پس از دادهٔ calorimetry/abuse همان سلول و شریک آزمایشگاه با اعتبارسنجی onset/heat-release/propagation. مطالعهٔ سناریو جای UL 9540A یا ارزیابی ایمنی مجاز نیست. بودجه و زمان این دو بعد از feasibility دو تا چهار هفته‌ای تعیین شود.

### فاز ۶ — پایلوت و انتشار کنترل‌شده؛ چهار هفته پس از بستهٔ منتخب

**مالک:** QA مستقل + domain lead + مسئول انتشار.

- freeze schema/model/data، security/resource tests، regression پروژه‌های قبلی، فارسی/انگلیسی، گزارش و accessibility؛ مستندسازی معلوم/نامعلوم.
- آزمون بومی مرورگرهای هدف و ورود فایل واقعی؛ بررسی مجوز کد، dataset و توزیع binaries جداگانه.
- هر بسته evidence bundle شامل فرض‌ها، reference، metrics، failed cases، محدودیت و نسخه دارد.
- gate نهایی چهار امضا دارد: مهندسی نرم‌افزار، علم دامنه، داده/مجوز و مالک محصول. قابلیت فاقد داده با flag پژوهشی می‌ماند، حتی اگر CI سبز باشد.

## ۶. تیم، ظرفیت و زمان واقعی

تیم هستهٔ پیشنهادی **۸ نفر تمام‌وقت**: ۱ لید معماری، ۲ backend/numerical، ۱ frontend، ۱ data/UQ، ۱ PV پژوهشی، ۱ storage/optimization، ۱ QA/validation. متخصص الکتروشیمی، شبکه، زراعت و هیدرولوژی هر یک در پنجرهٔ مربوطه پاره‌وقت/قراردادی و حداقل ۰٫۵ ظرفیت DevOps/security در نظر گرفته شوند. نقش‌ها در گیت‌ها هم‌پوشانی ممکن دارند ولی بازبینی مستقل حذف نشود.

- هفتهٔ ۱–۶: پایهٔ مشترک و اصلاح معنایی؛ اولویت قطعی.
- هفتهٔ ۷–۱۴: UQ/twin MVP + چندفیزیکی benchmarkشده؛ نه تضمین اعتبار میدانی.
- هفتهٔ ۱۳–۲۴: BESS محصول + battery research؛ با دو زیرتیم و جلوگیری از overbooking backend.
- هفتهٔ ۲۱–۳۲: agro/FPV و شبکه؛ پیش‌نیاز داده تعیین‌کننده است.
- هفتهٔ ۲۹–۴۰: تنها ۱–۲ بستهٔ انتخابی؛ انتشار هر موج چهار هفته QA/pilot خودش را دارد و می‌تواند با توسعهٔ موج بعد هم‌پوشان شود.
- **MVP هدف: حدود ۳–۴ ماه؛ هستهٔ توسعه‌یافته: حدود ۶–۸ ماه؛ تمام دامنهٔ پیشنهادی: حدود ۱۲–۱۸ ماه یا بیشتر** با داده و شرکای تخصصی. این‌ها جمع سادهٔ مدت فازهای موازی نیستند و وعدهٔ تحویل قراردادی محسوب نمی‌شوند.
- اگر تیم فقط ۳–۴ نفر است: فازهای A/B را عمدتاً ترتیبی اجرا کنید؛ دامنهٔ نسخهٔ اول را به فازهای ۰،۱،۲A و ۳A محدود و زمان را دوباره برآورد کنید؛ چندفیزیکی و aging را وعدهٔ هم‌زمان ندهید.

قبل از هر sprint، تلاش بر حسب نفرهفته به ظرفیت واقعی نقش تبدیل و ۲۰٪ ظرفیت برای integration/bugs محفوظ شود. هزینه = نفرهفته × نرخ واقعی نقش + داده/compute/آزمایشگاه/مجوز؛ نرخ و بودجهٔ کاربر معلوم نیست، بنابراین عدد پولی ساختگی ارائه نمی‌شود.

## ۷. برنامهٔ دقیق چهار هفتهٔ نخست

| بازه | کار | تحویل قابل بررسی |
|---|---|---|
| هفتهٔ ۱ | audit سه مسیر UQ، مسیر مصرف UI/PDF و project migration؛ audit SCADA/agri/FPV | ماتریس موجود/نمونه/جدید، نمودار dataflow و مثال ناسازگاری صدک |
| هفتهٔ ۲ | ADR quantile/exceedance، واحد/زمان/مرز انرژی، dataset/license manifest و targetهای benchmark | G0 و backlog قفل‌شده؛ مالک و تخمین هر issue |
| هفتهٔ ۳ | adapter صدک نسخه‌دار و fixtures تحلیلی، contract tests شش API operation | PR محدود به معنا/schema و backward compatibility |
| هفتهٔ ۴ | UI/PDF و migration، SDK حداقلی و notebook بازتولید، آزمایش resource limits | demo سرتاسری، گزارش رگرسیون و فهرست باقی‌ماندهٔ G1 |

هفتهٔ ۵–۶ برای تکمیل قرارداد، queue groundwork و رفع یافته‌های رگرسیون است؛ نه افزودن هم‌زمان مدل‌های جدید.

## ۸. اولویت نهایی پیشنهادی

**P0:** اصلاح معنا/مهاجرت UQ، provenance، API/SDK پایه، مجوز و گیت پذیرش.

**P1:** UQ کالیبره‌شونده و twin تشخیص، چندفیزیکی PV با benchmark، BESS خالص/auxiliaries.

**P2:** thermal/aging باتری، agro/FPV داده‌محور، grid-code screening؛ GFM به‌عنوان پژوهش جدا.

**P3 انتخابی:** هیدروژن، spectral/tandem، PVDeg، PV-T/PCM، nested UQ، LCA و دستیار؛ انتخاب بر اساس مشتری/داده و ظرفیت، نه همگی یک‌جا.

**مشروط به شواهد:** RUL و runaway. افزایش sample count، افزودن کتابخانه یا زیبایی UI جای این شواهد نیست.

## ۹. منابع و حدود استفاده

منابع رقبا برای دامنه/معماری و منابع علمی برای روش/محدودیت استفاده شده‌اند؛ هیچ موردی اثبات صحت کد SolarPV Studio نیست. نسخهٔ نصب‌شدنی و حقوق توزیع هر adapter در فاز صفر قفل می‌شود. GitHub API در زمان بررسی SALib را MIT و PV ICE/PVDeg را `NOASSERTION` گزارش کرد؛ `NOASSERTION` به معنی بی‌مجوز بودن نیست و خواندن متن LICENSE و حقوق داده‌ها هنوز لازم است. مخازن اخیر به NatLabRockies redirect می‌شوند؛ URLهای قدیمی منبع حفظ شده‌اند.

1. RatedPower BESS: https://ratedpower.com/platform/bess/
2. NREL، UQ در SAM (2023): https://docs.nrel.gov/docs/fy23osti/84993.pdf
3. Reference-aware production-only twin، چکیدهٔ بازیابی‌شده: https://www.sciencedirect.com/science/article/abs/pii/S0038092X2600993X
4. PyBaMM v25.10.2، coupled degradation، بخش مدل و نتایج خوانده شد: https://docs.pybamm.org/en/v25.10.2/source/examples/notebooks/models/coupled-degradation.html
5. pvlib، محدودیت هندسه و solarfactors: https://pvlib-python.readthedocs.io/en/v0.11.2/user_guide/bifacial.html — دریافت صفحهٔ v0.13.1 در این بررسی ناموفق بود؛ انتخاب نسخهٔ اجرایی آینده از این ارجاع استنتاج نشود.
6. NREL، anti-islanding primer: https://docs.nrel.gov/docs/fy22osti/77782.pdf
7. SunSolve P90، صفحهٔ معماری کامل خوانده شد: https://docs.sunsolve.com/en/p90/introduction/how-sunsolve-p90-works/
8. PV ICE framework: https://docs.nrel.gov/docs/fy22osti/80440.pdf
9. NREL، LCA به‌روز utility PV: https://docs.nrel.gov/docs/fy24osti/87372.pdf
10. World Bank/SERIS FPV handbook: https://documents1.worldbank.org/curated/en/418961572293438109/pdf/Where-Sun-Meets-Water-Floating-Solar-Handbook-for-Practitioners.pdf ؛ مرور نقد خنک‌کاری: https://www.epj-pv.org/articles/epjpv/pdf/2023/01/pv220058.pdf
11. NREL Tools for AgriPV: https://docs.nlr.gov/docs/fy24osti/90300.pdf
12. NREL electrolysis integration: https://docs.nrel.gov/docs/fy23osti/83155.pdf ؛ HOPP/GreenHEART: https://docs.nrel.gov/docs/fy25osti/91832.pdf
13. PVDeg: https://docs.nlr.gov/docs/fy24osti/89537.pdf ؛ https://github.com/NatLabRockies/PVDegradationTools
14. SALib: https://salib.readthedocs.io/_/downloads/en/main/pdf/ ؛ روش‌ها باید با نسخهٔ pin شده و فرض استقلال/وابستگی آزموده شوند.
15. OWASP، Excessive Agency، بخش اصلی خوانده شد: https://genai.owasp.org/llmrisk/llm062025-excessive-agency/
