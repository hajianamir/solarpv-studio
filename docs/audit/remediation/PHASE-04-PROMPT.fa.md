# پرامپت اجرایی فاز ۴ — سند خودبسنده

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

    # گزارش میانه — فاز ۴
    ## ۱) وضعیت: چند درصد از کار انجام شده
    ## ۲) کارهای انجام‌شده (با file:line)
    ## ۳) اعداد تولیدشده تا این لحظه (جدول: کمیت | مقدار قبل | مقدار بعد | دلتا | دستور بازتولید)
    ## ۴) انحراف از برنامه (اگر هست)
    ## ۵) سؤالات باز / تشدیدها (هر مورد: فایل:خط، چرا لازم است، اثر عدم انجام)
    ## ۶) ریسک‌های باقی‌مانده
    ## ۷) دقیقاً چه کاری را در نیمهٔ دوم انجام می‌دهم
    ## ۸) شواهد خام (خروجی git status --porcelain و دستورهای اجراشده)

## ۰.۷ قالب اجباری «گزارش پایان»

    # گزارش پایان — فاز ۴
    ## ۱) خلاصهٔ یک‌پاراگرافی (بدون صفت، فقط عدد)
    ## ۲) جدول انطباق با DoD (هر شرط: PASS / PARTIAL / FAIL + شاهد file:line یا خروجی)
    ## ۳) جدول «قبل → بعد» (برای هر عدد، پیش‌فرض، امضا: مورد | قبل | بعد | دلتا | دلیل)
    ## ۴) خروجی خام دروازه‌ها (lint / test / build / git diff --stat / git status --porcelain)
    ## ۵) کارهایی که انجام ندادم (و چرا — حداقل ۳ مورد واقعی که دیدی ولی بیرون از دامنه بود)
    ## ۶) مشاهدات خارج از دامنه (فقط ثبت، بدون اقدام — با file:line)
    ## ۷) ریسک‌های باقی‌مانده و اثر عددی تخمینی
    ## ۸) دستور بازتولید کل فاز (کپی-پیست، خط‌به‌خط)

================================================================================
# بخش ۱ — مأموریت فاز ۴: عنوان و صورت مسئله
================================================================================

## ۱.۱ عنوان

**فاز ۴ — یکپارچگی مدل‌های افت فیزیکی: بهرهٔ دووجهی ۲بعدی، تلفات اپتیکی زاویه‌وابسته (IAM)، برف، گردوغبار و NOCT کاتالوگ (Physical Loss Model Integrity: 2D Bifacial View-Factor, Angle-Dependent IAM, Snow, Soiling & Catalog NOCT)**

## ۱.۲ صورت مسئله

در شواهد منجمد خط مبنای فاز ۱ (`docs/audit/remediation/evidence/phase01/measurements.json`، کامیت `91b9b3b`) و کدهای فعلی، چهار شکاف فنی میان موتورهای فیزیکی موجود در مخزن و زنجیرهٔ محاسبهٔ تلفات واترفال و تولید انرژی وجود دارد:

1. **کم‌برآورد ۳ برابری بهرهٔ دووجهی با پروکسی خطی در برابر مدل ۲بعدی ضریب دید و اشباع بی‌صدای سقف `15%` (`M-D1` تا `M-D4`):**
   - در `src/engine/bifacialGain.ts:25-45`، تابع `rearGainFraction` صرفاً از رابطهٔ غربالگری خطی `bf * gcr * albedo * 0.45` (با کلمپ `[0, 0.15]`) استفاده می‌کند که برای کیس G-1 (`bf = 0.80, gcr = 0.38, albedo = 0.20`) مقدار **`2.74%`** (`M-D1`) و در `albedo = 0.25` مقدار **`3.42%`** برمی‌گرداند.
   - در همان مخزن، موتور فیزیکی ۱۰ برشی ضریب دید Hottel (`calculateBifacialViewFactor` در `src/engine/bifacial/bifacial2dViewFactor.ts:100-220`) برای همان آرایه (`tiltDeg = 31, azimuthDeg = 180, pitchM = 2.278 / 0.38, collectorWidthM = 2.278, groundClearanceM = 1.2, rowLengthM = 50, sliceCount = 10` و تابش `ghi = 800, dni = 700, dhi = 150, frontPoa = 850, solarZenith = 35°, solarAzimuth = 180°`) بهرهٔ واقعی **`8.31%`** در `albedo = 0.20` (`M-D2` — نسبت **`3.032847x`** در `M-D3`) و **`10.19%`** در `albedo = 0.25` (`M-D4` — نسبت **`2.979532x`**) محاسبه می‌کند، اما هیچ ارتباطی میان `bifacialGain.ts` / `waterfallArgs.ts` و `calculateBifacialViewFactor` برقرار نیست.
   - افزون بر این، در سایت‌های پرآلبیدو (مثلاً برف با `bf = 1.0, gcr = 0.90, albedo = 0.90` که مقدار خام `36.45%` تولید می‌کند)، `rearGainFraction` بدون هیچ پرچم تشخیص اشباع (`isClampedAt15Pct`) یا گزارش مقدار پیش از کلمپ (`unclampedGainPct`)، خروجی را بی‌صدا روی `15.0%` می‌برد.

2. **ثابت‌های هاردکد `iamLossPct = -2.2%`، `snowLossPct = 0.0%` و `soilingLossPct = 4.5%` در `waterfallArgs.ts` و قطع ارتباط با موتورهای فیزیکی (`iamEngine.ts`, `marionSnowEngine.ts`, `kimberSoilingEngine.ts`):**
   - در `src/engine/optical/iamEngine.ts:228-292`، تابع `calculateEffectivePoaIam` تلفات بازتاب فرنل و پوشش ضدبازتاب (Martin & Ruiz 2001 کوپل‌شده با دمای سلول و زوایای معادل Brandemuehl & Beckman برای تابش پخش آسمان و بازتاب زمین) را به صورت دقیق محاسبه می‌کند (مثلاً در زاویهٔ تابش مایل `65°` تلفات برابر **`7.20%`** یعنی `-7.20%` است، نه `-2.20%` ثابت!).
   - در `src/engine/snow/marionSnowEngine.ts:172-233`، تابع `simulateAnnualSnowShedding` تلفات پوشش و سدشدگی برف (Marion 2013) را بر اساس شیب آرایه و ارتفاع پایه از زمین شبیه‌سازی می‌کند (مثلاً در زمستان برفی، کاهش شیب از `30°` به `10°` تلفات برف سالانه را از **`0.56%`** با ریسک سدشدگی `NONE` به **`9.09%`** با ریسک سدشدگی `SEVERE` می‌رساند)، اما در `waterfallArgs.ts:121` مقدار برف همیشه `0.0%` است.
   - در `src/engine/soiling/kimberSoilingEngine.ts:102-215`، تابع `simulateAnnualSoiling` اثر نرخ نشست روزانه، بارش‌های ۵بازهٔ Kimber و دورهٔ شست‌وشوی دستی (`scheduledWashIntervalDays`) را در ۳۶۵ روز سال محاسبه می‌کند (مثلاً برای نرخ `0.15%/day` و سقف `25%`، شست‌وشوی ۳۰ روزه تلفات میانگین سالانه را از **`19.33%`** به **`2.15%`** کاهش می‌دهد)، اما هیچ واسط استانداردی برای تزریق خروجی آن به `buildWaterfallArgs` وجود ندارد.

3. **فقدان کامل فیلد `noctC` در تمام ۲۵ ماژول کاتالوگ تجهیزات (`M-C3`):**
   - در `src/engine/equipmentCatalogData.ts:3-21` و `CATALOG_MODULES` (`:125-185`)، هیچ‌یک از ۲۵ ماژول کاتالوگ دارای فیلد `noctC` نیستند (`0` از `25` ماژول!). در نتیجه، همان‌گونه که در `M-C3` (`measurements.json` فاز ۱) ثبت شده است، کلیهٔ محاسبات حرارتی روی مقدار fallback ثابت `45.0°C` سقوط می‌کنند و تفاوت حرارتی فناوری‌های `HJT Bifacial` (`44.0°C`)، `ABC Back-Contact` (`44.0°C`) و `P-Type PERC` / `N-Type TOPCon` در کاتالوگ و در `catalogAdapters.ts` نادیده گرفته می‌شود.

================================================================================
# بخش ۲ — محدودهٔ فایل‌ها (ایجاد / ویرایش / ممنوع)
================================================================================

| دسته | مسیر فایل | مجوز و شرح دقیق |
|---|---|---|
| **ایجاد (مجاز)** | `src/engine/core/physicalLossContract.ts` | ماژول مرجع یکپارچه‌سازی مدل‌های افت فیزیکی (`evaluatePhysicalLossModels`, `evaluatePhysicalBifacialGain`, `evaluatePhysicalIamLoss`, `evaluatePhysicalSnowLoss`, `evaluatePhysicalSoilingLoss`, `buildStandardWinterSnowProfile`) |
| **ایجاد (مجاز)** | `scripts/remediation/verify-phase04.ts` | اسکریپت مستقل راستی‌آزمایی فاز ۴، اجرای کمیت‌های `P4-01` تا `P4-08` و بررسی‌های `C4-01` تا `C4-06` و تولید شواهد JSON |
| **ایجاد (مجاز)** | `docs/audit/remediation/evidence/phase04/phase04-measurements.json` | فایل شواهد عددی فاز ۴ منطبق بر طرح‌وارهٔ §۶ |
| **ویرایش کمینه (مجاز)** | `src/engine/bifacialGain.ts` | افزودن فیلدهای اختیاری `modelMode?: 'screening_proxy' | 'view_factor_2d'`، `tiltDeg?: number`، `collectorWidthM?: number`، `groundClearanceM?: number`، `rowLengthM?: number` و تابش مرجع به `BifacialGainInput` + افزودن تابع `evaluateBifacialGainWithDiagnostics` (با حفظ ۱۰۰٪ رفتار پیش‌فرض `'screening_proxy'` هنگامی که `modelMode` ارسال نشده تا تست `E14` و لنگر `M-D1` دقیقاً حفظ شوند) |
| **ویرایش کمینه (مجاز)** | `src/engine/equipmentCatalogData.ts` | افزودن فیلد `noctC?: number` به `CatalogPvModule`، مقداردهی `noctC` معتبر دیتاشیتی برای هر ۲۵ ماژول `CATALOG_MODULES` (با حفظ `noctC: 45.0` برای `mod-jinko-585` جهت حفظ لنگرهای G-1)، و افزودن تابع `resolveModuleNoctC` |
| **ویرایش کمینه (مجاز)** | `src/engine/types/equipmentTypes.ts` | افزودن فیلدهای اختیاری `noctC?: number` و `tempCoeffPmpPct?: number` به اینترفیس `PvModule` |
| **ویرایش کمینه (مجاز)** | `src/engine/catalogAdapters.ts` | انتقال `noctC` و `tempCoeffPmpPct` در تابع `catalogModuleToEngine` از `CatalogPvModule` به `PvModule` |
| **ویرایش کمینه (مجاز)** | `src/engine/waterfallArgs.ts` | افزودن فیلد اختیاری `physicalLossConfig?: PhysicalLossEvaluationInput` به `WaterfallArgsInput` و پشتیبانی از آن در `buildWaterfallArgs` (با حفظ کامل `WATERFALL_ARG_COUNT = 16` و رفتار پیش‌فرض برای تمام فراخوانی‌های فاقد `physicalLossConfig` جهت حفظ تست `E18`) |
| **ممنوع (مطلق)** | `scripts/remediation/fixtures/g1..g4.json`<br>`scripts/remediation/measure.ts`<br>`scripts/remediation/import-map.ts`<br>`scripts/remediation/run-phase01.ts`<br>`docs/audit/remediation/evidence/phase01/**`<br>`docs/audit/remediation/phase01-*` | **فایل‌های فاز ۱ کاملاً منجمدند.** صفر بایت تغییر نسبت به کامیت `91b9b3b`. |
| **ممنوع (مطلق)** | `src/engine/core/solarGeometryContract.ts`<br>`scripts/remediation/verify-phase02.ts`<br>`docs/audit/remediation/evidence/phase02/**` | **فایل‌های فاز ۲ کاملاً منجمدند.** صفر بایت تغییر نسبت به کامیت `64e0ede`. |
| **ممنوع (مطلق)** | `src/engine/core/annualYieldEngine.ts`<br>`src/engine/core/thermalDerate.ts`<br>`src/engine/waterfallLossEngine.ts`<br>`src/engine/pvEngineAdvanced.ts`<br>`src/engine/simulation24hEngine.ts`<br>`src/engine/solarPvEngine.ts`<br>`scripts/remediation/verify-phase03.ts`<br>`docs/audit/remediation/evidence/phase03/**` | **فایل‌های فاز ۳ کاملاً منجمدند.** صفر بایت تغییر نسبت به کامیت `7c4d55c`. |
| **ممنوع (مطلق)** | `src/engine/bifacial/bifacial2dViewFactor.ts`, `src/engine/optical/iamEngine.ts`, `src/engine/snow/marionSnowEngine.ts`, `src/engine/soiling/kimberSoilingEngine.ts`, `server.ts`, `src/App.tsx`, `src/components/**`, `src/engine/financialEngine.ts`, `src/engine/batteryEngine.ts`, `src/engine/inverterClustering.ts`, `src/engine/core/benchmarks/**`, `package.json`, `tsconfig*.json` | هرگونه دیف در این فایل‌ها = رد فوری فاز ۴ |

**دروازهٔ مکانیکی دامنه:**
در پایان فاز، خروجی دستور زیر نسبت به کامیت پایانی فاز ۳ (`7c4d55c`) باید **کاملاً خالی** باشد:
`git diff --stat 7c4d55c -- scripts/remediation/fixtures/ scripts/remediation/measure.ts scripts/remediation/import-map.ts scripts/remediation/run-phase01.ts scripts/remediation/verify-phase02.ts scripts/remediation/verify-phase03.ts docs/audit/remediation/evidence/phase01/ docs/audit/remediation/evidence/phase02/ docs/audit/remediation/evidence/phase03/ docs/audit/remediation/phase01-formula-spec.fa.md docs/audit/remediation/phase01-baseline-manifest.json src/engine/core/solarGeometryContract.ts src/engine/core/annualYieldEngine.ts src/engine/core/thermalDerate.ts src/engine/waterfallLossEngine.ts src/engine/pvEngineAdvanced.ts src/engine/simulation24hEngine.ts src/engine/solarPvEngine.ts src/engine/bifacial/bifacial2dViewFactor.ts src/engine/optical/iamEngine.ts src/engine/snow/marionSnowEngine.ts src/engine/soiling/kimberSoilingEngine.ts server.ts src/App.tsx src/components/ src/engine/financialEngine.ts src/engine/batteryEngine.ts src/engine/inverterClustering.ts src/engine/core/benchmarks/ package.json tsconfig.json`

================================================================================
# بخش ۳ — ورودی‌های یخ‌زده و اعداد خط مبنای فاز ۱ و فاز ۳
================================================================================

تمام اعداد «قبل» از فایل‌های منجمد `docs/audit/remediation/evidence/phase01/measurements.json` (کامیت `91b9b3b`) و `docs/audit/remediation/evidence/phase03/phase03-measurements.json` (کامیت `7c4d55c`) خوانده می‌شوند:

| شناسه مرجع | کمیت | مقدار خط مبنا (قبل از فاز ۴) | واحد | مرجع |
|---|---|---:|---|---|
| **M-D1** | بهرهٔ دووجهی مسیر سیم‌کشی‌شده (پروکسی خطی) در `albedo = 0.20, bf = 0.80, gcr = 0.38` | `2.74` | `%` | `phase01/measurements.json` (`M-D1.value`) |
| **M-D2** | بهرهٔ دووجهی مدل ۲بعدی ضریب دید در `albedo = 0.20, bf = 0.80, gcr = 0.38` | `8.31` | `%` | `phase01/measurements.json` (`M-D2.value`) |
| **M-D3** | نسبت بهرهٔ مدل ۲بعدی ضریب دید به پروکسی خطی در `albedo = 0.20` | `3.032847` | `ratio` | `phase01/measurements.json` (`M-D3.value`) |
| **M-D4** | نسبت بهرهٔ مدل ۲بعدی ضریب دید (`10.19%`) به پروکسی خطی (`3.42%`) در `albedo = 0.25` | `2.979532` | `ratio` | `phase01/measurements.json` (`M-D4.value`) |
| **M-C3** | دمای NOCT ماژول در G-1 و تعداد ماژول‌های دارای `noctC` در `CATALOG_MODULES` | `45.0` (`0` از `25` ماژول دارای `noctC`) | `°C` | `phase01/measurements.json` (`M-C3`) |
| **P3-05** | تولید سالانهٔ کانونیکال G-1 (`1000 kWp` در `22°C`) با بهرهٔ دووجهی پروکسی `2.74%` | `1723332` | `kWh` | `phase03/phase03-measurements.json` (`P3-05.after`) |

================================================================================
# بخش ۴ — مشخصات فنی قرارداد و کمیت‌های قبل/بعد فاز ۴
================================================================================

## ۴.۱ طراحی الزامی `src/engine/core/physicalLossContract.ts` و ویرایش‌های مجاز

1. **تکمیل `noctC` در کاتالوگ تجهیزات (`src/engine/equipmentCatalogData.ts`, `src/engine/types/equipmentTypes.ts`, `src/engine/catalogAdapters.ts`):**
   - در `src/engine/equipmentCatalogData.ts`:
     - فیلد اختیاری `noctC?: number` را به اینترفیس `CatalogPvModule` اضافه کن.
     - برای تمام ۲۵ ماژول موجود در `CATALOG_MODULES`، مقدار دقیق دیتاشیتی `noctC` را بر اساس فناوری سلول درج کن:
       - برای `mod-jinko-585` و سایر ماژول‌های `N-Type TOPCon` استاندارد: `noctC: 45.0` (تا لنگرهای G-1 بدون تغییر بمانند).
       - برای ماژول‌های `HJT Bifacial` (مانند `mod-risen-700`) و `ABC Back-Contact` (مانند `mod-longi-660`, `mod-aiko-620`): `noctC: 44.0`.
       - برای ماژول‌های `P-Type PERC` (مانند `mod-longi-550`, `mod-canadian-670`, `mod-iran-saba-550`, `mod-iran-taban-550`): `noctC: 45.0`.
     - تابع `resolveModuleNoctC(mod?: { noctC?: number; cellType?: string } | null): { noctC: number; isFallback: boolean }` را صادر کن که اگر `mod?.noctC` عدد متناهی مثبت در بازهٔ `[35, 55]` بود `{ noctC: mod.noctC, isFallback: false }` و در غیر این صورت بر اساس `cellType` (`HJT` یا `ABC` -> `44.0`، سایر -> `45.0`) همراه با `isFallback: true` برگرداند.
   - در `src/engine/types/equipmentTypes.ts`: فیلدهای اختیاری `noctC?: number` و `tempCoeffPmpPct?: number` را به `PvModule` اضافه کن.
   - در `src/engine/catalogAdapters.ts`: در `catalogModuleToEngine(m)`، فیلدهای `noctC: m.noctC ?? 45.0` و `tempCoeffPmpPct: m.tempCoeffPmpPct` را نیز روی شیء خروجی قرار بده.

2. **اتصال مدل ۲بعدی ضریب دید و تشخیص اشباع در `src/engine/bifacialGain.ts`:**
   - به `BifacialGainInput` فیلدهای اختیاری زیر را اضافه کن:
     - `modelMode?: 'screening_proxy' | 'view_factor_2d'` (پیش‌فرض `'screening_proxy'` برای حفظ ۱۰۰٪ سازگاری عقب‌رو با تست `E14` و `M-D1`)
     - `tiltDeg?: number` (پیش‌فرض `31`)
     - `azimuthDeg?: number` (پیش‌فرض `180`)
     - `collectorWidthM?: number` (پیش‌فرض `2.278`)
     - `groundClearanceM?: number` (پیش‌فرض `1.2`)
     - `rowLengthM?: number` (پیش‌فرض `50`)
     - `sliceCount?: number` (پیش‌فرض `10`)
     - `ghiWm2?: number` (پیش‌فرض `800`)
     - `dniWm2?: number` (پیش‌فرض `700`)
     - `dhiWm2?: number` (پیش‌فرض `150`)
     - `frontPoaWm2?: number` (پیش‌فرض `850`)
     - `solarZenithDeg?: number` (پیش‌فرض `35`)
     - `solarAzimuthDeg?: number` (پیش‌فرض `180`)
   - زمانی که `input.modelMode === 'view_factor_2d'` باشد، `rearGainFraction` و `rearGainPercent` باید از `calculateBifacialViewFactor` در `src/engine/bifacial/bifacial2dViewFactor.ts` استفاده کنند (با `pitchM = collectorWidthM / gcr`) و کسر بهره را در بازهٔ `[0, 0.25]` برگردانند (که در `albedo = 0.20` دقیقاً `8.31%` یعنی `0.0831` و در `albedo = 0.25` دقیقاً `10.19%` یعنی `0.1019` تولید می‌کند).
   - تابع تشخیصی `evaluateBifacialGainWithDiagnostics(input: BifacialGainInput)` را صادر کن که شیء `{ gainFraction, gainPct, unclampedGainPct, isClampedAt15Pct, clampedExcessPct, modelUsed }` را برگرداند. در حالت `'screening_proxy'`، `unclampedGainPct = Number((bf * gcr * albedo * 0.45 * 100.0).toFixed(4))` است و اگر `unclampedGainPct > 15.0` باشد، `isClampedAt15Pct = true` و `clampedExcessPct = Number((unclampedGainPct - 15.0).toFixed(4))` خواهد بود (برای `bf=1.0, gcr=0.90, albedo=0.90` برابر `36.45 - 15.0 = 21.45` واحد درصد).

3. **ماژول مرجع `src/engine/core/physicalLossContract.ts` (`D4-1`):**
   - این ماژول باید توابع زیر را صادر کند:
     - `evaluatePhysicalBifacialGain(input: BifacialGainInput)` -> فراخوانی مدل ۲بعدی ضریب دید (`modelMode: input.modelMode ?? 'view_factor_2d'`) از `bifacialGain.ts`.
     - `evaluatePhysicalIamLoss(input: { beamPoaWm2?: number; skyDiffusePoaWm2?: number; groundReflectedPoaWm2?: number; solarZenithDeg: number; tiltDeg: number; cellTemperatureC?: number; arCoatingFactor?: number }): { iamLossPct: number; iamPoaEffective: number; details: EffectivePoaTransmissionResult }` -> فراخوانی `calculateEffectivePoaIam` از `src/engine/optical/iamEngine.ts` و برگرداندن `iamLossPct = -Math.abs(res.effectiveTransmissionLossPercent)`.
     - `buildStandardWinterSnowProfile(params?: { winterHours?: number; stormIntervalHours?: number; stormDurationHours?: number; stormSnowfallCm?: number; winterGroundSnowCm?: number }): HourlySnowWeatherStep[]` -> تولید پروفایل قطعی ۸۷۶۰ ساعتهٔ زمستان برفی که به طور پیش‌فرض برای ساعات `1..1440` دمای `-2.0 + 5.0 * Math.sin((h / 24) * 2 * Math.PI)`، بارش برف `5.0 cm` در ساعات `h % 96 === 1 || h % 96 === 2` و `accumulatedGroundSnowCm = 25.0 cm` (و برای ساعات `1441..8760` دمای `18.0°C` و برف `0`) تولید می‌کند.
     - `evaluatePhysicalSnowLoss(config: Partial<SnowSheddingConfig>, weatherHourly?: HourlySnowWeatherStep[]): SnowSheddingSummaryResult` -> فراخوانی `simulateAnnualSnowShedding` از `src/engine/snow/marionSnowEngine.ts`.
     - `evaluatePhysicalSoilingLoss(config: Partial<SoilingConfig>, weatherDaily?: DailyWeatherSoilingStep[]): SoilingSimulationResult` -> فراخوانی `simulateAnnualSoiling` از `src/engine/soiling/kimberSoilingEngine.ts`.
     - `evaluatePhysicalLossModels(input: PhysicalLossEvaluationInput): PhysicalLossEvaluationResult` -> تجمیع هر ۵ مؤلفه (`bifacialGainPct`, `iamLossPct`, `snowLossPct`, `soilingLossPct`, `noctC`) در یک خروجی واحد و مستند.

4. **اتصال اختیاری به `src/engine/waterfallArgs.ts`:**
   - به `WaterfallArgsInput` فیلد اختیاری `physicalLossConfig?: PhysicalLossEvaluationInput` اضافه کن.
   - در `buildWaterfallArgs(i)`، اگر `i.physicalLossConfig` ارسال شده بود، خروجی `evaluatePhysicalLossModels(i.physicalLossConfig)` را محاسبه کن و از مقادیر فیزیکی آن به عنوان پیش‌فرض برای `soilingLossPct`، `snowLossPct`، `iamLossPct`، `noctC` و `bifacialGainPct` در تاپل ۱۶ آرگومانی استفاده نما (در حالی که اگر `i.physicalLossConfig` ارسال نشده باشد، رفتار `buildWaterfallArgs` ۱۰۰٪ بدون تغییر باقی می‌ماند).

## ۴.۲ جدول کمیت‌های قبل/بعد که باید اندازه‌گیری شوند (`P4-01` تا `P4-08`)

| ID | کمیت | مقدار قبل (خط مبنای فاز ۱/۳) | شرط پذیرش مقدار بعد | واحد |
|---|---|---:|---|---|
| **P4-01** | بهرهٔ دووجهی G-1 در `albedo = 0.20, bf = 0.80, gcr = 0.38` پس از ارتقا از پروکسی خطی (`M-D1`) به مدل ۲بعدی ضریب دید (`M-D2`) | `2.74` | `8.31` (`delta = +5.57`) | `%` |
| **P4-02** | بهرهٔ دووجهی در `albedo = 0.25, bf = 0.80, gcr = 0.38` پس از ارتقا از پروکسی خطی به مدل ۲بعدی ضریب دید (`M-D4`) | `3.42` | `10.19` (`delta = +6.77`) | `%` |
| **P4-03** | تعداد ماژول‌های دارای فیلد معتبر `noctC` در `CATALOG_MODULES` (`M-C3`) | `0` | `25` (`delta = +25`، پوشش ۱۰۰٪ کاتالوگ) | `modules` |
| **P4-04** | تلفات اپتیکی زاویهٔ تابش (`iamLossPct`) در زاویهٔ فرود مایل (`solarZenithDeg = 65°, tiltDeg = 30°, T_cell = 53.25°C`) در برابر ثابت هاردکد | `-2.2` | `-7.2` (`delta = -5.0`) | `%` |
| **P4-05** | تلفات سالانهٔ پوشش و سدشدگی برف (`snowLossPct`) برای شیب کم (`tiltDeg = 10°, clearance = 0.80m`) در پروفایل استاندارد زمستان برفی در برابر ثابت صفر | `0` | `9.09` (`delta = +9.09`) | `%` |
| **P4-06** | تلفات سالانهٔ گردوغبار Kimber (`soilingLossPct`) در رژیم خشک (`0.15%/day`, سقف `25%`) با شست‌وشوی ۳۰ روزه در برابر بدون شست‌وشو | `19.33` | `2.15` (`delta = -17.18`) | `%` |
| **P4-07** | تولید سالانهٔ کانونیکال G-1 (`1000 kWp` در `22°C`, `P3-05`) پس از جایگزینی بهرهٔ دووجهی پروکسی (`2.74%`) با مدل ۲بعدی ضریب دید (`8.31%`) | `1723332` | `1816762` (`delta = +93430`) | `kWh` |
| **P4-08** | مقدار اشباع تشخیص‌داده‌شدهٔ سقف ۱۵٪ (`clampedExcessPct`) در `evaluateBifacialGainWithDiagnostics` برای سایت پرآلبیدو (`bf = 1.0, gcr = 0.90, albedo = 0.90`) | `0` | `21.45` (`36.45 - 15.00 = 21.45`, `delta = +21.45`) | `percentage points` |

================================================================================
# بخش ۵ — بررسی‌های انسجام فاز ۴ (`C4-01` تا `C4-06`)
================================================================================

در `scripts/remediation/verify-phase04.ts` این ۶ بررسی مکانیکی را پیاده کن و در `phase04-measurements.json` ثبت نما:

| ID | بررسی | `lhs` | `rhs` | تعریف گذر (`pass`) |
|---|---|---|---|---|
| **C4-01** | **انطباق بهرهٔ دووجهی ۲بعدی با لنگر `M-D2` فاز ۱:** خروجی `rearGainPercent` در حالت `modelMode: 'view_factor_2d'` برای G-1 (`albedo = 0.20`) دقیقاً برابر `M-D2.value` (`8.31%`) است | `vfGainG1Pct` (`8.31`) | `M-D2.value` (`8.31`) | `Math.abs(lhs - rhs) <= 1e-6` |
| **C4-02** | **پوشش ۱۰۰٪ فیلد `noctC` در کاتالوگ و آداپتور (`M-C3`):** تمام ماژول‌های `CATALOG_MODULES` و `ENGINE_DEFAULT_MODULES` دارای `noctC` متناهی در بازهٔ `[40, 50] °C` هستند و ماژول اول (`mod-jinko-585`) دارای `noctC === 45` است | تعداد ماژول‌های معتبر | `CATALOG_MODULES.length` (`25`) | `lhs === rhs && CATALOG_MODULES[0].noctC === 45` |
| **C4-03** | **یکنواختی فیزیکی تلفات اپتیکی IAM نسبت به زاویهٔ تابش (`0° < 35° < 65°`):** قدرمطلق تلفات انتقال اپتیکی در `65°` (`7.20%`) بیش از `35°` (`2.00%`) و در `35°` بیش از `0°` است | `loss65Pct - loss35Pct` (`5.2`) | `5.2` | `Math.abs(lhs - rhs) <= 1e-4 && loss0Pct < loss35Pct && loss35Pct < loss65Pct` |
| **C4-04** | **حساسیت فیزیکی تلفات برف Marion به زاویهٔ شیب (`10°` در برابر `30°`):** در پروفایل زمستان برفی استاندارد، تلفات برف سالانه در شیب `10°` (`9.09%`) اکیداً بزرگ‌تر از شیب `30°` (`0.56%`) است | `snowLossTilt10Pct` (`9.09`) | `snowLossTilt30Pct` (`0.56`) | `lhs > rhs && (lhs - rhs) >= 8.0` |
| **C4-05** | **حفظ آریتی ۱۶ آرگومانی و تزریق فیزیکی در `buildWaterfallArgs`:** هنگامی که `physicalLossConfig` به `buildWaterfallArgs` داده می‌شود، طول تاپل خروجی `16` و اسلات ۱۶ام (`bifacialGainPct`) برابر `8.31` است | `builtArgs.length` (`16`) | `WATERFALL_ARG_COUNT` (`16`) | `lhs === rhs && builtArgs[15] === 8.31` |
| **C4-06** | **حفظ لنگرهای عدم رگرسیون (`M-A1`, `M-A2`, `M-C1`, `M-D1`, `M-F1`, `M-F4`):** اجرای زندهٔ `measureGroupA/C/D/F()` مقادیر منجمد خط مبنای فاز ۱ را با `delta = 0` حفظ می‌کند | بیشینهٔ قدرمطلق دلتای لنگرها | `0` | `lhs === 0` |

================================================================================
# بخش ۶ — خروجی‌های اجباری و طرح‌وارهٔ JSON
================================================================================

| # | خروجی | مسیر |
|---|---|---|
| **D4-1** | ماژول مرجع یکپارچه‌سازی مدل‌های افت فیزیکی | `src/engine/core/physicalLossContract.ts` |
| **D4-2** | اسکریپت راستی‌آزمایی فاز ۴ | `scripts/remediation/verify-phase04.ts` |
| **D4-3** | فایل شواهد عددی فاز ۴ | `docs/audit/remediation/evidence/phase04/phase04-measurements.json` |
| **D4-4** | گزارش میانه فاز ۴ | در چت |
| **D4-5** | گزارش پایان فاز ۴ | در چت |

طرح‌وارهٔ اجباری `docs/audit/remediation/evidence/phase04/phase04-measurements.json` باید دارای فیلدهای سطح‌بالای زیر باشد:
- `"schema": "solarpv.audit.phase04.v1"`
- `"generatedAtCommit"`: خروجی `git log -n 1 --format=%H -- src/engine/core/physicalLossContract.ts src/engine/bifacialGain.ts src/engine/equipmentCatalogData.ts src/engine/types/equipmentTypes.ts src/engine/catalogAdapters.ts src/engine/waterfallArgs.ts` (با fallback ثابت به همان هش کامیت تا اجرای مجدد اسکریپت چک‌سام فایل شواهد را تغییر ندهد)
- `"phase01BaselineCommit": "91b9b3b"`
- `"phase02BaselineCommit": "64e0ede"`
- `"phase03BaselineCommit": "7c4d55c"`
- `"phase01HarnessSha256": "732b1074b7436150b58e8054aac5cce2ddd28429f44515b0a1911e8aa58d0ab9"`
- `"phase04VerifierSha256"`: چک‌سام SHA-256 فایل `scripts/remediation/verify-phase04.ts`
- `"quantities"`: آرایهٔ ۸ کمیت `P4-01` تا `P4-08` که هر کدام شامل `{ id, name, before, after, delta, unit, producer, reproduce, verified }` با مقادیر عددی متناهی باشند (مقادیر `before` مستقیماً از فایل‌های منجمد `phase01/measurements.json` و `phase03/phase03-measurements.json` یا اجرای مدل پایه خوانده شوند و مقادیر `after` از اجرای زندهٔ توابع موتور به دست آیند — بدون هیچ عدد هاردکد طبق H-03).
- `"checks"`: آرایهٔ ۶ بررسی `C4-01` تا `C4-06` که هر کدام شامل `{ id, lhs, rhs, delta, pass }` با مقادیر عددی متناهی و `pass: true` باشند.
- `"nonRegression"`: شیء شامل `M-A1`, `M-A2`, `M-C1`, `M-D1`, `M-F1`, `M-F4` با `{ before, after, delta: 0 }` که به صورت زنده از `measureGroupA()`, `measureGroupC()`, `measureGroupD()`, `measureGroupF()` در `./measure` محاسبه و با مقادیر منجمد `phase01/measurements.json` مقایسه شده‌اند.
- `"gates"`: `{ "lintErrors": 0, "anyWarnings": 93, "testPass": 196, "testFail": 0, "testSkip": 0, "buildExit": 0 }`.

================================================================================
# بخش ۷ — تعریف «انجام‌شده» (DoD) — داوری مکانیکی
================================================================================

| # | شرط | شاهد لازم در گزارش |
|---|---|---|
| **DoD4-01** | فایل‌های `D4-1`، `D4-2` و `D4-3` موجود و معتبرند | `git status` + چک‌سام SHA-256 هر سه فایل |
| **DoD4-02** | کلیهٔ فایل‌های منجمد فاز ۱ (`91b9b3b`)، فاز ۲ (`64e0ede`) و فاز ۳ (`7c4d55c`) **صفر بایت تغییر** دارند | خروجی خام و خالی `git diff --stat 7c4d55c -- <مسیرهای منجمد §۲>` |
| **DoD4-03** | هیچ فایلی خارج از فهرست مجاز §۲ تغییر نکرده است | خروجی خام `git diff --stat 7c4d55c` |
| **DoD4-04** | هر ۸ کمیت `P4-01` تا `P4-08` با مقادیر عددی واقعی `before`, `after`, `delta` (بدون هاردکد) ثبت و تأیید شده‌اند | `phase04-measurements.json` + جدول گزارش |
| **DoD4-05** | هر ۶ بررسی `C4-01` تا `C4-06` وضعیت `pass: true` دارند | خروجی خام `npx tsx scripts/remediation/verify-phase04.ts` |
| **DoD4-06** | تمام ۲۵ ماژول در `CATALOG_MODULES` و `ENGINE_DEFAULT_MODULES` دارای فیلد `noctC` معتبرند و `rearGainPercent` در حالت `'view_factor_2d'` دقیقاً `8.31%` (`albedo=0.20`) و `10.19%` (`albedo=0.25`) برمی‌گرداند | خروجی خام `verify-phase04.ts --check C4-01` و `--check C4-02` |
| **DoD4-07** | دو بار اجرای پیاپی `npx tsx scripts/remediation/verify-phase04.ts` خروجی `phase04-measurements.json` **بایت‌به‌بایت یکسان** (`sha256sum` واحد و منطبق با فایل کامیت‌شده در Git) تولید می‌کند و `git status --porcelain` پس از اجرا خالی می‌ماند | خروجی خام `sha256sum` دو اجرا + `git status --porcelain` |
| **DoD4-08** | کمیت‌ها و بررسی‌های فاز ۲ و فاز ۳ همچنان بدون خطا (`8/8 quantities, 6/6 checks PASS`) برقرارند و فایل‌های منجمد `phase02-measurements.json` و `phase03-measurements.json` دست‌نخورده باقی می‌مانند (در صورت اجرای CLI اسکریپت‌های فاز ۲ و ۳، با `git checkout -- docs/audit/remediation/evidence/phase02/ docs/audit/remediation/evidence/phase03/` از عدم تغییر `generatedAtCommit` آن‌ها اطمینان حاصل کن) | خروجی خام + `git status --porcelain` خالی |
| **DoD4-09** | `npm run lint` = ۰ خطا و `anyWarnings <= 93` | خروجی خام |
| **DoD4-10** | `npm test` = ۱۹۶ PASS، ۰ FAIL و ۰ SKIP | خروجی خام |
| **DoD4-11** | `npm run build` = exit 0 | خروجی خام |
| **DoD4-12** | بخش «کارهایی که انجام ندادم» با حداقل ۳ مورد واقعی در گزارش پایان موجود است و تمام تغییرات روی شاخهٔ کاری کامیت و `git push` شده‌اند | بخش ۵ گزارش پایان + `git log -1` |

================================================================================
# بخش ۸ — مرزهای ممنوعهٔ این فاز (تکرار عامدانه)
================================================================================

در این فاز **انجام نمی‌دهی**:
- هیچ تغییری در فایل‌های منجمد فاز ۱ (`measure.ts`, `run-phase01.ts`, `import-map.ts`, `fixtures/*.json`, `evidence/phase01/measurements.json`, `phase01-formula-spec.fa.md`, `phase01-baseline-manifest.json`).
- هیچ تغییری در فایل‌های منجمد فاز ۲ (`src/engine/core/solarGeometryContract.ts`, `scripts/remediation/verify-phase02.ts`, `docs/audit/remediation/evidence/phase02/phase02-measurements.json`).
- هیچ تغییری در فایل‌های منجمد فاز ۳ (`src/engine/core/annualYieldEngine.ts`, `src/engine/core/thermalDerate.ts`, `src/engine/waterfallLossEngine.ts`, `src/engine/pvEngineAdvanced.ts`, `src/engine/simulation24hEngine.ts`, `src/engine/solarPvEngine.ts`, `scripts/remediation/verify-phase03.ts`, `docs/audit/remediation/evidence/phase03/phase03-measurements.json`).
- هیچ تغییری در فایل‌های هستهٔ فیزیکی زیرین (`src/engine/bifacial/bifacial2dViewFactor.ts`, `src/engine/optical/iamEngine.ts`, `src/engine/snow/marionSnowEngine.ts`, `src/engine/soiling/kimberSoilingEngine.ts`) یا در `server.ts`, `src/App.tsx`, `src/components/**`, `src/engine/financialEngine.ts`, `src/engine/batteryEngine.ts`, `src/engine/inverterClustering.ts`, `src/engine/core/benchmarks/**`.
- هیچ تغییری در رفتار پیش‌فرض `'screening_proxy'` در `rearGainFraction` / `rearGainPercent` هنگامی که `modelMode` ارسال نشده است، و هیچ تغییری در رفتار پیش‌فرض `buildWaterfallArgs` هنگامی که `physicalLossConfig` ارسال نشده است (تا تمام ۱۹۶ تست موجود و لنگرهای `M-A1`, `M-C1`, `M-D1`, `M-F1`, `M-F4` بدون تغییر تلورانس سبز بمانند).
- هیچ عدد هاردکدی در `verify-phase04.ts` برای مقادیر `before` و `after` که قابل خوانش از فایل‌های شواهد منجمد یا اجرای زندهٔ توابع موتور هستند (`H-03`).

پس از مطالعهٔ فایل‌ها و ارسال «پیام آغاز (§۰.۵)»، نیمهٔ اول کار را انجام بده، روی شاخهٔ کاری کامیت و `git push` کن، **«گزارش میانه — فاز ۴ (§۰.۶)»** را بفرست و در دروازهٔ میانه **کاملاً متوقف شو** تا مجوز ناظر صادر گردد.
