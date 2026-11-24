# ممیزی تطبیقی کل دامنهٔ پیشنهادی و برنامهٔ اجرایی بازنگری‌شده

تاریخ تدوین: ۲۰۲۶-۱۱-۰۳؛ مبنا: working tree جاری شاخهٔ `arena/237e6ea2-solarpv-studio` پس از UQ-005، نه صرفاً commit پایه. این سند جانشین وضعیت‌سنجی قدیمی `ROADMAP-NEXT-GENERATION.fa.md` است، نه ابطال شواهد تاریخی آن.

**دامنه:** تمام پیشنهادهای محصولی و پژوهشی پیام کاربر و موانع انتشار قبلی؛ نه ادعای ممیزی خط‌به‌خط همهٔ فایل‌های نرم‌افزار، تست نفوذ جامع یا تأیید استاندارد. در این نوبت مدل محاسباتی تغییر نکرده است. نتیجهٔ جست‌وجو مدرک صحت کد ما نیست. تاریخ‌های تولیدشده در رسیدهای موجود با تاریخ اعلام‌شدهٔ جلسه اختلاف دارند؛ از آن‌ها به‌عنوان ترتیب تاریخی قطعی استفاده نشده، نام فرمان و محتوای شاهد ملاک است.

## ۱. روش سه مرور، به ترتیب اجرا

### مرور اول: موجودی و پوشش → تحقیق عمیق اول
فهرست موتورهای TS، مدل‌های Python، مطالعات و اسناد UQ با تک‌تک سرفصل‌ها تطبیق داده شد. نتیجه: «برنامه فقط تولید قطعی دارد»، «باتری صرفاً مستقل است» و «API وجود ندارد» دیگر توصیف درستی از کد نیستند. dispatch مقید، مدل DC-coupled، چند مسیر UQ، دادهٔ اندازه‌گیری و API شش‌عملیاتی وجود دارند؛ اما هریک دامنهٔ محدود دارند.

پس از مرور، جست‌وجوی عمیق روی SAM، عدم‌قطعیت انرژی و standalone/hybrid BESS و RatedPower انجام شد. SAM بین IAV و عدم‌قطعیت مدل تمایز می‌گذارد و P90 را احتمال تجاوز تعریف می‌کند [1](https://docs.nrel.gov/docs/fy23osti/84993.pdf). صفحهٔ RatedPower دامنهٔ standalone/AC/DC-coupled و auxiliaries را توصیف می‌کند؛ این فقط مرجع نیاز محصول است، نه benchmark عددی [5](https://ratedpower.com/platform/).

### مرور دوم: عمق فیزیکی و مرز ادعا → تحقیق عمیق دوم
هدرها، schemaها، توابع و محدودیت‌های SPM، dq، دوگرهی حرارتی، integrated، spectral و plant auxiliaries بررسی شدند. نتیجه: اتصال خروجی چند موتور با کوپل دوطرفهٔ مکانی-زمانی یکسان نیست؛ ضریب تجربی spectral با حل تاندم تفاوت دارد؛ registry سند اجرای مدل نیست.

سپس تحقیق عمیق پیرشدگی باتری انجام شد و با جست‌وجوی تکمیلی bifacial/spectral ادامه یافت. مثال PyBaMM واقعاً SEI، plating، cracking و LAM را کوپل می‌کند و نیاز پایداری mesh را گوشزد می‌کند [1](https://docs.pybamm.org/en/latest/source/examples/notebooks/models/coupled-degradation.html). infinite-sheds مدل دوبعدی ردیف‌های بلند و منظم است و اثر انتهای ردیف را کنار می‌گذارد [1](https://pvlib-python.readthedocs.io/en/v0.11.1/user_guide/bifacial.html). تصمیم: نه SPM فعلی را مدل عمر بنامیم و نه rear irradiance دوبعدی را ray tracing سه‌بعدی دقیق.

### مرور سوم: مسیر واقعی اجرا، تست، داده و انتشار → تحقیق عمیق سوم
API سرور/worker، schemaهای نسخه‌دار، تست‌های numerical و receipts، آرشیو UQ، evidence/calibration review و feature flagها بررسی شدند. شش تست هدفمند TS و مجموعهٔ پژوهشی Python دوباره اجرا شد؛ شرح بخش ۵. فایل‌های LCA/H2 در registry با مسیر solver/UI معادل فرض نشدند.

سپس تحقیق عمیق twin/RUL انجام شد؛ جست‌وجوهای تکمیلی LCA/PV ICE، AgriPV، PVDeg، FPV، شبکه و امنیت دستیار و خواندن مستقیم مستندات SALib، SunSolve و OWASP انجام شد. نتایج ادبیات twin وابسته به داده، حسگر و شرایط مطالعه‌اند؛ اعداد دقت مقاله به محصول منتقل نمی‌شوند [7](https://www.sciencedirect.com/science/article/abs/pii/S0026271425001246). PV ICE جریان مواد/اقتصاد چرخشی است، نه خودبه‌خود LCA کامل [1](https://docs.nrel.gov/docs/fy22osti/80440.pdf). AgriPV به زنجیرهٔ تابش روی محصول، خرداقلیم، آب/خاک و رشد محصول نیاز دارد [3](https://docs.nlr.gov/docs/fy24osti/90300.pdf). نتیجهٔ اجرایی: لایهٔ داده و شواهد جلوتر از ادعای RUL، runaway و bankability قرار گیرد.

این سه دور جست‌وجوی هدفمند به معنی مطالعهٔ کامل همهٔ مقالات یا systematic literature review دانشگاهی نیست؛ بخشی از منابع به‌صورت متن/گزیدهٔ بازیابی‌شده بررسی شدند. صفحات متغیر latest برای طراحی adapter باید در زمان اجرا به نسخه/commit قفل شوند.

## ۲. مقیاس وضعیت

- **موجود در دامنهٔ محدود:** مسیر واقعی و تست دارد، ولی لزوماً field validated نیست.
- **جزئی/ساده:** هستهٔ مرتبط موجود است؛ بخشی از درخواست یا عمق علمی آن باقی است.
- **پیاده‌سازی عملیاتی احراز نشد:** در مسیرهای جست‌وجوشده solver/UI/test متناظر پیدا نشد؛ وجود نام یا flag کافی نیست.
- **مانع بیرونی:** بدون داده، مجوز یا محیط واقعی قابل بستن نیست.

برای جلوگیری از درصدسازی گمراه‌کننده، درصد تکمیل کل برنامه اعلام نمی‌شود.

## ۳. ماتریس کامل غیرپژوهشی

| شناسه | درخواست | وضعیت و شاهد کد | باقی‌ماندهٔ دقیق |
|---|---|---|---|
| N01 | طراحی/بهینه‌سازی هم‌زمان PV و BESS | جزئی؛ `advancedDispatch.ts` و `advancedStudy.ts` کنترل load-first و optimal-discrete، هزینهٔ wear، diesel و مقایسهٔ policy دارند؛ `batteryEngine.ts` sizing دارد | بهینه‌ساز مشترک ظرفیت PV، توان/انرژی BESS و inverter همراه CAPEX و قیود تحویل؛ optimum شبکهٔ SOC را optimum طراحی پیوسته ننامیم |
| N02 | BESS مستقل/هیبرید با تولید خارجی PV/باد/شبکه | زیربنای جزئی؛ `operatingDispatch.ts` رکوردهای توان/بار، grid و SOC؛ Python `dc_coupled.py` دینامیک پژوهشی | workflow مستقل BESS و import عمومی تولید خارجی با origin/واحد/timezone، جلوگیری از انتساب نادرست باد به PV و تطبیق قیود اتصال؛ DC-coupled پژوهشی جای محصول کامل نیست |
| N03 | محدودیت تحویل/صادرات انرژی | موجود محدود؛ `acExportLimitSchedule` در worker مطالعه، dispatch و terminal SOC | قرارداد واحد POI برای import/export و الزام تحویل قراردادی، penalty/availability و infeasibility؛ تفکیک cap توان از سهمیهٔ انرژی |
| N04 | auxiliaries ثابت و ساعتی BESS و OPEX | جزئی؛ `services/pvlib_study/worker.py` از `auxiliaryPowerW` یا `auxiliarySchedule` با انطباق دقیق UTC پشتیبانی می‌کند؛ تست مستقل دارد | این مصرف کمکی نیروگاه است نه HVAC باتری. مدل بار حرارتی BESS، weather interpolation با policy صریح، فن/پمپ/standby و جریان انرژی/هزینه بدون دوباره‌شماری لازم است |
| N05 | اگریولتائیک: برق+محصول، خرداقلیم، LER | پیاده‌سازی عملیاتی احراز نشد؛ shading/irradiance زیرساخت قابل استفاده‌اند | PAR/DLI مکانی، ET/soil water، crop model، شاهد محصول و کنترل هم‌مکان؛ LER با مرجع مستقل و boundary یکسان |
| N06 | FPV: خنک‌شدن آب و تبخیر | جزئی در سطح اجزای حرارتی/محیطی؛ عنوان `multiphysics_bipv_fpv` در registry وجود دارد | solver معتبر آب-هوا-ماژول، پوشش سطح مخزن، تراز آب/تبخیر و اعتبارسنجی پیدا نشد؛ درصد ثابت cooling/evaporation پذیرفته نیست |
| N07 | PV→الکترولایزر و H2 دینامیک | پیاده‌سازی عملیاتی احراز نشد؛ `hydrogen_grid_stability` فقط در registry با فرمول‌ها/حدود توصیف شده | solver واقعی polarization/Faradaic efficiency، part-load، startup/ramp، توان auxiliaries، تراز جرم/انرژی، پروفیل زمانی و مسیر UI/API لازم است |
| N08 | P50/P75/P90/P99 انرژی و ریسک مالی | موجود محدود؛ `uncertaintyPropagation.ts`، `energyUncertaintyReview.ts`، Python `uncertainty.py` سه مسیر متفاوت‌اند؛ UQ-001..005 semantics/UI/Worker/archive را بهبود داده‌اند | P50/P90 قابل نمایش است؛ در مسیر مالی P75/P99 با شواهد tail و بازهٔ خطای برآورد کامل نیست. پارامترهای مالی اکتشافی پروژه‌کالیبره نیستند. تعمیم همهٔ مسیرها به یک توزیع مجاز نیست |
| N09 | محرک‌های اصلی عدم‌قطعیت | جزئی؛ r² نرمال‌شدهٔ TS روی NPV؛ بودجهٔ logvariance در review با cross terms علامت‌دار | سهم علّی یا سهم واریانس مستقل انرژی نیست؛ تفکیک معتبر و attribution وابسته به همبستگی، interaction و خطای تخمین باقی است |
| N10 | sensor-light twin + SCADA + Health Index | زیربنای جزئی؛ `measurementContract/Comparison/Periods.ts`، `outputCalibrationReview.ts` و `fieldEvidenceReview.ts` pairing و holdout و مدارک را دارند | ingest عملیاتی SCADA، asset identity، بازه‌های outage/curtailment، drift و reference مستقل/peer، هشدار false-positive کنترل‌شده و Health Index تعریف‌شده باقی است؛ CSV comparison دوقلو نیست |
| N11 | RUL و خوشه‌بندی کم‌عملکردی | ساده/غایب در معنای درخواستی؛ `environmentalAgingEngine.ts` عمر تقریبی اینورتر و `advancedDispatch.ts` عمر EFC/calendar دارند | این‌ها RUL مبتنی بر SCADA/ML نیستند. clustering دارایی، مدل survival با censored failures، فاصلهٔ پیش‌بینی و آزمون site/time holdout لازم است |
| N12 | کتابخانه GFL/GFM، Volt-Var، Droop، Q | جزئی؛ `services/power_dynamics/control.py` مدل balanced averaged SRF-PLL/dq PI/RL و protection دارد | کتابخانهٔ GFM و سناریوهای mode transition/ضعف شبکه، قیود current limiting، Volt-Var/Droop نسخه‌دار و benchmark بستهٔ کامل نیست؛ PLL/dq به‌تنهایی GFM نیست |
| N13 | screening کد شبکه: ride-through و anti-islanding | جزئی؛ کنترل/حفاظت پژوهشی، موتور harmonics/protection موجودند | rulepack کشور/utility، نسخه/دستهٔ اتصال، مدرک سازنده و سه‌حالتهٔ pass/fail/insufficient-evidence؛ anti-islanding آزمون مستقل است و با envelope ولتاژ اثبات نمی‌شود |
| N14 | دستیار LLM برای تنظیمات و اثر LCOE | پیاده‌سازی عملیاتی احراز نشد؛ گزارش‌ساز فعلی LLM نیست | command schema محدود، sandbox سناریو، provenance اثر، diff/undo، جلوگیری از prompt injection، منع تغییر مالی/انرژی از متن خارجی و سیاست offline/provider لازم است |
| N15 | تولید گزارش فنی/خلاصه با LLM | گزارش قطعی موجود؛ مولد LLM احراز نشد | grounding فقط روی evidence bundle، کنترل ادعا/اعداد/ارجاع، حذف اسرار و عدم ارسال داده بدون قرارداد صریح |
| N16 | قبض ماهانه→بار سالانه | جزئی؛ `loadProfiles.ts` و `LoadProfilingTab.tsx` پروفیل‌های مفروض/ساخت بار دارند؛ مسیر قبض در این دو فایل یافت نشد | ورود قبض و دوره/تعرفه، OCR اختیاری، تبدیل تقویم/واحد، حفظ kWh ماهانه، ensemble عدم‌قطعیت؛ از قبض ماهانه بار ساعتی یکتا قابل شناسایی نیست |
| N17 | LCA و carbon footprint | پیاده‌سازی کامل احراز نشد؛ `lca_lifecycle_sustainability` در registry و flag مهاجرت وجود دارد | inventory نسخه‌دار مواد/انرژی/حمل، functional unit، مرز و allocation، عامل انتشار منطقه‌ای، داده/مجوز و گزارش قابل trace؛ نام ISO در registry اثبات LCA نیست |
| N18 | جریان مواد EOL، بازیافت و repowering | پیاده‌سازی عملیاتی احراز نشد؛ salvage/عمر مالی احتمالی معادل mass-flow نیست | cohort/material ledger، reuse/recycle/landfill، manufacturing scrap، repowering، mass closure و adapter مستقل PV ICE؛ منفعت مالی/کربنی دوبار حساب نشود |

## ۴. ماتریس کامل پژوهشی

| شناسه | درخواست | وضعیت و شاهد | باقی‌ماندهٔ دقیق |
|---|---|---|---|
| R01 | Monte Carlo ray tracing + مدار + مقاومت لایه‌ای | جزئی؛ `roof3dShadingEngine.ts`، `solarPvEngine.ts`، `diode_network.py`، `advanced_thermal.py` و BIPV/T اجزای مرتبط دارند | ray tracer MC با convergence/seed، نگاشت مکانی سلول/substring/لایه و تبادل دوطرفهٔ حرارت/الکتریسیته لازم است؛ `integrated.py` در اصل composition چند DC worker و inverter مشترک است، نه حل‌گر کامل OET |
| R02 | توزیع مکانی T/I و mismatch زاویه‌ای/حرارتی | جزئی؛ شبکهٔ دیود و BIPV/T nonuniformity و دوگرهی حرارتی | mesh مشترک، hotspot و bypass heating، همگرایی و parameter/domain validation؛ دو node میانگین جای نقشهٔ حرارتی نیست |
| R03 | bifacial و tracker دقیق | موجود محدود؛ worker مطالعه row irradiance/tracking و Python `tracker.py`، TS bifacial/tracker | finite rows، edge effects، ناهمگنی مکانی و مقایسه با ray tracer/دادهٔ rear؛ مدل ۲بعدی منظم را solver عمومی ندانیم |
| R04 | سایهٔ نزدیک درخت/ساختمان با دقت بالا | جزئی؛ roof3d، shading lifecycle و Python shading | کالیبراسیون هندسه، canopy/transmittance فصل‌مند، diffuse blocking، electrical mapping و شاهد میدانی؛ گرافیک سه‌بعدی معیار دقت نیست |
| R05 | الکتروشیمی-حرارتی باتری و SEI/LAM | SPM موجود ولی صریحاً isothermal/fixed electrolyte و no degradation؛ `electrochemistry.py` | thermal coupling، SPMe/DFN اختیاری و SEI/plating/LAM پارامترگذاری‌شده با ظرفیت/ولتاژ/دما و همگرایی |
| R06 | thermal runaway سلول/ماژول | پیاده‌سازی احراز نشد و محدودیت مدل فعلی آن را نفی می‌کند | kinetics واکنش، کالریمتری، propagation/contact/venting و پارامتر سلول؛ خارج از ادعای ایمنی/گواه آتش |
| R07 | مکانیکی-الکتروشیمیایی/تنش نفوذ Li | پیاده‌سازی احراز نشد | swelling/stress/cracking و coupling به active material با آزمون mesh و شواهد مکانیکی؛ معادل SPM diffusion نیست |
| R08 | گذرای PV-T+PEM با پلهٔ تابش و دبی | جزئی؛ BIPV/T و `transient.py` موجودند؛ transient صریحاً reduced-order assumed dynamics است | موازنهٔ سیال/پمپ، تبادل حرارت، electrochemical/stack states و step/flow benchmarks کوپل‌شده؛ transient فعلی PV-T/PEM نیست |
| R09 | PCM برای پایداری حرارتی | پیاده‌سازی احراز نشد | enthalpy/phase fraction، latent heat، hysteresis در صورت نیاز و ذوب/انجماد با مرجع Stefan و conservation |
| R10 | spectral mismatch، خصوصاً HJT و perovskite/Si | جزئی؛ `spectral_irradiance` worker از SAPM A0..A4 با دامنهٔ air mass و آزمون مستقل استفاده می‌کند | طیف وابسته به طول موج، EQE/SR فناوری، مرجع طیفی و integration؛ چندجمله‌ای broadband معادل mismatch کامل طیفی نیست |
| R11 | مدل اپتیکی/الکتریکی tandem | پیاده‌سازی احراز نشد | دو زیرسلول، 2T/4T، current matching، recombination/optical coupling و دادهٔ EQE/IV؛ چند substring تک‌پیوندی، tandem نیست |
| R12 | Nested MC برای aleatory/epistemic | زیربنای جزئی؛ Python `uncertainty.py` systematic/interannual و temporal correlation دارد | outer model uncertainty/inner variability روی مدل واقعی با budgets/checkpoints و دو مؤلفهٔ واریانس؛ صرف داشتن دو گروه factor یا چند سال nested general solver نیست |
| R13 | GSA برای انرژی و LCOE | جزئی؛ proxy همبستگی و بودجهٔ تحلیلی وجود دارد | sampler/evaluator/analyzer معتبر، S1/ST/interaction و CI برای مستقل‌ها؛ روش جدا و صریح برای correlated inputs؛ Ishigami و linear oracle لازم است |
| R14 | تخریب فیزیکی PV: رطوبت، LeTID، UV، تنش حرارتی | ساده؛ `environmentalAgingEngine.ts` نرخ/عمر تجربی و waterfall آیتم LID/LeTID دارد | stateful mechanism و پارامتر فناوری، history زمانی و adapter منتخب PVDeg؛ loss درصدی یا annual degradation معادل فیزیک رطوبت/UV نیست؛ افت مجدد روی loss موجود اعمال نشود |
| R15 | API پایتون برای SPM/گذرای/MC و workflow پژوهش | موجود محدود؛ `api_worker.py` stdin/stdout و ماژول‌های قابل import؛ `researchApi.ts` و `src/server/researchApi.ts` API احراز هویت‌شده با شش operation و validation دارند | SDK نصب‌پذیر/نسخه‌دار Python با typed client، docs/notebook، job persistence، resume/checkpoint و batch؛ transient/MC در API شش‌عملیاتی فعلی عرضه نشده‌اند و صرف وجود فایل Python SDK کامل نیست |

### برداشت‌های مهم از ماتریس
- هیچ‌یک از ۱۳ عنوان کلان پیام کاربر در **تمام دامنهٔ پیشنهادی‌اش** بسته نیست؛ در عین حال بخش‌های زیادی از صفر شروع نمی‌شوند.
- UQ-001..005 بدهی قرارداد، نمایش، Worker و بازتولید را کاهش داده‌اند؛ نقص دادهٔ کالیبراسیون، tail، attribution یا bankability را حل نکرده‌اند.
- سه ادعای registry دربارهٔ FPV، LCA و hydrogen باید به executor/تست/گزارش واقعی پیوند داده شوند یا «تعریف/برنامه» نام بگیرند؛ خود registry شاهد اجرا نیست.
- ادعای نبود هر قابلیت یعنی «در مسیرهای کد بررسی‌شده پیاده‌سازی عملیاتی متناظر احراز نشد»، نه اثبات ریاضی نبودن تمام کدهای مرتبط.

## ۵. آزمون‌های دوباره‌اجراشده در این ممیزی

همه روی working tree فعلی؛ numerical fixtureها عمدتاً synthetic هستند:

| فرمان/مجموعه | نتیجه | حد ادعا |
|---|---|---|
| `test-advanced-dispatch.ts` | PASS | optimum گسسته با enumeration مستقل Python، ۲۰ case اضافه، conservation، life/terminal/policy؛ نه sizing optimum پیوسته |
| `test-physical-models.ts` | PASS | سه مدل واقعی dc_coupled/SPM/dq، residual، tamper، strict input، cancel |
| `test-research-api.ts` | PASS | مدل واقعی، JWT، auth-before-parser، body/rate/capacity، timeout/cancel/process tree |
| `test-field-evidence-review.ts` | PASS | actual worker، oracle مستقل و holdout/document gates؛ synthetic، نه مدرک میدانی |
| `test-energy-uncertainty-review.ts` | PASS | oracle مستقل NumPy/NormalDist، correlation/variance/P90 و fail-closed؛ نه CV پروژه |
| `test-financial-uq-archive.ts` | PASS | roundtrip/replay/integrity/mapping/immutability |
| Python پژوهش `unittest discover services/pvlib_research/tests` | ۶۶ تست OK | ابتدا یک خطای dependency برای openpyxl رخ داد؛ سپس فقط پین‌های موجود در requirements یعنی openpyxl 3.1.5 و et_xmlfile 2.0.0 در venv نصب و suite تکرار شد؛ dependency محصول تغییر نکرد |
| Python `test_optical_models.py` | ۱۱ تست OK | numerical spectral/IAM و دامنهٔ پارامترها؛ نه کالیبراسیون spectral فناوری |
| Python `test_auxiliary_schedule.py` | ۷ تست OK | schedule صریح، alignment و energy balance؛ نه HVAC باتری |

گیت کامل production/browser/Types/ESLint قبلاً در UQ-005 پاس شده و رسید آن موجود است؛ در این ممیزی دوباره کل گیت ۴دقیقه‌ای/همهٔ مرورگرها اجرا نشده است. هیچ اجرای جدید Safari/Windows یا تست کارایی میدانی ادعا نمی‌شود.

## ۶. تحقیق و تصحیح فرض‌های تصمیم‌ساز

1. **UQ بانکی صرف تولید چند percentile نیست.** SAM تفکیک آب‌وهوا/مدل و توزیع عوامل را مطرح می‌کند؛ سیاست ما: افق تک‌سال/میانگین چندسال و ریسک پارامتر جدا باشد [1](https://docs.nrel.gov/docs/fy23osti/84993.pdf). P75=q0.25 و P99=q0.01 انرژی‌اند؛ mean لزوماً median نیست.
2. **حساسیت واقعی workflow مستقل است.** SALib نمونه‌گیری و analyze را جدا از evaluator مدل تعریف می‌کند و مثال Ishigami دارد؛ افزودن کتابخانه به‌تنهایی تحلیل معتبر نمی‌سازد. منبع مستقیم: https://salib.readthedocs.io/en/latest/user_guide/basics.html . سیاست ما: r² فعلی فقط proxy بماند و Sobol استاندارد بدون احراز فرض استقلال روی ورودی‌های correlated اجرا نشود.
3. **پیرشدگی باتری نیاز به پارامتر و همگرایی دارد.** مثال PyBaMM coupling واقعی و حساسیت mesh را نشان می‌دهد؛ انتخاب DFN با optionهای بیشتر تضمین دقت سلول پروژه نیست [1](https://docs.pybamm.org/en/latest/source/examples/notebooks/models/coupled-degradation.html).
4. **شبکه:** anti-islanding و ride-through ارزیابی مجزا و تعامل دارند؛ نتیجهٔ کنترل averaged یا rulepack جای آزمون IEEE 1547.1 نیست [1](https://docs.nlr.gov/docs/fy22osti/77782.pdf).
5. **AgriPV/FPV:** مدل محصول نیازمند آب/خاک/خرداقلیم است [3](https://docs.nlr.gov/docs/fy24osti/90300.pdf)؛ cooling و تبخیر FPV به طراحی/اقلیم وابسته‌اند، نه درصد جهانی ثابت [1](https://documents1.worldbank.org/curated/en/418961572293438109/pdf/Where-Sun-Meets-Water-Floating-Solar-Handbook-for-Practitioners.pdf).
6. **LCA≠PV ICE:** inventory و مرز زیست‌محیطی را جدا از ledger جریان مواد بسازیم [1](https://docs.nrel.gov/docs/fy22osti/80440.pdf). مدل LeTID در PVDeg مرجع توسعهٔ adapter است، نه دادهٔ کالیبراسیون پروژه [5](https://research-hub.nlr.gov/en/publications/energy-yield-loss-due-to-letid/).
7. **SunSolve یک موتور محلی آفلاین آماده نیست:** طبق متن کامل صفحهٔ رسمی، notebook محلی با موتور ابری کار می‌کند و نسبت‌های P-value مثل P90/P50 می‌دهد، نه absolute yield. منبع مستقیم: https://docs.sunsolve.com/en/p90/introduction/how-sunsolve-p90-works/ . برای الزام آفلاین این پروژه dependency پیش‌فرض انتخاب نمی‌شود.
8. **LLM:** اصل کمینه‌سازی ابزار و سطح دسترسی مبنای معماری است؛ مستقل از خروجی مدل، schema و policy باید عمل را کنترل کنند. منبع مستقیم خوانده‌شده: https://genai.owasp.org/llmrisk/llm062025-excessive-agency/ . طرح زیر به تأیید انسانی متکی نیست: عمل خارج از allowlist یا gate مسدود می‌شود، نه اینکه با موافقت متنی معتبر فرض شود.

## ۷. معماری و قواعد مشترک اجرایی

`Data/Asset → Quality/Temporal/Context Gate → Scenario → Versioned Adapter → Bounded Job → Evidence Bundle → UI/SDK/Report`

- مدل سنگین در server/Python احراز هویت‌شده؛ مرورگر تنها orchestration/نمایش؛ وابستگی آفلاین پس از نصب، بدون download مدل در زمان اجرا.
- قرارداد result: نسخه، واحد، interval semantics، UTC/timezone، AC/DC/POI، افق، input/code/data/parameter hashes، seed، solver tolerance، budget، precision/limitations.
- پژوهش هیچ مسیر خودکار به مالی/annual yield نداشته باشد. هر انتقال آتی فقط با پوشش زمانی کامل، context match و research gate ثبت‌شده ممکن است؛ fail-closed و قابل rollback.
- مراتب evidence: numerical verification، domain benchmark و field validation جدا؛ PASS اول، سومی را فعال نکند.
- هیچ فاز بدون acceptance مکتوب، unit+regression، مرجع عددی مستقل، flag، rollback، docs/changelog و receipt بسته نشود.
- خطاهای unsupported/infeasible/insufficient evidence با fallback مفروض جایگزین نشوند؛ تغییر behavior فقط با regression.
- رمز و دادهٔ محرمانه در source/log ممنوع؛ input، runtime و صادرات شامل قیمت/SCADA مشمول data policy.

## ۸. فازبندی اجرایی جدید

برآوردها نفرهفته و تقریبی‌اند، حدود ±۴۰٪؛ زمان دریافت دادهٔ مالکیتی/آزمایشگاه خارج از آن است. فازها صف خطی صرف نیستند؛ مسیرها پس از دروازهٔ پایه موازی می‌شوند. هیچ تخمین زمانی وعدهٔ تکمیل علمی یا مجوز نیست.

| فاز | پوشش و مالک | پیش‌نیاز | تحویل و معیار خروج خودکار | تلاش تقریبی |
|---|---|---|---|---|
| F0 — baseline و سلامت ادعا | همه؛ tech lead+QA+domain | همین ممیزی | capability manifest ماشین‌خوان برای ۳۳ ردیف N/R با executor/UI/test/evidence؛ registry بدون executor به planned تنزل یابد؛ hash رسیدها و بازتولید گیت؛ ثبت license/native runtime blockers | ۲–۳ |
| F1 — داده و اجرای مشترک | N02/N03/N10، R12/R15؛ backend/data | F0 | schema تولید خارجی/SCADA، asset و provenance، gap/DST/leap-year/units/boundary tests؛ job ID/cancel/timeout/resource budgets و SDK envelope؛ replay exact | ۴–۶ |
| A1 — UQ پروژه و tail | N08/N09، R12/R13؛ statistician+PV | F1 + دادهٔ budget معتبر | مسیرهای UQ را با adapter مشترک مقایسه، نه مخلوط؛ P75/P99 فقط با tail CI و convergence report؛ Nested MC با قانون total variance؛ GSA مستقل Ishigami/linear و روش correlated جدا؛ هشدار نمونهٔ ناکافی و calibration gate | ۶–۱۰ |
| A2 — هیبرید محصولی | N01..N04؛ storage+optimization | F1 | standalone/import generation؛ sizing بیرونی روی dispatch داخلی با feasibility و bound/gap؛ HVAC/standby/pump و OPEX جدا؛ تست ledger توان/انرژی/هزینه و LP/exhaustive oracle در مسئلهٔ کوچک | ۶–۱۰ |
| A3 — twin سبک | N10/N11 clustering؛ O&M/data science | F1 + SCADA مجاز و reference مستقل | ingest batch، baseline frozen، exclude curtailment/outage، residual و drift، HI تعریف‌شده و clustering؛ site/time holdout و false alarms/site-day؛ بدون داده فقط research status | ۶–۹ |
| B1 — OET/هندسه | R01..R04؛ optical/electrical/thermal | F1 + benchmark | mesh مشترک، MC ray tracing اختیاری، conservation نور/مدار/گرما و convergence دوطرفه؛ finite-row و مانع نزدیک؛ مقایسه Radiance/pvlib/circuit oracle، baseline روش سریع حفظ شود | ۱۰–۱۶ |
| B2 — باتری پیشرفته | R05/R07، سپس R06؛ electrochemistry | F1 + پارامتر مجاز سلول | adapter نسخه‌قفل PyBaMM، ابتدا thermal SPM/SPMe سپس DFN/degradation؛ voltage/temperature/capacity benchmarks، mesh/time convergence؛ runaway فقط زیرپروژهٔ دارای دادهٔ calorimetry/propagation | ۸–۱۴، runaway جدا |
| C1 — شبکه | N12/N13؛ power systems | F1 + rulepack مرجع | screening کشور/utility سه‌حالته؛ جدا از GFL/GFM دینامیک؛ Volt-Var/Droop/current-limit و mode-step با مرجع؛ anti-islanding بدون test evidence «نامشخص»؛ هیچ certificate تولید نشود | ۶–۱۰ |
| C2 — کاربردهای زمین/آب | N05/N06؛ crop/water+PV | B1 + دادهٔ crop/مخزن | Agri: PAR→soil/ET→crop و LER با baseline کنترل؛ FPV: thermal+water mass/energy؛ sweep و conservation و holdout آب/دما؛ اقتصاد جدا از research adoption | ۸–۱۴ |
| C3 — هیدروژن و PV-T/PCM | N07، R08/R09؛ thermal+H2 | F1 + B1 اجزای حرارتی | ابتدا stack/auxiliaries/ramp با kg-H2 و تراز جرم/انرژی؛ سپس PV-T flow-step و PEM coupling و PCM enthalpy؛ steady/step/Stefan reference و convergence | ۱۰–۱۶ |
| B3 — طیف و تاندم | R10/R11؛ device physics | F1 + EQE/optical constants | spectral integration و normalization؛ 2T/4T و current matching با مستقل‌ها؛ no-extrapolation؛ synthetic oracle و benchmark فناوری، نه تعمیم ضرایب Si به perovskite | ۸–۱۲ |
| D1 — تخریب PV و RUL | R14 و N11 RUL؛ reliability | B2/A3 و دادهٔ failure | adapter mechanismهای منتخب PVDeg، جلوگیری از double degradation؛ RUL با censoring، calibration فاصلهٔ پیش‌بینی، holdout زمانی/سایت؛ نبود داده=مسدودکردن ادعای عملیاتی | ۸–۱۴ |
| D2 — LCA/circularity | N17/N18؛ LCA/data | F1 + inventory/licensing | ledger cohort/PV ICE با mass closure، LCA با functional unit و boundary/allocation، uncertainty و factor provenance؛ reconciliation هزینه/EOL و گزارش مستقل | ۶–۱۰ |
| D3 — قبض و دستیار | N14..N16؛ product/security | F1، snapshot مالی پایدار | ابتدا قبض→ensemble پروفیل با حفظ انرژی ماهانه؛ سپس LLM read-only/typed scenario commands؛ unit ambiguity و prompt-injection tests، diff/undo و report grounding؛ model/provider opt-in و offline policy صریح | ۶–۱۰ |
| E — SDK و qualification انتشار | R15 و همه؛ platform+QA | F1 به بعد تدریجی | SDK نصب‌پذیر و notebook برای SPM/transient/MC با schema compatibility، batch/resume؛ matrix مرورگر/OS، reproducible assets، dependency/rights manifest، evidence catalogue؛ انتشار هر feature مستقل و fail-closed | ۴–۷ مشترک |

### جزئیات acceptance حساس

- **Tail:** تعداد نمونه به‌تنهایی معیار نیست؛ CI صدک با order-statistics/bootstrap مناسب و چند seed/بودجهٔ افزایشی گزارش شود. در ۲۰۰۰ نمونه حدود ۲۰ مشاهده در tail یک‌درصدی انتظار می‌رود؛ این شاهد کافی برای دقت P99 نیست. tolerance موردنیاز پروژه قبل از آزمون ثبت شود، نه پس از دیدن نتیجه.
- **Nested:** آزمون تحلیلی `Var(Y)=E[Var(Y|θ)]+Var(E[Y|θ])` با تفکیک خطای MC؛ cross-group dependence اگر مدل نشده صریحاً unsupported باشد.
- **Sizing:** جواب بهینه روی شبکهٔ گسسته با global continuous optimum اشتباه نشود؛ budget تمام شود و bound مناسب نباشد، وضعیت incomplete برگردد.
- **Twin/RUL:** threshold عملکرد از SLA ثبت‌شدهٔ dataset/use-case استخراج شود؛ در غیاب مرجع معتبر target accuracy اختراع نمی‌شود. baseline ساده در همان holdout مقایسه شود؛ drift و sensor fault از fault تجهیز جدا شوند.
- **OET/باتری:** precision عددی و accuracy فیزیکی جدا گزارش شوند؛ residual کوچک بدون پارامتر معتبر به معنی پیش‌بینی درست نیست.
- **LCA/آب/محصول:** baseline counterfactual و افق یکسان الزام است؛ «کربن اجتناب‌شده» با «ردپای lifecycle» مخلوط نشود.

### گیت و توقف بدون وابستگی به تأیید دستی

برای هر deliverable یک فرمان `verify:<feature>` با receipt input/code/data hashes و وضعیت‌های `passed / failed / blocked_missing_evidence / unsupported_domain` تعریف شود. ترتیب: schema→reference/unit→regression→security/resource→UI/PDF→boundary/adoption→docs/rollback. فقط passed در دامنهٔ خودش feature را فعال کند. نبود داده، ناسازگاری context، مجوز نامعلوم یا نتیجهٔ numerical نامعتبر stop خودکار است؛ فاز مستقل دیگر می‌تواند ادامه یابد. هیچ «تأیید انسانی» جای مدرک یا gate را نمی‌گیرد؛ اسناد قانونی/آزمایشگاهی خارجی همچنان باید واقعاً موجود باشند.

## ۹. مانده‌های افقی و ریسک انتشار

- مجوز ریشه/حقوق وابستگی‌ها هنوز نیازمند مدرک‌اند؛ inventory با clearance یکی نیست.
- workflow Windows اضافه شده ولی اجرای remote در این جلسه انجام نشده؛ native Safari همچنان شاهد جدید ندارد. WebKit با Safari واقعی یکسان نیست.
- chunk budget و lint محدوده در UQ-005 پاس‌اند؛ warningهای third-party/mixed static-dynamic imports و ممیزی سراسری dependency هنوز جداگانه‌اند. budget bundle تضمین SLA نیست.
- migration آرشیو UQ انجام شده؛ بازنویسی همهٔ fieldهای legacy موتور/پروژه انجام نشده و نباید بدون schema جدید انجام شود.
- آرشیو UQ هویت source و replay دارد، اما امضای اصالت، attestation محیط یا field validation نیست.
- خطای `src/omniforge/ui/static_app` مربوط به مخزن دیگری است؛ این مسیر و frontend در checkout حاضر نیستند. نباید آن را نقص build همین برنامه شمرد؛ در عوض reproducibility build این مخزن در CI خودش سنجیده شود.
- این ممیزی امروز عملکرد تمام قابلیت‌های غیرمرتبط مثل سازه/ژئوتکنیک را از نو تأیید نکرده است؛ آن‌ها خارج از فهرست پیشنهادی‌اند و رسیدهای خود را دارند.

## ۱۰. تصمیم اجرایی نهایی

**شروع پیشنهادی:** F0 و F1، سپس A1/A2 و A3 با دادهٔ مجاز؛ B1 موازی به‌عنوان اولویت پژوهشی. SDK پایه از F1 شروع شود، نه انتهای پروژه. RUL، runaway و ادعای bankability تا تأمین شواهد به تعویق بیفتند. C/Dها backlog صریح با وابستگی هستند، نه قابلیت‌های فراموش‌شده یا «پیاده‌سازی‌شده» صرفاً به دلیل نام registry.

سه پاسخ کیفیت: پژوهش ناخواسته وارد مالی شد؟ **خیر؛ این نوبت کد مدل تغییر نکرد.** رگرسیون/مرجع بررسی شد؟ **بله، مجموعه‌های مشخص بخش ۵ دوباره اجرا شدند؛ کل برنامه دوباره تست نشده است.** precision/limits/provenance؟ **در ماتریس، دامنهٔ تست و طرح گیت‌ها تفکیک شدند؛ هیچ دقت یا اعتبار میدانی جدید ادعا نمی‌شود.**
