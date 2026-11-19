# الحاقیهٔ وضعیت پس از merge و اصلاح provenance

**نسخهٔ بررسی‌شده:** `b28d0d41da22109fb176961a93d80c1f05d01b93`؛ شاخهٔ اجرا: `arena/cfc20741-solarpv-studio`.

**وضعیت این بسته:** اصلاح متن و برچسب با آزمون‌های محلی موفق؛ آمادهٔ بازبینی ناظر، نه مجوز ادغام. هیچ فرمول، ضریب، آستانه یا ورودی عددی عمداً تغییر نکرده است. این سند ممیزی علمی مستقل یا بازخوانی همهٔ خطوط نیست.

## اصلاح وضعیت ممیزی‌های قبلی

- BUG-02 در نسخهٔ پایه حل شده است: `aoiBeamDeg`، util هندسی AOI، fixtureهای مستقل pvlib و probe حساسیت object موجودند. آن را باگ باز قرارداد کتابخانه‌ای ننامید.
- حل BUG-02 به معنی اتصال IAM هندسی به yield زندهٔ UI نیست. `src/App.tsx` در `waterfallReport` هنوز `iamLossPct: -2.2` می‌دهد؛ ورودی ثابت، خودبه‌خود معادل IAM ساعتی نیست.
- `waterfallReport` مشترک در App ساخته می‌شود و مصرف‌های FinancialTab، WaterfallLossTab و گزارش رسمی از همان مسیرند. وجود موتورهای canonical/unified موازی، به‌تنهایی اختلاف مشاهده‌شدهٔ عددهای تب‌ها را ثابت نمی‌کند. عنوان S-01/P1 در گزارش‌های قبلی، بدون شاهد بازتولید اختلاف UI، مبنای اعلام باگ UI نیست؛ مسیرهای بدون مصرف UI فعلاً بدهی معماری/پوشش آزمون هستند.
- اسناد `AUDIT-COMPREHENSIVE-2026-11-17.fa.md` و Brief هم‌تاریخ در این checkout موجود نیستند. این الحاقیه آن‌ها را بازسازی یا جایگزین نمی‌کند. ممیزی‌های قدیمی باید در زمینهٔ commit خود خوانده شوند.

## یافته‌ها و اقدام محدود

| شدت | شواهد در نسخهٔ پایه | اصلاح متن این بسته / باقی‌مانده |
|---|---|---|
| P1 | `snow/marionSnowEngine.ts`: انتساب رابطهٔ نمایی و gamma=4.49 به Marion | انتساب قطعی پس گرفته شد؛ رابطه و ضریب داخلی screening معرفی شدند. نام‌های API برای سازگاری حفظ شدند. مدل یا درصد loss علمی معتبر معرفی نمی‌شود؛ اعتبارسنجی ساعتی مستقل هنوز باز است. |
| P1 | `soiling/kimberSoilingEngine.ts`: بخش/جدول/معادله و معادل‌بودن SAM/PVsyst بدون شواهد تأییدشده | ارجاع دقیق تأییدنشده پس گرفته شد؛ Kimber صرفاً پیشینهٔ موضوع است. binها و درصدهای موجود، assumed/internal یا تنظیم کاربرند. هیچ عددی عوض نشد. |
| P1 | `bifacial/bifacial2dViewFactor.ts` از قبل مدل را heuristic و نه Hottel اعلام می‌کند، ولی `physicalLossContract.ts` هنوز Hottel را ادعا می‌کرد | توصیف قرارداد با واقعیت منطبق شد؛ waterfall فارسی/انگلیسی هشدار screening و نبود اعتبار مستقل دارد. الگوریتم bifacial دست‌نخورده است. |
| P2 | waterfall، گزارش رسمی و metadata همچنان انتساب قطعی Kimber/Marion داشتند | برچسب‌ها و گزارش fallback به screening/assumed تغییر کردند. ادعای کالیبراسیون با بارش و شستشوی رباتیک قطعی در fallback پس گرفته شد؛ نرخ نمایشی 3.5% دست‌نخورده است. |

در waterfall، صفر بودن ورودی loss برف اثبات نبود برف در سایت نیست. درصدهای نمایشیِ این مسیر، بدون provenance دادهٔ سایت یا اعتبارسنجی مستقل، تضمین تولید یا bankable yield نیستند.

## بررسی عدم تغییر محاسبات

مقایسهٔ AST/token با نسخهٔ پایه، پس از کنارگذاشتن محتویات string و JSDoc، در هر شش فایل تغییرکردهٔ `src/engine` یکسان بود. بنابراین عملگرها، شناسه‌ها، literals عددی، قراردادها و ساختار محاسباتی این شش فایل تغییر نکردند. این بررسی مرجع علمی نیست. در TSX فقط متن گزارش اصلاح شده و ادعای استخراج مدل از annualRainfallMm حذف شده است؛ locale فارسی/انگلیسی انتخاب متن را تعیین می‌کند، نه عدد گزارش را.

## نتایج آزمون محلی

- `npm run lint:types`: موفق.
- `npm run lint:eslint`: موفق؛ صفر خطا و ۹۵ هشدار.
- `npm run build`: موفق؛ هشدار chunk بزرگ باقی است.
- `npm test`: موفق.
- `npm run verify:engine-claims`: موفق، شامل guardهای provenance جدید؛ assertionهای قبلی باقی‌اند.
- `npm run test:physics-reference-gate`: موفق؛ regressionهای قبلی و جدید باقی‌اند.
- `npm run test:audit`: موفق (پس از اصلاح context-aware مجازشده).
- `npm run test:gateway`: موفق؛ 24/24.
- `PHYSICS_DIFF_BASE=b28d0d41 npx tsx scripts/verify-physics-reference-gate.ts`: موفق؛ بدون تغییر expression فیزیکی نسبت به base و با اجرای fixtureهای ثبت‌شدهٔ موجود.

### مانع اولیه و رفع محدود آن

اجرای اولیهٔ `test:audit` ناموفق بود: detector برای توضیح‌های فارسی/انگلیسی برف، شناسه‌های `computeWaterfallLosses#85396c0f10ad` و `#bcace70942a8` را فرمول جدید می‌دید. به موجب مجوز محدود مالک، detector فقط در مسیر `src/engine/waterfallLossEngine.ts` و بدنهٔ مستقیم `computeWaterfallLosses` بررسی می‌کند:

1. conditional آرگومان مستقیم شمارهٔ ۵ یا ۶ (اندیس ۴ یا ۵) فراخوانی `addStage` برای stage با id برابر `snow` باشد؛
2. هر دو شاخه literal رشته‌ای باشند؛ expressionهای محاسباتی در شاخه‌ها معاف نیستند؛
3. binding محلی و یکتای `const addStage` یک arrow function باشد؛ پارامترهای توضیح هرکدام فقط یک بار، برای مقداردهی فیلد متناظر `descriptionFa`/`descriptionEn` مصرف شوند؛ مصرف عددی یا اضافی باعث عدم معافیت می‌شود.

فقط payload نمایشی از ثبت فرمول کنار می‌رود؛ شرط انتخاب متن همچنان پیمایش و ثبت می‌شود. هیچ hash یا formulaId به‌صورت موردی مستثنا نشده و هیچ string عمومی حذف نمی‌شود. manifest، fixtureها، workflow و assertionهای مرجع/بازدید AST/حساسیت دست‌نخورده‌اند.

Regression مثبت هر دو زبان و هر دو شاخه را پوشش می‌دهد. Regressionهای منفی تغییر ضریب/علامت loss، شرط و آستانه، stage دیگر، فایل دیگر، موقعیت آرگومان نام stage، مصرف عددی متن در helper، شاخهٔ محاسباتی، `Number(...)` و string انتخاب‌کنندهٔ مدل را نیازمند fixture می‌دانند. این قاعده تحلیل عمومی dataflow نیست؛ فقط context تصریح‌شدهٔ همین گزارش را پوشش می‌دهد.

لاگ‌های محلی در `.cache/provenance/` بخشی از commit نیستند. شکست اولیه با موفقیت نهایی جایگزین و مستند شده است؛ merge همچنان نیازمند بازبینی ناظر و تأیید مالک است.

## بیرون از دامنه

پیاده‌سازی مرجع snow/soiling، اعتبارسنجی SAM/pvfactors، مسیر TMY/8760، clipping ساعتی، ضرایب tracker، offsetهای حرارتی، تغییر UI state، JWT/CSP، persist و snapshot و budget bundle. هیچ ادعای تأیید production/IdP یا اعتبار علمی مدل سالانه از آزمون نرم‌افزاری نتیجه نمی‌شود.

## تکمیل پس از بازبینی ناظرِ `21867004`

بازبینی ناظر detector را پذیرفت ولی ادعاهای legacy باقی‌مانده را مسدودکننده دانست. اصلاح تکمیلی فقط متن، metadata و guardهای این نقاط است:

- `crossValidation` و `goldenDatasets`: هر دو target برف و soiling داخلی/فرضی معرفی شده‌اند؛ confidence آن دو `estimated` است و URL منبع مستقل حذف شده است. شناسه، ورودی، target، tolerance، نوع tag و شمارنده‌ها تغییر نکردند. tag از نوع `cross_validation` صرفاً نام طبقه‌بندی تاریخی است، نه مدرک استقلال.
- `marionSnowRecalibration`: عنوان، توضیحات، citation سناریوها و summaryNotes دیگر ادعای NREL/DWD/Andrews & Pearce calibration یا رکورد تجربی ندارند؛ weatherها synthetic و targetها داخلی معرفی شده‌اند. نام export و HUB-SNOWها صرفاً شناسهٔ سازگاری باقی‌اند.
- خروجی legacy `annualYieldEngine`: نام lossهای snow/soiling به screening/assumed تغییر کرده است.
- `environmentalAgingEngine`: مقدار 4.2 فرض داخلی است، نه ضریب Kimber یا اندازه‌گیری منطقه‌ای؛ مقدار تغییر نکرده است.
- کامنت waterfall و توضیحات تست‌ها از ورودی loss صفر، نبود برف در اقلیم را استنتاج نمی‌کنند. عنوان‌های تست سناریو نیز داخلی‌اند؛ assertionهای عددی حفظ شده‌اند.
- `verify-engine-claims`: guardهای runtime روی metadata دو metric و guardهای هدفمند روی پنج فایل دیگر افزوده شد. بازگرداندن `calibrated`، ادعای منبع مستقل، کالیبراسیون یا برچسب‌های legacy با regressionهای منفی رد می‌شود. این guardها ممیزی معنایی کل repository نیستند.

در مقایسهٔ مستقیم با والد `21867004`، تمام ۳۷ برگ عددی خروجی crossValidation و ۴۸ برگ عددی گزارش سناریوهای برف دقیقاً یکسان بودند. numeric literals و عملگرهای هفت فایل موتور تغییرکرده نیز یکسان‌اند. این شواهد عدم تغییر محاسبات در موارد آزموده‌شده است، نه تأیید علمی targetها.

Typecheck، ESLint (صفر خطا/۹۵ هشدار)، build، `npm test`، اجرای کامل `test:audit`، gateway (24/24)، guardهای provenance و gate نسبت به `21867004` موفق شدند. detector پذیرفته‌شده، manifest، fixtureهای مرجع و workflow تغییر نکرده‌اند. هیچ ادعای تأیید نهایی ناظر یا اجازهٔ merge از این تکمیل نتیجه نمی‌شود.
