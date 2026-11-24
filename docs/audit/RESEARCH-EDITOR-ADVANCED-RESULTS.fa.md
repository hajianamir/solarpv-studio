# اتصال ویرایشگر/API پژوهشی و دو مدل پیشرفته

## دامنهٔ تحویل

روی شاخهٔ `arena/237e6ea2-solarpv-studio`، بر پایهٔ HEAD `5438fb59f4bb5cde05c20818b780464e1fe28752`؛ تغییرات working tree هستند، نه commit جدید و نه انتشار تأییدشده. تغییرات قبلی حفظ شده‌اند. این قابلیت جدید از StudyResult تولیدی، waterfall و مالی جدا است.

### ویرایشگر و مسیر اجرایی واقعی

- بخش Research editor در تب Climate با JSON سخت‌گیرانه، پیش‌نمایش نوع قرارداد، سه مثال **مصنوعی و برچسب‌دار** و import درخواست/آرشیو.
- هر سه operation واقعاً اجرا می‌شوند: `integrated`، `thermal_two_node`، `diode_network`؛ نتیجهٔ نمایشی جعلی یا fallback ندارند.
- ویرایش ورودی، import/restore، تغییر مختصات و Cancel نتیجهٔ قبلی را نامعتبر و درخواست جاری را abort می‌کند. بازیابی، خروجی قدیمی را اجرای تازه تلقی نمی‌کند.
- دانلود نتیجه و آرشیو `research-editor-archive-v1`؛ بازیابی آرشیو دارای نتیجه، قرارداد و پیوند درخواست/نتیجه را بررسی می‌کند ولی نتیجه را پاک نگه می‌دارد تا دوباره اجرا شود.
- Bearer token اختیاری در رابط، فقط در حافظهٔ همان component؛ نه localStorage، نه آرشیو. استقرار gateway احراز‌شده می‌تواند header را بیرون component تأمین کند.
- `GET /api/v1/research/capabilities` بدون اجرای probe؛ `POST /api/v1/research/run` با feature flag مستقل `PVLIB_RESEARCH_ENABLED=true` و احراز هویت موجود سرور. بدون پیکربندی JWT/gateway نیز اجرا رد می‌شود؛ مسیر development با هویت دلخواه به‌عنوان احراز هویت این قابلیت پذیرفته نمی‌شود.
- احراز هویت و feature flag قبل از JSON parser؛ بدنه حداکثر 8MiB، نرخ 6 تلاش احرازشده در دقیقه/IP، همزمانی یک اجرا **در هر process سرور**، deadline پیش‌فرض 120s، خروجی 32MiB. استقرار چندپردازه به quota مشترک در لبه نیاز دارد.
- worker ثابت Python، stdin/stdout، بدون shell/path/script انتخابی کاربر؛ محیط محدود و تعداد thread عددی محدود. لغو، timeout و عبور از بودجهٔ خروجی کل process group را در Unix می‌کشند؛ شاخهٔ Windows از taskkill /T /F استفاده می‌کند. اجرای Windows در این محیط آزمایش نشده است.
- پاسخ `research-api-result-v1` دارای canonical request، SHA256 درخواست، نسخهٔ Python/pvlib/numpy/scipy و hash چهارفایل entry/model/composition است. integrated علاوه بر آن hash worker و requirements موجود خود را حفظ می‌کند. این hashها امضای دیجیتال یا تأیید منبع کاربر نیستند.

### مدل حرارتی دوگرهی

`services/pvlib_research/advanced_thermal.py`، قرارداد `two-node-thermal-plan-v1`:

```
Cc dTc/dt = Qabsorbed − Pelectrical − Gcb(Tc−Tb)
            − (hf0 + hfw wind)(Tc−Tair)
            − emissivityFront sigma (TcK⁴−TskyK⁴)
Cb dTb/dt = Gcb(Tc−Tb) − (hb0 + hbw wind)(Tb−Tair)
            − emissivityBack sigma (TbK⁴−TgroundK⁴)
```

واحد ظرفیت‌ها J/(m² K)، شارها W/m²، ضرایب انتقال W/(m² K) است. دمای اولیهٔ cell/back جدا، منبع و دامنهٔ پارامترها اجباری‌اند. forcing در هر interval **ZOH** است؛ زمان صریح Z/offset و پیوستگی بدون gap/overlap لازم است. ارتفاع باد و ارتفاع ضرایب باید یکسان باشند؛ هیچ تبدیل ارتفاع پنهانی وجود ندارد.

RK4 با integral همزمان هفت شار، کنترل timestep بر پایهٔ ثابت زمانی محافظه‌کارانه، حداکثر 200000 گام و کنترل دامنهٔ هر state میانی/نهایی دارد. residual انرژی هر گره و کل، و مقایسهٔ observationهای مستقل cell/back گزارش می‌شود. مرورگر نیز ترازها را از انرژی و تغییر دمای خروجی دوباره محاسبه می‌کند.

**حدود:** مدل lumped areal است، ساختار لایه‌ای laminate را حل نمی‌کند؛ تابش مؤثر هر سطح به مخزن sky/ground صریح با view مؤثر کامل فرض شده است. جذب فقط به گره cell وارد می‌شود. پارامترها fit/کالیبره نشده‌اند و سنسور back هرگز cell تلقی نمی‌شود. این مدل خودکار به بازده تولیدی وصل نیست.

### مدار single-diode و bypass

`services/pvlib_research/diode_network.py`، قرارداد `diode-network-plan-v1`:

```
I = IL − I0 expm1(Vd / nNsVth) − Vd/Rsh
Vd = V + I Rs
Vsubstring(I) = max(−Vbypass, VfiveParameter(I))
```

برای هر substring، پنج پارامتر **در شرایط کارکرد فعلی** و افت bypass صریح لازم است. سیم‌بندی هر substring دقیقاً یک بار در 1–4 رشتهٔ سری تعریف می‌شود؛ مجموعاً حداکثر 12 substring. هیچ تقسیم خودکار fit ماژول به substring انجام نمی‌شود. رشته‌های موازی روی ولتاژ مشترک و با blocking ایده‌آل مدل می‌شوند.

حل V(I) با pvlib Lambert-W، ریشهٔ جریان رشته با Brent و جست‌وجوی MPP در segmentهای بین نقاط bypass/blocking با تحمل و budget صریح انجام می‌شود. همگرایی، finiteness و residual جمع توان کنترل می‌شوند. خروجی شامل MPP مشترک، مجموع MPP مستقل، mismatch، وضعیت bypass و اتلاف دیود است. اتلاف bypass مربوط به جریان **شاخهٔ دیود** است، نه کل جریان رشته؛ mismatch نباید بار دیگر به‌عنوان loss تولیدی اعمال شود. مرورگر رابطهٔ ضمنی دیود برای گره‌های غیربای‌پس و جمع توان گره‌ها را مستقل بررسی می‌کند.

**حدود:** زیررشته‌ها درون خود یکنواخت‌اند؛ avalanche، reverse breakdown سلولی، hotspot، شبکهٔ cell-level، switching واقعی و تأیید حفاظت/ایمنی پیاده نشده‌اند. انتخاب پارامترها، دما/تابش متناظر و wiring مسئولیت ورودی است. مدل به optics/انرژی تولیدی متصل نشده است.

## راه‌اندازی

```sh
python -m venv .venv-research
# فعال‌سازی venv بر اساس سیستم‌عامل
python -m pip install -r services/pvlib_research/requirements.txt
# pvlib پین‌شده: 0.13.1
# PVLIB_PYTHON را به Python همین محیط تنظیم کنید.
# PVLIB_RESEARCH_ENABLED=true
# JWT_SECRET و JWT_ISSUER / JWT_AUDIENCE یا gateway احراز‌شده را پیکربندی کنید.
npm run dev
```

در درخواست HTTP شکل envelope چنین است: `{ "operation": "thermal_two_node", "plan": { ... } }`؛ plan خام بدون operation پذیرفته نمی‌شود. دو نمونهٔ تازه در `docs/examples/research/two-node-synthetic-request.json` و `docs/examples/research/diode-network-synthetic-request.json` موجودند. مثال integrated قبلی در `docs/examples/research/integrated-synthetic-plan.json` باید در `{operation:'integrated',plan:...}` قرار گیرد؛ دکمهٔ مثال integrated در رابط همین کار را می‌کند.

```sh
python -m unittest discover -s services/pvlib_research/tests -v
npm run test:research:api
npm run build
npm run test:research:browser
# رگرسیون کامل جدید؛ از بازنویسی receipt نهایی موجود خودداری می‌کند:
python scripts/validate-research-editor.py
```

## آزمون‌ها و شواهد

آزمون‌های تازهٔ عددی: ماتریس‌نمایی مستقل برای حالت بدون تابش؛ DOP853 مستقل برای تابش T⁴؛ سرمایش شب، observationهای مستقل، تراز دو گره، دامنه و cancel؛ حل ضمنی مستقل بدون pvlib و sweep متراکم 20001 جریان برای مدار سایه‌خورده؛ bypass، uniform series/parallel، تاریکی، wiring و بودجهٔ محاسباتی. این‌ها آزمون الگوریتم‌اند، نه اندازه‌گیری عملیاتی.

آزمون HTTP: سه اجرای واقعی، پیوند درخواست، tamper hash و دمای نتیجه، 18 مورد قرارداد مشترک TS/Python (2 پذیرفته/16 رد)، JWT واقعی سرور و رد هویت جعلی، auth قبل از parse، غیرفعال/بدون auth config، JSON خراب/بدنهٔ بزرگ، rate/capacity، cancel، timeout، output limit، malformed result و خاتمهٔ descendant در Linux. شاخهٔ Windows در CI اضافه شده ولی اجرای remote آن ادعا نمی‌شود.

Chromium واقعی: اجرای هر سه مدل از خود ویرایشگر، رد JSON نامعتبر، دانلود/بازیابی آرشیو، حذف نتیجه پس از edit/restore/site-change و جلوگیری از نتیجهٔ stale پس از cancel.

اجرای توسعهٔ اولیه 13/13 suite را گذراند، اما هنگام سخت‌ترکردن نهایی قرارداد خروجی snapshot ثابتی نبود؛ تنها receipt نهاییِ بدون تغییر کد برای snapshot تحویلی معتبر است. نتیجهٔ نهایی در `RESEARCH-EDITOR-ADVANCED-EVIDENCE.json` و خلاصهٔ انتهای این سند ثبت می‌شود.

## منابع بررسی‌شده پیش از پیاده‌سازی

- pvlib 0.13.1 Bishop88: https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.singlediode.bishop88.html — معادلهٔ دیود، Vd و محدودیت reverse breakdown.
- pvlib 0.13.1 De Soto: https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.pvsystem.calcparams_desoto.html — پنج پارامتر در دما/تابش مشخص؛ شمار سلول‌ها داخل a_ref است. این تحویل scaling خودکار آن را ادعا نمی‌کند.
- NIST/CODATA ثابت Stefan–Boltzmann: https://physics.nist.gov/cgi-bin/cuu/Value?sigma — sigma≈5.670374419e−8 W/(m² K⁴). این منبع فقط ثابت را پشتیبانی می‌کند، نه کالیبراسیون مدل پروژه.
- منابع و محدودیت‌های integrated قبلی در `PVLIB-55-SOURCE-AND-BLOCKER-REGISTER.fa.md` حفظ شده‌اند.

تمام خروجی‌های تازه `not_field_validated` و `projectApproval=blocked` هستند. دادهٔ مستقل پروژه، بررسی صلاحیت‌دار مهندسی، اعتبارسنجی میدان، CI دقیق SHA و اجرای Windows همچنان انجام‌نشده‌اند. هیچ دادهٔ ساعتی عملیاتی ساخته یا با صفر پر نشده است.

## نتیجهٔ نهایی نسخهٔ تحویلی

- **13/13 مجموعه PASS، صفر مجموعهٔ ناموفق**؛ 65 تست Python پژوهشی (شامل 7 تست تازه) و 158 تست Python تولیدی.
- workflow و integrated، API/auth/resource/process-tree، مرورگر واقعی جدید و مرورگرهای قبلی، lint/types/build، core benchmark و audit همگی exit0. lint دارای 95 هشدار قبلی و صفر خطاست؛ build هشدار اندازهٔ chunk دارد.
- مجموع زمان suiteها: **283.11 ثانیه**؛ timestamp ماشینی رسید: `2026-11-21T18:54:07.080403+00:00`.
- SHA256 snapshot کد: `b85601a6f2d3ab2171b7fa6cf3a2790b8cdb6ea96278237e7fc4539df5150acc`. manifest فایل‌ها پیش و پس از اجرا برابر بود و پس از مستندسازی نیز جداگانه بررسی شد.
- رسید ماندگار همراه hash هر log: `docs/audit/RESEARCH-EDITOR-ADVANCED-EVIDENCE.json`. logs کامل محلی: `.cache/study-evidence/research-editor-final/`.
- نمونهٔ حرارتی واقعیِ مصنوعی پس از 60s: cell=28.1050579103°C، back=25.2279686896°C، residual کل≈9.38e−11 J/m².
- نمونهٔ مدار واقعیِ مصنوعی: MPP=80.1891268612W؛ مجموع MPP مستقل=103.9883873015W؛ mismatch=23.7992604403W؛ residual≈7.36e−12W. درخواست و پاسخ کامل کنار هم در `docs/examples/research/` نگهداری می‌شوند.
- هیچ commit/push/merge یا اجرای remote CI انجام نشد. اعداد نمونه شاهد الگوریتم‌اند، نه عملکرد سایت یا پذیرش پروژه.
