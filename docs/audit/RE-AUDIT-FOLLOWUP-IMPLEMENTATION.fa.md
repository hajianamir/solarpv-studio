# پیگیری پیاده‌سازی پس از re-audit snapshot

**Snapshot ممیزی:** `0a0adb6d63f107a4c56b87270c8d97fc91a68c4d`
**Commit بستهٔ ممیزی قبلی:** `aca0328a4474fec593fd9b9808bcc87796defe97`
**وضعیت این پیگیری:** تغییرات working tree شاخهٔ فعال؛ هنوز commit/push نشده‌اند. این سند اجرای مستقل یا release sign-off نیست.

## تغییرات پیاده‌سازی‌شده در این follow-up

- **ادعاهای benchmark:** target مصنوعی soiling دیگر به‌عنوان PVDAQ/IEC measurement عرضه نمی‌شود؛ خروجی آن `evidenceStatus: unverified` و internal target comparison است. متون test/output تصریح می‌کنند که فایل‌های checked-in و URL/DOI به‌تنهایی اجرای SAM یا استقلال مرجع را ثابت نمی‌کنند. `VAL-SANDIA-02` به `implementation_verification` تنزل‌یافته؛ پارامترهای CEC/SAM و solver از نظر عددی هنوز مستقل اعتبارسنجی نشده‌اند.
- **Provenance:** مقدار provider/reanalysis/derived دیگر در projection گزارش به confidence `measured` ارتقا نمی‌یابد. `sourceKind`, provider و derivation همچنان برای tracing حفظ می‌شوند؛ این تغییر به‌تنهایی مجوز/صحت provider را تأیید نمی‌کند.
- **ایمنی برق:** در خروجی grounding، `isCompliant`، `isTouchSafe`، `isStepSafe`، `isResistanceCompliant` و `isConductorCompliant` اکنون `null` هستند؛ فیلدهای `*ScreenPassed` صرفاً مقایسه با فرض‌ها/targetهای داخلی‌اند. UI عنوان و توضیح را به screening مقدماتی تغییر داده و نیاز به دادهٔ خاک و هندسهٔ واقعی را نشان می‌دهد. در تحلیل شبکه/هارمونیک نیز `pccVoltageRiseCompliant`، `isFlickerCompliant`، `isThdCompliant` و `isTddCompliant` تعیین‌نشده (`null`) هستند و نتیجه‌های غربالگری فیلد جدا دارند؛ صفحه صریحاً عدم ارزیابی measured و عدم ادعای IEEE 519/کد شبکه را اعلام می‌کند. همین مرزبندی به `calculateEarthingSystem` در BOM/Protection گسترش یافت: verdictهای ایمنی/انطباق null، مقایسه‌های مدل در `*ScreenPassed`، و UI برچسب preliminary دارد. مسیر این صفحه وقتی ورودی مطالعه اتصال کوتاه پروژه موجود نیست نتایج را همچنان پنهان می‌کند. این کار خطر برچسب false-pass را کم می‌کند، اما مدل‌های فیزیکی یا مبانی استاندارد را مستقلاً تأیید نمی‌کند.
- **JWT/API:** توکن Bearer اکنون `exp` عددی و معتبر می‌خواهد، از lifetime پیش‌فرض 24 ساعته (قابل تنظیم تا سقف 7 روز) فراتر نمی‌رود، `nbf`/`iat` معیوب را رد می‌کند و در صورت پیکربندی، `iss` و `aud` را دقیقاً بررسی می‌کند. آزمون‌های JWT برای exp غایب، issuer/audience نادرست، عمر بیش‌ازحد و token معتبر اضافه شدند. برای production، پیکربندی issuer/audience باید با identity provider واقعی توافق و در deployment اعمال شود؛ verifier یا provider واقعی اینجا در دسترس نبود.
- **مصرف منابع:** برای geocoding و تولید گزارش، limitهای per-IP (به‌ترتیب 30 و 20 درخواست در دقیقه) اضافه شد؛ proxy headers فقط با `TRUST_PROXY=true` مورد اعتمادند. این rate limit درون‌حافظه‌ای و per-process است؛ deployment چند replica هنوز به limit مشترک در API gateway/WAF نیاز دارد. این مطابق توصیهٔ کلی OWASP API4 برای rate limit و محدودکردن مصرف است، نه جایگزین edge protection: [OWASP API4:2023](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/).
- **Container/data:** `.dockerignore` فایل‌های env/credential و runtime data را از build context خارج می‌کند؛ compose یک volume پایدار برای `/app/data` تعریف می‌کند. فایل‌محور بودن datastore همچنان برای چند replica/production durability کافی نیست و backup/restore، database واقعی و migration هنوز لازم‌اند.
- **Registry/CI:** registry با script قراردادی بررسی می‌شود و workflow روی push همهٔ شاخه‌ها و PR اجرا می‌شود. Gate مستقل جدید diff مبنا تا HEAD را با TypeScript AST می‌سنجد؛ تغییر/افزودن عبارات ریاضی، آستانه‌های عددی یا call siteهای helperهای محاسباتی نام‌گذاری‌شده در کد engine برای هر عبارت تغییرکرده یک evidence record مستقل می‌خواهد: fixture با ورودی/خروجی و tolerance، منبع HTTPS با edition/section locator، و تست اجرایی که همان formula ID و fixture را مصرف کند. تست‌ها در gate اجرا می‌شوند. فایل `scripts/physics-reference-evidence.json` فعلاً خالی است، چون هیچ fixture عددی مستقلی در این پیگیری برای ادعای علمی اضافه نشده؛ بنابراین هر تغییر فرمول تازه بدون مرجع معتبر fail-closed می‌شود. این AST gate یک screening مکانیکی است و استقلال علمی/مجوز منبع را به‌تنهایی اثبات نمی‌کند؛ review منبع و روش همچنان لازم است. الگوریتم single-diode در registry به Newton–Raphson توصیف می‌شود؛ تاریخ‌های آینده و بدون پشتوانه از `lastModified` حذف شده‌اند. Branch protection سراسری GitHub خارج از این repository است؛ API خواندن branch protection در این نشست 403 داد و نتوانستم required status check را در تنظیمات repository فعال یا تأیید کنم. مدیر مخزن باید در Settings → Branches/Rulesets روی شاخهٔ `main`، گزینهٔ Require status checks to pass before merging را فعال و پس از اجرای workflow check دقیق `Physics Registry & Independent Reference Gate` را انتخاب کند.
- **تعداد تست:** عبارت غیرقابل‌بازتولید `297/297` از README حذف شد و تست shape شمارش core دیگر +1 ساختگی یا حداقل 140 assertion فرض نمی‌کند.
- **race تست:** M04 دیگر فایل reference اصلی را تغییر/rename نمی‌کند؛ fixtureهای تغییر‌یافته در پوشهٔ موقت مجزا ساخته و پاک می‌شوند.

## تست‌های اجراشده در این working tree

| فرمان/بررسی | نتیجه |
|---|---|
| `npm ci` | موفق؛ 551 packages audited، 0 vulnerability گزارش‌شده در audit npm (این audit جایگزین امنیت‌سنجی deployment نیست). |
| `npm run lint:types` | موفق پس از رفع duplicate import آزمایشی. |
| `npm run verify:physics-registry` | موفق؛ 8 model entries بررسی شدند (قرارداد metadata است، نه مرجع تجربی). |
| `PHYSICS_DIFF_BASE=0a0adb6d63f107a4c56b87270c8d97fc91a68c4d npm run verify:physics-reference-gate` | PASS روی diff snapshot مبنا تا candidate؛ checker هیچ عبارت فرمولی جدید/تغییریافته در engineهای انتخاب‌شده نیافت. Policy unit test تغییر معادله/ضریب/ورودی و helper-call را به evidence obligation تبدیل می‌کند، prose-only را رد نمی‌کند و نبود evidence را fail می‌کند. Manifest مستقل فعلاً خالی است؛ این نتیجه اثبات صحت فرمول‌های موجود یا provenance علمی مراجع نیست. |
| `npm run verify:rate-limit` | موفق؛ unit contract و آزمون HTTP واقعی در Express: 30 درخواست به route، درخواست 31ام با 429/Retry-After بلوکه شد؛ شبکهٔ بیرونی فراخوانی نشد. |
| `npm run verify:source-invariants` | موفق؛ checks متنی node-only از bundle مرورگر جدا شدند. |
| `npm run verify:engine-claims` | موفق؛ قراردادها assert می‌کنند وضعیت‌های compliance/safety استاندارد IEEE 519/80 و PCC/flicker در مدل‌های ساده `null` بمانند و فقط screening جداگانه گزارش شود. |
| `npm run test:remediation` | 74/74 پاس؛ شامل confidence تحلیلی برای provider data. |
| `npm test` | موفق پس از اصلاح count؛ 4 metric با cross-validation tag و 2 implementation checks. stderr هشدار lifecycle قدیمی `shadingLifecycle` چاپ کرد. PASS این suite اثبات دقت فیزیکی نیست. |
| `npm run test:audit` | exit 0؛ suiteهای audit و contract از جمله JWT profile، fixtureهای ایزوله، registry، rate-limit و source invariant اجرا شدند. خطاهای عمدی persistence test در stderr انتظار می‌روند. |
| `npm run test:smoke` | 5/5 flows پاس؛ benchmark به‌عنوان internal stored-target comparison معرفی شد. |
| `npm run test:gateway` | 24/24 پاس؛ Redis REST mock/synthetic بود، Redis واقعی اجرا نشد و هشدار lease-release گزارش شد. |
| `npm run verify:exports` | DOCX/XLSX/JSON read-back پاس؛ متادیتا/پرووننس round-trip شد، نه صحت مهندسی محتوا. |
| `npm run build` و production browser suite | موفق؛ warning `fs` externalized از bundle رفع شد. هنوز `OfficialReportModal`=1,258.46 kB (gzip 358.13 kB)، `index`=873.10 kB (gzip 255.10 kB)، warning static/dynamic import `catalogRepository` و annotationهای Rollup/Zod باقی‌اند؛ performance budget/route profiling تعریف یا تأیید نشد. |
| `npm run lint` | exit 0؛ صفر error و 95 هشدار ESLint `no-explicit-any` باقی است. |
| `BROWSER_TEST_TIMEOUT_MS=240000 npm run test:browser` | PASS؛ offline/service-worker، reports/export/import، tabs و climate mocks. محیط دسترسی بیرونی نداشت؛ پیام‌های `ERR_FAILED`/`ERR_INTERNET_DISCONNECTED` و اخطار CSP `frame-ancestors` داخل meta باقی ماندند. |
| YAML parse و `git diff --check` | docker-compose و GitHub Actions YAML parse شدند؛ `git diff --check` پاس شد. Docker CLI حاضر نبود، پس image build/compose runtime آزمایش نشد. |

## مواردی که عمداً بسته‌شده اعلام نمی‌شوند

1. **Sign-off و شواهد مهندسی بیرونی:** PE/مهندس حفاظت و ارتینگ/سازه/ژئوتکنیک/اتصال شبکه/مالی، دادهٔ معتبر site-specific، خاک/بورهول/pullout، study fileهای مستقل SAM/PVsyst/ETAP/DIgSILENT و مجوز استفاده از آن‌ها در دسترس نیست. این موارد با کدنویسی یا جست‌وجوی وب قابل جعل یا جایگزینی نیستند؛ باید توسط مالک پروژه و افراد دارای صلاحیت فراهم شوند.
2. **دقت فیزیکی و standards compliance:** تغییرات UI صرفاً از اعتماد کاذب جلوگیری می‌کنند؛ مدل‌های earthing، harmonic/PCC، سازه، انرژی و مالی همچنان screening هستند. ادعای IEC/IEEE/ASCE/NEC compliance یا bankability صادر نمی‌شود.
3. **Security production review:** JWT issuer/audience باید با IdP واقعی verify شود؛ rate limit فعلی per-process است؛ penetration test، authorization matrix کامل، abuse-cost caps، secrets manager، CORS policy/production headers، trusted proxy config و datastore چندنمونه‌ای مستقل ارزیابی نشده‌اند.
4. **Performance/accessibility:** cold-load/route profile و معیارهای UX ازپیش‌تعریف‌شده، split/lazy loading بر مبنای trace، WCAG keyboard/screen-reader/contrast/reduced-motion audit کامل انجام نشده‌اند. حجم chunk یا lint warnings به‌تنهایی با این patch حل نمی‌شوند.
5. **CI required enforcement:** workflow check اکنون تولید می‌شود، اما required status check و branch protection در تنظیمات GitHub repository اثبات/فعال نشده است.
6. **تغییرات هنوز commit یا push نشده‌اند.**

## منابع بررسی‌شده

- IETF, [RFC 8725 — JSON Web Token Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725.html): الگوریتم/اعتبارسنجی claims و ضرورت اعتبارسنجی audience در صورت کاربرد چند relying party؛ خود RFC تعیین‌کنندهٔ issuer/audience خاص این محصول نیست.
- OWASP, [API4:2023 — Unrestricted Resource Consumption](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/): لزوم محدودسازی نرخ، تعداد/اندازهٔ درخواست و هزینهٔ عملیات؛ محدودیت in-memory فعلی تنها یک لایه است.
- NREL, [PVWatts V8 API documentation](https://developer.nrel.gov/docs/solar/pvwatts/v8/): ثبت ورودی‌ها، نسخهٔ API/SSC، منبع weather و شناسهٔ ایستگاه در نتایج نمونه اهمیت provenance قابل‌بازتولید را نشان می‌دهد؛ هیچ API زنده یا اجرای PVWatts در این follow-up انجام نشده است.
