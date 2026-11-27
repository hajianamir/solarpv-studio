# Explicit reference-parameter I–V metrics

Open **I–V curve**, then change **I–V assessment model** from the default illustrative legacy screen to **Explicit bounded reference metrics**. Paste a complete request JSON and choose **Evaluate explicit reference**. The view is initially empty: it does not guess parameters from nameplate Voc/Isc/Vmp/Imp, the selected catalog module, or the legacy curve.

Required parameters are per-module STC photocurrent[A], saturation current[A], series/shunt resistance[ohm], diode factor a=nNsVth[V], alpha_sc[A/°C], explicit silicon reference policy constants and user-attributed source/record ID. Conditions are effective irradiance[W/m²], cell temperature[°C] and integer series-module count. The existing strict schema rejects unknown versions/basis/fields, numeric strings, missing provenance and out-of-envelope conditions. Maximum request length32768characters. Optional iterationLimit defaults128, supported1..128. Supported nonzero irradiance50..1400W/m², temperature−20..85°C and1..100series modules are implementation limits, not guaranteed physical applicability.

**Results:** continuous implicit Voc/Isc/MPP metrics (V/A/W), not a new curve trace or parameter fit. Display uses six decimals; raw calculations retain full precision. Residuals are open-circuit current[A], short-circuit voltage[V] and MPP derivative[A=W/V]. Dark input0W/m² is valid zero generation; unavailable includes invalid input, numerical-domain failures and unconverged roots. Neither failure nor darkness silently invokes a legacy model.

**Temporary and isolated:** every edit removes prior metrics until reevaluation. Clearing, switching views or leaving the tab resets the reference draft/results. Returning to legacy also resets its controls. Nothing is saved as project inputs or adopted into annual energy, finance, equipment selection or calibration. Source/record strings are unverified user attribution, not authenticated manufacturer evidence. This view does not reconcile a reference parameter set with your selected module or site.

## Test-only example

The following is copied from the source-pinned independent pvlib0.13.1 test fixture, **not manufacturer or project data and not recommended coefficients**. It demonstrates request structure only. Replace the complete reference and conditions with separately reviewed applicable inputs; typing a source does not authenticate it.

```json
{
  "modelPolicy": "desoto_reference_bounded_v1",
  "reference": {
    "basis": "per_module_stc",
    "photocurrentA": 7.545,
    "saturationCurrentA": 1.94e-09,
    "seriesResistanceOhm": 0.094,
    "shuntResistanceOhm": 15.72,
    "diodeFactorV": 0.473,
    "alphaScAperC": 0.003,
    "referenceCellTempC": 25,
    "referenceIrradianceWm2": 1000,
    "bandgapEv": 1.121,
    "bandgapTemperatureCoefficientPerK": -0.0002677,
    "provenance": {
      "source": "pvlib0.13.1 tests/conftest.py (test vector, not verified catalog)",
      "recordId": "cec_module_params"
    }
  },
  "conditions": {
    "effectiveIrradianceWm2": 50,
    "cellTempC": -20,
    "seriesModules": 1
  },
  "iterationLimit": 128
}
```

See ADR-025 (unchanged numerical equations/reference limits), ADR-033 (UI/isolation/rollback), and `PHASE-3-DIODE-CONSUMER-PLAN.md`. Maintainer checks: `npm run test:phase3` and `npm run test:phase1:browser` (includes English/Persian reference journeys). Full U05 fitting/other-consumer/manufacturer/applicability work remains open. Windows installation is through `install.bat`.

## فارسی

در تب منحنی جریان–ولتاژ، مدل «شاخص‌های مرجع صریح با حل محدود» را انتخاب و JSON کامل مرجع را وارد کنید. هیچ پارامتری از مدل قدیمی یا کاتالوگ کپی یا برازش نمی‌شود. نتیجه شاخص پیوسته است، نه منحنی اندازه‌گیری‌شده. تاریکی صفر معتبر است؛ ورودی نامعتبر، خطای دامنه و عدم همگرایی نتیجه موفق ندارند. با هر ویرایش نتیجه پاک و با خروج از نما ورودی موقت حذف می‌شود. ورودی و نتیجه در پروژه ذخیره یا به مالی، انرژی سالانه و انتخاب تجهیزات منتقل نمی‌شوند. منشأ، ادعای کاربر و بدون احراز اصالت یا تطبیق است. مثال بالا فقط بردار آزمون است، نه ضرایب پیشنهادی سازنده. نصب ویندوز با `install.bat` است.
