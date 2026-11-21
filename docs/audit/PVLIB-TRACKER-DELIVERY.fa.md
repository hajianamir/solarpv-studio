# تحویل توسعه فیزیکی اول: ردیاب مستقیم — ۲۰۲۶-۱۱-۰۳

شاخه `arena/237e6ea2-solarpv-studio`؛ baseline این مرحله `89d3cc6f5e17df9f7e29d41996e2eb52c31ad15c`.

## دامنه واقعی

موتور مستقیم به 1.1.0 ارتقا یافت: هندسه واقعی `pvlib.tracking.singleaxis` و `calc_surface_orientation` با backtracking وابسته به GCR/شیب عرضی، حد متقارن چرخش و park شب محور-خنثی اضافه شد. جهت سطح متغیر به همان Hay-Davies → AOI/IAM → SAPM → PVWatts DC/inverter وارد می‌شود. نتیجه هر بازه شیب/سمت، theta و پرچم فرمان روز را ثبت می‌کند. defaultهای pvlib برای پارامترهای tracker استفاده نمی‌شوند؛ هر شش ورودی الزامی و strict هستند.

Schema قبلی با `system.tracking` اختیاری سازگار است؛ نبود این شیء همان fixed قبلی است. فایل‌های قدیمی تغییر داده نمی‌شوند. فرم، import/API، کتابخانه و backup، نمایش هندسه و گزارش از tracker پشتیبانی می‌کنند. مقایسه fixed/tracker در همان worker/requirements/dependencies و weather/site مجاز است؛ تنها تفاوت مدل mounting مستثنی شده، سایر کنترل‌ها ضعیف نشده‌اند.

مسیر screening، tracker/transposition قدیمی، snow/Kimber، offsetهای تاریخی و محاسبات اقتصادی دست نخورده‌اند. در مقایسه قبل/بعد با worker baseline، تمام فیلدهای عددی قبلی شش sample، summary و monthly fixture ثابت دقیقاً برابر بودند؛ فقط خروجی جهت سطح و metadata جدید اضافه شده‌اند. این regression check است، نه مرجع میدانی.

## فایل‌های اصلی

- `services/pvlib_study/worker.py`: اجرای هندسه و مدل و manifest.
- `services/pvlib_study/tests/test_tracking.py`: ۹ آزمون tracker و oracleهای مستقل هندسی.
- `src/studies/studyContract.ts`، `studyWorkflow.ts`: قرارداد، کنترل خروجی tracker و مقایسه.
- `src/components/{StudyBuilder,PvlibStudyPanel,StudyLibrary}.tsx`: انتخاب مدل، ورودی صریح، خروجی، بازیابی/مقایسه.
- `src/server/pvlibStudy.ts`: capabilities نسخه و مدل‌ها.
- سه script آزمون موجود: HTTP، workflow و browser با سناریوی tracker توسعه یافتند.
- راهنمای کاربر: `docs/PVLIB-SINGLE-AXIS.fa.md`؛ پژوهش پیش از کد: `PVLIB-TRACKER-PLAN.fa.md`.

## آزمون‌های محلی موفق

- Python unittest: **۱۹/۱۹** (۱۰ آزمون قبلی + ۹ جدید). oracle مستقلِ بردار خورشید/نرمال و حد چرخش در چهار جهت محور؛ حل شرط عدم هم‌پوشانی سایه زمین تخت با bisection (بدون استفاده از تابع tracking در oracle)؛ حساسیت GCR و شیب عرضی؛ ModelChain جداگانه با محور مایل؛ park شب؛ theta صفر معادل سطح ثابت؛ قراردادهای نامعتبر؛ سال کبیسه ۱۷۵۶۸ ردیفی و حد output.
- `test:study:workflow`: درخواست/نتیجه واقعی Python ردیاب، archive و هندسه، fixed/tracker comparison و منع تغییر مدل transposition.
- `test:study`: HTTP واقعی، اعلام capability، رد GCR نامعتبر، اجرای tracker و حفظ قرارداد و محدودیت‌های قبلی.
- `test:study:browser`: فرم fixed سپس انتخاب tracker و الزام backtracking صریح، اجرای Python، مشاهده هندسه، ذخیره، مقایسه fixed/tracker، خواندن گزارش و backup، بازیابی پارامترهای tracker و حفظ screening در موفقیت/خطا.
- `npm run lint`: بدون خطا، ۹۵ هشدار قبلی. بررسی نوع در یک نوبت به optional tracking در خود script تست خطا داد؛ با assertion وجودِ شیء صریحاً ساخته‌شده اصلاح و lint/HTTP/workflow/Python دوباره موفق شدند.
- `npm run build`، `npm test`، `PHYSICS_DIFF_BASE=89d3cc6 npm run test:audit`، `npm run test:browser` و `git diff --check`: موفق.

ModelChain آزمون wiring همان کتابخانه است؛ oracle هندسی مستقل نرم‌افزاری هم جای field validation را نمی‌گیرد. fixtureها مصنوعی‌اند. گیت قدیمی expressionهای موتور TS بررسی شد؛ پوشش Python از unittest و CI اختصاصی می‌آید، نه ادعای اسکن Python توسط gate قدیمی.

## مرز علمی و عملیاتی

این توسعه مدل **هندسه ایده‌آل تک‌محوره monofacial** است، نه مدل کامل نیروگاه ردیاب: bifacial، diffuse row masking، mismatch/سایه الکتریکی، terrain/layout verification، باد/برف stow، مصرف موتور، slew و سازه پیاده نشده‌اند. افزایش انرژی تضمین نمی‌شود، به‌ویژه true tracking بدون کسر سایه ردیف. حدود پارامترها guardrail نرم‌افزاری‌اند، نه دامنه کالیبراسیون. داده میدانی مستقل و هم‌ارزی SAM/PVsyst تأیید نشده‌اند. استقرار Docker در محیط محلی آزموده نشده است.

وضعیت CI باید برای SHA همین تحویل جداگانه از GitHub خوانده شود؛ موفقیت baseline به این تغییر نسبت داده نمی‌شود. هیچ merge به main انجام نشده است.
