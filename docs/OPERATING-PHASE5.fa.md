# فاز۵ مسیر محصول: تحلیل چندسالهٔ عمومی و تکمیل رابط مقایسه

تاریخ 2026-11-03. دامنهٔ این سند «محصول و بهره‌برداری سه‌حالته» است، نه فاز۵ پژوهشی PVLIB/ترکر. این تحویل را با تکمیل همهٔ فیزیک‌های نامحدود یا رفع خطای Safari بومی یکی نگیرید.

## اصل نرم‌افزار عمومی

هیچ موقعیت، نیروگاه، تعرفه یا ضریب یک مطالعه به‌عنوان حقیقت عمومی در موتور جدید hardcode نشده است. ورودی‌ها متعلق به سایت کاربرند. دادهٔ پژوهشی اختیاری، baseline مستقل نیروگاهی/ongrid/offgrid را متوقف نمی‌کند. نبود ورودی فقط خروجی‌ای را که واقعاً به آن وابسته است غیرقابل‌محاسبه می‌کند؛ نه کل برنامه را. دادهٔ یک سایت مشخص پیش‌شرط توسعهٔ روابط عمومی نیست. آزمون تجربیِ دقت/اعتبارسنجی میدانی یک فعالیت جداگانه است.

## آنچه پیاده و آزموده شد

### تکمیل دسترسی به فاز۴

پنل «Policy comparison and lifecycle» در Site & Climate، زیر تحلیل پیشرفته قرار دارد. فایل `advanced-study-v1` را در **Import policy comparison study** وارد کنید. مقایسهٔ دو سیاست روی یک evidence/context با hash مشترک در worker اجرا می‌شود؛ JSON کامل و PDF واقعیِ خلاصه قابل دریافت‌اند. ورودی archive دوباره محاسبه می‌شود و summary واردشده مرجع حقیقت نیست. تغییر context خروجی قبلی را پنهان و worker را لغو می‌کند. خطا یا اتمام‌زمان، fallback یا تغییر منبع مالی ایجاد نمی‌کند. worker قابل‌لغو با سقف زمان۱۲۰ثانیه است.

### فاز۵: مدل سالانهٔ متوالی با بازاجرای dispatch

قرارداد `operating-lifecycle-v1` در `src/studies/operatingLifecycle.ts` قرار دارد. برای هر سال باید study کامل همان سال و ورودی مالی صریح داده شود. سال‌ها متوالی و دارای پوشش کامل معتبر باشند؛ کد تولید، شیفت، تکرار آب‌وهوا، zero-fill یا annualization خودکار ندارد. شیفت سال در fixture تست فقط ساختِ آشکارِ دادهٔ **مصنوعی آزمون** است و مسیر محصول از آن استفاده نمی‌کند.

- هر سال با SOH پایان سال قبل دوباره dispatch می‌شود. برای باتری، ضرایب calendar/EFC صریح لازم‌اند؛ برای حالت بدون باتری، aging لازم نیست و resolution نامرتبط SOC مانع محاسبه نمی‌شود.
- ظرفیت مؤثر سال: `C_effective = C_nominal × SOH_start`.
- بدون تعویض، انرژی ذخیره‌شدهٔ پایان سال حمل می‌شود. کاهش ظرفیت باعث spill گزارش‌شده می‌شود؛ اگر انرژی حمل‌شده زیر حداقل SOC سال بعد باشد، آن سناریو خطای روشن می‌گیرد، نه تزریق انرژی پنهان.
- با `replaceBatteryAtStart=true` در سال‌های بعد، SOH=1 می‌شود؛ هزینهٔ تعویض صریح است. انرژی باتری قدیمیِ باقی‌مانده spill و انرژی اولیهٔ باتری جدید به قیمت مرزیِ صریح کاربر هزینه‌گذاری می‌شود. ظرفیت نامی در این نسخه ثابت است؛ augmentation خودکار نداریم.
- SOH از `calendarLossFractionPerYear × elapsedHours/(365.25×24)` و `lossFractionPerEfc × DC_throughput/(2×C_nominal)` محاسبه می‌شود. این مدل خطیِ ساده با ضرایب کاربر است، نه مدل کالیبرهٔ عمومی شیمی باتری یا معادل SAM. aging در مرز سال اعمال می‌شود، نه داخل هر بازه.
- رسیدن به EOL پیش از شروع سال بعد مستلزم تعویض صریح همان سناریو است؛ توصیهٔ تکرار duty در گزارش سالانه به‌صورت پنهانی دستور تعویض مالی نمی‌شود.
- وضعیت روشن/خاموش دیزل نیز در مرز سال حمل می‌شود؛ هزینهٔ استارت دوباره یا صفر فرض نمی‌شود.

### معادلات مالی و زمان پرداخت

```text
operatingCashCost = gridPurchase - exportRevenue + dieselFuel + dieselStarts
startCost_y = replacementCost_y + initializedEnergyKwh_y × boundaryEnergyPrice_y
endCash_y = baselineOperatingCost_y - operatingCashCost_y - fixedOM_y + salvage_y
NPV = -initialCapital + Σ[endCash_y/(1+r)^y - startCost_y/(1+r)^(y-1)]
```

wear و unmet penalty اجزای objective بهینه‌سازند؛ چون هزینهٔ تعویض صریحاً حساب شده، wear دوباره به cash expense اضافه نمی‌شود. unmet در ledger گزارش می‌شود؛ آن را درآمد یا تأمین‌شده فرض نمی‌کنیم. نرخ تنزیل هر مقدار متناهی بزرگ‌تر از−۱ را می‌پذیرد؛ نرخ‌های واقعی منفی ممنوع نشده‌اند. baselineOperatingCost می‌تواند خالص منفی باشد. نرخ و هزینه‌ها باید همگی با مفروضات سازگار real/nominal وارد شوند؛ مالیات/تورم/یارانه/ارزش باقیماندهٔ انرژی خودکار اختراع نمی‌شود.

فیلدهای سطح بالا: `schemaVersion`, `source`, `context`, `boundaryRule="carry-stored-energy-and-soh"`, `initialCapitalToman`, `discountRate`, `years`.
هر عضو `years`: `study`, `replaceBatteryAtStart`, `replacementCostToman`, `baselineOperatingCostToman`, `fixedOmToman`, `boundaryEnergyTomanPerKwh`, `salvageToman`. ضرایب aging به‌جز SOH اولیه باید در این نسخه ثابت باشند. plan مؤثر هر سال و hash ورودی در خروجی ثبت می‌شود؛ تغییر SOH/SOC بر اساس boundaryRule صریح است، نه override پنهان.

CLI و آزمون‌ها:

```sh
npm run operating:lifecycle -- input.json output.json
npm run test:operating:lifecycle
npm run test:operating:published-grid
npm run test:browser:download
```

Python باید dependencyهای `services/pvlib_research/requirements.txt` را داشته باشد. برای venv، PATH آن را پیش از npm تنظیم کنید. fixture سال اول را قبلاً با `python -m scripts.operational-energy-fixture` بسازید. CLI فایل موجود را بازنویسی نمی‌کند و result archive را از request اصلی replay می‌کند. سقف۶۴MiB و بودجهٔ execution محدودیت منابع‌اند، نه محدودیت یک سایت؛ خروجی نامعتبر یا partial بی‌صدا تولید نمی‌شود.

## پژوهش سه‌مرحله‌ای و شواهد مستقل

سه query عمیق و وضعیت دریافت منابع در `audit/OPERATING-PHASE5-START.fa.md` ثبت شده‌اند. منبع خارجیِ جدیدِ واقعاً دریافت‌شده و استفاده‌شده در آزمون:

- [MATPOWER case33bw، منبع اصلی با نسخهٔ ثابت](https://github.com/MATPOWER/matpower/blob/b6c85b0323d20fb801cab3377c803a285d730847/data/case33bw.m)، با ارجاع Baran & Wu، DOI `10.1109/61.25627`؛ فایل و notice در `docs/examples/benchmarks/`. notice صریحاً می‌گوید case data زیر BSD کد MATPOWER نیست؛ آن را BSD-data معرفی نمی‌کنیم.
- آزمون مستقل به‌جای sweep محصول، ماتریس ادمیتانس را می‌سازد و معادلات nodal constant-PQ را با SciPy root حل می‌کند. برای حالت اصلی، تلفات مستقل `202677.12645594764 W` و کمینه ولتاژ `0.9130904793610519 pu` به دست آمد؛ حل موجود با اختلاف تلفات زیر۰٫۰۱وات و اختلاف ولتاژ زیر۱e−۵ولت تطبیق داشت. بارهای۰٫۵ و۱٫۲۵ نیز صرفاً perturbation عددی‌اند، نه دادهٔ اندازه‌گیری.
- حساب انرژی سالانهٔ حالت بدون باتری مستقل از ledger و NPV با Python Decimal بررسی شد. SOH، انرژی مرزی، تعویض، نرخ منفی، سال تکراری، context نامعتبر، EOL و عدم mutation برای هر سه mode تست شدند.
- گزارش‌های NREL64641/79575/86194/64987/73238 از جست‌وجو برای تفکیک دامنه/محدودیت مدل‌ها استفاده شدند. دریافت مستقیم PDF64641 و79575 و راهنمای آنلاین battery_life در این محیط ناموفق بود؛ بازتولید عددی کامل آن مطالعات یا به‌دست‌آوردن ضرایب کالیبره از آن‌ها ادعا نمی‌شود.

## تکمیل فنی گزارش و گیت‌ها

انتظار دانلود و PDF واقعی در مرورگر هر سه mode آزموده شد. تحویل فایلِ مرورگر از موتور گزارش به adapter اختصاصی `src/browser/download.ts` منتقل شد؛ تمام عملیات DOM، click، زمان نگه‌داری Blob و cleanup در یک مرز browser قرار دارند. آزمون fake DOM/clock مستقلی ترتیب تحویل، عدم revoke هنگام click و cleanup در موفقیت/خطا را بررسی می‌کند. این تغییر، معادلهٔ فیزیکی یا استثنای hash/literal نیست؛ verifier و حساسیت‌های physics gate برای این رفع تغییر داده نشدند. `test:all` پس از این جداسازی موفق شد؛ شکست اولیهٔ آن و رفع آن در receipt ثبت می‌شود.

## موارد باز — تکمیل همهٔ موارد قبلی ادعا نمی‌شود

- native Safari در Linux اجرا نمی‌شود. شاهد تاریخیِ disk-probe مستقل همچنان blocker پلتفرم است؛ هیچ File ساختگی، waiver یا PASS جایگزین نشده است. workflow به تست‌های جدید مجهز شده ولی برای working tree فعلی اجرای remote جدید انجام نشده است.
- DC-coupled، مدل الکتروشیمیایی/حرارتی و rainflow باتری، کنترل واقعی grid-forming/حفاظت جزیره‌سازی، شبکهٔ نامتعادل و اتصال کامل سایه/حرارت/مدار پژوهشی به yield این تحویل نیستند. نبود دادهٔ یک سایت علت تعویق نرم‌افزار عمومیِ آن‌ها نیست؛ خود آن پیاده‌سازی‌ها هنوز انجام نشده‌اند.
- dispatch هر سال مستقل با آینده‌نگری همان سال است؛ SOH و inventory حمل می‌شوند، اما ادعای optimum کل عمر، MPC واقعی یا دقت میدان نداریم.
- گزارش‌های SHAهای قبلی تاریخی‌اند. HEAD محلی اکنون5438fb5 است و فایل‌های قدیمی در working tree حضور دارند؛ این نوبت بدون commit/push جمعیِ تغییرات نامرتبط تحویل می‌شود. شواهد این snapshot با hash فایل‌ها و نتایج محلی در `audit/OPERATING-PHASE5-CHECKS.json` ثبت شده‌اند، نه به‌عنوان CI موفقِ SHA جدید.
