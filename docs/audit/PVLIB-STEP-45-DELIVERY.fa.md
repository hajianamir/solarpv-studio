# تحویل مرحلهٔ۴۵ — کالیبراسیون تجربی خروجی
2026-11-03؛ مبنا2ff1ff8؛ شاخه arena/237e6ea2-solarpv-studio؛ بدون merge.

## دامنه و استفاده
هستهٔ gain bounded و fit روی train در تحویل ابزارهای validation موجود و با oracle مستقل Python آزموده شده بود. مرحله۴۵ آن را با بازبینی اختصاصی train/test، ردیف‌ها و export خام/اصلاح‌شده تکمیل می‌کند؛ فرمول/قرارداد گزارش قدیمی یا بستهٔ پروتکل۴۴ تغییر نکرده است.

در بخش Calibration/P50/P90/field evidence یک plan با `tool=output_calibration` و datasetId توان export/import/DC معتبر، پنجره‌های زمانی جدا و حدود صریح gain بسازید، تأیید کنید و Compute بزنید. پس از fit موفق، بخش **45. Empirical output calibration** ظاهر می‌شود:
- شناسه/نقطه/واحدcanonicalW، پنجره‌های UTC midpoint و gain خام/محدود و bounds.
- جدول train/test: تعداد جفت/بازهٔ مدل و ساعت جفت‌شده، MBE/MAE/RMSE قبل و بعد و انرژی observed/raw/corrected فقط روی همان جفت‌ها برحسبWh.
- وضعیت holdout improved/degraded/unchanged و مقدار rawRMSE−adjustedRMSE. automaticAcceptance=false حتی در حالت بهبود؛ test نتیجهٔ gain را تغییر نمی‌دهد.
- دانلود `output-calibration-review.json`، `output-calibration-rows.csv` و `output-calibration-review.html`؛ editplan یا result/restore جدید نمایش قبلی را پاک می‌کند.

خروجی مستقل `study-output-calibration-review-v1` با analyticsVersion1.0.0 شامل report و plan قدیمی، fingerprint نتیجهٔ دقیق، provenance/receiptSHA حسگر، سیاست و دو partition با ردیف‌های مشاهده/rawmodel/adjustedmodel/rawresidual/adjustedresidual و status/flag/reason است. midpoint و کران‌های انتخاب در CSV هم هستند؛ schema/result/input/plan hashes برای اتصال فایل‌ها حفظ شده‌اند. JSON مطالعه و plan یا بستهٔ پروتکل۴۴ را نگه دارید؛ این review را به‌عنوان نتیجهٔ فیزیکی جدید import نکنید و برای بازتولید روی همان مطالعه/plan دوباره محاسبه کنید.

## قواعد حفظ‌شده
`gain = clamp(Σ(model×observed)/Σmodel², minGain,maxGain)`، بدون offset و فقط از جفت‌های train. کران‌های مجاز در بازهٔ حفاظتی[0.5,1.5] صریح‌اند؛ min<max. train قبل از test و بدون هم‌پوشانی زمانی، [start,end) بر مبنای UTC midpoint. حداقل۲جفت در هر پنجره، train غیرصفر؛ این حد نرم‌افزاری معیار کفایت علمی/فصلی نیست. دما و net signed برای gain رد می‌شوند. unavailable import نیز fit مصنوعی با صفر نمی‌گیرد.

در review فقط paired ردیف corrected دارد؛ missing/excluded/outside/unavailable با مقدار مشاهده/دلیل خود حفظ و prediction/residual اصلاح‌شدهٔ آن‌ها null است. صفر valid صفر می‌ماند. انرژی اصلاح‌شده از همان جفت‌های انتخاب‌شده و intervalHours است، نه همهٔ دوره یا فاصلهٔ ابتدا تا انتها. هیچ ردیفی بیرون train/test اصلاح نمی‌شود. CSV دارای CRLF/quote escape/محافظ formula-string است؛ null خالی است، نه صفر، و عدد منفی به رشتهٔ formula تبدیل نمی‌شود.

## محدودیت حیاتی
این gain **اصلاح تجربی خروجی** است، نه برازش پارامتر فیزیکی، sensor calibration، شبیه‌سازی مجدد یا تأیید میدان. corrected power دوباره clip نمی‌شود و ممکن است از inverter/exportcap عبور کند؛ UI و report این را صریح می‌گویند. هیچ Apply-to-model یا تغییر worker/finance/P50/P90 نداریم. مقایسهٔ holdout بدتر hide یا با تنظیم از روی test اصلاح نمی‌شود؛ تنظیم مکرر با نگاه به test همچنان نشت اطلاعات است. برنامه اصالت تاریخچهٔ آزمایش را تضمین نمی‌کند. engine1.16.0 و validationStatus=not_field_validated ثابت‌اند؛ دادهٔ عملیاتی ارائه نشده است.

## فایل‌ها و پژوهش
- `src/studies/outputCalibrationReview.ts`: تحلیل مشتق‌شده و CSV/HTML.
- `src/components/OutputCalibrationReview.tsx`: نمای اختصاصی و اتصال در StudyValidationTools.
- `scripts/test-output-calibration-review.ts`: تست جدید در workflow و CI Windows/Linux.
- برنامهٔ فازبندی و inventory مرحله۴۵ به‌روز شده‌اند؛ physicalParameterCalibration همچنان not_implemented است.
- مرجع pinned پیش ازکد: https://scikit-learn.org/1.6/modules/generated/sklearn.linear_model.LinearRegression.html — OLS و محدودیت مدل بدون intercept؛ dependency جدید نصب نشد. شاهد مستقل gain غیرمتناسب و بحث leakage تحویل قبلی نیز در regression اجرا شد.

## تست‌های محلی
- تست۴۵ PASS با actual worker: zero/missing/excluded/outside، bounds پایین/بالا، train-only gain و holdout degraded، offset معادل و W/kW، metrics/energy قبل‌وبعد، عدم reclip پنهان، رد نقاط نامجاز/unavailable/overlap، CSV injection/null و HTML escape.
- برابری گزارش قدیمی و بازمحاسبهٔ بستهٔ۴۴، immutability samples/summary/monthly، fingerprint و bundle restore PASS.
- مرورگر واقعی PASS: fit۱.۱ روی fixture شش‌جفتی واقعی worker، جدول و outcome و download/readback دقیق JSON/CSV/HTML، reset پس از plan edit و تأیید مجدد؛ مسیرهای قبلی protocol/uncertainty/field/storage نیز PASS.
- ۱۵۸ تست Python و workflow کامل PASS. ماتریس قبلی۸۱۹۲قرارداد/۴۳۵۲رد/۱۶runtime/۳۸۲۴contract-only؛ اجرای عددی همهٔ دامنه‌ها ادعا نمی‌شود.
- API/process، build، TypeScript، benchmark، audit/source/physics gates PASS. lint صفرerror و۹۵warning موجود؛ هشدار chunk بزرگ build باقی است. خطاهای type در fixture تست جدید (inference/optional measurements) پیدا و با type مشخص و schema.parse رفع شدند؛ lint مجدد PASS.

CI دقیق commit پس از push بررسی و در پاسخ نهایی لینک می‌شود. مراحل۴۶/۴۷ هستهٔ ابزار قبلی دارند ولی تکمیل مستقل بعدی/گیت‌های عملیاتی آن‌ها به این مرحله نسبت داده نمی‌شود؛ کالیبراسیون فیزیکی۴۸ و field campaign هنوز نیازمند داده و اقدام جداگانه‌اند.
