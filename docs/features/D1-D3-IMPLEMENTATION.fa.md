# D1–D3 — راهنمای تحویل پژوهشی محدود

## چه چیزی عرضه شده است؟

چهار operation در Python و مسیر احرازشدهٔ پژوهشی، schema و شاهد عددی مستقل TypeScript، چهار مثال در ویرایشگر، SDK، flag مستقل و گیت قابل‌بازتولید اضافه شده است. **این تحویل تکمیل کامل فازهای نقشهٔ راه نیست.**

| فاز | پیاده‌سازی این برش | خارج از دامنه / blocked |
|---|---|---|
| D1 | نرخ نسبی Arrhenius/RH، cumulative exposure، retention first-order، guard افت دوباره | adapter کامل PVDeg، LeTID/UV/مکانیک و RUL عملیاتی با فاصلهٔ پیش‌بینی calibrated |
| D2 | cohort mass ledger، manufacturing/EOL، LCA با factor source/license/bounds، functional unit و هزینهٔ مستقل | اجرای PV ICE، inventory واقعی دارای مجوز، repowering زمانی، LCA گواهی‌شده و avoided-burden credits |
| D3 | ensemble قبض با حفظ ماهانه؛ پیشنهاد typed، diff/undo و snapshot facts آفلاین | OCR، تقویم/تعرفهٔ محلی، بار measured، LLM/model/provider، report آزاد و اثر LCOE |

N14/N15 در capability manifest همچنان planned هستند؛ deterministic proposal به‌عنوان LLM معرفی نشده است. N16/N17/N18/R14 فقط partial و با دامنهٔ پژوهشی محدود ثبت شده‌اند.

## فعال‌سازی و rollback

هر دو `PVLIB_RESEARCH_ENABLED=true` و `SCIENCE_D_ENABLED=true` و تنظیم auth سرویس لازم‌اند. D از `SCIENCE_B_ENABLED` و `PORTFOLIO_ANALYTICS_ENABLED` مستقل است. مقدار پیش‌فرض D خاموش است. rollback: `SCIENCE_D_ENABLED=false`؛ عملیات D با 503 و کد `SCIENCE_D_DISABLED` رد می‌شود. هیچ migration یا تغییر پروژهٔ ذخیره‌شده لازم نیست.

در تب اقلیم، ویرایشگر پژوهشی:

1. یکی از `D1 degradation example`، `D2 circular LCA example`، `D3 bill ensemble example` یا `D3 offline proposal example` را انتخاب کنید.
2. JSON، source و context را مطابق دادهٔ خود ویرایش کنید. همهٔ مثال‌ها **synthetic** هستند.
3. در صورت نیاز bearer token را در فیلد حافظه‌ای وارد و Run research را اجرا کنید.
4. نتیجه، خطا، لغو، archive و import همان رفتارهای موجود را دارند. ویرایش ورودی/مختصات/توکن نتیجهٔ قبلی را stale و پاک می‌کند؛ restore آرشیو اجرای تازه محسوب نمی‌شود.

SDK نصب‌شده از متد موجود `Client(..., enabled=True).run(request)` و request نمونه‌های `docs/examples/science-d/` استفاده می‌کند. نتیجه همچنان `energyAdoption=false` و `financeMutation=false` دارد. استفادهٔ مستقیم Python هم از چهار تابع `science_d.py` ممکن است؛ client-side مدل سنگین نداریم.

## قرارداد و خطاها

- همهٔ ورودی‌ها strict، versioned، finite و محدود به بودجه‌اند؛ source و contextSha256 الزامی‌اند. hashِ context فقط binding اظهاری است و تطابق واقعی پروژه را اثبات نمی‌کند.
- D1: intervalHours ثابت، timestamp با offset و بدون gap، T و RH اظهاری. `baseEnergyBasis=undegraded` و `alreadyAppliedMechanisms=[]` الزامی است؛ این guard جای اثبات provenance baseline را نمی‌گیرد. ضریب retention به انرژی سالانه attach نمی‌شود.
- D2: نصب و بازنشستگی بر حسب kg؛ سال‌ها مرتب، جمع بازنشستگی حداکثر جرم نصب. manufacturing yield و collection/reuse/recycling صریح. چهار factor بر حسب kgCO2e/kg با low≤central≤high، source و license لازم است. currency کد سه‌حرفی صریح است؛ registry تبدیل ارز/اثبات ISO وجود ندارد. deliveredEnergyKwh فقط denominator اظهاری است و نه انرژی تولیدشده/پذیرفته‌شده توسط اپ.
- D2: allocation فقط `cutoff_no_credit`؛ manufacturing scrap از مرز خارج می‌شود و بازیافت نمی‌شود. recycled/reuse credit صفر است. virgin/secondary factor بار آماده‌سازی feedstock، manufacturing factor بار فرآوری feedstock و eol factor بار EOL جرم retired را شامل می‌شود؛ caller باید overlap را کنترل کند. source/license متن اظهاری‌اند، نه تأیید حقوقی خودکار.
- D2: اگر in-use stock باقی بماند، `lifecycleCoverage=partial_observed_retirements` است؛ نتیجهٔ cradle-to-EOL آیندهٔ آن stock کامل نیست. low/high بازهٔ corner-factor هستند، نه CI، احتمال یا Monte Carlo. transport/use اگر در عوامل نیامده باشند حذف‌اند. costs undiscounted و مستقل از اپ مالی‌اند.
- D3 قبض: فقط kWh و `fixed_UTC_no_DST`؛ اعداد پولی/MWh و رشته‌های واحد مبهم رد می‌شوند. حداکثر ۱۲ ماه متوالی، ۳ شکل با ۲۴ وزن نامنفی و مجموع مثبت. leap year پشتیبانی می‌شود؛ DST/تقویم محلی خیر. شکل‌ها احتمال برابر یا پوشش آماری ندارند و فقط سناریو هستند. ضریب roundoff صرفاً به آخرین وزن مثبت هر ماه اعمال می‌شود.
- D3 پیشنهاد: فقط دو فیلد PV kWp و battery kWh، command=`propose_set`. proposal بدون اعمال، diff، undo و facts از snapshot اصلی برمی‌گردد. undo نیز فقط یک پیشنهاد است. بدون prompt، tools، provider، URL fetch، command اجرا یا mutation. دادهٔ source حتی اگر حاوی دستور باشد فقط رشته است.

خطاها: 400 ورودی نامعتبر، 401 auth، 503 flag/runtime، 422 رد دامنه در Python، 429 محدودیت اجرا، 502 خروجی ناقض قرارداد و timeout/cancel مطابق سرویس موجود. هیچ fallback به مدل دیگر یا retry خودکار افزوده نشده است. اطلاعات حساس یا نتیجهٔ کاربر لاگ/ذخیره نمی‌شوند؛ archive فقط با دانلود صریح کاربر است.

## روابط، منشأ و دقت

D1 از نسبت rate محیط به rate مرجع استفاده می‌کند:

`AF=(RH/RHref)^n exp[(Ea/R)(1/Tref−1/T)]`

`ΔH=kref AF Δt`، `retention=exp(−ΣΔH)` و میانگین دقیق بازه از انتگرال نمایی. در RH=0 و n=0، وابستگی RH غیرفعال است و factor=1. R=0.00831446261815324 kJ/mol/K؛ دما Kelvin. رابطهٔ نرخ منتخب با `arrhenius`/`arrhenius_deg` بررسی شد؛ **جهت AF در arrhenius_deg نسبت chamber به field است**، اما اینجا نسبت field به reference محاسبه می‌شود. retention نمایی یک فرض اضافی caller-model است، نه خروجی RUL یا قانون عمومی PVDeg.

مرجع pinned: https://github.com/NatLabRockies/PVDegradationTools/blob/3e77ab77ba804e592112380d713673b1f3880054/pvdeg/degradation.py . کد بسته کپی یا نصب نشده؛ adapter/baseline آن اجرا نشده است. LICENSE.md upstream بررسی شد (BSD-3-Clause).

D2 با mass-flow cohort framework مقایسهٔ دامنه شد: https://github.com/NatLabRockies/PV_ICE/blob/378a012a0602062ad52f14120d672f362dcc018a/README.md . PV ICE مدل dynamic lifetime/material/energy گسترده‌تری دارد؛ دفتر حاضر معادل آن نیست. هیچ baseline/data آن کپی یا benchmark بازتولید نشده است. LICENSE.md upstream BSD-3-Clause است؛ مجوز عوامل واقعی باید جداگانه ارزیابی شود.

D3: هیچ دادهٔ خارجی، مدل زبانی یا shape آماری وارد نشده؛ وزن‌های مثال ساختگی‌اند. این non-identifiability است: قبض ماهانه فقط جمع انرژی را محدود می‌کند، نه peak و شکل واقعی. خروجی مدل measured یا probabilistic interval نیست.

دقت نرم‌افزار float64 است؛ validator مستقل TS از tolerance نسبی `1e-8 × max(1,|expected|)` استفاده می‌کند. این tolerance عددی است، نه accuracy فیزیکی. شاهدهای تحلیلی Python برای نمونه‌ها toleranceهای سخت‌تر متناسب با واحد دارند؛ uncertainty پارامترها/مدل در D1 برآورد نشده و دقت تجهیز واقعی ادعا نمی‌شود. envelope شامل input binding، hash، runtime/code hash، not_field_validated و محدودیت است. snapshot digest از canonical JSON صادرشده و با معنای snapshot در TS کنترل می‌شود؛ بازتولید حدسی serialization float بین زبان‌ها انجام نمی‌شود.

## آزمون‌ها و نمونهٔ عددی

- ۲۰ تست Python شامل closed-form ثابت، دما/RH، محرک صفر، monotonic extreme، double degradation/gap، تراز جرم و LCA و هزینه، fractionهای ۰/۱، stock باقیمانده، نامعتبرها، قبض leap/nonleap/سال بعد/صفر، units، shapeها، diff/undo و immutability، injection مستقیم و source غیرقابل‌اعتماد، sweep صد حالتهٔ deterministic و import+execution بدون socket شبکه.
- API/SDK واقعی: چهار worker operation، independent TS witnesses و tamper روی retention، جرم، functional impact، هزینه، energy sample، proposal، facts، hash و finance flag؛ strict schema، auth، flag مستقل و rollback. rate limit تولید تغییر نکرده است.
- Chromium production: چهار دکمه/اجرای واقعی با JWT، validation نتیجه، archive restore، cancel و stale suppression؛ اینترنت browser مسدود.
- aggregate: client/node typecheck، lint، تمام گیت C kernels و B/portfolio/foundation پیشین، pip check و git diff check. CI برای همین aggregate تنظیم شده؛ اجرای remote CI محلی محسوب نمی‌شود.

نمونهٔ D1: چهار ساعت در مرجع، k=1e−5/h → final retention≈0.9999600008. نمونهٔ D2: feedstock=125kg، virgin=100kg، secondary=25kg، reuse=9kg، recycled=64.8kg، disposed=26.2kg؛ impact central=1525kgCO2e و functional=0.1525kgCO2e/kWh؛ هزینهٔ مستقل=700USD. قبض فوریهٔ ۲۰۲۴: هر سه سناریو ۶۹۶ رکورد و مجموع ۲۹۰kWh دارند، نه شکل یکسان.

## سه بازبینی و پژوهش تکمیلی

1. بازبینی رابطهٔ علمی/واحد/جهت AF و تفکیک survival موجود از RUL؛ بررسی متن upstream PVDeg، R_GAS و تعریف chamber/field. نتیجه: نرخ normalized و first-order law جدا نام‌گذاری شدند؛ بدون ادعای adapter یا کالیبراسیون.
2. بازبینی مرز مواد، double count، uncertainty و هزینه؛ بررسی README/تعریف cohort و LICENSE در PV ICE. نتیجه: currency صریح اضافه شد، stock باقی‌مانده partial است، manufacturing scrap و no-credit و factor overlap مستند شدند؛ retirement و mass sweep تست شد.
3. بازبینی proposal/hash/متن غیرقابل‌اعتماد و agency؛ بررسی OWASP LLM01 و LLM06، سپس اضافه‌شدن آزمون source injection و tamperهای hash/facts. منابع: https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/blob/main/2_0_vulns/LLM01_PromptInjection.md و https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/blob/main/2_0_vulns/LLM06_ExcessiveAgency.md . نتیجه: هیچ مدل/ابزار/اجرا یا apply endpoint وجود ندارد؛ این تست‌ها گواه امنیت یک LLM فرضی نیستند. نیازی به تأیید انسانی برای این pipeline آفلاین وجود ندارد چون عملیات پرخطر عرضه نشده‌اند.

این‌ها بازبینی‌های خودکار همان agent و بررسی مرجع‌اند، نه audit مستقل اشخاص ثالث.

## گیت، changelog و backlog

```sh
PVLIB_PYTHON="$PWD/.venv/bin/python" npm run verify:science-d
```

رسید `docs/audit/D1-D3-GATE.json` وضعیت واقعی checks و hash فایل‌ها را ثبت می‌کند. فقط اگر همه سبز باشند، برش نرم‌افزاری ready-for-review است؛ fullPhaseStatus همواره partial و overallReleaseStatus برای roadmap کامل blocked می‌ماند. rollout تولیدی با default-off باقی می‌ماند.

فایل‌های اصلی: `services/pvlib_research/science_d.py`، `src/studies/scienceD.ts`، worker/server/schema موجود، ResearchEditor، SDK allowlist، manifest، چهار example، سه test script، verifier و CI. Changelog: افزودن چهار operation پژوهشی بدون تغییر در موتور مالی/انرژی و بدون dependency جدید.

Backlog بلوکه: دادهٔ failure با censoring/holdout و calibration فاصلهٔ RUL؛ adapter واقعی و تست PVDeg/PV ICE؛ inventory فناوری/منطقه با مجوز؛ local calendar/DST/tariff و reference meter holdout؛ طراحی opt-in provider و data egress policy/LLM grounding پیش از هر LLM. خروجی‌های فعلی هیچ‌کدام این blockers را رفع نکرده‌اند.
