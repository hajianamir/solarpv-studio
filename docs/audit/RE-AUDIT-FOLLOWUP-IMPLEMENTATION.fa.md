# پیگیری پیاده‌سازی پس از re-audit snapshot

**Snapshot ممیزی:** `0a0adb6d63f107a4c56b87270c8d97fc91a68c4d`
**Commit بستهٔ ممیزی قبلی:** `aca0328a4474fec593fd9b9808bcc87796defe97`
**وضعیت مبنای این گزارش:** تغییرات اصلی follow-up در commitهای `3f3242d` و `d31ed61` روی شاخهٔ کاری منتشر شدند؛ تکمیل gate پس از بازبینی در همین سند جداگانه ثبت شده است. این سند اجرای مستقل یا release sign-off نیست.

## تغییرات پیاده‌سازی‌شده در این follow-up

- **ادعاهای benchmark:** target مصنوعی soiling دیگر به‌عنوان PVDAQ/IEC measurement عرضه نمی‌شود؛ خروجی آن `evidenceStatus: unverified` و internal target comparison است. متون test/output تصریح می‌کنند که فایل‌های checked-in و URL/DOI به‌تنهایی اجرای SAM یا استقلال مرجع را ثابت نمی‌کنند. `VAL-SANDIA-02` به `implementation_verification` تنزل‌یافته؛ پارامترهای CEC/SAM و solver از نظر عددی هنوز مستقل اعتبارسنجی نشده‌اند.
- **Provenance:** مقدار provider/reanalysis/derived دیگر در projection گزارش به confidence `measured` ارتقا نمی‌یابد. `sourceKind`, provider و derivation همچنان برای tracing حفظ می‌شوند؛ این تغییر به‌تنهایی مجوز/صحت provider را تأیید نمی‌کند.
- **ایمنی برق:** در خروجی grounding، `isCompliant`، `isTouchSafe`، `isStepSafe`، `isResistanceCompliant` و `isConductorCompliant` اکنون `null` هستند؛ فیلدهای `*ScreenPassed` صرفاً مقایسه با فرض‌ها/targetهای داخلی‌اند. UI عنوان و توضیح را به screening مقدماتی تغییر داده و نیاز به دادهٔ خاک و هندسهٔ واقعی را نشان می‌دهد. در تحلیل شبکه/هارمونیک نیز `pccVoltageRiseCompliant`، `isFlickerCompliant`، `isThdCompliant` و `isTddCompliant` تعیین‌نشده (`null`) هستند و نتیجه‌های غربالگری فیلد جدا دارند؛ صفحه صریحاً عدم ارزیابی measured و عدم ادعای IEEE 519/کد شبکه را اعلام می‌کند. همین مرزبندی به `calculateEarthingSystem` در BOM/Protection گسترش یافت: verdictهای ایمنی/انطباق null، مقایسه‌های مدل در `*ScreenPassed`، و UI برچسب preliminary دارد. مسیر این صفحه وقتی ورودی مطالعه اتصال کوتاه پروژه موجود نیست نتایج را همچنان پنهان می‌کند. این کار خطر برچسب false-pass را کم می‌کند، اما مدل‌های فیزیکی یا مبانی استاندارد را مستقلاً تأیید نمی‌کند.
- **JWT/API:** توکن Bearer اکنون `exp` عددی و معتبر می‌خواهد، از lifetime پیش‌فرض 24 ساعته (قابل تنظیم تا سقف 7 روز) فراتر نمی‌رود، `nbf`/`iat` معیوب را رد می‌کند و در صورت پیکربندی، `iss` و `aud` را دقیقاً بررسی می‌کند. آزمون‌های JWT برای exp غایب، issuer/audience نادرست، عمر بیش‌ازحد و token معتبر اضافه شدند. برای production، پیکربندی issuer/audience باید با identity provider واقعی توافق و در deployment اعمال شود؛ verifier یا provider واقعی اینجا در دسترس نبود.
- **مصرف منابع:** برای geocoding و تولید گزارش، limitهای per-IP (به‌ترتیب 30 و 20 درخواست در دقیقه) اضافه شد؛ proxy headers فقط با `TRUST_PROXY=true` مورد اعتمادند. این rate limit درون‌حافظه‌ای و per-process است؛ deployment چند replica هنوز به limit مشترک در API gateway/WAF نیاز دارد. این مطابق توصیهٔ کلی OWASP API4 برای rate limit و محدودکردن مصرف است، نه جایگزین edge protection: [OWASP API4:2023](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/).
- **Container/data:** `.dockerignore` فایل‌های env/credential و runtime data را از build context خارج می‌کند؛ compose یک volume پایدار برای `/app/data` تعریف می‌کند. فایل‌محور بودن datastore همچنان برای چند replica/production durability کافی نیست و backup/restore، database واقعی و migration هنوز لازم‌اند.
- **Registry/CI و تکمیل پس از بازبینی `d31ed61`:** registry با script قراردادی بررسی می‌شود و workflow روی push همهٔ شاخه‌ها و PR اجرا می‌شود. Gate با TypeScript AST diff مبنا تا HEAD را می‌سنجد؛ operatorهای حسابی و compound assignmentها (`+=`, `-=`, `*=`, `/=`, shifts و bitwise)، همچنین `++`/`--`، آستانه‌های عددی و call siteهای helperهای محاسباتی نام‌گذاری‌شده را به‌عنوان واحدهای محاسباتی ردیابی می‌کند. آزمون منفی ثابت می‌کند که تغییر `sum += x` به `sum -= x` و `sum++` به `sum--` fixture obligation می‌سازد. برای هر formula ID، manifest به‌جای اعتماد به متن تست دلخواه، مسیر fixture، نام export تابع production، آرگومان‌های ورودی، خروجی مستقل مورد انتظار، tolerance عددی، و منبع HTTPS با edition/locator می‌خواهد. خود gate ماژول TypeScript همان فایل engine را import می‌کند، export تابع را واقعاً با fixture اجرا می‌کند و خروجی عددی/ساختار را با tolerance مقایسه می‌کند؛ تست policy نیز runner را با یک ماژول موقت اجرا و mismatch خروجی را fail می‌کند. این تغییر قدرت کنترل را بالا می‌برد اما AST detector هنوز یک screening مکانیکی است، نه اثبات پوشش کامل همهٔ الگوهای محاسباتی، و metadata/پرچم استقلال، مجوز یا صحت منبع را به‌طور خودکار تأیید نمی‌کند؛ بازبینی منبع و روش لازم است. `scripts/physics-reference-evidence.json` همچنان خالی است، چون fixture علمی معتبر مستقلی برای فرمول‌های موجود در دسترس نیست؛ پس PASS بدون تغییر فرمول فقط یعنی تغییر فرمولی در diff تشخیص داده نشده و ادعای اعتبارسنجی علمی نیست. الگوریتم single-diode در registry به Newton–Raphson توصیف می‌شود؛ تاریخ‌های آینده و بدون پشتوانه از `lastModified` حذف شده‌اند. Branch protection خارج از repository است؛ تلاش قبلی برای خواندن تنظیمات 403 داد، بنابراین required status check فعال/تأییدشده نیست. مدیر مخزن باید در Settings → Branches/Rulesets روی `main`، Require status checks را فعال و check دقیق `Physics Registry & Independent Reference Gate` را انتخاب کند.
- **تعداد تست:** عبارت غیرقابل‌بازتولید `297/297` از README حذف شد و تست shape شمارش core دیگر +1 ساختگی یا حداقل 140 assertion فرض نمی‌کند.
- **race تست:** M04 دیگر فایل reference اصلی را تغییر/rename نمی‌کند؛ fixtureهای تغییر‌یافته در پوشهٔ موقت مجزا ساخته و پاک می‌شوند.

## تست‌های اجراشده در این working tree

| فرمان/بررسی | نتیجه |
|---|---|
| `npm ci` | موفق؛ 551 packages audited، 0 vulnerability گزارش‌شده در audit npm (این audit جایگزین امنیت‌سنجی deployment نیست). |
| `npm run lint:types` | موفق پس از رفع duplicate import آزمایشی. |
| `npm run verify:physics-registry` | موفق؛ 8 model entries بررسی شدند (قرارداد metadata است، نه مرجع تجربی). |
| `npm run test:physics-reference-gate` | PASS؛ آزمون detector نشان می‌دهد تغییر `+=`/`-=` و `++`/`--` obligation می‌سازد. Runner با ماژول production موقت واقعاً اجرا شد و fixture منطبق را قبول و خروجی نامنطبق را رد کرد. |
| `PHYSICS_DIFF_BASE=3f3242d3d4404e9ea95fabf67d73602bfc887114 npm run verify:physics-reference-gate` | PASS روی patch تکمیلی حاضر؛ در این patch فرمول engine عوض نشده است. Manifest علمی واقعی هنوز خالی است؛ PASS ادعای صحت فرمول‌های موجود نیست. |
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
6. **آزمون‌های موجود، ارزیابی بیرونی نیستند:** اجرای موفق benchmark یا قراردادهای policy نباید به‌عنوان تأیید صحت مهندسی/علمی تعبیر شود.

## منابع بررسی‌شده

- IETF, [RFC 8725 — JSON Web Token Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725.html): الگوریتم/اعتبارسنجی claims و ضرورت اعتبارسنجی audience در صورت کاربرد چند relying party؛ خود RFC تعیین‌کنندهٔ issuer/audience خاص این محصول نیست.
- OWASP, [API4:2023 — Unrestricted Resource Consumption](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/): لزوم محدودسازی نرخ، تعداد/اندازهٔ درخواست و هزینهٔ عملیات؛ محدودیت in-memory فعلی تنها یک لایه است.
- NREL, [PVWatts V8 API documentation](https://developer.nrel.gov/docs/solar/pvwatts/v8/): ثبت ورودی‌ها، نسخهٔ API/SSC، منبع weather و شناسهٔ ایستگاه در نتایج نمونه اهمیت provenance قابل‌بازتولید را نشان می‌دهد؛ هیچ API زنده یا اجرای PVWatts در این follow-up انجام نشده است.
