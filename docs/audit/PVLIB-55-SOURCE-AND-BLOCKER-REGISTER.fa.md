# ثبت منابع و تعیین تکلیف باقی‌مانده‌ها — مرحله۵۵
2026-11-03؛ این سند محدودیت علم/داده را به گیت نرم‌افزار تبدیل یا با فرضیات پنهان حذف نمی‌کند.

## جستجوی جدید این نوبت
۱. سند نسخه‌دار pvlib۰٫۱۳٫۱sandia_multi و run_model_from_poa مستقیماً خوانده شد: ولتاژ/توان هر ورودی، یک inverter مشترک و دمای cell صریح؛ این پایهٔ adapter است، نه ترکیب دلخواه خروجی ACها.
- https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.inverter.sandia_multi.html
- https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.modelchain.ModelChain.run_model_from_poa.html
۲. جستجوی Sandia_multi و sourceهای upstream، مرجع Hansen2022 DOI10.1109/PVSC48317.2022.9938490 را شناسایی کرد [3](https://pvlib-python.readthedocs.io/en/latest/_modules/pvlib/inverter.html). برای اجرا نسخهٔنصب‌شدهpinned ملاک است، نه سایتstableکهتغییرمی‌کند.
۳. DTUAPIنسخه۳مستقیماًخواندهشد: https://api.figshare.com/v2/articles/13580759/versions/3 ؛اصلXLSX۶۲۷۲۲۴۲بایت باMD5b18a679dbeccafb1ff0d33b4262778e5 وCCBY4.0. تصحیح~۵دقیقه‌ایقبلاًدرنسخه۳اعمالشده؛دوبارهشیفتنمی‌دهیم.
۴. جستجویعنواندقیقفایل+github و ناممقاله/شماره8487 و DTU/UMB600/wind/height انجامشد. سندمعتبرارتفاعنصببرایهمیندادهپیدانشد؛ نتیجهٔکاتالوگ Lufft operatingheight3500mارتفاععملیاتیمجازاست،نهارتفاعنصببادسنج. نتایجبی‌ربطبه‌عنوانشواهدپذیرفتهنشدند. فایلقدیمی۷ردیفیهنوزفقطexcerptاست؛جستجودانلودمحلیباینرییاverifyMD5آننیست.
۵. thesisدانشگاه باعنوانCharacterizationandmodelingofbifacialphotovoltaicmodulesandsystems شناسایی شد: [2](https://backend.orbit.dtu.dk/ws/files/349266606/PhD-thesis.pdf) ؛fetchشکستخورد؛متنکاملخوانده‌نشدهواستخراجارتفاعازآنادعانمی‌شود.
۶. صفحهٔداده‌هایPVPMC وIEATask13 درنتایجبررسیشدند؛۵دقیقه‌ایbacksheet/POA/بادوابزارcharacterizationمنبعبالقوه‌اند،نهشواهدکنترلر/survey/مصرف‌کنندهٔپروژه:
- [2](https://pvpmc.sandia.gov/datasets/)
- [1](https://pvpmc.sandia.gov/resources-and-events/iea-pvps-task-13-reports/iea-pvps-task-13-module-validation-dataset/)
۷. جستجویعدم‌قطعیتمنبعجدیدSandia«UncertaintyinP90ofEnergyYield»،SAND2024-06106C را یافت: [4](https://www.osti.gov/servlets/purl/2566701) ؛searchمتنشاملتفکیکweather/modelوprecisionبوداماfetchکاملشکستخورد. بودجهٔواقعی۴۹ازsnippetساختهنشد. گزارشIEAPVPS2020نیزمنبعروشی است نهعدم‌قطعیتسایت:
https://iea-pvps.org/wp-content/uploads/2021/01/Report-IEA%E2%80%93PVPS-T13-18_2020-Uncertainties-in-Yield-Assessments-and-PV-LCOE-1.pdf

## تعیین تکلیف گیت‌ها، نه اعلام بستن همهٔ آن‌ها
|مرحله|آنچه نرم‌افزاری موجود/قابل‌آزمون است|باقی‌ماندهٔ واقعی|
|---|---|---|
|۳۰–۴۳|workflow/manifest/measurement/contract و regression موجود|اسناد/داده/دامنهٔواقعی و اجرای پروژه؛ تست مصنوعی تأیید میدان نیست|
|۴۴–۴۷|پروتکل،fittrain/holdout،uncertainty و fielddossier با gate و archive|احرازاصالت،پروتکلپیش‌ثبت مستقل،حسگر/ساعت/مرزمتر/بازبین qualified|
|۴۸|parserchecksumسخت،workerback_of_module وfitexcerpt واقعی باholdoutبدتر وردپذیرش|اصلXLSXمحلی،ارتفاعبادوcalibration؛فصل/holdoutنماینده و boundsمهندسی|
|۴۹|MC/correlation/temporalbudgetشرطی|تاریخچه/مرجعمنبع‌دارومدل‌وابستگیومسئولreviewواقعی؛RMSEحرارتبهCVانرژیتبدیلنمی‌شود|
|۵۰|radialbalancedACپژوهشی|topology/ولتاژ/امپدانس/حدودسازنده،protectionوampacityمستقل؛شبکهٔنامتعادلوtapمدل‌نشده|
|۵۱|پاسخفرضیمرتبه‌اول/RC|کنترلرواقعی،اندازه‌گیریسریع،firmware/IV/DC-link؛مدلفرضیP&Oواقعینیست|
|۵۲|صفحهٔشیب‌دار/slew/stow/انرژیموتورجدا|surveyterrainواقعی،actuator/گشتاور/باد/لاگحرکت و تأییدایمنیstow|
|۵۳|finiteopaque-rayوlinear-IVفرضی/bypass|wiring/meshواقعی،دیودفیزیکی/cell-levelmismatchومرجعپروژه؛proxyبهSAMgradeارتقانمی‌یابد|
|۵۴|backsheetinertia و snow/soilفرضیدرماژولجدا|ضرایبکالیبره،حسگردرست/ارتفاعباد،بارشSWE/آلودگی/maintenance؛snowlatentheat/structuralsnowمدل‌نشده|
|۵۵|adapterنسخه‌دارMPPT+Sandia+per-inputtracker/importedcell،قرارداددو‌زبان،migration/archiveوبودجه|اتصالUI/editor/HTTPعمومیانجامنشده؛افزایشcapsنشده؛ترکیبفیزیکی۵۰–۵۴درyieldداده‌ندارد؛CIremoteدقیقSHAوqualifiedreviewواقعیبدوناجرایواقعیادعانمی‌شوند|

## قاعدهٔ نهایی‌سازی
موارد باقیماندهٔ فاقد داده «انجام‌شده» علامت نمی‌خورند. نرم‌افزار می‌تواند fail-closed و قابل‌بازتولید شود؛ اعتبار سنسور/ایمنی/نیروگاه نیازمند مالک داده و مهندس مستقل است. lookupمنبععمومی گواهی نصب،کالیبراسیون،حقوق‌دادهیاqualifiedapprovalنیست. هیچدادهٔساعتیعملیاتیساختگی،مدرکجعلی،بادپیش‌فرضیاzero-fillبرایبستناینجدولاضافهنشده‌است.
