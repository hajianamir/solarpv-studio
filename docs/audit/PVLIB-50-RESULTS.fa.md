# مرحله۵۰ — تحویل پژوهشی و تست
تاریخ2026-11-03؛ شاخهarena/237e6ea2-solarpv-studio؛ HEADپایه5438fb59f4bb5cde05c20818b780464e1fe28752. commit/push/CIجدید انجام نشده است. تغییرات قدیمی working tree حفظ شدند.

## دامنه و وضعیت
مطابق برنامه پیش از کد `PVLIB-50-PLAN.fa.md`، مدل مستقل AC snapshot شعاعی سه‌فاز متعادل با slack ثابت، بار ثابتPQ و امپدانس سری هر فاز اضافه شد. مرجع بررسی‌شده: [MATPOWER بخش4.3.2 معادلات4.16–4.19](https://matpower.app/manual/matpower/DistributionPowerFlow.html). تأیید مهندسی دامنه پروژه دریافت نشده؛ این اجرای آزمایشی جای آن نیست. **مرحله۵۰ برای کاربرد واقعی complete نیست** و همواره conditional_assumptions / projectApproval=blocked باقی می‌ماند.

## پیاده‌سازی
- `services/pvlib_research/electrical.py`: backward/forward current sweep، قرارداد signed P/Q، PF و علامت تزریق/جذب Q صریح، جریان شاخه، ولتاژ و I²R/I²X، residual توان.
- توپولوژی oriented radial تا۲۰۰گره، strict schema/finite numbers، حد iteration و tolerance و محدودهٔ عددی ولتاژ. عدم همگرایی یا خروج از دامنه خطاست؛ fallback ندارد.
- export cap توان خالص POI با کاهش متناسب ژنراتورها و PFثابت: هر candidate مجدداً load-flow می‌شود. خروجی قبل/بعد، تغییر تلفات و توان curtailed مجزا هستند. cap صرفاً min خروجی نیست. سیاست کنترلی پژوهشی است، نه OPFعمومی یا کنترل واقعی اعتبارسنجی‌شده.
- امپدانس همهٔتجهیزات باید به یک سطح ولتاژ ارجاع شده باشد. مدل کامل ترانس، shunt/tap/no-loadloss/حلقه/نامتعادلی پیاده نشده؛ data واقعی کابل/ترانس/حدود سازنده وجود ندارد.
- ampacity/protection تأیید نمی‌شود؛ محدودهٔعدد‌ی۰٫۵تا۱٫۵pu حدود مجاز سازنده نیست.
- خروجی توان snapshot است؛ به محصول انرژی/StudyResult/مالی متصل نشده. POIازقبلشاملتلفاتاست و کسر مجدد آن ممنوع است. مراحل۴۸/۴۹ هم ارتقای وضعیت نگرفته‌اند.
- CLIجدید `electrical --plan ... --output ...`؛ دستور و قرارداد کامل در READMEپژوهش.

## تست پس از پیاده‌سازی
**۱۷تست پژوهشی PASS**، شامل۶تست جدید الکتریکی و۱۱تست قبلی:
۱. مدار مقاومتی۲گره با جواب بستهٔ درجه۲، هم مصرف و هم تولید؛ مستقل از sweep.
۲. مدار مختلط۴گره با rootمستقل معادلات nodalKCL توسط SciPy، balanceP/Q و residual.
۳. capبا بازحل، تغییر تلفات، عدم mutationو عدم doublecount.
۴. capصفر، import/exportعلامت‌دار، capغیرفعال بدون اجرای اضافه.
۵. PF۰٫۸، تزریق/جذبQ، امپدانس‌صفر و رابطهٔ جریان سه‌فاز.
۶. schema/NaN/inf/topology/PF/حدود/نوعboolنامعتبر، عدم همگرایی و خروج از دامنه، blockedstatus.

**۱۵۸تست productionPython PASS** دراجرایاینمرحله؛ contractmatrix۸۱۹۲مورد:۴۳۵۲رد،۱۶runtime و۳۸۲۴contract-only. gitdiff--check نیزPASS. build/TypeScript/browserوWindowsCIاینمرحله اجرا نشده‌اند. چون مسیر جدید جداست، productionworker و UI تغییر نکرده‌اند.

## اجرای عملی CLI با fixture صریحاً مصنوعی
ورودی: `docs/examples/research/radial-ac-synthetic-plan.json`؛ خروجی: `docs/audit/PVLIB-50-SYNTHETIC-RESULT.json`.
ولتاژ۴۰۰V،بار۲kW،تولید۱۰۰kWباPF۰٫۹۸،امپدانس۰٫۱+j۰٫۰۵اهم/فاز،cap۴۰kW:

| شاخص | بدون cap | پس از بازحل cap |
|---|---:|---:|
|صادرات خالصPOI،W|92464.239649|40000.000000|
|تلفات سری،W|5535.760352|1042.219828|
|توان راکتیو وارداتیPOI،var|-17537.985888|-8218.985595|
|ضریب تولید|1|0.4304221983|

کاهش تولید:56957.780173W؛ حداکثر mismatchPQدرحل نهایی کمتر از۶e-7VA. این fixtureبرای صحت الگوریتم است، نه مدار واقعی یا اندازه‌گیری میدانی. تعداد iterationوresidualهای کامل درJSONآمده‌اند.

## باقیماندهٔ پذیرش عملیاتی
topology و ولتاژها و مستندات امپدانس/ترانس واقعی، محدودیت‌های معتبر سازنده، تأیید مهندسی دامنه و سیاست Q/curtailment، داده/مرجع پروژه و طراحی مستقل protection/ampacity لازم است. مدل نامتعادل/چندسطح ولتاژ/tap یا اتصال کنترل‌شده به waterfall محصول در این تحویل نیست. هیچ ادعای fieldvalidated،ایمنی یا bankable مطرح نمی‌شود.
