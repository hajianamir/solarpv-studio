# D1–D3 — قرارداد تحویل محدود و معیار پذیرش

## Intake و نگاشت

مرجع: ردیف‌های D1–D3 در AUDIT-FULL-CAPABILITY-REPLAN.fa.md. D1 تخریب/RUL پژوهشی؛ D2 cohort/LCA پژوهشی؛ D3 برآورد پروفیل قبض پژوهشی و پیشنهاد سناریوی typed بدون mutation. کاربر هدف تحلیلگر PV است. معیار موفقیت این برش: چهار operation محاسباتی واقعی با strict schema، اجرای Python احرازشده، validator مستقل TS، UI/SDK، rollback و رگرسیون. تکمیل کل roadmap یا field qualification هدف این برش نیست.

D1: `degradation_exposure`، عامل شتاب Arrhenius دما/RH و cumulative hazard first-order با پارامترهای caller. ورودی baseEnergyBasis فقط undegraded مجاز؛ وجود degradation قبلی رد، برای جلوگیری از double count. توان/انرژی پیشنهادی به هیچ مسیر مالی وصل نیست. RUL عملیاتی بدون failure data/calibration مسدود؛ cohort_survival قبلی دست‌نخورده و مستقل. این برش معادل adapter کامل PVDeg نیست؛ رابطهٔ منتخب با منبع pinned مقایسه می‌شود.

D2: `circular_lca`، installed/retired cohort ledger، بازنشستگی تجمعی ≤ نصب، manufacturing yield، secondary/virgin input، collection/reuse/recycling و disposal، جرم بسته. LCA مستقل با kgCO2e/kg، functional unit صریح، boundary=cradle_to_eol، allocation=cutoff_no_credit، بازهٔ factor اظهاری نه confidence interval. هزینهٔ مستقل تولید/EOL و reconciliation؛ بدون credit ناشی از displaced virgin و بدون PV ICE engine/baseline یا inventory لایسنس‌نامعلوم.

D3a: `bill_ensemble`، قبض ماهانه انرژی با unit فقط kWh؛ تعرفه/پول ورودی نیست. ensemble از شکل‌های ۲۴ ساعتهٔ caller، نرمال‌سازی مستقل هر ماه و هر عضو، energy closure دقیق، timestamps UTC با فرض fixed UTC بدون DST. از قبض شکل واقعی load استنباط قطعی نمی‌شود؛ weights نامنفی و مجموع مثبت، ماه‌ها متوالی، حداکثر ۱۲ ماه/۳ عضو.

D3b: `grounded_scenario`، جایگزین آفلاین deterministic و read-only برای مرحلهٔ مقدماتی دستیار؛ نه LLM. ورودی snapshot حداقلی غیرحساس و command typed set برای capacity PV/battery؛ خروجی proposal/diff/undo، snapshot و hash، factual report با grounding key. رشتهٔ prompt آزاد و provider/tool/network ممنوع. هیچ commands apply یا مالی انجام نمی‌شود. id snapshot/source فقط داده و هرگز دستور تفسیر نمی‌شوند. model/provider opt-in در این برش اصلاً وجود ندارد؛ provider آینده نیازمند طراحی/گیت جداست.

## قرارداد/ادغام

طرح‌ها versioned و strict، source ۱۰..۱۰۰۰ نویسه، contextSha256 اجباری؛ اعداد finite و بودجه محدود؛ رد unknown keys و unit ambiguity. envelope همان portfolio-result-v1 با projectApproval=blocked و safetyApproval=not_assessed. flag مستقل `SCIENCE_D_ENABLED` پیش‌فرض off + `PVLIB_RESEARCH_ENABLED` و auth؛ سرویس موجود ۶ درخواست/دقیقه و timeout/cancel/output limits حفظ شود. UI editor موجود با مثال و loading/error/result/archive/cancel و token حافظه‌ای reuse؛ SDK allowlist گسترش یابد، بدون acceptance مالی.

## پذیرش خودکار و محدودیت

- D1 شاهد closed-form دمای ثابت، ضریب Ea=0، RH=0، monotonically decreasing، reject double degradation و gap؛ RUL همیشه blocked.
- D2 mass closure از نصب تا ورودی/خروجی manufacturing و EOL، ۰/۱ fractions، overretirement رد، factor provenance/ranges، هزینه و functional-unit interval با oracle مستقل.
- D3 قبض leap/nonleap/zero energy و سه shape، جمع ماهانه، unit ابهام/ماه تکراری/gap رد؛ proposal undo exact، snapshot immutability، unknown/تزریق دستور رد و report grounding بدون ارزیابی آزاد.
- TS تمام خروجی‌های چهار operation را با schema strict و محاسبات مستقل سبک ledger/input binding بررسی کند؛ tests tamper، auth/flag/rollback و SDK واقعی؛ مرورگر production چهار مثال؛ type/lint و regression aggregate قبلی.
- عدد tolerance حل نرم‌افزار معادل accuracy فیزیکی نیست. reference داده synthetic است و operating RUL، LCA certification، profile measurement یا LLM capability ادعا نشود.

## توقف و rollout

دادهٔ failure/field/inventory دارای مجوز برای ادعای عملیاتی موجود نیست؛ همان ادعا blocked می‌ماند. release این برش فقط پس از گیت نرم‌افزاری سبز ready-for-review؛ full D1–D3 همچنان partial/blocked. rollback با SCIENCE_D_ENABLED=false و بدون migration. سه کنترل: financeMutation=false؛ automaticEnergyAdoption=false؛ provenance/limitations در تمام نتایج. هیچ تغییر در موتور مالی یا پذیرش annual-energy مجاز نیست.
