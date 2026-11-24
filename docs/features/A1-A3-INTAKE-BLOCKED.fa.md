# A1–A3 — بررسی ورودی و توقف در پیش‌نیاز داده

## وضعیت این نوبت
**A1: blocked_missing_evidence؛ A2: not_started؛ A3: blocked_missing_evidence.**
این سند تحویل پیاده‌سازی A1–A3 نیست. کد محصول یا فرمول‌های موجود در این نوبت تغییر نکرد. مطابق دستور توقف در نبود دادهٔ لازم برای اعتبارسنجی، اجرای کامل این سه فاز اعلام نمی‌شود. A2 به‌خودی‌خود به SCADA میدانی وابسته نیست و می‌تواند در یک چرخهٔ مستقل با موارد مرجع synthetic/LP اجرا شود؛ شروع‌نشدن آن نقص داده‌ای A2 محسوب نمی‌شود.

## تطبیق با برنامهٔ مصوب
در `docs/AUDIT-FULL-CAPABILITY-REPLAN.fa.md`:
- A1 علاوه بر F1، «دادهٔ budget معتبر» می‌خواهد: کالیبراسیون، tail CI/convergence، Nested MC و GSA. ضرایب اکتشافی مالی و ورودی‌های فرضی برای اعلام UQ پروژه‌ای کافی نیستند.
- A2 به F1 وابسته است: sizing خارجی روی dispatch، قیود تحویل و auxiliaries/HVAC؛ مرجع عددی کوچک قابل تهیه است.
- A3 علاوه بر F1، «SCADA مجاز و reference مستقل» می‌خواهد؛ بدون آن صرفاً research status مجاز است.

## شواهد بررسی‌شده
- `services/pvlib_research/uncertainty.py`: بودجهٔ پژوهشی مشروط، systematic/interannual و ماتریس همبستگی دارد؛ صریحاً field calibration یا تبدیل RMSE به CV انجام نمی‌دهد.
- `src/studies/fieldEvidenceReview.ts`: مدارک کاربر را بررسی می‌کند اما صحت اصل مدارک، امضا و استقلال داور را تأیید نمی‌کند؛ حتی dossier کامل `not_field_validated` باقی می‌ماند.
- `docs/examples/external-series.synthetic.json`: منشأ SYNTHETIC، کیفیت assumed، دو رکورد تولید باد فرضی و project hash آزمایشی دارد؛ SCADA واقعی یا مرجع مستقل نیست.
- نمونه‌های measurement موجود با نام synthetic مشخص شده‌اند. پروندهٔ پروژه‌ای واجد پیش‌نیاز A1/A3 در ورودی این درخواست ارائه نشده و در مسیرهای بررسی‌شده احراز نشد. این نتیجه اثبات نبود تمام داده‌ها خارج از مخزن نیست.
- رسید `F0-F1-GATE.json` گیت نرم‌افزار پایه را پاس و evidence بیرونی را مسدود اعلام می‌کند؛ این رسید مجوز استفاده از دادهٔ synthetic به‌جای شواهد پروژه نیست.

## قرارداد شواهد لازم برای رفع توقف
### A1
1. context پروژه و افق تک‌سال/چندساله، مرز AC/DC/POI و baseline version/hash؛
2. budget عوامل با واحد/توزیع/دامنه، منشأ و بازهٔ کاربرد هر CV و bias؛
3. ماتریس همبستگی معتبر و منشأ فرض‌های systematic/interannual/cross-group؛
4. دادهٔ مرجع مستقل یا پروتکل benchmark مشخص و قابل اجرا برای کالیبراسیون ادعای پروژه؛
5. tolerance صدک و معیار همگرایی از پیش تعیین‌شده؛ نبود tolerance نباید پس از دیدن نتیجه با مقدار دلخواه جبران شود.

روش عمومی tail/Nested/GSA را می‌توان جداگانه با مرجع تحلیلی ساخت، ولی این کار به معنی تکمیل A1 پروژه‌ای یا bankability نیست. در این نوبت چنین هسته‌ای نیز اضافه نشده است.

### A3
1. batch SCADA با مجوز استفاده و شناسهٔ دارایی/context و زمان‌بندی/واحد/جهت توان روشن؛
2. baseline frozen مستقل و منشأ آن، نه baseline تنظیم‌شده روی همان evaluation؛
3. وضعیت outage/curtailment و کیفیت/کالیبراسیون اندازه‌گیری؛
4. split زمانی/سایتی و معیار false alarms/site-day از پیش ثبت‌شده؛
5. سیاست دادهٔ محرمانه: داده یا توکن واقعی در Git و log قرار نگیرد؛ مسیر کنترل‌شدهٔ محلی/سروری استفاده شود.

نبود هر مدرک به معنی انتظار برای تأیید دستی نیست؛ gate باید `blocked_missing_evidence` بدهد. امضا یا مدرک ناموجود با یک boolean `approved=true` جایگزین نمی‌شود.

## رگرسیون‌های دوباره‌اجراشده
سه فرمان زیر با `PVLIB_PYTHON=.venv/bin/python` و exit code صفر اجرا شدند:
- `scripts/test-energy-uncertainty-review.ts`: oracle مستقل NumPy/NormalDist، correlation، P90/mean، invalid/annual/zero-export و immutability.
- `scripts/test-advanced-dispatch.ts`: optimum گسسته در مقابل enumeration مستقل Python، ۲۰ حالت اضافی، feasibility/SOC/lifecycle و مقایسهٔ policy؛ optimum طراحی پیوسته ادعا نمی‌شود.
- `scripts/test-field-evidence-review.ts`: worker واقعی، holdout و مدارک/context؛ synthetic و نه field validation.

این‌ها سلامت زیرساخت موجودند؛ تست قابلیت‌های جدید A1–A3 محسوب نمی‌شوند. build، تست مرورگر یا کل گیت F0/F1 در این نوبت دوباره اجرا نشده است.

## پذیرش لازم پیش از اعلام تکمیل آینده
- A1: CI دُم و چند seed/budget، oracle total variance و خطای MC، Ishigami/linear GSA، رفتار correlated inputs صریح و گیت calibration؛ هیچ تغییر خودکار مالی.
- A2: قرارداد ظرفیت/cost/HVAC نسخه‌دار، discrete-vs-continuous gap صریح، energy/cost ledger، LP یا exhaustive oracle و UI/API flagدار؛ عدم feasible بودن با fallback پنهان پوشانده نشود.
- A3: batch ingest و frozen baseline، residual/drift/HI/clustering، exclusion رخدادها، holdout و false alarms؛ بدون شواهد فقط برچسب پژوهشی، بدون RUL عملیاتی.
- برای هرکدام: acceptance، tests/unit/integration/regression، feature flag خاموش پیش‌فرض و تست فعال، rollback، provenance/precision، راهنمای کاربر و receipt مستقل.

## سه پاسخ کیفیت
- پژوهش ناخواسته وارد مالی شده؟ خیر؛ هیچ مسیر یا محاسبه‌ای تغییر نکرده است.
- تست و مرجع؟ رگرسیون‌های مشخص موجود پاس‌اند؛ قابلیت‌های جدید ساخته/تست‌شده اعلام نشده‌اند.
- دقت/محدودیت/منشأ؟ صریح است: شواهد synthetic، عدم احراز calibration/SCADA مستقل و توقف اجرای فازهای درخواستی.

## Changelog / ادامه
این نوبت فقط بررسی پیش‌نیاز، اجرای مجدد سه رگرسیون و ثبت توقف انجام شد. rollback محصول لازم نیست، چون رفتار محصول تغییر نکرد. ادامهٔ مستقل A2 از نظر داده‌ای ممکن است؛ A1/A3 پروژه‌ای تا وجود شواهد توصیف‌شده مسدودند. هیچ‌کدام از این سه فاز «تمام‌شده» نیست.

## پیگیری درخواست جدید
پس از درخواست استفاده از پروژه‌های منتشرشده، هسته‌های محدود benchmark/LP/batch research در `A1-A3-ANALYTICS.fa.md` پیاده‌سازی شدند. این یادداشت توقف تاریخی است؛ مانع داده برای ساخت هستهٔ عددی رفع شده، اما ادعای project calibration و field validation همچنان مسدود است. تکمیل تمام دامنهٔ A1–A3 از این پیگیری نتیجه نمی‌شود.
