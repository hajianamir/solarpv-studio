# باقیماندهٔ A1–D3: تفکیک کار و شواهد

این فهرست مطابق جدول authoritative در AUDIT-FULL-CAPABILITY-REPLAN.fa.md است. «قابل پیاده‌سازی» به معنی «بدون نیاز به زمان/طراحی/مرجع» نیست؛ scaffold جای حل و اعتبارسنجی نیست.

| فاز | کار نرم‌افزاری باقیمانده | وابستگی اعتبارسنجی عملیاتی |
|---|---|---|
| A1 | evaluator غیرخطی عمومی PV/LCOE، harmonization adapterهای UQ و calibration interface | بودجهٔ uncertainty/holdout معتبر پروژه |
| A2 | sizing کامل روی dispatch و تجهیزات جانبی/سیکل عمر | مشخصات تجهیزات/هزینه و policy واقعی |
| A3 | ingest/feature pipeline و clustering/مدیریت هشدار گسترده | SCADA مجاز با label و holdout مستقل |
| B1 | هندسه/نور گسترده، MC و convergence حرارتی فضایی، oracle Radiance | benchmark هندسی و اندازه‌گیری معتبر |
| B2 | پروتکل‌های باتری گسترده و temporal refinement | پارامتر سلول معتبر؛ runaway فقط calorimetry/propagation |
| B3 | تعمیم optical-stack به incoherent/rough interfaces و benchmark مستقل EQE فناوری؛ coherent tmm منتخب در برش مرجع اضافه شد | EQE/constants منتشرشده و مجاز |
| C1 | ادغام محصولی kernels، rulepack registry و GFM مجزا | rulepack رسمی و تست interconnection/anti-islanding |
| C2 | ادغام محصولی kernels و holdout runner | crop/reservoir/control داده‌شده |
| C3 | ادغام محصولی kernels، coupling و حل فضایی Stefan جدا | collector/PEM/PCM benchmarks معتبر |
| D1 | mechanismهای گسترده و pipeline calibration interval؛ adapter منتخب واقعی Arrhenius PVDeg اضافه شد | failure/censoring و سایت/زمان مستقل |
| D2 | تعمیم PV ICE فراتر از baseline شیشهٔ frozen و reconciliation inventory سایت؛ adapter واقعی منتخب اضافه شد | مجوز و boundary reconciliation دادهٔ واقعی |
| D3 | local calendar/DST و مسیر provider opt-in | مدل/مجوز/egress policy و benchmark grounding |

## چرخهٔ فعلی

اولویت قابل‌بستن بدون دادهٔ جدید: **ادغام پنج kernel C در قرارداد strict TS، Python/API احرازشده، SDK و ویرایشگر**؛ مستقل از D/B/portfolio و پشت SCIENCE_C_ENABLED default-off. تست‌های پذیرش: oracle/ledger مستقل، tamper، auth/flag/rollback، SDK و Chromium پنج عملیات؛ سپس کل گیت قبلی. این ادغام به معنی پیاده‌سازی سایر موارد جدول نیست. باقی‌مانده‌های الگوریتمی بالا به‌دلیل کمبود داده «غیرقابل کدنویسی» اعلام نمی‌شوند؛ صرفاً هنوز تکمیل نشده‌اند.

ورودی/خروجی kernels حفظ می‌شود، هیچ migration داده‌ای لازم نیست. C artifact قدیمی kernel-only نگه داشته می‌شود و گیت ادغام جدا ساخته می‌شود. هیچ خروجی به finance/annual-energy attach نمی‌شود؛ pass غربال شبکه گواه نیست، PCM lumped حل Stefan نیست، و دادهٔ مصنوعی holdout میدانی نیست.

## به‌روزرسانی برش مرجع‌دار

adapterهای واقعی منتخب PVDeg0.7.0، PV ICE0.4.3 و coherent tmm0.2.0، داده‌های upstream با commit/hash/license و Si Green2008 CC0 اضافه شدند؛ راهنما: REFERENCE-ADAPTERS.fa.md. بازپخش fixture/upstream tests معادل field holdout نیست و سایر ستون‌های کار نرم‌افزاری جدول باقی‌اند. وضعیت ادغام C در راهنمای C1-C3-INTEGRATION به‌روز است؛ متن «چرخه فعلی» بالا سابقهٔ چرخهٔ پیشین است.

## به‌روزرسانی پژوهش کاربردی و Stefan

- A1/D3: سناریوهای محدود واقعی PVWatts/LCOE و قبض Gregorian محلی/DST نسخه‌ثابت ادغام شده‌اند؛ راهنما APPLIED-RESEARCH.fa.md. این‌ها UQ کالیبره/تقویم‌های دیگر/provider workflow را نمی‌بندند.
- C3: kernel مستقل finite-volume enthalpy فضایی یک‌بعدی و CLI opt-in با مرجع مستقل Neumann اضافه شده؛ راهنما STEFAN-SPATIAL.fa.md. ادغام محصولی این عملیات جدید، coupling PV-T/PEM، همرفت/هندسهٔ گسترده و اعتبارسنجی مادهٔ واقعی همچنان بازند. عبارت «Stefan جدا» در جدول، سابقهٔ کار قبل از این kernel است، نه ادعای فقدان مطلق solver.
- همهٔ ردیف‌های دیگر بازند؛ lack of field evidence با اتمام نرم‌افزار اشتباه نشود. این برش، پاسخ کامل به درخواست تکمیل همهٔ A1–D3 نیست.

## به‌روزرسانی ادغام فضایی

مسیر مستقل Stefan اکنون در API/SDK/ویرایشگر پشت SPATIAL_RESEARCH_ENABLED اضافه شده؛ وضعیت آزمون و محدودیت‌ها در SPATIAL-INTEGRATION.fa.md و receipt متناظر است. عبارت kernel-only در برش قبلی تاریخی است. coupling و سایر موارد باز جدول همچنان باقی‌اند.

## به‌روزرسانی اپتیک ناهمدوس محدود

adapter واقعی all-incoherent در تابش عمودی با محیط خارجی بی‌جذب اضافه شد؛ API/SDK/editor و راهنمای INCOHERENT-OPTICS.fa.md مستقل از coherent قبلی است. mixed stacks، roughness/scattering، زاویهٔ مایل و benchmark مستقل EQE فناوری همچنان بازند. این برش کل B3 یا نقشهٔ A1–D3 را نمی‌بندد.

## به‌روزرسانی مواد و تطبیق موجودی D2

اجرای واقعی PV ICE برای انتخاب از7مادهٔ c-Si و مقایسهٔ موجودی اظهارشده با context/unit/boundary صریح اضافه شد؛ راهنما MATERIAL-INVENTORY.fa.md. سناریوی US و موجودی مصنوعی نمونه، موجودی واقعی تأییدشدهٔ سایت نیستند. LCA/functional unit گسترده،BOM سفارشی،reconciliation هزینه/EOL و qualification واقعی بازند؛ این برش کل D2 یا A1–D3 را نمی‌بندد.

## به‌روزرسانی اتصال یک‌طرفهٔ C3

ورودی الکتریکی میانگین‌بازهٔ PEM از انرژی PV-T/PCM، با تلفات انتقال و ledger مشترک و refinement هیدروژن اضافه شده است؛ راهنما PVT-PEM-COUPLING.fa.md. coupling حرارتی دوطرفه،preheat با مرجع،اتصال spatial Stefan و qualification تجهیز واقعی همچنان بازند. این composition پژوهشی ادعای تکمیل C3 یا کل A1–D3 نیست.

## به‌روزرسانی رابط کالیبراسیون A1

رابط absolute-residual split-conformal و holdout جدا از نظر site/time با منع پنجره‌های هم‌پوشان اضافه شد؛ راهنما INTERVAL-CALIBRATION.fa.md. این رابط descriptive است و exchangeability/frozen بودن مدل را اثبات نمی‌کند؛ guarantee پروژه همیشه مسدود می‌ماند. harmonization جامع،UQ عمومی/tail و دادهٔ calibration مستقل واقعی همچنان بازند؛ کل A1 یا A1–D3 بسته نشده‌اند.

## به‌روزرسانی پروتکل B2

پروتکل جریان پله‌ای واقعی PyBaMM با حفظ state،موازنهٔ بار/حرارت و حساسیت مجزای mesh/tolerance/internal-time-bound به API/SDK/editor پشت BATTERY_PROTOCOL_ENABLED متصل شد؛راهنما BATTERY-PROTOCOL.fa.md و receipt متناظر وضعیت gate را تعیین می‌کنند. CC/CV و پروتکل بلند،measured-cell benchmark،pack و runaway بازند. metadata دیتاست اصلی Zenodo4032561 بررسی شده ولی CSV کامل هنوز acquired/verified نیست. این برش کل B2 یا A1–D3 نیست.
