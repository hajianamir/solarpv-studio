# مرحله۴۴ — برنامهٔ پیش از کد
2026-11-03؛ مبنا312f73f؛ همان شاخه، بدون merge.

دامنه طبق فازبندی: پروتکل نسخه‌دار/منشأ/قفل به مطالعه/گزارش/بازتولید و کنترل stale/tamper. هسته در تحویل قبل موجود است؛ این مرحله بستهٔ قابل‌حمل برای اتصال **نتیجهٔ دقیق** (از جمله manifest/نسخه/هش worker/اجرای حفظ‌شده) به plan/report و metadata مسئول بازنگری را اضافه می‌کند. تغییر موتور، کالیبراسیون یا آمار جدید نداریم.

بسته study-protocol-package-v1، metadata شامل protocolId/reviewer/revision/createdAt/changeReason و previousPackageSha256 برای revision>1؛ SHA نتیجهٔ canonical، report و کل payload. ظرفیت256KiB. بازخوانی ابتدا schema/hash، سپس validateResult و تطبیق resultSha و بازمحاسبهٔ report از plan و مقایسهٔ کامل؛ تغییر report با hash مجدد هم نباید پذیرفته شود. plan-only قدیمی سازگار و مستقل است؛ package به خروجی دقیق قفل می‌شود، پس rerun حتی با همان input ممکن است fingerprint دیگر داشته باشد و عمداً رد شود.

hash صرفاً integrity و metadata خوداظهاری است؛ امضا/هویت بازبین/زمان مورداعتماد/پیش‌ثبت مستقل را ثابت نمی‌کند. previoushash لینک ادعایی است نه تاریخچهٔ append-only تأییدشده. ورودی package هیچ نتیجه یا پارامتر مدل را overwrite نمی‌کند؛ فقط plan پس از verify به فرم برای تأیید مجدد وارد می‌شود. تغییر plan/result/metadata گزارش بستهٔ قدیمی را پاک می‌کند. فایل نادرست/بزرگ بدون fallback پذیرفته نمی‌شود.

مرجع پیش ازکد RFC8785: عملیات hash نیازمند نمایش ثابت داده است؛ از canonicalBundleJson موجود با ترتیب ثابت code-unit استفاده می‌کنیم، **نه ادعای انطباق RFC8785**، نه localeCompare جدید. https://www.rfc-editor.org/rfc/rfc8785 . hash با oracle مستقل Node crypto تست می‌شود.

گیت‌ها: deterministic roundtrip/reordering، old-plan compatibility، input برابر+worker/نسخهٔ متفاوت، reporttamper+rehash، metadata/date/revision/unknown keys/size، HTML escape و immutability؛ browser download/readback/import/reconfirm/edit/reset/oversize و CI دقیقSHA، regressionهای قبلی. بدون دادهٔ واقعی fieldValidation=false می‌ماند.
