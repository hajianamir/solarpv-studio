# Explicit steady-duty pump energy comparison

Open **Solar Water Pumping** and enable **Opt-in explicit steady-duty energy balance**. All fields begin empty. Enter the daily water volume, constant total dynamic head, actual proposed pumping hours, fluid density, gravity, pump/motor/drive efficiencies as fractions and available daily DC-bus energy at the VFD input.

Inputs and enabled state are saved with the project, retained across tab changes and included in project/report JSON snapshots. The separately versioned `pump-duty-settings-v1` policy records `user_declared_unmatched` assumptions, not authenticated equipment/site evidence. Missing legacy settings reset to off/empty; malformed supplied settings block the entire restore. Empty/invalid edits are null, not zero; invalid edits clear that field with a notice. Disabling retains entries but hides results. Recheck assumptions after any context change. Older readers may discard these settings; keep an original current-version file. It does not replace the legacy sizing result. It never copies legacy rounded head, nameplate, efficiency bands or0.9×PSH runtime. A separate sourced/assessed head and equipment operating point are the user's input responsibility; entered numbers do not gain verified provenance.

## What the results mean

The four powers are **hydraulic → pump shaft → motor electrical input → drive DC input**, in kW. They are different boundaries, not four interchangeable motor ratings. Required daily DC energy and any daily DC deficit are in kWh/day. Values retain double precision until four-decimal display formatting.

A test-only example using120m³/day,50m TDH,5h/day,1000kg/m³,9.81m/s², efficiencies.6/.8/.95 produces16.35hydraulic kWh/day and approximately35.8553DC kWh/day. With10DC kWh/day the declared duty has approximately25.8553kWh/day aggregate deficit. These are illustrative arithmetic inputs, **not selected equipment or recommended coefficients**.

**No aggregate deficit is not feasibility.** Time-of-day DC power, DC voltage/current, drive limits, startup, pump/motor curves, NPSH, drawdown and water availability remain unassessed. Energy can arrive when the proposed pump cannot operate. Constant efficiencies/head exclude variable-speed behavior and idle/cable/transient losses. Zero head/volume gives zero ideal work, not proof of zero practical electrical consumption or available water. The panel does not calculate a guaranteed curtailed water volume, PV array capacity or annual water delivery.

Invalid/missing input and arithmetic overflow/underflow show unavailable rather than fabricated zero demand/savings. Toggle-off removes the result. The comparison does not mutate financial NPV, loads, annual energy, selected equipment. Only explicit draft settings are persisted; no derived result is trusted from a file. Financial adoption and water-delivery guarantee are always false.

## Legacy panel

Old motor/VFD/PV values remain compatible screening heuristics. Synthetic monthly factors do not constitute a seasonal water forecast. The1.25drive multiplier does not prove a motor service factor or drive overload/continuous duty. Even the historical API flag named `guaranteeYearRoundWater` is a legacy scaling switch, not an assessed guarantee. Its API/old result shape is retained; no source or equipment applicability was retroactively validated.

Disable/remove the explicit panel integration for rollback; preserve original project files because older readers may discard settings. Retain corrected unassessed/screening labels. Sourced equipment curves and chronology, matched field/head conditions and authenticated matched provenance remain required for full U19 acceptance.

Windows installation uses `install.bat`. Maintainer checks: `npm run test:pump:duty` (also in `test:phase3`), `npm run test:phase1:browser` (includes isolated Persian/English local restore/cancel, malformed-local/import rejection, downloaded portable JSON and legacy-reset journeys), and offline `python scripts/fixtures/generate-pump-duty-energy.py --check`. See ADR-030 for equations, budgets and limits.

## فارسی

در تب پمپاژ، مقایسه اختیاری تراز انرژی کارکرد ثابت را فعال کنید و همه ورودی‌ها را صریح وارد کنید. هیچ مقداری از محاسبه قدیمی یا PSH کپی نمی‌شود. ورودی‌ها و وضعیت فعال‌سازی در پروژه ذخیره می‌شوند، اما فرض کاربر و بدون تطبیق با سایت یا تجهیزات‌اند. پس از تغییر زمینه بازبینی کنید. مقدار خالی یا نامعتبر صفر نیست؛ ورودی نامعتبر با پیام پاک می‌شود. فایل قدیمی بدون تنظیمات، مقایسه را خالی و غیرفعال می‌کند؛ تنظیمات معیوب بارگذاری را مسدود می‌کند. خروجی‌ها توان هیدرولیکی، محور پمپ، ورودی الکتریکی موتور و ورودی DC درایو را جدا می‌کنند. نبود کسری انرژی کل روزانه به معنی امکان راه‌اندازی، انتخاب معتبر تجهیزات یا تضمین آبدهی نیست؛ توالی زمانی و منحنی‌های تجهیزات ارزیابی نشده‌اند. این مقایسه هیچ داده‌ای را به مالی یا انرژی سالانه منتقل نمی‌کند. نصب ویندوز با `install.bat` انجام می‌شود.
