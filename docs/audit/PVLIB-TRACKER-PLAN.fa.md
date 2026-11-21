# توسعهٔ مدل فیزیکی: ردیاب تک‌محوره — پیش از کدنویسی، ۲۰۲۶-۱۱-۰۳

مبنا `89d3cc6`؛ موجودی: worker مستقیم فقط سطح ثابت دارد؛ schema مشترک/فرم، ذخیره و مقایسه موجودند. توسعه به مسیر مستقل محدود است؛ tracker/transposition غربالگری، offsetها، برف/خاک و اقتصاد تغییر نمی‌کنند.

## پژوهش مرجع

۱. https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.tracking.singleaxis.html — قرارداد زاویه راست‌گرد حول محور، axis azimuth از شمال به شرق، حدود چرخش متقارن، GCR و backtracking وابسته به cross-axis slope. برای محور جنوب، theta مثبت به غرب است.
۲. https://pvlib-python.readthedocs.io/en/v0.13.1/gallery/solar-tracking/plot_single_axis_tracking.html — true tracking و backtracking، GCR بیشتر به backtracking شدیدتر می‌انجامد؛ NaN شب در مثال موقعیت با صفر پر می‌شود. این تصمیم تنها برای زاویه است، نه پرکردن هواشناسی. در برنامه، صفرشدن theta شب با جهت سطح محاسبه‌شده از محور ثبت می‌شود.
۳. https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.tracking.calc_surface_orientation.html — محاسبه شیب و سمت سطح از چرخش و محور؛ theta=0 برای محور مایل لزوماً صفحه افقی نیست.
۴. https://pvlib-python.readthedocs.io/en/v0.13.1/_modules/pvlib/tracking.html — الگوریتم مستند به NREL/TP-5K00-76626 (Anderson/Mikofski 2020) و Lorenzo et al. DOI 10.1002/pip.1085. مرجع تخت مستقل برای آزمون: theta_ideal=atan2(sin(z)*sin(az-axisAz),cos(z))؛ روی زمین تخت backtrack correction با فاصله ردیف 1/GCR و cos(theta) تعیین می‌شود. این معادلات فقط در تست oracle مستقل استفاده می‌شوند؛ اجرا خود pvlib است.

صفحه SAM tracking و PDF کامل NREL قابل واکشی نبودند؛ ادعای مطالعه یا هم‌ارزی SAM نمی‌شود. بررسی منابع بالا اعتبارسنجی میدانی نیست.

## قرارداد

`system.tracking` اختیاری و strict، در صورت نبود همان fixed قبلی. در صورت وجود تمام شش پارامتر صریح: axisTiltDeg [0,90]، axisAzimuthDeg [0,360]، maxAngleDeg [0,90]، backtrack boolean، gcr [0.01,1]، crossAxisTiltDeg [-30,30]. بازه‌ها guardrail نرم‌افزاری‌اند، نه دامنه کالیبراسیون. fixed surfaceTilt/Azimuth برای سازگاری نگه داشته می‌شوند ولی در tracker استفاده نمی‌شوند و این موضوع نمایش داده می‌شود. تمام پارامترهای جدید تحت provenance همان تجهیزات‌اند؛ پیش‌فرض خاموش ندارند.

هندسه میانه بازه از singleaxis به Hay-Davies و AOI/IAM و دما/DC/AC منتقل می‌شود. theta شب صفر و سطح از axis محاسبه می‌شود؛ NaN روز خطاست. output هر ردیف شیب/سمت و برای tracker theta/active است. manifest انتخاب mount و روش park را ثبت می‌کند. Engine به 1.1.0 ارتقا می‌یابد؛ schema موجود با فیلد اختیاری سازگار می‌ماند، درخواست قدیمی تغییر یا migrate نمی‌شود.

backtracking فقط هندسه آرایه ایده‌آل موازی است؛ مدل سایه الکتریکی، mismatch، diffuse row masking، باد/برف stow، مصرف موتور، محدودیت slew و سازه پیاده نمی‌شود. نه tracker مساوی bifacial است، نه افزایش انرژی تضمین می‌شود.

مقایسه fixed/tracker در یک نسخه موتور، هواشناسی و سایت باید مجاز باشد؛ تنها کلید مدل mounting سناریوی قابل‌تغییر است، سایر مدل‌ها/نسخه‌ها همچنان دقیقاً یکسان. مطالعات قدیمی محفوظ‌اند ولی با worker جدید مقایسه مستقیم نمی‌شوند مگر اجرای مجدد.

## آزمون‌های موردنیاز

oracle هندسه برداری مستقل محور افقی، معادله مستقل backtracking تخت، حدود چرخش، حساسیت GCR و cross slope، park شب محور مایل، ModelChain جداگانه با SingleAxisTrackerMount، مدار fixed قبلی بدون تغییر عددی، قراردادهای Node/Python، اجرای واقعی HTTP و مرورگر فرم tracker تا ذخیره/بازیابی و مقایسه fixed/tracker و گزارش. هیچ fixture مصنوعی شاهد اندازه‌گیری سایت نیست.
