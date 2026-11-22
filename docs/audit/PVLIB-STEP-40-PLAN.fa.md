# برنامهٔ مرحله۴۰ — سقف صادرات بازه‌ای
2026-11-03؛ مبنا55f014d؛ موتورهدف1.14.0.

موجودی: سقف ثابت acExportLimitW، ACplant signed، auxiliaryScheduleمرحله۳۹، بلوک‌های مستقل و گزارش/آرشیو موجودند. مسیرهای تغییر: قراردادTS/Python، capپسازplant، guardانرژی، CSV/editor/review/restore، ledger/explorer/report/capability و تست.

قرارداد انتخابی: acExportLimitSchedule باsource/quality وrecords شاملtimestamp,limitW؛ سقف صریح غیرمنفی ثابت در هر بازه، دقیقاً هم‌تراز با weather درUTC. ثابت وscheduleهمزمان حتی ثابتصفر رد؛ nofill/nointerpolation. تنهاroot، حداکثر۸۷۸۴ردیف. min(صادراتمثبتپیشازسقف،سقفبازه) پسازinverter/plant؛ واردات بدونتغییر. بدونDCfeedback، کنترلگذرا، باتری یا بازحلMPP/ترانس براثرcurtailment.

پیشازکد مرجعpinnedخواندهشد: https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.inverter.pvwatts.html — clippingاینورتر قبلاً درمدلAC رخداده؛ exportcap مرحلهٔدیگریاست و نبایدبه‌عنوانclippingیاافتDC دوباره‌شماریشود.

آزمونهدف: مقایسهتحلیلیmin/ترازتوان، importsدرشب/zeroavailability/zerocap، ترکیبauxiliary/transformer/blocks/MPPT، ثابتدرمقابلscheduleثابت، دقیقه/مرزماهUTC، offsetمعادل، ردgap/duplicate/reorder/range/dualmode/child/budget، tamper/monthlyintegration/archive، مرورگرواقعیCSVبد→اصلاح→اجرا→download→IDBreloadrestore، رگرسیون وCIدقیقSHA. داده‌ها مصنوعی‌اند و fieldvalidationادعانمی‌شود.

وضعیتGitشروع: فایل‌ها دقیقاً با55f014dبرابر بودند ولیpointerمحلی5438fb5بود. پسازبررسیبایت‌به‌بایت وstashحفاظتی، همانشاخه باff-onlyبه55f014dرسید؛ ششفایلfoundationاضافی بازگرداندهشدند، historyبازنویسی‌نشد.
