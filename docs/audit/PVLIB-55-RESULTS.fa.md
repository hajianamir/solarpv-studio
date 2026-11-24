# مرحلهٔ۵۵ — تحویل نرم‌افزاری مشروط و سه دور تست
تاریخ2026-11-03؛ شاخه `arena/237e6ea2-solarpv-studio`؛ HEAD پایه `5438fb59f4bb5cde05c20818b780464e1fe28752`.

## نتیجهٔ صریح
یک adapter **جدید، opt-in و نسخه‌دار** برای ترکیب ورودی‌های مستقل DC با یک Sandia مشترک پیاده شد. این adapter از هندسهٔ ثابت/ترکر و دمای مدل‌شده/سلول وارداتیِ هر ورودی، در دامنهٔ موجود worker پشتیبانی می‌کند. قرارداد قدیمی StudyResultv1، ترکیب‌های مردود آن، caps، baseline، finance و fallback موجود دست‌نخورده‌اند.

این کار **تکمیل عملیاتی همهٔ مراحل نیست**: منابع خصوصی پروژه، داده‌های مستقل، ایمنی و qualifiedreview با اینترنت یا تست مصنوعی جایگزین نمی‌شوند. مدل‌های پژوهشی۵۰–۵۴ به‌صورت کور به yield وصل نشده‌اند؛ editor/APIعمومی برای schemaجدید تحویل نشده است. جدول دقیق موارد باز: `PVLIB-55-SOURCE-AND-BLOCKER-REGISTER.fa.md`.

## پژوهش قبل از کد
برنامه: `PVLIB-55-PLAN.fa.md`. سند نسخه‌دار pvlib۰٫۱۳٫۱sandia_multi و ModelChain مستقیم خوانده شد؛ metadataDTUv3 و چند دور جستجوی دقیق workbook/ارتفاعباد/مرجععدم‌قطعیت/داده‌هایSandia وIEA انجام شد. جستجو به مدرک نصب بادسنج DTU یا مدارک اختصاصی پروژه نرسید؛ شکست fetchPDFها و تفاوت searchsnippet با خواندن متن کامل ثبت شده‌اند. metadataفایل، گواهی دانلود/checksum محلی نیست. هیچ فایل عملیاتی یا مدرک ساختگی برای بستن گیت‌ها ساخته نشد.

## پیاده‌سازی۵۵
### ترکیب سازگار، نه گسترش کور قرارداد قدیمی
- `services/pvlib_research/integrated.py`: قرارداد `integrated-mppt-plan-v1`؛۲تا۴inputدارای StudyRequestمستقل، detailed-electricalوadditionalDcLoss=۰؛site/weatherدقیقاًیکسان.
- هرورودی در workerمستقیم/ایزولهٔ موجود حل می‌شود. Vترمینال و Pdcواقعیِ مدل وارد `pvlib.inverter.sandia_multi` می‌شوند؛ **ACمحاسبه‌شدهٔchildها استفاده یا جمع نمی‌شود**.
- startup/clipping/nighttare برای inverterمشترک یک‌بار؛all-darkصریحاً-Pnt؛busغیرفعال برای وزن صفر ازVdcoاستفاده می‌کند تا به0/0 یا0*NaNمتکی نباشد. این Vdcoاندازه‌گیری ولتاژ نیست.
- پنجرهٔ ولتاژ هرinputو totalDC در fitdomain اعلامی کنترل می‌شوند. خود اصالت fitdomain، ضرایب و تجهیزات احراز نمی‌شود.
- nestedMPPT/block،per-childSandia،ACplant/export/availability وmeasurementدرفضایترکیبجدید رد می‌شوند؛اثرآن‌ها نه پنهانی حذف و نه دوباره‌شماری می‌شود.
- هیچ افزایش caps: حداکثر۸۷۸۴input-intervalجمع؛plan≤۸MiB؛result≤۳۲MiB؛workerstdoutباcaptureدیسکی/poll وstderr≤۶۴KiB؛deadlineکل،kill/wait وcancelبدونfallback. این بودجهٔapplicationاست نهOSdiskquota.
- نتیجه شامل planکامل،PythoncanonicalUTF8/hash، نسخه، hashworker/requirements، childrequest/result/manifest، بودجه،samples وWhدوره است؛ نهannualization یا خروجی مالی/ایمنی.

### قرارداد دو زبان، archive و migration
- `src/studies/integratedStudy.ts`: قراردادTS/browser، بررسیbindingهرchildباvalidatorموجود، بازحساب مستقل Sandiaو همهٔsummaries درJS، archiveنسخه‌دارباchecksum/strictrestore.
- `migrateLegacyMppt` و `migrate_legacy` فقط migrationصریح/copy ازlegacyMPPTسازگار باinverterfitجدید؛ورودیقدیمیmutateنمی‌شود؛هرplant/measurementکهقراراستازبینبرود موجبردmigrationمی‌شود. تغییرمدلPVWattsبهSandiaعمداًخروجیACرامی‌تواندعوضکند.
- آرشیوجدیدبه‌اشتباهStudyResultقدیمی پذیرفتهنمی‌شود و oldarchiveخودکارrewriteنمی‌شود. hash/منشأ self-declared،اثباتاصالتنیست.
- Chromiumواقعاًکدbrowsercontract/archiveرا روینتیجهٔworkerواقعی اجرا می‌کند؛این تست،پنلeditorجدیدنیست.

### سخت‌گیری I/O مشترک پژوهش
- `strict_json`: boundedreadو ردJSONduplicate/NaN/Infinityو overflowمثل1e999؛نهبارگذاریاولیهٔفایلنامحدود.
- CLIنتیجه را باtempهمان‌دایرکتوری،flush/fsyncوatomicreplaceمی‌نویسد؛بودجه/renamefailureفایلپیشینراخرابنمی‌کند؛tempپاکمی‌شود. خروجیintegratedcompactاست تاحجمprettyازbudgetفراترنرود.
- فایلقدیمیپسازشکست،نتیجهٔاجرایجدیدنیست؛exitcodeوreceiptبایدبررسیشوند.

## عیوب پیدا و رفع‌شده
۱. fixtureاولدوinput۸۸۰۰Wازdomainpowerمرجعفراتررفت؛gateصحیحردکرد. fixtureبه۲string/۴۴۰۰Wبرایهرinputاصلاحشد؛domainفیتیاworkerتضعیفنشد.
۲. فیلدdiagnosticقدیمیTypeScriptازنوعnumber|stringبود؛guardعددیfiniteاضافهشد،نهcastپنهان‌کننده.
۳. حفرهٔخواندنJSONعدد1e999بستهشد وregressionدارد.
۴. خروجیprettyدرمقابلbudgetcompactوwriteغیراتمیکبیندور۱و۲رفعشد؛تستbytebudget/renamefailure/UTF8/tempcleanupاضافهشد.
۵. **عیب واقعی مرزی بین دور۲و۳**: safeParseباinputs=[]بهTypeErrorرویinputs[0].requestمی‌رسید. باexit2بازتولیدشد؛guardطولآرایهوموارد۰/۱/۵ورودیباassert.doesNotThrowوردschemaاضافهشد. هیچ‌دامنهٔفیزیکیبرایPASSبازنشد.

## سه دور کامل نهایی
جزئیات، snapshot و ترتیب اصلاحات در `PVLIB-55-THREE-ROUNDS.fa.md` است؛ evidence هر سه دور با exit code، مدت و hash لاگ‌ها در `PVLIB-55-VALIDATION-EVIDENCE.json` ثبت شد. سه دور با اصلاحات بین دورها اجرا شدند، نه سه اجرای یک snapshot واحد. hash کد پس از دور سوم دوباره محاسبه و ثابت‌ماندن آن تأیید شد: `fb63295033b3b01aaf45befdc6d7b72d27d98436ed966adb79a2f84692522b30`.

|دور|suiteهایconfigured|researchPython|productionPython|وضعیت|
|---|---:|---:|---:|---|
|۱|۱۶|۵۷PASS|۱۵۸PASS|۱۶/۱۶PASS|
|۲|۱۶|۵۸PASS|۱۵۸PASS|۱۶/۱۶PASS|
|۳|۱۶|۵۸PASS|۱۵۸PASS|۱۶/۱۶PASS|

هرroundهمهٔsuiteهارابدونshortcircuitاجرارامی‌کند: Pythonقدیم/جدید،matrixجدید،workflowمراحلقبل،lint/types،build،corebenchmark،HTTP/process،study/storagebrowser،integratedbrowser،browserعمومی،DOCX/XLSX/JSONreadback،smoke،gateway،remediation،audit/formulagates. تست‌های قدیمی به‌جایاجرای تازه گزارش نشده‌اند.

matrixقدیمی۸۱۹۲قرارداد:۴۳۵۲رد،۱۶runtime،۳۸۲۴contract-only. matrixجدید۵۵: **۱۶حالت،۱۲رد و۴اجرایواقعیِدوworker؛صفرcontract-only**. اینmatrixکوچک،پوششهمهٔدامنه‌هایپیوستهیاتمامترکیب‌هاینیروگاهراادعانمی‌کند.

regressionهایجدید: oracleمستقلPythonوJSبرایpower-weightedSandia؛حساسیتولتاژ/دامنه،tareیک‌بار/clippingمشترک،importedcellوtracker،migrationimmutable،archive/tamper/lengthbinding،timeout/kill/cancel/outputbounds،JSONoverflowوatomicI/O. oracleهاalgorithm/equationwitnessهستندنهشواهدعملکردواقعی.

### اخطارهای باز
Lintبا۰errorاما **۹۵warningقدیمی** تمام شد؛buildهشدارchunkبزرگ دارد. این‌هاپنهانیاzero-warningنامیده‌نشدند. browserofflineبرخیrequestهاراعمدیabortمی‌کند؛ERR_FAILEDآنهاموردانتظارsuiteاست،نهخطایجدیدمحاسبات. پاکسازیبی‌مدرکهمهٔtypeهایقدیمییاافزایشthresholdبرایسبزشدنانجامنشد.

## اجرای نمونهٔ عملی CLI — فقط synthetic
ورودی: `docs/examples/research/integrated-synthetic-plan.json`؛نتیجه: `docs/audit/PVLIB-55-SYNTHETIC-RESULT.json`.
دوinput۴۴۰۰Wباelectricalمستقل،یکیfixedودومیtracker؛دمایسلولوارداتی۳۵/۴۰°Cصریحاًمصنوعی؛۶intervalیک‌ساعته،یکیباirradianceصفر. این‌هادادهٔعملیاتییااندازه‌گیریواقعینیستند.
- childsolves=۲،inputintervals=۱۲.
- DCدوره:36114.244333838Wh.
- ACصادراتی:35340.042036322Wh.
- مصرفداخلیinverter:2.4Wh،یک‌بار نه4.8.
- خالص:35337.642036322Wh.

فرمان: `python -m services.pvlib_research integrated --plan docs/examples/research/integrated-synthetic-plan.json --output .cache/thermal-research/integrated.json --timeout-s 120`؛باPythonمحیطpinned.

## Git و CI
تمامکاررویهمانشاخهانجامشد؛تغییراتقبلیحفظوstage/commit/push/mergeنشدند. بنابراینHEADبالاهویتنقطهٔپایه است،نهcommittedSHAتمامکداینتحویل. runnerبرایهرroundhashsnapshotکدdirtyراهمنگه‌می‌دارد.

`.github/workflows/ci.yml` برایPythonresearch،dualcontract/archive/migration وintegratedbrowser درLinux/Windowsبه‌روزشده است. **پیکربندیCIبااجرایCIبرابرنیست**؛runremoteدقیقSHAوWindowsواقعیاین‌نوبتاجرانشدهوPASSادعانمی‌شود.

## نهایی‌سازی مشروط
بستهٔنرم‌افزاریجدیدوتست‌هاتحویل‌شدنی‌اند؛اما«همهٔمواردباقی‌ماندهٔپروژهتمامشد»صحیحنیست. اصلXLSX/ارتفاعباد/حسگر/پروتکل/تاریخچهٔمنبع‌دار/سازنده/کنترلر/survey/wiringواقعی،qualifiedreview،CIremoteومحدودیت‌هایفیزیکیثبت‌شدهبازند. همهٔخروجی‌هاnot_field_validated/projectblockedمی‌مانند؛هیچادعایbankable،SAMgrade،IECcompliance،ایمنییاP90واقعیپروژهاضافهنشد.
