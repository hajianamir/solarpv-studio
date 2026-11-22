# مرحلهٔ۵۳ — سایهٔ محدود و مدار فرضی bypass؛ نتیجه و گیت‌ها
تاریخ2026-11-03؛ شاخه `arena/237e6ea2-solarpv-studio`؛ HEADپایه `5438fb59f4bb5cde05c20818b780464e1fe28752`. تغییرات در working tree؛ commit/push/merge و CIجدید انجام نشده است.

## ترتیب درخواست
**پیش از کد۵۳ دقیقاً سه دور بازبینی قبلی انجام شد**؛ جزئیات در `PVLIB-THREE-REVIEWS.fa.md` و برنامهٔ قبل از کد در `PVLIB-THREE-REVIEWS-AND-53-PLAN.fa.md` است:
۱. مرور قرارداد/گیت/کد: نقص manifest مراحل۵۰–۵۲ و وضعیت منسوخ roadmap۴۸/۴۹ پیدا و اصلاح شد؛ planکامل/hash به نتایج اضافه شد.
۲. regression:۳۳تستresearch،۱۵۸تستPythonمحصول، تمامworkflowمطالعه شامل۴۴–۴۷، typecheckclient/node وbuild موفق. تلاش اولworkflowبه‌علتpythonسیستمexit3داد؛ باPVLIB_PYTHONمحیطpinned کل زنجیره موفق شد، نه با تضعیف تست.
۳. بازآزمایی اصلاحات:۳۳تستresearch، replayCLI۵۰–۵۲ وhashهای فایل‌هایپایدار، npmtestششbenchmark وHTTP/processمستقیم موفق. تمامشروطعملیاتیblockedماندند.

این سه دور مرور دستی تک‌تک خطوط تمام تاریخچه یا اعتبارسنجی میدانی نیستند. کمبود اصلXLSX/ارتفاعباد،منابعواقعی۴۹،مدارک۵۰،کنترلر۵۱ وsurvey/لاگ۵۲ باکد قابل‌رفع نیست و به‌عنوان مورد باز باقی است. گزارش‌های قدیمی نتیجهٔ قدیمی‌اند، نه CIدقیقSHAفعلی.

## دامنهٔ مرحله۵۳
برنامه و مرجع پیش از کد: `PVLIB-53-PLAN.fa.md`؛ [Möller–Trumbore ray/triangle](https://en.wikipedia.org/wiki/M%C3%B6ller%E2%80%93Trumbore_intersection_algorithm). اجرای مستقل پژوهشی:
- هندسهٔ ENUمتر، مستطیل‌های finiteبا normal=u×v و موانع مثلثی opaqueدوسویه؛ بدون فرض infinite sheds.
- directDNIباprojectionسطح وکسرsampleقابل‌دید؛ diffuseفقطآسمانisotropic باrayهایhemisphereووزنcosine. موانع near-object/horizon-like باید صریحاً meshشوند؛ horizonlossاضافی اعمال نمی‌شود.
- gridسطح وquadratureآسمان قطعی؛ finiteedgeها قابل‌نمونه‌گیری‌اند اما aliasingوخطایresolution وجود دارد. مختصات coplanar یا جدایی‌های نزدیک۱e-8m پشتیبانی نمی‌شوند. directVisibleFraction وقتیdirectصفر است قراردادی۱ گزارش می‌شود؛ ارزیابی visibility کاربردی در آن حالت نیست.
- patchها خودکار blocker نیستند؛ ردیف‌های مجاور/terrainبایدtrianglesصریح داشته باشند. ground/rear/reflection/anisotropicdiffuse،بازسازیsurvey وداخل‌کردنخودکار۳بعدی مدل۵۲ تحویل نشده‌اند.
- شبکهٔصریح: هرpatchیکsubstringیکنواخت،زیررشته‌هاسری،رشته‌ها common-voltage موازی باblockingایده‌آل. هرpatchدقیقاًیک‌باردرwiringاست.
- **مدل الکتریکی فرضی خطی است، نه مدل فیزیکی cell/diode تأییدشده**: Iscمتناسبirradiance،Vocثابتدرنورمثبت،bypassباافتثابت. substringکاملاًتاریکدراینقراردادهمیشه-dropمی‌دهد. دما/logVoc/reversebreakdown/مقاومت/cell-levelmismatchداخلpatchپشتیبانی نمی‌شوند.
- MPPسراسری همین مدل piecewise-linear با همهٔknotها و نقاطstationary هرsegment محاسبه می‌شود؛ localgrid کهpeakراازدستبدهد نیست. این تضمین فقط برایمعادلاتفرضی است،نهPVواقعی.
- بودجهٔپیش‌برآوردray/triangle حداکثر۲میلیون،۲۴patch،۱۲۸triangle،grid≤۱۲،skyMu≤۸ وskyAz≤۳۲؛ cancellationدرray/triangleوخطابدونfallback. deadlineزمانیندارد.

## حسابداری بدون doublecount
خروجیopticalincidentWبه‌هیچ‌وجهelectricalWنیست. MPPشبکه،جمعMPPزیررشته‌هایisolated وmismatchبرایقبلوبعدجداست:

`networkReductionW = independentSubstringReductionW + additionalMismatchW`

additionalMismatchتغییرmismatchاست وsignedمی‌ماند؛نبایدکلmismatchیاincidentWنوریبهآناضافهشود. هیچ‌خروجیبهwaterfall،auxiliary،انرژی،حرارت یا مالی موجود متصل نشد. این snapshot انرژی سالانه تولید نمی‌کند.

## تست‌های پس از کد۵۳
**۴۲تستresearch PASS** شامل۹تست جدید۵۳ و۳۳قبلی:
۱. oracleمستقلrayبا حل دستگاه۳×۳، پشت/جلویray،windingمعکوس،parallel وself-origin.
۲. سایهٔنیمه،لبهٔfiniteوحرکتسایه بهpatchمجاور باخورشیدمایل؛عدمmutation وplanhashوidentityحسابداری.
۳. diffuseافقیبدونمانع،انسدادنیم‌آسمانباwallfinite،سقفfiniteبزرگ وrefinementآسمان.
۴. چندpeakbypassباoracleتحلیلی،تاریکی وuniformsymmetry.
۵. شبکهٔموازیولتاژمشترک باoracleمستقلbrentqبرایجریان و جست‌وجویpeakدرdomainولتاژ؛MPPومismatch.
۶. schema/NaN/geometry/wiring/بودجه/cancel وnightDNIنامعتبر.
۷. viewfactorتحلیلیskyسطحمایل وprojectiondirectمستقل.
۸. CLIواقعی باreadbackhash،cancel-fileوduplicateJSON؛خطاresultجدیدنمی‌نویسد.
۹. gridrefinementدرمرزسایهٔfixtureوصفرشب.

دراولیناجرادوفرضfixtureغلطبود: wallدقیقاًرویoriginبودکهطبققراردادself-hitنادیدهاست؛و سایهٔجابجاشدهرویpatchدومدرانتظارfixtureلحاظنشدهبود. wallبه۰٫۰۱مترمنتقل و انتظارpatchدومبه۰٫۵اصلاحشد؛الگوریتم/thresholdبرایPASSتغییرنکردند. oracleمستقلپرتوومدارپسازآنهمموفقبود.

**۱۵۸تستproductionPython PASS پس از کد۵۳**،در۵۳٫۴۴ثانیه. matrix۸۱۹۲قرارداد:۴۳۵۲رد،۱۶runtime،۳۸۲۴contract-only. `git diff --check`:PASS. typecheck/build/workflowدرسه‌دورپیشاز۵۳اجراشدند؛کدTypeScriptاینمرحلهتغییرنکرد. مرورگرواقعی وCIWindows/Linuxاین‌نوبتاجرانشده‌اند.

## اجرای عملی CLI — فقط synthetic
ورودی `docs/examples/research/shading-synthetic-plan.json`؛ خروجی `docs/audit/PVLIB-53-SYNTHETIC-RESULT.json`.
دوpatchیک‌مترمربعی،DNI۱۰۰۰وDHI۱۰۰W/m²،سقفfiniteروی‌نیمیازpatchاول،دوsubstringسری:

| شاخص | بدون انسداد | پس از انسداد |
|---|---:|---:|
|توان نوری incident،W|2200|1688.4765625|
|MPPشبکهٔفرضی،W|165|115.190134290|
|جمعMPPisolated،W|165|126.635742188|
|mismatch،W|0|11.445607897|

کاهشMPPشبکه49.809865710W = کاهشisolated38.364257813W + mismatchاضافی11.445607897W. نورblocked511.5234375Wجداست وبهکاهشMPPاضافهنمی‌شود. بودجهٔتخمینی۴۱۶۰pair؛زمانمشاهده‌شدهیک‌اجراحدود۰٫۰۱۳ثانیه،نهSLAیاreal-timeguarantee.

refinementنوری/مداری:
|grid/skyMu/skyAz|تواننوریپسازسایهW|MPPپسازسایهW|
|---|---:|---:|
|4/4/16|1688.4765625|115.190134290|
|8/8/32|1688.020324707|115.187142734|
|12/8/32|1687.604437934|115.146759646|
نتایجنزدیک‌انداماexactنیستند؛اینیکمطالعهٔconvergenceکافیبرایپروژهواقعی محسوبنمی‌شود. plan/hashفایلخروجیوحسابداریآنreadbackبررسیشد.

## فایل‌ها و گیت باقی‌مانده
- `services/pvlib_research/shading.py`
- `services/pvlib_research/tests/test_shading.py`
- CLIزیر‌فرمانshading وREADMEپژوهش
- plan/resultمصنوعی بالا؛roadmapباوضعیتجزئیبه‌روزشده.

**پذیرش عملیاتی۵۳ blocked است.** هندسهٔواقعی/wiring/bypassسازنده و منابعفیزیکمدار،independentray/circuitbenchmarkومقایسهٔپروژه،resolutionکافی و تأییدمهندسیلازم‌اند. مدلخطیجایsingle-diodeواقعی،cell-levelspatialmismatchیاSAMgradeنیست. هیچادعایfieldvalidated،bankableیاIECcomplianceمطرح‌نشده‌است. تغییراتunrelatedحفظ وstageنشده‌اند.
