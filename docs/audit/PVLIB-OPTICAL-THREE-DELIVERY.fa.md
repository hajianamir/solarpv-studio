# تحویل سه مرحلهٔ اپتیکی — موتور 1.6.0
تاریخ: 2026-11-03

## سه مرحلهٔ مشخص
۱. انتخاب Perez allsitescomposite1990 در کنار Hay–Davies قبلی، با جرم هوای نسبی KY1989؛ فقط صفحه منفرد ثابت/ردیاب. ترکیب Perez+infinite_sheds صریحاً رد می‌شود.
۲. Physical beam IAM با شش پارامتر صریح front/rear n/K/L و بدون AR؛ ضرایب ASHRAE قدیمی غیرفعال، diffuse IAM همچنان unity.
۳. SAPM spectral با پنج ضریب صریح و دامنه معتبر absolute airmass؛ اصلاح یک‌باره effective irradiance بعد از IAM و جمع دوطرفه، مستقل از thermal POA. بررسی چندجمله‌ای خام پیش از clipping داخلی pvlib؛ منع برون‌یابی/AM نامعین، sentinel غیرعملیاتی صریح و سقف ۸۷۸۴ رکورد.

## پژوهش و گردش کار
APIهای رسمی pvlib 0.13.1 و منابع مستقل PVPMC Perez table، Physical IAM و SAPM polynomial پیش از کد در PVLIB-OPTICAL-THREE-PLAN.fa.md ثبت شدند. تفاوت واژه absolute در متن PVPMC Perez با relative در API pvlib مستند است؛ اجرا طبق API نسخه‌دار و آزمون مستقل با AM ورودی صریح است.

فرم→weather review→اجرای Python→نتیجه→IndexedDB/backup restore→CSV/JSON/report متصل شد. مدل‌ها در manifest/capabilities و مانع مقایسه مدل ناسازگار ثبت می‌شوند. داده گمشده پر نمی‌شود، fallback مستقیم به screening اضافه نشده است. ضرایب fixture اپتیکی فرض عددی صریح آزمون‌اند، نه تجهیز پروژه یا منبع کالیبراسیون.

## شواهد عملی موفق
- Python **67/67** (56 قبلی و 11 جدید)، شامل جدول مستقل هشت bin Perez، سطح افقی/تغییر مسیر worker، شب و رد AM نامعین، Fresnel مستقل با حساسیت n/K/L، غیرفعال بودن b قدیمی، AM نسبی/فشار/مطلق و چندجمله‌ای مستقل با حساسیت A0..A4، اعمال یک‌باره بعد از rows و حفظ دما، ورودی‌های نامعتبر، ترکیب کامل و خروجی سال کبیسه ۸۷۸۴‌بازه‌ای زیر ۱۶MiB.
- npm run lint و npm run build: موفق، هشدارهای قبلی بدون خطا.
- test:study:workflow و test:study: موفق با Python واقعی، archive/result guards و barriers مقایسه.
- test:study:browser: موفق، فرم physical+spectral، actual Python، restore/report، رد قابل مشاهده Perez+rows و اجرای واقعی Perez منفرد.
- npm test، PHYSICS_DIFF_BASE=73ea22d npm run test:audit و npm run test:browser موفق.
- git diff --check موفق.
- worker قبلی 1.5.0 کنار worker جدید اجرا شد؛ samples/monthly/summary شش حالت fixed/tracker/rows/diode/faiman+export/sandia بدون opt-in دقیقاً برابرند.

آزمون اولیه browser در assertion «عدم تغییر waterfall» با جدول اضافی weather-review شکست خورد. callsite scripts/test-direct-pvlib-browser.ts قبلاً بلافاصله پس از click همه tableهای صفحه را می‌خواند و منتظر mount شدن تب نبود. assertion به انتظار heading واقعی Waterfall و جدول‌های همان container محدود شد؛ آزمون مجدد پاس شد. هیچ تغییر در محاسبات/نمایش screening برای پوشاندن آزمون اعمال نشد و از این رخداد ادعای اختلاف UI/engine نمی‌کنیم.

دروازه عمومی physics-reference فرمول worker Python را پوشش نمی‌دهد؛ pass آن به‌تنهایی شاهد این سه مدل نیست. شواهد جدید فرمول/حساسیت در test_optical_models.py هستند. استثنای hash/literal masking افزوده نشده است.

## فایل‌های اصلی
worker.py؛ studyContract.ts و studyWorkflow.ts؛ StudyBuilder.tsx و PvlibStudyPanel.tsx؛ pvlibStudy.ts؛ test_optical_models.py و optical-reference-parameters.json؛ سه اسکریپت workflow/API/browser؛ docs/PVLIB-OPTICAL-THREE.fa.md و لینک راهنماهای قبلی.

## محدودیت و CI
Diffuse IAM یک، شیشه تک‌لایه بدون AR، عامل طیفی مشترک front/rear، فشار استاندارد از ارتفاع؛ بدون طیف مستقل عقب/طول موج، تضمین اعتبار ضرایب یا کل SAPM. Perez برای rows اضافه نشده است. mismatch/bypass، کابل، کنترل/حفاظت واقعی، باد/برف و سازه خارج دامنه‌اند. این تحویل field/calibration/bankability/standards/SAM equivalence نیست؛ Docker آزموده نشده است.

CI پس از commit/push برای SHA نهایی پیگیری می‌شود؛ نتیجه و URL دقیق در پیام تحویل اعلام خواهد شد. این سند پیش از CI نوشته شده و خود گواه CI نیست. هیچ merge به main انجام نمی‌شود.
