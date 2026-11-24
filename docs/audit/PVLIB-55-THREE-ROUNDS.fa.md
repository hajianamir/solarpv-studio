# ثبت سه دور نهایی — مرحله۵۵ و رگرسیون کل برنامه
2026-11-03؛ شاخهarena/237e6ea2-solarpv-studio؛HEAD5438fb59f4bb5cde05c20818b780464e1fe28752.

این سند ازسه‌دوربازبینیجلسهٔمرحله۵۳جداست. این‌نوبتسه‌دوراجرایواقعیsuiteهاباrunner `scripts/run-final-validation.py --round N` انجام می‌شود. هرroundهمهٔ۱۶suiteراتابانتهااجرامی‌کندحتیاگرsuiteقبلیشکستبخورد. لاگ‌هاوفایلsummary.jsonدر `.cache/study-evidence/final-round-N/` هستند؛اینcacheمحلیاستونهartifactمتعهدبهGitیاCIremote.

## مجموعهٔ ثابت هر دور
researchPython؛productionPython؛integrateddualcontract/runtime؛studyworkflow۴۴–۴۷ومراحلقدیمی؛linttypeclient/node+ESLint؛build؛corebenchmarks؛HTTP/processواقعی؛مرورگرstudy+storage؛مرورگرintegratedcontract/archive؛مرورگرعمومیبرنامه؛readbackDOCX/XLSX/JSON؛smoke؛gateway؛remediation؛audit/formula/source/export/authgates.

## پیش از دورهای نهایی: عیوب و اصلاحات توسعه
- نخست fixtureدوورودی۸۸۰۰Wمجموعاًازdomain۱۲۰۰۰Wfitمرجعخارجشد ودرستردشد. به‌جایافزایشدامنه،هرinputبه۲string/۴۴۰۰Wمحدودشد؛فیت/workergateتضعیفنشد.
- TypeScriptdiagnosticsازنوعnumber|stringبود؛guardعددیfiniteصریحدرvalidatorاضافهشد،نهcastماسک‌کننده.
- readerپژوهش `parse_constant`داشتولی1e999ازمسیرparse_floatبهinfتبدیلمی‌شد؛readerباboundedreadوfiniteparse_floatسخت‌گیرشد. regressionاضافهشد.
- حالت‌هایinactivebusوall-darkدرSandia_multiقبل‌ازاجراصریحشدند:نبایدبه0/0 یا0*NaNتکیهکرد؛Vdcoصرفاًدرweightصفرقرارمی‌گیردوPntیک‌بار.

## دور۱ — تکمیل شد
**۱۶/۱۶suite PASS؛صفرsuiteشکست‌خورده**. ۵۷تستresearch،۱۵۸تستproduction،matrixقدیمی۸۱۹۲وmatrixجدید۱۶با۴runtimeموفق؛مرورگرهایواقعیوباینریexportهمموفق.
کدsnapshotSHA256: `b709d77ce281e1fe4bb5b7bdeb7b6e126003ed79986aafd131aa3611631ba80f`.
Lint:۰error و۹۵warningقدیمی؛buildهشدارchunkبزرگدارد. تستofflineعمداًrequestهایشبکهراabortمی‌کندوبرخیconsoleERR_FAILEDموردانتظارند؛suiteموفقاست. «PASS»معادلzero-warningیااعتبارمیداننیست.

## اصلاح بین دور۱ و۲
بازبینیI/Oیکنقصپوششرا مشخصکرد:حدresultبرserializedcompactکنترلشدهبودولیCLIخروجیprettyمی‌نوشت؛همچنینwrite_textدرخطایI/Oمی‌توانستفایلقدیمیراخرابکند. خروجیintegratedاکنونcompactوبامحاسبهٔbyteواقعیUTF-8محدوداست؛تمامCLIهایresearchازtempهمان‌دایرکتوری+fsync+atomicreplaceاستفادهمی‌کنند. تستمستقلbudgetfailure/renamefailure/UTF8/tempcleanupحفظفایلقدیماضافهشد؛تعدادresearchبه۵۸رسید. موفقیتدور۱به‌جایآزموناین‌اصلاحگزارشنمی‌شود.

## دور۲ — تکمیل شد
**۱۶/۱۶suite PASS؛صفرsuiteشکست‌خورده**. ۵۸تستresearchباregressionنوشتناتمیک،۱۵۸تستproduction،matrixها،HTTP/browser/storage/export/workflow/lint/build/auditهمموفق.
کدsnapshotSHA256: `177524e2f82e85533d1553bb541e53ff1035a2c1452c8ceb8003658acfd98b16`.

## اصلاح بین دور۲ و۳ — نقص مرزی بازتولیدشده
آزمون دستی افزوده باinputs=[] نشان داد ZodپسازخطایminlengthهمsuperRefineرااجرامی‌کرد وsafeParseبه‌جایsuccess=false،TypeErrorرویinputs[0].requestمی‌داد (exit2واقعی). guardطولآرایهقبلازدسترسیاضافهشد؛regressionبرای۰،۱و۵ورودیباassert.doesNotThrowوسپسردقرارداداضافهشد. هیچترکیبفیزیکی/سقفمنبعیبرایرفعاینخطابازنشده‌است.

## دور۳ — تکمیل شد
**۱۶/۱۶ suite PASS؛ صفر suite شکست‌خورده**. ۵۸ تست research و۱۵۸ تست production موفق؛ matrix جدید با guard ورودی خالی/یک/پنج نیز موفق شد. همهٔ workflow، lint/types، build، benchmark، HTTP، مرورگرهای واقعی، storage و export، gateway، remediation و audit مجدداً اجرا شدند.
کد snapshot SHA256: `fb63295033b3b01aaf45befdc6d7b72d27d98436ed966adb79a2f84692522b30`؛ پس از تست، همین hash دوباره محاسبه شد و کد تغییر نکرده بود. evidence پایدار سه دور و hash لاگ‌ها در `PVLIB-55-VALIDATION-EVIDENCE.json` ذخیره شد.
مدت suiteها در دور۱:۳۳۶٫۵۷ثانیه؛ دور۲:۳۳۶٫۸۷؛ دور۳:۳۲۶٫۵۴. هر سه دور واقعاً اجرا شدند؛ به‌دلیل اصلاحات میان دورها، این سه اجرای snapshot یکسان نیستند. تنها دور۳ شاهد اجرای کل نسخهٔ نهایی است.

## محدودیت‌ها
CIدقیقSHAWindows/Linux،پذیرشمهندسیومیدانیبااینrunهایdirty-working-treeجایگزیننمی‌شوند. ۹۵lintwarningقدیمیوباندل‌هایدرشت،debtمستندسازی‌شده‌اندنهصفرشدهمخفی؛پاکسازیگستردهٔtypeهایقدیمیبدونreproductionمجازبه‌عنوانرفعصوریعیوبانجامنشد. دامنهٔعمومیsuiteهاعمیقاستولیپوششهمهٔفضایپیوستهٔپارامترها،صدورگواهیایمنییاunitهایفیزیکیپروژهرااثباتنمی‌کند.
