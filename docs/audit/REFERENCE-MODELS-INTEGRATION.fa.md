# اتصال opt-in مدل‌های مرجع به UI / report / waterfall

تاریخ: ۲۰۲۶-۱۱-۰۳؛ شاخه: `arena/cfc20741-solarpv-studio`؛ baseline این مرحله: `4573927999304f70d66b5830c67c11103ffe0023`.

این گزارش مکمل نتیجهٔ **مرحله اول** در `REFERENCE-MODELS-IMPLEMENTATION-RESULT.fa.md` است؛ عبارت «integration انجام نشده» در آن گزارش، وضعیت تاریخی همان مرحله بود. این مرحله مدل مرجع BIPVT یا اعتبارسنجی میدانی اضافه نمی‌کند.

## تغییر واقعی مسیر محاسبه

- `src/engine/reference/annualReferenceLosses.ts`: اجرای دو API نسخه‌دار موجود، کنترل سال کامل UTC با دادهٔ هم‌زمان، تجمیع وزن‌دار انرژی و نتیجهٔ computed/missing_or_unsupported. commit موتور و evidence: `4d68e26`.
- `src/referenceModels/annualReferenceInput.ts`: قرارداد JSON، مختصات، منشأ وزن انرژی، timestamps و پوشش دوره. بخش validation از محاسبات موتور جداست؛ gate بدون تغییر یا استثنای جدید باقی مانده است.
- `buildWaterfallArgs`: انتخاب صریح `annualReferenceLosses` بر مقدار دستی/legacy **همان مرحله** اولویت دارد؛ مقدار دیگری جمع نمی‌شود. مقدار ارسالی درصد مثبت است؛ موتور دست‌نخوردهٔ قبلی علامت منفی را با `-abs` اعمال می‌کند. tuple هفده‌آرگومانی قدیمی و defaults آن تغییر نکرده‌اند.
- `computeConfiguredWaterfall` و `withReferenceLossMetadata`: گزارش با همان ورودی/هندسهٔ اعمال‌شده برچسب می‌خورد؛ تابع برچسب‌گذاری در `provenance/referenceLossLabels.ts` فقط متن/metadata را تغییر می‌دهد و معادله یا اجرای مدل ندارد. caller report درجا mutate نمی‌شود.
- `App.tsx`: هم مسیر هدف تولید نیروگاهی و هم waterfall اصلی، مدل‌های منتخب را دریافت می‌کنند. انرژی سالانهٔ Financial و گزارش رسمی همچنان از همین waterfall اصلی می‌آید. در sizing با یک slot محیطی، معادل ضربیِ برف و غبار حل‌شده استفاده می‌شود، بدون تغییر فرمول یا ثابت‌های موتور sizing.
- `computeCanonicalAnnualYield`: API عمومی سالانه نیز ورودی جدید و metadata آن را پشتیبانی می‌کند و context پیش‌فرض یکسان برای اعمال افت و برچسب گزارش دارد.

## UI و گزارش

- تب اقلیم: import اختیاری JSON حداکثر ۲۰ MB، پیام خطای قابل مشاهده، وضعیت اعمال و metadata، و دکمهٔ بازگشت به screening. دادهٔ هواشناسی یا default جدید تولید نمی‌شود. فایل نامعتبر، پیکربندی فعال قبلی را عوض نمی‌کند. تغییر سایت هنگام خواندن async فایل، import قدیمی را رد می‌کند.
- تب waterfall: وضعیت مرجع و محدودیت‌ها؛ فقط مرحلهٔ واقعاً اعمال‌شده عنوان/شرح pvlib می‌گیرد. مرحلهٔ انتخاب‌نشده، همان screening/manual قبلی می‌ماند.
- گزارش رسمی: وضعیت/metadata شامل شناسه/نسخهٔ مدل، کیفیت اعلامی هواشناسی و پارامتر، پارامترهای واقعی و washها، واحدها، دورهٔ UTC، انرژی و منشأ آن و محدودیت‌ها. DOCX از محتوای گزارش و XLSX از ردیف‌های صریح metadata تغذیه می‌شوند. JSON علاوه بر snapshot گزارش، ورودی خام را زیر `city.annualReferenceLosses` نگه می‌دارد. schema بازیابی پروژه این ورودی را حذف نمی‌کند؛ پس از restore دوباره ارزیابی می‌شود.
- راهنمای کامل قرارداد، شکل JSON، واحدها و توضیح استفاده: `docs/REFERENCE-TIMESERIES-IMPORT.md`.

## شرط‌ها و دامنهٔ علمی

- پوشش یک سال کامل تقویمی **UTC**، زمان پایان بازه، leap-day، resolution منظم و تطابق دقیق timestampهای انرژی و تمام weatherهای انتخابی لازم است. انرژی باید clean/snow-free DC Wh پیش از هر دو افت باشد؛ annual PSH/GHI یا AC export جای آن نیست.
- ورودی ناقص، gap، سال ناقص، مختصات متفاوت، وزن صفر کل یا denominator صفر snow → unavailable. در پیکربندی فعال نامعتبر، هر دو مدل درخواستی به‌صورت atomic اعمال نمی‌شوند و مقادیر screening/manual قبلی حفظ می‌شوند؛ علت در UI/report مشخص است. نبود مدل منتخب برای یک مرحله به معنی صفرکردن ورودی legacy آن نیست.
- snow صرفاً roof/reference و fixed-tilt است. tilt متفاوت، mounting زمینی یا tracker فعال در context واقعی برنامه، درخواست را unsupported می‌کند. API خام بدون context مسئولیت تعیین context صحیح را به caller می‌سپارد؛ مسیر برنامه context را صریح می‌فرستد.
- soiling از `sum(E*s)/sum(E)` و snow از `sum(E*(1-s)*n)/sum(E*(1-s))` استفاده می‌کند؛ بنابراین دو مرحلهٔ متوالی، اثر مشترک محیطی را بدون دوباره‌شماری بازتولید می‌کنند. وقتی soiling مرجع انتخاب نشده، وزن snow همان E است و درصد screening ثابت غبار جداگانه باقی می‌ماند.
- **فرض صریح:** افت ظرفیت strings برف به افت متناسب انرژی DC هر بازه تبدیل می‌شود؛ این مدل مدار سایه یا validation انرژی سایت نیست. سایر تعامل‌های ساعتی با thermal/shading/inverter در این اتصال حل نشده‌اند. خلاصهٔ کیفیت داده صرفاً اعلام caller است، نه تأیید مستقل آن.
- Kimber هنوز rolling O(n²) دارد؛ سری‌های بسیار بلند زیرساعتی می‌توانند import/محاسبه را کند کنند. این مرحله بهینه‌سازی الگوریتم زمانی یا acquisition داده نیست. ذخیرهٔ پایدار سری بزرگ نیازمند export/کنترل موفقیت save است؛ import به‌تنهایی تضمین ذخیره نیست.

## چیزهایی که عمداً تغییر نکرده‌اند

موتورهای legacy screening، fixed 3.5% در BIPVT، structural snow load، tracker/transposition، offsetهای حرارتی و ضرایب نامرتبط. مدل مرجع forced-air BIPVT همچنان ساخته نشده است. waterfall محلیِ diagnostic سایه‌اندازی سه‌بعدی همچنان defaults screening خودش را دارد و به‌عنوان اجرای مرجع پروژه معرفی نشده است؛ مرجع انرژی و finance و گزارش پروژه، waterfall اصلی متصل‌شده است.

## شواهد آزمون این مرحله

- **۳۳ fixture مستقل جدید** و sensitivity-check برای هر expression جدید/تغییرکردهٔ شناسایی‌شده، علاوه بر ۳۲ fixture مدل‌های مرحله قبل. Python `pvlib==0.13.1` خروجی علمی را مستقل از TypeScript تولید می‌کند؛ جمع‌های انرژی جداگانه در generator Python محاسبه می‌شوند. fixture wrapper صفرظرفیت فقط transport و مفروضات screening موجود را می‌آزماید، نه صحت علمی آن مفروضات. متن گزارش و metadata قرارداد API هستند و شواهد فیزیکی مستقل شمرده نمی‌شوند.
- بازتولید: `scripts/fixtures/physics/generate-annual-reference-0131.py`. expectedهای فیزیکی از خروجی برنامه کپی نشده‌اند؛ منبع نسخه‌دار همان [snow.py](https://github.com/pvlib/pvlib-python/blob/v0.13.1/pvlib/snow.py) و [soiling.py](https://github.com/pvlib/pvlib-python/blob/v0.13.1/pvlib/soiling.py) است. این مرحله ادعای خواندن منبع علمی جدید ندارد.
- `scripts/test-reference-integration.ts`: تطبیق مستقل fixtureها، جایگزینی نه جمع، علامت و تعداد یک‌باره مراحل، برابری انرژی نهایی با tuple درصدهای حل‌شده، fallback، سال کبیسه/ناقص، داده مفقود/صفر/منفی، ترتیب/تطابق زمان، مختصات، mounting/tilt/tracker، denominator پس از غبار، atomic failure، API سالانه و round-trip schema/JSON.
- آزمون مرورگر واقعی: import معتبر، رد فایل دارای انرژی مفقود پیش و پس از import معتبر بدون از دست دادن ورودی فعال، مشاهدهٔ مرحلهٔ مرجع در waterfall، حضور شناسهٔ مدل در DOCX و XLSX واقعی، raw inputs و metadata در JSON واقعی، restore و غیرفعال‌سازی و بازگشت به screening. این اجرا offline/mock و دادهٔ عددی آن synthetic است، نه weather سایت.
- PASS محلی (exit 0): `npm run lint`، `npm run build`، `npm test`، `PHYSICS_DIFF_BASE=4573927 npm run test:audit`، `npm run test:gateway`، `npm run test:remediation`، `npm run test:smoke`، `npm run verify:exports`، `npm run test:browser` و diff checks. lint شامل ۹۵ warning موجود و صفر error بود. audit، source invariants / registry / claims / rate-limit / reference gate و self-tests آن را هم اجرا کرد؛ gate تغییر یا تضعیف نشده است.

CI باید برای SHA نهاییِ push‌شده بررسی شود؛ نتیجهٔ نهایی و لینک run در پاسخ تحویل ارائه می‌شود. PASS محلی، ادعای PASS خودکار CI نیست. هیچ merge انجام نشده است. دادهٔ مستقل میدانی در اختیار نیست؛ MBE/MAE/RMSE یا ادعای annual/site validation گزارش نمی‌شود.
