# F0/F1 — موجودی قابل‌آزمون و پایهٔ داده/SDK

## Intake و دامنه
- F0 غیرپژوهشی/حاکمیت ادعا: مهندس و ممیز بتوانند تمام ۳۳ ردیف ممیزی را با مسیر کد و تست مشاهده کنند؛ نبود executor با نام مدل اشتباه نشود.
- F1 زیرساخت مشترک عملیاتی/پژوهشی: تحلیلگر بتواند دادهٔ توان خارجی یا SCADA را با context و افق مشخص بررسی کند و پژوهشگر از پایتون job موجود را فراخوانی کند؛ بدون تغییر انرژی/مالی.
- مبنا `AUDIT-FULL-CAPABILITY-REPLAN.fa.md`؛ معیار تکمیل این فاز، زیرساخت comparison و SDK پایه است، نه ingest زندهٔ SCADA، پذیرش انرژی یا SDK کامل فاز E.

## Discover و تصمیم‌های محافظه‌کارانه
از `ResearchExecutor` و API شش‌عملیاتی موجود استفاده شد؛ executor یا auth موازی جدید ساخته نشد. timeout، یک job هم‌زمان، محدودیت خروجی، abort و process-tree termination موجود حفظ شدند و تست‌های قبلی دوباره اجرا می‌شوند. job ID جدید صرفاً UUID درخواست در header است؛ durable job، checkpoint/resume، polling یا retry خودکار معرفی نشده‌اند. قطع اتصال/AbortSignal مسیر cancellation است. این محدودیت در capabilities API اعلام می‌شود.

قرارداد measurement قبلی تغییر نکرد؛ فرمت جدید برای منشأهای PV/wind/grid/hybrid و هویت پروژه/دارایی جدا و نسخه‌دار است. هیچ adapter تبدیل مستقیم به `OperationalEnergy` اضافه نشده است. پروژه/revision ارائه‌شده در فایل **اظهار کاربر** است نه attestation مستقل؛ برای همین حتی بررسی موفق داده هم gate پژوهش را فعال نمی‌کند. UI فقط موقعیت سایت جاری را با target بررسی می‌کند؛ این اثبات تطابق کل پروژه نیست.

## Taskها / فایل‌ها
1. `src/capabilities/manifest.json` و `.ts`: ۱۸ ردیف N و ۱۵ ردیف R، classification، partial/planned، limitations، مسیر executor/UI/test و سطح evidence. تمام linkها شاهد زیرساخت مرتبط‌اند، نه پذیرش کل قابلیت؛ tests خالی به‌صراحت نبود شاهد مستقیم را نشان می‌دهد.
2. `modelRegistry.ts`: سه مدخل FPV، LCA و hydrogen به‌عنوان planned declaration علامت‌گذاری و به شناسه‌های ممیزی متصل شدند؛ شماره‌نسخه‌های تاریخی یا فرمول‌ها بازتفسیر نشدند.
3. `externalSeries.ts`: schema، reader strict، temporal/context review و انتگرال توان interval-mean.
4. `src/server/researchApi.ts`: دو endpoint flagدار و job header؛ احراز هویت قبل از parsing برای داده.
5. `ExternalDataReview.tsx` در ResearchEditor/Climate: import→review→download، cancel و invalidation سایت/توکن؛ بدون adoption controls.
6. `sdk/solarpv_sdk`: client استاندارد Python، flags، bounds، timeout، پاسخ input-bound برای run و guard مرز پژوهشی.
7. تست‌های foundation، مرورگر، SDK و گیت receiptدار؛ نمونهٔ synthetic و این راهنما.

## Design: feature flags و rollback
| flag | پیش‌فرض | اثر |
|---|---|---|
| `CAPABILITY_AUDIT_ENABLED=true` | خاموش | GET موجودی قابلیت‌ها را فعال می‌کند |
| `EXTERNAL_DATA_ENABLED=true` | خاموش | POST مقایسهٔ داده را فعال می‌کند؛ UI از capabilities وضعیت می‌گیرد |
| `PVLIB_RESEARCH_ENABLED=true` | همان پیش‌فرض قبلی خاموش | اجرای مدل پژوهشی موجود |
| SDK `Client(..., enabled=True)` | خاموش | اجازهٔ صریح درخواست شبکه به سرور تعیین‌شده |

برای فعال‌سازی باید پیکربندی احراز هویت معتبر فعلی نیز موجود باشد؛ نمونه‌های تست توکن واقعی نیستند. خاموش‌کردن هر flag endpoint مربوط را 503 می‌کند. هیچ migration مخرب یا تغییر دادهٔ پروژه وجود ندارد. حذف panel یا خاموش‌کردن flag rollback است؛ قرارداد measurement قدیمی همچنان برقرار است. این قابلیت آزمایشی پیش‌فرض محصول را تغییر نمی‌دهد.

## API و قرارداد داده
- `GET /api/v1/research/capability-audit`: manifest عمومی غیرحساس یا 503؛ no-store.
- `GET /api/v1/research/capabilities`: افزوده‌های backward-compatible `externalDataEnabled` و `jobPolicy` شامل محدودیت‌های پیش‌فرض executor و عدم persistence/retry. `runtimeStatus=not_probed` همچنان به معنی بررسی‌نشدن runtime است.
- `POST /api/v1/research/data/review`: `{series,target}`؛ JWT یا gateway احراز هویت‌شدهٔ موجود، حداکثر ۶ درخواست در دقیقه به روش limiter فعلی و حداکثر ۴MiB JSON strict. duplicate keys، عمق زیاد، nonfinite، نسخه/فیلد ناشناخته رد می‌شوند. هیچ محتوای ورودی یا توکن log نمی‌شود.
- `POST /api/v1/research/run`: همان قرارداد قبلی، header جدید `X-SolarPV-Job-Id` برای درخواست معتبر اجرا؛ ID ذخیره نمی‌شود. cancel=قطع اتصال، timeout پیش‌فرض ۱۲۰ثانیه، یک هم‌زمان، input ۸MiB و output ۳۲MiB؛ تغییر تنظیمات executor در تست‌ها ممکن است، capabilities وضعیت runtime واقعی را attest نمی‌کند.
- خطاها: DISABLED، AUTH_NOT_CONFIGURED، AUTH_REQUIRED، INVALID_INPUT، rate limit؛ parser/size error عمومی و بدون echo payload. مسیر اجرای مدل همان CANCELLED/BUSY/TIMEOUT/OUTPUT_LIMIT و خطاهای قبلی را حفظ می‌کند.

### external-series-v1
- kind: external_generation یا scada؛ origin: pv/wind/grid/hybrid/meter. grid به‌عنوان **تولید تجدیدپذیر** قبول نمی‌شود؛ برای واردات شبکه از scada استفاده کنید.
- context: projectId/assetId/projectRevisionSha256/latitude/longitude و boundary=array_dc/inverter_ac/poi؛ target دقیقاً همین context و start/end/interval دارد.
- مقدارها W یا kW، میانگین بازه، timestamp پایان بازه با offset صریح، timezone معتبر IANA و تطابق local-clock با آن. نگاشت زمانی با instant UTC است؛ DST را با offset واقعی ارائه کنید. هیچ shift/fill/resample ضمنی وجود ندارد.
- missing فقط null با reason؛ excluded نیازمند reason؛ valid finite. generation غیرمنفی؛ scada می‌تواند signed باشد. فیلد اجباری `powerConvention=positive_export_negative_import` جهت را ثابت می‌کند: مثبت به سمت خروج/شبکه و منفی ورود. دادهٔ کنتور با قرارداد معکوس باید پیش از import با منشأ تبدیل مشخص اصلاح شود؛ تشخیص خودکار جهت کنتور وجود ندارد.
- حداکثر ۱۷۵۶۸ record و ۳۶۶ روز؛ بنابراین سال کامل ۳۰/۶۰دقیقه‌ای پوشش دارد ولی سال کامل ۱۵دقیقه‌ای عمداً خارج از بودجهٔ این نسخه است و reject می‌شود، نه downsample مخفی.
- target از ابتدا **exclusive** تا انتها **inclusive** بر اساس interval-end؛ برای calendar year، start=اول ژانویه ساعت صفر و end=اول ژانویه سال بعد ساعت صفر است.
- دادهٔ با gap می‌تواند وارد review شود ولی موفق کامل نمی‌شود. ردیف خارج از افق، واحد/بازه نامعتبر یا context متفاوت گزارش/رد می‌شود. خروجی partial هرگز energy تخمینی نمی‌دهد.
- digest canonical ورودی و target برای integrity/replay است، نه امضای منشأ یا گواه کالیبراسیون.

### نتیجه
`verified_for_comparison / context_mismatch / interval_mismatch / incomplete_coverage`؛ coverage شامل expected/valid/missing/excluded/absent/outside است. `comparisonEnergyWh` فقط با پوشش کامل، context و interval یکسان تولید می‌شود. محاسبه: Σ P(W) × Δt(h). دادهٔ kW با ضریب ۱۰۰۰ تبدیل می‌شود. هیچ extrapolation یا correction وجود ندارد. این مقدار انرژی مشاهده/اظهارشده برای **مقایسه** است نه annual yield مدل.

همیشه `validationStatus=not_field_validated`، `energyAdoption=false`، `financeMutation=false` و `researchGate.status=blocked` است. فعال‌سازی gate پذیرش پژوهش در F1 مجاز نیست؛ حتی پروندهٔ کامل یا hash صحیح جای gate ثبت‌شده و evidence مستقل را نمی‌گیرد.

## UI و امنیت lifecycle
در اقلیم → ResearchEditor، panel مقایسهٔ تولید خارجی/SCADA قرار دارد؛ از توکن حافظه‌ای editor یا gateway معتبر استفاده می‌کند. فایل JSON نمونه در `docs/examples/external-series.synthetic.json` است و باید context آن با سایت جاری و هدف مطالعه تطبیق داده شود. نمونه فقط برای تست است.

وضعیت‌ها: idle/loading/loaded/running، چهار وضعیت review، invalid_or_site_mismatch و failed_or_cancelled. نتیجه پس از تغییر فایل، سایت یا توکن، cancel یا unmount invalidate می‌شود؛ پاسخ دیرهنگام نمایش داده نمی‌شود. import جدید قبلی را قابل اجرا نگه نمی‌دارد. دانلود receipt شامل metadata منبع است؛ محرمانه نگه دارید. هیچ داده‌ای بدون کلیک review به سرور ارسال نمی‌شود؛ storage محلی/DB یا مالی تغییر نمی‌کند. نمایش این پنل حتی با flag خاموش صرفاً وضعیت disabled دارد.

## SDK پایه و راهنمای اجرا
نصب از source: `python -m pip install ./sdk`؛ ساخت package ممکن است به setuptools نصب‌شده نیاز داشته باشد، runtime SDK هیچ وابستگی ثالث ندارد. نصب موتورهای Python روی سرور همچنان با requirements نسخه‌قفل موجود است. API محلی پس از نصب آفلاین کار می‌کند؛ SDK فقط در اثر فراخوانی صریح به origin انتخاب‌شده وصل می‌شود.

```python
from solarpv_sdk import Client
client = Client('https://your-solarpv-server.example', token, enabled=True)
review = client.review_data(series, target)
job = client.run({'operation': 'electrochemical_spm', 'plan': plan})
# job['jobId'] شناسهٔ موقت درخواست، نه رکورد persistent است.
```

HTTPS اجباری است مگر loopback HTTP برای توسعه؛ URL دارای credentials/path/query/fragment رد می‌شود، redirect و proxy محیطی استفاده نمی‌شوند، token ذخیره/چاپ نمی‌شود. timeout حداکثر ۳۰۰ثانیه، ورودی/خروجی محدود؛ retry خودکار وجود ندارد. `run` hash و canonical request binding و research boundary را بررسی می‌کند؛ validation کامل فیزیکی در سرور انجام می‌شود. `review_data` boundary نتیجه را بررسی می‌کند ولی گواه صحت مستقل محاسبات سرور نیست. تست محلی: `PYTHONPATH=sdk python -m unittest discover -s sdk`.

اسکریپت `sdk/example.py` فقط با origin/token و opt-in صریح محیطی کار می‌کند؛ توکن در source نگذارید. عملیات transient/monte_carlo، resume و durable batch هنوز عرضه نشده‌اند؛ این‌ها فاز E/R15 باقی می‌مانند، نه وعدهٔ SDK پایه.

## Acceptance criteria / Verify
1. manifest دقیقاً ۳۳ ID یکتا و classification صحیح، status محافظه‌کارانه، مسیرهای موجود و external blockers داشته باشد؛ duplicate/missing رد شود.
2. افزودن planned metadata رفتار numerical registry/trace را تغییر ندهد؛ رگرسیون‌های فعلی حفظ شوند.
3. finite/unit/sign/offset/DST/leap/duplicate/order/size/depth/unknown fields، context و پوشش کامل با تست positive/negative بررسی شوند؛ source mutate نشود.
4. مرجع مستطیلی: ۲kW و ۳kW برای دو ساعت = ۵۰۰۰Wh؛ signed SCADA = −۵۰۰۰Wh؛ سال کبیسه ۱kW ثابت = ۸۷۸۴۰۰۰Wh. missing/excluded/gap/outside نباید انرژی قابل مقایسه ایجاد کنند.
5. route جدید auth-before-parser، flag-off، body bound و rate limit را رعایت کند؛ مدل‌های قبلی و cancel/resource tests پاس بمانند.
6. SDK به API واقعی برای یک محاسبهٔ numerical و review وصل شود؛ binding/tamper/nonfinite/credentials/disabled/unsupported رد شوند؛ header UUID دریافت شود.
7. مرورگر fa/en import/review/download و تغییر سایت/لغو/پاسخ دیرهنگام را با API واقعی بررسی کند؛ هیچ adoption setter وجود نداشته باشد.
8. types، lint محدوده، build، رگرسیون API/physical/UQ production/offline پاس شوند؛ receipt hash فایل‌ها و وضعیت blockers را ثبت کند.

فرمان گیت: `PVLIB_PYTHON="$PWD/.venv/bin/python" npm run verify:foundation`.
رسید: `docs/audit/F0-F1-GATE.json`. runtime timestamp به ساعت محیط وابسته است؛ hash محتوای فایل‌ها مبنای بازتولید است. workflow جدید `.github/workflows/foundation-acceptance.yml` همین گیت را روی Linux با requirements پژوهشی اجرا و رسیدها را artifact می‌کند؛ اجرای remote در این جلسه ادعا نمی‌شود.

آزمون ساخت wheel و نصب در مسیر آزمایشی هم جدا اجرا شد و import بستهٔ نصب‌شده PASS شد. تلاش نخست با `--no-build-isolation` به علت نبود wheel/setuptools مناسب در venv شکست خورد؛ ساخت استاندارد isolated با نصب build requirements و سپس نصب wheel موفق شد. این نیاز مربوط به نصب/ساخت است، نه اجرای موتور یا runtime SDK. فایل‌های build/egg-info از Git مستثنا شده‌اند.

## محدودیت‌ها / ریسک / توقف
- metadata کاربر و comparison verify مدرک مستقل field validation یا تطابق پروژهٔ فعال نیستند؛ adoption عمداً غیرممکن است.
- ingestion زنده، ذخیرهٔ بلندمدت SCADA، جریان چندمتغیره/دمایی، asset hierarchy، resampling و پوشش سالانهٔ sub-30min در scope این نسخه نیستند.
- manifest تست‌های مرتبط را معرفی می‌کند؛ لینک یک فایل یعنی کل قابلیت PASS نیست. همهٔ maturityها partial/planned‌اند و هیچ capability field validated اعلام نشده است.
- احراز هویت/limiter و execution limits موجود reuse شده‌اند؛ isolation سطح container/cgroup و سقف RSS سخت سیستم‌عامل در این فاز اضافه نشده است. data review محاسبهٔ خطی bounded سمت سرور است؛ simulation سنگین همچنان Python است.
- native Safari/Windows، حقوق LICENSE و دادهٔ مستقل همچنان گیت بیرونی‌اند؛ گیت نرم‌افزاری این فاز مجوز انتشار عمومی نیست.

## سه پاسخ و Changelog
ورود ناخواستهٔ پژوهش به مالی؟ خیر، هیچ adoption adapter یا setter اضافه نشده و gate blocked ثابت تست می‌شود. رگرسیون/عدد؟ تست‌های جدید و قبلی در فرمان تجمیعی اجرا می‌شوند. precision/limits/provenance؟ schema/output/UI/راهنما آن‌ها را صریح نگه می‌دارند؛ error عددی شناور IEEE-754 با دقت میدانی اشتباه نمی‌شود.

افزوده‌ها: capability manifest/API، planned registry annotations، comparison data schema/API/UI و پایهٔ SDK با شناسهٔ موقت job. فرمول PV/مالی/dispatch یا measurement schema قبلی تغییر نکرد. ادامهٔ پیشنهادی پس از پاس گیت: A1/A2 روی قرارداد دادهٔ جدید و F1-persistence در صورت نیاز مرحلهٔ E؛ بدون فعال‌کردن خودکار adoption.
