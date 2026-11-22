# تحویل بازبینی قبلی و مرحله۴۶ — عدم‌قطعیت شرطی
2026-11-03؛ مبنا0010512؛ اصلاح بازبینی قبلی در845a4ff ثبت شد؛ شاخه arena/237e6ea2-solarpv-studio؛ بدون merge.

## ترتیب اجرا
۱. baseline کامل پیش ازکد اجرا شد:۱۵۸Python،workflow،API،browser/storage،lint/build،benchmark/audit PASS.
۲. اسناد/inventory/callsiteهای مربوط به۳۰–۴۵ و گیت‌های قدیمی‌تر بررسی شدند؛ دو نقص JSON duplicate و async file rejection بازتولید و قبل از۴۶ اصلاح شدند. گزارش تفصیلی `PVLIB-REVIEW-THROUGH-45-RESULTS.fa.md` است. این بازبینی به معنی اثبات صحت مستقل همهٔ فرمول‌های تاریخی یا دادهٔ میدان نیست.
۳. پس از تست اصلاح‌ها و مرورگر،۴۶ روی هستهٔ موجود uncertainty تکمیل شد. هیچ تغییر فرمول worker، پارامتر، مالی، calibration یا گزارش/پروتکل معتبر قدیمی انجام نشده است؛ موتور1.16.0 و validationStatus=not_field_validated ثابت‌اند.

## قابلیت۴۶ و استفاده
plan با tool=energy_uncertainty را با source/version/purpose، CVهای منبع‌دار، ماتریس log-space correlation و تأیید study AC export به‌عنوان median تکمیل و Compute کنید. بخش **46. Conditional uncertainty budget** نشان می‌دهد:
- افق study_period یا single_calendar_year و تاریخ دقیق مطالعه، Wh وkWh؛ study_period به سال تبدیل نمی‌شود و annual فقط روی سال کامل UTC معتبر است.
- P50، P90 و arithmetic mean جدا؛ P90 = صدک۱۰ CDF با۹۰٪ exceedance تحت فرض‌ها، **نه confidence interval میانگین** یا ضمانت مالی.
- جدول component/source/version/CV/logsigma/diagonal variance و جدول جفت‌های نامرتب باρ و signedcrossvariance؛ ماتریس از plan حفظ‌شده قابل بررسی است. درصد سادهٔ جمع‌شونده یا losswaterfall ساخته نمی‌شود.
- مجموع diagonal، مجموع signedcross، جمع بودجه و variance واقعی استفاده‌شده در مدل، با اختلاف reconciliation عددی برای rounding.
- هشدارهای synthetic، دورهٔ غیرسالانه، منابع خوداظهاری/عدم کنترل خودکار double-count، اثر correlation منفی و حالت varianceصفر/cancellation.

خروجی‌های جدید و مستقل:
- `energy-uncertainty-review.json`، قرارداد study-energy-uncertainty-review-v1 و analyticsVersion1.0.0؛ شامل report/plan موجود، fingerprint نتیجهٔ دقیق، period، components/crossTerms، quantiles و policy/warnings.
- `energy-uncertainty-budget.csv`، هدر ثابت و ردیف‌های quantile/mean/diagonal/cross/combined با input/plan/result hashes و horizon/unit؛ signed logvariance، نه انرژیloss. nullخالی، CRLF/quoteescape و stringformula guard.
- `energy-uncertainty-review.html` با report/policy کامل و escape/CSP؛ مطالعهٔ اصلی و plan/protocol را همراه فایل‌ها حفظ کنید. review ذخیره‌شده trusted input نیست؛ از روی مطالعهٔ معتبر و plan دوباره ساخته می‌شود.

تغییر plan یا result نما را پاک می‌کند؛ گزارش قدیمی و بستهٔ۴۴ بایت/ساختار محاسبهٔ خود را حفظ می‌کنند. calibrationgain و residualRMSE خودکار وارد uncertainty نمی‌شوند؛ نیروگاه/مالی/P50baseline از gain تغییر نمی‌کنند.

## فرمول و دامنه
برای هر مؤلفه sigma_i=sqrt(log(1+CV_i²))؛ diagonal_i=log(1+CV_i²)؛ برای هر جفت i<j سهم=2ρ_ij sigma_i sigma_j. جمع این‌ها همان variance_log است، جز rounding. P50=انرژیACexport مثبت با تفسیر median صریح؛ P90=P50 exp(−1.2815515655446004 sigma_log) و mean=P50 exp(variance_log/2). CV برای همان افق زمانی و correlation در فضای log است، نه الزاماً correlation انرژی معمولی. حداکثر۸component، ماتریس صریح symmetric/diagonal1/PSD؛ بدون استقلال پیش‌فرض.

Negativecross ممکن است variance را کاهش دهد؛ این حذف فیزیکی uncertainty نیست. CV0/cancellation فرض degeneracy است، نه شاهد قطعیت. توزیع/بودجه/منابع واقعی احراز نشده‌اند؛ ensemble، MonteCarlo، temporal scaling، systematic/interannual تفکیک‌شده، bias propagation و P50/P90 تأییدشدهٔ پروژه برای فاز۴۹ باقی است. کالیبراسیون پارامتر فیزیکی۴۸/fieldcampaign انجام نشده‌اند.

مرجع پیش ازکد: NIST lognormal https://www.itl.nist.gov/div898/handbook/eda/section3/eda3669.htm ؛ اصلاح JSON بر مبنای RFC8259 section4. dependency جدید یا استثناء physics/source/hash اضافه نشد.

## شواهد تست
- تست۴۶ با actual worker و oracle مستقل NumPy/NormalDist: ماتریس۸component PSD با eigenvalue مستقل، تک‌تک diagonal/cross و variance/P90/mean، permutation وρ=−1/0/+1، negativecross/cancellation/CV0 PASS.
- gateهای shape/asymmetric/nonPSD/duplicate/ninthcomponent/CVغلط/NaN/centralmean/staleSHA/zeroexport و سال ناقص رد؛ سال کامل UTC مصنوعی با actualworker وreview پذیرفته شد. fixtureاولیهٔ سال باDNIمثبت شب به‌درستی رد شد؛ فقط fixture با ورودی‌های سازگار شب/روز اصلاح شد، gate برنامه تغییر نکرد. دادهٔ مصنوعی سالانه operational weather یا validityclaim نیست.
- CSV/HTML escaping، old report/protocol و bundle restore، عدمmutation PASS.
- مرورگر واقعی PASS: horizon/table/budget/quantile، actual JSON/CSV/HTML readback، cancellationwarning، editreset، duplicateplanرد و reproducer stale-fileerror به‌علاوه تمام جریان‌های قبلی.
- regression نهایی نیز اجرا شد:۱۵۸Python،workflow کامل شامل JSONboundary/۴۴/۴۵/۴۶ و ماتریس۸۱۹۲contract/۴۳۵۲reject/۱۶runtime/۳۸۲۴contract-only،API/process،benchmark وaudit/source/physics همگیPASS. lint/TypeScript صفرerror و۹۵warning موجود،build با هشدارchunk وbrowser/storage همPASS. CI دقیقSHA پس ازpush و قبل از پاسخ نهایی بررسی می‌شود؛ نتیجهٔ CI قبلی جایگزین این نسخه نیست.

## کارهای واقعاً باقیمانده
این تحویل نقص‌های بازتولیدشدهٔ قبل و دامنهٔ نرم‌افزاری۴۶ را پوشش می‌دهد؛ داده/گواهی/بازبینی مستقل و field47، physical fitting48 و uncertaintybudgetواقعی49 و فازهای۵۰–۵۵ همچنان طبق برنامه pendingاند. محدودیت عمدی را با نقص رفع‌شده یا قابلیت انجام‌شده مخلوط نمی‌کنیم. هشدارهای موجود lint/chunk را صفرشده معرفی نمی‌کنیم. دستور عدمmerge/main/forcepush حفظ است.
