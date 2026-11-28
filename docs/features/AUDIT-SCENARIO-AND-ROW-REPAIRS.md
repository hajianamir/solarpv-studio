# Scenario assumptions and row-screening audit corrections

## Scenario comparison

The three customer-mode alternatives are **illustrative presets**, not assessed equipment designs. Availability and cable voltage drop are unknown: `reliabilityIndexPct:null`, `cableVoltageDropPct:null` and explicit `not_assessed` status fields replace the former fixed percentages. The UI displays **Not assessed**. No load-service probability, N+1/failover, fire compliance or coordinated lightning/surge protection is established from capacity/cost inputs. IDs are unchanged for compatibility, not a redundancy guarantee.

Supplied finite positive PSH is now preserved in generation/LCOE; there is no minimum1PSH substitution. The generation proxy is `PV kWp × supplied PSH ×365 × assumed retained fraction`, using the existing.78/.80preset factors. At100kWp and0.5PSH, the first preset now uses14,235kWh/year instead of28,470. With unchanged illustrative costs/degradation/discount, its LCOE is approximately$0.662649265/kWh rather than$0.331324633. These are accounting corrections under internal assumed factors, **not measured production or independent market costs**. `firstYearGenerationProxyKwh` and policy identity are available in direct results and raw UI attributes.

The old fixed lowest-TCO statement is removed: compare the actual figures and assumptions. At1kWp/.1kWh/day/one autonomy day, the source assumptions give lithium$2,486vs gel$2,108. No claim about which real design is optimal follows. Battery replacement/lifetime, prices, discount floor1% and legacy nonfinite-PSH fallback5.17 remain assumptions/limitations. Zero/nonpositive PSH keeps prior unavailable-energy behavior. No chronological dispatch or adoption gate was added.

## Row geometry in reports

The existing pitch calculation is an ideal winter-solstice-**noon** screen, not a10:00–14:00clearance demonstration or standards assessment. Both report languages now say so. Actual row ends, terrain, multi-module slant and time-resolved beam/diffuse shading remain unassessed.

The displayed ratio is explicitly **projected ground coverage using single-module slant**: selected module length×cos(tilt)/pitch. It no longer uses a hardcoded4.6m. This is not a slant/pitch GCR or the separate bifacial gain assumption. For the audited default2.278m/31°/3.916043m ideal geometry, it is approximately49.862%, not100.7%. Missing dimensions render unavailable. The pitch and land-area kernels themselves have not changed.

## Verification and limits

See ADR-034 and `docs/audit/independent-handoff-935b01a/`. Direct/JSON/bilingual SSR tests, independent Decimal accounting replay, actual-base compatibility and production-browser customer-mode/report checks accompany governing baseline/integration gates. The audit supplied by the user remains incomplete; no unexamined UNVERIFIABLE row is converted to a defect or a pass. Other audit findings, licensed standards/field/site evidence and platform release gates remain open. Windows installation uses `install.bat`.

## فارسی

سناریوها فقط پیش‌فرض فرضی‌اند؛ قابلیت تأمین، افت ولتاژ، افزونگی و ایمنی آتش و صاعقه ارزیابی نشده‌اند و درصد اطمینان ساختگی نمایش داده نمی‌شود. PSH مثبت ورودی بدون کف۱ در تقریب تولید و LCOE استفاده می‌شود. کمینه بودن TCO یا مناسب بودن تجهیزات تضمین نشده است. فاصله ردیف‌ها فقط غربالگری ظهر انقلاب زمستانی روی زمین تراز با طول شیب یک ماژول است؛ بازه۱۰ تا۱۴یا انطباق استاندارد را اثبات نمی‌کند. پوشش افقی از طول ماژول انتخابی محاسبه می‌شود؛ ابعاد ناموجود، خروجی ناموجود دارند. این اصلاحات تکمیل ممیزی یا تأیید ایمنی نصب نیستند.
