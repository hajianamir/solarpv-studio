# تحویل تکمیل لایهٔ تابش ردیفی/دوطرفه — ۲۰۲۶-۱۱-۰۳

شاخه `arena/237e6ea2-solarpv-studio`؛ baseline این مرحله `00ced4be14d0410c8cce78d8180e5e4ff10a0982`؛ موتور مستقیم از1.1.0 به1.2.0.

## توسعه واقعی

`system.rowIrradiance` اختیاری به schema سخت‌گیرانه TS/Python اضافه شد. اجرای واقعی `pvlib.bifacial.infinite_sheds.get_irradiance` با Hay-Davies، محدودشدن دید زمین/آسمان و سایه مستقیم دو سمت وارد زنجیره شد. IAM مستقیم دو سمت و وزن‌دهی rear با bifaciality و کاهش‌های ساختاری/عبور جدا هستند؛ IAM و تلفات DC دو بار اعمال نمی‌شوند.

محدوده صریح: زمین افقی، ردیف موازی هم‌فاصله و نامتناهی؛ tracker همراه آن باید محور افقی و cross slope صفر و GCR سازگار داشته باشد. clearance لبه زمین و height/pitch<=2 برای کران هزینه محاسبه کنترل می‌شوند؛ row mode حداکثر8784 ردیف دارد. ورودی شیب‌دار نامعتبر رد می‌شود، نه اینکه پنهانی صاف فرض شود.

ورودی حرارتی SAPM انتخاب صریح front_only یا front_plus_rear از incident POA است؛ bifaciality فقط برق را وزن می‌دهد. thermal proxy کالیبره‌نشده است، نه یک مدل حرارتی اعتبارسنجی‌شده دوطرفه. خروجی raw incident، مؤثر عقب، سایه، دمای ورودی و انتگرال‌های Wh/m² مستقل ثبت می‌شوند.

فرم، نمایش نتایج و جدول مؤلفه‌ها، API capabilities، JSON/CSV و backup، بازیابی، مقایسه و گزارش HTML به‌روز شدند. انتخاب optics/thermal proxy در گزارش صریح است. فقط سه کلید سناریویی mounting/rowIrradiance/temperatureIrradiance در مقایسه می‌توانند فرق کنند؛ مدل DC/اینورتر/تابش پایه و worker/dependencies/weather/site همچنان دقیقاً کنترل می‌شوند. اختلاف چندعاملی به‌عنوان bifacial gain مستقل نام‌گذاری نمی‌شود.

## فایل‌ها و پژوهش

فایل‌های اصلی: `services/pvlib_study/worker.py` و `tests/test_rows.py`، `src/studies/{studyContract,studyWorkflow}.ts`، `src/components/{StudyBuilder,PvlibStudyPanel,StudyLibrary}.tsx`، `src/server/pvlibStudy.ts` و سه script آزمون مستقیم موجود.

پژوهش قبل از کد: `PVLIB-ROWS-PLAN.fa.md`؛ راهنمای کامل قرارداد و استفاده: `docs/PVLIB-ROW-BIFACIAL.fa.md`. مستندات رسمی infinite_sheds و کد مستند آن و نمونه مشابه pvfactors/PVWatts بررسی شدند؛ الگوریتم و thermal آن نمونه یکسان با این اجرا معرفی نشده‌اند. مطالعهٔ متن کامل مقالهٔ DOI یا اعتبارسنجی field ادعا نمی‌شود.

## آزمون‌های اجراشده موفق

- Python unittest **۲۸/۲۸**؛ ۱۹ قبلی و ۹ جدید. حد تحلیلی مستقلِ تابش مستقیم روی سطح افقی بدون albedo، هندسه مستقل سایه با projection عرض/فاصله، فرمول مستقل وزن‌دهی rear/IAM/SAPM/DC، حساسیت albedo/bifaciality/فرض حرارتی، صفرشب، مونتاژ جداگانه دو سمت با API تک‌سطحی pvlib، ورودی نامعتبر و سال کبیسه8784ساعتی در بدترین نسبت height/pitch مجاز. مونتاژ با API همان کتابخانه فقط wiring evidence است.
- بررسی دقیق قبل/بعد با worker baseline: برای هر دو سناریوی fixed و tracker بدون row، **تمام sampleها، monthly و summary دقیقاً برابر** بودند؛ metadata نسخه/مدل جدید شده است.
- `test:study:workflow`: قرارداد TS، GCR/شیب/clearance/نسبت ارتفاع نامعتبر، نتیجه واقعی Python، اعتبارسنجی مؤلفه‌های rear و summaries، snapshot/report و whitelist مقایسه؛ موفق. در اولین اجرای script یک نام متغیر rows دوبار تعریف شده بود؛ به rowScenario تغییر کرد و اجرای مجدد موفق بود.
- `test:study`: HTTP واقعی برای row+tracker، پارامتر/summary مؤثر عقب، و تمام محدودیت‌ها/احراز هویت موجود؛ موفق.
- `test:study:browser`: ساخت سناریوی fixed سپس tracker+rows از فرم، الزام انتخاب thermal proxy، اجرای Python، نمایش مؤلفه‌ها، مقایسه isolated/rows، خواندن گزارش و backup، بازیابی تمام گزینه‌ها و ثابت‌ماندن screening؛ موفق.
- `npm run lint`: بدون خطا و همان۹۵ warning قبلی؛ `npm run build`، `npm test`، `PHYSICS_DIFF_BASE=00ced4b npm run test:audit`، `npm run test:browser` و `git diff --check`: موفق.

پس از آخرین تغییر اجرایی، lint/build و workflow/HTTP/browser و regression/audit دوباره اجرا شدند. Python28 آزمون پس از افزودن قید منابع height/pitch و قبل از تغییر صرفاً متن capabilities با موفقیت اجرا شد. این آزمون‌ها، دادهٔ مصنوعی و شواهد نرم‌افزاری‌اند نه دقت واقعی سایت.

## مواردی که عمداً ادعای تکمیل ندارند

مدل سلول/رشته و diode/MPPT/mismatch، finite-array/terrain، موانع نزدیک، کنترل واقعی باد/برف و خرابی tracker، مصرف موتور و سازه هنوز پیاده نشده‌اند. اینها با مدل تابش یکی نیستند و بدون قراردادهای داده/مرجع جداگانه نباید شبیه‌سازی‌شده معرفی شوند. کالیبراسیون field، bankability، هم‌ارزی SAM/PVsyst و آزمون Docker ادعا نمی‌شوند. screening و tracker قدیمی، offsetها، snow/Kimber، BIPVT و finance تغییر نکرده‌اند.

وضعیت CI این مرحله باید برای SHA همین commit از GitHub بررسی شود؛ موفقیت baseline به این توسعه نسبت داده نمی‌شود. هیچ merge به main انجام نشده است.
