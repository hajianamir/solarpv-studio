# پذیرش B3 — زیرمجموعهٔ all-incoherent

هدف: adapter واقعی tmm0.2.0 inc_tmm برای همهٔ لایه‌های داخلی ناهمدوس، تابش عمودی و محیط‌های ابتدا/انتهای بی‌جذب. mixed coherent/incoherent، زاویهٔ مایل، roughness/scattering، depth profile، EQE و فناوری واقعی خارج دامنه‌اند. انتخاب فیزیکی ناهمدوسی به coherenceBasis صریح نیاز دارد؛ ضخامت حداقل10برابر بیشترین طول موج فقط admission guard است، نه اثبات coherence loss.

مرجع نظری Byrnes، Multilayer optical calculations، arXiv1603.02720v5 بخش6؛ upstream tests و LICENSE قبلاً در docs/reference-data/tmm با commit/hash ثابت شده‌اند. از fixture سه‌لایهٔ حقیقی upstream و oracleهای Fresnel/سری هندسی/میانگین فاز استفاده شود؛ print-only testهای upstream معادل assertion تلقی نشوند. دادهٔ تجربی EQE جدید یا qualification پروژه ادعا نشود.

قرارداد strict مشترک Python/TS، واحد nm و W/m²/nm،2..256 طول موج صعودی و3..12 لایه، شبکهٔ n/k دقیق و بدون extrapolation، محیط خارجی k=0، exp optical depth<=60 برای رد ناحیهٔ clamp package. نتیجه passivity و ledger انتگرالی داشته باشد؛ شاهد مستقل TS با سری بازتاب‌های چندگانه، نه ماتریس انتقال upstream.

flag مستقل INCOHERENT_OPTICS_ENABLED همراه PVLIB_RESEARCH_ENABLED و REFERENCE_MODELS_ENABLED، همه default-off. runtime جدا PVLIB_REFERENCE_PYTHON با tmm0.2.0 موجود؛ fallback به core ممنوع. worker Python authenticated، SDK، editor، import/export/cancel و نتیجه insufficient_evidence/blocked بدون adoption. آزمون واحد، مستقل عددی،API/SDK،auth/flags/rollback،tamper،browser production و کل گیت پیشین الزامی است. راهنما/receipt و هش جاری پیش از ready-for-review.
