# مرحله۴۸ — جست‌وجوی عمیق‌تر، انتخاب نمونهٔ قابل‌بازتولید و رد گزینه‌های نامتناسب

تاریخ:2026-11-03. تکمیل پژوهش قبلی PVLIB-STEP-48-DATA-SEARCH.fa.md؛ نه تکمیل مرحله۴۸ و نه گزارش برازش. هیچ کد اجرایی یا نتیجهٔ مدل تغییر نکرد.

## نتیجهٔ اجرایی
نمونهٔ پیشنهادی جدید: **زیرسامانهٔ تک‌رو روی ترکر افقی تک‌محورهٔ DTU در Roskilde، ماژول Trina Allmax+305W، مجموعهٔ نسخه۳ با DOI10.11583/DTU.13580759.v3**. دامنهٔ پذیرفتنی این انتخاب، تحقیق و برازش **دمای پشت ماژول همین نصب** است، نه دمای سلول مستقل، نه اعتبارسنجی کامل انرژی نیروگاه و نه انتقال ضرایب به پروژهٔ دیگر.

مزیت نسبت به جست‌وجوی اول: علاوه بر مستند فنی، API رسمی مخزن بررسی شد و **فایل مشخص، اندازه، checksum منتشرشده، نسخه، مجوز و اصلاح تاریخچهٔ timestamp** احراز شد. هنوز bytes فایل دریافت/باز نشده و QC عددی انجام نشده است. بنابراین عبارت «نمونهٔ مناسب» در این سند یعنی مناسب برای مرحلهٔ دریافت و preflight، نه عبور از تمام گیت‌های fit عملیاتی.

## ۱. فایل مشخص و شواهد دسترسی
منبع metadata خوانده‌شده:
https://api.figshare.com/v2/articles/13580759/versions/3

- DOI:10.11583/DTU.13580759.v3
- منتشرکننده:Technical University of Denmark
- نسخه۳:2022-04-08
- نام دقیق فایل:Bifacial_Model_Comparison_Open_Access_Data v3.xlsx
- file id:34726600
- اندازهٔ منتشرشده:6272242 bytes
- لینک مستقیم درج‌شده در API:https://ndownloader.figshare.com/files/34726600
- supplied_md5 و computed_md5 منتشرشده توسط مخزن:b18a679dbeccafb1ff0d33b4262778e5
- license:CC BY4.0؛ download_disabled=false؛ is_embargoed=false؛ is_link_only=false.
- MD5 فوق فقط metadata ناشر است و **در این محیط از bytes فایل دوباره محاسبه نشده**؛ SHA256 محلی نیز هنوز نداریم. این checksum امضا یا اثبات هویت نیست.
- صفحهٔ نسخه:https://data.dtu.dk/articles/dataset/Data_used_in_Validation_of_Bifacial_Photovoltaic_Simulation_Software_against_Monitoring_Data_from_Large-Scale_Single-Axis_Trackers_and_Fixed_Tilt_Systems_in_Denmark_/13580759/3

طبق توضیح رسمی، workbook شامل Site Data، Shade Scene، Structural Dimensions، PV Module Specifications، Inverter Specifications، Albedo Data، Meteorological Data و Validation(monitoring) Data است. وجود این بخش‌ها از metadata تأیید شد؛ عنوان دقیق sheetها/ستون‌ها در فایل هنوز بررسی نشده است.

## ۲. چرا فقط نسخه۳؟
توضیح رسمی مخزن می‌گوید در DAQ کانال‌های GPOA، DC Power و TMOD حدود۵دقیقه تقدم زمانی کشف شده و نسخه۳ timestamp و aggregation ساعتی را اصلاح کرده است. این مسئله برای بهینه‌سازی حرارتی حیاتی است: optimizer نباید خطای زمانی را با تغییر ضریب حرارتی جبران کند. نسخه۱یا۲ نباید بدون بررسی اصلاحیه با نسخه۳ مخلوط شوند و نباید روی نسخه۳ shift اضافهٔ۵دقیقه اعمال کرد.

## ۳. نمونهٔ دقیق و سنجهٔ مناسب
مطابق گزارش SAND2023-03135، سناریوی monofacial tracked در Roskilde مشخصات زیر دارد:
- مختصات تقریبی:55.696°N،12.104°E، altitude15m؛ timezone اعلامیCET(GMT+1).
- Trina Allmax+305W، mono-PERC، تک‌رو.
-۸۸ماژول،۴رشتهٔ موازی هر یک۲۲ماژول؛ نامی26.84kWdc.
- HSAT، محدودهٔ±60°، backtracking، pitch12m±0.1m، hub height1.95m±0.2m.
- دورهٔ اسمی۲۰۱۹–۲۰۲۰؛ هواشناسی شامل GHI/DNI/DHI،دمای محیط و باد؛ گزارش PVPMC از meanهای ساعتیِ end-labeled صحبت می‌کند.

این اطلاعات **context منتشرشده** هستند؛ برای adapter عملیاتی، metadata داخل workbook نسخه۳ و مقالهٔ مبنا اولویت دارند و اختلاف‌ها باید ثبت شوند. زمان محلی نباید صرفاً با تفسیر سیستم‌عامل یا DST فرضی به UTC تبدیل شود.

مقالهٔ مبنا، DOI10.3390/app10238487، می‌گوید:
- GHI/DHI/DNI،دمای محیط و باد در سایت اندازه‌گیری شده‌اند؛ داده‌های تابش هر۱۰ثانیه sample و پیش از میانگین‌گیری ساعتی QC می‌شوند.
- TMOD با RTDچهارسیمه روی backsheet پشت یک سلول اندازه‌گیری شده است؛ در مقایسهٔ شکل۱۴ هیچ تبدیل backsheet-to-cell انجام نشده.
- حسگر دما روی آرایه‌های bifacial نصب نشده و شکل۱۴ به monofacial HSAT مربوط است. بنابراین **از دادهٔ bifacial برای هدف حرارتی اندازه‌گیری‌شده استفاده نمی‌کنیم** و وجود دمای مستقل برای fixed tilt را نیز بدون بازکردن فایل ادعا نمی‌کنیم.
- این حسگر منفرد، دمای میانگین همهٔ سلول‌ها یا کل آرایه نیست.

## ۴. مدل حرارتی پیشنهادی و عدم سوءاستفاده از ضرایب مقاله
مدل کوچک پیشنهادی:Faiman، هدف=T_back_module، تنها دو پارامترu0/u1:

T_back_module = T_air + G_POA_front / (u0 + u1×wind_speed)

مقاله برای شبیه‌سازی مرجع monofacial ازu0=29.5 وu1=1.6 استفاده کرده، اما صریحاً نبود ضرایب اندازه‌گیری‌شدهٔ همین نصب و منشأ توصیه‌ای آن‌ها را بیان می‌کند. **این دو مقدار ground truth یا fitted coefficients این dataset نیستند.** نتیجهٔ sensitivity مقاله نیز جایگزین برازش train/holdout تازه نیست و نباید برای انتخاب حدود/آستانه‌ها با نگاه به test مصرف شود.

مستندات pvlib0.13.1 می‌گوید ارتفاع باد باید با ارتفاعی که ضرایب برایش تعیین شده‌اند یکسان باشد. ارتفاع anemometer این مجموعه از منابع خوانده‌شده هنوز احراز نشده است؛ **hub height=ارتفاع باد نیست**. worker فعلی windHeightM=10 را الزام می‌کند، پس قبل از استفاده در آن باید ارتفاع واقعی تأیید یا قرارداد صریحاً اصلاح شود؛ تبدیل باد با exponent حدسی مجاز نیست.

برای جداسازی خطای transposition از حرارت، اگر ستون measured POA قابل‌استفاده و مستقل در workbook موجود باشد، هدف حرارتی ابتدا با همانPOA بررسی شود. اجرای کل worker با modeled POA یک آزمایش متفاوت است و پارامترهای fit آن می‌توانند خطای تابش/ترکر را جذب کنند؛ این دو نباید یکسان گزارش شوند.

## ۵. مقایسهٔ گزینه‌ها
| مجموعه | مزیت مستند | دلیل اولویت/محدودیت |
|---|---|---|
|DTU v3، monofacial HSAT|API و فایل شناخته‌شده،CCBY4،اصلاح timestamp،ورودی‌ها و validation در workbook،مقاله با روش سنجش|انتخاب جدید برای دریافت/preflight؛ backsheet نهcell؛ ارتفاع باد و bytes هنوزpending؛ ترکر دامنه را پیچیده‌تر می‌کند|
|PVPMC2021،S1 Panasonic VBHN325SA16|fixedtilt3.9kW،weather با سه مؤلفه تابش،PAN/IEC61853/IAM/NMOT و دادهٔ validation پس از مطالعه|گزینهٔ ساده‌تر هندسی؛ دریافت فایل کامل DuraMAT ناموفق؛ نتایج ارسالی Results.xlsx خودِ observations نیست؛ دمای سلول مستقل احراز نشده|
|Sandia2020 thermal dataset|چهارRTD،باد۱۰m،POA و محیط،مستندات دقیق|بهترین تمرکز حرارتی از نظر متغیرها، ولی دریافتNetCDF موفق نبود؛ rawunits/timezone/hash/license هنوزpending؛ دماback-of-module|
|IEAPVPS Task13/SUPSI|فایل‌هایCSVماهانه۲۰۱۸/۰۷تا۲۰۱۹/۰۶،۵دقیقه،characterization وU0/U1،POA/GHI/DHI/باد/محیط/IV|گزینهٔ عملی دانلودCSV؛ دماپشت ماژول؛ DNI در فهرست نیست و نباید ساختگی پرشود؛ مقادیر فایل و ارتفاع باد/زمان نیازمند بررسی|
|NREL PERT/mPERT|راهنمای61610 شاملIV،هواشناسی و uncertainty|تعریف دما در راهنما صریحاًback-surface است؛ cell مستقل نیست؛ instantaneous data باintervalmean نباید مخلوط شود|
|PVDAQ34 / مطالعهٔ غیررسمیGitHub|نمونهٔ نیروگاه واقعی با کانال‌های توان و ولتاژ|دمایcell حاصل ازVoc،اندازه‌گیری مستقیم مستقل نیست؛ دریافت باد از ایستگاه دوردست در آن مطالعه و ادعاهای نویسنده دلیل تأیید محلی ما نیست؛ به عنوان benchmark اصلی انتخاب نشد|

هشدار عمومی PVPMC2021:گزارش رسمی می‌گوید night و sensoroutages می‌توانند هر دوzero نمایش داده شوند؛ leapday نیز برای قالب8760 حذف شده است. بنابراین صفرها را نباید همگی مشاهدهٔ سالم یا داده را سالUTCپیوستهٔ کامل دانست. این caveat باید هنگام استفاده از بستهٔPVPMC بررسی شود؛ بدون بازکردن workbookDTUv3 ادعا نمی‌کنیم دقیقاً همین encoding را دارد.

## ۶. آیا ورودی کامل برای خواستهٔ اولیهٔ cell calibration پیدا شد؟
**خیر.** منابع بررسی‌شده برای دما عمدتاًback-of-module هستند. مقاله‌ای با حسگرPt1000لامینیت‌شده داخل ماژول هم در جست‌وجو پیدا شد، اما دسترسی به سری‌زمانی عمومی مناسب و metadata کامل آن احراز نشد؛ وجود مقاله به معنی datasetآماده نیست. نمونه‌هایPV/T یاfloating نیز صرفاً برای داشتن ستونtemperature به‌جای دامنهٔ PV خشکی انتخاب نشدند.

پس پیشنهاد دقیق این است: **DTUv3 برای benchmark واقعیِ دمای پشت ماژول**؛ اگر خواستهٔ غیرقابل‌تغییر دمای مستقل سلول است، این گزینه آن گیت را پاس نمی‌کند. relabelکردنTMODبهreference_cell_temperature یا افزودنdeltaTفرضی ممنوع می‌ماند.

## ۷. گیت‌های پیش از fit
۱.دریافت فایل مستقیم؛ verifyMD5ناشر و محاسبهSHA256؛ نگه‌داری بیرونGit باreceiptمنشأ/نسخه/license.
۲.بازکردنsheetها،بررسیrangeزمانی واقعی،timezone،واحدها،semantics،duplicate/gap/sentinel و flagها؛ بدونzero-fillیاaggregationپنهان.
۳.تأیید ارتفاع باد و کانالTMODmonofacialHSAT و استقلالPOA؛ گواهی/اعتبارکالیبراسیون و metrologyuncertainty در صورت ادعای عملیاتی.
۴.قرارداد صریحbacksheet و مسیر measuredPOA؛ نه جعلورودیcell/GHI/DNI/DHI. bounds وtrain/holdout قبل ازfitثبت شوند.
۵.سپس اجرایcandidateمحدودباworker،budget/cancel/timeout؛ witnessحساسیت وidentifiability،گزارشraw/train/holdoutوparameterdiff؛ عدم انتقالخودکاربهbaseline/مالی.

## منابع واقعاً بررسی‌شده
- API رسمی نسخه۳:https://api.figshare.com/v2/articles/13580759/versions/3
- صفحهٔ رسمی نسخه۳ و مجوز:https://doi.org/10.11583/DTU.13580759.v3
- مقالهٔ مبنا؛ چکیده،متدتابش،بخشthermalوشرححسگر در متن/نتایججست‌وجو:https://www.mdpi.com/2076-3417/10/23/8487
- گزارش رسمیSAND2023-03135،بخش‌های۲تا۶:https://www.osti.gov/servlets/purl/2293576/
- PVPMC2021فهرستمدارک و فایل‌ها:https://pvpmc.sandia.gov/datasets/2021-blind-pv-modeling-comparison/
- رکورد رسمیfullinput/outputdataset:https://www.osti.gov/dataexplorer/biblio/dataset/1970772
- IEAPVPSTask13صفحهٔرسمیوCSVها:https://pvpmc.sandia.gov/datasets/iea-pvps-task-13-module-validation-dataset/
- PERTmanual،تعریفback-surfacetemperatureدرنتیجهٔجست‌وجو:https://docs.nrel.gov/docs/fy14osti/61610.pdf
- PVDAQ34گزینهٔردشده،منبعغیررسمی:https://github.com/kwwaleszczynski-del/pv-thermal-check
- pinnedmodeldocs،ازپژوهشقبلی:https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.temperature.faiman.html

درایننوبت:جست‌وجویوب،خواندنمنابعاصلیوAPIانجامشد؛**فایلXLSXدانلود/پارسنشد؛هیچعددیازنمونه‌هابازمحاسبهونمونهٔخامساختهنشد؛هیچبرازشیاادعایPASS/fieldvalidationانجامنشد.**
