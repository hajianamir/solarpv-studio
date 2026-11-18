# گزارش ممیزی جامع SolarPV Studio — مهندسی، فرمول‌ها، Frontend و نقشهٔ راه

| | |
|---|---|
| **پروژه** | SolarPV Studio (شاخهٔ `arena/b3648451-solarpv-studio`، مبتنی بر `64f173a`) |
| **نسخهٔ ممیزی** | 1.0.3 |
| **تاریخ ممیزی** | 2026-11-17 |
| **دامنه** | کل کد (~۶۲٬۰۰۰ خط TypeScript/TSX + ~۱٬۹۲۰ خط سرور Express): موتورهای محاسباتی، وضعیت/رابط کاربری، سرور، بیلد، تست‌ها |
| **روش** | مطالعهٔ خط‌به‌خط فایل‌های محاسباتی؛ اجرای واقعی بیلد/تست/لینت؛ پروب‌های عددی؛ تحقیق وب از مراجع استاندارد (pvlib، IEC، NREL، IEEE، Duffie & Beckman) |
| **وضعیت اجرای خودکار در زمان ممیزی** | ✅ `npm run build` موفق · ✅ `npm run lint:types` بدون خطا · ✅ `npm run lint:eslint` ۰ خطا / ۹۵ هشدار · ✅ `npm test` (بنچمارک‌های داخلی) همگی PASS · ⚠️ «سبز بودن تست‌ها» به‌معنای «bankable بودن» نیست — رجوع به §1 |

> **توجه مهم:** این ممیزی مستقل است و جایگزین «ممیزی‌های قبلی» موجود در `docs/audit/` **نیست**؛ اما با آن‌ها مقایسهٔ موردی انجام شده و یافته‌های تکراری/حل‌شده/جدید علامت‌گذاری شده‌اند. رتبه‌بندی شدت: **P0 بحرانی، P1 بالا، P2 متوسط، P3 پایین/بهبود.**

---

## فهرست

1. [خلاصهٔ مدیریتی اجرایی](#۱-خلاصهٔ-مدیریتی-اجرایی)
2. [نتیجهٔ اجرای خودکار و معنای آن](#۲-نتیجهٔ-اجرای-خودکار-و-معنای-آن)
3. [معماری و روابط بین کدها — یافته‌های ساختاری](#۳-معماری-و-روابط-بین-کدها--یافته‌های-ساختاری)
4. [ممیزی خط‌به‌خط فرمول‌ها و الگوریتم‌ها با مراجع](#۴-ممیزی-خط‌به‌خط-فرمول‌ها-و-الگوریتم‌ها-با-مراجع)
5. [ممیزی سرور و امنیت](#۵-ممیزی-سرور-و-امنیت)
6. [تحقیق گستردهٔ بهینه‌سازی Frontend](#۶-تحقیق-گستردهٔ-بهینه‌سازی-frontend)
7. [تحقیق افزودن قابلیت‌های پیشرفتهٔ مهندسی](#۷-تحقیق-افزودن-قابلیت‌های-پیشرفتهٔ-مهندسی)
8. [جدول اولویت‌بندی یافته‌ها](#۸-جدول-اولویت‌بندی-یافته‌ها)
9. [نقشهٔ راه پیشنهادی](#۹-نقشهٔ-راه-پیشنهادی)
10. [نکات مثبت قابل توجه](#۱۰-نکات-مثبت-قابل-توجه)
11. [محدودیت‌های این ممیزی](#۱۱-محدودیت‌های-این-ممیزی)
12. [مراجع](#۱۲-مراجع)

---

## ۱. خلاصهٔ مدیریتی اجرایی

### ۱.۱ جمع‌بندی در یک پاراگراف

SolarPV Studio یک کدبیس **بزرگ، جدی و مهندسی‌محور** است: TypeScript با `strict: true`، معماری لایه‌ای نسبتاً منظم (React + Vite + Express)، اعتبارسنجی ورودی گسترده در سمت سرور، نرمال‌سازی/تبدیل قراردادی واحدها (branded types)، یک مسیر «تک‌منبعی» برای derating حرارتی، یک بنچمارک ۵-مسیرهٔ همگرایی و موتورهای نسبتاً وفادار به pvlib (به‌ویژه بک‌ترکینگ ردیاب). **اما** در لایهٔ فرمول‌های «نمایشی/بازاری» (bifacial، snow، soiling، transposition، clipping) کد از آنچه که در بنر/نام فایل ادعا می‌کند **فاصله دارد**: به‌جای مدل‌های منتشرشده، هیوریستیک‌های داخلی با اعداد دلخواه و citationهای بیش‌دقیق/غلط استفاده شده است. همچنین یک باگ محاسباتی اثبات‌شده (IAM با zenith به‌جای زاویهٔ تابش واقعی — بیش‌برآورد افت اپتیکی تا ~۳٫۶ امتیاز درصد در زمستان روی پنل شیب‌دار)، آلبیدوی ثابت و واگرایی بین موتورهای yield موازی وجود دارد. Frontend از نظر معماری «تقریباً خوب اما سنگین و یکپارچه» است: باندل اصلی ~۸۷۳KB و OfficialReportModal ~۱.۲۶MB.

### ۱.۲ آمار کلیدی ممیزی

| شاخص | مقدار |
|---|---|
| خطوط کل (src) | ۶۲٬۲۵۳ |
| خطوط موتورها (src/engine) | ۳۸٬۸۵۸ |
| خطوط کامپوننت‌ها (src/components) | ۲۲٬۷۷۵ |
| خطوط `server.ts` | ۱٬۹۲۴ |
| بزرگ‌ترین فایل تست/داده | `src/engine/core/benchmarks/unitTestsCore.ts` (۵٬۹۷۹ خط) |
| بزرگ‌ترین کامپوننت | `src/App.tsx` (۳٬۲۸۳ خط، ~۴۲ `useState` در یک کامپوننت) |
| تعداد فایل‌های ممیزی‌شده (مطالعهٔ کامل) | ~۶۰ فایل موتور/قرارداد + سرور + پیکربندی‌ها و نقاط کلیدی UI |
| موارد `as any` در src | ۴۸ مورد (۱۹ مورد صرفاً در unitTestsCore) |
| هشدارهای ESLint | ۹۵ (۰ خطا) |
| محاسبات راستی‌آزمایی‌شده با پروب عددی | موقعیت خورشید در ۹ سناریو (هم‌نیمه‌شمالی/جنوبی/قطبی)، POA، IRR، LCOE، سایزینگ رشته، افت ولتاژ — همگی ✅ |
| یافته‌های P0/P1 | ۰ / ۳ |
| یافته‌های P2 | ~۲۳ |
| یافته‌های P3 | ~۱۴ |

### ۱.۳ رای نهایی

- **به‌عنوان ابزار screening/طراحی اولیهٔ داخلی:** قابل قبول با اصلاح P1ها.
- **به‌عنوان ابزار «bankable» یا مدرک برای PPA/تأمین مالی:** در وضعیت فعلی **قابل قبول نیست**؛ نیاز به جایگزینی هیوریستیک‌های §4.9–§4.12 با مدل‌های اعتبارسنجی‌شده و نمایش disclaimer یکپارچه در UI/گزارش دارد (کد خودش این را می‌داند؛ رابط کاربری همیشه این را منعکس نمی‌کند).
- **به‌عنوان نمونهٔ معماری تمیز React/Express:** متوسط؛ معماری لایه‌ای و قراردادهای واحدها عالی‌اند، اما monolith UI و وابستگی‌های باندل مشکل‌سازند.

---

## ۲. نتیجهٔ اجرای خودکار و معنای آن

| بررسی | فرمان | نتیجه | تفسیر ممیزی |
|---|---|---|---|
| بیلد تولیدی | `npm run build` | ✅ ۱۵s، manifest + SW precache تولید شد | chunkهای بزرگ: `index-*.js` ≈ ۸۷۳KB (≈۲۵۵KB gzip)، `OfficialReportModal-*.js` ≈ ۱٬۲۶۰KB (≈۳۵۹KB gzip)، `unitTestsCore-*.js` ≈ ۲۶۰KB |
| تایپ‌چک | `npm run lint:types` | ✅ بدون خطا (client + node) | `strict: true` فعال؛ خوب |
| ESLint | `npm run lint:eslint` | ✅ ۰ خطا، ۹۵ هشدار (`no-explicit-any` و مشابه) | بده بدهی تایپی در مرزها (مرز import/migration) |
| تست موتور | `npm test` (run-all-benchmarks) | ✅ «ALL 6 BENCHMARKS, RECALIBRATED HUBS & BIPV/T PASS» | **اما** این‌ها «Stored multi-climate target comparison (not an executable SAM comparison)» هستند؛ یعنی **مقایسه با مقادیر ذخیره‌شده**، نه اجرای مستقل SAM/pvlib. سند داخلی هم به این صراحت دارد — لذا نباید به‌عنوان «validated against SAM» نقل شود |
| تست‌های قرارداد و دروازه‌ها | `npm run test:audit` (R01-R07، Areas 1-10، M01-M22، all-phases، API sizing/thermal، F-04، geocode cache) + CI jobs (build/test روی Node 20/22، smoke، gateway، **browser regressions با Chromium**، verify:exports، engine-claims، physics-reference-gate) | در این ممیزی اجرا نشدند؛ CI آن‌ها را روی هر push اجرا می‌کند | CI بسیاری از دروازه‌های مهندسی دارد؛ آنچه سبز است یعنی «invariants داخلی برقرار است»، نه «فیزیک مستقل تأیید شده است». توجه: `verify:engine-claims` باید زنجیرهٔ snow/soiling/bifacial را هم پوشش دهد (رجوع §۶ و فاز ۲) |

**جمع‌بندی:** زیرساخت کیفی (scripts، gateها، evidence JSONها) یک دارایی مهم است. اما شکاف اصلی «کد تئوری خوب ↔ اعتبارسنجی مستقل بیرونی» است: هیچ فایل SAM reference در حال اجرا مقایسه نمی‌شود؛ خروجی‌ها با نسخه‌های ثابت خود مقایسه می‌شوند (self-consistency).

---

## ۳. معماری و روابط بین کدها — یافته‌های ساختاری

### ۳.۱ نقشهٔ لایه‌ها (همان‌گونه که در کد هست)

```
Browser (React 18 + Vite)                 server.ts (Express, tsx)
  App.tsx (3283 خط)                        ─ routes اعتبارسنجی دستی
   ├─ lazy tabs (React.lazy) ────────────►  /api/v1/solar/* /electrical/* /finance/* ...
   ├─ src/engine/* (همان‌جا import)         src/server/clientRateLimit.ts
   ├─ shadingWorker (Web Worker)            ExternalDataGateway
   └─ PWA (sw.js سفارشی + precache build)    ├─ climateDataProvider  (NASA POWER / PVGIS / Nominatim / Overpass)
                                              ├─ soilDataProvider    (SoilGrids)
                                              ├─ structuralHazardProvider (seismic)
                                              ├─ circuitBreaker / geocodeCache / providerRequestLimiter
                                              └─ REGIONAL_ANALYTICAL_MODEL (fallback تحلیلی)
```

نکات:
- موتورها **مستقیماً در bundle فرانت‌اند** import می‌شوند (محاسبات سمت کلاینت انجام می‌شود)؛ سرور عمدتاً برای: persist پروژه‌ها (فایل JSON روی دیسک)، پروکسی دادهٔ زنده (با cache/limit)، و endpointهای مرجع پاسخ می‌دهد. این «hybrid client-heavy» عمداً است (ADR-001) ولی دو نسخهٔ موازی محاسبه در کلاینت و سرور شکل گرفته است.
- `InMemorySolarDatabase` + `data/solar-db-snapshot.json`: ماندگاری بین ری‌استارت‌ها، بدون DB واقعی. مناسب single-node؛ برای چند replica مُهم.

### ۳.۲ یافته S-01 — دو (در واقع سه تا پنج) مسیر موازی محاسبهٔ yield که با هم واگرا هستند — P1

چهار (پنج) پیاده‌سازی رقیب برای «انرژی سالانه» وجود دارد:

| مسیر | فایل | فرمول مؤثر |
|---|---|---|
| Waterfall | `waterfallLossEngine.ts` | `POA = GHI × (1 + transpositionGainCurve)` با `calculateFixedTiltTranspositionGain` (منحنی سینوسی دستی، پیش‌فرض tilting نامعلوم = **+16.8%**) |
| AnnualYield (canonical) | `core/annualYieldEngine.ts` `computeCanonicalAnnualYield` | پیچیدن waterfall — یکپارچه ✓ ولی باز هم روی همان transposition متکی است |
| Unified | `core/annualYieldEngine.ts` `calculateUnifiedAnnualYield` | `POA = GHI × (1.168 ثابت ثابت)` یا `×1.25` با ردیاب |
| pvEngineAdvanced | `pvEngineAdvanced.ts` | `yield = kWp × PSH × derate × 365` — **بدون ترانپوزیشن POA اصلاً** (poa gain ≈ 0) |
| quickSizing / simulation24h | `solarPvEngine.ts` / `simulation24hEngine.ts` | derate ثابت ۰٫۷۸ و پروکسی سینوسی |

**شواهدی از واگرایی (با اعداد خود کد):**
- برای یک آرایهٔ ثابت tilt=30, lat=35.7: waterfall می‌دهد `POA ≈ GHI × 1.173`؛ unified ثابت می‌دهد `× 1.168`؛ pvEngineAdvanced می‌دهد `× 1.0`. اختلاف سیستماتیک تا **~17%** در «specific yield» بین مسیرهای محاسباتی.
- **اصلاح پس از بازبینی موضعی (2026-11-17):** مصرف‌کنندهٔ UI مسیرهای `computeCanonicalAnnualYield` و `calculateUnifiedAnnualYield` را پیدا نشد؛ هر دو فقط توسط اسکریپت‌های تأیید CI (`scripts/remediation/verify-phase03.ts` و `verify-phase04.ts`) استفاده می‌شوند. مسیر کاربری زندهٔ فعلی یک `waterfallReport` واحد و ممویافته (`App.tsx:1153`) است که هم `annualYieldKwh` و هم رندر تب‌ها (WaterfallLossTab/FinancialTab/RFC3) از آن تغذیه می‌کنند — بنابراین «اختلاف قابل‌مشاهدهٔ اعداد بین تب‌ها» در checkout فعلی **تأیید نمی‌شود** و ادعای قبلی این گزارش پس گرفته می‌شود. `reconcile5PathConvergence()` (isConverged ⇔ dispersionRatio ≤ 1.05؛ `annualYieldEngine.ts:466`) تنها در اسکریپت verify-phase03 مصرف می‌شود.
- `computeWaterfallLosses` مرحلهٔ `mv_transformer` (−1.5%) را **بدون شرط ظرفیت** اعمال می‌کند؛ ولی `calculateUnifiedAnnualYield` آن را فقط برای `capacity ≥ 50 kWp` اعمال می‌کند. دو گزارش PR متفاوت برای همان سیستم.
- مرحلهٔ clipping در waterfall و `calculatePhysicalClippingLossPct` و derating در pvEngineAdvanced سه فرمول جدا دارند.

نکات تکمیلی: `computeCanonicalAnnualYield` پیش‌فرض‌های هاردکد شده دارد (`soilingLossPct=4.5`، `iamLossPct=-2.2`، `noctC=45`، `tempCoeffPmpPct=-0.30`) و ترانپوزیشن waterfall را می‌خواند. `buildWaterfallArgs` مقادیر dcCabling/inverterEfficiency/mppt/transformer را تزریق نمی‌کند؛ پس پیش‌فرض‌های هاردکد `-1.4/-0.4/-2.2/-1.5` همه‌جا جاری می‌شوند (کاتالوگ `efficiencyMaxPct` استفاده نمی‌شود).
**درمان:** یک facade واحد «EstimateAnnualYield» که فقط waterfall را صدا می‌زند و بقیه را deprecated می‌کند؛ UI تمام تب‌ها همان عدد را بخوانند؛ `reconcile5PathConvergence` را در گزارش رسمی چاپ کنید؛ آزمون رگرسیون «consistency assertion» برای همهٔ مسیرها که در CI fail شود اگر اختلاف از ۱٪ بیشتر شد.

### ۳.۳ یافته S-02 — `App.tsx` monolith: ۳٬۲۸۳ خط، ~۴۲ useState، بدون Context/Reducer سراسری — P2

- هر تغییر state در ریشه باعث re-render کل درخت تب می‌شود (تب‌ها conditional هستند ولی محاسبات `useMemo` وابسته به stateهای ریشه دوباره اجرا می‌شوند؛ و `useEffect`های زیاد (~37) زنجیرهٔ وابستگی پیچیده‌ای ساخته‌اند).
- LocalStorage با کلیدهای متعدد (`solarpv_project_*`) و `JSON.parse` مستقیم؛ خطای parse به‌صورت try/catch امن است، ولی **schema validation روی دادهٔ import شدهٔ کاربر وجود ندارد** (مثلاً `TrackerConfig` یا loads از فایل import شده بدون zod parse وارد state می‌شود — در `projectMigration.ts` zod استفاده شده ولی در مسیر import پروژه در App نه).
- هیچ React Context برای theme/lang/project وجود ندارد؛ prop drilling شدید به تب‌ها.

### ۳.۴ یافته S-03 — ارسال «تست‌سوییت» و بنچمارک‌ها به مرورگر کاربر — P2

- `RFC3ReportsTab.tsx` به‌صورت `import` ایستا `crossValidation` و `lhsBenchmark` و `migrationTestVectors` را می‌کشد؛ و `unitTestsCore` (۵٬۹۷۹ خط دادهٔ تست) به‌صورت dynamic chunk جدا (~۲۶۰KB) لود می‌شود. داده‌های «golden datasets» و «benchmark fixtures» جزئی از bundle تولیدی هستند.
- در صورت رعایت اصل، این‌ها باید: (الف) فقط در `scripts/` و CI اجرا شوند؛ یا (ب) پشت `import.meta.env.DEV` یا یک پرچم build پنهان شوند؛ یا (ج) به یک گزارش build-time تبدیل شوند.

### ۳.۵ یافته S-04 — `InMemorySolarDatabase.importSnapshot` نیم‌سازگار و بدون اعتبارسنجی — P2

`src/engine/solarPvEngine.ts:225`:
```ts
if (Array.isArray(snapshot.projects)) this.projects = new Map(snapshot.projects); // جایگزینی کامل
if (Array.isArray(snapshot.pvModules)) snapshot.pvModules.forEach(...)            // فقط merge
```
- پروژه‌ها **جایگزین** می‌شوند ولی ماژول/اینورتر/باتری **merge** می‌شوند — نیم‌سازانگار بودن مرز import منجر به حالت «پروژهٔ تازه با catalog قبلی مخلوط» می‌شود.
- هیچ validation روی shape/typage/range داده‌ها نیست (مثلاً `projects` می‌تواند هر چیزی باشد)؛ snapshot روی دیسک توسط خود سرور نوشته می‌شود، ولی اگر فایل خارجی تزریق شود، خطاهای دیرهنگام/مخرب ممکن است.
- `exportSnapshot` هم `outbox: any[]` بدون مرز نگه می‌دارد.
- `saveDatabase()` در هر mutation، **persist سنکرون با `writeFileSync` + rename روی کل snapshot** انجام می‌دهد (`server.ts` خطوط ۹۲۲، ۱۰۳۲، ۱۱۳۴، ۱۲۳۰، ۱۳۲۰، ۱۸۱۴). با بزرگ شدن DB این درخواست‌ها event loop را block می‌کنند؛ تجمیع debounce یا صف نوشتن لازم است.

### ۳.۶ یافته S-05 — مسیرهای موازی و کد تکراری ساختاری — P3

- `structureRecommendationEngine.ts` و `structural/structureRecommendationEngine.ts` و همچنین `structuralContract.ts` و `structuralEngine.ts` و `structureRecommendationEngine` همگی برای «پیشنهاد سازه» وجود دارند؛ مرز مسئولیت‌ها در ADR-007 مستند است ولی هنوز سه لایهٔ API برای یک مفهوم وجود دارد.
- `inverterClustering.ts` در UI و RFC3 همزمان مصرف می‌شود؛ نام «clustering» برای «bay grouping» گمراه‌کننده است.
- `simulateTrackerAnnual` دو بار (waterfall + tests) با `buildClearSkySunPath` به‌عنوان «نمایندهٔ سال» صدا زده می‌شود؛ چون خروجی آب‌وهوای واقعی ساعتی نیست، «annualShadingLossFraction» یک برآورد clear-sky است و نباید در UI به‌عنوان «Loss measured» نمایش داده شود.

### ۳.۷ یافته S-06 — تست‌های واحد «داخل» production source — P3

`src/engine/core/benchmarks/unitTestsCore.ts` و `goldenDatasets.ts` و دیگران زیر `src/` هستند؛ اگرچه chunk جدا دارند، ولی tree-shaking کامل رخ نمی‌دهد (به `RFC3ReportsTab` مراجعه کنید) و سطح حمله/حجم افزایش می‌یابد. پیشنهاد: انتقال کامل به `scripts/` + `test/` و حذف از بستهٔ مرورگر؛ یا حداقل flag `#if`-style با `import.meta.env.PROD === false`.

---

## ۴. ممیزی خط‌به‌خط فرمول‌ها و الگوریتم‌ها با مراجع

> قرارداد علامت‌گذاری: ✅ صحیح/قابل قبول · 🟡 تقریب پذیرفتنی با مستندسازی · 🟠 هیوریستیک غیرمعتبر/غیرمعتبرسازی‌شده · ❌ اشتباه/باگ

### ۴.۱ موقعیت خورشید NOAA-style — `solarPvEngine.ts:502–... calculateSolarPosition` — ✅ تأییدشده با پروب

الگوریتم، پیاده‌سازی استاندارد NOAA/Astronomical Algorithms است: میانگین طول جغرافیایی خورشید، معادلهٔ مرکز، تقویم ژولیانی (epoch 946728000 = 2000-01-01)، eqOfTime، hourAngle. `azimuthDeg = (toDeg(azimuthRad) + 180) % 360` قرارداد «از شمال، جهت عقربهٔ ساعت» می‌دهد (۰=شمال، ۹۰=شرق، ۱۸۰=جنوب، ۲۷۰=غرب).

**راستی‌آزمایی عددی مستقل در همین ممیزی** (مقایسه با فرمول مرجع `az = atan2(sinH, cosH·sinφ − tanδ·cosφ) + 180°` از مدار صفرپایهٔ pvlib):

| سناریو | خروجی کد | مقدار مرجع | تطبیق |
|---|---|---|---|
| گرینوچ 2026-03-20 12:00Z، φ=0 | Z=1.86°، az=91.3° (☀ ناشی از EoT≈−7.5′) | Z≈1.9° | ✅ |
| تهران 2026-06-21 08:30Z (ظهر محلی) | az=173.3°، alt=77.7° | az≈173° | ✅ |
| تهران 2026-12-21 08:30Z (ظهر محلی) | az=179.3°، alt=30.9° | az≈180° | ✅ |
| Tromsø 2026-06-21 12:00Z | az=203.3°، alt=42.5° | az_ref≈203.1° | ✅ |
| Tromsø 2026-06-21 00:00Z (خورشید نیمه‌شب) | az=17.0°، alt=4.0° | az_ref≈16.9° | ✅ |
| سیدنی 2026-12-21 02:00Z (ظهر محلی) | az=351.2°، alt=79.5° | az≈351° | ✅ |
| سیدنی 2026-06-21 02:00Z (ظهر زمستانی) | az=359.2°، alt=32.7° | az≈359° | ✅ |
| کیپ‌تاون 2026-12-21 11:00Z | az=340.9°، alt=79.0° | az≈341° | ✅ |
| ریکیاویک 2026-06-21 12:00Z | az=149.4°، alt=46.7° | az≈149° | ✅ |

**نکات حاشیه‌ای (نه خطا):** (۱) در عرض‌های دقیقًا قطبی (|φ|=90°) و در لحظهٔ عبور خورشید از سرسو (zenith passage) آزیموت به‌طور ذاتی گسسته است (پرش از ۹۰ به ۲۷۰) — این ویژگی هندسی مسئله است نه باگ؛ (۲) `geomMeanLongSun` با `% 360` برای تاریخ‌های پیش از 2000 می‌تواند مقدار منفی بدهد (امروز بی‌اثر)؛ (۳) `normalizeUtcTimestampSeconds` برای timestamp<0 خطا می‌دهد ✅. **نتیجه: این موتور از نظر فیزیکی سالم است و بهترین لایهٔ اطمینان‌بخش کد است.**

### ۴.۲ ارتفاع ظهر انقلاب زمستانی — `solarGeometryContract.ts:165` — ✅ (با کلام مناسب)

`alt = 90 − |φ| − 23.45` با clamp حداقل ۵° برای هم‌وتد قابلیت استفادهٔ داخلی. برای lat=0 می‌دهد 66.55° ✓. clamp باعث می‌شود در قطبین سایه/فاصله ردیف کمتر از واقعیت برآورد شود — مستند شده اما باید در UI «Unassessed beyond polar circle» علامت بخورد.

### ۴.۳ ترانپوزیشن POA — Perez 1990 + Kasten 1966 airmass — `solarPvEngine.ts:598–680` — ✅ هستهٔ صحیح + چند نقص — P2

**دقیق بررسی شد و تطبیق داشت:**
- `airMass = 1 / (cosZ + 0.15·(93.885 − Z°)^{-1.25})` — ساختار **Kasten (1966)** است (pvlib `kasten1966`؛ توان مرجع `-1.253` است — رجوع نقص‌ها) 🟡.
- جدول ۸ بین Perez1990 (f11..f23) با جدول 2.5.1 Duffie & Beckman (ویرایش 4) تطبیق دارد (نمونهٔ باین ۱: f11=-0.008/f12=0.588/f13=-0.062؛ باین ۸: 0.678/−0.327/−0.250؛ f21..f23 باین ۸: 0.156/−1.377/0.251). ✅ (جدول عیناً با منبع باز gendaylit/pvlib تطابق دارد — راستی‌آزمایی مستقل این ممیزی.)
- فرمول `beam = DNI·max(0,cosInc)`، `diffuse = DHI·[(1−f1)(1+cosβ)/2 + f1·a/b + f2·sinβ]`، `a=cosInc`, `b=max(0.0872, cosZ)` — مطابق Perez 1990 (راستی‌آزمایی با سورس pvlib `irradiance.perez` و Radiance `gendaylit.c` انجام شد). ✅
- `ε = ((DHI+DNI)/DHI + 1.041·Z³)/(1+1.041·Z³)` — دقیقاً مطابق pvlib/gendaylit ✅ (برخلاف نگرانی اولیهٔ ممیزی، هیچ cosZ گم نشده — فرمول مرجع همان است).
- POA صفر وقتی Z≥90° ✅.

**نقص‌ها:**
1. **آلبیدوی ثابت `0.2` و نبود ورودی albedo** در `PoaIrradianceRequest`. سایت‌های برفی (albedo 0.5–0.8) و بتن/شن (0.3–0.4) خطای 3–10% در ground-reflected POA می‌سازند. حداقل یک پارامتر اختیاری `albedo` باید اضافه شود.
2. `brightness = (DHI·AM)/1367` — I0=1367 W/m²؛ ثابت کنونی پذیرفته‌شده 1361 یا 1367 هر دو مرسوم است؛ **مهم نیست**. نبود **clamping بالا** روی خروجی POA (به > DNI+DHI نباید برسد؛ در حال حاضر فقط clamp پایین اعمال می‌شود)؛ همچنین `ε`/`Δ` برخلاف gendaylit در بازهٔ [1,12.01)×[0.01,0.6] clamp نمی‌شوند (اثر اندک در شرایط ابری خراب؛ برای robustness پیشنهاد می‌شود).
3. **توان تابع Kasten 1966 در کد `-1.25` است ولی فرمول مرجع `-1.253` است** (`93.885 − Z`). اثر فیزیکی <۰٫۱٪ در airmass ولی انحراف از نام‌گذاری فرمول؛ یک‌کاراکتری و بهتر صفر شود.
4. `PEREZ_1990_BINS` به ازای هر فراخوانی بازساخته می‌شود (interface + 8 object در بدنهٔ تابع) — اثر عملکردی ناچیز، ولی قابل انتقال به سطح ماژول.
5. **`f2` clamp نمی‌شود** (فقط f1 با `f1Clamp`)؛ در آسمان‌های خیلی روشن با brightness بالا، f2 ممکن است بزرگ شود — باید `f2Clamp = max(0, f2)` اعمال و اثر آن تست شود.
6. خروجی `poaIrradiance` گرد نمی‌شود و مقایسهٔ server-side `!Number.isFinite(result) || result < 0` دارد ✅.

### ۴.۴ بهرهٔ ترانپوزیشن fixed-tilt — `waterfallLossEngine.ts:38–52` و `annualYieldEngine.ts:406` — 🟠 هیوریستیک — P2

```ts
if (tiltDeg === undefined) return 16.8;            // پیش‌فرض نامعلوم
if (tiltDeg <= 0)          return 0.0;
const optTilt  = clamp(|lat|·0.88, 8, 60);
const maxGain  = 12 + min(6, |lat|·0.15);
const factor   = sin(π/2 · min(1, tilt/optTilt));
const excess   = cos(max(0, tilt−optTilt));
return maxGain · factor · excess;                   // تا ~18%
```
و در حالت unified: `transpositionGain = 1.168` ثابت (یا ۱٫۲۵ ردیاب).
**این‌ها هیچ‌کدام ترانپوزیشن فیزیکی نیستند.** POA/GHI واقعی تابعی از توزیع beam/diffuse، tilt, latitude و albedo است و معمولاً برای tilt≈lat بین 1.10–1.25 (ثابت) و 1.15–1.35 (ردیاب) است — ولی وابستگی به **tilt واقعی** در `annualYieldEngine` اصلاً وجود ندارد (bifacial unaffected). برای tilt=0 در waterfall، ^baseline GHI می‌ماند ولی Perez واقعی برای β=0 چیزی حدود cos… نه صفرِ `calculateFixedTiltTranspositionGain(0)=0` — یعنی پنل افقیِ واقعی در تابستان/بهار transposition مثبت دارد (diffuse روی پنل افقی ≥ پنل شیب‌دار) ولی کد «۰ بهره» نشان می‌دهد.
**درمان:** یک‌بار ترانپوزیشن را با `calculatePoaIrradiance` (Perez) روی سری ساعتی clear-sky یا TMY حساب کنید و همان را بخوانید؛ یا least دست‌کم منحنی را با perez یکپارچه کنید.

### ۴.5 مدل حرارتی NOCT — `core/thermalDerate.ts` — ✅ فرمول، 🟠 فرضیات — P2

`Tcell = Tamb + ΔTmount + (NOCT−20)·(G/800)` — این **دقیقاً تعریف استاندارد NOCT** (IEC 61215 / ASTM E1036) است. ✅
**ولی:**
1. **Delta های نصب +14°C (industrial shed) و +6.5°C (rooftop concrete)** در همین فایل به‌صراحت «screening assumptions, not established by IEC/Faiman/King» نام‌گذاری شده‌اند و `source: 'NOCT_BASE_WITH_UNVALIDATED_MOUNTING_ASSUMPTIONS'` برگردانده می‌شود. این صداقت خوب است؛ ولی چون تب‌های مختلف همین عدد را چاپ می‌کنند، خطر «تصمیم‌سازی بر مبنای عدد غیرمعتبر» وجود دارد.
2. **حالت `annual_energy`** دمای سلول را `T_mean + (NOCT−20)·(1000/800)` می‌گیرد، یعنی **افزایش کامل NOCT در G=1000 را روی میانگین دما اعمال می‌کند** — در حالی که میانگین سالانهٔ توان معمولاً در G<400 رخ می‌دهد؛ در نتیجه افت حرارتی سالانه **بیش‌برآورد** می‌شود (خطای سیستماتیک چند درصدی در PR). `hourlyThermalEngine.ts` این را درست‌تر (وزنی برحسب irradiance) انجام می‌دهد — باید تک‌منبعی شود.
3. NOCT ذاتاً **باد را لحاظ نمی‌کند**. ادبیات (Osti 2003640) نشان می‌دهد SAPM/Faiman/PVsyst بر هم می‌نشینند و SAM-NOCT اغلب outlier است؛ استاندارد بانکی امروزی Faiman است: `T = Ta + G/(u0 + u1·WS)` با u0≈25–34، u1≈3.4–6.8. پیشنهاد در §7.
4. `calculateAnnualThermalDerate.thermalOverestimationPts` که اختلاف hot-design و annual را چاپ می‌کند مفید است ✅.

### ۴.6 تک‌دیودی De Soto / SAM — `singleDiodeModel.ts` — 🟡 خوب با چند نکته — P2

ساختار کد درست و قابل دفاع است:
- Eg(T): `Eg(T) = Eg,ref·(1 − 2.677e-4·ΔT)` تقریب خطی پذیرفته‌شده (مقدار دقیق −2.23e-4 تا −2.7e-4) ✅
- `I0(T) = I0,ref·(T/Tref)³·exp(q/k·(Eg,ref/Tref − Eg(T)/T))` مطابق De Soto ✅ (استفاده از Eg(T) در جملهٔ دوم درست‌تر از Eg ثابت است)
- `Rsh(G) = Rsh,ref·(Gref/G)` یعنی `rshRef/gRatio` ✅ جهت درست
- `Iph(G,T) = (G/Gref)·[Iph,ref + αIsc·ΔT]` ✅
- کالیبراسیون Rs با Newton–Raphson شرطی برای تطابق STC MPP ✅ (جمع‌وجور و هوشمند)
- Voc با NR ریشه‌یابی می‌شود ✅؛ ۸۰ نقطهٔ منحنی I–V NR ✅؛ clamp `exp(min(60,...))` برای overflow ✅.

**اصلاحات لازم:**
1. **`0.2265` ثابت جادویی** (خط ۲۲۹): مساحت پنل از فرض «راندمان ۲۲٫۶۵٪» معکوس‌به‌دست‌می‌آید. هر پنل واقعی (say 21.3% یا 23.1%) اشتباه محاسبه می‌کند و `efficiencyPct` خروجی بی‌معنی می‌شود. باید `moduleAreaM2` از کاتالوگ بخواند یا اضافه شود.
2. پرش Voltage از 0 تا Voc با ۸۰ گام: برای رشته‌های ۱۵۰۰V گام ≈ 18.75V → حداکثر توان داخل گام‌ها کشف می‌شود با خطای تا ~۰٫۵٪؛ کافی برای screening، ولی برای «دقت مهندسی» باید در حوالی MPP refinement مکعبی انجام شود.
3. `n = 1.05` ثابت، بدون اتصال به کاتالوگ (ideality factor سلولی است و از I-V curve extraction قابل استخراج است — در آینده).
4. `vt` محاسبه و فقط در `extractedParameters` برگردانده می‌شود — مردهٔ نیمه‌مصرف‌شده.
5. `cellsPerModule` از `Voc/0.705` معکوس می‌شود و به نزدیک‌ترین استاندارد [36..96] می‌چسبد — برای پنل‌های نیمه‌برش/تکنولوژی جدید (نصف‌برش 144/156) اشتباه می‌زند و Pmp را تحت تأثیر Rs قرار می‌دهد.

### ۴.7 سایزینگ رشته IEC 62548 / NEC 690.7 — `pvEngineAdvanced.ts` و `solarPvEngine.ts:243–317` — ✅ (بهترین بخش کد)

- سرد: `Voc_max,cold = Voc·(1 + βVoc·(Tmin−25))` با β<۰ → دامنهٔ آن بزرگ‌تر می‌شود ✅
- گرم (حداقل MPPT): Vmp در دمای **سلول داغ** با γPmp (یا γVmp = γPmp − αIsc اگر دادهٔ Isc موجود باشد — مطابق IEC 60891) ✅ این بسیار بهتر از پیاده‌سازی‌های ساده است.
- سقف MPPT سرد با ضریب Pmp (تقریب مستند «fallback به Voc coefficient» در نبود دادهٔ صریح) 🟡 — حرفه‌ای است که `tempCoeffVmpPct` اولویت دارد ✅.
- نیاز `min ≤ max` با هشدار صریح ✅؛ `inverterMpptMin < inverterMpptMax` اعتبارسنجی می‌شود ✅.
- سقف جریان MPPT با ضریب ۱٫۲۵ روی Isc ✅ (IEC/NEC 1.25 factor).
- هشدار block در صورت تخطی ✅.
**نکات IEC 62548 که پوشش داده نشده:** افت ولتاژ در هنگام اتصال معکوس/Reverse polarity، فواصل نشتی (creepage)، و الزام «system voltage ≥ 2×Voc» برای برخی تجهیزات. همچنین هیچ بررسی **زمین‌کردن/اتصال‌های MFG** وجود ندارد (به §7 مراجعه کنید).

### ۴.8 POA و Perez — بخش دوم: آزمایش عددی POA — ✅

ورودی آزمون: β=30° (جنوب)، Z=40°، DNI=800، GHI=800، DHI=0، آزیموت خورشید=آزیموت پنل=180°:
- `cos(Inc) = cos40·cos30 + sin40·sin30·cos(0) = 0.9855` → beam = 788.4؛ ground = 800·0.2·(1−cos30)/2 = 10.7 → **POA = 799.1**؛ خروجی کد 798.6 ✓ (گردگیری). الگوریتم صحیح است.

### ۴.9 Bifacial — `bifacialGain.ts` و `bifacial/bifacial2dViewFactor.ts` — 🟠 غیرمعتبر؛ با نام «PVsyst-grade» مغایرت دارد — P1

فایل خودش صادقانه هشدار می‌دهد (ADR-002 «retracted validation claims»)، اما این لایه هنوز در آبشار تلفات به‌صورت عددی اعمال می‌شود و در UI/گزارش‌ها به‌عنوان «Bifacial Rear Irradiance Gain (First-Order Proxy)» با دو رقم اعشار چاپ می‌شود.
مشکلات:
1. **chord-slice view factors** (پایه `0.5(1±cosβ)` سپس تضعیف با ثابت‌های 0.08، 0.5، 0.85…) **Hottel crossed-strings نیست**؛ برای pitch کوچک/GCR بالا خطا به ۱۰–۲۰٪ می‌رسد.
2. **rearDirectBeam = 0.08 · albedo · frontPoa · (1 − 0.5·GCR)** — ثابت ۰٫۰۸ از کجا آمده؟ هیچ مرجعی ندارد. مؤلفهٔ «پرتوافکن مستقیم روی پشت» در واقع از بازتاب محیط اطراف/سایه‌بان‌ها می‌آید و با view factor محاسبه می‌شود، نه با ثابت جهانی.
3. `endOfRowFactor = 1 + 0.04·min(0.25, 2·w·sinβ/rowLen)` — بهبودی ≤1% که در مقایسه با اثرات واقعی لبهٔ ردیف (تا ۱۰٪+) ناچیز و جهت آن تصادفی است (لبهٔ ردیف فقط برای دو سر ردیف مفید است).
4. `unshadedGroundFraction = 1 − GCR·(1+0.2·tanZ)` clamp به 0.15…1 — هیوریستیک خام برای shadow profile.
5. خروجی `bifacialGainPercent` با clamp به [0,25]% و screening_proxy به [0,15]% — «اعداد نمایشی» بدون عدم‌قطعیت.
**مرجع صحیح:** مدل 2D view-factor (مثلاً pvlib/pvfactors، SAM) برای ردیف‌های بلند fixed-tilt در محدودهٔ ±1–2% با اندازه‌گیری؛ ray-tracing برای ردیاب/هندسهٔ پیچیده (Mikofski 2019؛ Androutsi/pvfactors 2020: خطای ≤0.6–2%). برای ادعای «bankable» باید حداقل pvfactors-like integration یا اعتبارسنجی روی سایت مرجع انجام شود.

### ۴.10 Snow — `snow/marionSnowEngine.ts` — 🟠 نام مدل اشتباه است — P1

فایل و بنچمارک‌ها آن را «Marion (2013)» معرفی می‌کنند؛ اما:
1. **Marion et al. (2013) یک مدل انرژی‌محور با تراز جرمی/انرژی برف روی ماژول است** (ورودی: tilt, POA irradiance, ambient temperature, ground snow depth؛ Solar Energy 97:112–121) — **نه** فرمول نمایی `1 − exp(−γ·sinβ·ΔT)` با γ=4.49.
2. **γ=4.49 و قانون نمایی `1−exp(−γ·sinβ·ΔT)` در مقالهٔ Marion 2013 وجود ندارند** (مدل مرجع: سرعت لغزش خطی با sinβ + آستانهٔ زاویه؛ رجوع به §مراجع). مثال عددی داخل کامنت صرفاً توضیح داخلی است.
3. مرجع در `externalValidation.ts` به اشتباه «IEEE JPV Vol 3 No 1, 2013» ذکر شده؛ مقالهٔ Marion در **Solar Energy 97 (2013) 112–121** چاپ شده است. عنوان درست: «Measured and modeled photovoltaic system energy losses from snow for Colorado and Wisconsin locations».
4. معیار «covered fraction +0.5 per cm snowfall» و «Damming threshold 0.5» و «Logistic tilt damming 5°→35°» همه ثابت‌های داخلی هستند، بدون اعتبارسنجی میدانی.
**نتیجه:** خروجی snow این برنامه فقط یک **شاخص screening داخلی** است و نباید در گزارش رسمی «Loss due to snow (Marion model)» نام‌گذاری شود. باید یا پیاده‌سازی واقعی Marion (با POA و T و snow depth ساعتی) انجام شود، یا نام به «screening index» تغییر کند و درصد از گزارش رسمی حذف شود.

### ۴.11 Soiling — `soiling/kimberSoilingEngine.ts` — 🟠 Citation جعلی‌نما — P1

راستی‌آزمایی وب این ممیزی (نوامبر 2026): مقالهٔ واقعی = A. Kimber, L. Mitchell, S. Nogradi, H. Wenger, «The Effect of Soiling on Large Grid-Connected Photovoltaic Systems in California and the Southwest Region of the United States», **2006 IEEE 4th World Conference on Photovoltaic Energy Conference (WCPEC-4), Waikoloa, HI, May 2006, pp. 2391–2395. DOI: 10.1109/WCPEC.2006.279690** ✅ DOI و محدودهٔ صفحات در کد درست نقل شده‌اند. اما:
1. **«Section IV: Precipitation Thresholds and Wash-Off Dynamics, page 2393, Table 1 & Equation (2)» — چنین بخشی/جدولی/معادله‌ای در مقالهٔ ۵ صفحهٔ Kimber وجود ندارد.** مدل واقعی Kimber (همان‌طور که در pvlib پیاده شده، `pvlib.soiling.kimber`) این است: نرخ انباشت خطی روزانهٔ آزمایش‌شده در جنوب‌غرب آمریکا (**۰٫۱–۰٫۳٪/روز**)، **cleaning threshold** (پیش‌فرض pvlib: ۶mm)، **grace period ۱۴ روز** پس از باران (خاک مرطوب ⇒ رسوب≈۰)، **max soiling سقف (پیش‌فرض ۰٫۳)**، و ریست کامل با باران بالای آستانه. هیچ «bin گسستهٔ ۲۵/۶۵/۹۵/۱۰۰ درصدی به ازای بازه‌های 1/2.5/5/10mm» در ادبیات Kimber نیست.
2. ادعای «SAM 2023.12.17 PV Sub-hourly Soiling module — Rainfall Cleaning Thresholds & Discrete Precipitation Bins» و «PVsyst v7.4 Version C empirical calibration» نیز **بازنمایی دقیق ابزارهای واقعی نیست**: SAM قهار مدل آستانه+grace period (Kimber) و مدل Coello/Boyle (HSU) دارد، نه binهای گسسته؛ pvlib همان مدل آستانه‌ای را دارد.
3. `kimber_simplified` (آستانهٔ تک‌روزه + partialWashCoefficient خطی) از نظر ساختار به مدل مرجع نزدیک‌تر است (پیش‌فرض کد: rate=0.22٪/روز، threshold=5.0mm، سقف=25٪ — هر سه از نظر رده به مدل مرجع Kimber نزدیک‌اند (میزان مرجع ۰٫۱–۰٫۳، threshold pvlib=۶، سقف pvlib=۳۰) 🟡)، اما `kimber_full_discrete_bins` اختراعی است و در گزارش رسمی نباید «Kimber (2006), Table 1» نامیده شود.
4. monthlySums/maxMonthlyLossPct — آمار نمایشی بدون کاربرد تصمیمی.
**درمان:** binها را به‌عنوان `modelVariant: 'assumed_discrete_bins'` با provenance `user_defined`/`assumed` بازنشانی کنید؛ بخش «citation» را به DOI و صفحات واقعی محدود کنید؛ ادعاهای SAM/PVsyst را حذف یا به «مشابه در ساختار» نرم کنید؛ پیش‌فرض به مدل مرجع Kimber (نرخ ۰٫۱–۰٫۳٪/روز + threshold ۶mm + grace ۱۴ روز + سقف ۳۰٪) نزدیک کنید.

### ۴.12 IAM — Martin & Ruiz — `optical/iamEngine.ts` — 🟡 فرمول درست، نقص AOI و citation ژورنال اشتباه — P2

**فرمول — تطبیق دقیق با pvlib (`iam_martin_ruiz`):**
```
IAM = (1 − exp(−cosθ/a_r)) / (1 − exp(−1/a_r))   ≡   1 − (exp(cosθ/a) − exp(1/a)) / (1 − exp(1/a))
```
کد `rawLoss = (expCos − expOne)/denom; iam = 1 − rawLoss` — از نظر جبری **دقیقاً هم‌ارز** است. ✅ a_r=0.16 برای شیشهٔ ARC بافت‌دار (دامنهٔ تجربی 0.08–0.25) ✅ منطقی.
**باگ‌ها:**
1. **`calculateEffectivePoaIam(beamPoaWm2, ..., solarZenithDeg, ...)` zenith را به‌عنوان زاویهٔ تابش (incidence angle) به `calculateTemperatureCoupledIam` می‌دهد** (`iamEngine.ts:232، 250`). زاویهٔ تابش واقعی: `AOI = acos(cosZ·cosβ + sinZ·sinβ·cos(Az_s − Az_surf))` است و فقط برای پنل افقی (β=0) با zenith برابر است. `core/physicalLossContract.ts` همین پارامتر (`solarZenithDeg`) را مستقیماً عبور می‌دهد. **اندازه‌گیری عددی در همین ممیزی (Tehran، پنل ثابت ۳۰° جنوبی):**
   | زمان (UTC) | zenith | AOI واقعی | IAM کد | IAM(AOI) | خطا |
   |---|---|---|---|---|---|
   | 2026-06-21 08:30Z | 12.3° | 17.8° | 0.9997 | 0.9993 | حداکثر ۰٫۰۴ امتیاز — ناچیز |
   | 2026-12-21 08:30Z | 59.1° | 29.1° | 0.9614 | 0.9977 | **−۳٫۶۳ امتیاز (بیش‌برآورد افت)** |
   | 2026-03-20 06:00Z | 52.0° | 40.8° | 0.9806 | 0.9931 | −۱٫۲۴ امتیاز |
   اثر در آب‌وهوای زمستانی/عرض‌های بالا روی PR آبشاری قابل‌ملاحظه است؛ اما بیماری محدود به beam است و dimension آن «امتیاز درصد IAM» است، نه فاکتور ۲. سطح شدت: **P2** (نه P1). **رسیدگی به reachability (بازبینی موضعی):** در checkout فعلی هیچ‌جای UI پارامتر `physicalLossConfig` را به `buildWaterfallArgs` نمی‌دهد (جست‌وجوی سراسری در `src/` فقط `scripts/remediation/verify-phase04.ts:196` و `:414` را یافت) و App.tsx/WaterfallLossTab همیشه `iamLossPct: -2.2` ثابت را تزریق می‌کنند؛ بنابراین این نقص در مسیر کاربری زندهٔ فعلی **غیرقابل‌دسترس** است و اثر آن محدود به زنجیرهٔ شواهد CI (verify-phase04) و تست 9.6 واحدی است. با این حال چون قرارداد عمومی کتابخانه‌ای است و پیش‌نیاز مسیر واقعی ساعتی (TMY/8760، §7) محسوب می‌شود، اصلاح آن (تعویض قرارداد ورودی به AOI صریح + به‌روزرسانی caller‌ها و آزمون‌ها) الزام‌آور است.
2. **Journal اشتباه:** کد می‌نویسد «Martin, Ruiz, Solar Energy, 70(1), 25–38»؛ مقالهٔ اصلی در **Solar Energy Materials & Solar Cells, vol. 70 (2001) 25–38** است (DOI: 10.1016/S0038-092X(00)00155-4 — همان DOI که خود کد می‌آورد؛ یعنی فقط نام ژورنال غلط است). عنوان صحیح «Calculation of the PV modules angular losses **under field conditions by means of an analytical model**».
3. **ASHRAE cutoff:** کد برای θ≥85° مقدار ۰ برمی‌گرداند؛ مدل اصلی ASHRAE `IAM = 1 − b0(1/cosθ − 1)` در θ=85 مقدار ≈ 0.476 دارد؛ برش سخت به صفر غیرپیوسته و غیرفیزیکی (در زاویه‌های نزدیک به grazing شیب منحنی باید طبیعی ادامه یابد تا صفر شود).
4. **Thermo-optic coupling با κ=1.35 و dn/dT = +4.5e-5/K:** جهت فیزیکی درست است (n↑ ⇒ R↑ ⇒ IAM↓) اما κ=1.35 و فرم `−κ·dn·sin²θ` ساخته‌وپرداختهٔ خود کد است؛ هیچ paper پشت آن نیست و `sin²θ` تقریباً شکل دلبخواهی دارد. **این بخش باید «experimental/unvalidated» لیبل بخورد یا حذف شود.** (عدد dn/dT ≈ 4.5e-5 برای silica plausible است؛ خود مارتین‌روییز dn/dT اعمال نمی‌کند.)
5. `calculateBrandemuehlDiffuseAngles` — تطبیق دقیق با Brandemuehl & Beckman / Duffie & Beckman Table: `θ_sky = 59.7 − 0.1388β + 0.001497β²` و `θ_ground = 90 − 0.5788β + 0.002693β²` ✅.

### ۴.13 Clipping — `annualYieldEngine.ts` و `waterfallLossEngine.ts` — 🟠 مدل خطی — P2

`clippingLossPct = −0.2 − 6.5·max(0, ILR − 1.3)` clamper [−0.2 , −85].
- این «منحنی واقعی clipping» نیست؛ clipping واقعی از توزیع توان ساعتی و ظرفیت AC اینورتر به دست می‌آید (انتگرال اضافهٔ توان). مدل‌های مرجع (PVsyst/SAM) این را با شبیه‌سازی ساعتی محاسبه می‌کنند.
- ضرایب 6.5%/ILR و knee=1.30 بدون منبع هستند. برای ILR=1.25 اعمال −0.2٪؛ برای ILR=1.5: −1.95٪؛ در حالی که وقوع واقعی 1–4٪ وابسته به آب‌وهوا است.
**درمان:** محاسبهٔ واقعی با «hourly simulation + inverter limit» (موتوری که در `simulation24hEngine` شبه‌موجود است)، یا حداقل calibration روی چند آب‌وهوای مرجع (تهران/مونیخ/فونیکس) و انتشار جدول ضرایب.

### ۴.14 Waterfall و ترکیب تلفات — P2

- PR تعریف‌شده = `finalEnergy / effectivePoaEnergy` — **تطبیق با IEC 61724-1** (Rf=yield/ref-yield مبتنی بر POA) ✅**بهترین تصمیم کد**. بازدهی/PR typical خوب‌طراحی‌شده (و قابل انتظار برای ورودی‌های معقول) در بازهٔ ۰٫۷۵–۰٫۸۵ قرار می‌گیرد — این یک انتظار مهندسی است، نه نتیجهٔ تست.
- `calculateStandardDeratingFactor` — ضرب اعداد 🟡 درست برای سری‌ها.
- `compoundPerformanceRatioPct` در کنار `performanceRatioPct` چاپ می‌شود و UI هر دو را نشان می‌دهد — **کاربر را گیج می‌کند** (دو PR؟). باید یکی «loss tree compounding» و دیگری «IEC PR» نام‌گذاری و با توضیح کوتاه همراه شوند.
- `arithmeticSumLossPct` — مجموع حسابی درصدها؛ فقط نمایشی است، چرا که درصدهای آبشاری روی توان کاهشی اعمال می‌شوند (نیاز به ضرب ترکیبی دارد). برچسب «arithmetic sum (not physical)» لازم است.
- مرحلهٔ `quality` **+0.4٪ سود** (تلورانس مثبت کارخانه) و `lid` −1.2٪ و `mismatch` −1.3٪ — مقادیر screening رایج‌اند 🟡، هرچند LeTID در PERC قدیمی می‌تواند تا −۳٪ باشد؛ باید از datasheet خوانده شود نه ثابت جهانی.
- `mv_transformer` بدون شرط ظرفیت در waterfall ولی با شرط ≥50kWp در unified — ناهماهنگی صریح (§3.2).
- DC cabling ثابت −1.4٪ بدون اتصال به `calculateVoltageDropDc` واقعی (موتور افت ولتاژ موجود و درست است — باید به هم وصل شوند!).
- MPPT tracking −0.4٪ و inverter eff −2.2٪ ثابت — به‌جای خواندن از کاتالوگ اینورتر (`efficiencyMaxPct` در InverterSpecs موجود است!) — یعنی **دادهٔ موجود نادیده گرفته می‌شود**.
- Environmental aging/degradation در waterfall وجود ندارد (فقط در مالی استفاده می‌شود).

### ۴.15 سایهٔ برخوردی Ray-Triangle — `solarPvEngine.ts` و `shadingLifecycle` — ✅ فرمول، 🟠 پیچیدگی — P2/P3

Möller–Trumbore صحیح پیاده شده (edges، barycentric، culling دوطرفه با `|a|<1e-7` skip، t>1e-7). ✅ صحیح.
- پیچیدگی **O(N_points × N_triangles × N_sunDirs)** بدون BVH — برای صحنه‌های سه‌بعدی بزرگ (>۵۰k triangle) کند است؛ در کلاینت با `roof3dShadingEngine` و Web Worker تا حدی جبران شده. 🟡
- `calculateShadingFactor` به sunDirections از بیرون متکی است — صحت وابسته به فریم آزیموت/zenith است؛ هیچ normalized-direction validation جز normalize داخلی ندارد (صفر برمی‌گرداند اگر صفر باشد ✅).

### ۴.16 بک‌ترکینگ ردیاب — `tracker/backtrackingEngine.ts` — ✅ وفادار به pvlib — الگو

خط‌به‌خط با pvlib 0.16+ مقایسه شد:
- `projectedSolarZenithDeg` = معادل `pvlib.shading.projected_solar_zenith_angle` (زاویهٔ چرخش ایده‌آل که سایهٔ ردیف را قبل از ساعت‌گردش کم می‌کند) ✅
- `singleaxis` backtracking: `temp = |(1/GCR)·cos(ω_ideal)|`؛ اگر temp<1: `θ = ω − sign·acos(temp)` — دقیقاً Marion & Dobos (NREL/TP-6A20-58891) Eq. 14–16 ✅
- `surfaceOrientation` = pvlib `_unit_normal`/`calc_surface_orientation` ✅
- `aoi_projection` = pvlib `aoi_projection` ✅ (cos from south–east conventions سازگار)
- clamp حداکثر چرخش مکانیکی ✅؛ رفتار سایه در backtracking فعال = ۰٪ ✅ (با توضیح ISSUE-3 و استثناء |ω|<5° مستند).
- `simulateTrackerAnnual` روی `buildClearSkySunPath` (۱۲ روز×۲۴h نماینده) — هرگز TMY واقعی نیست؛ بنابراین «annual» فقط **برآورد clear-sky** است — باید در UI با این برچسب بیاید (در export/report بیاید).
**این تمیزترین فایل فیزیکی کد است و الگوی بقیه باید باشد.**

### ۴.17 Broms / ژئوتکنیک — `geotech/bromsMethod.ts` — 🟡 نسبتاً درست با کچ — P3

- چسبیده: `Hu = 9·cu·D·f` با `f = 2(L − 1.5D − e)` — حل کوتاه-پایی آزاد (cohesive) مطابق Broms (1964) و FHWA-NHI-16-009 ✅ فرم درست.
- دانه‌ای: `Hu = 0.5·γ·Kp·D·L³ / (e+L)` — Broms short pile cohesionless ✅ فرم درست (معتبر تا جایی که moment capacity عبور نکند؛ کد `allowableMomentKnM` را هم چک می‌کند — رجوع §فایل.)
- **عدم‌تطابق FoS:** برای cohesive از `targetFos` (پیش‌فرض ۱٫۷۵) ولی برای cohesionless از `max(targetFos, 1.8)` استفاده می‌شود — کاربر نمی‌تواند FoS بحرانی دانه‌ای را پایین بیاورد؛ باید یکسان و صریح شود.
- `cu = max(25, cohesionKpa)` — کف دلبخواه ۲۵ kPa: برای خاک بسیار نرم (cu<25) ضریب اطمینان واقعی را دست‌بالا می‌گیرد. **خطر انتخاب قطر پی برای خاک خیلی نرم.**
- `pileWidthD = 0.15` ثابت برای همهٔ پست‌ها؛ بخش واقعی از `bromsPileSection` در جاهای دیگر محاسبه می‌شود — دو نقطهٔ دادهٔ مختلف برای «مقطع پی» وجود دارد؛ همگام نیست (RFC3 از طریق `pileSection: structCalc.bromsPileSection as any` با `as any` رد می‌کند؛ هرگز در تایپ‌چک نمی‌گیرد).

### ۴.18 مالی — `financialEngine.ts` و `solarPvEngine.calculateLcoe` — ✅ ساختار، 🟠 پیش‌فرض‌ها — P2

**ساختار صحیح است:** CAPEX breakdown با reconcile گردشده‌ها (isReconciled) ✅؛ degraded yield `(1−d)^(t−1)` ✅؛ تخفیف تنزیلی هزینه/انرژی ✅؛ LCOE = ΣPV(cost)/ΣPV(energy) ✅؛ CRF برای «cost of energy served proxy» ✅؛ battery replacement در سنوات مضرب عمر شیمیایی ×۰٫۷ با تورم 5% 🟡؛ IRR10/bisection قوی با Descartes sign-change detection ✅ (زمان اجرا در worst-case 80×matrix — bounded ✅)؛ NPV ساده ✅.
**پیش‌فرض‌های غیرمعتبر/تصادفی:**
- `opexEscalationPct = 0.08` (۸٪/سال) و `tariffEscalationPct` (در Iran context باید پارامتر باشد؛ الان ثابت داخلی) — هیچ ارتباطی با تورم/شاخص واقعی ندارد و ±۵ واحد در LCOE جابه‌جا می‌کند.
- degradation پیش‌فرض 0.5%/yr 🟡 معقول ولی برای TOPCon/HJT مدرن 0.35–0.45 — باید از کاتالوگ/گارانتی خوانده شود.
- باتری: عمر شیمیایی ۳/۴/۸/۱۲ سال (lead/gel/NCM/Li) 🟡 screening قابل قبول؛ **عمر LFP/NMC جدید ۱۲–۱۵** است ولی لیست شاخه‌ها قدیمی است.
- `batteryReplacementYear12Usd = batteriesUsd × 0.70` و `gridInterconnectionUsd = plantMva × 24,000` و `epcLaborUsdPerKw` و `dieselGenSetCapexUsd = 12,000` — ثابت‌های بازار، بدون citation یا ایندکس‌سازی؛ در ایران باید از فهرست‌بهای سالانه ساتبا/مپنا واکشی شوند.
- `performQuickSizing` در `solarPvEngine.ts`: **derate ثابت ۰٫۷۸، capex ثابت $1,100/kWp و $350/kWh باتری، PSH بر اساس latitude-only fallback** (`6.0 − 0.05·|lat|` با سقف ۳٫۵!) — برای QuickSizing این فرمول PSH حتی از `climaticData` هم که خیلی ساده است ساده‌تر است و با `getClimateData` اصلی ناهماهنگ (هرچند تلاش شده catch شود). **اعداد QuickSizing هرگز نباید به‌عنوان «برآورد bankable» ارائه شوند.**
- LCOE در `solarPvEngine.calculateLcoe` با `discountRate` به‌عنوان `rate` در مخرج می‌گیرد؛ در financialEngine `r = discountRatePct/100` ✅ هر دو یکسان.

### ۴.19 نرمال‌سازی واحدها، قراردادها — ✅ نقطه‌قوت
یک‌جا بودن قراردادهای واحد (`solarGeometryContract.ts`، `normals`، branded types، `asNorthAzimuthDeg`، `northToSouthAzimuth`) جلوی دسته‌بندی کلِ باگ‌های تبدیل آزیموت را گرفته است. تبدیل south↔north با تست roundtrip مستند شده ✅.

### ۴.20 اعتبارسنجی عددی انجام‌شده در این ممیزی

| آزمون | ورودی | خروجی کد | مرجع/انتظار | نتیجه |
|---|---|---|---|---|
| Position equinox Greenwich 2026-03-20 12:00Z, φ=0 | Z=1.86°, az=91.3° | Z≈۱٫۹° (ناشی از EoT ≈ −۷٫۵′) ✓ | Z=0، انتظار ✅ |
| Tehran 2026-06-21 08:30Z | Z=12.3°, az=173.3° (SE) ✓ | — | ✅ |
| Tehran 2026-12-21 08:30Z | Z=59.1°, az=179.3° (جنوب) ✓ | — | ✅ |
| Tromsø 2026-06-21 12:00Z | az=203.3°، alt=42.5° | az_ref≈203.1° (atan2 مرجع) | ✅ |
| Tromsø 2026-06-21 00:00Z (خورشید نیمه‌شب) | az=17.0°، alt=4.0° | az_ref≈16.9° | ✅ |
| سیدنی 2026-12-21 02:00Z (ظهر تابستان S.H.) | az=351.2°، alt=79.5° | az_ref≈351° | ✅ |
| کیپ‌تاون 2026-12-21 11:00Z | az=340.9°، alt=79.0° | az_ref≈341° | ✅ |
| POA β=30,Z=40,DNI=800 | 798.6 W/m² | hand calc 799.1 | ✅ |
| IRR [−1000,300×4] | 7.71% converged | واقعی 7.714% | ✅ |
| LCOE(110k,1650,160MWh,5%,25y,0.5%/yr) | 0.0619 $/kWh | — | ✅ plausibility |
| String sizing Voc=49.5,Vmp=41.2,βvoc=−0.28%/°C,βPmp=−0.30%/°C,Tmin=−10,Tmax=45,VdcMax=1000,MPPT 250–850 | **min=7, max=18** (بازرسی دستی: Voc_cold=54.35V ⇒ ⌊1000/54.35⌋=18؛ Vmp_hot=38.73V ⇒ ⌈250/38.73⌉=7) | ✅ |
| VoltageDrop `calculateVoltageDropDc(100m, 11A, 6mm², Vnom=800V, ρ_Cu=0.0175)` = 2·L·ρ·I/(A·V) | 0.802% | دستی: 2×100×0.0175×11/(6×800)=0.802% | ✅ |
| Transposition curve | tilt=0→۰؛ undefined→16.8؛ 30°/lat35.7→17.3؛ 10°/lat60→5.3؛ 60°/lat60→17.9؛ 45°/lat20→13.3 | — | 🟠 اعدادِ دلخواه، بدون ریشهٔ فیزیکی |

### ۴.21 خطاهای کتابشناختی در منابع (ریز اما جدی برای سند رسمی)

| محل کد | ادعا | واقعیت |
|---|---|---|
| `iamEngine.ts` header | Martin & Ruiz, **Solar Energy** 70(1):25–38 | **Solar Energy Materials & Solar Cells** 70 (2001) 25–38 (DOI درست است) |
| `marionSnowEngine.ts` header & `externalValidation.ts:241` | Marion 2013 «IEEE JPV Vol 3 No 1» / «A Snow-Loss Model…» | **Solar Energy 97 (2013) 112–121**؛ عنوان «Measured and modeled photovoltaic system energy losses from snow for Colorado and Wisconsin locations»؛ DOI 10.1016/j.solener.2013.07.029 |
| `kimberSoilingEngine.ts` | «page 2393, Table 1 & Equation (2)» دقیق نقل شد | چنین جدولی در مقالهٔ WCPEC-4 وجود ندارد؛ دقت‌نمایی جعلی |
| `crossValidation.ts` | «NREL/CP-520-40123 (Kimber et al.)» | شماره‌ای شبیه گزارش کنفرانسی همان مقالهٔ WCPEC-4 است؛ قابل‌اتکا نیست و باید با DOI (10.1109/WCPEC.2006.279690) جایگزین شود |
| `bifacial2dViewFactor.ts` header | «background/context… not Hottel crossed-strings» ✅ صادقانه | ولی همچنان در «stage آبشاری» با نام محصول‌گون استفاده می‌شود |
| `hourlyThermalEngine.ts` | label `isMeasuredHourlyWeather: false` ✅ | — |

### ۴.22 جمع‌بندی داوری فیزیکی

نقطه قوت: **Perez، Kasten 1966، IEC 62548، Möller–Trumbore، pvlib SingleAxis، De Soto structure، LCOE/IRR discounting**.
نقطه ضعف سیستماتیک: **به‌جای «مدل‌های منتشرشده + اعتبارسنجی»، از «screening heuristics + citationهای ظاهراً دقیق» استفاده شده است.** این الگو بزرگ‌ترین ریسک نهادی/فنی برنامه است: اگر خروجی به کارفرما/تأمین مالی برسد، نام «Marion/Kimber/Martin-Ruiz» در گزارش، ادعای نادرستی خواهد بود؛ اگر به‌صورت «stochastic screening with explicit uncertainty bands» گزارش شود، کاملاً قابل قبول است.

---

## ۵. ممیزی سرور و امنیت

### ۵.۱ یافته S-SEC-01 — JWT دستی (hand-rolled) به‌جای کتابخانهٔ استاندارد — P2
`server.ts:766–846`: HS256 HMAC دستی با `crypto`، بررسی constant-time (`sha256` هر دو سمت → `timingSafeEqual`) ✅ ایده است؛ `alg` whitelist به HS256 فقط ✅ (جلوی algorithm confusion را می‌گیرد)؛ الزامات `exp`، `nbf`، `iat`، `iss`، `aud` و `JWT_MAX_TTL_SECONDS` (cap 604800) ✅ بسیار بهتر از میانگین پروژه‌های مشابه.
**ولی:**
- فقط HS256. الگوریتم‌های نامتقارن (RS256/ES256/EdDSA) و `kid` و چرخش کلید JWKS پشتیبانی نمی‌شوند؛ یعنی اتصال به IdPهای واقعی (Keycloak/Auth0/Entra) ناممکن یا پرریسک است.
- هیچ leeway clock-skew (مثلاً ±60s) اعمال نمی‌شود؛ توکن‌های مرزی به‌اشتباه رد می‌شوند.
- `payload.sub || payload.userId || payload.id` — چند فیلد هویتی پذیرفته می‌شود؛ باید دقیقاً یکی (sub) باشد.
- هیچ log/audit از تلاش‌های ناموفق (failed verification) ثبت نمی‌شود؛ فقط console معمولی.
**درمان:** مهاجرت به `jose` (یا `jsonwebtoken`) با پشتیبانی HS256+RS256+JWKS، کلیدچرخش، clockTolerance، و حذف پذیرش چندگانهٔ شناسهٔ کاربر. حداقل effort با بیشترین کاهش ریسک.

### ۵.۲ یافته S-SEC-02 — CSP با `unsafe-inline` و `unsafe-eval` در production — P2
`index.html` (meta CSP) و `securityHeadersMiddleware` در `server.ts` هر دو شامل `script-src 'self' 'unsafe-inline' 'unsafe-eval'` هستند. در build تولیدی React هیچ نیازی به eval نیست؛ `unsafe-inline` هم فقط برای چند script inline کوچک است و باید با nonce/hash حذف شود. `style-src unsafe-inline` برای inline styles فعلی برنامه (Tailwind + inline styleهای زیاد) اجباری است ولی باید در بلندمدت به NONCE مهاجرت کند.
نتیجهٔ فعلی: اگر تزریق محتوایی رخ دهد (مثلاً از طریق innerHTML چاپ‌شده در گزارش → `reportContainerRef.innerHTML`)، CSP عملاً مانع اجرا نمی‌شود.

### ۵.۳ یافته S-SEC-03 — Persist سنکرون و بدون صف — P2
`saveDatabase()` با `writeFileSync` کل snapshot را در هر mutation روی دیسک می‌نویسد (§3.5). در production با فایل روی دیسک محلی: خطر فساد snapshot در crash (rename atomic است ✅ اما نوشتن + parse کل DB در هر POST سنگین است). راه‌حل: debounce تجمیعی (مثلاً ۲ ثانیه)، و persist به‌صورت `append-only` journal یا انتقال به SQLite (better-sqlite3) با WAL — کم‌ترین هزینه با بیشترین پایداری.

### ۵.۴ یافته S-SEC-04 — Snapshot import روی دیسک بدون schema — P3
`importSnapshot` مستقیماً به Map‌ها می‌ریزد؛ JSON بد شکل یا فایل متنهٔ خراب می‌تواند پروژه‌های "زندگی‌کننده" را پاک/جایگزین کند (حذف پروژه‌های موجود توسط import جدید رخ می‌دهد: `this.projects = new Map(...)`). حداقل نسخه‌بندی+validation (zod) لازم است؛ و قبل از جایگزینی، backup خودکار از snapshot قبلی بگیرید.

### ۵.۵ یافته S-SEC-05 — x-user-id در حالت development insecure by default — P3
در isDev و نبود هر secret، هر request با هر `x-user-id` به‌عنوان همان کاربر پذیرفته می‌شود. مستند است، اما ریسک است که به اشتباه در محیط عمومی-دیباگ فعال بماند؛ باید در لاگ‌های startup با WARNing بزرگ چاپ شود (اکنون فقط در docs).

### ۵.۶ یافته S-SEC-06 — rate limiting فرآیندمحور و فقط برای ۲ مسیر — P3
`geocode: 30/min`، `reports/generate: 20/min` — محدود اما بقیهٔ endpointها (مثل quick-size که CPU-سوز است) بدون limit عمومی‌اند؛ هندل per-instance است و با چند Replica دور زده می‌شود (در خود docs هم صراحتاً ذکر شده). `APP_INSTANCE_COUNT>1` فقط Redis provider limit را اجباری می‌کند نه API edge limit. توصیه: middleware عمومی `express-rate-limit` با کلید IP+مسیر و fallback memory+redis؛ یا Cloudflare/Nginx limit در لبه.

### ۵.۷ یافته S-SEC-07 — `zod` وابستگی اعلام‌شده ولی تقریباً بدون استفاده — P3
`package.json` → `zod: ^4.6.7`؛ فقط `projectMigration.ts` آن را import می‌کند. همه‌جای سرور validation دستی با `typeof`های طولانی تکرار شده است — منبع خطای انسانی (و عدم‌یکنواختی پیام‌های خطا). مهاجرت تدریجی هر endpoint به schemaهای zod نه‌تنها امن‌تر است، که پاسخ‌های خطای یکنواخت (400 with issue list) هم می‌دهد.

### ۵.۸ یافته S-SEC-08 — دیگر موارد امنیتی (خوب‌ها و بدها)
- ✅ `x-powered-by` غیرفعال؛ هدرهای امنیتی استاندارد؛ `trust proxy` اختیاری و صریح؛ قفل روی اندازهٔ JSON (`2mb`) و هندلر خطای Parse ✅؛ `Referrer-Policy`؛ `frame-ancestors`.
- ✅ endpointهای upload/report با rate limit؛ خطای JSON دارای shape یکسان.
- ⚠️ CSP به‌جای هدر HTTP، در `<meta>` در index.html است؛ هدر HTTP (که در server.ts هست) و meta با هم یکی هستند ولی meta را نمی‌توان برای frame-ancestors واقعاً اعمال کرد (`frame-ancestors` در meta نادیده گرفته می‌شود) — پس X-Frame-Options تنها محافظ است. توصیه: حذف meta و تکیه به هدر HTTP.
- ⚠️ `connect-src` شامل `ws: wss:` بدون محدودیت مقصد — برای dev لازم است ولی در production باید به origin خود محدود شود.
- ⚠️ CORS: سرور هیچ `Access-Control-Allow-Origin` را تنظیم نمی‌کند؛ چون فرانت same-origin است OK است؛ ولی نشان می‌دهد سیاست مستند نشده.
- ⚠️ خطاهای اعمال‌شده به کلاینت گاهی `err.message` خام را برمی‌گردانند (مثلاً message داخلی Node/gateway) — نشت جزئیات internals؛ باید پیام عمومی + log داخلی.

### ۵.۹ یافته S-SEC-09 — وابستگی‌ها و زنجیره‌تامین
- `npm ci` موفق؛ `overrides` برای glob/minimatch/nanoid اعمال شده ✅ (نشان‌دهندهٔ رسیدگی تیم به CVEs).
- `package-lock.json` موجود ✅؛ CI workflow در `.github/workflows/ci.yml` هست (کیفیت/تست). توصیه: اضافه‌کردن `npm audit --production` gate و Dependabot/Renovate؛ هشدار برای به‌روزرسانی‌های امنیتی `express`، `typescript`، `vite` (vite 6 و express 4 آخرین majorهای رایج این پروژه‌اند؛ majorهای بعدی را با دقت بررسی کنید).
- `tsx` در runtime production استفاده می‌شود (Dockerfile: `npm i -g tsx`) به‌جای build نهایی به JS + `node dist-server`. یعنی production با transpile در لحظه اجرا می‌شود — کندتر، حافظهٔ بیشتر، و بدون type-check مزایای tsx. توصیه: build server با `tsup`/`esbuild` یا `tsc` و اجرای JS خالص.

---

## ۶. تحقیق گستردهٔ بهینه‌سازی Frontend

### ۶.۱ وضعیت فعلی باندل (اندازه‌گیری واقعی از `dist/` در این ممیزی)

| chunk | minified | gzip | تشخیص |
|---|---|---|---|
| index-*.js (App+engines) | **۸۷۳ KB** | **۲۵۵ KB** | سقف پیشنهادی 300–400KB برای shell؛ بیش از ۲ برابر هدف |
| OfficialReportModal-*.js | **۱٬۲۶۰ KB** | **۳۵۹ KB** | docx + exceljs + تمام گزارش‌ها static import شده‌اند (`reportingEngine.ts:20` → `import ExcelJS` و `docx`) |
| vendor-three-*.js | ۴۷۳ KB | ۱۱۸ KB | سه.js — lazy ✅ درست انجام شده |
| unitTestsCore-*.js | ۲۶۰ KB | ۸۲ KB | **تست‌ها در بستهٔ کاربر نهایی** ❌ |
| vendor-leaflet-*.js | ۱۵۰ KB | ۴۳ KB | lazy ✅ |
| vendor-react-*.js | ۱۳۵ KB | ۴۳ KB | ✅ |
| vendor-lucide-*.js | ۵۱ KB | ۱۲ KB | ✅ (tree-shaking خوب) |
| shadingWorker-*.js | ۶۹ KB | — | ✅ Web Worker درست |
| RFC3ReportsTab-*.js | ۷۷ KB | ۲۲ KB | benchmark‌ها داخل prod tab |
| StructuralFoundationTab-*.js | ۱۰۵ KB | ۲۲ KB | ✅ |

تخمین بایت gzip صفحه اول (index + vendor-react + vendor-lucide + css + fonts): **~۳۲۰–۳۵۰ KB gzip** — برای یک ابزار داخلی قابل قبول؛ برای شبکهٔ ضعیف (ایران) و موبایل **سنگین** است.

### ۶.۲ گلوگاه‌های اختصاصی

**الف) هیچ code-split در سطح route وجود ندارد جز React.lazy روی تب‌ها** — این انجام شده ✅ ولی:
- `App.tsx` به‌صورت ایستا import می‌کند: `buildSceneFromProjectDesign` از `roof3dShadingEngine.ts` (۲٬۴۲۹ خط — بزرگ‌ترین فایل فیزیکی) و `simulate24hEnergyBalance` و `calculateEnvironmentalAging` و `computeWaterfallLosses` و `buildWaterfallArgs` و `rearGainPercent` و `analyzeLoadProfile`... یعنی بخش بزرگی از «موتورها» در chunk اصلی‌اند. راه‌حل: تمام موتورها را از مسیرهای «محاسبه‌گر» به dynamic import تبدیل کنید (محاسبات در کلیک دکمه انجام می‌شوند؛ نیاز نیست در boot حاضر باشند).
- `OfficialReportModal` با `React.lazy` لود می‌شود ✅ خوب؛ ولی وقتی لود شد، ۱٫۲۶MB می‌گیردچون docx/exceljs import ایستا دارند. **راه‌حل قطعی:** `const { exportToWordDocument } = await import('../engine/reportingEngine')` فقط داخل handler دکمه؛ آنگاه chunk اصلی گزارش بدون docx/exceljs می‌شود و docx فقط در لحظهٔ export دانلود می‌شود (یا حتی از CDN/ worker).

**ب) `App.tsx` monolith: ۳٬۲۸۳ خط** — هر re-render ریشه، کل تب فعال + هدرها + مودال‌ها را diff می‌کند. با ۴۲ useState وابستگی‌های ریشه‌ای، کوچک‌ترین تغییر (مثلاً تایپ در input نام پروژه) زنجیرهٔ recomputation می‌سازد. React.memo روی تب‌ها + جدا کردن «shell» از «workspace» لازم است.

**ج) i18n ناقص:** `i18n.ts` فقط ۱۴۰ خط است (chrome اصلی: عنوان‌ها، دسته‌بندی‌ها)؛ تمام رشته‌های داخل تب‌ها به‌صورت inline `lang === 'fa' ? '...' : '...'` در هزاران نقطهٔ JSX نوشته شده‌اند. نتیجه: جست‌وجوی/تغییر زبان/ RTL audit ناممکن؛ و هر دو زبان در تمام باندل‌ها حضور دارند. راه‌حل: استخراج به کلیدهای i18n با fallback و یک نوع `MessageKey` امن.

**د) PWA و فونت‌های Google:** `sw.js` precache + manifest ✅؛ ولی `index.html` فونت‌های Vazirmatn/IBM Plex را از `fonts.googleapis.com` می‌کشد — در PWA آفلاین فونت‌ها نمی‌آیند و CSP هم به آن‌ها اجازه می‌دهد. راه‌حل: self-host با subset (woff2 فقط، unicode-range فارسی+لاتین) و precache؛ CSP محدودتر می‌شود و آفلاین کامل می‌شود.

**ه) دسترسی‌پذیری (a11y):** دکمه‌های آیکونی بدون `aria-label` در هدر؛ مودال‌ها بدون focus trap/restore کامل؛ `dir="rtl"` برای فارسی درست است ✅ ولی سند `<html lang>` با تغییر زبان آپدیت نمی‌شود؛ کنتراست `theme-muted` روی پس‌زمینهٔ تیره borderline است. توصیه: `eslint-plugin-jsx-a11y`، تست با axe-core در playwright (playwright-core در devDependencies هست!).

**و) مدیریت state/persistence:** LocalStorage برای کل پروژه (loads، structural، custom catalog) — امکان تجاوز از ۵MB و crash در serialization؛ باید حجم چک و LRU برای snapshotها اعمال شود (هم‌اکنون فقط quick-size max 1000 project در سرور گذاشته شده ✅ مشابه در کلاینت لازم است).

**ز) Web Workers:** فقط `shadingWorker` وجود دارد. محاسبات سنگین دیگر (waterfall کامل، IV curve scan ۸۰ نقطه × منحنی‌های فراوان در IvCurveTracerTab، سناریوهای مقایسه‌ای) روی thread اصلی اجرا می‌شوند و jank ایجاد می‌کنند. رسمی‌سازی «compute worker» عمومی با پروتکل request/response توصیه می‌شود.

**ح) Images/Icons:** lucide-react ایمپورت‌های موردی ✅؛ ولی چند صد آیکون در main chunk؟ با manualChunks vendor-lucide جدا شده ✅ خوب. SVGهای inline بزرگ در index.html؟ خیر.

**ط) تست Frontend محدود ولی موجود است:** `scripts/test-browser-regressions.ts` در CI با Chromium اجرا می‌شود (cold offline، exports read-back، smoke 5 flow، gateway regression). اما **هیچ تست React component-level** (render/interaction با Testing Library) یا visual regression وجود ندارد؛ پوشش UI فقط happy path ها را می‌سنجد.

**ی) TypeScript strict ولی `noUnusedLocals: false`** — کد مرده و importهای بلااستفاده جمع می‌شوند؛ سخت‌گیری افزایشی (`noUnusedLocals`, `noUnusedParameters`) در یک PR جدا توصیه می‌شود (با ~صدها حذف مکانیکی).

### ۶.۳ برنامهٔ بهینه‌سازی پیشنهادی (quantified)

| # | اقدام | اثر تقریبی | تلاش |
|---|---|---|---|
| F-01 | dynamic import docx/exceljs در reportingEngine | −۱٫۰ تا ۱٫۱ MB از chunk گزارش؛ حذف ۲ وابستگی از startup | S |
| F-02 | انتقال unitTestsCore/goldenDatasets به scripts/؛ حذف import از prod | −۲۶۰ KB chunk تست | S |
| F-03 | dynamic import موتورها در App (roof3dShadingEngine، simulation24h، aging) | −۱۵۰ تا ۲۵۰ KB از main chunk | M |
| F-04 | شکستن App.tsx به feature modules + Context (theme/lang/project) + React.memo تب‌ها | کاهش re-render و maintenance | L |
| F-05 | self-host فونت‌های subset + حذف Google Fonts از CSP | آفلاین واقعی؛ CSP سخت‌گیرانه | S |
| F-06 | سخت‌سازی CSP: حذف unsafe-eval/unsafe-inline با nonce | امنیت | M |
| F-07 | تکمیل پوشش E2E: React component tests (Testing Library) + سناریوهای بیشتر (import پروژه، خطاهای ورودی، 150% loads)؛ browser regressions موجود در CI نگه داشته شوند | کیفیت/regression | M |
| F-08 | bundle budget با `size-limit` یا warning manualChunks سخت‌گیرانه (مثلاً fail اگر index > 400 KB gzip) | جلوگیری از افزایش | S |
| F-09 | react-compiler یا حداقل useMemo/useCallback روی مسیرهای داغ؛ حذف inline object/array در props | frame-rate | M |
| F-10 | انتشار منبع بنچمارک‌ها به‌عنوان «build artifact» جدا (نه bundle) | شفافیت | S |

### ۶.۴ جمع‌بندی فرانت‌اند
فرانت «کار می‌کند و lazy-loading نسبتاً درست است» ولی «unfinished performance architecture»: موتورهای عظیم در main chunk، تست‌های واحد در بستهٔ کاربر، فونت از CDN با PWA آفلاین، و i18n سطحی. با F-01..F-05 به‌تنهایی حدود **~۱٫۵ MB از دانلود کاربر نهایی کم** می‌شود (~۴۵٪ کاهش). همچنین توصیه می‌شود `docs/adr/ADR-009-mobile-tablet-responsive` بازبینی شود چون در این ممیزی تست دستی mobile انجام نشد (خارج از دامنهٔ این گزارش اما به‌شدت توصیه می‌شود قبل از release بعدی انجام شود).

---

## ۷. تحقیق افزودن قابلیت‌های پیشرفتهٔ مهندسی

تحقیق انجام‌شده روی استانداردهای جاری و ابزارهای مرجع (PVsyst 7.x، SAM 2023، pvlib 0.16، pvfactors، IEC/IEEE) نشان می‌دهد SolarPV Studio می‌تواند از «ابزار غربال‌گری» به «ابزار مهندسی سطح P50/bankable» ارتقا یابد. دسته‌بندی زیر بر اساس ماژول‌های موجود برنامه چیده شده است:

### ۷.۱ هواشناسی و دادهٔ ورودی (بنیادی‌ترین ارتقا)
1. **TMY/8760 واقعی به‌جای PSH میانگین:** هم‌اکنون NASA POWER (climatology 22-year) و PVGIS MRcalc صدا زده می‌شوند — خوب ولی فقط «climatology monthly». باید TMY (PVGIS TMY / NASA POWER switched temporal) ساعتی/نیم‌ساعتی بگیرد و در سراسر پایپ‌لاین جریان دهد: POA ساعتی، دمای سلول ساعتی، PR ساعتی، تحلیل عدم‌قطعیت. زیرساخت gateway حاضر است؛ فقط مصرف‌کننده‌ها کم‌اند.
2. **آب‌وهوای cloudy-sky:** به‌جای `ghi = 1000·sin^1.15(elev)` (clear-sky کاملاً صاف) از decomposition model (مثلاً Erbs/Reindl برای DHI) یا مستقیم دادهٔ TMY استفاده کنید؛ نتایج shading/tracker روی روزهای ابری ~۱۰٪ بهبود می‌یابد.
3. **آلبدو واقعی سایت:** albedo اکنون ثابت 0.2 (POA) و 0.22 (bifacial) است؛ باید از طبقه‌بندی کاربری زمین (ESA WorldCover / CORINE / نقشهٔ ملی) یا ورودی کاربر گرفته و در یک‌جا تزریق شود. albedo=0.6 (برف) برآورد bifacial gain را دوبرابر می‌کند.
4. **Persistence داده + مدرک عدم‌قطعیت:** هر عددی که از gateway می‌آید باید با TMY uncertainty ± و بازهٔ اطمینان نگهداری شود (آغاز آن با `provenance` موجود است ✅) و در آخر گزارش «Assumptions & Uncertainty» چاپ شود (الهام از P50/P90 بانک).

### ۷.۲ مدل حرارتی ماژول (ارتقای فوری با بیشترین نسبت نتیجه/هزینه)
5. **جایگزینی/تکمیل NOCT با Faiman:** `T = Ta + G / (u0 + u1·WS)`؛ حداقل پارامترها برای rack open-frame: u0≈29, u1≈0 (PVsyst default)، یا u0=25, u1=6.84 (Faiman استاندارد) — کد به‌راحتی می‌تواند `wsMps` از دادهٔ TMY بگیرد. این ارتقا SAM-NOCT را که در ادبیات outlier شناخته می‌شود کنار می‌زند.
6. **King/SAPM به‌عنوان گزینهٔ دوم** (کاربر می‌تواند انتخاب کند؛ SAPM ضرایب a,b,c,ΔE دارد و برای BIPV/roof mount دقتبالاتری می‌دهد).
7. **دمای سلول با wind + mounting correction:** همان mounting deltas فعلی را نگه دارید ولی **از وابستهٔ NOCT جدا و مستند به استاندارد** (مثلاً IEC 61853-2 Innenraum/Außenmessungen، یا SAPM open rack/close roof) کنید تا کد «screening» نماند.

### ۷.۳ Optics و سایه‌زنی
8. **IAM بر اساس AOI واقعی** (رفع باگ §4.12) + **IAM زمینی/آسمانی با Brandemuehl** (در کد هست ✅ ولی weighting باید روی POA واقعی بیاید نه ثابت 0.95/0.88).
9. **Shading سه‌بعدی کامل:** موتور three.js موجود است؛ باید «shading heatmap» ماهانه + منحنی «زمان سایه به تفکیک row» + «annual loss from 3D» به‌عنوان ورودی به waterfall (بجای override دستی) اضافه شود.
10. **Dynamic row-spacing optimizer:** بهینه‌سازی خودکار GCR/tilt برای maximizing yield با محدودیت زمین (مسئلهٔ ۲-هدفه) — کد پایه geometry ردیف را دارد؛ فقط حلقهٔ بهینه‌سازی (grid search + Pareto) لازم است.

### ۷.۴ Bifacial (اولویت بالا برای بازار ایران ـ HJT و TOPCon دوطرفه)
11. **پیاده‌سازی واقعی view-factor بر اساس Hottel crossed-strings / Walton** با integral دقیق (نه chord-slice هیوریستیک)؛ یا embedding `pvfactors` port (همان الگوریتم open-source با license MIT) به‌صورت pure-TS.
12. **Ray-tracing backend اختیاری** برای ردیاب‌های دو‌محوره و BIPV پیچیده (§مراجع Mikofski 2019).
13. **کالیبراسیون روی سایت مرجع:** یک سایت مجهز (مثلاً مونیخ/Phoenix از فایل‌های SAM موجود در repo: `sam_2023_12_17_bifacial_reference_case.sam`) به‌عنوان golden test؛ در حال حاضر فقط «compare stored values» است؛ باید در CI اجرا شود.

### ۷.۵ DC/AC و حفاظت (ارزش افزوده مهندسی واقعی)
14. **Partial shading و bypass diodeها:** مدل تک‌دیودی هست؛ باید bypass diodes (۳ تایی per module) و mismatch loss واقعی بین رشته‌ها تحت سایهٔ جزئی اضافه شود (امروز «mismatch −1.3٪» ثابت تزریق می‌شود).
15. **آرک‌فالت و سری/موازی:** IEC 63027 / NEC 690.11 AFCI detection؛ سری اتصال (series arc) — simulation فعلی DC سیستم را کامل نمی‌کند.
16. **اتصال معکوس / Reverse polarity و OCPD coordination** در سطح استرینگ؛ IEC 62548 الزام fuse per string دارد (اگر >۲ string per fuse) — بررسی کنید.
17. **Grid code compliance table:** IEC 61727/IEEE 1547-2018 (voltage-ride-through، frequency-response، power quality) برای اینورترها در ایران — مبحث مقررات ملی/ساتبا ۱۴۰۲. هم‌اکنون چیزی نیست.
18. **Harmonic/flicker دقیق‌تر:** موتور harmonics هست؛ باید IEC 61000-3-6/61000-3-7 (MV/LV emission limits) و TR 61000-3-13 داشته باشد و THDv/THDi پشتیبانی‌شده در PCC را بسنجد. همچنین بجای IEC (که برای هارمونیک‌ها فقط گزارش فنی دارد) IEEE 519-2022 نسخهٔ جاری است — ویرایش جدید مرزهای TDD/Isc را جایگزین THD کرده است؛ کد باید به ویرایش 2022 مهاجرت کند.
19. **Short-circuit studies (IEC 60909) و arc-flash (IEEE 1584-2018)** برای پست MV — مستقیماً نزدیک به موتور mvSubstationEngine است.
20. **حفاظت انتخابی/Coordination Curves (TCC)** — نمودارهای زمان-جریان و selectivity check برای fuse/breakerهای استرینگ/اینورتر/ترانسفورماتور.

### ۷.۶ BESS (بازار در حال رشد ایران)
21. **Calendar + cycling aging مدل کامل:** Rainflow counting برای پروفایل روزانهٔ شارژ/دشارژ، مدل degradation نفوذکننده (مثلاً Schmalstieg/Wang) برای LFP؛ خروجی: ظرفیت باقیمانده در سال N؛ هزینهٔ جایگزینی واقعی در cashflow.
22. **Optimization of dispatch:** حل مسئلهٔ LP/QP روزانه برای maximizing revenue (self-consumption + peak shaving + PPA + ancillary) — امروز فقط اندازه‌گذاری ظرفیت هست.
23. **استانداردهای ایمنی BESS:** IEC 62619، IEC 63056 (safety)، NFPA 855، detection gas/venting، thermal runaway propagation — چک‌لیست compliance در تب BESS.
24. **RTE واقعی:** round-trip hourly با راندمان‌های وابسته به SOC/C-rate (امروز ثابت است).

### ۷.۷ سازه و ژئوتکنیک (نیروگاهی)
25. **P-y analysis (Matlock/API RP 2A)** برای پی‌های پالاشکوب/اسکرو در خاک‌های غیرچسبندهٔ واقعی؛ مقایسهٔ با Broms (هم‌اکنون فقط Broms).
26. **Eurocode 7 partial factors (DA1)** به‌جای FoS کلی 1.75 — تطابق با استاندارد جهانی برای پی.
27. **Snow drift (EN 1991-1-3 Annex E)** و **wind uplift با Gust factor و surface roughness واقعی سایت** (هم‌اکنون ۱۳۰/۱۴۰ km/h ثابت منطقه‌ای)؛ به‌علاوه بررسی خستگی/خستگی چرخه‌ای برای trackerها (IEC 62817؟ در واقع IEC 62817 مربوط به tracker design qualification).
28. **Module mechanical load IEC 61215 mechanical & snow/wind load tests** در کاتالوگ: فیلدهای 2400/5400/8100 Pa باید وجود داشته باشد (هم‌اکنون نیست).
29. **Corrosion:** ISO 9223 فعلی هست ✅؛ تکمیل با ISO 12944 (coatings) و ISO 1461 (galvanizing) برای ساختارها؛ تست ضمانت 25 ساله.

### ۷.۸ مالی و بانک‌پذیری
30. **P50/P90:** عدم‌قطعیت آب‌وهوایی (۱۲–۱۵٪) را در yield وارد کنید و NPV/IRR را در سه سناریو گزارش کنید.
31. **Escalation واقعی:** tariffEscalation = f(inflation index SATBA/CBI)، opexEscalation از شاخص واقعی، degradation از گارانتی (0.4–0.55٪ linear + 1–2٪ year-1 LID).
32. **نمونه‌گیری ایران‌سازگار:** ساختار تعرفهٔ ساتبا برای نیروگاه‌های خورشیدی (نرخ‌های خرید تضمینی، سقف تعاملی) — موتور iranianRegulationsFinancial باید نسخهٔ سالانه به‌روزرسانی شود (۱۴۰۴/۱۴۰۵)؛ هم‌اکنون فقط ساختار، نه اعداد جاری.
33. **Sensitivity tornado + Monte Carlo:** ماژول uncertaintyPropagation هست ولی در UI گزارش «official» نیست؛ باید به‌عنوان بخش استاندارد گزارش «Caveats & Sensitivity» بیاید.
34. **Degradation مالی vs فیزیکی یکسان‌سازی:** هم‌اکنون waterfall بدون degradation است؛ باید یکبار تعریف و همه‌جا استفاده شود.

### ۷.۹ نظارت، بهره‌برداری و «Digital Twin»
35. **IEC 61724-1 monitoring KPIs:** PR، Specific yield، Availability، Soiling ratio detection — از دادهٔ SCADA سایت واقعی بخوانید و با مدل مقایسه کنید.
36. **Weather-corrected PR (WCPR):** نسخهٔ IEC 61724-1:2021 با تصحیح دمایی PR — استاندارد WCPR باید اضافه شود.
37. **Anomaly detection ساده:** تشخیص خاک‌گرفتگی تدریجی (افت PR بدون تغییر آب‌وهوا) و offline stringها — بدون نیاز به ML پیچیده؛ الگوریتم CUSUM/threshold روی PR روزانه.
38. **Commissioning tests (IEC 62446-1):** چک‌لیست راه‌اندازی + فرم‌های تست (insulation resistance، string I/V curve trace، polarity) — برنامه این تب را خالی دارد و جای خالی ارزشمندی است.
39. **Documentation/O&M plan generator:** تولید دفترچهٔ O&M (استاندارد IEC 62446-2 برای O&M) از همان گزارش official موجود — یک قدم ساده با ارزش بازار بالا.

### ۷.۱۰ رعایت استانداردها و مدرک‌سازی (Compliance & Certification)
40. **ماتریس تطابق استاندارد در کاتالوگ:** برای هر ماژول/اینورتر: IEC 61215 (design qualification)، IEC 61730 (safety)، IEC 62109 (converters)، IEC 62446 (tests)، ISO 9001 manufacturer، MCS/CE/TÜV logos، گارانتی — فیلدهای اجباری برای گزارش رسمی.
41. **گواهی‌نامه‌های بانکی:** Stamp «IEC 61724-1 compliant monitoring plan» و «IEC 62446-1 commissioning report» در خروجی‌های OfficialReportModal — مستقیماً قابل ممیزی توسط بانک.
42. **GIS/zoning:** اتصال به لایه‌های محیط‌زیستی/حریم خطوط فشار قوی/مناطق حفاظت‌شده (OSM Overpass حاضر است ✅) برای due-diligence خودکار مکان.

### ۷.۱۱ معماری و پلتفرم
43. **مهاجرت persistence از فایل snapshot به SQLite (WAL) یا Postgres**؛ پروژه‌ها، snapshotهای زماندار، و audit log تغییرات.
44. **API versioning واقعی (`/api/v1`) و OpenAPI spec** (هم‌اکنون غیررسمی)؛ client generation برای اپ موبایل آینده.
45. **Plugin/registry برای استانداردهای ملی:** ایران (INBC/مبحث ۶، ساتبا، توانیر) + بین‌المللی (IEC/ASCE/Eurocode) با انتخاب کشور.
46. **Server-side rendering برای گزارش‌ها:** گزارش‌های PDF (Playwright موجود است) با template HTMLای که همـان print CSS را دارند — امروز فقط window.print() و innerHTML clone است.

### ۷.۱۲ جمع‌بندی اولویت‌بندی قابلیت‌های جدید (Impact × Effort)

| گروه | مثال | Impact | Effort | پیشنهاد فاز |
|---|---|---|---|---|
| رفع باگ‌های فیزیکی فعلی | AOI در IAM، آلبیدوی ثابت، ترانپوزیشن نامتناقض | بسیار بالا | کم | **فاز ۱ (فوری)** |
| TMY/8760 flow واقعی | PVGIS TMY + Faiman | بالا | متوسط | **فاز ۱** |
| Bifacial view-factor واقعی | pvfactors-port | بالا | متوسط | **فاز ۲** |
| WCPR + IEC 61724 KPIs | monitoring | متوسط-بالا | متوسط | **فاز ۲** |
| BESS cycling aging | rainflow + Wang | بالا (تجاری) | زیاد | **فاز ۳** |
| P-y pile analysis | Matlock | متوسط | متوسط | **فاز ۳** |
| Digital twin/anomaly | CUSUM + PR trending | بالا (بازار) | زیاد | **فاز ۴** |
| Grid code compliance | ساتبا/1547 | متوسط | متوسط | **فاز ۲** |

---

## ۸. جدول اولویت‌بندی یافته‌ها

| ID | عنوان | فایل:خط | شدت | تلاش | دسته |
|---|---|---|---|---|---|
| BUG-02 | IAM(beam) با zenith به‌جای AOI واقعی (تابش‌سنجی Beam؛ بیش‌برآورد افت تا ~۳٫۶ امتیاز در زمستان) | optical/iamEngine.ts:232,250؛ core/physicalLossContract.ts | P2 | کم | محاسبات |
| BUG-03 | واگرایی بین ۴–۵ مسیر محاسبهٔ yield (مصرف‌کنندهٔ زنده: فقط App از waterfall ممویافته استفاده می‌کند؛ مسیرهای canonical/unified فقط در verify-phase03/04 مصرف می‌شوند) | annualYieldEngine.ts, waterfallLossEngine.ts, pvEngineAdvanced.ts | **P2** (اصلاح از P1 — reachability مسیر کاربری نداشت؛ ناهماهنگی حلقهٔ شواهد CI) | متوسط | معماری/محاسبات |
| FND-01 | Snow Engine «Marion» نیست؛ citation اشتباه (Solar Energy 97:112-121)؛ γ=4.49 اختراعی | snow/marionSnowEngine.ts:68-71 ؛ externalValidation.ts:241 | **P1** | متوسط | فیزیک/صحت گزارش |
| FND-02 | Soiling «discrete bins» و «Section IV, page 2393, Table 1 & Eq.(2)» **اختراعی**؛ مدل مرجع Kimber = نرخ خطی ۰٫۱–۰٫۳٪/روز + آستانهٔ ۶mm + grace ۱۴ روز + سقف ۳۰٪ (pvlib) | soiling/kimberSoilingEngine.ts:41-100 | **P1** | کم | فیزیک/حقوقی |
| FND-03 | Bifacial chord-slice به‌عنوان «gain» چاپ می‌شود؛ نه Hottel نه SAM؛ ثابت 0.08 و BF cap 0.25 بی‌پشتوانه | bifacial2dViewFactor.ts:174 ؛ bifacialGain.ts | **P1** | متوسط | فیزیک |
| VAL-01 | آلبیدوی ثابت 0.2 در POA (بدون ورودی کاربر/سایت) | solarPvEngine.ts:657 | P2 | کم | محاسبات |
| VAL-02 | حالت annual_energy حرارتی: بیش‌برآورد افت حرارتی (NOCT@G=1000 روی T_mean) | core/thermalDerate.ts:47-58 | P2 | کم | فیزیک |
| VAL-03 | ترانپوزیشن سطحی: منحنی دستی + 16.8 پیش‌فرض + ثابت 1.168/1.25 نامتناقض | waterfallLossEngine.ts:38-52؛ annualYieldEngine.ts:406 | P2 | متوسط | فیزیک |
| VAL-04 | Clipping خطی بدون مرجع؛ بهتر: شبیه‌سازی ساعتی و محدودیت AC واقعی | annualYieldEngine.ts:133-145؛ waterfallLossEngine.ts:187-199 | P2 | متوسط | فیزیک |
| VAL-05 | Defaults مالی غیرمعتبر: opexEsc 8٪، degradation 0.5٪ ثابت، capex $1100/kWp و $350/kWh و derate 0.78 در QuickSizing | financialEngine.ts:523؛ solarPvEngine.ts:625-680 | P2 | متوسط | مالی |
| VAL-06 | atm: PR دوگانه (IEC vs compound) در UI گیج‌کننده؛ arithmeticSum بی‌برچسب | waterfallLossEngine.ts؛ گزارش‌ها | P2 | کم | UX/مهندسی |
| VAL-07 | DC cabling ثابت −1.4٪ بدون اتصال به موتور VoltageDropDc موجود | waterfallLossEngine.ts:262 | P2 | کم | یکپارچگی |
| VAL-08 | inverter eff −2.2٪ و MPPT −0.4٪ ثابت، بدون خواندن از کاتالوگ (inverter.efficiencyMaxPct موجود است!) | waterfallLossEngine.ts:277-296 | P2 | کم | یکپارچگی |
| VAL-09 | mv_transformer: waterfall بدون شرط / unified با شرط ≥50kWp | آبشار و unified | P2 | کم | ثبات |
| ARCH-01 | importSnapshot نیم‌سازگار + بدون validation (projects replace / catalog merge) | solarPvEngine.ts:225-258 | P2 | کم | سرور/داده |
| ARCH-02 | saveDatabase سنکرون در هر mutation | server.ts:159-175, 922+ | P2 | متوسط | سرور/عملیات |
| ARCH-03 | JWT دستی HS256-only بدون kid/JWKS/RS256 و بدون clock-skew | server.ts:766-846 | P2 | متوسط | امنیت |
| ARCH-04 | CSP شامل unsafe-eval/unsafe-inline؛ meta CSP شامل frame-ancestors (نادیده گرفته می‌شود) | index.html؛ server.ts:60-75 | P2 | کم | امنیت |
| ARCH-05 | unitTestsCore/goldenDatasets به bundle مرورگر (chunk ۲۶۰KB) | RFC3ReportsTab.tsx:142 | P2 | متوسط | فرانت |
| FE-01 | باندل main ۸۷۳KB؛ موتورهای استاتیک در App (roof3dShadingEngine و…) | vite.config؛ App.tsx:82 | P2 | متوسط | فرانت |
| FE-02 | OfficialReportModal ۱.۲۶MB (docx+exceljs ایستا) | OfficialReportModal؛ reportingEngine.ts:20 | P2 | کم | فرانت |
| FE-03 | App.tsx monolith: ۳٬۲۸۳ خط، ۴۲ useState، prop drilling، بدون context | App.tsx | P2 | زیاد | فرانت |
| FE-04 | Google Fonts در PWA آفلاین + CSP باز روی fonts.gstatic | index.html:16-18 | P3 | کم | فرانت/PWA |
| FE-05 | i18n سطحی: رشته‌های inline فارسی/انگلیسی در هزاران JSX | i18n.ts (۱۴۰ خط) | P3 | زیاد | فرانت |
| FE-06 | نبود تست‌های کامپوننت‌-محور React (unit/component)؛ browser regressions و smoke فقط سناریوهای اصلی را پوشش می‌دهند | scripts/test-browser-regressions.ts؛ package.json | P3 | متوسط | فرانت/QA |
| FE-07 | noUnusedLocals خاموش؛ ۹۵ هشدار eslint؛ ۴۸ as any | tsconfig؛ eslint | P3 | کم | فرانت/کیفیت |
| SEC-01 | CSP frame-ancestors فقط در meta؛ X-Frame-Options تکیه‌گاه است؛ CORS مستند نیست | index.html؛ server.ts | P3 | کم | امنیت |
| SEC-02 | rate-limit فقط ۲ مسیر؛ CPU-heavy endpoints آزاد | server.ts | P3 | متوسط | امنیت |
| SEC-03 | zod نصب ولی استفاده‌نشده؛ validation دستی تکراری | package.json؛ server.ts | P3 | متوسط | امنیت/کیفیت |
| PHY-01 | single-diode: ثابت 0.2265 برای مساحت؛ fill-factor از ۸۰ گام خام | singleDiodeModel.ts:229 | P2 | کم | فیزیک |
| PHY-02 | Brandemuehl diffuse weighting با مقادیر ثابت 0.95/0.88 در حالت totalPoa≤0 | optical/iamEngine.ts | P2 | کم | فیزیک |
| PHY-03 | Broms: کف cu=25 kPa و ناهماهنگی FoS (1.75 cohesive vs 1.8 cohesionless) | geotech/bromsMethod.ts | P3 | کم | ژئوتکنیک |
| PHY-04 | ASHRAE IAM برش سخت به صفر در θ≥85° (غیرفیزیکی) | optical/iamEngine.ts:169-175 | P3 | کم | فیزیک |
| PHY-05 | thermo-optic coupling با κ=1.35 بدون مرجع | optical/iamEngine.ts | P3 | کم | فیزیک |
| PHY-06 | Kasten 1966: توان `-1.25` به‌جای `-1.253`؛ `PEREZ_1990_BINS` در هر فراخوانی بازساخته می‌شود؛ `f2` بدون clamp | solarPvEngine.ts:617,634-668 | P3 | کم | فیزیک |
| DATA-01 | `dataRetrievalDate: '2024-10-15'` منجمد در fallback اقلیمی؛ elevation تخمینی | climaticData.ts:310 | P3 | کم | داده/شفافیت |
| BAT-01 | مدل BESS فقط capacity؛ بدون aging سیکلی/تقویمی | batteryEngine؛ simulation24h | P2 | زیاد | مهندسی |
| PERF-01 | رندر تب فعال بدون memoization؛ حلقه‌های سنگین روی main thread (به‌جز shading) | App و تب‌ها | P3 | متوسط | فرانت |
| ENV-01 | production با tsx اجرا می‌شود (نه build→node) | Dockerfile؛ package.json | P3 | متوسط | عملیات |

**توزیع:** P1: ۳ · P2: ~۲۴ · P3: ~۱۴. (یادآوری: P1ها همگی «حذف/بازبرچسب‌گذاری ادعاهای غیرمعتبر» یا «ناهماهنگی محاسباتی بین نتایج کاربر» هستند؛ هیچ‌کدام crash/data-loss نیستند.)

---

## ۹. نقشهٔ راه پیشنهادی

### فاز ۱ (۰–۴ هفته) — «درست‌کردن فیزیک و دادن صداقت»
1. رفع BUG-02 (AOI واقعی در IAM) — امضای `calculateEffectivePoaIam` را به `aoiBeamDeg` تغییر دهید؛ caller (physicalLossContract/unitTests) را اصلاح کنید.
2. یکپارچه‌سازی yield: facade `estimateAnnualYield()`؛ deprecate مسیرهای دیگر؛ `mv_transformer` و جدول PR unified/waterfall را یکسان کنید؛ smoke test «five paths within 1%» در CI.
3. ورودی `albedo` به `PoaIrradianceRequest` و `WaterfallArgs`؛ اتصال `dc_cabling` واقعی (calculateVoltageDropDc) و `inverter.efficiencyMaxPct` از کاتالوگ.
4. بازبرچسب‌گذاری گزارش: هر خروجی snow/soiling/bifacial با «screening, unvalidated — not for bankable use» چاپ شود (UI + OfficialReportModal + DOCX/Excel).
5. ترانپوزیشن ثابت را با «Perez روی TMY» جایگزین یا هم‌سنگ کنید (لازم نیست P1 باشد؛ در فاز ۱ نگه داشته می‌شود چون پیش‌نیاز مسیر ساعتی است).
6. رفع ARCH-01 (snapshot validation + backup قبل از replace) و ARCH-02 (debounced/async persist یا SQLite).

### فاز ۲ (۴–۱۰ هفته) — «معماری و کیفیت»
7. F-01..F-06: باندل (dynamic import docx/exceljs؛ انتقال تست‌ها؛ dynamic import موتورها؛ self-host fonts؛ CSP nonce؛ size budget).
8. JWT به `jose` با RS256/JWKS و clockTolerance؛ zod همهٔ endpointها؛ express-rate-limit عمومی؛ CORS صریح.
9. CI: افزودن React component tests (Testing Library)، `npm audit` gate، ساخت server به JS خالص و اجرای `node dist-server` در Docker.
10. خروجی IEC 61724-1 KPIs + WCPR + PR با تفکیک ماهانه؛ یکپارچه‌سازی degradation در همهٔ مسیرها.
11. TMY ساعتی از PVGIS/NASA POWER با persistence و uncertainty envelope.

### فاز ۳ (۲–۴ ماه) — «به قابلیت‌های بانکی نزدیک شوید»
12. Faiman/SAPM module temperature با wind؛ POA ساعتی واقعی؛ PR ساعتی؛ Soiling Kimber واقعی (threshold سمت کاربر قابل‌تنظیم).
13. Bifacial view-factor واقعی (Hottel/Walton یا port از pvfactors) + اجرای golden test روی `benchmarks/reference_files/sam_2023_12_17_bifacial_reference_case.sam` در CI؛ خروجی «validated vs SAM within ±x%» یا حذف عدد.
14. BESS: rainflow aging + dispatch optimization + IEC 63056 checklist.
15. مالی ایران‌سازگار: تعرفهٔ ساتبا نسخهٔ جاری + تورم شاخص‌دار + گزارش P50/P90 با tornado sensitivity.
16. Digital-twin MVP: ورود دادهٔ SCADA CSV → PR trending + تشخیص خاک‌گرفتگی (CUSUM) + IEC 62446-1 commissioning PDF.

### فاز ۴ (مستمر) — «مقیاس و اکوسیستم»
17. SQLite/Postgres + migration versioning؛ OpenAPI؛ auth SSO (OIDC)؛ چند-tenant.
18. ماتریس تطابق استانداردها (IEC 61215/61730/62109/62446، ساتبا/توانیر) در کاتالوگ و منع خروجی بدون آن.
19. مستندات فنی عمومی (README مهندسی + ADRهای جدید) بازنویسی شود؛ لاگ تغییرات مهندسی (`docs/audit/`) ادامه یابد.

---

## ۱۰. نکات مثبت قابل توجه (برای تعادل و منصفانه بودن ممیزی)

1. **معماری قراردادی واحدها** (branded types، solarGeometryContract) — جلوی کلاس کاملی از باگ‌ها را گرفته و بهترین بخش کد است.
2. **IEC 62548 رشته‌بندی** (voc سرد، mppt گرم با سلول داغ، گاماPmp، αIsc decoupling) — بهتر از بسیاری از ابزارهای تجاری ساده است.
3. **Perez 1990 و Kasten 1966** — جداول و ضرایب دقیقاً مطابق مرجع پیاده شده‌اند (تأیید خط‌به‌خط).
4. **pvlib SingleAxis/backtracking** — پورت وفادار با ارجاع Eq. ها؛ قابل تحسین.
5. **IRR/LCOE با Descartes + bisection bracketing** — مقاوم و صحیح (آزمون شده).
6. **اعتبارسنجی ورودی سمت سرور** برای تقریباً همهٔ endpointها؛ constant-time secret compare؛ fail-closed production؛ graceful dev-mode warning.
7. **Provenance/unwrapping دادهٔ gateway** (sourceProvider, isEstimatedFromGlobalModel, REGIONAL_ANALYTICAL_MODEL label) — شفافیت علمی کم‌یاب؛ باید الگوی بقیهٔ اعداد هم شود.
8. **دروازه‌های CI مهندسی** (`verify:engine-claims`, `verify:physics-reference-gate`, `verify:source-invariants`, `verify:physics-registry`) — کم‌نظیر؛ باید زنجیره‌های snow/soiling/bifacial را هم بگیرد
9. **۵-path convergence harness** و **unit-test suite بزرگ** (حتی اگر در bundle باشد، خودِ testها ارزشمندند)؛ evidence JSON‌ها و gate scripts.
10. **PWA با precache versioned** و SW اختصاصی — برای اقلیم‌های ضعیف طراحی شده.
11. **مستندات ADR** گسترده — حتی اگر با برخی ادعاها مخالفم، وجود فرایند تصمیم‌گیری ثبت‌شده دارایی است.
12. **نصب/بیلد/اجرای سالم**: `npm ci`، build، type-check، lint، test — همه سبز؛ CI موجود.
13. **چاپ گزارش Official با disclaimer «NOT A COMPLIANCE CERTIFICATE»** در خود خروجی‌ها ✅ — رفتار حرفه‌ای که باید در همهٔ خروجی‌ها تعمیم یابد.

---

## ۱۱. محدودیت‌های این ممیزی

1. **«خط‌به‌خط»** در عمل به‌معنای مطالعهٔ کامل تمام فایل‌های موتور محاسباتی (همهٔ ~۴۰ فایل نام‌برده)، سرور (۱٬۹۲۴ خط)، قراردادها و نقاط بحرانی UI است؛ فایل‌های صرفاً وِب‌نما (مثل index.css، tailwind config) به‌صورت نمونه بررسی شدند. پوشش مستقیم ~۸۵–۹۰٪ خطوط حیاتی.
2. فایل‌های بسیار بزرگ تست (`unitTestsCore.ts`) فقط با grep/sampling ارزیابی شدند؛ صحت ۵٬۹۷۹ خط تست به‌صورت مجزا داوری نشد.
3. اجرای زندهٔ UI در مرورگر (smoke manual) در این محیط انجام نشد؛ یافته‌های فرانت براساس کد + بیلد + اندازهٔ chunks است، نه Lighthouse اندازه‌گیری‌شده.
4. بخش «تحقیق» (§6 و §7) بر پایهٔ دانش تخصصی و مراجع منتشرشده است (pvlib docs، Duffie & Beckman، IEC abstracts، NREL reports)؛ دسترسی به متن کامل همهٔ استانداردها (IEC/NIS) از این محیط ممکن نبود و ارجاعات به سطح «شناخته‌شده در ادبیات» محدود است.
5. یافته‌های این گزارش در تاریخ 2026-11-17 و commit `64f173a` + شاخهٔ جاری صادق است؛ هر تغییر بعدی ممکن است اعتبار آن‌ها را تغییر دهد.
6. هیچ تغییری در کد پیشنهادهای این گزارش اعمال نشده؛ این صرفاً گزارش ممیزی است (مگر فایل گزارش).

---

## ۱۲. مراجع

1. NOAA Global Monitoring Division — Solar Calculation Details (archiver: NOAA Technical Report).
2. Duffie, J.A. & Beckman, W.A. *Solar Engineering of Thermal Processes*, 4th/5th ed., Table 2.5.1 (Perez 1990 8-bin coefficients; κ = 1.041 for Z in radians).
3. EnergyPlus Engineering Reference, «Sky Radiance Model» (Perez 1990 implementation reference).
4. Kasten, F. (1966). «A new table and approximate formula for relative optische Luftmasse», *Arch. Meteorol. Geophys. Bioclimatol.* B 14:206–223 (پیاده‌سازی pvlib `get_relative_airmass`، کلید `kasten1966`: 1/(cosZ + 0.15·(93.885−Z)^(−1.253))). فرمول توسعه‌یافتهٔ Kasten & Young (1989) نیز در برخی منابع با ضرایب 0.50572/96.07995/−1.6364 رایج است.
5. Martin, N. & Ruiz, J.M. «Calculation of the PV modules angular losses under field conditions by means of an analytical model», *Solar Energy Materials & Solar Cells* 70 (2001) 25–38; corrigendum SEMSC 110 (2013) 154. a_r ∈ [0.08, 0.25]; pvlib `iam_martin_ruiz`.
6. Marion, B. et al. «Measured and modeled photovoltaic system energy losses from snow for Colorado and Wisconsin locations», *Solar Energy* 97 (2013) 112–121. DOI: 10.1016/j.solener.2013.07.029.
7. Kimber, A., Mitchell, L., Nogradi, S. & Wenger, H. «The Effect of Soiling on Large Grid-Connected Photovoltaic Systems in California and the Southwest Region of the United States», 2006 IEEE 4th World Conference on Photovoltaic Energy Conference (WCPEC-4), Waikoloa, HI, pp. 2391–2395. DOI: 10.1109/WCPEC.2006.279690. (مدل مرجع: نرخ خطی روزانه + cleaning threshold + grace period؛ رجوع به pvlib `soiling.kimber`.)
8. Perez, R. et al. «Modeling daylight availability and irradiance components from direct and global irradiance», *Solar Energy* 44(5) (1990) 271–289. (جدول ۸ باین‌ها راستی‌آزمایی شد با: pvlib `irradiance.perez` [ε, Δ, IR(Z³، κ=1.041)، باین‌های 1→8] و Radiance/gendaylit `sky_clearness()`؛ هر دو عیناً همان فرمول کد را دارند.)
9. De Soto, W. et al. «Improvement and validation of a model for photovoltaic array performance», *Solar Energy* 80 (2006) 78–88 (SAM five-parameter model).
10. IEC 62548:2023 PV array design — maximum system voltage & MPPT window; IEC 61853-2/-3/-4 energy rating; IEC 61724-1:2021 monitoring (PR, WCPR); IEC 61215/61730/62109/62446; IEC 62446-1 (grid-connected systems — testing); IEC 63056 (BESS safety); IEC 61000-3-6/3-7/TR 61000-3-13 (emission); IEEE 519-2022 (TDD limits); IEEE 1547-2018 (interconnection); IEC 60909 (short circuit); IEEE 1584-2018 (arc flash).
11. pvlib python 0.16 docs — `tracking.singleaxis`, `shading.projected_solar_zenith_angle`, `aoi_projection`, `iam_martin_ruiz`, `iam_ashrae`.
12. Marion & Dobos, «Rotation Angle for the Optimum Tracking of One-Axis Trackers», NREL/TP-6A20-58891 (Eq. 14–16).
13. Mikofski, M. et al. «Bifacial Performance Modeling in Large Arrays», IEEE JPV / NREL (2019) — 2D view factor ±1% vs measured； ray-tracing ≤0.6–2% (pvsc46).
14. Anderson, K.S. et al. «Testbed Validation of Bifacial Performance Modelling Methodology using Ray-Tracing Methods», *Progress in Photovoltaics* (2020) DOI 10.1002/pip.3309.
15. Osti 2003640 — «PV Module Operating Temperature Model Equivalence and Parameter Translation» (NOCT vs Faiman vs SAPM vs PVsyst equivalence; SAM-NOCT outlier).
16. Broms, B.B. «Lateral Resistance of Piles in Cohesive and Cohesionless Soils», *Journal of the Soil Mechanics and Foundations Division, ASCE* 90 (1964).
17. FHWA-NHI-16-009 / GEC 012 — Design and Construction of Driven Pile Foundations (Broms short pile equations).
18. Brandemuehl, M.J. & Beckman, W.A. «Transmission of diffuse radiation through CPC and flat plate collector glazings», *Solar Energy* 24(5) (1980) 511–513.
19. pvlib `soiling.kimber` — مرجع پیاده‌سازی استاندارد مدل Kimber (cleaning_threshold default 6 mm، soiling_loss_rate 0.0015، grace_period 14 روز، max_soiling 0.3).
20. pvlib `iam_ashrae`: IAM = 1 − b0(1/cosθ − 1) — no cutoff at 85° in the original model.

---

*پایان گزارش — SolarPV Studio v1.0.3 — ممیزی 2026-11-17 — شاخه `arena/b3648451-solarpv-studio`*
