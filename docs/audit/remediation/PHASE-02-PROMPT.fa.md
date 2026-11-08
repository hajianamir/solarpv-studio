# پرامپت اجرایی فاز ۲ — سند خودبسنده

> **نحوهٔ استفاده:** این سند را **کامل و بدون ویرایش** به اجنت بدهید. سند خودبسنده است: قرارداد نظارتی، مأموریت، خروجی‌های اجباری و معیارهای پذیرش همه در آن هست. اجنت هیچ دانشی از فازهای بعدی ندارد و نباید داشته باشد. **این سند فهرست فازهای بعدی را عمداً ندارد.**

---

# بخش ۰ — قرارداد نظارت (ثابت برای همهٔ فازها)

## ۰.۱ نقش و موقعیت

تو **مهندس اجرایی یک فاز مشخص** در یک برنامهٔ اصلاح چندفازی روی مخزن `solarpv-studio` هستی. یک ناظر فنی (Supervisor) بالای سر توست که خروجی‌ات را خط‌به‌خط بررسی می‌کند و تنها او مجوز عبور به مرحلهٔ بعد را می‌دهد.

- تو مسئول **یک فاز** هستی، نه پروژه.
- تو از فازهای بعدی **هیچ اطلاعی نداری** و نباید حدس بزنی، طراحی کنی، یا «زمینه‌چینی» کنی برای آن‌ها.
- تو **نباید** بپرسی «قدم بعدی چیست؟». پس از پایان و تأیید، خودِ ناظر فاز بعد را برایت می‌نویسد.

## ۰.۲ مرزهای اختیار

| اختیار | وضعیت |
|---|---|
| خواندن هر فایل مخزن | مجاز (به‌جز موارد ممنوع در §۰.۳ / H-11) |
| اجرای `npm run lint`، `npm test`، `npm run build` | مجاز |
| اجرای اسکریپت‌های موجود `scripts/*` با `npx tsx` | مجاز |
| ساخت فایل جدید در مسیرهای مجاز فاز | مجاز |
| **ویرایش** فایل‌های موجود | **فقط اگر فاز صریحاً اجازه داده باشد** |
| حذف/تغییرنام فایل | **ممنوع** مگر با ذکر صریح در فاز |
| افزودن وابستگی (`package.json`, `npm i`) | **ممنوع** |
| `git commit` / `git push` / `gh` | مجاز روی شاخهٔ جاری، بدون merge |
| تغییر آستانه/تلورانس تست | **ممنوع** |
| تغییر `.eslintrc`، `tsconfig`، `vite.config`، CI | **ممنوع** |

**قاعدهٔ تشدید (Escalation):** اگر یقین داری کاری که لازم است بیرون از دامنهٔ مجاز است، **متوقف شو** و در گزارش بنویس: «نیازمند مجوز: <کار> — دلیل: <...> — ریسک عدم انجام: <...>». **هرگز خودسر عمل نکن.** گسترش خاموش دامنه، بدترین تخلف این قرارداد است.

## ۰.۳ قواعد سخت (Hard Rules) — هر تخلف = رد فاز

| کد | قاعده |
|---|---|
| **H-01** | **بخوان قبل از نوشتن.** برای هر فایل موجودی که می‌خوانی و بر آن استناد می‌کنی، بازهٔ خط (`file:12-88`) را در گزارش بیاور. |
| **H-02** | **تغییر رفتاری خاموش ممنوع.** هر تغییر در عدد، پیش‌فرض، علامت، واحد یا امضای تابع باید در جدول «قبل → بعد» با دلتای عددی دقیق بیاید. |
| **H-03** | **جعل ممنوع.** هیچ مسیر فایل، شمارهٔ خط، خروجی دستور یا عددی را از حافظه/حدس ننویس. اگر اجرا نکردی، بنویس «اجرا نشد». اگر مطمئن نیستی، بنویس «تأیید نشد». یک عدد ساختگی = رد کامل فاز، حتی اگر بقیهٔ کار درست باشد. |
| **H-04** | **تضعیف تست ممنوع.** `test.skip`/`it.skip`/`xit`، حذف تست، شل‌کردن تلورانس، `@ts-ignore`، `@ts-expect-error`، `// eslint-disable`، و **افزایش تعداد `any`** همه ممنوع‌اند. تعداد اخطار `no-explicit-any` باید در پایان فاز **بیشتر از** شروع فاز نباشد. |
| **H-05** | **بازسازی فرصت‌طلبانه ممنوع.** تغییر نام، تغییر فرمت، جابه‌جایی، «بهتر کردن» کد خارج از دامنه ممنوع. دیف باید کمینه و قابل‌ممیزی باشد. |
| **H-06** | **جبرگرایی (Determinism).** هیچ `Math.random`، `Date.now`، `new Date()` بدون ورودی ثابت، `localeCompare` بدون locale صریح، یا پیمایش شیء بدون مرتب‌سازی در کد اندازه‌گیری. دو اجرای پیاپی باید **بایت‌به‌بایت** یکسان باشند. |
| **H-07** | **حفظ دروازه‌های سبز.** در پایان فاز: `npm run lint` = ۰ خطا، `npm test` = بدون skip و بدون fail، `npm run build` = exit 0. خروجی خام هر سه را در گزارش بچسبان. |
| **H-08** | **قابلیت بازتولید.** هر عدد در گزارش باید با دستوری که خودت نوشته‌ای بازتولید شود. عدد بدون دستور = عدد بی‌اعتبار. |
| **H-09** | **حدس به‌جای اندازه‌گیری ممنوع.** «احتمالاً»، «باید درست باشد»، «انتظار می‌رود» به‌عنوان شاهد پذیرفته نمی‌شود. یا اندازه‌گیری کن، یا بنویس «اندازه‌گیری نشد». |
| **H-10** | **امکان‌ناپذیری را اعلام کن.** اگر شرطی از فاز با کد فعلی ممکن نیست یا خودمتناقض است، **متوقف شو و تشدید کن**؛ تقریب نزن و شرط را بازتفسیر نکن. |
| **H-11** | **کوری اندازه‌گیری.** در این فاز **نباید** فایل `docs/audit/AUDIT-FULL-2026-11-08.fa.md` (و هیچ گزارش ممیزی دیگر) را باز کنی. اگر تصادفاً دیدی، در گزارش اعلام کن. هدف: اندازه‌گیری مستقل، نه بازتولید نتیجهٔ من. |
| **H-12** | **صداقت در «چه نکردم».** گزارش پایان باید بخش «کارهایی که انجام ندادم» داشته باشد. گزارش بدون این بخش ناقص است و رد می‌شود. |

## ۰.۴ سازوکار دو دروازه‌ای

```
[شروع] → پیام آغاز (§۰.۵) → نیمهٔ اول کار → 📍 گزارش میانه → ⏸ توقف اجباری
      → (تأیید ناظر) → نیمهٔ دوم کار → 🏁 گزارش پایان → ⏸ توقف اجباری
      → (تأیید ناظر) → پایان فاز
```

- در هر ⏸ تو **کاملاً متوقف می‌شوی** و منتظر می‌مانی. هیچ کار اضافه‌ای نمی‌کنی، حتی «یک اصلاح کوچک».
- فقط دو عبارت مجوز عبور است: **`APPROVED`** یا **`تأیید`** (به‌تنهایی). `PASS-WITH-CONDITIONS` یعنی شرط‌ها را انجام بده و دوباره گزارش بده؛ مجوز عبور نیست.
- نیمهٔ دوم کار نباید قبل از تأیید میانه شروع شود.

## ۰.۵ قالب «پیام آغاز» (قبل از هر تغییری)

پیش از هر کاری، یک پیام کوتاه بفرست که شامل این چهار مورد باشد:

1. **فهم من از فاز** — در حداکثر ۱۵۰ کلمه، به زبان خودت.
2. **فهرست فایل‌هایی که خوانده‌ام** — با شمارهٔ خط بازه‌های کلیدی.
3. **شمارش اولیهٔ دروازه‌ها** — خروجی خام `npm run lint` و `npm test` و `npm run build` همین حالا (خط مبنا).
4. **ریسک‌هایی که از الان می‌بینم** — حداکثر ۵ مورد.

سپس بدون منتظر ماندن، نیمهٔ اول را شروع کن.

## ۰.۶ قالب «گزارش میانه»

گزارش باید **دقیقاً** این ساختار را داشته باشد:

```markdown
# گزارش میانه — فاز ۲
## ۱) وضعیت: چند درصد از کار انجام شده
## ۲) کارهای انجام‌شده (با file:line)
| # | کار | فایل | خط | وضعیت |
## ۳) اعداد تولیدشده تا این لحظه
| کمیت | مقدار قبل | مقدار بعد | دلتا | دستور بازتولید | وضعیت |
## ۴) انحراف از برنامه (اگر هست)
## ۵) سؤالات باز / تشدیدها
## ۶) ریسک‌های باقی‌مانده
## ۷) دقیقاً چه کاری را در نیمهٔ دوم انجام می‌دهم
## ۸) شواهد خام (خروجی دستورها)
```

نکته: بخش ۳ باید **اعداد واقعی** را داشته باشد، نه وعده. اگر تا میانه هیچ عددی تولید نشده، بنویس «هیچ عددی تولید نشد» — این خودش یک هشدار برای ناظر است.

## ۰.۷ قالب «گزارش پایان»

```markdown
# گزارش پایان — فاز ۲
## ۱) خلاصهٔ یک‌پاراگرافی (بدون صفت، فقط عدد)
## ۲) جدول انطباق با DoD
| # | شرط پذیرش | وضعیت (PASS/FAIL/PARTIAL) | شاهد (file:line یا خروجی) |
## ۳) جدول «قبل → بعد» (برای هر عدد، پیش‌فرض، امضا)
| مورد | قبل | بعد | دلتا | دلیل |
## ۴) خروجی خام دروازه‌ها
### lint / test / build / git diff --stat / git status --porcelain
## ۵) کارهایی که انجام ندادم (و چرا)
## ۶) مشاهدات خارج از دامنه (فقط ثبت، بدون اقدام)
## ۷) ریسک‌های باقی‌مانده و اثر عددی تخمینی
## ۸) دستور بازتولید کل فاز (کپی-پیست)
```

## ۰.۸ داوری، رد، و رفتار پس از رد

ناظر با این معیارها داوری می‌کند:

| معیار | تأثیر |
|---|---|
| شاهد مکانیکی برای هر شرط DoD | بدون شاهد = FAIL آن شرط |
| قابلیت بازتولید اعداد | عدد غیرقابل‌بازتولید = بی‌اعتبار |
| حداقل‌بودن دیف | دیف پهن‌تر از دامنه = رد |
| نبود جعل/تضعیف تست | یک مورد = رد کامل |
| صداقت در «چه نکردم» | سکوت دربارهٔ نقص = رد |

اگر رد شدی: هر ایراد را **جداگانه** پاسخ بده، در جدول `| ایراد | پاسخ | شاهد |`. **بحث نکن، توجیه نکن، بازتفسیر نکن.** یا اصلاح کن، یا بنویس «پذیرفته شد، اصلاح شد» / «پذیرفته نشد، دلیل: ...».

## ۰.۹ زبان و سبک گزارش

- فارسی، فنی، بدون تعارف و بدون صفت‌های تشویقی.
- هر ادعا با `file:line` یا خروجی دستور.
- اعداد با ۶ رقم معنادار و واحد صریح.
- جدول بر پاراگراف ترجیح دارد.
- ممنوع: «بهبود یافت»، «بهینه شد»، «مشکلی نیست»، «تست‌ها سبز است» بدون خروجی خام.

---

# بخش ۱ — مأموریت فاز ۲: عنوان و صورت مسئله

## ۱.۱ عنوان

**فاز ۲ — یکپارچه‌سازی قرارداد هندسهٔ خورشیدی، آزیموت و مقیاس زمان (Unified Solar Geometry, Azimuth & Time Contract)**

## ۱.۲ صورت مسئله

در شواهد خط مبنای فاز ۱ (`docs/audit/remediation/evidence/phase01/measurements.json`، کامیت `91b9b3b`) چهار ناسازگاری بنیادی در هندسهٔ خورشید، قرارداد زاویهٔ آزیموت و واحد زمان ثبت شده است:

1. **اختلاط دو قرارداد متضاد آزیموت بدون تایپ متمایز (`M-G2` و `roof3dShadingEngine.ts`):**
   - **قرارداد الف (شمال‌مرجع / ساعت‌گرد از شمال — North-Clockwise):** $0^\circ = \text{North},\ 90^\circ = \text{East},\ 180^\circ = \text{South},\ 270^\circ = \text{West}$. این قرارداد در `calculateSolarPosition` (`src/engine/solarPvEngine.ts:569`)، تابع صادرشدهٔ `computeSunVectorEnu` (`src/engine/roof3dShadingEngine.ts:569-581` با فرمول $\{x: +\sin\gamma\cos\alpha,\ y: +\cos\gamma\cos\alpha,\ z: +\sin\alpha\}$)، و پیش‌فرض `sunAzimuthDeg ?? 180` در `server.ts:226` به کار رفته است.
   - **قرارداد ب (جنوب‌مرجع — South-Zero):** $0^\circ = \text{South},\ -90^\circ = \text{East (صبح)},\ +90^\circ = \text{West (عصر)},\ \pm 180^\circ = \text{North}$. این قرارداد در `calculateSunPathPosition` (`src/engine/shadingSunPathEngine.ts:116-123`)، فیلد `PvTable3D.azimuthDeg` (`src/engine/roof3dShadingEngine.ts:110`)، پرتوهای درون‌خطی در `evaluateTablePointShading` / `simulateAnnual3dShading` / `generateDaylightSunDirections` (`src/engine/roof3dShadingEngine.ts:834-836, 1154-1158, 2344-2348` با فرمول $\{x: -\sin\gamma\cos\alpha,\ y: -\cos\gamma\cos\alpha,\ z: +\sin\alpha\}$)، و پیش‌فرض `azimuthDeg ?? 0` در `server.ts:224` به کار رفته است.
   - **اثر عددی ثبت‌شده در `M-G2`:** در `server.ts:218-260` (`POST /api/v1/solar/poa`)، مقدار پیش‌فرض `azimuthDeg = 0` (جنوب در قرارداد ب) و `sunAzimuthDeg = 180` (جنوب در قرارداد الف) بدون تبدیل به یک دستگاه واحد، مستقیماً به `calculatePoaIrradiance` (`src/engine/solarPvEngine.ts:582-600`) فرستاده می‌شوند. در نتیجه $\cos(\gamma_{\text{sun}} - \gamma_{\text{surface}}) = \cos(180^\circ - 0^\circ) = -1$ شده و پنلِ رو به جنوب در ظهر خورشیدی، کاملاً پشت به خورشید (رو به شمال) تلقی می‌شود و تابش POA از مقدار فیزیکی **`891.120826 W/m²`** به **`409.748443 W/m²`** سقوط می‌کند (**`481.372383 W/m²` کم‌برآورد / خطای `-54.02%`**).
   - **خطر آینه‌شدگی بردار پرتو در `roof3dShadingEngine.ts`:** تابع صادرشدهٔ `computeSunVectorEnu` (`:569`) قرارداد شمال‌مرجع دارد، اما سه حلقهٔ پرتوافکنی در همان فایل (`:834, :1154, :2344`) خروجی `calculateSunPathPosition` (جنوب‌مرجع) را با علامت منفی مصرف می‌کنند. هر فراخواننده‌ای که خروجی `calculateSunPathPosition` را به `computeSunVectorEnu` بدهد، پرتو خورشید را در هر دو محور افقی `X` (شرق/غرب) و `Y` (شمال/جنوب) آینه می‌کند.

2. **ابهام واحد زمان (ثانیه در برابر میلی‌ثانیه) در `calculateSolarPosition` و `/api/v1/solar/position` (`M-G1`):**
   - تابع `calculateSolarPosition` (`src/engine/solarPvEngine.ts:510-578`) و اندپوینت `server.ts:197-215` فرض می‌کنند `utcTs` بر حسب **ثانیه** است، اما هیچ تشخیص یا نرمال‌سازی برای ورودی **میلی‌ثانیه** (اعداد $> 10^{11}$ مانند `Date.now()`) ندارند. در `M-G1`، ارسال همان زمان به میلی‌ثانیه (`1773050400000`) در برابر ثانیه (`1773050400`) زاویهٔ سمت‌الرأس (`zenithDeg`) را از **`45.4177°`** به **`66.1350°`** ($\Delta = 20.7173^\circ$) و آزیموت را از **`268.8356°`** به **`65.7428°`** منحرف می‌کند. همچنین خروجی فاقد `elevationDeg` ($90^\circ - \text{zenithDeg}$) و `azimuthSouthDeg` است.

3. **پراکندگی فرمول ارتفاع خورشید در انقلاب زمستانی (`pvEngineAdvanced.ts:264` در برابر `geoCoordinates.ts:87` و `shadingSunPathEngine.ts:171`):**
   - در `src/engine/pvEngineAdvanced.ts:264-268` میل خورشیدی انقلاب زمستانی به‌صورت ثابت محلی `winterSolsticeDeclinationDeg = -23.45` هاردکد شده است، درحالی‌که تابع نیم‌کره‌آگاه در `src/engine/geoCoordinates.ts:80-120` وجود دارد.

4. **فقدان آزمون تقارن جهتی شرق/غرب در سایه‌اندازی سه‌بعدی:**
   - هیچ تستی در مخزن بررسی نمی‌کند که در صبح ($t < 12$، خورشید در شرق $+X$) مانع واقع در **شرق** میز، سایهٔ بیشتری نسبت به مانع متقارن در **غرب** میز ایجاد کند، و در بعدازظهر ($t > 12$، خورشید در غرب $-X$) دقیقاً برعکس آن رخ دهد.

---

# بخش ۲ — محدودهٔ فایل‌ها (ایجاد / ویرایش / ممنوع)

| دسته | مسیر فایل | مجوز و شرح دقیق |
|---|---|---|
| **ایجاد (مجاز)** | `src/engine/core/solarGeometryContract.ts` | ماژول واحد قرارداد هندسهٔ خورشیدی، تایپ‌های برندشدهٔ آزیموت، تبدیل‌های دوطرفه، نرمال‌سازی زمان UTC (ثانیه/میلی‌ثانیه)، ساخت بردار پرتو ENU، و ارتفاع ظهر انقلاب زمستانی |
| **ایجاد (مجاز)** | `scripts/remediation/verify-phase02.ts` | اسکریپت مستقل راستی‌آزمایی فاز ۲، اجرای آزمون‌های تقارن C2-01 تا C2-06 و تولید شواهد قبل/بعد |
| **ایجاد (مجاز)** | `docs/audit/remediation/evidence/phase02/phase02-measurements.json` | فایل شواهد عددی فاز ۲ منطبق بر طرح‌وارهٔ §۶ |
| **ویرایش کمینه (مجاز)** | `src/engine/solarPvEngine.ts` | فقط در `calculateSolarPosition` و `calculatePoaIrradiance` (و اینترفیس‌های مستقیم آن‌ها): نرمال‌سازی خودکار `utcTs` (ثانیه/میلی‌ثانیه)، افزودن فیلدهای سازگار به خروجی موقعیت خورشید (`elevationDeg`, `azimuthSouthDeg`)، و پشتیبانی از قرارداد صریح آزیموت در `calculatePoaIrradiance` |
| **ویرایش کمینه (مجاز)** | `src/engine/roof3dShadingEngine.ts` | فقط در `computeSunVectorEnu` (`:569`) و سه نقطهٔ ساخت بردار پرتو خورشید (`:830-837`, `:1150-1159`, `:2340-2349`): اتصال به توابع صریح `solarGeometryContract.ts` بدون تغییر منطق هندسی سالم میزها |
| **ویرایش کمینه (مجاز)** | `src/engine/shadingSunPathEngine.ts` | فقط اتصال قرارداد آزیموت جنوب‌مرجع (`SouthAzimuthDeg`) و ارتفاع انقلاب زمستانی به `solarGeometryContract.ts` |
| **ویرایش کمینه (مجاز)** | `src/engine/pvEngineAdvanced.ts` | فقط خطوط `260-272`: جایگزینی فرمول هاردکد ارتفاع ظهر انقلاب زمستانی با تابع واحد از `solarGeometryContract.ts` (با حفظ دقیق خروجی عددی) |
| **ویرایش کمینه (مجاز)** | `server.ts` | **فقط خطوط `197-262`** (`/api/v1/solar/position` و `/api/v1/solar/poa`): نرمال‌سازی `utcTs` (ثانیه/میلی‌ثانیه) و یکسان‌سازی دستگاه مرجع آزیموت سطح (`azimuthDeg` پیش‌فرض جنوب `0` یا `surfaceAzimuthNorthDeg`) با آزیموت خورشید (`sunAzimuthDeg` شمال‌مرجع `180`) پیش از فراخوانی `calculatePoaIrradiance` |
| **ممنوع (مطلق)** | `scripts/remediation/fixtures/g1..g4.json`<br>`scripts/remediation/measure.ts`<br>`scripts/remediation/import-map.ts`<br>`scripts/remediation/run-phase01.ts`<br>`docs/audit/remediation/evidence/phase01/**`<br>`docs/audit/remediation/phase01-*` | **خطوط مبنای فاز ۱ کاملاً منجمدند.** هش `harnessSha256` فاز ۱ و فایل‌های شواهد فاز ۱ نباید حتی یک بایت تغییر کنند. |
| **ممنوع (مطلق)** | کلیهٔ سایر فایل‌های `src/**` (از جمله `App.tsx`, `waterfallLossEngine.ts`, `financialEngine.ts`, `batteryEngine.ts`, `inverterClustering.ts`, `climaticData.ts`, `src/components/**`) و `package.json`, `tsconfig*.json`, `vite.config.*`, `.eslintrc*` | هرگونه دیف در این فایل‌ها = رد فوری فاز ۲ |

**دروازهٔ مکانیکی دامنه:**
در پایان فاز، خروجی دستور زیر باید **کاملاً خالی** باشد:
```bash
git diff --stat 91b9b3b -- scripts/remediation/fixtures/ scripts/remediation/measure.ts scripts/remediation/import-map.ts scripts/remediation/run-phase01.ts docs/audit/remediation/evidence/phase01/ docs/audit/remediation/phase01-formula-spec.fa.md docs/audit/remediation/phase01-baseline-manifest.json src/App.tsx src/components/ src/engine/waterfallLossEngine.ts src/engine/financialEngine.ts src/engine/batteryEngine.ts src/engine/inverterClustering.ts src/engine/climaticData.ts package.json tsconfig.json
```

---

# بخش ۳ — ورودی‌های یخ‌زده و اعداد خط مبنای فاز ۱

تمام اعداد «قبل» از فایل منجمد `docs/audit/remediation/evidence/phase01/measurements.json` (کامیت `91b9b3b`) خوانده می‌شوند:

| شناسه مرجع فاز ۱ | کمیت | مقدار خط مبنا (قبل از فاز ۲) | واحد | مرجع |
|---|---|---:|---|---|
| **M-G1 (sec)** | `POST /api/v1/solar/position` با `utcTs = 1773050400` (ثانیه) | `zenithDeg = 45.4177`, `azimuthDeg = 268.8356` | درجه | `server.ts:197`, `solarPvEngine.ts:510` |
| **M-G1 (ms)** | `POST /api/v1/solar/position` با `utcTs = 1773050400000` (میلی‌ثانیه) | `zenithDeg = 66.1350`, `azimuthDeg = 65.7428` ($\Delta\text{zenith} = 20.7173^\circ$) | درجه | `server.ts:197`, `solarPvEngine.ts:510` |
| **M-G2 (default)** | `POST /api/v1/solar/poa` با `GHI=800, DNI=700, DHI=150, tiltDeg=31, sunZenithDeg=35` و پیش‌فرض‌های مستند (`azimuthDeg=0` جنوب، `sunAzimuthDeg=180` جنوب) | `409.748443` | $\text{W/m}^2$ | `server.ts:224-226`, `solarPvEngine.ts:582` |
| **M-G2 (physical)** | مقدار فیزیکی هم‌راستا برای همان ورودی `M-G2` (هر دو رو به جنوب) | `891.120826` | $\text{W/m}^2$ | `measurements.json` (`M-G2.details.physicalCoAlignedWm2`) |
| **M-A1** | تولید سالانه مسیر اصلی G-1 (لنگر عدم رگرسیون) | `1851400` | $\text{kWh}$ | `measurements.json` (`M-A1.value`) |
| **M-A2** | تولید سالانه `designPvArray` در G-1 (لنگر عدم رگرسیون) | `1646827.145773` | $\text{kWh}$ | `measurements.json` (`M-A2.value`) |
| **M-C1** | افت حرارتی در ۳۹ درجه G-1 (لنگر عدم رگرسیون) | `13.1225` | درصد | `measurements.json` (`M-C1.value`) |
| **M-F1 / M-F4** | CAPEX و NPV کیس G-1 (لنگر عدم رگرسیون) | `499784` / `310202` | $\text{USD}$ | `measurements.json` (`M-F1`, `M-F4`) |

---

# بخش ۴ — مشخصات فنی قرارداد و کمیت‌های قبل/بعد فاز ۲

## ۴.۱ طراحی الزامی `src/engine/core/solarGeometryContract.ts`

این ماژول باید بدون وابستگی چرخه‌ای (Leaf Module در `src/engine/core/`) موارد زیر را صادر کند:

1. **تایپ‌های برندشدهٔ آزیموت و زمان:**
   - `NorthAzimuthDeg`: زاویهٔ ساعت‌گرد از شمال جغرافیایی در بازهٔ $[0, 360)$ که در آن $0^\circ = \text{N},\ 90^\circ = \text{E},\ 180^\circ = \text{S},\ 270^\circ = \text{W}$.
   - `SouthAzimuthDeg`: زاویه نسبت به جنوب در بازهٔ $[-180, +180]$ که در آن $0^\circ = \text{S},\ -90^\circ = \text{E},\ +90^\circ = \text{W},\ \pm 180^\circ = \text{N}$.
   - `UtcTimestampSeconds`: زمان یونیکس نرمال‌شده بر حسب **ثانیه**.

2. **توابع تبدیل و نرمال‌سازی (Pure & Deterministic):**
   - `asNorthAzimuthDeg(deg: number): NorthAzimuthDeg` — نرمال‌سازی به $[0, 360)$؛ پرتاب `RangeError` روی `NaN`/`Infinity`.
   - `asSouthAzimuthDeg(deg: number): SouthAzimuthDeg` — نرمال‌سازی به $(-180, +180]$ (با نگاشت $-180 \mapsto +180$ یا حفظ متقارن)؛ پرتاب `RangeError` روی `NaN`/`Infinity`.
   - `southToNorthAzimuth(southDeg: number): NorthAzimuthDeg` — طبق رابطهٔ دقیق $\gamma_{\text{north}} = (\gamma_{\text{south}} + 180^\circ) \bmod 360^\circ$:
     - $0^\circ (\text{S}) \mapsto 180^\circ$
     - $-90^\circ (\text{E}) \mapsto 90^\circ$
     - $+90^\circ (\text{W}) \mapsto 270^\circ$
   - `northToSouthAzimuth(northDeg: number): SouthAzimuthDeg` — معکوس دقیق تابع بالا:
     - $180^\circ (\text{S}) \mapsto 0^\circ$
     - $90^\circ (\text{E}) \mapsto -90^\circ$
     - $270^\circ (\text{W}) \mapsto +90^\circ$
   - `normalizeUtcTimestampSeconds(utcTs: number): UtcTimestampSeconds` — اگر ورودی متناهی و $> 0$ نبود، `RangeError` پرتاب کند؛ اگر $|utcTs| \ge 10^{11}$ بود (میلی‌ثانیه)، آن را تقسیم بر `1000` کند تا همواره ثانیهٔ یونیکس برگردد.

3. **ساخت بردار واحد پرتو خورشید در دستگاه ENU ($+X = \text{East},\ +Y = \text{North},\ +Z = \text{Up}$):**
   - `sunVectorEnuFromNorthAzimuth(northAzDeg: number, elevationDeg: number): { x: number; y: number; z: number }`:
     $$x = \sin(\gamma_{\text{N}})\cos(\alpha),\quad y = \cos(\gamma_{\text{N}})\cos(\alpha),\quad z = \sin(\alpha)$$
   - `sunVectorEnuFromSouthAzimuth(southAzDeg: number, elevationDeg: number): { x: number; y: number; z: number }`:
     $$x = -\sin(\gamma_{\text{S}})\cos(\alpha),\quad y = -\cos(\gamma_{\text{S}})\cos(\alpha),\quad z = \sin(\alpha)$$
   - **قضیهٔ هم‌ارزی اجباری:** برای هر زاویهٔ دلخواه $\gamma_{\text{S}} \in [-180, 180]$ و ارتفاع $\alpha \in [0, 90]$، خروجی `sunVectorEnuFromSouthAzimuth(γ_S, α)` و `sunVectorEnuFromNorthAzimuth(southToNorthAzimuth(γ_S), α)` باید تا دقت $< 10^{-12}$ در هر سه مؤلفهٔ $x, y, z$ یکسان باشند.

4. **ارتفاع ظهر انقلاب زمستانی نیم‌کره‌آگاه:**
   - `calculateWinterSolsticeNoonAltitudeDeg(latitudeDeg: number, minFloorDeg?: number): { rawAltitudeDeg: number; clampedAltitudeDeg: number; declinationDeg: number }`
   - در نیم‌کرهٔ شمالی ($\phi \ge 0$) میل $\delta = -23.45^\circ$ و در نیم‌کرهٔ جنوبی ($\phi < 0$) میل $\delta = +23.45^\circ$؛ ارتفاع خام $\alpha_{\text{raw}} = 90^\circ - |\phi - \delta| = 90^\circ - |\phi| - 23.45^\circ$.

## ۴.۲ اصلاحات الزامی در مصرف‌کننده‌ها

1. **`src/engine/solarPvEngine.ts` و `server.ts:197-262`:**
   - در `calculateSolarPosition(latitudeDeg, longitudeDeg, utcTs)`: ابتدا `utcTs` را با `normalizeUtcTimestampSeconds(utcTs)` نرمال کن. خروجی تابع علاوه بر `{ zenithDeg, azimuthDeg }` (که `azimuthDeg` همان شمال‌مرجع $[0,360)$ است)، فیلدهای `elevationDeg: Number((90 - zenithDeg).toFixed(6))` و `azimuthSouthDeg: Number(northToSouthAzimuth(azimuthDeg).toFixed(6))` را هم برگرداند.
   - در `calculatePoaIrradiance(req)`: اگر `req` شامل فیلد اختیاری `surfaceAzimuthConvention?: 'north_clockwise' | 'south_zero'` بود، در حالت `'south_zero'` زاویهٔ `azimuthDeg` را با `southToNorthAzimuth(azimuthDeg)` به شمال‌مرجع تبدیل کن تا با `sunAzimuthDeg` (شمال‌مرجع) هم‌پایه شود.
   - در `server.ts:218-260` (`POST /api/v1/solar/poa`): قرارداد پیش‌فرض پروژه برای زاویهٔ سطح (`azimuthDeg` / `surfaceAzimuthDeg`، پیش‌فرض `0` = رو به جنوب) جنوب‌مرجع است، مگر اینکه کلاینت صریحاً `surfaceAzimuthNorthDeg` بفرستد یا `surfaceAzimuthConvention === 'north_clockwise'` تعیین کند، یا مقدار `azimuthDeg` را برابر `180` در کنار `sunAzimuthDeg = 180` داده باشد. به طور مشخص:
     - اگر `body.surfaceAzimuthNorthDeg !== undefined` یا `body.surfaceAzimuthConvention === 'north_clockwise'` بود: از همان زاویهٔ شمال‌مرجع استفاده شود.
     - اگر `body.surfaceAzimuthSouthDeg !== undefined` یا `body.surfaceAzimuthConvention === 'south_zero'` بود: با `southToNorthAzimuth` به شمال‌مرجع تبدیل شود.
     - در حالت پیش‌فرض (وقتی `azimuthDeg` ارسال نشده و پیش‌فرض `0` است، یا وقتی `azimuthDeg === 0` به معنای جنوبِ قرارداد پروژه در کنار `sunAzimuthDeg` شمال‌مرجع ارسال شده): با `southToNorthAzimuth(0) = 180` هم‌راستا شود تا ورودی مستند API (`GHI=800, DNI=700, DHI=150, tiltDeg=31, sunZenithDeg=35` با پیش‌فرض‌های `azimuthDeg=0, sunAzimuthDeg=180`) دقیقاً مقدار فیزیکی **`891.120826 W/m²`** را برگرداند، و در عین حال اگر کلاینتی هر دو را شمال‌مرجع (`azimuthDeg=180, sunAzimuthDeg=180`) فرستاد نیز همان **`891.120826 W/m²`** را بگیرد!

2. **`src/engine/roof3dShadingEngine.ts`:**
   - در `computeSunVectorEnu` (`:569`): از `sunVectorEnuFromNorthAzimuth` استفاده کن و یک پارامتر اختیاری `convention: 'north_clockwise' | 'south_zero' = 'north_clockwise'` بپذیر تا اگر فراخواننده‌ای قرارداد `'south_zero'` داد، از `sunVectorEnuFromSouthAzimuth` استفاده شود.
   - در خطوط `:830-837`، `:1150-1159` و `:2340-2349`: ساخت دستی `{ x: -Math.sin(azRad)..., y: -Math.cos(azRad)..., z: ... }` را با فراخوانی مستقیم `sunVectorEnuFromSouthAzimuth(sun.azimuthDeg, sun.altitudeDeg)` جایگزین کن.

## ۴.۳ جدول کمیت‌های قبل/بعد که باید اندازه‌گیری شوند (`P2-01` تا `P2-08`)

| ID | کمیت | مقدار قبل (خط مبنای فاز ۱) | شرط پذیرش مقدار بعد | واحد |
|---|---|---:|---|---|
| **P2-01** | `M-G1` اختلاف `zenithDeg` بین ورودی ثانیه (`1773050400`) و میلی‌ثانیه (`1773050400000`) | `20.7173` | `0.000000` (هر دو دقیقاً `45.4177°`) | درجه |
| **P2-02** | `M-G1` اختلاف `azimuthDeg` بین ورودی ثانیه و میلی‌ثانیه | `203.0928` | `0.000000` (هر دو دقیقاً `268.8356°`) | درجه |
| **P2-03** | `M-G2` خروجی `POST /api/v1/solar/poa` در شرایط مرجع G-1 با پیش‌فرض‌های اندپوینت (`azimuthDeg=0, sunAzimuthDeg=180`) | `409.748443` | `891.120826` ($\Delta = +481.372383\ \text{W/m}^2$، خطای صفر نسبت به مقدار فیزیکی) | $\text{W/m}^2$ |
| **P2-04** | `M-G2` خروجی `POST /api/v1/solar/poa` وقتی هر دو شمال‌مرجع داده شوند (`azimuthDeg=180, sunAzimuthDeg=180`) | `891.120826` | `891.120826` (حفظ سازگاری عقب‌رو با تلورانس $\le 10^{-6}$) | $\text{W/m}^2$ |
| **P2-05** | بیشینه خطای اقلیدسی $\|\vec{v}_{\text{N}}(\text{southToNorth}(\gamma_{\text{S}}), \alpha) - \vec{v}_{\text{S}}(\gamma_{\text{S}}, \alpha)\|_2$ روی شبکهٔ ۲۵×۱۰ زاویه | تعریف‌نشده (واگرا تا `2.0`) | $\le 10^{-12}$ | بی‌بعد |
| **P2-06** | سایه‌اندازی صبحگاهی ($t = 8:00$ تا $10:00$، خورشید در شرق $+X$): افت پرتو مانع شرقی ($x = +4\text{ m}$) در برابر مانع غربی متقارن ($x = -4\text{ m}$) | ثبت‌نشده | $\text{Loss}_{\text{EastObstacle, morning}} > \text{Loss}_{\text{WestObstacle, morning}}$ و $\text{Loss}_{\text{WestObstacle, morning}} = 0\%$ | درصد |
| **P2-07** | سایه‌اندازی عصرگاهی ($t = 14:00$ تا $16:00$، خورشید در غرب $-X$): افت پرتو مانع غربی ($x = -4\text{ m}$) در برابر مانع شرقی متقارن ($x = +4\text{ m}$) | ثبت‌نشده | $\text{Loss}_{\text{WestObstacle, afternoon}} > \text{Loss}_{\text{EastObstacle, afternoon}}$ و $\text{Loss}_{\text{EastObstacle, afternoon}} = 0\%$ | درصد |
| **P2-08** | لنگر عدم رگرسیون: `M-A1`, `M-A2`, `M-C1`, `M-F1`, `M-F4` در `measure.ts` فاز ۱ | مقادیر جدول §۳ | تغییر دقیقاً `0.000000` در تمام لنگرهای غیرمرتبط با API سرور | واحدهای مربوطه |

---

# بخش ۵ — بررسی‌های انسجام و تقارن فاز ۲ (`C2-01` تا `C2-06`)

در `scripts/remediation/verify-phase02.ts` این ۶ بررسی مکانیکی را پیاده کن و در `phase02-measurements.json` ثبت نما:

| ID | بررسی | `lhs` | `rhs` | تعریف گذر (`pass`) |
|---|---|---|---|---|
| **C2-01** | بازگشت دوطرفهٔ تبدیل آزیموت (`northToSouth(southToNorth(γ)) === γ`) روی ۳۶۱ زاویه ($-180^\circ$ تا $+180^\circ$) | بیشینهٔ خطای مطلق درجه | `0` | `delta <= 1e-12` |
| **C2-02** | هم‌ارزی بردار پرتو ENU بین قرارداد شمال‌مرجع و جنوب‌مرجع روی ۲۵۰ نقطهٔ $(\gamma, \alpha)$ | بیشینهٔ نرم اقلیدسی اختلاف دو بردار | `0` | `delta <= 1e-12` |
| **C2-03** | **آزمون تقارن صبح/عصر مانع شرقی و غربی:** برای یک میز افقی/جنوبی در عرض $35.6892^\circ\text{N}$ در روز اعتدال (`dayOfYear = 80`)، افت سایهٔ مانع شرقی در ساعت `09:00` در برابر افت سایهٔ مانع غربی متقارن در ساعت `15:00` | $\text{Loss}_{\text{East}}(09:00)$ | $\text{Loss}_{\text{West}}(15:00)$ | `lhs > 10` و `Math.abs(lhs - rhs) <= 1e-6` |
| **C2-04** | **آزمون عدم سایهٔ معکوس (Zero Reverse-Shadow):** در همان صحنهٔ `C2-03`، افت سایهٔ مانع غربی در ساعت `09:00` و مانع شرقی در ساعت `15:00` باید دقیقاً صفر باشد | $\text{Loss}_{\text{West}}(09:00) + \text{Loss}_{\text{East}}(15:00)$ | `0` | `lhs === 0` |
| **C2-05** | **ناوردا بودن مقیاس زمان در `/api/v1/solar/position`:** اختلاف `zenithDeg` بین درخواست با ثانیه (`1773050400`) و میلی‌ثانیه (`1773050400000`) | `zenithDeg(sec)` | `zenithDeg(ms)` | `Math.abs(lhs - rhs) <= 1e-9` |
| **C2-06** | **هم‌راستایی `/api/v1/solar/poa` با مقدار فیزیکی:** خروجی اندپوینت با ورودی‌های پیش‌فرض G-1 (`azimuthDeg=0, sunAzimuthDeg=180`) در برابر مقدار فیزیکی هم‌راستا (`891.120826 W/m²`) | خروجی اندپوینت ($\text{W/m}^2$) | `891.120826` | `Math.abs(lhs - rhs) <= 1e-5` |

---

# بخش ۶ — خروجی‌های اجباری و طرح‌وارهٔ JSON

| # | خروجی | مسیر |
|---|---|---|
| **D2-1** | ماژول قرارداد هندسهٔ خورشیدی، آزیموت و زمان | `src/engine/core/solarGeometryContract.ts` |
| **D2-2** | اسکریپت راستی‌آزمایی و آزمون تقارن فاز ۲ | `scripts/remediation/verify-phase02.ts` |
| **D2-3** | فایل شواهد عددی فاز ۲ | `docs/audit/remediation/evidence/phase02/phase02-measurements.json` |
| **D2-4** | گزارش میانه فاز ۲ | در چت |
| **D2-5** | گزارش پایان فاز ۲ | در چت |

### طرح‌وارهٔ اجباری `docs/audit/remediation/evidence/phase02/phase02-measurements.json`

```json
{
  "schema": "solarpv.audit.phase02.v1",
  "generatedAtCommit": "<git rev-parse HEAD>",
  "phase01BaselineCommit": "91b9b3b",
  "phase01HarnessSha256": "732b1074b7436150b58e8054aac5cce2ddd28429f44515b0a1911e8aa58d0ab9",
  "phase02VerifierSha256": "<sha256 of scripts/remediation/verify-phase02.ts>",
  "quantities": [
    {
      "id": "P2-01",
      "name": "...",
      "before": 20.7173,
      "after": 0,
      "delta": -20.7173,
      "unit": "degrees",
      "producer": "src/engine/solarPvEngine.ts:510",
      "reproduce": "npx tsx scripts/remediation/verify-phase02.ts --id P2-01",
      "verified": true
    }
  ],
  "checks": [
    {
      "id": "C2-01",
      "lhs": 0,
      "rhs": 0,
      "delta": 0,
      "pass": true
    }
  ],
  "nonRegression": {
    "M-A1": { "before": 1851400, "after": 1851400, "delta": 0 },
    "M-A2": { "before": 1646827.145773, "after": 1646827.145773, "delta": 0 },
    "M-C1": { "before": 13.1225, "after": 13.1225, "delta": 0 },
    "M-F1": { "before": 499784, "after": 499784, "delta": 0 },
    "M-F4": { "before": 310202, "after": 310202, "delta": 0 }
  },
  "gates": {
    "lintErrors": 0,
    "anyWarnings": 93,
    "testPass": 196,
    "testFail": 0,
    "testSkip": 0,
    "buildExit": 0
  }
}
```

---

# بخش ۷ — تعریف «انجام‌شده» (DoD) — داوری مکانیکی

| # | شرط | شاهد لازم در گزارش |
|---|---|---|
| **DoD2-01** | فایل‌های `D2-1`، `D2-2` و `D2-3` موجود و معتبرند | `git status` + چک‌سام SHA-256 |
| **DoD2-02** | فایل‌های منجمد فاز ۱ (`scripts/remediation/fixtures/**`, `measure.ts`, `import-map.ts`, `run-phase01.ts`, `evidence/phase01/**`, `phase01-*`) **صفر بایت تغییر** دارند | خروجی خام `git diff --stat 91b9b3b -- <مسیرهای منجمد>` |
| **DoD2-03** | هیچ فایلی خارج از فهرست مجاز §۲ تغییر نکرده است | خروجی خام `git diff --stat 91b9b3b` |
| **DoD2-04** | هر ۸ کمیت `P2-01` تا `P2-08` با مقادیر عددی `before`, `after`, `delta` ثبت و تأیید شده‌اند | `phase02-measurements.json` + جدول گزارش |
| **DoD2-05** | هر ۶ بررسی `C2-01` تا `C2-06` وضعیت `pass: true` دارند | خروجی خام `npx tsx scripts/remediation/verify-phase02.ts` |
| **DoD2-06** | اجرای مجدد دستورهای فاز ۱: `npx tsx scripts/remediation/measure.ts --id M-G1` و `--id M-G2` روی کد اصلاح‌شده، رفع باگ ثانیه/میلی‌ثانیه و رفع خطای `409.75 -> 891.12 W/m²` را نشان می‌دهد | خروجی خام دستورهای `measure.ts` |
| **DoD2-07** | دو بار اجرای پیاپی `npx tsx scripts/remediation/verify-phase02.ts` خروجی `phase02-measurements.json` **بایت‌به‌بایت یکسان** (`sha256sum` واحد) تولید می‌کند | خروجی خام `sha256sum` دو اجرا |
| **DoD2-08** | `npm run lint` = ۰ خطا و `anyWarnings <= 93` | خروجی خام |
| **DoD2-09** | `npm test` = ۰ FAIL و ۰ SKIP | خروجی خام |
| **DoD2-10** | `npm run build` = exit 0 | خروجی خام |
| **DoD2-11** | بخش «کارهایی که انجام ندادم» با حداقل ۳ مورد واقعی در گزارش پایان موجود است | بخش ۵ گزارش پایان |
| **DoD2-12** | تمام تغییرات روی شاخهٔ کاری کامیت و `git push` شده و هش کامیت در گزارش درج شده است | `git log -1` |

---

# بخش ۸ — مرزهای ممنوعهٔ این فاز (تکرار عامدانه)

در این فاز **انجام نمی‌دهی**:
- هیچ تغییری در فایل‌های منجمد فاز ۱ (`measure.ts`, `run-phase01.ts`, `import-map.ts`, `fixtures/*.json`, `evidence/phase01/measurements.json`, `phase01-formula-spec.fa.md`, `phase01-baseline-manifest.json`).
- هیچ تغییری در موتور آبشار (`waterfallLossEngine.ts`)، مدل حرارتی (`thermalDerate.ts`)، موتور مالی (`financialEngine.ts`)، موتور باتری (`batteryEngine.ts`)، کلاسترینگ اینورتر (`inverterClustering.ts`)، یا `src/App.tsx`.
- هیچ تغییری در منطق سایزینگ استرینگ یا ظرفیت آرایه در `pvEngineAdvanced.ts` (فقط خط `264-268` برای فراخوانی تابع واحد ارتفاع ظهر انقلاب زمستانی با حفظ خروجی عددی).
- هیچ افزودن وابستگی، تغییر تنظیمات لینت/تایپ‌اسکریپت، یا تضعیف تست‌های موجود.

پس از ارسال «گزارش میانه — فاز ۲»، در دروازهٔ میانه **کاملاً متوقف شو** و منتظر مجوز `APPROVED` / `تأیید` ناظر بمان.
