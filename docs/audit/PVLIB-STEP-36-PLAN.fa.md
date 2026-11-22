# پیش از کد: مرحله۳۶
2026-11-03؛ baseline ea3d2a6. فایل‌های بازسازی‌شدهٔ محیط با remote بایت‌به‌بایت برابر بودند؛ شاخه به همان commit موجود صرفاً جلو برده شد، بدون تغییر محتوا/بازنویسی. ناتمام۳۱–۳۴ محفوظ است.

پژوهش قبل از کد: https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.inverter.pvwatts_multi.html خوانده شد: ورودی‌های MPPT مستقل DC توانشان جمع شده و یک منحنی اینورتر روی مجموع اعمال می‌شود؛ ولتاژها جمع/میانگین نمی‌شوند. محاسبه MPPT/کابل هر ورودی باید پیش از جمع مستقل باشد. Sandia تک‌ولتاژی مجاز نیست.

inventory: worker.run_study دارای chain کامل optical/thermal/diode/کابل و یک ACplant است. قراردادها TS/Python، StudyBuilder وguard/explorer باید به مدل چندورودی برسند. برنامه:۲تا۴زیرآرایه fixed-tilt با شناسه یکتا، provenance، tilt/azimuth، nameplate و پارامترهای دیود/قیود/کابل مستقل. site/weather و coefficientهای optical/thermal مشترک اما POA وcelltemperature جدا محاسبه می‌شوند. global orientation صرفاً reference-plane diagnostic است؛ نتایج هر ورودی باprefix index نگهداری می‌شوند، نه ولتاژ معادل ساختگی. تمام توانهایDC بعد از MPPT/cable جمع؛ یک PVWatts inverter ویکplant/exportcap مشترک. ردیف/tracker وSandia در این variant صریحاً رد؛ نهfallback. global electrical و additionalDcLossPct غیرصفر رد؛ مجموعnameplate صریحاً باید برابرarrayPdc0W باشد. سقف۲تا۴input و حداکثر17568input-interval و8784interval؛ serializedoutput16MiB آزموده می‌شود.

تست: جمع توان در برابر دو اجرای مستقل؛ تفاوت ولتاژ دوMPPT؛ محدودیت یکی بدون تغییر دیگری؛ IV مستقل/کابل آزمون۳۵ به‌عنوان پایه وPVWatts منحنی مستقل روی مجموع؛ clipping یک‌بار؛ ردمداخلاتinvalid؛ جمع/ماه/restore/report/CSV/comparison/sourceledger وbrowser واقعی. هیچدادهعملیاتیساختهنمی‌شود؛ آزمونsynthetic. این مرحله۳۷چنداینورتر یا۳۸ACcable نیست.

پس از اندازه‌گیری سقف خروجی درحین توسعه، بودجهٔ اولیه۸۷۸۴input-interval به۱۷۵۶۸افزایش یافت؛۲ورودی×۸۷۸۴بازهٔ سال‌کبیسه با تست serialization کمتر از16MiB و بدونتغییرسقفworker پذیرفته می‌شود. حداکثرweatherintervalهمچنان۸۷۸۴است.
