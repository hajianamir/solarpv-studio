# برنامهٔ مرحله۳۹ — برنامهٔ زمانی مصرف کمکی
2026-11-03؛ مبنا d12117d؛ مرحله۳۸ در این کار پیاده‌سازی نمی‌شود.

موجودی شروع: مصرف ثابت auxiliaryPowerW و availability بازه‌ای، transformer دوطرفه، export cap و بلوک‌های مستقل موجودند. مسیرهای لازم برای تغییر: قراردادTS/Python، محاسبهACplant، guardنتیجه، CSV/editor/restore، ledger/report و capability/version. فایل‌های foundation نامرتبط و untracked حفظ می‌شوند.

تصمیم قرارداد: auxiliarySchedule با source/quality و records شامل timestamp,powerW، میانگین توان غیرمنفی هر بازه به وات؛ پایان‌بازه و UTC دقیقاً مطابق weather. هیچ interpolation، forward fill، timezone guess یا schedule تکرارشونده ساخته نمی‌شود. ثابت و schedule همزمان، حتی ثابت صفر، رد می‌شوند. مصرف روی باسLV و پس ازavailability و پیش ازtransformer است؛ باavailabilityصفر باقی می‌ماند. مصرف داخلی اینورتر نباید در آن دوباره وارد شود. تنها root برای چنداینورتر؛ بودجه۸۷۸۴بازه و سقف‌های موجود حفظ می‌شوند.

پیش از کد: مرجع pinned pvlib0.13.1 transformer.simple_efficiency خوانده شد: ورودی/خروجی signed و مصرف شبانه/دوطرفه، ترازتوان و افت وابسته به مربع خروجی. این مرحله مدل جدیدترانس یا فرمول فیزیکی مصرف تجهیزات اضافه نمی‌کند؛ فقط توان صریح بازه را به همان تراز قبلی می‌دهد.
https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.transformer.simple_efficiency.html

آزمون هدف: تراز تحلیلی و انتگرال دقیقه‌ای/مرزماه، شب/zeroavailability/zeroexport، transformer مستقل باbisection، چنداینورتر وMPPT، رد نقص/تکرار/ترتیب/محدوده/provenance/دوحالتهمزمان، برابریscheduleثابتباقدیم، guard/archive/tamper، CSVسخت‌گیر، مرورگرورود/review/اجرا/download/restore و CIدقیقSHA. شواهد مصنوعی‌اند؛ میدان/سالانه/ایمنی تأیید نمی‌شوند.
