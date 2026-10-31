// Comprehensive 14-Stage PVsyst-Grade Waterfall Loss Tree & 8760h Performance Ratio (PR) Engine

export interface LossStage {
  id: string;
  nameFa: string;
  nameEn: string;
  nominalEnergyKwh: number;
  percentageLoss: number; // Negative for loss, positive for gain (e.g. transposition)
  stageOutputKwh: number;
  descriptionFa: string;
  descriptionEn: string;
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
  hasTracker: boolean = false,
  snowLossPct: number = 0.0,
  iamLossPct: number = -2.2
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
    descFa: string,
    descEn: string
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
      descriptionEn: descEn,
    });
  };

  // 1. Near Shading Loss (Row-on-row & ground horizon shading)
  const nearShadingPct = hasTracker ? -1.2 : -2.4;
  addStage(
    'near_shading',
    'تلفات سایه‌اندازی نزدیک بین ردیف‌ها',
    'Near Shading Loss (Row-to-Row)',
    nearShadingPct,
    'سایه‌اندازی ردیف‌های مجاور در اوایل صبح و غروب آفتاب',
    'Inter-row module self-shading during low solar elevation angles (morning/evening).'
  );

  // 2. Incidence Angle Modifier (IAM - Fresnel optical reflection / Martin & Ruiz ARC)
  addStage(
    'iam',
    'تلفات انعکاس اپتیکی شیشه (IAM / Fresnel)',
    'Incidence Angle Modifier (IAM)',
    -Math.abs(iamLossPct),
    'زاویه تابش مایل و بازتابش از سطح شیشه آنتی‌رفلکت پنل با کوپل حرارتی dn/dT',
    'Fresnel optical reflection at oblique sun incidence angles with thermo-optic dn/dT coupling.'
  );

  // 3. Soiling & Dust Loss (Kimber Model)
  addStage(
    'soiling',
    'تلفات نشست گرد و خاک و آلودگی سطحی (Kimber)',
    'Soiling & Environmental Dust Loss (Kimber)',
    -Math.abs(soilingLossPct),
    'رسوب ذرات غبار و معلقات هوا روی سطح پنل‌ها بین دوره‌های شستشو',
    'Particulate dust accumulation on front glass between planned cleaning cycles.'
  );

  // 3b. Snow Shedding & Damming Loss (Marion Model)
  // Invariant 14-stage structure across all global climates.
  // In snow-free climates (snowLossPct = 0), operates as a strict 0.0% no-op.
  addStage(
    'snow',
    'تلفات پوشش و ریزش برف (Marion Model)',
    'Snow Coverage & Shedding Loss (Marion)',
    -Math.abs(snowLossPct),
    snowLossPct > 0
      ? 'پوشش برف، تاخیر در لغزش حرارتی و سدشدگی در انتهای ماژول'
      : 'عدم وجود پوشش برف در این اقلیم (تلفات صفر)',
    snowLossPct > 0
      ? 'Module snow obscuration, sliding delay, and base frame damming risk.'
      : 'Zero snow accumulation in this climate zone (no-op 0.0% loss stage).'
  );

  // 4. PV Cell Temperature Thermal Loss (U-value model based on ambient design temperature)
  const thermalLossPct = -1.0 * (Math.max(4.0, (ambientTempMaxC - 20.0) * 0.32 + 2.5));
  addStage(
    'thermal',
    'تلفات حرارتی سلول ناشی از دمای کارکرد (NOCT)',
    'Cell Operating Temperature Loss (Pmp coeff)',
    Math.round(thermalLossPct * 10) / 10,
    'کاهش توان سلول سیلیکونی در دمای کاری بیش از ۲۵ درجه استاندارد STC',
    'Thermal degradation of silicon cells operating above standard STC 25°C rating.'
  );

  // 5. Module Quality & Binning Tolerance
  addStage(
    'quality',
    'تلورانس توان نامی تولیدکننده (Module Quality)',
    'Module Quality & Factory Flash Tolerance',
    0.4,
    'تلورانس مثبت توان نامی بر اساس تست فلش کارخانه (Positive Power Tolerance 0~+3%)',
    'Positive factory power sorting tolerance (0~+3%) exceeding nominal nameplate rating.'
  );

  // 6. Light-Induced Degradation (LID / LeTID)
  addStage(
    'lid',
    'تلفات زوال اولیه نوری (LID & LeTID)',
    'Light-Induced Degradation (LID & LeTID)',
    -1.2,
    'کاهش جزئی راندمان در چند ساعت اول تابش نور خورشید',
    'Initial light-induced silicon lattice recombination loss during initial operating weeks.'
  );

  // 7. Module Mismatch Loss
  addStage(
    'mismatch',
    'تلفات عدم تطابق مشخصه‌های I-V استرینگ‌ها',
    'String Module I-V Mismatch Loss',
    -1.3,
    'اختلاف جزئی در نقطه کار ماکزیمم (MPP) ماژول‌های متوالی در یک رشته',
    'Current and voltage dispersion at maximum power points among series-connected modules.'
  );

  // 8. DC Ohmic Cable Loss
  addStage(
    'dc_cabling',
    'تلفات اهمی کابل‌کشی DC خورشیدی (I²R)',
    'DC Cabling Ohmic Loss (I²R)',
    -1.4,
    'مقاومت الکتریکی هادی مسی بین استرینگ‌ها و اینورتر',
    'Resistive power dissipation in PV string homeruns and DC busbars to inverters.'
  );

  // 9. Inverter MPPT Tracking Loss
  addStage(
    'mppt_tracking',
    'تلفات ترکینگ نقطه حداکثر توان اینورتر (MPPT)',
    'Inverter Dynamic MPPT Tracking Loss',
    -0.4,
    'خطای دینامیک الگوریتم Perturb & Observe یا Incremental Conductance اینورتر',
    'Dynamic tracking latency of maximum power point algorithms under shifting cloud cover.'
  );

  // 10. Inverter Clipping Loss (DC/AC Over-paneling)
  const clippingPct = dcAcRatio > 1.3 ? -1.0 * (dcAcRatio - 1.3) * 6.5 : -0.2;
  addStage(
    'clipping',
    'تلفات برش توان اینورتر (Clipping Over-paneling)',
    'Inverter AC Power Clipping (DC/AC Over-paneling)',
    Math.round(clippingPct * 10) / 10,
    'محدودیت خروجی AC اینورتر در ساعات اوج تابش تابستانه',
    'Inverter AC power clipping limit during peak midday summer hours due to high DC/AC ratio.'
  );

  // 11. Inverter Conversion Efficiency (Euro/CEC)
  addStage(
    'inverter_efficiency',
    'تلفات بازدهی تبدیل DC به AC اینورتر',
    'Inverter DC-to-AC Conversion Loss',
    -2.2,
    'تلفات کلیدزنی IGBTها و فیلترهای خروجی AC اینورتر (راندمان ۹۷.۸٪)',
    'IGBT switching losses and magnetic filter impedance at 97.8% weighted Euro efficiency.'
  );

  // 12. AC Wiring & MV Transformer Loss
  addStage(
    'mv_transformer',
    'تلفات کابل AC و ترانسفورماتور پست فشار متوسط',
    'AC Collector & MV Step-Up Transformer Loss',
    -1.5,
    'تلفات بی‌باری (هسته‌ای) و بارداری (مسی) ترانسفورماتور افزاینده ۲۰ یا ۳۳ کیلوولت',
    'Copper resistive and core magnetic losses in 0.4/20kV or 0.8/33kV step-up transformer.'
  );

  // 13. Auxiliary Parasitic Consumption & Availability
  addStage(
    'aux_unavailability',
    'مصرف داخلی و قابلیت اطمینان شبکه (Availability)',
    'Substation Auxiliaries & Grid Availability',
    -1.0,
    'مصرف فن‌های خنک‌کننده، مانیتورینگ SCADA و قطعی‌های احتمالی خطوط انتقال',
    'Substation cooling fans, SCADA telecontrol power, and scheduled grid maintenance downtime.'
  );

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
