# مواد متعدد و تطبیق موجودی — زیرمجموعهٔ D2

## دامنه و وضعیت

اجرای واقعی PV ICE0.4.3 برای مواد منتخب از هفت مادهٔ شیشه، سیلیکون، نقره، مس، قاب آلومینیومی، encapsulant و backsheet در سناریوی frozen US c-Si؛ افق1995..2050. این‌ها متوسطهای تاریخی و پیش‌بینی upstream هستند، نه BOM یا موجودی اندازه‌گیری‌شدهٔ سایت. این برش، تکمیل D2 یا A1–D3 نیست؛ موجودی تأییدشده، BOM سفارشی، LCA/functional-unit گسترده، تخصیص اثرات، هزینه/EOL و اعتبارسنجی پروژه هنوز بازند.

## اجرا و rollback

همان runtime اختیاری مجزای reference با requirements و lock قبلی و `PVLIB_REFERENCE_PYTHON` صریح لازم است؛ fallback به runtime اصلی وجود ندارد. در سرور دارای احراز هویت موجود، `PVLIB_RESEARCH_ENABLED=true`، `REFERENCE_MODELS_ENABLED=true` و `MATERIAL_INVENTORY_ENABLED=true` را تنظیم کنید؛ پیش‌فرض هر سه خاموش است. خاموش‌کردن پرچم آخر یا reference، عملیات را با503 رد و از capabilities حذف می‌کند؛ adapter شیشهٔ قبلی دست‌نخورده می‌ماند.

در Research editor تب اقلیم، `Material inventory example` را انتخاب کنید. JSON در `docs/examples/references/inventory.json` همان request قابل‌ارسال به POST `/api/v1/research/run` یا `Client(..., enabled=True).run(request)` در SDK است. source و مشاهده‌های این مثال مصنوعی و صرفاً آزمون ledger هستند؛ documentSha256 مثال، ادعای وجود سند اندازه‌گیری مستقل نیست. برای دادهٔ واقعی باید source/documentSha256 واقعی و مرز قابل‌دفاع ارائه شود. دادهٔ حساس را در repo یا نمونه ثبت نکنید. cancel و import/archive مسیر مالی/انرژی ایجاد نمی‌کنند؛ توکن در archive ذخیره نمی‌شود.

## قرارداد داده و تصمیم

ورودی1..7مادهٔ یکتا و installationScale=.001..10 می‌پذیرد. مقیاس سناریو به‌معنی برآورد طراحی واقعی سایت نیست. inventory می‌تواند null باشد؛ در غیر این صورت نسخهٔ`declared-material-inventory-v1`،source/documentSha256/contextSha256،unit=`kg` و boundary=`annual_selected_material_flows` الزامی‌اند. مشاهدات year/material/metric یکتا و حداکثر100ردیف‌اند. metric فقط virginStockKg،landfillKg یا usedInModulesKg است. تغییر واحد به تن، مرز کل ماژول یا مادهٔ انتخاب‌نشده رد می‌شود؛ تبدیل ضمنی نداریم.

- نبود inventory: `not_provided`.
- context متفاوت: `context_mismatch` و comparisons خالی؛ دادهٔ ناسازگار به‌زور join نمی‌شود.
- context یکسان: residual=model-observed و مقایسه با absoluteToleranceKg ورودی؛ وضعیت within_declared_tolerance یا outside_declared_tolerance.
- absoluteToleranceKg آستانهٔ تصمیم اظهارشده است، نه خطای اندازه‌گیری اثبات‌شده، CI، calibration interval یا دقت مدل. برابری هش context فقط تطبیق شناسه است، نه صحت مرز یا منبع.
- در همهٔ حالات `provenanceStatus=caller_declared_not_independently_verified` و projectApproval=blocked؛ نتیجه insufficient_evidence/not_field_validated می‌ماند.

## جرم، واحد و شاهد مستقل

PV ICE خروجی جرم را g می‌دهد؛ adapter صریحاً بر1000 تقسیم می‌کند و kg برمی‌گرداند. installedMw ورودی MW و areaM2 خروجی m² است. دو ledger بررسی می‌شوند: manufacturingInput+remfgYield=usedInModules+scrap و landfill=eolLandfill+manufacturingLandfill. این‌ها **تراز کامل جهانی cohort/stock نیستند**. در پایان افق، موجودی در حال استفاده باقی می‌ماند. selectedMaterialTotals فقط جمع مواد منتخب است، نه کل ماژول یا اثر محیطی.

TS از projection مستقل CSV برای area=installedMw*1e6/(1000*efficiencyPct/100) و used=area*massGM2/1000 استفاده می‌کند؛ totals/دوledger و residual/تصمیم inventory نیز بازسازی می‌شوند. tolerance عددی شاهد نسبی1e-7 است؛ دقت میدانی نیست. این شاهد مدل کامل PV ICE را بازحل نمی‌کند و سایر جریان‌های هم‌زمان‌دست‌کاری‌شدهٔ سازگار با ledger را به‌تنهایی رد نمی‌کند. شواهد اجرای موتور، رگرسیون شیشه و داده‌های frozen مکمل آن‌اند. محاسبات اصلی فقط Python سرور است.

## منشأ و پژوهش

شش baseline مادهٔ اضافی از repository رسمی PV_ICE commit`378a012a0602062ad52f14120d672f362dcc018a` دریافت شد؛ شیشه و module US از قبل frozen بودند. SHA256،git blob،مسیر منبع و مجوز در `docs/reference-data/manifest.json` ثبت‌اند. فایل `pvice/material-summary.json` projection قطعی CSVهاست؛ dataset مستقل تلقی نمی‌شود. acquisition با `scripts/acquire_reference_data.py --fetch` فقط گام صریح توسعه است؛ runtime آفلاین باقی می‌ماند.

مرجع خوانده‌شده: [PV ICE Data: Mass](https://pv-ice.readthedocs.io/en/latest/data.html)، بخش Input Data و Material Outputs برای تعریف g،g/m²،MW و فرق virgin/landfill/used-in-module. صفحه عنوان قدیمی0.1.0 دارد؛ runtime ادعاشده از آن استنتاج نشده و دقیقاً0.4.3 است. مقالهٔ PV in the circular economy و README رسمی در جستجو برای ماهیت تاریخی/پیش‌بینی baselineها بررسی شدند؛ بازتولید اعداد مقاله ادعا نمی‌شود.

## آزمون و محدودیت‌های اجرایی

۱۱ آزمون Python شامل7ماده/56سال، projection از CSV،برابری trace/totals شیشه با adapter واقعی قبلی،ledger،tolerance و context mismatch،نبود موجودی،scale/انتخاب،کلید/واحد/منبع نامعتبر،immutable/cwd و fresh offline است. API/SDK،runtime جدا،auth و دو flag/rollback،tamper و مرورگر production/archive/cancel/disabled نیز در گیت‌اند. context مرورگر برای interception قطعی capabilities سرویس‌ورکر را مسدود می‌کند؛ این آزمون lifecycle آن نیست. ResourceWarning فایل‌های بازنشده در upstream PV ICE قبلی نیز دیده می‌شود؛ dependency در این برش patch نشده و هر job در subprocess کوتاه‌عمر اجرا می‌شود. این هشدار پنهان یا موفقیت بدون محدودیت اعلام نشده است.

گیت: `PVLIB_PYTHON=... PVLIB_REFERENCE_PYTHON=... npm run verify:inventory`؛ receipt در `docs/audit/MATERIAL-INVENTORY-GATE.json`. کل گیت قبلی تو‌در‌تو اجرا می‌شود؛ ready-for-review فقط برای هش جاری معتبر است.

## سه مرور و پژوهش

1. مرور مرز: تفکیک سناریوی US از موجودی سایت؛ سپس جستجوی مقاله/README رسمی و تثبیت baselineهای7ماده با commit/hash/license. هیچ دادهٔ field جایگزین نشد.
2. مرور واحد/ledger: کنترل g→kg و عدم جمع‌کردن جریان‌های ناهم‌مرز؛ سپس خواندن Data:Mass بخش Material Outputs و بازسازی مستقل area*massGM2،مقایسه با adapter قبلی.
3. مرور provenance/تصمیم: hash قالب‌درست، اصالت سند را تضمین نمی‌کند؛ سپس بازبینی ورودی‌های نامعتبر و mismatch،رد implicit unit conversion و اجرای auth/rollback/tamper/SDK/browser. هیچ ادعای operational acceptance از match مصنوعی ساخته نشد.
