# توسعهٔ مرجع‌دار A1–D3: تحویل منتخب B3 / D1 / D2

## نتیجه و مرز ادعا

در این چرخه سه شکاف adapter واقعی بسته شد: PVDeg0.7.0، PV ICE0.4.3 و tmm0.2.0 اکنون واقعاً در محیط اختیاری جدا اجرا می‌شوند و در API/SDK/editor قابل استفاده‌اند. **همهٔ موارد باقی‌ماندهٔ A1–D3 پیاده‌سازی نشده‌اند.** فهرست دقیق باقی‌مانده در A1-D3-REMAINING.fa.md است. این برش جای توسعهٔ evaluator عمومی UQ، sizing تجهیزات، ingest/RUL عملیاتی، MC/Radiance، GFM، coupling/Stefan، سازگاری تقویم و provider opt-in را نمی‌گیرد.

هیچ SCADA خرابی یا دادهٔ calorimetry ساخته/حدس زده نشده؛ هیچ library test به دادهٔ تجربی پروژه تغییر نام نداده است. تمام نتایج not_field_validated، projectApproval=blocked و safetyApproval=not_assessed می‌مانند. هیچ adoption مالی/سالانه‌ای فعال نشده است.

## جست‌وجو و دادهٔ واقعاً دریافت‌شده

مخازن اولیه و آزمون‌هایشان بررسی و ۱۴ فایل/محصول مشتق‌شدهٔ کوچک (~۱MB) با commit ثابت دریافت شد. ابزار `scripts/acquire_reference_data.py --fetch` فقط در مرحلهٔ build/acquisition از `gh api` استفاده می‌کند؛ Git blob SHA1 و SHA256 بایت‌ها ثبت می‌شود. اجرای بدون --fetch فقط بایت‌های موجود را بررسی می‌کند. تمام مجوزها کنار فایل‌ها نگه‌داری شده‌اند؛ manifest مرجع `docs/reference-data/manifest.json` است.

| منبع | نسخه/commit | فایل و نقش واقعی | محدودیت |
|---|---|---|---|
| PVDeg | v0.7.0 / 7df7544b6ef848b6c94c379a16dcaefd864a89ce | PSM3 با ۸۷۶۰ ساعت NSRDB، آزمون degradation و BSD-3-Clause | فایل هواشناسی مدل‌شدهٔ آزمون است، نه SCADA یا failure/censoring |
| PV ICE | 378a012a0602062ad52f14120d672f362dcc018a؛ engine0.4.3 | دو baseline آزمونی، baseline US module/glass، آزمون upstream و BSD-3-Clause | ترکیب تاریخی/برآورد/projection؛ inventory واقعی سایت نیست |
| tmm | 9c265c20e2c5f75b5ac46d63ab466665948eb821؛ engine0.2.0 | goldenهای مقایسه با Mathematica در upstream و MIT | oracle نرم‌افزاری، نه آزمایش فناوری واقعی |
| refractiveindex.info | e6d15e364f70de1cad8a96a20f75689f2fba8b21 | Si/Green-2008.yml و CC0 | compiled/KK-consistent optical constants در 300K، نه raw stack transmission یا EQE |

منبع Si: M. A. Green، *Self-consistent optical parameters of intrinsic silicon at 300K including temperature coefficients*، DOI: https://doi.org/10.1016/j.solmat.2008.06.009 . فایل خود منبع می‌گوید ترکیب مجموعه‌داده‌ها با سازگاری Kramers–Kronig و k مربوط به band-to-band است؛ آن را «دادهٔ خام اندازه‌گیری همین دستگاه» نمی‌نامیم.

URLهای دقیق GitHub همه در manifest هستند. برای بررسی دامنه، READMEهای upstream نیز خوانده شدند؛ tmm transfer-matrix planar با coherent/incoherent و field resolution گسترده‌تر از این adapter است. PDF مقالهٔ NREL/PV ICE و صفحهٔ tutorial PVDeg در این نوبت fetch نشدند (خطای دریافت)؛ ادعای مطالعهٔ کامل مجدد آن‌ها نداریم. نتایج جست‌وجو به‌تنهایی داده یا بازتولید مقاله محسوب نشده‌اند. مجموعهٔ PVDAQ در جست‌وجو شناسایی شد، اما raw SCADA دارای metadata/حقوق/label و holdout مستقل آن در این چرخه دریافت/qualified نشد؛ آمار تجمیعی مقاله هم به ردیف خرابی تبدیل نشده است.

مجوز نرم‌افزار upstream حفظ شده است؛ مجوز و حقوق مستقل هر دادهٔ ثالث برای استفادهٔ تجاری واقعی همچنان نیازمند بررسی حقوقی است. dependencyهای محیط اختیاری توزیع binary جدید در repository نیستند و نصب از lock انجام می‌شود؛ این تحویل ادعای audit کامل مجوز تمام dependencyهای transitive ندارد.

## راه‌اندازی و rollback

محیط مرجع **نباید روی محیط core/PyBaMM نصب شود**؛ PVDeg dependencyهای جغرافیایی/notebook بزرگی دارد. هیچ dependency جدیدی به requirements معمولی اضافه نشده است.

```sh
python3 -m venv .cache/reference-env
.cache/reference-env/bin/python -m pip install -r services/pvlib_research/requirements-references.txt
.cache/reference-env/bin/python scripts/build_reference_examples.py
```

تمام dependencyهای محیط اجرا در `requirements-references.lock.txt` نسخه‌ثابت‌اند؛ packageهای علمی اصلی NumPy2.2.6، SciPy1.15.3، pandas2.3.3 و pvlib0.13.1 حفظ شده‌اند. محیط جدا در .cache و خارج از artifact منبع است و از روی lock بازسازی می‌شود. coverage7.10.6 برای سازگاری import numba/coverage پین شد؛ در اولین نصب namespace coverage باعث شکست import شد، نه خطای مدل. lock خروجی pip freeze این محیط است، نه hash-lock یا اثبات امنیت supply chain.

برای سرویس:

```sh
export PVLIB_RESEARCH_ENABLED=true
export REFERENCE_MODELS_ENABLED=true
export PVLIB_REFERENCE_PYTHON="$PWD/.cache/reference-env/bin/python"
# auth configuration موجود سرویس نیز لازم است؛ secret در فایل/مثال ثبت نمی‌شود.
```

runtime فقط برای سه operation allowlist استفاده می‌شود؛ بقیه همچنان PVLIB_PYTHON دارند. نبود PVLIB_REFERENCE_PYTHON → 503/REFERENCE_RUNTIME_NOT_CONFIGURED؛ هیچ fallback، pip install یا دانلود runtime انجام نمی‌شود. flag خاموش → 503/REFERENCE_MODELS_DISABLED. rollback همان flag=false است، بدون migration. مسیر worker با -I/-B و shell=false، بودجه‌ها، concurrency و rate limit شش درخواست در دقیقه حفظ شده‌اند.

در تب اقلیم/ویرایشگر، چهار مثال وجود دارد: PVDeg، PV ICE، Coherent optics regression و Silicon literature constants. JSON را بررسی و اجرا کنید؛ archive/cancel/error/توکن حافظه‌ای همان lifecycle موجود است. restore آرشیو اجرای تازه نیست. SDK از `Client(...,enabled=True).run(request)` روی JSONهای `docs/examples/references/` استفاده می‌کند. هیچ apply به پروژه یا موتور مالی وجود ندارد.

## قراردادهای محاسباتی

### D1: pvdeg_acceleration

اجرای واقعی `pvdeg.degradation.arrhenius_deg` با POA، دمای exposure، RH ماده و chamber reference صریح. temperatureBasis حتماً cell یا module است؛ انتخاب basis به عهدهٔ منشأ ورودی است و auto-calibration انجام نمی‌شود. نرخ:

`I^p RH^n exp(−Ea/(R T))`؛ `AF=rate_chamber/mean(rate_field)`.

Ea بر حسب kJ/mol، T ورودی Celsius و داخل Kelvin، R=0.00831446261815324 kJ/mol/K. گام‌ها یکنواخت‌اند و average زمانی مساوی‌وزن است. basis نور/رطوبت/دما یا p=0 و n=0 صریح است؛ محرک صفر با exponent صفر یعنی dependency خاموش، مطابق رفتار upstream. denominator صفر رد می‌شود. baseEnergyBasis=undegraded و mechanisms=[] برای جلوگیری از اعمال دوباره الزامی است، ولی اثبات provenance baseline نیست. خروجی AF شتاب **chamber نسبت به field** است؛ retention، انرژی، عمر و RUL از آن ساخته نمی‌شود.

بازپخش سالانهٔ upstream از surface RH محاسبه‌شده با **module temperature** ولی نرخ پیش‌فرض با **cell temperature** استفاده می‌کند. این تمایز در test/generator ثبت شده و در schema basis اجباری شده است. ابتدا مقایسه با module exposure به عدد 13.9669 رسید و golden رد شد؛ tolerance تغییر نکرد. پس از همسان‌سازی forcing دقیق upstream، AF=12.838509305802543 داخل tolerance ازپیش‌موجود 12.804±0.1 است. این اختلاف باقی‌مانده به‌عنوان exact match یا accuracy فیزیکی تعبیر نمی‌شود؛ محیط وابستگی‌ها نسخه‌ثبت‌شدهٔ ماست.

### D2: pvice_massflow

اجرای واقعی `PV_ICE.Simulation.calculateMassFlow` برای glass روی baselineهای ثبت‌شدهٔ upstream_test و us_glass_baseline. فقط installationScale و collection/lifetime override محدود مجاز است؛ caller path یا کد دلخواه ندارد. engine در tempfile کار می‌کند؛ cwd پیش از cleanup بازگردانده می‌شود. این بخش global cwd را موقتاً عوض می‌کند، بنابراین برای worker ایزوله و single-job است، نه اجرای thread-parallel داخل یک Python process.

واحد خروجی کتابخانه g است و به kg تبدیل می‌شود. دو stage closure:

`manufacturing_input + remfg_yield = used_in_modules + manufacturing_scrap`

`total_landfill = eol_landfill + manufacturing_landfill`.

TS سال/نصب/area/جرم واردشده به ماژول را از projection مستقل CSV frozen کنترل می‌کند و ledgers/totals را بازحساب می‌کند. این دو ledger اثبات closure همهٔ جهان مواد یا اعتبار Weibull نیستند. recyclingها، stock انتهای افق و سیاست عمر همان baseline/engine است. LCA، credits، اقتصاد یا eol cost از این adapter استخراج نمی‌شود؛ operation قبلی circular_lca مستقل و همچنان محدود است. no_collection نیز با baseline واقعی replay می‌شود.

در upstream_test، ۱۰۰MW با eff10% → area=1,000,000m²؛ glass=10,000g/m² → virgin stock سال اول=10,000,000kg، scrap صفر طبق fixture. سه تابع unmodified upstream (`test_project_lifetime`، `test_infinite_Weibull`، `test_landfilledArea_vs_AreafromWaste`) واقعاً اجرا می‌شوند؛ کل suite PV ICE اجرا نشده است. library0.4.3 ResourceWarning مربوط به file handle صادر می‌کند؛ suppress یا به خطای ledger تبدیل نشده، و worker کوتاه‌عمر/temp isolation دامنهٔ اثر را محدود می‌کند. qualification cross-platform/سرور چندنخی ادعا نمی‌شود.

### B3: coherent_optics

اجرای واقعی `tmm.coh_tmm` برای فیلم تخت coherent با n/k صریح در **همان grid** طیفی. نه interpolation و نه extrapolation. incidence medium غیرجاذب؛ اولین/آخرین محیط semi-infinite و thickness=null؛ finite layers تا۱۲ عدد، wavelength۲۰..۴۰۰۰nm، s/p/unpolarized و حداکثر۲۵۶ نقطه. برای جلوگیری از stabilization/clamp پنهان opacity، `|Im(delta)|>20` رد می‌شود. critical-angle/domain نامعتبر ممکن است fail-closed شود.

شاهد TS از **field-admittance characteristic matrix** مستقل از روش interface-matrix کتابخانه استفاده می‌کند؛ R/T و جذب کل و انتگرال‌های انرژی را کنترل می‌کند. T توان واردشده به substrate نیمه‌بی‌نهایت است، نه لزوماً نوری که از کل دستگاه خارج می‌شود. جذب گزارش‌شده فقط مجموع فیلم‌های محدود است؛ per-layer allocation/roughness/incoherent optics و اتصال خودکار به EQE/electrical MPP عرضه نشده است.

golden upstream Mathematica در angle0.1rad: s: R=0.37273208839139516 و T=0.22604491247079261؛ p: R=0.37016110373044969 و T=0.22824374314132009. شاهد مستقل Fresnel و quarter-wave و sweep زوایا/قطبش نیز هست. مثال Si از grid اصلی 500..1100nm بدون interpolation استفاده می‌کند؛ فیلم۱۰۰nm و substrate lossless n1.5 **فرض‌های مثال** هستند، نه دستگاه اندازه‌گیری‌شده. آزمون bare-Si از n/k واقعی فایل و Fresnel بسته برای تطبیق استفاده می‌کند. هیچ benchmark measured EQE یا تأیید فناوری tandem ادعا نمی‌شود.

## دقت، provenance و امنیت

float64 و witness نسبی1e−7 (با scale حداقل۱ برای quantities عمومی) است؛ rateهای Arrhenius بسیار کوچک جدا با tolerance نسبی1e−9 کنترل می‌شوند تا absolute tolerance بی‌معنا نشود. این‌ها دقت عددی‌اند نه physical accuracy. engine version/source hash، reference hashes، plan/input binding و runtime manifest در نتیجه است؛ hash اصالت حقوقی/علمی caller را اثبات نمی‌کند. runtime lock جدا همراه receipt hash ثبت می‌شود، اما source hash یک فایل engine معادل hash تمام dependencyها نیست.

فایل‌های frozen پیش از استفاده بررسی می‌شوند، source/model/provider/tool دلخواه وجود ندارد و دادهٔ upstream وارد instruction flow نمی‌شود. فایل‌های آزمون .txt تنها در تست توسعهٔ مشخص، بعد از ثبت hash، از مخزن pinned بررسی‌شده بارگذاری می‌شوند؛ API هیچ مسیر اجرای فایل دریافت نمی‌کند. Offline test در process تازه، connect/connect_ex/sendto/DNS را پیش از import می‌بندد؛ ssl همچنان socket class واقعی دارد. آزمون قبلی جایگزینی socket class import ssl را می‌شکست و اصلاح شد؛ خطای import به‌عنوان مشکل علمی جا زده نشد.

## سه review و پژوهش تکمیلی

1. dependency/source review: بررسی API واقعی و source/unitهای PVDeg و actual upstream tests؛ نصب مستقل، pin نسخه و حفظ core. اختلاف cell/module کشف، forcing درست و basis صریح شد؛ tolerance upstream تغییر نکرد.
2. data/rights و numerical review: دریافت pinned baselineها/مجوز PV ICE و CC0 Green2008، بررسی raw CSV units و کد material flow؛ تبدیل g/kg، stage identities، tempfile/cwd و limits ثبت و تست شد. baseline ادبیات یا آینده دادهٔ میدانی نامیده نشد.
3. independent-physics/security review: README/source/testهای tmm و goldenهای Mathematica، characteristic matrix مستقل، passivity/opaque-budget و Fresnel/quarter-wave بررسی شد؛ tamper حفظ‌کنندهٔ R+T هم باید با oracle مستقل رد شود. API flag/runtime/path، SDK، browser و آفلاین بودن واقعی آزموده شد.

این reviewها کار همین agent هستند، نه ممیزی مستقل شخص ثالث. نتایج web search راه یافتن منبع بودند؛ مبنای replay بایت‌های pinned و تست‌های واقعی‌اند، نه خلاصهٔ جست‌وجو.

## اجرای گیت و changelog

```sh
PVLIB_PYTHON="$PWD/.venv/bin/python" \
PVLIB_REFERENCE_PYTHON="$PWD/.cache/reference-env/bin/python" \
npm run verify:references
```

گیت: بررسی بایت‌ها و derived examples، ۱۳ تست Python شامل زنجیرهٔ سالانه و سه تست واقعی upstream، API/SDK/tamper و angle/polarization witness، pip check محیط جدا، کل verify:remaining (شامل فازهای قبلی)، lint و browser production چهار مثال. receipt واقعی `docs/audit/REFERENCE-MODELS-GATE.json` است؛ ready-for-review فقط این برش را می‌پوشاند و allRemainingItemsCompleted=false باقی می‌ماند. CI برای اجرای آن تنظیم می‌شود؛ remote CI اجراشده تلقی نمی‌شود.

Changelog: سه operation واقعی اختیاری با schema/witness و مسیر runtime مستقل؛ داده و license/hash + ابزار acquisition/derive؛ چهار مثال UI/SDK؛ tests و gate. هیچ تغییر مالی/سالانه، secret یا network dependency زمان اجرای engine اضافه نشده است. برای roadmap کامل، کار نرم‌افزاری و دادهٔ مستقلِ باقی‌مانده باید جداگانه بسته شوند.
