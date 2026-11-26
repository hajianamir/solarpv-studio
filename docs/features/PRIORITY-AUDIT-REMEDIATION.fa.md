# اصلاحات اولویت‌دار ممیزی — دامنه و توقف ایمن

## معیار پذیرش و قرارداد
- B-01: زمان خورشیدی در [۰،۱۴۴۰)؛ ۸۸۷ نمونه مستقل pvlib/NREL-SPA، ۱۰ سایت و چهار فصل، از جمله دو سوی خط تاریخ. تحمل zenith=۰٫۰۵ و azimuth=۰٫۱۵ درجه. این دامنه شامل نزدیکی تکینگی سمت در zenith<5 یا افق نیست.
- S-01: رشته ناممکن `status=infeasible` دارد؛ سقف صفر به یک تبدیل نمی‌شود؛ API رشته برای infeasible پاسخ ۴۲۲ می‌دهد. مصرف‌کننده باید status را بررسی کند. بازه بدون اشتراک نیز infeasible است. ضریب اندازه‌گیری‌شده `betaVmpPerC` ترجیح دارد؛ در نبود آن تقریب Pmp/Voc با هشدار بازمی‌گردد. ادعای محافظه‌کارانه‌بودن عمومی این تقریب حذف شد.
- B-03: longitude در هسته و API اجباری؛ seed تازه از انتخاب خودکار متناسب اینورتر و باتری استفاده می‌کند. پروژه ذخیره‌شده موجود خودکار عوض نمی‌شود.
- F-01/B-02: endpoint همگام Quick-size فقط غربالگری است؛ بدون `allowAnalyticalEstimate: true` پاسخ ۴۲۲ و `SCREENING_CONSENT_REQUIRED` می‌دهد. رشتهٔ "true" پذیرفته نیست. provenance، confidence و هشدار رابطه معکوس سایزینگ در assessment بازمی‌گردند و در پروژه جدید نگه‌داری می‌شوند. تابع داخلی همیشه غربالگری است؛ داده NASA/PVGIS خودکار یا خروجی پژوهشی وارد آن نمی‌شود.
- F-05: محاسبه مالی Quick-size مستقیماً `performFinancialAnalysis` با ظرفیت واقعی انتخاب‌ها و preset پیش‌فرض ongrid را فراخوانی می‌کند؛ منبع مستقل قیمت/نرخ تنزیل حذف شده است. عدد خروجی با همان ورودی‌های موتور مشترک دقیقاً برابر است. این همسان‌سازی به معنی تأیید اقتصادی preset ایران یا برابری پروژه‌هایی با mode و فرض متفاوت نیست.
- F-03/F-04: ادعای PVsyst-grade و شبیه‌سازی ساعتی از عنوان waterfall حذف؛ عنوان و توضیح رابط محدودیت scalar/empirical را اعلام می‌کنند. فرمول تجربی حذف نشده و جایگزین معتبر ندارد.

## موارد باز و توقف
| مورد | وضعیت |
|---|---|
| خطای azimuth، clamp رشته، longitude، seed | اصلاح‌شده با آزمون |
| اقلیم تحلیلی و yield معکوس در Quick-size | مهار ادعا و پذیرش صریح؛ جایگزین ساعتی هنوز باز |
| دو منبع قیمت Quick-size | حذف؛ اعتبار macro و offgrid dispatch باز |
| transposition سینوسی، anchor ترکر، lossهای ثابت | فقط محدودیت آشکار؛ جایگزینی علمی باز |
| trend غلط proxy دوطرفه | باز؛ تغییر پیش‌فرض به heuristic دیگر بدون اعتبارسنجی مستقل مجاز نیست |
| ژئوتکنیک/خطرات latitude-based و ASCE | باز؛ نیاز به داده سایت، مرجع رسمی و fixture مستقل؛ هیچ sign-off جدیدی تأیید نشده |
| درصدهای NASA/PVGIS گزارش ارسالی | بازتولید نشده؛ بدون پاسخ خام و دوره زمانی تأیید نیست |
| mutation coverage کل موتور، کاتالوگ، بسته‌بندی/بازنویسی server | باز؛ این تغییر ادعای حل همه گزارش را ندارد |

## سه بازبینی و بررسی عمیق پس از هرکدام
۱. بازبینی هندسه: شاخه صبح/عصر در عبور روز UTC بررسی شد. بررسی مستقل پس از آن: fixture تولیدشده با pvlib 0.13.1 SPA؛ zenith هندسی، altitude=0، بدون تصحیح شکست. این نسخه متفاوت از نسخه ادعایی گزارش است و مستقل ثبت شده است.
۲. بازبینی ایمنی رشته: بازه بدون اشتراک، سقف صفر، ورودی ولتاژ نامعتبر و ضریب Vmp بررسی شد. بررسی قرارداد پس از آن: min ناشی از MPPT و max ناشی از Voc و MPPT جدا می‌مانند؛ warning جای status را نمی‌گیرد. انطباق NEC/IEC تأیید نشده است.
۳. بازبینی مرز مالی/اقلیم: قیمت‌گذاری، ذخیره provenance و ترتیب احراز هویت endpoint بررسی شد. بررسی پس از آن: parity موتور مالی، HTTP واقعی برای consent/longitude، و آزمون JWT production؛ هیچ سری پژوهشی به انرژی یا مالی adopt نشده است.
این سه بررسی کد/عددی‌اند، نه سه تأییدیه مستقل حرفه‌ای یا پژوهش وب تازه. دسترسی مستقیم NASA/PVGIS/متن ASCE در این محیط فراهم نیست.

## استفاده و مهاجرت
```json
{"projectName":"Screening only","latitude":35.69,"longitude":51.39,"dailyKwh":20,"autonomyDays":1.5,"allowAnalyticalEstimate":true,"persist":false}
```
همچنان احراز هویت متناسب محیط لازم است. مقدار yield و LCOE این پاسخ برای تصمیم اجرایی/سرمایه‌گذاری کافی نیست. برای حالت رشته، ابتدا status و سپس حدود را بررسی کنید؛ `minModules > maxModules` یک خطا در طراحی است، نه پیشنهاد رشته.

## آزمون‌ها
- `npx tsx scripts/test-priority-audit-mutations.ts`: کپی موقت منبع، baseline سالم و چهار جهش هدفمند (wrap، clamp، LCOE مستقل، equation-of-time)؛ ۴/۴ کشته شدند. این درصد برای کل موتور نیست.
- `npm test`: fixture مستقل و regressionهای هسته
- `npx tsx scripts/test-priority-audit-http.ts`: قرارداد HTTP
- `npx tsx scripts/verify-production-auth-http.ts`: auth regression
- `npx tsx scripts/verify-api-sizing-thermal-audit.ts`: ۳۴ regression موجود
- `npm run lint`، `npm run build`، `npm run test:ui`، `npm run test:browser` و `npm run verify:exports`
- بازتولید fixture: نصب pvlib==0.13.1 در محیط جدا و اجرای `python scripts/fixtures/generate-priority-solar.py`. این کار شبکه نمی‌خواهد.

## Rollback / flag
برای consent و خطای ایمنی bypass مخفی یا flag ناامن وجود ندارد. feature flag فعلی API همان `allowAnalyticalEstimate` است و فقط غربالگری را مجاز می‌کند. پیش از rollback فایل‌های این تغییر، API quick-size را غیرفعال کنید؛ رفتار unsafe clamp یا ادعای design-grade نباید دوباره فعال شود. تغییرات قدیمی UI/AC/research این شاخه را بازنگردانید. رسیدهای قبلی مربوط به snapshot قبلی‌اند؛ hashes آن‌ها ادعای snapshot فعلی نیستند.

## ادامهٔ تکمیل: شواهد ثبت‌شده و مرز سازه

- سه fixture مستقل SPA و هفت fixture قیود رشته در `scripts/physics-reference-evidence.json` ثبت شدند. هر ده مورد با `executeReferenceFixture` اجرا و حساسیت روی AST همان عبارت آزموده می‌شوند؛ `npm test` اکنون این اجرا را نیز انجام می‌دهد.
- مولد رشته از Decimal و شمارش عدد صحیح استفاده می‌کند، نه اجرای TypeScript برای ساخت expected. مبنای آن جمع ولتاژ منابع سری (OpenStax، University Physics 2، بخش 10.3) و محدودیت‌های صریح آزمایش است. ضرایب دمایی فرض ورودی‌اند و اعتبارسنجی ضرایب سازنده یا IEC/NEC ادعا نمی‌شود.
- گیت برای تشخیص حساسیت guard اصلاح شد: خطای runtime فقط در **فراخوانی جهش‌یافته‌ای که عبارت هدف را اجرا کرده** شاهد حساسیت است. خطای baseline، import و export همچنان شکست است. آزمون مثبت guard و آزمون منفی baseline به تست خود گیت اضافه شدند. هیچ expression از رجیستری معاف نشده است.
- خروجی سازه اکنون همیشه `certificationStatus: 'not_certified'` دارد. گذشتن FoS تشخیصی گواهی سازه نیست. گزارش سازه (از جمله unavailable و stale) عبارت NOT CERTIFIED دارد. متن ادعای انطباق ASCE از engineering remarks حذف و qz دارای Kd به‌عنوان legacy و ویرایش‌تأییدنشده معرفی شد. هشت مسیر فونداسیون با آزمون قرارداد پوشش دارند. این اصلاح فرمول ASCE 7-22 نیست.
- گردش‌کار کامل `test:study:workflow` با Python نصب‌شدهٔ pin‌شده اجرا شد و پاس شد: از جمله مدل‌های ساعتی حرارتی/اپتیکی/الکتریکی، مقایسه، receipt و حدود adoption. این نتیجه اثبات جایگزینی مدل پیش‌فرض، دقت اقلیمی سایت یا اعتبارسنجی میدانی نیست؛ انرژی/مالی خودکار adopt نشده است.

### بازتولید شواهد جدید
```sh
# Python محیط جدا با pvlib==0.13.1
python scripts/fixtures/generate-priority-solar.py
python scripts/fixtures/generate-priority-strings.py
npx tsx scripts/test-priority-reference-registry.ts
npx tsx scripts/test-priority-structural-claims.ts
npx tsx scripts/test-physics-reference-gate.ts
```
مولدها ordering و serialization رجیستریِ ledger مالی موجود را هم حفظ می‌کنند؛ اجرای دوباره نباید hash رجیستری را عوض کند.

### بازبینی‌های این ادامه
۱. بررسی SPA و اتصال مستقیم به رجیستری؛ پس از آن اجرای سه شاهد independent SPA و mutation دقیق AST.
۲. بررسی امکان‌پذیری رشته؛ پس از آن oracle مستقل Decimal با جمع منابع سری و شمارش، و اجرای هفت شاهد حساسیت. مرجع زمینه‌ای: https://openstax.org/books/university-physics-volume-2/pages/10-3-kirchhoffs-rules . این مرجع جایگزین متن استاندارد PV نیست.
۳. بررسی صداقت خروجی سازه؛ پس از آن آزمون هشت فونداسیون، گزارش و بازاجرای مسیرهای Python. کد عددی legacy سازه عمداً بدون منبع و مثال مستقل استاندارد تغییر داده نشده است.

### وضعیت نهایی این مرحله
گیت سراسری هنوز برای **شش عبارت Quick-size و دو guard مربوط به migration قبلی** شاهد ثبت‌شده می‌خواهد. fixtureهای خورشید و رشته رفع شده‌اند؛ هیچ ادعایی مبنی بر سبزشدن کل گیت وجود ندارد. جایگزینی تولید ساعتی پیش‌فرض، proxy دوطرفه، داده‌های خاک/خطرات و مدل استاندارد سازه همچنان بازند. موارد «باز» جدول بالا با پاس‌شدن رگرسیون‌ها خودکار بسته نمی‌شوند.
