# تحویل مسیر مستقیم pvlib — ۲۰۲۶-۱۱-۰۳

شاخه: `arena/237e6ea2-solarpv-studio`؛ مبنا: `5438fb59f4bb5cde05c20818b780464e1fe28752`.

## پیاده‌سازی

worker واقعی Python با pvlib 0.13.1 و وابستگی‌های pinشده، قرارداد مشترک سخت‌گیرانه، API با احراز هویت موجود و محدودیت منابع، پنل مستقل فارسی/انگلیسی در ClimateTab، manifest بازتولیدپذیری و خروجی JSON/CSV اضافه شدند. مدل‌ها و دامنه در `docs/PVLIB-DIRECT-STUDIES.md` آمده‌اند. این مسیر، screening قبلی را جایگزین یا نتایج مالی آن را بازنویسی نمی‌کند.

پژوهش قبل از کدنویسی در `PVLIB-DIRECT-STUDY-DESIGN.fa.md` ثبت شد. در بازبینی تکمیلی، مستندات رسمی SPA و calculate_deltat برای روشن‌کردن فرض delta_t و refraction، و مستندات رسمی Node child_process و Python isolated mode مرور شدند. فرض‌های ثابت اکنون در manifest صریح‌اند. `-I` ایزولاسیون import است، نه sandbox امنیتی سیستم‌عامل.

## آزمون‌های محلی موفق

- Python unittest: ده آزمون، شامل مرجع منتشرشده SPA/SAPM، ساخت جداگانه ModelChain، معادلات مستقل DC/inverter/energy، سال کبیسه، offset، خطای قرارداد و ناسازگاری نسخه وابستگی.
- API واقعی با Python: احراز هویت JWT در production، هویت جعلی، غیرفعال، ورودی/domain نامعتبر، rate/body limit، busy، timeout، abort، executable مفقود و output limit.
- مرورگر Chromium واقعی: import، اجرای واقعی Python از HTTP احراز هویت‌شده، خواندن دانلود JSON/CSV، خطای سرویس بدون fallback و ثابت‌ماندن waterfall screening.
- `npm run lint`: موفق؛ ۹۵ هشدار موجود، بدون خطا.
- `npm run build`، `npm test`، `npm run test:audit` با `PHYSICS_DIFF_BASE=5438fb5`، `test:gateway`، `test:remediation`، `test:smoke`، `verify:exports` و `test:browser`: موفق.
- `git diff --check`: موفق.

پس از آخرین تغییر اجرایی، Python، API، lint، build و مرورگر مستقیم دوباره اجرا شدند. آزمون‌های جامع قدیمی پیش از تغییر نهایی محدودیت ابتدای بازه و افزودن Python -B اجرا شدند؛ این تغییرها موتور قدیمی را تغییر نمی‌دهند.

## محدودیت و موارد تأییدنشده

- داده میدانی مستقل، کالیبراسیون، bankability یا هم‌ارزی SAM/PVWatts V8 ادعا نمی‌شود. fixture عددی صریحاً مصنوعی است.
- فقط fixed-tilt monofacial یک آرایه/اینورتر؛ tracker/bifacial، دریافت خودکار هواشناسی، storage و ادغام مطالعه با DOCX/XLSX/finance هنوز پیاده نشده‌اند.
- Docker اختیاری اضافه شده ولی ابزار Docker در محیط محلی موجود نبود؛ build/run کانتینر محلی آزموده نشده است.
- jobهای Linux/Windows Python 3.11 اضافه شده‌اند؛ وضعیت اجرای remote باید برای SHA اجرایی همان commit از GitHub بررسی شود و از نتیجه محلی استنتاج نمی‌شود.
- هیچ merge به main انجام نشده است.
