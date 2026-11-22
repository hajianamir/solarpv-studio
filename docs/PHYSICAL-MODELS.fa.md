# مدل‌های فیزیکی اختیاری: DC-coupled، الکتروشیمی و کنترل/حفاظت گذرا

تاریخ گزارش: **2026-11-03**. این تحویل روی working tree شاخهٔ `arena/237e6ea2-solarpv-studio` انجام شده است، نه یک commit/CI جدید. SHA پایهٔ مشاهده‌شده `5438fb59f4bb5cde05c20818b780464e1fe28752` است. تغییرات قبلی حفظ شده‌اند.

## نتیجه و مسیر استفاده

سه kernel جدید در `services/power_dynamics/` وجود دارند؛ این‌ها تغییر نامِ دفتر AC، افت سالانهٔ SOH یا مدل توان مرتبه‌اول قبلی نیستند. اجرای آن‌ها از CLI، API پژوهشی ایزوله و دکمه‌های نمونه در **ویرایشگر پژوهشی تب اقلیم** ممکن است. پارامترها برای هر سایت/تجهیزات از JSON وارد می‌شوند. نمونه‌ها صریحاً synthetic هستند، نه دادهٔ عملیاتی ساخته‌شده. دادهٔ LG M50 فقط نمونهٔ مشخص Chen2020 است و پیش‌فرض عمومی باتری نیست.

مدل‌های جدید **اختیاری** هستند. ورودی ناقص فقط اجرای همان مدل را رد می‌کند؛ baseline انرژی/مالی مسدود یا با fallback جایگزین نمی‌شود. خروجی‌ها `not_field_validated`، `projectApproval=blocked` و `safetyApproval=not_assessed` دارند و **خودکار به تولید، dispatch سالانه یا مالی متصل نمی‌شوند**.

### نصب و اجرای مستقل

از ریشهٔ مخزن و Python3.11:

```sh
python -m venv .venv-physical
# Linux/macOS: source .venv-physical/bin/activate
# Windows PowerShell: .venv-physical\Scripts\Activate.ps1
python -m pip install -r services/pvlib_research/requirements.txt
python -m services.power_dynamics --input docs/examples/physical-models/dc_coupled.json --output dc-result.json
python -m services.power_dynamics --input docs/examples/physical-models/electrochemical_spm.json --output spm-result.json
python -m services.power_dynamics --input docs/examples/physical-models/dq_protection_control.json --output control-result.json
```

برای اجرای احراز هویت‌شدهٔ API، `PVLIB_RESEARCH_ENABLED=true` و سازوکار JWT/gateway موجود باید پیکربندی شده باشند؛ متغیر `PVLIB_PYTHON` مسیر Python دارای وابستگی‌های pinned است. فعال‌نبودن API نمونه‌ها/ورود JSON را از دسترس خارج نمی‌کند؛ اجرای مستقیم هیچ fallback ندارد. بدنهٔ درخواست `{operation,plan}` است:

| operation | نسخهٔ plan | نسخهٔ result |
|---|---|---|
| `dc_coupled` | `dc-coupled-plan-v1` | `dc-coupled-result-v1` |
| `electrochemical_spm` | `spm-plan-v1` | `spm-result-v1` |
| `dq_protection_control` | `dq-control-plan-v1` | `dq-control-result-v1` |

فیلدها در `src/studies/physicalModels.ts` و kernelها سخت‌گیرانه‌اند. واحدها در نام فیلد مشخص‌اند. اعداد نامتناهی، boolean به‌جای عدد، کلید اضافی، OCP نامرتب، timestamp بدون offset، gap/overlap و بودجهٔ اجرای بیش‌ازحد رد می‌شوند. timestampها ISO با `T`، ثانیه، میلی‌ثانیهٔ اختیاری سه‌رقمی و `Z` یا offset صریح‌اند. کنترل‌ها و پارامترهای فیزیکی نامتناسب ممکن است مستقل از محدودیت نحوی، از دامنهٔ اعتبار مدل خارج باشند؛ پذیرش JSON، صحت تجهیزات را تأیید نمی‌کند.

API دارای سقف8MiB ورودی،32MiB خروجی،120s زمان، یک subprocess فعال، محدودیت6درخواست/IP/دقیقه، لغو و کشتن process-tree و عدم fallback است. محدودیت IP با تغییر JWT دور زده نمی‌شود. runtime اکنون hash کد همهٔ فایل‌های Python پژوهشی/فیزیکی/مطالعه را ثبت می‌کند؛ نسبت به نسخهٔ قدیمی که فقط چهار فایل را hash می‌کرد تغییر عمدی است. نسخهٔ الگوریتم جدید1.0.0 است. آرشیو پژوهشی request/result با hash درخواست و نسخه‌ها ذخیره می‌شود؛ import آرشیو، اجرای تازه محسوب نمی‌شود.

## ۱. توپولوژی DC-coupled

### مرزها و قرارداد توان

ورودی `pvAvailableDcW` توان **DC قبل از clipping اینورتر مشترک** است، نه AC خروجی مدل قبلی. ورودی AC را دوباره از اینورتر عبور ندهید. MPPT، مبدل شارژ/دشارژ، ذخیره و اینورتر/یکسوکننده راندمان‌های مستقل و صریح دارند؛ اعداد مثال، عمومی یا پیش‌فرض تجهیزات نیستند.

`batteryBusCommandW` مثبت=تزریق باتری به باس DC، منفی=برداشت از باس برای شارژ. دستور برنامه‌ریزی‌شده است، نه ادعای بهینه‌سازی سیاست. فرمان با ظرفیت/SOC، توان ترمینال باتری، توان باس مبدل، توان DC/AC اینورتر، بار، سقف export/import و دسترس‌پذیری شبکه محدود می‌شود. residual فرمان گزارش می‌شود؛ دستور اجراشده با دستور خواسته‌شده یکی فرض نمی‌شود.

با `C` شارژ باس، `D` دشارژ باس و `dt` برحسب ساعت:

- `PVbus = PVavailable × ηMPPT`
- `ΔEstored[kWh] = (C × ηconverter_charge × ηstorage_charge − D/(ηconverter_discharge × ηstorage_discharge)) × dt/1000`
- `PVbus + D + RectifierDC = C + ForwardInverterDC + CurtailmentDC`
- `ForwardInverterAC + GridImport = ServedLoad + Export + RectifierAC`
- موازنهٔ مستقل کل: ورودی PV و شبکه منهای بار تأمین‌شده، export، curtailment و **همهٔ تلفات** برابر افزایش ذخیره است.

اینورتر مشترک در یک بازه هم‌زمان rectifier و inverter نیست؛ import/export و شارژ/دشارژ هم‌زمان ممنوع‌اند. اولویت فرمان شارژِ مشخص‌شده می‌تواند PV قابل‌استفاده برای بار را کم کند؛ این رفتار برنامه‌ریزی‌شده است و optimizer بار-اول نیست. `recoveredClippingToBatteryW` فقط سهم شارژ PV از clipping بالقوهٔ همان باس/سقف اینورتر است، نه انرژی تحویل آینده به بار.

هر سه mode `powerplant/ongrid/offgrid` قابل اجرا هستند. offgrid اتصال شبکه/سقف export غیرصفر/grid-charging را رد می‌کند. در outage، تأمین AC فقط با `islandCapable=true` مجاز است؛ شارژ مستقل DC هنگام island با پرچم جداگانه اعلام می‌شود. این پرچم‌ها قابلیت اعلام‌شدهٔ تجهیزات‌اند، نه اثبات وجود کنترل grid-forming.

**محدودیت:** باس DC تنظیم‌شدهٔ ایده‌آل، راندمان ثابت، بدون منحنی part-load/standby، محدودهٔ ولتاژ MPPT، مدل کلیدزنی یا کنترل buck/boost. state انرژی این مدل، state الکتروشیمی SPM نیست؛ اتصال آن دو نیاز به حل سازگار ولتاژ/جریان و کنترل دارد و خودکار انجام نشده است.

## ۲. الکتروشیمی SPM

برای هر الکترود ذرهٔ کروی نماینده با حجم فعال واقعی ورودی در نظر گرفته می‌شود:

`∂c/∂t = (1/r²) ∂/∂r (D r² ∂c/∂r)`، شار مرکز صفر.

با جریان سلول مثبت در دشارژ و مساحت فعال `A=3Vactive/Rparticle`:

`jn=Icell/(F An)` و `jp=−Icell/(F Ap)`، و در سطح `−D∂c/∂r=j`.

حجم‌های پوسته‌ای دقیق `(r_out³−r_in³)/3` و شارهای وجهیِ داخلیِ مشترک، جرم را حفظ می‌کنند. `BDF` غلظت‌های دو الکترود را حل می‌کند. غلظت سطحی از سلول آخر و گرادیان Neumann بازسازی می‌شود؛ این بازسازی در لحظهٔ جهش جریان خطای وابسته به مش دارد، نه پاسخ دقیق لحظه‌ای.

سینتیک Butler–Volmer متقارن با `i0=k(T)√(ce cs(cmax−cs))` و `η=(2RT/F)asinh(Fj/(2i0))` است. ثابت واکنش با Arrhenius ورودی تنظیم می‌شود؛ ضریب انتشار ورودی باید برای **دمای اعلام‌شده** باشد و خودکار با یک ضریب عمومی تعمیم نمی‌یابد. ولتاژ سلول `Up−Un+ηp−ηn−Icell RΩ` است. OCP جدول صریحِ کاربر، درون‌یابی خطی و بدون extrapolation است.

جریان pack بر تعداد parallel تقسیم و ولتاژ سلول در series ضرب می‌شود؛ عدم‌تعادل سلول‌ها مدل نشده است. cutoff ولتاژ یا دامنهٔ غلظت/OCP اجرای ادامه را متوقف و `unexecutedDurationS` را گزارش می‌کند؛ آینده با صفر پر نمی‌شود. boundary جهش جریان نیز قبل از حل بازه کنترل می‌شود. مقدار ولتاژ در ریشهٔ رویداد دامنه ممکن است `null` باشد: یعنی خارج از دامنه **ارزیابی نشده**، نه ولتاژ صفر.

**محدودیت:** ایزوترمال، ce ثابت، ضریب انتشار ثابت در هر درخواست؛ نه DFN/SPMe، انتقال الکترولیت، SEI، plating، ageing یا thermal runaway. ادعای ایمنی/تضمین عملکرد در C-rate و دمای دلخواه ندارد. انتخاب پارامتر/دامنه باید از characterization همان شیمی و سلول باشد.

### مقایسهٔ مستقل واقعی

`pybamm==25.10.2` در محیطی مستقل از production نصب و SPM/Chen2020 با CasadiSolver و80سلول شعاعی اجرا شد. اسکریپت `scripts/physical-models-pybamm-oracle.py` مدل جدید را import نمی‌کند. پروتکل آزمون: 2.5A برای300s سپس120s استراحت،298.15K. fixture و نسخه‌های دقیق محیط در `docs/examples/physical-models/` هستند.

بیشینهٔ اختلاف ولتاژ در نقاط آزمون، شامل لحظهٔ شروع جریان:

| سلول شعاعی مدل جدید | بیشینه اختلاف با oracle |
|---|---:|
|10|25.173mV|
|30|8.766mV|
|60|4.428mV|

با60سلول، اختلاف نقاط انتخاب‌شدهٔ30تا299ثانیه و330تا420ثانیه کمتر از0.4mV بود. اختلاف جهش را حذف یا به دقت field تعمیم نداده‌ایم. این آزمون، **همگرایی و مقایسه با کتابخانهٔ مستقل در یک پروتکل** است، نه دادهٔ آزمایشگاهی و نه اعتبارسنجی عمومی تمام شیمی‌ها.

## ۳. کنترل/حفاظت گذرای فیزیکی

مدل averaged سه‌فاز متعادل است. جریان alpha-beta در مدار واقعی RL حل می‌شود:

`L diαβ/dt = vconverter,αβ − vgrid,αβ − R iαβ`.

کنترل در قاب تخمینی PLL است، نه با تزریق مستقیم زاویه/فرکانس واقعی شبکه به کنترلر. SRF-PLL از Vq اندازه‌گیری‌شدهٔ نرمال‌شده، PI و انتگرال زاویه استفاده می‌کند؛ اصلاح فرکانس محدود است و anti-windup دارد. ولتاژ dq از feedforward شبکه، PI خطای جریان و decoupling `+jωLi` ساخته می‌شود. PI جریان back-calculation anti-windup دارد. مرجع جریان به‌صورت برداری محدود و ولتاژ اعمالی به `mmax Vdc/√3` محدود می‌شود. **جریان حل‌شده مصنوعی clip نمی‌شود**؛ overshoot/overcurrent واقعی مدل می‌تواند از مرجع محدود بیشتر شود.

plant در قاب ساکن با RK4 و ولتاژ اینورتر ZOH حل می‌شود. هم‌زمان کار منبع، انرژی شبکه و تلفات مقاومتی با همان quadrature انتگرال می‌شوند؛ `Emagnetic=3L|iαβ|²/4` و residual انرژی ثبت و گیت می‌شود. تست مستقل مدار از **حل بستهٔ دقیق RL با ورودی سینوسی شبکه و ZOH اینورتر** استفاده می‌کند، نه کپی RK4. PI/PLL نیز تست tracking، phase lock، saturation و ریزکردن گام دارند.

### حفاظت و breaker

- جریان ایده‌آل positive-sequence: `Irms=|iαβ|/√2`؛ مدل CT/فیلتر اندازه‌گیری وجود ندارد.
- IEC IDMT با `t=TMS×a/(M^b−1)` برای `M>1` و ضرایب normal(.14,.02)، very(13.5,1)، extremely(80,2) و حداقل زمان صریح.
- در جریان متغیر، پیشرفت `∫dt/t(I)` جمع می‌شود؛ زیر pickup، reset **فوری و صریح** است، نه حافظهٔ حرارتی اختراعی.
- instantaneous overcurrent، پنجرهٔ V و f با delay و startup blanking صریح وجود دارد. فرکانس حفاظت خروجی PLL است، نه forcing واقعی شبکه.
- trip قفل می‌شود؛ reset/reclose خودکار نداریم. گشودن breaker پس از delay در شبکهٔ زمانی sampleS انجام می‌شود؛ خطای زمان quantization در آزمون لحاظ شده است.
- پس از open، شبکه و اینورتر از مدار جدا و مسیر dump مقاومتیِ صریح، انرژی القاگر را تخلیه می‌کند؛ قطع جریان بدون حساب انرژی انجام نمی‌شود.

**محدودیت بسیار مهم:** DC source و شبکه stiff تحمیلی‌اند؛ کنترل grid-following است، نه grid-forming برای offgrid. حالت‌های انرژی offgrid در مدل DC پشتیبانی می‌شوند، اما به معنی اجرای این کنترلر در جزیره نیست. مدل کلیدزنی PWM/EMT، خطای نامتعادل، LCL resonance، delay محاسبات/مدولاسیون و سنسور واقعی ندارد. این یک شبیه‌ساز مدار/کنترل/رله است، **نه firmware، anti-islanding جامع، هماهنگی حفاظت، گواهی ride-through یا تأیید IEC/IEEE/ایمنی سخت‌افزار**. برای آن‌ها مدل تجهیزات، HIL/EMT و تست‌های آزمایشگاهی/میدانی مستقل لازم است.

## آزمون‌های اجراشده

-15تست Python جدید، شامل300نمونهٔ تصادفی موازنه درسهmode، Decimal مستقل، clipping، rectification، outage، محدودیت انرژی/توان و all-or-nothing نبودن مدل‌ها.
-حفظ لیتیوم/کولن، سکون و استراحت، شارژ، مقیاس pack، حساسیت دما، cutoff، OCP و مقایسهٔ PyBaMM/همگرایی مش و گام.
-مدار RL با حل بستهٔ مستقل، PI/PLL، منحنی IDMT با Decimal، زمان trip با انتگرال مستقل RK45 اسکالر با tolerance سخت‌گیرانه، حفاظت V/f/instantaneous، saturation و انرژی dump.
-چهار mutation هدفمندِ معادلات ذخیره، شار انتشار، مدار و ضریب منحنی IEC توسط آزمون مستقل شناسایی شدند؛ هیچ معافیت literal/hash ساخته نشده است.
-ماتریس24درخواستی Python/TypeScript، subprocess واقعی هر سه مدل، binding/tamper/nonfinite، لغو، offsetهایUTC/+06:30/+14 و رد duplicate key در worker مستقیم.
-مرورگر واقعی Chromium: هرششoperation پژوهشی، سهmode DC، احراز هویت واقعی، اجرای API، دانلود آرشیو و خواندن فایل از دیسک و import، invalidation با edit/site و لغو/stale suppression. تست محدودیت6درخواست/IP/دقیقه را رعایت می‌کند؛ دور نمی‌زند.
-رگرسیون قبلی:66تست پژوهشی و158تست study؛ `test:all`، `lint:types`، `build`، `lint` گذشتند. lint دارای95warning موجود و صفرerror؛ build هشدار chunk بزرگ دارد.

دستورهای تکرار:

```sh
npm run test:physical:python
# PVLIB_PYTHON را به Python محیط pinned تنظیم کنید
npm run test:physical:api
npm run build
npm run test:physical:browser
```

گام‌های CI ویندوز/لینوکس و Playwright WebKit به workflow موجود افزوده شدند، اما **در این تحویل commit/push یا اجرای remote CI جدید انجام نشده است**؛ موفقیت محلی Chromium را Windows/Safari نمی‌نامیم. مشکل nativeSafari قبلی با این نتیجه حل‌شده تلقی نمی‌شود. نتیجهٔ موجود local working-tree است؛ receipt hash فایل‌ها در `docs/audit/PHYSICAL-MODELS-CHECKS.json` ثبت می‌شود.

## منابع و مرز شواهد

فهرست ماشین‌خوان URL/DOI/commit/hash/روش دریافت در `docs/examples/physical-models/SOURCES.json` است. منابع اصلی خوانده‌شده: اسناد SPM نسخه‌دار PyBaMM، فایل پارامتر Chen2020 با مجوز، کد اصلی DC-connected از NREL SSC، TN106/TN103 از Imperix و جدول/متن رسمی ABB615. PDFهای NREL و REJ603 دریافت نشدند؛ snippets جست‌وجو را به‌عنوان مطالعهٔ کامل PDF معرفی نمی‌کنیم. هیچ ادعای هم‌ارزی کامل با SAM یا اعتبار field از این منابع نتیجه گرفته نشده است.
