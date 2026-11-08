# پرامپت اجرایی فاز ۶ — سند خودبسنده

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

    # گزارش میانه — فاز ۶
    ## ۱) وضعیت: چند درصد از کار انجام شده
    ## ۲) کارهای انجام‌شده (با file:line)
    ## ۳) اعداد تولیدشده تا این لحظه (جدول: کمیت | مقدار قبل | مقدار بعد | دلتا | دستور بازتولید)
    ## ۴) انحراف از برنامه (اگر هست)
    ## ۵) سؤالات باز / تشدیدها (هر مورد: فایل:خط، چرا لازم است، اثر عدم انجام)
    ## ۶) ریسک‌های باقی‌مانده
    ## ۷) دقیقاً چه کاری را در نیمهٔ دوم انجام می‌دهم
    ## ۸) شواهد خام (خروجی git status --porcelain و دستورهای اجراشده)

## ۰.۷ قالب اجباری «گزارش پایان»

    # گزارش پایان — فاز ۶
    ## ۱) خلاصهٔ یک‌پاراگرافی (بدون صفت، فقط عدد)
    ## ۲) جدول انطباق با DoD (هر شرط: PASS / PARTIAL / FAIL + شاهد file:line یا خروجی)
    ## ۳) جدول «قبل → بعد» (برای هر عدد، پیش‌فرض، امضا: مورد | قبل | بعد | دلتا | دلیل)
    ## ۴) خروجی خام دروازه‌ها (lint / test / build / git diff --stat / git status --porcelain)
    ## ۵) کارهایی که انجام ندادم (و چرا — حداقل ۳ مورد واقعی که دیدی ولی بیرون از دامنه بود)
    ## ۶) مشاهدات خارج از دامنه (فقط ثبت، بدون اقدام — با file:line)
    ## ۷) ریسک‌های باقی‌مانده و اثر عددی تخمینی
    ## ۸) دستور بازتولید کل فاز (کپی-پیست، خط‌به‌خط)

================================================================================
# بخش ۱ — مأموریت فاز ۶: عنوان و صورت مسئله
================================================================================

## ۱.۱ عنوان

**فاز ۶ — یکپارچگی موتور مالی، ارزش اسقاط/پسماند در LCOE، حل‌گر چندریشه‌ای IRR و MIRR، پروفایل‌های کلان کشوری (هم‌سازگاری فیشر)، اتصال فرسایش محیطی/دریایی و ماتریس حساسیت سه‌محوری (Financial Engine Integrity, Residual Salvage LCOE, Multi-Root IRR/MIRR, Fisher Country Profiles, Environmental/Marine Aging Coupling & 3-Axis Sensitivity Matrix)**

## ۱.۲ صورت مسئله

در شواهد منجمد خط مبنای فاز ۱ (`docs/audit/remediation/evidence/phase01/measurements.json`، کامیت `91b9b3b`، گروه `M-F1` تا `M-F6`) و کدهای فعلی `src/engine/financialEngine.ts` و `src/engine/environmentalAgingEngine.ts`، شش گسست و خطای مهندسی-اقتصادی وجود دارد:

1. **عدم تطابق ظرفیت ترانسفورماتور پست MV در CAPEX مالی با معماری بی MV (`substationMvUsd` در `financialEngine.ts:294-345`):**
   - در `src/engine/financialEngine.ts:294-345`، هزینهٔ پست فشارمتوسط (`substationMvUsd`) صرفاً از تقریب توان ظاهری اینورتر (`plantMva = (safeInverterKw / powerFactor) / 1000 = 1320 / 0.95 / 1000 = 1.389474 MVA`) ضربدر `35000 $/MVA` محاسبه می‌شود (`48,632 USD`)، در حالی که سایزینگ مهندسی هماهنگ بی MV در فاز ۵ (`P5-07`) برای همان ناوگان ۴ دستگاهی (`1.32 MW AC`) ترانسفورماتور با حاشیهٔ استاندارد ۱۵٪ برابر **`1.52 MVA`** (`53,200 USD`) الزام کرده است و هیچ پارامتری (`substationTransformerMva`) برای دریافت ظرفیت واقعی ترانسفورماتور در `UserFinancialPricing` وجود ندارد.

2. **ثابت‌ماندن هزینه‌های سالانهٔ اجارهٔ زمین و حق ترانزیت شبکه به تومانِ سال اول در طول ۲۵ سال (`financialEngine.ts:435-437, 568-569`):**
   - در `src/engine/financialEngine.ts:569`، عبارت `const opex = baseAnnualOpexToman * opexGrowthFactor + fixedAnnualChargesUsd * p.usdToTomanRate;` فقط بخش `baseAnnualOpexToman` را با نرخ تورم سالانهٔ OPEX (`opexEscalationPct = 8.0%/yr`) افزایش می‌دهد و بخش `fixedAnnualChargesUsd * p.usdToTomanRate` (`landLeaseAnnualUsd + gridOperatorFeeAnnualUsd + dieselOpexUsd` معادل `18,385,380 Toman` در سال اول برای `G-1`) را به مدت ۲۵ سال بدون هیچ افزایشی ثابت نگه می‌دارد (خطای `-98,199,638 Toman` در OPEX سال ۲۵ برای `G-1`).

3. **حذف کامل ارزش اسقاط/پسماند عمر باقی‌ماندهٔ تعویض‌های اواخر دوره در LCOE و NPV (`financialEngine.ts:572-583, 685-705`):**
   - در کیس مستقل از شبکه `G-3` (`4.68 kWp`, باتری `19.2 kWh` از نوع `lifepo4` با عمر تقویمی `12` سال و افق پروژهٔ `25` سال)، اولین تعویض باتری در سال ۱۲ انجام می‌شود (`331,012,238 Toman` برای سال‌های ۱۳ تا ۲۴) و **دومین تعویض کامل باتری در سال ۲۴** (`594,450,422 Toman`، تنها ۱ سال پیش از پایان عمر ۲۵ سالهٔ پروژه!) شارژ می‌شود؛ اما در پایان سال ۲۵، در حالی که **`11/12` (`91.67%`)** از عمر مفید باتریِ نصب‌شده در سال ۲۴ باقی مانده است (`544,912,886 Toman`)، ارزش اسقاط/پسماند آن صفر در نظر گرفته می‌شود و بهای تمام‌شدهٔ برق (`lcoeTomanPerKwh`) را به طور کاذب به میزان `+528 Toman/kWh` متورم می‌کند. همین نقص برای اورهال/تعویض اینورتر در سال ۱۲ (با عمر طراحی ۱۵ سال که در سال ۲۵ دارای `2/15` عمر باقی‌مانده است) وجود دارد.

4. **شکست کامل حل‌گر IRR (`NO_ROOT_IN_RANGE` / `null`) در جریان‌های نقدی غیرمتعارف دارای ۲ تغییر علامت و نبود MIRR (`financialEngine.ts:625-678`):**
   - در `src/engine/financialEngine.ts:650-655`، حل‌گر IRR صرفاً شرط بولزانو را در دو سر بازهٔ کل `[-0.999, +5.0]` بررسی می‌کند (`if (npvLow * npvHigh <= 0)`). اما در هر جریان نقدی دارای **۲ تغییر علامت** (که در آن `CF_0 < 0` در سال صفر و `CF_N < 0` در سال پایانی به دلیل تعویض تجهیزات یا برچیدن سایت منفی است)، هم در `r -> -1` و هم در `r -> +∞` مقدار `NPV(r)` منفی است (`npvLow < 0` و `npvHigh < 0`، بنابراین `npvLow * npvHigh > 0`)!
   - در نتیجه، شرط خط ۶۵۵ همیشه شکست می‌خورد، خط ۶۷۰ (`NON_CONVENTIONAL_MULTIPLE_ROOTS`) به کد مرده تبدیل می‌شود، و تابع به غلط `irrPct = null` و `irrStatus = 'NO_ROOT_IN_RANGE'` برمی‌گرداند؛ در حالی که جریان نقدی دارای دو ریشهٔ حقیقی در بازه است (مثلاً برای `G-1` با `tariffEscalationPct: 0, inverterReplacementYear: 25, inverterReplacementCostRatio: 0.80` دارای دو ریشهٔ `-12.5%` و **`+5.4%`** و نرخ بازده داخلی اصلاح‌شدهٔ یکتای `mirrPct = 14.8%` است).

5. **گسست کامل موتور فرسایش محیطی (`calculateEnvironmentalAging`) از موتور مالی و فقدان مدل خوردگی مه نمکی سواحل (`IEC 61701` در `environmentalAgingEngine.ts`):**
   - در `src/engine/environmentalAgingEngine.ts:154-203`، برای نیروگاه زمینی `G-1` در تهران (`ground_mount`, `ambientTempMaxC = 39.0°C`, `elevationM = 1200 m`, `siteTiltDeg = 31.0°`)، افت حرارتی اینورتر فضای باز برابر `totalInverterDeratePct = 3.0%` (معادل جریمهٔ انرژی سالانهٔ وزنی `3.0% × 0.35 = 1.05%` طبق ضریب وزنی خط ۲۰۱)، نرخ استهلاک سالانهٔ پنل `pvImpact.annualDegradationPct = 0.45%/yr` و نیاز به اورهال/تعویض اینورتر فضای باز محاسبه می‌شود؛ اما هیچ‌یک از این سه خروجی به ورودی‌های تحلیل مالی `G-1` متصل نیستند.
   - علاوه‌بر این، با وجود ذخیره شدن فاصله تا ساحل (`city.distanceToCoastKm`) در اسکیمای پروژه، تابع `calculateEnvironmentalAging` فاقد پارامتر `distanceToCoastKm` و مدل شتاب فرسایش مه نمکی (`IEC 61701 Salt Mist Corrosion` برای سایت‌های ساحلی `<= 1 km` و `1..5 km`) است.

6. **ناسازگاری رابطهٔ فیشر (اختلاط نرخ تنزیل اسمی ۱۸٪ با رشد تعرفهٔ حقیقی ۰٪ در `M-F6`) و نبود پروفایل‌های کلان کشوری و ماتریس حساسیت سه‌محوری:**
   - در تحلیل حساسیت `M-F6` (`escalation0Pct`)، نرخ رشد تعرفه روی `0%` (تعرفهٔ ثابت حقیقی) گذاشته شده اما نرخ تنزیل روی `18.0%` (نرخ تنزیل اسمی تورمی ریالی) و رشد OPEX روی `8.0%` باقی مانده است که باعث سقوط غیرواقعی NPV کیس `G-1` از `+$310,202` به **`-$247,356`** می‌شود؛ در حالی که طبق معادلهٔ فیشر ($1 + r_{\text{real}} = \frac{1 + r_{\text{nom}}}{1 + i}$ با تورم پایهٔ $i = 15\% \Rightarrow r_{\text{real}} = 2.6087\%$) در قدرت خرید ثابت سال اول، پروژه دارای **`NPV = +$381,562`** و `LCOE = $0.0192/kWh` است. همچنین هیچ تابع استانداردی برای تولید ماتریس حساسیت سه‌محوری اجباری (`tariffEscalationPct × discountRatePct × capexMultiplier`) وجود ندارد.

================================================================================
# بخش ۲ — محدودهٔ فایل‌ها (ایجاد / ویرایش / ممنوع)
================================================================================

| دسته | مسیر فایل | مجوز و شرح دقیق |
|---|---|---|
| **ایجاد (مجاز)** | `src/engine/core/financialContract.ts` | ماژول مرجع قرارداد مالی، پروفایل‌های کلان کشوری (`COUNTRY_FINANCIAL_PROFILES`)، تبدیل نرخ تنزیل حقیقی/اسمی فیشر (`computeFisherRealDiscountRatePct`)، حل‌گر چندریشه‌ای IRR و MIRR (`solveCashFlowIrrAndMirr`)، اتصال فرسایش محیطی به مدل مالی (`resolveFinancialSystemAnalysis`) و ماتریس حساسیت سه‌محوری اجباری (`computeMandatorySensitivityMatrix`) |
| **ایجاد (مجاز)** | `scripts/remediation/verify-phase06.ts` | اسکریپت مستقل راستی‌آزمایی فاز ۶، اجرای کمیت‌های `P6-01` تا `P6-08` و بررسی‌های انسجام `C6-01` تا `C6-06` و تولید شواهد JSON |
| **ایجاد (مجاز)** | `docs/audit/remediation/evidence/phase06/phase06-measurements.json` | فایل شواهد عددی فاز ۶ منطبق بر طرح‌وارهٔ §۶ |
| **ویرایش کمینه (مجاز)** | `src/engine/financialEngine.ts` | افزودن فیلدهای اختیاری (`substationTransformerMva`, `escalateFixedChargesWithOpex`, `includeResidualSalvageValue`, `inverterLifespanYears`) به اینترفیس `UserFinancialPricing` و `sanitizeFinancialPricing` (**بدون افزودن کلید جدید به آبجکت `DEFAULT_FINANCIAL_PRICING` تا تست `P1.2.4` با ۲۱ کلید دقیقاً برقرار بماند**)، افزودن `salvageCreditToman?: number` به `YearCashFlowItem`، ارتقای حل‌گر IRR به اسکنر چندبازه‌ای برای تشخیص ریشه‌های چندگانه (`irrRootsPct?: number[]`, `mirrPct?: number | null`, `residualSalvageToman?: number`, `residualSalvageUsd?: number`) با حفظ ۱۰۰٪ مقادیر فراخوانی‌های پیش‌فرض موجود (`M-F1 = 499784`, `M-F4 = 310202` و تست `[LCOE-INTEGRITY]`) |
| **ویرایش کمینه (مجاز)** | `src/engine/environmentalAgingEngine.ts` | افزودن پارامتر اختیاری `distanceToCoastKm?: number` به `EnvironmentalAgingInput` و پیاده‌سازی مدل فرسایش مه نمکی (`IEC 61701`: برای `distanceToCoastKm <= 1.0 km` افزودن `+0.15%/yr` به `annualDegradationPct` و کاهش ۲ سال از عمر اینورتر فضای باز؛ برای `1.0 < distanceToCoastKm <= 5.0 km` افزودن `+0.08%/yr` و کاهش ۱ سال؛ برای `undefined` یا `> 5.0 km` تغییر صفر جهت حفظ کامل تست `E8-ENV-1`) و افزودن فیلدهای اختیاری `saltMistSeverity`, `saltMistPvDegradationAdderPct`, `inverterAnnualEnergyDeratePct` |
| **ممنوع (مطلق)** | `scripts/remediation/fixtures/g1..g4.json`<br>`scripts/remediation/measure.ts`<br>`scripts/remediation/import-map.ts`<br>`scripts/remediation/run-phase01.ts`<br>`docs/audit/remediation/evidence/phase01/**`<br>`docs/audit/remediation/phase01-*` | **فایل‌های فاز ۱ کاملاً منجمدند.** صفر بایت تغییر نسبت به کامیت `91b9b3b`. |
| **ممنوع (مطلق)** | `src/engine/core/solarGeometryContract.ts`<br>`src/engine/roof3dShadingEngine.ts`<br>`src/engine/shadingSunPathEngine.ts`<br>`server.ts`<br>`scripts/remediation/verify-phase02.ts`<br>`docs/audit/remediation/evidence/phase02/**` | **فایل‌های فاز ۲ کاملاً منجمدند.** صفر بایت تغییر نسبت به کامیت `64e0ede`. |
| **ممنوع (مطلق)** | `src/engine/core/annualYieldEngine.ts`<br>`src/engine/core/thermalDerate.ts`<br>`src/engine/waterfallLossEngine.ts`<br>`src/engine/simulation24hEngine.ts`<br>`src/engine/solarPvEngine.ts`<br>`scripts/remediation/verify-phase03.ts`<br>`docs/audit/remediation/evidence/phase03/**` | **فایل‌های فاز ۳ کاملاً منجمدند.** صفر بایت تغییر نسبت به کامیت `7c4d55c`. |
| **ممنوع (مطلق)** | `src/engine/core/physicalLossContract.ts`<br>`src/engine/bifacialGain.ts`<br>`src/engine/equipmentCatalogData.ts`<br>`src/engine/types/equipmentTypes.ts`<br>`src/engine/catalogAdapters.ts`<br>`src/engine/waterfallArgs.ts`<br>`scripts/remediation/verify-phase04.ts`<br>`docs/audit/remediation/evidence/phase04/**` | **فایل‌های فاز ۴ کاملاً منجمدند.** صفر بایت تغییر نسبت به کامیت `bc1a978`. |
| **ممنوع (مطلق)** | `src/engine/core/electricalSizingContract.ts`<br>`src/engine/inverterClustering.ts`<br>`src/engine/pvEngineAdvanced.ts`<br>`src/engine/batteryEngine.ts`<br>`src/engine/powerplantBayEngine.ts`<br>`src/engine/singleDiodeModel.ts`<br>`scripts/remediation/verify-phase05.ts`<br>`docs/audit/remediation/evidence/phase05/**` | **فایل‌های فاز ۵ کاملاً منجمدند.** صفر بایت تغییر نسبت به کامیت `49b89cc`. |
| **ممنوع (مطلق)** | `src/App.tsx`, `src/components/**`, `src/engine/scenarioEngine.ts`, `src/engine/core/projectMigration.ts`, `src/engine/core/uncertaintyPropagation.ts`, `src/engine/structuralEngine.ts`, `src/engine/core/benchmarks/**`, `package.json`, `tsconfig*.json` | هرگونه دیف در این فایل‌ها = رد فوری فاز ۶ |

**دروازهٔ مکانیکی دامنه:**
در پایان فاز، خروجی دستور زیر نسبت به کامیت پایانی فاز ۵ (`49b89cc`) باید **کاملاً خالی** باشد:
`git diff --stat 49b89cc -- scripts/remediation/fixtures/ scripts/remediation/measure.ts scripts/remediation/import-map.ts scripts/remediation/run-phase01.ts scripts/remediation/verify-phase02.ts scripts/remediation/verify-phase03.ts scripts/remediation/verify-phase04.ts scripts/remediation/verify-phase05.ts docs/audit/remediation/evidence/phase01/ docs/audit/remediation/evidence/phase02/ docs/audit/remediation/evidence/phase03/ docs/audit/remediation/evidence/phase04/ docs/audit/remediation/evidence/phase05/ docs/audit/remediation/phase01-formula-spec.fa.md docs/audit/remediation/phase01-baseline-manifest.json src/engine/core/solarGeometryContract.ts src/engine/roof3dShadingEngine.ts src/engine/shadingSunPathEngine.ts server.ts src/engine/core/annualYieldEngine.ts src/engine/core/thermalDerate.ts src/engine/waterfallLossEngine.ts src/engine/simulation24hEngine.ts src/engine/solarPvEngine.ts src/engine/core/physicalLossContract.ts src/engine/bifacialGain.ts src/engine/equipmentCatalogData.ts src/engine/types/equipmentTypes.ts src/engine/catalogAdapters.ts src/engine/waterfallArgs.ts src/engine/core/electricalSizingContract.ts src/engine/inverterClustering.ts src/engine/pvEngineAdvanced.ts src/engine/batteryEngine.ts src/engine/powerplantBayEngine.ts src/engine/singleDiodeModel.ts src/App.tsx src/components/ src/engine/scenarioEngine.ts src/engine/core/projectMigration.ts src/engine/core/uncertaintyPropagation.ts src/engine/structuralEngine.ts src/engine/core/benchmarks/ package.json tsconfig.json`

================================================================================
# بخش ۳ — ورودی‌های یخ‌زده و اعداد خط مبنای فاز ۱ تا فاز ۵
================================================================================

تمامی ورودی‌های کیس‌های طلایی از فایل‌های یخ‌زدهٔ `scripts/remediation/fixtures/g1.json` تا `g4.json` و شواهد منجمد فازهای ۱ تا ۵ خوانده می‌شوند:

1. **کیس G-1 (`scripts/remediation/fixtures/g1.json`):**
   - نیروگاه `1000 kW` در تهران (`latitudeDeg = 35.6892`, `elevationM = 1200`, `peakSunHours = 5.17`, `tiltDeg = 31.0`, `ambientTempDesignMaxC = 39.0`, `tempMinC = -5.0`, `soilingLossPct = 5.5`, `albedo = 0.20`, `groundCoverRatio = 0.38`, `installationEnvironment = 'ground_mount'`).
   - در خط مبنای فاز ۱ (`M-F1` تا `M-F6`): `totalPvCapacityKwp = 1134.9 kWp`, `batteryCapacityKwh = 0`, `inverterCapacityKw = 1320 kW`, `annualYieldKwh = 1851400 kWh`, `lifetimeYears = 25`, `systemMode = 'powerplant'`, با `DEFAULT_FINANCIAL_PRICING`:
     - `M-F1 = 499784 USD` (`totalCapexToman = 44,980,493,684 Toman`, `substationMvUsd = 48632 USD`, `invertersUsd = 72600 USD`)
     - `M-F2 = 5997 USD` (`annualOpexToman = 539,765,924 Toman`, `landLeaseAnnualUsd = 136.19 USD`, `gridOperatorFeeAnnualUsd = 68.09 USD`)
     - `M-F3 = 0.0562 USD/kWh` (`lcoeTomanPerKwh = 5056 Toman/kWh`)
     - `M-F4 = 310202 USD` (`npvToman = 27,918,146,128 Toman`, `irrPct = 23.6%`, `simplePaybackPeriodYears = 6.4 yrs`, `discountedPaybackPeriodYears = 13.3 yrs`)
     - `M-F5 = 128129928467 Toman` (`year1NetCashFlowToman = 4,625,768,696 Toman`, `year25 opexToman = 3,441,138,661 Toman`)
     - `M-F6`: در `tariffEscalationPct = 15%`: `npvUsd = 310202 USD`؛ در `5%`: `npvUsd = -148751 USD`؛ در `0%`: `npvUsd = -247356 USD` (`irrPct = 6.6%`).
   - از شواهد منجمد فاز ۴ (`P4-07`): تولید خالص سالانهٔ فیزیکی G-1 برابر `1816762 kWh` است.
   - از شواهد منجمد فاز ۵ (`P5-07`): ظرفیت نامی ترانسفورماتور بی MV نیروگاه ۱ مگاواتی G-1 برابر `1.52 MVA` است.

2. **کیس G-2 (`scripts/remediation/fixtures/g2.json`):**
   - سیستم مسکونی متصل به شبکه (`11.7 kWp`, `10 kW AC`, `16977.6 kWh/yr`, `systemMode = 'ongrid'`):
     `totalCapexUsd = 3475 USD`, `lcoeUsdPerKwh = 0.0425 USD/kWh` (`3825 Toman/kWh`), `npvUsd = 6914 USD`, `irrPct = 33.7%`.

3. **کیس G-3 (`scripts/remediation/fixtures/g3.json`):**
   - سیستم مستقل از شبکه (`4.68 kWp`, بانک باتری `19.2 kWh` از شیمی `lifepo4` با عمر تقویمی `12` سال، اینورتر `5.0 kW`, تولید سالانهٔ پایه `4469 kWh`, بار مصرفی روزانه `offgridDailyLoadKwh = 8.26 kWh/day` معادل `3014.9 kWh/yr` بار خدمت‌دهی‌شده، بدون دیزل ژنراتور `includeDieselGenSet: false`):
     `totalCapexUsd = 4502 USD` (`405,144,000 Toman`), `batteriesUsd = 3072 USD`, `lcoeTomanPerKwh = 30643 Toman/kWh` (`0.3405 USD/kWh`), `npvUsd = 5838 USD`, `irrPct = 28.7%`.

4. **لنگرهای غیررگرسیونی که در `scripts/remediation/measure.ts` نباید تغییر کنند (`delta = 0`):**
   - `M-A1 = 1851400 kWh`
   - `M-A2 = 1646827.145773 kWh`
   - `M-C1 = 13.1225 %`
   - `M-D1 = 2.74 %`
   - `M-F1 = 499784 USD`
   - `M-F4 = 310202 USD`

================================================================================
# بخش ۴ — مشخصات فنی دقیق و کمیت‌های «قبل → بعد» (`P6-01` تا `P6-08`)
================================================================================

## ۴.۱ مشخصات فنی تغییرات مجاز

1. **اصلاح `src/engine/environmentalAgingEngine.ts`:**
   - به اینترفیس `EnvironmentalAgingInput` فیلد اختیاری `distanceToCoastKm?: number;` را اضافه کن.
   - به اینترفیس `PvEnvironmentalImpact` فیلدهای اختیاری `saltMistSeverity?: 'severe_coastal' | 'moderate_coastal' | 'inland_negligible';` و `saltMistPvDegradationAdderPct?: number;` را اضافه کن.
   - به اینترفیس `InverterEnvironmentalImpact` فیلد اختیاری `inverterAnnualEnergyDeratePct?: number;` را اضافه کن.
   - در تابع `calculateEnvironmentalAging(input)`:
     - اگر `typeof input.distanceToCoastKm === 'number' && Number.isFinite(input.distanceToCoastKm) && input.distanceToCoastKm >= 0` باشد:
       - برای `input.distanceToCoastKm <= 1.0`: `saltMistSeverity = 'severe_coastal'`, `saltMistPvDegradationAdderPct = 0.15`, و اگر `!isInstalledIndoors` باشد، `2` سال از عمر اینورتر کم کن (`inverterLifespan = Math.max(6, inverterLifespan - 2)`).
       - برای `1.0 < input.distanceToCoastKm <= 5.0`: `saltMistSeverity = 'moderate_coastal'`, `saltMistPvDegradationAdderPct = 0.08`, و اگر `!isInstalledIndoors` باشد، `1` سال از عمر اینورتر کم کن (`inverterLifespan = Math.max(7, inverterLifespan - 1)`).
       - برای `input.distanceToCoastKm > 5.0`: `saltMistSeverity = 'inland_negligible'`, `saltMistPvDegradationAdderPct = 0.0`.
     - اگر `input.distanceToCoastKm === undefined` (فراخوانی‌های موجود مانند `E8-ENV-1`)، `saltMistSeverity = 'inland_negligible'` و `saltMistPvDegradationAdderPct = 0.0` باشد تا خروجی تمام تست‌های موجود ۱۰۰٪ دست‌نخورده بماند.
     - مقدار نهایی نرخ استهلاک سالانهٔ پنل را برابر `const effectiveDegradationPct = Number((baseDegradationPct + saltMistPvDegradationAdderPct).toFixed(2));` قرار بده و `retention25y` و `usefulLifespanYears` و `pvImpact.annualDegradationPct` را از روی `effectiveDegradationPct` محاسبه کن.
     - در `inverterImpact`، مقدار ضریب افت انرژی سالانهٔ وزنی اینورتر را منطبق بر ضریب وزنی خط ۲۰۱ برابر `inverterAnnualEnergyDeratePct: Number((totalInverterDeratePct * 0.35).toFixed(2))` قرار بده (که برای `G-1` با `totalInverterDeratePct = 3.0%` دقیقاً `1.05%` است و برای اینورتر داخلی `0.0%` است).

2. **اصلاح `src/engine/financialEngine.ts`:**
   - **قانون حیاتی عدم دستکاری کلیدهای `DEFAULT_FINANCIAL_PRICING`:** تست `P1.2.4` در `unitTestsCore.ts:1874` بررسی می‌کند که `Object.keys(DEFAULT_FINANCIAL_PRICING).sort()` دقیقاً دارای **۲۱ کلید** برابر با `UserFinancialPricingSchema.shape` باشد. بنابراین **مطلقاً هیچ کلید جدیدی به آبجکت `DEFAULT_FINANCIAL_PRICING` اضافه نکن**. فیلدهای جدید را فقط به صورت اختیاری (`?:`) به اینترفیس TypeScript `UserFinancialPricing` اضافه کن و در `sanitizeFinancialPricing` فقط زمانی که در `custom` ارسال شده‌اند (`custom.fieldName !== undefined`) روی خروجی ست کن (یا با `undefined` زمانی که ارسال نشده‌اند، همانند فیلدهای اختیاری موجود در خطوط ۲۳۹ تا ۲۷۲).
   - فیلدهای اختیاری جدید در اینترفیس `UserFinancialPricing`:
     - `substationTransformerMva?: number;` — ظرفیت واقعی ترانسفورماتور پست MV بر حسب MVA (مثلاً `1.52 MVA` از فاز ۵). در محاسبهٔ `substationUsd` (خطوط ۳۳۱ و ۳۳۹)، از `const effectiveSubstationMva = (p.substationTransformerMva && p.substationTransformerMva > 0) ? p.substationTransformerMva : plantMva;` استفاده کن.
     - `escalateFixedChargesWithOpex?: boolean;` — هنگامی که `true` باشد، در حلقهٔ ۲۵ ساله (خط ۵۶۹)، هزینه‌های ثابت سالانه (`fixedAnnualChargesUsd * p.usdToTomanRate`) نیز در `opexGrowthFactor` ضرب می‌شوند:
       `const fixedChargesGrowth = p.escalateFixedChargesWithOpex ? opexGrowthFactor : 1.0;`
       `const opex = baseAnnualOpexToman * opexGrowthFactor + fixedAnnualChargesUsd * p.usdToTomanRate * fixedChargesGrowth;`
     - `includeResidualSalvageValue?: boolean;` و `inverterLifespanYears?: number;` — هنگامی که `p.includeResidualSalvageValue === true` باشد، در سال پایانی دوره (`yr === safeLifetimeYears`)، ارزش پسماند خطی عمر باقی‌ماندهٔ آخرین تعویض باتری و اینورتر را محاسبه کن:
       - برای باتری: اگر `batteriesUsd > 0 && batteryLifespanYears > 0` باشد، سال آخرین تعویض باتری پیش از پایان دوره برابر `const lastBatteryRepYr = Math.floor((safeLifetimeYears - 1) / batteryLifespanYears) * batteryLifespanYears;` است. اگر `lastBatteryRepYr > 0` باشد، تعداد سال‌های کارکرد آن باتری تا پایان دوره `const usedBatYears = safeLifetimeYears - lastBatteryRepYr;` است و اگر `usedBatYears < batteryLifespanYears` باشد، نسبت عمر باقی‌مانده برابر `(batteryLifespanYears - usedBatYears) / batteryLifespanYears` است و ارزش پسماند آن در سال `safeLifetimeYears` برابر:
         `const batterySalvageToman = ((batteriesUsd * 0.70) * p.usdToTomanRate * Math.pow(1.05, lastBatteryRepYr - 1)) * ((batteryLifespanYears - usedBatYears) / batteryLifespanYears);`
       - برای اینورتر: اگر `p.inverterReplacementYear && p.inverterReplacementYear > 0 && p.inverterReplacementYear < safeLifetimeYears && invertersUsd > 0` باشد، با عمر طراحی اینورتر جایگزین `const invLife = p.inverterLifespanYears && p.inverterLifespanYears > 0 ? p.inverterLifespanYears : 15;` و سال‌های کارکرد `const usedInvYears = safeLifetimeYears - p.inverterReplacementYear;`، اگر `usedInvYears < invLife` باشد، ارزش پسماند اینورتر در سال `safeLifetimeYears` برابر:
         `const inverterSalvageToman = (invertersUsd * (p.inverterReplacementCostRatio ?? 0.60) * p.usdToTomanRate * Math.pow(1.05, p.inverterReplacementYear - 1)) * ((invLife - usedInvYears) / invLife);`
       - مجموع ارزش پسماند سال پایانی: `const salvageCreditToman = (yr === safeLifetimeYears && p.includeResidualSalvageValue) ? (batterySalvageToman + inverterSalvageToman) : 0;`
       - فیلد اختیاری `salvageCreditToman?: number;` را به `YearCashFlowItem` اضافه کن (`salvageCreditToman: Math.round(salvageCreditToman)`).
       - در سال `yr`، جریان نقدی خالص را برابر `const netCashFlow = revenue + salvageCreditToman - (opex + fuel + batteryReplacementToman + inverterReplacementToman);` قرار بده و در حلقهٔ محاسبهٔ LCOE (خط ۶۹۰)، از `yrCostToman` مقدار `(cashFlow25Years[yr - 1].salvageCreditToman ?? 0)` را کسر کن.
   - **ارتقای حل‌گر IRR به اسکنر چندریشه‌ای و محاسبهٔ MIRR در `src/engine/financialEngine.ts`:**
     - به جای بررسی صرفاً دو نقطهٔ مرزی `lowBound = -0.999` و `highBound = 5.0`، ابتدا بررسی کن که اگر `signChanges === 1` و `npvAt(-0.999) * npvAt(5.0) <= 0` بود، دقیقاً همان حل‌گر دوبخشی ۷۰ گامی فعلی روی `[-0.999, 5.0]` اجرا شود (تا ۱۰۰٪ ارقام ریشه‌های تک‌تغییرعلامت موجود بدون کوچک‌ترین تغییر حفظ شوند).
     - در غیر این صورت (وقتی `signChanges > 1` یا `npvAt(-0.999) * npvAt(5.0) > 0` است)، بازهٔ `[-0.90, 5.0]` را به `600` زیربازهٔ مساوی تقسیم کن؛ در هر زیربازهٔ `[a, b]` که `npvAt(a) * npvAt(b) <= 0` است، با ۶۰ تکرار دوبخشی ریشه را بیاب و در آرایهٔ `irrRootsPct: number[]` (گردشده به ۱ رقم اعشار بدون تکرار در فاصلهٔ کمتر از `0.05%`) ذخیره کن.
     - اگر حداقل یک ریشه یافت شد:
       - اگر ریشهٔ مثبتی در `irrRootsPct` وجود دارد، کوچک‌ترین ریشهٔ مثبت را به عنوان ریشهٔ عملیاتی اصلی در `calculatedIrrPct` قرار بده (و اگر همه منفی بودند، بزرگ‌ترین ریشهٔ منفی را انتخاب کن).
       - `isIrrDefined = true` و `irrStatus = (signChanges > 1 || irrRootsPct.length > 1) ? 'NON_CONVENTIONAL_MULTIPLE_ROOTS' : 'DEFINED_SINGLE_ROOT'` قرار بده.
     - همچنین نرخ بازده داخلی اصلاح‌شده (`mirrPct?: number | null`) را با نرخ تأمین مالی و نرخ سرمایه‌گذاری مجدد برابر `r = Math.max(-0.99, p.discountRatePct / 100.0)` محاسبه کن:
       `pvNegative = sum_{t=0..N, CF_t < 0} |CF_t| / (1 + r)^t`
       `fvPositive = sum_{t=0..N, CF_t > 0} CF_t * (1 + r)^(N - t)`
       `mirrPct = (pvNegative > 0 && fvPositive > 0 && safeLifetimeYears > 0) ? Number(((Math.pow(fvPositive / pvNegative, 1.0 / safeLifetimeYears) - 1.0) * 100.0).toFixed(1)) : null`
     - فیلدهای اختیاری `irrRootsPct?: number[]`، `mirrPct?: number | null`، `residualSalvageToman?: number` و `residualSalvageUsd?: number` را به `FinancialAnalysisResult` اضافه کن.

3. **ایجاد ماژول مرجع `src/engine/core/financialContract.ts`:**
   - تعریف پروفایل‌های کلان کشوری (`CountryFinancialProfileId = 'IR_SATBA_NOMINAL_TOMAN' | 'IR_FISHER_REAL_CONSTANT' | 'INTL_USD_BENCHMARK'` و رجیستری `COUNTRY_FINANCIAL_PROFILES`):
     - `IR_SATBA_NOMINAL_TOMAN`: `discountRatePct = 18.0`, `inflationRatePct = 15.0`, `tariffEscalationPct = 15.0`, `opexEscalationPct = 8.0`, `ppaTariffTomanPerKwh = 2800`, `gridTariffTomanPerKwh = 3800`, `usdToTomanRate = 90000`.
     - `IR_FISHER_REAL_CONSTANT`: ارزیابی به قیمت‌های ثابت قدرت خرید سال اول با حذف تورم اسمی طبق رابطهٔ فیشر: `inflationRatePct = 15.0`, `discountRatePct = computeFisherRealDiscountRatePct(18.0, 15.0)` (`2.6087%`), `tariffEscalationPct = 0.0`, `opexEscalationPct = 0.0`, `ppaTariffTomanPerKwh = 2800`, `gridTariffTomanPerKwh = 3800`, `usdToTomanRate = 90000`.
     - `INTL_USD_BENCHMARK`: بنچمارک بین‌المللی دلاری (`IRENA / NREL SAM`): `discountRatePct = 7.5`, `inflationRatePct = 2.5`, `tariffEscalationPct = 2.0`, `opexEscalationPct = 2.5`, `ppaTariffTomanPerKwh = 4950` (`$0.055/kWh * 90000`), `gridTariffTomanPerKwh = 10800` (`$0.12/kWh * 90000`), `usdToTomanRate = 90000`.
   - پیاده‌سازی تابع `computeFisherRealDiscountRatePct(nominalDiscountRatePct: number, inflationRatePct: number): number` با فرمول دقیق:
     `Number(((((1.0 + nominalDiscountRatePct / 100.0) / (1.0 + inflationRatePct / 100.0)) - 1.0) * 100.0).toFixed(4))` (که برای `18.0%` و `15.0%` دقیقاً `2.6087%` برمی‌گرداند).
   - پیاده‌سازی تابع `resolveFinancialSystemAnalysis(input: ResolvedFinancialSystemInput): ResolvedFinancialSystemResult` که زنجیرهٔ کامل خروجی‌های فیزیکی و الکتریکال (`baseAnnualYieldKwh`, `totalPvCapacityKwp`, `inverterCapacityKw`, `batteryCapacityKwh`, `substationTransformerMva`) را با خروجی `calculateEnvironmentalAging` کوپل می‌کند:
     - ضریب افت انرژی سالانهٔ اینورتر فضای باز (`inverterAnnualEnergyDeratePct = aging.inverterImpact.inverterAnnualEnergyDeratePct ?? Number((aging.inverterImpact.totalInverterDeratePct * 0.35).toFixed(2))`) را بر `baseAnnualYieldKwh` اعمال می‌کند:
       `effectiveAnnualYieldKwh = Math.round(baseAnnualYieldKwh * (1.0 - inverterAnnualEnergyDeratePct / 100.0))`
     - نرخ استهلاک سالانهٔ پنل را از `aging.pvImpact.annualDegradationPct / 100.0` (`0.0045` برای `ground_mount` غیرساحلی و `0.0060` برای ساحلی `<= 1 km`) تنظیم می‌کند.
     - گزینهٔ `substationTransformerMva`، `escalateFixedChargesWithOpex: true`، `includeResidualSalvageValue: true`، `inverterReplacementYear` (پیش‌فرض برای `ground_mount`: سال `12` با سایبان استاندارد طبق توصیهٔ مهندسی `mitigationRecommendations` و `inverterLifespanYears = 15` و `inverterReplacementCostRatio = 0.60`) را به `performFinancialAnalysis` ارسال می‌کند.
   - پیاده‌سازی تابع `computeMandatorySensitivityMatrix(baseInput, axes?)` که ماتریس حساسیت سه‌محوری `3 × 3 × 3` (`27` سناریو) را روی سه محور:
     - `tariffEscalationPctValues = [0, 5, 15]`
     - `discountRatePctValues = [12, 18, 24]`
     - `capexMultipliers = [0.85, 1.00, 1.15]` (اعمال‌شده بر نرخ‌های واحد سرمایه‌ای `moduleUsdPerWp`, `inverterUsdPerKw`, `batteryUsdPerKwh`, `structureUsdPerWp`, `cablingBopUsdPerWp`, `substationUsdPerMva`, `epcLaborUsdPerKw`, `hvConnectionUsdPerKva` و در حالت `powerplant` تنظیم متناظر یا بررسی یکنواختی NPV و LCOE)
     محاسبه کرده و قوانین یکنواختی اقتصادی (`isMonotonicValid: boolean`) را راستی‌آزمایی کند.

## ۴.۲ جدول کمیت‌های «قبل → بعد» (`P6-01` تا `P6-08`)

اسکریپت `scripts/remediation/verify-phase06.ts` باید دقیقاً این ۸ کمیت را از اجرای زندهٔ موتورها محاسبه و در `docs/audit/remediation/evidence/phase06/phase06-measurements.json` ثبت کند:

| شناسه | نام کمیت | کیس و ورودی دقیق | مقدار قبل (`before`) | مقدار بعد (`after`) | دلتا (`delta`) | واحد |
|---|---|---|---|---|---|---|
| **`P6-01`** | هزینهٔ سرمایه‌ای پست فشارمتوسط نیروگاه ۱ مگاواتی با ترانسفورماتور هماهنگ فاز ۵ (`G-1 MV Substation CAPEX with Coordinated 1.52 MVA Transformer`) | `G-1`: `performFinancialAnalysis(1134.9, 0, 1320, 1851400, ...)`؛ `before`: تقریب توان ظاهری اینورتر (`1.389474 MVA × 35000 $/MVA`)؛ `after`: با `substationTransformerMva: 1.52` از فاز ۵ (`1.52 MVA × 35000 $/MVA`) | `48632` | `53200` | `4568` | `USD` |
| **`P6-02`** | کل هزینهٔ عملیاتی و نگهداری سال ۲۵ نیروگاه ۱ مگاواتی با شاخص‌بندی تورمی هزینه‌های ثابت سالانه (`G-1 Year-25 Total Annual OPEX with Escalating Fixed Charges`) | `G-1`: `cashFlow25Years[24].opexToman` در نرخ رشد OPEX برابر `8.0%/yr`؛ `before`: منجمد ماندن اجارهٔ زمین و حق شبکه به تومانِ سال اول؛ `after`: با `escalateFixedChargesWithOpex: true` | `3441138661` | `3539338299` | `98199638` | `Toman` |
| **`P6-03`** | بهای تمام‌شدهٔ سطح‌بندی‌شدهٔ برق در حالت مستقل از شبکه با احتساب ارزش پسماند باتری سال ۲۴ (`G-3 Off-Grid Demand-Constrained LCOE with Residual Battery Salvage Credit`) | `G-3`: `performFinancialAnalysis(4.68, 19.2, 5.0, 4469, { ...DEFAULT_FINANCIAL_PRICING, includeDieselGenSet: false, batteryChemistry: 'lifepo4', offgridDailyLoadKwh: 8.26, includeResidualSalvageValue }, 25, 'offgrid')` (کسر ارزش پسماند `11/12` عمر باقی‌ماندهٔ باتری تعویض‌شده در سال ۲۴ معادل `544,912,886 Toman` در سال ۲۵) | `30643` | `30115` | `-528` | `Toman/kWh` |
| **`P6-04`** | تشخیص ریشهٔ اصلی IRR در جریان نقدی غیرمتعارف دارای ۲ تغییر علامت (`G-1 Non-Conventional 2-Sign-Change Primary IRR Root Detection`) | `G-1`: `performFinancialAnalysis(1134.9, 0, 1320, 1851400, { ...DEFAULT_FINANCIAL_PRICING, tariffEscalationPct: 0, opexEscalationPct: 8, inverterReplacementYear: 25, inverterReplacementCostRatio: 0.80 }, 25, 'powerplant')`؛ `before`: شکست شرط بولزانوی دوسویه و خروجی `null` (`0.0%`)؛ `after`: تشخیص هر دو ریشهٔ `[-12.5%, +5.4%]`، گزارش ریشهٔ مثبت اصلی `5.4%` و `mirrPct = 14.8%` | `0.0` | `5.4` | `5.4` | `%` |
| **`P6-05`** | تولید خالص سال اول نیروگاه ۱ مگاواتی پس از کوپلینگ افت حرارتی اینورتر فضای باز (`G-1 Year-1 Net Export Yield Coupled with Outdoor Inverter Thermal Derate`) | `G-1`: اعمال جریمهٔ انرژی سالانهٔ اینورتر فضای باز (`inverterAnnualEnergyDeratePct = 3.0% × 0.35 = 1.05%` در دمای طراحی `39.0°C` تهران از `calculateEnvironmentalAging`) بر تولید خالص فیزیکی فاز ۴ (`1816762 kWh`) | `1816762` | `1797686` | `-19076` | `kWh` |
| **`P6-06`** | نرخ استهلاک سالانهٔ پنل در اقلیم ساحلی با خوردگی مه نمکی (`Coastal Salt-Mist Accelerated PV Annual Degradation Rate at d = 0.5 km`) | `calculateEnvironmentalAging` برای استراکچر زمینی (`ground_mount`) در فاصلهٔ `distanceToCoastKm = 0.5 km` از ساحل طبق `IEC 61701`؛ `before`: نادیده‌گرفتن فاصله تا ساحل (`0.45%/yr`)؛ `after`: اعمال ضریب خوردگی شدید ساحلی (`+0.15%/yr` ⇐ `0.60%/yr` و کاهش ماندگاری ۲۵ ساله از `89.3%` به `86.0%`) | `0.45` | `0.60` | `0.15` | `%/yr` |
| **`P6-07`** | ارزش فعلی خالص (NPV) نیروگاه ۱ مگاواتی در رشد تعرفهٔ حقیقی صفر با نرخ تنزیل حقیقی سازگار فیشر (`G-1 Zero-Escalation NPV under Fisher-Consistent Real Discount Rate`) | `G-1` (`1851400 kWh`): `before`: اختلاط رشد تعرفهٔ حقیقی `0%` با نرخ تنزیل اسمی `18.0%` و رشد OPEX اسمی `8.0%` در `M-F6.escalation0Pct` (`-247356 USD`)؛ `after`: ارزیابی با پروفایل `IR_FISHER_REAL_CONSTANT` (`discountRatePct = 2.6087%`, `tariffEscalationPct = 0%`, `opexEscalationPct = 0%`) | `-247356` | `381562` | `628918` | `USD` |
| **`P6-08`** | بهای تمام‌شدهٔ سطح‌بندی‌شدهٔ برق (LCOE) نیروگاه ۱ مگاواتی در زنجیرهٔ یکپارچهٔ فازهای ۴ تا ۶ (`G-1 Full-Chain Integrated LCOE with Aging Derate, 1.52 MVA Substation, Year-12 Inverter Overhaul & Salvage`) | `G-1`: مقایسهٔ خط مبنای غیرکوپل فاز ۱ (`M-F3 = 5056 Toman/kWh` / `0.0562 USD/kWh`) با خروجی `resolveFinancialSystemAnalysis` (تولید سال اول `1797686 kWh`، استهلاک `0.45%/yr`، ترانسفورماتور `1.52 MVA`، شاخص‌بندی هزینه‌های ثابت، و اورهال اینورتر در سال ۱۲ با کسر ارزش پسماند `2/15` در سال ۲۵: `5343 Toman/kWh` / `0.0594 USD/kWh`) | `5056` | `5343` | `287` | `Toman/kWh` |

================================================================================
# بخش ۵ — بررسی‌های انسجام فاز ۶ (`C6-01` تا `C6-06`)
================================================================================

هر ۶ بررسی انسجام زیر باید در `scripts/remediation/verify-phase06.ts` پیاده‌سازی شوند و همگی `pass: true` برگردانند:

1. **`C6-01` — تراز دقیق جزء‌به‌کل CAPEX و انطباق هزینهٔ پست MV با ظرفیت ترانسفورماتور هماهنگ (`CAPEX Component-to-Total Reconciliation & Coordinated Substation MVA Coherence`):**
   - در تحلیل یکپارچهٔ `G-1` با `substationTransformerMva = 1.52`:
   - `lhs`: مجموع ۱۱ جزء گردشدهٔ دلاری در `capexBreakdown` (`504352 USD`)
   - `rhs`: `capexBreakdown.totalCapexUsd` (`504352 USD`)
   - شرط گذر: `lhs === rhs` (`delta === 0`) **و** `capexBreakdown.substationMvUsd === Math.round(1.52 * 35000)` (`53200 USD`) **و** مجموع ۱۱ جزء تومانی دقیقاً برابر `capexBreakdown.totalCapexToman` (`45391651579 Toman`) و `capexBreakdown.isReconciled === true` باشد.

2. **`C6-02` — اتحاد پایستگی بهای تمام‌شدهٔ تنزیل‌شده منهای ارزش پسماند در LCOE (`LCOE Discounted Cost-Minus-Salvage Conservation Identity`):**
   - برای کیس `G-3` با `includeResidualSalvageValue: true`:
   - `lhs`: `finG3After.lcoeTomanPerKwh` (`30115 Toman/kWh`)
   - `rhs`: بازمحاسبهٔ مستقل `Math.round((totalCapexToman + sum_{t=1..25} ((opex_t + fuel_t + batRep_t + invRep_t - salvage_t) / (1+r)^t)) / sum_{t=1..25} (E_served_t / (1+r)^t))` (`30115 Toman/kWh`)
   - شرط گذر: `lhs === rhs` (`delta === 0`) **و** برای `G-1` یکپارچه نیز همین اتحاد دقیقاً برابر `5343 Toman/kWh` (`delta === 0`) برقرار باشد **و** `finG3After.lcoeTomanPerKwh < finG3Before.lcoeTomanPerKwh` (`30115 < 30643`).

3. **`C6-03` — صحت صفر شدن NPV در ریشه‌های چندگانهٔ IRR و یکتایی MIRR در جریان نقدی غیرمتعارف (`Non-Conventional Multi-Root IRR Zero-NPV & Unique MIRR Coherence`):**
   - روی جریان نقدی غیرمتعارف `P6-04` (`signChanges = 2` با دو ریشهٔ `[-12.5%, +5.4%]`):
   - `lhs`: قدرمطلق خطای نسبی ارزش فعلی خالص در ریشهٔ دقیق مثبت (`|NPV(r_root)| / totalCapexToman`)
   - `rhs`: `0`
   - شرط گذر: `lhs <= 1e-6` **و** `irrStatus === 'NON_CONVENTIONAL_MULTIPLE_ROOTS'` **و** `irrRootsPct?.length === 2` **و** `mirrPct === 14.8`.

4. **`C6-04` — هم‌سازگاری تنزیل اسمی و حقیقی فیشر و اعتبار رجیستری پروفایل‌های کشوری (`Fisher Real-vs-Nominal Discounting Equivalence & Country Profile Registry Coherence`):**
   - هنگامی که در یک جریان نقدی بدون تعویض میان‌دوره‌ای، هم درآمد تعرفه و هم کل هزینه‌های OPEX (`escalateFixedChargesWithOpex: true`) با نرخ تورم یکسان $i = 15.0\%$ رشد می‌کنند (`tariffEscalationPct = 15.0`, `opexEscalationPct = 15.0`) و با نرخ تنزیل اسمی $r_{\text{nom}} = 18.0\%$ تنزیل می‌شوند، ارزش فعلی خالص عملیاتی (پس از ضرب جریان‌های حقیقی در ضریب پایهٔ سال اول $\frac{1}{1+i}$) باید دقیقاً با ارزش فعلی خالص عملیاتی در پروفایل قیمت ثابت حقیقی (`tariffEscalationPct = 0.0`, `opexEscalationPct = 0.0`) تنزیل‌شده با نرخ تنزیل حقیقی فیشر $r_{\text{real}} = \frac{1.18}{1.15} - 1 = 2.60869565\%$ منطبق باشد:
   - `lhs`: `computeFisherRealDiscountRatePct(18.0, 15.0)` (`2.6087`)
   - `rhs`: `Number(((((1.18 / 1.15) - 1) * 100)).toFixed(4))` (`2.6087`)
   - شرط گذر: `Math.abs(lhs - rhs) <= 1e-6` **و** خطای نسبی بین ارزش فعلی خالص جریان‌های عملیاتی اسمی و حقیقی فیشر کمتر از `1e-4` باشد **و** هر سه پروفایل `IR_SATBA_NOMINAL_TOMAN`، `IR_FISHER_REAL_CONSTANT` و `INTL_USD_BENCHMARK` در `COUNTRY_FINANCIAL_PROFILES` تعریف و معتبر باشند.

5. **`C6-05` — یکنواختی اکید اقتصادی در ماتریس حساسیت سه‌محوری اجباری (`Mandatory 3-Axis 27-Point Sensitivity Matrix Economic Monotonicity`):**
   - اجرای `computeMandatorySensitivityMatrix` روی `G-1` با محورهای `tariffEscalationPct ∈ [0, 5, 15]`، `discountRatePct ∈ [12, 18, 24]` و `capexMultipliers ∈ [0.85, 1.00, 1.15]`:
   - `lhs`: تعداد نقاط معتبر ماتریس که هر سه قانون یکنواختی اکید اقتصادی ($\partial \text{NPV} / \partial \text{esc} > 0$، $\partial \text{NPV} / \partial r < 0 \land \partial \text{LCOE} / \partial r > 0$، و $\partial \text{NPV} / \partial \text{CAPEX} < 0 \land \partial \text{LCOE} / \partial \text{CAPEX} > 0$) را ارضا می‌کنند (`27`)
   - `rhs`: `27`
   - شرط گذر: `lhs === rhs` (`delta === 0`) و `matrix.isMonotonicValid === true`.

6. **`C6-06` — یکنواختی فیزیکی فرسایش محیطی ساحلی و اتصال افت حرارتی اینورتر فضای باز (`Environmental Aging Coastal Salt-Mist Monotonicity & Outdoor Inverter Derating Coupling`):**
   - `lhs`: نرخ استهلاک سالانهٔ پنل در زون ساحلی شدید (`distanceToCoastKm = 0.5 km`: `0.60%/yr`)
   - `rhs`: نرخ استهلاک سالانهٔ پنل در زون غیرساحلی (`distanceToCoastKm = 50 km` یا `undefined`: `0.45%/yr`)
   - شرط گذر: `0.60 > 0.53 > 0.45` (یکنواختی اکید بین `d = 0.5 km`، `d = 3.0 km` و `d = 50.0 km`) **و** برای `G-1` (`ground_mount`) مقدار `inverterAnnualEnergyDeratePct === 1.05` و برای `industrial_shed` (اینورتر سرپوشیدهٔ داخلی) مقدار `inverterAnnualEnergyDeratePct === 0.0` باشد.

================================================================================
# بخش ۶ — خروجی‌های تحویلی (`D6-1` تا `D6-3`) و طرح‌وارهٔ JSON
================================================================================

1. **`D6-1`:** ماژول `src/engine/core/financialContract.ts` + ویرایش‌های کمینه در `src/engine/financialEngine.ts` و `src/engine/environmentalAgingEngine.ts`.
2. **`D6-2`:** اسکریپت `scripts/remediation/verify-phase06.ts` که با دستور `npx tsx scripts/remediation/verify-phase06.ts` اجرا می‌شود، فایل `docs/audit/remediation/evidence/phase06/phase06-measurements.json` را می‌نویسد، و در صورت شکست هر یک از `C6-01` تا `C6-06` یا تغییر هر یک از ۶ لنگر غیررگرسیونی فاز ۱ (`M-A1`, `M-A2`, `M-C1`, `M-D1`, `M-F1`, `M-F4`)، با کد خروج غیرصفر (`process.exit(1)`) متوقف می‌شود.
3. **`D6-3`:** فایل شواهد `docs/audit/remediation/evidence/phase06/phase06-measurements.json` با طرح‌وارهٔ دقیق زیر:

```json
{
  "phase": "phase06",
  "generatedAtCommit": "<40-char git HEAD sha>",
  "harnessSha256": "<sha256 of scripts/remediation/verify-phase06.ts>",
  "contractSha256": "<sha256 of src/engine/core/financialContract.ts>",
  "quantities": [
    {
      "id": "P6-01",
      "name": "...",
      "unit": "USD",
      "case": "G-1",
      "before": 48632,
      "after": 53200,
      "delta": 4568,
      "producer": "src/engine/financialEngine.ts:...",
      "formula": "...",
      "reproduce": "npx tsx scripts/remediation/verify-phase06.ts --id P6-01",
      "details": {}
    }
  ],
  "coherenceChecks": [
    {
      "id": "C6-01",
      "name": "...",
      "lhs": 504352,
      "rhs": 504352,
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
| **DoD-01** | ایجاد `src/engine/core/financialContract.ts` بدون هیچ‌گونه استفاده از `any` یا سرکوب خطا | `sha256sum src/engine/core/financialContract.ts` + بازرسی کد |
| **DoD-02** | پشتیبانی از ظرفیت واقعی ترانسفورماتور پست MV (`substationTransformerMva`) در `performFinancialAnalysis` (`P6-01`: از `48632 USD` به `53200 USD` برای ترانسفورماتور `1.52 MVA` در `G-1`) | خروجی `npx tsx scripts/remediation/verify-phase06.ts --id P6-01` |
| **DoD-03** | پشتیبانی از شاخص‌بندی تورمی هزینه‌های ثابت سالانهٔ اجارهٔ زمین و حق شبکه (`escalateFixedChargesWithOpex`) در حلقهٔ ۲۵ سالهٔ OPEX (`P6-02`: از `3441138661 Toman` به `3539338299 Toman` در سال ۲۵ کیس `G-1`) | خروجی `npx tsx scripts/remediation/verify-phase06.ts --id P6-02` |
| **DoD-04** | محاسبه و کسر ارزش اسقاط/پسماند خطی عمر باقی‌ماندهٔ تعویض باتری و اینورتر (`includeResidualSalvageValue`) در سال پایانی برای LCOE و جریان نقدی (`P6-03`: کاهش LCOE کیس `G-3` از `30643` به `30115 Toman/kWh`) | خروجی `npx tsx scripts/remediation/verify-phase06.ts --id P6-03` |
| **DoD-05** | ارتقای حل‌گر IRR به اسکنر چندبازه‌ای برای تشخیص تمام ریشه‌های جریان نقدی غیرمتعارف (`irrRootsPct`)، گزارش وضعیت `NON_CONVENTIONAL_MULTIPLE_ROOTS` و محاسبهٔ `mirrPct` (`P6-04`: از `0.0%` / `null` به ریشهٔ اصلی `5.4%` و `mirrPct = 14.8%`) | خروجی `npx tsx scripts/remediation/verify-phase06.ts --id P6-04` |
| **DoD-06** | اتصال افت حرارتی اینورتر فضای باز (`inverterAnnualEnergyDeratePct = 1.05%`) و نرخ استهلاک آرنیوس پنل از `calculateEnvironmentalAging` به تحلیل مالی (`P6-05`: از `1816762 kWh` به `1797686 kWh` و `P6-08`: از `5056` به `5343 Toman/kWh`) | خروجی `npx tsx scripts/remediation/verify-phase06.ts --id P6-05` و `--id P6-08` |
| **DoD-07** | پیاده‌سازی مدل فرسایش مه نمکی سواحل (`IEC 61701`) بر حسب `distanceToCoastKm` در `calculateEnvironmentalAging` (`P6-06`: افزایش نرخ استهلاک سالانه از `0.45%/yr` به `0.60%/yr` در فاصلهٔ `0.5 km`) | خروجی `npx tsx scripts/remediation/verify-phase06.ts --id P6-06` |
| **DoD-08** | پیاده‌سازی پروفایل‌های کلان کشوری (`COUNTRY_FINANCIAL_PROFILES`)، رابطهٔ نرخ تنزیل حقیقی فیشر (`P6-07`: از `-247356 USD` به `+381562 USD` در رشد تعرفهٔ حقیقی صفر) و ماتریس حساسیت سه‌محوری ۲۷ نقطه‌ای (`computeMandatorySensitivityMatrix`) | خروجی `npx tsx scripts/remediation/verify-phase06.ts --id P6-07` |
| **DoD-09** | برقراری کامل هر ۶ بررسی انسجام `C6-01` تا `C6-06` (`pass: true`) و عدم رگرسیون کامل روی ۶ لنگر فاز ۱ (`M-A1`, `M-A2`, `M-C1`, `M-D1`, `M-F1`, `M-F4` همگی با `delta: 0`) | خروجی `npx tsx scripts/remediation/verify-phase06.ts` |
| **DoD-10** | جبرگرایی کامل: دو بار اجرای پیاپی `npx tsx scripts/remediation/verify-phase06.ts` باید فایل `phase06-measurements.json` با `sha256sum` یکسان تولید کند | خروجی دو بار اجرای پیاپی و `sha256sum` |
| **DoD-11** | صفر خطای `npm run lint` و عدم افزایش اخطارها نسبت به خط مبنا (`0 errors, 93 warnings`) | خروجی کامل `npm run lint` |
| **DoD-12** | قبولی کامل تمام تست‌های موجود در `npm test` (`196 passed, 0 failed, 0 skipped`)، شامل `P1.2.4 Schema fields === DEFAULT_FINANCIAL_PRICING fields (21, exact match)`، `[LCOE-INTEGRITY]`، `E8-ENV-1`، `E9-FIN-IRR-LCOE-1`، `E10-FIN-TARIFF-GENSET-RECONCILE` و `E10-FIN-DYNAMIC-LCOE-MODES` | خروجی کامل `npm test` |
| **DoD-13** | موفقیت کامل `npm run build` با کد خروج صفر | خروجی کامل `npm run build` |
| **DoD-14** | رعایت مطلق مرز فایل‌های مجاز و صفر بایت تغییر روی تمام فایل‌های منجمد فازهای ۱ تا ۵ و فایل‌های ممنوعه | خروجی `git diff --stat 49b89cc` و `git status --porcelain` |

================================================================================
# بخش ۸ — مرزهای ممنوعه و «چه نکن»
================================================================================

1. **فایل‌های فازهای ۱، ۲، ۳، ۴ و ۵ را لمس نکن:** هیچ‌یک از فایل‌های `scripts/remediation/measure.ts`، `scripts/remediation/fixtures/*.json`، `scripts/remediation/verify-phase02..05.ts`، `src/engine/core/solarGeometryContract.ts`، `src/engine/core/annualYieldEngine.ts`، `src/engine/core/physicalLossContract.ts`، `src/engine/core/electricalSizingContract.ts`، `src/engine/solarPvEngine.ts` و دایرکتوری‌های `docs/audit/remediation/evidence/phase01..05/` نباید حتی یک بایت تغییر کنند.
2. **هیچ کلیدی به آبجکت `DEFAULT_FINANCIAL_PRICING` اضافه نکن:** آبجکت `DEFAULT_FINANCIAL_PRICING` در `src/engine/financialEngine.ts` باید دقیقاً همان ۲۱ کلید فعلی را داشته باشد تا تست اسکیمای مهاجرت `P1.2.4` در `unitTestsCore.ts` نشکند. فیلدهای جدید را فقط به اینترفیس TypeScript `UserFinancialPricing` اضافه کن.
3. **رفتار فراخوانی پیش‌فرض `performFinancialAnalysis` با `DEFAULT_FINANCIAL_PRICING` و بدون گزینه‌های جدید را تغییر نده:** لنگرهای `M-F1 = 499784 USD` و `M-F4 = 310202 USD` در `measure.ts` و تست `[LCOE-INTEGRITY]` در `unitTestsCore.ts` به این رفتار پیش‌فرض وابسته‌اند.
4. **`src/App.tsx`، `src/components/**` و `server.ts` را لمس نکن:** اتصال کامپوننت‌های رابط کاربری به قرارداد جدید خارج از دامنهٔ این فاز است.
5. **در دروازهٔ میانه متوقف شو:** پس از پیاده‌سازی اولیهٔ `src/engine/core/financialContract.ts` و اصلاحات اولیهٔ `financialEngine.ts` و `environmentalAgingEngine.ts`، گزارش میانه را طبق قالب `§0.6` ارائه کن و منتظر دستور `APPROVED` ناظر بمان.
