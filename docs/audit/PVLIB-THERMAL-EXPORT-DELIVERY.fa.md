# تحویل دو مرحله حرارت و صادرات — 1.4.0
تاریخ: 2026-11-03

## دامنه
۱. Faiman اختیاری با ضرایب صریح u0/u1 و تأیید ارتفاع باد ۱۰ متر، بدون تبدیل/پیش‌فرض تجهیز؛ SAPM قبلی حفظ و در این حالت غیرفعال.
۲. سقف ثابت صادرات AC پس از اینورتر، شامل صفر، تفکیک خروجی پیش از سقف و کاهش صادرات در sample/monthly/summary؛ بدون دوباره‌شماری clipping یا تلفات DC.

فرم، JSON سخت TS/Python، بازبینی هواشناسی، direct worker، نتیجه، IndexedDB restore، backup، CSV، گزارش و مانع مقایسه مدل ناسازگار متصل شدند. مدل‌ها و نسخه در manifest/capabilities ثبت می‌شوند. داده گمشده پر نمی‌شود و fallback مستقیم به screening اضافه نشده است.

## فایل‌های اصلی
- services/pvlib_study/worker.py: تمام عددیات جدید زیر هش worker، موتور 1.4.0.
- services/pvlib_study/tests/test_thermal_export.py: هشت آزمون مستقل جدید.
- src/studies/studyContract.ts و studyWorkflow.ts: قراردادها، حسابداری خروجی، آرشیو/گزارش.
- src/components/StudyBuilder.tsx و PvlibStudyPanel.tsx: ورود صریح و بازیابی/نمایش.
- src/server/pvlibStudy.ts: قابلیت‌ها و نسخه.
- scripts/test-{study-workflow,direct-pvlib-study,direct-pvlib-browser}.ts: اجرای عملی ترکیب کامل و خطاهای خروجی.
- docs/PVLIB-THERMAL-EXPORT.fa.md و طرح: منابع و راهنمای واحدها/محدودیت‌ها.

## شواهد محلی موفق
- Python: **47/47** (39 قبلی + 8 جدید).
- npm run lint: موفق، هشدارهای موجود بدون خطا؛ npm run build موفق.
- test:study:workflow، test:study و test:study:browser با Python واقعی موفق.
- npm test، PHYSICS_DIFF_BASE=39c5ada npm run test:audit و npm run test:browser موفق.
- git diff --check موفق.
- اجرای worker قدیمی 1.3.0 کنار worker جدید برای چهار حالت fixed/tracker/rows/diode بدون گزینه جدید: برابری دقیق samples/monthly/summary.
- مرجع حرارت مستقل: معادله Sandia PVPMC، نه صرفاً دوباره فراخوانی pvlib. مرجع سقف: SSC interconnection relation در حالت بدون load/storage.
- تست export cap فعال/صفر/غیرمحدودکننده؛ حفظ DC؛ تراز انرژی؛ نیم‌ساعت با offset و مرز UTC month؛ رد ورودی/دمای نامعتبر؛ غیرفعال بودن SAPM؛ ترکیب tracker+rows+diode؛ گزارش و restore.

در نخستین توسعه آزمون HTTP یک درخواست اضافی به سقف نرخ برخورد کرد (429). درخواست اضافی redundant حذف شد؛ محدودکننده تولید دست‌نخورده ماند و تست عملی دوباره موفق شد.

دروازه عمومی physics-reference فایل worker Python را به‌عنوان تغییر فرمول TypeScript تشخیص نمی‌دهد؛ pass آن به‌تنهایی شاهد مدل جدید نیست. شواهد عددی جدید در هشت آزمون مستقل worker و تست‌های integration هستند. هیچ استثنای hash یا literal masking اضافه نشده است.

## محدودیت و CI
Faiman proxy پایا cell/module است؛ ضرایب ۱۰ متر باید از منبع معتبر پروژه بیایند. ردیف دوطرفه حرارت کالیبره‌شده نیست. سقف صادرات تنها ایستا و بدون بار/باتری است؛ کنترل واقعی، پخش بار و بازخورد DC وجود ندارد. این تحویل mismatch/bypass، حفاظت، سازه یا کنترل باد/برف را کامل نمی‌کند. نه field validation، bankability، IEC conformity یا SAM equivalence. Docker آزموده نشده است.

CI برای SHA نهایی پس از commit/push دنبال می‌شود؛ شناسه و نتیجه دقیق در پیام تحویل اعلام می‌شود. این سند پیش از اجرای CI نوشته شده و به‌تنهایی گواه موفقیت CI نیست. هیچ merge به main مجاز/انجام‌شده نیست.
