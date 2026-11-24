# C1–C3: بستن شکاف ادغام محصولی

## وضعیت و دامنه

راهنمای C1-C3-IMPLEMENTATION وضعیت تاریخی تحویل kernel-only را توصیف می‌کرد. اکنون پنج kernel `grid_support`، `agri_water`، `fpv_balance`، `pem_dispatch` و `pvt_pcm` به API/SDK/editor متصل‌اند؛ این راهنما مرجع **وضعیت فعلی ادغام** است. تمام محدودیت‌های علمی مدل‌ها همچنان معتبرند. GFM، rulepack رسمی، holdout میدانی، spatial Stefan و اتصال PV-T به PEM هنوز پیاده‌سازی/تأیید نشده‌اند. هیچ ادعای اتمام کل A1–D3 نمی‌شود؛ فهرست باقی‌مانده در A1-D3-REMAINING.fa.md است.

## اجرا و رابط

علاوه بر auth موجود، هر دو `PVLIB_RESEARCH_ENABLED=true` و `SCIENCE_C_ENABLED=true` لازم است. flag C پیش‌فرض خاموش و از D/B/portfolio مستقل است. rollback با خاموش‌کردن C، بدون migration و بدون تغییر نتیجهٔ قبلی پروژه انجام می‌شود. `/api/v1/research/capabilities` وضعیت flag و عملیات مجاز را اعلام می‌کند. فراخوانی غیرفعال 503/SCIENCE_C_DISABLED می‌دهد.

در تب اقلیم، ویرایشگر پژوهشی پنج مثال C دارد: grid support، agri water، FPV balance، PEM dispatch و PV-T PCM. JSON ورودی و نتیجه قابل دانلود است، token صرفاً حافظه‌ای است، ویرایش/لغو پاسخ stale را حذف می‌کند و restore archive اجرای جدید نیست. همهٔ مثال‌ها synthetic هستند. SDK از `Client(...,enabled=True).run(request)` با فایل‌های `docs/examples/science-c/*.request.json` استفاده می‌کند. فایل‌های `*.synthetic.json` قدیمی همچنان plan خام سازگار با Python هستند؛ هیچ قالب قدیمی عوض نشده است.

## قرارداد و مرزها

`src/studies/scienceC.ts` پنج schema strict نسخه‌دار دارد: keys اضافی، nonfinite، budget، grid زمانی، curve نامرتب، part-load نامرتب و melt fraction نامعتبر رد می‌شوند. API مسیر Python موجود را با auth، timeout، cancel، concurrency/output limits و **۶ درخواست در دقیقه بدون تغییر** استفاده می‌کند. worker آفلاین است و dependency جدید ندارد. UI فقط اعتبارسنجی عددی bounded انجام می‌دهد؛ اجرای مدل و root solving در Python است.

خروجی همان envelope با runtime/hash/input binding، `status=insufficient_evidence`، `projectApproval=blocked`، `safetyApproval=not_assessed` و `not_field_validated` است. screen pass شبکه صرفاً داده و deadline اظهاری را پوشش می‌دهد؛ source/hash rulepack اصالت سند را ثابت نمی‌کند. anti-islanding نامعلوم و certificate=false است. هیچ route پذیرش انرژی/مالی یا apply اضافه نشده است.

## شاهدهای مستقل TypeScript

- شبکه: interpolation، پاسخ نمایی، محدودیت دایره و جریان، reset/disconnect و شمارش دقیق deadline/context/unknown بازحساب می‌شود.
- Agri: ledger آب، DLI، stress، biomass، yield و LER مستقل بازحساب می‌شود؛ baseline صفر→null.
- FPV: شاهد **سری هندسی بسته** برای پاسخ implicit Euler به‌جای loop زمانی Python، همراه انرژی، حجم و refinement؛ ظرفیت ثابت و دامنهٔ حجم ۵٪ همان محدودیت قبلی است.
- PEM: فارادی، استوکیومتری، polarization، startup/aux/ramp و optimality معکوس monotone از current برگشتی بررسی می‌شود؛ solver دوم در UI اجرا نمی‌شود. حالت‌های emergency و minimum load جدا هستند.
- PCM: شاهد **حل جبری قطعه‌ای implicit Euler** برای solid/plateau/liquid، مستقل از brentq در Python. فقط شمارش bounded گام‌ها و محاسبات جبری سبک است (حداکثر حدود ۱۵۰هزار گام جمع coarse/fine)؛ root solver/مدل جدید در UI اجرا نمی‌شود. integrals تمام fluxها، enthalpy، phase fraction و دو gate دما/enthalpy کنترل می‌شوند.

در PCM اگر `1+dt*(UA_fluid+h+G*eta_ref*gamma)/C <= 0` باشد، Python به‌طور محافظه‌کارانه ورودی را رد می‌کند؛ در آن حالت monotonicity معادلهٔ ضمنی قابل فرض نیست. این رفتار جدید با regression اختصاصی تست شده است. این guard معادل معیار پایداری PDE یا accuracy فیزیکی نیست.

## دقت و خطا

root tolerances و محدودیت‌های علمی در راهنمای kernel اصلی باقی‌اند. شاهد TS غالباً tolerance نسبی `1e-6 max(1,|expected|)` دارد؛ residual انرژی FPV حداکثر 0.02J و PCM حداکثر 1e−4J/m² برای پذیرش witness است. این حدود **دقت فیزیکی تضمین‌شده نیستند** و در دامنه‌های بدشرط/مقیاس بسیار بزرگ ممکن است نتیجهٔ محاسباتی finite هم به‌صورت fail-closed رد شود. هیچ fallback یا clamp مخفی برای قبول نتیجه اضافه نشده است. وضعیت‌های HTTP و بودجه‌ها از سرویس موجود حفظ شده‌اند؛ خروجی ناسازگار 502/INVALID_RESULT است، نه نتیجهٔ قابل استفاده در مالی.

## آزمون و بازبینی

۲۱ تست Python C، پنج operation واقعی در API و پنج SDK invocation، tamper روی P/Q، گواه/anti-islanding، آب، LER، دما، gate، H2/current و enthalpy؛ strict keys، auth و flag/rollback. سناریوهای مکمل worker: grid trip/unknown/reset/sag، خاک خشک و بارش، reservoir step، PEM startup/nonlinear/ramp/power loss، PCM تغییر دبی. Chromium production پنج مثال واقعی با JWT، archive و cancel/stale را اجرا می‌کند. آزمون مرورگر اینترنت خارجی را مسدود می‌کند.

سه بازبینی این برش:

1. بررسی solver/قرارداد و سپس خواندن docstring منبع نسخه‌دار SciPy brentq: https://github.com/scipy/scipy/blob/v1.14.1/scipy/optimize/_zeros_py.py . برآیند: sign bracket به‌تنهایی uniqueness یا فیزیک را ثابت نمی‌کند؛ guard مشتق PCM و شاهد جبری مستقل و regression اضافه شد. این رابطهٔ lumped حل Stefan نامیده نشده است.
2. بررسی دوبارهٔ screen و ledger در قیاس با SPEC و مبانی ثبت‌شدهٔ قبلی (FAO56، NREL hydrogen و تفکیک آزمون interconnection در راهنمای kernel). برآیند: utility approval/field calibration از pass عددی استنتاج نشد و هیچ threshold استاندارد اختراع نشد. بررسی منابع قدیمی به معنی دریافت دادهٔ field جدید نیست.
3. بررسی adversarial input/temporal grid و policy در برابر `studyTime`، worker و rate limiter؛ برآیند: ورودی/خروجی strict، محدودیت‌های تولید ثابت، SDK در router تست مستقل (نه افزایش rate limit) و browser auth/archive/cancel واقعی آزموده شدند. review داخلی agent است، نه ممیزی شخص ثالث.

## گیت و کار باقی‌مانده

```sh
PVLIB_PYTHON="$PWD/.venv/bin/python" npm run verify:remaining
```

گیت کل D (که C-kernel/B/A/foundation را اجرا می‌کند)، types/lint، API/SDK C، browser C و diff check را بازاجرا و `docs/audit/A1-D3-REMAINING-GATE.json` را hash-bound ثبت می‌کند. ready-for-review فقط برش **ادغام C و اصلاح solver** را می‌پوشاند؛ fullRoadmapStatus=incomplete. remote CI صرفاً پیکربندی شده؛ اجرای محلی به‌عنوان remote گزارش نمی‌شود.

بازتاب شکست‌های گیت: در اجرای نخست، narrowing نوع در شاخهٔ آزمون variant PCM کامل نبود؛ شاخه به pvt_pcm محدود و typecheck دوباره موفق شد. اجرای بعدی یک race تست قدیمی cancel مالی را آشکار کرد: header چسبان کلیک pointer را می‌پوشاند و worker پیش از کلیک تمام می‌شد. تست به فعال‌سازی واقعی keyboard با Enter تغییر یافت (بدون force، بدون حذف assertion، بدون تغییر موتور مالی) و آزمون کامل UQ مرورگر مستقل دوباره موفق شد.

Changelog: افزودن schema/witness C، allowlist worker و SDK، flag/server capability، پنج مثال UI/API، tests و گیت تجمیعی؛ اصلاح محافظه‌کارانهٔ PCM nonmonotone step. هیچ تغییر در موتور مالی/سالانه، هیچ provider/network و هیچ secret جدیدی وجود ندارد.
