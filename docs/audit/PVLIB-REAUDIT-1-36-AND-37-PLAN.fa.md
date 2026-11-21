# شروع بازبینی۱–۳۶ و مرحله۳۷
2026-11-03؛ شاخهarena/237e6ea2-solarpv-studio؛ baseline62679579e7926e8651d911a76583fa9d51788d13. ناتمام۳۱–۳۴ خارج ازcommit قبلی موجود است؛ به‌عنوان «تکمیل‌شده» معرفی نخواهد شد.

ترتیب: بازخوانی قرارداد وguardهایresult/archive، workerchain، metadataوclaims، CI/workflow/browser؛ بازتولید ایرادهای واقعی→تستfail→رفع→رگرسیون. موفقیت تست ادعای رفع همهٔخطاهای ممکن یا fieldvalidation نیست. پوشش بازبینی حوزه‌های API/process/auth، UTC/CSV، physics/combination، انرژی، provenance/library/restore و UI/report را تفکیک می‌کند؛۳۲/۳۴ هنوز قابلیت کامل نیستند، نه صرفاًbugnumerical.

پژوهش قبل از کدمرحله۳۷: pvlib0.13.1 inverter.sandia وinverter.pvwatts خوانده شد:
https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.inverter.sandia.html
https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.inverter.pvwatts.html
هرinverter منحنی/clipping خودش را دارد؛ Sandiaشب-Pntاست. توانهایsignedپس ازمدل هرinverterجمعمی‌شوند؛ مصرفداخلیgrossdiagnosticاست وپسازnettingنبایددوبارهکسرشود. فقطپسازجمعsigned، ACplant/aux/transformer/exportcap مشترک یک‌باراعمالمی‌شود.

طرح۳۷:۲تا۴block باid/provenance/system کامل مستقل برweather/site مشترک؛ سیستمبلوک ازقابلیت‌های قبلیازجملهMPPTمستقلوSandiaتبعیت می‌کند، nestingممنوع. downstreamplantفقطدرroot، additionalDcLossPct=0دراینvariantبرایجلوگیریازابهامaggregateDC. rootهندسه/حرارتrefdiagnosticاست، نهinverterمعادل. نتایجکاملchildren درblockResultsبرایهمهٔورودی‌هاوguardهایقبلی نگهداری؛reportوCSV/JSONاختصاصیهرblock، archive/bundle/restoreوcomparison. بودجه8784solvesمجموعblock×MPPT×interval؛ رشدخروجی16MiB آزموده/محدود. sourcequalityاعلام‌شده؛ بدونفرضولتاژمشترک، چندفاز/loadflow/ACcableیاcalibration.
