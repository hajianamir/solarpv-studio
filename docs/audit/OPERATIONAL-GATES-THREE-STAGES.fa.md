# سه مرحلهٔ گیت‌های باقی‌مانده

۱. شاهد مستقل مالی: استخراج هفت AST دقیق، oracle جداگانهٔ Python/Decimal برای خرید برق، رشد تعرفه، ledger دو ساله، NPV و LCOE؛ مقایسهٔ کل خروجی و اجرای mutation sensitivity. clampها با سه حالت invalid/negative/over-limit سنجیده می‌شوند، نه فقط مقدار داخل دامنه. منبع مفهومی: SSC singleowner commit 6ce13d26f44b3a21f7bf0fbb5b1e3f3f80cf3860، utility_bill_w_sys / cf_utility_bill، خرید جدا از فروش. پارامترهای fixture انتخاب‌های صریح آزمون‌اند، نه دادهٔ سایت یا پیش‌فرض منتسب به SSC.

نکتهٔ کشف‌شده در بررسی: خروجی تابع مالی شامل کلیدهای JavaScript با مقدار undefined است؛ JSON فعلی fixture آن‌ها را نمایندگی نمی‌کند. اگر لازم شد، نمایش نوع‌دار صریح و بدون اتلاف برای undefined به validator افزوده می‌شود، با آزمون رد null/کلید حذف‌شده/عدد غلط؛ هیچ کلید یا عددی نادیده گرفته نمی‌شود و حساسیت دقیق AST حذف نمی‌شود.

۲. گیت اجرایی: یکسانی نسخه/مدل بین batchها، binding سایت و context، رد ورودی خارج از مرز و گزارش مختلط؛ بررسی race و ابطال انتخاب، سال کامل و هزینه واردات. تغییرات هر مرحله با آزمون همان مرحله سنجیده می‌شوند.

۳. snapshot ثابت و رگرسیون کامل Linux شامل API/browser/production/research/workflow/audit/build و hygiene برای Push. هیچ commit یا push انجام نمی‌شود. گیت میدانی/Windows/remote exact-SHA با تست مصنوعی جایگزین نمی‌شود.
