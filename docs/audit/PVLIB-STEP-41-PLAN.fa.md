# برنامهٔ پیش از کد — مرحله۴۱، ورود اندازه‌گیری
2026-11-03؛ مبنا9ce257c؛ موتورهدف1.16.0؛ همانشاخه،بدونmerge.

درنقشه‌راه،۴۱measuredimports و۴۲overlapstatsجدا هستند. این مرحله ورود/حفظ/کنترل اندازه‌گیری و نمایش جفت‌ردیفِ هم‌زمان را تکمیل می‌کند؛ MBE/MAE/RMSE/کالیبراسیون و آمارهمپوشانی برای۴۲است. دادهٔعملیاتی ارائه‌نشده؛ fixtureمصنوعی شاهدنرم‌افزار است،نهfieldvalidation.

موجودی: request/result/bundle/archive/clone و sourceledger/report، rawweatherreceipt و importerصریح موجودند؛ دادهٔاندازه‌گیری مستقل وجودندارد. طراحی: measurementsاختیاری root،۱تا۴dataset باid/source/quality/sensorId، مختصات، modelPoint،unit،intervalMinutes وinterval_end/interval_meanصریح. نقاط قابلانتخاب: صادراتAC،وارداتشبکه،netgrid،DCترمینال،دمایسلولصفحهٔمرجع. W/kWیاdegCطبقpoint؛ انرژی/کنتورتجمعی/قرائت‌لحظه‌ای پذیرفتهنمی‌شود.

ردیف‌ها timestamp,value,qualityFlag,reason؛ missingفقطnull و دلیلصریح، excludedعددیبادلیل، validعددی؛ صفرواقعی گم‌شده نیست. فاصله‌هایخالی و ردیف‌هایبیروندوره حفظ می‌شوند، پرنمی‌شوند؛ همهرویgridUTCمطابقinterval مطالعه و مرتب/یکتا/حداکثر۳۶۶روز. سایتمطابق وintervalبرابر؛ noresampling/lag/shift/inference. حداکثر۱۷۵۶۸ردیفمجموع و۴dataset؛ سقف‌های۸/۱۶/۲۴/۶۴MiBقبلیحفظ.

CSVخام+SHAدرimportTraceنگهداریمی‌شود؛ hashتأییداصالتنیست. previewبدونapply،تأییدصریح،add-onlyid،حذفتأییدشده/restore،JSON/CSV/HTML،ledger وarchive/bundle/clone. مقادیراندازه‌گیری هرگزورودیفیزیک/دمایمدل/auxiliaryنمی‌شوند و درchildinverter/MPPTتکثیرنمی‌شوند. unavailablemodelpointبهصفر تبدیلنمی‌شود.

پژوهش: مرجعpinnedpvlib0.13.1 read_pvgis_hourlyقبلکدخواندهشد: data/metaوmappingنام‌ها به‌تنهایی اندازه‌گیریمیدانییاهمسانیboundary/واحد/semanticsرااثباتنمی‌کنند؛ PVGISمدل‌شده به‌عنوانmetermeasuredواردنمی‌شود. قرارداداینمرحله صریح است،نهproviderautodetection.
https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.iotools.read_pvgis_hourly.html

تستهدف: TS/Pythonparity،واحد/محدوده/علامت/null/quality/سایت/offset/گرید/duplicate،بیروندوره/شکاف/unavailable،receipt tamper/rehashedmismatch،عدماثررویsamples/summary/monthly،عدمchildduplication،archive/clone/bundle/report ومرورگرواقعیورودبد→اصلاح→preview→confirm→run→download→IDBreloadrestore،سپسfullsuiteوCIدقیقSHA.
