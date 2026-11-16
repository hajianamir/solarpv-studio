# گزارش نهایی ممیزی snapshot — SolarPV Studio

**تاریخ ممیزی:** 2026-11-03 UTC<br>
**مخزن:** `hajianamir/solarpv-studio`<br>
**شاخهٔ Arena:** `arena/12d13c9e-solarpv-studio` — فعال<br>
**نشانی شاخه:** `https://github.com/hajianamir/solarpv-studio/tree/arena/12d13c9e-solarpv-studio`<br>
**HEAD / snapshot ممیزی‌شده:** `0a0adb6d63f107a4c56b87270c8d97fc91a68c4d`
**نشانی commit:** `https://github.com/hajianamir/solarpv-studio/commit/0a0adb6d63f107a4c56b87270c8d97fc91a68c4d`
**وضعیت remote:** refs محلی فقط `origin/main` را داشتند؛ شاخهٔ فعال به remote push نشده است. PR باز مرتبط یافت نشد. این ممیزی هیچ commit، push، merge یا release ایجاد نکرد.

> این گزارش دربارهٔ کد و artifacts همین snapshot است، نه تأیید پروژهٔ واقعی. «PASS» در تست داخلی به معنی صحت فیزیکی، انطباق استاندارد، تأیید مهندس مسئول یا bankability نیست. هیچ‌یک از خروجی‌ها گواهی طراحی، نقشهٔ مهرشده یا گزارش مناسب تأمین مالی محسوب نمی‌شود.

## 1. حکم اجرایی

**توصیهٔ انتشار:** فقط برای آموزش/نمونه‌سازی و screening مقدماتیِ صریحاً غیرحاکم، با افشای محدودیت‌ها. برای طراحی حرفه‌ای، انتخاب تجهیزات/حفاظت/ارتینگ/سازه، اتصال شبکه یا تأمین مالی، استفاده به‌عنوان مرجع تصمیم یا اعلام «مطابق/تأییدشده» توصیه نمی‌شود. ابتدا موارد `P0 gate` این گزارش باید از UI، آزمون‌ها و ادعاهای خروجی مهار شوند؛ سپس متخصصان مستقل هر رشته باید ورودی‌های site-specific را بررسی و sign-off کنند.

چند guard موجود رفتار سالمی دارند: تولید صفر حفظ می‌شود، ورودی ناقص در MPPT/سازه در مواردی `UNASSESSED` می‌ماند، مهاجرت نامعتبر مسدود می‌شود، و مسیرهای اصلی production API در آزمون محلی بدون اعتبارنامه برای منابع خصوصی fail-closed بودند. این نقاط قوت ریسک‌های روش‌شناسی، fixtureهای مرجع، و مدل‌های غربالگری زیر را خنثی نمی‌کنند.

## 2. دامنه و روش

بازبینی شامل README، STATUS-RFC، ADRها، اسناد ممیزی/Remediation و provenance؛ مسیرهای واقعی App → engine → report/export؛ single-diode، MPPT، PCC/grid، ارتینگ، سازه/ژئوتکنیک/زلزله؛ ثبت مدل‌ها و benchmark fixtures؛ API/auth و تنظیمات Docker/production؛ CI، lint، coverage، suites و production build بود. برای API، build نهایی با `NODE_ENV=production` روی دادهٔ آزمایشی در `/tmp` اجرا شد و سپس متوقف شد؛ شبکهٔ بیرونی فراخوانی نشد.

گزارش `docs/audit/AUDIT-FULL-2026-11-08.fa.md` فقط سرنخ تلقی شد: خودش تاریخ 2026-11-08 و شاخهٔ `arena/4a520cea-solarpv-studio` را ذکر می‌کند، درحالی‌که تاریخ محیط این ممیزی 2026-11-03 و snapshot هدف متفاوت است. بنابراین هیچ‌یک از 84 ادعای A-01…A-84 صرفاً به اتکای آن گزارش، باگ جاری اعلام نشده است. وضعیت مواردی که این دور مستقیماً بازبینی نکرد در بخش 8 صریحاً باز می‌ماند؛ این گزارش ادعای بازتولید کامل آن 84 مورد را ندارد.

## 3. یافته‌ها و رجیستر ریسک

شدت‌ها، اولویت اصلاح/مهار هستند؛ `P0 gate` یعنی مانع ادعای طراحی یا انتشار حرفه‌ای، نه لزوماً آسیب‌پذیری امنیتی قابل‌سوءاستفاده.

| شناسه | شدت / وضعیت | شاهد فعلی | اثر و اقدام لازم |
|---|---|---|---|
| RA-01 اعتبارسنجی میدانی/SAM | **P0 gate — تأیید شد: برچسب/روش benchmark استقلال را ثابت نمی‌کند** | `externalValidation.ts` برای Mesa 45 ورودی روزانهٔ مصنوعی می‌سازد، نرخ `0.188%/day` را می‌گذارد و مقدار «اندازه‌گیری‌شده» را پیش‌فرض `8.45%` می‌گیرد؛ سپس با همان ثابت مقایسه می‌کند. خود تابع `engineeringSummary` آن را «empirical independence» می‌خواند. `.sam`های `benchmarks/reference_files/` طبق README همان پوشه JSON manifest هستند، نه اجرای قابل‌بازتولید SAM؛ فایل آب‌وهوای ارجاعی و log مستقل همراهشان نیست. `npm test` هنوز «FIELD… PASS 0.12%» و SAM multi-climate PASS چاپ می‌کند. | PASS فعلی، صحت دادهٔ میدانی یا اجرای SAM را نشان نمی‌دهد؛ wording و نوع verification خطر اعتماد کاذب دارد. خروجی‌ها تا دریافت payload خام/manifest اجرای مستقل به «مقایسهٔ داخلی با target ذخیره‌شده» تغییر وصف دهند. منبع اولیه، حسگر و محاسبهٔ 8.45% در این اجرای ممیزی تأیید نشدند؛ وضعیت اندازه‌گیری: **نیازمند مدرک شخص ثالث**. |
| RA-02 `VAL-SANDIA-02` | **P0 gate — تأیید شد: harness پارامترهای مرجع را اعمال نمی‌کند** | `crossValidation.ts`، فراخوانی `calculateSingleDiodeCurve` بدون `customParams`، درحالی‌که `GOLDEN_SANDIA_PV` پارامترهای Rs/Rsh/n/Io ثبت کرده است. default/extracted محلی: حدود `409.1 W` در 800 W/m² و 45°C در برابر هدف داخلی `410.20 W`، خطای 0.27%. اجرای جداگانه با Rs=0.231 Ω، Rsh=485 Ω، n=1.048، Io=8.95e-11 A و Iph مشتق‌شدهٔ مدل: STC `542.8 W`; شرایط هدف `402.0 W`، حدود 2.00% اختلاف. | benchmark pass به پارامترهای مرجع وابسته نیست و «cross-validation مستقل» را ثابت نمی‌کند. اختلاف 402.0/410.20 از تلرانس داخلی 1.5% بیرون است، اما به‌تنهایی باگ solver یا نادرستی فیزیکی را اثبات نمی‌کند؛ استقلال target و سازگاری پارامترها با fixture مستقل احراز نشده است. پیش از اصلاح solver، fixture مرجعِ منشأدار و شرایط کامل CEC/SAM لازم است. |
| RA-03 ارتینگ/IEEE 80 | **P0 gate / P1 ادعای خروجی — تأیید شد: status بیش از شواهد ورودی را القا می‌کند** | `mvSubstationEngine.ts` حد مقاومت، touch/step و سایز هادی را از مفروضات ثابت/پروکسی می‌سازد: سطح gravel فرضی 10 cm و 3000 Ω·m؛ `Ifault = 0.7 × Isc`; نسبت‌های ثابت در mesh/step؛ مساحت پست از `max(400, MVA×250)`؛ طول مش از `sqrt(area)×8`. ورودی واقعی هندسهٔ مش، لایه‌بندی خاک/سطح و تقسیم جریان خطای زمین در این مدل کامل نیست. با ورودی آزمایشی 5 MVA، 20 kV، خاک 60 Ω·m و clearing 0.5 s، خروجی `isCompliant=true`, Rg=0.84 Ω و `actualMesh=145 V` در برابر limit=678 V شد. UI در `MvSubstationTab.tsx` آن را «Compliant IEEE 80 (<1 Ω)» نمایش می‌دهد. | این عدد فقط pass الگوریتم غربالگری با فرض‌های مذکور است؛ انطباق IEEE 80 پروژه‌ای را ثابت نمی‌کند. UI باید نتیجه را غیرحاکم/غربالگری و مدارک ناقص را آشکار کند، و تا مطالعهٔ مهندس حفاظت/ارتینگ و soil/electrode data از «مطابق IEEE 80» پرهیز شود. |
| RA-04 PCC، هارمونیک و grid code | **P1 — تأیید شد: مدل template/screening، نه ارزیابی اندازه‌گیری‌شده** | `harmonicsEngine.ts` طیف ثابت هارمونیک‌های نمونه (orders 3…25) و محاسبهٔ تقریبی THD/TDD و PCC voltage distortion را استفاده می‌کند؛ فرکانس 50 Hz ثابت است. `analyzeUpstreamGridConditions` با SCR/XR/PF و روابط ساده تخمین می‌زند؛ FRT خودش صریحاً `screening_only` است و گواهی تایپ‌تست سازنده می‌خواهد. نتیجهٔ `isThdCompliant`/`isTddCompliant` با دادهٔ واقعی inverter، طیف اندازه‌گیری‌شده و مدل شبکهٔ پروژه‌ای سنجیده نشده است. | `PASS/Compliant` این خروجی‌ها را نباید به انطباق IEEE 519/IEEE 1547 یا مطالعات اتصال تعبیر کرد. ورودی ناقص/دادهٔ تیپ‌تست غایب باید `UNASSESSED` باشد؛ برای sign-off به مدل شبکه و مطالعهٔ مستقل نیاز است. |
| RA-05 آب‌وهوای ورودی و provenance | **P1 — بازتولید شد: `provider_derived` در خروجی provenance به `measured` ارتقا می‌یابد** | `climateTypes.ts` می‌گوید reanalysis اندازه‌گیری زمینی نیست؛ ولی `provenanceBuilder.ts` و `projectProvenance.ts` هر `provider_value` یا `provider_derived` را در صورت برابری value/unit با confidence `measured` می‌سازند. اجرای synthetic parser-row با PVGIS reanalysis و quality note «not ground-station measurement» خروجی `confidence:"measured"` داد. `RFC3ReportsTab.tsx` و `OfficialReportModal.tsx` این confidence را نمایش می‌دهند. برخی climate parserها نیز DNI/DHI را با سهم ثابت GHI (NASA 0.72/0.28، PVGIS 0.70/0.30) مشتق می‌کنند و Tmin/Tmax/soiling/albedo را محلی یا فرضی نگه می‌دارند. | منشأ provider حفظ می‌شود اما سطح «اندازه‌گیری» نادرست است و می‌تواند به UI/report برسد. باید کلاس‌هایی مثل provider/reanalysis/derived/field measurement از هم جدا شوند؛ هیچ local fallback نباید live یا measured نامیده شود. دادهٔ API زنده در این محیط دریافت نشد؛ نتیجه فقط کد و fixture است. |
| RA-06 JWT و API production | **P1 — تأیید شد: token بی‌انقضا پذیرفته می‌شود؛ پیکربندی و سیاست احراز نیازمند سخت‌گیری** | `resolveRequesterIdentity` امضای HS256، `sub`, و در صورت عددی‌بودن `exp`/`nbf` را بررسی می‌کند، اما نبود `exp` را رد نمی‌کند و `iss`/`aud` را هم بررسی نمی‌کند. آزمون in-process با secret تصادفی فقط آزمایشی و HS256 معتبر بدون `exp/iat/aud/iss`، به `GET /api/v1/projects` در production-mode پاسخ 200 داد. با secrets حذف‌شده، GET projects و POST quick-size به 401 رسیدند. | توکن دزدیده‌شدهٔ بدون expiry می‌تواند نامحدود replay شود؛ در صورت استفاده از JWT باید عمر اجباری، issuer/audience و rotation/claim policy اعمال و با verifier مورد توافق آزموده شوند. این آزمون، جعل توکن بدون secret را نشان نمی‌دهد. |
| RA-07 API response policy و abuse controls | **P2 — رفتار فعلی تأیید شد؛ policy روشن نیست** | Production HTTP: mutation معتبرشکل‌گرفتهٔ بی‌هویت در `/sync/push` صفر پردازش شد ولی 400 (نه 401) با یک rejection برگرداند؛ batch خالی بی‌هویت 200 و `processedCount=0` می‌دهد؛ stateless `/reports/generate` بدون project snapshot و بدون identity یک گزارش «Preliminary» با `isReconciledAgainstSnapshot=false` می‌دهد. در `server.ts` middleware عمومی per-client rate limit مشاهده نشد؛ provider limiter نرخ upstream را کنترل می‌کند، نه لزوماً نرخ هر HTTP client. | مورد batch خالی، no-op و بدون mutation بود؛ از آن به‌تنهایی bypass نتیجه نمی‌شود. policy HTTP/status برای sync و report باید صریح شود. endpointهای عمومی gateway/report در deployment عمومی نیازمند rate/abuse controls و محدودیت هزینه/حجم‌اند. گزارش آزمایشی دادهٔ پروژهٔ خصوصی نخواند. |
| RA-08 container و دوام داده | **P1/P2 — پیکربندی مشاهده شد؛ اثر deployment وابسته به rollout** | فایل `.dockerignore` در checkout وجود ندارد و `Dockerfile` در stage سازنده `COPY . .` دارد؛ `.gitignore` جایگزین `.dockerignore` نیست. `.env` در Git ignore است، اما اگر محلی وجود داشته باشد از build context حذف نمی‌شود. `docker-compose.yml` volume پایدار برای `data/solar-db-snapshot.json` تعریف نکرده؛ backend از JSON snapshot محلی و in-memory DB استفاده می‌کند. | احتمال ورود `.env` به context و cache stage سازنده را بررسی و `.dockerignore` اضافه کنید (بدون افشای مقادیر). دادهٔ API در container قابل حذف/recreate است؛ قبل از deployment واقعی، volume/DB و backup/restore قراردادی لازم است. در ممیزی secret واقعی خوانده نشد. |
| RA-09 single-diode model registry | **P2 — اختلاف مستندات کد تأیید شد** | `modelRegistry.ts` برای `pv_single_diode_core` «Lambert W» می‌گوید؛ `singleDiodeModel.ts` در extraction و حل Voc/I(V) از Newton–Raphson استفاده می‌کند. Registry چند `lastModified: 2026-11-04` دارد که نسبت به تاریخ ممیزی 2026-11-03 آینده است. | registry/validity documentation با الگوریتم فعلی هماهنگ شود؛ تاریخ‌های نسخه‌گذاری باید از release/commit provenance تولید شوند. این مورد به‌خودی‌خود خطای عددی را اثبات نمی‌کند. |
| RA-10 آزمون‌ها و شمار 297 | **P2 — مشکل قابلیت ردیابی تأیید شد** | README می‌گوید `Test baseline: 297/297`؛ commandهای فعلی suites مستقل‌اند و runner واحدی که این عدد را با assertion IDs/تعریف شمار و dedupe تولید کند در CI مشاهده نشد. `unitTestsCore.ts` علاوه بر assertionهای رفتاری، یک guard با شرط `passed + failed >= 140` دارد؛ این guard صحت assertionها را اثبات نمی‌کند. | حذف/توضیح عدد 297 تا زمان بازتولید زنجیرهٔ تولید آن؛ گزارش count به تفکیک suite و assertion ID. coverage درصد کد را می‌سنجد، نه صحت مهندسی. |
| RA-11 build/CI/عملکرد | **P2 — هشدار قابل بازتولید؛ اثر کاربری هنوز اندازه‌گیری نشده** | Build پاس شد اما `OfficialReportModal` حدود 1,258.46 kB و `index` حدود 873.11 kB minified است؛ Vite هشدار chunk >1000 kB، dynamic/static import دوگانهٔ `catalogRepository` و `fs` externalized برای browser داد. `npm run lint` صفر error و 95 warning دارد. CI Node 20/22 suites گسترده اجرا می‌کند. | cold-load/route profiling لازم است پیش از ادعای startup slowdown؛ کد split فقط بر اساس trace اندازه‌گیری شود. `fs` warning/import graph باید برای بستهٔ browser بررسی و هر code path server-only از bundle جدا شود. |
| RA-12 MPPT | **Guard مشاهده شد؛ محدودیت شناخته‌شده** | `mpptAllocation.ts` تخصیص round-robin را صریحاً `isAssumed` می‌زند؛ `pvEngineAdvanced.ts` در نبود current limits، feasibility را false و blocking error می‌سازد؛ facade برای بعضی inverterهای utility از 65 A/90 A تخمینی استفاده و صریحاً `UNASSESSED` می‌کند. Coverage `electricalSizingContract.ts`: 74.5% statements, 44.44% branches. | این guardها نکتهٔ مثبت‌اند؛ عدد generic current را برای compliance استفاده نکنید. datasheet واقعی، wiring allocation واقعی و ضرایب/edition کد لازم است. از این ممیزی خطای قطعی voltage-window در ورودی کامل اثبات نشد. |
| RA-13 سازه/ژئوتکنیک/زلزله | **P0 gate برای design use؛ screen-only status در کد عمدتاً صریح است** | `structuralEngine.ts` و `structuralContract.ts` صریحاً pullout، borehole/frost، anchor concrete، edge vortices و dynamic seismic را `UNASSESSED` می‌دانند. ورودی `seismicZoneCoefficientA` در UI/model موجود است ولی جست‌وجوی مسیر engine نشان نداد که وارد محاسبهٔ ساختاری شود؛ seismic status در contract unassessed است. `structure-verify.ts` با `REAL_INTERNET=false` تنوع خروجی 5 سایت را پاس کرد، اما ورودی‌ها از climate model محلی/تحلیلی بودند. | تنوع عددی/تست هندسی validation خاک/بار واقعی نیست. `UNASSESSED` را در خروجی حفظ کنید؛ برای طرح باید گزارش محل‌محور geotech/structural و seismic با edition نافذ و امضای PE لازم باشد. |
| RA-14 baseline React dependency | **روی commit تأیید شد؛ در working tree فعلی اصلاح محلی** | `src/App.tsx` از دو flag assessment برای badge منو استفاده می‌کرد اما dependencyهای `useMemo` را نداشت. دو dependency افزوده شد؛ `npm run lint` فعلی پاس است. | این تغییر فقط reactivity badge را اصلاح می‌کند؛ suite مرورگر regression مستقیم toggle همین دو flag ندارد. تغییر هنوز commit نشده. |
| RA-15 اجرای موازی suiteها و fixtureهای مرجع | **race بازتولید شد؛ harness تست فایل مرجع را موقتاً rename می‌کند** | `scripts/audit-m01-to-m22-remediation-test.ts` در آزمون M04 فایل Phoenix `.sam` را rename کرده و در `finally` برمی‌گرداند؛ `npm test` هم‌زمان همان فایل را می‌خواند. اجرای موازی این دو command در این دور سبب شد `npm test` به‌علت «file not found» fail شود؛ اجرای متوالی پس از restoration پاس شد. | در CI با checkout جدا race رخ نمی‌دهد، اما اجرای موازی محلی/همان workspace flaky است. فایل‌سیستم scratch مجزا یا synchronization لازم است؛ این خطا نباید به نبودن پایدار fixture یا شکست مدل نسبت داده شود. |

### نتیجهٔ دامنه‌های مهندسیِ حساس
- **Single-diode:** روش solver با registry ناهماهنگ؛ benchmark پارامترهای golden را مصرف نمی‌کند. pvlib نصب نبود و اجرای مستقل SAM/pvlib انجام نشد. **solver physical accuracy: نیازمند مرجع مستقل.**
- **Earthing:** تابع سادهٔ threshold و فرض‌های ثابت به `isCompliant` می‌رسد و UI عبارت IEEE 80 compliance نشان می‌دهد؛ این معنی نباید برای site design استفاده شود.
- **PCC/grid:** توابع با assumptions/طیف ثابت screen هستند؛ آزمون واقعی grid-code/type-test یا measured harmonic data در این ممیزی وجود نداشت.
- **MPPT:** limits غایب در facade صریحاً unassessed و blocking هستند؛ estimated currents را نباید certification تلقی کرد.
- **Structural/geotech/seismic:** explicit unknowns در بیشتر نقاط حفاظتی مناسب‌اند؛ وجود seismic input به معنی انجام محاسبهٔ زلزله نیست.

## 4. Traceability matrix

| موضوع | ورودی → engine → مصرف‌کننده | تستی که در این نوبت اجرا شد | وضعیت شواهد |
|---|---|---|---|
| single-diode / golden | `goldenDatasets.ts` → `crossValidation.ts` → `singleDiodeModel.ts` → RFC report | `npm test`; default و customParams numerical probes | اجرای default با target pass؛ پارامترهای golden در live call حذف شده‌اند؛ fixture مستقل غایب |
| climate / provenance | NASA/PVGIS parser → `ExternalDataGateway` / `provenanceBuilder` → RFC + official report | `test:remediation` 74/74؛ `test:gateway` 24/24؛ synthetic provenance probe | fallback و field source معمولاً حفظ می‌شوند، اما `provider_derived` در provenance report به measured تبدیل می‌شود |
| MPPT / array | catalog module+inverter → `designPvArray` → sizing facade/App | core suite و coverage | guardهای unassessed/current موجود؛ دادهٔ واقعی datasheet هر پروژه نیازمند بررسی |
| PCC / harmonics | plant/grid assumptions → `harmonicsEngine` → grid tabs | core suite; source review | template/screening؛ independent grid reference اجرا نشد |
| MV short-circuit / earthing | grid, transformer, cable, soil input → `designMvSubstation` → `MvSubstationTab` | numerical probe + route/source review | خروجی compliance بر مبنای simplification؛ برای طراحی نهایی کافی نیست |
| structure/geotech/seismic | climate/site fields → foundation/structural engine + contract → tab/report | `structure-verify.ts`: all variance assertions pass (offline analytical inputs); audit suite | وضعیت‌های pullout/borehole/seismic عمدتاً UNASSESSED؛ محاسبهٔ مستقل/PE انجام نشد |
| API/auth/production | Express middleware/routes → JSON snapshot / dist static | `start:prod`; HTTP statuses/headers; in-process HS256 token | protected project paths fail-closed without credentials; JWT expiry optional; endpoint policy/rate-control gaps |
| UI/build/CI | `App.tsx`, Vite, Docker, GitHub Actions | lint, production build, browser, smoke, coverage | build/pass موجود؛ chunks بزرگ و Docker context/data durability risk باز |

## 5. لاگ آزمون و نتایج قابل بازتولید

| فرمان/پروب | نتیجه | محدودیت |
|---|---|---|
| `npm run lint` | exit 0؛ client/node type-check سبز؛ ESLint صفر error و 95 warning | هشدارها عمدتاً `no-explicit-any` هستند. |
| `npm test` | exit 0؛ core suite و گزارش 6 benchmark/hub/BIPV tests PASS | PASS به‌تنهایی evidence مستقل نیست؛ warning مربوط به `shadingLifecycle` چاپ شد. |
| `npm run test:audit` | exit 0؛ R1–R11=85، Engineering Remediation=70، M01–M22=142، phase verification=56، F-04=233، geocode cache=4 checks PASS؛ help references نیز PASS | `ENOTDIR` persistenceها fixtureهای عمدی‌اند. M04 فایل Phoenix `.sam` را برای sensitivity test موقتاً rename/restore می‌کند؛ این suite را هم‌زمان با `npm test` در همان worktree اجرا نکنید (RA-15). |
| `npm run test:gateway` | 24/24 PASS | mock/synthetic Redis REST؛ Redis واقعی اجرا نشد؛ lease-release warning ثبت شد. |
| `npm run test:smoke` | 5/5 PASS | smoke محدود به user flows. |
| `BROWSER_TEST_TIMEOUT_MS=240000 npm run test:browser` | تمام regressionهای چاپ‌شده PASS؛ exit 0 | `ERR_INTERNET_DISCONNECTED` و `ERR_FAILED` برای منابع بیرونی، و CSP meta warning؛ دسترسی بیرونی در sandbox برقرار نبود. |
| `npm run build` و `npm run start:prod` | build exit 0؛ static shell و local API بالا آمدند روی port 3137؛ process متوقف شد | Vite chunk/import warnings ثبت شدند. دادهٔ DB روی مسیر آزمایشی `/tmp` بود و secret واقعی استفاده نشد. |
| HTTP production local | `/` 200؛ health/security headers درست؛ GET projects و quick-size بدون auth 401؛ invalid coords 400؛ unknown API JSON 404؛ malformed JSON 400 | `/sync/push` معتبرشکل‌گرفته ولی بی‌هویت رد شد (0 processed، status 400)؛ empty batch 200/no-op؛ stateless report بی‌هویت 200 و unreconciled. آزمون in-process مستقل برای static shell عمداً middleware static نداشت و `/` در همان harness 404 بود؛ اجرای واقعی `start:prod` `/` را 200 داد. |
| JWT probe | HS256 token امضاشدهٔ آزمایشی، بدون `exp/iat/aud/iss` در production-mode به `/api/v1/projects` status 200 داد | فقط با test-only secret تصادفی؛ token بدون secret را آزمایش/پذیرفته‌شده نشان نمی‌دهد. |
| `npm run test:remediation` | 74/74 PASS | regression/logic checks داخلی. |
| `npm run verify:exports` | DOCX/XLSX/JSON read-back و re-import: all PASS | صحت قالب/metadata، نه تأیید محتوای مهندسی. |
| `REAL_INTERNET=false npx tsx scripts/structure-verify.ts` | پنج سایت: input/output variance assertions PASS | داده‌ها local analytical/heuristic هستند؛ comments اسکریپت «live climate» می‌گوید، در این اجرای آفلاین live نبود. تنوع خروجی صحت خاک/سازه را ثابت نمی‌کند. |
| `REAL_INTERNET=false npx tsx scripts/financial-verify.ts` | mode assertions PASS؛ LCOEهای نمونه 0.0568/0.0940/0.1017 USD/kWh | inputs synthetic و single scenario؛ نه forecast/financing review. |
| `npm run test:coverage` | exit 0؛ core scope: 92.57% statements/lines, 66.08% branch, 76.34% functions | پوشش خط، مرجع فیزیکی یا صحت مهندسی نیست. `electricalSizingContract` 44.44% branch، `structuralContract` 47.61% branch. |
| `git diff --check` + check جداگانهٔ سند untracked | بدون whitespace error | تغییری از این بررسی‌ها در سورس تولید نشد. |

**اجرا‌نشده به‌علت نبود دسترسی/دادهٔ معتبر یا scope:** SAM واقعی، pvlib مرجع (در محیط نصب نبود)، APIهای NASA/PVGIS واقعی، Redis توزیع‌شده، API security test با identity provider واقعی و secret واقعی، مطالعهٔ ETAP/DIgSILENT، PE/engineer review، خاک/soil-resistivity measurement، pullout/borehole، دادهٔ site-specific و گزارش امضاشده. هیچ آزمونی به این موارد نسبت داده نمی‌شود.

## 6. تعیین‌تکلیف کامل رجیستر تاریخی A-01…A-84

پیوست [`RE-AUDIT-MATRIX-0a0adb6.fa.md`](RE-AUDIT-MATRIX-0a0adb6.fa.md) تمام 84 شناسه را روی snapshot جاری موردبه‌مورد adjudicate می‌کند: چه ادعایی همچنان برقرار است، چه چیزی با تغییر کد کهنه شده، کدام مسئله فقط تاحدی حل شده، و کجا داده/مرجع مستقل برای داوری لازم است. این جدول **ممیزی source/call-site/test روی همهٔ ادعاهاست**، نه ادعای 84 بازتولید عددی یا validation مستقل.

نمونه‌های مهم از نتیجهٔ تطبیق:
- A-03 (صفر تست HTTP) و A-06 (موتورهای یتیم) صورت مطلق‌شان کهنه است: اکنون تست HTTP و مصرف واقعی bay engine وجود دارد.
- A-12، A-34…A-37، A-45، A-52، A-56 و A-60 عمدتاً به‌واسطهٔ migration guards، قرارداد هندسه/زمان، clipping cap، MPPT gating و load-energy conservation اصلاح/محدود شده‌اند.
- A-04، A-15، A-27…A-28، A-38، A-41…A-44، A-46، A-64…A-65، A-75…A-77 و A-80 همچنان محدودیت یا wording risk دارند؛ خودگزارش‌بودن targets، screen-modelهای فیزیکی، برچسب‌های cosmetic و CSP/auth config باید قبل از ادعای طراحی/انتشار حرفه‌ای رفع یا آشکار شوند.
- ادعاهای عددی قدیمی که با input/reference حاضر بازاجرا نشدند «باگ جاری قطعی» اعلام نشده‌اند؛ جدول برای هر مورد دلیل این حکم را می‌دهد.

گزارش تاریخی تاریخ `2026-11-08` و شاخهٔ متفاوت `arena/4a520cea-solarpv-studio` دارد، درحالی‌که snapshot هدف این سند `0a0adb6…` و تاریخ مرجع محیط `2026-11-03` است؛ بنابراین صرف نقل نتیجهٔ آن به‌عنوان خطای جاری قابل قبول نیست.

## 7. پیشنهاد changelog و ترتیب اصلاح

**پیشنهاد متن changelog فقط پس از رفع واقعی، نه ثبت تغییر در این ممیزی:**
- «اصلاح برچسب confidence برای تفکیک دادهٔ provider/reanalysis از اندازه‌گیری میدانی.»
- «تغییر benchmarkهای single-diode و SAM/PVDAQ به مقایسه‌های internal-regression تا زمانی که fixture مستقلِ منشأدار وارد شود.»
- «برچسب‌گذاری صریح screening/UNASSESSED برای PCC، harmonic, earthing و structural/seismic outputs؛ افزودن قفل عدم ادعای compliance در نبود دادهٔ لازم.»
- «سخت‌گیری JWT (انقضای اجباری، issuer/audience policy) و production API rate limiting؛ افزودن Docker context exclusions و data persistence config.»
- تغییر محلی موجود `src/App.tsx`: افزودن dependencies دو assessment flag برای refresh شدن badge منو؛ هنوز commit/release نیست.

### گام‌های اولویت‌دار
1. **قبل از انتشار حرفه‌ای:** خنثی‌کردن واژه‌های `CROSS-VALIDATION`, `Field Measurement`, `SAM`, `Compliant IEEE 80` تا برآورده‌شدن معیار شواهد؛ حفظ `UNASSESSED` در report/export.
2. ساخت reference fixtures با provenance/version/hash، ورودی کامل، unit و tolerance؛ benchmark باید واقعاً پارامترهای ثبت‌شده را مصرف کند و از targetهای مستقل استفاده کند.
3. تصحیح taxonomy provenance و regression test در RFC UI، project provenance و DOCX/XLSX.
4. سیاست امنیت production: JWT claims/expiry، rate limiting، API route matrix، Docker `.dockerignore`, snapshot storage/backup.
5. پیوست matrix تعیین‌تکلیف A-01…A-84 این re-audit source-level را تکمیل کرده است؛ گام بعد برای موارد دارای برچسب «نیازمند مرجع بیرونی» تهیهٔ fixture مستقل/دادهٔ سایت و review عملکردی واقعی است. هیچ refactor عملکردی بدون trace/metric لازم نیست.

## 8. بستهٔ ارجاع به ممیز مستقل و release gate

**وضعیت sign-off شخص ثالث: در انتظار؛ در این کار انجام نشده است.** بستهٔ ارسال به PE/مهندس حفاظت و ارتینگ/ژئوتکنیک/متخصص اتصال شبکه باید شامل موارد زیر باشد:

- مختصات و elevation معتبر، adopted jurisdiction/code edition، site weather extremes و source/license/raw files؛ به‌تفکیک measured/reanalysis/derived/user input.
- برگه‌های datasheet و شناسه/نسخهٔ دقیق module/inverter/transformer/breaker؛ diode parameters همراه فایل مرجع و روش fit.
- `git commit` و نسخهٔ نرم‌افزار، inputs خام JSON، units، model version, exact command/environment، outputs خام و hashes.
- PVsyst/SAM/ETAP/DIgSILENT run files یا دست‌محاسبهٔ مستقل از نویسندهٔ نرم‌افزار، tolerance توافق‌شده پیش از آزمون، اختلاف‌ها و عدم قطعیت‌ها.
- soil resistivity layering، grid/electrode drawings، fault current split/clearing time, touch/step study; borehole/frost/pullout tests; structural drawings, wind/snow/seismic basis; utility interconnection requirements.
- نام، نقش و صلاحیت ممیز مستقل و محدودهٔ مسئولیت امضا. تا تکمیل این مدارک، همهٔ مهندسی‌های site-specific و bankability **در انتظار شخص ثالث** هستند.

### توصیه برحسب کاربرد
| کاربرد | توصیه |
|---|---|
| آموزش/نمونه‌سازی | قابل استفاده با هشدارهای مدل و داده، بدون ادعای انطباق. |
| screening مقدماتی | مشروط به افشای واضح estimates، provenance و `UNASSESSED`؛ برای ارتینگ/PCC/سازه از نتایج `isCompliant` به‌عنوان تأیید نهایی استفاده نشود. |
| طراحی حرفه‌ای تحت بازبینی | فقط ابزار کمکی غیرحاکم؛ هر رشته باید توسط مهندس ذی‌صلاح با ورودی محل‌محور بازبینی و تأیید شود. |
| تأمین مالی / bankability / permit / construction | بر پایهٔ نرم‌افزار به‌تنهایی غیرمجاز؛ نیازمند validation مستقل، دادهٔ site-specific و امضاهای مربوط است. |

## 9. وضعیت working tree در پایان ممیزی

Snapshot همچنان `0a0adb6d63f107a4c56b87270c8d97fc91a68c4d` روی شاخهٔ Arena فعال است. این ممیزی فایل اجرایی تازه‌ای جز اصلاح React dependency که در بخش RA-14 توضیح شد تغییر نداد؛ گزارش، matrix و plan فایل‌های مستنداتی محلی‌اند. هیچ commit/push/PR/release انجام نشده است. اجرای آزمون‌ها نیز هیچ دادهٔ پروژهٔ کاربر را تغییر نداد؛ production probe از مسیر `/tmp` جداگانه استفاده کرد. در دور نهایی، `npm test` و `npm run test:audit` پس از هم و متوالی پاس شدند؛ اجرای هم‌زمان‌شان به‌علت rename موقت fixture توسط M04 می‌تواند race کند (RA-15).
