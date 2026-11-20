# تحویل سه مرحله AC plant — موتور 1.7.0
تاریخ: 2026-11-03

## سه مرحلهٔ تحویل‌شده
۱. ترانسفورماتور همیشه متصل با تلفات بی‌باری/باری، حل پایدار معادله signed و محدودیت rating/PF=1؛ بدون overload simulation.
۲. مصرف کمکی مستقلِ دائمی روی باس LV، شب/روز و هنگام availability=0؛ جدا از مصرف داخلی Sandia.
۳. برنامهٔ صریح و کامل availability با provenance مستقل، timestamp هم‌تراز UTC و retained fraction؛ فقط تولید مثبت را کاهش می‌دهد و مدل قطع شبکه/خاموشی فیزیکی نیست.

ترتیب ثابت: signed inverter → availability positive-generation → LV auxiliary → energized transformer → import/export split → export cap. DC/MPPT بازحل نمی‌شوند. gridImportWh کل واردات است و netGridWh=acWh−gridImportWh؛ inverterSelfConsumptionWh فقط diagnostic است و دوباره کم نمی‌شود. بدون opt-in تمام خروجی عددی قبلی حفظ شده است.

فرم، CSV دو ستونی availability، review alignment، JSON سخت TS/Python، اجرا، نتیجه/ماه، archive/restore/backup، CSV/JSON و HTML report متصل‌اند. مدل‌ها، واحدها، سقف۸۷۸۴، نسخه و هش در manifest/capabilities ثبت می‌شوند. مدل‌های فعال ناسازگار خودکار مقایسه نمی‌شوند. داده/بازه گمشده پر نمی‌شود؛ fallback مستقیم به screening اضافه نشده است.

## منابع و شواهد
API/source pvlib transformer و SSC cmod_pvsamv1.cpp پیش از کد مطالعه و در PLAN ثبت شدند. مدل stable-root از معادله موازنه مشتق و با bisection مستقل residual و نقاط نامی/خروجی pvlib سنجیده شد؛ ترتیب و معنا دقیقاً در راهنما تعریف شده و ادعای معادل SAM ندارد. داده‌های fixture صرفاً synthetic آزمون و در UI خودکار پر نمی‌شوند.

نتایج موفق محلی:
- Python **79/79**: 67 قبلی +12 جدید. residual/bisection مستقل، حساسیت سه پارامتر، ll/nll صفر، مرز نامی signed، پارازیت شب و صفرصادرات، عدم دوباره‌شماری، availability مثبت/منفی، حفظ DC/حرارت، هر جزء مستقل و ترکیب کامل، قرارداد UTC/offset، CSV/داده ناقص، نیم‌ساعت مرز ماه، ۸۷۸۴ رکورد زیر۱۶MiB.
- npm run lint: موفق با 95 هشدار قبلی، بدون خطا؛ npm run build موفق.
- test:study:workflow، test:study و test:study:browser با Python واقعی موفق. فرم/برنامه CSV، full physical/spectral/rows/tracker/Sandia + AC plant، import accounting، reload/restore/report، خطای runtime بدون fallback و استقلال waterfall آزموده شد.
- npm test، PHYSICS_DIFF_BASE=b5f1751 npm run test:audit و npm run test:browser موفق.
- git diff --check موفق.
- worker قبلی 1.6.0 و جدید کنارهم برای هشت حالت fixed/tracker/rows/diode/faiman+export/sandia/optical/perez: samples/monthly/summary دقیقاً برابر، بدون opt-in.

آزمون اولیه CSV انتظار رد یک newline نهایی داشت؛ parser مانند قرارداد weather یک newline پایانی را مجاز می‌داند. fixture خطای blank row به دو newline تغییر کرد؛ پذیرش ردیف ناقص یا fill اضافه نشد. typecheck یک annotation ضمنی any در script جدید گزارش کرد که با نوع صریح رکورد اصلاح شد.

دروازهٔ عمومی physics-reference فرمول worker Python را پوشش نمی‌دهد؛ pass آن شاهد کافی مدل جدید نیست. شواهد عددی جدید در test_ac_plant.py و حسابداری integration هستند. استثنای hash یا literal masking افزوده نشد.

## فایل‌ها و وضعیت مخزن
worker.py؛ test_ac_plant.py + ac-plant-reference-parameters.json؛ studyContract.ts/studyWorkflow.ts؛ StudyBuilder.tsx/PvlibStudyPanel.tsx؛ pvlibStudy.ts؛ سه script workflow/API/browser؛ راهنمای docs/PVLIB-AC-PLANT.fa.md و لینک‌های مرتبط.

شروع workspace از نظر metadata به base برگشته بود ولی تمام ۵۵ مسیر تغییرات تحویل قبلی دقیقاً با remote b5f1751 برابر بودند. پس از بررسی ancestor، فقط ref و index به همان descendant fast-forward شد؛ هیچ فایل یا تاریخچه remote بازنویسی نشد. شرح در PLAN ثبت است. توسعه روی شاخه همان session باقی ماند.

## محدودیت و CI
نه مطالعه میدانی/کالیبراسیون/بانکی/انطباق استاندارد یا SAM equivalence. availability این نسخه outage نیست؛ ترانس PF=1 و دائم‌وصل، auxiliary ثابت؛ بدون شبکه/باتری/بار متغیر/کنترل حفاظتی/موتور tracker/سازه/باد/برف. Docker آزموده نشده است.

CI پس از commit/push برای SHA دقیق دنبال می‌شود؛ نتیجه و URL در پیام تحویل اعلام می‌شود. این سند پیش از CI نوشته شده و به‌تنهایی گواه CI نیست. هیچ merge به main انجام نمی‌شود.
