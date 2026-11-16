# ممیزی مستقل SolarPV Studio — برنامه و baseline اولیه

**وضعیت سند:** فاز ۰ — فقط وضعیت مخزن، baseline آزمون و برنامهٔ اجرا؛ ممیزی کامل نشده است.<br>
**snapshot هدف:** `0a0adb6d63f107a4c56b87270c8d97fc91a68c4d`<br>
**شاخهٔ فعال Arena:** `arena/12d13c9e-solarpv-studio` (وضعیت `active`)<br>
**درخت منبع در شروع:** clean؛ `HEAD` با `origin/main` برابر بود.<br>
**تاریخ مرجع محیط:** 2026-11-03 UTC.<br>
**محدودیت انتشار:** هیچ commit، push، merge، release یا PR در این کار انجام نشده و بدون مجوز صریح جداگانه انجام نخواهد شد.

> این سند خود یک تغییر مستنداتی است که پس از ثبت baseline ایجاد شده است. جملهٔ «هنوز هیچ فایل ... تغییر نکرده» فقط وضعیت لحظهٔ ایجاد سند را توصیف می‌کند؛ از آن زمان `src/App.tsx` با افزودن دو dependency جاافتاده تغییر کرده است. baseline اولیهٔ زیر همچنان snapshot commit هدف را توصیف می‌کند و با نتایج working tree فعلی یکی نیست.

## 1. هویت snapshot و وضعیت زندهٔ GitHub

| مورد | مشاهده |
|---|---|
| شاخهٔ فعال | `arena/12d13c9e-solarpv-studio` |
| HEAD | `0a0adb6d63f107a4c56b87270c8d97fc91a68c4d` — merge مربوط به PR #37 |
| `origin/main` پس از fetch | همان `0a0adb6d63f107a4c56b87270c8d97fc91a68c4d` |
| شاخهٔ remote اختصاصی فعال | در refهای محلی fetch‌شده وجود ندارد؛ remoteِ مشاهده‌شده فقط `main` است |
| working tree آغاز | clean (`git status --porcelain` خالی) |
| عمق Git | shallow clone؛ تاریخچهٔ پیش از commit هدف در checkout حاضر کامل نیست |
| PRهای مرتبط | GitHub در زمان اجرا PRهای #35، #36 و #37 را `MERGED` گزارش کرد؛ برای شاخهٔ جاری PR باز یافت نشد. هیچ‌یک از وضعیت‌های قبلی به شاخهٔ جاری تعمیم داده نشده است. |
| PRهای باز | `gh pr list --state open` خروجی خالی داد. |
| نسخهٔ package | `1.0.3` در `package.json` |
| GitHub Releases | `gh release list --limit 5` خروجی خالی داد؛ بنابراین badge/متن نسخه در README به‌تنهایی اثبات انتشار GitHub نیست. |

**ناهماهنگی زمانی:** دادهٔ GitHub برای ادغام PRهای #35–#37 تاریخ‌هایی پس از تاریخ مرجع محیط نشان داد. وضعیت‌های state/merged در گزارش آمده‌اند، اما تاریخ‌های زمانیِ آن پاسخ به‌عنوان ترتیب قطعی رویدادها تفسیر نمی‌شوند.

## 2. دامنهٔ baseline و فرمان‌ها

محیط: Node `v22.22.3`، npm `10.9.8`. `npm ci` با موفقیت 550 بسته نصب کرد و audit وابستگی‌ها 0 vulnerability گزارش داد. خروجی نصب به معنی ممیزی مستقل زنجیرهٔ تأمین نیست.

| فرمان | exit | نتیجهٔ قابل‌مشاهده در snapshot |
|---|---:|---|
| `npm run lint` | 1 | هر دو type-check (`tsc --noEmit` و `tsconfig.node.json`) پاس شدند. ESLint یک خطا و 95 هشدار داد. خطای قطعی baseline در `src/App.tsx:1665`: `useMemo` وابستگی‌های `simulationResult.isGenerationDeratingAssessed` و `simulationResult.isPowerLimitsAssessed` را در dependency array ندارد. هشدارها عمدتاً `no-explicit-any` هستند. |
| `npm run test:all` | 0 | core suite و audit suites با exit موفق پایان یافتند. در M01–M22 پیام‌های `ENOTDIR` مربوط به fixture تزریق‌شدهٔ شکست ذخیره‌سازی دیده شد؛ خود suite با موفقیت پایان یافت. خروجی فرمان، یک شمار واحدِ معتبر برای «تعداد کل آزمون‌های مستقل» ارائه نمی‌کند. |
| `npm run test:gateway` | 0 | 24/24 regression پاس؛ شامل mockهای Redis REST، نه اجرای Redis واقعی. چند هشدار آزادسازی lease ثبت شد. |
| `npm run test:smoke` | 0 | 5/5 user-flow smoke پاس. |
| `npm run build` | 0 | Vite `6.4.5`، تعداد 2272 module. هشدار chunk بزرگ‌تر از 1000 kB؛ `OfficialReportModal` حدود 1,258.46 kB minified، `index` حدود 873.04 kB. هشدارهای Rollup/Zod و import دوگانهٔ `catalogRepository` نیز ثبت شدند. |
| `npm run verify:exports` | 0 | 9 مورد read-back برای DOCX/XLSX/JSON و re-import پاس. |
| `BROWSER_TEST_TIMEOUT_MS=240000 npm run test:browser` | 0 | تمام مواردی که runner با `[PASS]` گزارش کرد موفق شدند. خطاهای بارگیری منابع خارجی در محیط آفلاین و هشدار CSP دربارهٔ `frame-ancestors` در meta ثبت شد؛ این خطاهای شبکه، موفقیت regression را به تأیید دسترسی بیرونی تبدیل نمی‌کنند. |
| `git diff --check` | 0 | بدون whitespace error؛ در baseline اولیه diff وجود نداشت. |

**دروازه‌های اجرا‌نشده/محدودیت baseline:** اجرای production server با تنظیمات واقعی deployment، ممیزی bundle برای هر secret/`VITE_*`، `npm run test:redis-distributed` با Redis واقعی، `npm run test:coverage`، و آزمون مستقل numerical fixtureها هنوز انجام نشده‌اند. نتیجهٔ مثبت تست‌های بالا جای این موارد را نمی‌گیرد.

## 3. وضعیت گزارش‌های قدیمی نسبت به snapshot هدف

`docs/audit/AUDIT-FULL-2026-11-08.fa.md` صریحاً برای branch `arena/4a520cea-solarpv-studio` و commit کوتاه `dbf0aca` نوشته شده است؛ این با snapshot حاضر (`0a0adb6…`) متفاوت است. ادعاهای آن از جمله 84 مورد A-01…A-84 **در این سند هنوز باگ فعلی تلقی نمی‌شوند**. هر مورد باید با call-site، ورودی، آزمون و خروجی عددی روی `0a0adb6…` دوباره سنجیده و یکی از وضعیت‌های `تأیید شد / رفع شده / رد شد / تکرار نشد / نیازمند دسترسی یا مدرک` بگیرد.

این حکم دربارهٔ همهٔ اسناد قدیمی صدق می‌کند: عنوان، ADR، نام استاندارد، شمار تست یا برچسب «SAM/NASA/IEC/ASCE» به‌تنهایی شواهد مستقل نیست. تا زمان دسترسی به متن رسمی/نسخه و دادهٔ معتبر، ادعاهای استانداردی `تأییدنشده/ریسک باز` خواهند ماند.

## 4. رجیستر ریسک آغازین (فقط مواردی که baseline فعلی پشتیبانی می‌کند)

| ID | شدت | وضعیت فعلی | شواهد snapshot | مالک/وابستگی | معیار بستن |
|---|---|---|---|---|---|
| BASE-LINT-01 | P1 — CI/dev | **روی snapshot تأیید شد؛ در working tree فعلی اصلاح محلی شده** | `npm run lint` روی `0a0adb6…` با یک خطای `react-hooks/exhaustive-deps` در `src/App.tsx:1665` و 95 هشدار پایان یافت؛ type-checkها سبز بودند. علت، استفاده از دو assessment flag برای badge منوی شبیه‌سازی بدون dependency متناظر بود. در working tree فعلی همان دو dependency افزوده شده و lint با exit 0 و همان 95 هشدار اجرا شد. | Frontend; React hook dependency semantics | regression رفتاری/مرورگر برای تغییر badge در اثر تغییر assessment flags؛ lint فعلی سبز است. هنوز commit یا push نشده است. |
| BASE-DOC-01 | P2 — صداقت baseline | **ناسازگاری قابل مشاهده؛ معنای شمار هنوز باز** | README عبارت `Test baseline: 297/297` دارد؛ runnerهای این baseline جداگانه‌اند و `test:all` شمار تجمیعیِ نام‌گذاری‌شده/قابل‌ردیابی چاپ نکرد. فعلاً آن عدد را غلط اعلام نمی‌کنیم؛ زنجیرهٔ تولید آن باید بازتولید شود. | QA/docs; test harness inventory | منبع شمار، فرمان، نوع assertion/suite و حذف دوباره‌شماری مستند؛ README فقط عدد قابل‌بازتولید را می‌گوید. |
| BASE-PERF-01 | P1 — تجربه/عملکرد | **مشاهده شد؛ اثر کاربری نیازمند اندازه‌گیری** | Build روی همین snapshot `OfficialReportModal` را 1,258.46 kB و هشدار >1000 kB گزارش کرد. این به‌تنهایی ثابت نمی‌کند startup یا رندر کند است. | Frontend/build; `OfficialReportModal` dependencies | اندازه‌گیری cold-load/route chunk در browser با معیار ازپیش‌تعریف‌شده؛ تقسیم bundle فقط اگر شواهد نشان دهد لازم است. |
| BASE-EXT-01 | P0 gate برای sign-off | **نیازمند شخص ثالث/مدرک** | baseline شامل هیچ محاسبهٔ امضاشدهٔ PE، حفاظت/ارتینگ، ژئوتکنیک یا مالی نیست. متن رسمی استانداردها در این اجرای baseline دسترس‌پذیر/بازبینی‌شده نیست. | مالک محصول + مهندس مستقل هر رشته | بستهٔ ورودی/خروجی قابل‌بازتولید و گزارش امضاشده با تلرانس ازپیش‌تعریف‌شده؛ تا آن زمان خروجی screening می‌ماند. |
| HIST-AUDIT-01 | P0/P1 نامعلوم | **نیازمند بازتأیید؛ نه باگ جاریِ تأییدشده** | ادعاهای A-01…A-84 مربوط به snapshot دیگری هستند. | مالکان engine، API، سازه، مالی و QA | برای هر ID: snapshot، خط، ورودی، روش، شاهد، اثر و معیار بستن در رجیستر زنده ثبت شود. |

## 5. برنامهٔ اجرایی پیشنهادی و دروازه‌های پذیرش

برآوردها نفر-روز/هفتهٔ تقویمیِ تقریبی برای مرحلهٔ ممیزی و patchهای کوچک‌اند؛ دقت فیزیکی یا تضمین پایان نیستند. وابستگی اصلیِ کارهای مدل، وجود دادهٔ مرجع مستقل و دسترسی به متن استاندارد است.

### P0-A — تکمیل baseline، نقشهٔ call-site و توقف ادعاهای بی‌پشتوانه (حدود 2–4 روز)
- ترسیم جریان ورودی → engine → state/UI → report/export → financial و مسیرهای سرور واقعی.
- تعیین منبع حقیقت برای انرژی، ظرفیت AC/DC، clipping و CAPEX؛ ثبت اختلاف‌ها پیش از انتخاب مرجع.
- بررسی برچسب screening/non-certified، منشأ داده و نمایش `UNASSESSED` در سازه، انرژی، مالی و حفاظت.
- برای هر ادعای قدیمی، وضعیت بازتولید/عدم‌بازتولید ثبت شود؛ بدون پاک‌کردن history یا فرض صحت گزارش قدیمی.
- خروجی: risk register زنده + ماتریس traceability + لاگ baseline.

### P0-B — مدل‌های برق/PV و اتصال خروجی‌ها (حدود 1–2 هفته، مشروط به fixture معتبر)
1. Single-diode/De Soto: تبدیل پارامترها، یک ماژول در برابر چند ماژول سری، واحدها، Rs/Rsh/a، منحنی I–V/P–V؛ مقایسه با fixture منتشرشده و منشأ روشن.
2. MPPT: Voc سرد، Vmp گرم/سرد، ضرایب دما، allocation واقعی، current limits، fleet؛ مسیر contract → `designPvArray` → facade → UI/report.
3. انرژی/مالی: مسیرهای yield، array sizing، waterfall، 24h، server API، fuel, clipping, degradation, LCOE/IRR؛ دقتاً فقط پس از ساخت ورودی مشترک قابل‌بازتولید.
4. PCC: P/Q، توان ظاهری، pf، R/X و علامت ولتاژ با fixture مستقل؛ ورودی ناکافی باید `UNASSESSED` بماند.
- معیار خروج: اعداد هم‌ورودی بین مسیرها تطبیق کنند یا اختلاف مستند و کاربرنما داشته باشند؛ test از فرمول مستقل یا دادهٔ مرجع، نه بازنویسی همان فرمول.

### P0-C — زمین، حفاظت، سازه و ژئوتکنیک (حدود 2–4 هفته + وابستگی بیرونی)
- جداکردن conductor thermal/fault duty از electrode resistance، touch/step، نصب و soil profile.
- آزمون wind/snow combinations، pile/Broms/uplift/bond، anchors، groundwater و seismic؛ صریح‌کردن حدود صلاحیت مدل و کشور.
- بدون استاندارد رسمی/ویرایش و دادهٔ واقعی محل، موارد مرتبط «تأییدنشده» می‌مانند؛ هیچ clamp پنهانی با ادعای compliance پذیرفته نیست.
- خروجی: screen-only UX، اصلاحات محدود، بستهٔ ارجاع به PE/ژئوتکنیک/حفاظت.

### P0-D — API/security/production (حدود 4–8 روز)
- دنبال‌کردن `/api/v1/projects/:id`, `/api/v1/sync/push`, `/api/v1/gateway/geocode` از route تا middleware/storage/startup؛ matrix برای dev/prod و نبود secret.
- تست HTTP واقعی برای auth, ownership, JWT/Bearer semantics, signature/expiry, rate-limit, CORS, body limits, invalid payload.
- production build و bundle scan؛ فقط نام متغیرها/secret-patternها ثبت شود، نه مقدار رازها.
- آزمون‌ها opt-in/mocked بمانند مگر external test مشخص و صریحاً مجاز باشد.

### P0-E — provenance، reference harness و CI (حدود 1–2 هفته)
- برای هر تغییر مدل: مدل/نسخه/دامنه/فرض/محدودیت/منبع در `PHYSICS_MODEL_REGISTRY`، golden fixture با units/tolerance/provenance، ADR/docs اگر قرارداد تغییر کند.
- بررسی gate CI موجود پیش از افزودن gate؛ fixture مستقل و تست‌های cross-path فقط با criteria ازپیش‌تعریف‌شده.
- distinguish numerical implementation test از independent cross-validation.

### P1 — معماری، دسترس‌پذیری و عملکرد (پس از P0؛ حدود 2–4 iteration)
- وابستگی‌های `App.tsx` و محاسبه در render؛ اندازه‌گیری 8760/shading/report در پروفایلر.
- inventory مسیرهای lazy/chunks و `OfficialReportModal`؛ refactor فقط با evidence و تفکیک تست‌پذیر.
- keyboard/screen reader/contrast/reduced-motion/RTL/responsive; progressive disclosure و engineering warnings کنار فیلدها.
- هیچ هدف LOC یا انتخاب state-store ازپیش‌تعیین‌شده نیست؛ معیار کاهش coupling و حفظ pure-engine است.

### P2 — گزینه‌های بعدی، فقط با دامنه و دادهٔ کافی
Faiman/SAM/PVsyst thermal; advanced IEC voltage; cable tables; IAM/spectrum/bifacial/snow/soiling; grid-code/flicker/inrush/GIS; مالیات/تورم/salvage و LCOE/IRR؛ optimizer/portfolio/exports. همه backlog هستند، نه تعهد نسخهٔ بعد.

## 6. بستهٔ ارجاع بیرونی و وضعیت مجوز استفاده

**وضعیت sign-off مستقل:** در انتظار شخص ثالث؛ انجام‌شده گزارش نمی‌شود. برای بستهٔ ممیز: سه سایت با مجوز استفاده، site-specific inputs و provenance، فایل خروجی موتور و نسخهٔ model, دست‌محاسبهٔ مستقل، PVsyst/SAM/HelioScope در صورت دسترسی، تلرانس ازپیش‌توافق‌شده، اختلاف‌ها و نام نقش/صلاحیت امضاکنندهٔ PV، حفاظت/earthing، سازه/geotech و مالی لازم است. تا دریافت امضاها، هیچ گواهی استاندارد یا تأیید مناسب تأمین مالی صادر نمی‌شود.

| نوع استفاده | وضعیت فعلی پیشنهادی | مدرک لازم برای ارتقا |
|---|---|---|
| نمونه‌سازی/آموزشی | مجاز با افشای تخمین‌ها و limitations | حفظ provenance و warnings |
| screening مقدماتی | مشروط؛ lint در working tree فعلی سبز است، اما ریسک‌های P0/P1 و یافته‌های نیازمند بازتأیید همچنان بازند | رفع/mitigation ریسک‌های P0 متناسب با کاربرد، cross-path tests و افشای محدودیت‌ها |
| طراحی حرفه‌ای تحت بازبینی | فعلاً فقط به‌عنوان ابزار کمکی غیرحاکم | ورودی محل‌محور + review ذی‌صلاح برای هر رشته + حدود مدل |
| تأمین مالی / bankability | غیرمجاز بر مبنای نرم‌افزار به‌تنهایی | validation مستقل، مدل مالی مورد توافق، دادهٔ site-specific و امضاهای لازم |

## 7. پیگیری ممیزی و وضعیت working tree فعلی (2026-11-03 UTC)

### تغییرات محلی و وضعیت Git
- شاخه همچنان `arena/12d13c9e-solarpv-studio` و `HEAD` همچنان `0a0adb6d63f107a4c56b87270c8d97fc91a68c4d` است؛ با `main` به‌عنوان merge-base برابر است. `gh pr list --state open` خالی بود. remote refs موجود: `origin/main` و `origin/HEAD -> origin/main`.
- تغییرات فعلی فقط شامل `src/App.tsx` (افزودن دو dependency جاافتاده به `useMemo`) و همین سند ممیزیِ untracked است. هیچ تغییر کاربری دیگری پاک/overwrite نشده؛ هیچ commit/push/merge/release انجام نشده است.
- دلیل اصلاح: badge آیتم شبیه‌سازی بر مبنای `isGenerationDeratingAssessed` و `isPowerLimitsAssessed` ساخته می‌شود؛ بدون dependencyها ممکن بود با تغییر assessment، memo و badge کهنه بمانند. type-check و lint بعد از اصلاح پاس شدند. تست مرورگر موجود regression اختصاصی برای toggle همین دو flag ندارد؛ این مورد به‌عنوان بررسی رفتاری باقیمانده ثبت می‌شود.

### تکرار آزمون‌ها روی working tree فعلی
| فرمان | نتیجهٔ فعلی | تفسیر/محدودیت |
|---|---|---|
| `npm run lint` | exit 0؛ دو type-check پاس؛ ESLint صفر error و 95 warning | مشکل baseline مربوط به dependency دیگر در این working tree دیده نشد؛ هشدارهای `no-explicit-any` همچنان هستند. |
| `npm test` | exit 0؛ core benchmark/unit suite پاس | خروجی مفصل runner شامل ادعاهای reference است؛ این passها اعتبار منبع مستقل را اثبات نمی‌کنند. هشدار lifecycle مربوط به `shadingLifecycle` نیز چاپ شد. |
| `npm run test:audit` | exit 0؛ remediation، F-04 (233 checks)، cache و help verification پاس | fixtureهای عمدی ENOTDIR برای شکست persistence در stderr دیده شدند؛ خطاهای تزریق‌شده‌اند، خود runner موفق پایان یافت. خروجی طولانی بود و بخشی از لاگ توسط ابزار بریده شد. |
| `npm run test:gateway` | exit 0؛ 24/24 پاس | عمدتاً regression و mock/synthetic bridge؛ هشدارهای lease-release ثبت شدند، Redis واقعی اجرا نشد. |
| `npm run test:smoke` | exit 0؛ 5/5 user flows پاس | smoke/integration محدود، نه تأیید کارکرد تمام deployment. |
| `BROWSER_TEST_TIMEOUT_MS=240000 npm run test:browser` | exit 0؛ تمام موارد `[PASS]` گزارش‌شده پاس | regressions واقعی مرورگر شامل service worker/offline، گزارش و import/export، چند tab، climate mock و unsizable cases را پوشش داد. خطاهای منابع بیرونی `ERR_INTERNET_DISCONNECTED/ERR_FAILED` و هشدار CSP `frame-ancestors` در meta ثبت شدند؛ دسترسی بیرونی در محیط فراهم نبود. |
| `npm run build` | exit 0؛ 2272 modules | هشدار chunk بزرگ: `OfficialReportModal` = 1,258.46 kB، `index` = 873.10 kB؛ همچنین module خارجی‌شدهٔ `fs`، annotationهای Rollup/Zod و import دوگانهٔ `catalogRepository`. خروجی build به‌تنهایی رفتار production server را نمی‌سنجد. |
| اسکن ایستای `dist` پس از build | 36 فایل asset بررسی شد؛ دو الگوی متداول credential literal تطبیق نداشتند | این اسکن محدود اثبات نبودن secret نیست. شناسهٔ `PROVIDER_LIMITER_REDIS_REST_TOKEN` و کد distributed provider limiter در bundle دیده می‌شود؛ بازرسی context نشان داد فقط دسترسی کد به نام `process.env` است و مقدار credential در bundle پیدا نشد. علت محتملِ حضور کد، import مسیر gateway؛ نیازمند جداسازی client/server و ممیزی کامل‌تر است. نام‌های `SECRET_INTERNALS...` نیز مربوط به React هستند. |
| `git diff --check` + `git diff --no-index --check /dev/null docs/audit/RE-AUDIT-PLAN-BASELINE-0a0adb6.fa.md` | بدون خطای whitespace | هر دو فایل tracked و سند untracked بررسی شدند؛ exit عادی 1 مربوط به وجود تفاوت در diffِ سند untracked از wrapper جدا شد. |

### یافتهٔ مستقلِ بازتولیدشده: `VAL-SANDIA-02` / single-diode
- وضعیت: **تأیید شد — نقص در روش/برچسب‌گذاری benchmark؛ باگ فیزیکی solver هنوز اثبات نشده است.** در `crossValidation.ts` تابع `calculateSingleDiodeCurve(...)` با ورودی‌های STC، 800 W/m² و 45°C فراخوانی می‌شود، اما `customParams` حذف شده است؛ پس golden dataset پارامترهای `Rs=0.231 Ω`, `Rsh=485 Ω`, `n=1.048`, `Io=8.95e-11 A` benchmark pass-اشده را عملاً constrain نمی‌کنند. مقدار محلی default/extracted که قبلاً ثبت شد: `Pmp≈409.1 W` در برابر target داخلی `410.20 W` (خطای 0.27%، داخل حد 1.5%). این pass، اجرای مرجع CEC با پارامترهای ثبت‌شده یا اعتبار مستقل target را اثبات نمی‌کند.
- اجرای جداگانه با همان STC inputs و پارامترهای ثبت‌شدهٔ بالا به‌عنوان `customParams` (با `iph` مشتق‌شدهٔ خود مدل، نه fixture مستقل) داد: STC `Pmp=542.8 W`, `Voc=49.96 V`, `Vmp=41.21 V`, `Imp=13.17 A`; در 800 W/m² و 45°C: `Pmp=402.0 W`, `Voc=46.34 V`, `Vmp=37.65 V`, `Imp=10.68 A`. نسبت به target داخلی 410.20 W اختلاف توان 8.20 W، حدود 2.00% است و از tolerance داخلی 1.5% فراتر می‌رود. چون استقلال/provenance target و سازگاری کامل پارامترهای 5-parameter با ورودی‌های دیتاشیت در این اجرا احراز نشد، این اختلاف را نباید حکم صحت/خطای فیزیکی ماژول تلقی کرد.
- شواهد کافی برای اصلاح benchmark harness/مستندسازی درخواست می‌شود؛ تا تأمین fixture مستقلِ منشأدار و ورودی کامل، finding فقط دربارهٔ عدم استقلال/عدم انطباق اجرای benchmark با ادعای پارامتردهی است. هیچ کد مدل single-diode در این مرحله تغییر نکرده و `pvlib` نصب/اجرا نشده است.

## 8. مواردی که هنوز انجام نشده‌اند

- گزارش ممیزی snapshot در [`RE-AUDIT-REPORT-0a0adb6.fa.md`](RE-AUDIT-REPORT-0a0adb6.fa.md) و matrix مستقلِ تعیین‌تکلیف A-01…A-84 در [`RE-AUDIT-MATRIX-0a0adb6.fa.md`](RE-AUDIT-MATRIX-0a0adb6.fa.md) تکمیل شدند. هر 84 شناسه با منبع جاری بررسی و به تأییدشده/تاحدی/کهنه/نیازمند مرجع بیرونی طبقه‌بندی شد؛ این کار ادعای 84 آزمون مستقل یا validation بیرونی نیست.
- production build/server و آزمون HTTP محلی اجرا شدند؛ `npm run test:coverage` نیز اجرا شد. اجرای Redis واقعی، SAM/pvlib مستقل، داده‌های زندهٔ بیرونی، آزمون کامل با identity provider/secret واقعی و performance profiling با معیار کاربری انجام نشد.
- کد آزمون فعلی در بخش‌هایی PASS است، اما هیچ ادعای دقت فیزیکی، انطباق IEC/NEC/IEEE/ASCE، گواهی طراحی یا تأیید شخص ثالث ایجاد نمی‌کند. تأیید شخص ثالث برای طراحی محل‌محور همچنان در انتظار است.
- اصلاح محدود `src/App.tsx` برای dependency React انجام شد؛ بازطراحی UX یا accessibility audit کامل انجام نشده است.
- هیچ commit، push، PR یا release ایجاد نشده است.
