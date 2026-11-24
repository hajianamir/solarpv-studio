# پذیرش زیرمجموعهٔ A1 — رابط کالیبراسیون و holdout

split-conformal absolute residual برای prediction/observed kWh با مدل frozen اظهارشده، نه fit مدل یا تخمین RUL censored. شاخص دقیق k=ceil((n+1)(1-alpha)) با alpha decimal ورودی؛ بدون interpolation. k>n: radius/lower/upper/width=null و bandStatus=unbounded_insufficient_calibration؛ Infinity وارد JSON نشود و rank به n clip نشود. محدودهٔ پایین منفی حفظ شود، clipping فیزیکی فرضی مجاز نیست.

قرارداد strict با source/contextSha256/modelSha256/datasetSha256،modelTrainingEndTimestamp،durationHours مشترک،trainingSites و دو مجموعه calibration/evaluation (هرکدام1..5000). حداکثر100site در هر split،site/timestamp یکتا،پنجره‌های اندازه‌گیری هر site بدون هم‌پوشانی،siteهای سه split جدا،زمان train قبل از کل calibration و کل evaluation بعد از کل calibration. متادیتای training/model/provenance اظهارشده‌اند و صحت واقعی آنها قابل‌اثبات نیست؛ عبور این چک‌ها مجوز coverage guarantee نیست. سری زمانی و site-shift exchangeable فرض نشوند. guaranteeStatus همواره blocked_exchangeability_and_model_freeze_not_verified؛projectApproval blocked و no adoption.

خروجی radius/شاخص/sorted scores،intervalهای holdout،MAE/RMSE/bias/empiricalCoverage/meanWidth و تفکیک site؛ alpha هدف marginal coverage است، نه P90 exceedance انرژی یا CI میانگین یا بازهٔ RUL. آزمون permutation/rank finite-population مستقل،ties،unbounded،مرز decimal،عدم دخالت observed evaluation در radius،جدایی site/time،negative lower،invalid/immutable/offline الزامی.

مرجع اصلی Angelopoulos/Bates arXiv2107.07511 و notebook correctness_checks از مخزن نویسنده commit0426de356dbfa71c4c46be81d1973255ac66d050 MIT frozen؛ فقط بخش convention شاخص مورد مقایسه و اعتبارسنجی bounded است، نه اجرای تمام notebook/MC/plot یا دادهٔ پروژه. این چرخه دادهٔ تجربی PV مستقل فراهم نمی‌کند. adapter نباید این شواهد نرم‌افزاری را field calibration معرفی کند.

API/SDK/editor پشت INTERVAL_CALIBRATION_ENABLED و پرچم پایه research (default-off)،core Python آفلاین،auth/rollback/tamper/browser و full prior gates. هیچ مسیر مالی/annual-energy تغییر نکند. این زیرمجموعه harmonization کامل UQ/توزیع tail/دادهٔ معتبر پروژه یا کل A1–D3 را نمی‌بندد.
