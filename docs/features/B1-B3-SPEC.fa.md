# B1–B3: مشخصات تحویل پژوهشی محدود و معیارهای پذیرش

مبنا: جدول فازهای برنامهٔ `AUDIT-FULL-CAPABILITY-REPLAN.fa.md`؛ B1=OET/هندسه، B2=باتری پیشرفته، B3=طیف/تاندم. شماره‌گذاری بخش باتری سند قدیمی مبنا نیست.

## Intake و مرز دامنه

کاربر: پژوهشگر PV/باتری؛ هدف: سه مسیر محاسباتی واقعی، بازتولیدپذیر و مستقل از مالی. همهٔ مسیرها پژوهشی و پیش‌فرض خاموش‌اند؛ نتیجه not_field_validated و projectApproval=blocked است. تولید سالانه، waterfall و مالی تغییر نمی‌کنند. داده‌های مثال synthetic یا parameter-set منتشرشدهٔ کتابخانه‌اند، نه پارامتر تجهیزات پروژه.

این تحویل معادل بستن کامل سه فاز نیست: Radiance و ray tracing MC چندبازتابی، هندسهٔ عمومی و سلول reverse-breakdown/hotspot، اعتبارسنجی آزمایشگاهی باتری/تخریب/propagation، optical transfer-matrix و benchmark فناوری تاندم به شواهد/توسعهٔ بیشتری نیاز دارند.

## طرح B1 — common-patch steady OET

قرارداد `oet_patch`، نسخهٔ `oet-patch-v1`: ۱–۶ patch مستطیلی افقی با مختصات ENU، ضلع‌ها، ضریب جذب، پارامتر دیود در ۲۵ درجه، alpha جریان، bandgap و nVt؛ تابش مستقیم قائم، مثلث‌های opaque صریح، دمای هوا/آسمان، h و emissivity و یال‌های رسانش حرارتی. برای هر patch نمونه‌برداری سطحی midpoint با n و 2n و سقف ray-pair انجام شود. یک رشتهٔ سری با جریان مشترک و دیود ایده‌آل Rs=0/Rsh=infinity، بدون bypass یا reverse operation؛ گرمای هر patch از absorbed−electrical و تبادل تابشی/جابه‌جایی/رسانش می‌آید. دما و جریان در حل steady به‌صورت دوطرفه کوپل شوند. coarse/fine optics و residual و تفاوت دما/توان گزارش شوند؛ عدم همگرایی gate را fail کند، نه fallback بی‌صدا.

پذیرش: سطح بی‌مانع=۱، پوشیدگی کامل=۰، شاهد نیم‌سایه و refinement، مقایسهٔ تک‌دیود یکنواخت با pvlib، حل مستقل ریشهٔ steady با pvlib و حالت تاریکی/epsilon صفر تحلیلی، مجموع رسانش صفر و conservation نور/مدار/حرارت، عدم تغییر plan و رد دامنهٔ غیرphysical. residual هر patch≤۱e−۶ وات؛ tolerance refinement از قبل در plan. هندسهٔ واقعی arbitrary tilt/anisotropic sky/چندبازتابی ادعا نشود.

## طرح B2 — pinned thermal PyBaMM adapter

قرارداد `battery_pybamm`، نسخهٔ `battery-pybamm-v1`: SPM/SPMe/DFN با thermal=lumped، جریان ثابت، SOC/دمای آغازین، مدت و sampling محدود؛ پارامترهای منتشرشدهٔ Chen2020 یا OKane2022. SEI solvent-diffusion-limited فقط با مجموعهٔ OKane2022 و بدون پیوند پارامترهای chemistry متفاوت؛ plating/mechanics/runaway وجود ندارند. نسخهٔ adapter PyBaMM=25.10.2؛ CasADi solver safe. سه solve: mesh پایه، mesh دوبرابر، mesh دوبرابر با tolerance ده‌برابر دقیق‌تر. trace voltage/temperature/discharge-capacity/total و irreversible/reversible heating، metrics همگرایی جدا و numericalGate گزارش شوند. رویداد cutoff پیش از افق باعث رد اجرا می‌شود؛ trace ناقص پذیرفته نشود.

پذیرش: هر سه مدل واقعاً solve شوند؛ ظرفیت جریان ثابت با I*t/3600 تا ۱e−۶ Ah تطبیق کند، حالت استراحت دمای محیط را حفظ کند، coarse/fine traces و delta مستقل بازحساب شوند، SEI با پارامتر همان chemistry تست شود، نصب/اجرا بدون اینترنت پس از نصب و telemetry خاموش؛ پارامتر و model/source hash ثبت شوند. این مقایسهٔ convergence و مدل کتابخانه است نه مقایسهٔ تجربی تجهیزات؛ انطباق کامل با SPM قدیمی و calorimetry همچنان backlog است.

## طرح B3 — spectral EQE / ideal 2T–4T

قرارداد `tandem_spectrum`، نسخهٔ `tandem-spectrum-v1`: شبکهٔ wavelength nm، spectral irradiance W/m²/nm، EQE خارجیِ هر دو زیرسلول روی همان شبکه با reference spectrum اجباری، ضریب normalization صریح به targetWm2 اختیاری نیست (null یعنی حفظ مقدار اصلی). EQEها متعلق به stack نهایی‌اند، نه دو تک‌سلول که هر دو تمام فوتون‌ها را جذب کنند؛ جمع EQE≤۱ برای همین مدل تک‌عبوری بدون photon multiplication. دادهٔ مشترک grid بدون extrapolation/resampling ضمنی. انتگرال trapz، Jph=q/(hc)∫Eλ·EQE dλ و mismatch ratio با reference روی بازهٔ یکسان. دیود ایده‌آل با J0 و nVt ارائه‌شده؛ 4T مجموع MPP مستقل، 2T بیشینهٔ I*(Vtop+Vbottom) در جریان مشترک تا min(Jph). بدون luminescent coupling، reverse breakdown، مقاومت و optical constants.

پذیرش: طیف تخت/EQE ثابت با انتگرال بسته، scaling و normalization و no-extrapolation، 2T≤4T و حالت زیرسلول یکسان equality، تاریکی بدون NaN و reference photocurrent صفر → ratio=null، مقایسهٔ تک‌دیود با pvlib و sweep مستقل؛ واحدها/حدود spectral و assumptions صریح باشند. دقت quadrature از ورودی EQE مستقل نیست؛ فناوری جدید یا بازتولید اندازه‌گیری perovskite ادعا نشود.

## API/UI/امنیت/rollback

هر سه schema strict در research API موجود؛ flag مستقل `SCIENCE_B_ENABLED=true` همراه `PVLIB_RESEARCH_ENABLED=true` و auth موجود. B2 به dependency optional نسخه‌قفل نیاز دارد، در غیر این صورت خطا بدون fallback. capabilities تنها در flag فعال operations را نشان دهد؛ UI مثال/JSON، loading/error/result/archive/cancel موجود حفظ شود. SDK allowlist و boundary موجود گسترش یابد. خاموش‌کردن SCIENCE_B_ENABLED rollback هر سه مسیر است. executor موجود: حداکثر یک job، timeout=۱۲۰ ثانیه، input=۸MiB/output=۳۲MiB و بدون resume/ذخیرهٔ durable؛ محاسبات مدل در Python.

## گیت تحویل

تست‌های عددی/واحد سه هسته، request/result/tamper واقعی API/SDK، auth/flag-off/rollback، production browser هر سه عملیات و archive/cancel، scoped lint/types و کل گیت portfolio/foundation اجرا شوند. receipt فایل‌ها را hash کند و software bounded را از full phase/field/release status جدا نگه دارد. dependency optional جدا از requirements اصلی نصب شود؛ نسخه‌های موتورهای قبلی تغییر نکنند. سه سؤال کیفیت: finance mutation ممنوع؛ بدون regression/numerical شاهد done نیست؛ provenance/precision/limits در result/docs الزامی است.
