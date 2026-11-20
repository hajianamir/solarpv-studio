# طرح پیش از کد — ۳۰ گام ترکیبی
تاریخ2026-11-03؛ شروع f631f4d4499d6233e9949d59edb66212418590ca، شاخه پاک. انتخاب کاربر: مسیر ترکیبی. این ۳۰ گام پذیرش‌اند، نه۳۰مدل فیزیکی. موتور برای دو opt-in دمایی1.9.0؛ بدون گزینه جدید، samples/monthly/summary باید عین قبل بمانند.

## پژوهش
پیش از کد pvlib0.13.1 pvsyst_cell خوانده شد: https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.temperature.pvsyst_cell.html ؛ Tc=Ta+alpha*POA*(1−eta)/(Uc+Uv*wind). ضرایب تجربی و وابسته به ارتفاع باد fitted هستند؛ در این ابزار فقط ضرایب صریح برای باد10m، بدون auto defaults/conversion؛ eta ثابت مستقل از DC واقعی، نه حل coupled efficiency. نه هم‌ارزی کل PVsyst یا تایید حرارتی bifacial.
MDN IDBTransaction.abort خوانده شد: https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/abort ؛ rollback تمام تغییرات transaction، success فقط پس از oncomplete نه success تک request. bulkimport add-only داخل یک readwrite، conflict باعث rollback کامل؛ delete هم atomic.
MDN SubtleCrypto.digest خوانده شد: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest ؛ SHA256 digest نهHMAC/امضا؛ securecontext و nonstreaming، پس حجم محدود. checksum صرفاً integrity format محلی، نه اصالت منبع. منابعCSV/UTC/provenance در راهنماهای قبلی موجودند.

## ۲۰ گام محصول/داده
1 جستجویlabel در کتابخانه؛ 2 فیلتر inputs/result؛ 3 فیلتر سایت فعال؛ 4 مرتب‌سازی تاریخ/نام؛ 5 صفحه‌بندی۱۰تایی؛ 6 cloneinputs باlabelجدید وUUIDجدید، result=null بدون اجرای جعلی؛ 7 دانلودarchiveهرentry؛ 8 دانلودrequestهرentry؛ 9 دانلودweatherCSVهرentry؛ 10 انتخاب چندentry/clear؛ 11 deleteگروهیatomic باconfirm؛ 12 backupانتخابیbundle؛ 13 checksumSHA256 رویpayloadJSON مرتب کلید وصدورschemaصریح؛ 14 importpreflight بدوننوشتن وpreview تعداد/labels/ids؛ 15 importatomicadd-only وتعارضidرد بدونoverwrite؛ 16 duplicateIDداخلbundle رد؛ 17 limits20snapshot/64MiBbundle/24MiBهرsnapshot/8MiBهرrequest وrejectپیش ازwrite؛ 18 storageestimateاختیاریorigin-wide باناموجودصریح؛ 19 refreshبینtabهایهمoriginازBroadcastChannel صرفاًnotification نهانتقالداده؛ 20 exportrequest/weatherورودیفعلیحتیinputs-only، بدونویرایشداده.

## ۱۰ گام مهندسی/اتصال انتهابه‌انتها
21 system.pvsystTemperature strict TS: provenance source/quality، uc .1..200، uv0..100، moduleEfficiency0..0.5،alphaAbsorption.01..1، windHeightM=10. mutuallyexclusive باfaiman وcellTemperatureSchedule؛ max8784.
22 worker strictهمانقرارداد و pvlib.temperature.pvsyst_cell روی thermal_poa موجود، limits-100..150°C، مدل/واحد/نسخه/limitation صریح؛ بدون تغییراپتیک یا defaultسازی.
23 فرم/PVsystreview/restore/sourceledger وrunواقعی؛ ضرایب فرمخالی تاصریحپرشوند، SAPMretaininactive.
24 report/CSV/JSON/archive/comparisonوexplorerدمایجدید؛ gate مدلدمایناسازگارحفظ، منابع/فرض‌ها و fitted10m روشن.
25 شواهد مستقل PVsyst: equationanalytic/sensitivitywind/eta/absorption/zeroPOA، ترکیبrows/tracker/electrical/plant، domainreject، absentequality؛ testبهمعنایfieldvalidationنیست.
26 cellTemperatureSchedule strictsource/quality records timestamp+cellTemperatureC[-100,150] کاملهم‌ترازUTCZ/offset، max8784، CSVبدونquote، nofill؛ mutuallyexclusive2thermaloptinsدیگر.
27 worker explicitcellT بعدازirradianceوبه‌جایthermalmodel؛ نهتبدیلمoduleبهcell یا interpolate/energyfeedback؛ همهدمامقادیرصریحهمانrecord.
28 فرمCSV/review/restore/sourceledger/actualrunدمایواردشده؛ بدونتولیددمایپروژه یا ادعایاینکهqualitymeasured تاییدسنسوراست.
29 result/archive/report/compare/diagnostics/capabilities1.9 با limitations؛ اصلscheduleدرJSON وcellTاعمال‌شدهدرsampleCSV؛ thermalPOAورودیدمااینحالتغیرفعال ولیoptics/DC irradiance مستقل باقی‌اند.
30 تستمستقلورودی/offset/صفرومقدارمنفی/اثرDC وحفظPOA، حساسیت، integrationواقعیAPI/browserوresource8784؛ lint/build/regressions/exactSHAall6CI، selectivestaging/pushبدونmerge.

## حدود مشترک
هیچmissingfill، syntheticoperationalweather/schedules، screeningfallback یا overwriteضمنی داده قبلی مجازنیست. bundleفقطlocalbrowseroriginshared است، نهaccount/cloudbackup؛ preflightتضمینcapacity یا نبودconflictدرلحظهimportنیست وtransactionدوبارهتعارضرامی‌سنجد. cloneنتیجهقدیمیراcarryنمی‌کند وhashقدیمیباlabelجدیدبه‌عنواننتیجهمعتبرمعرفینمی‌شود. inputs/resultarchiveقدیمیهمچنانپشتیبانی، aliasوgateهایقبلیحفظ. هیچbankability/fieldcalibration/thermalprotection یاwholePVsystequivalenceادعانمی‌شود. evidence numericمستقل وfailureinjection برایbulkrollback وcross-tabقبلاتمام لازم است.
