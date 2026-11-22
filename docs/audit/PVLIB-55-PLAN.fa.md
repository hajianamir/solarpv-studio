# مرحله۵۵ — گزارش شروع، پژوهش و برنامهٔ سه دور تست
تاریخ2026-11-03؛شاخهarena/237e6ea2-solarpv-studio؛HEAD5438fb59f4bb5cde05c20818b780464e1fe28752. تغییرات۱۵۰+مسیر قدیمی حفظ می‌شوند؛stage/pushخودکارهمهٔآن‌ها مجازنیست.

## موجودی پیش از کد
production۱٫۱۶،StudyRequest/Resultv1 وmatrix۸۱۹۲قرارداد؛mpptقدیمیفقطfixed/PVWatts/modeledthermalاست. بازکردنبی‌شرطآنغلطاست: ولتاژمشترکساختگی و جمعACیاPntهرinputغلطمی‌شود. مسیرهای۴۸–۵۴عمداًپژوهشیوبسیاریگیت‌هایفیزیکیبازند.

## منابع بررسی‌شده و نتیجه
- pvlib۰٫۱۳٫۱sandia_multi: https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.inverter.sandia_multi.html ؛توانوولتاژهرورودیصریح؛inverterمشترک،نهجمعخروجیinverterهایinput. مرجعHansenet al DOI10.1109/PVSC48317.2022.9938490 درنسخه‌هایجدیدمستندشده؛نسخهpinnedمبنایاجراست.
- ModelChain۰٫۱۳٫۱: https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.modelchain.ModelChain.run_model_from_poa.html ؛آرایه‌هابهترتیبصریح،celltemperatureورودیجداازmoduletemperature؛پیش‌فرض‌هایآب‌وهوااستفادهنمی‌شوند.
- DTUAPIنسخه۳دوبارهخواندهشد: https://api.figshare.com/v2/articles/13580759/versions/3 ؛XLSX6272242بایت،MD5b18a679dbeccafb1ff0d33b4262778e5،CCBY4.0. جستجویعنواندقیق+githubوheightبهسندارتفاعنصبنرسید. حدمجازارتفاععملکردکاتالوگسنسور،ارتفاعنصبنیست. rawمحلیوجودندارد؛دادهٔرونویسی۷ردیفنسخهٔکاملنیست.
- داده‌هایجایگزین: https://pvpmc.sandia.gov/datasets/ و https://pvpmc.sandia.gov/resources-and-events/iea-pvps-task-13-reports/iea-pvps-task-13-module-validation-dataset/ ؛فهرستbacksheet/۵دقیقه‌ایدلیلمعتبرشدنپروژهاینکاربرنیست.
- uncertaintyمنبعجدیدSandia: https://www.osti.gov/servlets/purl/2566701 ؛تفکیکweather/modelوprecisionP90،نهتبدیلRMSEحرارتبهCVانرژی. بودجه/تاریخچهواقعیپروژهبااینمنبعجایگزیننمی‌شود.

## دامنهٔ پیاده‌سازی انتخابی
adapterنسخه‌دارجدا `integrated-mppt-plan-v1`:۲تا۴ورودیStudyRequestمعتبرِمستقل باelectricalهرکدام،trackingیاcell scheduleدرصورتپشتیبانیقراردادقدیمی؛site/weatherدقیقاًمشترک. Sandiaمشترکازvoltage/powerترمینالهرورودی؛nighttareیک‌بار. childACکلاًدورانداخته می‌شود. ACplant/exportوnestedMPPT/blockوglobaladditionalLossرد؛نهتغییرکورStudyResultv1یاافزایشcaps. سقف۸۷۸۴inputintervalجمع،input۸MiB،workerخروجیbounded،timeout/cancelبدونfallback.
قراردادTSوPython وmatrixمستقلجدید،oracleمعادلهٔSandiaمستقل،تستعدمجمعPnt/clipping،عدمmutation،domain،archiveplan/replay/migrationصریحازlegacyfixedMPPTبدونتغییرمقادیر قدیمی. خروجیجدیدنهStudyResultقدیمی و نهfinanceاست؛adapterآزمایشی،approvalblocked.

## سه دور تست پس از پیاده‌سازی
دور۱:productionPython+research+integrateddualcontract/runtime؛مرزهاوتشخیصنقص.
دور۲:تکرارکلزنجیرهبه‌علاوهworkflow/types/build/corebenchmark/HTTP/browserوexport/archive؛اصلاحمواردواقعاًبازتولیدشده،نهحذفgate.
دور۳:تکرارپسازاصلاحات،همانsuiteهایاصلی وbrowser،compile/diff/readback؛ثبتاخطارهاومحدودیتها. runnerبایدهرsuiteرابدونshortcircuitثبتکند؛شکستدور۱تاریخیپاکنمی‌شود.
CIدقیقSHAWindows/Linuxفقطوقتیcommit/pushمحدودامن وrunواقعیوجودداشتگزارشمی‌شود؛درغیراینصورتunavailable. هیچ‌گیتنیازمندمدارکواقعی،ایمنی،qualifiedreviewیاfieldvalidationباwebsearch/PASSمصنوعیبسته‌نمی‌شود.
