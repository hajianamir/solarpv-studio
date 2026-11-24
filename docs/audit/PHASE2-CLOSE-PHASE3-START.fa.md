# تحویل فاز ۲ سه‌حالته و آغاز فاز ۳

> توسعهٔ جدید: کنترل بهینهٔ گسسته، دیزل، برآورد عمر باتری و PDF واقعی در `docs/ADVANCED-DISPATCH-AND-PDF.fa.md` ثبت شده‌اند. تحلیل پیشرفته مستقل است؛ آزمون واقعی Windows/Safari هنوز اجرا نشده و این سند نتیجهٔ تاریخی تحویل قبلی را حفظ می‌کند.
## نتیجهٔ دامنه

فاز ۲ در محدودهٔ قرارداد داده و گردش مطالعهٔ محلی، برای **نیروگاهی، on-grid و off-grid** تکمیل شد. این عبارت به معنی انتشار نهایی، اعتبارسنجی میدانی، تأیید ساخت یا تکمیل همهٔ مدل‌های فاز ۳ نیست. دامنهٔ جدید کاربر جای برنامهٔ قدیمیِ تعویق حالت‌های غیرنیروگاهی را گرفته است.

| معیار فاز ۲ | نتیجهٔ فعلی |
|---|---|
| مرز انرژی، تجهیزات، ارتفاع و timezone | request واقعی اجرای PV + descriptor اعلامی تفکیک‌شده؛ context سایت/ظرفیت/mode و باتری؛ مرز AC، نه الزاماً کنتور فروش |
| on-grid/off-grid | پذیرش فقط با برنامهٔ بازه‌ای صریح بار، شبکه، صادرات و باتری؛ نه حذف صرف guard نیروگاهی |
| ذخیره/بازیابی و انتخاب منبع | IndexedDB + مرجع snapshot؛ بازپخش اعتبارسنجی هنگام restore؛ خطای روشن نبود شواهد |
| انتقال یک‌فایلی | پاکت پروژه+شواهد معتبر؛ restore پس از پاک‌شدن شواهد محلی در آزمون واقعی مرورگر هر سه mode |
| مهاجرت/provenance | حفظ شناسه، backward compatibility ورودی قدیمی نیروگاهی، تنزل ادعای provider واردشده؛ بدون پذیرش mismatch |
| invalidation | تغییر mode/context/ظرفیت باتری رد می‌شود؛ وابستگی بار/باتری مختص حالت‌های مرتبط است |
| گزارش EPC منبع‌محور | منبع/دفتر انرژی/مالی همراه پیوست ساختاریافتهٔ سایت، تجهیزات، بار، AC، کابل، آرایه، باتری، حفاظت، سازه و وضعیت shading؛ نه نسبت‌دادن waterfall/PR/روز نماینده به منبع انتخاب‌شده |
| پنج مسیر گزارش | HTML، DOCX، XLSX، JSON با شواهد، چاپ/PDF؛ آزمون همهٔ مسیرها برای هر سه mode؛ پیوست جدولی جای چیدمان گرافیکی گزارش قدیمی است |
| سلامت baseline | دادهٔ اختیاری پژوهشی پیش‌شرط اجرای baseline نشده؛ آزمون‌های عمومی و گردش مطالعه عبور کرده‌اند |

گزارش منبع‌محور داده‌های مستقل طراحی را به‌عنوان **assessment غربالگری** ضمیمه می‌کند؛ وضعیت سازه از `effectiveStructuralSnapshot` شامل stale/unavailable می‌آید. وجود پیوست، تأیید مهندسی آن نیست. JSON گزارش سند تحلیل است، نه ورودی restore پروژه؛ برای restore از پاکت قابل‌انتقال پروژه استفاده شود.

## شروع فاز ۳

دفتر انرژی `operatingDispatch.ts` اکنون به شواهد معتبر AC direct و integrated وصل است. هر سه mode از یک موتور load-first با بار واقعیِ واردشده، عدم ساخت پروفایل سالانه، گام زمانی دقیق، محدودیت PCS/SOC، ηc/ηd صریح، outage، export cap، curtailment و unmet استفاده می‌کنند. شارژ و دشارژ همزمان ندارد؛ از شبکه شارژ نمی‌کند و باتری را برای فروش تخلیه نمی‌کند. در off-grid هیچ تبادل شبکه‌ای رخ نمی‌دهد.

منفعت مالی on-grid از خودمصرفی و صادرات استخراج می‌شود؛ import کل خانوار دوباره از منفعت افزایشی PV کم نمی‌شود. در off-grid تولید دورریخته یا انرژی تأمین‌نشده ارزش‌گذاری نمی‌شود. انرژی اولیهٔ باتری محافظه‌کارانه از خودمصرفی ارزش‌پذیر کسر می‌شود. تولید ناخالص PV و انرژی ارزش‌پذیر مالی در HUD و گزارش تفکیک شده‌اند؛ PR همچنان صریحاً screening است.

فرمول‌ها، واحدها، schema، موازنه و محدودیت‌ها: [OPERATING-DISPATCH.fa.md](../OPERATING-DISPATCH.fa.md). پشتوانهٔ طراحی تحقیق R9 در `docs/research/phase1/RESEARCH-MODEL-DOSSIERS.fa.md` و قراردادهای ذخیره/شبکه در `GENERAL-PURPOSE-MODELS.fa.md` است. این اجرای جدید معادل SAM یا solver شبکهٔ اعتبارسنجی‌شده نیست.

## آزمون‌های محلی اجراشده

- `npm run lint:types` — PASS برای client/node.
- `npm run build` — PASS؛ هشدارهای قبلی chunk/import و annotation وابستگی باقی‌اند.
- `npm run test:all` — PASS؛ benchmark/audit و گیت شواهد مستقل فرمول‌های موجود. این گیت به‌تنهایی پوشش همهٔ فرمول‌های جدید studies را اثبات نمی‌کند؛ آزمون‌های مستقل dispatch جدا اجرا شده‌اند.
- `PVLIB_PYTHON=.cache/thermal-research/venv/bin/python npm run test:study:workflow` — PASS، از جمله ماتریس ۸۱۹۲ قرارداد و ۱۶ runtime واقعی.
- `npm run test:operating:dispatch` — PASS؛ شاهد دستی و Python Decimal مستقل، حساسیت چهار پارامتر، دو موازنهٔ هر بازه، ۱۵/۳۰/۶۰ دقیقه، outage، صفر/پر بودن باتری، سقف صادرات، حالت/ظرفیت نامعتبر، خروجی worker مستقیم و integrated سالانه و نگاشت **درآمد سال اول** هر سه mode.
- `PVLIB_PYTHON=.cache/thermal-research/venv/bin/python npm run test:operating:browser` — PASS هر سه mode؛ پذیرش واقعی App، اتصال FinancialTab، پنج مسیر گزارش، بازکردن XML واقعی DOCX، workbook با ExcelJS، محتوای HTML/چاپ و JSON شواهد؛ پاک‌کردن DB شواهد و restore از فایل پروژه.
- `PVLIB_PYTHON=.cache/thermal-research/venv/bin/python npm run test:operational:browser` — PASS رگرسیون قبلی، شامل reload/local restore، خطای شواهد مفقود، recovery، reset و تغییر سایت.
- `npm run test:operational:study` — PASS roundtrip و خرابکاری receipt/evidence/context/descriptor/id.
- `npm run verify:exports` — PASS readback گزارش و انتقال قدیمی DOCX/XLSX/JSON.
- `git diff --check` — PASS.

آزمون‌ها دادهٔ **مصنوعیِ مشخصاً مخصوص تست** دارند؛ هیچ دادهٔ مصنوعی به‌عنوان ورودی عملیاتی کاربر ساخته یا جایگزین نشده است. شکست اولیهٔ تست مرورگر با تغییر مختصات fixture و تابش شبانه، با استفاده از سایت سازگار همان fixture رفع شد، نه سست‌کردن کنترل افق. آزمون سریع بازکردن گزارش نیز race بازبازیابی همان receipt را آشکار کرد؛ بستن گزارش اکنون به تغییر هویت منبع/context وابسته است، نه تغییر identity شیء هم‌محتوا.

## ادامهٔ فاز ۳ و حدود ادعا

- مدل topology-specific برای DC-coupled، عمر/حرارت باتری، دیزل dispatch، جزیره‌سازی و انتقال/حفاظت فیزیکی هنوز نیست.
- ledger یک‌ساله اجرا می‌شود؛ cashflow سال‌های بعد مدل degradation اسکالر موجود است، نه dispatch چندساله یا تعرفهٔ ساعتی.
- اتصال و شواهد مستقل عمیق‌تر مدار/ردیاب/حرارت/شبکه باید برای هر سه mode ادامه یابد؛ این موارد تمام‌شده اعلام نمی‌شوند.
- Windows، Safari، quota واقعی، خروجی PDF renderer، چندحسابی/ابر و CI روی SHA دقیق این working tree آزموده نشده‌اند.
- تغییر قرارداد هش فیزیکی می‌تواند receipt قدیمی را stale کند؛ در این صورت با پیام روشن، بازپذیرش شواهد در context فعلی لازم است، نه bypass hash.
- branch: `arena/237e6ea2-solarpv-studio`؛ HEAD پایه: `5438fb59f4bb5cde05c20818b780464e1fe28752`. هیچ commit/push/merge انجام نشده و تغییرات پیشین workspace حفظ شده‌اند. نتایج محلی‌اند، نه CI این SHA.
