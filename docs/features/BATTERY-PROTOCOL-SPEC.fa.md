# پذیرش B2 — پروتکل جریان پله‌ای و حساسیت زمانی

عملیات جدید مستقل battery-protocol-v1،مدل واقعی pinned PyBaMM25.10.2/CasADi3.6.7،SPM/SPMe/DFN،thermal=lumped،Chen2020 یا OKane2022؛SEI فقط OKane2022. پروتکل1..12بازهٔ جریان ثابت -10..10A (علامت مثبت discharge)،هرکدام1..600s و کل<=1800s،initialSOC=.1...9 وT=283.15..313.15K. samplePerStep3..21،mesh4..12 وmaxTimeStepS=1..60،relativeTolerance=1e-8..1e-4. CV/voltage-event cycling،plating،runaway و pack safety خارج دامنه‌اند.

هر step به‌صورت InputParameter با Simulation.step و state پیوسته اجرا شود؛نه reset اولیه و نه interpolation جریان پله‌ای. ابتدا/انتهای هر segment جدا گزارش شوند؛در مرز مشترک دو ردیف با جریان/ولتاژ چپ و راست عمدی‌اند،اماcapacity/temperature باید پیوسته باشند. cutoff/حل زودهنگام هیچ full-horizon output تولید نکند.

چهار run:base؛mesh2x با همان tolerance/maxstep؛mesh2x وtolerance/10؛همان سوم با maxstep/2. maxstep هم CasadiSolver.dt_max (event-check window) و هم IDAS extra_options_setup.max_step_size است؛صرف افزایش samples به‌عنوان temporal refinement معرفی نشود. اختلاف max ولتاژ/دما/ظرفیت روی همان نقاط منطقی step/sample گزارش شود؛مشاهدهٔ delta کوچک اثبات مرتبهٔ همگرایی عمومی نیست.

منشأ پارامترهای Chen2020/OKane2022 و test_simulation از commit313dd7f5793ae24429b1c5f814bd795637600305 رسمی PyBaMM v25.10.2 وLICENSE درmanifest frozen شوند. تطابق کد پارامتر نصب‌شده و frozen،اجرای آزمون منتخب upstream step_with_inputs،oracle انتگرال جریان و heating decomposition،rest،step/charge/discharge،constant-current regression،mesh/time/solver sensitivity وcutoff/offline لازم است. پارامتر مقاله با صحت سلول پروژه برابر نیست و دادهٔ تجربی جدید ادعا نشود.

API/SDK/editor پشت BATTERY_PROTOCOL_ENABLED و پایه research default-off؛optional runtime همان PyBaMM نصب‌شدهٔ صریح در core research environment،بدون auto-install/fallback. strict TS/Python،شاهد ledger نه حل PyBaMM در UI،tamper/auth/flag/rollback/browser وfull priorgate لازم. no energy/finance adoption،projectApproval blocked وsafety not_assessed. این برش کل B2 یا A1–D3 نیست.
