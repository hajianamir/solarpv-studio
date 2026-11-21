# تحویل مرحلهٔ ۴۳ — تحلیل دوره‌ای مشاهده‌ها
2026-11-03؛ مبنا `1eaa02b`؛ شاخه `arena/237e6ea2-solarpv-studio`؛ بدون merge به main.

## دامنه و راهنما
این مرحله بنا بر تأیید کاربر بعد از پایان نقشه‌راه ۴۲ تعریف شد: روز/ماه UTC، بازهٔ انتخابی، نمودار residual و CSV. پس از import مشاهده و اجرای مطالعه، بخش **43. Daily/monthly residual analysis** را ببینید. حسگر را انتخاب کنید؛ Start/End را با Z یا offset وارد و Apply range را بزنید. هر دو کران خالی یعنی همهٔ داده‌ها؛ یک کران خالی، تاریخ نامعتبر یا start>=end خطاست و انتخاب معتبر قبلی باقی می‌ماند. **Full period** انتخاب را پاک می‌کند. با restore/result جدید نیز انتخاب پاک می‌شود و دادهٔ مدل/سند ذخیره‌شده تغییر نمی‌کند.

تخصیص روز/ماه و عضویت انتخاب بر اساس **UTC interval midpoint** است، نه زمان محلی یا انتهای بازه. انتخاب [start,end) است. مثلاً رکورد interval-end ساعت 00:00 با بازهٔ ۶۰دقیقه به 23:30 روز قبل تخصیص می‌یابد. این سیاست با ماه‌بندی انرژی worker هماهنگ است؛ با مرحله۴۲ که اصلاً bucket ندارد تناقضی ندارد. روز/ماه فقط زمانی ساخته می‌شود که timestamp مدل یا مشاهده دارد؛ روزهای غایب، دادهٔ صفر یا بازهٔ خیالی تولید نمی‌شود. رکورد خارج دورهٔ مدل در تحلیل full باقی می‌ماند و ممکن است bucket بدون مدل بسازد.

در هر bucket، مخرج مدل/مشاهده فقط از همان bucket و انتخاب است. MBE/MAE/RMSE از residualهای همان جفت‌ها محاسبه می‌شوند؛ RMSE کل از میانگین RMSE روزها به دست نمی‌آید. missing/excluded/outside/unavailable از نظر stage۴۱ حفظ می‌شوند. نبود مدل/جفت باعث null است، نه خطای صفر. انرژی فقط برای جفت‌های توان است؛ دما انرژی ندارد. منابع و حسگرهای متعدد مستقل‌اند و با هم جمع نمی‌شوند.

نمودار تمام جفت‌های معتبرِ حسگر انتخاب‌شده را به‌صورت **نقطه‌های بدون خط اتصال** نشان می‌دهد؛ هیچ downsampling، interpolation یا اتصال شکاف انجام نمی‌شود. محور افقی midpoint UTC، محور عمودی residual=model−observation با مقیاس متقارن و واحد W/degC است؛ عنوان هر نقطه مقدار/زمان را دارد. در نبود جفت، پیام unavailable جای نمودار است. جدول روز/ماه و export کامل برای دسترسی به مقدار دقیق وجود دارد.

سه خروجی از **حسگر و بازهٔ اعمال‌شده** قابل دریافت است:
- `measurement-period-analysis.json`: metadata، انتخاب، سیاست، total/daily/monthly و ردیف‌ها؛ قرارداد `study-measurement-period-analysis-v1`، analyticsVersion=1.0.0.
- `measurement-period-summary.csv`: total، روزها و ماه‌ها؛ count/coverage/error/energy با هدر ثابت و مبنای زمانی صریح.
- `measurement-period-residuals.csv`: همهٔ وضعیت‌ها با زمان پایان و midpoint UTC، observation/model/residual؛ null خالی است، صفر معتبر صفر باقی می‌ماند.

CSV از CRLF و quote escape استفاده می‌کند و رشته‌های formula-like با apostrophe محافظت می‌شوند؛ مقدار منفی عددی تغییر نمی‌کند. JSON، inputSha256 و metadata/سیاست کامل را دارد. HTML عمومی، تحلیل **کل دوره و همهٔ حسگرها** را نشان می‌دهد، نه انتخاب موقت UI؛ JSON/CSV انتخابی را برای بازتولید انتخاب حفظ کنید. import/receipt/قیود اندازهٔ قبلی تغییر نکردند. این لایهٔ مشتق‌شده در worker یا archive ذخیره نمی‌شود و پس از restore از result معتبر بازتولید می‌شود.

## پیاده‌سازی و مرجع
- `src/studies/measurementPeriods.ts`: قرارداد انتخاب/گروه‌بندی و دو CSV.
- `src/studies/measurementComparison.ts`: استخراج helper مشترک خلاصه‌سازی؛ قرارداد و خروجی۴۲ حفظ شده‌اند.
- `src/components/MeasurementPeriodExplorer.tsx` و اتصال به panel؛ گزارش در `studyWorkflow.ts`.
- `scripts/test-measurement-periods.ts`: شواهد مستقل عددی و integration؛ افزوده به `test:study:workflow` و CI موجود.
- مرجع پیش از کد: https://pandas.pydata.org/docs/user_guide/timeseries.html#resampling ؛ تفکیک timezone/time span/grouping. الگوریتم این مرحله grouping دستی با سیاست صریح است، نه پیش‌فرض pandas resample و نه dependency جدید.

نسخهٔ موتور فیزیکی **1.16.0 بدون تغییر** است. dataset/model هیچ تغییری نمی‌کند؛ فقط analytics جدید افزوده شده است. fieldValidation=false و شکاف‌های فیزیکی inventory باقی‌اند. تکمیل engineering step به معنی اعتبار میدانی یا پوشش همهٔ فیزیک‌ها نیست.

## شواهد اجرای محلی
- تست۴۲ پس از استخراج helper: PASS؛ خروجی قبلی و محاسبات مرجع حفظ شد.
- تست۴۳: PASS؛ half-open range و offset، تاریخ نامعتبر، نیمه‌شب/ماه/سال/leapday/DST، oracle مستقل Python stdlib برای روزها و RMSE، sparse/empty/flags/unavailable، چند حسگر، واحد/دما/۱۵دقیقه و انرژی، CSV injection/null، عدمmutation، bundle/clone و گزارش. شاهدهای مصنوعی از نتیجهٔ واقعی فیزیکی تفکیک شده‌اند.
- ۱۵۸ تست Python و workflow کامل: PASS. ماتریس قبلی ۸۱۹۲ قرارداد، ۴۳۵۲ رد، ۱۶ runtime و ۳۸۲۴ صرفاً قراردادی؛ نه اجرای عددی همهٔ ترکیب‌ها.
- مرورگر واقعی: PASS؛ invalid range، انتخاب خالی، نمودار۲نقطه→۱نقطه، readback واقعی JSON و دو CSV و برابری دقیق با تحلیل همان result، HTML و reset انتخاب پس از archive restore. تست اولیه زودتر از پایان asynchronous restore assert می‌کرد؛ انتظار برای پاک‌شدن observable input اضافه شد، اجرای کامل مجدد PASS. رفتار برنامه برای مخفی‌کردن خطا تغییر نکرد.
- storage browser، API/process، build، TypeScript، benchmark و audit/source/physics gates: PASS.
- lint: صفر error و۹۵ warning موجود؛ هشدار اندازهٔ chunk در build باقی است.

CI دقیق SHA پس از commit/push بررسی و در پیام نهایی لینک داده می‌شود. فایل‌های شروع با remote دقیقاً برابر بودند؛ stash حفاظتی نگه داشته شد و همان شاخه ff-only شد؛ بدون بازنویسی فایل متفاوت، history یا تغییر شاخه. هیچ force-push، merge main یا دادهٔ عملیاتی مصنوعی ساخته نشد.

## محدودیت
این قابلیت نه resampling است، نه lag correction، نه کالیبراسیون/انتخاب خودکار پارامتر. همهٔ صفرها و شب‌های valid در آمارند و threshold قبولی/نرمال‌سازی/MAPE/R² نداریم. حتی پوشش۱۰۰٪، تأیید حسگر یا نمایندگی/دقت/سالانه‌بودن مطالعه را اثبات نمی‌کند. دادهٔ عملیاتی ارائه نشده است؛ PASS نرم‌افزاری معادل field validation، bankability، P50/P90 یا گواهی مهندسی نیست.
