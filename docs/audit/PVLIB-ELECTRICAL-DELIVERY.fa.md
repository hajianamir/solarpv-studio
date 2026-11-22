# تحویل تکمیل مدل الکتریکی مستقیم — ۲۰۲۶-۱۱-۰۳

شاخه `arena/237e6ea2-solarpv-studio`؛ baseline `acc2a773948a6d8af3255532aec10b92b6ee62e4`؛ موتور1.3.0.

## پیاده‌سازی واقعی

مدل اختیاری ماژول De Soto و single diode/Lambert W با16 پارامتر صریح، scaling یکنواخت سری/موازی و نقطه کار ایستای مقید به MPPT/جریان اضافه شد. حلقه توان PVWatts DC در این حالت اصلاً اجرا نمی‌شود؛ inverter تجمیعی PVWatts با محدودیت‌های قبلی حفظ شده است. تلفات DC اضافی پس از نقطه کار فقط یک بار اعمال می‌شود. nameplate آرایه صرفاً با MPP مرجع×تعدادها در تلورانس2٪ کنترل می‌شود؛ gamma غیرفعال و scaling دوباره ممنوع است.

current limit با ریشه I(V)=Imax و تغییر ولتاژ روی همان منحنی حل می‌شود. نبود نقطه مولد مجاز و تاریکی stateهای جدا دارند. تجاوز Voc شرط طراحی اعلام‌شده یا sample از maxDcV باعث رد کل مطالعه است؛ به‌عنوان موفقیت clipping نمی‌شود. اگر داده از envelope دما/تابش طراحی اعلام‌شده فراتر برود، هشدار صریح ثبت می‌شود. این بررسی‌ها گواهی ایمنی/استاندارد نیستند.

فرم بدون پیش‌فرض ماژول، خروجی ولتاژ/جریان/state، summaries فرصت MPP/کاهش قیود، manifest electricalChecks، backup/restore و گزارش به‌روز شدند. مقایسه خودکار با PVWatts مسدود می‌ماند چون مدل DC متفاوت است؛ دو سناریوی De Soto با ورودی‌های مقایسه‌پذیر مجازند. tracker و تابش ردیفی/دوطرفه با این مدل ترکیب می‌شوند، ولی mismatch و bypass مدل نشده‌اند.

## منابع و فایل‌ها

پژوهش پیش از کد در `PVLIB-ELECTRICAL-PLAN.fa.md` شامل مستندات رسمی calcparams_desoto، i_from_v، نمونه شش‌نقطه‌ای منتشرشده pvlib و معادله مستقل Sandia/NIST PVPMC ثبت شد. راهنمای قرارداد/واحدها/قیود: `docs/PVLIB-ELECTRICAL.fa.md`.

کد اصلی: `services/pvlib_study/worker.py` (همه کد جدید در همان فایل hashشده)، `src/studies/{studyContract,studyWorkflow}.ts`، `src/components/{StudyBuilder,PvlibStudyPanel}.tsx` و capabilities در `src/server/pvlibStudy.ts`. آزمون جدید `tests/test_electrical.py` و پارامترهای مرجع منتشرشده در fixture کوچک `desoto-reference-parameters.json`؛ این fixture در پروژه‌های واقعی load نمی‌شود. سه script API/workflow/browser موجود نیز توسعه یافتند.

## آزمون‌های محلی موفق

- Python unittest **39/39**: 28 قبلی و11 جدید؛ شش مقدار منتشرشده Voc/Vmp/Pmp، حل مستقل Shockley/Kirchhoff با bisection و شبکه مستقل نقاط مجاز، دو مرز ولتاژ و مرز جریان، اثبات افزایش ولتاژ به‌جای قیچی غیرواقعی جریان، scaling سری/موازی، صفرشب/خاموشی، رد Voc/nameplate/پارامتر، هشدار envelope، gamma غیرفعال، ممنوعیت فراخوانی PVWatts DC با monkeypatch، ترکیب tracker+rows و سال کبیسه8784رکوردی در حد خروجی16MiB.
- قبل/بعد با worker baseline: هر سه حالت fixed، tracker و row-bifacial **بدون electrical**، تمام sampleها و monthly و summary دقیقاً برابر بودند. فقط metadata/نسخه تغییر می‌کند. این regression است نه شاهد field accuracy.
- `test:study:workflow`: قرارداد کامل TS، نتیجه واقعی Python، archive و report، رد خروجی نقطه کار مفقود و مانع مقایسه مدل DC متفاوت؛ موفق.
- `test:study`: HTTP واقعی برای ترکیب هر سه مدل و پارامترهای اصل، electricalChecks و summaries؛ همراه با آزمون‌های احراز هویت/محدودیت‌های قبلی، موفق.
- `test:study:browser`: ورود پارامترهای explicit از فرم، اجرای واقعی دیودی، ذخیره/reload/بازیابی، ترکیب tracker+rows+diode، مقایسه دو سناریوی یک مدل DC، خواندن JSON/CSV/report/backup و بازیابی پارامترهای دیود؛ screening ثابت ماند؛ موفق.
- lint: بدون خطا، همان95 warning؛ build، `npm test`، `PHYSICS_DIFF_BASE=acc2a77 npm run test:audit` و `npm run test:browser`: موفق. `git diff --check` موفق.

پس از آخرین تغییر اجرایی حلگر، Python39، lint/build، workflow/API/browser و regression/audit دوباره اجرا شدند. guard کوچک نبودن کلید مدل در پاسخ کلاینت نیز با workflow بررسی شد؛ CI باید SHA نهایی را جداگانه آزمون کند.

## حدود صریح

ماژول/رشته‌ها identical و uniform هستند؛ استفاده از تابش ردیفیِ میانگین به‌معنای شبیه‌سازی mismatch یا hotspots نیست. این مدل CEC با Adjust، مدار چند MPPT، startup/hysteresis واقعی، MPPT efficiency، voltage-dependent inverter، کابل توزیع‌شده، حفاظت یا طراحی برق مطابق استاندارد نیست. حداقل دمای سلول/حداکثر تابش طراحی caller-declared است، نه مقدار حدسی استخراج‌شده از شهر. دادهٔ میدانی/کالیبراسیون و bankability ادعا نمی‌شوند. کنترل باد/برف، مصرف موتور و سازه بدون اطلاعات و قراردادهای مستقل تکمیل‌شده معرفی نمی‌شوند؛ Docker محلی آزموده نشده است.

مسیر screening، snow/Kimber/BIPVT، offsetها و finance تغییر نکرده‌اند. هیچ merge به main انجام نشده؛ نتیجه CI باید برای SHA همین commit از GitHub خوانده شود، نه از موفقیت baseline استنتاج شود.
