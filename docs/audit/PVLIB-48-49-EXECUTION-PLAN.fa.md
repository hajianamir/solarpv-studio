# برنامهٔ اجرای درخواست۴۸/۴۹
تاریخ2026-11-03. وضعیت Git محلی: HEAD5438fb5، فایل‌های مراحل قبلی در working tree موجود ولی اغلب untracked؛ گزارش قبلی دربارهٔ HEADd51b0f1 در این محیط قابل تأیید نیست. تغییرات قبلی حفظ و از commit/push دسته‌جمعی اجتناب می‌شود.

## موجودی و پژوهش پیش از کد
- worker1.16.0 فعلی فقط channelدمایcell دارد؛ از افزودن backsheet به همان channel یا استفاده از همان نتیجه برای انرژی اجتناب می‌شود.
- bashدانلود فایلDTU باTLSerrorشکست خورد؛ fetch_page توانست خودXLSX را به717بخش متن parseکند. بخش‌های0،1،36،37،84،85،86،101،350،716خوانده شدند. این با دریافت کامل bytes/SHA256 برابر نیست.
- دادهٔ workbook: فقط T7 حسگرTMODدارد؛ تمام داده‌هاmean60min/endlabel، timezoneCETGMT+1؛ meteorologyشامل GHI/DNI/DHI/Tamb/Wspd؛ حسگرLufftUMB600باد±0.3m/s،دما±0.2°C. **ارتفاع باد در metadataخوانده‌شده نیامده است**. ازhubheight یابرگهٔسازنده ارتفاعنصب استنباط نمی‌شود.
- مقادیر صفر در شب/قطعDAQ قابل اعتماد نیستند؛ flagsچهارگانه و DataPointUsed حفظ شوند؛ فقطT7/Monofacial/HSAT.
- منبعفایل:https://ndownloader.figshare.com/files/34726600 ؛ منابعمتد:https://www.mdpi.com/2076-3417/10/23/8487 وhttps://www.osti.gov/servlets/purl/2293576/ ؛ نسخه:https://api.figshare.com/v2/articles/13580759/versions/3 . هیچsignedURLموقت ذخیره نمی‌شود.
- مرحله۴۹ نیاز به منابعenergy uncertainty/systematic/metrology و variabilityچندساله دارد؛ دادهٔTMODیک‌سال،انحرافمعیارRMSEیاaccuracyحسگربه‌تنهایی ورودیP90انرژی نیست. مرجعcovariance:https://www.itl.nist.gov/div898/handbook/pmc/section5/pmc541.htm .

## دامنهٔ قابل اجرا
ابزارCLIپژوهشی جدا از baseline/UI/finance: parser صریحXLSXنسخه۳باheaderشناخته‌شده، hash/size،joinUTCبدونfill،گزارشflags/invalid/gaps؛ مدلworkerحرارتی مستقل با targetback_of_module وmeasuredPOA،boundedtrain-onlygrid،budget/cancel/timeout،sensitivity/rank وraw/fit/holdout وextrapolationblock. ورودoperationalفقطپسازmetadataارتفاعبادوreceiptاصل‌فایل و حداقل‌شواهد؛ فقدانهرکدامblockedاست.

برای اثباتکارعددی بدونوانمودکردنبهfitعملیاتی،excerptواقعی۷ساعتT7از۴ژوئن۲۰۱۹ساعت۱۱تا۱۷ کهدرابزاروبدیده‌شد ذخیرهوparseمی‌شود؛ منشأrendered_excerptوSHAهمینexcerpt،نهSHAفایلXLSX. تقسیمقبل‌ازfit:train۱۱تا۱۴،holdout۱۵تا۱۷؛boundsآزمایشگاهیu0[5,60]،u1[0,20] باgridثابت۱۱×۱۱ وrefinementثابت۳دور؛ نهboundsمصوبمهندسی. اینآزمایشنمایندگیفصلینداردوارتفاعبادنامعلوممی‌ماند؛خروجیحتیباoptimizerموفقoperationalblockedاست. هیچquality/heightفرضینوشتهنمی‌شود.

مرحله۴۹: زیرساختجداگانهٔstrict/source-boundbudget باgroupهایsystematic/interannual،effectidsبرایردdoublecount،correlation/PSD،temporalcorrelationصریح برایمیانگینچندساله،biaslogصریح،analyticquantilesوMonteCarloseed/convergence/CIعددی. اجرا روی فرض‌های مصنوعی فقطtest؛ اجرایواقعی پروژه با دادهٔفعلیblocked. معیار تکمیل۴۸و۴۹درroadmapارتقانمی‌یابد.

## آزمون
fixtureXLSXمصنوعیصرفاًبرایparser،UTCوhour24/gap/duplicate/flags/units/MD5ناهمخوان؛workerواقعیpvlibمستقل وoracleمعادله؛fitgainحرارتیشناخته‌شده/عدمleakage/عدمidentifiability/bounds/budget/cancel/timeout/extrapolation؛بودجه۴۹باoracleNormalDistوNumPy/covariance،منفی/کامل،temporal،duplicate،PSD،seed،quantileCI. هرکدامجداازvalidationمیدان.
