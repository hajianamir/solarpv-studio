# کنترل بهینه، دیزل، عمر باتری و PDF واقعی — وضعیت اجرا

## نتیجه و حدود تحویل

قابلیت‌های زیر برای هر سه mode نیروگاهی، on-grid و off-grid اضافه و در Linux/Chromium آزموده شدند:

- کنترل `optimal-discrete`: بهینه‌سازی کل افق با برنامه‌ریزی پویا روی شبکهٔ صریح SOC و حالت روشن/خاموش دیزل؛ هدف اقتصادی، شرط SOC پایانی و قیود مشخص.
- کنترل `load-first`: مقایسهٔ مستقل با سیاست بار-اول و دیزل پشتیبان هنگام نبود شبکه.
- دیزل با حد توان، حداقل بار، مصرف بی‌باری، شیب منحنی سوخت، دسترس‌پذیری، وضعیت اولیه و هزینهٔ استارت.
- مدل تخمینی عمر باتری calendar + EFC با ضرایب و منبع صریح، SOH، افق تعویض و projection تکرار duty.
- تولید **فایل PDF واقعی** در مرورگر، با فونت Unicode محلی، ترتیب متن دوطرفه و شکل‌دهی فارسی، صفحه‌بندی A4 و شمارهٔ صفحه؛ مستقل از print dialog.
- worker قابل لغو، کنترل نسخهٔ درخواست و invalidation با تغییر context؛ بدون fallback پنهان.

**این تحویل، مدل الکتروشیمیایی/حرارتی باتری، DC-coupled، کنترل پیش‌بین عملیاتی یا بهینگی پیوسته نیست.** تحلیل پیشرفته مستقل و اختیاری است و منبع مالی فعال پروژه را خودکار بازنویسی نمی‌کند. مدل قبلی پذیرش انرژی/مالی حفظ شده؛ این جداسازی عمدی است تا objective شامل tariff ساعتی، جریمه unmet، هزینه wear و دیزل با cashflow اسکالرِ قبلی مخلوط نشود. تعویض‌های پیشنهادی عمر نیز به‌صورت پنهانی وارد NPV نمی‌شوند. اگر منظور از «تکمیل» جایگزینی کامل مدل مالی/عمر فیزیکی همهٔ توپولوژی‌ها باشد، آن دامنه هنوز تکمیل نشده است.

### Windows و Safari

| محیط | وضعیت واقعی این نوبت |
|---|---|
| Linux x64 / Chromium 133 | **PASS اجراشده**؛ برنامهٔ production، هر سه mode، worker، آرشیو، گزارش و PDF واقعی |
| Windows / Chromium | workflow و انتخاب runtime آماده؛ **هنوز اجرا نشده** |
| macOS / Playwright WebKit | workflow آماده؛ **هنوز اجرا نشده**؛ حتی PASS آن هم به معنی Safari واقعی نیست |
| macOS / Safari واقعی | runner مستقل Selenium/safaridriver و workflow آماده؛ **هنوز اجرا نشده** |

سیستم محلی این نشست Linux است؛ Safari بومی در آن اجرا نمی‌شود. تغییرات روی همین شاخه commit/push شده‌اند. در اجرای واقعی GitHub Actions شمارهٔ 44955669115 برای SHA `5c673a908d4744f81f51870fe15a6add77474ec4`، Windows/Chromium، Linux/Chromium و macOS/WebKit موفق شدند. در اجرای جدیدتر شمارهٔ 44957120805 برای SHA `cc08f910cd306f4c7d94f1105d1c2e5768a84d5e`، Windows و Linux موفق شدند، اما WebKit هنگام تعامل دانلود PDF و Safari بومی هنگام خواندن فایل با `NotReadableError` شکست خوردند. انتقال پاک‌کردن انتخاب فایل به پس از خواندن، برای حل خطای Safari کافی نبود؛ علت نهایی هنوز تأیید نشده است. تنظیم timeout تعامل مرورگر به ۱۸۰ ثانیه شاهد اجرای موفق جدید محسوب نمی‌شود. بنابراین Safari واقعی و موفقیت کل CI تأیید نشده‌اند. jobهای مرورگر direct-study در CI عمومی نیز قبلاً شکست داشته‌اند. جزئیات در `docs/audit/ADVANCED-DISPATCH-PDF-LOCAL-CHECKS.json` ثبت شده است.

پس درخواست «تست واقعی Windows/Safari» هنوز باز است؛ پیکربندی آزمون را به‌جای نتیجهٔ اجراشده معرفی نمی‌کنیم.

## استفاده در برنامه

در تب اقلیم، بخش **Advanced operating analysis** مستقل از بخش پذیرش انرژی قرار دارد. context فعلی پروژه را دانلود کنید و فایل `advanced-study-v1` بدهید. فایل باید شواهد کامل و معتبر یک سال UTC را داشته باشد؛ دادهٔ سالانه از PSH/روز نماینده ساخته نمی‌شود.

```text
{
  schemaVersion: "advanced-study-v1",
  pvResults: <StudyResult معتبر مستقیم یا آرایهٔ integrated resultهای سال کامل>,
  plan: {
    schemaVersion: "advanced-dispatch-v1",
    operatingPlan: <قرارداد operating-dispatch-v1 با همان mode و ظرفیت پروژه>,
    controller: "optimal-discrete" | "load-first",
    optimizer: {
      socStates: <تعداد نقاط پایه، ۲ تا ۱۰۱>,
      terminalSocFraction: <حداقل SOC پایانی؛ بین SOCmin و ۱>,
      batteryWearTomanPerKwh: <هزینهٔ هر kWh شارژ+دشارژ AC>,
      unmetPenaltyTomanPerKwh: <ارزش انرژی تأمین‌نشده>
    },
    diesel: null | {
      source: <منشأ پارامترها، حداقل ۱۰ حرف>,
      ratedKw: <توان نامی مثبت>, minLoadFraction: <۰ تا ۱>,
      interceptLitersPerHour: <مصرف بی‌باری در ساعت روشن>,
      slopeLitersPerKwh: <شیب سوخت نسبت به تولید kWh>,
      fuelTomanPerLiter: <قیمت سوخت>, startCostToman: <هزینهٔ هر روشن‌شدن>,
      initiallyOn: <boolean>
    },
    aging: null | {
      source: <منشأ ضرایب، حداقل ۱۰ حرف>,
      initialSoh: <SOH اولیه ۰ تا ۱>, endOfLifeSoh: <آستانه کمتر از SOH اولیه>,
      calendarLossFractionPerYear: <افت کسری ظرفیت در سال>,
      lossFractionPerEfc: <افت کسری ظرفیت به ازای چرخهٔ کامل معادل>,
      projectionYears: <۱ تا ۵۰>
    },
    economics: [
      {timestamp: <همان لحظهٔ پایان بازهٔ operatingPlan/PV>,
       importTomanPerKwh: <تعرفهٔ خرید>, exportTomanPerKwh: <تعرفهٔ فروش>,
       dieselAvailable: <دسترس‌پذیری واقعی دیزل در آن بازه>}, ...
    ]
  }
}
```

این نمایش template ساختاری است، نه JSON اجرایی و نه دادهٔ عملیاتی نمونه. تمام مقادیر باید با منبع وارد شوند؛ قیمت، راندمان، منحنی دیزل و ضرایب عمر پیش‌فرض پژوهشی تولید نمی‌شوند. `null` صریحاً یعنی آن زیرمدل اجرا نمی‌شود. محدودیت قبلی نیروگاهی در قرارداد پایه (بار محلی و باتری صفر) حفظ شده است؛ توسعهٔ نیروگاه+BESS به‌عنوان توپولوژی مستقل هنوز نیست. بار و توان PV از سمت AC و توان باتری kW و انرژی kWh هستند. API envelope مستقیم در این بخش پذیرفته نیست؛ نتیجهٔ direct/integrated قابل‌انتقال را استفاده کنید.

برنامه ابتدا شواهد PV، سال کامل، زمان، site/capacity/mode و ظرفیت باتری را با کنترل‌های قبلی بازاعتبارسنجی می‌کند. فایل‌های نتیجهٔ همین تحلیل قابل بازورود هستند، اما **request دوباره محاسبه می‌شود**؛ خلاصهٔ ذخیره‌شده مرجع اختیار نیست. JSON خروجی همهٔ شواهد/plan و ledger بازه‌ای را دارد؛ PDF تحلیل پیشرفته فقط summary و هویت منبع است و این محدودیت روی خود PDF نوشته می‌شود.

حدود اجرا: ورودی ۶۴ MiB؛ حداکثر ۱۷۵۶۸ بازه، تا ۳۰ میلیون transition نامزد. نقاط SOC شامل min/max، SOC اولیه و هدف پایانی هم هستند. عبور از سقف، شکست هم‌ترازی، جواب ناممکن یا خرابی worker **خطا** می‌دهد؛ resample، کنترل ساده‌تر یا صفرگذاری پنهانی ندارد. اجرای worker با Cancel یا تغییر context متوقف و خروجی قبلی نامعتبر می‌شود.

## مدل و مشتق‌سازی

### کنترل بهینه

حالت DP زوج `(stored energy on lattice, previous diesel on/off)` است. برای هر بازه، همهٔ انتقال‌های مجاز SOC و حالت دیزل بررسی می‌شوند؛ parentها برای traceback نگهداری می‌شوند. مقدار بهینهٔ انتهایی فقط از حالت‌های دارای SOC پایانی مجاز انتخاب می‌شود.

```text
objective = Σ(grid import cost − PV export revenue
              + diesel fuel cost + diesel start cost
              + battery wear cost + unmet penalty)
```

قیدهای انرژی/توان/SOC و همان مرز AC اعمال می‌شوند. شارژ فقط از مازاد PV است؛ شبکه و دیزل باتری را شارژ نمی‌کنند و باتری برای فروش تخلیه نمی‌شود. این‌ها بخشی از تعریف مسئله‌اند، نه اثبات بهینگی برای هر سامانهٔ ذخیره‌سازی. حداقل و حداکثر SOC از ظرفیت مؤثر اولیه ساخته می‌شوند؛ `initialSoh` ظرفیت ابتدای افق را کاهش می‌دهد. خروجی `global_optimum_on_declared_lattice_only` دقیقاً محدود به همین lattice و tolerance عددی است. ریزترشدن lattice باید حساسیت‌سنجی شود؛ هیچ دقت پیوسته‌ای از نام optimal نتیجه نمی‌شود.

Perfect foresight از کل تعرفه/بار/تابش آیندهٔ ورودی استفاده می‌کند؛ با کنترل واقعی online یا forecast قابل‌اعتماد یکی نیست. اگر جریمه unmet کم باشد، solver می‌تواند آگاهانه بار را قطع کند؛ unmet باید بررسی شود، نه اینکه خروجی «تأمین مطمئن» نامیده شود. قیود min-up/down، ramp، start delay و startup fuel مستقل هنوز در مدل نیستند.

### دیزل

```text
fuel_L = intercept_L_per_h × on_hours + slope_L_per_kWh × generated_kWh
```

هنگام خاموشی مصرف صفر است. تولید حداقل پایدار و تولید محدود به rating/تقاضا دو endpoint بررسی‌شده برای مدل خطی‌اند؛ مازاد ناشی از حداقل بار `dieselDumpKwh` است، نه فروش یا شارژ باتری. هزینه استارت فقط در off→on رخ می‌دهد و وضعیت اولیه صریح است. کنترل load-first دیزل را فقط برای کسری هنگام نبود شبکه و تا حد توان لازم/مجاز به‌کار می‌گیرد؛ کنترل بهینه می‌تواند بین خرید شبکه و تولید دیزل انتخاب کند. این منحنی قراردادی ساده‌شده است؛ نه fit موتور واقعی و نه پیاده‌سازی یا هم‌ارزی تأییدشدهٔ HOMER/SAM.

موازنه‌های آزموده‌شده:

```text
PV + import + battery discharge + diesel
  = local load + auxiliaries − unmet + battery charge + export
    + PV curtailment + diesel dump
stored_end = stored_start + AC charge − AC discharge − battery loss
```

### عمر باتری

```text
EFC = (DC charge throughput + DC discharge throughput) / (2 × nominal kWh)
calendar loss = declared annual fraction × elapsed_hours / 8766
cycle loss = declared loss per EFC × EFC
SOH_end = max(0, SOH_initial − calendar loss − cycle loss)
```

فرمول، مدل تخمینی خطیِ اعلام‌شده است؛ نه فرمول کامل cycle/calendar در SSC. ضرایب باید از characterization/کالیبراسیون معتبر همان chemistry بیایند؛ هیچ ضریب عمومی برای همهٔ باتری‌ها hard-code نشده است. projection همان duty مشاهده‌شده را به نرخ سالانه تکرار می‌کند. در مرز سالی که SOH به threshold می‌رسد تعویض ثبت و SOH به ۱ برمی‌گردد. در افت صفر، زمان پایان عمر `null` است، نه عدد دلخواه.

این مدل **ex-post** است: افت در طول همان افق به dispatch بازخورد ندارد؛ فقط SOH اولیه ظرفیت ابتدای افق را تغییر می‌دهد. مدل دما/DoD/C-rate/rainflow یا الکتروشیمی نیست. تعویض‌های projection، پیش‌بینی میدانی یا برنامهٔ قطعی خرید نیستند. چون این محدودیت‌ها مؤثرند، نتیجه خودکار وارد cashflow موجود نشده است. تحقیقات پیشین R9 در `docs/research/phase1/RESEARCH-MODEL-DOSSIERS.fa.md` تفکیک این دامنه‌ها را الزام می‌کند. صفحات تازهٔ HOMER fuel-curve و SAM lifetime در این نوبت fetch نشدند؛ خواندن موفق یا تأیید مستقل آن منابع ادعا نمی‌شود.

## PDF نهایی

- دکمهٔ **Download operational PDF** در گزارش منبع فعال، فایل PDF شامل summary، cashflow و پیوست EPC می‌سازد؛ دیگر فقط چاپ نیست.
- دکمهٔ **Download advanced PDF** در بخش پیشرفته، PDF خلاصهٔ تحلیل و هش/محدودیت‌ها می‌سازد؛ ledger کامل در JSON است.
- فونت DejaVuSans با مجوز همراه در `src/assets/fonts` بسته‌بندی شده و فونت بیرونی لازم نیست. `bidi-js` و شکل‌دهی fontkit، runهای فارسی/لاتین را جدا پردازش می‌کنند. یک ایراد واقعیِ run مختلط در بازبینی raster کشف و اصلاح شد؛ تست اکنون ترتیب منطقی عبارت «آزمون فارسی» را هم می‌خواند.
- کاراکتر پشتیبانی‌نشده با خطای روشن متوقف می‌شود؛ glyph خالی یا حذف بی‌صدا پذیرفته نیست. سقف ۱۰۰۰۰ خط PDF با خطای صریح است. متن HTML اجرا نمی‌شود.
- PDF با دو parser مستقل‌تر از generator بررسی شد: pdf-lib برای ساختار و PDF.js برای متن/صفحات؛ صفحهٔ نمونه با PDF.js و canvas واقعاً raster شد و غیرخالی‌بودن متن کنترل و تصویر بازبینی شد.

نمونه‌های آزمون موقت در `.cache/pdf-evidence/` هستند؛ خروجی‌های synthetic آزمون‌اند، نه گزارش پروژهٔ واقعی کاربر و تضمین نگهداری در snapshot ندارند.

## آزمون‌های اجراشده

- `npm run lint:types`: PASS client/node.
- ESLint فایل‌های جدید مدل/worker/PDF/panel: PASS.
- `PVLIB_PYTHON=.cache/thermal-research/venv/bin/python npm run test:advanced:dispatch`: PASS؛ شاهد هزینهٔ greedy=100 در برابر optimum=1؛ شمارش exhaustive مستقل Python؛ ۲۰ حالت اضافی tariff/export/outage/terminal/wear با exhaustive oracle؛ مصرف/استارت/وضعیت اولیه/حداقل بار/dump دیزل؛ موازنه‌ها؛ SOH/EFC/calendar/تعویض؛ راندمان؛ terminal ناممکن؛ شواهد واقعی worker با دادهٔ **مصنوعی تست** برای سال کامل هر سه mode.
- `npm run test:pdf`: PASS؛ PDF پنج‌صفحه‌ای A4، متن فارسی با ترتیب صحیح، رکورد ابتدا/انتها، هش، ضد truncation، unsupported glyph rejection، raster واقعی صفحه.
- `npm run build`: PASS؛ هشدارهای قبلی chunk/import/annotation باقی‌اند.
- `PVLIB_PYTHON=.cache/thermal-research/venv/bin/python npm run test:operating:browser`: PASS هر سه mode در Chromium/Linux؛ اجرای advanced در worker، آرشیو+replay با خلاصهٔ خرابکاری‌شده، ثابت‌ماندن منبع مالی، PDF واقعی پیشرفته و عملیاتی با readback و هویت منبع، خروجی‌های قدیمی و restore پاکت پروژه.
- `npm run test:all`: PASS benchmark/audit/gates موجود. این به‌تنهایی گواه پوشش فرمول‌های جدید studies نیست؛ شاهدهای مستقل بالا جدا اجرا شده‌اند.
- گردش مطالعه، `test:operating:dispatch`، `test:operational:study` و `verify:exports`: PASS.
- `python -m py_compile scripts/test-native-safari.py`: PASS syntax؛ **نه آزمون Safari**.
- `npm audit --omit=dev --audit-level=high`: صفر آسیب‌پذیری گزارش‌شده در زمان اجرا.

## اجرای Windows/Safari که هنوز باقی است

فایل `.github/workflows/operating-platforms.yml` چهار job دارد: Windows/Chromium، macOS/WebKit، Linux/Chromium و **Safari واقعی** با Selenium/safaridriver. هر job روی checkout خودش SHA ثبت و PDF/receipt آپلود می‌کند. اجرای native Safari از browserName=Safari و قابلیت‌های واقعی driver اطمینان می‌گیرد؛ اگر macOS نباشد، fail/NOT RUN می‌دهد. در تست Safari، Blob خروجی برای readback گرفته می‌شود تا dialog مجوز دانلود سیستم‌عامل مانع اتوماسیون نشود؛ byteهای PDF واقعی هستند، ولی مجوز ذخیرهٔ فایل در GUI سیستم‌عامل جزء این شاهد نیست.

برای اجرای واقعی، ابتدا نسخهٔ همین شاخه باید با مجوز کاربر commit/push شود و workflow روی **همان SHA** اجرا شود؛ سپس وضعیت jobها و artifactهای واقعی بررسی شوند. این نوبت commit/push/merge یا اجرای دوردست انجام نشده و **Windows/Safari PASS اعلام نمی‌شوند**.
