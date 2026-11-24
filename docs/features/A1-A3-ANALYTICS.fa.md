# A1–A3: هسته‌های تحلیلی با مراجع منتشرشده، سایزینگ LP و twin پژوهشی

## وضعیت و Intake
این تحویل **نرم‌افزار تحلیلی محدود و قابل‌آزمون** است؛ تمام دامنهٔ نقشهٔ راه A1–A3، کالیبراسیون میدانی یا bankability بسته نشده است. درخواست جدید اجازهٔ استفاده از پروژه‌های منتشرشده به‌عنوان مرجع benchmark را می‌دهد؛ برخلاف توقف نوبت قبل، می‌توان هستهٔ روش را بدون جعل دادهٔ پروژه ساخت. پیش‌نیاز اعتبار میدانی حذف نشده است.

- A1: پژوهشی؛ تحلیلگر ریسک بتواند صدک‌ها، خطای نمونه‌گیری، تفکیک واریانس و حساسیت مدل مرجع را بازتولید کند؛ نه اینکه CV یک سایت دیگر را کالیبراسیون پروژهٔ خود بداند.
- A2: تحلیل طراحی سناریو، فعلاً در مسیر جداگانهٔ پژوهشی؛ مهندس بتواند گزینه‌های ظرفیت PV/inverter/BESS را با dispatch پیوسته و هزینهٔ دورهٔ مشخص مقایسه کند؛ بدون دست‌کاری موتور مالی.
- A3: پژوهشی؛ تحلیلگر O&M بتواند batch داده و baseline ثابت را برای residual/drift/HI و گروه‌بندی دارایی بررسی کند؛ بدون ادعای RUL، fault diagnosis یا field validation.

## تحقیق عمیق و انتخاب مراجع A1
جست‌وجو روی SAM/NREL، مطالعات واقعی IEA-PVPS و دسترس‌پذیری PVDAQ انجام شد. فایل نسخه‌دار `docs/examples/portfolio/literature-references.json` مقادیر، URL، نوع مورد و حدود استخراج را نگه می‌دارد:

| مرجع | دادهٔ عددی منتشرشده | استفاده و محدودیت |
|---|---|---|
| Bolzano، ایتالیا | P50 ارزیابی‌ها ۱۰۹۵–۱۴۰۶ و P90 برابر ۹۹۷–۱۲۷۴ kWh/kWp/year؛ میانگین اندازه‌گیری گزارش‌شدهٔ ۲۰۱۰–۲۰۱۹ برابر ۱۲۷۵ | مرجع اندازهٔ baseline نمونهٔ یک kWp و مقایسهٔ دامنه؛ اختلاف ارزیاب‌ها توزیع احتمال نیست و به CV تبدیل نمی‌شود |
| Alice Springs، استرالیا | P50 ارزیابی‌ها ۱۷۵۷–۱۹۸۵ و P90 برابر ۱۶۳۱–۱۸۱۹ kWh/kWp/year | مرجع مستقل دوم برای دامنهٔ yield؛ نه سری زمانی SCADA و نه کالیبراسیون همبستگی |
| Golden، کلرادو | نمونهٔ ۱۰۰MWdc با هواشناسی ۲۰۰۰–۲۰۲۰، combined P90=147224000kWh، IAV P90=149776000kWh و factor fraction=0.955788 | **مثال شبیه‌سازی NREL**، نه نیروگاه عملیاتی سوم. خروجی توزیع‌های جدا را نباید بی‌دلیل در هم ضرب کرد |

منابع: IEA PVPS T13-18:2020 بخش ۳، `https://iea-pvps.org/wp-content/uploads/2021/01/Report-IEA%E2%80%93PVPS-T13-18_2020-Uncertainties-in-Yield-Assessments-and-PV-LCOE-1.pdf`؛ NREL/PR-7A40-86169، `https://docs.nrel.gov/docs/fy23osti/86169.pdf`؛ مرجع روش NREL/TP-7A40-84993، `https://docs.nrel.gov/docs/fy23osti/84993.pdf`.

شفافیت استخراج: متن ابتدای گزارش IEA و بخش‌هایی از روش خوانده شد؛ reader PDF به ۳۰ صفحه محدود است، بنابراین مقادیر بخش ۳ از متن بازیابی‌شدهٔ جست‌وجو ثبت شدند، نه از raw دادهٔ نیروگاه. fetch مستقیم poster NREL موفق نشد و اعداد از جدول استخراج‌شده در جست‌وجو هستند. این اعداد شاهد منتشرشدهٔ aggregate با provenance مشخص‌اند، نه ادعای بازتولید کامل گزارش‌ها. CVهای ۵٪ و ۳٪ مثال نرم‌افزاری **فرضی** هستند، نه اعداد استخراج‌شدهٔ این پروژه‌ها.

PVDAQ نیز به‌عنوان candidate داده بررسی شد: `https://catalog.data.gov/dataset/photovoltaic-data-acquisition-pvdaq-public-datasets`؛ فهرست، دادهٔ عمومی و CC BY 4.0 را توصیف می‌کند، اما raw داده، quality/event labels و baseline مستقل برای دارایی مشخص در این تغییر وارد نشده است. از روی صفحهٔ معرفی، دادهٔ SCADA یا شاهد field validation اختراع نشده است.

## معماری، فایل‌ها و مرز اجرا
- `src/studies/portfolioAnalytics.ts`: schemaهای strict و نسخه‌دار سه operation و validator پاسخ با بررسی مستقل ledger/قیود و binding.
- `services/pvlib_research/portfolio.py`: محاسبات NumPy/SciPy، کاملاً محلی پس از نصب؛ dependency جدید runtime ندارد.
- `src/studies/researchApi.ts` و `api_worker.py`: توسعهٔ opt-in قرارداد موجود؛ envelope همچنان `research-api-result-v1` است، plan هر مدل نسخهٔ مستقل دارد.
- `src/server/researchApi.ts`: همان auth، rate limit، timeout، cancel و process isolation موجود؛ flag اضافی برای عملیات جدید.
- `ResearchEditor.tsx`: سه مثال، JSON import/preview/run/archive، هشدار fa/en و وضعیت flag؛ محاسبهٔ سنگین در main UI اجرا نمی‌شود.
- `portfolioDataAdapters.ts`: اتصال **صریح** دادهٔ F1 با کنترل context، مرز، افق، واحد و گام زمانی؛ نه adoption انرژی.
- SDK عملیات جدید را می‌شناسد؛ manifest قابلیت‌ها لینک شاهد جدید می‌گیرد ولی partial می‌ماند.

هیچ import از `operationalEnergy` یا setter مالی در این هسته‌ها وجود ندارد. تمام خروجی‌ها `validationStatus=not_field_validated` و `projectApproval=blocked` دارند. نتایج جدید هیچ جایی خودکار جای annual yield یا financial pricing قرار نمی‌گیرند. paper، hash یا flag جای gate ثبت‌شدهٔ پژوهش را نمی‌گیرد.

## A1: مدل دقیقاً چیست؟
### ورودی
`project_uq` با plan `project-uq-v1`: baselineKwh **میانگین مدل پیش از ضرب عوامل mean-one** است؛ referenceCapacityKwp فقط برای مقایسهٔ specific yield است. epistemicCv/aleatoryCv، outer/inner، seed، tolerance، referenceId، inputBasis، gsaSamples و مدل Gaussian-linear همبسته جداگانه صریح‌اند. کاربر نمی‌تواند inputBasis را calibrated بگذارد؛ گزینه‌ها فقط literature_benchmark یا caller_assumed هستند.

### محاسبات
1. مدل مرجع انرژی `Y=B×E×A` با عوامل lognormal مستقل mean-one. دادهٔ ساعتی هواشناسی یا clipping نیروگاه در این مدل دوباره شبیه‌سازی نمی‌شود.
2. nested panel: outer عامل epistemic و inner عامل aleatory؛ `Var(panel)=mean conditional variance + variance of conditional means` با ddof=0 دقیقاً reconcile می‌شود. این decomposition **تجربی finite-panel** است و برآورد بین‌گروهی نسبت به population finite-inner bias دارد؛ فرمول‌های تحلیلی population هم گزارش می‌شوند.
3. P50/P75/P90/P99 انرژی به‌ترتیب q0.5/q0.25/q0.1/q0.01. برای CI، از **دو نمونهٔ IID مستقل از nested panel** با seed و seed+1 استفاده می‌شود؛ binomial rank CI روی pooled وابستهٔ nested اعمال نمی‌شود.
4. Bonferroni برای ۴ صدک × ۲ اجرا، حداقل ۹۵٪ پوشش مشترک در فرض continuous IID؛ tolerance روی عرض نسبی CI و اختلاف دو seed اعمال می‌شود. `publishableUnderAssumptions` فقط دقت نمونه‌گیری این مدل را می‌گوید، نه اجازهٔ انتشار مالی. آزمون دو seed جای مطالعهٔ جامع convergence در همهٔ budgetها نیست.
5. Sobol دقیق مدل ضربی مستقل از فرمول واریانس، شامل S1/ST/interaction؛ چون فرمول بسته است، خطای MC ندارد.
6. مثال غیرخطی Ishigami با Saltelli pick/freeze و bootstrap تقریبی ۶۴تایی با variance ثابت؛ صرفاً benchmark عددی، **نه حساسیت نیروگاه واقعی**. حدود bootstrap تقریبی‌اند و خطای تخمین variance را کامل پوشش نمی‌دهند.
7. مسیر جدا برای مدل Gaussian-linear همبسته: Shapley واریانس از conditional variance و enumeration زیرمجموعه‌ها؛ PSD و symmetry ماتریس بررسی می‌شوند. این روش دقیقاً برای مدل خطی Gaussian است، نه Shapley یک مدل غیرخطی PV. dependence بین گروه‌های انرژی lognormal در این نسخه پشتیبانی نمی‌شود.
8. رکورد مرجع و SHA256 فایل منابع کنار خروجی قرار می‌گیرد. هیچ دامنهٔ اختلاف ارزیاب‌ها به sigma یا distribution تبدیل نمی‌شود.

بودجه: outer و inner هرکدام ۱۰۰–۱۰۰۰ (حداکثر یک‌میلیون مقدار)، GSA benchmark حداکثر ۳۲۷۶۸، مدل همبسته ۲–۶ ورودی. نتیجه حتی با CI خوب، `insufficient_evidence` و `calibrationGate=blocked_literature_or_assumed_not_project_calibration` است.

## A2: joint candidate sizing و dispatch LP
`hybrid_sizing` / `hybrid-sizing-v1`؛ حداکثر ۳۰ گزینهٔ ظرفیت و ۱۶۸ interval حداکثر یک‌ساعته. PV/inverter/BESS هم‌زمان در **مجموعهٔ گزینه‌های اعلام‌شده** تغییر می‌کنند. standalone BESS با ظرفیت PV صفر و grid charging اختیاری، تولید خارجی PV/wind/hybrid، سقف import/export و حداقل انرژی **خالص تحویلی دوره (export−import)** پشتیبانی می‌شوند. مقدار صفر این الزام را غیرفعال می‌کند؛ الزام مثبت با خرید و فروش هم‌زمان شبکه قابل جعل نیست.

برای هر گزینه، SciPy HiGHS هزینهٔ خرید−فروش+wear+periodCapex را با قیود تراز AC و SOC حل می‌کند. terminal SOC دقیقاً initial است؛ borrowing انرژی اولیه برای بهترکردن جواب ممنوع است. efficiency ثابت ۰٫۸–۰٫۹۹، تعرفهٔ خرید بزرگ‌تر از فروش و wear مثبت لازم‌اند. جریان‌های متضاد هم‌زمان در پاسخ رد می‌شوند. حل ناقص یا timeout به feasible fallback تبدیل نمی‌شود؛ infeasible با solver failure فرق دارد.

`candidateSetGap=0` فقط exhaustive coverage مجموعهٔ گزینه‌ها و optimum LP هر گزینه است؛ `continuousSizingGap=null` چون هیچ bound برای فضای پیوستهٔ سایزینگ تجهیزات محاسبه نشده است. این مدل جای کنترل‌کنندهٔ قدیمی `advancedDispatch`، diesel یا دینامیک واقعی باتری نمی‌نشیند و regression آن حفظ شده است.

Auxiliaries برای BESS غیرصفر:
`(standbyW+pumpW+hvacWPerKwhC×batteryKwh×max(ambientC−setpoint,0))×dt/1000`.
این **مدل screening خطی با ضرایب اظهارشده** است، نه مدل حرارتی predictive تجهیزات HVAC. weather باید برای هر interval صریح باشد؛ interpolation مخفی انجام نمی‌شود. انرژی aux در تراز و هزینهٔ import/export لحاظ می‌شود، بنابراین دوباره به OPEX اضافه نمی‌شود. periodCapex هزینهٔ تخصیص‌یافته به همین دوره است؛ نه annualized CAPEX خودکار و نه LCOE.

adapter تولید خارجی فقط دادهٔ F1 کامل، context/hash یکسان و مرز inverter_ac را می‌پذیرد؛ واحد را به kWh interval تبدیل می‌کند و origin را حفظ می‌کند. دادهٔ ناقص، grid import به‌عنوان generation یا مرز POI به‌جای inverter_ac silently پذیرفته نمی‌شود.

## A3: batch twin / residual screening
`batch_twin` / `batch-twin-v1`؛ حداکثر ۱۰۰۰۰ ردیف، context/hash پروژه و baseline، source/hash baseline، threshold و split زمانی از پیش تعیین‌شده لازم‌اند. baseline سری expectedW به‌صورت caller-frozen وارد می‌شود؛ هش ادعاشده اصالت فایل یا استقلال baseline را ثابت نمی‌کند.

هر دارایی یک شبکهٔ پیوستهٔ زمانی دارد؛ missing و excluded و outage/curtailment و زیر threshold توان مرجع وارد residual نمی‌شوند. آموزش/ارزیابی با trainEnd جداست؛ train برای گزارش offset/noise توصیفی استفاده می‌شود، اما expectedW یا threshold را fit نمی‌کند. در نتیجه تغییر train جواب holdout را بازتنظیم نمی‌کند.

- residual=(measured−expected)/expected؛ drift اختلاف میانگین نیمهٔ پایانی و ابتدایی evaluation است.
- HI=clip(mean measured/expected,0,1)، شاخص توصیفی است نه سلامت فیزیکی تضمین‌شده یا RUL.
- گروه‌بندی threshold برای screening و در صورت حداقل چهار دارایی متمایز، Lloyd دو centroid روی residual/drift برای گروه‌بندی اکتشافی وجود دارد. group index علت خرابی نیست؛ در دادهٔ ناکافی گروه مصنوعی ساخته نمی‌شود.
- false alarms فقط با knownHealthy=true در evaluation و بر حسب **exposure روز دارایی سالم برچسب‌دار** گزارش می‌شود؛ نبود label خروجی null می‌دهد، نه صفر ساختگی. این معیار fleet/site-day کامل نیست.
- کمبود زوج معتبر یا context mismatch fail-closed است. threshold کاربر در خروجی حفظ می‌شود؛ روی همان evaluation بهینه نمی‌شود.

adapter F1 برای observed/baseline، افق کامل، مرز POI، context و unit یکسان/قابل تبدیل و annotation رخداد صریح می‌خواهد. adapter gap fill نمی‌کند. مسیر مستقیم JSON می‌تواند missing/excluded داشته باشد و آن‌ها را گزارش می‌کند. ترکیب دو فایل یکسان baseline/observed از نظر schema ممکن است ولی مدرک استقلال محسوب نمی‌شود؛ field gate همیشه مسدود است.

**A3 کامل عملیاتی نیست:** raw SCADA واقعی/مجوز دارایی، baseline مستقل تأییدشده، site holdout، qualification sensor-light و SLA false alarms میدانی هنوز فراهم نشده‌اند. خروجی `insufficient_evidence` و research_only است. هیچ RUL ساخته نشده است.

## API، SDK، flag و rollback
برای اجرای جدید هر دو `PVLIB_RESEARCH_ENABLED=true` و `PORTFOLIO_ANALYTICS_ENABLED=true` لازم‌اند. عملیات جدید در capabilities تنها با flag دوم advertise می‌شوند. UI با flag خاموش Run این مثال‌ها را غیرفعال می‌کند؛ POST مستقیم هم 503 می‌گیرد. auth، body bound، limiter، timeout ۱۲۰ثانیه و cancel/disconnect موجود اعمال می‌شوند. هر LP حداکثر ۵ثانیه دارد و سقف کل executor نیز پابرجاست؛ container/cgroup جدید اضافه نشده است.

در Climate → ResearchEditor سه مثال را انتخاب، JSON را بررسی و Run کنید؛ نتیجه و archive با همان کنترل‌های قبلی دانلود می‌شوند. توکن فقط در حافظه، بدون storage/log است. فایل خروجی شامل plan/قیمت‌ها/داده است و باید محرمانه تلقی شود. تغییر input/site، cancel و unmount نتیجه را invalidate می‌کنند. schemaهای قدیمی و archiveهای قبلی حفظ شده‌اند.

SDK: `Client(origin, token, enabled=True).run(request)` اکنون این سه operation را می‌پذیرد؛ validation فیزیکی روی سرور و binding/مرز پژوهشی روی client است. هیچ ارتباط شبکه‌ای در engine یا download runtime مدل اضافه نشده است. با خاموش‌کردن flag جدید، قابلیت به حالت قبلی برمی‌گردد؛ دادهٔ پروژه migrate نمی‌شود.

## Acceptance criteria و شواهد
1. A1 با منابع عددی منتشرشده و extraction limits همراه باشد؛ هیچ CV از range استنتاج یا calibrated تلقی نشود.
2. nested law با reconciliation و oracle تحلیلی، CI/IID و seed reproducibility، gate tolerance و حالت CV صفر تست شوند؛ Ishigami با S1/ST تحلیلی و Shapley همبسته با oracle دستی بررسی شوند.
3. A2 در مسئلهٔ کوچک با حل دستی و enumeration یک‌بعدی مستقل تطبیق کند؛ conservation، SOC، terminal، cost، aux، standalone/external و infeasibility بررسی شوند.
4. A3 افت تزریق‌شده، drift، exclusion، کمبود pairs، context mismatch، false alarms بدون/با label و جداسازی baseline/evaluation و گروه‌های مصنوعی شناخته‌شده را تشخیص دهد.
5. schema strict و پاسخ tamper، nonfinite/gate/binding و قیود trace رد شوند؛ F1 adapters context/boundary/coverage و flag را enforce کنند.
6. API واقعی Python با auth و flag، SDK واقعی و مرورگر production با JWT برای هر سه operation و دانلود/restore/cancel پاس شوند.
7. regression کامل F0/F1، UQ، API/physical، benchmarkهای قبلی، types و lint محدوده پاس شوند؛ receipt فایل‌ها و status scope را hash کند.

تست‌ها: `scripts/test_portfolio.py` (۹ تست عددی/مرجع)، `test-portfolio.ts` (actual worker/API/SDK/adapters/tamper)، `test-portfolio-browser.ts` (production Chromium)، گیت `npm run verify:portfolio` با `PVLIB_PYTHON` runtime نصب‌شده. هیچ تست synthetic به نام آزمون میدانی ثبت نمی‌شود. مسیر CI گیت portfolio شامل foundation نیز هست.

## موانع و backlog صریح
- A1 project calibration، بازتولید کامل dataset/گزارش‌های مرجع، مقایسهٔ harmonized تمام موتورهای legacy، مدل غیرخطی عمومی PV/LCOE برای nested/GSA، cross-group dependence باقی‌اند؛ convergence چند budget اکنون طبق ضمیمه پیاده‌سازی شده است.
- A2 بهینه‌سازی عمومی غیرخطی/تجهیزاتی و طول‌عمر، تجهیزات واقعی HVAC، diesel و constraintهای اختصاصی utility و UI فرم‌محور طراحی محصول باقی‌اند؛ مدل LP گزینه‌ای فعلی scope مشخص دارد.
- A3 SCADA واقعی و baseline independent، اثبات تعمیم روی دادهٔ چندسایتی واقعی، threshold qualification، event pipeline عملیاتی و RUL باقی‌اند؛ مدل فعلی batch research screening است.
- مجوز ریشه، native Safari/Windows و حقوق دادهٔ بیرونی مانند قبل مستقل از سبزی تست‌ها هستند.

## Changelog / سه پرسش کیفیت
سه هستهٔ جدید نسخه‌دار، سه مثال، فهرست مراجع، اتصال opt-in به API/SDK/editor و adapterهای F1 اضافه شدند. فرمول‌های مالی/PV/dispatch قبلی تغییر نکردند؛ manifest وضعیت partial را حفظ می‌کند. سند توقف قبلی تاریخی است و برای scope جدید benchmark/software این سند جای آن را می‌گیرد، نه برای field evidence.

ورود ناخواستهٔ پژوهش به مالی؟ خیر؛ هیچ adoption adapter اضافه نشده و result gate همیشه blocked است. رگرسیون/مرجع؟ در گیت تجمیعی اجرا و ثبت می‌شود. دقت/منشأ/محدودیت؟ در plan، output، UI، فایل reference و این سند صریح‌اند. نتیجهٔ درست نرم‌افزاری به معنی صحت پروژهٔ واقعی نیست.


## تکمیل نرم‌افزاری مرحلهٔ دوم — ۲۰۲۶/۱۱/۰۳

### پژوهش و تصمیم ثبت‌شده
- مستندات رسمی [SciPy milp](https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.milp.html) و [نسخهٔ 1.14.1](https://docs.scipy.org/doc/scipy-1.14.1/reference/generated/scipy.optimize.milp.html): ظرفیت صحیح را با گردکردن LP جایگزین نکردیم؛ `mip_dual_bound`، `mip_gap` و status خروجی صریح‌اند. زمان تمام‌شده `incomplete` است، نه optimum/infeasible. کران صرفاً متعلق به مدل اعلام‌شده است.
- [راهنمای رسمی جلوگیری از leakage](https://scikit-learn.org/stable/common_pitfalls.html#data-leakage): سایت‌ها پیش از fit جدا می‌شوند؛ آستانه فقط از دادهٔ سالم train و پیش از cutoff محاسبه می‌شود. تغییر مقادیر evaluation نباید آستانه را تغییر دهد.
- [NIST، صدک‌ها و order statistics](https://www.itl.nist.gov/div898/handbook/prc/section2/prc262.htm): روش interpolation باید صریح باشد؛ تخمین UQ از NumPy linear/R7، آستانهٔ train از `higher` استفاده می‌کند. این مرجع به‌تنهایی اثبات CI نیست: CI در کد از رتبهٔ Binomial و union bound ساخته شده است.

### قرارداد و حدود
۱. `uq_convergence` / `uq-convergence-v1`: ۲–۴ بودجهٔ اکیداً افزایشی (outer و inner هرکدام ۱۰۰–۱۰۰۰)، ۲–۴ seed متفاوت. خانوادهٔ آزمون Bonferroni تمام بودجه‌ها × seedها × چهار صدک را پوشش می‌دهد؛ reuse seed بین بودجه‌ها intentional و به استقلال بین runها متکی نیست. نمونه‌ها IID marginal هستند، نه pooling ردیف‌های وابستهٔ nested. این بررسی **دقت Monte Carlo** است؛ convergence مدل nested/GSA عمومی، صحت CV و کالیبراسیون پروژه را اثبات نمی‌کند. `calibrationGate` همواره blocked است.

۲. `hybrid_design` / `hybrid-design-v1`: چهار ظرفیت PV/inverter/battery-energy/battery-power به‌صورت پیوسته یا مضرب صحیح `unitSize` بهینه می‌شوند. هزینهٔ ظرفیت **برای همین افق** است؛ هیچ annualization یا محاسبهٔ lifetime خودکار وجود ندارد. ۱–۸۷۶۰ فاصلهٔ پیوسته، dt≤۱ ساعت؛ timeout حل‌گر ≤۶۰ ثانیه داخل timeout پژوهش ۱۲۰ ثانیه. binary جهت شارژ/دشارژ و import/export از جریان متضاد جلوگیری می‌کند. binary نصب باتری با حداقل ظرفیت مثبت به standby وصل است؛ C-rate، بازده، SOC اولیه/نهایی مساوی، حداقل SOC، clipping، بار، HVAC خطی و فرسایش throughput در ledger هستند. generation امکان curtailment دارد. حداقل تحویل مثبت = export−import؛ صفر آن را غیرفعال می‌کند. شارژ از شبکه مجاز است. هیچ مدل diesel، HVAC تجهیزاتی، دینامیک حرارتی یا degradation/lifetime اضافه نشده است. افق سالانه **قابل ورود** است ولی حل optimum برای هر مسئلهٔ سالانه تضمین زمانی ندارد؛ شاهد سالانهٔ تست deliberately صفرظرفیت است. `qualified` صرفاً صلاحیت عددی حل در gap اعلام‌شده است، نه field/project approval.

۳. `twin_site_holdout` / `twin-site-holdout-v1`: سایت‌های train/evaluation بدون همپوشانی و زمان evaluation اکیداً بعد از train؛ grid هر site/asset پیوسته و یکتا. threshold = max(minimumThreshold, quantile-higher(|measured/expected−1|)) فقط روی train سالم؛ دادهٔ کیفیت بد، event و expected کم حذف می‌شود. baseline باید مستقل و پیشاپیش frozen باشد؛ hash/منبع اظهاری **اثبات استقلال یا حقوق داده نیست**. نرخ هشدار فقط بر زمان نمونه‌های evaluation با برچسب سالم محاسبه می‌شود؛ فقدان exposure → null، نه صفر. خروجی screeningPassed به‌معنی qualification نیست و fieldGate همیشه blocked است. baseline fit، pipeline رخداد زنده، RUL و ادعای تعمیم میدانی وجود ندارند.

### معیار پذیرش پیش از گیت
- نمونهٔ صحیح: PV صحیح ۲kWp و inverter=۱٫۵kW، objective=dualBound=۵٫۵؛ همان مسئله با PV پیوسته objective=۴٫۵؛ با max PV=۱ infeasible. oracle مستقل enumeration است، نه خود حل‌گر.
- شاهد storage دوگامی: ledger دقیق η=.9، SOC terminal=0 و C-rate=1؛ tolerance هزینه ۱e−۶ و ledger در validator نسبی ۱e−۶. جریان‌های متضاد ممنوع‌اند. شاهد timeout هیچ optimum اعلام نمی‌کند.
- UQ: reproducibility، ترتیب بودجه، zero-CV، خانوادهٔ ۱۶تایی و سازگاری CI؛ انقباض یکنواخت CI هر run ادعا نمی‌شود.
- Twin: آستانهٔ ۰٫۰۵ ثابت، ۲ هشدار در ۱/۶ asset-day = ۱۲ هشدار/روز؛ تغییر evaluation آستانه را تغییر نمی‌دهد. کمبود train/exposure به null/block منجر می‌شود.
- ۱۶ تست Python، شش operation واقعی API، SDK قبلی، شش operation مرورگر production، schema/tamper و regression کامل foundation در همان گیت. تست HTTP برای گروه جدید router مجزا با limiter واقعی دارد؛ browser پس از شش اجرا پنجرهٔ ۶۰ثانیه‌ای را برای cancel رعایت می‌کند، محدودکنندهٔ production تضعیف نشده است.
- flagهای قبلی `PVLIB_RESEARCH_ENABLED` و `PORTFOLIO_ANALYTICS_ENABLED`، پیش‌فرض خاموش؛ rollback با خاموش‌کردن flag portfolio هر شش operation را می‌بندد. API authenticated، SDK allowlist و editor JSON با سه مثال جدید متصل‌اند؛ UI فرم‌محور محصول هنوز backlog است.

### وضعیت نهایی scope
این ضمیمه سه شکاف نرم‌افزاری را می‌بندد، نه تمام A1–A3 را. SCADA مجاز، baseline مستقل واقعی، داده/گزارش کامل پروژهٔ مرجع و پارامتر تجهیزات هنوز فراهم نیستند. هیچ دادهٔ مصنوعی به‌جای این شواهد ثبت نشده است. وابستگی بین گروه‌های انرژی، مدل عمومی غیرخطی PV/LCOE، تطبیق موتورهای legacy، طول‌عمر، diesel/utility، HVAC واقعی و RUL باقی‌اند. finance/annual-energy هیچ مصرف‌کنندهٔ خودکار جدیدی ندارد. خروجی‌ها `not_field_validated` و `projectApproval=blocked` می‌مانند. receipt گیت و hashها پس از تمام اصلاحات بازتولید می‌شوند.


## بازبینی پذیرش کامل پس از درخواست تکمیل تمام دامنه

گزارش تفصیلی سه مرور و تحقیق جدید: [A1-A3-COMPLETION-REVIEW.fa.md](A1-A3-COMPLETION-REVIEW.fa.md).
در این بازبینی قرارداد ورودی مستقیم Python و اعتبارسنجی status/design/primal/dual/gap و شمارش exclusions سخت‌گیرانه‌تر شد؛ ۳ تست گروهی adversarial به Python و آزمون‌های دستکاری پاسخ به API افزوده شدند (جمع Python اکنون ۱۹ تست). هیچ مدل فیزیکی جدید یا تکمیل RUL ادعا نمی‌شود. رسید انتشار پیشین که فقط `blocked_external_evidence` می‌گفت، دقیق نبود: کمبود نرم‌افزار نیز باقی است؛ اکنون وضعیت دامنهٔ کامل و هر دو نوع مانع در receipt صریح ثبت می‌شود. نتیجهٔ گیت نرم‌افزار محدود به معنی پذیرش کامل A1–A3 نیست.


## توسعهٔ مستقل از شواهد مفقود: بقای cohort

عملیات اجرایی `cohort_survival` اضافه شد: Kaplan–Meier برای right-censoring، CI نقطه‌ای Greenwood log-log، بقای شرطی و میانگین عمر باقیماندهٔ محدود به افق، IPCW Brier روی cohort سایت/زمان آینده. روش، معیارهای عددی، محدودیت‌ها و rollback در [COHORT-SURVIVAL.fa.md](COHORT-SURVIVAL.fa.md) آمده‌اند. این مسیر به API/SDK/editor متصل و در همان گیت opt-in آزموده می‌شود؛ زیرساخت بقا دیگر غایب نیست اما RUL فردی/ML، prediction interval و تأیید میدانی ادعا نمی‌شود. ۱۱ تست Python جدید (مجموع ۳۰ تست portfolio)، تست مستقل HTTP/SDK/tamper و مثال هفتم مرورگر اضافه شدند. هیچ کد مالی/انرژی قبلی تغییر نکرد. سایر backlogهای A1/A2 و pipeline عملیاتی A3 همچنان بازند.
