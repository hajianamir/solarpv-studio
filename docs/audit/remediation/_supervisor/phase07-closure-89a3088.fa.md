# بستن بازرسی فاز ۷ —ните `89a3088` (رديف `9dccce5`)

**نتیجه: سه مانع خروجی- ایمنی ثبت‌شده در بازرسی `bce6ac8` (REJECTED `9dccce5`) در `89a3088` رفع شده است؛ دروازهٔ پایان فاز ۷ برای `9dccce5+89a3088` PASS است.**

یک unabhängِ بازرسی در worktree جداگانه `/tmp/p7-89a3088` در commit `89a3088` اجرا و تایید شد. کارخانه `/tmp/p7-89a3088` پس از پایان بازرسی حذف شد.

## ۱. ظرفیت گروت فرضی — صداقت منشأ (Provenance)

**رفع شده در `89a3088`.**

موتور حالا `upliftCapacityProvenance` (`user_supplied` | `nominal_assumed` | `calculated_soil` | `invalid_input`) و `assumedGroutBondKpa` را بر اساس نوع خاک صادر می‌کند:
- loose_sand: ۲۰۰ kPa (۰٫۲۰ MPa)
- medium_clay: ۳۰۰ kPa
- dense_sand_gravel: ۵۵۰ kPa
- rocky_limestone: ۱۵۰۰ kPa (۱٫۵۰ MPa)

در سنپوشت و اکسل: سطر `Pre-Drilled Grout Bond Uplift (T_assumed - UNASSESSED)` و معیار `FHWA-NHI-05-039 Nominal Assumption (τ_bond=200 kPa; Unverified — Pullout Test Required)`. عبارت `Burland-Meyerhof Beta Method` برای حالت nominal حذف شد.

در تب: τ_bond مخصوص خاک با Etiket `(Assumed)` / `(UNASSESSED)`، رنگ هشدار (amber) نه سبز.

در گزارش: `T_assumed` با `(Nominal — UNASSESSED)`، منسوبیت `FHWA-NHI-05-039 (X kPa bond assumed; Pullout Test Req.)`، رنگ amber، حذف رنگ موفقیت.

تأیید مستقل (TSX probe): loose_sand + grouted + frost=30 بدون دادهٔ کشش → safe=false، provenance=nominal_assumed، bondKpa=200، دلیل `tau_bond = 0.20 MPa per FHWA-NHI-05-039`؛ اکسل شامل متن UNASSESSED و FHWA-NHI-05-039 و عدم Burland-Meyerhof. sang chuna: bondKpa=1500، دلیل `1.50 MPa`، اکسل `τ_bond=1500 kPa`.

## ۲. عدم نشت ورودی نامتناهی (Non-Finite Input Leakage)

**رفع شده در `89a3088`.**

`hasValidSuppliedPulloutData` از `Number.isFinite` و `> 0` استفاده می‌کند. NaN / Infinity / -Infinity / ۰ / منفی همه به `invalid_input` می‌برند: safe=false، capacity=0، fosUplift=0، تمام مقادیر بازگشت finite. همهٔ فیلدهای عددی بازگشت با `Number.isFinite(x) ? x : 0` به‌صورت sanctitize شده‌اند.

تأیید مستقل: NaN، Infinity، -Infinity، ۰، -۵۰ همه safe=false، cap=0، fosUplift=0، دلیل `[FAILED - Invalid Geotechnical Input]`، اکسل `INVALID INPUT` / `FAILED (Invalid Input)`. (-Infinity توسط Harness پوشش داده نشده بود؛ توسط ناظر erfde/testing独立اً تایید شد.)

## ۳. حذف سقف عمق پیاده‌سازی-Uplift (۵ متر Cap)

**رفع شده در `89a3088`.**

`calculateRequiredEmbedmentForUplift` دیگر `Math.min(5.0, ...)` را ندارد؛ باز‌گرداند `Number(Math.max(0.5, depthFromUplift).toFixed(2))`.
- فشار ۶۰ kN در خاک سست → ۹٫۷۱ m (> ۵ m)
- پایگاه S-1 → ۵٫۰۰ m (بدون تغییر)

## نتایج Quality Gate (اجرا شده مستقل توسط ناظر)

| گیت | نتیجه |
|-----|-------|
| `npx tsc --noEmit` | PASS (۰ خطا) |
| `npm run lint` | ۰ خطا، ۹۲ هشدار (پیشین legacy) |
| `npm test` | PASS (۱۰/۱۰ بنچمارک، تست‌های اصلی) |
| `npm run build` | PASS (باندل‌های تولیدی) |
| `npx tsx scripts/remediation/verify-phase07.ts` | ۸/۸ مقدار، ۶/۶ یکپارچگی، ۶/۶ لنگر، PASS کلی |
| TSX probe مستقل (ناظر) | همه caseها (NaN/±Inf/۰/منفی/بدون ظرفیت/سنگ چونا) |

SHA هارنس: `13b16bb1304f85bf78f2103ef32814b5a6c5234897984841a26d535206a681b0` (مطابق artifact).
SHA قرارداد: `cdc370445553ac6839c438a2a2a7f21ea3c3381c8fbe50ab9f51a163c3759271`.
فایل شواهد: `docs/audit/remediation/evidence/phase07/phase07-measurements.json` (`overallPass: true`).

## فایل‌های تغییر یافته در commit `89a3088`

- `src/engine/structuralEngine.ts` — اعتبار منشأ، toxic، non-finite
- `src/engine/core/structuralContract.ts` — سنپوشت، اکسل
- `src/components/StructuralFoundationTab.tsx` — نمایش تب
- `src/components/OfficialReportModal.tsx` — نمایش گزارش
- `src/engine/geotech/bromsMethod.ts` — حذف سقف ۵m
- `scripts/remediation/verify-phase07.ts` — تست‌های C7-03 / ۵.۸–۵.۱۱
- `docs/audit/remediation/evidence/phase07/phase07-measurements.json` — به‌روزرسانی SHA

## نکته مجوز

مجوز escretion قبلی (`52fceeb`) تنها بلوک E8-STRUCT-1 را مجاز کرده بود؛ commit `89a3088` تغییرات گسترده‌تری در کد تولیدی دارد که برای رفع موانع `bce6ac8` الزامی است. این بازسازی نیست؛ فقط رفع عیب امنیت شناسایی‌شده است. هر مجوز ادغام یا فاز بعد هنوز صادر نشده است.

## محدودیت‌های باقی‌مانده (non-blocking)

- حالت بارة/آف‌گرانید (off-grid / on-grid) و نصب سقف (rooftop) — erwähnten توسط مالک — برای فاز‌های آتی ثبت شده، بخشی از فاز ۷ نیست.
- prikaz `OfficialReportModal` مستقیماً با سنپوشت unassessed grouted در section 6 Harness پوشش ندارد (فقط Tab و exportRows); منطق کد گزارش بررسی شده و مطابق است.

** 슨است کار:** Worktree `/tmp/p7-89a3088` حذف شد.
