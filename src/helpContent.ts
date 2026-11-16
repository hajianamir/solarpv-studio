export type HelpLanguage = 'en' | 'fa';
export type HelpSystemMode = 'powerplant' | 'ongrid' | 'offgrid';

export interface HelpCopy {
  title: string;
  inputs: string;
  method: string;
  limitations: string;
  sources?: string;
}

const COPY: Record<string, Record<HelpLanguage, HelpCopy>> = {
  climate: {
    en: {
      title: 'Site & climate',
      inputs: 'Choose a place on the map or enter coordinates, then review/edit the climate fields shown here: peak sun hours (PSH), design temperatures, albedo, tilt and related site values. Keep their source/provenance in view when overriding them.',
      method: 'Provider climate records are used when available; otherwise getClimateData() in src/engine/climaticData.ts validates coordinates, classifies macro-regions, and estimates PSH from latitude/region rules while preserving calculation precision (the UI displays two decimals). Design daylight comes from calculateDesignDaylightHours(latitude), using winter-solstice solar geometry; annual tilt uses clamp(round(|latitude| × 0.88), 8, 65)°, with seasonal ±15° rules. PV sizing consumes PSH and design temperatures; thermal derate and water pumping consume temperature/PSH; albedo feeds bifacial irradiance. On coordinate change the climate flow refreshes location data, then reapplies only explicitly edited fields.',
      limitations: 'PSH is daily solar resource (kWh/m²/day), not daylight-clock hours. A value below 1 has a displayed model limitation in some scenario calculations; zero/invalid solar resource makes PV sizing unassessable.',
    },
    fa: {
      title: 'مکان و اقلیم',
      inputs: 'مکان را از نقشه انتخاب کنید یا مختصات را وارد کنید؛ سپس ساعات اوج تابش (PSH)، دماهای طراحی، آلبدو، شیب و سایر مقادیر نمایش‌داده‌شده را بازبینی/ویرایش کنید. هنگام اصلاح دستی، منشأ داده را نیز بررسی کنید.',
      method: 'در صورت وجود از دادهٔ provider استفاده می‌شود؛ در غیر این صورت getClimateData() در src/engine/climaticData.ts مختصات را اعتبارسنجی و ناحیه را طبقه‌بندی می‌کند و PSH را از قواعد عرض/منطقه با حفظ دقت محاسبات تخمین می‌زند (نمایش UI دو رقم اعشار است). طول روز طراحی از calculateDesignDaylightHours(latitude) و هندسهٔ انقلاب زمستانی می‌آید؛ شیب سالانه clamp(round(|latitude| × ۰٫۸۸), ۸, ۶۵) درجه است و قواعد فصلی ±۱۵ درجه‌اند. سایزینگ PV از PSH و دماهای طراحی، derate حرارتی و پمپاژ از دما/PSH و تابش bifacial از آلبدو استفاده می‌کنند. با تغییر مختصات، دادهٔ مکان تازه می‌شود و فقط فیلدهای صریحاً ویرایش‌شده دوباره اعمال می‌شوند.',
      limitations: 'PSH منبع خورشیدی روزانه با واحد kWh/m²/day است، نه طول روزِ ساعت‌محور. برای PSH کمتر از ۱ در برخی محاسبات سناریو محدودیت مدل نمایش داده می‌شود؛ منبع صفر/نامعتبر، سایزینگ PV را غیرقابل ارزیابی می‌کند.',
    },
  },
  loads: {
    en: {
      title: 'Electrical loads',
      inputs: 'Use a preset or enter each load’s name/category, rated watts, quantity, surge multiplier, day-hours, night-hours and AC/DC type. Enter realistic operating hours within the site day/night window; motor starting multipliers matter for inverter surge sizing.',
      method: 'Daily energy per item is rated watts × quantity × (day-hours + night-hours), split into day and night. The engine separately totals AC and DC demand. Surge is screened as the largest starting motor plus other active motors at running watts and non-motor loads; it is not the sum of every motor’s simultaneous locked-rotor current.',
      limitations: 'Hours beyond the climate window are normalized (excess day hours can transfer to night, with warnings). Results assume the entered schedule and coincidence rules; they are not a measured load survey.',
    },
    fa: {
      title: 'بارهای الکتریکی',
      inputs: 'از پیش‌تنظیم استفاده کنید یا برای هر بار نام/دسته، توان نامی، تعداد، ضریب راه‌اندازی، ساعت روز، ساعت شب و نوع AC/DC را وارد کنید. ساعات کار را در پنجرهٔ روز/شب محل واقع‌بینانه تنظیم کنید؛ ضریب راه‌اندازی موتور در سایزینگ surge اینورتر مؤثر است.',
      method: 'انرژی روزانهٔ هر بار برابر توان نامی × تعداد × (ساعت روز + ساعت شب) است و به روز و شب تفکیک می‌شود. موتور، بارهای AC و DC جداگانه جمع می‌شوند. surge به‌صورت بزرگ‌ترین موتورِ در حال راه‌اندازی به‌علاوهٔ موتورهای دیگر در حال کار و بارهای غیرموتوری غربال می‌شود؛ جریان راه‌اندازی هم‌زمان همهٔ موتورها جمع نمی‌شود.',
      limitations: 'ساعات فراتر از پنجرهٔ اقلیمی نرمال می‌شوند (مازاد روز ممکن است به شب منتقل شود) و هشدار می‌گیرند. خروجی بر برنامهٔ واردشده و قواعد هم‌زمانی تکیه دارد، نه برداشت میدانی بار.',
    },
  },
  system_mode: {
    en: {
      title: 'System mode',
      inputs: 'Select Powerplant, On-grid customer, or Off-grid customer in the mode controls. Then review the mode-specific inputs on this page, such as plant AC target, inverter strategy, outage/autonomy and equipment choices when shown.',
      method: 'This selector changes which calculations and workflow modules are active. Powerplant sizing uses the explicit plant AC target; customer PV sizing uses load/outage demand. Off-grid has no upstream utility-grid/harmonic analysis.',
      limitations: 'Changing mode does not validate a utility agreement, protection study, equipment choice or site design. Existing project inputs can remain stored when a mode hides their controls; hidden values are not automatically evidence of applicability.',
    },
    fa: {
      title: 'حالت سیستم',
      inputs: 'از کنترل حالت، نیروگاه، مصرف‌کنندهٔ متصل به شبکه یا مصرف‌کنندهٔ مستقل را انتخاب کنید. سپس ورودی‌های همان حالت را که در صفحه دیده می‌شوند—مانند هدف AC نیروگاه، راهبرد اینورتر، خاموشی/خودمختاری و تجهیزات—بازبینی کنید.',
      method: 'این انتخاب محاسبات و ماژول‌های گردش‌کار فعال را تغییر می‌دهد. سایزینگ نیروگاه از هدف صریح AC استفاده می‌کند؛ سایزینگ PV مصرف‌کننده از بار/خاموشی پیروی می‌کند. در حالت مستقل، تحلیل شبکهٔ بالادست و هارمونیک کاربرد ندارد.',
      limitations: 'تغییر حالت، قرارداد اتصال، مطالعهٔ حفاظت، انتخاب تجهیز یا طراحی محل را تأیید نمی‌کند. ورودی‌های پروژه ممکن است هنگام پنهان‌شدن کنترل‌ها ذخیره بمانند؛ باقی‌ماندن مقدار به‌معنای کاربرد آن در حالت جاری نیست.',
    },
  },
  array: {
    en: {
      title: 'PV array engineering',
      inputs: 'Select module and inverter records; check site PSH, minimum/maximum temperature, soiling, installation environment and (in Powerplant mode) the AC nameplate target. In customer modes, the daily target comes from the load/outage model, not that stored plant target.',
      method: 'The DC target is daily kWh ÷ (PSH × product of modeled temperature, soiling, cable, mismatch/LID, inverter-efficiency, availability and clipping factors). The engine rounds into module/string counts and checks cold Voc, hot Vmp/MPPT window and current limits. DC/AC uses the explicit AC target for Powerplant and designed inverter AC capacity for customers; unavailable capacity is N/A.',
      limitations: 'The result is a preliminary design from catalog values and chosen assumptions. Review feasibility warnings and manufacturer datasheets; a calculated array does not prove field performance or interconnection approval.',
    },
    fa: {
      title: 'مهندسی آرایهٔ PV',
      inputs: 'ماژول و اینورتر را انتخاب کنید و PSH، کمینه/بیشینهٔ دما، گردوغبار، محیط نصب و (فقط در حالت نیروگاه) هدف نامی AC را بررسی کنید. در حالت مصرف‌کننده، هدف روزانه از مدل بار/خاموشی می‌آید، نه از هدف ذخیره‌شدهٔ نیروگاه.',
      method: 'هدف DC برابر انرژی روزانه ÷ (PSH × حاصل‌ضرب ضرایب مدل دما، گردوغبار، کابل، mismatch/LID، بازده اینورتر، دسترس‌پذیری و clipping) است. سپس تعداد ماژول/رشته گرد می‌شود و Voc سرد، Vmp گرم/پنجرهٔ MPPT و محدودیت جریان بررسی می‌شوند. DC/AC در نیروگاه با هدف AC و در مصرف‌کننده با ظرفیت AC اینورتر طراحی‌شده محاسبه می‌شود؛ در نبود ظرفیت، N/A است.',
      limitations: 'این خروجی طراحی مقدماتی بر پایهٔ مقادیر کاتالوگ و فرض‌های انتخابی است. هشدارهای امکان‌پذیری و دیتاشیت سازنده را بررسی کنید؛ محاسبه، عملکرد میدانی یا مجوز اتصال را اثبات نمی‌کند.',
    },
  },
  harmonics_grid: {
    en: {
      title: 'Harmonics & upstream grid screening',
      inputs: 'Enter plant/inverter AC capacity, connection voltage, upstream short-circuit MVA, grid X/R, inverter power factor and leading/lagging direction. This screen is available in Powerplant and On-grid modes, not Off-grid.',
      method: 'The grid screen computes SCR = upstream Ssc / plant MW, an approximate Thevenin impedance and PCC voltage rise from P/Q and R/X. Harmonics use a built-in typical inverter spectrum (orders 3–25), then estimate distortion against SCR-derived current limits; the spectrum is not entered or measured here.',
      limitations: 'Treat outputs as screening estimates only. The fixed representative spectrum, simplified grid model and assumed inputs are not a measured spectrum, utility short-circuit study, flicker/interconnection study or proof of IEEE 519 compliance.',
    },
    fa: {
      title: 'غربالگری هارمونیک و شبکهٔ بالادست',
      inputs: 'ظرفیت AC نیروگاه/اینورتر، ولتاژ اتصال، MVA اتصال کوتاه بالادست، نسبت X/R شبکه، ضریب توان اینورتر و پیش‌فاز/پس‌فاز بودن را وارد کنید. این صفحه در حالت نیروگاه و On-grid در دسترس است، نه Off-grid.',
      method: 'نمای شبکه SCR = توان اتصال کوتاه بالادست ÷ MW نیروگاه، امپدانس تقریبی تونن و افزایش ولتاژ PCC را از P/Q و R/X محاسبه می‌کند. تحلیل هارمونیک از طیف ثابتِ نمونهٔ اینورتر (مرتبه‌های ۳ تا ۲۵) استفاده و اعوجاج را در برابر حدود جریان مبتنی بر SCR برآورد می‌کند؛ طیف اینجا اندازه‌گیری یا وارد نمی‌شود.',
      limitations: 'خروجی را فقط غربالگری بدانید. طیف نمایندهٔ ثابت، مدل ساده‌شدهٔ شبکه و ورودی‌های فرضی، جایگزین طیف اندازه‌گیری‌شده، مطالعهٔ اتصال کوتاه شرکت برق، مطالعهٔ فلیکر/اتصال یا اثبات انطباق IEEE 519 نیستند.',
    },
  },
  mv_substation: {
    en: {
      title: 'MV substation',
      inputs: 'Review the plant AC target, MV/HV voltage, upstream fault level and X/R, transformer/site conditions, cable and breaker selections shown in the substation screen. Replace screening defaults with utility and equipment data when available.',
      method: 'The page calls the MV substation design engine for transformer rating/derating, upstream-plus-transformer short-circuit quantities, breaker checks and earthing outputs. Each result and warning is based on the entered/default network and site parameters.',
      limitations: 'Default upstream fault level and network values are preliminary. Final transformer, relay, breaker, grounding and transient studies require project-specific utility data and qualified engineering review.',
    },
    fa: {
      title: 'پست MV',
      inputs: 'هدف AC نیروگاه، ولتاژ MV/HV، سطح اتصال کوتاه و X/R بالادست، شرایط محل/ترانسفورماتور، کابل و کلیدهای نمایش‌داده‌شده را بازبینی کنید. در صورت دسترسی، دادهٔ واقعی شرکت برق و تجهیزات را جایگزین پیش‌فرض غربالگری کنید.',
      method: 'صفحه موتور طراحی پست MV را برای ریتینگ/افت ظرفیت ترانس، مقادیر اتصال کوتاهِ شبکه و ترانس، کنترل کلید و خروجی‌های زمین فراخوانی می‌کند. هر نتیجه و هشدار به پارامترهای شبکه و محلِ واردشده یا پیش‌فرض وابسته است.',
      limitations: 'سطح اتصال کوتاه و مقادیر پیش‌فرض شبکه مقدماتی‌اند. طراحی نهایی ترانس، رله، کلید، زمین و مطالعات گذرا به دادهٔ اختصاصی شرکت برق و بازبینی مهندسی واجد صلاحیت نیاز دارد.',
    },
  },
  bess: {
    en: {
      title: 'Battery storage',
      inputs: 'Set load profile, topology, outage hours (On-grid) or autonomy days (Off-grid), chemistry, minimum temperature and inverter DC voltage/power. In the BESS page, select a battery model or check unit voltage, Ah and weight.',
      method: 'On-grid autonomy energy is nighttime kWh × min(outage hours / design-night hours, 1); Off-grid uses total daily kWh. Gross kWh = required usable kWh × autonomy days ÷ (chemistry DoD × round-trip efficiency × temperature correction). The result is rounded to series/parallel units and checked for C-rate and coverage.',
      limitations: 'Chemistry factors and unit data are model inputs/profiles. Confirm the selected battery datasheet, BMS, temperature limits, permitted DoD, actual usable capacity and protection; calculated coverage is not a runtime guarantee.',
    },
    fa: {
      title: 'ذخیره‌ساز باتری',
      inputs: 'پروفایل بار، توپولوژی، ساعات خاموشی (On-grid) یا روزهای خودمختاری (Off-grid)، شیمی باتری، کمینهٔ دما و ولتاژ/توان DC اینورتر را تنظیم کنید. در صفحهٔ BESS مدل باتری را برگزینید یا ولتاژ واحد، Ah و وزن را بررسی کنید.',
      method: 'انرژی خودمختاری On-grid برابر kWh شب × کمینهٔ (ساعات خاموشی ÷ ساعات شب طراحی، ۱) است؛ Off-grid از کل kWh روزانه استفاده می‌کند. ظرفیت ناخالص kWh = انرژی قابل‌استفاده × روزهای خودمختاری ÷ (عمق دشارژ × بازده رفت‌وبرگشت × ضریب دما). سپس تعداد سری/موازی گرد و C-rate و پوشش بررسی می‌شوند.',
      limitations: 'ضرایب شیمی و دادهٔ واحد، پروفایل/ورودی مدل هستند. دیتاشیت، BMS، حدود دما، DoD مجاز، ظرفیت واقعی قابل‌استفاده و حفاظت را تأیید کنید؛ درصد پوشش، تضمین زمان پشتیبانی نیست.',
    },
  },
  cables_bom: {
    en: {
      title: 'Cables, earthing & protection',
      inputs: 'Review the system AC capacity/phase, string voltage and current, run lengths, conductor/material/installation assumptions, ambient temperature, grounding choice and site risk inputs shown in the module.',
      method: 'Cable outputs are screened against ampacity/derating, voltage drop and short-circuit withstand. Earthing and lightning outputs are calculated by the protection engines from capacity, grounding, fault and environment assumptions.',
      limitations: 'Several route lengths and conditions are preset engineering assumptions. Replace them with surveyed routes, actual installation method and utility fault data; coordinate final protection and local-code requirements.',
    },
    fa: {
      title: 'کابل، زمین و حفاظت',
      inputs: 'ظرفیت و فاز AC، ولتاژ/جریان رشته، طول مسیر، فرض جنس/روش نصب هادی، دمای محیط، نوع زمین و ورودی‌های ریسک محل را که در ماژول دیده می‌شوند بررسی کنید.',
      method: 'کابل‌ها از نظر جریان مجاز/ضرایب کاهش ظرفیت، افت ولتاژ و تحمل اتصال کوتاه غربال می‌شوند. خروجی زمین و صاعقه با موتورهای حفاظت و بر پایهٔ ظرفیت، نوع زمین، خطا و فرض‌های محیطی محاسبه می‌شود.',
      limitations: 'بعضی طول مسیرها و شرایط، فرض‌های ازپیش‌تنظیم‌شده‌اند. آن‌ها را با مسیر نقشه‌برداری‌شده، روش نصب واقعی و دادهٔ خطای شرکت برق جایگزین کنید؛ حفاظت نهایی و مقررات محلی را هماهنگ کنید.',
    },
  },
  structural: {
    en: {
      title: 'Structural & foundation',
      inputs: 'Review module/table count, tilt, installation environment and the site overrides requested on the page, especially soil/geotechnical parameters, frost depth and foundation-specific inputs. Fill measured or geotechnically supported values; do not treat defaults as a site investigation.',
      method: 'The tab calculates structural/foundation loads and candidate foundation recommendations from current array geometry, environment, wind/snow and entered soil/site data. It explicitly marks results unassessed when required inputs are missing or invalid.',
      limitations: 'Wind exposure, soil strength, groundwater, frost and construction details are site-specific. An unassessed status is not a pass; preliminary model output is not stamped construction design.',
    },
    fa: {
      title: 'سازه و فونداسیون',
      inputs: 'تعداد پنل/میز، شیب، محیط نصب و اصلاحات محلِ درخواست‌شده—به‌ویژه پارامترهای خاک/ژئوتکنیک، عمق یخبندان و ورودی‌های نوع فونداسیون—را بررسی کنید. مقادیر اندازه‌گیری‌شده یا مستند ژئوتکنیکی وارد کنید؛ پیش‌فرض‌ها بررسی خاک محل نیستند.',
      method: 'تب بارهای سازه/فونداسیون و پیشنهاد گزینه‌های فونداسیون را از هندسهٔ آرایه، محیط، باد/برف و دادهٔ خاک/محل محاسبه می‌کند. اگر ورودی ضروری موجود یا معتبر نباشد، نتیجه صریحاً انجام‌نشده اعلام می‌شود.',
      limitations: 'تندی باد، مقاومت خاک، آب زیرزمینی، یخبندان و جزئیات اجرا وابسته به محل‌اند. وضعیت انجام‌نشده به‌معنای قبولی نیست؛ خروجی مقدماتی مدل، طراحی اجرایی مهرشده نیست.',
    },
  },
  sim24h: {
    en: {
      title: '24-hour energy balance',
      inputs: 'The simulation takes the designed DC array, site PSH/daylight window, day/night load energy, usable and gross battery capacity, and initial battery state of charge (the App supplies 50%). Review the outage and generator controls separately.',
      method: 'Daily PV energy is array kWp × PSH × a 0.78 default derate, distributed over daylight with a sine-shaped weight. Day/night loads use fixed time-of-day weights; battery charge/discharge efficiency is 95%, with SOC and surplus/deficit tracked hourly.',
      limitations: 'This is a representative deterministic 24-hour profile, not 8,760-hour weather/dispatch simulation. Fixed load shapes and the default derate can differ from actual operation; a self-sufficient result is not a reliability guarantee.',
    },
    fa: {
      title: 'تراز انرژی ۲۴ ساعته',
      inputs: 'شبیه‌سازی آرایهٔ DC طراحی‌شده، PSH و پنجرهٔ روشنایی محل، انرژی بار روز/شب، ظرفیت قابل‌استفاده و ناخالص باتری و SOC اولیه را می‌گیرد (برنامه ۵۰٪ می‌فرستد). کنترل خاموشی و ژنراتور را جداگانه بررسی کنید.',
      method: 'انرژی روزانهٔ PV برابر kWp آرایه × PSH × ضریب پیش‌فرض ۰٫۷۸ است و با وزن سینوسی در ساعات روشنایی توزیع می‌شود. بار روز/شب از وزن‌های ثابت زمانی استفاده می‌کند؛ بازده شارژ/دشارژ باتری ۹۵٪ است و SOC و مازاد/کسری ساعتی پیگیری می‌شوند.',
      limitations: 'این پروفایل قطعی ۲۴ ساعته است، نه شبیه‌سازی ۸۷۶۰ ساعتهٔ هوا و dispatch. شکل بار و derate ثابت ممکن است با بهره‌برداری واقعی فرق کند؛ نتیجهٔ خودکفایی تضمین قابلیت اطمینان نیست.',
    },
  },
  waterfall_loss: {
    en: {
      title: 'Energy yield & loss waterfall',
      inputs: 'The App supplies actual designed array DC kWp, PSH, ambient temperature, soiling, DC/AC ratio, module temperature coefficients, tracker, bifacial and shading inputs when available. Check stale-shading warnings and the source of each overridden input.',
      method: 'The shared waterfall applies loss/gain stages sequentially to energy, including temperature/optical/soiling and wiring effects, DC/AC clipping, inverter conversion, collector/transformer and availability/auxiliary stages. Financial analysis consumes the same final annual yield.',
      limitations: 'The output is an annualized model estimate built from assumptions and staged factors, not hourly weather replay or measured plant performance. A stale or absent shading record is not equivalent to a validated shading survey.',
    },
    fa: {
      title: 'تولید انرژی و آبشار تلفات',
      inputs: 'برنامه kWp واقعی آرایهٔ DC طراحی‌شده، PSH، دمای محیط، گردوغبار، نسبت DC/AC، ضرایب دمایی ماژول و در صورت وجود ورودی‌های tracker، bifacial و سایه را می‌فرستد. هشدار سایهٔ stale و منشأ ورودی‌های اصلاح‌شده را بررسی کنید.',
      method: 'آبشار مشترک مراحل افت/افزایش را به‌ترتیب روی انرژی اعمال می‌کند؛ از جمله دما/اپتیک/گردوغبار و سیم‌کشی، clipping نسبت DC/AC، تبدیل اینورتر، کابل/ترانس کلکتور و دسترس‌پذیری/مصرف داخلی. تحلیل مالی همان تولید سالانهٔ نهایی را مصرف می‌کند.',
      limitations: 'خروجی برآورد سالانهٔ مدل از فرض‌ها و ضرایب مرحله‌ای است، نه بازپخش آب‌وهوای ساعتی یا عملکرد اندازه‌گیری‌شده. رکورد سایهٔ stale یا نبود آن، معادل نقشه‌برداری معتبر سایه نیست.',
    },
  },
  financial: {
    en: {
      title: 'Financial analysis',
      inputs: 'Review unit prices for modules, inverters, batteries, structures/BOP and EPC; currency conversion, contingency, tariffs, self-consumption/export split, OPEX, escalation, discount rate, degradation and replacement assumptions. Which tariff is used depends on Powerplant, On-grid or Off-grid mode.',
      method: 'Initial CAPEX is assembled from DC Wp, inverter kW, battery kWh and mode-specific items, then contingency is added. The model builds mode-aware annual cash flows and derives NPV/IRR/payback from those flows. Customer modes exclude plant MV substation, grid-connection and HV CAPEX; Powerplant retains those items.',
      limitations: 'Unit costs and tariffs are user/model assumptions, not quotations or a financing offer. Energy yield is the shared waterfall estimate; verify taxes, incentives, financing terms, price basis and local tariffs independently.',
    },
    fa: {
      title: 'تحلیل مالی',
      inputs: 'قیمت واحد ماژول، اینورتر، باتری، سازه/BOP و EPC؛ نرخ تبدیل ارز، contingency، تعرفه، سهم خودمصرفی/فروش، OPEX، رشد هزینه، نرخ تنزیل، افت تولید و تعویض را بررسی کنید. تعرفهٔ فعال با حالت نیروگاه، On-grid یا Off-grid تغییر می‌کند.',
      method: 'CAPEX اولیه از Wp DC، kW اینورتر، kWh باتری و اقلام وابسته به حالت تشکیل و سپس contingency افزوده می‌شود. مدل جریان نقدی سالانهٔ حالت‌محور می‌سازد و NPV/IRR/بازگشت سرمایه را از آن استخراج می‌کند. در حالت‌های مصرف‌کننده، CAPEX پست MV نیروگاهی، اتصال شبکه و HV حذف است؛ نیروگاه این اقلام را حفظ می‌کند.',
      limitations: 'هزینهٔ واحد و تعرفه فرض کاربر/مدل هستند، نه پیش‌فاکتور یا پیشنهاد تأمین مالی. تولید انرژی از آبشار مشترک می‌آید؛ مالیات، مشوق، شرایط تأمین مالی، مبنای قیمت و تعرفهٔ محلی را مستقل تأیید کنید.',
    },
  },
  sld: {
    en: {
      title: 'Single-line diagram',
      inputs: 'The diagram receives current project module/string counts, inverter capacity, battery bank, cable sizes, AC current, grounding and protection values. To change them, edit their source module rather than the diagram.',
      method: 'This is a generated visualization of those supplied values; it does not solve a separate electrical network or protection-coordination study.',
      limitations: 'Verify ratings, conductor routing, breaker/fuse coordination, earthing and utility interface before using it as a drawing. It is not an issued-for-construction design.',
    },
    fa: {
      title: 'دیاگرام تک‌خطی',
      inputs: 'دیاگرام تعداد ماژول/رشته، ظرفیت اینورتر، بانک باتری، سایز کابل، جریان AC، زمین و حفاظت پروژه را دریافت می‌کند. برای تغییر این مقادیر، ماژول منبع را ویرایش کنید، نه خود دیاگرام را.',
      method: 'این نما تصویر تولیدشده از مقادیر دریافت‌شده است؛ حل مستقل شبکهٔ الکتریکی یا مطالعهٔ هماهنگی حفاظت انجام نمی‌دهد.',
      limitations: 'پیش از استفادهٔ نقشه‌ای، ریتینگ‌ها، مسیر هادی، هماهنگی کلید/فیوز، زمین و رابط شبکه را بررسی کنید. نقشهٔ صادرشده برای اجرا نیست.',
    },
  },
  cad_layout: {
    en: {
      title: '2D CAD layout',
      inputs: 'Set structure type, land length/width, row pitch, tilt, module wattage and road width in this page. These are local CAD inputs; they are not automatically a surveyed parcel boundary.',
      method: 'The layout engine places rows/tables within the entered rectangle and reports geometric quantities such as packing/GCR and spacing, then renders/export the generated layout.',
      limitations: 'The current tool uses simplified geometry and entered dimensions. It does not check title boundaries, setbacks, topography, drainage, geotechnical constraints or construction access unless represented by a specific input.',
    },
    fa: {
      title: 'جانمایی CAD دوبعدی',
      inputs: 'نوع سازه، طول/عرض زمین، فاصلهٔ ردیف، شیب، توان ماژول و عرض راه را در همین صفحه تنظیم کنید. این‌ها ورودی‌های محلی CAD هستند و مرز نقشه‌برداری‌شدهٔ ملک نیستند.',
      method: 'موتور جانمایی ردیف/میزها را در مستطیل واردشده می‌چیند و کمیت‌های هندسی مانند تراکم/GCR و فاصله را گزارش و طرح را ترسیم/صادر می‌کند.',
      limitations: 'ابزار از هندسهٔ ساده و ابعاد واردشده استفاده می‌کند. مالکیت/مرز، عقب‌نشینی، توپوگرافی، زهکشی، ژئوتکنیک و دسترسی اجرا را بررسی نمی‌کند مگر آنکه ورودی مشخصی برای آن وجود داشته باشد.',
    },
  },
  '3d_viewer': {
    en: {
      title: '3D scene & shading',
      inputs: 'The scene uses current project array/module geometry, site/location, installation environment, obstacles and the selected shading simulation mode. Review whether the scene matches actual dimensions and whether the shading record is current.',
      method: 'The viewer builds a 3D scene and its ray-tracing/screening path estimates shading for that geometry; applying a result records its capacity/site/signature provenance for later staleness checks.',
      limitations: 'Unmodeled objects, inaccurate dimensions or simplified screening can change the estimate. It is not a survey, a full-year measured shading study, or proof that neighboring obstructions are complete.',
    },
    fa: {
      title: 'صحنهٔ سه‌بعدی و سایه',
      inputs: 'صحنه از هندسهٔ فعلی آرایه/ماژول، محل، محیط نصب، موانع و حالت شبیه‌سازی سایه استفاده می‌کند. تطابق صحنه با ابعاد واقعی و به‌روز بودن رکورد سایه را بررسی کنید.',
      method: 'نمایشگر صحنهٔ سه‌بعدی می‌سازد و مسیر ray-tracing/غربالگری سایه را برای همان هندسه برآورد می‌کند؛ اعمال نتیجه منشأ ظرفیت/محل/امضا را برای کنترل stale بودن ثبت می‌کند.',
      limitations: 'موانع مدل‌نشده، ابعاد نادقیق یا غربالگری ساده‌شده نتیجه را تغییر می‌دهند. این ابزار نقشه‌برداری، مطالعهٔ سایهٔ اندازه‌گیری‌شدهٔ سالانه یا اثبات کامل‌بودن موانع اطراف نیست.',
    },
  },
  scenarios: {
    en: {
      title: 'Scenario comparison',
      inputs: 'The App creates three predefined customer-mode alternatives from current PV demand, PSH and load/autonomy inputs, varying battery/economic assumptions. Check the low-PSH notice and each scenario’s displayed assumptions.',
      method: 'The scenario engine calculates each alternative independently and compares PV/battery capacities and modeled financial/yield outputs; it is a fixed set of variants, not a user-defined probabilistic distribution.',
      limitations: 'Scenario outputs inherit their assumptions and any known scenario-engine floors. They are not probabilities, forecasts, or a substitute for manually validating equipment constraints in the main design pages.',
    },
    fa: {
      title: 'مقایسهٔ سناریوها',
      inputs: 'برنامه سه گزینهٔ ازپیش‌تعریف‌شدهٔ حالت مصرف‌کننده را از تقاضای PV، PSH و ورودی بار/خودمختاری می‌سازد و فرض باتری/اقتصادی را تغییر می‌دهد. هشدار PSH پایین و فرض‌های هر گزینه را بررسی کنید.',
      method: 'موتور سناریو هر گزینه را مستقل محاسبه و ظرفیت PV/باتری و خروجی‌های مالی/تولید مدل‌شده را مقایسه می‌کند؛ مجموعه‌ای ثابت از گزینه‌هاست، نه توزیع احتمالاتی دلخواه کاربر.',
      limitations: 'سناریوها فرض‌ها و کف‌های شناخته‌شدهٔ موتور سناریو را به ارث می‌برند. احتمال، پیش‌بینی یا جایگزین اعتبارسنجی دستی محدودیت تجهیزات در صفحات طراحی نیستند.',
    },
  },
  catalog: {
    en: {
      title: 'Equipment catalog',
      inputs: 'Choose or maintain module, inverter and battery records. Check model identity, electrical ratings, temperature coefficients, voltage/current limits, chemistry and datasheet provenance before using a record.',
      method: 'Selected catalog fields are passed as equipment parameters into PV string, inverter, battery and report calculations; custom records are project/catalog data, not automatically verified manufacturer records.',
      limitations: 'The app cannot confirm product authenticity, current availability, warranty or datasheet revision. Validate each record with the supplier/manufacturer.',
    },
    fa: {
      title: 'کاتالوگ تجهیزات',
      inputs: 'رکورد ماژول، اینورتر و باتری را انتخاب یا نگهداری کنید. پیش از استفاده، شناسهٔ مدل، ریتینگ الکتریکی، ضرایب دما، حدود ولتاژ/جریان، شیمی و منشأ دیتاشیت را بررسی کنید.',
      method: 'فیلدهای انتخاب‌شدهٔ کاتالوگ به‌عنوان پارامتر تجهیز وارد محاسبات رشتهٔ PV، اینورتر، باتری و گزارش می‌شوند؛ رکورد سفارشی دادهٔ پروژه/کاتالوگ است و خودکار از طرف سازنده تأیید نشده است.',
      limitations: 'برنامه اصالت محصول، موجودی روز، ضمانت یا نسخهٔ دیتاشیت را تأیید نمی‌کند. هر رکورد را با تأمین‌کننده/سازنده اعتبارسنجی کنید.',
    },
  },
  iran_regulations: {
    en: {
      title: 'Regulations & tariffs',
      inputs: 'Review the project capacity and annual-generation figures supplied to the page, plus the regulatory/tariff assumptions shown in its tables.',
      method: 'This page presents reference/regulatory information alongside project values; its presentation does not itself query an authority or certify eligibility.',
      limitations: 'Tariffs, program eligibility and regulations can change and vary by project. Confirm the current governing documents and terms with the responsible authority before making a financial or compliance decision.',
    },
    fa: {
      title: 'مقررات و تعرفه‌ها',
      inputs: 'ظرفیت و تولید سالانه‌ای را که به صفحه داده شده، همراه با فرض‌های مقرراتی/تعرفه‌ای جدول‌ها بازبینی کنید.',
      method: 'این صفحه اطلاعات مرجع/مقررات را کنار مقادیر پروژه نمایش می‌دهد؛ نمایش آن به‌تنهایی از مرجع استعلام نمی‌کند و احراز شرایط نیست.',
      limitations: 'تعرفه، شرایط برنامه و مقررات ممکن است تغییر کنند و به پروژه وابسته‌اند. پیش از تصمیم مالی/انطباق، اسناد معتبر و شرایط جاری را از مرجع مسئول تأیید کنید.',
    },
  },
  solar_pumping: {
    en: {
      title: 'Solar water pumping',
      inputs: 'Enter well depth, tank/head elevation, pipe length/diameter, daily water volume and irrigation type; the selected site’s PSH is also used. Use measured static/dynamic levels and actual pipe data where possible.',
      method: 'The engine estimates flow as daily water volume ÷ (PSH × 0.90), adds static/elevation and Hazen–Williams pipe-friction head to form TDH, then estimates hydraulic power and pump/VFD sizing using its flow-based efficiency profile.',
      limitations: 'The water source, drawdown, pressure demand, pump curve and seasonal water availability are not measured by this screen. Confirm the duty point with field tests and manufacturer curves.',
    },
    fa: {
      title: 'پمپاژ خورشیدی آب',
      inputs: 'عمق چاه، ارتفاع مخزن/هد، طول و قطر لوله، حجم آب روزانه و نوع آبیاری را وارد کنید؛ PSH محل نیز استفاده می‌شود. در صورت امکان تراز ایستابی/دینامیکی و مشخصات واقعی لوله را اندازه بگیرید.',
      method: 'موتور دبی را برابر حجم آب روزانه ÷ (PSH × ۰٫۹۰) برآورد می‌کند، هد استاتیک/ارتفاع و افت اصطکاک لولهٔ Hazen–Williams را برای TDH جمع می‌کند و سپس توان هیدرولیکی و پمپ/VFD را با پروفایل بازده تابع دبی تخمین می‌زند.',
      limitations: 'منبع آب، افت سطح، فشار موردنیاز، منحنی پمپ و دسترسی فصلی آب در این صفحه اندازه‌گیری نمی‌شوند. نقطهٔ کار را با آزمون محل و منحنی سازنده تأیید کنید.',
    },
  },
  iv_curve: {
    en: {
      title: 'I–V curve model',
      inputs: 'Set irradiance, cell temperature and series-module count; the current page uses a fixed single-module reference parameter set. The partial-shading toggle modifies the displayed curve shape.',
      method: 'The single-diode model evaluates current/voltage points and derives I–V and P–V characteristics and maximum-power-point values from those inputs and fixed reference parameters.',
      limitations: 'This is not using the currently selected catalog module and is not a measured tracer curve. Do not compare with field measurements unless the reference parameters and test conditions are reconciled.',
    },
    fa: {
      title: 'مدل منحنی I–V',
      inputs: 'تابش، دمای سلول و تعداد ماژول سری را تنظیم کنید؛ این صفحه از مجموعه پارامتر مرجع ثابت یک ماژول استفاده می‌کند. کلید سایهٔ جزئی شکل منحنی نمایش‌داده‌شده را تغییر می‌دهد.',
      method: 'مدل تک‌دیودی نقاط جریان/ولتاژ را محاسبه و از آن‌ها مشخصه‌های I–V و P–V و مقادیر نقطهٔ بیشینهٔ توان را استخراج می‌کند.',
      limitations: 'این صفحه از ماژول کاتالوگ انتخاب‌شده استفاده نمی‌کند و منحنی tracer اندازه‌گیری‌شده نیست. بدون تطبیق پارامتر مرجع و شرایط آزمون با اندازه‌گیری میدانی مقایسه نکنید.',
    },
  },
  rfc3_reports: {
    en: {
      title: 'Engineering reports & checks',
      inputs: 'Review the project inputs, report provenance and each check’s stated prerequisites. Use the page’s jump links to open the source engineering module when a value or warning needs investigation.',
      method: 'The report view summarizes implemented checks and current project outputs; a status is produced by the corresponding check logic, not by an independent certification service.',
      limitations: 'A PASS only means the implemented rule passed for the supplied inputs. It does not establish code compliance outside the checked scope, third-party certification or authority approval.',
    },
    fa: {
      title: 'گزارش و کنترل‌های مهندسی',
      inputs: 'ورودی‌های پروژه، منشأ گزارش و پیش‌نیاز اعلام‌شدهٔ هر کنترل را بازبینی کنید. برای بررسی مقدار/هشدار، از پیوند پرش صفحه به ماژول مهندسی منبع بروید.',
      method: 'نمای گزارش کنترل‌های پیاده‌سازی‌شده و خروجی جاری پروژه را خلاصه می‌کند؛ وضعیت از منطق همان کنترل می‌آید، نه از سرویس گواهی مستقل.',
      limitations: 'PASS فقط یعنی قاعدهٔ پیاده‌سازی‌شده برای ورودی‌های داده‌شده قبول شده است. انطباق فراتر از دامنهٔ کنترل، گواهی شخص ثالث یا تأیید مرجع را ثابت نمی‌کند.',
    },
  },
};

const GENERIC: Record<HelpLanguage, HelpCopy> = {
  en: {
    title: 'Workflow page',
    inputs: 'Review the controls, units and source details visible on this page before changing a project value.',
    method: 'This page’s displayed outputs depend on the current project inputs; follow its warnings and source links to the calculation module.',
    limitations: 'If a calculation method or required input is not shown here, do not infer it from this summary; seek engineering review before relying on the output.',
  },
  fa: {
    title: 'صفحهٔ گردش‌کار',
    inputs: 'پیش از تغییر مقدار پروژه، کنترل‌ها، واحدها و جزئیات منبع قابل مشاهده در همین صفحه را بررسی کنید.',
    method: 'خروجی‌های این صفحه به ورودی فعلی پروژه وابسته‌اند؛ هشدارها و پیوندهای منبع به ماژول محاسبه را دنبال کنید.',
    limitations: 'اگر روش محاسبه یا ورودی لازم در این راهنما ذکر نشده است، آن را از این خلاصه استنباط نکنید؛ پیش از اتکا به خروجی، بازبینی مهندسی بگیرید.',
  },
};

export const HELP_SOURCE_REFERENCES: Record<string, string> = {
  climate: 'src/engine/climaticData.ts — getClimateData(), fetchClimateData(); src/engine/types/climateTypes.ts — calculateDesignDaylightHours().',
  loads: 'src/engine/loadProfiles.ts — analyzeLoadProfile(), normalizeLoadItemToWindow().',
  system_mode: 'src/engine/systemModeCapacity.ts — calculateLoadModeDailySizingTargetKwh(), resolveArrayAcReferenceKw(), isUpstreamGridAnalysisAvailable(); src/engine/acRequirements.ts — assessAcRequirements(), evaluateLoadAcCurrents(); src/engine/core/projectMigration.ts — AcRequirementsSchema; src/App.tsx — explicit local AC interface editor and mode flow.',
  array: 'src/engine/pvEngineAdvanced.ts — designPvArray(); src/engine/core/thermalDerate.ts — calculateThermalDerate().',
  harmonics_grid: 'src/engine/harmonicsEngine.ts — analyzePowerplantHarmonics(), analyzeUpstreamGridConditions().',
  mv_substation: 'src/engine/mvSubstationEngine.ts — designMvSubstation().',
  bess: 'src/engine/batteryEngine.ts — computeAutonomyEnergyRequirement(), sizeBatteryBank().',
  cables_bom: 'src/engine/protectionBomEngine.ts — calculateAdvancedCableRun(), createUnassessedCableRun(), calculateEarthingSystem(), calculateLightningProtection(); src/engine/acRequirements.ts — assessed interface inputs.',
  structural: 'src/engine/structuralEngine.ts — calculateStructuralAndFoundations(); src/engine/structureRecommendationEngine.ts — recommendFoundation().',
  sim24h: 'src/engine/simulation24hEngine.ts — simulate24hEnergyBalance(), sizeDieselGenerator().',
  waterfall_loss: 'src/engine/waterfallLossEngine.ts — computeWaterfallLosses().',
  financial: 'src/engine/financialEngine.ts — performFinancialAnalysis(), sanitizeFinancialPricing().',
  sld: 'src/components/SingleLineDiagram.tsx — generated visualization; no separate network solver.',
  cad_layout: 'src/engine/powerplantCadLayout.ts — generatePowerplantLayout(), generatePowerplantDxf().',
  '3d_viewer': 'src/components/ThreeJsViewer.tsx — scene controls; src/engine/shadingSunPathEngine.ts — annual shading calculations; src/engine/shadingLifecycle.ts — applied-result provenance and staleness.',
  scenarios: 'src/engine/scenarioEngine.ts — generateScenarios().',
  catalog: 'src/engine/catalogRepository.ts — CatalogRepository; src/engine/equipmentCatalogData.ts — built-in records.',
  iran_regulations: 'src/components/IranianRegulationsTab.tsx — reference display; no authority query/certification function.',
  solar_pumping: 'src/engine/solarPumpEngine.ts — calculateSolarPump().',
  iv_curve: 'src/engine/singleDiodeModel.ts — calculateSingleDiodeCurve().',
  rfc3_reports: 'src/components/RFC3ReportsTab.tsx — report composition and displayed checks; each check links to its engine module.',
};

export function getContextualHelp(tab: string, mode: HelpSystemMode, language: HelpLanguage): HelpCopy {
  const copy = tab === 'harmonics_grid' && mode === 'offgrid'
    ? GENERIC[language]
    : (COPY[tab] ?? GENERIC)[language];
  return {
    ...copy,
    sources: HELP_SOURCE_REFERENCES[tab] ?? (language === 'fa'
      ? 'منبع محاسبهٔ اختصاصی برای این صفحه تعریف نشده است؛ خروجی را به‌عنوان محاسبهٔ مستقل تلقی نکنید.'
      : 'No dedicated calculation source is registered for this page; do not treat its display as an independent calculation.'),
  };
}
