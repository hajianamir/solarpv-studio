# مسیر محصول سه‌حالته: وضعیت فازهای ۱–۳ و آغاز فاز ۴

تاریخ: 2026-11-03. دامنه با انتخاب کاربر: محصول و بهره‌برداری `powerplant` / `ongrid` / `offgrid`؛ مستقل از شماره‌گذاری فازهای پژوهشی PVLIB.

## وضعیت و گیت‌ها

| بخش | نتیجهٔ این ادامه | وضعیت پذیرش |
|---|---|---|
| فاز ۱، گردش مطالعه و مرز انرژی | بازاعتبارسنجی سالانه/context، عدم تغییر baseline و تست workflow برقرار؛ تداخل برچسب متادیتای operational با انتخابگر مدل اینورتر مطالعه رفع شد | تست‌های نرم‌افزاری محلی و CI عمومی موفق؛ اعتبارسنجی میدانی ادعا نمی‌شود |
| فاز ۲، پایداری/انتقال/گزارش | آرشیو و project envelope، DOCX/XLSX و PDF واقعی فارسی؛ انتظار هم‌زمان click/download برای جلوگیری از promise رهاشده | Windows و Linux موفق؛ پذیرش native Safari فایل دیسکی مسدود است؛ وضعیت WebKit جدا ثبت می‌شود |
| فاز ۳، کنترل و ذخیره‌ساز | تست بار-اول، DP گسسته، دیزل، EFC/calendar، conservation و اوراکل مستقل و ۲۰ سناریو موفق | فقط دامنهٔ AC-coupled و مدل‌های اعلام‌شده؛ نه بهینه‌سازی پیوسته، DC-coupled یا مدل الکتروشیمیایی |
| فاز ۴، مقایسهٔ سیاست | هسته و CLI مقایسهٔ همان ورودی، hash مشترک، دو خروجی مستقل و delta؛ تست سالانهٔ هر سه mode | **شروع محدود نرم‌افزاری**؛ نه خاتمهٔ گیت‌های مسدود مراحل قبلی و نه اتصال به مالی |

**کل فازهای ۱–۳ بسته نشده‌اند.** native Safari هنوز گیت باز است. ادامهٔ مدل‌های عمیق شبکه/جزیره‌سازی، اتصال حرارتی و سایه/مدار پژوهشی به yield و توپولوژی‌های جدید باتری در `OPERATING-DISPATCH.fa.md` نیز با این تحویل انجام‌شده محسوب نمی‌شوند. برای تکمیل عملیاتی آن‌ها دامنهٔ فیزیکی، پارامترهای صریح، شاهد مستقل و تست جدا لازم است. شروع فاز ۴ صرفاً بخش مستقل و قابل‌آزمون مقایسه است.

## نتیجهٔ دقیق SHA

کد آزموده‌شده: `649b0859722d31d75e0f69b81e7af29f40768b95`.

- [CI عمومی 44958669854](https://github.com/hajianamir/solarpv-studio/actions/runs/44958669854): **SUCCESS**؛ هر شش job شامل direct-study browser در Windows/Linux، build روی Node20/22، Windows operational و physics reference موفق‌اند.
- [Platform 44958669864](https://github.com/hajianamir/solarpv-studio/actions/runs/44958669864): Windows/Linux Chromium و macOS/WebKit موفق؛ native Safari شکست probe مستقل فایل دیسکی. موفقیت CI عمومی، شکست این workflow مستقل را خنثی نمی‌کند.

### شاهد مستقل Safari

قبل از ورود به کد import برنامه، صفحه یک `<input type=file>` حداقلی دارد. `safaridriver` یک JSON واقعی ۲۴ بایتی با فایل mode0644 در پوشه mode0755 زیر `/private/tmp` انتخاب می‌کند؛ `File.text()` همان `NotReadableError` را می‌دهد. فایل probe:

```text
{"nativeDiskProbe":true}
SHA256 ca39a6e2707c5692a9c2f15b01262266a0855491ca9493e3bdcce64cf64ea89e
```

این شاهد، خرابی مشاهده‌شده را از schema، worker، اندازهٔ مطالعه و پاک‌کردن انتخاب فایل برنامه جدا می‌کند؛ علت داخلی Safari/سیستم‌عامل یا همهٔ نسخه‌ها را ثابت نمی‌کند. فایل ساختگی مرورگر، تزریق نتیجه یا معافیت PASS جای این گیت قرار نگرفته است. خروجی بومی به‌صورت شکست صریح `BLOCKED_NATIVE_DISK_ACCESS` باقی می‌ماند. بعد از رفع دسترسی فایل روی runner واقعی باید همان آزمون تا PDF و هر سه mode تکرار شود.

## استفاده از شروع فاز ۴

یک فایل کامل `advanced-study-v1` و context واقعی همان پروژه لازم است. baseline، هواشناسی، تعرفه، دیزل، aging، SOC و افق از ورودی می‌آیند؛ چیزی تولید/صفرپر یا به دادهٔ عملیاتی تبدیل نمی‌شود.

```sh
npx tsx scripts/compare-operating-policies.ts study.json context.json comparison.json
```

- خروجی باید فایل جدید باشد؛ CLI فایل موجود را بازنویسی نمی‌کند.
- `sharedInputSha256` شامل context و تمام شواهد/پارامترهای مشترک است، جز انتخاب controller؛ تغییر controller اولیه hash مشترک را تغییر نمی‌دهد.
- شواهد/context نامعتبر خطای سخت‌اند. شکست اجرایی هر سیاست `blocked` با متن خطا ثبت می‌شود؛ سیاست دیگر جای آن پذیرفته نمی‌شود. اگر یکی blocked باشد delta برابر null و exit code CLI برابر۲ است.
- delta = optimal-discrete منهای load-first. هدف شامل هزینه/جریمه‌های اعلام‌شده است؛ delta، NPV یا صرفه‌جویی تضمینی نیست. حالت‌های SOC گسسته و اعمال پیوستهٔ greedy لزوماً مجموعهٔ feasible یکسان ندارند؛ ادعای برتری همیشگی نداریم.
- ledger، request و محدودیت‌ها برای replay موجودند. هیچ نتیجه‌ای در منبع انرژی/مالی فعال adopt نمی‌شود.
- این شروع شامل UI مقایسه، redispatch چندساله با aging، اعتبارسنجی پیش‌بینی یا کنترل زنده نیست.

## تست محلی این نوبت

`lint` (بدون error، هشدارهای قبلی)، `lint:types`، `build`، `test:study:workflow`، `test:study:browser`، `test:operating:dispatch`، `test:operational:study`، `test:advanced:dispatch`، `test:operating:browser`، `test:pdf` و `verify:exports` موفق‌اند. اجرای واقعی CLI فاز۴، بازخوانی JSON و رد بازنویسی فایل موجود نیز موفق‌اند. خروجی Python واقعی با هواشناسی مصنوعی فقط fixture آزمون است؛ هیچ‌کدام شاهد کالیبراسیون/پذیرش میدانی نیستند.

برنامهٔ پیش از تغییر: `audit/OPERATING-PHASES-1-4-START.fa.md`. تغییرات از پیش موجود `.github/workflows/ci.yml` و اسناد پژوهشی نامرتبط stage نشده و حفظ شده‌اند.
