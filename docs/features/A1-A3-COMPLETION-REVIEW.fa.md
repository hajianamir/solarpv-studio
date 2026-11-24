# بازبینی درخواست تکمیل کامل A1 تا A3

تاریخ مبنا: ۲۰۲۶/۱۱/۰۳ — شاخهٔ جاری `arena/237e6ea2-solarpv-studio`.

## تصمیم پذیرش

**A1، A2 و A3 در تمام دامنهٔ نقشهٔ راه تکمیل نشده‌اند.** این نتیجه با سبزشدن گیت نرم‌افزار محدود تغییر نمی‌کند. «باقی‌مانده فقط داده است» نیز نادرست است: هم کمبود پیاده‌سازی داریم و هم کمبود شواهد مستقل. این سند جایگزین ادعای تکمیل نیست و دامنهٔ پذیرش را کوچک نمی‌کند.

به‌دلیل شرط توقف قبلی در فقدان داده/مرجع اعتبارسنجی، پذیرش کامل متوقف می‌شود. این توقف به معنی ناممکن‌بودن توسعهٔ مستقل سایر مدل‌های نرم‌افزاری نیست. هیچ فرم، فایل ثبت شواهد یا مدل مصنوعی به‌عنوان اجرای مدل فیزیکی یا تأیید میدانی شمرده نشده است.

## مرور اول: روش A1 و اعتبار مراجع → تحقیق

کد `portfolio.py`، `portfolio_advanced.py`، قراردادهای TS و backlog با دامنهٔ A1 تطبیق داده شدند. نتیجه: مدل ضربی lognormal، معیارهای واریانس، چندبودجه و benchmarkهای Ishigami/Gaussian-linear وجود دارند؛ evaluator عمومی مدل غیرخطی PV/LCOE، تحلیل وابستگی میان گروه‌های واقعی انرژی و تطبیق هماهنگ تمام موتورهای قدیمی وجود ندارد. وجود benchmark با همان الگوریتم، اجرای مدل عمومی پروژه نیست.

منابع بررسی‌شده:
- مستند رسمی SALib: https://salib.readthedocs.io/en/latest/_sources/user_guide/advanced.rst.txt و نتیجهٔ مستندات https://salib.readthedocs.io/_/downloads/en/latest/pdf/ . نمونه‌گیری گروهی با مدل‌سازی همبستگی فیزیکی یکی نیست. افزودن نام Sobol یا groups برای بستن cross-group dependence کافی نیست.
- فرمول PVWatts در مستندات نسخه‌دار pvlib: https://pvlib-python.readthedocs.io/en/v0.11.2/reference/generated/pvlib.pvsystem.pvwatts_dc.html ؛ همچنین source نسخهٔ runtime موجود در محیط باید مبنای adapter باشد، نه stable متغیر. مدل PVWatts DC یک مؤلفه است، نه کل زنجیرهٔ آب‌وهوا، clipping، عدم‌قطعیت و LCOE.
- بازیابی مجدد PDF شمارهٔ NREL 84993 در این نوبت شکست خورد؛ ادعای خواندن مجدد متن کامل آن نمی‌شود. شواهد جست‌وجو/بازیابی دورهای پیشین همچنان با محدودیت ثبت‌شده معتبرند، نه به‌عنوان بازتولید دادهٔ پروژه.

تصمیم: ضرایب سایت‌های مرجع یا بازهٔ اختلاف ارزیاب‌ها به CV پروژه تبدیل نشوند. هیچ ادعای کالیبراسیون جدید ثبت نشد.

## مرور دوم: A2 و صداقت کران بهینگی → تحقیق و اصلاح

مدل MILP، validator مستقل نتیجه و آزمون‌های integer/continuous/storage/سالانه بررسی شدند. مشکل پیدا شد: validator می‌توانست بعضی ترکیب‌های ناسازگار `completed`، design=null، dualBound و gap را بپذیرد. این مشکل اصلاح شد؛ وضعیت حل‌گر، وجود incumbent، صلاحیت عددی و سازگاری primal/dual/gap اکنون کنترل می‌شوند. کنترل ledger قبلی حفظ شده است.

منبع رسمی نسخه‌دار، متن بخش options/returns خوانده شد:
https://docs.scipy.org/doc/scipy-1.14.1/reference/generated/scipy.optimize.milp.html

status=1 یعنی رسیدن به حد زمانی/تکرار، نه optimum. bound تخمین کران پایین **همان MILP** است، نه کران مدل فیزیکی عمومی. کنترل سازگاری عددی خروجی نیز اثبات مستقل اعتبار dual certificate نیست؛ مرجع مستقل همچنان شاهدهای تحلیلی و enumeration محدود تست‌ها هستند.

تحقیق تجهیزات:
- NREL، Battery Thermal Characterization، https://docs.nrel.gov/docs/fy16osti/64437.pdf (گزیدهٔ جست‌وجوی بازیابی‌شده): ظرفیت گرمایی/تولید گرما و اعتبارسنجی با اندازه‌گیری تجهیزات را مطرح می‌کند.
- NREL، A Multi-Node Thermal System Model for Lithium-Ion Battery Packs، https://docs.nlr.gov/docs/fy15osti/63898.pdf (گزیدهٔ جست‌وجوی بازیابی‌شده): مدل شبکهٔ حرارتی کم‌مرتبه همراه پارامترگذاری و آزمون تجربی بسته‌هاست. اعداد خطای آن به نرم‌افزار حاضر منتقل نمی‌شوند.

تصمیم: ضریب خطی HVAC فعلی مدل تجهیز واقعی نامیده نشود. هیچ COP، ظرفیت حرارتی، aging یا قیمت تجهیز حدس زده نشد. تابع هزینهٔ افق محدود به طول‌عمر تعمیم نیافت.

## مرور سوم: A3، داده و RUL → تحقیق و اصلاح

split سایت/زمان، exposure سالم و مسیر اجرای مستقیم Python بررسی شدند. ورودی‌های مستقیم Python قبلاً تمام سخت‌گیری TS را نداشتند؛ version، کلیدهای اضافی، دامنهٔ عددی/boolean، timestamp دارای offset، identities، کیفیت داده و بودجه‌ها برای سه تابع جدید سخت‌گیرانه شدند. شمارش excludedPairs نیز در TS مستقلاً بازحساب و کنترل می‌شود.

منبع اصلی PVDAQ از GitHub رسمی با commit ثابت بررسی شد:
https://github.com/openEDI/documentation/blob/891a5081942955e5426d0548ef2e87acf7072ace/pvdaq.md

این مستند تفاوت units/raw_units، scale/offset، aggregation_type، interval alignment و ساختار داده/metadata را مشخص می‌کند. بنابراین تبدیل CSV ناشناس به SCADA معتبر بدون metadata مجاز نیست. این **سند توضیح داده** است، نه دریافت فایل time series. دادهٔ خام جدید در این نوبت وارد مخزن نشده است. محل اصلی داده‌ها S3 است که خارج از allowlist شبکهٔ اجرای shell این محیط است؛ این محدودیت به معنی خصوصی یا فاقدمجوزبودن PVDAQ نیست.

کاتالوگ رسمی PVDAQ، DOI و مجوز CC BY 4.0:
https://catalog.data.gov/dataset/photovoltaic-data-acquisition-pvdaq-public-datasets
DOI: 10.25984/1846021

فهرست عمومی منبع، حقوق کامل هر مجموعهٔ استخراج‌شده، تطبیق واحد/زمان و baseline مستقل همان نمونهٔ ارزیابی را خودبه‌خود اثبات نمی‌کند. در این نوبت هیچ frozen raw dataset، baseline independently constructed یا maintenance/failure labels قابل‌بازتولید تأیید نشد.

مقالهٔ اصلی PV و censoring، چکیده و روش جمع‌آوری مستقیم خوانده شد:
Bucher, Wandel, Joss, *Life Expectancy of PV Inverters and Optimizers in Residential PV Systems*، WCPEC-8، 2022:
https://www.bfh.ch/dam/jcr:5bfd5c32-f70f-4bf6-8d60-fdab6094e164/2022_09_WCPEC-8_3DV.1.46_-_Life_Expectancy_of_PV_inverters.pdf

مطالعه از survey و service databases استفاده و به‌خاطر دارایی‌های هنوز فعال از Kaplan–Meier استفاده می‌کند. survival جمعیت به‌تنهایی RUL اختصاصی دارایی از SCADA نیست؛ آمار تجمیعی مقاله اجازهٔ بازسازی ردیف‌های خرابی را نمی‌دهد. هیچ دادهٔ خرابی مصنوعی به این مقاله نسبت داده نشد. نتایج جست‌وجوی دارای تاریخ پس از تاریخ مبنای جلسه برای تصمیم‌گیری استفاده نشدند.

## ماتریس صریح بسته‌نشدن دامنه

| فاز | موجود و آزموده در دامنهٔ محدود | نرم‌افزار باقی‌مانده | شاهد بیرونی لازم برای پذیرش کامل |
|---|---|---|---|
| A1 | مدل lognormal، CI رتبه‌ای، چندبودجه، benchmark Sobol/Shapley | evaluator غیرخطی عمومی PV/LCOE و nested/GSA متناظر، dependence واقعی میان گروه‌ها، harmonization موتورهای legacy | dataset/report کامل مرجع، شواهد کاربردپذیری/کالیبراسیون پروژه و tolerances ازپیش‌اعلام‌شده |
| A2 | enumeration LP و MILP ظرفیت پیوسته/صحیح، ledger، کران/gap، ورودی افق سالانه | مدل طول‌عمر، HVAC تجهیزاتی، diesel و قیود utility، UI فرم‌محور، qualification مسائل غیرسادهٔ سالانه | دیتاشیت/منحنی و آزمون حرارتی تجهیز، تعرفه/قرارداد و rulepack نسخه‌دار utility، سناریوی بار/آب‌وهوا و reference مستقل |
| A3 | batch residual/HI، خوشه‌بندی اکتشافی، split سایت/زمان و آستانهٔ train-only | ingest/event pipeline عملیاتی، survival/RUL همراه censoring و calibration/holdout، qualification آستانه | raw SCADA با metadata و حقوق روشن، baseline مستقل frozen، maintenance/failure/censoring با asset identity و تاریخ معتبر، سایت/زمان دست‌نخورده برای ارزیابی |

این ردیف‌ها فقط مانع بیرونی نیستند؛ ستون نرم‌افزار باقی‌مانده صریحاً **پیاده‌سازی‌نشده** است. تکمیل واقعی نیازمند بستن هر دو ستون است. تعداد تست یا تعداد منابع جای آن را نمی‌گیرد.

## آزمون‌ها و گیت این نوبت

پذیرش تغییرات محدود:
1. ورودی مستقیم Python با version غلط، کلید اضافه، بازده صفر، SOC نامعتبر، integer غیرboolean، واحد ظرفیت صفر، timestamp بدون timezone، دادهٔ منفی/nonfinite و کیفیت/برچسب نامعتبر پیش از solver رد شود.
2. پاسخ completed بدون design، bound ناسازگار با gap، bound حذف‌شده با gap موجود، solverStatus ناسازگار و qualified دستکاری‌شده رد شود.
3. excludedPairs دستکاری‌شده رد شود؛ محاسبات قبلی و نگهداری finance/energy boundary تغییر نکنند.
4. هر ۱۹ تست Python، تست API/SDK واقعی و tamper، types/lint و گیت کامل foundation/production browser دوباره اجرا شوند؛ نتیجهٔ نهایی در `docs/audit/A1-A3-GATE.json` ثبت شود.

`softwareStatus=ready-for-review` فقط وضعیت **نرم‌افزار محدود آزموده‌شده** است. فیلد جدید completionStatus دامنهٔ کامل را ناقص ثبت می‌کند و overallReleaseStatus هم کمبود نرم‌افزار و هم شواهد خارجی را لحاظ می‌کند. feature flagها پیش‌فرض خاموش و `projectApproval=blocked` باقی می‌مانند. برای rollback همان flag portfolio خاموش می‌شود.

## موارد لازم برای بازکردن توقف پذیرش

- بستهٔ شواهد داده با فایل‌های خام یا محل در دسترس مجاز، SHA256، انتساب مجوز، metadata کانال‌ها/زمان/واحد، نگاشت سایت/دارایی، split ثبت‌شده و baseline مستقلی که روی evaluation fit نشده باشد.
- سوابق failure/maintenance/censoring؛ توان خروجی پایین یا پایان فایل به‌طور خودکار failure نیست.
- پارامتر و دامنهٔ اعتبار تجهیزات انتخابی و قرارداد utility؛ مدل عمومی مفروض جای شواهد تجهیز انتخابی نیست.
- اجرای توسعه و qualification نرم‌افزارهای باقی‌ماندهٔ جدول؛ صرف ارائهٔ فایل داده موجب تکمیل نرم‌افزار نمی‌شود.

هیچ کلید، token یا اطلاعات حساس برای این کار لازم یا درخواست نشده است. هیچ پژوهشی خودکار وارد مالی یا تولید سالانه نشده است.


## به‌روزرسانی پس از اجازهٔ توسعهٔ مستقل از شواهد مفقود

وضعیت «survival کاملاً غایب» در جدول بالا، وضعیت زمان آن مرور بود. اکنون مسیر بقای right-censored cohort با CI، برآورد شرطی محدود به افق و ارزیابی IPCW سایت/زمان، API/SDK/editor و تست مستقل عددی اضافه شده است؛ [شرح تحویل](COHORT-SURVIVAL.fa.md). کمبود باقیماندهٔ A3 دقیق‌تر عبارت است از RUL فردی/SCADA با prediction interval و calibration، competing risks، ارزیابی cluster-aware، pipeline عملیاتی رخداد و qualification دادهٔ واقعی. این به‌روزرسانی نه A1/A2 را کامل می‌کند و نه شرط شواهد میدانی را برمی‌دارد.
