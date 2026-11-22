# تحویل پنج مرحله گردش کار — study-insights-v1
2026-11-03؛ مبنا39f1d499f5c953eebfb5373e807031183caf1442.

## تکمیل پنج مرحله
۱. QA اطلاعاتی ورودی و نتیجه: zero/DHI>GHI/repeat با max5مثال؛ closure تقریبی و night irradiance فقط پس از اجرای واقعی با solar zenith نتیجه، بدون برآورد geometry مرورگری، داده‌سازی یا repair. threshold داخلی صریح، نه QCRad/BSRN یا گواه کیفیت.
۲. coverage UTC: ابتدا/end interval حقیقی، ساعت و fraction ماه/سال با leap/offset، complete-calendar-year و no annualization؛ تفکیک پوشش elapsed از midpoint energy allocation. مرز غیرهم‌تراز صریحاً آزموده شد؛ ماه پوشش‌دار بدون midpoint عدد انرژی جعلی دریافت نمی‌کند.
۳. comparison عددی: same-contract gate قبلی حفظ، تمام انرژی/تشخیص‌های موجود با واحد مستقل، other−current، signed net-grid، percent فقط برای baseline مثبت، missing→null نه صفر. total+monthly UI/CSV/HTML؛ بدون normalization یا attribution/gain ادعایی.
۴. monthly CSV: همه metricهای واقعی، coverage/energy midpoint hours/status، inputSHA/engine version، CRLF/quotes، عدم rounding، numeric signed energy محفوظ و spreadsheet formula guard برای stringهای بالقوه خطرناک.
۵. source ledger: منبع/کیفیت weather/equipment و چهارprofile/schedule، count، فرض temporal/thermal و scalarهای غیرفعال، execution/hash پس از اجرا؛ JSON قبل/بعد اجرا، HTML/UI و بازتولید از archive معتبر پس از restore.

## معماری و فایل‌ها
- src/studies/studyInsights.ts: محاسبات read-only و نسخه مستقل؛ نه engine.
- src/studies/studyComparisonGate.ts: stable و comparison gate از workflow بدون تغییر رفتار منتقل؛ workflow صادرات قبلی را re-export می‌کند. از وابستگی دوری workflow/report و insights جلوگیری می‌شود؛ whitelist/gates شل نشده‌اند.
- src/components/StudyInsights.tsx: review/result و منابع/پوشش/QA، memoized.
- StudyBuilder.tsx، PvlibStudyPanel.tsx، StudyLibrary.tsx: فرم/JSON، دانلودها و comparison.
- studyWorkflow.ts: گزارش‌ها + رد solarZenith مفقود/غیرعددی/خارج0..180 در validation نتیجه قبل restore تا render crash رخ ندهد. مقدار حدسی ایجاد نمی‌شود.
- scripts/test-study-insights.ts: شاهد مستقل؛ package.json آن را به test:study:workflow و CI موجود Ubuntu/Windows وصل می‌کند؛ browser script دانلود/readback واقعی را می‌سنجد.
- راهنما PVLIB-WORKFLOW-FIVE.fa.md و لینک‌های دو راهنمای موجود؛ PLAN و این DELIVERY.

**workerPython، requirements، schema ورودی و حسابداری انرژی تغییر نکرده‌اند. موتور1.8.0 همان است؛ تغییر output عددی/فیزیکی برای هیچ opt-in یا حالت قبلی صورت نگرفته است.** قالب ذخیره‌سازی/archive جدید نیست؛ تحلیل read-only از داده معتبر دوباره مشتق می‌شود و فیلد تحلیل واردشده را authoritative نمی‌گیرد. وابستگی npm جدید اضافه نشده است.

## شواهد محلی موفق
- npm run lint: بدون خطا،95هشدار موجود؛ build موفق.
- 91/91Python: تمام آزمون‌های baseline فیزیکی موفق.
- test:study:workflow: workflow قبلی + آزمون مستقل جدید با actualPython موفق؛ coverage 6h/half-hour/offset، سال8784ساعت، leap February، مرز ماه/سال،23:40..00:40 و ماه فاقدmidpoint؛ no mutation، QA arithmetic، bounded examples، zero/negative/missing deltas و واحدWh/Whm2، gate incompatibility، CSV readback مستقل و formula/HTML escaping، source/inactive inputs و archive derivation.
- test:study: actual API/auth/Python/resource/failure موفق.
- test:study:browser: ورود فرم وCSV، QA unavailable پیش از اجرا، JSON diagnostic pre/post، CSV ماهانه و comparison readback عددی واقعی، ledger/HTML، تطبیق کامل تحلیل پس از IndexedDB restore بدون اجرای جدید، archive هندسه ناقص رد و نتیجه قبلی حفظ، عدم crash و screening unchanged؛ همه موفق.
- npm test، test:browser و PHYSICS_DIFF_BASE=39f1d49 npm run test:audit موفق.
- git diff --check موفق.

در اولین typecheck، inferred نوع entries ledger بیش از حد محدود بود؛ با annotation صریح component/source/quality/count برطرف شد. هیچ suppress/any یا masking برای عبور از تست اضافه نشده است. پس از جداسازی gate و پالایش coverage، زنجیره نهایی lint/build/workflow/API/browser دوباره اجرا و موفق شد.

Generic physics-reference gate فرمول‌های جدید workflow را certify نمی‌کند؛ آن pass صرفاً عدم تغییر engine منتخب را نشان می‌دهد. شاهد عددی مستقل و browser readback برای محاسبات جدید ثبت شده؛ نه hash exception یا literal masking.

## منابع و مرز اعتبار
پیش از کد pvlib0.13.1 complete_irradiance equation، RFC4180 و W3C PROV overview خوانده شدند؛ URL و کاربرد دقیق در PLAN/راهنما. fetch صفحه PVPMC شکست خورد و منبع خوانده‌شده ادعا نشده است. نه use از API پرکردن داده، نه QC استاندارد، نه PROV serialization/certification، نه field/calibration/bankability/SAM equivalence؛ Docker آزموده نشده است.

CI برای SHA نهایی پس از selective commit/push پیگیری می‌شود و نتیجه exactSHA/URL در پیام تحویل اعلام خواهد شد؛ این سند پیش از CI است و گواه CI نیست. شاخه session حفظ، push فقط همان شاخه، بدون merge/main/history rewrite.
