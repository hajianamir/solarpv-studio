# مقایسهٔ پژوهشی DFN با دادهٔ واقعی Chen2020

وضعیت نهایی نرم‌افزار فقط از `docs/audit/CHEN-MEASURED-BENCHMARK-GATE.json` خوانده شود. این ابزار CLI جدید،بدون API/UI/SDK جدید یا مصرف‌کنندهٔ تولیدی است؛عملیات قبلی تغییر نکرده‌اند. اجرای صریح CLI همان opt-in است؛rollback=عدم اجرای runner. نصب اختیاری نسخه‌ثابت همان requirements-science-b.txt لازم است. هیچ auto-install یا اتصال runtime به شبکه وجود ندارد؛PyBaMM telemetry پیش از import خاموش می‌شود.

## اجرا و بازپخش

```sh
# محاسبهٔ کامل و سپس آزمون/receipt؛ممکن است چندین دقیقه طول بکشد.
.venv/bin/python scripts/verify_chen_measured_benchmark.py --run
# بازبینی نتیجهٔ موجود بدون حل مجدد (نیازمند cache trace همان اجرا)
.venv/bin/python scripts/verify_chen_measured_benchmark.py
```

گزارش خلاصهٔ ماندگار `docs/audit/CHEN-MEASURED-BENCHMARK.json` است. trace کامل در `.cache/chen-measured-traces.json` تولید می‌شود و عمداً وارد Git نمی‌شود؛مسیر/هش و غیرماندگار بودن آن در گزارش صریح است. در محیط تازه یا پس از تغییر source باید --run استفاده شود؛دادهٔ خام اندازه‌گیری‌شدهٔ منبع ماندگار و آفلاین موجود است.

سه سلول02/03/04،چهار جریانnominal .5/2.5/5/7.5A،دوmesh8/16،مدلDFN،پارامترChen2020 وthermal lumped بدون fitting اجرا می‌شوند. هر discharge ازSOC1 آغاز و به rest همان case باstateپیوسته متصل می‌شود. CC/CV پیشین بازپخش نمی‌شود و initialSOC1 فرض است،نه حالت تأییدشدهٔ هر سلول. cell02 مرجعdevelopment و03/04 retrospective evaluation هستند؛این داده‌ها از قبل منتشر و پارامترChen نیز مبتنی برهمین مطالعات است،پس این split آزمون مستقل وblind نیست.

خروجی‌ها خطایMAE/RMSE/bias(pred−measured)/maxAbs ولتاژ ودمای lumped دربرابر sensorسطح را جدا برای discharge وrest گزارش می‌کنند. این دو تعریف دما یکی نیستند. constantambient/current فرض‌اند؛دامنهٔ واقعی chamber وانحراف جریان actual ازnominal جدا ثبت می‌شود. اگر cutoff مدل زودرس باشد،فقط prefix پشتیبانی‌شده score می‌شود،coverage گزارش و rest مسدود است. هیچ extrapolation،جابه‌جایی cutoff،حذف سلول ناموفق یا تنظیم آستانه برای pass انجام نمی‌شود.

## سه بازبینی و پژوهش

1. **منشأ و قرارداد آزمایش:** metadata اصلی [Zenodo4032561](https://zenodo.org/api/records/4032561)،مجوزCC-BY-4.0،size/MD5 اصلی وSHA256 محلی سهCSV بررسی شدند؛راهنمایانتساب درreference-data/chen-validation. بررسی ردیف‌های واقعی نشان داد current magnitude است وmode جهت را تعیین می‌کند. Step2 partial باSOCنامعلوم ازپیش خارج شد؛Step7/12/17/22 بعدازCC/CV+rest انتخاب شدند. marker SBr زمان مساوی ایجاد می‌کند:درtrace وscore حفظ می‌شود؛فقط grid ورودی solver unique می‌شود.
2. **مدل و انتخاب پارامتر:** [مقالهٔ Chen درWarwick](https://wrap.warwick.ac.uk/id/eprint/136795/2/WRAP-development-experimental-techniques-parameterization-multi-scale-lithium-ion-battery-models-Chen-2020.pdf) و [نسخهٔ Birmingham](https://pure-oai.bham.ac.uk/ws/portalfiles/portal/96660426/Chen_2020_J._Electrochem._Soc._167_080534.pdf) درنتایج جست‌وجو بررسی شدند؛fetch کاملWarwick شکست خورد،پس ادعای fulltext review نیست. نتایج شرح می‌دهند که پارامترهای tuning وrelaxation مهم‌اند؛بنابراین این runner parameter ثابت منتشرشده را بدون tuning به‌کار می‌برد و rest را از discharge جدا گزارش می‌کند. OCV/SOC برمبنای ولتاژ هرcell fitنمی‌شود.
3. **دقت عددی و مرز ادعا:** grid8/16 تنها sensitivityاست؛نه اثبات مرتبهٔ همگرایی. شاهد مستقل math.fsum روی trace باmeasurement اصلی،metrics وsummary را بازحساب می‌کند. cutoff وcoverage صریح‌اند؛مقایسهٔمشابه پارامتر/دادهٔمنتشرشده نه validation مستقل پروژه است،نه thermalqualification،نهRUL/runaway. کد upstream پارامتر نصب‌شده byteبهbyte باfrozen نسخه25.10.2 برابر می‌شود. وضعیت physicalQualification همیشهnot_established وprojectApproval همیشهblocked است؛آزمون نرم‌افزار با خطای فیزیکی پایین برابر نیست.

## Changelog این ابزار مستقل

- قرارداد انتخاب12case پیش ازحل ثبت شد؛دوmesh،statecontinuity،cutoff-awarecoverage،خطاهای جداگانه،منشأ وگزارش بازتولیدپذیر اضافه شدند.
- آزمون oracle تحلیلی metrics،ردnonfinite/شکل ناسازگار،حفظ duplicate و منعextrapolation،انتخابهمهcaseها وwitnessمستقل اضافه شدند.
- هیچ فایل رفتار تولیدی یا مسیر مالی/انرژی تغییر نکرده است. receiptهای گذشته مربوط بهsnapshotقبلی خودشان هستند؛گیت جدید ادعایاجرای مجدد تماممرورگرهای محصول را ندارد،چوناین CLI بهآنمسیرها متصلنیست.

## باقی‌مانده

بدون آستانهٔتجربی ازپیش تأییدشده،هیچ physical pass/fail صادر نمی‌شود. CV/historyکامل،پارامترthermalقابل‌دفاع،drivecycleاندازه‌گیری‌شده،sitequalification،pack وrunaway بازند. این ابزار هیچ‌یک ازA1/A2/A3/B1/B3/C1/C2/C3/D1/D2/D3 باقیمانده را به‌جای آن‌ها نمی‌بندد وکلB2/A1–D3 تکمیل نشده است. متن kernel-only دربرخیراهنماهایقدیمی شرحsnapshotقدیمی است؛وضعیتintegrationB2 درreceipt BATTERY-PROTOCOL-GATE مستقل ثبت شده است.

### اصلاح کارایی پیش از نتیجه

اجرای اولیه با gridنامنظمmeasurement به‌دلیل ساخت مکررintegrator متوقف شد و هیچنتیجه‌ای ازآن انتخابنشد. شبکهٔخروجی ثابت10s+endpoint اکنون استفاده می‌شود؛prediction درزمانactualmeasurement فقطداخلsupport درون‌یابی می‌شود. این sampling باIDASmaxstep10s متفاوت است؛خطایدرون‌یابی جدا کالیبره نشده است. فیزیک،initialSOC،currentnominal،caseها،mesh ومعیارخطا عوض نشدند.
