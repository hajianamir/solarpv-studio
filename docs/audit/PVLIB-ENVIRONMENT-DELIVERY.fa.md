# تحویل سه مرحله محیط تابش — موتور1.8.0
تاریخ: 2026-11-03

## سه مرحله تکمیل‌شده
۱. horizonProfile با provenance، profile بسته مرتب0..360 و interpolation خطی؛ ماسک beam-only پس از transposition با apparent solar elevation. فقط isolated fixed/tracker؛ horizon+infinite_sheds صریحاً رد می‌شود. diffuse/circumsolar و ground GHI تغییر نمی‌کنند؛ POA incident و thermal از حذف beam متأثر می‌شوند.
۲. soilingSchedule با نسبت عبور مستقل front/rear، کامل و هم‌تراز weather؛ بعد از IAM/وزن دوطرفه و پیش از spectral دقیقاً یکبار. thermal مستقل و clean row optical metrics حفظ می‌شوند. نه Kimber/HSU، برف یا مدل شستشو/انباشت.
۳. albedoSchedule کامل0..1، جایگزین scalar فقط با opt-in، به هر دو transposition isolated و infinite_sheds؛ usedAlbedo برای audit.

قرارداد کامل source/quality و UTC/offset برای هر برنامه؛ CSV ساده بدون quote، هیچ missing-fill، تبدیل واحد حدسی یا ساخت سری برای پروژه. max8784 records، خروجی فعلی16MiB حفظ و با fixture ترکیب کامل سنجیده شد. samples و monthly/summary دارای diagnostics تابش حذف‌شده و soiling هستند، نه DC/AC energy loss ادعایی.

فرم→review→اجرای Python→result/monthly→IndexedDB/backup restore→CSV/JSON/HTML report متصل؛ models/units/version/hash/capabilities و مانع مقایسه مدل ناسازگار ثبت شده‌اند. UI horizon restore نیز با backup واقعی آزمایش شد.

## منابع پیش از کد
API/galleries نسخه pvlib0.13.1 (horizon و ground diffuse) و مرجع مستقل Sandia PVPMC soiling خوانده و در PLAN ثبت شدند. تفاوت مهم با مثال horizon pvlib مستند است: مثال اصلی DNI/GHI را پیش از transposition عوض می‌کند؛ اینجا beam-only پس از transposition با diffuse/ground ثابت است و معادل کامل آن معرفی نمی‌شود.

## نتایج موفق محلی
- **91/91 Python**، شامل12 آزمون محیطی جدید: interpolation مستقل/مرز/سیم، beam-only و thermal closure، افق صفر و tracker+Perez، معادله مستقل albedo و حساسیت بازه‌ای/ردیفی، نسبت‌های مستقل soiling و rear غیرفعال، ترتیب قبل spectral و حرارت مستقل، شب و opacity صفر، دامنه/ورودی نامعتبر، UTC offsets و مرز ماه نیم‌ساعتی، ترکیب کامل8784بازه زیر16MiB.
- npm run lint: موفق با95هشدار قبلی بدون خطا؛ npm run build موفق.
- test:study:workflow، test:study و test:study:browser با Python واقعی موفق؛ ورود فرم و CSV، actual full-chain run، archive/result guards، restore/report و runtime outage بدون fallback.
- npm test، PHYSICS_DIFF_BASE=d5cafa4 npm run test:audit و npm run test:browser موفق.
- git diff --check موفق.
- worker قبلی1.7.0 و جدید کنارهم: samples/monthly/summary در9حالت fixed/tracker/rows/diode/faiman+export/sandia/optical/perez/plant بدون opt-in دقیقاً برابر.

داده fixture environment-reference-parameters.json فقط synthetic numerical test است، نه horizon survey یا داده پروژه. annual fixture تاریک صرفاً resource/output contract، نه تولید سالانه را می‌آزماید.

در توسعه integration، نسبت عبور صفر در fixture به spectralActive=0 و operatingVoltageV=0 منجر شد؛ assertionهای تاریخی «همه spectralFactor>0 / همه V درپنجره» به شرط وضعیت active/خاموشِ ازپیش‌تعریف‌شده قرارداد اصلاح شدند. هیچ zero-fill، پوشاندن خروجی نامعتبر یا تغییر مدل برای پاس‌کردن assertion اضافه نشد. خروجی واقعی و وضعیت خاموش مستقلاً در Python آزموده شدند. یک ویرایش خودکار اولیه در guard formatting متوقف شد؛ assertion نسخه قدیمیAPI سپس همگام شد؛ زنجیره کامل نهایی دوباره موفق اجرا شد.

دروازه عمومی physics-reference فرمول workerPython را پوشش نمی‌دهد؛ pass آن به‌تنهایی شاهد این مدل‌ها نیست. شواهد مستقل interpolation/هندسه، albedo equation و optical ratios در test_environment.py و integration هستند؛ هیچ hash/literal masking exception افزوده نشد.

## فایل‌ها و محدودیت
worker.py؛ test_environment.py و environment-reference-parameters.json؛ studyContract.ts/studyWorkflow.ts؛ StudyBuilder.tsx/PvlibStudyPanel.tsx؛ pvlibStudy.ts؛ سهscript workflow/API/browser؛ راهنمای docs/PVLIB-ENVIRONMENT.fa.md و لینک‌ها.

این توسعه full horizon/sky-view، soiling دینامیکی، برف، طیف بازتاب زمین، mismatch/bypass، حفاظت/کنترل واقعی، باد/برف یا سازه را کامل نمی‌کند. نه field validation/calibration/bankability/standards/SAM equivalence؛ Docker آزموده نشده است.

CI پس از commit/push برای SHA نهایی پیگیری و نتیجه/URL دقیق در پیام تحویل اعلام می‌شود. این سند پیش از CI نوشته شده و خود گواه CI نیست. کار روی شاخه session مانده و هیچ merge به main انجام نمی‌شود.
