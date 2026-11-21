# مرحله۳۶ — ورودی‌های MPPT مستقل

موتور **1.11.0**؛ قرارداد بیرونی `pvlib-study-v1`. پایهٔ مرحله۳۵: `ea3d2a6`. این قابلیت **۲تا۴ زیرآرایهٔ ثابت مستقل به یک اینورتر PVWatts مشترک** را مدل می‌کند؛ مرحله۳۷ چنداینورتر نیست.

## مسیر استفاده
در Study Builder، DC electrical model را **Independent MPPT inputs** انتخاب کنید. فهرست JSON را در editor فهرست ورودی‌ها وارد و Validate/Apply کنید؛ review کل فهرست شامل محدودیت‌ها/هندسه/منبع/مقاومت را نشان می‌دهد. سپس Run independent study.

نمونهٔ قابل‌آزمون و صریحاً مصنوعی در `docs/examples/mppt-inputs.synthetic.json` است. برای آن مجموع `arrayPdc0W=15840`، `inverterPdc0W=10000` و `additionalDcLossPct=0` بگذارید. این فایل **پارامتر پیشنهادی پروژه، دیتاشیت معتبر یا دادهٔ عملیاتی نیست**؛ تنها نمونهٔ قرارداد برای آزمایش عددی است. برای پروژه پارامترها را از شواهد واقعی خود جایگزین کنید.

هر ورودی باید صریحاً شامل موارد زیر باشد:
- `id`: شناسه یکتایASCII، ۱تا۴۰حرف/عدد/underscore/hyphen؛ ترتیب ورودی‌ها در خروجی حفظ می‌شود.
- `source` و `quality`: منشأ پارامترهای همان ورودی، صرفاً اعلام‌شده و بدون تأیید اصالت.
- `surfaceTiltDeg` و `surfaceAzimuthDeg`: هندسهٔ مستقل ثابت.
- `arrayPdc0W`: توان نامی همان ورودی؛ باید باMPPماژول×سری×موازی تا۲٪ سازگار باشد. مجموع ورودی‌ها دقیقاً با توان نامی کل سازگار می‌شود، نه scaling مخفی.
- `electrical`: تمام پارامترهای ماژول De Soto، تعدادهای سری/موازی، محدودهMPPT، حداکثرولتاژ، حدجریان وشرایططراحی همان ورودی. `electrical.dcCable` اختیاری طبق مرحله۳۵، با منبع و مقاومت حلقهٔ مستقل.

پارامترهای دیود، تعدادها، حدجریان، پنجرهٔ ولتاژ و مقاومت ورودی‌ها می‌توانند متفاوت باشند. هر ورودی درون خود ماژول‌ها و رشته‌های یکسان با تابش/دمای یکنواخت دارد. کابل مشترک بین ورودی‌ها تعریف نشده؛ `sharedLoopResistanceOhm` تنها بین رشته‌های **داخل همان ورودی** مشترک است.

## روش واقعی محاسبه
۱. هر ورودی همان site/weather صریح را دریافت می‌کند. هندسهٔ خودش POA وIAM را تعیین می‌کند؛ ضرایب optical/thermal مشترک اعلام‌شده‌اند اما POA، تابش مؤثر و دمای سلول هر زیرآرایه جدا محاسبه می‌شوند. SAPM، Faiman یا PVsyst با ضرایب صریح مجازند.
۲. منحنیIV و نقطهٔ کار هر MPPT با قیود خودش و افتI²Rکابل خودش، مستقل حل می‌شود. همان حلگر مرحله۳۵ است، نه ضرب درصد یا فرض ولتاژ مشترک.
۳. فقط **توان‌های تحویلی DC** جمع می‌شوند. ولتاژها نه جمع، نه میانگین و نه برای ورودی دیگر استفاده می‌شوند. حدجریان یک ورودی نقطهٔ کار دیگری را تغییر نمی‌دهد.
۴. منحنی اینورتر PVWatts، clipping و درصورتفعال‌بودن ACplant/auxiliary/availability/exportcap فقط یک‌بار روی مجموع اعمال می‌شوند. توانACتک‌زیرآرایه‌ها با هم جمع نمی‌شود.

منبع پیش از کد: [pvlib0.13.1 pvwatts_multi](https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.inverter.pvwatts_multi.html): جمع توان ورودی‌هایMPPT و سپس یک مدل اینورتر. این منبع شاهد استراتژی aggregation است؛ صحت IV/کابل از معادلات مستقل مرحله۳۵ و تست‌های جداگانه می‌آید؛ صرف برابرشدن دو اجرایworker «شاهد مستقل فیزیک» نامیده نمی‌شود.

## خروجی، گزارش و بازیابی
- ستون‌های `m0_`، `m1_`، … به ترتیب فهرست ورودی‌اند؛ JSONورودی کنار نتیجه شناسه و پارامترهای متناظر را حفظ می‌کند.
- هر prefix شامل `operatingVoltageV`، `operatingCurrentA`، `dcOperatingState`، `arrayVocV`، `arrayVmpV`، `arrayMppW`، `dcW`، `arrayOperatingVoltageV`، `dcCableLossW`، `dcCableVoltageDropV`، `poaGlobalWm2`، `effectiveIrradianceWm2` و `cellTemperatureC` است.
- **ولتاژ عملیاتی یا state تجمیعی وجود ندارد.** state صفر/چهار همان sentinelهای خاموشی مرحله۳۵ هستند، نه اندازه‌گیری مدار باز.
- DCکل، availableMPP، گرمای کابل و شکاف نقطهٔ کار جداگانه جمع و در دوره/ماهUTC/explorer/CSV نگهداری می‌شوند. رابطهٔ حسابداری: `availableMppWh = dcWh + dcCableLossWh + mpptConstraintLossWh`.
- ledger مشتق‌شدهٔ انرژی هر ورودی و هر ماهUTC در UI و گزارش چاپی هست. explorerJSON فیلد `independentMppt` با انرژی و وضعیت‌های ورودی‌های انتخاب‌شده دارد؛ حالت MPPTتجمیعی به‌درستی `independent_inputs_no_aggregate_state` است، نه disabled یا یک state ساختگی.
- **ستون‌های بدونprefix مربوط به POA/دمای صفحهٔ مرجع root هستند، نه میانگین یا نمایندهٔ زیرآرایه‌ها.** دما/thresholdعمومی explorer نیز فقط صفحهٔ مرجع است؛ banner وreport وmanifest این را تصریح می‌کنند. تغییر هندسهٔ مرجع توان ورودی‌ها را عوض نمی‌کند.
- JSON/CSV، IndexedDB پس ازreload، archive، bundle، clone، sourceledger، report وscenario comparison فهرست و نتایج ورودی‌ها را حفظ می‌کنند. مقایسه تنها در صورتعبور از gatesموجودنسخه/مدل/هواشناسی انجام می‌شود؛ تغییر ظرفیت نرمال‌سازی خودکار ندارد.

guardنتیجه، وجود همهٔ ورودی‌ها، finite/bounds، VI، KVL، I²R، حدودMPPT/current/Voc، دمای مدل‌شده، مجموع توان، معادلهPVWatts روی مجموع، انرژیDC/ACدوره/ماه وmanifest را کنترل می‌کند؛ ورودی/نتیجهٔ خراب از archive/import رد می‌شود. این کنترل arithmetic است، نه تأیید اصالت یا re-simulationمستقل تمام optics.

## رد صریح و سقف منابع
- حالت global `electrical` با `mpptInputs` همزمان ممنوع است؛ هیچ انتخاب خاموش وfallback وجود ندارد.
- `additionalDcLossPct` غیرصفر، Sandia تک‌ولتاژی، tracker، row/bifacial وcell-temperature scheduleمشترک در این variant رد می‌شوند. این محدودیت از فرض ولتاژ/هندسه/دمای مشترک ناموجه جلوگیری می‌کند؛ Sandiamulti، trackermulti وper-inputtemperature schedules اجرا نشده‌اند.
- site، weather، coefficientهای IAM/spectral/thermal و برنامه‌های محیطی مشترک‌اند؛ هندسه/پارامترهای دیود/کابل/قیود هر ورودی مستقل‌اند. controllerdynamic، MPPTefficiency و قید جریان مشترک بین ورودی‌ها مدل نشده‌اند؛ limitsباید متناسب با سخت‌افزار از کاربر بیاید.
- سقف مجموع `تعدادورودی × تعدادبازه ≤ 17568`. حداکثر۸۷۸۴بازهٔ هواشناسی؛ بنابراین۲ورودی×۸۷۸۴بازهٔ ساعتی سال‌کبیسه یا۴ورودی×۴۳۹۲بازه مجاز است. ترکیب۴ورودی×سال‌کامل از سقف فراتر می‌رود و صریحاً رد می‌شود؛ خودکار truncate/split/annualize نمی‌شود. این سقف برای نگهداری سقف16MiBخروجی و زمان اجرایboundedصریح است. تست پرشدن سقف و رد اولین ردیف اضافی وجود دارد.
- ACcable، چنداینورتر، battery/dispatch، mismatch/bypass، طراحی حفاظت/ampacity وcalibration خارج از دامنه‌اند. هیچ weatherعملیاتی ساخته/پر نشده است.

## شواهد آزمون
`test_multi_mppt.py`: دو اجرای جدا برای routing، اختلاف ولتاژ واقعی، استقلال ورودی دوم از حدجریان اول، تفاوت دمای دو صفحه، بی‌اثر بودن هندسهٔ مرجع برDC، معادلهٔ تحلیلیPVWatts بر مجموع وclippingیک‌بار، plant/capیک‌بار، ۴ورودی فعال و شب بامصرفauxiliaryفقطیک‌بار، قراردادها و تست سقفoutput/records. این‌ها fixtureهای عددی مصنوعی‌اند.

`test-study-multi-mppt.ts`: قراردادTS، Pythonواقعی، ردtamperingستون‌ها/انرژی/ولتاژجعلی‌مشترک، چندمدلحرارتی، ledgerورودی/ماه، explorerstate، نسخه، نمونهٔ مستندات، bundle/archive/clone، sources، report وcomparison. مرورگر واقعی editorJSONنامعتبر→خطا→اصلاح→review→run→CSV/report→backup→restore→IndexedDBsave→reload→restore را با نتیجهٔ یکسان اجرا می‌کند.

۱۰پیکربندی بدونopt-in نسبت بهworkerمرحله۳۵ برای samples/summary/monthly **برابری عددی دقیق** داشتند: fixed، diode، cable، Sandia، tracker، rows، optical، plant، environment وPVsyst. فرمول‌های قبلی تغییر نکرده‌اند. موفقیت تست/CI به معنی fieldvalidation، bankability، برآورد دقت، اعتبار سالانه یا تأیید ایمنی نیست.
