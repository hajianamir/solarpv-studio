# تحویل مرحلهٔ ۴۲ — آمار هم‌پوشانی و خطا

2026-11-03؛ مبنا `cf8a197`؛ شاخه `arena/237e6ea2-solarpv-studio`؛ بدون merge.

## اجرا و قرارداد
بعد از import مشاهده و اجرای مطالعه، بخش **42. Overlap and residual statistics** خلاصهٔ هر حسگر را نشان می‌دهد. دکمهٔ **Overlap, metrics and residuals JSON** فایل `study-measurement-comparison.json` را می‌دهد. گزارش HTML نیز خلاصهٔ آمار/سیاست انتخاب/منشأ را دارد. فایل JSON شامل ردیف‌ها و residual است؛ خروجی‌های مرحلهٔ ۴۱ بدون تغییر باقی‌اند.

قرارداد جدید `study-measurement-comparison-v1`، نسخهٔ تحلیل `1.0.0` است. موتور فیزیکی عمداً **1.16.0** می‌ماند: worker و ورودی/خروجی فیزیکی تغییر نکرده‌اند. تحلیل از result معتبر و مشاهدات حفظ‌شده مجدداً ساخته می‌شود، نه اینکه مقدار ذخیره‌شده یا ادعاشدهٔ یک archive را باور کند. پس از backup/bundle/IndexedDB restore همان تحلیل بازتولید می‌شود. inputSha256، engineVersion، سایت/دوره، منشأ/نسخه/کیفیت/حسگر/نقطه/واحد و SHA خام در صورت وجود، همراه خروجی‌اند. SHA اصالت حسگر را تأیید نمی‌کند.

## تعریف محاسبات
- فقط `paired` مرحلهٔ ۴۱: qualityFlag=valid، timestamp UTC دقیق، خروجی همان نقطه موجود. تبدیل W/kW به W؛ دما degC.
- residual = modeled − observed؛ MBE = Σresidual/N؛ MAE = Σ|residual|/N؛ RMSE = √(Σresidual²/N). مخرج N است، نه N−1. صفر و شب حذف نمی‌شود؛ outlier filter، daylight threshold، lag fitting، resampling و کالیبراسیون نداریم.
- شمارش وضعیت‌های paired/missing/excluded/outside_model_period/model_point_unavailable با اولویت و معنای مرحلهٔ ۴۱، mutually exclusive است. missing/excluded بیرون دوره نیز در همان وضعیت missing/excluded شمرده می‌شود؛ وضعیت خارج دوره شمارندهٔ مستقل همهٔ ردیف‌های بیرون دوره نیست.
- `pairedPercentOfModelIntervals` مخرج کل بازه‌های مدل؛ `pairedPercentOfValidRecords` مخرج همهٔ ردیف‌های valid واردشده، شامل valid بیرون دوره/نقطه unavailable. این دو درصد متفاوت‌اند. مخرج صفر => null.
- `modelIntervalsWithoutObservationRecord` تعداد timestampهای مدل فاقد هرگونه ردیف مشاهده است، نه تعداد missing صریح. `pairedHours=N×intervalHours` مجموع مدت جفت‌هاست، نه فاصلهٔ اولین تا آخرین و نه پوشش پیوسته.
- انرژی observed/modeled/residual فقط از جفت‌های توان و بر حسب Wh؛ دما یا N=0 => null. میانگین observed/model نیز فقط روی همان جفت‌هاست. هیچ annualization و جمع‌کردن حسگرها/نقاط مختلف انجام نمی‌شود.
- N=0: metrics=null با دلیل، نه خطای صفر. N=1 قابل محاسبه با هشدار صریح محدودیت. حتی هم‌پوشانی ۱۰۰٪ تضمین نمایندگی، کیفیت حسگر یا دقت مدل نیست. درصد خطای نرمال، MAPE، R² و آستانهٔ قبولی ارائه نمی‌شود.
- در چند بلوک/MPPT، دمای بدون prefix تنها صفحهٔ مرجع است و میانگین آرایه نیست. نقطهٔ مدل unavailable به صفر تبدیل نمی‌شود.

## پژوهش و شواهد
مرجع pinned پیش از کد: https://scikit-learn.org/1.6/modules/generated/sklearn.metrics.root_mean_squared_error.html
مثال منتشرشده با observed=[3,-0.5,2,7] و modeled=[2.5,0,2,8]: MBE=0.25، MAE=0.5، RMSE=√0.375. dependency جدید نصب نشده است. این مثال و شاهدهای دستی مستقل، فرمول‌های آمار را بررسی می‌کنند نه فیزیک PV.

فایل‌های اصلی: `src/studies/measurementComparison.ts`، `src/components/PvlibStudyPanel.tsx`، `src/studies/studyWorkflow.ts`. شواهد اجرایی در `scripts/test-measurement-comparison.ts` و `scripts/test-direct-pvlib-browser.ts`؛ تست جدید در `test:study:workflow` و CI موجود Windows/Linux اجرا می‌شود. inventory مرحلهٔ ۴۲ را تکمیل می‌کند، ولی شکاف‌های فیزیکی و `fieldValidation=false` باقی‌اند؛ تکمیل roadmap به معنای مدل‌کردن همهٔ پدیده‌ها نیست.

## آزمون‌های محلی
- شاهدهای دستی و مثال منتشرشده + oracle مستقل Python stdlib: PASS. علامت bias، cancellation، perfect/zero، signed، W/kW، دما، singleton/no-pairs، sparse/flags/offset، چند حسگر و انرژی ۱۵دقیقه‌ای بررسی شد. شاهدهای عددی مصنوعی از خروجی واقعی فیزیک تفکیک شده‌اند.
- اجرای واقعی Python و برابری samples/summary/monthly با مطالعهٔ بدون مشاهده: PASS؛ عدم mutation و بازتولید bundle/clone و escape گزارش: PASS.
- ۱۵۸ تست Python و workflow کامل: PASS؛ ماتریس قبلی ۸۱۹۲ قرارداد/۴۳۵۲ رد/۱۶ اجرای واقعی/۳۸۲۴ صرفاً قراردادی بدون ادعای پوشش عددی همهٔ ترکیب‌ها.
- API/process، benchmark، audit و گیت‌های source/physics: PASS.
- build، TypeScript و lint: PASS؛ ۹۵ warning موجود و صفر error؛ هشدار chunk بزرگ build باقی است. nullable assertion در کد تست جدید طی lint اولیه پیدا و رفع شد.
- مرورگر واقعی و storage: PASS؛ JSON دانلودشده با تابع تحلیل روی همان نتیجه برابر است؛ شمارش/UI/HTML و reload/IndexedDB restore بررسی شد. اجرای اولیه در دانلودهای تکراری report به timeout خورد؛ تست برای چند assertion از همان report/CSV دانلودشده استفاده می‌کند، نه دانلود تکراری غیرضروری؛ اجرای مجدد کامل PASS شد.

CI دقیق commit پس از ثبت و push بررسی می‌شود؛ لینک و SHA نهایی در پیام تحویل است. هیچ دادهٔ عملیاتی ارائه نشده؛ این تست‌ها تأیید میدانی، کالیبراسیون، bankable yield، P50/P90 یا گواهی اعتبار سالانه نیستند.
