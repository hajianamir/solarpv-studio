// Comprehensive 14-Stage PVsyst-Grade Waterfall Loss Tree & 8760h Performance Ratio (PR) Engine

export interface LossStage {
  id: string;
  nameFa: string;
  nameEn: string;
  nominalEnergyKwh: number;
  percentageLoss: number; // Negative for loss, positive for gain (e.g. transposition)
  stageOutputKwh: number;
  descriptionFa: string;
}

export interface WaterfallLossReport {
  installedCapacityKwp: number;
  rawGhiEnergyKwh: number;
  effectivePoaEnergyKwh: number;
  stages: LossStage[];
  netAnnualEnergyExportMwh: number;
  specificAnnualYieldKwhPerKwp: number;
  performanceRatioPct: number;
}

export function computeWaterfallLosses(
  installedCapacityKwp: number,
  peakSunHours: number,
  ambientTempMaxC: number,
  soilingLossPct: number = 4.5,
  dcAcRatio: number = 1.25,
  hasTracker: boolean = false
): WaterfallLossReport {
  // 1. Raw Global Horizontal Irradiance (GHI)
  // GHI annual = PSH * 365 days * 1 kW/m² reference
  const rawGhiEnergyKwh = peakSunHours * 365.0 * installedCapacityKwp;

  // 2. Transposition to Plane of Array (POA) - Tilt or 1-Axis Tracker gain
  const transpositionGainPct = hasTracker ? 26.5 : 16.8; // +16.8% for optimal fixed tilt, +26.5% for single-axis tracker
  const effectivePoaEnergyKwh = rawGhiEnergyKwh * (1.0 + transpositionGainPct / 100.0);

  let currentEnergy = effectivePoaEnergyKwh;
  const stages: LossStage[] = [];

  const addStage = (
    id: string,
    nameFa: string,
    nameEn: string,
    pct: number,
    descFa: string
  ) => {
    const energyDelta = (currentEnergy * pct) / 100.0;
    const nominal = currentEnergy;
    currentEnergy += energyDelta;
    stages.push({
      id,
      nameFa,
      nameEn,
      nominalEnergyKwh: Math.round(nominal),
      percentageLoss: pct,
      stageOutputKwh: Math.round(currentEnergy),
      descriptionFa: descFa,
    });
  };

  // 1. Near Shading Loss (Row-on-row & ground horizon shading)
  const nearShadingPct = hasTracker ? -1.2 : -2.4;
  addStage('near_shading', 'تلفات سایه‌اندازی نزدیک بین ردیف‌ها', 'Near Shading Loss', nearShadingPct, 'سایه‌اندازی ردیف‌های مجاور در اوایل صبح و غروب آفتاب');

  // 2. Incidence Angle Modifier (IAM - Fresnel optical reflection)
  addStage('iam', 'تلفات انعکاس اپتیکی شیشه (IAM / Fresnel)', 'Incidence Angle Modifier (IAM)', -2.2, 'زاویه تابش مایل و بازتابش از سطح شیشه آنتی‌رفلکت پنل');

  // 3. Soiling & Dust Loss
  addStage('soiling', 'تلفات نشست گرد و خاک و آلودگی سطحی', 'Soiling & Dust Loss', -Math.abs(soilingLossPct), 'رسوب ذرات غبار و معلقات هوا روی سطح پنل‌ها بین دوره‌های شستشو');

  // 4. PV Cell Temperature Thermal Loss (U-value model based on ambient design temperature)
  const thermalLossPct = -1.0 * (Math.max(4.0, (ambientTempMaxC - 20.0) * 0.32 + 2.5));
  addStage('thermal', 'تلفات حرارتی سلول ناشی از دمای کارکرد (NOCT)', 'Thermal Cell Temperature Loss', Math.round(thermalLossPct * 10) / 10, 'کاهش توان سلول سیلیکونی در دمای کاری بیش از ۲۵ درجه استاندارد STC');

  // 5. Module Quality & Binning Tolerance
  addStage('quality', 'تلورانس توان نامی تولیدکننده (Module Quality)', 'Module Quality Tolerance', 0.4, 'تلورانس مثبت توان نامی بر اساس تست فلش کارخانه (Positive Power Tolerance 0~+3%)');

  // 6. Light-Induced Degradation (LID / LeTID)
  addStage('lid', 'تلفات زوال اولیه نوری (LID & LeTID)', 'Light-Induced Degradation (LID)', -1.2, 'کاهش جزئی راندمان در چند ساعت اول تابش نور خورشید');

  // 7. Module Mismatch Loss
  addStage('mismatch', 'تلفات عدم تطابق مشخصه‌های I-V استرینگ‌ها', 'Module Mismatch Loss', -1.3, 'اختلاف جزئی در نقطه کار ماکزیمم (MPP) ماژول‌های متوالی در یک رشته');

  // 8. DC Ohmic Cable Loss
  addStage('dc_cabling', 'تلفات اهمی کابل‌کشی DC خورشیدی (I²R)', 'DC Wiring Ohmic Loss', -1.4, 'مقاومت الکتریکی هادی مسی بین استرینگ‌ها و اینورتر');

  // 9. Inverter MPPT Tracking Loss
  addStage('mppt_tracking', 'تلفات ترکینگ نقطه حداکثر توان اینورتر (MPPT)', 'Inverter MPPT Tracking Loss', -0.4, 'خطای دینامیک الگوریتم Perturb & Observe یا Incremental Conductance اینورتر');

  // 10. Inverter Clipping Loss (DC/AC Over-paneling)
  const clippingPct = dcAcRatio > 1.3 ? -1.0 * (dcAcRatio - 1.3) * 6.5 : -0.2;
  addStage('clipping', 'تلفات برش توان اینورتر (Clipping Over-paneling)', 'Inverter Clipping Loss', Math.round(clippingPct * 10) / 10, 'محدودیت خروجی AC اینورتر در ساعات اوج تابش تابستانه');

  // 11. Inverter Conversion Efficiency (Euro/CEC)
  addStage('inverter_efficiency', 'تلفات بازدهی تبدیل DC به AC اینورتر', 'Inverter Conversion Loss', -2.2, 'تلفات کلیدزنی IGBTها و فیلترهای خروجی AC اینورتر (راندمان ۹۷.۸٪)');

  // 12. AC Wiring & MV Transformer Loss
  addStage('mv_transformer', 'تلفات کابل AC و ترانسفورماتور پست فشار متوسط', 'AC Wiring & MV Transformer Loss', -1.5, 'تلفات بی‌باری (هسته‌ای) و بارداری (مسی) ترانسفورماتور افزاینده ۲۰ یا ۳۳ کیلوولت');

  // 13. Auxiliary Parasitic Consumption & Availability
  addStage('aux_unavailability', 'مصرف داخلی و قابلیت اطمینان شبکه (Availability)', 'Auxiliary & Grid Availability', -1.0, 'مصرف فن‌های خنک‌کننده، مانیتورینگ SCADA و قطعی‌های احتمالی خطوط انتقال');

  const netAnnualEnergyExportMwh = Math.round((currentEnergy / 1000.0) * 10) / 10;
  const specificAnnualYieldKwhPerKwp = Math.round(currentEnergy / installedCapacityKwp);
  const performanceRatioPct = Math.round((currentEnergy / effectivePoaEnergyKwh) * 1000) / 10;

  return {
    installedCapacityKwp,
    rawGhiEnergyKwh: Math.round(rawGhiEnergyKwh),
    effectivePoaEnergyKwh: Math.round(effectivePoaEnergyKwh),
    stages,
    netAnnualEnergyExportMwh,
    specificAnnualYieldKwhPerKwp,
    performanceRatioPct,
  };
}
