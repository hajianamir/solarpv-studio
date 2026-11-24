# B1–B3 — راهنمای اجرا، شواهد و حد تحویل

تاریخ مبنا: ۲۰۲۶/۱۱/۰۳؛ working tree همان شاخهٔ Arena. این سند همراه [مشخصات و پذیرش](B1-B3-SPEC.fa.md) است. **سه مسیر پژوهشی واقعی پیاده شده‌اند، نه تکمیل تمام دامنهٔ فازهای B1 تا B3.**

## ۱. راه‌اندازی و استفاده

```bash
# نصب صریح runtime اختیاری؛ برای A1–A3 یا موتورهای قدیمی الزامی نیست
.venv/bin/python -m pip install -r services/pvlib_research/requirements-science-b.txt
PVLIB_PYTHON="$PWD/.venv/bin/python" npm run verify:science-b
```

نصب بعدی از اینترنت استفاده می‌کند؛ اجرای مدل پس از نصب هیچ دانلود داده یا مدل ندارد. API با `PVLIB_RESEARCH_ENABLED=true` و `SCIENCE_B_ENABLED=true` و auth/JWT موجود فعال می‌شود. `PORTFOLIO_ANALYTICS_ENABLED` برای Bها لازم نیست؛ flag مستقل است. بدون flag، عملیات B از capabilities حذف و اجرا با SCIENCE_B_DISABLED/503 رد می‌شود. worker مستقیم تابع عددی است؛ gate احراز هویت/flag در HTTP server اعمال می‌شود، نه import کتابخانه.

در تب اقلیم، ویرایشگر پژوهشی:
- **B1 coupled OET example**
- **B2 PyBaMM thermal example**
- **B3 spectral tandem example**

پس از انتخاب مثال، Run research؛ در خطا نتیجهٔ قبلی invalid می‌شود، cancel اجرای سرور را قطع می‌کند و پاسخ stale در UI پذیرفته نمی‌شود. plan/result را می‌توان در archive پژوهشی ذخیره و بازبینی کرد؛ restore به‌عنوان اجرای تازه پذیرفته نمی‌شود. rollback هر سه مسیر: `SCIENCE_B_ENABLED=false`؛ فرمول‌های فعلی PV/مالی/باتری تغییر نکرده‌اند.

SDK همان Client با `enabled=True` و request مثال‌های `docs/examples/science-b/*.synthetic.json` است. فقط URL صریح سرور و token حافظه‌ای؛ هیچ token در source/log/archive افزوده نمی‌شود. SDK HTTP واقعی برای B3 در گیت تست می‌شود، هر سه عملیات در API و مرورگر واقعی تست می‌شوند.

## ۲. B1: مدل common-patch OET و هندسه

### آنچه اجرا می‌شود

`services/pvlib_research/science_b.py::oet_patch` هندسه، دیودها و دما را روی شناسه‌های مشترک patch نگه می‌دارد. هر مستطیل افقی normal=+Z دارد. تابش ورودی فقط DNI مستقیم قائم است؛ surface-grid midpoint با n و 2n و visibility روی مثلث‌های opaque صریح اجرا می‌شود. kernel تقاطع همان `shading.visible` موجود (Möller–Trumbore، دوطرفه) است؛ گیرنده‌ها به‌صورت خودکار مانع نیستند.

برای هر patch:
- `IL(T)=ILref*(G/1000)*(1+alpha*(T−25))`
- `I0(T)=I0ref*(Tk/298.15)^3*exp(Eg*q/kB*(1/298.15−1/Tk))`
- `nVt(T)=nVtRef*(Tk/298.15)`
- `V_i(I)=nVt_i*log1p((IL_i−I)/I0_i)` در بازهٔ `0≤I≤min(IL)`.

جریان مشترک رشته با scalar MPP optimization تعیین می‌شود. diode ideal بدون Rs، Rsh، bypass یا reverse است؛ جریان به کم‌نورترین patch محدود می‌شود. این انتخاب محافظه‌کارانه از ادعای hotspot/reverse-breakdown جلوگیری می‌کند ولی جای مدار واقعی substring نیست.

ریشهٔ غیرخطی دما از این تراز پیدا می‌شود:

`absorbed_i − I*V_i − h*A_i*(Ti−Tair) − epsilon*sigma*A_i*(TiK^4−TskyK^4) − sum(gij*(Ti−Tj)) = 0`

رسانش‌های متقارن در جمع شبکه صفرند. تغییر T مستقیماً IL/I0/nVt و MPP را تغییر می‌دهد؛ این feedback دوطرفه است، نه اعمال خروجی ثابت موتور برق به حرارت. solution باید در −۴۰ تا ۱۲۰ درجه و residual هر patch≤۱e−۶ وات بماند؛ استخراج بیشتر از جذب رد می‌شود. مرز دمایی محدودیت عددی مدل است نه حد ایمنی تجهیز.

### شواهد و حد دقت

- تک patch یکنواخت با `pvlib.pvsystem.singlediode` و ریشه‌گیری مستقل brentq برای تراز حرارتی مقایسه می‌شود؛ tolerance دما/توان ۱e−۶. حالت تاریک با emissivity=0 دقیقاً Tair است.
- پوشش کامل و نیم‌سایهٔ مانع نزدیک، conservation نور/حرارت/مدار، رسانش جانبی و refinement ناموفق آزموده‌اند.
- نمونهٔ بدون مانع، patch با مساحت ۰٫۰۲۴۳۳۶m² و G=۸۰۰W/m²، دمای حدود ۴۱٫۸۳°C می‌دهد؛ **مصنوعی و صرفاً شاهد روش** است.
- n→2n فقط **quadrature نور روی همان patchها** را refine می‌کند؛ convergence شبکهٔ PDE حرارتی/سلولی نیست. حتی توافق دو grid ممکن است aliasing مشترک داشته باشد. gate عددی تضمین صحت هندسهٔ واقعی نیست.

دامنهٔ باقی: arbitrary tilt/sun vectors، diffuse/rear/ground، چندبازتابی، MC ray tracing، mesh refinement فیزیکی، optics↔temperature feedback در absorptance، resistive/bypass/reverse/hotspot، layered thermal state و مقایسهٔ خارجی Radiance. در این تحویل Radiance نصب یا بازتولید نشده است.

## ۳. B2: adapter واقعی PyBaMM

`services/pvlib_research/battery_pybamm.py` به‌صورت lazy نسخهٔ دقیق **PyBaMM 25.10.2 / CasADi 3.6.7** را بارگذاری می‌کند. requirements اختیاری solver و sympy را نیز pin می‌کند؛ کل زنجیرهٔ transitive با lock کامل vendored نشده است. نسخه/سازگاری runtime در گیت pip check و envelope ثبت می‌شود. import PyBaMM پیش‌فرض به موتورهای قدیمی اضافه نمی‌شود.

- مدل‌های مجاز SPM، SPMe، DFN؛ `thermal=lumped`، پارامتر Chen2020 یا OKane2022، جریان ثابت ±۱۰A، SOC اولیه ۰٫۱–۰٫۹، ۲۸۳٫۱۵–۳۱۳٫۱۵K، مدت ۱–۱۸۰۰s، ۵–۱۲۱ نمونه.
- option SEI=`solvent-diffusion limited` فقط با OKane2022؛ کپی‌کردن پارامتر تخریب از chemistry دیگر ممنوع. trace زیان ظرفیت negative-SEI را نشان می‌دهد، نه عمر مفید سالانه.
- ابتدا mesh n، سپس 2n با tolerance ثابت و بار سوم 2n با rtol ده برابر دقیق‌تر. deltaهای mesh و tolerance جدا، مطابق plan و trace بازحساب می‌شوند. این **مطالعهٔ tolerance زمانی حل‌گر** است، نه مطالعهٔ مستقل تمام گام‌های زمانی یا اثبات convergence سراسری.
- سه trace شامل ولتاژ، دما، ظرفیت discharge به Ah، heating حجمی کل/irreversible/reversible/Ohmic و SEI loss؛ ظرفیت discharge در شارژ می‌تواند منفی باشد و SOC یا ظرفیت باقی‌ماندهٔ سلول نیست.
- مقدار حرارت بر W/m³ است، نه وات pack. مجموع مؤلفه‌های گرمایش در همین options بدون contact/mixing heat با total مستقل کنترل می‌شود؛ این کنترل جبری جای انتگرال تراز انرژی حرارتی نیست. Chen2020 می‌تواند entropic heating را بر اساس فرض پارامتر مرجع صفر بدهد؛ از آن صحت ضریب برگشت‌پذیر سلول واقعی استنباط نمی‌شود.
- cutoff یا termination زودهنگام باعث خطا می‌شود؛ پوشش ناقص افق پاسخ «موفق» نمی‌گیرد. نبود dependency/نسخهٔ درست خطاست، نه fallback به SPM قبلی.
- SHA256 ماژول توزیع‌شدهٔ parameter-set ثبت می‌شود؛ این هش فایل انتخابی است، نه گواه جامع تمام توابع واردشده/پارامترهای تجربی. نسخهٔ موتور/NumPy/SciPy نیز در envelope موجود است.

شواهد: هر سه مدل واقعاً solve می‌شوند؛ ledger جریان ثابت `Q=I*t/3600` تا ۱e−۶Ah، rest دمای محیط را حفظ می‌کند، standalone SPMe با mesh=24 و tolerance مستقل‌تر به‌عنوان مرجع library integration مقایسه می‌شود (خطای ولتاژ≤۲mV). این مرجع، آزمایش مستقل سلول نیست. SEI مثبت و nondecreasing تست می‌شود. خروجی convergence پاس یا fail دارد و gate field همچنان بسته است. اجرای fresh-process با mock ممنوعیت هر socket.connect، هم import اولیه و هم حل را بدون تلاش اتصال شبکه تست می‌کند؛ telemetry پیش از import غیرفعال است.

در تست‌ها warning deprecation متعلق به `np.trapz` داخل PyBaMM 25.10.2 دیده می‌شود؛ خطای حل نیست و با ارتقای بی‌قاعدهٔ dependency پنهان نشده است. مقایسهٔ harmonized با SPM قدیمی، calibration ولتاژ/گرما، cycling lifetime، plating/mechanics/cracking و runaway/propagation باقی‌اند. مدل سبک قبلی دست‌نخورده و در regression موجود تست می‌شود.

## ۴. B3: EQE و تاندم ایده‌آل

`science_b.py::tandem_spectrum` فقط شبکهٔ مشترک دقیق wavelength (nm، ۲۰۰–۴۰۰۰nm)، irradiance (W/m²/nm) و EQE نهایی دو junction را می‌پذیرد. هیچ resampling یا extrapolation ضمنی ندارد. طیف reference روی همان شبکه اجباری است؛ normalization فقط طیف ورودی را در صورت target غیرnull به مقدار درخواستی scale می‌کند، نه طیف مرجع را.

`Jph = q/(h*c) * trapezoid(E_lambda * EQE * lambda_nm * 1e-9, lambda_nm)`

EQE نهایی stack لازم است و جمع EQEهای دو سلول≤۱؛ این فرض تک‌عبوری بدون photon multiplication است. دو EQE از سلول‌های مستقل روی تمام نور را نباید بدون مدل optics به اینجا داد. `currentRatioToReference` نسبت جریان است و شدت کل را نیز در بر می‌گیرد؛ **ضریب spectral mismatch استاندارد IEC/ASTM نیست**. reference current صفر → null، تاریکی → توان صفر؛ normalization تاریکی رد می‌شود.

دیود ایده‌آل با J0 و nVt داده‌شده و nonnegative junction voltage: در 4T هر junction MPP مستقل دارد؛ در 2T جریان مشترک با مجموع ولتاژها بهینه می‌شود. operating pointهای هر دو حالت در پاسخ‌اند. validator روابط دیود، stationarity/boundary شرایط MPP و ledger را بازحساب می‌کند. شرط `P2T≤P4T≤incident` enforce می‌شود؛ پارامتر غیرphysical با انرژی الکتریکی بیشتر از نور رد می‌شود.

شواهد: طیف تخت و EQE ثابت با انتگرال بسته تا ۱e−۱۰A/m²، oracle تک‌دیود pvlib برای MPP تا ۱e−۷W/m²، sweep مستقل ۱۰۰۰۰۱ جریان برای 2T نامتوازن تا ۱e−۵W/m². برابری 2T/4T برای زیرسلول یکسان، normalization، darkness، reference صفر، grid نامرتب/ناهم‌اندازه و عدم امکان دوباره‌مصرف فوتون آزموده شده‌اند. این دقت‌های numerical fixture به EQE اندازه‌گیری‌شده منتقل نمی‌شوند. trapz روی دادهٔ واقعی به resolution و uncertainty داده وابسته است و CI تجربی نمی‌سازد.

باقی: optical constants/transfer matrix، luminescent coupling، resistance، reverse/tunnel junction، spectral angular response و benchmark فناوری واقعی Si/perovskite. این مدل ایده‌آل یا دادهٔ synthetic به‌عنوان بازتولید سلول منتشرشده معرفی نمی‌شود.

## ۵. تحقیق و تصمیم‌های ثبت‌شده

۱. **مرور کد و تحقیق OET:** `shading.py` موجود finite triangles اما مدار linear-IV بدون temperature داشت؛ kernel visibility آن reuse و مدل الکتریکی/thermal جدا توسعه داده شد. مدل legacy جایگزین نشد. oracle از pvlib pin موجود و scalar root مستقل است؛ هیچ ادعای خواندن یا اجرای Radiance ثبت نشد.

۲. **مرور باتری و تحقیق نسخه‌دار:** متن رسمی [PyBaMM thermal models 25.10.2](https://docs.pybamm.org/en/v25.10.2/source/examples/notebooks/models/thermal-models.html) دربارهٔ lumped ODE، گرمای irreversible/reversible/Ohmic و پارامتر cooling خوانده شد. متن [coupled degradation 25.10.2](https://docs.pybamm.org/en/v25.10.2/source/examples/notebooks/models/coupled-degradation.html) لزوم پارامتر OKane2022 و وابستگی پایداری cracking به mesh را روشن می‌کند. تصمیم: فقط SEI انتخابی با مجموعهٔ همان مدل؛ mechanics/plating نه با چند ضریب حدسی.

۳. **مرور طیف و تحقیق مرجع:** [PVcircuit، README در commit ثابت](https://github.com/NatLabRockies/PVcircuit/blob/79ee249ce934ce20eafb83454bbfcf48622b59b2/README.md) خوانده شد؛ این پروژه multijunction، luminescent coupling و energy yield را جدا می‌کند. توضیح Jint/EQE در نتایج جست‌وجوی آن مبنای کنترل واحد nm/Wm²nm بود. PVcircuit dependency نشده و ادعای بازتولید benchmark دادهٔ آن نداریم؛ در این تحویل analytical/pvlib/sweep oracles استفاده شده‌اند.

### مجوز/ریسک dependency

PyBaMM توزیع نصب‌شده BSD-3-Clause و CasADi طبق metadata نصب‌شده LGPLv3+ است؛ pybammsolvers مجوز را در metadata این محیط صریح اعلام نمی‌کند و باید همراه notices توزیع خودش بررسی شود. هیچ متن یا دادهٔ مقاله با مجوز نامعلوم کپی نشده است. optional server dependency است، نه کد frontend. مجوز کلی مخزن/تعهدات بازتوزیع و بررسی آسیب‌پذیری جامع با گیت numerical حل نمی‌شود؛ آماده‌بودن محصول قابل‌انتشار عمومی ادعا نمی‌شود.

## ۶. Verify / Reflect / Gate

- `scripts/test_science_b.py`: ۱۵ تست numerical/strict/بدون شبکه، شامل ۳ مدل واقعی و SEI.
- `scripts/test-science-b.ts`: worker واقعی، input immutability و result tamper، HTTP واقعی auth/flag مستقل/rollback، SDK HTTP واقعی B3.
- `scripts/test-science-b-browser.ts`: production Chromium هر سه operation، JWT، archive download/restore و cancel/stale suppression.
- `npm run verify:science-b`: Python، integration، scoped ESLint، **تمام verify:portfolio شامل foundation/regression/build/types و ۷ operation قبلی مرورگر**، مرورگر B و pip check. CI runtime اختیاری را صریح نصب و همین گیت را اجرا می‌کند؛ اجرای remote CI در این نشست ادعا نمی‌شود.

در Reflect دو خطای توسعه اصلاح شد: API parameter_sets در این نسخه dict برمی‌گرداند، لذا source hash از ماژول whitelist نسخه‌قفل گرفته شد؛ manifest نیز اجازه نمی‌دهد executor برای قابلیت planned درج شود، پس runaway/mechanics planned و بدون executor باقی ماندند و R11 صرفاً به partial با شاهد ایده‌آل واقعی تغییر کرد. یک اجرای دستی foundation بدون PVLIB_PYTHON به Python سیستم فاقد dependencies رفت؛ با runtime pin درست دوباره پاس شد، نه با حذف تست.

رسید نهایی `docs/audit/B1-B3-GATE.json`: softwareStatus فقط مربوط به همین scope محدود، fullPhaseStatus هر سه partial، release مسدود به‌علت دامنهٔ باز و شواهد واقعی مفقود. هش فایل‌ها و receipt کامل A1–A3 در آن ثبت می‌شود. وضعیت نهایی تست‌ها باید از receipt آخر خوانده شود، نه این توضیح روش.

## ۷. سه کنترل کیفیت و backlog

- پژوهش ناخواسته وارد مالی/انرژی؟ **خیر**؛ هیچ adoption adapter جدید، تغییر سالانه‌سازی، finance mutation یا اصلاح waterfall اضافه نشده است. snapshotهای B1/B3 پوشش زمانی سالانه ندارند و gate پذیرش پروژه همواره blocked است.
- regression و مرجع عددی؟ **در گیت اجباری‌اند**؛ بدون پاس آنها ready-for-review ثبت نمی‌شود.
- دقت/محدودیت/منشأ؟ source در plan، hash پارامتر B2، محدوده و assumptions در output، و روش/محدودیت در همین سند و spec ثبت‌اند.

مرحلهٔ بعدِ مستقل قابل‌توسعه: گسترش هندسهٔ B1 با sun vector و diffuse محدود و oracle خارجی؛ آزمایش همگرایی مستقل time-step/heat ledger و پروتکل چندمرحله‌ای B2؛ adapter طیف/EQE ناهم‌grid با policy صریح و آزمون quadrature در B3. دادهٔ واقعی فناوری/تجهیز برای calibration/field gate همچنان لازم است. این‌ها backlog هستند، نه قابلیت تکمیل‌شده.
