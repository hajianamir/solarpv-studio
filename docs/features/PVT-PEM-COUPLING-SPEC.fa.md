# پذیرش C3 — اتصال الکتریکی صریح PV-T/PCM به PEM

زیرمجموعهٔ محدود یک‌طرفه، نه coupled thermal stack: kernel موجود pvt_pcm با properties/forcing اظهارشده اجرا می‌شود؛ electricalJm2 در هر interval، ضرب areaM2 و transferEfficiency و تقسیم intervalS تنها ورودی availableW PEM است. ورودی دستی records برای electrolyzer ممنوع است. interval و context زیرمدل‌ها با root باید یکسان باشد. grid از collector آمده و غایب/جابجا/تکراری پذیرفته نیست.

coarse/fine collector هرکدام به PEM مستقل با initial state یکسان داده شود؛ تفاوت H2 کل و tolerance صریح input گزارش شود. اگر gate collector شکست خورد خروجی coupled صادر نشود؛ اختلاف H2 بیشتر از tolerance، numericalGate=failed_refinement و هیچ adoption. tolerance H2 دقت فیزیکی یا calibration نیست. PEM interval-constant current است: availableW میانگین interval از انتگرال انرژی است، نه اثبات توان لحظه‌ای. startup و emergency ramp همان semantics موجود، بدون تغییر.

تراز مستقل: absorbed=collector storage+fluid+ambient+transfer loss+PEM auxiliary+startup+curtailment+chemical HHV+PEM heat؛ همه J، fluid/ambient/heat/storage می‌توانند منفی باشند و نیاز بیرونی را نشان دهند. گرمای PEM یا حرارت سیال به‌طور خودکار بازیافت/اعتباردهی نشود. H2/O2/water از Faraday زیرمدل موجود کنترل شود. این اتصال خالص‌انرژی بازده اقتصادی/annual yield نیست.

kernel/model مستقل فعلی تغییر نکند؛ فقط composition با قرارداد strict و flag PVT_PEM_COUPLING_ENABLED default-off همراه پرچم پایهٔ research، نه الزام scienceC یا runtime اختیاری reference. API احراز هویت‌شده، SDK/editor،auth/rollback/tamper/browser و کل regression لازم‌اند. واحد kg-H2،J،W،m²؛منشأ و محدودیت‌ها در نتیجه. هیچ دادهٔ تجربی جدید از این ترکیب ایجاد نمی‌شود و اجرای synthetic oracle به‌جای آزمایش coupled دستگاه معرفی نشود.
