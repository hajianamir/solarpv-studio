# طرح پیش از کد — ده مرحلهٔ بازبینی نتیجه
2026-11-03؛ مبنا1357825836df5e4046f188308fff1a4c67c6f34d، شاخه پاک. موتور1.8.0 و study-insights-v1 حفظ؛ ماژول مشتق‌شدهٔ جدید study-explorer-v1.

## پژوهش پیش از کد و دامنه
- pvlib0.13.1 singleaxis خوانده شد: https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.tracking.singleaxis.html ؛ tracker_theta زاویه signed هندسی است، نه فرمان actuator/مدل سرعت، باد یا stow. مرحله۷ فقط جمع تغییرات قدرمطلق نقاط هندسی متوالیِ active در انتخاب، بدون bridge شب یا مرز انتخاب.
- pvlib0.13.1 inverter.pvwatts خوانده شد: https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.inverter.pvwatts.html ؛ inverter AC از پیش clipping دارد. مرحله۵ صرفاً acExportLimitLossW را می‌شمارد، نه clipping upstream یا توان بالقوهٔ بازیافت‌پذیر.
- pvlib0.13.1 sapm_cell خوانده شد: https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.temperature.sapm_cell.html ؛ دمای سلول مدل‌شده، تابع irradiance/temp/wind و mounting است. مرحله۴ تحلیل دما و threshold **اختیاری و صریح کاربر** است؛ نه آستانه ایمنی خودکار، lifetime یا hotspot.
- RFC4180 و W3C PROV در تحویل قبلی خوانده/ثبت شده‌اند؛ همان قرارداد CSV CRLF/quotes/guard و source declaration برقرار می‌ماند. مراحل۱/۲/۳/۶/۸/۹/۱۰ از قرارداد worker/مدل‌های موجود و حسابداری صریح تبعیت می‌کنند، نه فرمول فیزیکی جدید.

## قرارداد ده مرحله
۱. daily UTC: همه metricهای موجود از samplePower*dt، تاریخ midpointUTC؛ شامل Wh و Wh/m² مجزا. traceability به inputSHA، نه annualization. روز ناقص پر نمی‌شود.
۲. انتخاب startUtc/endUtc با Z/offset معتبر، در دوره واقعی فایل و start<end؛ midpoint در [start,end)، کل بازه انتخاب می‌شود، **نه prorating**. بازه خالی مجاز با status empty و metric null؛ خارج دوره یا calendar نامعتبر reject. JSON/CSV نمونه‌های انتخاب‌شده و dailyCSV قابل دانلود؛ metadata انتخاب در JSON/HTML و UI آشکار. به input اصلی و archive دست نمی‌زند.
۳. peak maxima برای dc/ac/import/net signed در صورت موجود با زمان midpoint و interval-end اولین tie؛ متوسط توان هر بازه، نه قله instantaneous. optional missing unavailable، عدد ساختگی نه.
۴. min/max/mean دمای سلول و ساعات strict >threshold اگر کاربر عدد finite[-100,200] بدهد؛ default threshold=null. برای interval منظم mean وزن زمانی برابر است. بدون داده statusempty، نه mean0. نه damage/thermal protection.
۵. cap-loss event runs با شرط >1e-6W، counts/hours/lossWh و حداکثر5event نمونه و longest duration؛ duration برحسب تعداد*dt، نه زمان دقیق controller. inactive unavailable؛ حدصفرتست شود.
۶. MPPT state0..4، count/hours/dcWh و constraintLossWh در صورت electrical؛ labels همان قرارداد worker. absent unavailable، state invalid/missing reject؛ معادل downtime/protection نیست.
۷. tracker active/parked hours و theta range، totalActiveStepTravelDeg فقط adjacent active pairs در selection؛ max step و تعدادpairs. هیچ bridge شب/selection، rate/wear/stow claim نه.
۸. آمار اعمال‌شده albedo/front/rearSR و blocked beam hours/Whm² و lossWh/m²؛ inactive retained rear معنای absent دارد و صریحاً علامت‌گذاری می‌شود؛ provenance درrequest باقی است.
۹. net-grid = export−import، cap before−loss=export و DC before−additional=DC، با components در Wh. import در plant ازgridImportW، Sandia بدونplant ازinverterSelfConsumptionW؛ baseline بدونمدل signed import را unavailable می‌گوید، نه استنتاج سخت‌افزار. parasitic دوباره کم نمی‌شود؛ residual درtolerance1e-6*max(1,term magnitudes)، نه نمایش ادعای field balance.
۱۰. diff ورودی دو سناریوی هم‌قرارداد با gate قبلی، تمام leaf paths متفاوت شاملarray length و اعضا، presence/missing مجزا ازnull/0، ترتیب other−current؛ max100نمایشUI، JSONکامل boundedبهسقفrequestهای8MiB. per-path values scalar فقط، نه تکرار آبجکت‌های بزرگ. inactive parameters نیز diff می‌شوند ولی لزوماً اثر عددی ندارند. escape HTML/React و عدم ورودی آزاد درCSV.

مرزها: worker/requirements/physics/schema تغییر نکنند، evidence validation خروجی جدید اگر کلید لازمmissing باشد قبلrender رد یا unavailableصریح. gate قدیمی/aliases ثابت. JSON/HTML اصلی شامل تشخیص full-period بدونthreshold، selected view export مستقل با options صریح؛ archive فقط داده اصلی و بعدrestore تحلیل دوباره مشتق می‌شود. UI physicalrun→diagnostics→archive/restore→compare/report/CSV/JSON؛ tests مستقل عددی و actualPython/API/browser، regressions، exact-SHA all6CI، selectivepush همینشاخه بدونmerge.

## پالایش بر مبنای قرارداد موجود worker
- worker ستون sample به نام mpptConstraintLossW ندارد؛ کاهش MPPT از max(0,arrayMppW−dcBeforeAdditionalLossW) با همان tolerance عددی worker (-max(1e-5,mpp*1e-7)) مشتق می‌شود. بیش‌بود بزرگ operating power رد می‌شود، نه پوشانده؛ roundoff بسیار کوچک مطابق worker صفر می‌شود. هیچ ستون یا فرمول فیزیکی worker تغییر نمی‌کند.
- خروجی datetime.isoformat Python برای ورودی مجاز .123Z می‌تواند .123000Z باشد. evidence/range با سه رقم یا شش رقمِ منتهی به000 پذیرفته می‌شود؛ اعشار زیرمیلی‌ثانیه غیرقابل‌نمایش درJS رد می‌شود، نه truncate. ورودی اصلی weather همچنان همان قرارداد سابق است.
- DC balance با before*(1−declaredAdditionalLossPct/100) در برابر dcWh چک می‌شود؛ plant/cap bookkeeping با نمونهٔ تغییر حساسیت مستقل آزموده می‌شوند.
