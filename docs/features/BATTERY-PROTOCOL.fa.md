# B2 — پروتکل جریان باتری با پارامتر منتشرشده

وضعیت: اتصال API/SDK/editor پیاده شده و default-off است؛وضعیت پذیرش نرم‌افزاری فقط در docs/audit/BATTERY-PROTOCOL-GATE.json پس از اجرای verify:battery-protocol معتبر است. این بخش کل B2 نیست. معیار پذیرش در BATTERY-PROTOCOL-SPEC.fa.md ثبت است. عملیات قدیمی battery_pybamm تغییر نکرده است. rollback: خاموش کردن BATTERY_PROTOCOL_ENABLED؛عملیات قدیمی مستقل باقی می‌ماند.

## اجرا
بعد از نصب صریح requirements-science-b.txt در محیط research:

```sh
.venv/bin/python -m unittest scripts.test_battery_protocol -v
.venv/bin/python - <<'PY'
import json
from services.pvlib_research.battery_protocol import battery_protocol
p=json.load(open('docs/examples/science-b/protocol.synthetic.json'))['plan']
r=battery_protocol(p)
print(r['output']['numericalGate'])
PY
```

جریان مثبت تخلیه،منفی شارژ؛نمونهٔ synthetic سه segment سی‌ثانیه‌ای +1/0/-1A دارد و دادهٔ آزمایش سلول نیست. هر segment شامل دو سمت مرز زمانی مشترک است: ولتاژ با تغییر جریان می‌تواند جهش کند،ظرفیت و دما باید پیوسته بمانند. رخداد cutoff کل خروجی را رد می‌کند. output شامل چهار run مستقل mesh/tolerance/internal-step-bound و ledger انتگرال جریان و تفکیک حرارت است. دقت floating-point یا passed numericalGate،صحت فیزیکی/ایمنی/عمر یا تضمین همگرایی عمومی نیست. اختلاف زمانی صفر هم ممکن است: solver می‌تواند در هر دو اجرا گام‌های تطبیقی کوچک‌تر از bound انتخاب کند؛تعداد گام پذیرفته‌شده در این نسخه گزارش نمی‌شود.

## منشأ و سه بازبینی محدود
1. قرارداد upstream: پارامترهای Chen2020 و OKane2022 و آزمون step_with_inputs و مجوز از مخزن رسمی PyBaMM v25.10.2،commit313dd7f5793ae24429b1c5f814bd795637600305،درmanifest باSHA256 frozen شدند. آزمون منتخب upstream مستقیماً ازAST فایل frozen اجرا می‌شود؛ادعای اجرای کل suite بالادست نیست. کد parameter نصب‌شده باید دقیقاً hash برابر داشته باشد.
2. معناشناسی زمان: بررسی کد/اجرای Simulation.step نشان داد save=False state را حمل می‌کند و trace همان segment را نگه می‌دارد؛sub_solutions[-1] باsave=True ممکن است فقط زیرگام آخر باشد و استفاده نشد. مستند داخلی CasADi IDAS max_step_size از dt_max (پنجرهٔ event) و output sampling جداست؛هر دو bound تنظیم می‌شوند.
3. مرز شواهد: جست‌وجوی مستند رسمی parameter_sets نشان می‌دهد پارامتر OKane2022 ادعای بازنمایی واقعی همهٔ مقادیر سلول ندارد. هیچ raw measured-cell dataset،calorimetry یاrunaway benchmark به دست نیامده است. آزمون constant-current فقط regression با solver قبلی است؛oracle مستقل charge integral/heating ledger اعتبار نرم‌افزاری می‌دهد نه دقت سلول.

## باقی‌مانده پیش از پذیرش
strict TS schema و witness،API احرازهویت‌شده و flag مستقل،SDK/editor،tamper/rollback/browser،budget پاسخ و زمان اجرای server،راهنمای نهایی وchangelog،و اجرای مجدد کل nested gateها لازم‌اند. افزودن چهار مرجع جدید manifest/script،receiptهای قدیمی را تازه نمی‌کند؛آن‌ها گواه snapshot قبلی‌اند. هیچ دادهٔ پژوهشی وارد annual-energy یا finance نمی‌شود. این بخش و کل درخواست A1–D3 هنوز ناتمام‌اند.

## دریافت دادهٔ واقعی — جدا از gate مدل

مسیر docs/reference-data/chen-validation شامل هر سه CSV دست‌نخوردهٔ اصلی است؛مجوز CC-BY-4.0 از API ناشر اصلی تأیید شد. راهنمای انتساب ATTRIBUTION.md و acquisition manifest مستقل از37مرجع نرم‌افزاری هستند. scripts/acquire_chen_validation.py به‌طور پیش‌فرض آفلاین verify می‌کند؛--fetch فقط build-time و صریح است. scripts/test_chen_validation_data.py دو آزمون روی19,000ردیف تقریبی،checksum ناشر و معناشناسی mode/time اجرا می‌کند. این آزمون داده است نه سنجش خطای مدل. جریان CSV magnitude است و direction درMd است؛دو timestamp مساوی مرزی در هر سلول عمداً حفظ می‌شوند.
