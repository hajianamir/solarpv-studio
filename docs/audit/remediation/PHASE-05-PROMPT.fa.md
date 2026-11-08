# پرامپت اجرایی فاز ۵ — سند خودبسنده

> **قانون اول و آخر این سند:** تو فقط و فقط در چارچوب این سند کار می‌کنی. هیچ فرض نانوشته‌ای وجود ندارد. هر جا ابهام دیدی، **حدس نزن** — در گزارش میانه در بخش «سؤالات باز / تشدیدها» ثبت کن و منتظر تصمیم ناظر بمان.

================================================================================
# بخش ۰ — قرارداد نظارت (ثابت در تمام فازها)
================================================================================

## ۰.۱ نقش تو و نقش ناظر

تو **مهندس مجری** هستی. یک **ناظر فنی مستقل** (با دو تخصص هم‌زمان: مهندسی نرم‌افزار ارشد و مهندسی سیستم‌های فتوولتائیک خورشیدی) خروجی تو را در دو نقطه بازرسی می‌کند: **دروازهٔ میانه** و **دروازهٔ پایان**. ناظر کد را خط‌به‌خط، عددبه‌عدد و با اجرای دوبارهٔ دستورها بررسی می‌کند. هیچ ادعایی بدون شاهدِ قابل‌بازتولید پذیرفته نمی‌شود.

تو از کل برنامهٔ اصلاحات اطلاعی نداری و **نباید** حدس بزنی فاز بعدی چیست یا «برای آینده زمینه‌سازی کنی». هر کاری بیرون از دامنهٔ صریح این سند، **تخلف از قرارداد** است و باعث رد کل تحویل می‌شود.

## ۰.۲ قاعدهٔ تشدید (Escalation)

اگر در حین کار به موردی برخوردی که برای ادامهٔ کار **ضروری** است اما خارج از محدودهٔ مجاز فایل‌های این فاز قرار دارد:
1. **متوقف شو** — آن فایل را لمس نکن.
2. در گزارش (میانه یا پایان) در بخش «تشدیدها» دقیقاً بنویس: `فایل:خط`، چرا لازم است، چه تغییری پیشنهاد می‌کنی، و اثر انجام‌ندادن آن چیست.
3. منتظر مجوز کتبی ناظر بمان.

## ۰.۳ دوازده قاعدهٔ سخت (Hard Rules) — نقض هر یک = رد فوری

| کد | قاعده | توضیح |
|---|---|---|
| **H-01** | **بخوان قبل از نوشتن** | پیش از هر ویرایش یا اظهارنظر دربارهٔ یک ماژول، کل فایل (یا بازهٔ کامل تابع + تمام فراخواننده‌هایش) را بخوان. در گزارش، `file:line` دقیق بده. |
| **H-02** | **ممنوعیت مطلق دستکاری خارج از دامنه** | فقط فایل‌های فهرست‌شده در جدول «محدودهٔ مجاز نوشتن/ویرایش» این فاز را می‌توانی ایجاد یا ویرایش کنی. `git status --porcelain` و `git diff --stat` شواهد داوری‌اند. |
| **H-03** | **جعل، تقریب ذهنی و «حدوداً» ممنوع** | هر عدد در گزارش یا در فایل‌های شواهد باید مستقیماً خروجی اجرای واقعی کد روی فیکسچرهای یخ‌زده باشد. نوشتن دستی عدد در JSON یا جدول بدون اجرای تابع تولیدکننده = جعل = رد کامل فاز. |
| **H-04** | **حفظ کامل دروازه‌های موجود** | در هر تحویل: `npm run lint` (صفر خطا؛ تعداد اخطارهای `no-explicit-any` نباید از خط مبنای ثبت‌شده بیشتر شود)، `npm test` (صفر تست رد شده، صفر تست skip شده)، `npm run build` (خروج با کد صفر). هیچ تستی را حذف، `.skip` یا `.todo` نکن و تلورانس هیچ تستی را شل نکن. |
| **H-05** | **ممنوعیت بازسازی فرصت‌طلبانه** | نه تغییر نام متغیرها برای زیبایی، نه قالب‌بندی مجدد فایل‌ها، نه ارتقای کتابخانه‌ها، نه تغییر `package.json` یا `tsconfig*.json` مگر در جدول مجاز صراحتاً آمده باشد. |
| **H-06** | **جبرگرایی (Determinism)** | هیچ `Math.random()`، `Date.now()` بدون seed، یا وابستگی به منطقهٔ زمانی سیستم در مسیر محاسبات یا تست‌ها مجاز نیست. دو بار اجرای پیاپی اسکریپت‌های این فاز باید خروجی **بایت‌به‌بایت یکسان** (`sha256sum` برابر) تولید کند. |
| **H-07** | **ممنوعیت سرکوب خطا** | استفاده از `@ts-ignore`، `@ts-expect-error`، `eslint-disable`، `as any`، یا `catch {}` خالی در کدهای جدید یا ویرایش‌شده مطلقاً ممنوع است. |
| **H-08** | **صداقت واحدها و علامت‌ها** | هر کمیت فیزیکی در کد، تست و گزارش باید واحد صریح داشته باشد (`W/m²`, `kWh`, `kWp`, `°C`, `deg`, `dimensionless`, `Toman`, `USD`, `%` در بازهٔ `0..100` یا کسر در بازهٔ `0..1`). |
| **H-09** | **ردیابی تا خط کد** | هر ادعا دربارهٔ یک فرمول یا رفتار باید به شکل `path/to/file.ts:LINE_START-LINE_END` مستند شود. ارجاع مبهم («در موتور مالی») پذیرفته نیست. |
| **H-10** | **توقف در دروازه‌ها** | در نقطهٔ میانه **باید** متوقف شوی، گزارش میانه را بدهی و تا دریافت `APPROVED` یا `تأیید` از ناظر، نیمهٔ دوم را شروع نکنی. |
| **H-11** | **عدم ارجاع به گزارش‌های ممیزی قبلی** | اگر در مخزن فایل‌هایی در `docs/audit/` از قبل وجود دارد، **حق خواندن یا کپی‌کردن از آن‌ها را نداری** مگر در جدول «ورودی‌های مجاز» این فاز صراحتاً نام برده شده باشند. تمام یافته‌ها و اعدادت باید از خوانش مستقیم `src/` و `server.ts` و اجرای کد به دست آیند. |
| **H-12** | **گزارش به زبان فارسی، شناسه‌های فنی به انگلیسی** | متن گزارش‌ها به فارسی دقیق مهندسی؛ نام فایل‌ها، توابع، متغیرها، کلیدهای JSON و خروجی ترمینال دقیقاً به شکل اصلی انگلیسی. |

## ۰.۴ سازوکار دو دروازه‌ای (Two-Gate Protocol)

    [شروع فاز]
         │
         ▼
    پیام آغاز (حداکثر ۱۵ خط: فهم مسئله + فهرست فایل‌هایی که خوانده‌ای + شمارش اولیهٔ lint/test/build)
         │
         ▼
    اجرای نیمهٔ اول کار
         │
         ▼
    📍 دروازهٔ میانه (Mid-Phase Gate) ──► تحویل «گزارش میانه» طبق قالب ۰.۶ ──► ⏸ توقف اجباری
         │
         ▼  (فقط پس از دریافت APPROVED یا PASS-WITH-CONDITIONS از ناظر)
    اجرای نیمهٔ دوم کار + اعمال شروط ناظر
         │
         ▼
    🏁 دروازهٔ پایان (End-of-Phase Gate) ──► تحویل «گزارش پایان» طبق قالب ۰.۷ ──► ⏸ توقف اجباری

## ۰.۵ قالب «پیام آغاز» (در ابتدای کار، پیش از نوشتن کد)

1. **فهم من از فاز** (حداکثر ۵ جمله، به زبان خودت، بدون کپی از این سند).
2. **فهرست فایل‌هایی که خوانده‌ام** (مسیر + تعداد خطوط یا بازهٔ خطوط کلیدی).
3. **شمارش اولیهٔ دروازه‌ها** (خروجی واقعی `npm run lint`, `npm test`, `npm run build` روی وضعیت فعلی مخزن).
4. **ریسک‌هایی که از الان می‌بینم** (حداکثر ۵ مورد).

## ۰.۶ قالب اجباری «گزارش میانه»

    # گزارش میانه — فاز ۵
    ## ۱) وضعیت: چند درصد از کار انجام شده
    ## ۲) کارهای انجام‌شده (با file:line)
    ## ۳) اعداد تولیدشده تا این لحظه (جدول: کمیت | مقدار قبل | مقدار بعد | دلتا | دستور بازتولید)
    ## ۴) انحراف از برنامه (اگر هست)
    ## ۵) سؤالات باز / تشدیدها (هر مورد: فایل:خط، چرا لازم است، اثر عدم انجام)
    ## ۶) ریسک‌های باقی‌مانده
    ## ۷) دقیقاً چه کاری را در نیمهٔ دوم انجام می‌دهم
    ## ۸) شواهد خام (خروجی git status --porcelain و دستورهای اجراشده)

## ۰.۷ قالب اجباری «گزارش پایان»

    # گزارش پایان — فاز ۵
    ## ۱) خلاصهٔ یک‌پاراگرافی (بدون صفت، فقط عدد)
    ## ۲) جدول انطباق با DoD (هر شرط: PASS / PARTIAL / FAIL + شاهد file:line یا خروجی)
    ## ۳) جدول «قبل → بعد» (برای هر عدد، پیش‌فرض، امضا: مورد | قبل | بعد | دلتا | دلیل)
    ## ۴) خروجی خام دروازه‌ها (lint / test / build / git diff --stat / git status --porcelain)
    ## ۵) کارهایی که انجام ندادم (و چرا — حداقل ۳ مورد واقعی که دیدی ولی بیرون از دامنه بود)
    ## ۶) مشاهدات خارج از دامنه (فقط ثبت، بدون اقدام — با file:line)
    ## ۷) ریسک‌های باقی‌مانده و اثر عددی تخمینی
    ## ۸) دستور بازتولید کل فاز (کپی-پیست، خط‌به‌خط)

================================================================================
# بخش ۱ — مأموریت فاز ۵: عنوان و صورت مسئله
================================================================================

## ۱.۱ عنوان

**فاز ۵ — یکپارچگی سایزینگ الکتریکال، کلاسترینگ اینورتر، مسدودسازی جریان MPPT، ذخیره‌سازی باتری، معماری بی MV و مدل تک‌دیود (Electrical Sizing, Inverter Clustering, MPPT Hard-Blocking, Battery Storage, MV Bay Architecture & Single-Diode Integrity)**

## ۱.۲ صورت مسئله

در شواهد منجمد خط مبنای فاز ۱ (`docs/audit/remediation/evidence/phase01/measurements.json`، کامیت `91b9b3b`، گروه `M-E1` تا `M-E5` و بررسی‌های انسجام `C-02`، `C-03` و `C-10`) و کدهای فعلی موتورهای الکتریکال، پنج گسست و خطای مهندسی وجود دارد:

1. **تخصیص کورکورانهٔ اینورتر ۳۳۰ کیلوواتی نیروگاهی به بارهای کوچک مسکونی/کارگاهی در `evaluateInverterClustering`:**
   - در `src/engine/inverterClustering.ts:77-175`، هنگامی که بار مسکونی کوچک (مانند سناریوی G-2 با توان پیوستهٔ `250 W` و پیک `450 W`، در کلاس `residential_micro` با سقف واحد `maxSingleUnitKw = 3.0 kW`) همراه با اینورتر پیش‌فرض کاتالوگ (`preferredUnitKw = 330.0 kW`, `inverterVmpptMaxV = 1500 V`) فراخوانی می‌شود، تابع بدون بررسی تناسب کلاس مهندسی با واحد انتخابی، خروجی `unitRatingKw = 330.0 kW`، `totalInverterCapacityKw = 330.0 kW`، ولتاژ باس ورودی اینورتر `1200 V`، ولتاژ باتری `12 V` و وضعیت `healthStatus = 'compatible'` برمی‌گرداند!

2. **فرض تک‌اینورتر در طراحی آرایه (`pvEngineAdvanced.ts`)، عدم مسدودسازی نقض جریان MPPT (`M-E3` / `C-10`) و تناقض نسبت DC/AC (`M-E5` / `C-02` / `C-03`):**
   - در `src/engine/pvEngineAdvanced.ts:224-243`، تابع `designPvArray` کل `97` رشتهٔ موازی نیروگاه ۱ مگاواتی (`G-1` با ظرفیت `1134.9 kWp`) را صرفاً بر `6` کانال MPPT **یک دستگاه** اینورتر تقسیم می‌کند (`stringsPerMppt = ceil(97 / 6) = 17` رشته در هر MPPT!) که جریان کاری **`233.07 A`** (`M-E3`) تولید می‌کند.
   - همین فرض تک‌اینورتر در خط `243` باعث می‌شود `dcAcRatio = 1134.9 / 330 = 3.439091` (`C-02` شکست‌خورده در برابر `1.25`) گزارش شود، در حالی که کلاسترینگ همان نیروگاه `4 × 330 kW = 1320 kW AC` اختصاص داده و نسبت DC/AC ناوگان برابر `1134.9 / 1320 = 0.859773` (`M-E5` / `C-03` شکست‌خورده در برابر `1.25`) است.
   - علاوه‌بر این، در صورت نقض سقف جریان MPPT (`imppMaxAmpsPerMppt` یا `iscMaxAmpsPerMppt`) یا تجاوز نسبت DC/AC ناوگان از مرز بحرانی `1.50`، هیچ لیست خطای مسدودکنندهٔ صریحی (`blockingErrors: string[]`) تولید نمی‌شود و در `g1.json` سقف جریان یک اینورتر خانگی (`22.0 A / 26.0 A`) به جای مشخصات واقعی اینورتر رشته‌ای ۳۳۰ کیلوواتی (`65.0 A / 90.0 A` برای حداکثر ۴ رشتهٔ ۱۸۲ میلی‌متری در هر MPPT) نشسته است.

3. **تورم کاذب ظرفیت قابل‌استفاده و درصد پوشش شب در `sizeBatteryBank` (`M-E4`):**
   - در `src/engine/batteryEngine.ts:231-244`، برای به دست آوردن ظرفیت ناخالص مورد نیاز (`grossCapacityKwh`)، انرژی مورد نیاز بر حاصل‌ضرب `dodFraction * roundTripFraction * tempCorrectionFactor` تقسیم می‌شود؛ اما در خط `244` هنگام محاسبهٔ انرژی قابل‌تحویل واقعی بانک نصب‌شده (`actualUsableKwh`)، صرفاً رابطهٔ `actualGrossKwh * dodFraction` نوشته شده و هر دو ضریب `roundTripFraction` (`0.95`) و `tempCorrectionFactor` (`0.9825` در دمای `15°C`) فراموش شده‌اند!
   - در نتیجه برای کیس `G-3` (`8.26 kWh/day`، `1.5` روز استقلال، `lifepo4`، `48 V`، `15°C`)، مقدار `usableCapacityKwh` به جای **`15.2 kWh`** (`19.2 × 0.85 × 0.95 × 0.9825 = 15.2326 kWh`) برابر **`16.3 kWh`** (`M-E4`) گزارش شده و درصد پوشش شب طراحی (`nightCoveragePct`) به صورت کاذب **`197.6%`** به جای **`184.4%`** (تورم کاذب `+13.2%`) محاسبه می‌شود. همچنین `unitVoltage` برای باتری‌های لیتیومی در ولتاژهای غیر از `48 V` (مثلاً `24 V` یا رک‌های فشارقوی `400 V`) به غلط روی `12.0 V` سقوط می‌کند.

4. **تناقض تعداد اینورترها و زیرسایز شدن ترانسفورماتور در `designPowerplantBays`:**
   - در `src/engine/powerplantBayEngine.ts:173-195`، تعداد اینورترهای هر بی به صورت مستقل با `Math.ceil((bayCapacityMw * 1000) / effectiveUnitKw)` گرد می‌شود. برای یک نیروگاه `10 MW` با `3` بی و اینورتر `330 kW`، هر بی `ceil(3333.33 / 330) = 11` اینورتر می‌گیرد و مجموع کل بی‌ها **`33` دستگاه** (`10.89 MW`) می‌شود، در حالی که `evaluateInverterClustering` برای همان نیروگاه `ceil(10000 / 330) = 31` دستگاه (`10.23 MW`) محاسبه می‌کند (`2` دستگاه اختلاف!).
   - در همان حلقه (خط `177`)، ظرفیت ترانسفورماتور هر بی صرفاً از روی `bayCapacityMw * 1.15` محاسبه می‌شود، نه از روی توان AC واقعی اینورترهای نصب‌شده در آن بی (`bayInstalledAcMw`). در نتیجه برای نیروگاه ۱ مگاواتی (`G-1` با ۱ بی و `4 × 330 kW = 1.32 MW` اینورتر)، ترانسفورماتور روی **`1.15 MVA`** سایز می‌شود که کمتر از توان نامی `1.32 MW` اینورترهای متصل به آن است! همچنین در خط `226`، مقدار `transformerBaysCount` در تابلو کلکتور MV برابر `0` هاردکد شده است.

5. **خطای تعداد سلول سری، عدم کالیبراسیون نقطهٔ MPP در شرایط STC، ریشهٔ مدار باز و مساحت هاردکد `2.5 m²` در `calculateSingleDiodeCurve`:**
   - در `src/engine/singleDiodeModel.ts:76`، تعداد سلول‌های سری ماژول با تقریب خام `Math.round(stcVoc / 0.68)` محاسبه می‌شود که ماژول ۷۲ سلولی `mod-jinko-585` (`Voc = 51.25 V`) را به **`75` سلول** تبدیل می‌کند.
   - مقاومت سری مرجع (`rsRefModule` در خط `93`) با ضریب تجربی `0.235` تخمین زده می‌شود بدون آن‌که معادلهٔ تک‌دیود در نقطهٔ کار بیشینهٔ شرایط استاندارد (`V = stcVmp, I = stcImp`) کالیبره شود؛ در نتیجه در شرایط STC (`1000 W/m², 25°C`) برای ماژول `585 W`، خروجی مدل برابر **`589.2 W`** (`+4.2 W` خطا در STC!) است.
   - ولتاژ مدار باز (`voc` در خط `119`) از یک رابطهٔ تجربی لگاریتمی مجزا به جای ریشهٔ دقیق معادلهٔ دیود در جریان صفر (`I(Voc) = 0`) محاسبه می‌شود، و در خط `164` مساحت ماژول برای هر پنلی به صورت ثابت `nominalArea = 2.5 * nSeries` هاردکد شده که راندمان STC ماژول `mod-jinko-585` (`22.65%` با مساحت واقعی `2.278 × 1.134 = 2.583252 m²`) را به غلط **`23.6%`** گزارش می‌کند.

================================================================================
# بخش ۲ — محدودهٔ فایل‌ها (ایجاد / ویرایش / ممنوع)
================================================================================

| دسته | مسیر فایل | مجوز و شرح دقیق |
|---|---|---|
| **ایجاد (مجاز)** | `src/engine/core/electricalSizingContract.ts` | ماژول مرجع یکپارچه‌سازی سایزینگ الکتریکال، ناوگان اینورتر، دروازهٔ مسدودکنندهٔ جریان MPPT، ذخیره‌سازی باتری و معماری بی MV (`resolveInverterMpptRatings`, `evaluateFleetMpptCompliance`, `resolveCoordinatedPowerplantSizing`, `resolveElectricalSystemSizing`) |
| **ایجاد (مجاز)** | `scripts/remediation/verify-phase05.ts` | اسکریپت مستقل راستی‌آزمایی فاز ۵، اجرای کمیت‌های `P5-01` تا `P5-08` و بررسی‌های `C5-01` تا `C5-06` و تولید شواهد JSON |
| **ایجاد (مجاز)** | `docs/audit/remediation/evidence/phase05/phase05-measurements.json` | فایل شواهد عددی فاز ۵ منطبق بر طرح‌وارهٔ §۶ |
| **ویرایش کمینه (مجاز)** | `src/engine/inverterClustering.ts` | اصلاح انتخاب خودکار ردهٔ اینورتر هنگام عدم تناسب واحد ورودی با کلاس بار (`continuousKw <= 30 && preferredUnitKw > engineeringClass.maxSingleUnitKw * 2`)، اصلاح پلهٔ ولتاژ باتری در کلاس `residential_micro` هنگام اصلاح واحد، و افزودن فیلدهای تشخیصی اختیاری (`isUnitRightSized?: boolean`, `requestedUnitRatingKw?: number`) بدون تغییر خروجی فراخوانی‌های متناسب موجود در `measure.ts` (`G-1`, `G-2`, `G-3`) |
| **ویرایش کمینه (مجاز)** | `src/engine/pvEngineAdvanced.ts` | افزودن پارامتر اختیاری هفتم `options?: PvArrayDesignOptions` به `designPvArray` و افزودن فیلدهای ناوگان و مسدودسازی (`requiredInverterCount`, `totalInverterAcCapacityKw`, `singleInverterDcAcRatio`, `stringsPerMppt`, `maxStringsPerMpptAllowed`, `blockingErrors`) به `PvArrayDesignResult`، با حفظ ۱۰۰٪ مقادیر `totalPvCapacityKwp`, `totalModulesCount`, `modulesPerString`, `parallelStringsCount`, `effectiveDeratingFactor` در فراخوانی ۶ آرگومانی پیش‌فرض جهت حفظ لنگرهای `M-A1` و `M-A2` و تست `E8-PV-1` |
| **ویرایش کمینه (مجاز)** | `src/engine/batteryEngine.ts` | اصلاح `actualUsableKwh` با اعمال `roundTripFraction * tempCorrectionFactor`، افزودن فیلد اختیاری `nominalDoDUsableCapacityKwh?: number` به `BatteryBankSizingResult`، و اصلاح `unitVoltage` برای شیمی‌های لیتیومی (`lifepo4` و `ternary_ncm`) در ولتاژهای `24 V` و `>= 48 V` (با حفظ کامل پاس‌شدن تست‌های `E1-ENG-2` و `E25`) |
| **ویرایش کمینه (مجاز)** | `src/engine/powerplantBayEngine.ts` | توزیع دقیق مجموع اینورترهای ناوگان (`totalInverterCount = ceil(safeCapacityMw * 1000 / effectiveUnitKw)`) بین بی‌ها بدون گردکردن مضاعف، سایزینگ `transformerRatingMva` بر پایهٔ `Math.max(bayCapacityMw, bayInstalledAcMw) * 1.15`، اصلاح `transformerBaysCount` در `designPowerplantBays` به `safeCapacityMw >= 25 ? 2 : 1`، احترام به `pvDcCapacityMwp` صریح ورودی بدون تحمیل کف `1.05x`، و افزودن فیلدهای خلاصهٔ ناوگان (`totalInverterCount?: number`, `totalInstalledInverterAcMw?: number`, `effectiveFleetDcAcRatio?: number`) |
| **ویرایش کمینه (مجاز)** | `src/engine/singleDiodeModel.ts` | اصلاح تشخیص تعداد سلول‌های سری ماژول به شمارش‌های استاندارد صنعتی (`[36, 48, 54, 60, 66, 72, 78, 96]`)، کالیبراسیون نیوتن-رافسون مقاومت سری مرجع (`rsRefModule`) در نقطهٔ MPP شرایط STC، حل ریشهٔ دقیق `I(Voc) = 0` از معادلهٔ تک‌دیود، و محاسبهٔ مساحت ماژول از `customParams?.moduleAreaM2` یا نسبت `stcPmp / (1000 * 0.2265)` به جای ثابت `2.5 m²` (با حفظ کامل پاس‌شدن بنچمارک `VAL-SANDIA-02` در تلورانس `<= 1.5%`) |
| **ممنوع (مطلق)** | `scripts/remediation/fixtures/g1..g4.json`<br>`scripts/remediation/measure.ts`<br>`scripts/remediation/import-map.ts`<br>`scripts/remediation/run-phase01.ts`<br>`docs/audit/remediation/evidence/phase01/**`<br>`docs/audit/remediation/phase01-*` | **فایل‌های فاز ۱ کاملاً منجمدند.** صفر بایت تغییر نسبت به کامیت `91b9b3b`. |
| **ممنوع (مطلق)** | `src/engine/core/solarGeometryContract.ts`<br>`src/engine/roof3dShadingEngine.ts`<br>`src/engine/shadingSunPathEngine.ts`<br>`server.ts`<br>`scripts/remediation/verify-phase02.ts`<br>`docs/audit/remediation/evidence/phase02/**` | **فایل‌های فاز ۲ کاملاً منجمدند.** صفر بایت تغییر نسبت به کامیت `64e0ede`. |
| **ممنوع (مطلق)** | `src/engine/core/annualYieldEngine.ts`<br>`src/engine/core/thermalDerate.ts`<br>`src/engine/waterfallLossEngine.ts`<br>`src/engine/simulation24hEngine.ts`<br>`src/engine/solarPvEngine.ts`<br>`scripts/remediation/verify-phase03.ts`<br>`docs/audit/remediation/evidence/phase03/**` | **فایل‌های فاز ۳ کاملاً منجمدند.** صفر بایت تغییر نسبت به کامیت `7c4d55c`. |
| **ممنوع (مطلق)** | `src/engine/core/physicalLossContract.ts`<br>`src/engine/bifacialGain.ts`<br>`src/engine/equipmentCatalogData.ts`<br>`src/engine/types/equipmentTypes.ts`<br>`src/engine/catalogAdapters.ts`<br>`src/engine/waterfallArgs.ts`<br>`scripts/remediation/verify-phase04.ts`<br>`docs/audit/remediation/evidence/phase04/**` | **فایل‌های فاز ۴ کاملاً منجمدند.** صفر بایت تغییر نسبت به کامیت `bc1a978`. |
| **ممنوع (مطلق)** | `src/App.tsx`, `src/components/**`, `src/engine/financialEngine.ts`, `src/engine/structuralEngine.ts`, `src/engine/mvSubstationEngine.ts`, `src/engine/protectionBomEngine.ts`, `src/engine/core/benchmarks/**`, `package.json`, `tsconfig*.json` | هرگونه دیف در این فایل‌ها = رد فوری فاز ۵ |

**دروازهٔ مکانیکی دامنه:**
در پایان فاز، خروجی دستور زیر نسبت به کامیت پایانی فاز ۴ (`bc1a978`) باید **کاملاً خالی** باشد:
`git diff --stat bc1a978 -- scripts/remediation/fixtures/ scripts/remediation/measure.ts scripts/remediation/import-map.ts scripts/remediation/run-phase01.ts scripts/remediation/verify-phase02.ts scripts/remediation/verify-phase03.ts scripts/remediation/verify-phase04.ts docs/audit/remediation/evidence/phase01/ docs/audit/remediation/evidence/phase02/ docs/audit/remediation/evidence/phase03/ docs/audit/remediation/evidence/phase04/ docs/audit/remediation/phase01-formula-spec.fa.md docs/audit/remediation/phase01-baseline-manifest.json src/engine/core/solarGeometryContract.ts src/engine/roof3dShadingEngine.ts src/engine/shadingSunPathEngine.ts server.ts src/engine/core/annualYieldEngine.ts src/engine/core/thermalDerate.ts src/engine/waterfallLossEngine.ts src/engine/simulation24hEngine.ts src/engine/solarPvEngine.ts src/engine/core/physicalLossContract.ts src/engine/bifacialGain.ts src/engine/equipmentCatalogData.ts src/engine/types/equipmentTypes.ts src/engine/catalogAdapters.ts src/engine/waterfallArgs.ts src/App.tsx src/components/ src/engine/financialEngine.ts src/engine/structuralEngine.ts src/engine/mvSubstationEngine.ts src/engine/protectionBomEngine.ts src/engine/core/benchmarks/ package.json tsconfig.json`

================================================================================
# بخش ۳ — ورودی‌های یخ‌زده و اعداد خط مبنای فاز ۱ تا فاز ۴
================================================================================

تمامی ورودی‌های کیس‌های طلایی از فایل‌های یخ‌زدهٔ `scripts/remediation/fixtures/g1.json` تا `g4.json` خوانده می‌شوند:

1. **کیس G-1 (`scripts/remediation/fixtures/g1.json`):**
   - نیروگاه `1000 kW` در تهران (`latitudeDeg = 35.6892`, `peakSunHours = 5.17`, `tiltDeg = 31.0`, `ambientTempDesignMaxC = 39.0`, `tempMinC = -5.0`, `soilingLossPct = 5.5`, `albedo = 0.20`, `groundCoverRatio = 0.38`)
   - ماژول `mod-jinko-585`: `pmpWatts = 585`, `vocVolts = 51.25`, `vmpVolts = 42.68`, `iscAmps = 14.42`, `impAmps = 13.71`, `efficiencyPct = 22.65`, `tempCoeffVocPct = -0.25`, `tempCoeffPmpPct = -0.29`, `noctC = 45.0`, `lengthM = 2.278`, `widthM = 1.134` (`area = 2.583252 m²`)
   - اینورتر `inv-huawei-330ktl`: `pnomAcKw = 330.0`, `maxPvInputKw = 450.0`, `vdcMaxVolts = 1500`, `vmpptMinVolts = 500`, `vmpptMaxVolts = 1500`, `mpptChannelsCount = 6` (در فیکسچر اولیهٔ فاز ۱ مقادیر `imppMaxAmpsPerMppt = 22.0 A` و `iscMaxAmpsPerMppt = 26.0 A` از fallback خانگی کپی شده‌اند، در حالی که مشخصهٔ واقعی دیتاشیت اینورتر رشته‌ای ۳۳۰ کیلوواتی ६ کاناله برابر `imppMaxAmpsPerMppt = 65.0 A` و `iscMaxAmpsPerMppt = 90.0 A` است)
2. **کیس G-2 (`scripts/remediation/fixtures/g2.json`):**
   - سیستم مسکونی متصل به شبکه در تهران (`dailyConsumptionKwh = 3.0 kWh`, `outageHours = 6`)، توان بار پیوستهٔ معادل `250 W` و پیک `450 W` (یا در ارزیابی کلاسترینگ ۳ کیلوواتی: `3000 W` پیوسته و `4500 W` پیک).
3. **کیس G-3 (`scripts/remediation/fixtures/g3.json`):**
   - سیستم مستقل از شبکه در تهران (`dailyConsumptionKwh = 8.26 kWh`, `autonomyDays = 1.5`, `designNighttimeKwh = 8.26 kWh`, شیمی `lifepo4`, ولتاژ `48 V`, دمای کمینهٔ محیط باتری `15.0°C`, ظرفیت واحد `100 Ah`, توان پیوستهٔ اینورتر `3000 W` و پیک `5000 W`).
4. **اعداد خط مبنای ثبت‌شده در `docs/audit/remediation/evidence/phase01/measurements.json` (کامیت `91b9b3b`):**
   - `M-E1 = 4 units` (کلاسترینگ G-1: `4 × 330 kW = 1320 kW AC`؛ G-2: `1 × 5 kW`؛ G-3: `1 × 5 kW`)
   - `M-E2 = 1200 VDC` (ولتاژ نامی باس DC اینورتر G-1 برابر `1200 V`، ولتاژ باتری G-3 برابر `48 V`)
   - `M-E3 = 233.07 A` (`17` رشته در هر MPPT × `13.71 A` در برابر سقف `22.0 A`، `isMpptCurrentCompliant = false`, `enforcementBehavior = 'warned-only'`)
   - `M-E4 = 19.2 kWh` (`usableCapacityKwh = 16.3 kWh`, `coverageTargetKwh = 8.26 kWh`, `nightCoveragePct = 197.6%`)
   - `M-E5 = 0.859773` (`totalPvCapacityKwp = 1134.9 kWp` بر `1320 kW AC` ناوگان در برابر `systemTargetIlr = 1.25` و `singleInverterDcAcRatio = 3.439091`)
   - بررسی‌های شکست‌خوردهٔ گروه E در فاز ۱: `C-02` (`3.439091` در برابر `1.25`)، `C-03` (`1.25` در برابر `0.859773`)، `C-10` (`233.07 A` در برابر `22.0 A`)
   - لنگرهای غیررگرسیونی که در `scripts/remediation/measure.ts` **نباید تغییر کنند (`delta = 0`)**:
     - `M-A1 = 1851400 kWh`
     - `M-A2 = 1646827.145773 kWh`
     - `M-C1 = 13.1225 %`
     - `M-D1 = 2.74 %`
     - `M-F1 = 499784 USD`
     - `M-F4 = 310202 USD`

================================================================================
# بخش ۴ — مشخصات فنی دقیق و کمیت‌های «قبل → بعد» (`P5-01` تا `P5-08`)
================================================================================

## ۴.۱ مشخصات فنی تغییرات مجاز

1. **اصلاح `src/engine/inverterClustering.ts`:**
   - در تابع `evaluateInverterClustering(continuousWatts, peakSurgeWatts, preferredUnitKw = 5.0, inverterVmpptMaxV?)`:
     - هنگامی که کلاس مهندسی بار غیرصنعتی است (`continuousKw <= 30.0`، یعنی `engineeringClass.classType !== 'industrial_utility'`) اما واحد اینورتر ورودی بیش از ۲ برابر سقف مجاز آن کلاس است (`preferredUnitKw > engineeringClass.maxSingleUnitKw * 2`، مانند ارسال اینورتر پیش‌فرض `330 kW` به بار مسکونی `250 W` یا `3000 W`):
       - مقدار مؤثر `unitKw` را به `engineeringClass.maxSingleUnitKw` (یعنی `3.0 kW` برای `residential_micro`، `6.0 kW` برای `residential_standard`، `12.0 kW` برای `commercial_light`) اصلاح (Right-Size) کن.
       - در این حالت، ولتاژ نامی باس DC اینورتر (`inverterDcBusNominalV`) را بر اساس واحد اصلاح‌شده (`400 V` برای `unitKw <= 10` و `800 V` برای `unitKw <= 100`) تنظیم کن (نه `1200 V` ناشی از `inverterVmpptMaxV = 1500 V` اینورتر صنعتی نامتناسب).
       - ولتاژ پیشنهادی باس باتری (`recommendedDcVoltageVdc` و `batteryDcBusNominalV`) را در صورت اصلاح واحد، حداقل برابر `engineeringClass.recommendedDcVoltage` (یعنی `24 V` برای `residential_micro` و `48 V` برای کلاس‌های بالاتر) قرار بده.
       - وضعیت سلامت را `healthStatus = 'upgrade_suggested'` قرار بده و در `healthStatusTextFa` و `recommendationFa` توضیح بده که اینورتر صنعتی نامتناسب (`preferredUnitKw` کیلووات) به ظرفیت متناسب کلاس بار (`unitKw` کیلووات) اصلاح شد. همچنین دو فیلد اختیاری `isUnitRightSized?: boolean` و `requestedUnitRatingKw?: number` به `InverterClusteringResult` اضافه کن.
     - **شرط حیاتی عدم رگرسیون:** برای فراخوانی‌های متناسب موجود در `measure.ts` — یعنی `evaluateInverterClustering(1000000, 1100000, 330.0, 1500)` (`G-1` با `continuousKw = 1000 > 30`) و `evaluateInverterClustering(3000, 4500, 5.0, 500)` / `evaluateInverterClustering(3000, 5000, 5.0, 500)` (`G-2` و `G-3` که در آن‌ها `preferredUnitKw = 5.0 <= 3.0 * 2` است) — خروجی‌ها باید **دقیقاً بدون تغییر** باقی بمانند.

2. **اصلاح `src/engine/batteryEngine.ts`:**
   - در تابع `sizeBatteryBank`:
     - در محاسبهٔ ظرفیت قابل‌استفادهٔ واقعی تحویلی بانک باتری (`actualUsableKwh`)، هر دو ضریب راندمان رفت‌وبرگشت و تصحیح دما را لحاظ کن:
       `const nominalDoDUsableKwh = actualGrossKwh * dodFraction;`
       `const actualUsableKwh = actualGrossKwh * dodFraction * roundTripFraction * tempCorrectionFactor;`
     - فیلد اختیاری `nominalDoDUsableCapacityKwh?: number` (گردشده به ۱ رقم اعشار: `Math.round(nominalDoDUsableKwh * 10) / 10`) را به اینترفیس `BatteryBankSizingResult` اضافه کن و `usableCapacityKwh` را برابر `Math.round(actualUsableKwh * 10) / 10` قرار بده (و در محاسبهٔ `nightCoveragePct` نیز از همان `actualUsableKwh` استفاده کن).
     - در تعیین ولتاژ بلوک باتری (`unitVoltage`)، برای شیمی‌های لیتیومی (`profile.id === 'lifepo4' || profile.id === 'ternary_ncm'`): اگر `vdc >= 48` باشد `unitVoltage = 48.0`، اگر `vdc === 24` باشد `unitVoltage = 24.0`، و در غیر این صورت `12.0` قرار بده (تا برای بانک‌های لیتیومی `24 V` یا رک‌های سری `48 V` / `400 V`، بلوک‌های `12 V` اسیدسربی فرض نشود).

3. **اصلاح `src/engine/powerplantBayEngine.ts`:**
   - در تابع `designPowerplantBays`:
     - اگر `pvDcCapacityMwp` عددی متناهی و اکیداً مثبت (`Number.isFinite(pvDcCapacityMwp) && pvDcCapacityMwp > 0`) است، مقدار `safeDcMwp = pvDcCapacityMwp` را عیناً حفظ کن و فقط در صورت عدم ارسال یا نامعتبر بودن از `safeCapacityMw * 1.25` استفاده کن.
     - برای جلوگیری از گردکردن مضاعف تعداد اینورترها در بی‌ها، ابتدا تعداد کل اینورترهای نیروگاه را منطبق با فرمول کلاسترینگ محاسبه کن:
       `const totalPlantInverterCount = technology === 'mv_turnkey' ? actualBaysCount : Math.max(actualBaysCount, Math.ceil((safeCapacityMw * 1000.0) / effectiveUnitKw));`
       سپس این تعداد کل را به صورت متوازن بین `actualBaysCount` بی توزیع کن:
       `const baseInvertersPerBay = Math.floor(totalPlantInverterCount / actualBaysCount);`
       `const remainderInverters = totalPlantInverterCount % actualBaysCount;`
       و برای بی `i`ام (`1..actualBaysCount`):
       `const bayInverterCount = technology === 'mv_turnkey' ? 1 : baseInvertersPerBay + (i <= remainderInverters ? 1 : 0);`
     - توان AC نصب‌شدهٔ واقعی هر بی را برابر `const bayInstalledAcMw = (bayInverterCount * effectiveUnitKw) / 1000.0;` قرار بده و ظرفیت ترانسفورماتور هر بی را بر اساس بزرگ‌ترینِ توان سهمیه‌ای و توان اینورترهای نصب‌شدهٔ آن بی با حاشیهٔ ۱۵٪ سایز کن:
       `const effectiveBayAcMw = Math.max(bayCapacityMw, bayInstalledAcMw);`
       `const transformerRatingMva = Number((effectiveBayAcMw * 1.15).toFixed(2));`
     - در بخش `mainCollectorBusbar`، مقدار `transformerBaysCount` را به جای `0` برابر `const transformerBaysCount = safeCapacityMw >= 25 ? 2 : 1;` قرار بده تا در `calculateSubstationBayCount` لحاظ شود.
     - فیلدهای اختیاری `totalInverterCount?: number`، `totalInstalledInverterAcMw?: number` و `effectiveFleetDcAcRatio?: number` را به `PowerplantBayArchitectureResult` اضافه کن.

4. **اصلاح `src/engine/singleDiodeModel.ts`:**
   - فیلدهای اختیاری `cellsPerModule?: number` و `moduleAreaM2?: number` را به `DiodeParameters` اضافه کن.
   - برای تعیین `cellsPerModule`، اگر `customParams?.cellsPerModule` مثبت و متناهی بود از `Math.round(customParams.cellsPerModule)` استفاده کن؛ در غیر این صورت `stcVoc / 0.705` را به نزدیک‌ترین شمارش سلول سری استاندارد صنعتی در آرایهٔ `[36, 48, 54, 60, 66, 72, 78, 96]` نگاشت کن (که برای `50.80 V` و `51.25 V` دقیقاً `72` سلول می‌دهد).
   - هنگامی که `customParams?.rs` ارسال نشده است، مقاومت سری مرجع تک‌ماژول (`rsRefModule`) را با تکرار نیوتن-رافسون (۳۰ گام با مقدار اولیهٔ `Math.max(0.01, ((stcVoc - stcVmp) / stcImp) * 0.235)`) به گونه‌ای حل کن که در شرایط مرجع STC (`V = stcVmp`, `I = stcImp`)، معادلهٔ تک‌دیود `iphRef - i0Ref * (exp((stcVmp + stcImp * rsRefModule) / aRefModule) - 1) - (stcVmp + stcImp * rsRefModule) / rshRefModule - stcImp = 0` برقرار شود (به‌طوری که در `1000 W/m², 25°C`، توان بیشینهٔ منحنی دقیقاً برابر `585.0 W` شود).
   - ولتاژ مدار باز (`voc`) را در هر تابش و دما با حل نیوتن-رافسون معادلهٔ جریان صفر دیود `iph - i0 * (exp(voc / aActual) - 1) - voc / rsh = 0` (با حدس اولیهٔ `Math.max(0.1, stcVoc * nSeries * (1.0 + (tempCoeffVocPct / 100.0) * deltaT))`) محاسبه کن تا در انتهای منحنی (`v = voc`) جریان دیود دقیقاً صفر (`0.00 A`) باشد.
   - برای محاسبهٔ `efficiencyPct`، به جای مساحت هاردکد `2.5 * nSeries`، از:
     `const singleModuleAreaM2 = (customParams?.moduleAreaM2 && customParams.moduleAreaM2 > 0) ? customParams.moduleAreaM2 : (stcPmp > 0 ? stcPmp / (1000.0 * 0.2265) : 2.5);`
     `const nominalArea = singleModuleAreaM2 * nSeries;`
     استفاده کن.

5. **اصلاح `src/engine/pvEngineAdvanced.ts` و ایجاد `src/engine/core/electricalSizingContract.ts`:**
   - در `src/engine/pvEngineAdvanced.ts`:
     - اینترفیس `PvArrayDesignOptions` شامل `{ inverterCount?: number; targetDcAcRatio?: number; optimizeStringLengthForMppt?: boolean; resolveUtilityMpptLimits?: boolean }` تعریف کن و آن را به عنوان پارامتر اختیاری هفتم به `designPvArray` اضافه کن.
     - سقف مجاز تعداد رشته‌های موازی در هر کانال MPPT را از روی مشخصات جریان اینورتر محاسبه کن:
       `const maxStringsByImpp = inverter.imppMaxAmpsPerMppt > 0 ? Math.floor(inverter.imppMaxAmpsPerMppt / module.impAmps) : Number.POSITIVE_INFINITY;`
       `const maxStringsByIsc = inverter.iscMaxAmpsPerMppt > 0 ? Math.floor(inverter.iscMaxAmpsPerMppt / (module.iscAmps * 1.25)) : Number.POSITIVE_INFINITY;`
       `const maxStringsPerMpptAllowed = Math.min(maxStringsByImpp, maxStringsByIsc);`
     - تعداد اینورتر مورد نیاز ناوگان (`requiredInverterCount`):
       اگر `options?.inverterCount` (عدد صحیح `>= 1`) داده شده بود، از همان استفاده کن؛ در غیر این صورت، هنگامی که `options` ارسال نشده است (فراخوانی ۶ آرگومانی پیش‌فرض)، `requiredInverterCount = 1` است تا رفتار پیش‌فرض حفظ شود، و هنگامی که `options` ارسال شده ولی `inverterCount` مشخص نشده، `Math.max(1, Math.round(totalPvCapacityKwp / (inverter.pnomAcKw * (options.targetDcAcRatio ?? 1.25))))` باشد.
     - اگر `options?.optimizeStringLengthForMppt === true` و `Number.isFinite(maxStringsPerMpptAllowed) && maxStringsPerMpptAllowed >= 1` باشد، در صورتی که `parallelStrings > requiredInverterCount * Math.max(1, inverter.mpptChannelsCount) * maxStringsPerMpptAllowed` بود، طول رشته (`chosenModulesPerString`) را در بازهٔ مجاز ولتاژی `[chosenModulesPerString, upperLimit]` افزایش بده تا تعداد رشته‌های موازی (`parallelStrings`) در ظرفیت کانال‌های MPPT ناوگان جا شود.
     - مقادیر `stringsPerMppt = Math.ceil(parallelStrings / (requiredInverterCount * Math.max(1, inverter.mpptChannelsCount)))`، `maxMpptOperatingCurrentAmps`، `maxMpptShortCircuitCurrentAmps`، `totalInverterAcCapacityKw = Number((requiredInverterCount * inverter.pnomAcKw).toFixed(2))`، `singleInverterDcAcRatio = Number((totalPvCapacityKwp / inverter.pnomAcKw).toFixed(6))` و `dcAcRatio = Number((totalPvCapacityKwp / totalInverterAcCapacityKw).toFixed(6))` را محاسبه کن.
     - آرایهٔ `blockingErrors: string[]` را به `PvArrayDesignResult` اضافه کن: هرگاه `!isVoltageFeasible` یا `!isMpptCurrentCompliant` یا (`options !== undefined && dcAcRatio > 1.5`) برقرار باشد، پیام خطای مسدودکنندهٔ صریح در `blockingErrors` ثبت کن و `isDesignFeasible` را `false` قرار بده.
   - در `src/engine/core/electricalSizingContract.ts`:
     - تابع `resolveInverterMpptRatings(inverter: InverterSpecs): InverterSpecs` را پیاده‌سازی کن که برای اینورترهای رشته‌ای نیروگاهی (`inverter.pnomAcKw >= 100 && inverter.vdcMaxVolts >= 1000`) که به دلیل باگ fallback رابط کاربری دارای مقادیر خانگی `imppMaxAmpsPerMppt <= 30` و `iscMaxAmpsPerMppt <= 35` هستند، مقادیر استاندارد دیتاشیت صنعتی (`imppMaxAmpsPerMppt = 65.0 A`, `iscMaxAmpsPerMppt = 90.0 A`) را برگرداند (و برای سایر اینورترها یا زمانی که `preserveRawLimits: true` است، مقادیر ورودی را دست‌نخورده نگه دارد).
     - تابع `resolveElectricalSystemSizing(input: ElectricalSystemSizingInput): ElectricalSystemSizingResult` را پیاده‌سازی کن که زنجیرهٔ کامل `evaluateInverterClustering`، `designPvArray` (با ناوگان اینورتر و بهینه‌سازی طول رشته در پنجرهٔ MPPT)، `designPowerplantBays` و `sizeBatteryBank` را به صورت یکپارچه و بدون تناقض اجرا کند و در خروجی خود `isBlocked: boolean` و `blockingErrors: string[]` را برگرداند.

## ۴.۲ جدول کمیت‌های «قبل → بعد» (`P5-01` تا `P5-08`)

اسکریپت `scripts/remediation/verify-phase05.ts` باید دقیقاً این ۸ کمیت را از اجرای زندهٔ موتورها محاسبه و در `docs/audit/remediation/evidence/phase05/phase05-measurements.json` ثبت کند:

| شناسه | نام کمیت | کیس و ورودی دقیق | مقدار قبل (`before`) | مقدار بعد (`after`) | دلتا (`delta`) | واحد |
|---|---|---|---|---|---|---|
| **`P5-01`** | ظرفیت کل اینورتر در کلاسترینگ بار مسکونی با ورودی پیش‌فرض ۳۳۰ کیلووات (`G-2 Residential Inverter Clustering Total AC Capacity`) | `G-2`: فراخوانی `evaluateInverterClustering(250, 450, 330.0, 1500)` (`250 W` پیوسته، `450 W` پیک، واحد پیش‌فرض `330 kW`) | `330.0` | `3.0` | `-327.0` | `kW` |
| **`P5-02`** | حداکثر جریان کاری هر کانال MPPT در نیروگاه ۱ مگاواتی (`G-1 Max MPPT Operating Current per Channel`) | `G-1`: طراحی آرایهٔ نیروگاه ۱ مگاواتی (`effectiveDailyKwhDemandG1 = 4469.315068 kWh/day`)؛ `before`: فرض تک‌اینورتر (`17 × 13.71 A`)؛ `after`: توزیع روی ناوگان ۴ اینورتر (`24` کانال MPPT) با بهینه‌سازی طول رشته (`21` ماژول در هر رشته، `93` رشته ⇐ `4` رشته در هر MPPT × `13.71 A` در برابر سقف دیتاشیت `65.0 A`) | `233.07` | `54.84` | `-178.23` | `A` |
| **`P5-03`** | نسبت DC/AC گزارش‌شده در طراحی آرایهٔ نیروگاه ۱ مگاواتی روی ناوگان ۴ دستگاهی (`G-1 Array vs 4-Unit Fleet DC/AC Ratio`) | `G-1`: ظرفیت آرایه `1134.9 kWp`؛ `before`: تقسیم بر یک اینورتر `330 kW` (`1134.9 / 330`)؛ `after`: تقسیم بر ظرفیت ناوگان ۴ دستگاهی `1320 kW` (`designPvArray` با `inverterCount: 4` بدون تغییر طول رشته: `1134.9 / 1320`) | `3.439091` | `0.859773` | `-2.579318` | `ratio` |
| **`P5-04`** | ظرفیت قابل‌استفادهٔ خالص بانک باتری در حالت مستقل از شبکه (`G-3 Off-Grid Net Deliverable Usable Battery Capacity`) | `G-3`: `sizeBatteryBank(8.26, 1.5, 'lifepo4', 48, 5000, 3000, 15.0, 100, 8.26, 'offgrid')` (`grossCapacityKwh = 19.2 kWh`)؛ `before`: `19.2 × 0.85`؛ `after`: `19.2 × 0.85 × 0.95 × 0.9825` | `16.3` | `15.2` | `-1.1` | `kWh` |
| **`P5-05`** | درصد پوشش بار شبِ طراحی بانک باتری (`G-3 Off-Grid Design Night Coverage Percentage`) | `G-3`: نسبت انرژی قابل‌تحویل واقعی بانک باتری به بار شب طراحی (`8.26 kWh`) در `sizeBatteryBank` | `197.6` | `184.4` | `-13.2` | `%` |
| **`P5-06`** | تعداد کل اینورترهای تخصیص‌یافته در معماری بی MV نیروگاه ۱۰ مگاواتی (`10 MW Powerplant MV Bay Total Inverter Count`) | `designPowerplantBays(10.0, 12.5, 'string_inverter', undefined, 20, 330)` در برابر `evaluateInverterClustering(10000000, 11000000, 330, 1500)` (`3` بی MV) | `33` | `31` | `-2` | `units` |
| **`P5-07`** | ظرفیت نامی ترانسفورماتور بی MV نیروگاه ۱ مگاواتی (`G-1 1 MW MV Bay Step-Up Transformer Rating`) | `G-1`: `designPowerplantBays(1.0, 1.1349, 'string_inverter', undefined, 20, 330)` با `4 × 330 kW = 1.32 MW` اینورتر منصوب در بی شماره ۱ | `1.15` | `1.52` | `0.37` | `MVA` |
| **`P5-08`** | توان نقطهٔ کار بیشینه (Pmp) مدل تک‌دیود در شرایط استاندارد STC (`G-1 Single-Diode Model STC Pmp`) | `G-1`: `calculateSingleDiodeCurve(51.25, 14.42, 42.68, 13.71, 585, -0.25, 0.045, -0.29, 1000, 25, 1)` (و در `details`: راندمان STC از `23.6%` به `22.65%` و تعداد سلول از `75` به `72`) | `589.2` | `585.0` | `-4.2` | `W` |

================================================================================
# بخش ۵ — بررسی‌های انسجام فاز ۵ (`C5-01` تا `C5-06`)
================================================================================

هر ۶ بررسی انسجام زیر باید در `scripts/remediation/verify-phase05.ts` پیاده‌سازی شوند و همگی `pass: true` برگردانند:

1. **`C5-01` — تطابق دقیق نسبت DC/AC آرایه با نسبت DC/AC ناوگان اینورتر (`Array Design vs Fleet Inverter DC/AC Ratio Coherence` — رفع `C-02`):**
   - `lhs`: خروجی `dcAcRatio` از `designPvArray` روی `G-1` با `{ inverterCount: clusteringG1.parallelUnitsCount }` (`0.859773`)
   - `rhs`: نسبت `arrayDesign.totalPvCapacityKwp / clusteringG1.totalInverterCapacityKw` (`0.859773`)
   - شرط گذر: `Math.abs(lhs - rhs) <= 1e-6` (`delta === 0`).

2. **`C5-02` — انسجام نسبت DC/AC هدف و محقق‌شده در سایزینگ هماهنگ نیروگاه (`Coordinated Powerplant Target vs Realized DC/AC Ratio Coherence` — رفع `C-03`):**
   - در `resolveElectricalSystemSizing` برای نیروگاه `G-1` (`targetAcCapacityKw = 1000`, `targetDcAcRatio = 1.25` با کوپلینگ کامل رشته و کانال‌های MPPT ناوگان):
   - `lhs`: نسبت DC به توان نامی AC هدف نیروگاه (`resolved.totalPvCapacityKwp / 1000.0`، مثلاً `1247.22 / 1000 = 1.24722` یا `1247.805 / 1000 = 1.247805`)
   - `rhs`: `1.250000` (`targetDcAcRatio`)
   - شرط گذر: `Math.abs(lhs - rhs) <= 0.05` و همچنین `Math.abs(resolved.arrayDesign.dcAcRatio - resolved.waterfallInputDcAcRatio) <= 1e-6`.

3. **`C5-03` — انطباق جریان کاری و اتصال کوتاه MPPT در ناوگان اصلاح‌شده و مسدودسازی قطعی در صورت نقض (`MPPT Operating & Short-Circuit Current Compliance & Hard-Blocking Gate` — رفع `C-10`):**
   - `lhs`: حداکثر جریان کاری هر کانال MPPT در طراحی هماهنگ `G-1` با مشخصات دیتاشیت اینورتر ۳۳۰ کیلوواتی (`54.84 A`)
   - `rhs`: سقف جریان کاری هر کانال MPPT (`65.00 A`)
   - شرط گذر: `lhs <= rhs` (`54.84 <= 65.00`) و `maxMpptShortCircuitCurrentAmps (72.10 A) <= iscMaxAmpsPerMppt (90.00 A)` و `isDesignFeasible === true`؛ **به‌علاوه** هنگامی که همان آرایه با سقف محدودکنندهٔ `imppMaxAmpsPerMppt = 22.0 A` (بدون اصلاح دیتاشیت و با `17` یا `5` رشته در هر MPPT) ارزیابی می‌شود، باید `isMpptCurrentCompliant === false`، `isDesignFeasible === false` و `blockingErrors.length > 0` باشد.

4. **`C5-04` — انطباق کامل تعداد اینورترها و کفایت MVA ترانسفورماتور در معماری بی MV (`MV Bay Architecture vs Inverter Clustering Unit & Transformer Coherence`):**
   - `lhs`: مجموع `inverterCount` تمام بی‌ها در `designPowerplantBays(10.0, 12.5, 'string_inverter', undefined, 20, 330)` (`31` دستگاه)
   - `rhs`: `evaluateInverterClustering(10000000, 11000000, 330, 1500).parallelUnitsCount` (`31` دستگاه)
   - شرط گذر: `lhs === rhs` (`delta === 0`) **و** برای هر بی در نیروگاه‌های ۱ مگاواتی و ۱۰ مگاواتی، `bay.transformerRatingMva >= Number(((bay.inverterCount * bay.inverterUnitRatingKw / 1000) * 1.15).toFixed(2))` و `mainCollectorBusbar.transformerBaysCount >= 1` باشد.

5. **`C5-05` — پایستگی انرژی قابل‌استفادهٔ خالص بانک باتری و ولتاژ واحد لیتیومی (`Battery Net Deliverable Usable Energy & Lithium Unit Voltage Conservation`):**
   - `lhs`: `bessG3.usableCapacityKwh` (`15.2 kWh`)
   - `rhs`: `Number((bessG3.grossCapacityKwh * 0.85 * 0.95 * 0.9825).toFixed(1))` (`15.2 kWh`)
   - شرط گذر: `Math.abs(lhs - rhs) <= 0.05` **و** `bessG3.nightCoveragePct === 184.4` **و** برای بانک لیتیومی `24 V` (`sizeBatteryBank(5, 1, 'lifepo4', 24)`), مقدار `batteriesInSeries === 1` باشد.

6. **`C5-06` — صحت کالیبراسیون نقطهٔ MPP در شرایط STC، ریشهٔ جریان صفر `Voc` و عدم رگرسیون بنچمارک Sandia در مدل تک‌دیود (`Single-Diode STC MPP, Zero-Current Voc Root & Sandia Benchmark Coherence`):**
   - `lhs`: `sdmStcG1.pmp` در شرایط STC (`1000 W/m², 25°C` برای ماژول `mod-jinko-585` با پلاک `585.0 W`)
   - `rhs`: `585.0` (`W`)
   - شرط گذر: `Math.abs(lhs - rhs) <= 0.5` **و** `Math.abs(sdmStcG1.efficiencyPct - 22.65) <= 0.05` **و** `sdmStcG1.points[sdmStcG1.points.length - 1].i === 0` **و** خطای نسبی `calculateSingleDiodeCurve` روی بنچمارک `GOLDEN_SANDIA_PV` در `800 W/m², 45°C` نسبت به `410.20 W` کمتر یا مساوی `1.5%` باشد (`<= 1.5%`).

================================================================================
# بخش ۶ — خروجی‌های تحویلی (`D5-1` تا `D5-3`) و طرح‌وارهٔ JSON
================================================================================

1. **`D5-1`:** ماژول `src/engine/core/electricalSizingContract.ts` + ویرایش‌های کمینه در `src/engine/inverterClustering.ts`، `src/engine/pvEngineAdvanced.ts`، `src/engine/batteryEngine.ts`، `src/engine/powerplantBayEngine.ts` و `src/engine/singleDiodeModel.ts`.
2. **`D5-2`:** اسکریپت `scripts/remediation/verify-phase05.ts` که با دستور `npx tsx scripts/remediation/verify-phase05.ts` اجرا می‌شود، فایل `docs/audit/remediation/evidence/phase05/phase05-measurements.json` را می‌نویسد، و در صورت شکست هر یک از `C5-01` تا `C5-06` یا تغییر هر یک از ۶ لنگر غیررگرسیونی فاز ۱ (`M-A1`, `M-A2`, `M-C1`, `M-D1`, `M-F1`, `M-F4`)، با کد خروج غیرصفر (`process.exit(1)`) متوقف می‌شود.
3. **`D5-3`:** فایل شواهد `docs/audit/remediation/evidence/phase05/phase05-measurements.json` با طرح‌وارهٔ دقیق زیر:

```json
{
  "phase": "phase05",
  "generatedAtCommit": "<40-char git HEAD sha>",
  "harnessSha256": "<sha256 of scripts/remediation/verify-phase05.ts>",
  "contractSha256": "<sha256 of src/engine/core/electricalSizingContract.ts>",
  "quantities": [
    {
      "id": "P5-01",
      "name": "...",
      "unit": "kW",
      "case": "G-2",
      "before": 330.0,
      "after": 3.0,
      "delta": -327.0,
      "producer": "src/engine/inverterClustering.ts:...",
      "formula": "...",
      "reproduce": "npx tsx scripts/remediation/verify-phase05.ts --id P5-01",
      "details": {}
    }
  ],
  "coherenceChecks": [
    {
      "id": "C5-01",
      "name": "...",
      "lhs": 0.859773,
      "rhs": 0.859773,
      "delta": 0,
      "pass": true,
      "definition": "..."
    }
  ],
  "nonRegression": {
    "M-A1": { "expected": 1851400, "actual": 1851400, "delta": 0, "pass": true },
    "M-A2": { "expected": 1646827.145773, "actual": 1646827.145773, "delta": 0, "pass": true },
    "M-C1": { "expected": 13.1225, "actual": 13.1225, "delta": 0, "pass": true },
    "M-D1": { "expected": 2.74, "actual": 2.74, "delta": 0, "pass": true },
    "M-F1": { "expected": 499784, "actual": 499784, "delta": 0, "pass": true },
    "M-F4": { "expected": 310202, "actual": 310202, "delta": 0, "pass": true }
  }
}
```

================================================================================
# بخش ۷ — تعریف پایان کار (Definition of Done — DoD)
================================================================================

هر ۱۴ شرط زیر اجباری است و در گزارش پایان باید در جدول بخش ۲ با شاهد دقیق (`file:line` یا خروجی دستور) گزارش شود:

| کد | شرط | شاهد مکانیکی لازم |
|---|---|---|
| **DoD-01** | ایجاد `src/engine/core/electricalSizingContract.ts` بدون هیچ‌گونه استفاده از `any` یا سرکوب خطا | `sha256sum src/engine/core/electricalSizingContract.ts` + بازرسی کد |
| **DoD-02** | اصلاح `evaluateInverterClustering` برای جلوگیری از تخصیص اینورتر صنعتی ۳۳۰ کیلووات به بارهای کوچک مسکونی/کارگاهی (`P5-01`: از `330.0 kW` به `3.0 kW` برای بار `250 W` کیس G-2) | خروجی `npx tsx scripts/remediation/verify-phase05.ts --id P5-01` |
| **DoD-03** | پشتیبانی ناوگان اینورتر و دروازهٔ مسدودکنندهٔ جریان MPPT (`blockingErrors`) در `designPvArray` و کاهش جریان کاری هر کانال MPPT در G-1 از `233.07 A` به `54.84 A <= 65.0 A` (`P5-02`) | خروجی `npx tsx scripts/remediation/verify-phase05.ts --id P5-02` |
| **DoD-04** | هم‌راستاسازی نسبت DC/AC گزارش‌شده در `designPvArray` با ظرفیت ناوگان اینورتر (`P5-03`: از `3.439091` به `0.859773` روی ناوگان ۴ دستگاهی و انطباق با هدف `1.25` در سایزینگ هماهنگ) | خروجی `npx tsx scripts/remediation/verify-phase05.ts --id P5-03` |
| **DoD-05** | اصلاح محاسبهٔ ظرفیت قابل‌استفادهٔ خالص (`usableCapacityKwh`) و درصد پوشش شب (`nightCoveragePct`) در `sizeBatteryBank` با اعمال راندمان رفت‌وبرگشت و ضریب دما (`P5-04`: از `16.3` به `15.2 kWh` و `P5-05`: از `197.6%` به `184.4%`) | خروجی `npx tsx scripts/remediation/verify-phase05.ts --id P5-04` و `--id P5-05` |
| **DoD-06** | حذف گردکردن مضاعف تعداد اینورترها در `designPowerplantBays` (`P5-06`: از `33` به `31` دستگاه در نیروگاه ۱۰ مگاواتی منطبق با کلاسترینگ) و سایزینگ ترانسفورماتور بر اساس توان واقعی اینورترهای بی (`P5-07`: از `1.15 MVA` به `1.52 MVA` در نیروگاه ۱ مگاواتی) | خروجی `npx tsx scripts/remediation/verify-phase05.ts --id P5-06` و `--id P5-07` |
| **DoD-07** | کالیبراسیون نقطهٔ MPP شرایط STC، اصلاح تعداد سلول سری (`75 -> 72`)، حل ریشهٔ دقیق `I(Voc)=0` و اصلاح مساحت در `calculateSingleDiodeCurve` (`P5-08`: از `589.2 W` به `585.0 W` و راندمان از `23.6%` به `22.65%`) | خروجی `npx tsx scripts/remediation/verify-phase05.ts --id P5-08` |
| **DoD-08** | برقراری کامل هر ۶ بررسی انسجام `C5-01` تا `C5-06` (`pass: true`) | خروجی `npx tsx scripts/remediation/verify-phase05.ts` |
| **DoD-09** | عدم رگرسیون کامل روی ۶ لنگر فاز ۱ (`M-A1`, `M-A2`, `M-C1`, `M-D1`, `M-F1`, `M-F4` همگی با `delta: 0`) | بخش `nonRegression` در `phase05-measurements.json` |
| **DoD-10** | جبرگرایی کامل: دو بار اجرای پیاپی `npx tsx scripts/remediation/verify-phase05.ts` باید فایل `phase05-measurements.json` با `sha256sum` یکسان تولید کند | خروجی دو بار اجرای پیاپی و `sha256sum` |
| **DoD-11** | صفر خطای `npm run lint` و عدم افزایش اخطارها نسبت به خط مبنا (`0 errors, 93 warnings`) | خروجی کامل `npm run lint` |
| **DoD-12** | قبولی کامل تمام تست‌های موجود در `npm test` (`196 passed, 0 failed, 0 skipped`)، شامل `E1-ENG-2`, `E8-PV-1`, `E10-BAY-COUNTING`, `E25-BESS-NIGHT-COVERAGE-AND-OFFGRID-WARNING` و `VAL-SANDIA-02` | خروجی کامل `npm test` |
| **DoD-13** | موفقیت کامل `npm run build` با کد خروج صفر | خروجی کامل `npm run build` |
| **DoD-14** | رعایت مطلق مرز فایل‌های مجاز و صفر بایت تغییر روی تمام فایل‌های منجمد فازهای ۱ تا ۴ و فایل‌های ممنوعه | خروجی `git diff --stat bc1a978` و `git status --porcelain` |

================================================================================
# بخش ۸ — مرزهای ممنوعه و «چه نکن»
================================================================================

1. **فایل‌های فازهای ۱، ۲، ۳ و ۴ را لمس نکن:** هیچ‌یک از فایل‌های `scripts/remediation/measure.ts`، `scripts/remediation/fixtures/*.json`، `scripts/remediation/verify-phase02.ts`، `scripts/remediation/verify-phase03.ts`، `scripts/remediation/verify-phase04.ts`، `src/engine/core/solarGeometryContract.ts`، `src/engine/core/annualYieldEngine.ts`، `src/engine/core/physicalLossContract.ts`، `src/engine/equipmentCatalogData.ts` و دایرکتوری‌های `docs/audit/remediation/evidence/phase01..04/` نباید حتی یک بایت تغییر کنند.
2. **`src/App.tsx`، `src/components/**` و `server.ts` را لمس نکن:** اتصال کامپوننت‌های رابط کاربری به قرارداد جدید خارج از دامنهٔ این فاز است.
3. **رفتار پیش‌فرض ۶ آرگومانی `designPvArray` روی `totalPvCapacityKwp`، `totalModulesCount`، `modulesPerString`، `parallelStringsCount` و `effectiveDeratingFactor` را تغییر نده:** لنگرهای `M-A1 = 1851400 kWh` و `M-A2 = 1646827.145773 kWh` و تست `E8-PV-1` به این رفتار وابسته‌اند.
4. **در دروازهٔ میانه متوقف شو:** پس از پیاده‌سازی اولیهٔ `src/engine/core/electricalSizingContract.ts` و اصلاحات اولیهٔ ماژول‌ها، گزارش میانه را طبق قالب `§0.6` ارائه کن و منتظر دستور `APPROVED` ناظر بمان.
