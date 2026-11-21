# تحویل ۳۰ گام ترکیبی — موتور 1.9.0
تاریخ: 2026-11-03. مبنا: f631f4d4499d6233e9949d59edb66212418590ca. مسیر ترکیبی صریحاً توسط کاربر انتخاب شد؛ PLAN پیش از کد ثبت شد.

## دامنهٔ تحویل
این تحویل **۳۰ گام پذیرش** است، نه۳۰مدل فیزیکی تازه. گام‌های۱تا۲۰ مدیریت کتابخانه/انتقال داده و۲۱تا۳۰ قرارداد، اجرای واقعی، UI، report/archive و شواهد دو opt-in حرارتی‌اند. جدول کامل شماره‌به‌شماره در docs/PVLIB-BALANCED-30.fa.md ثبت شده است.

### گام‌های۱تا۲۰: محصول و داده — تکمیل
- جستجو، inputs/results filter، active-site filter، sort سه‌حالته و pagination۱۰تایی.
- clone فقط request با label صریح و UUID/تاریخ تازه، result=null؛ بدون stale result/hash؛ منبع دست‌نخورده.
- per-entry archive/request/weather CSV؛ current request/weather export قبل یا بعد اجرا.
- selection حداکثر۲۰، clear و حذف گروهی atomic با تأیید؛ selection میان صفحه‌ها محفوظ و شناسه‌های حذف‌شده کنار گذاشته می‌شوند.
- bundle انتخابی با schema صریح و SHA256 sorted-key JSON محلی؛ digest نه امضای اصالت یا RFC8785/PROV.
- preflight بدون write و preview/لغو؛ رد duplicateID، tamper، unknown schema و limits؛ max۲۰snapshot/۶۴MiBbundle/۲۴MiBsnapshot/۸MiBrequest.
- import یک transaction با add-only؛ conflict موجود یا هم‌زمان/quota باعث rollback کامل؛ موفقیت فقط پس از oncomplete. overwrite یا ID regeneration خودکار نداریم.
- origin-wide storage estimate بدون capacity guarantee؛ تغییرات بین تب‌ها فقط notification همراه nonce موقت، بدون request/result/credential. پیام خودِ instance نادیده گرفته می‌شود تا مقایسهٔ خود کاربر بی‌دلیل پاک نشود؛ در تغییر تب دیگر مقایسه پاک و پیام صریح نمایش داده می‌شود. fallback فقط Refresh دستی، نه data fallback.

### گام‌های۲۱تا۲۵: PVsyst temperature — تکمیل
- strict source/quality، uc/uv/eta/absorptance صریح و windHeightM=10؛ بدون defaults/fitting/conversion.
- pvlib.temperature.pvsyst_cell روی thermalPOA موجود؛ eta حرارتی ثابت، نه coupled instantaneous DC efficiency.
- domain[-100,150]°C و max۸۷۸۴؛ incompatible با Faiman و explicit cell schedule.
- فرم/review/restore، provenance ledger، manifest/capabilities1.9.0، sampleCSV/JSON و HTML/مقایسه/explorer.
- guard نتیجه با arithmetic مستقل در TS و آزمون analytic/sensitivity/published/domain/rows/full-chain در Python.

### گام‌های۲۶تا۳۰: explicit cell temperature — تکمیل
- schedule کامل timestamp+cellTemperatureC[-100,150] با source/quality، CSV سخت و UTC/offset alignment؛ no fill/interpolation، max۸۷۸۴.
- اعمال دقیق دمای اعلام‌شده به‌جای thermal model؛ نه module-to-cell یا bias/lag conversion. retained SAPM و row thermal-input proxy برای دما inactive؛ optics/DC irradiation برقرار است.
- فرم/CSV/review/actualrun/restore/sourceledger و archive/result/report/CSV/JSON/comparison/diagnostics.
- نتیجه با schedule دقیقاً تطبیق داده می‌شود؛ zero/negative temperature واقعی پذیرفته، missing و دادهٔ نامعتبر رد می‌شوند.
- آزمون‌های مستقل، واقعی API/browser، محدودیت منابع، regressions و مسیر CI برای SHA نهایی.

## نتایج آزمون‌های محلی
- **101/101 Python موفق** (۱۰آزمون جدید حرارتی). معادلهٔ مستقل و حساسیت heat balance، مثال منتشرشده، zeroPOA=ambient، SAPM غیرفعال، row/tracker/diode/plant، DC تحلیلی دمای صریح، POA ثابت، UTC/invalid/domain/exclusivity/hot-output، ۸۷۸۴رکورد زیر۱۶MiB.
- `test:study:workflow` قبلی و جدید موفق؛ fixture checksum با Node SHA256 مستقل، canonical literal witness، limits واقعی۲۴و۶۴MiB، clone/no mutation/stale result، filtering/sort، weather zero/offset roundtrip، actual Python دو حالت، result corruption guards، archives/reports و model comparison barriers.
- `test:study` موفق؛ API capability جدید و نسخه1.9.0، auth/resource/error و actual Python حفظ شد.
- `test:study:browser` موفق؛ فرم واقعی هر دو حالت، اجرای Python، portable restore/report، exports ورودی؛۱۲snapshot مصنوعی برای search/status/site/sort/paging/clone/per-entry exports، checksum/preflight/no-write/conflict، selection/bundle/delete، storage estimate؛ screening unchanged.
- مرورگر واقعی مستقل storage نیز در همان script hook اجرا می‌شود: conflict در add دوم، quota در add دوم، خرابی delete دوم → rollback کامل، import/delete/reload durable، cross-tab positive و خودپیام negative. mock IndexedDB نیست؛ همان کد تولیدی با esbuild bundle می‌شود. esbuild0.28.2 از قبل transitive بود و اکنون فقط برای تست به‌صورت devDependency صریح/lock ثبت شد؛ runtime dependency جدید نیست.
- lint بدون خطا و با95هشدار موجود؛ build موفق.
- npm test، PHYSICS_DIFF_BASE=f631f4d npm run test:audit و npm run test:browser موفق.
- git diff --check موفق.
- worker1.8.0 و1.9.0 کنارهم: samples/summary/monthly در۱۰حالت fixed/tracker/rows/diode/faiman+export/sandia/optical/perez/plant/environment **دقیقاً برابر**؛ موقت baseline worker حذف شد. version/hash جدیدند، نه خروجی عددی در نبود opt-in.

## منابع پیش از کد
pvlib0.13.1 pvsyst_cell، MDN IDBTransaction.abort و SubtleCrypto.digest خوانده و در PLAN و راهنمای اصلی URL/کاربردشان ثبت شدند. ارجاع عددی independent heat equation در test_balanced_thermal.py است؛ pass دروازهٔ عمومی engine به‌تنهایی گواه worker یا TS formula جدید نیست. هیچ generic literal/hash masking exception اضافه نشد.

## خطاهای توسعه و اصلاح
- یک edit خودکار در قالب sourceLedger متوقف شد؛ فایل خوانده و همان تغییر هدفمند تکمیل شد؛ suppress/hash bypass نداشتیم.
- یک assertion ابتدا فرض کرد تغییر air temperature نباید DC را تغییر دهد. بازبینی callsite نشان داد air temperature به SPA refraction هم داده می‌شود، حتی با cell temperature صریح؛ بنابراین assertion نادرست بود. آزمون عدم اثر wind/SAPM بر cell schedule و DC با سایر ورودی‌های ثابت اصلاح، و مرز اثر air temperature در راهنما مستند شد. مدل برای پاس‌کردن assertion تغییر نکرد.
- checksum قبل از export روی payload JSON-normalized ساخته می‌شود تا optional undefinedهای JS که در JSON موجود نیستند، سبب self-mismatch نشوند؛ دادهٔ عملیاتی حذف/تخمین زده نمی‌شود.

## فایل‌ها و مرز اعتبار
worker.py و test_balanced_thermal.py؛ studyContract/studyWorkflow/studyInsights و server capabilities؛ studyExchange/studyLibrary؛ StudyLibraryTools/StudyLibrary/StudyBuilder/PvlibStudyPanel؛ balanced/storage/API/browser scripts و package/lock؛ راهنما و PLAN/DELIVERY و۳لینک راهنما.

هیچ field validation، sensor calibration، bankability، whole-PVsyst/SAM equivalence، transient thermal/protection یا تایید مستقل حرارتی bifacial نداریم. کیفیت/source ادعای کاربرند؛ checksum امضا نیست؛ storage محلی origin-shared و نه account/cloud-isolated است. Docker آزموده نشده است. critical missing weather/temp/fit تولید یا پر نمی‌شود؛ داده‌های مصنوعی صرفاً fixtureهای برچسب‌خوردهٔ تست‌اند.

این سند پیش از CI نوشته شده است. پس از selective commit/push، نتیجهٔ **exact-SHA** CI و URL در پیام تحویل اعلام می‌شود؛ این سند به‌تنهایی گواه CI نیست. شاخهٔ session حفظ شده و merge/main/history rewrite انجام نمی‌شود.
