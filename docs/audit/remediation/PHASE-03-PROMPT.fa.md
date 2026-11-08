# پرامپت اجرایی فاز ۳ — سند خودبسنده

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

    # گزارش میانه — فاز ۳
    ## ۱) وضعیت: چند درصد از کار انجام شده
    ## ۲) کارهای انجام‌شده (با file:line)
    ## ۳) اعداد تولیدشده تا این لحظه (جدول: کمیت | مقدار قبل | مقدار بعد | دلتا | دستور بازتولید)
    ## ۴) انحراف از برنامه (اگر هست)
    ## ۵) سؤالات باز / تشدیدها (هر مورد: فایل:خط، چرا لازم است، اثر عدم انجام)
    ## ۶) ریسک‌های باقی‌مانده
    ## ۷) دقیقاً چه کاری را در نیمهٔ دوم انجام می‌دهم
    ## ۸) شواهد خام (خروجی git status --porcelain و دستورهای اجراشده)

## ۰.۷ قالب اجباری «گزارش پایان»

    # گزارش پایان — فاز ۳
    ## ۱) خلاصهٔ یک‌پاراگرافی (بدون صفت، فقط عدد)
    ## ۲) جدول انطباق با DoD (هر شرط: PASS / PARTIAL / FAIL + شاهد file:line یا خروجی)
    ## ۳) جدول «قبل → بعد» (برای هر عدد، پیش‌فرض، امضا: مورد | قبل | بعد | دلتا | دلیل)
    ## ۴) خروجی خام دروازه‌ها (lint / test / build / git diff --stat / git status --porcelain)
    ## ۵) کارهایی که انجام ندادم (و چرا — حداقل ۳ مورد واقعی که دیدی ولی بیرون از دامنه بود)
    ## ۶) مشاهدات خارج از دامنه (فقط ثبت، بدون اقدام — با file:line)
    ## ۷) ریسک‌های باقی‌مانده و اثر عددی تخمینی
    ## ۸) دستور بازتولید کل فاز (کپی-پیست، خط‌به‌خط)

================================================================================
# بخش ۱ — مأموریت فاز ۳: عنوان و صورت مسئله
================================================================================

## ۱.۱ عنوان

**فاز ۳ — موتور واحد تولید انرژی، هم‌گرایی ۵ مسیر موازی و صحت حرارتی (Unified Annual Yield Engine, 5-Path Convergence & Thermal Accuracy)**

## ۱.۲ صورت مسئله

در شواهد منجمد خط مبنای فاز ۱ (`docs/audit/remediation/evidence/phase01/measurements.json`، کامیت `91b9b3b`) و کدهای فعلی موتور، پنج ناسازگاری ساختاری در محاسبهٔ تولید انرژی سالانه، سایزینگ آرایه و افت حرارتی وجود دارد:

1. **پنج مسیر موازی و واگرا برای محاسبهٔ تولید سالانه و ضریب عملکرد (`M-A1` تا `M-A5`, `C-05`, `C-06`):**
   - **مسیر ۱ (`computeWaterfallLosses` در `src/engine/waterfallLossEngine.ts:55-316`):** درخت ۱۴/۱۵ مرحله‌ای تلفات که برای کیس G-1 (`1134.9 kWp`) خروجی `1,851,400 kWh` (`PR = 73.7%` و بازده ویژه `1631 kWh/kWp`) تولید می‌کند (`M-A1`).
   - **مسیر ۲ (`designPvArray` در `src/engine/pvEngineAdvanced.ts:130-160`):** ضریب سادهٔ ۶جزئی (`effectiveDeratingFactor = 0.768966` در نصب زمینی و `0.752281` در بام بتنی) که بهرهٔ ترانسپوزیشن شیب و دووجهی را نادیده می‌گیرد و برای همان کیس G-1 خروجی `1,646,827.145773 kWh` می‌دهد (`M-A2` — **`204,572.85 kWh` یا `-11.05%` اختلاف** با مسیر ۱).
   - **مسیر ۳ (`simulate24hEnergyBalance` در `src/engine/simulation24hEngine.ts:94`):** ضریب هاردکد `0.78` (`totalPvCapacityKwp * peakSunHours * 0.78`) که برای G-1 خروجی `1,670,452 kWh` (زنجیره‌ای) و `1,471,906 kWh` (اسمی `1000 kWp`) تولید می‌کند (`M-A3`).
   - **مسیر ۴ (`performQuickSizing` در `src/engine/solarPvEngine.ts:745, 854`):** در یک تابع واحد از دو ضریب هاردکد متناقض استفاده می‌کند: در خط `745` ضریب `0.75` برای سایزینگ (`req.dailyKwh / (peakSunHours * 0.75)`) و در خط `854` ضریب `0.78` برای تولید سالانه (`actualCapacityKwp * peakSunHours * 365.0 * 0.78`).
   - **مسیر ۵ (واگرایی `C-05` و `C-06` در `measurements.json`):** در نتیجهٔ این چندگانگی، بررسی‌های هم‌خوانی `C-05` (`1,851,400 kWh` در برابر `1,471,899 kWh`، نسبت `1.2578`) و `C-06` (`16,977.60 kWh` در برابر `1,722.12 kWh`، اختلاف نسبی `89.86%`) هر دو در خط مبنای فاز ۱ مردود (`pass: false`) هستند.

2. **کف کاذب ۲۰ ماژوله (`11.7 kWp`) در `designPvArray` و بی‌تفاوتی به بار مصرفی مسکونی (`M-A2`, `M-A6`, `C-06`):**
   - در `src/engine/pvEngineAdvanced.ts:195-210`، `chosenModulesPerString` صرفاً از میانگین پنجرهٔ ولتاژ اینورتر ورودی (`round((minModulesAllowed + upperLimit) / 2) = 20` برای اینورتر نیروگاهی `330 kW / 1500V`) محاسبه می‌شود و سپس `parallelStrings = Math.max(1, Math.ceil(initialTotalModules / chosenModulesPerString))` قرار می‌گیرد.
   - در نتیجه، برای بار مسکونی G-2 (`dailyConsumptionKwh = 3.0 kWh/day` که تنها به `initialTotalModules = 2` ماژول `585W` یعنی `1.17 kWp` نیاز دارد)، `designPvArray` اجباراً یک رشتهٔ ۲۰تایی (`11.7 kWp`، **۱۰ برابر نیاز واقعی**) طراحی می‌کند (`M-A6.details.G2_designCapacityKwp = 11.7` در برابر `G2_quickSizeCapacityKwp = 1.17`).
   - بدتر از آن، به ازای هر بار روزانه در بازهٔ مسکونی/تجاری کوچک (`2.08`, `3.00`, `8.26`, `33.62 kWh/day`)، خروجی `designPvArray` هیچ تغییری نمی‌کند و روی همان `11.7 kWp` (`20` ماژول) قفل می‌ماند!

3. **بیش‌برآورد سیستماتیک افت حرارتی سالانه با استفاده از دمای اوج تابستان به جای دمای میانگین سالانه (`M-C1`, `M-C2`, `M-C4`, `C-07`):**
   - در `src/engine/core/thermalDerate.ts:24-44`، تابع `calculateThermalDerate` تنها `ambientTempMaxC` (مثلاً `39°C` در تهران) را می‌پذیرد و دمای سلول `70.25°C` و افت توان **`13.1225%`** (`M-C1`) برمی‌گرداند.
   - استفاده از `ambientTempMaxC` برای محاسبهٔ حداقل ولتاژ رشته در داغ‌ترین ساعت سال (`Vmp_min_hot` طبق IEC 62548 §7.2) کاملاً صحیح و الزامی است، اما اعمال همان افت `13.1225%` به عنوان افت میانگین ۸۷۶۰ ساعت سال، نسبت به افت حرارتی در دمای میانگین سالانه (`ambientTempAnnualMeanC = 22°C` در تهران -> `cellTemp = 53.25°C` و افت **`8.1925%`** در `M-C2`)، موجب **`4.9300` واحد درصد بیش‌برآورد سیستماتیک افت حرارتی (`M-C4`)** می‌شود.

4. **نبود کران فیزیکی روی تلفات برش توان (`clippingPct`) و اختلاف جمع جبری گردشده در `waterfallLossEngine.ts` (`M-B4`, `C-04`):**
   - در `src/engine/waterfallLossEngine.ts:278`، فرمول `clippingPct = -0.2 - 6.5 * Math.max(0, dcAcRatio - 1.3)` هیچ کران پایینی ندارد و در نسبت‌های DC/AC بزرگ می‌تواند از `-100%` فراتر رود. همچنین در `WaterfallLossReport` مقدار دقیقِ حاصل‌ضرب ترکیبی مراحل (`compoundPerformanceRatioPct`) و توضیح تفاوتِ جمعِ جبریِ گردشده با حاصل‌ضرب ترکیبی (`C-04`) به صورت فیلد صریح در گزارش واترفال صادر نشده است.

================================================================================
# بخش ۲ — محدودهٔ فایل‌ها (ایجاد / ویرایش / ممنوع)
================================================================================

| دسته | مسیر فایل | مجوز و شرح دقیق |
|---|---|---|
| **ایجاد (مجاز)** | `src/engine/core/annualYieldEngine.ts` | ماژول مرجع واحد تولید سالانه، ضریب عملکرد مؤثر (`effectiveYieldFactor`)، ارزیابی دوحالتهٔ حرارتی (`hot_design` در برابر `annual_energy`)، و هم‌گراکنندهٔ مسیرهای تولید و سایزینگ |
| **ایجاد (مجاز)** | `scripts/remediation/verify-phase03.ts` | اسکریپت مستقل راستی‌آزمایی فاز ۳، اجرای کمیت‌های `P3-01` تا `P3-08` و بررسی‌های `C3-01` تا `C3-06` و تولید شواهد JSON |
| **ایجاد (مجاز)** | `docs/audit/remediation/evidence/phase03/phase03-measurements.json` | فایل شواهد عددی فاز ۳ منطبق بر طرح‌وارهٔ §۶ |
| **ویرایش کمینه (مجاز)** | `src/engine/core/thermalDerate.ts` | افزودن فیلدهای اختیاری `ambientTempMeanC?: number` و `evaluationMode?: 'hot_design' | 'annual_energy'` به `ThermalDerateInput` و افزودن فیلدهای `cellTempAnnualMeanC?: number`, `annualMeanDeratePct?: number`, `evaluationMode?: 'hot_design' | 'annual_energy'` به `ThermalDerateResult` + تابع `calculateAnnualThermalDerate` (با حفظ ۱۰۰٪ رفتار پیش‌فرض `'hot_design'` زمانی که `evaluationMode` ارسال نشده است) |
| **ویرایش کمینه (مجاز)** | `src/engine/waterfallLossEngine.ts` | اعمال کران فیزیکی `Math.max(-85.0, ...)` روی `clippingPct` در خط `278` و افزودن فیلدهای اختیاری سازگار `compoundPerformanceRatioPct?: number` و `arithmeticSumLossPct?: number` به `WaterfallLossReport` (حفظ دقیق امضای ۱۶ آرگومانی `WATERFALL_ARG_COUNT = 16`) |
| **ویرایش کمینه (مجاز)** | `src/engine/pvEngineAdvanced.ts` | در `designPvArray`: (۱) تطبیق طول رشته برای بارهای کوچک مسکونی/تجاری (`initialTotalModules < chosenModulesPerString` وقتی `requiredArrayKwp <= 25`) تا کف کاذب ۲۰ ماژوله برطرف شود و ظرفیت نسبت به بار مصرفی اکیداً صعودی گردد؛ (۲) افزودن فیلدهای سازگار `estimatedAnnualYieldKwh?: number` و `specificYieldKwhPerKwp?: number` از طریق `annualYieldEngine.ts` |
| **ویرایش کمینه (مجاز)** | `src/engine/simulation24hEngine.ts` | افزودن پارامتر اختیاری نهم `effectiveSystemDeratingFactor?: number` به `simulate24hEnergyBalance` و اتصال به ضریب مؤثر `annualYieldEngine.ts` (با حفظ کامل بقای بار ساعتی و حالت بدون باتری) |
| **ویرایش کمینه (مجاز)** | `src/engine/solarPvEngine.ts` | فقط در `performQuickSizing` (`:727-895`): یکپارچه‌سازی ضریب سایزینگ و تولید سالانه از طریق `annualYieldEngine.ts` (حذف دوگانگی `0.75` در برابر `0.78`) تا خروجی G-2 با `designPvArray` هم‌گرا شود (`C-06`) |
| **ممنوع (مطلق)** | `scripts/remediation/fixtures/g1..g4.json`<br>`scripts/remediation/measure.ts`<br>`scripts/remediation/import-map.ts`<br>`scripts/remediation/run-phase01.ts`<br>`docs/audit/remediation/evidence/phase01/**`<br>`docs/audit/remediation/phase01-*` | **فایل‌های فاز ۱ کاملاً منجمدند.** صفر بایت تغییر نسبت به کامیت `91b9b3b`. |
| **ممنوع (مطلق)** | `src/engine/core/solarGeometryContract.ts`<br>`scripts/remediation/verify-phase02.ts`<br>`docs/audit/remediation/evidence/phase02/**` | **فایل‌های تحویل‌شدهٔ فاز ۲ کاملاً منجمدند.** صفر بایت تغییر نسبت به کامیت `64e0ede`. |
| **ممنوع (مطلق)** | `server.ts`, `src/App.tsx`, `src/components/**`, `src/engine/financialEngine.ts`, `src/engine/batteryEngine.ts`, `src/engine/inverterClustering.ts`, `src/engine/core/benchmarks/**`, `package.json`, `tsconfig*.json` | هرگونه دیف در این فایل‌ها = رد فوری فاز ۳ |

**دروازهٔ مکانیکی دامنه:**
در پایان فاز، خروجی دستور زیر نسبت به کامیت پایانی فاز ۲ (`64e0ede`) باید **کاملاً خالی** باشد:
`git diff --stat 64e0ede -- scripts/remediation/fixtures/ scripts/remediation/measure.ts scripts/remediation/import-map.ts scripts/remediation/run-phase01.ts scripts/remediation/verify-phase02.ts docs/audit/remediation/evidence/phase01/ docs/audit/remediation/evidence/phase02/ docs/audit/remediation/phase01-formula-spec.fa.md docs/audit/remediation/phase01-baseline-manifest.json src/engine/core/solarGeometryContract.ts server.ts src/App.tsx src/components/ src/engine/financialEngine.ts src/engine/batteryEngine.ts src/engine/inverterClustering.ts src/engine/core/benchmarks/ package.json tsconfig.json`

================================================================================
# بخش ۳ — ورودی‌های یخ‌زده و اعداد خط مبنای فاز ۱
================================================================================

تمام اعداد «قبل» از فایل منجمد `docs/audit/remediation/evidence/phase01/measurements.json` (کامیت `91b9b3b`) خوانده می‌شوند:

| شناسه مرجع فاز ۱ | کمیت | مقدار خط مبنا (قبل از فاز ۳) | واحد | مرجع |
|---|---|---:|---|---|
| **M-A1** | تولید سالانه مسیر اصلی واترفال در G-1 (`1134.9 kWp`) | `1851400` | `kWh` | `measurements.json` (`M-A1.value`) |
| **M-A2 (G-1)** | تولید سالانه مدل `designPvArray` در G-1 (`1134.9 * 5.17 * 0.768966 * 365`) | `1646827.145773` | `kWh` | `measurements.json` (`M-A2.value`) |
| **M-A2 (G-2)** | تولید سالانه مدل `designPvArray` در G-2 مسکونی (`3 kWh/day` -> `20` ماژول = `11.7 kWp`) | `16977.599441` | `kWh` | `measurements.json` (`M-A2.details.G2_ground_mount_kWh`) |
| **M-A3** | تولید سالانه `simulate24hEnergyBalance` در G-1 (`1134.9 kWp` با ضریب هاردکد `0.78`) | `1670452` | `kWh` | `measurements.json` (`M-A3.value`) |
| **M-A4** | تولید سالانه `performQuickSizing` در G-2 مسکونی (`3 kWh/day` -> `2` ماژول = `1.17 kWp`) | `1722.12` | `kWh` | `measurements.json` (`M-A4.value`) |
| **M-A6 (G-2)** | ظرفیت DC طراحی‌شده در `designPvArray` برای G-2 در برابر `performQuickSizing` | `11.7` در برابر `1.17` (`10.0x`) | `kWp` | `measurements.json` (`M-A6.details`) |
| **M-C1** | افت حرارتی در دمای طراحی بیشینهٔ G-1 (`39°C` -> سلول `70.25°C`) | `13.1225` | `%` | `measurements.json` (`M-C1.value`) |
| **M-C2** | افت حرارتی در دمای میانگین سالانهٔ G-1 (`22°C` -> سلول `53.25°C`) | `8.1925` | `%` | `measurements.json` (`M-C2.value`) |
| **M-C4** | بیش‌برآورد افت حرارتی سالانه ناشی از اعمال دمای `39°C` به جای `22°C` | `4.93` | واحد درصد | `measurements.json` (`M-C4.value`) |
| **C-06** | اختلاف نسبی تولید سالانه G-2 بین `designPvArray` و `performQuickSizing` | `0.898565` (`89.86%`, `pass: false`) | بی‌بعد (نسبت) | `measurements.json` (`checks[5]`) |

================================================================================
# بخش ۴ — مشخصات فنی قرارداد و کمیت‌های قبل/بعد فاز ۳
================================================================================

## ۴.۱ طراحی الزامی `src/engine/core/annualYieldEngine.ts`

این ماژول باید به عنوان منبع واحد حقیقت (Single Source of Truth) برای تولید انرژی سالانه، ضریب عملکرد مؤثر و ارزیابی حرارتی عمل کند و توابع و تایپ‌های زیر را صادر نماید:

1. **ارزیابی دوحالتهٔ حرارتی (`calculateAnnualThermalDerate` در `thermalDerate.ts` و بازصادر در `annualYieldEngine.ts`):**
   - `ThermalEvaluationMode = 'hot_design' | 'annual_energy'`
   - در `src/engine/core/thermalDerate.ts`:
     - به `ThermalDerateInput` فیلدهای اختیاری `ambientTempMeanC?: number` و `evaluationMode?: 'hot_design' | 'annual_energy'` اضافه شود.
     - **حفظ سازگاری ۱۰۰٪ عقب‌رو برای تست‌های موجود:** زمانی که `evaluationMode` ارسال نشده یا `'hot_design'` است، `deratePct` و `cellTempHotC` دقیقاً مانند قبل از روی `ambientTempMaxC` محاسبه شوند (مثلاً برای G-1 در `39°C` برابر `70.25°C` و `13.1225%`).
     - زمانی که `evaluationMode === 'annual_energy'` و `ambientTempMeanC` (عدد متناهی) ارسال شده است، دمای سلول مؤثر سالانه از روی `ambientTempMeanC` محاسبه شود (برای G-1 در `22°C` با `NOCT = 45°C` و `gamma = -0.29%/°C` برابر `cellTemp = 53.25°C` و `deratePct = 8.1925%`)، درحالی‌که `cellTempHotC` همچنان در خروجی برای کنترل ایمنی ولتاژ رشته در روز داغ (`Vmp_min_hot`) در دسترس است.
     - تابع صریح `calculateAnnualThermalDerate(input: { module: { noctC?: number; tempCoeffPmpPct: number }; ambientTempMeanC: number; ambientTempMaxC: number; irradianceWm2?: number; installationEnvironment?: InstallationEnvironment })` صادر شود که هم‌زمان `{ hotDesignDeratePct, annualMeanDeratePct, cellTempHotC, cellTempAnnualMeanC, thermalOverestimationPts }` را برگرداند.

2. **تابع مرجع واحد تولید سالانه (`computeCanonicalAnnualYield` در `src/engine/core/annualYieldEngine.ts`):**
   - ورودی `CanonicalAnnualYieldInput`:
     - `installedCapacityKwp: number`
     - `peakSunHours: number`
     - `ambientTempMaxC: number`
     - `ambientTempMeanC?: number`
     - `evaluationMode?: 'hot_design' | 'annual_energy'` (پیش‌فرض `'hot_design'` برای سازگاری با فراخوانی‌های فاقد دمای میانگین، و `'annual_energy'` هنگامی که `ambientTempMeanC` صریحاً برای محاسبهٔ انرژی سالانه داده می‌شود)
     - `soilingLossPct?: number`
     - `dcAcRatio?: number`
     - `hasTracker?: boolean`
     - `snowLossPct?: number`
     - `iamLossPct?: number`
     - `noctC?: number`
     - `tempCoeffPmpPct?: number`
     - `trackerConfig?: TrackerConfig`
     - `installationEnvironment?: InstallationEnvironment`
     - `tiltDeg?: number`
     - `latitudeDeg?: number`
     - `shadingLoss3dPct?: number`
     - `bifacialGainPct?: number`
   - خروجی `CanonicalAnnualYieldResult`:
     - `annualYieldKwh: number` (برابر `waterfallReport.netAnnualEnergyExportMwh * 1000` بدون گردکردن مضاعف)
     - `netAnnualEnergyExportMwh: number`
     - `specificYieldKwhPerKwp: number`
     - `effectiveYieldFactor: number` — نسبت بی‌بعد `annualYieldKwh / (installedCapacityKwp * peakSunHours * 365.0)` که نشان می‌دهد هر کیلووات‌پیک در ازای هر ساعت آفتابی چه کسری از انرژی نامی GHI را به خروجی خالص AC تبدیل می‌کند.
     - `performanceRatioPct: number`
     - `compoundPerformanceRatioPct: number`
     - `thermalDeratePctUsed: number`
     - `clippingLossPctUsed: number`
     - `waterfallReport: WaterfallLossReport`

## ۴.۲ اصلاحات الزامی در مصرف‌کننده‌ها

1. **`src/engine/waterfallLossEngine.ts`:**
   - در خط `278`، تلفات برش توان اینورتر (`clippingPct`) را به کران فیزیکی `[-85.0, -0.2]` محدود کن:
     `const rawClippingPct = -0.2 - 6.5 * Math.max(0, dcAcRatio - 1.3);`
     `const clippingPct = Math.max(-85.0, rawClippingPct);`
     (به این ترتیب برای تمام نسبت‌های معمول `dcAcRatio <= 14.0` از جمله تست `E2-ENG-3` در `1.25..1.40` مقدار دقیقاً یکسان می‌ماند، اما در نسبت‌های حدی هرگز از `-85%` عبور نمی‌کند و انرژی خروجی همواره مثبت می‌ماند).
   - در `WaterfallLossReport` دو فیلد اختیاری `compoundPerformanceRatioPct?: number` (حاصل‌ضرب دقیق مراحل `prod(1 + p_i/100) * 100`) و `arithmeticSumLossPct?: number` اضافه کن.

2. **`src/engine/pvEngineAdvanced.ts` (`designPvArray`):**
   - **الف) رفع کف کاذب ۲۰ ماژوله در بارهای کوچک مسکونی/تجاری (`A-08`, `A-59`, `C-06`):**
     در خطوط `195-210`، پس از محاسبهٔ `initialTotalModules = Math.ceil(requiredArrayKwp / singleModuleKwp)`:
     - اگر `initialTotalModules < chosenModulesPerString` بود:
       - در صورتی که `initialTotalModules >= minModulesAllowed` باشد (یعنی ۱ رشته با تعداد ماژول `initialTotalModules` در پنجرهٔ MPPT اینورتر قرار می‌گیرد)، `chosenModulesPerString = initialTotalModules` و `parallelStrings = 1` قرار گیرد.
       - در صورتی که `initialTotalModules < minModulesAllowed` و بار موردنیاز در مقیاس مسکونی/تجاری کوچک باشد (`requiredArrayKwp <= 25.0` در حالی که اینورتر ورودی بزرگ‌مقیاس است یا `initialTotalModules < minModulesAllowed`)، برای جلوگیری از تحمیل رشتهٔ ۲۰تایی نیروگاهی به سیستم کوچک، `chosenModulesPerString = Math.max(1, initialTotalModules)` و `parallelStrings = 1` تنظیم شود و یک پیام هشدار مهندسی در `warnings` ثبت گردد (مبنی بر اینکه تعداد ماژول موردنیاز کمتر از کف پنجرهٔ MPPT اینورتر ورودی است و سایزینگ بر اساس تعداد ماژول واقعی بار انجام شد).
     - **نتیجهٔ عددی در G-2 (`3.0 kWh/day`):** به جای `20` ماژول (`11.7 kWp` و `16,977.60 kWh/yr`)، تابع `designPvArray` دقیقاً **`2` ماژول (`1.17 kWp` و `1,697.76 kWh/yr`)** برمی‌گرداند!
     - **نتیجهٔ عددی در جاروب بار (`[2.08, 3.0, 8.26, 33.62, 150, 1317] kWh/day`):** تعداد ماژول‌ها به ترتیب `[1, 2, 4, 15, 80, 580]` و ظرفیت‌ها `[0.585, 1.17, 2.34, 8.775, 46.8, 339.3] kWp` (اکیداً صعودی در هر ۶ نقطه) خواهد بود.
   - **ب) افزودن خروجی تولید سالانهٔ کانونیکال به `PvArrayDesignResult`:**
     به اینترفیس `PvArrayDesignResult` فیلدهای سازگار `estimatedAnnualYieldKwh?: number` و `specificYieldKwhPerKwp?: number` (محاسبه‌شده با `computeCanonicalAnnualYield`) اضافه شود تا مصرف‌کنندگان مستقیماً به تولید سالانهٔ استاندارد دسترسی داشته باشند.

3. **`src/engine/solarPvEngine.ts` (`performQuickSizing`، خطوط `727-895`):**
   - دوگانگی ضریب `0.75` (خط `745`) و `0.78` (خط `854`) را حذف کن:
   - برای محاسبهٔ ضریب مؤثر سیستم (`effectiveDeratingFactor`)، از تابع مرجع در `annualYieldEngine.ts` (هم‌تراز با ضریب درتینگ استاندارد ماژول و اقلیم سایت، یعنی `~0.768966` در شرایط تهران G-2) استفاده کن تا هم `requiredArrayKwp = req.dailyKwh / (peakSunHours * effectiveDeratingFactor)` و هم `annualYieldKwh = actualCapacityKwp * peakSunHours * 365.0 * effectiveDeratingFactor` از **یک ضریب واحد و مستند** تولید شوند.
   - **نتیجهٔ عددی در G-2 (`3.0 kWh/day`):** هر دو تابع `designPvArray` و `performQuickSizing` ظرفیت **`1.17 kWp` (`2` ماژول)** و تولید سالانهٔ منطبق (`1,697.76 kWh/yr` با اختلاف `0.00%`، گذر کامل بررسی `C-06`) تولید می‌کنند، و در عین حال LCOE سناریوهای مسکونی/تجاری در محدودهٔ بانکی (`$0.10–$0.25/kWh`) باقی می‌ماند.

4. **`src/engine/simulation24hEngine.ts` (`simulate24hEnergyBalance`):**
   - پارامتر اختیاری نهم `effectiveSystemDeratingFactor?: number` به امضای `simulate24hEnergyBalance` اضافه شود:
     - اگر `effectiveSystemDeratingFactor` (عدد مثبت متناهی) ارسال شد، در خط `94` به جای `0.78` از `effectiveSystemDeratingFactor` استفاده شود (`totalDailyGenerationKwh = D > 0 ? totalPvCapacityKwp * peakSunHours * effectiveSystemDeratingFactor : 0`).
     - به این ترتیب، زمانی که `effectiveYieldFactor` از `computeCanonicalAnnualYield` به `simulate24hEnergyBalance` داده می‌شود، مجموع تولید ساعتی ضربدر ۳۶۵ (`totalGeneration24hKwh * 365`) دقیقاً با `annualYieldKwh` موتور واحد برابر می‌شود (`اختلاف <= 1e-6`).

## ۴.۳ جدول کمیت‌های قبل/بعد که باید اندازه‌گیری شوند (`P3-01` تا `P3-08`)

| ID | کمیت | مقدار قبل (خط مبنای فاز ۱) | شرط پذیرش مقدار بعد | واحد |
|---|---|---:|---|---|
| **P3-01** | `M-A6 (G-2)` ظرفیت طراحی‌شدهٔ `designPvArray` برای کیس مسکونی G-2 (`3.0 kWh/day`) | `11.7` (`20` ماژول) | `1.17` (`2` ماژول، منطبق با `performQuickSizing`) | `kWp` |
| **P3-02** | `C-06` اختلاف نسبی تولید سالانهٔ G-2 بین `designPvArray` و `performQuickSizing` | `0.898565` (`89.86%`) | `<= 0.02` (`<= 2%`، گذر کامل `C-06`) | نسبت بی‌بعد |
| **P3-03** | تعداد مقادیر متمایز ظرفیت `designPvArray` روی آرایهٔ ۶ بار استاندارد `[2.08, 3.0, 8.26, 33.62, 150, 1317] kWh/day` | `3` (چهار بار اول همگی `11.7 kWp`) | `6` (هر ۶ نقطه متمایز و اکیداً صعودی: `0.585 < 1.17 < 2.34 < 8.775 < 46.8 < 339.3`) | تعداد |
| **P3-04** | افت حرارتی سالانهٔ G-1 در حالت `evaluationMode: 'annual_energy'` (`T_mean = 22°C`) در برابر حالت `'hot_design'` (`T_max = 39°C`) | `13.1225` | `8.1925` (`delta = -4.9300` واحد درصد اصلاح بیش‌برآورد حرارتی سالانه) | `%` |
| **P3-05** | تولید سالانهٔ کانونیکال G-1 (`1000 kWp` مستقیم با دووجهی) پس از اصلاح حرارتی به دمای میانگین سالانه (`22°C` به جای `39°C`) | `1631300` | `1723800` (افزایش فیزیکی `+92,500 kWh/yr` یا `+5.67%` در اثر رفع بیش‌برآورد حرارتی) | `kWh` |
| **P3-06** | اختلاف نسبی بین تولید سالانهٔ کانونیکال (`computeCanonicalAnnualYield`) و تولید سالانهٔ ۲۴ ساعته (`simulate24hEnergyBalance * 365`) با ضریب مؤثر هم‌تراز در G-1 | `0.097740` (`9.77%` واگرایی) | `<= 1e-6` (انطباق کامل تولید روزانه و سالانه) | نسبت بی‌بعد |
| **P3-07** | اختلاف درونی ضریب سایزینگ و ضریب تولید در `performQuickSizing` (`|derate_sizing - derate_yield|`) | `0.030000` (`0.75` در برابر `0.78`) | `0.000000` (ضریب واحد در هر دو مرحله) | بی‌بعد |
| **P3-08** | تلفات برش توان (`clippingPct`) در نسبت حدی `dcAcRatio = 20.0` | `-121.75` (غیرفیزیکی `< -100%`) | `>= -85.0` (محدود به کران فیزیکی `-85.0%` با انرژی خروجی مثبت) | `%` |

================================================================================
# بخش ۵ — بررسی‌های انسجام فاز ۳ (`C3-01` تا `C3-06`)
================================================================================

در `scripts/remediation/verify-phase03.ts` این ۶ بررسی مکانیکی را پیاده کن و در `phase03-measurements.json` ثبت نما:

| ID | بررسی | `lhs` | `rhs` | تعریف گذر (`pass`) |
|---|---|---|---|---|
| **C3-01** | **هم‌گرایی سایزینگ و تولید G-2 (`C-06` فاز ۱):** اختلاف نسبی تولید سالانهٔ `designPvArray` و `performQuickSizing` در G-2 (`3.0 kWh/day`) | `genArrayG2` (`kWh`) | `genQuickSizingG2` (`kWh`) | `Math.abs(lhs - rhs) / lhs <= 0.02` |
| **C3-02** | **یکنواختی اکید سایزینگ (`Strict Monotonicity`):** به ازای بارهای `L_1 < L_2 < L_3 < L_4 < L_5 < L_6` در `[2.08, 3.0, 8.26, 33.62, 150, 1317] kWh/day`، ظرفیت `designPvArray` در هر گام اکیداً بزرگ‌تر از گام قبل است | تعداد گام‌های اکیداً صعودی | `5` | `lhs === 5` |
| **C3-03** | **تفکیک دوحالتهٔ حرارتی (`Hot-Design` در برابر `Annual-Energy`):** در G-1، افت حرارتی `'hot_design'` (`39°C`) برابر `13.1225%` و افت `'annual_energy'` (`22°C`) برابر `8.1925%` است | `hotDeratePct - annualDeratePct` | `4.93` | `Math.abs(lhs - rhs) <= 1e-6` |
| **C3-04** | **هم‌خوانی تولید ۲۴ ساعته با موتور سالانهٔ واحد:** در G-1، حاصل‌ضرب `365 * simulate24hEnergyBalance(..., effectiveYieldFactor).totalGeneration24hKwh` برابر `annualYieldKwh` از `computeCanonicalAnnualYield` است | `sim24hAnnualKwh` | `canonicalAnnualKwh` | `Math.abs(lhs - rhs) / rhs <= 1e-6` |
| **C3-05** | **کران فیزیکی تلفات برش توان و یکنواختی:** برای `dcAcRatio` در `[1.25, 1.30, 1.35, 1.40, 2.0, 5.0, 20.0]`، تلفات برش توان غیرافزایشی و همواره در بازهٔ `[-85.0, -0.2]` است و انرژی خروجی مثبت می‌ماند | کمینهٔ `clippingPct` در `dcAcRatio=20` | `-85.0` | `lhs === -85.0` |
| **C3-06** | **حفظ لنگرهای عدم رگرسیون (`M-A1`, `M-C1`, `M-F1`, `M-F4` و `P2-01..P2-04`):** اجرای زندهٔ `measureGroupA/C/F()` روی ورودی‌های پیش‌فرض خط مبنا، مقادیر `M-A1 = 1851400`, `M-C1 = 13.1225`, `M-F1 = 499784`, `M-F4 = 310202` را بدون هیچ انحرافی حفظ می‌کند | بیشینهٔ قدرمطلق دلتای لنگرها | `0` | `lhs === 0` |

================================================================================
# بخش ۶ — خروجی‌های اجباری و طرح‌وارهٔ JSON
================================================================================

| # | خروجی | مسیر |
|---|---|---|
| **D3-1** | ماژول مرجع واحد تولید سالانه و ارزیابی حرارتی | `src/engine/core/annualYieldEngine.ts` |
| **D3-2** | اسکریپت راستی‌آزمایی فاز ۳ | `scripts/remediation/verify-phase03.ts` |
| **D3-3** | فایل شواهد عددی فاز ۳ | `docs/audit/remediation/evidence/phase03/phase03-measurements.json` |
| **D3-4** | گزارش میانه فاز ۳ | در چت |
| **D3-5** | گزارش پایان فاز ۳ | در چت |

طرح‌وارهٔ اجباری `docs/audit/remediation/evidence/phase03/phase03-measurements.json` باید دارای فیلدهای سطح‌بالای زیر باشد:
- `"schema": "solarpv.audit.phase03.v1"`
- `"generatedAtCommit"`: خروجی `git log -n 1 --format=%H -- src/ server.ts` (با fallback ثابت به همان هش کامیت تا اجرای مجدد اسکریپت پس از کامیت، چک‌سام فایل شواهد را تغییر ندهد)
- `"phase01BaselineCommit": "91b9b3b"`
- `"phase02BaselineCommit": "64e0ede"`
- `"phase01HarnessSha256": "732b1074b7436150b58e8054aac5cce2ddd28429f44515b0a1911e8aa58d0ab9"`
- `"phase03VerifierSha256"`: چک‌سام SHA-256 فایل `scripts/remediation/verify-phase03.ts`
- `"quantities"`: آرایهٔ ۸ کمیت `P3-01` تا `P3-08` که هر کدام شامل `{ id, name, before, after, delta, unit, producer, reproduce, verified }` با مقادیر عددی متناهی باشند (مقادیر `before` مستقیماً از فایل منجمد `docs/audit/remediation/evidence/phase01/measurements.json` خوانده شوند و مقادیر `after` از اجرای زندهٔ توابع موتور به دست آیند — بدون هیچ عدد هاردکد طبق H-03).
- `"checks"`: آرایهٔ ۶ بررسی `C3-01` تا `C3-06` که هر کدام شامل `{ id, lhs, rhs, delta, pass }` با مقادیر عددی متناهی و `pass: true` باشند.
- `"nonRegression"`: شیء شامل `M-A1`, `M-C1`, `M-F1`, `M-F4` با `{ before, after, delta: 0 }` که به صورت زنده از `measureGroupA()`, `measureGroupC()`, `measureGroupF()` در `./measure` محاسبه شده‌اند.
- `"gates"`: `{ "lintErrors": 0, "anyWarnings": 93, "testPass": 196, "testFail": 0, "testSkip": 0, "buildExit": 0 }`.

================================================================================
# بخش ۷ — تعریف «انجام‌شده» (DoD) — داوری مکانیکی
================================================================================

| # | شرط | شاهد لازم در گزارش |
|---|---|---|
| **DoD3-01** | فایل‌های `D3-1`، `D3-2` و `D3-3` موجود و معتبرند | `git status` + چک‌سام SHA-256 هر سه فایل |
| **DoD3-02** | کلیهٔ فایل‌های منجمد فاز ۱ و فاز ۲ **صفر بایت تغییر** دارند | خروجی خام و خالی `git diff --stat 64e0ede -- <مسیرهای منجمد §۲>` |
| **DoD3-03** | هیچ فایلی خارج از فهرست مجاز §۲ تغییر نکرده است | خروجی خام `git diff --stat 64e0ede` |
| **DoD3-04** | هر ۸ کمیت `P3-01` تا `P3-08` با مقادیر عددی واقعی `before`, `after`, `delta` (بدون هاردکد) ثبت و تأیید شده‌اند | `phase03-measurements.json` + جدول گزارش |
| **DoD3-05** | هر ۶ بررسی `C3-01` تا `C3-06` وضعیت `pass: true` دارند | خروجی خام `npx tsx scripts/remediation/verify-phase03.ts` |
| **DoD3-06** | اجرای مجدد `npx tsx scripts/remediation/measure.ts --id M-A2` و `--id M-A6` و `--check C-06` روی کد اصلاح‌شده، رفع کف کاذب `11.7 -> 1.17 kWp` و گذر `C-06` (`pass: true`) را به صورت زنده نشان می‌دهد | خروجی خام دستورهای `measure.ts` |
| **DoD3-07** | دو بار اجرای پیاپی `npx tsx scripts/remediation/verify-phase03.ts` خروجی `phase03-measurements.json` **بایت‌به‌بایت یکسان** (`sha256sum` واحد و منطبق با فایل کامیت‌شده در Git) تولید می‌کند و `git status --porcelain` پس از اجرا خالی می‌ماند | خروجی خام `sha256sum` دو اجرا + `git status --porcelain` |
| **DoD3-08** | اجرای مجدد `npx tsx scripts/remediation/verify-phase02.ts` همچنان بدون خطا (`8/8 quantities, 6/6 checks PASS`) اجرا می‌شود و `git status --porcelain` خالی می‌ماند | خروجی خام `verify-phase02.ts` |
| **DoD3-09** | `npm run lint` = ۰ خطا و `anyWarnings <= 93` | خروجی خام |
| **DoD3-10** | `npm test` = ۱۹۶ PASS، ۰ FAIL و ۰ SKIP | خروجی خام |
| **DoD3-11** | `npm run build` = exit 0 | خروجی خام |
| **DoD3-12** | بخش «کارهایی که انجام ندادم» با حداقل ۳ مورد واقعی در گزارش پایان موجود است و تمام تغییرات روی شاخهٔ کاری کامیت و `git push` شده‌اند | بخش ۵ گزارش پایان + `git log -1` |

================================================================================
# بخش ۸ — مرزهای ممنوعهٔ این فاز (تکرار عامدانه)
================================================================================

در این فاز **انجام نمی‌دهی**:
- هیچ تغییری در فایل‌های منجمد فاز ۱ (`measure.ts`, `run-phase01.ts`, `import-map.ts`, `fixtures/*.json`, `evidence/phase01/measurements.json`, `phase01-formula-spec.fa.md`, `phase01-baseline-manifest.json`).
- هیچ تغییری در فایل‌های منجمد فاز ۲ (`src/engine/core/solarGeometryContract.ts`, `scripts/remediation/verify-phase02.ts`, `docs/audit/remediation/evidence/phase02/phase02-measurements.json`).
- هیچ تغییری در `server.ts`, `src/App.tsx`, `src/components/**`, `src/engine/financialEngine.ts`, `src/engine/batteryEngine.ts`, `src/engine/inverterClustering.ts`, یا `src/engine/core/benchmarks/**`.
- هیچ تغییری در رفتار پیش‌فرض `'hot_design'` در `calculateThermalDerate` و `computeWaterfallLosses` هنگامی که `evaluationMode` ارسال نشده است (تا تمام ۱۹۶ تست موجود و لنگرهای `M-A1`, `M-C1`, `M-F1`, `M-F4` بدون تغییر تلورانس سبز بمانند).
- هیچ عدد هاردکدی در `verify-phase03.ts` (تمام مقادیر `before` باید از `measurements.json` فاز ۱ خوانده شوند و تمام مقادیر `after` باید از اجرای زندهٔ توابع موتور و `measureGroupA/C/F()` محاسبه شوند).

پس از مطالعهٔ فایل‌ها و ارسال «پیام آغاز (§۰.۵)»، نیمهٔ اول کار را انجام بده، روی شاخهٔ کاری کامیت و `git push` کن، **«گزارش میانه — فاز ۳ (§۰.۶)»** را بفرست و در دروازهٔ میانه **کاملاً متوقف شو** تا مجوز ناظر صادر گردد.
