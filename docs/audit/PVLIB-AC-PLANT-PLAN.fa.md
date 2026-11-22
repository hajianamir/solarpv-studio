# طرح پیش از کد: سه مرحله AC plant — 1.7.0
تاریخ 2026-11-03.

## موجودی و ایمنی مخزن
workspace شامل نسخه دقیق تحویل 1.6.0 بود، اما HEAD/index محلی به base برگشته بود. همه ۵۵ مسیر تفاوت base تا b5f1751 با remote byte-for-byte برابر بودند؛ پس از بررسی ancestor، فقط ref و index به descendant تحویل قبلی fast-forward شد؛ هیچ فایل workspace، تاریخچه remote یا تغییر مستقل بازنویسی نشد. در شروع توسعه درخت پاک است.

## سه مرحله و منابع بررسی‌شده
۱. ترانسفورماتور با بی‌باری و باری: API و source نسخه‌دار https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.transformer.simple_efficiency.html و https://pvlib-python.readthedocs.io/en/v0.13.1/_modules/pvlib/transformer.html خوانده شد. Pin=Pout+R*nll+ll*Pout²/R، توان signed، ترانس همیشه متصل. برای ll=0 و پایداری عددی به‌جای تقسیم 0/0 و cancellation سورس، ریشه معادل rationalized استفاده می‌شود و با residual مستقل/bisection آزمون می‌شود. خروجی |Pout|>rating یا discriminant نامعتبر رد، نه clipping. PF=1؛ نه مدل شبکه/حفاظت/سازگاری استاندارد.
۲. auxiliaryPowerW ثابت، روی باس LV پیش از ترانس، شب و روز روشن. کسر توان صریح در موازنه انرژی؛ نه ضریب حدسی از ظرفیت، نه بار دلخواه/باتری. از مصرف داخلی Sandia جدا و آن را شامل نمی‌شود.
۳. acAvailability با provenance مستقل و recordهای timestamp/availableFraction کامل و هم‌تراز weather. صرفاً ضریب retained fraction بر تولید مثبت AC اینورتر؛ نه قطع اتصال شبکه، کنترل فیزیکی یا خاموشی مصرف‌های داخلی. مقادیر از کاربر؛ بدون تولید سری تصادفی یا fill.

مرجع نرم‌افزار مستقل بررسی‌شده از GitHub API: SSC cmod_pvsamv1.cpp با نسخه ثابت https://github.com/NatLabRockies/ssc/blob/4c4fdece33bde610c762b9bea8e47d7f7b40db9d/ssc/cmod_pvsamv1.cpp ؛ transformer no/load loss و AC adjustment factors جدا دارد. این الگوریتم و ترتیب ما معادل تمام SAM نیست. صفحه SAM pv_losses/availability قابل دریافت نبود؛ ادعای خواندن آن نداریم.

## قرارداد و ترتیب
هر سه اختیاری و مستقل: system.transformer={ratingVa,noLoadLossFraction,loadLossFraction}؛ auxiliaryPowerW>=0؛ acAvailability={source,quality,records:[{timestamp,availableFraction:0..1}]} با همان تعداد/زمان UTC weather. interval_end/average یکسان. سقف هر مسیر plant برابر۸۷۸۴ رکورد.

تولید مثبت اینورتر × availability؛ مصرف منفی اینورتر حفظ؛ auxiliary از باس LV کم می‌شود؛ ترانس signed حل می‌شود؛ سپس واردات/صادرات جدا و cap روی صادرات مثبت اعمال می‌شود. DC و نقطه کار دوباره حل نمی‌شوند. night imports و تلفات بی‌باری حتی هنگام fraction=0 باقی‌اند؛ این availability مدل outage شبکه نیست.

ستون‌ها: acPlantInputW (signed inverter AC before plant)، acAvailabilityFraction، availabilityLossW، auxiliaryConsumptionW، transformerLossW، gridImportW. خلاصه/ماه: availabilityLossWh، auxiliaryConsumptionWh، transformerLossWh، gridImportWh و netGridWh signed. acWh خروجی صادرات پس از cap؛ inverterSelfConsumptionWh همچنان diagnostic مستقل است، نباید دوباره از net کم شود. netGridWh=acWh−gridImportWh. acBeforeExportLimitW در plant پس از ترانس و پیش از cap است؛ بدون plant معنای قدیمی حفظ می‌شود.

تمام مراحل فرم→review→run→archive/restore→compare/report؛ CSV availability سخت با دو ستون بدون حدس. مدل‌های plant در manifest؛ مدل ناسازگار خودکار مقایسه نمی‌شود. گزینه‌های غایب تمام samples/monthly/summary قبلی را دقیق حفظ می‌کنند. تست مستقل residual و انرژی، صفر/شب/جهت معکوس/دامنه، alignment Z و offset، CSV ناقص، عملی API/browser و exact-SHA CI لازم‌اند. Docker، field/bankability یا SAM-equivalence ادعا نمی‌شود.
