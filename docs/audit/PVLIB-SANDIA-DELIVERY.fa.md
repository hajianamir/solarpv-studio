# تحویل اینورتر Sandia — موتور 1.5.0
تاریخ: 2026-11-03

## تکمیل‌شده
مدل AC وابسته به ولتاژ با ۹ پارامتر Sandia و ۳ فیلد دامنهٔ معتبر اعلامی، فقط همراه De Soto و additionalDcLossPct=0. منع دامنه نامعتبر، A<=B یا B<0، توان عملی خارج دامنه، خروجی غیرمتناهی یا AC بیش از DC. clipping طبق pvlib 0.13.1؛ شرط startup دقیق Pdc<Pso، شب −Pnt بدون extrapolation در ولتاژ صفر. PVWatts اینورتر در این حالت اجرا نمی‌شود.

مصرف وارداتی اینورتر جدا از صادرات غیرمنفی و netGridWh signed، پیش/پس از سقف صحیح ثبت می‌شود. فرم، بازبینی، اجرا، آرشیو/restore، backup، CSV/JSON، گزارش و خروجی دوره/ماه متصل‌اند. مدل‌های AC متفاوت خودکار مقایسه نمی‌شوند. نسخه/هش‌های شناسنامه و قابلیت‌ها به‌روزند.

## پژوهش و شواهد
پیش از کد، API و سورس رسمی pvlib 0.13.1 و معادله مستقل Sandia PVPMC خوانده و در PVLIB-SANDIA-PLAN.fa.md ثبت شد. نه‌ضریب fixture از CEC bundle نصب‌شده گرفته شد؛ دامنه‌های fixture فرض عددی آزمون‌اند، نه مشخصات تأییدشده تجهیز.

آزمون‌های محلی موفق:
- Python **56/56**، شامل ۹ آزمون Sandia جدید: معادله مستقل، ولتاژ، شاهد حساسیت تک‌تک ضرایب، startup دقیق، clipping، شب و صفر صادرات، دامنه/برازش نامعتبر، غیرفعال بودن eta و منع دو بار اینورتر، ترکیب کامل و قرارداد ۸۷۸۴‌بازه‌ای زیر ۱۶MiB.
- npm run lint و npm run build: موفق؛ هشدارهای قبلی بدون خطا.
- test:study:workflow، test:study و test:study:browser با Python واقعی: موفق؛ ورود فرم، اجرا، IndexedDB reload/restore، backup/report و تغییر سناریو Sandia+Faiman+rows+tracker.
- npm test، PHYSICS_DIFF_BASE=9780b7d npm run test:audit و npm run test:browser موفق.
- git diff --check موفق.
- اجرای کنارهم worker قدیمی 1.4.0 و جدید: samples/monthly/summary در پنج حالت fixed/tracker/rows/diode/faiman+export بدون Sandia **دقیقاً برابر**.

خطای اولیه آزمون جمع ماهانه −14.399999999999999 در برابر −14.4 تنها ممیز شناور بود؛ assertion به مقایسه با دقت ممیز شناور اصلاح شد، هیچ گردکردن/اصلاح خروجی مدل اضافه نشد.

دروازه عمومی physics-reference تغییر فرمول worker Python را پوشش نمی‌دهد؛ pass آن به‌تنهایی شاهد مدل جدید نیست. معادله مستقل و حساسیت‌های ۹ ضریب در test_sandia.py شواهد جدید هستند. استثنای hash یا literal masking اضافه نشده است.

## فایل‌ها
worker.py و test_sandia.py + sandia-reference-parameters.json؛ studyContract.ts و studyWorkflow.ts؛ StudyBuilder.tsx و PvlibStudyPanel.tsx؛ pvlibStudy.ts؛ سه اسکریپت workflow/API/browser؛ راهنمای docs/PVLIB-SANDIA-INVERTER.fa.md و لینک‌های راهنماهای قبلی.

## محدودیت و CI
بدون افت ولتاژ کابل، چند MPPT مستقل، mismatch/bypass، کنترل/حفاظت واقعی، کنترل باد/برف، سازه، اثر دمای اینورتر و بار/باتری. نتایج synthetic/published-fixture تأیید میدانی، کالیبراسیون، بانکی یا معادل SAM نیستند؛ دامنه برازش پروژه باید مستند باشد. Docker آزموده نشده است.

CI پس از commit/push برای SHA دقیق دنبال می‌شود؛ نتیجه و URL در پیام تحویل خواهد آمد. این سند پیش از CI نوشته شده و به‌تنهایی گواه CI نیست. هیچ merge به main انجام نمی‌شود.
