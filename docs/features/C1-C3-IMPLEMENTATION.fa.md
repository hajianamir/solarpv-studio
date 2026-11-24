> به‌روزرسانی: شکاف ادغام محصولی پنج kernel اکنون بسته شده است. وضعیت فعلی و آزمون‌ها در [C1-C3-INTEGRATION.fa.md](C1-C3-INTEGRATION.fa.md) آمده است؛ متن زیر سابقهٔ تحویل kernel-only است، نه توصیف فعلی API. محدودیت‌های علمی همچنان معتبرند.

# C1–C3 — تحویل فعلی هسته‌های عددی، نه پایان فازها

## وضعیت واقعی

پنج kernel در `services/pvlib_research/science_c.py` و پنج ورودی synthetic در `docs/examples/science-c/` اضافه شد. **این مرحله هنوز API، SDK، UI، feature flag عملیاتی C و اعتبارسنجی مستقل TypeScript ندارد.** مشخصات SPEC اهداف ادغام آینده را بیان می‌کند، نه قابلیت تحویل‌شده. هیچ route عمومی یا worker operation برای C ثبت نشده است؛ بنابراین مسیر تولید، پژوهش موجود و امور مالی به این kernels دسترسی ندارند. فعال‌سازی صرفاً با متغیر محیطی ممکن نیست.

| فاز | اکنون قابل اجرا در Python | هنوز انجام‌نشده / مسدود |
|---|---|---|
| C1 | Volt–Var، frequency–watt، محدودیت P/Q و جریان، پاسخ پله، غربال deadline با rulepack اظهاری | rulepack رسمی ثبت‌شده، GFM، آزمون mode-step تجهیز، anti-islanding و گواه |
| C2 | Agri paired bucket/LUE/PAR/LER؛ FPV implicit water/heat ledger | holdout محصول/مخزن، coupling میکروکلیما، دمای ماژول FPV، qualification میدانی |
| C3 | polarization/Faraday، startup/aux/ramp، PV-T/PCM enthalpy | کالیبراسیون PEM، اتصال PV-T به PEM، spatial Stefan و تست تجهیز |

## اجرا

از ریشهٔ repository و محیط علمی نصب‌شده:

```sh
.venv/bin/python -m unittest scripts.test_science_c -v
PVLIB_PYTHON="$PWD/.venv/bin/python" npm run verify:science-b
```

برای پژوهش مستقیم، JSON مثال را load کنید و به تابع متناظر `grid_support`، `agri_water`، `fpv_balance`، `pem_dispatch` یا `pvt_pcm` بدهید. نتیجه envelope پژوهشی با hash ورودی و وضعیت‌های `not_field_validated` / `projectApproval=blocked` / `safetyApproval=not_assessed` دارد. وضعیت `insufficient_evidence` عمدی است و با pass یک آزمون عددی به تأیید پروژه تبدیل نمی‌شود.

## شواهد اجرا

۲۰ تست Python موفق: پاسخ نمایی شبکه، droop و افت ولتاژ، deadline/missing/context، DLI/yield/LER، شاهد یکسان Agri، خشکی/سرریز، پاسخ بستهٔ implicit Euler مخزن، تراز آب/انرژی و توقف حجم، Faraday/جرم/انرژی و polarization مستقل، startup/ramp/افت توان، زمان نهان PCM و گذرای sensible، PV/سیال/تراز حرارت، strict keys/grid، immutability و import+execution در فرایند تازه با socket مسدود.

کل `verify:science-b` دوباره با موفقیت اجرا شد: شش مرحله شامل تست‌های B، API/SDK، lint، verify:portfolio (رگرسیون پیشین)، مرورگر production B و pip check. این رگرسیون، آزمون UI/API جدید C نیست؛ چنین ادغامی هنوز وجود ندارد.

## قرارداد و دقت

- ورودی‌ها صریح، محدود و finite هستند، timestamp دارای offset و grid دقیق لازم است. records ثابت در هر بازه‌اند؛ timestamp شروع بازه است و خروجی حالت در انتهای آن. screen شبکه از connected اظهاری برای همان انتهای بازه استفاده می‌کند، نه مشاهدهٔ مستقل تجهیزات؛ event داخل بازه قابل تفکیک نیست.
- ریشه‌گیری PEM با `xtol=1e-10 A` و PCM با `xtol=1e-7 J/m²` انجام می‌شود. این‌ها تنظیم حل‌گرند، نه تضمین accuracy فیزیکی. floating-point double و خطای واحد/مدل همچنان مهم‌اند.
- FPV دو timestep دارد، gate از بیشترین اختلاف دما استفاده می‌کند. PCM علاوه بر اختلاف دما، اختلاف enthalpy تقسیم بر ظرفیت sensible را gate می‌کند تا plateau ذوب خطای پنهان نکند. هیچ‌کدام اثبات همگرایی PDE نیستند.
- آب استوکیومتری PEM از جمع جرم H2 و نصف O2 تعریف شده تا ناسازگاری rounding جرم مولی ledger نسازد. heat منفی یعنی نیاز حرارتی خارجی؛ آن انرژی به‌عنوان برق رایگان وارد محاسبه نمی‌شود.
- مدل FPV ظرفیت گرمایی ثابت و فرض دمای یکسان جریان‌های آب با مخزن دارد؛ تغییر حجم بیش از ۵٪ رد می‌شود. این محدودیت، خطای واقعی میدان را به ۵٪ محدود نمی‌کند.
- Agri از ET0 اظهاری، ضریب crop واحد و stress استفاده می‌کند؛ **FAO56 dual-coefficient کامل نیست**. LUE و harvest index صرفاً ورودی caller هستند. baseline LER هم‌مرز باید توسط دادهٔ معتبر تأمین شود، kernel آن را اثبات نمی‌کند.
- rulepack hash فقط اتصال به سند اظهاری است، نه بررسی اصالت سند. pass یعنی فقط deadline در دادهٔ داده‌شده؛ ride-through اجباری، protection coordination یا utility approval نیست.

## منابع مبنای طراحی و محدودیت شواهد

روابط پذیرفته‌شده با شاهدهای تحلیلی مستقل تست شده‌اند؛ دادهٔ عددی field از این اسناد استخراج نشده و بازتولید benchmark تجربی ادعا نمی‌شود:

- FAO56، soil depletion و stress: https://www.fao.org/4/x0490e/x0490e00.htm . مدل فعلی زیرمجموعهٔ simplified bucket است، نه کل استاندارد.
- NREL، Hydrogen Production Fundamentals، Faraday و HHV/thermoneutral: https://docs.nlr.gov/docs/fy10osti/47302.pdf . پارامترهای polarization مثال ساختگی‌اند.
- NREL، تمایز type test و آزمون interconnection/anti-islanding: https://docs.nrel.gov/docs/fy19osti/74497.pdf و https://docs.nrel.gov/docs/fy22osti/77782.pdf . threshold استاندارد از این گزارش‌ها در کد کپی نشده است.
- PCM: نگاشت enthalpy lumped با plateau فاز و شاهد انرژی نهان؛ هیچ نتیجهٔ spatial Stefan به این پیاده‌سازی نسبت داده نشده است.

## rollback، مرز مالی و کار باقی‌مانده

چون ادغام نشده، rollback تولیدی لازم نیست؛ حذف/عدم import این فایل‌های جدید روی رفتار موجود اثری ندارد. برای ادغام آینده: flag default-off، schema/validator مستقل TS، auth و allowlist SDK، UI همراه archive/cancel، آزمون tamper/API/browser، سه دور review و پژوهش مستند، gate hash-bound کامل و دادهٔ holdout لازم است. تا آن زمان release C و تکمیل C1–C3 **blocked** است. خروجی این ماژول به annual-energy، finance، bankability یا safety pipeline متصل نیست.

Changelog: افزودن هسته‌های پژوهشی standalone و شواهد تحلیلی؛ هیچ تغییر اجرایی در محصول فعلی.
