# تحویل ده مرحله بازبینی نتیجه — study-explorer-v1
تاریخ2026-11-03؛ مبنا1357825836df5e4046f188308fff1a4c67c6f34d.

## ده مرحلهٔ کامل
۱. daily UTC انرژی/تابش از sample×dt، روزmidpoint، بدون fill یا annualization.
۲. range Z/offset معتبر در دوره فایل، midpoint در[start,end)، whole interval بدون prorating، انتخاب خالی null نه صفر؛ selectedJSON/dailyCSV/sampleCSV/HTML مستقل و settingsمحلی قابل reset.
۳. peaks DC/AC و import/net signed اگرمدل دارد، اولینtie و زمانmidpoint/end؛ interval-mean نه instantaneous/hardware peaks.
۴. min/max/mean دمای مدل‌شده و ساعات strict>threshold اختیاری[-100,200]، defaultnull؛ بدون safety/damage/lifetime claim.
۵. cap-loss event count/hours/longest/max5examples و lossWh؛ threshold1e-6W، capصفر آزموده؛ نه upstream clipping یا dispatch.
۶. هر۵state MPPT مدل موجود با count/hours/dcWh/constraintLossWh؛ عدموجودfeature unavailable، نه downtime واقعی.
۷. theta statistics و active/parked hours، active-adjacent total/max steps وpairs؛ بدونbridgepark/night/selection، نهwear/stow/speed/سازه.
۸. آمار applied albedo/SR، rearغیرفعال صریح، horizon blockedpositivebeam hours وlossWhm²؛ نه DC/ACenergyloss.
۹. components انرژی الکتریکی و residual/tolerance حسابداری net/cap/DC/plant؛ lossتابشیWh/m² صریحاً از componentsWh فیلتر و با تست محافظت شده؛ selfconsumptionدوباره کم نشده، importbaselineبدونمدل unavailable.
۱۰. inputdiff compatible scenarios شاملscalarleaf/arraylength/presence، max100UI وJSONکامل؛ inactiveinputsهمنمایان، نهattribution/normalization؛ gate/whitelistقبلیعیناًحفظ.

## اتصال گردش کار
actualPython→result explorer→daily/selectedJSON/CSV/HTML، mainHTMLfullperiod+comparisondiff، IndexedDB/portablearchive restore وresetنمایش، خطایevidenceناقصقبلrenderوعدمcrash؛ sampleJSONاصل، archive/requestschema وworker/requirements تغییرنکرده‌اند. موتور1.8.0 وstudy-insights-v1ثابت‌اند؛ این ده ابزار مدل فیزیکی جدید نیستند. ورودی/خروجی عددی Python بازنویسی نمی‌شود.

## فایل‌ها
studyExplorer.ts (محاسبهread-only، selection، validation، exporters/diff)؛ StudyExplorer.tsx (UI)؛ StudyLibrary/PvlibStudyPanel/studyWorkflow (اتصالreport/compare/validation)؛ test-study-explorer.ts وbrowser script وpackage workflow hook؛ راهنماPVLIB-EXPLORER-TEN.fa.md ودوlink؛ PLANواینDELIVERY.

## منابع پیش از کد
pvlib0.13.1 singleaxis، inverter.pvwatts، temperature.sapm_cell خوانده وURL/معنی/محدودیت درPLANثبت شدند. daily/selection/diff/accounting ازقراردادworkerوarithmeticشفاف‌اند؛ نهفرمولفیزیکی تازه. RFC4180/PROVقبلاًخوانده‌شده باهمانمرزمعناحفظ‌اند.

## شواهد موفق
- lint بدونخطا،95هشدارقبلی؛ build موفق.
- **91/91Python** baseline موفق، بدونتغییرworker.
- test:study:workflow قدیمی+insights+explorer موفق. تستمستقل جدید: arithmeticنیم‌ساعتی/مرزروزکبیسه/offset، rangeنیمه‌باز/خالی/نامعتبر، peak/tie، thresholdstrict، caprun/max5/thresholdریز،۵MPPTstate، trackerعدمbridgepark، environment، balance sensitivity برایDC/plant/cap، diffpath/length/presence، CSVreadback، HTML/formulaguard، عدمmutation وarchive.
- actualPython درتست جدید: baseline، زمان .123→.123000، fullchain diode+Sandia+plant+tracker+rows+environment، capصفر، Sandiaشب import-only بدونplant، افقisolated؛ انتگرال‌ها با summaryواقعی تطبیق داده شدند.
- resourcefixture17568sample:366روز و8784ساعت، تحلیلزیر1MiB وdiffidentical خالی؛ این فقط workload/حسابداری است، نهyieldسالانه.
- test:study API/auth/actualPython/resource/error موفق.
- test:study:browser بابرنامهPythonواقعی: daily/selectedCSV/JSON/HTMLدانلودوخواندنعددی، یکsample/empty/invalidrange، threshold، peak/MPPT/cap/environment/balance، trackeractive، diffinputs، mainreport، reload/restore وviewsettingsreset؛ malformedarchiveبدونcellTempردونتیجهفعلیحفظ؛ screeningunchanged وpageerrorsخالی. چند اجرای نهایی موفق.
- npmtest، PHYSICS_DIFF_BASE=1357825 npm run test:audit وtest:browser موفق؛ diff--check موفق.

## خطاهای توسعه و رفع/مرز شواهد
- ابتداستونsampleموهومیmpptConstraintLossWانتظاررفتهبود؛ قراردادworkerبازخوانی،ازmax(0,arrayMppW−dcBeforeAdditionalLossW) باهمانroundofftoleranceموجود مشتق شد. اختلافبزرگ رد؛ numericalroundoffکوچک مطابقworker؛ exportستونderivedنیزباCSVreadbackاصلاحشد. هیچداده‌سازییاlossپنهاناضافهنشد.
- Typecheckدسترسیstatاختیاریبهnarrowingصریحنیازداشت؛ بدونany/suppressرفعشد.
- fixturearithmeticdiffکهcapرااضافهکردهولیsampleمتناظرنداشتازfixtureHTMLجداشد؛ مدلبرایپاسکردنتستتغییرنکرد.
- مرورگرابتدابهbuttonداخلdetailsبستهclickکردهوتایم‌اوتشد؛ تستاکنونsummaryرابازمی‌کند. یکبارنیزانتظارنتیجهٔ اجرای دومبدونعلتقطعیثبت‌شدهtimeoutشد؛ diagnosticalert/pageerror/serverlogبهfailureاضافهشدوتکرارهایبعدیونهاییهمگیموفق‌اند؛ علتآنبارقطعیادعانمی‌شود.
- بررسیfractionalsecondsمرزواقعیdatetimePythonشش‌رقمیراآشکارکرد؛ .123000پشتیبانیوباآزموناجراییسنجیدهشد،دقتزیرمیلی‌ثانیهردمی‌شودنهtruncate.

دروازهعمومیphysics-reference محاسباتجدیدexplorerراگواهینمی‌کند؛ passآنصرفاًعدم‌تغییرengineمنتخبرا نشانمی‌دهد. شواهدarithmeticمستقل،sensitivity،Pythonintegrationوbrowserreadbackبرایابزارجدیدوجوددارد؛ نهliteral/hashmaskingexception.

نهfieldvalidation/calibration/bankability/استانداردحفاظت/QC/SAMequivalence/مدلعمرtracker؛ Dockerآزموده‌نشده. SHA/URL/statusCIنهاییپسازselectivecommit/pushدرپیامتحویلاعلاممی‌شود؛ اینسندقبلCIاستونهگواهCI. شاخهsessionحفظ،بدونmerge/main/historyrewrite.
