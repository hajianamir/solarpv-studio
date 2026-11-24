# UQ-004 — اجرای ایزوله، برچسب‌های علمی و E2E برنامه

## Intake / هدف و دامنه
نوع: زیرساخت غیرپژوهشی و اصلاح نمایش. هدف: اجرای LHS/copula مالیِ موجود خارج از thread اصلی، بدون تغییر معادله/seed/توزیع یا ورود خروجی پژوهش به مالی؛ و حذف ادعاهای ناموجه از رابط. کاربر باید بتواند job را لغو کند، پس از شکست دوباره اجرا کند و نتیجهٔ قدیمی را برای ورودی جدید نبیند.

## Discover / تصمیم معماری
موتور legacy در TypeScript است. setTimeout قبلی محاسبه را از thread اصلی خارج نمی‌کرد. برای حفظ برابری دقیق و پرهیز از ایجاد چهارمین موتور UQ، همان تابع در Dedicated Module Worker بسته‌بندی‌شده اجرا می‌شود. Python API، workerهای پژوهشی و احراز هویت سمت سرور تغییر نمی‌کنند؛ endpoint یا اجرای کد دلخواه جدیدی وجود ندارد. این انتخاب محاسبهٔ پژوهشی چندفیزیکی را به مرورگر منتقل نمی‌کند.

`uncertaintyPropagation.ts` واقعاً normalized Pearson r² روی NPV را محاسبه می‌کند؛ نام قدیمی fieldهای variance/decomposition و INVESTMENT_GRADE اثبات علمی آن ادعاها نیست. قراردادهای قدیمی برای backward compatibility حفظ، اما در type comments به‌عنوان legacy مستند شده‌اند؛ UI دیگر رتبهٔ اعتباری صادر نمی‌کند.

## Plan / فایل‌ها و قرارداد
- `src/studies/financialUq.worker.ts`: ورودی داخلی `{input: FinancialUqRunInput}` و پاسخ `{ok:true,value}` یا خطای ثابت. sampleSize عدد صحیح ۲۰–۲۰۰۰؛ ظرفیت و انرژی مثبت/finite، seed محدود به finite و payload ≤۱۲۸KiB. UI فعلی ۵۰/۱۰۰/۲۰۰ نمونه می‌دهد.
- `src/studies/financialUqRunner.ts`: یک Worker برای هر job، promise+cancel، timeout پیش‌فرض ۱۲۰ ثانیه، terminate و قطع handler در تمام مسیرها. onerror/messageerror/creation/postMessage failure مسیر خطا دارند. هیچ fallback همگام روی thread UI نیست.
- `FinancialTab.tsx`: await روی runner، cancel، شمارهٔ درخواست و snapshot-context برای جلوگیری از race و پاسخ کهنه؛ cleanup هنگام تغییر ورودی یا unmount.
- `vite.config.ts`: precache فایل‌های `.worker-*.js` چون Vite آن‌ها را الزاماً در manifest معمول نمی‌آورد؛ بدون آن offline job پس از نصب تضمین نمی‌شد.
- تست‌های worker، تب integration و E2E production؛ gate جدید و receipt قابل بازتولید.

## Feature flag / بازگشت
مسیر Worker پیش‌فرض فعال است. برای غیرفعال‌سازی در build: `VITE_FINANCIAL_UQ_WORKER=false npm run build`. در این حالت اجرا با خطای قابل بازیابی مسدود می‌شود؛ موتور سنگین به thread اصلی برنمی‌گردد. هیچ دادهٔ پروژه migrate نمی‌شود و API قدیمی موتور برای تست/مصرف‌کنندگان موجود حفظ است. نمایش‌های صریح UQ-002/003 همچنان flagهای محلی پیش‌فرض خاموش دارند. build قبلی برای rollback کامل قابل استفاده است؛ رجوع خاموش و بی‌سروصدا به محاسبهٔ blocking مجاز نیست.

## UI و خطاها
idle → running → success/error؛ cancel → idle. تغییر context نتیجه را پنهان، Worker را terminate و درخواست قبلی را بی‌اثر می‌کند. timeout/crash/عدم پشتیبانی Worker پیام عمومی بدون قیمت، جزئیات پروژه یا stack می‌دهد. exportها snapshot هستند و فرمول مالی تغییر نمی‌کند.

## اصلاح برچسب‌ها و سطح دقت
- Risk: «نشانگر غربالگری NPV — بدون رتبهٔ اعتباری». وضعیت فقط مثبت‌بودن q10/میانه یا غیرمثبت‌بودن آن‌ها را شرح می‌دهد؛ raw enum قدیمی INVESTMENT_GRADE نمایش داده نمی‌شود.
- Decomposition: «گروه‌بندی اکتشافی امتیاز نرمال‌شدهٔ Pearson r²». درصدهای موجود حفظ شده‌اند اما سهم واریانس، تفکیک معتبر aleatory/epistemic، SRC رتبه‌ای، Sobol یا اثر علّی نامیده نمی‌شوند.
- SD/√N: برآورد ساده، نه تضمین همگرایی LHS/copula یا فاصلهٔ اطمینان کالیبره.
- این تغییر دقت مدل را افزایش نمی‌دهد؛ فقط اجرا و تفسیر را اصلاح می‌کند. همهٔ نتایج مشروط/اکتشافی و not field validated می‌مانند.

## Acceptance criteria
1. همان input/seed در Worker واقعی برای powerplant/ongrid/offgrid با اجرای مستقیم موتور، جز traceId مبتنی بر ساعت، دقیقاً برابر باشد؛ ورودی mutate نشود.
2. cancel، timeout، Worker unavailable، پاسخ malformed و پیام خطا reject و منابع را terminate کنند؛ اجرای همگام جایگزین وجود نداشته باشد.
3. test production App→Express→Worker→کارت‌ها→PDF واقعی عبور کند؛ مسیر UQ با mock نتیجه یا API جایگزین نشود.
4. برچسب‌های fa/en بدون ادعای گواه اعتبار/variance attribution نمایش داده شوند.
5. cancel/retry، تغییر قیمت، خرابی asset/retry و navigation-away بدون نتیجهٔ کهنه تست شوند.
6. پس از نصب Service Worker و reload آفلاین، UQ واقعی بدون اینترنت اجرا شود؛ worker chunk در precache باشد.
7. در job واقعی ۲۰۰۰ نمونه، timer thread اصلی پیش از پاسخ Worker جلو برود. این smoke اثبات جداشدن کار است، نه SLA زمانی یا benchmark سخت‌افزارهای کاربران.
8. رگرسیون‌های UQ-001/002/003، هسته، مرز انرژی، types/build و مجموعهٔ گستردهٔ مرورگر موجود سبز باشند؛ energy source عملیاتی در E2E تغییر نکند.

## Verify / Reflect
آزمون cancellation در E2E ابتدا به علت تکمیل بسیار سریع job قبل از click ناپایدار بود؛ فقط تحویل asset واقعی ۵۰۰ms تأخیر داده شد تا نقطهٔ لغو قطعی شود. خروجی یا محاسبه mock نشد. خطاهای TypeScript در overload ابزار observability تست و callback fake Worker نیز اصلاح و types مجدداً اجرا شد.

E2E جدید روی build production واقعی و Express با CSP فعلی اجرا می‌شود. transport فقط برای مقایسه مشاهده می‌شود؛ فرمول و request/response جایگزین نمی‌شود. تست failure به‌صورت عمدی asset را abort می‌کند؛ این آزمون از مسیر موفق جداست. آزمون offline از context مستقل با Service Worker واقعی استفاده می‌کند.

مجموعهٔ `npm run test:browser` نیز جدا از تست جدید اجرا می‌شود: offline lazy routes، SW update، AC interfaces، گزارش‌های F-04، import/export، catalog چندتب، خطاهای ذخیره‌سازی و fallback هواشناسی. بخش آنلاینِ این مجموعه از قبل fixtureهای synthetic دارد و نباید تأیید دادهٔ واقعی هواشناسی نامیده شود.

## Release gate
`PVLIB_PYTHON="$PWD/.venv/bin/python" npm run verify:uq:worker`

رسیدها: `docs/audit/UQ-004-GATE.json` و `docs/audit/UQ-004-E2E.json`. gate فقط در صورت موفقیت همهٔ فرمان‌ها و guardهای boundary/documentation، ready-for-review می‌دهد. این وضعیت تأیید عمومی کل محصول یا پوشش تمام سناریوهای ممکن نیست.

## راهنمای کاربر / Changelog
در تب مالی اجرای UQ را بزنید؛ در حال اجرا دکمهٔ «لغو» ظاهر می‌شود. لغو یا تغییر ورودی، job را قطع می‌کند. پس از خطای Worker دوباره تلاش کنید؛ اگر مرورگر Worker را پشتیبانی نکند اجرا مسدود می‌ماند. اینترنت بیرونی برای اجرای موتور پس از نصب لازم نیست.

Changelog: حذف setTimeout محاسباتی، افزودن Dedicated Worker/runner و lifecycle؛ تصحیح برچسب‌ها بدون تغییر مقدارها؛ افزودن precache worker و E2E کامل مسیر UQ؛ tests و gate. بدون وابستگی npm/Python جدید و بدون endpoint/auth جدید.

## سه پاسخ کیفیت و باقی‌مانده
- ورود ناخواستهٔ پژوهش به مالی؟ خیر، ورودی همان مدل مالی است؛ هیچ research adoption جدیدی نیست، gateهای انرژی قبلی و رگرسیون‌شان حفظ شده‌اند.
- رگرسیون/اعتبارسنجی عددی؟ برابری دقیق موتور و Worker در سه mode، fixtureهای قبلی و E2E production؛ نه اعتبارسنجی میدانی.
- دقت/محدودیت/منشأ؟ traceId و قراردادهای قبلی حفظ؛ UI علمی‌تر شده و محدودیت‌ها صریح‌اند.

باقی‌مانده: native Safari/Windows در این محیط اجرا نشده، تغییر نام فیلدهای ذخیره‌شده به migration نسخه‌دار نیاز دارد، و کالیبراسیون میدانی توزیع/همبستگی و decomposition معتبر کار علمی جداست. مانع‌های عمومی مجوز و پذیرش Safari با Chromium سبز رفع‌شده تلقی نمی‌شوند. کل برنامه از طریق تست‌های مشخص‌شده بررسی شده، نه ادعای پوشش جامع همهٔ عملکردهای نامرتبط.

## اصلاحات ممیزی پس از تحویل
- `financialUqResultValidation.ts` قرارداد کامل پاسخ را پیش از پذیرش runner کنترل می‌کند: finite بودن همهٔ شاخص‌ها، واحدها، ترتیب متفاوت انرژی/LCOE/NPV، nonnegative بودن دامنه‌های لازم، trace، تعداد نمونه، جمع شمارنده‌ها و بازهٔ امتیازها. این کنترل integrity است، نه اعتبارسنجی میدانی یا تبدیل score به سهم واریانس. پاسخ خراب بدون تعمیر خودکار و بدون افشای جزئیات رد می‌شود.
- تست mutation روی پاسخ کامل واقعی، خرابی p10/p90، stdDev، unit، sampleCount، شمارنده‌ها، درصدها و trace را پوشش می‌دهد؛ onerror، messageerror و خطای postMessage هم تست شده‌اند.
- تعداد نمونه به snapshot-context اضافه شد؛ تغییر آن job/نتیجهٔ قدیمی را باطل می‌کند. assertion منبع انرژی در E2E غیرتهی است تا تست vacuous نباشد.
- export نسل‌بندی‌شده هنگام تعویض props نتیجه در همان مؤلفه نیز باطل می‌شود؛ تست مرورگر برای انرژی/LCOE/NPV با font request معلق، عدم دانلود قدیمی و موفقیت export تازه دارد.
- cleanup نسل‌ها با capture شیء پایدار بازنویسی شد؛ خطاهای exhaustive-deps برطرف و ESLint این محدوده به gate افزوده شد. دو warning قدیمی any در FinancialTab خارج تغییر باقی است؛ lint خطا ندارد.
