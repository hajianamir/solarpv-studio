# اپتیک ناهمدوس محدود — B3

## وضعیت

adapter واقعی `tmm.inc_tmm` نسخه0.2.0 برای همهٔ لایه‌های داخلی ناهمدوس، تابش عمودی و محیط ابتدا/انتهای بی‌جذب. ادغام API/SDK/editor پشت پرچم مستقل انجام شده؛ نتیجهٔ پذیرش اجرایی در `docs/audit/INCOHERENT-OPTICS-GATE.json` است. این قابلیت تکمیل B3 یا A1–D3 نیست: mixed coherent/incoherent، زاویهٔ مایل، rough/scattering interfaces و EQE تجربی فناوری هنوز بازند. هیچ دادهٔ میدانی جدید یا benchmark EQE فناوری به‌دست نیامده است.

## اجرا و rollback

محیط اختیاری قبلی reference را با requirements/lock ثبت‌شده نصب و `PVLIB_REFERENCE_PYTHON` را صریح تنظیم کنید. core runtime تغییر نکرده و fallback مجاز نیست. در سرور احراز هویت‌شده، سه پرچم `PVLIB_RESEARCH_ENABLED=true`، `REFERENCE_MODELS_ENABLED=true` و `INCOHERENT_OPTICS_ENABLED=true` لازم‌اند؛ پیش‌فرض خاموش است. خاموش‌کردن پرچم آخر یا reference، عملیات را با503 رد و از فهرست capabilities حذف می‌کند. پرچم incoherent، عملیات coherent قبلی را تغییر نمی‌دهد.

در Research editor تب اقلیم `Incoherent optics example` را انتخاب کنید. request در `docs/examples/references/incoherent.json` برای API POST `/api/v1/research/run` یا `Client(..., enabled=True).run(request)` SDK قابل‌استفاده است؛ احراز هویت و سیاست timeout/rate-limit همان research موجود است. archive دانلود/بازخوانی و cancel نتیجهٔ پژوهشی را خودکار به پروژه یا مالی متصل نمی‌کنند. توکن در نمونه/archive کپی نمی‌شود؛ اطلاعات محرمانه را در source وارد نکنید.

## دامنه و محدودیت

شبکهٔ مشترک دقیق2..256طول موج20..4000nm، شدت0..10W/m²/nm و3..12لایه؛ n/k بدون interpolation یا extrapolation. مرزهای نیمه‌بی‌نهایت thickness=null و k=0؛ همهٔ لایه‌های داخلی ضخیم و ناهمدوس‌اند. شرط ضخامت حداقل10برابر بیشترین طول موج فقط guard نرم‌افزار است؛ coherenceBasis باید دلیل فیزیکی میانگین‌شدن fringes را توضیح دهد. برنامه صحت این متن اظهارشده را تأیید نمی‌کند. ناحیهٔ optical depth>60 رد می‌شود تا clamp بستهٔ upstream پنهان نماند.

ناهمدوسی به معنی زبری یا پراکندگی نیست. هیچ absorption-vs-depth، EQE، جریان/توان الکتریکی یا دقت مادهٔ واقعی گزارش نمی‌شود. جذب خروجی فقط جذب کل لایه‌های محدود در مدل است. هزینه/انرژی سالانه/مالی خودکار تغییر نمی‌کند؛ status=insufficient_evidence، validationStatus=not_field_validated و projectApproval=blocked.

## منشأ و دادهٔ آزموده‌شده

مرجع خوانده‌شده: Byrnes، [Multilayer optical calculations، arXiv1603.02720v5](https://arxiv.org/html/1603.02720v5)، بخش6.1–6.3، روابط25–30 و محدودیت coherence length. مقاله بازنشر نشده؛ کد MIT و tests از commit`9c265c20e2c5f75b5ac46d63ab466665948eb821` در docs/reference-data/tmm ثابت شده‌اند. `scripts/acquire_reference_data.py --fetch` گام صریح توسعه است؛ runtime شبکه ندارد. فایل جدید engine-source.txt منشأ inc_tmm و helperها را قابل‌ممیزی می‌کند و SHA256/blob/license در manifest ثبت است.

نکتهٔ نسخه: فایل کامل commit مرجع با PyPI0.2.0 یکسان نیست؛ upstream یک اصلاح overflow در position_resolved دارد. آزمون AST برابری همهٔ توابع دیگر را بررسی می‌کند؛ adapter حاضر position_resolved را فراخوانی نمی‌کند. digest فایل واقعی نصب‌شده جدا در runtime نتیجه ثبت می‌شود. هیچ ادعای تطابق بایت‌به‌بایت کل فایل نشده است.

fixture سه‌لایهٔ حقیقی upstream (n=1,2,3؛ d=567nm؛ wavelength=400nm؛ angle=pi/3) مستقیماً روی موتور آزموده می‌شود؛ این آزمون engine خارج دامنهٔ عمودی adapter است و دامنهٔ محصول را گسترش نمی‌دهد. آزمون‌های print-only upstream به‌خودی‌خود assertion نیستند؛ اینجا روابط assert شده‌اند. نمونهٔ محصول synthetic n=1.5+.001i است، نه دادهٔ اندازه‌گیری‌شده.

## شواهد مستقل و آزمون

شاهد TypeScript سری هندسی بازتاب‌های چندگانه و Beer attenuation را بازترکیب می‌کند، نه ماتریس انتقال upstream. برای هر طول موج R/T/A و انتگرال طیفی مستقل کنترل می‌شوند؛ تغییر R و T با حفظ مجموع هم رد می‌شود. tolerance شاهد نسبی1e-8 است و دقت فیزیکی محسوب نمی‌شود. computation اصلی tmm در Python سرور است، شاهد محدود O(wavelengths*layers) در UI فقط کنترل عددی است.

۱۲ آزمون Python: slab بی‌اتلاف با R=1/13 و T=12/13، بی‌کنتراست، جذب و سری مستقل، میانگین2048فاز coherent، fixture upstream، چندلایه/ضخامت، انتگرال طیفی/صفر، رد واحد/شبکه/clamp/coherence، منشأ/immutable و اجرای تازهٔ آفلاین، تطبیق AST توابع مرتبط. API/SDK نیز tamper، runtime جدا،auth و دوپرچم/rollback را آزمون می‌کنند. Chromium production برای example،archive/cancel و حالت disabled اجرا می‌شود؛ service worker در context این harness برای رهگیری قطعی capabilities مسدود است، نه اینکه lifecycle آن در این تست اعتبارسنجی شده باشد.

گیت: `PVLIB_PYTHON=... PVLIB_REFERENCE_PYTHON=... npm run verify:incoherent`؛ کل زنجیرهٔ رگرسیون قبلی تو‌در‌تو الزامی است. فقط receipt موفق با هش جاری معتبر است.

## سه مرور و پژوهش پس از هر مرور

1. مرور دامنه: تفکیک incoherence از roughness/EQE؛ سپس جستجو و خواندن بخش6 مقالهٔ Byrnes و ثبت نیاز به میانگین‌شدن fringes و محدودیت depth profile.
2. مرور عددی: سری شدت مستقل به‌جای تکرار ماتریس موتور؛ سپس بازخوانی روابط25–30 و تست سه‌لایهٔ frozen upstream، آزمون slab و phase-average.
3. مرور منشأ/امنیت: بررسی تفاوت PyPI و commit؛ سپس دریافت صریح کد commit از GitHub و مقایسهٔ ساختاری AST، حفظ تمایز digestها و آزمون runtime/flags/tamper. این مرورها verification نرم‌افزارند، نه ممیزی آزمایشگاهی مستقل.
