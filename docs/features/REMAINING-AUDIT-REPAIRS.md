# Remaining partial-audit repairs

See ADR-035 and `docs/audit/independent-handoff-935b01a/remaining-verification.json` for actual verification status. This guide describes changed behavior, not release or engineering approval.

## User-visible changes

- Reports now repeat the annual POA limitation: the named latitude/tilt/clear-sky scalar screen is unvalidated and is not weather-driven transposition. For a chronological study, supply explicit weather and use the separately gated research/operational workflow. The repair does not turn scalar PSH into a site-specific energy model.
- Coastal distance categories/derates/coatings are explicitly internal assumptions, not an ISO9223atmospheric classification or protective-design assessment. Deprecated C1–C5output keys remain for compatibility, with explicit not-assessed metadata. PVGIS source weather no longer claims IEC monitoring Class A.
- The ASHRAE optional IAM calculation no longer zeros otherwise-positive output at85°. The legacy I-V solver now brackets roots and reports actual unrounded residual diagnostics; beta/gamma are not fitted coefficients, scalar Isc remains approximate and MPP remains sampled. This page still grants no annual/financial adoption.
- The I-V temperature control preserves0°C. The BESS unit control preserves51.2V. The BESS page shows actual nominal series voltage vs target and says that voltage windows, BMS and permitted series/parallel topology are unassessed; quantities are illustrative, not approved wiring.
- MPPT voltage feasibility uses unrounded thermal voltages, even when display rounding appears equal to a limit. The inverter budgeting label correctly says80%of MPPT ceiling, not window midpoint.
- Solar direction varies near the poles using local east/north components. At exactly undefined zenith/nadir azimuth,180°is a documented convention rather than a measured direction.
- Operational financial adoption now excludes only **actual initial-origin delivered local energy**, not the entire initial battery inventory. Attribution is explicitly initial-inventory-first, auxiliaries before load, through conversion losses. Unused initial SOC no longer reduces direct PV value. Complete-year/project/acknowledgement guards remain mandatory.
- The35040interval Kimber calculation and wash validation use linear rolling/Set operations instead of quadratic scans. Rainfall window, strict threshold, grace and energy weights remain unchanged. Local performance is measured under the documented workload, not guaranteed on every machine.

## Developer/runtime changes

Historical numerical comparisons fail with actionable history prerequisites; they never skip an assertion, silently fetch or substitute HEAD. Shallow checkouts must obtain their trusted declared history. CI uses `fetch-depth:0`.

Original physical browser navigation opens the supported advanced research editor before JSON input/example selection. Thermal subprocess input has deterministic EOF via disk-backed temporary files, output/deadline/cancel budgets and guaranteed child reaping. It remains isolated research, not production adoption.

Useful checks: `npm run test:audit:remaining`, `npm run test:audit:thermal` in the pinned Python environment, existing `test:physical:python`/`test:physical:api`/`test:physical:browser`, operational annual/dispatch tests, combined `test:phase1:browser`, baseline/integration gates. A successful component test **does not waive a failing independent-expression gate**. Full verification/release stays blocked until its missing/stale records are properly resolved; see the receipt for counts and failed attempts.

## فارسی

گزارش، محدودیت تقریب سالانه POA را روشن می‌کند و مدل هواشناسی جدید ادعا نمی‌شود. باند فاصله ساحلی فقط فرض داخلی است، نه رده‌بندی جوی ISO؛ داده مدل‌شده PVGIS کلاس پایش IEC را اثبات نمی‌کند. کنترل دمای صفر و ولتاژ۵۱٫۲حفظ می‌شود. آرایش باتری بدون بررسی محدوده ولتاژ سازنده، BMS و اتصال سری/موازی تأیید نمی‌شود. امکان‌پذیری ولتاژ MPPT با اعداد گردنشده سنجیده می‌شود. ریشه منحنی I-V محصور و با باقیمانده بررسی می‌شود، ولی برازش ضرایب و مدل فیزیکی کامل تأیید نشده‌اند. سهم واقعی مصرف از موجودی اولیه باتری از ارزش PV کم می‌شود، نه کل موجودی استفاده‌نشده. آزمون‌های مؤلفه جایگزین دروازه شواهد مستقل، ارزیابی مهندسی محل یا مجوز انتشار نیستند.
