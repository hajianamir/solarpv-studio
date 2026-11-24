# نتیجهٔ اجرای درخواست۴۸/۴۹ — تحویل جزئی، گیت‌های عملیاتی هنوز باز
تاریخ2026-11-03. **این سند تأیید تکمیل عملیاتی مرحله۴۸یا۴۹ نیست.**

## خلاصهٔ صریح
- خود workbook از راه ابزار وب قابل خواندن شد و بخش‌های metadata، هواشناسی و validation آن بررسی شدند؛ فایل کامل باینری در محیط اجرای Python دریافت نشد. درخواست مستقیم HTTPS از این محیط با خطای اتصال شکست خورد.
- parser سخت‌گیر XLSX نسخه۳، ورودی پژوهشی excerpt، هدف مستقل back_of_module و worker مستقیم pvlib، جست‌وجوی محدود train-only و بودجهٔ عدم‌قطعیت شرطی چندساله پیاده‌سازی و تست شدند.
- یک **برازش پژوهشی واقعی روی۷مشاهدهٔ استخراج‌شده** اجرا شد؛ نتیجه برای کاربرد عملیاتی رد می‌شود: holdout بدتر است، خارج از envelope train است و ارتفاع باد/اصل فایل/شواهد کالیبراسیون احراز نشده‌اند.
- مرحله۴۹ از نظر ابزار شرطی پیشرفت کرد؛ هیچ بودجهٔ واقعی project-energy یا P50/P90 پروژه با این دادهٔ حرارتی ساخته نشد. وضعیت مراحل۴۸/۴۹درroadmap عمداً complete نشده است.

## وضعیت سه گیت
| گیت | اقدام انجام‌شده | وضعیت واقعی |
|---|---|---|
|۱. فایل، زمان، واحد و QC|ابزاروب XLSX را به۷۱۷بخش متن parseکرد. headerهای واقعی Meteo/Validation، زمان end-labeled60min، CETGMT+1، سنجه‌ها و فیلترهای چهارگانه خوانده شدند. فقطT7حسگرTmodدارد. parserXLSXباMD5نسخه۳،SHA256محلی و joinUTCبدونfill نوشته شد؛ excerptواقعی با provenanceجدا parseشد.|**جزئی**: binaryکامل وverifyمحلیMD5/SHAآن در دسترس نیست؛ همهٔ ردیف‌ها بررسی/parseمحلی نشدند.|
|۲. ارتفاع حسگر باد|مدلLufftUMB600وaccuracyباد±0.3m/sدرخودفایل دیده شد؛ ارتفاع نصب در منابع خوانده‌شده پیدا نشد. metadata خروجیwindHeightM=nullاست؛ hubheightیاارتفاعپیش‌فرضسازنده جایگزین نشد.|**blocked**: سند ارتفاع نصب و کالیبراسیون/بازبینی مستقل لازم است.|
|۳. هدف پشت ماژول|thermal_worker.py باtarget=back_of_module،measuredFrontPOAوFaimanجدا پیاده‌سازی شد؛ درخواستcellردمی‌شود. خروجی نهStudyResultاست و نه توان/انرژی.|**در مسیر پژوهشی پیاده‌شده**؛ UI/workerانرژی موجود تغییر نکرده و اتصال عملیاتی به آن تحویل نشده است.|

## دادهٔ واقعی مورد اجرا و محدودیت استخراج
منبع:DTU، DOI10.11583/DTU.13580759.v3،CCBY4.0. فایل اصلی:
https://ndownloader.figshare.com/files/34726600

اطلاعاتsheetMeteoازchunkهای۱و۳۶،T7ازchunk۳۵۰،headerوflagsازchunk۸۵ خوانده شد. **۷ردیف به‌صورت رونویسی از متن ارائه‌شدهٔ ابزار** در docs/examples/research/dtu-v3-t7-rendered-excerpt.csv ذخیره شدند؛ نه originalXLSXexport و نه synthetic. این تفکیک در receipt وREADME نیز ثبت شده است. محلیCETساعت۱۱تا۱۷روز۴ژوئن۲۰۱۹ بهUTC۱۰تا۱۶ تبدیل شد؛ DSTحدسی یا اصلاح۵دقیقه‌ای مجدد اعمال نشد. SHA256زیر فقط مربوط بهCSVاستخراجی است:

`e4ce1e6a329e520b61cd9a4681c7d2977a240e249fd993e7e16a11fb5f8339a6`

نامT7/Monofacial/HSAT،flagsوPOA/Tair/wind/Tmod از منبع واقعی آمده‌اند. excerptبه‌تنهایی کنترل کیفیت سالانه، نمایندگی فصل‌ها یا دسترسی به اصل داده را ثابت نمی‌کند.

## نتیجهٔ برازش پژوهشی
مدل:pvlib0.13.1،Faiman،هدفback_of_module،بادnativeبدونتبدیلارتفاع. چهارمشاهدهtrainو سهholdoutزمانی. gridثابت۳نقطه در هرپارامتر،۳دورrefinement، سقف۴۰فراخوانی و۱۲۰ثانیه؛ مجموع فراخوانی workerواقعی۲۰بار. candidateها holdoutرا نمی‌بینند.

اولین اجرای boundsپژوهشیu0=[5,60] در candidateگرم‌تر از۱۵۰°C با خطای worker متوقف شد. این شکست صحیح بود؛ هیچ fallback یا تضعیف gate انجام نشد. نسخهٔ plan بهu0=[10,60] محدود شد، با ذکر دلیل؛ این تغییر براساس residual/test انجام نشد. این plan پیش‌ثبت مستقل نیست و boundsمصوب مهندسی هم نیست.

| سنجه | baseline: u0=29.5,u1=1.6 | بهترین grid پژوهشی: u0=35,u1=0 |
|---|---:|---:|
|RMSE train،°C،۴جفت|2.379158485|2.275264032|
|MBE train،°C|1.078484191|-1.574702443|
|RMSE holdout،°C،۳جفت|2.811939874|3.779953117|
|MBE holdout،°C|-2.187744888|-3.573015809|

- holdoutWorse=true؛ پارامترu1به boundصفر رسیده است.
- هر سه مشاهدهٔholdoutحداقل در یکی ازPOA/Tair/windبیرون min/maxآموزش هستند؛ acceptanceBlocked=true. مقایسهٔ بالا فقط تشخیص است، نه ارزیابی پذیرفته‌شدهٔ extrapolation.
- Jacobianاز نظر عددی rank۲دارد، اما۴جفت ویکروز،شناسایی‌پذیری عملی یاuncertaintyپارامترها را ثابت نمی‌کند.
- این جست‌وجویgridمحدود، تضمین مینیمم پیوسته نیست؛ نتیجه برای تصحیح cell،انرژی،مالی یا سایت دیگر اعمال نشد.
- خروجی کامل همراه plan،SHA،ردیف‌هایraw/fitted،singularvaluesوبلوکرها: **PVLIB-48-DTU-RESEARCH-RESULT.json**.

## زیرساخت مرحله۴۹
services/pvlib_research/uncertainty.py پیاده‌شده:
- گروه‌هایsystematicوinterannual،effectIdsبرایردdoublecountتکراری،source/version/documentSHA/applicabilityوhistoryYears؛ ورودی ناشناس و NaN/inf رد می‌شوند.
- correlation/PSDهرگروه و ماتریس temporalصریح؛ استقلال cross-group باید منبع اعلامی داشته باشد و وابستگی غیرصفر cross-group فعلاً پشتیبانی نمی‌شود.
- systematicdrawمشترک در همهٔسال‌ها؛ interannualdrawباهم‌بستگی صریح بین سال‌ها و مؤلفه‌ها.
- logbiasصریح،single-yearanalyticP50/P90/mean؛ میانگین **حسابی** انرژی سالانه در افق چندساله باMonteCarlo، نه جایگزینی باgeometricmean. mean/varianceتحلیلی همین میانگین هم گزارش می‌شود.
- PCG64seed،نسخهNumPy،دو نیمهٔsampleبرایconvergence،باند۹۵٪DKWبرای خطای عددی quantile. این باند،عدم‌قطعیت واقعی پروژه یاCIانرژی واقعیت نیست.
- هیچRMSEحرارتی بهCVانرژی تبدیل نشده؛ هیچaccuracyحسگر به‌صورتخودکار بهCVتولیدسالانه تبدیل نشده است.

آزمون‌هایاینمسیر از ورودی‌هایصریحاًsyntheticدرtestsاستفاده کردند. نمونهٔCLIsyntheticفقطدر.cacheنگه‌داری شد، نهبه‌عنوانبودجهٔپروژه. وضعیت خروجی conditional_assumptions / projectApproval=blocked / not_field_validated است؛ احرازاصالتمنابع،توزیع،هویتواستقلالبازبین انجامنمی‌شود.

## تست‌های اجراشده
- **۱۱تستجدید PASS**: XLSXreaderباfixtureمصنوعی وchecksummockفقطداخلتست؛ ردMD5اشتباه؛UTC/hour24/بدونoffset/duplicate/عدمfill/quality/sentinel/T7؛parseexcerptواقعی؛parameterrecoveryباoracleمستقلSciPyleast_squares؛عدمleakageوبدترشدنholdout؛workerواقعیpvlibوsensitivityهرپارامتر؛cancel/timeout/budget/خروجیNaN؛rankloss وextrapolation؛strictJSONduplicate/size/nonfinite.
- uncertainty:oracleمستقلNormalDistبرایP90،oracleلحظاتمیانگینحسابی۳ساله،هم‌بستگیزمانیصفر/کامل،covarianceمنفی/cancellation،bias/zeroCV،PSDودوباره‌شماریوشواهدناقص،seedوDKW:PASS.
- CLIthermalواقعیرویexcerpt+۲۰فراخوانیworker:PASSبه‌عنواناجرایپژوهشی؛ **عملیاتیblocked**.
- CLIuncertaintyرویفرض‌هایsyntheticسه‌ساله:PASS،بدونادعایuncertaintyپروژه.
- **۱۵۸تستقدیمیPython PASS**؛matrix۸۱۹۲قرارداد/۴۳۵۲رد/۱۶runtime/۳۸۲۴contract-only. هیچفرمولفیزیکیworkerقدیمی تغییرنکرد.
- gitdiff--check:PASS. build/UI/browser/WindowsCIاین‌نوبت اجرا نشدند؛ نتایجقدیمی به‌جایاجرایجدید گزارش نمی‌شوند.

## اجرا و فایل‌ها
راهنمایدستورها:services/pvlib_research/README.md؛requirementsاختیاریجدا؛تولیدمحصولاصلی تغییر نکرده.
- parser/fit:services/pvlib_research/thermal.py
- workerجدا:services/pvlib_research/thermal_worker.py
- بودجه:services/pvlib_research/uncertainty.py
- CLI:services/pvlib_research/__main__.py
- tests:services/pvlib_research/tests/test_research.py
- ورودیواقعی/plan/منشأ:docs/examples/research/

## آنچه برای تکمیل واقعی باقی است
۱.بارگذاریاصلXLSXدرمحیطاجرایاامکاندریافتباینری؛MD5نسخه۳بررسیوهمهٔردیف‌هاparse/QCشوند.
۲.سندارتفاعنصبادسنج وگواهی‌هایمرتبط؛انتخابدامنهٔپذیرفته‌شدهٔbacksheetوتأییدمهندس. ارتفاعنامعلومباافزودنlabelحل‌نمی‌شود.
۳.پروتکلومجموعهٔtrain/holdoutنماینده وکافی؛نتیجهٔفعلیholdoutبرایپذیرشردشده است.
۴.برای۴۹،baselineانرژیواقعیوسالانهٔمعتبر،منابعresource/metrology/model/interannualوتاریخچهٔچندسالهیامرجعمعتبر،وابستگی‌هامدل‌توزیعوبازبینی مستقل. این‌هادرهفت‌ردیفTMODوجودندارند.

## Git و تحویل
شاخهٔفعالarena/237e6ea2-solarpv-studio است. HEADواقعیمحلی5438fb59f4bb5cde05c20818b780464e1fe28752وworkingtreeازابتداحاویانبوهتغییراتمراحلپیشینبود. تاریخچهٔcommitهایگزارش‌شدهدرپیام‌هایقبلیدراینcheckoutوجودندارد. تغییراتقدیمی overwrite/stage نشدند؛ این‌نوبتcommit/push/mergeیاادعایCIدقیقSHAانجام نشد. فایل‌هایجدیددرهمینworkingtreeذخیره‌اند.
