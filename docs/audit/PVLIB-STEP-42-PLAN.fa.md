# برنامهٔ پیش از کد — مرحلهٔ ۴۲
2026-11-03؛ مبنا cf8a197؛ شاخه ثابت arena/237e6ea2-solarpv-studio؛ بدون merge.

موجودی: مرحلهٔ ۴۱ import مستقل، قرارداد TS/Python و receipt، measurementRows با پنج وضعیت، report/archive/bundle/clone/browser دارد. هنوز آمار مقایسه ندارد. مرحلهٔ ۴۲ فقط تحلیل مشتق‌شده است؛ worker و نسخهٔ موتور فیزیکی 1.16.0 تغییر نمی‌کنند؛ تحلیل قرارداد مستقل study-measurement-comparison-v1 و analyticsVersion 1.0.0 خواهد داشت.

تعریف: تنها ردیف valid با زمان UTC دقیق و خروجی قابل‌دسترسی همان نقطه وارد آمار است. residual=model−observation؛ MBE=mean(residual)، MAE=mean(abs(residual))، RMSE=sqrt(mean(residual²)) با مخرج N، نه N−1. واحد W یا degC مطابق canonical واحد مرحلهٔ ۴۱. همهٔ صفرها و شب‌ها داخل دامنه‌اند؛ حذف خودکار outlier/daylight، lag fitting، resampling یا calibration نداریم. درصد خطای نرمال، MAPE، R² و آستانهٔ قبول اضافه نمی‌شود تا مخرج صفر/منفی و ادعای دقت پنهان نشود.

شمارش‌ها و مخرج‌ها صریح: وضعیت‌های mutually exclusive مرحلهٔ ۴۱؛ validRecordCount شامل valid بیرون دوره/نقطه unavailable؛ pairedPercentOfValidRecords=N/validRecordCount و pairedPercentOfModelIntervals=N/modelIntervals؛ zero denominator=null. تعداد timestampهای مدل بدون هیچ ردیف مشاهده نیز گزارش می‌شود؛ با missing صریح اشتباه نمی‌شود. مدت جفت‌شده=N×interval؛ اولین/آخرین پایان بازهٔ paired صرفاً bounds است نه پوشش پیوسته. انرژی Wh فقط برای نقاط توان و فقط روی جفت‌ها؛ دما یا N=0 => null. هیچ annualization یا جمع چند حسگر/نقطه وجود ندارد.

خروجی مستقل JSON با metadata/source/point/unit/inputSha/engine و residual هر ردیف؛ نمایش UI و گزارش HTML؛ دادهٔ محاسبه‌شده از result معتبر دوباره ساخته می‌شود و در snapshot/worker ذخیره نمی‌شود. نمای ۴۱ برای سازگاری حفظ می‌شود. عدم مشاهدات به datasets=[]؛ N=0 => metrics=null با دلیل صریح؛ N=1 محاسبه با هشدار محدودیت. not_field_validated ثابت.

پژوهش پیش از کد: مرجع pinned scikit-learn 1.6.1 برای RMSE و مثال منتشرشده y=[3,-0.5,2,7] و pred=[2.5,0,2,8]، RMSE=sqrt(0.375). این کتابخانه dependency پروژه نمی‌شود. نام true در مرجع به معنای تأیید اصالت دادهٔ واردشدهٔ کاربر نیست.
https://scikit-learn.org/1.6/modules/generated/sklearn.metrics.root_mean_squared_error.html

تست هدف: شاهد دستی مستقل، مثال منتشرشده و oracle Python stdlib؛ perfect/constant bias/cancellation/zero/signed/temperature/no pairs/singleton؛ missing/excluded/outside/unavailable و شکاف، offset UTC، W/kW، چند dataset، invariance فیزیک؛ report/JSON و archive/bundle/clone/reload؛ مرورگر واقعی و full regressions و CI دقیق SHA. هیچ دادهٔ عملیاتی ارائه نشده است؛ تست مصنوعی field validation نیست.
