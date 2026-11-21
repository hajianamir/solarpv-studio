# گزارش تحویل بازبینی و تکمیل۳۰–۴۰
2026-11-03؛ شاخه `arena/237e6ea2-solarpv-studio`؛ مبنا `c3f9289fd76c04267f1972605077f6627cfaeeae`؛ موتور **1.15.0**. بدونmerge/historyrewrite.

## نتیجه
تمام مراحل۳۰تا۴۰ با کد و تست مرور شدند. بخش‌های مهندسی ناقص۳۱–۳۴ و غایب۳۸ در دامنهٔ برنامه‌های ثبت‌شده پیاده‌سازی و وارد suite/CI شدند؛ سایر مراحل با رگرسیون عددی و عملی دوباره بررسی شدند. جدول مرحله‌به‌مرحله، راهنمای استفاده، قرارداد، معادلات و محدودیت‌ها در `../PVLIB-REVIEW-30-40.fa.md` است. PLAN پیش از کد در `PVLIB-REVIEW-30-40-PLAN.fa.md` ثبت شد.

### رفع‌های بازتولیدپذیر
۱. **نتیجهٔ معتبر شب در چنداینورتر رد می‌شد:** Python خروجی signedمنفی می‌داد ولی guardTS به‌اشتباه شرطPVWattsتک‌اینورتر را رویrootبلوک‌ها اعمال می‌کرد. فرض نادرست حذف و کنترلchildResults و ترازsigned حفظ شد؛ رگرسیون با و بدونکابلAC اجرا می‌شود.
۲. **انرژی ساختگی مدل غیرفعال پذیرفته می‌شد:** افزودنgridImportWh=12345 وnetGridWh=-12345بهPVWattsپایه قبلاً پذیرفته می‌شد. اکنون شواهدplant/import/کابلAC/مصرف‌داخلی در صورتنبودمدل متناظر، درکل/ماه/نمونه رد می‌شوند؛ آرشیو نیز همان guard را دارد.

### تکمیل‌های واقعی
-۳۱: inventoryجاریv2با۱۸حوزه، callsiteواقعی، دامنه/شکاف/نوعشاهد/tolerance و تست اجرایی شاهدهای نام‌دار؛ v1 وSTATUSقدیمی صریحاً snapshotتاریخی‌اند.
-۳۲: شبکهٔ۸۱۹۲حالت در **هر دو زبان** با قواعدانتظار مستقل:۴۳۵۲رد/۳۸۴۰مجاز.۱۶اجرای عددی همهٔزوج‌های قابل‌جمع گزینه‌های همین شبکه را پوشاند؛۳۸۲۴حالت فقطcontract-only هستند. تک‌تکstateها درartifactتولیدی ثبت می‌شوند. این شاهد تمامدامنهٔپیوسته یا همهٔترکیب‌هایعددی نیست.
-۳۳: مرجععددیv2برایheat/PVWatts/ground/cable/integration، شناسهٔپارامترهایfixture و فهرست۱۸شاهد معادله‌ای با دامنه/محدودیت/tolerance و آزمون‌های حساسیت. hashفقطهویتfixtureاست؛ ModelChainهمانکتابخانه جداست.
-۳۴: declaredunitadapter با۳۲ترکیبواحد، source/version/reference/site/meaninterval/10mwindصریح، preview/confirm، rawCSV+manifest+canonicalreceipt، SHA256 وکنترل مجددتبدیل درTS/Python، archive/bundle/clone و مرورگرواقعی تاIDBreloadrestore. rawNSRDB/PVGISشناسی/حدسmetadataاضافه‌نشده، مطابقscopeثبت‌شدهadapter.
-۳۸: balanced_three_phase_lvACcable باR/V/Iصریح، حلsignedریشهٔmonotonic، rejectionجریان/دامنه، اعمالپسازauxiliaryوپیشازtransformer، فقطroot، خروجیماه/نمونه، UI/report/ledger/explorer/guard و تستمستقلbisection/نقطه‌ثابت/حساسیت.

## شواهد نهایی محلی
- **۱۵۲تست Python PASS**؛ برخلاف تحویل قبلی، foundation اکنون جزو دامنهٔ همیندرخواست و نسخه‌شده است و تست‌هایآن ازتحویل مستثنا نیستند. اجرای داخلی۱۸شاهدregistry دوباره بهعدد۱۵۲اضافه نشده است.
- `test:study:workflow` باPythonواقعی PASS؛ suiteجدید review30–40 و matrixدو زبان به زنجیرهٔCI اضافه شدند. طبقه‌بندیتمام۸۱۹۲caseدر `.cache/study-evidence/contract-matrix-v2.json` تولید می‌شود؛ CIبرایهرOS همانفایل راartifact۱۴روزه نگه می‌دارد.
- `test:study` HTTP/process PASS؛ اجرایواقعیPython،JWT،body/rate/capacity/timeout/kill/abort/runtime/outputbounds حفظ شدند.
- `test:study:browser` direct+storage PASS: فرمکابل، manifestغلط→رد→اصلاح، previewبدونapply/تأیید، دریافتreceipt، چنداینورتر+مصرفکمکی+سقفمتغیر+کابل+هواشناسیتبدیل‌شده، JSON/CSV/report، archiveوIDBreloadrestore. `test:browser`قدیمی نیز سری وباtimeout۱۸۰ثانیه PASS.
- build،TypeScript،npmtest PASS؛ lintصفرerrorو۹۵warning؛ auditباPHYSICS_DIFF_BASE=c3f9289 PASS؛ diffcheckPASS. پسازسخت‌گیرینوعbooleanدرreceipt، Pythonکامل۱۵۲تست، workflowو مرورگرdirect/storage مجدداًPASSشدند؛ تستinventoryوtsc نیز مجدداًPASSشدند.
- workerمبنایc3f9289در۶fixture baseline/plant/blocks/mppt/auxiliarySchedule/exportLimitScheduleباworkerجدیدمقایسهشد: samples،summaryوmonthlyدقیقاًبرابر. اینregressionاست، نهشاهد مستقلصحتفیزیکی مدلقدیمی.
- کابلAC:۵تست؛ ازجمله۸۷۸۴بازهٔمصنوعیتماماًشب زیر16MiB و رد۸۷۸۵. weatherimport:۴تستPython و suiteTSباSHAمرجعNode و۳۲ترکیبواحد؛ rehashکردنmanifestنادرست نیز ردشد.

## فایل‌ها و منابع
کدهای اصلی: `declaredWeatherAdapter.ts`، `DeclaredWeatherImporter.tsx`، worker، studyContract/Workflow/Explorer/Insights و StudyBuilder/Panel؛ تست‌هایجدید: `test_ac_cable.py`،`test_weather_import.py`،`test-study-review-30-40.ts` و `test-study-contract-matrix.ts`؛ inventory/reference-v1/v2 و تست‌هایfoundation اکنون درهمینتحویل ثبت می‌شوند. `@noble/hashes@1.8.0` فقطبرایSHAهمزمانِbrowser-safeبه‌صورتنسخهٔصریح افزودهشد؛ knownvector ومرجعNode آنرا می‌سنجند. هیچliteral/hashmaskexception بهaudit اضافه‌نشده است.

منابعخوانده‌شده: pinnedpvlib0.13.1 `transformer.simple_efficiency`،`iotools.read_psm3` و `irradiance.get_ground_diffuse`؛ لینک‌های کاملدرراهنما ثبت‌اند. مدلکابل ازتوازنPin=Pout+3RI² وunityPFباولتاژدریافتثابت استفاده می‌کند؛ نه ادعایloadflowواقعی.

## حدود صریح
تمامشواهد عددی اینتحویل مصنوعی/تحلیلی/منتشرشده‌اند. فایلعملیاتیپروژه ارائه‌نشده و ساخته/صفرپرنشده است؛ استفاده ازدادهٔواقعی پروژه وfieldvalidation هنوز بدونآن ممکننیست. خواستهٔتکمیل باعث حدسواحد،ارتفاعباد،زمان،پارامترتجهیزات یا ادعایجعلیاعتبارسالانه نشده است. محدودیت‌هایفیزیکی اعلام‌شده (reactive/loadflow،کنترلگذرا،عدمبازحلپسازcap،calibration،ایمنی/bankability) حذف‌شده تلقینمی‌شوند. مراحل۴۱/۴۲ خارجازدرخواست‌اند. Dockerاجرانشده است. CIدقیقSHAپسازpushدرپاسخنهایی اعلاممی‌شود؛موفقیتقبلی بهنسخهٔجدید نسبتداده نمی‌شود.
