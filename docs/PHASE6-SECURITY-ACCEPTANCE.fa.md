# فاز۶ — امنیت، مجوزها و پذیرش روی SHA دقیق

تاریخ گزارش: **2026-11-03**. دامنه مطابق پاسخ صریح کاربر: بررسی امنیت و مجوزها، CI واقعی Linux/Windows و پذیرش نهایی؛ نه فاز۶ قدیمی مالی.

## نسخه و تاریخچه

شاخه: `arena/237e6ea2-solarpv-studio`.

نامزد نهایی کد: **`0051d3ef224da0a1555d2766e13f5625b103f6ff`**.

در شروع، HEAD محلی5438fb5 و تحویل‌های قبلی به‌شکل تغییرات ذخیره‌شده بودند؛ remote همین شاخه323a40b بود. تغییرات تحویل‌شده و وابستگی‌هایشان در9a42db4 ثبت شدند و تاریخچهٔ remote با merge563d878 ادغام شد. ۱۲تعارض بررسی شدند: نسخهٔ محلی شامل قابلیت‌ها/آزمون‌های جدید و اصلاحات امنیتی بود و نسخه‌های remote در همان نقاط قدیمی‌تر بودند؛ نسخهٔ کامل‌تر حفظ شد. هر دو تاریخچه اکنون در ancestry وجود دارند؛ force-push ، حذف تاریخچه، تغییر شاخه یا merge به main انجام نشد.

اصلاحات پس از مشاهدهٔ CI:
- `d47dc54`: سازگارکردن انتظارهای مرورگر با CSP سخت‌گیرانه، بدون آزادکردن eval ؛ ثبت خطای محدود در annotation های CI.
- `0051d3e`: UTF-8 صریح برای fixture و JSONbridge مدل ترکیبی روی Windows/Linux ؛ اجرای محلی با `PYTHONIOENCODING=cp1252` نیز گذشت.

گزارش نهایی و receipt همراه، اسناد محلی این نامزد هستند؛ نتایج هر SHA به همان SHA نسبت داده می‌شوند، نه commit بعدی.

## اصلاحات امنیتی و آزمون‌ها

### ۱. مرز اجرای Python

`src/server/terminateProcessTree.ts` میان study و research مشترک شد. روی POSIX ، worker در process-group مستقل اجرا می‌شود و لغو/timeout کل گروه را متوقف می‌کند. روی Windows از `taskkill /pid <integer> /T /F` بدون shell استفاده و در خطای اجرا/exit غیرصفر، توقف فرزند اصلی نیز درخواست می‌شود. مسیر script/Python ، گزینهٔ سرور است و از HTTP دریافت نمی‌شود.

آزمون جدید در هر دو executor یک descendant واقعی با pipe های جدا ایجاد می‌کند؛ پس از cancellation بررسی می‌شود که دیگر درحال اجرا نباشد. در Linux ، zombie متوقف‌شده با process فعال اشتباه گرفته نمی‌شود. محدودیت زمان/خروجی/capacity ، لغو پیش از شروع و نبود fallback نیز با تست‌های API موجود بررسی شدند.

**مرز امنیتی:** `python -I` و subprocess بدون shell ، sandbox سیستم‌عامل نیستند. server و worker باید با کاربر کم‌اختیار، filesystem/network محدود و سقف RAM/CPU در container یا سیاست سیستم اجرا شوند. محدودیتهای فعلی زمان/بایت جای cgroup/Job Object نیستند. اجرای scripts دلخواه کاربر در HTTP پشتیبانی نمی‌شود.

### ۲. CSP تولید

در production ، `script-src 'self'` است؛ `unsafe-eval` و `unsafe-inline` برای script از header حذف شدند. style های inline فعلاً برایرابط باقی‌اند و حذف آن‌ها دراین تحویل ادعا نمی‌شود. هدرهای nosniff ، frame-ancestors ، object-src و base-uri حفظ شدند.

CI عمومی ابتدا شکست واقعی نشان داد: `waitForFunction` داخلی Playwright درمرورگر قدیمی‌تر eval می‌کرد. شکست محلی بازتولید و انتظارهای همان predicate با polling محدود از طریق debugger evaluation جایگزین شد؛ **CSP ضعیف یا bypass نشد**. مجموعهٔ کامل direct-study مرورگر با سیاست سخت‌گیرانه گذشت. تست اختصاصی وجود header تولید و نبود unsafe-eval را مستقل بررسی می‌کند. متای HTML سیاست legacy دارد، اما header تولید سخت‌گیرانه‌تر است و سیاست‌ها هم‌زمان اعمال می‌شوند؛ توسعه با تولید یکسان فرض نمی‌شود.

### ۳. احراز هویت و مالکیت

`test-phase6-security.ts` با مسیرواقعی server ، نه resolver جعلی، موارد زیر را بررسی می‌کند:
- رد JWT با issuer/audience نامعتبر، exp منقضی/غایب، nbf آینده، iat نامعتبر، alg=none وامضای خراب؛
- رد spoof با x-user-id ، gatewaysecret جعلی و Bearer خام؛
- auth قبل از parser پژوهشی:JSON خراب با JWT نامعتبر401 و با JWT معتبر400؛
- پاسخ no-store ؛
- ایجادپروژه با ownerId جعلی مالکیت را تغییر نمی‌دهد؛ خواندن/نوشتن/فهرست کاربردیگر به پروژهٔ خصوصی دسترسی ندارد؛
- توقف descendant واقعی هر دو executor.

الگوی JWT فعلی HS256 است و این تست‌ها آن را OIDC کامل، مدیریت revocation یا RBAC نمی‌نامند. کلید طولانی تصادفی، issuer/audience دقیق، TLS در reverseproxy ،چرخش secret و trustedgateway جداگانه الزامات استقرارند. TRUST_PROXY نباید بدون proxy قابل‌اعتماد فعال شود. rate-limit حافظه‌ای per-process/per-IP است و جای quota توزیع‌شده/WAF نیست. دسترسی پروژه‌های legacy بی‌مالک مطابق قرارداد موجود است؛ همهٔ پروژه‌هایقدیمی خصوصی‌سازی نشده‌اند.

## وابستگی‌ها و آسیب‌پذیری‌ها

`npm audit` کل lockfile: **صفر آسیب‌پذیری شناخته‌شده** درزمان بررسی. این نتیجه گواه نبودآسیب‌پذیری نیست.

`pip-audit==2.9.0` ابتدا۹یافته درچهاربسته گزارش کرد. نسخه‌های زیر در requirements مشترک pinned به‌روز و ممیزی تکرار شد:

| بسته | قبل | بعد |
|---|---|---|
|certifi|2025.10.5|2026.10.18|
|idna|3.11|3.15|
|requests|2.32.5|2.33.0|
|urllib3|2.5.0|2.8.0|

پس ازاصلاح: **صفر آسیب‌پذیری شناخته‌شده در۱۶بستهٔ pinned**. نسخه‌های عددی pvlib0.13.1/numpy2.2.6/scipy1.15.3 تغییرنکردند. تست‌های Python/API/مرورگر پس ازبه‌روزرسانی اجراشدند. audit محیط مستقل دارد و ابزارممیزی به dependencies اجرایمحصول افزوده‌نشده است. گیت CI با یافتهٔ advisory شکست می‌خورد؛ exception یا ignore شناسه ساخته‌نشده است.

## مجوزها: بررسی انجام شد، مجوز حقوقی جعل نشد

اسکریپت‌های `phase6-license-inventory.mjs/.py` فهرست **۶۴۶ورودی lockfileJS**، metadata و متن/hashnotice بسته‌های نصب‌شده، **۱۶بسته Pythonpinned** و notice های retained را ثبت می‌کنند. ورودی‌هایاختیاری نصب‌نشده صریح‌اند. نتیجهٔ inventory موفق، `legalApproval=true` یا اجازهٔتوزیع نیست.

### موانع حقوقی باز

۱. **LICENSE ریشه مشخص نیست.** مجوزعمومی به‌نام مالک انتخاب نشده است؛ عمومی‌بودن مخزن به‌معنی MIT نیست. تصمیم مالک و بررسیحقوق مؤلفان لازم است.

۲. **`buffers@0.1.1` مجوزقابل‌احراز ندارد.** مسیر وابستگی: `exceljs → unzipper → binary → buffers`. metadata و archive نصب‌شده فاقد LICENSE اند و مخزن قدیمی معرفی‌شده404می‌دهد. برچسب MIT به آن نسبت داده‌نشده است. پیش ازتوزیع باید مجوز معتبر تأمین شود یا وابستگی باجایگزین سازگار/آزموده حذف شود؛ override ناسازگار خودکار انجام‌نشده است.

۳. **حقوقانتشار case33bw نیازمندبررسی است.** notice اصلی MATPOWER ، case ها را از BSD کد مستثنا می‌کند؛ citation مقاله به‌تنهایی مجوزانتشار نیست. testcase ازاجرای production جداست، اما انتشارسورس شامل آن هم clearance می‌خواهد.

notice فونت DejaVu ، مجوز PyBaMM/Chen2020 و noticeMATPOWER حفظ ووجودشان تست شد. بررسی metadata به‌تنهایی گواه سازگاری همهٔشرایطتوزیع یا مجوزباینری‌هایهمراه نیست؛ خروجی SBOM/notice باید همراه بستهٔواقعی انتشار بازبینی شود. بسته‌های test مانند Chromium و وابستگی‌های vendor شده هم درارزیابیبستهٔنهایی باید لحاظ شوند.

**نتیجهٔ مجوز: `review_required` ؛ پذیرش انتشار مسدود است.**

## CI و پذیرش

workflow جدید `.github/workflows/phase6-acceptance.yml` روی Ubuntu و Windows ، Python3.11/Node22 اجرا می‌شود و `contents:read` دارد. checkoutHEAD با GITHUB_SHA مقایسه می‌شود. artifact ها SHA نامزد،سیستم‌عامل،نسخه‌ها،خروجی security ، advisory و licenseinventory را ثبت می‌کنند. `technicalStatus` از `releaseAcceptance` جداست؛ موفقیتتست، مجوزتوزیع نمی‌سازد.

نامزدنهایی:
- فاز۶: https://github.com/hajianamir/solarpv-studio/actions/runs/45025785226
- CI عمومی: https://github.com/hajianamir/solarpv-studio/actions/runs/45025785206
- پلتفرم‌هایبهره‌برداری و Safari: https://github.com/hajianamir/solarpv-studio/actions/runs/45025785207

### نتایج قطعی روی نامزد نهایی

| مجموعه | نتیجهٔ مشاهده‌شده |
|---|---|
| فاز۶ — Ubuntu | **SUCCESS** |
| فاز۶ — Windows | **SUCCESS** |
| CI عمومی — هر۶ job ، شامل direct-study ویندوز/لینوکس، Node20/22 و گیت معادلات | **SUCCESS** |
| بهره‌برداری — Linux/Chromium | **SUCCESS** |
| بهره‌برداری — Windows/Chromium | **SUCCESS** |
| بهره‌برداری — macOS/Playwright WebKit | **SUCCESS**؛ معادل Safari بومی نیست |
| Native Safari | **FAILURE**؛ probe واقعی دیسک، فایل24byte ، NotReadableError |

run فاز۶ و CI عمومی هر دو به‌طور کامل موفق شدند. workflow پلتفرم‌ها به‌علت شکست Safari بومی درمجموع **FAILURE** است؛ آن را سبز اعلام نمی‌کنیم. remote HEAD نیز دقیقاً با نامزد نهایی برابر بررسی شد. metadata کامل job ها/step ها و annotation شکست Safari در `docs/audit/PHASE6-ACCEPTANCE.json` ثبت شده است. وجود و نام artifact های Windows/Linux از API GitHub تأیید شد؛ محتوای ZIP آن‌ها به‌دلیل محدودیت دسترسی به میزبان artifact در این محیط دانلود/بازخوانی نشد. نتیجهٔ job و اجرای step های audit/receipt از API تأیید شده، نه از بازخوانی ساختگی artifact.

**تصمیم نهایی:** گیت‌های فنی Linux/Windows قبول؛ پذیرش انتشار و پذیرش سراسری پلتفرم‌ها **BLOCKED** به‌دلیل موارد مجوز و Safari بومی. هیچ release/tag یا PR merge انجام نشده است.

 run قدیمی563d878 فاز۶ Linux/Windows موفق بود ولی CI عمومی درمرورگر Linux و bridgeWindows شکستداشت؛ موفقیتآن با نامزدجدید جابه‌جا نمی‌شود. تلاشبرایلغو run هایقدیمی به‌دلیلنبودمجوز Actions:write با403ردشد؛ آن‌ها دورزده/حذف نشدند.

گیت NativeSafari تاریخی در run563d878 نیز دوباره با file24byte و `NotReadableError` شکستخورد. این شکست به‌عنوان green/skipped پنهاننشده و WebKit جای Safari بومی نامیده‌نمی‌شود. حتی موفقیت Linux/Windows ، به‌تنهایی پذیرشتمامپلتفرم‌ها رااثباتنمی‌کند.

آزمونمحلی پس ازاصلاح dependency/process/CSP: `test:all` ، API پژوهشی/study ،۱۵تستفیزیکی و۴ mutation ،۶۶تستپژوهشی و۱۵۸تست study ، API فیزیکی، build ومرورگرفیزیکی موفق؛ direct-study/storage مرورگر نیز پس ازاصلاح wait گذشت. lint:types قبل از push گذشت؛ هشدارهای lint قدیمی و chunk بزرگ ادعایصفرهشدارندارند. تست Cp1252مدلترکیبی نیزموفق بود.

### معیار تصمیم نهایی

- قبولیفنی Linux/Windows: فقط براساس run هایهمین SHA وتمامگیت‌هایمرتبط.
- پذیرشانتشار: **مسدودتا تعیینمجوزریشه، buffers و case33bw**؛ independent ازسبزبودن CI.
- پذیرشسراسری nativeSafari: تاگذرواقعیتستدیسک وبازخوانیخروجی بازاست.
- هیچکدامازاینموارد،تأییدمیدانی/ایمنیفیزیکی یا pentest جامع نیستند.

## تکرار و منابع

```sh
node scripts/phase6-license-inventory.mjs
python scripts/phase6-license-inventory.py
npx tsx scripts/test-phase6-security.ts
npm audit --audit-level=low
python -m venv .cache/audit-env
node scripts/phase6-python-audit.mjs
```

`PVLIB_PYTHON` باید به Python محیط requirementspinned اشاره کند. برایتست‌هایمحلی legacy از `SOLARPV_DB_FILE` مسیر scratch استفاده‌کنید؛ تستجدید security خودش DB موقتایزوله دارد. artifact های CI ۳۰روزنگهداری می‌شوند؛گزارشماشین‌خوان محلی همراه سند مستقل ازآن‌هاست.

سهجست‌وجویجداومنابعاصلیخوانده‌شده:
- Node22 child_process: https://nodejs.org/docs/latest-v22.x/api/child_process.html ؛ semantics عدم shell/processgroup وتفاوت Windows.
- OWASPRESTSecurity: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html ؛ JWT ، issuer/audience/exp ،کنترل endpoint و HTTPS.
- ChooseALicense ، NoLicense: https://choosealicense.com/no-permission/ ؛نبودمجوز،اجازهٔعمومیتوزیعنیست. اینسندجایمشاورهحقوقی نیست.
